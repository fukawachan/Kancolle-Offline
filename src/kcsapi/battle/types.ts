import type { masterData } from "../../master/data.js";
import type { EnemyTargetKind } from "../../master/enemy-classification.js";
import type { SelectedSortieEncounter } from "../../master/sortie-data.js";
import type { BattleRng } from "../battle-formulas.js";
import type { PracticeRival } from "../practice.js";

export type BattleInput = {
  formation?: number;
  engagement?: number;
  deckId?: number;
  practiceEnemyId?: number;
  practiceRivals?: PracticeRival[];
  endpoint?: BattleEndpointKind;
};

export type BattleMode = "sortie" | "practice" | "combined";
export type BattleEndpointKind =
  | "sortieDay"
  | "sortieAir"
  | "sortieLdAir"
  | "sortieLdShooting"
  | "sortieNightToDay"
  | "sortieNight"
  | "practiceDay"
  | "practiceNight"
  | "combinedDay"
  | "combinedBattleWater"
  | "combinedEachBattle"
  | "combinedEachBattleWater"
  | "combinedAir"
  | "combinedLdAir"
  | "combinedLdShooting"
  | "combinedNight"
  | "combinedSpNight"
  | "combinedEcBattle"
  | "combinedEcNight"
  | "combinedEcNightToDay";

export type BattleFleetKind = "main" | "escort" | "enemyMain" | "enemyEscort";

export type BattleFleet = {
  kind: BattleFleetKind;
  side: Side;
  units: BattleUnit[];
  formation: number;
  combinedType?: number;
};

export type BattleContext = {
  endpoint: BattleEndpointKind;
  mode: BattleMode;
  seed: number;
  rng: BattleRng;
  formation: [number, number, number];
  fleets: BattleFleet[];
};

export type BattlePhaseResult = {
  name: "airBase" | "kouku" | "kouku2" | "openingTaisen" | "openingAtack" | "shelling" | "raigeki" | "night";
  payload: KoukuPayload | HougekiPayload | RaigekiPayload | Record<string, unknown> | null;
};

export type Side = 0 | 1;

export type BattleSortieContext = SelectedSortieEncounter & {
  seed: number;
};

export type PracticeResultContext = {
  playerLevel: number;
  enemyLevel: number;
  enemyShipLevels: number[];
  seed: number;
};

export type AirSlot = {
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

export type EquippedSlot = {
  index: number;
  slotItemId: number;
  slotMaster: (typeof masterData.api_mst_slotitem)[number];
  count: number;
  maxCount: number;
  improvement: number;
  proficiency: number;
};

export type BattleUnit = {
  side: Side;
  position: number;
  apiIndex: number;
  shipId: number;
  masterId: number;
  level: number;
  hp: number;
  hpFloor: number;
  maxHp: number;
  firepower: number;
  baseTorpedo: number;
  torpedo: number;
  aa: number;
  baseAsw: number;
  asw: number;
  armor: number;
  luck: number;
  accuracy: number;
  evasion: number;
  range: number;
  ammoModifier: number;
  shipType: number;
  targetKind: EnemyTargetKind;
  slots: number[];
  equippedSlots: EquippedSlot[];
  airSlots: AirSlot[];
  onSlot: number[];
  originalOnSlot: number[];
  damageDealt: number;
};

export type BattleUnitSlotSnapshot = {
  index: number;
  slotItemId: number;
  slotMasterId: number;
  count: number;
  maxCount: number;
  improvement: number;
  proficiency: number;
};

export type BattleUnitSnapshot = {
  side: Side;
  position: number;
  shipId: number;
  masterId: number;
  level: number;
  hpFloor: number;
  maxHp: number;
  firepower: number;
  baseTorpedo: number;
  torpedo: number;
  aa: number;
  baseAsw: number;
  asw: number;
  armor: number;
  luck: number;
  accuracy?: number;
  evasion?: number;
  range: number;
  ammoModifier: number;
  shipType: number;
  targetKind?: EnemyTargetKind;
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
  api_formation: number[];
  api_ship_ke: number[];
  api_stage_flag: [number, number, number];
  api_kouku: KoukuPayload | null;
  api_hougeki1: HougekiPayload;
  api_raigeki: RaigekiPayload | null;
};

export type BattleRecord = {
  endpoint: BattleEndpointKind;
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
    airBaseAttack: Record<string, unknown> | null;
    kouku: KoukuPayload | null;
    kouku2: KoukuPayload | null;
    openingTaisen: HougekiPayload | null;
    openingAtack: RaigekiPayload | null;
    hougeki1: HougekiPayload;
    hougeki2: HougekiPayload | null;
    hougeki3: HougekiPayload | null;
    raigeki: RaigekiPayload | null;
    night?: HougekiPayload;
    friendlyKouku?: KoukuPayload | null;
    friendlyBattle?: HougekiPayload | null;
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
  rank: "S" | "A" | "B" | "C" | "D" | "E";
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

export type DamageInput = {
  attackPower: number;
  armor: number;
  armorRoll: number;
  ammoModifier: number;
  targetHp?: number;
};

export type ShellingAttackProfile = {
  preCapPower: number;
  cap: number;
  atType: number;
  spType: number;
  hits: number;
  postCapModifier: number;
  slotIds: number[];
};
