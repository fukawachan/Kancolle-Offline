import { describe, expect, it } from "vitest";
import {
  MARRIED_SHIP_LEVEL_CAP,
  playerLevelForExp,
  playerTotalExpForLevel,
  shipApiExp,
  shipLevelForExp,
  shipLevelupInfo,
  shipTotalExpForLevel
} from "../src/kcsapi/experience.js";
import { practiceBaseShipExp, practiceMemberExp, shipTotalExpForPracticeLevel } from "../src/kcsapi/practice.js";

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

  it("uses the official post-marriage ship level cap and cumulative experience", () => {
    expect(MARRIED_SHIP_LEVEL_CAP).toBe(188);
    expect(shipTotalExpForLevel(99)).toBe(1_000_000);
    expect(shipTotalExpForLevel(100, MARRIED_SHIP_LEVEL_CAP)).toBe(1_000_000);
    expect(shipTotalExpForLevel(120, MARRIED_SHIP_LEVEL_CAP)).toBe(1_255_000);
    expect(shipTotalExpForLevel(185, MARRIED_SHIP_LEVEL_CAP)).toBe(16_000_000);
    expect(shipTotalExpForLevel(186, MARRIED_SHIP_LEVEL_CAP)).toBe(17_200_000);
    expect(shipTotalExpForLevel(187, MARRIED_SHIP_LEVEL_CAP)).toBe(18_600_000);
    expect(shipTotalExpForLevel(188, MARRIED_SHIP_LEVEL_CAP)).toBe(20_200_000);
    expect(shipTotalExpForLevel(189, MARRIED_SHIP_LEVEL_CAP)).toBe(20_200_000);
    expect(shipLevelForExp(1_254_999, MARRIED_SHIP_LEVEL_CAP)).toBe(119);
    expect(shipLevelForExp(1_255_000, MARRIED_SHIP_LEVEL_CAP)).toBe(120);
    expect(shipLevelForExp(17_199_999, MARRIED_SHIP_LEVEL_CAP)).toBe(185);
    expect(shipLevelForExp(17_200_000, MARRIED_SHIP_LEVEL_CAP)).toBe(186);
    expect(shipLevelForExp(99_999_999, MARRIED_SHIP_LEVEL_CAP)).toBe(188);
    expect(shipApiExp(20_200_000, 188, MARRIED_SHIP_LEVEL_CAP)).toEqual([20_200_000, 0, 100]);
  });

  it("uses the complete discrete HQ experience table through level 120", () => {
    expect(playerTotalExpForLevel(1)).toBe(0);
    expect(playerTotalExpForLevel(20)).toBe(19_000);
    expect(playerTotalExpForLevel(21) - playerTotalExpForLevel(20)).toBe(2_000);
    expect(playerTotalExpForLevel(80)).toBe(383_000);
    expect(playerTotalExpForLevel(81) - playerTotalExpForLevel(80)).toBe(14_000);
    expect(playerTotalExpForLevel(99)).toBe(1_000_000);
    expect(playerTotalExpForLevel(100)).toBe(1_300_000);
    expect(playerTotalExpForLevel(120)).toBe(15_000_000);
    expect(playerTotalExpForLevel(121)).toBe(15_000_000);

    for (let level = 1; level <= 120; level += 1) {
      expect(playerLevelForExp(playerTotalExpForLevel(level))).toBe(level);
    }
    expect(playerLevelForExp(20_999)).toBe(20);
    expect(playerLevelForExp(396_999)).toBe(80);
    expect(playerLevelForExp(99_999_999)).toBe(120);
  });

  it("calculates practice ship experience from the enemy flagship and second ship levels", () => {
    expect(practiceBaseShipExp([80, 1], "A", 0)).toBe(557);
    expect(practiceBaseShipExp([80, 80], "A", 0)).toBe(567);
    expect(practiceBaseShipExp([99, 1], "A", 0)).toBe(597);

    const base = practiceBaseShipExp([80, 80], "A", 0);
    expect(practiceBaseShipExp([80, 80], "S", 0)).toBe(Math.floor(base * 1.2));
    expect(practiceBaseShipExp([80, 80], "B", 0)).toBe(base);
    expect(practiceBaseShipExp([80, 80], "C", 0)).toBe(Math.floor(base * 0.64));
  });

  it("uses post-marriage cumulative experience plus the practice offset for level 100 and above", () => {
    expect(shipTotalExpForPracticeLevel(80)).toBe(383_000);
    expect(shipTotalExpForPracticeLevel(99)).toBe(1_000_000);
    expect(shipTotalExpForPracticeLevel(100)).toBe(1_000_000);
    expect(shipTotalExpForPracticeLevel(120)).toBe(1_255_000);
    expect(shipTotalExpForPracticeLevel(185)).toBe(16_000_000);
    expect(shipTotalExpForPracticeLevel(188)).toBe(20_200_000);
  });

  it("calculates practice member experience from commander level difference and rank", () => {
    expect(practiceMemberExp(80, 85, "S")).toBe(160);
    expect(practiceMemberExp(80, 85, "A")).toBe(120);
    expect(practiceMemberExp(80, 85, "B")).toBe(96);
    expect(practiceMemberExp(80, 85, "C")).toBe(80);
    expect(practiceMemberExp(90, 85, "S")).toBe(20);
  });
});
