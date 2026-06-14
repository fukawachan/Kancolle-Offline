export type MapPhaseCondition = "sink" | "victory";

export type MapPhaseDefinition = {
  point: string;
  required: number;
  condition: MapPhaseCondition;
};

const MULTI_STAGE_MAPS: Record<number, readonly MapPhaseDefinition[]> = {
  72: [
    { point: "G", required: 3, condition: "sink" },
    { point: "M", required: 4, condition: "sink" }
  ],
  73: [
    { point: "E", required: 3, condition: "sink" },
    { point: "P", required: 4, condition: "sink" }
  ],
  75: [
    { point: "K", required: 2, condition: "sink" },
    { point: "M", required: 1, condition: "victory" },
    { point: "Q", required: 3, condition: "sink" },
    { point: "T", required: 3, condition: "sink" }
  ]
};

export function mapPhaseDefinitions(mapId: number) {
  return MULTI_STAGE_MAPS[mapId];
}

export function mapGaugeStage(mapId: number, phase: number) {
  const stageCount = mapPhaseDefinitions(mapId)?.length ?? 1;
  return Math.min(stageCount, Math.max(1, Math.trunc(phase) || 1));
}

export function mapGaugeRequirement(
  mapId: number,
  phase: number,
  requiredDefeatCount: number | null | undefined
) {
  const stages = mapPhaseDefinitions(mapId);
  if (stages) return stages[mapGaugeStage(mapId, phase) - 1]?.required ?? null;
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
