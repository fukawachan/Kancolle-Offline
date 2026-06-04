import { masterData } from "../master/data.js";
import type { SaveState, Ship, SlotItem } from "../state/types.js";

export type BattleInput = {
  formation?: number;
  deckId?: number;
  practiceEnemyId?: number;
};

export type BattleMode = "sortie" | "practice" | "combined";

type Side = 0 | 1;

type BattleUnit = {
  side: Side;
  position: number;
  apiIndex: number;
  shipId: number;
  masterId: number;
  level: number;
  hp: number;
  maxHp: number;
  firepower: number;
  torpedo: number;
  aa: number;
  armor: number;
  luck: number;
  range: number;
  ammoModifier: number;
  slots: number[];
  damageDealt: number;
};

export type HougekiPayload = {
  api_at_eflag: number[];
  api_at_list: number[];
  api_at_type: number[];
  api_df_list: number[][];
  api_si_list: number[][];
  api_cl_list: number[][];
  api_damage: number[][];
  api_sp_list?: number[];
  api_n_mother_list?: number[];
};

export type RaigekiPayload = {
  api_frai: number[];
  api_erai: number[];
  api_fdam: number[];
  api_edam: number[];
  api_fydam: number[];
  api_eydam: number[];
  api_fcl: number[];
  api_ecl: number[];
  api_frai_flag: number[];
  api_erai_flag: number[];
  api_fbak_flag: number[];
  api_ebak_flag: number[];
};

export type BattlePayload = Record<string, any> & {
  api_deck_id: number;
  api_dock_id: number;
  api_formation: [number, number, number];
  api_ship_ke: number[];
  api_hougeki1: HougekiPayload;
  api_raigeki: RaigekiPayload | null;
};

export type BattleRecord = {
  mode: BattleMode;
  deckId: number;
  escortDeckId?: number;
  practiceEnemyId?: number;
  shipIds: number[];
  shipMasterIds: number[];
  escortShipIds?: number[];
  escortShipMasterIds?: number[];
  enemyIds: number[];
  formation: [number, number, number];
  before: {
    fNowHps: number[];
    eNowHps: number[];
    fCombinedNowHps?: number[];
    eCombinedNowHps?: number[];
  };
  after: {
    fNowHps: number[];
    eNowHps: number[];
    fCombinedNowHps?: number[];
    eCombinedNowHps?: number[];
  };
  phases: {
    hougeki1: HougekiPayload;
    hougeki2: HougekiPayload | null;
    hougeki3: HougekiPayload | null;
    raigeki: RaigekiPayload | null;
    night?: HougekiPayload;
  };
  result: BattleResultRecord;
  settlement?: BattleSettlementRecord;
  resultClaimed?: boolean;
};

export type BattleResultRecord = {
  rank: "S" | "A" | "B" | "C";
  mvp: number;
  mvpCombined?: number;
  getExp: number;
  baseExp: number;
  memberExp: number;
  dropShipId: number;
  dropShipName: string;
  dropShipType: string;
};

export type FleetSettlementSlot = {
  shipId: number;
  gainedExp: number;
  beforeExp: number;
  afterExp: number;
  afterLevel: number;
  levelup: number[];
};

export type BattleSettlementRecord = {
  memberLevel: number;
  memberExp: number;
  memberExpGain: number;
  mvp: number;
  mvpCombined?: number;
  dropShipId: number;
  main: FleetSettlementSlot[];
  escort?: FleetSettlementSlot[];
};

export type PracticeRival = {
  id: number;
  name: string;
  level: number;
  rank: string;
  comment: string;
  flag: number;
  medals: number;
  ships: { id: number; masterId: number; level: number; star: number }[];
};

type DamageInput = {
  attackPower: number;
  armor: number;
  armorRoll: number;
  ammoModifier: number;
  targetHp?: number;
};

const PRACTICE_RIVALS: PracticeRival[] = [
  {
    id: 1,
    name: "Local Training Fleet",
    level: 5,
    rank: "少佐",
    comment: "Offline practice opponent",
    flag: 1,
    medals: 0,
    ships: [
      { id: 101, masterId: 9, level: 3, star: 2 },
      { id: 102, masterId: 10, level: 3, star: 2 }
    ]
  },
  {
    id: 2,
    name: "Local Patrol Fleet",
    level: 8,
    rank: "中佐",
    comment: "Steady sparring partner",
    flag: 1,
    medals: 0,
    ships: [
      { id: 201, masterId: 1, level: 5, star: 3 },
      { id: 202, masterId: 2, level: 5, star: 3 }
    ]
  },
  {
    id: 3,
    name: "Local Cruiser Fleet",
    level: 12,
    rank: "大佐",
    comment: "Light cruiser exercises",
    flag: 1,
    medals: 1,
    ships: [
      { id: 301, masterId: 54, level: 8, star: 4 },
      { id: 302, masterId: 9, level: 6, star: 3 }
    ]
  },
  {
    id: 4,
    name: "Local Carrier Fleet",
    level: 15,
    rank: "少将",
    comment: "Air wing drill",
    flag: 1,
    medals: 1,
    ships: [
      { id: 401, masterId: 277, level: 10, star: 5 },
      { id: 402, masterId: 10, level: 8, star: 4 }
    ]
  },
  {
    id: 5,
    name: "Local Battleship Fleet",
    level: 20,
    rank: "中将",
    comment: "Heavy fleet exercise",
    flag: 1,
    medals: 2,
    ships: [
      { id: 501, masterId: 77, level: 12, star: 5 },
      { id: 502, masterId: 54, level: 10, star: 4 }
    ]
  }
];

export function practiceRivals() {
  return PRACTICE_RIVALS.map((rival) => ({ ...rival, ships: rival.ships.map((ship) => ({ ...ship })) }));
}

export function practiceRivalById(id: number) {
  return practiceRivals().find((rival) => rival.id === id) ?? practiceRivals()[0];
}

export function resolveDamage(input: DamageInput) {
  const targetHp = Math.max(0, Math.trunc(input.targetHp ?? Number.MAX_SAFE_INTEGER));
  const defense = input.armor * 0.7 + input.armorRoll * 0.6;
  const normalDamage = Math.floor((input.attackPower - defense) * input.ammoModifier);
  if (normalDamage > 0 && input.ammoModifier > 0) return Math.min(targetHp, normalDamage);
  if (targetHp <= 1) return 0;
  const scratch = Math.floor(targetHp * 0.06);
  return Math.max(1, Math.min(targetHp - 1, scratch));
}

export function createSortieBattle(save: SaveState, input: BattleInput = {}) {
  const deck = sortieDeck(save);
  const formation: [number, number, number] = [battleFormation(input), 1, 1];
  const seed = (save.sortieSession?.seed ?? 1) + safeNum(save.sortieSession?.state.battles, 0) * 9973 + formation[0] * 101;
  const rng = mulberry32(seed);
  const friendly = friendlyUnits(save, deck.shipIds);
  const enemy = enemyUnits(save.sortieSession?.node ?? 1);
  const beforeF = fixedHp(friendly);
  const beforeE = fixedHp(enemy);

  const hougeki1 = shellingPhase(friendly, enemy, formation[0], rng, "day");
  const raigeki = torpedoPhase(friendly, enemy, formation[0], rng);

  const afterF = fixedHp(friendly);
  const afterE = fixedHp(enemy);
  const result = battleResult(friendly, enemy);
  const record: BattleRecord = {
    mode: "sortie",
    deckId: deck.id,
    shipIds: fixedShipIds(deck.shipIds),
    shipMasterIds: fixedShipMasterIds(save, deck.shipIds),
    enemyIds: fixedEnemyIds(enemy),
    formation,
    before: { fNowHps: beforeF, eNowHps: beforeE },
    after: { fNowHps: afterF, eNowHps: afterE },
    phases: {
      hougeki1,
      hougeki2: null,
      hougeki3: null,
      raigeki
    },
    result
  };

  return {
    payload: battlePayload(record, friendly, enemy),
    record
  };
}

export function createPracticeBattle(save: SaveState, input: BattleInput = {}) {
  const deck = save.decks.find((item) => item.id === (input.deckId ?? 1)) ?? save.decks[0];
  const rival = practiceRivalById(input.practiceEnemyId ?? 1);
  const formation: [number, number, number] = [battleFormation(input), 1, 1];
  const seed = rival.id * 13007 + formation[0] * 101;
  const rng = mulberry32(seed);
  const friendly = friendlyUnits(save, deck.shipIds);
  const enemy = rival.ships.map((ship, index) => practiceEnemyUnit(ship.masterId, ship.level, index + 1));
  const beforeF = fixedHp(friendly);
  const beforeE = fixedHp(enemy);

  const hougeki1 = shellingPhase(friendly, enemy, formation[0], rng, "day");
  const raigeki = torpedoPhase(friendly, enemy, formation[0], rng);
  const afterF = fixedHp(friendly);
  const afterE = fixedHp(enemy);
  const result = battleResult(friendly, enemy, "practice");
  const record: BattleRecord = {
    mode: "practice",
    deckId: deck.id,
    practiceEnemyId: rival.id,
    shipIds: fixedShipIds(deck.shipIds),
    shipMasterIds: fixedShipMasterIds(save, deck.shipIds),
    enemyIds: fixedEnemyIds(enemy),
    formation,
    before: { fNowHps: beforeF, eNowHps: beforeE },
    after: { fNowHps: afterF, eNowHps: afterE },
    phases: {
      hougeki1,
      hougeki2: null,
      hougeki3: null,
      raigeki
    },
    result
  };

  return {
    payload: battlePayload(record, friendly, enemy),
    record
  };
}

export function createCombinedBattle(save: SaveState, input: BattleInput = {}) {
  const deck = save.decks.find((item) => item.id === 1) ?? save.decks[0];
  const escortDeck = save.decks.find((item) => item.id === 2) ?? save.decks[1] ?? deck;
  const formation: [number, number, number] = [battleFormation(input), 1, 1];
  const seed = (save.sortieSession?.seed ?? 1) + 424242 + formation[0] * 101;
  const rng = mulberry32(seed);
  const friendly = friendlyUnits(save, deck.shipIds);
  const escort = friendlyUnits(save, escortDeck.shipIds);
  const enemy = enemyUnits(save.sortieSession?.node ?? 1);
  const enemyCombined: BattleUnit[] = [];
  const beforeF = fixedHp(friendly);
  const beforeEscort = fixedHp(escort);
  const beforeE = fixedHp(enemy);
  const beforeECombined = fixedHp(enemyCombined);

  const hougeki1 = shellingPhase(friendly, enemy, formation[0], rng, "day");
  const raigeki = torpedoPhase(friendly, enemy, formation[0], rng);
  const afterF = fixedHp(friendly);
  const afterEscort = fixedHp(escort);
  const afterE = fixedHp(enemy);
  const afterECombined = fixedHp(enemyCombined);
  const result = battleResult(friendly, enemy, "combined");
  result.mvpCombined = escortMvp(escort);
  const record: BattleRecord = {
    mode: "combined",
    deckId: deck.id,
    escortDeckId: escortDeck.id,
    shipIds: fixedShipIds(deck.shipIds),
    shipMasterIds: fixedShipMasterIds(save, deck.shipIds),
    escortShipIds: fixedShipIds(escortDeck.shipIds),
    escortShipMasterIds: fixedShipMasterIds(save, escortDeck.shipIds),
    enemyIds: fixedEnemyIds(enemy),
    formation,
    before: { fNowHps: beforeF, eNowHps: beforeE, fCombinedNowHps: beforeEscort, eCombinedNowHps: beforeECombined },
    after: { fNowHps: afterF, eNowHps: afterE, fCombinedNowHps: afterEscort, eCombinedNowHps: afterECombined },
    phases: {
      hougeki1,
      hougeki2: null,
      hougeki3: null,
      raigeki
    },
    result
  };

  return {
    payload: combinedBattlePayload(record, friendly, escort, enemy, enemyCombined),
    record
  };
}

export function createNightBattle(record: BattleRecord): { payload: Record<string, unknown>; record: BattleRecord } {
  const friendly = recordUnitsFrom(record, 0);
  const enemy = recordUnitsFrom(record, 1);
  const rng = mulberry32(record.deckId * 8191 + record.before.fNowHps.reduce((sum, hp) => sum + hp, 0));
  const hougeki = shellingPhase(friendly, enemy, record.formation[0], rng, "night");
  const nextRecord: BattleRecord = {
    ...record,
    after: {
      ...record.after,
      fNowHps: fixedHp(friendly),
      eNowHps: fixedHp(enemy)
    },
    phases: {
      ...record.phases,
      night: hougeki
    },
    result: { ...battleResult(friendly, enemy, record.mode), mvpCombined: record.result.mvpCombined }
  };
  const payload: Record<string, unknown> = {
    api_deck_id: record.deckId,
    api_formation: record.formation,
    api_touch_plane: [-1, -1],
    api_flare_pos: [-1, -1],
    api_hougeki: hougeki,
    api_n_support_flag: 0,
    api_n_support_info: null
  };
  if (nextRecord.mode === "combined") {
    Object.assign(payload, combinedNightFields(nextRecord));
  }
  return {
    payload,
    record: nextRecord
  };
}

export function createNightBattlePayload(record: BattleRecord) {
  return createNightBattle(record).payload;
}

export function battleResultPayload(record: BattleRecord) {
  const mainSettlement = settlementFleet(record.settlement?.main, record.shipIds);
  const escortSettlement = settlementFleet(record.settlement?.escort, record.escortShipIds ?? []);
  const dropShip = record.mode === "practice" || record.result.dropShipId <= 0 ? null : {
    api_ship_id: record.result.dropShipId,
    api_ship_type: record.result.dropShipType,
    api_ship_name: record.result.dropShipName,
    api_ship_getmes: "Local drop"
  };
  const payload: Record<string, unknown> = {
    api_ship_id: record.shipIds.filter((id) => id > 0),
    api_win_rank: record.result.rank,
    api_get_exp: record.result.getExp,
    api_mvp: record.settlement?.mvp ?? record.result.mvp,
    api_member_lv: record.settlement?.memberLevel ?? 1,
    api_member_exp: record.settlement?.memberExp ?? record.result.memberExp,
    api_get_base_exp: record.result.baseExp,
    api_get_ship_exp: [-1, ...mainSettlement.map((slot) => slot.gainedExp)],
    api_get_exp_lvup: mainSettlement.map((slot) => slot.levelup),
    api_get_ship: dropShip,
    api_get_eventflag: 0,
    api_get_exmap_rate: 0
  };
  if (record.mode === "combined") {
    payload.api_mvp_combined = record.settlement?.mvpCombined ?? record.result.mvpCombined ?? 1;
    payload.api_get_ship_exp_combined = [-1, ...escortSettlement.map((slot) => slot.gainedExp)];
    payload.api_get_exp_lvup_combined = escortSettlement.map((slot) => slot.levelup);
  }
  return payload;
}

function settlementFleet(settlement: FleetSettlementSlot[] | undefined, shipIds: number[]) {
  if (settlement) return normalizeSettlement(settlement);
  return normalizeFixed(shipIds, 6, -1).map((shipId) => ({
    shipId,
    gainedExp: shipId > 0 ? 0 : -1,
    beforeExp: 0,
    afterExp: 0,
    afterLevel: 1,
    levelup: shipId > 0 ? [0, 100] : [-1]
  }));
}

function normalizeSettlement(settlement: FleetSettlementSlot[]) {
  return normalizeFixed(settlement, 6, {
    shipId: -1,
    gainedExp: -1,
    beforeExp: -1,
    afterExp: -1,
    afterLevel: 0,
    levelup: [-1]
  });
}

function battlePayload(record: BattleRecord, friendly: BattleUnit[], enemy: BattleUnit[]): BattlePayload {
  const fMaxHps = fixedMaxHp(friendly);
  const eMaxHps = fixedMaxHp(enemy);
  return {
    api_deck_id: record.deckId,
    api_dock_id: record.deckId,
    api_formation: record.formation,
    api_ship_ke: record.enemyIds,
    api_ship_lv: fixedUnitValues(enemy, (unit) => unit.level, 0),
    api_f_nowhps: record.before.fNowHps,
    api_f_maxhps: fMaxHps,
    api_e_nowhps: record.before.eNowHps,
    api_e_maxhps: eMaxHps,
    api_nowhps: [-1, ...record.before.fNowHps, ...record.before.eNowHps],
    api_maxhps: [-1, ...fMaxHps, ...eMaxHps],
    api_midnight_flag: record.after.eNowHps.some((hp) => hp > 0) ? 1 : 0,
    api_eSlot: fixedUnitValues(enemy, (unit) => fixedSlotIds(unit.slots), []),
    api_fParam: fixedUnitValues(friendly, (unit) => [unit.firepower, unit.torpedo, unit.aa, unit.armor], [0, 0, 0, 0]),
    api_eParam: fixedUnitValues(enemy, (unit) => [unit.firepower, unit.torpedo, unit.aa, unit.armor], [0, 0, 0, 0]),
    api_search: [1, 1],
    api_stage_flag: [0, 0, 0],
    api_kouku: null,
    api_support_flag: 0,
    api_support_info: null,
    api_hougeki1: record.phases.hougeki1,
    api_hougeki2: record.phases.hougeki2,
    api_hougeki3: record.phases.hougeki3,
    api_raigeki: record.phases.raigeki
  };
}

function combinedBattlePayload(record: BattleRecord, friendly: BattleUnit[], escort: BattleUnit[], enemy: BattleUnit[], enemyCombined: BattleUnit[]) {
  const payload = battlePayload(record, friendly, enemy);
  const fCombinedMaxHps = fixedMaxHp(escort);
  const eCombinedMaxHps = fixedMaxHp(enemyCombined);
  return {
    ...payload,
    api_f_nowhps_combined: record.before.fCombinedNowHps ?? fixedHp(escort),
    api_f_maxhps_combined: fCombinedMaxHps,
    api_e_nowhps_combined: record.before.eCombinedNowHps ?? fixedHp(enemyCombined),
    api_e_maxhps_combined: eCombinedMaxHps,
    api_ship_ke_combined: fixedEnemyIds(enemyCombined),
    api_ship_lv_combined: fixedUnitValues(enemyCombined, (unit) => unit.level, 0),
    api_fParam_combined: fixedUnitValues(escort, (unit) => [unit.firepower, unit.torpedo, unit.aa, unit.armor], [0, 0, 0, 0]),
    api_eParam_combined: fixedUnitValues(enemyCombined, (unit) => [unit.firepower, unit.torpedo, unit.aa, unit.armor], [0, 0, 0, 0]),
    api_eSlot_combined: fixedUnitValues(enemyCombined, (unit) => fixedSlotIds(unit.slots), []),
    api_nowhps_combined: [-1, ...(record.before.fCombinedNowHps ?? fixedHp(escort)), ...(record.before.eCombinedNowHps ?? fixedHp(enemyCombined))],
    api_maxhps_combined: [-1, ...fCombinedMaxHps, ...eCombinedMaxHps]
  };
}

function combinedNightFields(record: BattleRecord) {
  const fNowHps = normalizeFixed(record.after.fCombinedNowHps ?? record.before.fCombinedNowHps ?? [], 6, 0);
  const eNowHps = normalizeFixed(record.after.eCombinedNowHps ?? record.before.eCombinedNowHps ?? [], 6, 0);
  const fMaxHps = fixedMaxHpFromMasters(record.escortShipMasterIds ?? [], fNowHps);
  const eMaxHps = normalizeFixed([], 6, 0);
  return {
    api_f_nowhps_combined: fNowHps,
    api_f_maxhps_combined: fMaxHps,
    api_e_nowhps_combined: eNowHps,
    api_e_maxhps_combined: eMaxHps,
    api_nowhps_combined: [-1, ...fNowHps, ...eNowHps],
    api_maxhps_combined: [-1, ...fMaxHps, ...eMaxHps],
    api_ship_ke_combined: normalizeFixed([], 6, -1),
    api_ship_lv_combined: normalizeFixed([], 6, 0),
    api_fParam_combined: fixedParamsFromMasters(record.escortShipMasterIds ?? []),
    api_eParam_combined: Array.from({ length: 6 }, () => [0, 0, 0, 0]),
    api_eSlot_combined: Array.from({ length: 6 }, () => [])
  };
}

function fixedMaxHpFromMasters(masterIds: number[], fallbackHps: number[]) {
  return normalizeFixed(masterIds, 6, -1).map((id, index) => {
    if (id <= 0) return fallbackHps[index] ?? 0;
    const master = masterData.api_mst_ship.find((item) => item.api_id === id);
    return Math.max(fallbackHps[index] ?? 0, statValue(master?.api_taik, fallbackHps[index] ?? 1));
  });
}

function fixedParamsFromMasters(masterIds: number[]) {
  return normalizeFixed(masterIds, 6, -1).map((id) => {
    const master = id > 0 ? masterData.api_mst_ship.find((item) => item.api_id === id) : undefined;
    return [
      statValue(master?.api_houg),
      statValue(master?.api_raig),
      statValue(master?.api_tyku),
      statValue(master?.api_souk)
    ];
  });
}

function shellingPhase(friendly: BattleUnit[], enemy: BattleUnit[], formation: number, rng: () => number, phase: "day" | "night"): HougekiPayload {
  const payload = emptyHougeki(phase === "night");
  const friendlyOrder = attackOrder(friendly);
  const enemyOrder = attackOrder(enemy);
  const turns = Math.max(friendlyOrder.length, enemyOrder.length);
  for (let turn = 0; turn < turns; turn += 1) {
    if (friendlyOrder[turn]) appendShellingAttack(payload, friendlyOrder[turn], enemy, formation, rng, phase);
    if (enemyOrder[turn]) appendShellingAttack(payload, enemyOrder[turn], friendly, 1, rng, phase);
  }
  return payload;
}

function appendShellingAttack(
  payload: HougekiPayload,
  attacker: BattleUnit,
  targets: BattleUnit[],
  formation: number,
  rng: () => number,
  phase: "day" | "night"
) {
  if (attacker.hp <= 0) return;
  const target = firstAlive(targets);
  if (!target) return;

  const base = phase === "night" ? attacker.firepower + attacker.torpedo : attacker.firepower + 5;
  if (base <= 0) return;
  const preCap = base * formationModifier(formation, phase === "night" ? "night" : "shelling") * damageStateModifier(attacker);
  const capped = capAttack(preCap, phase === "night" ? 360 : 220);
  const damage = applyDamage(target, capped, attacker.ammoModifier, rng, attacker.side === 0 ? 1 : 0);
  attacker.damageDealt += damage;

  payload.api_at_eflag.push(attacker.side);
  payload.api_at_list.push(attacker.position - 1);
  payload.api_at_type.push(0);
  payload.api_df_list.push([target.position - 1]);
  payload.api_si_list.push([primarySlotId(attacker)]);
  payload.api_cl_list.push([damage > 0 ? 1 : 0]);
  payload.api_damage.push([damage]);
  if (payload.api_sp_list) payload.api_sp_list.push(0);
  if (payload.api_n_mother_list) payload.api_n_mother_list.push(0);
}

function torpedoPhase(friendly: BattleUnit[], enemy: BattleUnit[], formation: number, rng: () => number): RaigekiPayload | null {
  const payload: RaigekiPayload = {
    api_frai: Array(6).fill(-1),
    api_erai: Array(6).fill(-1),
    api_fdam: Array(6).fill(0),
    api_edam: Array(6).fill(0),
    api_fydam: Array(6).fill(0),
    api_eydam: Array(6).fill(0),
    api_fcl: Array(6).fill(0),
    api_ecl: Array(6).fill(0),
    api_frai_flag: Array(6).fill(0),
    api_erai_flag: Array(6).fill(0),
    api_fbak_flag: Array(6).fill(0),
    api_ebak_flag: Array(6).fill(0)
  };
  let fired = false;
  for (const attacker of friendly) {
    if (attacker.hp <= 0 || attacker.torpedo <= 0 || damageState(attacker) >= 3) continue;
    const target = firstAlive(enemy);
    if (!target) continue;
    const attackerIdx = attacker.position - 1;
    const targetIdx = target.position - 1;
    const power = capAttack((attacker.torpedo + 5) * formationModifier(formation, "torpedo") * damageStateModifier(attacker), 180);
    const damage = applyDamage(target, power, attacker.ammoModifier, rng, 1);
    attacker.damageDealt += damage;
    payload.api_frai[attackerIdx] = targetIdx;
    payload.api_frai_flag[attackerIdx] = 1;
    payload.api_fydam[attackerIdx] = damage;
    payload.api_edam[targetIdx] += damage;
    payload.api_ecl[targetIdx] = damage > 0 ? 1 : 0;
    fired = true;
  }
  for (const attacker of enemy) {
    if (attacker.hp <= 0 || attacker.torpedo <= 0 || damageState(attacker) >= 3) continue;
    const target = firstAlive(friendly);
    if (!target) continue;
    const attackerIdx = attacker.position - 1;
    const targetIdx = target.position - 1;
    const power = capAttack((attacker.torpedo + 5) * damageStateModifier(attacker), 180);
    const damage = applyDamage(target, power, attacker.ammoModifier, rng, 0);
    attacker.damageDealt += damage;
    payload.api_erai[attackerIdx] = targetIdx;
    payload.api_erai_flag[attackerIdx] = 1;
    payload.api_eydam[attackerIdx] = damage;
    payload.api_fdam[targetIdx] += damage;
    payload.api_fcl[targetIdx] = damage > 0 ? 1 : 0;
    fired = true;
  }
  return fired ? payload : null;
}

function applyDamage(target: BattleUnit, attackPower: number, ammoModifier: number, rng: () => number, targetSide: Side) {
  const armorRoll = Math.floor(rng() * Math.max(1, Math.floor(target.armor)));
  const damage = resolveDamage({ attackPower, armor: target.armor, armorRoll, ammoModifier, targetHp: target.hp });
  const minHp = targetSide === 0 ? 1 : 0;
  target.hp = Math.max(minHp, target.hp - damage);
  return damage;
}

function battleResult(friendly: BattleUnit[], enemy: BattleUnit[], mode: BattleMode = "sortie"): BattleResultRecord {
  const enemyTotalHp = enemy.reduce((sum, unit) => sum + unit.maxHp, 0);
  const enemyRemainingHp = enemy.reduce((sum, unit) => sum + Math.max(0, unit.hp), 0);
  const sunk = enemy.filter((unit) => unit.hp <= 0).length;
  const damageRatio = enemyTotalHp > 0 ? (enemyTotalHp - enemyRemainingHp) / enemyTotalHp : 1;
  const rank = sunk === enemy.length ? "S" : damageRatio >= 0.7 ? "A" : damageRatio >= 0.4 ? "B" : "C";
  const mvp = [...friendly].sort((a, b) => b.damageDealt - a.damageDealt || a.position - b.position)[0]?.position ?? 1;
  const baseExp = rank === "S" ? 40 : rank === "A" ? 35 : rank === "B" ? 30 : 20;
  return {
    rank,
    mvp,
    baseExp,
    getExp: baseExp * 2,
    memberExp: baseExp * 2,
    dropShipId: mode === "practice" ? 0 : 1,
    dropShipName: mode === "practice" ? "" : "Mutsuki",
    dropShipType: mode === "practice" ? "" : "Destroyer"
  };
}

function friendlyUnits(save: SaveState, shipIds: number[]) {
  return fixedShipIds(shipIds)
    .map((shipId, index) => {
      const ship = shipId > 0 ? save.ships.find((item) => item.id === shipId) : undefined;
      return ship ? friendlyUnit(ship, save.slotItems, index + 1) : null;
    })
    .filter((unit): unit is BattleUnit => Boolean(unit));
}

function friendlyUnit(ship: Ship, slotItems: SlotItem[], position: number): BattleUnit {
  const master = masterData.api_mst_ship.find((item) => item.api_id === ship.masterId);
  const slotMasters = ship.slotIds
    .filter((id) => id > 0)
    .map((id) => slotItems.find((item) => item.id === id))
    .filter((item): item is SlotItem => Boolean(item))
    .map((item) => masterData.api_mst_slotitem.find((slot) => slot.api_id === item.masterId))
    .filter((item): item is (typeof masterData.api_mst_slotitem)[number] => Boolean(item));
  const equipSum = (field: keyof (typeof masterData.api_mst_slotitem)[number]) =>
    slotMasters.reduce((sum, item) => sum + safeNum(item[field]), 0);
  const slots = slotMasters.map((item) => item.api_id);
  return {
    side: 0,
    position,
    apiIndex: position,
    shipId: ship.id,
    masterId: ship.masterId,
    level: ship.level,
    hp: ship.hp,
    maxHp: ship.maxHp,
    firepower: statValue(master?.api_houg) + equipSum("api_houg"),
    torpedo: statValue(master?.api_raig) + equipSum("api_raig"),
    aa: statValue(master?.api_tyku) + equipSum("api_tyku"),
    armor: statValue(master?.api_souk) + equipSum("api_souk"),
    luck: statValue(master?.api_luck) + equipSum("api_luck"),
    range: Math.max(safeNum(master?.api_leng, 1), ...slotMasters.map((item) => safeNum(item.api_leng, 0))),
    ammoModifier: ammoModifier(ship.ammo, ship.maxAmmo),
    slots: slots.length ? slots : [1],
    damageDealt: 0
  };
}

function enemyUnits(node: number) {
  const ids = node > 1 ? [1501, 1502] : [1501, 1502];
  return ids.map((id, index) => enemyUnit(id, index + 1));
}

function enemyUnit(masterId: number, position: number): BattleUnit {
  const hp = masterId === 1502 ? 20 : 20;
  return {
    side: 1,
    position,
    apiIndex: position + 6,
    shipId: 0,
    masterId,
    level: 1,
    hp,
    maxHp: hp,
    firepower: masterId === 1502 ? 6 : 5,
    torpedo: 0,
    aa: 0,
    armor: masterId === 1502 ? 6 : 5,
    luck: 0,
    range: 1,
    ammoModifier: 1,
    slots: [1],
    damageDealt: 0
  };
}

function practiceEnemyUnit(masterId: number, level: number, position: number): BattleUnit {
  const master = masterData.api_mst_ship.find((item) => item.api_id === masterId);
  const maxHp = statValue(master?.api_taik, 15);
  return {
    side: 1,
    position,
    apiIndex: position + 6,
    shipId: 0,
    masterId,
    level,
    hp: maxHp,
    maxHp,
    firepower: statValue(master?.api_houg, level),
    torpedo: statValue(master?.api_raig, 0),
    aa: statValue(master?.api_tyku, 0),
    armor: statValue(master?.api_souk, 1),
    luck: statValue(master?.api_luck, 0),
    range: safeNum(master?.api_leng, 1),
    ammoModifier: 1,
    slots: [1],
    damageDealt: 0
  };
}

function escortMvp(escort: BattleUnit[]) {
  return escort.length > 0 ? [...escort].sort((a, b) => b.damageDealt - a.damageDealt || a.position - b.position)[0].position : 1;
}

function recordUnitsFrom(record: BattleRecord, side: Side) {
  const hps = side === 0 ? record.after.fNowHps : record.after.eNowHps;
  const ids = side === 0 ? record.shipIds : record.enemyIds;
  return ids
    .map((id, index) => {
      if (id <= 0) return null;
      if (side === 1) {
        const unit = enemyUnit(id, index + 1);
        unit.hp = hps[index] ?? unit.maxHp;
        return unit;
      }
      const masterId = record.shipMasterIds?.[index] ?? id;
      const master = masterData.api_mst_ship.find((item) => item.api_id === masterId);
      const hp = hps[index] ?? statValue(master?.api_taik, 1);
      return {
        side,
        position: index + 1,
        apiIndex: index + 1,
        shipId: record.shipIds[index],
        masterId,
        level: 1,
        hp,
        maxHp: record.before.fNowHps[index] || hp,
        firepower: statValue(master?.api_houg),
        torpedo: statValue(master?.api_raig),
        aa: statValue(master?.api_tyku),
        armor: statValue(master?.api_souk),
        luck: statValue(master?.api_luck),
        range: safeNum(master?.api_leng, 1),
        ammoModifier: 1,
        slots: [1],
        damageDealt: 0
      } satisfies BattleUnit;
    })
    .filter((unit): unit is BattleUnit => Boolean(unit));
}

function emptyHougeki(night: boolean): HougekiPayload {
  return {
    api_at_eflag: [],
    api_at_list: [],
    api_at_type: [],
    api_df_list: [],
    api_si_list: [],
    api_cl_list: [],
    api_damage: [],
    ...(night ? { api_sp_list: [], api_n_mother_list: [] } : {})
  };
}

function attackOrder(units: BattleUnit[]) {
  return units.filter((unit) => unit.hp > 0).sort((a, b) => b.range - a.range || a.position - b.position);
}

function firstAlive(units: BattleUnit[]) {
  return units.find((unit) => unit.hp > 0);
}

function capAttack(value: number, cap: number) {
  return value > cap ? cap + Math.sqrt(value - cap) : value;
}

function formationModifier(formation: number, phase: "shelling" | "torpedo" | "night") {
  if (phase === "night") return 1;
  const shelling: Record<number, number> = { 1: 1, 2: 0.8, 3: 0.7, 4: 0.6, 5: 0.6 };
  const torpedo: Record<number, number> = { 1: 1, 2: 0.8, 3: 0.7, 4: 0.6, 5: 0.6 };
  return (phase === "shelling" ? shelling : torpedo)[formation] ?? 1;
}

function damageState(unit: BattleUnit) {
  if (unit.hp <= 0) return 4;
  if (unit.hp <= unit.maxHp * 0.25) return 3;
  if (unit.hp <= unit.maxHp * 0.5) return 2;
  if (unit.hp <= unit.maxHp * 0.75) return 1;
  return 0;
}

function damageStateModifier(unit: BattleUnit) {
  const state = damageState(unit);
  if (state >= 3) return 0.4;
  if (state === 2) return 0.7;
  return 1;
}

function ammoModifier(ammo: number, maxAmmo: number) {
  if (maxAmmo <= 0) return 1;
  return Math.min(1, Math.floor((Math.max(0, ammo) / maxAmmo) * 100) / 50);
}

function battleFormation(input: BattleInput) {
  return Math.max(1, Math.min(5, Math.trunc(safeNum(input.formation, 1))));
}

function sortieDeck(save: SaveState) {
  return save.decks.find((deck) => deck.id === save.sortieSession?.deckId) || save.decks[0];
}

function fixedShipIds(shipIds: number[]) {
  return [...shipIds, ...Array(6).fill(-1)].slice(0, 6).map((id) => (id > 0 ? id : -1));
}

function normalizeFixed<T>(values: T[], length: number, fill: T): T[] {
  return [...values, ...Array(length).fill(fill)].slice(0, length);
}

function fixedShipMasterIds(save: SaveState, shipIds: number[]) {
  return fixedShipIds(shipIds).map((id) => save.ships.find((ship) => ship.id === id)?.masterId ?? -1);
}

function fixedEnemyIds(enemy: BattleUnit[]) {
  return [...enemy.map((unit) => unit.masterId), ...Array(6).fill(-1)].slice(0, 6);
}

function fixedHp(units: BattleUnit[]) {
  return fixedUnitValues(units, (unit) => Math.max(0, Math.trunc(unit.hp)), 0);
}

function fixedMaxHp(units: BattleUnit[]) {
  return fixedUnitValues(units, (unit) => unit.maxHp, 0);
}

function fixedSlotIds(slotIds: number[]) {
  const activeSlots = slotIds.filter((id) => id > 0);
  return [...activeSlots, ...Array(5).fill(-1)].slice(0, 5);
}

function primarySlotId(unit: BattleUnit) {
  return unit.slots.find((id) => id > 0) ?? 1;
}

function fixedUnitValues<T>(units: BattleUnit[], pick: (unit: BattleUnit) => T, fill: T): T[] {
  const byPosition = new Map(units.map((unit) => [unit.position, pick(unit)] as const));
  return Array.from({ length: 6 }, (_value, index) => byPosition.get(index + 1) ?? fill);
}

function statValue(value: unknown, fallback = 0) {
  if (Array.isArray(value)) return safeNum(value[0], fallback);
  return safeNum(value, fallback);
}

function safeNum(value: unknown, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function mulberry32(seed: number) {
  let value = seed >>> 0;
  return () => {
    value += 0x6d2b79f5;
    let t = value;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
