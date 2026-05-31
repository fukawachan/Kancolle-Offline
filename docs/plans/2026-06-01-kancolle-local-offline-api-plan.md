# Kancolle Local Offline API Plan

> Scope: personal learning and local experimentation only. Do not redistribute copyrighted client assets, art, music, voice files, or extracted game data.

## Goal

Build a local web version that keeps the cached HTML5 client as the primary UI, serves cached static resources from disk, and implements enough local `/kcsapi` endpoints for the client to boot, enter port, mutate local save state, and gradually support sortie and battle flows.

## Cache Findings

The cache is not a normal source tree. It is mostly a captured production asset tree:

- `cache/gadget_html5/js/*.js`: launcher/login shell. This is readable JavaScript.
- `cache/kcs2/js/main.js`: main HTML5 client bundle, about 10.9 MB, heavily obfuscated.
- `cache/kcs2/resources/**`: game runtime assets: ships, equipment, maps, furniture, BGM, SE, voices, gauges.
- `cache/kcs2/img/**`: UI atlases and title/port/battle images listed in `cache/cached.json`.
- `cache/kcs/sound/**`: voice/audio files with hashed ship voice directories.
- `cache/cached.json`: manifest of 63,434 cached URLs, including last-modified, length, and cache hints.

Important detail: `cache/kcs2/hc.html` is an empty shell, and the cached tree does not include a full `kcs2/index.php`. The launcher code in `cache/gadget_html5/js/kcs_login.js` expects to navigate to:

```text
kcs2/index.php?api_root=/kcsapi&voice_root=/kcs/sound&osapi_root=...&version=...&api_token=...&api_starttime=...
```

So the local project should generate or serve a compatible local `kcs2/index.php`/HTML bootstrap that loads `kcs2/js/main.js` and passes the same query parameters.

## API Discovery Method

Readable launcher code directly references:

- `kcsapi/api_world/get_id/:viewerId/1/:timestamp`
- `kcsapi/api_auth_member/dmmlogin/:viewerId/1/:timestamp`

The main bundle stores endpoint strings in an obfuscated string table. After evaluating only the string table and decoder, the following endpoint families appear in the client:

- `api_start2/*`
- `api_port/*`
- `api_get_member/*`
- `api_req_*/*`
- `api_dmm_payment/paycheck`

This document prioritizes endpoints by what is needed to get a local client running, not by how many strings appear in the bundle.

## Recommended Architecture

Use a TypeScript local server:

- HTTP server: Fastify or Hono.
- Static assets: serve `cache/` by URL path, with MIME overrides for JSON, PNG, MP3, M4A, OGG, WOFF2, and atlas files.
- Save state: SQLite with `better-sqlite3`.
- Schemas: Zod for API response/request validation.
- Debug tooling: a request recorder that logs every unknown `/kcsapi/*` path, parameters, and response shape.
- Browser verification: Playwright to confirm boot, title screen, port screen, and later sortie flows.

The guiding design should be:

```text
cached client -> local static server -> local /kcsapi emulator -> SQLite save state
```

Do not rewrite the main game UI at first. The fastest learning path is to make the original cached HTML5 client believe it is talking to a compatible server.

## Response Envelope

Most Kancolle API responses use a common envelope:

```json
{
  "api_result": 1,
  "api_result_msg": "成功",
  "api_data": {}
}
```

The local server should centralize this response wrapper. It should also support the client convention where responses may be prefixed by `svdata=` in some Kancolle tooling and captures. If the cached client expects one style, use that style consistently; keep the serializer configurable while bootstrapping.

## API Priority

### P0: Bootstrap And Login

These endpoints get the launcher into the HTML5 client.

| Endpoint | Purpose | Local behavior |
| --- | --- | --- |
| `GET /kcsapi/api_world/get_id/:viewerId/1/:timestamp` | Select world server | Return a fixed local world id, for example `api_world_id: 1`. |
| `GET /kcsapi/api_auth_member/dmmlogin/:viewerId/1/:timestamp` | Issue login token | Return `api_token` and `api_starttime`. Token can be a local session id. |
| `GET /kcs2/index.php?...` | Client bootstrap | Serve local HTML that loads `cache/kcs2/js/main.js` with query params intact. |
| `GET /kcs2/version.json` | Version probe | Serve cached file as-is. |
| `GET /kcs2/js/main.js` | Main client bundle | Serve cached file as-is. |
| `GET /kcs2/**`, `/kcs/**`, `/gadget_html5/**` | Static resources | Serve from `cache/` by original path. |

Exit criteria:

- Browser opens the local launcher.
- The client JS loads without 404s for core scripts.
- Unknown API logger starts recording the next missing `/kcsapi` endpoint.

### P1: Master Data And Port Entry

These are the minimum endpoints for title screen and mother port.

| Endpoint | Purpose | Notes |
| --- | --- | --- |
| `POST /kcsapi/api_start2/getData` | Master data | Must return `api_mst_ship`, `api_mst_slotitem`, `api_mst_stype`, `api_mst_mission`, `api_mst_maparea`, `api_mst_mapinfo`, `api_mst_furniture`, `api_mst_useitem`, `api_mst_payitem`, `api_mst_bgm`, `api_mst_mapbgm`, `api_mst_const`, and related master tables used by the UI. |
| `POST /kcsapi/api_start2/get_option_setting` | Client/user settings | Return BGM/SE/voice volume and UI options. |
| `POST /kcsapi/api_port/port` | Main port aggregate | Return current basic profile, ships, decks, materials, docks, missions, quests, furniture, and flags. |
| `POST /kcsapi/api_get_member/require_info` | Initial member bundle | Return selected member info required after start/port. |
| `POST /kcsapi/api_get_member/basic` | Admiral profile | Nickname, level, resources caps, comment, tutorial progress. |
| `POST /kcsapi/api_get_member/material` | Resources | Fuel, ammo, steel, bauxite, instant repair, instant build, dev material, screws. |
| `POST /kcsapi/api_get_member/deck` | Fleet list | Four deck records minimum. |
| `POST /kcsapi/api_get_member/ship2` | Owned ships | Full owned ship list plus deck associations. |
| `POST /kcsapi/api_get_member/slot_item` | Owned equipment | Equipment inventory. |
| `POST /kcsapi/api_get_member/unsetslot` | Unequipped slot groups | Needed by equipment UI. |
| `POST /kcsapi/api_get_member/useitem` | Owned consumables | Buckets, dev mats, furniture boxes, special items. |
| `POST /kcsapi/api_get_member/furniture` | Owned furniture | Return starter furniture set. |
| `POST /kcsapi/api_get_member/kdock` | Build docks | Empty dock state is enough initially. |
| `POST /kcsapi/api_get_member/ndock` | Repair docks | Empty dock state is enough initially. |
| `POST /kcsapi/api_get_member/questlist` | Quests | Empty or starter quest pages. |
| `POST /kcsapi/api_get_member/mapinfo` | Map progress | World/map unlock and HP gauge data. |
| `POST /kcsapi/api_get_member/mission` | Expedition state | Expedition definitions/progress. |
| `POST /kcsapi/api_get_member/preset_deck` | Preset fleets | Can return empty. |
| `POST /kcsapi/api_get_member/preset_slot` | Preset equipment | Can return empty. |
| `POST /kcsapi/api_get_member/payitem` | Paid items | Return empty local-only inventory. |
| `POST /kcsapi/api_get_member/record` | Player records | Basic statistics. |
| `POST /kcsapi/api_get_member/picture_book` | Album state | Can return starter/empty state. |
| `POST /kcsapi/api_get_member/practice` | Practice opponents | Can return empty or local dummy opponents. |
| `POST /kcsapi/api_get_member/sortie_conditions` | Sortie restrictions | Return permissive defaults for normal maps. |
| `POST /kcsapi/api_get_member/chart_additional_info` | UI supplemental info | Return empty/default if requested. |

Exit criteria:

- The client reaches the port screen.
- Ship list, equipment list, materials, furniture, and docks render without crashes.
- Repeated refresh returns the same local save state.

### P2: Basic Port Mutations

These endpoints make the port screen interactive without implementing combat.

| Endpoint | Domain | Local behavior |
| --- | --- | --- |
| `api_req_init/nickname` | Tutorial | Set local nickname. |
| `api_req_init/firstship` | Tutorial | Grant selected starter ship. |
| `api_req_member/updatecomment` | Profile | Update admiral comment. |
| `api_req_member/updatedeckname` | Fleet | Rename a deck. |
| `api_req_member/update_tutorial_progress` | Tutorial | Store progress flag. |
| `api_req_member/set_option_setting` | Settings | Store client options. |
| `api_req_member/set_flagship_position` | Fleet | Store flagship display/position setting. |
| `api_req_hensei/change` | Fleet | Move ships in/out of deck slots. |
| `api_req_hensei/lock` | Fleet | Lock/unlock ships. |
| `api_req_hensei/combined` | Fleet | Enable/disable combined fleet, can stub until combat. |
| `api_req_hokyu/charge` | Supply | Consume resources and refill fuel/ammo/plane counts. |
| `api_req_kaisou/slotset` | Equipment | Equip item into normal slot. |
| `api_req_kaisou/slotset_ex` | Equipment | Equip item into expansion slot. |
| `api_req_kaisou/unsetslot_all` | Equipment | Remove all equipment from a ship. |
| `api_req_kaisou/slot_exchange_index` | Equipment | Reorder equipped slots. |
| `api_req_kaisou/slot_deprive` | Equipment | Move equipment from one ship to another. |
| `api_req_kaisou/lock` | Equipment | Lock/unlock equipment. |
| `api_req_kaisou/powerup` | Modernization | Consume ships and update stats. Simplify at first. |
| `api_req_kaisou/remodeling` | Remodel | Convert ship to next master id if requirements met. |
| `api_req_quest/start` | Quest | Mark quest active. |
| `api_req_quest/stop` | Quest | Mark quest inactive. |
| `api_req_quest/clearitemget` | Quest | Claim rewards and update materials/items. |
| `api_req_furniture/change` | Furniture | Change room furniture. |
| `api_req_furniture/buy` | Furniture | Spend furniture coins and add item. |
| `api_req_furniture/music_list` | Furniture/BGM | Return available port BGM. |
| `api_req_furniture/music_play` | Furniture/BGM | Preview BGM. |
| `api_req_furniture/set_portbgm` | Furniture/BGM | Store selected port BGM. |
| `api_req_furniture/radio_play` | Furniture/BGM | Can stub with success. |

Exit criteria:

- Player can edit fleets and equipment.
- Supply, lock, quest start/stop, and furniture changes persist.
- Client does not need any battle endpoint for the main port loop.

### P3: Docks, Arsenal, Items, And Expeditions

These implement the rest of the non-combat economy.

| Endpoint | Domain | Local behavior |
| --- | --- | --- |
| `api_req_nyukyo/start` | Repair | Put ship in repair dock, charge resources. |
| `api_req_nyukyo/speedchange` | Repair | Spend bucket and complete repair. |
| `api_req_nyukyo/open_new_dock` | Repair | Spend item/currency or stub local unlock. |
| `api_req_kousyou/createitem` | Arsenal | Craft equipment from recipe. |
| `api_req_kousyou/destroyitem2` | Arsenal | Scrap equipment for materials. |
| `api_req_kousyou/createship` | Shipbuilding | Start construction. |
| `api_req_kousyou/createship_speedchange` | Shipbuilding | Complete construction. |
| `api_req_kousyou/getship` | Shipbuilding | Claim built ship. |
| `api_req_kousyou/destroyship` | Shipbuilding | Scrap ship. |
| `api_req_kousyou/open_new_dock` | Shipbuilding | Unlock build dock or stub. |
| `api_req_kousyou/remodel_slotlist` | Improvement | Return improvable equipment. |
| `api_req_kousyou/remodel_slotlist_detail` | Improvement | Return improvement details. |
| `api_req_kousyou/remodel_slot` | Improvement | Upgrade equipment. Simplify first. |
| `api_req_mission/start` | Expedition | Start expedition timer. |
| `api_req_mission/result` | Expedition | Resolve rewards. |
| `api_req_mission/return_instruction` | Expedition | Recall expedition. |
| `api_req_member/itemuse` | Items | Use consumable item. |
| `api_req_member/itemuse_cond` | Items | Morale/condition item use. |
| `api_req_member/payitemuse` | Items | Paid item use; local-only empty/stub. |
| `api_req_member/get_incentive` | Rewards | Claim login/event incentives; can return empty. |
| `api_req_member/get_event_selected_reward` | Rewards | Event reward choice; stub until event maps. |

Exit criteria:

- Repair, construction, scrapping, crafting, and expeditions work against SQLite state.
- Time-based actions can be completed naturally or through a local debug shortcut.

### P4: Sortie And Normal Battle

These are needed for the core gameplay loop.

| Endpoint | Domain | Local behavior |
| --- | --- | --- |
| `api_req_map/start` | Sortie | Validate deck, consume fuel/ammo, choose first node. |
| `api_req_map/next` | Sortie | Move to next node, resolve events, select battle/resource node. |
| `api_req_sortie/battle` | Battle | Generate day battle result. |
| `api_req_battle_midnight/battle` | Battle | Generate night battle result. |
| `api_req_battle_midnight/sp_midnight` | Battle | Special night battle variant. |
| `api_req_sortie/night_to_day` | Battle | Night-to-day battle variant. |
| `api_req_sortie/airbattle` | Battle | Air battle node. |
| `api_req_sortie/ld_airbattle` | Battle | Long-distance air battle. |
| `api_req_sortie/ld_shooting` | Battle | Long-distance shooting node. |
| `api_req_sortie/battleresult` | Battle result | Apply damage, MVP, drops, EXP, map progress. |
| `api_req_sortie/goback_port` | Sortie | Return to port from sortie. |
| `api_req_map/anchorage_repair` | Sortie support | Anchorage repair node. |
| `api_req_map/select_eventmap_rank` | Event map | Stub until event support. |
| `api_req_map/start_air_base` | Air base sortie | Stub or return unsupported until air base is implemented. |

Exit criteria:

- A single normal map can be completed from sortie start to result.
- Battle response shapes match the client well enough for animations and result screens.
- Damage, fuel/ammo, EXP, drops, and map progress persist.

### P5: Combined Fleet, Practice, Air Base, Events, And Optional Systems

These are large subsystems and should wait until normal sortie is stable.

Combined fleet:

- `api_req_combined_battle/battle`
- `api_req_combined_battle/battle_water`
- `api_req_combined_battle/each_battle`
- `api_req_combined_battle/each_battle_water`
- `api_req_combined_battle/airbattle`
- `api_req_combined_battle/ld_airbattle`
- `api_req_combined_battle/ld_shooting`
- `api_req_combined_battle/midnight_battle`
- `api_req_combined_battle/sp_midnight`
- `api_req_combined_battle/ec_battle`
- `api_req_combined_battle/ec_midnight_battle`
- `api_req_combined_battle/ec_night_to_day`
- `api_req_combined_battle/battleresult`
- `api_req_combined_battle/goback_port`

Air base:

- `api_req_air_corps/change_name`
- `api_req_air_corps/set_plane`
- `api_req_air_corps/set_action`
- `api_req_air_corps/supply`
- `api_req_air_corps/cond_recovery`
- `api_req_air_corps/change_deployment_base`
- `api_req_air_corps/expand_base`
- `api_req_air_corps/expand_maintenance_level`
- `api_port/airCorpsCondRecoveryWithTimer`

Practice:

- `api_req_member/get_practice_enemyinfo`
- `api_req_practice/battle`
- `api_req_practice/midnight_battle`
- `api_req_practice/battle_result`
- `api_req_practice/change_matching_kind`

Preset management:

- `api_req_hensei/preset_register`
- `api_req_hensei/preset_select`
- `api_req_hensei/preset_delete`
- `api_req_hensei/preset_expand`
- `api_req_hensei/preset_lock`
- `api_req_hensei/preset_order_change`
- `api_req_kaisou/preset_slot_register`
- `api_req_kaisou/preset_slot_select`
- `api_req_kaisou/preset_slot_delete`
- `api_req_kaisou/preset_slot_expand`
- `api_req_kaisou/preset_slot_update_name`
- `api_req_kaisou/preset_slot_update_lock`
- `api_req_kaisou/preset_slot_update_exslot_flag`
- `api_req_kaisou/can_preset_slot_select`

Optional/social/payment/ranking:

- `api_dmm_payment/paycheck`: return local failure or disabled state.
- `api_req_member/set_friendly_request`: local setting only.
- `api_req_member/set_oss_condition`: local setting only.
- `api_req_ranking/mxltvkpyuklh`: ranking data; can be disabled.

## Data Model Plan

Start with small, explicit tables:

- `players`: id, nickname, level, comment, tutorial progress, options JSON.
- `materials`: player id, fuel, ammo, steel, bauxite, repair kits, build kits, dev mats, screws.
- `ships`: instance id, master id, level, exp, hp, condition, fuel, ammo, locked, slot ids, ex slot id, stats JSON.
- `slot_items`: instance id, master id, level, proficiency, locked.
- `decks`: deck id, name, mission state, ship instance ids.
- `repair_docks`: dock id, ship id, complete time.
- `build_docks`: dock id, recipe, result master id, complete time.
- `quests`: quest id, active, progress, completed.
- `furniture`: owned furniture ids and selected room layout.
- `maps`: map id, unlocked, cleared, gauge state.
- `sortie_sessions`: active sortie state, current map/node, selected deck, battle seed.

Store large master data as JSON files first, not SQLite rows. The master data can later be normalized if queries become painful.

## Development Roadmap

### Phase 1: Static Server And Unknown API Recorder

Deliverables:

- Local server serving `cache/` under original URL paths.
- Local bootstrap for `kcs2/index.php`.
- `/kcsapi/*` catch-all that logs unknown path, method, query/body, and returns a clear local error envelope.
- Playwright smoke test that checks the local page loads `main.js`.

### Phase 2: Login And Start2

Deliverables:

- World id and login token endpoints.
- `api_start2/getData` with a minimal but structurally valid master-data fixture.
- `api_start2/get_option_setting`.
- Schema tests for response envelopes and master-data fields.

### Phase 3: Port Screen MVP

Deliverables:

- SQLite schema and seed save.
- `api_port/port`.
- Core `api_get_member/*` endpoints for profile, ships, decks, slots, materials, docks, quests, map info, furniture, and items.
- Browser test: boot to port and verify no unknown P0/P1 API calls remain.

### Phase 4: Port Interactions

Deliverables:

- Fleet changes, equipment changes, supply, locks, comments, deck names, options, quest start/stop.
- Persistence tests around each mutation endpoint.
- Browser test: edit fleet/equipment, refresh, confirm persisted state.

### Phase 5: Economy Systems

Deliverables:

- Repair docks.
- Construction docks.
- Crafting and scrapping.
- Expeditions.
- Item use.
- Deterministic local recipe tables or simplified fixture-based outcomes.

### Phase 6: First Sortie Loop

Deliverables:

- One normal map with fixed node graph.
- `api_req_map/start`, `api_req_map/next`, `api_req_sortie/battle`, `api_req_battle_midnight/battle`, `api_req_sortie/battleresult`, `api_req_sortie/goback_port`.
- Deterministic battle simulator seeded by sortie session id.
- Browser test: sortie, battle, result, return to port.

### Phase 7: Expansion Systems

Deliverables:

- More maps and enemy fleets.
- Air battle variants.
- Combined fleet.
- Air base.
- Practice.
- Preset decks/equipment.
- Event-map rank and gauge mechanics.

## Testing Strategy

Use three layers:

1. Schema tests: every endpoint response validates against a Zod schema and the shared envelope.
2. State transition tests: mutation endpoints update SQLite state exactly once and are deterministic.
3. Browser smoke tests: Playwright records network calls and fails if an unexpected `/kcsapi/*` endpoint appears for the current phase.

The most useful early test is an "unknown API budget": P1 is not done until the port screen generates zero unknown P0/P1 calls.

## Risks And Open Questions

- The exact response shape is more important than endpoint names. Some endpoints are easy to name but hard to satisfy because the client expects many nested fields.
- `main.js` is obfuscated and bundled; static string extraction gives endpoint names but not all call order or required request parameters.
- `api_start2/getData` is the largest early blocker because it must provide master data consistent with cached resource filenames.
- Voice and ship art resource names are partly hashed; master data must reference the same filename ids expected by `cache/kcs2/resources/**` and `cache/kcs/sound/**`.
- Some flows may expect `svdata=` response prefix or signed/token parameters. Keep request parsing and response serialization configurable.

## Immediate Next Step

Build the Phase 1 server and recorder first. Once the client can load locally and log unknown API calls, use the live request order to refine P1 response shapes. This avoids guessing the entire game protocol up front and turns the cached client into the test harness.
