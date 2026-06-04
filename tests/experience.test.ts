import { describe, expect, it } from "vitest";
import { shipApiExp, shipLevelForExp, shipLevelupInfo, shipTotalExpForLevel } from "../src/kcsapi/experience.js";

describe("battle experience helpers", () => {
  it("uses deterministic cumulative ship experience thresholds", () => {
    expect(shipTotalExpForLevel(1)).toBe(0);
    expect(shipTotalExpForLevel(2)).toBe(100);
    expect(shipTotalExpForLevel(3)).toBe(300);
    expect(shipLevelForExp(0)).toBe(1);
    expect(shipLevelForExp(100)).toBe(2);
    expect(shipLevelForExp(299)).toBe(2);
    expect(shipLevelForExp(300)).toBe(3);
  });

  it("builds level-up animation boundaries without null slots", () => {
    expect(shipLevelupInfo(-1, -1)).toEqual([-1]);
    expect(shipLevelupInfo(0, 40)).toEqual([0, 100]);
    expect(shipLevelupInfo(80, 40)).toEqual([80, 100, 300]);
  });

  it("serializes ship api_exp as total, remaining, and progress", () => {
    expect(shipApiExp(0, 1)).toEqual([0, 100, 0]);
    expect(shipApiExp(50, 1)).toEqual([50, 50, 50]);
    expect(shipApiExp(100, 2)).toEqual([100, 200, 0]);
  });
});
