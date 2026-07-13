import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createStateStore,
  STATE_SCHEMA_VERSION,
  type StateStore
} from "../src/state/store.js";

describe("state integrity and atomic commands", () => {
  let tempDir: string;
  let databasePath: string;
  let store: StateStore;

  beforeEach(async () => {
    tempDir = await mkdtemp(path.join(tmpdir(), "kancolle-state-integrity-"));
    databasePath = path.join(tempDir, "save.sqlite");
    store = createStateStore({ databasePath });
    store.registerAccount(15);
  });

  afterEach(async () => {
    vi.useRealTimers();
    if (store.db.open) store.close();
    await rm(tempDir, { recursive: true, force: true });
  });

  it("rejects invalid or duplicate destruction ids atomically", () => {
    const before = logicalState();

    for (const ids of [[999_999], [1, 1], [0], [-1], [1.5], [1, 999_999]]) {
      expect(store.destroySlotItem(ids)).toMatchObject({ ok: false, destroyedIds: [], reward: [0, 0, 0, 0] });
      expect(logicalState(), String(ids)).toBe(before);
    }
  });

  it("enforces unique equipment ownership and master-specific scrap rewards", () => {
    const item = store.createSlotItem(80);
    expect(store.equipSlotItem(1, 0, item.id)?.slotIds[0]).toBe(item.id);
    expect(store.equipSlotItem(2, 0, item.id)).toBeNull();
    expect(store.destroySlotItem([item.id])).toMatchObject({ ok: false, error: expect.stringMatching(/assigned/i) });
    expect(store.integrityIssues()).toEqual([]);

    store.equipSlotItem(1, 0, -1);
    const before = store.getSave().materials;
    const destroyed = store.destroySlotItem([item.id]);
    expect(destroyed).toMatchObject({ ok: true, reward: [2, 3, 0, 6], destroyedIds: [item.id] });
    expect(store.getSave().materials).toMatchObject({
      fuel: before.fuel + 2,
      ammo: before.ammo + 3,
      steel: before.steel,
      bauxite: before.bauxite + 6
    });
    expect(store.integrityIssues()).toEqual([]);
  });

  it("moves equipment between owners atomically and rolls back a partially executed move", () => {
    const source = store.createShip(277);
    const target = store.createShip(277);
    const fighter = store.createSlotItem(20);
    expect(store.equipSlotItem(source.id, 0, fighter.id)).toBeTruthy();
    const before = logicalState();

    store.db.exec(`
      CREATE TRIGGER reject_target_slot_move
      BEFORE UPDATE ON ships
      WHEN NEW.id = ${target.id}
      BEGIN
        SELECT RAISE(ABORT, 'injected target write failure');
      END;
    `);
    expect(store.moveSlotItem({
      sourceShipId: source.id,
      sourceIndex: 0,
      sourceKind: "normal",
      targetShipId: target.id,
      targetIndex: 1,
      targetKind: "normal",
      expectedItemId: fighter.id
    })).toMatchObject({ ok: false, error: expect.stringMatching(/injected/i) });
    expect(logicalState()).toBe(before);
    store.db.exec("DROP TRIGGER reject_target_slot_move");

    const moved = store.moveSlotItem({
      sourceShipId: source.id,
      sourceIndex: 0,
      sourceKind: "normal",
      targetShipId: target.id,
      targetIndex: 1,
      targetKind: "normal",
      expectedItemId: fighter.id
    });
    expect(moved).toMatchObject({ ok: true, movedItemId: fighter.id, displacedItemId: -1 });
    expect(store.getSave().ships.find((ship) => ship.id === source.id)?.slotIds).not.toContain(fighter.id);
    expect(store.getSave().ships.find((ship) => ship.id === target.id)?.slotIds).toContain(fighter.id);
    expect(store.integrityIssues()).toEqual([]);
  });

  it("leaves ships and materials unchanged when supply inventory is insufficient", () => {
    store.db.prepare("UPDATE ships SET fuel = 0, ammo = 0 WHERE id = 1").run();
    store.db.prepare("UPDATE materials SET fuel = 0, ammo = 0, bauxite = 0 WHERE player_id = 1").run();
    const before = logicalState();

    expect(store.supplyShips([1], { kind: 3, refillAircraft: true })).toMatchObject({
      ok: false,
      error: expect.stringMatching(/insufficient/i)
    });
    expect(logicalState()).toBe(before);
  });

  it("uses aircraft-specific air-base capacity, deployment costs, relocation, and atomic resupply", () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    const now = Date.UTC(2026, 6, 7, 5, 0, 0);
    vi.setSystemTime(now);
    store.openAirBaseArea(1);
    const fighter = store.createSlotItem(20); // cost 4, capacity 18
    const recon = store.createSlotItem(54); // cost 9, capacity 4
    const heavyBomber = store.createSlotItem(395); // cost 20, capacity 9

    expect(store.setAirBasePlane(1, 1, 1, fighter.id)).toMatchObject({
      ok: true,
      airBase: { squadrons: expect.arrayContaining([expect.objectContaining({ squadronId: 1, maxCount: 18, count: 18 })]) },
      materials: { bauxite: 928 }
    });
    expect(store.setAirBasePlane(1, 1, 2, recon.id)).toMatchObject({
      ok: true,
      airBase: { squadrons: expect.arrayContaining([expect.objectContaining({ squadronId: 2, maxCount: 4, count: 4 })]) },
      materials: { bauxite: 892 }
    });
    expect(store.setAirBasePlane(1, 1, 3, heavyBomber.id)).toMatchObject({
      ok: true,
      airBase: { squadrons: expect.arrayContaining([expect.objectContaining({ squadronId: 3, maxCount: 9, count: 9 })]) },
      materials: { bauxite: 712 }
    });

    expect(store.setAirBasePlane(1, 1, 1, -1)).toMatchObject({ ok: true });
    expect(store.getSave().relocatingSlotItemIds).toContain(fighter.id);
    expect(store.equipSlotItem(1, 0, fighter.id)).toBeNull();
    expect(store.destroySlotItem([fighter.id])).toMatchObject({ ok: false, error: expect.stringMatching(/relocating/i) });
    vi.setSystemTime(now + 12 * 60_000);
    store.settle();
    expect(store.getSave().relocatingSlotItemIds).not.toContain(fighter.id);
    expect(store.equipSlotItem(1, 0, fighter.id)).toBeTruthy();

    store.db.prepare(`
      UPDATE air_base_squadrons
      SET count = max(0, max_count - 1)
      WHERE area_id = 1 AND base_id = 1 AND slot_item_id > 0
    `).run();
    store.db.prepare("UPDATE materials SET fuel = 5, bauxite = 9 WHERE player_id = 1").run();
    const before = logicalState();
    expect(store.supplyAirBase(1, 1)).toMatchObject({ ok: false, error: expect.stringMatching(/insufficient/i) });
    expect(logicalState()).toBe(before);

    store.db.prepare("UPDATE materials SET fuel = 6, bauxite = 10 WHERE player_id = 1").run();
    expect(store.supplyAirBase(1, 1)).toMatchObject({
      ok: true,
      materials: { fuel: 0, bauxite: 0 },
      airBase: {
        squadrons: expect.arrayContaining([
          expect.objectContaining({ squadronId: 2, count: 4, maxCount: 4 }),
          expect.objectContaining({ squadronId: 3, count: 9, maxCount: 9 })
        ])
      }
    });
    expect(store.integrityIssues()).toEqual([]);
  });

  it("persists air-base expansion, maintenance, exchange, naming, and morale consumption", () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    const now = Date.UTC(2026, 6, 8, 5, 0, 0);
    vi.setSystemTime(now);
    store.openAirBaseArea(6);
    store.db.prepare("INSERT INTO use_items (id, count) VALUES (73, 5), (102, 1)").run();

    expect(store.renameAirBase(6, 1, "Guano Patrol")).toMatchObject({
      ok: true,
      airBase: { name: "Guano Patrol", maintenanceLevel: 0 }
    });
    expect(store.expandAirBase(6)).toMatchObject({ ok: true, airBases: { length: 2 } });
    expect(store.expandAirBase(6)).toMatchObject({ ok: true, airBases: { length: 3 } });
    const atMaximum = logicalState();
    expect(store.expandAirBase(6)).toMatchObject({ ok: false, error: expect.stringMatching(/fully expanded/i) });
    expect(logicalState()).toBe(atMaximum);

    expect(store.expandAirBaseMaintenance(6)).toMatchObject({ ok: true, maintenanceLevel: 1 });
    expect(store.expandAirBaseMaintenance(6)).toMatchObject({ ok: true, maintenanceLevel: 2 });
    expect(store.expandAirBaseMaintenance(6)).toMatchObject({ ok: true, maintenanceLevel: 3 });
    expect(store.getSave().airBases.filter((base) => base.areaId === 6).every((base) => base.maintenanceLevel === 3)).toBe(true);
    expect(store.getSave().useItems.find((item) => item.id === 73)?.count).toBe(0);

    const first = store.createSlotItem(20);
    const second = store.createSlotItem(21);
    expect(store.setAirBasePlane(6, 1, 1, first.id).ok).toBe(true);
    expect(store.setAirBasePlane(6, 2, 1, second.id).ok).toBe(true);
    const beforeBauxite = store.getSave().materials.bauxite;
    expect(store.exchangeAirBasePlane(6, 2, 1, 1, first.id)).toMatchObject({
      ok: true,
      airBases: { length: 2 }
    });
    let bases = store.getSave().airBases.filter((base) => base.areaId === 6);
    expect(bases.find((base) => base.baseId === 1)?.squadrons[0].slotItemId).toBe(second.id);
    expect(bases.find((base) => base.baseId === 2)?.squadrons[0].slotItemId).toBe(first.id);
    expect(store.getSave().materials.bauxite).toBe(beforeBauxite);

    store.db.prepare(`
      UPDATE air_base_squadrons
      SET condition = 10, condition_updated_at = ?
      WHERE area_id = 6 AND base_id = 1 AND slot_item_id > 0
    `).run(now);
    expect(store.recoverAirBaseCondition(6, 1)).toMatchObject({
      ok: true,
      airBase: { squadrons: expect.arrayContaining([expect.objectContaining({ condition: 30 })]) }
    });
    const afterRation = logicalState();
    expect(store.recoverAirBaseCondition(6, 1)).toMatchObject({ ok: false, error: expect.stringMatching(/insufficient/i) });
    expect(logicalState()).toBe(afterRation);

    store.setAirBaseAction(6, 1, 4);
    vi.setSystemTime(now + 3 * 60_000);
    store.settle();
    bases = store.getSave().airBases.filter((base) => base.areaId === 6);
    expect(bases.find((base) => base.baseId === 1)?.squadrons[0].condition).toBe(40);

    expect(store.setAirBasePlane(6, 1, 1, -1).ok).toBe(true);
    expect(store.equipSlotItem(1, 0, second.id)).toBeNull();
    vi.setSystemTime(now + 9 * 60_000 - 1);
    store.settle();
    expect(store.equipSlotItem(1, 0, second.id)).toBeNull();
    vi.setSystemTime(now + 9 * 60_000);
    store.settle();
    expect(store.equipSlotItem(1, 0, second.id)).toBeTruthy();
    expect(store.integrityIssues()).toEqual([]);
  });

  it("refuses to remove referenced or locked ships and removes an unreferenced ship safely", () => {
    expect(store.destroyShip([1])).toMatchObject({ ok: false, error: expect.stringMatching(/deck/i) });
    const spare = store.createShip(80);
    store.toggleShipLock(spare.id, 1);
    expect(store.destroyShip([spare.id])).toMatchObject({ ok: false, error: expect.stringMatching(/locked/i) });
    store.toggleShipLock(spare.id, 0);

    expect(store.destroyShip([spare.id])).toMatchObject({
      ok: true,
      reward: [10, 20, 40, 3],
      destroyedIds: [spare.id]
    });
    expect(store.getSave().ships.some((ship) => ship.id === spare.id)).toBe(false);
    expect(store.integrityIssues()).toEqual([]);
  });

  it("keeps or destroys a scrapped ship's equipment according to the disposal flag", () => {
    const keptShip = store.createShip(80);
    const keptItem = store.createSlotItem(2);
    store.equipSlotItem(keptShip.id, 0, keptItem.id);
    expect(store.destroyShip([keptShip.id], { destroyEquipment: false })).toMatchObject({ ok: true });
    expect(store.getSave().slotItems.some((item) => item.id === keptItem.id)).toBe(true);

    const disposedShip = store.createShip(80);
    const disposedItem = store.createSlotItem(2);
    store.equipSlotItem(disposedShip.id, 0, disposedItem.id);
    store.lockSlotItem(disposedItem.id, 1);
    expect(store.destroyShip([disposedShip.id], { destroyEquipment: true })).toMatchObject({
      ok: false,
      error: expect.stringMatching(/locked equipment/i)
    });
    expect(store.getSave().ships.some((ship) => ship.id === disposedShip.id)).toBe(true);
    store.lockSlotItem(disposedItem.id, 0);
    expect(store.destroyShip([disposedShip.id], { destroyEquipment: true })).toMatchObject({ ok: true });
    expect(store.getSave().slotItems.some((item) => item.id === disposedItem.id)).toBe(false);
    expect(store.integrityIssues()).toEqual([]);
  });

  it("allows only one whitelisted initial ship claim for an empty port", () => {
    store.db.prepare("UPDATE decks SET ship_ids_json = ?").run(JSON.stringify([-1, -1, -1, -1, -1, -1]));
    store.db.prepare("DELETE FROM ships").run();
    store.db.prepare("UPDATE players SET initial_ship_claimed = 0 WHERE id = 1").run();

    expect(store.claimInitialShip(999_999)).toMatchObject({ ok: false, error: expect.stringMatching(/allowed/i) });
    const claimed = store.claimInitialShip(9);
    expect(claimed).toMatchObject({
      ok: true,
      ship: { masterId: 9 },
      save: { ships: [expect.objectContaining({ masterId: 9 })] }
    });
    expect(store.claimInitialShip(9)).toMatchObject({ ok: false, error: expect.stringMatching(/already/i) });
    expect(store.getSave().ships).toHaveLength(1);
    expect(store.integrityIssues()).toEqual([]);
  });

  it("keeps snapshots read-only and performs due work only through explicit settlement", () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    const start = Date.UTC(2026, 6, 1, 0, 0, 0);
    vi.setSystemTime(start);
    store.db.prepare(`
      UPDATE materials
      SET fuel = 100, ammo = 100, steel = 100, bauxite = 100, last_recovery_at = ?
      WHERE player_id = 1
    `).run(start);
    vi.setSystemTime(start + 180_000);

    expect(store.getSave().materials.fuel).toBe(100);
    expect(store.getSave().materials.fuel).toBe(100);
    store.settle();
    expect(store.getSave().materials).toMatchObject({ fuel: 103, ammo: 103, steel: 103, bauxite: 101 });
    const afterFirst = logicalState();
    store.settle();
    expect(logicalState()).toBe(afterFirst);
  });

  it("rolls back every settlement domain when a later settlement step fails", () => {
    const settledAt = Date.UTC(2026, 6, 6, 5, 0, 0);
    const recurringQuest = store.db.prepare(
      "SELECT id FROM quests WHERE period_key <> 'once' ORDER BY id LIMIT 1"
    ).get() as { id: number };
    store.db.prepare("UPDATE ships SET hp = 1 WHERE id = 1").run();
    store.db.prepare(
      "UPDATE repair_docks SET ship_id = 1, complete_time = ?, state = 1 WHERE id = 1"
    ).run(settledAt - 1);
    store.db.prepare(`
      UPDATE materials
      SET fuel = 100, ammo = 100, steel = 100, bauxite = 100, last_recovery_at = ?
      WHERE player_id = 1
    `).run(settledAt - 180_000);
    store.db.prepare("UPDATE quests SET period_key = 'stale-period' WHERE id = ?").run(recurringQuest.id);
    store.db.exec(`
      CREATE TRIGGER reject_quest_period_settlement
      BEFORE UPDATE ON quests
      WHEN NEW.id = ${recurringQuest.id}
      BEGIN
        SELECT RAISE(ABORT, 'injected quest settlement failure');
      END;
    `);
    const before = logicalState();

    expect(() => store.settle(settledAt)).toThrow(/injected quest settlement failure/i);
    expect(logicalState()).toBe(before);

    store.db.exec("DROP TRIGGER reject_quest_period_settlement");
    store.settle(settledAt);
    const save = store.getSave();
    expect(save.ships.find((ship) => ship.id === 1)?.hp).toBe(
      save.ships.find((ship) => ship.id === 1)?.maxHp
    );
    expect(save.repairDocks.find((dock) => dock.id === 1)).toMatchObject({ shipId: 0, state: 0 });
    expect(save.materials.fuel).toBe(103);
    expect(save.quests.find((quest) => quest.id === recurringQuest.id)?.periodKey).not.toBe("stale-period");
  });

  it("fails closed on a future schema without changing database bytes", async () => {
    store.updateComment("future schema sentinel");
    store.db.prepare("UPDATE schema_meta SET version = ?").run(STATE_SCHEMA_VERSION + 1);
    store.close();
    const before = await readFile(databasePath);

    expect(() => createStateStore({ databasePath })).toThrow(/newer than supported/i);
    expect(await readFile(databasePath)).toEqual(before);
  });

  function logicalState() {
    const save = store.getSave();
    return JSON.stringify({
      materials: save.materials,
      ships: save.ships,
      slotItems: save.slotItems,
      relocatingSlotItemIds: save.relocatingSlotItemIds,
      decks: save.decks,
      repairDocks: save.repairDocks,
      airBases: save.airBases,
      quests: save.quests,
      useItems: save.useItems
    });
  }
});
