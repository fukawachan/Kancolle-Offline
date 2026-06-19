import { masterData } from "../master/data.js";
import {
  DEEP_SEA_SLOT_MASTERS,
  ENEMY_UNIT_TEMPLATES,
  fallbackEnemyShipIds,
  selectSortieDrop,
  selectSortieEncounter,
  type SelectedSortieEncounter
} from "../master/sortie-data.js";
import type { SaveState, Ship, SlotItem } from "../state/types.js";
import { isAircraftSlotItem } from "./serializers.js";
import {
  BattleRng,
  airState as resolveAirState,
  fighterPower,
  resolveBattleDamage
} from "./battle-formulas.js";
import {
  generatePracticeBatch,
  practiceBaseShipExp,
  practiceMemberExp,
  practiceRivalById,
  practiceSeededBonus,
  type PracticeRival
} from "./practice.js";

export type BattleInput = {
  formation?: number;
  deckId?: number;
  practiceEnemyId?: number;
  practiceRivals?: PracticeRival[];
};

export type BattleMode = "sortie" | "practice" | "combined";

type Side = 0 | 1;

type BattleSortieContext = SelectedSortieEncounter & {
  seed: number;
};

type PracticeResultContext = {
  playerLevel: number;
  enemyLevel: number;
  enemyShipLevels: number[];
  seed: number;
};

type AirSlot = {
  shipPosition: number;
  slotIndex: number;
  slotItemId: number;
  slotMasterId: number;
  equipTypeId: number;
  slotMaster: (typeof masterData.api_mst_slotitem)[number];
  count: number;
  maxCount: number;
  improvement: number;
  proficiency: number;
};

type EquippedSlot = {
  index: number;
  slotItemId: number;
  slotMaster: (typeof masterData.api_mst_slotitem)[number];
  count: number;
  maxCount: number;
  improvement: number;
  proficiency: number;
};

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
  shipType: number;
  slots: number[];
  equippedSlots: EquippedSlot[];
  airSlots: AirSlot[];
  onSlot: number[];
  originalOnSlot: number[];
  damageDealt: number;
};

type BattleUnitSlotSnapshot = {
  index: number;
  slotItemId: number;
  slotMasterId: number;
  count: number;
  maxCount: number;
  improvement: number;
  proficiency: number;
};

type BattleUnitSnapshot = {
  side: Side;
  position: number;
  shipId: number;
  masterId: number;
  level: number;
  maxHp: number;
  firepower: number;
  torpedo: number;
  aa: number;
  armor: number;
  luck: number;
  range: number;
  ammoModifier: number;
  shipType: number;
  slots: number[];
  equippedSlots: BattleUnitSlotSnapshot[];
  onSlot: number[];
  originalOnSlot: number[];
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

export type KoukuStage3Payload = {
  api_frai_flag: number[];
  api_erai_flag: number[];
  api_fbak_flag: number[];
  api_ebak_flag: number[];
  api_fcl_flag: number[];
  api_ecl_flag: number[];
  api_fdam: number[];
  api_edam: number[];
};

export type KoukuPayload = {
  api_plane_from: number[][];
  api_stage1: {
    api_f_count: number;
    api_f_lostcount: number;
    api_e_count: number;
    api_e_lostcount: number;
    api_disp_seiku: number;
    api_touch_plane: number[];
  };
  api_stage2: {
    api_f_count: number;
    api_f_lostcount: number;
    api_e_count: number;
    api_e_lostcount: number;
  } | null;
  api_stage3: KoukuStage3Payload | null;
  api_stage3_combined?: KoukuStage3Payload | null;
  api_air_fire?: {
    api_idx: number;
    api_kind: number;
    api_use_items: number[];
  };
};

export type BattlePayload = Record<string, any> & {
  api_deck_id: number;
  api_dock_id: number;
  api_formation: [number, number, number];
  api_ship_ke: number[];
  api_stage_flag: [number, number, number];
  api_kouku: KoukuPayload | null;
  api_hougeki1: HougekiPayload;
  api_raigeki: RaigekiPayload | null;
};

export type BattleRecord = {
  mode: BattleMode;
  deckId: number;
  escortDeckId?: number;
  practiceEnemyId?: number;
  practiceEnemyLevel?: number;
  practiceSeed?: number;
  playerLevel?: number;
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
    fOnSlotByShipId?: Record<number, number[]>;
    fCombinedOnSlotByShipId?: Record<number, number[]>;
  };
  phases: {
    kouku: KoukuPayload | null;
    hougeki1: HougekiPayload;
    hougeki2: HougekiPayload | null;
    hougeki3: HougekiPayload | null;
    raigeki: RaigekiPayload | null;
    night?: HougekiPayload;
  };
  units?: {
    friendly: BattleUnitSnapshot[];
    enemy: BattleUnitSnapshot[];
    escort?: BattleUnitSnapshot[];
    enemyCombined?: BattleUnitSnapshot[];
  };
  sortie?: BattleSortieContext;
  result: BattleResultRecord;
  aircraftLosses?: {
    friendly: Record<number, number>;
    enemy: Record<number, number>;
  };
  support?: {
    deckId: number;
    missionId: number;
    arrived: boolean;
    flag: number;
    info: Record<string, unknown> | null;
  };
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

type DamageInput = {
  attackPower: number;
  armor: number;
  armorRoll: number;
  ammoModifier: number;
  targetHp?: number;
};

type ShellingAttackProfile = {
  preCapPower: number;
  cap: number;
  atType: number;
  spType: number;
  hits: number;
  postCapModifier: number;
  slotIds: number[];
};

const FIGHTER_COMBAT_TYPES = new Set([6, 7, 8, 11, 45, 56, 57]);
const OPENING_AIRSTRIKE_TYPES = new Set([7, 8, 11, 57]);
const TORPEDO_BOMBER_TYPES = new Set([8]);
const CONTACT_TYPES = new Set([8, 9, 10]);
const CARRIER_TYPES = new Set([7, 11, 18]);
const MAIN_GUN_TYPES = new Set([1, 2, 3]);
const SECONDARY_GUN_TYPES = new Set([4]);
const TORPEDO_TYPES = new Set([5, 32]);
const SEAPLANE_TYPES = new Set([10, 11]);
const AP_SHELL_TYPE = 19;
const HIGH_ANGLE_GUN_TYPES = new Set([16]);
const AA_GUN_TYPES = new Set([21]);
const RADAR_TYPES = new Set([12, 13]);
const SLOT_MASTER_BY_ID = new Map<number, (typeof masterData.api_mst_slotitem)[number]>(
  [...masterData.api_mst_slotitem, ...DEEP_SEA_SLOT_MASTERS].map((slot) => [slot.api_id, slot] as const)
);

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
  const friendlyFormation = battleFormation(input);
  const seed = (save.sortieSession?.seed ?? 1) + safeNum(save.sortieSession?.state.battles, 0) * 9973 + friendlyFormation * 101;
  const rng = new BattleRng(seed);
  const friendly = friendlyUnits(save, deck.shipIds);
  const sortie = sortieBattleContext(save, seed);
  const formation: [number, number, number] = [friendlyFormation, sortie?.formation ?? 1, 1];
  const enemy = enemyUnits(sortie?.shipIds ?? fallbackEnemyShipIds(save.sortieSession?.node ?? 1));
  const beforeF = fixedHp(friendly);
  const beforeE = fixedHp(enemy);

  const support = supportPhase(save, sortie, enemy);
  const kouku = airPhase(friendly, enemy, formation[0], rng);
  const hougeki1 = shellingPhase(friendly, enemy, formation[0], rng, "day");
  const raigeki = torpedoPhase(friendly, enemy, formation[0], rng);

  const afterF = fixedHp(friendly);
  const afterE = fixedHp(enemy);
  const result = battleResult(friendly, enemy, "sortie", sortie);
  const record: BattleRecord = {
    mode: "sortie",
    deckId: deck.id,
    shipIds: fixedShipIds(deck.shipIds),
    shipMasterIds: fixedShipMasterIds(save, deck.shipIds),
    enemyIds: fixedEnemyIds(enemy),
    formation,
    before: { fNowHps: beforeF, eNowHps: beforeE },
    after: { fNowHps: afterF, eNowHps: afterE, fOnSlotByShipId: onSlotByShipId(friendly) },
    phases: {
      kouku,
      hougeki1,
      hougeki2: null,
      hougeki3: null,
      raigeki
    },
    units: {
      friendly: snapshotUnits(friendly),
      enemy: snapshotUnits(enemy)
    },
    sortie,
    result,
    aircraftLosses: aircraftLosses(friendly, enemy),
    support
  };

  return {
    payload: battlePayload(record, friendly, enemy),
    record
  };
}

export function createPracticeBattle(save: SaveState, input: BattleInput = {}) {
  const deck = save.decks.find((item) => item.id === (input.deckId ?? 1)) ?? save.decks[0];
  const rivals = input.practiceRivals ?? generatePracticeBatch().rivals;
  const rival = practiceRivalById(rivals, input.practiceEnemyId ?? 1);
  const formation: [number, number, number] = [battleFormation(input), 1, 1];
  const seed = practiceBattleSeed(rival, formation[0]);
  const rng = new BattleRng(seed);
  const friendly = friendlyUnits(save, deck.shipIds);
  const enemy = rival.ships.map((ship, index) => practiceEnemyUnit(ship.masterId, ship.level, index + 1));
  const beforeF = fixedHp(friendly);
  const beforeE = fixedHp(enemy);

  const kouku = airPhase(friendly, enemy, formation[0], rng);
  const hougeki1 = shellingPhase(friendly, enemy, formation[0], rng, "day");
  const raigeki = torpedoPhase(friendly, enemy, formation[0], rng);
  const afterF = fixedHp(friendly);
  const afterE = fixedHp(enemy);
  const result = battleResult(friendly, enemy, "practice", undefined, {
    playerLevel: save.player.level,
    enemyLevel: rival.level,
    enemyShipLevels: rival.ships.map((ship) => ship.level),
    seed
  });
  const record: BattleRecord = {
    mode: "practice",
    deckId: deck.id,
    practiceEnemyId: rival.id,
    practiceEnemyLevel: rival.level,
    practiceSeed: seed,
    playerLevel: save.player.level,
    shipIds: fixedShipIds(deck.shipIds),
    shipMasterIds: fixedShipMasterIds(save, deck.shipIds),
    enemyIds: fixedEnemyIds(enemy),
    formation,
    before: { fNowHps: beforeF, eNowHps: beforeE },
    after: { fNowHps: afterF, eNowHps: afterE, fOnSlotByShipId: onSlotByShipId(friendly) },
    phases: {
      kouku,
      hougeki1,
      hougeki2: null,
      hougeki3: null,
      raigeki
    },
    units: {
      friendly: snapshotUnits(friendly),
      enemy: snapshotUnits(enemy)
    },
    result,
    aircraftLosses: aircraftLosses(friendly, enemy)
  };

  return {
    payload: battlePayload(record, friendly, enemy),
    record
  };
}

export function createCombinedBattle(save: SaveState, input: BattleInput = {}) {
  const deck = save.decks.find((item) => item.id === 1) ?? save.decks[0];
  const escortDeck = save.decks.find((item) => item.id === 2) ?? save.decks[1] ?? deck;
  const friendlyFormation = battleFormation(input);
  const seed = (save.sortieSession?.seed ?? 1) + 424242 + friendlyFormation * 101;
  const rng = new BattleRng(seed);
  const friendly = friendlyUnits(save, deck.shipIds);
  const escort = friendlyUnits(save, escortDeck.shipIds);
  const sortie = sortieBattleContext(save, seed);
  const formation: [number, number, number] = [friendlyFormation, sortie?.formation ?? 1, 1];
  const enemy = enemyUnits(sortie?.shipIds ?? fallbackEnemyShipIds(save.sortieSession?.node ?? 1));
  const enemyCombined: BattleUnit[] = [];
  const beforeF = fixedHp(friendly);
  const beforeEscort = fixedHp(escort);
  const beforeE = fixedHp(enemy);
  const beforeECombined = fixedHp(enemyCombined);

  const support = supportPhase(save, sortie, enemy);
  const kouku = airPhase(friendly, enemy, formation[0], rng);
  const hougeki1 = shellingPhase(friendly, enemy, formation[0], rng, "day");
  const raigeki = torpedoPhase(friendly, enemy, formation[0], rng);
  const afterF = fixedHp(friendly);
  const afterEscort = fixedHp(escort);
  const afterE = fixedHp(enemy);
  const afterECombined = fixedHp(enemyCombined);
  const result = battleResult(friendly, enemy, "combined", sortie);
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
    after: {
      fNowHps: afterF,
      eNowHps: afterE,
      fCombinedNowHps: afterEscort,
      eCombinedNowHps: afterECombined,
      fOnSlotByShipId: onSlotByShipId(friendly),
      fCombinedOnSlotByShipId: onSlotByShipId(escort)
    },
    phases: {
      kouku,
      hougeki1,
      hougeki2: null,
      hougeki3: null,
      raigeki
    },
    units: {
      friendly: snapshotUnits(friendly),
      enemy: snapshotUnits(enemy),
      escort: snapshotUnits(escort),
      enemyCombined: snapshotUnits(enemyCombined)
    },
    sortie,
    result,
    aircraftLosses: aircraftLosses([...friendly, ...escort], enemy),
    support
  };

  return {
    payload: combinedBattlePayload(record, friendly, escort, enemy, enemyCombined),
    record
  };
}

export function createNightBattle(record: BattleRecord): { payload: Record<string, unknown>; record: BattleRecord } {
  const friendly = recordUnitsFrom(record, 0);
  const enemy = recordUnitsFrom(record, 1);
  const fNowHps = fixedHp(friendly);
  const eNowHps = fixedHp(enemy);
  const fMaxHps = fixedMaxHp(friendly);
  const eMaxHps = fixedMaxHp(enemy);
  const rng = new BattleRng(record.deckId * 8191 + record.before.fNowHps.reduce((sum, hp) => sum + hp, 0));
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
    result: {
      ...battleResult(friendly, enemy, record.mode, record.sortie, practiceResultContext(record, enemy)),
      mvpCombined: record.result.mvpCombined
    }
  };
  const payload: Record<string, unknown> = {
    api_deck_id: record.deckId,
    api_formation: record.formation,
    api_ship_ke: fixedEnemyIds(enemy),
    api_ship_lv: fixedUnitValues(enemy, (unit) => unit.level, 0),
    api_f_nowhps: fNowHps,
    api_f_maxhps: fMaxHps,
    api_e_nowhps: eNowHps,
    api_e_maxhps: eMaxHps,
    api_nowhps: [-1, ...fNowHps, ...eNowHps],
    api_maxhps: [-1, ...fMaxHps, ...eMaxHps],
    api_eSlot: fixedUnitValues(enemy, (unit) => fixedSlotIds(unit.slots), []),
    api_fParam: fixedUnitValues(friendly, (unit) => [unit.firepower, unit.torpedo, unit.aa, unit.armor], [0, 0, 0, 0]),
    api_eParam: fixedUnitValues(enemy, (unit) => [unit.firepower, unit.torpedo, unit.aa, unit.armor], [0, 0, 0, 0]),
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
  const kouku = record.phases.kouku ?? null;
  const stageFlag: [number, number, number] = kouku
    ? [1, kouku.api_stage2 ? 1 : 0, kouku.api_stage3 ? 1 : 0]
    : [0, 0, 0];
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
    api_stage_flag: stageFlag,
    api_kouku: kouku,
    api_support_flag: record.support?.arrived ? record.support.flag : 0,
    api_support_info: record.support?.arrived ? record.support.info : null,
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

function airPhase(friendly: BattleUnit[], enemy: BattleUnit[], formation: number, rng: BattleRng): KoukuPayload | null {
  const friendlyAir = activeAirSlots(friendly);
  const enemyAir = activeAirSlots(enemy);
  const friendlyCombatAir = combatAirSlots(friendlyAir);
  const enemyCombatAir = combatAirSlots(enemyAir);
  if (friendlyCombatAir.length === 0 && enemyCombatAir.length === 0) return null;

  const fCount = airCount(friendlyCombatAir);
  const eCount = airCount(enemyCombatAir);
  const state = resolveAirState(airPower(friendlyCombatAir), airPower(enemyCombatAir));
  const contact = contactPlanes(friendlyAir, enemyAir, state.code, rng);
  const fStage1Lost = applyStage1Loss(friendlyCombatAir, state.code, "friendly", rng);
  const eStage1Lost = applyStage1Loss(enemyCombatAir, state.code, "enemy", rng);
  const fAfterStage1 = airCount(friendlyCombatAir);
  const eAfterStage1 = airCount(enemyCombatAir);
  const friendlyInterception = hasOpeningAirstrikeSlots(friendlyCombatAir) && enemy.some((unit) => unit.hp > 0);
  const enemyInterception = hasOpeningAirstrikeSlots(enemyCombatAir) && friendly.some((unit) => unit.hp > 0);
  const hasStage2 = friendlyInterception || enemyInterception;
  const airFire = enemyInterception ? antiAirCutIn(friendly, rng) : undefined;
  const fStage2Lost = friendlyInterception ? applyStage2Loss(friendlyCombatAir, enemy, 1, undefined, rng) : 0;
  const eStage2Lost = enemyInterception ? applyStage2Loss(enemyCombatAir, friendly, formation, airFire, rng) : 0;
  const hasStage3 =
    (hasOpeningAirstrikeSlots(friendlyCombatAir) && enemy.some((unit) => unit.hp > 0)) ||
    (hasOpeningAirstrikeSlots(enemyCombatAir) && friendly.some((unit) => unit.hp > 0));
  const stage3 = hasStage3 ? openingAirstrike(friendly, enemy, contact[0], contact[1], rng) : null;
  syncOnSlotFromAirSlots(friendly);
  syncOnSlotFromAirSlots(enemy);
  return {
    api_plane_from: [airShipPositions(friendlyCombatAir), airShipPositions(enemyCombatAir)],
    api_stage1: {
      api_f_count: fCount,
      api_f_lostcount: fStage1Lost,
      api_e_count: eCount,
      api_e_lostcount: eStage1Lost,
      api_disp_seiku: state.code,
      api_touch_plane: contact
    },
    api_stage2: hasStage2
      ? {
          api_f_count: fAfterStage1,
          api_f_lostcount: fStage2Lost,
          api_e_count: eAfterStage1,
          api_e_lostcount: eStage2Lost
        }
      : null,
    api_stage3: stage3,
    ...(airFire ? { api_air_fire: airFire } : {})
  };
}

function activeAirSlots(units: BattleUnit[]) {
  return units
    .filter((unit) => unit.hp > 0)
    .flatMap((unit) => unit.airSlots.filter((slot) => slot.count > 0));
}

function combatAirSlots(slots: AirSlot[]) {
  return slots.filter((slot) => FIGHTER_COMBAT_TYPES.has(slot.equipTypeId));
}

function hasOpeningAirstrikeSlots(slots: AirSlot[]) {
  return slots.some((slot) => slot.count > 0 && OPENING_AIRSTRIKE_TYPES.has(slot.equipTypeId));
}

function airCount(slots: AirSlot[]) {
  return slots.reduce((sum, slot) => sum + slot.count, 0);
}

function airShipPositions(slots: AirSlot[]) {
  return [...new Set(slots.map((slot) => slot.shipPosition))].sort((a, b) => a - b);
}

function airPower(slots: AirSlot[]) {
  return fighterPower(slots
    .filter((slot) => FIGHTER_COMBAT_TYPES.has(slot.equipTypeId))
    .map((slot) => ({
      planeCount: slot.count,
      antiAir: safeNum(slot.slotMaster.api_tyku),
      proficiency: slot.proficiency,
      improvement: slot.improvement
    })));
}

function applyStage1Loss(slots: AirSlot[], state: number, side: "friendly" | "enemy", rng: BattleRng) {
  const rates: Record<number, { friendly: [number, number]; enemy: [number, number] }> = {
    1: { friendly: [0.025, 0.0583], enemy: [0, 1] },
    2: { friendly: [0.075, 0.175], enemy: [0, 0.7] },
    3: { friendly: [0.125, 0.291], enemy: [0, 0.5] },
    4: { friendly: [0.175, 0.408], enemy: [0, 0.3] },
    5: { friendly: [0.25, 0.583], enemy: [0, 0.1] }
  };
  const key = side === "friendly" ? "friendly" : "enemy";
  const [min, max] = rates[state]?.[key] ?? [0, 0];
  let lost = 0;
  for (const slot of slots) {
    if (!FIGHTER_COMBAT_TYPES.has(slot.equipTypeId) || slot.count <= 0) continue;
    const rate = min + (max - min) * rng.next();
    const count = Math.min(slot.count, rate > 0 ? Math.max(1, Math.floor(slot.count * rate)) : 0);
    slot.count -= count;
    lost += count;
  }
  return lost;
}

function contactPlanes(friendlyAir: AirSlot[], enemyAir: AirSlot[], state: number, rng: BattleRng): [number, number] {
  return [
    state <= 2 ? contactPlane(friendlyAir, rng) : -1,
    state >= 4 ? contactPlane(enemyAir, rng) : -1
  ];
}

function contactPlane(slots: AirSlot[], rng: BattleRng) {
  const candidates = slots
    .filter((slot) => slot.count > 0 && CONTACT_TYPES.has(slot.equipTypeId) && safeNum(slot.slotMaster.api_saku) > 0)
    .sort((a, b) =>
      safeNum(b.slotMaster.api_houm) - safeNum(a.slotMaster.api_houm) ||
      safeNum(b.slotMaster.api_saku) - safeNum(a.slotMaster.api_saku) ||
      b.slotMasterId - a.slotMasterId
    );
  if (candidates.length === 0) return -1;
  const chance = Math.min(0.95, candidates.reduce((sum, slot) => sum + Math.sqrt(slot.count) * safeNum(slot.slotMaster.api_saku) * 0.04, 0));
  return rng.chance(chance) ? candidates[0].slotMasterId : -1;
}

function antiAirCutIn(defenders: BattleUnit[], rng: BattleRng) {
  const candidates = defenders
    .filter((unit) => unit.hp > 0)
    .map((unit) => {
      const highAngle = countEquipTypes(unit, HIGH_ANGLE_GUN_TYPES);
      const aaGun = countEquipTypes(unit, AA_GUN_TYPES);
      const radar = countEquipTypes(unit, RADAR_TYPES);
      if (highAngle >= 2 && radar > 0) return { unit, kind: 5, bonus: 4, modifier: 1.5 };
      if (highAngle > 0 && aaGun > 0 && radar > 0) return { unit, kind: 7, bonus: 3, modifier: 1.35 };
      if (highAngle > 0 && radar > 0) return { unit, kind: 8, bonus: 2, modifier: 1.25 };
      return null;
    })
    .filter((item): item is NonNullable<typeof item> => item != null);
  if (candidates.length === 0) return undefined;
  const selected = candidates[0];
  if (!rng.chance(0.65)) return undefined;
  return {
    api_idx: selected.unit.position - 1,
    api_kind: selected.kind,
    api_use_items: selected.unit.slots.filter((slot) => slot > 0).slice(0, 3)
  };
}

function applyStage2Loss(
  attackingSlots: AirSlot[],
  defenders: BattleUnit[],
  formation: number,
  airFire: KoukuPayload["api_air_fire"] | undefined,
  rng: BattleRng
) {
  const attackSlots = attackingSlots.filter((slot) => slot.count > 0 && OPENING_AIRSTRIKE_TYPES.has(slot.equipTypeId));
  const livingDefenders = defenders.filter((unit) => unit.hp > 0);
  if (attackSlots.length === 0 || livingDefenders.length === 0) return 0;
  const fleetAa = livingDefenders.reduce((sum, unit) => sum + unit.aa, 0);
  const aaMod = formationAaModifier(formation);
  const cutInBonus = airFire ? 3 : 0;
  let lost = 0;
  for (const slot of attackSlots) {
    const defender = rng.pick(livingDefenders);
    const effectiveAa = defender.aa * aaMod + fleetAa * 0.2;
    const proportional = Math.floor(slot.count * rng.next() * 0.1 * aaMod * Math.min(1, effectiveAa / 50));
    const fixed = Math.floor(effectiveAa / 50) + cutInBonus;
    const count = Math.min(slot.count, proportional + fixed);
    slot.count -= count;
    lost += count;
  }
  return lost;
}

function openingAirstrike(friendly: BattleUnit[], enemy: BattleUnit[], friendlyTouchPlane: number, enemyTouchPlane: number, rng: BattleRng) {
  const stage3 = emptyKoukuStage3Payload();
  for (const attacker of friendly) {
    appendAirstrikes(stage3, attacker, enemy, friendlyTouchPlane, rng);
  }
  for (const attacker of enemy) {
    appendAirstrikes(stage3, attacker, friendly, enemyTouchPlane, rng);
  }
  return stage3;
}

function appendAirstrikes(stage3: KoukuStage3Payload, attacker: BattleUnit, targets: BattleUnit[], touchPlane: number, rng: BattleRng) {
  if (attacker.hp <= 0) return;
  for (const slot of attacker.airSlots.filter((item) => item.count > 0 && OPENING_AIRSTRIKE_TYPES.has(item.equipTypeId))) {
    const target = randomAlive(targets, rng);
    if (!target) return;
    const hit = rng.chance(0.95);
    const critical = hit && rng.chance(0.125);
    const damage = hit ? airstrikeDamage(slot, target, attacker.ammoModifier, contactModifier(touchPlane, slot), critical, rng) : 0;
    if (damage > 0) {
      target.hp = Math.max(target.side === 0 ? 1 : 0, target.hp - damage);
      attacker.damageDealt += damage;
    }
    const targetIndex = target.position - 1;
    const torpedo = TORPEDO_BOMBER_TYPES.has(slot.equipTypeId);
    if (attacker.side === 0) {
      if (torpedo) stage3.api_erai_flag[targetIndex] = 1;
      else stage3.api_ebak_flag[targetIndex] = 1;
      stage3.api_edam[targetIndex] += damage;
      stage3.api_ecl_flag[targetIndex] = Math.max(stage3.api_ecl_flag[targetIndex], critical ? 2 : hit ? 1 : 0);
    } else {
      if (torpedo) stage3.api_frai_flag[targetIndex] = 1;
      else stage3.api_fbak_flag[targetIndex] = 1;
      stage3.api_fdam[targetIndex] += damage;
      stage3.api_fcl_flag[targetIndex] = Math.max(stage3.api_fcl_flag[targetIndex], critical ? 2 : hit ? 1 : 0);
    }
  }
}

function airstrikeDamage(slot: AirSlot, target: BattleUnit, ammoModifier: number, contact: number, critical: boolean, rng: BattleRng) {
  const stat = TORPEDO_BOMBER_TYPES.has(slot.equipTypeId) ? safeNum(slot.slotMaster.api_raig) : safeNum(slot.slotMaster.api_baku);
  const typeModifier = TORPEDO_BOMBER_TYPES.has(slot.equipTypeId) ? (rng.chance(0.5) ? 0.8 : 1.5) : 1;
  const preCapPower = typeModifier * (stat * Math.sqrt(Math.max(1, slot.count)) + 25);
  return resolveBattleDamage({
    preCapPower,
    cap: 170,
    armor: target.armor,
    armorRoll: rng.int(Math.max(1, Math.floor(target.armor))),
    ammoModifier,
    critical,
    postCapModifier: contact,
    targetHp: target.hp,
    targetSide: target.side
  });
}

function contactModifier(touchPlane: number, slot: AirSlot) {
  if (touchPlane <= 0) return 1;
  const contactMaster = slotMasterById(touchPlane);
  const accuracy = safeNum(contactMaster?.api_houm ?? slot.slotMaster.api_houm);
  if (accuracy >= 3) return 1.2;
  if (accuracy >= 2) return 1.17;
  return 1.12;
}

function syncOnSlotFromAirSlots(units: BattleUnit[]) {
  for (const unit of units) {
    const next = normalizeFixed(unit.onSlot, 5, 0);
    const bySlotIndex = new Map(unit.airSlots.map((slot) => [slot.slotIndex, slot.count] as const));
    for (let index = 0; index < next.length; index += 1) {
      if (bySlotIndex.has(index)) next[index] = Math.max(0, Math.trunc(bySlotIndex.get(index) ?? 0));
    }
    unit.onSlot = next;
  }
}

function countEquipTypes(unit: BattleUnit, typeIds: Set<number>) {
  return unit.equippedSlots.filter((slot) => typeIds.has(safeNum(slot.slotMaster.api_type?.[2]))).length;
}

function formationAaModifier(formation: number) {
  const modifiers: Record<number, number> = { 1: 1, 2: 1.2, 3: 1.6, 4: 1, 5: 1 };
  return modifiers[formation] ?? 1;
}

export function emptyKoukuStage3Payload(length = 6): KoukuStage3Payload {
  return {
    api_frai_flag: Array(length).fill(0),
    api_erai_flag: Array(length).fill(0),
    api_fbak_flag: Array(length).fill(0),
    api_ebak_flag: Array(length).fill(0),
    api_fcl_flag: Array(length).fill(0),
    api_ecl_flag: Array(length).fill(0),
    api_fdam: Array(length).fill(0),
    api_edam: Array(length).fill(0)
  };
}

function shellingProfile(attacker: BattleUnit, formation: number, phase: "day" | "night"): ShellingAttackProfile {
  const slotIds = specialAttackSlotIds(attacker);
  if (phase === "night") {
    const torpedoes = countEquipTypes(attacker, TORPEDO_TYPES);
    const mainGuns = countEquipTypes(attacker, MAIN_GUN_TYPES);
    const secondaries = countEquipTypes(attacker, SECONDARY_GUN_TYPES);
    if (torpedoes >= 2) {
      return {
        preCapPower: (attacker.firepower + attacker.torpedo) * damageStateModifier(attacker),
        cap: 360,
        atType: 0,
        spType: 5,
        hits: 1,
        postCapModifier: 1.5,
        slotIds
      };
    }
    if (mainGuns >= 2 || (mainGuns >= 1 && secondaries >= 1)) {
      return {
        preCapPower: (attacker.firepower + attacker.torpedo) * damageStateModifier(attacker),
        cap: 360,
        atType: 0,
        spType: 1,
        hits: 2,
        postCapModifier: 1.2,
        slotIds
      };
    }
    return {
      preCapPower: (attacker.firepower + attacker.torpedo) * damageStateModifier(attacker),
      cap: 360,
      atType: 0,
      spType: 0,
      hits: 1,
      postCapModifier: 1,
      slotIds
    };
  }

  const apShell = attacker.equippedSlots.some((slot) => safeNum(slot.slotMaster.api_type?.[2]) === AP_SHELL_TYPE);
  const seaplane = countEquipTypes(attacker, SEAPLANE_TYPES) > 0;
  const mainGunCount = countEquipTypes(attacker, MAIN_GUN_TYPES);
  const mainGun = mainGunCount > 0;
  const doubleAttack = !apShell && seaplane && mainGunCount >= 2;
  const isCarrierShelling = CARRIER_TYPES.has(attacker.shipType) && attacker.airSlots.some((slot) => slot.count > 0 && OPENING_AIRSTRIKE_TYPES.has(slot.equipTypeId));
  const base = isCarrierShelling
    ? 55 + Math.floor(1.5 * (attacker.firepower + airstrikeStatSum(attacker)))
    : attacker.firepower + 5;
  const postCapModifier = apShell && mainGun ? 1.3 : doubleAttack ? 1.2 : 1;
  return {
    preCapPower: base * formationModifier(formation, "shelling") * damageStateModifier(attacker),
    cap: 220,
    atType: apShell && mainGun ? 3 : doubleAttack ? 2 : 0,
    spType: 0,
    hits: doubleAttack ? 2 : 1,
    postCapModifier,
    slotIds: doubleAttack ? equippedSlotMasterIds(attacker, MAIN_GUN_TYPES, 2) : slotIds
  };
}

function airstrikeStatSum(unit: BattleUnit) {
  return unit.airSlots.reduce((sum, slot) => sum + Math.max(safeNum(slot.slotMaster.api_baku), safeNum(slot.slotMaster.api_raig)), 0);
}

function specialAttackSlotIds(unit: BattleUnit) {
  const ids = unit.slots.filter((id) => id > 0).slice(0, 4);
  return ids.length ? ids : [primarySlotId(unit)];
}

function equippedSlotMasterIds(unit: BattleUnit, typeIds: Set<number>, limit: number) {
  return unit.equippedSlots
    .filter((slot) => typeIds.has(safeNum(slot.slotMaster.api_type?.[2])))
    .map((slot) => slot.slotMaster.api_id)
    .slice(0, limit);
}

function shellingPhase(friendly: BattleUnit[], enemy: BattleUnit[], formation: number, rng: BattleRng, phase: "day" | "night"): HougekiPayload {
  const payload = emptyHougeki(phase === "night");
  if (phase === "night") {
    const friendlyByPosition = unitsByPosition(friendly);
    const enemyByPosition = unitsByPosition(enemy);
    for (let turn = 0; turn < 6; turn += 1) {
      const friendlyAttacker = friendlyByPosition[turn];
      const enemyAttacker = enemyByPosition[turn];
      if (friendlyAttacker) appendShellingAttack(payload, friendlyAttacker, enemy, formation, rng, phase);
      if (enemyAttacker) appendShellingAttack(payload, enemyAttacker, friendly, 1, rng, phase);
    }
    return payload;
  }

  const friendlyOrder = attackOrder(friendly);
  const enemyOrder = attackOrder(enemy);
  const turns = Math.max(friendlyOrder.length, enemyOrder.length);
  for (let turn = 0; turn < turns; turn += 1) {
    if (friendlyOrder[turn]) appendShellingAttack(payload, friendlyOrder[turn], enemy, formation, rng, phase);
    if (enemyOrder[turn]) appendShellingAttack(payload, enemyOrder[turn], friendly, 1, rng, phase);
  }
  return payload;
}

function unitsByPosition(units: BattleUnit[]) {
  return Array.from({ length: 6 }, (_, index) => units.find((unit) => unit.position === index + 1));
}

function appendShellingAttack(
  payload: HougekiPayload,
  attacker: BattleUnit,
  targets: BattleUnit[],
  formation: number,
  rng: BattleRng,
  phase: "day" | "night"
) {
  if (!canShell(attacker, phase)) return;
  const target = randomAlive(targets, rng);
  if (!target) return;

  const profile = shellingProfile(attacker, formation, phase);
  if (profile.preCapPower <= 0 || profile.hits <= 0) return;
  const hitChance = phase === "night" ? 0.96 : 0.9;
  const damages: number[] = [];
  const cls: number[] = [];
  for (let hit = 0; hit < profile.hits; hit += 1) {
    const landed = rng.chance(hitChance);
    const critical = landed && rng.chance(phase === "night" ? 0.15 : 0.125);
    const damage = landed
      ? applyDamage(target, profile.preCapPower, profile.cap, attacker.ammoModifier, rng, attacker.side === 0 ? 1 : 0, critical, profile.postCapModifier)
      : 0;
    if (damage > 0) attacker.damageDealt += damage;
    damages.push(damage);
    cls.push(critical ? 2 : landed ? 1 : 0);
  }

  payload.api_at_eflag.push(attacker.side);
  payload.api_at_list.push(attacker.position - 1);
  payload.api_at_type.push(profile.atType);
  payload.api_df_list.push(Array(damages.length).fill(target.position - 1));
  payload.api_si_list.push(profile.slotIds);
  payload.api_cl_list.push(cls);
  payload.api_damage.push(damages);
  if (payload.api_sp_list) payload.api_sp_list.push(profile.spType);
  if (payload.api_n_mother_list) payload.api_n_mother_list.push(0);
}

function torpedoPhase(friendly: BattleUnit[], enemy: BattleUnit[], formation: number, rng: BattleRng): RaigekiPayload | null {
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
    const target = randomAlive(enemy, rng);
    if (!target) continue;
    const attackerIdx = attacker.position - 1;
    const targetIdx = target.position - 1;
    const power = (attacker.torpedo + 5) * formationModifier(formation, "torpedo") * damageStateModifier(attacker);
    const critical = rng.chance(0.125);
    const damage = rng.chance(0.9) ? applyDamage(target, power, 180, attacker.ammoModifier, rng, 1, critical) : 0;
    attacker.damageDealt += damage;
    payload.api_frai[attackerIdx] = targetIdx;
    payload.api_frai_flag[attackerIdx] = 1;
    payload.api_fydam[attackerIdx] = damage;
    payload.api_edam[targetIdx] += damage;
    payload.api_ecl[targetIdx] = critical ? 2 : damage > 0 ? 1 : 0;
    fired = true;
  }
  for (const attacker of enemy) {
    if (attacker.hp <= 0 || attacker.torpedo <= 0 || damageState(attacker) >= 3) continue;
    const target = randomAlive(friendly, rng);
    if (!target) continue;
    const attackerIdx = attacker.position - 1;
    const targetIdx = target.position - 1;
    const power = (attacker.torpedo + 5) * damageStateModifier(attacker);
    const critical = rng.chance(0.125);
    const damage = rng.chance(0.9) ? applyDamage(target, power, 180, attacker.ammoModifier, rng, 0, critical) : 0;
    attacker.damageDealt += damage;
    payload.api_erai[attackerIdx] = targetIdx;
    payload.api_erai_flag[attackerIdx] = 1;
    payload.api_eydam[attackerIdx] = damage;
    payload.api_fdam[targetIdx] += damage;
    payload.api_fcl[targetIdx] = critical ? 2 : damage > 0 ? 1 : 0;
    fired = true;
  }
  return fired ? payload : null;
}

function applyDamage(
  target: BattleUnit,
  preCapPower: number,
  cap: number,
  ammoModifier: number,
  rng: BattleRng,
  targetSide: Side,
  critical = false,
  postCapModifier = 1
) {
  const damage = resolveBattleDamage({
    preCapPower,
    cap,
    armor: target.armor,
    armorRoll: rng.int(Math.max(1, Math.floor(target.armor))),
    ammoModifier,
    critical,
    postCapModifier,
    targetHp: target.hp,
    targetSide
  });
  target.hp = Math.max(targetSide === 0 ? 1 : 0, target.hp - damage);
  return damage;
}

function battleResult(
  friendly: BattleUnit[],
  enemy: BattleUnit[],
  mode: BattleMode = "sortie",
  sortie?: BattleSortieContext,
  practice?: PracticeResultContext
): BattleResultRecord {
  const enemyTotalHp = enemy.reduce((sum, unit) => sum + unit.maxHp, 0);
  const enemyRemainingHp = enemy.reduce((sum, unit) => sum + Math.max(0, unit.hp), 0);
  const sunk = enemy.filter((unit) => unit.hp <= 0).length;
  const damageRatio = enemyTotalHp > 0 ? (enemyTotalHp - enemyRemainingHp) / enemyTotalHp : 1;
  const rank = sunk === enemy.length ? "S" : damageRatio >= 0.7 ? "A" : damageRatio >= 0.4 ? "B" : "C";
  const mvp = [...friendly].sort((a, b) => b.damageDealt - a.damageDealt || a.position - b.position)[0]?.position ?? 1;
  const baseExp = mode === "practice" && practice
    ? practiceBaseShipExp(practice.enemyShipLevels, rank, practiceSeededBonus(practice.seed))
    : rank === "S" ? 40 : rank === "A" ? 35 : rank === "B" ? 30 : 20;
  const memberExp = mode === "practice" && practice
    ? practiceMemberExp(practice.playerLevel, practice.enemyLevel, rank)
    : baseExp * 2;
  const drop = mode === "practice" || !sortie ? null : selectSortieDrop({
    mapId: sortie.mapId,
    node: sortie.node,
    rank,
    seed: sortie.seed,
    enemyFleetKey: sortie.enemyFleetKey
  });
  return {
    rank,
    mvp,
    baseExp,
    getExp: memberExp,
    memberExp,
    dropShipId: drop?.shipId ?? 0,
    dropShipName: drop?.shipName ?? "",
    dropShipType: drop?.shipType ?? ""
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
  const maxeq = Array.isArray(master?.api_maxeq) ? master.api_maxeq : [];
  const currentOnSlot = normalizeFixed(ship.onSlot, 5, 0).map((count) => Math.max(0, safeNum(count)));
  const equippedSlots: EquippedSlot[] = normalizeFixed(ship.slotIds, 5, -1)
    .map((id, index) => {
      if (id <= 0) return null;
      const item = slotItems.find((slotItem) => slotItem.id === id);
      const slotMaster = item ? slotMasterById(item.masterId) : undefined;
      if (!item || !slotMaster) return null;
      const maxCount = Math.max(0, safeNum(maxeq[index]));
      const count = isAircraftSlotItem(slotMaster) ? Math.min(maxCount, currentOnSlot[index]) : 0;
      return {
        index,
        slotItemId: item.id,
        slotMaster,
        count,
        maxCount,
        improvement: item.level,
        proficiency: item.proficiency
      };
    })
    .filter((item): item is EquippedSlot => Boolean(item));
  const slotMasters = equippedSlots.map((item) => item.slotMaster);
  const equipSum = (field: keyof (typeof masterData.api_mst_slotitem)[number]) =>
    slotMasters.reduce((sum, item) => sum + safeNum(item[field]), 0);
  const slots = slotMasters.map((item) => item.api_id);
  const airSlots = equippedSlots
    .filter((item) => item.count > 0 && isAircraftSlotItem(item.slotMaster))
    .map((item) => ({
      shipPosition: position,
      slotIndex: item.index,
      slotItemId: item.slotItemId,
      slotMasterId: item.slotMaster.api_id,
      equipTypeId: safeNum(item.slotMaster.api_type?.[2]),
      slotMaster: item.slotMaster,
      count: item.count,
      maxCount: item.maxCount,
      improvement: item.improvement,
      proficiency: item.proficiency
    }));
  const onSlot = normalizeFixed(
    currentOnSlot.map((count, index) => {
      const equipped = equippedSlots.find((slot) => slot.index === index);
      return equipped && isAircraftSlotItem(equipped.slotMaster) ? Math.min(count, equipped.maxCount) : 0;
    }),
    5,
    0
  );
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
    shipType: safeNum(master?.api_stype, 2),
    slots: slots.length ? slots : [1],
    equippedSlots,
    airSlots,
    onSlot,
    originalOnSlot: [...onSlot],
    damageDealt: 0
  };
}

function sortieBattleContext(save: SaveState, seed: number): BattleSortieContext | undefined {
  const session = save.sortieSession;
  if (!session) return undefined;
  const encounter = selectSortieEncounter(session.areaId, session.mapNo, session.node, seed);
  return encounter ? { ...encounter, seed } : undefined;
}

function practiceBattleSeed(rival: PracticeRival, formation: number) {
  return rival.ships.reduce(
    (sum, ship, index) => sum + ship.masterId * (index + 1) * 17 + ship.level * (index + 3) * 31,
    rival.id * 13007 + formation * 101 + rival.level * 997
  );
}

function practiceResultContext(record: BattleRecord, enemy: BattleUnit[]): PracticeResultContext | undefined {
  if (record.mode !== "practice") return undefined;
  return {
    playerLevel: safeNum(record.playerLevel, 1),
    enemyLevel: safeNum(record.practiceEnemyLevel, 1),
    enemyShipLevels: enemy.map((unit) => unit.level),
    seed: safeNum(record.practiceSeed, record.practiceEnemyId ?? 1)
  };
}

function supportPhase(
  save: SaveState,
  sortie: BattleSortieContext | undefined,
  enemy: BattleUnit[]
): NonNullable<BattleRecord["support"]> | undefined {
  if (!sortie || save.sortieSession?.areaId !== 5) return undefined;
  const missionId = sortie.isBoss ? 34 : 33;
  const run = save.expeditionRuns.find(
    (item) => item.status === "active" && item.missionId === missionId
  );
  if (!run) return undefined;
  const snapshot = run.snapshot as {
    ships?: { id: number; masterId: number }[];
  };
  const shipIds = snapshot.ships?.map((ship) => ship.id) ?? [];
  const supportUnits = friendlyUnits(save, shipIds);
  const rng = new BattleRng(run.seed + sortie.node * 31 + run.supportCount * 997);
  const arrivalChance = sortie.isBoss ? 0.5 : 0.8;
  if (!rng.chance(arrivalChance) || supportUnits.length < 2) {
    return {
      deckId: run.deckId,
      missionId,
      arrived: false,
      flag: 0,
      info: null
    };
  }

  const carrierCount = supportUnits.filter((unit) => [7, 11, 18].includes(unit.shipType)).length;
  const shellingCount = supportUnits.filter((unit) => [8, 9, 10, 12].includes(unit.shipType)).length;
  const flag = carrierCount >= 2 ? 1 : shellingCount >= 2 ? 2 : 3;
  const damage = normalizeFixed(enemy.map(() => 0), 6, 0);
  const critical = normalizeFixed(enemy.map(() => 0), 6, 0);

  for (const attacker of supportUnits) {
    const targets = enemy.filter((unit) => unit.hp > 0);
    if (targets.length === 0) break;
    const target = rng.pick(targets);
    const power = flag === 3 ? attacker.torpedo : attacker.firepower;
    const dealt = Math.max(1, Math.min(target.hp, Math.floor(power * (0.2 + rng.next() * 0.25))));
    target.hp = Math.max(0, target.hp - dealt);
    damage[target.position - 1] += dealt;
    critical[target.position - 1] = rng.chance(0.15) ? 2 : 1;
  }

  const supportShipIds = supportUnits.map((unit) => unit.masterId);
  const info = flag === 1
    ? {
        api_support_airatack: {
          api_deck_id: run.deckId,
          api_ship_id: [-1, ...supportShipIds],
          api_stage_flag: [0, 0, 1],
          api_kouku: {
            api_plane_from: [[1]],
            api_stage1: null,
            api_stage2: null,
            api_stage3: {
              api_frai_flag: normalizeFixed([], 6, 0),
              api_erai_flag: normalizeFixed([], 6, 0),
              api_fbak_flag: normalizeFixed([], 6, 0),
              api_ebak_flag: normalizeFixed([], 6, 0),
              api_fcl_flag: normalizeFixed([], 6, 0),
              api_ecl_flag: critical,
              api_fdam: normalizeFixed([], 6, 0),
              api_edam: damage
            }
          }
        }
      }
    : {
        api_support_hourai: {
          api_deck_id: run.deckId,
          api_ship_id: [-1, ...supportShipIds],
          api_undressing_flag: normalizeFixed(supportUnits.map(() => 1), 6, 0),
          api_cl_list: critical,
          api_damage: damage
        }
      };
  return {
    deckId: run.deckId,
    missionId,
    arrived: true,
    flag,
    info
  };
}

function enemyUnits(shipIds: readonly number[]) {
  return shipIds.slice(0, 6).map((id, index) => enemyUnit(id, index + 1));
}

function enemyUnit(masterId: number, position: number): BattleUnit {
  const template = ENEMY_UNIT_TEMPLATES[masterId] ?? ENEMY_UNIT_TEMPLATES[1501];
  const onSlot = normalizeFixed(template.onSlot, 5, 0).map((count) => Math.max(0, safeNum(count)));
  const equippedSlots = normalizeFixed(template.slots, 5, -1)
    .map((slotMasterId, index) => {
      if (slotMasterId <= 0) return null;
      const slotMaster = slotMasterById(slotMasterId);
      if (!slotMaster) return null;
      const maxCount = onSlot[index] ?? 0;
      return {
        index,
        slotItemId: slotMasterId,
        slotMaster,
        count: isAircraftSlotItem(slotMaster) ? maxCount : 0,
        maxCount,
        improvement: 0,
        proficiency: 0
      } satisfies EquippedSlot;
    })
    .filter((slot): slot is EquippedSlot => Boolean(slot));
  const airSlots = equippedSlots
    .filter((slot) => slot.count > 0 && isAircraftSlotItem(slot.slotMaster))
    .map((slot) => ({
      shipPosition: position,
      slotIndex: slot.index,
      slotItemId: slot.slotItemId,
      slotMasterId: slot.slotMaster.api_id,
      equipTypeId: safeNum(slot.slotMaster.api_type?.[2]),
      slotMaster: slot.slotMaster,
      count: slot.count,
      maxCount: slot.maxCount,
      improvement: slot.improvement,
      proficiency: slot.proficiency
    }));
  return {
    side: 1,
    position,
    apiIndex: position + 6,
    shipId: 0,
    masterId: template.masterId,
    level: template.level,
    hp: template.hp,
    maxHp: template.hp,
    firepower: template.firepower,
    torpedo: template.torpedo,
    aa: template.aa,
    armor: template.armor,
    luck: template.luck,
    range: template.range,
    ammoModifier: 1,
    shipType: template.shipType,
    slots: template.slots.length ? [...template.slots] : [1501],
    equippedSlots,
    airSlots,
    onSlot,
    originalOnSlot: [...onSlot],
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
    shipType: safeNum(master?.api_stype, 2),
    slots: [1],
    equippedSlots: [],
    airSlots: [],
    onSlot: [0, 0, 0, 0, 0],
    originalOnSlot: [0, 0, 0, 0, 0],
    damageDealt: 0
  };
}

function escortMvp(escort: BattleUnit[]) {
  return escort.length > 0 ? [...escort].sort((a, b) => b.damageDealt - a.damageDealt || a.position - b.position)[0].position : 1;
}

function recordUnitsFrom(record: BattleRecord, side: Side) {
  const hps = side === 0 ? record.after.fNowHps : record.after.eNowHps;
  const ids = side === 0 ? record.shipIds : record.enemyIds;
  const snapshots = side === 0 ? record.units?.friendly : record.units?.enemy;
  if (snapshots?.length) {
    return snapshots
      .filter((snapshot) => snapshot.position <= 6)
      .map((snapshot) => unitFromSnapshot(snapshot, hps[snapshot.position - 1] ?? snapshot.maxHp))
      .filter((unit): unit is BattleUnit => Boolean(unit));
  }
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
        shipType: safeNum(master?.api_stype, 2),
        slots: [1],
        equippedSlots: [],
        airSlots: [],
        onSlot: [0, 0, 0, 0, 0],
        originalOnSlot: [0, 0, 0, 0, 0],
        damageDealt: 0
      } satisfies BattleUnit;
    })
    .filter((unit): unit is BattleUnit => Boolean(unit));
}

function snapshotUnits(units: BattleUnit[]): BattleUnitSnapshot[] {
  return units.map((unit) => ({
    side: unit.side,
    position: unit.position,
    shipId: unit.shipId,
    masterId: unit.masterId,
    level: unit.level,
    maxHp: unit.maxHp,
    firepower: unit.firepower,
    torpedo: unit.torpedo,
    aa: unit.aa,
    armor: unit.armor,
    luck: unit.luck,
    range: unit.range,
    ammoModifier: unit.ammoModifier,
    shipType: unit.shipType,
    slots: [...unit.slots],
    equippedSlots: unit.equippedSlots.map((slot) => ({
      index: slot.index,
      slotItemId: slot.slotItemId,
      slotMasterId: slot.slotMaster.api_id,
      count: slot.count,
      maxCount: slot.maxCount,
      improvement: slot.improvement,
      proficiency: slot.proficiency
    })),
    onSlot: [...unit.onSlot],
    originalOnSlot: [...unit.originalOnSlot]
  }));
}

function unitFromSnapshot(snapshot: BattleUnitSnapshot, hp: number): BattleUnit {
  const equippedSlots = snapshot.equippedSlots
    .map((slot) => {
      const slotMaster = slotMasterById(slot.slotMasterId);
      return slotMaster
        ? {
          index: slot.index,
          slotItemId: slot.slotItemId,
          slotMaster,
          count: slot.count,
          maxCount: slot.maxCount,
          improvement: slot.improvement,
          proficiency: slot.proficiency
        } satisfies EquippedSlot
        : null;
    })
    .filter((slot): slot is EquippedSlot => Boolean(slot));
  const airSlots = equippedSlots
    .filter((slot) => slot.count > 0 && isAircraftSlotItem(slot.slotMaster))
    .map((slot) => ({
      shipPosition: snapshot.position,
      slotIndex: slot.index,
      slotItemId: slot.slotItemId,
      slotMasterId: slot.slotMaster.api_id,
      equipTypeId: safeNum(slot.slotMaster.api_type?.[2]),
      slotMaster: slot.slotMaster,
      count: slot.count,
      maxCount: slot.maxCount,
      improvement: slot.improvement,
      proficiency: slot.proficiency
    }));
  return {
    side: snapshot.side,
    position: snapshot.position,
    apiIndex: snapshot.side === 0 ? snapshot.position : snapshot.position + 6,
    shipId: snapshot.shipId,
    masterId: snapshot.masterId,
    level: snapshot.level,
    hp,
    maxHp: snapshot.maxHp,
    firepower: snapshot.firepower,
    torpedo: snapshot.torpedo,
    aa: snapshot.aa,
    armor: snapshot.armor,
    luck: snapshot.luck,
    range: snapshot.range,
    ammoModifier: snapshot.ammoModifier,
    shipType: snapshot.shipType,
    slots: [...snapshot.slots],
    equippedSlots,
    airSlots,
    onSlot: normalizeFixed(snapshot.onSlot, 5, 0),
    originalOnSlot: normalizeFixed(snapshot.originalOnSlot, 5, 0),
    damageDealt: 0
  };
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
  return units.filter((unit) => canShell(unit, "day")).sort((a, b) => b.range - a.range || a.position - b.position);
}

function canShell(unit: BattleUnit, phase: "day" | "night") {
  if (unit.hp <= 0) return false;
  if (!CARRIER_TYPES.has(unit.shipType)) return true;
  if (phase === "night") return false;

  const state = damageState(unit);
  if (unit.shipType === 18 ? state >= 3 : state >= 2) return false;
  if (!unit.airSlots.some((slot) => slot.count > 0 && OPENING_AIRSTRIKE_TYPES.has(slot.equipTypeId))) {
    return false;
  }
  return true;
}

function randomAlive(units: BattleUnit[], rng: BattleRng) {
  const living = units.filter((unit) => unit.hp > 0);
  return living.length > 0 ? rng.pick(living) : undefined;
}

function onSlotByShipId(units: BattleUnit[]) {
  return Object.fromEntries(
    units
      .filter((unit) => unit.side === 0 && unit.shipId > 0)
      .map((unit) => [unit.shipId, normalizeFixed(unit.onSlot.map((count) => Math.max(0, Math.trunc(count))), 5, 0)])
  );
}

function aircraftLosses(friendly: BattleUnit[], enemy: BattleUnit[]) {
  const collect = (units: BattleUnit[]) =>
    Object.fromEntries(
      units
        .filter((unit) => unit.shipId > 0 || unit.masterId > 0)
        .map((unit) => [
          unit.shipId > 0 ? unit.shipId : unit.masterId,
          unit.originalOnSlot.reduce((sum, count, index) => sum + Math.max(0, count - (unit.onSlot[index] ?? 0)), 0)
        ])
        .filter(([, loss]) => loss > 0)
    );
  return {
    friendly: collect(friendly),
    enemy: collect(enemy)
  };
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

function normalizeFixed<T>(values: readonly T[], length: number, fill: T): T[] {
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

function slotMasterById(id: number) {
  return SLOT_MASTER_BY_ID.get(id);
}

function safeNum(value: unknown, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}
