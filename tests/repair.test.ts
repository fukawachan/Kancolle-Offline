import { describe, expect, it } from "vitest";
import { masterData } from "../src/master/data.js";
import { repairCost, repairTimeMs } from "../src/kcsapi/repair.js";
import type { Ship } from "../src/state/types.js";

describe("repair calculations", () => {
  it("computes fuel, steel, and dock time from lost HP and ship master data", () => {
    const fubukiMaster = masterData.api_mst_ship.find((ship) => ship.api_id === 9)!;
    const damagedFubuki = damagedShip(1, 15, 10);

    expect(repairCost(damagedFubuki, fubukiMaster)).toEqual({
      lostHp: 5,
      fuel: 2,
      steel: 4
    });
    expect(repairTimeMs(damagedFubuki, fubukiMaster)).toBe(80_000);
  });

  it("uses the level 12 square-root repair-time curve at every boundary", () => {
    const destroyer = masterData.api_mst_ship.find((ship) => ship.api_stype === 2)!;

    expect(repairTimeMs(damagedShip(11), destroyer)).toBe(140_000);
    expect(repairTimeMs(damagedShip(12), destroyer)).toBe(150_000);
    expect(repairTimeMs(damagedShip(50), destroyer)).toBe(390_000);
    expect(repairTimeMs(damagedShip(99), destroyer)).toBe(665_000);
    expect(repairTimeMs(damagedShip(188), destroyer)).toBe(1_150_000);
  });

  it("applies ship-type multipliers after the level curve", () => {
    const damaged = damagedShip(50, 4, 1);
    const halfTime = masterData.api_mst_ship.find((ship) => ship.api_stype === 1)!;
    const normalTime = masterData.api_mst_ship.find((ship) => ship.api_stype === 2)!;
    const oneAndHalfTime = masterData.api_mst_ship.find((ship) => ship.api_stype === 7)!;
    const doubleTime = masterData.api_mst_ship.find((ship) => ship.api_stype === 9)!;

    expect(repairTimeMs(damaged, halfTime)).toBe(570_000);
    expect(repairTimeMs(damaged, normalTime)).toBe(1_110_000);
    expect(repairTimeMs(damaged, oneAndHalfTime)).toBe(1_650_000);
    expect(repairTimeMs(damaged, doubleTime)).toBe(2_190_000);
  });
});

function damagedShip(level: number, maxHp = 2, hp = 1): Ship {
  return {
    id: 1,
    masterId: 9,
    level,
    exp: 0,
    hp,
    maxHp,
    condition: 49,
    fuel: 15,
    maxFuel: 15,
    ammo: 20,
    maxAmmo: 20,
    locked: 0,
    sallyArea: 0,
    slotIds: [-1, -1, -1, -1, -1],
    onSlot: [0, 0, 0, 0, 0],
    exSlotId: -1,
    stats: {},
    marriedAt: 0,
    marriageHpBonus: 0,
    marriageLuckBonus: 0
  };
}
