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

    // Frozen community snapshot captured 2026-07-12.
    expect(distribution.sampleSize).toBe(2_644_365);
    expect(distribution.source).toBe("statistical");
    expect(distribution.evidence).toMatchObject({
      level: "community-statistical",
      method: "observed-recipe-aggregate",
      confidenceMethod: "wilson-95-per-raw-outcome",
      sampleSize: 2_644_365
    });
    expect(distribution.outcomes.reduce((sum, outcome) => sum + outcome.weight, 0)).toBeCloseTo(1, 10);
    expect(distribution.outcomes.find((outcome) => outcome.masterId === 56)?.weight).toBeCloseTo(
      106_069 / 2_644_365,
      8
    );
  });

  it("uses observed large construction rates and respects secretary restrictions", () => {
    const recipe = { fuel: 4000, ammo: 6000, steel: 6000, bauxite: 2000, devmat: 20, large: true };
    const distribution = constructionDistribution(recipe, { secretaryMasterId: 9, playerLevel: 120 });

    expect(distribution.sampleSize).toBe(2_988);
    // One observed result in this aggregate is secretary-restricted Saratoga.
    // With a non-US secretary, the remaining 2,987 outcomes are renormalized.
    expect(distribution.outcomes.find((outcome) => outcome.masterId === 131)?.weight).toBeCloseTo(125 / 2_987, 8);

    const bismarckBlocked = constructionDistribution(recipe, { secretaryMasterId: 9, playerLevel: 120 });
    expect(bismarckBlocked.outcomes.some((outcome) => outcome.masterId === 171)).toBe(false);
  });

  it("keeps the community development failure rate", () => {
    const distribution = developmentDistribution(
      { fuel: 10, ammo: 251, steel: 250, bauxite: 10 },
      { secretaryMasterId: 80, playerLevel: 120 }
    );

    expect(distribution.sampleSize).toBe(35_219);
    expect(distribution.source).toBe("statistical");
    expect(distribution.failureWeight).toBeCloseTo(9_859 / 35_219, 8);
    expect(distribution.outcomes.find((outcome) => outcome.masterId === 9)?.weight).toBeCloseTo(
      1_823 / 35_219,
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

  it("fails closed for unseen recipes instead of interpolating nearby pools", () => {
    const construction = constructionDistribution(
      { fuel: 260, ammo: 40, steel: 210, bauxite: 40, devmat: 1, large: false },
      { secretaryMasterId: 9, playerLevel: 50 }
    );
    const development = developmentDistribution(
      { fuel: 21, ammo: 61, steel: 11, bauxite: 111 },
      { secretaryMasterId: 84, playerLevel: 50 }
    );

    expect(construction).toMatchObject({
      source: "unsupported",
      sampleSize: 0,
      outcomes: [],
      evidence: { level: "unsupported", method: "no-observed-recipe" }
    });
    expect(development).toMatchObject({
      source: "unsupported",
      sampleSize: 0,
      outcomes: [],
      failureWeight: 0,
      evidence: { level: "unsupported", method: "no-observed-recipe" }
    });
    expect(rollConstruction(
      { fuel: 260, ammo: 40, steel: 210, bauxite: 40, devmat: 1, large: false },
      { secretaryMasterId: 9, playerLevel: 50 },
      0
    )).toBeNull();
  });

  it("rolls deterministic boundary values", () => {
    const constructionRecipe = { fuel: 30, ammo: 30, steel: 30, bauxite: 30, devmat: 1, large: false };
    const developmentRecipe = { fuel: 10, ammo: 10, steel: 10, bauxite: 10 };

    expect(rollConstruction(constructionRecipe, { secretaryMasterId: 9, playerLevel: 120 }, 0)).toBeGreaterThan(0);
    expect(rollDevelopment(developmentRecipe, { secretaryMasterId: 9, playerLevel: 120 }, 0.999999)).toBeNull();
  });

  it("publishes Wilson intervals for observed raw outcomes and failures", () => {
    const construction = constructionDistribution(
      { fuel: 30, ammo: 30, steel: 30, bauxite: 30, devmat: 1, large: false },
      { secretaryMasterId: 9, playerLevel: 120 }
    );
    const fubuki = construction.outcomes.find((outcome) => outcome.masterId === 9);
    expect(fubuki?.observedCount).toBeGreaterThan(0);
    expect(fubuki?.confidence95?.[0]).toBeLessThan(fubuki!.weight);
    expect(fubuki?.confidence95?.[1]).toBeGreaterThan(fubuki!.weight);

    const development = developmentDistribution(
      { fuel: 10, ammo: 251, steel: 250, bauxite: 10 },
      { secretaryMasterId: 80, playerLevel: 120 }
    );
    expect(development.failureConfidence95?.[0]).toBeLessThan(development.failureWeight);
    expect(development.failureConfidence95?.[1]).toBeGreaterThan(development.failureWeight);
  });
});
