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
      modifier: 1.5,
      activationRate: 0.55,
      useItems: [3, 10, 30]
    });
  });

  it("falls back to lower-priority generic AACI patterns", () => {
    expect(selectGenericAaci(2, {
      highAngleGuns: [10],
      specialHighAngleGuns: [],
      aaGuns: [37],
      radars: [30],
      aaDirectors: [120]
    })).toEqual({
      unitIndex: 2,
      kind: 8,
      fixedBonus: 4,
      modifier: 1.4,
      activationRate: 0.5,
      useItems: [10, 30]
    });

    expect(selectGenericAaci(3, {
      highAngleGuns: [10],
      aaGuns: [],
      radars: [30]
    })).toEqual({
      unitIndex: 3,
      kind: 8,
      fixedBonus: 4,
      modifier: 1.4,
      activationRate: 0.5,
      useItems: [10, 30]
    });
  });

  it("exposes AACI pattern data for stage 2 shootdown", () => {
    expect(aaciPattern(5)).toMatchObject({ fixedBonus: 4, modifier: 1.5, activationRate: 0.55 });
    expect(aaciPattern(99)).toBeNull();
  });

  it("recognizes ship-specific Akizuki and Maya patterns", () => {
    const akizuki = selectAaciCandidates(0, {
      highAngleGuns: [122, 533],
      aaGuns: [],
      radars: [27],
      airRadars: [27]
    }, "akizukiClass");
    expect(akizuki.map((candidate) => candidate.kind)).toEqual([1, 2, 3]);
    expect(akizuki[0]).toMatchObject({ kind: 1, useItems: [122, 533, 27] });

    const maya = selectAaciCandidates(1, {
      highAngleGuns: [130],
      aaGuns: [131],
      specialAaGuns: [131],
      radars: [30],
      airRadars: [30]
    }, "mayaKaiNi");
    expect(maya.map((candidate) => candidate.kind)).toEqual([10, 11, 8]);
    expect(maya[0]).toMatchObject({ kind: 10, useItems: [130, 131, 30] });
  });

  it("covers every cache-baseline AACI kind", () => {
    for (let kind = 1; kind <= 47; kind += 1) {
      expect(aaciPattern(kind), `missing AACI kind ${kind}`).not.toBeNull();
    }
    expect(aaciPattern(48)).toBeNull();
    expect(aaciPattern(53)).toBeNull();
  });

  it("selects Atlanta kind 39 then falls back to kind 41 for 363 + 362", () => {
    const candidates = selectAaciCandidates(0, {
      allItems: [363, 362],
      highAngleGuns: [363, 362],
      specialHighAngleGuns: [363, 362],
      aaGuns: [],
      radars: []
    }, "atlantaClass");

    expect(candidates.map((candidate) => candidate.kind)).toEqual([39, 41]);
    expect(candidates[0]).toMatchObject({
      kind: 39,
      fixedBonus: 10,
      modifier: 1.7,
      useItems: [363, 362]
    });

    let roll = 0;
    expect(selectActivatedAaci(candidates, () => ++roll === 2)).toMatchObject({ kind: 41 });
    expect(roll).toBe(2);
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
