import { appendFile } from "node:fs/promises";
import { dirname } from "node:path";
import { mkdirSync } from "node:fs";
import type { FastifyRequest } from "fastify";
import {
  buildShipMasters,
  buildShipTypes,
  buildSlotEquipTypes,
  buildSlotMasters,
  shipHasDisplayResource,
  shipPictureBookPage,
  slotPictureBookPage,
  type ShipMaster
} from "../master/catalog.js";
import { mapMasterId, masterData } from "../master/data.js";
import {
  DEFAULT_FURNITURE_SET,
  FURNITURE_SLOT_ORDER,
  furnitureMasterById,
  furnitureMasterByTypeNo,
  furnitureMatchesSlot,
  type FurnitureSlotKey
} from "../master/furniture.js";
import { normalRoutingMap } from "../master/routing-data.js";
import type { RouteEvaluation } from "../master/routing.js";
import { sortieBossNodeNo, sortieNodeData } from "../master/sortie-data.js";
import { DEFAULT_PORT_BGM_ID, type ResourceManifest } from "../resources/types.js";
import { shipGraphOffsets } from "../master/shipgraph-offsets.js";
import type { StateStore } from "../state/store.js";
import type { AirBase, Materials, PresetDeck, PresetSlot, PresetSlotItem, SaveState, Ship, SlotItem } from "../state/types.js";
import {
  battleResultPayload,
  createCombinedBattle,
  createNightBattle,
  createPracticeBattle,
  createSortieBattle,
  emptyKoukuStage3Payload,
  type BattleEndpointKind,
  type BattleRecord
} from "./battle.js";
import { battleEndpointMode } from "./battle/data/endpoint-modes.js";
import { validateSlotEquip } from "./equipment-rules.js";
import { apiError, apiOk, parseApiPayload } from "./envelope.js";
import { expeditionMasters } from "./expedition.js";
import { practiceRivalById, type PracticeRival } from "./practice.js";
import {
  normalizePortBgmId,
  toAirBase,
  toAirBaseExpandedInfo,
  toBasic,
  toBuildDock,
  toDeck,
  toFurniture,
  toFurnitureList,
  toMapInfo,
  toMaterialValues,
  toMaterials,
  toPort,
  toQuestList,
  toRepairDock,
  toRequireInfo,
  toShip,
  toSlotItem,
  toUnsetSlot,
  toUnsetSlotItems,
  toUseItems
} from "./serializers.js";
import { normalizeSupplyKind } from "./supply.js";
import {
  rollConstruction,
  rollDevelopment,
  type ArsenalContext,
  type ConstructionRecipe,
  type DevelopmentRecipe
} from "./arsenal.js";
import { playerTotalExpForLevel } from "./experience.js";
import {
  prepareRemodelSlotExecution,
  remodelSlotDetailPayload,
  remodelSlotListPayload
} from "./improvement.js";
import {
  eventBossNodeNo,
  eventDefinition,
  eventMapBgmMaster,
  eventMapCellColor,
  eventMapMasters,
  eventRankDefinition,
  eventRoutingMap,
  eventRoutingNodeData,
  eventSortieNodeData
} from "../master/event-data.js";

export type HandlerContext = {
  stateStore: StateStore;
  unknownLogPath: string;
  resourceManifest: ResourceManifest;
  arsenalRandom: () => number;
};

export type HandlerInput = {
  method: string;
  path: string;
  query: Record<string, unknown>;
  body: Record<string, unknown>;
};

type KcsHandler = (input: HandlerInput, context: HandlerContext) => unknown | Promise<unknown>;
type ShipUpgradeMaster = (typeof masterData.api_mst_shipupgrade)[number];

const handlers = new Map<string, KcsHandler>();
const RECORD_SLOT_ITEM_DISPLAY_BONUS = 3;
const MAX_FURNITURE_COUNT = 200;
const MATERIAL_CAP = 1_000_000;

register("api_start2/getData", (_input, context) => apiOk(masterDataWithResources(context.resourceManifest, activeEventAreaId(context))));
register("api_start2/get_option_setting", (_input, context) => {
  const options = context.stateStore.getSave().player.options;
  return apiOk(toOptionSetting(options));
});

register("api_port/port", (_input, context) => apiOk(toPort(context.stateStore.getSave(), context.resourceManifest)));
register("api_port/airCorpsCondRecoveryWithTimer", () => apiOk({ api_recovery: [] }));

register("api_get_member/require_info", (_input, context) => apiOk(toRequireInfo(context.stateStore.getSave(), context.resourceManifest)));
register("api_get_member/basic", (_input, context) => {
  const save = context.stateStore.getSave();
  return apiOk(toBasic(save.player, save.furniture, save.useItems, context.resourceManifest));
});
register("api_get_member/material", (_input, context) => apiOk(toMaterials(context.stateStore.getSave().materials)));
register("api_get_member/deck", (_input, context) => apiOk(context.stateStore.getSave().decks.map(toDeck)));
register("api_get_member/ship2", (_input, context) => {
  const save = context.stateStore.getSave();
  return apiOk(save.ships.map((s) => toShip(s, save.slotItems)));
});
register("api_get_member/ship3", (_input, context) => {
  const save = context.stateStore.getSave();
  return apiOk({ api_ship_data: save.ships.map((s) => toShip(s, save.slotItems)), api_deck_data: save.decks.map(toDeck), api_slot_data: toUnsetSlot(save) });
});
register("api_get_member/ship_deck", (input, context) => {
  const save = context.stateStore.getSave();
  const rawDeckIds = input.body.api_deck_rid;
  const requestedDeckIds = csvNums(rawDeckIds, []);
  const hasDeckFilter = rawDeckIds != null && rawDeckIds !== "";
  const decks = hasDeckFilter ? save.decks.filter((deck) => requestedDeckIds.includes(deck.id)) : save.decks;
  const ships = hasDeckFilter && decks.length === 0 ? [] : save.ships;
  return apiOk({
    api_deck_data: decks.map(toDeck),
    api_ship_data: ships.map((s) => toShip(s, save.slotItems))
  });
});
register("api_get_member/slot_item", (_input, context) => apiOk(context.stateStore.getSave().slotItems.map(toSlotItem)));
register("api_get_member/unsetslot", (_input, context) => apiOk(toUnsetSlot(context.stateStore.getSave())));
register("api_get_member/useitem", (_input, context) => {
  const save = context.stateStore.getSave();
  return apiOk(toUseItems(save.materials, save.useItems));
});
register("api_get_member/furniture", (_input, context) => apiOk(toFurnitureList(context.stateStore.getSave().furniture)));
register("api_get_member/kdock", (_input, context) => apiOk(context.stateStore.getSave().buildDocks.map(toBuildDock)));
register("api_get_member/ndock", (_input, context) => {
  const save = context.stateStore.getSave();
  return apiOk(save.repairDocks.map((dock) => toRepairDock(dock, save.ships)));
});
register("api_get_member/questlist", (input, context) => apiOk(toQuestList(context.stateStore.getSave(), questListOptions(input))));
register("api_get_member/mapinfo", (_input, context) => {
  const save = context.stateStore.getSave();
  return apiOk({
    api_map_info: toMapInfo(save),
    api_air_base: save.airBases.map((base) => toAirBase(base, save.slotItems)),
    api_air_base_expanded_info: save.airBases.map(toAirBaseExpandedInfo)
  });
});
register("api_get_member/mission", (_input, context) =>
  apiOk(context.stateStore.getMissionMemberState())
);
register("api_get_member/preset_deck", (_input, context) => apiOk(presetDeckPayload(context.stateStore.getSave())));
register("api_get_member/preset_slot", (_input, context) => apiOk(presetSlotPayload(context.stateStore.getSave())));
register("api_get_member/payitem", (_input, context) => apiOk(
  context.stateStore.pendingPayItems().map(pendingPayItemPayload)
));
register("api_get_member/record", (_input, context) => apiOk(recordPayload(context.stateStore.getSave())));
register("api_req_ranking/mxltvkpyuklh", (input, context) => apiOk(rankingPayload(input, context.stateStore.getSave())));
register("api_get_member/picture_book", (input, context) =>
  apiOk({ api_list: pictureBookList(input, context.resourceManifest, context.stateStore.getSave()) })
);
register("api_get_member/practice", (_input, context) => {
  const batch = context.stateStore.practiceBatch(practiceBatchOptions(context));
  return apiOk(practiceListPayload(batch.rivals, batch.states));
});
register("api_get_member/sortie_conditions", () => apiOk({ api_sortie_conditions: [], api_mission_conditions: [] }));
register("api_get_member/chart_additional_info", (_input, context) => apiOk(chartAdditionalInfo(context.stateStore.getSave())));

register("api_req_init/nickname", (input, context) => {
  const player = context.stateStore.updateNickname(str(input.body.api_nickname ?? input.body.api_name, "Local Admiral"));
  const save = context.stateStore.getSave();
  return apiOk(toBasic(player, save.furniture, save.useItems, context.resourceManifest));
});
register("api_req_init/firstship", (input, context) => {
  const save = context.stateStore.getSave();
  const masterId = num(input.body.api_ship_id, 9);
  const ship = context.stateStore.createShip(masterId);
  context.stateStore.changeDeckShip(1, 0, ship.id);
  return apiOk({ api_ship: toShip(ship, save.slotItems), api_deck: save.decks.map(toDeck) });
});
register("api_req_member/updatecomment", (input, context) => {
  const player = context.stateStore.updateComment(str(input.body.api_cmt, ""));
  const save = context.stateStore.getSave();
  return apiOk(toBasic(player, save.furniture, save.useItems, context.resourceManifest));
});
register("api_req_member/updatedeckname", (input, context) => {
  const deckId = num(input.body.api_deck_id ?? input.body.api_id, 1);
  return apiOk(toDeck(context.stateStore.renameDeck(deckId, str(input.body.api_name, "Fleet"))!));
});
register("api_req_member/update_tutorial_progress", (input, context) => {
  const player = context.stateStore.updateTutorialProgress(num(input.body.api_progress, 100));
  const save = context.stateStore.getSave();
  return apiOk(toBasic(player, save.furniture, save.useItems, context.resourceManifest));
});
register("api_req_member/set_option_setting", (input, context) => {
  const options = context.stateStore.updateOptions({
    bgmFlag: num(input.body.api_bgm_flag, 1),
    seFlag: num(input.body.api_se_flag, 1),
    voiceFlag: num(input.body.api_voice_flag, 1),
    volBgm: num(input.body.api_vol_bgm, 80),
    volSe: num(input.body.api_vol_se, 80),
    volVoice: num(input.body.api_vol_voice, 80)
  });
  return apiOk(options);
});
register("api_req_member/set_flagship_position", (input, context) => apiOk({ api_flagship_position: context.stateStore.setFlagshipPosition(num(input.body.api_flagship_position, 0)) }));
register("api_req_member/itemuse", (input, context) => {
  const result = context.stateStore.useItem(
    num(input.body.api_useitem_id, 0),
    num(input.body.api_exchange_type, 0),
    num(input.body.api_force_flag, 0) === 1
  );
  if (!result.ok) return apiError(result.error, 400, {}, 400);

  const payload: Record<string, unknown> = { api_caution_flag: result.cautionFlag };
  if (result.materialRewards.some((value) => value > 0)) payload.api_material = [...result.materialRewards];
  if (result.getItems.length > 0) {
    payload.api_getitem = result.getItems.map((item) => ({
      api_usemst: item.usemst,
      api_mst_id: item.masterId,
      api_getcount: item.count,
      ...(item.slotItem ? { api_slotitem: item.slotItem } : {})
    }));
  }
  return apiOk(payload);
});
register("api_req_member/itemuse_cond", () => apiOk({ api_caution_flag: 0 }));
register("api_req_member/payitemuse", (input, context) => {
  const result = context.stateStore.pickupPendingPayItem(
    num(input.body.api_payitem_id, 0),
    num(input.body.api_force_flag, 0) === 1
  );
  if (!result.ok) return apiError(result.error, 400, {}, 400);
  return apiOk({ api_caution_flag: result.cautionFlag });
});
register("api_req_member/get_incentive", () => apiOk({ api_items: [] }));
register("api_req_member/get_event_selected_reward", () => apiOk({ api_items: [] }));
register("api_req_member/set_friendly_request", () => apiOk({}));
register("api_req_member/set_oss_condition", () => apiOk({}));

register("api_dmm_payment/paycheck", (input, context) => {
  if (num(input.body.api_local_purchase, 0) === 1) {
    const payitemId = num(input.body.api_payitem_id, 0);
    const count = num(input.body.api_count, 0);
    const master = masterData.api_mst_payitem.find((item) => item.api_id === payitemId);
    if (!master) return apiError("Unknown pay item", 400, {}, 400);

    const price = input.body.api_price == null || input.body.api_price === ""
      ? master.api_price
      : num(input.body.api_price, -1);
    if (price !== master.api_price) return apiError("Pay item price mismatch", 400, {}, 400);

    const result = context.stateStore.addPendingPayItem(payitemId, count);
    if (!result.ok) return apiError(result.error, 400, {}, 400);
  }

  return apiOk({ api_check_value: 2 });
});

register("api_req_hensei/change", (input, context) => {
  const deckId = num(input.body.api_id, 1);
  const shipId = num(input.body.api_ship_id, -1);
  const deck = shipId === -2
    ? context.stateStore.clearDeckFollowerShips(deckId)
    : context.stateStore.changeDeckShip(deckId, num(input.body.api_ship_idx, 0), shipId);
  return apiOk(deck ? toDeck(deck) : {});
});
register("api_req_hensei/lock", (input, context) => apiOk({ api_locked: context.stateStore.toggleShipLock(num(input.body.api_ship_id, 1)) }));
register("api_req_hensei/combined", (input, context) => apiOk({ api_combined_flag: context.stateStore.setCombinedFleet(num(input.body.api_combined_type, 0)) }));
register("api_req_hensei/preset_register", (input, context) => {
  const preset = context.stateStore.registerPresetDeck(
    num(input.body.api_deck_id ?? input.body.api_id, 1),
    num(input.body.api_preset_no ?? input.body.api_preset_id, 1),
    str(input.body.api_name, "")
  );
  return preset ? apiOk(toPresetDeck(preset)) : apiError("Unknown deck or formation preset slot", 400, {}, 400);
});
register("api_req_hensei/preset_select", (input, context) => {
  const deckId = num(input.body.api_deck_id ?? input.body.api_id, 1);
  const result = context.stateStore.selectPresetDeck(
    num(input.body.api_preset_no ?? input.body.api_preset_id, 1),
    deckId
  );
  if (!result.ok) return apiError(result.error, 400, {}, 400);
  const deck = result.decks.find((item) => item.id === deckId);
  return deck ? apiOk(toDeck(deck)) : apiError("Unknown deck", 400, {}, 400);
});
register("api_req_hensei/preset_delete", (input, context) => {
  const deleted = context.stateStore.deletePresetDeck(num(input.body.api_preset_no ?? input.body.api_preset_id, 1));
  return deleted ? apiOk({}) : apiError("Unknown formation preset slot", 400, {}, 400);
});
register("api_req_hensei/preset_expand", (_input, context) => {
  const result = context.stateStore.expandPresetDecks();
  return result.ok ? apiOk({ api_max_num: result.maxNum }) : apiError(result.error, 400, {}, 400);
});
register("api_req_hensei/preset_lock", (input, context) => {
  const preset = context.stateStore.togglePresetDeckLock(num(input.body.api_preset_no ?? input.body.api_preset_id, 1));
  return preset ? apiOk({}) : apiError("Unknown formation preset slot", 400, {}, 400);
});
register("api_req_hensei/preset_order_change", (input, context) => {
  const swapped = context.stateStore.swapPresetDecks(
    num(input.body.api_preset_from, 1),
    num(input.body.api_preset_to, 1)
  );
  return swapped ? apiOk({}) : apiError("Unknown formation preset slot", 400, {}, 400);
});

register("api_req_hokyu/charge", (input, context) => {
  const supplied = context.stateStore.supplyShips(csvNums(input.body.api_id_items, [1]), {
    kind: normalizeSupplyKind(num(input.body.api_kind, 3)),
    refillAircraft: num(input.body.api_onslot, 1) === 1
  });
  const save = context.stateStore.getSave();
  return apiOk({
    api_ship: supplied.ships.map((ship) => toShip(ship, save.slotItems)),
    api_material: toMaterialValues(save.materials),
    api_use_bou: supplied.consumed.bauxite > 0 ? 1 : 0
  });
});

register("api_req_kaisou/slotset", (input, context) => {
  const save = context.stateStore.getSave();
  const shipId = num(input.body.api_id, 1);
  const slotIndex = Math.trunc(num(input.body.api_slot_idx, 0));
  const itemId = num(input.body.api_item_id, -1);
  const validation = validateSlotEquip(save, context.resourceManifest, shipId, slotIndex, itemId, "normal");
  if (!validation.ok) return apiError(validation.message, 400);
  const ship = context.stateStore.equipSlotItem(shipId, slotIndex, itemId);
  if (!ship) return apiError("Unknown ship", 404);
  const nextSave = context.stateStore.getSave();
  return apiOk({ ...toShip(ship, nextSave.slotItems), api_bauxite: nextSave.materials.bauxite });
});
register("api_req_kaisou/slotset_ex", (input, context) => {
  const save = context.stateStore.getSave();
  const shipId = num(input.body.api_id, 1);
  const itemId = num(input.body.api_item_id, -1);
  const validation = validateSlotEquip(save, context.resourceManifest, shipId, 0, itemId, "extra");
  if (!validation.ok) return apiError(validation.message, 400);
  const ship = context.stateStore.equipExSlotItem(shipId, itemId);
  return ship ? apiOk(toShip(ship, save.slotItems)) : apiError("Unknown ship", 404);
});
register("api_req_kaisou/unsetslot_all", (input, context) => {
  const save = context.stateStore.getSave();
  return apiOk(toShip(context.stateStore.unsetAllSlots(num(input.body.api_id ?? input.body.api_ship_id, 1))!, save.slotItems));
});
register("api_req_kaisou/slot_exchange_index", (input, context) => {
  const ship = context.stateStore.exchangeSlotIndex(
    num(input.body.api_id, 1),
    Math.trunc(num(input.body.api_src_idx ?? input.body.api_slot_idx, 0)),
    Math.trunc(num(input.body.api_dst_idx ?? input.body.api_change_idx, 1))
  );
  if (!ship) return apiError("Unknown ship", 404);
  const save = context.stateStore.getSave();
  const payload = toShip(ship, save.slotItems);
  return apiOk({ ...payload, api_ship_data: payload, api_bauxite: save.materials.bauxite });
});
register("api_req_kaisou/slot_deprive", (input, context) => {
  const save = context.stateStore.getSave();
  const unsetShipId = num(input.body.api_unset_ship, 1);
  const unsetIndex = Math.trunc(num(input.body.api_unset_idx, 0));
  const setShipId = num(input.body.api_set_ship, 1);
  const setIndex = Math.trunc(num(input.body.api_set_idx, 0));
  const unsetKind = slotKind(input.body.api_unset_slot_kind);
  const setKind = slotKind(input.body.api_set_slot_kind);
  const unsetShip = save.ships.find((ship) => ship.id === unsetShipId);
  const setShip = save.ships.find((ship) => ship.id === setShipId);
  const inferredItemId = slotItemIdAt(unsetShip, unsetIndex, unsetKind);
  const itemId = num(input.body.api_item_id, inferredItemId);
  const actualSetIndex = setKind === "extra" ? setIndex : firstAvailableOrdinarySlotIndex(setShip, setIndex);
  const displacedItemId = slotItemIdAt(setShip, actualSetIndex, setKind);
  if (itemId <= 0) return apiError("Unknown slot item", 400);
  const validation = validateSlotEquip(save, context.resourceManifest, setShipId, setIndex, itemId, setKind);
  if (!validation.ok) return apiError(validation.message, 400);
  const unset = unsetKind === "extra"
    ? context.stateStore.equipExSlotItem(unsetShipId, -1)
    : context.stateStore.equipSlotItem(unsetShipId, unsetIndex, -1);
  const set = setKind === "extra"
    ? context.stateStore.equipExSlotItem(setShipId, itemId)
    : context.stateStore.equipSlotItem(setShipId, setIndex, itemId);
  const nextSave = context.stateStore.getSave();
  const unsetPayload = unset ? toShip(unset, nextSave.slotItems) : null;
  const setPayload = set ? toShip(set, nextSave.slotItems) : null;
  return apiOk({
    api_ship_data: { api_unset_ship: unsetPayload, api_set_ship: setPayload },
    api_unset_ship: unsetPayload,
    api_set_ship: setPayload,
    ...(displacedItemId > 0 ? { api_unset_list: slotDepriveUnsetList(nextSave, displacedItemId) } : {}),
    api_bauxite: nextSave.materials.bauxite
  });
});
register("api_req_kaisou/lock", (input, context) => apiOk({ api_locked: context.stateStore.lockSlotItem(num(input.body.api_slotitem_id ?? input.body.api_item_id, 1)) }));
register("api_req_kaisou/marriage", (input, context) => {
  const result = context.stateStore.marryShip(num(input.body.api_id, 1), context.arsenalRandom);
  if (!result.ok) return apiError(result.error, 400, {}, 400);
  const save = context.stateStore.getSave();
  return apiOk(toShip(result.ship, save.slotItems));
});
register("api_req_kaisou/powerup", (input, context) => {
  const destroyConsumedEquipment = num(input.body.api_slot_dest_flag, 0) === 1;
  const result = context.stateStore.modernizeShip(
    num(input.body.api_id, 1),
    csvNums(input.body.api_id_items, []),
    { destroyConsumedEquipment }
  );
  const save = context.stateStore.getSave();
  return apiOk({
    api_powerup_flag: result ? 1 : 0,
    api_ship: result ? toShip(result.ship, save.slotItems) : null,
    api_deck: save.decks.map(toDeck),
    ...(result?.keptSlotItems ? { api_unset_list: toUnsetSlotItems(save) } : {})
  });
});
register("api_req_kaisou/remodeling", (input, context) => {
  const afterShipId = input.body.api_aftershipid == null ? undefined : num(input.body.api_aftershipid, 0);
  const shipId = num(input.body.api_id, 1);
  if (!remodelTargetHasDisplayResource(context, shipId, afterShipId)) return apiOk({ api_after_ship: null });
  const ship = context.stateStore.remodelShip(shipId, afterShipId);
  const save = context.stateStore.getSave();
  return apiOk({ api_after_ship: ship ? toShip(ship, save.slotItems) : null });
});
register("api_req_kaisou/preset_slot_register", (input, context) => {
  const preset = context.stateStore.registerPresetSlot(
    num(input.body.api_preset_id ?? input.body.api_preset_no, 1),
    num(input.body.api_ship_id ?? input.body.api_id, 1)
  );
  return preset ? apiOk({ api_preset_no: preset.presetNo }) : apiError("Unknown ship or equipment preset slot", 400, {}, 400);
});
register("api_req_kaisou/preset_slot_select", (input, context) => {
  const shipId = num(input.body.api_ship_id ?? input.body.api_id, 1);
  const save = context.stateStore.getSave();
  const result = context.stateStore.selectPresetSlot(
    num(input.body.api_preset_id ?? input.body.api_preset_no, 1),
    shipId,
    num(input.body.api_equip_mode, 1),
    (itemId, slotIndex, targetSlot) =>
      validateSlotEquip(save, context.resourceManifest, shipId, slotIndex, itemId, targetSlot).ok
  );
  if (!result.ok) return apiError(result.error, 400, {}, 400);

  const nextSave = context.stateStore.getSave();
  return apiOk({
    api_ship: [toShip(result.ship, nextSave.slotItems)],
    api_bauxite: result.materials.bauxite
  });
});
register("api_req_kaisou/preset_slot_delete", (input, context) => {
  const deleted = context.stateStore.deletePresetSlot(num(input.body.api_preset_id ?? input.body.api_preset_no, 1));
  return deleted ? apiOk({}) : apiError("Unknown equipment preset slot", 400, {}, 400);
});
register("api_req_kaisou/preset_slot_expand", (_input, context) => {
  const result = context.stateStore.expandPresetSlots();
  return result.ok ? apiOk({ api_max_num: result.maxNum }) : apiError(result.error, 400, {}, 400);
});
register("api_req_kaisou/preset_slot_update_name", (input, context) => {
  const preset = context.stateStore.renamePresetSlot(
    num(input.body.api_preset_id ?? input.body.api_preset_no, 1),
    str(input.body.api_name, "")
  );
  return preset ? apiOk({}) : apiError("Unknown equipment preset slot", 400, {}, 400);
});
register("api_req_kaisou/preset_slot_update_lock", (input, context) => {
  const preset = context.stateStore.togglePresetSlotLock(num(input.body.api_preset_id ?? input.body.api_preset_no, 1));
  return preset ? apiOk({}) : apiError("Unknown equipment preset slot", 400, {}, 400);
});
register("api_req_kaisou/preset_slot_update_exslot_flag", (input, context) => {
  const preset = context.stateStore.togglePresetSlotExFlag(num(input.body.api_preset_id ?? input.body.api_preset_no, 1));
  return preset ? apiOk({}) : apiError("Unknown equipment preset slot", 400, {}, 400);
});
register("api_req_kaisou/can_preset_slot_select", (_input, context) => {
  const save = context.stateStore.getSave();
  return apiOk({ api_flag: save.presetSlots.some(presetHasLoadout) ? 1 : 0 });
});

register("api_req_quest/start", (input, context) => {
  const started = context.stateStore.startQuest(num(input.body.api_quest_id, 101));
  return started ? apiOk(toQuestList(context.stateStore.getSave(), questListOptions(input))) : apiError("Quest is locked or unknown", 400);
});
register("api_req_quest/stop", (input, context) => {
  const stopped = context.stateStore.stopQuest(num(input.body.api_quest_id, 101));
  return stopped ? apiOk(toQuestList(context.stateStore.getSave(), questListOptions(input))) : apiError("Quest is unknown or already complete", 400);
});
register("api_req_quest/clearitemget", (input, context) => {
  const cleared = context.stateStore.clearQuest(num(input.body.api_quest_id, 101), selectedRewardNos(input));
  if (!cleared.ok) return apiError(cleared.error, 400);
  return apiOk({
    api_quest: toQuestList(cleared.save, questListOptions(input)),
    api_material: cleared.materialRewards,
    api_bounus: cleared.bonuses.map(toQuestBonus)
  });
});

register("api_req_furniture/change", (input, context) => {
  const patch = furnitureChangePatch(input.body);
  const save = context.stateStore.getSave();
  const owned = new Set(save.furniture.owned);
  for (const slot of FURNITURE_SLOT_ORDER) {
    const id = patch[slot];
    if (!owned.has(id)) return apiError(`Furniture ${id} is not owned`, 400);
    if (!furnitureMatchesSlot(id, slot)) return apiError(`Furniture ${id} does not fit ${slot}`, 400);
  }

  const bgmId = input.body.api_bgm_id == null ? -1 : num(input.body.api_bgm_id, -1);
  if (bgmId !== -1) context.stateStore.setPortBgm(normalizePortBgmId(bgmId, context.resourceManifest));

  return apiOk(toFurniture(context.stateStore.updateFurnitureSet(patch), context.resourceManifest));
});
register("api_req_furniture/buy", (input, context) => {
  const master = resolveFurniturePurchase(input.body);
  if (!master) return apiError("Unknown furniture", 400);
  if (num(input.body.api_discount_flag, 0) === 1) return apiError("Furniture craftsman discounts are not available", 400);
  if (master.api_price > 0 && master.api_saleflg !== 1) return apiError("Furniture is not on sale", 400);

  const current = context.stateStore.getSave().furniture;
  if (!current.owned.includes(master.api_id) && current.coins < master.api_price) {
    return apiError("Insufficient furniture coins", 400);
  }

  return apiOk(toFurniture(context.stateStore.buyFurniture(master.api_id, master.api_price), context.resourceManifest));
});
register("api_req_furniture/music_list", (_input, context) => apiOk(portBgmJukeboxMaster(context.resourceManifest)));
register("api_req_furniture/music_play", (_input, context) => apiOk({ api_coin: context.stateStore.getSave().furniture.coins }));
register("api_req_furniture/set_portbgm", (input, context) =>
  apiOk({ api_p_bgm_id: context.stateStore.setPortBgm(normalizePortBgmId(num(input.body.api_music_id ?? input.body.api_id, 0), context.resourceManifest)) })
);
register("api_req_furniture/radio_play", () => apiOk({ api_id: 0 }));

register("api_req_nyukyo/start", (input, context) => {
  const repair = context.stateStore.startRepair(
    num(input.body.api_ship_id, 1),
    num(input.body.api_ndock_id, 1),
    num(input.body.api_highspeed, 0) === 1
  );
  return repair.ok ? apiOk({ api_ndock_id: repair.dock.id }) : apiError(repair.error, 400);
});
register("api_req_nyukyo/speedchange", (input, context) => {
  const repair = context.stateStore.completeRepair(num(input.body.api_ndock_id ?? input.body.api_id, 1));
  if (!repair.ok) return apiError(repair.error, 400);
  return apiOk(toRepairDock(repair.dock, context.stateStore.getSave().ships));
});
register("api_req_nyukyo/open_new_dock", () => apiOk({ api_opened: 1 }));

register("api_req_kousyou/createitem", (input, context) => {
  const recipe = developmentRecipe(input.body);
  const attempts = num(input.body.api_multiple_flag, 0) === 1 ? 3 : 1;
  const arsenalContext = currentArsenalContext(context.stateStore.getSave());
  const resultMasterIds = Array.from({ length: attempts }, () =>
    rollDevelopment(recipe, arsenalContext, context.arsenalRandom())
  );
  const developed = context.stateStore.developEquipment(recipe, resultMasterIds);
  if (!developed.ok) return apiError(developed.error, 400);
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    context.stateStore.recordQuestEvent({ kind: "simple", subcategory: "equipment" });
  }
  const save = context.stateStore.getSave();
  const getItems = developed.items.map((item) =>
    item ? toSlotItem(item) : { api_id: -1, api_slotitem_id: -1 }
  );
  const firstItem = getItems.find((item) => item.api_id > 0) ?? null;
  const success = firstItem ? 1 : 0;
  return apiOk({
    api_create_flag: success,
    api_shizai_flag: success,
    api_slot_item: firstItem,
    api_get_items: getItems,
    api_unset_items: toUnsetSlotItems(save),
    api_material: toMaterialValues(developed.materials)
  });
});
register("api_req_kousyou/destroyitem2", (input, context) => {
  const itemIds = csvNums(input.body.api_slotitem_ids ?? input.body.api_slotitem_id, [1]);
  const materials = context.stateStore.destroySlotItem(itemIds);
  return apiOk({
    api_get_material: [itemIds.length, itemIds.length, itemIds.length * 2, 0],
    api_material: toMaterialValues(materials)
  });
});
register("api_req_kousyou/createship", (input, context) => {
  const recipe = constructionRecipe(input.body);
  const resultMasterId = rollConstruction(
    recipe,
    currentArsenalContext(context.stateStore.getSave()),
    context.arsenalRandom()
  );
  const started = context.stateStore.startBuild({
    dockId: num(input.body.api_kdock_id ?? input.body.api_id, 1),
    recipe,
    resultMasterId,
    highspeed: num(input.body.api_highspeed, 0) === 1
  });
  if (!started.ok) return apiError(started.error, 400);
  context.stateStore.recordQuestEvent({ kind: "simple", subcategory: "ship" });
  return apiOk({
    api_result: 1,
    api_kdock: toBuildDock(started.dock),
    api_material: toMaterialValues(context.stateStore.getSave().materials)
  });
});
register("api_req_kousyou/createship_speedchange", (input, context) => {
  const result = context.stateStore.speedBuild(num(input.body.api_kdock_id ?? input.body.api_id, 1));
  return result.ok ? apiOk({ api_kdock: toBuildDock(result.dock) }) : apiError(result.error, 400);
});
register("api_req_kousyou/getship", (input, context) => {
  const claimed = context.stateStore.claimBuild(num(input.body.api_kdock_id ?? input.body.api_id, 1));
  if (!claimed.ok) return apiError(claimed.error, 400);
  const save = context.stateStore.getSave();
  return apiOk({
    api_ship: toShip(claimed.ship, save.slotItems),
    api_kdock: claimed.docks.map(toBuildDock),
    api_slotitem: claimed.slotItems.map(toSlotItem)
  });
});
register("api_req_kousyou/destroyship", (input, context) => apiOk({ api_material: toMaterialValues(context.stateStore.destroyShip(csvNums(input.body.api_ship_id, [1]))) }));
register("api_req_kousyou/open_new_dock", () => apiOk({ api_opened: 1 }));
register("api_req_kousyou/remodel_slotlist", (_input, context) =>
  apiOk(remodelSlotListPayload(context.stateStore.getSave()))
);
register("api_req_kousyou/remodel_slotlist_detail", (input, context) => {
  const detail = remodelSlotDetailPayload(
    context.stateStore.getSave(),
    num(input.body.api_id, 0),
    num(input.body.api_slot_id, 0)
  );
  return detail.ok ? apiOk(detail.data) : apiError(detail.error, 400);
});
register("api_req_kousyou/remodel_slot", (input, context) => {
  const certain = num(input.body.api_certain_flag, 0) === 1;
  const prepared = prepareRemodelSlotExecution(
    context.stateStore.getSave(),
    num(input.body.api_id, 0),
    num(input.body.api_slot_id ?? input.body.api_item_id, 0),
    certain,
    certain ? 0 : context.arsenalRandom()
  );
  if (!prepared.ok) return apiError(prepared.error, 400);

  const applied = context.stateStore.applySlotImprovement(prepared.application);
  if (!applied.ok) return apiError(applied.error, 400);

  return apiOk({
    api_remodel_flag: prepared.success ? 1 : 0,
    api_after_slot: toSlotItem(applied.slotItem),
    api_use_slot_id: prepared.application.consumedSlotItemIds,
    api_after_material: toMaterialValues(applied.materials),
    api_remodel_id: prepared.remodelId,
    api_voice_ship_id: prepared.voiceShipId,
    api_voice_id: prepared.voiceId
  });
});

register("api_req_mission/start", (input, context) => {
  const started = context.stateStore.startExpedition(
    num(input.body.api_deck_id, 2),
    num(input.body.api_mission_id, 1),
    String(input.body.api_serial_cid ?? "")
  );
  if (!started.ok) return apiError(started.error, 400);
  return apiOk({
    api_complatetime: started.run.completeAt,
    api_complatetime_str: new Date(started.run.completeAt).toISOString(),
    api_expired_flag: 0
  });
});
register("api_req_mission/result", (input, context) => {
  const claimed = context.stateStore.claimExpedition(num(input.body.api_deck_id, 2));
  if (!claimed.ok) return apiError(claimed.error, 400);
  const result = claimed.result as Record<string, any>;
  const items = Array.isArray(result.items) ? result.items : [];
  const reward = (index: number) => {
    const item = items[index];
    return item
      ? {
          api_useitem_id: Number(item.itemId),
          api_useitem_count: Number(item.count),
          api_useitem_name: String(item.name ?? "")
        }
      : {};
  };
  return apiOk({
    api_quest_name: String(result.questName ?? ""),
    api_clear_result: Number(result.clearResult ?? 0),
    api_get_exp: Number(result.getExp ?? 0),
    api_member_lv: Number(result.memberLevel ?? 1),
    api_member_exp: Number(result.memberExp ?? 0),
    api_get_material: Array.isArray(result.materials) ? result.materials : [0, 0, 0, 0],
    api_ship_id: Array.isArray(result.shipIds) ? result.shipIds : [],
    api_useitem_flag: [items[0] ? 1 : 0, items[1] ? 1 : 0],
    api_get_item1: reward(0),
    api_get_item2: reward(1),
    api_material: toMaterials(context.stateStore.getSave().materials)
  });
});
register("api_req_mission/return_instruction", (input, context) => {
  const recalled = context.stateStore.recallExpedition(num(input.body.api_deck_id, 2));
  return recalled.ok
    ? apiOk({ api_mission: recalled.mission })
    : apiError(recalled.error, 400);
});

register("api_req_map/start", (input, context) => {
  const session = context.stateStore.startSortie(num(input.body.api_deck_id, 1), num(input.body.api_maparea_id, 1), num(input.body.api_mapinfo_no, 1));
  if (!session) return apiError("Unknown or locked sortie map", 400);
  return apiOk(mapNode(
    context.resourceManifest,
    session.areaId,
    session.mapNo,
    session.node,
    0,
    true,
    context.stateStore.previewSortieRoute()
  ));
});
register("api_req_map/next", (input, context) => {
  const previousNode = context.stateStore.getSave().sortieSession?.node ?? 0;
  const selected = input.body.api_cell_id == null || input.body.api_cell_id === ""
    ? undefined
    : num(input.body.api_cell_id, -1);
  try {
    const session = context.stateStore.nextSortieNode(selected);
    return apiOk(session
      ? mapNode(
          context.resourceManifest,
          session.areaId,
          session.mapNo,
          session.node,
          previousNode,
          false,
          context.stateStore.previewSortieRoute()
        )
      : mapNode(context.resourceManifest, 1, 1, 1, 0));
  } catch (error) {
    return apiError(error instanceof Error ? error.message : "Invalid sortie route selection", 400, {}, 400);
  }
});
register("api_req_sortie/battle", (input, context) => apiOk(recordedBattlePayload(input, context, endpointKind("api_req_sortie/battle"))));
register("api_req_battle_midnight/battle", (input, context) => apiOk(recordedNightBattlePayload(input, context)));
register("api_req_battle_midnight/sp_midnight", (input, context) => apiOk(recordedNightBattlePayload(input, context)));
register("api_req_sortie/night_to_day", (input, context) => apiOk(recordedBattlePayload(input, context, endpointKind("api_req_sortie/night_to_day"))));
register("api_req_sortie/airbattle", (input, context) => apiOk(airBattlePayload(input, context, endpointKind("api_req_sortie/airbattle"))));
register("api_req_sortie/ld_airbattle", (input, context) => apiOk(airBattlePayload(input, context, endpointKind("api_req_sortie/ld_airbattle"))));
register("api_req_sortie/ld_shooting", (input, context) => apiOk(recordedBattlePayload(input, context, endpointKind("api_req_sortie/ld_shooting"))));
register("api_req_sortie/battleresult", (_input, context) => {
  const applied = context.stateStore.applySortieBattleResult();
  if (applied.record) return apiOk(battleResultPayload(applied.record as unknown as BattleRecord));

  const battle = createSortieBattle(context.stateStore.getSave(), {});
  context.stateStore.recordSortieBattle(battle.record as unknown as Record<string, unknown>);
  const generated = context.stateStore.applySortieBattleResult();
  return apiOk(battleResultPayload((generated.record ?? battle.record) as unknown as BattleRecord));
});
register("api_req_sortie/goback_port", (_input, context) => {
  context.stateStore.clearSortie();
  return apiOk(toPort(context.stateStore.getSave(), context.resourceManifest));
});
register("api_req_map/anchorage_repair", () => apiOk({ api_repair_flag: 0 }));
register("api_req_map/select_eventmap_rank", (input, context) => {
  const result = context.stateStore.selectEventMapRank(
    num(input.body.api_maparea_id, 0),
    num(input.body.api_map_no ?? input.body.api_mapinfo_no, 0),
    num(input.body.api_rank, 3)
  );
  if (!result.ok) return apiError(result.error, 400, {}, 400);
  const rank = eventRankDefinition(result.eventMap, result.rank);
  return apiOk({
    api_maphp: {
      api_gauge_num: 1,
      api_gauge_type: 1,
      api_max_maphp: rank.maxMapHp,
      api_now_maphp: result.map.gauge
    },
    api_s_no: result.map.cleared,
    api_m10: 0,
    api_sally_flag: [...result.eventMap.sallyFlag],
    api_air_base_decks: result.eventMap.airBaseDecks,
    api_select_rank: result.rank
  });
});
register("api_req_map/start_air_base", (input, context) => {
  const areaId = num(input.body.api_area_id ?? input.body.api_maparea_id, 1);
  const airBases = context.stateStore.openAirBaseArea(areaId);
  const save = context.stateStore.getSave();
  return apiOk({
    api_result: 1,
    api_area_id: Math.max(1, Math.trunc(areaId)),
    api_air_base: airBases.map((base) => toAirBase(base, save.slotItems))
  });
});

register("api_req_air_corps/set_plane", (input, context) => {
  const areaId = num(input.body.api_area_id, 1);
  const baseId = num(input.body.api_base_id, 1);
  const squadronId = num(input.body.api_squadron_id, 1);
  const itemId = num(input.body.api_item_id, -1);
  const result = context.stateStore.setAirBasePlane(areaId, baseId, squadronId, itemId);
  if (!result.ok) return apiError(result.error, 400, {}, 400);
  return apiOk(airBaseMutationPayload(result.airBase, result.materials, context.stateStore.getSave().slotItems));
});

register("api_req_air_corps/set_action", (input, context) => {
  const areaId = num(input.body.api_area_id, 1);
  const baseId = num(input.body.api_base_id, 1);
  const actionKind = num(input.body.api_action_kind, 0);
  const result = context.stateStore.setAirBaseAction(areaId, baseId, actionKind);
  if (!result.ok) return apiError(result.error, 400, {}, 400);
  return apiOk({
    ...airBaseMutationPayload(result.airBase, result.materials, context.stateStore.getSave().slotItems),
    api_area_id: result.airBase.areaId,
    api_base_id: result.airBase.baseId,
    api_action_kind: result.airBase.actionKind
  });
});

register("api_req_air_corps/supply", (input, context) => {
  const areaId = num(input.body.api_area_id, 1);
  const baseId = num(input.body.api_base_id, 1);
  const result = context.stateStore.supplyAirBase(areaId, baseId);
  if (!result.ok) return apiError(result.error, 400, {}, 400);
  return apiOk(airBaseMutationPayload(result.airBase, result.materials, context.stateStore.getSave().slotItems));
});

for (const path of [
  "api_req_combined_battle/battle",
  "api_req_combined_battle/battle_water",
  "api_req_combined_battle/each_battle",
  "api_req_combined_battle/each_battle_water",
  "api_req_combined_battle/airbattle",
  "api_req_combined_battle/ld_airbattle",
  "api_req_combined_battle/ld_shooting",
  "api_req_combined_battle/midnight_battle",
  "api_req_combined_battle/sp_midnight",
  "api_req_combined_battle/ec_battle",
  "api_req_combined_battle/ec_midnight_battle",
  "api_req_combined_battle/ec_night_to_day",
  "api_req_combined_battle/battleresult",
  "api_req_combined_battle/goback_port",
  "api_req_air_corps/change_name",
  "api_req_air_corps/cond_recovery",
  "api_req_air_corps/change_deployment_base",
  "api_req_air_corps/expand_base",
  "api_req_air_corps/expand_maintenance_level",
  "api_req_member/get_practice_enemyinfo",
  "api_req_practice/battle",
  "api_req_practice/midnight_battle",
  "api_req_practice/battle_result",
  "api_req_practice/change_matching_kind"
]) {
  register(path, () => apiOk({ api_disabled: 1, api_message: "Local placeholder" }));
}

register("api_req_member/get_practice_enemyinfo", (input, context) =>
  apiOk(practiceEnemyInfoPayload(num(input.body.api_member_id, 1), context.stateStore.practiceBatch(practiceBatchOptions(context)).rivals))
);
register("api_req_practice/battle", (input, context) => apiOk(recordedPracticeBattlePayload(input, context)));
register("api_req_practice/midnight_battle", (_input, context) => apiOk(recordedPracticeNightBattlePayload(context)));
register("api_req_practice/battle_result", (_input, context) => {
  const applied = context.stateStore.applyPracticeBattleResult();
  if (applied.record) return apiOk(battleResultPayload(applied.record as unknown as BattleRecord));

  const battle = createPracticeBattle(context.stateStore.getSave(), {
    practiceRivals: context.stateStore.practiceBatch(practiceBatchOptions(context)).rivals
  });
  context.stateStore.recordPracticeBattle(battle.record as unknown as Record<string, unknown>);
  const generated = context.stateStore.applyPracticeBattleResult();
  return apiOk(battleResultPayload((generated.record ?? battle.record) as unknown as BattleRecord));
});

register("api_req_combined_battle/battle", (input, context) => apiOk(recordedCombinedBattlePayload(input, context, endpointKind("api_req_combined_battle/battle"))));
register("api_req_combined_battle/battle_water", (input, context) => apiOk(recordedCombinedBattlePayload(input, context, endpointKind("api_req_combined_battle/battle_water"))));
register("api_req_combined_battle/each_battle", (input, context) => apiOk(recordedCombinedBattlePayload(input, context, endpointKind("api_req_combined_battle/each_battle"))));
register("api_req_combined_battle/each_battle_water", (input, context) => apiOk(recordedCombinedBattlePayload(input, context, endpointKind("api_req_combined_battle/each_battle_water"))));
register("api_req_combined_battle/airbattle", (input, context) => apiOk(combinedAirBattlePayload(input, context, endpointKind("api_req_combined_battle/airbattle"))));
register("api_req_combined_battle/ld_airbattle", (input, context) => apiOk(combinedAirBattlePayload(input, context, endpointKind("api_req_combined_battle/ld_airbattle"))));
register("api_req_combined_battle/ld_shooting", (input, context) => apiOk(recordedCombinedBattlePayload(input, context, endpointKind("api_req_combined_battle/ld_shooting"))));
register("api_req_combined_battle/midnight_battle", (_input, context) => apiOk(recordedCombinedNightBattlePayload(context)));
register("api_req_combined_battle/sp_midnight", (_input, context) => apiOk(recordedCombinedNightBattlePayload(context)));
register("api_req_combined_battle/ec_battle", (input, context) => apiOk(recordedCombinedBattlePayload(input, context, endpointKind("api_req_combined_battle/ec_battle"))));
register("api_req_combined_battle/ec_midnight_battle", (_input, context) => apiOk(recordedCombinedNightBattlePayload(context)));
register("api_req_combined_battle/ec_night_to_day", (input, context) => apiOk(recordedCombinedBattlePayload(input, context, endpointKind("api_req_combined_battle/ec_night_to_day"))));
register("api_req_combined_battle/battleresult", (_input, context) => {
  const applied = context.stateStore.applyCombinedBattleResult();
  if (applied.record) return apiOk(battleResultPayload(applied.record as unknown as BattleRecord));

  const battle = createCombinedBattle(context.stateStore.getSave(), {});
  context.stateStore.recordCombinedBattle(battle.record as unknown as Record<string, unknown>);
  const generated = context.stateStore.applyCombinedBattleResult();
  return apiOk(battleResultPayload((generated.record ?? battle.record) as unknown as BattleRecord));
});
register("api_req_combined_battle/goback_port", (_input, context) => {
  context.stateStore.clearSortie();
  return apiOk(toPort(context.stateStore.getSave(), context.resourceManifest));
});

export function isKnownKcsApi(path: string) {
  return handlers.has(normalizeApiPath(path));
}

export async function handleKcsApi(input: HandlerInput, context: HandlerContext) {
  const path = normalizeApiPath(input.path);
  const handler = handlers.get(path);
  if (handler) return handler({ ...input, path }, context);

  await recordUnknown(input, context);
  return apiError(`Unknown local Kancolle API: ${input.path}`, 404);
}

export function requestToHandlerInput(request: FastifyRequest): HandlerInput {
  const wildcard = (request.params as Record<string, string | undefined>)["*"];
  const body = parseApiPayload(request.body) as Record<string, unknown>;
  return {
    method: request.method,
    path: normalizeApiPath(wildcard || request.url.replace(/^\/kcsapi\//, "").split("?")[0]),
    query: request.query as Record<string, unknown>,
    body
  };
}

function register(path: string, handler: KcsHandler) {
  handlers.set(normalizeApiPath(path), handler);
}

function normalizeApiPath(path: string) {
  return path.replace(/^\/+/, "").replace(/^kcsapi\//, "").replace(/\/+$/, "");
}

function questListOptions(input: HandlerInput) {
  const pageNo = input.body.api_page_no ?? input.body.api_page ?? input.body.api_pageno ??
    input.query.api_page_no ?? input.query.api_page ?? input.query.api_pageno;
  return {
    tabId: num(input.body.api_tab_id ?? input.query.api_tab_id, 0),
    ...(pageNo == null || pageNo === "" ? {} : { pageNo: num(pageNo, 1) })
  };
}

function selectedRewardNos(input: HandlerInput) {
  const values: number[] = [];
  for (let index = 1; index <= 4; index += 1) {
    const key = index === 1 ? "api_select_no" : `api_select_no${index}`;
    if (input.body[key] != null && input.body[key] !== "") values.push(num(input.body[key], 1));
  }
  return values;
}

function toQuestBonus(bonus: { type: number; name: string; count: number; item?: Record<string, unknown> }) {
  return {
    api_type: bonus.type,
    api_count: bonus.count,
    api_name: bonus.name,
    api_item: bonus.item ?? {}
  };
}

function presetDeckPayload(save: SaveState) {
  const apiDeck: Record<string, ReturnType<typeof toPresetDeck>> = {};
  for (const preset of save.presetDecks) {
    apiDeck[String(preset.presetNo)] = toPresetDeck(preset);
  }
  return {
    api_max_num: save.presetDeckSettings.maxNum,
    api_deck: apiDeck
  };
}

function toPresetDeck(preset: PresetDeck) {
  return {
    api_preset_no: preset.presetNo,
    api_name: preset.name,
    api_ship: preset.shipIds,
    api_lock_flag: preset.locked
  };
}

function presetSlotPayload(save: SaveState) {
  return {
    api_max_num: save.presetSlotSettings.maxNum,
    api_preset_items: save.presetSlots.map(toPresetSlot)
  };
}

function toPresetSlot(preset: PresetSlot) {
  return {
    api_preset_no: preset.presetNo,
    api_name: preset.name,
    api_slot_item: preset.slotItems.map(toPresetSlotItem),
    api_slot_item_ex: preset.exSlotItem ? toPresetSlotItem(preset.exSlotItem) : null,
    api_slot_ex_flag: preset.exSlotFlag,
    api_lock_flag: preset.locked,
    api_selected_mode: preset.selectedMode
  };
}

function toPresetSlotItem(item: PresetSlotItem) {
  return {
    api_id: item.masterId,
    api_level: item.level
  };
}

function presetHasLoadout(preset: PresetSlot) {
  return preset.slotItems.length > 0 || (preset.exSlotFlag === 0 && preset.exSlotItem != null);
}

async function recordUnknown(input: HandlerInput, context: HandlerContext) {
  mkdirSync(dirname(context.unknownLogPath), { recursive: true });
  await appendFile(
    context.unknownLogPath,
    `${JSON.stringify({ time: new Date().toISOString(), method: input.method, path: `/kcsapi/${input.path}`, query: input.query, body: input.body })}\n`
  );
}

function activeEventAreaId(context: HandlerContext) {
  return typeof context.stateStore.getActiveEventAreaId === "function"
    ? context.stateStore.getActiveEventAreaId()
    : null;
}

function masterDataWithResources(resourceManifest: ResourceManifest, activeEventAreaId: number | null = null) {
  const rawShips = buildShipMasters(resourceManifest);
  const shipIds = new Set(rawShips.map((ship) => ship.api_id));
  const ships = sanitizeShipRemodelTargets(rawShips, shipIds, resourceManifest);
  const slotItems = buildSlotMasters(resourceManifest);
  const mapInfos = mapInfoMasters(resourceManifest, activeEventAreaId);
  return {
    ...masterData,
    api_mst_ship: ships,
    api_mst_shipupgrade: shipUpgradesForAvailableShips(masterData.api_mst_shipupgrade, shipIds),
    api_mst_stype: buildShipTypes(slotItems),
    api_mst_slotitem: slotItems,
    api_mst_slotitem_equiptype: buildSlotEquipTypes(slotItems),
    api_mst_shipgraph: shipGraph(resourceManifest, ships),
    api_mst_furnituregraph: furnitureGraph(resourceManifest),
    api_mst_bgm: bgmMaster(resourceManifest),
    api_mst_mission: expeditionMasters(activeEventAreaId),
    api_mst_maparea: mapAreaMasters(mapInfos, activeEventAreaId),
    api_mst_mapinfo: mapInfos,
    api_mst_mapbgm: mapBgmMasters(resourceManifest, mapInfos),
    api_mst_mapcell: mapCellMasters(resourceManifest, mapInfos)
  };
}

function sanitizeShipRemodelTargets(ships: ShipMaster[], shipIds: Set<number>, resourceManifest: ResourceManifest) {
  return ships.map((ship) => {
    const targetId = Math.trunc(num(ship.api_aftershipid, 0));
    if (targetId <= 0 || (shipIds.has(targetId) && shipHasDisplayResource(resourceManifest, targetId))) return ship;
    return {
      ...ship,
      api_aftershipid: 0,
      api_afterlv: 0,
      api_afterfuel: 0,
      api_afterbull: 0
    };
  });
}

function shipUpgradesForAvailableShips(shipUpgrades: ShipUpgradeMaster[], shipIds: Set<number>) {
  return shipUpgrades.filter((upgrade) => {
    const targetId = Math.trunc(num(upgrade.api_id, 0));
    const currentId = Math.trunc(num(upgrade.api_current_ship_id, 0));
    return shipIds.has(targetId) && (currentId === 0 || shipIds.has(currentId));
  });
}

function remodelTargetHasDisplayResource(context: HandlerContext, shipId: number, requestedMasterId?: number) {
  const ship = context.stateStore.getSave().ships.find((item) => item.id === shipId);
  if (!ship) return false;
  const targetId = remodelTargetIdForRequest(ship.masterId, requestedMasterId);
  return targetId > 0 && shipHasDisplayResource(context.resourceManifest, targetId);
}

function remodelTargetIdForRequest(currentMasterId: number, requestedMasterId?: number) {
  const currentMaster = masterData.api_mst_ship.find((ship) => ship.api_id === currentMasterId);
  if (!currentMaster) return 0;

  const normalTargetId = Math.trunc(num(currentMaster.api_aftershipid, 0));
  const requested = Math.trunc(num(requestedMasterId, 0));
  if (requested <= 0) return normalTargetId;
  if (requested === normalTargetId) return requested;

  const specialTarget = masterData.api_mst_shipupgrade.some(
    (upgrade) =>
      Math.trunc(num(upgrade.api_current_ship_id, 0)) === currentMasterId &&
      Math.trunc(num(upgrade.api_id, 0)) === requested
  );
  return specialTarget ? requested : 0;
}

function shipGraph(resourceManifest: ResourceManifest, ships: ShipMaster[]) {
  return ships.map((ship) => {
    const file =
      resourceManifest.ship.full.get(ship.api_id) ||
      resourceManifest.ship.card.get(ship.api_id) ||
      resourceManifest.ship.albumStatus.get(ship.api_id) ||
      resourceManifest.ship.banner.get(ship.api_id);

    const offsets = shipGraphOffsets[ship.api_id];
    const zero = [0, 0] as [number, number];

    return {
      api_id: ship.api_id,
      api_sortno: ship.api_sortno,
      api_filename: offsets?.f || file?.filename || file?.frame || String(ship.api_id),
      api_version: Array(5).fill(file?.version || "1"),
      api_boko_n: offsets?.bn || zero,
      api_boko_d: offsets?.bd || zero,
      api_kaisyu_n: offsets?.kn || zero,
      api_kaisyu_d: offsets?.kd || zero,
      api_kaizo_n: offsets?.zn || zero,
      api_kaizo_d: offsets?.zd || zero,
      api_map_n: offsets?.mn || zero,
      api_map_d: offsets?.md || zero,
      api_ensyuf_n: offsets?.en || zero,
      api_ensyuf_d: offsets?.ed || zero,
      api_ensyue_n: offsets?.ee || zero,
      api_battle_n: offsets?.rn || zero,
      api_battle_d: offsets?.rd || zero,
      api_weda: offsets?.wa || zero,
      api_wedb: offsets?.wb || zero,
      api_pa: offsets?.pa || zero,
      api_pab: offsets?.pb || zero
    };
  });
}

function pictureBookList(input: HandlerInput, resourceManifest: ResourceManifest, save: SaveState) {
  const type = num(input.body.api_type ?? input.query.api_type, 1);
  const startNo = num(input.body.api_no ?? input.query.api_no, 1);

  if (type === 1) {
    const marriedMasterIds = new Set(save.ships.filter((ship) => ship.marriedAt > 0).map((ship) => ship.masterId));
    return shipPictureBookPage(resourceManifest, startNo, marriedMasterIds);
  }
  if (type === 2) return slotPictureBookPage(resourceManifest, startNo);
  return [];
}

function furnitureChangePatch(body: Record<string, unknown>): Record<FurnitureSlotKey, number> {
  return {
    api_floor: num(body.api_floor ?? body.api_floor_id, DEFAULT_FURNITURE_SET.api_floor),
    api_wall: num(body.api_wallpaper ?? body.api_wall_id, DEFAULT_FURNITURE_SET.api_wall),
    api_window: num(body.api_window ?? body.api_window_id, DEFAULT_FURNITURE_SET.api_window),
    api_object: num(body.api_wallhanging ?? body.api_object_id, DEFAULT_FURNITURE_SET.api_object),
    api_chest: num(body.api_shelf ?? body.api_chest_id, DEFAULT_FURNITURE_SET.api_chest),
    api_desk: num(body.api_desk ?? body.api_desk_id, DEFAULT_FURNITURE_SET.api_desk)
  };
}

function resolveFurniturePurchase(body: Record<string, unknown>) {
  if (body.api_id != null) return furnitureMasterById(num(body.api_id, 0));
  return furnitureMasterByTypeNo(num(body.api_type, -1), num(body.api_no, -1));
}

function furnitureGraph(resourceManifest: ResourceManifest) {
  const ids = new Set<number>([
    ...resourceManifest.furniture.normal.keys(),
    ...resourceManifest.furniture.movable.keys(),
    ...resourceManifest.furniture.scripts.keys(),
    ...resourceManifest.furniture.thumbnail.keys()
  ]);

  return [...ids]
    .sort((a, b) => a - b)
    .map((id) => {
      const master = furnitureMasterById(id);
      const file =
        resourceManifest.furniture.normal.get(id) ||
        resourceManifest.furniture.scripts.get(id) ||
        resourceManifest.furniture.movable.get(id) ||
        resourceManifest.furniture.thumbnail.get(id);
      return {
        api_id: id,
        api_no: master?.api_no ?? id,
        api_type: master?.api_type ?? Math.max(0, (id - 1) % 6),
        api_filename: file?.frame ?? String(id),
        api_version: file?.version ?? "1"
      };
    });
}

function bgmMaster(resourceManifest: ResourceManifest) {
  const bgms = new Map<number, ReturnType<typeof bgmEntry>>();
  for (const bgm of resourceManifest.bgm.port.values()) {
    if (bgm.id > 0) bgms.set(bgm.id, bgmEntry(bgm, bgm.id === DEFAULT_PORT_BGM_ID ? "母港" : "Port"));
  }
  for (const bgm of resourceManifest.bgm.battle.values()) {
    if (!bgms.has(bgm.id)) bgms.set(bgm.id, bgmEntry(bgm, "Battle"));
  }
  for (const bgm of resourceManifest.bgm.fanfare.values()) {
    if (!bgms.has(bgm.id)) bgms.set(bgm.id, bgmEntry(bgm, "Fanfare"));
  }
  return [...bgms.values()].sort((a, b) => a.api_id - b.api_id);
}

function portBgmMaster(resourceManifest: ResourceManifest) {
  return [...resourceManifest.bgm.port.values()]
    .filter((bgm) => bgm.id > 0)
    .sort((a, b) => a.id - b.id)
    .map((bgm) => bgmEntry(bgm, bgm.id === DEFAULT_PORT_BGM_ID ? "母港" : "Port"));
}

function portBgmJukeboxMaster(resourceManifest: ResourceManifest) {
  return [...resourceManifest.bgm.port.values()]
    .filter((bgm) => bgm.id > 0)
    .sort((a, b) => a.id - b.id)
    .map((bgm) => {
      const label = bgm.id === DEFAULT_PORT_BGM_ID ? "母港" : `Local Port BGM ${String(bgm.id).padStart(3, "0")}`;
      return {
        api_id: bgm.id,
        api_name: label,
        api_description: "",
        api_bgm_id: bgm.id,
        api_use_coin: 0,
        api_bgm_flag: 1,
        api_loops: 1
      };
    });
}

function bgmEntry(bgm: ResourceManifest["bgm"]["port"] extends Map<number, infer T> ? T : never, label: string) {
  return {
    api_id: bgm.id,
    api_name: label === "母港" ? label : `Local ${label} BGM ${String(bgm.id).padStart(3, "0")}`,
    api_filename: bgm.frame,
    api_rarity: 1
  };
}

function chartAdditionalInfo(save: SaveState) {
  const deckCount = save.decks.length > 0 ? save.decks.length : 4;
  return {
    api_deck_param: Array.from({ length: deckCount }, () => ({
      api_seiku_value: 0,
      api_tp_value: 0,
      api_atp_value: {}
    }))
  };
}

function mapInfoMasters(resourceManifest: ResourceManifest, activeEventAreaId: number | null = null) {
  const cacheBackedIds = new Set(resourceManifest.map.thumbnail.keys());
  const normalMaps = masterData.api_mst_mapinfo.filter((map) => cacheBackedIds.has(map.api_id));
  return activeEventAreaId == null
    ? normalMaps
    : [...normalMaps, ...eventMapMasters(activeEventAreaId, resourceManifest)];
}

function mapAreaMasters(mapInfos: typeof masterData.api_mst_mapinfo, activeEventAreaId: number | null = null) {
  const areaIds = new Set(mapInfos.map((map) => map.api_maparea_id));
  const normalAreas = masterData.api_mst_maparea.filter((area) => areaIds.has(area.api_id));
  const event = activeEventAreaId == null ? undefined : eventDefinition(activeEventAreaId);
  return event && areaIds.has(event.areaId)
    ? [...normalAreas, { api_id: event.areaId, api_name: event.name, api_type: 1 }]
    : normalAreas;
}

function mapBgmMasters(resourceManifest: ResourceManifest, mapInfos: typeof masterData.api_mst_mapinfo) {
  const defaultMoving = firstExistingBattleBgm(resourceManifest, [154, 1]);
  const defaultMap = existingBattleBgmPair(resourceManifest, [155, 2], [1, 2]);
  const defaultBoss = existingBattleBgmPair(resourceManifest, [156, 156], [2, 2]);
  return mapInfos.map((map) => ({
    ...(eventMapBgm(map) ?? {
      api_id: map.api_id,
      api_maparea_id: map.api_maparea_id,
      api_no: map.api_no,
      api_moving_bgm: defaultMoving,
      api_map_bgm: map.api_id === 11 ? defaultMap : existingBattleBgmPair(resourceManifest, [1, 2], defaultMap),
      api_boss_bgm: map.api_id === 11 ? defaultBoss : existingBattleBgmPair(resourceManifest, [2, 2], defaultBoss)
    })
  }));
}

function existingBattleBgmPair(resourceManifest: ResourceManifest, preferred: [number, number], fallback: [number, number]) {
  return [firstExistingBattleBgm(resourceManifest, [preferred[0], fallback[0], 1]), firstExistingBattleBgm(resourceManifest, [preferred[1], fallback[1], 2, 1])] as [
    number,
    number
  ];
}

function firstExistingBattleBgm(resourceManifest: ResourceManifest, ids: number[]) {
  for (const id of ids) {
    if (id > 0 && resourceManifest.bgm.battle.has(id)) return id;
  }
  return [...resourceManifest.bgm.battle.keys()].filter((id) => id > 0).sort((a, b) => a - b)[0] ?? 1;
}

function eventMapBgm(map: { api_id: number; api_maparea_id: number; api_no: number }) {
  const eventMap = eventDefinition(map.api_maparea_id)?.maps.find((candidate) => candidate.id === map.api_id);
  return eventMap ? eventMapBgmMaster(eventMap) : null;
}

function mapCellMasters(resourceManifest: ResourceManifest, mapInfos: typeof masterData.api_mst_mapinfo) {
  return mapInfos.flatMap((map) => {
    const spots = mapSpots(resourceManifest, map.api_maparea_id, map.api_no);
    const fallbackBossCellNo = eventBossNodeNo(map.api_maparea_id, map.api_no) ?? sortieBossNodeNo(map.api_maparea_id, map.api_no) ?? lastCellNo(spots);
    return spots.map((spot) => ({
      api_id: map.api_id * 100 + spot.no,
      api_maparea_id: map.api_maparea_id,
      api_mapinfo_no: map.api_no,
      api_no: spot.no,
      api_color_no: mapCellColorFor(map.api_maparea_id, map.api_no, spot.no, fallbackBossCellNo)
    }));
  });
}

function recipeDelta(body: Record<string, unknown>) {
  return {
    fuel: num(body.api_item1, 0),
    ammo: num(body.api_item2, 0),
    steel: num(body.api_item3, 0),
    bauxite: num(body.api_item4, 0)
  };
}

function constructionRecipe(body: Record<string, unknown>): ConstructionRecipe {
  return {
    ...recipeDelta(body),
    devmat: num(body.api_item5, 1),
    large: num(body.api_large_flag, 0) === 1
  };
}

function developmentRecipe(body: Record<string, unknown>): DevelopmentRecipe {
  return recipeDelta(body);
}

function currentArsenalContext(save: SaveState): ArsenalContext {
  const firstDeck = save.decks.find((deck) => deck.id === 1) ?? save.decks[0];
  const preferredIndex = Math.max(0, save.player.flagshipPosition - 1);
  const secretaryId = firstDeck?.shipIds[preferredIndex] > 0
    ? firstDeck.shipIds[preferredIndex]
    : firstDeck?.shipIds.find((shipId) => shipId > 0);
  const secretaryMasterId = save.ships.find((ship) => ship.id === secretaryId)?.masterId ?? 9;
  return { secretaryMasterId, playerLevel: save.player.level };
}

function mapNode(
  resourceManifest: ResourceManifest,
  areaId: number,
  mapNo: number,
  node: number,
  fromNo: number,
  includeCells = false,
  nextRoute: RouteEvaluation | null = null
) {
  const spots = mapSpots(resourceManifest, areaId, mapNo);
  const lastMapCellNo = lastCellNo(spots);
  const bossCellNo = eventBossNodeNo(areaId, mapNo) ?? sortieBossNodeNo(areaId, mapNo) ?? lastMapCellNo;
  const currentNode = node > 0 ? node : firstSortieCellNo(spots);
  const sortieNode = eventSortieNodeData(areaId, mapNo, currentNode) ?? sortieNodeData(areaId, mapNo, currentNode);
  const routingNode = routingNodeData(areaId, mapNo, currentNode);
  const colorNo = sortieNode?.colorNo ?? routingNode?.colorNo ?? mapCellColor(currentNode, bossCellNo);
  return {
    api_rashin_flg: 1,
    api_rashin_id: 1,
    api_maparea_id: areaId,
    api_mapinfo_no: mapNo,
    api_no: currentNode,
    api_from_no: fromNo,
    api_color_no: colorNo,
    api_event_id: sortieNode?.eventId ?? routingNode?.eventId ?? (currentNode === bossCellNo ? 5 : 4),
    api_event_kind: currentNode === 0 ? 0 : sortieNode ? (sortieNode.combat ? 1 : 0) : routingNode?.eventKind ?? 0,
    api_next: nextRoute?.kind === "route" ? nextRoute.edgeNo : 0,
    api_bosscell_no: bossCellNo,
    api_select_route: nextRoute?.kind === "select"
      ? { api_select_cells: nextRoute.edgeNos }
      : null,
    ...(includeCells ? { api_cell_data: cellData(spots, areaId, mapNo, bossCellNo) } : {})
  };
}

function mapSpots(resourceManifest: ResourceManifest, areaId: number, mapNo: number) {
  const mapId = mapMasterId(areaId, mapNo);
  const spots = resourceManifest.map.spots.get(mapId);
  if (spots && spots.length > 0) return spots;
  return [{ no: 0 }, { no: 1 }];
}

function cellData(spots: { no: number }[], areaId: number, mapNo: number, bossCellNo: number) {
  return spots.map((spot) => ({
    api_no: spot.no,
    api_color_no: mapCellColorFor(areaId, mapNo, spot.no, bossCellNo)
  }));
}

function firstSortieCellNo(spots: { no: number }[]) {
  return spots.find((spot) => spot.no > 0)?.no ?? 1;
}

function lastCellNo(spots: { no: number }[]) {
  return spots.reduce((max, spot) => Math.max(max, spot.no), firstSortieCellNo(spots));
}

function mapCellColor(cellNo: number, bossCellNo: number) {
  if (cellNo <= 0) return 0;
  return cellNo === bossCellNo ? 5 : 4;
}

function mapCellColorFor(areaId: number, mapNo: number, cellNo: number, bossCellNo: number) {
  return eventMapCellColor(areaId, mapNo, cellNo)
    ?? sortieNodeData(areaId, mapNo, cellNo)?.colorNo
    ?? routingNodeData(areaId, mapNo, cellNo)?.colorNo
    ?? mapCellColor(cellNo, bossCellNo);
}

function routingNodeData(areaId: number, mapNo: number, cellNo: number) {
  const map = eventRoutingMap(areaId, mapNo) ?? normalRoutingMap(areaId, mapNo);
  const point = map?.edges.find((edge) => edge.no === cellNo)?.to;
  return eventRoutingNodeData(areaId, mapNo, cellNo) ?? (point ? map?.nodes?.[point] : undefined);
}

function recordedBattlePayload(input: HandlerInput, context: HandlerContext, endpoint: BattleEndpointKind = "sortieDay") {
  const battle = createSortieBattle(context.stateStore.getSave(), { formation: battleFormation(input), endpoint });
  if (battle.record.support?.arrived) {
    context.stateStore.recordSupportParticipation(battle.record.support.deckId);
  }
  context.stateStore.recordSortieBattle(battle.record as unknown as Record<string, unknown>);
  return battle.payload;
}

function recordedNightBattlePayload(input: HandlerInput, context: HandlerContext) {
  let record = context.stateStore.lastSortieBattle() as unknown as BattleRecord | null;
  if (!record) {
    const battle = createSortieBattle(context.stateStore.getSave(), { formation: battleFormation(input) });
    context.stateStore.recordSortieBattle(battle.record as unknown as Record<string, unknown>);
    record = battle.record;
  }
  const night = createNightBattle(record);
  context.stateStore.updateSortieBattle(night.record as unknown as Record<string, unknown>);
  return night.payload;
}

function recordedPracticeBattlePayload(input: HandlerInput, context: HandlerContext) {
  const batch = context.stateStore.practiceBatch(practiceBatchOptions(context));
  const battle = createPracticeBattle(context.stateStore.getSave(), {
    deckId: num(input.body.api_deck_id, 1),
    practiceEnemyId: num(input.body.api_enemy_id, 1),
    formation: battleFormation(input),
    practiceRivals: batch.rivals
  });
  context.stateStore.recordPracticeBattle(battle.record as unknown as Record<string, unknown>);
  return battle.payload;
}

function recordedPracticeNightBattlePayload(context: HandlerContext) {
  let record = context.stateStore.lastPracticeBattle() as unknown as BattleRecord | null;
  if (!record) {
    const battle = createPracticeBattle(context.stateStore.getSave(), {
      practiceRivals: context.stateStore.practiceBatch(practiceBatchOptions(context)).rivals
    });
    context.stateStore.recordPracticeBattle(battle.record as unknown as Record<string, unknown>);
    record = battle.record;
  }
  const night = createNightBattle(record);
  context.stateStore.updatePracticeBattle(night.record as unknown as Record<string, unknown>);
  return night.payload;
}

function practiceBatchOptions(context: HandlerContext) {
  return {
    availableShipIds: context.resourceManifest.ship.banner.keys()
  };
}

function recordedCombinedBattlePayload(input: HandlerInput, context: HandlerContext, endpoint: BattleEndpointKind = "combinedDay") {
  const battle = createCombinedBattle(context.stateStore.getSave(), { formation: battleFormation(input), endpoint });
  if (battle.record.support?.arrived) {
    context.stateStore.recordSupportParticipation(battle.record.support.deckId);
  }
  context.stateStore.recordCombinedBattle(battle.record as unknown as Record<string, unknown>);
  return battle.payload;
}

function recordedCombinedNightBattlePayload(context: HandlerContext) {
  let record = context.stateStore.lastCombinedBattle() as unknown as BattleRecord | null;
  if (!record) {
    const battle = createCombinedBattle(context.stateStore.getSave(), {});
    context.stateStore.recordCombinedBattle(battle.record as unknown as Record<string, unknown>);
    record = battle.record;
  }
  const night = createNightBattle(record);
  context.stateStore.updateCombinedBattle(night.record as unknown as Record<string, unknown>);
  return night.payload;
}

function airBattlePayload(input: HandlerInput, context: HandlerContext, endpoint: BattleEndpointKind = "sortieAir") {
  return recordedBattlePayload(input, context, endpoint);
}

function combinedAirBattlePayload(input: HandlerInput, context: HandlerContext, endpoint: BattleEndpointKind = "combinedAir") {
  const payload = recordedCombinedBattlePayload(input, context, endpoint);
  return {
    ...payload,
    api_kouku: payload.api_kouku
      ? {
          ...payload.api_kouku,
          ...(payload.api_kouku.api_stage3 ? { api_stage3_combined: emptyKoukuStage3Payload() } : {})
        }
      : null
  };
}

function endpointKind(path: string): BattleEndpointKind {
  return battleEndpointMode(path)?.endpoint ?? "sortieDay";
}

function practiceListPayload(rivals: PracticeRival[], states: Record<string, number> = {}) {
  return {
    api_create_kind: 2,
    api_selected_kind: 2,
    api_entry_limit: 0,
    api_list: rivals.map((rival) => ({
      api_enemy_id: rival.id,
      api_enemy_name: rival.name,
      api_enemy_level: rival.level,
      api_enemy_rank: rival.rank,
      api_enemy_flag: rival.flag,
      api_enemy_flag_ship: rival.ships[0]?.masterId ?? 0,
      api_enemy_comment: rival.comment,
      api_state: states[String(rival.id)] ?? 0,
      api_medals: rival.medals
    }))
  };
}

function pendingPayItemPayload(item: { id: number; count: number }) {
  const master = masterData.api_mst_payitem.find((payitem) => payitem.api_id === item.id);
  return {
    api_payitem_id: String(item.id),
    api_name: master?.api_name ?? "",
    api_description: master?.api_description ?? "",
    api_count: item.count
  };
}

function recordPayload(save: SaveState) {
  const stats = save.recordStats;
  const nextLevelExp = playerTotalExpForLevel(save.player.level + 1);
  const expToNextLevel = Math.max(0, nextLevelExp - save.player.exp);
  return {
    api_member_id: save.player.id,
    api_nickname: save.player.nickname,
    api_nickname_id: save.player.nickname,
    api_cmt: save.player.comment,
    api_cmt_id: save.player.comment,
    api_level: save.player.level,
    api_rank: 1,
    api_experience: [save.player.exp, expToNextLevel],
    api_war: {
      api_win: stats.battleWin,
      api_lose: stats.battleLose,
      api_rate: ratioString(stats.battleWin, stats.battleWin + stats.battleLose)
    },
    api_mission: {
      api_count: stats.missionCount,
      api_success: stats.missionSuccess,
      api_rate: percentString(stats.missionSuccess, stats.missionCount)
    },
    api_practice: {
      api_win: stats.practiceWin,
      api_lose: stats.practiceLose,
      api_rate: percentString(stats.practiceWin, stats.practiceWin + stats.practiceLose)
    },
    api_deck: save.decks.length,
    api_kdoc: save.buildDocks.length,
    api_ndoc: save.repairDocks.length,
    api_ship: [save.ships.length, save.player.maxChara],
    api_slotitem: [save.slotItems.length, save.player.maxSlotItem - RECORD_SLOT_ITEM_DISPLAY_BONUS],
    api_furniture: save.furniture.coins,
    api_furniture_max: MAX_FURNITURE_COUNT,
    api_material_max: MATERIAL_CAP,
    api_air_base_expanded_info: [5, 6, 7].map((areaId) => ({
      api_area_id: areaId,
      api_maintenance_level: 1
    }))
  };
}

function airBaseMutationPayload(airBase: AirBase, materials: Materials, slotItems: SlotItem[]) {
  const serialized = toAirBase(airBase, slotItems);
  return {
    api_after_bauxite: materials.bauxite,
    api_plane_info: serialized.api_plane_info,
    api_distance: serialized.api_distance,
    api_air_base: serialized
  };
}

function rankingPayload(input: HandlerInput, save: SaveState) {
  const page = Math.max(1, Math.trunc(num(input.body.api_pageno ?? input.query.api_pageno, 1)));
  const score = save.recordStats.battleWin + save.recordStats.practiceWin + save.recordStats.missionSuccess;
  return {
    api_count: 1,
    api_page_count: 1,
    api_disp_page: page,
    api_list: page === 1
      ? [{
          api_mxltvkpyuklh: 1,
          api_mtjmdcwtvhdr: save.player.nickname,
          api_itbrdpdbkynm: save.player.comment,
          api_pbgkfylkbjuy: save.player.worldId,
          api_pcumlrymlujh: 1,
          api_itslcqtmrxtf: 0,
          api_wuhnhojjxmke: score,
          api_xlqcmisdyfiu: save.player.level,
          api_mcouotbbbzpx: score
        }]
      : []
  };
}

function ratioString(numerator: number, denominator: number) {
  if (denominator <= 0) return "0";
  return (numerator / denominator).toFixed(2);
}

function percentString(numerator: number, denominator: number) {
  if (denominator <= 0) return "0";
  return ((numerator / denominator) * 100).toFixed(2);
}

function practiceEnemyInfoPayload(enemyId: number, rivals: PracticeRival[]) {
  const rival = practiceRivalById(rivals, enemyId);
  return {
    api_member_id: rival.id,
    api_nickname: rival.name,
    api_nickname_id: rival.name,
    api_cmt: rival.comment,
    api_level: rival.level,
    api_rank: 1,
    api_experience: [0, 100],
    api_war: { api_win: 0, api_lose: 0, api_rate: "0%" },
    api_mission: { api_count: 0, api_success: 0, api_rate: "0%" },
    api_practice: { api_win: 0, api_lose: 0, api_rate: "0%" },
    api_ship: [rival.ships.length, 300],
    api_slotitem: [0, 500],
    api_furniture: 0,
    api_deckname: "Practice Fleet",
    api_deck: {
      api_deckname: "Practice Fleet",
      api_ships: rival.ships.map((ship) => ({
        api_id: ship.id,
        api_ship_id: ship.masterId,
        api_level: ship.level,
        api_star: ship.star
      }))
    }
  };
}

function battleFormation(input?: HandlerInput) {
  return Math.max(1, Math.trunc(num(input?.body.api_formation ?? input?.body.api_formation_id, 1)));
}

function str(value: unknown, fallback: string) {
  return typeof value === "string" && value.length > 0 ? value : fallback;
}

function slotKind(value: unknown): "normal" | "extra" {
  return num(value, 0) === 1 ? "extra" : "normal";
}

function slotItemIdAt(ship: Ship | undefined, slotIndex: number, kind: "normal" | "extra") {
  if (!ship) return -1;
  if (kind === "extra") return ship.exSlotId;
  const slots = [...ship.slotIds, -1, -1, -1, -1, -1].slice(0, 5);
  return slotIndex >= 0 && slotIndex < slots.length ? slots[slotIndex] : -1;
}

function firstAvailableOrdinarySlotIndex(ship: Ship | undefined, slotIndex: number) {
  const targetIndex = Math.max(0, Math.min(4, Math.trunc(num(slotIndex, 0))));
  const slots = ship ? [...ship.slotIds, -1, -1, -1, -1, -1].slice(0, 5) : [];
  for (let index = 0; index <= targetIndex; index++) {
    if ((slots[index] ?? -1) <= 0) return index;
  }
  return targetIndex;
}

function slotDepriveUnsetList(save: SaveState, itemId: number) {
  const item = save.slotItems.find((slotItem) => slotItem.id === itemId);
  const master = item ? masterData.api_mst_slotitem.find((slotItem) => slotItem.api_id === item.masterId) : undefined;
  const type3 = Number(master?.api_type?.[2] ?? 0);
  return {
    api_type3No: type3,
    api_slot_list: toUnsetSlot(save)[`api_slottype${type3}`] ?? []
  };
}

function toOptionSetting(options: SaveState["player"]["options"]) {
  return {
    api_bgm_flag: options.bgmFlag,
    api_se_flag: options.seFlag,
    api_voice_flag: options.voiceFlag,
    api_vol_bgm: options.volBgm,
    api_vol_se: options.volSe,
    api_vol_voice: options.volVoice,
    api_volume_setting: {
      api_bgm: options.volBgm,
      api_se: options.volSe,
      api_voice: options.volVoice,
      api_be_left: 1,
      api_duty: 1,
      api_bgm_flag: options.bgmFlag,
      api_se_flag: options.seFlag,
      api_voice_flag: options.voiceFlag,
      api_vol_bgm: options.volBgm,
      api_vol_se: options.volSe,
      api_vol_voice: options.volVoice
    },
    api_state: 0,
    api_skin_id: 101,
    api_language: 0
  };
}

function num(value: unknown, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function csvNums(value: unknown, fallback: number[]) {
  if (Array.isArray(value)) return value.map((item) => num(item, 0)).filter((item) => item !== 0);
  if (typeof value !== "string" && typeof value !== "number") return fallback;
  const parsed = String(value)
    .split(",")
    .map((item) => Number(item.trim()))
    .filter((item) => Number.isFinite(item));
  return parsed.length ? parsed : fallback;
}
