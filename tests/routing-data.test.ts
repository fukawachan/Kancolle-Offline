import { describe, expect, it } from "vitest";
import {
  normalRoutingDiagnostics,
  normalRoutingEvidenceCounts,
  normalRoutingMap,
  normalRoutingMaps
} from "../src/master/routing-data.js";
import { evaluateRoute } from "../src/master/routing.js";

const NORMAL_MAP_IDS = [
  11, 12, 13, 14, 15, 16,
  21, 22, 23, 24, 25,
  31, 32, 33, 34, 35,
  41, 42, 43, 44, 45,
  51, 52, 53, 54, 55, 56,
  61, 62, 63, 64, 65,
  71, 72, 73, 74, 75
];

describe("generated normal-map routing data", () => {
  it("covers every supported normal-map rules package and every branching source", () => {
    const maps = normalRoutingMaps();
    expect(maps.map((map) => map.mapId)).toEqual(NORMAL_MAP_IDS);

    for (const map of maps) {
      const outgoing = new Map<string, typeof map.edges>();
      for (const edge of map.edges) {
        outgoing.set(edge.from, [...(outgoing.get(edge.from) ?? []), edge]);
      }
      for (const [from, edges] of outgoing) {
        if (edges.length > 1) {
          expect(map.branches[from]?.length, `${map.mapId} ${from}`).toBeGreaterThan(0);
        }
      }
    }
  });

  it("keeps every declared target on an outgoing topology edge", () => {
    for (const map of normalRoutingMaps()) {
      for (const [from, rules] of Object.entries(map.branches)) {
        const outgoing = new Set(map.edges.filter((edge) => edge.from === from).map((edge) => edge.to));
        for (const rule of rules) {
          const targets = [
            ...(rule.to ? [rule.to] : []),
            ...Object.keys(rule.weights ?? {}),
            ...(rule.select ?? [])
          ];
          for (const target of targets) {
            expect(outgoing.has(target), `${map.mapId} ${from} -> ${target}`).toBe(true);
          }
        }
      }
    }
  });

  it("compiles every pinned prose predicate and exposes evidence layers", () => {
    expect(normalRoutingDiagnostics()).toEqual([]);
    for (const map of normalRoutingMaps()) {
      for (const rule of Object.values(map.branches).flat()) {
        expect(rule.evidence?.revision, `${map.mapId}: ${rule.source}`).toBe(map.revision);
        if (rule.when?.wiki) {
          expect(rule.when.compiledWiki, `${map.mapId}: ${rule.when.wiki}`).toBeDefined();
        }
      }
    }
    expect(normalRoutingEvidenceCounts()).toEqual({
      exact: expect.any(Number),
      statistical: expect.any(Number),
      inferred: expect.any(Number),
      fallback: expect.any(Number)
    });
    expect(normalRoutingEvidenceCounts().fallback).toBeGreaterThan(0);
    expect(normalRoutingEvidenceCounts().inferred).toBeGreaterThan(0);
  });

  it("marks an unknown-probability fallback separately from a provisional boundary", () => {
    const map = normalRoutingMap(6, 2)!;
    const lowLosInput = {
      fleet: emptyFleet(),
      seed: 7,
      step: 1,
      phase: 1,
      from: "H",
      playerLevel: 1
    };
    const fallback = evaluateRoute(map, lowLosInput);

    expect(evaluateRoute(map, lowLosInput)).toEqual(fallback);
    expect(fallback).toMatchObject({ evidence: { level: "fallback", revision: map.revision } });

    const inferred = evaluateRoute(map, {
      ...lowLosInput,
      fleet: fleetWithShips([routingShip({ baseLos: 2_500 })])
    });
    expect(inferred).toMatchObject({
      to: "K",
      evidence: { level: "inferred", revision: map.revision }
    });
  });

  it("expands published compact probability tables instead of assuming equal weights", () => {
    const oneTwo = normalRoutingMap(1, 2)!;
    const oneTwoTable = oneTwo.branches.Start.filter((rule) =>
      rule.source?.startsWith("舰队船数去A概率")
    );
    expect(oneTwoTable.map((rule) => [rule.when?.fleetSize, rule.weights])).toEqual([
      [{ gte: 1, lte: 3 }, { A: 70, B: 30 }],
      [{ eq: 4 }, { A: 60, B: 40 }],
      [{ eq: 5 }, { A: 50, B: 50 }],
      [{ eq: 6 }, { A: 40, B: 60 }]
    ]);

    const twoThree = normalRoutingMap(2, 3)!;
    const branchD = twoThree.branches.D.filter((rule) =>
      rule.source?.startsWith("DD+DE数量 去F概率")
    );
    const branchG = twoThree.branches.G.filter((rule) =>
      rule.source?.startsWith("DD+DE数量 去I概率")
    );
    expect(branchD.map((rule) => rule.weights)).toEqual([
      { F: 65, G: 35 },
      { F: 50, G: 50 },
      { F: 35, G: 65 },
      { F: 20, G: 80 }
    ]);
    expect(branchG.map((rule) => rule.weights)).toEqual([
      { I: 0, K: 100 },
      { I: 35, K: 65 },
      { I: 45, K: 55 }
    ]);

    const fourTwo = normalRoutingMap(4, 2)!;
    const fourTwoTable = fourTwo.branches.Start.filter((rule) =>
      rule.source?.startsWith("DD+DE数量 去A概率")
    );
    expect(fourTwoTable.map((rule) => rule.weights)).toEqual([
      { A: 9.96, B: 90.04 },
      { A: 17.2, B: 82.8 },
      { A: 57.72, B: 42.28 },
      { A: 71.69, B: 28.31 },
      { A: 86.06, B: 13.94 },
      { A: 91.44, B: 8.56 },
      { A: 91.14, B: 8.86 }
    ]);
    expect([...oneTwoTable, ...branchD, ...branchG, ...fourTwoTable]
      .every((rule) => rule.evidence?.level === "statistical")).toBe(true);
  });

  it("keeps qualitative destinations but labels unknown probabilities as fallback", () => {
    const map = normalRoutingMap(4, 4)!;
    const randomIG = map.branches.E.find((rule) => rule.source?.includes("其余随机去I/G"));
    expect(randomIG).toMatchObject({
      weights: { I: 1, G: 1 },
      evidence: { level: "fallback", revision: map.revision }
    });
    expect(randomIG?.weights).not.toHaveProperty("C");

    const qualitative = map.branches.B.find((rule) => rule.source?.includes("大概率去D"));
    expect(qualitative?.evidence?.level).toBe("fallback");
  });

  it("evaluates 5-3's low-speed BB count from each ship's effective speed", () => {
    const map = normalRoutingMap(5, 3)!;
    const destroyers = [
      routingShip({ id: 1, shipType: 2, speed: 10 }),
      routingShip({ id: 2, shipType: 2, speed: 10 })
    ];
    const slowBattleships = [
      routingShip({ id: 3, shipType: 9, classId: 19, speed: 5 }),
      routingShip({ id: 4, shipType: 9, classId: 19, speed: 5 })
    ];
    const input = { seed: 1, step: 1, phase: 1, from: "G" };

    expect(evaluateRoute(map, { ...input, fleet: fleetWithShips([...destroyers, ...slowBattleships]) }))
      .toMatchObject({ to: "J" });

    const engines = [
      { id: 1, masterId: 33, typeId: 17, los: 0, improvement: 0, name: "Turbine" },
      { id: 2, masterId: 34, typeId: 17, los: 0, improvement: 0, name: "Boiler" }
    ];
    const fastBattleships = slowBattleships.map((ship) => ({ ...ship, equipment: engines }));
    expect(evaluateRoute(map, { ...input, fleet: fleetWithShips([...destroyers, ...fastBattleships]) }))
      .toMatchObject({ to: "I" });
  });

  it("resolves ambiguous LoS-failure labels to numeric conditions", () => {
    const conditions = normalRoutingMaps()
      .flatMap((map) => Object.values(map.branches).flat())
      .map((rule) => rule.when?.wiki)
      .filter((condition): condition is string => Boolean(condition));

    expect(conditions.some((condition) => condition.includes("索敌不足"))).toBe(false);
  });

  it("keeps the official 1-1 fleet-size probabilities", () => {
    const map = normalRoutingMap(1, 1)!;
    expect(map.branches.A.map(({ evidence: _evidence, ...rule }) => rule)).toEqual([
      { when: { fleetSize: { eq: 1 } }, weights: { B: 20, C: 80 }, source: expect.any(String) },
      { when: { fleetSize: { eq: 2 } }, weights: { B: 25, C: 75 }, source: expect.any(String) },
      { when: { fleetSize: { eq: 3 } }, weights: { B: 30, C: 70 }, source: expect.any(String) },
      { when: { fleetSize: { eq: 4 } }, weights: { B: 35, C: 65 }, source: expect.any(String) },
      { when: { fleetSize: { eq: 5 } }, weights: { B: 40, C: 60 }, source: expect.any(String) },
      { when: { fleetSize: { eq: 6 } }, weights: { B: 45, C: 55 }, source: expect.any(String) }
    ]);
    expect(map.branches.A.every((rule) => rule.evidence?.level === "statistical")).toBe(true);
    expect(map.branches.A.every((rule) => rule.evidence?.revision === map.revision)).toBe(true);
  });

  it("models 4-5 active branching with actual edge numbers", () => {
    const map = normalRoutingMap(4, 5)!;
    const result = evaluateRoute(map, {
      fleet: emptyFleet(),
      seed: 1,
      step: 1,
      phase: 1,
      from: "A"
    });

    expect(result).toEqual({ kind: "select", edgeNos: [2, 4], from: "A" });
  });

  it("keeps named-ship conditions free of wiki markup", () => {
    const map = normalRoutingMap(7, 3)!;
    const conditions = Object.values(map.branches)
      .flat()
      .map((rule) => rule.when?.wiki)
      .filter((condition): condition is string => Boolean(condition));

    expect(conditions.some((condition) => condition.includes("神风+羽黑=2"))).toBe(true);
    expect(conditions.some((condition) => /<\/?b/.test(condition))).toBe(false);
  });

  it("stores specified ships as master-id remodel families", () => {
    const map = normalRoutingMap(7, 3)!;
    const rule = map.branches.C.find((candidate) => candidate.source?.includes("神风+羽黑=2"));
    const families = (rule?.when as any)?.shipFamilies;

    expect(families).toEqual([
      {
        ids: expect.arrayContaining([65, 194, 268, 471, 476]),
        count: { eq: 2 },
        wikiTerm: "神风+羽黑=2"
      },
      expect.any(Object)
    ]);
  });

  it("stores mixed ship-type and specified-ship expressions by master id", () => {
    const map = normalRoutingMap(7, 4)!;
    const rule = map.branches.M.find((candidate) => candidate.when?.wiki?.includes("CVL+あきつ丸"));

    expect((rule?.when as any)?.countExpressions).toEqual([
      {
        terms: [
          { shipType: "CVL" },
          { shipFamilyIds: expect.arrayContaining([161, 166]) }
        ],
        count: { gte: 2 },
        wikiTerm: "CVL+あきつ丸>=2"
      }
    ]);
  });

  it("stores non-combat event metadata for topology-only points", () => {
    const map = normalRoutingMap(1, 2)!;

    expect((map as any).nodes.B).toEqual({
      combat: false,
      eventId: 2,
      eventKind: 0,
      colorNo: 8
    });
  });

  it("keeps br-separated nested LoS rules from the wiki", () => {
    const map = normalRoutingMap(4, 5)!;
    const qConditions = map.branches.Q
      .map((rule) => rule.when?.wiki)
      .filter((condition): condition is string => Boolean(condition));

    expect(qConditions).toContain("分歧点系数=2 且 索敌<50");
    expect(qConditions).toContain("分歧点系数=2 且 索敌50~60");
  });
});

function emptyFleet() {
  return {
    ships: [],
    speed: "slow" as const,
    typeCounts: {},
    equippedShipCounts: {}
  };
}

function fleetWithShips(ships: ReturnType<typeof routingShip>[]) {
  return {
    ships,
    speed: "slow" as const,
    typeCounts: {},
    equippedShipCounts: {}
  };
}

function routingShip(overrides: Partial<{
  id: number;
  masterId: number;
  shipType: number;
  classId: number;
  name: string;
  speed: number;
  level: number;
  baseLos: number;
}> = {}) {
  return {
    id: 1,
    masterId: 9,
    shipType: 2,
    classId: 12,
    name: "Routing fixture",
    speed: 10,
    level: 1,
    baseLos: 0,
    equipment: [] as {
      id: number;
      masterId: number;
      typeId: number;
      los: number;
      improvement: number;
      name: string;
    }[],
    ...overrides
  };
}
