import { describe, expect, it } from "vitest";
import { generatePracticeBatch } from "../src/kcsapi/practice.js";

describe("practice rival generation", () => {
  it("honors a cache-aware ship pool and stores deterministic loadouts", () => {
    const availableShipIds = [9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20];
    const batch = generatePracticeBatch("2026-06-18T03:00+09:00", 0, { availableShipIds });

    const generatedShips = batch.rivals.flatMap((rival) => rival.ships);
    expect(generatedShips.length).toBeGreaterThan(0);
    expect(generatedShips.every((ship) => availableShipIds.includes(ship.masterId))).toBe(true);
    expect(generatedShips.every((ship) => ship.slotMasterIds.length > 0)).toBe(true);
    expect(generatedShips.every((ship) => ship.onSlot)).toBe(true);
    expect(generatedShips.every((ship) => ship.onSlot.length === 5)).toBe(true);
  });

  it("balances two-ship rivals within every generated batch", () => {
    const keys = [
      "2026-06-18T03:00+09:00",
      "2026-06-18T15:00+09:00",
      "2026-06-19T03:00+09:00",
      "2026-06-19T15:00+09:00",
      "2026-06-20T03:00+09:00",
      "2026-06-20T15:00+09:00"
    ];

    const twoShipCounts = keys.map((key) =>
      generatePracticeBatch(key, 0).rivals.filter((rival) => rival.ships.length === 2).length
    );

    expect(twoShipCounts.every((count) => count === 2 || count === 3)).toBe(true);
  });
});
