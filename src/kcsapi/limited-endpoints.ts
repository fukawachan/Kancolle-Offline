export type LimitedEndpointDisposition =
  | "implemented-stateful"
  | "implemented-read"
  | "offline-empty"
  | "compatibility-noop";

export type LimitedEndpointContract = Readonly<{
  path: string;
  disposition: LimitedEndpointDisposition;
  responseFields: readonly string[];
  stateEffect: string;
}>;

/**
 * Finite protocol surface called out by the parity audit. Keeping it as an
 * executable catalog prevents a constant response from silently drifting back
 * into an undocumented placeholder.
 */
export const LIMITED_ENDPOINT_CONTRACTS: readonly LimitedEndpointContract[] = Object.freeze([
  contract("api_get_member/sortie_conditions", "offline-empty", ["api_sortie_conditions", "api_mission_conditions"], "No server-wide sortie restriction is configured."),
  contract("api_port/airCorpsCondRecoveryWithTimer", "implemented-stateful", ["api_plane_info", "api_distance"], "Explicitly settles time-based LBAS condition and returns the selected base."),
  contract("api_req_furniture/music_play", "implemented-read", ["api_coin"], "Local jukebox masters have api_use_coin=0; inventory is unchanged."),
  contract("api_req_furniture/radio_play", "compatibility-noop", ["api_id"], "The cached radio animation consumes no response state."),
  contract("api_req_map/anchorage_repair", "offline-empty", ["api_used_ship", "api_ship_data", "api_repair_ships"], "Anchorage repair is intentionally unavailable in the offline rules profile."),
  contract("api_req_member/get_event_selected_reward", "offline-empty", ["api_get_item_list"], "No production event package is active."),
  contract("api_req_member/get_incentive", "offline-empty", ["api_item"], "No remote login-incentive service is configured."),
  contract("api_req_member/itemuse_cond", "compatibility-noop", ["api_caution_flag"], "The cached client ignores this response and itemuse performs the authoritative check."),
  contract("api_req_member/set_friendly_request", "implemented-stateful", [], "Persists api_request_flag and api_request_type in player options."),
  contract("api_req_member/set_oss_condition", "implemented-stateful", [], "Persists four OSS filters and language selection in player options."),
  contract("api_req_kousyou/open_new_dock", "implemented-stateful", ["api_opened"], "Consumes one dock key and creates one construction dock atomically."),
  contract("api_req_nyukyo/open_new_dock", "implemented-stateful", ["api_opened"], "Consumes one dock key and creates one repair dock atomically.")
]);

function contract(
  path: string,
  disposition: LimitedEndpointDisposition,
  responseFields: readonly string[],
  stateEffect: string
): LimitedEndpointContract {
  return Object.freeze({ path, disposition, responseFields: Object.freeze([...responseFields]), stateEffect });
}
