import { createHash } from "node:crypto";
import { masterData } from "../master/data.js";
import { BattleRng } from "./battle-formulas.js";

export type PracticeRivalShip = {
  id: number;
  masterId: number;
  level: number;
  star: number;
  slotMasterIds: number[];
  onSlot: number[];
};

export type PracticeRival = {
  id: number;
  name: string;
  level: number;
  rank: string;
  comment: string;
  flag: number;
  medals: number;
  ships: PracticeRivalShip[];
};

export type PracticeBatch = {
  periodKey: string;
  generatedAt: number;
  rivals: PracticeRival[];
};

export type GeneratePracticeBatchOptions = {
  availableShipIds?: Iterable<number>;
};

const RIVAL_COUNT = 5;
const JST_OFFSET_MS = 9 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;
const PRACTICE_RANK_MULTIPLIERS: Record<string, number> = {
  S: 1.2,
  A: 1,
  B: 1,
  C: 0.64,
  D: 0.56,
  E: 0.4
};
const MARRIAGE_TOTAL_EXP: Record<number, number> = {
  100: 0,
  101: 10_000,
  102: 11_000,
  103: 13_000,
  104: 16_000,
  105: 20_000,
  106: 25_000,
  107: 31_000,
  108: 38_000,
  109: 46_000,
  110: 55_000,
  111: 65_000,
  112: 77_000,
  113: 91_000,
  114: 107_000,
  115: 125_000,
  116: 145_000,
  117: 168_000,
  118: 194_000,
  119: 223_000,
  120: 255_000,
  121: 290_000,
  122: 329_000,
  123: 372_000,
  124: 419_000,
  125: 470_000,
  126: 525_000,
  127: 584_000,
  128: 647_000,
  129: 714_000,
  130: 785_000,
  131: 860_000,
  132: 940_000,
  133: 1_025_000,
  134: 1_115_000,
  135: 1_210_000,
  136: 1_310_000,
  137: 1_415_000,
  138: 1_525_000,
  139: 1_640_000,
  140: 1_760_000,
  141: 1_887_000,
  142: 2_021_000,
  143: 2_162_000,
  144: 2_310_000,
  145: 2_465_000,
  146: 2_628_000,
  147: 2_799_000,
  148: 2_978_000,
  149: 3_165_000,
  150: 3_360_000,
  151: 3_564_000,
  152: 3_777_000,
  153: 3_999_000,
  154: 4_230_000,
  155: 4_470_000,
  156: 4_720_000,
  157: 4_780_000,
  158: 4_860_000,
  159: 4_970_000,
  160: 5_120_000,
  161: 5_320_000,
  162: 5_580_000,
  163: 5_910_000,
  164: 6_320_000,
  165: 6_820_000,
  166: 6_920_000,
  167: 7_033_000,
  168: 7_172_000,
  169: 7_350_000,
  170: 7_580_000,
  171: 7_875_000,
  172: 8_248_000,
  173: 8_705_000,
  174: 9_266_000,
  175: 9_950_000,
  176: 10_100_000,
  177: 10_300_000,
  178: 10_600_000,
  179: 11_100_000,
  180: 12_000_000,
  181: 12_200_000,
  182: 12_600_000,
  183: 13_200_000,
  184: 14_000_000,
  185: 15_000_000,
  186: 16_200_000,
  187: 17_600_000,
  188: 19_200_000
};

const CARRIER_TYPES = new Set([7, 11, 18]);
const BATTLESHIP_TYPES = new Set([8, 9, 10]);
const CRUISER_TYPES = new Set([5, 6]);
const TORPEDO_SHIP_TYPES = new Set([2, 3, 4]);
const SUBMARINE_TYPES = new Set([13, 14]);
const AIRCRAFT_TYPES = new Set([6, 7, 8, 9, 10, 11, 45, 56, 57]);
const CARRIER_FIGHTERS = [22, 55, 21, 20, 19];
const CARRIER_ATTACKERS = [52, 18, 17, 24, 23];
const CARRIER_RECON = [54, 61];
const MAIN_GUNS = [9, 8, 7];
const SECONDARY_GUNS = [12, 10];
const TORPEDOES = [14, 13];
const SEAPLANES = [25, 59, 26];
const AP_SHELLS = [36];

const PRACTICE_SHIP_POOL = masterData.api_mst_ship
  .filter((ship) => safeNum(ship.api_id) > 0 && safeNum(ship.api_id) < 1500 && safeNum(ship.api_sortno) > 0)
  .map((ship) => safeNum(ship.api_id));

const SLOT_MASTER_BY_ID = new Map(masterData.api_mst_slotitem.map((slot) => [slot.api_id, slot] as const));

export function practicePeriodKey(now = Date.now()) {
  const jstMs = Math.trunc(now) + JST_OFFSET_MS;
  const dayStart = Math.floor(jstMs / DAY_MS) * DAY_MS;
  const hour = Math.floor((jstMs - dayStart) / HOUR_MS);
  const periodStart = hour >= 15 ? dayStart + 15 * HOUR_MS : hour >= 3 ? dayStart + 3 * HOUR_MS : dayStart - 9 * HOUR_MS;
  const date = new Date(periodStart);
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  const periodHour = String(date.getUTCHours()).padStart(2, "0");
  return `${year}-${month}-${day}T${periodHour}:00+09:00`;
}

export function generatePracticeBatch(
  periodKey = practicePeriodKey(),
  generatedAt = Date.now(),
  options: GeneratePracticeBatchOptions = {}
): PracticeBatch {
  const rng = new BattleRng(seedFromPeriod(periodKey));
  const pool = practiceShipPool(options);
  const twoShipRivals = balancedTwoShipRivals(rng);
  return {
    periodKey,
    generatedAt: Math.trunc(generatedAt),
    rivals: Array.from({ length: RIVAL_COUNT }, (_value, index) =>
      practiceRival(index + 1, rng, pool, twoShipRivals.has(index))
    )
  };
}

export function practiceRivalById(rivals: PracticeRival[], id: number) {
  return cloneRival(rivals.find((rival) => rival.id === id) ?? rivals[0] ?? practiceRival(1, new BattleRng(1), PRACTICE_SHIP_POOL));
}

export function clonePracticeBatch(batch: PracticeBatch): PracticeBatch {
  return {
    periodKey: batch.periodKey,
    generatedAt: batch.generatedAt,
    rivals: batch.rivals.map(cloneRival)
  };
}

export function isPracticeBatch(value: unknown): value is PracticeBatch {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const batch = value as PracticeBatch;
  return typeof batch.periodKey === "string" &&
    Number.isFinite(batch.generatedAt) &&
    Array.isArray(batch.rivals) &&
    batch.rivals.every(isPracticeRival);
}

export function practiceBatchMatchesOptions(batch: PracticeBatch, options: GeneratePracticeBatchOptions = {}) {
  const pool = new Set(practiceShipPool(options));
  return batch.rivals.every((rival) => rival.ships.every((ship) => pool.has(ship.masterId)));
}

export function shipTotalExpForPracticeLevel(level: number) {
  const normalized = Math.max(1, Math.min(188, Math.trunc(level)));
  if (normalized <= 99) return officialShipTotalExpForLevel(normalized);
  return 1_000_000 + (MARRIAGE_TOTAL_EXP[normalized] ?? MARRIAGE_TOTAL_EXP[188]);
}

export function practiceRankMultiplier(rank: string) {
  return PRACTICE_RANK_MULTIPLIERS[rank] ?? 1;
}

export function practiceBaseShipExp(levels: number[], rank: string, seededBonus = 0) {
  const first = Math.max(1, Math.trunc(levels[0] ?? 1));
  const second = Math.max(1, Math.trunc(levels[1] ?? 1));
  const raw = Math.floor(
    shipTotalExpForPracticeLevel(first) / 100 +
    shipTotalExpForPracticeLevel(second) / 300 +
    Math.max(0, Math.min(3, Math.trunc(seededBonus)))
  );
  const beforeRank = raw <= 500 ? raw : Math.floor(500 + Math.sqrt(raw - 500));
  return Math.floor(beforeRank * practiceRankMultiplier(rank));
}

export function practiceSeededBonus(seed: number) {
  return positiveModulo(Math.trunc(seed), 4);
}

export function practiceMemberExp(playerLevel: number, enemyLevel: number, rank: string) {
  const diff = Math.trunc(enemyLevel) - Math.trunc(playerLevel);
  const row = diff >= 5
    ? { S: 160, A: 120, B: 96, C: 80, D: 80, E: 80 }
    : diff >= 3
      ? { S: 120, A: 80, B: 64, C: 60, D: 60, E: 60 }
      : diff >= 1
        ? { S: 80, A: 60, B: 48, C: 40, D: 40, E: 40 }
        : diff === 0
          ? { S: 60, A: 40, B: 32, C: 30, D: 30, E: 30 }
          : diff >= -2
            ? { S: 40, A: 30, B: 24, C: 20, D: 20, E: 20 }
            : diff >= -4
              ? { S: 30, A: 20, B: 16, C: 15, D: 15, E: 15 }
              : { S: 20, A: 15, B: 12, C: 10, D: 10, E: 10 };
  return row[rank as keyof typeof row] ?? row.S;
}

function practiceRival(id: number, rng: BattleRng, pool: number[], forceTwoShips = false): PracticeRival {
  const level = rng.intInclusive(80, 120);
  const shipCount = forceTwoShips ? 2 : rng.intInclusive(3, 6);
  return {
    id,
    name: `Exercise Fleet ${id}`,
    level,
    rank: rankForLevel(level),
    comment: "Generated local practice opponent",
    flag: 1,
    medals: Math.max(0, Math.floor((level - 80) / 10)),
    ships: practiceShips(id, shipCount, rng, pool)
  };
}

function practiceShips(rivalId: number, count: number, rng: BattleRng, shipPool: number[]) {
  const pool = [...shipPool];
  return Array.from({ length: count }, (_value, index) => {
    const pickedIndex = rng.int(pool.length);
    const masterId = pool.splice(pickedIndex, 1)[0] ?? 9;
    const master = masterData.api_mst_ship.find((ship) => ship.api_id === masterId);
    const level = rng.intInclusive(80, 188);
    const loadout = practiceShipLoadout(master, level, rng);
    return {
      id: rivalId * 100 + index + 1,
      masterId,
      level,
      star: Math.max(1, Math.min(5, Math.floor(level / 35))),
      slotMasterIds: loadout.slotMasterIds,
      onSlot: loadout.onSlot
    };
  });
}

function practiceShipPool(options: GeneratePracticeBatchOptions) {
  const available = options.availableShipIds ? new Set([...options.availableShipIds].map((id) => safeNum(id))) : null;
  const filtered = PRACTICE_SHIP_POOL.filter((id) => !available || available.has(id));
  return filtered.length >= 6 ? filtered : PRACTICE_SHIP_POOL;
}

function balancedTwoShipRivals(rng: BattleRng) {
  const target = rng.chance(0.5) ? 2 : 3;
  const indexes = new Set<number>();
  while (indexes.size < target) indexes.add(rng.int(RIVAL_COUNT));
  return indexes;
}

function practiceShipLoadout(
  master: (typeof masterData.api_mst_ship)[number] | undefined,
  level: number,
  rng: BattleRng
) {
  const slotNum = Math.max(1, Math.min(5, safeNum(master?.api_slot_num, 1)));
  const maxEq = normalizeFixed(
    Array.isArray(master?.api_maxeq) ? master.api_maxeq.map((value) => Math.max(0, safeNum(value))) : [],
    5,
    0
  );
  const shipType = safeNum(master?.api_stype, 2);
  const choices = loadoutChoices(shipType, maxEq.some((count) => count > 0), level, rng);
  const slotMasterIds = Array.from({ length: slotNum }, (_value, index) => choices[index] ?? choices[choices.length - 1] ?? 10);
  const onSlot = normalizeFixed(
    slotMasterIds.map((slotMasterId, index) => isAircraftSlotMaster(slotMasterId) ? maxEq[index] ?? 0 : 0),
    5,
    0
  );
  return {
    slotMasterIds,
    onSlot
  };
}

function loadoutChoices(shipType: number, hasAircraftCapacity: boolean, level: number, rng: BattleRng) {
  if (CARRIER_TYPES.has(shipType)) {
    const fighter = rng.pick(level >= 100 ? CARRIER_FIGHTERS.slice(0, 3) : CARRIER_FIGHTERS);
    const firstAttacker = rng.pick(level >= 100 ? CARRIER_ATTACKERS.slice(0, 3) : CARRIER_ATTACKERS);
    const secondAttacker = rng.pick(CARRIER_ATTACKERS);
    const utility = rng.chance(0.55) ? rng.pick(CARRIER_RECON) : rng.pick(CARRIER_FIGHTERS);
    return [fighter, firstAttacker, secondAttacker, utility];
  }
  if (BATTLESHIP_TYPES.has(shipType)) {
    return [rng.pick(MAIN_GUNS), rng.pick(MAIN_GUNS), rng.pick(AP_SHELLS), hasAircraftCapacity ? rng.pick(SEAPLANES) : rng.pick(SECONDARY_GUNS)];
  }
  if (CRUISER_TYPES.has(shipType)) {
    return [rng.pick(MAIN_GUNS), rng.pick(SECONDARY_GUNS), hasAircraftCapacity ? rng.pick(SEAPLANES) : rng.pick(TORPEDOES), rng.pick(TORPEDOES)];
  }
  if (TORPEDO_SHIP_TYPES.has(shipType)) {
    return [rng.pick(SECONDARY_GUNS), rng.pick(SECONDARY_GUNS), rng.pick(TORPEDOES)];
  }
  if (SUBMARINE_TYPES.has(shipType)) {
    return [rng.pick(TORPEDOES), rng.pick(TORPEDOES)];
  }
  if (hasAircraftCapacity) {
    return [rng.pick(SECONDARY_GUNS), rng.pick(SEAPLANES), rng.pick(SEAPLANES)];
  }
  return [rng.pick(SECONDARY_GUNS), rng.pick(TORPEDOES)];
}

function isAircraftSlotMaster(slotMasterId: number) {
  const slot = SLOT_MASTER_BY_ID.get(slotMasterId);
  return AIRCRAFT_TYPES.has(safeNum(slot?.api_type?.[2]));
}

function normalizeFixed<T>(values: readonly T[], length: number, fill: T) {
  return [...values, ...Array(length).fill(fill)].slice(0, length);
}

function rankForLevel(level: number) {
  if (level >= 115) return "元帥";
  if (level >= 105) return "大将";
  if (level >= 95) return "中将";
  if (level >= 88) return "少将";
  return "大佐";
}

function officialShipTotalExpForLevel(level: number) {
  const target = Math.max(1, Math.min(99, Math.trunc(level)));
  let total = 0;
  for (let current = 1; current < target; current += 1) total += officialShipExpToNext(current);
  return total;
}

function officialShipExpToNext(level: number) {
  if (level <= 50) return level * 100;
  if (level <= 60) return 5_000 + (level - 50) * 200;
  if (level <= 70) return 7_000 + (level - 60) * 300;
  if (level <= 80) return 10_000 + (level - 70) * 400;
  if (level <= 90) return 14_000 + (level - 80) * 500;
  const late: Record<number, number> = {
    91: 20_000,
    92: 22_000,
    93: 25_000,
    94: 30_000,
    95: 40_000,
    96: 60_000,
    97: 90_000,
    98: 148_500
  };
  return late[level] ?? 0;
}

function cloneRival(rival: PracticeRival): PracticeRival {
  return {
    ...rival,
    ships: rival.ships.map((ship) => ({ ...ship }))
  };
}

function isPracticeRival(value: unknown): value is PracticeRival {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const rival = value as PracticeRival;
  return Number.isInteger(rival.id) &&
    typeof rival.name === "string" &&
    Number.isInteger(rival.level) &&
    typeof rival.rank === "string" &&
    typeof rival.comment === "string" &&
    Array.isArray(rival.ships) &&
    rival.ships.every(isPracticeRivalShip);
}

function isPracticeRivalShip(value: unknown): value is PracticeRivalShip {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const ship = value as PracticeRivalShip;
  return Number.isInteger(ship.id) &&
    Number.isInteger(ship.masterId) &&
    Number.isInteger(ship.level) &&
    Number.isInteger(ship.star) &&
    Array.isArray(ship.slotMasterIds) &&
    ship.slotMasterIds.every(Number.isInteger) &&
    Array.isArray(ship.onSlot) &&
    ship.onSlot.every(Number.isFinite);
}

function seedFromPeriod(periodKey: string) {
  const hash = createHash("sha256").update(periodKey).digest();
  return hash.readUInt32LE(0);
}

function positiveModulo(value: number, divisor: number) {
  return ((value % divisor) + divisor) % divisor;
}

function safeNum(value: unknown, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}
