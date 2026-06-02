import { SHIPS, SLOT_ITEMS, SHIP_TYPES } from "../master/generated-data.js";
import { apiError, apiOk } from "../kcsapi/envelope.js";
import { toShip, toSlotItem } from "../kcsapi/serializers.js";
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

export type MasterListQuery = {
  search?: string;
  limit?: number;
  offset?: number;
};

// Build a lookup for ship type names
const shipTypeNameMap: Map<number, string> = new Map(
  SHIP_TYPES.map((t) => [t.api_id, t.api_name])
);

// Build lookup maps for fast master validation
const shipMasterIds: Set<number> = new Set(SHIPS.map((s) => s.api_id));
const slotMasterIds: Set<number> = new Set(SLOT_ITEMS.map((s) => s.api_id));

export function handleListShipMasters(query: MasterListQuery) {
  const search = (query.search ?? "").toLowerCase().trim();
  const limit = Math.max(1, Math.min(100, Number(query.limit) || 20));
  const offset = Math.max(0, Number(query.offset) || 0);

  let filtered = SHIPS;
  if (search) {
    filtered = SHIPS.filter(
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

  let filtered = SLOT_ITEMS;
  if (search) {
    filtered = SLOT_ITEMS.filter(
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
    typeName: `Type ${s.api_type[2] ?? 0}`,
  }));

  return apiOk({ items, total, limit, offset });
}

export function handleListPlayerShips(stateStore: StateStore) {
  const save = stateStore.getSave();
  return apiOk(save.ships.map((s) => toShip(s, save.slotItems)));
}

export function handleListPlayerSlotItems(stateStore: StateStore) {
  const save = stateStore.getSave();
  return apiOk(save.slotItems.map(toSlotItem));
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
