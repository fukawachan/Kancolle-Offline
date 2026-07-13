import { describe, expect, it } from "vitest";
import {
  EXPEDITION_DEFINITIONS,
  EXPEDITION_MASTERS,
  EXPEDITION_USEITEM_MASTERS,
} from "../src/master/expedition-data.js";
import { masterData } from "../src/master/data.js";

const REQUIRED_MASTER_KEYS = [
  "api_id",
  "api_maparea_id",
  "api_disp_no",
  "api_reset_type",
  "api_damage_type",
  "api_mission_type",
  "api_name",
  "api_difficulty",
  "api_details",
  "api_time",
  "api_use_fuel",
  "api_use_bull",
  "api_win_item1",
  "api_win_item2",
  "api_win_mat_level",
  "api_sample_fleet",
  "api_deck_num",
  "api_return_flag",
] as const;

describe("expedition data contract", () => {
  it("contains the complete current mission master set", () => {
    expect(EXPEDITION_MASTERS).toHaveLength(65);
    expect(new Set(EXPEDITION_MASTERS.map((mission) => mission.api_id)).size).toBe(65);
    expect(EXPEDITION_MASTERS.map((mission) => mission.api_id)).toEqual(expect.arrayContaining([301, 302]));

    for (const mission of EXPEDITION_MASTERS) {
      for (const key of REQUIRED_MASTER_KEYS) {
        expect(mission, `mission ${mission.api_id} is missing ${key}`).toHaveProperty(key);
      }
    }
  });

  it("has one declarative operational definition for every master", () => {
    const masterIds = EXPEDITION_MASTERS.map((mission) => mission.api_id).sort((a, b) => a - b);
    const definitionIds = EXPEDITION_DEFINITIONS.map((mission) => mission.id).sort((a, b) => a - b);

    expect(definitionIds).toEqual(masterIds);
    for (const definition of EXPEDITION_DEFINITIONS) {
      expect(definition.durationMinutes).toBeGreaterThan(0);
      expect(definition.minimumShips).toBeGreaterThanOrEqual(2);
      expect(definition.rewards.materials).toHaveLength(4);
      expect(definition.requirementsText).toEqual(expect.any(String));
      expect(definition.shipGroups).toEqual(expect.any(Array));
      expect(
        definition.shipGroups.every((group) => group.count <= definition.minimumShips),
        `expedition ${definition.id} contains an impossible composition count`
      ).toBe(true);
      expect(definition.statRequirements).toEqual(expect.any(Object));
    }
  });

  it("normalizes fleet, flagship, stat, and drum-can requirements", () => {
    const monthly = EXPEDITION_DEFINITIONS.find((definition) => definition.id === 142)!;
    expect(monthly.shipGroups).toContainEqual({ typeIds: [2], count: 5, flagship: false });
    expect(monthly.statRequirements).toEqual({
      firepower: 280,
      antiAir: 240,
      antiSubmarine: 200,
      lineOfSight: 160,
    });
    expect(monthly.drumCanRequirement).toEqual({ equippedShips: 3, totalItems: 4 });

    const flagship = EXPEDITION_DEFINITIONS.find((definition) => definition.id === 131)!;
    expect(flagship.shipGroups).toContainEqual({ typeIds: [16], count: 1, flagship: true });
  });

  it("only references reward items present in the use-item master", () => {
    const itemIds = new Set(EXPEDITION_USEITEM_MASTERS.map((item) => item.api_id));
    const referenced = EXPEDITION_DEFINITIONS.flatMap((definition) =>
      definition.rewards.items.map((item) => item.itemId)
    );

    expect(referenced.length).toBeGreaterThan(0);
    for (const itemId of referenced) {
      expect(itemIds, `unknown expedition reward item ${itemId}`).toContain(itemId);
    }
  });

  it("publishes generated expedition and use-item masters through start2", () => {
    expect(masterData.api_mst_mission).toEqual(EXPEDITION_MASTERS);
    expect(masterData.api_mst_useitem).toEqual(EXPEDITION_USEITEM_MASTERS);
  });
});
