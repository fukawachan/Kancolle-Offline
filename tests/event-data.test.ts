import path from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import {
  eventDefinition,
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
    const validation = validateEventPackage(61, resourceManifest);
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
});
