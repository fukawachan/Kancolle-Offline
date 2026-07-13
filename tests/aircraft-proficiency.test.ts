import { describe, expect, it } from "vitest";
import { masterData } from "../src/master/data.js";
import {
  AIRCRAFT_PROFICIENCY_TRAINING_RULES,
  NO_UNVERIFIED_PROFICIENCY_LOSS,
  STATISTICAL_PROFICIENCY_LOSS_BASELINE,
  aircraftAirPowerBonus,
  aircraftProficiencyNonWipeLossPenalty,
  aircraftProficiencyTrainingGain,
  aircraftProficiencyTrainingRule,
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

  it("uses an explicit aircraft-type training table instead of a catch-all gain", () => {
    expect(aircraftProficiencyTrainingGain(slotMaster(20))).toBe(1);
    expect(aircraftProficiencyTrainingGain(slotMaster(16))).toBe(2);
    expect(aircraftProficiencyTrainingGain(slotMaster(269))).toBe(2);
    expect(aircraftProficiencyTrainingRule(slotMaster(20))?.evidence.level).toBe("published-table");
    expect(new Set(AIRCRAFT_PROFICIENCY_TRAINING_RULES.map((rule) => rule.typeId)).size)
      .toBe(AIRCRAFT_PROFICIENCY_TRAINING_RULES.length);
  });

  it("fails closed for unverified non-wipe loss and permits an injected statistical baseline", () => {
    expect(NO_UNVERIFIED_PROFICIENCY_LOSS).toMatchObject({
      enabled: false,
      evidence: { level: "missing", source: null }
    });
    expect(aircraftProficiencyNonWipeLossPenalty({
      previousCount: 18,
      currentCount: 9,
      profile: NO_UNVERIFIED_PROFICIENCY_LOSS
    })).toBe(0);
    expect(aircraftProficiencyNonWipeLossPenalty({
      previousCount: 18,
      currentCount: 9,
      profile: STATISTICAL_PROFICIENCY_LOSS_BASELINE,
      roll: 0.5
    })).toBe(10);
    expect(applyAircraftProficiencyBattleResult({
      master: slotMaster(20),
      previousExp: 100,
      previousCount: 18,
      currentCount: 9,
      mode: "sortie"
    })).toBe(101);
    expect(applyAircraftProficiencyBattleResult({
      master: slotMaster(20),
      previousExp: 100,
      previousCount: 18,
      currentCount: 9,
      mode: "sortie",
      nonWipeLossProfile: STATISTICAL_PROFICIENCY_LOSS_BASELINE,
      lossRoll: 0.5
    })).toBe(91);
  });
});
