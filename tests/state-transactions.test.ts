import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createSortieBattle } from "../src/kcsapi/battle.js";
import {
  createStateStore,
  type StateFaultPoint,
  type StateStore
} from "../src/state/store.js";

describe("transaction crash points", () => {
  let tempDir: string;
  let store: StateStore;
  let armed: StateFaultPoint | null;

  beforeEach(async () => {
    tempDir = await mkdtemp(path.join(tmpdir(), "kancolle-transactions-"));
    armed = null;
    store = createStateStore({
      databasePath: path.join(tempDir, "save.sqlite"),
      faultInjector: (point) => {
        if (point === armed) throw new Error(`injected crash at ${point}`);
      }
    });
    store.registerAccount(15);
  });

  afterEach(async () => {
    store.close();
    await rm(tempDir, { recursive: true, force: true });
  });

  it("rolls back byte-identically after every explicit settlement step", () => {
    const settledAt = Date.UTC(2026, 6, 6, 5, 0, 0);
    store.db.prepare("UPDATE ships SET hp = 1 WHERE id = 1").run();
    store.db.prepare(
      "UPDATE repair_docks SET ship_id = 1, complete_time = ?, state = 1 WHERE id = 1"
    ).run(settledAt - 1);
    store.db.prepare(`
      UPDATE materials
      SET fuel = 100, ammo = 100, steel = 100, bauxite = 100, last_recovery_at = ?
      WHERE player_id = 1
    `).run(settledAt - 180_000);

    const points: StateFaultPoint[] = [
      "settle.after-repairs",
      "settle.after-builds",
      "settle.after-expeditions",
      "settle.after-materials",
      "settle.after-air-bases",
      "settle.after-quests",
      "settle.after-ranking",
      "settle.after-maps",
      "settle.after-relocations"
    ];
    const before = store.db.serialize();
    for (const point of points) {
      armed = point;
      expect(() => store.settle(settledAt)).toThrow(`injected crash at ${point}`);
      expect(store.db.serialize(), point).toEqual(before);
    }

    armed = null;
    store.settle(settledAt);
    expect(store.getSave().repairDocks[0]).toMatchObject({ shipId: 0, state: 0 });
    expect(store.getSave().materials.fuel).toBe(103);
  });

  it("keeps battle settlement and its quest event in one transaction", () => {
    store.db.prepare("UPDATE maps SET unlocked = 1").run();
    expect(store.startSortie(1, 1, 1)).not.toBeNull();
    const battle = createSortieBattle(store.getSave(), { formation: 1 });
    store.recordSortieBattle(battle.record as unknown as Record<string, unknown>);
    const before = store.db.serialize();

    armed = "battle.before-quest-event";
    expect(() => store.applySortieBattleResult()).toThrow(/battle\.before-quest-event/);
    expect(store.db.serialize()).toEqual(before);

    armed = null;
    expect(store.applySortieBattleResult()).toMatchObject({ applied: true });
  });

  it("consumes submarine-attack item 95 and extra ammo in the battle transaction", () => {
    expect(store.startSortie(1, 1, 1)).not.toBeNull();
    expect(store.setUseItemCount(95, 1)).toMatchObject({ ok: true });
    const battle = createSortieBattle(store.getSave(), { formation: 1 });
    battle.record.specialAttacks = [{
      type: 300,
      phase: "day",
      participantShipIds: [1],
      participantMasterIds: [1],
      useItemId: 95,
      useItemAmount: 1,
      extraAmmoFraction: 0.1
    }, {
      type: 300,
      phase: "night",
      participantShipIds: [1],
      participantMasterIds: [1],
      extraAmmoFraction: 0
    }];
    store.recordSortieBattle(battle.record as unknown as Record<string, unknown>);

    expect(store.applySortieBattleResult()).toMatchObject({ applied: true });
    const save = store.getSave();
    expect(save.useItems.find((item) => item.id === 95)?.count ?? 0).toBe(0);
    expect(save.ships.find((ship) => ship.id === 1)?.ammo).toBe(14);
  });

  it("mirrors combined-fleet special usage into the active sortie state", () => {
    expect(store.startSortie(1, 1, 1)).not.toBeNull();
    store.recordCombinedBattle({
      mode: "combined",
      specialAttackUsage: [{ type: 400, count: 1 }]
    });
    expect(store.getSave().sortieSession?.state.specialAttackUsage).toEqual([{ type: 400, count: 1 }]);
  });

  it("keeps expedition rewards and their quest event in one transaction", () => {
    const first = store.createShip(9);
    const second = store.createShip(10);
    store.changeDeckShip(2, 0, first.id);
    store.changeDeckShip(2, 1, second.id);
    expect(store.startExpedition(2, 1, "transaction-crash")).toMatchObject({ ok: true });
    store.forceCompleteExpedition(2);
    const before = store.db.serialize();

    armed = "expedition.before-quest-event";
    expect(() => store.claimExpedition(2)).toThrow(/expedition\.before-quest-event/);
    expect(store.db.serialize()).toEqual(before);

    armed = null;
    expect(store.claimExpedition(2)).toMatchObject({ ok: true });
  });

  it("keeps improvement consumption and its quest event in one transaction", () => {
    const target = store.createSlotItem(2);
    const application = {
      targetItemId: target.id,
      nextMasterId: 2,
      nextLevel: 1,
      materialCost: { devmat: 1, screw: 1 },
      consumedSlotItemIds: [],
      useItemCosts: [],
      success: true
    };
    const before = store.db.serialize();

    armed = "improvement.before-quest-event";
    expect(() => store.applySlotImprovement(application)).toThrow(/improvement\.before-quest-event/);
    expect(store.db.serialize()).toEqual(before);

    armed = null;
    expect(store.applySlotImprovement(application)).toMatchObject({
      ok: true,
      slotItem: { id: target.id, masterId: 2, level: 1 }
    });
  });
});
