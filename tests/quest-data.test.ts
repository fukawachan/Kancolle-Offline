import { describe, expect, it } from "vitest";
import { QUEST_BY_ID, QUEST_DEFINITIONS } from "../src/master/quest-data.js";

describe("quest master data", () => {
  it("loads the full kcwiki quest snapshot with stable ids and prerequisites", () => {
    expect(QUEST_DEFINITIONS).toHaveLength(446);

    const ids = QUEST_DEFINITIONS.map((quest) => quest.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);

    for (const quest of QUEST_DEFINITIONS) {
      for (const prerequisiteId of quest.prerequisites) {
        expect(uniqueIds.has(prerequisiteId), `${quest.id} references missing prerequisite ${prerequisiteId}`).toBe(true);
      }
    }
  });

  it("normalizes representative quest fields, requirements, and rewards", () => {
    expect(QUEST_BY_ID.get(101)).toMatchObject({
      id: 101,
      wikiId: "A01",
      category: 1,
      type: 1,
      title: "はじめての「編成」！",
      detail: "２隻以上の艦で構成される「艦隊」を編成せよ！",
      prerequisites: [],
      materialRewards: [20, 20, 0, 0],
      requirements: {
        category: "fleet",
        groups: [{ ship: "艦", amount: 2 }]
      },
      rewards: [
        {
          kind: "ship",
          name: "白雪",
          masterId: 10,
          amount: 1
        }
      ]
    });

    expect(QUEST_BY_ID.get(102)).toMatchObject({
      id: 102,
      wikiId: "A02",
      prerequisites: [101],
      rewards: [
        {
          kind: "material",
          name: "高速建造材",
          material: "buildKit",
          amount: 1
        }
      ]
    });

    expect(QUEST_BY_ID.get(201)).toMatchObject({
      id: 201,
      wikiId: "Bd01",
      category: 2,
      type: 2,
      requirements: {
        category: "sortie",
        result: "B",
        times: 1
      }
    });
  });
});
