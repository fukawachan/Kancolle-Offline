export type SupportAttackKind = "aerial" | "shelling" | "torpedo";

export type SupportAccuracyProfile = {
  evidence: {
    level: "statistical-baseline";
    source: string;
  };
  baseHitChance: Readonly<Record<SupportAttackKind, number>>;
  accuracyWeight: number;
  evasionWeight: number;
  criticalChance: number;
};

export const DEFAULT_SUPPORT_ACCURACY_PROFILE: SupportAccuracyProfile = Object.freeze({
  evidence: {
    level: "statistical-baseline" as const,
    source: "local configurable baseline; not asserted as an exact server formula"
  },
  baseHitChance: Object.freeze({ aerial: 0.65, shelling: 0.72, torpedo: 0.62 }),
  accuracyWeight: 0.002,
  evasionWeight: 0.0025,
  criticalChance: 0.15
});

export type SupportRng = {
  next(): number;
  chance(probability: number): boolean;
};

export type SupportUnitProfile = {
  shipType: number;
};

export function supportAttackFlag(units: readonly SupportUnitProfile[]) {
  const carrierLikeCount = units.filter((unit) => [7, 11, 16, 17, 18].includes(unit.shipType)).length;
  if (carrierLikeCount >= 3) return 1 as const;
  const torpedoSupportCount = units.filter((unit) => [2, 3, 4].includes(unit.shipType)).length;
  return torpedoSupportCount >= 4 ? 3 as const : 2 as const;
}

export function supportAttackKind(flag: number): SupportAttackKind {
  if (flag === 1) return "aerial";
  if (flag === 3) return "torpedo";
  return "shelling";
}

export function supportHitChance(
  kind: SupportAttackKind,
  attackerAccuracy: number,
  targetEvasion: number,
  profile: SupportAccuracyProfile = DEFAULT_SUPPORT_ACCURACY_PROFILE
) {
  const chance = profile.baseHitChance[kind]
    + finite(attackerAccuracy) * profile.accuracyWeight
    - finite(targetEvasion) * profile.evasionWeight;
  return Math.max(0.05, Math.min(0.95, chance));
}

export function resolveSupportAttack(input: {
  kind: SupportAttackKind;
  power: number;
  targetHp: number;
  attackerAccuracy: number;
  targetEvasion: number;
  rng: SupportRng;
  profile?: SupportAccuracyProfile;
}) {
  const profile = input.profile ?? DEFAULT_SUPPORT_ACCURACY_PROFILE;
  const chance = supportHitChance(
    input.kind,
    input.attackerAccuracy,
    input.targetEvasion,
    profile
  );
  if (!input.rng.chance(chance)) {
    return { hit: false, critical: 0 as const, damage: 0, hitChance: chance };
  }
  const critical = input.rng.chance(profile.criticalChance);
  const rawDamage = Math.floor(Math.max(0, finite(input.power)) * (0.2 + input.rng.next() * 0.25));
  const damage = Math.max(0, Math.min(Math.max(0, Math.trunc(input.targetHp)), rawDamage));
  return { hit: true, critical: (critical ? 2 : 1) as 1 | 2, damage, hitChance: chance };
}

function finite(value: number) {
  return Number.isFinite(value) ? value : 0;
}
