import { describe, expect, it } from "vitest";
import { resolveDamageOutcome } from "../src/kcsapi/battle/damage.js";

describe("battle damage outcome vectors", () => {
  it("uses the 6%-14% scratch distribution instead of a fixed six percent", () => {
    expect(resolveDamageOutcome({ rawDamage: 0, targetHp: 100, scratchRoll: 0 })).toMatchObject({
      damage: 6,
      hpAfter: 94,
      kind: "scratch"
    });
    expect(resolveDamageOutcome({ rawDamage: 0, targetHp: 100, scratchRoll: 99 })).toMatchObject({
      damage: 13,
      hpAfter: 87,
      kind: "scratch"
    });
  });

  it("allows ordinary enemy overkill while applying eligible sortie protection", () => {
    expect(resolveDamageOutcome({ rawDamage: 100, targetHp: 30 })).toMatchObject({
      damage: 30,
      hpAfter: 0,
      sunk: true,
      sinkingProtectionApplied: false
    });
    expect(resolveDamageOutcome({
      rawDamage: 100,
      targetHp: 30,
      protectionRoll: 0,
      protection: { mode: "sortie", flagship: false, startedHeavilyDamaged: false }
    })).toMatchObject({ damage: 15, hpAfter: 15, kind: "protected" });
    expect(resolveDamageOutcome({
      rawDamage: 100,
      targetHp: 30,
      protectionRoll: 29,
      protection: { mode: "sortie", flagship: false, startedHeavilyDamaged: false }
    })).toMatchObject({ damage: 23, hpAfter: 7, kind: "protected" });
  });

  it("does not protect a non-flagship that started heavily damaged", () => {
    expect(resolveDamageOutcome({
      rawDamage: 100,
      targetHp: 10,
      protection: { mode: "sortie", flagship: false, startedHeavilyDamaged: true }
    })).toMatchObject({ hpAfter: 0, sunk: true, sinkingProtectionApplied: false });
    expect(resolveDamageOutcome({
      rawDamage: 100,
      targetHp: 10,
      protection: { mode: "sortie", flagship: true, startedHeavilyDamaged: true }
    })).toMatchObject({ sunk: false, sinkingProtectionApplied: true });
  });
});
