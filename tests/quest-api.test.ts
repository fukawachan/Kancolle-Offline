import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { buildApp } from "../src/server/app.js";
import { createStateStore, type StateStore } from "../src/state/store.js";

const API_TOKEN = "test-api-token-0000000000000002";

describe("quest api", () => {
  let tempDir: string;
  let store: StateStore;
  let app: Awaited<ReturnType<typeof buildApp>>;

  beforeEach(async () => {
    tempDir = await mkdtemp(path.join(tmpdir(), "kancolle-quest-api-"));
    store = createStateStore({ databasePath: path.join(tempDir, "save.sqlite") });
    store.registerAccount(15);
    app = await buildApp({
      cacheDir: path.resolve("cache"),
      stateStore: store,
      unknownLogPath: path.join(tempDir, "unknown.jsonl"),
      apiToken: API_TOKEN
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
        {
          api_token: API_TOKEN,
          ...Object.fromEntries(Object.entries(payload).map(([key, value]) => [key, String(value)]))
        }
      ).toString(),
      headers: { "content-type": "application/x-www-form-urlencoded" }
    });
  }

  it("serves only unlocked quests by client period tabs and advertises the five-quest cap", async () => {
    const start2 = (await post("api_start2/getData")).json().api_data;
    const questCap = start2.api_mst_const.api_parallel_quest_max.api_int_value;
    expect(questCap).toBe(5);

    const port = (await post("api_port/port")).json().api_data;
    expect(port.api_parallel_quest_count).toBe(questCap);

    const page = (await post("api_get_member/questlist", { api_tab_id: 0 })).json().api_data;
    expect(page.api_count).toBeGreaterThan(5);
    expect(page.api_count).toBeLessThan(446);
    expect(page.api_page_count).toBe(Math.ceil(page.api_count / 5));
    expect(page.api_disp_page).toBe(1);
    expect(page.api_completed_kind).toEqual(expect.any(Number));
    expect(page.api_c_list).toEqual(expect.any(Array));
    expect(page.api_exec_count).toBe(0);
    expect(page.api_list.length).toBe(page.api_count);
    expect(page.api_list[0]).toMatchObject({
      api_no: 101,
      api_title: "はじめての「編成」！",
      api_detail: "２隻以上の艦で構成される「艦隊」を編成せよ！",
      api_get_material: [20, 20, 0, 0],
      api_state: 1
    });
    expect(page.api_list.map((quest: any) => quest.api_no)).toContain(101);
    expect(page.api_list.map((quest: any) => quest.api_no)).not.toContain(102);

    const secondPage = (await post("api_get_member/questlist", { api_tab_id: 0, api_pageno: 2 })).json().api_data;
    expect(secondPage.api_disp_page).toBe(2);
    expect(secondPage.api_list).toHaveLength(5);
    expect(secondPage.api_list.map((quest: any) => quest.api_no)).toEqual(page.api_list.slice(5, 10).map((quest: any) => quest.api_no));

    const tabs = [
      { tabId: 1, types: [2, 4, 5] },
      { tabId: 2, types: [3] },
      { tabId: 3, types: [6] },
      { tabId: 4, types: [7] },
      { tabId: 5, types: [1] }
    ];
    for (const { tabId, types } of tabs) {
      const tab = (await post("api_get_member/questlist", { api_tab_id: tabId })).json().api_data;
      const expectedIds = page.api_list
        .filter((quest: any) => types.includes(quest.api_type))
        .map((quest: any) => quest.api_no);
      expect(tab.api_count).toBe(expectedIds.length);
      expect(tab.api_list).toHaveLength(expectedIds.length);
      expect(tab.api_list.every((quest: any) => types.includes(quest.api_type))).toBe(true);
      expect(tab.api_list.map((quest: any) => quest.api_no)).toEqual(expectedIds);
    }
  });

  it("rejects a sixth active quest and returns the real active count", async () => {
    const start2 = (await post("api_start2/getData")).json().api_data;
    const questCap = start2.api_mst_const.api_parallel_quest_max.api_int_value;
    const visible = (await post("api_get_member/questlist", { api_tab_id: 0 })).json().api_data.api_list;
    const questIds = visible.slice(0, questCap + 1).map((quest: any) => quest.api_no);
    expect(questIds).toHaveLength(6);

    for (const questId of questIds.slice(0, questCap)) {
      const started = await post("api_req_quest/start", { api_quest_id: questId });
      expect(started.json().api_result).toBe(1);
    }
    const rejected = await post("api_req_quest/start", { api_quest_id: questIds[questCap] });
    expect(rejected.json()).toMatchObject({ api_result: 400 });

    const port = (await post("api_port/port")).json().api_data;
    const list = (await post("api_get_member/questlist", { api_tab_id: 0 })).json().api_data;

    expect(port.api_parallel_quest_count).toBe(questCap);
    expect(list.api_exec_count).toBe(questCap);

    const stopped = await post("api_req_quest/stop", { api_quest_id: questIds[0] });
    expect(stopped.json().api_result).toBe(1);
    const admitted = await post("api_req_quest/start", { api_quest_id: questIds[questCap] });
    expect(admitted.json().api_result).toBe(1);
    expect((await post("api_port/port")).json().api_data.api_parallel_quest_count).toBe(questCap);
    expect((await post("api_get_member/questlist", { api_tab_id: 0 })).json().api_data.api_exec_count).toBe(questCap);
  });

  it("serves accepted quests in the client active quest tab", async () => {
    const visible = (await post("api_get_member/questlist", { api_tab_id: 0 })).json().api_data.api_list;
    const questIds = visible.slice(0, 3).map((quest: any) => quest.api_no);
    for (const questId of questIds) {
      const started = await post("api_req_quest/start", { api_quest_id: questId });
      expect(started.json().api_result).toBe(1);
    }

    const activeTab = (await post("api_get_member/questlist", { api_tab_id: 9 })).json().api_data;
    const activeQuestIds = activeTab.api_list.map((quest: any) => quest.api_no);

    expect(activeTab.api_count).toBe(questIds.length);
    expect(activeTab.api_exec_count).toBe(questIds.length);
    expect(activeQuestIds).toEqual(questIds);
    expect(activeTab.api_list.every((quest: any) => quest.api_state === 2 || quest.api_state === 3)).toBe(true);
  });

  it("keeps prerequisite quests hidden and unstartable until every prerequisite is complete", async () => {
    const before = (await post("api_get_member/questlist", { api_tab_id: 0 })).json().api_data;
    expect(before.api_list.map((quest: any) => quest.api_no)).not.toContain(405);
    expect((await post("api_req_quest/start", { api_quest_id: 405 })).json()).toMatchObject({ api_result: 400 });

    store.setQuestState(127, 0, 1);

    const after = (await post("api_get_member/questlist", { api_tab_id: 0 })).json().api_data;
    expect(after.api_list.map((quest: any) => quest.api_no)).toContain(405);
    expect((await post("api_req_quest/start", { api_quest_id: 405 })).json()).toMatchObject({ api_result: 1 });
  });

  it("evaluates A01 from the current fleet, grants client-compatible rewards once, and keeps A02 visible", async () => {
    const before = store.getSave();
    const shirayukiBefore = before.ships.filter((ship) => ship.masterId === 10).length;

    await post("api_req_quest/start", { api_quest_id: 101 });

    const activeList = (await post("api_get_member/questlist", { api_tab_id: 5 })).json().api_data;
    expect(activeList.api_list.find((quest: any) => quest.api_no === 101)).toMatchObject({
      api_state: 3,
      api_progress_flag: 0
    });

    const clear = await post("api_req_quest/clearitemget", { api_quest_id: 101 });
    expect(clear.json()).toMatchObject({
      api_result: 1,
      api_data: {
        api_material: [20, 20, 0, 0],
        api_bounus: expect.arrayContaining([
          expect.objectContaining({
            api_type: 0xb,
            api_count: 1,
            api_item: expect.objectContaining({ api_ship_id: 10 })
          })
        ])
      }
    });
    for (const bonus of clear.json().api_data.api_bounus) {
      expect(typeof bonus.api_type).toBe("number");
      expect(typeof bonus.api_count).toBe("number");
    }

    const after = store.getSave();
    expect(after.materials.fuel).toBe(before.materials.fuel + 20);
    expect(after.materials.ammo).toBe(before.materials.ammo + 20);
    expect(after.ships.filter((ship) => ship.masterId === 10)).toHaveLength(shirayukiBefore + 1);

    const nextList = (await post("api_get_member/questlist", { api_tab_id: 5 })).json().api_data;
    expect(nextList.api_c_list).toEqual(expect.arrayContaining([101]));
    expect(nextList.api_list.find((quest: any) => quest.api_no === 102)).toMatchObject({
      api_title: "「駆逐隊」を編成せよ！",
      api_state: 1
    });

    const duplicate = await post("api_req_quest/clearitemget", { api_quest_id: 101 });
    expect(duplicate.json()).toMatchObject({ api_result: 400 });
  });

  it("serializes material quest bonuses with numeric client payloads", async () => {
    store.setQuestState(101, 0, 1);
    store.changeDeckShip(1, 2, 3);
    store.changeDeckShip(1, 3, 4);
    const before = store.getSave();

    const started = await post("api_req_quest/start", { api_quest_id: 102 });
    expect(started.json().api_result).toBe(1);

    const clear = await post("api_req_quest/clearitemget", { api_quest_id: 102 });
    expect(clear.json()).toMatchObject({
      api_result: 1,
      api_data: {
        api_material: [30, 30, 30, 0],
        api_bounus: expect.arrayContaining([
          expect.objectContaining({
            api_type: 1,
            api_count: 1,
            api_item: expect.objectContaining({ api_id: 6, api_name: "高速建造材" })
          })
        ])
      }
    });
    for (const bonus of clear.json().api_data.api_bounus) {
      expect(typeof bonus.api_type).toBe("number");
      expect(typeof bonus.api_count).toBe("number");
    }

    const after = store.getSave();
    expect(after.materials.fuel).toBe(before.materials.fuel + 30);
    expect(after.materials.ammo).toBe(before.materials.ammo + 30);
    expect(after.materials.steel).toBe(before.materials.steel + 30);
    expect(after.materials.buildKit).toBe(before.materials.buildKit + 1);
  });

  it("consumes prepared equipment for exchange quests when claiming rewards", async () => {
    store.setQuestState(641, 0, 1);
    store.setQuestState(825, 0, 1);
    for (const masterId of [37, 37, 23, 23]) store.createSlotItem(masterId);

    const before = store.getSave();
    expect(before.slotItems.filter((item) => item.masterId === 37)).toHaveLength(2);
    expect(before.slotItems.filter((item) => item.masterId === 23)).toHaveLength(2);

    const started = await post("api_req_quest/start", { api_quest_id: 642 });
    expect(started.json().api_result).toBe(1);

    const clear = await post("api_req_quest/clearitemget", { api_quest_id: 642 });
    expect(clear.json()).toMatchObject({
      api_result: 1,
      api_data: {
        api_material: [0, 200, 0, 200],
        api_bounus: expect.arrayContaining([
          expect.objectContaining({
            api_type: 0xc,
            api_count: 1,
            api_item: expect.objectContaining({ api_id: 168, api_name: "九六式陸攻" })
          })
        ])
      }
    });
    for (const bonus of clear.json().api_data.api_bounus) {
      expect(typeof bonus.api_type).toBe("number");
      expect(typeof bonus.api_count).toBe("number");
    }

    const after = store.getSave();
    expect(after.slotItems.filter((item) => item.masterId === 37)).toHaveLength(0);
    expect(after.slotItems.filter((item) => item.masterId === 23)).toHaveLength(0);
    expect(after.slotItems.filter((item) => item.masterId === 168)).toHaveLength(1);
  });
});
