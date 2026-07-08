import { masterData } from "../master/data.js";
import type { Deck, SaveState, Ship } from "../state/types.js";

export type CombinedFleetType = 0 | 1 | 2 | 3;

export type CombinedFleetValidation =
  | { ok: true; combinedFleet: CombinedFleetType }
  | { ok: false; combinedFleet: 0; reason: string };

export type CombinedFleetSnapshot = {
  mainDeckId: number;
  escortDeckId: number;
  mainShipCount: number;
  escortShipCount: number;
  mainShipIds: number[];
  escortShipIds: number[];
};

const DE = 1;
const DD = 2;
const CL = 3;
const CLT = 4;
const CA = 5;
const CAV = 6;
const CVL = 7;
const FBB = 8;
const BB = 9;
const BBV = 10;
const CV = 11;
const BBB = 12;
const SS = 13;
const SSV = 14;
const AO = 15;
const AV = 16;
const LHA = 17;
const CVB = 18;
const AR = 19;
const AS = 20;
const CT = 21;
const AO2 = 22;

const DD_OR_DE = new Set([DD, DE]);
const CL_OR_CT = new Set([CL, CT]);
const CA_OR_CAV = new Set([CA, CAV]);
const CARRIER = new Set([CV, CVB]);
const LIGHT_CARRIER = new Set([CVL]);
const BATTLESHIP = new Set([FBB, BB, BBV, BBB]);
const SUBMARINE = new Set([SS, SSV]);
const TRANSPORT_ALLOWED_MAIN = new Set([DD, DE, CL, CT, CAV, BBV, AV, LHA, AS, AO, AO2, CVL, AR]);

const ESCORT_CARRIER_MASTER_IDS = new Set([
  380, 381, 382, 396, 526, 529, 534, 536, 544, 707, 884, 889, 925, 930
]);

type FleetMember = {
  ship: Ship;
  stype: number;
  position: number;
};

export function combinedFleetSnapshot(save: SaveState): CombinedFleetSnapshot {
  const mainDeck = deckById(save, 1);
  const escortDeck = deckById(save, 2);
  const mainShipIds = fleetShipIds(mainDeck);
  const escortShipIds = fleetShipIds(escortDeck);
  return {
    mainDeckId: 1,
    escortDeckId: 2,
    mainShipCount: mainShipIds.length,
    escortShipCount: escortShipIds.length,
    mainShipIds,
    escortShipIds
  };
}

export function normalizeCombinedFormation(formation: number, escortShipCount: number) {
  const normalized = Math.max(1, Math.min(4, Math.trunc(Number(formation) || 1)));
  const escortCount = Math.max(0, Math.trunc(Number(escortShipCount) || 0));
  if (escortCount < 4 && normalized === 3) return 1;
  if (escortCount < 4 && normalized === 4) return 2;
  return normalized;
}

export function validateCombinedFleet(save: SaveState, type: number): CombinedFleetValidation {
  const combinedFleet = normalizeCombinedFleetType(type);
  if (combinedFleet === 0) return { ok: true, combinedFleet: 0 };

  const mainDeck = deckById(save, 1);
  const escortDeck = deckById(save, 2);
  const main = fleetMembers(save, mainDeck);
  const escort = fleetMembers(save, escortDeck);
  if (main.length === 0 || escort.length === 0) {
    return invalid("Combined fleet requires ships in both deck 1 and deck 2");
  }
  if (SUBMARINE.has(main[0]?.stype ?? 0) || SUBMARINE.has(escort[0]?.stype ?? 0)) {
    return invalid("Combined fleet flagships cannot be submarines");
  }
  const escortResult = validateEscortFleet(escort, combinedFleet);
  if (!escortResult.ok) return escortResult;

  if (combinedFleet === 1) return validateCarrierTaskForceMain(main);
  if (combinedFleet === 2) return validateSurfaceTaskForceMain(main);
  return validateTransportEscortMain(main);
}

function validateCarrierTaskForceMain(main: FleetMember[]): CombinedFleetValidation {
  const carriers = countTypes(main, CARRIER) + countTypes(main, LIGHT_CARRIER);
  if (carriers < 1 || carriers > 4) return invalid("Carrier task force main fleet requires one to four carriers");
  if (countTypes(main, BATTLESHIP) > 2) return invalid("Carrier task force main fleet allows at most two battleships");
  if (countTypes(main, SUBMARINE) > 4) return invalid("Carrier task force main fleet allows at most four submarines");
  return { ok: true, combinedFleet: 1 };
}

function validateSurfaceTaskForceMain(main: FleetMember[]): CombinedFleetValidation {
  const heavyShips = countTypes(main, new Set([...BATTLESHIP, ...CARRIER, ...LIGHT_CARRIER]));
  if (heavyShips < 2) return invalid("Surface task force main fleet requires at least two battleships or carriers");
  if (countTypes(main, BATTLESHIP) > 4) return invalid("Surface task force main fleet allows at most four battleships");
  if (countTypes(main, CARRIER) > 1) return invalid("Surface task force main fleet allows at most one standard carrier");
  if (countTypes(main, LIGHT_CARRIER) > 2) return invalid("Surface task force main fleet allows at most two light carriers");
  if (countTypes(main, CA_OR_CAV) > 4) return invalid("Surface task force main fleet allows at most four CA/CAV ships");
  if (countTypes(main, SUBMARINE) > 4) return invalid("Surface task force main fleet allows at most four submarines");
  return { ok: true, combinedFleet: 2 };
}

function validateTransportEscortMain(main: FleetMember[]): CombinedFleetValidation {
  if (countTypes(main, DD_OR_DE) < 4) return invalid("Transport escort main fleet requires at least four DD/DE ships");
  if (main.some((member) => !TRANSPORT_ALLOWED_MAIN.has(member.stype) && !isEscortCarrier(member.ship))) {
    return invalid("Transport escort main fleet contains a ship type that is not allowed");
  }
  if (countTypes(main, CL_OR_CT) > 2) return invalid("Transport escort main fleet allows at most two CL/CT ships");
  if (countTypes(main, new Set([CAV])) > 2) return invalid("Transport escort main fleet allows at most two CAV ships");
  if (countTypes(main, new Set([BBV])) > 2) return invalid("Transport escort main fleet allows at most two aviation battleships");
  if (countTypes(main, new Set([AV])) > 2) return invalid("Transport escort main fleet allows at most two seaplane tenders");
  if (countTypes(main, new Set([LHA])) > 2) return invalid("Transport escort main fleet allows at most two amphibious assault ships");
  if (countTypes(main, new Set([AS])) > 2) return invalid("Transport escort main fleet allows at most two submarine tenders");
  if (countTypes(main, new Set([AO, AO2])) > 2) return invalid("Transport escort main fleet allows at most two fleet oilers");
  if (main.filter((member) => isEscortCarrier(member.ship)).length > 1) {
    return invalid("Transport escort main fleet allows at most one escort carrier");
  }
  if (countTypes(main, new Set([AR])) > 1) return invalid("Transport escort main fleet allows at most one repair ship");
  return { ok: true, combinedFleet: 3 };
}

function validateEscortFleet(escort: FleetMember[], combinedFleet: CombinedFleetType): CombinedFleetValidation {
  const requiredError = combinedFleet === 3
    ? "Transport escort fleet must have a CL/CT flagship and at least three DD/DE ships"
    : "Escort fleet must include exactly one CL/CT flagship and at least two DD/DE ships";
  const clCtCount = countTypes(escort, CL_OR_CT);
  const ddCount = countTypes(escort, DD_OR_DE);
  if (!CL_OR_CT.has(escort[0]?.stype ?? 0)) return invalid(requiredError);
  if (combinedFleet === 3) {
    if (clCtCount < 1 || clCtCount > 2 || ddCount < 3) return invalid(requiredError);
    if (countTypes(escort, CA_OR_CAV) > 2) return invalid("Transport escort fleet allows at most two CA/CAV ships");
    if (escort.some((member) => !CL_OR_CT.has(member.stype) && !DD_OR_DE.has(member.stype) && !CA_OR_CAV.has(member.stype))) {
      return invalid("Transport escort fleet contains a ship type that is not allowed");
    }
    return { ok: true, combinedFleet };
  }
  if (clCtCount !== 1 || ddCount < 2) return invalid(requiredError);
  if (countTypes(escort, CA_OR_CAV) > 2) return invalid("Escort fleet allows at most two CA/CAV ships");
  if (countTypes(escort, new Set([AV])) > 1) return invalid("Escort fleet allows at most one seaplane tender");
  if (countTypes(escort, LIGHT_CARRIER) > 1) return invalid("Escort fleet allows at most one light carrier");
  if (countTypes(escort, CARRIER) > 0) return invalid("Escort fleet cannot include standard carriers");
  if (countTypes(escort, SUBMARINE) > 3) return invalid("Escort fleet allows at most three submarines");
  return { ok: true, combinedFleet };
}

function normalizeCombinedFleetType(type: number): CombinedFleetType {
  const value = Math.trunc(Number(type) || 0);
  return value === 1 || value === 2 || value === 3 ? value : 0;
}

function deckById(save: SaveState, deckId: number): Deck | undefined {
  return save.decks.find((deck) => deck.id === deckId);
}

function fleetShipIds(deck: Deck | undefined) {
  return (deck?.shipIds ?? []).filter((shipId) => shipId > 0);
}

function fleetMembers(save: SaveState, deck: Deck | undefined): FleetMember[] {
  return fleetShipIds(deck).flatMap((shipId, index) => {
    const ship = save.ships.find((item) => item.id === shipId);
    if (!ship) return [];
    const master = masterData.api_mst_ship.find((item) => item.api_id === ship.masterId);
    return [{ ship, stype: Math.trunc(Number(master?.api_stype) || 0), position: index + 1 }];
  });
}

function countTypes(members: FleetMember[], types: Set<number>) {
  return members.filter((member) => types.has(member.stype)).length;
}

function isEscortCarrier(ship: Ship) {
  return ESCORT_CARRIER_MASTER_IDS.has(ship.masterId);
}

function invalid(reason: string): CombinedFleetValidation {
  return { ok: false, combinedFleet: 0, reason };
}
