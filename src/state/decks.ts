export const DECK_SHIP_SLOT_COUNT = 6;

export function normalizeDeckShipIds(shipIds: readonly number[] | undefined): number[] {
  const assigned = (shipIds ?? [])
    .map((id) => Number(id))
    .filter((id) => Number.isFinite(id) && id > 0)
    .map((id) => Math.trunc(id))
    .slice(0, DECK_SHIP_SLOT_COUNT);

  return [
    ...assigned,
    ...Array(DECK_SHIP_SLOT_COUNT - assigned.length).fill(-1)
  ];
}
