import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createSortieBattle, createNightBattlePayload, resolveDamage } from "../src/kcsapi/battle.js";
import { createStateStore, type StateStore } from "../src/state/store.js";

describe("sortie battle simulation", () => {
  let tempDir: string;
  let store: StateStore;

  beforeEach(async () => {
    tempDir = await mkdtemp(path.join(tmpdir(), "kancolle-battle-"));
    store = createStateStore({ databasePath: path.join(tempDir, "save.sqlite") });
    store.registerAccount(15);
    store.startSortie(1, 1, 1);
  });

  afterEach(async () => {
    store.close();
    await rm(tempDir, { recursive: true, force: true });
  });

  it("uses the documented armor roll and ammo modifier in deterministic damage", () => {
    expect(resolveDamage({ attackPower: 30, armor: 5, armorRoll: 2, ammoModifier: 1 })).toBe(25);
    expect(resolveDamage({ attackPower: 4, armor: 20, armorRoll: 0, ammoModifier: 1, targetHp: 20 })).toBe(1);
    expect(resolveDamage({ attackPower: 30, armor: 5, armorRoll: 2, ammoModifier: 0.4 })).toBe(10);
  });

  it("builds a deterministic day battle with shelling, torpedo, and result records", () => {
    const battle = createSortieBattle(store.getSave(), { formation: 2 });
    const payload = battle.payload;

    expect(payload.api_formation).toEqual([2, expect.any(Number), expect.any(Number)]);
    expect(payload.api_ship_ke).toEqual([1501, 1502, -1, -1, -1, -1]);
    for (const key of ["api_f_nowhps", "api_f_maxhps", "api_e_nowhps", "api_e_maxhps", "api_fParam", "api_eParam", "api_eSlot"]) {
      expect(payload[key], key).toHaveLength(6);
    }
    expect(payload.api_nowhps).toHaveLength(13);
    expect(payload.api_maxhps).toHaveLength(13);
    expect(payload.api_hougeki1.api_at_list.length).toBeGreaterThan(0);
    expect(payload.api_hougeki1.api_at_eflag).toHaveLength(payload.api_hougeki1.api_at_list.length);
    expect(payload.api_hougeki1.api_df_list[0][0]).toBeGreaterThanOrEqual(7);
    expect(payload.api_raigeki).toMatchObject({
      api_frai: expect.any(Array),
      api_erai: expect.any(Array),
      api_fdam: expect.any(Array),
      api_edam: expect.any(Array),
      api_fydam: expect.any(Array),
      api_eydam: expect.any(Array)
    });
    const raigeki = payload.api_raigeki!;
    expect(raigeki.api_frai).toHaveLength(6);
    expect(raigeki.api_erai).toHaveLength(6);
    expect(battle.record.result.rank).toMatch(/[SABC]/);
    expect(battle.record.result.mvp).toBeGreaterThanOrEqual(1);
  });

  it("adds client-required night shelling fields", () => {
    const battle = createSortieBattle(store.getSave(), { formation: 1 });
    const night = createNightBattlePayload(battle.record);
    const hougeki = night.api_hougeki as any;

    expect(hougeki.api_sp_list).toHaveLength(hougeki.api_df_list.length);
    expect(hougeki.api_n_mother_list).toHaveLength(hougeki.api_df_list.length);
  });
});
