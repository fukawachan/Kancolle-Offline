import type { masterData } from "../master/data.js";

type SlotMaster = (typeof masterData.api_mst_slotitem)[number];

export type AircraftProficiencyBattleMode = "sortie" | "combined" | "practice" | "support";

export type AircraftProficiencyBattleResultInput = {
  master: SlotMaster | undefined;
  previousExp: number;
  previousCount: number;
  currentCount: number;
  mode: AircraftProficiencyBattleMode;
  /**
   * Non-wipe losses are not backed by an exact public formula. Callers may
   * opt into a named statistical model; the default preserves proficiency.
   */
  nonWipeLossProfile?: AircraftProficiencyNonWipeLossProfile;
  lossRoll?: number;
};

export type AircraftProficiencyNonWipeLossProfile = {
  id: string;
  enabled: boolean;
  evidence: {
    level: "missing" | "statistical-baseline";
    source: string | null;
  };
  maximumPenalty: number;
  spread: number;
};

export type AircraftProficiencyTrainingRule = {
  typeId: number;
  sortieGain: number;
  evidence: {
    level: "published-table" | "compatibility-baseline";
    source: string;
  };
};

export const MAX_AIRCRAFT_PROFICIENCY_EXP = 120;
export const AIRCRAFT_PROFICIENCY_RANK_EXP = [0, 10, 25, 40, 55, 70, 85, 100, 121] as const;

const PROFICIENT_AIRCRAFT_TYPES = new Set([6, 7, 8, 9, 10, 11, 25, 26, 41, 45, 47, 48, 49, 53, 56, 57, 58, 59, 60, 91, 94]);
const FIGHTER_TYPE_BONUS_TYPES = new Set([6, 45, 48, 56, 57, 58, 60, 91]);
const SEAPLANE_BOMBER_TYPE_BONUS_TYPES = new Set([11]);
const FIGHTER_TYPE_BONUS = [0, 0, 2, 5, 9, 14, 14, 22] as const;
const SEAPLANE_BOMBER_TYPE_BONUS = [0, 0, 1, 1, 1, 3, 3, 6] as const;
const INITIAL_SKILLED_NAME_PATTERNS = [
  "熟練",
  "友永隊",
  "村田隊",
  "江草隊",
  "岩本隊",
  "岩井隊",
  "野中隊",
  "飛行第",
  "戦隊",
  "台南空",
  "251空",
  "352空",
  "八幡部隊"
];

export const NO_UNVERIFIED_PROFICIENCY_LOSS: AircraftProficiencyNonWipeLossProfile = Object.freeze({
  id: "fail-closed-no-non-wipe-loss",
  enabled: false,
  evidence: { level: "missing" as const, source: null },
  maximumPenalty: 0,
  spread: 0
});

export const STATISTICAL_PROFICIENCY_LOSS_BASELINE: AircraftProficiencyNonWipeLossProfile = Object.freeze({
  id: "configurable-statistical-v1",
  enabled: true,
  evidence: {
    level: "statistical-baseline" as const,
    source: "local configurable baseline; not asserted as an exact server formula"
  },
  maximumPenalty: 20,
  spread: 0.25
});

/**
 * Training gain is deliberately table-driven so newly introduced aircraft
 * types cannot silently inherit a plausible-looking value.
 */
export const AIRCRAFT_PROFICIENCY_TRAINING_RULES: readonly AircraftProficiencyTrainingRule[] = Object.freeze([
  trainingRule(6, 1, "carrier fighter"),
  trainingRule(7, 2, "carrier dive bomber"),
  trainingRule(8, 2, "carrier torpedo bomber"),
  trainingRule(9, 1, "carrier reconnaissance"),
  trainingRule(10, 1, "seaplane reconnaissance"),
  trainingRule(11, 2, "seaplane bomber"),
  trainingRule(25, 1, "autogyro"),
  trainingRule(26, 1, "liaison aircraft"),
  trainingRule(41, 1, "large flying boat"),
  trainingRule(45, 1, "seaplane fighter"),
  trainingRule(47, 2, "land attack/patrol aircraft"),
  trainingRule(48, 1, "land interceptor"),
  trainingRule(49, 1, "land reconnaissance"),
  trainingRule(53, 2, "heavy land aircraft"),
  trainingRule(56, 1, "jet fighter", "compatibility-baseline"),
  trainingRule(57, 2, "jet fighter-bomber", "compatibility-baseline"),
  trainingRule(58, 2, "jet attacker", "compatibility-baseline"),
  trainingRule(59, 1, "jet reconnaissance", "compatibility-baseline"),
  trainingRule(60, 1, "advanced fighter", "compatibility-baseline"),
  trainingRule(91, 2, "jet fighter-bomber II", "compatibility-baseline"),
  trainingRule(94, 1, "carrier reconnaissance II", "compatibility-baseline")
]);

const TRAINING_RULE_BY_TYPE = new Map(AIRCRAFT_PROFICIENCY_TRAINING_RULES.map((rule) => [rule.typeId, rule] as const));

export function visibleProficiency(exp: number) {
  const value = clampProficiencyExp(exp);
  for (let rank = 7; rank >= 0; rank -= 1) {
    if (value >= AIRCRAFT_PROFICIENCY_RANK_EXP[rank]) return rank;
  }
  return 0;
}

export function proficiencyExpForVisible(rank: number) {
  const normalized = Math.max(0, Math.min(7, Math.trunc(Number(rank) || 0)));
  return Number(AIRCRAFT_PROFICIENCY_RANK_EXP[normalized] ?? 0);
}

export function isProficiencyAircraft(master: SlotMaster | undefined): master is SlotMaster {
  return Boolean(master && PROFICIENT_AIRCRAFT_TYPES.has(slotType(master)));
}

export function initialAircraftProficiencyExp(master: SlotMaster | undefined) {
  if (!isProficiencyAircraft(master)) return 0;
  const name = String(master?.api_name ?? "");
  return INITIAL_SKILLED_NAME_PATTERNS.some((pattern) => name.includes(pattern))
    ? proficiencyExpForVisible(7)
    : 0;
}

export function aircraftAirPowerBonus(master: SlotMaster | undefined, proficiencyExp: number) {
  if (!isProficiencyAircraft(master)) return 0;
  const rank = visibleProficiency(proficiencyExp);
  const internalBonus = Math.sqrt(clampProficiencyExp(proficiencyExp) / 10);
  return internalBonus + aircraftTypeAirPowerBonus(master, rank);
}

export function applyAircraftProficiencyBattleResult(input: AircraftProficiencyBattleResultInput) {
  if (!isProficiencyAircraft(input.master)) return clampProficiencyExp(input.previousExp);
  if (input.mode === "practice" || input.mode === "support") return clampProficiencyExp(input.previousExp);

  const previousCount = Math.max(0, Math.trunc(Number(input.previousCount) || 0));
  const currentCount = Math.max(0, Math.trunc(Number(input.currentCount) || 0));
  if (previousCount > 0 && currentCount <= 0) return 0;

  const lossPenalty = aircraftProficiencyNonWipeLossPenalty({
    previousCount,
    currentCount,
    profile: input.nonWipeLossProfile ?? NO_UNVERIFIED_PROFICIENCY_LOSS,
    roll: input.lossRoll
  });
  const gained = aircraftProficiencyTrainingGain(input.master);
  return clampProficiencyExp(input.previousExp - lossPenalty + gained);
}

export function aircraftProficiencyTrainingGain(master: SlotMaster | undefined) {
  if (!master || !isProficiencyAircraft(master)) return 0;
  return TRAINING_RULE_BY_TYPE.get(slotType(master))?.sortieGain ?? 0;
}

export function aircraftProficiencyTrainingRule(master: SlotMaster | undefined) {
  return master ? TRAINING_RULE_BY_TYPE.get(slotType(master)) : undefined;
}

export function aircraftProficiencyNonWipeLossPenalty(input: {
  previousCount: number;
  currentCount: number;
  profile: AircraftProficiencyNonWipeLossProfile;
  roll?: number;
}) {
  const previousCount = Math.max(0, Math.trunc(Number(input.previousCount) || 0));
  const currentCount = Math.max(0, Math.trunc(Number(input.currentCount) || 0));
  if (!input.profile.enabled || input.profile.evidence.level !== "statistical-baseline") return 0;
  if (!input.profile.evidence.source || previousCount <= 0 || currentCount <= 0 || currentCount >= previousCount) return 0;
  const lossFraction = (previousCount - currentCount) / previousCount;
  const centeredRoll = Math.max(0, Math.min(1, Number(input.roll ?? 0.5))) - 0.5;
  const spreadModifier = 1 + centeredRoll * 2 * Math.max(0, input.profile.spread);
  return Math.max(0, Math.round(lossFraction * Math.max(0, input.profile.maximumPenalty) * spreadModifier));
}

export function clampProficiencyExp(value: number) {
  const n = Math.trunc(Number(value) || 0);
  return Math.max(0, Math.min(MAX_AIRCRAFT_PROFICIENCY_EXP, n));
}

function aircraftTypeAirPowerBonus(master: SlotMaster, rank: number) {
  const type = slotType(master);
  if (FIGHTER_TYPE_BONUS_TYPES.has(type)) return FIGHTER_TYPE_BONUS[rank] ?? 0;
  if (SEAPLANE_BOMBER_TYPE_BONUS_TYPES.has(type)) return SEAPLANE_BOMBER_TYPE_BONUS[rank] ?? 0;
  return 0;
}

function slotType(master: SlotMaster) {
  return Math.trunc(Number(master.api_type?.[2]) || 0);
}

function trainingRule(
  typeId: number,
  sortieGain: number,
  label: string,
  level: AircraftProficiencyTrainingRule["evidence"]["level"] = "published-table"
): AircraftProficiencyTrainingRule {
  return {
    typeId,
    sortieGain,
    evidence: {
      level,
      source: `${label} training-gain table`
    }
  };
}
