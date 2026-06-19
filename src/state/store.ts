import Database from "better-sqlite3";
import { dirname } from "node:path";
import { mkdirSync } from "node:fs";
import { mapMasterId, masterData } from "../master/data.js";
import {
  DEFAULT_FURNITURE_IDS,
  DEFAULT_FURNITURE_SET,
  normalizeFurnitureSet,
  normalizeOwnedFurniture
} from "../master/furniture.js";
import {
  initialMapGauge,
  mapPhaseDefinitions,
  terminalMapPhase,
  type MapPhaseCondition
} from "../master/map-progress.js";
import { normalRoutingMap } from "../master/routing-data.js";
import { EXPEDITION_DEFINITIONS, EXPEDITION_MASTERS } from "../master/expedition-data.js";
import {
  buildRoutingFleet,
  evaluateRoute,
  type RouteEvaluation,
  type RoutingFleet
} from "../master/routing.js";
import type { BattleRecord, BattleSettlementRecord } from "../kcsapi/battle.js";
import { playerLevelForExp, shipLevelForExp, shipLevelupInfo } from "../kcsapi/experience.js";
import {
  buildExpeditionSnapshot,
  expeditionDefinition,
  resolveExpedition,
  type ExpeditionOutcome,
  type ExpeditionRunSnapshot
} from "../kcsapi/expedition.js";
import {
  clonePracticeBatch,
  generatePracticeBatch,
  isPracticeBatch,
  practicePeriodKey
} from "../kcsapi/practice.js";
import { repairCost, repairTimeMs } from "../kcsapi/repair.js";
import { isAircraftSlotItem } from "../kcsapi/serializers.js";
import {
  battleSupplyCost,
  suppliesAmmo,
  suppliesFuel,
  type SupplyOptions
} from "../kcsapi/supply.js";
import { DEFAULT_PORT_BGM_ID } from "../resources/types.js";
import type {
  BuildDock,
  Deck,
  ExpeditionProgress,
  ExpeditionRun,
  ExpeditionSettings,
  FurnitureState,
  JsonObject,
  MapState,
  MaterialDelta,
  Materials,
  Player,
  PlayerOptions,
  Quest,
  RepairDock,
  SaveState,
  Ship,
  SlotItem,
  SortieSession,
  UseItemInventory
} from "./types.js";

export type StateStoreOptions = {
  databasePath: string;
};

export type StateStore = ReturnType<typeof createStateStore>;

type Row = Record<string, unknown>;

type RepairStartResult = { ok: true; dock: RepairDock } | { ok: false; error: string };
type RepairCompleteResult = { ok: true; dock: RepairDock } | { ok: false; error: string };

const defaultOptions: PlayerOptions = {
  bgmFlag: 1,
  voiceFlag: 1,
  seFlag: 1,
  volBgm: 80,
  volSe: 80,
  volVoice: 80
};

export const LOCAL_WORLD_ID = 15;
const SCHEMA_VERSION = 9;
const PRACTICE_BATCH_SESSION_ID = "practice_batch";
const PRACTICE_STATES_SESSION_ID = "practice_states";
const EMPTY_ONSLOT = [0, 0, 0, 0, 0];
const IMMEDIATE_REPAIR_THRESHOLD_MS = 60_000;
const REPAIR_COMPLETE_CONDITION = 40;
const MATERIAL_RECOVERY_INTERVAL_MS = 180_000;
const BASIC_MATERIAL_CAP = 1_000_000;

export function createStateStore(options: StateStoreOptions) {
  mkdirSync(dirname(options.databasePath), { recursive: true });
  const db = new Database(options.databasePath);
  db.pragma("journal_mode = WAL");
  migrate(db);

  return {
    db,
    close: () => db.close(),
    hasAccount: () => hasAccount(db),
    getWorldId: () => getWorldId(db),
    registerAccount: (worldId: number) => registerAccount(db, worldId),
    getSave: () => getSave(db),
    updateNickname: (nickname: string) => {
      db.prepare("UPDATE players SET nickname = ? WHERE id = 1").run(nickname || "Local Admiral");
      return getSave(db).player;
    },
    updateComment: (comment: string) => {
      db.prepare("UPDATE players SET comment = ? WHERE id = 1").run(comment);
      return getSave(db).player;
    },
    updateTutorialProgress: (progress: number) => {
      db.prepare("UPDATE players SET tutorial_progress = ? WHERE id = 1").run(progress);
      return getSave(db).player;
    },
    updateOptions: (patch: Partial<PlayerOptions>) => {
      const player = getSave(db).player;
      const next = { ...player.options, ...patch };
      db.prepare("UPDATE players SET options_json = ? WHERE id = 1").run(JSON.stringify(next));
      return next;
    },
    setFlagshipPosition: (position: number) => {
      db.prepare("UPDATE players SET flagship_position = ? WHERE id = 1").run(position);
      return position;
    },
    setCombinedFleet: (enabled: number) => {
      db.prepare("UPDATE players SET combined_fleet = ? WHERE id = 1").run(enabled);
      return enabled;
    },
    setPortBgm: (bgmId: number) => {
      db.prepare("UPDATE players SET port_bgm_id = ? WHERE id = 1").run(bgmId);
      return bgmId;
    },
    renameDeck: (deckId: number, name: string) => {
      db.prepare("UPDATE decks SET name = ? WHERE id = ?").run(name || `Fleet ${deckId}`, deckId);
      return getSave(db).decks.find((deck) => deck.id === deckId);
    },
    changeDeckShip: (deckId: number, index: number, shipId: number) => {
      const save = getSave(db);
      const deck = save.decks.find((item) => item.id === deckId);
      if (!deck) return null;
      const awayShips = activeExpeditionShipIds(db);
      if (deckIsAway(db, deckId) || (shipId > 0 && awayShips.has(shipId))) return null;
      const targetIndex = Math.max(0, Math.min(5, Math.trunc(index)));
      const nextShipId = shipId > 0 && save.ships.some((ship) => ship.id === shipId) ? shipId : -1;
      const updatedDecks = save.decks.map((item) => {
        const shipIds = normalizeFixed(item.shipIds, 6, -1).map((id) => (id > 0 ? id : -1));
        if (item.id === deckId && nextShipId > 0) {
          const srcIndex = shipIds.indexOf(nextShipId);
          if (srcIndex >= 0 && srcIndex !== targetIndex) {
            const displacedId = shipIds[targetIndex];
            shipIds[targetIndex] = nextShipId;
            shipIds[srcIndex] = displacedId > 0 ? displacedId : -1;
          } else if (srcIndex < 0) {
            shipIds[targetIndex] = nextShipId;
          }
        } else if (nextShipId > 0) {
          for (let slot = 0; slot < shipIds.length; slot += 1) {
            if (shipIds[slot] === nextShipId) shipIds[slot] = -1;
          }
        } else if (item.id === deckId) {
          shipIds[targetIndex] = -1;
        }
        return { id: item.id, shipIds };
      });
      const seenShips = new Set<number>();
      for (const item of updatedDecks) {
        for (let slot = 0; slot < item.shipIds.length; slot += 1) {
          const assignedShipId = item.shipIds[slot];
          if (assignedShipId <= 0) continue;
          if (seenShips.has(assignedShipId)) {
            item.shipIds[slot] = -1;
          } else {
            seenShips.add(assignedShipId);
          }
        }
      }
      const update = db.prepare("UPDATE decks SET ship_ids_json = ? WHERE id = ?");
      const tx = db.transaction(() => {
        for (const item of updatedDecks) update.run(JSON.stringify(item.shipIds), item.id);
      });
      tx();
      if (deckId === 1) {
        const deck1 = updatedDecks.find((d) => d.id === 1);
        if (deck1 && deck1.shipIds[save.player.flagshipPosition - 1] <= 0) {
          const firstShipIdx = deck1.shipIds.findIndex((id) => id > 0);
          const nextPosition = firstShipIdx >= 0 ? firstShipIdx + 1 : 1;
          db.prepare("UPDATE players SET flagship_position = ? WHERE id = 1").run(nextPosition);
        }
      }
      return getSave(db).decks.find((item) => item.id === deckId);
    },
    toggleShipLock: (shipId: number, explicit?: number) => {
      const ship = getSave(db).ships.find((item) => item.id === shipId);
      if (!ship) return null;
      const next = explicit ?? (ship.locked ? 0 : 1);
      db.prepare("UPDATE ships SET locked = ? WHERE id = ?").run(next, shipId);
      return next;
    },
    supplyShips: (shipIds: number[], options: SupplyOptions = { kind: 3, refillAircraft: true }) => {
      const save = getSave(db);
      const awayShips = activeExpeditionShipIds(db);
      const availableShipIds = shipIds.filter((id) => !awayShips.has(id));
      let fuel = 0;
      let ammo = 0;
      let bauxite = 0;
      const update = db.prepare("UPDATE ships SET fuel = ?, ammo = ?, max_fuel = ?, max_ammo = ?, onslot_json = ? WHERE id = ?");
      const tx = db.transaction(() => {
        for (const shipId of availableShipIds) {
          const ship = save.ships.find((item) => item.id === shipId);
          if (!ship) continue;
          const master = masterData.api_mst_ship.find((s) => s.api_id === ship.masterId);
          const maxFuel = master?.api_fuel_max ?? ship.maxFuel;
          const maxAmmo = master?.api_bull_max ?? ship.maxAmmo;
          const targetFuel = suppliesFuel(options.kind) ? maxFuel : ship.fuel;
          const targetAmmo = suppliesAmmo(options.kind) ? maxAmmo : ship.ammo;
          const targetOnSlot = options.refillAircraft
            ? onSlotForShip(master, save.slotItems, ship.slotIds)
            : normalizeFixed(ship.onSlot, 5, 0);
          fuel += Math.max(0, targetFuel - ship.fuel);
          ammo += Math.max(0, targetAmmo - ship.ammo);
          bauxite += aircraftRefillCount(ship.onSlot, targetOnSlot) * 5;
          update.run(targetFuel, targetAmmo, maxFuel, maxAmmo, JSON.stringify(targetOnSlot), ship.id);
        }
        consumeMaterials(db, { fuel, ammo, bauxite });
      });
      tx();
      const nextSave = getSave(db);
      return {
        ships: nextSave.ships.filter((ship) => availableShipIds.includes(ship.id)),
        consumed: { fuel, ammo, bauxite }
      };
    },
    equipSlotItem: (shipId: number, slotIndex: number, itemId: number) => {
      const save = getSave(db);
      const ship = save.ships.find((item) => item.id === shipId);
      if (!ship || activeExpeditionShipIds(db).has(shipId)) return null;
      const slotIds = normalizeFixed(ship.slotIds, 5, -1);
      slotIds[Math.max(0, slotIndex)] = itemId;
      const master = masterData.api_mst_ship.find((s) => s.api_id === ship.masterId);
      const onSlot = onSlotForShip(master, save.slotItems, slotIds, ship.onSlot, true);
      db.prepare("UPDATE ships SET slot_ids_json = ?, onslot_json = ? WHERE id = ?").run(JSON.stringify(slotIds), JSON.stringify(onSlot), shipId);
      return getSave(db).ships.find((item) => item.id === shipId);
    },
    equipExSlotItem: (shipId: number, itemId: number) => {
      if (activeExpeditionShipIds(db).has(shipId)) return null;
      db.prepare("UPDATE ships SET ex_slot_id = ? WHERE id = ?").run(itemId, shipId);
      return getSave(db).ships.find((item) => item.id === shipId);
    },
    unsetAllSlots: (shipId: number) => {
      if (activeExpeditionShipIds(db).has(shipId)) return null;
      db.prepare("UPDATE ships SET slot_ids_json = ?, onslot_json = ?, ex_slot_id = -1 WHERE id = ?").run(JSON.stringify([-1, -1, -1, -1, -1]), JSON.stringify(EMPTY_ONSLOT), shipId);
      return getSave(db).ships.find((item) => item.id === shipId);
    },
    exchangeSlotIndex: (shipId: number, from: number, to: number) => {
      const ship = getSave(db).ships.find((item) => item.id === shipId);
      if (!ship || activeExpeditionShipIds(db).has(shipId)) return null;
      const slotIds = normalizeFixed(ship.slotIds, 5, -1);
      const onSlot = normalizeFixed(ship.onSlot, 5, 0);
      const moving = slotIds[from];
      slotIds[from] = slotIds[to];
      slotIds[to] = moving;
      const movingCount = onSlot[from];
      onSlot[from] = onSlot[to];
      onSlot[to] = movingCount;
      const master = masterData.api_mst_ship.find((s) => s.api_id === ship.masterId);
      const nextOnSlot = onSlotForShip(master, getSave(db).slotItems, slotIds, onSlot, false);
      db.prepare("UPDATE ships SET slot_ids_json = ?, onslot_json = ? WHERE id = ?").run(JSON.stringify(slotIds), JSON.stringify(nextOnSlot), shipId);
      return getSave(db).ships.find((item) => item.id === shipId);
    },
    lockSlotItem: (itemId: number, explicit?: number) => {
      const item = getSave(db).slotItems.find((slotItem) => slotItem.id === itemId);
      if (!item) return null;
      const next = explicit ?? (item.locked ? 0 : 1);
      db.prepare("UPDATE slot_items SET locked = ? WHERE id = ?").run(next, itemId);
      return next;
    },
    modernizeShip: (shipId: number, consumedShipIds: number[]) => {
      const awayShips = activeExpeditionShipIds(db);
      if (awayShips.has(shipId) || consumedShipIds.some((id) => awayShips.has(id))) return null;
      const ship = getSave(db).ships.find((item) => item.id === shipId);
      if (!ship) return null;
      const stats = { ...ship.stats, modernized: true };
      const tx = db.transaction(() => {
        db.prepare("UPDATE ships SET stats_json = ? WHERE id = ?").run(JSON.stringify(stats), shipId);
        for (const consumed of consumedShipIds) {
          if (consumed !== shipId) db.prepare("DELETE FROM ships WHERE id = ?").run(consumed);
        }
      });
      tx();
      return getSave(db).ships.find((item) => item.id === shipId);
    },
    remodelShip: (shipId: number, masterId: number) => {
      if (activeExpeditionShipIds(db).has(shipId)) return null;
      const save = getSave(db);
      const ship = save.ships.find((item) => item.id === shipId);
      const master = masterData.api_mst_ship.find((item) => item.api_id === masterId);
      const onSlot = ship ? onSlotForShip(master, save.slotItems, ship.slotIds, ship.onSlot, true) : EMPTY_ONSLOT;
      db.prepare("UPDATE ships SET master_id = ?, level = level + 1, onslot_json = ? WHERE id = ?").run(masterId, JSON.stringify(onSlot), shipId);
      return getSave(db).ships.find((item) => item.id === shipId);
    },
    createSlotItem: (masterId: number) => createSlotItem(db, masterId),
    destroySlotItem: (itemIds: number[]) => {
      const awayItems = activeExpeditionSlotItemIds(db);
      const availableIds = itemIds.filter((id) => !awayItems.has(id));
      const tx = db.transaction(() => {
        for (const id of availableIds) db.prepare("DELETE FROM slot_items WHERE id = ?").run(id);
        addMaterials(db, { fuel: availableIds.length, ammo: availableIds.length, steel: availableIds.length * 2, bauxite: 0 });
      });
      tx();
      return getSave(db).materials;
    },
    createShip: (masterId: number) => createShip(db, masterId),
    destroyShip: (shipIds: number[]) => {
      const awayShips = activeExpeditionShipIds(db);
      const availableIds = shipIds.filter((id) => !awayShips.has(id));
      const tx = db.transaction(() => {
        for (const id of availableIds) db.prepare("DELETE FROM ships WHERE id = ?").run(id);
        addMaterials(db, { fuel: availableIds.length, ammo: availableIds.length, steel: availableIds.length * 2, bauxite: 0 });
      });
      tx();
      return getSave(db).materials;
    },
    consumeMaterials: (delta: MaterialDelta) => {
      consumeMaterials(db, delta);
      return getSave(db).materials;
    },
    addMaterials: (delta: MaterialDelta) => {
      addMaterials(db, delta);
      return getSave(db).materials;
    },
    setQuestState: (questId: number, active: number, completed = 0) => {
      db.prepare(
        "INSERT INTO quests (id, active, progress, completed) VALUES (?, ?, 0, ?) ON CONFLICT(id) DO UPDATE SET active = excluded.active, completed = excluded.completed"
      ).run(questId, active, completed);
      return getSave(db).quests.find((quest) => quest.id === questId);
    },
    updateFurnitureSet: (patch: Partial<FurnitureState["set"]>) => {
      const current = getSave(db).furniture;
      db.prepare("UPDATE furniture SET set_json = ? WHERE id = 1").run(JSON.stringify({ ...current.set, ...patch }));
      return getSave(db).furniture;
    },
    buyFurniture: (furnitureId: number, price = 0) => {
      const current = getSave(db).furniture;
      if (current.owned.includes(furnitureId)) return current;
      const owned = Array.from(new Set([...current.owned, furnitureId]));
      const coins = Math.max(0, current.coins - Math.max(0, Math.trunc(price)));
      db.prepare("UPDATE furniture SET owned_json = ?, coins = ? WHERE id = 1").run(JSON.stringify(owned), coins);
      return getSave(db).furniture;
    },
    startRepair: (shipId: number, dockId: number, highspeed: boolean): RepairStartResult => {
      const save = getSave(db);
      const ship = save.ships.find((item) => item.id === shipId);
      if (!ship) return { ok: false, error: "Unknown ship" };
      if (activeExpeditionShipIds(db).has(shipId)) {
        return { ok: false, error: "Ship is away on expedition" };
      }

      const dock = save.repairDocks.find((item) => item.id === dockId);
      if (!dock) return { ok: false, error: "Unknown repair dock" };
      if (dock.state !== 0 || dock.shipId > 0) return { ok: false, error: "Repair dock is not empty" };

      const master = masterData.api_mst_ship.find((item) => item.api_id === ship.masterId);
      const cost = repairCost(ship, master);
      if (cost.lostHp <= 0) return { ok: false, error: "Ship is not damaged" };

      const repairTime = repairTimeMs(ship, master);
      const materialCost = { fuel: cost.fuel, steel: cost.steel, repairKit: highspeed ? 1 : 0 };
      if (!hasMaterials(save.materials, materialCost)) return { ok: false, error: "Insufficient repair materials" };

      const tx = db.transaction(() => {
        consumeMaterials(db, materialCost);
        if (highspeed || repairTime <= IMMEDIATE_REPAIR_THRESHOLD_MS) {
          restoreShipAfterRepair(db, ship.id);
          clearRepairDock(db, dock.id);
        } else {
          const completeTime = Date.now() + repairTime;
          db.prepare("UPDATE repair_docks SET ship_id = ?, complete_time = ?, state = 1 WHERE id = ?").run(ship.id, completeTime, dock.id);
        }
      });
      tx();

      const updatedDock = getSave(db).repairDocks.find((item) => item.id === dock.id)!;
      return { ok: true, dock: updatedDock };
    },
    completeRepair: (dockId: number): RepairCompleteResult => {
      const save = getSave(db);
      const dock = save.repairDocks.find((item) => item.id === dockId);
      if (!dock) return { ok: false, error: "Unknown repair dock" };
      if (dock.state === 0 || dock.shipId <= 0) return { ok: true, dock };
      if (!hasMaterials(save.materials, { repairKit: 1 })) return { ok: false, error: "Insufficient repair materials" };

      const tx = db.transaction(() => {
        finishRepairDock(db, dock);
        consumeMaterials(db, { repairKit: 1 });
      });
      tx();

      return { ok: true, dock: getSave(db).repairDocks.find((item) => item.id === dock.id)! };
    },
    startBuild: (dockId: number, recipe: JsonObject, resultMasterId = 9) => {
      const completeTime = Date.now() + 20 * 60_000;
      db.prepare("UPDATE build_docks SET recipe_json = ?, result_master_id = ?, complete_time = ?, state = 2 WHERE id = ?").run(
        JSON.stringify(recipe),
        resultMasterId,
        completeTime,
        dockId
      );
      return getSave(db).buildDocks.find((dock) => dock.id === dockId);
    },
    speedBuild: (dockId: number) => {
      db.prepare("UPDATE build_docks SET complete_time = ?, state = 3 WHERE id = ?").run(Date.now(), dockId);
      consumeMaterials(db, { buildKit: 1 });
      return getSave(db).buildDocks.find((dock) => dock.id === dockId);
    },
    claimBuild: (dockId: number) => {
      const dock = getSave(db).buildDocks.find((item) => item.id === dockId);
      const ship = createShip(db, dock?.resultMasterId || 9);
      db.prepare("UPDATE build_docks SET recipe_json = '{}', result_master_id = 0, complete_time = 0, state = 0 WHERE id = ?").run(dockId);
      return ship;
    },
    getMissionMemberState: () => missionMemberState(db),
    startExpedition: (deckId: number, missionId: number, serialCid = "") =>
      startExpedition(db, deckId, missionId, serialCid),
    claimExpedition: (deckId: number) => claimExpedition(db, deckId),
    recallExpedition: (deckId: number) => recallExpedition(db, deckId),
    forceCompleteExpedition: (deckId: number) => forceCompleteExpedition(db, deckId),
    recordSupportParticipation: (deckId: number) => {
      const result = db.prepare(`
        UPDATE expedition_runs
        SET support_count = support_count + 1
        WHERE deck_id = ? AND mission_id IN (33, 34) AND status = 'active'
      `).run(deckId);
      return result.changes > 0;
    },
    finishSupportExpeditions: () => finishSupportExpeditions(db),
    unlockAllExpeditions: (enabled = true) => {
      ensureExpeditionSettings(db);
      db.prepare("UPDATE expedition_settings SET unlock_all = ? WHERE id = 1").run(enabled ? 1 : 0);
      return missionMemberState(db);
    },
    resetExpeditionProgress: () => {
      const tx = db.transaction(() => {
        db.prepare("DELETE FROM expedition_runs").run();
        db.prepare("DELETE FROM expedition_progress").run();
        db.prepare("UPDATE decks SET mission_json = ?").run(JSON.stringify(emptyMissionState()));
        seedExpeditionProgress(db);
      });
      tx();
      return missionMemberState(db);
    },
    setExpeditionFixedSeed: (seed: number | null) => {
      ensureExpeditionSettings(db);
      db.prepare("UPDATE expedition_settings SET fixed_seed = ? WHERE id = 1")
        .run(seed == null ? null : Math.trunc(seed));
      return getExpeditionSettings(db);
    },
    setExpeditionClockOffset: (offsetMs: number) => {
      ensureExpeditionSettings(db);
      db.prepare("UPDATE expedition_settings SET clock_offset_ms = ? WHERE id = 1")
        .run(Math.trunc(offsetMs));
      return getExpeditionSettings(db);
    },
    startMission: (deckId: number, missionId: number) => {
      const started = startExpedition(db, deckId, missionId, "");
      if (!started.ok) throw new Error(started.error);
      return { state: 1, missionId, completeTime: started.run.completeAt };
    },
    completeMission: (deckId: number) => {
      forceCompleteExpedition(db, deckId);
      const claimed = claimExpedition(db, deckId);
      if (!claimed.ok) throw new Error(claimed.error);
      return getSave(db).materials;
    },
    recallMission: (deckId: number) => {
      const recalled = recallExpedition(db, deckId);
      if (!recalled.ok) return null;
      return getSave(db).decks.find((deck) => deck.id === deckId);
    },
    startSortie: (deckId: number, areaId: number, mapNo: number) => {
      if (deckIsAway(db, deckId)) return null;
      const save = getSave(db);
      const map = save.maps.find((item) => item.id === mapMasterId(areaId, mapNo));
      const deck = save.decks.find((item) => item.id === deckId);
      const routingMap = normalRoutingMap(areaId, mapNo);
      if (!map || map.unlocked !== 1 || !deck || !routingMap) return null;
      const seed = Number(`${Date.now()}`.slice(-8));
      const fleet = buildRoutingFleet(save, deckId);
      const phase = map.phase || 1;
      const initial = evaluateRoute(routingMap, {
        fleet,
        seed,
        step: 0,
        phase,
        from: "Start",
        playerLevel: save.player.level
      });
      if (initial.kind !== "route") throw new Error(`Map ${routingMap.mapId} cannot start with active route selection`);
      db.prepare("DELETE FROM sortie_sessions").run();
      db.prepare(
        "INSERT INTO sortie_sessions (id, deck_id, area_id, map_no, node, seed, state_json) VALUES (1, ?, ?, ?, ?, ?, ?)"
      ).run(deckId, areaId, mapNo, initial.edgeNo, seed, JSON.stringify({
        battles: 0,
        point: initial.to,
        routeStep: 1,
        visited: ["Start", initial.to],
        fleet,
        playerLevel: save.player.level,
        phase
      }));
      return getSave(db).sortieSession;
    },
    recordSortieBattle: (record: JsonObject) => {
      const session = getSave(db).sortieSession;
      if (!session) return null;
      const state = {
        ...session.state,
        battles: safeNum(session.state.battles) + 1,
        lastBattle: { ...record, resultClaimed: false }
      };
      db.prepare("UPDATE sortie_sessions SET state_json = ? WHERE id = ?").run(JSON.stringify(state), session.id);
      return getSave(db).sortieSession;
    },
    updateSortieBattle: (record: JsonObject) => {
      const session = getSave(db).sortieSession;
      if (!session) return null;
      const state = {
        ...session.state,
        lastBattle: record
      };
      db.prepare("UPDATE sortie_sessions SET state_json = ? WHERE id = ?").run(JSON.stringify(state), session.id);
      return getSave(db).sortieSession;
    },
    lastSortieBattle: () => {
      const battle = getSave(db).sortieSession?.state.lastBattle;
      return isJsonObject(battle) ? battle : null;
    },
    applySortieBattleResult: () => applyBattleResult(db, "sortie"),
    recordPracticeBattle: (record: JsonObject) => recordBattleSession(db, "practice", record),
    updatePracticeBattle: (record: JsonObject) => recordBattleSession(db, "practice", record),
    lastPracticeBattle: () => lastBattleSession(db, "practice"),
    applyPracticeBattleResult: () => applyBattleResult(db, "practice"),
    practiceBatch: () => practiceBatch(db),
    practiceStates: () => practiceStates(db),
    recordCombinedBattle: (record: JsonObject) => recordBattleSession(db, "combined", record),
    updateCombinedBattle: (record: JsonObject) => recordBattleSession(db, "combined", record),
    lastCombinedBattle: () => lastBattleSession(db, "combined"),
    applyCombinedBattleResult: () => applyBattleResult(db, "combined"),
    previewSortieRoute: () => previewSortieRoute(db),
    nextSortieNode: (selectedEdgeNo?: number) => advanceSortieRoute(db, selectedEdgeNo),
    clearSortie: () => {
      finishSupportExpeditions(db);
      db.prepare("DELETE FROM sortie_sessions").run();
    },
    completeSortieBattle: () => getSave(db)
  };
}

function missionMemberState(db: Database.Database) {
  const progress = new Map(
    (db.prepare("SELECT * FROM expedition_progress").all() as Row[])
      .map(mapExpeditionProgress)
      .map((item) => [item.missionId, item] as const)
  );
  const settings = getExpeditionSettings(db);
  const currentPeriod = expeditionPeriodKey(expeditionNow(db));
  return {
    api_list_items: EXPEDITION_MASTERS.map((master) => {
      const item = progress.get(master.api_id);
      const completed = master.api_reset_type === 1
        ? item?.periodKey === currentPeriod && (item?.periodCount ?? 0) > 0
        : (item?.completedCount ?? 0) > 0;
      return {
        api_mission_id: master.api_id,
        api_state: completed ? 2 : settings.unlockAll || item?.unlocked ? 1 : 0
      };
    }),
    api_limit_time: [nextExpeditionResetAt(expeditionNow(db))]
  };
}

function startExpedition(db: Database.Database, deckId: number, missionId: number, serialCid: string) {
  const existingRow = db.prepare("SELECT * FROM expedition_runs WHERE deck_id = ?").get(deckId) as Row | undefined;
  if (existingRow) {
    const existing = mapExpeditionRun(existingRow);
    if (serialCid && existing.serialCid === serialCid) return { ok: true as const, run: existing };
    if (existing.status !== "claimed") {
      return { ok: false as const, error: "Fleet is already away on expedition" };
    }
  }
  if (deckId < 2 || deckId > 4) return { ok: false as const, error: "Only fleets 2-4 can start expeditions" };

  const save = getSave(db);
  const deck = save.decks.find((item) => item.id === deckId);
  if (!deck) return { ok: false as const, error: "Unknown fleet" };
  const missionState = missionMemberState(db).api_list_items.find((item) => item.api_mission_id === missionId);
  if (!missionState || missionState.api_state !== 1) {
    return { ok: false as const, error: "Expedition is locked or already used this period" };
  }
  const ships = deck.shipIds
    .filter((id) => id > 0)
    .map((id) => save.ships.find((ship) => ship.id === id))
    .filter((ship): ship is Ship => ship != null);
  if (ships.length === 0) return { ok: false as const, error: "Expedition fleet is empty" };
  if (ships[0].hp * 4 <= ships[0].maxHp) {
    return { ok: false as const, error: "The flagship is heavily damaged" };
  }
  const repairing = new Set(save.repairDocks.filter((dock) => dock.state !== 0).map((dock) => dock.shipId));
  if (ships.some((ship) => repairing.has(ship.id))) {
    return { ok: false as const, error: "Expedition fleet contains a ship in repair" };
  }
  if (save.sortieSession && save.sortieSession.deckId === deckId) {
    return { ok: false as const, error: "Fleet is currently on sortie" };
  }

  const now = expeditionNow(db);
  const settings = getExpeditionSettings(db);
  const snapshot = buildExpeditionSnapshot(save, deckId, missionId, {
    now,
    seed: settings.fixedSeed ?? undefined,
    serialCid
  });
  const definition = expeditionDefinition(missionId);
  const periodKey = expeditionPeriodKey(now);
  const tx = db.transaction(() => {
    db.prepare(`
      INSERT INTO expedition_runs (
        deck_id, mission_id, status, serial_cid, seed, started_at, complete_at,
        snapshot_json, outcome_json, result_json, support_count
      ) VALUES (?, ?, 'active', ?, ?, ?, ?, ?, NULL, NULL, 0)
      ON CONFLICT(deck_id) DO UPDATE SET
        mission_id = excluded.mission_id,
        status = excluded.status,
        serial_cid = excluded.serial_cid,
        seed = excluded.seed,
        started_at = excluded.started_at,
        complete_at = excluded.complete_at,
        snapshot_json = excluded.snapshot_json,
        outcome_json = NULL,
        result_json = NULL,
        support_count = 0
    `).run(
      deckId,
      missionId,
      serialCid,
      snapshot.seed,
      snapshot.startedAt,
      snapshot.completeAt,
      JSON.stringify(snapshot)
    );
    db.prepare("UPDATE decks SET mission_json = ? WHERE id = ?")
      .run(JSON.stringify({ state: 1, missionId, completeTime: snapshot.completeAt }), deckId);
    if (definition.resetType === 1) {
      db.prepare(`
        UPDATE expedition_progress
        SET period_key = ?, period_count = CASE WHEN period_key = ? THEN period_count + 1 ELSE 1 END
        WHERE mission_id = ?
      `).run(periodKey, periodKey, missionId);
    }
  });
  tx();
  const run = mapExpeditionRun(
    db.prepare("SELECT * FROM expedition_runs WHERE deck_id = ?").get(deckId) as Row
  );
  return { ok: true as const, run };
}

function claimExpedition(db: Database.Database, deckId: number) {
  const row = db.prepare("SELECT * FROM expedition_runs WHERE deck_id = ?").get(deckId) as Row | undefined;
  if (!row) return { ok: false as const, error: "Fleet has no expedition result" };
  const run = mapExpeditionRun(row);
  if (run.status === "claimed" && run.result) {
    return { ok: true as const, result: run.result };
  }
  const now = expeditionNow(db);
  if (run.completeAt > now) return { ok: false as const, error: "Expedition has not returned yet" };

  const snapshot = run.snapshot as unknown as ExpeditionRunSnapshot;
  const definition = expeditionDefinition(run.missionId);
  const resolved = resolveExpedition(snapshot, definition);
  const outcome: ExpeditionOutcome = run.status === "returning"
    ? {
        ...resolved,
        clearResult: 0,
        memberExp: 0,
        shipExp: resolved.shipExp.map(() => 0),
        materials: [0, 0, 0, 0],
        items: []
      }
    : resolved;
  let result: JsonObject = {};
  const tx = db.transaction(() => {
    applyExpeditionOutcome(db, snapshot, outcome);
    if (run.status !== "returning") completeExpeditionProgress(db, definition.id);
    const save = getSave(db);
    result = {
      missionId: definition.id,
      questName: expeditionMasterName(definition.id),
      clearResult: outcome.clearResult,
      getExp: outcome.memberExp,
      memberLevel: save.player.level,
      memberExp: save.player.exp,
      shipIds: snapshot.ships.map((ship) => ship.id),
      shipExp: outcome.shipExp,
      materials: outcome.materials,
      items: outcome.items,
      shipHps: outcome.shipHps,
      recalled: run.status === "returning",
      claimedAt: now
    };
    db.prepare(`
      UPDATE expedition_runs
      SET status = 'claimed', outcome_json = ?, result_json = ?
      WHERE deck_id = ?
    `).run(JSON.stringify(outcome), JSON.stringify(result), deckId);
    db.prepare("UPDATE decks SET mission_json = ? WHERE id = ?")
      .run(JSON.stringify(emptyMissionState()), deckId);
  });
  tx();
  return { ok: true as const, result };
}

function recallExpedition(db: Database.Database, deckId: number) {
  const row = db.prepare("SELECT * FROM expedition_runs WHERE deck_id = ?").get(deckId) as Row | undefined;
  if (!row) return { ok: false as const, error: "Fleet is not away on expedition" };
  const run = mapExpeditionRun(row);
  if (run.status !== "active") return { ok: false as const, error: "Expedition cannot be recalled" };
  const definition = expeditionDefinition(run.missionId);
  if (!definition.returnAllowed || definition.supportType) {
    return { ok: false as const, error: "This expedition cannot be recalled manually" };
  }
  const now = expeditionNow(db);
  const elapsed = Math.max(0, now - run.startedAt);
  const remaining = Math.max(0, run.completeAt - now);
  const completeAt = now + Math.floor(Math.min(elapsed, remaining) / 3);
  const tx = db.transaction(() => {
    db.prepare("UPDATE expedition_runs SET status = 'returning', complete_at = ? WHERE deck_id = ?")
      .run(completeAt, deckId);
    db.prepare("UPDATE decks SET mission_json = ? WHERE id = ?")
      .run(JSON.stringify({ state: 2, missionId: run.missionId, completeTime: completeAt }), deckId);
  });
  tx();
  return {
    ok: true as const,
    mission: [2, run.missionId, completeAt, 0],
    completeAt
  };
}

function forceCompleteExpedition(db: Database.Database, deckId: number) {
  const now = expeditionNow(db);
  const changed = db.prepare("UPDATE expedition_runs SET complete_at = ? WHERE deck_id = ? AND status != 'claimed'")
    .run(now, deckId);
  syncExpeditionDeckStates(db);
  return changed.changes > 0;
}

function finishSupportExpeditions(db: Database.Database) {
  const rows = db.prepare(`
    SELECT deck_id
    FROM expedition_runs
    WHERE mission_id IN (33, 34) AND status IN ('active', 'returning')
  `).all() as Row[];
  const now = expeditionNow(db);
  const results: unknown[] = [];
  for (const row of rows) {
    const deckId = Number(row.deck_id);
    db.prepare("UPDATE expedition_runs SET complete_at = ? WHERE deck_id = ?").run(now, deckId);
    results.push(claimExpedition(db, deckId));
  }
  return results;
}

function applyExpeditionOutcome(
  db: Database.Database,
  snapshot: ExpeditionRunSnapshot,
  outcome: ExpeditionOutcome
) {
  const updateShip = db.prepare(`
    UPDATE ships
    SET fuel = max(0, fuel - ?),
        ammo = max(0, ammo - ?),
        condition = max(0, condition - ?),
        hp = max(1, min(max_hp, ?)),
        exp = ?,
        level = ?
    WHERE id = ?
  `);
  snapshot.ships.forEach((ship, index) => {
    const nextExp = ship.exp + (outcome.shipExp[index] ?? 0);
    updateShip.run(
      outcome.fuelCosts[index] ?? 0,
      outcome.ammoCosts[index] ?? 0,
      outcome.conditionCosts[index] ?? 0,
      outcome.shipHps[index] ?? ship.hp,
      nextExp,
      shipLevelForExp(nextExp),
      ship.id
    );
  });
  addMaterials(db, {
    fuel: outcome.materials[0],
    ammo: outcome.materials[1],
    steel: outcome.materials[2],
    bauxite: outcome.materials[3]
  });
  for (const item of outcome.items) addUseItem(db, item.itemId, item.count);
  const player = db.prepare("SELECT exp FROM players WHERE id = 1").get() as Row;
  const memberExp = Number(player.exp) + outcome.memberExp;
  db.prepare("UPDATE players SET exp = ?, level = ? WHERE id = 1")
    .run(memberExp, playerLevelForExp(memberExp));
}

function completeExpeditionProgress(db: Database.Database, missionId: number) {
  db.prepare("UPDATE expedition_progress SET completed_count = completed_count + 1 WHERE mission_id = ?")
    .run(missionId);
  const completed = new Set(
    (db.prepare("SELECT mission_id FROM expedition_progress WHERE completed_count > 0").all() as Row[])
      .map((row) => Number(row.mission_id))
  );
  const unlock = db.prepare("UPDATE expedition_progress SET unlocked = 1 WHERE mission_id = ?");
  for (const definition of EXPEDITION_DEFINITIONS) {
    if (definition.prerequisiteIds.every((id) => completed.has(id))) unlock.run(definition.id);
  }
}

function addUseItem(db: Database.Database, itemId: number, count: number) {
  if (count <= 0) return;
  if (itemId === 1) return addMaterials(db, { repairKit: count });
  if (itemId === 2) return addMaterials(db, { buildKit: count });
  if (itemId === 3) return addMaterials(db, { devmat: count });
  if (itemId === 4) return addMaterials(db, { screw: count });
  db.prepare(`
    INSERT INTO use_items (id, count) VALUES (?, ?)
    ON CONFLICT(id) DO UPDATE SET count = count + excluded.count
  `).run(itemId, count);
}

function seedExpeditionProgress(db: Database.Database) {
  const insert = db.prepare(`
    INSERT OR IGNORE INTO expedition_progress
      (mission_id, unlocked, completed_count, period_key, period_count)
    VALUES (?, ?, 0, '', 0)
  `);
  for (const [index, mission] of EXPEDITION_MASTERS.entries()) {
    insert.run(mission.api_id, index === 0 ? 1 : 0);
  }
}

function ensureExpeditionSettings(db: Database.Database) {
  db.prepare(`
    INSERT OR IGNORE INTO expedition_settings (id, fixed_seed, clock_offset_ms, unlock_all)
    VALUES (1, NULL, 0, 0)
  `).run();
}

function getExpeditionSettings(db: Database.Database) {
  ensureExpeditionSettings(db);
  return mapExpeditionSettings(
    db.prepare("SELECT * FROM expedition_settings WHERE id = 1").get() as Row
  );
}

function expeditionNow(db: Database.Database) {
  return Date.now() + getExpeditionSettings(db).clockOffsetMs;
}

function expeditionPeriodKey(now: number) {
  const jst = new Date(now + 9 * 60 * 60_000);
  let year = jst.getUTCFullYear();
  let month = jst.getUTCMonth();
  if (jst.getUTCDate() < 15 || (jst.getUTCDate() === 15 && jst.getUTCHours() < 12)) {
    month -= 1;
    if (month < 0) {
      month = 11;
      year -= 1;
    }
  }
  return `${year}-${String(month + 1).padStart(2, "0")}`;
}

function nextExpeditionResetAt(now: number) {
  const jst = new Date(now + 9 * 60 * 60_000);
  let year = jst.getUTCFullYear();
  let month = jst.getUTCMonth();
  let reset = Date.UTC(year, month, 15, 3, 0, 0);
  if (reset <= now) {
    month += 1;
    if (month > 11) {
      month = 0;
      year += 1;
    }
    reset = Date.UTC(year, month, 15, 3, 0, 0);
  }
  return reset;
}

function expeditionMasterName(id: number) {
  return EXPEDITION_MASTERS.find((item) => item.api_id === id)?.api_name ?? `Expedition ${id}`;
}

function emptyMissionState() {
  return { state: 0, missionId: 0, completeTime: 0 };
}

function activeExpeditionShipIds(db: Database.Database) {
  const rows = db.prepare(
    "SELECT snapshot_json FROM expedition_runs WHERE status IN ('active', 'returning')"
  ).all() as Row[];
  const ids = new Set<number>();
  for (const row of rows) {
    const snapshot = parseJson<ExpeditionRunSnapshot>(row.snapshot_json, {
      deckId: 0,
      missionId: 0,
      serialCid: "",
      seed: 0,
      startedAt: 0,
      completeAt: 0,
      ships: []
    });
    for (const ship of snapshot.ships) ids.add(ship.id);
  }
  return ids;
}

function deckIsAway(db: Database.Database, deckId: number) {
  const row = db.prepare(
    "SELECT 1 AS active FROM expedition_runs WHERE deck_id = ? AND status IN ('active', 'returning')"
  ).get(deckId) as Row | undefined;
  return row != null;
}

function activeExpeditionSlotItemIds(db: Database.Database) {
  const shipIds = activeExpeditionShipIds(db);
  const ids = new Set<number>();
  if (shipIds.size === 0) return ids;
  const rows = db.prepare("SELECT id, slot_ids_json, ex_slot_id FROM ships").all() as Row[];
  for (const row of rows) {
    if (!shipIds.has(Number(row.id))) continue;
    const slots = parseJson<number[]>(row.slot_ids_json, []);
    for (const id of [...slots, Number(row.ex_slot_id)]) {
      if (id > 0) ids.add(id);
    }
  }
  return ids;
}

type BattleMode = "sortie" | "practice" | "combined";

function previewSortieRoute(db: Database.Database): RouteEvaluation | null {
  const save = getSave(db);
  const session = save.sortieSession;
  if (!session) return null;
  const routingMap = normalRoutingMap(session.areaId, session.mapNo);
  const point = typeof session.state.point === "string" ? session.state.point : "";
  if (!routingMap || !point || !routingMap.edges.some((edge) => edge.from === point)) return null;
  const fleet = session.state.fleet as unknown as RoutingFleet;
  if (!fleet || !Array.isArray(fleet.ships)) {
    throw new Error("Sortie session is missing its routing fleet snapshot");
  }
  return evaluateRoute(routingMap, {
    fleet,
    seed: session.seed,
    step: safeNum(session.state.routeStep),
    phase: safeNum(session.state.phase) || 1,
    from: point,
    playerLevel: safeNum(session.state.playerLevel) || save.player.level,
    visited: Array.isArray(session.state.visited)
      ? session.state.visited.filter((value): value is string => typeof value === "string")
      : []
  });
}

function advanceSortieRoute(db: Database.Database, selectedEdgeNo?: number) {
  const save = getSave(db);
  const session = save.sortieSession;
  if (!session) return null;
  const preview = previewSortieRoute(db);
  if (!preview) return session;

  const point = String(session.state.point ?? "");
  const routingMap = normalRoutingMap(session.areaId, session.mapNo)!;
  let next = preview;
  if (preview.kind === "select") {
    if (selectedEdgeNo == null) throw new Error("api_cell_id is required at an active route selection");
    next = evaluateRoute(routingMap, {
      fleet: session.state.fleet as unknown as RoutingFleet,
      seed: session.seed,
      step: safeNum(session.state.routeStep),
      phase: safeNum(session.state.phase) || 1,
      from: point,
      playerLevel: safeNum(session.state.playerLevel) || save.player.level,
      selectedEdgeNo,
      visited: Array.isArray(session.state.visited)
        ? session.state.visited.filter((value): value is string => typeof value === "string")
        : []
    });
  } else if (selectedEdgeNo != null) {
    throw new Error(`api_cell_id is not available from ${point}`);
  }
  if (next.kind !== "route") throw new Error(`Route selection at ${point} did not resolve to an edge`);

  const visited = Array.isArray(session.state.visited)
    ? session.state.visited.filter((value): value is string => typeof value === "string")
    : [];
  const state = {
    ...session.state,
    point: next.to,
    routeStep: safeNum(session.state.routeStep) + 1,
    visited: [...visited, next.to]
  };
  db.prepare("UPDATE sortie_sessions SET node = ?, state_json = ? WHERE id = ?")
    .run(next.edgeNo, JSON.stringify(state), session.id);
  return getSave(db).sortieSession;
}

function applyBattleResult(db: Database.Database, mode: BattleMode) {
  const save = getSave(db);
  const loaded = loadBattleRecord(save, db, mode);
  if (!loaded.record) return { save, record: null, applied: false };
  if (loaded.record.resultClaimed && isJsonObject(loaded.record.settlement)) return { save, record: loaded.record, applied: false };

  const record = loaded.record as unknown as BattleRecord;
  const settlement = buildBattleSettlement(save, record);
  const nextBattle = { ...record, resultClaimed: true, settlement };
  const tx = db.transaction(() => {
    const pursuedNightBattle = record.phases.night != null;
    consumeBattleSupply(db, record.shipIds, pursuedNightBattle);
    consumeBattleSupply(db, record.escortShipIds, pursuedNightBattle);
    if (mode !== "practice") {
      applyFleetHp(db, record.shipIds, record.after?.fNowHps);
      applyFleetHp(db, record.escortShipIds, record.after?.fCombinedNowHps);
    }
    applyFleetOnSlot(db, record.after?.fOnSlotByShipId);
    applyFleetOnSlot(db, record.after?.fCombinedOnSlotByShipId);
    applyFleetExperience(db, settlement.main);
    applyFleetExperience(db, settlement.escort);
    db.prepare("UPDATE players SET exp = ?, level = ? WHERE id = 1").run(settlement.memberExp, settlement.memberLevel);
    if (mode !== "practice" && settlement.dropShipId > 0) createShip(db, settlement.dropShipId);
    if (mode === "practice") markPracticeState(db, record.practiceEnemyId, record.result?.rank);
    if (mode === "sortie" || mode === "combined") applyMapProgress(db, record);
    loaded.saveRecord(nextBattle as unknown as JsonObject);
  });
  tx();
  return { save: getSave(db), record: nextBattle, applied: true };
}

function applyMapProgress(db: Database.Database, record: BattleRecord) {
  const sortie = record.sortie;
  if (!sortie) return;
  const map = db.prepare("SELECT * FROM maps WHERE id = ?").get(sortie.mapId) as Row | undefined;
  if (!map || Number(map.cleared) === 1) return;

  const stages = mapPhaseDefinitions(sortie.mapId);
  if (!stages) {
    if (!sortie.isBoss || !enemyFlagshipSunk(record)) return;
    const nextGauge = Math.max(0, Number(map.gauge) - 1);
    db.prepare("UPDATE maps SET cleared = ?, gauge = ?, phase = ?, phase_progress = 0 WHERE id = ?")
      .run(nextGauge === 0 ? 1 : 0, nextGauge, nextGauge === 0 ? 2 : 1, sortie.mapId);
    return;
  }

  const phase = Math.max(1, Number(map.phase));
  const stage = stages[phase - 1];
  if (!stage || sortie.point !== stage.point || !phaseConditionMet(stage.condition, record)) return;

  const progress = Math.max(0, Number(map.phase_progress)) + 1;
  if (progress < stage.required) {
    db.prepare("UPDATE maps SET gauge = ?, phase_progress = ? WHERE id = ?")
      .run(stage.required - progress, progress, sortie.mapId);
    return;
  }

  const nextStage = stages[phase];
  if (!nextStage) {
    db.prepare("UPDATE maps SET cleared = 1, gauge = 0, phase = ?, phase_progress = 0 WHERE id = ?")
      .run(stages.length + 1, sortie.mapId);
    return;
  }
  db.prepare("UPDATE maps SET gauge = ?, phase = ?, phase_progress = 0 WHERE id = ?")
    .run(nextStage.required, phase + 1, sortie.mapId);
}

function phaseConditionMet(condition: MapPhaseCondition, record: BattleRecord) {
  if (condition === "sink") return enemyFlagshipSunk(record);
  return record.result?.rank === "S" || record.result?.rank === "A" || record.result?.rank === "B";
}

function enemyFlagshipSunk(record: BattleRecord) {
  return safeNum(record.after?.eNowHps?.[0], 1) <= 0;
}

function loadBattleRecord(save: SaveState, db: Database.Database, mode: BattleMode) {
  if (mode === "sortie") {
    const session = save.sortieSession;
    const battle = session?.state.lastBattle;
    return {
      record: isJsonObject(battle) ? battle : null,
      saveRecord: (record: JsonObject) => {
        if (!session) return;
        const nextState = { ...session.state, lastBattle: record };
        db.prepare("UPDATE sortie_sessions SET state_json = ? WHERE id = ?").run(JSON.stringify(nextState), session.id);
      }
    };
  }
  return {
    record: lastBattleSession(db, mode),
    saveRecord: (record: JsonObject) => recordBattleSession(db, mode, record)
  };
}

function recordBattleSession(db: Database.Database, id: BattleMode, record: JsonObject) {
  const nextRecord = { ...record, resultClaimed: Boolean(record.resultClaimed) };
  writeBattleSession(db, id, nextRecord);
  return nextRecord;
}

function lastBattleSession(db: Database.Database, id: BattleMode) {
  return readBattleSession(db, id);
}

function writeBattleSession(db: Database.Database, id: string, state: JsonObject) {
  db.prepare("INSERT INTO battle_sessions (id, state_json) VALUES (?, ?) ON CONFLICT(id) DO UPDATE SET state_json = excluded.state_json").run(id, JSON.stringify(state));
}

function readBattleSession(db: Database.Database, id: string) {
  const row = db.prepare("SELECT state_json FROM battle_sessions WHERE id = ?").get(id) as Row | undefined;
  return row ? parseJson<JsonObject>(row.state_json, {}) : null;
}

function practiceBatch(db: Database.Database) {
  const now = Date.now();
  const periodKey = practicePeriodKey(now);
  const saved = readBattleSession(db, PRACTICE_BATCH_SESSION_ID);
  if (isPracticeBatch(saved) && saved.periodKey === periodKey) {
    return {
      ...clonePracticeBatch(saved),
      states: practiceStates(db)
    };
  }

  const batch = generatePracticeBatch(periodKey, now);
  writeBattleSession(db, PRACTICE_BATCH_SESSION_ID, batch as unknown as JsonObject);
  writeBattleSession(db, PRACTICE_STATES_SESSION_ID, {});
  return {
    ...clonePracticeBatch(batch),
    states: {}
  };
}

function practiceStates(db: Database.Database) {
  const state = readBattleSession(db, PRACTICE_STATES_SESSION_ID) ?? {};
  return Object.fromEntries(
    Object.entries(state)
      .map(([id, value]) => [id, Number(value)] as const)
      .filter(([id, value]) => Number.isInteger(Number(id)) && Number.isFinite(value))
  );
}

const PRACTICE_STATE_BY_RANK: Record<string, number> = {
  E: 1,
  D: 2,
  C: 3,
  B: 4,
  A: 5,
  S: 6
};

function markPracticeState(db: Database.Database, enemyId: number | undefined, rank: string | undefined) {
  if (!enemyId || enemyId <= 0) return;
  const states = practiceStates(db);
  states[String(enemyId)] = rank ? PRACTICE_STATE_BY_RANK[rank] ?? 1 : 1;
  writeBattleSession(db, PRACTICE_STATES_SESSION_ID, states);
}

function buildBattleSettlement(save: SaveState, record: BattleRecord): BattleSettlementRecord {
  const baseExp = safeNum(record.result?.baseExp, 0);
  const memberGain = safeNum(record.result?.memberExp, baseExp * 2);
  const memberExp = save.player.exp + memberGain;
  const main = buildFleetSettlement(save, record.shipIds, safeNum(record.result?.mvp, 1), baseExp);
  const escort = record.mode === "combined" ? buildFleetSettlement(save, record.escortShipIds ?? [], safeNum(record.result?.mvpCombined, 1), baseExp) : undefined;
  const dropShipId = record.mode === "practice" ? 0 : safeNum(record.result?.dropShipId, 0);
  return {
    memberLevel: playerLevelForExp(memberExp),
    memberExp,
    memberExpGain: memberGain,
    mvp: safeNum(record.result?.mvp, 1),
    mvpCombined: record.mode === "combined" ? safeNum(record.result?.mvpCombined, 1) : undefined,
    dropShipId,
    main,
    escort
  };
}

function buildFleetSettlement(save: SaveState, shipIds: number[] = [], mvp: number, baseExp: number) {
  const fixedShipIds = normalizeFixed(shipIds.map((id) => Number(id)), 6, -1);
  return fixedShipIds.map((shipId, index) => {
    if (shipId <= 0) return { shipId, gainedExp: -1, beforeExp: -1, afterExp: -1, afterLevel: 0, levelup: [-1] };
    const ship = save.ships.find((item) => item.id === shipId);
    if (!ship) return { shipId, gainedExp: -1, beforeExp: -1, afterExp: -1, afterLevel: 0, levelup: [-1] };
    const flagship = index === 0;
    const multiplier = (flagship ? 1.5 : 1) * (mvp === index + 1 ? 2 : 1);
    const gainedExp = Math.max(1, Math.floor(baseExp * multiplier));
    const afterExp = ship.exp + gainedExp;
    return {
      shipId,
      gainedExp,
      beforeExp: ship.exp,
      afterExp,
      afterLevel: shipLevelForExp(afterExp),
      levelup: shipLevelupInfo(ship.exp, gainedExp)
    };
  });
}

function applyFleetHp(db: Database.Database, shipIds: number[] | undefined, hps: number[] | undefined) {
  const fixedShipIds = normalizeFixed((shipIds ?? []).map((id) => Number(id)), 6, -1);
  const fixedHps = normalizeFixed((hps ?? []).map((hp) => Math.max(1, Math.trunc(Number(hp) || 1))), 6, 1);
  for (let index = 0; index < fixedShipIds.length; index += 1) {
    const shipId = fixedShipIds[index];
    if (shipId <= 0) continue;
    db.prepare("UPDATE ships SET hp = max(1, min(max_hp, ?)) WHERE id = ?").run(fixedHps[index], shipId);
  }
}

function applyFleetOnSlot(db: Database.Database, onSlotByShipId: Record<string, number[]> | undefined) {
  if (!onSlotByShipId) return;
  const update = db.prepare("UPDATE ships SET onslot_json = ? WHERE id = ?");
  for (const [shipId, onSlot] of Object.entries(onSlotByShipId)) {
    const id = Number(shipId);
    if (!Number.isInteger(id) || id <= 0) continue;
    update.run(JSON.stringify(normalizeFixed(onSlot.map((count) => Math.max(0, Math.trunc(Number(count) || 0))), 5, 0)), id);
  }
}

function applyFleetExperience(db: Database.Database, fleet: BattleSettlementRecord["main"] | undefined) {
  if (!fleet) return;
  for (const ship of fleet) {
    if (ship.shipId <= 0 || ship.gainedExp < 0) continue;
    db.prepare("UPDATE ships SET exp = ?, level = ? WHERE id = ?").run(ship.afterExp, ship.afterLevel, ship.shipId);
  }
}

function isJsonObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function safeNum(value: unknown, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function migrate(db: Database.Database) {
  const currentVersion = schemaVersion(db);
  if (currentVersion === 0 || currentVersion < 3 || currentVersion > SCHEMA_VERSION) {
    resetSchema(db);
    return;
  }

  createSchema(db);
  if (currentVersion < 4) migrateToV4(db);
  if (currentVersion < 5) migrateToV5(db);
  if (currentVersion < 6) migrateToV6(db);
  if (currentVersion < 7) migrateToV7(db);
  if (currentVersion < 8) migrateToV8(db);
  if (currentVersion < 9) migrateToV9(db);
  db.prepare("UPDATE schema_meta SET version = ?").run(SCHEMA_VERSION);
  repairShipMaxValues(db);
  repairShipOnSlotValues(db);
  repairFurnitureValues(db);
  repairMaps(db);
}

function migrateToV9(db: Database.Database) {
  repairFurnitureValues(db);
}

function migrateToV8(db: Database.Database) {
  if (!columnExists(db, "materials", "last_recovery_at")) {
    db.prepare("ALTER TABLE materials ADD COLUMN last_recovery_at INTEGER NOT NULL DEFAULT 0").run();
    db.prepare("UPDATE materials SET last_recovery_at = ? WHERE last_recovery_at = 0").run(Date.now());
  }
  settleMaterialRecovery(db);
}

function migrateToV7(db: Database.Database) {
  db.prepare(
    "UPDATE decks SET mission_json = ?"
  ).run(JSON.stringify({ state: 0, missionId: 0, completeTime: 0 }));
  db.prepare("DELETE FROM expedition_runs").run();
  seedExpeditionProgress(db);
  ensureExpeditionSettings(db);
}

function migrateToV4(db: Database.Database) {
  if (!columnExists(db, "players", "exp")) {
    db.prepare("ALTER TABLE players ADD COLUMN exp INTEGER NOT NULL DEFAULT 0").run();
  }
}

function migrateToV5(db: Database.Database) {
  if (!columnExists(db, "ships", "onslot_json")) {
    db.prepare("ALTER TABLE ships ADD COLUMN onslot_json TEXT NOT NULL DEFAULT '[0,0,0,0,0]'").run();
    backfillShipOnSlotValues(db, true);
  }
}

function migrateToV6(db: Database.Database) {
  if (!columnExists(db, "maps", "phase")) {
    db.prepare("ALTER TABLE maps ADD COLUMN phase INTEGER NOT NULL DEFAULT 1").run();
  }
  if (!columnExists(db, "maps", "phase_progress")) {
    db.prepare("ALTER TABLE maps ADD COLUMN phase_progress INTEGER NOT NULL DEFAULT 0").run();
  }

  const maps = db.prepare("SELECT id, cleared FROM maps").all() as Row[];
  const update = db.prepare("UPDATE maps SET gauge = ?, phase = ?, phase_progress = 0 WHERE id = ?");
  for (const map of maps) {
    const mapId = Number(map.id);
    const cleared = Number(map.cleared) === 1;
    const requiredDefeatCount = masterData.api_mst_mapinfo.find((item) => item.api_id === mapId)?.api_required_defeat_count;
    update.run(
      cleared ? 0 : initialMapGauge(mapId, requiredDefeatCount),
      cleared ? terminalMapPhase(mapId) : 1,
      mapId
    );
  }
}

function columnExists(db: Database.Database, table: string, column: string) {
  const rows = db.prepare(`PRAGMA table_info(${table})`).all() as Row[];
  return rows.some((row) => String(row.name) === column);
}

function repairShipMaxValues(db: Database.Database) {
  const ships = db.prepare("SELECT id, master_id, hp, max_hp, max_fuel, max_ammo FROM ships").all() as Row[];
  const update = db.prepare("UPDATE ships SET hp = ?, max_hp = ?, max_fuel = ?, max_ammo = ? WHERE id = ?");
  for (const row of ships) {
    const masterId = Number(row.master_id);
    const master = masterData.api_mst_ship.find((s) => s.api_id === masterId);
    if (!master) continue;
    const currentHp = safeNum(row.hp, 1);
    const currentMaxHp = safeNum(row.max_hp, 1);
    const expectedMaxHp = shipInitialMaxHp(master, currentMaxHp);
    const expectedHp = currentMaxHp !== expectedMaxHp
      ? currentHp >= currentMaxHp
        ? expectedMaxHp
        : Math.max(1, Math.min(currentHp, expectedMaxHp))
      : currentHp;
    const expectedFuel = master.api_fuel_max;
    const expectedAmmo = master.api_bull_max;
    if (
      currentHp !== expectedHp ||
      currentMaxHp !== expectedMaxHp ||
      Number(row.max_fuel) !== expectedFuel ||
      Number(row.max_ammo) !== expectedAmmo
    ) {
      update.run(expectedHp, expectedMaxHp, expectedFuel, expectedAmmo, Number(row.id));
    }
  }
}

function repairShipOnSlotValues(db: Database.Database) {
  if (!columnExists(db, "ships", "onslot_json")) return;
  backfillShipOnSlotValues(db, false);
}

function backfillShipOnSlotValues(db: Database.Database, refillEmptyAircraft: boolean) {
  const slotItems = (db.prepare("SELECT * FROM slot_items ORDER BY id").all() as Row[]).map(mapSlotItem);
  const ships = db.prepare("SELECT id, master_id, slot_ids_json, onslot_json FROM ships").all() as Row[];
  const update = db.prepare("UPDATE ships SET onslot_json = ? WHERE id = ?");
  for (const row of ships) {
    const master = masterData.api_mst_ship.find((item) => item.api_id === Number(row.master_id));
    const slotIds = parseJson<number[]>(row.slot_ids_json, [-1, -1, -1, -1, -1]);
    const current = parseJson<number[]>(row.onslot_json, EMPTY_ONSLOT);
    const next = onSlotForShip(master, slotItems, slotIds, current, refillEmptyAircraft);
    if (JSON.stringify(normalizeFixed(current, 5, 0)) !== JSON.stringify(next)) {
      update.run(JSON.stringify(next), Number(row.id));
    }
  }
}

function repairFurnitureValues(db: Database.Database) {
  const table = db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'furniture'").get() as Row | undefined;
  if (!table) return;

  const row = db.prepare("SELECT owned_json, set_json, coins FROM furniture WHERE id = 1").get() as Row | undefined;
  if (!row) {
    db.prepare("INSERT INTO furniture (id, owned_json, set_json, coins) VALUES (1, ?, ?, 200)").run(
      JSON.stringify(DEFAULT_FURNITURE_IDS),
      JSON.stringify(DEFAULT_FURNITURE_SET)
    );
    return;
  }

  const owned = normalizeOwnedFurniture(parseJson<number[]>(row.owned_json, []));
  const set = normalizeFurnitureSet(parseJson<Partial<FurnitureState["set"]>>(row.set_json, DEFAULT_FURNITURE_SET));
  const coins = Math.max(0, Math.trunc(safeNum(row.coins, 200)));
  if (
    JSON.stringify(owned) !== JSON.stringify(parseJson<number[]>(row.owned_json, [])) ||
    JSON.stringify(set) !== JSON.stringify(parseJson<Partial<FurnitureState["set"]>>(row.set_json, DEFAULT_FURNITURE_SET)) ||
    coins !== Number(row.coins)
  ) {
    db.prepare("UPDATE furniture SET owned_json = ?, set_json = ?, coins = ? WHERE id = 1").run(
      JSON.stringify(owned),
      JSON.stringify(set),
      coins
    );
  }
}

function repairMaps(db: Database.Database) {
  const rows = db.prepare("SELECT id, area_id, map_no FROM maps").all() as Row[];
  const hasOfficialOneOne = rows.some((row) => Number(row.id) === 11);
  if (!hasOfficialOneOne) {
    const legacyOneOne = rows.find((row) => Number(row.id) === 1 && Number(row.area_id) === 1 && Number(row.map_no) === 1);
    if (legacyOneOne) {
      db.prepare("UPDATE maps SET id = ? WHERE id = ?").run(11, 1);
    }
  } else {
    db.prepare("DELETE FROM maps WHERE id = 1").run();
  }

  seedMissingMaps(db);
}

function schemaVersion(db: Database.Database) {
  const table = db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'schema_meta'").get() as Row | undefined;
  if (!table) return 0;
  try {
    const row = db.prepare("SELECT version FROM schema_meta LIMIT 1").get() as Row | undefined;
    return row ? Number(row.version) : 0;
  } catch {
    return 0;
  }
}

function resetSchema(db: Database.Database) {
  db.exec(`
    DROP TABLE IF EXISTS expedition_settings;
    DROP TABLE IF EXISTS use_items;
    DROP TABLE IF EXISTS expedition_runs;
    DROP TABLE IF EXISTS expedition_progress;
    DROP TABLE IF EXISTS battle_sessions;
    DROP TABLE IF EXISTS sortie_sessions;
    DROP TABLE IF EXISTS maps;
    DROP TABLE IF EXISTS furniture;
    DROP TABLE IF EXISTS quests;
    DROP TABLE IF EXISTS build_docks;
    DROP TABLE IF EXISTS repair_docks;
    DROP TABLE IF EXISTS decks;
    DROP TABLE IF EXISTS slot_items;
    DROP TABLE IF EXISTS ships;
    DROP TABLE IF EXISTS materials;
    DROP TABLE IF EXISTS players;
    DROP TABLE IF EXISTS schema_meta;
  `);
  createSchema(db);
  db.prepare("INSERT INTO schema_meta (version) VALUES (?)").run(SCHEMA_VERSION);
}

function createSchema(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_meta (
      version INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS players (
      id INTEGER PRIMARY KEY,
      world_id INTEGER NOT NULL,
      nickname TEXT NOT NULL,
      level INTEGER NOT NULL,
      exp INTEGER NOT NULL,
      comment TEXT NOT NULL,
      tutorial_progress INTEGER NOT NULL,
      options_json TEXT NOT NULL,
      flagship_position INTEGER NOT NULL,
      combined_fleet INTEGER NOT NULL,
      port_bgm_id INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS materials (
      player_id INTEGER PRIMARY KEY,
      fuel INTEGER NOT NULL,
      ammo INTEGER NOT NULL,
      steel INTEGER NOT NULL,
      bauxite INTEGER NOT NULL,
      build_kit INTEGER NOT NULL,
      repair_kit INTEGER NOT NULL,
      devmat INTEGER NOT NULL,
      screw INTEGER NOT NULL,
      last_recovery_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS ships (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      master_id INTEGER NOT NULL,
      level INTEGER NOT NULL,
      exp INTEGER NOT NULL,
      hp INTEGER NOT NULL,
      max_hp INTEGER NOT NULL,
      condition INTEGER NOT NULL,
      fuel INTEGER NOT NULL,
      max_fuel INTEGER NOT NULL,
      ammo INTEGER NOT NULL,
      max_ammo INTEGER NOT NULL,
      locked INTEGER NOT NULL,
      slot_ids_json TEXT NOT NULL,
      onslot_json TEXT NOT NULL,
      ex_slot_id INTEGER NOT NULL,
      stats_json TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS slot_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      master_id INTEGER NOT NULL,
      level INTEGER NOT NULL,
      proficiency INTEGER NOT NULL,
      locked INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS decks (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      mission_json TEXT NOT NULL,
      ship_ids_json TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS repair_docks (
      id INTEGER PRIMARY KEY,
      ship_id INTEGER NOT NULL,
      complete_time INTEGER NOT NULL,
      state INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS build_docks (
      id INTEGER PRIMARY KEY,
      recipe_json TEXT NOT NULL,
      result_master_id INTEGER NOT NULL,
      complete_time INTEGER NOT NULL,
      state INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS quests (
      id INTEGER PRIMARY KEY,
      active INTEGER NOT NULL,
      progress INTEGER NOT NULL,
      completed INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS furniture (
      id INTEGER PRIMARY KEY,
      owned_json TEXT NOT NULL,
      set_json TEXT NOT NULL,
      coins INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS maps (
      id INTEGER PRIMARY KEY,
      area_id INTEGER NOT NULL,
      map_no INTEGER NOT NULL,
      unlocked INTEGER NOT NULL,
      cleared INTEGER NOT NULL,
      gauge INTEGER NOT NULL,
      phase INTEGER NOT NULL DEFAULT 1,
      phase_progress INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS sortie_sessions (
      id INTEGER PRIMARY KEY,
      deck_id INTEGER NOT NULL,
      area_id INTEGER NOT NULL,
      map_no INTEGER NOT NULL,
      node INTEGER NOT NULL,
      seed INTEGER NOT NULL,
      state_json TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS battle_sessions (
      id TEXT PRIMARY KEY,
      state_json TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS expedition_progress (
      mission_id INTEGER PRIMARY KEY,
      unlocked INTEGER NOT NULL,
      completed_count INTEGER NOT NULL,
      period_key TEXT NOT NULL,
      period_count INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS expedition_runs (
      deck_id INTEGER PRIMARY KEY,
      mission_id INTEGER NOT NULL,
      status TEXT NOT NULL,
      serial_cid TEXT NOT NULL,
      seed INTEGER NOT NULL,
      started_at INTEGER NOT NULL,
      complete_at INTEGER NOT NULL,
      snapshot_json TEXT NOT NULL,
      outcome_json TEXT,
      result_json TEXT,
      support_count INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS use_items (
      id INTEGER PRIMARY KEY,
      count INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS expedition_settings (
      id INTEGER PRIMARY KEY,
      fixed_seed INTEGER,
      clock_offset_ms INTEGER NOT NULL,
      unlock_all INTEGER NOT NULL
    );
  `);
}

function hasAccount(db: Database.Database) {
  const playerCount = (db.prepare("SELECT COUNT(*) AS count FROM players").get() as { count: number }).count;
  return playerCount > 0;
}

function getWorldId(db: Database.Database) {
  const row = db.prepare("SELECT world_id FROM players WHERE id = 1").get() as Row | undefined;
  return row ? Number(row.world_id) : 0;
}

function registerAccount(db: Database.Database, worldId: number): SaveState {
  if (worldId !== LOCAL_WORLD_ID) {
    throw new Error(`Unsupported local world id: ${worldId}`);
  }
  if (hasAccount(db)) return getSave(db);

  const tx = db.transaction(() => {
    db.prepare(
      "INSERT INTO players (id, world_id, nickname, level, exp, comment, tutorial_progress, options_json, flagship_position, combined_fleet, port_bgm_id) VALUES (1, ?, ?, 1, 0, ?, 100, ?, 1, 0, ?)"
    ).run(worldId, "Local Admiral", "Local offline save", JSON.stringify(defaultOptions), DEFAULT_PORT_BGM_ID);
    db.prepare(
      "INSERT INTO materials (player_id, fuel, ammo, steel, bauxite, build_kit, repair_kit, devmat, screw, last_recovery_at) VALUES (1, 1000, 1000, 1000, 1000, 10, 10, 50, 5, ?)"
    ).run(Date.now());

    for (const masterId of [9, 10, 1, 2]) {
      const master = masterData.api_mst_ship.find((s) => s.api_id === masterId);
      const maxHp = shipInitialMaxHp(master);
      const maxFuel = master?.api_fuel_max ?? 20;
      const maxAmmo = master?.api_bull_max ?? 20;
      db.prepare(
        "INSERT INTO ships (master_id, level, exp, hp, max_hp, condition, fuel, max_fuel, ammo, max_ammo, locked, slot_ids_json, onslot_json, ex_slot_id, stats_json) VALUES (?, 1, 0, ?, ?, 49, ?, ?, ?, ?, 0, ?, ?, -1, ?)"
      ).run(masterId, maxHp, maxHp, maxFuel, maxFuel, maxAmmo, maxAmmo, JSON.stringify([-1, -1, -1, -1, -1]), JSON.stringify(EMPTY_ONSLOT), JSON.stringify({}));
    }

    for (const masterId of [1, 1, 2, 46]) {
      db.prepare("INSERT INTO slot_items (master_id, level, proficiency, locked) VALUES (?, 0, 0, 0)").run(masterId);
    }

    const deckShips = [
      [1, 2, -1, -1, -1, -1],
      [-1, -1, -1, -1, -1, -1],
      [-1, -1, -1, -1, -1, -1],
      [-1, -1, -1, -1, -1, -1]
    ];
    for (let id = 1; id <= 4; id += 1) {
      db.prepare("INSERT INTO decks (id, name, mission_json, ship_ids_json) VALUES (?, ?, ?, ?)").run(
        id,
        id === 1 ? "First Fleet" : `Fleet ${id}`,
        JSON.stringify({ state: 0, missionId: 0, completeTime: 0 }),
        JSON.stringify(deckShips[id - 1])
      );
    }

    for (let id = 1; id <= 4; id += 1) {
      db.prepare("INSERT INTO repair_docks (id, ship_id, complete_time, state) VALUES (?, 0, 0, 0)").run(id);
      db.prepare("INSERT INTO build_docks (id, recipe_json, result_master_id, complete_time, state) VALUES (?, '{}', 0, 0, 0)").run(id);
    }

    for (const id of [101, 102, 201]) {
      db.prepare("INSERT INTO quests (id, active, progress, completed) VALUES (?, 0, 0, 0)").run(id);
    }

    db.prepare("INSERT INTO furniture (id, owned_json, set_json, coins) VALUES (1, ?, ?, 200)").run(
      JSON.stringify(DEFAULT_FURNITURE_IDS),
      JSON.stringify(DEFAULT_FURNITURE_SET)
    );

    seedMissingMaps(db);
    seedExpeditionProgress(db);
    ensureExpeditionSettings(db);
  });
  tx();
  return getSave(db);
}

function getSave(db: Database.Database): SaveState {
  const player = db.prepare("SELECT * FROM players WHERE id = 1").get() as Row | undefined;
  if (!player) {
    throw new Error("Local Kancolle account has not been registered. Select a world first.");
  }
  settleCompletedRepairs(db);
  syncExpeditionDeckStates(db);
  settleMaterialRecovery(db);

  return {
    player: mapPlayer(player),
    materials: mapMaterials(db.prepare("SELECT * FROM materials WHERE player_id = 1").get() as Row),
    ships: (db.prepare("SELECT * FROM ships ORDER BY id").all() as Row[]).map(mapShip),
    slotItems: (db.prepare("SELECT * FROM slot_items ORDER BY id").all() as Row[]).map(mapSlotItem),
    decks: (db.prepare("SELECT * FROM decks ORDER BY id").all() as Row[]).map(mapDeck),
    repairDocks: (db.prepare("SELECT * FROM repair_docks ORDER BY id").all() as Row[]).map(mapRepairDock),
    buildDocks: (db.prepare("SELECT * FROM build_docks ORDER BY id").all() as Row[]).map(mapBuildDock),
    quests: (db.prepare("SELECT * FROM quests ORDER BY id").all() as Row[]).map(mapQuest),
    furniture: mapFurniture(db.prepare("SELECT * FROM furniture WHERE id = 1").get() as Row),
    maps: (db.prepare("SELECT * FROM maps ORDER BY id").all() as Row[]).map(mapMap),
    sortieSession: mapNullable(db.prepare("SELECT * FROM sortie_sessions WHERE id = 1").get() as Row | undefined, mapSortieSession),
    expeditionProgress: (db.prepare("SELECT * FROM expedition_progress ORDER BY mission_id").all() as Row[]).map(mapExpeditionProgress),
    expeditionRuns: (db.prepare("SELECT * FROM expedition_runs ORDER BY deck_id").all() as Row[]).map(mapExpeditionRun),
    expeditionSettings: mapExpeditionSettings(
      db.prepare("SELECT * FROM expedition_settings WHERE id = 1").get() as Row
    ),
    useItems: (db.prepare("SELECT * FROM use_items ORDER BY id").all() as Row[]).map(mapUseItem)
  };
}

function mapPlayer(row: Row): Player {
  return {
    id: Number(row.id),
    worldId: Number(row.world_id),
    nickname: String(row.nickname),
    level: Number(row.level),
    exp: Number(row.exp ?? 0),
    comment: String(row.comment),
    tutorialProgress: Number(row.tutorial_progress),
    options: parseJson<PlayerOptions>(row.options_json, defaultOptions),
    flagshipPosition: Number(row.flagship_position),
    combinedFleet: Number(row.combined_fleet),
    portBgmId: Number(row.port_bgm_id)
  };
}

function mapMaterials(row: Row): Materials {
  return {
    fuel: Number(row.fuel),
    ammo: Number(row.ammo),
    steel: Number(row.steel),
    bauxite: Number(row.bauxite),
    buildKit: Number(row.build_kit),
    repairKit: Number(row.repair_kit),
    devmat: Number(row.devmat),
    screw: Number(row.screw)
  };
}

function mapShip(row: Row): Ship {
  return {
    id: Number(row.id),
    masterId: Number(row.master_id),
    level: Number(row.level),
    exp: Number(row.exp),
    hp: Number(row.hp),
    maxHp: Number(row.max_hp),
    condition: Number(row.condition),
    fuel: Number(row.fuel),
    maxFuel: Number(row.max_fuel),
    ammo: Number(row.ammo),
    maxAmmo: Number(row.max_ammo),
    locked: Number(row.locked),
    slotIds: parseJson<number[]>(row.slot_ids_json, [-1, -1, -1, -1, -1]),
    onSlot: normalizeFixed(parseJson<number[]>(row.onslot_json, EMPTY_ONSLOT), 5, 0),
    exSlotId: Number(row.ex_slot_id),
    stats: parseJson<JsonObject>(row.stats_json, {})
  };
}

function mapSlotItem(row: Row): SlotItem {
  return {
    id: Number(row.id),
    masterId: Number(row.master_id),
    level: Number(row.level),
    proficiency: Number(row.proficiency),
    locked: Number(row.locked)
  };
}

function mapDeck(row: Row): Deck {
  return {
    id: Number(row.id),
    name: String(row.name),
    missionState: parseJson(row.mission_json, { state: 0, missionId: 0, completeTime: 0 }),
    shipIds: parseJson<number[]>(row.ship_ids_json, [-1, -1, -1, -1, -1, -1])
  };
}

function mapRepairDock(row: Row): RepairDock {
  return {
    id: Number(row.id),
    shipId: Number(row.ship_id),
    completeTime: Number(row.complete_time),
    state: Number(row.state)
  };
}

function mapBuildDock(row: Row): BuildDock {
  return {
    id: Number(row.id),
    recipe: parseJson<JsonObject>(row.recipe_json, {}),
    resultMasterId: Number(row.result_master_id),
    completeTime: Number(row.complete_time),
    state: Number(row.state)
  };
}

function mapExpeditionProgress(row: Row): ExpeditionProgress {
  return {
    missionId: Number(row.mission_id),
    unlocked: Number(row.unlocked),
    completedCount: Number(row.completed_count),
    periodKey: String(row.period_key),
    periodCount: Number(row.period_count)
  };
}

function mapExpeditionRun(row: Row): ExpeditionRun {
  return {
    deckId: Number(row.deck_id),
    missionId: Number(row.mission_id),
    status: String(row.status) as ExpeditionRun["status"],
    serialCid: String(row.serial_cid),
    seed: Number(row.seed),
    startedAt: Number(row.started_at),
    completeAt: Number(row.complete_at),
    snapshot: parseJson<JsonObject>(row.snapshot_json, {}),
    outcome: row.outcome_json == null ? null : parseJson<JsonObject>(row.outcome_json, {}),
    result: row.result_json == null ? null : parseJson<JsonObject>(row.result_json, {}),
    supportCount: Number(row.support_count)
  };
}

function mapExpeditionSettings(row: Row): ExpeditionSettings {
  return {
    fixedSeed: row.fixed_seed == null ? null : Number(row.fixed_seed),
    clockOffsetMs: Number(row.clock_offset_ms),
    unlockAll: Number(row.unlock_all)
  };
}

function mapUseItem(row: Row): UseItemInventory {
  return { id: Number(row.id), count: Number(row.count) };
}

function mapQuest(row: Row): Quest {
  return {
    id: Number(row.id),
    active: Number(row.active),
    progress: Number(row.progress),
    completed: Number(row.completed)
  };
}

function mapFurniture(row: Row): FurnitureState {
  const set = normalizeFurnitureSet(parseJson<Partial<FurnitureState["set"]>>(row.set_json, DEFAULT_FURNITURE_SET));
  return {
    owned: normalizeOwnedFurniture(parseJson<number[]>(row.owned_json, [])),
    set,
    coins: Math.max(0, Math.trunc(safeNum(row.coins, 200)))
  };
}

function mapMap(row: Row): MapState {
  return {
    id: Number(row.id),
    areaId: Number(row.area_id),
    mapNo: Number(row.map_no),
    unlocked: Number(row.unlocked),
    cleared: Number(row.cleared),
    gauge: Number(row.gauge),
    phase: Number(row.phase ?? 1),
    phaseProgress: Number(row.phase_progress ?? 0)
  };
}

function mapSortieSession(row: Row): SortieSession {
  return {
    id: Number(row.id),
    deckId: Number(row.deck_id),
    areaId: Number(row.area_id),
    mapNo: Number(row.map_no),
    node: Number(row.node),
    seed: Number(row.seed),
    state: parseJson<JsonObject>(row.state_json, {})
  };
}

function mapNullable<T>(row: Row | undefined, mapper: (row: Row) => T): T | null {
  return row ? mapper(row) : null;
}

function parseJson<T>(value: unknown, fallback: T): T {
  if (typeof value !== "string") return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function createSlotItem(db: Database.Database, masterId: number): SlotItem {
  const info = db.prepare("INSERT INTO slot_items (master_id, level, proficiency, locked) VALUES (?, 0, 0, 0)").run(masterId);
  return mapSlotItem(db.prepare("SELECT * FROM slot_items WHERE id = ?").get(Number(info.lastInsertRowid)) as Row);
}

function createShip(db: Database.Database, masterId: number): Ship {
  const master = masterData.api_mst_ship.find((s) => s.api_id === masterId);
  const maxHp = shipInitialMaxHp(master);
  const maxFuel = master?.api_fuel_max ?? 20;
  const maxAmmo = master?.api_bull_max ?? 20;
  const info = db.prepare(
    "INSERT INTO ships (master_id, level, exp, hp, max_hp, condition, fuel, max_fuel, ammo, max_ammo, locked, slot_ids_json, onslot_json, ex_slot_id, stats_json) VALUES (?, 1, 0, ?, ?, 49, ?, ?, ?, ?, 0, ?, ?, -1, '{}')"
  ).run(masterId, maxHp, maxHp, maxFuel, maxFuel, maxAmmo, maxAmmo, JSON.stringify([-1, -1, -1, -1, -1]), JSON.stringify(EMPTY_ONSLOT));
  return mapShip(db.prepare("SELECT * FROM ships WHERE id = ?").get(Number(info.lastInsertRowid)) as Row);
}

function onSlotForShip(
  master: (typeof masterData.api_mst_ship)[number] | undefined,
  slotItems: SlotItem[],
  slotIds: number[],
  current: number[] = [],
  refillEmptyAircraft = true
) {
  const maxeq = Array.isArray(master?.api_maxeq) ? master.api_maxeq : [];
  const fixedSlots = normalizeFixed(slotIds, 5, -1);
  const fixedCurrent = normalizeFixed(current, 5, -1);
  return fixedSlots.map((slotItemId, index) => {
    if (slotItemId <= 0) return 0;
    const item = slotItems.find((slotItem) => slotItem.id === slotItemId);
    const slotMaster = item ? masterData.api_mst_slotitem.find((slot) => slot.api_id === item.masterId) : undefined;
    const max = Math.max(0, Math.trunc(safeNum(maxeq[index])));
    if (!slotMaster || !isAircraftSlotItem(slotMaster) || max <= 0) return 0;
    const previous = Math.trunc(safeNum(fixedCurrent[index], -1));
    if (previous > 0) return Math.min(previous, max);
    return refillEmptyAircraft ? max : 0;
  });
}

function aircraftRefillCount(current: number[], target: number[]) {
  const fixedCurrent = normalizeFixed(current, 5, 0);
  const fixedTarget = normalizeFixed(target, 5, 0);
  return fixedTarget.reduce((sum, targetCount, index) => sum + Math.max(0, targetCount - fixedCurrent[index]), 0);
}

function shipInitialMaxHp(master: (typeof masterData.api_mst_ship)[number] | undefined, fallback = 15) {
  const value = Array.isArray(master?.api_taik) ? master.api_taik[0] : master?.api_taik;
  const hp = Number(value);
  return Number.isFinite(hp) && hp > 0 ? Math.trunc(hp) : fallback;
}

function consumeMaterials(db: Database.Database, delta: MaterialDelta) {
  updateMaterials(db, delta, -1);
}

function addMaterials(db: Database.Database, delta: MaterialDelta) {
  updateMaterials(db, delta, 1);
}

function updateMaterials(db: Database.Database, delta: MaterialDelta, sign: 1 | -1) {
  settleMaterialRecovery(db);
  const current = mapMaterials(db.prepare("SELECT * FROM materials WHERE player_id = 1").get() as Row);
  const next: Materials = {
    fuel: clampBasicMaterial(current.fuel + sign * (delta.fuel || 0)),
    ammo: clampBasicMaterial(current.ammo + sign * (delta.ammo || 0)),
    steel: clampBasicMaterial(current.steel + sign * (delta.steel || 0)),
    bauxite: clampBasicMaterial(current.bauxite + sign * (delta.bauxite || 0)),
    buildKit: clampMaterialCount(current.buildKit + sign * (delta.buildKit || 0)),
    repairKit: clampMaterialCount(current.repairKit + sign * (delta.repairKit || 0)),
    devmat: clampMaterialCount(current.devmat + sign * (delta.devmat || 0)),
    screw: clampMaterialCount(current.screw + sign * (delta.screw || 0))
  };
  db.prepare(
    "UPDATE materials SET fuel = ?, ammo = ?, steel = ?, bauxite = ?, build_kit = ?, repair_kit = ?, devmat = ?, screw = ? WHERE player_id = 1"
  ).run(next.fuel, next.ammo, next.steel, next.bauxite, next.buildKit, next.repairKit, next.devmat, next.screw);
}

function settleMaterialRecovery(db: Database.Database, now = Date.now()) {
  const row = db.prepare("SELECT * FROM materials WHERE player_id = 1").get() as Row | undefined;
  if (!row) return;

  const nowMs = Math.trunc(now);
  const lastRaw = Number(row.last_recovery_at);
  const hasValidLastRecovery = Number.isFinite(lastRaw) && lastRaw > 0;
  const lastRecoveryAt = hasValidLastRecovery ? Math.trunc(lastRaw) : nowMs;
  const elapsed = Math.max(0, nowMs - lastRecoveryAt);
  const ticks = Math.floor(elapsed / MATERIAL_RECOVERY_INTERVAL_MS);
  const nextRecoveryAt = ticks > 0
    ? lastRecoveryAt + ticks * MATERIAL_RECOVERY_INTERVAL_MS
    : lastRecoveryAt;
  const next = {
    fuel: clampBasicMaterial(safeNum(row.fuel) + ticks * 3),
    ammo: clampBasicMaterial(safeNum(row.ammo) + ticks * 3),
    steel: clampBasicMaterial(safeNum(row.steel) + ticks * 3),
    bauxite: clampBasicMaterial(safeNum(row.bauxite) + ticks)
  };
  const changed =
    !hasValidLastRecovery ||
    ticks > 0 ||
    next.fuel !== safeNum(row.fuel) ||
    next.ammo !== safeNum(row.ammo) ||
    next.steel !== safeNum(row.steel) ||
    next.bauxite !== safeNum(row.bauxite);

  if (!changed) return;
  db.prepare(`
    UPDATE materials
    SET fuel = ?, ammo = ?, steel = ?, bauxite = ?, last_recovery_at = ?
    WHERE player_id = 1
  `).run(next.fuel, next.ammo, next.steel, next.bauxite, nextRecoveryAt);
}

function clampBasicMaterial(value: number) {
  return Math.min(BASIC_MATERIAL_CAP, clampMaterialCount(value));
}

function clampMaterialCount(value: number) {
  const n = Math.trunc(Number(value));
  return Number.isFinite(n) ? Math.max(0, n) : 0;
}

function hasMaterials(materials: Materials, delta: MaterialDelta) {
  return (Object.entries(delta) as [keyof Materials, number | undefined][])
    .every(([key, value]) => materials[key] >= Math.max(0, value || 0));
}

function settleCompletedRepairs(db: Database.Database, now = Date.now()) {
  const completedDocks = db.prepare(
    "SELECT * FROM repair_docks WHERE state = 1 AND ship_id > 0 AND complete_time > 0 AND complete_time <= ?"
  ).all(now) as Row[];
  if (completedDocks.length === 0) return;

  const tx = db.transaction(() => {
    for (const row of completedDocks) finishRepairDock(db, mapRepairDock(row));
  });
  tx();
}

function syncExpeditionDeckStates(db: Database.Database) {
  const now = expeditionNow(db);
  const rows = db.prepare(`
    SELECT deck_id, mission_id, status, complete_at
    FROM expedition_runs
    WHERE status IN ('active', 'returning')
  `).all() as Row[];
  if (rows.length === 0) return;

  const update = db.prepare("UPDATE decks SET mission_json = ? WHERE id = ?");
  const tx = db.transaction(() => {
    for (const row of rows) {
      const completeAt = Number(row.complete_at);
      const state = String(row.status) === "returning" || completeAt <= now ? 2 : 1;
      update.run(
        JSON.stringify({
          state,
          missionId: Number(row.mission_id),
          completeTime: completeAt
        }),
        Number(row.deck_id)
      );
    }
  });
  tx();
}

function finishRepairDock(db: Database.Database, dock: RepairDock) {
  restoreShipAfterRepair(db, dock.shipId);
  clearRepairDock(db, dock.id);
}

function restoreShipAfterRepair(db: Database.Database, shipId: number) {
  db.prepare(
    "UPDATE ships SET hp = max_hp, condition = CASE WHEN condition < ? THEN ? ELSE condition END WHERE id = ?"
  ).run(REPAIR_COMPLETE_CONDITION, REPAIR_COMPLETE_CONDITION, shipId);
}

function clearRepairDock(db: Database.Database, dockId: number) {
  db.prepare("UPDATE repair_docks SET ship_id = 0, complete_time = 0, state = 0 WHERE id = ?").run(dockId);
}

function normalizeFixed<T>(values: T[], length: number, fill: T): T[] {
  return [...values, ...Array(length).fill(fill)].slice(0, length);
}

function consumeBattleSupply(db: Database.Database, shipIds: number[] | undefined, pursuedNightBattle: boolean) {
  const save = getSave(db);
  const update = db.prepare("UPDATE ships SET fuel = max(0, fuel - ?), ammo = max(0, ammo - ?) WHERE id = ?");
  for (const shipId of shipIds ?? []) {
    if (shipId <= 0) continue;
    const ship = save.ships.find((item) => item.id === shipId);
    if (!ship) continue;
    const master = masterData.api_mst_ship.find((item) => item.api_id === ship.masterId);
    const cost = battleSupplyCost(
      master?.api_fuel_max ?? ship.maxFuel,
      master?.api_bull_max ?? ship.maxAmmo,
      pursuedNightBattle
    );
    update.run(cost.fuel, cost.ammo, shipId);
  }
}

function seedMissingMaps(db: Database.Database) {
  const insert = db.prepare(
    "INSERT OR IGNORE INTO maps (id, area_id, map_no, unlocked, cleared, gauge, phase, phase_progress) VALUES (?, ?, ?, 1, 0, ?, 1, 0)"
  );
  for (const map of masterData.api_mst_mapinfo) {
    insert.run(
      map.api_id,
      map.api_maparea_id,
      map.api_no,
      initialMapGauge(map.api_id, map.api_required_defeat_count)
    );
  }
}
