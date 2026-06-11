import { describe, expect, it } from "vitest";
import { normalRoutingMap, normalRoutingMaps } from "../src/master/routing-data.js";
import { evaluateRoute } from "../src/master/routing.js";

const NORMAL_MAP_IDS = [
  11, 12, 13, 14, 15, 16,
  21, 22, 23, 24, 25,
  31, 32, 33, 34, 35,
  41, 42, 43, 44, 45,
  51, 52, 53, 54, 55,
  61, 62, 63, 64, 65,
  71, 72, 73, 74, 75
];

describe("generated normal-map routing data", () => {
  it("covers every cached normal map and every branching source", () => {
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

  it("resolves ambiguous LoS-failure labels to numeric conditions", () => {
    const conditions = normalRoutingMaps()
      .flatMap((map) => Object.values(map.branches).flat())
      .map((rule) => rule.when?.wiki)
      .filter((condition): condition is string => Boolean(condition));

    expect(conditions.some((condition) => condition.includes("索敌不足"))).toBe(false);
  });

  it("keeps the official 1-1 fleet-size probabilities", () => {
    const map = normalRoutingMap(1, 1)!;
    expect(map.branches.A).toEqual([
      { when: { fleetSize: { eq: 1 } }, weights: { B: 20, C: 80 }, source: expect.any(String) },
      { when: { fleetSize: { eq: 2 } }, weights: { B: 25, C: 75 }, source: expect.any(String) },
      { when: { fleetSize: { eq: 3 } }, weights: { B: 30, C: 70 }, source: expect.any(String) },
      { when: { fleetSize: { eq: 4 } }, weights: { B: 35, C: 65 }, source: expect.any(String) },
      { when: { fleetSize: { eq: 5 } }, weights: { B: 40, C: 60 }, source: expect.any(String) },
      { when: { fleetSize: { eq: 6 } }, weights: { B: 45, C: 55 }, source: expect.any(String) }
    ]);
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
