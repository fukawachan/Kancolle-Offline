import type { ExpeditionRun, JsonObject, SaveState, SortieSession } from "./types.js";

export type SlotItemOwner =
  | { kind: "ship-slot"; shipId: number; slotIndex: number }
  | { kind: "ship-extra-slot"; shipId: number }
  | { kind: "air-base"; areaId: number; baseId: number; squadronId: number };

export type ShipReference =
  | { kind: "deck"; deckId: number; slotIndex: number }
  | { kind: "preset-deck"; presetNo: number; slotIndex: number }
  | { kind: "repair-dock"; dockId: number }
  | { kind: "sortie"; sessionId: number }
  | { kind: "expedition"; deckId: number }
  | { kind: "battle"; session: "sortie" | "practice" | "combined" };

export type StateReferenceIndex = {
  slotItemOwners: Map<number, SlotItemOwner[]>;
  shipReferences: Map<number, ShipReference[]>;
};

export type StateIntegrityIssue =
  | { kind: "dangling-slot-item"; slotItemId: number; owner: SlotItemOwner }
  | { kind: "duplicate-slot-item-owner"; slotItemId: number; owners: SlotItemOwner[] }
  | { kind: "dangling-ship"; shipId: number; reference: ShipReference };

export type BattleShipReferences = {
  session: "practice" | "combined";
  record: JsonObject;
};

/**
 * Builds the live reference graph without changing the supplied snapshot.
 * Equipment presets contain master/level templates rather than instance ids,
 * so they deliberately do not participate in equipment ownership.
 */
export function buildStateReferenceIndex(
  save: SaveState,
  battleRecords: BattleShipReferences[] = []
): StateReferenceIndex {
  const slotItemOwners = new Map<number, SlotItemOwner[]>();
  const shipReferences = new Map<number, ShipReference[]>();

  const addOwner = (slotItemId: number, owner: SlotItemOwner) => {
    if (!Number.isInteger(slotItemId) || slotItemId <= 0) return;
    const owners = slotItemOwners.get(slotItemId) ?? [];
    owners.push(owner);
    slotItemOwners.set(slotItemId, owners);
  };
  const addShipReference = (shipId: number, reference: ShipReference) => {
    if (!Number.isInteger(shipId) || shipId <= 0) return;
    const references = shipReferences.get(shipId) ?? [];
    references.push(reference);
    shipReferences.set(shipId, references);
  };

  for (const ship of save.ships) {
    ship.slotIds.forEach((slotItemId, slotIndex) => {
      addOwner(slotItemId, { kind: "ship-slot", shipId: ship.id, slotIndex });
    });
    addOwner(ship.exSlotId, { kind: "ship-extra-slot", shipId: ship.id });
  }

  for (const base of save.airBases) {
    for (const squadron of base.squadrons) {
      addOwner(squadron.slotItemId, {
        kind: "air-base",
        areaId: base.areaId,
        baseId: base.baseId,
        squadronId: squadron.squadronId
      });
    }
  }

  for (const deck of save.decks) {
    deck.shipIds.forEach((shipId, slotIndex) => {
      addShipReference(shipId, { kind: "deck", deckId: deck.id, slotIndex });
    });
  }
  for (const preset of save.presetDecks) {
    preset.shipIds.forEach((shipId, slotIndex) => {
      addShipReference(shipId, { kind: "preset-deck", presetNo: preset.presetNo, slotIndex });
    });
  }
  for (const dock of save.repairDocks) {
    if (dock.shipId > 0) addShipReference(dock.shipId, { kind: "repair-dock", dockId: dock.id });
  }

  addSortieReferences(save.sortieSession, addShipReference);
  for (const run of save.expeditionRuns) addExpeditionReferences(run, addShipReference);
  for (const battle of battleRecords) {
    if (battleIsClaimed(battle.record)) continue;
    for (const shipId of battleShipIds(battle.record)) {
      addShipReference(shipId, { kind: "battle", session: battle.session });
    }
  }

  return { slotItemOwners, shipReferences };
}

export function stateIntegrityIssues(
  save: SaveState,
  battleRecords: BattleShipReferences[] = []
): StateIntegrityIssue[] {
  const index = buildStateReferenceIndex(save, battleRecords);
  const slotItemIds = new Set(save.slotItems.map((item) => item.id));
  const shipIds = new Set(save.ships.map((ship) => ship.id));
  const issues: StateIntegrityIssue[] = [];

  for (const [slotItemId, owners] of index.slotItemOwners) {
    if (!slotItemIds.has(slotItemId)) {
      for (const owner of owners) issues.push({ kind: "dangling-slot-item", slotItemId, owner });
    }
    if (owners.length > 1) issues.push({ kind: "duplicate-slot-item-owner", slotItemId, owners });
  }
  for (const [shipId, references] of index.shipReferences) {
    if (shipIds.has(shipId)) continue;
    for (const reference of references) issues.push({ kind: "dangling-ship", shipId, reference });
  }
  return issues;
}

export function slotItemOwner(
  save: SaveState,
  slotItemId: number
): SlotItemOwner | null {
  const owners = buildStateReferenceIndex(save).slotItemOwners.get(slotItemId) ?? [];
  return owners.length === 1 ? owners[0] : null;
}

export function slotItemOwners(save: SaveState, slotItemId: number): SlotItemOwner[] {
  return buildStateReferenceIndex(save).slotItemOwners.get(slotItemId) ?? [];
}

export function shipReferences(
  save: SaveState,
  shipId: number,
  battleRecords: BattleShipReferences[] = []
): ShipReference[] {
  return buildStateReferenceIndex(save, battleRecords).shipReferences.get(shipId) ?? [];
}

function addSortieReferences(
  session: SortieSession | null,
  add: (shipId: number, reference: ShipReference) => void
) {
  if (!session) return;
  const ids = new Set<number>();
  const fleet = jsonObject(session.state.fleet);
  const ships = Array.isArray(fleet?.ships) ? fleet.ships : [];
  for (const value of ships) {
    const ship = jsonObject(value);
    addPositiveInteger(ship?.id, ids);
  }
  const battle = jsonObject(session.state.lastBattle);
  if (battle && !battleIsClaimed(battle)) {
    for (const shipId of battleShipIds(battle)) ids.add(shipId);
  }
  for (const shipId of ids) add(shipId, { kind: "sortie", sessionId: session.id });
}

function addExpeditionReferences(
  run: ExpeditionRun,
  add: (shipId: number, reference: ShipReference) => void
) {
  if (run.status !== "active" && run.status !== "returning") return;
  const ships = Array.isArray(run.snapshot.ships) ? run.snapshot.ships : [];
  for (const value of ships) {
    const ship = jsonObject(value);
    const shipId = Number(ship?.id);
    if (Number.isInteger(shipId) && shipId > 0) {
      add(shipId, { kind: "expedition", deckId: run.deckId });
    }
  }
}

function battleShipIds(record: JsonObject) {
  const ids = new Set<number>();
  for (const field of ["shipIds", "escortShipIds"]) {
    const values = Array.isArray(record[field]) ? record[field] : [];
    for (const value of values) addPositiveInteger(value, ids);
  }
  return ids;
}

function addPositiveInteger(value: unknown, output: Set<number>) {
  const id = Number(value);
  if (Number.isInteger(id) && id > 0) output.add(id);
}

function battleIsClaimed(record: JsonObject) {
  return record.resultClaimed === true || record.resultClaimed === 1;
}

function jsonObject(value: unknown): JsonObject | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? value as JsonObject
    : null;
}
