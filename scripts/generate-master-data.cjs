// Generate complete master data from kcwiki/kancolle-data repository
// Downloads equipment.json and ship.json, maps to our API format, generates TypeScript

const https = require("https");
const fs = require("fs");
const path = require("path");

const EQUIP_URL = "https://raw.githubusercontent.com/kcwiki/kancolle-data/master/wiki/equipment.json";
const SHIP_URL = "https://raw.githubusercontent.com/kcwiki/kancolle-data/master/wiki/ship.json";
const START2_URL = "https://cdn.jsdelivr.net/gh/kcwiki/kancolle-data@master/api/api_start2.json";
const CACHE_DIR = path.join(__dirname, "..", ".local", "wiki-cache");

function getCachePath(url) {
  const filename = url.includes("api_start2") ? "api_start2.json" : url.includes("equipment") ? "equipment.json" : "ship.json";
  return path.join(CACHE_DIR, filename);
}

function readCache(url) {
  const p = getCachePath(url);
  if (fs.existsSync(p)) {
    try { return JSON.parse(fs.readFileSync(p, "utf8")); } catch(e) {}
  }
  return null;
}

function writeCache(url, data) {
  const p = getCachePath(url);
  fs.mkdirSync(CACHE_DIR, { recursive: true });
  fs.writeFileSync(p, JSON.stringify(data));
}

async function fetch(url) {
  // Try cache first
  const cached = readCache(url);
  if (cached) {
    console.log(`  Using cached ${getCachePath(url)}`);
    return cached;
  }
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { "User-Agent": "kancolle-local-dev" } }, (res) => {
      if (res.statusCode !== 200) {
        // Handle redirect
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          fetch(res.headers.location).then(resolve).catch(reject);
          return;
        }
        reject(new Error(`HTTP ${res.statusCode}`));
        return;
      }
      let body = "";
      res.on("data", (chunk) => (body += chunk));
      res.on("end", () => {
        try {
          const data = JSON.parse(body);
          writeCache(url, data);
          resolve(data);
        } catch(e) {
          reject(e);
        }
      });
    }).on("error", reject);
  });
}

function num(val, def = 0) {
  if (val === false || val === null || val === undefined) return def;
  return Number(val);
}

function boolNum(val, def = 0) {
  return val ? 1 : def;
}

// ---- Equipment mapping ----
function mapEquipment(entry) {
  const types = entry._types || [1, 1, entry._type || 1, entry._icon || 1, 0];
  return {
    api_id: entry._id,
    api_sortno: entry._id,
    api_name: entry._japanese_name || entry._name,
    api_yomi: entry._name,
    api_type: [...types],
    api_taik: 0,
    api_souk: num(entry._armor),
    api_houg: num(entry._firepower),
    api_raig: num(entry._torpedo),
    api_soku: num(entry._speed),
    api_baku: num(entry._bombing),
    api_tyku: num(entry._aa),
    api_tais: num(entry._asw),
    api_atap: 0,
    api_houm: num(entry._shelling_accuracy),
    api_raim: num(entry._torpedo_accuracy),
    api_houk: num(entry._evasion),
    api_raik: 0,
    api_bakk: 0,
    api_saku: num(entry._los),
    api_sakb: 0,
    api_luck: num(entry._luck),
    api_leng: num(entry._range, 1),
    api_rare: num(entry._rarity, 1),
    api_broken: [
      num(entry._scrap_fuel),
      num(entry._scrap_ammo),
      num(entry._scrap_steel),
      num(entry._scrap_bauxite),
    ],
    api_info: entry._info || "",
    api_usebull: "0",
    api_version: num(entry._version, 1),
    api_cost: null,
    api_distance: null,
  };
}

// ---- Ship mapping ----
function mapShip(entry) {
  const api_id = entry._api_id || entry._id;
  const remodelTo = entry._remodel_to;
  const equipSlots = (entry._equipment || []).map((e) => (e && e.size ? e.size : 0));
  // Pad to 5 slots
  while (equipSlots.length < 5) equipSlots.push(0);

  // Try to find remodel target ship ID (will be resolved in a second pass)
  return {
    api_id,
    api_sortno: entry._id || api_id,
    api_sort_id: entry._id || api_id,
    api_name: entry._japanese_name || entry._name,
    api_yomi: entry._name,
    api_stype: entry._type || 2,
    api_ctype: 1,
    api_afterlv: num(entry._remodel_level, 0),
    api_aftershipid: 0, // Will be resolved
    api_taik: [entry._hp || 1, entry._hp_max || 1],
    api_souk: [entry._armor || 0, entry._armor_max || 0],
    api_houg: [entry._firepower || 0, entry._firepower_max || 0],
    api_raig: [entry._torpedo || 0, entry._torpedo_max || 0],
    api_tyku: [entry._aa || 0, entry._aa_max || 0],
    api_saku: [num(entry._los), num(entry._los_max, num(entry._los))],
    api_luck: [entry._luck || 0, entry._luck_max || 0],
    api_soku: num(entry._speed, 10),
    api_leng: num(entry._range, 1),
    api_slot_num: equipSlots.filter((s) => s > 0).length || 1,
    api_maxeq: equipSlots,
    api_buildtime: entry._build_time || 0,
    api_broken: [
      num(entry._scrap_fuel),
      num(entry._scrap_ammo),
      num(entry._scrap_steel),
      num(entry._scrap_baux, 0),
    ],
    api_powup: [
      num(entry._firepower_mod),
      num(entry._torpedo_mod),
      num(entry._aa_mod),
      num(entry._armor_mod),
    ],
    api_backs: 1,
    api_getmes: entry._buildtime ? "" : "",
    api_fuel_max: entry._fuel || 0,
    api_bull_max: entry._ammo || 0,
    api_voicef: 1,
    // Extra metadata for resolving remodels
    _remodel_to: remodelTo,
  };
}

// ---- Ship type mapping ----
function buildShipTypes(ships) {
  const typeSet = new Map();
  for (const ship of ships) {
    if (!typeSet.has(ship.api_stype)) {
      // Generate a basic ship type entry
      const typeNames = {
        1: "海防艦", 2: "駆逐艦", 3: "軽巡洋艦", 4: "重雷装巡洋艦",
        5: "重巡洋艦", 6: "航空巡洋艦", 7: "軽空母", 8: "巡洋戦艦",
        9: "戦艦", 10: "航空戦艦", 11: "正規空母", 12: "超弩級戦艦",
        13: "潜水艦", 14: "潜水空母", 15: "補給艦", 16: "水上機母艦",
        17: "揚陸艦", 18: "装甲空母", 19: "工作艦", 20: "潜水母艦",
        21: "練習巡洋艦", 22: "補給艦",
      };
      typeSet.set(ship.api_stype, {
        api_id: ship.api_stype,
        api_sortno: ship.api_stype,
        api_name: typeNames[ship.api_stype] || `Ship Type ${ship.api_stype}`,
        api_scnt: 1,
        api_kcnt: 2,
        api_equip_type: {},
      });
    }
  }
  return [...typeSet.values()].sort((a, b) => a.api_id - b.api_id);
}

function applyStart2SlotOverrides(equipment, start2Data) {
  const start2SlotById = new Map((start2Data.api_mst_slotitem || []).map((slot) => [slot.api_id, slot]));
  return equipment.map((item) => {
    const start2Slot = start2SlotById.get(item.api_id);
    if (!start2Slot) return item;
    return {
      ...item,
      api_type: Array.isArray(start2Slot.api_type) ? [...start2Slot.api_type] : item.api_type,
      api_leng: num(start2Slot.api_leng, item.api_leng),
      api_version: num(start2Slot.api_version, item.api_version),
      api_cost: start2Slot.api_cost ?? item.api_cost,
      api_distance: start2Slot.api_distance ?? item.api_distance,
    };
  });
}

function applyStart2ShipOverrides(ships, start2Data) {
  const start2ShipById = new Map((start2Data.api_mst_ship || []).map((ship) => [ship.api_id, ship]));
  return ships.map((item) => {
    const start2Ship = start2ShipById.get(item.api_id);
    if (!start2Ship) return item;
    return {
      ...item,
      api_sortno: num(start2Ship.api_sortno, item.api_sortno),
      api_sort_id: num(start2Ship.api_sort_id, item.api_sort_id),
      api_stype: num(start2Ship.api_stype, item.api_stype),
      api_ctype: num(start2Ship.api_ctype, item.api_ctype),
      api_afterlv: num(start2Ship.api_afterlv, item.api_afterlv),
      api_aftershipid: num(start2Ship.api_aftershipid, item.api_aftershipid),
      api_soku: num(start2Ship.api_soku, item.api_soku),
      api_slot_num: num(start2Ship.api_slot_num, item.api_slot_num),
      api_maxeq: Array.isArray(start2Ship.api_maxeq) ? [...start2Ship.api_maxeq] : item.api_maxeq
    };
  });
}

function mapFurniture(entry) {
  return {
    api_id: num(entry.api_id),
    api_type: num(entry.api_type),
    api_no: num(entry.api_no),
    api_title: entry.api_title || "",
    api_description: entry.api_description || "",
    api_rarity: num(entry.api_rarity),
    api_price: num(entry.api_price),
    api_saleflg: num(entry.api_saleflg),
    api_bgm_id: num(entry.api_bgm_id),
    api_version: num(entry.api_version, 1),
    api_outside_id: num(entry.api_outside_id),
    api_active_flag: num(entry.api_active_flag),
  };
}

// ---- Main ----
async function main() {
  console.log("Fetching equipment data...");
  const equipData = await fetch(EQUIP_URL);
  console.log(`  Got ${Object.keys(equipData).length} equipment entries`);

  console.log("Fetching ship data...");
  const shipData = await fetch(SHIP_URL);
  console.log(`  Got ${Object.keys(shipData).length} ship entries`);

  console.log("Fetching start2 equipment rule data...");
  const start2Data = await fetch(START2_URL);
  console.log(`  Got ${Object.keys(start2Data).length} start2 master sections`);

  // Map equipment
  const equipment = Object.values(equipData)
    .map(mapEquipment)
    .sort((a, b) => a.api_id - b.api_id);

  // Deduplicate by api_id (keep last entry in case of duplicate names)
  const equipById = new Map();
  for (const e of equipment) {
    equipById.set(e.api_id, e);
  }
  const uniqueEquipment = applyStart2SlotOverrides([...equipById.values()].sort((a, b) => a.api_id - b.api_id), start2Data);
  console.log(`  ${uniqueEquipment.length} unique equipment after dedup`);

  // Map ships
  const ships = Object.values(shipData).map(mapShip);

  // Build name→ID lookup for remodel resolution
  // The JSON keys (entry names) are the canonical names like "Abukuma", "Abukuma Kai", "Abukuma Kai Ni"
  // The _remodel_to field uses "/" notation like "Abukuma/Kai"
  // Normalize: replace "/" with " " to match JSON key style
  function normalize(name) {
    return String(name).replace(/\//g, " ").trim();
  }
  const nameToId = new Map();

  // Index by JSON key first (most specific: includes remodel suffix)
  for (const [key, s] of Object.entries(shipData)) {
    nameToId.set(normalize(key), s._api_id || s._id);
  }

  // Also index by _name and _japanese_name for broader matching
  for (const s of ships) {
    nameToId.set(normalize(s.api_yomi), s.api_id);
    if (s.api_name) nameToId.set(normalize(s.api_name), s.api_id);
  }

  // Resolve remodel targets
  let remodelResolved = 0;
  for (const s of ships) {
    if (s._remodel_to && typeof s._remodel_to === "string") {
      const targetId = nameToId.get(normalize(s._remodel_to));
      if (targetId) {
        s.api_aftershipid = targetId;
        if (s.api_afterlv === 0) s.api_afterlv = 30;
        remodelResolved++;
      }
    }
    delete s._remodel_to;
  }
  console.log(`  Resolved ${remodelResolved} remodel targets`);

  // Deduplicate ships by api_id
  const shipById = new Map();
  for (const s of ships) {
    shipById.set(s.api_id, s);
  }
  const uniqueShips = applyStart2ShipOverrides(
    [...shipById.values()].sort((a, b) => a.api_id - b.api_id),
    start2Data
  );
  console.log(`  ${uniqueShips.length} unique ships after dedup`);

  const shipTypes = start2Data.api_mst_stype || buildShipTypes(uniqueShips);
  const uniqueEquipTypes = start2Data.api_mst_slotitem_equiptype || [];
  const equipExslot = start2Data.api_mst_equip_exslot || [];
  const equipExslotShip = start2Data.api_mst_equip_exslot_ship || {};
  const equipLimitExslot = start2Data.api_mst_equip_limit_exslot || {};
  const equipShip = start2Data.api_mst_equip_ship || {};
  const furniture = (start2Data.api_mst_furniture || [])
    .map(mapFurniture)
    .sort((a, b) => a.api_id - b.api_id);

  // ---- Generate TypeScript ----
  const ts = [];

  ts.push("// Auto-generated master data from kcwiki/kancolle-data");
  ts.push("// Generated: " + new Date().toISOString());
  ts.push("");
  ts.push(`// Equipment: ${uniqueEquipment.length} entries, Ships: ${uniqueShips.length} entries, Furniture: ${furniture.length} entries`);
  ts.push("");
  ts.push("// ---- Equipment Master ----");
  ts.push("");
  ts.push("export const SLOT_ITEMS = [");

  for (const e of uniqueEquipment) {
    ts.push(`  ${JSON.stringify(e)},`);
  }
  ts.push("];");
  ts.push("");

  ts.push("// ---- Ship Master ----");
  ts.push("");
  ts.push("export const SHIPS = [");
  for (const s of uniqueShips) {
    ts.push(`  ${JSON.stringify(s)},`);
  }
  ts.push("];");
  ts.push("");

  ts.push("// ---- Ship Types ----");
  ts.push("");
  ts.push("export const SHIP_TYPES = [");
  for (const t of shipTypes) {
    ts.push(`  ${JSON.stringify(t)},`);
  }
  ts.push("];");
  ts.push("");

  ts.push("// ---- Equipment Types ----");
  ts.push("");
  ts.push("export const EQUIP_TYPES = [");
  for (const t of uniqueEquipTypes) {
    ts.push(`  ${JSON.stringify(t)},`);
  }
  ts.push("];");
  ts.push("");

  ts.push("// ---- Equipment Rule Masters ----");
  ts.push("");
  ts.push(`export const EQUIP_EXSLOT = ${JSON.stringify(equipExslot)};`);
  ts.push(`export const EQUIP_EXSLOT_SHIP = ${JSON.stringify(equipExslotShip)};`);
  ts.push(`export const EQUIP_LIMIT_EXSLOT = ${JSON.stringify(equipLimitExslot)};`);
  ts.push(`export const EQUIP_SHIP = ${JSON.stringify(equipShip)};`);
  ts.push("");

  ts.push("// ---- Furniture Master ----");
  ts.push("");
  ts.push("export const FURNITURE = [");
  for (const item of furniture) {
    ts.push(`  ${JSON.stringify(item)},`);
  }
  ts.push("];");
  ts.push("");

  // Write output
  const outPath = path.join(__dirname, "..", "src", "master", "generated-data.ts");
  fs.writeFileSync(outPath, ts.join("\n"));
  console.log(`\nGenerated ${outPath}`);
  console.log(`  Equipment: ${uniqueEquipment.length}`);
  console.log(`  Ships: ${uniqueShips.length}`);
  console.log(`  Ship Types: ${shipTypes.length}`);
  console.log(`  Equip Types: ${uniqueEquipTypes.length}`);
  console.log(`  Equip Ship Rules: ${Object.keys(equipShip).length}`);
  console.log(`  Furniture: ${furniture.length}`);

  // Quick validation
  const expectedEquipIds = [1, 2, 3, 4, 10, 37, 46];
  const missing = expectedEquipIds.filter((id) => !equipById.has(id));
  if (missing.length > 0) console.log(`\nWARNING: Missing expected equipment IDs: ${missing}`);
  console.log(`\nSample equipment:`, uniqueEquipment.slice(0, 5).map((e) => `${e.api_id}: ${e.api_name}`));
  console.log(`Sample ships:`, uniqueShips.slice(0, 5).map((s) => `${s.api_id}: ${s.api_name}`));
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
