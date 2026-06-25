import { describe, expect, it } from "vitest";
import {
  constructionDistribution,
  developmentDistribution,
  rollConstruction,
  rollDevelopment
} from "../src/kcsapi/arsenal.js";

describe("arsenal probability model", () => {
  it("uses the community distribution for the minimum construction recipe", () => {
    const distribution = constructionDistribution(
      { fuel: 30, ammo: 30, steel: 30, bauxite: 30, devmat: 1, large: false },
      { secretaryMasterId: 9, playerLevel: 120 }
    );

    expect(distribution.sampleSize).toBe(2_538_533);
    expect(distribution.source).toBe("exact");
    expect(distribution.outcomes.reduce((sum, outcome) => sum + outcome.weight, 0)).toBeCloseTo(1, 10);
    expect(distribution.outcomes.find((outcome) => outcome.masterId === 56)?.weight).toBeCloseTo(
      101_907 / 2_538_533,
      8
    );
  });

  it("uses observed large construction rates and respects secretary restrictions", () => {
    const recipe = { fuel: 4000, ammo: 6000, steel: 6000, bauxite: 2000, devmat: 20, large: true };
    const distribution = constructionDistribution(recipe, { secretaryMasterId: 9, playerLevel: 120 });

    expect(distribution.sampleSize).toBe(2_954);
    // One observed result in this aggregate is secretary-restricted Saratoga.
    // With a non-US secretary, the remaining 2,953 outcomes are renormalized.
    expect(distribution.outcomes.find((outcome) => outcome.masterId === 131)?.weight).toBeCloseTo(122 / 2_953, 8);

    const bismarckBlocked = constructionDistribution(recipe, { secretaryMasterId: 9, playerLevel: 120 });
    expect(bismarckBlocked.outcomes.some((outcome) => outcome.masterId === 171)).toBe(false);
  });

  it("keeps the community development failure rate", () => {
    const distribution = developmentDistribution(
      { fuel: 10, ammo: 251, steel: 250, bauxite: 10 },
      { secretaryMasterId: 80, playerLevel: 120 }
    );

    expect(distribution.sampleSize).toBe(38_528);
    expect(distribution.source).toBe("exact");
    expect(distribution.failureWeight).toBeCloseTo(11_047 / 38_528, 8);
    expect(distribution.outcomes.find((outcome) => outcome.masterId === 9)?.weight).toBeCloseTo(
      1_929 / 38_528,
      8
    );
  });

  it("filters carrier aircraft from a destroyer secretary development pool", () => {
    const distribution = developmentDistribution(
      { fuel: 20, ammo: 60, steel: 10, bauxite: 110 },
      { secretaryMasterId: 9, playerLevel: 120 }
    );

    expect(distribution.outcomes.some((outcome) => outcome.masterId === 54)).toBe(false);
    expect(distribution.failureWeight).toBeGreaterThan(0);
  });

  it("falls back to nearby compatible recipes for unseen inputs", () => {
    const construction = constructionDistribution(
      { fuel: 260, ammo: 40, steel: 210, bauxite: 40, devmat: 1, large: false },
      { secretaryMasterId: 9, playerLevel: 50 }
    );
    const development = developmentDistribution(
      { fuel: 21, ammo: 61, steel: 11, bauxite: 111 },
      { secretaryMasterId: 84, playerLevel: 50 }
    );

    expect(construction.source).toBe("interpolated");
    expect(construction.outcomes.length).toBeGreaterThan(1);
    expect(development.source).toBe("interpolated");
    expect(development.outcomes.length).toBeGreaterThan(1);
  });

  it("rolls deterministic boundary values", () => {
    const constructionRecipe = { fuel: 30, ammo: 30, steel: 30, bauxite: 30, devmat: 1, large: false };
    const developmentRecipe = { fuel: 10, ammo: 10, steel: 10, bauxite: 10 };

    expect(rollConstruction(constructionRecipe, { secretaryMasterId: 9, playerLevel: 120 }, 0)).toBeGreaterThan(0);
    expect(rollDevelopment(developmentRecipe, { secretaryMasterId: 9, playerLevel: 120 }, 0.999999)).toBeNull();
  });
});
