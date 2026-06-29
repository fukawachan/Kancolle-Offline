import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ENEMY_UNIT_TEMPLATES, sortieNodes } from "../src/master/sortie-data.js";
import { createResourceManifest } from "../src/resources/manifest.js";
import { buildApp } from "../src/server/app.js";
import { createStateStore, type StateStore } from "../src/state/store.js";

describe("local kcsapi endpoints", () => {
  let tempDir: string;
  let store: StateStore;
  let app: Awaited<ReturnType<typeof buildApp>>;
  let arsenalRolls: number[];

  beforeEach(async () => {
    arsenalRolls = [];
    tempDir = await mkdtemp(path.join(tmpdir(), "kancolle-api-"));
    store = createStateStore({ databasePath: path.join(tempDir, "save.sqlite") });
    store.registerAccount(15);
    app = await buildApp({
      cacheDir: path.resolve("cache"),
      stateStore: store,
      unknownLogPath: path.join(tempDir, "unknown.jsonl"),
      arsenalRandom: () => arsenalRolls.shift() ?? 0
    });
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    vi.useRealTimers();
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

  async function get(pathname: string) {
    return app.inject({
      method: "GET",
      url: pathname
    });
  }

  function prepareAkashiFactory() {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-06-28T03:00:00.000Z")); // Sunday noon in JST.
    const akashi = store.createShip(187);
    store.changeDeckShip(1, 0, akashi.id);
    store.clearDeckFollowerShips(1);
    return akashi;
  }

  function resetSlotItems() {
    store.db.prepare("DELETE FROM slot_items").run();
  }

  async function remodelCandidateFor(sourceMasterId: number) {
    const list = (await post("api_req_kousyou/remodel_slotlist")).json().api_data;
    expect(Array.isArray(list)).toBe(true);
    const candidate = list.find((item: any) => item.api_slot_id === sourceMasterId);
    expect(candidate).toBeDefined();
    return candidate;
  }

  function expectBattlePhasePlaceholders(data: any) {
    expect(data).toHaveProperty("api_air_base_attack");
    expect(data).toHaveProperty("api_opening_taisen");
    expect(data).toHaveProperty("api_opening_atack");
    expect(data).toHaveProperty("api_kouku2");
    expect(data).toHaveProperty("api_friendly_info");
    expect(data).toHaveProperty("api_friendly_kouku");
    expect(data).toHaveProperty("api_friendly_battle");
  }

  function expectFixedFleetArrays(data: any) {
    for (const key of ["api_f_nowhps", "api_f_maxhps", "api_e_nowhps", "api_e_maxhps", "api_fParam", "api_eParam", "api_eSlot"]) {
      expect(data[key], key).toHaveLength(6);
    }
    expect(data.api_nowhps).toHaveLength(13);
    expect(data.api_maxhps).toHaveLength(13);
  }

  function isVictoryRank(rank: string) {
    return ["S", "A", "B"].includes(rank);
  }

  it("returns structurally complete start2 master data and option settings", async () => {
    const start2 = await post("api_start2/getData");
    const options = await post("api_start2/get_option_setting");

    expect(start2.statusCode).toBe(200);
    const start2Data = start2.json().api_data;
    expect(start2Data).toMatchObject({
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
      api_mst_equip_ship: expect.any(Object),
      api_mst_equip_limit_exslot: expect.any(Object),
      api_mst_shipgraph: expect.any(Array)
    });
    expect(start2Data.api_mst_ship.length).toBeGreaterThan(800);
    expect(start2Data.api_mst_slotitem.length).toBeGreaterThan(500);
    expect(start2Data.api_mst_shipgraph).toHaveLength(start2Data.api_mst_ship.length);
    expect(start2Data.api_mst_shipgraph.find((ship: any) => ship.api_id === 6)).toMatchObject({
      api_filename: "kksiqffpclxh",
      api_version: expect.arrayContaining(["28"])
    });
    expect(start2Data.api_mst_ship.find((ship: any) => ship.api_id === 9)).toMatchObject({
      api_name: "吹雪",
      api_yomi: "Fubuki",
      api_afterfuel: 100,
      api_afterbull: 100
    });
    expect(start2Data.api_mst_shipupgrade.length).toBeGreaterThan(0);
    expect(start2Data.api_mst_shipupgrade.find((upgrade: any) => upgrade.api_original_ship_id === 9)).toMatchObject({
      api_upgrade_type: 1
    });
    expect(start2Data.api_mst_ship.find((ship: any) => ship.api_id === 10)).toMatchObject({
      api_name: "白雪",
      api_yomi: "Shirayuki"
    });
    expect(start2Data.api_mst_ship.find((ship: any) => ship.api_id === 11)).toMatchObject({
      api_name: "深雪",
      api_yomi: "Miyuki",
      api_soku: 10
    });
    expect(start2Data.api_mst_ship.find((ship: any) => ship.api_id === 54)).toMatchObject({
      api_name: "川内",
      api_yomi: "Sendai"
    });
    expect(start2Data.api_mst_ship.find((ship: any) => ship.api_id === 77)).toMatchObject({
      api_name: "伊勢",
      api_yomi: "Ise"
    });
    expect(start2Data.api_mst_ship.find((ship: any) => ship.api_id === 277)).toMatchObject({
      api_name: "赤城改",
      api_soku: 10
    });
    expect(start2Data.api_mst_mapcell.find((cell: any) => cell.api_id === 1202)).toMatchObject({
      api_maparea_id: 1,
      api_mapinfo_no: 2,
      api_no: 2,
      api_color_no: 8
    });
    expect(start2Data.api_mst_shipgraph.find((ship: any) => ship.api_id === 9)).toMatchObject({
      api_filename: "gyckjmemgqoe"
    });
    expect(start2Data.api_mst_shipgraph.find((ship: any) => ship.api_id === 179)).toMatchObject({
      api_filename: "qgkjswznylty"
    });
    expect(start2Data.api_mst_shipgraph.find((ship: any) => ship.api_id === 77)).toMatchObject({
      api_filename: "skgpomqtcedb"
    });
    expect(start2Data.api_mst_ship.find((ship: any) => ship.api_id === 1501)).toMatchObject({
      api_name: "駆逐イ級",
      api_stype: 2
    });
    expect(start2Data.api_mst_ship.find((ship: any) => ship.api_id === 1502)).toMatchObject({
      api_name: "駆逐ロ級",
      api_stype: 2
    });
    expect(start2Data.api_mst_ship.find((ship: any) => ship.api_id === 1503)).toMatchObject({
      api_name: "駆逐ハ級",
      api_stype: 2
    });
    expect(start2Data.api_mst_ship.find((ship: any) => ship.api_id === 1505)).toMatchObject({
      api_name: "軽巡ホ級",
      api_stype: 3
    });
    expect(start2Data.api_mst_shipgraph.find((ship: any) => ship.api_id === 1501)).toMatchObject({
      api_filename: "mtjmdcwtvhdr"
    });
    expect(start2Data.api_mst_shipgraph.find((ship: any) => ship.api_id === 1502)).toMatchObject({
      api_filename: "pbgkfylkbjuy"
    });
    expect(start2Data.api_mst_shipgraph.find((ship: any) => ship.api_id === 1505)).toMatchObject({
      api_filename: "itslcqtmrxtf"
    });
    const battleBgmIds = new Set(
      start2Data.api_mst_bgm
        .map((bgm: any) => bgm.api_id)
        .filter((id: unknown) => typeof id === "number" && id > 0)
    );
    const map11Bgm = start2Data.api_mst_mapbgm.find((bgm: any) => bgm.api_id === 11);
    expect(map11Bgm).toMatchObject({
      api_moving_bgm: 154,
      api_map_bgm: [155, 2],
      api_boss_bgm: [156, 156]
    });
    for (const mapBgm of start2Data.api_mst_mapbgm) {
      expect(mapBgm.api_moving_bgm, `moving BGM for map ${mapBgm.api_id}`).toBeGreaterThan(0);
      for (const id of [...mapBgm.api_map_bgm, ...mapBgm.api_boss_bgm]) {
        expect(id, `battle BGM id for map ${mapBgm.api_id}`).toBeGreaterThan(0);
        expect(battleBgmIds.has(id), `api_mst_bgm contains battle BGM ${id}`).toBe(true);
      }
    }
    const shipById = new Map(start2Data.api_mst_ship.map((ship: any) => [ship.api_id, ship]));
    expect(((shipById.get(9) as any).api_voicef as number) & 1).toBe(0);
    expect(((shipById.get(179) as any).api_voicef as number) & 1).toBe(1);
    // Equipment name–ID mappings must match cached resource IDs
    const slotById = new Map(start2Data.api_mst_slotitem.map((slot: any) => [slot.api_id, slot]));
    expect(slotById.get(1)).toMatchObject({ api_name: "12cm単装砲", api_yomi: "12cm Single Gun Mount" });
    expect(slotById.get(2)).toMatchObject({ api_name: "12.7cm連装砲", api_yomi: "12.7cm Twin Gun Mount" });
    expect(slotById.get(1501)).toMatchObject({ api_name: "5inch単装砲" });
    expect(slotById.get(1502)).toMatchObject({ api_name: "5inch連装砲" });
    expect(slotById.get(1504)).toMatchObject({ api_name: "5inch単装高射砲" });
    expect(slotById.get(1513)).toMatchObject({ api_name: "21inch魚雷前期型" });
    expect(slotById.get(1525)).toMatchObject({ api_name: "深海棲艦偵察機" });
    const sortieEnemyIds = new Set(sortieNodes().flatMap((node) => node.encounters.flatMap((encounter) => encounter.shipIds)));
    for (const shipId of sortieEnemyIds) {
      expect(shipById.has(shipId), `api_mst_ship contains sortie enemy ${shipId}`).toBe(true);
    }
    for (const [shipId, template] of Object.entries(ENEMY_UNIT_TEMPLATES)) {
      expect(shipById.has(Number(shipId)), `api_mst_ship contains enemy template ${shipId}`).toBe(true);
      for (const slotId of template.slots) {
        if (slotId > 0) {
          expect(slotById.has(slotId), `api_mst_slotitem contains enemy slot ${slotId}`).toBe(true);
        }
      }
    }
    for (const node of sortieNodes()) {
      for (const drop of node.dropPool) {
        if (drop.shipId != null) expect(shipById.has(drop.shipId), `api_mst_ship contains drop ${drop.shipName}`).toBe(true);
      }
    }
    expect(slotById.get(3)).toMatchObject({ api_name: "10cm連装高角砲", api_yomi: "10cm Twin High-angle Gun Mount" });
    expect(slotById.get(4)).toMatchObject({ api_name: "14cm単装砲", api_yomi: "14cm Single Gun Mount" });
    expect(slotById.get(10)).toMatchObject({ api_name: "12.7cm連装高角砲", api_yomi: "12.7cm Twin High-angle Gun Mount" });
    expect(slotById.get(37)).toMatchObject({ api_name: "7.7mm機銃", api_yomi: "7.7mm Machine Gun" });
    expect(slotById.get(46)).toMatchObject({ api_name: "九三式水中聴音機", api_yomi: "Type 93 Passive Sonar" });
    // Equipment type IDs must be consistent
    expect((slotById.get(1) as any).api_type[2]).toBe(1);   // Small Caliber Main Gun
    expect((slotById.get(4) as any).api_type[2]).toBe(2);   // Medium Caliber Main Gun
    expect((slotById.get(10) as any).api_type[2]).toBe(4);  // Secondary Gun
    expect((slotById.get(37) as any).api_type[2]).toBe(21); // Anti-Aircraft Gun
    expect((slotById.get(46) as any).api_type[2]).toBe(14); // Sonar
    expect(slotById.get(20)).toMatchObject({ api_leng: 0, api_cost: 4, api_distance: 7 });
    expect(slotById.get(27)).toMatchObject({ api_leng: 0 });
    expect(slotById.get(64)).toMatchObject({ api_type: [3, 5, 7, 7, 59], api_version: 2 });
    expect(slotById.get(69)).toMatchObject({ api_type: [3, 15, 25, 21, 53], api_cost: 2, api_distance: 1 });
    expect(slotById.get(70)).toMatchObject({ api_type: [3, 16, 26, 22, 54], api_cost: 3, api_distance: 2 });
    expect(slotById.get(138)).toMatchObject({ api_cost: 25, api_distance: 20 });
    expect(slotById.get(505)).toMatchObject({ api_type: [4, 6, 21, 15, 0], api_leng: 0 });
    const shipTypeById = new Map(start2Data.api_mst_stype.map((shipType: any) => [shipType.api_id, shipType]));
    const destroyerEquipTypes = (shipTypeById.get(2) as any).api_equip_type;
    expect(destroyerEquipTypes["1"]).toBe(1);
    expect(destroyerEquipTypes["6"]).toBe(0);
    expect(Object.keys(start2Data.api_mst_equip_ship).length).toBeGreaterThan(0);
    // Default slot items should match new account equipment
    const port = (await post("api_port/port")).json().api_data;
    const slotItemMasterIds = (await post("api_get_member/slot_item")).json().api_data
      .map((item: any) => item.api_slotitem_id);
    expect(slotItemMasterIds).toEqual([1, 1, 2, 46]);
    const furnitureById = new Map(start2Data.api_mst_furniture.map((item: any) => [item.api_id, item]));
    expect(start2Data.api_mst_furniture.length).toBeGreaterThan(600);
    expect(furnitureById.get(1)).toMatchObject({
      api_type: 0,
      api_no: 0,
      api_title: "鎮守府の床",
      api_bgm_id: 0,
      api_outside_id: 0,
      api_active_flag: 0
    });
    expect(furnitureById.get(38)).toMatchObject({ api_type: 1, api_no: 0, api_title: "普通の壁紙" });
    expect(furnitureById.get(72)).toMatchObject({ api_type: 2, api_no: 0, api_title: "赤カーテンの窓", api_outside_id: 1 });
    expect(furnitureById.get(102)).toMatchObject({ api_type: 3, api_no: 0, api_title: "なし" });
    expect(furnitureById.get(133)).toMatchObject({ api_type: 4, api_no: 0, api_title: "なし" });
    expect(furnitureById.get(164)).toMatchObject({ api_type: 5, api_no: 0, api_title: "ただの段ボール" });
    expect(start2Data.api_mst_furnituregraph).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ api_id: 1, api_type: 0, api_no: 0, api_filename: "8807" }),
        expect.objectContaining({ api_id: 38, api_type: 1, api_no: 0, api_filename: "1261" }),
        expect.objectContaining({ api_id: 72, api_type: 2, api_no: 0, api_filename: "1850" }),
        expect.objectContaining({ api_id: 102, api_type: 3, api_no: 0, api_filename: "2348" }),
        expect.objectContaining({ api_id: 133, api_type: 4, api_no: 0, api_filename: "2373" }),
        expect.objectContaining({ api_id: 164, api_type: 5, api_no: 0, api_filename: "3565" }),
        expect.objectContaining({ api_id: 6, api_type: 0, api_no: 5, api_filename: "8280" })
      ])
    );
    expect(start2Data.api_mst_bgm.map((bgm: any) => bgm.api_id)).not.toContain(0);
    expect(start2Data.api_mst_bgm).toEqual(
      expect.arrayContaining([expect.objectContaining({ api_id: 101, api_name: "母港" })])
    );
    expect(start2Data.api_mst_bgm.map((bgm: any) => bgm.api_id)).toEqual(expect.arrayContaining([101, 154, 155, 156]));
    expect(start2Data.api_mst_useitem.map((item: any) => item.api_id)).toEqual(expect.arrayContaining([54, 59]));
    expect(start2Data.api_mst_maparea).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ api_id: 1, api_name: "鎮守府海域", api_type: 0 }),
        expect.objectContaining({ api_id: 2, api_name: "南西諸島海域", api_type: 0 }),
        expect.objectContaining({ api_id: 7, api_name: "南西海域", api_type: 0 })
      ])
    );
    expect(start2Data.api_mst_mapinfo.find((map: any) => map.api_id === 11)).toMatchObject({
      api_id: 11,
      api_maparea_id: 1,
      api_no: 1,
      api_name: "鎮守府正面海域",
      api_sally_flag: [1, 0, 0]
    });
    expect(start2Data.api_mst_mapbgm.find((map: any) => map.api_id === 11)).toMatchObject({
      api_id: 11,
      api_maparea_id: 1,
      api_no: 1,
      api_map_bgm: expect.any(Array),
      api_boss_bgm: expect.any(Array)
    });
    expect(start2Data.api_mst_mapcell).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ api_maparea_id: 1, api_mapinfo_no: 1, api_no: 0, api_color_no: 0 }),
        expect.objectContaining({ api_maparea_id: 1, api_mapinfo_no: 1, api_no: 1, api_color_no: 4 })
      ])
    );
    expect(start2Data.api_mst_const.api_boko_max_ships).toMatchObject({
      api_string_value: "",
      api_int_value: 740
    });
    expect(options.json().api_data).toMatchObject({
      api_bgm_flag: 1,
      api_voice_flag: 1,
      api_skin_id: 101,
      api_vol_bgm: expect.any(Number),
      api_vol_voice: 80,
      api_volume_setting: {
        api_bgm: expect.any(Number),
        api_se: expect.any(Number),
        api_voice: 80,
        api_be_left: expect.any(Number),
        api_duty: expect.any(Number),
        api_vol_bgm: expect.any(Number),
        api_voice_flag: 1,
        api_vol_voice: 80
      }
    });
  });

  it("returns a client-complete record profile and local ranking placeholder", async () => {
    const record = await post("api_get_member/record");
    const ranking = await post("api_req_ranking/mxltvkpyuklh", { api_pageno: 1 });
    const emptyRanking = await post("api_req_ranking/mxltvkpyuklh", { api_pageno: 2 });

    expect(record.statusCode).toBe(200);
    const recordData = record.json().api_data;
    expect(recordData).toMatchObject({
      api_member_id: 1,
      api_nickname: "Local Admiral",
      api_nickname_id: "Local Admiral",
      api_cmt: "Local offline save",
      api_cmt_id: "Local offline save",
      api_level: 1,
      api_rank: expect.any(Number),
      api_experience: [0, 100],
      api_war: { api_win: 0, api_lose: 0, api_rate: expect.any(String) },
      api_mission: { api_count: 0, api_success: 0, api_rate: expect.any(String) },
      api_practice: { api_win: 0, api_lose: 0, api_rate: expect.any(String) },
      api_deck: 4,
      api_kdoc: 4,
      api_ndoc: 4,
      api_ship: [4, 300],
      api_slotitem: [4, 497],
      api_material_max: 1000000,
      api_air_base_expanded_info: [
        { api_area_id: 5, api_maintenance_level: 1 },
        { api_area_id: 6, api_maintenance_level: 1 },
        { api_area_id: 7, api_maintenance_level: 1 }
      ]
    });
    expect(Number.isNaN(Number.parseFloat(recordData.api_war.api_rate))).toBe(false);
    expect(Number.isNaN(Number.parseFloat(recordData.api_mission.api_rate))).toBe(false);
    expect(Number.isNaN(Number.parseFloat(recordData.api_practice.api_rate))).toBe(false);
    expect(recordData.api_furniture).toEqual(expect.any(Number));

    expect(ranking.statusCode).toBe(200);
    expect(ranking.json().api_data).toMatchObject({
      api_count: 1,
      api_page_count: 1,
      api_disp_page: 1,
      api_list: [
        {
          api_mxltvkpyuklh: 1,
          api_mtjmdcwtvhdr: "Local Admiral",
          api_itbrdpdbkynm: "Local offline save",
          api_pbgkfylkbjuy: expect.any(Number),
          api_pcumlrymlujh: expect.any(Number),
          api_itslcqtmrxtf: expect.any(Number),
          api_wuhnhojjxmke: expect.any(Number),
          api_xlqcmisdyfiu: expect.any(Number),
          api_mcouotbbbzpx: expect.any(Number)
        }
      ]
    });
    expect(emptyRanking.statusCode).toBe(200);
    expect(emptyRanking.json().api_data).toMatchObject({
      api_count: 1,
      api_page_count: 1,
      api_disp_page: 2,
      api_list: []
    });
  });

  it("serves cache-backed ship and equipment picture book pages", async () => {
    const firstShips = (await post("api_get_member/picture_book", { api_type: 1, api_no: 1 })).json().api_data;
    const laterShipBlock = (await post("api_get_member/picture_book", { api_type: 1, api_no: 2 })).json().api_data;
    const firstSlots = (await post("api_get_member/picture_book", { api_type: 2, api_no: 1 })).json().api_data;
    const laterSlotBlock = (await post("api_get_member/picture_book", { api_type: 2, api_no: 2 })).json().api_data;

    expect(firstShips.api_list).toHaveLength(70);
    expect(firstShips.api_list[0]).toMatchObject({
      api_index_no: 1,
      api_table_id: [expect.any(Number)],
      api_state: [[1, 1, 0]],
      api_q_voice_info: []
    });
    expect(firstShips.api_list[0].api_houg).toEqual(expect.any(Number));
    expect(firstShips.api_list[0].api_taik).toEqual(expect.any(Number));
    expect(firstShips.api_list[69].api_index_no).toBe(70);

    expect(laterShipBlock.api_list).toHaveLength(70);
    expect(laterShipBlock.api_list[0].api_index_no).toBe(71);
    expect(laterShipBlock.api_list[0].api_table_id).toEqual([expect.any(Number)]);
    expect(laterShipBlock.api_list[19].api_index_no).toBe(90);
    expect(laterShipBlock.api_list[20].api_index_no).toBe(91);

    expect(firstSlots.api_list).toHaveLength(70);
    expect(firstSlots.api_list[0]).toMatchObject({
      api_index_no: 1,
      api_table_id: [expect.any(Number)],
      api_type: expect.arrayContaining([expect.any(Number)])
    });
    expect(firstSlots.api_list[0].api_houg).toEqual(expect.any(Number));
    expect(firstSlots.api_list[0].api_info).toEqual(expect.any(String));
    expect(firstSlots.api_list[69].api_index_no).toBe(70);

    expect(laterSlotBlock.api_list).toHaveLength(70);
    expect(laterSlotBlock.api_list[0].api_index_no).toBe(71);
    expect(laterSlotBlock.api_list[20].api_index_no).toBe(91);
  });

  it("provides use item masters needed for the client material counters", async () => {
    const start2 = (await post("api_start2/getData")).json().api_data;
    const useitemById = new Map(start2.api_mst_useitem.map((item: any) => [item.api_id, item]));

    expect([...useitemById.keys()]).toEqual(expect.arrayContaining([31, 32, 33, 34, 44, 49, 55, 57, 61, 64, 97, 105]));
    expect(useitemById.get(31)).toMatchObject({ api_id: 31, api_usetype: 6, api_category: 16, api_name: "燃料" });
    expect(useitemById.get(32)).toMatchObject({ api_id: 32, api_usetype: 6, api_category: 17, api_name: "弾薬" });
    expect(useitemById.get(33)).toMatchObject({ api_id: 33, api_usetype: 6, api_category: 18, api_name: "鋼材" });
    expect(useitemById.get(34)).toMatchObject({ api_id: 34, api_usetype: 6, api_category: 19, api_name: "ボーキサイト" });
    expect(useitemById.get(44)).toMatchObject({ api_id: 44, api_usetype: 6, api_category: 21, api_name: "家具コイン" });
    expect(useitemById.get(49)).toMatchObject({ api_id: 49, api_name: "ドック開放キー", api_description: [expect.any(String)] });
    expect(useitemById.get(55)).toMatchObject({ api_id: 55, api_name: "書類一式＆指輪", api_description: [expect.any(String)] });
    expect(useitemById.get(57)).toMatchObject({ api_id: 57, api_usetype: 4, api_name: "勲章", api_description: [expect.any(String)] });
    expect(useitemById.get(61)).toMatchObject({ api_id: 61, api_usetype: 4, api_name: "甲種勲章", api_description: [expect.any(String)] });
    expect(useitemById.get(64)).toMatchObject({ api_id: 64, api_name: "補強増設", api_description: [expect.any(String)] });
    expect(useitemById.get(97)).toMatchObject({ api_id: 97, api_usetype: 4, api_name: "てるてる坊主", api_description: [expect.any(String)] });
    expect(useitemById.get(105)).toMatchObject({ api_id: 105, api_usetype: 0, api_category: 0, api_name: "格納庫増設" });
  });

  it("provides official non-payment shop masters and cabinet order", async () => {
    const start2 = (await post("api_start2/getData")).json().api_data;
    const payitemById = new Map(start2.api_mst_payitem.map((item: any) => [item.api_id, item]));

    expect(start2.api_mst_payitem).toHaveLength(32);
    expect(payitemById.get(1)).toMatchObject({
      api_id: 1,
      api_name: "燃料パック250",
      api_price: 100,
      api_item: [250, 0, 0, 0, 0, 0, 0, 0]
    });
    expect(payitemById.get(10)).toMatchObject({ api_id: 10, api_name: "ドック増設セット", api_price: 1000 });
    expect(payitemById.get(26)).toMatchObject({ api_id: 26, api_name: "補強増設", api_price: 500 });
    expect(start2.api_mst_item_shop).toEqual({
      api_cabinet_1: [1, 2, 3, 4, 15, 5, 31, 7, 6, 32, 11, 14, 10, -1],
      api_cabinet_2: [16, 17, 20, 19, 8, 9, 18, 22, 23, 26, 24, 25, 27, 28, 29, 30, -1, -1]
    });

    const cabinetIds = [
      ...start2.api_mst_item_shop.api_cabinet_1,
      ...start2.api_mst_item_shop.api_cabinet_2
    ].filter((id: number) => id > 0);
    expect(cabinetIds.every((id: number) => payitemById.has(id))).toBe(true);
  });

  it("uses the current client payitemuse response shape without creating paid purchases", async () => {
    const payitems = await post("api_get_member/payitem");
    expect(payitems.json().api_data).toEqual([]);

    const use = await post("api_req_member/payitemuse", { api_payitem_id: 1, api_force_flag: 0 });
    expect(use.json().api_data).toEqual({ api_caution_flag: 0 });

    const after = await post("api_get_member/payitem");
    expect(after.json().api_data).toEqual([]);
  });

  it("records local shop checkout as pending and releases purchased use items on pickup", async () => {
    const checkout = await post("api_dmm_payment/paycheck", {
      api_local_purchase: 1,
      api_payitem_id: 26,
      api_price: 500,
      api_count: 2
    });
    expect(checkout.json().api_data).toEqual({ api_check_value: 2 });

    const poll = await post("api_dmm_payment/paycheck");
    expect(poll.json().api_data).toEqual({ api_check_value: 2 });

    const pending = (await post("api_get_member/payitem")).json().api_data;
    expect(pending).toEqual([
      expect.objectContaining({
        api_payitem_id: "26",
        api_name: "補強増設",
        api_count: 2
      })
    ]);

    const firstPickup = await post("api_req_member/payitemuse", { api_payitem_id: 26, api_force_flag: 0 });
    expect(firstPickup.json().api_data).toEqual({ api_caution_flag: 0 });
    expect((await post("api_get_member/payitem")).json().api_data).toEqual([
      expect.objectContaining({ api_payitem_id: "26", api_count: 1 })
    ]);
    expect((await post("api_get_member/useitem")).json().api_data).toContainEqual({ api_id: 64, api_count: 1 });

    const secondPickup = await post("api_req_member/payitemuse", { api_payitem_id: 26, api_force_flag: 0 });
    expect(secondPickup.json().api_data).toEqual({ api_caution_flag: 0 });
    expect((await post("api_get_member/payitem")).json().api_data).toEqual([]);
    expect((await post("api_get_member/useitem")).json().api_data).toContainEqual({ api_id: 64, api_count: 2 });
  });

  it("releases material, use item, and slot item rewards from purchased payitems", async () => {
    await post("api_dmm_payment/paycheck", {
      api_local_purchase: 1,
      api_payitem_id: 10,
      api_price: 1000,
      api_count: 1
    });
    await post("api_req_member/payitemuse", { api_payitem_id: 10, api_force_flag: 0 });

    const afterDockSet = store.getSave();
    expect(afterDockSet.materials).toMatchObject({
      buildKit: 16,
      repairKit: 16,
      devmat: 56
    });
    expect(afterDockSet.useItems).toContainEqual({ id: 49, count: 1 });

    await post("api_dmm_payment/paycheck", {
      api_local_purchase: 1,
      api_payitem_id: 12,
      api_price: 1000,
      api_count: 1
    });
    await post("api_req_member/payitemuse", { api_payitem_id: 12, api_force_flag: 0 });

    const slotMasterCounts = new Map<number, number>();
    for (const item of store.getSave().slotItems) {
      slotMasterCounts.set(item.masterId, (slotMasterCounts.get(item.masterId) ?? 0) + 1);
    }
    expect(slotMasterCounts.get(42)).toBe(3);
    expect(slotMasterCounts.get(43)).toBe(2);
    expect((await post("api_get_member/payitem")).json().api_data).toEqual([]);
  });

  it("expands port capacity when picking up mother port expansion", async () => {
    const beforeBasic = (await post("api_get_member/basic")).json().api_data;
    expect(beforeBasic.api_max_chara).toBe(300);
    expect(beforeBasic.api_max_slotitem).toBe(500);

    await post("api_dmm_payment/paycheck", {
      api_local_purchase: 1,
      api_payitem_id: 16,
      api_price: 1000,
      api_count: 1
    });
    const pickup = await post("api_req_member/payitemuse", { api_payitem_id: 16, api_force_flag: 0 });
    expect(pickup.json().api_data).toEqual({ api_caution_flag: 0 });

    const basic = (await post("api_get_member/basic")).json().api_data;
    const record = (await post("api_get_member/record")).json().api_data;
    expect(basic.api_max_chara).toBe(310);
    expect(basic.api_max_slotitem).toBe(540);
    expect(record.api_ship).toEqual([store.getSave().ships.length, 310]);
    expect(record.api_slotitem).toEqual([store.getSave().slotItems.length, 537]);
  });

  it("publishes medal use item counts through basic aggregates used by the shop", async () => {
    store.db.prepare("INSERT INTO use_items (id, count) VALUES (57, 30)").run();

    const useitem = await post("api_get_member/useitem");
    const basic = await post("api_get_member/basic");
    const port = await post("api_port/port");
    const requireInfo = await post("api_get_member/require_info");

    expect(useitem.json().api_data).toContainEqual({ api_id: 57, api_count: 30 });
    expect(basic.json().api_data.api_medals).toBe(30);
    expect(port.json().api_data.api_basic.api_medals).toBe(30);
    expect(requireInfo.json().api_data.api_basic.api_medals).toBe(30);
  });

  it("publishes every shop resource count through the client-read API path", async () => {
    store.db.prepare(`
      UPDATE materials
      SET fuel = 111, ammo = 222, steel = 333, bauxite = 444,
        repair_kit = 55, build_kit = 66, devmat = 77, screw = 88
      WHERE player_id = 1
    `).run();
    store.db.prepare("UPDATE furniture SET coins = 345 WHERE id = 1").run();
    store.db.prepare(`
      INSERT INTO use_items (id, count) VALUES
        (57, 30),
        (58, 2),
        (61, 3),
        (78, 4),
        (97, 5),
        (105, 6)
    `).run();

    const material = (await post("api_get_member/material")).json().api_data;
    const useitem = (await post("api_get_member/useitem")).json().api_data;
    const basic = (await post("api_get_member/basic")).json().api_data;
    const port = (await post("api_port/port")).json().api_data;
    const requireInfo = (await post("api_get_member/require_info")).json().api_data;

    expect(material).toMatchObject([
      { api_id: 1, api_value: 111 },
      { api_id: 2, api_value: 222 },
      { api_id: 3, api_value: 333 },
      { api_id: 4, api_value: 444 },
      { api_id: 5, api_value: 66 },
      { api_id: 6, api_value: 55 },
      { api_id: 7, api_value: 77 },
      { api_id: 8, api_value: 88 }
    ]);
    expect(useitem).toEqual(expect.arrayContaining([
      { api_id: 1, api_count: 55 },
      { api_id: 2, api_count: 66 },
      { api_id: 3, api_count: 77 },
      { api_id: 4, api_count: 88 },
      { api_id: 57, api_count: 30 },
      { api_id: 58, api_count: 2 },
      { api_id: 61, api_count: 3 },
      { api_id: 78, api_count: 4 },
      { api_id: 97, api_count: 5 },
      { api_id: 105, api_count: 6 }
    ]));
    expect(basic).toMatchObject({ api_fcoin: 345, api_medals: 30 });
    expect(port.api_basic).toMatchObject({ api_fcoin: 345, api_medals: 30 });
    expect(requireInfo.api_basic).toMatchObject({ api_fcoin: 345, api_medals: 30 });
    expect(requireInfo.api_useitem).toEqual(expect.arrayContaining([
      { api_id: 61, api_count: 3 },
      { api_id: 97, api_count: 5 },
      { api_id: 105, api_count: 6 }
    ]));
  });

  it("keeps absent medal and special use item counts empty by default", async () => {
    const basic = (await post("api_get_member/basic")).json().api_data;
    const port = (await post("api_port/port")).json().api_data;
    const requireInfo = (await post("api_get_member/require_info")).json().api_data;
    const useitem = (await post("api_get_member/useitem")).json().api_data;
    const ids = new Set(useitem.map((item: any) => item.api_id));

    expect(basic.api_medals).toBe(0);
    expect(port.api_basic.api_medals).toBe(0);
    expect(requireInfo.api_basic.api_medals).toBe(0);
    expect(ids.has(57)).toBe(false);
    expect(ids.has(61)).toBe(false);
    expect(ids.has(97)).toBe(false);
    expect(ids.has(105)).toBe(false);
  });

  it("serves shop fairy item image fallbacks without broadening missing PNG fallback", async () => {
    const fairy1 = await get("/kcs2/img/item/fairy/1.png?version=6.2.1.0");
    const fairy2 = await get("/kcs2/img/item/fairy/2.png?version=6.2.1.0");
    const missing = await get("/kcs2/img/item/fairy/3.png?version=6.2.1.0");

    expect(fairy1.statusCode).toBe(200);
    expect(fairy1.headers["content-type"]).toBe("image/png");
    expect(fairy1.body.length).toBeGreaterThan(0);
    expect(fairy2.statusCode).toBe(200);
    expect(fairy2.headers["content-type"]).toBe("image/png");
    expect(fairy2.body.length).toBeGreaterThan(0);
    expect(missing.statusCode).toBe(404);
  });

  it("returns port aggregate and core get_member resources from the same persisted save", async () => {
    const start2 = await post("api_start2/getData");
    const port = await post("api_port/port");
    const basic = await post("api_get_member/basic");
    const ships = await post("api_get_member/ship2");
    const deck = await post("api_get_member/deck");
    const material = await post("api_get_member/material");
    const requireInfo = await post("api_get_member/require_info");
    const useitem = await post("api_get_member/useitem");

    expect(port.json().api_data).toMatchObject({
      api_basic: { api_nickname: "Local Admiral" },
      api_ship: expect.any(Array),
      api_deck_port: expect.any(Array),
      api_material: expect.any(Array),
      api_p_bgm_id: 101
    });
    expect(port.json().api_data.api_ship.map((ship: any) => ship.api_ship_id)).toEqual([9, 10, 1, 2]);
    const materialMasterIds = new Set(start2.json().api_data.api_mst_useitem.map((item: any) => item.api_id));
    const clientMaterialIds = [-1, 31, 32, 33, 34];
    const portMaterials = port.json().api_data.api_material.slice(0, 4);
    expect(portMaterials).toEqual([
      { api_member_id: 1, api_id: 1, api_value: 1000 },
      { api_member_id: 1, api_id: 2, api_value: 1000 },
      { api_member_id: 1, api_id: 3, api_value: 1000 },
      { api_member_id: 1, api_id: 4, api_value: 1000 }
    ]);
    expect(portMaterials.map((item: any) => clientMaterialIds[item.api_id])).toEqual([31, 32, 33, 34]);
    expect(portMaterials.every((item: any) => materialMasterIds.has(clientMaterialIds[item.api_id]))).toBe(true);
    expect(basic.json().api_data).toMatchObject({
      api_nickname: "Local Admiral",
      api_firstflag: 1,
      api_tutorial_progress: 100,
      api_furniture: [1, 38, 72, 102, 133, 164],
      api_fcoin: 200
    });
    expect(ships.json().api_data.length).toBeGreaterThan(0);
    expect(deck.json().api_data).toHaveLength(4);
    expect(material.json().api_data).toHaveLength(8);
    expect(material.json().api_data[0]).toMatchObject({ api_id: 1, api_value: 1000 });
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
    expect(requireInfo.json().api_data.api_useitem).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ api_id: 49, api_count: 0 }),
        expect.objectContaining({ api_id: 54, api_count: 0 }),
        expect.objectContaining({ api_id: 55, api_count: 0 }),
        expect.objectContaining({ api_id: 59, api_count: 0 }),
        expect.objectContaining({ api_id: 64, api_count: 0 })
      ])
    );
    expect(useitem.json().api_data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ api_id: 49, api_count: 0 }),
        expect.objectContaining({ api_id: 54, api_count: 0 }),
        expect.objectContaining({ api_id: 55, api_count: 0 }),
        expect.objectContaining({ api_id: 59, api_count: 0 }),
        expect.objectContaining({ api_id: 64, api_count: 0 })
      ])
    );
  });

  it("returns numeric material arrays for action responses read by index in the client", async () => {
    const charge = (await post("api_req_hokyu/charge", { api_id_items: "1", api_kind: 3 })).json().api_data;
    const craft = (await post("api_req_kousyou/createitem", { api_item1: 10, api_item2: 10, api_item3: 10, api_item4: 10 })).json().api_data;
    const destroyItem = (await post("api_req_kousyou/destroyitem2", { api_slotitem_ids: "2" })).json().api_data;
    const destroyShip = (await post("api_req_kousyou/destroyship", { api_ship_id: "2" })).json().api_data;

    expect(charge.api_material).toEqual([1000, 1000, 1000, 1000, 10, 10, 50, 5]);
    expect(craft.api_material).toEqual([990, 990, 990, 990, 10, 10, 49, 5]);
    expect(destroyItem.api_get_material).toEqual([1, 1, 2, 0]);
    expect(destroyShip.api_material).toEqual([992, 992, 994, 990, 10, 10, 49, 5]);
  });

  it("returns createitem slot payloads expected by the arsenal client", async () => {
    const craft = (await post("api_req_kousyou/createitem", { api_item1: 10, api_item2: 10, api_item3: 10, api_item4: 10 })).json().api_data;

    expect(Array.isArray(craft.api_get_items)).toBe(true);
    expect(craft.api_get_items).toEqual([craft.api_slot_item]);
    expect(craft.api_get_items[0]).toMatchObject({
      api_id: 5,
      api_slotitem_id: 1,
      api_locked: 0,
      api_level: 0,
      api_alv: 0
    });
    expect(craft.api_unset_items).toEqual([
      { api_type3: 1, api_slot_list: [1, 2, 3, 5] },
      { api_type3: 14, api_slot_list: [4] }
    ]);
  });

  it("returns three ordered success/failure entries for concentrated development", async () => {
    arsenalRolls = [0, 0.999999, 0];

    const craft = (await post("api_req_kousyou/createitem", {
      api_item1: 10,
      api_item2: 10,
      api_item3: 10,
      api_item4: 10,
      api_multiple_flag: 1
    })).json().api_data;

    expect(craft.api_create_flag).toBe(1);
    expect(craft.api_get_items).toHaveLength(3);
    expect(craft.api_get_items[0]).toMatchObject({ api_slotitem_id: expect.any(Number) });
    expect(craft.api_get_items[1]).toEqual({ api_id: -1, api_slotitem_id: -1 });
    expect(craft.api_get_items[2]).toMatchObject({ api_slotitem_id: expect.any(Number) });
    expect(craft.api_material).toEqual([970, 970, 970, 970, 10, 10, 48, 5]);
  });

  it("returns a client-compatible concentrated development failure without consuming development materials", async () => {
    arsenalRolls = [0.999999, 0.999999, 0.999999];

    const craft = (await post("api_req_kousyou/createitem", {
      api_item1: 10,
      api_item2: 10,
      api_item3: 10,
      api_item4: 10,
      api_multiple_flag: 1
    })).json().api_data;

    expect(craft.api_create_flag).toBe(0);
    expect(craft.api_slot_item).toBeNull();
    expect(craft.api_get_items).toEqual([
      { api_id: -1, api_slotitem_id: -1 },
      { api_id: -1, api_slotitem_id: -1 },
      { api_id: -1, api_slotitem_id: -1 }
    ]);
    expect(craft.api_material).toEqual([970, 970, 970, 970, 10, 10, 50, 5]);
  });

  it("requires Akashi as first fleet flagship before listing equipment improvements", async () => {
    resetSlotItems();
    store.createSlotItem(2);

    const list = (await post("api_req_kousyou/remodel_slotlist")).json().api_data;

    expect(list).toEqual([]);
  });

  it("lists three current Akashi factory candidates even when only one target equipment is owned", async () => {
    prepareAkashiFactory();
    resetSlotItems();
    store.createSlotItem(2);

    const list = (await post("api_req_kousyou/remodel_slotlist")).json().api_data;

    expect(list.map((item: any) => item.api_slot_id)).toEqual([2, 4, 14]);
    expect(list).toHaveLength(3);
  });

  it("lists three current Akashi factory candidates even when no target equipment is owned", async () => {
    prepareAkashiFactory();
    resetSlotItems();

    const list = (await post("api_req_kousyou/remodel_slotlist")).json().api_data;

    expect(list.map((item: any) => item.api_slot_id)).toEqual([2, 4, 14]);
    expect(list).toHaveLength(3);
  });

  it("lists current Akashi factory candidate costs from JST weekday rules", async () => {
    prepareAkashiFactory();
    resetSlotItems();
    store.createSlotItem(2);

    const candidate = await remodelCandidateFor(2);

    expect(candidate).toMatchObject({
      api_slot_id: 2,
      api_sp_type: 0,
      api_req_fuel: 10,
      api_req_bull: 30,
      api_req_steel: 60,
      api_req_bauxite: 0,
      api_req_buildkit: 1,
      api_req_remodelkit: 1,
      api_req_slot_id: 0,
      api_req_slot_num: 0
    });
  });

  it("returns low, high, and conversion improvement costs for the selected equipment", async () => {
    prepareAkashiFactory();
    resetSlotItems();
    const target = store.createSlotItem(2);
    const candidate = await remodelCandidateFor(2);

    const low = (await post("api_req_kousyou/remodel_slotlist_detail", {
      api_id: candidate.api_id,
      api_slot_id: target.id
    })).json().api_data;
    expect(low).toMatchObject({
      api_req_buildkit: 1,
      api_certain_buildkit: 2,
      api_req_remodelkit: 1,
      api_certain_remodelkit: 2,
      api_req_slot_id: 0,
      api_req_slot_num: 0,
      api_change_flag: 0
    });

    store.db.prepare("UPDATE slot_items SET level = 6 WHERE id = ?").run(target.id);
    const high = (await post("api_req_kousyou/remodel_slotlist_detail", {
      api_id: candidate.api_id,
      api_slot_id: target.id
    })).json().api_data;
    expect(high).toMatchObject({
      api_req_buildkit: 1,
      api_certain_buildkit: 2,
      api_req_remodelkit: 1,
      api_certain_remodelkit: 2,
      api_req_slot_id: 2,
      api_req_slot_num: 1,
      api_change_flag: 0
    });

    store.db.prepare("UPDATE slot_items SET level = 10 WHERE id = ?").run(target.id);
    const conversion = (await post("api_req_kousyou/remodel_slotlist_detail", {
      api_id: candidate.api_id,
      api_slot_id: target.id
    })).json().api_data;
    expect(conversion).toMatchObject({
      api_req_buildkit: 2,
      api_certain_buildkit: 3,
      api_req_remodelkit: 3,
      api_certain_remodelkit: 6,
      api_req_slot_id: 2,
      api_req_slot_num: 2,
      api_change_flag: 1
    });
  });

  it("applies certain equipment improvement and consumes guaranteed costs", async () => {
    prepareAkashiFactory();
    resetSlotItems();
    const target = store.createSlotItem(2);
    const candidate = await remodelCandidateFor(2);

    const result = (await post("api_req_kousyou/remodel_slot", {
      api_id: candidate.api_id,
      api_slot_id: target.id,
      api_certain_flag: 1
    })).json().api_data;

    expect(result.api_remodel_flag).toBe(1);
    expect(result.api_use_slot_id).toEqual([]);
    expect(result.api_after_slot).toMatchObject({
      api_id: target.id,
      api_slotitem_id: 2,
      api_level: 1
    });
    expect(result.api_after_material).toEqual([990, 970, 940, 1000, 10, 10, 48, 3]);
    expect(store.getSave().slotItems.find((item) => item.id === target.id)).toMatchObject({
      masterId: 2,
      level: 1
    });
  });

  it("consumes normal high-stage equipment improvement costs on failure while preserving the target", async () => {
    prepareAkashiFactory();
    resetSlotItems();
    const target = store.createSlotItem(2);
    const fodder = store.createSlotItem(2);
    store.db.prepare("UPDATE slot_items SET level = 6 WHERE id = ?").run(target.id);
    arsenalRolls = [0.999999];
    const candidate = await remodelCandidateFor(2);

    const result = (await post("api_req_kousyou/remodel_slot", {
      api_id: candidate.api_id,
      api_slot_id: target.id,
      api_certain_flag: 0
    })).json().api_data;

    expect(result.api_remodel_flag).toBe(0);
    expect(result.api_use_slot_id).toEqual([fodder.id]);
    expect(result.api_after_slot).toMatchObject({
      api_id: target.id,
      api_slotitem_id: 2,
      api_level: 6
    });
    expect(result.api_after_material).toEqual([990, 970, 940, 1000, 10, 10, 49, 4]);
    expect(store.getSave().slotItems.find((item) => item.id === target.id)).toMatchObject({
      masterId: 2,
      level: 6
    });
    expect(store.getSave().slotItems.some((item) => item.id === fodder.id)).toBe(false);
  });

  it("converts MAX equipment on successful improvement and keeps target flags", async () => {
    prepareAkashiFactory();
    resetSlotItems();
    const target = store.createSlotItem(2);
    const fodder1 = store.createSlotItem(2);
    const fodder2 = store.createSlotItem(2);
    store.db.prepare("UPDATE slot_items SET level = 10, proficiency = 4, locked = 1 WHERE id = ?").run(target.id);
    store.db.prepare("UPDATE materials SET screw = 10 WHERE player_id = 1").run();
    const candidate = await remodelCandidateFor(2);

    const result = (await post("api_req_kousyou/remodel_slot", {
      api_id: candidate.api_id,
      api_slot_id: target.id,
      api_certain_flag: 1
    })).json().api_data;

    expect(result.api_remodel_flag).toBe(1);
    expect(result.api_remodel_id).toEqual([2, 63]);
    expect(result.api_use_slot_id).toEqual([fodder1.id, fodder2.id]);
    expect(result.api_after_slot).toMatchObject({
      api_id: target.id,
      api_slotitem_id: 63,
      api_level: 0,
      api_alv: 4,
      api_locked: 1
    });
    expect(result.api_after_material).toEqual([990, 970, 940, 1000, 10, 10, 47, 4]);
    expect(store.getSave().slotItems.find((item) => item.id === target.id)).toMatchObject({
      masterId: 63,
      level: 0,
      proficiency: 4,
      locked: 1
    });
  });

  it("builds immediately with api_highspeed and returns the ship's initial equipment on claim", async () => {
    arsenalRolls = [0];
    const build = await post("api_req_kousyou/createship", {
      api_kdock_id: 1,
      api_large_flag: 0,
      api_item1: 30,
      api_item2: 30,
      api_item3: 30,
      api_item4: 30,
      api_item5: 1,
      api_highspeed: 1
    });

    expect(build.statusCode).toBe(200);
    expect(build.json().api_data.api_kdock).toMatchObject({
      api_id: 1,
      api_state: 3,
      api_item5: 1
    });
    expect(store.getSave().materials).toMatchObject({
      fuel: 970,
      ammo: 970,
      steel: 970,
      bauxite: 970,
      buildKit: 9,
      devmat: 49
    });

    const claim = await post("api_req_kousyou/getship", { api_kdock_id: 1 });
    const data = claim.json().api_data;
    expect(data.api_ship.api_ship_id).toBeGreaterThan(0);
    expect(data.api_slotitem.length).toBeGreaterThan(0);
    expect(data.api_kdock[0]).toMatchObject({
      api_id: 1,
      api_state: 0,
      api_created_ship_id: 0,
      api_item5: 0
    });
  });

  it("settles natural material recovery consistently through port and material endpoints", async () => {
    const baseline = Date.now();
    store.db.prepare("UPDATE materials SET fuel = 100, ammo = 200, steel = 300, bauxite = 400 WHERE player_id = 1").run();
    vi.spyOn(Date, "now").mockReturnValue(baseline + 6 * 60_000 + 30_000);

    const port = (await post("api_port/port")).json().api_data;
    const material = (await post("api_get_member/material")).json().api_data;

    expect(port.api_material.slice(0, 4)).toEqual([
      { api_member_id: 1, api_id: 1, api_value: 106 },
      { api_member_id: 1, api_id: 2, api_value: 206 },
      { api_member_id: 1, api_id: 3, api_value: 306 },
      { api_member_id: 1, api_id: 4, api_value: 402 }
    ]);
    expect(material.slice(0, 4)).toEqual(port.api_material.slice(0, 4));
  });

  it("keeps material action responses within the one million resource cap", async () => {
    const baseline = Date.now();
    store.db.prepare("UPDATE materials SET fuel = 999999, ammo = 999999, steel = 999999, bauxite = 999999 WHERE player_id = 1").run();
    vi.spyOn(Date, "now").mockReturnValue(baseline + 180_000);

    const charge = (await post("api_req_hokyu/charge", { api_id_items: "1", api_kind: 3 })).json().api_data;

    expect(charge.api_material.slice(0, 4)).toEqual([1_000_000, 1_000_000, 1_000_000, 1_000_000]);
    expect(store.getSave().materials).toMatchObject({
      fuel: 1_000_000,
      ammo: 1_000_000,
      steel: 1_000_000,
      bauxite: 1_000_000
    });
  });

  it("honors every charge kind and aircraft supply flag", async () => {
    const akagi = store.createShip(277);
    const fighter = store.createSlotItem(20);
    const bomber = store.createSlotItem(23);
    store.equipSlotItem(akagi.id, 0, fighter.id);
    store.equipSlotItem(akagi.id, 2, bomber.id);

    const depletedFuel = akagi.maxFuel - 3;
    const depletedAmmo = akagi.maxAmmo - 4;
    const depletedOnSlot = [18, 0, 30, 0, 0];
    const cases = [0, 1, 2, 3].flatMap((kind) => [0, 1].map((onSlot) => ({ kind, onSlot })));

    for (const { kind, onSlot } of cases) {
      store.db.prepare("UPDATE ships SET fuel = ?, ammo = ?, onslot_json = ? WHERE id = ?")
        .run(depletedFuel, depletedAmmo, JSON.stringify(depletedOnSlot), akagi.id);
      store.db.prepare("UPDATE materials SET fuel = 1000, ammo = 1000, bauxite = 1000 WHERE player_id = 1").run();

      const charge = await post("api_req_hokyu/charge", {
        api_id_items: String(akagi.id),
        api_kind: kind,
        api_onslot: onSlot
      });
      const data = charge.json().api_data;
      const chargedShip = data.api_ship.find((ship: any) => ship.api_id === akagi.id);
      const save = store.getSave();
      const persistedShip = save.ships.find((ship) => ship.id === akagi.id)!;
      const suppliesFuel = kind === 1 || kind === 3;
      const suppliesAmmo = kind === 2 || kind === 3;

      expect(chargedShip.api_fuel, `kind=${kind} onslot=${onSlot} fuel`).toBe(suppliesFuel ? akagi.maxFuel : depletedFuel);
      expect(chargedShip.api_bull, `kind=${kind} onslot=${onSlot} ammo`).toBe(suppliesAmmo ? akagi.maxAmmo : depletedAmmo);
      expect(chargedShip.api_onslot, `kind=${kind} onslot=${onSlot} planes`)
        .toEqual(onSlot === 1 ? [20, 0, 32, 0, 0] : depletedOnSlot);
      expect(persistedShip.fuel).toBe(chargedShip.api_fuel);
      expect(persistedShip.ammo).toBe(chargedShip.api_bull);
      expect(persistedShip.onSlot).toEqual(chargedShip.api_onslot);
      expect(save.materials.fuel).toBe(1000 - (suppliesFuel ? 3 : 0));
      expect(save.materials.ammo).toBe(1000 - (suppliesAmmo ? 4 : 0));
      expect(save.materials.bauxite).toBe(1000 - (onSlot === 1 ? 20 : 0));
      expect(data.api_use_bou).toBe(onSlot === 1 ? 1 : 0);
      expect(data.api_material).toEqual([
        save.materials.fuel,
        save.materials.ammo,
        save.materials.steel,
        save.materials.bauxite,
        save.materials.buildKit,
        save.materials.repairKit,
        save.materials.devmat,
        save.materials.screw
      ]);
    }
  });

  it("exposes repair cost and time on damaged ships", async () => {
    store.db.prepare("UPDATE ships SET hp = ? WHERE id = ?").run(10, 1);

    const ships = (await post("api_get_member/ship2")).json().api_data;
    const fubuki = ships.find((ship: any) => ship.api_id === 1);

    expect(fubuki.api_ndock_item).toEqual([2, 4]);
    expect(fubuki.api_ndock_time).toBe(80_000);
  });

  it("charges fuel and steel when starting repairs and only buckets on speedchange", async () => {
    store.db.prepare("UPDATE ships SET hp = ? WHERE id = ?").run(10, 1);
    const before = store.getSave();

    const start = await post("api_req_nyukyo/start", { api_ship_id: 1, api_ndock_id: 1, api_highspeed: 0 });

    expect(start.json()).toMatchObject({ api_result: 1, api_data: { api_ndock_id: 1 } });
    const afterStart = store.getSave();
    expect(afterStart.materials.fuel).toBe(before.materials.fuel - 2);
    expect(afterStart.materials.steel).toBe(before.materials.steel - 4);
    expect(afterStart.materials.repairKit).toBe(before.materials.repairKit);
    expect(afterStart.ships.find((ship) => ship.id === 1)?.hp).toBe(10);
    expect(afterStart.repairDocks[0]).toMatchObject({ id: 1, shipId: 1, state: 1 });

    const ndock = (await post("api_get_member/ndock")).json().api_data;
    expect(ndock[0]).toMatchObject({ api_id: 1, api_state: 1, api_ship_id: 1, api_item1: 2, api_item2: 4 });

    const speedchange = await post("api_req_nyukyo/speedchange", { api_ndock_id: 1 });

    expect(speedchange.json()).toMatchObject({ api_result: 1 });
    const afterSpeedchange = store.getSave();
    expect(afterSpeedchange.materials.fuel).toBe(afterStart.materials.fuel);
    expect(afterSpeedchange.materials.steel).toBe(afterStart.materials.steel);
    expect(afterSpeedchange.materials.repairKit).toBe(afterStart.materials.repairKit - 1);
    expect(afterSpeedchange.ships.find((ship) => ship.id === 1)?.hp).toBe(15);
    expect(afterSpeedchange.repairDocks[0]).toMatchObject({ id: 1, shipId: 0, state: 0 });
  });

  it("settles expired repairs when the client refreshes ndock", async () => {
    store.db.prepare("UPDATE ships SET hp = 10, condition = 20 WHERE id = 1").run();
    const beforeKit = store.getSave().materials.repairKit;
    await post("api_req_nyukyo/start", { api_ship_id: 1, api_ndock_id: 1, api_highspeed: 0 });
    store.db.prepare("UPDATE repair_docks SET complete_time = ? WHERE id = 1").run(Date.now() - 1);

    const ndock = (await post("api_get_member/ndock")).json().api_data;
    const save = store.getSave();

    expect(ndock[0]).toMatchObject({
      api_id: 1,
      api_state: 0,
      api_ship_id: 0,
      api_complete_time: 0
    });
    expect(save.ships.find((ship) => ship.id === 1)).toMatchObject({ hp: 15, condition: 40 });
    expect(save.repairDocks[0]).toMatchObject({ shipId: 0, completeTime: 0, state: 0 });
    expect(save.materials.repairKit).toBe(beforeKit);
  });

  it("settles expired repairs before returning the port aggregate", async () => {
    store.db.prepare("UPDATE ships SET hp = 10, condition = 35 WHERE id = 1").run();
    await post("api_req_nyukyo/start", { api_ship_id: 1, api_ndock_id: 2, api_highspeed: 0 });
    store.db.prepare("UPDATE repair_docks SET complete_time = ? WHERE id = 2").run(Date.now() - 1);

    const port = (await post("api_port/port")).json().api_data;
    const ship = port.api_ship.find((item: any) => item.api_id === 1);

    expect(port.api_ndock[1]).toMatchObject({
      api_id: 2,
      api_state: 0,
      api_ship_id: 0,
      api_complete_time: 0
    });
    expect(ship).toMatchObject({ api_nowhp: 15, api_cond: 40, api_ndock_time: 0, api_ndock_item: [0, 0] });
  });

  it("uses the requested repair dock and rejects occupied or unknown docks without side effects", async () => {
    store.db.prepare("UPDATE ships SET hp = 10 WHERE id IN (1, 2)").run();

    const started = await post("api_req_nyukyo/start", { api_ship_id: 1, api_ndock_id: 2, api_highspeed: 0 });

    expect(started.json()).toMatchObject({ api_result: 1, api_data: { api_ndock_id: 2 } });
    const afterStart = store.getSave();
    expect(afterStart.repairDocks[0]).toMatchObject({ id: 1, shipId: 0, state: 0 });
    expect(afterStart.repairDocks[1]).toMatchObject({ id: 2, shipId: 1, state: 1 });

    const occupied = await post("api_req_nyukyo/start", { api_ship_id: 2, api_ndock_id: 2, api_highspeed: 0 });
    const unknown = await post("api_req_nyukyo/start", { api_ship_id: 2, api_ndock_id: 99, api_highspeed: 0 });
    const afterFailures = store.getSave();

    expect(occupied.json()).toMatchObject({ api_result: 400, api_result_msg: "Repair dock is not empty" });
    expect(unknown.json()).toMatchObject({ api_result: 400, api_result_msg: "Unknown repair dock" });
    expect(afterFailures.materials).toEqual(afterStart.materials);
    expect(afterFailures.repairDocks).toEqual(afterStart.repairDocks);
    expect(afterFailures.ships.find((ship) => ship.id === 2)?.hp).toBe(10);
  });

  it("immediately completes repairs at the client minimum-time threshold without a bucket", async () => {
    store.db.prepare("UPDATE ships SET hp = 12, condition = 10 WHERE id = 1").run();
    const before = store.getSave();

    const start = await post("api_req_nyukyo/start", { api_ship_id: 1, api_ndock_id: 2, api_highspeed: 0 });
    const after = store.getSave();

    expect(start.json()).toMatchObject({ api_result: 1, api_data: { api_ndock_id: 2 } });
    expect(after.materials.fuel).toBe(before.materials.fuel - 1);
    expect(after.materials.steel).toBe(before.materials.steel - 2);
    expect(after.materials.repairKit).toBe(before.materials.repairKit);
    expect(after.ships.find((ship) => ship.id === 1)).toMatchObject({ hp: 15, condition: 40 });
    expect(after.repairDocks[1]).toMatchObject({ id: 2, shipId: 0, completeTime: 0, state: 0 });
  });

  it("charges fuel, steel, and a bucket when starting high-speed repairs", async () => {
    store.db.prepare("UPDATE ships SET hp = 10, condition = 15 WHERE id = 2").run();
    const before = store.getSave();

    const start = await post("api_req_nyukyo/start", { api_ship_id: 2, api_ndock_id: 2, api_highspeed: 1 });

    expect(start.json()).toMatchObject({ api_result: 1, api_data: { api_ndock_id: 2 } });
    const afterStart = store.getSave();
    expect(afterStart.materials.fuel).toBe(before.materials.fuel - 2);
    expect(afterStart.materials.steel).toBe(before.materials.steel - 4);
    expect(afterStart.materials.repairKit).toBe(before.materials.repairKit - 1);
    expect(afterStart.ships.find((ship) => ship.id === 2)).toMatchObject({ hp: 15, condition: 40 });
    expect(afterStart.repairDocks.every((dock) => dock.state === 0 && dock.shipId === 0)).toBe(true);
  });

  it("rejects speedchange for an unknown dock without completing another repair", async () => {
    store.db.prepare("UPDATE ships SET hp = 10 WHERE id = 1").run();
    await post("api_req_nyukyo/start", { api_ship_id: 1, api_ndock_id: 1, api_highspeed: 0 });
    const before = store.getSave();

    const speedchange = await post("api_req_nyukyo/speedchange", { api_ndock_id: 99 });
    const after = store.getSave();

    expect(speedchange.json()).toMatchObject({ api_result: 400, api_result_msg: "Unknown repair dock" });
    expect(after.materials.repairKit).toBe(before.materials.repairKit);
    expect(after.ships.find((ship) => ship.id === 1)?.hp).toBe(10);
    expect(after.repairDocks[0]).toEqual(before.repairDocks[0]);
  });

  it("persists profile, fleet, lock, supply, equipment, quest, and furniture mutations", async () => {
    await post("api_req_member/updatecomment", { api_cmt: "offline sortie ready" });
    const deckName = await post("api_req_member/updatedeckname", {
      api_id: 1,
      api_name: "First Local Fleet",
      api_name_id: "local-inspection-2-test"
    });
    await post("api_req_hensei/lock", { api_ship_id: 1 });
    await post("api_req_hokyu/charge", { api_id_items: "1", api_kind: 3 });
    await post("api_req_kaisou/slotset", { api_id: 1, api_slot_idx: 0, api_item_id: 1 });
    await post("api_req_quest/start", { api_quest_id: 101 });
    await post("api_req_furniture/change", {
      api_floor: 1,
      api_wallpaper: 38,
      api_window: 72,
      api_wallhanging: 102,
      api_shelf: 133,
      api_desk: 164
    });

    const port = (await post("api_port/port")).json().api_data;
    const quests = (await post("api_get_member/questlist")).json().api_data;
    const furniture = (await post("api_get_member/furniture")).json().api_data;

    expect(port.api_basic.api_comment).toBe("offline sortie ready");
    expect(deckName.json()).toMatchObject({ api_result: 1, api_data: { api_name: "First Local Fleet" } });
    expect(port.api_deck_port[0].api_name).toBe("First Local Fleet");
    expect(port.api_ship.find((ship: any) => ship.api_id === 1).api_locked).toBe(1);
    expect(port.api_ship.find((ship: any) => ship.api_id === 1).api_fuel).toBeGreaterThan(0);
    expect(port.api_ship.find((ship: any) => ship.api_id === 1).api_slot[0]).toBe(1);
    expect(quests.api_list.find((quest: any) => quest.api_no === 101).api_state).toBe(3);
    expect(port.api_basic.api_furniture).toEqual([1, 38, 72, 102, 133, 164]);
    expect(furniture).toEqual(expect.arrayContaining([expect.objectContaining({ api_id: 1 }), expect.objectContaining({ api_id: 164 })]));
  });

  it("renames the fleet selected by the client deck id field", async () => {
    const deckName = await post("api_req_member/updatedeckname", {
      api_deck_id: 2,
      api_name: "Second Local Fleet",
      api_name_id: "second-local-fleet"
    });

    const decks = (await post("api_get_member/deck")).json().api_data;

    expect(deckName.json()).toMatchObject({
      api_result: 1,
      api_data: { api_id: 2, api_name: "Second Local Fleet" }
    });
    expect(decks.map((deck: any) => [deck.api_id, deck.api_name])).toEqual([
      [1, "First Fleet"],
      [2, "Second Local Fleet"],
      [3, "Fleet 3"],
      [4, "Fleet 4"]
    ]);
  });

  it("implements the client furniture inventory, purchase, layout, and jukebox protocol", async () => {
    const initialPort = (await post("api_port/port")).json().api_data;
    expect(initialPort.api_basic.api_furniture).toEqual([1, 38, 72, 102, 133, 164]);

    const initialFurniture = (await post("api_get_member/furniture")).json().api_data;
    expect(Array.isArray(initialFurniture)).toBe(true);
    expect(initialFurniture.map((item: any) => item.api_id)).toEqual(expect.arrayContaining([1, 38, 72, 102, 133, 164]));

    const buy = await post("api_req_furniture/buy", { api_type: 0, api_no: 1 });
    expect(buy.json()).toMatchObject({ api_result: 1, api_data: { api_fcoin: 150 } });

    const invalidChange = await post("api_req_furniture/change", {
      api_floor: 38,
      api_wallpaper: 38,
      api_window: 72,
      api_wallhanging: 102,
      api_shelf: 133,
      api_desk: 164
    });
    expect(invalidChange.json()).toMatchObject({ api_result: 400 });
    expect(store.getSave().furniture.set.api_floor).toBe(1);

    const change = await post("api_req_furniture/change", {
      api_floor: 2,
      api_wallpaper: 38,
      api_window: 72,
      api_wallhanging: 102,
      api_shelf: 133,
      api_desk: 164,
      api_bgm_id: 101
    });
    expect(change.json()).toMatchObject({ api_result: 1 });

    const changedPort = (await post("api_port/port")).json().api_data;
    expect(changedPort.api_basic.api_furniture).toEqual([2, 38, 72, 102, 133, 164]);
    expect(changedPort.api_basic.api_fcoin).toBe(150);
    expect(changedPort.api_p_bgm_id).toBe(101);

    const musicList = (await post("api_req_furniture/music_list")).json().api_data;
    expect(Array.isArray(musicList)).toBe(true);
    expect(musicList).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          api_id: 101,
          api_name: "母港",
          api_bgm_id: 101,
          api_use_coin: 0,
          api_bgm_flag: 1,
          api_loops: expect.any(Number)
        })
      ])
    );

    expect((await post("api_req_furniture/music_play", { api_music_id: 101 })).json()).toMatchObject({
      api_result: 1,
      api_data: { api_coin: 150 }
    });
    expect((await post("api_req_furniture/set_portbgm", { api_music_id: 101 })).json()).toMatchObject({
      api_result: 1,
      api_data: { api_p_bgm_id: 101 }
    });
  });

  it("returns ship capacities, speed, and star rating with their protocol meanings", async () => {
    const port = (await post("api_port/port")).json().api_data;
    const ship2 = (await post("api_get_member/ship2")).json().api_data;
    const ship3 = (await post("api_get_member/ship3")).json().api_data.api_ship_data;
    const start2 = (await post("api_start2/getData")).json().api_data;
    const shipMasterById = new Map(start2.api_mst_ship.map((ship: any) => [ship.api_id, ship]));

    for (const ships of [port.api_ship, ship2, ship3]) {
      for (const ship of ships) {
        const master: any = shipMasterById.get(ship.api_ship_id);
        expect(ship).toHaveProperty("api_fuel_max");
        expect(ship).toHaveProperty("api_bull_max");
        expect(ship.api_fuel_max).toBe(master.api_fuel_max);
        expect(ship.api_bull_max).toBe(master.api_bull_max);
        expect(ship.api_soku).toBe(master.api_soku);
        expect(ship.api_srate).toBe(0);
      }
    }
  });

  it("serializes Yamato engine improvements as effective ship speed", async () => {
    const yamato = store.createShip(131);
    const turbine = store.createSlotItem(33);
    const enhancedBoiler1 = store.createSlotItem(34);
    const enhancedBoiler2 = store.createSlotItem(34);
    const newModelBoiler = store.createSlotItem(87);
    const speedFromShip2 = async () => {
      const ships = (await post("api_get_member/ship2")).json().api_data;
      return ships.find((ship: any) => ship.api_id === yamato.id).api_soku;
    };

    expect(await speedFromShip2()).toBe(5);

    store.equipExSlotItem(yamato.id, turbine.id);
    store.equipSlotItem(yamato.id, 0, enhancedBoiler1.id);
    expect(await speedFromShip2()).toBe(10);

    store.equipSlotItem(yamato.id, 1, newModelBoiler.id);
    expect(await speedFromShip2()).toBe(15);

    store.equipSlotItem(yamato.id, 2, enhancedBoiler2.id);
    const port = (await post("api_port/port")).json().api_data.api_ship;
    const ship2 = (await post("api_get_member/ship2")).json().api_data;
    const ship3 = (await post("api_get_member/ship3")).json().api_data.api_ship_data;

    for (const ships of [port, ship2, ship3]) {
      expect(ships.find((ship: any) => ship.api_id === yamato.id).api_soku).toBe(20);
    }
  });

  it("returns the updated ship and deck list after modernization", async () => {
    const yamato = store.createShip(131);
    const consumed = store.createShip(9);

    const response = await post("api_req_kaisou/powerup", {
      api_id: yamato.id,
      api_id_items: consumed.id,
      api_slot_dest_flag: 0,
      api_limited_feed_type: 0
    });

    expect(response.json()).toMatchObject({
      api_result: 1,
      api_data: {
        api_powerup_flag: 1,
        api_ship: {
          api_id: yamato.id,
          api_ship_id: 131
        },
        api_deck: expect.arrayContaining([
          expect.objectContaining({
            api_id: 1,
            api_ship: expect.any(Array)
          })
        ])
      }
    });
  });

  it("applies modernization stat bonuses and consumes the selected ships", async () => {
    const target = store.createShip(9);
    const consumedFubuki = store.createShip(9);
    const consumedAyanami = store.createShip(13);

    const response = await post("api_req_kaisou/powerup", {
      api_id: target.id,
      api_id_items: `${consumedFubuki.id},${consumedAyanami.id}`,
      api_slot_dest_flag: 0,
      api_limited_feed_type: 0
    });

    const payload = response.json();
    expect(payload).toMatchObject({
      api_result: 1,
      api_data: {
        api_powerup_flag: 1,
        api_ship: {
          api_id: target.id,
          api_ship_id: 9
        }
      }
    });
    expect(payload.api_data.api_ship.api_kyouka).toEqual([2, 2, 0, 0, 0, 0, 0]);
    expect(payload.api_data.api_ship.api_karyoku).toEqual([12, 29]);
    expect(payload.api_data.api_ship.api_raisou).toEqual([29, 79]);
    expect(store.getSave().ships.map((ship) => ship.id)).not.toEqual(
      expect.arrayContaining([consumedFubuki.id, consumedAyanami.id])
    );
  });

  it("destroys consumed ships' equipment only when modernization requests slot disposal", async () => {
    const yamato = store.createShip(131);
    const keepFodder = store.createShip(9);
    const keepGun = store.createSlotItem(2);
    store.equipSlotItem(keepFodder.id, 0, keepGun.id);

    const keepResponse = await post("api_req_kaisou/powerup", {
      api_id: yamato.id,
      api_id_items: keepFodder.id,
      api_slot_dest_flag: 0,
      api_limited_feed_type: 0
    });

    expect(keepResponse.json().api_data.api_unset_list).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          api_type3: 1,
          api_slot_list: expect.arrayContaining([keepGun.id])
        })
      ])
    );
    expect(store.getSave().slotItems.find((item) => item.id === keepGun.id)).toBeTruthy();

    const disposeFodder = store.createShip(10);
    const disposeGun = store.createSlotItem(2);
    store.equipSlotItem(disposeFodder.id, 0, disposeGun.id);

    await post("api_req_kaisou/powerup", {
      api_id: yamato.id,
      api_id_items: disposeFodder.id,
      api_slot_dest_flag: 1,
      api_limited_feed_type: 0
    });

    expect(store.getSave().slotItems.find((item) => item.id === disposeGun.id)).toBeUndefined();
  });

  it("remodels from the current ship master, keeps level, resets normal modernization, and equips the new form", async () => {
    const oldGun = store.createSlotItem(2);
    store.equipSlotItem(1, 0, oldGun.id);
    store.db.prepare("UPDATE ships SET level = 20, exp = 19000, hp = 3, fuel = 1, ammo = 2, stats_json = ? WHERE id = 1")
      .run(JSON.stringify({ api_kyouka: [5, 5, 5, 5, 2, 1, 1] }));
    const before = store.getSave();

    const response = await post("api_req_kaisou/remodeling", { api_id: 1 });

    const payload = response.json();
    expect(payload).toMatchObject({
      api_result: 1,
      api_data: {
        api_after_ship: {
          api_id: 1,
          api_ship_id: 201,
          api_lv: 20,
          api_nowhp: 31,
          api_maxhp: 31,
          api_fuel: 15,
          api_bull: 20,
          api_kyouka: [0, 0, 0, 0, 2, 1, 1]
        }
      }
    });

    const after = store.getSave();
    expect(after.materials.ammo).toBe(before.materials.ammo - 100);
    expect(after.materials.steel).toBe(before.materials.steel - 100);
    expect(after.ships.find((ship) => ship.id === 1)?.exp).toBe(19000);
    expect(after.ships.find((ship) => ship.id === 1)?.slotIds.slice(0, 3)).toEqual(
      expect.arrayContaining([expect.any(Number), expect.any(Number), -1])
    );
    const remodeled = after.ships.find((ship) => ship.id === 1)!;
    const equippedMasters = remodeled.slotIds
      .filter((id) => id > 0)
      .map((id) => after.slotItems.find((item) => item.id === id)?.masterId);
    expect(equippedMasters).toEqual([297, 13]);
    expect(remodeled.slotIds).not.toContain(oldGun.id);
    expect(after.slotItems.find((item) => item.id === oldGun.id)).toBeTruthy();
  });

  it("rejects remodeling requests that specify an unrelated target master", async () => {
    store.db.prepare("UPDATE ships SET level = 20 WHERE id = 1").run();

    const response = await post("api_req_kaisou/remodeling", {
      api_id: 1,
      api_aftershipid: 54
    });

    expect(response.json()).toMatchObject({
      api_result: 1,
      api_data: { api_after_ship: null }
    });
    expect(store.getSave().ships.find((ship) => ship.id === 1)?.masterId).toBe(9);
  });

  it("requires and consumes special ship-upgrade items for remodels", async () => {
    const bismarckKai = store.createShip(172);
    store.db.prepare("UPDATE ships SET level = 50 WHERE id = ?").run(bismarckKai.id);
    store.db.prepare("UPDATE materials SET ammo = 10000, steel = 10000 WHERE player_id = 1").run();

    const blocked = await post("api_req_kaisou/remodeling", { api_id: bismarckKai.id });

    expect(blocked.json()).toMatchObject({
      api_result: 1,
      api_data: { api_after_ship: null }
    });
    expect(store.getSave().ships.find((ship) => ship.id === bismarckKai.id)?.masterId).toBe(172);

    store.db.prepare("INSERT INTO use_items (id, count) VALUES (58, 1)").run();

    const remodeled = await post("api_req_kaisou/remodeling", { api_id: bismarckKai.id });

    expect(remodeled.json()).toMatchObject({
      api_result: 1,
      api_data: {
        api_after_ship: {
          api_id: bismarckKai.id,
          api_ship_id: 173
        }
      }
    });
    expect(store.getSave().useItems.find((item) => item.id === 58)?.count).toBe(0);
  });

  it("preserves HP values at the client damage-state thresholds", async () => {
    for (const hp of [75, 50, 25]) {
      store.db.prepare("UPDATE ships SET hp = ?, max_hp = 100 WHERE id = 1").run(hp);

      const port = (await post("api_port/port")).json().api_data;
      const ship = port.api_ship.find((item: any) => item.api_id === 1);

      expect(ship.api_nowhp).toBe(hp);
      expect(ship.api_maxhp).toBe(100);
    }
  });

  it("rejects equipment that the target ship cannot equip", async () => {
    const fighter = store.createSlotItem(19);
    const response = await post("api_req_kaisou/slotset", { api_id: 1, api_slot_idx: 0, api_item_id: fighter.id });
    const port = (await post("api_port/port")).json().api_data;
    const ship = port.api_ship.find((item: any) => item.api_id === 1);

    expect(response.json()).toMatchObject({ api_result: 400 });
    expect(ship.api_slot[0]).toBe(-1);
  });

  it("equips the turbine in an extra slot for ships that can equip it normally", async () => {
    const turbine = store.createSlotItem(33);
    const response = await post("api_req_kaisou/slotset_ex", { api_id: 1, api_item_id: turbine.id });
    const ship2 = (await post("api_get_member/ship2")).json().api_data;
    const persistedShip = ship2.find((ship: any) => ship.api_id === 1);

    expect(response.json()).toMatchObject({
      api_result: 1,
      api_data: { api_id: 1, api_slot_ex: turbine.id }
    });
    expect(persistedShip.api_slot_ex).toBe(turbine.id);
  });

  it("does not let the turbine wildcard bypass normal equip eligibility", async () => {
    const coastalDefenseShip = store.createShip(376);
    const turbine = store.createSlotItem(33);
    const response = await post("api_req_kaisou/slotset_ex", { api_id: coastalDefenseShip.id, api_item_id: turbine.id });

    expect(response.json()).toMatchObject({ api_result: 400 });
    expect(store.getSave().ships.find((ship) => ship.id === coastalDefenseShip.id)?.exSlotId).toBe(-1);
  });

  it("keeps extra-slot boilers restricted to the listed ship remodels", async () => {
    const shimakazeKai = store.createShip(229);

    for (const boilerMasterId of [34, 87]) {
      const allowedBoiler = store.createSlotItem(boilerMasterId);
      const deniedBoiler = store.createSlotItem(boilerMasterId);
      const allowed = await post("api_req_kaisou/slotset_ex", { api_id: shimakazeKai.id, api_item_id: allowedBoiler.id });
      const denied = await post("api_req_kaisou/slotset_ex", { api_id: 1, api_item_id: deniedBoiler.id });

      expect(allowed.json()).toMatchObject({
        api_result: 1,
        api_data: { api_id: shimakazeKai.id, api_slot_ex: allowedBoiler.id }
      });
      expect(denied.json()).toMatchObject({ api_result: 400 });
    }
  });

  it("uses equipment improvement level for extra-slot requirements", async () => {
    const bismarck = store.createShip(171);
    const radar = store.createSlotItem(124);

    store.db.prepare("UPDATE ships SET level = 99 WHERE id = ?").run(bismarck.id);
    const underImproved = await post("api_req_kaisou/slotset_ex", { api_id: bismarck.id, api_item_id: radar.id });

    expect(underImproved.json()).toMatchObject({ api_result: 400 });

    store.db.prepare("UPDATE ships SET level = 1 WHERE id = ?").run(bismarck.id);
    store.db.prepare("UPDATE slot_items SET level = 7 WHERE id = ?").run(radar.id);
    const improved = await post("api_req_kaisou/slotset_ex", { api_id: bismarck.id, api_item_id: radar.id });

    expect(improved.json()).toMatchObject({
      api_result: 1,
      api_data: { api_id: bismarck.id, api_slot_ex: radar.id }
    });
  });

  it("returns aircraft onslot counts from each equipped carrier slot capacity", async () => {
    const akagi = store.createShip(277);
    const fighter1 = store.createSlotItem(20);
    const fighter2 = store.createSlotItem(20);

    await post("api_req_kaisou/slotset", { api_id: akagi.id, api_slot_idx: 0, api_item_id: fighter1.id });
    const response = await post("api_req_kaisou/slotset", { api_id: akagi.id, api_slot_idx: 2, api_item_id: fighter2.id });
    const updatedShip = response.json().api_data;

    expect(updatedShip.api_ship_id).toBe(277);
    expect(updatedShip.api_slot).toEqual([fighter1.id, -1, fighter2.id, -1, -1]);
    expect(updatedShip.api_onslot).toEqual([20, 0, 32, 0, 0]);

    const ship2 = (await post("api_get_member/ship2")).json().api_data;
    const persistedAkagi = ship2.find((ship: any) => ship.api_id === akagi.id);

    expect(persistedAkagi.api_onslot).toEqual([20, 0, 32, 0, 0]);
  });

  it("compacts ordinary slots when unequipping a front slot through slotset", async () => {
    const akagi = store.createShip(277);
    const fighters = [20, 20, 20, 20].map((masterId) => store.createSlotItem(masterId));

    for (const [index, fighter] of fighters.entries()) {
      await post("api_req_kaisou/slotset", { api_id: akagi.id, api_slot_idx: index, api_item_id: fighter.id });
    }

    const response = await post("api_req_kaisou/slotset", { api_id: akagi.id, api_slot_idx: 0, api_item_id: -1 });
    const updatedShip = response.json().api_data;

    expect(updatedShip.api_slot).toEqual([fighters[1].id, fighters[2].id, fighters[3].id, -1, -1]);
  });

  it("computes ship stats from master base + equipment bonuses, not hardcoded placeholders", async () => {
    const start2 = (await post("api_start2/getData")).json().api_data;
    const shipMasterById = new Map<number, any>(start2.api_mst_ship.map((ship: any) => [ship.api_id, ship]));
    const slotMasterById = new Map<number, any>(start2.api_mst_slotitem.map((slot: any) => [slot.api_id, slot]));

    // Ship 1 is a fresh Fubuki (masterId 9) with no equipment
    const ship2 = (await post("api_get_member/ship2")).json().api_data;
    const fubuki = ship2.find((ship: any) => ship.api_id === 1);
    const fubukiMaster = shipMasterById.get(fubuki.api_ship_id);

    // Verify base stats are computed from ship master, not hardcoded [5, 40]
    expect(fubuki.api_karyoku).toEqual([fubukiMaster.api_houg[0], fubukiMaster.api_houg[1]]);
    expect(fubuki.api_raisou).toEqual([fubukiMaster.api_raig[0], fubukiMaster.api_raig[1]]);
    expect(fubuki.api_soukou).toEqual([fubukiMaster.api_souk[0], fubukiMaster.api_souk[1]]);

    // Equip item 1 (12cm Single Gun Mount: api_houg=1, api_tyku=1, api_raig=0)
    await post("api_req_kaisou/slotset", { api_id: 1, api_slot_idx: 0, api_item_id: 1 });
    const equipped = (await post("api_get_member/ship2")).json().api_data;
    const fubukiEquipped = equipped.find((ship: any) => ship.api_id === 1);

    // Stats should increase by equipment bonuses
    expect(fubukiEquipped.api_karyoku[0]).toBe(fubukiMaster.api_houg[0] + 1); // +1 firepower
    expect(fubukiEquipped.api_karyoku[1]).toBe(fubukiMaster.api_houg[1] + 1); // max also includes equip
    expect(fubukiEquipped.api_taiku[0]).toBe(fubukiMaster.api_tyku[0] + 1);    // +1 AA
    expect(fubukiEquipped.api_raisou[0]).toBe(fubukiMaster.api_raig[0] + 0);   // +0 torpedo

    // Unequip and verify stats return to base
    await post("api_req_kaisou/slotset", { api_id: 1, api_slot_idx: 0, api_item_id: -1 });
    const unequipped = (await post("api_get_member/ship2")).json().api_data;
    const fubukiUnequipped = unequipped.find((ship: any) => ship.api_id === 1);

    expect(fubukiUnequipped.api_karyoku).toEqual([fubukiMaster.api_houg[0], fubukiMaster.api_houg[1]]);
    expect(fubukiUnequipped.api_slot[0]).toBe(-1);
  });

  it("matches organize scene get_member payload shapes expected by the client", async () => {
    const presetDeck = (await post("api_get_member/preset_deck")).json().api_data;
    const unsetSlot = (await post("api_get_member/unsetslot")).json().api_data;
    const ship3 = (await post("api_get_member/ship3", { api_shipid: 1, api_sort_key: 1, api_sort_order: 1 })).json().api_data;
    const singleDeck = (await post("api_get_member/ship_deck", { api_deck_rid: "1" })).json().api_data;
    const multipleDecks = (await post("api_get_member/ship_deck", { api_deck_rid: "1,2" })).json().api_data;
    const defaultDecks = (await post("api_get_member/ship_deck")).json().api_data;
    const invalidDecks = (await post("api_get_member/ship_deck", { api_deck_rid: "999,abc" })).json().api_data;

    expect(presetDeck).toMatchObject({ api_max_num: 0 });
    expect(presetDeck.api_deck).toEqual({});
    expect(Array.isArray(presetDeck.api_deck)).toBe(false);

    expect(Object.keys(unsetSlot).sort()).toEqual(["api_slottype1", "api_slottype14"]);
    expect(unsetSlot.api_slottype1).toEqual([1, 2, 3]);
    expect(unsetSlot.api_slottype14).toEqual([4]);
    expect(ship3.api_slot_data).toEqual(unsetSlot);

    expect(singleDeck.api_deck_data.map((deck: any) => deck.api_id)).toEqual([1]);
    expect(singleDeck.api_ship_data.map((ship: any) => ship.api_id).sort()).toEqual([1, 2, 3, 4]);
    expect(multipleDecks.api_deck_data.map((deck: any) => deck.api_id)).toEqual([1, 2]);
    expect(multipleDecks.api_ship_data.map((ship: any) => ship.api_id).sort()).toEqual([1, 2, 3, 4]);
    expect(defaultDecks.api_deck_data.map((deck: any) => deck.api_id)).toEqual([1, 2, 3, 4]);
    expect(defaultDecks.api_ship_data.map((ship: any) => ship.api_id).sort()).toEqual([1, 2, 3, 4]);
    expect(invalidDecks).toEqual({ api_deck_data: [], api_ship_data: [] });
  });

  it("provides equippable ship type metadata for the remodel equipment list", async () => {
    const start2 = (await post("api_start2/getData")).json().api_data;
    const requireInfo = (await post("api_get_member/require_info")).json().api_data;
    const ships = (await post("api_get_member/ship2")).json().api_data;

    const shipMasterById = new Map(start2.api_mst_ship.map((ship: any) => [ship.api_id, ship]));
    const shipTypeById = new Map(start2.api_mst_stype.map((shipType: any) => [shipType.api_id, shipType]));
    const slotMasterById = new Map(start2.api_mst_slotitem.map((slot: any) => [slot.api_id, slot]));
    const slotItemById = new Map(requireInfo.api_slot_item.map((slot: any) => [slot.api_id, slot]));
    const targetShip = ships.find((ship: any) => ship.api_id === 1);
    const targetShipMaster: any = shipMasterById.get(targetShip.api_ship_id);
    const targetShipType: any = shipTypeById.get(targetShipMaster.api_stype);
    const equipType = targetShipType.api_equip_type ?? {};
    const unsetSlotIds = Object.values(requireInfo.api_unsetslot)
      .filter(Array.isArray)
      .flat() as number[];

    const equippableUnsetSlotIds = unsetSlotIds.filter((slotItemId) => {
      const slotItem: any = slotItemById.get(slotItemId);
      const slotMaster: any = slotMasterById.get(slotItem.api_slotitem_id);
      return equipType[slotMaster.api_type[2]] === 1;
    });

    expect(unsetSlotIds.length).toBeGreaterThan(0);
    expect(equippableUnsetSlotIds.length).toBeGreaterThan(0);
  });

  it("keeps deck membership unique and fixed-width when changing organize slots", async () => {
    const extraShip = store.createShip(7);

    await post("api_req_hensei/change", { api_id: 2, api_ship_idx: 0, api_ship_id: 1 });
    await post("api_req_hensei/change", { api_id: 2, api_ship_idx: 1, api_ship_id: extraShip.id });
    await post("api_req_hensei/change", { api_id: 2, api_ship_idx: 1, api_ship_id: -1 });

    const decks = (await post("api_get_member/deck")).json().api_data;
    const firstDeck = decks.find((deck: any) => deck.api_id === 1);
    const secondDeck = decks.find((deck: any) => deck.api_id === 2);
    const allAssignedShips = decks.flatMap((deck: any) => deck.api_ship).filter((id: number) => id > 0);

    expect(firstDeck.api_ship).toHaveLength(6);
    expect(firstDeck.api_ship).toEqual([2, -1, -1, -1, -1, -1]);
    expect(firstDeck.api_flagship).toBe(2);
    expect(secondDeck.api_ship).toEqual([1, -1, -1, -1, -1, -1]);
    expect(firstDeck.api_ship).not.toContain(1);
    expect(new Set(allAssignedShips).size).toBe(allAssignedShips.length);
  });

  it("compacts persisted organize slots after removing a middle ship through the API", async () => {
    const extraShip1 = store.createShip(9);
    const extraShip2 = store.createShip(10);
    await post("api_req_hensei/change", { api_id: 1, api_ship_idx: 2, api_ship_id: 3 });
    await post("api_req_hensei/change", { api_id: 1, api_ship_idx: 3, api_ship_id: 4 });
    await post("api_req_hensei/change", { api_id: 1, api_ship_idx: 4, api_ship_id: extraShip1.id });
    await post("api_req_hensei/change", { api_id: 1, api_ship_idx: 5, api_ship_id: extraShip2.id });

    const response = await post("api_req_hensei/change", { api_id: 1, api_ship_idx: 3, api_ship_id: -1 });

    const expectedShipIds = [1, 2, 3, extraShip1.id, extraShip2.id, -1];
    expect(response.json().api_data.api_ship).toEqual(expectedShipIds);
    expect(store.getSave().decks[0].shipIds).toEqual(expectedShipIds);
    expect((await post("api_get_member/deck")).json().api_data[0].api_ship).toEqual(expectedShipIds);
  });

  it("clears follower ships through the organize API while preserving the flagship", async () => {
    const extraShip1 = store.createShip(9);
    const extraShip2 = store.createShip(10);
    await post("api_req_hensei/change", { api_id: 1, api_ship_idx: 2, api_ship_id: 3 });
    await post("api_req_hensei/change", { api_id: 1, api_ship_idx: 3, api_ship_id: 4 });
    await post("api_req_hensei/change", { api_id: 1, api_ship_idx: 4, api_ship_id: extraShip1.id });
    await post("api_req_hensei/change", { api_id: 1, api_ship_idx: 5, api_ship_id: extraShip2.id });

    const response = await post("api_req_hensei/change", { api_id: 1, api_ship_idx: -1, api_ship_id: -2 });

    const expectedShipIds = [1, -1, -1, -1, -1, -1];
    expect(response.json().api_data.api_ship).toEqual(expectedShipIds);
    expect(response.json().api_data.api_flagship).toBe(1);
    expect(store.getSave().decks[0].shipIds).toEqual(expectedShipIds);
    expect((await post("api_get_member/deck")).json().api_data[0]).toMatchObject({
      api_flagship: 1,
      api_ship: expectedShipIds
    });
  });

  it("supports docks, arsenal, expeditions, items, and a deterministic first sortie loop", async () => {
    store.db.prepare("UPDATE ships SET hp = ? WHERE id = ?").run(10, 1);
    const expeditionShip1 = store.createShip(9);
    const expeditionShip2 = store.createShip(10);
    store.changeDeckShip(2, 0, expeditionShip1.id);
    store.changeDeckShip(2, 1, expeditionShip2.id);
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
    const expedition = await post("api_req_mission/start", {
      api_deck_id: 2,
      api_mission_id: 1,
      api_serial_cid: "api-smoke"
    });
    const chartInfo = await post("api_get_member/chart_additional_info");
    const mapInfo = await post("api_get_member/mapinfo");
    const mapStart = await post("api_req_map/start", { api_maparea_id: 1, api_mapinfo_no: 1, api_deck_id: 1 });
    const mapNext = await post("api_req_map/next");
    const battle = await post("api_req_sortie/battle");
    const result = await post("api_req_sortie/battleresult");

    expect(repair.json().api_data).toMatchObject({ api_ndock_id: expect.any(Number) });
    expect(craft.json().api_data).toMatchObject({ api_create_flag: 1, api_slot_item: expect.any(Object) });
    expect(build.json().api_data).toMatchObject({ api_result: 1, api_kdock: expect.any(Object) });
    expect(expedition.json().api_data).toMatchObject({ api_complatetime: expect.any(Number) });
    expect(chartInfo.json().api_data.api_deck_param[0]).toMatchObject({
      api_seiku_value: expect.any(Number),
      api_tp_value: expect.any(Number),
      api_atp_value: expect.any(Object)
    });
    expect(mapInfo.json().api_data).toMatchObject({
      api_map_info: expect.arrayContaining([
        expect.objectContaining({
          api_id: 11,
          api_maparea_id: 1,
          api_no: 1,
          api_sally_flag: [1, 0, 0]
        })
      ]),
      api_air_base: [],
      api_air_base_expanded_info: []
    });
    expect(mapStart.json().api_data).toMatchObject({
      api_no: 1,
      api_from_no: 0,
      api_maparea_id: 1,
      api_mapinfo_no: 1,
      api_cell_data: expect.arrayContaining([
        expect.objectContaining({ api_no: 0, api_color_no: 0 }),
        expect.objectContaining({ api_no: 1, api_color_no: 4 })
      ]),
      api_next: expect.any(Number)
    });
    expect(mapNext.json().api_data).toMatchObject({
      api_maparea_id: 1,
      api_mapinfo_no: 1,
      api_from_no: 1,
      api_no: expect.any(Number)
    });
    expect(battle.json().api_data).toMatchObject({
      api_dock_id: 1,
      api_ship_ke: expect.any(Array),
      api_hougeki1: expect.any(Object)
    });
    expect(result.json().api_data).toMatchObject({
      api_win_rank: expect.stringMatching(/[SABCDE]/),
      api_get_exp: expect.any(Number),
      api_get_ship_exp: expect.any(Array)
    });

    store.forceCompleteExpedition(2);
    const missionResult = await post("api_req_mission/result", { api_deck_id: 2 });
    const repeatMissionResult = await post("api_req_mission/result", { api_deck_id: 2 });
    const missionRecord = (await post("api_get_member/record")).json().api_data;
    expect(missionResult.json().api_data).toMatchObject({
      api_clear_result: expect.any(Number),
      api_get_material: expect.any(Array)
    });
    expect(repeatMissionResult.json().api_data.api_clear_result).toBe(missionResult.json().api_data.api_clear_result);
    expect(missionRecord.api_mission).toMatchObject({
      api_count: 1,
      api_success: missionResult.json().api_data.api_clear_result > 0 ? 1 : 0,
      api_rate: expect.any(String)
    });
  });

  it("returns deck parameter slots required by sortie deck selection", async () => {
    const response = await post("api_get_member/chart_additional_info");

    expect(response.statusCode).toBe(200);
    expect(response.json().api_data.api_deck_param).toEqual([
      { api_seiku_value: 0, api_tp_value: 0, api_atp_value: {} },
      { api_seiku_value: 0, api_tp_value: 0, api_atp_value: {} },
      { api_seiku_value: 0, api_tp_value: 0, api_atp_value: {} },
      { api_seiku_value: 0, api_tp_value: 0, api_atp_value: {} }
    ]);
  });

  it("serializes single-stage map gauges as progress instead of resource variants", async () => {
    const initialMaps = (await post("api_get_member/mapinfo")).json().api_data.api_map_info;

    expect(initialMaps.find((map: any) => map.api_id === 11)).toMatchObject({
      api_gauge_num: 1,
      api_gauge_type: 0,
      api_required_defeat_count: null
    });
    expect(initialMaps.find((map: any) => map.api_id === 15)).toMatchObject({
      api_gauge_num: 1,
      api_gauge_type: 1,
      api_defeat_count: 0,
      api_required_defeat_count: 4
    });
    expect(initialMaps.find((map: any) => map.api_id === 16)).toMatchObject({
      api_gauge_num: 1,
      api_gauge_type: 1,
      api_defeat_count: 0,
      api_required_defeat_count: 7
    });

    store.db.prepare("UPDATE maps SET gauge = 3 WHERE id = 15").run();
    const progressedMaps = (await post("api_get_member/mapinfo")).json().api_data.api_map_info;
    expect(progressedMaps.find((map: any) => map.api_id === 15)).toMatchObject({
      api_gauge_num: 1,
      api_gauge_type: 1,
      api_defeat_count: 1,
      api_required_defeat_count: 4
    });

    store.db.prepare("UPDATE maps SET cleared = 1, gauge = 0, phase = 2 WHERE id = 15").run();
    const clearedMaps = (await post("api_get_member/mapinfo")).json().api_data.api_map_info;
    const cleared = clearedMaps.find((map: any) => map.api_id === 15);
    expect(cleared).toMatchObject({
      api_gauge_num: 1,
      api_gauge_type: 1
    });
    expect(cleared).not.toHaveProperty("api_defeat_count");
    expect(cleared).not.toHaveProperty("api_required_defeat_count");
  });

  it("serializes multi-stage map gauges using the current real stage", async () => {
    const initialMaps = (await post("api_get_member/mapinfo")).json().api_data.api_map_info;
    expect(initialMaps.find((map: any) => map.api_id === 72)).toMatchObject({
      api_gauge_num: 1,
      api_gauge_type: 1,
      api_defeat_count: 0,
      api_required_defeat_count: 3
    });

    store.db.prepare("UPDATE maps SET gauge = 4, phase = 2, phase_progress = 0 WHERE id = 72").run();
    const secondStageMaps = (await post("api_get_member/mapinfo")).json().api_data.api_map_info;
    expect(secondStageMaps.find((map: any) => map.api_id === 72)).toMatchObject({
      api_gauge_num: 2,
      api_gauge_type: 1,
      api_defeat_count: 0,
      api_required_defeat_count: 4
    });

    store.db.prepare("UPDATE maps SET gauge = 3, phase_progress = 1 WHERE id = 72").run();
    const progressedMaps = (await post("api_get_member/mapinfo")).json().api_data.api_map_info;
    expect(progressedMaps.find((map: any) => map.api_id === 72)).toMatchObject({
      api_gauge_num: 2,
      api_gauge_type: 1,
      api_defeat_count: 1,
      api_required_defeat_count: 4
    });

    store.db.prepare("UPDATE maps SET cleared = 1, gauge = 0, phase = 3, phase_progress = 0 WHERE id = 72").run();
    const clearedMaps = (await post("api_get_member/mapinfo")).json().api_data.api_map_info;
    const cleared = clearedMaps.find((map: any) => map.api_id === 72);
    expect(cleared).toMatchObject({
      api_gauge_num: 2,
      api_gauge_type: 1
    });
    expect(cleared).not.toHaveProperty("api_defeat_count");
    expect(cleared).not.toHaveProperty("api_required_defeat_count");
  });

  it("returns HTML5 battle arrays that match exposed enemy master data", async () => {
    const start2 = await post("api_start2/getData");
    await post("api_req_map/start", { api_maparea_id: 1, api_mapinfo_no: 1, api_deck_id: 1 });
    store.db.prepare("UPDATE sortie_sessions SET seed = 0 WHERE id = 1").run();
    await post("api_req_map/next");

    const battle = await post("api_req_sortie/battle", { api_formation: 2 });

    expect(battle.statusCode).toBe(200);
    const start2Data = start2.json().api_data;
    const battleData = battle.json().api_data;
    expect(battleData).toMatchObject({
      api_deck_id: 1,
      api_dock_id: 1,
      api_formation: [2, 1, 1],
      api_ship_lv: [1, 1, 0, 0, 0, 0]
    });
    const nodeBEnemyIds = battleData.api_ship_ke.filter((id: number) => id > 0);
    expect(nodeBEnemyIds).toHaveLength(2);
    expect(nodeBEnemyIds[0]).toBe(nodeBEnemyIds[1]);
    expect([1501, 1502, 1503]).toContain(nodeBEnemyIds[0]);
    for (const key of ["api_ship_ke", "api_ship_lv", "api_f_nowhps", "api_f_maxhps", "api_e_nowhps", "api_e_maxhps", "api_fParam", "api_eParam", "api_eSlot"]) {
      expect(battleData[key], key).toHaveLength(6);
    }
    expect(battleData.api_nowhps).toHaveLength(13);
    expect(battleData.api_maxhps).toHaveLength(13);
    expect(battleData.api_hougeki1.api_at_list.length).toBeGreaterThan(0);
    expect(battleData.api_hougeki1.api_at_eflag).toHaveLength(battleData.api_hougeki1.api_at_list.length);
    expect(battleData.api_hougeki1.api_at_type).toHaveLength(battleData.api_hougeki1.api_at_list.length);
    expect(battleData.api_hougeki1.api_df_list).toHaveLength(battleData.api_hougeki1.api_at_list.length);
    expect(battleData.api_hougeki1.api_si_list).toHaveLength(battleData.api_hougeki1.api_at_list.length);
    expect(battleData.api_hougeki1.api_cl_list).toHaveLength(battleData.api_hougeki1.api_at_list.length);
    expect(battleData.api_hougeki1.api_damage).toHaveLength(battleData.api_hougeki1.api_at_list.length);
    const activeFriendCount = battleData.api_f_nowhps.filter((hp: number) => hp > 0).length;
    const activeEnemyCount = battleData.api_ship_ke.filter((id: number) => id > 0).length;
    for (const [index, attacker] of battleData.api_hougeki1.api_at_list.entries()) {
      const attackerIsEnemy = battleData.api_hougeki1.api_at_eflag[index] === 1;
      expect(attacker).toBeGreaterThanOrEqual(0);
      expect(attacker).toBeLessThan(attackerIsEnemy ? activeEnemyCount : activeFriendCount);
      for (const defender of battleData.api_hougeki1.api_df_list[index]) {
        expect(defender).toBeGreaterThanOrEqual(0);
        expect(defender).toBeLessThan(attackerIsEnemy ? activeFriendCount : activeEnemyCount);
      }
    }
    const slotMasterIds = new Set(start2Data.api_mst_slotitem.map((slot: any) => slot.api_id));
    for (const slotIds of battleData.api_hougeki1.api_si_list) {
      for (const slotId of slotIds) {
        expect(slotId).toBeGreaterThan(0);
        expect(slotMasterIds.has(slotId), `api_mst_slotitem contains ${slotId}`).toBe(true);
      }
    }
    expect(battleData.api_raigeki).toMatchObject({
      api_frai: expect.any(Array),
      api_erai: expect.any(Array),
      api_fdam: expect.any(Array),
      api_edam: expect.any(Array),
      api_fydam: expect.any(Array),
      api_eydam: expect.any(Array),
      api_fcl: expect.any(Array),
      api_ecl: expect.any(Array),
      api_frai_flag: expect.any(Array),
      api_erai_flag: expect.any(Array),
      api_fbak_flag: expect.any(Array),
      api_ebak_flag: expect.any(Array)
    });
    for (const key of Object.keys(battleData.api_raigeki)) expect(battleData.api_raigeki[key], key).toHaveLength(6);
    for (const [attackerIndex, target] of battleData.api_raigeki.api_frai.entries()) {
      if (target < 0) continue;
      expect(target).toBeLessThan(activeEnemyCount);
      expect(battleData.api_raigeki.api_edam[target]).toBeGreaterThanOrEqual(battleData.api_raigeki.api_fydam[attackerIndex]);
    }

    const enemyIds = battleData.api_ship_ke.filter((id: number) => id > 0);
    expect(enemyIds).not.toEqual(expect.arrayContaining([501, 502]));
    const shipMasterIds = new Set(start2Data.api_mst_ship.map((ship: any) => ship.api_id));
    const shipGraphIds = new Set(start2Data.api_mst_shipgraph.map((ship: any) => ship.api_id));
    for (const enemyId of enemyIds) {
      expect(shipMasterIds.has(enemyId), `api_mst_ship contains ${enemyId}`).toBe(true);
      expect(shipGraphIds.has(enemyId), `api_mst_shipgraph contains ${enemyId}`).toBe(true);
    }
  });

  it("returns aviation phase data from normal sortie battle when the fleet has carrier aircraft", async () => {
    const akagi = store.createShip(277);
    const fighter = store.createSlotItem(20);
    const bomber = store.createSlotItem(23);
    await post("api_req_kaisou/slotset", { api_id: akagi.id, api_slot_idx: 0, api_item_id: fighter.id });
    await post("api_req_kaisou/slotset", { api_id: akagi.id, api_slot_idx: 2, api_item_id: bomber.id });
    await post("api_req_hensei/change", { api_id: 1, api_ship_idx: 0, api_ship_id: akagi.id });
    await post("api_req_map/start", { api_maparea_id: 1, api_mapinfo_no: 1, api_deck_id: 1 });
    await post("api_req_map/next");
    store.db.prepare("UPDATE sortie_sessions SET seed = 0 WHERE id = 1").run();

    const battle = await post("api_req_sortie/battle", { api_formation: 1 });
    const battleData = battle.json().api_data;

    expect(battle.statusCode).toBe(200);
    expect(battleData.api_stage_flag).toEqual([1, 1, 1]);
    expect(battleData.api_kouku).toMatchObject({
      api_plane_from: [[1], []],
      api_stage1: {
        api_f_count: 52,
        api_f_lostcount: expect.any(Number),
        api_e_count: 0,
        api_e_lostcount: 0,
        api_disp_seiku: 1,
        api_touch_plane: expect.any(Array)
      },
      api_stage2: {
        api_f_count: expect.any(Number),
        api_f_lostcount: 0,
        api_e_count: 0,
        api_e_lostcount: 0
      }
    });
    expect(battleData.api_kouku.api_stage1.api_f_lostcount).toBeGreaterThan(0);
    expect(battleData.api_kouku.api_stage3.api_edam.some((damage: number) => damage > 0)).toBe(true);
    for (const key of ["api_frai_flag", "api_erai_flag", "api_fbak_flag", "api_ebak_flag", "api_fcl_flag", "api_ecl_flag", "api_fdam", "api_edam"]) {
      expect(battleData.api_kouku.api_stage3[key], key).toHaveLength(6);
    }

    await post("api_req_sortie/battleresult");
    const afterShips = (await post("api_get_member/ship2")).json().api_data;
    const akagiAfter = afterShips.find((ship: any) => ship.api_id === akagi.id);
    expect(akagiAfter.api_onslot[0] + akagiAfter.api_onslot[2]).toBeLessThan(52);

    const missingAircraft = 52 - akagiAfter.api_onslot[0] - akagiAfter.api_onslot[2];
    const beforeSupply = store.getSave();
    const charge = await post("api_req_hokyu/charge", {
      api_id_items: String(akagi.id),
      api_kind: 3,
      api_onslot: 1
    });
    const chargeData = charge.json().api_data;
    const suppliedAkagi = chargeData.api_ship.find((ship: any) => ship.api_id === akagi.id);

    expect(suppliedAkagi.api_onslot).toEqual([20, 0, 32, 0, 0]);
    expect(store.getSave().materials.bauxite).toBe(beforeSupply.materials.bauxite - missingAircraft * 5);
    expect(chargeData.api_use_bou).toBe(1);
  });

  it("exposes official 1-1 boss enemy fleet through battle payload and start2 master data", async () => {
    const start2Data = (await post("api_start2/getData")).json().api_data;
    await post("api_req_map/start", { api_maparea_id: 1, api_mapinfo_no: 1, api_deck_id: 1 });
    store.db.prepare("UPDATE sortie_sessions SET seed = 3 WHERE id = 1").run();
    await post("api_req_map/next");
    await post("api_req_map/next");

    const battle = await post("api_req_sortie/battle", { api_formation: 1 });
    const battleData = battle.json().api_data;

    expect(battleData.api_ship_ke[0]).toBe(1505);
    expect(battleData.api_ship_ke.filter((id: number) => id > 0).length).toBeGreaterThanOrEqual(3);
    expect(battleData.api_stage_flag).toEqual([0, 0, 0]);
    expect(battleData.api_kouku).toBeNull();
    expect(battleData.api_eSlot[0]).toEqual(expect.arrayContaining([1504, 1525]));
    expect(start2Data.api_mst_ship.find((ship: any) => ship.api_id === 1503)).toMatchObject({
      api_name: "駆逐ハ級"
    });
    expect(start2Data.api_mst_ship.find((ship: any) => ship.api_id === 1505)).toMatchObject({
      api_name: "軽巡ホ級"
    });
    const slotIds = new Set(start2Data.api_mst_slotitem.map((slot: any) => slot.api_id));
    for (const slotIdsForEnemy of battleData.api_eSlot) {
      for (const slotId of slotIdsForEnemy) {
        if (slotId > 0) expect(slotIds.has(slotId), `api_mst_slotitem contains ${slotId}`).toBe(true);
      }
    }
  });

  it("validates active route selection edge numbers", async () => {
    await post("api_req_map/start", { api_maparea_id: 4, api_mapinfo_no: 5, api_deck_id: 1 });
    const session = store.getSave().sortieSession!;
    store.db.prepare("UPDATE sortie_sessions SET node = 1, state_json = ? WHERE id = 1").run(JSON.stringify({
      ...session.state,
      point: "A",
      routeStep: 1,
      visited: ["Start", "A"]
    }));

    const missing = await post("api_req_map/next");
    const afterMissing = store.getSave().sortieSession;
    const invalid = await post("api_req_map/next", { api_cell_id: 999 });
    const afterInvalid = store.getSave().sortieSession;
    const selected = await post("api_req_map/next", { api_cell_id: 4 });

    expect(missing.statusCode).toBe(400);
    expect(invalid.statusCode).toBe(400);
    expect(missing.json()).toMatchObject({ api_result: 400, api_result_msg: expect.stringMatching(/api_cell_id/i) });
    expect(invalid.json()).toMatchObject({ api_result: 400, api_result_msg: expect.stringMatching(/not available/i) });
    expect(afterInvalid).toEqual(afterMissing);
    expect(afterInvalid?.node).toBe(1);
    expect(selected.json().api_data).toMatchObject({ api_no: 4, api_from_no: 1 });
    expect(store.getSave().sortieSession?.node).toBe(4);
  });

  it("returns topology metadata for a non-combat resource node", async () => {
    const now = vi.spyOn(Date, "now").mockReturnValue(0);
    const response = await post("api_req_map/start", {
      api_maparea_id: 1,
      api_mapinfo_no: 2,
      api_deck_id: 1
    });
    now.mockRestore();

    expect(response.json().api_data).toMatchObject({
      api_no: 2,
      api_from_no: 0,
      api_color_no: 8,
      api_event_id: 2,
      api_event_kind: 0,
      api_next: 3
    });
  });

  it("returns normal and boss combat colors for every 1-3 route variant", async () => {
    const start2Data = (await post("api_start2/getData")).json().api_data;
    const mapCells = start2Data.api_mst_mapcell.filter(
      (cell: any) => cell.api_maparea_id === 1 && cell.api_mapinfo_no === 3
    );
    const colorByNode = new Map(mapCells.map((cell: any) => [cell.api_no, cell.api_color_no]));

    expect(Object.fromEntries(colorByNode)).toMatchObject({
      3: 4,
      5: 4,
      6: 4,
      10: 5,
      11: 4,
      12: 4,
      13: 5
    });

    const start = await post("api_req_map/start", {
      api_maparea_id: 1,
      api_mapinfo_no: 3,
      api_deck_id: 1
    });
    expect(start.json().api_data.api_cell_data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ api_no: 3, api_color_no: 4 }),
        expect.objectContaining({ api_no: 10, api_color_no: 5 }),
        expect.objectContaining({ api_no: 13, api_color_no: 5 })
      ])
    );

    const session = store.getSave().sortieSession!;
    store.db.prepare("UPDATE sortie_sessions SET node = 2, state_json = ? WHERE id = 1").run(JSON.stringify({
      ...session.state,
      point: "B",
      routeStep: 2,
      visited: ["Start", "A", "D", "B"]
    }));
    const normal = await post("api_req_map/next");
    expect(normal.json().api_data).toMatchObject({
      api_no: 11,
      api_color_no: 4,
      api_event_id: 4,
      api_event_kind: 1
    });

    const normalSession = store.getSave().sortieSession!;
    store.db.prepare("UPDATE sortie_sessions SET node = 12, seed = 6, state_json = ? WHERE id = 1").run(
      JSON.stringify({
        ...normalSession.state,
        point: "F",
        routeStep: 4,
        visited: ["Start", "A", "E", "F"]
      })
    );
    const boss = await post("api_req_map/next");
    expect(boss.json().api_data).toMatchObject({
      api_no: 10,
      api_color_no: 5,
      api_event_id: 5,
      api_event_kind: 1
    });
  });

  it("returns combined airbattle payloads with combined stage3 arrays", async () => {
    const akagi = store.createShip(277);
    const fighter = store.createSlotItem(20);
    const bomber = store.createSlotItem(23);
    const escort1 = store.createShip(7);
    const escort2 = store.createShip(11);
    await post("api_req_kaisou/slotset", { api_id: akagi.id, api_slot_idx: 0, api_item_id: fighter.id });
    await post("api_req_kaisou/slotset", { api_id: akagi.id, api_slot_idx: 2, api_item_id: bomber.id });
    await post("api_req_hensei/change", { api_id: 1, api_ship_idx: 0, api_ship_id: akagi.id });
    await post("api_req_hensei/change", { api_id: 2, api_ship_idx: 0, api_ship_id: escort1.id });
    await post("api_req_hensei/change", { api_id: 2, api_ship_idx: 1, api_ship_id: escort2.id });
    await post("api_req_hensei/combined", { api_combined_type: 1 });
    await post("api_req_map/start", { api_maparea_id: 1, api_mapinfo_no: 1, api_deck_id: 1 });
    await post("api_req_map/next");

    const battle = await post("api_req_combined_battle/airbattle", { api_formation: 1 });
    const data = battle.json().api_data;

    expect(data.api_stage_flag).toEqual([1, 1, 1]);
    expect(data.api_kouku.api_plane_from).toEqual([[1], []]);
    expect(data.api_kouku.api_stage3_combined).toBeTruthy();
    for (const key of ["api_frai_flag", "api_erai_flag", "api_fbak_flag", "api_ebak_flag", "api_fcl_flag", "api_ecl_flag", "api_fdam", "api_edam"]) {
      expect(data.api_kouku.api_stage3_combined[key], key).toHaveLength(6);
    }
  });

  it("keeps battle endpoint payload contracts stable for the HTML5 client", async () => {
    const akagi = store.createShip(277);
    const fighter = store.createSlotItem(20);
    const bomber = store.createSlotItem(23);
    await post("api_req_kaisou/slotset", { api_id: akagi.id, api_slot_idx: 0, api_item_id: fighter.id });
    await post("api_req_kaisou/slotset", { api_id: akagi.id, api_slot_idx: 2, api_item_id: bomber.id });
    await post("api_req_hensei/change", { api_id: 1, api_ship_idx: 0, api_ship_id: akagi.id });
    await post("api_req_map/start", { api_maparea_id: 1, api_mapinfo_no: 1, api_deck_id: 1 });
    await post("api_req_map/next");

    const sortieBattle = (await post("api_req_sortie/battle", { api_formation: 1 })).json().api_data;
    expectBattlePhasePlaceholders(sortieBattle);
    expectFixedFleetArrays(sortieBattle);

    const airBattle = (await post("api_req_sortie/airbattle", { api_formation: 1 })).json().api_data;
    expectBattlePhasePlaceholders(airBattle);
    expectFixedFleetArrays(airBattle);
    expect(airBattle.api_hougeki1.api_at_list).toEqual([]);
    expect(airBattle.api_opening_atack).toBeNull();
    expect(airBattle.api_raigeki).toBeNull();

    const landAirBattle = (await post("api_req_sortie/ld_airbattle", { api_formation: 1 })).json().api_data;
    expectBattlePhasePlaceholders(landAirBattle);
    expect(landAirBattle.api_air_base_attack).toMatchObject({ api_stage_flag: [0, 0, 0] });
    expect(landAirBattle.api_hougeki1.api_at_list).toEqual([]);
    expect(landAirBattle.api_raigeki).toBeNull();

    const escort = store.createShip(119);
    await post("api_req_hensei/change", { api_id: 2, api_ship_idx: 0, api_ship_id: escort.id });
    await post("api_req_hensei/combined", { api_combined_type: 1 });
    await post("api_req_map/start", { api_maparea_id: 1, api_mapinfo_no: 1, api_deck_id: 1 });
    await post("api_req_map/next");
    const combinedBattle = (await post("api_req_combined_battle/battle", { api_formation: 1 })).json().api_data;
    expectBattlePhasePlaceholders(combinedBattle);
    expectFixedFleetArrays(combinedBattle);
    expect(combinedBattle.api_f_nowhps_combined).toHaveLength(6);
    expect(combinedBattle.api_fParam_combined).toHaveLength(6);
  });

  it("records distinct endpoint modes for combined battle variants", async () => {
    const escort = store.createShip(119);
    await post("api_req_hensei/change", { api_id: 2, api_ship_idx: 0, api_ship_id: escort.id });
    await post("api_req_hensei/combined", { api_combined_type: 1 });
    await post("api_req_map/start", { api_maparea_id: 1, api_mapinfo_no: 1, api_deck_id: 1 });
    await post("api_req_map/next");

    await post("api_req_combined_battle/battle_water", { api_formation: 1 });
    expect(store.lastCombinedBattle()).toMatchObject({ endpoint: "combinedBattleWater" });

    await post("api_req_combined_battle/each_battle", { api_formation: 1 });
    expect(store.lastCombinedBattle()).toMatchObject({ endpoint: "combinedEachBattle" });

    await post("api_req_combined_battle/ec_battle", { api_formation: 1 });
    expect(store.lastCombinedBattle()).toMatchObject({ endpoint: "combinedEcBattle" });
  });

  it("returns enemy combined fleet payload fields when sortie data has an escort fleet", async () => {
    let patchedNode: ReturnType<typeof sortieNodes>[number] | undefined;
    let originalEscortIds: number[][] = [];

    try {
      const escort = store.createShip(119);
      await post("api_req_hensei/change", { api_id: 2, api_ship_idx: 0, api_ship_id: escort.id });
      await post("api_req_hensei/combined", { api_combined_type: 1 });
      await post("api_req_map/start", { api_maparea_id: 1, api_mapinfo_no: 1, api_deck_id: 1 });
      await post("api_req_map/next");
      const session = store.getSave().sortieSession!;
      patchedNode = sortieNodes().find((item) => item.mapId === 11 && item.node === session.node)!;
      originalEscortIds = patchedNode.encounters.map((encounter) => [...((encounter as any).enemyCombinedShipIds ?? [])]);
      for (const encounter of patchedNode.encounters) {
        (encounter as any).enemyCombinedShipIds = [1502, 1503];
      }

      const battle = await post("api_req_combined_battle/battle", { api_formation: 1 });
      const data = battle.json().api_data;

      expect(data.api_ship_ke_combined).toHaveLength(6);
      expect(data.api_ship_ke_combined.slice(0, 2)).toEqual([1502, 1503]);
      expect(data.api_e_nowhps_combined).toHaveLength(6);
      expect(data.api_e_nowhps_combined[0]).toBe(ENEMY_UNIT_TEMPLATES[1502].hp);
      expect(data.api_eParam_combined).toHaveLength(6);
      expect(data.api_eParam_combined[0]).toEqual([
        ENEMY_UNIT_TEMPLATES[1502].firepower,
        ENEMY_UNIT_TEMPLATES[1502].torpedo,
        ENEMY_UNIT_TEMPLATES[1502].aa,
        ENEMY_UNIT_TEMPLATES[1502].armor
      ]);
      expect(data.api_eSlot_combined).toHaveLength(6);
      expect(data.api_eSlot_combined[0][0]).toBeGreaterThan(0);
      expect(data.api_nowhps_combined).toHaveLength(13);
    } finally {
      patchedNode?.encounters.forEach((encounter, index) => {
        if (originalEscortIds[index].length > 0) {
          (encounter as any).enemyCombinedShipIds = originalEscortIds[index];
        } else {
          delete (encounter as any).enemyCombinedShipIds;
        }
      });
    }
  });

  it("lets enemy combined escort units participate in ec_battle damage resolution", async () => {
    let patchedNode: ReturnType<typeof sortieNodes>[number] | undefined;
    let originalEscortIds: number[][] = [];
    const originalEnemy = {
      ...ENEMY_UNIT_TEMPLATES[1502],
      slots: [...ENEMY_UNIT_TEMPLATES[1502].slots],
      onSlot: [...ENEMY_UNIT_TEMPLATES[1502].onSlot]
    };

    try {
      const escort = store.createShip(119);
      await post("api_req_hensei/change", { api_id: 2, api_ship_idx: 0, api_ship_id: escort.id });
      await post("api_req_hensei/combined", { api_combined_type: 1 });
      await post("api_req_map/start", { api_maparea_id: 1, api_mapinfo_no: 1, api_deck_id: 1 });
      await post("api_req_map/next");
      const session = store.getSave().sortieSession!;
      patchedNode = sortieNodes().find((item) => item.mapId === 11 && item.node === session.node)!;
      originalEscortIds = patchedNode.encounters.map((encounter) => [...((encounter as any).enemyCombinedShipIds ?? [])]);
      for (const encounter of patchedNode.encounters) {
        (encounter as any).enemyCombinedShipIds = [1502];
      }
      Object.assign(ENEMY_UNIT_TEMPLATES[1502], { hp: 999, armor: 0 });

      await post("api_req_combined_battle/ec_battle", { api_formation: 1 });
      const record = store.lastCombinedBattle() as any;

      expect(record.endpoint).toBe("combinedEcBattle");
      expect(record.before.eCombinedNowHps[0]).toBe(999);
      expect(record.after.eCombinedNowHps[0]).toBeLessThan(999);
    } finally {
      patchedNode?.encounters.forEach((encounter, index) => {
        if (originalEscortIds[index].length > 0) {
          (encounter as any).enemyCombinedShipIds = originalEscortIds[index];
        } else {
          delete (encounter as any).enemyCombinedShipIds;
        }
      });
      Object.assign(ENEMY_UNIT_TEMPLATES[1502], originalEnemy);
    }
  });

  it("applies sortie battle results once and exposes night battle fields", async () => {
    const beforeSortie = store.getSave();
    const beforeFleet = beforeSortie.decks[0].shipIds
      .filter((shipId) => shipId > 0)
      .map((shipId) => beforeSortie.ships.find((ship) => ship.id === shipId)!);
    await post("api_req_map/start", { api_maparea_id: 1, api_mapinfo_no: 1, api_deck_id: 1 });
    const afterStart = store.getSave();
    store.db.prepare("UPDATE sortie_sessions SET seed = 0 WHERE id = 1").run();
    await post("api_req_map/next");
    store.db.prepare("UPDATE sortie_sessions SET seed = ? WHERE id = 1").run(36566);

    const battle = await post("api_req_sortie/battle", { api_formation: 1 });
    const night = await post("api_req_battle_midnight/battle");
    const result = await post("api_req_sortie/battleresult");
    const afterFirst = store.getSave();
    const afterFirstFleet = beforeFleet.map((ship) => afterFirst.ships.find((afterShip) => afterShip.id === ship.id)!);
    const repeat = await post("api_req_sortie/battleresult");
    const afterRepeat = store.getSave();
    const afterRepeatFleet = beforeFleet.map((ship) => afterRepeat.ships.find((afterShip) => afterShip.id === ship.id)!);

    expect(battle.statusCode).toBe(200);
    for (const beforeShip of beforeFleet) {
      const startedShip = afterStart.ships.find((ship) => ship.id === beforeShip.id)!;
      expect(startedShip.fuel).toBe(beforeShip.fuel);
      expect(startedShip.ammo).toBe(beforeShip.ammo);
    }
    expect(night.json().api_data.api_hougeki).toMatchObject({
      api_sp_list: expect.any(Array),
      api_n_mother_list: expect.any(Array)
    });
    const nightData = night.json().api_data;
    expect(nightData.api_hougeki.api_sp_list).toHaveLength(nightData.api_hougeki.api_df_list.length);
    for (const key of ["api_ship_ke", "api_ship_lv", "api_f_nowhps", "api_f_maxhps", "api_e_nowhps", "api_e_maxhps", "api_fParam", "api_eParam", "api_eSlot"]) {
      expect(nightData[key], key).toHaveLength(6);
    }
    expect(result.json().api_data).toMatchObject({
      api_win_rank: expect.stringMatching(/[SABCDE]/),
      api_mvp: expect.any(Number),
      api_get_exp: expect.any(Number),
      api_get_ship: expect.any(Object),
      api_get_ship_exp: expect.any(Array),
      api_get_exp_lvup: expect.any(Array)
    });
    expect(result.json().api_data.api_get_ship_exp).toHaveLength(7);
    expect(result.json().api_data.api_get_ship_exp[0]).toBe(-1);
    expect(result.json().api_data.api_get_ship_exp.slice(1, 3).every((exp: number) => exp > 0)).toBe(true);
    expect(result.json().api_data.api_get_exp_lvup).toHaveLength(6);
    expect(result.json().api_data.api_get_exp_lvup.every((levels: number[]) => Array.isArray(levels))).toBe(true);
    expect(result.json().api_data.api_get_exp_lvup.slice(0, 2).every((levels: number[]) => levels.length >= 2)).toBe(true);
    expect(repeat.json().api_data.api_win_rank).toBe(result.json().api_data.api_win_rank);
    expect(repeat.json().api_data.api_get_ship_exp).toEqual(result.json().api_data.api_get_ship_exp);
    expect(repeat.json().api_data.api_get_exp_lvup).toEqual(result.json().api_data.api_get_exp_lvup);
    expect(afterRepeat.materials).toEqual(afterFirst.materials);
    for (const [index, beforeShip] of beforeFleet.entries()) {
      expect(afterFirstFleet[index].fuel).toBe(Math.max(0, beforeShip.fuel - Math.floor(beforeShip.maxFuel * 0.2)));
      expect(afterFirstFleet[index].ammo).toBe(Math.max(0, beforeShip.ammo - Math.ceil(beforeShip.maxAmmo * 0.3)));
      expect(afterRepeatFleet[index].hp).toBeGreaterThanOrEqual(1);
      expect(afterRepeatFleet[index].hp).toBeLessThanOrEqual(afterRepeatFleet[index].maxHp);
      expect(afterRepeatFleet[index].fuel).toBe(afterFirstFleet[index].fuel);
      expect(afterRepeatFleet[index].ammo).toBe(afterFirstFleet[index].ammo);
      expect(afterRepeatFleet[index].exp).toBeGreaterThan(0);
    }
    expect(afterRepeat.player.exp).toBeGreaterThan(0);
    expect((afterRepeat.sortieSession?.state as any).lastBattle.resultClaimed).toBe(true);
    expect(result.json().api_data.api_get_ship.api_ship_id).not.toBe(1);
    expect(afterRepeat.ships.some((ship) => ship.masterId === result.json().api_data.api_get_ship.api_ship_id)).toBe(true);
    const record = (await post("api_get_member/record")).json().api_data;
    expect(record.api_war).toMatchObject({
      api_win: isVictoryRank(result.json().api_data.api_win_rank) ? 1 : 0,
      api_lose: isVictoryRank(result.json().api_data.api_win_rank) ? 0 : 1,
      api_rate: expect.any(String)
    });
  });

  it("does not create a dropped ship when the sortie drop table rolls no drop", async () => {
    await post("api_req_map/start", { api_maparea_id: 1, api_mapinfo_no: 1, api_deck_id: 1 });
    await post("api_req_map/next");
    await post("api_req_map/next");
    store.db.prepare("UPDATE sortie_sessions SET seed = ? WHERE id = 1").run(0);
    const beforeShipCount = store.getSave().ships.length;

    await post("api_req_sortie/battle", { api_formation: 1 });
    const result = await post("api_req_sortie/battleresult");

    expect(result.json().api_data.api_get_ship).toBeNull();
    expect(store.getSave().ships).toHaveLength(beforeShipCount);
  });

  it("refreshes generated practice rivals at JST exercise windows and reuses the batch for battle", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-06-18T17:59:00.000Z"));

    const signature = (practiceData: any) =>
      practiceData.api_list
        .map((item: any) => `${item.api_enemy_id}:${item.api_enemy_level}:${item.api_enemy_flag_ship}:${item.api_enemy_name}`)
        .join("|");

    const before = (await post("api_get_member/practice")).json().api_data;
    const beforeSignature = signature(before);
    expect(before.api_list).toHaveLength(5);

    const beforeInfos = [];
    for (const rival of before.api_list) {
      expect(rival.api_enemy_level).toBeGreaterThanOrEqual(80);
      expect(rival.api_enemy_level).toBeLessThanOrEqual(120);

      const info = (await post("api_req_member/get_practice_enemyinfo", { api_member_id: rival.api_enemy_id })).json().api_data;
      const ships = info.api_deck.api_ships;
      beforeInfos.push({ rival, ships });

      expect(ships.length).toBeGreaterThanOrEqual(2);
      expect(ships.length).toBeLessThanOrEqual(6);
      expect(rival.api_enemy_flag_ship).toBe(ships[0].api_ship_id);
      expect(ships.every((ship: any) => ship.api_level >= 80 && ship.api_level <= 188)).toBe(true);
    }

    const first = beforeInfos[0];
    const battle = (await post("api_req_practice/battle", {
      api_deck_id: 1,
      api_enemy_id: first.rival.api_enemy_id,
      api_formation_id: 1
    })).json().api_data;
    expect(battle.api_ship_ke.filter((id: number) => id > 0)).toEqual(first.ships.map((ship: any) => ship.api_ship_id));
    expect(battle.api_ship_lv.filter((_level: number, index: number) => battle.api_ship_ke[index] > 0))
      .toEqual(first.ships.map((ship: any) => ship.api_level));

    await post("api_req_practice/battle_result");
    const challengedBefore = (await post("api_get_member/practice")).json().api_data;
    expect(signature(challengedBefore)).toBe(beforeSignature);
    expect(challengedBefore.api_list.find((item: any) => item.api_enemy_id === first.rival.api_enemy_id).api_state)
      .toBeGreaterThan(0);

    vi.setSystemTime(new Date("2026-06-18T18:00:00.000Z"));
    const after = (await post("api_get_member/practice")).json().api_data;
    expect(after.api_list).toHaveLength(5);
    expect(signature(after)).not.toBe(beforeSignature);
    expect(after.api_list.every((item: any) => item.api_state === 0)).toBe(true);
  });

  it("regenerates stale practice batches that contain uncached ships or legacy loadout data", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-06-18T18:30:00.000Z"));

    const staleBatch = {
      periodKey: "2026-06-19T03:00+09:00",
      generatedAt: Date.now(),
      rivals: [
        {
          id: 1,
          name: "Stale Fleet",
          level: 100,
          rank: "大将",
          comment: "legacy cached batch",
          flag: 1,
          medals: 2,
          ships: [
            { id: 101, masterId: 744, level: 120, star: 4 },
            { id: 102, masterId: 9, level: 120, star: 4 }
          ]
        }
      ]
    };
    store.db.prepare("INSERT INTO battle_sessions (id, state_json) VALUES (?, ?)").run("practice_batch", JSON.stringify(staleBatch));
    store.db.prepare("INSERT INTO battle_sessions (id, state_json) VALUES (?, ?)").run("practice_states", JSON.stringify({ 1: 6 }));

    const manifest = await createResourceManifest(path.resolve("cache"));
    const practice = (await post("api_get_member/practice")).json().api_data;

    expect(practice.api_list).toHaveLength(5);
    expect(practice.api_list.every((item: any) => item.api_state === 0)).toBe(true);
    for (const rival of practice.api_list) {
      expect(rival.api_enemy_flag_ship).not.toBe(744);
      const info = (await post("api_req_member/get_practice_enemyinfo", { api_member_id: rival.api_enemy_id })).json().api_data;
      for (const ship of info.api_deck.api_ships) {
        expect(manifest.ship.banner.has(ship.api_ship_id), `banner exists for ${ship.api_ship_id}`).toBe(true);
      }
    }
  });

  it("supports a playable practice battle loop with settlement fields", async () => {
    const practice = await post("api_get_member/practice");
    const practiceData = practice.json().api_data;
    const beforePractice = store.getSave();
    const beforePracticeFleet = beforePractice.decks[0].shipIds
      .filter((shipId) => shipId > 0)
      .map((shipId) => beforePractice.ships.find((ship) => ship.id === shipId)!);

    expect(practice.statusCode).toBe(200);
    expect(practiceData.api_list.length).toBeGreaterThan(0);
    expect(practiceData.api_list[0]).toMatchObject({
      api_enemy_id: expect.any(Number),
      api_enemy_name: expect.any(String),
      api_enemy_level: expect.any(Number),
      api_enemy_rank: expect.any(String),
      api_enemy_flag: expect.any(Number),
      api_enemy_flag_ship: expect.any(Number),
      api_state: expect.any(Number)
    });

    const enemyId = practiceData.api_list[0].api_enemy_id;
    const enemyInfo = await post("api_req_member/get_practice_enemyinfo", { api_member_id: enemyId });
    expect(enemyInfo.json().api_data).toMatchObject({
      api_nickname: expect.any(String),
      api_level: expect.any(Number),
      api_deck: {
        api_deckname: expect.any(String),
        api_ships: expect.any(Array)
      }
    });
    expect(enemyInfo.json().api_data.api_deck.api_ships[0]).toMatchObject({
      api_id: expect.any(Number),
      api_ship_id: expect.any(Number),
      api_level: expect.any(Number),
      api_star: expect.any(Number)
    });

    const battle = await post("api_req_practice/battle", {
      api_deck_id: 1,
      api_enemy_id: enemyId,
      api_formation_id: 1
    });
    const night = await post("api_req_practice/midnight_battle");
    const result = await post("api_req_practice/battle_result");
    const afterFirst = store.getSave();
    const afterFirstFleet = beforePracticeFleet.map((ship) => afterFirst.ships.find((afterShip) => afterShip.id === ship.id)!);
    const repeat = await post("api_req_practice/battle_result");
    const afterRepeat = store.getSave();
    const afterRepeatFleet = beforePracticeFleet.map((ship) => afterRepeat.ships.find((afterShip) => afterShip.id === ship.id)!);
    const afterPracticeList = await post("api_get_member/practice");

    expect(battle.json().api_data).toMatchObject({
      api_deck_id: 1,
      api_ship_ke: expect.any(Array),
      api_hougeki1: expect.any(Object)
    });
    expect(night.json().api_data.api_hougeki).toMatchObject({
      api_sp_list: expect.any(Array),
      api_n_mother_list: expect.any(Array)
    });
    expect(result.json().api_data).toMatchObject({
      api_win_rank: expect.stringMatching(/[SABCDE]/),
      api_get_ship_exp: expect.any(Array),
      api_get_exp_lvup: expect.any(Array)
    });
    expect(result.json().api_data.api_get_ship).toBeNull();
    expect(result.json().api_data.api_get_ship_exp).toHaveLength(7);
    expect(result.json().api_data.api_get_exp_lvup).toHaveLength(6);
    expect(repeat.json().api_data.api_get_ship_exp).toEqual(result.json().api_data.api_get_ship_exp);
    for (const [index, beforeShip] of beforePracticeFleet.entries()) {
      expect(afterFirstFleet[index].hp).toBe(beforeShip.hp);
      expect(afterFirstFleet[index].fuel).toBe(Math.max(0, beforeShip.fuel - Math.floor(beforeShip.maxFuel * 0.2)));
      expect(afterFirstFleet[index].ammo).toBe(Math.max(0, beforeShip.ammo - Math.ceil(beforeShip.maxAmmo * 0.3)));
      expect(afterRepeatFleet[index].hp).toBe(afterFirstFleet[index].hp);
      expect(afterRepeatFleet[index].fuel).toBe(afterFirstFleet[index].fuel);
      expect(afterRepeatFleet[index].ammo).toBe(afterFirstFleet[index].ammo);
      expect(afterRepeatFleet[index].exp).toBe(afterFirstFleet[index].exp);
    }
    const practiceStateByRank: Record<string, number> = { S: 6, A: 5, B: 4, C: 3, D: 2, E: 1 };
    const expectedPracticeState = practiceStateByRank[result.json().api_data.api_win_rank] ?? 1;
    expect(afterPracticeList.json().api_data.api_list.find((item: any) => item.api_enemy_id === enemyId).api_state).toBe(expectedPracticeState);
    expect(afterFirst.ships[0].exp).toBeGreaterThan(0);
    expect(afterFirst.player.exp).toBeGreaterThan(0);
    const record = (await post("api_get_member/record")).json().api_data;
    expect(record.api_practice).toMatchObject({
      api_win: isVictoryRank(result.json().api_data.api_win_rank) ? 1 : 0,
      api_lose: isVictoryRank(result.json().api_data.api_win_rank) ? 0 : 1,
      api_rate: expect.any(String)
    });
  });

  it("supports a playable combined fleet sortie loop with main and escort settlement fields", async () => {
    const escort1 = store.createShip(7);
    const escort2 = store.createShip(11);
    await post("api_req_hensei/change", { api_id: 2, api_ship_idx: 0, api_ship_id: escort1.id });
    await post("api_req_hensei/change", { api_id: 2, api_ship_idx: 1, api_ship_id: escort2.id });
    await post("api_req_hensei/combined", { api_combined_type: 1 });
    const beforeCombined = store.getSave();
    const beforeMainFleet = beforeCombined.decks[0].shipIds
      .filter((shipId) => shipId > 0)
      .map((shipId) => beforeCombined.ships.find((ship) => ship.id === shipId)!);
    const beforeEscortFleet = beforeCombined.decks[1].shipIds
      .filter((shipId) => shipId > 0)
      .map((shipId) => beforeCombined.ships.find((ship) => ship.id === shipId)!);
    await post("api_req_map/start", { api_maparea_id: 1, api_mapinfo_no: 1, api_deck_id: 1 });
    await post("api_req_map/next");

    const battle = await post("api_req_combined_battle/battle", { api_formation: 1 });
    const night = await post("api_req_combined_battle/midnight_battle");
    const result = await post("api_req_combined_battle/battleresult");
    const afterFirst = store.getSave();
    const repeat = await post("api_req_combined_battle/battleresult");
    const after = store.getSave();

    expect(battle.json().api_data).toMatchObject({
      api_deck_id: 1,
      api_f_nowhps: expect.any(Array),
      api_f_nowhps_combined: expect.any(Array),
      api_fParam_combined: expect.any(Array),
      api_ship_ke_combined: expect.any(Array)
    });
    expect(night.json().api_data.api_hougeki).toMatchObject({
      api_sp_list: expect.any(Array),
      api_n_mother_list: expect.any(Array)
    });
    expect(night.json().api_data).toMatchObject({
      api_f_nowhps_combined: expect.any(Array),
      api_f_maxhps_combined: expect.any(Array),
      api_nowhps_combined: expect.any(Array),
      api_fParam_combined: expect.any(Array)
    });
    expect(night.json().api_data.api_f_nowhps_combined).toHaveLength(6);
    expect(result.json().api_data).toMatchObject({
      api_win_rank: expect.stringMatching(/[SABCDE]/),
      api_get_ship_exp: expect.any(Array),
      api_get_exp_lvup: expect.any(Array),
      api_mvp_combined: expect.any(Number),
      api_get_ship_exp_combined: expect.any(Array),
      api_get_exp_lvup_combined: expect.any(Array)
    });
    expect(result.json().api_data.api_get_ship_exp).toHaveLength(7);
    expect(result.json().api_data.api_get_ship_exp_combined).toHaveLength(7);
    expect(result.json().api_data.api_get_exp_lvup).toHaveLength(6);
    expect(result.json().api_data.api_get_exp_lvup_combined).toHaveLength(6);
    expect(repeat.json().api_data.api_get_ship_exp_combined).toEqual(result.json().api_data.api_get_ship_exp_combined);
    for (const beforeShip of [...beforeMainFleet, ...beforeEscortFleet]) {
      const firstShip = afterFirst.ships.find((ship) => ship.id === beforeShip.id)!;
      const repeatedShip = after.ships.find((ship) => ship.id === beforeShip.id)!;
      expect(firstShip.fuel).toBe(Math.max(0, beforeShip.fuel - Math.floor(beforeShip.maxFuel * 0.2)));
      expect(firstShip.ammo).toBe(Math.max(0, beforeShip.ammo - Math.ceil(beforeShip.maxAmmo * 0.3)));
      expect(repeatedShip.fuel).toBe(firstShip.fuel);
      expect(repeatedShip.ammo).toBe(firstShip.ammo);
    }
    expect(after.ships.find((ship) => ship.id === escort1.id)?.exp).toBeGreaterThan(0);
    expect(after.ships.find((ship) => ship.id === escort2.id)?.exp).toBeGreaterThan(0);
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
      "api_get_member/ship_deck",
      "api_get_member/payitem",
      "api_get_member/record",
      "api_req_ranking/mxltvkpyuklh",
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
      expect(response.statusCode, pathname).not.toBe(404);
      expect(response.statusCode, pathname).not.toBe(500);
      expect(response.json().api_result, pathname).not.toBe(404);
    }
  });
});
