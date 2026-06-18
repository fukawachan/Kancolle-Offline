import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const CACHE_DIR = path.join(ROOT, ".local", "wiki-cache");
const OUTPUT = path.join(ROOT, "src", "master", "expedition-data.ts");
const START2_URL = "https://api.kcwiki.moe/start2";
const RULES_URL = "https://raw.githubusercontent.com/Nishisonic/SuccessCheck/master/mission_extend.js";
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

async function loadText(envName, cacheName, url) {
  const explicit = process.env[envName];
  if (explicit) return readFile(explicit, "utf8");
  const cachePath = path.join(CACHE_DIR, cacheName);
  try {
    return await readFile(cachePath, "utf8");
  } catch {
    const response = await fetch(url, { headers: { "user-agent": "kancolle-local-dev" } });
    if (!response.ok) throw new Error(`${url} returned HTTP ${response.status}`);
    const text = await response.text();
    await mkdir(CACHE_DIR, { recursive: true });
    await writeFile(cachePath, text);
    return text;
  }
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
    .replace(alternativePattern, "");
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
  };
}

function validateMasters(masters) {
  if (masters.length !== 63) throw new Error(`Expected 63 expedition masters, got ${masters.length}`);
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
    const normalized = {
      ...item,
      api_name: item.api_id === 55 ? "ケッコン指輪" : item.api_name,
      api_description: Array.isArray(item.api_description)
        ? item.api_description.filter(Boolean)
        : item.api_description,
    };
    if (![31, 32, 33, 34].includes(item.api_id)) return normalized;
    return { ...normalized, api_usetype: 0, api_category: 0 };
  });
}

function render(masters, useItems, definitions) {
  const source = `// Generated by scripts/generate-expedition-data.mjs.
// Sources checked on 2026-06-15:
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
};

export const EXPEDITION_MASTERS: ExpeditionMaster[] = ${JSON.stringify(masters, null, 2)};

export const EXPEDITION_USEITEM_MASTERS = ${JSON.stringify(useItems, null, 2)};

export const EXPEDITION_DEFINITIONS: ExpeditionDefinition[] = ${JSON.stringify(definitions, null, 2)};
`;
  return source;
}

const start2 = JSON.parse(await loadText("START2_FILE", "expedition-start2.json", START2_URL));
const ruleSource = await loadText("MISSION_RULES_FILE", "mission_extend.js", RULES_URL);
const masters = normalizeMissionMasters(start2.api_mst_mission ?? []);
const useItems = normalizeUseItems(start2.api_mst_useitem ?? []);
validateMasters(masters);

const rows = parseRuleRows(ruleSource);
const definitions = masters.map((master, index) => {
  const row = rows.get(master.api_id);
  if (!row) throw new Error(`Missing operational rule for expedition ${master.api_id}`);
  return buildDefinition(master, row, index === 0 ? [] : [masters[index - 1].api_id]);
});

const useItemIds = new Set(useItems.map((item) => item.api_id));
for (const definition of definitions) {
  for (const reward of definition.rewards.items) {
    if (!useItemIds.has(reward.itemId)) {
      throw new Error(`Expedition ${definition.id} references unknown use item ${reward.itemId}`);
    }
  }
}

await writeFile(OUTPUT, render(masters, useItems, definitions));
console.log(`Generated ${definitions.length} expedition definitions at ${OUTPUT}`);
