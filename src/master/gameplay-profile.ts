import { masterAssetClosureReport, type MasterAssetClosureReport } from "./catalog.js";
import type { ResourceManifest } from "../resources/types.js";
import type { SaveState } from "../state/types.js";

export type EvidenceLevel = "exact" | "community-statistical" | "fallback" | "unverified";

export type GameplayProfile = Readonly<{
  id: string;
  clientVersion: string;
  rulesDate: string;
  masterSnapshot: string;
  assetSnapshot: string;
  eventId: number | null;
  compatibility: "closed" | "explicit-mixed";
  capabilities: Readonly<{
    map56: boolean;
    hangarExpansion: boolean;
    currentEvent: boolean;
    livePracticeMatching: false;
  }>;
  evidence: Readonly<{
    constructionAndDevelopment: EvidenceLevel;
    routingWeights: EvidenceLevel;
    drops: EvidenceLevel;
    practice: "offline-simulation";
  }>;
}>;

/**
 * The repository deliberately uses an old cached client with newer community
 * gameplay data. Keeping that combination in one named object makes the
 * compatibility boundary explicit; unsupported newer features remain off.
 */
export const DEFAULT_GAMEPLAY_PROFILE: GameplayProfile = deepFreeze({
  id: "cache-6.2.3.1-community-2026-07-12",
  clientVersion: "6.2.3.1",
  rulesDate: "2026-07-12",
  masterSnapshot: "kcwiki-a8018819ad330b73c714fbba195794453c8dfde3",
  assetSnapshot: "cache-index-through-2026-01-28",
  eventId: null,
  compatibility: "explicit-mixed",
  capabilities: {
    map56: false,
    hangarExpansion: false,
    currentEvent: false,
    livePracticeMatching: false
  },
  evidence: {
    constructionAndDevelopment: "community-statistical",
    routingWeights: "fallback",
    drops: "community-statistical",
    practice: "offline-simulation"
  }
});

/** Explicit opt-in for the repository's synthetic 061 event protocol scaffold. */
export const SYNTHETIC_EVENT_GAMEPLAY_PROFILE: GameplayProfile = deepFreeze({
  ...DEFAULT_GAMEPLAY_PROFILE,
  id: "cache-6.2.3.1-synthetic-event-061",
  eventId: 61,
  capabilities: {
    ...DEFAULT_GAMEPLAY_PROFILE.capabilities,
    currentEvent: true
  }
});

/** Rules/data validation profile. It is not selected by the bundled 6.2.3.1 client. */
export const MAP56_RULES_GAMEPLAY_PROFILE: GameplayProfile = deepFreeze({
  ...DEFAULT_GAMEPLAY_PROFILE,
  id: "community-2026-07-12-map56-rules",
  capabilities: {
    ...DEFAULT_GAMEPLAY_PROFILE.capabilities,
    map56: true
  }
});

export function profileSupportsNormalMap(profile: GameplayProfile | undefined, mapId: number) {
  const selected = profile ?? DEFAULT_GAMEPLAY_PROFILE;
  return Math.trunc(mapId) !== 56 || selected.capabilities.map56;
}

export type GameplayClosure = {
  profileId: string;
  masterAssets: MasterAssetClosureReport;
  unsupportedPlayerShipInstanceIds: number[];
  unsupportedPlayerSlotInstanceIds: number[];
};

export function validateGameplayClosure(
  profile: GameplayProfile,
  resourceManifest: ResourceManifest,
  save?: Pick<SaveState, "ships" | "slotItems">
): GameplayClosure {
  const masterAssets = masterAssetClosureReport(resourceManifest);
  const exposedShipIds = new Set(masterAssets.exposedShipIds);
  const exposedSlotIds = new Set(masterAssets.exposedSlotIds);
  return {
    profileId: profile.id,
    masterAssets,
    unsupportedPlayerShipInstanceIds: (save?.ships ?? [])
      .filter((ship) => !exposedShipIds.has(ship.masterId))
      .map((ship) => ship.id)
      .sort((a, b) => a - b),
    unsupportedPlayerSlotInstanceIds: (save?.slotItems ?? [])
      .filter((slot) => !exposedSlotIds.has(slot.masterId))
      .map((slot) => slot.id)
      .sort((a, b) => a - b)
  };
}

export function assertPlayableSaveClosure(closure: GameplayClosure) {
  if (
    closure.unsupportedPlayerShipInstanceIds.length === 0 &&
    closure.unsupportedPlayerSlotInstanceIds.length === 0
  ) {
    return;
  }
  throw new Error(
    `Save is outside gameplay profile ${closure.profileId}: ` +
    `unsupported ship instances [${closure.unsupportedPlayerShipInstanceIds.join(",")}], ` +
    `unsupported equipment instances [${closure.unsupportedPlayerSlotInstanceIds.join(",")}]`
  );
}

function deepFreeze<T extends Record<string, unknown>>(value: T): T {
  for (const nested of Object.values(value)) {
    if (nested && typeof nested === "object") Object.freeze(nested);
  }
  return Object.freeze(value);
}
