import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  buildExpeditionSnapshot,
  expeditionDefinition,
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

  it("guarantees great success for a fully sparkled six-ship fleet", () => {
    configureDeck([21, 9, 10, 39, 40, 41], 100);
    const snapshot = buildExpeditionSnapshot(store.getSave(), 2, 16, {
      now: 1_000,
      seed: 1,
      serialCid: "sparkled",
    });

    expect(resolveExpedition(snapshot, expeditionDefinition(16)).clearResult).toBe(2);
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
