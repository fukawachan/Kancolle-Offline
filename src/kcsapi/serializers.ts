import { masterData } from "../master/data.js";
import type { ResourceManifest } from "../resources/types.js";
import type {
  BuildDock,
  Deck,
  FurnitureState,
  Materials,
  Player,
  Quest,
  RepairDock,
  SaveState,
  Ship,
  SlotItem
} from "../state/types.js";

export function toBasic(player: Player, furniture?: FurnitureState, resourceManifest?: ResourceManifest) {
  return {
    api_member_id: player.id,
    api_nickname: player.nickname,
    api_nickname_id: player.nickname,
    api_active_flag: 1,
    api_starttime: Date.now(),
    api_level: player.level,
    api_rank: 1,
    api_experience: 0,
    api_fleetname: null,
    api_comment: player.comment,
    api_comment_id: player.comment,
    api_max_chara: 300,
    api_max_slotitem: 500,
    api_max_kagu: 200,
    api_playtime: 0,
    api_tutorial: player.tutorialProgress,
    api_furniture: toBasicFurniture(furniture, resourceManifest),
    api_count_deck: 4,
    api_count_kdock: 4,
    api_count_ndock: 4,
    api_fcoin: 200,
    api_st_win: 0,
    api_st_lose: 0,
    api_ms_count: 0,
    api_ms_success: 0,
    api_pt_win: 0,
    api_pt_lose: 0,
    api_pt_challenged: 0,
    api_pt_challenged_win: 0,
    api_firstflag: 1,
    api_tutorial_progress: player.tutorialProgress,
    api_pvp: [0, 0],
    api_medals: 0,
    api_large_dock: 1
  };
}

export function toMaterials(materials: Materials) {
  return [
    material(1, materials.fuel),
    material(2, materials.ammo),
    material(3, materials.steel),
    material(4, materials.bauxite),
    material(5, materials.buildKit),
    material(6, materials.repairKit),
    material(7, materials.devmat),
    material(8, materials.screw)
  ];
}

export function toShip(ship: Ship) {
  const master = masterData.api_mst_ship.find((item) => item.api_id === ship.masterId);
  const slot = [...ship.slotIds, ...Array(5).fill(-1)].slice(0, 5);
  return {
    api_id: ship.id,
    api_sortno: master?.api_sortno ?? ship.masterId,
    api_ship_id: ship.masterId,
    api_lv: ship.level,
    api_exp: [ship.exp, 100, 0],
    api_nowhp: ship.hp,
    api_maxhp: ship.maxHp,
    api_leng: master?.api_leng ?? 1,
    api_slot: slot,
    api_onslot: [0, 0, 0, 0, 0],
    api_kyouka: [0, 0, 0, 0, 0],
    api_backs: master?.api_backs ?? 1,
    api_fuel: ship.fuel,
    api_bull: ship.ammo,
    api_slotnum: 3,
    api_ndock_time: 0,
    api_ndock_item: [0, 0],
    api_srate: 0,
    api_cond: ship.condition,
    api_karyoku: [5, 40],
    api_raisou: [15, 70],
    api_taiku: [5, 40],
    api_soukou: [5, 30],
    api_kaihi: [10, 49],
    api_taisen: [10, 49],
    api_sakuteki: [5, 30],
    api_lucky: [10, 49],
    api_locked: ship.locked,
    api_locked_equip: 0,
    api_sally_area: 0,
    api_sp_effect_items: [],
    api_slot_ex: ship.exSlotId
  };
}

export function toSlotItem(item: SlotItem) {
  return {
    api_id: item.id,
    api_slotitem_id: item.masterId,
    api_locked: item.locked,
    api_level: item.level,
    api_alv: item.proficiency
  };
}

export function toDeck(deck: Deck) {
  const shipIds = [...deck.shipIds, ...Array(6).fill(-1)].slice(0, 6);
  return {
    api_member_id: 1,
    api_id: deck.id,
    api_name: deck.name,
    api_name_id: "",
    api_mission: [deck.missionState.state, deck.missionState.missionId, deck.missionState.completeTime, 0],
    api_flagship: shipIds.find((id) => id > 0) || -1,
    api_ship: shipIds
  };
}

export function toRepairDock(dock: RepairDock) {
  return {
    api_member_id: 1,
    api_id: dock.id,
    api_state: dock.state,
    api_ship_id: dock.shipId,
    api_complete_time: dock.completeTime,
    api_complete_time_str: dock.completeTime ? new Date(dock.completeTime).toISOString() : "0",
    api_item1: 0,
    api_item2: 0,
    api_item3: 0,
    api_item4: 0
  };
}

export function toBuildDock(dock: BuildDock) {
  return {
    api_id: dock.id,
    api_state: dock.state,
    api_created_ship_id: dock.resultMasterId,
    api_complete_time: dock.completeTime,
    api_complete_time_str: dock.completeTime ? new Date(dock.completeTime).toISOString() : "0",
    api_item1: Number(dock.recipe.api_item1 || 0),
    api_item2: Number(dock.recipe.api_item2 || 0),
    api_item3: Number(dock.recipe.api_item3 || 0),
    api_item4: Number(dock.recipe.api_item4 || 0),
    api_item5: 1
  };
}

export function toQuestList(quests: Quest[]) {
  return {
    api_count: quests.length,
    api_completed_kind: 0,
    api_page_count: 1,
    api_disp_page: 1,
    api_list: quests.map((quest) => ({
      api_no: quest.id,
      api_category: 1,
      api_type: 1,
      api_state: quest.completed ? 3 : quest.active ? 2 : 1,
      api_title: `Local Quest ${quest.id}`,
      api_detail: "Offline local quest placeholder.",
      api_voice_id: 0,
      api_get_material: [10, 10, 0, 0],
      api_bonus_flag: 0,
      api_progress_flag: quest.progress
    })),
    api_exec_count: quests.filter((quest) => quest.active).length,
    api_exec_type: 0
  };
}

export function toFurniture(furniture: FurnitureState, resourceManifest?: ResourceManifest) {
  return {
    api_list: furniture.owned.map((id) => ({ api_id: id, api_furniture_no: id, api_furniture_type: (id - 1) % 6 })),
    api_set: normalizeFurnitureSet(furniture.set, resourceManifest),
    api_fcoin: furniture.coins
  };
}

export function toPort(save: SaveState, resourceManifest?: ResourceManifest) {
  return {
    api_material: toMaterials(save.materials),
    api_deck_port: save.decks.map(toDeck),
    api_ndock: save.repairDocks.map(toRepairDock),
    api_ship: save.ships.map(toShip),
    api_basic: toBasic(save.player, save.furniture, resourceManifest),
    api_log: [],
    api_p_bgm_id: normalizePortBgmId(save.player.portBgmId, resourceManifest),
    api_parallel_quest_count: save.quests.filter((quest) => quest.active).length,
    api_combined_flag: save.player.combinedFleet
  };
}

export function toRequireInfo(save: SaveState, resourceManifest?: ResourceManifest) {
  return {
    api_basic: toBasic(save.player, save.furniture, resourceManifest),
    api_extra_supply: [0, 0],
    api_oss_setting: {
      api_oss_items: [0, 0, 0, 0],
      api_language_type: 0
    },
    api_position_id: 0,
    api_slot_item: save.slotItems.map(toSlotItem),
    api_unsetslot: toUnsetSlot(save),
    api_kdock: save.buildDocks.map(toBuildDock),
    api_useitem: toUseItems(save.materials),
    api_furniture: toFurniture(save.furniture, resourceManifest).api_list
  };
}

function toBasicFurniture(furniture?: FurnitureState, resourceManifest?: ResourceManifest) {
  const set = normalizeFurnitureSet(furniture?.set, resourceManifest);
  return [
    set.api_floor,
    set.api_wall,
    set.api_window,
    set.api_object,
    set.api_chest,
    set.api_desk
  ];
}

function normalizeFurnitureSet(set?: Partial<FurnitureState["set"]>, resourceManifest?: ResourceManifest) {
  const normalized = {
    api_floor: set?.api_floor ?? 1,
    api_wall: set?.api_wall ?? 2,
    api_window: set?.api_window ?? 3,
    api_chest: set?.api_chest ?? 4,
    api_desk: set?.api_desk ?? 5,
    api_object: set?.api_object ?? 0
  };

  if (resourceManifest && normalized.api_object > 0 && !resourceManifest.furniture.normal.has(normalized.api_object)) {
    normalized.api_object = 0;
  }

  return normalized;
}

export function normalizePortBgmId(portBgmId: number, resourceManifest?: ResourceManifest) {
  if (!resourceManifest) return portBgmId;
  return resourceManifest.bgm.port.has(portBgmId) ? portBgmId : resourceManifest.bgm.port.has(0) ? 0 : portBgmId;
}

export function toUseItems(materials: Materials) {
  return [
    { api_id: 1, api_count: materials.repairKit },
    { api_id: 2, api_count: materials.buildKit },
    { api_id: 3, api_count: materials.devmat },
    { api_id: 4, api_count: materials.screw }
  ];
}

export function toUnsetSlot(save: SaveState) {
  const equipped = new Set(save.ships.flatMap((ship) => [...ship.slotIds, ship.exSlotId]).filter((id) => id > 0));
  const groups: Record<string, number[]> = {};
  for (const item of save.slotItems) {
    if (equipped.has(item.id)) continue;
    const master = masterData.api_mst_slotitem.find((slot) => slot.api_id === item.masterId);
    const type = String(master?.api_type?.[2] ?? 0);
    groups[type] = groups[type] || [];
    groups[type].push(item.id);
  }
  return groups;
}

export function toMapInfo(save: SaveState) {
  return save.maps.map((map) => ({
    api_id: map.id,
    api_cleared: map.cleared,
    api_exboss_flag: 0,
    api_gauge_num: map.gauge,
    api_gauge_type: 0,
    api_maparea_id: map.areaId,
    api_no: map.mapNo,
    api_required_defeat_count: 1,
    api_sally_flag: [0, 0],
    api_eventmap: null
  }));
}

function material(api_id: number, api_value: number) {
  return { api_member_id: 1, api_id, api_value };
}
