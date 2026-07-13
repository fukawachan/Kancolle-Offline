import { describe, expect, it } from "vitest";
import {
  BattleRng,
  antiAirStage2Shootdown,
  aswAttackPower,
  airState,
  canOpeningAswByStats,
  carrierDayShellingPower,
  classifyNightAttack,
  combinedAccuracyModifierFor,
  combinedFormationModifierFor,
  combinedPowerBonusFor,
  accuracyChance,
  criticalChance,
  daytimeShellingOrder,
  damageStateModifierFor,
  engagementModifierFor,
  fighterPower,
  fleetAdjustedAntiAir,
  formationModifierFor,
  nightBattlePower,
  nightCutInActivationChance,
  ptImpAccuracyChance,
  ptImpShellingPower,
  resolveBattleDamage,
  selectContactAircraft,
  shipAdjustedAntiAir,
  softCap,
  stage1AircraftLoss,
  vanguardFormationRole
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

  it("classifies every exact air-state ratio boundary without float drift", () => {
    expect(airState(0, 0).code).toBe(3);
    expect(airState(1, 0).code).toBe(1);

    expect(airState(120, 40).code).toBe(1);
    expect(airState(119, 40).code).toBe(2);
    expect(airState(60, 40).code).toBe(2);
    expect(airState(59, 40).code).toBe(3);

    expect(airState(41, 60).code).toBe(3);
    expect(airState(40, 60).code).toBe(4);
    expect(airState(21, 60).code).toBe(4);
    expect(airState(20, 60).code).toBe(5);
  });

  it("uses the five public Stage 1 loss bands without forcing a one-plane loss", () => {
    expect(stage1AircraftLoss({
      slotCount: 18,
      airState: 1,
      side: "allied",
      firstRoll: 0
    })).toBe(0);
    expect(stage1AircraftLoss({
      slotCount: 18,
      airState: 1,
      side: "allied",
      firstRoll: 1
    })).toBe(1);
    expect(stage1AircraftLoss({
      slotCount: 18,
      airState: 5,
      side: "allied",
      firstRoll: 0
    })).toBe(4);
    expect(stage1AircraftLoss({
      slotCount: 18,
      airState: 5,
      side: "allied",
      firstRoll: 1
    })).toBe(10);
    expect(stage1AircraftLoss({
      slotCount: 18,
      airState: 1,
      side: "enemy",
      firstRoll: 0,
      secondRoll: 0
    })).toBe(0);
    expect(stage1AircraftLoss({
      slotCount: 18,
      airState: 1,
      side: "enemy",
      firstRoll: 1,
      secondRoll: 1
    })).toBe(18);
    expect(stage1AircraftLoss({
      slotCount: 3,
      airState: 1,
      side: "allied",
      firstRoll: 0.5
    })).toBe(0);
  });

  it("selects contact aircraft by accuracy priority and continues after a failed plane roll", () => {
    const candidates = [
      { id: 10, lineOfSight: 8, accuracy: 3, shipPosition: 2, slotIndex: 0, planeCount: 18 },
      { id: 11, lineOfSight: 9, accuracy: 2, shipPosition: 1, slotIndex: 0, planeCount: 18 }
    ];
    const rolls = [0, 0.99, 0];
    expect(selectContactAircraft(candidates, 1, () => rolls.shift() ?? 1)).toBe(11);
    let parityRolls = 0;
    expect(selectContactAircraft(candidates, 3, () => {
      parityRolls += 1;
      return 0;
    })).toBe(-1);
    expect(parityRolls).toBe(0);
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
    expect(nightBattlePower({
      firepower: 65,
      torpedo: 79,
      targetKind: "installation",
      installationModifier: 1.625
    })).toBeCloseTo(105.625, 6);
    expect(nightBattlePower({ firepower: 65, torpedo: 79, targetKind: "submarine" })).toBe(0);
    expect(nightBattlePower({ firepower: 65, torpedo: 79, targetKind: "pt" })).toBe(144);

    expect(antiAirStage2Shootdown({
      slotCount: 18,
      shipAdjustedAntiAir: 60,
      fleetAdjustedAntiAir: 0,
      cutInFixedBonus: 3,
      cutInModifier: 1.35,
      proportionalTriggered: true,
      fixedTriggered: true,
      alliedMinimumGuarantee: 1
    })).toBe(14);
  });

  it("resolves Stage 2 proportional and fixed shootdown as independent rolls", () => {
    const input = {
      slotCount: 18,
      shipAdjustedAntiAir: 60,
      fleetAdjustedAntiAir: 0,
      cutInFixedBonus: 3,
      cutInModifier: 1.35,
      alliedMinimumGuarantee: 1
    };
    expect(antiAirStage2Shootdown({ ...input, proportionalTriggered: true, fixedTriggered: true })).toBe(14);
    expect(antiAirStage2Shootdown({ ...input, proportionalTriggered: true, fixedTriggered: false })).toBe(6);
    expect(antiAirStage2Shootdown({ ...input, proportionalTriggered: false, fixedTriggered: true })).toBe(12);
    expect(antiAirStage2Shootdown({ ...input, proportionalTriggered: false, fixedTriggered: false })).toBe(4);
  });

  it("derives ship and fleet adjusted anti-air from equipment classes", () => {
    const equipment = [
      { masterId: 122, antiAir: 10, type2: 1, type3: 16, improvement: 0 },
      { masterId: 131, antiAir: 9, type2: 21, type3: 15, improvement: 0 },
      { masterId: 27, antiAir: 2, type2: 12, type3: 11, improvement: 0 }
    ];
    expect(shipAdjustedAntiAir(80, equipment, "allied")).toBe(180);
    expect(fleetAdjustedAntiAir([equipment], 1.6, "allied")).toBeCloseTo(13.8462, 4);
    expect(shipAdjustedAntiAir(80, equipment, "enemy")).toBe(120);
    expect(fleetAdjustedAntiAir([equipment], 1.6, "enemy")).toBe(18);
  });

  it("uses the public carrier daytime shelling formula for mixed aircraft stats", () => {
    expect(carrierDayShellingPower({
      firepower: 100,
      torpedo: 0,
      bombing: 0
    })).toBe(205);
    expect(carrierDayShellingPower({
      firepower: 80,
      torpedo: 12,
      bombing: 20
    })).toBe(232);
    expect(carrierDayShellingPower({
      firepower: 51,
      torpedo: 14,
      bombing: 11,
      combinedPowerBonus: 10,
      otherPowerBonus: 2
    })).toBe(191);
  });

  it("orders first-round shelling by range with random ties and round two by position", () => {
    const units = [
      { position: 1, range: 2 },
      { position: 2, range: 3 },
      { position: 3, range: 3 },
      { position: 4, range: 1 }
    ];
    const firstRoundOrders = new Set(
      Array.from({ length: 12 }, (_, seed) =>
        daytimeShellingOrder(units, new BattleRng(seed + 1), 1)
          .map((unit) => unit.position)
          .join(",")
      )
    );
    expect([...firstRoundOrders].every((order) => /^([23]),([23]),1,4$/.test(order))).toBe(true);
    expect(firstRoundOrders.size).toBe(2);
    expect(daytimeShellingOrder(units, new BattleRng(999), 2).map((unit) => unit.position)).toEqual([1, 2, 3, 4]);
  });

  it("splits Vanguard Formation roles correctly for four through seven ships", () => {
    expect([1, 2, 3, 4].map((position) => vanguardFormationRole({ fleetSize: 4, position })))
      .toEqual(["main", "main", "guard", "guard"]);
    expect([1, 2, 3, 4, 5].map((position) => vanguardFormationRole({ fleetSize: 5, position })))
      .toEqual(["main", "main", "guard", "guard", "guard"]);
    expect([1, 2, 3, 4, 5, 6].map((position) => vanguardFormationRole({ fleetSize: 6, position })))
      .toEqual(["main", "main", "main", "guard", "guard", "guard"]);
    expect([1, 2, 3, 4, 5, 6, 7].map((position) => vanguardFormationRole({ fleetSize: 7, position })))
      .toEqual(["main", "main", "main", "guard", "guard", "guard", "guard"]);
    expect(formationModifierFor(6, "shelling", { fleetSize: 4, position: 2 })).toBe(0.5);
    expect(formationModifierFor(6, "shelling", { fleetSize: 4, position: 3 })).toBe(1);
    expect(formationModifierFor(6, "asw", { fleetSize: 7, position: 3 })).toBe(1);
    expect(formationModifierFor(6, "asw", { fleetSize: 7, position: 4 })).toBe(0.6);
    expect(formationModifierFor(6, "night", { fleetSize: 6, position: 1 })).toBe(0.5);
    expect(formationModifierFor(6, "night", { fleetSize: 6, position: 6 })).toBe(1);
    expect(formationModifierFor(6, "antiAir", { fleetSize: 6, position: 1 })).toBe(1.1);
  });

  it("applies combined fleet formation and power correction tables", () => {
    expect(combinedFormationModifierFor(1, "shelling")).toBe(0.8);
    expect(combinedFormationModifierFor(2, "torpedo")).toBe(0.9);
    expect(combinedFormationModifierFor(3, "antiAir")).toBe(1.5);
    expect(combinedFormationModifierFor(4, "asw")).toBe(0.7);

    expect(combinedPowerBonusFor({
      combinedType: 1,
      attackerFleet: "main",
      attackerSide: 0,
      defenderCombined: false,
      phase: "shelling"
    })).toBe(2);
    expect(combinedPowerBonusFor({
      combinedType: 2,
      attackerFleet: "main",
      attackerSide: 0,
      defenderCombined: false,
      phase: "shelling"
    })).toBe(10);
    expect(combinedPowerBonusFor({
      combinedType: 3,
      attackerFleet: "main",
      attackerSide: 0,
      defenderCombined: true,
      phase: "shelling"
    })).toBe(-5);
    expect(combinedPowerBonusFor({
      combinedType: 1,
      attackerFleet: "escort",
      attackerSide: 0,
      defenderCombined: false,
      phase: "shelling"
    })).toBe(10);
    expect(combinedPowerBonusFor({
      combinedType: 2,
      attackerFleet: "escort",
      attackerSide: 0,
      defenderCombined: false,
      phase: "shelling"
    })).toBe(-5);
    expect(combinedPowerBonusFor({
      combinedType: 1,
      attackerFleet: "escort",
      attackerSide: 0,
      defenderCombined: true,
      phase: "torpedo"
    })).toBe(10);
  });

  it("exposes documented combined fleet accuracy approximations", () => {
    expect(combinedAccuracyModifierFor({
      combinedType: 1,
      attackerFleet: "escort",
      phase: "shelling",
      formation: 4,
      defenderCombined: false
    })).toBe(1.1);
    expect(combinedAccuracyModifierFor({
      combinedType: 2,
      attackerFleet: "main",
      phase: "shelling",
      formation: 4,
      defenderCombined: false
    })).toBeCloseTo(0.76, 5);
    expect(combinedAccuracyModifierFor({
      combinedType: 3,
      attackerFleet: "main",
      phase: "shelling",
      formation: 4,
      defenderCombined: false
    })).toBeCloseTo(0.65, 5);
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

  it("applies PT Imp post-cap damage and dedicated accuracy formulas", () => {
    expect(ptImpShellingPower(100, 1)).toBe(50);
    expect(ptImpShellingPower(100, 1.5 * 1.4 * 1.2 * 1.1)).toBeCloseTo(138.6, 6);
    const unprepared = ptImpAccuracyChance({
      attackerLevel: 80,
      attackerLuck: 20,
      attackerAccuracy: 0,
      targetEvasion: 40,
      equipmentModifier: 1,
      shipTypeModifier: 0.7,
      night: true
    });
    const prepared = ptImpAccuracyChance({
      attackerLevel: 80,
      attackerLuck: 20,
      attackerAccuracy: 0,
      targetEvasion: 40,
      equipmentModifier: 1.3 * 1.15 * 1.75 * 1.45,
      shipTypeModifier: 1,
      night: true
    });
    expect(unprepared).toBe(0.1);
    expect(prepared).toBeGreaterThan(0.7);
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
      spType: 3,
      hits: 2,
      modifier: 1.5
    });
    expect(classifyNightAttack({ mainGuns: 1, secondaryGuns: 0, torpedoes: 1, nightAircraft: 0 })).toEqual({
      spType: 2,
      hits: 2,
      modifier: 1.3
    });
    expect(classifyNightAttack({ mainGuns: 2, secondaryGuns: 0, torpedoes: 0, nightAircraft: 0 })).toEqual({
      spType: 1,
      hits: 2,
      modifier: 1.2
    });
    expect(classifyNightAttack({ mainGuns: 2, secondaryGuns: 1, torpedoes: 0, nightAircraft: 0 })).toEqual({
      spType: 4,
      hits: 1,
      modifier: 1.75
    });
    expect(classifyNightAttack({ mainGuns: 3, secondaryGuns: 0, torpedoes: 0, nightAircraft: 0 })).toEqual({
      spType: 5,
      hits: 1,
      modifier: 2
    });
    expect(classifyNightAttack({ mainGuns: 1, secondaryGuns: 0, torpedoes: 0, nightAircraft: 0 })).toEqual({
      spType: 0,
      hits: 1,
      modifier: 1
    });
  });

  it("calculates carrier night air attack power from base firepower and night aircraft", async () => {
    const formulas = await import("../src/kcsapi/battle-formulas.js") as any;

    expect(formulas.carrierNightAirAttackPower({
      baseFirepower: 65,
      nightContactBonus: 5,
      aircraft: [
        { count: 18, firepower: 0, torpedo: 0, bombing: 0, asw: 4, improvement: 0, modifierKind: "night" },
        { count: 20, firepower: 2, torpedo: 9, bombing: 0, asw: 8, improvement: 0, modifierKind: "night" }
      ]
    })).toBeCloseTo(240.8735, 4);

    expect(formulas.carrierNightAirAttackPower({
      baseFirepower: 65,
      aircraft: [
        { count: 18, firepower: 4, torpedo: 8, bombing: 0, asw: 10, improvement: 4, modifierKind: "special" }
      ]
    })).toBeCloseTo(107.0014, 4);
  });

  it("classifies carrier night cut-ins by night aircraft mix", async () => {
    const formulas = await import("../src/kcsapi/battle-formulas.js") as any;

    expect(formulas.classifyCarrierNightCutIn({
      nightFighters: 2,
      nightTorpedoBombers: 1,
      nightDiveBombers: 0,
      otherNightAircraft: 0
    })).toMatchObject({ spType: 6, hits: 1, modifier: 1.25 });
    expect(formulas.carrierNightCutInCandidates({
      nightFighters: 2,
      nightTorpedoBombers: 1,
      nightDiveBombers: 0,
      otherNightAircraft: 0
    }).map((candidate: { modifier: number }) => candidate.modifier)).toEqual([1.25, 1.2]);
    expect(formulas.classifyCarrierNightCutIn({
      nightFighters: 1,
      nightTorpedoBombers: 1,
      nightDiveBombers: 0,
      otherNightAircraft: 0
    })).toMatchObject({ spType: 6, hits: 1, modifier: 1.2 });
    expect(formulas.classifyCarrierNightCutIn({
      nightFighters: 0,
      nightTorpedoBombers: 0,
      nightDiveBombers: 1,
      otherNightAircraft: 2
    })).toMatchObject({ spType: 6, hits: 1, modifier: 1.2 });
    expect(formulas.classifyCarrierNightCutIn({
      nightFighters: 1,
      nightTorpedoBombers: 0,
      nightDiveBombers: 0,
      otherNightAircraft: 3
    })).toMatchObject({ spType: 6, hits: 1, modifier: 1.18 });
    expect(formulas.classifyCarrierNightCutIn({
      nightFighters: 1,
      nightTorpedoBombers: 0,
      nightDiveBombers: 0,
      otherNightAircraft: 0
    })).toBeNull();
  });

  it("calculates night cut-in activation chances from luck and battle state", () => {
    expect(nightCutInActivationChance({
      level: 99,
      luck: 0,
      flagship: true,
      damageState: 0,
      cutInKind: 5
    })).toBeCloseTo(37 / 140, 6);
    expect(nightCutInActivationChance({
      level: 99,
      luck: 40,
      flagship: true,
      damageState: 2,
      cutInKind: 5,
      searchlight: true,
      starShell: true
    })).toBeCloseTo(106 / 140, 6);
    expect(nightCutInActivationChance({
      level: 188,
      luck: 60,
      flagship: false,
      damageState: 0,
      cutInKind: 4,
      skilledLookout: true,
      torpedoSquadronLookout: true
    })).toBeCloseTo(91 / 130, 6);
  });
});
