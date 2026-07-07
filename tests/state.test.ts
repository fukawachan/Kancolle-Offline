import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createPracticeBattle, createSortieBattle } from "../src/kcsapi/battle.js";
import { proficiencyExpForVisible, visibleProficiency } from "../src/kcsapi/aircraft-proficiency.js";
import { MARRIED_SHIP_LEVEL_CAP, shipTotalExpForLevel } from "../src/kcsapi/experience.js";
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

  it("sets a ship level and synchronizes cumulative experience", () => {
    store.registerAccount(15);

    const result = store.setShipLevel(1, 20);

    expect(result).toMatchObject({
      ok: true,
      ship: {
        id: 1,
        level: 20,
        exp: shipTotalExpForLevel(20)
      }
    });
    const saved = store.getSave().ships.find((ship) => ship.id === 1)!;
    expect(saved.level).toBe(20);
    expect(saved.exp).toBe(shipTotalExpForLevel(20));
  });

  it("marries a level 99 ship, consumes the ring item, and unlocks post-99 leveling", () => {
    store.registerAccount(15);
    const before = store.getSave().ships.find((ship) => ship.id === 1)!;
    store.setUseItemCount(55, 1);
    store.setShipLevel(1, 99);

    const result = store.marryShip(1, () => 0.5);

    expect(result).toMatchObject({
      ok: true,
      ship: {
        id: 1,
        level: 100,
        exp: shipTotalExpForLevel(100, MARRIED_SHIP_LEVEL_CAP),
        maxHp: before.maxHp + 4,
        hp: before.maxHp + 4,
        marriageHpBonus: 4,
        marriageLuckBonus: 5
      }
    });
    expect(result.ok && result.ship.marriedAt).toBeGreaterThan(0);
    expect(store.getSave().useItems.find((item) => item.id === 55)?.count).toBe(0);

    const level120 = store.setShipLevel(1, 120);
    expect(level120).toMatchObject({
      ok: true,
      ship: {
        level: 120,
        exp: shipTotalExpForLevel(120, MARRIED_SHIP_LEVEL_CAP)
      }
    });
  });

  it("rejects invalid marriage attempts without consuming the ring item", () => {
    store.registerAccount(15);
    store.setUseItemCount(55, 2);

    expect(store.marryShip(1, () => 0)).toEqual({
      ok: false,
      error: "Ship level must be at least 99"
    });

    store.setShipLevel(1, 99);
    expect(store.marryShip(1, () => 0)).toMatchObject({ ok: true });
    expect(store.marryShip(1, () => 0)).toEqual({
      ok: false,
      error: "Ship is already married"
    });
    expect(store.getSave().useItems.find((item) => item.id === 55)?.count).toBe(1);

    const another = store.createShip(9);
    store.setShipLevel(another.id, 99);
    store.setUseItemCount(55, 0);
    expect(store.marryShip(another.id, () => 0)).toEqual({
      ok: false,
      error: "Insufficient ring item count"
    });
  });

  it("rejects invalid, unknown, and expedition-away ship level edits", () => {
    store.registerAccount(15);

    expect(store.setShipLevel(1, 0)).toEqual({
      ok: false,
      error: "Level must be an integer from 1 to 99"
    });
    expect(store.setShipLevel(1, 100)).toEqual({
      ok: false,
      error: "Level must be an integer from 1 to 99"
    });
    expect(store.setShipLevel(999, 20)).toEqual({
      ok: false,
      error: "Unknown ship"
    });

    const expeditionShip = store.createShip(9);
    store.changeDeckShip(2, 0, expeditionShip.id);
    store.unlockAllExpeditions(true);
    const started = store.startExpedition(2, 1);
    expect(started.ok).toBe(true);

    expect(store.setShipLevel(expeditionShip.id, 20)).toEqual({
      ok: false,
      error: "Ship is away on expedition"
    });
  });

  it("sets ordinary use item counts and removes zero-count rows", () => {
    store.registerAccount(15);

    const set = store.setUseItemCount(58, 3);
    expect(set).toEqual({ ok: true, item: { id: 58, count: 3 } });
    expect(store.getSave().useItems.find((item) => item.id === 58)).toEqual({ id: 58, count: 3 });

    const cleared = store.setUseItemCount(58, 0);
    expect(cleared).toEqual({ ok: true, item: { id: 58, count: 0 } });
    expect(store.getSave().useItems.find((item) => item.id === 58)).toBeUndefined();
  });

  it("sets material-backed use item counts through the materials table", () => {
    store.registerAccount(15);

    expect(store.setUseItemCount(1, 44)).toEqual({ ok: true, item: { id: 1, count: 44 } });
    expect(store.setUseItemCount(4, 12)).toEqual({ ok: true, item: { id: 4, count: 12 } });

    const save = store.getSave();
    expect(save.materials.repairKit).toBe(44);
    expect(save.materials.screw).toBe(12);
    expect(save.useItems.find((item) => item.id === 1)).toBeUndefined();
    expect(save.useItems.find((item) => item.id === 4)).toBeUndefined();
  });

  it("rejects invalid use item edits", () => {
    store.registerAccount(15);

    expect(store.setUseItemCount(58, -1)).toEqual({
      ok: false,
      error: "Count must be a non-negative integer"
    });
    expect(store.setUseItemCount(999999, 1)).toEqual({
      ok: false,
      error: "Unknown use item"
    });
  });

  it("runs construction through validated dock states and the ship master build time", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-26T00:00:00.000Z"));
    store.registerAccount(15);

    const started = store.startBuild({
      dockId: 1,
      recipe: { fuel: 30, ammo: 30, steel: 30, bauxite: 30, devmat: 1, large: false },
      resultMasterId: 9,
      highspeed: false
    });

    expect(started).toMatchObject({
      ok: true,
      dock: {
        id: 1,
        state: 2,
        resultMasterId: 9,
        completeTime: Date.parse("2026-06-26T00:20:00.000Z")
      }
    });
    expect(store.getSave().materials).toMatchObject({
      fuel: 970,
      ammo: 970,
      steel: 970,
      bauxite: 970,
      devmat: 49
    });

    const occupied = store.startBuild({
      dockId: 1,
      recipe: { fuel: 30, ammo: 30, steel: 30, bauxite: 30, devmat: 1, large: false },
      resultMasterId: 10,
      highspeed: false
    });
    expect(occupied).toEqual({ ok: false, error: "Build dock is not empty" });
    expect(store.claimBuild(1)).toEqual({ ok: false, error: "Build is not complete" });

    vi.advanceTimersByTime(20 * 60_000);
    expect(store.getSave().buildDocks[0].state).toBe(3);
  });

  it("claims a completed construction with the ship's initial equipment", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-26T00:00:00.000Z"));
    store.registerAccount(15);
    store.startBuild({
      dockId: 1,
      recipe: { fuel: 30, ammo: 30, steel: 30, bauxite: 30, devmat: 1, large: false },
      resultMasterId: 9,
      highspeed: false
    });
    vi.advanceTimersByTime(20 * 60_000);

    const claimed = store.claimBuild(1);

    expect(claimed.ok).toBe(true);
    if (!claimed.ok) return;
    expect(claimed.ship.masterId).toBe(9);
    expect(claimed.slotItems.map((item) => item.masterId)).toEqual([297, 13]);
    expect(claimed.ship.slotIds.slice(0, 2)).toEqual(claimed.slotItems.map((item) => item.id));
    expect(claimed.docks[0]).toMatchObject({ id: 1, state: 0, resultMasterId: 0 });
  });

  it("validates construction resources and charges the correct high-speed material count", () => {
    store.registerAccount(15);
    const before = store.getSave();

    const insufficient = store.startBuild({
      dockId: 1,
      recipe: { fuel: 1500, ammo: 1500, steel: 2000, bauxite: 1000, devmat: 20, large: true },
      resultMasterId: 131,
      highspeed: true
    });
    expect(insufficient).toEqual({ ok: false, error: "Insufficient construction materials" });
    expect(store.getSave().materials).toEqual(before.materials);

    store.db.prepare(
      "UPDATE materials SET fuel = 10000, ammo = 10000, steel = 10000, bauxite = 10000, build_kit = 20, devmat = 100 WHERE player_id = 1"
    ).run();
    const started = store.startBuild({
      dockId: 1,
      recipe: { fuel: 1500, ammo: 1500, steel: 2000, bauxite: 1000, devmat: 20, large: true },
      resultMasterId: 131,
      highspeed: true
    });

    expect(started).toMatchObject({ ok: true, dock: { state: 3 } });
    expect(store.getSave().materials).toMatchObject({
      fuel: 8500,
      ammo: 8500,
      steel: 8000,
      bauxite: 9000,
      buildKit: 10,
      devmat: 80
    });
  });

  it("charges ten high-speed construction materials when accelerating an active large build", () => {
    store.registerAccount(15);
    store.db.prepare(
      "UPDATE materials SET fuel = 10000, ammo = 10000, steel = 10000, bauxite = 10000, build_kit = 20, devmat = 100 WHERE player_id = 1"
    ).run();
    store.startBuild({
      dockId: 1,
      recipe: { fuel: 1500, ammo: 1500, steel: 2000, bauxite: 1000, devmat: 20, large: true },
      resultMasterId: 131,
      highspeed: false
    });

    const accelerated = store.speedBuild(1);
    expect(accelerated).toMatchObject({ ok: true, dock: { state: 3 } });
    expect(store.getSave().materials.buildKit).toBe(10);

    const repeated = store.speedBuild(1);
    expect(repeated).toEqual({ ok: false, error: "Build dock is not constructing" });
    expect(store.getSave().materials.buildKit).toBe(10);
  });

  it("applies development attempts atomically and only consumes development materials on success", () => {
    store.registerAccount(15);
    const before = store.getSave();

    const developed = store.developEquipment(
      { fuel: 10, ammo: 10, steel: 10, bauxite: 10 },
      [1, null, 2]
    );

    expect(developed.ok).toBe(true);
    if (!developed.ok) return;
    expect(developed.items.map((item) => item?.masterId ?? null)).toEqual([1, null, 2]);
    expect(developed.materials).toMatchObject({
      fuel: before.materials.fuel - 30,
      ammo: before.materials.ammo - 30,
      steel: before.materials.steel - 30,
      bauxite: before.materials.bauxite - 30,
      devmat: before.materials.devmat - 2
    });
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

  it("migrates visible aircraft proficiency into internal proficiency exp", () => {
    store.registerAccount(15);
    const fighter = store.createSlotItem(20);
    store.db.prepare("UPDATE slot_items SET proficiency = ? WHERE id = ?").run(4, fighter.id);
    store.db.prepare("UPDATE schema_meta SET version = 15").run();
    store.close();

    store = createStateStore({ databasePath });
    const migrated = store.getSave().slotItems.find((item) => item.id === fighter.id)!;

    expect(migrated.proficiencyExp).toBe(proficiencyExpForVisible(4));
    expect(migrated.proficiency).toBe(4);
  });

  it("seeds initial internal proficiency for skilled aircraft", () => {
    store.registerAccount(15);

    const ordinary = store.createSlotItem(20);
    const skilled = store.createSlotItem(96);

    expect(ordinary.proficiencyExp).toBe(0);
    expect(skilled.proficiency).toBe(7);
    expect(visibleProficiency(skilled.proficiencyExp)).toBe(7);
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

  it("clears follower ships while preserving the flagship", () => {
    store.registerAccount(15);
    const extraShip1 = store.createShip(9);
    const extraShip2 = store.createShip(10);
    store.changeDeckShip(1, 2, 3);
    store.changeDeckShip(1, 3, 4);
    store.changeDeckShip(1, 4, extraShip1.id);
    store.changeDeckShip(1, 5, extraShip2.id);

    const changed = store.clearDeckFollowerShips(1);

    expect(changed?.shipIds).toEqual([1, -1, -1, -1, -1, -1]);
    expect(store.getSave().decks[0].shipIds).toEqual([1, -1, -1, -1, -1, -1]);
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

  it("compacts ordinary slots and moves aircraft counts when unequipping", () => {
    store.registerAccount(15);
    const akagi = store.createShip(277);
    const firstFighter = store.createSlotItem(20);
    const secondFighter = store.createSlotItem(20);
    const thirdFighter = store.createSlotItem(20);

    store.equipSlotItem(akagi.id, 0, firstFighter.id);
    store.equipSlotItem(akagi.id, 2, secondFighter.id);
    store.equipSlotItem(akagi.id, 3, thirdFighter.id);

    const equipped = store.getSave().ships.find((ship) => ship.id === akagi.id)!;
    expect(equipped.slotIds).toEqual([firstFighter.id, -1, secondFighter.id, thirdFighter.id, -1]);
    expect(equipped.onSlot).toEqual([20, 0, 32, 10, 0]);

    const unequipped = store.equipSlotItem(akagi.id, 0, -1)!;

    expect(unequipped.slotIds).toEqual([secondFighter.id, thirdFighter.id, -1, -1, -1]);
    expect(unequipped.onSlot).toEqual([20, 10, 0, 0, 0]);
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

  it("updates aircraft proficiency once when sortie battle results are settled", () => {
    store.registerAccount(15);
    const akagi = store.createShip(277);
    const fighter = store.createSlotItem(20);
    store.equipSlotItem(akagi.id, 0, fighter.id);
    store.changeDeckShip(1, 0, akagi.id);
    store.startSortie(1, 1, 1);
    const battle = createSortieBattle(store.getSave(), { formation: 1 });
    const record = {
      ...battle.record,
      after: {
        ...battle.record.after,
        fOnSlotByShipId: {
          [akagi.id]: [20, 0, 0, 0, 0]
        }
      }
    };

    store.recordSortieBattle(record as unknown as Record<string, unknown>);
    store.applySortieBattleResult();
    const afterFirst = store.getSave().slotItems.find((item) => item.id === fighter.id)!;
    store.applySortieBattleResult();
    const afterSecond = store.getSave().slotItems.find((item) => item.id === fighter.id)!;

    expect(afterFirst.proficiencyExp).toBeGreaterThan(0);
    expect(afterSecond.proficiencyExp).toBe(afterFirst.proficiencyExp);
  });

  it("clears aircraft proficiency when a sortie wipes out the equipped squadron", () => {
    store.registerAccount(15);
    const akagi = store.createShip(277);
    const fighter = store.createSlotItem(20);
    store.db.prepare("UPDATE slot_items SET proficiency = 7, proficiency_exp = ? WHERE id = ?")
      .run(proficiencyExpForVisible(7), fighter.id);
    store.equipSlotItem(akagi.id, 0, fighter.id);
    store.changeDeckShip(1, 0, akagi.id);
    store.startSortie(1, 1, 1);
    const battle = createSortieBattle(store.getSave(), { formation: 1 });
    const record = {
      ...battle.record,
      after: {
        ...battle.record.after,
        fOnSlotByShipId: {
          [akagi.id]: [0, 0, 0, 0, 0]
        }
      }
    };

    store.recordSortieBattle(record as unknown as Record<string, unknown>);
    store.applySortieBattleResult();

    const after = store.getSave().slotItems.find((item) => item.id === fighter.id)!;
    expect(after.proficiencyExp).toBe(0);
    expect(after.proficiency).toBe(0);
  });
});
