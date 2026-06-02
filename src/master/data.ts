export const masterData = {
  api_mst_ship: [
    shipMaster(1, "Mutsuki", "睦月", 2, 13, 15, 15),
    shipMaster(2, "Kisaragi", "如月", 2, 13, 15, 15),
    shipMaster(9, "Fubuki", "吹雪", 2, 15, 20, 20),
    shipMaster(10, "Shirayuki", "白雪", 2, 15, 20, 20),
    shipMaster(11, "Miyuki", "深雪", 2, 15, 20, 20),
    shipMaster(54, "Sendai", "川内", 3, 26, 25, 25),
    shipMaster(77, "Ise", "伊勢", 9, 74, 85, 120)
  ],
  api_mst_slotitem: [
    slotMaster(1, "12cm Single Gun Mount", "12cm単装砲", 1, 1, [1, 0, 0, 0]),
    slotMaster(2, "12.7cm Twin Gun Mount", "12.7cm連装砲", 1, 1, [2, 0, 0, 0]),
    slotMaster(3, "10cm Twin High-angle Gun Mount", "10cm連装高角砲", 1, 16, [2, 0, 0, 7]),
    slotMaster(4, "14cm Single Gun Mount", "14cm単装砲", 2, 2, [2, 0, 0, 0]),
    slotMaster(10, "12.7cm Twin High-angle Gun Mount", "12.7cm連装高角砲", 4, 16, [2, 0, 0, 4]),
    slotMaster(37, "7.7mm Machine Gun", "7.7mm機銃", 21, 15, [0, 0, 0, 2]),
    slotMaster(46, "Type 93 Passive Sonar", "九三式水中聴音機", 14, 18, [0, 0, 0, 0])
  ],
  api_mst_slotitem_equiptype: [
    { api_id: 1, api_name: "Small Caliber Main Gun", api_show_flg: 1 },
    { api_id: 2, api_name: "Medium Caliber Main Gun", api_show_flg: 1 },
    { api_id: 4, api_name: "Secondary Gun", api_show_flg: 1 },
    { api_id: 14, api_name: "Sonar", api_show_flg: 1 },
    { api_id: 21, api_name: "Anti-Air Machine Gun", api_show_flg: 1 }
  ],
  api_mst_stype: [
    { api_id: 2, api_sortno: 1, api_name: "Destroyer", api_scnt: 1, api_kcnt: 2, api_equip_type: {} },
    { api_id: 3, api_sortno: 2, api_name: "Light Cruiser", api_scnt: 1, api_kcnt: 2, api_equip_type: {} },
    { api_id: 9, api_sortno: 6, api_name: "Battleship", api_scnt: 1, api_kcnt: 2, api_equip_type: {} }
  ],
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

function shipMaster(
  api_id: number,
  api_yomi: string,
  api_name: string,
  api_stype: number,
  api_taik: number,
  api_fuel_max: number,
  api_bull_max: number
) {
  return {
    api_id,
    api_sortno: api_id,
    api_sort_id: api_id,
    api_name,
    api_yomi,
    api_stype,
    api_ctype: 1,
    api_afterlv: 20,
    api_aftershipid: 0,
    api_taik: [api_taik, api_taik + 10],
    api_souk: [5, 30],
    api_houg: [5, 40],
    api_raig: [15, 70],
    api_tyku: [5, 40],
    api_luck: [10, 49],
    api_leng: 1,
    api_slot_num: 3,
    api_maxeq: [0, 0, 0, 0, 0],
    api_buildtime: 18,
    api_broken: [1, 1, 4, 1],
    api_powup: [1, 1, 0, 1],
    api_backs: 1,
    api_getmes: "",
    api_fuel_max,
    api_bull_max,
    api_voicef: 1
  };
}

function slotMaster(api_id: number, api_yomi: string, api_name: string, equipType: number, icon: number, api_houg: number[]) {
  return {
    api_id,
    api_sortno: api_id,
    api_name,
    api_yomi,
    api_type: buildApiType(equipType, icon),
    api_taik: 0,
    api_souk: 0,
    api_houg: api_houg[0],
    api_raig: api_houg[1],
    api_soku: 0,
    api_baku: 0,
    api_tyku: api_houg[3] ?? 0,
    api_tais: 0,
    api_atap: 0,
    api_houm: 0,
    api_raim: 0,
    api_houk: 0,
    api_raik: 0,
    api_bakk: 0,
    api_saku: 0,
    api_sakb: 0,
    api_luck: 0,
    api_leng: 1,
    api_rare: 1,
    api_broken: [1, 1, 1, 1],
    api_info: "",
    api_usebull: "0",
    api_version: 1,
    api_cost: null,
    api_distance: null
  };
}

function buildApiType(equipType: number, icon: number): number[] {
  switch (equipType) {
    case 1: return [1, 1, 1, icon, 0];       // Small Caliber Main Gun
    case 2: return [1, 2, 2, icon, 0];       // Medium Caliber Main Gun
    case 4: return [4, 4, 4, icon, 0];       // Secondary Gun
    case 14: return [7, 10, 14, icon, 0];    // Sonar
    case 21: return [21, 21, 21, icon, 0];   // Anti-Aircraft Gun
    default: return [equipType, equipType, equipType, icon, 0];
  }
}

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
