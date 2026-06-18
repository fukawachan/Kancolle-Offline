import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { buildApp } from "../src/server/app.js";
import { createStateStore, type StateStore } from "../src/state/store.js";

describe("expedition kcsapi contract", () => {
  let tempDir: string;
  let store: StateStore;
  let app: Awaited<ReturnType<typeof buildApp>>;

  beforeEach(async () => {
    tempDir = await mkdtemp(path.join(tmpdir(), "kancolle-expedition-api-"));
    store = createStateStore({ databasePath: path.join(tempDir, "save.sqlite") });
    store.registerAccount(15);
    store.changeDeckShip(2, 0, 1);
    store.changeDeckShip(2, 1, 2);
    app = await buildApp({
      cacheDir: path.resolve("cache"),
      stateStore: store,
      unknownLogPath: path.join(tempDir, "unknown.jsonl"),
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
      headers: { "content-type": "application/x-www-form-urlencoded" },
    });
  }

  it("returns the member mission shape consumed by the cached client", async () => {
    const response = await post("api_get_member/mission");
    const data = response.json().api_data;

    expect(data).toEqual({
      api_list_items: expect.any(Array),
      api_limit_time: [expect.any(Number)],
    });
    expect(data.api_list_items).toHaveLength(63);
    expect(data.api_list_items[0]).toEqual({ api_mission_id: 1, api_state: 1 });
  });

  it("starts and settles a mission with the complete result model", async () => {
    const started = await post("api_req_mission/start", {
      api_deck_id: 2,
      api_mission_id: 1,
      api_serial_cid: "api-contract",
    });
    expect(started.json().api_data).toMatchObject({
      api_complatetime: expect.any(Number),
      api_complatetime_str: expect.any(String),
      api_expired_flag: 0,
    });

    store.forceCompleteExpedition(2);
    const result = await post("api_req_mission/result", { api_deck_id: 2 });
    expect(result.json().api_data).toMatchObject({
      api_quest_name: "練習航海",
      api_clear_result: expect.any(Number),
      api_get_exp: expect.any(Number),
      api_member_lv: expect.any(Number),
      api_member_exp: expect.any(Number),
      api_get_material: expect.arrayContaining([expect.any(Number)]),
      api_ship_id: [1, 2],
      api_useitem_flag: expect.any(Array),
      api_get_item1: expect.anything(),
      api_get_item2: expect.anything(),
    });
  });

  it("returns the raw mission array expected by return_instruction", async () => {
    await post("api_req_mission/start", {
      api_deck_id: 2,
      api_mission_id: 1,
      api_serial_cid: "recall-contract",
    });
    const response = await post("api_req_mission/return_instruction", { api_deck_id: 2 });

    expect(response.json().api_data).toEqual({
      api_mission: [2, 1, expect.any(Number), 0],
    });
  });

  it("keeps expedition fleet ship models available during scoped ship_deck refreshes", async () => {
    await post("api_req_mission/start", {
      api_deck_id: 2,
      api_mission_id: 1,
      api_serial_cid: "supply-scene-refresh",
    });

    const scoped = (await post("api_get_member/ship_deck", { api_deck_rid: "1" })).json().api_data;
    const defaultDecks = (await post("api_get_member/ship_deck")).json().api_data;

    expect(scoped.api_deck_data.map((deck: any) => deck.api_id)).toEqual([1]);
    expect(scoped.api_ship_data.map((ship: any) => ship.api_id)).toEqual(expect.arrayContaining([1, 2]));
    expect(defaultDecks.api_deck_data.map((deck: any) => deck.api_id)).toEqual([1, 2, 3, 4]);
    expect(defaultDecks.api_ship_data.map((ship: any) => ship.api_id)).toEqual(expect.arrayContaining([1, 2]));
  });

  it("publishes generic expedition reward inventory through useitem", async () => {
    store.db.prepare("INSERT INTO use_items (id, count) VALUES (59, 2)").run();
    const response = await post("api_get_member/useitem");

    expect(response.json().api_data).toContainEqual({ api_id: 59, api_count: 2 });
  });
});
