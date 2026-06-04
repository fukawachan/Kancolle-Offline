const SHIP_LEVEL_CAP = 99;
const PLAYER_LEVEL_CAP = 120;

export function shipTotalExpForLevel(level: number) {
  return totalExpForLevel(level, SHIP_LEVEL_CAP, shipExpToNext);
}

export function shipLevelForExp(exp: number, cap = SHIP_LEVEL_CAP) {
  return levelForExp(exp, cap, shipExpToNext);
}

export function shipApiExp(exp: number, level?: number) {
  return apiExp(exp, level ?? shipLevelForExp(exp), SHIP_LEVEL_CAP, shipExpToNext);
}

export function shipLevelupInfo(beforeExp: number, gainedExp: number, cap = SHIP_LEVEL_CAP) {
  if (beforeExp < 0 || gainedExp < 0) return [-1];
  return levelupInfo(beforeExp, gainedExp, cap, shipExpToNext);
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

function levelForExp(exp: number, cap: number, toNext: (level: number) => number) {
  const total = Math.max(0, Math.trunc(exp));
  let level = 1;
  while (level < cap && total >= totalExpForLevel(level + 1, cap, toNext)) level += 1;
  return level;
}

function totalExpForLevel(level: number, cap: number, toNext: (level: number) => number) {
  const target = Math.max(1, Math.min(cap, Math.trunc(level)));
  let total = 0;
  for (let current = 1; current < target; current += 1) total += toNext(current);
  return total;
}

function shipExpToNext(level: number) {
  if (level < 50) return level * 100;
  if (level < 70) return 5000;
  if (level < 90) return 10000;
  return 20000;
}

function playerExpToNext(level: number) {
  if (level < 20) return level * 100;
  if (level < 80) return level * 250;
  return level * 500;
}
