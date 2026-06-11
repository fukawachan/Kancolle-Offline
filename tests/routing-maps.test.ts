import { describe, expect, it } from "vitest";
import { normalRoutingMap } from "../src/master/routing-data.js";
import { evaluateRoute, type RoutingFleet, type RoutingShip } from "../src/master/routing.js";

describe("representative normal-map routing", () => {
  it("routes high-LoS fleets through the 1-6 and 2-5 checks", () => {
    const destroyers = fleet([
      ship(2, { baseLos: 400 }),
      ship(2, { baseLos: 400 }),
      ship(2, { baseLos: 400 })
    ]);
    const scoutFleet = fleet([ship(2, { baseLos: 1600 })]);

    expect(evaluateRoute(normalRoutingMap(1, 6)!, {
      fleet: destroyers,
      seed: 1,
      step: 4,
      phase: 1,
      from: "M",
      playerLevel: 1
    })).toMatchObject({ kind: "route", to: "J" });
    expect(evaluateRoute(normalRoutingMap(2, 5)!, {
      fleet: scoutFleet,
      seed: 1,
      step: 4,
      phase: 1,
      from: "I",
      playerLevel: 1
    })).toMatchObject({ kind: "route", to: "O" });
  });

  it("routes a 3-2 fast-plus fleet from E to F", () => {
    const result = evaluateRoute(normalRoutingMap(3, 2)!, {
      fleet: fleet([ship(2)], "fastPlus"),
      seed: 1,
      step: 3,
      phase: 1,
      from: "E"
    });

    expect(result).toMatchObject({ kind: "route", to: "F" });
  });

  it("offers the actual 4-5 edge numbers at its active branch", () => {
    const result = evaluateRoute(normalRoutingMap(4, 5)!, {
      fleet: fleet([ship(2)]),
      seed: 1,
      step: 1,
      phase: 1,
      from: "A"
    });

    expect(result).toEqual({ kind: "select", edgeNos: [2, 4], from: "A" });
  });

  it("uses stable published weights for the 5-1 starting branch", () => {
    const map = normalRoutingMap(5, 1)!;
    const results = Array.from({ length: 100 }, (_, index) => evaluateRoute(map, {
      fleet: fleet([ship(2)]),
      seed: index + 1,
      step: 0,
      phase: 1,
      from: "Start"
    }));
    const repeated = evaluateRoute(map, {
      fleet: fleet([ship(2)]),
      seed: 42,
      step: 0,
      phase: 1,
      from: "Start"
    });

    expect(results[41]).toEqual(repeated);
    expect(results.filter((result) => result.kind === "route" && result.to === "A").length).toBeGreaterThan(
      results.filter((result) => result.kind === "route" && result.to === "B").length
    );
    expect(new Set(results.map((result) => result.kind === "route" ? result.to : "select"))).toEqual(new Set(["A", "B"]));
  });

  it("routes a 6-4 LHA fleet from the right-hand start", () => {
    const result = evaluateRoute(normalRoutingMap(6, 4)!, {
      fleet: fleet([ship(17)]),
      seed: 1,
      step: 0,
      phase: 1,
      from: "Start"
    });

    expect(result).toMatchObject({ kind: "route", to: "M" });
  });

  it("routes a fast 6-4 CL flagship and three destroyers from the left to B", () => {
    const result = evaluateRoute(normalRoutingMap(6, 4)!, {
      fleet: fleet([ship(3), ship(2), ship(2), ship(2)]),
      seed: 1,
      step: 0,
      phase: 1,
      from: "Start"
    });

    expect(result).toMatchObject({ kind: "route", to: "B" });
  });

  it("uses the documented 7-4 LoS thresholds instead of treating LoS failure as unconditional", () => {
    const highLos = fleet([ship(2, { baseLos: 2500 })]);
    const bossFleet = fleet([
      ship(2, { baseLos: 900 }),
      ship(2, { baseLos: 900 })
    ]);

    expect(evaluateRoute(normalRoutingMap(7, 4)!, {
      fleet: highLos,
      seed: 1,
      step: 4,
      phase: 1,
      from: "G",
      playerLevel: 1
    })).toMatchObject({ kind: "route", to: "L" });
    expect(evaluateRoute(normalRoutingMap(7, 4)!, {
      fleet: bossFleet,
      seed: 1,
      step: 8,
      phase: 1,
      from: "M",
      playerLevel: 1
    })).toMatchObject({ kind: "route", to: "P" });
  });

  it("counts ship types and named ships together in 7-4 expressions", () => {
    const result = evaluateRoute(normalRoutingMap(7, 4)!, {
      fleet: fleet([
        ship(7, { baseLos: 900 }),
        ship(17, { masterId: 166, name: "unrelated display name", baseLos: 900 }),
        ship(2),
        ship(2)
      ]),
      seed: 1,
      step: 8,
      phase: 1,
      from: "M",
      playerLevel: 1
    });

    expect(result).toMatchObject({ kind: "route", to: "O" });
  });

  it("does not expose later 7-5 routes before their map phase", () => {
    const map = normalRoutingMap(7, 5)!;

    expect(evaluateRoute(map, {
      fleet: fleet([ship(2)]),
      seed: 1,
      step: 4,
      phase: 1,
      from: "F"
    })).toMatchObject({ kind: "route", to: "G" });
    expect(evaluateRoute(map, {
      fleet: fleet([ship(2)]),
      seed: 1,
      step: 6,
      phase: 1,
      from: "H"
    })).toMatchObject({ kind: "route", to: "K" });
    expect(evaluateRoute(map, {
      fleet: fleet([ship(2)]),
      seed: 1,
      step: 4,
      phase: 3,
      from: "F"
    })).toMatchObject({ kind: "route", to: "J" });
    expect(evaluateRoute(map, {
      fleet: fleet([ship(2)]),
      seed: 1,
      step: 8,
      phase: 3,
      from: "O"
    })).toMatchObject({ kind: "route", to: "Q" });
  });
});

function fleet(ships: RoutingShip[], speed: RoutingFleet["speed"] = "fast"): RoutingFleet {
  return {
    ships,
    speed,
    typeCounts: {},
    equippedShipCounts: {}
  };
}

function ship(shipType: number, overrides: Partial<RoutingShip> = {}): RoutingShip {
  return {
    id: shipType,
    masterId: shipType,
    shipType,
    classId: 0,
    name: `Ship ${shipType}`,
    speed: 10,
    level: 1,
    baseLos: 0,
    equipment: [],
    ...overrides
  };
}
