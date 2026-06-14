export type ShipSpeedEquipment = {
  masterId: number;
  improvement?: number;
};

const SPEED_SLOW = 5;
const SPEED_FAST = 10;
const SPEED_FAST_PLUS = 15;
const SPEED_FASTEST = 20;

const TURBINE_MASTER_ID = 33;
const ENHANCED_BOILER_MASTER_ID = 34;
const NEW_MODEL_BOILER_MASTER_ID = 87;
const YAMATO_CLASS_ID = 37;

export function effectiveShipSpeedValue(
  baseSpeed: number,
  classId: number,
  equipment: readonly ShipSpeedEquipment[]
) {
  const turbineCount = equipment.filter((item) => item.masterId === TURBINE_MASTER_ID).length;
  const enhancedBoilers = equipment.filter((item) => item.masterId === ENHANCED_BOILER_MASTER_ID);
  const newModelBoilers = equipment.filter((item) => item.masterId === NEW_MODEL_BOILER_MASTER_ID);
  const boilerCount = enhancedBoilers.length + newModelBoilers.length;

  if (turbineCount === 0 || boilerCount === 0) return baseSpeed;
  if (baseSpeed === SPEED_SLOW && classId === YAMATO_CLASS_ID) {
    return yamatoClassSpeed(enhancedBoilers.length, newModelBoilers);
  }

  const baseIndex = speedIndex(baseSpeed);
  const upgradeSteps = baseSpeed >= SPEED_FAST ? boilerCount : Math.max(1, boilerCount);
  return speedValue(Math.min(3, baseIndex + upgradeSteps));
}

function yamatoClassSpeed(
  enhancedBoilerCount: number,
  newModelBoilers: readonly ShipSpeedEquipment[]
) {
  const newModelBoilerCount = newModelBoilers.length;
  if (newModelBoilerCount >= 2 || (newModelBoilerCount >= 1 && enhancedBoilerCount >= 2)) {
    return SPEED_FASTEST;
  }
  if (
    (newModelBoilerCount >= 1 && enhancedBoilerCount >= 1) ||
    newModelBoilers.some((item) => (item.improvement ?? 0) >= 7)
  ) {
    return SPEED_FAST_PLUS;
  }
  return SPEED_FAST;
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
