import { describe, expect, it } from "vitest";
import {
  battleCapabilityManifest,
  isJetEquipmentType,
  requireBattleCapability
} from "../src/kcsapi/battle/capabilities.js";

describe("advanced battle evidence boundary", () => {
  it("classifies every audited advanced mechanic with evidence and a disposition", () => {
    const manifest = battleCapabilityManifest();
    expect(Object.keys(manifest).sort()).toEqual([
      "aircraftProficiency",
      "barrageBalloon",
      "fitGun",
      "friendlyFleet",
      "jetAssault",
      "landAttackSpecialModifier",
      "landBaseRange",
      "landBaseWaves",
      "shipSpecialAttack",
      "smokeScreen",
      "supportAccuracy",
      "supportAttackTypes"
    ]);
    expect(Object.values(manifest).every((entry) => entry.note.length > 0)).toBe(true);
    expect(manifest.landBaseWaves.state).toBe("enabled");
    expect(manifest.supportAttackTypes.state).toBe("enabled");
    expect(manifest.aircraftProficiency.state).toBe("enabled");
    expect(manifest.shipSpecialAttack.state).toBe("enabled");
  });

  it("fails closed for mechanics without enough evidence", () => {
    for (const capability of [
      "jetAssault",
      "friendlyFleet",
      "smokeScreen",
      "barrageBalloon",
      "fitGun"
    ] as const) {
      expect(() => requireBattleCapability(capability)).toThrow(
        new RegExp(`Battle capability ${capability} is disabled`)
      );
    }
    expect(isJetEquipmentType(56)).toBe(true);
    expect(isJetEquipmentType(6)).toBe(false);
  });
});
