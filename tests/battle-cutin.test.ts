import { describe, expect, it } from "vitest";
import {
  dayCutInCandidates,
  destroyerNightCutInCandidates,
  nightZuiunCutInCandidates,
  shellingProtocolSpec,
  submarineNightCutInCandidates
} from "../src/kcsapi/battle.js";
import { masterData } from "../src/master/data.js";
import type { AirSlot, BattleUnit, EquippedSlot } from "../src/kcsapi/battle/types.js";

function equipment(id: number, type2: number, options: { detail?: number; los?: number; count?: number } = {}): EquippedSlot {
  const slotMaster = {
    ...masterData.api_mst_slotitem[0],
    api_id: id,
    api_type: [0, 0, type2, options.detail ?? type2, 0],
    api_saku: options.los ?? 0
  };
  return {
    index: id,
    slotItemId: id,
    slotMaster,
    count: options.count ?? 0,
    maxCount: options.count ?? 0,
    improvement: 0,
    proficiency: 0
  };
}

function aircraft(slot: EquippedSlot): AirSlot {
  return {
    shipPosition: 1,
    slotIndex: slot.index,
    slotItemId: slot.slotItemId,
    slotMasterId: slot.slotMaster.api_id,
    equipTypeId: Number(slot.slotMaster.api_type?.[2]) || 0,
    slotMaster: slot.slotMaster,
    count: slot.count,
    maxCount: slot.maxCount,
    improvement: 0,
    proficiency: 0
  };
}

function unit(masterId: number, shipType: number, equippedSlots: EquippedSlot[], airSlots: AirSlot[] = []): BattleUnit {
  return {
    side: 0, position: 1, apiIndex: 0, shipId: masterId, masterId, level: 99,
    hp: 100, startingHp: 100, hpFloor: 0, maxHp: 100,
    baseFirepower: 80, firepower: 80, baseTorpedo: 60, torpedo: 60,
    aa: 50, baseAsw: 0, asw: 0, armor: 60, luck: 30, accuracy: 20,
    evasion: 20, range: 2, ammoModifier: 1, shipType, targetKind: "surface",
    slots: equippedSlots.map((slot) => slot.slotMaster.api_id), equippedSlots, airSlots,
    onSlot: [0, 0, 0, 0, 0], originalOnSlot: [0, 0, 0, 0, 0], damageDealt: 0
  };
}

describe("day and night equipment cut-in candidate tables", () => {
  it("orders ordinary day observation types 6, 5, 4, 3 and 2 with client-complete snapshots", () => {
    const mainA = equipment(1, 1);
    const mainB = equipment(2, 2);
    const secondary = equipment(3, 4);
    const ap = equipment(4, 19);
    const radar = equipment(5, 13);
    const recon = equipment(6, 10, { count: 4 });
    const attacker = unit(80, 9, [mainA, mainB, secondary, ap, radar, recon], [aircraft(recon)]);
    const candidates = dayCutInCandidates(attacker, true, false, [attacker]);

    expect(candidates.map((candidate) => candidate.atType)).toEqual([6, 5, 4, 3, 2]);
    expect(candidates.map((candidate) => candidate.hits)).toEqual([1, 1, 1, 1, 2]);
    expect(candidates.map((candidate) => candidate.slotIds)).toEqual([
      [6, 1, 2], [6, 4, 1], [6, 5, 1], [6, 1, 3], [1, 2]
    ]);
  });

  it("encodes the Nachi main-radar observation snapshot in cached-client order", () => {
    const mainA = equipment(90, 1);
    const mainB = equipment(90, 1);
    const recon = equipment(25, 10, { count: 4 });
    const radar = equipment(240, 13);
    const attacker = unit(192, 5, [mainA, mainB, recon, radar], [aircraft(recon)]);
    const candidate = dayCutInCandidates(attacker, true, false, [attacker])
      .find((entry) => entry.atType === 4);
    expect(candidate?.slotIds).toEqual([25, 240, 90]);
  });

  it("requires a surviving recon slot and a non-damaged observation attacker", () => {
    const mainA = equipment(1, 1);
    const mainB = equipment(2, 2);
    const wipedRecon = equipment(6, 10, { count: 0 });
    const attacker = unit(80, 9, [mainA, mainB, wipedRecon], [aircraft(wipedRecon)]);
    expect(dayCutInCandidates(attacker, true, false, [attacker])).toEqual([]);
    wipedRecon.count = 4;
    attacker.airSlots = [aircraft(wipedRecon)];
    attacker.hp = 50;
    expect(dayCutInCandidates(attacker, true, false, [attacker])).toEqual([]);
  });

  it("generates carrier FBA, BBA and BA type 7 with three animation items", () => {
    const fighter = equipment(20, 6, { count: 18 });
    const diveA = equipment(21, 7, { count: 18 });
    const diveB = equipment(22, 7, { count: 18 });
    const torpedo = equipment(23, 8, { count: 18 });
    const attacker = unit(277, 11, [fighter, diveA, diveB, torpedo], [fighter, diveA, diveB, torpedo].map(aircraft));
    const candidates = dayCutInCandidates(attacker, true, true, [attacker]);
    expect(candidates.map((candidate) => [candidate.atType, candidate.modifier])).toEqual([
      [7, 1.25], [7, 1.2], [7, 1.15]
    ]);
    expect(candidates.map((candidate) => candidate.slotIds)).toEqual([
      [20, 21, 23], [21, 22, 23], [21, 21, 23]
    ]);
  });

  it("declares every cached ordinary cut-in slot and hit contract", () => {
    expect([2, 3, 4, 5, 6, 7, 200, 201].map((type) => shellingProtocolSpec("day", type))).toEqual([
      expect.objectContaining({ animation: "double", requiredSlotIds: 2, hitCounts: [2] }),
      ...Array(4).fill(expect.objectContaining({ animation: "spotting", requiredSlotIds: 3, hitCounts: [1] })),
      expect.objectContaining({ animation: "carrier", requiredSlotIds: 3, hitCounts: [1] }),
      ...Array(2).fill(expect.objectContaining({ animation: "zuiun", requiredSlotIds: 3, hitCounts: [1] }))
    ]);
    expect([1, 2, 3, 4, 5, 6, 7, 10, 11, 14, 200].map((type) => shellingProtocolSpec("night", type))).toEqual([
      expect.objectContaining({ requiredSlotIds: 2, hitCounts: [2] }),
      expect.objectContaining({ requiredSlotIds: 2, hitCounts: [2] }),
      expect.objectContaining({ requiredSlotIds: 2, hitCounts: [2] }),
      expect.objectContaining({ requiredSlotIds: 3, hitCounts: [1] }),
      expect.objectContaining({ requiredSlotIds: 3, hitCounts: [1] }),
      expect.objectContaining({ animation: "carrier", requiredSlotIds: 3, hitCounts: [1] }),
      expect.objectContaining({ requiredSlotIds: 3, hitCounts: [1] }),
      expect.objectContaining({ requiredSlotIds: 3, hitCounts: [1] }),
      expect.objectContaining({ requiredSlotIds: 3, hitCounts: [2] }),
      expect.objectContaining({ requiredSlotIds: 3, hitCounts: [2] }),
      expect.objectContaining({ animation: "zuiun", requiredSlotIds: 3, hitCounts: [2] })
    ]);
  });

  it("generates Ise type 200/201 only from surviving Zuiun/Suisei slots", () => {
    const main = equipment(1, 1);
    const zuiunA = equipment(26, 11, { count: 6 });
    const zuiunB = equipment(26, 11, { count: 6 });
    const suisei = equipment(291, 7, { count: 6 });
    const attacker = unit(553, 10, [main, zuiunA, zuiunB, suisei], [zuiunA, zuiunB, suisei].map(aircraft));
    expect(dayCutInCandidates(attacker, true, false, [attacker]).map((candidate) => candidate.atType)).toEqual([200, 201]);
  });

  it.each([
    [[equipment(13, 5), equipment(14, 5), equipment(412, 39)], [13, 9]],
    [[equipment(13, 5), equipment(129, 39), equipment(33, 13, { los: 7 })], [12, 8]],
    [[equipment(1, 1), equipment(13, 5), equipment(33, 13, { los: 7 })], [11, 7]],
    [[equipment(13, 5), equipment(75, 30), equipment(412, 39)], [14, 10]]
  ] as const)("generates paired destroyer protocol candidates %j", (slots, expected) => {
    const attacker = unit(1, 2, [...slots]);
    expect(destroyerNightCutInCandidates(attacker).map((candidate) => candidate.spType)).toEqual(expected);
  });

  it("generates two-hit night Zuiun type 200", () => {
    const mainA = equipment(1, 1);
    const mainB = equipment(2, 2);
    const zuiun = equipment(490, 11, { count: 4 });
    const attacker = unit(553, 10, [mainA, mainB, zuiun], [aircraft(zuiun)]);
    expect(nightZuiunCutInCandidates(attacker)).toEqual([expect.objectContaining({
      spType: 200,
      hits: 2,
      slotIds: [1, 2, 490]
    })]);
  });

  it("generates submarine late-torpedo/radar cut-ins with type 3", () => {
    const lateA = equipment(213, 32);
    const lateB = equipment(214, 32);
    const radar = equipment(210, 51);
    const attacker = unit(539, 13, [lateA, lateB, radar]);
    expect(submarineNightCutInCandidates(attacker)).toEqual([expect.objectContaining({
      spType: 3,
      hits: 2,
      modifier: 1.75,
      slotIds: [213, 214, 210]
    })]);
  });
});
