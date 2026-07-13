export const SHIP_LEVEL_CAP = 99;
export const MARRIED_SHIP_LEVEL_CAP = 188;
const PLAYER_LEVEL_CAP = 120;

// Versioned public reference (last edited 2026-04-06, captured 2026-07-11):
// https://en.kancollewiki.net/w/index.php?title=Experience_and_Rank&oldid=205058
// Keep this as a discrete table: HQ levels 99+ do not follow the ship EXP formula.
const PLAYER_TOTAL_EXP_BY_LEVEL = [
  0, 100, 300, 600, 1_000, 1_500, 2_100, 2_800,
  3_600, 4_500, 5_500, 6_600, 7_800, 9_100, 10_500, 12_000,
  13_600, 15_300, 17_100, 19_000, 21_000, 23_100, 25_300, 27_600,
  30_000, 32_500, 35_100, 37_800, 40_600, 43_500, 46_500, 49_600,
  52_800, 56_100, 59_500, 63_000, 66_600, 70_300, 74_100, 78_000,
  82_000, 86_100, 90_300, 94_600, 99_000, 103_500, 108_100, 112_800,
  117_600, 122_500, 127_500, 132_700, 138_100, 143_700, 149_500, 155_500,
  161_700, 168_100, 174_700, 181_500, 188_500, 195_800, 203_400, 211_300,
  219_500, 228_000, 236_800, 245_900, 255_300, 265_000, 275_000, 285_400,
  296_200, 307_400, 319_000, 331_000, 343_400, 356_200, 369_400, 383_000,
  397_000, 411_500, 426_500, 442_000, 458_000, 474_500, 491_500, 509_000,
  527_000, 545_500, 564_500, 584_500, 606_500, 631_500, 661_500, 701_500,
  761_500, 851_500, 1_000_000, 1_300_000, 1_600_000, 1_900_000, 2_200_000, 2_600_000,
  3_000_000, 3_500_000, 4_000_000, 4_600_000, 5_200_000, 5_900_000, 6_600_000, 7_400_000,
  8_200_000, 9_100_000, 10_000_000, 11_000_000, 12_000_000, 13_000_000, 14_000_000, 15_000_000
] as const;

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

export function shipTotalExpForLevel(level: number, cap = SHIP_LEVEL_CAP) {
  const normalizedCap = Math.max(1, Math.min(MARRIED_SHIP_LEVEL_CAP, Math.trunc(cap)));
  const target = Math.max(1, Math.min(normalizedCap, Math.trunc(level)));
  if (target <= SHIP_LEVEL_CAP) return totalExpForLevel(target, SHIP_LEVEL_CAP, shipExpToNext);
  return 1_000_000 + (MARRIAGE_TOTAL_EXP[target] ?? MARRIAGE_TOTAL_EXP[MARRIED_SHIP_LEVEL_CAP]);
}

export function shipLevelForExp(exp: number, cap = SHIP_LEVEL_CAP) {
  return levelForExpByTotal(exp, Math.min(cap, MARRIED_SHIP_LEVEL_CAP), shipTotalExpForLevel);
}

export function shipApiExp(exp: number, level?: number, cap = SHIP_LEVEL_CAP) {
  const normalizedCap = Math.min(cap, MARRIED_SHIP_LEVEL_CAP);
  return apiExpByTotal(exp, level ?? shipLevelForExp(exp, normalizedCap), normalizedCap, shipTotalExpForLevel);
}

export function shipLevelupInfo(beforeExp: number, gainedExp: number, cap = SHIP_LEVEL_CAP) {
  if (beforeExp < 0 || gainedExp < 0) return [-1];
  return levelupInfoByTotal(beforeExp, gainedExp, Math.min(cap, MARRIED_SHIP_LEVEL_CAP), shipTotalExpForLevel);
}

export function playerTotalExpForLevel(level: number) {
  const target = Math.max(1, Math.min(PLAYER_LEVEL_CAP, Math.trunc(level)));
  return PLAYER_TOTAL_EXP_BY_LEVEL[target - 1] ?? PLAYER_TOTAL_EXP_BY_LEVEL[PLAYER_LEVEL_CAP - 1];
}

export function playerLevelForExp(exp: number, cap = PLAYER_LEVEL_CAP) {
  const normalizedCap = Math.max(1, Math.min(PLAYER_LEVEL_CAP, Math.trunc(cap)));
  return levelForExpByTotal(exp, normalizedCap, (level) => playerTotalExpForLevel(level));
}

function apiExp(exp: number, level: number, cap: number, toNext: (level: number) => number) {
  const current = totalExpForLevel(level, cap, toNext);
  const next = level >= cap ? current : totalExpForLevel(level + 1, cap, toNext);
  return apiExpFromBounds(exp, level, cap, current, next);
}

function apiExpByTotal(exp: number, level: number, cap: number, totalForLevel: (level: number, cap: number) => number) {
  const current = totalForLevel(level, cap);
  const next = level >= cap ? current : totalForLevel(level + 1, cap);
  return apiExpFromBounds(exp, level, cap, current, next);
}

function apiExpFromBounds(exp: number, level: number, cap: number, current: number, next: number) {
  const remaining = Math.max(0, next - exp);
  const span = Math.max(1, next - current);
  const progress = level >= cap ? 100 : Math.max(0, Math.min(100, Math.floor(((exp - current) / span) * 100)));
  return [exp, remaining, progress];
}

function levelupInfo(beforeExp: number, gainedExp: number, cap: number, toNext: (level: number) => number) {
  const before = Math.max(0, Math.trunc(beforeExp));
  const after = Math.max(before, before + Math.max(0, Math.trunc(gainedExp)));
  const values = [before];
  let nextLevel = levelForExp(before, cap, toNext) + 1;
  while (nextLevel <= cap) {
    const threshold = totalExpForLevel(nextLevel, cap, toNext);
    values.push(threshold);
    if (threshold > after) break;
    nextLevel += 1;
  }
  if (values.length === 1) values.push(totalExpForLevel(cap, cap, toNext));
  return values;
}

function levelupInfoByTotal(
  beforeExp: number,
  gainedExp: number,
  cap: number,
  totalForLevel: (level: number, cap: number) => number
) {
  const before = Math.max(0, Math.trunc(beforeExp));
  const after = Math.max(before, before + Math.max(0, Math.trunc(gainedExp)));
  const values = [before];
  let nextLevel = levelForExpByTotal(before, cap, totalForLevel) + 1;
  while (nextLevel <= cap) {
    const threshold = totalForLevel(nextLevel, cap);
    values.push(threshold);
    if (threshold > after) break;
    nextLevel += 1;
  }
  if (values.length === 1) values.push(totalForLevel(cap, cap));
  return values;
}

function levelForExp(exp: number, cap: number, toNext: (level: number) => number) {
  const total = Math.max(0, Math.trunc(exp));
  let level = 1;
  while (level < cap && total >= totalExpForLevel(level + 1, cap, toNext)) level += 1;
  return level;
}

function levelForExpByTotal(exp: number, cap: number, totalForLevel: (level: number, cap: number) => number) {
  const total = Math.max(0, Math.trunc(exp));
  let level = 1;
  while (level < cap && total >= totalForLevel(level + 1, cap)) level += 1;
  return level;
}

function totalExpForLevel(level: number, cap: number, toNext: (level: number) => number) {
  const target = Math.max(1, Math.min(cap, Math.trunc(level)));
  let total = 0;
  for (let current = 1; current < target; current += 1) total += toNext(current);
  return total;
}

function shipExpToNext(level: number) {
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
