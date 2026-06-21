export type AaciCandidate = {
  unitIndex: number;
  kind: number;
  fixedBonus: number;
  modifier: number;
  useItems: number[];
};

export type AaciEquipmentSummary = {
  highAngleGuns: number[];
  aaGuns: number[];
  radars: number[];
};

export function selectGenericAaci(unitIndex: number, equipment: AaciEquipmentSummary): AaciCandidate | null {
  if (equipment.highAngleGuns.length >= 2 && equipment.radars.length >= 1) {
    return {
      unitIndex,
      kind: 5,
      fixedBonus: 4,
      modifier: 1.5,
      useItems: [...equipment.highAngleGuns.slice(0, 2), equipment.radars[0]]
    };
  }
  if (equipment.highAngleGuns.length >= 1 && equipment.aaGuns.length >= 1 && equipment.radars.length >= 1) {
    return {
      unitIndex,
      kind: 7,
      fixedBonus: 3,
      modifier: 1.35,
      useItems: [equipment.highAngleGuns[0], equipment.aaGuns[0], equipment.radars[0]]
    };
  }
  if (equipment.highAngleGuns.length >= 1 && equipment.radars.length >= 1) {
    return {
      unitIndex,
      kind: 8,
      fixedBonus: 2,
      modifier: 1.25,
      useItems: [equipment.highAngleGuns[0], equipment.radars[0]]
    };
  }
  return null;
}
