export const REPAIR_PERSONNEL_MASTER_ID = 42;
export const REPAIR_GODDESS_MASTER_ID = 43;

export type DamageControlEquipment = {
  index: number;
  slotItemId: number;
  slotMasterId: number;
};

export type DamageControlActivation = {
  shipId: number;
  slotItemId: number;
  slotMasterId: number;
  restoredHp: number;
  restoreFuelAmmo: boolean;
};

/**
 * Resolves the first equipped damage-control item in slot order.
 * Personnel restores 20% HP (50% on a flagship); Goddess restores full HP
 * and supply. Planes are deliberately not part of this result.
 */
export function resolveDamageControlActivation(input: {
  shipId: number;
  maxHp: number;
  flagship: boolean;
  equipment: readonly DamageControlEquipment[];
}): DamageControlActivation | null {
  const selected = [...input.equipment]
    .filter((item) => item.slotMasterId === REPAIR_PERSONNEL_MASTER_ID || item.slotMasterId === REPAIR_GODDESS_MASTER_ID)
    .sort((left, right) => left.index - right.index || left.slotItemId - right.slotItemId)[0];
  if (!selected) return null;

  const maxHp = Math.max(1, Math.trunc(Number(input.maxHp) || 1));
  const goddess = selected.slotMasterId === REPAIR_GODDESS_MASTER_ID;
  const ratio = input.flagship ? 0.5 : 0.2;
  return {
    shipId: Math.trunc(Number(input.shipId) || 0),
    slotItemId: selected.slotItemId,
    slotMasterId: selected.slotMasterId,
    restoredHp: goddess ? maxHp : Math.max(1, Math.floor(maxHp * ratio)),
    restoreFuelAmmo: goddess
  };
}
