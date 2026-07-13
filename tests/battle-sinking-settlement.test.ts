import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createSortieBattle } from "../src/kcsapi/battle.js";
import { ENEMY_UNIT_TEMPLATES } from "../src/master/sortie-data.js";
import { createStateStore, type StateStore } from "../src/state/store.js";

describe("battle sinking settlement", () => {
  let tempDir: string;
  let store: StateStore;

  beforeEach(async () => {
    tempDir = await mkdtemp(path.join(tmpdir(), "kancolle-sinking-"));
    store = createStateStore({ databasePath: path.join(tempDir, "save.sqlite") });
    store.registerAccount(15);
  });

  afterEach(async () => {
    store.close();
    await rm(tempDir, { recursive: true, force: true });
  });

  it("removes a permitted casualty, its equipment, and every persistent fleet reference once", () => {
    const casualty = store.createShip(9);
    const gun = store.createSlotItem(2);
    const turbine = store.createSlotItem(33);
    expect(store.equipSlotItem(casualty.id, 0, gun.id)).toBeTruthy();
    store.db.prepare("UPDATE ships SET ex_slot_id = 0 WHERE id = ?").run(casualty.id);
    expect(store.equipExSlotItem(casualty.id, turbine.id)).toBeTruthy();
    store.lockSlotItem(gun.id, 1);
    store.lockSlotItem(turbine.id, 1);
    store.toggleShipLock(casualty.id, 1);
    expect(store.changeDeckShip(1, 1, casualty.id)).toBeTruthy();
    expect(store.registerPresetDeck(1, 1, "before sinking")?.shipIds).toContain(casualty.id);
    store.db.prepare("UPDATE ships SET hp = 1, max_hp = 15 WHERE id = ?").run(casualty.id);
    expect(store.startSortie(1, 1, 1)).toBeTruthy();
    store.db.prepare("UPDATE sortie_sessions SET seed = 0 WHERE id = 1").run();

    const enemy = ENEMY_UNIT_TEMPLATES[1501];
    const originalEnemy = {
      ...enemy,
      slots: [...enemy.slots],
      onSlot: [...enemy.onSlot]
    };
    let generated: ReturnType<typeof createSortieBattle>;
    try {
      Object.assign(enemy, {
        hp: 999,
        armor: 999,
        firepower: 999,
        torpedo: 999,
        accuracy: 999,
        evasion: 0,
        range: 4,
        slots: [],
        onSlot: []
      });
      generated = createSortieBattle(store.getSave(), { formation: 1 });
    } finally {
      Object.assign(enemy, originalEnemy);
    }
    const casualtyIndex = generated.record.shipIds.indexOf(casualty.id);
    expect(casualtyIndex).toBeGreaterThan(0);
    expect(generated.record.before.fNowHps[casualtyIndex]).toBe(1);
    expect(generated.record.after.fNowHps[casualtyIndex]).toBe(0);
    expect(generated.record.damageControlActivations).toEqual([]);
    store.recordSortieBattle(generated.record as unknown as Record<string, unknown>);

    expect(store.applySortieBattleResult().applied).toBe(true);
    const settled = store.getSave();
    expect(settled.ships.some((ship) => ship.id === casualty.id)).toBe(false);
    expect(settled.slotItems.some((item) => item.id === gun.id || item.id === turbine.id)).toBe(false);
    expect(settled.decks.flatMap((deck) => deck.shipIds)).not.toContain(casualty.id);
    expect(settled.presetDecks.flatMap((preset) => preset.shipIds)).not.toContain(casualty.id);
    const routingShips = (settled.sortieSession?.state.fleet as { ships?: Array<{ id?: number }> } | undefined)?.ships ?? [];
    expect(routingShips.map((ship) => ship.id)).not.toContain(casualty.id);
    expect(store.integrityIssues()).toEqual([]);

    const once = JSON.stringify(settled);
    expect(store.applySortieBattleResult().applied).toBe(false);
    expect(JSON.stringify(store.getSave())).toBe(once);
  });

  it("rolls the entire settlement back when a casualty has contradictory equipment ownership", () => {
    const casualty = store.createShip(9);
    const item = store.createSlotItem(2);
    expect(store.equipSlotItem(casualty.id, 0, item.id)).toBeTruthy();
    expect(store.changeDeckShip(1, 1, casualty.id)).toBeTruthy();
    expect(store.startSortie(1, 1, 1)).toBeTruthy();

    const generated = createSortieBattle(store.getSave(), { formation: 1 });
    const casualtyIndex = generated.record.shipIds.indexOf(casualty.id);
    const record = {
      ...generated.record,
      after: {
        ...generated.record.after,
        fNowHps: generated.record.after.fNowHps.map((hp, index) =>
          index === casualtyIndex ? 0 : hp
        )
      }
    };
    store.recordSortieBattle(record as unknown as Record<string, unknown>);

    const flagshipId = generated.record.shipIds[0];
    store.db.prepare("UPDATE ships SET slot_ids_json = ? WHERE id = ?")
      .run(JSON.stringify([item.id, -1, -1, -1, -1]), flagshipId);
    const before = JSON.stringify(store.getSave());

    expect(() => store.applySortieBattleResult()).toThrow(/invalid equipment ownership/i);
    expect(JSON.stringify(store.getSave())).toBe(before);
  });
});
