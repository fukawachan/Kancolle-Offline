import { describe, expect, it } from "vitest";
import { combinedShellingFriendlySequence } from "../src/kcsapi/battle/phases/combined.js";

describe("combined-fleet shelling participants", () => {
  it("uses escort-main-main for carrier and transport fleets against a single fleet", () => {
    expect(combinedShellingFriendlySequence(1, false)).toEqual(["escort", "main", "main"]);
    expect(combinedShellingFriendlySequence(3, false)).toEqual(["escort", "main", "main"]);
  });

  it("uses main-main-escort for a surface task force", () => {
    expect(combinedShellingFriendlySequence(2, false)).toEqual(["main", "main", "escort"]);
    expect(combinedShellingFriendlySequence(2, true)).toEqual(["main", "main", "escort"]);
  });

  it("moves the first carrier/transport round to the main fleet against an enemy combined fleet", () => {
    expect(combinedShellingFriendlySequence(1, true)).toEqual(["main", "escort", "main"]);
    expect(combinedShellingFriendlySequence(3, true)).toEqual(["main", "escort", "main"]);
  });
});
