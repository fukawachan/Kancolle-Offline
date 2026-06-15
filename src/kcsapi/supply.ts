export type BattleSupplyCost = {
  fuel: number;
  ammo: number;
};

export type SupplyKind = 0 | 1 | 2 | 3;

export type SupplyOptions = {
  kind: SupplyKind;
  refillAircraft: boolean;
};

export function normalizeSupplyKind(value: number): SupplyKind {
  return value === 0 || value === 1 || value === 2 || value === 3 ? value : 3;
}

export function suppliesFuel(kind: SupplyKind) {
  return kind === 1 || kind === 3;
}

export function suppliesAmmo(kind: SupplyKind) {
  return kind === 2 || kind === 3;
}

export function battleSupplyCost(maxFuel: number, maxAmmo: number, pursuedNightBattle: boolean): BattleSupplyCost {
  return {
    fuel: Math.floor(Math.max(0, maxFuel) * 0.2),
    ammo: pursuedNightBattle
      ? Math.ceil(Math.max(0, maxAmmo) * 0.3)
      : Math.floor(Math.max(0, maxAmmo) * 0.2)
  };
}
