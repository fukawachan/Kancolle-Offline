import { describe, expect, it, vi } from "vitest";
import { createSortieBattle } from "../src/kcsapi/battle.js";
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
    vi.setSystemTime(new Date("2026-08-01T00:00:00.000+09:00"));
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

  it("advances all four 7-5 phases and accepts a non-sinking victory at M", () => {
    const store = registeredStore();
    store.startSortie(1, 7, 5);

    for (let count = 0; count < 2; count += 1) {
      settleAt(store, { mapId: 75, point: "K", node: 11, isBoss: false, flagshipHp: 0 });
    }
    settleAt(store, { mapId: 75, point: "M", node: 15, isBoss: false, flagshipHp: 1, rank: "B" });
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
});

function registeredStore() {
  const store = createStateStore({ databasePath: ":memory:" });
  store.registerAccount(15);
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
  }
) {
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
      node: input.node,
      point: input.point,
      isBoss: input.isBoss
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
