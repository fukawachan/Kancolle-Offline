import path from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import {
  eventDefinition,
  eventResourceStatus,
  eventSupportExpeditionDefinitions,
  eventSupportExpeditionMasters,
  eventRoutingMap,
  selectEventSortieEncounter,
  validateEventPackage
} from "../src/master/event-data.js";
import { createResourceManifest } from "../src/resources/manifest.js";
import type { ResourceManifest } from "../src/resources/types.js";

describe("local event data package", () => {
  let resourceManifest: ResourceManifest;

  beforeAll(async () => {
    resourceManifest = await createResourceManifest(path.resolve("cache"));
  });

  it("validates the cache-backed 061 event maps and route references", () => {
    const rejected = validateEventPackage(61, resourceManifest);
    expect(rejected).toMatchObject({ ok: false, error: expect.stringMatching(/synthetic debug/i) });

    const productionStatus = eventResourceStatus(resourceManifest)[0];
    expect(productionStatus).toMatchObject({
      packageId: "synthetic-debug-061-v1",
      packageKind: "synthetic-debug",
      productionEligible: false,
      cacheComplete: true,
      packageComplete: true,
      activatable: false
    });
    expect(eventResourceStatus(resourceManifest, null, { allowSynthetic: true })[0].activatable).toBe(true);

    const validation = validateEventPackage(61, resourceManifest, { allowSynthetic: true });
    expect(validation.ok).toBe(true);

    const event = eventDefinition(61)!;
    expect(event.maps.map((map) => map.id)).toEqual([611, 612, 613]);
    for (const map of event.maps) {
      const routing = eventRoutingMap(map.areaId, map.mapNo)!;
      expect(routing.mapId).toBe(map.id);
      expect(routing.edges).toHaveLength(map.nodes.length);
      for (const node of map.nodes) {
        expect(routing.edges.some((edge) => edge.no === node.node && edge.to === node.point)).toBe(true);
        if (!node.combat) continue;
        const encounter = selectEventSortieEncounter(map.areaId, map.mapNo, node.node, 1);
        expect(encounter).toMatchObject({
          areaId: map.areaId,
          mapNo: map.mapNo,
          mapId: map.id,
          node: node.node,
          point: node.point
        });
        expect(encounter?.shipIds.length).toBeGreaterThan(0);
      }
    }
  });

  it("validates the 061 event support expedition package", () => {
    const masters = eventSupportExpeditionMasters(61);
    const definitions = eventSupportExpeditionDefinitions(61);

    expect(masters.map((master) => master.api_id)).toEqual([61033, 61034]);
    expect(definitions.map((definition) => definition.id)).toEqual([61033, 61034]);
    expect(masters).toEqual([
      expect.objectContaining({
        api_id: 61033,
        api_disp_no: "S1",
        api_maparea_id: 61,
        api_name: "前衛支援任務",
        api_time: 15,
        api_return_flag: 0
      }),
      expect.objectContaining({
        api_id: 61034,
        api_disp_no: "S2",
        api_maparea_id: 61,
        api_name: "艦隊決戦支援任務",
        api_time: 30,
        api_return_flag: 0
      })
    ]);
    expect(definitions).toEqual([
      expect.objectContaining({
        id: 61033,
        areaId: 61,
        supportType: "route",
        returnAllowed: false,
        rewards: expect.objectContaining({ materials: [0, 0, 0, 0], items: [] })
      }),
      expect.objectContaining({
        id: 61034,
        areaId: 61,
        supportType: "boss",
        returnAllowed: false,
        rewards: expect.objectContaining({ materials: [0, 0, 0, 0], items: [] })
      })
    ]);
  });
});
