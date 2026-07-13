import rawImprovementData from "./improvement-data.generated.json" with { type: "json" };

export type ImprovementResourceCost = {
  fuel: number;
  ammo: number;
  steel: number;
  bauxite: number;
};

export type ImprovementSlotItemCost = {
  masterId: number;
  count: number;
};

export type ImprovementUseItemCost = {
  id: number;
  count: number;
};

export type ImprovementCostStage = {
  devmat: [number, number];
  screw: [number, number];
  slotItems: ImprovementSlotItemCost[];
  useItems: ImprovementUseItemCost[];
};

export type ImprovementSecretaryGroup = {
  days: number[];
  shipMasterIds: number[];
};

export type ImprovementRecipe = {
  id: number;
  sourceMasterId: number;
  resultMasterId: number | null;
  resultInitialLevel: number;
  resources: ImprovementResourceCost;
  stages: {
    low: ImprovementCostStage;
    high: ImprovementCostStage;
    convert: ImprovementCostStage | null;
  };
  secretaries: ImprovementSecretaryGroup[];
  evidence?: {
    level: "exact" | "statistical" | "fallback";
    source: string;
    sourceRow: number;
    crossCheckRevision: string;
  };
};

type GeneratedImprovementData = {
  generatedAt: string;
  sources: Record<string, string>;
  crossCheck?: {
    checked: boolean;
    kc3SourceCount?: number;
    parsedSourceCount?: number;
    missingFromParsed?: number[];
    extraInParsed?: number[];
  };
  recipes: ImprovementRecipe[];
};

const GENERATED = rawImprovementData as unknown as GeneratedImprovementData;

export const improvementRecipes = GENERATED.recipes;
export const improvementRecipeById = new Map(improvementRecipes.map((recipe) => [recipe.id, recipe]));

const generatedSources = new Set(improvementRecipes.map((recipe) => recipe.sourceMasterId));
const crossCheckMissing = Object.freeze(
  [...new Set(GENERATED.crossCheck?.missingFromParsed ?? [])]
    .filter((masterId) => Number.isInteger(masterId) && masterId > 0)
    .sort((left, right) => left - right)
);

if (crossCheckMissing.some((masterId) => generatedSources.has(masterId))) {
  throw new Error("Improvement data cross-check marks a parsed source as missing");
}

/**
 * The WCTF snapshot is the executable source. KC3 is only a coverage
 * cross-check: rows absent from WCTF are intentionally unavailable rather
 * than being fabricated from a neighbouring equipment recipe.
 */
export const improvementDataEvidence = Object.freeze({
  level: "community-snapshot" as const,
  generatedAt: GENERATED.generatedAt,
  executableSource: GENERATED.sources.arsenal ?? "unknown",
  crossCheckSource: GENERATED.sources.kc3Akashi ?? "unknown",
  policy: "fail-closed-cross-check-only-sources" as const,
  parsedSourceCount: generatedSources.size,
  crossCheckSourceCount: GENERATED.crossCheck?.kc3SourceCount ?? generatedSources.size,
  unavailableSourceMasterIds: crossCheckMissing
});

export type ImprovementSourceEvidence =
  | { availability: "available"; evidence: "community-snapshot" }
  | { availability: "unavailable"; evidence: "cross-check-only-unverified" }
  | { availability: "unknown"; evidence: "not-listed-by-either-snapshot" };

export function improvementSourceEvidence(masterId: number): ImprovementSourceEvidence {
  const normalized = Math.trunc(Number(masterId));
  if (generatedSources.has(normalized)) return { availability: "available", evidence: "community-snapshot" };
  if (crossCheckMissing.includes(normalized)) {
    return { availability: "unavailable", evidence: "cross-check-only-unverified" };
  }
  return { availability: "unknown", evidence: "not-listed-by-either-snapshot" };
}
