import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  combinedFleetSnapshot,
  normalizeCombinedFormation,
  validateCombinedFleet
} from "../src/kcsapi/combined-fleet.js";
import { createStateStore, type StateStore } from "../src/state/store.js";

describe("combined fleet rules", () => {
  let tempDir: string;
  let store: StateStore;

  beforeEach(async () => {
    tempDir = await mkdtemp(path.join(tmpdir(), "kancolle-combined-"));
    store = createStateStore({ databasePath: path.join(tempDir, "save.sqlite") });
    store.registerAccount(15);
  });

  afterEach(async () => {
    store.close();
    await rm(tempDir, { recursive: true, force: true });
  });

  it("accepts a carrier task force made from deck 1 and deck 2", () => {
    const carrier = store.createShip(277);
    const destroyerA = store.createShip(9);
    const destroyerB = store.createShip(10);
    const lightCruiser = store.createShip(21);

    store.changeDeckShip(1, 0, carrier.id);
    store.changeDeckShip(1, 1, -1);
    store.changeDeckShip(2, 0, lightCruiser.id);
    store.changeDeckShip(2, 1, destroyerA.id);
    store.changeDeckShip(2, 2, destroyerB.id);

    const result = validateCombinedFleet(store.getSave(), 1);

    expect(result.ok).toBe(true);
    expect(combinedFleetSnapshot(store.getSave())).toMatchObject({
      mainDeckId: 1,
      escortDeckId: 2,
      mainShipCount: 1,
      escortShipCount: 3
    });
  });

  it("accepts surface task force and transport escort compositions", () => {
    const battleshipA = store.createShip(78);
    const battleshipB = store.createShip(80);
    const lightCruiser = store.createShip(21);
    const destroyerA = store.createShip(9);
    const destroyerB = store.createShip(10);
    store.changeDeckShip(1, 0, battleshipA.id);
    store.changeDeckShip(1, 1, battleshipB.id);
    store.changeDeckShip(2, 0, lightCruiser.id);
    store.changeDeckShip(2, 1, destroyerA.id);
    store.changeDeckShip(2, 2, destroyerB.id);

    expect(validateCombinedFleet(store.getSave(), 2)).toEqual({ ok: true, combinedFleet: 2 });

    const destroyerC = store.createShip(11);
    const destroyerD = store.createShip(12);
    const destroyerE = store.createShip(13);
    const destroyerF = store.createShip(14);
    store.changeDeckShip(1, 0, destroyerC.id);
    store.changeDeckShip(1, 1, destroyerD.id);
    store.changeDeckShip(1, 2, destroyerE.id);
    store.changeDeckShip(1, 3, destroyerF.id);
    store.changeDeckShip(2, 3, store.createShip(15).id);

    expect(validateCombinedFleet(store.getSave(), 3)).toEqual({ ok: true, combinedFleet: 3 });
  });

  it("rejects combined fleets without the required escort light cruiser and destroyers", () => {
    const carrier = store.createShip(277);
    const battleship = store.createShip(80);

    store.changeDeckShip(1, 0, carrier.id);
    store.changeDeckShip(2, 0, battleship.id);

    const result = validateCombinedFleet(store.getSave(), 1);

    expect(result).toEqual({
      ok: false,
      combinedFleet: 0,
      reason: "Escort fleet must include exactly one CL/CT flagship and at least two DD/DE ships"
    });
  });

  it("normalizes combined formations when escort fleet has fewer than four ships", () => {
    expect(normalizeCombinedFormation(3, 3)).toBe(1);
    expect(normalizeCombinedFormation(4, 3)).toBe(2);
    expect(normalizeCombinedFormation(4, 4)).toBe(4);
  });
});
