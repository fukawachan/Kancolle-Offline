import { describe, expect, it } from "vitest";
import {
  effectiveShipSpeedValue,
  SHIP_SPEED_RULESET,
  shipSpeedGroup,
  type ShipSpeedEquipment
} from "../src/master/ship-speed.js";

const TURBINE = { masterId: 33 };
const ENHANCED = { masterId: 34 };
const NEW_MODEL = { masterId: 87 };
const IMPROVED_NEW_MODEL = { masterId: 87, improvement: 7 };

describe("versioned latent ship-speed groups", () => {
  it("pins the mechanics snapshot to a permanent source revision", () => {
    expect(SHIP_SPEED_RULESET).toEqual({
      id: "kancolle-ship-speed-2026-04-26",
      revision: 206264,
      effectiveDate: "2026-04-26",
      source: expect.stringContaining("oldid=206264")
    });
  });

  it("classifies remodel-specific exceptions before class defaults", () => {
    expect(shipSpeedGroup(10, 37, { masterId: 911, shipType: 8 })).toBe("fastB1");
    expect(shipSpeedGroup(5, 37, { masterId: 916, shipType: 10 })).toBe("slowA");
    expect(shipSpeedGroup(10, 25, { masterId: 1031, shipType: 11 })).toBe("fastA");
    expect(shipSpeedGroup(10, 25, { masterId: 196, shipType: 11 })).toBe("fastB1");
    expect(shipSpeedGroup(10, 9, { masterId: 507, shipType: 16 })).toBe("fastA");
    expect(shipSpeedGroup(10, 3, { masterId: 698, shipType: 11 })).toBe("fastC");
  });

  it("does not collapse Fast A and Fast B2 into one boiler ladder", () => {
    const equipment = [TURBINE, ENHANCED, ENHANCED];

    expect(speed(50, 2, 22, 10, equipment)).toBe(20); // Shimakaze: Fast A
    expect(speed(9, 2, 12, 10, equipment)).toBe(15); // Fubuki: Fast B2
  });

  it("keeps the Fast B1, Fast B2 and Fast C upper boundaries distinct", () => {
    expect(speed(181, 2, 30, 10, [TURBINE, NEW_MODEL, ENHANCED])).toBe(20);
    expect(speed(9, 2, 12, 10, [TURBINE, NEW_MODEL, ENHANCED])).toBe(15);

    expect(speed(9, 2, 12, 10, [TURBINE, ENHANCED, ENHANCED, ENHANCED])).toBe(20);
    expect(speed(84, 11, 3, 10, [TURBINE, ENHANCED, ENHANCED, ENHANCED])).toBe(15);
  });

  it("applies the improved +13 boiler fit bonus only to the documented groups", () => {
    expect(speed(50, 2, 22, 10, [{ masterId: 87, improvement: 6 }])).toBe(10);
    expect(speed(50, 2, 22, 10, [IMPROVED_NEW_MODEL])).toBe(15);
    expect(speed(50, 2, 22, 10, [IMPROVED_NEW_MODEL, IMPROVED_NEW_MODEL])).toBe(20);
    expect(speed(9, 2, 12, 10, [IMPROVED_NEW_MODEL])).toBe(10);

    expect(speed(131, 9, 37, 5, [TURBINE, { masterId: 87, improvement: 6 }])).toBe(10);
    expect(speed(131, 9, 37, 5, [TURBINE, IMPROVED_NEW_MODEL])).toBe(15);
    expect(speed(80, 9, 19, 5, [TURBINE, IMPROVED_NEW_MODEL])).toBe(10);
  });

  it("models boiler-only and turbine-only remodel exceptions", () => {
    expect(speed(894, 7, 27, 5, [NEW_MODEL])).toBe(10); // Houshou Kai Ni
    expect(speed(894, 7, 27, 5, [NEW_MODEL, NEW_MODEL])).toBe(10); // not self-stackable
    expect(speed(881, 13, 109, 5, [NEW_MODEL])).toBe(10); // I-201
    expect(speed(881, 13, 109, 5, [TURBINE, NEW_MODEL])).toBe(15);
    expect(speed(979, 1, 117, 5, [NEW_MODEL])).toBe(10); // Inagi Kai Ni
    expect(speed(979, 1, 117, 5, [TURBINE, NEW_MODEL])).toBe(15);
    expect(speed(979, 1, 117, 5, [TURBINE, NEW_MODEL, NEW_MODEL, ENHANCED])).toBe(15);
    expect(speed(561, 2, 87, 5, [TURBINE])).toBe(10); // Samuel B. Roberts
    expect(speed(623, 3, 34, 5, [TURBINE])).toBe(10); // Yuubari Kai Ni Toku
  });

  it("keeps the slow A, B, and C multi-boiler ceilings distinct", () => {
    const engines = [TURBINE, NEW_MODEL, ENHANCED, ENHANCED];

    expect(speed(131, 9, 37, 5, engines)).toBe(20); // Yamato: Slow A
    expect(speed(80, 9, 19, 5, engines)).toBe(15); // Nagato: Slow B
    expect(speed(126, 13, 31, 5, engines)).toBe(10); // I-168: Slow C
  });

  it("keeps ordinary coastal-defense ships unmodified", () => {
    expect(shipSpeedGroup(5, 117, { masterId: 922, shipType: 1 })).toBe("none");
    expect(speed(922, 1, 117, 5, [TURBINE, NEW_MODEL, ENHANCED])).toBe(5);
  });
});

function speed(
  masterId: number,
  shipType: number,
  classId: number,
  baseSpeed: number,
  equipment: ShipSpeedEquipment[]
) {
  return effectiveShipSpeedValue(baseSpeed, classId, equipment, { masterId, shipType });
}
