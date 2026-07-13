import { writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { load } from "cheerio";
import { createFrozenSourceSession, generatedOutputPath } from "./lib/frozen-source.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUTPUT_PATH = generatedOutputPath(path.join(ROOT, "src", "master", "sortie-data.generated.json"));
const DROP_BASE_URL = "https://db.kcwiki.cn";
const KANCOLLE_DATA_COMMIT = "a8018819ad330b73c714fbba195794453c8dfde3";
const DATA_BASE = `https://raw.githubusercontent.com/kcwiki/kancolle-data/${KANCOLLE_DATA_COMMIT}`;
const START2_URL = `${DATA_BASE}/api/api_start2.json`;
const ENEMY_URL = `${DATA_BASE}/wiki/enemy.json`;
const ENEMY_EQUIPMENT_URL = `${DATA_BASE}/wiki/enemyEquipment.json`;
const SHIP_URL = `${DATA_BASE}/wiki/ship.json`;
const EXPERIENCE_VERSION = "normal-sortie-exp-2026-07-13";
const KCWIKI_EXPERIENCE_URL = (() => {
  const url = new URL("https://zh.kcwiki.cn/api.php");
  url.searchParams.set("action", "query");
  url.searchParams.set("prop", "revisions");
  url.searchParams.set("rvprop", "content");
  url.searchParams.set("redirects", "1");
  url.searchParams.set("format", "json");
  url.searchParams.set("formatversion", "2");
  url.searchParams.set("titles", [
    "1-1", "1-2", "1-3", "1-4", "1-5", "1-6",
    "2-1", "2-2", "2-3", "2-4", "2-5",
    "3-1", "3-2", "3-3", "3-4", "3-5",
    "4-1", "4-2", "4-3", "4-4", "4-5",
    "5-1", "5-2", "5-3", "5-4", "5-5", "5-6",
    "6-1", "6-2", "6-3", "6-4", "6-5",
    "7-1", "7-2", "7-3", "7-4", "7-5"
  ].join("|"));
  return url.toString();
})();
const WIKIWIKI_EXPERIENCE_URLS = new Map([
  [13, "https://wikiwiki.jp/kancolle/%E9%8E%AE%E5%AE%88%E5%BA%9C%E6%B5%B7%E5%9F%9F/1-3"],
  [21, "https://wikiwiki.jp/kancolle/%E5%8D%97%E8%A5%BF%E8%AB%B8%E5%B3%B6%E6%B5%B7%E5%9F%9F/2-1"],
  [25, "https://wikiwiki.jp/kancolle/%E5%8D%97%E8%A5%BF%E8%AB%B8%E5%B3%B6%E6%B5%B7%E5%9F%9F/2-5"],
  [35, "https://wikiwiki.jp/kancolle/%E5%8C%97%E6%96%B9%E6%B5%B7%E5%9F%9F/3-5"],
  [44, "https://wikiwiki.jp/kancolle/%E8%A5%BF%E6%96%B9%E6%B5%B7%E5%9F%9F/4-4"],
  [53, "https://wikiwiki.jp/kancolle/%E5%8D%97%E6%96%B9%E6%B5%B7%E5%9F%9F/5-3"],
  [54, "https://wikiwiki.jp/kancolle/%E5%8D%97%E6%96%B9%E6%B5%B7%E5%9F%9F/5-4"],
  [55, "https://wikiwiki.jp/kancolle/%E5%8D%97%E6%96%B9%E6%B5%B7%E5%9F%9F/5-5"],
  [56, "https://wikiwiki.jp/kancolle/%E5%8D%97%E6%96%B9%E6%B5%B7%E5%9F%9F/5-6"],
  [64, "https://wikiwiki.jp/kancolle/%E4%B8%AD%E9%83%A8%E6%B5%B7%E5%9F%9F/6-4"],
  [71, "https://wikiwiki.jp/kancolle/%E5%8D%97%E8%A5%BF%E6%B5%B7%E5%9F%9F/7-1"],
  [73, "https://wikiwiki.jp/kancolle/%E5%8D%97%E8%A5%BF%E6%B5%B7%E5%9F%9F/7-3"],
  [74, "https://wikiwiki.jp/kancolle/%E5%8D%97%E8%A5%BF%E6%B5%B7%E5%9F%9F/7-4"],
  [75, "https://wikiwiki.jp/kancolle/%E5%8D%97%E8%A5%BF%E6%B5%B7%E5%9F%9F/7-5"]
]);
const WIKI_RAW_URLS = new Map([
  [52, "https://zh.kcwiki.cn/wiki/%E5%8D%97%E6%96%B9%E6%B5%B7%E5%9F%9F/5-2?action=raw"],
  [56, "https://zh.kcwiki.cn/wiki/%E5%8D%97%E6%96%B9%E6%B5%B7%E5%9F%9F/5-6?action=raw"],
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
// Enemy combined fleets use the four cruising formations.  The drop source
// serializes those fleets as twelve slash-separated ships followed by the
// formation id, without an explicit main/escort delimiter.
const ENEMY_COMBINED_FORMATION_IDS = new Set([11, 12, 13, 14]);
const NORMAL_MAP_IDS = [
  11, 12, 13, 14, 15, 16,
  21, 22, 23, 24, 25,
  31, 32, 33, 34, 35,
  41, 42, 43, 44, 45,
  51, 52, 53, 54, 55, 56,
  61, 62, 63, 64, 65,
  71, 72, 73, 74, 75
];
// Current HQ S-rank values from wikiwiki.jp/kancolle/経験値.  Multi-gauge
// phase bosses are explicit because the normal-map index only marks the final
// boss.  Other ranks are derived at settlement time, never baked into this
// table.
const ADMIRAL_EXP_BY_MAP = new Map(Object.entries({
  11: [10, { C: 20 }], 12: [20, { E: 140 }], 13: [40, { J: 380 }],
  14: [60, { L: 720 }], 15: [80, { J: 1060 }], 16: [100, {}],
  21: [60, { H: 720 }], 22: [70, { K: 840 }], 23: [90, { N: 1180 }],
  24: [120, { P: 1740 }], 25: [160, { O: 2320 }],
  31: [110, { G: 1420 }], 32: [120, { L: 1740 }], 33: [140, { M: 2280 }],
  34: [160, { P: 3320 }], 35: [190, { K: 2880 }],
  41: [110, { J: 1520 }], 42: [120, { L: 1640 }], 43: [140, { N: 1880 }],
  44: [170, { K: 2340 }], 45: [200, { T: 2900 }],
  51: [160, { J: 2020 }], 52: [170, { O: 2340 }], 53: [190, { Q: 2680 }],
  54: [210, { P: 3020 }], 55: [240, { S: 3480 }],
  56: [250, { G: 500, N: 500, Z: 3500 }],
  61: [180, { K: 2160 }], 62: [200, { K: 2600 }], 63: [180, { J: 2760 }],
  64: [230, { N: 3160 }], 65: [260, { M: 3520 }],
  71: [140, { K: 1680 }], 72: [180, { G: 360, M: 2360 }],
  73: [160, { E: 320, P: 1920 }], 74: [170, { P: 2140 }],
  75: [180, { K: 360, Q: 360, T: 2360 }]
}).map(([mapId, [normal, bosses]]) => [Number(mapId), { normal, bosses }]));
const EXTRA_PHASE_BOSSES = new Map([
  [56, new Set(["G", "N", "Z"])],
  [72, new Set(["G", "M"])],
  [73, new Set(["E", "P"])],
  [75, new Set(["K", "Q", "T"])]
]);
// These three current tables still display “(EXP)” for every row.  They are
// isolated and visibly marked inferred rather than allowing a rank-based
// runtime fallback.  Values follow the surrounding air-raid/surface-node bands
// and can be replaced row-for-row when the public tables publish measurements.
const UNPUBLISHED_POINT_EXP = new Map([
  ["56:K1", 100],
  ["56:K2", 110],
  ["75:R", 180]
]);
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
const session = await createFrozenSourceSession("sortie", {
  generator: "scripts/generate-sortie-data.mjs",
  userAgent: "kancolle-local-sortie-generator"
});

async function main() {
  console.log("Fetching kcwiki master sources...");
  const [start2Response, enemyData, enemyEquipmentData, shipData, kcwikiExperienceData] = await Promise.all([
    fetchJsonCached("start2.json", START2_URL),
    fetchJsonCached("enemy.json", ENEMY_URL),
    fetchJsonCached("enemy-equipment.json", ENEMY_EQUIPMENT_URL),
    fetchJsonCached("ship.json", SHIP_URL),
    fetchJsonCached("experience-kcwiki.json", KCWIKI_EXPERIENCE_URL)
  ]);
  const start2 = start2Response.api_data ?? start2Response;
  const enemyById = new Map(Object.values(enemyData).map((enemy) => [numberValue(enemy._api_id), enemy]));
  const enemyEquipmentByName = new Map(Object.values(enemyEquipmentData).map((equipment) => [equipment._name, equipment]));
  const shipByJapaneseName = new Map(Object.values(shipData).map((ship) => [ship._japanese_name, ship]));
  const start2SlotById = new Map(start2.api_mst_slotitem.map((slot) => [numberValue(slot.api_id), slot]));
  const wikiwikiExperienceByMap = new Map();
  for (const [mapId, url] of WIKIWIKI_EXPERIENCE_URLS) {
    const html = await fetchTextCached(`experience-wikiwiki-${mapId}.html`, url);
    wikiwikiExperienceByMap.set(mapId, parseWikiwikiExperienceRows(html));
  }

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

  applySortieExperience(
    fetchedPoints,
    parseKcwikiExperienceRows(kcwikiExperienceData),
    wikiwikiExperienceByMap,
    enemyById
  );

  const enemyIds = new Set(
    fetchedPoints.flatMap((point) => point.encounters.flatMap((encounter) => [
      ...encounter.shipIds,
      ...(encounter.enemyCombinedShipIds ?? [])
    ]))
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
    experience: {
      version: EXPERIENCE_VERSION,
      normalAdmiralExp: ADMIRAL_EXP_BY_MAP.get(mapId).normal,
      bossAdmiralExpByPoint: ADMIRAL_EXP_BY_MAP.get(mapId).bosses,
      evidence: {
        level: "exact",
        source: "https://wikiwiki.jp/kancolle/%E7%B5%8C%E9%A8%93%E5%80%A4",
        sampleSize: 0
      }
    },
    points: fetchedPoints
      .filter((point) => point.mapId === mapId)
      .sort((left, right) => left.nodeNos[0] - right.nodeNos[0] || left.point.localeCompare(right.point))
  }));
  validateGeneratedData(maps, enemyTemplates, enemyShips, enemySlots);

  const generated = {
    generatedAt: session.generatedAt,
    sources: {
      drop: `${DROP_BASE_URL}/drop/`,
      experienceKcwiki: KCWIKI_EXPERIENCE_URL,
      experienceWikiwiki: "https://wikiwiki.jp/kancolle/",
      experienceVersion: EXPERIENCE_VERSION,
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
  await session.finalize({ repositoryRevision: KANCOLLE_DATA_COMMIT });

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
    const hrefMatch = match[1].match(/^([A-Z]+\d*)-([A-Z]+)\.html$/);
    if (!hrefMatch) throw new Error(`Unexpected drop link for map ${mapId}: ${match[1]}`);
    const nodeNos = parseNodeNos(match[2]);
    if (nodeNos.length === 0) throw new Error(`Missing node numbers for map ${mapId} point ${hrefMatch[1]}`);
    // The drop source decorates only the final point on multi-gauge maps.  The
    // earlier phase bosses still use boss HQ-exp settlement rules.
    const isPhaseBoss = EXTRA_PHASE_BOSSES.get(mapId)?.has(hrefMatch[1]) === true;
    return {
      mapId,
      point: hrefMatch[1],
      ranks: hrefMatch[2],
      title: match[2].replace(/\s*\([^)]+\)\s*$/, ""),
      isBoss: match[3].includes("Boss") || isPhaseBoss,
      nodeNos
    };
  });
}

function parseNodeNos(title) {
  const match = title.match(/\(([^)]+)\)\s*$/);
  return match ? [...match[1].matchAll(/\d+/g)].map((item) => Number(item[0])) : [];
}

function parseKcwikiExperienceRows(payload) {
  const rowsByMap = new Map();
  for (const page of payload?.query?.pages ?? []) {
    const source = page.revisions?.[0]?.content ?? page.revisions?.[0]?.slots?.main?.content ?? "";
    const mapMatch = source.match(/\|\s*海域编号\s*=\s*(\d)\s*-\s*(\d)/);
    if (!mapMatch) continue;
    const mapId = Number(mapMatch[1]) * 10 + Number(mapMatch[2]);
    const rows = [];
    for (const match of source.matchAll(/\{\{敌方配置表\s*([\s\S]*?)(?=\n\s*\}\})/g)) {
      const block = match[1];
      const point = block.match(/^\s*\|\s*海域点\s*=\s*([^\n|]+)/m)?.[1]?.trim();
      if (!point) continue;
      for (const enemy of block.matchAll(/^\s*\|\s*敌方(\d*)\s*=(.*)$/gm)) {
        const suffix = enemy[1];
        const shipIds = [...enemy[2].matchAll(/\{\{深海横幅\|(\d+)/g)].map((item) => Number(item[1]));
        if (shipIds.length === 0) continue;
        const rawExp = block.match(new RegExp(`^\\s*\\|\\s*获得经验${suffix}\\s*=\\s*([^\\n|]+)`, "m"))?.[1]?.trim();
        rows.push({
          point,
          shipIds,
          baseExp: /^\d+$/.test(rawExp ?? "") ? Number(rawExp) : null
        });
      }
    }
    rowsByMap.set(mapId, rows);
  }
  return rowsByMap;
}

function parseWikiwikiExperienceRows(html) {
  const $ = load(html);
  const tables = $("table").toArray().filter((candidate) =>
    $(candidate).find("th").toArray().some((cell) => $(cell).text().trim() === "EXP")
  );
  if (tables.length === 0) throw new Error("WikiWiki page has no enemy EXP table");

  return tables.flatMap((table) => {
    const spans = [];
    const grid = [];
    $(table).find("tr").each((_rowIndex, rowElement) => {
      const row = [];
      for (let column = 0; column < spans.length; column += 1) {
        if ((spans[column]?.remaining ?? 0) > 0) {
          row[column] = spans[column].value;
          spans[column].remaining -= 1;
        }
      }
      let column = 0;
      $(rowElement).children("th,td").each((_cellIndex, cellElement) => {
        while (row[column] != null) column += 1;
        const value = $(cellElement).text().trim().replace(/\s+/g, " ");
        const rowSpan = Math.max(1, numberValue($(cellElement).attr("rowspan"), 1));
        const columnSpan = Math.max(1, numberValue($(cellElement).attr("colspan"), 1));
        for (let offset = 0; offset < columnSpan; offset += 1) {
          row[column + offset] = value;
          if (rowSpan > 1) spans[column + offset] = { value, remaining: rowSpan - 1 };
        }
        column += columnSpan;
      });
      grid.push(row);
    });

    const header = grid[0] ?? [];
    const pointColumn = header.indexOf("出現場所");
    const expColumn = header.indexOf("EXP");
    const enemyColumn = header.indexOf("出現艦船");
    if (pointColumn < 0 || expColumn < 0 || enemyColumn < 0) {
      throw new Error("WikiWiki enemy EXP table has unexpected columns");
    }
    return grid.slice(1).flatMap((row) => {
      const point = String(row[pointColumn] ?? "").match(/^([A-Z]+\d*)/)?.[1];
      const enemyNames = String(row[enemyColumn] ?? "").split("、").map(normalizeWikiEnemyName).filter(Boolean);
      if (!point || enemyNames.length === 0) return [];
      const rawExp = String(row[expColumn] ?? "").trim();
      return [{ point, enemyNames, baseExp: /^\d+$/.test(rawExp) ? Number(rawExp) : null }];
    });
  });
}

function applySortieExperience(points, kcwikiRowsByMap, wikiwikiRowsByMap, enemyById) {
  const assignments = [];
  for (const point of points) {
    const kcwikiRows = kcwikiRowsByMap.get(point.mapId) ?? [];
    const wikiwikiRows = wikiwikiRowsByMap.get(point.mapId) ?? [];
    for (const encounter of point.encounters) {
      const shipIds = [...encounter.shipIds, ...(encounter.enemyCombinedShipIds ?? [])];
      const wikiNames = shipIds.map((id) => wikiEnemyAlias(id, enemyById.get(id)?._japanese_name ?? ""));
      const genericNames = shipIds.map((id) => genericWikiEnemyName(enemyById.get(id)?._japanese_name ?? ""));
      const exactKcwiki = kcwikiRows.filter((row) =>
        row.point === point.point && arraysEqual(row.shipIds, shipIds) && positiveInteger(row.baseExp)
      );
      const exactWikiwiki = wikiwikiRows.filter((row) =>
        row.point === point.point && arraysEqual(row.enemyNames, wikiNames) && positiveInteger(row.baseExp)
      );
      const genericWikiwiki = wikiwikiRows.filter((row) =>
        row.point === point.point
        && arraysEqual(row.enemyNames.map(genericWikiEnemyName), genericNames)
        && positiveInteger(row.baseExp)
      );
      const kcwikiValues = uniquePositiveValues(exactKcwiki.map((row) => row.baseExp));
      const exactWikiValues = uniquePositiveValues(exactWikiwiki.map((row) => row.baseExp));
      const genericWikiValues = uniquePositiveValues(genericWikiwiki.map((row) => row.baseExp));
      let assignment = null;
      if (kcwikiValues.length === 1) {
        assignment = experienceAssignment(kcwikiValues[0], "exact", "experience-kcwiki.json", "map+point+enemy-id-sequence");
      } else if (exactWikiValues.length === 1) {
        assignment = experienceAssignment(exactWikiValues[0], "exact", `experience-wikiwiki-${point.mapId}.html`, "map+point+annotated-enemy-sequence");
      } else if (genericWikiValues.length === 1) {
        assignment = experienceAssignment(genericWikiValues[0], "exact", `experience-wikiwiki-${point.mapId}.html`, "map+point+enemy-name-sequence");
      } else if (kcwikiValues.length > 1) {
        // A few legacy tables contain HQ-level variants whose public fleet IDs
        // are identical. The observed encounter stream cannot distinguish the
        // hidden variant, so preserve the stronger published value explicitly.
        assignment = experienceAssignment(Math.max(...kcwikiValues), "inferred", "experience-kcwiki.json", "indistinguishable-published-variant:max");
      }
      assignments.push({ point, encounter, shipIds, wikiNames, genericNames, assignment });
    }
  }

  // Reuse an exact value for an identical fleet elsewhere on the same map only
  // when every published match agrees. This handles repeated submarine and air
  // nodes without treating the whole node as a constant.
  const byMapAndFleet = new Map();
  for (const item of assignments) {
    const key = `${item.point.mapId}:${item.shipIds.join(",")}`;
    const group = byMapAndFleet.get(key) ?? [];
    group.push(item);
    byMapAndFleet.set(key, group);
  }
  for (const group of byMapAndFleet.values()) {
    const values = uniquePositiveValues(group.map((item) => item.assignment?.baseExp));
    if (values.length !== 1) continue;
    for (const item of group) {
      item.assignment ??= experienceAssignment(values[0], "exact", group.find((candidate) => candidate.assignment).assignment.evidence.source, "same-map-identical-enemy-id-sequence");
    }
  }

  for (const item of assignments) {
    if (!item.assignment) {
      item.assignment = inferredPointExperience(item, kcwikiRowsByMap, wikiwikiRowsByMap, enemyById);
    }
    if (!item.assignment || !positiveInteger(item.assignment.baseExp)) {
      throw new Error(`Missing base EXP for ${item.point.mapId}-${item.point.point} ${item.encounter.key}`);
    }
    item.encounter.baseExp = item.assignment.baseExp;
    item.encounter.expEvidence = item.assignment.evidence;
  }
}

function inferredPointExperience(item, kcwikiRowsByMap, wikiwikiRowsByMap, enemyById) {
  const kcwikiRows = (kcwikiRowsByMap.get(item.point.mapId) ?? [])
    .filter((row) => row.point === item.point.point && positiveInteger(row.baseExp));
  const wikiwikiRows = (wikiwikiRowsByMap.get(item.point.mapId) ?? [])
    .filter((row) => row.point === item.point.point);
  const publishedWikiwiki = wikiwikiRows.filter((row) => positiveInteger(row.baseExp));

  const allPublishedRowsHaveOneValue = wikiwikiRows.length > 0
    && wikiwikiRows.every((row) => positiveInteger(row.baseExp))
    && uniquePositiveValues(wikiwikiRows.map((row) => row.baseExp)).length === 1;
  if (allPublishedRowsHaveOneValue) {
    return experienceAssignment(wikiwikiRows[0].baseExp, "exact", `experience-wikiwiki-${item.point.mapId}.html`, "published-node-uniform");
  }

  if (kcwikiRows.length > 0) {
    const targetScore = fleetExperienceScore(item.shipIds, enemyById);
    const ranked = kcwikiRows.map((row) => ({
      row,
      distance: sequenceDistance(item.shipIds, row.shipIds),
      scoreDistance: Math.abs(targetScore - fleetExperienceScore(row.shipIds, enemyById))
    })).sort((left, right) => left.distance - right.distance || left.scoreDistance - right.scoreDistance || right.row.baseExp - left.row.baseExp);
    return experienceAssignment(ranked[0].row.baseExp, "inferred", "experience-kcwiki.json", `nearest-published-enemy-id-sequence:${ranked[0].distance}`);
  }

  if (publishedWikiwiki.length > 0) {
    const ranked = publishedWikiwiki.map((row) => ({
      row,
      distance: sequenceDistance(item.wikiNames, row.enemyNames)
    })).sort((left, right) => left.distance - right.distance || right.row.baseExp - left.row.baseExp);
    return experienceAssignment(ranked[0].row.baseExp, "inferred", `experience-wikiwiki-${item.point.mapId}.html`, `nearest-published-enemy-name-sequence:${ranked[0].distance}`);
  }

  const unpublished = UNPUBLISHED_POINT_EXP.get(`${item.point.mapId}:${item.point.point}`);
  return positiveInteger(unpublished)
    ? experienceAssignment(unpublished, "inferred", `experience-wikiwiki-${item.point.mapId}.html`, "public-table-pending-measurement")
    : null;
}

function experienceAssignment(baseExp, level, source, match) {
  return {
    baseExp,
    evidence: { level, source, match, sampleSize: 0 }
  };
}

function normalizeWikiEnemyName(value) {
  return String(value ?? "")
    .normalize("NFKC")
    .replace(/\((?:艦載機|航空機)[^)]*\)/g, "")
    .replace(/\s+/g, "")
    .trim();
}

function genericWikiEnemyName(value) {
  return normalizeWikiEnemyName(value).replace(/\([^)]*\)/g, "");
}

function wikiEnemyAlias(id, fallback) {
  const aliases = {
    1637: "PT小鬼群(A)", 1638: "PT小鬼群(B)", 1639: "PT小鬼群(C)", 1640: "PT小鬼群(D)",
    1650: "飛行場姫(陸爆弱)", 1651: "飛行場姫(陸爆中)",
    1889: "飛行場姫(偵察)(A)", 2094: "飛行場姫(空襲)(F)",
    2047: "飛行場姫(鳥黒弱)", 2048: "飛行場姫(鳥黒強)",
    1665: "砲台小鬼(A)", 1666: "砲台小鬼(B)",
    1736: "潜水新棲姫(A)", 1737: "潜水新棲姫(B)", 2049: "潜水新棲姫(E)",
    1777: "軽母ヌ級elite", 1778: "軽母ヌ級改elite",
    2059: "ヒ船団棲姫(A)", 2060: "ヒ船団棲姫(B)",
    2061: "ヒ船団棲姫-壊(A)", 2062: "ヒ船団棲姫-壊(B)",
    1898: "バタビア沖棲姫(A)", 1899: "バタビア沖棲姫(B)",
    1901: "バタビア沖棲姫-壊(A)", 1902: "バタビア沖棲姫-壊(B)",
    1904: "軽巡ヘ級改flagship(A)", 1905: "軽巡ヘ級改flagship(B)",
    1922: "集積地棲姫II(B)", 1925: "集積地棲姫II-壊(B)"
  };
  return normalizeWikiEnemyName(aliases[id] ?? fallback);
}

function fleetExperienceScore(shipIds, enemyById) {
  return shipIds.reduce((sum, id) => {
    const enemy = enemyById.get(id) ?? {};
    return sum
      + numberValue(enemy._hp)
      + numberValue(enemy._armor) * 2
      + numberValue(enemy._firepower)
      + numberValue(enemy._torpedo)
      + numberValue(enemy._aa) / 2;
  }, 0);
}

function sequenceDistance(left, right) {
  const length = Math.max(left.length, right.length);
  let distance = Math.abs(left.length - right.length) * 2;
  for (let index = 0; index < length; index += 1) {
    if (left[index] !== right[index]) distance += 1;
  }
  return distance;
}

function arraysEqual(left, right) {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function uniquePositiveValues(values) {
  return [...new Set(values.filter(positiveInteger))];
}

function positiveInteger(value) {
  return Number.isInteger(value) && value > 0;
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
        enemyWeights: sortedObject(enemyWeights),
        evidence: {
          level: "statistical",
          source: `drop-${point.mapId}-${point.point}-${point.ranks}.json`,
          sampleSize: numberValue(entry.totalCount),
          observedAt: dropData.timeRange ?? []
        }
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
        ...(parsed.enemyCombinedShipIds.length > 0 ? { enemyCombinedShipIds: parsed.enemyCombinedShipIds } : {}),
        formation: parsed.formation,
        weight: rankCounts.reduce((sum, count) => sum + count, 0),
        evidence: {
          level: "statistical",
          source: `drop-${point.mapId}-${point.point}-${point.ranks}.json`,
          sampleSize: rankCounts.reduce((sum, count) => sum + count, 0)
        }
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
      enemyWeights: Object.fromEntries(encounters.map((encounter) => [encounter.key, [1, 1, 1]])),
      evidence: {
        level: "fallback",
        source: `wiki-${point.mapId}.txt`,
        sampleSize: 0,
        observedAt: []
      }
    });
  }
  return {
    mapId: point.mapId,
    point: point.point,
    title: point.title,
    isBoss: point.isBoss,
    combat: true,
    eventId: point.isBoss ? 5 : 4,
    colorNo: point.isBoss ? 5 : 4,
    nodeNos: point.nodeNos,
    encounters,
    dropPool,
    observedAt: dropData.timeRange ?? [],
    evidence: {
      level: numberValue(dropData.totalCount) > 0 ? "statistical" : "fallback",
      source: numberValue(dropData.totalCount) > 0
        ? `drop-${point.mapId}-${point.point}-${point.ranks}.json`
        : `wiki-${point.mapId}.txt`,
      sampleSize: numberValue(dropData.totalCount),
      observedAt: dropData.timeRange ?? []
    }
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
    const parsedShipIds = [...match[2].matchAll(/\{\{深海横幅\|(\d+)/g)].map((item) => Number(item[1]));
    if (parsedShipIds.length === 0) continue;
    const formationLine = block.match(new RegExp(`^\\s*\\|\\s*阵型${suffix}\\s*=(.*)$`, "m"))?.[1] ?? "";
    const formation = formationId(formationLine);
    const { shipIds, enemyCombinedShipIds } = splitEnemyFormation(parsedShipIds, formation, `wiki:${point.mapId}-${point.point}`);
    encounters.push({
      key: `wiki:${point.mapId}-${point.point}-${suffix || "1"}/${formation}`,
      shipIds,
      enemyCombinedShipIds,
      formation,
      weight: 1,
      evidence: {
        level: "fallback",
        source: `wiki-${point.mapId}.txt`,
        sampleSize: 0
      }
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
  const [mainFleetKey, escortFleetKey = ""] = key.split(/\s*(?:\|\||\+護衛\+|\+escort\+)\s*/i, 2);
  const formation = Number(key.match(/\/(\d+)$/)?.[1] ?? 1);
  const parsedMain = [...mainFleetKey.matchAll(/\((\d+)\)/g)].map((match) => Number(match[1]));
  const parsedEscort = [...escortFleetKey.matchAll(/\((\d+)\)/g)].map((match) => Number(match[1]));
  if (parsedMain.length === 0) throw new Error(`Cannot parse enemy fleet: ${key}`);
  if (parsedEscort.length > 0) {
    validateEnemyFleetSides(parsedMain, parsedEscort, key);
    return { shipIds: parsedMain, enemyCombinedShipIds: parsedEscort, formation };
  }
  const split = splitEnemyFormation(parsedMain, formation, key);
  return { ...split, formation };
}

function splitEnemyFormation(shipIds, formation, evidenceKey) {
  if (shipIds.length <= 6) return { shipIds, enemyCombinedShipIds: [] };
  if (!ENEMY_COMBINED_FORMATION_IDS.has(formation)) {
    throw new Error(`Enemy fleet exceeds six ships without a combined formation (${evidenceKey})`);
  }
  const main = shipIds.slice(0, 6);
  const escort = shipIds.slice(6);
  validateEnemyFleetSides(main, escort, evidenceKey);
  return { shipIds: main, enemyCombinedShipIds: escort };
}

function validateEnemyFleetSides(main, escort, evidenceKey) {
  if (main.length < 1 || main.length > 6 || escort.length > 6) {
    throw new Error(`Invalid enemy main/escort split ${main.length}+${escort.length} (${evidenceKey})`);
  }
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
    if (!positiveInteger(map.experience?.normalAdmiralExp) || map.experience?.version !== EXPERIENCE_VERSION) {
      throw new Error(`Map ${map.mapId} has no versioned normal-node HQ experience`);
    }
    if (map.mapId !== 16 && !map.points.some((point) => point.isBoss)) {
      throw new Error(`Map ${map.mapId} has no boss point`);
    }
    for (const [point, exp] of Object.entries(map.experience.bossAdmiralExpByPoint)) {
      if (!positiveInteger(exp) || !map.points.some((candidate) => candidate.point === point && candidate.isBoss)) {
        throw new Error(`Map ${map.mapId} has invalid boss HQ experience for ${point}`);
      }
    }
    for (const point of map.points.filter((candidate) => candidate.isBoss)) {
      if (!positiveInteger(map.experience.bossAdmiralExpByPoint[point.point])) {
        throw new Error(`Map ${map.mapId} boss ${point.point} has no HQ experience`);
      }
    }
    for (const point of map.points) {
      for (const encounter of point.encounters) {
        if (!positiveInteger(encounter.baseExp) || !encounter.expEvidence?.source) {
          throw new Error(`Missing ship EXP evidence for ${map.mapId}-${point.point} ${encounter.key}`);
        }
        validateEnemyFleetSides(encounter.shipIds, encounter.enemyCombinedShipIds ?? [], encounter.key);
        for (const shipId of [...encounter.shipIds, ...(encounter.enemyCombinedShipIds ?? [])]) {
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
  const repositorySource = ["start2.json", "enemy.json", "enemy-equipment.json", "ship.json"].includes(filename);
  const wikiFallback = filename.startsWith("wiki-");
  const experienceSource = filename.startsWith("experience-");
  return session.readText(filename, url, repositorySource
    ? {
        revision: KANCOLLE_DATA_COMMIT,
        evidence: "exact",
        license: {
          spdx: "NOASSERTION",
          url: `https://github.com/kcwiki/kancolle-data/tree/${KANCOLLE_DATA_COMMIT}`,
          note: "Community master-data snapshot; consult the pinned upstream repository for terms"
        }
      }
    : {
        evidence: experienceSource ? "exact" : wikiFallback ? "fallback" : "statistical",
        parameters: sortieSourceParameters(filename),
        license: {
          spdx: "NOASSERTION",
          url: experienceSource
            ? (filename.includes("wikiwiki") ? "https://wikiwiki.jp/kancolle/" : "https://zh.kcwiki.cn/")
            : wikiFallback ? "https://zh.kcwiki.cn/" : "https://db.kcwiki.cn/",
          note: experienceSource
            ? "Community-published enemy formation and experience table"
            : wikiFallback
            ? "Community wiki fallback used only when the statistical endpoint has no samples"
            : "Aggregated community observations; no machine-readable license was published"
        }
      });
}

function sortieSourceParameters(filename) {
  if (filename === "experience-kcwiki.json") return { kind: "ship-experience", maps: NORMAL_MAP_IDS };
  const wikiwikiExperience = filename.match(/^experience-wikiwiki-(\d+)\.html$/);
  if (wikiwikiExperience) return { kind: "ship-experience-fallback", mapId: Number(wikiwikiExperience[1]) };
  const drop = filename.match(/^drop-(\d+)-([A-Z]+)-([SAB]+)\.json$/);
  if (drop) return { kind: "drop", mapId: Number(drop[1]), point: drop[2], ranks: drop[3] };
  const map = filename.match(/^map-(\d+)\.html$/);
  if (map) return { kind: "map-index", mapId: Number(map[1]) };
  const wiki = filename.match(/^wiki-(\d+)\.txt$/);
  if (wiki) return { kind: "wiki-fallback", mapId: Number(wiki[1]) };
  return { kind: "unknown" };
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
