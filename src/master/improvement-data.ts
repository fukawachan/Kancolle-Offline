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
};

type GeneratedImprovementData = {
  generatedAt: string;
  sources: Record<string, string>;
  recipes: ImprovementRecipe[];
};

const GENERATED = rawImprovementData as unknown as GeneratedImprovementData;

export const improvementRecipes = GENERATED.recipes;
export const improvementRecipeById = new Map(improvementRecipes.map((recipe) => [recipe.id, recipe]));
