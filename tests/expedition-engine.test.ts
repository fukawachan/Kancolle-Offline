import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  buildExpeditionSnapshot,
  expeditionDefinition,
  expeditionGreatSuccessChance,
  expeditionResourceGain,
  expeditionUnlockRule,
  evaluateExpeditionRequirements,
  resolveExpedition,
} from "../src/kcsapi/expedition.js";
import { createStateStore, type StateStore } from "../src/state/store.js";

describe("expedition rules engine", () => {
  let tempDir: string;
  let store: StateStore;

  beforeEach(async () => {
    tempDir = await mkdtemp(path.join(tmpdir(), "kancolle-expedition-engine-"));
    store = createStateStore({ databasePath: path.join(tempDir, "save.sqlite") });
    store.registerAccount(15);
  });

  afterEach(async () => {
    store.close();
    await rm(tempDir, { recursive: true, force: true });
  });

  function configureDeck(shipMasterIds: number[], condition = 49) {
    const ships = shipMasterIds.map((masterId) => store.createShip(masterId));
    ships.forEach((ship, index) => {
      store.db.prepare("UPDATE ships SET level = 99, condition = ? WHERE id = ?").run(condition, ship.id);
      store.changeDeckShip(2, index, ship.id);
    });
    return ships;
  }

  it("checks declarative ship composition requirements", () => {
    configureDeck([21, 9, 10]);
    const save = store.getSave();
    const snapshot = buildExpeditionSnapshot(save, 2, 4, {
      now: 1_000,
      seed: 1234,
      serialCid: "composition",
    });

    expect(evaluateExpeditionRequirements(snapshot, expeditionDefinition(4))).toEqual({
      ok: true,
      failures: [],
    });

    const invalid = buildExpeditionSnapshot(save, 2, 13, {
      now: 1_000,
      seed: 1234,
      serialCid: "composition-invalid",
    });
    expect(evaluateExpeditionRequirements(invalid, expeditionDefinition(13)).failures).toContain(
      "ship-composition"
    );
  });

  it("uses the stored seed to make settlement deterministic", () => {
    configureDeck([9, 10]);
    const snapshot = buildExpeditionSnapshot(store.getSave(), 2, 1, {
      now: 1_000,
      seed: 876543,
      serialCid: "deterministic",
    });
    const definition = expeditionDefinition(1);

    expect(resolveExpedition(snapshot, definition)).toEqual(resolveExpedition(snapshot, definition));
  });

  it("fails when required expedition supply is unavailable", () => {
    const ships = configureDeck([9, 10]);
    store.db.prepare("UPDATE ships SET fuel = 0 WHERE id IN (?, ?)").run(ships[0].id, ships[1].id);
    const snapshot = buildExpeditionSnapshot(store.getSave(), 2, 1, {
      now: 1_000,
      seed: 5,
      serialCid: "no-fuel",
    });

    expect(resolveExpedition(snapshot, expeditionDefinition(1)).clearResult).toBe(0);
  });

  it("requires full supply rather than only the amount consumed by the expedition", () => {
    const ships = configureDeck([9, 10]);
    store.db.prepare("UPDATE ships SET fuel = max_fuel - 1, ammo = max_ammo - 1 WHERE id IN (?, ?)")
      .run(ships[0].id, ships[1].id);
    const snapshot = buildExpeditionSnapshot(store.getSave(), 2, 1, {
      now: 1_000,
      seed: 5,
      serialCid: "partial-supply",
    });

    expect(snapshot.ships.every((ship) => ship.fuel > ship.maxFuel * 0.3)).toBe(true);
    expect(resolveExpedition(snapshot, expeditionDefinition(1)).clearResult).toBe(0);
  });

  it("guarantees great success for a fully sparkled six-ship fleet", () => {
    configureDeck([21, 9, 10, 39, 40, 41], 100);
    const snapshot = buildExpeditionSnapshot(store.getSave(), 2, 16, {
      now: 1_000,
      seed: 1,
      serialCid: "sparkled",
    });

    const outcome = resolveExpedition(snapshot, expeditionDefinition(16));
    expect(outcome.clearResult).toBe(2);
    expect(outcome.memberExp).toBe(expeditionDefinition(16).rewards.admiralExp * 2);
    expect(outcome.shipExp[0]).toBe(expeditionDefinition(16).rewards.shipExp * 4 * 1.5);
  });

  it("implements the three published great-success probability families", () => {
    configureDeck([21, 9, 10, 39, 40, 41], 100);
    const snapshot = buildExpeditionSnapshot(store.getSave(), 2, 16, { now: 1_000, seed: 1 });

    expect(expeditionGreatSuccessChance(snapshot, expeditionDefinition(16))).toBe(1);
    snapshot.ships[5].condition = 49;
    expect(expeditionGreatSuccessChance(snapshot, expeditionDefinition(16))).toBe(0);

    snapshot.ships.slice(0, 4).forEach((ship) => { ship.condition = 50; });
    snapshot.ships.slice(4).forEach((ship) => { ship.condition = 49; });
    snapshot.ships[0].slotItemMasterIds = [75, 75, 75, 75, 75];
    expect(expeditionGreatSuccessChance(snapshot, expeditionDefinition(37))).toBe(1);
    snapshot.ships[0].slotItemMasterIds = [75, 75, 75, 75];
    expect(expeditionGreatSuccessChance(snapshot, expeditionDefinition(37))).toBeCloseTo(0.66, 10);

    snapshot.ships.forEach((ship) => { ship.condition = 49; });
    snapshot.ships[0].level = 100;
    expect(expeditionGreatSuccessChance(snapshot, expeditionDefinition(41))).toBeCloseTo(0.36, 10);
  });

  it("applies landing-craft stars, Toku Daihatsu, and Kinu bonuses with separate floors", () => {
    configureDeck([487, 9]);
    const snapshot = buildExpeditionSnapshot(store.getSave(), 2, 1, { now: 1_000, seed: 1 });
    snapshot.ships[0].slotItems = Array.from({ length: 4 }, () => ({ masterId: 193, level: 10 }));
    snapshot.ships[1].slotItems = Array.from({ length: 4 }, () => ({ masterId: 68, level: 10 }));
    snapshot.ships[0].slotItemMasterIds = snapshot.ships[0].slotItems.map((item) => item.masterId);
    snapshot.ships[1].slotItemMasterIds = snapshot.ships[1].slotItems.map((item) => item.masterId);

    expect(expeditionResourceGain(100, 1, snapshot)).toBe(128);
    expect(expeditionResourceGain(100, 2, snapshot)).toBe(192);
    expect(expeditionResourceGain(100, 0, snapshot)).toBe(0);

    snapshot.ships[0].slotItems = [];
    snapshot.ships[0].slotItemMasterIds = [];
    snapshot.ships[1].slotItems = [];
    snapshot.ships[1].slotItemMasterIds = [];
    expect(expeditionResourceGain(100, 1, snapshot)).toBe(105);
  });

  it("uses the explicit cross-area and monthly unlock graph", () => {
    expect(expeditionUnlockRule(4)).toEqual({
      completedIds: [2, 3],
      periodCompletedIds: [],
      clearedMapIds: [],
    });
    expect(expeditionUnlockRule(41)).toEqual({
      completedIds: [110],
      periodCompletedIds: [],
      clearedMapIds: [24],
    });
    expect(expeditionUnlockRule(104)).toEqual({
      completedIds: [],
      periodCompletedIds: [103, 112],
      clearedMapIds: [],
    });
  });

  it("keeps ships alive when a combat expedition deals damage", () => {
    configureDeck([21, 9, 10, 39, 40]);
    const snapshot = buildExpeditionSnapshot(store.getSave(), 2, 104, {
      now: 1_000,
      seed: 42,
      serialCid: "combat",
    });
    const outcome = resolveExpedition(snapshot, expeditionDefinition(104));

    expect(outcome.shipHps).toHaveLength(5);
    expect(outcome.shipHps.every((hp) => hp >= 1)).toBe(true);
  });
});
