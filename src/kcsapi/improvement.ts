import {
  improvementRecipeById,
  improvementRecipes,
  type ImprovementCostStage,
  type ImprovementRecipe,
  type ImprovementSlotItemCost,
  type ImprovementUseItemCost
} from "../master/improvement-data.js";
import type { SlotImprovementApplication } from "../state/store.js";
import type { MaterialDelta, SaveState, SlotItem } from "../state/types.js";

const AKASHI_MASTER_IDS = new Set([182, 187]);
const AKASHI_KAI_MASTER_ID = 187;
const MAX_IMPROVEMENT_LEVEL = 10;
// Community-observed rates published by the Kancolle wiki.  These are not
// official server constants, so keep the table and its evidence label in one
// place instead of smearing approximate fallbacks through execution code.
export const IMPROVEMENT_SUCCESS_RATE_EVIDENCE = Object.freeze({
  level: "community-statistical" as const,
  source: "https://wikiwiki.jp/kancolle/%E6%94%B9%E4%BF%AE%E5%B7%A5%E5%BB%A0",
  observedThrough: "2026-07-10",
  ordinaryAkashi: [1, 1, 1, 1, 0.95, 0.9, 0.8, 0.77, 0.72, 0.6, 0.5] as const,
  akashiKai: [1, 1, 1, 1, 1, 0.95, 0.9, 0.82, 0.77, 0.67, 0.62] as const
});
const JST_WEEKDAY_NAMES = new Map([
  ["Sun", 0],
  ["Mon", 1],
  ["Tue", 2],
  ["Wed", 3],
  ["Thu", 4],
  ["Fri", 5],
  ["Sat", 6]
]);

export type ImprovementExecutionPreparation =
  | {
      ok: true;
      application: SlotImprovementApplication;
      targetBefore: SlotItem;
      success: boolean;
      remodelId: [number, number];
      voiceShipId: number;
      voiceId: number;
    }
  | { ok: false; error: string };

type StageKind = "low" | "high" | "convert";
type SelectedStage = {
  kind: StageKind;
  stage: ImprovementCostStage;
};

export function remodelSlotListPayload(save: SaveState, now = new Date()) {
  const context = improvementContext(save, now);
  if (!context.ok) return [];

  const entries = [];
  for (const recipe of improvementRecipes) {
    if (entries.length >= 3) break;
    if (!recipeAvailable(recipe, context.weekday, context.assistantShipMasterId)) continue;
    entries.push(listEntry(recipe, recipe.stages.low));
  }
  return entries;
}

export function remodelSlotDetailPayload(
  save: SaveState,
  recipeId: number,
  slotId: number,
  now = new Date()
) {
  const resolved = resolveRecipeAndTarget(save, recipeId, slotId, now);
  if (!resolved.ok) return resolved;

  return {
    ok: true as const,
    data: detailEntry(resolved.recipe, resolved.selected.stage)
  };
}

export function prepareRemodelSlotExecution(
  save: SaveState,
  recipeId: number,
  slotItemId: number,
  certain: boolean,
  roll: number,
  now = new Date()
): ImprovementExecutionPreparation {
  const resolved = resolveRecipeAndTarget(save, recipeId, slotItemId, now);
  if (!resolved.ok) return resolved;
  if (resolved.target.id !== slotItemId) {
    return { ok: false, error: "A concrete equipment instance is required" };
  }

  const stage = resolved.selected.stage;
  const materialCost = materialCostForStage(resolved.recipe, stage, certain);
  if (!hasMaterials(save.materials, materialCost)) return { ok: false, error: "Insufficient improvement materials" };

  const consumedSlotItemIds = selectConsumedSlotItemIds(save, resolved.target.id, stage.slotItems);
  if (!consumedSlotItemIds.ok) return consumedSlotItemIds;

  const akashiKai = resolved.context.akashiMasterId === AKASHI_KAI_MASTER_ID;
  const success = certain || roll < improvementSuccessRate(resolved.target.level, akashiKai);
  const convertSuccess = success && resolved.selected.kind === "convert";
  const nextMasterId = convertSuccess
    ? resolved.recipe.resultMasterId ?? resolved.target.masterId
    : resolved.target.masterId;
  const nextLevel = success
    ? convertSuccess
      ? Math.max(0, Math.trunc(resolved.recipe.resultInitialLevel))
      : Math.min(MAX_IMPROVEMENT_LEVEL, resolved.target.level + 1)
    : resolved.target.level;
  const useItemCosts = success ? stage.useItems : [];

  if (success && !hasUseItems(save.useItems, useItemCosts)) {
    return { ok: false, error: "Insufficient special improvement items" };
  }

  return {
    ok: true,
    application: {
      targetItemId: resolved.target.id,
      nextMasterId,
      nextLevel,
      materialCost,
      consumedSlotItemIds: consumedSlotItemIds.ids,
      useItemCosts,
      success
    },
    targetBefore: resolved.target,
    success,
    remodelId: [resolved.target.masterId, nextMasterId],
    voiceShipId: resolved.context.akashiShipId,
    voiceId: 0
  };
}

export function improvementSuccessRate(level: number, akashiKai = true) {
  const currentLevel = Math.max(0, Math.min(MAX_IMPROVEMENT_LEVEL, Math.trunc(level)));
  return akashiKai
    ? IMPROVEMENT_SUCCESS_RATE_EVIDENCE.akashiKai[currentLevel]
    : IMPROVEMENT_SUCCESS_RATE_EVIDENCE.ordinaryAkashi[currentLevel];
}

function resolveRecipeAndTarget(save: SaveState, recipeId: number, slotId: number, now: Date) {
  const context = improvementContext(save, now);
  if (!context.ok) return context;

  const recipe = improvementRecipeById.get(recipeId);
  if (!recipe) return { ok: false as const, error: "Unknown improvement recipe" };
  if (!recipeAvailable(recipe, context.weekday, context.assistantShipMasterId)) {
    return { ok: false as const, error: "Improvement recipe is not available now" };
  }

  const target = resolveTargetSlotItem(save, recipe, slotId);
  if (!target) return { ok: false as const, error: "No matching equipment to improve" };
  const selected = selectedStageForLevel(recipe, target.level);
  if (!selected) return { ok: false as const, error: "Equipment cannot be improved further" };

  return { ok: true as const, context, recipe, target, selected };
}

function improvementContext(save: SaveState, now: Date) {
  const firstDeck = save.decks.find((deck) => deck.id === 1);
  const flagshipShipId = firstDeck?.shipIds[0] ?? -1;
  const flagship = save.ships.find((ship) => ship.id === flagshipShipId);
  if (!flagship || !AKASHI_MASTER_IDS.has(flagship.masterId)) {
    return { ok: false as const, error: "Akashi must be the first fleet flagship" };
  }

  const assistantShipId = firstDeck?.shipIds[1] ?? -1;
  const assistant = save.ships.find((ship) => ship.id === assistantShipId);
  return {
    ok: true as const,
    akashiShipId: flagship.id,
    akashiMasterId: flagship.masterId,
    assistantShipMasterId: assistant?.masterId ?? null,
    weekday: jstWeekday(now)
  };
}

function recipeAvailable(recipe: ImprovementRecipe, weekday: number, assistantShipMasterId: number | null) {
  return recipe.secretaries.some((group) =>
    group.days.includes(weekday)
    && (group.shipMasterIds.length === 0 || (assistantShipMasterId != null && group.shipMasterIds.includes(assistantShipMasterId)))
  );
}

function firstUpgradeableTarget(save: SaveState, recipe: ImprovementRecipe) {
  return save.slotItems
    .filter((item) => item.masterId === recipe.sourceMasterId)
    .sort((a, b) => a.id - b.id)
    .find((item) => selectedStageForLevel(recipe, item.level) != null) ?? null;
}

function resolveTargetSlotItem(save: SaveState, recipe: ImprovementRecipe, slotId: number) {
  const exact = save.slotItems.find((item) => item.id === slotId && item.masterId === recipe.sourceMasterId);
  if (exact) return exact;
  if (slotId === recipe.sourceMasterId) return firstUpgradeableTarget(save, recipe);
  return null;
}

function selectedStageForLevel(recipe: ImprovementRecipe, level: number): SelectedStage | null {
  const currentLevel = Math.max(0, Math.trunc(level));
  if (currentLevel < 6) return { kind: "low", stage: recipe.stages.low };
  if (currentLevel < MAX_IMPROVEMENT_LEVEL) return { kind: "high", stage: recipe.stages.high };
  if (recipe.resultMasterId != null && recipe.stages.convert) return { kind: "convert", stage: recipe.stages.convert };
  return null;
}

function listEntry(recipe: ImprovementRecipe, stage: ImprovementCostStage) {
  const firstSlotCost = stage.slotItems[0];
  return {
    api_id: recipe.id,
    api_slot_id: recipe.sourceMasterId,
    api_sp_type: 0,
    api_req_fuel: recipe.resources.fuel,
    api_req_bull: recipe.resources.ammo,
    api_req_steel: recipe.resources.steel,
    api_req_bauxite: recipe.resources.bauxite,
    api_req_buildkit: stage.devmat[0],
    api_req_remodelkit: stage.screw[0],
    api_req_slot_id: firstSlotCost?.masterId ?? 0,
    api_req_slot_num: firstSlotCost?.count ?? 0
  };
}

function detailEntry(recipe: ImprovementRecipe, stage: ImprovementCostStage) {
  const firstSlotCost = stage.slotItems[0];
  const secondSlotCost = stage.slotItems[1];
  const firstUseItemCost = stage.useItems[0];
  const secondUseItemCost = stage.useItems[1];

  return {
    ...listEntry(recipe, stage),
    api_certain_buildkit: stage.devmat[1],
    api_certain_remodelkit: stage.screw[1],
    api_req_useitem_id: firstUseItemCost?.id ?? 0,
    api_req_useitem_num: firstUseItemCost?.count ?? 0,
    api_req_useitem_id2: secondUseItemCost?.id ?? 0,
    api_req_useitem_num2: secondUseItemCost?.count ?? 0,
    api_req_slot_id2: secondSlotCost?.masterId ?? 0,
    api_req_slot_num2: secondSlotCost?.count ?? 0,
    api_change_flag: stage === recipe.stages.convert ? 1 : 0
  };
}

function materialCostForStage(recipe: ImprovementRecipe, stage: ImprovementCostStage, certain: boolean): MaterialDelta {
  const index = certain ? 1 : 0;
  return {
    fuel: recipe.resources.fuel,
    ammo: recipe.resources.ammo,
    steel: recipe.resources.steel,
    bauxite: recipe.resources.bauxite,
    devmat: stage.devmat[index],
    screw: stage.screw[index]
  };
}

function selectConsumedSlotItemIds(save: SaveState, targetItemId: number, costs: ImprovementSlotItemCost[]) {
  const selected = new Set<number>();
  const equippedIds = equippedSlotItemIds(save);
  for (const cost of costs) {
    const candidates = save.slotItems
      .filter((item) =>
        item.masterId === cost.masterId
        && item.id !== targetItemId
        && item.locked === 0
        && !selected.has(item.id)
        && !equippedIds.has(item.id)
      )
      .sort((a, b) => a.id - b.id);
    if (candidates.length < cost.count) {
      return { ok: false as const, error: "Insufficient improvement fodder equipment" };
    }
    for (const item of candidates.slice(0, cost.count)) selected.add(item.id);
  }
  return { ok: true as const, ids: [...selected] };
}

function equippedSlotItemIds(save: SaveState) {
  const equipped = new Set<number>();
  for (const ship of save.ships) {
    for (const slotItemId of [...ship.slotIds, ship.exSlotId]) {
      if (slotItemId > 0) equipped.add(slotItemId);
    }
  }
  return equipped;
}

function hasMaterials(materials: SaveState["materials"], delta: MaterialDelta) {
  return (Object.entries(delta) as [keyof SaveState["materials"], number | undefined][])
    .every(([key, value]) => materials[key] >= Math.max(0, value || 0));
}

function hasUseItems(useItems: SaveState["useItems"], costs: ImprovementUseItemCost[]) {
  if (costs.length === 0) return true;
  const counts = new Map(useItems.map((item) => [item.id, item.count]));
  return costs.every((cost) => (counts.get(cost.id) ?? 0) >= cost.count);
}

function jstWeekday(now: Date) {
  const weekday = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Tokyo",
    weekday: "short"
  }).format(now);
  return JST_WEEKDAY_NAMES.get(weekday) ?? 0;
}
