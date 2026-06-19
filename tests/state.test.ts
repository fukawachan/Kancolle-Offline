import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createPracticeBattle } from "../src/kcsapi/battle.js";
import { masterData } from "../src/master/data.js";
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
    vi.useRealTimers();
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

  it("creates ship instances with initial max HP from ship master data", () => {
    store.registerAccount(15);

    const nagato = store.createShip(80);
    const nagatoMaster = masterData.api_mst_ship.find((ship) => ship.api_id === 80)!;

    expect(nagatoMaster.api_taik).toEqual([80, 94]);
    expect(nagato.maxHp).toBe(nagatoMaster.api_taik[0]);
    expect(nagato.hp).toBe(nagato.maxHp);
  });

  it("repairs legacy ship max HP values that were seeded from placeholders", () => {
    store.registerAccount(15);
    const nagato = store.createShip(80);
    store.db.prepare("UPDATE ships SET hp = 15, max_hp = 15 WHERE id = ?").run(nagato.id);
    store.close();

    store = createStateStore({ databasePath });
    const repaired = store.getSave().ships.find((ship) => ship.id === nagato.id)!;

    expect(repaired.maxHp).toBe(80);
    expect(repaired.hp).toBe(80);
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

  it("repairs legacy deck holes when reopening a save", () => {
    store.registerAccount(15);
    store.db.prepare("UPDATE decks SET ship_ids_json = ? WHERE id = 1")
      .run(JSON.stringify([1, 2, -1, 3, 4, -1]));
    store.close();

    store = createStateStore({ databasePath });
    const save = store.getSave();
    const row = store.db.prepare("SELECT ship_ids_json FROM decks WHERE id = 1").get() as { ship_ids_json: string };

    expect(save.decks[0].shipIds).toEqual([1, 2, 3, 4, -1, -1]);
    expect(JSON.parse(row.ship_ids_json)).toEqual([1, 2, 3, 4, -1, -1]);
  });

  it("compacts following ships when removing a middle organize slot", () => {
    store.registerAccount(15);
    const extraShip1 = store.createShip(9);
    const extraShip2 = store.createShip(10);
    store.changeDeckShip(1, 2, 3);
    store.changeDeckShip(1, 3, 4);
    store.changeDeckShip(1, 4, extraShip1.id);
    store.changeDeckShip(1, 5, extraShip2.id);

    const changed = store.changeDeckShip(1, 3, -1);

    expect(changed?.shipIds).toEqual([1, 2, 3, extraShip1.id, extraShip2.id, -1]);
    expect(store.getSave().decks[0].shipIds).toEqual([1, 2, 3, extraShip1.id, extraShip2.id, -1]);
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

  it("recovers base materials from elapsed offline time after reopening the save", () => {
    const startedAt = Date.UTC(2026, 5, 18, 0, 0, 0);
    vi.useFakeTimers();
    vi.setSystemTime(startedAt);
    store.registerAccount(15);
    store.db.prepare("UPDATE materials SET fuel = 100, ammo = 200, steel = 300, bauxite = 400 WHERE player_id = 1").run();
    store.close();

    vi.setSystemTime(startedAt + 6 * 60_000 + 30_000);
    store = createStateStore({ databasePath });
    const recovered = store.getSave().materials;

    expect(recovered).toMatchObject({
      fuel: 106,
      ammo: 206,
      steel: 306,
      bauxite: 402
    });
  });

  it("waits for a full recovery tick and leaves non-basic materials unchanged", () => {
    const startedAt = Date.UTC(2026, 5, 18, 1, 0, 0);
    vi.useFakeTimers();
    vi.setSystemTime(startedAt);
    store.registerAccount(15);
    store.db.prepare(`
      UPDATE materials
      SET fuel = 10, ammo = 20, steel = 30, bauxite = 40,
          build_kit = 7, repair_kit = 8, devmat = 9, screw = 10
      WHERE player_id = 1
    `).run();

    vi.setSystemTime(startedAt + 180_000 - 1);
    expect(store.getSave().materials).toMatchObject({
      fuel: 10,
      ammo: 20,
      steel: 30,
      bauxite: 40,
      buildKit: 7,
      repairKit: 8,
      devmat: 9,
      screw: 10
    });

    vi.setSystemTime(startedAt + 180_000);
    expect(store.getSave().materials).toMatchObject({
      fuel: 13,
      ammo: 23,
      steel: 33,
      bauxite: 41,
      buildKit: 7,
      repairKit: 8,
      devmat: 9,
      screw: 10
    });
  });

  it("clamps naturally recovered base materials at one million", () => {
    const startedAt = Date.UTC(2026, 5, 18, 2, 0, 0);
    vi.useFakeTimers();
    vi.setSystemTime(startedAt);
    store.registerAccount(15);
    store.db.prepare("UPDATE materials SET fuel = 999999, ammo = 999998, steel = 999997, bauxite = 999999 WHERE player_id = 1").run();

    vi.setSystemTime(startedAt + 180_000);
    expect(store.getSave().materials).toMatchObject({
      fuel: 1_000_000,
      ammo: 1_000_000,
      steel: 1_000_000,
      bauxite: 1_000_000
    });
  });

  it("does not bank recovery ticks while base materials are capped", () => {
    const startedAt = Date.UTC(2026, 5, 18, 3, 0, 0);
    vi.useFakeTimers();
    vi.setSystemTime(startedAt);
    store.registerAccount(15);
    store.db.prepare("UPDATE materials SET fuel = 1000000, ammo = 1000000, steel = 1000000, bauxite = 1000000 WHERE player_id = 1").run();

    vi.setSystemTime(startedAt + 12 * 180_000);
    expect(store.getSave().materials.fuel).toBe(1_000_000);

    store.db.prepare("UPDATE materials SET fuel = 999990 WHERE player_id = 1").run();
    expect(store.getSave().materials.fuel).toBe(999_990);
  });

  it("persists current aircraft counts and restores them during supply", () => {
    store.registerAccount(15);
    const akagi = store.createShip(277);
    const fighter = store.createSlotItem(20);
    const bomber = store.createSlotItem(23);

    store.equipSlotItem(akagi.id, 0, fighter.id);
    store.equipSlotItem(akagi.id, 2, bomber.id);

    const equipped = store.getSave().ships.find((ship) => ship.id === akagi.id)! as any;
    expect(equipped.onSlot).toEqual([20, 0, 32, 0, 0]);

    const beforeBauxite = store.getSave().materials.bauxite;
    store.db.prepare("UPDATE ships SET onslot_json = ? WHERE id = ?").run(JSON.stringify([18, 0, 30, 0, 0]), akagi.id);

    const supplied = store.supplyShips([akagi.id]);

    expect(supplied.ships[0].onSlot).toEqual([20, 0, 32, 0, 0]);
    expect(supplied.consumed.bauxite).toBe(20);
    expect(store.getSave().materials.bauxite).toBe(beforeBauxite - 20);
  });

  it("migrates version 4 saves by initializing current aircraft counts", () => {
    store.registerAccount(15);
    const akagi = store.createShip(277);
    const fighter = store.createSlotItem(20);
    const bomber = store.createSlotItem(23);
    store.equipSlotItem(akagi.id, 0, fighter.id);
    store.equipSlotItem(akagi.id, 2, bomber.id);

    const columns = (store.db.prepare("PRAGMA table_info(ships)").all() as { name: string }[])
      .map((row) => row.name)
      .filter((name) => name !== "onslot_json");
    store.db.exec(`
      CREATE TABLE ships_legacy AS SELECT ${columns.join(", ")} FROM ships;
      DROP TABLE ships;
      ALTER TABLE ships_legacy RENAME TO ships;
      UPDATE schema_meta SET version = 4;
    `);
    store.close();

    store = createStateStore({ databasePath });
    const migrated = store.getSave().ships.find((ship) => ship.id === akagi.id)!;

    expect(migrated.onSlot).toEqual([20, 0, 32, 0, 0]);
  });

  it("migrates version 5 map progress into phase-aware state", () => {
    store.registerAccount(15);
    store.db.prepare("UPDATE maps SET cleared = 1, gauge = 0 WHERE id = 75").run();
    store.db.prepare("UPDATE maps SET cleared = 0, gauge = 0 WHERE id = 72").run();
    store.db.prepare("UPDATE schema_meta SET version = 5").run();
    store.close();

    store = createStateStore({ databasePath });
    const save = store.getSave();

    expect(save.maps.find((map) => map.id === 75)).toMatchObject({
      cleared: 1,
      gauge: 0,
      phase: 5,
      phaseProgress: 0
    });
    expect(save.maps.find((map) => map.id === 72)).toMatchObject({
      cleared: 0,
      gauge: 3,
      phase: 1,
      phaseProgress: 0
    });
  });

  it("consumes each ship's daytime battle cost after every settled battle", () => {
    store.registerAccount(15);
    const akagi = store.createShip(277);
    store.changeDeckShip(1, 0, akagi.id);
    const before = store.getSave();
    const fleet = before.decks[0].shipIds
      .filter((shipId) => shipId > 0)
      .map((shipId) => before.ships.find((ship) => ship.id === shipId)!);

    for (let battleNo = 1; battleNo <= 2; battleNo += 1) {
      const battle = createPracticeBattle(store.getSave(), { practiceEnemyId: battleNo, formation: 1 });
      store.recordPracticeBattle(battle.record as unknown as Record<string, unknown>);
      store.applyPracticeBattleResult();

      const after = store.getSave();
      for (const beforeShip of fleet) {
        const ship = after.ships.find((item) => item.id === beforeShip.id)!;
        expect(ship.fuel).toBe(Math.max(0, beforeShip.fuel - Math.floor(beforeShip.maxFuel * 0.2) * battleNo));
        expect(ship.ammo).toBe(Math.max(0, beforeShip.ammo - Math.floor(beforeShip.maxAmmo * 0.2) * battleNo));
      }
    }
  });

  it("persists practice aircraft losses without persisting or repairing HP damage", () => {
    store.registerAccount(15);
    const akagi = store.createShip(277);
    const fighter = store.createSlotItem(20);
    const bomber = store.createSlotItem(23);
    store.equipSlotItem(akagi.id, 0, fighter.id);
    store.equipSlotItem(akagi.id, 2, bomber.id);
    store.changeDeckShip(1, 0, akagi.id);
    store.db.prepare("UPDATE ships SET hp = ? WHERE id = ?").run(5, akagi.id);
    const before = store.getSave().ships.find((ship) => ship.id === akagi.id)!;
    const battle = createPracticeBattle(store.getSave(), { practiceEnemyId: 1, formation: 1 });

    store.recordPracticeBattle(battle.record as unknown as Record<string, unknown>);
    store.applyPracticeBattleResult();

    const after = store.getSave().ships.find((ship) => ship.id === akagi.id)!;
    expect(after.hp).toBe(before.hp);
    expect(after.hp).toBeLessThan(after.maxHp);
    expect(after.onSlot).toEqual(battle.record.after.fOnSlotByShipId?.[akagi.id]);
    expect(after.onSlot.reduce((sum, count) => sum + count, 0))
      .toBeLessThan(before.onSlot.reduce((sum, count) => sum + count, 0));
  });
});
