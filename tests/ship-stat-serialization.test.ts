import { describe, expect, it } from "vitest";
import { toShip } from "../src/kcsapi/serializers.js";
import type { Ship, SlotItem } from "../src/state/types.js";

describe("ship growing-stat serialization", () => {
  it.each([
    [1, [40, 89], [20, 49], [5, 19]],
    [50, [64, 89], [34, 49], [12, 19]],
    [99, [89, 89], [49, 49], [19, 19]],
    [188, [133, 89], [75, 49], [31, 19]]
  ])("serializes Fubuki master bounds at level %i", (level, evasion, asw, los) => {
    const serialized = toShip(ship({ level }));

    expect(serialized.api_kaihi).toEqual(evasion);
    expect(serialized.api_taisen).toEqual(asw);
    expect(serialized.api_sakuteki).toEqual(los);
  });

  it("adds equipment and ASW modernization after resolving the innate growth value", () => {
    const turbine = slotItem(101, 33);
    const radar = slotItem(102, 88);
    const serialized = toShip(ship({
      level: 50,
      slotIds: [turbine.id, radar.id, -1, -1, -1],
      stats: { api_kyouka: [0, 0, 0, 0, 0, 0, 3] }
    }), [turbine, radar]);

    expect(serialized.api_kaihi).toEqual([70, 95]);
    expect(serialized.api_taisen).toEqual([39, 54]);
    expect(serialized.api_sakuteki).toEqual([17, 24]);
  });
});

function ship(overrides: Partial<Ship> = {}): Ship {
  return {
    id: 1,
    masterId: 9,
    level: 1,
    exp: 0,
    hp: 15,
    maxHp: 15,
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
    marriageLuckBonus: 0,
    ...overrides
  };
}

function slotItem(id: number, masterId: number): SlotItem {
  return { id, masterId, level: 0, proficiency: 0, proficiencyExp: 0, locked: 0 };
}
