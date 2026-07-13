import type { BattleEndpointKind, BattleMode } from "../types.js";

export type BattlePhaseName =
  | "support"
  | "airBase"
  | "kouku"
  | "kouku2"
  | "openingTaisen"
  | "openingAtack"
  | "hougeki1"
  | "hougeki2"
  | "hougeki3"
  | "raigeki"
  | "night";

export type BattleEndpointMode = {
  endpoint: BattleEndpointKind;
  mode: BattleMode;
  phaseSequence: BattlePhaseName[];
  targetPolicy: "normal" | "airOnly" | "landBased" | "combinedSurface" | "combinedWater" | "escortFirst" | "enemyCombined";
  airBase: boolean;
  enemyCombined: "none" | "payload" | "active";
};

export const BATTLE_ENDPOINT_MODES: Record<string, BattleEndpointMode> = {
  "api_req_sortie/battle": {
    endpoint: "sortieDay",
    mode: "sortie",
    phaseSequence: ["support", "kouku", "openingTaisen", "openingAtack", "hougeki1", "hougeki2", "raigeki"],
    targetPolicy: "normal",
    airBase: false,
    enemyCombined: "none"
  },
  "api_req_sortie/airbattle": {
    endpoint: "sortieAir",
    mode: "sortie",
    phaseSequence: ["kouku", "kouku2"],
    targetPolicy: "airOnly",
    airBase: false,
    enemyCombined: "none"
  },
  "api_req_sortie/ld_airbattle": {
    endpoint: "sortieLdAir",
    mode: "sortie",
    phaseSequence: ["airBase", "kouku"],
    targetPolicy: "landBased",
    airBase: true,
    enemyCombined: "none"
  },
  "api_req_sortie/ld_shooting": {
    endpoint: "sortieLdShooting",
    mode: "sortie",
    phaseSequence: ["airBase", "support", "kouku", "openingAtack", "hougeki1", "raigeki"],
    targetPolicy: "landBased",
    airBase: true,
    enemyCombined: "none"
  },
  "api_req_sortie/night_to_day": {
    endpoint: "sortieNightToDay",
    mode: "sortie",
    phaseSequence: ["night", "kouku", "hougeki1", "raigeki"],
    targetPolicy: "normal",
    airBase: false,
    enemyCombined: "none"
  },
  "api_req_combined_battle/battle": {
    endpoint: "combinedDay",
    mode: "combined",
    phaseSequence: ["support", "kouku", "openingTaisen", "openingAtack", "hougeki1", "hougeki2", "hougeki3", "raigeki"],
    targetPolicy: "combinedSurface",
    airBase: false,
    enemyCombined: "payload"
  },
  "api_req_combined_battle/battle_water": {
    endpoint: "combinedBattleWater",
    mode: "combined",
    phaseSequence: ["support", "kouku", "openingTaisen", "openingAtack", "hougeki1", "hougeki2", "hougeki3", "raigeki"],
    targetPolicy: "combinedWater",
    airBase: false,
    enemyCombined: "payload"
  },
  "api_req_combined_battle/each_battle": {
    endpoint: "combinedEachBattle",
    mode: "combined",
    phaseSequence: ["support", "kouku", "openingTaisen", "openingAtack", "hougeki1", "hougeki2", "hougeki3", "raigeki"],
    targetPolicy: "escortFirst",
    airBase: false,
    enemyCombined: "payload"
  },
  "api_req_combined_battle/each_battle_water": {
    endpoint: "combinedEachBattleWater",
    mode: "combined",
    phaseSequence: ["support", "kouku", "openingTaisen", "openingAtack", "hougeki1", "hougeki2", "hougeki3", "raigeki"],
    targetPolicy: "escortFirst",
    airBase: false,
    enemyCombined: "payload"
  },
  "api_req_combined_battle/airbattle": {
    endpoint: "combinedAir",
    mode: "combined",
    phaseSequence: ["kouku", "kouku2"],
    targetPolicy: "airOnly",
    airBase: false,
    enemyCombined: "payload"
  },
  "api_req_combined_battle/ld_airbattle": {
    endpoint: "combinedLdAir",
    mode: "combined",
    phaseSequence: ["airBase", "kouku"],
    targetPolicy: "landBased",
    airBase: true,
    enemyCombined: "payload"
  },
  "api_req_combined_battle/ld_shooting": {
    endpoint: "combinedLdShooting",
    mode: "combined",
    phaseSequence: ["airBase", "support", "kouku", "openingAtack", "hougeki1", "hougeki2", "hougeki3", "raigeki"],
    targetPolicy: "landBased",
    airBase: true,
    enemyCombined: "payload"
  },
  "api_req_combined_battle/ec_battle": {
    endpoint: "combinedEcBattle",
    mode: "combined",
    phaseSequence: ["support", "kouku", "openingAtack", "hougeki1", "hougeki2", "hougeki3", "raigeki"],
    targetPolicy: "enemyCombined",
    airBase: false,
    enemyCombined: "active"
  },
  "api_req_combined_battle/ec_night_to_day": {
    endpoint: "combinedEcNightToDay",
    mode: "combined",
    phaseSequence: ["night", "kouku", "hougeki1", "raigeki"],
    targetPolicy: "enemyCombined",
    airBase: false,
    enemyCombined: "active"
  }
};

export function battleEndpointMode(path: string) {
  const normalized = path.replace(/^\/?kcsapi\//, "").replace(/^\//, "");
  return BATTLE_ENDPOINT_MODES[normalized];
}

export function battleEndpointModeByKind(endpoint: BattleEndpointKind) {
  return Object.values(BATTLE_ENDPOINT_MODES).find((mode) => mode.endpoint === endpoint);
}
