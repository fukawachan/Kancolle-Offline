import rawArsenalData from "../master/arsenal-data.generated.json" with { type: "json" };
import { masterData } from "../master/data.js";

export type ConstructionRecipe = {
  fuel: number;
  ammo: number;
  steel: number;
  bauxite: number;
  devmat: number;
  large: boolean;
};

export type DevelopmentRecipe = {
  fuel: number;
  ammo: number;
  steel: number;
  bauxite: number;
};

export type ArsenalContext = {
  secretaryMasterId: number;
  playerLevel: number;
};

export type WeightedOutcome = {
  masterId: number;
  weight: number;
  observedCount?: number;
  confidence95?: [number, number];
};

export type ArsenalProbabilityEvidence = {
  level: "community-statistical" | "unsupported";
  recipeKey: string;
  generatedAt: string;
  snapshot: string | string[] | null;
  sampleSize: number;
  method: "observed-recipe-aggregate" | "no-observed-recipe";
  confidenceMethod: "wilson-95-per-raw-outcome" | "not-applicable";
  missingContext: readonly string[];
};

export type ConstructionDistribution = {
  source: "statistical" | "unsupported";
  sampleSize: number;
  outcomes: WeightedOutcome[];
  evidence: ArsenalProbabilityEvidence;
};

export type DevelopmentDistribution = ConstructionDistribution & {
  failureWeight: number;
  failureConfidence95?: [number, number];
};

type RecipeData = {
  sample: number;
  outcomes: [number, number][];
};

type ShipMetadata = {
  normal: boolean;
  large: boolean;
  buildTime: number;
  loadout: number[];
};

type EquipmentMetadata = {
  buildable: boolean;
  scrap: [number, number, number, number];
  rarity: number;
  type: number;
};

type ArsenalData = {
  generatedAt: string;
  snapshots: {
    construction?: string;
    development?: string;
    developmentTimeRange?: string[];
  };
  construction: Record<string, RecipeData>;
  specialConstruction: Record<string, Record<string, { sample: number; count: number }>>;
  development: Record<string, RecipeData>;
  ships: Record<string, ShipMetadata>;
  equipment: Record<string, EquipmentMetadata>;
};

const ARSENAL_DATA = rawArsenalData as unknown as ArsenalData;
const CARRIER_EQUIPMENT_TYPES = new Set([6, 7, 8, 9, 11, 25, 26, 41, 45, 47, 48, 49, 53, 56, 57]);
const CARRIER_SHIP_TYPES = new Set([7, 11, 18]);
const TORPEDO_SHIP_TYPES = new Set([1, 2, 3, 4, 13, 14, 20, 21]);
const SPECIAL_CONSTRUCTION_SECRETARIES: Record<number, Set<number>> = {
  171: new Set([128, 174, 175, 176, 177, 179, 180, 310, 311, 400]),
  174: new Set([128, 175, 180, 311, 400]),
  175: new Set([128, 174, 179, 310, 400]),
  433: new Set([162, 360, 433, 438, 440, 499, 500, 545, 550]),
  448: new Set([347, 361, 443, 449])
};

export function constructionDistribution(
  rawRecipe: ConstructionRecipe,
  context: ArsenalContext
): ConstructionDistribution {
  const recipe = normalizeConstructionRecipe(rawRecipe);
  const key = constructionKey(recipe);
  const observed = ARSENAL_DATA.construction[key];
  if (!observed) return unsupportedConstructionDistribution(key);
  const base = distributionFromRecipe(observed, key, "construction");
  const filtered = base.outcomes.filter((outcome) => shipAllowed(outcome.masterId, recipe.large));
  const withSpecial = addSpecialConstructionOutcomes(filtered, key, context.secretaryMasterId);

  return {
    source: "statistical",
    sampleSize: base.sampleSize,
    outcomes: normalizeOutcomes(withSpecial),
    evidence: base.evidence
  };
}

export function developmentDistribution(
  rawRecipe: DevelopmentRecipe,
  context: ArsenalContext
): DevelopmentDistribution {
  const recipe = normalizeDevelopmentRecipe(rawRecipe);
  const key = developmentKey(recipe);
  const observed = ARSENAL_DATA.development[key];
  if (!observed) return unsupportedDevelopmentDistribution(key);
  const base = developmentFromRecipe(observed, key);
  const outcomes: WeightedOutcome[] = [];
  let rejectedWeight = 0;

  for (const outcome of base.outcomes) {
    if (equipmentAllowed(outcome.masterId, recipe, context)) {
      outcomes.push(outcome);
    } else {
      rejectedWeight += outcome.weight;
    }
  }

  return {
    source: "statistical",
    sampleSize: base.sampleSize,
    outcomes,
    failureWeight: clampProbability(base.failureWeight + rejectedWeight),
    failureConfidence95: base.failureConfidence95,
    evidence: base.evidence
  };
}

export function rollConstruction(
  recipe: ConstructionRecipe,
  context: ArsenalContext,
  roll = Math.random()
) {
  const distribution = constructionDistribution(recipe, context);
  if (distribution.source === "unsupported") return null;
  return rollOutcome(distribution.outcomes, roll)?.masterId ?? null;
}

export function rollDevelopment(
  recipe: DevelopmentRecipe,
  context: ArsenalContext,
  roll = Math.random()
) {
  const distribution = developmentDistribution(recipe, context);
  if (distribution.source === "unsupported") return null;
  return rollOutcome(distribution.outcomes, roll)?.masterId ?? null;
}

export function shipBuildTimeMinutes(masterId: number) {
  return Math.max(1, Math.trunc(ARSENAL_DATA.ships[String(masterId)]?.buildTime ?? 20));
}

export function shipInitialEquipment(masterId: number) {
  return [...(ARSENAL_DATA.ships[String(masterId)]?.loadout ?? [])];
}

function distributionFromRecipe(
  recipe: RecipeData,
  recipeKey: string,
  kind: "construction" | "development"
): ConstructionDistribution {
  return {
    source: "statistical",
    sampleSize: recipe.sample,
    outcomes: recipe.outcomes.map(([masterId, count]) => ({
      masterId,
      weight: count / recipe.sample,
      observedCount: count,
      confidence95: wilsonInterval(count, recipe.sample)
    })),
    evidence: statisticalEvidence(kind, recipeKey, recipe.sample)
  };
}

function developmentFromRecipe(recipe: RecipeData, recipeKey: string): DevelopmentDistribution {
  const distribution = distributionFromRecipe(recipe, recipeKey, "development");
  const successWeight = distribution.outcomes.reduce((sum, outcome) => sum + outcome.weight, 0);
  const successCount = recipe.outcomes.reduce((sum, [, count]) => sum + count, 0);
  const failureCount = Math.max(0, recipe.sample - successCount);
  return {
    ...distribution,
    failureWeight: clampProbability(1 - successWeight),
    failureConfidence95: wilsonInterval(failureCount, recipe.sample)
  };
}

function unsupportedConstructionDistribution(recipeKey: string): ConstructionDistribution {
  return {
    source: "unsupported",
    sampleSize: 0,
    outcomes: [],
    evidence: unsupportedEvidence("construction", recipeKey)
  };
}

function unsupportedDevelopmentDistribution(recipeKey: string): DevelopmentDistribution {
  return {
    ...unsupportedConstructionDistribution(recipeKey),
    failureWeight: 0,
    evidence: unsupportedEvidence("development", recipeKey)
  };
}

function statisticalEvidence(
  kind: "construction" | "development",
  recipeKey: string,
  sampleSize: number
): ArsenalProbabilityEvidence {
  return {
    level: "community-statistical",
    recipeKey,
    generatedAt: ARSENAL_DATA.generatedAt,
    snapshot: kind === "construction"
      ? ARSENAL_DATA.snapshots.construction ?? null
      : ARSENAL_DATA.snapshots.developmentTimeRange ?? ARSENAL_DATA.snapshots.development ?? null,
    sampleSize,
    method: "observed-recipe-aggregate",
    confidenceMethod: "wilson-95-per-raw-outcome",
    missingContext: ["server", "date", "secretary-level", "headquarters-level-distribution"]
  };
}

function unsupportedEvidence(
  kind: "construction" | "development",
  recipeKey: string
): ArsenalProbabilityEvidence {
  return {
    level: "unsupported",
    recipeKey,
    generatedAt: ARSENAL_DATA.generatedAt,
    snapshot: kind === "construction"
      ? ARSENAL_DATA.snapshots.construction ?? null
      : ARSENAL_DATA.snapshots.developmentTimeRange ?? ARSENAL_DATA.snapshots.development ?? null,
    sampleSize: 0,
    method: "no-observed-recipe",
    confidenceMethod: "not-applicable",
    missingContext: ["observed-recipe", "server", "date", "secretary", "headquarters-level"]
  };
}

function addSpecialConstructionOutcomes(
  outcomes: WeightedOutcome[],
  recipeKey: string,
  secretaryMasterId: number
) {
  const specials: WeightedOutcome[] = [];
  for (const [shipIdText, allowedSecretaries] of Object.entries(SPECIAL_CONSTRUCTION_SECRETARIES)) {
    const shipId = Number(shipIdText);
    if (!allowedSecretaries.has(secretaryMasterId)) continue;
    const row = ARSENAL_DATA.specialConstruction[shipIdText]?.[recipeKey];
    if (!row || row.sample <= 0 || row.count <= 0) continue;
    specials.push({
      masterId: shipId,
      weight: row.count / row.sample,
      observedCount: row.count,
      confidence95: wilsonInterval(row.count, row.sample)
    });
  }
  const specialWeight = Math.min(0.5, specials.reduce((sum, item) => sum + item.weight, 0));
  if (specialWeight <= 0) return outcomes;
  const specialScale = specialWeight / specials.reduce((sum, item) => sum + item.weight, 0);
  return [
    ...outcomes.map((outcome) => ({ ...outcome, weight: outcome.weight * (1 - specialWeight) })),
    ...specials.map((outcome) => ({ ...outcome, weight: outcome.weight * specialScale }))
  ];
}

function equipmentAllowed(
  masterId: number,
  recipe: DevelopmentRecipe,
  context: ArsenalContext
) {
  const metadata = ARSENAL_DATA.equipment[String(masterId)];
  if (!metadata?.buildable) return false;
  if (requiredHeadquartersLevel(metadata.rarity) > context.playerLevel) return false;
  if (secretaryCategory(context.secretaryMasterId) === "torpedo" && CARRIER_EQUIPMENT_TYPES.has(metadata.type)) {
    return false;
  }
  // The recipe itself is observed, but filter impossible results if the raw
  // aggregate spans a context not represented by this local account.
  const resources = developmentVector(recipe);
  return metadata.scrap.every((scrap, index) => resources[index] >= scrap * 10);
}

function shipAllowed(masterId: number, large: boolean) {
  const metadata = ARSENAL_DATA.ships[String(masterId)];
  return large ? metadata?.large === true : metadata?.normal === true;
}

function secretaryCategory(masterId: number) {
  const shipType = masterData.api_mst_ship.find((ship) => ship.api_id === masterId)?.api_stype ?? 0;
  if (CARRIER_SHIP_TYPES.has(shipType)) return "carrier";
  if (TORPEDO_SHIP_TYPES.has(shipType)) return "torpedo";
  return "artillery";
}

function requiredHeadquartersLevel(rarity: number) {
  return Math.max(1, (Math.max(0, Math.trunc(rarity)) - 1) * 10);
}

function normalizeOutcomes(outcomes: WeightedOutcome[]) {
  const total = outcomes.reduce((sum, outcome) => sum + Math.max(0, outcome.weight), 0);
  if (total <= 0) return [];
  return outcomes
    .filter((outcome) => outcome.weight > 0)
    .map((outcome) => ({ ...outcome, weight: outcome.weight / total }));
}

function rollOutcome(outcomes: WeightedOutcome[], rawRoll: number) {
  let roll = clampRoll(rawRoll);
  for (const outcome of outcomes) {
    if (roll < outcome.weight) return outcome;
    roll -= outcome.weight;
  }
  return undefined;
}

function wilsonInterval(successes: number, sampleSize: number): [number, number] {
  const n = Math.max(0, Math.trunc(sampleSize));
  if (n === 0) return [0, 1];
  const count = Math.max(0, Math.min(n, Math.trunc(successes)));
  const p = count / n;
  const z = 1.959963984540054;
  const z2 = z * z;
  const denominator = 1 + z2 / n;
  const center = (p + z2 / (2 * n)) / denominator;
  const margin = z * Math.sqrt((p * (1 - p) + z2 / (4 * n)) / n) / denominator;
  return [Math.max(0, center - margin), Math.min(1, center + margin)];
}

function normalizeConstructionRecipe(recipe: ConstructionRecipe): ConstructionRecipe {
  return {
    fuel: nonNegativeInt(recipe.fuel),
    ammo: nonNegativeInt(recipe.ammo),
    steel: nonNegativeInt(recipe.steel),
    bauxite: nonNegativeInt(recipe.bauxite),
    devmat: Math.max(1, nonNegativeInt(recipe.devmat)),
    large: recipe.large === true
  };
}

function normalizeDevelopmentRecipe(recipe: DevelopmentRecipe): DevelopmentRecipe {
  return {
    fuel: nonNegativeInt(recipe.fuel),
    ammo: nonNegativeInt(recipe.ammo),
    steel: nonNegativeInt(recipe.steel),
    bauxite: nonNegativeInt(recipe.bauxite)
  };
}

function constructionKey(recipe: ConstructionRecipe) {
  return [...constructionVector(recipe), recipe.devmat].join("-");
}

function developmentKey(recipe: DevelopmentRecipe) {
  return developmentVector(recipe).join("-");
}

function constructionVector(recipe: ConstructionRecipe) {
  return [recipe.fuel, recipe.ammo, recipe.steel, recipe.bauxite];
}

function developmentVector(recipe: DevelopmentRecipe) {
  return [recipe.fuel, recipe.ammo, recipe.steel, recipe.bauxite];
}

function nonNegativeInt(value: number) {
  const parsed = Math.trunc(Number(value));
  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
}

function clampProbability(value: number) {
  return Math.max(0, Math.min(1, value));
}

function clampRoll(value: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(0, Math.min(0.999999999999, parsed));
}
