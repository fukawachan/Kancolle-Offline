import { masterData } from "../master/data.js";
import type { SaveState } from "../state/types.js";

export type TransportVictoryRank = "S" | "A" | "B" | "C" | "D" | "E";

export type TransportLandingShip = {
  shipId: number;
  masterId: number;
  shipType: number;
  hp: number;
  maxHp: number;
  equipmentMasterIds: readonly number[];
};

export type TransportLandingSnapshot = {
  ships: readonly TransportLandingShip[];
  sRankPoints: number;
};

export const TRANSPORT_POINT_EVIDENCE = Object.freeze({
  level: "exact" as const,
  source: "https://wikiwiki.jp/kancolle/%E5%8D%97%E6%96%B9%E6%B5%B7%E5%9F%9F/5-6",
  checkedAt: "2026-07-12",
  detail: "Published per-ship/per-equipment TP table; A rank is floor(S rank total * 0.7)"
});

const SHIP_TYPE_S_POINTS = new Map<number, number>([
  [2, 5],  // DD
  [3, 2],  // CL
  [6, 4],  // CAV
  [10, 7], // BBV
  [14, 1], // SSV
  [15, 15],
  [16, 9], // AV
  [17, 12], // LHA
  [20, 7], // AS
  [21, 6], // CT
  [22, 15]
]);
const KINU_KAI_NI_MASTER_ID = 487;
const KINU_KAI_NI_INNATE_BONUS = 8;
const DRUM_CAN_MASTER_ID = 75;
const DRUM_CAN_POINTS = 5;
const LANDING_CRAFT_EQUIP_TYPE = 24;
const LANDING_CRAFT_POINTS = 8;
const AMPHIBIOUS_TANK_EQUIP_TYPE = 46;
const AMPHIBIOUS_TANK_POINTS = 2;
const COMBAT_RATION_EQUIP_TYPE = 43;
const COMBAT_RATION_POINTS = 1;

export function buildTransportLandingSnapshot(
  save: SaveState,
  shipIds: readonly number[]
): TransportLandingSnapshot {
  const uniqueIds = [...new Set(shipIds.filter((shipId) => Number.isInteger(shipId) && shipId > 0))];
  const ships = uniqueIds.map((shipId): TransportLandingShip => {
    const ship = save.ships.find((candidate) => candidate.id === shipId);
    if (!ship) throw new Error(`Transport landing references unknown ship ${shipId}`);
    const master = masterData.api_mst_ship.find((candidate) => candidate.api_id === ship.masterId);
    if (!master) throw new Error(`Transport landing ship ${shipId} has unknown master ${ship.masterId}`);
    const equipmentMasterIds = [...ship.slotIds, ship.exSlotId]
      .filter((slotItemId) => slotItemId > 0)
      .map((slotItemId) => {
        const item = save.slotItems.find((candidate) => candidate.id === slotItemId);
        if (!item) throw new Error(`Transport landing ship ${shipId} references missing slot item ${slotItemId}`);
        return item.masterId;
      });
    return {
      shipId,
      masterId: ship.masterId,
      shipType: Number(master.api_stype),
      hp: ship.hp,
      maxHp: ship.maxHp,
      equipmentMasterIds
    };
  });
  return Object.freeze({
    ships: Object.freeze(ships.map((ship) => Object.freeze({
      ...ship,
      equipmentMasterIds: Object.freeze([...ship.equipmentMasterIds])
    }))),
    sRankPoints: transportSPoints(ships)
  });
}

export function transportPointsForRank(
  snapshot: Pick<TransportLandingSnapshot, "sRankPoints">,
  rank: TransportVictoryRank | string | undefined
) {
  const sPoints = Math.max(0, Math.trunc(Number(snapshot.sRankPoints)));
  if (rank === "S") return sPoints;
  if (rank === "A") return Math.floor(sPoints * 0.7);
  return 0;
}

export function transportSPoints(ships: readonly TransportLandingShip[]) {
  let total = 0;
  let kinuBonusApplied = false;
  for (const ship of ships) {
    // Ships already heavily damaged at the landing point carry no TP. Damage
    // taken in the subsequent boss battle does not mutate this snapshot.
    if (ship.maxHp <= 0 || ship.hp * 4 <= ship.maxHp) continue;
    total += SHIP_TYPE_S_POINTS.get(Math.trunc(ship.shipType)) ?? 0;
    if (!kinuBonusApplied && ship.masterId === KINU_KAI_NI_MASTER_ID) {
      total += KINU_KAI_NI_INNATE_BONUS;
      kinuBonusApplied = true;
    }
    for (const masterId of ship.equipmentMasterIds) {
      const master = masterData.api_mst_slotitem.find((candidate) => candidate.api_id === masterId);
      if (!master) throw new Error(`Transport landing references unknown equipment master ${masterId}`);
      const equipType = Math.trunc(Number(master.api_type?.[2]));
      if (master.api_id === DRUM_CAN_MASTER_ID) total += DRUM_CAN_POINTS;
      else if (equipType === LANDING_CRAFT_EQUIP_TYPE) total += LANDING_CRAFT_POINTS;
      else if (equipType === AMPHIBIOUS_TANK_EQUIP_TYPE) total += AMPHIBIOUS_TANK_POINTS;
      else if (equipType === COMBAT_RATION_EQUIP_TYPE) total += COMBAT_RATION_POINTS;
    }
  }
  return total;
}
