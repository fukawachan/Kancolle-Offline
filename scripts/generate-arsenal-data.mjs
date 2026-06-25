import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUTPUT = path.join(ROOT, "src", "master", "arsenal-data.generated.json");
const SHIP_URL = "https://cdn.jsdelivr.net/gh/kcwiki/kancolle-data@master/wiki/ship.json";
const EQUIPMENT_URL = "https://cdn.jsdelivr.net/gh/kcwiki/kancolle-data@master/wiki/equipment.json";
const START2_URL = "https://api.kcwiki.moe/start2";
const CONSTRUCTION_BASE = "https://db.kcwiki.cn/construction";
const DEVELOPMENT_BASE = "https://db.kcwiki.cn/api/cache";
const MIN_SAMPLE_SIZE = 100;
const SPECIAL_CONSTRUCTION_IDS = new Set([171, 174, 175, 433, 448]);

async function getJson(url, attempts = 4) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetch(url, { headers: { "user-agent": "kancolle-local-offline-api" } });
      if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
      return await response.json();
    } catch (error) {
      lastError = error;
      if (attempt < attempts) await new Promise((resolve) => setTimeout(resolve, attempt * 250));
    }
  }
  throw new Error(`Unable to fetch ${url}: ${String(lastError)}`);
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

function compactTable(table) {
  return Object.fromEntries(
    [...table.entries()]
      .filter(([, entry]) => entry.sample >= MIN_SAMPLE_SIZE)
      .sort(([a], [b]) => a.localeCompare(b, "en", { numeric: true }))
      .map(([key, entry]) => [
        key,
        {
          sample: entry.sample,
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
    getJson(SHIP_URL),
    getJson(EQUIPMENT_URL),
    getJson(START2_URL),
    getJson(`${CONSTRUCTION_BASE}/ship_list`),
    getJson(`${DEVELOPMENT_BASE}/development_item_list`)
  ]);

  const constructionRows = await mapLimit(constructionIds, 16, async (id) => [
    Number(id),
    await getJson(`${CONSTRUCTION_BASE}/ship/${id}.json`)
  ]);
  const developmentRows = await mapLimit(developmentIds, 16, async (id) => [
    Number(id),
    await getJson(`${DEVELOPMENT_BASE}/development_item_${id}`)
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
          count: Number(row.count) || 0
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
    generatedAt: new Date().toISOString(),
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
    construction: compactTable(construction),
    specialConstruction,
    development: compactTable(development),
    ships,
    equipment
  };

  await mkdir(path.dirname(OUTPUT), { recursive: true });
  await writeFile(OUTPUT, `${JSON.stringify(result)}\n`);
  console.log(`Generated ${OUTPUT}`);
  console.log(`  construction recipes: ${Object.keys(result.construction).length}`);
  console.log(`  development recipes: ${Object.keys(result.development).length}`);
  console.log(`  ships: ${Object.keys(ships).length}`);
  console.log(`  equipment: ${Object.keys(equipment).length}`);
}

await main();
