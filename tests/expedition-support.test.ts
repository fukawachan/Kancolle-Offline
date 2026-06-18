import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createSortieBattle } from "../src/kcsapi/battle.js";
import { createStateStore, type StateStore } from "../src/state/store.js";

describe("World 5 support expeditions", () => {
  let tempDir: string;
  let store: StateStore;

  beforeEach(async () => {
    tempDir = await mkdtemp(path.join(tmpdir(), "kancolle-support-"));
    store = createStateStore({ databasePath: path.join(tempDir, "save.sqlite") });
    store.registerAccount(15);
    store.unlockAllExpeditions(true);
    store.setExpeditionFixedSeed(1);

    const first = store.createShip(9);
    const second = store.createShip(10);
    store.changeDeckShip(3, 0, first.id);
    store.changeDeckShip(3, 1, second.id);
  });

  afterEach(async () => {
    store.close();
    await rm(tempDir, { recursive: true, force: true });
  });

  it("injects deterministic route support into a World 5 battle", () => {
    expect(store.startExpedition(3, 33, "support-route").ok).toBe(true);
    expect(store.startSortie(1, 5, 1)).not.toBeNull();

    const battle = createSortieBattle(store.getSave(), { formation: 1 });

    expect(battle.payload.api_support_flag).toBeGreaterThan(0);
    expect(battle.payload.api_support_info).toMatchObject({
      api_support_hourai: {
        api_deck_id: 3,
        api_damage: expect.any(Array),
      },
    });
    expect(battle.record.support).toMatchObject({
      deckId: 3,
      missionId: 33,
      arrived: true,
    });
  });

  it("records participation and automatically returns support fleets at port", () => {
    expect(store.startExpedition(3, 33, "support-return").ok).toBe(true);
    store.recordSupportParticipation(3);
    store.finishSupportExpeditions();

    expect(store.getSave().expeditionRuns.find((run) => run.deckId === 3)?.status).toBe("claimed");
    expect(store.getSave().decks[2].missionState.state).toBe(0);
  });
});
