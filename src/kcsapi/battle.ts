import { masterData } from "../master/data.js";
import { enemyTargetKind, shipTargetKind } from "../master/enemy-classification.js";
import {
  DEEP_SEA_SLOT_MASTERS,
  ENEMY_UNIT_TEMPLATES,
  fallbackEnemyShipIds,
  selectSortieDrop,
  selectSortieEncounter,
  type SortieBattleRank
} from "../master/sortie-data.js";
import {
  selectEventSortieDrop,
  selectEventSortieEncounter
} from "../master/event-data.js";
import { normalizeDeckShipIds } from "../state/decks.js";
import type { SaveState, Ship, SlotItem } from "../state/types.js";
import { aaciPattern, selectGenericAaci, type AaciEquipmentSummary } from "./battle/aaci.js";
import { battleEndpointModeByKind } from "./battle/data/endpoint-modes.js";
import { proficiencyExpForVisible } from "./aircraft-proficiency.js";
import type {
  AirSlot,
  AirBaseAircraftLossRecord,
  BattleEndpointKind,
  BattleFleetKind,
  BattleInput,
  BattleMode,
  BattlePayload,
  BattleRecord,
  BattleResultRecord,
  BattleSettlementRecord,
  BattleSortieContext,
  BattleUnit,
  BattleUnitSnapshot,
  DamageInput,
  EquippedSlot,
  FleetSettlementSlot,
  HougekiPayload,
  KoukuPayload,
  KoukuStage3Payload,
  PracticeResultContext,
  RaigekiPayload,
  ShellingAttackProfile,
  Side
} from "./battle/types.js";
import { isAircraftSlotItem } from "./serializers.js";
import { supportExpeditionForSortie } from "./expedition.js";
import {
  antiAirStage2Shootdown,
  aswAttackPower as resolveAswAttackPower,
  BattleRng,
  airState as resolveAirState,
  accuracyChance,
  canOpeningAswByStats,
  carrierNightAirAttackPower,
  classifyNightAttack,
  classifyCarrierNightCutIn,
  criticalChance,
  combinedAccuracyModifierFor,
  combinedFormationModifierFor,
  combinedPowerBonusFor,
  type CombinedFormulaFleetKind,
  type CombinedFormulaFleetType,
  damageStateModifierFor,
  engagementModifierFor,
  fighterPower,
  formationModifierFor,
  nightBattlePower,
  nightCutInActivationChance,
  resolveBattleDamage
} from "./battle-formulas.js";
import { normalizeCombinedFormation } from "./combined-fleet.js";
import {
  generatePracticeBatch,
  practiceBaseShipExp,
  practiceMemberExp,
  practiceRivalById,
  practiceSeededBonus,
  type PracticeRival,
  type PracticeRivalShip
} from "./practice.js";

export type {
  AirSlot,
  BattleContext,
  BattleEndpointKind,
  BattleFleet,
  BattleFleetKind,
  BattleInput,
  BattleMode,
  BattlePayload,
  BattlePhaseResult,
  BattleRecord,
  BattleResultRecord,
  BattleSettlementRecord,
  BattleUnit,
  BattleUnitSnapshot,
  FleetSettlementSlot,
  HougekiPayload,
  KoukuPayload,
  KoukuStage3Payload,
  RaigekiPayload,
  Side
} from "./battle/types.js";

const FIGHTER_COMBAT_TYPES = new Set([6, 7, 8, 11, 45, 47, 48, 56, 57, 58, 60]);
const OPENING_AIRSTRIKE_TYPES = new Set([7, 8, 11, 47, 57]);
const TORPEDO_BOMBER_TYPES = new Set([8, 47]);
const CONTACT_TYPES = new Set([8, 9, 10]);
const CARRIER_TYPES = new Set([7, 11, 18]);
const CARRIER_NIGHT_AIR_ATTACK_NATIVE_SHIP_IDS = new Set([545, 599, 610, 883, 1008]);
const STANDARD_CARRIER_NIGHT_SHELLING_SHIP_IDS = new Set([433, 353, 432, 529, 536, 646, 735, 889, 966, 1025, 1030]);
const ARK_ROYAL_SHIP_IDS = new Set([393, 515]);
const NIGHT_OPERATION_PERSONNEL_IDS = new Set([258, 259]);
const SWORDFISH_IDS = new Set([242, 243, 244]);
const SPECIAL_CARRIER_NIGHT_AIRCRAFT_IDS = new Set([154, 242, 243, 244, 320]);
const NIGHT_FIGHTER_DETAIL_TYPE = 45;
const NIGHT_TORPEDO_BOMBER_DETAIL_TYPE = 46;
const NIGHT_DIVE_BOMBER_DETAIL_TYPE = 58;
const NIGHT_RECON_DETAIL_TYPE = 50;
const BATTLESHIP_TYPES = new Set([8, 9, 10, 12]);
const SUBMARINE_TYPES = new Set([13, 14]);
const OPENING_TORPEDO_SHIP_TYPES = new Set([4, 13, 14]);
const MAIN_GUN_TYPES = new Set([1, 2, 3]);
const SECONDARY_GUN_TYPES = new Set([4]);
const TORPEDO_TYPES = new Set([5, 32]);
const MIDGET_SUBMARINE_TYPES = new Set([22]);
const SEAPLANE_TYPES = new Set([10, 11]);
const SONAR_TYPES = new Set([14]);
const DEPTH_CHARGE_TYPES = new Set([15, 40]);
const ASW_AIRCRAFT_TYPES = new Set([7, 8, 11, 25, 26]);
const AUTOGYRO_TYPES = new Set([25]);
const ASW_DAMAGE_EQUIP_TYPES = new Set([...SONAR_TYPES, ...DEPTH_CHARGE_TYPES, ...ASW_AIRCRAFT_TYPES]);
const SEARCHLIGHT_TYPES = new Set([29, 42]);
const STAR_SHELL_TYPES = new Set([33]);
const AP_SHELL_TYPE = 19;
const HIGH_ANGLE_GUN_TYPES = new Set([16]);
const AA_GUN_TYPES = new Set([21]);
const RADAR_TYPES = new Set([12, 13]);
const AIR_BASE_ATTACK_ACTIONS = new Set([1, 2]);
const SLOT_MASTER_BY_ID = new Map<number, (typeof masterData.api_mst_slotitem)[number]>(
  [...masterData.api_mst_slotitem, ...DEEP_SEA_SLOT_MASTERS].map((slot) => [slot.api_id, slot] as const)
);

type NightEquipmentState = {
  searchlight: boolean;
  starShell: boolean;
  nightContactBonus: number;
  nightContactPlaneId: number;
};

type NightEquipmentPair = {
  friendly: NightEquipmentState;
  enemy: NightEquipmentState;
};

type DayShellingAirControl = {
  friendlySpotting: boolean;
  enemySpotting: boolean;
};

const NO_DAY_SHELLING_AIR_CONTROL: DayShellingAirControl = {
  friendlySpotting: false,
  enemySpotting: false
};

type SideFormations = {
  friendly: number;
  enemy: number;
};

type BattleFormulaContext = {
  combinedType?: CombinedFormulaFleetType;
  defenderCombined?: boolean;
};

const NO_BATTLE_FORMULA_CONTEXT: BattleFormulaContext = {};

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
  const endpoint = input.endpoint ?? "sortieDay";
  const phaseSet = battlePhaseSet(endpoint);
  const friendly = friendlyUnits(save, deck.shipIds);
  const sortie = sortieBattleContext(save, seed);
  const formation: [number, number, number] = [friendlyFormation, sortie?.formation ?? 1, battleEngagement(input)];
  const formations = sideFormations(formation);
  const enemy = enemyUnits(sortie?.shipIds ?? fallbackEnemyShipIds(save.sortieSession?.node ?? 1));
  const beforeF = fixedHp(friendly);
  const beforeE = fixedHp(enemy);

  const support = hasBattlePhase(phaseSet, "support") ? supportPhase(save, sortie, enemy) : undefined;
  const airBase = hasBattlePhase(phaseSet, "airBase") ? airBaseAttackPhase(save, enemy, formations, rng) : { payload: null, losses: [] };
  const airBaseAttack = airBase.payload;
  const kouku = hasBattlePhase(phaseSet, "kouku") ? airPhase(friendly, enemy, formations, rng) : null;
  const dayAirControl = dayShellingAirControl(kouku);
  const openingTaisen = hasBattlePhase(phaseSet, "openingTaisen") ? openingAswPhase(friendly, enemy, formation[0], rng) : null;
  const openingAtack = hasBattlePhase(phaseSet, "openingAtack") ? openingTorpedoPhase(friendly, enemy, formations, rng) : null;
  const hougeki1 = hasBattlePhase(phaseSet, "hougeki1") ? shellingPhase(friendly, enemy, formations, rng, "day", formation[2], dayAirControl) : emptyHougeki(false);
  const hougeki2 = hasBattlePhase(phaseSet, "hougeki2") && hasSecondShellingRound(friendly, enemy)
    ? shellingPhase(friendly, enemy, formations, rng, "day", formation[2], dayAirControl)
    : null;
  const raigeki = hasBattlePhase(phaseSet, "raigeki") ? torpedoPhase(friendly, enemy, formations, rng) : null;

  const afterF = fixedHp(friendly);
  const afterE = fixedHp(enemy);
  const result = battleResult(friendly, enemy, "sortie", sortie);
  const record: BattleRecord = {
    endpoint,
    mode: "sortie",
    deckId: deck.id,
    shipIds: fixedShipIds(deck.shipIds),
    shipMasterIds: fixedShipMasterIds(save, deck.shipIds),
    enemyIds: fixedEnemyIds(enemy),
    formation,
    before: { fNowHps: beforeF, eNowHps: beforeE },
    after: { fNowHps: afterF, eNowHps: afterE, fOnSlotByShipId: onSlotByShipId(friendly) },
    phases: {
      airBaseAttack,
      kouku,
      kouku2: null,
      openingTaisen,
      openingAtack,
      hougeki1,
      hougeki2,
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
    support,
    airBaseAircraftLosses: airBase.losses
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
  const formation: [number, number, number] = [battleFormation(input), 1, battleEngagement(input)];
  const formations = sideFormations(formation);
  const seed = practiceBattleSeed(rival, formation[0]);
  const rng = new BattleRng(seed);
  const friendly = friendlyUnits(save, deck.shipIds);
  for (const unit of friendly) unit.hpFloor = 1;
  const enemy = rival.ships.map((ship, index) => practiceEnemyUnit(ship, index + 1));
  const beforeF = fixedHp(friendly);
  const beforeE = fixedHp(enemy);

  const kouku = airPhase(friendly, enemy, formations, rng);
  const dayAirControl = dayShellingAirControl(kouku);
  const openingTaisen = openingAswPhase(friendly, enemy, formation[0], rng);
  const openingAtack = openingTorpedoPhase(friendly, enemy, formations, rng);
  const hougeki1 = shellingPhase(friendly, enemy, formations, rng, "day", formation[2], dayAirControl);
  const hougeki2 = hasSecondShellingRound(friendly, enemy) ? shellingPhase(friendly, enemy, formations, rng, "day", formation[2], dayAirControl) : null;
  const raigeki = torpedoPhase(friendly, enemy, formations, rng);
  const afterF = fixedHp(friendly);
  const afterE = fixedHp(enemy);
  const result = battleResult(friendly, enemy, "practice", undefined, {
    playerLevel: save.player.level,
    enemyLevel: rival.level,
    enemyShipLevels: rival.ships.map((ship) => ship.level),
    seed
  });
  const record: BattleRecord = {
    endpoint: input.endpoint ?? "practiceDay",
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
      airBaseAttack: null,
      kouku,
      kouku2: null,
      openingTaisen,
      openingAtack,
      hougeki1,
      hougeki2,
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
  const friendly = markFleetKind(friendlyUnits(save, deck.shipIds), "main");
  const escort = markFleetKind(friendlyUnits(save, escortDeck.shipIds), "escort");
  const combinedType = combinedFleetTypeForBattle(save.player.combinedFleet);
  const friendlyFormation = normalizeCombinedFormation(battleFormation(input), escort.length);
  const seed = (save.sortieSession?.seed ?? 1) + 424242 + friendlyFormation * 101;
  const rng = new BattleRng(seed);
  const endpoint = input.endpoint ?? "combinedDay";
  const phaseSet = battlePhaseSet(endpoint);
  const sortie = sortieBattleContext(save, seed);
  const formation: [number, number, number] = [friendlyFormation, sortie?.formation ?? 1, battleEngagement(input)];
  const formations = sideFormations(formation);
  const enemy = markFleetKind(enemyUnits(sortie?.shipIds ?? fallbackEnemyShipIds(save.sortieSession?.node ?? 1)), "enemyMain");
  const enemyCombined = markFleetKind(enemyUnits(sortie?.enemyCombinedShipIds ?? []), "enemyEscort");
  const beforeF = fixedHp(friendly);
  const beforeEscort = fixedHp(escort);
  const beforeE = fixedHp(enemy);
  const beforeECombined = fixedHp(enemyCombined);

  const support = hasBattlePhase(phaseSet, "support") ? supportPhase(save, sortie, enemy) : undefined;
  const enemyCombinedActive = isEnemyCombinedActive(endpoint) && enemyCombined.length > 0;
  const formulaContext = combinedFormulaContext(combinedType, enemyCombinedActive);
  const escortTargets = enemyCombinedActive ? enemyCombined : enemy;
  const torpedoTargets = enemyCombinedActive ? [...enemy, ...enemyCombined] : enemy;
  const airFriendly = enemyCombinedActive ? [...friendly, ...escort] : friendly;
  const airEnemy = enemyCombinedActive ? [...enemy, ...enemyCombined] : enemy;
  const airBase = hasBattlePhase(phaseSet, "airBase") ? airBaseAttackPhase(save, enemy, formations, rng) : { payload: null, losses: [] };
  const airBaseAttack = airBase.payload;
  const kouku = hasBattlePhase(phaseSet, "kouku") ? airPhase(airFriendly, airEnemy, formations, rng, formulaContext) : null;
  const dayAirControl = dayShellingAirControl(kouku);
  const openingTaisen = hasBattlePhase(phaseSet, "openingTaisen") ? openingAswPhase(escort, escortTargets, formation[0], rng, formulaContext) : null;
  const openingAtack = hasBattlePhase(phaseSet, "openingAtack") ? openingTorpedoPhase(escort, escortTargets, formations, rng, formulaContext) : null;
  const shelling = hasBattlePhase(phaseSet, "hougeki1")
    ? combinedShellingPhases(combinedType, friendly, escort, enemy, formations, rng, formation[2], escortTargets, phaseSet, dayAirControl, formulaContext)
    : { hougeki1: emptyHougeki(false), hougeki2: null, hougeki3: null };
  const raigeki = hasBattlePhase(phaseSet, "raigeki") ? torpedoPhase(escort, torpedoTargets, formations, rng, canClosingTorpedo, formulaContext) : null;
  const afterF = fixedHp(friendly);
  const afterEscort = fixedHp(escort);
  const afterE = fixedHp(enemy);
  const afterECombined = fixedHp(enemyCombined);
  const result = battleResult(friendly, enemy, "combined", sortie);
  result.mvpCombined = escortMvp(escort);
  const record: BattleRecord = {
    endpoint,
    mode: "combined",
    combinedType,
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
      airBaseAttack,
      kouku,
      kouku2: null,
      openingTaisen,
      openingAtack,
      hougeki1: shelling.hougeki1,
      hougeki2: shelling.hougeki2,
      hougeki3: shelling.hougeki3,
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
    aircraftLosses: aircraftLosses([...friendly, ...escort], airEnemy),
    support,
    airBaseAircraftLosses: airBase.losses
  };

  return {
    payload: combinedBattlePayload(record, friendly, escort, enemy, enemyCombined),
    record
  };
}

export function createNightBattle(record: BattleRecord): { payload: Record<string, unknown>; record: BattleRecord } {
  const mainFriendly = recordUnitsFrom(record, 0);
  const friendly = record.mode === "combined" ? recordEscortUnitsFrom(record) : mainFriendly;
  const mainEnemy = recordUnitsFrom(record, 1);
  const enemyCombined = record.mode === "combined" ? recordEnemyCombinedUnitsFrom(record) : [];
  const nightTarget = record.mode === "combined" && shouldNightTargetEnemyEscort(enemyCombined) ? enemyCombined : mainEnemy;
  const fNowHps = fixedHp(record.mode === "combined" ? mainFriendly : friendly);
  const eNowHps = fixedHp(mainEnemy);
  const fMaxHps = fixedMaxHp(record.mode === "combined" ? mainFriendly : friendly);
  const eMaxHps = fixedMaxHp(mainEnemy);
  const rng = new BattleRng(record.deckId * 8191 + record.before.fNowHps.reduce((sum, hp) => sum + hp, 0));
  const formulaContext = record.mode === "combined"
    ? combinedFormulaContext(combinedFleetTypeForBattle(record.combinedType ?? 1), enemyCombined.length > 0)
    : NO_BATTLE_FORMULA_CONTEXT;
  const nightEquipment = {
    friendly: nightEquipmentState(friendly, rng, nightContactAllowed(record)),
    enemy: nightEquipmentState(nightTarget, rng, nightContactAllowed(record))
  };
  const hougeki = shellingPhase(friendly, nightTarget, sideFormations(record.formation), rng, "night", record.formation[2], NO_DAY_SHELLING_AIR_CONTROL, nightEquipment, formulaContext);
  const nextRecord: BattleRecord = {
    ...record,
    after: {
      ...record.after,
      fNowHps: record.mode === "combined" ? fixedHp(mainFriendly) : fixedHp(friendly),
      eNowHps: nightTarget === mainEnemy ? fixedHp(mainEnemy) : record.after.eNowHps,
      ...(nightTarget === enemyCombined ? { eCombinedNowHps: fixedHp(enemyCombined) } : {}),
      ...(record.mode === "combined" ? { fCombinedNowHps: fixedHp(friendly) } : {})
    },
    phases: {
      ...record.phases,
      night: hougeki
    },
    result: {
      ...battleResult(record.mode === "combined" ? mainFriendly : friendly, mainEnemy, record.mode, record.sortie, practiceResultContext(record, mainEnemy)),
      mvpCombined: record.mode === "combined" ? escortMvp(friendly) : record.result.mvpCombined
    }
  };
  const payload: Record<string, unknown> = {
    api_deck_id: record.deckId,
    api_formation: record.formation,
    api_ship_ke: fixedEnemyIds(mainEnemy),
    api_ship_lv: fixedUnitValues(mainEnemy, (unit) => unit.level, 0),
    api_f_nowhps: fNowHps,
    api_f_maxhps: fMaxHps,
    api_e_nowhps: eNowHps,
    api_e_maxhps: eMaxHps,
    api_nowhps: [-1, ...fNowHps, ...eNowHps],
    api_maxhps: [-1, ...fMaxHps, ...eMaxHps],
    api_eSlot: fixedUnitValues(mainEnemy, (unit) => fixedSlotIds(unit.slots), []),
    api_fParam: fixedUnitValues(record.mode === "combined" ? mainFriendly : friendly, (unit) => [unit.firepower, unit.torpedo, unit.aa, unit.armor], [0, 0, 0, 0]),
    api_eParam: fixedUnitValues(mainEnemy, (unit) => [unit.firepower, unit.torpedo, unit.aa, unit.armor], [0, 0, 0, 0]),
    api_touch_plane: [nightEquipment.friendly.nightContactPlaneId, nightEquipment.enemy.nightContactPlaneId],
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

function isEnemyCombinedActive(endpoint: BattleEndpointKind | undefined) {
  return endpoint === "combinedEcBattle" || endpoint === "combinedEcNight" || endpoint === "combinedEcNightToDay";
}

function battlePhaseSet(endpoint: BattleEndpointKind) {
  const mode = battleEndpointModeByKind(endpoint);
  const defaultSequence = endpoint.startsWith("combined")
    ? ["support", "kouku", "openingTaisen", "openingAtack", "hougeki1", "hougeki2", "hougeki3", "raigeki"]
    : ["support", "kouku", "openingTaisen", "openingAtack", "hougeki1", "hougeki2", "raigeki"];
  return new Set(mode?.phaseSequence ?? defaultSequence);
}

function hasBattlePhase(phaseSet: Set<string>, phase: string) {
  return phaseSet.has(phase);
}

function sideFormations(formation: [number, number, number]): SideFormations {
  return {
    friendly: formation[0],
    enemy: formation[1]
  };
}

function formationForSide(formations: SideFormations, side: Side) {
  return side === 0 ? formations.friendly : formations.enemy;
}

function emptyAirBaseAttack(): Record<string, unknown> {
  return {
    api_stage_flag: [0, 0, 0],
    api_plane_from: [[], []],
    api_stage1: null,
    api_stage2: null,
    api_stage3: emptyKoukuStage3Payload()
  };
}

type AirBaseBattleSlot = AirSlot & {
  areaId: number;
  baseId: number;
  squadronId: number;
  previousExp: number;
  previousCount: number;
};

function airBaseAttackPhase(save: SaveState, enemy: BattleUnit[], formations: SideFormations, rng: BattleRng): {
  payload: Record<string, unknown>;
  losses: AirBaseAircraftLossRecord[];
} {
  const activeSlots: AirBaseBattleSlot[] = [];
  const units = save.airBases
    .filter((base) => AIR_BASE_ATTACK_ACTIONS.has(base.actionKind))
    .map((base): BattleUnit | null => {
      const slots = base.squadrons
        .map((squadron): AirBaseBattleSlot | null => {
          if (squadron.slotItemId <= 0 || squadron.count <= 0) return null;
          const item = save.slotItems.find((slotItem) => slotItem.id === squadron.slotItemId);
          const slotMaster = item ? slotMasterById(item.masterId) : undefined;
          if (!item || !slotMaster || !isAircraftSlotItem(slotMaster)) return null;
          return {
            areaId: base.areaId,
            baseId: base.baseId,
            squadronId: squadron.squadronId,
            previousExp: item.proficiencyExp,
            previousCount: Math.max(0, Math.trunc(squadron.count)),
            shipPosition: base.baseId,
            slotIndex: squadron.squadronId - 1,
            slotItemId: item.id,
            slotMasterId: slotMaster.api_id,
            equipTypeId: safeNum(slotMaster.api_type?.[2]),
            slotMaster,
            count: Math.max(0, Math.trunc(squadron.count)),
            maxCount: Math.max(0, Math.trunc(squadron.maxCount)),
            improvement: item.level,
            proficiency: item.proficiencyExp
          };
        })
        .filter((slot): slot is AirBaseBattleSlot => slot != null);
      if (slots.length === 0) return null;
      activeSlots.push(...slots);
      return airBaseBattleUnit(base.baseId, slots);
    })
    .filter((unit): unit is BattleUnit => unit != null);

  if (units.length === 0) return { payload: emptyAirBaseAttack(), losses: [] };
  const kouku = airPhase(units, enemy, formations, rng);
  if (!kouku) return { payload: emptyAirBaseAttack(), losses: airBaseLossRecords(activeSlots) };
  const payload = {
    api_stage_flag: [
      kouku.api_stage1 ? 1 : 0,
      kouku.api_stage2 ? 1 : 0,
      kouku.api_stage3 ? 1 : 0
    ],
    api_plane_from: kouku.api_plane_from,
    api_stage1: kouku.api_stage1,
    api_stage2: kouku.api_stage2,
    api_stage3: kouku.api_stage3 ?? emptyKoukuStage3Payload(),
    ...(kouku.api_air_fire ? { api_air_fire: kouku.api_air_fire } : {})
  };
  return { payload, losses: airBaseLossRecords(activeSlots) };
}

function airBaseBattleUnit(baseId: number, slots: AirBaseBattleSlot[]): BattleUnit {
  return {
    side: 0,
    position: baseId,
    apiIndex: baseId - 1,
    shipId: -1000 - baseId,
    masterId: 0,
    level: 1,
    hp: 1,
    hpFloor: 0,
    maxHp: 1,
    baseFirepower: 0,
    firepower: 0,
    baseTorpedo: 0,
    torpedo: 0,
    aa: slots.reduce((sum, slot) => sum + safeNum(slot.slotMaster.api_tyku), 0),
    baseAsw: 0,
    asw: 0,
    armor: 0,
    luck: 0,
    accuracy: 0,
    evasion: 0,
    range: 0,
    ammoModifier: 1,
    shipType: 0,
    targetKind: "surface",
    slots: slots.map((slot) => slot.slotMasterId),
    equippedSlots: [],
    airSlots: slots,
    onSlot: slots.map((slot) => slot.count),
    originalOnSlot: slots.map((slot) => slot.count),
    damageDealt: 0
  };
}

function airBaseLossRecords(slots: AirBaseBattleSlot[]): AirBaseAircraftLossRecord[] {
  return slots.map((slot) => ({
    areaId: slot.areaId,
    baseId: slot.baseId,
    squadronId: slot.squadronId,
    slotItemId: slot.slotItemId,
    slotMasterId: slot.slotMasterId,
    previousExp: slot.previousExp,
    previousCount: slot.previousCount,
    currentCount: Math.max(0, Math.trunc(slot.count))
  }));
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
    api_midnight_flag: enemy.some(isOperable) ? 1 : 0,
    api_eSlot: fixedUnitValues(enemy, (unit) => fixedSlotIds(unit.slots), []),
    api_fParam: fixedUnitValues(friendly, (unit) => [unit.firepower, unit.torpedo, unit.aa, unit.armor], [0, 0, 0, 0]),
    api_eParam: fixedUnitValues(enemy, (unit) => [unit.firepower, unit.torpedo, unit.aa, unit.armor], [0, 0, 0, 0]),
    api_search: [1, 1],
    api_stage_flag: stageFlag,
    api_air_base_attack: record.phases.airBaseAttack ?? null,
    api_kouku: kouku,
    api_kouku2: record.phases.kouku2 ?? null,
    api_support_flag: record.support?.arrived ? record.support.flag : 0,
    api_support_info: record.support?.arrived ? record.support.info : null,
    api_opening_taisen: record.phases.openingTaisen ?? null,
    api_opening_atack: record.phases.openingAtack ?? null,
    api_hougeki1: record.phases.hougeki1,
    api_hougeki2: record.phases.hougeki2,
    api_hougeki3: record.phases.hougeki3,
    api_raigeki: record.phases.raigeki,
    api_friendly_info: null,
    api_friendly_kouku: record.phases.friendlyKouku ?? null,
    api_friendly_battle: record.phases.friendlyBattle ?? null
  };
}

function combinedBattlePayload(
  record: BattleRecord,
  friendly: BattleUnit[],
  escort: BattleUnit[],
  enemy: BattleUnit[],
  enemyCombined: BattleUnit[]
): BattlePayload {
  const payload = battlePayload(record, friendly, enemy);
  const kouku = payload.api_kouku && payload.api_kouku.api_stage3
    ? {
        ...payload.api_kouku,
        api_stage3_combined: payload.api_kouku.api_stage3_combined ?? emptyKoukuStage3Payload()
      }
    : payload.api_kouku;
  const fCombinedMaxHps = fixedMaxHp(escort);
  const eCombinedMaxHps = fixedMaxHp(enemyCombined);
  return {
    ...payload,
    api_kouku: kouku,
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
  const enemyCombined = recordEnemyCombinedUnitsFrom(record);
  const fNowHps = normalizeFixed(record.after.fCombinedNowHps ?? record.before.fCombinedNowHps ?? [], 6, 0);
  const eNowHps = normalizeFixed(record.after.eCombinedNowHps ?? record.before.eCombinedNowHps ?? [], 6, 0);
  const fMaxHps = fixedMaxHpFromMasters(record.escortShipMasterIds ?? [], fNowHps);
  const eMaxHps = fixedMaxHp(enemyCombined);
  return {
    api_f_nowhps_combined: fNowHps,
    api_f_maxhps_combined: fMaxHps,
    api_e_nowhps_combined: eNowHps,
    api_e_maxhps_combined: eMaxHps,
    api_nowhps_combined: [-1, ...fNowHps, ...eNowHps],
    api_maxhps_combined: [-1, ...fMaxHps, ...eMaxHps],
    api_ship_ke_combined: fixedEnemyIds(enemyCombined),
    api_ship_lv_combined: fixedUnitValues(enemyCombined, (unit) => unit.level, 0),
    api_fParam_combined: fixedParamsFromMasters(record.escortShipMasterIds ?? []),
    api_eParam_combined: fixedUnitValues(enemyCombined, (unit) => [unit.firepower, unit.torpedo, unit.aa, unit.armor], [0, 0, 0, 0]),
    api_eSlot_combined: fixedUnitValues(enemyCombined, (unit) => fixedSlotIds(unit.slots), [])
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

function airPhase(
  friendly: BattleUnit[],
  enemy: BattleUnit[],
  formations: SideFormations,
  rng: BattleRng,
  formulaContext: BattleFormulaContext = NO_BATTLE_FORMULA_CONTEXT
): KoukuPayload | null {
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
  const friendlyInterception = hasOpeningAirstrikeSlots(friendlyCombatAir) && enemy.some(isOperable);
  const enemyInterception = hasOpeningAirstrikeSlots(enemyCombatAir) && friendly.some(isOperable);
  const hasStage2 = friendlyInterception || enemyInterception;
  const airFire = enemyInterception ? antiAirCutIn(friendly, rng) : undefined;
  const fStage2Lost = friendlyInterception ? applyStage2Loss(friendlyCombatAir, enemy, formations.enemy, undefined, rng, NO_BATTLE_FORMULA_CONTEXT) : 0;
  const eStage2Lost = enemyInterception ? applyStage2Loss(enemyCombatAir, friendly, formations.friendly, airFire, rng, formulaContext) : 0;
  const hasStage3 =
    (hasOpeningAirstrikeSlots(friendlyCombatAir) && enemy.some(isOperable)) ||
    (hasOpeningAirstrikeSlots(enemyCombatAir) && friendly.some(isOperable));
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

function dayShellingAirControl(kouku: KoukuPayload | null): DayShellingAirControl {
  const airState = kouku?.api_stage1.api_disp_seiku ?? 0;
  return {
    friendlySpotting: airState === 1 || airState === 2,
    enemySpotting: airState === 4 || airState === 5
  };
}

function daySpottingEligible(
  attacker: BattleUnit,
  phase: "day" | "night",
  airControl: DayShellingAirControl
) {
  if (phase !== "day") return false;
  return attacker.side === 0 ? airControl.friendlySpotting : airControl.enemySpotting;
}

function activeAirSlots(units: BattleUnit[]) {
  return units
    .filter(isOperable)
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
      improvement: slot.improvement,
      slotMaster: slot.slotMaster
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
    .filter(isOperable)
    .map((unit) => {
      const candidate = selectGenericAaci(unit.position - 1, aaciEquipmentSummary(unit));
      return candidate ? { unit, candidate } : null;
    })
    .filter((item): item is NonNullable<typeof item> => item != null);
  if (candidates.length === 0) return undefined;
  const selected = candidates[0];
  if (!rng.chance(selected.candidate.activationRate)) return undefined;
  return {
    api_idx: selected.candidate.unitIndex,
    api_kind: selected.candidate.kind,
    api_use_items: selected.candidate.useItems
  };
}

function aaciEquipmentSummary(unit: BattleUnit): AaciEquipmentSummary {
  const summary: AaciEquipmentSummary = {
    highAngleGuns: [],
    aaGuns: [],
    radars: []
  };
  for (const slot of unit.equippedSlots) {
    const type2 = safeNum(slot.slotMaster.api_type?.[2]);
    const type3 = safeNum(slot.slotMaster.api_type?.[3]);
    if (HIGH_ANGLE_GUN_TYPES.has(type3)) summary.highAngleGuns.push(slot.slotMaster.api_id);
    if (AA_GUN_TYPES.has(type2)) summary.aaGuns.push(slot.slotMaster.api_id);
    if (RADAR_TYPES.has(type2)) summary.radars.push(slot.slotMaster.api_id);
  }
  return summary;
}

function applyStage2Loss(
  attackingSlots: AirSlot[],
  defenders: BattleUnit[],
  formation: number,
  airFire: KoukuPayload["api_air_fire"] | undefined,
  rng: BattleRng,
  formulaContext: BattleFormulaContext = NO_BATTLE_FORMULA_CONTEXT
) {
  const attackSlots = attackingSlots.filter((slot) => slot.count > 0 && OPENING_AIRSTRIKE_TYPES.has(slot.equipTypeId));
  const livingDefenders = defenders.filter(isOperable);
  if (attackSlots.length === 0 || livingDefenders.length === 0) return 0;
  const fleetAa = livingDefenders.reduce((sum, unit) => sum + unit.aa, 0);
  const aaMod = formationAaModifier(formation, formulaContext);
  const cutIn = antiAirCutInEffect(airFire);
  let lost = 0;
  for (const slot of attackSlots) {
    const defender = rng.pick(livingDefenders);
    const count = antiAirStage2Shootdown({
      slotCount: slot.count,
      defenderAntiAir: defender.aa,
      fleetAntiAir: fleetAa,
      formationModifier: aaMod,
      cutInFixedBonus: cutIn.fixedBonus,
      cutInModifier: cutIn.modifier,
      randomFactor: rng.next()
    });
    slot.count -= count;
    lost += count;
  }
  return lost;
}

function antiAirCutInEffect(airFire: KoukuPayload["api_air_fire"] | undefined) {
  const pattern = airFire ? aaciPattern(airFire.api_kind) : null;
  return pattern ? { fixedBonus: pattern.fixedBonus, modifier: pattern.modifier } : { fixedBonus: 0, modifier: 1 };
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
  if (!isOperable(attacker)) return;
  for (const slot of attacker.airSlots.filter((item) => item.count > 0 && OPENING_AIRSTRIKE_TYPES.has(item.equipTypeId))) {
    const target = randomAlive(targets, rng);
    if (!target) return;
    const hit = rng.chance(0.95);
    const critical = hit && rng.chance(0.125);
    const damage = hit ? airstrikeDamage(slot, target, attacker.ammoModifier, contactModifier(touchPlane, slot), critical, rng) : 0;
    if (damage > 0) {
      target.hp = Math.max(target.hpFloor, target.hp - damage);
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
    targetSide: target.hpFloor > 0 ? 0 : target.side
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

function nightEquipmentState(units: BattleUnit[], rng: BattleRng, nightContactAllowedFlag: boolean): NightEquipmentState {
  const contact = nightContactState(units, rng, nightContactAllowedFlag);
  return {
    searchlight: units.some((unit) => isOperable(unit) && countEquipTypes(unit, SEARCHLIGHT_TYPES) > 0),
    starShell: units.some((unit) => isOperable(unit) && countEquipTypes(unit, STAR_SHELL_TYPES) > 0),
    nightContactBonus: contact.bonus,
    nightContactPlaneId: contact.planeId
  };
}

function nightContactAllowed(record: BattleRecord) {
  const airState = record.phases.kouku?.api_stage1.api_disp_seiku;
  return airState == null || airState === 1 || airState === 2 || airState === 4;
}

function nightContactState(units: BattleUnit[], rng: BattleRng, allowed: boolean) {
  if (!allowed) return { bonus: 0, planeId: -1 };
  const candidates = units
    .filter(isOperable)
    .flatMap((unit) =>
      unit.equippedSlots
        .filter((slot) => slot.count > 0 && safeNum(slot.slotMaster.api_type?.[3]) === NIGHT_RECON_DETAIL_TYPE)
        .map((slot) => ({ unit, slot }))
    )
    .sort((a, b) =>
      nightContactBonusFor(b.slot.slotMaster) - nightContactBonusFor(a.slot.slotMaster) ||
      safeNum(b.slot.slotMaster.api_saku) - safeNum(a.slot.slotMaster.api_saku) ||
      b.slot.slotMaster.api_id - a.slot.slotMaster.api_id
    );
  for (const candidate of candidates) {
    const los = Math.max(0, safeNum(candidate.slot.slotMaster.api_saku));
    const level = Math.max(1, candidate.unit.level);
    const chance = Math.min(0.95, Math.floor(Math.sqrt(los) * Math.sqrt(level)) * 0.04);
    if (rng.chance(chance)) {
      return {
        bonus: nightContactBonusFor(candidate.slot.slotMaster),
        planeId: candidate.slot.slotMaster.api_id
      };
    }
  }
  return { bonus: 0, planeId: -1 };
}

function nightContactBonusFor(slotMaster: (typeof masterData.api_mst_slotitem)[number]) {
  const accuracy = safeNum(slotMaster.api_houm);
  if (accuracy >= 3) return 9;
  if (accuracy >= 2) return 7;
  return 5;
}

function equipmentAsw(unit: BattleUnit, typeIds?: Set<number>) {
  return unit.equippedSlots.reduce((sum, slot) => {
    const type = safeNum(slot.slotMaster.api_type?.[2]);
    if (typeIds && !typeIds.has(type)) return sum;
    return sum + safeNum(slot.slotMaster.api_tais);
  }, 0);
}

function formationAaModifier(formation: number, formulaContext: BattleFormulaContext = NO_BATTLE_FORMULA_CONTEXT) {
  if (formulaContext.combinedType) return combinedFormationModifierFor(formation, "antiAir");
  return formationModifierFor(formation, "antiAir");
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

function shellingProfile(
  attacker: BattleUnit,
  target: BattleUnit,
  formation: number,
  phase: "day" | "night",
  engagement = 1,
  daySpottingEligible = false,
  nightEquipment?: NightEquipmentState,
  formulaContext: BattleFormulaContext = NO_BATTLE_FORMULA_CONTEXT
): ShellingAttackProfile {
  if (phase === "day" && target.targetKind === "submarine" && canAswShell(attacker)) {
    return {
      preCapPower: aswAttackPower(attacker) * formationModifier(formation, "asw", formulaContext) * engagementModifierFor(engagement) * damageStateModifier(attacker),
      cap: 170,
      atType: 0,
      spType: 0,
      hits: 1,
      postCapModifier: 1,
      slotIds: aswAttackSlotIds(attacker)
    };
  }

  const slotIds = specialAttackSlotIds(attacker);
  if (phase === "night") {
    const carrierNightProfile = carrierNightAirAttackProfile(attacker, nightEquipment);
    if (carrierNightProfile) return carrierNightProfile;
    const swordfishProfile = swordfishNightAttackProfile(attacker, nightEquipment);
    if (swordfishProfile) return swordfishProfile;
    const torpedoes = countEquipTypes(attacker, TORPEDO_TYPES);
    const mainGuns = countEquipTypes(attacker, MAIN_GUN_TYPES);
    const secondaries = countEquipTypes(attacker, SECONDARY_GUN_TYPES);
    const attack = classifyNightAttack({
      mainGuns,
      secondaryGuns: secondaries,
      torpedoes,
      nightAircraft: 0
    });
    return {
      preCapPower: nightBattlePower({
        firepower: attacker.firepower + (nightEquipment?.nightContactBonus ?? 0),
        torpedo: attacker.torpedo,
        damageModifier: damageStateModifier(attacker)
      }),
      cap: 360,
      atType: 0,
      spType: attack.spType,
      hits: attack.hits,
      postCapModifier: attack.modifier,
      slotIds: nightAttackSlotIds(attacker, attack.spType, slotIds)
    };
  }

  const apShell = attacker.equippedSlots.some((slot) => safeNum(slot.slotMaster.api_type?.[2]) === AP_SHELL_TYPE);
  const seaplane = countEquipTypes(attacker, SEAPLANE_TYPES) > 0;
  const mainGunCount = countEquipTypes(attacker, MAIN_GUN_TYPES);
  const mainGun = mainGunCount > 0;
  const spotting = daySpottingEligible && seaplane;
  const apCutIn = spotting && apShell && mainGun;
  const doubleAttack = spotting && !apShell && mainGunCount >= 2;
  const isCarrierShelling = CARRIER_TYPES.has(attacker.shipType) && attacker.airSlots.some((slot) => slot.count > 0 && OPENING_AIRSTRIKE_TYPES.has(slot.equipTypeId));
  const combinedPowerBonus = combinedBattlePowerBonus(formulaContext, attacker, target, "shelling");
  const base = isCarrierShelling
    ? 55 + Math.floor(1.5 * (attacker.firepower + airstrikeStatSum(attacker) + combinedPowerBonus))
    : attacker.firepower + 5 + combinedPowerBonus;
  const postCapModifier = apCutIn ? 1.3 : doubleAttack ? 1.2 : 1;
  return {
    preCapPower: base * formationModifier(formation, "shelling", formulaContext) * engagementModifierFor(engagement) * damageStateModifier(attacker),
    cap: 220,
    atType: apCutIn ? 3 : doubleAttack ? 2 : 0,
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

function canAswShell(unit: BattleUnit) {
  return isOperable(unit) && (unit.baseAsw > 0 || equipmentAsw(unit, ASW_DAMAGE_EQUIP_TYPES) > 0);
}

function nightAttackSlotIds(unit: BattleUnit, spType: number, fallback: number[]) {
  if (spType === 5) {
    const ids = equippedSlotMasterIds(unit, TORPEDO_TYPES, 2);
    return ids.length > 0 ? ids : fallback;
  }
  if (spType === 4) {
    const ids = [
      ...equippedSlotMasterIds(unit, MAIN_GUN_TYPES, 1),
      ...equippedSlotMasterIds(unit, TORPEDO_TYPES, 1)
    ];
    return ids.length > 0 ? ids : fallback;
  }
  return fallback;
}

function carrierNightAirAttackProfile(attacker: BattleUnit, nightEquipment?: NightEquipmentState): ShellingAttackProfile | null {
  if (!canCarrierNightAirAttack(attacker)) return null;
  const aircraft = carrierNightAircraftSlots(attacker);
  const cutIn = classifyCarrierNightCutIn(carrierNightCutInCounts(aircraft));
  const normalSlotIds = carrierNightNormalSlotIds(attacker, aircraft);
  const cutInSlotIds = cutIn ? carrierNightCutInSlotIds(aircraft, normalSlotIds) : normalSlotIds;
  return {
    preCapPower: carrierNightAirAttackPower({
      baseFirepower: attacker.baseFirepower,
      nightContactBonus: nightEquipment?.nightContactBonus ?? 0,
      fitBonus: carrierNightFitBonus(attacker, aircraft),
      damageModifier: damageStateModifier(attacker),
      aircraft: aircraft.map((slot) => ({
        count: slot.count,
        firepower: safeNum(slot.slotMaster.api_houg),
        torpedo: safeNum(slot.slotMaster.api_raig),
        bombing: safeNum(slot.slotMaster.api_baku),
        asw: safeNum(slot.slotMaster.api_tais),
        improvement: slot.improvement,
        modifierKind: isSpecialCarrierNightAircraftSlot(slot) && !isRegularCarrierNightAircraftSlot(slot) ? "special" : "night"
      }))
    }),
    cap: 360,
    atType: 0,
    spType: cutIn?.spType ?? 0,
    hits: cutIn?.hits ?? 1,
    postCapModifier: cutIn?.modifier ?? 1,
    slotIds: cutIn ? cutInSlotIds : normalSlotIds,
    nightCarrierAttack: true,
    fallbackSlotIds: normalSlotIds
  };
}

function carrierNightCutInCounts(aircraft: EquippedSlot[]) {
  const nightFighters = aircraft.filter(isNightFighterSlot).length;
  const nightTorpedoBombers = aircraft.filter(isNightTorpedoBomberSlot).length;
  const nightDiveBombers = aircraft.filter(isNightDiveBomberSlot).length;
  return {
    nightFighters,
    nightTorpedoBombers,
    nightDiveBombers,
    otherNightAircraft: Math.max(0, aircraft.length - nightFighters - nightTorpedoBombers - nightDiveBombers)
  };
}

function carrierNightNormalSlotIds(attacker: BattleUnit, aircraft: EquippedSlot[]) {
  return [aircraft[0]?.slotMaster.api_id ?? primarySlotId(attacker)];
}

function carrierNightCutInSlotIds(aircraft: EquippedSlot[], fallback: number[]) {
  const nightFighters = aircraft.filter(isNightFighterSlot);
  const nightTorpedoBombers = aircraft.filter(isNightTorpedoBomberSlot);
  const nightDiveBombers = aircraft.filter(isNightDiveBomberSlot);
  if (nightFighters.length >= 2 && nightTorpedoBombers.length >= 1) {
    return slotMasterIdsOrFallback([nightFighters[0], nightFighters[1], nightTorpedoBombers[0]], fallback);
  }
  if (nightFighters.length >= 1 && nightTorpedoBombers.length >= 1) {
    return slotMasterIdsOrFallback([nightFighters[0], nightTorpedoBombers[0]], fallback);
  }
  if (nightDiveBombers.length >= 1 && aircraft.length >= 3) {
    return slotMasterIdsOrFallback([nightDiveBombers[0], ...aircraft.filter((slot) => slot !== nightDiveBombers[0]).slice(0, 2)], fallback);
  }
  if (nightFighters.length >= 1 && aircraft.length >= 4) {
    return slotMasterIdsOrFallback([nightFighters[0], ...aircraft.filter((slot) => slot !== nightFighters[0]).slice(0, 3)], fallback);
  }
  return fallback;
}

function slotMasterIdsOrFallback(slots: (EquippedSlot | undefined)[], fallback: number[]) {
  const ids = slots
    .map((slot) => slot?.slotMaster.api_id ?? -1)
    .filter((id) => id > 0);
  return ids.length > 0 ? ids : fallback;
}

function canCarrierNightAirAttack(unit: BattleUnit) {
  if (!isCarrierNightAttackShip(unit) || !carrierNightDamageAllowed(unit)) return false;
  if (carrierNightAircraftSlots(unit).length === 0) return false;
  return CARRIER_NIGHT_AIR_ATTACK_NATIVE_SHIP_IDS.has(unit.masterId) ||
    hasNightOperationPersonnel(unit);
}

function canStandardCarrierNightShelling(unit: BattleUnit) {
  return STANDARD_CARRIER_NIGHT_SHELLING_SHIP_IDS.has(unit.masterId) && damageState(unit) < 2;
}

function isCarrierNightAttackShip(unit: BattleUnit) {
  return CARRIER_TYPES.has(unit.shipType) || CARRIER_NIGHT_AIR_ATTACK_NATIVE_SHIP_IDS.has(unit.masterId);
}

function carrierNightDamageAllowed(unit: BattleUnit) {
  const state = damageState(unit);
  return unit.shipType === 18 ? state < 3 : state < 2;
}

function hasNightOperationPersonnel(unit: BattleUnit) {
  return unit.equippedSlots.some((slot) => NIGHT_OPERATION_PERSONNEL_IDS.has(slot.slotMaster.api_id));
}

function canSwordfishNightAttack(unit: BattleUnit) {
  return ARK_ROYAL_SHIP_IDS.has(unit.masterId) &&
    damageState(unit) < 2 &&
    unit.equippedSlots.some((slot) => slot.count > 0 && SWORDFISH_IDS.has(slot.slotMaster.api_id));
}

function swordfishNightAttackProfile(attacker: BattleUnit, nightEquipment?: NightEquipmentState): ShellingAttackProfile | null {
  if (!canSwordfishNightAttack(attacker)) return null;
  const swordfish = attacker.equippedSlots.find((slot) => slot.count > 0 && SWORDFISH_IDS.has(slot.slotMaster.api_id));
  if (!swordfish) return null;
  const torpedoes = countEquipTypes(attacker, TORPEDO_TYPES);
  const mainGuns = countEquipTypes(attacker, MAIN_GUN_TYPES);
  const secondaries = countEquipTypes(attacker, SECONDARY_GUN_TYPES);
  const attack = classifyNightAttack({
    mainGuns,
    secondaryGuns: secondaries,
    torpedoes,
    nightAircraft: 0
  });
  const fallbackSlotIds = [swordfish.slotMaster.api_id];
  return {
    preCapPower: nightBattlePower({
      firepower: attacker.baseFirepower +
        safeNum(swordfish.slotMaster.api_houg) +
        Math.sqrt(Math.max(0, swordfish.improvement)) +
        (nightEquipment?.nightContactBonus ?? 0),
      torpedo: safeNum(swordfish.slotMaster.api_raig),
      damageModifier: damageStateModifier(attacker)
    }),
    cap: 360,
    atType: 0,
    spType: attack.spType,
    hits: attack.hits,
    postCapModifier: attack.modifier,
    slotIds: nightAttackSlotIds(attacker, attack.spType, fallbackSlotIds),
    nightCarrierAttack: true,
    fallbackSlotIds
  };
}

function carrierNightAircraftSlots(unit: BattleUnit) {
  return unit.equippedSlots.filter((slot) => slot.count > 0 && isCarrierNightAircraftSlot(slot));
}

function isCarrierNightAircraftSlot(slot: EquippedSlot) {
  return isRegularCarrierNightAircraftSlot(slot) || isSpecialCarrierNightAircraftSlot(slot);
}

function isRegularCarrierNightAircraftSlot(slot: EquippedSlot) {
  const detailType = safeNum(slot.slotMaster.api_type?.[3]);
  return detailType === NIGHT_FIGHTER_DETAIL_TYPE ||
    detailType === NIGHT_TORPEDO_BOMBER_DETAIL_TYPE ||
    detailType === NIGHT_DIVE_BOMBER_DETAIL_TYPE;
}

function isNightFighterSlot(slot: EquippedSlot) {
  return safeNum(slot.slotMaster.api_type?.[3]) === NIGHT_FIGHTER_DETAIL_TYPE;
}

function isNightTorpedoBomberSlot(slot: EquippedSlot) {
  return safeNum(slot.slotMaster.api_type?.[3]) === NIGHT_TORPEDO_BOMBER_DETAIL_TYPE;
}

function isNightDiveBomberSlot(slot: EquippedSlot) {
  return safeNum(slot.slotMaster.api_type?.[3]) === NIGHT_DIVE_BOMBER_DETAIL_TYPE;
}

function isSpecialCarrierNightAircraftSlot(slot: EquippedSlot) {
  return SPECIAL_CARRIER_NIGHT_AIRCRAFT_IDS.has(slot.slotMaster.api_id);
}

function carrierNightFitBonus(_attacker: BattleUnit, _aircraft: EquippedSlot[]) {
  return 0;
}

function equippedSlotMasterIds(unit: BattleUnit, typeIds: Set<number>, limit: number) {
  return unit.equippedSlots
    .filter((slot) => typeIds.has(safeNum(slot.slotMaster.api_type?.[2])))
    .map((slot) => slot.slotMaster.api_id)
    .slice(0, limit);
}

function openingAswPhase(
  friendly: BattleUnit[],
  enemy: BattleUnit[],
  formation: number,
  rng: BattleRng,
  formulaContext: BattleFormulaContext = NO_BATTLE_FORMULA_CONTEXT
): HougekiPayload | null {
  const submarineTargets = enemy.filter((unit) => unit.targetKind === "submarine");
  if (submarineTargets.length === 0) return null;
  const payload = emptyHougeki(false);
  for (const attacker of attackOrder(friendly)) {
    if (!canOpeningAsw(attacker)) continue;
    appendAswAttack(payload, attacker, submarineTargets, formation, rng, formulaContext);
  }
  return payload.api_at_list.length > 0 ? payload : null;
}

function canOpeningAsw(unit: BattleUnit) {
  if (!isOperable(unit) || damageState(unit) >= 3) return false;
  return canOpeningAswByStats({
    shipType: unit.shipType,
    level: unit.level,
    displayedAsw: unit.asw,
    equipmentAsw: equipmentAsw(unit),
    hasSonar: countEquipTypes(unit, SONAR_TYPES) > 0,
    hasDepthCharge: countEquipTypes(unit, DEPTH_CHARGE_TYPES) > 0,
    hasAutogyro: countEquipTypes(unit, AUTOGYRO_TYPES) > 0
  });
}

function appendAswAttack(
  payload: HougekiPayload,
  attacker: BattleUnit,
  targets: BattleUnit[],
  formation: number,
  rng: BattleRng,
  formulaContext: BattleFormulaContext = NO_BATTLE_FORMULA_CONTEXT
) {
  const target = randomAlive(targets, rng);
  if (!target) return;
  const hitChance = accuracyChance({
    attackerLevel: attacker.level,
    attackerLuck: attacker.luck,
    attackerAccuracy: attacker.accuracy + equipmentAsw(attacker, SONAR_TYPES),
    targetEvasion: target.evasion,
    formationModifier: formationModifier(formation, "asw", formulaContext),
    attackAccuracyModifier: 1.1
  });
  const landed = rng.chance(hitChance);
  const critical = landed && rng.chance(criticalChance({
    attackerLuck: attacker.luck,
    attackerAccuracy: attacker.accuracy,
    targetEvasion: target.evasion
  }));
  const power = aswAttackPower(attacker) * formationModifier(formation, "asw", formulaContext) * damageStateModifier(attacker);
  const damage = landed
    ? applyDamage(target, power, 170, attacker.ammoModifier, rng, attacker.side === 0 ? 1 : 0, critical, 1)
    : 0;
  if (damage > 0) attacker.damageDealt += damage;
  payload.api_at_eflag.push(attacker.side);
  payload.api_at_list.push(attacker.position - 1);
  payload.api_at_type.push(0);
  payload.api_df_list.push([target.position - 1]);
  payload.api_si_list.push(aswAttackSlotIds(attacker));
  payload.api_cl_list.push([critical ? 2 : damage > 0 ? 1 : 0]);
  payload.api_damage.push([damage]);
}

function aswAttackPower(unit: BattleUnit) {
  return resolveAswAttackPower({
    baseAsw: unit.baseAsw,
    equipmentAsw: equipmentAsw(unit, ASW_DAMAGE_EQUIP_TYPES),
    sonarCount: countEquipTypes(unit, SONAR_TYPES),
    depthChargeCount: countEquipTypes(unit, DEPTH_CHARGE_TYPES)
  });
}

function aswAttackSlotIds(unit: BattleUnit) {
  const ids = unit.equippedSlots
    .filter((slot) => {
      const type = safeNum(slot.slotMaster.api_type?.[2]);
      return SONAR_TYPES.has(type) || DEPTH_CHARGE_TYPES.has(type);
    })
    .map((slot) => slot.slotMaster.api_id)
    .slice(0, 3);
  return ids.length > 0 ? ids : [primarySlotId(unit)];
}

function openingTorpedoPhase(
  friendly: BattleUnit[],
  enemy: BattleUnit[],
  formations: SideFormations,
  rng: BattleRng,
  formulaContext: BattleFormulaContext = NO_BATTLE_FORMULA_CONTEXT
) {
  return torpedoPhase(friendly, enemy, formations, rng, canOpeningTorpedo, formulaContext);
}

function combinedShellingPhases(
  combinedType: number,
  main: BattleUnit[],
  escort: BattleUnit[],
  enemy: BattleUnit[],
  formations: SideFormations,
  rng: BattleRng,
  engagement = 1,
  escortTargets: BattleUnit[] = enemy,
  phaseSet: Set<string> = new Set(["hougeki1", "hougeki2", "hougeki3"]),
  dayAirControl: DayShellingAirControl = NO_DAY_SHELLING_AIR_CONTROL,
  formulaContext: BattleFormulaContext = NO_BATTLE_FORMULA_CONTEXT
) {
  const hasSecondRound = hasSecondShellingRound([...main, ...escort], enemy);
  if (combinedType === 2) {
    return {
      hougeki1: shellingPhase(main, enemy, formations, rng, "day", engagement, dayAirControl, undefined, formulaContext),
      hougeki2: hasBattlePhase(phaseSet, "hougeki2") ? shellingPhase(escort, escortTargets, formations, rng, "day", engagement, dayAirControl, undefined, formulaContext) : null,
      hougeki3: hasBattlePhase(phaseSet, "hougeki3") && hasSecondRound ? shellingPhase(main, enemy, formations, rng, "day", engagement, dayAirControl, undefined, formulaContext) : null
    };
  }
  if (combinedType === 3) {
    return {
      hougeki1: shellingPhase(escort, escortTargets, formations, rng, "day", engagement, dayAirControl, undefined, formulaContext),
      hougeki2: hasBattlePhase(phaseSet, "hougeki2") ? shellingPhase(main, enemy, formations, rng, "day", engagement, dayAirControl, undefined, formulaContext) : null,
      hougeki3: hasBattlePhase(phaseSet, "hougeki3") && hasSecondRound ? shellingPhase(escort, enemy, formations, rng, "day", engagement, dayAirControl, undefined, formulaContext) : null
    };
  }
  return {
    hougeki1: shellingPhase(escort, escortTargets, formations, rng, "day", engagement, dayAirControl, undefined, formulaContext),
    hougeki2: hasBattlePhase(phaseSet, "hougeki2") ? shellingPhase(main, enemy, formations, rng, "day", engagement, dayAirControl, undefined, formulaContext) : null,
    hougeki3: hasBattlePhase(phaseSet, "hougeki3") && hasSecondRound ? shellingPhase(main, enemy, formations, rng, "day", engagement, dayAirControl, undefined, formulaContext) : null
  };
}

function hasSecondShellingRound(friendly: BattleUnit[], enemy: BattleUnit[]) {
  return [...friendly, ...enemy].some((unit) => isOperable(unit) && BATTLESHIP_TYPES.has(unit.shipType));
}

function shellingPhase(
  friendly: BattleUnit[],
  enemy: BattleUnit[],
  formations: SideFormations,
  rng: BattleRng,
  phase: "day" | "night",
  engagement = 1,
  dayAirControl: DayShellingAirControl = NO_DAY_SHELLING_AIR_CONTROL,
  nightEquipment?: NightEquipmentPair,
  formulaContext: BattleFormulaContext = NO_BATTLE_FORMULA_CONTEXT
): HougekiPayload {
  const payload = emptyHougeki(phase === "night");
  if (phase === "night") {
    const friendlyByPosition = unitsByPosition(friendly);
    const enemyByPosition = unitsByPosition(enemy);
    const friendlyNightEquipment = nightEquipment?.friendly ?? nightEquipmentState(friendly, rng, true);
    const enemyNightEquipment = nightEquipment?.enemy ?? nightEquipmentState(enemy, rng, true);
    for (let turn = 0; turn < 6; turn += 1) {
      const friendlyAttacker = friendlyByPosition[turn];
      const enemyAttacker = enemyByPosition[turn];
      if (friendlyAttacker) appendShellingAttack(payload, friendlyAttacker, enemy, formationForSide(formations, friendlyAttacker.side), rng, phase, engagement, friendlyNightEquipment, NO_DAY_SHELLING_AIR_CONTROL, formulaContext);
      if (enemyAttacker) appendShellingAttack(payload, enemyAttacker, friendly, formationForSide(formations, enemyAttacker.side), rng, phase, engagement, enemyNightEquipment, NO_DAY_SHELLING_AIR_CONTROL, formulaContext);
    }
    return payload;
  }

  const friendlyOrder = attackOrder(friendly);
  const enemyOrder = attackOrder(enemy);
  const turns = Math.max(friendlyOrder.length, enemyOrder.length);
  for (let turn = 0; turn < turns; turn += 1) {
    if (friendlyOrder[turn]) appendShellingAttack(payload, friendlyOrder[turn], enemy, formationForSide(formations, friendlyOrder[turn].side), rng, phase, engagement, undefined, dayAirControl, formulaContext);
    if (enemyOrder[turn]) appendShellingAttack(payload, enemyOrder[turn], friendly, formationForSide(formations, enemyOrder[turn].side), rng, phase, engagement, undefined, dayAirControl, formulaContext);
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
  phase: "day" | "night",
  engagement = 1,
  nightEquipment?: NightEquipmentState,
  dayAirControl: DayShellingAirControl = NO_DAY_SHELLING_AIR_CONTROL,
  formulaContext: BattleFormulaContext = NO_BATTLE_FORMULA_CONTEXT
) {
  if (!canShell(attacker, phase)) return;
  const target = shellingTarget(attacker, targets, phase, rng);
  if (!target) return;

  const profile = activateShellingProfile(
    shellingProfile(attacker, target, formation, phase, engagement, daySpottingEligible(attacker, phase, dayAirControl), nightEquipment, formulaContext),
    attacker,
    phase,
    rng,
    nightEquipment
  );
  if (profile.preCapPower <= 0 || profile.hits <= 0) return;
  const damages: number[] = [];
  const cls: number[] = [];
  for (let hit = 0; hit < profile.hits; hit += 1) {
    const hitChance = accuracyChance({
      attackerLevel: attacker.level,
      attackerLuck: attacker.luck,
      attackerAccuracy: attacker.accuracy,
      targetEvasion: target.evasion,
      formationModifier: phase === "night" ? 1 : formationModifier(formation, "shelling", formulaContext),
      engagementModifier: phase === "night" ? 1 : engagementModifierFor(engagement),
      attackAccuracyModifier: shellingAccuracyModifier(profile, phase) *
        combinedBattleAccuracyModifier(formulaContext, attacker, target, phase === "night" ? "night" : "shelling", formation)
    });
    const landed = rng.chance(hitChance);
    const critical = landed && rng.chance(criticalChance({
      attackerLuck: attacker.luck,
      attackerAccuracy: attacker.accuracy,
      targetEvasion: target.evasion,
      cutInModifier: phase === "night" && profile.spType > 1 ? 1.2 : 1
    }));
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
  if (payload.api_n_mother_list) payload.api_n_mother_list.push(profile.nightCarrierAttack ? 1 : 0);
}

function shellingTarget(attacker: BattleUnit, targets: BattleUnit[], phase: "day" | "night", rng: BattleRng) {
  if (phase !== "day") {
    const living = targets.filter(isOperable);
    if (living.length === 0) return undefined;
    if (canCarrierNightAirAttack(attacker) || canSwordfishNightAttack(attacker)) {
      const surfaceTargets = living.filter((unit) => unit.targetKind !== "submarine");
      if (surfaceTargets.length > 0) return rng.pick(surfaceTargets);
      return canStandardCarrierNightShelling(attacker) ? rng.pick(living) : undefined;
    }
    return rng.pick(living);
  }
  const living = targets.filter(isOperable);
  if (living.length === 0) return undefined;
  const submarines = living.filter((unit) => unit.targetKind === "submarine");
  if (submarines.length > 0 && canAswShell(attacker)) return rng.pick(submarines);
  const surfaceTargets = living.filter((unit) => unit.targetKind !== "submarine");
  return rng.pick(surfaceTargets.length > 0 ? surfaceTargets : living);
}

function shellingAccuracyModifier(profile: ShellingAttackProfile, phase: "day" | "night") {
  if (phase === "night") return profile.spType > 0 ? 1.15 : 1.05;
  if (profile.atType > 0) return 1.1;
  return 1;
}

function activateShellingProfile(
  profile: ShellingAttackProfile,
  attacker: BattleUnit,
  phase: "day" | "night",
  rng: BattleRng,
  nightEquipment?: NightEquipmentState
) {
  if (phase !== "night" || profile.spType <= 1) return profile;
  const chance = nightCutInActivationChance({
    luck: attacker.luck,
    flagship: attacker.position === 1,
    damageState: damageState(attacker),
    cutInKind: profile.spType,
    searchlight: nightEquipment?.searchlight,
    starShell: nightEquipment?.starShell
  });
  if (rng.chance(chance)) return profile;
  if (profile.nightCarrierAttack) {
    return {
      ...profile,
      spType: 0,
      hits: 1,
      postCapModifier: 1,
      slotIds: profile.fallbackSlotIds ?? profile.slotIds
    };
  }
  return normalNightShellingProfile(attacker, nightEquipment);
}

function normalNightShellingProfile(attacker: BattleUnit, nightEquipment?: NightEquipmentState): ShellingAttackProfile {
  return {
    preCapPower: nightBattlePower({
      firepower: attacker.firepower + (nightEquipment?.nightContactBonus ?? 0),
      torpedo: attacker.torpedo,
      damageModifier: damageStateModifier(attacker)
    }),
    cap: 360,
    atType: 0,
    spType: 0,
    hits: 1,
    postCapModifier: 1,
    slotIds: [primarySlotId(attacker)]
  };
}

function torpedoPhase(
  friendly: BattleUnit[],
  enemy: BattleUnit[],
  formations: SideFormations,
  rng: BattleRng,
  canFire: (unit: BattleUnit) => boolean = canClosingTorpedo,
  formulaContext: BattleFormulaContext = NO_BATTLE_FORMULA_CONTEXT
): RaigekiPayload | null {
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
    if (!canFire(attacker)) continue;
    const target = randomTorpedoTarget(enemy, rng);
    if (!target) continue;
    const attackerIdx = attacker.position - 1;
    const targetIdx = target.position - 1;
    const formation = formationForSide(formations, attacker.side);
    const power = (torpedoSalvoPower(attacker) + 5 + combinedBattlePowerBonus(formulaContext, attacker, target, "torpedo")) *
      formationModifier(formation, "torpedo", formulaContext) *
      damageStateModifier(attacker);
    const hitChance = torpedoAccuracyChance(attacker, target, formation, formulaContext);
    const landed = rng.chance(hitChance);
    const critical = landed && rng.chance(criticalChance({
      attackerLuck: attacker.luck,
      attackerAccuracy: attacker.accuracy,
      targetEvasion: target.evasion
    }));
    const damage = landed ? applyDamage(target, power, 180, attacker.ammoModifier, rng, 1, critical) : 0;
    attacker.damageDealt += damage;
    payload.api_frai[attackerIdx] = targetIdx;
    payload.api_frai_flag[attackerIdx] = 1;
    payload.api_fydam[attackerIdx] = damage;
    payload.api_edam[targetIdx] += damage;
    payload.api_ecl[targetIdx] = critical ? 2 : damage > 0 ? 1 : 0;
    fired = true;
  }
  for (const attacker of enemy) {
    if (!canFire(attacker)) continue;
    const target = randomTorpedoTarget(friendly, rng);
    if (!target) continue;
    const attackerIdx = attacker.position - 1;
    const targetIdx = target.position - 1;
    const formation = formationForSide(formations, attacker.side);
    const power = (torpedoSalvoPower(attacker) + 5 + combinedBattlePowerBonus(formulaContext, attacker, target, "torpedo")) *
      formationModifier(formation, "torpedo", formulaContext) *
      damageStateModifier(attacker);
    const hitChance = torpedoAccuracyChance(attacker, target, formation, formulaContext);
    const landed = rng.chance(hitChance);
    const critical = landed && rng.chance(criticalChance({
      attackerLuck: attacker.luck,
      attackerAccuracy: attacker.accuracy,
      targetEvasion: target.evasion
    }));
    const damage = landed ? applyDamage(target, power, 180, attacker.ammoModifier, rng, 0, critical) : 0;
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

function torpedoAccuracyChance(
  attacker: BattleUnit,
  target: BattleUnit,
  formation: number,
  formulaContext: BattleFormulaContext = NO_BATTLE_FORMULA_CONTEXT
) {
  return accuracyChance({
    attackerLevel: attacker.level,
    attackerLuck: attacker.luck,
    attackerAccuracy: attacker.accuracy,
    targetEvasion: target.evasion,
    formationModifier: formationModifier(formation, "torpedo", formulaContext),
    attackAccuracyModifier: 0.95 * combinedBattleAccuracyModifier(formulaContext, attacker, target, "torpedo", formation)
  });
}

function canClosingTorpedo(unit: BattleUnit) {
  return canTorpedoSalvo(unit) && damageState(unit) < 2;
}

function canOpeningTorpedo(unit: BattleUnit) {
  if (!canTorpedoSalvo(unit)) return false;
  if (OPENING_TORPEDO_SHIP_TYPES.has(unit.shipType)) return true;
  return countEquipTypes(unit, MIDGET_SUBMARINE_TYPES) > 0;
}

function canTorpedoSalvo(unit: BattleUnit) {
  return isOperable(unit) && !CARRIER_TYPES.has(unit.shipType) && unit.baseTorpedo > 0 && torpedoSalvoPower(unit) > 0;
}

function randomTorpedoTarget(units: BattleUnit[], rng: BattleRng) {
  const livingSurfaceTargets = units.filter((unit) => isOperable(unit) && unit.targetKind === "surface");
  return livingSurfaceTargets.length > 0 ? rng.pick(livingSurfaceTargets) : undefined;
}

function torpedoSalvoPower(unit: BattleUnit) {
  const aircraftTorpedo = unit.equippedSlots.reduce(
    (sum, slot) => sum + (isAircraftSlotItem(slot.slotMaster) ? safeNum(slot.slotMaster.api_raig) : 0),
    0
  );
  return Math.max(0, unit.torpedo - aircraftTorpedo);
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
    targetSide: target.hpFloor > 0 ? 0 : targetSide
  });
  target.hp = Math.max(target.hpFloor, target.hp - damage);
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
  const rank = mode === "practice"
    ? practiceBattleRank(friendly, enemy)
    : sunk === enemy.length ? "S" : damageRatio >= 0.7 ? "A" : damageRatio >= 0.4 ? "B" : "C";
  const mvp = [...friendly].sort((a, b) => b.damageDealt - a.damageDealt || a.position - b.position)[0]?.position ?? 1;
  const baseExp = mode === "practice" && practice
    ? practiceBaseShipExp(practice.enemyShipLevels, rank, practiceSeededBonus(practice.seed))
    : sortie?.baseExp ?? legacySortieBaseExp(rank);
  const memberExp = mode === "practice" && practice
    ? practiceMemberExp(practice.playerLevel, practice.enemyLevel, rank)
    : baseExp * 2;
  const drop = mode === "practice" || !sortie ? null : selectSortieDrop({
    mapId: sortie.mapId,
    node: sortie.node,
    rank: rank as SortieBattleRank,
    seed: sortie.seed,
    enemyFleetKey: sortie.enemyFleetKey
  }) ?? selectEventSortieDrop({
    mapId: sortie.mapId,
    node: sortie.node,
    rank: rank as SortieBattleRank,
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

function legacySortieBaseExp(rank: BattleResultRecord["rank"]) {
  return rank === "S" ? 40 : rank === "A" ? 35 : rank === "B" ? 30 : 20;
}

function practiceBattleRank(friendly: BattleUnit[], enemy: BattleUnit[]): BattleResultRecord["rank"] {
  if (enemy.length === 0) return "S";
  const enemySunk = enemy.filter(isEffectivelySunk).length;
  const friendlySunk = friendly.filter(isEffectivelySunk).length;
  const enemyFlagSunk = enemy[0] ? isEffectivelySunk(enemy[0]) : true;
  const friendlyFlagSunk = friendly[0] ? isEffectivelySunk(friendly[0]) : false;

  if (enemySunk === enemy.length) return friendlySunk > 0 ? "B" : "S";

  const aSunkThreshold = Math.floor(enemy.length * 2 / 3);
  if (friendlySunk === 0 && enemy.length > 1 && enemySunk >= aSunkThreshold) return "A";
  if (enemyFlagSunk && enemySunk > friendlySunk) return "B";

  const enemyGauge = battleGauge(enemy);
  const friendlyGauge = battleGauge(friendly);
  if (enemyGauge > friendlyGauge * 2.5) return "B";
  if (enemyGauge >= 0.5 || enemyGauge >= friendlyGauge) return "C";

  const eSunkThreshold = Math.max(1, Math.floor(friendly.length * 2 / 3));
  if (!enemyFlagSunk && (friendlyFlagSunk || friendlySunk >= eSunkThreshold)) return "E";
  return "D";
}

function battleGauge(units: BattleUnit[]) {
  const total = units.reduce((sum, unit) => sum + unit.maxHp, 0);
  if (total <= 0) return 0;
  const damage = units.reduce((sum, unit) => sum + Math.max(0, unit.maxHp - Math.max(unit.hp, unit.hpFloor)), 0);
  return damage / total;
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
        proficiency: item.proficiencyExp
      };
    })
    .filter((item): item is EquippedSlot => Boolean(item));
  const slotMasters = equippedSlots.map((item) => item.slotMaster);
  const equipSum = (field: keyof (typeof masterData.api_mst_slotitem)[number]) =>
    slotMasters.reduce((sum, item) => sum + safeNum(item[field]), 0);
  const slots = slotMasters.map((item) => item.api_id);
  const modernization = shipModernization(ship);
  const baseFirepower = statValue(master?.api_houg) + modernization[0];
  const baseTorpedo = statValue(master?.api_raig) + modernization[1];
  const baseAa = statValue(master?.api_tyku) + modernization[2];
  const baseArmor = statValue(master?.api_souk) + modernization[3];
  const baseLuck = statValue(master?.api_luck) + modernization[4] + ship.marriageLuckBonus;
  const baseAsw = shipBaseAsw(master, ship.level) + modernization[6];
  const asw = baseAsw + equipSum("api_tais");
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
    hpFloor: 0,
    maxHp: ship.maxHp,
    baseFirepower,
    firepower: baseFirepower + equipSum("api_houg"),
    baseTorpedo,
    torpedo: baseTorpedo + equipSum("api_raig"),
    aa: baseAa + equipSum("api_tyku"),
    baseAsw,
    asw,
    armor: baseArmor + equipSum("api_souk"),
    luck: baseLuck + equipSum("api_luck"),
    accuracy: equipSum("api_houm"),
    evasion: shipDisplayEvasion(ship, equipSum("api_houk")),
    range: Math.max(safeNum(master?.api_leng, 1), ...slotMasters.map((item) => safeNum(item.api_leng, 0))),
    ammoModifier: ammoModifier(ship.ammo, ship.maxAmmo),
    shipType: safeNum(master?.api_stype, 2),
    targetKind: shipTargetKind(safeNum(master?.api_stype, 2)),
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
  const encounter = selectEventSortieEncounter(session.areaId, session.mapNo, session.node, seed)
    ?? selectSortieEncounter(session.areaId, session.mapNo, session.node, seed);
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
  const areaId = save.sortieSession?.areaId;
  if (!sortie || areaId == null) return undefined;
  const definition = supportExpeditionForSortie(areaId, sortie.isBoss, save.eventSettings.activeAreaId);
  if (!definition) return undefined;
  const missionId = definition.id;
  const run = save.expeditionRuns.find(
    (item) => item.status === "active" && item.missionId === missionId
  );
  if (!run) return undefined;
  const snapshot = run.snapshot as {
    ships?: { id: number; masterId: number; condition?: number }[];
  };
  const shipIds = snapshot.ships?.map((ship) => ship.id) ?? [];
  const supportShips = snapshot.ships ?? [];
  const supportUnits = friendlyUnits(save, shipIds);
  const rng = new BattleRng(run.seed + sortie.node * 31 + run.supportCount * 997);
  const arrivalChance = supportArrivalChance(sortie.isBoss, supportShips);
  if (!rng.chance(arrivalChance) || supportUnits.length < 2) {
    return {
      deckId: run.deckId,
      missionId,
      arrived: false,
      flag: 0,
      info: null
    };
  }

  const flag = supportAttackFlag(supportUnits);
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

function supportArrivalChance(isBoss: boolean, ships: { condition?: number }[]) {
  const conditions = ships.map((ship) => safeNum(ship.condition, 49));
  const flagshipSparkled = (conditions[0] ?? 0) >= 50;
  if (isBoss && flagshipSparkled) return 1;
  const sparkledEscorts = conditions.slice(1).filter((condition) => condition >= 50).length;
  return Math.min(0.9, 0.5 + (flagshipSparkled ? 0.15 : 0) + sparkledEscorts * 0.05);
}

function supportAttackFlag(supportUnits: BattleUnit[]) {
  const carrierLikeCount = supportUnits.filter((unit) => [7, 11, 16, 17, 18].includes(unit.shipType)).length;
  if (carrierLikeCount >= 3) return 1;
  const torpedoSupportCount = supportUnits.filter((unit) => [2, 3, 4].includes(unit.shipType)).length;
  return torpedoSupportCount >= 4 ? 3 : 2;
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
    const equipSum = (field: keyof (typeof masterData.api_mst_slotitem)[number]) =>
      equippedSlots.reduce((sum, item) => sum + safeNum(item.slotMaster[field]), 0);
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
    hpFloor: 0,
    maxHp: template.hp,
    baseFirepower: template.firepower,
    firepower: template.firepower,
    baseTorpedo: template.torpedo,
    torpedo: template.torpedo,
    aa: template.aa,
    baseAsw: 0,
    asw: 0,
      armor: template.armor,
      luck: template.luck,
      accuracy: safeNum(template.accuracy, equipSum("api_houm")),
      evasion: safeNum(template.evasion, 0),
      range: template.range,
    ammoModifier: 1,
    shipType: template.shipType,
    targetKind: enemyTargetKind(template.masterId, template.shipType),
    slots: template.slots.length ? [...template.slots] : [1501],
    equippedSlots,
    airSlots,
    onSlot,
    originalOnSlot: [...onSlot],
    damageDealt: 0
  };
}

function practiceEnemyUnit(ship: PracticeRivalShip, position: number): BattleUnit {
  const master = masterData.api_mst_ship.find((item) => item.api_id === ship.masterId);
  const maxHp = statValue(master?.api_taik, 15);
  const maxeq = normalizeFixed(Array.isArray(master?.api_maxeq) ? master.api_maxeq : [], 5, 0)
    .map((count) => Math.max(0, safeNum(count)));
  const rivalOnSlot = Array.isArray(ship.onSlot) ? ship.onSlot : [];
  const rivalSlotMasterIds = Array.isArray(ship.slotMasterIds) ? ship.slotMasterIds : [];
  const onSlot = normalizeFixed(rivalOnSlot, 5, 0).map((count) => Math.max(0, safeNum(count)));
  const equippedSlots: EquippedSlot[] = normalizeFixed(rivalSlotMasterIds, 5, -1)
    .map((slotMasterId, index): EquippedSlot | null => {
      if (slotMasterId <= 0) return null;
      const slotMaster = slotMasterById(slotMasterId);
      if (!slotMaster) return null;
      const maxCount = maxeq[index] ?? 0;
      return {
        index,
        slotItemId: slotMasterId,
        slotMaster,
        count: isAircraftSlotItem(slotMaster) ? Math.min(maxCount, onSlot[index] ?? maxCount) : 0,
        maxCount,
        improvement: 0,
        proficiency: proficiencyExpForVisible(7)
      } satisfies EquippedSlot;
    })
    .filter((slot): slot is EquippedSlot => Boolean(slot));
  const slotMasters = equippedSlots.map((slot) => slot.slotMaster);
  const equipSum = (field: keyof (typeof masterData.api_mst_slotitem)[number]) =>
    slotMasters.reduce((sum, item) => sum + safeNum(item[field]), 0);
  const baseAsw = shipBaseAsw(master, ship.level);
  const asw = baseAsw + equipSum("api_tais");
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
  const slots = slotMasters.map((slot) => slot.api_id);
  const currentOnSlot = normalizeFixed(
    onSlot.map((count, index) => {
      const equipped = equippedSlots.find((slot) => slot.index === index);
      return equipped && isAircraftSlotItem(equipped.slotMaster) ? Math.min(count, equipped.maxCount) : 0;
    }),
    5,
    0
  );
  return {
    side: 1,
    position,
    apiIndex: position + 6,
    shipId: 0,
    masterId: ship.masterId,
    level: ship.level,
    hp: maxHp,
    hpFloor: 1,
    maxHp,
    baseFirepower: leveledStat(master?.api_houg, ship.level, 0),
    firepower: leveledStat(master?.api_houg, ship.level, 0) + equipSum("api_houg"),
    baseTorpedo: leveledStat(master?.api_raig, ship.level, 0),
    torpedo: leveledStat(master?.api_raig, ship.level, 0) + equipSum("api_raig"),
    aa: leveledStat(master?.api_tyku, ship.level, 0) + equipSum("api_tyku"),
    baseAsw,
    asw,
    armor: leveledStat(master?.api_souk, ship.level, 1) + equipSum("api_souk"),
    luck: leveledStat(master?.api_luck, ship.level, 0) + equipSum("api_luck"),
    accuracy: equipSum("api_houm"),
    evasion: shipEvasion(master, ship.level) + equipSum("api_houk"),
    range: Math.max(safeNum(master?.api_leng, 1), ...slotMasters.map((slot) => safeNum(slot.api_leng, 0))),
    ammoModifier: 1,
    shipType: safeNum(master?.api_stype, 2),
    targetKind: enemyTargetKind(ship.masterId, safeNum(master?.api_stype, 2)),
    slots: slots.length ? slots : [1],
    equippedSlots,
    airSlots,
    onSlot: currentOnSlot,
    originalOnSlot: [...currentOnSlot],
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
      const baseAsw = shipBaseAsw(master, 1);
      return {
        side,
        position: index + 1,
        apiIndex: index + 1,
        shipId: record.shipIds[index],
        masterId,
        level: 1,
        hp,
        hpFloor: 0,
        maxHp: record.before.fNowHps[index] || hp,
        baseFirepower: statValue(master?.api_houg),
        firepower: statValue(master?.api_houg),
        baseTorpedo: statValue(master?.api_raig),
        torpedo: statValue(master?.api_raig),
        aa: statValue(master?.api_tyku),
        baseAsw,
        asw: baseAsw,
        armor: statValue(master?.api_souk),
        luck: statValue(master?.api_luck),
        accuracy: 0,
        evasion: shipEvasion(master, 1),
        range: safeNum(master?.api_leng, 1),
        ammoModifier: 1,
        shipType: safeNum(master?.api_stype, 2),
        targetKind: shipTargetKind(safeNum(master?.api_stype, 2)),
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

function recordEscortUnitsFrom(record: BattleRecord): BattleUnit[] {
  const hps = record.after.fCombinedNowHps ?? record.before.fCombinedNowHps ?? [];
  const snapshots = record.units?.escort;
  if (snapshots?.length) {
    return snapshots
      .filter((snapshot) => snapshot.position <= 6)
      .map((snapshot) => unitFromSnapshot(snapshot, hps[snapshot.position - 1] ?? snapshot.maxHp))
      .filter((unit): unit is BattleUnit => Boolean(unit));
  }
  const ids = record.escortShipIds ?? [];
  return normalizeFixed(ids, 6, -1)
    .map((id, index) => {
      if (id <= 0) return null;
      const masterId = record.escortShipMasterIds?.[index] ?? id;
      const master = masterData.api_mst_ship.find((item) => item.api_id === masterId);
      const hp = hps[index] ?? statValue(master?.api_taik, 1);
      const baseAsw = shipBaseAsw(master, 1);
      const unit: BattleUnit = {
        side: 0,
        position: index + 1,
        apiIndex: index + 1,
        shipId: id,
        masterId,
        level: 1,
        hp,
        hpFloor: 0,
        maxHp: record.before.fCombinedNowHps?.[index] || hp,
        baseFirepower: statValue(master?.api_houg),
        firepower: statValue(master?.api_houg),
        baseTorpedo: statValue(master?.api_raig),
        torpedo: statValue(master?.api_raig),
        aa: statValue(master?.api_tyku),
        baseAsw,
        asw: baseAsw,
        armor: statValue(master?.api_souk),
        luck: statValue(master?.api_luck),
        accuracy: 0,
        evasion: shipEvasion(master, 1),
        range: safeNum(master?.api_leng, 1),
        ammoModifier: 1,
        shipType: safeNum(master?.api_stype, 2),
        targetKind: shipTargetKind(safeNum(master?.api_stype, 2)),
        slots: [1],
        equippedSlots: [],
        airSlots: [],
        onSlot: [0, 0, 0, 0, 0],
        originalOnSlot: [0, 0, 0, 0, 0],
        damageDealt: 0
      };
      return unit;
    })
    .filter((unit): unit is BattleUnit => Boolean(unit));
}

function recordEnemyCombinedUnitsFrom(record: BattleRecord): BattleUnit[] {
  const hps = record.after.eCombinedNowHps ?? record.before.eCombinedNowHps ?? [];
  const snapshots = record.units?.enemyCombined;
  if (!snapshots?.length) return [];
  return snapshots
    .filter((snapshot) => snapshot.position <= 6)
    .map((snapshot) => unitFromSnapshot(snapshot, hps[snapshot.position - 1] ?? snapshot.maxHp))
    .filter((unit): unit is BattleUnit => Boolean(unit));
}

function shouldNightTargetEnemyEscort(enemyCombined: BattleUnit[]) {
  return enemyCombined.filter(isOperable).length >= 1;
}

function snapshotUnits(units: BattleUnit[]): BattleUnitSnapshot[] {
  return units.map((unit) => ({
    fleetKind: unit.fleetKind,
    side: unit.side,
    position: unit.position,
    shipId: unit.shipId,
    masterId: unit.masterId,
    level: unit.level,
    hpFloor: unit.hpFloor,
    maxHp: unit.maxHp,
    baseFirepower: unit.baseFirepower,
    firepower: unit.firepower,
    baseTorpedo: unit.baseTorpedo,
    torpedo: unit.torpedo,
    aa: unit.aa,
    baseAsw: unit.baseAsw,
    asw: unit.asw,
    armor: unit.armor,
    luck: unit.luck,
    accuracy: unit.accuracy,
    evasion: unit.evasion,
    range: unit.range,
    ammoModifier: unit.ammoModifier,
    shipType: unit.shipType,
    targetKind: unit.targetKind,
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
    fleetKind: snapshot.fleetKind,
    side: snapshot.side,
    position: snapshot.position,
    apiIndex: snapshot.side === 0 ? snapshot.position : snapshot.position + 6,
    shipId: snapshot.shipId,
    masterId: snapshot.masterId,
    level: snapshot.level,
    hp,
    hpFloor: safeNum(snapshot.hpFloor, 0),
    maxHp: snapshot.maxHp,
    baseFirepower: safeNum(snapshot.baseFirepower, snapshot.firepower),
    firepower: snapshot.firepower,
    baseTorpedo: safeNum(snapshot.baseTorpedo, snapshot.torpedo),
    torpedo: snapshot.torpedo,
    aa: snapshot.aa,
    baseAsw: snapshot.baseAsw,
    asw: snapshot.asw,
    armor: snapshot.armor,
    luck: snapshot.luck,
    accuracy: safeNum(snapshot.accuracy, 0),
    evasion: safeNum(snapshot.evasion, 0),
    range: snapshot.range,
    ammoModifier: snapshot.ammoModifier,
    shipType: snapshot.shipType,
    targetKind: snapshot.targetKind ?? (snapshot.side === 1 ? enemyTargetKind(snapshot.masterId, snapshot.shipType) : shipTargetKind(snapshot.shipType)),
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

function isOperable(unit: BattleUnit) {
  return unit.hp > unit.hpFloor;
}

function isEffectivelySunk(unit: BattleUnit) {
  return unit.hp <= unit.hpFloor;
}

function canShell(unit: BattleUnit, phase: "day" | "night") {
  if (!isOperable(unit)) return false;
  if (phase === "night") {
    if (!isCarrierNightAttackShip(unit)) return true;
    return canCarrierNightAirAttack(unit) || canSwordfishNightAttack(unit) || canStandardCarrierNightShelling(unit);
  }
  if (!CARRIER_TYPES.has(unit.shipType)) return true;

  const state = damageState(unit);
  if (unit.shipType === 18 ? state >= 3 : state >= 2) return false;
  if (!unit.airSlots.some((slot) => slot.count > 0 && OPENING_AIRSTRIKE_TYPES.has(slot.equipTypeId))) {
    return false;
  }
  return true;
}

function randomAlive(units: BattleUnit[], rng: BattleRng) {
  const living = units.filter(isOperable);
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

function formationModifier(
  formation: number,
  phase: "shelling" | "torpedo" | "night" | "asw",
  formulaContext: BattleFormulaContext = NO_BATTLE_FORMULA_CONTEXT
) {
  if (phase !== "night" && formulaContext.combinedType) {
    return combinedFormationModifierFor(formation, phase);
  }
  if (phase === "asw") return formationModifierFor(formation, "shelling");
  return formationModifierFor(formation, phase);
}

function combinedFleetTypeForBattle(value: number): CombinedFormulaFleetType {
  return value === 2 || value === 3 ? value : 1;
}

function combinedFormulaContext(combinedType: CombinedFormulaFleetType, defenderCombined: boolean): BattleFormulaContext {
  return { combinedType, defenderCombined };
}

function markFleetKind(units: BattleUnit[], fleetKind: BattleFleetKind) {
  for (const unit of units) unit.fleetKind = fleetKind;
  return units;
}

function unitFleetKind(unit: BattleUnit): CombinedFormulaFleetKind {
  if (unit.fleetKind === "escort" || unit.fleetKind === "enemyEscort") return unit.fleetKind;
  return unit.side === 0 ? "main" : "enemyMain";
}

function combinedBattlePowerBonus(
  formulaContext: BattleFormulaContext,
  attacker: BattleUnit,
  target: BattleUnit,
  phase: "shelling" | "torpedo" | "air"
) {
  if (!formulaContext.combinedType) return 0;
  return combinedPowerBonusFor({
    combinedType: formulaContext.combinedType,
    attackerFleet: unitFleetKind(attacker),
    attackerSide: attacker.side,
    defenderCombined: Boolean(formulaContext.defenderCombined),
    phase,
    targetFleet: unitFleetKind(target)
  });
}

function combinedBattleAccuracyModifier(
  formulaContext: BattleFormulaContext,
  attacker: BattleUnit,
  _target: BattleUnit,
  phase: "shelling" | "torpedo" | "air" | "asw" | "night",
  formation: number
) {
  if (!formulaContext.combinedType) return 1;
  return combinedAccuracyModifierFor({
    combinedType: formulaContext.combinedType,
    attackerFleet: unitFleetKind(attacker),
    phase,
    formation,
    defenderCombined: Boolean(formulaContext.defenderCombined)
  });
}

function damageState(unit: BattleUnit) {
  if (!isOperable(unit)) return 4;
  if (unit.hp <= unit.maxHp * 0.25) return 3;
  if (unit.hp <= unit.maxHp * 0.5) return 2;
  if (unit.hp <= unit.maxHp * 0.75) return 1;
  return 0;
}

function damageStateModifier(unit: BattleUnit) {
  return damageStateModifierFor(unit.hp, unit.maxHp);
}

function ammoModifier(ammo: number, maxAmmo: number) {
  if (maxAmmo <= 0) return 1;
  return Math.min(1, Math.floor((Math.max(0, ammo) / maxAmmo) * 100) / 50);
}

function battleFormation(input: BattleInput) {
  return Math.max(1, Math.min(5, Math.trunc(safeNum(input.formation, 1))));
}

function battleEngagement(input: BattleInput) {
  return Math.max(1, Math.min(4, Math.trunc(safeNum(input.engagement, 1))));
}

function sortieDeck(save: SaveState) {
  return save.decks.find((deck) => deck.id === save.sortieSession?.deckId) || save.decks[0];
}

function fixedShipIds(shipIds: number[]) {
  return normalizeDeckShipIds(shipIds);
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

function leveledStat(value: unknown, level: number, fallback = 0) {
  if (!Array.isArray(value)) return safeNum(value, fallback);
  const base = safeNum(value[0], fallback);
  const max = safeNum(value[1], base);
  const normalized = Math.max(1, Math.min(99, Math.trunc(level)));
  const progress = normalized >= 99 ? 1 : (normalized - 1) / 98;
  return Math.round(base + (max - base) * progress);
}

function shipEvasion(master: (typeof masterData.api_mst_ship)[number] | undefined, level: number) {
  return leveledStat((master as { api_kaih?: unknown } | undefined)?.api_kaih, level, 0);
}

function shipDisplayEvasion(ship: Ship, equipmentEvasion: number) {
  return ship.level + equipmentEvasion;
}

function shipBaseAsw(master: (typeof masterData.api_mst_ship)[number] | undefined, level: number) {
  const explicit = statValue((master as { api_tais?: unknown } | undefined)?.api_tais, -1);
  if (explicit >= 0) return explicit;
  const shipType = safeNum(master?.api_stype, 0);
  const normalizedLevel = Math.max(1, Math.min(99, Math.trunc(level)));
  if (shipType === 1) return 54 + Math.floor(normalizedLevel / 2);
  if ([2, 3, 4, 21, 22].includes(shipType)) return normalizedLevel;
  if ([7, 10, 16, 17].includes(shipType)) return Math.floor(normalizedLevel / 2);
  return 0;
}

function shipModernization(ship: Ship) {
  const stats = ship.stats as Record<string, unknown> | undefined;
  const kyouka = Array.isArray(stats?.api_kyouka) ? stats.api_kyouka : [];
  return normalizeFixed(kyouka, 7, 0).map((value) => safeNum(value));
}

function slotMasterById(id: number) {
  return SLOT_MASTER_BY_ID.get(id);
}

function safeNum(value: unknown, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}
