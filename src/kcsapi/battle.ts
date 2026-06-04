import { masterData } from "../master/data.js";
import type { SaveState, Ship, SlotItem } from "../state/types.js";

export type BattleInput = {
  formation?: number;
};

type Side = 0 | 1;

type BattleUnit = {
  side: Side;
  position: number;
  apiIndex: number;
  shipId: number;
  masterId: number;
  level: number;
  hp: number;
  maxHp: number;
  firepower: number;
  torpedo: number;
  aa: number;
  armor: number;
  luck: number;
  range: number;
  ammoModifier: number;
  slots: number[];
  damageDealt: number;
};

export type HougekiPayload = {
  api_at_eflag: number[];
  api_at_list: number[];
  api_at_type: number[];
  api_df_list: number[][];
  api_si_list: number[][];
  api_cl_list: number[][];
  api_damage: number[][];
  api_sp_list?: number[];
  api_n_mother_list?: number[];
};

export type RaigekiPayload = {
  api_frai: number[];
  api_erai: number[];
  api_fdam: number[];
  api_edam: number[];
  api_fydam: number[];
  api_eydam: number[];
  api_fcl: number[];
  api_ecl: number[];
  api_frai_flag: number[];
  api_erai_flag: number[];
  api_fbak_flag: number[];
  api_ebak_flag: number[];
};

export type BattlePayload = Record<string, any> & {
  api_deck_id: number;
  api_dock_id: number;
  api_formation: [number, number, number];
  api_ship_ke: number[];
  api_hougeki1: HougekiPayload;
  api_raigeki: RaigekiPayload | null;
};

export type BattleRecord = {
  deckId: number;
  shipIds: number[];
  enemyIds: number[];
  formation: [number, number, number];
  before: {
    fNowHps: number[];
    eNowHps: number[];
  };
  after: {
    fNowHps: number[];
    eNowHps: number[];
  };
  phases: {
    hougeki1: HougekiPayload;
    hougeki2: HougekiPayload | null;
    hougeki3: HougekiPayload | null;
    raigeki: RaigekiPayload | null;
    night?: HougekiPayload;
  };
  result: BattleResultRecord;
};

export type BattleResultRecord = {
  rank: "S" | "A" | "B" | "C";
  mvp: number;
  getExp: number;
  baseExp: number;
  memberExp: number;
  dropShipId: number;
  dropShipName: string;
  dropShipType: string;
};

type DamageInput = {
  attackPower: number;
  armor: number;
  armorRoll: number;
  ammoModifier: number;
  targetHp?: number;
};

export function resolveDamage(input: DamageInput) {
  const targetHp = Math.max(0, Math.trunc(input.targetHp ?? Number.MAX_SAFE_INTEGER));
  const defense = input.armor * 0.7 + input.armorRoll * 0.6;
  const normalDamage = Math.floor((input.attackPower - defense) * input.ammoModifier);
  if (normalDamage > 0 && input.ammoModifier > 0) return Math.min(targetHp, normalDamage);
  if (targetHp <= 1) return 0;
  const scratch = Math.floor(targetHp * 0.06);
  return Math.max(1, Math.min(targetHp - 1, scratch));
}

export function createSortieBattle(save: SaveState, input: BattleInput = {}) {
  const deck = sortieDeck(save);
  const formation: [number, number, number] = [battleFormation(input), 1, 1];
  const seed = (save.sortieSession?.seed ?? 1) + safeNum(save.sortieSession?.state.battles, 0) * 9973 + formation[0] * 101;
  const rng = mulberry32(seed);
  const friendly = friendlyUnits(save, deck.shipIds);
  const enemy = enemyUnits(save.sortieSession?.node ?? 1);
  const beforeF = fixedHp(friendly);
  const beforeE = fixedHp(enemy);

  const hougeki1 = shellingPhase(friendly, enemy, formation[0], rng, "day");
  const raigeki = torpedoPhase(friendly, enemy, formation[0], rng);

  const afterF = fixedHp(friendly);
  const afterE = fixedHp(enemy);
  const result = battleResult(friendly, enemy);
  const record: BattleRecord = {
    deckId: deck.id,
    shipIds: fixedShipIds(deck.shipIds),
    enemyIds: fixedEnemyIds(enemy),
    formation,
    before: { fNowHps: beforeF, eNowHps: beforeE },
    after: { fNowHps: afterF, eNowHps: afterE },
    phases: {
      hougeki1,
      hougeki2: null,
      hougeki3: null,
      raigeki
    },
    result
  };

  return {
    payload: battlePayload(record, friendly, enemy),
    record
  };
}

export function createNightBattle(record: BattleRecord): { payload: Record<string, unknown>; record: BattleRecord } {
  const friendly = recordUnitsFrom(record, 0);
  const enemy = recordUnitsFrom(record, 1);
  const rng = mulberry32(record.deckId * 8191 + record.before.fNowHps.reduce((sum, hp) => sum + hp, 0));
  const hougeki = shellingPhase(friendly, enemy, record.formation[0], rng, "night");
  const nextRecord: BattleRecord = {
    ...record,
    after: {
      fNowHps: fixedHp(friendly),
      eNowHps: fixedHp(enemy)
    },
    phases: {
      ...record.phases,
      night: hougeki
    },
    result: battleResult(friendly, enemy)
  };
  return {
    payload: {
      api_deck_id: record.deckId,
      api_formation: record.formation,
      api_touch_plane: [-1, -1],
      api_flare_pos: [-1, -1],
      api_hougeki: hougeki,
      api_n_support_flag: 0,
      api_n_support_info: null
    },
    record: nextRecord
  };
}

export function createNightBattlePayload(record: BattleRecord) {
  return createNightBattle(record).payload;
}

export function battleResultPayload(record: BattleRecord) {
  return {
    api_ship_id: record.shipIds.filter((id) => id > 0),
    api_win_rank: record.result.rank,
    api_get_exp: record.result.getExp,
    api_mvp: record.result.mvp,
    api_member_lv: 1,
    api_member_exp: record.result.memberExp,
    api_get_base_exp: record.result.baseExp,
    api_get_ship: {
      api_ship_id: record.result.dropShipId,
      api_ship_type: record.result.dropShipType,
      api_ship_name: record.result.dropShipName,
      api_ship_getmes: "Local drop"
    },
    api_get_eventflag: 0,
    api_get_exmap_rate: 0
  };
}

function battlePayload(record: BattleRecord, friendly: BattleUnit[], enemy: BattleUnit[]): BattlePayload {
  const fMaxHps = fixedMaxHp(friendly);
  const eMaxHps = fixedMaxHp(enemy);
  return {
    api_deck_id: record.deckId,
    api_dock_id: record.deckId,
    api_formation: record.formation,
    api_ship_ke: record.enemyIds,
    api_ship_lv: fixedUnitValues(enemy, (unit) => unit.level, 0),
    api_f_nowhps: record.before.fNowHps,
    api_f_maxhps: fMaxHps,
    api_e_nowhps: record.before.eNowHps,
    api_e_maxhps: eMaxHps,
    api_nowhps: [-1, ...record.before.fNowHps, ...record.before.eNowHps],
    api_maxhps: [-1, ...fMaxHps, ...eMaxHps],
    api_midnight_flag: record.after.eNowHps.some((hp) => hp > 0) ? 1 : 0,
    api_eSlot: [[], [], [], [], [], []],
    api_fParam: fixedUnitValues(friendly, (unit) => [unit.firepower, unit.torpedo, unit.aa, unit.armor], [0, 0, 0, 0]),
    api_eParam: fixedUnitValues(enemy, (unit) => [unit.firepower, unit.torpedo, unit.aa, unit.armor], [0, 0, 0, 0]),
    api_search: [1, 1],
    api_stage_flag: [0, 0, 0],
    api_kouku: null,
    api_support_flag: 0,
    api_support_info: null,
    api_hougeki1: record.phases.hougeki1,
    api_hougeki2: record.phases.hougeki2,
    api_hougeki3: record.phases.hougeki3,
    api_raigeki: record.phases.raigeki
  };
}

function shellingPhase(friendly: BattleUnit[], enemy: BattleUnit[], formation: number, rng: () => number, phase: "day" | "night"): HougekiPayload {
  const payload = emptyHougeki(phase === "night");
  const friendlyOrder = attackOrder(friendly);
  const enemyOrder = attackOrder(enemy);
  const turns = Math.max(friendlyOrder.length, enemyOrder.length);
  for (let turn = 0; turn < turns; turn += 1) {
    if (friendlyOrder[turn]) appendShellingAttack(payload, friendlyOrder[turn], enemy, formation, rng, phase);
    if (enemyOrder[turn]) appendShellingAttack(payload, enemyOrder[turn], friendly, 1, rng, phase);
  }
  return payload;
}

function appendShellingAttack(
  payload: HougekiPayload,
  attacker: BattleUnit,
  targets: BattleUnit[],
  formation: number,
  rng: () => number,
  phase: "day" | "night"
) {
  if (attacker.hp <= 0) return;
  const target = firstAlive(targets);
  if (!target) return;

  const base = phase === "night" ? attacker.firepower + attacker.torpedo : attacker.firepower + 5;
  if (base <= 0) return;
  const preCap = base * formationModifier(formation, phase === "night" ? "night" : "shelling") * damageStateModifier(attacker);
  const capped = capAttack(preCap, phase === "night" ? 360 : 220);
  const damage = applyDamage(target, capped, attacker.ammoModifier, rng, attacker.side === 0 ? 1 : 0);
  attacker.damageDealt += damage;

  payload.api_at_eflag.push(attacker.side);
  payload.api_at_list.push(attacker.apiIndex);
  payload.api_at_type.push(0);
  payload.api_df_list.push([target.apiIndex]);
  payload.api_si_list.push([attacker.slots[0] ?? 1]);
  payload.api_cl_list.push([damage > 0 ? 1 : 0]);
  payload.api_damage.push([damage]);
  if (payload.api_sp_list) payload.api_sp_list.push(0);
  if (payload.api_n_mother_list) payload.api_n_mother_list.push(0);
}

function torpedoPhase(friendly: BattleUnit[], enemy: BattleUnit[], formation: number, rng: () => number): RaigekiPayload | null {
  const payload: RaigekiPayload = {
    api_frai: Array(6).fill(-1),
    api_erai: Array(6).fill(-1),
    api_fdam: Array(6).fill(0),
    api_edam: Array(6).fill(0),
    api_fydam: Array(6).fill(0),
    api_eydam: Array(6).fill(0),
    api_fcl: Array(6).fill(0),
    api_ecl: Array(6).fill(0),
    api_frai_flag: Array(6).fill(0),
    api_erai_flag: Array(6).fill(0),
    api_fbak_flag: Array(6).fill(0),
    api_ebak_flag: Array(6).fill(0)
  };
  let fired = false;
  for (const attacker of friendly) {
    if (attacker.hp <= 0 || attacker.torpedo <= 0 || damageState(attacker) >= 3) continue;
    const target = firstAlive(enemy);
    if (!target) continue;
    const attackerIdx = attacker.position - 1;
    const targetIdx = target.position - 1;
    const power = capAttack((attacker.torpedo + 5) * formationModifier(formation, "torpedo") * damageStateModifier(attacker), 180);
    const damage = applyDamage(target, power, attacker.ammoModifier, rng, 1);
    attacker.damageDealt += damage;
    payload.api_frai[attackerIdx] = target.position;
    payload.api_frai_flag[attackerIdx] = 1;
    payload.api_fydam[attackerIdx] = damage;
    payload.api_edam[targetIdx] += damage;
    payload.api_ecl[targetIdx] = damage > 0 ? 1 : 0;
    fired = true;
  }
  for (const attacker of enemy) {
    if (attacker.hp <= 0 || attacker.torpedo <= 0 || damageState(attacker) >= 3) continue;
    const target = firstAlive(friendly);
    if (!target) continue;
    const attackerIdx = attacker.position - 1;
    const targetIdx = target.position - 1;
    const power = capAttack((attacker.torpedo + 5) * damageStateModifier(attacker), 180);
    const damage = applyDamage(target, power, attacker.ammoModifier, rng, 0);
    attacker.damageDealt += damage;
    payload.api_erai[attackerIdx] = target.position;
    payload.api_erai_flag[attackerIdx] = 1;
    payload.api_eydam[attackerIdx] = damage;
    payload.api_fdam[targetIdx] += damage;
    payload.api_fcl[targetIdx] = damage > 0 ? 1 : 0;
    fired = true;
  }
  return fired ? payload : null;
}

function applyDamage(target: BattleUnit, attackPower: number, ammoModifier: number, rng: () => number, targetSide: Side) {
  const armorRoll = Math.floor(rng() * Math.max(1, Math.floor(target.armor)));
  const damage = resolveDamage({ attackPower, armor: target.armor, armorRoll, ammoModifier, targetHp: target.hp });
  const minHp = targetSide === 0 ? 1 : 0;
  target.hp = Math.max(minHp, target.hp - damage);
  return damage;
}

function battleResult(friendly: BattleUnit[], enemy: BattleUnit[]): BattleResultRecord {
  const enemyTotalHp = enemy.reduce((sum, unit) => sum + unit.maxHp, 0);
  const enemyRemainingHp = enemy.reduce((sum, unit) => sum + Math.max(0, unit.hp), 0);
  const sunk = enemy.filter((unit) => unit.hp <= 0).length;
  const damageRatio = enemyTotalHp > 0 ? (enemyTotalHp - enemyRemainingHp) / enemyTotalHp : 1;
  const rank = sunk === enemy.length ? "S" : damageRatio >= 0.7 ? "A" : damageRatio >= 0.4 ? "B" : "C";
  const mvp = [...friendly].sort((a, b) => b.damageDealt - a.damageDealt || a.position - b.position)[0]?.position ?? 1;
  const baseExp = rank === "S" ? 40 : rank === "A" ? 35 : rank === "B" ? 30 : 20;
  return {
    rank,
    mvp,
    baseExp,
    getExp: baseExp * 2,
    memberExp: baseExp * 2,
    dropShipId: 1,
    dropShipName: "Mutsuki",
    dropShipType: "Destroyer"
  };
}

function friendlyUnits(save: SaveState, shipIds: number[]) {
  return fixedShipIds(shipIds)
    .map((shipId, index) => {
      const ship = shipId > 0 ? save.ships.find((item) => item.id === shipId) : undefined;
      return ship ? friendlyUnit(ship, save.slotItems, index + 1) : null;
    })
    .filter((unit): unit is BattleUnit => Boolean(unit));
}

function friendlyUnit(ship: Ship, slotItems: SlotItem[], position: number): BattleUnit {
  const master = masterData.api_mst_ship.find((item) => item.api_id === ship.masterId);
  const slotMasters = ship.slotIds
    .filter((id) => id > 0)
    .map((id) => slotItems.find((item) => item.id === id))
    .filter((item): item is SlotItem => Boolean(item))
    .map((item) => masterData.api_mst_slotitem.find((slot) => slot.api_id === item.masterId))
    .filter((item): item is (typeof masterData.api_mst_slotitem)[number] => Boolean(item));
  const equipSum = (field: keyof (typeof masterData.api_mst_slotitem)[number]) =>
    slotMasters.reduce((sum, item) => sum + safeNum(item[field]), 0);
  const slots = slotMasters.map((item) => item.api_id);
  return {
    side: 0,
    position,
    apiIndex: position,
    shipId: ship.id,
    masterId: ship.masterId,
    level: ship.level,
    hp: ship.hp,
    maxHp: ship.maxHp,
    firepower: statValue(master?.api_houg) + equipSum("api_houg"),
    torpedo: statValue(master?.api_raig) + equipSum("api_raig"),
    aa: statValue(master?.api_tyku) + equipSum("api_tyku"),
    armor: statValue(master?.api_souk) + equipSum("api_souk"),
    luck: statValue(master?.api_luck) + equipSum("api_luck"),
    range: Math.max(safeNum(master?.api_leng, 1), ...slotMasters.map((item) => safeNum(item.api_leng, 0))),
    ammoModifier: ammoModifier(ship.ammo, ship.maxAmmo),
    slots: slots.length ? slots : [1],
    damageDealt: 0
  };
}

function enemyUnits(node: number) {
  const ids = node > 1 ? [1501, 1502] : [1501, 1502];
  return ids.map((id, index) => enemyUnit(id, index + 1));
}

function enemyUnit(masterId: number, position: number): BattleUnit {
  const hp = masterId === 1502 ? 20 : 20;
  return {
    side: 1,
    position,
    apiIndex: position + 6,
    shipId: 0,
    masterId,
    level: 1,
    hp,
    maxHp: hp,
    firepower: masterId === 1502 ? 6 : 5,
    torpedo: 0,
    aa: 0,
    armor: masterId === 1502 ? 6 : 5,
    luck: 0,
    range: 1,
    ammoModifier: 1,
    slots: [0],
    damageDealt: 0
  };
}

function recordUnitsFrom(record: BattleRecord, side: Side) {
  const hps = side === 0 ? record.after.fNowHps : record.after.eNowHps;
  const ids = side === 0 ? record.shipIds : record.enemyIds;
  return ids
    .map((id, index) => {
      if (id <= 0) return null;
      if (side === 1) {
        const unit = enemyUnit(id, index + 1);
        unit.hp = hps[index] ?? unit.maxHp;
        return unit;
      }
      const master = masterData.api_mst_ship.find((item) => item.api_id === id);
      const hp = hps[index] ?? statValue(master?.api_taik, 1);
      return {
        side,
        position: index + 1,
        apiIndex: index + 1,
        shipId: record.shipIds[index],
        masterId: id,
        level: 1,
        hp,
        maxHp: record.before.fNowHps[index] || hp,
        firepower: statValue(master?.api_houg),
        torpedo: statValue(master?.api_raig),
        aa: statValue(master?.api_tyku),
        armor: statValue(master?.api_souk),
        luck: statValue(master?.api_luck),
        range: safeNum(master?.api_leng, 1),
        ammoModifier: 1,
        slots: [1],
        damageDealt: 0
      } satisfies BattleUnit;
    })
    .filter((unit): unit is BattleUnit => Boolean(unit));
}

function emptyHougeki(night: boolean): HougekiPayload {
  return {
    api_at_eflag: [],
    api_at_list: [],
    api_at_type: [],
    api_df_list: [],
    api_si_list: [],
    api_cl_list: [],
    api_damage: [],
    ...(night ? { api_sp_list: [], api_n_mother_list: [] } : {})
  };
}

function attackOrder(units: BattleUnit[]) {
  return units.filter((unit) => unit.hp > 0).sort((a, b) => b.range - a.range || a.position - b.position);
}

function firstAlive(units: BattleUnit[]) {
  return units.find((unit) => unit.hp > 0);
}

function capAttack(value: number, cap: number) {
  return value > cap ? cap + Math.sqrt(value - cap) : value;
}

function formationModifier(formation: number, phase: "shelling" | "torpedo" | "night") {
  if (phase === "night") return 1;
  const shelling: Record<number, number> = { 1: 1, 2: 0.8, 3: 0.7, 4: 0.6, 5: 0.6 };
  const torpedo: Record<number, number> = { 1: 1, 2: 0.8, 3: 0.7, 4: 0.6, 5: 0.6 };
  return (phase === "shelling" ? shelling : torpedo)[formation] ?? 1;
}

function damageState(unit: BattleUnit) {
  if (unit.hp <= 0) return 4;
  if (unit.hp <= unit.maxHp * 0.25) return 3;
  if (unit.hp <= unit.maxHp * 0.5) return 2;
  if (unit.hp <= unit.maxHp * 0.75) return 1;
  return 0;
}

function damageStateModifier(unit: BattleUnit) {
  const state = damageState(unit);
  if (state >= 3) return 0.4;
  if (state === 2) return 0.7;
  return 1;
}

function ammoModifier(ammo: number, maxAmmo: number) {
  if (maxAmmo <= 0) return 1;
  return Math.min(1, Math.floor((Math.max(0, ammo) / maxAmmo) * 100) / 50);
}

function battleFormation(input: BattleInput) {
  return Math.max(1, Math.min(5, Math.trunc(safeNum(input.formation, 1))));
}

function sortieDeck(save: SaveState) {
  return save.decks.find((deck) => deck.id === save.sortieSession?.deckId) || save.decks[0];
}

function fixedShipIds(shipIds: number[]) {
  return [...shipIds, ...Array(6).fill(-1)].slice(0, 6).map((id) => (id > 0 ? id : -1));
}

function fixedEnemyIds(enemy: BattleUnit[]) {
  return [...enemy.map((unit) => unit.masterId), ...Array(6).fill(-1)].slice(0, 6);
}

function fixedHp(units: BattleUnit[]) {
  return fixedUnitValues(units, (unit) => Math.max(0, Math.trunc(unit.hp)), 0);
}

function fixedMaxHp(units: BattleUnit[]) {
  return fixedUnitValues(units, (unit) => unit.maxHp, 0);
}

function fixedUnitValues<T>(units: BattleUnit[], pick: (unit: BattleUnit) => T, fill: T): T[] {
  const byPosition = new Map(units.map((unit) => [unit.position, pick(unit)] as const));
  return Array.from({ length: 6 }, (_value, index) => byPosition.get(index + 1) ?? fill);
}

function statValue(value: unknown, fallback = 0) {
  if (Array.isArray(value)) return safeNum(value[0], fallback);
  return safeNum(value, fallback);
}

function safeNum(value: unknown, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function mulberry32(seed: number) {
  let value = seed >>> 0;
  return () => {
    value += 0x6d2b79f5;
    let t = value;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
