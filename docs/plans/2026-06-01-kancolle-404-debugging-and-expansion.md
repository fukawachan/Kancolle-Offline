# Kancolle 404 Debugging And Expansion Guide

> Scope: local learning and offline experimentation only. Do not redistribute cached client assets, art, music, voice files, or extracted game data.

## Short Answer

Many browser console messages like `Failed to load resource: the server responded with a status of 404 (Not Found)` are expected at this stage. The cached Kancolle HTML5 client is a production bundle. It probes many optional assets, world-specific images, ship/furniture variants, voice files, feature flags, social/payment endpoints, and late-game systems that the local server may not yet emulate.

A large number of static 404s is not automatically a blocker. A 404 is only urgent when it prevents a target workflow from completing, causes a JavaScript exception, produces an unknown `/kcsapi/*` entry, or leaves visible UI broken in the current milestone.

Use this rule:

- If the port UI loads, no fresh JavaScript errors appear, and `.local/unknown-api.jsonl` is empty for the workflow, the remaining static 404s are backlog items.
- If a click or screen transition stalls, first inspect the newest 404s and API calls from that exact action.
- If a `/kcsapi/*` request is unknown, treat it as higher priority than a missing static image or audio file.

## Current Baseline

The local app currently has these pieces:

- Fastify server with local `kcs2/index.php` bootstrap.
- Static serving from `cache/` under original URL paths.
- Local vendor runtime scripts for PIXI, CreateJS, Axios, and Howler.
- `/kcsapi/*` handler map with local envelopes.
- SQLite save state for player, materials, ships, equipment, decks, docks, quests, furniture, maps, and sortie sessions.
- PNG fallbacks for legacy title JPG paths.
- World-image fallback for host-derived world resource names.
- Tests for bootstrap, static serving, API envelope, local state persistence, and planned API handler coverage.

This is enough for a local port MVP, not enough to guarantee zero browser 404s.

## What 404s Usually Mean

### Category A: Harmless Static Probes

These are common and often safe to defer:

- Missing optional title, banner, or campaign images.
- Missing seasonal furniture variants.
- Missing ship image variants not used by the seeded save.
- Missing voice or sound files when voice is disabled or the UI continues.
- Missing map/world image variants where a fallback already lets the screen render.

Keep these in a backlog unless they are visible in the current workflow.

### Category B: Static Assets That Break A Screen

These need investigation when they leave visible blank UI or stop a transition:

- Required texture atlases: `.json` plus matching `.png`.
- Port skin assets.
- Furniture assets selected by the save state.
- Ship full/card/banner images referenced by seeded master data.
- Map assets for the currently selected sortie map.
- Battle UI atlases when entering combat.

For these, the fix is usually either:

1. Change seeded/master data to reference cached asset IDs that exist.
2. Add a narrow fallback resolver for that asset family.
3. Serve an explicit local placeholder only if the client accepts it.

### Category C: Unknown API Calls

These are more important than static 404s. The local server records unknown API calls in:

```text
.local/unknown-api.jsonl
```

Any fresh line in that file means the client asked for a server behavior the emulator does not yet support. Unknown APIs should become tests first, then handlers.

### Category D: JavaScript Runtime Errors

Console errors are more important than resource 404s. A missing resource is sometimes recoverable. A runtime exception usually means the client reached an invalid state or received an incompatible response shape.

Examples to treat as blockers:

- `TypeError`
- `ReferenceError`
- unhandled promise rejection
- audio or loader callback that never completes
- screen remains stuck after an API response

## First Triage Checklist

Run this every time a new UI action appears broken.

- [ ] Start from a fresh server.

```bash
npm start
```

- [ ] Open the local client with explicit roots.

```text
http://127.0.0.1:3000/kcs2/index.php?api_root=/kcsapi&voice_root=/kcs/sound&api_token=local&api_starttime=123
```

If the server uses another port, replace `3000` with the actual port printed by `npm start`.

- [ ] Clear the browser console before reproducing the action.
- [ ] Open the Network panel and enable `Preserve log`.
- [ ] Reproduce exactly one action, such as entering port, opening fleet, opening remodel, starting sortie, or entering battle.
- [ ] Export or copy the failed request list.
- [ ] Check whether `.local/unknown-api.jsonl` changed.
- [ ] Record the first JavaScript error, not only the last 404.
- [ ] Decide whether the blocker is API shape, missing static asset, client bootstrap, or save/master-data mismatch.

## Useful Local Commands

Check unknown API calls:

```bash
test -f .local/unknown-api.jsonl && tail -n 50 .local/unknown-api.jsonl
```

List recent local artifacts:

```bash
find .local -maxdepth 2 -type f -print
```

Check whether a missing request path exists in the cache:

```bash
test -f "cache/PATH_FROM_BROWSER_WITHOUT_LEADING_SLASH" && echo exists || echo missing
```

Search for nearby cached variants:

```bash
rg --files cache | rg 'ship|furniture|world|port|battle'
```

Run the verification suite:

```bash
npm test
npm run typecheck
```

Smoke-test a specific static path:

```bash
curl -I "http://127.0.0.1:3000/kcs2/version.json"
```

Smoke-test a specific API path:

```bash
curl -sS -X POST "http://127.0.0.1:3000/kcsapi/api_port/port" | head
```

## How To Classify A 404

For each 404, capture:

- URL path.
- HTTP method.
- Screen or action that triggered it.
- Whether there is a matching console exception.
- Whether the request is static or `/kcsapi/*`.
- Whether the missing path exists in `cache/cached.json`.
- Whether a nearby asset exists under `cache/`.
- Whether the UI continues after the failure.

Use this decision table:

| Signal | Priority | Next action |
| --- | --- | --- |
| `/kcsapi/*` unknown | Highest | Add failing API test, implement response shape, verify unknown log stays quiet. |
| Runtime exception after 404 | High | Trace the first exception and request that caused it. |
| Visible blank UI area | High | Find expected atlas/image, then fix master data or fallback. |
| Audio 404 with UI continuing | Low | Defer unless it blocks callbacks or workflow. |
| Optional banner/campaign 404 | Low | Defer or map to local placeholder later. |
| Repeated same static 404 | Medium | Add a narrow fallback if noisy and safe. |

## Development Approach Options

### Recommended: Workflow-Driven Hardening

Pick one user workflow at a time and make its API calls, assets, and state transitions clean.

Order:

1. Port refresh.
2. Fleet list and fleet editing.
3. Equipment/remodel screen.
4. Supply.
5. Quest list.
6. Repair dock.
7. Construction/crafting.
8. Expedition.
9. Sortie map start.
10. Battle and result.

This keeps each improvement testable and prevents chasing thousands of optional 404s.

### Alternative: Asset Coverage Sweep

Mine `main.js`, `cache/cached.json`, and browser network logs to build a large asset fallback table.

This reduces console noise, but it can waste time on assets that no current workflow needs. Use this only after the main workflows are stable.

### Alternative: API Surface Sweep

Implement every endpoint name found in the client with placeholder envelopes.

This lowers unknown API noise, but placeholder shapes can hide real contract bugs. Use it only for optional systems where the local UI should show a disabled state.

## Recommended Milestones

### Milestone 1: Clean Port Baseline

Goal: refresh directly into port with no unknown `/kcsapi/*` calls and no JavaScript errors.

Tasks:

- [ ] Capture network log from initial load to port.
- [ ] Separate static 404s from API calls.
- [ ] Confirm `.local/unknown-api.jsonl` is empty after a fresh port load.
- [ ] Confirm required port assets load: port skin, selected furniture, flagship image, BGM.
- [ ] Add regression tests for any response-shape fix.
- [ ] Add narrow static fallback tests for any required asset family.

Done when:

- Port loads after refresh.
- Console has no runtime errors.
- Unknown API log has no fresh entries.
- Remaining 404s are documented as harmless static probes.

### Milestone 2: Port Interaction Stability

Goal: common port clicks work and persist.

Target workflows:

- Fleet rename.
- Fleet ship swap.
- Lock/unlock ship.
- Equip/unequip item.
- Supply.
- Quest start/stop.
- Furniture change.

Tasks:

- [ ] For each workflow, clear console and network log before testing.
- [ ] Capture every `/kcsapi/*` request and response.
- [ ] Add or update state transition tests.
- [ ] Verify refresh preserves the mutation.
- [ ] Record remaining static 404s that do not block the workflow.

Done when:

- Each target workflow completes once.
- Refresh preserves state.
- No unknown API is produced by those workflows.

### Milestone 3: Economy Screens

Goal: non-combat systems have usable local behavior.

Target workflows:

- Repair start and bucket completion.
- Construction start, speed build, claim ship.
- Equipment crafting.
- Ship/equipment scrapping.
- Expedition start and result.
- Item use.

Tasks:

- [ ] Make one workflow work at a time.
- [ ] Prefer deterministic local outcomes over random production-like behavior.
- [ ] Add tests around material deltas and inventory changes.
- [ ] Add UI smoke checks for each screen.

Done when:

- Economy actions mutate SQLite state exactly once.
- Materials never go negative.
- Each screen can be opened without runtime errors.

### Milestone 4: First Sortie Loop

Goal: complete one local map from sortie start to battle result and return to port.

Target API family:

- `api_req_map/start`
- `api_req_map/next`
- `api_req_sortie/battle`
- `api_req_battle_midnight/battle`
- `api_req_sortie/battleresult`
- `api_req_sortie/goback_port`

Tasks:

- [ ] Choose one map whose assets exist in `cache/`.
- [ ] Ensure master data references that map and enemy set.
- [ ] Capture browser network order for map start through result.
- [ ] Add sortie session tests.
- [ ] Add deterministic battle payload tests.
- [ ] Verify fuel/ammo, damage, EXP, drops, and map progress persist.

Done when:

- Browser can enter a sortie.
- Battle animation reaches result.
- Result returns to port.
- No unknown API appears during this one-map loop.

## Fix Patterns

### API Shape Fix

Use this sequence:

1. Capture the exact endpoint, request body, and failed client behavior.
2. Add a failing test in `tests/api.test.ts`.
3. Update serializer or handler.
4. Run the targeted test.
5. Run `npm test`.
6. Reproduce in browser.

Do not guess large response objects. Add only fields proven necessary by the client or by a known adjacent response shape.

### Static Asset Fix

Use this sequence:

1. Check whether the exact path exists under `cache/`.
2. If not, search for a nearby cached asset with the same family and suffix.
3. Prefer changing local master/seed data to reference existing cached assets.
4. If the client generates the missing path from host/world/version data, add a narrow fallback resolver in the static layer.
5. Add a server test for the fallback path.

Avoid broad catch-all image fallbacks at first. They can hide incorrect master data.

### Save Or Master-Data Mismatch Fix

Use this sequence:

1. Identify which local save value references the missing asset or invalid UI state.
2. Check `src/master/data.ts`, `src/state/store.ts`, and serializers.
3. Prefer internally consistent seed data over adding more fallbacks.
4. Add persistence tests when the value can change through UI.

## What To Log In The Development Notes

For each investigation, add a short note with this format:

```markdown
### YYYY-MM-DD - Workflow Name

- Screen/action:
- First blocking symptom:
- First JavaScript error:
- New unknown API lines:
- Static 404s that mattered:
- Static 404s deferred:
- Fix plan:
- Verification:
```

This creates a useful history and prevents re-debugging the same noisy 404s.

## Backlog

Keep these as explicit future work:

- Build a small browser-log capture script that exports console errors, failed requests, and `/kcsapi` calls for one workflow.
- Add an automated browser smoke test for direct port load.
- Add a static asset audit that compares browser 404s against `cache/cached.json`.
- Add a dashboard or CLI command to summarize `.local/unknown-api.jsonl`.
- Expand master data only when a workflow needs it.
- Replace placeholder disabled responses with real local behavior only when entering that subsystem.

## Practical Next Step

Start with Milestone 1. Reproduce a fresh direct port load, save the failed request list, and classify every 404 into harmless static probe, required static asset, unknown API, or runtime-error trigger.

Do not try to eliminate all 404s. Try to eliminate blockers for one workflow at a time.
