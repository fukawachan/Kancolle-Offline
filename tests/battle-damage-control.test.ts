import { describe, expect, it } from "vitest";
import {
  REPAIR_GODDESS_MASTER_ID,
  REPAIR_PERSONNEL_MASTER_ID,
  resolveDamageControlActivation
} from "../src/kcsapi/battle/damage-control.js";

describe("battle damage-control activation", () => {
  it("restores personnel users to 20%, or 50% for a flagship", () => {
    const equipment = [{ index: 5, slotItemId: 501, slotMasterId: REPAIR_PERSONNEL_MASTER_ID }];

    expect(resolveDamageControlActivation({ shipId: 1, maxHp: 31, flagship: false, equipment })).toMatchObject({
      slotItemId: 501,
      restoredHp: 6,
      restoreFuelAmmo: false
    });
    expect(resolveDamageControlActivation({ shipId: 1, maxHp: 31, flagship: true, equipment })).toMatchObject({
      restoredHp: 15,
      restoreFuelAmmo: false
    });
  });

  it("fully restores a Goddess user and marks supply restoration", () => {
    expect(resolveDamageControlActivation({
      shipId: 7,
      maxHp: 97,
      flagship: false,
      equipment: [{ index: 2, slotItemId: 702, slotMasterId: REPAIR_GODDESS_MASTER_ID }]
    })).toEqual({
      shipId: 7,
      slotItemId: 702,
      slotMasterId: REPAIR_GODDESS_MASTER_ID,
      restoredHp: 97,
      restoreFuelAmmo: true
    });
  });

  it("consumes the first eligible equipped item in slot order", () => {
    expect(resolveDamageControlActivation({
      shipId: 3,
      maxHp: 50,
      flagship: false,
      equipment: [
        { index: 5, slotItemId: 305, slotMasterId: REPAIR_GODDESS_MASTER_ID },
        { index: 1, slotItemId: 301, slotMasterId: REPAIR_PERSONNEL_MASTER_ID }
      ]
    })?.slotItemId).toBe(301);
  });

  it("does nothing without an equipped damage-control item", () => {
    expect(resolveDamageControlActivation({
      shipId: 1,
      maxHp: 30,
      flagship: false,
      equipment: [{ index: 0, slotItemId: 1, slotMasterId: 2 }]
    })).toBeNull();
  });
});
