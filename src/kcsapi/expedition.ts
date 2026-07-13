import {
  EXPEDITION_DEFINITIONS,
  EXPEDITION_MASTERS,
  type ExpeditionDefinition,
  type ExpeditionShipGroup,
} from "../master/expedition-data.js";
import { masterData } from "../master/data.js";
import {
  eventSupportExpeditionDefinition,
  eventSupportExpeditionDefinitions,
  eventSupportExpeditionMaster,
  eventSupportExpeditionMasters
} from "../master/event-data.js";
import type { SaveState, Ship } from "../state/types.js";
import { toShip } from "./serializers.js";

export type ExpeditionShipSnapshot = {
  id: number;
  masterId: number;
  typeId: number;
  level: number;
  exp: number;
  hp: number;
  maxHp: number;
  condition: number;
  fuel: number;
  maxFuel: number;
  ammo: number;
  maxAmmo: number;
  marriedAt: number;
  slotItemMasterIds: number[];
  slotItems: { masterId: number; level: number }[];
  firepower: number;
  antiAir: number;
  antiSubmarine: number;
  lineOfSight: number;
};

export type ExpeditionRunSnapshot = {
  deckId: number;
  missionId: number;
  serialCid: string;
  seed: number;
  startedAt: number;
  completeAt: number;
  ships: ExpeditionShipSnapshot[];
};

export type ExpeditionOutcome = {
  clearResult: 0 | 1 | 2;
  memberExp: number;
  shipExp: number[];
  materials: [number, number, number, number];
  items: { itemId: number; count: number; name: string }[];
  fuelCosts: number[];
  ammoCosts: number[];
  conditionCosts: number[];
  shipHps: number[];
};

export type ExpeditionRequirementResult = {
  ok: boolean;
  failures: string[];
};

export type ExpeditionUnlockRule = {
  /** Expeditions that only need to have succeeded at least once. */
  completedIds: readonly number[];
  /** Monthly expeditions that must have succeeded in the current reset period. */
  periodCompletedIds: readonly number[];
  /** Normal sortie maps that must already be cleared. */
  clearedMapIds: readonly number[];
};

const DRUM_CAN_MASTER_ID = 75;

// Explicit unlock graph from the 2026-07-10 Expedition reference table.
// The generated operational rows intentionally do not infer this graph: the
// previous "preceding row" fallback silently locked/unlocked unrelated areas.
// Map IDs use the server's area*10+map representation (1-5 => 15, 2-4 => 24).
const EXPEDITION_UNLOCK_RULES = new Map<number, ExpeditionUnlockRule>([
  [1, rule()], [2, rule([1])], [3, rule([1])], [4, rule([2, 3])],
  [5, rule([2, 3])], [6, rule([4])], [7, rule([6])], [8, rule([7])],
  [9, rule([1])], [10, rule([9])], [11, rule([10])], [12, rule([10])],
  [13, rule([10])], [14, rule([11, 12, 13])], [15, rule([14])], [16, rule([15])],
  [17, rule([1])], [18, rule([16, 17])], [19, rule([18])], [20, rule([19])],
  [21, rule([17])], [22, rule([18])], [23, rule([22], [], [15])], [24, rule([18, 21])],
  [25, rule([18])], [26, rule([25])], [27, rule([20])], [28, rule([27])],
  [29, rule([28])], [30, rule([29], [], [15])], [31, rule([29], [], [15])], [32, rule([8])],
  [33, rule([18])], [34, rule([26])], [35, rule([26])], [36, rule([35])],
  [37, rule([36], [], [15])], [38, rule([37])], [39, rule([36], [], [15])], [40, rule([38])],
  [41, rule([110], [], [24])], [42, rule([41])], [43, rule([], [42])],
  [44, rule([40, 41], [103])], [45, rule([32, 41])], [46, rule([131])],
  [100, rule([5])], [101, rule([8, 100])], [102, rule([24, 101])], [103, rule([102])],
  [104, rule([], [103, 112])], [105, rule([], [104, 113])],
  [110, rule([10])], [111, rule([102])], [112, rule([], [111])], [113, rule([], [112])],
  [114, rule([], [103, 113])], [115, rule([], [103, 113])],
  [131, rule([32])], [132, rule([131])], [133, rule([], [132])],
  [141, rule([40])], [142, rule([38])]
]);

function rule(
  completedIds: readonly number[] = [],
  periodCompletedIds: readonly number[] = [],
  clearedMapIds: readonly number[] = []
): ExpeditionUnlockRule {
  return { completedIds, periodCompletedIds, clearedMapIds };
}

export function expeditionUnlockRule(id: number): ExpeditionUnlockRule {
  const normalizedId = Math.trunc(id);
  return EXPEDITION_UNLOCK_RULES.get(normalizedId)
    ?? rule(expeditionDefinition(normalizedId).prerequisiteIds);
}
const LANDING_EQUIPMENT_BONUS = new Map<number, number>([
  [68, 0.05],
  [166, 0.02],
  [167, 0.01],
  [193, 0.05],
  [230, 0],
  [355, 0],
  [408, 0.02],
  [409, 0.03],
  [436, 0.02],
  [449, 0.02],
  [482, 0],
  [494, 0],
  [495, 0],
  [514, 0],
  [525, 0.04],
  [526, 0.05],
]);
const KINU_KAI_NI_MASTER_ID = 487;
const DAIHATSU_MASTER_ID = 68;
const TOKU_DAIHATSU_MASTER_ID = 193;
const OVER_DRUM_REQUIREMENTS = new Map<number, number>([
  [21, 4], [24, 2], [37, 5], [38, 10], [40, 4], [44, 8], [142, 6]
]);

export function expeditionMasters(activeEventAreaId: number | null = null) {
  return activeEventAreaId == null
    ? EXPEDITION_MASTERS
    : [...EXPEDITION_MASTERS, ...eventSupportExpeditionMasters(activeEventAreaId)];
}

export function expeditionDefinitions(activeEventAreaId: number | null = null) {
  return activeEventAreaId == null
    ? EXPEDITION_DEFINITIONS
    : [...EXPEDITION_DEFINITIONS, ...eventSupportExpeditionDefinitions(activeEventAreaId)];
}

export function allExpeditionDefinitions() {
  return [...EXPEDITION_DEFINITIONS, ...eventSupportExpeditionDefinitions()];
}

export function expeditionDefinition(id: number) {
  const normalizedId = Math.trunc(id);
  const definition = EXPEDITION_DEFINITIONS.find((item) => item.id === normalizedId)
    ?? eventSupportExpeditionDefinition(normalizedId);
  if (!definition) throw new Error(`Unknown expedition ${id}`);
  return definition;
}

export function expeditionMaster(id: number) {
  const normalizedId = Math.trunc(id);
  const master = EXPEDITION_MASTERS.find((item) => item.api_id === normalizedId)
    ?? eventSupportExpeditionMaster(normalizedId);
  if (!master) throw new Error(`Unknown expedition ${id}`);
  return master;
}

export function supportExpeditionMissionIds() {
  return allExpeditionDefinitions()
    .filter((definition) => definition.supportType != null)
    .map((definition) => definition.id);
}

export function supportExpeditionForSortie(
  areaId: number,
  isBoss: boolean,
  activeEventAreaId: number | null = null
) {
  const supportType = isBoss ? "boss" : "route";
  return expeditionDefinitions(activeEventAreaId)
    .find((definition) =>
      definition.areaId === Math.trunc(areaId) &&
      definition.supportType === supportType
    );
}

export function buildExpeditionSnapshot(
  save: SaveState,
  deckId: number,
  missionId: number,
  options: { now?: number; seed?: number; serialCid?: string } = {}
): ExpeditionRunSnapshot {
  const deck = save.decks.find((item) => item.id === deckId);
  if (!deck) throw new Error(`Unknown deck ${deckId}`);
  const definition = expeditionDefinition(missionId);
  const now = Math.trunc(options.now ?? Date.now());
  const seed = Math.trunc(options.seed ?? deterministicSeed(now, deckId, missionId));
  const ships = deck.shipIds
    .filter((id) => id > 0)
    .map((id) => save.ships.find((ship) => ship.id === id))
    .filter((ship): ship is Ship => ship != null)
    .map((ship) => snapshotShip(save, ship));

  return {
    deckId,
    missionId,
    serialCid: options.serialCid ?? "",
    seed,
    startedAt: now,
    completeAt: now + definition.durationMinutes * 60_000,
    ships,
  };
}

export function evaluateExpeditionRequirements(
  snapshot: ExpeditionRunSnapshot,
  definition: ExpeditionDefinition
): ExpeditionRequirementResult {
  const failures: string[] = [];
  if (snapshot.ships.length < definition.minimumShips) failures.push("minimum-ships");
  if ((snapshot.ships[0]?.level ?? 0) < definition.flagshipLevel) failures.push("flagship-level");
  if (snapshot.ships.reduce((sum, ship) => sum + ship.level, 0) < definition.totalLevel) {
    failures.push("total-level");
  }
  if (!definition.shipGroups.every((group) => satisfiesShipGroup(snapshot.ships, group))) {
    failures.push("ship-composition");
  }
  if (
    definition.alternatives.some(
      (alternative) => !alternative.some((group) => satisfiesShipGroup(snapshot.ships, group))
    )
  ) {
    failures.push("ship-alternative");
  }

  const totals = {
    firepower: snapshot.ships.reduce((sum, ship) => sum + ship.firepower, 0),
    antiAir: snapshot.ships.reduce((sum, ship) => sum + ship.antiAir, 0),
    antiSubmarine: snapshot.ships.reduce((sum, ship) => sum + ship.antiSubmarine, 0),
    lineOfSight: snapshot.ships.reduce((sum, ship) => sum + ship.lineOfSight, 0),
  };
  if (
    totals.firepower < definition.statRequirements.firepower ||
    totals.antiAir < definition.statRequirements.antiAir ||
    totals.antiSubmarine < definition.statRequirements.antiSubmarine ||
    totals.lineOfSight < definition.statRequirements.lineOfSight
  ) {
    failures.push("fleet-stats");
  }

  if (definition.drumCanRequirement) {
    const drumCounts = snapshot.ships.map(
      (ship) => ship.slotItemMasterIds.filter((id) => id === DRUM_CAN_MASTER_ID).length
    );
    if (
      drumCounts.filter((count) => count > 0).length < definition.drumCanRequirement.equippedShips ||
      drumCounts.reduce((sum, count) => sum + count, 0) < definition.drumCanRequirement.totalItems
    ) {
      failures.push("drum-cans");
    }
  }

  return { ok: failures.length === 0, failures };
}

export function resolveExpedition(
  snapshot: ExpeditionRunSnapshot,
  definition: ExpeditionDefinition
): ExpeditionOutcome {
  const rng = new ExpeditionRng(snapshot.seed);
  const requirements = evaluateExpeditionRequirements(snapshot, definition);
  const fuelCosts = snapshot.ships.map((ship) => Math.ceil(ship.maxFuel * definition.costs.fuelRate));
  const ammoCosts = snapshot.ships.map((ship) => Math.ceil(ship.maxAmmo * definition.costs.ammoRate));
  // Expeditions require the fleet to be fully supplied when it departs.  It is
  // not sufficient to merely have enough fuel/ammo to pay the expedition cost.
  const supplied = snapshot.ships.every((ship) => ship.fuel >= ship.maxFuel && ship.ammo >= ship.maxAmmo);
  const success = requirements.ok && supplied;
  const greatSuccess = success && rollGreatSuccess(snapshot, definition, rng);
  const clearResult: 0 | 1 | 2 = success ? (greatSuccess ? 2 : 1) : 0;
  const materials = definition.rewards.materials.map((amount) =>
    expeditionResourceGain(amount, clearResult, snapshot)
  ) as [number, number, number, number];
  const items = clearResult === 0
    ? []
    : definition.rewards.items
      .map((reward) => {
        const count = rng.int(reward.maxCount + 1);
        return {
          itemId: reward.itemId,
          count,
          name: masterData.api_mst_useitem.find((item) => item.api_id === reward.itemId)?.api_name ?? "",
        };
      })
      .filter((item) => item.count > 0);
  const shipExp = definition.id === 32
    ? snapshot.ships.map((ship, index) => expedition32ShipExp(ship, snapshot, clearResult, index, rng))
    : snapshot.ships.map((_, index) => {
        // On failure each ship independently receives either the base or twice
        // the base XP.  Great success grants four times ship XP.
        const expMultiplier = clearResult === 2 ? 4 : clearResult === 0 && rng.next() < 0.5 ? 2 : 1;
        return Math.max(0, Math.floor(definition.rewards.shipExp * expMultiplier * (index === 0 ? 1.5 : 1)));
      });

  return {
    clearResult,
    memberExp: Math.floor(definition.rewards.admiralExp * (clearResult === 0 ? 0.3 : clearResult === 2 ? 2 : 1)),
    shipExp,
    materials,
    items,
    fuelCosts,
    ammoCosts,
    conditionCosts: snapshot.ships.map(() => 3),
    shipHps: combatExpeditionHps(snapshot, definition, rng),
  };
}

function snapshotShip(save: SaveState, ship: Ship): ExpeditionShipSnapshot {
  const master = masterData.api_mst_ship.find((item) => item.api_id === ship.masterId);
  const serialized = toShip(ship, save.slotItems);
  const slotItems = [...ship.slotIds, ship.exSlotId]
    .filter((id) => id > 0)
    .map((id) => save.slotItems.find((item) => item.id === id))
    .filter((item): item is NonNullable<typeof item> => item != null)
    .map((item) => ({ masterId: item.masterId, level: item.level }));
  const slotItemMasterIds = slotItems.map((item) => item.masterId);
  return {
    id: ship.id,
    masterId: ship.masterId,
    typeId: master?.api_stype ?? 0,
    level: ship.level,
    exp: ship.exp,
    hp: ship.hp,
    maxHp: ship.maxHp,
    condition: ship.condition,
    fuel: ship.fuel,
    maxFuel: ship.maxFuel,
    ammo: ship.ammo,
    maxAmmo: ship.maxAmmo,
    marriedAt: ship.marriedAt,
    slotItemMasterIds,
    slotItems,
    firepower: serialized.api_karyoku[0],
    antiAir: serialized.api_taiku[0],
    antiSubmarine: serialized.api_taisen[0],
    lineOfSight: serialized.api_sakuteki[0],
  };
}

function satisfiesShipGroup(ships: ExpeditionShipSnapshot[], group: ExpeditionShipGroup) {
  if (group.flagship) {
    return Boolean(ships[0] && group.typeIds.includes(ships[0].typeId));
  }
  return ships.filter((ship) => group.typeIds.includes(ship.typeId)).length >= group.count;
}

function rollGreatSuccess(
  snapshot: ExpeditionRunSnapshot,
  definition: ExpeditionDefinition,
  rng: ExpeditionRng
) {
  return rng.next() < expeditionGreatSuccessChance(snapshot, definition);
}

export function expeditionGreatSuccessChance(
  snapshot: ExpeditionRunSnapshot,
  definition: ExpeditionDefinition
) {
  if (definition.greatSuccessType === "support") return 0;
  const sparkled = snapshot.ships.filter((ship) => ship.condition >= 50).length;
  if (definition.greatSuccessType.includes("ドラム")) {
    const drums = snapshot.ships.reduce(
      (sum, ship) => sum + ship.slotItemMasterIds.filter((id) => id === DRUM_CAN_MASTER_ID).length,
      0
    );
    const overDrum = drums >= (OVER_DRUM_REQUIREMENTS.get(definition.id) ?? Number.POSITIVE_INFINITY);
    return Math.min(1, (15 * sparkled + (overDrum ? 41 : 6)) / 100);
  }
  if (definition.greatSuccessType.includes("旗艦")) {
    const flagshipLevel = snapshot.ships[0]?.level ?? 0;
    return Math.min(1, (15 * sparkled + 16 + Math.sqrt(flagshipLevel) + flagshipLevel / 10) / 100);
  }
  const allSparkled = snapshot.ships.length > 0 && sparkled === snapshot.ships.length;
  return allSparkled ? Math.min(1, (15 * sparkled + 21) / 100) : 0;
}

export function expeditionResourceGain(
  base: number,
  clearResult: 0 | 1 | 2,
  snapshot: ExpeditionRunSnapshot
) {
  if (clearResult === 0 || base <= 0) return 0;
  const greatSuccessMultiplier = clearResult === 2 ? 1.5 : 1;
  const equipment = snapshot.ships.flatMap((ship) => normalizedSnapshotSlotItems(ship));
  const positiveBonusEquipment = equipment.filter((item) => (LANDING_EQUIPMENT_BONUS.get(item.masterId) ?? 0) > 0);
  const equipmentBonus = equipment.reduce(
    (sum, item) => sum + (LANDING_EQUIPMENT_BONUS.get(item.masterId) ?? 0),
    snapshot.ships.filter((ship) => ship.masterId === KINU_KAI_NI_MASTER_ID).length * 0.05
  );
  const averageImprovement = positiveBonusEquipment.length === 0
    ? 0
    : positiveBonusEquipment.reduce((sum, item) => sum + Math.max(0, Math.min(10, item.level)), 0)
      / positiveBonusEquipment.length;
  const landingTerm = Math.min(0.2, equipmentBonus) * (1 + averageImprovement / 100);
  const daihatsuCount = equipment.filter((item) => item.masterId === DAIHATSU_MASTER_ID).length;
  const tokuCount = equipment.filter((item) => item.masterId === TOKU_DAIHATSU_MASTER_ID).length;
  const tokuTerm = tokuDaihatsuBonus(tokuCount, daihatsuCount);
  return Math.floor(base * greatSuccessMultiplier * (1 + landingTerm))
    + Math.floor(base * greatSuccessMultiplier * tokuTerm);
}

function normalizedSnapshotSlotItems(ship: ExpeditionShipSnapshot) {
  return Array.isArray(ship.slotItems)
    ? ship.slotItems
    : ship.slotItemMasterIds.map((masterId) => ({ masterId, level: 0 }));
}

function tokuDaihatsuBonus(tokuCount: number, daihatsuCount: number) {
  if (tokuCount <= 0) return 0;
  if (tokuCount === 1) return 0.02;
  if (tokuCount === 2) return 0.04;
  if (tokuCount === 3) return [0.05, 0.052, 0.054][Math.min(2, daihatsuCount)];
  return [0.054, 0.056, 0.058, 0.059, 0.06][Math.min(4, daihatsuCount)];
}

function expedition32ShipExp(
  ship: ExpeditionShipSnapshot,
  snapshot: ExpeditionRunSnapshot,
  clearResult: 0 | 1 | 2,
  index: number,
  rng: ExpeditionRng
) {
  const greatSuccessMultiplier = clearResult === 2 ? 2 : 1;
  const flagshipMultiplier = index === 0 ? 1.5 : 1;
  const randomMultiplier = rng.next() < 0.5 ? 1 : 2;
  const flagshipLevel = snapshot.ships[0]?.level ?? 0;
  const escortBonus = index === 0
    ? 0
    : Math.floor((flagshipLevel + 10 * Math.sqrt(flagshipLevel)) / 10) * 10;
  const levelMultiplier = ship.level < 10 ? 1.5
    : ship.level < 20 ? 1.25
      : ship.level < 30 ? 1.1
        : ship.level < 70 ? 1
          : 0.9;
  return Math.max(
    0,
    Math.floor((900 * greatSuccessMultiplier * flagshipMultiplier * randomMultiplier + escortBonus) * levelMultiplier)
  );
}

function combatExpeditionHps(
  snapshot: ExpeditionRunSnapshot,
  definition: ExpeditionDefinition,
  rng: ExpeditionRng
) {
  if (definition.damageType <= 0) return snapshot.ships.map((ship) => ship.hp);
  const maximumRate = definition.damageType === 1 ? 0.2 : 0.45;
  return snapshot.ships.map((ship) => {
    const damage = Math.floor(ship.maxHp * maximumRate * rng.next());
    return Math.max(1, ship.hp - damage);
  });
}

function deterministicSeed(now: number, deckId: number, missionId: number) {
  return Math.abs((now ^ (deckId * 1103515245) ^ (missionId * 2654435761)) | 0);
}

class ExpeditionRng {
  private state: number;

  constructor(seed: number) {
    this.state = seed >>> 0 || 1;
  }

  next() {
    let value = this.state;
    value ^= value << 13;
    value ^= value >>> 17;
    value ^= value << 5;
    this.state = value >>> 0;
    return this.state / 0x1_0000_0000;
  }

  int(maxExclusive: number) {
    return Math.floor(this.next() * Math.max(1, maxExclusive));
  }
}
