import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { buildApp } from "../src/server/app.js";
import { createStateStore, type StateStore } from "../src/state/store.js";

describe("local kcsapi endpoints", () => {
  let tempDir: string;
  let store: StateStore;
  let app: Awaited<ReturnType<typeof buildApp>>;

  beforeEach(async () => {
    tempDir = await mkdtemp(path.join(tmpdir(), "kancolle-api-"));
    store = createStateStore({ databasePath: path.join(tempDir, "save.sqlite") });
    store.registerAccount(15);
    app = await buildApp({
      cacheDir: path.resolve("cache"),
      stateStore: store,
      unknownLogPath: path.join(tempDir, "unknown.jsonl")
    });
  });

  afterEach(async () => {
    await app.close();
    store.close();
    await rm(tempDir, { recursive: true, force: true });
  });

  async function post(pathname: string, payload: Record<string, string | number> = {}) {
    return app.inject({
      method: "POST",
      url: `/kcsapi/${pathname}`,
      payload: new URLSearchParams(
        Object.fromEntries(Object.entries(payload).map(([key, value]) => [key, String(value)]))
      ).toString(),
      headers: { "content-type": "application/x-www-form-urlencoded" }
    });
  }

  it("returns structurally complete start2 master data and option settings", async () => {
    const start2 = await post("api_start2/getData");
    const options = await post("api_start2/get_option_setting");

    expect(start2.statusCode).toBe(200);
    expect(start2.json().api_data).toMatchObject({
      api_mst_ship: expect.any(Array),
      api_mst_slotitem: expect.any(Array),
      api_mst_stype: expect.any(Array),
      api_mst_mission: expect.any(Array),
      api_mst_maparea: expect.any(Array),
      api_mst_mapinfo: expect.any(Array),
      api_mst_furniture: expect.any(Array),
      api_mst_useitem: expect.any(Array),
      api_mst_payitem: expect.any(Array),
      api_mst_bgm: expect.any(Array),
      api_mst_mapbgm: expect.any(Array),
      api_mst_const: expect.any(Object),
      api_mst_slotitem_equiptype: expect.any(Array),
      api_mst_furnituregraph: expect.any(Array),
      api_mst_equip_ship: expect.any(Array),
      api_mst_equip_limit_exslot: expect.any(Object),
      api_mst_shipgraph: expect.any(Array)
    });
    expect(start2.json().api_data.api_mst_ship.length).toBeGreaterThan(3);
    expect(start2.json().api_data.api_mst_shipgraph).toHaveLength(start2.json().api_data.api_mst_ship.length);
    expect(options.json().api_data).toMatchObject({
      api_bgm_flag: 1,
      api_voice_flag: 0,
      api_skin_id: 101,
      api_vol_bgm: expect.any(Number),
      api_vol_voice: 0,
      api_volume_setting: {
        api_bgm: expect.any(Number),
        api_se: expect.any(Number),
        api_voice: 0,
        api_be_left: expect.any(Number),
        api_duty: expect.any(Number),
        api_vol_bgm: expect.any(Number),
        api_voice_flag: 0,
        api_vol_voice: 0
      }
    });
  });

  it("returns port aggregate and core get_member resources from the same persisted save", async () => {
    const port = await post("api_port/port");
    const basic = await post("api_get_member/basic");
    const ships = await post("api_get_member/ship2");
    const deck = await post("api_get_member/deck");
    const material = await post("api_get_member/material");
    const requireInfo = await post("api_get_member/require_info");

    expect(port.json().api_data).toMatchObject({
      api_basic: { api_nickname: "Local Admiral" },
      api_ship: expect.any(Array),
      api_deck_port: expect.any(Array),
      api_material: expect.any(Array)
    });
    expect(basic.json().api_data).toMatchObject({
      api_nickname: "Local Admiral",
      api_firstflag: 1,
      api_tutorial_progress: 100,
      api_furniture: [1, 2, 3, 6, 4, 5]
    });
    expect(ships.json().api_data.length).toBeGreaterThan(0);
    expect(deck.json().api_data).toHaveLength(4);
    expect(material.json().api_data).toHaveLength(8);
    expect(requireInfo.json().api_data).toMatchObject({
      api_basic: expect.any(Object),
      api_extra_supply: expect.any(Array),
      api_oss_setting: {
        api_oss_items: expect.any(Array),
        api_language_type: expect.any(Number)
      },
      api_position_id: expect.any(Number),
      api_slot_item: expect.any(Array),
      api_unsetslot: expect.any(Object),
      api_useitem: expect.any(Array),
      api_furniture: expect.any(Array)
    });
  });

  it("persists profile, fleet, lock, supply, equipment, quest, and furniture mutations", async () => {
    await post("api_req_member/updatecomment", { api_cmt: "offline sortie ready" });
    await post("api_req_member/updatedeckname", { api_id: 1, api_name: "First Local Fleet" });
    await post("api_req_hensei/lock", { api_ship_id: 1 });
    await post("api_req_hokyu/charge", { api_id_items: "1", api_kind: 3 });
    await post("api_req_kaisou/slotset", { api_id: 1, api_slot_idx: 0, api_item_id: 1 });
    await post("api_req_quest/start", { api_quest_id: 101 });
    await post("api_req_furniture/change", { api_floor_id: 1, api_wall_id: 2, api_window_id: 3 });

    const port = (await post("api_port/port")).json().api_data;
    const quests = (await post("api_get_member/questlist")).json().api_data;
    const furniture = (await post("api_get_member/furniture")).json().api_data;

    expect(port.api_basic.api_comment).toBe("offline sortie ready");
    expect(port.api_deck_port[0].api_name).toBe("First Local Fleet");
    expect(port.api_ship.find((ship: any) => ship.api_id === 1).api_locked).toBe(1);
    expect(port.api_ship.find((ship: any) => ship.api_id === 1).api_fuel).toBeGreaterThan(0);
    expect(port.api_ship.find((ship: any) => ship.api_id === 1).api_slot[0]).toBe(1);
    expect(quests.api_list.find((quest: any) => quest.api_no === 101).api_state).toBe(2);
    expect(furniture.api_set).toMatchObject({ api_floor: 1, api_wall: 2, api_window: 3 });
  });

  it("supports docks, arsenal, expeditions, items, and a deterministic first sortie loop", async () => {
    const repair = await post("api_req_nyukyo/start", { api_ship_id: 1, api_highspeed: 1 });
    const craft = await post("api_req_kousyou/createitem", {
      api_item1: 10,
      api_item2: 10,
      api_item3: 10,
      api_item4: 10
    });
    const build = await post("api_req_kousyou/createship", {
      api_kdock_id: 1,
      api_item1: 30,
      api_item2: 30,
      api_item3: 30,
      api_item4: 30
    });
    const expedition = await post("api_req_mission/start", { api_deck_id: 2, api_mission_id: 2 });
    const mapStart = await post("api_req_map/start", { api_maparea_id: 1, api_mapinfo_no: 1, api_deck_id: 1 });
    const battle = await post("api_req_sortie/battle");
    const result = await post("api_req_sortie/battleresult");

    expect(repair.json().api_data).toMatchObject({ api_ndock_id: expect.any(Number) });
    expect(craft.json().api_data).toMatchObject({ api_create_flag: 1, api_slot_item: expect.any(Object) });
    expect(build.json().api_data).toMatchObject({ api_result: 1, api_kdock: expect.any(Object) });
    expect(expedition.json().api_data).toMatchObject({ api_complatetime: expect.any(Number) });
    expect(mapStart.json().api_data).toMatchObject({ api_no: 1, api_maparea_id: 1, api_mapinfo_no: 1 });
    expect(battle.json().api_data).toMatchObject({
      api_dock_id: 1,
      api_ship_ke: expect.any(Array),
      api_hougeki1: expect.any(Object)
    });
    expect(result.json().api_data).toMatchObject({
      api_win_rank: expect.stringMatching(/[SABC]/),
      api_get_exp: expect.any(Number),
      api_get_ship: expect.any(Object)
    });

    const missionResult = await post("api_req_mission/result", { api_deck_id: 2 });
    expect(missionResult.json().api_data).toMatchObject({ api_clear_result: 1, api_get_material: expect.any(Array) });
  });

  it("has non-unknown local handlers for the planned API surface", async () => {
    const plannedPaths = [
      "api_get_member/slot_item",
      "api_get_member/unsetslot",
      "api_get_member/useitem",
      "api_get_member/kdock",
      "api_get_member/ndock",
      "api_get_member/mapinfo",
      "api_get_member/mission",
      "api_get_member/preset_deck",
      "api_get_member/preset_slot",
      "api_get_member/payitem",
      "api_get_member/record",
      "api_get_member/picture_book",
      "api_get_member/practice",
      "api_get_member/sortie_conditions",
      "api_get_member/chart_additional_info",
      "api_req_init/nickname",
      "api_req_init/firstship",
      "api_req_member/update_tutorial_progress",
      "api_req_member/set_option_setting",
      "api_req_member/set_flagship_position",
      "api_req_hensei/change",
      "api_req_hensei/combined",
      "api_req_kaisou/slotset_ex",
      "api_req_kaisou/unsetslot_all",
      "api_req_kaisou/slot_exchange_index",
      "api_req_kaisou/slot_deprive",
      "api_req_kaisou/lock",
      "api_req_kaisou/powerup",
      "api_req_kaisou/remodeling",
      "api_req_quest/stop",
      "api_req_quest/clearitemget",
      "api_req_furniture/buy",
      "api_req_furniture/music_list",
      "api_req_furniture/music_play",
      "api_req_furniture/set_portbgm",
      "api_req_furniture/radio_play",
      "api_req_nyukyo/speedchange",
      "api_req_nyukyo/open_new_dock",
      "api_req_kousyou/destroyitem2",
      "api_req_kousyou/createship_speedchange",
      "api_req_kousyou/getship",
      "api_req_kousyou/destroyship",
      "api_req_kousyou/open_new_dock",
      "api_req_kousyou/remodel_slotlist",
      "api_req_kousyou/remodel_slotlist_detail",
      "api_req_kousyou/remodel_slot",
      "api_req_mission/return_instruction",
      "api_req_member/itemuse",
      "api_req_member/itemuse_cond",
      "api_req_member/payitemuse",
      "api_req_member/get_incentive",
      "api_req_member/get_event_selected_reward",
      "api_req_map/next",
      "api_req_battle_midnight/battle",
      "api_req_battle_midnight/sp_midnight",
      "api_req_sortie/night_to_day",
      "api_req_sortie/airbattle",
      "api_req_sortie/ld_airbattle",
      "api_req_sortie/ld_shooting",
      "api_req_sortie/goback_port",
      "api_req_map/anchorage_repair",
      "api_req_map/select_eventmap_rank",
      "api_req_map/start_air_base",
      "api_dmm_payment/paycheck"
    ];

    for (const pathname of plannedPaths) {
      const response = await post(pathname, {
        api_id: 1,
        api_ship_id: 1,
        api_deck_id: 1,
        api_slot_idx: 0,
        api_item_id: 1,
        api_quest_id: 101
      });
      expect(response.statusCode, pathname).toBe(200);
      expect(response.json().api_result, pathname).not.toBe(404);
    }
  });
});
