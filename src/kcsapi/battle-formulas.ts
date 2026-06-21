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
};

export type BattleFormulaPhase = "shelling" | "torpedo" | "antiAir" | "night";

export type AntiAirStage2Input = {
  slotCount: number;
  defenderAntiAir: number;
  fleetAntiAir: number;
  formationModifier: number;
  cutInFixedBonus?: number;
  cutInModifier?: number;
  randomFactor?: number;
};

export type NightBattlePowerInput = {
  firepower: number;
  torpedo: number;
  damageModifier?: number;
};

export type NightAttackKind = {
  spType: number;
  hits: number;
  modifier: number;
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

export function fighterPower(slots: FighterPowerSlot[]) {
  return slots.reduce((sum, slot) => {
    const count = Math.max(0, Math.trunc(slot.planeCount));
    if (count <= 0) return sum;
    const antiAir = Math.max(0, Number(slot.antiAir) || 0);
    const improvement = Math.sqrt(Math.max(0, Number(slot.improvement) || 0));
    const proficiency = proficiencyAirPowerBonus(slot.proficiency ?? 0);
    return sum + Math.floor(Math.sqrt(count) * (antiAir + improvement) + proficiency);
  }, 0);
}

export function airState(friendlyPower: number, enemyPower: number): AirState {
  const friendly = Math.max(0, Math.trunc(friendlyPower));
  const enemy = Math.max(0, Math.trunc(enemyPower));
  if (enemy === 0) return friendly > 0 ? { code: 1, label: "supremacy" } : { code: 3, label: "parity" };
  if (friendly >= enemy * 3) return { code: 1, label: "supremacy" };
  if (friendly >= enemy * 1.5) return { code: 2, label: "superiority" };
  if (friendly > enemy * (2 / 3)) return { code: 3, label: "parity" };
  if (friendly > enemy / 3) return { code: 4, label: "denial" };
  return { code: 5, label: "incapability" };
}

export function softCap(value: number, cap: number) {
  return value > cap ? cap + Math.sqrt(value - cap) : value;
}

export function formationModifierFor(formation: number, phase: BattleFormulaPhase) {
  if (phase === "night") return 1;
  const shelling: Record<number, number> = { 1: 1, 2: 0.8, 3: 0.7, 4: 0.6, 5: 0.6 };
  const torpedo: Record<number, number> = { 1: 1, 2: 0.8, 3: 0.7, 4: 0.6, 5: 0.6 };
  const antiAir: Record<number, number> = { 1: 1, 2: 1.2, 3: 1.6, 4: 1, 5: 1 };
  const table = phase === "shelling" ? shelling : phase === "torpedo" ? torpedo : antiAir;
  return table[Math.trunc(formation)] ?? 1;
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
  const base = Math.max(0, Number(input.firepower) || 0) + Math.max(0, Number(input.torpedo) || 0);
  return base * Math.max(0, Number(input.damageModifier ?? 1) || 0);
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

export function antiAirStage2Shootdown(input: AntiAirStage2Input) {
  const slotCount = Math.max(0, Math.trunc(input.slotCount));
  if (slotCount <= 0) return 0;
  const formation = Math.max(0, Number(input.formationModifier) || 0);
  const defenderAntiAir = Math.max(0, Number(input.defenderAntiAir) || 0);
  const fleetAntiAir = Math.max(0, Number(input.fleetAntiAir) || 0);
  const cutInFixedBonus = Math.max(0, Number(input.cutInFixedBonus ?? 0) || 0);
  const cutInModifier = Math.max(1, Number(input.cutInModifier ?? 1) || 1);
  const randomFactor = Math.max(0, Math.min(1, Number(input.randomFactor ?? 0) || 0));
  const effectiveAntiAir = defenderAntiAir * formation + fleetAntiAir * 0.2;
  const proportional = Math.floor(slotCount * randomFactor * effectiveAntiAir / 900);
  const fixed = Math.floor((effectiveAntiAir / 60 + cutInFixedBonus) * cutInModifier);
  return Math.min(slotCount, Math.max(0, proportional + fixed));
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

export function resolveBattleDamage(input: BattleDamageInput) {
  const capped = softCap(input.preCapPower, input.cap);
  const critical = input.critical ? 1.5 : 1;
  const attack = Math.floor(capped * critical) * input.postCapModifier;
  const defense = input.armor * 0.7 + input.armorRoll * 0.6;
  const rawDamage = Math.floor((attack - defense) * input.ammoModifier);
  const targetHp = Math.max(0, Math.trunc(input.targetHp));

  if (rawDamage > 0 && input.ammoModifier > 0) {
    return input.targetSide === 0 ? Math.min(Math.max(0, targetHp - 1), rawDamage) : Math.min(targetHp, rawDamage);
  }
  if (targetHp <= 1) return 0;
  const scratch = Math.floor(targetHp * 0.06);
  return Math.max(1, Math.min(targetHp - 1, scratch));
}

function proficiencyAirPowerBonus(proficiency: number) {
  const value = Math.max(0, Math.trunc(proficiency));
  if (value >= 7) return 9;
  if (value >= 6) return 6;
  if (value >= 4) return 3;
  return 0;
}
