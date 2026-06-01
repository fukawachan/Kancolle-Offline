import Database from "better-sqlite3";
import { dirname } from "node:path";
import { mkdirSync } from "node:fs";
import type {
  BuildDock,
  Deck,
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
  SortieSession
} from "./types.js";

export type StateStoreOptions = {
  databasePath: string;
};

export type StateStore = ReturnType<typeof createStateStore>;

type Row = Record<string, unknown>;

const defaultOptions: PlayerOptions = {
  bgmFlag: 1,
  voiceFlag: 1,
  seFlag: 1,
  volBgm: 80,
  volSe: 80,
  volVoice: 80
};

export const LOCAL_WORLD_ID = 15;
const SCHEMA_VERSION = 2;

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
    supplyShips: (shipIds: number[]) => {
      const save = getSave(db);
      let fuel = 0;
      let ammo = 0;
      const update = db.prepare("UPDATE ships SET fuel = ?, ammo = ? WHERE id = ?");
      const tx = db.transaction(() => {
        for (const shipId of shipIds) {
          const ship = save.ships.find((item) => item.id === shipId);
          if (!ship) continue;
          fuel += Math.max(0, ship.maxFuel - ship.fuel);
          ammo += Math.max(0, ship.maxAmmo - ship.ammo);
          update.run(ship.maxFuel, ship.maxAmmo, ship.id);
        }
        consumeMaterials(db, { fuel, ammo });
      });
      tx();
      return getSave(db).ships.filter((ship) => shipIds.includes(ship.id));
    },
    equipSlotItem: (shipId: number, slotIndex: number, itemId: number) => {
      const save = getSave(db);
      const ship = save.ships.find((item) => item.id === shipId);
      if (!ship) return null;
      const slotIds = normalizeFixed(ship.slotIds, 5, -1);
      slotIds[Math.max(0, slotIndex)] = itemId;
      db.prepare("UPDATE ships SET slot_ids_json = ? WHERE id = ?").run(JSON.stringify(slotIds), shipId);
      return getSave(db).ships.find((item) => item.id === shipId);
    },
    equipExSlotItem: (shipId: number, itemId: number) => {
      db.prepare("UPDATE ships SET ex_slot_id = ? WHERE id = ?").run(itemId, shipId);
      return getSave(db).ships.find((item) => item.id === shipId);
    },
    unsetAllSlots: (shipId: number) => {
      db.prepare("UPDATE ships SET slot_ids_json = ?, ex_slot_id = -1 WHERE id = ?").run(JSON.stringify([-1, -1, -1, -1, -1]), shipId);
      return getSave(db).ships.find((item) => item.id === shipId);
    },
    exchangeSlotIndex: (shipId: number, from: number, to: number) => {
      const ship = getSave(db).ships.find((item) => item.id === shipId);
      if (!ship) return null;
      const slotIds = normalizeFixed(ship.slotIds, 5, -1);
      const moving = slotIds[from];
      slotIds[from] = slotIds[to];
      slotIds[to] = moving;
      db.prepare("UPDATE ships SET slot_ids_json = ? WHERE id = ?").run(JSON.stringify(slotIds), shipId);
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
      db.prepare("UPDATE ships SET master_id = ?, level = level + 1 WHERE id = ?").run(masterId, shipId);
      return getSave(db).ships.find((item) => item.id === shipId);
    },
    createSlotItem: (masterId: number) => createSlotItem(db, masterId),
    destroySlotItem: (itemIds: number[]) => {
      const tx = db.transaction(() => {
        for (const id of itemIds) db.prepare("DELETE FROM slot_items WHERE id = ?").run(id);
        addMaterials(db, { fuel: itemIds.length, ammo: itemIds.length, steel: itemIds.length * 2, bauxite: 0 });
      });
      tx();
      return getSave(db).materials;
    },
    createShip: (masterId: number) => createShip(db, masterId),
    destroyShip: (shipIds: number[]) => {
      const tx = db.transaction(() => {
        for (const id of shipIds) db.prepare("DELETE FROM ships WHERE id = ?").run(id);
        addMaterials(db, { fuel: shipIds.length, ammo: shipIds.length, steel: shipIds.length * 2, bauxite: 0 });
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
    buyFurniture: (furnitureId: number) => {
      const current = getSave(db).furniture;
      const owned = Array.from(new Set([...current.owned, furnitureId]));
      db.prepare("UPDATE furniture SET owned_json = ?, coins = max(0, coins - 10) WHERE id = 1").run(JSON.stringify(owned));
      return getSave(db).furniture;
    },
    startRepair: (shipId: number, highspeed: boolean) => {
      const dock = firstDock(getSave(db).repairDocks);
      const completeTime = highspeed ? Date.now() : Date.now() + 30 * 60_000;
      db.prepare("UPDATE repair_docks SET ship_id = ?, complete_time = ?, state = 1 WHERE id = ?").run(shipId, completeTime, dock.id);
      if (highspeed) {
        db.prepare("UPDATE ships SET hp = max_hp WHERE id = ?").run(shipId);
        db.prepare("UPDATE repair_docks SET ship_id = 0, complete_time = 0, state = 0 WHERE id = ?").run(dock.id);
        consumeMaterials(db, { repairKit: 1 });
      }
      return getSave(db).repairDocks.find((item) => item.id === dock.id);
    },
    completeRepair: (dockId: number) => {
      const dock = getSave(db).repairDocks.find((item) => item.id === dockId);
      if (dock?.shipId) db.prepare("UPDATE ships SET hp = max_hp WHERE id = ?").run(dock.shipId);
      db.prepare("UPDATE repair_docks SET ship_id = 0, complete_time = 0, state = 0 WHERE id = ?").run(dockId);
      consumeMaterials(db, { repairKit: 1 });
      return getSave(db).repairDocks.find((item) => item.id === dockId);
    },
    startBuild: (dockId: number, recipe: JsonObject, resultMasterId = 6) => {
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
      const ship = createShip(db, dock?.resultMasterId || 6);
      db.prepare("UPDATE build_docks SET recipe_json = '{}', result_master_id = 0, complete_time = 0, state = 0 WHERE id = ?").run(dockId);
      return ship;
    },
    startMission: (deckId: number, missionId: number) => {
      const missionState = { state: 2, missionId, completeTime: Date.now() + 30 * 60_000 };
      db.prepare("UPDATE decks SET mission_json = ? WHERE id = ?").run(JSON.stringify(missionState), deckId);
      return missionState;
    },
    completeMission: (deckId: number) => {
      db.prepare("UPDATE decks SET mission_json = ? WHERE id = ?").run(JSON.stringify({ state: 0, missionId: 0, completeTime: 0 }), deckId);
      addMaterials(db, { fuel: 30, ammo: 30, steel: 0, bauxite: 0 });
      return getSave(db).materials;
    },
    recallMission: (deckId: number) => {
      db.prepare("UPDATE decks SET mission_json = ? WHERE id = ?").run(JSON.stringify({ state: 0, missionId: 0, completeTime: 0 }), deckId);
      return getSave(db).decks.find((deck) => deck.id === deckId);
    },
    startSortie: (deckId: number, areaId: number, mapNo: number) => {
      const seed = Number(`${Date.now()}`.slice(-8));
      db.prepare("DELETE FROM sortie_sessions").run();
      db.prepare(
        "INSERT INTO sortie_sessions (id, deck_id, area_id, map_no, node, seed, state_json) VALUES (1, ?, ?, ?, 1, ?, ?)"
      ).run(deckId, areaId, mapNo, seed, JSON.stringify({ battles: 0 }));
      const deck = getSave(db).decks.find((item) => item.id === deckId);
      if (deck) consumeSortieSupply(db, deck);
      return getSave(db).sortieSession;
    },
    nextSortieNode: () => {
      const session = getSave(db).sortieSession;
      if (!session) return null;
      db.prepare("UPDATE sortie_sessions SET node = node + 1 WHERE id = ?").run(session.id);
      return getSave(db).sortieSession;
    },
    clearSortie: () => {
      db.prepare("DELETE FROM sortie_sessions").run();
    }
  };
}

function migrate(db: Database.Database) {
  const currentVersion = schemaVersion(db);
  if (currentVersion !== SCHEMA_VERSION) {
    resetSchema(db);
    return;
  }

  createSchema(db);
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
      screw INTEGER NOT NULL
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
      gauge INTEGER NOT NULL
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
      "INSERT INTO players (id, world_id, nickname, level, comment, tutorial_progress, options_json, flagship_position, combined_fleet, port_bgm_id) VALUES (1, ?, ?, 1, ?, 100, ?, 1, 0, 1)"
    ).run(worldId, "Local Admiral", "Local offline save", JSON.stringify(defaultOptions));
    db.prepare(
      "INSERT INTO materials (player_id, fuel, ammo, steel, bauxite, build_kit, repair_kit, devmat, screw) VALUES (1, 1000, 1000, 1000, 1000, 10, 10, 50, 5)"
    ).run();

    for (const masterId of [6, 7, 1, 2]) {
      db.prepare(
        "INSERT INTO ships (master_id, level, exp, hp, max_hp, condition, fuel, max_fuel, ammo, max_ammo, locked, slot_ids_json, ex_slot_id, stats_json) VALUES (?, 1, 0, ?, ?, 49, 0, ?, 0, ?, 0, ?, -1, ?)"
      ).run(masterId, masterId === 6 ? 15 : 13, masterId === 6 ? 15 : 13, 20, 20, JSON.stringify([-1, -1, -1, -1, -1]), JSON.stringify({}));
    }

    for (const masterId of [1, 1, 2, 10]) {
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
      JSON.stringify([1, 2, 3, 4, 5, 6]),
      JSON.stringify({ api_floor: 1, api_wall: 2, api_window: 3, api_chest: 4, api_desk: 5, api_object: 0 })
    );

    db.prepare("INSERT INTO maps (id, area_id, map_no, unlocked, cleared, gauge) VALUES (1, 1, 1, 1, 0, 0)").run();
  });
  tx();
  return getSave(db);
}

function getSave(db: Database.Database): SaveState {
  const player = db.prepare("SELECT * FROM players WHERE id = 1").get() as Row | undefined;
  if (!player) {
    throw new Error("Local Kancolle account has not been registered. Select a world first.");
  }

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
    sortieSession: mapNullable(db.prepare("SELECT * FROM sortie_sessions WHERE id = 1").get() as Row | undefined, mapSortieSession)
  };
}

function mapPlayer(row: Row): Player {
  return {
    id: Number(row.id),
    worldId: Number(row.world_id),
    nickname: String(row.nickname),
    level: Number(row.level),
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

function mapQuest(row: Row): Quest {
  return {
    id: Number(row.id),
    active: Number(row.active),
    progress: Number(row.progress),
    completed: Number(row.completed)
  };
}

function mapFurniture(row: Row): FurnitureState {
  return {
    owned: parseJson<number[]>(row.owned_json, []),
    set: parseJson(row.set_json, { api_floor: 1, api_wall: 2, api_window: 3, api_chest: 4, api_desk: 5, api_object: 6 }),
    coins: Number(row.coins)
  };
}

function mapMap(row: Row): MapState {
  return {
    id: Number(row.id),
    areaId: Number(row.area_id),
    mapNo: Number(row.map_no),
    unlocked: Number(row.unlocked),
    cleared: Number(row.cleared),
    gauge: Number(row.gauge)
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
  const maxHp = masterId === 89 ? 74 : masterId === 45 ? 26 : 15;
  const info = db.prepare(
    "INSERT INTO ships (master_id, level, exp, hp, max_hp, condition, fuel, max_fuel, ammo, max_ammo, locked, slot_ids_json, ex_slot_id, stats_json) VALUES (?, 1, 0, ?, ?, 49, 0, 20, 0, 20, 0, ?, -1, '{}')"
  ).run(masterId, maxHp, maxHp, JSON.stringify([-1, -1, -1, -1, -1]));
  return mapShip(db.prepare("SELECT * FROM ships WHERE id = ?").get(Number(info.lastInsertRowid)) as Row);
}

function consumeMaterials(db: Database.Database, delta: MaterialDelta) {
  updateMaterials(db, delta, -1);
}

function addMaterials(db: Database.Database, delta: MaterialDelta) {
  updateMaterials(db, delta, 1);
}

function updateMaterials(db: Database.Database, delta: MaterialDelta, sign: 1 | -1) {
  const current = mapMaterials(db.prepare("SELECT * FROM materials WHERE player_id = 1").get() as Row);
  const next: Materials = {
    fuel: Math.max(0, current.fuel + sign * (delta.fuel || 0)),
    ammo: Math.max(0, current.ammo + sign * (delta.ammo || 0)),
    steel: Math.max(0, current.steel + sign * (delta.steel || 0)),
    bauxite: Math.max(0, current.bauxite + sign * (delta.bauxite || 0)),
    buildKit: Math.max(0, current.buildKit + sign * (delta.buildKit || 0)),
    repairKit: Math.max(0, current.repairKit + sign * (delta.repairKit || 0)),
    devmat: Math.max(0, current.devmat + sign * (delta.devmat || 0)),
    screw: Math.max(0, current.screw + sign * (delta.screw || 0))
  };
  db.prepare(
    "UPDATE materials SET fuel = ?, ammo = ?, steel = ?, bauxite = ?, build_kit = ?, repair_kit = ?, devmat = ?, screw = ? WHERE player_id = 1"
  ).run(next.fuel, next.ammo, next.steel, next.bauxite, next.buildKit, next.repairKit, next.devmat, next.screw);
}

function normalizeFixed<T>(values: T[], length: number, fill: T): T[] {
  return [...values, ...Array(length).fill(fill)].slice(0, length);
}

function firstDock<T extends { id: number; state: number }>(docks: T[]): T {
  return docks.find((dock) => dock.state === 0) || docks[0];
}

function consumeSortieSupply(db: Database.Database, deck: Deck) {
  const save = getSave(db);
  const shipIds = deck.shipIds.filter((id) => id > 0);
  const tx = db.transaction(() => {
    for (const shipId of shipIds) {
      const ship = save.ships.find((item) => item.id === shipId);
      if (!ship) continue;
      db.prepare("UPDATE ships SET fuel = max(0, fuel - 2), ammo = max(0, ammo - 2) WHERE id = ?").run(shipId);
    }
  });
  tx();
}
