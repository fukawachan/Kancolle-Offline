import type { BattleMode, BattleUnit } from "./types.js";

export type SpecialAttackUsage = {
  type: number;
  count: number;
};

export type SpecialAttackStrike = {
  participant: BattleUnit;
  modifier: number;
  protocolType: number;
};

export type AttackSequence = {
  type: number;
  name: string;
  grouped: boolean;
  initiator: BattleUnit;
  strikes: SpecialAttackStrike[];
  useItemId?: number;
  extraAmmoFraction: number;
};

export type SpecialAttackDefinition = {
  type: number;
  name: string;
  phases: readonly ("day" | "night")[];
  formations: readonly number[];
  combinedFormations: readonly number[];
  flagshipIds: ReadonlySet<number>;
  maxUses: number;
  activationBase: number;
  extraAmmoFraction: number;
  resolveParticipants: (fleet: readonly BattleUnit[]) => BattleUnit[] | null;
  modifiers: readonly number[];
};

export type ResolveSpecialAttackInput = {
  mode: BattleMode;
  phase: "day" | "night";
  formation: number;
  combined: boolean;
  attacker: BattleUnit;
  fleet: readonly BattleUnit[];
  usage: readonly SpecialAttackUsage[];
  useItem95Count: number;
  useItem95CommittedThisBattle?: boolean;
  chance: (probability: number) => boolean;
};

const NELSON_IDS = new Set([571, 572, 576, 577]);
const NAGATO_KAI_NI_IDS = new Set([541]);
const MUTSU_KAI_NI_IDS = new Set([573]);
const COLORADO_CLASS_IDS = new Set([601, 1496, 913, 918]);
const KONGO_SPECIAL_IDS = new Set([591, 592, 593, 694, 954]);
const RICHELIEU_IDS = new Set([392, 492, 969]);
const JEAN_BART_IDS = new Set([724, 935]);
const WARSPITE_IDS = new Set([364, 439]);
const VALIANT_IDS = new Set([733, 927]);
const YAMATO_KAI_NI_IDS = new Set([911, 916]);
const MUSASHI_KAI_NI_IDS = new Set([546]);
const SUBMARINE_TENDER_IDS = new Set([184, 634, 635, 639, 640, 944, 949]);
const SUBMARINE_TYPES = new Set([13, 14]);
const BATTLESHIP_TYPES = new Set([8, 9, 10, 12]);

const at = (fleet: readonly BattleUnit[], position: number) =>
  fleet.find((unit) => unit.position === position);

const usable = (unit: BattleUnit | undefined): unit is BattleUnit =>
  unit != null && unit.hp > 0 && unit.hp > unit.maxHp * 0.25;

const exactPair = (
  first: ReadonlySet<number>,
  second: ReadonlySet<number>
) => (fleet: readonly BattleUnit[]) => {
  const flagship = at(fleet, 1);
  const escort = at(fleet, 2);
  if (!usable(flagship) || !usable(escort)) return null;
  if (!first.has(flagship.masterId) || !second.has(escort.masterId)) return null;
  return [flagship, escort];
};

const nationalPair = (allowed: ReadonlySet<number>) => (fleet: readonly BattleUnit[]) => {
  const flagship = at(fleet, 1);
  const escort = at(fleet, 2);
  if (!usable(flagship) || !usable(escort)) return null;
  return allowed.has(escort.masterId) ? [flagship, escort] : null;
};

const DEFINITIONS: readonly SpecialAttackDefinition[] = Object.freeze([
  {
    type: 400,
    name: "Yamato-class two-ship special attack",
    phases: ["day", "night"], formations: [5], combinedFormations: [4],
    flagshipIds: new Set([...YAMATO_KAI_NI_IDS, ...MUSASHI_KAI_NI_IDS]),
    maxUses: 1, activationBase: 0.58, extraAmmoFraction: 0.15,
    resolveParticipants: (fleet) => {
      const flagship = at(fleet, 1);
      const second = at(fleet, 2);
      const third = at(fleet, 3);
      if (!usable(flagship) || !usable(second) || !BATTLESHIP_TYPES.has(second.shipType)) return null;
      // A valid third battleship is handled by api_at_type 401 below.
      if (usable(third) && BATTLESHIP_TYPES.has(third.shipType)) return null;
      return [flagship, second, flagship];
    },
    modifiers: [1.5, 1.3, 1.5]
  },
  {
    type: 401,
    name: "Yamato-class three-ship special attack",
    phases: ["day", "night"], formations: [5], combinedFormations: [4],
    flagshipIds: new Set([...YAMATO_KAI_NI_IDS, ...MUSASHI_KAI_NI_IDS]),
    maxUses: 1, activationBase: 0.55, extraAmmoFraction: 0.15,
    resolveParticipants: (fleet) => {
      const units = [at(fleet, 1), at(fleet, 2), at(fleet, 3)];
      return units.every((unit) => usable(unit) && BATTLESHIP_TYPES.has(unit!.shipType))
        ? units as BattleUnit[]
        : null;
    },
    modifiers: [1.5, 1.3, 1.3]
  },
  {
    type: 101,
    name: "Nagato-class special attack (Nagato flagship)",
    phases: ["day", "night"], formations: [5], combinedFormations: [4],
    flagshipIds: NAGATO_KAI_NI_IDS,
    maxUses: 1, activationBase: 0.55, extraAmmoFraction: 0.1,
    resolveParticipants: (fleet) => {
      const pair = exactPair(NAGATO_KAI_NI_IDS, MUTSU_KAI_NI_IDS)(fleet);
      return pair ? [pair[0], pair[1], pair[0]] : null;
    },
    modifiers: [1.4, 1.2, 1.4]
  },
  {
    type: 102,
    name: "Nagato-class special attack (Mutsu flagship)",
    phases: ["day", "night"], formations: [5], combinedFormations: [4],
    flagshipIds: MUTSU_KAI_NI_IDS,
    maxUses: 1, activationBase: 0.55, extraAmmoFraction: 0.1,
    resolveParticipants: (fleet) => {
      const pair = exactPair(MUTSU_KAI_NI_IDS, NAGATO_KAI_NI_IDS)(fleet);
      return pair ? [pair[0], pair[1], pair[0]] : null;
    },
    modifiers: [1.4, 1.2, 1.4]
  },
  {
    type: 103,
    name: "Colorado-class special attack",
    phases: ["day", "night"], formations: [5], combinedFormations: [4],
    flagshipIds: COLORADO_CLASS_IDS,
    maxUses: 1, activationBase: 0.52, extraAmmoFraction: 0.1,
    resolveParticipants: (fleet) => {
      const units = [at(fleet, 1), at(fleet, 2), at(fleet, 3)];
      return units.every((unit) => usable(unit) && BATTLESHIP_TYPES.has(unit!.shipType))
        ? units as BattleUnit[]
        : null;
    },
    modifiers: [1.3, 1.25, 1.2]
  },
  {
    type: 104,
    name: "Kongo-class night assault",
    phases: ["night"], formations: [1, 5], combinedFormations: [2, 4],
    flagshipIds: KONGO_SPECIAL_IDS,
    maxUses: 3, activationBase: 0.62, extraAmmoFraction: 0.1,
    resolveParticipants: nationalPair(KONGO_SPECIAL_IDS),
    modifiers: [1.4, 1.4]
  },
  {
    type: 105,
    name: "Richelieu-class special attack",
    phases: ["day", "night"], formations: [2], combinedFormations: [2],
    flagshipIds: RICHELIEU_IDS,
    maxUses: 1, activationBase: 0.58, extraAmmoFraction: 0.1,
    resolveParticipants: (fleet) => {
      const pair = exactPair(RICHELIEU_IDS, JEAN_BART_IDS)(fleet);
      return pair ? [pair[0], pair[1], pair[0]] : null;
    },
    modifiers: [1.45, 1.35, 1.45]
  },
  {
    type: 106,
    name: "Queen Elizabeth-class special attack",
    phases: ["day", "night"], formations: [2], combinedFormations: [2],
    flagshipIds: WARSPITE_IDS,
    maxUses: 1, activationBase: 0.58, extraAmmoFraction: 0.1,
    resolveParticipants: (fleet) => {
      const pair = exactPair(WARSPITE_IDS, VALIANT_IDS)(fleet);
      return pair ? [pair[0], pair[1], pair[0]] : null;
    },
    modifiers: [1.45, 1.35, 1.45]
  },
  {
    type: 100,
    name: "Nelson/Rodney Touch",
    phases: ["day", "night"], formations: [2], combinedFormations: [2],
    flagshipIds: NELSON_IDS,
    maxUses: 1, activationBase: 0.55, extraAmmoFraction: 0.1,
    resolveParticipants: (fleet) => {
      const units = [at(fleet, 1), at(fleet, 3), at(fleet, 5)];
      return units.every(usable) ? units as BattleUnit[] : null;
    },
    modifiers: [1.5, 1.5, 1.5]
  }
]);

/**
 * The cached client is the protocol boundary for types 100-106, 300-302 and
 * 400/401. Conditions/multipliers are public-formula estimates (wikiwiki
 * battle and individual ship pages); exact live-server activation is unknown.
 * Evidence:
 * - https://wikiwiki.jp/kancolle/戦闘について
 * - https://wikiwiki.jp/kancolle/Nelson
 * - https://wikiwiki.jp/kancolle/大和改二
 * - https://wikiwiki.jp/kancolle/大鯨
 */
export function resolveFleetSpecialAttack(input: ResolveSpecialAttackInput): AttackSequence | null {
  if (input.mode === "practice" || input.attacker.position !== 1) return null;
  if (!usable(input.attacker)) return null;

  const submarine = resolveSubmarineFleetAttack(input);
  if (submarine) return submarine;
  if (input.attacker.hp <= input.attacker.maxHp * 0.5) return null;

  const definitions = DEFINITIONS.filter((entry) =>
    entry.flagshipIds.has(input.attacker.masterId) && entry.phases.includes(input.phase)
  );
  for (const definition of definitions) {
    const formations = input.combined ? definition.combinedFormations : definition.formations;
    if (!formations.includes(input.formation)) continue;
    const used = specialAttackFamilyUsage(input.usage, definition.type);
    if (used >= definition.maxUses) continue;
    const participants = definition.resolveParticipants(input.fleet);
    if (!participants || participants.length !== definition.modifiers.length) continue;
    const activation = specialAttackActivationRate(definition, input.attacker, participants);
    if (!input.chance(activation)) return null;
    return {
      type: definition.type,
      name: definition.name,
      grouped: true,
      initiator: input.attacker,
      strikes: participants.map((participant, index) => ({
        participant,
        modifier: definition.modifiers[index] * specialEquipmentModifier(participant),
        protocolType: definition.type
      })),
      extraAmmoFraction: definition.extraAmmoFraction
    };
  }
  return null;
}

function specialAttackFamilyUsage(usage: readonly SpecialAttackUsage[], type: number) {
  const family = type === 400 || type === 401
    ? new Set([400, 401])
    : type === 101 || type === 102
      ? new Set([101, 102])
      : new Set([type]);
  return usage.reduce((sum, entry) => sum + (family.has(entry.type) ? entry.count : 0), 0);
}

export function specialAttackDefinitions() {
  return DEFINITIONS;
}

function resolveSubmarineFleetAttack(input: ResolveSpecialAttackInput): AttackSequence | null {
  if (!SUBMARINE_TENDER_IDS.has(input.attacker.masterId) || input.attacker.level < 30) return null;
  if (input.combined || ![5, 6].includes(input.formation)) return null;
  if (input.useItem95Count <= 0 && !input.useItem95CommittedThisBattle) return null;

  const second = at(input.fleet, 2);
  const third = at(input.fleet, 3);
  const fourth = at(input.fleet, 4);
  // The second and third positions must be submarines even when damage makes
  // one of them ineligible to participate.  A fourth submarine can substitute
  // for either damaged boat.  Public conditions: https://wikiwiki.jp/kancolle/大鯨
  if (!isSubmarine(second) || !isSubmarine(third)) return null;
  const eligibleSecond = submarineAttackEligible(second);
  const eligibleThird = submarineAttackEligible(third);
  const eligibleFourth = isSubmarine(fourth) && submarineAttackEligible(fourth);
  const selection = eligibleSecond && eligibleFourth
    ? { type: 302, participants: [second, fourth] }
    : eligibleThird && eligibleFourth
      ? { type: 301, participants: [third, fourth] }
      : eligibleSecond && eligibleThird
        ? { type: 300, participants: [second, third] }
        : null;
  if (!selection) return null;
  const chance = Math.min(0.95, 0.48 + Math.sqrt(Math.max(0, input.attacker.luck)) / 80);
  if (!input.chance(chance)) return null;
  const strikes = selection.participants.flatMap((participant, participantIndex) =>
    Array.from({ length: submarineAttackHitCount(participant, input) }, () => ({
      participant,
      modifier: 1.2 + participantIndex * 0.05,
      protocolType: selection.type
    }))
  );
  return {
    type: selection.type,
    name: "Submarine fleet attack",
    grouped: true,
    initiator: input.attacker,
    strikes,
    ...(!input.useItem95CommittedThisBattle ? { useItemId: 95 } : {}),
    extraAmmoFraction: 0
  };
}

function isSubmarine(unit: BattleUnit | undefined): unit is BattleUnit {
  return unit != null && unit.hp > 0 && SUBMARINE_TYPES.has(unit.shipType);
}

function submarineAttackEligible(unit: BattleUnit) {
  return unit.hp > unit.maxHp * 0.5;
}

function submarineAttackHitCount(unit: BattleUnit, input: ResolveSpecialAttackInput) {
  if (unit.level < 75) return 1;
  const hasSubmarineRadar = unit.equippedSlots.some((slot) =>
    Number(slot.slotMaster.api_type?.[2]) === 51
  );
  if (hasSubmarineRadar) return 2;
  return input.chance(0.5) ? 2 : 1;
}

function specialAttackActivationRate(
  definition: SpecialAttackDefinition,
  flagship: BattleUnit,
  participants: readonly BattleUnit[]
) {
  const averageLevel = participants.reduce((sum, unit) => sum + unit.level, 0) / participants.length;
  return Math.min(0.95, definition.activationBase + Math.sqrt(Math.max(0, flagship.luck)) / 100 + averageLevel / 2000);
}

function specialEquipmentModifier(unit: BattleUnit) {
  const types = unit.equippedSlots.map((slot) => Number(slot.slotMaster.api_type?.[2]) || 0);
  const apShell = types.includes(19) ? 0.08 : 0;
  const radar = types.some((type) => type === 12 || type === 13) ? 0.05 : 0;
  return 1 + apShell + radar;
}
