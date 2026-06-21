import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createCombinedBattle, createPracticeBattle, createSortieBattle, createNightBattlePayload, resolveDamage } from "../src/kcsapi/battle.js";
import { ENEMY_UNIT_TEMPLATES } from "../src/master/sortie-data.js";
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
    store.db.prepare("UPDATE sortie_sessions SET seed = 0 WHERE id = 1").run();
    const battle = createSortieBattle(store.getSave(), { formation: 2 });
    const payload = battle.payload;
    const enemyIds = payload.api_ship_ke.filter((id: number) => id > 0);

    expect(payload.api_formation).toEqual([2, expect.any(Number), expect.any(Number)]);
    expect(enemyIds).toHaveLength(1);
    expect([1501, 1502, 1503]).toContain(enemyIds[0]);
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
    for (const slotIds of payload.api_eSlot.slice(0, enemyIds.length)) {
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
    expect(battle.record.result.rank).toMatch(/[SABCDE]/);
    expect(battle.record.result.mvp).toBeGreaterThanOrEqual(1);
  });

  it("emits client-readable placeholders for optional battle phases", () => {
    const battle = createSortieBattle(store.getSave(), { formation: 1 });
    const payload = battle.payload;

    expect(payload).toMatchObject({
      api_air_base_attack: null,
      api_opening_taisen: null,
      api_opening_atack: null,
      api_kouku2: null,
      api_friendly_info: null,
      api_friendly_kouku: null,
      api_friendly_battle: null
    });
  });

  it("compacts legacy deck holes before computing friendly battle HP slots", () => {
    store.db.prepare("UPDATE decks SET ship_ids_json = ? WHERE id = 1")
      .run(JSON.stringify([1, 2, -1, 3, 4, -1]));

    const save = store.getSave();
    const expectedHps = [1, 2, 3, 4].map((shipId) => save.ships.find((ship) => ship.id === shipId)!.hp);
    const battle = createSortieBattle(save, { formation: 1 });

    expect(save.decks[0].shipIds).toEqual([1, 2, 3, 4, -1, -1]);
    expect(battle.record.shipIds).toEqual([1, 2, 3, 4, -1, -1]);
    expect(battle.payload.api_f_nowhps).toEqual([...expectedHps, 0, 0]);
  });

  it("does not emit an aviation phase when neither side has active aircraft", () => {
    const battle = createSortieBattle(store.getSave(), { formation: 1 });

    expect(battle.payload.api_stage_flag).toEqual([0, 0, 0]);
    expect(battle.payload.api_kouku).toBeNull();
  });

  it("resolves fighter combat and opening airstrike damage before shelling", () => {
    const akagi = store.createShip(277);
    const fighter = store.createSlotItem(20);
    const bomber = store.createSlotItem(23);
    store.equipSlotItem(akagi.id, 0, fighter.id);
    store.equipSlotItem(akagi.id, 2, bomber.id);
    store.changeDeckShip(1, 0, akagi.id);
    store.db.prepare("UPDATE sortie_sessions SET seed = 0 WHERE id = 1").run();

    const battle = createSortieBattle(store.getSave(), { formation: 1 });
    const kouku = battle.payload.api_kouku;

    expect(battle.payload.api_stage_flag).toEqual([1, 1, 1]);
    expect(kouku).not.toBeNull();
    expect(kouku).toMatchObject({
      api_plane_from: [[1], []],
      api_stage1: {
        api_f_count: 52,
        api_f_lostcount: expect.any(Number),
        api_e_count: 0,
        api_e_lostcount: 0,
        api_disp_seiku: 1,
        api_touch_plane: expect.any(Array)
      },
      api_stage2: {
        api_f_count: expect.any(Number),
        api_f_lostcount: 0,
        api_e_count: 0,
        api_e_lostcount: 0
      }
    });
    expect(kouku!.api_stage1.api_f_lostcount).toBeGreaterThan(0);
    if (!kouku?.api_stage2 || !kouku.api_stage3) {
      throw new Error("expected interception and airstrike stages");
    }
    expect(kouku.api_stage2.api_f_count).toBeLessThan(52);
    expect(kouku.api_stage3.api_edam.some((damage) => damage > 0)).toBe(true);
    expect(battle.record.aircraftLosses?.friendly[akagi.id]).toBeGreaterThan(0);
    const stage3 = kouku.api_stage3;
    for (const key of ["api_frai_flag", "api_erai_flag", "api_fbak_flag", "api_ebak_flag", "api_fcl_flag", "api_ecl_flag", "api_fdam", "api_edam"]) {
      expect(stage3[key as keyof typeof stage3], key).toHaveLength(6);
    }
    expect(stage3.api_frai_flag).toEqual([0, 0, 0, 0, 0, 0]);
    expect(stage3.api_fbak_flag).toEqual([0, 0, 0, 0, 0, 0]);
    expect(stage3.api_fdam).toEqual([0, 0, 0, 0, 0, 0]);
    expect(stage3.api_erai_flag.some((flag) => flag > 0) || stage3.api_ebak_flag.some((flag) => flag > 0)).toBe(true);
  });

  it("reports fighter-only aerial combat without interception or airstrike stages", () => {
    const akagi = store.createShip(277);
    const fighter = store.createSlotItem(20);
    store.equipSlotItem(akagi.id, 0, fighter.id);
    store.changeDeckShip(1, 0, akagi.id);

    const battle = createSortieBattle(store.getSave(), { formation: 1 });

    expect(battle.payload.api_stage_flag).toEqual([1, 0, 0]);
    expect(battle.payload.api_kouku?.api_stage2).toBeNull();
    expect(battle.payload.api_kouku?.api_stage3).toBeNull();
  });

  it("uses practice enemy carrier loadouts for aerial combat", () => {
    const rival = {
      id: 1,
      name: "Carrier Practice",
      level: 120,
      rank: "元帥",
      comment: "carrier loadout",
      flag: 1,
      medals: 4,
      ships: [
        {
          id: 101,
          masterId: 277,
          level: 120,
          star: 5,
          slotMasterIds: [22, 52, 23, 54],
          onSlot: [18, 18, 27, 10, 0]
        }
      ]
    };

    const battle = createPracticeBattle(store.getSave(), {
      practiceEnemyId: 1,
      practiceRivals: [rival],
      formation: 1
    });
    const kouku = battle.payload.api_kouku;

    expect(battle.payload.api_eSlot[0]).toEqual([22, 52, 23, 54, -1]);
    expect(kouku).not.toBeNull();
    expect(kouku?.api_plane_from[1]).toEqual([1]);
    expect(kouku?.api_stage1.api_e_count).toBeGreaterThan(0);
    expect(
      kouku?.api_stage3?.api_frai_flag.some((flag) => flag > 0) ||
      kouku?.api_stage3?.api_fbak_flag.some((flag) => flag > 0)
    ).toBe(true);
  });

  it("requires opening ASW stat eligibility before attacking submarine practice enemies", () => {
    const sonar = store.createSlotItem(46);
    store.equipSlotItem(1, 0, sonar.id);
    const rival = {
      id: 1,
      name: "Sub Practice",
      level: 99,
      rank: "元帥",
      comment: "submarine",
      flag: 1,
      medals: 4,
      ships: [
        {
          id: 101,
          masterId: 126,
          level: 99,
          star: 5,
          slotMasterIds: [],
          onSlot: [0, 0, 0, 0, 0]
        }
      ]
    };

    const lowLevel = createPracticeBattle(store.getSave(), {
      practiceEnemyId: 1,
      practiceRivals: [rival],
      formation: 1
    });

    expect(lowLevel.payload.api_opening_taisen).toBeNull();

    store.db.prepare("UPDATE ships SET level = 99 WHERE id = 1").run();
    const highLevel = createPracticeBattle(store.getSave(), {
      practiceEnemyId: 1,
      practiceRivals: [rival],
      formation: 1
    });

    expect(highLevel.payload.api_opening_taisen).not.toBeNull();
    expect(highLevel.payload.api_opening_taisen!.api_at_list).toContain(0);
  });

  it("treats a low-level fleet crushed by high-level practice enemies as a defeat", () => {
    const rival = {
      id: 1,
      name: "High Level Practice",
      level: 120,
      rank: "元帥",
      comment: "high level fleet",
      flag: 1,
      medals: 4,
      ships: [131, 143, 150, 151, 152, 153].map((masterId, index) => ({
        id: 101 + index,
        masterId,
        level: 120,
        star: 5,
        slotMasterIds: [9, 9, 36, 25],
        onSlot: [0, 0, 0, 5, 0]
      }))
    };

    const battle = createPracticeBattle(store.getSave(), {
      practiceEnemyId: 1,
      practiceRivals: [rival],
      formation: 1
    });

    expect(battle.record.after.fNowHps.some((hp) => hp === 1)).toBe(true);
    expect(["D", "E"]).toContain(battle.record.result.rank);
  });

  it("reports interception without an airstrike when all attack aircraft are shot down", () => {
    const akagi = store.createShip(277);
    const bomber = store.createSlotItem(23);
    store.equipSlotItem(akagi.id, 2, bomber.id);
    store.changeDeckShip(1, 0, akagi.id);
    store.db.prepare("UPDATE ships SET onslot_json = ? WHERE id = ?").run(JSON.stringify([0, 0, 2, 0, 0]), akagi.id);

    const enemies = [1501, 1502, 1503].map((id) => ENEMY_UNIT_TEMPLATES[id]);
    const originalAa = enemies.map((enemy) => enemy.aa);
    for (const enemy of enemies) enemy.aa = 100;
    try {
      const battle = createSortieBattle(store.getSave(), { formation: 1 });

      expect(battle.payload.api_stage_flag).toEqual([1, 1, 0]);
      expect(battle.payload.api_kouku?.api_stage2?.api_f_lostcount).toBeGreaterThan(0);
      expect(battle.payload.api_kouku?.api_stage3).toBeNull();
    } finally {
      enemies.forEach((enemy, index) => {
        enemy.aa = originalAa[index];
      });
    }
  });

  it("selects generic anti-air cut-in items by pattern instead of equipment order", () => {
    const defender = store.createShip(1);
    const radar = store.createSlotItem(30);
    const highAngleA = store.createSlotItem(3);
    const highAngleB = store.createSlotItem(10);
    store.equipSlotItem(defender.id, 0, radar.id);
    store.equipSlotItem(defender.id, 1, highAngleA.id);
    store.equipSlotItem(defender.id, 2, highAngleB.id);
    store.changeDeckShip(1, 0, defender.id);
    const rival = {
      id: 1,
      name: "Carrier Practice",
      level: 120,
      rank: "元帥",
      comment: "carrier loadout",
      flag: 1,
      medals: 4,
      ships: [
        {
          id: 101,
          masterId: 277,
          level: 120,
          star: 5,
          slotMasterIds: [23],
          onSlot: [18, 0, 0, 0, 0]
        }
      ]
    };

    const battle = createPracticeBattle(store.getSave(), {
      practiceEnemyId: 1,
      practiceRivals: [rival],
      formation: 1
    });

    expect(battle.payload.api_kouku?.api_air_fire).toMatchObject({
      api_idx: 0,
      api_kind: 5,
      api_use_items: [3, 10, 30]
    });
  });

  it("emits complete two-hit arrays for daytime double attacks after the first hit sinks", () => {
    const nagato = store.createShip(80);
    const mainGunA = store.createSlotItem(7);
    const mainGunB = store.createSlotItem(8);
    const seaplane = store.createSlotItem(25);
    store.equipSlotItem(nagato.id, 0, mainGunA.id);
    store.equipSlotItem(nagato.id, 1, mainGunB.id);
    store.equipSlotItem(nagato.id, 2, seaplane.id);
    store.changeDeckShip(1, 0, nagato.id);
    store.db.prepare("UPDATE sortie_sessions SET seed = 0 WHERE id = 1").run();

    const battle = createSortieBattle(store.getSave(), { formation: 1 });
    const hougeki = battle.payload.api_hougeki1;
    const attackIndex = hougeki.api_at_type.indexOf(2);

    expect(attackIndex).toBeGreaterThanOrEqual(0);
    expect(hougeki.api_damage[attackIndex][0]).toBe(20);
    expect(hougeki.api_df_list[attackIndex]).toEqual([0, 0]);
    expect(hougeki.api_damage[attackIndex]).toHaveLength(2);
    expect(hougeki.api_damage[attackIndex][1]).toBe(0);
    expect(hougeki.api_cl_list[attackIndex]).toHaveLength(2);
    expect(hougeki.api_si_list[attackIndex]).toEqual([7, 8]);
  });

  it("runs a second daytime shelling round when a battleship is present", () => {
    const nagato = store.createShip(80);
    store.changeDeckShip(1, 0, nagato.id);
    store.db.prepare("UPDATE sortie_sessions SET seed = 0 WHERE id = 1").run();
    const enemies = [1501, 1502, 1503].map((id) => ENEMY_UNIT_TEMPLATES[id]);
    const originals = enemies.map((enemy) => ({ hp: enemy.hp, armor: enemy.armor }));
    for (const enemy of enemies) {
      enemy.hp = 999;
      enemy.armor = 999;
    }
    try {
      const battle = createSortieBattle(store.getSave(), { formation: 1 });

      expect(battle.payload.api_hougeki2).not.toBeNull();
      expect(battle.payload.api_hougeki2!.api_at_list.length).toBeGreaterThan(0);
      expect(battle.record.phases.hougeki2?.api_at_list.length).toBe(battle.payload.api_hougeki2!.api_at_list.length);
    } finally {
      enemies.forEach((enemy, index) => {
        enemy.hp = originals[index].hp;
        enemy.armor = originals[index].armor;
      });
    }
  });

  it("resolves opening torpedo attacks before daytime shelling", () => {
    const kitakami = store.createShip(119);
    const midgetSub = store.createSlotItem(41);
    store.equipSlotItem(kitakami.id, 0, midgetSub.id);
    store.changeDeckShip(1, 0, kitakami.id);
    store.db.prepare("UPDATE sortie_sessions SET seed = 0 WHERE id = 1").run();
    const enemies = [1501, 1502, 1503].map((id) => ENEMY_UNIT_TEMPLATES[id]);
    const originals = enemies.map((enemy) => ({ hp: enemy.hp, armor: enemy.armor }));
    for (const enemy of enemies) {
      enemy.hp = 999;
      enemy.armor = 999;
    }
    try {
      const battle = createSortieBattle(store.getSave(), { formation: 1 });
      const opening = battle.payload.api_opening_atack;

      expect(opening).not.toBeNull();
      expect(opening.api_frai).toHaveLength(6);
      expect(opening.api_frai[0]).toBeGreaterThanOrEqual(0);
      expect(opening.api_edam[opening.api_frai[0]]).toBeGreaterThanOrEqual(opening.api_fydam[0]);
      expect(battle.record.phases.openingAtack).toBe(opening);
      expect(battle.payload.api_hougeki1.api_at_list.length).toBeGreaterThan(0);
    } finally {
      enemies.forEach((enemy, index) => {
        enemy.hp = originals[index].hp;
        enemy.armor = originals[index].armor;
      });
    }
  });

  it("does not encode a single main gun and seaplane as a double attack", () => {
    const nagato = store.createShip(80);
    const mainGun = store.createSlotItem(7);
    const seaplane = store.createSlotItem(25);
    store.equipSlotItem(nagato.id, 0, mainGun.id);
    store.equipSlotItem(nagato.id, 2, seaplane.id);
    store.changeDeckShip(1, 0, nagato.id);

    const battle = createSortieBattle(store.getSave(), { formation: 1 });

    expect(battle.payload.api_hougeki1.api_at_type).not.toContain(2);
  });

  it("prevents standard carriers from shelling at moderate or heavy damage", () => {
    const akagi = store.createShip(277);
    const bomber = store.createSlotItem(23);
    store.equipSlotItem(akagi.id, 0, bomber.id);
    store.changeDeckShip(1, 0, akagi.id);
    store.db.prepare("UPDATE ships SET hp = 30 WHERE id = ?").run(akagi.id);
    store.nextSortieNode();
    store.nextSortieNode();

    const battle = createSortieBattle(store.getSave(), { formation: 1 });
    const friendlyAttackers = battle.payload.api_hougeki1.api_at_list.filter(
      (_attacker, index) => battle.payload.api_hougeki1.api_at_eflag[index] === 0
    );

    expect(friendlyAttackers).not.toContain(0);
  });

  it("allows moderately damaged armored carriers to shell but blocks them when heavily damaged", () => {
    const taihou = store.createShip(153);
    const bomber = store.createSlotItem(23);
    store.equipSlotItem(taihou.id, 0, bomber.id);
    store.changeDeckShip(1, 0, taihou.id);
    store.nextSortieNode();
    store.nextSortieNode();

    store.db.prepare("UPDATE ships SET hp = 25 WHERE id = ?").run(taihou.id);
    const moderate = createSortieBattle(store.getSave(), { formation: 1 });
    const moderateAttackers = moderate.payload.api_hougeki1.api_at_list.filter(
      (_attacker, index) => moderate.payload.api_hougeki1.api_at_eflag[index] === 0
    );
    expect(moderateAttackers).toContain(0);

    store.db.prepare("UPDATE ships SET hp = 10 WHERE id = ?").run(taihou.id);
    const heavy = createSortieBattle(store.getSave(), { formation: 1 });
    const heavyAttackers = heavy.payload.api_hougeki1.api_at_list.filter(
      (_attacker, index) => heavy.payload.api_hougeki1.api_at_eflag[index] === 0
    );
    expect(heavyAttackers).not.toContain(0);
  });

  it("prevents carriers without surviving attack aircraft from daytime shelling", () => {
    const akagi = store.createShip(277);
    const fighter = store.createSlotItem(20);
    store.equipSlotItem(akagi.id, 0, fighter.id);
    store.changeDeckShip(1, 0, akagi.id);

    const battle = createSortieBattle(store.getSave(), { formation: 1 });
    const friendlyAttackers = battle.payload.api_hougeki1.api_at_list.filter(
      (_attacker, index) => battle.payload.api_hougeki1.api_at_eflag[index] === 0
    );

    expect(friendlyAttackers).not.toContain(0);
  });

  it("uses official 1-1 node encounters for later nodes", () => {
    setSortiePoint(store, 2, "B");

    const nodeB = createSortieBattle(store.getSave(), { formation: 1 });
    const nodeBEnemyIds = nodeB.payload.api_ship_ke.filter((id: number) => id > 0);

    expect(nodeBEnemyIds).toHaveLength(2);
    expect(nodeBEnemyIds[0]).toBe(nodeBEnemyIds[1]);
    expect([1501, 1502, 1503]).toContain(nodeBEnemyIds[0]);

    setSortiePoint(store, 3, "C");

    const boss = createSortieBattle(store.getSave(), { formation: 1 });
    const bossEnemyIds = boss.payload.api_ship_ke.filter((id: number) => id > 0);

    expect(bossEnemyIds[0]).toBe(1505);
    expect(bossEnemyIds.length).toBeGreaterThanOrEqual(3);
    expect(boss.payload.api_stage_flag).toEqual([0, 0, 0]);
    expect(boss.payload.api_kouku).toBeNull();
    expect(boss.payload.api_eSlot[0]).toEqual(expect.arrayContaining([1504, 1525]));
  });

  it("does not show a recon-only enemy as an aerial battle attacker", () => {
    const akagi = store.createShip(277);
    const fighter = store.createSlotItem(20);
    const bomber = store.createSlotItem(23);
    store.equipSlotItem(akagi.id, 0, fighter.id);
    store.equipSlotItem(akagi.id, 2, bomber.id);
    store.changeDeckShip(1, 0, akagi.id);
    store.nextSortieNode();
    store.nextSortieNode();

    const boss = createSortieBattle(store.getSave(), { formation: 1 });

    expect(boss.payload.api_kouku).not.toBeNull();
    expect(boss.payload.api_kouku?.api_plane_from).toEqual([[1], []]);
  });

  it("adds client-required fleet and shelling fields to night battles", () => {
    const battle = createSortieBattle(store.getSave(), { formation: 1 });
    const night = createNightBattlePayload(battle.record);
    const hougeki = night.api_hougeki as any;
    const enemyShipIds = night.api_ship_ke as number[];

    expect(enemyShipIds).toEqual(battle.record.enemyIds);
    expect(night.api_f_nowhps).toEqual(battle.record.after.fNowHps);
    expect(night.api_e_nowhps).toEqual(battle.record.after.eNowHps);
    for (const key of ["api_ship_lv", "api_f_maxhps", "api_e_maxhps", "api_fParam", "api_eParam", "api_eSlot"]) {
      expect(night[key], key).toHaveLength(6);
    }
    expect(hougeki.api_sp_list).toHaveLength(hougeki.api_df_list.length);
    expect(hougeki.api_n_mother_list).toHaveLength(hougeki.api_df_list.length);
    for (const [index, attacker] of hougeki.api_at_list.entries()) {
      const attackerIsEnemy = hougeki.api_at_eflag[index] === 1;
      const attackerFleet = attackerIsEnemy ? enemyShipIds : battle.record.shipIds;
      const defenderFleet = attackerIsEnemy ? battle.record.shipIds : enemyShipIds;
      expect(attackerFleet[attacker]).toBeGreaterThan(0);
      for (const defender of hougeki.api_df_list[index]) {
        expect(defenderFleet[defender]).toBeGreaterThan(0);
      }
    }
  });

  it("uses fleet position instead of range for night battle attack order", () => {
    const nagato = store.createShip(80);
    store.changeDeckShip(1, 1, nagato.id);
    store.nextSortieNode();

    const battle = createSortieBattle(store.getSave(), { formation: 1 });
    const record = {
      ...battle.record,
      after: {
        ...battle.record.after,
        fNowHps: [999, 999, 0, 0, 0, 0],
        eNowHps: [999, 999, 0, 0, 0, 0]
      },
      units: {
        ...battle.record.units!,
        friendly: battle.record.units!.friendly.map((unit) => ({ ...unit, maxHp: 999, armor: 999 })),
        enemy: battle.record.units!.enemy.map((unit) => ({ ...unit, maxHp: 999, armor: 999 }))
      }
    };
    const hougeki = createNightBattlePayload(record).api_hougeki as any;

    expect(hougeki.api_at_eflag).toEqual([0, 1, 0, 1]);
    expect(hougeki.api_at_list).toEqual([0, 0, 1, 1]);
  });

  it("keeps a carrier flagship turn empty instead of advancing the second ship", () => {
    const akagi = store.createShip(277);
    const nagato = store.createShip(80);
    store.changeDeckShip(1, 0, akagi.id);
    store.changeDeckShip(1, 1, nagato.id);
    store.nextSortieNode();

    const battle = createSortieBattle(store.getSave(), { formation: 1 });
    const record = {
      ...battle.record,
      after: {
        ...battle.record.after,
        fNowHps: [999, 999, 0, 0, 0, 0],
        eNowHps: [999, 999, 0, 0, 0, 0]
      },
      units: {
        ...battle.record.units!,
        friendly: battle.record.units!.friendly.map((unit) => ({ ...unit, maxHp: 999, armor: 999 })),
        enemy: battle.record.units!.enemy.map((unit) => ({ ...unit, maxHp: 999, armor: 999 }))
      }
    };
    const hougeki = createNightBattlePayload(record).api_hougeki as any;

    expect(hougeki.api_at_eflag).toEqual([1, 0, 1]);
    expect(hougeki.api_at_list).toEqual([0, 1, 1]);
  });

  it("preserves empty fleet positions during night battle rounds", () => {
    const nagato = store.createShip(80);
    store.changeDeckShip(1, 1, nagato.id);
    store.nextSortieNode();

    const battle = createSortieBattle(store.getSave(), { formation: 1 });
    const record = {
      ...battle.record,
      after: {
        ...battle.record.after,
        fNowHps: [999, 0, 999, 0, 0, 0],
        eNowHps: [999, 999, 0, 0, 0, 0]
      },
      units: {
        ...battle.record.units!,
        friendly: battle.record.units!.friendly.map((unit, index) => ({
          ...unit,
          position: index === 1 ? 3 : unit.position,
          maxHp: 999,
          armor: 999
        })),
        enemy: battle.record.units!.enemy.map((unit) => ({ ...unit, maxHp: 999, armor: 999 }))
      }
    };
    const hougeki = createNightBattlePayload(record).api_hougeki as any;

    expect(hougeki.api_at_eflag).toEqual([0, 1, 1, 0]);
    expect(hougeki.api_at_list).toEqual([0, 0, 1, 2]);
  });

  it("prevents light, standard, and armored carriers on both sides from attacking at night", () => {
    const thirdShip = store.createShip(1);
    store.changeDeckShip(1, 2, thirdShip.id);
    store.nextSortieNode();
    store.nextSortieNode();

    const battle = createSortieBattle(store.getSave(), { formation: 1 });
    const carrierTypes = [7, 11, 18];
    const record = {
      ...battle.record,
      after: {
        ...battle.record.after,
        fNowHps: [999, 999, 999, 0, 0, 0],
        eNowHps: [999, 999, 999, 0, 0, 0]
      },
      units: {
        ...battle.record.units!,
        friendly: battle.record.units!.friendly.map((unit, index) => ({
          ...unit,
          maxHp: 999,
          armor: 999,
          shipType: carrierTypes[index]
        })),
        enemy: battle.record.units!.enemy.map((unit, index) => ({
          ...unit,
          maxHp: 999,
          armor: 999,
          shipType: carrierTypes[index]
        }))
      }
    };
    const hougeki = createNightBattlePayload(record).api_hougeki as any;

    expect(hougeki.api_at_list).toEqual([]);
    expect(hougeki.api_at_eflag).toEqual([]);
  });

  it("encodes night double attacks with api_sp_list type 1", () => {
    const nagato = store.createShip(80);
    const mainGunA = store.createSlotItem(7);
    const mainGunB = store.createSlotItem(8);
    store.equipSlotItem(nagato.id, 0, mainGunA.id);
    store.equipSlotItem(nagato.id, 1, mainGunB.id);
    store.changeDeckShip(1, 0, nagato.id);

    const battle = createSortieBattle(store.getSave(), { formation: 1 });
    const record = {
      ...battle.record,
      after: {
        ...battle.record.after,
        fNowHps: [...battle.record.before.fNowHps],
        eNowHps: [20, 0, 0, 0, 0, 0]
      }
    };
    const night = createNightBattlePayload(record);
    const hougeki = night.api_hougeki as any;
    const attackIndex = hougeki.api_at_list.findIndex(
      (attacker: number, index: number) => attacker === 0 && hougeki.api_at_eflag[index] === 0
    );

    expect(attackIndex).toBeGreaterThanOrEqual(0);
    expect(hougeki.api_sp_list[attackIndex]).toBe(1);
    expect(hougeki.api_df_list[attackIndex]).toHaveLength(2);
    expect(hougeki.api_damage[attackIndex]).toHaveLength(2);
  });

  it("uses daytime equipment snapshots for night torpedo cut-ins", () => {
    const torpedoA = store.createSlotItem(13);
    const torpedoB = store.createSlotItem(14);
    store.equipSlotItem(1, 0, torpedoA.id);
    store.equipSlotItem(1, 1, torpedoB.id);

    const battle = createSortieBattle(store.getSave(), { formation: 1 });
    const record = {
      ...battle.record,
      after: {
        ...battle.record.after,
        fNowHps: [...battle.record.before.fNowHps],
        eNowHps: [20, 20, 0, 0, 0, 0]
      }
    };
    const night = createNightBattlePayload(record);
    const hougeki = night.api_hougeki as any;
    const cutInIndex = hougeki.api_sp_list.indexOf(5);

    expect(cutInIndex).toBeGreaterThanOrEqual(0);
    expect(hougeki.api_si_list[cutInIndex]).toEqual(expect.arrayContaining([13, 14]));
    expect(hougeki.api_damage[cutInIndex]).toHaveLength(2);
  });

  it("encodes mixed main gun and torpedo night cut-ins", () => {
    const nagato = store.createShip(80);
    const mainGun = store.createSlotItem(7);
    const torpedo = store.createSlotItem(13);
    store.equipSlotItem(nagato.id, 0, mainGun.id);
    store.equipSlotItem(nagato.id, 1, torpedo.id);
    store.changeDeckShip(1, 0, nagato.id);
    store.changeDeckShip(1, 1, -1);

    const battle = createSortieBattle(store.getSave(), { formation: 1 });
    const record = {
      ...battle.record,
      after: {
        ...battle.record.after,
        fNowHps: [999, 0, 0, 0, 0, 0],
        eNowHps: [999, 0, 0, 0, 0, 0]
      },
      units: {
        ...battle.record.units!,
        friendly: battle.record.units!.friendly.map((unit) => ({ ...unit, maxHp: 999, armor: 999 })),
        enemy: battle.record.units!.enemy.map((unit) => ({ ...unit, maxHp: 999, armor: 999 }))
      }
    };
    const night = createNightBattlePayload(record);
    const hougeki = night.api_hougeki as any;
    const cutInIndex = hougeki.api_sp_list.indexOf(4);

    expect(cutInIndex).toBeGreaterThanOrEqual(0);
    expect(hougeki.api_si_list[cutInIndex]).toEqual(expect.arrayContaining([7, 13]));
    expect(hougeki.api_damage[cutInIndex]).toHaveLength(2);
  });

  it("lets the combined fleet escort participate in opening torpedo combat", () => {
    const escortKitakami = store.createShip(119);
    const midgetSub = store.createSlotItem(41);
    store.equipSlotItem(escortKitakami.id, 0, midgetSub.id);
    store.changeDeckShip(2, 0, escortKitakami.id);
    store.db.prepare("UPDATE players SET combined_fleet = 1 WHERE id = 1").run();
    store.db.prepare("UPDATE sortie_sessions SET seed = 0 WHERE id = 1").run();
    const enemies = [1501, 1502, 1503].map((id) => ENEMY_UNIT_TEMPLATES[id]);
    const originals = enemies.map((enemy) => ({ hp: enemy.hp, armor: enemy.armor }));
    for (const enemy of enemies) {
      enemy.hp = 999;
      enemy.armor = 999;
    }
    try {
      const battle = createCombinedBattle(store.getSave(), { formation: 1 });
      const opening = battle.payload.api_opening_atack;

      expect(opening).not.toBeNull();
      expect(opening.api_frai[0]).toBeGreaterThanOrEqual(0);
      expect(battle.record.result.mvpCombined).toBe(1);
      expect(battle.record.phases.openingAtack).toBe(opening);
    } finally {
      enemies.forEach((enemy, index) => {
        enemy.hp = originals[index].hp;
        enemy.armor = originals[index].armor;
      });
    }
  });

  it("uses the combined fleet escort as the night battle force", () => {
    const escortKitakami = store.createShip(119);
    const torpedoA = store.createSlotItem(13);
    const torpedoB = store.createSlotItem(14);
    store.equipSlotItem(escortKitakami.id, 0, torpedoA.id);
    store.equipSlotItem(escortKitakami.id, 1, torpedoB.id);
    store.changeDeckShip(2, 0, escortKitakami.id);
    store.db.prepare("UPDATE players SET combined_fleet = 1 WHERE id = 1").run();
    store.db.prepare("UPDATE sortie_sessions SET seed = 0 WHERE id = 1").run();

    const battle = createCombinedBattle(store.getSave(), { formation: 1 });
    const record = {
      ...battle.record,
      after: {
        ...battle.record.after,
        fNowHps: battle.record.before.fNowHps,
        fCombinedNowHps: battle.record.before.fCombinedNowHps,
        eNowHps: [999, 0, 0, 0, 0, 0]
      },
      units: {
        ...battle.record.units!,
        enemy: battle.record.units!.enemy.map((unit) => ({ ...unit, maxHp: 999, armor: 999 }))
      }
    };
    const night = createNightBattlePayload(record);
    const hougeki = night.api_hougeki as any;
    const friendlyAttackIndex = hougeki.api_at_eflag.findIndex((side: number) => side === 0);

    expect(friendlyAttackIndex).toBeGreaterThanOrEqual(0);
    expect(hougeki.api_at_list[friendlyAttackIndex]).toBe(0);
    expect(hougeki.api_sp_list[friendlyAttackIndex]).toBe(5);
    expect(hougeki.api_si_list[friendlyAttackIndex]).toEqual(expect.arrayContaining([13, 14]));
  });
});

function setSortiePoint(store: StateStore, node: number, point: string) {
  const session = store.getSave().sortieSession!;
  store.db.prepare("UPDATE sortie_sessions SET node = ?, state_json = ? WHERE id = 1")
    .run(node, JSON.stringify({ ...session.state, point }));
}
