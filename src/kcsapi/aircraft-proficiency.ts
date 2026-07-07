import type { masterData } from "../master/data.js";

type SlotMaster = (typeof masterData.api_mst_slotitem)[number];

export type AircraftProficiencyBattleMode = "sortie" | "combined" | "practice" | "support";

export type AircraftProficiencyBattleResultInput = {
  master: SlotMaster | undefined;
  previousExp: number;
  previousCount: number;
  currentCount: number;
  mode: AircraftProficiencyBattleMode;
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

  const lost = Math.max(0, previousCount - currentCount);
  const lossPenalty = previousCount > 0 ? Math.ceil((lost / previousCount) * 20) : 0;
  const gained = proficiencyGain(input.master);
  return clampProficiencyExp(input.previousExp - lossPenalty + gained);
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

function proficiencyGain(master: SlotMaster) {
  const type = slotType(master);
  if (type === 6 || type === 45 || type === 48 || type === 56) return 1;
  if (type === 7 || type === 8 || type === 11 || type === 47 || type === 53 || type === 57) return 2;
  return 1;
}

function slotType(master: SlotMaster) {
  return Math.trunc(Number(master.api_type?.[2]) || 0);
}
