import { createRequire } from "node:module";
import type { Materials } from "../state/types.js";

export type MapPhaseCondition = "sink" | "victory" | "transport" | "arrival";
export type MapGaugeType = "none" | "hp" | "transport";
export type MapProgressReset = "once" | "monthly";
export type MapVictoryRank = "S" | "A" | "B";

export type MapPhaseDefinition = {
  id: string;
  point: string;
  required: number;
  condition: MapPhaseCondition;
  gaugeNo: number;
  gaugeType: MapGaugeType;
  landingPoint?: string;
  minimumRank?: MapVictoryRank;
};

export type NormalMapClearReward =
  | { kind: "useitem"; id: number; count: number }
  | { kind: "material"; material: keyof Materials; count: number }
  | { kind: "ranking"; count: number };

export type NormalMapMaster = {
  api_id: number;
  api_maparea_id: number;
  api_no: number;
  api_name: string;
  api_level: number;
  api_opetext: string;
  api_infotext: string;
  api_item: number[];
  api_max_maphp: number | null;
  api_required_defeat_count: number | null;
  api_sally_flag: number[];
};

export type NormalMapBgmMaster = {
  api_id: number;
  api_maparea_id: number;
  api_no: number;
  api_moving_bgm: number;
  api_map_bgm: number[];
  api_boss_bgm: number[];
};

export type MapProgressEvidence = {
  level: "exact" | "statistical" | "inferred" | "fallback";
  source: string;
  checkedAt: string;
  detail: string;
};

export type MapProgressDefinition = {
  id: number;
  rulesVersion: string;
  reset: MapProgressReset;
  unlock: { clearedOnceMapIds: readonly number[] };
  rewards: readonly NormalMapClearReward[];
  phases: readonly MapPhaseDefinition[] | null;
  master?: NormalMapMaster;
  bgm?: NormalMapBgmMaster;
  evidence: MapProgressEvidence;
};

type GeneratedMapProgressData = {
  schemaVersion: number;
  generatedAt: string;
  profile: {
    id: string;
    rulesDate: string;
    sources: Record<string, string>;
    maps: MapProgressDefinition[];
  };
};

const require = createRequire(import.meta.url);
const GENERATED = require("./map-progress-data.generated.json") as GeneratedMapProgressData;
validateGeneratedMapProgress(GENERATED);

const DEFINITIONS = Object.freeze(GENERATED.profile.maps.map(freezeDefinition));
const DEFINITION_BY_ID = new Map(DEFINITIONS.map((definition) => [definition.id, definition] as const));

export const NORMAL_MAP_PROGRESS_PROFILE = Object.freeze({
  id: GENERATED.profile.id,
  rulesDate: GENERATED.profile.rulesDate,
  generatedAt: GENERATED.generatedAt,
  sources: Object.freeze({ ...GENERATED.profile.sources })
});

export function mapProgressDefinitions(): readonly MapProgressDefinition[] {
  return DEFINITIONS;
}

export function mapProgressDefinition(mapId: number) {
  return DEFINITION_BY_ID.get(Math.trunc(mapId));
}

export function mapPhaseDefinitions(mapId: number) {
  return mapProgressDefinition(mapId)?.phases ?? undefined;
}

export function normalMapMasterOverride(mapId: number) {
  return mapProgressDefinition(mapId)?.master;
}

export function normalMapBgmOverride(mapId: number) {
  return mapProgressDefinition(mapId)?.bgm;
}

export function isMonthlyResetMap(mapId: number) {
  return mapProgressDefinition(mapId)?.reset === "monthly";
}

/** @deprecated Prefer isMonthlyResetMap; 7-2/7-3 are monthly without being EOs. */
export function isMonthlyExtraOperationMap(mapId: number) {
  return isMonthlyResetMap(mapId);
}

export function mapClearRewards(mapId: number) {
  return mapProgressDefinition(mapId)?.rewards ?? [];
}

export function mapUnlockPrerequisites(mapId: number) {
  return mapProgressDefinition(mapId)?.unlock.clearedOnceMapIds ?? [];
}

export function mapMedalRewardCount(mapId: number) {
  return mapClearRewards(mapId)
    .filter((reward): reward is Extract<NormalMapClearReward, { kind: "useitem" }> => reward.kind === "useitem" && reward.id === 57)
    .reduce((sum, reward) => sum + reward.count, 0);
}

export function mapGaugeStage(mapId: number, phase: number) {
  const stages = mapPhaseDefinitions(mapId);
  if (!stages) return 1;
  return stages[mapProgressPhase(mapId, phase) - 1]?.gaugeNo ?? 0;
}

export function mapGaugeType(mapId: number, phase: number): MapGaugeType {
  return mapPhaseDefinitions(mapId)?.[mapProgressPhase(mapId, phase) - 1]?.gaugeType ?? "hp";
}

export function mapProgressPhase(mapId: number, phase: number) {
  const stageCount = mapPhaseDefinitions(mapId)?.length ?? 1;
  return Math.min(stageCount, Math.max(1, Math.trunc(phase) || 1));
}

export function mapGaugeRequirement(
  mapId: number,
  phase: number,
  requiredDefeatCount: number | null | undefined
) {
  const stages = mapPhaseDefinitions(mapId);
  if (stages) return stages[mapProgressPhase(mapId, phase) - 1]?.required ?? null;
  return requiredDefeatCount != null && requiredDefeatCount > 0
    ? Math.trunc(requiredDefeatCount)
    : null;
}

export function initialMapGauge(
  mapId: number,
  requiredDefeatCount: number | null | undefined
) {
  return mapPhaseDefinitions(mapId)?.[0]?.required
    ?? (requiredDefeatCount != null && requiredDefeatCount > 0 ? Math.trunc(requiredDefeatCount) : 1);
}

export function terminalMapPhase(mapId: number) {
  return (mapPhaseDefinitions(mapId)?.length ?? 1) + 1;
}

function freezeDefinition(definition: MapProgressDefinition): MapProgressDefinition {
  const phases = definition.phases?.map((phase) => Object.freeze({ ...phase }));
  const rewards = definition.rewards.map((reward) => Object.freeze({ ...reward }));
  return Object.freeze({
    ...definition,
    unlock: Object.freeze({ clearedOnceMapIds: Object.freeze([...definition.unlock.clearedOnceMapIds]) }),
    rewards: Object.freeze(rewards),
    phases: phases ? Object.freeze(phases) : null,
    ...(definition.master ? { master: Object.freeze({ ...definition.master }) } : {}),
    ...(definition.bgm ? { bgm: Object.freeze({ ...definition.bgm }) } : {}),
    evidence: Object.freeze({ ...definition.evidence })
  });
}

function validateGeneratedMapProgress(data: GeneratedMapProgressData) {
  if (data.schemaVersion !== 1) throw new Error(`Unsupported map-progress schema ${data.schemaVersion}`);
  if (!data.profile?.id || Number.isNaN(Date.parse(data.generatedAt)) || Number.isNaN(Date.parse(data.profile.rulesDate))) {
    throw new Error("Map-progress profile metadata is incomplete");
  }
  const ids = new Set<number>();
  for (const definition of data.profile.maps ?? []) {
    if (!Number.isInteger(definition.id) || definition.id <= 0 || ids.has(definition.id)) {
      throw new Error(`Invalid or duplicate map-progress id ${definition.id}`);
    }
    ids.add(definition.id);
    if (!definition.rulesVersion || !["once", "monthly"].includes(definition.reset)) {
      throw new Error(`Map ${definition.id} has incomplete version/reset metadata`);
    }
    if (!Array.isArray(definition.unlock?.clearedOnceMapIds) || !Array.isArray(definition.rewards)) {
      throw new Error(`Map ${definition.id} has incomplete unlock/reward metadata`);
    }
    for (const reward of definition.rewards) {
      if (!Number.isInteger(reward.count) || reward.count <= 0) throw new Error(`Map ${definition.id} has an invalid reward`);
    }
    const phaseIds = new Set<string>();
    for (const phase of definition.phases ?? []) {
      if (!phase.id || phaseIds.has(phase.id) || !phase.point || !Number.isInteger(phase.required) || phase.required <= 0) {
        throw new Error(`Map ${definition.id} has an invalid phase`);
      }
      phaseIds.add(phase.id);
      if (!["sink", "victory", "transport", "arrival"].includes(phase.condition)) {
        throw new Error(`Map ${definition.id} phase ${phase.id} has an invalid condition`);
      }
      if (!["none", "hp", "transport"].includes(phase.gaugeType) || !Number.isInteger(phase.gaugeNo) || phase.gaugeNo < 0) {
        throw new Error(`Map ${definition.id} phase ${phase.id} has an invalid gauge contract`);
      }
      if (phase.condition === "transport" && (!phase.landingPoint || phase.gaugeType !== "transport")) {
        throw new Error(`Map ${definition.id} transport phase ${phase.id} is incomplete`);
      }
      if (phase.condition === "arrival" && phase.gaugeType !== "none") {
        throw new Error(`Map ${definition.id} arrival phase ${phase.id} must hide its gauge`);
      }
    }
    if (!definition.evidence?.source || !definition.evidence?.checkedAt) {
      throw new Error(`Map ${definition.id} has no evidence record`);
    }
    if (definition.master && definition.master.api_id !== definition.id) {
      throw new Error(`Map ${definition.id} has a mismatched master override`);
    }
  }
}
