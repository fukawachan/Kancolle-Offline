import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { QUEST_BY_ID, type QuestDefinition } from "../src/master/quest-data.js";
import { advanceQuestProgress, evaluateQuest } from "../src/kcsapi/quests.js";
import { createStateStore, type StateStore } from "../src/state/store.js";
import type { Quest } from "../src/state/types.js";

describe("quest condition engine", () => {
  let tempDir: string;
  let store: StateStore;

  beforeEach(async () => {
    tempDir = await mkdtemp(path.join(tmpdir(), "kancolle-quest-engine-"));
    store = createStateStore({ databasePath: path.join(tempDir, "save.sqlite") });
    store.registerAccount(15);
  });

  afterEach(async () => {
    store.close();
    await rm(tempDir, { recursive: true, force: true });
  });

  it("evaluates fleet requirements against the current first fleet", () => {
    const save = store.getSave();
    const state = questState(101);

    expect(evaluateQuest(QUEST_BY_ID.get(101)!, save, state)).toMatchObject({
      achieved: true,
      progressFlag: 0
    });

    expect(evaluateQuest(QUEST_BY_ID.get(102)!, save, state)).toMatchObject({
      achieved: false
    });
  });

  it("tracks simple and sortie progress thresholds", () => {
    let state = questState(210);
    const simple = QUEST_BY_ID.get(210)!;
    const save = store.getSave();

    for (let index = 0; index < 5; index += 1) {
      state = withProgress(state, advanceQuestProgress(simple, save, state, { kind: "simple", subcategory: "battle" }));
    }
    expect(evaluateQuest(simple, save, state)).toMatchObject({ achieved: false, progressFlag: 1 });

    for (let index = 0; index < 3; index += 1) {
      state = withProgress(state, advanceQuestProgress(simple, save, state, { kind: "simple", subcategory: "battle" }));
    }
    expect(evaluateQuest(simple, save, state)).toMatchObject({ achieved: false, progressFlag: 2 });

    for (let index = 0; index < 2; index += 1) {
      state = withProgress(state, advanceQuestProgress(simple, save, state, { kind: "simple", subcategory: "battle" }));
    }
    expect(evaluateQuest(simple, save, state)).toMatchObject({ achieved: true, progressFlag: 0 });

    const sortie = QUEST_BY_ID.get(203)!;
    const emptySortieState = questState(203);
    const wrongMap = advanceQuestProgress(sortie, save, emptySortieState, { kind: "sortie", map: "1-2", boss: true, result: "S" });
    expect(evaluateQuest(sortie, save, withProgress(emptySortieState, wrongMap))).toMatchObject({ achieved: false });

    const correctMap = advanceQuestProgress(sortie, save, emptySortieState, { kind: "sortie", map: "1-1", boss: true, result: "B" });
    expect(evaluateQuest(sortie, save, withProgress(emptySortieState, correctMap))).toMatchObject({ achieved: true });
  });

  it("combines and/or/then requirement trees with independent branch progress", () => {
    const save = store.getSave();
    const andQuest = syntheticQuest("and", [
      { category: "simple", subcategory: "battle", times: 1 },
      { category: "simple", subcategory: "resupply", times: 1 }
    ]);
    let andState = questState(andQuest.id);
    andState = withProgress(andState, advanceQuestProgress(andQuest, save, andState, { kind: "simple", subcategory: "battle" }));
    expect(evaluateQuest(andQuest, save, andState)).toMatchObject({ achieved: false, progressFlag: 1 });
    andState = withProgress(andState, advanceQuestProgress(andQuest, save, andState, { kind: "simple", subcategory: "resupply" }));
    expect(evaluateQuest(andQuest, save, andState)).toMatchObject({ achieved: true });

    const orQuest = syntheticQuest("or", [
      { category: "simple", subcategory: "repair", times: 1 },
      { category: "simple", subcategory: "ship", times: 1 }
    ]);
    const orState = withProgress(questState(orQuest.id), advanceQuestProgress(orQuest, save, questState(orQuest.id), { kind: "simple", subcategory: "ship" }));
    expect(evaluateQuest(orQuest, save, orState)).toMatchObject({ achieved: true });

    const thenQuest = syntheticQuest("then", [
      { category: "excercise", times: 1, victory: true },
      { category: "expedition", objects: [{ times: 1 }] }
    ]);
    let thenState = questState(thenQuest.id);
    thenState = withProgress(thenState, advanceQuestProgress(thenQuest, save, thenState, { kind: "practice", result: "A", victory: true }));
    expect(evaluateQuest(thenQuest, save, thenState)).toMatchObject({ achieved: false, progressFlag: 1 });
    thenState = withProgress(thenState, advanceQuestProgress(thenQuest, save, thenState, { kind: "expedition", missionId: 1, success: true }));
    expect(evaluateQuest(thenQuest, save, thenState)).toMatchObject({ achieved: true });
  });

  it("requires matching equipment names or equipment categories for factory scrap progress", () => {
    const save = store.getSave();
    const quest = {
      ...syntheticQuest("and", []),
      requirements: {
        category: "scrapequipment",
        list: [{ name: "7.7mm機銃", amount: 2 }]
      }
    };
    let state = questState(quest.id);

    state = withProgress(state, advanceQuestProgress(quest, save, state, { kind: "scrapequipment", names: ["12cm単装砲"], amount: 1 }));
    expect(evaluateQuest(quest, save, state)).toMatchObject({ achieved: false, progressFlag: 0 });

    state = withProgress(state, advanceQuestProgress(quest, save, state, { kind: "scrapequipment", names: ["7.7mm機銃"], amount: 1 }));
    expect(evaluateQuest(quest, save, state)).toMatchObject({ achieved: false, progressFlag: 1 });

    state = withProgress(state, advanceQuestProgress(quest, save, state, { kind: "scrapequipment", names: ["7.7mm機銃"], amount: 1 }));
    expect(evaluateQuest(quest, save, state)).toMatchObject({ achieved: true });

    const categoryQuest = {
      ...quest,
      id: quest.id + 1,
      requirements: {
        category: "scrapequipment",
        list: [{ name: "小口径主砲", amount: 1 }]
      }
    };
    const categoryState = withProgress(
      questState(categoryQuest.id),
      advanceQuestProgress(categoryQuest, save, questState(categoryQuest.id), { kind: "scrapequipment", names: ["12cm単装砲"], amount: 1 })
    );
    expect(evaluateQuest(categoryQuest, save, categoryState)).toMatchObject({ achieved: true });
  });

  it("evaluates equipment exchange requirements from current inventory", () => {
    const save = store.getSave();
    const ready = {
      ...syntheticQuest("and", []),
      requirements: {
        category: "equipexchange",
        equipments: [{ name: "12cm単装砲", amount: 2 }]
      }
    };
    expect(evaluateQuest(ready, save, questState(ready.id))).toMatchObject({ achieved: true });

    const missing = {
      ...ready,
      id: ready.id + 1,
      requirements: {
        category: "equipexchange",
        equipments: [{ name: "12cm単装砲", amount: 3 }]
      }
    };
    expect(evaluateQuest(missing, save, questState(missing.id))).toMatchObject({ achieved: false });
  });
});

function questState(id: number): Quest {
  return {
    id,
    active: 1,
    progress: 0,
    completed: 0,
    periodKey: "once",
    progressData: {}
  };
}

function withProgress(state: Quest, progress: ReturnType<typeof advanceQuestProgress>): Quest {
  return {
    ...state,
    progress: progress.progressFlag,
    progressData: progress.progressData
  };
}

function syntheticQuest(category: "and" | "or" | "then", list: QuestDefinition["requirements"][]): QuestDefinition {
  return {
    id: 900000 + category.length,
    wikiId: `T-${category}`,
    category: 2,
    type: 1,
    period: "once",
    title: category,
    detail: category,
    materialRewards: [0, 0, 0, 0],
    rewards: [],
    prerequisites: [],
    requirements: { category, list }
  };
}
