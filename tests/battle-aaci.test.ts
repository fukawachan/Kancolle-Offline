import { describe, expect, it } from "vitest";
import {
  aaciPattern,
  selectAaciCandidates,
  selectActivatedAaci,
  selectGenericAaci,
  type AaciEquipmentSummary,
  type AaciShipProfile
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

  it("can construct every cache-baseline AACI kind from an equipment predicate", () => {
    const scenarios: Array<[AaciShipProfile, AaciEquipmentSummary]> = [
      ["generic", {
        battleship: true,
        allItems: [3, 10, 37, 131, 30, 120, 7, 18],
        highAngleGuns: [3, 10], specialHighAngleGuns: [3, 10],
        aaGuns: [131, 37], aaGunsAtLeast3: [131, 37], specialAaGuns: [131],
        radars: [30], airRadars: [30], aaDirectors: [120], largeMainGuns: [7], type3Shells: [18]
      }],
      ["akizukiClass", { highAngleGuns: [122, 533], specialHighAngleGuns: [122], aaGuns: [], radars: [27], airRadars: [27] }],
      ["mayaKaiNi", { highAngleGuns: [130], aaGuns: [131], specialAaGuns: [131], radars: [30], airRadars: [30] }],
      ["isuzuKaiNi", { highAngleGuns: [10], aaGuns: [37], radars: [30], airRadars: [30] }],
      ["kasumiYubari", { highAngleGuns: [10], aaGuns: [37], radars: [30], airRadars: [30] }],
      ["satsukiKaiNi", { highAngleGuns: [], aaGuns: [131], specialAaGuns: [131], radars: [] }],
      ["kinuKaiNi", { highAngleGuns: [10], aaGuns: [131], specialAaGuns: [131], radars: [] }],
      ["yuraKaiNi", { highAngleGuns: [10], aaGuns: [], radars: [30], airRadars: [30] }],
      ["fumizukiKaiNi", { highAngleGuns: [], aaGuns: [131], specialAaGuns: [131], radars: [] }],
      ["submarineSpecial", { highAngleGuns: [], aaGuns: [37], aaGunsAtLeast3: [37], radars: [] }],
      ["tenryuKaiNi", { highAngleGuns: [3, 10, 130], aaGuns: [37], aaGunsAtLeast3: [37], radars: [] }],
      ["iseClass", { allItems: [274, 30, 18], highAngleGuns: [], aaGuns: [], radars: [30], airRadars: [30], type3Shells: [18] }],
      ["yamatoKaiNi", {
        allItems: [275, 464, 464, 142, 37], highAngleGuns: [], aaGuns: [37], aaGunsAtLeast6: [37],
        radars: [142], airRadars: [142]
      }],
      ["oyodoKai", { allItems: [71, 274, 30], highAngleGuns: [], aaGuns: [], radars: [30], airRadars: [30] }],
      ["isokazeHamakaze", { highAngleGuns: [10], aaGuns: [], radars: [30], airRadars: [30] }],
      ["gotland", { highAngleGuns: [3, 10, 130], aaGuns: [37], aaGunsAtLeast4: [37], radars: [] }],
      ["britishKongo", { allItems: [300, 191], highAngleGuns: [], aaGuns: [191], radars: [] }],
      ["fletcherClass", { allItems: [308, 308, 313, 313, 307], highAngleGuns: [], aaGuns: [], radars: [] }],
      ["atlantaClass", { allItems: [363, 363, 362, 307], highAngleGuns: [363, 363, 362], aaGuns: [], radars: [] }],
      ["harunaKaiNiSpecial", {
        allItems: [502, 131, 30], highAngleGuns: [], aaGuns: [131], specialAaGuns: [131],
        radars: [30], airRadars: [30]
      }],
      ["shiratsuyuSpecial", { allItems: [529, 529], highAngleGuns: [], aaGuns: [], radars: [] }]
    ];
    const generated = new Set(scenarios.flatMap(([profile, equipment]) =>
      selectAaciCandidates(0, equipment, profile).map((candidate) => candidate.kind)
    ));

    expect(Array.from({ length: 47 }, (_value, index) => index + 1)
      .filter((kind) => !generated.has(kind))).toEqual([]);
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
      activationRate: 0.65,
      useItems: [363, 362]
    });
    expect(candidates[1]).toMatchObject({ kind: 41, activationRate: 0.55 });

    const firstRolls: number[] = [];
    expect(selectActivatedAaci(candidates, (probability) => {
      firstRolls.push(probability);
      return true;
    })).toMatchObject({ kind: 39 });
    expect(firstRolls).toEqual([0.65]);

    let roll = 0;
    expect(selectActivatedAaci(candidates, () => ++roll === 2)).toMatchObject({ kind: 41 });
    expect(roll).toBe(2);

    const failedRolls: number[] = [];
    expect(selectActivatedAaci(candidates, (probability) => {
      failedRolls.push(probability);
      return false;
    })).toBeNull();
    expect(failedRolls).toEqual([0.65, 0.55]);
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
