import { GENERATED_QUEST_DEFINITIONS } from "./quest-data.generated.js";

export type QuestPeriod = "once" | "daily" | "weekly" | "monthly" | "quarterly";

export type QuestRequirement = {
  category: string;
  [key: string]: unknown;
};

export type QuestReward =
  | { kind: "material"; name: string; material: "fuel" | "ammo" | "steel" | "bauxite" | "repairKit" | "buildKit" | "devmat" | "screw"; amount: number }
  | { kind: "ship"; name: string; masterId: number; amount: number }
  | { kind: "equipment"; name: string; masterId: number; amount: number }
  | { kind: "useitem"; name: string; itemId: number; amount: number }
  | { kind: "furniture"; name: string; furnitureId: number; amount: number }
  | { kind: "choice"; choices: readonly QuestReward[] }
  | { kind: "special"; name: string; amount?: number };

export type QuestDefinition = {
  id: number;
  wikiId: string;
  category: number;
  type: number;
  period: QuestPeriod;
  title: string;
  detail: string;
  materialRewards: readonly [number, number, number, number];
  rewards: readonly QuestReward[];
  prerequisites: readonly number[];
  requirements: QuestRequirement;
  evidence?: {
    level: "exact" | "statistical" | "fallback";
    sourceRevision: string;
    sourceQuestId: number;
  };
};

export const QUEST_PAGE_SIZE = 5;
export const QUEST_DEFINITIONS: readonly QuestDefinition[] = GENERATED_QUEST_DEFINITIONS;
export const QUEST_BY_ID = new Map(QUEST_DEFINITIONS.map((quest) => [quest.id, quest] as const));
