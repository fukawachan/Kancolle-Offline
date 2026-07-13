import { describe, expect, it } from "vitest";
import { masterData } from "../src/master/data.js";
import {
  ENEMY_STATIC_STAT_PROVENANCE,
  playerShipStatBounds,
  playerShipStatVector,
  requirePlayerShipStat,
  resolveEnemyStaticStat,
  resolvePlayerShipStat,
  SHIP_STAT_GROWTH_PROVENANCE,
  shipStatGrowthCoverage
} from "../src/master/ship-stat-growth.js";

describe("versioned ship stat growth", () => {
  it("pins the community snapshots and published growth formula used as test evidence", () => {
    expect(SHIP_STAT_GROWTH_PROVENANCE).toMatchObject({
      schemaVersion: 1,
      sourceSha256: "d8c1691e83e6f4a9e55e34f8139c9ad9bb21ff9b3b7066dd3d5d31e15bae7dd7",
      formula: "floor(min + (max - min) * level / 99)"
    });
    expect(ENEMY_STATIC_STAT_PROVENANCE).toMatchObject({
      schemaVersion: 1,
      sourceSha256: "4d1357c83483fbe80a4ab3424966a601bb8612e5df692e99ab7911bab7cbfe6b"
    });
  });

  it.each([
    [9, 1, { evasion: 40, asw: 20, los: 5 }],
    [9, 50, { evasion: 64, asw: 34, los: 12 }],
    [9, 99, { evasion: 89, asw: 49, los: 19 }],
    [9, 188, { evasion: 133, asw: 75, los: 31 }],
    [277, 1, { evasion: 28, asw: 0, los: 50 }],
    [277, 50, { evasion: 48, asw: 0, los: 69 }],
    [277, 99, { evasion: 69, asw: 0, los: 89 }],
    [277, 188, { evasion: 105, asw: 0, los: 124 }],
    [911, 1, { evasion: 28, asw: 0, los: 18 }],
    [911, 50, { evasion: 48, asw: 0, los: 38 }],
    [911, 99, { evasion: 68, asw: 0, los: 59 }],
    [911, 188, { evasion: 103, asw: 0, los: 95 }]
  ])("resolves master %i at level %i", (masterId, level, expected) => {
    expect(playerShipStatVector(masterId, level)).toEqual(expected);
  });

  it("keeps explicit Lv1 and Lv99 bounds and extrapolates with the same formula after marriage", () => {
    expect(playerShipStatBounds(426)).toEqual({
      evasion: [49, 92],
      asw: [26, 68],
      los: [14, 54]
    });
    expect(requirePlayerShipStat(426, "asw", 188)).toBe(105);
  });

  it("covers every exposed player master and fails closed for an unknown master", () => {
    const coverage = shipStatGrowthCoverage();
    expect(coverage.playerMasterCount).toBe(masterData.api_mst_ship.length);
    expect(coverage.playerMasterCount).toBe(840);
    expect(resolvePlayerShipStat(999_999, "evasion", 50)).toMatchObject({
      ok: false,
      reason: "missing-master-bounds"
    });
    expect(() => requirePlayerShipStat(999_999, "evasion", 50)).toThrow(/missing evasion growth bounds/i);
  });

  it("uses published enemy static stats without inventing missing values", () => {
    expect(shipStatGrowthCoverage()).toMatchObject({
      enemyMasterCount: 453,
      enemyPublishedStatCounts: { evasion: 140, asw: 453, los: 139 }
    });
    expect(resolveEnemyStaticStat(1501, "evasion")).toMatchObject({
      ok: true,
      value: 14
    });
    expect(resolveEnemyStaticStat(1501, "asw")).toMatchObject({
      ok: true,
      value: 25
    });
    expect(resolveEnemyStaticStat(1650, "asw")).toMatchObject({
      ok: true,
      value: 0
    });
    expect(resolveEnemyStaticStat(1650, "evasion")).toMatchObject({
      ok: false,
      reason: "unpublished-static-stat"
    });
    expect(resolveEnemyStaticStat(1637, "evasion")).toMatchObject({
      ok: false,
      reason: "unpublished-static-stat"
    });
  });
});
