import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { LIMITED_ENDPOINT_CONTRACTS } from "../src/kcsapi/limited-endpoints.js";
import { buildApp } from "../src/server/app.js";
import { createStateStore, type StateStore } from "../src/state/store.js";

const API_TOKEN = "limited-endpoint-fixture-token";

describe("finite cached-client endpoint contracts", () => {
  let tempDir: string;
  let store: StateStore;
  let app: Awaited<ReturnType<typeof buildApp>>;

  beforeEach(async () => {
    tempDir = await mkdtemp(path.join(tmpdir(), "kancolle-limited-endpoints-"));
    store = createStateStore({ databasePath: path.join(tempDir, "save.sqlite") });
    store.registerAccount(15);
    store.openAirBaseArea(6);
    app = await buildApp({
      cacheDir: path.resolve("cache"),
      stateStore: store,
      unknownLogPath: path.join(tempDir, "unknown.jsonl"),
      apiToken: API_TOKEN
    });
  });

  afterEach(async () => {
    await app.close();
    store.close();
    await rm(tempDir, { recursive: true, force: true });
  });

  async function post(pathname: string, payload: Record<string, string | number> = {}) {
    return app.inject({
      method: "POST",
      url: `/kcsapi/${pathname}`,
      payload: new URLSearchParams({
        api_token: API_TOKEN,
        ...Object.fromEntries(Object.entries(payload).map(([key, value]) => [key, String(value)]))
      }).toString(),
      headers: { "content-type": "application/x-www-form-urlencoded" }
    });
  }

  it("classifies all twelve audited endpoints without duplicate paths", () => {
    expect(LIMITED_ENDPOINT_CONTRACTS).toHaveLength(12);
    expect(new Set(LIMITED_ENDPOINT_CONTRACTS.map((entry) => entry.path)).size).toBe(12);
    expect(LIMITED_ENDPOINT_CONTRACTS.every((entry) => entry.stateEffect.length > 0)).toBe(true);
  });

  it("matches the exact empty/null field shapes consumed by client 6.2.3.1", async () => {
    expect((await post("api_get_member/sortie_conditions")).json().api_data).toEqual({
      api_sortie_conditions: [],
      api_mission_conditions: []
    });
    expect((await post("api_port/airCorpsCondRecoveryWithTimer", {
      api_area_id: 6,
      api_base_id: 1
    })).json().api_data).toEqual({
      api_plane_info: expect.any(Array),
      api_distance: { api_base: expect.any(Number), api_bonus: expect.any(Number) }
    });
    expect((await post("api_req_member/get_incentive")).json().api_data).toEqual({ api_item: [] });
    expect((await post("api_req_member/get_event_selected_reward")).json().api_data).toEqual({
      api_get_item_list: []
    });
    expect((await post("api_req_member/itemuse_cond", {
      api_deck_id: 1,
      api_use_type: 0
    })).json().api_data).toEqual({ api_caution_flag: 0 });
    expect((await post("api_req_map/anchorage_repair")).json().api_data).toEqual({
      api_used_ship: 0,
      api_ship_data: [],
      api_repair_ships: []
    });
    expect((await post("api_req_furniture/radio_play")).json().api_data).toEqual({ api_id: 0 });
    expect((await post("api_req_furniture/music_play", { api_music_id: 101 })).json().api_data).toEqual({
      api_coin: store.getSave().furniture.coins
    });
  });

  it("persists friendly-fleet and OSS settings while keeping their success payload empty", async () => {
    const friendly = await post("api_req_member/set_friendly_request", {
      api_request_flag: 1,
      api_request_type: 2
    });
    const oss = await post("api_req_member/set_oss_condition", {
      api_language_type: 1,
      "api_oss_items[0]": 1,
      "api_oss_items[1]": 0,
      "api_oss_items[2]": 1,
      "api_oss_items[3]": 0
    });
    expect(friendly.json().api_data).toEqual({});
    expect(oss.json().api_data).toEqual({});

    const requireInfo = (await post("api_get_member/require_info")).json().api_data;
    expect(requireInfo.api_friendly_setting).toEqual({ api_request_flag: 1, api_request_type: 2 });
    expect(requireInfo.api_oss_setting).toEqual({ api_oss_items: [1, 0, 1, 0], api_language_type: 1 });

    const port = (await post("api_port/port")).json().api_data;
    expect(port.api_friendly_setting).toEqual({ api_request_flag: 1, api_request_type: 2 });
    expect(port).toMatchObject({
      api_dest_ship_slot: 1,
      api_c_flags: [],
      api_c_flag2: 0,
      api_plane_info: null,
      api_furniture_affect_items: {}
    });
  });

  it("rejects malformed setting commands without changing the save", async () => {
    const before = store.getSave();
    const friendly = await post("api_req_member/set_friendly_request", {
      api_request_flag: 7,
      api_request_type: 2
    });
    const oss = await post("api_req_member/set_oss_condition", {
      api_language_type: 0,
      "api_oss_items[0]": 1,
      "api_oss_items[1]": 0,
      "api_oss_items[2]": 1
    });
    expect(friendly.statusCode).toBe(400);
    expect(oss.statusCode).toBe(400);
    expect(store.getSave()).toEqual(before);
  });
});
