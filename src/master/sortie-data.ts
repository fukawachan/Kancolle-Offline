import { createRequire } from "node:module";
import type { ShipMaster, SlotMaster } from "./catalog.js";

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
  range: number;
  slots: readonly number[];
  onSlot: readonly number[];
};

export type SortieEncounter = {
  key: string;
  shipIds: readonly number[];
  formation: number;
  weight: number;
};

export type SortieDropEntry = {
  shipId: number | null;
  shipName: string;
  shipType: string;
  rankWeights: readonly [number, number, number];
  totalWeight: number;
  enemyWeights: Record<string, readonly [number, number, number]>;
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
  formation: number;
};

export type SelectedSortieDrop = {
  shipId: number | null;
  shipName: string;
  shipType: string;
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

export const ENEMY_UNIT_TEMPLATES = GENERATED.enemyTemplates as Record<number, EnemyUnitTemplate>;
export const DEEP_SEA_SHIP_MASTERS = GENERATED.enemyShips;
export const DEEP_SEA_SLOT_MASTERS = GENERATED.enemySlots;

const SORTIE_NODES: readonly SortieNodeData[] = GENERATED.maps.flatMap((map) =>
  map.points.flatMap(({ nodeNos, observedAt: _observedAt, ...point }) =>
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
    formation: encounter.formation
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
    shipType: picked.shipType
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
