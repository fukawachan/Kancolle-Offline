import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CACHE_DIR = path.join(ROOT, ".local", "sortie-data-cache");
const OUTPUT_PATH = path.join(ROOT, "src", "master", "sortie-data.generated.json");
const DROP_BASE_URL = "https://db.kcwiki.cn";
const START2_URL = "https://api.kcwiki.org/start2";
const ENEMY_URL = "https://cdn.jsdelivr.net/gh/kcwiki/kancolle-data@master/wiki/enemy.json";
const ENEMY_EQUIPMENT_URL = "https://cdn.jsdelivr.net/gh/kcwiki/kancolle-data@master/wiki/enemyEquipment.json";
const SHIP_URL = "https://cdn.jsdelivr.net/gh/kcwiki/kancolle-data@master/wiki/ship.json";
const REFRESH_CACHE = process.argv.includes("--refresh");
const WIKI_RAW_URLS = new Map([
  [52, "https://zh.kcwiki.cn/wiki/%E5%8D%97%E6%96%B9%E6%B5%B7%E5%9F%9F/5-2?action=raw"],
  [72, "https://zh.kcwiki.cn/wiki/%E5%8D%97%E8%A5%BF%E6%B5%B7%E5%9F%9F/7-2?action=raw"]
]);
const FORMATION_IDS = new Map([
  ["単縦陣", 1],
  ["单纵阵", 1],
  ["複縦陣", 2],
  ["复纵阵", 2],
  ["輪形陣", 3],
  ["轮形阵", 3],
  ["梯形陣", 4],
  ["梯形阵", 4],
  ["単横陣", 5],
  ["单横阵", 5],
  ["警戒陣", 6],
  ["警戒阵", 6]
]);
const NORMAL_MAP_IDS = [
  11, 12, 13, 14, 15, 16,
  21, 22, 23, 24, 25,
  31, 32, 33, 34, 35,
  41, 42, 43, 44, 45,
  51, 52, 53, 54, 55,
  61, 62, 63, 64, 65,
  71, 72, 73, 74, 75
];
const SHIP_TYPE_NAMES = new Map([
  [1, "海防艦"],
  [2, "駆逐艦"],
  [3, "軽巡洋艦"],
  [4, "重雷装巡洋艦"],
  [5, "重巡洋艦"],
  [6, "航空巡洋艦"],
  [7, "軽空母"],
  [8, "巡洋戦艦"],
  [9, "戦艦"],
  [10, "航空戦艦"],
  [11, "正規空母"],
  [12, "超弩級戦艦"],
  [13, "潜水艦"],
  [14, "潜水空母"],
  [15, "補給艦"],
  [16, "水上機母艦"],
  [17, "揚陸艦"],
  [18, "装甲空母"],
  [19, "工作艦"],
  [20, "潜水母艦"],
  [21, "練習巡洋艦"],
  [22, "補給艦"]
]);

async function main() {
  await mkdir(CACHE_DIR, { recursive: true });
  console.log("Fetching kcwiki master sources...");
  const [start2Response, enemyData, enemyEquipmentData, shipData] = await Promise.all([
    fetchJsonCached("start2.json", START2_URL),
    fetchJsonCached("enemy.json", ENEMY_URL),
    fetchJsonCached("enemy-equipment.json", ENEMY_EQUIPMENT_URL),
    fetchJsonCached("ship.json", SHIP_URL)
  ]);
  const start2 = start2Response.api_data ?? start2Response;
  const enemyById = new Map(Object.values(enemyData).map((enemy) => [numberValue(enemy._api_id), enemy]));
  const enemyEquipmentByName = new Map(Object.values(enemyEquipmentData).map((equipment) => [equipment._name, equipment]));
  const shipByJapaneseName = new Map(Object.values(shipData).map((ship) => [ship._japanese_name, ship]));
  const start2SlotById = new Map(start2.api_mst_slotitem.map((slot) => [numberValue(slot.api_id), slot]));

  console.log("Fetching normal-map node and drop statistics...");
  const pointRequests = [];
  for (const mapId of NORMAL_MAP_IDS) {
    const html = await fetchTextCached(`map-${mapId}.html`, `${DROP_BASE_URL}/drop/map/${mapId}`);
    const points = parseMapPoints(mapId, html);
    if (points.length === 0) throw new Error(`No combat points found for map ${mapId}`);
    pointRequests.push(...points);
  }

  const fetchedPoints = await mapLimit(pointRequests, 10, async (point, index) => {
    process.stdout.write(`\r  ${String(index + 1).padStart(3, " ")}/${pointRequests.length} ${point.mapId}-${point.point}`);
    const filename = `drop-${point.mapId}-${point.point}-${point.ranks}.json`;
    const url = `${DROP_BASE_URL}/api/cache/drop_map_${point.mapId}_${point.point}-${point.ranks}`;
    const dropData = await fetchJsonCached(filename, url);
    let fallbackEncounters = [];
    if (numberValue(dropData.totalCount) === 0) {
      const wikiUrl = WIKI_RAW_URLS.get(point.mapId);
      if (!wikiUrl) throw new Error(`No wiki fallback URL for map ${point.mapId} point ${point.point}`);
      const wikiRaw = await fetchTextCached(`wiki-${point.mapId}.txt`, wikiUrl);
      fallbackEncounters = parseWikiPointEncounters(point, wikiRaw);
    }
    return buildPointData(point, dropData, shipByJapaneseName, fallbackEncounters);
  });
  process.stdout.write("\n");

  const enemyIds = new Set(
    fetchedPoints.flatMap((point) => point.encounters.flatMap((encounter) => encounter.shipIds))
  );
  const equipmentIds = new Set();
  const enemyTemplates = {};
  const enemyShips = [];

  for (const enemyId of [...enemyIds].sort((left, right) => left - right)) {
    const enemy = enemyById.get(enemyId);
    if (!enemy) throw new Error(`Missing enemy master ${enemyId}`);
    const equipment = (enemy._equipment ?? []).slice(0, 5);
    const slots = equipment.map((slot) => {
      if (!slot?.equipment) return -1;
      const equipmentMaster = enemyEquipmentByName.get(slot.equipment);
      if (!equipmentMaster) throw new Error(`Missing enemy equipment ${slot.equipment}`);
      const equipmentId = enemyEquipmentApiId(equipmentMaster._id);
      if (!start2SlotById.has(equipmentId)) throw new Error(`Missing start2 enemy equipment ${equipmentId}`);
      equipmentIds.add(equipmentId);
      return equipmentId;
    });
    const onSlot = fixedArray(equipment.map((slot) => numberValue(slot?.size)), 5, 0);
    enemyTemplates[enemyId] = {
      masterId: enemyId,
      level: 1,
      hp: Math.max(1, numberValue(enemy._hp, 1)),
      shipType: numberValue(enemy._type, 2),
      firepower: numberValue(enemy._firepower),
      torpedo: numberValue(enemy._torpedo),
      aa: numberValue(enemy._aa),
      armor: numberValue(enemy._armor),
      luck: numberValue(enemy._luck),
      range: numberValue(enemy._range, 1),
      slots,
      onSlot
    };
    enemyShips.push(enemyShipMaster(enemy, enemyId, onSlot, slots.length));
  }

  const enemySlots = [...equipmentIds]
    .sort((left, right) => left - right)
    .map((equipmentId) => normalizeSlotMaster(start2SlotById.get(equipmentId)));

  const maps = NORMAL_MAP_IDS.map((mapId) => ({
    mapId,
    points: fetchedPoints
      .filter((point) => point.mapId === mapId)
      .sort((left, right) => left.nodeNos[0] - right.nodeNos[0] || left.point.localeCompare(right.point))
  }));
  validateGeneratedData(maps, enemyTemplates, enemyShips, enemySlots);

  const generated = {
    generatedAt: new Date().toISOString(),
    sources: {
      drop: `${DROP_BASE_URL}/drop/`,
      start2: START2_URL,
      enemy: ENEMY_URL,
      enemyEquipment: ENEMY_EQUIPMENT_URL,
      ship: SHIP_URL
    },
    maps,
    enemyTemplates,
    enemyShips,
    enemySlots
  };
  await writeFile(OUTPUT_PATH, `${JSON.stringify(generated)}\n`);

  const nodeCount = maps.reduce(
    (sum, map) => sum + map.points.reduce((pointSum, point) => pointSum + point.nodeNos.length, 0),
    0
  );
  const encounterCount = maps.reduce(
    (sum, map) => sum + map.points.reduce((pointSum, point) => pointSum + point.encounters.length, 0),
    0
  );
  console.log(`Generated ${path.relative(ROOT, OUTPUT_PATH)}`);
  console.log(`  ${maps.length} maps, ${maps.reduce((sum, map) => sum + map.points.length, 0)} points, ${nodeCount} nodes`);
  console.log(`  ${encounterCount} encounter rows, ${enemyShips.length} enemy ships, ${enemySlots.length} enemy slots`);
}

function parseMapPoints(mapId, html) {
  const expression = new RegExp(
    `href=['"]/drop/map/${mapId}/([^'"]+)['"] title=['"]([^'"]+)['"]>([^<]+)</a>`,
    "g"
  );
  return [...html.matchAll(expression)].map((match) => {
    const hrefMatch = match[1].match(/^([A-Z]+)-([A-Z]+)\.html$/);
    if (!hrefMatch) throw new Error(`Unexpected drop link for map ${mapId}: ${match[1]}`);
    const nodeNos = parseNodeNos(match[2]);
    if (nodeNos.length === 0) throw new Error(`Missing node numbers for map ${mapId} point ${hrefMatch[1]}`);
    return {
      mapId,
      point: hrefMatch[1],
      ranks: hrefMatch[2],
      title: match[2].replace(/\s*\([^)]+\)\s*$/, ""),
      isBoss: match[3].includes("Boss"),
      nodeNos
    };
  });
}

function parseNodeNos(title) {
  const match = title.match(/\(([^)]+)\)\s*$/);
  return match ? [...match[1].matchAll(/\d+/g)].map((item) => Number(item[0])) : [];
}

function buildPointData(point, dropData, shipByJapaneseName, fallbackEncounters = []) {
  const encounterRankCounts = new Map();
  const dropPool = Object.entries(dropData.data ?? {})
    .map(([shipName, entry]) => {
      const ship = shipName === "(无)" ? undefined : shipByJapaneseName.get(shipName);
      if (shipName !== "(无)" && !ship) throw new Error(`Missing drop ship master: ${shipName}`);
      const enemyWeights = {};
      for (const [enemyFleetKey, observed] of Object.entries(entry.enemy ?? {})) {
        const rankWeights = rankWeightsOf(observed.count);
        enemyWeights[enemyFleetKey] = rankWeights;
        const totals = encounterRankCounts.get(enemyFleetKey) ?? [0, 0, 0];
        for (let rank = 0; rank < 3; rank += 1) totals[rank] += rankWeights[rank];
        encounterRankCounts.set(enemyFleetKey, totals);
      }
      return {
        shipId: shipName === "(无)" ? null : numberValue(ship._api_id ?? ship._id),
        shipName,
        shipType: shipName === "(无)" ? "" : SHIP_TYPE_NAMES.get(numberValue(ship._type)) ?? "",
        rankWeights: rankWeightsOf(entry.rankCount),
        totalWeight: numberValue(entry.totalCount),
        enemyWeights: sortedObject(enemyWeights)
      };
    })
    .sort((left, right) => {
      if (left.shipId == null) return -1;
      if (right.shipId == null) return 1;
      return left.shipId - right.shipId;
    });
  let encounters = [...encounterRankCounts.entries()]
    .map(([key, rankCounts]) => {
      const parsed = parseEnemyFleetKey(key);
      return {
        key,
        shipIds: parsed.shipIds,
        formation: parsed.formation,
        weight: rankCounts.reduce((sum, count) => sum + count, 0)
      };
    })
    .sort((left, right) => left.key.localeCompare(right.key));
  if (encounters.length === 0) encounters = fallbackEncounters;
  if (encounters.length === 0) throw new Error(`No encounters for map ${point.mapId} point ${point.point}`);
  if (dropPool.length === 0) {
    dropPool.push({
      shipId: null,
      shipName: "(无)",
      shipType: "",
      rankWeights: [encounters.length, encounters.length, encounters.length],
      totalWeight: encounters.length * 3,
      enemyWeights: Object.fromEntries(encounters.map((encounter) => [encounter.key, [1, 1, 1]]))
    });
  }
  return {
    mapId: point.mapId,
    point: point.point,
    title: point.title,
    isBoss: point.isBoss,
    combat: true,
    eventId: point.isBoss ? 5 : 4,
    colorNo: point.isBoss ? 6 : 5,
    nodeNos: point.nodeNos,
    encounters,
    dropPool,
    observedAt: dropData.timeRange ?? []
  };
}

function parseWikiPointEncounters(point, wikiRaw) {
  const pointExpression = new RegExp(
    String.raw`\{\{敌方配置表\s*\n\s*\|\s*海域点\s*=\s*${point.point}\s*(?:\n|$)`
  );
  const start = wikiRaw.search(pointExpression);
  if (start < 0) throw new Error(`Missing wiki enemy block for map ${point.mapId} point ${point.point}`);
  const end = wikiRaw.indexOf("\n}}", start);
  if (end < 0) throw new Error(`Unterminated wiki enemy block for map ${point.mapId} point ${point.point}`);
  const block = wikiRaw.slice(start, end);
  const encounters = [];
  const enemyExpression = /^\s*\|\s*敌方(\d*)\s*=(.*)$/gm;
  for (const match of block.matchAll(enemyExpression)) {
    const suffix = match[1];
    const shipIds = [...match[2].matchAll(/\{\{深海横幅\|(\d+)/g)].map((item) => Number(item[1]));
    if (shipIds.length === 0) continue;
    const formationLine = block.match(new RegExp(`^\\s*\\|\\s*阵型${suffix}\\s*=(.*)$`, "m"))?.[1] ?? "";
    const formation = formationId(formationLine);
    encounters.push({
      key: `wiki:${point.mapId}-${point.point}-${suffix || "1"}/${formation}`,
      shipIds,
      formation,
      weight: 1
    });
  }
  return encounters;
}

function formationId(value) {
  for (const [name, id] of FORMATION_IDS) {
    if (value.includes(name)) return id;
  }
  return 1;
}

function parseEnemyFleetKey(key) {
  const shipIds = [...key.matchAll(/\((\d+)\)/g)].map((match) => Number(match[1]));
  const formation = Number(key.match(/\/(\d+)$/)?.[1] ?? 1);
  if (shipIds.length === 0) throw new Error(`Cannot parse enemy fleet: ${key}`);
  return { shipIds, formation };
}

function enemyShipMaster(enemy, enemyId, onSlot, slotCount) {
  const hp = Math.max(1, numberValue(enemy._hp, 1));
  const armor = numberValue(enemy._armor);
  const firepower = numberValue(enemy._firepower);
  const torpedo = numberValue(enemy._torpedo);
  const aa = numberValue(enemy._aa);
  const luck = numberValue(enemy._luck);
  return {
    api_id: enemyId,
    api_sortno: enemyId,
    api_sort_id: 0,
    api_name: enemy._japanese_name ?? enemy._name ?? `Enemy ${enemyId}`,
    api_yomi: "-",
    api_stype: numberValue(enemy._type, 2),
    api_ctype: 1,
    api_afterlv: 0,
    api_aftershipid: 0,
    api_taik: [hp, hp],
    api_souk: [armor, armor],
    api_houg: [firepower, firepower],
    api_raig: [torpedo, torpedo],
    api_tyku: [aa, aa],
    api_luck: [luck, luck],
    api_leng: numberValue(enemy._range, 1),
    api_slot_num: Math.min(5, slotCount),
    api_maxeq: onSlot,
    api_buildtime: 0,
    api_broken: [0, 0, 0, 0],
    api_powup: [0, 0, 0, 0],
    api_backs: Math.max(1, numberValue(enemy._rarity, 1)),
    api_getmes: "",
    api_fuel_max: 0,
    api_bull_max: 0,
    api_voicef: 0
  };
}

function normalizeSlotMaster(slot) {
  if (!slot) throw new Error("Cannot normalize an empty slot master");
  return {
    api_id: numberValue(slot.api_id),
    api_sortno: numberValue(slot.api_sortno),
    api_name: slot.api_name ?? "",
    api_yomi: slot.api_yomi ?? slot.api_name ?? "",
    api_type: Array.isArray(slot.api_type) ? slot.api_type.map(Number) : [1, 1, 1, 1, 0],
    api_taik: numberValue(slot.api_taik),
    api_souk: numberValue(slot.api_souk),
    api_houg: numberValue(slot.api_houg),
    api_raig: numberValue(slot.api_raig),
    api_soku: numberValue(slot.api_soku),
    api_baku: numberValue(slot.api_baku),
    api_tyku: numberValue(slot.api_tyku),
    api_tais: numberValue(slot.api_tais),
    api_atap: numberValue(slot.api_atap),
    api_houm: numberValue(slot.api_houm),
    api_raim: numberValue(slot.api_raim),
    api_houk: numberValue(slot.api_houk),
    api_raik: numberValue(slot.api_raik),
    api_bakk: numberValue(slot.api_bakk),
    api_saku: numberValue(slot.api_saku),
    api_sakb: numberValue(slot.api_sakb),
    api_luck: numberValue(slot.api_luck),
    api_leng: numberValue(slot.api_leng),
    api_rare: numberValue(slot.api_rare),
    api_broken: fixedArray(slot.api_broken ?? [], 4, 0).map(Number),
    api_info: slot.api_info ?? "",
    api_usebull: String(slot.api_usebull ?? "0"),
    api_version: numberValue(slot.api_version, 1),
    api_cost: slot.api_cost ?? null,
    api_distance: slot.api_distance ?? null
  };
}

function validateGeneratedData(maps, enemyTemplates, enemyShips, enemySlots) {
  if (maps.length !== NORMAL_MAP_IDS.length) throw new Error(`Expected ${NORMAL_MAP_IDS.length} maps, got ${maps.length}`);
  const enemyShipIds = new Set(enemyShips.map((ship) => ship.api_id));
  const enemySlotIds = new Set(enemySlots.map((slot) => slot.api_id));
  for (const map of maps) {
    if (map.mapId !== 16 && !map.points.some((point) => point.isBoss)) {
      throw new Error(`Map ${map.mapId} has no boss point`);
    }
    for (const point of map.points) {
      for (const encounter of point.encounters) {
        for (const shipId of encounter.shipIds) {
          if (!enemyTemplates[shipId] || !enemyShipIds.has(shipId)) throw new Error(`Missing enemy ${shipId}`);
          for (const slotId of enemyTemplates[shipId].slots) {
            if (slotId > 0 && !enemySlotIds.has(slotId)) throw new Error(`Missing enemy slot ${slotId}`);
          }
        }
      }
    }
  }
}

async function fetchJsonCached(filename, url) {
  const text = await fetchTextCached(filename, url);
  return JSON.parse(text);
}

async function fetchTextCached(filename, url) {
  const cachePath = path.join(CACHE_DIR, filename);
  if (!REFRESH_CACHE) {
    try {
      return await readFile(cachePath, "utf8");
    } catch {
      // Populate the local cache below.
    }
  }
  const response = await fetch(url, { headers: { "user-agent": "kancolle-local-sortie-generator" } });
  if (!response.ok) throw new Error(`HTTP ${response.status} for ${url}`);
  const text = await response.text();
  await writeFile(cachePath, text);
  return text;
}

async function mapLimit(items, limit, task) {
  const results = new Array(items.length);
  let nextIndex = 0;
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (true) {
      const index = nextIndex;
      nextIndex += 1;
      if (index >= items.length) return;
      results[index] = await task(items[index], index);
    }
  }));
  return results;
}

function rankWeightsOf(value) {
  return [0, 1, 2].map((index) => Math.max(0, Math.trunc(numberValue(value?.[index]))));
}

function enemyEquipmentApiId(rawId) {
  const id = numberValue(rawId);
  return id < 1000 ? id + 1000 : id;
}

function fixedArray(values, length, fill) {
  return [...values, ...Array(length).fill(fill)].slice(0, length);
}

function sortedObject(object) {
  return Object.fromEntries(Object.entries(object).sort(([left], [right]) => left.localeCompare(right)));
}

function numberValue(value, fallback = 0) {
  if (value === false || value == null || value === "") return fallback;
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

await main();
