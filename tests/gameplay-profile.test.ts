import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  assertPlayableSaveClosure,
  DEFAULT_GAMEPLAY_PROFILE,
  SYNTHETIC_EVENT_GAMEPLAY_PROFILE,
  validateGameplayClosure
} from "../src/master/gameplay-profile.js";
import { createResourceManifest } from "../src/resources/manifest.js";

describe("gameplay profile closure", () => {
  it("names the mixed snapshot and disables unsupported current features", () => {
    expect(Object.isFrozen(DEFAULT_GAMEPLAY_PROFILE)).toBe(true);
    expect(Object.isFrozen(DEFAULT_GAMEPLAY_PROFILE.capabilities)).toBe(true);
    expect(DEFAULT_GAMEPLAY_PROFILE).toMatchObject({
      clientVersion: "6.2.3.1",
      compatibility: "explicit-mixed",
      eventId: null,
      capabilities: {
        map56: false,
        hangarExpansion: false,
        currentEvent: false,
        livePracticeMatching: false
      }
    });
    expect(SYNTHETIC_EVENT_GAMEPLAY_PROFILE).toMatchObject({
      eventId: 61,
      capabilities: { currentEvent: true }
    });
  });

  it("rejects player instances whose masters cannot be rendered by the profile", async () => {
    const manifest = await createResourceManifest(path.resolve("cache"));
    const closure = validateGameplayClosure(DEFAULT_GAMEPLAY_PROFILE, manifest, {
      ships: [{ id: 41, masterId: 743 }] as never,
      slotItems: [{ id: 51, masterId: 547 }] as never
    });

    expect(closure.unsupportedPlayerShipInstanceIds).toEqual([41]);
    expect(closure.unsupportedPlayerSlotInstanceIds).toEqual([51]);
    expect(() => assertPlayableSaveClosure(closure)).toThrow(/unsupported ship instances \[41\]/);
  });
});
