import { describe, expect, it } from "vitest";
import {
  resolveFleetSpecialAttack,
  specialAttackDefinitions
} from "../src/kcsapi/battle/special-attacks.js";
import type { BattleUnit } from "../src/kcsapi/battle/types.js";

function unit(masterId: number, position: number, shipType = 9): BattleUnit {
  return {
    side: 0,
    position,
    apiIndex: position - 1,
    shipId: masterId * 10 + position,
    masterId,
    level: 99,
    hp: 100,
    startingHp: 100,
    hpFloor: 0,
    maxHp: 100,
    baseFirepower: 100,
    firepower: 100,
    baseTorpedo: 0,
    torpedo: 0,
    aa: 50,
    baseAsw: 0,
    asw: 0,
    armor: 80,
    luck: 50,
    accuracy: 20,
    evasion: 20,
    range: 3,
    ammoModifier: 1,
    shipType,
    targetKind: "surface",
    slots: [1],
    equippedSlots: [],
    airSlots: [],
    onSlot: [0, 0, 0, 0, 0],
    originalOnSlot: [0, 0, 0, 0, 0],
    damageDealt: 0
  };
}

function resolve(
  fleet: BattleUnit[],
  formation: number,
  phase: "day" | "night" = "day",
  extras: Partial<Parameters<typeof resolveFleetSpecialAttack>[0]> = {}
) {
  return resolveFleetSpecialAttack({
    mode: "sortie",
    phase,
    formation,
    combined: false,
    attacker: fleet[0],
    fleet,
    usage: [],
    useItem95Count: 0,
    chance: () => true,
    ...extras
  });
}

describe("fleet special attack definitions", () => {
  it("covers every cached client protocol family", () => {
    expect(specialAttackDefinitions().map((entry) => entry.type).sort((a, b) => a - b)).toEqual([
      100, 101, 102, 103, 104, 105, 106, 400, 401
    ]);
  });

  it.each([
    [100, [unit(571, 1), unit(80, 3), unit(81, 5)], 2, "day"],
    [101, [unit(541, 1), unit(573, 2)], 5, "day"],
    [102, [unit(573, 1), unit(541, 2)], 5, "night"],
    [103, [unit(601, 1), unit(80, 2), unit(81, 3)], 5, "day"],
    [104, [unit(591, 1, 8), unit(592, 2, 8)], 1, "night"],
    [105, [unit(969, 1, 8), unit(724, 2, 8)], 2, "day"],
    [106, [unit(364, 1), unit(733, 2)], 2, "night"],
    [400, [unit(911, 1, 8), unit(546, 2)], 5, "day"],
    [401, [unit(911, 1, 8), unit(546, 2), unit(80, 3)], 5, "day"]
  ] as const)("resolves protocol type %i with its required participants", (type, fleet, formation, phase) => {
    const result = resolve([...fleet], formation, phase);
    expect(result?.type).toBe(type);
    expect(result?.strikes.length).toBeGreaterThanOrEqual(2);
    expect(result?.strikes.every((strike) => strike.protocolType === type)).toBe(true);
  });

  it("selects one grouped submarine protocol pair and requires item 95", () => {
    const fleet = [unit(639, 1, 20), unit(13, 2, 13), unit(14, 3, 14), unit(13, 4, 13)];
    expect(resolve(fleet, 5)).toBeNull();
    const result = resolve(fleet, 5, "day", { useItem95Count: 1 });
    expect(result?.type).toBe(302);
    expect(result?.grouped).toBe(true);
    expect(new Set(result?.strikes.map((strike) => strike.protocolType))).toEqual(new Set([302]));
    expect(new Set(result?.strikes.map((strike) => strike.participant.position))).toEqual(new Set([2, 4]));
    expect(result?.initiator.position).toBe(1);
    expect(result?.useItemId).toBe(95);
  });

  it("maps submarine damage substitutions to types 300 and 301", () => {
    const fleet = [unit(639, 1, 20), unit(13, 2, 13), unit(14, 3, 14), unit(13, 4, 13)];
    fleet[3].hp = 50;
    expect(resolve(fleet, 5, "day", { useItem95Count: 1 })?.type).toBe(300);
    fleet[3].hp = 100;
    fleet[1].hp = 50;
    expect(resolve(fleet, 5, "day", { useItem95Count: 1 })?.type).toBe(301);
  });

  it("allows a night submarine repeat without consuming a second item", () => {
    const fleet = [unit(639, 1, 20), unit(13, 2, 13), unit(14, 3, 14)];
    fleet[0].hp = 40;
    const result = resolve(fleet, 5, "night", {
      useItem95Count: 0,
      useItem95CommittedThisBattle: true
    });
    expect(result?.type).toBe(300);
    expect(result?.useItemId).toBeUndefined();
    expect(resolve(fleet, 5, "night", {
      combined: true,
      useItem95Count: 1
    })).toBeNull();
  });

  it("allows a night retry when the day activation roll failed", () => {
    const fleet = [unit(541, 1), unit(573, 2)];
    expect(resolve(fleet, 5, "day", { chance: () => false })).toBeNull();
    expect(resolve(fleet, 5, "night", { chance: () => true })?.type).toBe(101);
  });

  it("honors sortie usage, damage, formation and practice restrictions", () => {
    const fleet = [unit(541, 1), unit(573, 2)];
    expect(resolve(fleet, 1)).toBeNull();
    expect(resolve(fleet, 5, "day", { usage: [{ type: 101, count: 1 }] })).toBeNull();
    expect(resolve(fleet, 5, "day", { mode: "practice" })).toBeNull();
    fleet[0].hp = 50;
    expect(resolve(fleet, 5)).toBeNull();

    const kongo = [unit(591, 1, 8), unit(592, 2, 8)];
    expect(resolve(kongo, 1, "night", { usage: [{ type: 104, count: 2 }] })?.type).toBe(104);
    expect(resolve(kongo, 1, "night", { usage: [{ type: 104, count: 3 }] })).toBeNull();

    const yamato = [unit(911, 1, 8), unit(546, 2), unit(80, 3)];
    expect(resolve(yamato, 5, "day", { usage: [{ type: 400, count: 1 }] })).toBeNull();
  });
});
