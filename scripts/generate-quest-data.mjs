import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const QUEST_DATA_URL = "https://kcwikizh.github.io/kcwiki-quest-data/data.json";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

const materialRewards = new Map([
  ["高速修復材", "repairKit"],
  ["高速建造材", "buildKit"],
  ["開発資材", "devmat"],
  ["改修資材", "screw"]
]);

const useItemRewards = new Map([
  ["家具箱（小）", 10],
  ["家具箱（中）", 11],
  ["家具箱（大）", 12],
  ["給糧艦「間宮」", 54],
  ["給糧艦「伊良湖」", 59],
  ["補強増設", 64],
  ["戦闘糧食", 66],
  ["洋上補給", 67],
  ["プレゼント箱", 60],
  ["菱餅", 58],
  ["勲章", 57],
  ["特注家具職人", 52],
  ["熟練搭乗員", 70],
  ["新型航空機設計図", 74],
  ["新型砲熕兵装資材", 75],
  ["新型航空兵装資材", 77],
  ["戦闘詳報", 78],
  ["新型噴進装備開発資材", 92],
  ["新型兵装資材", 94],
  ["航空特別増加食", 102]
]);

const periodByType = new Map([
  [1, "once"],
  [2, "daily"],
  [3, "weekly"],
  [4, "daily"],
  [5, "daily"],
  [6, "monthly"],
  [7, "quarterly"]
]);

function loadGeneratedMasters(source) {
  const sanitized = source
    .replace(/^export /gm, "")
    .replace(/\s+as const;/g, ";");
  return Function(`${sanitized}\nreturn { SLOT_ITEMS, SHIPS, FURNITURE };`)();
}

function byName(items, nameKey, idKey) {
  const map = new Map();
  for (const item of items) {
    const name = item[nameKey];
    const id = item[idKey];
    if (typeof name === "string" && Number.isFinite(Number(id)) && !map.has(name)) {
      map.set(name, Number(id));
    }
  }
  return map;
}

function normalizeReward(reward, indexes) {
  if (Array.isArray(reward.choices)) {
    return {
      kind: "choice",
      choices: reward.choices.map((choice) => normalizeReward(choice, indexes))
    };
  }

  const name = String(reward.name ?? "");
  const amount = Math.max(1, Number(reward.amount ?? 1));
  if (reward.category === "艦娘") {
    return indexes.ships.has(name)
      ? { kind: "ship", name, masterId: indexes.ships.get(name), amount }
      : { kind: "special", name, amount };
  }
  if (reward.category === "装備") {
    return indexes.equipment.has(name)
      ? { kind: "equipment", name, masterId: indexes.equipment.get(name), amount }
      : { kind: "special", name, amount };
  }
  if (reward.category === "家具") {
    return indexes.furniture.has(name)
      ? { kind: "furniture", name, furnitureId: indexes.furniture.get(name), amount }
      : { kind: "special", name, amount };
  }
  if (materialRewards.has(name)) {
    return { kind: "material", name, material: materialRewards.get(name), amount };
  }
  if (useItemRewards.has(name)) {
    return { kind: "useitem", name, itemId: useItemRewards.get(name), amount };
  }
  if (indexes.equipment.has(name)) {
    return { kind: "equipment", name, masterId: indexes.equipment.get(name), amount };
  }
  if (indexes.ships.has(name)) {
    return { kind: "ship", name, masterId: indexes.ships.get(name), amount };
  }
  return { kind: "special", name, amount };
}

const [questResponse, generatedSource] = await Promise.all([
  fetch(QUEST_DATA_URL),
  readFile(path.join(root, "src/master/generated-data.ts"), "utf8")
]);

if (!questResponse.ok) {
  throw new Error(`Failed to download quest data: ${questResponse.status} ${questResponse.statusText}`);
}

const rawQuests = await questResponse.json();
const generatedMasters = loadGeneratedMasters(generatedSource);
const indexes = {
  ships: byName(generatedMasters.SHIPS, "api_name", "api_id"),
  equipment: byName(generatedMasters.SLOT_ITEMS, "api_name", "api_id"),
  furniture: byName(generatedMasters.FURNITURE, "api_title", "api_id")
};

const quests = rawQuests
  .map((quest) => ({
    id: Number(quest.game_id),
    wikiId: String(quest.wiki_id),
    category: Number(quest.category),
    type: Number(quest.type),
    period: periodByType.get(Number(quest.type)) ?? "once",
    title: String(quest.name),
    detail: String(quest.detail),
    materialRewards: [
      Number(quest.reward_fuel ?? 0),
      Number(quest.reward_ammo ?? 0),
      Number(quest.reward_steel ?? 0),
      Number(quest.reward_bauxite ?? 0)
    ],
    rewards: Array.isArray(quest.reward_other)
      ? quest.reward_other.map((reward) => normalizeReward(reward, indexes))
      : [],
    prerequisites: Array.isArray(quest.prerequisite)
      ? quest.prerequisite.map((id) => Number(id)).filter((id) => Number.isFinite(id))
      : [],
    requirements: quest.requirements ?? { category: "unknown" }
  }))
  .sort((a, b) => a.id - b.id);

const output = `// Auto-generated from ${QUEST_DATA_URL}
// Generated: ${new Date().toISOString()}
// Quest entries: ${quests.length}

import type { QuestDefinition } from "./quest-data.js";

export const GENERATED_QUEST_DEFINITIONS = ${JSON.stringify(quests, null, 2)} as const satisfies readonly QuestDefinition[];
`;

await writeFile(path.join(root, "src/master/quest-data.generated.ts"), output);
console.log(`Wrote ${quests.length} quests to src/master/quest-data.generated.ts`);
