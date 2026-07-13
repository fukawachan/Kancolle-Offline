export type DamageProtectionContext =
  | { mode: "none" }
  | {
      mode: "sortie";
      flagship: boolean;
      startedHeavilyDamaged: boolean;
    }
  | {
      mode: "forcedSurvival";
      hpFloor?: number;
    };

export type DamageOutcomeKind = "normal" | "scratch" | "protected" | "noDamage";

export type DamageOutcome = {
  damage: number;
  rawDamage: number;
  hpBefore: number;
  hpAfter: number;
  kind: DamageOutcomeKind;
  sinkingProtectionApplied: boolean;
  sunk: boolean;
};

export type ResolveDamageOutcomeInput = {
  rawDamage: number;
  targetHp: number;
  /** Integer roll in [0, targetHp - 1]. */
  scratchRoll?: number;
  /** Integer roll in [0, targetHp - 1]. */
  protectionRoll?: number;
  protection?: DamageProtectionContext;
};

/**
 * Resolves the HP consequence after attack power and armour have already been
 * calculated.  Keeping this separate makes scratch damage and sinking
 * protection independently testable and prevents callers from silently
 * folding a universal player-side HP floor into the normal damage path.
 */
export function resolveDamageOutcome(input: ResolveDamageOutcomeInput): DamageOutcome {
  const hpBefore = nonNegativeInteger(input.targetHp);
  const rawDamage = Math.trunc(Number(input.rawDamage) || 0);
  const protection = input.protection ?? { mode: "none" };

  if (hpBefore <= 0) return outcome(0, rawDamage, hpBefore, "noDamage", false);

  if (rawDamage <= 0) {
    const roll = boundedRoll(input.scratchRoll, hpBefore);
    const damage = Math.min(Math.max(0, hpBefore - 1), Math.floor(hpBefore * 0.06 + roll * 0.08));
    return outcome(damage, rawDamage, hpBefore, damage > 0 ? "scratch" : "noDamage", false);
  }

  const normalDamage = Math.min(hpBefore, rawDamage);
  if (normalDamage < hpBefore || !sinkingProtectionEligible(protection)) {
    return outcome(normalDamage, rawDamage, hpBefore, "normal", false);
  }

  if (protection.mode === "forcedSurvival") {
    const floor = Math.max(1, nonNegativeInteger(protection.hpFloor ?? 1));
    const damage = Math.max(0, hpBefore - Math.min(hpBefore, floor));
    return outcome(damage, rawDamage, hpBefore, "protected", true);
  }

  const roll = boundedRoll(input.protectionRoll, hpBefore);
  const damage = Math.min(Math.max(0, hpBefore - 1), Math.floor(hpBefore * 0.5 + roll * 0.3));
  return outcome(damage, rawDamage, hpBefore, "protected", true);
}

function sinkingProtectionEligible(context: DamageProtectionContext) {
  if (context.mode === "forcedSurvival") return true;
  if (context.mode === "sortie") return context.flagship || !context.startedHeavilyDamaged;
  return false;
}

function outcome(
  damage: number,
  rawDamage: number,
  hpBefore: number,
  kind: DamageOutcomeKind,
  sinkingProtectionApplied: boolean
): DamageOutcome {
  const applied = Math.min(hpBefore, nonNegativeInteger(damage));
  const hpAfter = Math.max(0, hpBefore - applied);
  return {
    damage: applied,
    rawDamage,
    hpBefore,
    hpAfter,
    kind,
    sinkingProtectionApplied,
    sunk: hpAfter === 0
  };
}

function boundedRoll(value: number | undefined, hp: number) {
  return Math.max(0, Math.min(Math.max(0, hp - 1), Math.trunc(Number(value) || 0)));
}

function nonNegativeInteger(value: number) {
  return Math.max(0, Math.trunc(Number(value) || 0));
}
