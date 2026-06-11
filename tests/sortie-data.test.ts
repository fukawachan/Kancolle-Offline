import { describe, expect, it } from "vitest";
import { createSortieBattle } from "../src/kcsapi/battle.js";
import { masterData } from "../src/master/data.js";
import {
  ENEMY_UNIT_TEMPLATES,
  sortieNodeData,
  sortieNodes
} from "../src/master/sortie-data.js";
import { createStateStore } from "../src/state/store.js";

const OFFICIAL_NORMAL_MAP_IDS = [
  11, 12, 13, 14, 15, 16,
  21, 22, 23, 24, 25,
  31, 32, 33, 34, 35,
  41, 42, 43, 44, 45,
  51, 52, 53, 54, 55,
  61, 62, 63, 64, 65,
  71, 72, 73, 74, 75
];

describe("offline normal-map sortie data", () => {
  it("covers every official normal map with combat and boss nodes", () => {
    const nodes = sortieNodes();
    const coveredMapIds = [...new Set(nodes.map((node) => node.mapId))].sort((a, b) => a - b);

    expect(coveredMapIds).toEqual(OFFICIAL_NORMAL_MAP_IDS);
    expect(nodes.length).toBeGreaterThanOrEqual(400);
    for (const mapId of OFFICIAL_NORMAL_MAP_IDS) {
      const mapNodes = nodes.filter((node) => node.mapId === mapId);
      expect(mapNodes.some((node) => node.combat), `map ${mapId} has combat nodes`).toBe(true);
      if (mapId !== 16) {
        expect(mapNodes.some((node) => node.isBoss), `map ${mapId} has boss nodes`).toBe(true);
      }
    }
  });

  it("keeps every observed enemy fleet and resolves every enemy master", () => {
    const encounters = sortieNodes().flatMap((node) => node.encounters);

    expect(encounters.some((encounter) => encounter.shipIds.length === 12)).toBe(true);
    for (const encounter of encounters) {
      expect(encounter.shipIds.length, encounter.key).toBeGreaterThan(0);
      for (const shipId of encounter.shipIds) {
        expect(ENEMY_UNIT_TEMPLATES[shipId], `enemy template ${shipId}`).toBeTruthy();
      }
    }
  });

  it("uses the generated 7-5 boss fleet instead of the fallback encounter", () => {
    const store = createStateStore({ databasePath: ":memory:" });
    store.registerAccount(15);
    store.startSortie(1, 7, 5);
    const session = store.getSave().sortieSession!;
    store.db.prepare("UPDATE sortie_sessions SET node = 24, state_json = ? WHERE id = 1")
      .run(JSON.stringify({ ...session.state, point: "T" }));

    const battle = createSortieBattle(store.getSave(), { formation: 1 });

    expect(sortieNodeData(7, 5, 24)).toMatchObject({ point: "T", isBoss: true });
    expect(battle.record.sortie).toMatchObject({ mapId: 75, node: 24, point: "T", isBoss: true });
    expect(battle.payload.api_ship_ke.filter((id: number) => id > 0)).not.toEqual([1505, 1502, 1502]);
    store.close();
  });

  it("does not expose the non-official 5-6 placeholder map", () => {
    expect(masterData.api_mst_mapinfo.some((map) => map.api_id === 56)).toBe(false);
  });
});
