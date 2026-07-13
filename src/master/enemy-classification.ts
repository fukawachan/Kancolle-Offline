export type EnemyTargetKind = "surface" | "submarine" | "installation" | "pt";

const SUBMARINE_SHIP_TYPES = new Set([13, 14]);

export const INSTALLATION_ENEMY_MASTER_IDS = new Set([
  1573,
  1587,
  1588,
  1589,
  1613,
  1650,
  1651,
  1653,
  1656,
  1665,
  1666,
  1667,
  1668,
  1669,
  1671,
  1672,
  1922,
  1925,
  2047,
  2048
]);

export const PT_IMP_ENEMY_MASTER_IDS = new Set([1637, 1638, 1639, 1640]);

export function shipTargetKind(shipType: number): EnemyTargetKind {
  return SUBMARINE_SHIP_TYPES.has(Math.trunc(shipType)) ? "submarine" : "surface";
}

export function enemyTargetKind(masterId: number, shipType: number): EnemyTargetKind {
  if (INSTALLATION_ENEMY_MASTER_IDS.has(Math.trunc(masterId))) return "installation";
  if (PT_IMP_ENEMY_MASTER_IDS.has(Math.trunc(masterId))) return "pt";
  return shipTargetKind(shipType);
}
