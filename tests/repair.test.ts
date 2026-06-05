import { describe, expect, it } from "vitest";
import { masterData } from "../src/master/data.js";
import { repairCost, repairTimeMs } from "../src/kcsapi/repair.js";
import type { Ship } from "../src/state/types.js";

describe("repair calculations", () => {
  it("computes fuel, steel, and dock time from lost HP and ship master data", () => {
    const fubukiMaster = masterData.api_mst_ship.find((ship) => ship.api_id === 9)!;
    const damagedFubuki: Ship = {
      id: 1,
      masterId: 9,
      level: 1,
      exp: 0,
      hp: 10,
      maxHp: 15,
      condition: 49,
      fuel: 15,
      maxFuel: 15,
      ammo: 20,
      maxAmmo: 20,
      locked: 0,
      slotIds: [-1, -1, -1, -1, -1],
      exSlotId: -1,
      stats: {}
    };

    expect(repairCost(damagedFubuki, fubukiMaster)).toEqual({
      lostHp: 5,
      fuel: 2,
      steel: 4
    });
    expect(repairTimeMs(damagedFubuki, fubukiMaster)).toBe(80_000);
  });
});
