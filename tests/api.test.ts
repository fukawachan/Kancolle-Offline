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
      api_yomi: "Fubuki"
    });
    expect(start2Data.api_mst_ship.find((ship: any) => ship.api_id === 10)).toMatchObject({
      api_name: "白雪",
      api_yomi: "Shirayuki"
    });
    expect(start2Data.api_mst_ship.find((ship: any) => ship.api_id === 11)).toMatchObject({
      api_name: "深雪",
      api_yomi: "Miyuki"
    });
    expect(start2Data.api_mst_ship.find((ship: any) => ship.api_id === 54)).toMatchObject({
      api_name: "川内",
      api_yomi: "Sendai"
    });
    expect(start2Data.api_mst_ship.find((ship: any) => ship.api_id === 77)).toMatchObject({
      api_name: "伊勢",
      api_yomi: "Ise"
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
    expect(start2Data.api_mst_shipgraph.find((ship: any) => ship.api_id === 1501)).toMatchObject({
      api_filename: "mtjmdcwtvhdr"
    });
    expect(start2Data.api_mst_shipgraph.find((ship: any) => ship.api_id === 1502)).toMatchObject({
      api_filename: "pbgkfylkbjuy"
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
    expect(start2Data.api_mst_furnituregraph).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ api_id: 1, api_no: 1, api_filename: "8807" }),
        expect.objectContaining({ api_id: 6, api_no: 6, api_filename: "8280" })
      ])
    );
    expect(start2Data.api_mst_bgm.map((bgm: any) => bgm.api_id)).toContain(0);
    expect(start2Data.api_mst_bgm.map((bgm: any) => bgm.api_id)).toEqual(expect.arrayContaining([1, 154, 155, 156]));
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
        expect.objectContaining({ api_maparea_id: 1, api_mapinfo_no: 1, api_no: 1, api_color_no: 5 })
      ])
    );
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

    expect([...useitemById.keys()]).toEqual(expect.arrayContaining([31, 32, 33, 34, 49, 55, 64]));
    expect(useitemById.get(31)).toMatchObject({ api_id: 31, api_usetype: 0, api_category: 0, api_name: "燃料" });
    expect(useitemById.get(32)).toMatchObject({ api_id: 32, api_usetype: 0, api_category: 0, api_name: "弾薬" });
    expect(useitemById.get(33)).toMatchObject({ api_id: 33, api_usetype: 0, api_category: 0, api_name: "鋼材" });
    expect(useitemById.get(34)).toMatchObject({ api_id: 34, api_usetype: 0, api_category: 0, api_name: "ボーキサイト" });
    expect(useitemById.get(49)).toMatchObject({ api_id: 49, api_name: "ドック開放キー", api_description: [expect.any(String)] });
    expect(useitemById.get(55)).toMatchObject({ api_id: 55, api_name: "ケッコン指輪", api_description: [expect.any(String)] });
    expect(useitemById.get(64)).toMatchObject({ api_id: 64, api_name: "補強増設", api_description: [expect.any(String)] });
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
      api_p_bgm_id: 0
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
      api_furniture: [1, 2, 3, 0, 4, 5]
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

  it("returns api_fuel_max and api_bull_max in ship data matching master values", async () => {
    const port = (await post("api_port/port")).json().api_data;
    const start2 = (await post("api_start2/getData")).json().api_data;
    const shipMasterById = new Map(start2.api_mst_ship.map((ship: any) => [ship.api_id, ship]));

    for (const ship of port.api_ship) {
      const master: any = shipMasterById.get(ship.api_ship_id);
      expect(ship).toHaveProperty("api_fuel_max");
      expect(ship).toHaveProperty("api_bull_max");
      expect(ship.api_fuel_max).toBe(master.api_fuel_max);
      expect(ship.api_bull_max).toBe(master.api_bull_max);
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
    expect(singleDeck.api_ship_data.map((ship: any) => ship.api_id).sort()).toEqual([1, 2]);
    expect(multipleDecks.api_deck_data.map((deck: any) => deck.api_id)).toEqual([1, 2]);
    expect(defaultDecks.api_deck_data.map((deck: any) => deck.api_id)).toEqual([1, 2, 3, 4]);
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
    expect(secondDeck.api_ship).toEqual([1, -1, -1, -1, -1, -1]);
    expect(firstDeck.api_ship).not.toContain(1);
    expect(firstDeck.api_ship).toContain(2);
    expect(new Set(allAssignedShips).size).toBe(allAssignedShips.length);
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
        expect.objectContaining({ api_no: 1, api_color_no: 5 })
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
      api_win_rank: expect.stringMatching(/[SABC]/),
      api_get_exp: expect.any(Number),
      api_get_ship: expect.any(Object)
    });

    const missionResult = await post("api_req_mission/result", { api_deck_id: 2 });
    expect(missionResult.json().api_data).toMatchObject({ api_clear_result: 1, api_get_material: expect.any(Array) });
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

  it("returns HTML5 battle arrays that match exposed enemy master data", async () => {
    const start2 = await post("api_start2/getData");
    await post("api_req_map/start", { api_maparea_id: 1, api_mapinfo_no: 1, api_deck_id: 1 });
    await post("api_req_map/next");

    const battle = await post("api_req_sortie/battle", { api_formation: 2 });

    expect(battle.statusCode).toBe(200);
    const start2Data = start2.json().api_data;
    const battleData = battle.json().api_data;
    expect(battleData).toMatchObject({
      api_deck_id: 1,
      api_dock_id: 1,
      api_formation: [2, 1, 1],
      api_ship_ke: [1501, 1502, -1, -1, -1, -1],
      api_ship_lv: [1, 1, 0, 0, 0, 0],
      api_eSlot: [
        [1, -1, -1, -1, -1],
        [1, -1, -1, -1, -1],
        [],
        [],
        [],
        []
      ]
    });
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

  it("applies sortie battle results once and exposes night battle fields", async () => {
    await post("api_req_map/start", { api_maparea_id: 1, api_mapinfo_no: 1, api_deck_id: 1 });
    await post("api_req_map/next");

    const battle = await post("api_req_sortie/battle", { api_formation: 1 });
    const night = await post("api_req_battle_midnight/battle");
    const result = await post("api_req_sortie/battleresult");
    const afterFirst = store.getSave();
    const repeat = await post("api_req_sortie/battleresult");
    const afterRepeat = store.getSave();

    expect(battle.statusCode).toBe(200);
    expect(night.json().api_data.api_hougeki).toMatchObject({
      api_sp_list: expect.any(Array),
      api_n_mother_list: expect.any(Array)
    });
    expect(night.json().api_data.api_hougeki.api_sp_list).toHaveLength(night.json().api_data.api_hougeki.api_df_list.length);
    expect(result.json().api_data).toMatchObject({
      api_win_rank: expect.stringMatching(/[SABC]/),
      api_mvp: expect.any(Number),
      api_get_exp: expect.any(Number),
      api_get_ship: expect.any(Object)
    });
    expect(repeat.json().api_data.api_win_rank).toBe(result.json().api_data.api_win_rank);
    expect(afterRepeat.materials).toEqual(afterFirst.materials);
    for (const ship of afterRepeat.ships.slice(0, 2)) {
      expect(ship.hp).toBeGreaterThanOrEqual(1);
      expect(ship.hp).toBeLessThanOrEqual(ship.maxHp);
      expect(ship.fuel).toBeLessThanOrEqual(ship.maxFuel);
      expect(ship.ammo).toBeLessThanOrEqual(ship.maxAmmo);
    }
    expect((afterRepeat.sortieSession?.state as any).lastBattle.resultClaimed).toBe(true);
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
