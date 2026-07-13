export type CombinedFriendlyFleetRole = "main" | "escort";

/**
 * Friendly shelling participants for the three protocol rounds.
 *
 * Public combat-flow reference (permanent revision):
 * https://en.kancollewiki.net/w/index.php?title=Combined_Fleet&oldid=193122
 */
export function combinedShellingFriendlySequence(
  combinedType: number,
  defenderCombined: boolean
): readonly [CombinedFriendlyFleetRole, CombinedFriendlyFleetRole, CombinedFriendlyFleetRole] {
  if (combinedType === 2) return ["main", "main", "escort"];
  if (defenderCombined) return ["main", "escort", "main"];
  return ["escort", "main", "main"];
}
