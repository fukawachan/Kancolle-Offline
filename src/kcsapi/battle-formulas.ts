import type { masterData } from "../master/data.js";
import { aircraftAirPowerBonus } from "./aircraft-proficiency.js";
import {
  resolveDamageOutcome,
  type DamageOutcome,
  type DamageProtectionContext
} from "./battle/damage.js";

export type AirStateCode = 1 | 2 | 3 | 4 | 5;

// Formula defaults follow the public Kancolle wiki/community reverse-engineered combat pages.

export type AirState = {
  code: AirStateCode;
  label: "supremacy" | "superiority" | "parity" | "denial" | "incapability";
};

export type FighterPowerSlot = {
  planeCount: number;
  antiAir: number;
  proficiency?: number;
  improvement?: number;
  slotMaster?: (typeof masterData.api_mst_slotitem)[number];
};

export type BattleFormulaPhase = "shelling" | "torpedo" | "antiAir" | "asw" | "night";
export type CombinedFormulaPhase = "shelling" | "torpedo" | "antiAir" | "asw" | "air";
export type CombinedPowerPhase = "shelling" | "torpedo" | "air";
export type CombinedFormulaFleetKind = "main" | "escort" | "enemyMain" | "enemyEscort";
export type CombinedFormulaFleetType = 1 | 2 | 3;

export type CombinedPowerBonusInput = {
  combinedType: CombinedFormulaFleetType;
  attackerFleet: CombinedFormulaFleetKind;
  attackerSide: 0 | 1;
  defenderCombined: boolean;
  phase: CombinedPowerPhase;
  targetFleet?: CombinedFormulaFleetKind;
};

export type CombinedAccuracyModifierInput = {
  combinedType: CombinedFormulaFleetType;
  attackerFleet: CombinedFormulaFleetKind;
  phase: "shelling" | "torpedo" | "air" | "asw" | "night";
  formation: number;
  defenderCombined: boolean;
};

export type AntiAirStage2Input = {
  slotCount: number;
  shipAdjustedAntiAir: number;
  fleetAdjustedAntiAir: number;
  shipResistance?: number;
  fleetResistance?: number;
  combinedFleetModifier?: number;
  cutInFixedBonus?: number;
  cutInModifier?: number;
  proportionalTriggered: boolean;
  fixedTriggered: boolean;
  alliedMinimumGuarantee?: number;
};

export type AdjustedAntiAirEquipment = {
  masterId: number;
  antiAir: number;
  type2: number;
  type3: number;
  improvement?: number;
};

export type NightBattlePowerInput = {
  firepower: number;
  torpedo: number;
  damageModifier?: number;
  targetKind?: "surface" | "submarine" | "installation" | "pt";
  installationModifier?: number;
};

export type NightAttackKind = {
  spType: number;
  hits: number;
  modifier: number;
};

export type CarrierNightAircraftModifierKind = "night" | "special";

export type CarrierNightAircraftPowerSlot = {
  count: number;
  firepower: number;
  torpedo: number;
  bombing: number;
  asw: number;
  improvement?: number;
  modifierKind: CarrierNightAircraftModifierKind;
};

export type CarrierNightAirAttackPowerInput = {
  baseFirepower: number;
  aircraft: CarrierNightAircraftPowerSlot[];
  nightContactBonus?: number;
  fitBonus?: number;
  damageModifier?: number;
};

export type CarrierNightCutInInput = {
  nightFighters: number;
  nightTorpedoBombers: number;
  nightDiveBombers: number;
  otherNightAircraft: number;
};

export type NightCutInActivationInput = {
  level: number;
  luck: number;
  flagship: boolean;
  damageState: number;
  cutInKind: number;
  searchlight?: boolean;
  starShell?: boolean;
  skilledLookout?: boolean;
  torpedoSquadronLookout?: boolean;
  enemySearchlight?: boolean;
  enemyStarShell?: boolean;
  typeCoefficient?: number;
};

export type OpeningAswEligibilityInput = {
  shipType: number;
  level: number;
  displayedAsw: number;
  equipmentAsw?: number;
  hasSonar: boolean;
  hasDepthCharge: boolean;
  hasAutogyro: boolean;
};

export type AswAttackPowerInput = {
  baseAsw: number;
  equipmentAsw: number;
  sonarCount: number;
  depthChargeCount: number;
};

export type BattleDamageInput = {
  preCapPower: number;
  cap: number;
  armor: number;
  armorRoll: number;
  ammoModifier: number;
  critical: boolean;
  postCapModifier: number;
  targetHp: number;
  targetSide: 0 | 1;
  scratchRoll?: number;
  protectionRoll?: number;
  protection?: DamageProtectionContext;
  ptEquipmentModifier?: number;
};

export type AccuracyChanceInput = {
  attackerLevel: number;
  attackerLuck: number;
  attackerAccuracy: number;
  targetEvasion: number;
  formationModifier?: number;
  engagementModifier?: number;
  attackAccuracyModifier?: number;
};

export type CriticalChanceInput = {
  attackerLuck: number;
  attackerAccuracy: number;
  targetEvasion: number;
  proficiencyCriticalBonus?: number;
  cutInModifier?: number;
};

export type PtAccuracyChanceInput = {
  attackerLevel: number;
  attackerLuck: number;
  attackerAccuracy: number;
  targetEvasion: number;
  equipmentModifier: number;
  shipTypeModifier: number;
  night: boolean;
};

export type Stage1AircraftLossInput = {
  slotCount: number;
  airState: AirStateCode;
  side: "allied" | "enemy";
  firstRoll: number;
  secondRoll?: number;
};

export type ContactAircraftCandidate = {
  id: number;
  lineOfSight: number;
  accuracy: number;
  shipPosition: number;
  slotIndex: number;
  planeCount: number;
};

export type CarrierDayShellingPowerInput = {
  firepower: number;
  torpedo: number;
  bombing: number;
  combinedPowerBonus?: number;
  otherPowerBonus?: number;
};

export type VanguardFormationContext = {
  fleetSize: number;
  position: number;
};

export type DayShellingOrderUnit = {
  range: number;
  position: number;
};

export class BattleRng {
  private value: number;

  constructor(seed: number) {
    this.value = seed >>> 0;
  }

  next() {
    this.value += 0x6d2b79f5;
    let t = this.value;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  int(maxExclusive: number) {
    return Math.floor(this.next() * Math.max(1, Math.trunc(maxExclusive)));
  }

  intInclusive(min: number, max: number) {
    const low = Math.trunc(Math.min(min, max));
    const high = Math.trunc(Math.max(min, max));
    return low + this.int(high - low + 1);
  }

  chance(probability: number) {
    return this.next() < Math.max(0, Math.min(1, probability));
  }

  pick<T>(values: T[]) {
    return values[this.int(values.length)];
  }
}

/**
 * Day shelling round one is ordered by range, with a fresh random order for
 * ships sharing the same range. Round two is always fleet position order.
 * Keeping this in a pure helper prevents the two rounds from silently sharing
 * one sorter again.
 */
export function daytimeShellingOrder<T extends DayShellingOrderUnit>(
  units: readonly T[],
  rng: Pick<BattleRng, "next">,
  round: 1 | 2
) {
  if (round === 2) {
    return [...units].sort((a, b) => a.position - b.position);
  }
  const ranges = [...new Set(units.map((unit) => unit.range))].sort((a, b) => b - a);
  return ranges.flatMap((range) => {
    const group = units
      .filter((unit) => unit.range === range)
      .sort((a, b) => a.position - b.position);
    for (let index = group.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(rng.next() * (index + 1));
      [group[index], group[swapIndex]] = [group[swapIndex], group[index]];
    }
    return group;
  });
}

export function fighterPower(slots: FighterPowerSlot[]) {
  return slots.reduce((sum, slot) => {
    const count = Math.max(0, Math.trunc(slot.planeCount));
    if (count <= 0) return sum;
    const antiAir = Math.max(0, Number(slot.antiAir) || 0);
    const improvement = Math.sqrt(Math.max(0, Number(slot.improvement) || 0));
    const proficiency = slot.slotMaster
      ? aircraftAirPowerBonus(slot.slotMaster, slot.proficiency ?? 0)
      : proficiencyAirPowerBonus(slot.proficiency ?? 0);
    return sum + Math.floor(Math.sqrt(count) * (antiAir + improvement) + proficiency);
  }, 0);
}

export function airState(friendlyPower: number, enemyPower: number): AirState {
  const friendly = Math.max(0, Math.trunc(friendlyPower));
  const enemy = Math.max(0, Math.trunc(enemyPower));
  if (enemy === 0) return friendly > 0 ? { code: 1, label: "supremacy" } : { code: 3, label: "parity" };
  // Use integer cross-products so exact 3:1, 3:2, 2:3, and 1:3
  // boundaries cannot drift through floating-point rounding.
  if (friendly >= enemy * 3) return { code: 1, label: "supremacy" };
  if (friendly * 2 >= enemy * 3) return { code: 2, label: "superiority" };
  if (friendly * 3 > enemy * 2) return { code: 3, label: "parity" };
  if (friendly * 3 > enemy) return { code: 4, label: "denial" };
  return { code: 5, label: "incapability" };
}

export function stage1AircraftLoss(input: Stage1AircraftLossInput) {
  const slotCount = Math.max(0, Math.trunc(Number(input.slotCount) || 0));
  if (slotCount <= 0) return 0;
  const alliedModifier: Record<AirStateCode, number> = { 1: 1, 2: 3, 3: 5, 4: 7, 5: 10 };
  const enemyModifier: Record<AirStateCode, number> = { 1: 10, 2: 7, 3: 5, 4: 3, 5: 1 };
  let rate: number;
  if (input.side === "allied") {
    const modifier = alliedModifier[input.airState];
    rate = (unitRoll(input.firstRoll) * modifier / 3 + modifier / 4) * 0.1;
  } else {
    const modifier = enemyModifier[input.airState];
    const first = inclusiveIntegerRoll(input.firstRoll, modifier);
    const second = inclusiveIntegerRoll(input.secondRoll ?? input.firstRoll, modifier);
    rate = 0.035 * first + 0.065 * second;
  }
  return Math.min(slotCount, Math.floor(slotCount * rate));
}

export function selectContactAircraft(
  candidates: readonly ContactAircraftCandidate[],
  ownAirState: AirStateCode,
  nextRoll: () => number
) {
  const selectionDivisor: Partial<Record<AirStateCode, number>> = { 1: 14, 2: 16, 4: 18 };
  const divisor = selectionDivisor[ownAirState];
  if (!divisor) return -1;
  const eligible = candidates
    .filter((candidate) => candidate.planeCount > 0 && candidate.lineOfSight > 0)
    .sort((a, b) =>
      b.accuracy - a.accuracy ||
      a.shipPosition - b.shipPosition ||
      a.slotIndex - b.slotIndex
    );
  if (eligible.length === 0) return -1;
  const initiationChance = Math.min(
    0.95,
    eligible.reduce(
      (sum, candidate) => sum + Math.sqrt(candidate.planeCount) * candidate.lineOfSight,
      0
    ) / (divisor * 2)
  );
  if (unitRoll(nextRoll()) >= initiationChance) return -1;
  for (const candidate of eligible) {
    const selectionChance = Math.min(1, candidate.lineOfSight / divisor);
    if (unitRoll(nextRoll()) < selectionChance) return candidate.id;
  }
  return -1;
}

export function softCap(value: number, cap: number) {
  return value > cap ? cap + Math.sqrt(value - cap) : value;
}

export function vanguardFormationRole(
  context: VanguardFormationContext
): "main" | "guard" {
  const fleetSize = Math.max(1, Math.min(7, Math.trunc(Number(context.fleetSize) || 1)));
  const position = Math.max(1, Math.min(fleetSize, Math.trunc(Number(context.position) || 1)));
  const mainFleetLastPosition = fleetSize <= 5 ? 2 : 3;
  return position <= mainFleetLastPosition ? "main" : "guard";
}

export function formationModifierFor(
  formation: number,
  phase: BattleFormulaPhase,
  vanguardContext?: VanguardFormationContext
) {
  if (Math.trunc(formation) === 6) {
    if (phase === "antiAir") return 1.1;
    if (phase === "torpedo") return 1;
    const role = vanguardContext ? vanguardFormationRole(vanguardContext) : "main";
    if (phase === "asw") return role === "main" ? 1 : 0.6;
    return role === "main" ? 0.5 : 1;
  }
  if (phase === "night") return 1;
  const shelling: Record<number, number> = { 1: 1, 2: 0.8, 3: 0.7, 4: 0.6, 5: 0.6 };
  const torpedo: Record<number, number> = { 1: 1, 2: 0.8, 3: 0.7, 4: 0.6, 5: 0.6 };
  const asw: Record<number, number> = { 1: 0.6, 2: 0.8, 3: 1.2, 4: 1.1, 5: 1.3 };
  const antiAir: Record<number, number> = { 1: 1, 2: 1.2, 3: 1.6, 4: 1, 5: 1 };
  const table =
    phase === "shelling" ? shelling :
      phase === "torpedo" ? torpedo :
        phase === "asw" ? asw : antiAir;
  return table[Math.trunc(formation)] ?? 1;
}

/** Public carrier daytime shelling pre-cap base formula. */
export function carrierDayShellingPower(input: CarrierDayShellingPowerInput) {
  const firepower = Math.max(0, Number(input.firepower) || 0);
  const torpedo = Math.max(0, Number(input.torpedo) || 0);
  const bombing = Math.max(0, Number(input.bombing) || 0);
  const combinedPowerBonus = Number(input.combinedPowerBonus) || 0;
  const otherPowerBonus = Number(input.otherPowerBonus) || 0;
  return Math.floor(
    (firepower + torpedo + Math.floor(bombing * 1.3) + combinedPowerBonus + otherPowerBonus) * 1.5
  ) + 55;
}

export function combinedFormationModifierFor(formation: number, phase: CombinedFormulaPhase) {
  const shelling: Record<number, number> = { 1: 0.8, 2: 1, 3: 0.7, 4: 1.1 };
  const torpedo: Record<number, number> = { 1: 0.7, 2: 0.9, 3: 0.6, 4: 1 };
  const asw: Record<number, number> = { 1: 1.3, 2: 1.1, 3: 1, 4: 0.7 };
  const antiAir: Record<number, number> = { 1: 1.1, 2: 1, 3: 1.5, 4: 1 };
  const air: Record<number, number> = { 1: 1, 2: 1, 3: 1, 4: 1 };
  const table =
    phase === "shelling" ? shelling :
      phase === "torpedo" ? torpedo :
        phase === "asw" ? asw :
          phase === "antiAir" ? antiAir : air;
  return table[Math.trunc(formation)] ?? 1;
}

export function combinedPowerBonusFor(input: CombinedPowerBonusInput) {
  if (input.phase === "air") return combinedAirPowerBonusFor(input);
  if (input.phase === "torpedo") return combinedTorpedoPowerBonusFor(input);
  return combinedShellingPowerBonusFor(input);
}

export function combinedAccuracyModifierFor(input: CombinedAccuracyModifierInput) {
  if (input.phase !== "shelling" || input.defenderCombined) return 1;
  const formation = Math.trunc(Number(input.formation) || 0);
  if (formation !== 4) return 1;
  if (input.combinedType === 1 && input.attackerFleet === "escort") return 1.1;
  if (input.combinedType === 2 && input.attackerFleet === "main") return 0.76;
  if (input.combinedType === 3 && input.attackerFleet === "main") return 0.65;
  return 1;
}

export function engagementModifierFor(engagement: number) {
  const table: Record<number, number> = {
    1: 1,
    2: 0.8,
    3: 1.2,
    4: 0.6
  };
  return table[Math.trunc(engagement)] ?? 1;
}

export function damageStateModifierFor(currentHp: number, maxHp: number) {
  const hp = Math.max(0, Number(currentHp) || 0);
  const max = Math.max(1, Number(maxHp) || 1);
  if (hp <= 0) return 0;
  if (hp <= max * 0.25) return 0.4;
  if (hp <= max * 0.5) return 0.7;
  return 1;
}

export function nightBattlePower(input: NightBattlePowerInput) {
  const targetKind = input.targetKind ?? "surface";
  if (targetKind === "submarine") return 0;
  const firepower = Math.max(0, Number(input.firepower) || 0);
  const torpedo = targetKind === "installation" ? 0 : Math.max(0, Number(input.torpedo) || 0);
  const installationModifier = targetKind === "installation"
    ? Math.max(0, Number(input.installationModifier ?? 1) || 0)
    : 1;
  return (firepower + torpedo) *
    installationModifier *
    Math.max(0, Number(input.damageModifier ?? 1) || 0);
}

export function classifyNightAttack(input: {
  mainGuns: number;
  secondaryGuns: number;
  torpedoes: number;
  nightAircraft: number;
}): NightAttackKind {
  if (input.torpedoes >= 2) return { spType: 5, hits: 2, modifier: 1.5 };
  if (input.mainGuns >= 1 && input.torpedoes >= 1) return { spType: 4, hits: 2, modifier: 1.3 };
  if (input.mainGuns >= 2 || (input.mainGuns >= 1 && input.secondaryGuns >= 1) || input.secondaryGuns >= 2) {
    return { spType: 1, hits: 2, modifier: 1.2 };
  }
  return { spType: 0, hits: 1, modifier: 1 };
}

export function carrierNightAirAttackPower(input: CarrierNightAirAttackPowerInput) {
  const aircraft = input.aircraft.filter((slot) => Math.trunc(Number(slot.count) || 0) > 0);
  const baseFirepower = Math.max(0, Number(input.baseFirepower) || 0);
  const aircraftStats = aircraft.reduce(
    (sum, slot) =>
      sum +
      Math.max(0, Number(slot.firepower) || 0) +
      Math.max(0, Number(slot.torpedo) || 0) +
      Math.max(0, Number(slot.bombing) || 0),
    0
  );
  const nightContact = Math.max(0, Number(input.nightContactBonus ?? 0) || 0);
  const fitBonus = Number(input.fitBonus ?? 0) || 0;
  const aircraftModifier = aircraft.reduce((sum, slot) => {
    const count = Math.max(0, Math.trunc(Number(slot.count) || 0));
    const statSum =
      Math.max(0, Number(slot.firepower) || 0) +
      Math.max(0, Number(slot.torpedo) || 0) +
      Math.max(0, Number(slot.bombing) || 0) +
      Math.max(0, Number(slot.asw) || 0);
    const improvement = Math.sqrt(Math.max(0, Number(slot.improvement ?? 0) || 0));
    const [countFactor, statFactor] = slot.modifierKind === "night" ? [3, 0.45] : [0, 0.3];
    return sum + countFactor * count + statFactor * statSum * Math.sqrt(count) + improvement;
  }, 0);
  return (baseFirepower + aircraftStats + nightContact + fitBonus + aircraftModifier) *
    Math.max(0, Number(input.damageModifier ?? 1) || 0);
}

export function classifyCarrierNightCutIn(input: CarrierNightCutInInput): NightAttackKind | null {
  return carrierNightCutInCandidates(input)[0] ?? null;
}

export function carrierNightCutInCandidates(input: CarrierNightCutInInput): NightAttackKind[] {
  const nightFighters = Math.max(0, Math.trunc(Number(input.nightFighters) || 0));
  const nightTorpedoBombers = Math.max(0, Math.trunc(Number(input.nightTorpedoBombers) || 0));
  const nightDiveBombers = Math.max(0, Math.trunc(Number(input.nightDiveBombers) || 0));
  const otherNightAircraft = Math.max(0, Math.trunc(Number(input.otherNightAircraft) || 0));
  const total = nightFighters + nightTorpedoBombers + nightDiveBombers + otherNightAircraft;
  const candidates: NightAttackKind[] = [];
  if (nightFighters >= 2 && nightTorpedoBombers >= 1) {
    candidates.push({ spType: 6, hits: 1, modifier: 1.25 });
  }
  if (nightFighters >= 1 && nightTorpedoBombers >= 1) {
    candidates.push({ spType: 6, hits: 1, modifier: 1.2 });
  }
  if (nightDiveBombers >= 1 && total >= 3) {
    candidates.push({ spType: 6, hits: 1, modifier: 1.2 });
  }
  if (nightFighters >= 1 && total >= 4) {
    candidates.push({ spType: 6, hits: 1, modifier: 1.18 });
  }
  return candidates;
}

export function nightCutInActivationChance(input: NightCutInActivationInput) {
  if (input.cutInKind <= 0) return 1;
  const level = Math.max(1, Math.trunc(Number(input.level) || 1));
  const luck = Math.max(0, Number(input.luck) || 0);
  const damageState = Math.trunc(Number(input.damageState) || 0);
  const luckAndLevel = luck < 50
    ? 15 + luck + Math.floor(0.75 * Math.sqrt(level))
    : 65 + Math.floor(Math.sqrt(luck - 50)) + Math.floor(0.8 * Math.sqrt(level));
  const correction =
    (input.flagship ? 15 : 0) +
    (damageState === 2 ? 18 : 0) +
    (input.searchlight ? 7 : 0) +
    (input.starShell ? 4 : 0) +
    (input.skilledLookout ? 5 : 0) +
    (input.torpedoSquadronLookout ? 8 : 0) -
    (input.enemySearchlight ? 5 : 0) -
    (input.enemyStarShell ? 10 : 0);
  const coefficients: Record<number, number> = {
    2: 140,
    3: 130,
    4: 115,
    5: 122,
    6: 122
  };
  const coefficient = Math.max(
    1,
    Number(input.typeCoefficient ?? coefficients[Math.trunc(input.cutInKind)] ?? 122) || 122
  );
  return clampProbability((luckAndLevel + correction) / coefficient, 0, 1);
}

export function antiAirStage2Shootdown(input: AntiAirStage2Input) {
  const slotCount = Math.max(0, Math.trunc(input.slotCount));
  if (slotCount <= 0) return 0;
  const shipAdjustedAntiAir = Math.max(0, Number(input.shipAdjustedAntiAir) || 0);
  const fleetAdjustedAntiAir = Math.max(0, Number(input.fleetAdjustedAntiAir) || 0);
  const shipResistance = Math.max(0, Number(input.shipResistance ?? 1) || 0);
  const fleetResistance = Math.max(0, Number(input.fleetResistance ?? 1) || 0);
  const combinedFleetModifier = Math.max(0, Number(input.combinedFleetModifier ?? 1) || 0);
  const cutInFixedBonus = Math.max(0, Number(input.cutInFixedBonus ?? 0) || 0);
  const cutInModifier = Math.max(1, Number(input.cutInModifier ?? 1) || 1);
  const minimumGuarantee = Math.max(0, Math.trunc(Number(input.alliedMinimumGuarantee ?? 0) || 0));
  const resistantShipAntiAir = Math.floor(shipAdjustedAntiAir * shipResistance);
  const resistantFleetAntiAir = Math.floor(fleetAdjustedAntiAir * fleetResistance);
  const proportional = input.proportionalTriggered
    ? Math.floor(resistantShipAntiAir * combinedFleetModifier * slotCount / 400)
    : 0;
  const fixed = input.fixedTriggered
    ? Math.floor(
      (resistantShipAntiAir + resistantFleetAntiAir) *
      combinedFleetModifier *
      cutInModifier /
      10
    )
    : 0;
  // The AACI fixed bonus augments the allied per-slot minimum, independently
  // of the Prop and Fixed 50% rolls.
  return Math.min(
    slotCount,
    Math.max(0, proportional + fixed + minimumGuarantee + cutInFixedBonus)
  );
}

export function shipAdjustedAntiAir(
  baseAntiAir: number,
  equipment: readonly AdjustedAntiAirEquipment[],
  side: "allied" | "enemy"
) {
  const base = Math.max(0, Number(baseAntiAir) || 0);
  const rawEquipmentAntiAir = equipment.reduce(
    (sum, item) => sum + Math.max(0, Number(item.antiAir) || 0),
    0
  );
  const weightedEquipment = equipment.reduce(
    (sum, item) => sum +
      Math.max(0, Number(item.antiAir) || 0) * shipAntiAirEquipmentWeight(item) +
      shipAntiAirImprovementBonus(item),
    0
  );
  const raw = side === "allied"
    ? base + weightedEquipment
    : 2 * Math.sqrt(base + rawEquipmentAntiAir) + weightedEquipment;
  return 2 * Math.floor(Math.max(0, raw) / 2);
}

export function fleetAdjustedAntiAir(
  equipmentByShip: readonly (readonly AdjustedAntiAirEquipment[])[],
  formationModifier: number,
  side: "allied" | "enemy"
) {
  const equipmentTotal = equipmentByShip.reduce(
    (fleetSum, equipment) => fleetSum + Math.floor(equipment.reduce(
      (shipSum, item) => shipSum +
        Math.max(0, Number(item.antiAir) || 0) * fleetAntiAirEquipmentWeight(item) +
        fleetAntiAirImprovementBonus(item),
      0
    )),
    0
  );
  const formed = Math.floor(
    Math.max(0, Number(formationModifier) || 0) * equipmentTotal
  );
  return side === "allied" ? (2 / 1.3) * formed : 2 * formed;
}

function shipAntiAirEquipmentWeight(item: AdjustedAntiAirEquipment) {
  if (item.type3 === 16 || item.type2 === 36) return 4;
  if ((item.type2 === 12 || item.type2 === 13) && item.antiAir >= 2) return 3;
  if (item.type2 === 21) return 6;
  return 0;
}

function fleetAntiAirEquipmentWeight(item: AdjustedAntiAirEquipment) {
  if (item.type3 === 16 || item.type2 === 36) return 0.35;
  if ((item.type2 === 12 || item.type2 === 13) && item.antiAir >= 2) return 0.4;
  if (item.type2 === 18) return 0.6;
  if (item.masterId === 9) return 0.25;
  if (item.type2 === 21) return 0.2;
  return 0;
}

function shipAntiAirImprovementBonus(item: AdjustedAntiAirEquipment) {
  const stars = Math.sqrt(Math.max(0, Number(item.improvement ?? 0) || 0));
  if (item.type2 === 21) return 4 * stars;
  if (item.type3 === 16 || item.type2 === 36) return 2 * stars;
  return 0;
}

function fleetAntiAirImprovementBonus(item: AdjustedAntiAirEquipment) {
  const stars = Math.sqrt(Math.max(0, Number(item.improvement ?? 0) || 0));
  if (item.type2 === 21 || item.type3 === 16 || item.type2 === 36) return stars;
  return 0;
}

export function canOpeningAswByStats(input: OpeningAswEligibilityInput) {
  const shipType = Math.trunc(Number(input.shipType) || 0);
  const level = Math.max(1, Math.trunc(Number(input.level) || 1));
  const displayedAsw = Math.max(0, Number(input.displayedAsw) || 0);
  const equipmentAsw = Math.max(0, Number(input.equipmentAsw ?? 0) || 0);
  if (shipType === 1) return (input.hasSonar && displayedAsw >= 60) || (equipmentAsw >= 4 && displayedAsw >= 75);
  if (input.hasAutogyro) return displayedAsw >= 50;
  return input.hasSonar && level >= 75 && displayedAsw >= 100;
}

export function aswAttackPower(input: AswAttackPowerInput) {
  const base = Math.sqrt(Math.max(0, Number(input.baseAsw) || 0)) * 2;
  const equipment = Math.max(0, Number(input.equipmentAsw) || 0) * 1.5;
  const synergy = input.sonarCount > 0 && input.depthChargeCount > 0 ? 1.15 : 1;
  return (13 + base + equipment) * synergy;
}

export function accuracyChance(input: AccuracyChanceInput) {
  const level = Math.sqrt(Math.max(1, Math.trunc(Number(input.attackerLevel) || 1)));
  const luck = Math.max(0, Number(input.attackerLuck) || 0);
  const accuracy = Number(input.attackerAccuracy) || 0;
  const evasion = Math.max(0, Number(input.targetEvasion) || 0);
  const rawPercent = 75 + level + accuracy + luck * 0.2 - evasion * 0.47535;
  const modified =
    rawPercent *
    Math.max(0, Number(input.formationModifier ?? 1) || 0) *
    Math.max(0, Number(input.engagementModifier ?? 1) || 0) *
    Math.max(0, Number(input.attackAccuracyModifier ?? 1) || 0);
  return clampProbability(modified / 100, 0.1, 0.97);
}

export function ptImpAccuracyChance(input: PtAccuracyChanceInput) {
  const hitTerm =
    75 +
    2 * Math.sqrt(Math.max(1, Math.trunc(Number(input.attackerLevel) || 1))) +
    1.5 * Math.sqrt(Math.max(0, Number(input.attackerLuck) || 0)) +
    (Number(input.attackerAccuracy) || 0);
  const equipment = Math.max(0, Number(input.equipmentModifier) || 0);
  const shipType = Math.max(0, Number(input.shipTypeModifier) || 0);
  const night = input.night ? 0.7 : 1;
  const evasion = Math.max(0, Number(input.targetEvasion) || 0);
  const finalPercent =
    Math.floor(Math.floor(hitTerm * 0.42 + 24) * equipment * shipType * night) -
    evasion +
    1;
  return clampProbability(finalPercent / 100, 0.1, 0.97);
}

export function criticalChance(input: CriticalChanceInput) {
  const luck = Math.max(0, Number(input.attackerLuck) || 0);
  const accuracy = Number(input.attackerAccuracy) || 0;
  const evasion = Math.max(0, Number(input.targetEvasion) || 0);
  const proficiency = Math.max(0, Number(input.proficiencyCriticalBonus ?? 0) || 0);
  const cutIn = Math.max(0, Number(input.cutInModifier ?? 1) || 0);
  const base = 0.085 + luck * 0.0015 + accuracy * 0.0015 - evasion * 0.0005 + proficiency;
  return clampProbability(base * cutIn, 0.02, 0.4);
}

export function resolveBattleDamageOutcome(input: BattleDamageInput): DamageOutcome {
  const capped = softCap(input.preCapPower, input.cap);
  const critical = input.critical ? 1.5 : 1;
  const ordinaryPostCapPower = Math.floor(capped * critical) * input.postCapModifier;
  const attack = input.ptEquipmentModifier == null
    ? ordinaryPostCapPower
    : ptImpShellingPower(ordinaryPostCapPower, input.ptEquipmentModifier);
  const defense = input.armor * 0.7 + input.armorRoll * 0.6;
  const rawDamage = Math.floor((attack - defense) * input.ammoModifier);
  return resolveDamageOutcome({
    rawDamage: input.ammoModifier > 0 ? rawDamage : 0,
    targetHp: input.targetHp,
    scratchRoll: input.scratchRoll,
    protectionRoll: input.protectionRoll,
    protection: input.protection ?? { mode: "none" }
  });
}

export function ptImpShellingPower(postCapPower: number, equipmentModifier = 1) {
  const power = Math.max(0, Number(postCapPower) || 0);
  return (power * 0.3 + Math.sqrt(power) + 10) *
    Math.max(0, Number(equipmentModifier) || 0);
}

/** Backwards-compatible numeric wrapper for formula consumers. */
export function resolveBattleDamage(input: BattleDamageInput) {
  return resolveBattleDamageOutcome(input).damage;
}

function combinedShellingPowerBonusFor(input: CombinedPowerBonusInput) {
  const combinedType = input.combinedType;
  if (input.attackerSide === 0) {
    if (input.defenderCombined) {
      const main: Record<CombinedFormulaFleetType, number> = { 1: 2, 2: 2, 3: -5 };
      const escort: Record<CombinedFormulaFleetType, number> = { 1: -5, 2: -5, 3: -5 };
      return input.attackerFleet === "escort" ? escort[combinedType] : main[combinedType];
    }
    const main: Record<CombinedFormulaFleetType, number> = { 1: 2, 2: 10, 3: -5 };
    const escort: Record<CombinedFormulaFleetType, number> = { 1: 10, 2: -5, 3: 10 };
    return input.attackerFleet === "escort" ? escort[combinedType] : main[combinedType];
  }

  if (input.defenderCombined) {
    return input.attackerFleet === "enemyEscort" ? -5 : 10;
  }

  const targetFleet = input.targetFleet ?? "main";
  if (targetFleet === "escort") {
    const enemyVsEscort: Record<CombinedFormulaFleetType, number> = { 1: 5, 2: -5, 3: 5 };
    return enemyVsEscort[combinedType];
  }
  const enemyVsMain: Record<CombinedFormulaFleetType, number> = { 1: 10, 2: 5, 3: 10 };
  return enemyVsMain[combinedType];
}

function combinedTorpedoPowerBonusFor(input: CombinedPowerBonusInput) {
  if (input.defenderCombined) return input.attackerSide === 0 ? 10 : 5;
  return input.attackerSide === 0 ? -5 : 10;
}

function combinedAirPowerBonusFor(input: CombinedPowerBonusInput) {
  if (!input.defenderCombined || input.attackerSide !== 0) return 0;
  const targetFleet = input.targetFleet ?? "enemyMain";
  return targetFleet === "enemyEscort" ? -20 : -10;
}

function clampProbability(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, Number.isFinite(value) ? value : min));
}

function unitRoll(value: number) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 0;
  return Math.max(0, Math.min(1 - Number.EPSILON, numeric));
}

function inclusiveIntegerRoll(value: number, max: number) {
  return Math.floor(unitRoll(value) * (Math.max(0, Math.trunc(max)) + 1));
}

function proficiencyAirPowerBonus(proficiency: number) {
  const value = Math.max(0, Math.trunc(proficiency));
  if (value >= 7) return 9;
  if (value >= 6) return 6;
  if (value >= 4) return 3;
  return 0;
}
