import { writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createFrozenSourceSession, generatedOutputPath } from "./lib/frozen-source.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUTPUT = generatedOutputPath(path.join(ROOT, "src", "master", "improvement-data.generated.json"));
const ARSENAL_URL = "https://fleet.diablohu.com/arsenal/";
const KC3_COMMIT = "27208e9b0f22fa6e3d98bd61c1873e97a85a5faa";
const KC3_AKASHI_URL = `https://raw.githubusercontent.com/KC3Kai/KC3Kai/${KC3_COMMIT}/src/data/akashi.json`;
const DETAIL_MARKER = '<span class="improvement improvement-details">';
const BODY_MARKER = 'class="body body-2 body-all"';
const DAY_COUNT = 7;

const USE_ITEM_NAMES = new Map([
  ["勋章", 57],
  ["勲章", 57],
  ["熟练搭乘员", 70],
  ["熟練搭乗員", 70],
  ["NE式引擎", 71],
  ["ネ式エンジン", 71],
  ["新型航空机设计图", 74],
  ["新型航空機設計図", 74],
  ["新型舰炮兵装资材", 75],
  ["新型炮熕兵装资材", 75],
  ["新型砲熕兵装資材", 75],
  ["新型航空兵装资材", 77],
  ["新型航空兵装資材", 77],
  ["战斗详报", 78],
  ["戦闘詳報", 78],
  ["新型喷进装备开发资材", 92],
  ["新型噴進装備開発資材", 92],
  ["新型兵装资材", 94],
  ["新型兵装資材", 94]
]);

const session = await createFrozenSourceSession("improvement", {
  generator: "scripts/generate-improvement-data.mjs",
  userAgent: "kancolle-local-improvement-generator"
});

async function loadArsenalHtml() {
  return session.readText("arsenal.html", ARSENAL_URL, {
    evidence: "exact",
    parameters: { table: "all improvement recipes", locale: "zh-CN" },
    license: {
      spdx: "NOASSERTION",
      url: ARSENAL_URL,
      note: "Public community mechanics table; no machine-readable license was published"
    }
  });
}

async function loadKc3Akashi() {
  return session.readJson("kc3-akashi.json", KC3_AKASHI_URL, {
    revision: KC3_COMMIT,
    evidence: "exact",
    license: {
      spdx: "MIT",
      url: `https://github.com/KC3Kai/KC3Kai/blob/${KC3_COMMIT}/LICENSE`,
      note: "KC3Kai repository license"
    }
  });
}

function parseRecipes(html) {
  const bodyStart = html.indexOf(BODY_MARKER);
  if (bodyStart < 0) throw new Error("Unable to find WhoCallsTheFleet detail table");

  return html
    .slice(bodyStart)
    .split(DETAIL_MARKER)
    .slice(1)
    .map((segment, index) => parseRecipeSegment(segment, index + 1))
    .filter((recipe) => recipe != null);
}

function parseRecipeSegment(segment, id) {
  const strongStart = segment.indexOf("<strong>");
  const strongEnd = segment.indexOf("</strong>", strongStart);
  if (strongStart < 0 || strongEnd < 0) return null;

  const costArea = segment.slice(0, strongStart);
  const strong = segment.slice(strongStart, strongEnd + "</strong>".length);
  const equipmentIds = [...strong.matchAll(/href="\/equipments\/(\d+)\//g)].map((match) => Number(match[1]));
  if (!equipmentIds[0]) return null;

  const sourceMasterId = equipmentIds[0];
  const resultMasterId = equipmentIds[1] ?? null;
  const resultInitialLevel = parseResultInitialLevel(strong, resultMasterId);
  const blocks = parseStageBlocks(costArea);

  const recipe = {
    id,
    sourceMasterId,
    resultMasterId,
    resultInitialLevel,
    resources: parseResources(blocks["必要资源"] ?? ""),
    stages: {
      low: parseCostStage(blocks["★+0 ~ +6"] ?? ""),
      high: parseCostStage(blocks["★+6 ~ MAX"] ?? ""),
      convert: parseConvertStage(blocks["升级"] ?? "")
    },
    secretaries: parseSecretaries(segment, strongEnd),
    evidence: {
      level: "exact",
      source: "arsenal.html",
      sourceRow: id,
      crossCheckRevision: KC3_COMMIT
    }
  };

  if (recipe.secretaries.length === 0) {
    throw new Error(`Recipe ${id} for equipment ${sourceMasterId} has no weekday data`);
  }
  return recipe;
}

function parseResultInitialLevel(strong, resultMasterId) {
  if (resultMasterId == null) return 0;
  const anchors = [...strong.matchAll(/href="\/equipments\/(\d+)\/[\s\S]*?<\/a>/g)];
  if (anchors.length < 2) return 0;
  const afterSecondAnchor = strong.slice((anchors[1].index ?? 0) + anchors[1][0].length);
  const match = afterSecondAnchor.match(/^<i>\+(\d+)<\/i>/);
  return match ? Number(match[1]) : 0;
}

function parseStageBlocks(costArea) {
  const markers = [...costArea.matchAll(/<span><em>(.*?)<\/em>/g)].map((match) => ({
    label: match[1],
    start: match.index ?? 0,
    contentStart: (match.index ?? 0) + match[0].length
  }));
  const blocks = {};
  for (let index = 0; index < markers.length; index += 1) {
    const end = markers[index + 1]?.start ?? costArea.length;
    blocks[markers[index].label] = costArea.slice(markers[index].contentStart, end);
  }
  return blocks;
}

function parseResources(block) {
  return {
    fuel: numberForClass(block, "fuel"),
    ammo: numberForClass(block, "ammo"),
    steel: numberForClass(block, "steel"),
    bauxite: numberForClass(block, "bauxite")
  };
}

function parseCostStage(block) {
  return {
    devmat: pairForClass(block, "dev_mat"),
    screw: pairForClass(block, "imp_mat"),
    slotItems: parseSlotItemCosts(block),
    useItems: parseUseItemCosts(block)
  };
}

function parseConvertStage(block) {
  if (!block || block.includes('class="no"')) return null;
  return parseCostStage(block);
}

function numberForClass(block, className) {
  const match = block.match(new RegExp(`<i class="${className}">(\\d+)<\\/i>`));
  return match ? Number(match[1]) : 0;
}

function pairForClass(block, className) {
  const match = block.match(new RegExp(`<i class="${className}">(\\d+)(?:<i>\\((\\d+)\\)<\\/i>)?<\\/i>`));
  if (!match) return [0, 0];
  return [Number(match[1]), Number(match[2] ?? match[1])];
}

function parseSlotItemCosts(block) {
  const costs = [];
  for (const match of block.matchAll(/href="\/equipments\/(\d+)\/"[^>]*>[\s\S]*?<i>x(\d+)<\/i>/g)) {
    costs.push({ masterId: Number(match[1]), count: Number(match[2]) });
  }
  return mergeCosts(costs, "masterId");
}

function parseUseItemCosts(block) {
  const costs = [];
  for (const match of block.matchAll(/<i class="consumable">([\s\S]*?)<i>x(\d+)<\/i><\/i>/g)) {
    const name = stripTags(match[1]);
    const id = USE_ITEM_NAMES.get(name);
    if (!id) throw new Error(`Unknown improvement use item name: ${name}`);
    costs.push({ id, count: Number(match[2]) });
  }
  return mergeCosts(costs, "id");
}

function mergeCosts(costs, key) {
  const merged = new Map();
  for (const cost of costs) {
    const id = cost[key];
    merged.set(id, { ...cost, count: (merged.get(id)?.count ?? 0) + cost.count });
  }
  return [...merged.values()].sort((a, b) => a[key] - b[key]);
}

function parseSecretaries(segment, strongEnd) {
  const fontStart = segment.indexOf("<font>", strongEnd);
  const fontEnd = segment.indexOf("</font>", fontStart);
  if (fontStart < 0 || fontEnd < 0) return [];
  const font = segment.slice(fontStart + "<font>".length, fontEnd);
  const groups = [];

  for (const match of font.matchAll(/<b>([\s\S]*?)<\/b>/g)) {
    const content = match[1];
    const dayMatches = [...content.matchAll(/<i([^>]*)>/g)].slice(0, DAY_COUNT);
    const days = dayMatches
      .map((day, index) => (/class="on"/.test(day[1]) ? index : null))
      .filter((day) => day != null);
    if (days.length === 0) continue;

    groups.push({
      days,
      shipMasterIds: [...content.matchAll(/href="\/ships\/(\d+)\//g)].map((ship) => Number(ship[1]))
    });
  }

  return groups;
}

function stripTags(value) {
  return value.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").trim();
}

function crossCheckWithKc3(recipes, kc3Akashi) {
  if (!kc3Akashi || typeof kc3Akashi !== "object") return { checked: false };
  const parsedSources = new Set(recipes.map((recipe) => String(recipe.sourceMasterId)));
  const kc3Sources = new Set();
  for (const day of Object.values(kc3Akashi)) {
    if (!day || typeof day !== "object") continue;
    for (const equipmentId of Object.keys(day)) kc3Sources.add(equipmentId);
  }

  const missingFromParsed = [...kc3Sources].filter((id) => !parsedSources.has(id));
  const extraInParsed = [...parsedSources].filter((id) => !kc3Sources.has(id));
  if (missingFromParsed.length > 0) {
    console.warn(`KC3Kai cross-check: ${missingFromParsed.length} source equipment ids were not parsed from WCTF`);
  }
  return {
    checked: true,
    kc3SourceCount: kc3Sources.size,
    parsedSourceCount: parsedSources.size,
    missingFromParsed: missingFromParsed.map(Number).sort((a, b) => a - b),
    extraInParsed: extraInParsed.map(Number).sort((a, b) => a - b)
  };
}

function validateRecipes(recipes) {
  if (recipes.length < 300) {
    throw new Error(`Parsed too few improvement recipes: ${recipes.length}`);
  }

  const twinGun = recipes.find((recipe) => recipe.sourceMasterId === 2 && recipe.resultMasterId === 63);
  if (!twinGun) throw new Error("Missing 12.7cm twin gun improvement recipe");
  if (twinGun.resources.ammo !== 30 || twinGun.stages.convert?.screw[1] !== 6) {
    throw new Error("Unexpected 12.7cm twin gun improvement costs");
  }
}

async function main() {
  console.log("Fetching equipment improvement data...");
  const [html, kc3Akashi] = await Promise.all([loadArsenalHtml(), loadKc3Akashi()]);
  const recipes = parseRecipes(html);
  validateRecipes(recipes);

  const result = {
    generatedAt: session.generatedAt,
    sources: {
      arsenal: ARSENAL_URL,
      kc3Akashi: KC3_AKASHI_URL
    },
    crossCheck: crossCheckWithKc3(recipes, kc3Akashi),
    recipes
  };

  await writeFile(OUTPUT, `${JSON.stringify(result)}\n`);
  await session.finalize({ repositoryRevisions: { kc3Kai: KC3_COMMIT } });
  console.log(`Generated ${OUTPUT}`);
  console.log(`  recipes: ${recipes.length}`);
}

export { parseRecipes };

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main();
}
