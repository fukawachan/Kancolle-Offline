import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { shipTotalExpForLevel } from "../src/kcsapi/experience.js";
import { buildApp } from "../src/server/app.js";
import { createStateStore, type StateStore } from "../src/state/store.js";

describe("debug inventory controls", () => {
  let tempDir: string;
  let store: StateStore;
  let app: Awaited<ReturnType<typeof buildApp>>;

  beforeEach(async () => {
    tempDir = await mkdtemp(path.join(tmpdir(), "kancolle-debug-inventory-"));
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

  async function postKcs(pathname: string, payload: Record<string, string | number> = {}) {
    return app.inject({
      method: "POST",
      url: `/kcsapi/${pathname}`,
      payload: new URLSearchParams(
        Object.fromEntries(Object.entries(payload).map(([key, value]) => [key, String(value)]))
      ).toString(),
      headers: { "content-type": "application/x-www-form-urlencoded" }
    });
  }

  it("renders ship level controls and the items tab", async () => {
    const response = await app.inject({ method: "GET", url: "/debug" });

    expect(response.body).toContain('id="tab-items"');
    expect(response.body).toContain("Items");
    expect(response.body).toContain("setShipLevel");
    expect(response.body).toContain("/debug/api/useitems/set");
  });

  it("updates a ship level through the debug API", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/debug/api/ships/level",
      payload: { shipId: 1, level: 20 }
    });

    expect(response.json()).toMatchObject({
      api_result: 1,
      api_data: {
        ship: {
          api_id: 1,
          api_lv: 20,
          api_exp: [shipTotalExpForLevel(20), expect.any(Number), expect.any(Number)]
        },
        message: expect.stringContaining("Lv.20")
      }
    });
    expect(store.getSave().ships.find((ship) => ship.id === 1)).toMatchObject({
      level: 20,
      exp: shipTotalExpForLevel(20)
    });
  });

  it("lists editable use item masters with current counts", async () => {
    await app.inject({
      method: "POST",
      url: "/debug/api/useitems/set",
      payload: { itemId: 58, count: 2 }
    });

    const design = await app.inject({
      method: "GET",
      url: `/debug/api/useitems/masters?search=${encodeURIComponent("改装設計図")}`
    });
    const catapult = await app.inject({
      method: "GET",
      url: `/debug/api/useitems/masters?search=${encodeURIComponent("試製甲板カタパルト")}`
    });
    const report = await app.inject({
      method: "GET",
      url: `/debug/api/useitems/masters?search=${encodeURIComponent("戦闘詳報")}`
    });

    expect(design.json().api_data.items).toContainEqual(
      expect.objectContaining({ id: 58, name: "改装設計図", count: 2 })
    );
    expect(catapult.json().api_data.items).toContainEqual(
      expect.objectContaining({ id: 65, name: "試製甲板カタパルト", count: 0 })
    );
    expect(report.json().api_data.items).toContainEqual(
      expect.objectContaining({ id: 78, name: "戦闘詳報", count: 0 })
    );
  });

  it("sets use item counts through debug API and publishes them through kcsapi", async () => {
    const set = await app.inject({
      method: "POST",
      url: "/debug/api/useitems/set",
      payload: { itemId: 78, count: 4 }
    });
    const inventory = await app.inject({ method: "GET", url: "/debug/api/player/useitems" });
    const useitem = await postKcs("api_get_member/useitem");
    const requireInfo = await postKcs("api_get_member/require_info");

    expect(set.json()).toMatchObject({
      api_result: 1,
      api_data: {
        item: { id: 78, name: "戦闘詳報", count: 4 },
        message: expect.stringContaining("戦闘詳報")
      }
    });
    expect(inventory.json().api_data.commonItems).toContainEqual(
      expect.objectContaining({ id: 78, name: "戦闘詳報", count: 4 })
    );
    expect(useitem.json().api_data).toContainEqual({ api_id: 78, api_count: 4 });
    expect(requireInfo.json().api_data.api_useitem).toContainEqual({ api_id: 78, api_count: 4 });
  });

  it("can add a remodel blueprint through debug API and consume it during remodeling", async () => {
    const bismarckKai = store.createShip(172);
    store.db.prepare("UPDATE ships SET level = 50 WHERE id = ?").run(bismarckKai.id);
    store.db.prepare("UPDATE materials SET ammo = 10000, steel = 10000 WHERE player_id = 1").run();

    const blocked = await postKcs("api_req_kaisou/remodeling", { api_id: bismarckKai.id });
    expect(blocked.json()).toMatchObject({
      api_result: 1,
      api_data: { api_after_ship: null }
    });

    await app.inject({
      method: "POST",
      url: "/debug/api/useitems/set",
      payload: { itemId: 58, count: 1 }
    });
    const remodeled = await postKcs("api_req_kaisou/remodeling", { api_id: bismarckKai.id });

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
});
