import path from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { handleKcsApi, type HandlerInput } from "../src/kcsapi/handlers.js";
import { createResourceManifest } from "../src/resources/manifest.js";
import type { ResourceManifest } from "../src/resources/types.js";

function input(apiPath: string, body: Record<string, unknown> = {}): HandlerInput {
  return {
    method: "POST",
    path: apiPath,
    query: {},
    body
  };
}

function hasDisplayResource(resourceManifest: ResourceManifest, shipId: number) {
  return (
    resourceManifest.ship.full.has(shipId) ||
    resourceManifest.ship.card.has(shipId) ||
    resourceManifest.ship.banner.has(shipId) ||
    resourceManifest.ship.albumStatus.has(shipId)
  );
}

describe("cache-compatible remodel master data", () => {
  let resourceManifest: ResourceManifest;

  beforeAll(async () => {
    resourceManifest = await createResourceManifest(path.resolve("cache"));
  });

  it("does not expose remodel targets that the local cache cannot display", async () => {
    const response = await handleKcsApi(input("api_start2/getData"), {
      resourceManifest,
      stateStore: {} as any,
      unknownLogPath: "",
      arsenalRandom: Math.random
    });
    const start2 = (response as any).api_data;
    const shipIds = new Set<number>(start2.api_mst_ship.map((ship: any) => Number(ship.api_id)));

    const fubukiKaiNi = start2.api_mst_ship.find((ship: any) => Number(ship.api_id) === 426);
    expect(fubukiKaiNi).toMatchObject({
      api_aftershipid: 0,
      api_afterlv: 0,
      api_afterfuel: 0,
      api_afterbull: 0
    });

    for (const [currentId, targetId] of [
      [426, 1035],
      [1035, 1040],
      [710, 1034]
    ]) {
      expect(
        start2.api_mst_shipupgrade.some(
          (upgrade: any) => Number(upgrade.api_current_ship_id || 0) === currentId && Number(upgrade.api_id) === targetId
        )
      ).toBe(false);
    }

    for (const ship of start2.api_mst_ship) {
      const targetId = Number(ship.api_aftershipid || 0);
      if (targetId === 0) continue;
      expect(shipIds.has(targetId), `${ship.api_id} -> ${targetId}`).toBe(true);
      expect(hasDisplayResource(resourceManifest, targetId), `${ship.api_id} -> ${targetId}`).toBe(true);
    }

    for (const upgrade of start2.api_mst_shipupgrade) {
      const targetId = Number(upgrade.api_id || 0);
      const currentId = Number(upgrade.api_current_ship_id || 0);
      expect(shipIds.has(targetId), `upgrade target ${targetId}`).toBe(true);
      if (currentId !== 0) {
        expect(shipIds.has(currentId), `upgrade current ${currentId}`).toBe(true);
      }
    }
  });

  it("does not execute a remodel when the target ship is unavailable in the local cache", async () => {
    let remodelCalled = false;
    const response = await handleKcsApi(input("api_req_kaisou/remodeling", { api_id: 7 }), {
      resourceManifest,
      unknownLogPath: "",
      arsenalRandom: Math.random,
      stateStore: {
        getSave: () => ({
          ships: [{ id: 7, masterId: 426 }],
          slotItems: [],
          materials: {
            fuel: 100000,
            ammo: 100000,
            steel: 100000,
            bauxite: 100000,
            buildKit: 100000,
            repairKit: 100000,
            devmat: 100000,
            screw: 100000
          },
          useItems: [
            { itemId: 58, count: 10 },
            { itemId: 75, count: 10 },
            { itemId: 78, count: 10 }
          ]
        }),
        remodelShip: () => {
          remodelCalled = true;
          return null;
        }
      } as any
    });

    expect(response).toMatchObject({
      api_result: 1,
      api_data: { api_after_ship: null }
    });
    expect(remodelCalled).toBe(false);
  });
});
