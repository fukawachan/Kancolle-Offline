import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
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

  it("creates and seeds a reusable local save", () => {
    const save = store.getSave();

    expect(save.player).toMatchObject({
      id: 1,
      nickname: "Local Admiral",
      level: expect.any(Number)
    });
    expect(save.materials.fuel).toBeGreaterThan(0);
    expect(save.decks).toHaveLength(4);
    expect(save.ships.length).toBeGreaterThan(0);
    expect(save.slotItems.length).toBeGreaterThan(0);
  });

  it("persists mutations across store instances", () => {
    store.updateComment("persistent local save");
    store.renameDeck(1, "Persisted Fleet");
    store.close();

    store = createStateStore({ databasePath });
    const save = store.getSave();

    expect(save.player.comment).toBe("persistent local save");
    expect(save.decks[0].name).toBe("Persisted Fleet");
  });

  it("applies material and inventory changes atomically", () => {
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
});
