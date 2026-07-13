import { describe, expect, it } from "vitest";
import { BATTLE_ENDPOINT_MODES, battleEndpointMode } from "../src/kcsapi/battle/data/endpoint-modes.js";

describe("battle endpoint mode configuration", () => {
  it("declares distinct modes for registered battle endpoint variants", () => {
    expect(battleEndpointMode("api_req_sortie/ld_airbattle")).toMatchObject({
      endpoint: "sortieLdAir",
      mode: "sortie",
      airBase: true,
      phaseSequence: ["airBase", "kouku"]
    });
    expect(battleEndpointMode("api_req_sortie/airbattle")).toMatchObject({
      endpoint: "sortieAir",
      phaseSequence: ["kouku", "kouku2"]
    });
    expect(battleEndpointMode("api_req_combined_battle/battle_water")).toMatchObject({
      endpoint: "combinedBattleWater",
      mode: "combined",
      targetPolicy: "combinedWater"
    });
    expect(battleEndpointMode("api_req_combined_battle/each_battle")).toMatchObject({
      endpoint: "combinedEachBattle",
      mode: "combined",
      targetPolicy: "escortFirst"
    });
    expect(battleEndpointMode("api_req_combined_battle/ec_battle")).toMatchObject({
      endpoint: "combinedEcBattle",
      enemyCombined: "active"
    });
    expect(battleEndpointMode("api_req_combined_battle/airbattle")).toMatchObject({
      endpoint: "combinedAir",
      phaseSequence: ["kouku", "kouku2"]
    });
  });

  it("keeps every configured endpoint kind unique", () => {
    const endpoints = Object.values(BATTLE_ENDPOINT_MODES).map((mode) => mode.endpoint);

    expect(new Set(endpoints).size).toBe(endpoints.length);
  });
});
