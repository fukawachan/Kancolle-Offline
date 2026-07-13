/**
 * Advanced battle mechanics are opt-in.  A field in a protocol response is not
 * evidence that the mechanic behind it has been implemented.
 */
export type AdvancedBattleCapability =
  | "landBaseWaves"
  | "landBaseRange"
  | "landAttackSpecialModifier"
  | "supportAttackTypes"
  | "supportAccuracy"
  | "aircraftProficiency"
  | "jetAssault"
  | "friendlyFleet"
  | "shipSpecialAttack"
  | "smokeScreen"
  | "barrageBalloon"
  | "fitGun";

export type CapabilityState = "enabled" | "evidence-gated" | "disabled";
export type CapabilityEvidenceLevel =
  | "protocol-fixture"
  | "published-formula"
  | "statistical-baseline"
  | "missing";

export type BattleCapabilityEvidence = {
  state: CapabilityState;
  evidence: CapabilityEvidenceLevel;
  source: string | null;
  note: string;
};

const CAPABILITY_MANIFEST = Object.freeze({
  landBaseWaves: {
    state: "enabled",
    evidence: "protocol-fixture",
    source: "captured api_req_combined_battle/battle response (2017-11-18)",
    note: "Each dispatched base produces two ordered response entries."
  },
  landBaseRange: {
    state: "evidence-gated",
    evidence: "published-formula",
    source: "equipment api_distance plus base distance bonus",
    note: "Dispatch is allowed only when the target supplies an explicit evidenced range."
  },
  landAttackSpecialModifier: {
    state: "evidence-gated",
    evidence: "missing",
    source: null,
    note: "The hook exists, but the production rule table is empty until per-aircraft evidence is added."
  },
  supportAttackTypes: {
    state: "enabled",
    evidence: "protocol-fixture",
    source: "captured api_support_flag/api_support_info responses",
    note: "Aerial, shelling, and torpedo support are represented independently."
  },
  supportAccuracy: {
    state: "enabled",
    evidence: "statistical-baseline",
    source: "configurable local statistical profile",
    note: "Misses are first-class outcomes; the baseline is not asserted as an exact server formula."
  },
  aircraftProficiency: {
    state: "enabled",
    evidence: "statistical-baseline",
    source: "published rank thresholds and configurable loss baseline",
    note: "Visible ranks and wipe-out reset are fixed; non-wipe loss is explicitly configurable."
  },
  jetAssault: disabled("The dedicated jet assault phase is excluded; daytime api_at_type 7 is carrier FBA/BBA/BA and is implemented separately."),
  friendlyFleet: disabled("Friendly-fleet response fields remain null; no synthetic fleet is generated."),
  shipSpecialAttack: {
    state: "enabled",
    evidence: "published-formula",
    source: "cached client protocol fixtures plus wikiwiki public battle/ship formula tables",
    note: "Types 100-106, 300-302 and 400/401 use a dedicated activation, participant, damage and sortie-usage model."
  },
  smokeScreen: disabled("Smoke activation and accuracy modifiers are not evidenced in this build."),
  barrageBalloon: disabled("Barrage-balloon event modifiers are not evidenced in this build."),
  fitGun: disabled("Gun-fit accuracy tables are not evidenced in this build.")
} satisfies Record<AdvancedBattleCapability, BattleCapabilityEvidence>);

const JET_EQUIPMENT_TYPES = new Set([56, 57, 58, 59, 91]);

export class UnsupportedBattleCapabilityError extends Error {
  constructor(
    readonly capability: AdvancedBattleCapability,
    readonly evidence: BattleCapabilityEvidence
  ) {
    super(`Battle capability ${capability} is ${evidence.state}: ${evidence.note}`);
    this.name = "UnsupportedBattleCapabilityError";
  }
}

export function battleCapabilityManifest(): Readonly<Record<AdvancedBattleCapability, BattleCapabilityEvidence>> {
  return CAPABILITY_MANIFEST;
}

export function battleCapability(capability: AdvancedBattleCapability) {
  return CAPABILITY_MANIFEST[capability];
}

export function battleCapabilityEnabled(capability: AdvancedBattleCapability) {
  return battleCapability(capability).state === "enabled";
}

export function requireBattleCapability(capability: AdvancedBattleCapability) {
  const evidence = battleCapability(capability);
  if (evidence.state !== "enabled") throw new UnsupportedBattleCapabilityError(capability, evidence);
  return evidence;
}

export function isJetEquipmentType(typeId: number) {
  return JET_EQUIPMENT_TYPES.has(Math.trunc(Number(typeId) || 0));
}

function disabled(note: string): BattleCapabilityEvidence {
  return { state: "disabled", evidence: "missing", source: null, note };
}
