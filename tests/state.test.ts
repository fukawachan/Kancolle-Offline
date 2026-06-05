import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createPracticeBattle } from "../src/kcsapi/battle.js";
import { createStateStore, type StateStore } from "../src/state/store.js";

describe("SQLite state store", () => {
  let tempDir: string;
  let databasePath: string;
  let store: StateStore;

  beforeEach(async () => {
    tempDir = await mkdtemp(path.join(tmpdir(), "kancolle-state-"));
    databasePath = path.join(tempDir, "save.sqlite");
    store = createStateStore({ databasePath });
  });

  afterEach(async () => {
    store.close();
    await rm(tempDir, { recursive: true, force: true });
  });

  it("starts without a registered local account", () => {
    expect(store.hasAccount()).toBe(false);
    expect(store.getWorldId()).toBe(0);
    expect(() => store.getSave()).toThrow(/not been registered/i);
  });

  it("registers the single local account and seeds a reusable local save", () => {
    const save = store.registerAccount(15);

    expect(store.hasAccount()).toBe(true);
    expect(store.getWorldId()).toBe(15);
    expect(save.player).toMatchObject({
      id: 1,
      worldId: 15,
      nickname: "Local Admiral",
      level: expect.any(Number)
    });
    expect(save.materials.fuel).toBeGreaterThan(0);
    expect(save.decks).toHaveLength(4);
    expect(save.ships.length).toBeGreaterThan(0);
    expect(save.slotItems.length).toBeGreaterThan(0);
    expect(save.ships.map((ship) => ship.masterId)).toEqual([9, 10, 1, 2]);
  });

  it("resets legacy saves that used ship master ids mismatched with cached art", () => {
    store.registerAccount(15);
    const legacyShipIds = [6, 7, 9, 45, 89];
    for (let index = 0; index < legacyShipIds.length; index += 1) {
      if (index >= 4) {
        store.createShip(legacyShipIds[index]);
      } else {
        store.db.prepare("UPDATE ships SET master_id = ? WHERE id = ?").run(legacyShipIds[index], index + 1);
      }
    }
    store.updateComment("legacy save should reset");
    store.db.prepare("UPDATE schema_meta SET version = 2").run();
    store.close();

    store = createStateStore({ databasePath });

    expect(store.hasAccount()).toBe(false);
    const save = store.registerAccount(15);
    expect(save.player.comment).toBe("Local offline save");
    expect(save.ships.map((ship) => ship.masterId)).toEqual([9, 10, 1, 2]);
  });

  it("keeps version 3 saves while migrating battle settlement state", () => {
    store.registerAccount(15);
    store.updateComment("v3 save should migrate");
    store.db.prepare("UPDATE schema_meta SET version = 3").run();
    store.close();

    store = createStateStore({ databasePath });
    const save = store.getSave();

    expect(store.hasAccount()).toBe(true);
    expect(save.player.comment).toBe("v3 save should migrate");
    expect(save.player.exp).toBe(0);
  });

  it("persists mutations across store instances", () => {
    store.registerAccount(15);
    store.updateComment("persistent local save");
    store.renameDeck(1, "Persisted Fleet");
    store.close();

    store = createStateStore({ databasePath });
    const save = store.getSave();

    expect(store.hasAccount()).toBe(true);
    expect(store.getWorldId()).toBe(15);
    expect(save.player.comment).toBe("persistent local save");
    expect(save.decks[0].name).toBe("Persisted Fleet");
    expect(save.ships.map((ship) => ship.masterId)).toEqual([9, 10, 1, 2]);
  });

  it("applies material and inventory changes atomically", () => {
    store.registerAccount(15);
    const before = store.getSave();

    const created = store.createSlotItem(2);
    store.consumeMaterials({ fuel: 10, ammo: 10, steel: 10, bauxite: 10, devmat: 1 });
    store.equipSlotItem(1, 0, created.id);

    const after = store.getSave();

    expect(after.materials.fuel).toBe(before.materials.fuel - 10);
    expect(after.materials.devmat).toBe(before.materials.devmat - 1);
    expect(after.slotItems.find((item) => item.id === created.id)).toBeTruthy();
    expect(after.ships.find((ship) => ship.id === 1)?.slotIds[0]).toBe(created.id);
  });

  it("does not persist or repair practice battle damage", () => {
    store.registerAccount(15);
    store.db.prepare("UPDATE ships SET hp = ? WHERE id = ?").run(5, 1);
    const before = store.getSave().ships.find((ship) => ship.id === 1)!;
    const battle = createPracticeBattle(store.getSave(), { practiceEnemyId: 1, formation: 1 });

    store.recordPracticeBattle(battle.record as unknown as Record<string, unknown>);
    store.applyPracticeBattleResult();

    const after = store.getSave().ships.find((ship) => ship.id === 1)!;
    expect(after.hp).toBe(before.hp);
    expect(after.hp).toBeLessThan(after.maxHp);
  });
});
