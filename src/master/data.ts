import { SHIPS, SLOT_ITEMS, SHIP_TYPES, EQUIP_TYPES } from "./generated-data.js";

export const masterData = {
  api_mst_ship: SHIPS,
  api_mst_slotitem: SLOT_ITEMS,
  api_mst_slotitem_equiptype: EQUIP_TYPES,
  api_mst_stype: SHIP_TYPES,
  api_mst_mission: [
    { api_id: 1, api_maparea_id: 1, api_name: "Practice Voyage", api_time: 15, api_deck_num: 2, api_difficulty: 1 },
    { api_id: 2, api_maparea_id: 1, api_name: "Long Distance Training", api_time: 30, api_deck_num: 2, api_difficulty: 1 }
  ],
  api_mst_maparea: [{ api_id: 1, api_name: "鎮守府海域", api_type: 0 }],
  api_mst_mapinfo: [
    {
      api_id: 1,
      api_maparea_id: 1,
      api_no: 1,
      api_name: "近海警備",
      api_level: 1,
      api_opetext: "Local offline training waters",
      api_infotext: "A deterministic first map for local experimentation.",
      api_item: [0, 0, 0, 0],
      api_max_maphp: null,
      api_required_defeat_count: null,
      api_sally_flag: [0, 0]
    }
  ],
  api_mst_furniture: [
    furnitureMaster(1, "Plain Floor", 0),
    furnitureMaster(2, "White Wall", 1),
    furnitureMaster(3, "Small Window", 2),
    furnitureMaster(4, "Simple Chest", 3),
    furnitureMaster(5, "Writing Desk", 4),
    furnitureMaster(6, "Local Object", 5)
  ],
  api_mst_furnituregraph: [],
  api_mst_useitem: [
    { api_id: 31, api_usetype: 0, api_category: 0, api_name: "燃料", api_description: ["艦隊運用に必要な資源です。"] },
    { api_id: 32, api_usetype: 0, api_category: 0, api_name: "弾薬", api_description: ["戦闘や補給に必要な資源です。"] },
    { api_id: 33, api_usetype: 0, api_category: 0, api_name: "鋼材", api_description: ["建造や修理に必要な資源です。"] },
    { api_id: 34, api_usetype: 0, api_category: 0, api_name: "ボーキサイト", api_description: ["航空機の運用に必要な資源です。"] },
    { api_id: 1, api_usetype: 2, api_category: 1, api_name: "Instant Repair", api_description: ["Repairs one ship instantly."] },
    { api_id: 2, api_usetype: 2, api_category: 1, api_name: "Instant Build", api_description: ["Completes one build instantly."] },
    { api_id: 3, api_usetype: 2, api_category: 1, api_name: "Dev Material", api_description: ["Used for crafting."] },
    { api_id: 4, api_usetype: 2, api_category: 1, api_name: "Improvement Material", api_description: ["Used for equipment improvement."] },
    { api_id: 49, api_usetype: 2, api_category: 1, api_name: "ドック開放キー", api_description: ["入渠ドックを開放するためのアイテムです。"] },
    { api_id: 54, api_usetype: 4, api_category: 1, api_name: "Mamiya", api_description: ["Restores fleet morale."] },
    { api_id: 55, api_usetype: 2, api_category: 1, api_name: "ケッコン指輪", api_description: ["艦娘とケッコンカッコカリするための指輪です。"] },
    { api_id: 59, api_usetype: 4, api_category: 1, api_name: "Irako", api_description: ["Restores ship morale."] },
    { api_id: 64, api_usetype: 2, api_category: 1, api_name: "補強増設", api_description: ["艦娘のスロットを増設するためのアイテムです。"] }
  ],
  api_mst_payitem: [],
  api_mst_bgm: [
    { api_id: 1, api_name: "母港", api_rarity: 1 },
    { api_id: 2, api_name: "海原越えて", api_rarity: 1 }
  ],
  api_mst_mapbgm: [{ api_id: 1, api_maparea_id: 1, api_no: 1, api_map_bgm: [1, 2], api_boss_bgm: [2, 2] }],
  api_mst_const: {
    api_parallel_quest_max: { api_string_value: "5", api_int_value: 5 },
    api_dpflag_quest: { api_string_value: "1", api_int_value: 1 }
  },
  api_mst_shipupgrade: [],
  api_mst_bgm_season: [],
  api_mst_equip_exslot: [],
  api_mst_equip_exslot_ship: {},
  api_mst_equip_limit_exslot: {},
  api_mst_equip_ship: [],
  api_mst_item_shop: { api_cabinet_1: [], api_cabinet_2: [] },
  api_mst_mapcell: [
    { api_id: 1, api_maparea_id: 1, api_mapinfo_no: 1, api_no: 1, api_color_no: 5 },
    { api_id: 2, api_maparea_id: 1, api_mapinfo_no: 1, api_no: 2, api_color_no: 6 }
  ]
};

export type MasterData = typeof masterData;

function furnitureMaster(api_id: number, api_title: string, api_type: number) {
  return {
    api_id,
    api_type,
    api_no: api_id,
    api_title,
    api_description: "Local starter furniture",
    api_rarity: 0,
    api_price: 0,
    api_saleflg: 0,
    api_season: 0
  };
}
