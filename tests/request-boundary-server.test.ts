import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { buildApp } from "../src/server/app.js";
import { createStateStore, type StateStore } from "../src/state/store.js";

describe("KCS API request boundary", () => {
  let tempDir: string;
  let store: StateStore;
  let app: Awaited<ReturnType<typeof buildApp>>;
  let unknownLogPath: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(path.join(tmpdir(), "kancolle-request-boundary-"));
    unknownLogPath = path.join(tempDir, "unknown.jsonl");
    store = createStateStore({ databasePath: path.join(tempDir, "save.sqlite") });
    store.registerAccount(15);
    app = await buildApp({
      cacheDir: path.resolve("cache"),
      stateStore: store,
      unknownLogPath
    });
  });

  afterEach(async () => {
    await app.close();
    store.close();
    await rm(tempDir, { recursive: true, force: true });
  });

  it("requires POST and the current login token without invoking a mutation", async () => {
    const loginA = await login("viewer-a");
    const tokenA = loginA.json().api_token as string;
    const shipCount = tableCount("ships");

    const valid = await post("api_start2/get_option_setting", tokenA);
    const missing = await post("api_start2/get_option_setting", "");
    const wrong = await post("api_start2/get_option_setting", "wrong-token-value");
    const missingDestroyId = await post("api_req_kousyou/destroyship", tokenA);
    const duplicateDestroyId = await post("api_req_kousyou/destroyship", tokenA, { api_ship_id: "1,1" });
    const wrongMethod = await app.inject({
      method: "GET",
      url: `/kcsapi/api_req_kousyou/destroyship?api_token=${encodeURIComponent(tokenA)}&api_ship_id=1`
    });

    expect(valid.statusCode).toBe(200);
    expect(valid.json().api_result).toBe(1);
    expect(missing.statusCode).toBe(401);
    expect(wrong.statusCode).toBe(401);
    expect(missingDestroyId.statusCode).toBe(400);
    expect(duplicateDestroyId.statusCode).toBe(400);
    expect(wrongMethod.statusCode).toBe(405);
    expect(tableCount("ships")).toBe(shipCount);

    const loginB = await login("viewer-a");
    const tokenB = loginB.json().api_token as string;
    expect(tokenB).not.toBe(tokenA);
    expect((await post("api_start2/get_option_setting", tokenA)).statusCode).toBe(401);
    expect((await post("api_start2/get_option_setting", tokenB)).json().api_result).toBe(1);
  });

  it("redacts session credentials from unknown-request logs", async () => {
    const token = (await login("viewer-log")).json().api_token as string;
    const response = await post("api_missing/private", token, { api_id: "42" });
    const log = await readFile(unknownLogPath, "utf8");

    expect(response.json().api_result).toBe(404);
    expect(log).toContain('"api_id":"42"');
    expect(log).not.toContain(token);
    expect(log).not.toContain("api_token");
  });

  it("rejects replayed or unknown initial ships and commits a valid claim only once", async () => {
    const token = (await login("viewer-initial-ship")).json().api_token as string;
    const initialCount = tableCount("ships");
    expect((await post("api_req_init/firstship", token, { api_ship_id: "9" })).json()).toMatchObject({ api_result: 400 });
    expect((await post("api_req_init/firstship", token, { api_ship_id: "999999" })).json()).toMatchObject({ api_result: 400 });
    expect(tableCount("ships")).toBe(initialCount);

    store.db.prepare("UPDATE decks SET ship_ids_json = ?").run(JSON.stringify([-1, -1, -1, -1, -1, -1]));
    store.db.prepare("DELETE FROM ships").run();
    store.db.prepare("UPDATE players SET initial_ship_claimed = 0 WHERE id = 1").run();

    const claimed = await post("api_req_init/firstship", token, { api_ship_id: "9" });
    expect(claimed.json()).toMatchObject({
      api_result: 1,
      api_data: { api_ship: { api_ship_id: 9 } }
    });
    expect((await post("api_req_init/firstship", token, { api_ship_id: "9" })).json()).toMatchObject({ api_result: 400 });
    expect(tableCount("ships")).toBe(1);
  });

  it("requires api_verno before either dock-opening command can consume a key", async () => {
    const token = (await login("viewer-dock-open")).json().api_token as string;
    store.setUseItemCount(49, 1);

    const missing = await post("api_req_nyukyo/open_new_dock", token);
    const blank = await post("api_req_kousyou/open_new_dock", token, { api_verno: "   " });

    expect(missing.statusCode).toBe(400);
    expect(missing.json()).toMatchObject({ api_result: 400 });
    expect(blank.statusCode).toBe(400);
    expect(blank.json()).toMatchObject({ api_result: 400 });
    expect(store.getSave().repairDocks.map((dock) => dock.id)).toEqual([1, 2]);
    expect(store.getSave().buildDocks.map((dock) => dock.id)).toEqual([1, 2]);
    expect(store.getSave().useItems.find((item) => item.id === 49)?.count).toBe(1);

    const valid = await post("api_req_nyukyo/open_new_dock", token, { api_verno: "1" });
    expect(valid.statusCode).toBe(200);
    expect(valid.json()).toMatchObject({ api_result: 1, api_data: { api_opened: 1 } });
    expect(store.getSave().repairDocks.map((dock) => dock.id)).toEqual([1, 2, 3]);
    expect(store.getSave().useItems.find((item) => item.id === 49)?.count).toBe(0);
  });

  function login(viewerId: string) {
    return app.inject({
      method: "GET",
      url: `/kcsapi/api_auth_member/dmmlogin/${viewerId}/1/123`
    });
  }

  function post(pathname: string, token: string, values: Record<string, string> = {}) {
    const body = new URLSearchParams({ ...values });
    if (token) body.set("api_token", token);
    return app.inject({
      method: "POST",
      url: `/kcsapi/${pathname}`,
      payload: body.toString(),
      headers: { "content-type": "application/x-www-form-urlencoded" }
    });
  }

  function tableCount(table: "ships") {
    const row = store.db.prepare(`SELECT COUNT(*) AS count FROM ${table}`).get() as { count: number };
    return Number(row.count);
  }
});
