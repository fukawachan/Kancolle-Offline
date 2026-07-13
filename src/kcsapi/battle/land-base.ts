import type { EnemyTargetKind } from "../../master/enemy-classification.js";

export const LAND_BASE_SORTIE_ACTION_KIND = 1;
export const LAND_BASE_WAVES_PER_BASE = 2 as const;

export type LandBaseRangeEvidence = {
  requiredDistance: number;
  level: "protocol" | "published";
  source: string;
};

export type LandBasePlanInput = {
  areaId: number;
  targetNode?: number;
  rangeEvidence?: LandBaseRangeEvidence | null;
  assignments?: readonly LandBaseWaveAssignment[];
  bases: readonly {
    areaId: number;
    baseId: number;
    actionKind: number;
    distanceBase: number;
    distanceBonus: number;
    activeSquadrons: number;
  }[];
};

export type LandBaseWaveAssignment = {
  baseId: number;
  wave: 1 | 2;
  targetNode: number;
  rangeEvidence: LandBaseRangeEvidence | null;
};

export type LandBaseWavePlan = {
  areaId: number;
  baseId: number;
  wave: 1 | 2;
  targetNode: number;
  requiredDistance: number;
  effectiveDistance: number;
};

export type LandBaseDispatchRejection = {
  areaId: number;
  baseId: number;
  reason: "wrong-area" | "not-sortie-action" | "empty" | "missing-range-evidence" | "out-of-range";
  requiredDistance: number | null;
  effectiveDistance: number;
  wave?: 1 | 2;
  targetNode?: number;
};

export type LandBaseDispatchPlan = {
  waves: LandBaseWavePlan[];
  rejected: LandBaseDispatchRejection[];
};

export type LandBaseSquadronPlane = {
  masterId: number;
  count: number;
};

export type LandBaseAirPhase = {
  api_plane_from: number[][];
  api_stage1: unknown;
  api_stage2: unknown;
  api_stage3: unknown;
  api_air_fire?: unknown;
};

export type LandBaseWavePayload = {
  api_base_id: number;
  api_stage_flag: [number, number, number];
  api_plane_from: [null, number[] | null];
  api_squadron_plane: { api_mst_id: number; api_count: number }[];
  api_stage1: unknown;
  api_stage2: unknown;
  api_stage3: unknown;
  api_air_fire?: unknown;
};

export type LandAttackSpecialModifierRule = {
  id: string;
  aircraftMasterIds: readonly number[];
  targetKinds: readonly EnemyTargetKind[];
  multiplier: number;
  evidence: {
    level: "verified" | "inferred" | "missing";
    source: string | null;
  };
};

/** Production remains neutral until an individually evidenced rule is added. */
export const LAND_ATTACK_SPECIAL_MODIFIER_RULES: readonly LandAttackSpecialModifierRule[] = Object.freeze([]);

export function planLandBaseDispatch(input: LandBasePlanInput): LandBaseDispatchPlan {
  const areaId = positiveInt(input.areaId);
  const defaultTargetNode = positiveInt(input.targetNode ?? 0);
  const defaultRange = normalizeRangeEvidence(input.rangeEvidence);
  const assignments = input.assignments ?? input.bases.flatMap((base) => [1, 2].map((wave) => ({
    baseId: base.baseId,
    wave: wave as 1 | 2,
    targetNode: defaultTargetNode,
    rangeEvidence: defaultRange
  })));
  const waves: LandBaseWavePlan[] = [];
  const rejected: LandBaseDispatchRejection[] = [];

  for (const base of [...input.bases].sort((a, b) => a.baseId - b.baseId)) {
    const effectiveDistance = Math.max(0, positiveInt(base.distanceBase) + nonNegativeInt(base.distanceBonus));
    const baseAssignments = assignments.filter((assignment) => positiveInt(assignment.baseId) === positiveInt(base.baseId));
    const reject = (
      reason: LandBaseDispatchRejection["reason"],
      assignment?: LandBaseWaveAssignment
    ) => rejected.push({
      areaId: positiveInt(base.areaId),
      baseId: positiveInt(base.baseId),
      reason,
      requiredDistance: normalizeRangeEvidence(assignment?.rangeEvidence)?.requiredDistance ?? null,
      effectiveDistance,
      ...(assignment ? { wave: assignment.wave, targetNode: positiveInt(assignment.targetNode) } : {})
    });

    if (positiveInt(base.areaId) !== areaId) {
      reject("wrong-area");
      continue;
    }
    if (Math.trunc(base.actionKind) !== LAND_BASE_SORTIE_ACTION_KIND) {
      reject("not-sortie-action");
      continue;
    }
    if (positiveInt(base.activeSquadrons) <= 0 || effectiveDistance <= 0) {
      reject("empty");
      continue;
    }
    if (baseAssignments.length === 0) continue;
    for (const assignment of baseAssignments) {
      const range = normalizeRangeEvidence(assignment.rangeEvidence);
      if (!range) {
        reject("missing-range-evidence", assignment);
        continue;
      }
      if (effectiveDistance < range.requiredDistance) {
        reject("out-of-range", assignment);
        continue;
      }
      waves.push({
        areaId,
        baseId: positiveInt(base.baseId),
        wave: assignment.wave,
        targetNode: positiveInt(assignment.targetNode),
        requiredDistance: range.requiredDistance,
        effectiveDistance
      });
    }
  }
  return { waves, rejected };
}

export function landBaseWavePayload(
  baseId: number,
  squadrons: readonly LandBaseSquadronPlane[],
  phase: LandBaseAirPhase
): LandBaseWavePayload {
  return {
    api_base_id: positiveInt(baseId),
    api_stage_flag: [phase.api_stage1 ? 1 : 0, phase.api_stage2 ? 1 : 0, phase.api_stage3 ? 1 : 0],
    // A land base has no friendly ship position. Captured protocol responses
    // use null here and expose only enemy aircraft origins in the second slot.
    api_plane_from: [null, normalizePlaneFrom(phase.api_plane_from?.[1])],
    api_squadron_plane: squadrons.map((squadron) => ({
      api_mst_id: positiveInt(squadron.masterId),
      api_count: nonNegativeInt(squadron.count)
    })),
    api_stage1: phase.api_stage1 ?? null,
    api_stage2: phase.api_stage2 ?? null,
    api_stage3: phase.api_stage3 ?? null,
    ...(phase.api_air_fire ? { api_air_fire: phase.api_air_fire } : {})
  };
}

export function resolveLandAttackSpecialModifier(
  aircraftMasterId: number,
  targetKind: EnemyTargetKind,
  rules: readonly LandAttackSpecialModifierRule[] = LAND_ATTACK_SPECIAL_MODIFIER_RULES
) {
  const rule = rules.find((candidate) =>
    candidate.evidence.level === "verified" &&
    Boolean(candidate.evidence.source) &&
    candidate.aircraftMasterIds.includes(Math.trunc(aircraftMasterId)) &&
    candidate.targetKinds.includes(targetKind) &&
    Number.isFinite(candidate.multiplier) &&
    candidate.multiplier > 0
  );
  return rule
    ? { multiplier: rule.multiplier, ruleId: rule.id, evidence: rule.evidence }
    : { multiplier: 1, ruleId: null, evidence: null };
}

function normalizeRangeEvidence(evidence: LandBaseRangeEvidence | null | undefined) {
  if (!evidence || !evidence.source.trim()) return null;
  const requiredDistance = positiveInt(evidence.requiredDistance);
  return requiredDistance > 0 ? { ...evidence, requiredDistance } : null;
}

function normalizePlaneFrom(value: number[] | undefined) {
  if (!Array.isArray(value) || value.length === 0) return null;
  return [...new Set(value.map(positiveInt).filter((item) => item > 0))].sort((a, b) => a - b);
}

function positiveInt(value: number) {
  return Math.max(0, Math.trunc(Number(value) || 0));
}

function nonNegativeInt(value: number) {
  return Math.max(0, Math.trunc(Number(value) || 0));
}
