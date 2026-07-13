import { describe, expect, it } from "vitest";
import {
  buildRoutingFleet,
  calculateFleetLos33,
  evaluateRoute,
  type RoutingMap
} from "../src/master/routing.js";
import type { SaveState } from "../src/state/types.js";

const TEST_MAP: RoutingMap = {
  mapId: 11,
  revision: 1,
  edges: [
    { no: 1, from: "Start", to: "A" },
    { no: 2, from: "A", to: "B" },
    { no: 3, from: "A", to: "C" }
  ],
  branches: {
    Start: [{ to: "A" }],
    A: [
      { when: { fleetSize: { lte: 1 } }, weights: { B: 20, C: 80 } },
      { weights: { B: 45, C: 55 } }
    ]
  }
};

describe("normal-map routing evaluator", () => {
  it("resolves a destination label to the exact edge number", () => {
    const result = evaluateRoute(TEST_MAP, {
      fleet: fleetContext(6),
      seed: 10,
      step: 0,
      phase: 1,
      from: "Start"
    });

    expect(result).toEqual({ kind: "route", edgeNo: 1, from: "Start", to: "A" });
  });

  it("uses ordered predicates and stable weighted routing", () => {
    const first = evaluateRoute(TEST_MAP, {
      fleet: fleetContext(1),
      seed: 1945,
      step: 1,
      phase: 1,
      from: "A"
    });
    const repeat = evaluateRoute(TEST_MAP, {
      fleet: fleetContext(1),
      seed: 1945,
      step: 1,
      phase: 1,
      from: "A"
    });

    expect(repeat).toEqual(first);
    expect([2, 3]).toContain(first.kind === "route" ? first.edgeNo : -1);
  });

  it("returns and validates active route choices without advancing", () => {
    const map: RoutingMap = {
      ...TEST_MAP,
      branches: {
        ...TEST_MAP.branches,
        A: [{ select: ["B", "C"] }]
      }
    };

    expect(
      evaluateRoute(map, {
        fleet: fleetContext(6),
        seed: 1,
        step: 1,
        phase: 1,
        from: "A"
      })
    ).toEqual({ kind: "select", edgeNos: [2, 3], from: "A" });

    expect(
      evaluateRoute(map, {
        fleet: fleetContext(6),
        seed: 1,
        step: 1,
        phase: 1,
        from: "A",
        selectedEdgeNo: 3
      })
    ).toEqual({ kind: "route", edgeNo: 3, from: "A", to: "C" });
  });

  it("calculates formula 33 from base ship and equipped item LoS", () => {
    const save = saveWithLos();
    const fleet = buildRoutingFleet(save, 1);

    expect(calculateFleetLos33(fleet, 1, save.player.level)).toBeCloseTo(14.24, 2);
  });

  it("snapshots the official ship class and master-driven base LoS through level 188", () => {
    const save = saveWithLos();
    save.ships[0].stats = {};
    for (const [level, expectedLos] of [[1, 5], [50, 12], [99, 19], [188, 31]] as const) {
      save.ships[0].level = level;
      const ship = buildRoutingFleet(save, 1).ships[0];
      expect(ship.classId).toBe(12);
      expect(ship.baseLos).toBe(expectedLos);
    }
  });

  it("uses turbine and boiler equipment for effective fleet speed", () => {
    const save = saveWithLos();
    save.slotItems = [
      { id: 1, masterId: 33, level: 0, proficiency: 0, proficiencyExp: 0, locked: 0 },
      { id: 2, masterId: 34, level: 0, proficiency: 0, proficiencyExp: 0, locked: 0 }
    ];
    save.ships[0].slotIds = [1, 2, -1, -1, -1];

    expect(buildRoutingFleet(save, 1).speed).toBe("fastPlus");
  });

  it("uses Yamato's slow-A engine combinations for effective fleet speed", () => {
    const save = saveWithLos();
    save.ships[0].masterId = 131;
    save.ships[0].slotIds = [2, 3, 4, -1, -1];
    save.ships[0].exSlotId = 1;
    save.slotItems = [
      { id: 1, masterId: 33, level: 0, proficiency: 0, proficiencyExp: 0, locked: 0 },
      { id: 2, masterId: 34, level: 0, proficiency: 0, proficiencyExp: 0, locked: 0 },
      { id: 3, masterId: 34, level: 0, proficiency: 0, proficiencyExp: 0, locked: 0 },
      { id: 4, masterId: 87, level: 0, proficiency: 0, proficiencyExp: 0, locked: 0 }
    ];

    expect(buildRoutingFleet(save, 1).speed).toBe("fastest");
  });

  it("applies formula 33 thresholds at their exact boundary", () => {
    const fleet = buildRoutingFleet(saveWithLos(), 1);
    const score = calculateFleetLos33(fleet, 1, 10);
    const map: RoutingMap = {
      mapId: 25,
      revision: 1,
      edges: [
        { no: 1, from: "A", to: "B" },
        { no: 2, from: "A", to: "C" }
      ],
      branches: {
        A: [
          { when: { los: { coefficient: 1, gte: score + 0.001 } }, to: "C" },
          { to: "B" }
        ]
      }
    };

    expect(evaluateRoute(map, { fleet, seed: 1, step: 1, phase: 1, from: "A", playerLevel: 10 }))
      .toMatchObject({ to: "B" });
    map.branches.A[0] = { when: { los: { coefficient: 1, gte: score } }, to: "C" };
    expect(evaluateRoute(map, { fleet, seed: 1, step: 1, phase: 1, from: "A", playerLevel: 10 }))
      .toMatchObject({ to: "C" });
  });

  it("honors chained LoS lower bounds and inclusive 'or below' wording", () => {
    const fleet = fleetContext(1);
    // Formula 33 at Cn1/HQ1: sqrt(361) - ceil(0.4) + 2*(6-1) = 28.
    fleet.ships[0].baseLos = 361;
    const inclusiveMap: RoutingMap = {
      mapId: 16,
      revision: 1,
      edges: [
        { no: 1, from: "A", to: "B" },
        { no: 2, from: "A", to: "C" }
      ],
      branches: {
        A: [
          { when: { wiki: "分歧点系数=1 且 28索敌以下" }, to: "C" },
          { to: "B" }
        ]
      }
    };
    expect(evaluateRoute(inclusiveMap, {
      fleet,
      seed: 1,
      step: 1,
      phase: 1,
      from: "A",
      playerLevel: 1
    })).toMatchObject({ to: "C" });

    const chainedMap: RoutingMap = {
      ...inclusiveMap,
      mapId: 75,
      branches: {
        A: [
          { when: { wiki: "分歧点系数=1 且 53<=索敌<59" }, to: "C" },
          { to: "B" }
        ]
      }
    };
    // Score 52 is below the random range and score 53 is exactly inside it.
    fleet.ships[0].baseLos = 1_849;
    expect(evaluateRoute(chainedMap, {
      fleet,
      seed: 1,
      step: 1,
      phase: 1,
      from: "A",
      playerLevel: 1
    })).toMatchObject({ to: "B" });
    fleet.ships[0].baseLos = 1_936;
    expect(evaluateRoute(chainedMap, {
      fleet,
      seed: 1,
      step: 1,
      phase: 1,
      from: "A",
      playerLevel: 1
    })).toMatchObject({ to: "C" });
  });

  it("matches specified-ship remodel families by master id", () => {
    const map: RoutingMap = {
      mapId: 52,
      revision: 1,
      edges: [
        { no: 1, from: "A", to: "B" },
        { no: 2, from: "A", to: "C" }
      ],
      branches: {
        A: [
          { when: { shipFamilies: [{ ids: [110, 288, 461], count: { gte: 1 } }] }, to: "C" },
          { to: "B" }
        ]
      }
    };

    const absent = evaluateRoute(map, { fleet: fleetContext(1), seed: 1, step: 1, phase: 1, from: "A" });
    const presentFleet = fleetContext(1);
    presentFleet.ships[0].masterId = 461;
    presentFleet.ships[0].name = "unrelated display name";
    const present = evaluateRoute(map, { fleet: presentFleet, seed: 1, step: 1, phase: 1, from: "A" });

    expect(absent).toMatchObject({ to: "B" });
    expect(present).toMatchObject({ to: "C" });
  });

  it("uses family ids instead of display names for contains conditions", () => {
    const map: RoutingMap = {
      mapId: 64,
      revision: 1,
      edges: [
        { no: 1, from: "A", to: "B" },
        { no: 2, from: "A", to: "C" }
      ],
      branches: {
        A: [
          {
            when: {
              wiki: "舰队中包含 秋津洲",
              shipFamilies: [{
                ids: [445, 450],
                count: { gte: 1 },
                wikiTerm: "舰队中包含 秋津洲"
              }]
            },
            to: "C"
          },
          { to: "B" }
        ]
      }
    };
    const fleet = fleetContext(1);
    fleet.ships[0].masterId = 445;
    fleet.ships[0].name = "unrelated display name";

    expect(evaluateRoute(map, { fleet, seed: 1, step: 1, phase: 1, from: "A" }))
      .toMatchObject({ to: "C" });
  });

  it("fails closed with the unsupported wiki term in the diagnostic", () => {
    const map: RoutingMap = {
      mapId: 11,
      revision: 1,
      edges: [
        { no: 1, from: "A", to: "B" },
        { no: 2, from: "A", to: "C" }
      ],
      branches: {
        A: [
          { when: { wiki: "尚未支持的条件" }, to: "C" },
          { to: "B" }
        ]
      }
    };

    expect(() => evaluateRoute(map, {
      fleet: fleetContext(1),
      seed: 1,
      step: 1,
      phase: 1,
      from: "A"
    })).toThrow(/尚未支持的条件/);
  });

  it("fails closed on an unexpanded compact probability-table header", () => {
    const map: RoutingMap = {
      mapId: 12,
      revision: 1,
      edges: [
        { no: 1, from: "Start", to: "A" },
        { no: 2, from: "Start", to: "B" }
      ],
      branches: {
        Start: [
          { when: { wiki: "舰队船数" }, weights: { A: 1, B: 1 } }
        ]
      }
    };

    expect(() => evaluateRoute(map, {
      fleet: fleetContext(1),
      seed: 1,
      step: 1,
      phase: 1,
      from: "Start"
    })).toThrow(/舰队船数/);
  });

  it("supports declarative ship-class counts", () => {
    const map: RoutingMap = {
      mapId: 64,
      revision: 1,
      edges: [
        { no: 1, from: "A", to: "B" },
        { no: 2, from: "A", to: "C" }
      ],
      branches: {
        A: [
          { when: { shipClasses: { "12": { gte: 2 } } }, to: "C" },
          { to: "B" }
        ]
      }
    };
    const fleet = fleetContext(2);
    fleet.ships.forEach((ship) => {
      ship.classId = 12;
    });

    expect(evaluateRoute(map, { fleet: fleetContext(2), seed: 1, step: 1, phase: 1, from: "A" }))
      .toMatchObject({ to: "B" });
    expect(evaluateRoute(map, { fleet, seed: 1, step: 1, phase: 1, from: "A" }))
      .toMatchObject({ to: "C" });
  });

  it("keeps conditions following a failed-prior-rule marker", () => {
    const map: RoutingMap = {
      mapId: 52,
      revision: 1,
      edges: [
        { no: 1, from: "A", to: "B" },
        { no: 2, from: "A", to: "C" }
      ],
      branches: {
        A: [
          { when: { wiki: "上述判定全部失败时 且 DD>=2" }, to: "C" },
          { to: "B" }
        ]
      }
    };

    expect(evaluateRoute(map, { fleet: fleetContext(1), seed: 1, step: 1, phase: 1, from: "A" }))
      .toMatchObject({ to: "B" });
    expect(evaluateRoute(map, { fleet: fleetContext(2), seed: 1, step: 1, phase: 1, from: "A" }))
      .toMatchObject({ to: "C" });
  });

  it("treats a failed-prior-rule marker as the fallback side of an OR condition", () => {
    const map: RoutingMap = {
      mapId: 25,
      revision: 1,
      edges: [
        { no: 1, from: "A", to: "B" },
        { no: 2, from: "A", to: "C" }
      ],
      branches: {
        A: [
          { when: { wiki: "索敌>=49 或 去H判定失败" }, to: "C" },
          { to: "B" }
        ]
      }
    };

    expect(evaluateRoute(map, { fleet: fleetContext(1), seed: 1, step: 1, phase: 1, from: "A" }))
      .toMatchObject({ to: "C" });
  });

  it("retains child predicates inherited after a failed prior decision", () => {
    const map: RoutingMap = {
      mapId: 25,
      revision: 1,
      edges: [
        { no: 1, from: "A", to: "B" },
        { no: 2, from: "A", to: "C" }
      ],
      branches: {
        A: [
          { when: { wiki: "索敌>=49 或 去H判定失败 且 SS系>=1" }, to: "C" },
          { to: "B" }
        ]
      }
    };
    const surfaceFleet = fleetContext(1);
    surfaceFleet.ships[0].baseLos = 2_500;

    expect(evaluateRoute(map, {
      fleet: surfaceFleet,
      seed: 1,
      step: 1,
      phase: 1,
      from: "A",
      playerLevel: 1
    })).toMatchObject({ to: "B" });

    surfaceFleet.ships[0].shipType = 13;
    expect(evaluateRoute(map, {
      fleet: surfaceFleet,
      seed: 1,
      step: 1,
      phase: 1,
      from: "A",
      playerLevel: 1
    })).toMatchObject({ to: "C" });
  });

  it("ignores probability annotations after a fleet-count condition", () => {
    const map: RoutingMap = {
      mapId: 42,
      revision: 1,
      edges: [
        { no: 1, from: "A", to: "B" },
        { no: 2, from: "A", to: "C" }
      ],
      branches: {
        A: [
          { when: { wiki: "BB系+CV系>=5：小概率" }, to: "C" },
          { to: "B" }
        ]
      }
    };
    const fleet = fleetContext(5);
    fleet.ships.forEach((ship) => {
      ship.shipType = 9;
    });

    expect(evaluateRoute(map, { fleet, seed: 1, step: 1, phase: 1, from: "A" }))
      .toMatchObject({ to: "C" });
  });

  it("treats 'no ship types outside' as a type whitelist", () => {
    const map: RoutingMap = {
      mapId: 13,
      revision: 1,
      edges: [
        { no: 1, from: "A", to: "B" },
        { no: 2, from: "A", to: "C" }
      ],
      branches: {
        A: [
          { when: { wiki: "舰队中不包含CL、CT、CLT、DD以外的舰种" }, to: "C" },
          { to: "B" }
        ]
      }
    };
    const allowedFleet = fleetContext(2);
    allowedFleet.ships[0].shipType = 3;
    const fleetWithBattleship = fleetContext(2);
    fleetWithBattleship.ships[0].shipType = 9;

    expect(evaluateRoute(map, { fleet: allowedFleet, seed: 1, step: 1, phase: 1, from: "A" }))
      .toMatchObject({ to: "C" });
    expect(evaluateRoute(map, { fleet: fleetWithBattleship, seed: 1, step: 1, phase: 1, from: "A" }))
      .toMatchObject({ to: "B" });
  });
});

function fleetContext(size: number) {
  return {
    ships: Array.from({ length: size }, (_, index) => ({
      id: index + 1,
      masterId: index + 1,
      shipType: 2,
      classId: 1,
      name: `Ship ${index + 1}`,
      speed: 10,
      level: 1,
      baseLos: 0,
      equipment: []
    })),
    speed: "fast" as const,
    typeCounts: { DD: size },
    equippedShipCounts: {}
  };
}

function saveWithLos(): SaveState {
  return {
    player: {
      id: 1,
      worldId: 15,
      nickname: "Admiral",
      level: 10,
      exp: 0,
      comment: "",
      tutorialProgress: 100,
      options: {
        bgmFlag: 1,
        voiceFlag: 1,
        seFlag: 1,
        volBgm: 80,
        volSe: 80,
        volVoice: 80,
        friendlyRequestFlag: 0,
        friendlyRequestType: 0,
        ossItems: [0, 0, 0, 0],
        languageType: 0
      },
      flagshipPosition: 1,
      combinedFleet: 0,
      portBgmId: 1,
      maxChara: 300,
      maxSlotItem: 500
    },
    materials: { fuel: 0, ammo: 0, steel: 0, bauxite: 0, buildKit: 0, repairKit: 0, devmat: 0, screw: 0 },
    ships: [
      {
        id: 1,
        masterId: 9,
        level: 1,
        exp: 0,
        hp: 10,
        maxHp: 10,
        condition: 49,
        fuel: 10,
        maxFuel: 10,
        ammo: 10,
        maxAmmo: 10,
        locked: 0,
        sallyArea: 0,
        slotIds: [1, -1, -1, -1, -1],
        onSlot: [0, 0, 0, 0, 0],
        exSlotId: -1,
        stats: { baseLos: 5 },
        marriedAt: 0,
        marriageHpBonus: 0,
        marriageLuckBonus: 0
      }
    ],
    airBases: [],
    slotItems: [{ id: 1, masterId: 25, level: 0, proficiency: 0, proficiencyExp: 0, locked: 0 }],
    presetSlots: [],
    presetSlotSettings: { maxNum: 4 },
    presetDecks: [],
    presetDeckSettings: { maxNum: 3 },
    decks: [{ id: 1, name: "Fleet", missionState: { state: 0, missionId: 0, completeTime: 0 }, shipIds: [1, -1, -1, -1, -1, -1] }],
    repairDocks: [],
    buildDocks: [],
    quests: [],
    furniture: {
      owned: [],
      set: { api_floor: 0, api_wall: 0, api_window: 0, api_chest: 0, api_desk: 0, api_object: 0 },
      coins: 0
    },
    maps: [],
    sortieSession: null,
    expeditionProgress: [],
    expeditionRuns: [],
    expeditionSettings: { fixedSeed: null, clockOffsetMs: 0, unlockAll: 0 },
    eventSettings: { activeAreaId: null },
    recordStats: {
      battleWin: 0,
      battleLose: 0,
      practiceWin: 0,
      practiceLose: 0,
      missionCount: 0,
      missionSuccess: 0,
      rankingPoints: 0,
      rankingPeriodKey: "2026-07"
    },
    useItems: []
  };
}
