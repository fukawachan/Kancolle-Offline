import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { buildApp } from "../src/server/app.js";
import { createStateStore, type StateStore } from "../src/state/store.js";

describe("expedition debug controls", () => {
  let tempDir: string;
  let store: StateStore;
  let app: Awaited<ReturnType<typeof buildApp>>;

  beforeEach(async () => {
    tempDir = await mkdtemp(path.join(tmpdir(), "kancolle-debug-expedition-"));
    store = createStateStore({ databasePath: path.join(tempDir, "save.sqlite") });
    store.registerAccount(15);
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

  it("renders the expedition tab and controls", async () => {
    const response = await app.inject({ method: "GET", url: "/debug" });
    expect(response.body).toContain('id="tab-expeditions"');
    expect(response.body).toContain("Unlock all");
    expect(response.body).toContain("Force complete");
  });

  it("returns status and applies expedition debug mutations", async () => {
    const before = await app.inject({ method: "GET", url: "/debug/api/expeditions/status" });
    expect(before.json().api_data).toMatchObject({
      missions: expect.any(Array),
      runs: [],
      settings: { fixedSeed: null, clockOffsetMs: 0, unlockAll: 0 },
    });

    const unlocked = await app.inject({
      method: "POST",
      url: "/debug/api/expeditions/unlock-all",
      payload: { enabled: true },
    });
    expect(unlocked.json().api_data.settings.unlockAll).toBe(1);

    const configured = await app.inject({
      method: "POST",
      url: "/debug/api/expeditions/configure",
      payload: { fixedSeed: 12345, clockOffsetMs: 60_000 },
    });
    expect(configured.json().api_data.settings).toMatchObject({
      fixedSeed: 12345,
      clockOffsetMs: 60_000,
    });
  });
});
