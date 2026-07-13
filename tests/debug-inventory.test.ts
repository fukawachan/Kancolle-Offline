import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { shipTotalExpForLevel } from "../src/kcsapi/experience.js";
import { buildApp } from "../src/server/app.js";
import { createStateStore, type StateStore } from "../src/state/store.js";

const API_TOKEN = "test-api-token-0000000000000004";

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
      unknownLogPath: path.join(tempDir, "unknown.jsonl"),
      apiToken: API_TOKEN
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
        {
          api_token: API_TOKEN,
          ...Object.fromEntries(Object.entries(payload).map(([key, value]) => [key, String(value)]))
        }
      ).toString(),
      headers: { "content-type": "application/x-www-form-urlencoded" }
    });
  }

  it("renders ship level controls and the items tab", async () => {
    const response = await app.inject({ method: "GET", url: "/debug" });

    expect(response.body).not.toContain("&u8230");
    expect(response.body).not.toContain("&u88C5");
    expect(response.body).toContain('id="ship-type-filter"');
    expect(response.body).toContain('id="equip-type-filter"');
    expect(response.body).toContain('id="tab-items"');
    expect(response.body).toContain('id="tab-materials"');
    expect(response.body).toContain('id="material-fuel"');
    expect(response.body).toContain('id="material-ammo"');
    expect(response.body).toContain('id="material-steel"');
    expect(response.body).toContain('id="material-bauxite"');
    expect(response.body).toContain("Items");
    expect(response.body).toContain("Materials");
    expect(response.body).toContain("setShipLevel");
    expect(response.body).toContain("/debug/api/useitems/set");
    expect(response.body).toContain("/debug/api/materials/set");
  });

  it("renders scroll retention wiring for all debug lists", async () => {
    const response = await app.inject({ method: "GET", url: "/debug" });

    expect(response.body).toContain("function rememberListScroll(list)");
    expect(response.body).toContain("requestAnimationFrame");
    expect(response.body).toContain("Math.max(0, list.scrollHeight - list.clientHeight)");
    expect(response.body.match(/const restoreScroll = rememberListScroll\(list\);/g) ?? []).toHaveLength(8);
  });

  it("lists owned ships with master display names", async () => {
    const response = await app.inject({ method: "GET", url: "/debug/api/player/ships" });
    const ships = response.json().api_data;

    expect(ships).toContainEqual(
      expect.objectContaining({
        api_id: 1,
        api_ship_id: 9,
        name: "吹雪",
        yomi: "Fubuki",
        stype: 2,
        stypeName: "駆逐艦"
      })
    );
  });

  it("lists owned equipment with master display names", async () => {
    const response = await app.inject({ method: "GET", url: "/debug/api/player/equipment" });
    const items = response.json().api_data;

    expect(items).toContainEqual(
      expect.objectContaining({
        api_id: 1,
        api_slotitem_id: 1,
        name: "12cm単装砲",
        yomi: "12cm Single Gun Mount",
        type: 1,
        typeName: "小口径主砲"
      })
    );
  });

  it("filters ship masters by ship type", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/debug/api/ships/masters?stype=2&limit=100"
    });
    const data = response.json().api_data;

    expect(data.total).toBeGreaterThan(0);
    expect(data.items.length).toBeGreaterThan(0);
    expect(data.items.every((ship: { stype: number }) => ship.stype === 2)).toBe(true);
    expect(data.items).toContainEqual(expect.objectContaining({ stype: 2, stypeName: "駆逐艦" }));
  });

  it("filters equipment masters by equipment type with real type names", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/debug/api/equipment/masters?type=6&limit=100"
    });
    const data = response.json().api_data;

    expect(data.total).toBeGreaterThan(0);
    expect(data.items.length).toBeGreaterThan(0);
    expect(data.items.every((item: { type: number }) => item.type === 6)).toBe(true);
    expect(data.items).toContainEqual(expect.objectContaining({ type: 6, typeName: "艦上戦闘機" }));
  });

  it("combines search text with master type filters", async () => {
    const ships = await app.inject({
      method: "GET",
      url: `/debug/api/ships/masters?stype=2&search=${encodeURIComponent("吹雪")}`
    });
    const equipment = await app.inject({
      method: "GET",
      url: `/debug/api/equipment/masters?type=6&search=${encodeURIComponent("零式艦戦")}`
    });

    expect(ships.json().api_data.items).toContainEqual(
      expect.objectContaining({ name: expect.stringContaining("吹雪"), stype: 2 })
    );
    expect(equipment.json().api_data.items).toContainEqual(
      expect.objectContaining({ name: expect.stringContaining("零式艦戦"), type: 6 })
    );
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

  it("sets basic material counts through debug API and publishes them through kcsapi", async () => {
    const set = await app.inject({
      method: "POST",
      url: "/debug/api/materials/set",
      payload: { fuel: 12345, ammo: 23456, steel: 34567, bauxite: 45678 }
    });
    const inventory = await app.inject({ method: "GET", url: "/debug/api/player/materials" });
    const material = await postKcs("api_get_member/material");

    expect(set.json()).toMatchObject({
      api_result: 1,
      api_data: {
        materials: { fuel: 12345, ammo: 23456, steel: 34567, bauxite: 45678 },
        message: "Updated basic materials"
      }
    });
    expect(inventory.json().api_data).toEqual({ fuel: 12345, ammo: 23456, steel: 34567, bauxite: 45678 });
    expect(material.json().api_data.slice(0, 4)).toMatchObject([
      { api_id: 1, api_value: 12345 },
      { api_id: 2, api_value: 23456 },
      { api_id: 3, api_value: 34567 },
      { api_id: 4, api_value: 45678 }
    ]);
    expect(store.getSave().materials).toMatchObject({
      fuel: 12345,
      ammo: 23456,
      steel: 34567,
      bauxite: 45678,
      buildKit: 10,
      repairKit: 10,
      devmat: 50,
      screw: 5
    });
  });

  it("rejects invalid basic material counts", async () => {
    const before = store.getSave().materials;
    const set = await app.inject({
      method: "POST",
      url: "/debug/api/materials/set",
      payload: { fuel: 1, ammo: -1, steel: 3.5, bauxite: "lots" }
    });

    expect(set.json()).toMatchObject({
      api_result: 400,
      api_result_msg: expect.stringContaining("non-negative integer")
    });
    expect(store.getSave().materials).toMatchObject(before);
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
