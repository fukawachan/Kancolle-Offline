export const SHIP_LEVEL_CAP = 99;
export const MARRIED_SHIP_LEVEL_CAP = 185;
const PLAYER_LEVEL_CAP = 120;

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
  185: 15_000_000
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
  return totalExpForLevel(level, PLAYER_LEVEL_CAP, playerExpToNext);
}

export function playerLevelForExp(exp: number, cap = PLAYER_LEVEL_CAP) {
  return levelForExp(exp, cap, playerExpToNext);
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

function playerExpToNext(level: number) {
  if (level < 20) return level * 100;
  if (level < 80) return level * 250;
  return level * 500;
}
