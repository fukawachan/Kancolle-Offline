import { writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createFrozenSourceSession, generatedOutputPath } from "./lib/frozen-source.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUTPUT = generatedOutputPath(path.join(ROOT, "src", "master", "arsenal-data.generated.json"));
const KANCOLLE_DATA_COMMIT = "a8018819ad330b73c714fbba195794453c8dfde3";
const DATA_BASE = `https://raw.githubusercontent.com/kcwiki/kancolle-data/${KANCOLLE_DATA_COMMIT}`;
const SHIP_URL = `${DATA_BASE}/wiki/ship.json`;
const EQUIPMENT_URL = `${DATA_BASE}/wiki/equipment.json`;
const START2_URL = `${DATA_BASE}/api/api_start2.json`;
const CONSTRUCTION_BASE = "https://db.kcwiki.cn/construction";
const DEVELOPMENT_BASE = "https://db.kcwiki.cn/api/cache";
const MIN_SAMPLE_SIZE = 100;
const SPECIAL_CONSTRUCTION_IDS = new Set([171, 174, 175, 433, 448]);

const session = await createFrozenSourceSession("arsenal", {
  generator: "scripts/generate-arsenal-data.mjs",
  userAgent: "kancolle-local-arsenal-generator"
});

function getJson(filename, url, metadata) {
  return session.readJson(filename, url, metadata);
}

async function mapLimit(values, limit, mapper) {
  const results = new Array(values.length);
  let next = 0;
  async function worker() {
    while (next < values.length) {
      const index = next;
      next += 1;
      results[index] = await mapper(values[index], index);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, values.length) }, worker));
  return results;
}

function recipeKey(recipe) {
  return recipe.map(Number).join("-");
}

function addOutcome(table, key, sample, id, count) {
  const entry = table.get(key) ?? { sample: 0, outcomes: new Map() };
  entry.sample = Math.max(entry.sample, Number(sample) || 0);
  entry.outcomes.set(Number(id), (entry.outcomes.get(Number(id)) ?? 0) + (Number(count) || 0));
  table.set(key, entry);
}

function compactTable(table, sourceKind) {
  return Object.fromEntries(
    [...table.entries()]
      .filter(([, entry]) => entry.sample >= MIN_SAMPLE_SIZE)
      .sort(([a], [b]) => a.localeCompare(b, "en", { numeric: true }))
      .map(([key, entry]) => [
        key,
        {
          sample: entry.sample,
          evidence: {
            level: "statistical",
            source: sourceKind,
            minimumSampleSize: MIN_SAMPLE_SIZE,
            sampleSize: entry.sample
          },
          outcomes: [...entry.outcomes.entries()]
            .filter(([, count]) => count > 0)
            .sort(([a], [b]) => a - b)
        }
      ])
  );
}

function candidateIsLarge(recipe) {
  return recipe[0] >= 1000 && recipe[1] >= 1000 && recipe[2] >= 1000 && recipe[3] >= 1000;
}

function shipId(entry) {
  return Number(entry._api_id || entry._id || 0);
}

function equipmentId(entry) {
  return Number(entry._id || 0);
}

function normalizeBool(value) {
  return value === true;
}

async function main() {
  console.log("Fetching master and community arsenal data...");
  const [shipWiki, equipmentWiki, start2, constructionIds, developmentIds] = await Promise.all([
    getJson("ship.json", SHIP_URL, repositoryEvidence()),
    getJson("equipment.json", EQUIPMENT_URL, repositoryEvidence()),
    getJson("start2.json", START2_URL, repositoryEvidence()),
    getJson("construction/ship-list.json", `${CONSTRUCTION_BASE}/ship_list`, statisticalEvidence("construction ship list")),
    getJson("development/item-list.json", `${DEVELOPMENT_BASE}/development_item_list`, statisticalEvidence("development item list"))
  ]);

  const constructionRows = await mapLimit(constructionIds, 16, async (id) => [
    Number(id),
    await getJson(
      `construction/ship-${Number(id)}.json`,
      `${CONSTRUCTION_BASE}/ship/${id}.json`,
      statisticalEvidence("construction", { shipId: Number(id) })
    )
  ]);
  const developmentRows = await mapLimit(developmentIds, 16, async (id) => [
    Number(id),
    await getJson(
      `development/item-${Number(id)}.json`,
      `${DEVELOPMENT_BASE}/development_item_${id}`,
      statisticalEvidence("development", { equipmentId: Number(id) })
    )
  ]);

  const construction = new Map();
  const specialConstruction = {};
  const observedNormalShips = new Set();
  const observedLargeShips = new Set();
  let constructionGeneratedAt = "";
  for (const [id, payload] of constructionRows) {
    constructionGeneratedAt = payload.generateTime || constructionGeneratedAt;
    for (const row of payload.data || []) {
      const key = recipeKey(row.recipe);
      if (SPECIAL_CONSTRUCTION_IDS.has(id)) {
        specialConstruction[id] ??= {};
        specialConstruction[id][key] = {
          sample: Number(row.usedCount) || 0,
          count: Number(row.count) || 0,
          evidence: {
            level: "statistical",
            source: "construction",
            sampleSize: Number(row.usedCount) || 0
          }
        };
      } else {
        addOutcome(construction, key, row.usedCount, id, row.count);
        (candidateIsLarge(row.recipe) ? observedLargeShips : observedNormalShips).add(id);
      }
    }
  }

  const development = new Map();
  let developmentGeneratedAt = "";
  let developmentTimeRange = [];
  for (const [id, payload] of developmentRows) {
    developmentGeneratedAt = payload.generateTime || developmentGeneratedAt;
    developmentTimeRange = payload.timeRange || developmentTimeRange;
    for (const row of payload.data || []) {
      addOutcome(development, recipeKey(row.recipe), row.usedCount, id, row.count);
    }
  }

  const equipmentEntries = Object.entries(equipmentWiki);
  const equipmentByName = new Map();
  for (const [key, entry] of equipmentEntries) {
    const id = equipmentId(entry);
    if (id <= 0) continue;
    equipmentByName.set(key, id);
    if (entry._name) equipmentByName.set(entry._name, id);
    if (entry._japanese_name) equipmentByName.set(entry._japanese_name, id);
  }
  const startShipById = new Map((start2.api_mst_ship || []).map((ship) => [Number(ship.api_id), ship]));
  const startEquipmentById = new Map((start2.api_mst_slotitem || []).map((item) => [Number(item.api_id), item]));

  const ships = {};
  for (const entry of Object.values(shipWiki)) {
    const id = shipId(entry);
    if (id <= 0) continue;
    const master = startShipById.get(id);
    const loadout = (entry._equipment || [])
      .map((slot) => {
        if (!slot || slot.equipment === false) return -1;
        return equipmentByName.get(slot.equipment) ?? -1;
      })
      .filter((itemId) => itemId !== 0);
    ships[id] = {
      normal: normalizeBool(entry._buildable) || observedNormalShips.has(id),
      large: normalizeBool(entry._buildable_lsc) || observedLargeShips.has(id),
      buildTime: Number(entry._build_time ?? master?.api_buildtime ?? 20),
      loadout
    };
  }

  const observedDevelopmentIds = new Set(
    [...development.values()].flatMap((entry) => [...entry.outcomes.keys()])
  );
  const equipment = {};
  for (const entry of Object.values(equipmentWiki)) {
    const id = equipmentId(entry);
    if (id <= 0) continue;
    const master = startEquipmentById.get(id);
    const type = Array.isArray(master?.api_type)
      ? Number(master.api_type[2] || 0)
      : Number(entry._type || 0);
    equipment[id] = {
      buildable: normalizeBool(entry._buildable) || observedDevelopmentIds.has(id),
      scrap: [
        Number(entry._scrap_fuel || 0),
        Number(entry._scrap_ammo || 0),
        Number(entry._scrap_steel || 0),
        Number(entry._scrap_bauxite || 0)
      ],
      rarity: Number(entry._rarity || master?.api_rare || 0),
      type
    };
  }

  const result = {
    generatedAt: session.generatedAt,
    minimumSampleSize: MIN_SAMPLE_SIZE,
    sources: {
      ships: SHIP_URL,
      equipment: EQUIPMENT_URL,
      start2: START2_URL,
      construction: `${CONSTRUCTION_BASE}/`,
      development: `${DEVELOPMENT_BASE}/development_item_*`
    },
    snapshots: {
      construction: constructionGeneratedAt,
      development: developmentGeneratedAt,
      developmentTimeRange
    },
    construction: compactTable(construction, "construction"),
    specialConstruction,
    development: compactTable(development, "development"),
    ships,
    equipment
  };

  await writeFile(OUTPUT, `${JSON.stringify(result)}\n`);
  await session.finalize({ repositoryRevision: KANCOLLE_DATA_COMMIT });
  console.log(`Generated ${OUTPUT}`);
  console.log(`  construction recipes: ${Object.keys(result.construction).length}`);
  console.log(`  development recipes: ${Object.keys(result.development).length}`);
  console.log(`  ships: ${Object.keys(ships).length}`);
  console.log(`  equipment: ${Object.keys(equipment).length}`);
}

function repositoryEvidence() {
  return {
    revision: KANCOLLE_DATA_COMMIT,
    evidence: "exact",
    license: {
      spdx: "NOASSERTION",
      url: `https://github.com/kcwiki/kancolle-data/tree/${KANCOLLE_DATA_COMMIT}`,
      note: "Community master-data snapshot; consult the pinned upstream repository for terms"
    }
  };
}

function statisticalEvidence(dataset, parameters = null) {
  return {
    evidence: "statistical",
    parameters: { dataset, ...(parameters ?? {}) },
    license: {
      spdx: "NOASSERTION",
      url: "https://db.kcwiki.cn/",
      note: "Aggregated community observations; no machine-readable license was published"
    }
  };
}

await main();
