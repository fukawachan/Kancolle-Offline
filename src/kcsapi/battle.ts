import { masterData } from "../master/data.js";
import { enemyTargetKind, shipTargetKind } from "../master/enemy-classification.js";
import {
  DEEP_SEA_SLOT_MASTERS,
  ENEMY_UNIT_TEMPLATES,
  fallbackEnemyShipIds,
  selectSortieDrop,
  selectSortieEncounter,
  type EnemyUnitTemplate,
  type SortieBattleRank
} from "../master/sortie-data.js";
import {
  selectEventSortieDrop,
  selectEventSortieEncounter
} from "../master/event-data.js";
import { requirePlayerShipStat } from "../master/ship-stat-growth.js";
import { normalizeDeckShipIds } from "../state/decks.js";
import type { SaveState, Ship, SlotItem } from "../state/types.js";
import {
  aaciPattern,
  selectAaciCandidates,
  selectActivatedAaci,
  type AaciEquipmentSummary,
  type AaciShipProfile
} from "./battle/aaci.js";
import {
  battleEndpointModeByKind,
  type BattlePhaseName
} from "./battle/data/endpoint-modes.js";
import {
  REPAIR_GODDESS_MASTER_ID,
  REPAIR_PERSONNEL_MASTER_ID,
  resolveDamageControlActivation,
  type DamageControlActivation
} from "./battle/damage-control.js";
import type { DamageProtectionContext } from "./battle/damage.js";
import { isJetEquipmentType } from "./battle/capabilities.js";
import {
  landBaseWavePayload,
  planLandBaseDispatch,
  resolveLandAttackSpecialModifier,
  type LandBaseRangeEvidence,
  type LandBaseWaveAssignment,
  type LandBaseWavePayload
} from "./battle/land-base.js";
import { combinedShellingFriendlySequence } from "./battle/phases/combined.js";
import {
  resolveSimultaneousTorpedoIntents,
  type TorpedoIntent
} from "./battle/phases/torpedo.js";
import { evaluateBattleRank } from "./battle/result.js";
import {
  resolveSupportAttack,
  supportAttackFlag,
  supportAttackKind
} from "./battle/support.js";
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
  carrierDayShellingPower,
  carrierNightCutInCandidates,
  carrierNightAirAttackPower,
  classifyNightAttack,
  criticalChance,
  daytimeShellingOrder,
  combinedAccuracyModifierFor,
  combinedFormationModifierFor,
  combinedPowerBonusFor,
  type CombinedFormulaFleetKind,
  type CombinedFormulaFleetType,
  damageStateModifierFor,
  engagementModifierFor,
  fighterPower,
  fleetAdjustedAntiAir,
  formationModifierFor,
  nightBattlePower,
  nightCutInActivationChance,
  ptImpAccuracyChance,
  resolveBattleDamage,
  selectContactAircraft,
  shipAdjustedAntiAir,
  stage1AircraftLoss
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

const FIGHTER_COMBAT_TYPES = new Set([6, 7, 8, 11, 45, 47, 48]);
const OPENING_AIRSTRIKE_TYPES = new Set([7, 8, 11, 47]);
const RECON_AIRCRAFT_TYPES = new Set([9, 10, 11, 41]);
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
const SLOT_MASTER_BY_ID = new Map<number, (typeof masterData.api_mst_slotitem)[number]>(
  [...masterData.api_mst_slotitem, ...DEEP_SEA_SLOT_MASTERS].map((slot) => [slot.api_id, slot] as const)
);

type NightEquipmentState = {
  searchlight: boolean;
  starShell: boolean;
  searchlightPosition: number;
  starShellPosition: number;
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

function nightContactRecord(equipment: NightEquipmentPair): NonNullable<BattleRecord["nightContact"]> {
  return {
    touchPlane: [equipment.friendly.nightContactPlaneId, equipment.enemy.nightContactPlaneId],
    flarePos: [equipment.friendly.starShellPosition, equipment.enemy.starShellPosition]
  };
}

type SideFormations = {
  friendly: number;
  enemy: number;
};

type BattleFormulaContext = {
  combinedType?: CombinedFormulaFleetType;
  defenderCombined?: boolean;
};

const NO_BATTLE_FORMULA_CONTEXT: BattleFormulaContext = {};

export function createSortieBattle(save: SaveState, input: BattleInput = {}) {
  const deck = sortieDeck(save);
  const friendlyFormation = battleFormation(input);
  const seed = (save.sortieSession?.seed ?? 1) + safeNum(save.sortieSession?.state.battles, 0) * 9973 + friendlyFormation * 101;
  const rng = new BattleRng(seed);
  const endpoint = input.endpoint ?? "sortieDay";
  const phaseSequence = battlePhaseSequence(endpoint);
  const friendly = friendlyUnits(save, deck.shipIds);
  const sortie = sortieBattleContext(save, seed);
  const formation: [number, number, number] = [friendlyFormation, sortie?.formation ?? 1, battleEngagement(input)];
  const formations = sideFormations(formation);
  const enemy = enemyUnits(sortie?.shipIds ?? fallbackEnemyShipIds(save.sortieSession?.node ?? 1));
  const beforeF = fixedHp(friendly);
  const beforeE = fixedHp(enemy);

  let support: ReturnType<typeof supportPhase> | undefined;
  let airBase: { payload: LandBaseWavePayload[] | null; losses: AirBaseAircraftLossRecord[] } = {
    payload: null,
    losses: []
  };
  let kouku: KoukuPayload | null = null;
  let kouku2: KoukuPayload | null = null;
  let dayAirControl = NO_DAY_SHELLING_AIR_CONTROL;
  let openingTaisen: HougekiPayload | null = null;
  let openingAtack: RaigekiPayload | null = null;
  let hougeki1 = emptyHougeki(false);
  let hougeki2: HougekiPayload | null = null;
  let raigeki: RaigekiPayload | null = null;
  let night: HougekiPayload | undefined;
  let nightEquipment: NightEquipmentPair | undefined;

  for (const phase of phaseSequence) {
    switch (phase) {
      case "support":
        support = supportPhase(save, sortie, enemy);
        break;
      case "airBase":
        airBase = airBaseAttackPhase(save, sortie, enemy, formations, rng);
        break;
      case "kouku":
        kouku = airPhase(friendly, enemy, formations, rng);
        dayAirControl = dayShellingAirControl(kouku);
        break;
      case "kouku2":
        kouku2 = airPhase(friendly, enemy, formations, rng);
        break;
      case "openingTaisen":
        openingTaisen = openingAswPhase(friendly, enemy, formation[0], rng);
        break;
      case "openingAtack":
        openingAtack = openingTorpedoPhase(friendly, enemy, formations, rng, formation[2]);
        break;
      case "hougeki1":
        hougeki1 = shellingPhase(friendly, enemy, formations, rng, "day", formation[2], dayAirControl);
        break;
      case "hougeki2":
        hougeki2 = hasSecondShellingRound(friendly, enemy)
          ? shellingPhase(
            friendly,
            enemy,
            formations,
            rng,
            "day",
            formation[2],
            dayAirControl,
            undefined,
            NO_BATTLE_FORMULA_CONTEXT,
            2
          )
          : null;
        break;
      case "hougeki3":
        throw new Error(`Sortie endpoint ${endpoint} cannot execute hougeki3`);
      case "raigeki":
        raigeki = torpedoPhase(friendly, enemy, formations, rng, formation[2]);
        break;
      case "night":
        nightEquipment = {
          friendly: nightEquipmentState(friendly, rng, true),
          enemy: nightEquipmentState(enemy, rng, true)
        };
        night = shellingPhase(
          friendly,
          enemy,
          formations,
          rng,
          "night",
          formation[2],
          NO_DAY_SHELLING_AIR_CONTROL,
          nightEquipment
        );
        break;
      default:
        unreachableBattlePhase(phase);
    }
  }

  const airBaseAttack = airBase.payload;

  const afterF = fixedHp(friendly);
  const afterE = fixedHp(enemy);
  const result = battleResult(friendly, enemy, "sortie", sortie);
  const record: BattleRecord = {
    endpoint,
    mode: "sortie",
    phaseSequence,
    ...(nightEquipment ? { nightContact: nightContactRecord(nightEquipment) } : {}),
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
      kouku2,
      openingTaisen,
      openingAtack,
      hougeki1,
      hougeki2,
      hougeki3: null,
      raigeki,
      ...(night ? { night } : {})
    },
    units: {
      friendly: snapshotUnits(friendly),
      enemy: snapshotUnits(enemy)
    },
    sortie,
    result,
    aircraftLosses: aircraftLosses(friendly, enemy),
    support,
    airBaseAircraftLosses: airBase.losses,
    damageControlActivations: collectDamageControlActivations(friendly)
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
  const openingAtack = openingTorpedoPhase(friendly, enemy, formations, rng, formation[2]);
  const hougeki1 = shellingPhase(friendly, enemy, formations, rng, "day", formation[2], dayAirControl);
  const hougeki2 = hasSecondShellingRound(friendly, enemy)
    ? shellingPhase(
      friendly,
      enemy,
      formations,
      rng,
      "day",
      formation[2],
      dayAirControl,
      undefined,
      NO_BATTLE_FORMULA_CONTEXT,
      2
    )
    : null;
  const raigeki = torpedoPhase(friendly, enemy, formations, rng, formation[2]);
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
  const phaseSequence = battlePhaseSequence(endpoint);
  const sortie = sortieBattleContext(save, seed);
  const formation: [number, number, number] = [friendlyFormation, sortie?.formation ?? 1, battleEngagement(input)];
  const formations = sideFormations(formation);
  const enemy = markFleetKind(enemyUnits(sortie?.shipIds ?? fallbackEnemyShipIds(save.sortieSession?.node ?? 1)), "enemyMain");
  const enemyCombined = markFleetKind(enemyUnits(sortie?.enemyCombinedShipIds ?? []), "enemyEscort");
  const beforeF = fixedHp(friendly);
  const beforeEscort = fixedHp(escort);
  const beforeE = fixedHp(enemy);
  const beforeECombined = fixedHp(enemyCombined);

  const enemyCombinedActive = isEnemyCombinedActive(endpoint) && enemyCombined.length > 0;
  const formulaContext = combinedFormulaContext(combinedType, enemyCombinedActive);
  const escortTargets = enemyCombinedActive ? enemyCombined : enemy;
  const torpedoTargets = enemyCombinedActive ? [...enemy, ...enemyCombined] : enemy;
  const airFriendly = enemyCombinedActive ? [...friendly, ...escort] : friendly;
  const airEnemy = enemyCombinedActive ? [...enemy, ...enemyCombined] : enemy;
  const roles = combinedShellingFriendlySequence(combinedType, enemyCombinedActive);
  const combinedShellingRound = (round: 0 | 1 | 2) => {
    const role = roles[round];
    const attackers = role === "main" ? friendly : escort;
    const targets = enemyCombinedActive && role === "escort" ? escortTargets : enemy;
    return shellingPhase(
      attackers,
      targets,
      formations,
      rng,
      "day",
      formation[2],
      dayAirControl,
      undefined,
      formulaContext,
      round === 0 ? 1 : 2
    );
  };
  let secondCombinedShellingRound: boolean | undefined;
  const secondCombinedShellingRoundAvailable = () => {
    secondCombinedShellingRound ??=
      hasSecondShellingRound([...friendly, ...escort], [...enemy, ...escortTargets]);
    return secondCombinedShellingRound;
  };

  let support: ReturnType<typeof supportPhase> | undefined;
  let airBase: { payload: LandBaseWavePayload[] | null; losses: AirBaseAircraftLossRecord[] } = {
    payload: null,
    losses: []
  };
  let kouku: KoukuPayload | null = null;
  let kouku2: KoukuPayload | null = null;
  let dayAirControl = NO_DAY_SHELLING_AIR_CONTROL;
  let openingTaisen: HougekiPayload | null = null;
  let openingAtack: RaigekiPayload | null = null;
  let hougeki1 = emptyHougeki(false);
  let hougeki2: HougekiPayload | null = null;
  let hougeki3: HougekiPayload | null = null;
  let raigeki: RaigekiPayload | null = null;
  let night: HougekiPayload | undefined;
  let nightEquipment: NightEquipmentPair | undefined;

  for (const phase of phaseSequence) {
    switch (phase) {
      case "support":
        support = supportPhase(save, sortie, enemy);
        break;
      case "airBase":
        airBase = airBaseAttackPhase(save, sortie, enemy, formations, rng);
        break;
      case "kouku":
        kouku = airPhase(airFriendly, airEnemy, formations, rng, formulaContext);
        dayAirControl = dayShellingAirControl(kouku);
        break;
      case "kouku2":
        kouku2 = airPhase(airFriendly, airEnemy, formations, rng, formulaContext);
        break;
      case "openingTaisen":
        openingTaisen = openingAswPhase(escort, escortTargets, formation[0], rng, formulaContext);
        break;
      case "openingAtack":
        openingAtack = openingTorpedoPhase(escort, escortTargets, formations, rng, formation[2], formulaContext);
        break;
      case "hougeki1":
        secondCombinedShellingRoundAvailable();
        hougeki1 = combinedShellingRound(0);
        break;
      case "hougeki2":
        hougeki2 = secondCombinedShellingRoundAvailable() ? combinedShellingRound(1) : null;
        break;
      case "hougeki3":
        hougeki3 = secondCombinedShellingRoundAvailable() ? combinedShellingRound(2) : null;
        break;
      case "raigeki":
        raigeki = torpedoPhase(escort, torpedoTargets, formations, rng, formation[2], canClosingTorpedo, formulaContext);
        break;
      case "night": {
        const targets = shouldNightTargetEnemyEscort(enemyCombined) ? enemyCombined : enemy;
        nightEquipment = {
          friendly: nightEquipmentState(escort, rng, true),
          enemy: nightEquipmentState(targets, rng, true)
        };
        night = shellingPhase(escort, targets, formations, rng, "night", formation[2], NO_DAY_SHELLING_AIR_CONTROL, nightEquipment, formulaContext);
        break;
      }
      default:
        unreachableBattlePhase(phase);
    }
  }

  const airBaseAttack = airBase.payload;
  const afterF = fixedHp(friendly);
  const afterEscort = fixedHp(escort);
  const afterE = fixedHp(enemy);
  const afterECombined = fixedHp(enemyCombined);
  const result = battleResult(friendly, enemy, "combined", sortie, undefined, {
    friendlyAdditional: escort,
    enemyAdditional: enemyCombined
  });
  result.mvpCombined = result.rank === "E" ? 0 : escortMvp(escort);
  const record: BattleRecord = {
    endpoint,
    mode: "combined",
    phaseSequence,
    ...(nightEquipment ? { nightContact: nightContactRecord(nightEquipment) } : {}),
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
      kouku2,
      openingTaisen,
      openingAtack,
      hougeki1,
      hougeki2,
      hougeki3,
      raigeki,
      ...(night ? { night } : {})
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
    airBaseAircraftLosses: airBase.losses,
    damageControlActivations: collectDamageControlActivations([...friendly, ...escort])
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
  const nextResult = battleResult(
    record.mode === "combined" ? mainFriendly : friendly,
    mainEnemy,
    record.mode,
    record.sortie,
    practiceResultContext(record, mainEnemy),
    record.mode === "combined" ? { friendlyAdditional: friendly, enemyAdditional: enemyCombined } : undefined
  );
  const nextRecord: BattleRecord = {
    ...record,
    nightContact: nightContactRecord(nightEquipment),
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
    units: {
      friendly: snapshotUnits(mainFriendly),
      enemy: snapshotUnits(mainEnemy),
      ...(record.mode === "combined" ? {
        escort: snapshotUnits(friendly),
        enemyCombined: snapshotUnits(enemyCombined)
      } : {})
    },
    damageControlActivations: collectDamageControlActivations(
      record.mode === "combined" ? [...mainFriendly, ...friendly] : friendly
    ),
    result: {
      ...nextResult,
      mvpCombined: record.mode === "combined"
        ? nextResult.rank === "E" ? 0 : escortMvp(friendly)
        : record.result.mvpCombined
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
    api_flare_pos: [nightEquipment.friendly.starShellPosition, nightEquipment.enemy.starShellPosition],
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
  return endpoint != null && battleEndpointModeByKind(endpoint)?.enemyCombined === "active";
}

const SUPPORTED_BATTLE_PHASES = new Set<BattlePhaseName>([
  "support",
  "airBase",
  "kouku",
  "kouku2",
  "openingTaisen",
  "openingAtack",
  "hougeki1",
  "hougeki2",
  "hougeki3",
  "raigeki",
  "night"
]);

/**
 * Returns the exact ordered plan consumed by the battle executor.  Invalid or
 * duplicate configured phases fail closed instead of being silently ignored.
 */
export function battlePhaseSequence(endpoint: BattleEndpointKind): BattlePhaseName[] {
  const mode = battleEndpointModeByKind(endpoint);
  const defaultSequence: BattlePhaseName[] = endpoint.startsWith("combined")
    ? ["support", "kouku", "openingTaisen", "openingAtack", "hougeki1", "hougeki2", "hougeki3", "raigeki"]
    : ["support", "kouku", "openingTaisen", "openingAtack", "hougeki1", "hougeki2", "raigeki"];
  const sequence = mode?.phaseSequence ?? defaultSequence;
  const seen = new Set<BattlePhaseName>();
  return sequence.map((phase) => {
    if (!SUPPORTED_BATTLE_PHASES.has(phase)) {
      throw new Error(`Battle endpoint ${endpoint} declares unsupported phase ${String(phase)}`);
    }
    if (seen.has(phase)) {
      throw new Error(`Battle endpoint ${endpoint} declares duplicate phase ${phase}`);
    }
    seen.add(phase);
    return phase;
  });
}

function unreachableBattlePhase(phase: never): never {
  throw new Error(`Unsupported battle phase ${String(phase)}`);
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

type AirBaseBattleSlot = AirSlot & {
  areaId: number;
  baseId: number;
  squadronId: number;
  previousExp: number;
  previousCount: number;
};

function airBaseAttackPhase(
  save: SaveState,
  sortie: BattleSortieContext | undefined,
  enemy: BattleUnit[],
  formations: SideFormations,
  rng: BattleRng
): {
  payload: LandBaseWavePayload[];
  losses: AirBaseAircraftLossRecord[];
} {
  if (!sortie) return { payload: [], losses: [] };
  const slotsByBase = new Map<string, AirBaseBattleSlot[]>();
  for (const base of save.airBases) {
    slotsByBase.set(airBaseKey(base.areaId, base.baseId), base.squadrons.flatMap((squadron): AirBaseBattleSlot[] => {
      if (squadron.slotItemId <= 0 || squadron.count <= 0) return [];
      const item = save.slotItems.find((slotItem) => slotItem.id === squadron.slotItemId);
      const slotMaster = item ? slotMasterById(item.masterId) : undefined;
      if (!item || !slotMaster || !isAircraftSlotItem(slotMaster) || isJetEquipmentType(safeNum(slotMaster.api_type?.[2]))) return [];
      return [{
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
        proficiency: item.proficiencyExp,
        landBase: true
      }];
    }));
  }
  const plan = planLandBaseDispatch({
    areaId: sortie.areaId,
    assignments: landBaseWaveAssignments(save, sortie),
    bases: save.airBases.map((base) => ({
      areaId: base.areaId,
      baseId: base.baseId,
      actionKind: base.actionKind,
      distanceBase: base.distanceBase,
      distanceBonus: base.distanceBonus,
      activeSquadrons: slotsByBase.get(airBaseKey(base.areaId, base.baseId))?.length ?? 0
    }))
  });
  const payload: LandBaseWavePayload[] = [];
  const losses: AirBaseAircraftLossRecord[] = [];
  for (const wave of plan.waves) {
    const slots = slotsByBase.get(airBaseKey(wave.areaId, wave.baseId)) ?? [];
    const countsBefore = new Map(slots.map((slot) => [slot.squadronId, slot.count] as const));
    const unit = airBaseBattleUnit(wave.baseId, slots);
    const kouku = airPhase([unit], enemy, formations, rng);
    payload.push(landBaseWavePayload(
      wave.baseId,
      slots.map((slot) => ({ masterId: slot.slotMasterId, count: countsBefore.get(slot.squadronId) ?? 0 })),
      kouku ?? { api_plane_from: [[], []], api_stage1: null, api_stage2: null, api_stage3: null }
    ));
    losses.push(...airBaseLossRecords(slots, wave.wave, countsBefore));
  }
  return { payload, losses };
}

function airBaseKey(areaId: number, baseId: number) {
  return `${Math.trunc(areaId)}:${Math.trunc(baseId)}`;
}

function landBaseWaveAssignments(save: SaveState, sortie: BattleSortieContext): LandBaseWaveAssignment[] {
  const rawTargets = save.sortieSession?.state.airBaseTargets;
  if (!Array.isArray(rawTargets)) return [];
  const assignments: LandBaseWaveAssignment[] = [];
  for (const rawTarget of rawTargets) {
    if (!rawTarget || typeof rawTarget !== "object" || Array.isArray(rawTarget)) continue;
    const target = rawTarget as Record<string, unknown>;
    const baseId = Math.trunc(safeNum(target.baseId));
    const nodes = Array.isArray(target.nodes) ? target.nodes : [];
    const ranges = Array.isArray(target.ranges) ? target.ranges : [];
    for (let index = 0; index < Math.min(2, nodes.length); index += 1) {
      const node = Math.trunc(safeNum(nodes[index]));
      if (node !== sortie.node) continue;
      const rawRange = ranges[index];
      const range = rawRange && typeof rawRange === "object" && !Array.isArray(rawRange)
        ? rawRange as Record<string, unknown>
        : null;
      assignments.push({
        baseId,
        wave: (index + 1) as 1 | 2,
        targetNode: node,
        rangeEvidence: storedLandBaseRangeEvidence(range)
      });
    }
  }
  return assignments;
}

function storedLandBaseRangeEvidence(value: Record<string, unknown> | null): LandBaseRangeEvidence | null {
  if (!value) return null;
  const requiredDistance = Math.trunc(safeNum(value.requiredDistance));
  const source = typeof value.source === "string" ? value.source.trim() : "";
  const level = value.level === "protocol" || value.level === "published" ? value.level : null;
  return requiredDistance > 0 && source && level ? { requiredDistance, source, level } : null;
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
    startingHp: 1,
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

function airBaseLossRecords(
  slots: AirBaseBattleSlot[],
  wave: 1 | 2,
  countsBefore: ReadonlyMap<number, number>
): AirBaseAircraftLossRecord[] {
  return slots.map((slot) => ({
    areaId: slot.areaId,
    baseId: slot.baseId,
    wave,
    squadronId: slot.squadronId,
    slotItemId: slot.slotItemId,
    slotMasterId: slot.slotMasterId,
    previousExp: slot.previousExp,
    previousCount: Math.max(0, Math.trunc(countsBefore.get(slot.squadronId) ?? slot.previousCount)),
    currentCount: Math.max(0, Math.trunc(slot.count))
  }));
}

export function battleResultPayload(record: BattleRecord) {
  const mainSettlement = settlementFleet(record.settlement?.main, record.shipIds);
  const escortSettlement = settlementFleet(record.settlement?.escort, record.escortShipIds ?? []);
  const settledDropShipId = record.settlement?.dropShipId ?? record.result.dropShipId;
  const dropShip = record.mode === "practice" || settledDropShipId <= 0 ? null : {
    api_ship_id: settledDropShipId,
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
    api_search: [battleSearchStatus(friendly), battleSearchStatus(enemy)],
    api_escape_idx: null,
    api_stage_flag: stageFlag,
    api_air_base_attack: record.phases.airBaseAttack ?? null,
    api_kouku: kouku,
    api_kouku2: record.phases.kouku2 ?? null,
    api_support_flag: record.support?.arrived ? record.support.flag : 0,
    api_support_info: record.support?.arrived ? record.support.info : null,
    api_opening_taisen: record.phases.openingTaisen ?? null,
    api_opening_atack: record.phases.openingAtack ?? null,
    ...(record.phases.night ? {
      api_touch_plane: record.nightContact?.touchPlane ?? [-1, -1],
      api_flare_pos: record.nightContact?.flarePos ?? [-1, -1]
    } : {}),
    api_hougeki: record.phases.night ?? null,
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
    api_search: [battleSearchStatus([...friendly, ...escort]), battleSearchStatus([...enemy, ...enemyCombined])],
    api_escape_idx_combined: null,
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

/**
 * Search status 1 includes an active reconnaissance aircraft animation; 5 is
 * the successful no-aircraft variant used when the fleet has no usable scout.
 */
function battleSearchStatus(units: readonly BattleUnit[]) {
  return units.some((unit) => unit.airSlots.some((slot) =>
    slot.count > 0 && RECON_AIRCRAFT_TYPES.has(slot.equipTypeId)
  )) ? 1 : 5;
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
    api_stage3: stage3?.main ?? null,
    ...(stage3?.combined ? { api_stage3_combined: stage3.combined } : {}),
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
    .flatMap((unit) => unit.airSlots.filter((slot) => slot.count > 0 && !isJetEquipmentType(slot.equipTypeId)));
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
  let lost = 0;
  for (const slot of slots) {
    if (!FIGHTER_COMBAT_TYPES.has(slot.equipTypeId) || slot.count <= 0) continue;
    const count = stage1AircraftLoss({
      slotCount: slot.count,
      airState: Math.max(1, Math.min(5, Math.trunc(state))) as 1 | 2 | 3 | 4 | 5,
      side: side === "friendly" ? "allied" : "enemy",
      firstRoll: rng.next(),
      secondRoll: side === "enemy" ? rng.next() : undefined
    });
    slot.count -= count;
    lost += count;
  }
  return lost;
}

function contactPlanes(friendlyAir: AirSlot[], enemyAir: AirSlot[], state: number, rng: BattleRng): [number, number] {
  return [
    contactPlane(friendlyAir, state, rng),
    contactPlane(enemyAir, 6 - state, rng)
  ];
}

function contactPlane(slots: AirSlot[], ownAirState: number, rng: BattleRng) {
  const candidates = slots
    .filter((slot) => CONTACT_TYPES.has(slot.equipTypeId))
    .map((slot) => ({
      id: slot.slotMasterId,
      lineOfSight: safeNum(slot.slotMaster.api_saku),
      accuracy: safeNum(slot.slotMaster.api_houm),
      shipPosition: slot.shipPosition,
      slotIndex: slot.slotIndex,
      planeCount: slot.count
    }));
  return selectContactAircraft(
    candidates,
    Math.max(1, Math.min(5, Math.trunc(ownAirState))) as 1 | 2 | 3 | 4 | 5,
    () => rng.next()
  );
}

function antiAirCutIn(defenders: BattleUnit[], rng: BattleRng) {
  const candidates = defenders
    .filter(isOperable)
    .flatMap((unit) => selectAaciCandidates(
      unit.position - 1,
      aaciEquipmentSummary(unit),
      aaciShipProfile(unit)
    ))
    .sort((a, b) =>
      b.fixedBonus - a.fixedBonus ||
      b.modifier - a.modifier ||
      a.unitIndex - b.unitIndex ||
      a.kind - b.kind
    );
  if (candidates.length === 0) return undefined;
  const selected = selectActivatedAaci(candidates, (probability) => rng.chance(probability));
  if (!selected) return undefined;
  return {
    api_idx: selected.unitIndex,
    api_kind: selected.kind,
    api_use_items: selected.useItems
  };
}

function aaciEquipmentSummary(unit: BattleUnit): AaciEquipmentSummary {
  const summary: AaciEquipmentSummary = {
    highAngleGuns: [],
    aaGuns: [],
    radars: [],
    airRadars: [],
    specialAaGuns: [],
    aaDirectors: []
  };
  for (const slot of unit.equippedSlots) {
    const type2 = safeNum(slot.slotMaster.api_type?.[2]);
    const type3 = safeNum(slot.slotMaster.api_type?.[3]);
    if (HIGH_ANGLE_GUN_TYPES.has(type3)) summary.highAngleGuns.push(slot.slotMaster.api_id);
    if (AA_GUN_TYPES.has(type2)) {
      summary.aaGuns.push(slot.slotMaster.api_id);
      if (safeNum(slot.slotMaster.api_tyku) >= 9) summary.specialAaGuns!.push(slot.slotMaster.api_id);
    }
    if (RADAR_TYPES.has(type2)) summary.radars.push(slot.slotMaster.api_id);
    if (RADAR_TYPES.has(type2) && safeNum(slot.slotMaster.api_tyku) >= 2) {
      summary.airRadars!.push(slot.slotMaster.api_id);
    }
    if (type2 === 36) summary.aaDirectors!.push(slot.slotMaster.api_id);
  }
  return summary;
}

function aaciShipProfile(unit: BattleUnit): AaciShipProfile {
  const master = masterData.api_mst_ship.find((ship) => ship.api_id === unit.masterId);
  if (safeNum(master?.api_ctype) === 54) return "akizukiClass";
  if (unit.masterId === 428) return "mayaKaiNi";
  if (unit.masterId === 141) return "isuzuKaiNi";
  if (unit.masterId === 470) return "kasumiKaiNiB";
  if (unit.masterId === 418) return "satsukiKaiNi";
  if (unit.masterId === 548) return "fumizukiKaiNi";
  if (unit.masterId === 487) return "kinuKaiNi";
  return "generic";
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
  const aaMod = formationAaModifier(formation, formulaContext);
  const defenderSide = livingDefenders[0]?.side === 0 ? "allied" : "enemy";
  const fleetAa = fleetAdjustedAntiAir(
    livingDefenders.map(antiAirEquipment),
    aaMod,
    defenderSide
  );
  const cutIn = antiAirCutInEffect(airFire);
  let lost = 0;
  for (const slot of attackSlots) {
    const defender = rng.pick(livingDefenders);
    const equipment = antiAirEquipment(defender);
    const rawEquipmentAa = equipment.reduce((sum, item) => sum + item.antiAir, 0);
    const adjustedShipAa = shipAdjustedAntiAir(
      Math.max(0, defender.aa - rawEquipmentAa),
      equipment,
      defenderSide
    );
    const count = antiAirStage2Shootdown({
      slotCount: slot.count,
      shipAdjustedAntiAir: adjustedShipAa,
      fleetAdjustedAntiAir: fleetAa,
      cutInFixedBonus: cutIn.fixedBonus,
      cutInModifier: cutIn.modifier,
      proportionalTriggered: rng.chance(0.5),
      fixedTriggered: rng.chance(0.5),
      alliedMinimumGuarantee: defenderSide === "allied" ? 1 : 0
    });
    slot.count -= count;
    lost += count;
  }
  return lost;
}

function antiAirEquipment(unit: BattleUnit) {
  return unit.equippedSlots.map((slot) => ({
    masterId: slot.slotMaster.api_id,
    antiAir: Math.max(0, safeNum(slot.slotMaster.api_tyku)),
    type2: safeNum(slot.slotMaster.api_type?.[2]),
    type3: safeNum(slot.slotMaster.api_type?.[3]),
    improvement: slot.improvement
  }));
}

function antiAirCutInEffect(airFire: KoukuPayload["api_air_fire"] | undefined) {
  const pattern = airFire ? aaciPattern(airFire.api_kind) : null;
  return pattern ? { fixedBonus: pattern.fixedBonus, modifier: pattern.modifier } : { fixedBonus: 0, modifier: 1 };
}

function openingAirstrike(friendly: BattleUnit[], enemy: BattleUnit[], friendlyTouchPlane: number, enemyTouchPlane: number, rng: BattleRng) {
  const main = emptyKoukuStage3Payload();
  const combined = [...friendly, ...enemy].some(isEscortFleetUnit)
    ? emptyKoukuStage3Payload()
    : undefined;
  for (const attacker of friendly) {
    appendAirstrikes(main, combined, attacker, enemy, friendlyTouchPlane, rng);
  }
  for (const attacker of enemy) {
    appendAirstrikes(main, combined, attacker, friendly, enemyTouchPlane, rng);
  }
  return { main, combined };
}

function appendAirstrikes(
  main: KoukuStage3Payload,
  combined: KoukuStage3Payload | undefined,
  attacker: BattleUnit,
  targets: BattleUnit[],
  touchPlane: number,
  rng: BattleRng
) {
  if (!isOperable(attacker)) return;
  for (const slot of attacker.airSlots.filter((item) => item.count > 0 && OPENING_AIRSTRIKE_TYPES.has(item.equipTypeId))) {
    const target = randomAlive(targets, rng);
    if (!target) return;
    const hit = rng.chance(0.95);
    const critical = hit && rng.chance(0.125);
    const damage = hit ? airstrikeDamage(slot, target, attacker.ammoModifier, contactModifier(touchPlane, slot), critical, rng) : 0;
    if (damage > 0) {
      target.hp = Math.max(target.hpFloor, target.hp - damage);
      activateDamageControl(target);
      attacker.damageDealt += damage;
    }
    const targetIndex = target.position - 1;
    const stage3 = isEscortFleetUnit(target) ? combined ?? main : main;
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
  const landAttackSpecialModifier = slot.landBase
    ? resolveLandAttackSpecialModifier(slot.slotMasterId, target.targetKind).multiplier
    : 1;
  const preCapPower = landAttackSpecialModifier * typeModifier * (stat * Math.sqrt(Math.max(1, slot.count)) + 25);
  const outcomeRoll = rng.int(Math.max(1, target.hp));
  return resolveBattleDamage({
    preCapPower,
    cap: 170,
    armor: target.armor,
    armorRoll: rng.int(Math.max(1, Math.floor(target.armor))),
    ammoModifier,
    critical,
    postCapModifier: contact,
    targetHp: target.hp,
    targetSide: target.side,
    scratchRoll: outcomeRoll,
    protectionRoll: outcomeRoll,
    protection: damageProtectionFor(target)
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
  const searchlightPosition = units.find((unit) =>
    unit.hp >= 2 && countEquipTypes(unit, SEARCHLIGHT_TYPES) > 0
  )?.position;
  let starShellPosition = -1;
  for (const unit of units) {
    if (unit.hp <= 4 || countEquipTypes(unit, STAR_SHELL_TYPES) <= 0) continue;
    if (rng.chance(0.71)) {
      starShellPosition = unit.position - 1;
      break;
    }
  }
  const contact = nightContactState(units, rng, nightContactAllowedFlag);
  return {
    searchlight: searchlightPosition != null,
    starShell: starShellPosition >= 0,
    searchlightPosition: searchlightPosition == null ? -1 : searchlightPosition - 1,
    starShellPosition,
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
  formulaContext: BattleFormulaContext = NO_BATTLE_FORMULA_CONTEXT,
  attackerFleetSize = 6
): ShellingAttackProfile {
  if (phase === "day" && target.targetKind === "submarine" && canAswShell(attacker)) {
    return {
      preCapPower: aswAttackPower(attacker) *
        formationModifier(formation, "asw", formulaContext, attacker, attackerFleetSize) *
        engagementModifierFor(engagement) *
        damageStateModifier(attacker),
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
    if (target.targetKind === "submarine") {
      return {
        // Ordinary single-fleet night ASW is forced into the scratch-damage
        // branch. Combined-fleet night ASW can use real ASW power.
        preCapPower: formulaContext.combinedType
          ? aswAttackPower(attacker) * damageStateModifier(attacker)
          : 0,
        cap: 360,
        atType: 0,
        spType: 0,
        hits: 1,
        postCapModifier: 1,
        slotIds: aswAttackSlotIds(attacker),
        forceScratch: !formulaContext.combinedType
      };
    }
    if (target.targetKind === "installation") {
      return {
        preCapPower: nightBattlePower({
          firepower: attacker.firepower + (nightEquipment?.nightContactBonus ?? 0),
          torpedo: attacker.torpedo,
          damageModifier: damageStateModifier(attacker),
          targetKind: "installation",
          installationModifier: nightInstallationModifier(attacker)
        }) * formationModifier(formation, "night", formulaContext, attacker, attackerFleetSize),
        cap: 360,
        atType: 0,
        spType: 0,
        hits: 1,
        postCapModifier: 1,
        slotIds
      };
    }
    const carrierNightProfile = carrierNightAirAttackProfile(attacker, nightEquipment);
    if (carrierNightProfile) {
      return target.targetKind === "pt"
        ? { ...carrierNightProfile, ptEquipmentModifier: ptEquipmentModifier(attacker) }
        : carrierNightProfile;
    }
    const swordfishProfile = swordfishNightAttackProfile(attacker, nightEquipment);
    if (swordfishProfile) {
      return target.targetKind === "pt"
        ? { ...swordfishProfile, ptEquipmentModifier: ptEquipmentModifier(attacker) }
        : swordfishProfile;
    }
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
        damageModifier: damageStateModifier(attacker),
        targetKind: target.targetKind === "pt" ? "pt" : "surface"
      }) * formationModifier(formation, "night", formulaContext, attacker, attackerFleetSize),
      cap: 360,
      atType: 0,
      spType: attack.spType,
      hits: attack.hits,
      postCapModifier: attack.modifier,
      slotIds: nightAttackSlotIds(attacker, attack.spType, slotIds),
      ...(target.targetKind === "pt"
        ? { ptEquipmentModifier: ptEquipmentModifier(attacker) }
        : {})
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
  const carrierAircraftStats = carrierShellingAircraftStats(attacker);
  const base = isCarrierShelling
    ? carrierDayShellingPower({
      firepower: attacker.firepower,
      torpedo: carrierAircraftStats.torpedo,
      bombing: carrierAircraftStats.bombing,
      combinedPowerBonus
    })
    : attacker.firepower + 5 + combinedPowerBonus;
  const postCapModifier = apCutIn ? 1.3 : doubleAttack ? 1.2 : 1;
  return {
    preCapPower: base *
      formationModifier(formation, "shelling", formulaContext, attacker, attackerFleetSize) *
      engagementModifierFor(engagement) *
      damageStateModifier(attacker),
    cap: 220,
    atType: apCutIn ? 3 : doubleAttack ? 2 : 0,
    spType: 0,
    hits: doubleAttack ? 2 : 1,
    postCapModifier,
    slotIds: doubleAttack ? equippedSlotMasterIds(attacker, MAIN_GUN_TYPES, 2) : slotIds,
    ...(target.targetKind === "pt"
      ? { ptEquipmentModifier: ptEquipmentModifier(attacker) }
      : {})
  };
}

function ptEquipmentModifier(unit: BattleUnit) {
  const countType = (types: Set<number>) => unit.equippedSlots.filter((slot) =>
    types.has(safeNum(slot.slotMaster.api_type?.[2]))
  ).length;
  const smallMainGuns = countType(new Set([1]));
  const secondaryGuns = countType(SECONDARY_GUN_TYPES);
  const aaGuns = countType(AA_GUN_TYPES);
  const lookouts = unit.equippedSlots.filter((slot) =>
    slot.slotMaster.api_id === 129 || slot.slotMaster.api_id === 412
  ).length;
  const armedLandingCraft = unit.equippedSlots.filter((slot) =>
    slot.slotMaster.api_id === 408 || slot.slotMaster.api_id === 409
  ).length;
  const seaplanes = countType(new Set([11, 45]));
  const diveBombers = countType(new Set([7, 57]));
  return firstSecondModifier(smallMainGuns, 1.5, 1.4) *
    firstSecondModifier(aaGuns, 1.2, 1.2) *
    (lookouts > 0 ? 1.1 : 1) *
    (secondaryGuns > 0 ? 1.3 : 1) *
    firstSecondModifier(armedLandingCraft, 1.2, 1.1) *
    (seaplanes > 0 ? 1.2 : 1) *
    firstSecondModifier(diveBombers, 1.4, 1.3);
}

function ptAccuracyEquipmentModifier(unit: BattleUnit) {
  const countType = (types: Set<number>) => unit.equippedSlots.filter((slot) =>
    types.has(safeNum(slot.slotMaster.api_type?.[2]))
  ).length;
  const smallMainGuns = countType(new Set([1]));
  const secondaryGuns = countType(SECONDARY_GUN_TYPES);
  const aaGuns = countType(AA_GUN_TYPES);
  const lookouts = unit.equippedSlots.filter((slot) =>
    slot.slotMaster.api_id === 129 || slot.slotMaster.api_id === 412
  ).length;
  const armedLandingCraft = unit.equippedSlots.filter((slot) =>
    slot.slotMaster.api_id === 408 || slot.slotMaster.api_id === 409
  ).length;
  const seaplanes = countType(new Set([11, 45]));
  const diveBombers = countType(new Set([7, 57]));
  return firstSecondModifier(smallMainGuns, 1.3, 1.15) *
    firstSecondModifier(aaGuns, 1.45, 1.35) *
    (lookouts > 0 ? 1.75 : 1) *
    (secondaryGuns > 0 ? 1.55 : 1) *
    firstSecondModifier(armedLandingCraft, 1.45, 1.3) *
    (seaplanes > 0 ? 1.5 : 1) *
    firstSecondModifier(diveBombers, 1.375, 1.2);
}

function ptShipTypeAccuracyModifier(shipType: number) {
  if (shipType === 1 || shipType === 2) return 1;
  if (shipType === 3 || shipType === 4 || shipType === 21) return 0.82;
  return 0.7;
}

function firstSecondModifier(count: number, first: number, second: number) {
  if (count <= 0) return 1;
  return count === 1 ? first : first * second;
}

function nightInstallationModifier(unit: BattleUnit) {
  const landingCraft = countEquipTypes(unit, new Set([24]));
  const antiInstallationRockets = unit.equippedSlots.filter((slot) =>
    slot.slotMaster.api_id === 126 || safeNum(slot.slotMaster.api_type?.[2]) === 37
  ).length;
  const landingModifier = landingCraft <= 0 ? 1 : landingCraft === 1 ? 1.4 : landingCraft === 2 ? 1.8 : 2;
  const rocketModifier = antiInstallationRockets <= 0
    ? 1
    : antiInstallationRockets === 1
      ? 1.625
      : antiInstallationRockets === 2
        ? 2.15
        : antiInstallationRockets === 3
          ? 2.55
          : 3;
  return landingModifier * rocketModifier;
}

function carrierShellingAircraftStats(unit: BattleUnit) {
  return unit.airSlots.reduce(
    (stats, slot) => {
      if (slot.count <= 0 || !OPENING_AIRSTRIKE_TYPES.has(slot.equipTypeId)) return stats;
      stats.torpedo += Math.max(0, safeNum(slot.slotMaster.api_raig));
      stats.bombing += Math.max(0, safeNum(slot.slotMaster.api_baku));
      return stats;
    },
    { torpedo: 0, bombing: 0 }
  );
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
  const cutInCandidates = carrierNightCutInCandidates(carrierNightCutInCounts(aircraft));
  const cutIn = cutInCandidates[0] ?? null;
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
    fallbackSlotIds: normalSlotIds,
    nightCutInCandidates: cutInCandidates
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
    appendAswAttack(payload, attacker, submarineTargets, formation, rng, formulaContext, friendly.length);
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
  formulaContext: BattleFormulaContext = NO_BATTLE_FORMULA_CONTEXT,
  attackerFleetSize = 6
) {
  const target = randomAlive(targets, rng);
  if (!target) return;
  const hitChance = accuracyChance({
    attackerLevel: attacker.level,
    attackerLuck: attacker.luck,
    attackerAccuracy: attacker.accuracy + equipmentAsw(attacker, SONAR_TYPES),
    targetEvasion: target.evasion,
    formationModifier: formationModifier(formation, "asw", formulaContext, attacker, attackerFleetSize),
    attackAccuracyModifier: 1.1
  });
  const landed = rng.chance(hitChance);
  const critical = landed && rng.chance(criticalChance({
    attackerLuck: attacker.luck,
    attackerAccuracy: attacker.accuracy,
    targetEvasion: target.evasion
  }));
  const power = aswAttackPower(attacker) *
    formationModifier(formation, "asw", formulaContext, attacker, attackerFleetSize) *
    damageStateModifier(attacker);
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
  engagement: number,
  formulaContext: BattleFormulaContext = NO_BATTLE_FORMULA_CONTEXT
) {
  return torpedoPhase(friendly, enemy, formations, rng, engagement, canOpeningTorpedo, formulaContext);
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
  formulaContext: BattleFormulaContext = NO_BATTLE_FORMULA_CONTEXT,
  dayRound: 1 | 2 = 1
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
      if (friendlyAttacker) appendShellingAttack(payload, friendlyAttacker, enemy, formationForSide(formations, friendlyAttacker.side), rng, phase, engagement, friendlyNightEquipment, NO_DAY_SHELLING_AIR_CONTROL, formulaContext, friendly.length);
      if (enemyAttacker) appendShellingAttack(payload, enemyAttacker, friendly, formationForSide(formations, enemyAttacker.side), rng, phase, engagement, enemyNightEquipment, NO_DAY_SHELLING_AIR_CONTROL, formulaContext, enemy.length);
    }
    return payload;
  }

  const friendlyOrder = daytimeShellingOrder(
    friendly.filter((unit) => canShell(unit, "day")),
    rng,
    dayRound
  );
  const enemyOrder = daytimeShellingOrder(
    enemy.filter((unit) => canShell(unit, "day")),
    rng,
    dayRound
  );
  const turns = Math.max(friendlyOrder.length, enemyOrder.length);
  for (let turn = 0; turn < turns; turn += 1) {
    if (friendlyOrder[turn]) appendShellingAttack(payload, friendlyOrder[turn], enemy, formationForSide(formations, friendlyOrder[turn].side), rng, phase, engagement, undefined, dayAirControl, formulaContext, friendly.length);
    if (enemyOrder[turn]) appendShellingAttack(payload, enemyOrder[turn], friendly, formationForSide(formations, enemyOrder[turn].side), rng, phase, engagement, undefined, dayAirControl, formulaContext, enemy.length);
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
  formulaContext: BattleFormulaContext = NO_BATTLE_FORMULA_CONTEXT,
  attackerFleetSize = 6
) {
  if (!canShell(attacker, phase)) return;
  const target = shellingTarget(attacker, targets, phase, rng);
  if (!target) return;

  const profile = activateShellingProfile(
    shellingProfile(
      attacker,
      target,
      formation,
      phase,
      engagement,
      daySpottingEligible(attacker, phase, dayAirControl),
      nightEquipment,
      formulaContext,
      attackerFleetSize
    ),
    attacker,
    phase,
    rng,
    nightEquipment
  );
  if ((!profile.forceScratch && profile.preCapPower <= 0) || profile.hits <= 0) return;
  const damages: number[] = [];
  const cls: number[] = [];
  for (let hit = 0; hit < profile.hits; hit += 1) {
    const hitChance = target.targetKind === "pt"
      ? ptImpAccuracyChance({
        attackerLevel: attacker.level,
        attackerLuck: attacker.luck,
        attackerAccuracy: attacker.accuracy,
        targetEvasion: target.evasion,
        equipmentModifier: ptAccuracyEquipmentModifier(attacker),
        shipTypeModifier: ptShipTypeAccuracyModifier(attacker.shipType),
        night: phase === "night"
      })
      : accuracyChance({
        attackerLevel: attacker.level,
        attackerLuck: attacker.luck,
        attackerAccuracy: attacker.accuracy,
        targetEvasion: target.evasion,
        formationModifier: phase === "night"
          ? 1
          : formationModifier(formation, "shelling", formulaContext, attacker, attackerFleetSize),
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
      ? applyDamage(
        target,
        profile.preCapPower,
        profile.cap,
        attacker.ammoModifier,
        rng,
        attacker.side === 0 ? 1 : 0,
        critical,
        profile.postCapModifier,
        profile.ptEquipmentModifier
      )
      : 0;
    if (damage > 0) attacker.damageDealt += damage;
    damages.push(damage);
    cls.push(critical ? 2 : landed ? 1 : 0);
  }

  payload.api_at_eflag.push(attacker.side);
  payload.api_at_list.push(protocolFleetIndex(attacker));
  payload.api_at_type.push(profile.atType);
  payload.api_df_list.push(Array(damages.length).fill(protocolFleetIndex(target)));
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
      return canStandardCarrierNightShelling(attacker) && canAswShell(attacker)
        ? rng.pick(living)
        : undefined;
    }
    const submarines = living.filter((unit) => unit.targetKind === "submarine");
    if (submarines.length > 0 && canAswShell(attacker)) return rng.pick(submarines);
    const nonSubmarines = living.filter((unit) => unit.targetKind !== "submarine");
    return nonSubmarines.length > 0 ? rng.pick(nonSubmarines) : undefined;
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
  if (phase !== "night") return profile;
  const candidates = profile.nightCutInCandidates?.length
    ? profile.nightCutInCandidates
    : profile.spType > 1
      ? [{ spType: profile.spType, hits: profile.hits, modifier: profile.postCapModifier }]
      : [];
  if (candidates.length === 0) return profile;
  for (const candidate of candidates) {
    const chance = nightCutInActivationChance({
      level: attacker.level,
      luck: attacker.luck,
      flagship: attacker.position === 1,
      damageState: damageState(attacker),
      cutInKind: candidate.spType,
      searchlight: nightEquipment?.searchlight,
      starShell: nightEquipment?.starShell,
      skilledLookout: attacker.equippedSlots.some((slot) => slot.slotMaster.api_id === 129),
      torpedoSquadronLookout:
        (attacker.shipType === 2 || attacker.shipType === 3 || attacker.shipType === 4) &&
        attacker.equippedSlots.some((slot) => slot.slotMaster.api_id === 412)
    });
    if (rng.chance(chance)) {
      return {
        ...profile,
        spType: candidate.spType,
        hits: candidate.hits,
        postCapModifier: candidate.modifier
      };
    }
  }
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
  engagement: number,
  canFire: (unit: BattleUnit) => boolean = canClosingTorpedo,
  formulaContext: BattleFormulaContext = NO_BATTLE_FORMULA_CONTEXT
): RaigekiPayload | null {
  const payloadLength = [...friendly, ...enemy].some(isEscortFleetUnit) ? 12 : 6;
  const payload: RaigekiPayload = {
    api_frai: Array(payloadLength).fill(-1),
    api_erai: Array(payloadLength).fill(-1),
    api_fdam: Array(payloadLength).fill(0),
    api_edam: Array(payloadLength).fill(0),
    api_fydam: Array(payloadLength).fill(0),
    api_eydam: Array(payloadLength).fill(0),
    api_fcl: Array(payloadLength).fill(0),
    api_ecl: Array(payloadLength).fill(0),
    api_frai_flag: Array(payloadLength).fill(0),
    api_erai_flag: Array(payloadLength).fill(0),
    api_fbak_flag: Array(payloadLength).fill(0),
    api_ebak_flag: Array(payloadLength).fill(0)
  };
  const intents: TorpedoIntent<BattleUnit, BattleUnit>[] = [];
  appendTorpedoIntents(intents, friendly, enemy, formations, rng, engagement, canFire, formulaContext);
  appendTorpedoIntents(intents, enemy, friendly, formations, rng, engagement, canFire, formulaContext);
  if (intents.length === 0) return null;

  const resolution = resolveSimultaneousTorpedoIntents(
    intents,
    (target) => target.hp,
    (target) => target.hpFloor
  );
  for (const [target, hp] of resolution.hpAfter) {
    target.hp = hp;
    activateDamageControl(target);
  }

  for (const intent of resolution.intents) {
    const damage = intent.appliedDamage;
    intent.attacker.damageDealt += damage;
    if (intent.attackerSide === 0) {
      payload.api_frai[intent.attackerIndex] = intent.targetIndex;
      payload.api_frai_flag[intent.attackerIndex] = 1;
      payload.api_fydam[intent.attackerIndex] = damage;
      payload.api_edam[intent.targetIndex] += damage;
      payload.api_ecl[intent.targetIndex] = Math.max(
        payload.api_ecl[intent.targetIndex],
        intent.critical ? 2 : damage > 0 ? 1 : 0
      );
    } else {
      payload.api_erai[intent.attackerIndex] = intent.targetIndex;
      payload.api_erai_flag[intent.attackerIndex] = 1;
      payload.api_eydam[intent.attackerIndex] = damage;
      payload.api_fdam[intent.targetIndex] += damage;
      payload.api_fcl[intent.targetIndex] = Math.max(
        payload.api_fcl[intent.targetIndex],
        intent.critical ? 2 : damage > 0 ? 1 : 0
      );
    }
  }
  return payload;
}

function appendTorpedoIntents(
  intents: TorpedoIntent<BattleUnit, BattleUnit>[],
  attackers: BattleUnit[],
  targets: BattleUnit[],
  formations: SideFormations,
  rng: BattleRng,
  engagement: number,
  canFire: (unit: BattleUnit) => boolean,
  formulaContext: BattleFormulaContext
) {
  for (const attacker of attackers) {
    if (!canFire(attacker)) continue;
    const target = randomTorpedoTarget(targets, rng);
    if (!target) continue;
    const formation = formationForSide(formations, attacker.side);
    const power = (torpedoSalvoPower(attacker) + 5 + combinedBattlePowerBonus(formulaContext, attacker, target, "torpedo")) *
      formationModifier(formation, "torpedo", formulaContext, attacker, attackers.length) *
      engagementModifierFor(engagement) *
      damageStateModifier(attacker);
    const hitChance = torpedoAccuracyChance(attacker, target, formation, formulaContext, attackers.length);
    const landed = rng.chance(hitChance);
    const critical = landed && rng.chance(criticalChance({
      attackerLuck: attacker.luck,
      attackerAccuracy: attacker.accuracy,
      targetEvasion: target.evasion
    }));
    const rolledDamage = landed
      ? rollDamage(target, power, 180, attacker.ammoModifier, rng, target.side, critical)
      : 0;
    intents.push(Object.freeze({
      attacker,
      target,
      attackerSide: attacker.side,
      attackerIndex: protocolFleetIndex(attacker),
      targetIndex: protocolFleetIndex(target),
      rolledDamage,
      critical
    }));
  }
}

function torpedoAccuracyChance(
  attacker: BattleUnit,
  target: BattleUnit,
  formation: number,
  formulaContext: BattleFormulaContext = NO_BATTLE_FORMULA_CONTEXT,
  attackerFleetSize = 6
) {
  return accuracyChance({
    attackerLevel: attacker.level,
    attackerLuck: attacker.luck,
    attackerAccuracy: attacker.accuracy,
    targetEvasion: target.evasion,
    formationModifier: formationModifier(formation, "torpedo", formulaContext, attacker, attackerFleetSize),
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
  const livingSurfaceTargets = units.filter((unit) =>
    isOperable(unit) && (unit.targetKind === "surface" || unit.targetKind === "pt")
  );
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
  postCapModifier = 1,
  ptEquipmentModifier?: number
) {
  const damage = rollDamage(
    target,
    preCapPower,
    cap,
    ammoModifier,
    rng,
    targetSide,
    critical,
    postCapModifier,
    ptEquipmentModifier
  );
  target.hp = Math.max(target.hpFloor, target.hp - damage);
  activateDamageControl(target);
  return damage;
}

function rollDamage(
  target: BattleUnit,
  preCapPower: number,
  cap: number,
  ammoModifier: number,
  rng: BattleRng,
  targetSide: Side,
  critical = false,
  postCapModifier = 1,
  ptEquipmentModifier?: number
) {
  const outcomeRoll = rng.int(Math.max(1, target.hp));
  return resolveBattleDamage({
    preCapPower,
    cap,
    armor: target.armor,
    armorRoll: rng.int(Math.max(1, Math.floor(target.armor))),
    ammoModifier,
    critical,
    postCapModifier,
    ...(ptEquipmentModifier == null ? {} : { ptEquipmentModifier }),
    targetHp: target.hp,
    targetSide,
    scratchRoll: outcomeRoll,
    protectionRoll: outcomeRoll,
    protection: damageProtectionFor(target)
  });
}

function damageProtectionFor(target: BattleUnit): DamageProtectionContext {
  if (target.hpFloor > 0) return { mode: "forcedSurvival", hpFloor: target.hpFloor };
  if (target.side !== 0) return { mode: "none" };
  const startingHp = target.startingHp ?? target.maxHp;
  if (startingHp <= target.maxHp * 0.25 && hasUnusedDamageControl(target)) return { mode: "none" };
  return {
    mode: "sortie",
    flagship: target.position === 1,
    startedHeavilyDamaged: startingHp <= target.maxHp * 0.25
  };
}

function hasUnusedDamageControl(target: BattleUnit) {
  return target.equippedSlots.some((slot) =>
    slot.slotMaster.api_id === REPAIR_PERSONNEL_MASTER_ID || slot.slotMaster.api_id === REPAIR_GODDESS_MASTER_ID
  );
}

function activateDamageControl(target: BattleUnit) {
  if (target.side !== 0 || target.hp > 0 || target.damageControlActivated) return null;
  const activation = resolveDamageControlActivation({
    shipId: target.shipId,
    maxHp: target.maxHp,
    flagship: target.position === 1,
    equipment: target.equippedSlots.map((slot) => ({
      index: slot.index,
      slotItemId: slot.slotItemId,
      slotMasterId: slot.slotMaster.api_id
    }))
  });
  if (!activation) return null;

  target.hp = activation.restoredHp;
  if (activation.restoreFuelAmmo) target.ammoModifier = 1;
  target.damageControlActivated = true;
  target.damageControlActivations = [...(target.damageControlActivations ?? []), activation];
  target.equippedSlots = target.equippedSlots.filter((slot) => slot.slotItemId !== activation.slotItemId);
  const masterIndex = target.slots.indexOf(activation.slotMasterId);
  if (masterIndex >= 0) target.slots.splice(masterIndex, 1);
  return activation;
}

function collectDamageControlActivations(units: readonly BattleUnit[]) {
  const bySlotItemId = new Map<number, DamageControlActivation>();
  for (const unit of units) {
    for (const activation of unit.damageControlActivations ?? []) {
      bySlotItemId.set(activation.slotItemId, activation);
    }
  }
  return [...bySlotItemId.values()];
}

function battleResult(
  friendly: BattleUnit[],
  enemy: BattleUnit[],
  mode: BattleMode = "sortie",
  sortie?: BattleSortieContext,
  practice?: PracticeResultContext,
  additional?: {
    friendlyAdditional?: BattleUnit[];
    enemyAdditional?: BattleUnit[];
  }
): BattleResultRecord {
  const resultFriendly = [...friendly, ...(additional?.friendlyAdditional ?? [])];
  const resultEnemy = [...enemy, ...(additional?.enemyAdditional ?? [])];
  const rank = evaluateBattleRank({
    friendly: resultFleetState(resultFriendly),
    enemy: resultFleetState(resultEnemy)
  });
  // The result endpoint reports no MVP for an E-rank defeat.
  const mvp = rank === "E"
    ? 0
    : [...friendly].sort((a, b) => b.damageDealt - a.damageDealt || a.position - b.position)[0]?.position ?? 1;
  const baseExp = mode === "practice" && practice
    ? practiceBaseShipExp(practice.enemyShipLevels, rank, practiceSeededBonus(practice.seed))
    : sortie?.baseExp ?? legacySortieBaseExp(rank);
  const memberExp = mode === "practice" && practice
    ? practiceMemberExp(practice.playerLevel, practice.enemyLevel, rank)
    : baseExp * 2;
  const dropRank = rank === "S" || rank === "A" || rank === "B" ? rank : null;
  const drop = mode === "practice" || !sortie || !dropRank ? null : selectSortieDrop({
    mapId: sortie.mapId,
    node: sortie.node,
    rank: dropRank as SortieBattleRank,
    seed: sortie.seed,
    enemyFleetKey: sortie.enemyFleetKey
  }) ?? selectEventSortieDrop({
    mapId: sortie.mapId,
    node: sortie.node,
    rank: dropRank as SortieBattleRank,
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
    dropShipType: drop?.shipType ?? "",
    ...(drop?.maxOwned == null ? {} : { dropMaxOwned: drop.maxOwned })
  };
}

function resultFleetState(units: BattleUnit[]) {
  return {
    beforeHp: units.map((unit) => unit.startingHp ?? unit.maxHp),
    afterHp: units.map((unit) => unit.hp),
    effectiveSunkHp: units.map((unit) => unit.hpFloor)
  };
}

function legacySortieBaseExp(rank: BattleResultRecord["rank"]) {
  return rank === "S" ? 40 : rank === "A" ? 35 : rank === "B" ? 30 : 20;
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
  const equippedSlots: EquippedSlot[] = [...normalizeFixed(ship.slotIds, 5, -1), ship.exSlotId]
    .map((id, index) => {
      if (id <= 0) return null;
      const item = slotItems.find((slotItem) => slotItem.id === id);
      const slotMaster = item ? slotMasterById(item.masterId) : undefined;
      if (!item || !slotMaster) return null;
      const maxCount = Math.max(0, safeNum(maxeq[index]));
      const count = isAircraftSlotItem(slotMaster) ? Math.min(maxCount, currentOnSlot[index] ?? 0) : 0;
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
  const baseAsw = playerShipBaseAsw(ship.masterId, ship.level) + modernization[6];
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
    startingHp: ship.hp,
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
    evasion: playerShipEvasion(ship.masterId, ship.level) + equipSum("api_houk"),
    range: Math.max(safeNum(master?.api_leng, 1), ...slotMasters.map((item) => safeNum(item.api_leng, 0))),
    ammoModifier: ammoModifier(ship.ammo, ship.maxAmmo),
    shipType: safeNum(master?.api_stype, 2),
    targetKind: shipTargetKind(safeNum(master?.api_stype, 2)),
    slots: slots.length ? slots : [1],
    equippedSlots,
    airSlots,
    onSlot,
    originalOnSlot: [...onSlot],
    damageDealt: 0,
    statEvidence: playerGrowthStatEvidence()
  };
}

function sortieBattleContext(save: SaveState, seed: number): BattleSortieContext | undefined {
  const session = save.sortieSession;
  if (!session) return undefined;
  const encounter = selectEventSortieEncounter(session.areaId, session.mapNo, session.node, seed)
    ?? selectSortieEncounter(session.areaId, session.mapNo, session.node, seed);
  if (!encounter) return undefined;
  const visited = Array.isArray(session.state.visited)
    ? session.state.visited.filter((point): point is string => typeof point === "string")
    : [];
  const rawLanding = session.state.transportLanding;
  const transportLanding = rawLanding && typeof rawLanding === "object" && !Array.isArray(rawLanding)
    ? {
        mapId: Math.trunc(safeNum((rawLanding as Record<string, unknown>).mapId)),
        phase: Math.trunc(safeNum((rawLanding as Record<string, unknown>).phase)),
        point: String((rawLanding as Record<string, unknown>).point ?? ""),
        sRankPoints: Math.max(0, Math.trunc(safeNum((rawLanding as Record<string, unknown>).sRankPoints)))
      }
    : undefined;
  return {
    ...encounter,
    seed,
    visited,
    ...(transportLanding ? { transportLanding } : {})
  };
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

function enemyUnits(shipIds: readonly number[]) {
  if (shipIds.length > 6) {
    throw new Error(`Enemy fleet side contains ${shipIds.length} ships; main and escort must be split before battle`);
  }
  return shipIds.map((id, index) => enemyUnit(id, index + 1));
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
  const baseAsw = enemyTemplateStat(template, "asw");
  return {
    side: 1,
    position,
    apiIndex: position + 6,
    shipId: 0,
    masterId: template.masterId,
    level: template.level,
    hp: template.hp,
    startingHp: template.hp,
    hpFloor: 0,
    maxHp: template.hp,
    baseFirepower: template.firepower,
    firepower: template.firepower,
    baseTorpedo: template.torpedo,
    torpedo: template.torpedo,
    aa: template.aa,
    baseAsw,
    asw: baseAsw + equipSum("api_tais"),
      armor: template.armor,
      luck: template.luck,
      accuracy: safeNum(template.accuracy, equipSum("api_houm")),
      evasion: enemyTemplateStat(template, "evasion"),
      range: template.range,
    ammoModifier: 1,
    shipType: template.shipType,
    targetKind: enemyTargetKind(template.masterId, template.shipType),
    slots: template.slots.length ? [...template.slots] : [1501],
    equippedSlots,
    airSlots,
    onSlot,
    originalOnSlot: [...onSlot],
    damageDealt: 0,
    statEvidence: enemyTemplateStatEvidence(template)
  };
}

function practiceEnemyUnit(ship: PracticeRivalShip, position: number): BattleUnit {
  if (ENEMY_UNIT_TEMPLATES[ship.masterId]) {
    const unit = enemyUnit(ship.masterId, position);
    unit.level = Math.max(1, Math.trunc(ship.level));
    unit.hpFloor = 1;
    return unit;
  }
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
        proficiency: Math.max(0, Math.min(100, safeNum(ship.slotProficiencyExp?.[index], 0)))
      } satisfies EquippedSlot;
    })
    .filter((slot): slot is EquippedSlot => Boolean(slot));
  const slotMasters = equippedSlots.map((slot) => slot.slotMaster);
  const equipSum = (field: keyof (typeof masterData.api_mst_slotitem)[number]) =>
    slotMasters.reduce((sum, item) => sum + safeNum(item[field]), 0);
  const baseAsw = playerShipBaseAsw(ship.masterId, ship.level);
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
    startingHp: maxHp,
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
    evasion: playerShipEvasion(ship.masterId, ship.level) + equipSum("api_houk"),
    range: Math.max(safeNum(master?.api_leng, 1), ...slotMasters.map((slot) => safeNum(slot.api_leng, 0))),
    ammoModifier: 1,
    shipType: safeNum(master?.api_stype, 2),
    targetKind: enemyTargetKind(ship.masterId, safeNum(master?.api_stype, 2)),
    slots: slots.length ? slots : [1],
    equippedSlots,
    airSlots,
    onSlot: currentOnSlot,
    originalOnSlot: [...currentOnSlot],
    damageDealt: 0,
    statEvidence: playerGrowthStatEvidence()
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
      const baseAsw = playerShipBaseAsw(masterId, 1);
      return {
        side,
        position: index + 1,
        apiIndex: index + 1,
        shipId: record.shipIds[index],
        masterId,
        level: 1,
        hp,
        startingHp: record.before.fCombinedNowHps?.[index] || hp,
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
        evasion: playerShipEvasion(masterId, 1),
        range: safeNum(master?.api_leng, 1),
        ammoModifier: 1,
        shipType: safeNum(master?.api_stype, 2),
        targetKind: shipTargetKind(safeNum(master?.api_stype, 2)),
        slots: [1],
        equippedSlots: [],
        airSlots: [],
        onSlot: [0, 0, 0, 0, 0],
        originalOnSlot: [0, 0, 0, 0, 0],
        damageDealt: 0,
        statEvidence: playerGrowthStatEvidence()
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
      const baseAsw = playerShipBaseAsw(masterId, 1);
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
        evasion: playerShipEvasion(masterId, 1),
        range: safeNum(master?.api_leng, 1),
        ammoModifier: 1,
        shipType: safeNum(master?.api_stype, 2),
        targetKind: shipTargetKind(safeNum(master?.api_stype, 2)),
        slots: [1],
        equippedSlots: [],
        airSlots: [],
        onSlot: [0, 0, 0, 0, 0],
        originalOnSlot: [0, 0, 0, 0, 0],
        damageDealt: 0,
        statEvidence: playerGrowthStatEvidence()
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
    startingHp: unit.startingHp ?? unit.maxHp,
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
    originalOnSlot: [...unit.originalOnSlot],
    damageControlActivated: unit.damageControlActivated,
    damageControlActivations: unit.damageControlActivations?.map((activation) => ({ ...activation })),
    statEvidence: unit.statEvidence ? { ...unit.statEvidence } : undefined
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
    startingHp: snapshot.startingHp ?? snapshot.maxHp,
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
    damageDealt: 0,
    damageControlActivated: snapshot.damageControlActivated,
    damageControlActivations: snapshot.damageControlActivations?.map((activation) => ({ ...activation })),
    statEvidence: snapshot.statEvidence ? { ...snapshot.statEvidence } : undefined
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
  formulaContext: BattleFormulaContext = NO_BATTLE_FORMULA_CONTEXT,
  attacker?: BattleUnit,
  attackerFleetSize = 6
) {
  if (phase !== "night" && formulaContext.combinedType) {
    return combinedFormationModifierFor(formation, phase);
  }
  return formationModifierFor(
    formation,
    phase,
    attacker
      ? { fleetSize: attackerFleetSize, position: attacker.position }
      : undefined
  );
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

function isEscortFleetUnit(unit: BattleUnit) {
  return unit.fleetKind === "escort" || unit.fleetKind === "enemyEscort";
}

function protocolFleetIndex(unit: BattleUnit) {
  return unit.position - 1 + (isEscortFleetUnit(unit) ? 6 : 0);
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
  return Math.max(1, Math.min(6, Math.trunc(safeNum(input.formation, 1))));
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

function playerShipEvasion(masterId: number, level: number) {
  return requirePlayerShipStat(masterId, "evasion", level);
}

function playerShipBaseAsw(masterId: number, level: number) {
  return requirePlayerShipStat(masterId, "asw", level);
}

function playerGrowthStatEvidence() {
  return { evasion: "player-growth", asw: "player-growth", los: "player-growth" } as const;
}

function enemyTemplateStat(template: EnemyUnitTemplate, stat: "evasion" | "asw" | "los") {
  return template.statEvidence?.[stat] === "published" ? safeNum(template[stat], 0) : 0;
}

function enemyTemplateStatEvidence(template: EnemyUnitTemplate) {
  const evidence = (stat: "evasion" | "asw" | "los") =>
    template.statEvidence?.[stat] === "published" ? "enemy-static" as const : "unavailable" as const;
  return { evasion: evidence("evasion"), asw: evidence("asw"), los: evidence("los") };
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
