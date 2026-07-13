import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { battleResultPayload, createSortieBattle } from "../src/kcsapi/battle.js";
import {
  ENEMY_UNIT_TEMPLATES,
  resolveSortieExperience,
  sortieAdmiralExperience,
  sortieMapExperience,
  sortieNodes
} from "../src/master/sortie-data.js";
import { createStateStore } from "../src/state/store.js";

describe("normal sortie experience data", () => {
  it("covers every encounter and every boss on all 37 normal maps", () => {
    const points = new Map<string, (ReturnType<typeof sortieNodes>)[number]>();
    for (const node of sortieNodes()) points.set(`${node.mapId}:${node.point}`, node);

    const mapIds = new Set([...points.values()].map((point) => point.mapId));
    expect(mapIds.size).toBe(37);
    expect([...points.values()].reduce((sum, point) => sum + point.encounters.length, 0)).toBe(1_799);

    for (const mapId of mapIds) {
      const experience = sortieMapExperience(mapId);
      expect(experience, `map ${mapId}`).toMatchObject({
        version: "normal-sortie-exp-2026-07-13",
        normalAdmiralExp: expect.any(Number),
        evidence: { level: "exact", source: expect.any(String) }
      });
      expect(experience!.normalAdmiralExp).toBeGreaterThan(0);
    }

    for (const point of points.values()) {
      if (point.isBoss) {
        expect(
          sortieMapExperience(point.mapId)?.bossAdmiralExpByPoint[point.point],
          `HQ EXP for boss ${point.mapId}:${point.point}`
        ).toBeGreaterThan(0);
      }
      for (const encounter of point.encounters) {
        expect(encounter.baseExp, `${point.mapId}:${point.point}:${encounter.key}`).toBeGreaterThan(0);
        expect(encounter.expEvidence, `${point.mapId}:${point.point}:${encounter.key}`).toMatchObject({
          level: expect.stringMatching(/^(exact|inferred)$/),
          source: expect.any(String),
          match: expect.any(String)
        });
        expect(resolveSortieExperience(point.mapId, point.node, encounter.key)?.baseExp).toBe(encounter.baseExp);
      }
    }
  });

  it("uses the published formation-specific values for 3-5 D and H", () => {
    const d = sortieNodes().find((node) => node.mapId === 35 && node.point === "D")!;
    const h = sortieNodes().find((node) => node.mapId === 35 && node.point === "H")!;

    expect(d.encounters.map((encounter) => encounter.baseExp)).toEqual([400, 410, 430, 430, 450]);
    expect(h.encounters.map((encounter) => encounter.baseExp)).toEqual([600, 600, 600, 600, 600, 600]);
    expect(h.encounters.every((encounter) => encounter.expEvidence?.level === "exact")).toBe(true);
  });

  it("calculates normal-node and boss HQ experience for every battle rank", () => {
    const normal = {
      policy: "normal" as const,
      version: "test",
      normalAdmiralExp: 190,
      nodeAdmiralExp: 190
    };
    const boss = { ...normal, nodeAdmiralExp: 2_880 };
    const ranks = ["S", "A", "B", "C", "D", "E"] as const;

    expect(ranks.map((rank) => sortieAdmiralExperience(normal, false, rank, 600)))
      .toEqual([190, 152, 95, 0, 0, 0]);
    expect(ranks.map((rank) => sortieAdmiralExperience(boss, true, rank, 600)))
      .toEqual([2_880, 2_785, 2_728, 190, 0, 0]);
    expect(sortieAdmiralExperience({ policy: "synthetic-debug", version: "debug" }, false, "E", 35))
      .toBe(70);
  });

  it("keeps every phase boss explicit on 5-6, 7-2, 7-3, and 7-5", () => {
    expect(sortieMapExperience(56)).toMatchObject({
      normalAdmiralExp: 250,
      bossAdmiralExpByPoint: { G: 500, N: 500, Z: 3_500 }
    });
    expect(sortieMapExperience(72)?.bossAdmiralExpByPoint).toEqual({ G: 360, M: 2_360 });
    expect(sortieMapExperience(73)?.bossAdmiralExpByPoint).toEqual({ E: 320, P: 1_920 });
    expect(sortieMapExperience(75)?.bossAdmiralExpByPoint).toEqual({ K: 360, Q: 360, T: 2_360 });
  });
});

describe("3-5 H battle-result settlement", () => {
  it("returns 600 base EXP, A-rank ship bonuses, and 152 HQ EXP", async () => {
    const settled = await settle35H({ rank: "A", mvp: 2, shipCount: 3, staleBaseExp: 35 });

    expect(settled.payload).toMatchObject({
      api_win_rank: "A",
      api_get_base_exp: 600,
      api_get_exp: 152,
      api_member_exp: settled.initialMemberExp + 152
    });
    expect(settled.payload.api_get_ship_exp.slice(1, 7)).toEqual([900, 1_200, 600, -1, -1, -1]);
    expect(settled.repeatedApplied).toBe(false);
    expect(settled.repeatedPayload).toEqual(settled.payload);
  });

  it("applies flagship MVP and removes the flagship bonus on an E defeat", async () => {
    const flagshipMvp = await settle35H({ rank: "A", mvp: 1, shipCount: 1 });
    expect(flagshipMvp.payload.api_get_ship_exp[1]).toBe(1_800);

    const eDefeat = await settle35H({ rank: "E", mvp: 0, shipCount: 1 });
    expect(eDefeat.payload.api_get_ship_exp[1]).toBe(300);
    expect(eDefeat.payload.api_get_exp).toBe(0);
  });

  it("rejects an unclaimed normal-sortie record whose encounter can no longer be resolved", async () => {
    await expect(settle35H({ rank: "A", mvp: 1, shipCount: 1, corruptEnemyFleetKey: true }))
      .rejects.toThrow(/cannot resolve experience/i);
  });
});

async function settle35H(input: {
  rank: "A" | "E";
  mvp: number;
  shipCount: number;
  staleBaseExp?: number;
  corruptEnemyFleetKey?: boolean;
}) {
  const tempDir = await mkdtemp(path.join(tmpdir(), "kancolle-sortie-exp-"));
  const store = createStateStore({ databasePath: path.join(tempDir, "save.sqlite") });
  const node = sortieNodes().find((item) => item.mapId === 35 && item.point === "H")!;
  const originalEncounters = node.encounters.map((encounter) => ({
    shipIds: [...encounter.shipIds],
    enemyCombinedShipIds: encounter.enemyCombinedShipIds ? [...encounter.enemyCombinedShipIds] : undefined,
    formation: encounter.formation,
    weight: encounter.weight
  }));
  const enemy = ENEMY_UNIT_TEMPLATES[1501];
  const originalEnemy = { ...enemy, slots: [...enemy.slots], onSlot: [...enemy.onSlot] };

  try {
    store.registerAccount(15);
    const initialMemberExp = store.getSave().player.exp;
    const ships = [911, 192, 696].slice(0, input.shipCount).map((masterId) => store.createShip(masterId));
    store.clearDeckFollowerShips(1);
    ships.forEach((ship, index) => store.changeDeckShip(1, index, ship.id));
    store.startSortie(1, 3, 5);
    const session = store.getSave().sortieSession!;

    for (const encounter of node.encounters) {
      Object.assign(encounter, { shipIds: [1501], enemyCombinedShipIds: undefined, formation: 1, weight: 1 });
    }
    Object.assign(enemy, { hp: 1, armor: 0, firepower: 0, torpedo: 0, slots: [], onSlot: [] });
    store.db.prepare("UPDATE sortie_sessions SET node = ?, seed = 0, state_json = ? WHERE id = 1").run(
      node.node,
      JSON.stringify({ ...session.state, point: "H", routeStep: 1, visited: ["Start", "H"], battles: 0 })
    );

    const battle = createSortieBattle(store.getSave(), { formation: 1 });
    const staleBaseExp = input.staleBaseExp ?? battle.record.result.baseExp;
    const record = {
      ...battle.record,
      sortie: {
        ...battle.record.sortie,
        ...(input.corruptEnemyFleetKey ? { enemyFleetKey: "missing-legacy-encounter" } : {}),
        baseExp: staleBaseExp,
        experienceProfile: { policy: "synthetic-debug", version: "legacy" }
      },
      result: {
        ...battle.record.result,
        rank: input.rank,
        mvp: input.mvp,
        baseExp: staleBaseExp,
        getExp: staleBaseExp,
        memberExp: staleBaseExp,
        dropShipId: 0,
        dropShipName: "",
        dropShipType: ""
      },
      resultClaimed: false
    };
    store.recordSortieBattle(record as unknown as Record<string, unknown>);
    const applied = store.applySortieBattleResult();
    const payload = battleResultPayload(applied.record as any) as any;
    const repeated = store.applySortieBattleResult();
    const repeatedPayload = battleResultPayload(repeated.record as any) as any;
    return { payload, repeatedPayload, repeatedApplied: repeated.applied, initialMemberExp };
  } finally {
    node.encounters.forEach((encounter, index) => Object.assign(encounter, originalEncounters[index]));
    Object.assign(enemy, originalEnemy);
    store.close();
    await rm(tempDir, { recursive: true, force: true });
  }
}
