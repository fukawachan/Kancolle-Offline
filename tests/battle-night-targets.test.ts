import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  createNightBattlePayload,
  createSortieBattle,
  type BattleRecord,
  type BattleUnitSnapshot
} from "../src/kcsapi/battle.js";
import { createStateStore, type StateStore } from "../src/state/store.js";

describe("night battle target-specific mechanics", () => {
  let tempDir: string;
  let store: StateStore;

  beforeEach(async () => {
    tempDir = await mkdtemp(path.join(tmpdir(), "kancolle-night-targets-"));
    store = createStateStore({ databasePath: path.join(tempDir, "save.sqlite") });
    store.registerAccount(15);
    store.startSortie(1, 1, 1);
  });

  afterEach(async () => {
    store.close();
    await rm(tempDir, { recursive: true, force: true });
  });

  it("forces ordinary single-fleet night ASW into the scratch-damage band", () => {
    const day = createSortieBattle(store.getSave(), { formation: 1 });
    const record = targetRecord(day.record, {
      friendly: { level: 99, baseAsw: 70, asw: 70, accuracy: 999 },
      enemy: { targetKind: "submarine", maxHp: 100, armor: 999, evasion: 0 },
      enemyHp: 100
    });
    let damage = 0;
    for (let deckId = 1; deckId <= 32 && damage === 0; deckId += 1) {
      damage = firstFriendlyNightDamage(createNightBattlePayload({ ...record, deckId }));
    }

    expect(damage).toBeGreaterThanOrEqual(6);
    expect(damage).toBeLessThanOrEqual(13);
  });

  it("ignores torpedo stat against installations while retaining night firepower", () => {
    const day = createSortieBattle(store.getSave(), { formation: 1 });
    const base = targetRecord(day.record, {
      friendly: { level: 99, baseFirepower: 80, firepower: 80, accuracy: 999 },
      enemy: { targetKind: "installation", maxHp: 999, armor: 0, evasion: 0 },
      enemyHp: 999
    });
    let noTorpedoDamage = 0;
    let enormousTorpedoDamage = 0;
    for (let deckId = 1; deckId <= 32 && noTorpedoDamage === 0; deckId += 1) {
      const noTorpedo = createNightBattlePayload({
        ...withFirstFriendly(base, { baseTorpedo: 0, torpedo: 0 }),
        deckId
      });
      const enormousTorpedo = createNightBattlePayload({
        ...withFirstFriendly(base, { baseTorpedo: 500, torpedo: 500 }),
        deckId
      });
      noTorpedoDamage = firstFriendlyNightDamage(noTorpedo);
      enormousTorpedoDamage = firstFriendlyNightDamage(enormousTorpedo);
    }

    expect(noTorpedoDamage).toBeGreaterThan(0);
    expect(enormousTorpedoDamage).toBe(noTorpedoDamage);
  });

  it("reports the activated star-shell ship and stays near the public 71% rate", () => {
    const starShell = store.createSlotItem(101);
    expect(store.equipSlotItem(1, 2, starShell.id)).toBeTruthy();
    const day = createSortieBattle(store.getSave(), { formation: 1 });
    const record = {
      ...day.record,
      after: { ...day.record.after, fNowHps: [...day.record.before.fNowHps] }
    };
    const trials = 512;
    let activations = 0;
    for (let deckId = 1; deckId <= trials; deckId += 1) {
      const payload = createNightBattlePayload({ ...record, deckId });
      if ((payload.api_flare_pos as number[])[0] === 0) activations += 1;
    }

    expect(activations / trials).toBeGreaterThan(0.65);
    expect(activations / trials).toBeLessThan(0.77);
  });
});

function targetRecord(
  record: BattleRecord,
  changes: {
    friendly: Partial<BattleUnitSnapshot>;
    enemy: Partial<BattleUnitSnapshot>;
    enemyHp: number;
  }
): BattleRecord {
  return {
    ...record,
    after: {
      ...record.after,
      fNowHps: [...record.before.fNowHps],
      eNowHps: [changes.enemyHp, 0, 0, 0, 0, 0]
    },
    units: {
      ...record.units!,
      friendly: record.units!.friendly.map((unit, index) =>
        index === 0 ? { ...unit, ...changes.friendly } : unit
      ),
      enemy: record.units!.enemy.map((unit, index) =>
        index === 0 ? { ...unit, ...changes.enemy } : { ...unit, maxHp: 1 }
      )
    }
  };
}

function withFirstFriendly(record: BattleRecord, changes: Partial<BattleUnitSnapshot>): BattleRecord {
  return {
    ...record,
    units: {
      ...record.units!,
      friendly: record.units!.friendly.map((unit, index) =>
        index === 0 ? { ...unit, ...changes } : unit
      )
    }
  };
}

function firstFriendlyNightDamage(payload: Record<string, unknown>) {
  const hougeki = payload.api_hougeki as {
    api_at_eflag: number[];
    api_damage: number[][];
  };
  const index = hougeki.api_at_eflag.indexOf(0);
  return index < 0 ? 0 : hougeki.api_damage[index]?.[0] ?? 0;
}
