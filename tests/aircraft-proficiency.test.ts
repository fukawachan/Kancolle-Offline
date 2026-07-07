import { describe, expect, it } from "vitest";
import { masterData } from "../src/master/data.js";
import {
  aircraftAirPowerBonus,
  applyAircraftProficiencyBattleResult,
  initialAircraftProficiencyExp,
  proficiencyExpForVisible,
  visibleProficiency
} from "../src/kcsapi/aircraft-proficiency.js";

function slotMaster(masterId: number) {
  const master = masterData.api_mst_slotitem.find((item) => item.api_id === masterId);
  if (!master) throw new Error(`missing slot master ${masterId}`);
  return master;
}

describe("aircraft proficiency rules", () => {
  it("maps internal proficiency exp to the official visible ranks", () => {
    expect([0, 9, 10, 24, 25, 39, 40, 54, 55, 69, 70, 84, 85, 99, 100, 120, 121]
      .map(visibleProficiency))
      .toEqual([0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 7]);
    expect(proficiencyExpForVisible(7)).toBe(100);
    expect(proficiencyExpForVisible(99)).toBe(100);
  });

  it("computes deterministic air power bonus from internal exp and aircraft type", () => {
    expect(aircraftAirPowerBonus(slotMaster(20), 0)).toBe(0);
    expect(aircraftAirPowerBonus(slotMaster(20), 100)).toBe(Math.sqrt(10) + 22);
    expect(aircraftAirPowerBonus(slotMaster(26), 100)).toBe(Math.sqrt(10) + 6);
    expect(aircraftAirPowerBonus(slotMaster(16), 100)).toBe(Math.sqrt(10));
  });

  it("initializes skilled named aircraft with visible proficiency while ordinary planes start empty", () => {
    expect(initialAircraftProficiencyExp(slotMaster(20))).toBe(0);
    expect(visibleProficiency(initialAircraftProficiencyExp(slotMaster(96)))).toBe(7);
    expect(visibleProficiency(initialAircraftProficiencyExp(slotMaster(570)))).toBe(7);
  });

  it("updates proficiency after sortie battles and clears wiped-out squadrons", () => {
    expect(applyAircraftProficiencyBattleResult({
      master: slotMaster(20),
      previousExp: 0,
      previousCount: 18,
      currentCount: 18,
      mode: "sortie"
    })).toBeGreaterThan(0);
    expect(applyAircraftProficiencyBattleResult({
      master: slotMaster(20),
      previousExp: 100,
      previousCount: 18,
      currentCount: 0,
      mode: "sortie"
    })).toBe(0);
    expect(applyAircraftProficiencyBattleResult({
      master: slotMaster(20),
      previousExp: 0,
      previousCount: 18,
      currentCount: 18,
      mode: "practice"
    })).toBe(0);
  });
});
