import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { createFrozenSourceSession, generatedOutputPath } from "./lib/frozen-source.mjs";

const QUEST_DATA_URL = "https://kcwikizh.github.io/kcwiki-quest-data/data.json";
const QUEST_DATA_COMMIT = "f3a555a1326bf026fd5704d076ce145a7cdf8414";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const outputPath = generatedOutputPath(path.join(root, "src/master/quest-data.generated.ts"));
const masterDataPath = path.resolve(process.env.MASTER_DATA_PATH || path.join(root, "src/master/generated-data.ts"));
const session = await createFrozenSourceSession("quest", {
  generator: "scripts/generate-quest-data.mjs",
  userAgent: "kancolle-local-quest-generator"
});

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

const [rawQuests, generatedSource] = await Promise.all([
  session.readJson("data.json", QUEST_DATA_URL, {
    revision: QUEST_DATA_COMMIT,
    evidence: "exact",
    parameters: { buildArtifact: "data.json" },
    license: {
      spdx: "NOASSERTION",
      url: `https://github.com/kcwikizh/kcwiki-quest-data/tree/${QUEST_DATA_COMMIT}`,
      note: "Compiled community quest database; consult the pinned upstream repository for terms"
    }
  }),
  readFile(masterDataPath, "utf8")
]);
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
    requirements: quest.requirements ?? { category: "unknown" },
    evidence: {
      level: quest.requirements?.category && quest.requirements.category !== "unknown" ? "exact" : "fallback",
      sourceRevision: QUEST_DATA_COMMIT,
      sourceQuestId: Number(quest.game_id)
    }
  }))
  .sort((a, b) => a.id - b.id);

const output = `// Auto-generated from ${QUEST_DATA_URL}
// Generated: ${session.generatedAt}
// Source revision: ${QUEST_DATA_COMMIT}
// Quest entries: ${quests.length}

import type { QuestDefinition } from "./quest-data.js";

export const GENERATED_QUEST_DEFINITIONS = ${JSON.stringify(quests, null, 2)} as const satisfies readonly QuestDefinition[];
`;

await writeFile(outputPath, output);
await session.finalize({ repositoryRevision: QUEST_DATA_COMMIT });
console.log(`Wrote ${quests.length} quests to src/master/quest-data.generated.ts`);
