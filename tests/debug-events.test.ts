import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { buildApp } from "../src/server/app.js";
import { createStateStore, type StateStore } from "../src/state/store.js";

describe("event debug controls", () => {
  let tempDir: string;
  let store: StateStore;
  let app: Awaited<ReturnType<typeof buildApp>>;

  beforeEach(async () => {
    tempDir = await mkdtemp(path.join(tmpdir(), "kancolle-debug-events-"));
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

  it("lists cache-backed event candidates and activates the 061 event pack", async () => {
    const before = await app.inject({ method: "GET", url: "/debug/api/events/status" });
    expect(before.statusCode).toBe(200);
    expect(before.json().api_data).toMatchObject({
      activeAreaId: null,
      candidates: expect.arrayContaining([
        expect.objectContaining({
          areaId: 61,
          cacheMaps: [1, 2, 3],
          hasEventPack: true,
          activatable: true
        })
      ])
    });

    const activated = await app.inject({
      method: "POST",
      url: "/debug/api/events/active",
      payload: { areaId: 61 }
    });
    expect(activated.statusCode).toBe(200);
    expect(activated.json().api_data).toMatchObject({
      activeAreaId: 61,
      event: expect.objectContaining({ areaId: 61, mapCount: 3 })
    });
    expect(store.getActiveEventAreaId()).toBe(61);

    const deactivated = await app.inject({
      method: "POST",
      url: "/debug/api/events/active",
      payload: { areaId: null }
    });
    expect(deactivated.statusCode).toBe(200);
    expect(deactivated.json().api_data.activeAreaId).toBeNull();
    expect(store.getActiveEventAreaId()).toBeNull();
  });

  it("resets only the selected event map progress", async () => {
    await app.inject({ method: "POST", url: "/debug/api/events/active", payload: { areaId: 61 } });
    store.db.prepare("UPDATE maps SET cleared = 1, gauge = 0, phase = 2 WHERE id = 611").run();

    const reset = await app.inject({
      method: "POST",
      url: "/debug/api/events/reset",
      payload: { areaId: 61 }
    });

    expect(reset.statusCode).toBe(200);
    expect(reset.json().api_data).toMatchObject({ areaId: 61, resetMaps: [611, 612, 613] });
    const map = store.getSave().maps.find((item) => item.id === 611);
    expect(map).toMatchObject({ cleared: 0, phase: 1 });
    expect(map?.gauge).toBeGreaterThan(0);
  });

  it("renders an Events tab in the debug panel", async () => {
    const response = await app.inject({ method: "GET", url: "/debug" });

    expect(response.statusCode).toBe(200);
    expect(response.body).toContain("tab-events");
    expect(response.body).toContain("/debug/api/events/status");
    expect(response.body).toContain("/debug/api/events/active");
  });
});
