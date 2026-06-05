import { describe, expect, it } from "vitest";
import {
  airState,
  fighterPower,
  resolveBattleDamage,
  softCap
} from "../src/kcsapi/battle-formulas.js";

describe("battle formula helpers", () => {
  it("calculates fighter power and air state from current plane counts", () => {
    expect(fighterPower([{ planeCount: 20, antiAir: 5, proficiency: 0, improvement: 0 }])).toBe(22);

    expect(airState(150, 40)).toMatchObject({ code: 1, label: "supremacy" });
    expect(airState(60, 40)).toMatchObject({ code: 2, label: "superiority" });
    expect(airState(40, 40)).toMatchObject({ code: 3, label: "parity" });
    expect(airState(20, 40)).toMatchObject({ code: 4, label: "denial" });
    expect(airState(10, 40)).toMatchObject({ code: 5, label: "incapability" });
  });

  it("applies modern soft caps and armor rolls in the shared damage pipeline", () => {
    expect(softCap(260, 220)).toBeCloseTo(226.3246, 4);

    expect(resolveBattleDamage({
      preCapPower: 260,
      cap: 220,
      armor: 80,
      armorRoll: 10,
      ammoModifier: 1,
      critical: false,
      postCapModifier: 1,
      targetHp: 999,
      targetSide: 1
    })).toBe(164);
  });
});
