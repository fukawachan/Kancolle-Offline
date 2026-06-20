import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { buildApp } from "../src/server/app.js";
import { createStateStore, type StateStore } from "../src/state/store.js";

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

  it("serves real questlist pages by tab while advertising an unlimited active quest cap", async () => {
    const start2 = (await post("api_start2/getData")).json().api_data;
    const questCap = start2.api_mst_const.api_parallel_quest_max.api_int_value;
    expect(questCap).toBeGreaterThan(5);

    const port = (await post("api_port/port")).json().api_data;
    expect(port.api_parallel_quest_count).toBe(questCap);

    const page = (await post("api_get_member/questlist", { api_tab_id: 0 })).json().api_data;
    expect(page.api_count).toBeGreaterThan(5);
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

    const secondPage = (await post("api_get_member/questlist", { api_tab_id: 0, api_pageno: 2 })).json().api_data;
    expect(secondPage.api_disp_page).toBe(2);
    expect(secondPage.api_list).toHaveLength(5);
    expect(secondPage.api_list.map((quest: any) => quest.api_no)).toEqual(page.api_list.slice(5, 10).map((quest: any) => quest.api_no));

    const compositionPage = (await post("api_get_member/questlist", { api_tab_id: 1 })).json().api_data;
    expect(compositionPage.api_count).toBe(1);
    expect(compositionPage.api_list.every((quest: any) => quest.api_category === 1)).toBe(true);

    const sortiePage = (await post("api_get_member/questlist", { api_tab_id: 2 })).json().api_data;
    expect(sortiePage.api_list.every((quest: any) => quest.api_category === 2)).toBe(true);
    expect(sortiePage.api_list.map((quest: any) => quest.api_no)).toContain(202);
  });

  it("allows more than five active quests and returns the real active count", async () => {
    const start2 = (await post("api_start2/getData")).json().api_data;
    const questCap = start2.api_mst_const.api_parallel_quest_max.api_int_value;
    for (const questId of [101, 202, 235, 301, 601, 701]) {
      const started = await post("api_req_quest/start", { api_quest_id: questId });
      expect(started.json().api_result).toBe(1);
    }

    const port = (await post("api_port/port")).json().api_data;
    const list = (await post("api_get_member/questlist", { api_tab_id: 0 })).json().api_data;

    expect(port.api_parallel_quest_count).toBe(questCap);
    expect(list.api_exec_count).toBe(6);

    const stopped = await post("api_req_quest/stop", { api_quest_id: 235 });
    expect(stopped.json().api_result).toBe(1);
    expect((await post("api_port/port")).json().api_data.api_parallel_quest_count).toBe(questCap);
  });

  it("evaluates A01 from the current fleet, grants rewards once, and unlocks A02", async () => {
    const before = store.getSave();
    const shirayukiBefore = before.ships.filter((ship) => ship.masterId === 10).length;

    await post("api_req_quest/start", { api_quest_id: 101 });

    const activeList = (await post("api_get_member/questlist", { api_tab_id: 1 })).json().api_data;
    expect(activeList.api_list.find((quest: any) => quest.api_no === 101)).toMatchObject({
      api_state: 3,
      api_progress_flag: 0
    });

    const clear = await post("api_req_quest/clearitemget", { api_quest_id: 101 });
    expect(clear.json()).toMatchObject({
      api_result: 1,
      api_data: {
        api_material: expect.any(Array),
        api_bounus: expect.arrayContaining([
          expect.objectContaining({
            api_type: "ship",
            api_item: expect.objectContaining({ api_ship_id: 10 })
          })
        ])
      }
    });

    const after = store.getSave();
    expect(after.materials.fuel).toBe(before.materials.fuel + 20);
    expect(after.materials.ammo).toBe(before.materials.ammo + 20);
    expect(after.ships.filter((ship) => ship.masterId === 10)).toHaveLength(shirayukiBefore + 1);

    const nextList = (await post("api_get_member/questlist", { api_tab_id: 1 })).json().api_data;
    expect(nextList.api_c_list).toEqual(expect.arrayContaining([101]));
    expect(nextList.api_list.find((quest: any) => quest.api_no === 102)).toMatchObject({
      api_title: "「駆逐隊」を編成せよ！",
      api_state: 1
    });

    const duplicate = await post("api_req_quest/clearitemget", { api_quest_id: 101 });
    expect(duplicate.json()).toMatchObject({ api_result: 400 });
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
        api_bounus: expect.arrayContaining([
          expect.objectContaining({
            api_type: "equipment",
            api_item: expect.objectContaining({ api_slotitem_id: 168 })
          })
        ])
      }
    });

    const after = store.getSave();
    expect(after.slotItems.filter((item) => item.masterId === 37)).toHaveLength(0);
    expect(after.slotItems.filter((item) => item.masterId === 23)).toHaveLength(0);
    expect(after.slotItems.filter((item) => item.masterId === 168)).toHaveLength(1);
  });
});
