import { masterData } from "../master/data.js";
import {
  furnitureMasterById,
  furnitureSetArray,
  normalizeFurnitureSet,
  normalizeOwnedFurniture
} from "../master/furniture.js";
import {
  mapGaugeRequirement,
  mapGaugeStage,
  mapGaugeType,
  mapPhaseDefinitions
} from "../master/map-progress.js";
import {
  DEFAULT_GAMEPLAY_PROFILE,
  profileSupportsNormalMap,
  type GameplayProfile
} from "../master/gameplay-profile.js";
import {
  eventDefinition,
  eventMapById,
  eventMapMaster,
  eventMapPhaseDefinitions,
  eventRankDefinition
} from "../master/event-data.js";
import { effectiveShipSpeedValue } from "../master/ship-speed.js";
import { playerShipStatVector } from "../master/ship-stat-growth.js";
import { DEFAULT_PORT_BGM_ID, type ResourceManifest } from "../resources/types.js";
import { normalizeDeckShipIds } from "../state/decks.js";
import type {
  AirBase,
  BuildDock,
  Deck,
  FurnitureState,
  Materials,
  Player,
  RepairDock,
  SaveState,
  Ship,
  SlotItem
} from "../state/types.js";
import { MARRIED_SHIP_LEVEL_CAP, SHIP_LEVEL_CAP, shipApiExp } from "./experience.js";
import { repairCost, repairTimeMs } from "./repair.js";
import { buildQuestList, type QuestListOptions } from "./quests.js";

export const AIRCRAFT_EQUIP_TYPE_IDS = new Set([6, 7, 8, 9, 10, 11, 25, 26, 41, 45, 47, 48, 49, 53, 56, 57, 58, 59, 60, 91, 94]);

const MEDAL_USEITEM_ID = 57;

export function toBasic(
  player: Player,
  furniture?: FurnitureState,
  useItems: SaveState["useItems"] = [],
  resourceManifest?: ResourceManifest
) {
  return {
    api_member_id: player.id,
    api_nickname: player.nickname,
    api_nickname_id: player.nickname,
    api_active_flag: 1,
    api_starttime: Date.now(),
    api_level: player.level,
    api_rank: 1,
    api_experience: player.exp,
    api_fleetname: null,
    api_flagship_position: player.flagshipPosition,
    api_comment: player.comment,
    api_comment_id: player.comment,
    api_max_chara: player.maxChara,
    api_max_slotitem: player.maxSlotItem,
    api_max_kagu: 200,
    api_playtime: 0,
    api_tutorial: player.tutorialProgress,
    api_furniture: toBasicFurniture(furniture),
    api_count_deck: 4,
    api_count_kdock: 4,
    api_count_ndock: 4,
    api_fcoin: furniture?.coins ?? 200,
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
    api_medals: useItemCount(useItems, MEDAL_USEITEM_ID),
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

export function toMaterialValues(materials: Materials) {
  return [
    materials.fuel,
    materials.ammo,
    materials.steel,
    materials.bauxite,
    materials.buildKit,
    materials.repairKit,
    materials.devmat,
    materials.screw
  ];
}

export function toShip(ship: Ship, slotItems?: SlotItem[]) {
  const master = masterData.api_mst_ship.find((item) => item.api_id === ship.masterId);
  const slot = [...ship.slotIds, ...Array(5).fill(-1)].slice(0, 5);
  const repair = repairCost(ship, master);

  const equippedSlotItems = resolveEquippedSlotItems(ship, slotItems);
  const equippedMasters = resolveEquippedMasters(ship, slotItems);
  const equipSum = (field: string) =>
    equippedMasters.reduce((sum, sm) => sum + safeNum(sm[field as keyof typeof sm]), 0);

  const kyoukaRaw = Array.isArray((ship.stats as Record<string, unknown>).api_kyouka)
    ? (ship.stats as Record<string, unknown>).api_kyouka as number[]
    : [0, 0, 0, 0, 0, 0, 0];
  const kyouka = (i: number) => safeNum(kyoukaRaw[i]);

  const growingStats = playerShipStatVector(ship.masterId, ship.level);
  const level99Stats = playerShipStatVector(ship.masterId, 99);
  const equipmentEvasion = equipSum("api_houk");
  const equipmentAsw = equipSum("api_tais");
  const equipmentLos = equipSum("api_saku");

  return {
    api_id: ship.id,
    api_sortno: master?.api_sortno ?? ship.masterId,
    api_ship_id: ship.masterId,
    api_lv: ship.level,
    api_exp: shipApiExp(ship.exp, ship.level, ship.marriedAt > 0 ? MARRIED_SHIP_LEVEL_CAP : SHIP_LEVEL_CAP),
    api_nowhp: ship.hp,
    api_maxhp: ship.maxHp,
    api_leng: master?.api_leng ?? 1,
    api_slot: slot,
    api_onslot: toOnSlot(ship, master, slot, slotItems),
    api_kyouka: [kyouka(0), kyouka(1), kyouka(2), kyouka(3), kyouka(4), kyouka(5), kyouka(6)],
    api_backs: master?.api_backs ?? 1,
    api_fuel: ship.fuel,
    api_bull: ship.ammo,
    api_fuel_max: master?.api_fuel_max ?? ship.maxFuel,
    api_bull_max: master?.api_bull_max ?? ship.maxAmmo,
    api_slotnum: master?.api_slot_num ?? 0,
    api_ndock_time: repairTimeMs(ship, master),
    api_ndock_item: [repair.fuel, repair.steel],
    api_soku: effectiveShipSpeedValue(
      safeNum(master?.api_soku),
      safeNum(master?.api_ctype),
      equippedSlotItems.map((item) => ({ masterId: item.masterId, improvement: item.level })),
      { masterId: ship.masterId, shipType: safeNum(master?.api_stype) }
    ),
    api_srate: 0,
    api_cond: ship.condition,
    api_karyoku: [arrVal(master?.api_houg, 0) + equipSum("api_houg") + kyouka(0), arrVal(master?.api_houg, 1) + equipSum("api_houg")],
    api_raisou: [arrVal(master?.api_raig, 0) + equipSum("api_raig") + kyouka(1), arrVal(master?.api_raig, 1) + equipSum("api_raig")],
    api_taiku: [arrVal(master?.api_tyku, 0) + equipSum("api_tyku") + kyouka(2), arrVal(master?.api_tyku, 1) + equipSum("api_tyku")],
    api_soukou: [arrVal(master?.api_souk, 0) + equipSum("api_souk") + kyouka(3), arrVal(master?.api_souk, 1) + equipSum("api_souk")],
    api_kaihi: [growingStats.evasion + equipmentEvasion, level99Stats.evasion + equipmentEvasion],
    api_taisen: [growingStats.asw + equipmentAsw + kyouka(6), level99Stats.asw + equipmentAsw + kyouka(6)],
    api_sakuteki: [growingStats.los + equipmentLos, level99Stats.los + equipmentLos],
    api_lucky: [arrVal(master?.api_luck, 0) + equipSum("api_luck") + kyouka(4) + ship.marriageLuckBonus, arrVal(master?.api_luck, 1) + equipSum("api_luck")],
    api_locked: ship.locked,
    api_locked_equip: 0,
    api_sally_area: ship.sallyArea,
    api_sp_effect_items: [],
    api_slot_ex: ship.exSlotId
  };
}

function toOnSlot(
  ship: Ship,
  shipMaster: (typeof masterData.api_mst_ship)[number] | undefined,
  slot: number[],
  slotItems?: SlotItem[]
) {
  const maxeq = Array.isArray(shipMaster?.api_maxeq) ? shipMaster.api_maxeq : [];
  const current = [...ship.onSlot, ...Array(5).fill(0)].slice(0, 5);
  return slot.map((slotId, index) => {
    if (slotId <= 0) return 0;
    const item = slotItems?.find((si) => si.id === slotId);
    const slotMaster = item ? masterData.api_mst_slotitem.find((m) => m.api_id === item.masterId) : undefined;
    return slotMaster && isAircraftSlotItem(slotMaster) ? Math.max(0, Math.min(safeNum(maxeq[index]), safeNum(current[index]))) : 0;
  });
}

export function isAircraftSlotItem(slotMaster: (typeof masterData.api_mst_slotitem)[number]) {
  return AIRCRAFT_EQUIP_TYPE_IDS.has(safeNum(slotMaster.api_type?.[2]));
}

function resolveEquippedMasters(
  ship: Ship,
  slotItems?: SlotItem[]
): (typeof masterData.api_mst_slotitem)[number][] {
  return resolveEquippedSlotItems(ship, slotItems)
    .map((item) => masterData.api_mst_slotitem.find((m) => m.api_id === item.masterId))
    .filter((m): m is NonNullable<typeof m> => m != null);
}

function resolveEquippedSlotItems(ship: Ship, slotItems?: SlotItem[]) {
  if (!slotItems || slotItems.length === 0) return [];
  const allSlotIds = [...ship.slotIds, ship.exSlotId].filter((id) => id > 0);
  return allSlotIds
    .map((slotId) => slotItems.find((item) => item.id === slotId))
    .filter((item): item is SlotItem => item != null);
}

function arrVal(arr: number | number[] | undefined, index: number): number {
  if (Array.isArray(arr)) return safeNum(arr[index]);
  return 0;
}

function fixedAirBaseSquadrons(base: AirBase) {
  return Array.from({ length: 4 }, (_, index) =>
    base.squadrons.find((squadron) => squadron.squadronId === index + 1) ?? {
      squadronId: index + 1,
      slotItemId: -1,
      state: 0,
      count: 0,
      maxCount: 0,
      condition: 0
    }
  );
}

function safeNum(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
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

export function toAirBase(base: AirBase, slotItems: SlotItem[] = []) {
  const planeInfo = fixedAirBaseSquadrons(base).map((squadron) => {
    const item = slotItems.find((slotItem) => slotItem.id === squadron.slotItemId);
    return {
      api_squadron_id: squadron.squadronId,
      api_state: item ? Math.max(1, squadron.state) : 0,
      api_slotid: item ? item.id : -1,
      api_slotitem_id: item ? item.masterId : -1,
      api_level: item ? item.level : 0,
      api_alv: item ? item.proficiency : 0,
      api_count: item ? squadron.count : 0,
      api_max_count: item ? squadron.maxCount : 0,
      api_cond: squadron.condition
    };
  });
  return {
    api_area_id: base.areaId,
    api_rid: base.baseId,
    api_name: base.name,
    api_action_kind: base.actionKind,
    api_distance: {
      api_base: base.distanceBase,
      api_bonus: base.distanceBonus
    },
    api_plane_info: planeInfo
  };
}

export function toAirBaseExpandedInfo(base: AirBase) {
  return {
    api_area_id: base.areaId,
    api_rid: base.baseId,
    api_maintenance_level: base.maintenanceLevel
  };
}

export function toDeck(deck: Deck) {
  const shipIds = normalizeDeckShipIds(deck.shipIds);
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

export function toRepairDock(dock: RepairDock, ships: Ship[] = []) {
  const ship = ships.find((item) => item.id === dock.shipId);
  const master = ship ? masterData.api_mst_ship.find((item) => item.api_id === ship.masterId) : undefined;
  const repair = ship ? repairCost(ship, master) : { fuel: 0, steel: 0 };

  return {
    api_member_id: 1,
    api_id: dock.id,
    api_state: dock.state,
    api_ship_id: dock.shipId,
    api_complete_time: dock.completeTime,
    api_complete_time_str: dock.completeTime ? new Date(dock.completeTime).toISOString() : "0",
    api_item1: repair.fuel,
    api_item2: repair.steel,
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
    api_item5: Number(dock.recipe.api_item5 || 0)
  };
}

export function toQuestList(save: SaveState, options: QuestListOptions = {}) {
  return buildQuestList(save, options);
}

export function toFurniture(furniture: FurnitureState, resourceManifest?: ResourceManifest) {
  return {
    api_list: toFurnitureList(furniture),
    api_set: normalizeFurnitureSet(furniture.set),
    api_fcoin: furniture.coins
  };
}

export function toFurnitureList(furniture: FurnitureState) {
  return normalizeOwnedFurniture(furniture.owned).map((id) => {
    const master = furnitureMasterById(id);
    return {
      api_id: id,
      api_furniture_no: master?.api_no ?? id,
      api_furniture_type: master?.api_type ?? 0
    };
  });
}

export function toPort(save: SaveState, resourceManifest?: ResourceManifest) {
  return {
    api_material: toMaterials(save.materials),
    api_deck_port: save.decks.map(toDeck),
    api_ndock: save.repairDocks.map((dock) => toRepairDock(dock, save.ships)),
    api_ship: save.ships.map((s) => toShip(s, save.slotItems)),
    api_basic: toBasic(save.player, save.furniture, save.useItems, resourceManifest),
    api_log: [],
    api_p_bgm_id: normalizePortBgmId(save.player.portBgmId, resourceManifest),
    api_parallel_quest_count: masterData.api_mst_const.api_parallel_quest_max.api_int_value,
    api_combined_flag: save.player.combinedFleet,
    api_event_object: toEventObject(save),
    api_dest_ship_slot: 1,
    api_c_flags: [],
    api_c_flag2: 0,
    api_friendly_setting: {
      api_request_flag: save.player.options.friendlyRequestFlag,
      api_request_type: save.player.options.friendlyRequestType
    },
    api_plane_info: null,
    api_furniture_affect_items: {}
  };
}

export function toRequireInfo(save: SaveState, resourceManifest?: ResourceManifest) {
  return {
    api_basic: toBasic(save.player, save.furniture, save.useItems, resourceManifest),
    api_extra_supply: [0, 0],
    api_oss_setting: {
      api_oss_items: [...save.player.options.ossItems],
      api_language_type: save.player.options.languageType
    },
    api_friendly_setting: {
      api_request_flag: save.player.options.friendlyRequestFlag,
      api_request_type: save.player.options.friendlyRequestType
    },
    api_position_id: 0,
    api_slot_item: save.slotItems.map(toSlotItem),
    api_unsetslot: toUnsetSlot(save),
    api_kdock: save.buildDocks.map(toBuildDock),
    api_useitem: toUseItems(save.materials, save.useItems),
    api_furniture: toFurnitureList(save.furniture)
  };
}

function toBasicFurniture(furniture?: FurnitureState) {
  return furnitureSetArray(furniture?.set);
}

function useItemCount(useItems: SaveState["useItems"], itemId: number) {
  return useItems.find((item) => item.id === itemId)?.count ?? 0;
}

export function normalizePortBgmId(portBgmId: number, resourceManifest?: ResourceManifest) {
  if (!resourceManifest) return portBgmId > 1 ? portBgmId : DEFAULT_PORT_BGM_ID;
  if (portBgmId > 1 && resourceManifest.bgm.port.has(portBgmId)) return portBgmId;
  return defaultPortBgmId(resourceManifest) ?? portBgmId;
}

function defaultPortBgmId(resourceManifest: ResourceManifest) {
  if (resourceManifest.bgm.port.has(DEFAULT_PORT_BGM_ID)) return DEFAULT_PORT_BGM_ID;
  return [...resourceManifest.bgm.port.keys()].filter((id) => id > 0).sort((a, b) => a - b)[0];
}

export function toUseItems(materials: Materials, useItems: SaveState["useItems"] = []) {
  const counts = new Map(useItems.map((item) => [item.id, item.count]));
  const fixed = [
    { api_id: 1, api_count: materials.repairKit },
    { api_id: 2, api_count: materials.buildKit },
    { api_id: 3, api_count: materials.devmat },
    { api_id: 4, api_count: materials.screw },
    { api_id: 49, api_count: counts.get(49) ?? 0 },
    { api_id: 54, api_count: counts.get(54) ?? 0 },
    { api_id: 55, api_count: counts.get(55) ?? 0 },
    { api_id: 59, api_count: counts.get(59) ?? 0 },
    { api_id: 64, api_count: counts.get(64) ?? 0 }
  ];
  const fixedIds = new Set(fixed.map((item) => item.api_id));
  return [
    ...fixed,
    ...useItems
      .filter((item) => !fixedIds.has(item.id))
      .map((item) => ({ api_id: item.id, api_count: item.count }))
  ].sort((a, b) => a.api_id - b.api_id);
}

export function toUnsetSlot(save: SaveState) {
  const equipped = new Set([
    ...save.ships.flatMap((ship) => [...ship.slotIds, ship.exSlotId]),
    ...save.airBases.flatMap((base) => base.squadrons.map((squadron) => squadron.slotItemId)),
    ...(save.relocatingSlotItemIds ?? [])
  ].filter((id) => id > 0));
  const groups: Record<string, number[]> = {};
  for (const item of save.slotItems) {
    if (equipped.has(item.id)) continue;
    const master = masterData.api_mst_slotitem.find((slot) => slot.api_id === item.masterId);
    const key = `api_slottype${master?.api_type?.[2] ?? 0}`;
    groups[key] = groups[key] || [];
    groups[key].push(item.id);
  }
  return groups;
}

export function toUnsetSlotItems(save: SaveState) {
  return Object.entries(toUnsetSlot(save))
    .map(([key, slotList]) => {
      const match = key.match(/^api_slottype(\d+)$/);
      return {
        api_type3: match ? Number(match[1]) : 0,
        api_slot_list: slotList
      };
    })
    .sort((a, b) => a.api_type3 - b.api_type3);
}

export function toMapInfo(save: SaveState, gameplayProfile: GameplayProfile = DEFAULT_GAMEPLAY_PROFILE) {
  const activeEventAreaId = save.eventSettings.activeAreaId;
  return save.maps
  .filter((map) => {
    const eventMap = eventMapById(map.id);
    return eventMap
      ? map.areaId === activeEventAreaId
      : profileSupportsNormalMap(gameplayProfile, map.id)
        && masterData.api_mst_mapinfo.some((master) => master.api_id === map.id);
  })
  .map((map) => {
    const eventMap = eventMapById(map.id);
    const master = eventMap ? eventMapMaster(eventMap) : masterData.api_mst_mapinfo.find((item) => item.api_id === map.id);
    const required = eventMap
      ? eventRankDefinition(eventMap, map.selectedRank || 3).maxMapHp
      : mapGaugeRequirement(map.id, map.phase, master?.api_required_defeat_count);
    const phaseDefinitions = eventMap ? eventMapPhaseDefinitions(map.id, map.selectedRank || 3) : mapPhaseDefinitions(map.id);
    const normalGaugeType = eventMap ? "hp" : mapGaugeType(map.id, map.phase);
    const gauge = required == null || normalGaugeType === "none"
      ? { api_gauge_num: 1, api_gauge_type: 0, api_required_defeat_count: null }
      : {
          api_gauge_num: eventMap ? 1 : mapGaugeStage(map.id, map.phase),
          api_gauge_type: normalGaugeType === "transport" ? 2 : 1,
          ...(map.cleared === 1
            ? {}
            : {
                api_defeat_count: phaseDefinitions
                  ? Math.min(required, Math.max(0, Math.trunc(map.phaseProgress)))
                  : Math.min(required, Math.max(0, required - Math.trunc(map.gauge))),
                api_required_defeat_count: required
              })
        };

    return {
      api_id: map.id,
      api_cleared: map.cleared,
      api_exboss_flag: 0,
      ...gauge,
      api_maparea_id: map.areaId,
      api_no: map.mapNo,
      api_sally_flag: master?.api_sally_flag ?? [1, 0, 0],
      api_eventmap: eventMap
        ? {
            api_now_maphp: map.cleared === 1 ? 0 : Math.max(0, Math.trunc(map.gauge)),
            api_max_maphp: required,
            api_selected_rank: Math.max(0, Math.trunc(map.selectedRank)),
            api_gauge_num: 1,
            api_gauge_type: 1,
            api_s_no: map.cleared === 1 ? 1 : 0,
            api_m10: 0
          }
        : null
    };
  });
}

function toEventObject(save: SaveState) {
  const activeAreaId = save.eventSettings.activeAreaId;
  const event = activeAreaId == null ? undefined : eventDefinition(activeAreaId);
  if (!event) return null;
  return {
    api_area_id: event.areaId,
    api_name: event.name,
    api_maps: event.maps.map((eventMap) => {
      const map = save.maps.find((candidate) => candidate.id === eventMap.id);
      return {
        api_id: eventMap.id,
        api_maparea_id: eventMap.areaId,
        api_no: eventMap.mapNo,
        api_selected_rank: map?.selectedRank ?? 0,
        api_cleared: map?.cleared ?? 0,
        api_now_maphp: map ? Math.max(0, Math.trunc(map.gauge)) : 0,
        api_max_maphp: eventRankDefinition(eventMap, map?.selectedRank || 3).maxMapHp
      };
    })
  };
}

function material(api_id: number, api_value: number) {
  return { api_member_id: 1, api_id, api_value };
}
