import { describe, expect, it } from "vitest";
import { evaluateBattleRank } from "../src/kcsapi/battle/result.js";

describe("complete battle-rank decision table", () => {
  const friendly = (afterHp: number[], beforeHp = afterHp.map(() => 100)) => ({ beforeHp, afterHp });
  const enemy = (afterHp: number[], beforeHp = afterHp.map(() => 100)) => ({ beforeHp, afterHp });

  it("returns S for a clean sweep and A at the two-thirds sink boundary", () => {
    expect(evaluateBattleRank({ friendly: friendly([100, 100]), enemy: enemy([0, 0, 0]) })).toBe("S");
    expect(evaluateBattleRank({ friendly: friendly([100, 100]), enemy: enemy([100, 0, 0]) })).toBe("A");
  });

  it("returns B for flagship/sink superiority or a 2.5x damage gauge", () => {
    expect(evaluateBattleRank({ friendly: friendly([50, 100, 100]), enemy: enemy([0, 100, 100]) })).toBe("B");
    expect(evaluateBattleRank({ friendly: friendly([80, 100]), enemy: enemy([50, 50]) })).toBe("B");
  });

  it("distinguishes C, D, and E losses", () => {
    expect(evaluateBattleRank({ friendly: friendly([50, 100]), enemy: enemy([75, 100]) })).toBe("C");
    expect(evaluateBattleRank({ friendly: friendly([50, 100]), enemy: enemy([90, 100]) })).toBe("D");
    expect(evaluateBattleRank({ friendly: friendly([0, 0, 100]), enemy: enemy([100, 100, 100]) })).toBe("E");
  });

  it("uses the fleet-size-specific E-rank sinking thresholds", () => {
    expect(evaluateBattleRank({ friendly: friendly([0, 100]), enemy: enemy([100, 100]) })).toBe("E");
    expect(evaluateBattleRank({ friendly: friendly([0, 0, 100, 100]), enemy: enemy([100, 100]) })).toBe("E");
    expect(evaluateBattleRank({ friendly: friendly([0, 0, 0, 100, 100]), enemy: enemy([100, 100]) })).toBe("E");
    expect(evaluateBattleRank({ friendly: friendly([0, 0, 0, 0, 100, 100]), enemy: enemy([100, 100]) })).toBe("E");
    expect(evaluateBattleRank({ friendly: friendly([0]), enemy: enemy([100]) })).toBe("D");
  });

  it("awards at least C after sinking a non-flagship even below the gauge ratio", () => {
    expect(evaluateBattleRank({
      friendly: friendly([1, 1]),
      enemy: enemy([100, 0, 100])
    })).toBe("C");
  });
});
