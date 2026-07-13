import { describe, expect, it } from "vitest";
import { transportPointsForRank, transportSPoints } from "../src/kcsapi/transport.js";

describe("transport gauge points", () => {
  it("applies published ship and equipment points, then floors A rank once", () => {
    const sPoints = transportSPoints([
      { shipId: 1, masterId: 1, shipType: 2, hp: 10, maxHp: 10, equipmentMasterIds: [75, 68] },
      { shipId: 2, masterId: 2, shipType: 16, hp: 20, maxHp: 20, equipmentMasterIds: [167, 145] }
    ]);
    expect(sPoints).toBe(5 + 5 + 8 + 9 + 2 + 1);
    expect(transportPointsForRank({ sRankPoints: sPoints }, "S")).toBe(30);
    expect(transportPointsForRank({ sRankPoints: sPoints }, "A")).toBe(21);
    expect(transportPointsForRank({ sRankPoints: sPoints }, "B")).toBe(0);
  });

  it("excludes ships heavily damaged at landing and applies Kinu Kai Ni's innate bonus once", () => {
    expect(transportSPoints([
      { shipId: 1, masterId: 487, shipType: 3, hp: 8, maxHp: 30, equipmentMasterIds: [] },
      { shipId: 2, masterId: 487, shipType: 3, hp: 20, maxHp: 30, equipmentMasterIds: [] },
      { shipId: 3, masterId: 2, shipType: 2, hp: 7, maxHp: 28, equipmentMasterIds: [68] }
    ])).toBe(2 + 2 + 8);
  });
});
