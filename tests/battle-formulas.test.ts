import { describe, expect, it } from "vitest";
import {
  antiAirStage2Shootdown,
  aswAttackPower,
  airState,
  canOpeningAswByStats,
  classifyNightAttack,
  accuracyChance,
  criticalChance,
  damageStateModifierFor,
  engagementModifierFor,
  fighterPower,
  formationModifierFor,
  nightBattlePower,
  nightCutInActivationChance,
  resolveBattleDamage,
  softCap
} from "../src/kcsapi/battle-formulas.js";
import { masterData } from "../src/master/data.js";

function slotMaster(masterId: number) {
  const master = masterData.api_mst_slotitem.find((item) => item.api_id === masterId);
  if (!master) throw new Error(`missing slot master ${masterId}`);
  return master;
}

describe("battle formula helpers", () => {
  it("calculates fighter power and air state from current plane counts", () => {
    expect(fighterPower([{ planeCount: 20, antiAir: 5, proficiency: 0, improvement: 0 }])).toBe(22);
    expect(fighterPower([{ planeCount: 20, antiAir: 5, proficiency: 100, improvement: 0, slotMaster: slotMaster(20) }])).toBe(47);

    expect(airState(150, 40)).toMatchObject({ code: 1, label: "supremacy" });
    expect(airState(60, 40)).toMatchObject({ code: 2, label: "superiority" });
    expect(airState(40, 40)).toMatchObject({ code: 3, label: "parity" });
    expect(airState(20, 40)).toMatchObject({ code: 4, label: "denial" });
    expect(airState(10, 40)).toMatchObject({ code: 5, label: "incapability" });
  });

  it("applies modern soft caps and armor rolls in the shared damage pipeline", () => {
    expect(softCap(260, 220)).toBeCloseTo(226.3246, 4);

    expect(resolveBattleDamage({
      preCapPower: 260,
      cap: 220,
      armor: 80,
      armorRoll: 10,
      ammoModifier: 1,
      critical: false,
      postCapModifier: 1,
      targetHp: 999,
      targetSide: 1
    })).toBe(164);
  });

  it("exposes reusable formation, damage state, anti-air, and night power helpers", () => {
    expect(formationModifierFor(1, "shelling")).toBe(1);
    expect(formationModifierFor(2, "shelling")).toBe(0.8);
    expect(formationModifierFor(3, "antiAir")).toBe(1.6);
    expect(formationModifierFor(4, "night")).toBe(1);

    expect(engagementModifierFor(1)).toBe(1);
    expect(engagementModifierFor(2)).toBe(0.8);
    expect(engagementModifierFor(3)).toBe(1.2);
    expect(engagementModifierFor(4)).toBe(0.6);

    expect(damageStateModifierFor(76, 100)).toBe(1);
    expect(damageStateModifierFor(50, 100)).toBe(0.7);
    expect(damageStateModifierFor(25, 100)).toBe(0.4);

    expect(nightBattlePower({ firepower: 65, torpedo: 79 })).toBe(144);
    expect(nightBattlePower({ firepower: 65, torpedo: 79, damageModifier: 0.7 })).toBeCloseTo(100.8, 5);

    expect(antiAirStage2Shootdown({
      slotCount: 18,
      defenderAntiAir: 60,
      fleetAntiAir: 120,
      formationModifier: 1.6,
      cutInFixedBonus: 3,
      cutInModifier: 1.35,
      randomFactor: 0.5
    })).toBe(7);
  });

  it("calculates bounded hit and critical chances from combat stats", () => {
    expect(accuracyChance({
      attackerLevel: 80,
      attackerLuck: 20,
      attackerAccuracy: 12,
      targetEvasion: 55,
      formationModifier: 1,
      engagementModifier: 1,
      attackAccuracyModifier: 1
    })).toBeCloseTo(0.738, 3);

    expect(accuracyChance({
      attackerLevel: 1,
      attackerLuck: 1,
      attackerAccuracy: -20,
      targetEvasion: 180,
      formationModifier: 0.6,
      engagementModifier: 0.6,
      attackAccuracyModifier: 0.6
    })).toBe(0.1);

    expect(criticalChance({
      attackerLuck: 30,
      attackerAccuracy: 8,
      targetEvasion: 40,
      proficiencyCriticalBonus: 0.04,
      cutInModifier: 1.25
    })).toBeCloseTo(0.2025, 4);
  });

  it("calculates opening ASW eligibility and attack power", () => {
    expect(canOpeningAswByStats({
      shipType: 2,
      level: 99,
      displayedAsw: 100,
      hasSonar: true,
      hasDepthCharge: false,
      hasAutogyro: false
    })).toBe(true);
    expect(canOpeningAswByStats({
      shipType: 2,
      level: 1,
      displayedAsw: 20,
      hasSonar: true,
      hasDepthCharge: false,
      hasAutogyro: false
    })).toBe(false);
    expect(canOpeningAswByStats({
      shipType: 1,
      level: 1,
      displayedAsw: 60,
      hasSonar: true,
      hasDepthCharge: false,
      hasAutogyro: false
    })).toBe(true);
    expect(aswAttackPower({ baseAsw: 70, equipmentAsw: 10, sonarCount: 1, depthChargeCount: 1 })).toBeCloseTo(51.4432, 4);
  });

  it("classifies generic night battle attacks by equipment mix", () => {
    expect(classifyNightAttack({ mainGuns: 0, secondaryGuns: 0, torpedoes: 2, nightAircraft: 0 })).toEqual({
      spType: 5,
      hits: 2,
      modifier: 1.5
    });
    expect(classifyNightAttack({ mainGuns: 1, secondaryGuns: 0, torpedoes: 1, nightAircraft: 0 })).toEqual({
      spType: 4,
      hits: 2,
      modifier: 1.3
    });
    expect(classifyNightAttack({ mainGuns: 2, secondaryGuns: 0, torpedoes: 0, nightAircraft: 0 })).toEqual({
      spType: 1,
      hits: 2,
      modifier: 1.2
    });
    expect(classifyNightAttack({ mainGuns: 1, secondaryGuns: 0, torpedoes: 0, nightAircraft: 0 })).toEqual({
      spType: 0,
      hits: 1,
      modifier: 1
    });
  });

  it("calculates night cut-in activation chances from luck and battle state", () => {
    expect(nightCutInActivationChance({
      luck: 0,
      flagship: true,
      damageState: 0,
      cutInKind: 5
    })).toBe(0);
    expect(nightCutInActivationChance({
      luck: 40,
      flagship: true,
      damageState: 2,
      cutInKind: 5,
      searchlight: true,
      starShell: true
    })).toBeCloseTo(0.78, 2);
  });
});
