export type BattleRank = "S" | "A" | "B" | "C" | "D" | "E";

export type FleetResultState = {
  beforeHp: readonly number[];
  afterHp: readonly number[];
  /** A unit at or below this HP is treated as sunk (practice uses 1). */
  effectiveSunkHp?: readonly number[];
};

export type BattleRankInput = {
  friendly: FleetResultState;
  enemy: FleetResultState;
};

export type BattleRankMetrics = {
  friendlyShips: number;
  enemyShips: number;
  friendlySunk: number;
  enemySunk: number;
  friendlyFlagshipSunk: boolean;
  enemyFlagshipSunk: boolean;
  friendlyDamageGauge: number;
  enemyDamageGauge: number;
};

/** Pure day/night result decision shared by sortie, combined, and practice. */
export function evaluateBattleRank(input: BattleRankInput): BattleRank {
  const metrics = battleRankMetrics(input);
  const {
    friendlyShips,
    enemyShips,
    friendlySunk,
    enemySunk,
    enemyFlagshipSunk,
    friendlyDamageGauge,
    enemyDamageGauge
  } = metrics;

  if (enemyShips === 0) return "S";

  // Any friendly sinking caps the result at B, even when every enemy sank.
  if (enemySunk === enemyShips) return friendlySunk === 0 ? "S" : "B";

  const aThreshold = Math.max(1, Math.ceil(enemyShips * 2 / 3));
  if (friendlySunk === 0 && enemySunk >= aThreshold) return "A";

  if (enemyFlagshipSunk && enemySunk > friendlySunk) return "B";

  if (enemyDamageGauge > 0 && enemyDamageGauge >= friendlyDamageGauge * 2.5) return "B";

  // E-rank loss thresholds are 1/2, 2/3, 2/4, 3/5, and 4/6 friendly
  // ships sunk. A one-ship fleet cannot receive E solely from its HP state.
  const eThreshold = friendlyShips <= 1 ? Number.POSITIVE_INFINITY : Math.floor(friendlyShips * 2 / 3);
  if (!enemyFlagshipSunk && friendlySunk >= eThreshold) return "E";

  if (enemySunk > 0 || (enemyDamageGauge > 0 && enemyDamageGauge >= friendlyDamageGauge * 0.5)) return "C";
  return "D";
}

export function battleRankMetrics(input: BattleRankInput): BattleRankMetrics {
  const friendly = normalizedFleet(input.friendly);
  const enemy = normalizedFleet(input.enemy);
  return {
    friendlyShips: friendly.length,
    enemyShips: enemy.length,
    friendlySunk: friendly.filter((unit) => unit.afterHp <= unit.effectiveSunkHp).length,
    enemySunk: enemy.filter((unit) => unit.afterHp <= unit.effectiveSunkHp).length,
    friendlyFlagshipSunk: Boolean(friendly[0] && friendly[0].afterHp <= friendly[0].effectiveSunkHp),
    enemyFlagshipSunk: Boolean(enemy[0] && enemy[0].afterHp <= enemy[0].effectiveSunkHp),
    friendlyDamageGauge: damageGauge(friendly),
    enemyDamageGauge: damageGauge(enemy)
  };
}

type NormalizedUnit = {
  beforeHp: number;
  afterHp: number;
  effectiveSunkHp: number;
};

function normalizedFleet(state: FleetResultState): NormalizedUnit[] {
  return state.beforeHp.map((beforeValue, index) => {
    const beforeHp = Math.max(1, Math.trunc(Number(beforeValue) || 1));
    return {
      beforeHp,
      afterHp: Math.max(0, Math.min(beforeHp, Math.trunc(Number(state.afterHp[index]) || 0))),
      effectiveSunkHp: Math.max(0, Math.trunc(Number(state.effectiveSunkHp?.[index]) || 0))
    };
  });
}

function damageGauge(units: readonly NormalizedUnit[]) {
  const total = units.reduce((sum, unit) => sum + unit.beforeHp, 0);
  if (total <= 0) return 0;
  return units.reduce((sum, unit) => sum + unit.beforeHp - unit.afterHp, 0) / total;
}
