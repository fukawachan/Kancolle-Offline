import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createPracticeBattle, createSortieBattle } from "../src/kcsapi/battle.js";
import { sortieNodes } from "../src/master/sortie-data.js";
import { createStateStore, type StateStore } from "../src/state/store.js";

describe("battle unit stat growth", () => {
  let tempDir: string;
  let store: StateStore;

  beforeEach(async () => {
    tempDir = await mkdtemp(path.join(tmpdir(), "kancolle-battle-stats-"));
    store = createStateStore({ databasePath: path.join(tempDir, "save.sqlite") });
    store.registerAccount(15);
    store.startSortie(1, 1, 1);
    store.db.prepare("UPDATE sortie_sessions SET seed = 0 WHERE id = 1").run();
  });

  afterEach(async () => {
    store.close();
    await rm(tempDir, { recursive: true, force: true });
  });

  it.each([
    [9, 1, 40, 20],
    [9, 50, 64, 34],
    [9, 99, 89, 49],
    [9, 188, 133, 75],
    [277, 50, 48, 0],
    [277, 188, 105, 0]
  ])("builds master %i level %i with its innate evasion and ASW", (masterId, level, evasion, asw) => {
    const ship = store.createShip(masterId);
    store.db.prepare("UPDATE ships SET level = ? WHERE id = ?").run(level, ship.id);
    store.changeDeckShip(1, 0, ship.id);
    store.clearDeckFollowerShips(1);

    const unit = createSortieBattle(store.getSave(), { formation: 1 }).record.units?.friendly[0];

    expect(unit).toMatchObject({
      masterId,
      level,
      evasion,
      baseAsw: asw,
      asw,
      statEvidence: { evasion: "player-growth", asw: "player-growth", los: "player-growth" }
    });
  });

  it("uses the same player-master growth data for practice opponents", () => {
    const battle = createPracticeBattle(store.getSave(), {
      practiceEnemyId: 1,
      practiceRivals: [{
        id: 1,
        name: "Growth vector",
        level: 188,
        rank: "甲",
        comment: "",
        flag: 1,
        medals: 0,
        ships: [{ id: 1, masterId: 277, level: 188, star: 0, slotMasterIds: [], onSlot: [] }]
      }]
    });

    expect(battle.record.units?.enemy[0]).toMatchObject({
      masterId: 277,
      level: 188,
      evasion: 105,
      baseAsw: 0,
      statEvidence: { evasion: "player-growth", asw: "player-growth", los: "player-growth" }
    });
  });

  it("uses published enemy evasion and marks unpublished enemy stats explicitly", () => {
    const published = createSortieBattle(store.getSave(), { formation: 1 }).record.units?.enemy[0];
    expect(published).toMatchObject({
      masterId: 1501,
      evasion: 14,
      baseAsw: 25,
      statEvidence: { evasion: "enemy-static", asw: "enemy-static", los: "enemy-static" }
    });

    const session = store.getSave().sortieSession!;
    const node = sortieNodes().find((candidate) => candidate.mapId === 11 && candidate.node === session.node)!;
    const originalShipIds = node.encounters.map((encounter) => encounter.shipIds);
    try {
      for (const encounter of node.encounters) {
        (encounter as { shipIds: readonly number[] }).shipIds = [1650];
      }
      const partiallyPublished = createSortieBattle(store.getSave(), { formation: 1 }).record.units?.enemy[0];
      expect(partiallyPublished).toMatchObject({
        masterId: 1650,
        baseAsw: 0,
        evasion: 0,
        statEvidence: { evasion: "unavailable", asw: "enemy-static", los: "unavailable" }
      });

      for (const encounter of node.encounters) {
        (encounter as { shipIds: readonly number[] }).shipIds = [1637];
      }
      const unavailable = createSortieBattle(store.getSave(), { formation: 1 }).record.units?.enemy[0];
      expect(unavailable).toMatchObject({
        masterId: 1637,
        evasion: 0,
        statEvidence: { evasion: "unavailable", asw: "unavailable", los: "unavailable" }
      });
    } finally {
      node.encounters.forEach((encounter, index) => {
        (encounter as { shipIds: readonly number[] }).shipIds = originalShipIds[index];
      });
    }
  });
});
