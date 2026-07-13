export type ShipSpeedEquipment = {
  masterId: number;
  improvement?: number;
};

export type ShipSpeedIdentity = {
  masterId?: number;
  shipType?: number;
};

export type ShipSpeedGroup =
  | "fastA"
  | "fastB1"
  | "fastB2"
  | "fastC"
  | "slowA"
  | "slowB"
  | "slowC"
  | "none";

/**
 * Versioned community-mechanics snapshot used by routing and api_ship.api_soku.
 *
 * The game does not expose the latent speed group in master data.  The groups
 * and exceptions therefore have to be kept as an independently versioned rule
 * set instead of being inferred from api_soku alone.
 */
export const SHIP_SPEED_RULESET = Object.freeze({
  id: "kancolle-ship-speed-2026-04-26",
  revision: 206264,
  effectiveDate: "2026-04-26",
  source: "https://en.kancollewiki.net/w/index.php?title=Improving_Ship_Speed&oldid=206264"
});

const SPEED_SLOW = 5;
const SPEED_FAST = 10;
const SPEED_FAST_PLUS = 15;
const SPEED_FASTEST = 20;

const TURBINE_MASTER_ID = 33;
const ENHANCED_BOILER_MASTER_ID = 34;
const NEW_MODEL_BOILER_MASTER_ID = 87;

// Ship type ids from api_mst_stype.
const TYPE_DE = 1;
const TYPE_DD = 2;
const TYPE_CL = 3;
const TYPE_CLT = 4;
const TYPE_CA = 5;
const TYPE_CAV = 6;
const TYPE_CVL = 7;
const TYPE_FBB = 8;
const TYPE_BB = 9;
const TYPE_BBV = 10;
const TYPE_CV = 11;
const TYPE_SS = 13;
const TYPE_SSV = 14;
const TYPE_AO = 15;
const TYPE_AV = 16;
const TYPE_LHA = 17;
const TYPE_CVB = 18;
const TYPE_AR = 19;
const TYPE_AS = 20;
const TYPE_CT = 21;
const TYPE_AO_ALT = 22;

// Class ids from api_ctype.  A class rule is used only where every relevant
// remodel in the 2026-04-26 snapshot shares the same latent group.
const CLASS_KAGA = 3;
const CLASS_KONGOU = 6;
const CLASS_MOGAMI = 9;
const CLASS_SHOUHOU = 11;
const CLASS_CHITOSE = 15;
const CLASS_SOURYUU = 17;
const CLASS_SHIMAKAZE = 22;
const CLASS_HIRYUU = 25;
const CLASS_TONE = 31;
const CLASS_RYUUJOU = 32;
const CLASS_SHOUKAKU = 33;
const CLASS_YAMATO = 37;
const CLASS_AGANO = 41;
const CLASS_TAIHOU = 43;
const CLASS_UNRYUU = 53;
const CLASS_AKITSU_MARU = 45;
const CLASS_IOWA = 65;
const CLASS_GANGUT = 73;
const CLASS_TASHKENT = 81;
const CLASS_SENTAKA = 109;
const CLASS_NORGE = 133;
const CLASS_THONBURI = 137;

const FAST_A_MASTER_IDS = new Set([
  50, 229, // Shimakaze / Kai
  395, 516, // Tashkent / Kai
  507, // Mikuma Kai Ni Toku
  951, // Amatsukaze Kai Ni
  1031, // Hiryuu Kai San
  1035, 1040 // Fubuki Kai San / Go (Type 6)
]);

const FAST_B1_MASTER_IDS = new Set([
  181, 316, // Amatsukaze / Kai
  911 // Yamato Kai Ni (the heavy form remains Slow A)
]);

const FAST_B2_MASTER_IDS = new Set([
  74, 116, 117, 282, 555, 560, // Shouhou class
  76, 157, 281, // Ryuujou class
  108, 109, 291, 292, 296, 297, // Chitose class carrier forms
  888 // Ryuuhou Kai Ni (Kai Ni Bo is still slow)
]);

const FAST_C_MASTER_IDS = new Set([
  84, 278, 610, 646, 698, // Kaga forms
  115, 293, // Yuubari / Kai
  920 // Samuel B. Roberts Mk.II
]);

const SLOW_A_MASTER_IDS = new Set([
  541, 573, // Nagato/Mutsu Kai Ni
  894, 899, // Houshou Kai Ni / Sen
  916 // Yamato Kai Ni Juu
]);

const SLOW_B_MASTER_IDS = new Set([
  348, 451, // Mizuho
  372, 491, // Commandant Teste
  445, 450, // Akitsushima
  499, // Kamoi Kai
  561, 681, // Samuel B. Roberts / Kai
  623, // Yuubari Kai Ni Toku
  738, 998, // Norge class
  958, // Asahi Kai
  973, 978, // Thonburi class
  979 // Inagi Kai Ni
]);

const SLOW_C_MASTER_IDS = new Set([
  161, 166, // Akitsu Maru
  352, 460 // Hayasui
]);

const TURBINE_ONLY_FAST_MASTER_IDS = new Set([
  561, 681, // Samuel B. Roberts / Kai
  623 // Yuubari Kai Ni Toku
]);

const NEW_MODEL_BOILER_ONLY_FAST_MASTER_IDS = new Set([
  719, 881, 882, 887, // I-201 / I-203 forms
  894, 899, // Houshou Kai Ni / Sen
  979 // Inagi Kai Ni
]);

const NEW_MODEL_BOILER_SPEED_CAP = new Map<number, number>([
  [979, SPEED_FAST_PLUS]
]);

export function shipSpeedGroup(
  baseSpeed: number,
  classId: number,
  identity: ShipSpeedIdentity = {}
): ShipSpeedGroup {
  const masterId = Math.trunc(identity.masterId ?? 0);
  const shipType = Math.trunc(identity.shipType ?? 0);

  if (baseSpeed >= SPEED_FAST) {
    if (FAST_A_MASTER_IDS.has(masterId)) return "fastA";
    if (FAST_B1_MASTER_IDS.has(masterId)) return "fastB1";
    if (FAST_B2_MASTER_IDS.has(masterId)) return "fastB2";
    if (FAST_C_MASTER_IDS.has(masterId)) return "fastC";

    if (shipType === TYPE_CAV) return "fastA";
    if (shipType === TYPE_CA && (classId === CLASS_MOGAMI || classId === CLASS_TONE)) return "fastA";
    if ([TYPE_CV, TYPE_CVB, TYPE_CVL].includes(shipType)
      && [CLASS_SHOUKAKU, CLASS_TAIHOU].includes(classId)) return "fastA";
    if (shipType === TYPE_CVL && classId === CLASS_MOGAMI) return "fastA";
    if (shipType === TYPE_DD && [CLASS_SHIMAKAZE, CLASS_TASHKENT].includes(classId)) return "fastA";

    if (shipType === TYPE_FBB && [CLASS_KONGOU, CLASS_IOWA].includes(classId)) return "fastB1";
    if (shipType === TYPE_CV && [CLASS_SOURYUU, CLASS_HIRYUU, CLASS_UNRYUU].includes(classId)) return "fastB1";
    if (shipType === TYPE_CL && classId === CLASS_AGANO) return "fastB1";

    if (shipType === TYPE_AV) return "fastC";
    if (shipType === TYPE_CV && classId === CLASS_KAGA) return "fastC";

    if ([TYPE_FBB, TYPE_CV, TYPE_CVB, TYPE_CA, TYPE_CL, TYPE_CLT, TYPE_DD].includes(shipType)) {
      return "fastB2";
    }
    // Backward compatible but conservative default for callers that only have
    // api_soku/api_ctype.  It deliberately does not guess one of the stronger A/B1 groups.
    return "fastB2";
  }

  if (SLOW_A_MASTER_IDS.has(masterId)) return "slowA";
  if (SLOW_B_MASTER_IDS.has(masterId)) return "slowB";
  if (SLOW_C_MASTER_IDS.has(masterId)) return "slowC";

  if (classId === CLASS_YAMATO) return "slowA";
  if (shipType === TYPE_SS || shipType === TYPE_SSV || shipType === TYPE_AR) return "slowC";
  if (classId === CLASS_SENTAKA) return "slowC";
  if (classId === CLASS_AKITSU_MARU) return "slowC";
  if (classId === CLASS_GANGUT || classId === CLASS_NORGE || classId === CLASS_THONBURI) return "slowB";
  if ([TYPE_BB, TYPE_BBV, TYPE_CVL, TYPE_CT, TYPE_AS, TYPE_AO, TYPE_AO_ALT, TYPE_LHA].includes(shipType)) {
    return "slowB";
  }
  if (shipType === TYPE_DE) return "none";
  return "slowB";
}

export function effectiveShipSpeedValue(
  baseSpeed: number,
  classId: number,
  equipment: readonly ShipSpeedEquipment[],
  identity: ShipSpeedIdentity = {}
) {
  const group = shipSpeedGroup(baseSpeed, classId, identity);
  if (group === "none") return baseSpeed;

  const masterId = Math.trunc(identity.masterId ?? 0);
  const turbineCount = equipment.filter((item) => item.masterId === TURBINE_MASTER_ID).length;
  const enhancedBoilerCount = equipment.filter((item) => item.masterId === ENHANCED_BOILER_MASTER_ID).length;
  const newModelBoilers = equipment.filter((item) => item.masterId === NEW_MODEL_BOILER_MASTER_ID);
  const newModelBoilerCount = newModelBoilers.length;
  const improvedNewModelBoilerCount = newModelBoilers.filter((item) => (item.improvement ?? 0) >= 7).length;

  let result = baseSpeed;
  if (turbineCount > 0 && enhancedBoilerCount + newModelBoilerCount > 0) {
    result = speedForEngineSynergy(group, enhancedBoilerCount, newModelBoilerCount);
  } else if (turbineCount > 0 && TURBINE_ONLY_FAST_MASTER_IDS.has(masterId)) {
    result = SPEED_FAST;
  }

  // Since the 2023-07-07 engine update, a +13 boiler can provide a latent
  // speed fit bonus without the normal turbine/boiler synergy.
  if (group === "fastA") {
    result = addSpeedSteps(result, improvedNewModelBoilerCount);
  }
  if (group === "slowA" && turbineCount > 0) {
    result = addSpeedSteps(result, improvedNewModelBoilerCount);
  }
  if (newModelBoilerCount > 0 && NEW_MODEL_BOILER_ONLY_FAST_MASTER_IDS.has(masterId)) {
    result = Math.max(result, turbineCount > 0 ? SPEED_FAST_PLUS : SPEED_FAST);
  }

  return Math.min(NEW_MODEL_BOILER_SPEED_CAP.get(masterId) ?? SPEED_FASTEST, result);
}

function speedForEngineSynergy(
  group: ShipSpeedGroup,
  enhancedBoilerCount: number,
  newModelBoilerCount: number
) {
  const total = enhancedBoilerCount + newModelBoilerCount;
  if (total <= 0) return group.startsWith("fast") ? SPEED_FAST : SPEED_SLOW;

  if (group === "fastA") {
    return newModelBoilerCount >= 1 || enhancedBoilerCount >= 2 ? SPEED_FASTEST : SPEED_FAST_PLUS;
  }
  if (group === "fastB1") {
    return newModelBoilerCount >= 2 || (newModelBoilerCount >= 1 && enhancedBoilerCount >= 1)
      ? SPEED_FASTEST
      : SPEED_FAST_PLUS;
  }
  if (group === "fastB2") {
    return newModelBoilerCount >= 2
      || enhancedBoilerCount >= 3
      || (newModelBoilerCount >= 1 && enhancedBoilerCount >= 2)
      ? SPEED_FASTEST
      : SPEED_FAST_PLUS;
  }
  if (group === "fastC") return SPEED_FAST_PLUS;
  if (group === "slowA") {
    if (newModelBoilerCount >= 1 && total >= 3) return SPEED_FASTEST;
    if (newModelBoilerCount >= 2 || (newModelBoilerCount >= 1 && enhancedBoilerCount >= 1)) {
      return SPEED_FAST_PLUS;
    }
    return SPEED_FAST;
  }
  if (group === "slowB") {
    return newModelBoilerCount >= 2
      || enhancedBoilerCount >= 3
      || (newModelBoilerCount >= 1 && enhancedBoilerCount >= 2)
      ? SPEED_FAST_PLUS
      : SPEED_FAST;
  }
  if (group === "slowC") return SPEED_FAST;
  return SPEED_SLOW;
}

function addSpeedSteps(speed: number, steps: number) {
  return speedValue(Math.min(3, speedIndex(speed) + Math.max(0, steps)));
}

function speedIndex(speed: number) {
  if (speed >= SPEED_FASTEST) return 3;
  if (speed >= SPEED_FAST_PLUS) return 2;
  if (speed >= SPEED_FAST) return 1;
  return 0;
}

function speedValue(index: number) {
  return [SPEED_SLOW, SPEED_FAST, SPEED_FAST_PLUS, SPEED_FASTEST][index] ?? SPEED_SLOW;
}
