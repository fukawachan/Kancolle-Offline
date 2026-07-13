import {
  EQUIP_EXSLOT,
  EQUIP_EXSLOT_SHIP,
  EQUIP_LIMIT_EXSLOT,
  EQUIP_SHIP,
  EQUIP_TYPES,
  FURNITURE,
  SHIPS,
  SHIP_TYPES,
  SHIP_UPGRADES,
  SLOT_ITEMS
} from "./generated-data.js";
import {
  EXPEDITION_MASTERS,
  EXPEDITION_USEITEM_MASTERS,
} from "./expedition-data.js";
import {
  SHOP_ITEM_SHOP,
  SHOP_PAYITEM_MASTERS,
} from "./shop-data.js";
import {
  assertPlayerShipStatGrowthCoverage,
  hasPlayerShipStatGrowthBounds
} from "./ship-stat-growth.js";
import { normalMapBgmOverride, normalMapMasterOverride } from "./map-progress.js";

export function mapMasterId(areaId: number, mapNo: number) {
  return areaId * 10 + mapNo;
}

const MAP_AREAS = [
  { api_id: 1, api_name: "鎮守府海域", api_type: 0 },
  { api_id: 2, api_name: "南西諸島海域", api_type: 0 },
  { api_id: 3, api_name: "北方海域", api_type: 0 },
  { api_id: 4, api_name: "西方海域", api_type: 0 },
  { api_id: 5, api_name: "南方海域", api_type: 0 },
  { api_id: 6, api_name: "中部海域", api_type: 0 },
  { api_id: 7, api_name: "南西海域", api_type: 0 }
];

const NORMAL_MAP_INFOS = [
  mapMaster(1, 1, "鎮守府正面海域", 1, "近海警備", "鎮守府正面近海の<br>警備に出動せよ！"),
  mapMaster(1, 2, "南西諸島沖", 1, "南西諸島沖警備"),
  mapMaster(1, 3, "製油所地帯沿岸", 2, "海上護衛作戦"),
  mapMaster(1, 4, "南西諸島防衛線", 3, "南1号作戦"),
  mapMaster(1, 5, "鎮守府近海", 5, "鎮守府近海対潜哨戒", undefined, 4),
  mapMaster(1, 6, "鎮守府近海航路", 5, "輸送船団護衛作戦", undefined, 7),
  mapMaster(2, 1, "南西諸島近海", 3, "南西諸島哨戒"),
  mapMaster(2, 2, "バシー海峡", 4, "柳作戦"),
  mapMaster(2, 3, "東部オリョール海", 5, "オリョール哨戒"),
  mapMaster(2, 4, "沖ノ島海域", 6, "あ号艦隊決戦"),
  mapMaster(2, 5, "沖ノ島沖", 8, "沖ノ島沖戦闘哨戒", undefined, 4),
  mapMaster(3, 1, "モーレイ海", 4, "モーレイ海哨戒"),
  mapMaster(3, 2, "キス島沖", 5, "キス島撤退作戦"),
  mapMaster(3, 3, "アルフォンシーノ方面", 7, "アルフォンシーノ方面進出"),
  mapMaster(3, 4, "北方海域全域", 9, "北方海域艦隊決戦"),
  mapMaster(3, 5, "北方AL海域", 9, "北方海域戦闘哨戒", undefined, 4),
  mapMaster(4, 1, "ジャム島沖", 5, "ジャム島攻略作戦"),
  mapMaster(4, 2, "カレー洋海域", 6, "カレー洋制圧戦"),
  mapMaster(4, 3, "リランカ島", 7, "リランカ島空襲"),
  mapMaster(4, 4, "カスガダマ島", 8, "カスガダマ沖海戦", undefined, 4),
  mapMaster(4, 5, "カレー洋リランカ島沖", 9, "深海東洋艦隊漸減作戦", undefined, 5),
  mapMaster(5, 1, "南方海域前面", 8, "南方海域進出作戦"),
  mapMaster(5, 2, "珊瑚諸島沖", 9, "珊瑚諸島沖海戦", undefined, 4),
  mapMaster(5, 3, "サブ島沖海域", 9, "第一次サーモン沖海戦", undefined, 5),
  mapMaster(5, 4, "サーモン海域", 10, "東京急行", undefined, 5),
  mapMaster(5, 5, "サーモン海域北方", 12, "第二次サーモン海戦", undefined, 5),
  requireNormalMapMasterOverride(56),
  mapMaster(6, 1, "中部海域哨戒線", 8, "潜水艦作戦"),
  mapMaster(6, 2, "MS諸島沖", 9, "MS諸島防衛戦", undefined, 3),
  mapMaster(6, 3, "グアノ環礁沖海域", 7, "K作戦", undefined, 4),
  mapMaster(6, 4, "中部北海域ピーコック島沖", 9, "離島再攻略作戦", undefined, 5),
  mapMaster(6, 5, "KW環礁沖海域", 7, "空母機動部隊迎撃戦", undefined, 6),
  mapMaster(7, 1, "ブルネイ泊地沖", 5, "ブルネイ泊地沖哨戒", undefined, 3),
  mapMaster(7, 2, "タウイタウイ泊地沖", 8, "セレベス海戦闘哨戒", undefined, 3),
  mapMaster(7, 3, "ペナン島沖", 8, "マラッカ海峡を抜けて", undefined, 3),
  mapMaster(7, 4, "昭南本土航路", 9, "ヒ船団海上護衛作戦", undefined, 5),
  mapMaster(7, 5, "ジャワ島沖", 11, "スラバヤ沖海戦・バタビア沖海戦", undefined, 2)
];

const NORMAL_MAP_BGM = NORMAL_MAP_INFOS.map((map) => ({
  ...(normalMapBgmOverride(map.api_id) ?? {
    api_id: map.api_id,
    api_maparea_id: map.api_maparea_id,
    api_no: map.api_no,
    api_moving_bgm: 0,
    api_map_bgm: [0, 0],
    api_boss_bgm: [0, 0]
  })
}));

const FALLBACK_MAP_CELLS = NORMAL_MAP_INFOS.flatMap((map) => [
  mapCell(map.api_maparea_id, map.api_no, 0, 0),
  mapCell(map.api_maparea_id, map.api_no, 1, 5)
]);

const PLAYABLE_SHIPS = SHIPS.filter((ship) => hasPlayerShipStatGrowthBounds(ship.api_id));

export const masterData = {
  api_mst_ship: PLAYABLE_SHIPS,
  api_mst_slotitem: SLOT_ITEMS,
  api_mst_slotitem_equiptype: EQUIP_TYPES,
  api_mst_stype: SHIP_TYPES,
  api_mst_mission: EXPEDITION_MASTERS,
  api_mst_maparea: MAP_AREAS,
  api_mst_mapinfo: NORMAL_MAP_INFOS,
  api_mst_furniture: FURNITURE,
  api_mst_furnituregraph: [],
  api_mst_useitem: EXPEDITION_USEITEM_MASTERS,
  api_mst_payitem: SHOP_PAYITEM_MASTERS,
  api_mst_bgm: [
    { api_id: 1, api_name: "母港", api_rarity: 1 },
    { api_id: 2, api_name: "海原越えて", api_rarity: 1 }
  ],
  api_mst_mapbgm: NORMAL_MAP_BGM,
  api_mst_const: {
    api_parallel_quest_max: { api_string_value: "5", api_int_value: 5 },
    api_dpflag_quest: { api_string_value: "1", api_int_value: 1 },
    api_boko_max_ships: { api_string_value: "", api_int_value: 740 }
  },
  api_mst_shipupgrade: SHIP_UPGRADES,
  api_mst_bgm_season: [],
  api_mst_equip_exslot: EQUIP_EXSLOT,
  api_mst_equip_exslot_ship: EQUIP_EXSLOT_SHIP,
  api_mst_equip_limit_exslot: EQUIP_LIMIT_EXSLOT,
  api_mst_equip_ship: EQUIP_SHIP,
  api_mst_item_shop: SHOP_ITEM_SHOP,
  api_mst_mapcell: FALLBACK_MAP_CELLS
};

// Player masters are playable only when the level-growth source contains all
// three hidden growth bounds. Refuse startup rather than falling back to ship
// type or level-shaped guesses.
assertPlayerShipStatGrowthCoverage(PLAYABLE_SHIPS.map((ship) => ship.api_id));

export type MasterData = typeof masterData;

function mapMaster(
  areaId: number,
  mapNo: number,
  name: string,
  level: number,
  operation: string,
  infoText = "艦隊を同海域に展開し、敵艦隊を捕捉撃滅せよ！",
  requiredDefeatCount: number | null = null
) {
  return {
    api_id: mapMasterId(areaId, mapNo),
    api_maparea_id: areaId,
    api_no: mapNo,
    api_name: name,
    api_level: level,
    api_opetext: operation,
    api_infotext: infoText,
    api_item: [0, 0, 0, 0],
    api_max_maphp: null,
    api_required_defeat_count: requiredDefeatCount,
    api_sally_flag: [1, 0, 0]
  };
}

function mapCell(areaId: number, mapNo: number, cellNo: number, colorNo: number) {
  return {
    api_id: mapMasterId(areaId, mapNo) * 100 + cellNo,
    api_maparea_id: areaId,
    api_mapinfo_no: mapNo,
    api_no: cellNo,
    api_color_no: colorNo
  };
}

function requireNormalMapMasterOverride(mapId: number) {
  const master = normalMapMasterOverride(mapId);
  if (!master) throw new Error(`Missing versioned normal-map master ${mapId}`);
  return { ...master };
}
