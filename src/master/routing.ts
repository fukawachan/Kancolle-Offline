import { createHash } from "node:crypto";
import { masterData } from "./data.js";
import { effectiveShipSpeedValue } from "./ship-speed.js";
import { requirePlayerShipStat } from "./ship-stat-growth.js";
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

export type NumericPredicate = {
  eq?: number;
  gte?: number;
  lte?: number;
};

export type RoutingCompiledCondition =
  | { kind: "true" }
  | { kind: "all"; conditions: RoutingCompiledCondition[] }
  | { kind: "any"; conditions: RoutingCompiledCondition[] }
  | { kind: "phase"; value: number }
  | { kind: "visited"; point: string }
  | { kind: "speed"; minimum?: RoutingSpeed; maximum?: RoutingSpeed; exact?: RoutingSpeed }
  | { kind: "flagshipType"; shipType: string }
  | { kind: "equippedShipCount"; category: "radar" | "drum" | "landingCraft"; count: NumericPredicate }
  | {
      kind: "los";
      coefficient: number;
      minimum?: number;
      minimumInclusive?: boolean;
      maximum?: number;
      maximumInclusive?: boolean;
    }
  | { kind: "allowedShipTypes"; shipTypes: string[] }
  | {
      kind: "fleetExpressionCount";
      terms: ({ kind: "shipType"; shipType: string } | { kind: "shipClass"; classIds: number[] } | { kind: "fleetSize" })[];
      count?: NumericPredicate;
      compareToFleetSize?: "=" | ">=" | "<=" | ">" | "<";
    };

export type RoutingPredicate = {
  fleetSize?: NumericPredicate;
  shipTypes?: Record<string, NumericPredicate>;
  shipTypeSpeedCounts?: {
    shipType: string;
    speed: RoutingSpeed;
    count: NumericPredicate;
  }[];
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
  compiledWiki?: RoutingCompiledCondition;
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
  evidence?: RoutingEvidence;
  diagnostics?: RoutingDiagnostic[];
};

export type RoutingEvidenceLevel = "exact" | "statistical" | "inferred" | "fallback";

export type RoutingEvidence = {
  level: RoutingEvidenceLevel;
  source?: string;
  revision?: number;
};

export type RoutingDiagnostic = {
  code: "unresolved-wiki-term";
  condition: string;
  term: string;
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
  source?: string;
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
  | { kind: "route"; edgeNo: number; from: string; to: string; evidence?: RoutingEvidence }
  | { kind: "select"; edgeNos: number[]; from: string; evidence?: RoutingEvidence };

export class UnsupportedRoutingPredicateError extends Error {
  constructor(
    readonly condition: string,
    readonly terms: readonly string[]
  ) {
    super(`Unsupported routing predicate term(s): ${terms.join(", ")} (condition: ${condition})`);
    this.name = "UnsupportedRoutingPredicateError";
  }
}

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
    const evidence = rule.evidence ?? inferRoutingRuleEvidence(rule, map.revision);
    if (rule.chance != null && stableRouteRoll(input.seed, map.mapId, input.from, input.step, rule.source) >= rule.chance) {
      continue;
    }
    if (rule.select) {
      const choices = rule.select.map((to) => requireEdge(map, input.from, to));
      if (input.selectedEdgeNo == null) {
        return withEvidence(
          { kind: "select" as const, edgeNos: choices.map((edge) => edge.no), from: input.from },
          evidence
        );
      }
      const selected = choices.find((edge) => edge.no === input.selectedEdgeNo);
      if (!selected) {
        throw new Error(`Selected edge ${input.selectedEdgeNo} is not available from ${input.from}`);
      }
      return routeResult(selected, evidence);
    }
    if (rule.to) return routeResult(requireEdge(map, input.from, rule.to), evidence);
    if (rule.weights) {
      const destinations = Object.entries(rule.weights).filter(([, weight]) => weight > 0);
      if (destinations.length === 0) throw new Error(`Map ${map.mapId} has an empty weighted rule at ${input.from}`);
      const total = destinations.reduce((sum, [, weight]) => sum + weight, 0);
      let roll = stableRouteRoll(input.seed, map.mapId, input.from, input.step) * total;
      for (const [to, weight] of destinations) {
        if (roll < weight) return routeResult(requireEdge(map, input.from, to), evidence);
        roll -= weight;
      }
      return routeResult(requireEdge(map, input.from, destinations[destinations.length - 1][0]), evidence);
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
      return {
        id: ship.id,
        masterId: ship.masterId,
        shipType: Number(shipMaster?.api_stype ?? 0),
        classId: Number(shipMaster?.api_ctype ?? 0),
        name: shipMaster?.api_name ?? `Ship ${ship.masterId}`,
        speed: Number(shipMaster?.api_soku ?? 0),
        level: ship.level,
        baseLos: requirePlayerShipStat(ship.masterId, "los", ship.level),
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
  if (predicate.shipTypeSpeedCounts) {
    for (const expected of predicate.shipTypeSpeedCounts) {
      const count = input.fleet.ships.filter((ship) => (
        shipMatchesType(ship, expected.shipType) && effectiveShipSpeed(ship) === expected.speed
      )).length;
      if (!matchesNumber(count, expected.count)) return false;
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
  if (predicate.compiledWiki || predicate.wiki) {
    const compiledTerms = new Set(
      [
        ...(predicate.countExpressions ?? []).map((expression) => expression.wikiTerm),
        ...(predicate.shipFamilies ?? []).map((family) => family.wikiTerm)
      ]
        .filter((term): term is string => Boolean(term))
        .map(normalizeWikiConditionText)
    );
    const compiled = predicate.compiledWiki
      ?? compileWikiCondition(predicate.wiki!, compiledTerms);
    if (!matchesCompiledWikiCondition(compiled, input)) return false;
  }
  return true;
}

function matchesNumber(value: number, expected: NumericPredicate) {
  if (expected.eq != null && value !== expected.eq) return false;
  if (expected.gte != null && value < expected.gte) return false;
  if (expected.lte != null && value > expected.lte) return false;
  return true;
}

function routeResult(edge: RoutingEdge, evidence?: RoutingEvidence): RouteEvaluation {
  return withEvidence({ kind: "route" as const, edgeNo: edge.no, from: edge.from, to: edge.to }, evidence);
}

function withEvidence<T extends { kind: "route" | "select" }>(result: T, evidence?: RoutingEvidence): T & {
  evidence?: RoutingEvidence;
} {
  return evidence?.level && evidence.level !== "exact" ? { ...result, evidence } : result;
}

export function inferRoutingRuleEvidence(rule: RoutingRule, revision?: number): RoutingEvidence {
  const source = rule.source;
  const normalizedSource = source?.toLowerCase() ?? "";
  const hasPublishedPercentage = /\d+(?:\.\d+)?\s*%/.test(source ?? "");
  const positiveWeights = Object.values(rule.weights ?? {}).filter((weight) => weight > 0);
  const equalAssumedWeights = positiveWeights.length > 1
    && positiveWeights.every((weight) => weight === positiveWeights[0])
    && !hasPublishedPercentage;
  const assumedCoinFlip = rule.chance != null && !hasPublishedPercentage;
  let level: RoutingEvidenceLevel;
  if (
    normalizedSource.includes("no published exact fallback")
    || normalizedSource.includes("fallback")
    || equalAssumedWeights
    || assumedCoinFlip
  ) {
    level = "fallback";
  } else if (
    rule.chance != null
    || rule.weights
    || normalizedSource.includes("random")
    || /(?:随机|概率|约|\d(?:\.\d+)?\s*%)/.test(source ?? "")
  ) {
    level = "statistical";
  } else if (
    normalizedSource.includes("inferred")
    || /(?:[?？]|可能|不明|样本太少|推定)/.test(source ?? "")
  ) {
    level = "inferred";
  } else {
    level = "exact";
  }
  return {
    level,
    ...(source ? { source } : {}),
    ...(revision != null ? { revision } : {})
  };
}

function requireEdge(map: RoutingMap, from: string, to: string) {
  const edge = map.edges.find((candidate) => candidate.from === from && candidate.to === to);
  if (!edge) throw new Error(`Map ${map.mapId} has no edge ${from} -> ${to}`);
  return edge;
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
    ship.equipment.map((item) => ({ masterId: item.masterId, improvement: item.improvement })),
    { masterId: ship.masterId, shipType: ship.shipType }
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

export function compileRoutingPredicate(predicate: RoutingPredicate): RoutingPredicate {
  const all = predicate.all?.map(compileRoutingPredicate);
  const any = predicate.any?.map(compileRoutingPredicate);
  const not = predicate.not ? compileRoutingPredicate(predicate.not) : undefined;
  const compiledTerms = compiledWikiTerms(predicate);
  return {
    ...predicate,
    ...(all ? { all } : {}),
    ...(any ? { any } : {}),
    ...(not ? { not } : {}),
    ...(predicate.compiledWiki
      ? { compiledWiki: predicate.compiledWiki }
      : predicate.wiki
        ? { compiledWiki: compileWikiCondition(predicate.wiki, compiledTerms) }
        : {})
  };
}

function compiledWikiTerms(predicate: RoutingPredicate) {
  return new Set(
    [
      ...(predicate.countExpressions ?? []).map((expression) => expression.wikiTerm),
      ...(predicate.shipFamilies ?? []).map((family) => family.wikiTerm)
    ]
      .filter((term): term is string => Boolean(term))
      .map(normalizeWikiConditionText)
  );
}

function compileWikiCondition(raw: string, compiledTerms = new Set<string>()): RoutingCompiledCondition {
  const unresolvedTerms = unresolvedWikiConditionTerms(raw, compiledTerms);
  if (unresolvedTerms.length > 0) {
    throw new UnsupportedRoutingPredicateError(raw, unresolvedTerms);
  }
  const text = normalizeWikiConditionText(raw);
  if (!text) return { kind: "true" };

  const orParts = text.split(/\s*(?:或(?!以上)|、)\s*/).filter(Boolean);
  if (orParts.length > 1 && orParts.every((part) => containsPredicateToken(part))) {
    return {
      kind: "any",
      conditions: orParts.map((part) => compileWikiCondition(part, compiledTerms))
    };
  }

  const andParts = text.split(/\s*且\s*/).filter(Boolean);
  const losCoefficient = Number(text.match(/分歧点系数\s*=\s*(\d+)/)?.[1] ?? 1);
  const conditions = andParts.map((part) => {
    const term = part.trim();
    return compiledTerms.has(term)
      ? { kind: "true" as const }
      : compileWikiTerm(term, losCoefficient);
  });
  return conditions.length === 1 ? conditions[0] : { kind: "all", conditions };
}

function compileWikiTerm(rawTerm: string, losCoefficient: number): RoutingCompiledCondition {
  const term = cleanWikiTerm(rawTerm);
  if (!term || /^(其余|其他情况|上述判定全部失败|去[A-Z]判定失败)/.test(term)) {
    return { kind: "true" };
  }
  if (/^(?:即|以上逐条依次判定)$/.test(term)) return { kind: "true" };
  const phase = term.match(/P([123])阶段/);
  if (phase) return { kind: "phase", value: Number(phase[1]) };
  const visited = term.match(/经过([A-Z])/);
  if (visited) return { kind: "visited", point: visited[1] };
  if (/^分歧点系数\s*=\s*\d+$/.test(term)) return { kind: "true" };

  if (/高速\+(?:或)?以上|高速\+、最速|高速\+(?:的)?舰队|^\[?高速\+\]?$/.test(term)) {
    return { kind: "speed", minimum: "fastPlus" };
  }
  if (/最速/.test(term)) return { kind: "speed", exact: "fastest" };
  if (/高速以上|高速舰队/.test(term)) return { kind: "speed", minimum: "fast" };
  if (/高速以下/.test(term)) return { kind: "speed", maximum: "fast" };
  if (/低速舰队/.test(term)) return { kind: "speed", exact: "slow" };

  const flagship = term.match(/([A-Z]+)旗舰/);
  if (flagship) return { kind: "flagshipType", shipType: flagship[1] };
  if (/装备(?:电探|雷达)的船数/.test(term)) {
    return { kind: "equippedShipCount", category: "radar", count: requireCountPredicate(term) };
  }
  if (/运输桶/.test(term)) {
    return { kind: "equippedShipCount", category: "drum", count: requireCountPredicate(term) };
  }
  if (/大发系/.test(term)) {
    return { kind: "equippedShipCount", category: "landingCraft", count: requireCountPredicate(term) };
  }
  if (/索敌/.test(term)) return compileWikiLos(term, losCoefficient);
  if (/只包含|不包含.+以外的舰种/.test(term)) {
    const shipTypes = extractTypeTokens(term);
    if (shipTypes.length > 0) return { kind: "allowedShipTypes", shipTypes };
  }
  if (/不包含|包含/.test(term)) {
    throw new UnsupportedRoutingPredicateError(term, [term]);
  }

  const chainedComparison = term.match(/^(\d+)\s*<=\s*([^<>=\s]+(?:\+[^<>=\s]+)*)\s*<=\s*(\d+)$/);
  if (chainedComparison) {
    return {
      kind: "fleetExpressionCount",
      terms: compileFleetCountTerms(chainedComparison[2]),
      count: { gte: Number(chainedComparison[1]), lte: Number(chainedComparison[3]) }
    };
  }

  const comparison = term.match(/^([^<>=\s]+(?:\+[^<>=\s]+)*)\s*(>=|<=|=|>|<)\s*(\d+|舰队船数)$/);
  if (comparison) {
    const operator = comparison[2] as "=" | ">=" | "<=" | ">" | "<";
    return {
      kind: "fleetExpressionCount",
      terms: compileFleetCountTerms(comparison[1]),
      ...(comparison[3] === "舰队船数"
        ? { compareToFleetSize: operator }
        : { count: integerPredicate(operator, Number(comparison[3])) })
    };
  }

  const range = term.match(/^([^<>=\s]+(?:\+[^<>=\s]+)*)\s*=\s*(\d+)\s*[~～-]\s*(\d+)/);
  if (range) {
    return {
      kind: "fleetExpressionCount",
      terms: compileFleetCountTerms(range[1]),
      count: { gte: Number(range[2]), lte: Number(range[3]) }
    };
  }

  if (/舰队船数/.test(term)) {
    return {
      kind: "fleetExpressionCount",
      terms: [{ kind: "fleetSize" }],
      count: requireCountPredicate(term)
    };
  }
  throw new UnsupportedRoutingPredicateError(term, [term]);
}

function compileFleetCountTerms(expression: string): Extract<RoutingCompiledCondition, { kind: "fleetExpressionCount" }>["terms"] {
  return expression.split("+").map((token) => {
    if (token === "舰队船数") return { kind: "fleetSize" as const };
    if (token === "大鹰级") return { kind: "shipClass" as const, classIds: [76] };
    if (TYPE_GROUPS[token]) return { kind: "shipType" as const, shipType: token };
    throw new UnsupportedRoutingPredicateError(expression, [token]);
  });
}

function requireCountPredicate(term: string): NumericPredicate {
  const range = term.match(/=\s*(\d+)\s*[~～-]\s*(\d+)/);
  if (range) return { gte: Number(range[1]), lte: Number(range[2]) };
  const comparison = term.match(/(>=|<=|=|>|<)\s*(\d+)/);
  if (!comparison) throw new UnsupportedRoutingPredicateError(term, [term]);
  return integerPredicate(comparison[1] as "=" | ">=" | "<=" | ">" | "<", Number(comparison[2]));
}

function integerPredicate(operator: "=" | ">=" | "<=" | ">" | "<", expected: number): NumericPredicate {
  if (operator === "=") return { eq: expected };
  if (operator === ">=") return { gte: expected };
  if (operator === "<=") return { lte: expected };
  if (operator === ">") return { gte: expected + 1 };
  return { lte: expected - 1 };
}

function compileWikiLos(term: string, coefficient: number): RoutingCompiledCondition {
  const chained = term.match(/(\d+(?:\.\d+)?)\s*<=\s*索敌\s*<\s*(\d+(?:\.\d+)?)/);
  if (chained) {
    return {
      kind: "los",
      coefficient,
      minimum: Number(chained[1]),
      minimumInclusive: true,
      maximum: Number(chained[2]),
      maximumInclusive: false
    };
  }
  const range = term.match(/索敌\s*(\d+(?:\.\d+)?)\s*[~～-]\s*(\d+(?:\.\d+)?)/)
    ?? term.match(/(\d+(?:\.\d+)?)\s*[~～-]\s*(\d+(?:\.\d+)?)索敌/);
  if (range) {
    return {
      kind: "los",
      coefficient,
      minimum: Number(range[1]),
      minimumInclusive: true,
      maximum: Number(range[2]),
      maximumInclusive: false
    };
  }
  const comparison = term.match(/索敌\s*(>=|<=|>|<)\s*(\d+(?:\.\d+)?)/);
  if (comparison) return losComparison(coefficient, comparison[1], Number(comparison[2]));
  const above = term.match(/(\d+(?:\.\d+)?)索敌以上|(\d+(?:\.\d+)?)以上索敌/);
  if (above) return losComparison(coefficient, ">=", Number(above[1] ?? above[2]));
  const atMost = term.match(/(\d+(?:\.\d+)?)索敌以下/);
  if (atMost) return losComparison(coefficient, "<=", Number(atMost[1]));
  const below = term.match(/索敌不足\s*(\d+(?:\.\d+)?)/);
  if (below) return losComparison(coefficient, "<", Number(below[1]));
  throw new UnsupportedRoutingPredicateError(term, [term]);
}

function losComparison(coefficient: number, operator: string, expected: number): RoutingCompiledCondition {
  if (operator === ">=" || operator === ">") {
    return { kind: "los", coefficient, minimum: expected, minimumInclusive: operator === ">=" };
  }
  return { kind: "los", coefficient, maximum: expected, maximumInclusive: operator === "<=" };
}

function matchesCompiledWikiCondition(condition: RoutingCompiledCondition, input: RouteEvaluationInput): boolean {
  if (condition.kind === "true") return true;
  if (condition.kind === "all") return condition.conditions.every((item) => matchesCompiledWikiCondition(item, input));
  if (condition.kind === "any") return condition.conditions.some((item) => matchesCompiledWikiCondition(item, input));
  if (condition.kind === "phase") return input.phase === condition.value;
  if (condition.kind === "visited") return (input.visited ?? []).includes(condition.point);
  if (condition.kind === "speed") {
    const index = SPEED_ORDER.indexOf(input.fleet.speed);
    if (condition.exact && input.fleet.speed !== condition.exact) return false;
    if (condition.minimum && index < SPEED_ORDER.indexOf(condition.minimum)) return false;
    if (condition.maximum && index > SPEED_ORDER.indexOf(condition.maximum)) return false;
    return true;
  }
  if (condition.kind === "flagshipType") {
    return Boolean(input.fleet.ships[0] && shipMatchesType(input.fleet.ships[0], condition.shipType));
  }
  if (condition.kind === "equippedShipCount") {
    return matchesNumber(input.fleet.equippedShipCounts[condition.category] ?? 0, condition.count);
  }
  if (condition.kind === "los") {
    const score = calculateFleetLos33(input.fleet, condition.coefficient, input.playerLevel ?? 1);
    if (condition.minimum != null) {
      if (condition.minimumInclusive === false ? score <= condition.minimum : score < condition.minimum) return false;
    }
    if (condition.maximum != null) {
      if (condition.maximumInclusive ? score > condition.maximum : score >= condition.maximum) return false;
    }
    return true;
  }
  if (condition.kind === "allowedShipTypes") {
    return input.fleet.ships.every((ship) => condition.shipTypes.some((type) => shipMatchesType(ship, type)));
  }

  const count = condition.terms.reduce((sum, term) => {
    if (term.kind === "fleetSize") return sum + input.fleet.ships.length;
    if (term.kind === "shipClass") {
      return sum + input.fleet.ships.filter((ship) => term.classIds.includes(ship.classId)).length;
    }
    return sum + input.fleet.ships.filter((ship) => shipMatchesType(ship, term.shipType)).length;
  }, 0);
  if (condition.compareToFleetSize) {
    return compareNumber(count, condition.compareToFleetSize, input.fleet.ships.length);
  }
  return matchesNumber(count, condition.count ?? {});
}

function normalizeWikiConditionText(raw: string) {
  return raw
    .replace(/[？?约]/g, "")
    .replace(/舰队中/g, "")
    .replace(/CL\(\+CT\)/g, "CL+CT")
    // A generated child row can inherit a parent of the form "X, or the
    // previous X decision failed". Reaching that child already proves the
    // parent decision did not route, so retain the child conjunction instead
    // of accidentally parsing `X OR child` with the wrong precedence.
    .replace(/(?:去[A-Z]判定失败(?:时)?\s*或\s*[^且]+|[^且]+\s*或\s*去[A-Z]判定失败(?:时)?)/g, "上述判定全部失败")
    .replace(/\s+/g, " ")
    .trim();
}

export function routingPredicateDiagnostics(predicate: RoutingPredicate): RoutingDiagnostic[] {
  const nested = [
    ...(predicate.all ?? []),
    ...(predicate.any ?? []),
    ...(predicate.not ? [predicate.not] : [])
  ].flatMap(routingPredicateDiagnostics);
  if (!predicate.wiki) return nested;
  const compiledTerms = new Set(
    [
      ...(predicate.countExpressions ?? []).map((expression) => expression.wikiTerm),
      ...(predicate.shipFamilies ?? []).map((family) => family.wikiTerm)
    ]
      .filter((term): term is string => Boolean(term))
      .map(normalizeWikiConditionText)
  );
  return [
    ...nested,
    ...unresolvedWikiConditionTerms(predicate.wiki, compiledTerms).map((term) => ({
      code: "unresolved-wiki-term" as const,
      condition: predicate.wiki!,
      term
    }))
  ];
}

function unresolvedWikiConditionTerms(raw: string, compiledTerms: ReadonlySet<string>): string[] {
  const text = normalizeWikiConditionText(raw);
  if (!text) return [];

  const orParts = text.split(/\s*(?:或(?!以上)|、)\s*/).filter(Boolean);
  if (orParts.length > 1 && orParts.every((part) => containsPredicateToken(part))) {
    return [...new Set(orParts.flatMap((part) => unresolvedWikiConditionTerms(part, compiledTerms)))];
  }

  return [...new Set(text
    .split(/\s*且\s*/)
    .map((term) => term.trim())
    .filter((term) => !compiledTerms.has(term) && !wikiTermIsSupported(term)))];
}

function wikiTermIsSupported(rawTerm: string) {
  const term = cleanWikiTerm(rawTerm);
  if (!term || /^(其余|其他情况|上述判定全部失败|去[A-Z]判定失败)/.test(term)) return true;
  if (/^(?:即|以上逐条依次判定)$/.test(term)) return true;
  if (/P[123]阶段/.test(term) || /经过[A-Z]/.test(term)) return true;
  if (/^分歧点系数\s*=\s*\d+$/.test(term)) return true;
  if (/最速/.test(term)) return true;
  if (/高速\+(?:或)?以上|高速\+、最速|高速\+(?:的)?舰队|^\[?高速\+\]?$/.test(term)) return true;
  if (/高速以上|高速舰队|高速以下|低速舰队/.test(term)) return true;

  const flagship = term.match(/([A-Z]+)旗舰/);
  if (flagship) return Boolean(TYPE_GROUPS[flagship[1]]);
  if (/装备(?:电探|雷达)的船数|运输桶|大发系/.test(term)) return hasNumericComparison(term);
  if (/索敌/.test(term)) return wikiLosTermIsSupported(term);
  if (/只包含|不包含.+以外的舰种/.test(term)) return extractTypeTokens(term).length > 0;
  // Named-ship inclusion/exclusion must have a generated shipFamilies term.
  // It is intentionally not accepted here by display name alone.
  if (/不包含|包含/.test(term)) return false;

  const chainedComparison = term.match(/^(\d+)\s*<=\s*([^<>=\s]+(?:\+[^<>=\s]+)*)\s*<=\s*(\d+)$/);
  if (chainedComparison) return fleetExpressionIsTyped(chainedComparison[2]);
  const comparison = term.match(/^([^<>=\s]+(?:\+[^<>=\s]+)*)\s*(>=|<=|=|>|<)\s*(\d+|舰队船数)$/);
  if (comparison) return fleetExpressionIsTyped(comparison[1]);
  const range = term.match(/^([^<>=\s]+(?:\+[^<>=\s]+)*)\s*=\s*(\d+)\s*[~～-]\s*(\d+)$/);
  if (range) return fleetExpressionIsTyped(range[1]);
  if (/舰队船数/.test(term)) return hasNumericComparison(term);
  return false;
}

function cleanWikiTerm(term: string) {
  return term
    .replace(/\s*[：:]?\s*(?:大概率|小概率|一定概率).*$/g, "")
    .replace(/\s*[：:]\s*\d+(?:\.\d+)?\s*%.*$/g, "")
    .replace(/\s*从(?:左|右|[12])出发.*$/g, "")
    .replace(/^即[，,]?\s*/g, "")
    .replace(/时[：:]?$/g, "")
    .replace(/[，,：:；;]+$/g, "")
    .trim();
}

function extractTypeTokens(term: string) {
  return [...term.matchAll(/\b(BBV|FBB|CVL|CVB|CLT|CAV|SSV|BB|CV|CA|CL|CT|DD|DE|SS|AV|AO|LHA|AS|AR)\b/g)]
    .map((match) => match[1]);
}

function fleetExpressionIsTyped(expression: string) {
  return expression.split("+").every((token) => token === "舰队船数" || token === "大鹰级" || Boolean(TYPE_GROUPS[token]));
}

function hasNumericComparison(term: string) {
  return /=\s*\d+\s*[~～-]\s*\d+/.test(term) || /(>=|<=|=|>|<)\s*\d+/.test(term);
}

function wikiLosTermIsSupported(term: string) {
  return /\d+(?:\.\d+)?\s*<=\s*索敌\s*<\s*\d+(?:\.\d+)?/.test(term)
    || /索敌\s*\d+(?:\.\d+)?\s*[~～-]\s*\d+(?:\.\d+)?/.test(term)
    || /\d+(?:\.\d+)?\s*[~～-]\s*\d+(?:\.\d+)?索敌/.test(term)
    || /索敌\s*(>=|<=|>|<)\s*\d+(?:\.\d+)?/.test(term)
    || /\d+(?:\.\d+)?索敌以上/.test(term)
    || /\d+(?:\.\d+)?索敌以下|索敌不足\s*\d+(?:\.\d+)?/.test(term);
}

function compareNumber(value: number, operator: string, expected: number) {
  if (operator === ">=") return value >= expected;
  if (operator === "<=") return value <= expected;
  if (operator === ">") return value > expected;
  if (operator === "<") return value < expected;
  return value === expected;
}

function containsPredicateToken(text: string) {
  return /(?:>=|<=|=|舰队|包含|高速|低速|阶段|索敌|判定失败)/.test(text);
}
