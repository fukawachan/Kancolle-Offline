import { describe, expect, it } from "vitest";
import { resolveSimultaneousTorpedoIntents } from "../src/kcsapi/battle/phases/torpedo.js";

describe("simultaneous torpedo intent settlement", () => {
  it("keeps both salvos when each attacker would sink the other", () => {
    const friendly = { hp: 20 };
    const enemy = { hp: 20 };
    const resolution = resolveSimultaneousTorpedoIntents([
      {
        attacker: friendly,
        target: enemy,
        attackerSide: 0 as const,
        attackerIndex: 0,
        targetIndex: 0,
        rolledDamage: 20,
        critical: false
      },
      {
        attacker: enemy,
        target: friendly,
        attackerSide: 1 as const,
        attackerIndex: 0,
        targetIndex: 0,
        rolledDamage: 20,
        critical: false
      }
    ], (target) => target.hp, () => 0);

    expect(resolution.intents).toHaveLength(2);
    expect(resolution.hpAfter.get(friendly)).toBe(0);
    expect(resolution.hpAfter.get(enemy)).toBe(0);
  });

  it("caps concentrated damage at phase-start HP without losing intent records", () => {
    const target = { hp: 30 };
    const intents = [0, 1].map((index) => ({
      attacker: { index },
      target,
      attackerSide: 0 as const,
      attackerIndex: index,
      targetIndex: 0,
      rolledDamage: 20,
      critical: false
    }));
    const resolution = resolveSimultaneousTorpedoIntents(intents, (unit) => unit.hp, () => 0);

    expect(resolution.intents.map((intent) => intent.appliedDamage)).toEqual([20, 10]);
    expect(resolution.hpAfter.get(target)).toBe(0);
  });
});
