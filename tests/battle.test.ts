import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  battleResultPayload,
  createCombinedBattle,
  createNightBattle,
  createPracticeBattle,
  createSortieBattle,
  createNightBattlePayload,
  validateHougekiProtocolPayload
} from "../src/kcsapi/battle.js";
import { ENEMY_UNIT_TEMPLATES, sortieNodes } from "../src/master/sortie-data.js";
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

  function withEnemyTemplatePatch(patch: Partial<(typeof ENEMY_UNIT_TEMPLATES)[number]>, callback: () => void) {
    const enemyIds = [1501, 1502, 1503, 1505, 1506];
    const originals = enemyIds.map((id) => ({
      id,
      masterId: ENEMY_UNIT_TEMPLATES[id].masterId,
      level: ENEMY_UNIT_TEMPLATES[id].level,
      hp: ENEMY_UNIT_TEMPLATES[id].hp,
      shipType: ENEMY_UNIT_TEMPLATES[id].shipType,
      firepower: ENEMY_UNIT_TEMPLATES[id].firepower,
      torpedo: ENEMY_UNIT_TEMPLATES[id].torpedo,
      armor: ENEMY_UNIT_TEMPLATES[id].armor,
      aa: ENEMY_UNIT_TEMPLATES[id].aa,
      luck: ENEMY_UNIT_TEMPLATES[id].luck,
      accuracy: ENEMY_UNIT_TEMPLATES[id].accuracy,
      evasion: ENEMY_UNIT_TEMPLATES[id].evasion,
      range: ENEMY_UNIT_TEMPLATES[id].range,
      slots: [...ENEMY_UNIT_TEMPLATES[id].slots],
      onSlot: [...ENEMY_UNIT_TEMPLATES[id].onSlot]
    }));
    for (const id of enemyIds) Object.assign(ENEMY_UNIT_TEMPLATES[id], patch);
    try {
      callback();
    } finally {
      for (const original of originals) {
        Object.assign(ENEMY_UNIT_TEMPLATES[original.id], original);
        if (original.accuracy == null) delete ENEMY_UNIT_TEMPLATES[original.id].accuracy;
        if (original.evasion == null) delete ENEMY_UNIT_TEMPLATES[original.id].evasion;
      }
    }
  }

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
    expect(validateHougekiProtocolPayload(payload.api_hougeki1, "day")).toEqual([]);
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

  it("preserves Vanguard Formation instead of clamping it to Line Abreast", () => {
    const battle = createSortieBattle(store.getSave(), { formation: 6 });
    expect(battle.record.formation[0]).toBe(6);
    expect(battle.payload.api_formation[0]).toBe(6);
  });

  it("emits client-readable placeholders for optional battle phases", () => {
    const battle = createSortieBattle(store.getSave(), { formation: 1 });
    const payload = battle.payload;

    expect(payload).toMatchObject({
      api_search: [5, 5],
      api_escape_idx: null,
      api_air_base_attack: null,
      api_opening_taisen: null,
      api_opening_atack: null,
      api_kouku2: null,
      api_friendly_info: null,
      api_friendly_kouku: null,
      api_friendly_battle: null
    });
  });

  it("reports search success with an active reconnaissance aircraft", () => {
    const akagi = store.createShip(277);
    const carrierRecon = store.createSlotItem(54);
    store.equipSlotItem(akagi.id, 0, carrierRecon.id);
    store.changeDeckShip(1, 0, akagi.id);
    store.clearDeckFollowerShips(1);

    const battle = createSortieBattle(store.getSave(), { formation: 1 });

    expect(battle.payload.api_search).toEqual([1, 5]);
  });

  it("limits airbattle endpoints to aerial phases", () => {
    const akagi = store.createShip(277);
    const fighter = store.createSlotItem(20);
    const bomber = store.createSlotItem(23);
    store.equipSlotItem(akagi.id, 0, fighter.id);
    store.equipSlotItem(akagi.id, 2, bomber.id);
    store.changeDeckShip(1, 0, akagi.id);

    const battle = createSortieBattle(store.getSave(), { formation: 1, endpoint: "sortieAir" });

    expect(battle.record.endpoint).toBe("sortieAir");
    expect(battle.record.phases.kouku).toBeTruthy();
    expect(battle.record.phases.kouku2).toBeTruthy();
    expect(battle.payload.api_kouku2).toBe(battle.record.phases.kouku2);
    expect(battle.record.phases.openingTaisen).toBeNull();
    expect(battle.record.phases.openingAtack).toBeNull();
    expect(battle.record.phases.hougeki1.api_at_list).toEqual([]);
    expect(battle.record.phases.raigeki).toBeNull();
  });

  it("emits an empty air-base wave list when no strike points were submitted", () => {
    const battle = createSortieBattle(store.getSave(), { formation: 1, endpoint: "sortieLdAir" });

    expect(battle.record.endpoint).toBe("sortieLdAir");
    expect(battle.payload.api_air_base_attack).toEqual([]);
    expect(battle.record.phases.hougeki1.api_at_list).toEqual([]);
    expect(battle.record.phases.raigeki).toBeNull();
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
        api_f_count: 40,
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
    expect(kouku.api_stage2.api_f_count).toBeLessThan(40);
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

  it("uses 3-5 B sortie base experience for settlement multipliers", () => {
    const yamato = store.createShip(911);
    store.changeDeckShip(1, 0, yamato.id);
    store.clearDeckFollowerShips(1);
    store.startSortie(1, 3, 5);
    const session = store.getSave().sortieSession!;
    const node = sortieNodes().find((item) => item.mapId === 35 && item.point === "B")!;
    const originalEncounters = node.encounters.map((encounter) => ({
      shipIds: [...encounter.shipIds],
      formation: encounter.formation,
      weight: encounter.weight
    }));
    const originalEnemy = {
      ...ENEMY_UNIT_TEMPLATES[1501],
      slots: [...ENEMY_UNIT_TEMPLATES[1501].slots],
      onSlot: [...ENEMY_UNIT_TEMPLATES[1501].onSlot]
    };

    try {
      for (const encounter of node.encounters) {
        Object.assign(encounter as any, { shipIds: [1501], formation: 1, weight: 1 });
      }
      Object.assign(ENEMY_UNIT_TEMPLATES[1501], { hp: 1, armor: 0, firepower: 0, torpedo: 0 });
      store.db.prepare("UPDATE sortie_sessions SET node = 1, seed = 0, state_json = ? WHERE id = 1")
        .run(JSON.stringify({ ...session.state, point: "B", routeStep: 1, visited: ["Start", "B"], battles: 0 }));

      const battle = createSortieBattle(store.getSave(), { formation: 1 });
      store.recordSortieBattle(battle.record as unknown as Record<string, unknown>);
      const applied = store.applySortieBattleResult();
      const payload = battleResultPayload(applied.record as any);

      expect(payload).toMatchObject({
        api_win_rank: "S",
        api_get_base_exp: 300,
        api_mvp: 1
      });
      const shipExp = payload.api_get_ship_exp as number[];
      expect(shipExp.slice(1, 7)).toEqual([1080, -1, -1, -1, -1, -1]);
    } finally {
      node.encounters.forEach((encounter, index) => {
        Object.assign(encounter as any, originalEncounters[index]);
      });
      Object.assign(ENEMY_UNIT_TEMPLATES[1501], originalEnemy);
    }
  });

  it("plays Atlanta Kai AACI kind 39 in a 3-5 carrier battle", () => {
    const atlanta = store.createShip(696);
    const gfcsGun = store.createSlotItem(363);
    const concentratedGun = store.createSlotItem(362);
    store.clearDeckFollowerShips(1);
    store.changeDeckShip(1, 0, atlanta.id);
    store.equipSlotItem(atlanta.id, 0, gfcsGun.id);
    store.equipSlotItem(atlanta.id, 1, concentratedGun.id);
    store.startSortie(1, 3, 5);
    const session = store.getSave().sortieSession!;
    const node = sortieNodes().find((item) => item.mapId === 35 && item.point === "B")!;
    const originalEncounters = node.encounters.map((encounter) => ({
      shipIds: [...encounter.shipIds],
      formation: encounter.formation,
      weight: encounter.weight
    }));
    try {
      for (const encounter of node.encounters) {
        Object.assign(encounter as any, { shipIds: [1510], formation: 1, weight: 1 });
      }
      let activated: ReturnType<typeof createSortieBattle> | undefined;
      let activatedSeed = -1;
      for (let seed = 0; seed < 128; seed += 1) {
        store.db.prepare("UPDATE sortie_sessions SET node = 1, seed = ?, state_json = ? WHERE id = 1")
          .run(seed, JSON.stringify({ ...session.state, point: "B", routeStep: 1, visited: ["Start", "B"], battles: 0 }));
        const candidate = createSortieBattle(store.getSave(), { formation: 1 });
        if (candidate.payload.api_kouku?.api_air_fire?.api_kind === 39) {
          activated = candidate;
          activatedSeed = seed;
          break;
        }
      }
      expect(activatedSeed).toBeGreaterThanOrEqual(0);
      expect(activated?.payload.api_kouku?.api_air_fire).toEqual({
        api_idx: 0,
        api_kind: 39,
        api_use_items: [363, 362]
      });
      expect(activated?.payload.api_kouku?.api_stage2?.api_e_lostcount).toBeGreaterThan(0);

      store.db.prepare("UPDATE sortie_sessions SET seed = ? WHERE id = 1").run(activatedSeed);
      expect(createSortieBattle(store.getSave(), { formation: 1 }).payload.api_kouku?.api_air_fire?.api_kind).toBe(39);
    } finally {
      node.encounters.forEach((encounter, index) => Object.assign(encounter, originalEncounters[index]));
    }
  });

  it("encodes the saved 3-5 Nachi observation and three carrier cut-ins without null equipment", () => {
    const nachi = store.createShip(192);
    const carriers = [466, 550, 704].map((masterId) => store.createShip(masterId));
    store.clearDeckFollowerShips(1);
    store.changeDeckShip(1, 0, nachi.id);
    carriers.forEach((carrier, index) => store.changeDeckShip(1, index + 1, carrier.id));
    [90, 90, 25, 240].forEach((masterId, slot) => {
      const item = store.createSlotItem(masterId);
      store.equipSlotItem(nachi.id, slot, item.id);
    });
    for (const carrier of carriers) {
      [20, 23, 16].forEach((masterId, slot) => {
        const item = store.createSlotItem(masterId);
        store.equipSlotItem(carrier.id, slot, item.id);
      });
    }
    store.startSortie(1, 3, 5);
    const session = store.getSave().sortieSession!;
    const node = sortieNodes().find((item) => item.mapId === 35 && item.point === "B")!;
    const originalEncounters = node.encounters.map((encounter) => ({
      shipIds: [...encounter.shipIds], formation: encounter.formation, weight: encounter.weight
    }));
    const enemy = ENEMY_UNIT_TEMPLATES[1501];
    const originalEnemy = { hp: enemy.hp, armor: enemy.armor, aa: enemy.aa };
    try {
      node.encounters.forEach((encounter) => Object.assign(encounter as any, {
        shipIds: [1501], formation: 1, weight: 1
      }));
      Object.assign(enemy, { hp: 999, armor: 999, aa: 0 });
      let activated: ReturnType<typeof createSortieBattle> | undefined;
      for (let seed = 0; seed < 256; seed += 1) {
        store.db.prepare("UPDATE sortie_sessions SET node = 1, seed = ?, state_json = ? WHERE id = 1")
          .run(seed, JSON.stringify({ ...session.state, point: "B", routeStep: 1, visited: ["Start", "B"], battles: 0 }));
        const candidate = createSortieBattle(store.getSave(), { formation: 1 });
        const hougeki = candidate.payload.api_hougeki1;
        const friendlyTypes = new Map<number, number>();
        hougeki.api_at_list.forEach((attacker: number, index: number) => {
          if (hougeki.api_at_eflag[index] === 0) friendlyTypes.set(attacker, hougeki.api_at_type[index]);
        });
        if (friendlyTypes.get(0) === 4 && carriers.every((_carrier, index) => friendlyTypes.get(index + 1) === 7)) {
          activated = candidate;
          break;
        }
      }
      expect(activated).toBeDefined();
      const hougeki = activated!.payload.api_hougeki1;
      const nachiAttack = hougeki.api_at_list.findIndex((attacker: number, index: number) =>
        attacker === 0 && hougeki.api_at_eflag[index] === 0 && hougeki.api_at_type[index] === 4
      );
      expect(hougeki.api_si_list[nachiAttack]).toEqual([25, 240, 90]);
      carriers.forEach((_carrier, position) => {
        const attack = hougeki.api_at_list.findIndex((attacker: number, index: number) =>
          attacker === position + 1 && hougeki.api_at_eflag[index] === 0
        );
        expect(hougeki.api_at_type[attack]).toBe(7);
        expect(hougeki.api_si_list[attack]).toHaveLength(3);
      });
    } finally {
      node.encounters.forEach((encounter, index) => Object.assign(encounter, originalEncounters[index]));
      Object.assign(enemy, originalEnemy);
    }
  });

  it("blocks enemy daytime spotting attacks when friendly fleet has air supremacy", () => {
    const akagi = store.createShip(277);
    const fighter = store.createSlotItem(20);
    store.equipSlotItem(akagi.id, 0, fighter.id);
    store.changeDeckShip(1, 0, akagi.id);
    store.clearDeckFollowerShips(1);
    store.startSortie(1, 3, 5);
    const session = store.getSave().sortieSession!;
    const node = sortieNodes().find((item) => item.mapId === 35 && item.point === "B")!;
    const originalEncounters = node.encounters.map((encounter) => ({
      shipIds: [...encounter.shipIds],
      formation: encounter.formation,
      weight: encounter.weight
    }));

    try {
      for (const encounter of node.encounters) {
        Object.assign(encounter as any, {
          shipIds: [1554, 1542, 1522, 1522, 1575, 1575],
          formation: 1,
          weight: 1
        });
      }
      store.db.prepare("UPDATE sortie_sessions SET node = 1, seed = 0, state_json = ? WHERE id = 1")
        .run(JSON.stringify({ ...session.state, point: "B", routeStep: 1, visited: ["Start", "B"], battles: 0 }));

      const battle = createSortieBattle(store.getSave(), { formation: 1 });
      const enemyAttackTypes = battle.payload.api_hougeki1.api_at_type.filter(
        (_type: number, index: number) => battle.payload.api_hougeki1.api_at_eflag[index] === 1
      );

      expect(battle.payload.api_kouku?.api_stage1.api_disp_seiku).toBe(1);
      expect(enemyAttackTypes).not.toContain(2);
      expect(enemyAttackTypes).not.toContain(3);
    } finally {
      node.encounters.forEach((encounter, index) => {
        Object.assign(encounter as any, originalEncounters[index]);
      });
    }
  });

  it("uses modernization and master-driven level stats in friendly battle units", () => {
    const prinz = store.createShip(177);
    store.changeDeckShip(1, 0, prinz.id);
    store.clearDeckFollowerShips(1);
    store.db.prepare("UPDATE ships SET level = 85, stats_json = ? WHERE id = ?")
      .run(JSON.stringify({ api_kyouka: [27, 44, 42, 34, 0, 0, 0], modernized: true }), prinz.id);

    const battle = createSortieBattle(store.getSave(), { formation: 1 });
    const unit = battle.record.units?.friendly[0];

    expect(unit).toMatchObject({
      masterId: 177,
      level: 85,
      firepower: 75,
      torpedo: 84,
      aa: 60,
      armor: 82,
      evasion: 69,
      baseAsw: 0,
      statEvidence: { evasion: "player-growth", asw: "player-growth", los: "player-growth" }
    });
    expect(battle.payload.api_fParam[0]).toEqual([75, 84, 60, 82]);
  });

  it("does not let carrier aircraft torpedo stats participate in closing torpedo combat", () => {
    const akagi = store.createShip(277);
    const torpedoBomber = store.createSlotItem(16);
    store.equipSlotItem(akagi.id, 0, torpedoBomber.id);
    store.changeDeckShip(1, 0, akagi.id);
    store.db.prepare("UPDATE decks SET ship_ids_json = ? WHERE id = 1")
      .run(JSON.stringify([akagi.id, -1, -1, -1, -1, -1]));
    store.db.prepare("UPDATE sortie_sessions SET seed = 0 WHERE id = 1").run();

    withEnemyTemplatePatch({ hp: 500, firepower: 0, torpedo: 0, armor: 300, aa: 0 }, () => {
      const battle = createSortieBattle(store.getSave(), { formation: 1 });

      expect(battle.payload.api_fParam[0][1]).toBeGreaterThan(0);
      expect(battle.payload.api_e_nowhps.some((hp: number) => hp > 0)).toBe(true);
      expect(battle.payload.api_raigeki?.api_frai[0] ?? -1).toBe(-1);
    });
  });

  it("requires a native torpedo stat for closing torpedo eligibility", () => {
    const yamato = store.createShip(131);
    const torpedo = store.createSlotItem(13);
    store.equipSlotItem(yamato.id, 0, torpedo.id);
    store.changeDeckShip(1, 0, yamato.id);
    store.db.prepare("UPDATE decks SET ship_ids_json = ? WHERE id = 1")
      .run(JSON.stringify([yamato.id, -1, -1, -1, -1, -1]));
    store.db.prepare("UPDATE sortie_sessions SET seed = 0 WHERE id = 1").run();

    withEnemyTemplatePatch({ hp: 500, firepower: 0, torpedo: 0, armor: 300, aa: 0 }, () => {
      const battle = createSortieBattle(store.getSave(), { formation: 1 });

      expect(battle.payload.api_fParam[0][1]).toBeGreaterThan(0);
      expect(battle.payload.api_raigeki?.api_frai[0] ?? -1).toBe(-1);
    });
  });

  it("prevents moderately damaged ships from joining the closing torpedo salvo", () => {
    const fubuki = store.createShip(9);
    store.changeDeckShip(1, 0, fubuki.id);
    store.db.prepare("UPDATE decks SET ship_ids_json = ? WHERE id = 1")
      .run(JSON.stringify([fubuki.id, -1, -1, -1, -1, -1]));
    store.db.prepare("UPDATE ships SET hp = ? WHERE id = ?").run(Math.floor(fubuki.maxHp / 2), fubuki.id);
    store.db.prepare("UPDATE sortie_sessions SET seed = 0 WHERE id = 1").run();

    withEnemyTemplatePatch({ hp: 500, firepower: 0, torpedo: 0, armor: 300, aa: 0 }, () => {
      const battle = createSortieBattle(store.getSave(), { formation: 1 });

      expect(battle.payload.api_raigeki?.api_frai[0] ?? -1).toBe(-1);
    });
  });

  it("does not target submarines during closing torpedo combat", () => {
    const fubuki = store.createShip(9);
    store.changeDeckShip(1, 0, fubuki.id);
    store.db.prepare("UPDATE decks SET ship_ids_json = ? WHERE id = 1")
      .run(JSON.stringify([fubuki.id, -1, -1, -1, -1, -1]));
    store.db.prepare("UPDATE sortie_sessions SET seed = 0 WHERE id = 1").run();

    withEnemyTemplatePatch({ hp: 500, shipType: 13, firepower: 0, torpedo: 0, armor: 300, aa: 0 }, () => {
      const battle = createSortieBattle(store.getSave(), { formation: 1 });

      expect(battle.payload.api_raigeki?.api_frai[0] ?? -1).toBe(-1);
    });
  });

  it("does not target installations during closing torpedo combat", () => {
    const fubuki = store.createShip(9);
    store.changeDeckShip(1, 0, fubuki.id);
    store.db.prepare("UPDATE decks SET ship_ids_json = ? WHERE id = 1")
      .run(JSON.stringify([fubuki.id, -1, -1, -1, -1, -1]));
    store.db.prepare("UPDATE sortie_sessions SET seed = 0 WHERE id = 1").run();

    withEnemyTemplatePatch({ masterId: 1573, hp: 500, shipType: 10, firepower: 0, torpedo: 0, armor: 300, aa: 0 }, () => {
      const battle = createSortieBattle(store.getSave(), { formation: 1 });

      expect(battle.payload.api_ship_ke[0]).toBe(1573);
      expect(battle.payload.api_raigeki?.api_frai[0] ?? -1).toBe(-1);
    });
  });

  it("skips installations when selecting closing torpedo targets from a mixed fleet", () => {
    const fubuki = store.createShip(9);
    store.changeDeckShip(1, 0, fubuki.id);
    store.db.prepare("UPDATE decks SET ship_ids_json = ? WHERE id = 1")
      .run(JSON.stringify([fubuki.id, -1, -1, -1, -1, -1]));
    store.db.prepare("UPDATE sortie_sessions SET seed = 2, node = 3 WHERE id = 1").run();

    withEnemyTemplatePatch({ hp: 500, firepower: 0, torpedo: 0, armor: 300, aa: 0, slots: [], onSlot: [] }, () => {
      const original = { ...ENEMY_UNIT_TEMPLATES[1505], slots: [...ENEMY_UNIT_TEMPLATES[1505].slots], onSlot: [...ENEMY_UNIT_TEMPLATES[1505].onSlot] };
      Object.assign(ENEMY_UNIT_TEMPLATES[1505], { masterId: 1573, shipType: 10 });
      try {
        const battle = createSortieBattle(store.getSave(), { formation: 1 });

        expect(battle.payload.api_ship_ke.slice(0, 3)).toEqual([1573, 1501, 1501]);
        expect(battle.payload.api_raigeki?.api_frai[0] ?? -1).toBeGreaterThan(0);
      } finally {
        Object.assign(ENEMY_UNIT_TEMPLATES[1505], original);
      }
    });
  });

  it("keeps opening torpedoes independent from closing torpedo damage-state eligibility", () => {
    const kitakami = store.createShip(119);
    const midgetSub = store.createSlotItem(41);
    store.equipSlotItem(kitakami.id, 0, midgetSub.id);
    store.changeDeckShip(1, 0, kitakami.id);
    store.db.prepare("UPDATE decks SET ship_ids_json = ? WHERE id = 1")
      .run(JSON.stringify([kitakami.id, -1, -1, -1, -1, -1]));
    store.db.prepare("UPDATE ships SET hp = 1 WHERE id = ?").run(kitakami.id);
    store.db.prepare("UPDATE sortie_sessions SET seed = 0 WHERE id = 1").run();

    withEnemyTemplatePatch({ hp: 500, firepower: 0, torpedo: 0, armor: 300, aa: 0 }, () => {
      const battle = createSortieBattle(store.getSave(), { formation: 1 });

      expect(battle.payload.api_opening_atack?.api_frai[0] ?? -1).toBeGreaterThanOrEqual(0);
      expect(battle.payload.api_raigeki?.api_frai[0] ?? -1).toBe(-1);
    });
  });

  it("does not target installation practice enemies during opening torpedo combat", () => {
    const kitakami = store.createShip(119);
    store.changeDeckShip(1, 0, kitakami.id);
    store.db.prepare("UPDATE decks SET ship_ids_json = ? WHERE id = 1")
      .run(JSON.stringify([kitakami.id, -1, -1, -1, -1, -1]));
    const rival = {
      id: 1,
      name: "Installation Practice",
      level: 120,
      rank: "元帥",
      comment: "land target",
      flag: 1,
      medals: 4,
      ships: [
        {
          id: 101,
          masterId: 1573,
          level: 120,
          star: 5,
          slotMasterIds: [],
          onSlot: [0, 0, 0, 0, 0]
        }
      ]
    };

    const battle = createPracticeBattle(store.getSave(), {
      practiceEnemyId: 1,
      practiceRivals: [rival],
      formation: 1
    });

    expect(battle.payload.api_ship_ke[0]).toBe(1573);
    expect(battle.payload.api_opening_atack?.api_frai[0] ?? -1).toBe(-1);
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
    const isuzu = store.createShip(141);
    const sonar = store.createSlotItem(46);
    store.equipSlotItem(isuzu.id, 0, sonar.id);
    store.changeDeckShip(1, 0, isuzu.id);
    store.clearDeckFollowerShips(1);
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

    store.db.prepare("UPDATE ships SET level = 99 WHERE id = ?").run(isuzu.id);
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
    store.db.prepare("UPDATE ships SET onslot_json = ? WHERE id = ?").run(JSON.stringify([2, 0, 0, 0, 0]), akagi.id);

    const enemies = [1501, 1502, 1503].map((id) => ENEMY_UNIT_TEMPLATES[id]);
    const originalAa = enemies.map((enemy) => enemy.aa);
    for (const enemy of enemies) enemy.aa = 100;
    try {
      let battle: ReturnType<typeof createSortieBattle> | undefined;
      for (let seed = 0; seed < 64; seed += 1) {
        store.db.prepare("UPDATE sortie_sessions SET seed = ? WHERE id = 1").run(seed);
        const candidate = createSortieBattle(store.getSave(), { formation: 1 });
        if ((candidate.payload.api_kouku?.api_stage2?.api_f_lostcount ?? 0) > 0 &&
            candidate.payload.api_kouku?.api_stage3 == null) {
          battle = candidate;
          break;
        }
      }

      expect(battle).toBeDefined();
      expect(battle!.payload.api_stage_flag).toEqual([1, 1, 0]);
      expect(battle!.payload.api_kouku?.api_stage2?.api_f_lostcount).toBeGreaterThan(0);
      expect(battle!.payload.api_kouku?.api_stage3).toBeNull();
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
    const akagi = store.createShip(277);
    const mainGunA = store.createSlotItem(7);
    const mainGunB = store.createSlotItem(8);
    const seaplane = store.createSlotItem(25);
    const fighter = store.createSlotItem(20);
    store.equipSlotItem(nagato.id, 0, mainGunA.id);
    store.equipSlotItem(nagato.id, 1, mainGunB.id);
    store.equipSlotItem(nagato.id, 2, seaplane.id);
    store.equipSlotItem(akagi.id, 0, fighter.id);
    store.changeDeckShip(1, 0, nagato.id);
    store.changeDeckShip(1, 1, akagi.id);
    store.db.prepare("UPDATE sortie_sessions SET seed = 0 WHERE id = 1").run();

    const battle = createSortieBattle(store.getSave(), { formation: 1 });
    const hougeki = battle.payload.api_hougeki1;
    const attackIndex = hougeki.api_at_type.indexOf(2);

    expect(battle.payload.api_kouku?.api_stage1.api_disp_seiku).toBe(1);
    expect(attackIndex).toBeGreaterThanOrEqual(0);
    expect(hougeki.api_damage[attackIndex][0]).toBe(20);
    expect(hougeki.api_df_list[attackIndex]).toEqual([0, 0]);
    expect(hougeki.api_damage[attackIndex]).toHaveLength(2);
    expect(hougeki.api_damage[attackIndex][1]).toBe(0);
    expect(hougeki.api_cl_list[attackIndex]).toHaveLength(2);
    expect(hougeki.api_si_list[attackIndex]).toEqual([7, 8]);
  });

  it.each([
    ["main-secondary", 3, 80, [7, 12, 25], true, [25, 7, 12]],
    ["main-radar", 4, 80, [7, 30, 25], true, [25, 30, 7]],
    ["main-secondary-AP", 5, 80, [7, 12, 36, 25], true, [25, 36, 7]],
    ["main-main-AP", 6, 80, [7, 8, 36, 25], true, [25, 7, 8]],
    ["carrier FBA", 7, 277, [20, 23, 16], false, [20, 23, 16]],
    ["Ise Zuiun stereoscopic", 200, 553, [7, 26, 26], false, [7, 26, 26]],
    ["Ise sea-air stereoscopic", 201, 553, [7, 26, 291], false, [7, 26, 291]]
  ] as const)("emits daytime %s protocol type %i", (_name, atType, masterId, equipmentIds, needsFighter, snapshot) => {
    const attacker = store.createShip(masterId);
    store.clearDeckFollowerShips(1);
    store.changeDeckShip(1, 0, attacker.id);
    equipmentIds.forEach((itemMasterId, slot) => {
      const item = store.createSlotItem(itemMasterId);
      store.equipSlotItem(attacker.id, slot, item.id);
    });
    if (needsFighter) {
      const carrier = store.createShip(277);
      const fighter = store.createSlotItem(20);
      store.equipSlotItem(carrier.id, 0, fighter.id);
      store.changeDeckShip(1, 1, carrier.id);
    }
    const enemies = [1501, 1502, 1503].map((id) => ENEMY_UNIT_TEMPLATES[id]);
    const originals = enemies.map((enemy) => ({ hp: enemy.hp, armor: enemy.armor }));
    enemies.forEach((enemy) => Object.assign(enemy, { hp: 999, armor: 999 }));
    try {
      let hougeki: any;
      let attackIndex = -1;
      for (let seed = 0; seed < 128 && attackIndex < 0; seed += 1) {
        store.db.prepare("UPDATE sortie_sessions SET seed = ? WHERE id = 1").run(seed);
        hougeki = createSortieBattle(store.getSave(), { formation: 1 }).payload.api_hougeki1;
        attackIndex = hougeki.api_at_type.findIndex((type: number, index: number) =>
          type === atType && hougeki.api_at_eflag[index] === 0
        );
      }
      expect(attackIndex).toBeGreaterThanOrEqual(0);
      expect(hougeki.api_si_list[attackIndex]).toEqual(snapshot);
      expect(hougeki.api_damage[attackIndex]).toHaveLength(1);
    } finally {
      enemies.forEach((enemy, index) => Object.assign(enemy, originals[index]));
    }
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

  it("emits and persists Nagato special attack type 101 once per sortie", () => {
    const nagato = store.createShip(541);
    const mutsu = store.createShip(573);
    store.clearDeckFollowerShips(1);
    store.changeDeckShip(1, 0, nagato.id);
    store.changeDeckShip(1, 1, mutsu.id);
    const enemy = ENEMY_UNIT_TEMPLATES[1501];
    const original = { hp: enemy.hp, armor: enemy.armor };
    Object.assign(enemy, { hp: 999, armor: 999 });
    try {
      let activated: ReturnType<typeof createSortieBattle> | undefined;
      for (let seed = 0; seed < 64; seed += 1) {
        store.db.prepare("UPDATE sortie_sessions SET seed = ? WHERE id = 1").run(seed);
        const candidate = createSortieBattle(store.getSave(), { formation: 5 });
        if (candidate.payload.api_hougeki1.api_at_type.includes(101)) {
          activated = candidate;
          break;
        }
      }
      expect(activated).toBeDefined();
      const index = activated!.payload.api_hougeki1.api_at_type.indexOf(101);
      expect(activated!.payload.api_hougeki1.api_damage[index]).toHaveLength(3);
      expect(activated!.record.specialAttacks?.[0]).toMatchObject({
        type: 101,
        phase: "day",
        participantShipIds: [nagato.id, mutsu.id, nagato.id]
      });

      store.recordSortieBattle(activated!.record as unknown as Record<string, unknown>);
      expect((store.getSave().sortieSession?.state.specialAttackUsage as any)?.[0]).toEqual({ type: 101, count: 1 });
      const repeat = createSortieBattle(store.getSave(), { formation: 5 });
      expect(repeat.payload.api_hougeki1.api_at_type).not.toContain(101);
    } finally {
      Object.assign(enemy, original);
    }
  });

  it("emits one grouped submarine fleet attack entry for the selected pair", () => {
    const tender = store.createShip(639);
    const submarines = [398, 399, 400].map((masterId) => store.createShip(masterId));
    store.clearDeckFollowerShips(1);
    store.changeDeckShip(1, 0, tender.id);
    submarines.forEach((ship, index) => store.changeDeckShip(1, index + 1, ship.id));
    store.db.prepare("UPDATE ships SET level = 99 WHERE id IN (?, ?, ?, ?)")
      .run(tender.id, ...submarines.map((ship) => ship.id));
    for (const submarine of submarines) {
      const radar = store.createSlotItem(210);
      store.equipSlotItem(submarine.id, 0, radar.id);
    }
    expect(store.setUseItemCount(95, 1)).toMatchObject({ ok: true });
    store.startSortie(1, 1, 1);

    withEnemyTemplatePatch({ hp: 999, armor: 999, firepower: 0, torpedo: 0 }, () => {
      let activated: ReturnType<typeof createSortieBattle> | undefined;
      for (let seed = 0; seed < 128; seed += 1) {
        store.db.prepare("UPDATE sortie_sessions SET seed = ? WHERE id = 1").run(seed);
        const candidate = createSortieBattle(store.getSave(), { formation: 5 });
        if (candidate.payload.api_hougeki1.api_at_type.includes(302)) {
          activated = candidate;
          break;
        }
      }
      expect(activated).toBeDefined();
      const hougeki = activated!.payload.api_hougeki1;
      const specialIndexes = hougeki.api_at_type
        .map((type: number, index: number) => type === 302 ? index : -1)
        .filter((index: number) => index >= 0);
      expect(specialIndexes).toHaveLength(1);
      const index = specialIndexes[0];
      expect(hougeki.api_at_list[index]).toBe(0);
      expect(hougeki.api_damage[index]).toHaveLength(4);
      expect(hougeki.api_df_list[index]).toHaveLength(4);
      expect(hougeki.api_cl_list[index]).toHaveLength(4);
      expect(activated!.record.specialAttacks).toEqual([
        expect.objectContaining({ type: 302, useItemId: 95, useItemAmount: 1 })
      ]);
      expect(activated!.record.specialAttackResources?.useItem95Consumed).toBe(1);

      let night: ReturnType<typeof createNightBattle> | undefined;
      for (let deckId = 1; deckId < 128; deckId += 1) {
        const record = {
          ...activated!.record,
          deckId,
          after: {
            ...activated!.record.after,
            fNowHps: [...activated!.record.before.fNowHps],
            eNowHps: [999, 0, 0, 0, 0, 0]
          },
          units: {
            ...activated!.record.units!,
            friendly: activated!.record.units!.friendly.map((unit) => ({ ...unit, luck: 500 })),
            enemy: activated!.record.units!.enemy.map((unit) => ({ ...unit, maxHp: 999, armor: 999 }))
          }
        };
        const candidate = createNightBattle(record);
        if ((candidate.payload.api_hougeki as any).api_sp_list.includes(302)) {
          night = candidate;
          break;
        }
      }
      expect(night).toBeDefined();
      expect(night!.record.specialAttacks?.filter((attack) => attack.useItemId === 95)).toHaveLength(1);
      expect(night!.record.specialAttackResources?.useItem95Consumed).toBe(1);
    });
  });

  it("applies engagement modifiers to daytime shelling damage", () => {
    const nagato = store.createShip(80);
    store.changeDeckShip(1, 0, nagato.id);
    store.db.prepare("UPDATE sortie_sessions SET seed = 0 WHERE id = 1").run();
    const enemies = [1501, 1502, 1503].map((id) => ENEMY_UNIT_TEMPLATES[id]);
    const originals = enemies.map((enemy) => ({ hp: enemy.hp, armor: enemy.armor }));
    for (const enemy of enemies) {
      enemy.hp = 999;
      enemy.armor = 0;
    }
    try {
      const favorable = createSortieBattle(store.getSave(), { formation: 1, engagement: 3 });
      const disadvantage = createSortieBattle(store.getSave(), { formation: 1, engagement: 4 });
      const favorableAttackIndex = favorable.payload.api_hougeki1.api_at_eflag.indexOf(0);
      const disadvantageAttackIndex = disadvantage.payload.api_hougeki1.api_at_eflag.indexOf(0);

      expect(favorable.payload.api_formation[2]).toBe(3);
      expect(disadvantage.payload.api_formation[2]).toBe(4);
      expect(favorable.payload.api_hougeki1.api_damage[favorableAttackIndex][0])
        .toBeGreaterThan(disadvantage.payload.api_hougeki1.api_damage[disadvantageAttackIndex][0]);
    } finally {
      enemies.forEach((enemy, index) => {
        enemy.hp = originals[index].hp;
        enemy.armor = originals[index].armor;
      });
    }
  });

  it("applies engagement modifiers to both opening and closing torpedo salvos", () => {
    const kitakami = store.createShip(119);
    const midgetSub = store.createSlotItem(41);
    store.equipSlotItem(kitakami.id, 0, midgetSub.id);
    store.changeDeckShip(1, 0, kitakami.id);
    store.clearDeckFollowerShips(1);
    store.db.prepare("UPDATE sortie_sessions SET seed = 0 WHERE id = 1").run();

    withPatchedNodeEncounters(11, 1, { shipIds: [1501], formation: 1, weight: 1 }, () => {
      withEnemyTemplate(1501, {
        hp: 999,
        armor: 0,
        firepower: 0,
        torpedo: 0,
        accuracy: 0,
        evasion: 0,
        range: 1,
        slots: [],
        onSlot: []
      }, () => {
        let favorableOpening = 0;
        let disadvantageOpening = 0;
        let favorableClosing = 0;
        let disadvantageClosing = 0;
        for (let seed = 0; seed < 64; seed += 1) {
          store.db.prepare("UPDATE sortie_sessions SET seed = ? WHERE id = 1").run(seed);
          const favorable = createSortieBattle(store.getSave(), { formation: 1, engagement: 3 });
          const disadvantage = createSortieBattle(store.getSave(), { formation: 1, engagement: 4 });
          favorableOpening += favorable.payload.api_opening_atack?.api_fydam[0] ?? 0;
          disadvantageOpening += disadvantage.payload.api_opening_atack?.api_fydam[0] ?? 0;
          favorableClosing += favorable.payload.api_raigeki?.api_fydam[0] ?? 0;
          disadvantageClosing += disadvantage.payload.api_raigeki?.api_fydam[0] ?? 0;
        }

        expect(favorableOpening).toBeGreaterThan(disadvantageOpening);
        expect(favorableClosing).toBeGreaterThan(disadvantageClosing);
      });
    });
  });

  it("uses enemy formation when resolving enemy daytime shelling", () => {
    const yamato = store.createShip(911);
    store.changeDeckShip(1, 0, yamato.id);
    store.clearDeckFollowerShips(1);
    store.db.prepare("UPDATE sortie_sessions SET seed = 0 WHERE id = 1").run();

    withPatchedNodeEncounters(11, 1, { shipIds: [1501], formation: 1, weight: 1 }, () => {
      withEnemyTemplate(1501, {
        hp: 500,
        armor: 300,
        firepower: 170,
        torpedo: 0,
        accuracy: 999,
        evasion: 0,
        range: 4,
        slots: [],
        onSlot: []
      }, () => {
        const lineAhead = createSortieBattle(store.getSave(), { formation: 1 });
        withPatchedNodeEncounters(11, 1, { shipIds: [1501], formation: 3, weight: 1 }, () => {
          const ring = createSortieBattle(store.getSave(), { formation: 1 });

          expect(lineAhead.payload.api_formation).toEqual([1, 1, 1]);
          expect(ring.payload.api_formation).toEqual([1, 3, 1]);
          expect(firstDamageBySide(lineAhead.payload.api_hougeki1, 1))
            .toBeGreaterThan(firstDamageBySide(ring.payload.api_hougeki1, 1));
        });
      });
    });
  });

  it("uses enemy formation when resolving enemy closing torpedoes", () => {
    const yamato = store.createShip(911);
    // Keep both formation outcomes non-lethal so conditional overkill
    // protection cannot mask the torpedo-formation multiplier.
    store.db.prepare("UPDATE ships SET hp = 500, max_hp = 500 WHERE id = ?").run(yamato.id);
    store.changeDeckShip(1, 0, yamato.id);
    store.clearDeckFollowerShips(1);
    store.db.prepare("UPDATE sortie_sessions SET seed = 0 WHERE id = 1").run();

    withPatchedNodeEncounters(11, 1, { shipIds: [1501], formation: 1, weight: 1 }, () => {
      withEnemyTemplate(1501, {
        hp: 500,
        armor: 300,
        firepower: 0,
        torpedo: 130,
        accuracy: 999,
        evasion: 0,
        range: 1,
        slots: [],
        onSlot: []
      }, () => {
        const lineAhead = createSortieBattle(store.getSave(), { formation: 1 });
        withPatchedNodeEncounters(11, 1, { shipIds: [1501], formation: 3, weight: 1 }, () => {
          const ring = createSortieBattle(store.getSave(), { formation: 1 });

          expect(lineAhead.payload.api_formation).toEqual([1, 1, 1]);
          expect(ring.payload.api_formation).toEqual([1, 3, 1]);
          expect(lineAhead.payload.api_raigeki?.api_fdam[0] ?? 0)
            .toBeGreaterThan(ring.payload.api_raigeki?.api_fdam[0] ?? 0);
        });
      });
    });
  });

  it("activates equipped damage control once and carries that state into night battle", () => {
    const fubuki = store.createShip(9);
    const repairPersonnel = store.createSlotItem(42);
    store.equipSlotItem(fubuki.id, 0, repairPersonnel.id);
    store.db.prepare("UPDATE ships SET hp = 1, max_hp = 15 WHERE id = ?").run(fubuki.id);
    store.changeDeckShip(1, 0, fubuki.id);
    store.clearDeckFollowerShips(1);
    store.db.prepare("UPDATE sortie_sessions SET seed = 0 WHERE id = 1").run();

    withPatchedNodeEncounters(11, 1, { shipIds: [1501], formation: 1, weight: 1 }, () => {
      withEnemyTemplate(1501, {
        hp: 999,
        armor: 999,
        firepower: 999,
        torpedo: 999,
        accuracy: 999,
        evasion: 0,
        range: 4,
        slots: [],
        onSlot: []
      }, () => {
        const day = createSortieBattle(store.getSave(), { formation: 1 });
        const activation = day.record.damageControlActivations?.[0];
        const snapshot = day.record.units?.friendly[0];

        expect(activation).toEqual({
          shipId: fubuki.id,
          slotItemId: repairPersonnel.id,
          slotMasterId: 42,
          restoredHp: 7,
          restoreFuelAmmo: false
        });
        expect(day.record.after.fNowHps[0]).toBeGreaterThanOrEqual(1);
        expect(snapshot?.damageControlActivated).toBe(true);
        expect(snapshot?.equippedSlots.map((slot) => slot.slotItemId)).not.toContain(repairPersonnel.id);

        const night = createNightBattle(day.record);

        expect(night.record.damageControlActivations).toEqual([activation]);
        expect(night.record.after.fNowHps[0]).toBeGreaterThanOrEqual(1);

        store.recordSortieBattle(night.record as unknown as Record<string, unknown>);
        expect(store.applySortieBattleResult().applied).toBe(true);
        const settled = store.getSave();
        expect(settled.slotItems.some((item) => item.id === repairPersonnel.id)).toBe(false);
        expect(settled.ships.find((ship) => ship.id === fubuki.id)?.slotIds).not.toContain(repairPersonnel.id);
        const once = JSON.stringify(settled);
        expect(store.applySortieBattleResult().applied).toBe(false);
        expect(JSON.stringify(store.getSave())).toBe(once);
      });
    });
  });

  it("consumes a repair goddess from an open extra slot and restores fuel and ammo at settlement", () => {
    const fubuki = store.createShip(9);
    const goddess = store.createSlotItem(43);
    store.db.prepare("UPDATE ships SET hp = 1, fuel = 1, ammo = 1, ex_slot_id = 0 WHERE id = ?").run(fubuki.id);
    expect(store.equipExSlotItem(fubuki.id, goddess.id)).toBeTruthy();
    store.changeDeckShip(1, 0, fubuki.id);
    store.clearDeckFollowerShips(1);
    const battle = createSortieBattle(store.getSave(), { formation: 1 });
    const record = {
      ...battle.record,
      damageControlActivations: [{
        shipId: fubuki.id,
        slotItemId: goddess.id,
        slotMasterId: 43,
        restoredHp: fubuki.maxHp,
        restoreFuelAmmo: true
      }],
      after: {
        ...battle.record.after,
        fNowHps: [fubuki.maxHp, -1, -1, -1, -1, -1]
      }
    };

    store.recordSortieBattle(record as unknown as Record<string, unknown>);
    expect(store.applySortieBattleResult().applied).toBe(true);
    const settled = store.getSave();
    const ship = settled.ships.find((candidate) => candidate.id === fubuki.id)!;
    expect(ship).toMatchObject({ hp: fubuki.maxHp, fuel: fubuki.maxFuel, ammo: fubuki.maxAmmo, exSlotId: 0 });
    expect(settled.slotItems.some((item) => item.id === goddess.id)).toBe(false);
    expect(store.integrityIssues()).toEqual([]);
  });

  it("uses enemy formation when resolving enemy anti-air interception", () => {
    const akagi = store.createShip(277);
    const bomber = store.createSlotItem(23);
    store.equipSlotItem(akagi.id, 2, bomber.id);
    store.changeDeckShip(1, 0, akagi.id);
    store.clearDeckFollowerShips(1);
    store.db.prepare("UPDATE sortie_sessions SET seed = 0 WHERE id = 1").run();

    withPatchedNodeEncounters(11, 1, { shipIds: [1501], formation: 1, weight: 1 }, () => {
      withEnemyTemplate(1501, {
        hp: 500,
        armor: 300,
        firepower: 0,
        torpedo: 0,
        aa: 100,
        slots: [3, 10, 30],
        onSlot: [0, 0, 0]
      }, () => {
        let lineAheadLosses = 0;
        let ringLosses = 0;
        withPatchedNodeEncounters(11, 1, { shipIds: [1501], formation: 3, weight: 1 }, () => {
          for (let seed = 0; seed < 128; seed += 1) {
            store.db.prepare("UPDATE sortie_sessions SET seed = ? WHERE id = 1").run(seed);
            const ring = createSortieBattle(store.getSave(), { formation: 1 });
            expect(ring.payload.api_formation).toEqual([1, 3, 1]);
            ringLosses += ring.payload.api_kouku?.api_stage2?.api_f_lostcount ?? 0;
          }
        });
        for (let seed = 0; seed < 128; seed += 1) {
          store.db.prepare("UPDATE sortie_sessions SET seed = ? WHERE id = 1").run(seed);
          const lineAhead = createSortieBattle(store.getSave(), { formation: 1 });
          expect(lineAhead.payload.api_formation).toEqual([1, 1, 1]);
          lineAheadLosses += lineAhead.payload.api_kouku?.api_stage2?.api_f_lostcount ?? 0;
        }
        expect(ringLosses).toBeGreaterThan(lineAheadLosses);
      });
    });
  });

  it("uses target evasion when resolving daytime shelling hits", () => {
    const nagato = store.createShip(80);
    store.changeDeckShip(1, 0, nagato.id);
    store.db.prepare("UPDATE sortie_sessions SET seed = 0 WHERE id = 1").run();
    const original = { ...ENEMY_UNIT_TEMPLATES[1501] };
    Object.assign(ENEMY_UNIT_TEMPLATES[1501], {
      hp: 999,
      armor: 0,
      evasion: 999
    });
    try {
      const battle = createSortieBattle(store.getSave(), { formation: 1 });
      const friendlyAttackIndex = battle.payload.api_hougeki1.api_at_eflag.indexOf(0);

      expect(battle.record.units?.enemy[0]).toMatchObject({ evasion: 999 });
      expect(battle.payload.api_hougeki1.api_cl_list[friendlyAttackIndex][0]).toBe(0);
      expect(battle.payload.api_hougeki1.api_damage[friendlyAttackIndex][0]).toBe(0);
    } finally {
      Object.assign(ENEMY_UNIT_TEMPLATES[1501], original);
      if (original.evasion == null) delete ENEMY_UNIT_TEMPLATES[1501].evasion;
    }
  });

  it("prioritizes submarine targets for ASW-capable daytime shelling", () => {
    let patchedNode: ReturnType<typeof sortieNodes>[number] | undefined;
    let originalShipIds: number[][] = [];
    try {
      const sonar = store.createSlotItem(46);
      store.equipSlotItem(1, 0, sonar.id);
      store.db.prepare("UPDATE sortie_sessions SET seed = 1 WHERE id = 1").run();
      patchedNode = sortieNodes().find((item) => item.mapId === 11 && item.node === 1)!;
      originalShipIds = patchedNode.encounters.map((encounter) => [...encounter.shipIds]);
      for (const encounter of patchedNode.encounters) {
        (encounter as any).shipIds = [1530, 1501];
      }

      const battle = createSortieBattle(store.getSave(), { formation: 1 });
      const friendlyAttackIndex = battle.payload.api_hougeki1.api_at_eflag.indexOf(0);

      expect(battle.payload.api_ship_ke.slice(0, 2)).toEqual([1530, 1501]);
      expect(battle.payload.api_hougeki1.api_df_list[friendlyAttackIndex]).toEqual([0]);
      expect(battle.payload.api_hougeki1.api_si_list[friendlyAttackIndex]).toEqual([46]);
    } finally {
      patchedNode?.encounters.forEach((encounter, index) => {
        (encounter as any).shipIds = originalShipIds[index];
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

  it("requires night aviation personnel for non-native carrier night air attacks", () => {
    const shoukaku = store.createShip(466);
    const nightFighter = store.createSlotItem(338);
    store.equipSlotItem(shoukaku.id, 0, nightFighter.id);
    store.changeDeckShip(1, 0, shoukaku.id);
    for (let index = 1; index < 6; index += 1) store.changeDeckShip(1, index, -1);

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
        friendly: battle.record.units!.friendly.map((unit, index) => ({
          ...unit,
          maxHp: 999,
          armor: 999,
          luck: index === 0 ? 500 : unit.luck
        })),
        enemy: battle.record.units!.enemy.map((unit) => ({ ...unit, maxHp: 999, armor: 999 }))
      }
    };

    const hougeki = createNightBattlePayload(record).api_hougeki as any;
    const friendlyAttackIndex = hougeki.api_at_list.findIndex(
      (attacker: number, index: number) => attacker === 0 && hougeki.api_at_eflag[index] === 0
    );

    expect(friendlyAttackIndex).toBe(-1);
  });

  it("emits carrier night air attacks with client night-carrier markers", () => {
    const shoukaku = store.createShip(466);
    const nightFighter = store.createSlotItem(338);
    const nightPersonnel = store.createSlotItem(258);
    store.equipSlotItem(shoukaku.id, 0, nightFighter.id);
    store.equipSlotItem(shoukaku.id, 1, nightPersonnel.id);
    store.changeDeckShip(1, 0, shoukaku.id);
    for (let index = 1; index < 6; index += 1) store.changeDeckShip(1, index, -1);

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
        friendly: battle.record.units!.friendly.map((unit, index) => ({
          ...unit,
          maxHp: 999,
          armor: 999,
          luck: index === 0 ? 500 : unit.luck
        })),
        enemy: battle.record.units!.enemy.map((unit) => ({ ...unit, maxHp: 999, armor: 999 }))
      }
    };

    const hougeki = createNightBattlePayload(record).api_hougeki as any;
    const friendlyAttackIndex = hougeki.api_at_list.findIndex(
      (attacker: number, index: number) => attacker === 0 && hougeki.api_at_eflag[index] === 0
    );

    expect(friendlyAttackIndex).toBeGreaterThanOrEqual(0);
    expect(hougeki.api_sp_list[friendlyAttackIndex]).toBe(0);
    expect(hougeki.api_n_mother_list[friendlyAttackIndex]).toBe(1);
    expect(hougeki.api_si_list[friendlyAttackIndex]).toEqual([338]);
  });

  it("encodes carrier night air cut-ins with api_sp_list type 6", () => {
    const shoukaku = store.createShip(466);
    const nightFighter = store.createSlotItem(254);
    const nightAttacker = store.createSlotItem(257);
    const nightPersonnel = store.createSlotItem(258);
    store.equipSlotItem(shoukaku.id, 0, nightFighter.id);
    store.equipSlotItem(shoukaku.id, 1, nightAttacker.id);
    store.equipSlotItem(shoukaku.id, 2, nightPersonnel.id);
    store.changeDeckShip(1, 0, shoukaku.id);
    for (let index = 1; index < 6; index += 1) store.changeDeckShip(1, index, -1);

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
        friendly: battle.record.units!.friendly.map((unit, index) => ({
          ...unit,
          maxHp: 999,
          armor: 999,
          luck: index === 0 ? 500 : unit.luck
        })),
        enemy: battle.record.units!.enemy.map((unit) => ({ ...unit, maxHp: 999, armor: 999 }))
      }
    };

    const hougeki = createNightBattlePayload(record).api_hougeki as any;
    const cutInIndex = hougeki.api_sp_list.indexOf(6);

    expect(cutInIndex).toBeGreaterThanOrEqual(0);
    expect(hougeki.api_at_eflag[cutInIndex]).toBe(0);
    expect(hougeki.api_n_mother_list[cutInIndex]).toBe(1);
    expect(hougeki.api_si_list[cutInIndex]).toEqual([254, 254, 257]);
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
      deckId: 2,
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
      deckId: 2,
      after: {
        ...battle.record.after,
        fNowHps: [...battle.record.before.fNowHps],
        eNowHps: [20, 20, 0, 0, 0, 0]
      },
      units: {
        ...battle.record.units!,
        friendly: battle.record.units!.friendly.map((unit, index) => ({
          ...unit,
          luck: index === 0 ? 500 : unit.luck
        }))
      }
    };
    const night = createNightBattlePayload(record);
    const hougeki = night.api_hougeki as any;
    const cutInIndex = hougeki.api_sp_list.indexOf(3);

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
      deckId: 2,
      after: {
        ...battle.record.after,
        fNowHps: [999, 0, 0, 0, 0, 0],
        eNowHps: [999, 0, 0, 0, 0, 0]
      },
      units: {
        ...battle.record.units!,
        friendly: battle.record.units!.friendly.map((unit, index) => ({
          ...unit,
          maxHp: 999,
          armor: 999,
          luck: index === 0 ? 500 : unit.luck
        })),
        enemy: battle.record.units!.enemy.map((unit) => ({ ...unit, maxHp: 999, armor: 999 }))
      }
    };
    const night = createNightBattlePayload(record);
    const hougeki = night.api_hougeki as any;
    const cutInIndex = hougeki.api_sp_list.indexOf(2);

    expect(cutInIndex).toBeGreaterThanOrEqual(0);
    expect(hougeki.api_si_list[cutInIndex]).toEqual(expect.arrayContaining([7, 13]));
    expect(hougeki.api_damage[cutInIndex]).toHaveLength(2);
  });

  it.each([
    ["two main guns plus secondary", 4, [7, 8, 12]],
    ["three main guns", 5, [7, 8, 4]]
  ] as const)("encodes %s as night protocol type %i", (_name, spType, equipmentIds) => {
    const nagato = store.createShip(80);
    store.clearDeckFollowerShips(1);
    store.changeDeckShip(1, 0, nagato.id);
    equipmentIds.forEach((itemMasterId, slot) => {
      const item = store.createSlotItem(itemMasterId);
      store.equipSlotItem(nagato.id, slot, item.id);
    });
    const battle = createSortieBattle(store.getSave(), { formation: 1 });
    const record = {
      ...battle.record,
      deckId: 2,
      after: {
        ...battle.record.after,
        fNowHps: [999, 0, 0, 0, 0, 0],
        eNowHps: [999, 0, 0, 0, 0, 0]
      },
      units: {
        ...battle.record.units!,
        friendly: battle.record.units!.friendly.map((unit, index) => ({
          ...unit,
          maxHp: 999,
          armor: 999,
          luck: index === 0 ? 500 : unit.luck
        })),
        enemy: battle.record.units!.enemy.map((unit) => ({ ...unit, maxHp: 999, armor: 999 }))
      }
    };
    const hougeki = createNightBattlePayload(record).api_hougeki as any;
    const cutInIndex = hougeki.api_sp_list.indexOf(spType);
    expect(cutInIndex).toBeGreaterThanOrEqual(0);
    expect(hougeki.api_si_list[cutInIndex]).toEqual(equipmentIds);
    expect(hougeki.api_damage[cutInIndex]).toHaveLength(1);
  });

  it("falls back to a normal night attack when cut-in activation fails", () => {
    const torpedoA = store.createSlotItem(13);
    const torpedoB = store.createSlotItem(14);
    store.equipSlotItem(1, 0, torpedoA.id);
    store.equipSlotItem(1, 1, torpedoB.id);
    const battle = createSortieBattle(store.getSave(), { formation: 1 });
    const record = {
      ...battle.record,
      units: {
        ...battle.record.units!,
        friendly: battle.record.units!.friendly.map((unit, index) => ({
          ...unit,
          luck: index === 0 ? 0 : unit.luck
        })),
        enemy: battle.record.units!.enemy.map((unit) => ({ ...unit, maxHp: 999, armor: 999 }))
      },
      after: {
        ...battle.record.after,
        fNowHps: [...battle.record.before.fNowHps],
        eNowHps: [999, 999, 0, 0, 0, 0]
      }
    };

    const night = createNightBattlePayload(record);
    const hougeki = night.api_hougeki as any;
    const firstFriendlyAttack = hougeki.api_at_eflag.findIndex((side: number) => side === 0);

    expect(hougeki.api_sp_list[firstFriendlyAttack]).toBe(0);
    expect(hougeki.api_damage[firstFriendlyAttack]).toHaveLength(1);
  });

  it("uses night battle equipment when rolling cut-in activation", () => {
    const kitakami = store.createShip(119);
    const torpedoA = store.createSlotItem(13);
    const torpedoB = store.createSlotItem(14);
    const searchlight = store.createSlotItem(74);
    store.equipSlotItem(kitakami.id, 0, torpedoA.id);
    store.equipSlotItem(kitakami.id, 1, torpedoB.id);
    store.equipSlotItem(kitakami.id, 2, searchlight.id);
    store.changeDeckShip(1, 0, kitakami.id);
    store.changeDeckShip(1, 1, -1);

    const battle = createSortieBattle(store.getSave(), { formation: 1 });
    const record = {
      ...battle.record,
      deckId: 21,
      after: {
        ...battle.record.after,
        fNowHps: [40, 0, 0, 0, 0, 0],
        eNowHps: [40, 0, 0, 0, 0, 0]
      },
      units: {
        ...battle.record.units!,
        friendly: battle.record.units!.friendly.map((unit, index) => ({
          ...unit,
          luck: index === 0 ? 40 : unit.luck,
          maxHp: 40
        })),
        enemy: battle.record.units!.enemy.map((unit) => ({ ...unit, maxHp: 40, armor: 999 }))
      }
    };
    let differentiatingRoll: { withoutSearchlight: any; withSearchlight: any } | undefined;
    for (let deckId = 1; deckId <= 256; deckId += 1) {
      const withoutSearchlight = createNightBattlePayload({
        ...record,
        deckId,
        units: {
          ...record.units,
          friendly: record.units.friendly.map((unit, index) => index === 0
            ? {
                ...unit,
                equippedSlots: unit.equippedSlots.filter((slot) => slot.slotMasterId !== 74),
                slots: unit.slots.filter((slotId) => slotId !== 74)
              }
            : unit)
        }
      });
      const withSearchlight = createNightBattlePayload({ ...record, deckId });
      if (!(withoutSearchlight.api_hougeki as any).api_sp_list.includes(3) &&
          (withSearchlight.api_hougeki as any).api_sp_list.includes(3)) {
        differentiatingRoll = { withoutSearchlight, withSearchlight };
        break;
      }
    }

    expect(differentiatingRoll).toBeDefined();
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
      expect(opening.api_frai).toHaveLength(12);
      expect(opening.api_frai[6]).toBeGreaterThanOrEqual(0);
      expect(battle.record.result.mvpCombined).toBe(1);
      expect(battle.record.phases.openingAtack).toBe(opening);
    } finally {
      enemies.forEach((enemy, index) => {
        enemy.hp = originals[index].hp;
        enemy.armor = originals[index].armor;
      });
    }
  });

  it("runs carrier-task-force shelling as escort, main, then main against a single fleet", () => {
    const mainNagato = store.createShip(80);
    const mainGun = store.createSlotItem(7);
    const escortFubuki = store.createShip(9);
    const escortGun = store.createSlotItem(2);
    store.equipSlotItem(mainNagato.id, 0, mainGun.id);
    store.equipSlotItem(escortFubuki.id, 0, escortGun.id);
    store.changeDeckShip(1, 0, mainNagato.id);
    store.clearDeckFollowerShips(1);
    store.changeDeckShip(2, 0, escortFubuki.id);
    store.clearDeckFollowerShips(2);
    store.db.prepare("UPDATE players SET combined_fleet = 1 WHERE id = 1").run();
    store.db.prepare("UPDATE sortie_sessions SET seed = 0 WHERE id = 1").run();

    withPatchedNodeEncounters(11, 1, { shipIds: [1501], formation: 1, weight: 1 }, () => {
      withEnemyTemplate(1501, {
        hp: 999,
        armor: 999,
        firepower: 0,
        torpedo: 0,
        accuracy: 0,
        evasion: 0,
        range: 1,
        slots: [],
        onSlot: []
      }, () => {
        const battle = createCombinedBattle(store.getSave(), { formation: 1 });
        const friendlyUsedSlots = (phase: typeof battle.payload.api_hougeki1 | null) => phase
          ? phase.api_si_list.filter((_slots, index) => phase.api_at_eflag[index] === 0).flat()
          : [];

        expect(friendlyUsedSlots(battle.payload.api_hougeki1)).toContain(2);
        expect(friendlyUsedSlots(battle.payload.api_hougeki1)).not.toContain(7);
        expect(friendlyUsedSlots(battle.payload.api_hougeki2)).toContain(7);
        expect(friendlyUsedSlots(battle.payload.api_hougeki3)).toContain(7);
      });
    });
  });

  it("populates enemy combined fleet payloads from sortie encounter data", () => {
    const node = sortieNodes().find((item) => item.mapId === 11 && item.node === 1)!;
    const originalEscortIds = node.encounters.map((encounter) => [...((encounter as any).enemyCombinedShipIds ?? [])]);
    for (const encounter of node.encounters) {
      (encounter as any).enemyCombinedShipIds = [1502, 1503];
    }
    store.db.prepare("UPDATE players SET combined_fleet = 1 WHERE id = 1").run();
    store.db.prepare("UPDATE sortie_sessions SET seed = 0 WHERE id = 1").run();

    try {
      const battle = createCombinedBattle(store.getSave(), { formation: 1 });
      const payload = battle.payload as any;

      expect(payload.api_ship_ke_combined).toHaveLength(6);
      expect(payload.api_ship_ke_combined.slice(0, 2)).toEqual([1502, 1503]);
      expect(payload.api_e_nowhps_combined).toHaveLength(6);
      expect(payload.api_e_nowhps_combined[0]).toBe(ENEMY_UNIT_TEMPLATES[1502].hp);
      expect(payload.api_eParam_combined).toHaveLength(6);
      expect(payload.api_eParam_combined[0]).toEqual([
        ENEMY_UNIT_TEMPLATES[1502].firepower,
        ENEMY_UNIT_TEMPLATES[1502].torpedo,
        ENEMY_UNIT_TEMPLATES[1502].aa,
        ENEMY_UNIT_TEMPLATES[1502].armor
      ]);
      expect(payload.api_eSlot_combined).toHaveLength(6);
      expect(payload.api_eSlot_combined[0][0]).toBeGreaterThan(0);
      expect(payload.api_nowhps_combined).toHaveLength(13);
      expect(payload.api_escape_idx).toBeNull();
      expect(payload.api_escape_idx_combined).toBeNull();
      expect(battle.record.units?.enemyCombined?.map((unit) => unit.masterId)).toEqual([1502, 1503]);
    } finally {
      node.encounters.forEach((encounter, index) => {
        if (originalEscortIds[index].length > 0) {
          (encounter as any).enemyCombinedShipIds = originalEscortIds[index];
        } else {
          delete (encounter as any).enemyCombinedShipIds;
        }
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
      deckId: 2,
      after: {
        ...battle.record.after,
        fNowHps: battle.record.before.fNowHps,
        fCombinedNowHps: battle.record.before.fCombinedNowHps,
        eNowHps: [999, 0, 0, 0, 0, 0]
      },
      units: {
        ...battle.record.units!,
        escort: battle.record.units!.escort?.map((unit, index) => ({
          ...unit,
          luck: index === 0 ? 500 : unit.luck
        })),
        enemy: battle.record.units!.enemy.map((unit) => ({ ...unit, maxHp: 999, armor: 999 }))
      }
    };
    const night = createNightBattlePayload(record);
    const hougeki = night.api_hougeki as any;
    const friendlyAttackIndex = hougeki.api_at_eflag.findIndex((side: number) => side === 0);

    expect(friendlyAttackIndex).toBeGreaterThanOrEqual(0);
    expect(hougeki.api_at_list[friendlyAttackIndex]).toBe(6);
    expect(hougeki.api_sp_list[friendlyAttackIndex]).toBe(3);
    expect(hougeki.api_si_list[friendlyAttackIndex]).toEqual(expect.arrayContaining([13, 14]));
  });

  describe("battle core acceptance scenarios", () => {
    it("acceptance: 1-1 normal battle emits day combat phases and a result record", () => {
      store.db.prepare("UPDATE sortie_sessions SET seed = 0 WHERE id = 1").run();

      const battle = createSortieBattle(store.getSave(), { formation: 1 });
      const enemyIds = battle.payload.api_ship_ke.filter((id: number) => id > 0);

      expect(enemyIds.length).toBeGreaterThan(0);
      expect(battle.payload.api_formation).toEqual([1, expect.any(Number), 1]);
      expect(battle.payload.api_hougeki1.api_at_list.length).toBeGreaterThan(0);
      expect(battle.payload.api_raigeki).toMatchObject({
        api_frai: expect.any(Array),
        api_erai: expect.any(Array)
      });
      expect(battle.record.result.rank).toMatch(/[SABCDE]/);
      expect(battle.record.result.mvp).toBeGreaterThanOrEqual(1);
    });

    it("acceptance: carrier normal battle includes aerial combat payloads", () => {
      const akagi = store.createShip(277);
      const fighter = store.createSlotItem(20);
      const bomber = store.createSlotItem(23);
      store.equipSlotItem(akagi.id, 0, fighter.id);
      store.equipSlotItem(akagi.id, 2, bomber.id);
      store.changeDeckShip(1, 0, akagi.id);
      store.db.prepare("UPDATE sortie_sessions SET seed = 0 WHERE id = 1").run();

      const battle = createSortieBattle(store.getSave(), { formation: 1 });
      const kouku = battle.payload.api_kouku;

      expect(battle.payload.api_stage_flag[0]).toBe(1);
      expect(kouku).not.toBeNull();
      expect(kouku?.api_plane_from[0]).toEqual([1]);
      expect(kouku?.api_stage1.api_f_count).toBeGreaterThan(0);
      expect(kouku?.api_stage3?.api_edam).toHaveLength(6);
    });

    it("acceptance: practice enemy carrier contributes its aircraft to aerial combat", () => {
      const rival = {
        id: 1,
        name: "Carrier Acceptance",
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

      expect(battle.payload.api_eSlot[0]).toEqual([22, 52, 23, 54, -1]);
      expect(battle.payload.api_kouku?.api_plane_from[1]).toEqual([1]);
      expect(battle.payload.api_kouku?.api_stage1.api_e_count).toBeGreaterThan(0);
      expect(battle.payload.api_kouku?.api_stage3?.api_fdam).toHaveLength(6);
    });

    it("acceptance: combined fleet aerial battle exposes escort HP and combined stage3 arrays", () => {
      const akagi = store.createShip(277);
      const fighter = store.createSlotItem(20);
      const bomber = store.createSlotItem(23);
      const escort = store.createShip(119);
      store.equipSlotItem(akagi.id, 0, fighter.id);
      store.equipSlotItem(akagi.id, 2, bomber.id);
      store.changeDeckShip(1, 0, akagi.id);
      store.changeDeckShip(2, 0, escort.id);
      store.db.prepare("UPDATE players SET combined_fleet = 1 WHERE id = 1").run();
      store.db.prepare("UPDATE sortie_sessions SET seed = 0 WHERE id = 1").run();

      const battle = createCombinedBattle(store.getSave(), { formation: 1 });

      expect(battle.payload.api_f_nowhps_combined).toHaveLength(6);
      expect(battle.payload.api_f_nowhps_combined[0]).toBeGreaterThan(0);
      expect(battle.payload.api_kouku?.api_stage3_combined).toBeTruthy();
      expect(battle.payload.api_kouku?.api_stage3_combined?.api_edam).toHaveLength(6);
    });

    it("normalizes unavailable combined formations when the escort has fewer than four ships", () => {
      const escortA = store.createShip(119);
      const escortB = store.createShip(1);
      const escortC = store.createShip(2);
      store.changeDeckShip(2, 0, escortA.id);
      store.changeDeckShip(2, 1, escortB.id);
      store.changeDeckShip(2, 2, escortC.id);
      store.db.prepare("UPDATE players SET combined_fleet = 1 WHERE id = 1").run();

      const battle = createCombinedBattle(store.getSave(), { formation: 3 });

      expect(battle.record.formation[0]).toBe(1);
      expect(battle.payload.api_formation[0]).toBe(1);
    });

    it("keeps escort aircraft out of combined air battle against normal enemy fleets", () => {
      const mainAkagi = store.createShip(277);
      const mainFighter = store.createSlotItem(20);
      const escortFlagship = store.createShip(119);
      const escortAkagi = store.createShip(277);
      const escortFighter = store.createSlotItem(20);
      store.equipSlotItem(mainAkagi.id, 0, mainFighter.id);
      store.equipSlotItem(escortAkagi.id, 0, escortFighter.id);
      store.changeDeckShip(1, 0, mainAkagi.id);
      store.changeDeckShip(2, 0, escortFlagship.id);
      store.changeDeckShip(2, 1, escortAkagi.id);
      store.db.prepare("UPDATE players SET combined_fleet = 1 WHERE id = 1").run();

      const battle = createCombinedBattle(store.getSave(), { formation: 1, endpoint: "combinedAir" });

      expect(battle.payload.api_kouku?.api_plane_from[0]).toEqual([1]);
    });

    it("acceptance: night torpedo cut-in keeps torpedo snapshots and two-hit damage", () => {
      const torpedoA = store.createSlotItem(13);
      const torpedoB = store.createSlotItem(14);
      store.equipSlotItem(1, 0, torpedoA.id);
      store.equipSlotItem(1, 1, torpedoB.id);

      const battle = createSortieBattle(store.getSave(), { formation: 1 });
      const night = createNightBattlePayload({
        ...battle.record,
        deckId: 2,
        units: {
          ...battle.record.units!,
          friendly: battle.record.units!.friendly.map((unit, index) => ({
            ...unit,
            luck: index === 0 ? 500 : unit.luck
          }))
        },
        after: {
          ...battle.record.after,
          fNowHps: [...battle.record.before.fNowHps],
          eNowHps: [20, 20, 0, 0, 0, 0]
        }
      });
      const hougeki = night.api_hougeki as any;
      const cutInIndex = hougeki.api_sp_list.indexOf(3);

      expect(cutInIndex).toBeGreaterThanOrEqual(0);
      expect(hougeki.api_si_list[cutInIndex]).toEqual(expect.arrayContaining([13, 14]));
      expect(hougeki.api_damage[cutInIndex]).toHaveLength(2);
    });

    it("acceptance: AACI can shoot all enemy attack aircraft down before stage3", () => {
      const defender = store.createShip(1);
      const highAngleA = store.createSlotItem(3);
      const highAngleB = store.createSlotItem(10);
      const radar = store.createSlotItem(30);
      store.equipSlotItem(defender.id, 0, highAngleA.id);
      store.equipSlotItem(defender.id, 1, highAngleB.id);
      store.equipSlotItem(defender.id, 2, radar.id);
      store.changeDeckShip(1, 0, defender.id);
      const rival = {
        id: 1,
        name: "AACI Acceptance",
        level: 120,
        rank: "元帥",
        comment: "small carrier loadout",
        flag: 1,
        medals: 4,
        ships: [
          {
            id: 101,
            masterId: 277,
            level: 120,
            star: 5,
            slotMasterIds: [23],
            onSlot: [3, 0, 0, 0, 0]
          }
        ]
      };

      const battle = createPracticeBattle(store.getSave(), {
        practiceEnemyId: 1,
        practiceRivals: [rival],
        formation: 1
      });
      const kouku = battle.payload.api_kouku;

      expect(kouku?.api_air_fire).toMatchObject({
        api_idx: 0,
        api_kind: 5,
        api_use_items: [3, 10, 30]
      });
      expect(kouku?.api_stage2?.api_e_count).toBeGreaterThan(0);
      expect(kouku?.api_stage2?.api_e_lostcount).toBe(kouku?.api_stage2?.api_e_count);
      expect(kouku?.api_stage3).toBeNull();
    });
  });
});

function setSortiePoint(store: StateStore, node: number, point: string) {
  const session = store.getSave().sortieSession!;
  store.db.prepare("UPDATE sortie_sessions SET node = ?, state_json = ? WHERE id = 1")
    .run(node, JSON.stringify({ ...session.state, point }));
}

function withEnemyTemplate(
  enemyId: number,
  patch: Partial<(typeof ENEMY_UNIT_TEMPLATES)[number]>,
  callback: () => void
) {
  const original = {
    ...ENEMY_UNIT_TEMPLATES[enemyId],
    slots: [...ENEMY_UNIT_TEMPLATES[enemyId].slots],
    onSlot: [...ENEMY_UNIT_TEMPLATES[enemyId].onSlot]
  };
  Object.assign(ENEMY_UNIT_TEMPLATES[enemyId], patch);
  try {
    callback();
  } finally {
    Object.assign(ENEMY_UNIT_TEMPLATES[enemyId], original);
    if (original.accuracy == null) delete ENEMY_UNIT_TEMPLATES[enemyId].accuracy;
    if (original.evasion == null) delete ENEMY_UNIT_TEMPLATES[enemyId].evasion;
  }
}

function withPatchedNodeEncounters(
  mapId: number,
  nodeNo: number,
  patch: { shipIds: number[]; formation: number; weight: number },
  callback: () => void
) {
  const node = sortieNodes().find((item) => item.mapId === mapId && item.node === nodeNo);
  if (!node) throw new Error(`missing sortie node ${mapId}:${nodeNo}`);
  const originals = node.encounters.map((encounter) => ({
    shipIds: [...encounter.shipIds],
    formation: encounter.formation,
    weight: encounter.weight
  }));
  try {
    for (const encounter of node.encounters) Object.assign(encounter as any, patch);
    callback();
  } finally {
    node.encounters.forEach((encounter, index) => {
      Object.assign(encounter as any, originals[index]);
    });
  }
}

function firstDamageBySide(hougeki: { api_at_eflag: number[]; api_damage: number[][] }, side: number) {
  const index = hougeki.api_at_eflag.findIndex((eflag) => eflag === side);
  return index >= 0 ? hougeki.api_damage[index]?.[0] ?? 0 : 0;
}
