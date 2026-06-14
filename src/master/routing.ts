import { createHash } from "node:crypto";
import { masterData } from "./data.js";
import { effectiveShipSpeedValue } from "./ship-speed.js";
import type { SaveState } from "../state/types.js";

export type RoutingSpeed = "slow" | "fast" | "fastPlus" | "fastest";

export type RoutingEquipment = {
  id: number;
  masterId: number;
  typeId: number;
  los: number;
  improvement: number;
  name: string;
};

export type RoutingShip = {
  id: number;
  masterId: number;
  shipType: number;
  classId: number;
  name: string;
  speed: number;
  level: number;
  baseLos: number;
  equipment: RoutingEquipment[];
};

export type RoutingFleet = {
  ships: RoutingShip[];
  speed: RoutingSpeed;
  typeCounts: Record<string, number>;
  equippedShipCounts: Record<string, number>;
};

type NumericPredicate = {
  eq?: number;
  gte?: number;
  lte?: number;
};

export type RoutingPredicate = {
  fleetSize?: NumericPredicate;
  shipTypes?: Record<string, NumericPredicate>;
  shipClasses?: Record<string, NumericPredicate>;
  namedShips?: Record<string, NumericPredicate>;
  shipFamilies?: { ids: number[]; count: NumericPredicate; wikiTerm?: string }[];
  countExpressions?: {
    terms: {
      shipType?: string;
      shipFamilyIds?: number[];
      shipClassIds?: number[];
    }[];
    count: NumericPredicate;
    wikiTerm?: string;
  }[];
  flagshipTypes?: string[];
  speedAtLeast?: RoutingSpeed;
  los?: { coefficient: number; gte?: number; lt?: number };
  phase?: NumericPredicate;
  visited?: string;
  wiki?: string;
  all?: RoutingPredicate[];
  any?: RoutingPredicate[];
  not?: RoutingPredicate;
};

export type RoutingRule = {
  when?: RoutingPredicate;
  to?: string;
  weights?: Record<string, number>;
  chance?: number;
  select?: string[];
  source?: string;
};

export type RoutingEdge = {
  no: number;
  from: string;
  to: string;
};

export type RoutingNode = {
  combat: boolean;
  eventId: number;
  eventKind: number;
  colorNo: number;
};

export type RoutingMap = {
  mapId: number;
  revision: number;
  edges: RoutingEdge[];
  nodes?: Record<string, RoutingNode>;
  branches: Record<string, RoutingRule[]>;
};

export type RouteEvaluationInput = {
  fleet: RoutingFleet;
  seed: number;
  step: number;
  phase: number;
  from: string;
  playerLevel?: number;
  selectedEdgeNo?: number;
  visited?: string[];
};

export type RouteEvaluation =
  | { kind: "route"; edgeNo: number; from: string; to: string }
  | { kind: "select"; edgeNos: number[]; from: string };

const SPEED_ORDER: RoutingSpeed[] = ["slow", "fast", "fastPlus", "fastest"];

const TYPE_GROUPS: Record<string, number[]> = {
  DE: [1],
  DD: [2],
  CL: [3],
  CLT: [4],
  CA: [5],
  CAV: [6],
  CVL: [7],
  FBB: [8],
  BB: [9, 12],
  BBV: [10],
  CV: [11],
  SS: [13],
  SSV: [14],
  AO: [15, 22],
  AV: [16],
  LHA: [17],
  CVB: [18],
  AR: [19],
  AS: [20],
  CT: [21],
  "BB系": [8, 9, 10, 12],
  "CV系": [7, 11, 18],
  "CA系": [5, 6],
  "CL系": [3, 4, 21],
  "SS系": [13, 14]
};

export function evaluateRoute(map: RoutingMap, input: RouteEvaluationInput): RouteEvaluation {
  const outgoing = map.edges.filter((edge) => edge.from === input.from);
  if (outgoing.length === 0) {
    throw new Error(`Map ${map.mapId} has no outgoing edge from ${input.from}`);
  }

  const rules = map.branches[input.from];
  if (!rules || rules.length === 0) {
    if (outgoing.length === 1) return routeResult(outgoing[0]);
    throw new Error(`Map ${map.mapId} has no routing rule for ${input.from}`);
  }

  for (const rule of rules) {
    if (rule.when && !matchesPredicate(rule.when, input)) continue;
    if (rule.chance != null && stableRouteRoll(input.seed, map.mapId, input.from, input.step, rule.source) >= rule.chance) {
      continue;
    }
    if (rule.select) {
      const choices = rule.select.map((to) => requireEdge(map, input.from, to));
      if (input.selectedEdgeNo == null) {
        return { kind: "select", edgeNos: choices.map((edge) => edge.no), from: input.from };
      }
      const selected = choices.find((edge) => edge.no === input.selectedEdgeNo);
      if (!selected) {
        throw new Error(`Selected edge ${input.selectedEdgeNo} is not available from ${input.from}`);
      }
      return routeResult(selected);
    }
    if (rule.to) return routeResult(requireEdge(map, input.from, rule.to));
    if (rule.weights) {
      const destinations = Object.entries(rule.weights).filter(([, weight]) => weight > 0);
      if (destinations.length === 0) throw new Error(`Map ${map.mapId} has an empty weighted rule at ${input.from}`);
      const total = destinations.reduce((sum, [, weight]) => sum + weight, 0);
      let roll = stableRouteRoll(input.seed, map.mapId, input.from, input.step) * total;
      for (const [to, weight] of destinations) {
        if (roll < weight) return routeResult(requireEdge(map, input.from, to));
        roll -= weight;
      }
      return routeResult(requireEdge(map, input.from, destinations[destinations.length - 1][0]));
    }
  }

  throw new Error(`Map ${map.mapId} has no matching routing rule for ${input.from}`);
}

export function buildRoutingFleet(save: SaveState, deckId: number): RoutingFleet {
  const deck = save.decks.find((item) => item.id === deckId);
  if (!deck) throw new Error(`Unknown deck ${deckId}`);
  const ships = deck.shipIds
    .filter((id) => id > 0)
    .map((id) => save.ships.find((ship) => ship.id === id))
    .filter((ship): ship is SaveState["ships"][number] => Boolean(ship))
    .map((ship) => {
      const shipMaster = masterData.api_mst_ship.find((item) => item.api_id === ship.masterId);
      const equipmentIds = [...ship.slotIds, ship.exSlotId].filter((id) => id > 0);
      const equipment = equipmentIds.flatMap((itemId) => {
        const item = save.slotItems.find((candidate) => candidate.id === itemId);
        const itemMaster = item ? masterData.api_mst_slotitem.find((candidate) => candidate.api_id === item.masterId) : undefined;
        if (!item || !itemMaster) return [];
        return [{
          id: item.id,
          masterId: item.masterId,
          typeId: Number(itemMaster.api_type[2] ?? 0),
          los: Number(itemMaster.api_saku ?? 0),
          improvement: item.level,
          name: itemMaster.api_name
        }];
      });
      const apiSaku = (shipMaster as { api_saku?: number[] } | undefined)?.api_saku;
      return {
        id: ship.id,
        masterId: ship.masterId,
        shipType: Number(shipMaster?.api_stype ?? 0),
        classId: Number(shipMaster?.api_ctype ?? 0),
        name: shipMaster?.api_name ?? `Ship ${ship.masterId}`,
        speed: Number(shipMaster?.api_soku ?? 0),
        level: ship.level,
        baseLos: Number(ship.stats.baseLos ?? levelStat(apiSaku, ship.level)),
        equipment
      };
    });

  return {
    ships,
    speed: fleetSpeed(ships),
    typeCounts: buildTypeCounts(ships),
    equippedShipCounts: buildEquippedShipCounts(ships)
  };
}

export function calculateFleetLos33(fleet: RoutingFleet, coefficient: number, playerLevel: number) {
  const equipmentLos = fleet.ships.flatMap((ship) => ship.equipment).reduce((sum, item) => {
    return sum + equipmentLosCoefficient(item.typeId) * (item.los + equipmentImprovementLos(item));
  }, 0);
  const shipLos = fleet.ships.reduce((sum, ship) => sum + Math.sqrt(Math.max(0, ship.baseLos)), 0);
  const headquartersPenalty = Math.ceil(Math.max(0, playerLevel) * 0.4);
  const emptyShipBonus = 2 * Math.max(0, 6 - fleet.ships.length);
  return coefficient * equipmentLos + shipLos - headquartersPenalty + emptyShipBonus;
}

export function stableRouteRoll(seed: number, mapId: number, from: string, step: number, salt = "") {
  const hash = createHash("sha256").update(`${seed}:${mapId}:${from}:${step}:${salt}`).digest();
  return hash.readUInt32BE(0) / 0x1_0000_0000;
}

function matchesPredicate(predicate: RoutingPredicate, input: RouteEvaluationInput): boolean {
  if (predicate.all && !predicate.all.every((item) => matchesPredicate(item, input))) return false;
  if (predicate.any && !predicate.any.some((item) => matchesPredicate(item, input))) return false;
  if (predicate.not && matchesPredicate(predicate.not, input)) return false;
  if (predicate.fleetSize && !matchesNumber(input.fleet.ships.length, predicate.fleetSize)) return false;
  if (predicate.phase && !matchesNumber(input.phase, predicate.phase)) return false;
  if (predicate.speedAtLeast && SPEED_ORDER.indexOf(input.fleet.speed) < SPEED_ORDER.indexOf(predicate.speedAtLeast)) return false;
  if (predicate.flagshipTypes) {
    const flagship = input.fleet.ships[0];
    if (!flagship || !predicate.flagshipTypes.some((type) => shipMatchesType(flagship, type))) return false;
  }
  if (predicate.shipTypes) {
    for (const [type, expected] of Object.entries(predicate.shipTypes)) {
      const count = input.fleet.ships.filter((ship) => shipMatchesType(ship, type)).length;
      if (!matchesNumber(count, expected)) return false;
    }
  }
  if (predicate.shipClasses) {
    for (const [classId, expected] of Object.entries(predicate.shipClasses)) {
      const count = input.fleet.ships.filter((ship) => ship.classId === Number(classId)).length;
      if (!matchesNumber(count, expected)) return false;
    }
  }
  if (predicate.namedShips) {
    for (const [name, expected] of Object.entries(predicate.namedShips)) {
      const count = input.fleet.ships.filter((ship) => ship.name.includes(name)).length;
      if (!matchesNumber(count, expected)) return false;
    }
  }
  if (predicate.shipFamilies) {
    for (const family of predicate.shipFamilies) {
      const ids = new Set(family.ids);
      const count = input.fleet.ships.filter((ship) => ids.has(ship.masterId)).length;
      if (!matchesNumber(count, family.count)) return false;
    }
  }
  if (predicate.countExpressions) {
    for (const expression of predicate.countExpressions) {
      const count = expression.terms.reduce((sum, term) => {
        if (term.shipType) {
          return sum + input.fleet.ships.filter((ship) => shipMatchesType(ship, term.shipType!)).length;
        }
        if (term.shipFamilyIds) {
          const ids = new Set(term.shipFamilyIds);
          return sum + input.fleet.ships.filter((ship) => ids.has(ship.masterId)).length;
        }
        if (term.shipClassIds) {
          const ids = new Set(term.shipClassIds);
          return sum + input.fleet.ships.filter((ship) => ids.has(ship.classId)).length;
        }
        return sum;
      }, 0);
      if (!matchesNumber(count, expression.count)) return false;
    }
  }
  if (predicate.los) {
    const score = calculateFleetLos33(input.fleet, predicate.los.coefficient, input.playerLevel ?? 1);
    if (predicate.los.gte != null && score < predicate.los.gte) return false;
    if (predicate.los.lt != null && score >= predicate.los.lt) return false;
  }
  if (predicate.visited && !(input.visited ?? []).includes(predicate.visited)) return false;
  if (predicate.wiki) {
    const compiledTerms = new Set(
      [
        ...(predicate.countExpressions ?? []).map((expression) => expression.wikiTerm),
        ...(predicate.shipFamilies ?? []).map((family) => family.wikiTerm)
      ]
        .filter((term): term is string => Boolean(term))
        .map(normalizeWikiConditionText)
    );
    if (!matchesWikiCondition(predicate.wiki, input, compiledTerms)) return false;
  }
  return true;
}

function matchesNumber(value: number, expected: NumericPredicate) {
  if (expected.eq != null && value !== expected.eq) return false;
  if (expected.gte != null && value < expected.gte) return false;
  if (expected.lte != null && value > expected.lte) return false;
  return true;
}

function routeResult(edge: RoutingEdge): RouteEvaluation {
  return { kind: "route", edgeNo: edge.no, from: edge.from, to: edge.to };
}

function requireEdge(map: RoutingMap, from: string, to: string) {
  const edge = map.edges.find((candidate) => candidate.from === from && candidate.to === to);
  if (!edge) throw new Error(`Map ${map.mapId} has no edge ${from} -> ${to}`);
  return edge;
}

function levelStat(range: number[] | undefined, level: number) {
  if (!range || range.length === 0) return 0;
  const min = Number(range[0] ?? 0);
  const max = Number(range[1] ?? min);
  return Math.floor(min + (max - min) * Math.min(99, Math.max(1, level)) / 99);
}

function buildTypeCounts(ships: RoutingShip[]) {
  return Object.fromEntries(
    Object.keys(TYPE_GROUPS).map((type) => [type, ships.filter((ship) => shipMatchesType(ship, type)).length])
  );
}

function shipMatchesType(ship: RoutingShip, type: string) {
  return (TYPE_GROUPS[type] ?? []).includes(ship.shipType);
}

function buildEquippedShipCounts(ships: RoutingShip[]) {
  const radarTypes = new Set([12, 13]);
  return {
    radar: ships.filter((ship) => ship.equipment.some((item) => radarTypes.has(item.typeId))).length,
    drum: ships.filter((ship) => ship.equipment.some((item) => item.masterId === 75)).length,
    landingCraft: ships.filter((ship) => ship.equipment.some((item) => [68, 166, 167, 193, 230, 355, 408, 409, 436, 449, 494, 495].includes(item.masterId))).length
  };
}

function fleetSpeed(ships: RoutingShip[]): RoutingSpeed {
  if (ships.length === 0) return "slow";
  return ships
    .map(effectiveShipSpeed)
    .reduce((slowest, speed) => {
      return SPEED_ORDER.indexOf(speed) < SPEED_ORDER.indexOf(slowest) ? speed : slowest;
    }, "fastest" as RoutingSpeed);
}

function effectiveShipSpeed(ship: RoutingShip): RoutingSpeed {
  const value = effectiveShipSpeedValue(
    ship.speed,
    ship.classId,
    ship.equipment.map((item) => ({ masterId: item.masterId, improvement: item.improvement }))
  );
  if (value >= 20) return "fastest";
  if (value >= 15) return "fastPlus";
  if (value >= 10) return "fast";
  return "slow";
}

function equipmentLosCoefficient(typeId: number) {
  if (typeId === 7) return 0.6;
  if (typeId === 8) return 0.8;
  if (typeId === 9) return 1;
  if (typeId === 10) return 1.2;
  if (typeId === 11) return 1.1;
  if (typeId === 12 || typeId === 13 || typeId === 29) return 0.6;
  return 0;
}

function equipmentImprovementLos(item: RoutingEquipment) {
  if (item.improvement <= 0) return 0;
  if (item.typeId === 12) return 1.25 * Math.sqrt(item.improvement);
  if (item.typeId === 13) return 1.4 * Math.sqrt(item.improvement);
  if (item.typeId === 10) return 1.2 * Math.sqrt(item.improvement);
  return 0;
}

function matchesWikiCondition(raw: string, input: RouteEvaluationInput, compiledTerms = new Set<string>()): boolean {
  const text = normalizeWikiConditionText(raw);
  if (!text) return true;

  const orParts = text.split(/\s*(?:或|、)\s*/).filter(Boolean);
  if (orParts.length > 1 && orParts.every((part) => containsPredicateToken(part))) {
    return orParts.some((part) => matchesWikiCondition(part, input, compiledTerms));
  }

  const andParts = text.split(/\s*且\s*/).filter(Boolean);
  return andParts.every((part) => {
    const term = part.trim();
    return compiledTerms.has(term) || matchesWikiTerm(term, input);
  });
}

function normalizeWikiConditionText(raw: string) {
  return raw
    .replace(/[？?约]/g, "")
    .replace(/舰队中/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function matchesWikiTerm(term: string, input: RouteEvaluationInput): boolean {
  term = term
    .replace(/\s*[：:]?\s*(?:大概率|小概率|一定概率).*$/g, "")
    .replace(/\s*[：:]\s*\d+(?:\.\d+)?\s*%.*$/g, "")
    .replace(/\s*从(?:左|右)出发.*$/g, "")
    .replace(/[，,：:；;]+$/g, "")
    .trim();
  if (!term || /^(其余|其他情况|上述判定全部失败|去[A-Z]判定失败)/.test(term)) return true;
  if (/^(?:即|以上逐条依次判定|舰队船数|DD\+DE数量)$/.test(term)) return true;
  if (/P1阶段/.test(term)) return input.phase === 1;
  if (/P2阶段/.test(term)) return input.phase === 2;
  if (/P3阶段/.test(term)) return input.phase === 3;
  if (/经过([A-Z])/.test(term)) return (input.visited ?? []).includes(term.match(/经过([A-Z])/)![1]);
  if (/最速/.test(term)) return input.fleet.speed === "fastest";
  if (/高速\+(?:或)?以上|高速\+、最速|高速\+(?:的)?舰队|^\[?高速\+\]?$/.test(term)) {
    return SPEED_ORDER.indexOf(input.fleet.speed) >= SPEED_ORDER.indexOf("fastPlus");
  }
  if (/高速以上|高速舰队/.test(term)) return SPEED_ORDER.indexOf(input.fleet.speed) >= SPEED_ORDER.indexOf("fast");
  if (/高速以下/.test(term)) return SPEED_ORDER.indexOf(input.fleet.speed) <= SPEED_ORDER.indexOf("fast");
  if (/低速舰队/.test(term)) return input.fleet.speed === "slow";
  if (/([A-Z]+)旗舰/.test(term)) {
    const type = term.match(/([A-Z]+)旗舰/)![1];
    return Boolean(input.fleet.ships[0] && shipMatchesType(input.fleet.ships[0], type));
  }
  if (/装备(?:电探|雷达)的船数/.test(term)) return matchesWikiCount(input.fleet.equippedShipCounts.radar ?? 0, term);
  if (/运输桶/.test(term)) return matchesWikiCount(input.fleet.equippedShipCounts.drum ?? 0, term);
  if (/大发系/.test(term)) return matchesWikiCount(input.fleet.equippedShipCounts.landingCraft ?? 0, term);
  if (/索敌/.test(term)) return matchesWikiLos(term, input);
  if (/只包含/.test(term)) {
    const allowed = [...term.matchAll(/\b(BBV|FBB|CVL|CVB|CLT|CAV|SSV|BB|CV|CA|CL|CT|DD|DE|SS|AV|AO|LHA|AS|AR)\b/g)].map((match) => match[1]);
    return allowed.length > 0 && input.fleet.ships.every((ship) => allowed.some((type) => shipMatchesType(ship, type)));
  }
  if (/不包含.+以外的舰种/.test(term)) {
    const allowed = [...term.matchAll(/\b(BBV|FBB|CVL|CVB|CLT|CAV|SSV|BB|CV|CA|CL|CT|DD|DE|SS|AV|AO|LHA|AS|AR)\b/g)].map((match) => match[1]);
    return allowed.length > 0 && input.fleet.ships.every((ship) => allowed.some((type) => shipMatchesType(ship, type)));
  }
  if (/不包含/.test(term)) {
    const names = namedTokens(term.replace(/^.*不包含/, ""));
    return names.every((name) => !input.fleet.ships.some((ship) => shipNameMatches(ship.name, name)));
  }
  if (/包含/.test(term)) {
    const names = namedTokens(term.replace(/^.*包含/, ""));
    return names.every((name) => input.fleet.ships.some((ship) => shipNameMatches(ship.name, name)));
  }

  const chainedComparison = term.match(/^(\d+)\s*<=\s*([^<>=\s]+(?:\+[^<>=\s]+)*)\s*<=\s*(\d+)$/);
  if (chainedComparison) {
    const value = countFleetExpression(chainedComparison[2], input.fleet);
    return value >= Number(chainedComparison[1]) && value <= Number(chainedComparison[3]);
  }

  const comparison = term.match(/^([^<>=\s]+(?:\+[^<>=\s]+)*)\s*(>=|<=|=|>|<)\s*(\d+|舰队船数)$/);
  if (comparison) {
    const value = countFleetExpression(comparison[1], input.fleet);
    const expected = comparison[3] === "舰队船数" ? input.fleet.ships.length : Number(comparison[3]);
    return compareNumber(value, comparison[2], expected);
  }

  const range = term.match(/^([^<>=\s]+(?:\+[^<>=\s]+)*)\s*=\s*(\d+)\s*[~～-]\s*(\d+)$/);
  if (range) {
    const value = countFleetExpression(range[1], input.fleet);
    return value >= Number(range[2]) && value <= Number(range[3]);
  }

  if (/舰队船数/.test(term)) return matchesWikiCount(input.fleet.ships.length, term);
  return false;
}

function countFleetExpression(expression: string, fleet: RoutingFleet) {
  return expression.split("+").reduce((sum, token) => {
    if (token === "舰队船数") return sum + fleet.ships.length;
    if (TYPE_GROUPS[token]) return sum + fleet.ships.filter((ship) => shipMatchesType(ship, token)).length;
    if (token === "大鹰级") return sum + fleet.ships.filter((ship) => ship.classId === 76).length;
    return sum + fleet.ships.filter((ship) => shipNameMatches(ship.name, token)).length;
  }, 0);
}

function shipNameMatches(shipName: string, expected: string) {
  return normalizeShipName(shipName).includes(normalizeShipName(expected));
}

function normalizeShipName(value: string) {
  const replacements: Record<string, string> = {
    風: "风",
    鶴: "鹤",
    鳳: "凤",
    張: "张",
    長: "长",
    門: "门",
    陸: "陆",
    黒: "黑"
  };
  return value
    .normalize("NFKC")
    .replace(/[風鶴鳳張長門陸黒]/g, (character) => replacements[character])
    .replace(/\s+/g, "");
}

function matchesWikiCount(value: number, term: string) {
  const range = term.match(/=\s*(\d+)\s*[~～-]\s*(\d+)/);
  if (range) return value >= Number(range[1]) && value <= Number(range[2]);
  const comparison = term.match(/(>=|<=|=|>|<)\s*(\d+)/);
  return comparison ? compareNumber(value, comparison[1], Number(comparison[2])) : true;
}

function matchesWikiLos(term: string, input: RouteEvaluationInput) {
  const coefficient = Number(term.match(/分歧点系数\s*=\s*(\d+)/)?.[1] ?? 1);
  const score = calculateFleetLos33(input.fleet, coefficient, input.playerLevel ?? 1);
  const range = term.match(/索敌\s*(\d+(?:\.\d+)?)\s*[~～-]\s*(\d+(?:\.\d+)?)/);
  if (range) return score >= Number(range[1]) && score < Number(range[2]);
  const comparison = term.match(/索敌\s*(>=|<=|>|<)\s*(\d+(?:\.\d+)?)/);
  if (comparison) return compareNumber(score, comparison[1], Number(comparison[2]));
  const above = term.match(/(\d+(?:\.\d+)?)索敌以上/);
  if (above) return score >= Number(above[1]);
  const below = term.match(/(\d+(?:\.\d+)?)索敌以下|索敌不足\s*(\d+(?:\.\d+)?)/);
  if (below) return score < Number(below[1] ?? below[2]);
  return false;
}

function compareNumber(value: number, operator: string, expected: number) {
  if (operator === ">=") return value >= expected;
  if (operator === "<=") return value <= expected;
  if (operator === ">") return value > expected;
  if (operator === "<") return value < expected;
  return value === expected;
}

function namedTokens(text: string) {
  return text
    .replace(/[、，,]|\s+和\s+/g, "+")
    .split("+")
    .map((token) => token.replace(/[^一-龥ぁ-んァ-ヶA-Za-z0-9]/g, "").trim())
    .filter((token) => token.length >= 2 && !["舰队", "以上", "以下"].includes(token));
}

function containsPredicateToken(text: string) {
  return /(?:>=|<=|=|舰队|包含|高速|低速|阶段|索敌|判定失败)/.test(text);
}
