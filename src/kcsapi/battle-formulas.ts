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
