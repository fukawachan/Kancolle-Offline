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

const DRUM_CAN_MASTER_ID = 75;
const DAIHATSU_BONUS = new Map<number, number>([
  [68, 0.05],
  [166, 0.02],
  [167, 0.01],
  [193, 0.05],
  [230, 0.02],
  [436, 0.02],
  [449, 0.02],
  [482, 0.02],
  [494, 0.02],
  [495, 0.02],
  [514, 0.02],
  [525, 0.01],
  [526, 0.01],
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
  const supplied = snapshot.ships.every(
    (ship, index) => ship.fuel >= fuelCosts[index] && ship.ammo >= ammoCosts[index]
  );
  const success = requirements.ok && supplied;
  const greatSuccess = success && rollGreatSuccess(snapshot, definition, rng);
  const clearResult: 0 | 1 | 2 = success ? (greatSuccess ? 2 : 1) : 0;
  const rewardMultiplier = clearResult === 2 ? 1.5 : clearResult === 1 ? 1 : 0;
  const transportMultiplier = 1 + daihatsuBonus(snapshot);
  const materials = definition.rewards.materials.map((amount) =>
    Math.floor(amount * rewardMultiplier * transportMultiplier)
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
  const expMultiplier = clearResult === 0 ? 0.3 : clearResult === 2 ? 2 : 1;
  const shipExp = snapshot.ships.map((_, index) =>
    Math.max(0, Math.floor(definition.rewards.shipExp * expMultiplier * (index === 0 ? 1.5 : 1)))
  );

  return {
    clearResult,
    memberExp: Math.floor(definition.rewards.admiralExp * (clearResult === 0 ? 0.3 : 1)),
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
  const slotItemMasterIds = [...ship.slotIds, ship.exSlotId]
    .filter((id) => id > 0)
    .map((id) => save.slotItems.find((item) => item.id === id)?.masterId ?? 0)
    .filter((id) => id > 0);
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
  if (snapshot.ships.length === 6 && snapshot.ships.every((ship) => ship.condition >= 50)) return true;
  const sparkled = snapshot.ships.filter((ship) => ship.condition >= 50).length;
  const drumShips = snapshot.ships.filter((ship) =>
    ship.slotItemMasterIds.includes(DRUM_CAN_MASTER_ID)
  ).length;
  const chance = definition.greatSuccessType.includes("ドラム")
    ? Math.min(0.95, 0.05 + sparkled * 0.12 + drumShips * 0.04)
    : Math.min(0.95, 0.05 + sparkled * 0.15);
  return rng.next() < chance;
}

function daihatsuBonus(snapshot: ExpeditionRunSnapshot) {
  const bonus = snapshot.ships
    .flatMap((ship) => ship.slotItemMasterIds)
    .reduce((sum, masterId) => sum + (DAIHATSU_BONUS.get(masterId) ?? 0), 0);
  return Math.min(0.2, bonus);
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
