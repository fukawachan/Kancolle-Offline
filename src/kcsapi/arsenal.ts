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
};

export type ConstructionDistribution = {
  source: "exact" | "interpolated";
  sampleSize: number;
  outcomes: WeightedOutcome[];
};

export type DevelopmentDistribution = ConstructionDistribution & {
  failureWeight: number;
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
  const exact = ARSENAL_DATA.construction[key];
  const base = exact
    ? distributionFromRecipe(exact)
    : interpolateConstruction(recipe);
  const filtered = base.outcomes.filter((outcome) => shipAllowed(outcome.masterId, recipe.large));
  const withSpecial = addSpecialConstructionOutcomes(filtered, key, context.secretaryMasterId);

  return {
    source: exact ? "exact" : "interpolated",
    sampleSize: base.sampleSize,
    outcomes: normalizeOutcomes(withSpecial)
  };
}

export function developmentDistribution(
  rawRecipe: DevelopmentRecipe,
  context: ArsenalContext
): DevelopmentDistribution {
  const recipe = normalizeDevelopmentRecipe(rawRecipe);
  const key = developmentKey(recipe);
  const exact = ARSENAL_DATA.development[key];
  const base = exact
    ? developmentFromRecipe(exact)
    : interpolateDevelopment(recipe);
  const outcomes: WeightedOutcome[] = [];
  let rejectedWeight = 0;

  for (const outcome of base.outcomes) {
    if (equipmentAllowed(outcome.masterId, recipe, context, exact == null)) {
      outcomes.push(outcome);
    } else {
      rejectedWeight += outcome.weight;
    }
  }

  return {
    source: exact ? "exact" : "interpolated",
    sampleSize: base.sampleSize,
    outcomes,
    failureWeight: clampProbability(base.failureWeight + rejectedWeight)
  };
}

export function rollConstruction(
  recipe: ConstructionRecipe,
  context: ArsenalContext,
  roll = Math.random()
) {
  return rollOutcome(constructionDistribution(recipe, context).outcomes, roll)?.masterId ?? 9;
}

export function rollDevelopment(
  recipe: DevelopmentRecipe,
  context: ArsenalContext,
  roll = Math.random()
) {
  const distribution = developmentDistribution(recipe, context);
  return rollOutcome(distribution.outcomes, roll)?.masterId ?? null;
}

export function shipBuildTimeMinutes(masterId: number) {
  return Math.max(1, Math.trunc(ARSENAL_DATA.ships[String(masterId)]?.buildTime ?? 20));
}

export function shipInitialEquipment(masterId: number) {
  return [...(ARSENAL_DATA.ships[String(masterId)]?.loadout ?? [])];
}

function distributionFromRecipe(recipe: RecipeData): ConstructionDistribution {
  return {
    source: "exact",
    sampleSize: recipe.sample,
    outcomes: recipe.outcomes.map(([masterId, count]) => ({
      masterId,
      weight: count / recipe.sample
    }))
  };
}

function developmentFromRecipe(recipe: RecipeData): DevelopmentDistribution {
  const distribution = distributionFromRecipe(recipe);
  const successWeight = distribution.outcomes.reduce((sum, outcome) => sum + outcome.weight, 0);
  return {
    ...distribution,
    failureWeight: clampProbability(1 - successWeight)
  };
}

function interpolateConstruction(recipe: ConstructionRecipe): ConstructionDistribution {
  const candidates = nearestRecipes(ARSENAL_DATA.construction, constructionVector(recipe), recipe.large);
  const mixed = mixCandidates(candidates, false);
  return {
    source: "interpolated",
    sampleSize: mixed.sampleSize,
    outcomes: mixed.outcomes
  };
}

function interpolateDevelopment(recipe: DevelopmentRecipe): DevelopmentDistribution {
  const candidates = nearestRecipes(ARSENAL_DATA.development, developmentVector(recipe));
  const mixed = mixCandidates(candidates, true);
  const successWeight = mixed.outcomes.reduce((sum, outcome) => sum + outcome.weight, 0);
  return {
    source: "interpolated",
    sampleSize: mixed.sampleSize,
    outcomes: mixed.outcomes,
    failureWeight: clampProbability(1 - successWeight)
  };
}

function nearestRecipes(
  table: Record<string, RecipeData>,
  target: number[],
  large?: boolean
) {
  return Object.entries(table)
    .map(([key, data]) => {
      const values = key.split("-").map(Number);
      if (large != null && candidateIsLarge(values) !== large) return null;
      return {
        data,
        distance: recipeDistance(target, values),
      };
    })
    .filter((candidate): candidate is { data: RecipeData; distance: number } => candidate != null)
    .sort((a, b) => a.distance - b.distance || b.data.sample - a.data.sample)
    .slice(0, 3);
}

function mixCandidates(
  candidates: { data: RecipeData; distance: number }[],
  includeFailure: boolean
) {
  const weights = candidates.map(({ data, distance }) =>
    Math.min(1000, data.sample) / Math.pow(0.05 + distance, 2)
  );
  const totalCandidateWeight = weights.reduce((sum, weight) => sum + weight, 0) || 1;
  const outcomes = new Map<number, number>();
  let sampleSize = 0;

  candidates.forEach(({ data }, index) => {
    const blendWeight = weights[index] / totalCandidateWeight;
    sampleSize += data.sample * blendWeight;
    for (const [masterId, count] of data.outcomes) {
      outcomes.set(masterId, (outcomes.get(masterId) ?? 0) + blendWeight * count / data.sample);
    }
    if (!includeFailure) {
      const success = data.outcomes.reduce((sum, [, count]) => sum + count, 0) / data.sample;
      if (success < 1 && success > 0) {
        for (const [masterId, count] of data.outcomes) {
          outcomes.set(
            masterId,
            (outcomes.get(masterId) ?? 0) + blendWeight * (count / data.sample) * ((1 - success) / success)
          );
        }
      }
    }
  });

  return {
    sampleSize: Math.round(sampleSize),
    outcomes: [...outcomes.entries()].map(([masterId, weight]) => ({ masterId, weight }))
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
    specials.push({ masterId: shipId, weight: row.count / row.sample });
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
  context: ArsenalContext,
  enforceTheory: boolean
) {
  const metadata = ARSENAL_DATA.equipment[String(masterId)];
  if (!metadata?.buildable) return false;
  if (requiredHeadquartersLevel(metadata.rarity) > context.playerLevel) return false;
  if (secretaryCategory(context.secretaryMasterId) === "torpedo" && CARRIER_EQUIPMENT_TYPES.has(metadata.type)) {
    return false;
  }
  if (!enforceTheory) return true;
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
  if (total <= 0) return [{ masterId: 9, weight: 1 }];
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

function recipeDistance(target: number[], candidate: number[]) {
  const length = Math.min(target.length, candidate.length);
  let sum = 0;
  for (let index = 0; index < length; index += 1) {
    const scale = Math.max(index === 4 ? 1 : 10, target[index], candidate[index]);
    const delta = (target[index] - candidate[index]) / scale;
    sum += delta * delta;
  }
  return Math.sqrt(sum);
}

function candidateIsLarge(values: number[]) {
  return values[0] >= 1000 && values[1] >= 1000 && values[2] >= 1000 && values[3] >= 1000;
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
