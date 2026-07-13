import { describe, expect, it } from "vitest";
import {
  aaciPattern,
  selectAaciCandidates,
  selectActivatedAaci,
  selectGenericAaci
} from "../src/kcsapi/battle/aaci.js";

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

  it("recognizes ship-specific Akizuki and Maya patterns", () => {
    const akizuki = selectAaciCandidates(0, {
      highAngleGuns: [122, 533],
      aaGuns: [],
      radars: [27],
      airRadars: [27]
    }, "akizukiClass");
    expect(akizuki.map((candidate) => candidate.kind)).toEqual(expect.arrayContaining([1, 2, 3, 5, 8]));
    expect(akizuki[0]).toMatchObject({ kind: 1, useItems: [122, 533, 27] });

    const maya = selectAaciCandidates(1, {
      highAngleGuns: [130],
      aaGuns: [131],
      specialAaGuns: [131],
      radars: [30],
      airRadars: [30]
    }, "mayaKaiNi");
    expect(maya.map((candidate) => candidate.kind)).toEqual(expect.arrayContaining([10, 11, 7, 8]));
    expect(maya[0]).toMatchObject({ kind: 10, useItems: [130, 131, 30] });
  });

  it("continues to later ships and patterns when a higher-priority roll fails", () => {
    const candidates = [
      ...selectAaciCandidates(0, {
        highAngleGuns: [122, 533],
        aaGuns: [],
        radars: [27],
        airRadars: [27]
      }, "akizukiClass"),
      ...selectAaciCandidates(1, {
        highAngleGuns: [130],
        aaGuns: [],
        radars: [30],
        airRadars: [30]
      })
    ];
    let roll = 0;
    const selected = selectActivatedAaci(candidates, () => ++roll === 2);
    expect(roll).toBe(2);
    expect(selected).toBe(candidates[1]);
  });
});
