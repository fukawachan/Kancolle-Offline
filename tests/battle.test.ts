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
    const activeFriendCount = payload.api_f_nowhps.filter((hp: number) => hp > 0).length;
    const activeEnemyCount = payload.api_ship_ke.filter((id: number) => id > 0).length;
    for (const [index, attacker] of payload.api_hougeki1.api_at_list.entries()) {
      const attackerIsEnemy = payload.api_hougeki1.api_at_eflag[index] === 1;
      expect(attacker).toBeGreaterThanOrEqual(0);
      expect(attacker).toBeLessThan(attackerIsEnemy ? activeEnemyCount : activeFriendCount);
      for (const defender of payload.api_hougeki1.api_df_list[index]) {
        expect(defender).toBeGreaterThanOrEqual(0);
        expect(defender).toBeLessThan(attackerIsEnemy ? activeFriendCount : activeEnemyCount);
      }
    }
    for (const slotIds of payload.api_eSlot.slice(0, 2)) {
      expect(slotIds[0]).toBeGreaterThan(0);
    }
    for (const slotIds of payload.api_hougeki1.api_si_list) {
      for (const slotId of slotIds) expect(slotId).toBeGreaterThan(0);
    }
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
    for (const [attackerIndex, target] of raigeki.api_frai.entries()) {
      if (target < 0) continue;
      expect(target).toBeLessThan(activeEnemyCount);
      expect(raigeki.api_edam[target]).toBeGreaterThanOrEqual(raigeki.api_fydam[attackerIndex]);
    }
    expect(battle.record.result.rank).toMatch(/[SABC]/);
    expect(battle.record.result.mvp).toBeGreaterThanOrEqual(1);
  });

  it("does not emit an aviation phase when neither side has active aircraft", () => {
    const battle = createSortieBattle(store.getSave(), { formation: 1 });

    expect(battle.payload.api_stage_flag).toEqual([0, 0, 0]);
    expect(battle.payload.api_kouku).toBeNull();
  });

  it("emits a client-playable aviation phase before shelling when a carrier has aircraft", () => {
    const akagi = store.createShip(277);
    const fighter = store.createSlotItem(20);
    store.equipSlotItem(akagi.id, 0, fighter.id);
    store.changeDeckShip(1, 0, akagi.id);

    const battle = createSortieBattle(store.getSave(), { formation: 1 });
    const kouku = battle.payload.api_kouku;

    expect(battle.payload.api_stage_flag).toEqual([1, 1, 1]);
    expect(kouku).not.toBeNull();
    expect(kouku).toMatchObject({
      api_plane_from: [[1], []],
      api_stage1: {
        api_f_count: 20,
        api_f_lostcount: 0,
        api_e_count: 0,
        api_e_lostcount: 0,
        api_disp_seiku: 1,
        api_touch_plane: [-1, -1]
      },
      api_stage2: {
        api_f_count: 20,
        api_f_lostcount: 0,
        api_e_count: 0,
        api_e_lostcount: 0
      }
    });
    const stage3 = kouku!.api_stage3;
    for (const key of ["api_frai_flag", "api_erai_flag", "api_fbak_flag", "api_ebak_flag", "api_fcl_flag", "api_ecl_flag", "api_fdam", "api_edam"]) {
      expect(stage3[key as keyof typeof stage3], key).toHaveLength(6);
    }
  });

  it("adds client-required night shelling fields", () => {
    const battle = createSortieBattle(store.getSave(), { formation: 1 });
    const night = createNightBattlePayload(battle.record);
    const hougeki = night.api_hougeki as any;

    expect(hougeki.api_sp_list).toHaveLength(hougeki.api_df_list.length);
    expect(hougeki.api_n_mother_list).toHaveLength(hougeki.api_df_list.length);
  });
});
