import { appendFile } from "node:fs/promises";
import { dirname } from "node:path";
import { mkdirSync } from "node:fs";
import type { FastifyRequest } from "fastify";
import {
  buildShipMasters,
  buildShipTypes,
  buildSlotEquipTypes,
  buildSlotMasters,
  shipPictureBookPage,
  slotPictureBookPage,
  type ShipMaster
} from "../master/catalog.js";
import { mapMasterId, masterData } from "../master/data.js";
import type { ResourceManifest } from "../resources/types.js";
import { shipGraphOffsets } from "../master/shipgraph-offsets.js";
import type { StateStore } from "../state/store.js";
import type { SaveState } from "../state/types.js";
import { validateSlotEquip } from "./equipment-rules.js";
import { apiError, apiOk, parseApiPayload } from "./envelope.js";
import {
  normalizePortBgmId,
  toBasic,
  toBuildDock,
  toDeck,
  toFurniture,
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
  toUseItems
} from "./serializers.js";

export type HandlerContext = {
  stateStore: StateStore;
  unknownLogPath: string;
  resourceManifest: ResourceManifest;
};

export type HandlerInput = {
  method: string;
  path: string;
  query: Record<string, unknown>;
  body: Record<string, unknown>;
};

type KcsHandler = (input: HandlerInput, context: HandlerContext) => unknown | Promise<unknown>;

const handlers = new Map<string, KcsHandler>();

register("api_start2/getData", (_input, context) => apiOk(masterDataWithResources(context.resourceManifest)));
register("api_start2/get_option_setting", (_input, context) => {
  const options = context.stateStore.getSave().player.options;
  return apiOk(toOptionSetting(options));
});

register("api_port/port", (_input, context) => apiOk(toPort(context.stateStore.getSave(), context.resourceManifest)));
register("api_port/airCorpsCondRecoveryWithTimer", () => apiOk({ api_recovery: [] }));

register("api_get_member/require_info", (_input, context) => apiOk(toRequireInfo(context.stateStore.getSave(), context.resourceManifest)));
register("api_get_member/basic", (_input, context) => {
  const save = context.stateStore.getSave();
  return apiOk(toBasic(save.player, save.furniture, context.resourceManifest));
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
  const decks = rawDeckIds == null || rawDeckIds === "" ? save.decks : save.decks.filter((deck) => requestedDeckIds.includes(deck.id));
  const shipIds = new Set(decks.flatMap((deck) => deck.shipIds).filter((shipId) => shipId > 0));
  return apiOk({
    api_deck_data: decks.map(toDeck),
    api_ship_data: save.ships.filter((ship) => shipIds.has(ship.id)).map((s) => toShip(s, save.slotItems))
  });
});
register("api_get_member/slot_item", (_input, context) => apiOk(context.stateStore.getSave().slotItems.map(toSlotItem)));
register("api_get_member/unsetslot", (_input, context) => apiOk(toUnsetSlot(context.stateStore.getSave())));
register("api_get_member/useitem", (_input, context) => apiOk(toUseItems(context.stateStore.getSave().materials)));
register("api_get_member/furniture", (_input, context) => apiOk(toFurniture(context.stateStore.getSave().furniture, context.resourceManifest)));
register("api_get_member/kdock", (_input, context) => apiOk(context.stateStore.getSave().buildDocks.map(toBuildDock)));
register("api_get_member/ndock", (_input, context) => apiOk(context.stateStore.getSave().repairDocks.map(toRepairDock)));
register("api_get_member/questlist", (_input, context) => apiOk(toQuestList(context.stateStore.getSave().quests)));
register("api_get_member/mapinfo", (_input, context) =>
  apiOk({
    api_map_info: toMapInfo(context.stateStore.getSave()),
    api_air_base: [],
    api_air_base_expanded_info: []
  })
);
register("api_get_member/mission", () => apiOk({ api_list: masterData.api_mst_mission, api_exec: [] }));
register("api_get_member/preset_deck", () => apiOk({ api_max_num: 0, api_deck: {} }));
register("api_get_member/preset_slot", () => apiOk({ api_max_num: 0, api_preset_items: [] }));
register("api_get_member/payitem", () => apiOk([]));
register("api_get_member/record", (_input, context) => apiOk({ api_member_id: 1, api_nickname: context.stateStore.getSave().player.nickname, api_level: 1 }));
register("api_get_member/picture_book", (input, context) => apiOk({ api_list: pictureBookList(input, context.resourceManifest) }));
register("api_get_member/practice", () => apiOk({ api_list: [] }));
register("api_get_member/sortie_conditions", () => apiOk({ api_sortie_conditions: [], api_mission_conditions: [] }));
register("api_get_member/chart_additional_info", () => apiOk({}));

register("api_req_init/nickname", (input, context) => {
  const player = context.stateStore.updateNickname(str(input.body.api_nickname ?? input.body.api_name, "Local Admiral"));
  return apiOk(toBasic(player, context.stateStore.getSave().furniture, context.resourceManifest));
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
  return apiOk(toBasic(player, context.stateStore.getSave().furniture, context.resourceManifest));
});
register("api_req_member/updatedeckname", (input, context) => apiOk(toDeck(context.stateStore.renameDeck(num(input.body.api_id, 1), str(input.body.api_name, "Fleet"))!)));
register("api_req_member/update_tutorial_progress", (input, context) => {
  const player = context.stateStore.updateTutorialProgress(num(input.body.api_progress, 100));
  return apiOk(toBasic(player, context.stateStore.getSave().furniture, context.resourceManifest));
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
register("api_req_member/itemuse", () => apiOk({ api_caution_flag: 0 }));
register("api_req_member/itemuse_cond", () => apiOk({ api_caution_flag: 0 }));
register("api_req_member/payitemuse", () => apiOk({ api_useitem_flag: 0 }));
register("api_req_member/get_incentive", () => apiOk({ api_items: [] }));
register("api_req_member/get_event_selected_reward", () => apiOk({ api_items: [] }));
register("api_req_member/set_friendly_request", () => apiOk({}));
register("api_req_member/set_oss_condition", () => apiOk({}));

register("api_req_hensei/change", (input, context) => {
  const deck = context.stateStore.changeDeckShip(num(input.body.api_id, 1), num(input.body.api_ship_idx, 0), num(input.body.api_ship_id, -1));
  return apiOk(deck ? toDeck(deck) : {});
});
register("api_req_hensei/lock", (input, context) => apiOk({ api_locked: context.stateStore.toggleShipLock(num(input.body.api_ship_id, 1)) }));
register("api_req_hensei/combined", (input, context) => apiOk({ api_combined_flag: context.stateStore.setCombinedFleet(num(input.body.api_combined_type, 0)) }));
register("api_req_hensei/preset_register", () => apiOk({ api_preset_no: 1 }));
register("api_req_hensei/preset_select", (_input, context) => apiOk({ api_deck: context.stateStore.getSave().decks.map(toDeck) }));
register("api_req_hensei/preset_delete", () => apiOk({}));
register("api_req_hensei/preset_expand", () => apiOk({ api_max_num: 1 }));
register("api_req_hensei/preset_lock", () => apiOk({}));
register("api_req_hensei/preset_order_change", () => apiOk({}));

register("api_req_hokyu/charge", (input, context) => {
  const ships = context.stateStore.supplyShips(csvNums(input.body.api_id_items, [1]));
  const save = context.stateStore.getSave();
  return apiOk({ api_ship: ships.map((s) => toShip(s, save.slotItems)), api_material: toMaterialValues(save.materials), api_use_bou: 0 });
});

register("api_req_kaisou/slotset", (input, context) => {
  const save = context.stateStore.getSave();
  const shipId = num(input.body.api_id, 1);
  const slotIndex = Math.trunc(num(input.body.api_slot_idx, 0));
  const itemId = num(input.body.api_item_id, -1);
  const validation = validateSlotEquip(save, context.resourceManifest, shipId, slotIndex, itemId, "normal");
  if (!validation.ok) return apiError(validation.message, 400);
  const ship = context.stateStore.equipSlotItem(shipId, slotIndex, itemId);
  return ship ? apiOk(toShip(ship, save.slotItems)) : apiError("Unknown ship", 404);
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
  const save = context.stateStore.getSave();
  return apiOk(toShip(context.stateStore.exchangeSlotIndex(num(input.body.api_id, 1), num(input.body.api_slot_idx, 0), num(input.body.api_change_idx, 1))!, save.slotItems));
});
register("api_req_kaisou/slot_deprive", (input, context) => {
  const save = context.stateStore.getSave();
  const unsetShipId = num(input.body.api_unset_ship, 1);
  const unsetIndex = Math.trunc(num(input.body.api_unset_idx, 0));
  const setShipId = num(input.body.api_set_ship, 1);
  const setIndex = Math.trunc(num(input.body.api_set_idx, 0));
  const itemId = num(input.body.api_item_id, 1);
  const validation = validateSlotEquip(save, context.resourceManifest, setShipId, setIndex, itemId, "normal");
  if (!validation.ok) return apiError(validation.message, 400);
  const unset = context.stateStore.equipSlotItem(unsetShipId, unsetIndex, -1);
  const set = context.stateStore.equipSlotItem(setShipId, setIndex, itemId);
  return apiOk({ api_unset_ship: unset ? toShip(unset, save.slotItems) : null, api_set_ship: set ? toShip(set, save.slotItems) : null });
});
register("api_req_kaisou/lock", (input, context) => apiOk({ api_locked: context.stateStore.lockSlotItem(num(input.body.api_slotitem_id ?? input.body.api_item_id, 1)) }));
register("api_req_kaisou/powerup", (input, context) => {
  const save = context.stateStore.getSave();
  const ship = context.stateStore.modernizeShip(num(input.body.api_id, 1), csvNums(input.body.api_id_items, []));
  return apiOk({ api_powerup_flag: 1, api_ship: ship ? toShip(ship, save.slotItems) : null });
});
register("api_req_kaisou/remodeling", (input, context) => {
  const save = context.stateStore.getSave();
  const ship = context.stateStore.remodelShip(num(input.body.api_id, 1), num(input.body.api_aftershipid, 54));
  return apiOk({ api_after_ship: ship ? toShip(ship, save.slotItems) : null });
});
register("api_req_kaisou/preset_slot_register", () => apiOk({ api_preset_no: 1 }));
register("api_req_kaisou/preset_slot_select", () => apiOk({ api_ship: [] }));
register("api_req_kaisou/preset_slot_delete", () => apiOk({}));
register("api_req_kaisou/preset_slot_expand", () => apiOk({ api_max_num: 1 }));
register("api_req_kaisou/preset_slot_update_name", () => apiOk({}));
register("api_req_kaisou/preset_slot_update_lock", () => apiOk({}));
register("api_req_kaisou/preset_slot_update_exslot_flag", () => apiOk({}));
register("api_req_kaisou/can_preset_slot_select", () => apiOk({ api_select_flag: 1 }));

register("api_req_quest/start", (input, context) => apiOk(toQuestList([context.stateStore.setQuestState(num(input.body.api_quest_id, 101), 1)!])));
register("api_req_quest/stop", (input, context) => apiOk(toQuestList([context.stateStore.setQuestState(num(input.body.api_quest_id, 101), 0)!])));
register("api_req_quest/clearitemget", (input, context) => {
  const quest = context.stateStore.setQuestState(num(input.body.api_quest_id, 101), 0, 1)!;
  context.stateStore.addMaterials({ fuel: 10, ammo: 10 });
  return apiOk({ api_quest: toQuestList([quest]), api_material: toMaterials(context.stateStore.getSave().materials) });
});

register("api_req_furniture/change", (input, context) => {
  const patch = {
    api_floor: num(input.body.api_floor_id, 1),
    api_wall: num(input.body.api_wall_id, 2),
    api_window: num(input.body.api_window_id, 3),
    api_chest: num(input.body.api_chest_id, 4),
    api_desk: num(input.body.api_desk_id, 5),
    api_object: num(input.body.api_object_id, 6)
  };
  return apiOk(toFurniture(context.stateStore.updateFurnitureSet(patch), context.resourceManifest));
});
register("api_req_furniture/buy", (input, context) => apiOk(toFurniture(context.stateStore.buyFurniture(num(input.body.api_id, 1)), context.resourceManifest)));
register("api_req_furniture/music_list", (_input, context) => apiOk({ api_list: bgmMaster(context.resourceManifest) }));
register("api_req_furniture/music_play", () => apiOk({ api_id: 0 }));
register("api_req_furniture/set_portbgm", (input, context) =>
  apiOk({ api_p_bgm_id: context.stateStore.setPortBgm(normalizePortBgmId(num(input.body.api_id, 0), context.resourceManifest)) })
);
register("api_req_furniture/radio_play", () => apiOk({ api_id: 0 }));

register("api_req_nyukyo/start", (input, context) => apiOk({ api_ndock_id: context.stateStore.startRepair(num(input.body.api_ship_id, 1), num(input.body.api_highspeed, 0) === 1)?.id ?? 1 }));
register("api_req_nyukyo/speedchange", (input, context) => apiOk(toRepairDock(context.stateStore.completeRepair(num(input.body.api_ndock_id ?? input.body.api_id, 1))!)));
register("api_req_nyukyo/open_new_dock", () => apiOk({ api_opened: 1 }));

register("api_req_kousyou/createitem", (input, context) => {
  const recipe = recipeDelta(input.body);
  context.stateStore.consumeMaterials({ ...recipe, devmat: 1 });
  const item = context.stateStore.createSlotItem(num(input.body.api_item1, 10) >= 20 ? 2 : 1);
  return apiOk({ api_create_flag: 1, api_shizai_flag: 1, api_slot_item: toSlotItem(item), api_material: toMaterialValues(context.stateStore.getSave().materials) });
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
  context.stateStore.consumeMaterials(recipeDelta(input.body));
  const dock = context.stateStore.startBuild(num(input.body.api_kdock_id ?? input.body.api_id, 1), input.body, num(input.body.api_item1, 30) > 99 ? 54 : 9)!;
  return apiOk({ api_result: 1, api_kdock: toBuildDock(dock), api_material: toMaterialValues(context.stateStore.getSave().materials) });
});
register("api_req_kousyou/createship_speedchange", (input, context) => apiOk({ api_kdock: toBuildDock(context.stateStore.speedBuild(num(input.body.api_kdock_id ?? input.body.api_id, 1))!) }));
register("api_req_kousyou/getship", (input, context) => {
  const save = context.stateStore.getSave();
  const ship = context.stateStore.claimBuild(num(input.body.api_kdock_id ?? input.body.api_id, 1));
  return apiOk({ api_ship: toShip(ship, save.slotItems), api_kdock: save.buildDocks.map(toBuildDock), api_slotitem: [] });
});
register("api_req_kousyou/destroyship", (input, context) => apiOk({ api_material: toMaterialValues(context.stateStore.destroyShip(csvNums(input.body.api_ship_id, [1]))) }));
register("api_req_kousyou/open_new_dock", () => apiOk({ api_opened: 1 }));
register("api_req_kousyou/remodel_slotlist", (_input, context) => apiOk({ api_list: context.stateStore.getSave().slotItems.map(toSlotItem) }));
register("api_req_kousyou/remodel_slotlist_detail", () => apiOk({ api_certain_buildkit: 0, api_req_buildkit: 1, api_req_remodelkit: 1 }));
register("api_req_kousyou/remodel_slot", (input, context) => {
  const itemId = num(input.body.api_slot_id ?? input.body.api_item_id, 1);
  context.stateStore.lockSlotItem(itemId, 1);
  return apiOk({ api_remodel_flag: 1, api_after_slot: context.stateStore.getSave().slotItems.map(toSlotItem).find((item) => item.api_id === itemId) });
});

register("api_req_mission/start", (input, context) => {
  const state = context.stateStore.startMission(num(input.body.api_deck_id, 2), num(input.body.api_mission_id, 1));
  return apiOk({ api_complatetime: state.completeTime, api_complatetime_str: new Date(state.completeTime).toISOString() });
});
register("api_req_mission/result", (input, context) => {
  const materials = context.stateStore.completeMission(num(input.body.api_deck_id, 2));
  return apiOk({ api_clear_result: 1, api_get_exp: 30, api_get_material: [30, 30, 0, 0], api_member_lv: 1, api_member_exp: 0, api_material: toMaterials(materials) });
});
register("api_req_mission/return_instruction", (input, context) => apiOk({ api_deck: toDeck(context.stateStore.recallMission(num(input.body.api_deck_id, 2))!) }));

register("api_req_map/start", (input, context) => {
  const session = context.stateStore.startSortie(num(input.body.api_deck_id, 1), num(input.body.api_maparea_id, 1), num(input.body.api_mapinfo_no, 1));
  if (!session) return apiError("Unknown or locked sortie map", 400);
  return apiOk(mapNode(context.resourceManifest, session.areaId, session.mapNo, session.node, 0, true));
});
register("api_req_map/next", (_input, context) => {
  const previousNode = context.stateStore.getSave().sortieSession?.node ?? 0;
  const session = context.stateStore.nextSortieNode();
  return apiOk(session ? mapNode(context.resourceManifest, session.areaId, session.mapNo, session.node, previousNode) : mapNode(context.resourceManifest, 1, 1, 1, 0));
});
register("api_req_sortie/battle", (_input, context) => apiOk(battlePayload(context.stateStore.getSave())));
register("api_req_battle_midnight/battle", (_input, context) => apiOk(nightBattlePayload(context.stateStore.getSave())));
register("api_req_battle_midnight/sp_midnight", (_input, context) => apiOk(nightBattlePayload(context.stateStore.getSave())));
register("api_req_sortie/night_to_day", (_input, context) => apiOk(battlePayload(context.stateStore.getSave())));
register("api_req_sortie/airbattle", (_input, context) => apiOk(airBattlePayload(context.stateStore.getSave())));
register("api_req_sortie/ld_airbattle", (_input, context) => apiOk(airBattlePayload(context.stateStore.getSave())));
register("api_req_sortie/ld_shooting", (_input, context) => apiOk(battlePayload(context.stateStore.getSave())));
register("api_req_sortie/battleresult", (_input, context) => {
  const save = context.stateStore.completeSortieBattle();
  const deck = sortieDeck(save);
  context.stateStore.addMaterials({ fuel: 20 });
  return apiOk({
    api_ship_id: deck.shipIds.filter((id) => id > 0),
    api_win_rank: "S",
    api_get_exp: 60,
    api_mvp: 1,
    api_member_lv: 1,
    api_member_exp: 60,
    api_get_base_exp: 30,
    api_get_ship: { api_ship_id: 1, api_ship_type: "Destroyer", api_ship_name: "Mutsuki", api_ship_getmes: "Local drop" },
    api_get_eventflag: 0,
    api_get_exmap_rate: 0
  });
});
register("api_req_sortie/goback_port", (_input, context) => {
  context.stateStore.clearSortie();
  return apiOk(toPort(context.stateStore.getSave(), context.resourceManifest));
});
register("api_req_map/anchorage_repair", () => apiOk({ api_repair_flag: 0 }));
register("api_req_map/select_eventmap_rank", () => apiOk({ api_select_rank: 0 }));
register("api_req_map/start_air_base", () => apiOk({ api_result: 0, api_message: "Air base is not implemented in local MVP." }));

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
  "api_req_air_corps/set_plane",
  "api_req_air_corps/set_action",
  "api_req_air_corps/supply",
  "api_req_air_corps/cond_recovery",
  "api_req_air_corps/change_deployment_base",
  "api_req_air_corps/expand_base",
  "api_req_air_corps/expand_maintenance_level",
  "api_req_member/get_practice_enemyinfo",
  "api_req_practice/battle",
  "api_req_practice/midnight_battle",
  "api_req_practice/battle_result",
  "api_req_practice/change_matching_kind",
  "api_req_ranking/mxltvkpyuklh",
  "api_dmm_payment/paycheck"
]) {
  register(path, () => apiOk({ api_disabled: 1, api_message: "Local placeholder" }));
}

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

async function recordUnknown(input: HandlerInput, context: HandlerContext) {
  mkdirSync(dirname(context.unknownLogPath), { recursive: true });
  await appendFile(
    context.unknownLogPath,
    `${JSON.stringify({ time: new Date().toISOString(), method: input.method, path: `/kcsapi/${input.path}`, query: input.query, body: input.body })}\n`
  );
}

function masterDataWithResources(resourceManifest: ResourceManifest) {
  const ships = buildShipMasters(resourceManifest);
  const slotItems = buildSlotMasters(resourceManifest);
  const mapInfos = mapInfoMasters(resourceManifest);
  return {
    ...masterData,
    api_mst_ship: ships,
    api_mst_stype: buildShipTypes(slotItems),
    api_mst_slotitem: slotItems,
    api_mst_slotitem_equiptype: buildSlotEquipTypes(slotItems),
    api_mst_shipgraph: shipGraph(resourceManifest, ships),
    api_mst_furnituregraph: furnitureGraph(resourceManifest),
    api_mst_bgm: bgmMaster(resourceManifest),
    api_mst_maparea: mapAreaMasters(mapInfos),
    api_mst_mapinfo: mapInfos,
    api_mst_mapbgm: mapBgmMasters(mapInfos),
    api_mst_mapcell: mapCellMasters(resourceManifest, mapInfos)
  };
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

function pictureBookList(input: HandlerInput, resourceManifest: ResourceManifest) {
  const type = num(input.body.api_type ?? input.query.api_type, 1);
  const startNo = num(input.body.api_no ?? input.query.api_no, 1);

  if (type === 1) return shipPictureBookPage(resourceManifest, startNo);
  if (type === 2) return slotPictureBookPage(resourceManifest, startNo);
  return [];
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
      const master = masterData.api_mst_furniture.find((item) => item.api_no === id || item.api_id === id);
      const file =
        resourceManifest.furniture.normal.get(id) ||
        resourceManifest.furniture.scripts.get(id) ||
        resourceManifest.furniture.movable.get(id) ||
        resourceManifest.furniture.thumbnail.get(id);
      return {
        api_id: id,
        api_no: id,
        api_type: master?.api_type ?? Math.max(0, (id - 1) % 6),
        api_filename: file?.frame ?? String(id),
        api_version: file?.version ?? "1"
      };
    });
}

function bgmMaster(resourceManifest: ResourceManifest) {
  return [...resourceManifest.bgm.port.values()]
    .sort((a, b) => a.id - b.id)
    .map((bgm) => ({
      api_id: bgm.id,
      api_name: bgm.id === 0 ? "母港" : `Local Port BGM ${String(bgm.id).padStart(3, "0")}`,
      api_filename: bgm.frame,
      api_rarity: 1
    }));
}

function mapInfoMasters(resourceManifest: ResourceManifest) {
  const cacheBackedIds = new Set(resourceManifest.map.thumbnail.keys());
  return masterData.api_mst_mapinfo.filter((map) => cacheBackedIds.has(map.api_id));
}

function mapAreaMasters(mapInfos: typeof masterData.api_mst_mapinfo) {
  const areaIds = new Set(mapInfos.map((map) => map.api_maparea_id));
  return masterData.api_mst_maparea.filter((area) => areaIds.has(area.api_id));
}

function mapBgmMasters(mapInfos: typeof masterData.api_mst_mapinfo) {
  return mapInfos.map((map) => ({
    api_id: map.api_id,
    api_maparea_id: map.api_maparea_id,
    api_no: map.api_no,
    api_moving_bgm: 0,
    api_map_bgm: [0, 0],
    api_boss_bgm: [0, 0]
  }));
}

function mapCellMasters(resourceManifest: ResourceManifest, mapInfos: typeof masterData.api_mst_mapinfo) {
  return mapInfos.flatMap((map) => {
    const spots = mapSpots(resourceManifest, map.api_maparea_id, map.api_no);
    const bossCellNo = lastCellNo(spots);
    return spots.map((spot) => ({
      api_id: map.api_id * 100 + spot.no,
      api_maparea_id: map.api_maparea_id,
      api_mapinfo_no: map.api_no,
      api_no: spot.no,
      api_color_no: mapCellColor(spot.no, bossCellNo)
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

function mapNode(resourceManifest: ResourceManifest, areaId: number, mapNo: number, node: number, fromNo: number, includeCells = false) {
  const spots = mapSpots(resourceManifest, areaId, mapNo);
  const bossCellNo = lastCellNo(spots);
  const currentNode = spots.some((spot) => spot.no === node) ? node : node > bossCellNo ? bossCellNo : firstSortieCellNo(spots);
  const next = nextCellNo(spots, currentNode);
  const colorNo = mapCellColor(currentNode, bossCellNo);
  return {
    api_rashin_flg: 1,
    api_rashin_id: 1,
    api_maparea_id: areaId,
    api_mapinfo_no: mapNo,
    api_no: currentNode,
    api_from_no: fromNo,
    api_color_no: colorNo,
    api_event_id: currentNode === bossCellNo ? 5 : 4,
    api_event_kind: currentNode === 0 ? 0 : 1,
    api_next: next,
    api_bosscell_no: bossCellNo,
    api_select_route: null,
    ...(includeCells ? { api_cell_data: cellData(spots, bossCellNo) } : {})
  };
}

function mapSpots(resourceManifest: ResourceManifest, areaId: number, mapNo: number) {
  const mapId = mapMasterId(areaId, mapNo);
  const spots = resourceManifest.map.spots.get(mapId);
  if (spots && spots.length > 0) return spots;
  return [{ no: 0 }, { no: 1 }];
}

function cellData(spots: { no: number }[], bossCellNo: number) {
  return spots.map((spot) => ({
    api_no: spot.no,
    api_color_no: mapCellColor(spot.no, bossCellNo)
  }));
}

function firstSortieCellNo(spots: { no: number }[]) {
  return spots.find((spot) => spot.no > 0)?.no ?? 1;
}

function lastCellNo(spots: { no: number }[]) {
  return spots.reduce((max, spot) => Math.max(max, spot.no), firstSortieCellNo(spots));
}

function nextCellNo(spots: { no: number }[], currentNode: number) {
  return spots.find((spot) => spot.no > currentNode)?.no ?? 0;
}

function mapCellColor(cellNo: number, bossCellNo: number) {
  if (cellNo <= 0) return 0;
  return cellNo === bossCellNo ? 6 : 5;
}

function battlePayload(save: SaveState) {
  const deck = sortieDeck(save);
  const shipIds = deck.shipIds.filter((id) => id > 0);
  return {
    api_dock_id: deck.id,
    api_ship_ke: [-1, 501, 502, -1, -1, -1, -1],
    api_ship_lv: [-1, ...shipIds.map((id) => save.ships.find((ship) => ship.id === id)?.level || 1)],
    api_nowhps: [-1, ...shipIds.map((id) => save.ships.find((ship) => ship.id === id)?.hp || 1), 20, 20],
    api_maxhps: [-1, ...shipIds.map((id) => save.ships.find((ship) => ship.id === id)?.maxHp || 1), 20, 20],
    api_midnight_flag: 1,
    api_eSlot: [[-1], [-1]],
    api_fParam: shipIds.map(() => [5, 15, 5, 5]),
    api_eParam: [
      [5, 5, 5, 5],
      [5, 5, 5, 5]
    ],
    api_search: [1, 1],
    api_stage_flag: [0, 0, 0],
    api_kouku: null,
    api_support_flag: 0,
    api_support_info: null,
    api_hougeki1: {
      api_at_list: [-1, 1],
      api_df_list: [-1, [7]],
      api_si_list: [-1, [1]],
      api_cl_list: [-1, [1]],
      api_damage: [-1, [20]]
    },
    api_hougeki2: null,
    api_hougeki3: null,
    api_raigeki: null
  };
}

function sortieDeck(save: SaveState) {
  return save.decks.find((deck) => deck.id === save.sortieSession?.deckId) || save.decks[0];
}

function nightBattlePayload(save: SaveState) {
  return {
    ...battlePayload(save),
    api_hougeki: {
      api_at_list: [-1, 1],
      api_df_list: [-1, [7]],
      api_si_list: [-1, [1]],
      api_cl_list: [-1, [1]],
      api_damage: [-1, [30]]
    }
  };
}

function airBattlePayload(save: SaveState) {
  return {
    ...battlePayload(save),
    api_stage_flag: [1, 1, 1],
    api_kouku: {
      api_stage1: { api_f_count: 0, api_f_lostcount: 0, api_e_count: 0, api_e_lostcount: 0, api_disp_seiku: 1 },
      api_stage2: { api_f_count: 0, api_f_lostcount: 0, api_e_count: 0, api_e_lostcount: 0 },
      api_stage3: { api_frai_flag: [], api_erai_flag: [], api_fbak_flag: [], api_ebak_flag: [], api_fcl_flag: [], api_ecl_flag: [], api_fdam: [], api_edam: [] }
    }
  };
}

function str(value: unknown, fallback: string) {
  return typeof value === "string" && value.length > 0 ? value : fallback;
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
