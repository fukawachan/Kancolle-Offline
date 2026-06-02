import { buildShipMasters, buildSlotMasters } from "../master/catalog.js";
import { masterData } from "../master/data.js";
import type { ResourceManifest } from "../resources/types.js";
import type { SaveState, Ship, SlotItem } from "../state/types.js";

type EquipTypeRule = null | number[];
type EquipModelRule = { api_equip_type?: Record<string, EquipTypeRule> };
type ExSlotShipRule = {
  api_ship_ids?: Record<string, number> | null;
  api_stypes?: Record<string, number> | null;
  api_ctypes?: Record<string, number> | null;
  api_req_level?: number;
};

export type EquipTargetSlot = "normal" | "extra";

export function validateSlotEquip(
  save: SaveState,
  resourceManifest: ResourceManifest,
  shipId: number,
  slotIndex: number,
  itemId: number,
  targetSlot: EquipTargetSlot
) {
  const ship = save.ships.find((item) => item.id === shipId);
  if (!ship) return invalid("Unknown ship");

  const shipMaster = buildShipMasters(resourceManifest).find((item) => item.api_id === ship.masterId);
  if (!shipMaster) return invalid("Unknown ship master");

  if (targetSlot === "normal") {
    const slotCount = Math.max(0, Number(shipMaster.api_slot_num) || 0);
    if (!Number.isInteger(slotIndex) || slotIndex < 0 || slotIndex >= slotCount) return invalid("Invalid ship slot");
  }

  if (itemId <= 0) return valid();

  const slotItem = save.slotItems.find((item) => item.id === itemId);
  if (!slotItem) return invalid("Unknown slot item");

  const slotMaster = buildSlotMasters(resourceManifest).find((item) => item.api_id === slotItem.masterId);
  if (!slotMaster) return invalid("Unknown slot item master");

  if (targetSlot === "extra") {
    return isExtraSlotEquipAllowed(ship, shipMaster, slotItem, slotMaster) ? valid() : invalid("Slot item cannot be equipped in extra slot");
  }

  return isNormalSlotEquipAllowed(shipMaster.api_id, shipMaster.api_stype, slotItem, slotMaster) ? valid() : invalid("Slot item cannot be equipped by ship");
}

function isNormalSlotEquipAllowed(shipMasterId: number, shipTypeId: number, slotItem: SlotItem, slotMaster: { api_id: number; api_type: number[] }) {
  const specificRule = equipShipRules()[String(shipMasterId)] as EquipModelRule | undefined;
  const rule = specificRule?.api_equip_type ?? shipTypeRule(shipTypeId);
  return isEquipmentValid(rule, slotItem, slotMaster);
}

function isExtraSlotEquipAllowed(
  ship: Ship,
  shipMaster: { api_id: number; api_stype: number; api_ctype: number },
  slotItem: SlotItem,
  slotMaster: { api_id: number; api_type: number[] }
) {
  const typeId = effectiveEquipType(slotMaster);
  if (isNormalSlotEquipAllowed(shipMaster.api_id, shipMaster.api_stype, slotItem, slotMaster) && extraEquipTypes().has(typeId)) return true;

  const shipRule = extraShipRules()[String(slotMaster.api_id)] as ExSlotShipRule | undefined;
  if (!shipRule) return false;
  if (Number(shipRule.api_req_level ?? 0) > ship.level) return false;
  return matchesRuleMap(shipRule.api_ship_ids, shipMaster.api_id) || matchesRuleMap(shipRule.api_stypes, shipMaster.api_stype) || matchesRuleMap(shipRule.api_ctypes, shipMaster.api_ctype);
}

function isEquipmentValid(rule: Record<string, EquipTypeRule> | undefined, slotItem: SlotItem, slotMaster: { api_id: number; api_type: number[] }) {
  if (!rule) return false;
  const typeRule = rule[String(effectiveEquipType(slotMaster))];
  if (typeRule === undefined) return false;
  if (typeRule === null) return true;
  return typeRule.includes(slotItem.masterId);
}

function effectiveEquipType(slotMaster: { api_id: number; api_type: number[] }) {
  return slotMaster.api_id === 467 ? 95 : Number(slotMaster.api_type[2]);
}

function shipTypeRule(shipTypeId: number) {
  const shipType = masterData.api_mst_stype.find((item) => item.api_id === shipTypeId);
  if (!shipType) return undefined;
  return Object.fromEntries(Object.entries(shipType.api_equip_type).filter(([, value]) => value === 1).map(([typeId]) => [typeId, null as EquipTypeRule]));
}

function equipShipRules() {
  return masterData.api_mst_equip_ship as Record<string, EquipModelRule>;
}

function extraEquipTypes() {
  return new Set((masterData.api_mst_equip_exslot as number[]).map((item) => Number(item)));
}

function extraShipRules() {
  return masterData.api_mst_equip_exslot_ship as Record<string, ExSlotShipRule>;
}

function matchesRuleMap(rule: Record<string, number> | null | undefined, id: number) {
  return rule != null && rule[String(id)] === 1;
}

function valid() {
  return { ok: true as const };
}

function invalid(message: string) {
  return { ok: false as const, message };
}
