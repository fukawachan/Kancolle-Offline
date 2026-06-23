import { describe, expect, it } from "vitest";
import { aaciPattern, selectGenericAaci } from "../src/kcsapi/battle/aaci.js";

describe("anti-air cut-in selection", () => {
  it("selects the highest-priority generic AACI pattern and use items", () => {
    expect(selectGenericAaci(0, {
      highAngleGuns: [3, 10],
      aaGuns: [37],
      radars: [30]
    })).toEqual({
      unitIndex: 0,
      kind: 5,
      fixedBonus: 4,
      modifier: 1.55,
      activationRate: 0.55,
      useItems: [3, 10, 30]
    });
  });

  it("falls back to lower-priority generic AACI patterns", () => {
    expect(selectGenericAaci(2, {
      highAngleGuns: [10],
      aaGuns: [37],
      radars: [30]
    })).toEqual({
      unitIndex: 2,
      kind: 7,
      fixedBonus: 3,
      modifier: 1.35,
      activationRate: 0.45,
      useItems: [10, 37, 30]
    });

    expect(selectGenericAaci(3, {
      highAngleGuns: [10],
      aaGuns: [],
      radars: [30]
    })).toEqual({
      unitIndex: 3,
      kind: 8,
      fixedBonus: 4,
      modifier: 1.45,
      activationRate: 0.5,
      useItems: [10, 30]
    });
  });

  it("exposes AACI pattern data for stage 2 shootdown", () => {
    expect(aaciPattern(5)).toMatchObject({ fixedBonus: 4, modifier: 1.55, activationRate: 0.55 });
    expect(aaciPattern(99)).toBeNull();
  });
});
