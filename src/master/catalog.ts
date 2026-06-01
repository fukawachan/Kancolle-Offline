import { masterData } from "./data.js";
import type { ResourceManifest } from "../resources/types.js";

export type ShipMaster = (typeof masterData.api_mst_ship)[number];
export type SlotMaster = (typeof masterData.api_mst_slotitem)[number];
export type SlotEquipType = (typeof masterData.api_mst_slotitem_equiptype)[number];

const PAGES_PER_BLOCK = 7;
const ITEMS_PER_PAGE = 10;
const ITEMS_PER_BLOCK = PAGES_PER_BLOCK * ITEMS_PER_PAGE;
const GENERATED_SLOT_ICON_TYPES = Array.from({ length: 59 }, (_value, index) => index + 1);

export function buildShipMasters(resourceManifest: ResourceManifest): ShipMaster[] {
  const baseById = new Map(masterData.api_mst_ship.map((ship) => [ship.api_id, ship] as const));
  const ids = new Set<number>(resourceManifest.ship.albumStatus.keys());

  if (ids.size === 0) {
    for (const id of resourceManifest.ship.card.keys()) ids.add(id);
  }
  for (const id of baseById.keys()) ids.add(id);

  return [...ids].sort((a, b) => a - b).map((id) => baseById.get(id) ?? generatedShipMaster(id));
}

export function buildSlotMasters(resourceManifest: ResourceManifest): SlotMaster[] {
  const baseById = new Map(masterData.api_mst_slotitem.map((slot) => [slot.api_id, slot] as const));
  const ids = new Set<number>(resourceManifest.slot.card.keys());

  if (ids.size === 0) {
    for (const id of resourceManifest.slot.cardThumbnail.keys()) ids.add(id);
  }
  for (const id of baseById.keys()) ids.add(id);

  return [...ids].sort((a, b) => a - b).map((id) => baseById.get(id) ?? generatedSlotMaster(id));
}

export function buildSlotEquipTypes(slotItems: SlotMaster[]): SlotEquipType[] {
  const equipTypes = new Map(masterData.api_mst_slotitem_equiptype.map((type) => [type.api_id, type] as const));

  for (const item of slotItems) {
    const typeId = Number(item.api_type[2]);
    if (!Number.isFinite(typeId) || typeId <= 0 || equipTypes.has(typeId)) continue;
    equipTypes.set(typeId, {
      api_id: typeId,
      api_name: `Equipment Type ${String(typeId).padStart(2, "0")}`,
      api_show_flg: 1
    });
  }

  return [...equipTypes.values()].sort((a, b) => a.api_id - b.api_id);
}

export function shipPictureBookPage(resourceManifest: ResourceManifest, pageNo: number) {
  const firstIndexNo = blockFirstIndexNo(pageNo);
  return block(buildShipMasters(resourceManifest), pageNo).map((ship, offset) =>
    shipPictureBookEntry(ship, firstIndexNo + offset)
  );
}

export function slotPictureBookPage(resourceManifest: ResourceManifest, pageNo: number) {
  const firstIndexNo = blockFirstIndexNo(pageNo);
  return block(buildSlotMasters(resourceManifest), pageNo).map((slot, offset) =>
    slotPictureBookEntry(slot, firstIndexNo + offset)
  );
}

function block<T>(items: T[], blockNo: number) {
  const startIndex = blockFirstIndexNo(blockNo) - 1;
  return items.slice(startIndex, startIndex + ITEMS_PER_BLOCK);
}

function shipPictureBookEntry(ship: ShipMaster, indexNo: number) {
  return {
    api_index_no: indexNo,
    api_table_id: [ship.api_id],
    api_stype: ship.api_stype,
    api_sinfo: ship.api_getmes || "",
    api_houg: statValue(ship.api_houg),
    api_raig: statValue(ship.api_raig),
    api_tyku: statValue(ship.api_tyku),
    api_kaih: 0,
    api_taik: statValue(ship.api_taik),
    api_state: [[1, 1, 0]],
    api_q_voice_info: []
  };
}

function slotPictureBookEntry(slot: SlotMaster, indexNo: number) {
  return {
    api_index_no: indexNo,
    api_table_id: [slot.api_id],
    api_type: slot.api_type,
    api_souk: slot.api_souk,
    api_houg: slot.api_houg,
    api_raig: slot.api_raig,
    api_baku: slot.api_baku,
    api_tyku: slot.api_tyku,
    api_tais: slot.api_tais,
    api_houm: slot.api_houm,
    api_houk: slot.api_houk,
    api_saku: slot.api_saku,
    api_leng: slot.api_leng,
    api_info: slot.api_info
  };
}

function generatedShipMaster(api_id: number): ShipMaster {
  const name = `Ship ${String(api_id).padStart(4, "0")}`;
  return {
    api_id,
    api_sortno: api_id,
    api_sort_id: api_id,
    api_name: name,
    api_yomi: name.toLowerCase().replace(/\s+/g, ""),
    api_stype: 2,
    api_ctype: 1,
    api_afterlv: 0,
    api_aftershipid: 0,
    api_taik: [1, 1],
    api_souk: [0, 0],
    api_houg: [0, 0],
    api_raig: [0, 0],
    api_tyku: [0, 0],
    api_luck: [0, 0],
    api_leng: 1,
    api_slot_num: 0,
    api_maxeq: [0, 0, 0, 0, 0],
    api_buildtime: 0,
    api_broken: [0, 0, 0, 0],
    api_powup: [0, 0, 0, 0],
    api_backs: 1,
    api_getmes: "",
    api_fuel_max: 0,
    api_bull_max: 0,
    api_voicef: 0
  };
}

function generatedSlotMaster(api_id: number): SlotMaster {
  const iconType = GENERATED_SLOT_ICON_TYPES[(api_id - 1) % GENERATED_SLOT_ICON_TYPES.length] ?? 1;
  const name = `Equipment ${String(api_id).padStart(4, "0")}`;
  return {
    api_id,
    api_sortno: api_id,
    api_name: name,
    api_yomi: name.toLowerCase().replace(/\s+/g, ""),
    api_type: [1, 1, iconType, iconType, 0],
    api_taik: 0,
    api_souk: 0,
    api_houg: 0,
    api_raig: 0,
    api_soku: 0,
    api_baku: 0,
    api_tyku: 0,
    api_tais: 0,
    api_atap: 0,
    api_houm: 0,
    api_raim: 0,
    api_houk: 0,
    api_raik: 0,
    api_bakk: 0,
    api_saku: 0,
    api_sakb: 0,
    api_luck: 0,
    api_leng: 1,
    api_rare: 1,
    api_broken: [0, 0, 0, 0],
    api_info: "",
    api_usebull: "0",
    api_version: 1,
    api_cost: null,
    api_distance: null
  };
}

function blockFirstIndexNo(blockNo: number) {
  return (normalizedBlockNo(blockNo) - 1) * ITEMS_PER_BLOCK + 1;
}

function normalizedBlockNo(blockNo: number) {
  return Math.max(1, Math.trunc(blockNo));
}

function statValue(value: number | number[]) {
  if (Array.isArray(value)) return value[value.length - 1] ?? 0;
  return value;
}
