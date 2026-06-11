import { describe, expect, it } from "vitest";
import { createStateStore } from "../src/state/store.js";

describe("sortie routing sessions", () => {
  it("starts from the topology edge and snapshots its routing context", () => {
    const store = createStateStore({ databasePath: ":memory:" });
    store.registerAccount(15);

    const session = store.startSortie(1, 1, 1)!;

    expect(session.node).toBe(1);
    expect(session.state).toMatchObject({
      point: "A",
      routeStep: 1,
      visited: ["Start", "A"],
      fleet: { ships: expect.any(Array) }
    });
    expect(store.previewSortieRoute()).toMatchObject({ kind: "route", from: "A", edgeNo: expect.any(Number) });
    store.close();
  });

  it("advances to the evaluated edge and remains at a terminal node", () => {
    const store = createStateStore({ databasePath: ":memory:" });
    store.registerAccount(15);
    store.startSortie(1, 1, 1);

    const advanced = store.nextSortieNode()!;
    const terminal = store.nextSortieNode()!;

    expect([2, 3]).toContain(advanced.node);
    expect(terminal.node).toBe(advanced.node);
    expect(store.previewSortieRoute()).toBeNull();
    store.close();
  });

  it("requires a valid edge number at active branching nodes", () => {
    const store = createStateStore({ databasePath: ":memory:" });
    store.registerAccount(15);
    store.startSortie(1, 4, 5);
    const session = store.getSave().sortieSession!;
    store.db.prepare("UPDATE sortie_sessions SET node = 1, state_json = ? WHERE id = 1").run(JSON.stringify({
      ...session.state,
      point: "A",
      routeStep: 1,
      visited: ["Start", "A"]
    }));

    expect(store.previewSortieRoute()).toEqual({ kind: "select", edgeNos: [2, 4], from: "A" });
    expect(() => store.nextSortieNode()).toThrow(/api_cell_id/i);
    expect(() => store.nextSortieNode(999)).toThrow(/not available/i);
    expect(store.nextSortieNode(4)?.node).toBe(4);
    store.close();
  });
});
