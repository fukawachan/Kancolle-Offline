import { createRequire } from "node:module";
import { mapMasterId } from "./data.js";
import type { MapPhaseDefinition } from "./map-progress.js";
import type { RoutingMap } from "./routing.js";
import { EXPEDITION_MASTERS, type ExpeditionDefinition, type ExpeditionMaster } from "./expedition-data.js";
import type {
  SelectedSortieDrop,
  SelectedSortieEncounter,
  SortieBattleRank,
  SortieDropEntry,
  SortieEncounter,
  SortieNodeData
} from "./sortie-data.js";
import type { Materials } from "../state/types.js";
import type { ResourceManifest } from "../resources/types.js";

export type EventReward =
  | { kind: "useitem"; id: number; count: number }
  | { kind: "material"; material: keyof Materials; count: number };

export type EventRankDefinition = {
  maxMapHp: number;
  rewards: readonly EventReward[];
};

export type EventPackageKind = "versioned-event" | "synthetic-debug";

export type EventPhaseDefinition = Omit<MapPhaseDefinition, "required"> & {
  required?: number;
  requiredByRank?: Readonly<Record<string, number>>;
};

export type EventNodeDefinition = {
  node: number;
  point: string;
  combat: boolean;
  boss?: boolean;
  eventId: number;
  colorNo: number;
  encounters?: readonly SortieEncounter[];
  dropPool?: readonly SortieDropEntry[];
  observedAt?: readonly string[];
};

export type EventMapDefinition = {
  id: number;
  areaId: number;
  mapNo: number;
  name: string;
  operation: string;
  infoText: string;
  level: number;
  sallyFlag: readonly [number, number, number];
  sallyArea: number;
  airBaseDecks: number;
  unlock?: {
    clearedMapIds: readonly number[];
  };
  bgm: {
    moving: number;
    map: readonly [number, number];
    boss: readonly [number, number];
  };
  phaseBreakpoints: readonly number[];
  phases?: readonly EventPhaseDefinition[];
  ranks: Record<string, EventRankDefinition>;
  nodes: readonly EventNodeDefinition[];
};

export type EventDefinition = {
  areaId: number;
  name: string;
  supportExpeditions?: readonly EventSupportExpeditionDefinition[];
  maps: readonly EventMapDefinition[];
};

export type EventSupportExpeditionDefinition = {
  master: ExpeditionMaster;
  definition: ExpeditionDefinition;
};

export type EventCandidateStatus = {
  areaId: number;
  name: string;
  cacheComplete: boolean;
  packageComplete: boolean;
  activatable: boolean;
  active: boolean;
  cacheMaps: number[];
  hasEventPack: boolean;
  packageId: string;
  packageKind: EventPackageKind;
  productionEligible: boolean;
  maps: {
    id: number;
    areaId: number;
    mapNo: number;
    name: string;
    hasThumbnail: boolean;
    hasImage: boolean;
    hasInfo: boolean;
    hasSpots: boolean;
  }[];
};

type GeneratedEventData = {
  schemaVersion: number;
  packageId: string;
  packageKind: EventPackageKind;
  generatedAt: string;
  evidence: {
    level: string;
    checkedAt: string;
    detail: string;
  };
  sources: Record<string, string>;
  events: EventDefinition[];
};

const require = createRequire(import.meta.url);
const GENERATED = require("./event-data.generated.json") as GeneratedEventData;
if (GENERATED.schemaVersion !== 1) {
  throw new Error(`Unsupported event package schema ${GENERATED.schemaVersion}`);
}
export const EVENT_PACKAGE_ID = GENERATED.packageId;
export const EVENT_PACKAGE_KIND = GENERATED.packageKind;
export const EVENT_PACKAGE_PRODUCTION_ELIGIBLE = EVENT_PACKAGE_KIND === "versioned-event";
const EVENTS = GENERATED.events;
const EVENT_BY_AREA_ID = new Map(EVENTS.map((event) => [event.areaId, event] as const));
const EVENT_MAP_BY_ID = new Map(EVENTS.flatMap((event) => event.maps.map((map) => [map.id, map] as const)));
const EVENT_MAP_BY_AREA_AND_NO = new Map(EVENTS.flatMap((event) =>
  event.maps.map((map) => [eventMapKey(map.areaId, map.mapNo), map] as const)
));
const EVENT_ROUTING_MAPS = new Map(EVENTS.flatMap((event) =>
  event.maps.map((map) => [map.id, buildRoutingMap(map)] as const)
));
const EVENT_SORTIE_NODE_BY_MAP_AND_NODE = new Map(EVENTS.flatMap((event) =>
  event.maps.flatMap((map) => map.nodes.map((node) => [eventNodeKey(map.id, node.node), toSortieNode(map, node)] as const))
));
const EVENT_SUPPORT_EXPEDITIONS = EVENTS.flatMap((event) => event.supportExpeditions ?? []);
const EVENT_SUPPORT_MASTER_BY_ID = new Map(EVENT_SUPPORT_EXPEDITIONS.map((support) => [support.master.api_id, support.master] as const));
const EVENT_SUPPORT_DEFINITION_BY_ID = new Map(EVENT_SUPPORT_EXPEDITIONS.map((support) => [support.definition.id, support.definition] as const));

export function eventDefinitions() {
  return EVENTS;
}

export function eventDefinition(areaId: number) {
  return EVENT_BY_AREA_ID.get(Math.trunc(areaId));
}

export function eventMapDefinition(areaId: number, mapNo: number) {
  return EVENT_MAP_BY_AREA_AND_NO.get(eventMapKey(areaId, mapNo));
}

export function eventMapById(mapId: number) {
  return EVENT_MAP_BY_ID.get(Math.trunc(mapId));
}

export function eventMapIds(areaId?: number) {
  const maps = areaId == null ? [...EVENT_MAP_BY_ID.values()] : eventDefinition(areaId)?.maps ?? [];
  return new Set(maps.map((map) => map.id));
}

export function eventAreaIds() {
  return new Set(EVENTS.map((event) => event.areaId));
}

export function eventSupportExpeditionMasters(areaId?: number) {
  return eventSupportExpeditions(areaId).map((support) => support.master);
}

export function eventSupportExpeditionDefinitions(areaId?: number) {
  return eventSupportExpeditions(areaId).map((support) => support.definition);
}

export function eventSupportExpeditionMaster(id: number) {
  return EVENT_SUPPORT_MASTER_BY_ID.get(Math.trunc(id));
}

export function eventSupportExpeditionDefinition(id: number) {
  return EVENT_SUPPORT_DEFINITION_BY_ID.get(Math.trunc(id));
}

function eventSupportExpeditions(areaId?: number) {
  return areaId == null
    ? EVENT_SUPPORT_EXPEDITIONS
    : eventDefinition(areaId)?.supportExpeditions ?? [];
}

export function eventMapMaster(map: EventMapDefinition) {
  return {
    api_id: map.id,
    api_maparea_id: map.areaId,
    api_no: map.mapNo,
    api_name: map.name,
    api_level: map.level,
    api_opetext: map.operation,
    api_infotext: map.infoText,
    api_item: [0, 0, 0, 0],
    api_max_maphp: null,
    api_required_defeat_count: eventRankDefinition(map, 3).maxMapHp,
    api_sally_flag: [...map.sallyFlag]
  };
}

export function eventMapMasters(areaId: number, resourceManifest?: ResourceManifest) {
  const event = eventDefinition(areaId);
  if (!event) return [];
  return event.maps
    .filter((map) => !resourceManifest || eventMapCacheStatus(resourceManifest, map).complete)
    .map(eventMapMaster);
}

export function eventMapBgmMaster(map: EventMapDefinition) {
  return {
    api_id: map.id,
    api_maparea_id: map.areaId,
    api_no: map.mapNo,
    api_moving_bgm: map.bgm.moving,
    api_map_bgm: [...map.bgm.map],
    api_boss_bgm: [...map.bgm.boss]
  };
}

export function eventMapCellColor(areaId: number, mapNo: number, cellNo: number) {
  return eventSortieNodeData(areaId, mapNo, cellNo)?.colorNo
    ?? eventRoutingNodeData(areaId, mapNo, cellNo)?.colorNo;
}

export function eventRoutingMap(areaId: number, mapNo: number) {
  return EVENT_ROUTING_MAPS.get(mapMasterId(areaId, mapNo));
}

export function eventRoutingNodeData(areaId: number, mapNo: number, cellNo: number) {
  const map = eventRoutingMap(areaId, mapNo);
  const point = map?.edges.find((edge) => edge.no === Math.trunc(cellNo))?.to;
  return point ? map?.nodes?.[point] : undefined;
}

export function eventSortieNodeData(areaId: number, mapNo: number, nodeNo: number) {
  return EVENT_SORTIE_NODE_BY_MAP_AND_NODE.get(eventNodeKey(mapMasterId(areaId, mapNo), nodeNo));
}

export function eventBossNodeNo(areaId: number, mapNo: number) {
  const map = eventMapDefinition(areaId, mapNo);
  return map?.nodes.find((node) => node.boss)?.node;
}

export function selectEventSortieEncounter(
  areaId: number,
  mapNo: number,
  nodeNo: number,
  seed: number
): SelectedSortieEncounter | undefined {
  const node = eventSortieNodeData(areaId, mapNo, nodeNo);
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
    baseExp: encounter.baseExp ?? node.baseExp,
    observedAt: node.observedAt
  };
}

export function selectEventSortieDrop(input: {
  mapId: number;
  node: number;
  rank: SortieBattleRank;
  seed: number;
  enemyFleetKey?: string;
}): SelectedSortieDrop | null {
  if (input.rank === "C") return null;
  const node = EVENT_SORTIE_NODE_BY_MAP_AND_NODE.get(eventNodeKey(input.mapId, input.node));
  if (!node || node.dropPool.length === 0) return null;
  const rankIndex = input.rank === "S" ? 0 : input.rank === "A" ? 1 : 2;
  const picked = weightedPick(
    node.dropPool,
    (entry) => Math.max(0, entry.enemyWeights[input.enemyFleetKey ?? ""]?.[rankIndex] ?? entry.rankWeights[rankIndex] ?? 0),
    input.seed
  );
  if (!picked?.shipId) return null;
  return {
    shipId: picked.shipId,
    shipName: picked.shipName,
    shipType: picked.shipType,
    ...(picked.maxOwned == null ? {} : { maxOwned: Math.max(0, Math.trunc(picked.maxOwned)) })
  };
}

export function eventRankDefinition(map: EventMapDefinition, rank: number) {
  const normalizedRank = String(Math.max(1, Math.min(4, Math.trunc(rank) || 3)));
  return map.ranks[normalizedRank] ?? map.ranks["3"] ?? Object.values(map.ranks)[0];
}

export function eventInitialMapGauge(mapId: number, rank: number) {
  const map = eventMapById(mapId);
  return map ? eventRankDefinition(map, rank).maxMapHp : 1;
}

export function eventMapPhaseDefinitions(mapId: number, rank: number): readonly MapPhaseDefinition[] | undefined {
  const map = eventMapById(mapId);
  if (!map) return undefined;
  if (map.phases && map.phases.length > 0) {
    const normalizedRank = String(Math.max(1, Math.min(4, Math.trunc(rank) || 3)));
    return map.phases.map((phase) => ({
      ...phase,
      required: Math.max(1, Math.trunc(
        phase.requiredByRank?.[normalizedRank]
          ?? phase.requiredByRank?.["3"]
          ?? phase.required
          ?? 1
      ))
    }));
  }
  const hp = eventRankDefinition(map, rank).maxMapHp;
  const boss = map.nodes.find((node) => node.boss);
  if (!boss) return undefined;
  return [{
    id: "boss",
    point: boss.point,
    required: hp,
    condition: "sink",
    gaugeNo: 1,
    gaugeType: "hp"
  }];
}

export function eventTerminalMapPhase(mapId: number) {
  const map = eventMapById(mapId);
  return map ? Math.max(1, (map.phases?.length ?? 1) + 1) : 1;
}

export function eventMapUnlockPrerequisites(mapId: number) {
  return eventMapById(mapId)?.unlock?.clearedMapIds ?? [];
}

export function eventMapClearRewards(mapId: number, rank: number) {
  const map = eventMapById(mapId);
  return map ? eventRankDefinition(map, rank).rewards : [];
}

export function eventResourceStatus(
  resourceManifest: ResourceManifest,
  activeAreaId: number | null = null,
  options: { allowSynthetic?: boolean } = {}
) {
  return EVENTS.map((event): EventCandidateStatus => {
    const maps = event.maps.map((map) => {
      const status = eventMapCacheStatus(resourceManifest, map);
      return {
        id: map.id,
        areaId: map.areaId,
        mapNo: map.mapNo,
        name: map.name,
        hasThumbnail: status.hasThumbnail,
        hasImage: status.hasImage,
        hasInfo: status.hasInfo,
        hasSpots: status.hasSpots
      };
    });
    const cacheComplete = maps.every((map) => map.hasThumbnail && map.hasImage && map.hasInfo && map.hasSpots);
    const packageComplete = event.maps.length > 0 && event.maps.every((map) => map.nodes.some((node) => node.boss));
    const productionEligible = EVENT_PACKAGE_PRODUCTION_ELIGIBLE;
    return {
      areaId: event.areaId,
      name: event.name,
      cacheComplete,
      packageComplete,
      activatable: cacheComplete && packageComplete && (productionEligible || options.allowSynthetic === true),
      active: activeAreaId === event.areaId,
      cacheMaps: maps.filter((map) => map.hasThumbnail && map.hasImage && map.hasInfo && map.hasSpots).map((map) => map.mapNo),
      hasEventPack: packageComplete,
      packageId: EVENT_PACKAGE_ID,
      packageKind: EVENT_PACKAGE_KIND,
      productionEligible,
      maps
    };
  });
}

export function validateEventPackage(
  areaId: number,
  resourceManifest?: ResourceManifest,
  options: { allowSynthetic?: boolean } = {}
) {
  const event = eventDefinition(areaId);
  if (!event) return { ok: false as const, error: `Event area ${areaId} has no local event package` };
  if (!EVENT_PACKAGE_PRODUCTION_ELIGIBLE && options.allowSynthetic !== true) {
    return {
      ok: false as const,
      error: `Event package ${EVENT_PACKAGE_ID} is synthetic debug data and requires explicit opt-in`
    };
  }
  if (resourceManifest) {
    const missing = event.maps.flatMap((map) => {
      const status = eventMapCacheStatus(resourceManifest, map);
      return status.complete ? [] : [`${map.areaId}-${map.mapNo}`];
    });
    if (missing.length > 0) {
      return { ok: false as const, error: `Event area ${areaId} has incomplete cache resources: ${missing.join(", ")}` };
    }
  }
  for (const map of event.maps) {
    if (EVENT_PACKAGE_PRODUCTION_ELIGIBLE && (!map.phases || map.phases.length === 0)) {
      return { ok: false as const, error: `Event map ${map.id} has no versioned phase definitions` };
    }
    for (const prerequisiteId of map.unlock?.clearedMapIds ?? []) {
      if (!event.maps.some((candidate) => candidate.id === prerequisiteId)) {
        return { ok: false as const, error: `Event map ${map.id} has unknown unlock prerequisite ${prerequisiteId}` };
      }
    }
    if (!map.nodes.some((node) => node.boss)) return { ok: false as const, error: `Event map ${map.id} has no boss node` };
    const routing = eventRoutingMap(map.areaId, map.mapNo);
    if (!routing) return { ok: false as const, error: `Event map ${map.id} has no routing graph` };
    for (const node of map.nodes) {
      if (!routing.edges.some((edge) => edge.no === node.node)) {
        return { ok: false as const, error: `Event map ${map.id} node ${node.node} is not reachable by routing graph` };
      }
      for (const encounter of node.encounters ?? []) {
        if (encounter.shipIds.length === 0) {
          return { ok: false as const, error: `Event map ${map.id} node ${node.node} has an empty enemy formation` };
        }
        if (encounter.shipIds.length > 6 || (encounter.enemyCombinedShipIds?.length ?? 0) > 6) {
          return {
            ok: false as const,
            error: `Event map ${map.id} node ${node.node} has an invalid enemy main/escort split`
          };
        }
      }
    }
  }
  const supportMissionIds = new Set<number>();
  const normalMissionIds = new Set(EXPEDITION_MASTERS.map((mission) => mission.api_id));
  for (const support of event.supportExpeditions ?? []) {
    const master = support.master;
    const definition = support.definition;
    if (normalMissionIds.has(master.api_id)) {
      return { ok: false as const, error: `Event support expedition ${master.api_id} conflicts with a normal expedition` };
    }
    if (master.api_id !== definition.id) {
      return { ok: false as const, error: `Event support expedition ${master.api_id} has mismatched definition ${definition.id}` };
    }
    if (master.api_maparea_id !== event.areaId || definition.areaId !== event.areaId) {
      return { ok: false as const, error: `Event support expedition ${master.api_id} has mismatched area` };
    }
    if (supportMissionIds.has(master.api_id)) {
      return { ok: false as const, error: `Event support expedition ${master.api_id} is duplicated` };
    }
    supportMissionIds.add(master.api_id);
    if (!definition.supportType || definition.returnAllowed || master.api_return_flag !== 0) {
      return { ok: false as const, error: `Event support expedition ${master.api_id} has invalid support flags` };
    }
    if (definition.rewards.materials.some((amount) => amount !== 0) || definition.rewards.items.length > 0) {
      return { ok: false as const, error: `Event support expedition ${master.api_id} must not grant rewards` };
    }
  }
  return { ok: true as const, event };
}

function buildRoutingMap(map: EventMapDefinition): RoutingMap {
  const nodes = [...map.nodes].sort((left, right) => left.node - right.node);
  const edges = nodes.map((node, index) => ({
    no: node.node,
    from: index === 0 ? "Start" : nodes[index - 1].point,
    to: node.point
  }));
  const branches = Object.fromEntries(edges.map((edge) => [edge.from, [{ to: edge.to, source: `event-${map.id}` }]]));
  return {
    mapId: map.id,
    revision: 1,
    edges,
    nodes: Object.fromEntries(nodes.map((node) => [node.point, {
      combat: node.combat,
      eventId: node.eventId,
      eventKind: node.combat ? 1 : 0,
      colorNo: node.colorNo
    }])),
    branches
  };
}

function toSortieNode(map: EventMapDefinition, node: EventNodeDefinition): SortieNodeData {
  return {
    mapId: map.id,
    node: node.node,
    point: node.point,
    title: `${map.name} ${node.point}`,
    isBoss: node.boss === true,
    combat: node.combat,
    eventId: node.eventId,
    colorNo: node.colorNo,
    encounters: node.encounters ?? [],
    dropPool: node.dropPool ?? [],
    observedAt: node.observedAt ?? []
  };
}

function eventMapCacheStatus(resourceManifest: ResourceManifest, map: EventMapDefinition) {
  const hasThumbnail = resourceManifest.map.thumbnail.has(map.id);
  const hasImage = resourceManifest.map.image.has(map.id);
  const hasInfo = resourceManifest.map.info.has(map.id);
  const spots = resourceManifest.map.spots.get(map.id) ?? [];
  return {
    hasThumbnail,
    hasImage,
    hasInfo,
    hasSpots: map.nodes.every((node) => spots.some((spot) => spot.no === node.node)),
    complete: hasThumbnail && hasImage && hasInfo && map.nodes.every((node) => spots.some((spot) => spot.no === node.node))
  };
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

function eventMapKey(areaId: number, mapNo: number) {
  return String(Math.trunc(areaId)) + ":" + String(Math.trunc(mapNo));
}

function eventNodeKey(mapId: number, nodeNo: number) {
  return String(Math.trunc(mapId)) + ":" + String(Math.trunc(nodeNo));
}
