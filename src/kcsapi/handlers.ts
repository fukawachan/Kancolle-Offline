import { appendFile } from "node:fs/promises";
import { dirname } from "node:path";
import { mkdirSync } from "node:fs";
import type { FastifyRequest } from "fastify";
import { masterData } from "../master/data.js";
import type { StateStore } from "../state/store.js";
import type { SaveState } from "../state/types.js";
import { apiError, apiOk, parseApiPayload } from "./envelope.js";
import {
  toBasic,
  toBuildDock,
  toDeck,
  toFurniture,
  toMapInfo,
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
};

export type HandlerInput = {
  method: string;
  path: string;
  query: Record<string, unknown>;
  body: Record<string, unknown>;
};

type KcsHandler = (input: HandlerInput, context: HandlerContext) => unknown | Promise<unknown>;

const handlers = new Map<string, KcsHandler>();

register("api_start2/getData", () => apiOk({ ...masterData, api_mst_shipgraph: shipGraph() }));
register("api_start2/get_option_setting", (_input, context) => {
  const options = context.stateStore.getSave().player.options;
  return apiOk(toOptionSetting(options));
});

register("api_port/port", (_input, context) => apiOk(toPort(context.stateStore.getSave())));
register("api_port/airCorpsCondRecoveryWithTimer", () => apiOk({ api_recovery: [] }));

register("api_get_member/require_info", (_input, context) => apiOk(toRequireInfo(context.stateStore.getSave())));
register("api_get_member/basic", (_input, context) => {
  const save = context.stateStore.getSave();
  return apiOk(toBasic(save.player, save.furniture));
});
register("api_get_member/material", (_input, context) => apiOk(toMaterials(context.stateStore.getSave().materials)));
register("api_get_member/deck", (_input, context) => apiOk(context.stateStore.getSave().decks.map(toDeck)));
register("api_get_member/ship2", (_input, context) => {
  const save = context.stateStore.getSave();
  return apiOk(save.ships.map(toShip));
});
register("api_get_member/ship3", (_input, context) => {
  const save = context.stateStore.getSave();
  return apiOk({ api_ship_data: save.ships.map(toShip), api_deck_data: save.decks.map(toDeck), api_slot_data: save.slotItems.map(toSlotItem) });
});
register("api_get_member/slot_item", (_input, context) => apiOk(context.stateStore.getSave().slotItems.map(toSlotItem)));
register("api_get_member/unsetslot", (_input, context) => apiOk(toUnsetSlot(context.stateStore.getSave())));
register("api_get_member/useitem", (_input, context) => apiOk(toUseItems(context.stateStore.getSave().materials)));
register("api_get_member/furniture", (_input, context) => apiOk(toFurniture(context.stateStore.getSave().furniture)));
register("api_get_member/kdock", (_input, context) => apiOk(context.stateStore.getSave().buildDocks.map(toBuildDock)));
register("api_get_member/ndock", (_input, context) => apiOk(context.stateStore.getSave().repairDocks.map(toRepairDock)));
register("api_get_member/questlist", (_input, context) => apiOk(toQuestList(context.stateStore.getSave().quests)));
register("api_get_member/mapinfo", (_input, context) => apiOk(toMapInfo(context.stateStore.getSave())));
register("api_get_member/mission", () => apiOk({ api_list: masterData.api_mst_mission, api_exec: [] }));
register("api_get_member/preset_deck", () => apiOk({ api_max_num: 0, api_deck: [] }));
register("api_get_member/preset_slot", () => apiOk({ api_max_num: 0, api_preset_items: [] }));
register("api_get_member/payitem", () => apiOk([]));
register("api_get_member/record", (_input, context) => apiOk({ api_member_id: 1, api_nickname: context.stateStore.getSave().player.nickname, api_level: 1 }));
register("api_get_member/picture_book", () => apiOk({ api_list: [] }));
register("api_get_member/practice", () => apiOk({ api_list: [] }));
register("api_get_member/sortie_conditions", () => apiOk({ api_sortie_conditions: [], api_mission_conditions: [] }));
register("api_get_member/chart_additional_info", () => apiOk({}));

register("api_req_init/nickname", (input, context) => {
  const player = context.stateStore.updateNickname(str(input.body.api_nickname ?? input.body.api_name, "Local Admiral"));
  return apiOk(toBasic(player, context.stateStore.getSave().furniture));
});
register("api_req_init/firstship", (input, context) => {
  const masterId = num(input.body.api_ship_id, 6);
  const ship = context.stateStore.createShip(masterId);
  context.stateStore.changeDeckShip(1, 0, ship.id);
  return apiOk({ api_ship: toShip(ship), api_deck: context.stateStore.getSave().decks.map(toDeck) });
});
register("api_req_member/updatecomment", (input, context) => {
  const player = context.stateStore.updateComment(str(input.body.api_cmt, ""));
  return apiOk(toBasic(player, context.stateStore.getSave().furniture));
});
register("api_req_member/updatedeckname", (input, context) => apiOk(toDeck(context.stateStore.renameDeck(num(input.body.api_id, 1), str(input.body.api_name, "Fleet"))!)));
register("api_req_member/update_tutorial_progress", (input, context) => {
  const player = context.stateStore.updateTutorialProgress(num(input.body.api_progress, 100));
  return apiOk(toBasic(player, context.stateStore.getSave().furniture));
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
  return apiOk({ api_ship: ships.map(toShip), api_material: toMaterials(context.stateStore.getSave().materials), api_use_bou: 0 });
});

register("api_req_kaisou/slotset", (input, context) => apiOk(toShip(context.stateStore.equipSlotItem(num(input.body.api_id, 1), num(input.body.api_slot_idx, 0), num(input.body.api_item_id, -1))!)));
register("api_req_kaisou/slotset_ex", (input, context) => apiOk(toShip(context.stateStore.equipExSlotItem(num(input.body.api_id, 1), num(input.body.api_item_id, -1))!)));
register("api_req_kaisou/unsetslot_all", (input, context) => apiOk(toShip(context.stateStore.unsetAllSlots(num(input.body.api_id ?? input.body.api_ship_id, 1))!)));
register("api_req_kaisou/slot_exchange_index", (input, context) => apiOk(toShip(context.stateStore.exchangeSlotIndex(num(input.body.api_id, 1), num(input.body.api_slot_idx, 0), num(input.body.api_change_idx, 1))!)));
register("api_req_kaisou/slot_deprive", (input, context) => {
  const unset = context.stateStore.equipSlotItem(num(input.body.api_unset_ship, 1), num(input.body.api_unset_idx, 0), -1);
  const set = context.stateStore.equipSlotItem(num(input.body.api_set_ship, 1), num(input.body.api_set_idx, 0), num(input.body.api_item_id, 1));
  return apiOk({ api_unset_ship: unset ? toShip(unset) : null, api_set_ship: set ? toShip(set) : null });
});
register("api_req_kaisou/lock", (input, context) => apiOk({ api_locked: context.stateStore.lockSlotItem(num(input.body.api_slotitem_id ?? input.body.api_item_id, 1)) }));
register("api_req_kaisou/powerup", (input, context) => {
  const ship = context.stateStore.modernizeShip(num(input.body.api_id, 1), csvNums(input.body.api_id_items, []));
  return apiOk({ api_powerup_flag: 1, api_ship: ship ? toShip(ship) : null });
});
register("api_req_kaisou/remodeling", (input, context) => {
  const ship = context.stateStore.remodelShip(num(input.body.api_id, 1), num(input.body.api_aftershipid, 45));
  return apiOk({ api_after_ship: ship ? toShip(ship) : null });
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
  return apiOk(toFurniture(context.stateStore.updateFurnitureSet(patch)));
});
register("api_req_furniture/buy", (input, context) => apiOk(toFurniture(context.stateStore.buyFurniture(num(input.body.api_id, 1)))));
register("api_req_furniture/music_list", () => apiOk({ api_list: masterData.api_mst_bgm }));
register("api_req_furniture/music_play", () => apiOk({ api_id: 1 }));
register("api_req_furniture/set_portbgm", (input, context) => apiOk({ api_p_bgm_id: context.stateStore.setPortBgm(num(input.body.api_id, 1)) }));
register("api_req_furniture/radio_play", () => apiOk({ api_id: 0 }));

register("api_req_nyukyo/start", (input, context) => apiOk({ api_ndock_id: context.stateStore.startRepair(num(input.body.api_ship_id, 1), num(input.body.api_highspeed, 0) === 1)?.id ?? 1 }));
register("api_req_nyukyo/speedchange", (input, context) => apiOk(toRepairDock(context.stateStore.completeRepair(num(input.body.api_ndock_id ?? input.body.api_id, 1))!)));
register("api_req_nyukyo/open_new_dock", () => apiOk({ api_opened: 1 }));

register("api_req_kousyou/createitem", (input, context) => {
  const recipe = recipeDelta(input.body);
  context.stateStore.consumeMaterials({ ...recipe, devmat: 1 });
  const item = context.stateStore.createSlotItem(num(input.body.api_item1, 10) >= 20 ? 2 : 1);
  return apiOk({ api_create_flag: 1, api_shizai_flag: 1, api_slot_item: toSlotItem(item), api_material: toMaterials(context.stateStore.getSave().materials) });
});
register("api_req_kousyou/destroyitem2", (input, context) => apiOk({ api_material: toMaterials(context.stateStore.destroySlotItem(csvNums(input.body.api_slotitem_ids ?? input.body.api_slotitem_id, [1]))) }));
register("api_req_kousyou/createship", (input, context) => {
  context.stateStore.consumeMaterials(recipeDelta(input.body));
  const dock = context.stateStore.startBuild(num(input.body.api_kdock_id ?? input.body.api_id, 1), input.body, num(input.body.api_item1, 30) > 99 ? 45 : 6)!;
  return apiOk({ api_result: 1, api_kdock: toBuildDock(dock), api_material: toMaterials(context.stateStore.getSave().materials) });
});
register("api_req_kousyou/createship_speedchange", (input, context) => apiOk({ api_kdock: toBuildDock(context.stateStore.speedBuild(num(input.body.api_kdock_id ?? input.body.api_id, 1))!) }));
register("api_req_kousyou/getship", (input, context) => {
  const ship = context.stateStore.claimBuild(num(input.body.api_kdock_id ?? input.body.api_id, 1));
  return apiOk({ api_ship: toShip(ship), api_kdock: context.stateStore.getSave().buildDocks.map(toBuildDock), api_slotitem: [] });
});
register("api_req_kousyou/destroyship", (input, context) => apiOk({ api_material: toMaterials(context.stateStore.destroyShip(csvNums(input.body.api_ship_id, [1]))) }));
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
  const session = context.stateStore.startSortie(num(input.body.api_deck_id, 1), num(input.body.api_maparea_id, 1), num(input.body.api_mapinfo_no, 1))!;
  return apiOk(mapNode(session.areaId, session.mapNo, session.node));
});
register("api_req_map/next", (_input, context) => {
  const session = context.stateStore.nextSortieNode();
  return apiOk(session ? mapNode(session.areaId, session.mapNo, session.node) : mapNode(1, 1, 1));
});
register("api_req_sortie/battle", (_input, context) => apiOk(battlePayload(context.stateStore.getSave())));
register("api_req_battle_midnight/battle", (_input, context) => apiOk(nightBattlePayload(context.stateStore.getSave())));
register("api_req_battle_midnight/sp_midnight", (_input, context) => apiOk(nightBattlePayload(context.stateStore.getSave())));
register("api_req_sortie/night_to_day", (_input, context) => apiOk(battlePayload(context.stateStore.getSave())));
register("api_req_sortie/airbattle", (_input, context) => apiOk(airBattlePayload(context.stateStore.getSave())));
register("api_req_sortie/ld_airbattle", (_input, context) => apiOk(airBattlePayload(context.stateStore.getSave())));
register("api_req_sortie/ld_shooting", (_input, context) => apiOk(battlePayload(context.stateStore.getSave())));
register("api_req_sortie/battleresult", (_input, context) => {
  context.stateStore.addMaterials({ fuel: 20 });
  return apiOk({
    api_ship_id: context.stateStore.getSave().decks[0].shipIds.filter((id) => id > 0),
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
  return apiOk(toPort(context.stateStore.getSave()));
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

function shipGraph() {
  return masterData.api_mst_ship.map((ship) => ({
    api_id: ship.api_id,
    api_sortno: ship.api_sortno,
    api_filename: String(ship.api_id),
    api_version: ["1", "1", "1", "1", "1"],
    api_boko_n: [0, 0],
    api_boko_d: [0, 0],
    api_kaisyu_n: [0, 0],
    api_kaisyu_d: [0, 0],
    api_kaizo_n: [0, 0],
    api_kaizo_d: [0, 0],
    api_map_n: [0, 0],
    api_map_d: [0, 0],
    api_ensyuf_n: [0, 0],
    api_ensyuf_d: [0, 0],
    api_ensyue_n: [0, 0],
    api_weda: [0, 0],
    api_wedb: [0, 0]
  }));
}

function recipeDelta(body: Record<string, unknown>) {
  return {
    fuel: num(body.api_item1, 0),
    ammo: num(body.api_item2, 0),
    steel: num(body.api_item3, 0),
    bauxite: num(body.api_item4, 0)
  };
}

function mapNode(areaId: number, mapNo: number, node: number) {
  return {
    api_rashin_flg: 1,
    api_rashin_id: 1,
    api_maparea_id: areaId,
    api_mapinfo_no: mapNo,
    api_no: node,
    api_color_no: node === 1 ? 5 : 6,
    api_event_id: node === 1 ? 4 : 5,
    api_event_kind: node === 1 ? 1 : 0,
    api_next: node === 1 ? 2 : 0,
    api_bosscell_no: 2,
    api_select_route: null
  };
}

function battlePayload(save: SaveState) {
  const deck = save.decks[0];
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
  const voiceFlag = 0;
  const volVoice = 0;

  return {
    api_bgm_flag: options.bgmFlag,
    api_se_flag: options.seFlag,
    api_voice_flag: voiceFlag,
    api_vol_bgm: options.volBgm,
    api_vol_se: options.volSe,
    api_vol_voice: volVoice,
    api_volume_setting: {
      api_bgm: options.volBgm,
      api_se: options.volSe,
      api_voice: volVoice,
      api_be_left: 1,
      api_duty: 1,
      api_bgm_flag: options.bgmFlag,
      api_se_flag: options.seFlag,
      api_voice_flag: voiceFlag,
      api_vol_bgm: options.volBgm,
      api_vol_se: options.volSe,
      api_vol_voice: volVoice
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
