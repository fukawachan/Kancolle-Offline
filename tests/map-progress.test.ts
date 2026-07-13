import { describe, expect, it, vi } from "vitest";
import { createSortieBattle } from "../src/kcsapi/battle.js";
import { sortieNodes } from "../src/master/sortie-data.js";
import { createStateStore } from "../src/state/store.js";

describe("normal-map battle progression", () => {
  it("does not clear a map after a non-boss battle", () => {
    const store = registeredStore();
    store.startSortie(1, 1, 1);

    settleAt(store, { mapId: 11, point: "A", node: 1, isBoss: false, flagshipHp: 0 });

    expect(store.getSave().maps.find((map) => map.id === 11)).toMatchObject({
      cleared: 0,
      phase: 1,
      phaseProgress: 0
    });
    store.close();
  });

  it("clears a single-stage map only when the boss flagship sinks", () => {
    const store = registeredStore();
    store.startSortie(1, 1, 1);

    settleAt(store, { mapId: 11, point: "C", node: 3, isBoss: true, flagshipHp: 1 });
    expect(store.getSave().maps.find((map) => map.id === 11)?.cleared).toBe(0);

    settleAt(store, { mapId: 11, point: "C", node: 3, isBoss: true, flagshipHp: 0 });
    const cleared = store.getSave().maps.find((map) => map.id === 11)!;
    expect(cleared).toMatchObject({ cleared: 1, gauge: 0 });
    store.close();
  });

  it("advances 7-2 through G three times and M four times exactly once per battle", () => {
    const store = registeredStore();
    store.startSortie(1, 7, 2);

    for (let count = 0; count < 3; count += 1) {
      settleAt(store, { mapId: 72, point: "G", node: 7, isBoss: false, flagshipHp: 0 });
    }
    expect(store.getSave().maps.find((map) => map.id === 72)).toMatchObject({
      cleared: 0,
      phase: 2,
      phaseProgress: 0,
      gauge: 4
    });

    for (let count = 0; count < 4; count += 1) {
      const result = settleAt(store, { mapId: 72, point: "M", node: 15, isBoss: true, flagshipHp: 0 });
      if (count === 0) {
        const repeated = store.applySortieBattleResult();
        expect(repeated.applied).toBe(false);
        expect(result.applied).toBe(true);
      }
    }
    expect(store.getSave().maps.find((map) => map.id === 72)).toMatchObject({
      cleared: 1,
      phase: 3,
      phaseProgress: 0,
      gauge: 0
    });
    store.close();
  });

  it("decrements a single-stage gauge only after sinking the boss flagship", () => {
    const store = registeredStore();
    store.startSortie(1, 1, 5);

    expect(store.getSave().maps.find((map) => map.id === 15)?.gauge).toBe(4);
    settleAt(store, { mapId: 15, point: "I", node: 10, isBoss: false, flagshipHp: 0 });
    settleAt(store, { mapId: 15, point: "J", node: 11, isBoss: true, flagshipHp: 0 });

    expect(store.getSave().maps.find((map) => map.id === 15)).toMatchObject({
      cleared: 0,
      gauge: 3,
      phase: 1
    });
    store.close();
  });

  it("awards one medal when 3-5 is cleared and does not award it twice for the same battle", () => {
    const store = registeredStore();
    store.startSortie(1, 3, 5);

    for (let count = 0; count < 4; count += 1) {
      settleAt(store, { mapId: 35, point: "K", node: 11, isBoss: true, flagshipHp: 0 });
    }
    const repeated = store.applySortieBattleResult();

    expect(repeated.applied).toBe(false);
    expect(store.getSave().maps.find((map) => map.id === 35)).toMatchObject({
      cleared: 1,
      gauge: 0,
      phase: 2
    });
    expect(useItemCount(store, 57)).toBe(1);
    store.close();
  });

  it("does not award medals for non-EO map gauges", () => {
    const store = registeredStore();
    store.startSortie(1, 4, 4);

    for (let count = 0; count < 4; count += 1) {
      settleAt(store, { mapId: 44, point: "K", node: 11, isBoss: true, flagshipHp: 0 });
    }

    expect(store.getSave().maps.find((map) => map.id === 44)).toMatchObject({
      cleared: 1,
      gauge: 0
    });
    expect(useItemCount(store, 57)).toBe(0);
    store.close();
  });

  it("resets 1-6 monthly without awarding a medal", () => {
    const store = registeredStore();
    store.startSortie(1, 1, 6);

    for (let count = 0; count < 7; count += 1) {
      settleAt(store, { mapId: 16, point: "N", node: 14, isBoss: true, flagshipHp: 0 });
    }

    expect(store.getSave().maps.find((map) => map.id === 16)).toMatchObject({
      cleared: 1,
      gauge: 0,
      phase: 2
    });
    expect(useItemCount(store, 57)).toBe(0);

    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-08-01T05:00:00.000+09:00"));
    store.settle();
    expect(store.getSave().maps.find((map) => map.id === 16)).toMatchObject({
      cleared: 0,
      gauge: 7,
      phase: 1,
      phaseProgress: 0
    });
    expect(useItemCount(store, 57)).toBe(0);
    vi.useRealTimers();
    store.close();
  });

  it("advances 7-3 through E three times and P four times", () => {
    const store = registeredStore();
    store.startSortie(1, 7, 3);

    for (let count = 0; count < 3; count += 1) {
      settleAt(store, { mapId: 73, point: "E", node: 6, isBoss: false, flagshipHp: 0 });
    }
    expect(store.getSave().maps.find((map) => map.id === 73)).toMatchObject({ phase: 2, gauge: 4 });

    for (let count = 0; count < 4; count += 1) {
      settleAt(store, { mapId: 73, point: "P", node: 18, isBoss: true, flagshipHp: 0 });
    }
    expect(store.getSave().maps.find((map) => map.id === 73)).toMatchObject({
      cleared: 1,
      phase: 3,
      gauge: 0
    });
    store.close();
  });

  it("advances all four 7-5 phases and requires an S victory at M", () => {
    const store = registeredStore();
    store.startSortie(1, 7, 5);

    for (let count = 0; count < 2; count += 1) {
      settleAt(store, { mapId: 75, point: "K", node: 11, isBoss: false, flagshipHp: 0 });
    }
    settleAt(store, { mapId: 75, point: "M", node: 15, isBoss: false, flagshipHp: 1, rank: "B" });
    expect(store.getSave().maps.find((map) => map.id === 75)).toMatchObject({ phase: 2, gauge: 1 });
    settleAt(store, { mapId: 75, point: "M", node: 15, isBoss: false, flagshipHp: 1, rank: "S" });
    expect(store.getSave().maps.find((map) => map.id === 75)).toMatchObject({ phase: 3, gauge: 3 });

    for (let count = 0; count < 3; count += 1) {
      settleAt(store, { mapId: 75, point: "Q", node: 20, isBoss: true, flagshipHp: 0 });
    }
    for (let count = 0; count < 3; count += 1) {
      settleAt(store, { mapId: 75, point: "T", node: 24, isBoss: true, flagshipHp: 0 });
    }

    expect(store.getSave().maps.find((map) => map.id === 75)).toMatchObject({
      cleared: 1,
      phase: 5,
      phaseProgress: 0,
      gauge: 0
    });
    store.close();
  });

  it("runs 5-6 from transport landing through the R unlock and both boss gauges", () => {
    const store = registeredStore();
    expect(store.startSortie(1, 5, 6)).not.toBeNull();

    const before = store.getSave();
    const beforeDevmat = before.materials.devmat;
    const beforeFactoryMaterial = useItemCount(store, 104);
    const beforeRanking = before.recordStats.rankingPoints;

    settleAt(store, {
      mapId: 56,
      point: "G",
      node: 11,
      isBoss: true,
      flagshipHp: 1,
      rank: "S",
      transportSPoints: 100
    });
    settleAt(store, {
      mapId: 56,
      point: "G",
      node: 11,
      isBoss: true,
      flagshipHp: 1,
      rank: "S",
      transportSPoints: 100
    });
    settleAt(store, {
      mapId: 56,
      point: "G",
      node: 11,
      isBoss: true,
      flagshipHp: 1,
      rank: "A",
      transportSPoints: 115
    });
    expect(store.getSave().maps.find((map) => map.id === 56)).toMatchObject({
      cleared: 0,
      phase: 2,
      phaseProgress: 0,
      gauge: 1
    });

    expect(store.startSortie(1, 5, 6)).not.toBeNull();
    const arrivalSession = store.getSave().sortieSession!;
    store.db.prepare("UPDATE sortie_sessions SET node = 18, state_json = ? WHERE id = ?").run(
      JSON.stringify({
        ...arrivalSession.state,
        point: "H",
        phase: 2,
        routeStep: 8,
        visited: ["Start", "A", "H"]
      }),
      arrivalSession.id
    );
    expect(store.nextSortieNode()?.state.point).toBe("R");
    expect(store.getSave().maps.find((map) => map.id === 56)).toMatchObject({ phase: 3, gauge: 2 });

    for (let count = 0; count < 2; count += 1) {
      settleAt(store, { mapId: 56, point: "N", node: 14, isBoss: true, flagshipHp: 0 });
    }
    expect(store.getSave().maps.find((map) => map.id === 56)).toMatchObject({ phase: 4, gauge: 3 });

    for (let count = 0; count < 3; count += 1) {
      settleAt(store, { mapId: 56, point: "Z", node: 30, isBoss: true, flagshipHp: 0 });
    }
    const repeated = store.applySortieBattleResult();
    const cleared = store.getSave();
    expect(repeated.applied).toBe(false);
    expect(cleared.maps.find((map) => map.id === 56)).toMatchObject({
      cleared: 1,
      phase: 5,
      phaseProgress: 0,
      gauge: 0,
      clearCount: 1
    });
    expect(cleared.materials.devmat).toBe(beforeDevmat + 4);
    expect(useItemCount(store, 104)).toBe(beforeFactoryMaterial + 1);
    expect(cleared.recordStats.rankingPoints).toBe(beforeRanking + 225);

    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-08-01T05:00:00.000+09:00"));
    store.settle();
    expect(store.getSave().maps.find((map) => map.id === 56)).toMatchObject({
      unlocked: 1,
      cleared: 0,
      phase: 1,
      phaseProgress: 0,
      gauge: 280,
      clearCount: 1
    });
    expect(store.getSave().materials.devmat).toBe(beforeDevmat + 4);
    expect(useItemCount(store, 104)).toBe(beforeFactoryMaterial + 1);
    vi.useRealTimers();
    store.close();
  });

  it("unlocks 5-6 only after 5-5 has been cleared at least once", () => {
    const store = createStateStore({ databasePath: ":memory:" });
    store.registerAccount(15);
    expect(store.getSave().maps.find((map) => map.id === 56)?.unlocked).toBe(0);

    store.db.prepare("UPDATE maps SET cleared = 1, clear_count = 1 WHERE id = 55").run();
    store.settle();
    expect(store.getSave().maps.find((map) => map.id === 56)?.unlocked).toBe(1);
    store.close();
  });
});

function registeredStore() {
  const store = createStateStore({ databasePath: ":memory:" });
  store.registerAccount(15);
  store.db.prepare("UPDATE maps SET unlocked = 1").run();
  return store;
}

function useItemCount(store: ReturnType<typeof createStateStore>, itemId: number) {
  return store.getSave().useItems.find((item) => item.id === itemId)?.count ?? 0;
}

function settleAt(
  store: ReturnType<typeof createStateStore>,
  input: {
    mapId: number;
    point: string;
    node: number;
    isBoss: boolean;
    flagshipHp: number;
    rank?: "S" | "A" | "B" | "C";
    transportSPoints?: number;
  }
) {
  // Experience is now encounter-bound and no longer has a rank fallback, so
  // build the fixture at the requested combat node before overriding damage.
  const fixtureNode = sortieNodes().find((node) => node.mapId === input.mapId && node.point === input.point)?.node
    ?? sortieNodes().find((node) => node.mapId === input.mapId && node.combat)?.node
    ?? input.node;
  store.db.prepare("UPDATE sortie_sessions SET area_id = ?, map_no = ?, node = ? WHERE id = 1")
    .run(Math.floor(input.mapId / 10), input.mapId % 10, fixtureNode);
  const battle = createSortieBattle(store.getSave(), { formation: 1 });
  const record = {
    ...battle.record,
    sortie: {
      ...(battle.record.sortie ?? {
        areaId: Math.floor(input.mapId / 10),
        mapNo: input.mapId % 10,
        enemyFleetKey: "test",
        shipIds: [1501],
        formation: 1,
        seed: 1
      }),
      mapId: input.mapId,
      node: fixtureNode,
      point: input.point,
      isBoss: input.isBoss,
      ...(input.transportSPoints == null
        ? {}
        : {
            visited: ["Start", "E", input.point],
            transportLanding: {
              mapId: input.mapId,
              phase: 1,
              point: "E",
              sRankPoints: input.transportSPoints
            }
          })
    },
    after: {
      ...battle.record.after,
      eNowHps: [input.flagshipHp, ...battle.record.after.eNowHps.slice(1)]
    },
    result: {
      ...battle.record.result,
      rank: input.rank ?? "S",
      dropShipId: 0,
      dropShipName: "",
      dropShipType: ""
    },
    resultClaimed: false
  };
  store.recordSortieBattle(record as unknown as Record<string, unknown>);
  return store.applySortieBattleResult();
}
