import { writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createFrozenSourceSession, generatedOutputPath } from "./lib/frozen-source.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const OUTPUT = generatedOutputPath(path.join(ROOT, "src", "master", "expedition-data.ts"));
const KANCOLLE_DATA_COMMIT = "a8018819ad330b73c714fbba195794453c8dfde3";
const SUCCESS_CHECK_COMMIT = "3a20af2f43d8ac679dd1aed3069fdabcd735c930";
const START2_URL = `https://raw.githubusercontent.com/kcwiki/kancolle-data/${KANCOLLE_DATA_COMMIT}/api/api_start2.json`;
const RULES_URL = `https://raw.githubusercontent.com/Nishisonic/SuccessCheck/${SUCCESS_CHECK_COMMIT}/mission_extend.js`;
const REQUIRED_MASTER_KEYS = [
  "api_id", "api_maparea_id", "api_disp_no", "api_reset_type", "api_damage_type",
  "api_name", "api_difficulty", "api_details", "api_time", "api_use_fuel",
  "api_use_bull", "api_win_item1", "api_win_item2", "api_win_mat_level",
  "api_sample_fleet", "api_deck_num", "api_return_flag", "api_mission_type",
];

const REWARD_ITEM_IDS = new Map([
  ["高速修復材", 1],
  ["高速建造材", 2],
  ["開発資材", 3],
  ["改修資材", 4],
  ["家具箱(小)", 10],
  ["家具箱(中)", 11],
  ["家具箱(大)", 12],
  ["給糧艦「伊良湖」", 59],
]);

const SHIP_TYPE_IDS = new Map([
  ["海防", [1]],
  ["駆", [2]],
  ["軽", [3]],
  ["重", [5, 6]],
  ["軽母", [7]],
  ["航戦", [10]],
  ["空母", [7, 11, 18]],
  ["潜", [13, 14]],
  ["水母", [16]],
  ["潜水母艦", [20]],
  ["練巡", [21]],
  ["護空", [7]],
]);

const session = await createFrozenSourceSession("expedition", {
  generator: "scripts/generate-expedition-data.mjs",
  userAgent: "kancolle-local-expedition-generator"
});

async function loadText(cacheName, url, revision, upstream) {
  return session.readText(cacheName, url, {
    revision,
    evidence: "exact",
    license: {
      spdx: "NOASSERTION",
      url: upstream,
      note: "Community mechanics/master snapshot; consult the pinned upstream revision for terms"
    }
  });
}

function parseRuleRows(source) {
  const rows = new Map();
  const pattern = /case\s+(\d+):\s+return\s+(\[[^\n]+\])/g;
  for (const match of source.matchAll(pattern)) {
    const id = Number(match[1]);
    const values = JSON.parse(match[2]);
    rows.set(id, values);
  }
  return rows;
}

function parseDuration(value) {
  const [hours, minutes] = String(value).split(":").map(Number);
  const duration = hours * 60 + minutes;
  if (!Number.isFinite(duration) || duration <= 0) {
    throw new Error(`Invalid expedition duration: ${value}`);
  }
  return duration;
}

function parseReward(value) {
  if (!value) return null;
  const match = String(value).match(/^(.+?)[×x]0~(\d+)$/);
  if (!match) throw new Error(`Unsupported expedition reward syntax: ${value}`);
  const itemId = REWARD_ITEM_IDS.get(match[1]);
  if (!itemId) throw new Error(`Unknown expedition reward item: ${match[1]}`);
  return { itemId, maxCount: Number(match[2]) };
}

function parseRequirements(requirementsText) {
  const shipGroups = [];
  const alternatives = [];
  const combinedPattern = /\(駆\+海防\)(\d+)/g;
  for (const match of requirementsText.matchAll(combinedPattern)) {
    shipGroups.push({ typeIds: [1, 2], count: Number(match[1]), flagship: false });
  }

  const alternativePattern = /駆(\d+)or海防(\d+)/g;
  for (const match of requirementsText.matchAll(alternativePattern)) {
    alternatives.push([
      { typeIds: [2], count: Number(match[1]), flagship: false },
      { typeIds: [1], count: Number(match[2]), flagship: false },
    ]);
  }

  const simplePattern = /(潜水母艦|航戦|練巡|護空|軽母|水母|空母|海防|重|軽|潜|駆)(\d+)(\[旗艦\])?/g;
  const withoutCombined = requirementsText
    .replace(combinedPattern, "")
    .replace(alternativePattern, "")
    // Stat requirements contain the same kanji as ship abbreviations (for
    // example, 対潜210).  Remove them before parsing composition or they are
    // misread as an impossible requirement for 210 submarines.
    .replace(/(?:火力|対空|対潜|索敵)\d+/g, "")
    .replace(/ﾄﾞﾗﾑ缶\d+隻(?:\d+個)?/g, "");
  for (const match of withoutCombined.matchAll(simplePattern)) {
    const typeIds = SHIP_TYPE_IDS.get(match[1]);
    if (!typeIds) throw new Error(`Unknown expedition ship type: ${match[1]}`);
    shipGroups.push({
      typeIds,
      count: Number(match[2]),
      flagship: Boolean(match[3]),
    });
  }

  const stat = (label) => Number(requirementsText.match(new RegExp(`${label}(\\d+)`))?.[1] ?? 0);
  const drumMatch = requirementsText.match(/ﾄﾞﾗﾑ缶(\d+)隻(?:(\d+)個)?/);
  return {
    shipGroups,
    alternatives,
    statRequirements: {
      firepower: stat("火力"),
      antiAir: stat("対空"),
      antiSubmarine: stat("対潜"),
      lineOfSight: stat("索敵"),
    },
    drumCanRequirement: drumMatch
      ? { equippedShips: Number(drumMatch[1]), totalItems: Number(drumMatch[2] ?? drumMatch[1]) }
      : null,
  };
}

function buildDefinition(master, row, prerequisiteIds) {
  const [
    minimumShips,
    flagshipLevel,
    totalLevel,
    requirementsText,
    duration,
    admiralExp,
    shipExp,
    fuel,
    ammo,
    steel,
    bauxite,
    reward1,
    reward2,
    greatSuccessType,
  ] = row;

  return {
    id: master.api_id,
    areaId: master.api_maparea_id,
    prerequisiteIds,
    durationMinutes: parseDuration(duration),
    minimumShips,
    flagshipLevel,
    totalLevel,
    requirementsText,
    ...parseRequirements(requirementsText),
    greatSuccessType: greatSuccessType || "support",
    resetType: master.api_reset_type,
    damageType: master.api_damage_type,
    returnAllowed: master.api_return_flag === 1,
    supportType: master.api_id === 33 ? "route" : master.api_id === 34 ? "boss" : null,
    costs: {
      fuelRate: master.api_use_fuel,
      ammoRate: master.api_use_bull,
    },
    rewards: {
      admiralExp,
      shipExp,
      materials: [fuel, ammo, steel, bauxite],
      items: [parseReward(reward1), parseReward(reward2)].filter(Boolean),
    },
    evidence: {
      level: "exact",
      operationalRulesRevision: SUCCESS_CHECK_COMMIT,
      masterRevision: KANCOLLE_DATA_COMMIT,
      prerequisiteLevel: prerequisiteIds.length === 0 ? "exact" : "fallback"
    }
  };
}

function buildSupportDefinition(master) {
  const supportType = master.api_disp_no === "S1" ? "route" : "boss";
  if (!supportType) throw new Error(`Unsupported master-only expedition ${master.api_id}`);
  return {
    id: master.api_id,
    areaId: master.api_maparea_id,
    prerequisiteIds: [],
    durationMinutes: Number(master.api_time),
    minimumShips: 2,
    flagshipLevel: 1,
    totalLevel: 0,
    requirementsText: "駆2",
    ...parseRequirements("駆2"),
    greatSuccessType: "support",
    resetType: master.api_reset_type,
    damageType: master.api_damage_type,
    returnAllowed: master.api_return_flag === 1,
    supportType,
    costs: { fuelRate: master.api_use_fuel, ammoRate: master.api_use_bull },
    rewards: { admiralExp: 0, shipExp: 0, materials: [0, 0, 0, 0], items: [] },
    evidence: {
      level: "exact",
      operationalRulesRevision: "master-support-contract",
      masterRevision: KANCOLLE_DATA_COMMIT,
      prerequisiteLevel: "exact"
    }
  };
}

function validateMasters(masters) {
  if (masters.length < 63) throw new Error(`Expected at least 63 expedition masters, got ${masters.length}`);
  const ids = new Set();
  for (const master of masters) {
    if (ids.has(master.api_id)) throw new Error(`Duplicate expedition master ${master.api_id}`);
    ids.add(master.api_id);
    for (const key of REQUIRED_MASTER_KEYS) {
      if (!(key in master)) throw new Error(`Expedition ${master.api_id} is missing ${key}`);
    }
  }
}

function normalizeMissionMasters(masters) {
  return masters.map((master) => ({
    ...master,
    api_mission_type: Number(master.api_mission_type ?? 0),
  }));
}

function normalizeUseItems(useItems) {
  return useItems.map((item) => {
    return {
      ...item,
      api_description: Array.isArray(item.api_description)
        ? item.api_description.filter(Boolean)
        : item.api_description,
    };
  });
}

function render(masters, useItems, definitions) {
  const checkedDate = session.generatedAt.slice(0, 10);
  const source = `// Generated by scripts/generate-expedition-data.mjs.
// Sources checked on ${checkedDate}:
// - ${START2_URL}
// - ${RULES_URL}
// Do not edit this file by hand.

export type ExpeditionMaster = {
  api_id: number;
  api_disp_no: string;
  api_maparea_id: number;
  api_name: string;
  api_details: string;
  api_reset_type: number;
  api_damage_type: number;
  api_mission_type: number;
  api_time: number;
  api_deck_num: number;
  api_difficulty: number;
  api_use_fuel: number;
  api_use_bull: number;
  api_win_item1: number[];
  api_win_item2: number[];
  api_win_mat_level: number[];
  api_return_flag: number;
  api_sample_fleet: number[];
};

export type ExpeditionRewardItem = { itemId: number; maxCount: number };
export type ExpeditionShipGroup = { typeIds: number[]; count: number; flagship: boolean };

export type ExpeditionDefinition = {
  id: number;
  areaId: number;
  prerequisiteIds: number[];
  durationMinutes: number;
  minimumShips: number;
  flagshipLevel: number;
  totalLevel: number;
  requirementsText: string;
  shipGroups: ExpeditionShipGroup[];
  alternatives: ExpeditionShipGroup[][];
  statRequirements: {
    firepower: number;
    antiAir: number;
    antiSubmarine: number;
    lineOfSight: number;
  };
  drumCanRequirement: { equippedShips: number; totalItems: number } | null;
  greatSuccessType: string;
  resetType: number;
  damageType: number;
  returnAllowed: boolean;
  supportType: "route" | "boss" | null;
  costs: { fuelRate: number; ammoRate: number };
  rewards: {
    admiralExp: number;
    shipExp: number;
    materials: [number, number, number, number];
    items: ExpeditionRewardItem[];
  };
  evidence: {
    level: "exact" | "statistical" | "fallback";
    operationalRulesRevision: string;
    masterRevision: string;
    prerequisiteLevel: "exact" | "fallback";
  };
};

export const EXPEDITION_MASTERS: ExpeditionMaster[] = ${JSON.stringify(masters, null, 2)};

export const EXPEDITION_USEITEM_MASTERS = ${JSON.stringify(useItems, null, 2)};

export const EXPEDITION_DEFINITIONS: ExpeditionDefinition[] = ${JSON.stringify(definitions, null, 2)};
`;
  return source;
}

const rawStart2 = JSON.parse(await loadText(
  "start2.json",
  START2_URL,
  KANCOLLE_DATA_COMMIT,
  `https://github.com/kcwiki/kancolle-data/tree/${KANCOLLE_DATA_COMMIT}`
));
const start2 = rawStart2.api_data ?? rawStart2;
const ruleSource = await loadText(
  "mission_extend.js",
  RULES_URL,
  SUCCESS_CHECK_COMMIT,
  `https://github.com/Nishisonic/SuccessCheck/tree/${SUCCESS_CHECK_COMMIT}`
);
const masters = normalizeMissionMasters(start2.api_mst_mission ?? []);
const useItems = normalizeUseItems(start2.api_mst_useitem ?? []);
validateMasters(masters);

const rows = parseRuleRows(ruleSource);
const definitions = masters.map((master, index) => {
  const row = rows.get(master.api_id);
  if (!row && /^S[12]$/.test(master.api_disp_no)) return buildSupportDefinition(master);
  if (!row) throw new Error(`Missing operational rule for expedition ${master.api_id}`);
  return buildDefinition(master, row, index === 0 ? [] : [masters[index - 1].api_id]);
});

for (const definition of definitions) {
  const impossible = definition.shipGroups.find((group) => group.count > definition.minimumShips);
  if (impossible) {
    throw new Error(
      `Expedition ${definition.id} composition requires ${impossible.count} ships but fleet size is ${definition.minimumShips}`
    );
  }
}

const useItemIds = new Set(useItems.map((item) => item.api_id));
for (const definition of definitions) {
  for (const reward of definition.rewards.items) {
    if (!useItemIds.has(reward.itemId)) {
      throw new Error(`Expedition ${definition.id} references unknown use item ${reward.itemId}`);
    }
  }
}

await writeFile(OUTPUT, render(masters, useItems, definitions));
await session.finalize({
  repositoryRevisions: {
    kancolleData: KANCOLLE_DATA_COMMIT,
    successCheck: SUCCESS_CHECK_COMMIT
  }
});
console.log(`Generated ${definitions.length} expedition definitions at ${OUTPUT}`);
