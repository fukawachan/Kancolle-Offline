import { createRequire } from "node:module";
import type { ShipMaster, SlotMaster } from "./catalog.js";
import { resolveEnemyStaticStat } from "./ship-stat-growth.js";

export type SortieRank = "S" | "A" | "B";
export type SortieBattleRank = SortieRank | "C";

export type EnemyUnitTemplate = {
  masterId: number;
  level: number;
  hp: number;
  shipType: number;
  firepower: number;
  torpedo: number;
  aa: number;
  armor: number;
  luck: number;
  accuracy?: number;
  evasion?: number;
  asw?: number;
  los?: number;
  statEvidence?: {
    evasion: "published" | "unavailable";
    asw: "published" | "unavailable";
    los: "published" | "unavailable";
  };
  range: number;
  slots: readonly number[];
  onSlot: readonly number[];
};

export type SortieEncounter = {
  key: string;
  shipIds: readonly number[];
  enemyCombinedShipIds?: readonly number[];
  formation: number;
  weight: number;
  baseExp?: number;
  evidence?: SortieEvidence;
};

export type SortieDropEntry = {
  shipId: number | null;
  shipName: string;
  shipType: string;
  /** Optional event/limited-drop ownership cap from a versioned source. */
  maxOwned?: number;
  rankWeights: readonly [number, number, number];
  totalWeight: number;
  enemyWeights: Record<string, readonly [number, number, number]>;
  evidence?: SortieEvidence & { observedAt?: readonly string[] };
};

export type SortieEvidence = {
  level: "exact" | "statistical" | "fallback";
  source: string;
  sampleSize: number;
};

export type SortieNodeData = {
  mapId: number;
  node: number;
  point: string;
  title: string;
  isBoss: boolean;
  combat: boolean;
  eventId: number;
  colorNo: number;
  encounters: readonly SortieEncounter[];
  dropPool: readonly SortieDropEntry[];
  baseExp?: number;
  /** Source observation window retained from the frozen community sample. */
  observedAt: readonly string[];
  evidence?: SortieEvidence & { observedAt?: readonly string[] };
};

export type SelectedSortieEncounter = {
  areaId: number;
  mapNo: number;
  mapId: number;
  node: number;
  point: string;
  isBoss: boolean;
  enemyFleetKey: string;
  shipIds: readonly number[];
  enemyCombinedShipIds: readonly number[];
  formation: number;
  baseExp?: number;
  observedAt: readonly string[];
};

export type SelectedSortieDrop = {
  shipId: number | null;
  shipName: string;
  shipType: string;
  maxOwned?: number;
};

type GeneratedPoint = Omit<SortieNodeData, "node"> & {
  nodeNos: number[];
  observedAt: string[];
};

type GeneratedSortieData = {
  maps: {
    mapId: number;
    points: GeneratedPoint[];
  }[];
  enemyTemplates: Record<string, EnemyUnitTemplate>;
  enemyShips: ShipMaster[];
  enemySlots: SlotMaster[];
};

const require = createRequire(import.meta.url);
const GENERATED = require("./sortie-data.generated.json") as GeneratedSortieData;

export const ENEMY_UNIT_TEMPLATES = Object.fromEntries(
  Object.entries(GENERATED.enemyTemplates).map(([id, template]) => {
    const masterId = Number(id);
    const evasion = resolveEnemyStaticStat(masterId, "evasion");
    const asw = resolveEnemyStaticStat(masterId, "asw");
    const los = resolveEnemyStaticStat(masterId, "los");
    return [masterId, {
      ...template,
      ...(evasion.ok ? { evasion: evasion.value } : {}),
      ...(asw.ok ? { asw: asw.value } : {}),
      ...(los.ok ? { los: los.value } : {}),
      statEvidence: {
        evasion: evasion.ok ? "published" : "unavailable",
        asw: asw.ok ? "published" : "unavailable",
        los: los.ok ? "published" : "unavailable"
      }
    } satisfies EnemyUnitTemplate];
  })
) as Record<number, EnemyUnitTemplate>;
export const DEEP_SEA_SHIP_MASTERS = GENERATED.enemyShips;
export const DEEP_SEA_SLOT_MASTERS = GENERATED.enemySlots;

const SORTIE_NODES: readonly SortieNodeData[] = GENERATED.maps.flatMap((map) =>
  map.points.flatMap(({ nodeNos, ...point }) =>
    nodeNos.map((node) => ({
      ...point,
      mapId: map.mapId,
      node
    }))
  )
);

const SORTIE_NODE_BY_MAP_AND_NODE = new Map(
  SORTIE_NODES.map((node) => [sortieNodeKey(node.mapId, node.node), node] as const)
);

for (const node of SORTIE_NODES) {
  for (const encounter of node.encounters) validateEnemyFleetSplit(encounter, `${node.mapId}:${node.point}`);
}

const SORTIE_POINT_BASE_EXP = new Map<string, number>([
  ["35:B", 300]
]);

export function sortieMapId(areaId: number, mapNo: number) {
  return Math.trunc(areaId) * 10 + Math.trunc(mapNo);
}

export function sortieNodeData(areaId: number, mapNo: number, nodeNo: number) {
  return SORTIE_NODE_BY_MAP_AND_NODE.get(sortieNodeKey(sortieMapId(areaId, mapNo), nodeNo));
}

export function sortieBossNodeNo(areaId: number, mapNo: number) {
  return SORTIE_NODES.find((node) => node.mapId === sortieMapId(areaId, mapNo) && node.isBoss)?.node;
}

export function sortieNodes() {
  return SORTIE_NODES;
}

export function selectSortieEncounter(
  areaId: number,
  mapNo: number,
  nodeNo: number,
  seed: number
): SelectedSortieEncounter | undefined {
  const node = sortieNodeData(areaId, mapNo, nodeNo);
  if (!node || !node.combat || node.encounters.length === 0) return undefined;
  const encounter = weightedPick(node.encounters, (item) => item.weight, seed) ?? node.encounters[0];
  return {
    areaId,
    mapNo,
    mapId: node.mapId,
    node: node.node,
    point: node.point,
    isBoss: node.isBoss,
    enemyFleetKey: encounter.key,
    shipIds: encounter.shipIds,
    enemyCombinedShipIds: encounter.enemyCombinedShipIds ?? [],
    formation: encounter.formation,
    baseExp: encounter.baseExp ?? node.baseExp ?? SORTIE_POINT_BASE_EXP.get(sortiePointKey(node.mapId, node.point)),
    observedAt: node.observedAt
  };
}

export function selectSortieDrop(input: {
  mapId: number;
  node: number;
  rank: SortieBattleRank;
  seed: number;
  enemyFleetKey?: string;
}): SelectedSortieDrop | null {
  if (input.rank === "C") return null;
  const node = SORTIE_NODE_BY_MAP_AND_NODE.get(sortieNodeKey(input.mapId, input.node));
  if (!node || node.dropPool.length === 0) return null;
  const rankIndex = rankWeightIndex(input.rank);
  const picked = weightedPick(
    node.dropPool,
    (entry) => dropWeight(entry, rankIndex, input.enemyFleetKey),
    input.seed
  );
  if (!picked || picked.shipId == null) return null;
  return {
    shipId: picked.shipId,
    shipName: picked.shipName,
    shipType: picked.shipType,
    ...(picked.maxOwned == null ? {} : { maxOwned: Math.max(0, Math.trunc(picked.maxOwned)) })
  };
}

export function fallbackEnemyShipIds(nodeNo: number) {
  if (nodeNo <= 1) return [1501];
  if (nodeNo === 2) return [1501, 1501];
  return [1505, 1502, 1502];
}

function sortieNodeKey(mapId: number, nodeNo: number) {
  return String(mapId) + ":" + String(nodeNo);
}

function sortiePointKey(mapId: number, point: string) {
  return String(mapId) + ":" + point;
}

function dropWeight(entry: SortieDropEntry, rankIndex: number, enemyFleetKey: string | undefined) {
  if (enemyFleetKey) return Math.max(0, entry.enemyWeights[enemyFleetKey]?.[rankIndex] ?? 0);
  return Math.max(0, entry.rankWeights[rankIndex] ?? 0);
}

function rankWeightIndex(rank: SortieRank) {
  return rank === "S" ? 0 : rank === "A" ? 1 : 2;
}

function weightedPick<T>(items: readonly T[], weightFor: (item: T) => number, seed: number) {
  const total = items.reduce((sum, item) => sum + Math.max(0, Math.trunc(weightFor(item))), 0);
  if (total <= 0) return undefined;
  let roll = positiveModulo(Math.trunc(seed), total);
  for (const item of items) {
    const weight = Math.max(0, Math.trunc(weightFor(item)));
    if (weight <= 0) continue;
    if (roll < weight) return item;
    roll -= weight;
  }
  return undefined;
}

function positiveModulo(value: number, modulus: number) {
  return ((value % modulus) + modulus) % modulus;
}

function validateEnemyFleetSplit(encounter: SortieEncounter, evidence: string) {
  const mainCount = encounter.shipIds.length;
  const escortCount = encounter.enemyCombinedShipIds?.length ?? 0;
  if (mainCount < 1 || mainCount > 6 || escortCount > 6) {
    throw new Error(`Invalid enemy fleet split ${mainCount}+${escortCount} at ${evidence} (${encounter.key})`);
  }
}
