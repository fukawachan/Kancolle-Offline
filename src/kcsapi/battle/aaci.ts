export type AaciCandidate = {
  unitIndex: number;
  kind: number;
  fixedBonus: number;
  modifier: number;
  activationRate: number;
  useItems: number[];
};

export type AaciEquipmentSummary = {
  highAngleGuns: number[];
  aaGuns: number[];
  radars: number[];
};

export type AaciPattern = {
  kind: number;
  fixedBonus: number;
  modifier: number;
  activationRate: number;
};

const AACI_PATTERNS = new Map<number, AaciPattern>([
  [1, { kind: 1, fixedBonus: 7, modifier: 1.75, activationRate: 0.65 }],
  [2, { kind: 2, fixedBonus: 6, modifier: 1.7, activationRate: 0.58 }],
  [3, { kind: 3, fixedBonus: 4, modifier: 1.6, activationRate: 0.5 }],
  [4, { kind: 4, fixedBonus: 6, modifier: 1.5, activationRate: 0.52 }],
  [5, { kind: 5, fixedBonus: 4, modifier: 1.55, activationRate: 0.55 }],
  [6, { kind: 6, fixedBonus: 4, modifier: 1.5, activationRate: 0.4 }],
  [7, { kind: 7, fixedBonus: 3, modifier: 1.35, activationRate: 0.45 }],
  [8, { kind: 8, fixedBonus: 4, modifier: 1.45, activationRate: 0.5 }],
  [9, { kind: 9, fixedBonus: 2, modifier: 1.3, activationRate: 0.4 }],
  [10, { kind: 10, fixedBonus: 8, modifier: 1.65, activationRate: 0.6 }],
  [11, { kind: 11, fixedBonus: 6, modifier: 1.5, activationRate: 0.55 }],
  [12, { kind: 12, fixedBonus: 3, modifier: 1.25, activationRate: 0.45 }],
  [14, { kind: 14, fixedBonus: 4, modifier: 1.35, activationRate: 0.35 }],
  [15, { kind: 15, fixedBonus: 3, modifier: 1.35, activationRate: 0.35 }],
  [16, { kind: 16, fixedBonus: 4, modifier: 1.35, activationRate: 0.35 }],
  [17, { kind: 17, fixedBonus: 2, modifier: 1.35, activationRate: 0.35 }],
  [18, { kind: 18, fixedBonus: 2, modifier: 1.35, activationRate: 0.35 }]
]);

export function aaciPattern(kind: number) {
  return AACI_PATTERNS.get(Math.trunc(kind)) ?? null;
}

export function selectGenericAaci(unitIndex: number, equipment: AaciEquipmentSummary): AaciCandidate | null {
  if (equipment.highAngleGuns.length >= 2 && equipment.radars.length >= 1) {
    const pattern = aaciPattern(5)!;
    return {
      unitIndex,
      ...pattern,
      useItems: [...equipment.highAngleGuns.slice(0, 2), equipment.radars[0]]
    };
  }
  if (equipment.highAngleGuns.length >= 1 && equipment.aaGuns.length >= 1 && equipment.radars.length >= 1) {
    const pattern = aaciPattern(7)!;
    return {
      unitIndex,
      ...pattern,
      useItems: [equipment.highAngleGuns[0], equipment.aaGuns[0], equipment.radars[0]]
    };
  }
  if (equipment.highAngleGuns.length >= 1 && equipment.radars.length >= 1) {
    const pattern = aaciPattern(8)!;
    return {
      unitIndex,
      ...pattern,
      useItems: [equipment.highAngleGuns[0], equipment.radars[0]]
    };
  }
  return null;
}
