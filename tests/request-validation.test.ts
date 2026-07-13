import { describe, expect, it } from "vitest";
import {
  nonNegativeInteger,
  oneOfIntegers,
  positiveInteger,
  positiveIntegerList,
  validateCriticalCommand
} from "../src/kcsapi/request-validation.js";

describe("strict KCS API request values", () => {
  it("accepts canonical bounded integer values", () => {
    expect(positiveInteger("1", "api_id")).toEqual({ ok: true, value: 1 });
    expect(positiveInteger(2_147_483_647, "api_id")).toEqual({ ok: true, value: 2_147_483_647 });
    expect(nonNegativeInteger("0", "api_index")).toEqual({ ok: true, value: 0 });
  });

  it.each([undefined, null, "", "  ", 0, -1, "-1", 1.5, "1.5", "1e2", "01", NaN, Infinity, 2_147_483_648])(
    "rejects a non-canonical positive instance id: %s",
    (value) => {
      expect(positiveInteger(value, "api_id")).toMatchObject({ ok: false });
    }
  );

  it("parses a unique positive integer list without silently dropping bad members", () => {
    expect(positiveIntegerList("7,8,9", "api_ids")).toEqual({ ok: true, value: [7, 8, 9] });
    expect(positiveIntegerList([7, "8", 9], "api_ids")).toEqual({ ok: true, value: [7, 8, 9] });

    for (const value of [undefined, "", "7,7", "7,-1", "7,1.5", "7,", "7,999999999999999999999"]) {
      expect(positiveIntegerList(value, "api_ids"), String(value)).toMatchObject({ ok: false });
    }
  });

  it("validates integer enums", () => {
    expect(oneOfIntegers("3", "api_kind", [1, 2, 3] as const)).toEqual({ ok: true, value: 3 });
    expect(oneOfIntegers("4", "api_kind", [1, 2, 3] as const)).toMatchObject({ ok: false });
  });

  it("rejects dangerous missing and duplicate command identifiers", () => {
    expect(validateCriticalCommand({ path: "api_req_kousyou/destroyship", body: {} })).toMatchObject({ ok: false });
    expect(validateCriticalCommand({
      path: "/kcsapi/api_req_kousyou/destroyitem2",
      body: { api_slotitem_ids: "4,4" }
    })).toMatchObject({ ok: false });
    expect(validateCriticalCommand({
      path: "api_req_hokyu/charge",
      body: { api_id_items: "1,2", api_kind: "3", api_onslot: "1" }
    })).toEqual({ ok: true, value: undefined });
    expect(validateCriticalCommand({
      path: "api_req_kousyou/destroyship",
      body: { api_ship_id: "7", api_slot_dest_flag: "2" }
    })).toMatchObject({ ok: false });
    expect(validateCriticalCommand({
      path: "api_req_kaisou/slot_deprive",
      body: {
        api_unset_ship: "1",
        api_unset_idx: "0",
        api_set_ship: "2",
        api_set_idx: "1"
      }
    })).toEqual({ ok: true, value: undefined });
    expect(validateCriticalCommand({
      path: "api_req_kaisou/slot_deprive",
      body: { api_unset_ship: "1", api_unset_idx: "-1", api_set_ship: "2", api_set_idx: "1" }
    })).toMatchObject({ ok: false });
    expect(validateCriticalCommand({
      path: "api_req_air_corps/set_plane",
      body: { api_area_id: "1", api_base_id: "1", api_squadron_id: "4", api_item_id: "-1" }
    })).toEqual({ ok: true, value: undefined });
    expect(validateCriticalCommand({
      path: "api_req_air_corps/set_plane",
      body: { api_area_id: "1", api_base_id: "1", api_squadron_id: "5", api_item_id: "7" }
    })).toMatchObject({ ok: false });
    expect(validateCriticalCommand({
      path: "api_req_kaisou/open_exslot",
      body: { api_id: "7", api_verno: "1" }
    })).toEqual({ ok: true, value: undefined });
    expect(validateCriticalCommand({
      path: "api_req_kaisou/open_exslot",
      body: { api_id: "7" }
    })).toMatchObject({ ok: false });
    expect(validateCriticalCommand({
      path: "api_req_air_corps/change_deployment_base",
      body: {
        api_area_id: "6", api_base_id: "2", api_base_id_src: "1",
        api_squadron_id: "1", api_item_id: "7", api_verno: "1"
      }
    })).toEqual({ ok: true, value: undefined });
    expect(validateCriticalCommand({
      path: "api_req_air_corps/change_name",
      body: { api_area_id: "6", api_base_id: "1", api_name: "", api_verno: "1" }
    })).toMatchObject({ ok: false });
    expect(validateCriticalCommand({
      path: "api_req_air_corps/expand_maintenance_level",
      body: { api_area_id: "6" }
    })).toMatchObject({ ok: false });
    expect(validateCriticalCommand({
      path: "api_req_practice/change_matching_kind",
      body: { api_selected_kind: "3", api_verno: "1" }
    })).toEqual({ ok: true, value: undefined });
    expect(validateCriticalCommand({
      path: "api_req_practice/change_matching_kind",
      body: { api_selected_kind: "4", api_verno: "1" }
    })).toMatchObject({ ok: false });
  });
});
