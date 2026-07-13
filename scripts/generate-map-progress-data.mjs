import { writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createFrozenSourceSession, generatedOutputPath } from "./lib/frozen-source.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUTPUT_PATH = generatedOutputPath(path.join(ROOT, "src", "master", "map-progress-data.generated.json"));
const KANCOLLE_DATA_COMMIT = "a8018819ad330b73c714fbba195794453c8dfde3";
const START2_URL = `https://raw.githubusercontent.com/kcwiki/kancolle-data/${KANCOLLE_DATA_COMMIT}/api/api_start2.json`;
const AREA_TITLES = {
  1: "镇守府海域",
  2: "南西群岛海域",
  3: "北方海域",
  4: "西方海域",
  5: "南方海域",
  6: "中部海域",
  7: "南西海域"
};
const JAPANESE_AREA_TITLES = {
  5: "南方海域",
  7: "南西海域"
};
const SOURCE_MAP_IDS = [15, 16, 25, 35, 45, 55, 56, 65, 72, 73, 75];
const session = await createFrozenSourceSession("map-progress", {
  generator: "scripts/generate-map-progress-data.mjs",
  userAgent: "kancolle-local-map-progress-generator"
});

const start2Response = await session.readJson("start2.json", START2_URL, {
  revision: KANCOLLE_DATA_COMMIT,
  evidence: "exact",
  license: {
    spdx: "NOASSERTION",
    url: `https://github.com/kcwiki/kancolle-data/tree/${KANCOLLE_DATA_COMMIT}`,
    note: "Pinned community capture of the game master response"
  }
});
const pages = new Map();
for (const mapId of SOURCE_MAP_IDS) {
  const areaId = Math.floor(mapId / 10);
  const mapNo = mapId % 10;
  const title = `${AREA_TITLES[areaId]}/${areaId}-${mapNo}`;
  const url = `https://zh.kcwiki.cn/wiki/${encodeURIComponent(title)}`;
  const body = await session.readText(`wiki-${mapId}.html`, url, {
    evidence: "exact",
    parameters: { title, locale: "ja-JP" },
    license: {
      spdx: "CC-BY-NC-SA-3.0",
      url: "https://zh.kcwiki.cn/wiki/%E8%88%B0%E5%A8%98%E7%99%BE%E7%A7%91:%E7%89%88%E6%9D%83",
      note: "Frozen public rules page"
    }
  });
  if (!body.includes(`${areaId}-${mapNo}`)) throw new Error(`Map progress source ${mapId} does not identify its map`);
  pages.set(mapId, { url, body });
}
const specialPages = new Map();
for (const mapId of [56, 72, 73, 75]) {
  await delay(2_500);
  const areaId = Math.floor(mapId / 10);
  const mapNo = mapId % 10;
  const title = `${JAPANESE_AREA_TITLES[areaId]}/${areaId}-${mapNo}`;
  const url = `https://wikiwiki.jp/kancolle/${encodeURIComponent(title)}`;
  const body = await session.readText(`wikiwiki-${mapId}.html`, url, {
    evidence: "exact",
    parameters: { title, locale: "ja-JP" },
    license: {
      spdx: "NOASSERTION",
      url: "https://wikiwiki.jp/ppolicy",
      note: "Frozen public mechanics table; upstream terms retained for manual review"
    }
  });
  specialPages.set(mapId, { url, body });
}

assertPublishedTokens(56, ["TP~280", "2回撃沈", "3回撃沈", "工廠資源"]);
assertPublishedTokens(72, ["3回撃沈", "4回撃沈", "毎月1日"]);
assertPublishedTokens(73, ["3回撃沈", "4回撃沈", "毎月1日"]);
assertPublishedTokens(75, ["2回撃沈", "MマスS勝利1回", "3回撃沈", "特別戦果＋170"]);

const start2 = start2Response.api_data ?? start2Response;
const map56 = start2.api_mst_mapinfo?.find((map) => Number(map.api_id) === 56);
const map56Bgm = start2.api_mst_mapbgm?.find((map) => Number(map.api_id) === 56);
if (!map56 || !map56Bgm || Number(map56.api_required_defeat_count) !== 280) {
  throw new Error("Pinned start2 does not contain the expected 5-6 master contract");
}

const sourceFor = (mapId, detail) => ({
  level: "exact",
  source: pages.get(mapId).url,
  checkedAt: session.generatedAt,
  detail
});
const specialSourceFor = (mapId, detail) => ({
  level: "exact",
  source: specialPages.get(mapId).url,
  checkedAt: session.generatedAt,
  detail
});
const reward = {
  useitem: (id, count) => ({ kind: "useitem", id, count }),
  material: (material, count) => ({ kind: "material", material, count }),
  ranking: (count) => ({ kind: "ranking", count })
};

const maps = [
  monthlyMap(15, [reward.useitem(57, 1), reward.ranking(75)]),
  monthlyMap(16, [reward.useitem(12, 1), reward.ranking(75)]),
  monthlyMap(25, [reward.useitem(57, 1), reward.ranking(100)]),
  monthlyMap(35, [reward.useitem(57, 1), reward.ranking(150)]),
  monthlyMap(45, [reward.useitem(57, 1), reward.ranking(180)]),
  monthlyMap(55, [reward.useitem(57, 1), reward.ranking(200)]),
  {
    id: 56,
    rulesVersion: "2026-05-29",
    reset: "monthly",
    unlock: { clearedOnceMapIds: [55] },
    rewards: [reward.useitem(104, 1), reward.material("devmat", 4), reward.ranking(225)],
    master: map56,
    bgm: map56Bgm,
    phases: [
      { id: "transport", gaugeNo: 1, gaugeType: "transport", point: "G", landingPoint: "E", required: 280, condition: "transport", minimumRank: "A" },
      { id: "rabaul-arrival", gaugeNo: 0, gaugeType: "none", point: "R", required: 1, condition: "arrival" },
      { id: "second-boss", gaugeNo: 2, gaugeType: "hp", point: "N", required: 2, condition: "sink" },
      { id: "final-boss", gaugeNo: 3, gaugeType: "hp", point: "Z", required: 3, condition: "sink" }
    ],
    evidence: specialSourceFor(56, "TP 280, R arrival unlock, N x2, Z x3, monthly rewards and 5-5 prerequisite")
  },
  monthlyMap(65, [reward.useitem(57, 1), reward.ranking(250)]),
  {
    id: 72,
    rulesVersion: "2018-11-16",
    reset: "monthly",
    unlock: { clearedOnceMapIds: [71] },
    rewards: [],
    phases: [
      { id: "first-boss", gaugeNo: 1, gaugeType: "hp", point: "G", required: 3, condition: "sink" },
      { id: "second-boss", gaugeNo: 2, gaugeType: "hp", point: "M", required: 4, condition: "sink" }
    ],
    evidence: specialSourceFor(72, "G x3, M x4 and monthly reset")
  },
  {
    id: 73,
    rulesVersion: "2020-09-17",
    reset: "monthly",
    unlock: { clearedOnceMapIds: [72] },
    rewards: [],
    phases: [
      { id: "first-boss", gaugeNo: 1, gaugeType: "hp", point: "E", required: 3, condition: "sink" },
      { id: "second-boss", gaugeNo: 2, gaugeType: "hp", point: "P", required: 4, condition: "sink" }
    ],
    evidence: specialSourceFor(73, "E x3, P x4 and monthly reset")
  },
  {
    id: 75,
    rulesVersion: "2023-01-20",
    reset: "monthly",
    unlock: { clearedOnceMapIds: [74] },
    rewards: [reward.useitem(57, 1), reward.ranking(170)],
    phases: [
      { id: "first-boss", gaugeNo: 1, gaugeType: "hp", point: "K", required: 2, condition: "sink" },
      { id: "route-unlock", gaugeNo: 0, gaugeType: "none", point: "M", required: 1, condition: "victory", minimumRank: "S" },
      { id: "second-boss", gaugeNo: 2, gaugeType: "hp", point: "Q", required: 3, condition: "sink" },
      { id: "third-boss", gaugeNo: 3, gaugeType: "hp", point: "T", required: 3, condition: "sink" }
    ],
    evidence: specialSourceFor(75, "three gauges, route-unlock S victory, monthly medal and ranking reward")
  }
];

await writeFile(OUTPUT_PATH, `${JSON.stringify({
  schemaVersion: 1,
  generatedAt: session.generatedAt,
  profile: {
    id: "normal-map-progress-2026-07-12",
    rulesDate: "2026-07-12",
    sources: Object.fromEntries([...pages].map(([mapId, page]) => [String(mapId), page.url])),
    maps
  }
})}\n`);
await session.finalize({ repositoryRevision: KANCOLLE_DATA_COMMIT });
console.log(`Generated ${path.relative(ROOT, OUTPUT_PATH)} (${maps.length} versioned map contracts)`);

function monthlyMap(id, rewards) {
  return {
    id,
    rulesVersion: "phase2-current",
    reset: "monthly",
    unlock: { clearedOnceMapIds: [] },
    rewards,
    phases: null,
    evidence: sourceFor(id, "monthly reset and clear rewards")
  };
}

function assertPublishedTokens(mapId, tokens) {
  const body = specialPages.get(mapId)?.body ?? "";
  const missing = tokens.filter((token) => !body.includes(token));
  if (missing.length > 0) throw new Error(`Map ${mapId} source is missing ${missing.join(", ")}`);
}

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
