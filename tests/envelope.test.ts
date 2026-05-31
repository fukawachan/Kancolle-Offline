import { describe, expect, it } from "vitest";
import { apiError, apiOk, parseApiPayload, serializeApiResponse } from "../src/kcsapi/envelope.js";

describe("Kancolle API envelope", () => {
  it("wraps successful data in the shared api_result envelope", () => {
    expect(apiOk({ api_world_id: 1 })).toEqual({
      api_result: 1,
      api_result_msg: "成功",
      api_data: { api_world_id: 1 }
    });
  });

  it("can serialize JSON directly or with the svdata prefix", () => {
    const payload = apiOk({ api_token: "local-token" });

    expect(serializeApiResponse(payload, "json")).toBe(JSON.stringify(payload));
    expect(serializeApiResponse(payload, "svdata")).toBe(`svdata=${JSON.stringify(payload)}`);
  });

  it("parses URL encoded, JSON, and svdata request payloads", () => {
    expect(parseApiPayload("api_ship_id=1&api_id=2")).toEqual({ api_ship_id: "1", api_id: "2" });
    expect(parseApiPayload('{"api_id":3}')).toEqual({ api_id: 3 });
    expect(parseApiPayload('svdata={"api_id":4}')).toEqual({ api_id: 4 });
  });

  it("wraps local API errors without throwing a transport error", () => {
    expect(apiError("missing endpoint", 404)).toEqual({
      api_result: 404,
      api_result_msg: "missing endpoint",
      api_data: {}
    });
  });
});
