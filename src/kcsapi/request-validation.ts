export type ParseResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: string };

const MAX_INSTANCE_ID = 2_147_483_647;

type RequestShape = { path: string; body: Record<string, unknown> };

/**
 * Boundary checks for commands where a permissive default could target a real
 * instance. Domain commands still repeat existence/state checks transactionally.
 */
export function validateCriticalCommand(input: RequestShape): ParseResult<undefined> {
  const body = input.body;
  switch (normalizePath(input.path)) {
    case "api_req_init/firstship":
      return validWhen(positiveInteger(body.api_ship_id, "api_ship_id"));
    case "api_req_kousyou/destroyitem2":
      return validWhen(positiveIntegerList(body.api_slotitem_ids ?? body.api_slotitem_id, "api_slotitem_ids"));
    case "api_req_kousyou/destroyship": {
      const ships = positiveIntegerList(body.api_ship_id, "api_ship_id");
      if (!ships.ok) return ships;
      if (body.api_slot_dest_flag != null) {
        return validWhen(oneOfIntegers(body.api_slot_dest_flag, "api_slot_dest_flag", [0, 1] as const));
      }
      return { ok: true, value: undefined };
    }
    case "api_req_hokyu/charge": {
      const ids = positiveIntegerList(body.api_id_items, "api_id_items");
      if (!ids.ok) return ids;
      const kind = oneOfIntegers(body.api_kind, "api_kind", [0, 1, 2, 3] as const);
      if (!kind.ok) return kind;
      if (body.api_onslot != null) {
        const onslot = oneOfIntegers(body.api_onslot, "api_onslot", [0, 1] as const);
        if (!onslot.ok) return onslot;
      }
      return { ok: true, value: undefined };
    }
    case "api_req_kaisou/slotset": {
      for (const result of [
        positiveInteger(body.api_id, "api_id"),
        boundedInteger(body.api_slot_idx, "api_slot_idx", 0, 4),
        boundedInteger(body.api_item_id, "api_item_id", -1, MAX_INSTANCE_ID)
      ]) {
        if (!result.ok) return result;
      }
      return { ok: true, value: undefined };
    }
    case "api_req_kaisou/slotset_ex": {
      const ship = positiveInteger(body.api_id, "api_id");
      if (!ship.ok) return ship;
      return validWhen(boundedInteger(body.api_item_id, "api_item_id", -1, MAX_INSTANCE_ID));
    }
    case "api_req_kaisou/open_exslot": {
      const ship = positiveInteger(body.api_id, "api_id");
      if (!ship.ok) return ship;
      return requiredApiVersion(body.api_verno);
    }
    case "api_req_nyukyo/open_new_dock":
    case "api_req_kousyou/open_new_dock":
      return requiredApiVersion(body.api_verno);
    case "api_req_kaisou/slot_deprive": {
      for (const result of [
        positiveInteger(body.api_unset_ship, "api_unset_ship"),
        boundedInteger(body.api_unset_idx, "api_unset_idx", 0, 4),
        oneOfIntegers(body.api_unset_slot_kind ?? 0, "api_unset_slot_kind", [0, 1] as const),
        positiveInteger(body.api_set_ship, "api_set_ship"),
        boundedInteger(body.api_set_idx, "api_set_idx", 0, 4),
        oneOfIntegers(body.api_set_slot_kind ?? 0, "api_set_slot_kind", [0, 1] as const)
      ]) {
        if (!result.ok) return result;
      }
      if (body.api_item_id != null) return validWhen(positiveInteger(body.api_item_id, "api_item_id"));
      return { ok: true, value: undefined };
    }
    case "api_req_kaisou/powerup": {
      const ship = positiveInteger(body.api_id, "api_id");
      if (!ship.ok) return ship;
      return validWhen(positiveIntegerList(body.api_id_items, "api_id_items"));
    }
    case "api_req_air_corps/set_plane": {
      for (const result of [
        positiveInteger(body.api_area_id, "api_area_id"),
        positiveInteger(body.api_base_id, "api_base_id"),
        boundedInteger(body.api_squadron_id, "api_squadron_id", 1, 4),
        boundedInteger(body.api_item_id, "api_item_id", -1, MAX_INSTANCE_ID)
      ]) {
        if (!result.ok) return result;
      }
      return { ok: true, value: undefined };
    }
    case "api_req_air_corps/set_action": {
      for (const result of [
        positiveInteger(body.api_area_id, "api_area_id"),
        positiveInteger(body.api_base_id, "api_base_id"),
        oneOfIntegers(body.api_action_kind, "api_action_kind", [0, 1, 2, 3, 4] as const)
      ]) {
        if (!result.ok) return result;
      }
      return { ok: true, value: undefined };
    }
    case "api_req_air_corps/supply": {
      const area = positiveInteger(body.api_area_id, "api_area_id");
      if (!area.ok) return area;
      return validWhen(positiveInteger(body.api_base_id, "api_base_id"));
    }
    case "api_req_air_corps/change_name": {
      for (const result of [
        positiveInteger(body.api_area_id, "api_area_id"),
        positiveInteger(body.api_base_id, "api_base_id"),
        requiredText(body.api_name, "api_name", 20),
        requiredApiVersion(body.api_verno)
      ]) {
        if (!result.ok) return result;
      }
      return { ok: true, value: undefined };
    }
    case "api_req_air_corps/cond_recovery": {
      for (const result of [
        positiveInteger(body.api_area_id, "api_area_id"),
        positiveInteger(body.api_base_id, "api_base_id"),
        requiredApiVersion(body.api_verno)
      ]) {
        if (!result.ok) return result;
      }
      return { ok: true, value: undefined };
    }
    case "api_req_air_corps/change_deployment_base": {
      for (const result of [
        positiveInteger(body.api_area_id, "api_area_id"),
        positiveInteger(body.api_base_id, "api_base_id"),
        positiveInteger(body.api_base_id_src, "api_base_id_src"),
        positiveInteger(body.api_item_id, "api_item_id"),
        boundedInteger(body.api_squadron_id, "api_squadron_id", 1, 4),
        requiredApiVersion(body.api_verno)
      ]) {
        if (!result.ok) return result;
      }
      return { ok: true, value: undefined };
    }
    case "api_req_air_corps/expand_base":
    case "api_req_air_corps/expand_maintenance_level": {
      const area = positiveInteger(body.api_area_id, "api_area_id");
      if (!area.ok) return area;
      return requiredApiVersion(body.api_verno);
    }
    case "api_req_practice/change_matching_kind": {
      const kind = oneOfIntegers(body.api_selected_kind, "api_selected_kind", [1, 2, 3] as const);
      if (!kind.ok) return kind;
      return requiredApiVersion(body.api_verno);
    }
    case "api_port/airCorpsCondRecoveryWithTimer": {
      const area = positiveInteger(body.api_area_id, "api_area_id");
      if (!area.ok) return area;
      return validWhen(positiveInteger(body.api_base_id, "api_base_id"));
    }
    case "api_req_member/set_friendly_request": {
      const flag = oneOfIntegers(body.api_request_flag, "api_request_flag", [0, 1] as const);
      if (!flag.ok) return flag;
      return validWhen(oneOfIntegers(body.api_request_type, "api_request_type", [0, 1, 2] as const));
    }
    case "api_req_member/set_oss_condition": {
      const language = oneOfIntegers(body.api_language_type, "api_language_type", [0, 1] as const);
      if (!language.ok) return language;
      for (let index = 0; index < 4; index += 1) {
        const item = oneOfIntegers(body[`api_oss_items[${index}]`], `api_oss_items[${index}]`, [0, 1] as const);
        if (!item.ok) return item;
      }
      return { ok: true, value: undefined };
    }
    default:
      return { ok: true, value: undefined };
  }
}

export function positiveInteger(value: unknown, field: string): ParseResult<number> {
  if (typeof value !== "string" && typeof value !== "number") {
    return invalid(field, "is required");
  }
  const text = String(value).trim();
  if (!/^[1-9]\d*$/.test(text)) return invalid(field, "must be a positive integer");
  const parsed = Number(text);
  if (!Number.isSafeInteger(parsed) || parsed > MAX_INSTANCE_ID) {
    return invalid(field, `must be at most ${MAX_INSTANCE_ID}`);
  }
  return { ok: true, value: parsed };
}

export function nonNegativeInteger(value: unknown, field: string): ParseResult<number> {
  if (typeof value !== "string" && typeof value !== "number") {
    return invalid(field, "is required");
  }
  const text = String(value).trim();
  if (!/^(0|[1-9]\d*)$/.test(text)) return invalid(field, "must be a non-negative integer");
  const parsed = Number(text);
  if (!Number.isSafeInteger(parsed) || parsed > MAX_INSTANCE_ID) {
    return invalid(field, `must be at most ${MAX_INSTANCE_ID}`);
  }
  return { ok: true, value: parsed };
}

export function boundedInteger(
  value: unknown,
  field: string,
  minimum: number,
  maximum: number
): ParseResult<number> {
  if (typeof value !== "string" && typeof value !== "number") return invalid(field, "is required");
  const text = String(value).trim();
  if (!/^-?(0|[1-9]\d*)$/.test(text)) return invalid(field, "must be an integer");
  const parsed = Number(text);
  if (!Number.isSafeInteger(parsed) || parsed < minimum || parsed > maximum) {
    return invalid(field, `must be between ${minimum} and ${maximum}`);
  }
  return { ok: true, value: parsed };
}

export function positiveIntegerList(value: unknown, field: string): ParseResult<number[]> {
  if (value == null || value === "") return invalid(field, "is required");
  const entries = Array.isArray(value) ? value : String(value).split(",");
  if (entries.length === 0) return invalid(field, "must contain at least one id");

  const ids: number[] = [];
  const seen = new Set<number>();
  for (const entry of entries) {
    const parsed = positiveInteger(entry, field);
    if (!parsed.ok) return parsed;
    if (seen.has(parsed.value)) return invalid(field, "must not contain duplicate ids");
    seen.add(parsed.value);
    ids.push(parsed.value);
  }
  return { ok: true, value: ids };
}

export function oneOfIntegers<const T extends readonly number[]>(
  value: unknown,
  field: string,
  allowed: T
): ParseResult<T[number]> {
  const parsed = nonNegativeInteger(value, field);
  if (!parsed.ok) return parsed;
  if (!allowed.includes(parsed.value)) {
    return invalid(field, `must be one of ${allowed.join(", ")}`);
  }
  return { ok: true, value: parsed.value as T[number] };
}

function invalid(field: string, message: string): ParseResult<never> {
  return { ok: false, error: `${field} ${message}` };
}

function validWhen(result: ParseResult<unknown>): ParseResult<undefined> {
  return result.ok ? { ok: true, value: undefined } : result;
}

function requiredApiVersion(value: unknown): ParseResult<undefined> {
  if (
    (typeof value !== "string" && typeof value !== "number") ||
    String(value).trim().length === 0
  ) {
    return invalid("api_verno", "is required");
  }
  return { ok: true, value: undefined };
}

function requiredText(value: unknown, field: string, maximumLength: number): ParseResult<string> {
  if (typeof value !== "string") return invalid(field, "is required");
  const normalized = value.trim();
  if (!normalized) return invalid(field, "is required");
  if (Array.from(normalized).length > maximumLength) return invalid(field, `must contain at most ${maximumLength} characters`);
  return { ok: true, value: normalized };
}

function normalizePath(path: string) {
  return path.replace(/^\/+/, "").replace(/^kcsapi\//, "").replace(/\/+$/, "");
}
