import type { masterData } from "../master/data.js";
import type { Ship } from "../state/types.js";

type ShipMaster = (typeof masterData.api_mst_ship)[number];

const HALF_TIME_STYPES = new Set([1, 13]);
const NORMAL_TIME_STYPES = new Set([2, 3, 4, 14, 15, 16, 17, 21, 22]);
const ONE_AND_HALF_TIME_STYPES = new Set([5, 6, 7, 8, 20]);
const DOUBLE_TIME_STYPES = new Set([9, 10, 11, 12, 18, 19]);

export type RepairCost = {
  lostHp: number;
  fuel: number;
  steel: number;
};

export function repairCost(ship: Ship, master?: ShipMaster): RepairCost {
  const lostHp = Math.max(0, safeInt(ship.maxHp) - safeInt(ship.hp));
  const baseFuel = safeInt(master?.api_fuel_max, ship.maxFuel);
  return {
    lostHp,
    fuel: Math.floor(baseFuel * lostHp * 0.032),
    steel: Math.floor(baseFuel * lostHp * 0.06)
  };
}

export function repairTimeMs(ship: Ship, master?: ShipMaster): number {
  const { lostHp } = repairCost(ship, master);
  if (lostHp <= 0) return 0;

  const level = Math.max(1, safeInt(ship.level, 1));
  const levelSeconds = level <= 11
    ? level * 10
    : level * 5 + Math.floor(Math.sqrt(level - 11)) * 10 + 50;
  const seconds = 30 + lostHp * levelSeconds * repairTimeMultiplier(master);
  return Math.floor(seconds * 1000);
}

function repairTimeMultiplier(master?: ShipMaster): number {
  const shipType = safeInt(master?.api_stype);
  if (HALF_TIME_STYPES.has(shipType)) return 0.5;
  if (NORMAL_TIME_STYPES.has(shipType)) return 1;
  if (ONE_AND_HALF_TIME_STYPES.has(shipType)) return 1.5;
  if (DOUBLE_TIME_STYPES.has(shipType)) return 2;
  return 1;
}

function safeInt(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? Math.trunc(n) : fallback;
}
