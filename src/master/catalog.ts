import { masterData } from "./data.js";
import { DEEP_SEA_SHIP_MASTERS, DEEP_SEA_SLOT_MASTERS } from "./sortie-data.js";
import type { ResourceManifest } from "../resources/types.js";

export type ShipMaster = (typeof masterData.api_mst_ship)[number];
export type ShipTypeMaster = (typeof masterData.api_mst_stype)[number];
export type SlotMaster = (typeof masterData.api_mst_slotitem)[number];
export type SlotEquipType = (typeof masterData.api_mst_slotitem_equiptype)[number];

const PAGES_PER_BLOCK = 7;
const ITEMS_PER_PAGE = 10;
const ITEMS_PER_BLOCK = PAGES_PER_BLOCK * ITEMS_PER_PAGE;
const VOICE_FLAG_BE_LEFT = 1;
const VOICE_FLAG_TIME_SIGNAL = 2;
const VOICE_FLAG_TIRED_BE_LEFT = 4;
const BE_LEFT_VOICE_NO = 29;
const TIME_SIGNAL_VOICE_NOS = Array.from({ length: 24 }, (_value, index) => index + 30);
const TIRED_BE_LEFT_VOICE_FILE = "129";

export function shipHasDisplayResource(resourceManifest: ResourceManifest, shipId: number) {
  return (
    resourceManifest.ship.full.has(shipId) ||
    resourceManifest.ship.card.has(shipId) ||
    resourceManifest.ship.banner.has(shipId) ||
    resourceManifest.ship.albumStatus.has(shipId)
  );
}

export function buildShipMasters(resourceManifest: ResourceManifest): ShipMaster[] {
  const baseById = new Map(masterData.api_mst_ship.map((ship) => [ship.api_id, ship] as const));
  const deepSeaById = new Map(DEEP_SEA_SHIP_MASTERS.map((ship) => [ship.api_id, ship] as const));
  const resourceBackedIds = shipDisplayResourceIds(resourceManifest);
  const knownIds = new Set<number>([...baseById.keys(), ...deepSeaById.keys()]);
  const ids = resourceBackedIds.size > 0
    ? new Set<number>([...resourceBackedIds].filter((id) => knownIds.has(id)))
    : knownIds;

  return [...ids]
    .sort((a, b) => a - b)
    .map((id) => normalizeShipVoiceFlag(baseById.get(id) ?? deepSeaById.get(id)!, resourceManifest));
}

function shipDisplayResourceIds(resourceManifest: ResourceManifest) {
  return new Set<number>([
    ...resourceManifest.ship.full.keys(),
    ...resourceManifest.ship.card.keys(),
    ...resourceManifest.ship.banner.keys(),
    ...resourceManifest.ship.albumStatus.keys()
  ]);
}

export function buildSlotMasters(_resourceManifest: ResourceManifest): SlotMaster[] {
  const baseById = new Map(masterData.api_mst_slotitem.map((slot) => [slot.api_id, slot] as const));
  const deepSeaById = new Map(DEEP_SEA_SLOT_MASTERS.map((slot) => [slot.api_id, slot] as const));
  // Unlike ship artwork, slot artwork has a type/category-aware fallback in
  // resolveMappedResource(). Keep every known master visible so an existing
  // save never references an item omitted from api_mst_slotitem merely because
  // its exact card image post-dates the cached client.
  const ids = new Set<number>([...baseById.keys(), ...deepSeaById.keys()]);

  return [...ids]
    .sort((a, b) => a - b)
    .map((id) => baseById.get(id) ?? deepSeaById.get(id)!)
    .filter((slot): slot is SlotMaster => slot != null);
}

export type MasterAssetClosureReport = {
  exposedShipIds: number[];
  exposedSlotIds: number[];
  shipMastersWithoutDisplayResources: number[];
  slotMastersWithoutDisplayResources: number[];
  shipResourcesWithoutMasters: number[];
  slotResourcesWithoutMasters: number[];
};

/**
 * Reports version drift without manufacturing gameplay data to cover it up.
 * Equipment without exact artwork remains safe to expose because the resource
 * resolver supplies a cached fallback for the same type/category.
 */
export function masterAssetClosureReport(resourceManifest: ResourceManifest): MasterAssetClosureReport {
  const baseShipIds = new Set(masterData.api_mst_ship.map((ship) => ship.api_id));
  const deepSeaShipIds = new Set(DEEP_SEA_SHIP_MASTERS.map((ship) => ship.api_id));
  const baseSlotIds = new Set(masterData.api_mst_slotitem.map((slot) => slot.api_id));
  const deepSeaSlotIds = new Set(DEEP_SEA_SLOT_MASTERS.map((slot) => slot.api_id));
  const shipResourceIds = shipDisplayResourceIds(resourceManifest);
  const slotResourceIds = slotDisplayResourceIds(resourceManifest);

  return {
    exposedShipIds: buildShipMasters(resourceManifest).map((ship) => ship.api_id),
    exposedSlotIds: buildSlotMasters(resourceManifest).map((slot) => slot.api_id),
    shipMastersWithoutDisplayResources: [...baseShipIds]
      .filter((id) => !shipResourceIds.has(id))
      .sort((a, b) => a - b),
    slotMastersWithoutDisplayResources: [...baseSlotIds]
      .filter((id) => !slotResourceIds.has(id))
      .sort((a, b) => a - b),
    shipResourcesWithoutMasters: [...shipResourceIds]
      .filter((id) => !baseShipIds.has(id) && !deepSeaShipIds.has(id))
      .sort((a, b) => a - b),
    slotResourcesWithoutMasters: [...slotResourceIds]
      .filter((id) => !baseSlotIds.has(id) && !deepSeaSlotIds.has(id))
      .sort((a, b) => a - b)
  };
}

function slotDisplayResourceIds(resourceManifest: ResourceManifest) {
  return new Set<number>([
    ...resourceManifest.slot.card.keys(),
    ...resourceManifest.slot.cardThumbnail.keys()
  ]);
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

export function buildShipTypes(slotItems: SlotMaster[]): ShipTypeMaster[] {
  void slotItems;
  return masterData.api_mst_stype.map((shipType) => ({ ...shipType, api_equip_type: { ...shipType.api_equip_type } }));
}

export function shipPictureBookPage(resourceManifest: ResourceManifest, pageNo: number, marriedMasterIds = new Set<number>()) {
  const firstIndexNo = blockFirstIndexNo(pageNo);
  return block(buildShipMasters(resourceManifest), pageNo).map((ship, offset) =>
    shipPictureBookEntry(ship, firstIndexNo + offset, marriedMasterIds)
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

function shipPictureBookEntry(ship: ShipMaster, indexNo: number, marriedMasterIds: Set<number>) {
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
    api_state: [[1, 1, marriedMasterIds.has(ship.api_id) ? 1 : 0]],
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

function normalizeShipVoiceFlag(ship: ShipMaster, resourceManifest: ResourceManifest): ShipMaster {
  const apiVoicef = Number(ship.api_voicef || 0);
  const normalizedVoicef = apiVoicef & supportedVoiceFlags(ship.api_id, resourceManifest);
  if (normalizedVoicef === apiVoicef) return ship;
  return { ...ship, api_voicef: normalizedVoicef };
}

function supportedVoiceFlags(shipId: number, resourceManifest: ResourceManifest) {
  const voice = resourceManifest.voice.byShipId.get(shipId);
  if (!voice) return 0;

  let flags = 0;
  if (voice.availableVoiceNos.has(BE_LEFT_VOICE_NO)) {
    flags |= VOICE_FLAG_BE_LEFT;
  }
  if (TIME_SIGNAL_VOICE_NOS.every((voiceNo) => voice.availableVoiceNos.has(voiceNo))) {
    flags |= VOICE_FLAG_TIME_SIGNAL;
  }
  if (voice.files.has(TIRED_BE_LEFT_VOICE_FILE)) {
    flags |= VOICE_FLAG_TIRED_BE_LEFT;
  }
  return flags;
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
