export type TorpedoIntent<TAttacker, TTarget> = Readonly<{
  attacker: TAttacker;
  target: TTarget;
  attackerSide: 0 | 1;
  attackerIndex: number;
  targetIndex: number;
  rolledDamage: number;
  critical: boolean;
}>;

export type ResolvedTorpedoIntent<TAttacker, TTarget> = TorpedoIntent<TAttacker, TTarget> & {
  appliedDamage: number;
};

export type SimultaneousTorpedoResolution<TAttacker, TTarget> = {
  intents: ResolvedTorpedoIntent<TAttacker, TTarget>[];
  hpAfter: ReadonlyMap<TTarget, number>;
};

/**
 * Settles an immutable set of salvos against phase-start HP.  Target selection
 * and attacker eligibility therefore cannot be changed by an earlier salvo on
 * the opposite side.  The returned map is applied only after every intent has
 * been created.
 */
export function resolveSimultaneousTorpedoIntents<TAttacker, TTarget>(
  intents: readonly TorpedoIntent<TAttacker, TTarget>[],
  hpOf: (target: TTarget) => number,
  hpFloorOf: (target: TTarget) => number
): SimultaneousTorpedoResolution<TAttacker, TTarget> {
  const hpAfter = new Map<TTarget, number>();
  const resolved = intents.map((intent) => {
    const current = hpAfter.get(intent.target) ?? nonNegativeInteger(hpOf(intent.target));
    const floor = Math.min(current, nonNegativeInteger(hpFloorOf(intent.target)));
    const appliedDamage = Math.min(Math.max(0, current - floor), nonNegativeInteger(intent.rolledDamage));
    hpAfter.set(intent.target, current - appliedDamage);
    return { ...intent, appliedDamage };
  });
  return { intents: resolved, hpAfter };
}

function nonNegativeInteger(value: number) {
  return Math.max(0, Math.trunc(Number(value) || 0));
}
