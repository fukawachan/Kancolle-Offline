import { masterData } from "./data.js";

export const DEFAULT_FURNITURE_SET = {
  api_floor: 1,
  api_wall: 38,
  api_window: 72,
  api_object: 102,
  api_chest: 133,
  api_desk: 164
} as const;

export const FURNITURE_SLOT_TYPES = {
  api_floor: 0,
  api_wall: 1,
  api_window: 2,
  api_object: 3,
  api_chest: 4,
  api_desk: 5
} as const;

export const FURNITURE_SLOT_ORDER = [
  "api_floor",
  "api_wall",
  "api_window",
  "api_object",
  "api_chest",
  "api_desk"
] as const;

export const DEFAULT_FURNITURE_IDS = FURNITURE_SLOT_ORDER.map((slot) => DEFAULT_FURNITURE_SET[slot]);

export type FurnitureSlotKey = keyof typeof DEFAULT_FURNITURE_SET;
export type FurnitureSet = Record<FurnitureSlotKey, number>;
export type FurnitureMaster = (typeof masterData.api_mst_furniture)[number];

export function furnitureMasterById(id: number): FurnitureMaster | undefined {
  return masterData.api_mst_furniture.find((item) => item.api_id === id);
}

export function furnitureMasterByTypeNo(type: number, no: number): FurnitureMaster | undefined {
  return masterData.api_mst_furniture.find((item) => item.api_type === type && item.api_no === no);
}

export function furnitureMatchesSlot(id: number, slot: FurnitureSlotKey): boolean {
  return furnitureMasterById(id)?.api_type === FURNITURE_SLOT_TYPES[slot];
}

export function normalizeOwnedFurniture(owned: unknown[] | undefined): number[] {
  const ids = [...DEFAULT_FURNITURE_IDS, ...(owned ?? []).map((id) => safeId(id))];
  return Array.from(new Set(ids)).filter((id) => id > 0 && furnitureMasterById(id) != null);
}

export function normalizeFurnitureSet(set?: Partial<Record<FurnitureSlotKey, unknown>>): FurnitureSet {
  const normalized = {} as FurnitureSet;
  for (const slot of FURNITURE_SLOT_ORDER) {
    const candidate = safeId(set?.[slot]);
    normalized[slot] = furnitureMatchesSlot(candidate, slot) ? candidate : DEFAULT_FURNITURE_SET[slot];
  }
  return normalized;
}

export function furnitureSetArray(set?: Partial<Record<FurnitureSlotKey, unknown>>): number[] {
  const normalized = normalizeFurnitureSet(set);
  return FURNITURE_SLOT_ORDER.map((slot) => normalized[slot]);
}

function safeId(value: unknown): number {
  const id = Number(value);
  return Number.isFinite(id) ? Math.trunc(id) : 0;
}
