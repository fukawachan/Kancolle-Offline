import { masterData } from "../master/data.js";
import { EQUIP_TYPES, SHIPS, SLOT_ITEMS, SHIP_TYPES } from "../master/generated-data.js";
import { EXPEDITION_MASTERS } from "../master/expedition-data.js";
import {
  eventDefinition,
  eventResourceStatus,
  validateEventPackage
} from "../master/event-data.js";
import { apiError, apiOk } from "../kcsapi/envelope.js";
import { toShip, toSlotItem } from "../kcsapi/serializers.js";
import type { ResourceManifest } from "../resources/types.js";
import type { StateStore } from "../state/store.js";

// Slim summary types returned to the frontend
export type ShipMasterSummary = {
  id: number;
  name: string;
  yomi: string;
  stype: number;
  stypeName: string;
};

export type SlotItemMasterSummary = {
  id: number;
  name: string;
  yomi: string;
  type: number;
  typeName: string;
};

export type UseItemSummary = {
  id: number;
  name: string;
  description: string;
  count: number;
};

export type BasicMaterialSummary = {
  fuel: number;
  ammo: number;
  steel: number;
  bauxite: number;
};

export type MasterListQuery = {
  search?: string;
  limit?: number | string;
  offset?: number | string;
  stype?: number | string;
  type?: number | string;
};

export function handleEventStatus(stateStore: StateStore, resourceManifest: ResourceManifest) {
  const activeAreaId = stateStore.hasAccount() ? stateStore.getActiveEventAreaId() : null;
  return apiOk({
    activeAreaId,
    candidates: eventResourceStatus(resourceManifest, activeAreaId)
  });
}

export function handleEventActivation(
  params: { areaId?: unknown },
  stateStore: StateStore,
  resourceManifest: ResourceManifest
) {
  const rawAreaId = params.areaId;
  if (rawAreaId == null || rawAreaId === "" || Number(rawAreaId) <= 0) {
    const result = stateStore.setActiveEventArea(null);
    return result.ok
      ? apiOk({ activeAreaId: null, candidates: eventResourceStatus(resourceManifest, null), message: "Event disabled" })
      : apiError(result.error, 400);
  }

  const areaId = Math.trunc(Number(rawAreaId));
  const validation = validateEventPackage(areaId, resourceManifest);
  if (!validation.ok) return apiError(validation.error, 400);
  if (!eventDefinition(areaId)) return apiError(`Unknown event area ${areaId}`, 404);
  const result = stateStore.setActiveEventArea(areaId);
  if (!result.ok) return apiError(result.error, 400);
  return apiOk({
    activeAreaId: result.activeAreaId,
    event: result.event ? { areaId: result.event.areaId, name: result.event.name, mapCount: result.event.maps.length } : null,
    candidates: eventResourceStatus(resourceManifest, result.activeAreaId),
    message: `Event area ${result.activeAreaId} enabled`
  });
}

export function handleEventReset(params: { areaId?: unknown }, stateStore: StateStore) {
  const areaId = Math.trunc(Number(params.areaId));
  if (!Number.isFinite(areaId) || areaId <= 0) return apiError("Invalid areaId", 400);
  const result = stateStore.resetEventProgress(areaId);
  if (!result.ok) return apiError(result.error, 400);
  return apiOk({
    areaId,
    activeAreaId: result.activeAreaId,
    resetMaps: result.maps.map((map) => map.id),
    maps: result.maps,
    message: `Event area ${areaId} progress reset`
  });
}

// Build a lookup for ship type names
const shipTypeNameMap: Map<number, string> = new Map(
  SHIP_TYPES.map((t) => [t.api_id, t.api_name])
);
const equipTypeNameMap: Map<number, string> = new Map(
  EQUIP_TYPES.map((t) => [t.api_id, t.api_name])
);

// Build lookup maps for fast master validation
const shipMasterById = new Map(SHIPS.map((s) => [s.api_id, s] as const));
const slotItemMasterById = new Map(SLOT_ITEMS.map((s) => [s.api_id, s] as const));
const resourcePseudoUseItemIds = new Set([31, 32, 33, 34]);
const commonUseItemIds = [58, 78, 65, 74, 75, 77, 92, 94, 70, 73, 64, 67, 66, 54, 59, 52, 55];

export function handleListShipMasters(query: MasterListQuery) {
  const search = (query.search ?? "").toLowerCase().trim();
  const limit = Math.max(1, Math.min(100, Number(query.limit) || 20));
  const offset = Math.max(0, Number(query.offset) || 0);
  const stype = positiveIntegerFilter(query.stype);

  let filtered = SHIPS;
  if (stype != null) {
    filtered = filtered.filter((s) => s.api_stype === stype);
  }
  if (search) {
    filtered = filtered.filter(
      (s) =>
        s.api_name.toLowerCase().includes(search) ||
        s.api_yomi.toLowerCase().includes(search)
    );
  }

  const total = filtered.length;
  const page = filtered.slice(offset, offset + limit);
  const items: ShipMasterSummary[] = page.map((s) => ({
    id: s.api_id,
    name: s.api_name,
    yomi: s.api_yomi,
    stype: s.api_stype,
    stypeName: shipTypeNameMap.get(s.api_stype) ?? `Type ${s.api_stype}`,
  }));

  return apiOk({ items, total, limit, offset });
}

export function handleListSlotItemMasters(query: MasterListQuery) {
  const search = (query.search ?? "").toLowerCase().trim();
  const limit = Math.max(1, Math.min(100, Number(query.limit) || 20));
  const offset = Math.max(0, Number(query.offset) || 0);
  const type = positiveIntegerFilter(query.type);

  let filtered = SLOT_ITEMS;
  if (type != null) {
    filtered = filtered.filter((s) => (s.api_type[2] ?? 0) === type);
  }
  if (search) {
    filtered = filtered.filter(
      (s) =>
        s.api_name.toLowerCase().includes(search) ||
        s.api_yomi.toLowerCase().includes(search)
    );
  }

  const total = filtered.length;
  const page = filtered.slice(offset, offset + limit);
  const items: SlotItemMasterSummary[] = page.map((s) => ({
    id: s.api_id,
    name: s.api_name,
    yomi: s.api_yomi,
    type: s.api_type[2] ?? 0, // equipType is index 2 in the type array
    typeName: equipTypeNameMap.get(s.api_type[2] ?? 0) ?? `Type ${s.api_type[2] ?? 0}`,
  }));

  return apiOk({ items, total, limit, offset });
}

function positiveIntegerFilter(value: unknown): number | null {
  if (value == null || value === "") return null;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

export function handleListPlayerShips(stateStore: StateStore) {
  const save = stateStore.getSave();
  return apiOk(save.ships.map((s) => {
    const ship = toShip(s, save.slotItems);
    const master = shipMasterById.get(s.masterId);
    return {
      ...ship,
      name: master?.api_name ?? `Unknown ship ${s.masterId}`,
      yomi: master?.api_yomi ?? "",
      stype: master?.api_stype ?? 0,
      stypeName: master ? shipTypeNameMap.get(master.api_stype) ?? `Type ${master.api_stype}` : "Type 0",
    };
  }));
}

export function handleListPlayerSlotItems(stateStore: StateStore) {
  const save = stateStore.getSave();
  return apiOk(save.slotItems.map((item) => {
    const slotItem = toSlotItem(item);
    const master = slotItemMasterById.get(item.masterId);
    const type = master?.api_type[2] ?? 0;
    return {
      ...slotItem,
      name: master?.api_name ?? `Unknown equipment ${item.masterId}`,
      yomi: master?.api_yomi ?? "",
      type,
      typeName: equipTypeNameMap.get(type) ?? `Type ${type}`,
    };
  }));
}

export function handleSetShipLevel(
  params: { shipId?: unknown; level?: unknown },
  stateStore: StateStore
) {
  const result = stateStore.setShipLevel(Number(params.shipId), Number(params.level));
  if (!result.ok) return apiError(result.error, 400);

  const save = stateStore.getSave();
  const master = SHIPS.find((s) => s.api_id === result.ship.masterId);
  return apiOk({
    ship: toShip(result.ship, save.slotItems),
    message: `Set ${master?.api_name ?? "ship"} #${result.ship.id} to Lv.${result.ship.level}`,
  });
}

export function handleAddShip(params: { masterId?: unknown }, stateStore: StateStore) {
  const masterId = Number(params.masterId);
  if (!Number.isFinite(masterId) || masterId <= 0) {
    return apiError("Invalid masterId: must be a positive number", 400);
  }

  const master = SHIPS.find((s) => s.api_id === masterId);
  if (!master) {
    return apiError(`Ship master ID ${masterId} not found in generated data`, 404);
  }

  const ship = stateStore.createShip(masterId);
  const save = stateStore.getSave();
  return apiOk({
    ship: toShip(ship, save.slotItems),
    message: `Created ship: ${master.api_name} (ID: ${master.api_id})`,
  });
}

export function handleRemoveShip(params: { shipId?: unknown }, stateStore: StateStore) {
  const shipId = Number(params.shipId);
  if (!Number.isFinite(shipId) || shipId <= 0) {
    return apiError("Invalid shipId: must be a positive number", 400);
  }

  const save = stateStore.getSave();
  const ship = save.ships.find((s) => s.id === shipId);
  if (!ship) {
    return apiError(`Player ship ID ${shipId} not found in save`, 404);
  }

  const master = SHIPS.find((s) => s.api_id === ship.masterId);
  const materials = stateStore.destroyShip([shipId]);

  return apiOk({
    destroyedShip: { id: shipId, masterId: ship.masterId, name: master?.api_name ?? "Unknown" },
    materials,
    message: `Destroyed ship: ${master?.api_name ?? "Unknown"} (Player ID: ${shipId})`,
  });
}

export function handleAddSlotItem(params: { masterId?: unknown }, stateStore: StateStore) {
  const masterId = Number(params.masterId);
  if (!Number.isFinite(masterId) || masterId <= 0) {
    return apiError("Invalid masterId: must be a positive number", 400);
  }

  const master = SLOT_ITEMS.find((s) => s.api_id === masterId);
  if (!master) {
    return apiError(`Equipment master ID ${masterId} not found in generated data`, 404);
  }

  const item = stateStore.createSlotItem(masterId);
  return apiOk({
    slotItem: toSlotItem(item),
    message: `Created equipment: ${master.api_name} (ID: ${master.api_id})`,
  });
}

export function handleRemoveSlotItem(params: { itemId?: unknown }, stateStore: StateStore) {
  const itemId = Number(params.itemId);
  if (!Number.isFinite(itemId) || itemId <= 0) {
    return apiError("Invalid itemId: must be a positive number", 400);
  }

  const save = stateStore.getSave();
  const slotItem = save.slotItems.find((item) => item.id === itemId);
  if (!slotItem) {
    return apiError(`Player slot item ID ${itemId} not found in save`, 404);
  }

  const master = SLOT_ITEMS.find((s) => s.api_id === slotItem.masterId);
  const materials = stateStore.destroySlotItem([itemId]);

  return apiOk({
    destroyedItem: { id: itemId, masterId: slotItem.masterId, name: master?.api_name ?? "Unknown" },
    materials,
    message: `Destroyed equipment: ${master?.api_name ?? "Unknown"} (Player ID: ${itemId})`,
  });
}

export function handleListUseItemMasters(query: MasterListQuery, stateStore: StateStore) {
  const search = (query.search ?? "").toLowerCase().trim();
  const limit = Math.max(1, Math.min(100, Number(query.limit) || 20));
  const offset = Math.max(0, Number(query.offset) || 0);
  const save = stateStore.hasAccount() ? stateStore.getSave() : null;

  let filtered = editableUseItemMasters();
  if (search) {
    filtered = filtered.filter((item) => {
      const description = useItemDescription(item).toLowerCase();
      return (
        item.api_name.toLowerCase().includes(search) ||
        String(item.api_id).includes(search) ||
        description.includes(search)
      );
    });
  }

  const total = filtered.length;
  const page = filtered.slice(offset, offset + limit);
  return apiOk({
    items: page.map((item) => useItemSummary(item, save)),
    total,
    limit,
    offset,
  });
}

export function handleListPlayerUseItems(stateStore: StateStore) {
  const save = stateStore.getSave();
  const masters = editableUseItemMasters();
  const commonItems = commonUseItemIds
    .map((id) => masters.find((item) => item.api_id === id))
    .filter((item): item is NonNullable<typeof item> => item != null)
    .map((item) => useItemSummary(item, save));
  const items = masters
    .map((item) => useItemSummary(item, save))
    .filter((item) => item.count > 0)
    .sort((a, b) => a.id - b.id);
  return apiOk({ commonItems, items });
}

export function handleListPlayerMaterials(stateStore: StateStore) {
  return apiOk(basicMaterialSummary(stateStore.getSave().materials));
}

export function handleSetBasicMaterials(
  params: { fuel?: unknown; ammo?: unknown; steel?: unknown; bauxite?: unknown },
  stateStore: StateStore
) {
  const result = stateStore.setBasicMaterials({
    fuel: Number(params.fuel),
    ammo: Number(params.ammo),
    steel: Number(params.steel),
    bauxite: Number(params.bauxite),
  });
  if (!result.ok) return apiError(result.error, 400);

  return apiOk({
    materials: basicMaterialSummary(result.materials),
    message: "Updated basic materials",
  });
}

export function handleSetUseItemCount(
  params: { itemId?: unknown; count?: unknown },
  stateStore: StateStore
) {
  const result = stateStore.setUseItemCount(Number(params.itemId), Number(params.count));
  if (!result.ok) return apiError(result.error, 400);

  const save = stateStore.getSave();
  const master = masterData.api_mst_useitem.find((item) => item.api_id === result.item.id);
  const summary = master
    ? useItemSummary(master, save)
    : { id: result.item.id, name: `Use item ${result.item.id}`, description: "", count: result.item.count };
  return apiOk({
    item: summary,
    message: `Set ${summary.name} (${summary.id}) to ${summary.count}`,
  });
}

export function handleExpeditionStatus(stateStore: StateStore) {
  const save = stateStore.getSave();
  const member = stateStore.getMissionMemberState();
  const states = new Map(
    member.api_list_items.map((item) => [item.api_mission_id, item.api_state] as const)
  );
  return apiOk({
    missions: EXPEDITION_MASTERS.map((mission) => ({
      id: mission.api_id,
      displayNo: mission.api_disp_no,
      areaId: mission.api_maparea_id,
      name: mission.api_name,
      minutes: mission.api_time,
      state: states.get(mission.api_id) ?? 0,
      monthly: mission.api_reset_type === 1,
      combat: mission.api_damage_type > 0,
      support: mission.api_id === 33 || mission.api_id === 34,
    })),
    runs: save.expeditionRuns,
    settings: save.expeditionSettings,
    limitTime: member.api_limit_time,
  });
}

export function handleUnlockAllExpeditions(
  params: { enabled?: unknown },
  stateStore: StateStore
) {
  stateStore.unlockAllExpeditions(params.enabled !== false && params.enabled !== "false");
  return handleExpeditionStatus(stateStore);
}

export function handleConfigureExpeditions(
  params: { fixedSeed?: unknown; clockOffsetMs?: unknown },
  stateStore: StateStore
) {
  if ("fixedSeed" in params) {
    const seed = params.fixedSeed === null || params.fixedSeed === "" ? null : Number(params.fixedSeed);
    if (seed != null && !Number.isFinite(seed)) return apiError("Invalid fixedSeed", 400);
    stateStore.setExpeditionFixedSeed(seed);
  }
  if ("clockOffsetMs" in params) {
    const offset = Number(params.clockOffsetMs);
    if (!Number.isFinite(offset)) return apiError("Invalid clockOffsetMs", 400);
    stateStore.setExpeditionClockOffset(offset);
  }
  return handleExpeditionStatus(stateStore);
}

export function handleForceCompleteExpedition(
  params: { deckId?: unknown },
  stateStore: StateStore
) {
  const deckId = Number(params.deckId);
  if (!Number.isInteger(deckId) || !stateStore.forceCompleteExpedition(deckId)) {
    return apiError("No active expedition for that fleet", 404);
  }
  return handleExpeditionStatus(stateStore);
}

export function handleResetExpeditions(stateStore: StateStore) {
  stateStore.resetExpeditionProgress();
  return handleExpeditionStatus(stateStore);
}

function editableUseItemMasters() {
  return masterData.api_mst_useitem
    .filter((item) => item.api_name.trim().length > 0)
    .filter((item) => !resourcePseudoUseItemIds.has(item.api_id))
    .sort((a, b) => a.api_id - b.api_id);
}

function useItemSummary(
  item: (typeof masterData.api_mst_useitem)[number],
  save: ReturnType<StateStore["getSave"]> | null
): UseItemSummary {
  return {
    id: item.api_id,
    name: item.api_name,
    description: useItemDescription(item),
    count: save ? useItemCount(save, item.api_id) : 0,
  };
}

function useItemDescription(item: (typeof masterData.api_mst_useitem)[number]) {
  return item.api_description.join(" ").replace(/<br>/g, " ");
}

function useItemCount(save: ReturnType<StateStore["getSave"]>, itemId: number) {
  if (itemId === 1) return save.materials.repairKit;
  if (itemId === 2) return save.materials.buildKit;
  if (itemId === 3) return save.materials.devmat;
  if (itemId === 4) return save.materials.screw;
  return save.useItems.find((item) => item.id === itemId)?.count ?? 0;
}

function basicMaterialSummary(materials: ReturnType<StateStore["getSave"]>["materials"]): BasicMaterialSummary {
  return {
    fuel: materials.fuel,
    ammo: materials.ammo,
    steel: materials.steel,
    bauxite: materials.bauxite,
  };
}
