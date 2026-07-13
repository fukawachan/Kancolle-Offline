export type AaciCandidate = {
  unitIndex: number;
  kind: number;
  fixedBonus: number;
  modifier: number;
  activationRate: number;
  useItems: number[];
};

export type AaciEquipmentSummary = {
  battleship?: boolean;
  allItems?: number[];
  highAngleGuns: number[];
  specialHighAngleGuns?: number[];
  aaGuns: number[];
  aaGunsAtLeast3?: number[];
  aaGunsAtLeast4?: number[];
  aaGunsAtLeast5?: number[];
  aaGunsAtLeast6?: number[];
  radars: number[];
  airRadars?: number[];
  specialAaGuns?: number[];
  aaDirectors?: number[];
  largeMainGuns?: number[];
  type3Shells?: number[];
};

export type AaciShipProfile =
  | "generic"
  | "battleship"
  | "akizukiClass"
  | "mayaKaiNi"
  | "isuzuKaiNi"
  | "yuraKaiNi"
  | "kinuKaiNi"
  | "tenryuClassKaiNi"
  | "tenryuKaiNi"
  | "oyodoKai"
  | "gotland"
  | "kasumiYubari"
  | "kasumiKaiNiB"
  | "satsukiKaiNi"
  | "fumizukiKaiNi"
  | "isokazeHamakaze"
  | "submarineSpecial"
  | "iseClass"
  | "yamatoKaiNi"
  | "britishKongo"
  | "fletcherClass"
  | "atlantaClass"
  | "harunaKaiNiSpecial"
  | "shiratsuyuSpecial";

export type AaciPattern = {
  kind: number;
  fixedBonus: number;
  modifier: number;
  activationRate: number;
};

type PatternTuple = readonly [fixedBonus: number, modifier: number, activationRate: number];

/**
 * Fixed/proportional bonuses are the public values used by the January 2026
 * client boundary. Activation rates are community statistical baselines: they
 * are deliberately kept in this one table because the live server formula is
 * not public and must not leak into equipment predicates.
 * Evidence table: https://wikiwiki.jp/kancolle/対空砲火/対空カットイン一覧表
 */
// Deliberately stops at the cached-client baseline. Kinds 48-53 are newer than
// this cache and must not be emitted until its animation/protocol is updated.
const PATTERN_VALUES: Readonly<Record<number, PatternTuple>> = Object.freeze({
  1: [7, 1.7, 0.65], 2: [6, 1.7, 0.58], 3: [4, 1.6, 0.5],
  4: [6, 1.5, 0.52], 5: [4, 1.5, 0.55], 6: [4, 1.45, 0.4],
  7: [3, 1.35, 0.45], 8: [4, 1.4, 0.5], 9: [2, 1.3, 0.4],
  10: [8, 1.65, 0.6], 11: [6, 1.5, 0.55], 12: [3, 1.25, 0.45],
  13: [4, 1.35, 0.42], 14: [4, 1.45, 0.42], 15: [3, 1.3, 0.35],
  16: [4, 1.4, 0.38], 17: [2, 1.25, 0.34], 18: [2, 1.2, 0.55],
  19: [5, 1.45, 0.48], 20: [3, 1.25, 0.55], 21: [5, 1.45, 0.46],
  22: [2, 1.2, 0.55], 23: [1, 1.05, 0.5], 24: [3, 1.25, 0.42],
  25: [7, 1.55, 0.48], 26: [6, 1.4, 0.48], 27: [5, 1.55, 0.4],
  28: [4, 1.4, 0.5], 29: [5, 1.55, 0.5], 30: [3, 1.3, 0.42],
  31: [2, 1.25, 0.5], 32: [3, 1.2, 0.5], 33: [3, 1.35, 0.55],
  34: [7, 1.6, 0.62], 35: [6, 1.55, 0.58], 36: [6, 1.55, 0.55],
  37: [4, 1.45, 0.52], 38: [10, 1.85, 0.7], 39: [10, 1.7, 0.65],
  40: [10, 1.7, 0.6], 41: [9, 1.65, 0.55], 42: [10, 1.65, 0.62],
  43: [8, 1.6, 0.58], 44: [6, 1.6, 0.55], 45: [5, 1.55, 0.52],
  46: [8, 1.55, 0.58], 47: [2, 1.3, 0.5]
});

const AACI_PATTERNS = new Map<number, AaciPattern>(
  Object.entries(PATTERN_VALUES).map(([kind, [fixedBonus, modifier, activationRate]]) => [
    Number(kind),
    { kind: Number(kind), fixedBonus, modifier, activationRate }
  ])
);

export function aaciPattern(kind: number) {
  return AACI_PATTERNS.get(Math.trunc(kind)) ?? null;
}

export function selectGenericAaci(unitIndex: number, equipment: AaciEquipmentSummary): AaciCandidate | null {
  return genericAaciCandidates(unitIndex, equipment, "generic")[0] ?? null;
}

/**
 * Returns every equipment pattern the ship can roll. Since the May 2023
 * update, a ship may roll each satisfied pattern independently. The fleet
 * caller must therefore continue after a failed high-priority candidate.
 */
export function selectAaciCandidates(
  unitIndex: number,
  equipment: AaciEquipmentSummary,
  profile: AaciShipProfile = "generic"
) {
  const specialized = specializedAaciCandidates(unitIndex, equipment, profile);
  const generic = genericAaciCandidates(unitIndex, equipment, profile);
  const unique = new Map<number, AaciCandidate>();
  for (const value of [...specialized, ...generic]) unique.set(value.kind, value);
  return [...unique.values()].sort(compareAaciPriority);
}

export function selectActivatedAaci(
  candidates: readonly AaciCandidate[],
  chance: (probability: number) => boolean
) {
  for (const value of candidates) {
    if (chance(value.activationRate)) return value;
  }
  return null;
}

export function compareAaciPriority(a: AaciCandidate, b: AaciCandidate) {
  return b.fixedBonus - a.fixedBonus ||
    b.modifier - a.modifier ||
    a.unitIndex - b.unitIndex ||
    a.kind - b.kind;
}

function genericAaciCandidates(
  unitIndex: number,
  equipment: AaciEquipmentSummary,
  profile: AaciShipProfile
) {
  const result: AaciCandidate[] = [];
  const airRadars = equipment.airRadars ?? equipment.radars;
  const directors = equipment.aaDirectors ?? [];
  const specialAa = equipment.specialAaGuns ?? [];
  const aa3 = equipment.aaGunsAtLeast3 ?? equipment.aaGuns;
  const isAkizuki = profile === "akizukiClass";

  if (!isAkizuki && equipment.highAngleGuns.length >= 2 && airRadars.length >= 1) {
    result.push(candidate(unitIndex, 5, [...equipment.highAngleGuns.slice(0, 2), airRadars[0]]));
  }
  if (!isAkizuki && equipment.highAngleGuns.length >= 1 && airRadars.length >= 1) {
    result.push(candidate(unitIndex, 8, [equipment.highAngleGuns[0], airRadars[0]]));
  }
  if (!isAkizuki && equipment.highAngleGuns.length >= 1 && directors.length >= 1 && airRadars.length >= 1) {
    result.push(candidate(unitIndex, 7, [equipment.highAngleGuns[0], directors[0], airRadars[0]]));
  }
  if (equipment.highAngleGuns.length >= 1 && directors.length >= 1) {
    result.push(candidate(unitIndex, 9, [equipment.highAngleGuns[0], directors[0]]));
  }
  if (specialAa.length >= 1 && aa3.length >= 2 && airRadars.length >= 1) {
    const ordinaryAa = aa3.find((id) => id !== specialAa[0]) ?? aa3[0];
    result.push(candidate(unitIndex, 12, [specialAa[0], ordinaryAa, airRadars[0]]));
  }
  if (profile !== "mayaKaiNi" && equipment.highAngleGuns.length >= 1 && specialAa.length >= 1 && airRadars.length >= 1) {
    result.push(candidate(unitIndex, 13, [equipment.highAngleGuns[0], specialAa[0], airRadars[0]]));
  }
  if (profile === "battleship" || equipment.battleship) {
    const largeMain = equipment.largeMainGuns ?? [];
    const type3 = equipment.type3Shells ?? [];
    if (largeMain.length >= 1 && type3.length >= 1 && directors.length >= 1) {
      if (airRadars.length >= 1) {
        result.push(candidate(unitIndex, 4, [largeMain[0], type3[0], directors[0], airRadars[0]]));
      }
      result.push(candidate(unitIndex, 6, [largeMain[0], type3[0], directors[0]]));
    }
  }
  return result;
}

function specializedAaciCandidates(
  unitIndex: number,
  equipment: AaciEquipmentSummary,
  profile: AaciShipProfile
) {
  const result: AaciCandidate[] = [];
  const airRadars = equipment.airRadars ?? equipment.radars;
  const specialHigh = equipment.specialHighAngleGuns ?? equipment.highAngleGuns;
  const specialAa = equipment.specialAaGuns ?? [];
  const aa3 = equipment.aaGunsAtLeast3 ?? equipment.aaGuns;
  const aa4 = equipment.aaGunsAtLeast4 ?? aa3;
  const aa6 = equipment.aaGunsAtLeast6 ?? aa4;
  const type3 = equipment.type3Shells ?? [];
  const all = equipment.allItems ?? [
    ...equipment.highAngleGuns,
    ...equipment.aaGuns,
    ...equipment.radars,
    ...(equipment.aaDirectors ?? [])
  ];

  if (profile === "akizukiClass") {
    if (equipment.highAngleGuns.length >= 2 && equipment.radars.length >= 1) {
      result.push(candidate(unitIndex, 1, [...equipment.highAngleGuns.slice(0, 2), equipment.radars[0]]));
    }
    if (specialHigh.length >= 1 && equipment.radars.length >= 1) {
      result.push(candidate(unitIndex, 2, [specialHigh[0], equipment.radars[0]]));
    }
    if (equipment.highAngleGuns.length >= 2) {
      result.push(candidate(unitIndex, 3, equipment.highAngleGuns.slice(0, 2)));
    }
  }
  if (profile === "mayaKaiNi" && equipment.highAngleGuns.length >= 1 && specialAa.length >= 1) {
    if (airRadars.length >= 1) result.push(candidate(unitIndex, 10, [equipment.highAngleGuns[0], specialAa[0], airRadars[0]]));
    result.push(candidate(unitIndex, 11, [equipment.highAngleGuns[0], specialAa[0]]));
  }
  if (profile === "isuzuKaiNi" && equipment.highAngleGuns.length >= 1 && equipment.aaGuns.length >= 1) {
    if (airRadars.length >= 1) result.push(candidate(unitIndex, 14, [equipment.highAngleGuns[0], equipment.aaGuns[0], airRadars[0]]));
    result.push(candidate(unitIndex, 15, [equipment.highAngleGuns[0], equipment.aaGuns[0]]));
  }
  if (profile === "yuraKaiNi" && equipment.highAngleGuns.length >= 1 && airRadars.length >= 1) {
    result.push(candidate(unitIndex, 21, [equipment.highAngleGuns[0], airRadars[0]]));
  }
  if (profile === "kinuKaiNi" && specialAa.length >= 1) {
    if (equipment.highAngleGuns.length >= 1) result.push(candidate(unitIndex, 19, [equipment.highAngleGuns[0], specialAa[0]]));
    result.push(candidate(unitIndex, 20, [specialAa[0]]));
  }
  if (profile === "tenryuClassKaiNi" || profile === "tenryuKaiNi") {
    if (equipment.highAngleGuns.length >= 1 && aa3.length >= 1) {
      result.push(candidate(unitIndex, 24, [equipment.highAngleGuns[0], aa3[0]]));
    }
    if (profile === "tenryuKaiNi" && equipment.highAngleGuns.length >= 3) {
      result.push(candidate(unitIndex, 30, equipment.highAngleGuns.slice(0, 3)));
    }
    if (profile === "tenryuKaiNi" && equipment.highAngleGuns.length >= 2) {
      result.push(candidate(unitIndex, 31, equipment.highAngleGuns.slice(0, 2)));
    }
  }
  if (profile === "oyodoKai" && has(all, 274) && airRadars.length >= 1) {
    const mount = firstOf(all, [71, 220, 275]);
    if (mount) result.push(candidate(unitIndex, 27, [mount, 274, airRadars[0]]));
  }
  if (profile === "gotland") {
    if (equipment.highAngleGuns.length >= 3) result.push(candidate(unitIndex, 30, equipment.highAngleGuns.slice(0, 3)));
    if (equipment.highAngleGuns.length >= 1 && aa4.length >= 1) result.push(candidate(unitIndex, 33, [equipment.highAngleGuns[0], aa4[0]]));
  }
  if (profile === "kasumiYubari" || profile === "kasumiKaiNiB") {
    if (equipment.highAngleGuns.length >= 1 && equipment.aaGuns.length >= 1) {
      if (airRadars.length >= 1) result.push(candidate(unitIndex, 16, [equipment.highAngleGuns[0], equipment.aaGuns[0], airRadars[0]]));
      result.push(candidate(unitIndex, 17, [equipment.highAngleGuns[0], equipment.aaGuns[0]]));
    }
  }
  if (profile === "satsukiKaiNi" && specialAa.length >= 1) result.push(candidate(unitIndex, 18, [specialAa[0]]));
  if (profile === "fumizukiKaiNi" && specialAa.length >= 1) result.push(candidate(unitIndex, 22, [specialAa[0]]));
  if (profile === "isokazeHamakaze" && equipment.highAngleGuns.length >= 1 && airRadars.length >= 1) {
    result.push(candidate(unitIndex, 29, [equipment.highAngleGuns[0], airRadars[0]]));
  }
  if (profile === "submarineSpecial" && aa3.length >= 1) result.push(candidate(unitIndex, 23, [aa3[0]]));
  if (profile === "iseClass" && has(all, 274) && airRadars.length >= 1) {
    if (type3.length >= 1) result.push(candidate(unitIndex, 25, [274, airRadars[0], type3[0]]));
    result.push(candidate(unitIndex, 28, [274, airRadars[0]]));
  }
  if (profile === "yamatoKaiNi") {
    if (has(all, 275) && airRadars.length >= 1) result.push(candidate(unitIndex, 26, [275, airRadars[0]]));
    const concentrated = all.filter((id) => id === 464);
    const rangefinder = firstOf(all, [142, 460]);
    if (concentrated.length >= 2 && rangefinder) {
      if (aa6.length >= 1) result.push(candidate(unitIndex, 42, [concentrated[0], concentrated[1], rangefinder, aa6[0]]));
      result.push(candidate(unitIndex, 43, [concentrated[0], concentrated[1], rangefinder]));
    }
    if (concentrated.length >= 1 && rangefinder) {
      if (aa6.length >= 1) result.push(candidate(unitIndex, 44, [concentrated[0], rangefinder, aa6[0]]));
      result.push(candidate(unitIndex, 45, [concentrated[0], rangefinder]));
    }
  }
  if (profile === "britishKongo") {
    if (has(all, 300) && has(all, 191)) result.push(candidate(unitIndex, 32, [300, 191]));
    else if (all.filter((id) => id === 301).length >= 2) result.push(candidate(unitIndex, 32, [301, 301]));
    else if (has(all, 301) && has(all, 191)) result.push(candidate(unitIndex, 32, [301, 191]));
  }
  if (profile === "fletcherClass") {
    const gfcsGuns = all.filter((id) => id === 308);
    const mk30 = all.filter((id) => id === 284 || id === 313);
    const mk30Kai = all.filter((id) => id === 313);
    if (gfcsGuns.length >= 2) result.push(candidate(unitIndex, 34, gfcsGuns.slice(0, 2)));
    if (gfcsGuns.length >= 1 && mk30.length >= 1) result.push(candidate(unitIndex, 35, [gfcsGuns[0], mk30[0]]));
    if (mk30.length >= 2 && has(all, 307)) result.push(candidate(unitIndex, 36, [mk30[0], mk30[1], 307]));
    if (mk30Kai.length >= 2) result.push(candidate(unitIndex, 37, mk30Kai.slice(0, 2)));
  }
  if (profile === "atlantaClass") {
    const gfcsGuns = all.filter((id) => id === 363);
    const concentrated = all.filter((id) => id === 362 || id === 363);
    if (gfcsGuns.length >= 2) result.push(candidate(unitIndex, 38, gfcsGuns.slice(0, 2)));
    if (gfcsGuns.length >= 1 && has(all, 362)) result.push(candidate(unitIndex, 39, [gfcsGuns[0], 362]));
    if (concentrated.length >= 2 && has(all, 307)) result.push(candidate(unitIndex, 40, [concentrated[0], concentrated[1], 307]));
    if (concentrated.length >= 2) result.push(candidate(unitIndex, 41, concentrated.slice(0, 2)));
  }
  if (profile === "harunaKaiNiSpecial") {
    const gun = firstOf(all, [502, 503]);
    if (gun && specialAa.length >= 1 && airRadars.length >= 1) {
      result.push(candidate(unitIndex, 46, [gun, specialAa[0], airRadars[0]]));
    }
  }
  if (profile === "shiratsuyuSpecial" && has(all, 529)) {
    if (all.filter((id) => id === 529).length >= 2) result.push(candidate(unitIndex, 47, [529, 529]));
    else if (has(all, 505)) result.push(candidate(unitIndex, 47, [529, 505]));
    else if (airRadars.length >= 1) result.push(candidate(unitIndex, 47, [529, airRadars[0]]));
  }
  return result;
}

function candidate(unitIndex: number, kind: number, useItems: number[]): AaciCandidate {
  const pattern = aaciPattern(kind);
  if (!pattern) throw new Error(`Missing AACI pattern ${kind}`);
  return { unitIndex, ...pattern, useItems };
}

function has(ids: readonly number[], id: number) {
  return ids.includes(id);
}

function firstOf(ids: readonly number[], wanted: readonly number[]) {
  return wanted.find((id) => ids.includes(id));
}
