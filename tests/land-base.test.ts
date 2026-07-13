import { describe, expect, it } from "vitest";
import { publishedLandBaseRange } from "../src/master/land-base-range.js";
import {
  landBaseWavePayload,
  planLandBaseDispatch
} from "../src/kcsapi/battle/land-base.js";

describe("land-base dispatch protocol", () => {
  it("dispatches only individually selected waves whose published range is reachable", () => {
    const result = planLandBaseDispatch({
      areaId: 6,
      assignments: [
        {
          baseId: 1,
          wave: 1,
          targetNode: 13,
          rangeEvidence: { requiredDistance: 5, level: "published", source: "6-5 map table" }
        },
        {
          baseId: 1,
          wave: 2,
          targetNode: 13,
          rangeEvidence: { requiredDistance: 6, level: "published", source: "test boundary vector" }
        }
      ],
      bases: [{
        areaId: 6,
        baseId: 1,
        actionKind: 1,
        distanceBase: 5,
        distanceBonus: 0,
        activeSquadrons: 1
      }]
    });

    expect(result.waves).toEqual([expect.objectContaining({ baseId: 1, wave: 1, targetNode: 13 })]);
    expect(result.rejected).toEqual([
      expect.objectContaining({ baseId: 1, wave: 2, reason: "out-of-range", requiredDistance: 6 })
    ]);
  });

  it("fails closed when target distance evidence is absent", () => {
    const result = planLandBaseDispatch({
      areaId: 6,
      assignments: [{ baseId: 1, wave: 1, targetNode: 9, rangeEvidence: null }],
      bases: [{
        areaId: 6,
        baseId: 1,
        actionKind: 1,
        distanceBase: 99,
        distanceBonus: 0,
        activeSquadrons: 1
      }]
    });

    expect(result.waves).toEqual([]);
    expect(result.rejected[0]).toMatchObject({ reason: "missing-range-evidence", wave: 1, targetNode: 9 });
  });

  it("pins exact normal-map boss distances and emits the array element protocol shape", () => {
    expect(publishedLandBaseRange(64, "N")).toMatchObject({ requiredDistance: 5, checkedAt: "2026-07-12" });
    expect(publishedLandBaseRange(65, "M")).toMatchObject({ requiredDistance: 5 });
    expect(publishedLandBaseRange(74, "P")).toMatchObject({ requiredDistance: 2 });
    expect(publishedLandBaseRange(75, "T")).toBeNull();

    expect(landBaseWavePayload(1, [{ masterId: 168, count: 18 }], {
      api_plane_from: [[1], [2]],
      api_stage1: { airState: 1 },
      api_stage2: null,
      api_stage3: null
    })).toEqual(expect.objectContaining({
      api_base_id: 1,
      api_stage_flag: [1, 0, 0],
      api_plane_from: [null, [2]],
      api_squadron_plane: [{ api_mst_id: 168, api_count: 18 }]
    }));
  });
});
