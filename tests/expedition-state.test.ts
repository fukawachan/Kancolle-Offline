import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createStateStore, type StateStore } from "../src/state/store.js";

describe("persisted expedition lifecycle", () => {
  let tempDir: string;
  let databasePath: string;
  let store: StateStore;

  beforeEach(async () => {
    tempDir = await mkdtemp(path.join(tmpdir(), "kancolle-expedition-state-"));
    databasePath = path.join(tempDir, "save.sqlite");
    store = createStateStore({ databasePath });
    store.registerAccount(15);
    store.changeDeckShip(2, 0, 1);
    store.changeDeckShip(2, 1, 2);
  });

  afterEach(async () => {
    store.close();
    await rm(tempDir, { recursive: true, force: true });
  });

  it("migrates to schema v14 and seeds only the first expedition unlocked", () => {
    const version = store.db.prepare("SELECT version FROM schema_meta").get() as { version: number };
    const state = store.getMissionMemberState();
    const save = store.getSave();
    const pendingTable = store.db
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'pending_payitems'")
      .get();
    const presetSlotTable = store.db
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'preset_slots'")
      .get();

    expect(version.version).toBe(14);
    expect(save.player).toMatchObject({ maxChara: 300, maxSlotItem: 500 });
    expect(save.presetSlotSettings).toEqual({ maxNum: 4 });
    expect(pendingTable).toBeTruthy();
    expect(presetSlotTable).toBeTruthy();
    expect(state.api_list_items.find((item) => item.api_mission_id === 1)?.api_state).toBe(1);
    expect(state.api_list_items.find((item) => item.api_mission_id === 2)?.api_state).toBe(0);
  });

  it("migrates legacy placeholder furniture to valid six-slot defaults", () => {
    store.db.prepare("UPDATE furniture SET owned_json = ?, set_json = ?, coins = ? WHERE id = 1").run(
      JSON.stringify([1, 2, 3, 4, 5, 6]),
      JSON.stringify({ api_floor: 1, api_wall: 2, api_window: 3, api_chest: 4, api_desk: 5, api_object: 0 }),
      200
    );
    store.db.prepare("UPDATE schema_meta SET version = 8").run();
    store.close();

    store = createStateStore({ databasePath });
    const version = store.db.prepare("SELECT version FROM schema_meta").get() as { version: number };
    const save = store.getSave();

    expect(version.version).toBe(14);
    expect(save.furniture.owned).toEqual(expect.arrayContaining([1, 38, 72, 102, 133, 164]));
    expect(save.furniture.set).toEqual({
      api_floor: 1,
      api_wall: 38,
      api_window: 72,
      api_object: 102,
      api_chest: 133,
      api_desk: 164
    });
  });

  it("preserves v6 saves while clearing legacy placeholder mission state", () => {
    store.updateComment("keep this save");
    store.db.prepare("UPDATE decks SET mission_json = ? WHERE id = 2").run(
      JSON.stringify({ state: 2, missionId: 2, completeTime: 123 })
    );
    store.db.prepare("UPDATE schema_meta SET version = 6").run();
    store.close();

    store = createStateStore({ databasePath });
    expect(store.getSave().player.comment).toBe("keep this save");
    expect(store.getSave().decks[1].missionState).toEqual({
      state: 0,
      missionId: 0,
      completeTime: 0,
    });
    expect(store.getMissionMemberState().api_list_items[0]).toEqual({
      api_mission_id: 1,
      api_state: 1,
    });
  });

  it("backfills record expedition stats from v10 completed expedition progress", () => {
    store.db.prepare("UPDATE expedition_progress SET completed_count = ? WHERE mission_id = 1").run(2);
    store.db.prepare("DROP TABLE record_stats").run();
    store.db.prepare("UPDATE schema_meta SET version = 10").run();
    store.close();

    store = createStateStore({ databasePath });
    const version = store.db.prepare("SELECT version FROM schema_meta").get() as { version: number };
    const save = store.getSave();

    expect(version.version).toBe(14);
    expect(save.recordStats).toMatchObject({
      battleWin: 0,
      battleLose: 0,
      practiceWin: 0,
      practiceLose: 0,
      missionCount: 2,
      missionSuccess: 2,
    });
  });

  it("persists an active run and makes duplicate serial requests idempotent", () => {
    const first = store.startExpedition(2, 1, "same-request");
    const duplicate = store.startExpedition(2, 1, "same-request");

    expect(first.ok).toBe(true);
    expect(duplicate).toEqual(first);
    expect(store.getSave().decks[1].missionState).toMatchObject({
      state: 1,
      missionId: 1,
      completeTime: expect.any(Number),
    });

    store.close();
    store = createStateStore({ databasePath });
    expect(store.getSave().expeditionRuns[0]).toMatchObject({
      deckId: 2,
      missionId: 1,
      status: "active",
      serialCid: "same-request",
    });
  });

  it("settles rewards exactly once and unlocks the next expedition", () => {
    const before = store.getSave().materials.ammo;
    expect(store.startExpedition(2, 1, "claim-once").ok).toBe(true);
    store.forceCompleteExpedition(2);

    const first = store.claimExpedition(2);
    const afterFirst = store.getSave().materials.ammo;
    const duplicate = store.claimExpedition(2);
    const afterDuplicate = store.getSave().materials.ammo;

    expect(first.ok).toBe(true);
    expect(duplicate).toEqual(first);
    expect(afterFirst).toBeGreaterThan(before);
    expect(afterDuplicate).toBe(afterFirst);
    expect(store.getSave().recordStats).toMatchObject({
      missionCount: 1,
      missionSuccess: 1,
    });
    expect(store.getMissionMemberState().api_list_items.find((item) => item.api_mission_id === 2)?.api_state).toBe(1);
  });

  it("marks naturally completed expeditions as ready without settling rewards", () => {
    const before = store.getSave().materials.ammo;
    const started = store.startExpedition(2, 1, "natural-complete");
    if (!started.ok) throw new Error(started.error);

    store.setExpeditionClockOffset(started.run.completeAt - Date.now() + 1);
    const completed = store.getSave();

    expect(completed.decks[1].missionState).toEqual({
      state: 2,
      missionId: 1,
      completeTime: started.run.completeAt,
    });
    expect(completed.expeditionRuns[0]).toMatchObject({
      deckId: 2,
      missionId: 1,
      status: "active",
    });
    expect(completed.materials.ammo).toBe(before);
    expect(store.getSave().materials.ammo).toBe(before);

    const claimed = store.claimExpedition(2);
    expect(claimed.ok).toBe(true);
    const afterClaim = store.getSave().materials.ammo;
    const duplicate = store.claimExpedition(2);

    expect(afterClaim).toBeGreaterThan(before);
    expect(duplicate).toEqual(claimed);
    expect(store.getSave().materials.ammo).toBe(afterClaim);
  });

  it("keeps recalled fleet deck state ready while it is returning", () => {
    const started = store.startExpedition(2, 1, "returning-state");
    if (!started.ok) throw new Error(started.error);

    store.setExpeditionClockOffset(6 * 60_000);
    const recalled = store.recallExpedition(2);
    if (!recalled.ok) throw new Error(recalled.error);

    const save = store.getSave();
    expect(save.decks[1].missionState).toEqual({
      state: 2,
      missionId: 1,
      completeTime: recalled.completeAt,
    });
    expect(save.expeditionRuns[0]).toMatchObject({
      deckId: 2,
      missionId: 1,
      status: "returning",
    });
  });

  it("blocks mutations involving a fleet that is away", () => {
    store.db.prepare("UPDATE ships SET fuel = 1 WHERE id = 1").run();
    expect(store.startExpedition(2, 1, "locked-fleet").ok).toBe(true);

    expect(store.changeDeckShip(2, 0, -1)).toBeNull();
    expect(store.equipSlotItem(1, 0, 1)).toBeNull();
    store.supplyShips([1]);
    expect(store.getSave().ships.find((ship) => ship.id === 1)?.fuel).toBe(1);
    store.destroyShip([1]);
    expect(store.getSave().ships.some((ship) => ship.id === 1)).toBe(true);
    expect(store.startSortie(2, 1, 1)).toBeNull();
    expect(store.startRepair(1, 1, false)).toEqual({
      ok: false,
      error: "Ship is away on expedition",
    });
  });

  it("resets monthly expedition availability at the JST boundary", () => {
    store.unlockAllExpeditions(true);
    store.setExpeditionClockOffset(Date.UTC(2026, 5, 14, 2) - Date.now());
    expect(store.startExpedition(2, 103, "monthly").ok).toBe(true);
    store.forceCompleteExpedition(2);
    expect(store.claimExpedition(2).ok).toBe(true);
    expect(
      store.getMissionMemberState().api_list_items.find((item) => item.api_mission_id === 103)?.api_state
    ).toBe(2);

    store.setExpeditionClockOffset(Date.UTC(2026, 5, 15, 4) - Date.now());
    expect(
      store.getMissionMemberState().api_list_items.find((item) => item.api_mission_id === 103)?.api_state
    ).toBe(1);
  });

  it("returns recalled fleets without expedition rewards", () => {
    const beforeAmmo = store.getSave().materials.ammo;
    expect(store.startExpedition(2, 1, "recall").ok).toBe(true);
    store.setExpeditionClockOffset(6 * 60_000);
    const recalled = store.recallExpedition(2);
    expect(recalled.ok).toBe(true);
    store.forceCompleteExpedition(2);
    const claimed = store.claimExpedition(2);
    const duplicate = store.claimExpedition(2);

    expect(claimed.ok).toBe(true);
    if (claimed.ok) expect(claimed.result.recalled).toBe(true);
    expect(duplicate).toEqual(claimed);
    expect(store.getSave().materials.ammo).toBe(beforeAmmo);
    expect(store.getSave().recordStats).toMatchObject({
      missionCount: 1,
      missionSuccess: 0,
    });
  });
});
