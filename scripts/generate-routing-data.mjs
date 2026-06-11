import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CACHE_DIR = path.join(ROOT, ".local", "routing-data-cache");
const OUTPUT_PATH = path.join(ROOT, "src", "master", "routing-data.generated.json");
const EDGE_URL = "https://raw.githubusercontent.com/kcwiki/kancolle-data/master/map/edge.json";
const SHIP_URL = "https://raw.githubusercontent.com/kcwiki/kancolle-data/master/wiki/ship.json";
const KC3_NODES_URL = "https://raw.githubusercontent.com/KC3Kai/KC3Kai/master/src/data/nodes.json";
const WIKI_API = "https://zh.kcwiki.cn/api.php";
const REFRESH_CACHE = process.argv.includes("--refresh");
const NORMAL_MAP_IDS = [
  11, 12, 13, 14, 15, 16,
  21, 22, 23, 24, 25,
  31, 32, 33, 34, 35,
  41, 42, 43, 44, 45,
  51, 52, 53, 54, 55,
  61, 62, 63, 64, 65,
  71, 72, 73, 74, 75
];
const AREA_TITLES = {
  1: "镇守府海域",
  2: "南西群岛海域",
  3: "北方海域",
  4: "西方海域",
  5: "南方海域",
  6: "中部海域",
  7: "南西海域"
};
const EXPLICIT_ACTIVE_BRANCHES = new Map([
  [45, ["A", "C", "I"]],
  [53, ["O"]],
  [55, ["F"]],
  [63, ["A"]],
  [74, ["F"]],
  [75, ["F", "H", "O", "P"]]
]);
const SHIP_TYPE_TOKENS = new Set([
  "DE", "DD", "CL", "CLT", "CA", "CAV", "CVL", "FBB", "BB", "BBV", "CV", "SS", "SSV",
  "AO", "AV", "LHA", "CVB", "AR", "AS", "CT", "BB系", "CV系", "CA系", "CL系", "SS系"
]);
const SHIP_CLASS_ALIASES = {
  大鹰级: [76]
};

await main();

async function main() {
  await mkdir(CACHE_DIR, { recursive: true });
  const [topology, shipData, kc3Nodes] = await Promise.all([
    fetchJsonCached("edge.json", EDGE_URL),
    fetchJsonCached("ship.json", SHIP_URL),
    fetchJsonCached("kc3-nodes.json", KC3_NODES_URL)
  ]);
  const resolveShipFamily = buildShipFamilyResolver(shipData);
  const maps = [];

  for (const mapId of NORMAL_MAP_IDS) {
    process.stdout.write(`\rGenerating routing data ${mapId}...`);
    const areaId = Math.floor(mapId / 10);
    const mapNo = mapId % 10;
    const page = `${AREA_TITLES[areaId]}/${areaId}-${mapNo}/带路条件`;
    const params = new URLSearchParams({
      action: "parse",
      page,
      prop: "wikitext|revid",
      format: "json",
      formatversion: "2"
    });
    const response = await fetchJsonCached(`wiki-${mapId}.json`, `${WIKI_API}?${params}`);
    if (!response.parse?.wikitext) throw new Error(`Missing routing wiki page for ${mapId}`);

    const edges = Object.entries(topology[String(mapId)] ?? topology[mapId] ?? {})
      .map(([no, pair]) => ({ no: Number(no), from: normalizePoint(pair[0]), to: normalizePoint(pair[1]) }))
      .sort((left, right) => left.no - right.no);
    if (edges.length === 0) throw new Error(`Missing topology for map ${mapId}`);

    const rows = parseWikiRows(response.parse.wikitext);
    const rowByPoint = new Map(rows.map((row) => [normalizePoint(row.from), row]));
    const outgoingByPoint = groupBy(edges, (edge) => edge.from);
    const branches = {};

    for (const [from, outgoing] of outgoingByPoint) {
      if (outgoing.length === 1) {
        branches[from] = [{ to: outgoing[0].to, source: "single outgoing edge" }];
        continue;
      }

      const row = rowByPoint.get(from);
      const active = EXPLICIT_ACTIVE_BRANCHES.get(mapId)?.includes(from) || !row;
      if (active) {
        branches[from] = addCountExpressions(
          applyKnownRuleCorrections(
            mapId,
            from,
            [{ select: outgoing.map((edge) => edge.to), source: "active branching" }]
          ),
          resolveShipFamily
        );
        continue;
      }

      const rules = mapId === 11 && from === "A"
        ? oneOneRules()
        : compileRules(mapId, from, outgoing.map((edge) => edge.to), row.items, resolveShipFamily);
      branches[from] = addCountExpressions(
        applyKnownRuleCorrections(mapId, from, rules),
        resolveShipFamily
      );
    }

    const map = {
      mapId,
      revision: Number(response.parse.revid ?? 0),
      source: `${WIKI_API}?${params}`,
      edges,
      nodes: buildNodeMetadata(mapId, edges, kc3Nodes),
      branches
    };
    validateMap(map);
    maps.push(map);
  }

  process.stdout.write("\n");
  await writeFile(OUTPUT_PATH, `${JSON.stringify({
    generatedAt: new Date().toISOString(),
    sources: { topology: EDGE_URL, ships: SHIP_URL, nodeMarkers: KC3_NODES_URL, routingWiki: WIKI_API },
    maps
  })}\n`);
  console.log(`Generated ${path.relative(ROOT, OUTPUT_PATH)} (${maps.length} maps)`);
}

function buildNodeMetadata(mapId, edges, kc3Nodes) {
  const areaId = Math.floor(mapId / 10);
  const mapNo = mapId % 10;
  const nodeData = kc3Nodes[`World ${areaId}-${mapNo}`] ?? {};
  const letters = nodeData.letters ?? {};
  const markersByPoint = new Map();
  for (const marker of nodeData.markers ?? []) {
    if (!String(marker.img).startsWith("client/")) continue;
    const point = nearestPoint(marker.pos, letters);
    if (point) markersByPoint.set(point, String(marker.img));
  }

  const points = [...new Set(edges.map((edge) => edge.to))];
  return Object.fromEntries(points.map((point) => {
    const marker = markersByPoint.get(point);
    if (/maelstrom/.test(marker ?? "")) {
      return [point, { combat: false, eventId: 3, eventKind: 0, colorNo: 3 }];
    }
    if (/route_select/.test(marker ?? "")) {
      return [point, { combat: false, eventId: 6, eventKind: 2, colorNo: 4 }];
    }
    if (/(?:fuel|ammo|steel|bauxite|ibuild|bucket|devmat|box\d*)\.png$/.test(marker ?? "")) {
      return [point, { combat: false, eventId: 2, eventKind: 0, colorNo: 8 }];
    }
    if (mapId === 16 && point === "N") {
      return [point, { combat: false, eventId: 9, eventKind: 0, colorNo: 8 }];
    }
    return [point, { combat: false, eventId: 6, eventKind: 0, colorNo: 4 }];
  }));
}

function nearestPoint(position, letters) {
  if (!Array.isArray(position)) return "";
  let nearest = null;
  for (const [point, coordinates] of Object.entries(letters)) {
    if (!Array.isArray(coordinates)) continue;
    const distance = Math.hypot(Number(position[0]) - Number(coordinates[0]), Number(position[1]) - Number(coordinates[1]));
    if (!nearest || distance < nearest.distance) nearest = { point, distance };
  }
  return nearest && nearest.distance <= 130 ? nearest.point : "";
}

function parseWikiRows(raw) {
  const rows = [...parseHtmlRows(raw), ...parseTemplateRows(raw)];
  return [...new Map(rows.map((row) => [normalizePoint(row.from), row])).values()];
}

function parseHtmlRows(raw) {
  const rows = [];
  const expression = /<tr>\s*<td><b>(?:<span[^>]*>)?([^<]+)(?:<\/span>)?<\/b><\/td>\s*<td><ul>([\s\S]*?)<\/ul><\/td>\s*<\/tr>/g;
  for (const match of raw.matchAll(expression)) {
    const items = parseHtmlListItems(match[2]);
    rows.push({ from: cleanWikiText(match[1]), items });
  }
  return rows;
}

function parseHtmlListItems(raw) {
  const items = [];
  const tokenExpression = /<\/?ul>|<li>|<br\s*\/?>/gi;
  let depth = 1;
  let itemDepth = depth;
  let offset = 0;
  let text = "";

  const flush = () => {
    const cleaned = cleanWikiText(text);
    if (cleaned) items.push({ depth: itemDepth, text: cleaned, format: "html" });
    text = "";
  };

  for (const token of raw.matchAll(tokenExpression)) {
    text += raw.slice(offset, token.index);
    const value = token[0].toLowerCase();
    if (value === "<li>") {
      flush();
      itemDepth = depth;
    } else if (value.startsWith("<br")) {
      flush();
      itemDepth = depth + 1;
    } else if (value === "<ul>") {
      flush();
      depth += 1;
      itemDepth = depth;
    } else {
      flush();
      depth = Math.max(1, depth - 1);
      itemDepth = depth;
    }
    offset = token.index + token[0].length;
  }
  text += raw.slice(offset);
  flush();
  return items;
}

function parseTemplateRows(raw) {
  if (!raw.includes("{{{!}}")) return [];
  const rows = [];
  for (const segment of raw.split(/\{\{!\}\}-/).slice(1)) {
    const cellValues = [...segment.matchAll(/^\{\{!\}\}\s*(?!\*)\s*([^\n]*)$/gm)]
      .map((match) => cleanWikiText(match[1]))
      .filter(Boolean);
    const from = cellValues.find((value) => /^(?:出发点|出击点|Start|[A-Z])$/.test(value));
    if (!from) continue;
    const items = segment.split("\n").flatMap((line) => {
      const match = line.match(/^(\*+)\s*(.+)$/);
      return match ? [{ depth: match[1].length, text: cleanWikiText(match[2]), format: "template" }] : [];
    });
    rows.push({ from, items });
  }
  return rows;
}

function compileRules(mapId, from, outgoing, items, resolveShipFamily) {
  const rules = [];
  const parentByDepth = new Map();

  for (const item of items) {
    const parsed = parseDestination(mapId, from, outgoing, item.text);
    if (!parsed) {
      parentByDepth.set(item.depth, item.text);
      clearDeeper(parentByDepth, item.depth);
      continue;
    }

    const parents = [...parentByDepth.entries()]
      .filter(([depth]) => depth < item.depth)
      .sort(([left], [right]) => left - right)
      .map(([, text]) => text);
    const localCondition = destinationCondition(item.text);
    const condition = [...parents, localCondition]
      .filter((text) => text && !/^(?:其余|其他|上述判定全部失败|即：?)$/.test(text))
      .join(" 且 ");
    const source = [...parents, item.text].filter(Boolean).join(" / ");
    const shipFamilies = compileShipFamilies(condition, resolveShipFamily);
    rules.push({
      ...(condition ? { when: { wiki: condition, ...(shipFamilies.length > 0 ? { shipFamilies } : {}) } } : {}),
      ...parsed,
      source
    });

    clearDeeper(parentByDepth, item.depth);
  }

  rules.push({
    weights: Object.fromEntries(outgoing.map((to) => [to, 1])),
    source: "No published exact fallback probability; equal deterministic routing"
  });
  return rules;
}

function compileShipFamilies(condition, resolveShipFamily) {
  const result = [];
  for (const rawTerm of condition.split(/\s*且\s*/)) {
    const term = rawTerm.replace(/\s*(?:从右出发|从左出发|从[12]出发).*$/, "").trim();
    const excluded = term.match(/不包含\s*(.+)$/);
    if (excluded) {
      for (const token of splitNamedShips(excluded[1])) {
        const ids = resolveShipFamily(token);
        if (ids.length > 0) result.push({ ids, count: { eq: 0 }, wikiTerm: rawTerm.trim() });
      }
      continue;
    }
    const included = term.match(/包含\s*(.+)$/);
    if (included) {
      for (const token of splitNamedShips(included[1])) {
        const ids = resolveShipFamily(token);
        if (ids.length > 0) result.push({ ids, count: { gte: 1 }, wikiTerm: rawTerm.trim() });
      }
      continue;
    }
    const comparison = term.match(/^([^=<>]+?)\s*(>=|<=|=|>|<)\s*(\d+)/);
    if (!comparison) continue;
    const tokens = comparison[1].split("+").map((token) => token.trim()).filter(Boolean);
    const families = tokens.map((token) => resolveShipFamily(token));
    if (families.length === 0 || families.some((ids) => ids.length === 0)) continue;
    result.push({
      ids: [...new Set(families.flat())].sort((left, right) => left - right),
      count: numericPredicate(comparison[2], Number(comparison[3])),
      wikiTerm: rawTerm.trim()
    });
  }
  return result;
}

function addCountExpressions(rules, resolveShipFamily) {
  return rules.map((rule) => {
    const condition = rule.when?.wiki;
    if (!condition) return rule;
    const countExpressions = compileCountExpressions(condition, resolveShipFamily);
    if (countExpressions.length === 0) return rule;
    return {
      ...rule,
      when: {
        ...rule.when,
        countExpressions
      }
    };
  });
}

function compileCountExpressions(condition, resolveShipFamily) {
  const result = [];
  for (const rawTerm of condition.split(/\s*且\s*/)) {
    const term = rawTerm
      .replace(/\s*(?:从右出发|从左出发|从[12]出发).*$/, "")
      .replace(/\s*[：:]?\s*(?:大概率|小概率|一定概率).*$/, "")
      .trim();
    const comparison = term.match(/^([^<>=\s]+(?:\+[^<>=\s]+)*)\s*(>=|<=|=|>|<)\s*(\d+)$/);
    if (!comparison) continue;

    let hasIdentityTerm = false;
    const terms = [];
    for (const token of comparison[1].split("+")) {
      if (SHIP_TYPE_TOKENS.has(token)) {
        terms.push({ shipType: token });
        continue;
      }
      const classIds = SHIP_CLASS_ALIASES[token];
      if (classIds) {
        hasIdentityTerm = true;
        terms.push({ shipClassIds: classIds });
        continue;
      }
      const ids = resolveShipFamily(token);
      if (ids.length === 0) {
        terms.length = 0;
        break;
      }
      hasIdentityTerm = true;
      terms.push({ shipFamilyIds: ids });
    }
    if (hasIdentityTerm && terms.length > 0) {
      result.push({
        terms,
        count: numericPredicate(comparison[2], Number(comparison[3])),
        wikiTerm: rawTerm.trim()
      });
    }
  }
  return result;
}

function splitNamedShips(text) {
  return text.split(/\s*(?:和|、|，|,|\+)\s*/).map((token) => token.trim()).filter(Boolean);
}

function numericPredicate(operator, value) {
  if (operator === "=") return { eq: value };
  if (operator === ">=") return { gte: value };
  if (operator === "<=") return { lte: value };
  if (operator === ">") return { gte: value + 1 };
  return { lte: value - 1 };
}

function buildShipFamilyResolver(shipData) {
  const ships = Object.values(shipData).map((ship) => ({
    id: Number(ship._api_id || ship._id),
    name: normalizeShipName(ship._japanese_name || ship._name || "")
  })).filter((ship) => ship.id > 0 && ship.name);
  return (rawName) => {
    const name = normalizeShipName(rawName);
    if (!name || /[A-Z]|舰队|船数|分歧点|装备/.test(name)) return [];
    return ships
      .filter((ship) => ship.name === name || ship.name.startsWith(`${name}改`))
      .map((ship) => ship.id)
      .sort((left, right) => left - right);
  };
}

function normalizeShipName(value) {
  const replacements = {
    風: "风",
    鶴: "鹤",
    鳳: "凤",
    張: "张",
    長: "长",
    門: "门",
    陸: "陆",
    黒: "黑"
  };
  return String(value)
    .normalize("NFKC")
    .replace(/[風鶴鳳張長門陸黒]/g, (character) => replacements[character])
    .replace(/\s+/g, "")
    .trim();
}

function parseDestination(mapId, from, outgoing, text) {
  if (mapId === 64 && from === "Start" && /从右出发/.test(text)) return { to: "M" };
  if (mapId === 65 && from === "Start" && /从1出发/.test(text)) return { to: "A" };
  if (mapId === 65 && from === "Start" && /从2出发/.test(text)) return { to: "B" };
  const routeText = text.replace(/去[A-Z]判定失败/g, "前项判定失败");

  const percentages = [...routeText.matchAll(/(\d+(?:\.\d+)?)\s*%\s*去([A-Z])/g)]
    .map((match) => [match[2], Number(match[1])])
    .filter(([to]) => outgoing.includes(to));
  if (percentages.length >= 2) return { weights: Object.fromEntries(percentages) };

  const random = routeText.match(/随机去(.+)/);
  if (random) {
    const destinations = [...new Set([...random[1].matchAll(/[A-Z]/g)].map((match) => match[0]).filter((to) => outgoing.includes(to)))];
    if (destinations.length === 1) return { to: destinations[0], chance: 0.5 };
    if (destinations.length > 1) return { weights: Object.fromEntries(destinations.map((to) => [to, 1])) };
  }

  const destinations = [...routeText.matchAll(/去([A-Z])/g)].map((match) => match[1]).filter((to) => outgoing.includes(to));
  const unique = [...new Set(destinations)];
  if (unique.length >= 2) return { weights: Object.fromEntries(unique.map((to) => [to, 1])) };
  if (unique.length === 1) {
    return percentages.length === 1
      ? { to: unique[0], chance: percentages[0][1] / 100 }
      : { to: unique[0] };
  }
  return null;
}

function destinationCondition(text) {
  return text
    .replace(/[：:]?\s*(?:约)?\d+(?:\.\d+)?\s*%\s*去[A-Z]/g, "")
    .replace(/[：:]?\s*随机去(?:[A-Z](?:[\/、,，]|$))+/g, "")
    .replace(/\s*去[A-Z].*$/g, "")
    .replace(/[：:，,；;]\s*$/, "")
    .trim();
}

function oneOneRules() {
  return [1, 2, 3, 4, 5, 6].map((fleetSize) => ({
    when: { fleetSize: { eq: fleetSize } },
    weights: { B: 15 + fleetSize * 5, C: 85 - fleetSize * 5 },
    source: `舰队船数 ${fleetSize}: 去B ${15 + fleetSize * 5}%, 去C ${85 - fleetSize * 5}%`
  }));
}

function applyKnownRuleCorrections(mapId, from, rules) {
  if (mapId === 75 && from === "F") {
    return [
      { when: { phase: { lte: 2 } }, to: "G", source: "7-5 phases 1-2 use the western route" },
      { to: "J", source: "7-5 phases 3-4 use the eastern route" }
    ];
  }
  if (mapId === 75 && from === "H") {
    return [
      { when: { phase: { eq: 1 } }, to: "K", source: "7-5 phase 1 boss route" },
      { to: "I", source: "7-5 phase 2 route" }
    ];
  }
  if (mapId === 75 && from === "O") {
    return [
      { when: { phase: { eq: 3 } }, to: "Q", source: "7-5 phase 3 boss route" },
      { select: ["P", "Q"], source: "7-5 post-phase-3 active branching" }
    ];
  }

  const losFailureThresholds = {
    "65:G": { coefficient: 3, threshold: 50 },
    "65:J": { coefficient: 3, threshold: 35 },
    "72:E": { coefficient: 4, threshold: 47 }
  };
  const threshold = losFailureThresholds[`${mapId}:${from}`];
  if (threshold) {
    return rules.map((rule) => rule.when?.wiki?.includes("索敌不足")
      ? {
          ...rule,
          when: { ...rule.when, wiki: `分歧点系数=${threshold.coefficient} 且 索敌<${threshold.threshold}` },
          source: `${rule.source} (threshold inferred from the preceding published rule)`
        }
      : rule);
  }

  if (mapId === 74 && from === "G") {
    return [
      {
        when: { wiki: "分歧点系数=4 且 索敌<=40" },
        to: "I",
        source: "English Wiki clarification: Cn4 LoS <= 40 goes to I"
      },
      { to: "L", source: "English Wiki clarification: Cn4 LoS > 40 goes to L" }
    ];
  }

  if (mapId === 74 && from === "M") {
    const specialFleet = rules.find((rule) => rule.source?.startsWith("CT=1"));
    return [
      ...(specialFleet ? [specialFleet] : []),
      {
        when: { wiki: "分歧点系数=4 且 索敌<45" },
        to: "N",
        source: "English Wiki clarification: Cn4 LoS < 45 goes to N"
      },
      {
        when: { wiki: "分歧点系数=4 且 索敌45~47" },
        weights: { N: 1, O: 1 },
        source: "English Wiki clarification: Cn4 LoS 45-47 randomly goes to N/O"
      },
      { when: { wiki: "SS系+BB+CV+CVB>=1" }, to: "O", source: "English Wiki M routing" },
      { when: { wiki: "FBB>=2" }, to: "O", source: "English Wiki M routing" },
      { when: { wiki: "BBV>=2" }, to: "O", source: "English Wiki M routing" },
      { when: { wiki: "CVL+あきつ丸>=2" }, to: "O", source: "English Wiki M routing" },
      { when: { wiki: "DD+DE<=1" }, to: "O", source: "English Wiki M routing" },
      { to: "P", source: "English Wiki M routing fallback" }
    ];
  }

  return rules;
}

function validateMap(map) {
  const edgeKeys = new Set(map.edges.map((edge) => `${edge.from}:${edge.to}`));
  for (const [from, rules] of Object.entries(map.branches)) {
    if (rules.length === 0) throw new Error(`Map ${map.mapId} has no rules at ${from}`);
    for (const rule of rules) {
      const destinations = rule.select ?? Object.keys(rule.weights ?? {}) ?? [];
      if (rule.to) destinations.push(rule.to);
      for (const to of destinations) {
        if (!edgeKeys.has(`${from}:${to}`)) throw new Error(`Map ${map.mapId} rule references missing edge ${from}->${to}`);
      }
    }
  }
}

function cleanWikiText(text) {
  return text
    .replace(/<高速\+>/g, "高速+")
    .replace(/<最速>/g, "最速")
    .replace(/<运输桶>/g, "运输桶")
    .replace(/<大发系>/g, "大发系")
    .replace(/&gt;/g, "__GT__")
    .replace(/&lt;/g, "__LT__")
    .replace(/\[\[([^|\]]+)\|([^\]]+)\]\]/g, "$2")
    .replace(/\[\[([^\]]+)\]\]/g, "$1")
    .replace(/\[([^\s\]]+)\s+([^\]]+)\]/g, "$2")
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ")
    .replace(/__GT__/g, ">")
    .replace(/__LT__/g, "<")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizePoint(value) {
  const point = cleanWikiText(String(value)).replace(/[：:]/g, "");
  return /^(?:出发点|出击点|出發點|スタート|Start)$/i.test(point) ? "Start" : point;
}

function groupBy(items, keyFor) {
  const result = new Map();
  for (const item of items) {
    const key = keyFor(item);
    result.set(key, [...(result.get(key) ?? []), item]);
  }
  return result;
}

function clearDeeper(map, depth) {
  for (const key of map.keys()) {
    if (key > depth) map.delete(key);
  }
}

async function fetchJsonCached(filename, url) {
  const cachePath = path.join(CACHE_DIR, filename);
  if (!REFRESH_CACHE) {
    try {
      return JSON.parse(await readFile(cachePath, "utf8"));
    } catch {
      // Fetch below.
    }
  }
  const response = await fetch(url, { headers: { "user-agent": "kancolle-local-offline-api" } });
  if (!response.ok) throw new Error(`HTTP ${response.status} for ${url}`);
  const body = await response.text();
  await writeFile(cachePath, body);
  return JSON.parse(body);
}
