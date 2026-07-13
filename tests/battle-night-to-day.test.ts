import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  battlePhaseSequence,
  createCombinedBattle,
  createSortieBattle
} from "../src/kcsapi/battle.js";
import { BATTLE_ENDPOINT_MODES, type BattlePhaseName } from "../src/kcsapi/battle/data/endpoint-modes.js";
import { createStateStore, type StateStore } from "../src/state/store.js";

describe("night-to-day phase execution", () => {
  let tempDir: string;
  let store: StateStore;

  beforeEach(async () => {
    tempDir = await mkdtemp(path.join(tmpdir(), "kancolle-night-to-day-"));
    store = createStateStore({ databasePath: path.join(tempDir, "save.sqlite") });
    store.registerAccount(15);
    store.startSortie(1, 1, 1);
  });

  afterEach(async () => {
    store.close();
    await rm(tempDir, { recursive: true, force: true });
  });

  it("applies the declared night phase before daytime phases", () => {
    store.db.prepare("UPDATE sortie_sessions SET seed = 0 WHERE id = 1").run();

    const battle = createSortieBattle(store.getSave(), {
      endpoint: "sortieNightToDay",
      formation: 1
    });

    expect(battle.record.phaseSequence).toEqual(["night", "kouku", "hougeki1", "raigeki"]);
    expect(battle.payload.api_hougeki).toEqual(battle.record.phases.night);
    expect(battle.payload.api_touch_plane).toEqual(battle.record.nightContact?.touchPlane);
    expect(battle.payload.api_flare_pos).toEqual([-1, -1]);
    expect(battle.record.phases.night?.api_damage.flat().reduce((sum, damage) => sum + damage, 0))
      .toBeGreaterThan(0);
    expect(battle.record.after.eNowHps[0]).toBe(0);
    // The deterministic night salvo sinks the only enemy. If night were still
    // ignored or executed after day, this daytime phase would contain attacks.
    expect(battle.record.phases.hougeki1.api_at_list).toEqual([]);
  });

  it("uses the same ordered executor for enemy-combined night-to-day", () => {
    const escort = store.createShip(9);
    store.changeDeckShip(2, 0, escort.id);

    const battle = createCombinedBattle(store.getSave(), {
      endpoint: "combinedEcNightToDay",
      formation: 1
    });

    expect(battle.record.phaseSequence).toEqual(["night", "kouku", "hougeki1", "raigeki"]);
    expect(battle.record.phases.night).toBeDefined();
    expect(battle.payload.api_hougeki).toEqual(battle.record.phases.night);
    expect(battle.payload.api_touch_plane).toEqual(battle.record.nightContact?.touchPlane);
  });

  it("fails closed when a configured phase is unsupported", () => {
    const mode = BATTLE_ENDPOINT_MODES["api_req_sortie/night_to_day"];
    const original = [...mode.phaseSequence];
    try {
      mode.phaseSequence = ["night", "unknown-phase" as BattlePhaseName];
      expect(() => battlePhaseSequence("sortieNightToDay")).toThrow(/unsupported phase/i);
    } finally {
      mode.phaseSequence = original;
    }
  });
});
