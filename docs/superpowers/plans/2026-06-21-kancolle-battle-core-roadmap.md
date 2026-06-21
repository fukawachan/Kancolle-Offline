# Kancolle Battle Core Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the simplified KanColle combat simulation with a testable rules engine that matches community reverse-engineered battle behavior closely enough for the HTML5 client and reproducible offline play.

**Architecture:** Keep the existing KCSAPI handler envelope stable, and move battle behavior behind a deterministic engine made of domain models, formula helpers, phase runners, and payload adapters. The first implementation pass still lives mostly in `src/kcsapi/battle.ts`; later work should split this into focused modules only after regression tests pin the current behavior.

**Tech Stack:** TypeScript, Vitest, local generated master/sortie data, deterministic `BattleRng`, existing `StateStore`/KCSAPI handler layer.

---

## Context For Future Agents

This branch is `codex/battle-core-engine` in the worktree:

```bash
/Users/dingyilin/.config/superpowers/worktrees/Kancolle/battle-core-engine
```

The original workspace has an untracked `cache/` directory. If this worktree is recreated outside the original repository and tests fail with missing cache files, create a local ignored symlink:

```bash
ln -s /Volumes/outerBrain/Projects/Kancolle/cache cache
```

Primary community references:

- KCWiki battle overview: `https://zh.kcwiki.cn/wiki/战斗`
- Aerial combat: `https://en.kancollewiki.net/Aerial_combat`
- Damage calculations: `https://en.kancollewiki.net/Damage_Calculations`
- Night battle: `https://en.kancollewiki.net/Combat/Night_Battle`
- Combined fleet: `https://en.kancollewiki.net/Combined_fleet`
- Anti-installation combat: `https://en.kancollewiki.net/Combat/Anti-Installation`

Local client field discovery notes:

- Read `Agent.md` before touching `cache/`.
- `cache/kcs2/js/main.js` is obfuscated. Decode string tables only; do not run the client bundle in Node.
- Client field evidence found so far includes `api_air_base_attack`, `api_opening_taisen`, `api_opening_atack`, `api_kouku2`, `api_stage3_combined`, `api_friendly_kouku`, `api_friendly_battle`, and combined fleet HP/parameter/slot fields.

## Current Status

Completed in this branch:

- Added battle-domain exports in `src/kcsapi/battle.ts`:
  - `BattleContext`
  - `BattleFleet`
  - `BattleUnit`
  - `BattlePhaseResult`
  - `BattleEndpointKind`
- Extended `BattleRecord.phases` with:
  - `airBaseAttack`
  - `kouku2`
  - `openingTaisen`
  - `openingAtack`
  - `friendlyKouku`
  - `friendlyBattle`
- Added formula helpers in `src/kcsapi/battle-formulas.ts`:
  - `formationModifierFor`
  - `damageStateModifierFor`
  - `nightBattlePower`
  - `antiAirStage2Shootdown`
- Expanded the phase pipeline for sortie and practice battles:
  - support
  - aerial combat
  - opening ASW placeholder/implementation for submarine targets
  - opening torpedo
  - daytime shelling round 1
  - daytime shelling round 2 when battleships are present
  - closing torpedo
- Expanded the combined fleet core:
  - main + escort fleet aerial participation
  - escort opening ASW
  - escort opening torpedo
  - basic combined shelling order by `player.combinedFleet`
  - escort closing torpedo
  - escort fleet used as the night battle force
  - `api_stage3_combined` emitted for combined aerial payloads when stage 3 exists
- Added null-safe client payload placeholders:
  - `api_air_base_attack`
  - `api_opening_taisen`
  - `api_opening_atack`
  - `api_kouku2`
  - `api_friendly_info`
  - `api_friendly_kouku`
  - `api_friendly_battle`
- Added tests in:
  - `tests/battle-formulas.test.ts`
  - `tests/battle.test.ts`

Continuation completed on 2026-06-21:

- Added battle endpoint payload contract coverage in `tests/api.test.ts`.
- Added opening ASW formula helpers and battle-level eligibility checks:
  - `canOpeningAswByStats`
  - `aswAttackPower`
  - `BattleUnit.baseAsw`
  - `BattleUnit.asw`
- Added table-driven generic AACI selection in `src/kcsapi/battle/aaci.ts`.
- Replaced inline AACI item detection with equipment summaries from `BattleUnit.equippedSlots`.
- Added generic night attack classification in `src/kcsapi/battle-formulas.ts`:
  - normal single attack
  - generic double attack
  - main gun + torpedo mixed cut-in
  - two-torpedo cut-in
- Wired night attack hit counts, modifiers, `api_sp_list`, and cut-in item snapshots into `src/kcsapi/battle.ts`.
- Commits were intentionally skipped in this continuation because the branch already had related uncommitted phase-one changes; keep reviewing/staging by file instead of assuming per-task commits exist.

Fresh verification before this document was added:

```bash
npm test
# 26 files, 232 tests passed

npm run typecheck
# tsc --noEmit passed

git diff --check
# no output
```

Latest focused verification in this continuation:

```bash
npm test -- tests/battle.test.ts tests/battle-formulas.test.ts
# 2 files, 36 tests passed

npm test -- tests/battle-aaci.test.ts tests/battle-formulas.test.ts tests/battle.test.ts tests/api.test.ts
# 4 files, 93 tests passed

npm run typecheck
# tsc --noEmit passed
```

Latest full verification after the continuation:

```bash
npm test
# 27 files, 240 tests passed

npm run typecheck
# tsc --noEmit passed

git diff --check
# no output
```

Land-target filtering continuation on 2026-06-21:

- Added explicit combat target classification:
  - `EnemyTargetKind = "surface" | "submarine" | "installation"`
  - `enemyTargetKind(masterId, shipType)`
  - `shipTargetKind(shipType)`
- Added a curated normal-map installation enemy master ID set in `src/master/enemy-classification.ts`.
- Wired `BattleUnit.targetKind` and battle-unit snapshots so sortie, practice, combined, and night-continuation paths keep the classification.
- Opening and closing torpedo target pools now allow only `targetKind === "surface"`, excluding both submarines and installations.
- Classification is ID-based; names and `stype` alone are intentionally not used because they produce false positives.

## Known Limits Of The Current Implementation

Current code is a better first-stage simulation, not a full official-server clone. Known gaps:

- AA/AACI formulas are still simplified. Generic AACI kinds 5/7/8 are table-driven, but the full ship/equipment-specific table is missing.
- Day contact, proficiency, stage 1/2 loss formulas, and airstrike damage need deeper community formula parity.
- Hit, evasion, critical, morale, fit gun, smoke, balloon, radar, searchlight, flare, and weather-like modifiers are incomplete.
- Day spotting special attacks only cover a simplified double/AP shape.
- Night battle covers generic double attack, main gun + torpedo mixed cut-in, and two-torpedo cut-in; more cut-in variants and activation rates are missing.
- Opening ASW has generic stat/equipment eligibility and base attack power, but target selection, hit rate, ship-specific exceptions, and full synergy details remain incomplete.
- Enemy combined fleets are not populated from sortie data.
- Land-based air squadron real damage is not implemented.
- Friendly fleet real logic is not implemented.
- Nelson/Nagato/Yamato Touch, event bonuses, installation special effects, and land-based target exceptions are out of phase-one scope.
- The engine types exist, but much of the implementation still lives in the large `src/kcsapi/battle.ts` file.

---

## Phase Roadmap

### Phase 0: Baseline And Client Contract

Status: complete for the current branch.

Purpose:

- Keep all public battle entry points stable:
  - `createSortieBattle`
  - `createPracticeBattle`
  - `createCombinedBattle`
  - `createNightBattle`
- Confirm current tests and typecheck pass before adding behavior.
- Decode client field names from cache only when endpoint payload shape is unclear.

Current evidence:

- `src/kcsapi/handlers.ts` still delegates to the same battle entry points.
- `BattlePayload` remains a KCSAPI-shaped record.
- New optional fields are additive.

### Phase 1: Formula Surface And Phase Skeleton

Status: partially complete.

Done:

- Shared helpers exist in `src/kcsapi/battle-formulas.ts`.
- `BattleRecord.phases` can store the main client-visible phases.
- Normal/practice/combined payloads now include legal `null` placeholders for unimplemented phases.

Still needed:

- Move more formulas out of `src/kcsapi/battle.ts` once tests protect them.
- Add explicit types for formula inputs/outputs instead of passing loose numbers through phase code.
- Separate payload adapters from phase simulation.

### Phase 2: Normal Day Battle Fidelity

Status: partially complete.

Done:

- Aerial combat runs before shelling.
- Opening torpedo runs before shelling.
- Second daytime shelling round exists when a battleship class is present.
- Closing torpedo remains after shelling.

Still needed:

- Accurate shelling order for range, carrier behavior, enemy-side restrictions, and special battle types.
- Proper target selection rules, especially submarines and invalid target classes.
- Complete hit/evasion/critical formula.
- Complete day spotting activation and attack type selection.
- More realistic damage modifiers for formation, engagement, ammo, damage state, combined fleet, and special attacks.

### Phase 3: Aerial Combat And Anti-Air

Status: partially complete.

Done:

- Fighter power and air state helper already existed.
- Stage 2 loss now calls `antiAirStage2Shootdown`.
- Basic AACI payload shape exists through `api_air_fire`.
- Generic AACI selection is table-driven for the currently covered patterns:
  - kind 5: two high-angle guns + radar
  - kind 7: high-angle gun + AA gun + radar
  - kind 8: high-angle gun + radar

Still needed:

- Full stage 1 loss ranges by air state and side.
- Full stage 2 fixed/proportional shootdown according to fleet AA, weighted AA, AACI fixed bonus, AACI modifier, and random terms.
- Full AACI table and priority rules.
- Contact selection and contact modifier parity.
- Proficiency effects for fighter power, contact, and airstrike damage.
- Combined fleet stage 3 split between main and escort where the client expects separate arrays.

### Phase 4: Opening ASW, Torpedo, And Submarine Rules

Status: partially complete.

Done:

- `api_opening_taisen` can be emitted.
- `api_opening_atack` can be emitted.
- Opening torpedo supports torpedo cruisers, submarines, submarine carriers, and midget-sub equipment.
- Opening ASW eligibility is checked with ship type, level, displayed ASW, sonar, autogyro, and equipment ASW inputs.
- Opening ASW attack power uses the community base shape: base ASW square root, equipment ASW, and sonar/depth-charge synergy.
- Opening and closing torpedo target selection excludes submarines and land-based installations through `BattleUnit.targetKind`.

Still needed:

- Ship-specific OASW exceptions and special-equipment edge cases.
- Full ASW damage modifiers, target selection, and hit rate.
- Submarine targeting rules across shelling, torpedo, night battle, and aerial phases.
- Midget-sub opening torpedo exceptions and ship-specific eligibility.

### Phase 5: Night Battle

Status: partially complete.

Done:

- Generic night double attack exists.
- Generic torpedo cut-in exists.
- Generic main gun + torpedo mixed cut-in exists.
- Combined fleet night battle uses escort fleet attackers.
- Night payload includes `api_sp_list` and `api_n_mother_list`.
- Torpedo and mixed cut-ins emit two hit damage entries and stable equipment item snapshots.

Still needed:

- Full cut-in table:
  - main gun cut-ins
  - submarine cut-ins
  - carrier night attacks if night-capable equipment exists
- Activation probabilities by luck, flagship, damage, searchlight, starshell, skilled lookout, radar, and other modifiers.
- Night contact, flare/searchlight payload fields, and equipment snapshot handling.
- Night-to-day endpoint behavior.

### Phase 6: Combined Fleet Full Rules

Status: partially complete.

Done:

- Basic `combinedFleet` type branching:
  - `1`: carrier task force basic order
  - `2`: surface task force basic order
  - `3`: transport escort basic order
- Escort participates in opening torpedo, closing torpedo, and night battle.
- Combined HP/parameter/slot payload fields remain present.

Still needed:

- Correct phase order for every combined endpoint:
  - `battle`
  - `battle_water`
  - `each_battle`
  - `each_battle_water`
  - `airbattle`
  - `ld_airbattle`
  - `ld_shooting`
  - `ec_battle`
  - `ec_night_to_day`
- Enemy combined fleets from sortie data.
- Correct target pools for main vs escort and enemy main vs enemy escort.
- Combined fleet formation modifiers.
- Combined fleet shelling accuracy and damage modifiers.
- `api_at_eflag`, attacker indexes, and mother-list semantics for all combined payload variants.

### Phase 7: Endpoint Matrix And Payload Contract Tests

Status: partially complete.

Done:

- Existing API tests cover normal battle, practice battle, combined battle loop, combined airbattle, and battle result settlement.
- New unit tests cover added payload placeholders and phase behavior.

Still needed:

- Contract tests for every battle endpoint registered in `src/kcsapi/handlers.ts`.
- Array length checks for main, escort, enemy, and enemy combined fleets.
- Index-range checks for every attacker/defender list.
- Master ID resolution checks for ship IDs and slot IDs.
- Null vs empty-array shape checks for optional phases, matching client usage.

### Phase 8: Data And Generator Support

Status: partially complete.

Needed:

- Extend `scripts/generate-sortie-data.mjs` only if local sortie data lacks fields required for real battle behavior.
- Add enemy combined fleet data if source data exposes it.
- Keep the curated installation ID set in `src/master/enemy-classification.ts` updated when new enemy master data is added.
- Optionally move installation classification into generated sortie data if the source exposes a reliable non-name field.
- Preserve the no-runtime-network rule.
- Add generator tests or snapshot checks so regenerated data remains KCSAPI-compatible.

### Phase 9: Refactor Into A Real Engine

Status: not started.

Recommended only after more behavior tests exist.

Target shape:

```text
src/kcsapi/battle/
  types.ts
  context.ts
  formulas/
    damage.ts
    air.ts
    anti-air.ts
    night.ts
    combined.ts
  phases/
    aerial.ts
    opening-asw.ts
    opening-torpedo.ts
    shelling.ts
    torpedo.ts
    night.ts
  payload/
    sortie.ts
    combined.ts
    practice.ts
  engine.ts
```

Keep `src/kcsapi/battle.ts` as a compatibility facade until all imports are migrated.

---

## Implementation Tasks

### Task 1: Add Payload Contract Tests For All Battle Endpoints

Status: completed in the 2026-06-21 continuation. Focused verification passed with `npm test -- tests/api.test.ts`; commit step skipped intentionally because related phase-one files were already uncommitted.

**Files:**

- Modify: `tests/api.test.ts`
- Read: `src/kcsapi/handlers.ts`
- Read: `Agent.md`

- [x] **Step 1: List battle endpoints**

Run:

```bash
rg -n "api_req_.*battle|api_req_sortie/(battle|airbattle|night_to_day)|api_req_practice/battle" src/kcsapi/handlers.ts
```

Expected: a list including sortie, midnight, practice, and combined battle registrations.

- [x] **Step 2: Add a contract helper to `tests/api.test.ts`**

Add this helper near the existing `post()` helper in `describe("local kcsapi endpoints", ...)`:

```ts
function expectBattlePhasePlaceholders(data: any) {
  expect(data).toHaveProperty("api_air_base_attack");
  expect(data).toHaveProperty("api_opening_taisen");
  expect(data).toHaveProperty("api_opening_atack");
  expect(data).toHaveProperty("api_kouku2");
  expect(data).toHaveProperty("api_friendly_info");
  expect(data).toHaveProperty("api_friendly_kouku");
  expect(data).toHaveProperty("api_friendly_battle");
}

function expectFixedFleetArrays(data: any) {
  for (const key of ["api_f_nowhps", "api_f_maxhps", "api_e_nowhps", "api_e_maxhps", "api_fParam", "api_eParam", "api_eSlot"]) {
    expect(data[key], key).toHaveLength(6);
  }
  expect(data.api_nowhps).toHaveLength(13);
  expect(data.api_maxhps).toHaveLength(13);
}
```

- [x] **Step 3: Add endpoint tests**

Add a test that starts a sortie and checks normal, airbattle, and combined variants:

```ts
it("keeps battle endpoint payload contracts stable for the HTML5 client", async () => {
  const akagi = store.createShip(277);
  const fighter = store.createSlotItem(20);
  const bomber = store.createSlotItem(23);
  await post("api_req_kaisou/slotset", { api_id: akagi.id, api_slot_idx: 0, api_item_id: fighter.id });
  await post("api_req_kaisou/slotset", { api_id: akagi.id, api_slot_idx: 2, api_item_id: bomber.id });
  await post("api_req_hensei/change", { api_id: 1, api_ship_idx: 0, api_ship_id: akagi.id });
  await post("api_req_map/start", { api_maparea_id: 1, api_mapinfo_no: 1, api_deck_id: 1 });
  await post("api_req_map/next");

  const sortieBattle = (await post("api_req_sortie/battle", { api_formation: 1 })).json().api_data;
  expectBattlePhasePlaceholders(sortieBattle);
  expectFixedFleetArrays(sortieBattle);

  const airBattle = (await post("api_req_sortie/airbattle", { api_formation: 1 })).json().api_data;
  expectBattlePhasePlaceholders(airBattle);
  expectFixedFleetArrays(airBattle);

  const escort = store.createShip(119);
  await post("api_req_hensei/change", { api_id: 2, api_ship_idx: 0, api_ship_id: escort.id });
  await post("api_req_hensei/combined", { api_combined_type: 1 });
  await post("api_req_map/start", { api_maparea_id: 1, api_mapinfo_no: 1, api_deck_id: 1 });
  await post("api_req_map/next");
  const combinedBattle = (await post("api_req_combined_battle/battle", { api_formation: 1 })).json().api_data;
  expectBattlePhasePlaceholders(combinedBattle);
  expectFixedFleetArrays(combinedBattle);
  expect(combinedBattle.api_f_nowhps_combined).toHaveLength(6);
  expect(combinedBattle.api_fParam_combined).toHaveLength(6);
});
```

- [x] **Step 4: Run the focused test**

Run:

```bash
npm test -- tests/api.test.ts
```

Expected: pass.

- [x] **Step 5: Commit (skipped intentionally)**

```bash
git add tests/api.test.ts
git commit -m "test: cover battle endpoint payload contracts"
```

### Task 2: Make Opening ASW Formula And Eligibility Real

Status: completed in the 2026-06-21 continuation. Focused verification passed with `npm test -- tests/battle-formulas.test.ts tests/battle.test.ts`; commit step skipped intentionally because related phase-one files were already uncommitted.

**Files:**

- Modify: `src/kcsapi/battle-formulas.ts`
- Modify: `src/kcsapi/battle.ts`
- Modify: `tests/battle-formulas.test.ts`
- Modify: `tests/battle.test.ts`

- [x] **Step 1: Add formula tests**

Add to `tests/battle-formulas.test.ts`:

```ts
import {
  aswAttackPower,
  canOpeningAswByStats
} from "../src/kcsapi/battle-formulas.js";

it("calculates opening ASW eligibility and attack power", () => {
  expect(canOpeningAswByStats({
    shipType: 2,
    level: 99,
    displayedAsw: 100,
    hasSonar: true,
    hasDepthCharge: false,
    hasAutogyro: false
  })).toBe(true);
  expect(canOpeningAswByStats({
    shipType: 2,
    level: 1,
    displayedAsw: 20,
    hasSonar: true,
    hasDepthCharge: false,
    hasAutogyro: false
  })).toBe(false);
  expect(aswAttackPower({ baseAsw: 70, equipmentAsw: 10, sonarCount: 1, depthChargeCount: 1 })).toBeGreaterThan(80);
});
```

- [x] **Step 2: Run the test to verify it fails**

Run:

```bash
npm test -- tests/battle-formulas.test.ts
```

Expected: fail because `aswAttackPower` and `canOpeningAswByStats` are not exported.

- [x] **Step 3: Implement formula helpers**

Add exports to `src/kcsapi/battle-formulas.ts`:

```ts
export type OpeningAswEligibilityInput = {
  shipType: number;
  level: number;
  displayedAsw: number;
  hasSonar: boolean;
  hasDepthCharge: boolean;
  hasAutogyro: boolean;
};

export type AswAttackPowerInput = {
  baseAsw: number;
  equipmentAsw: number;
  sonarCount: number;
  depthChargeCount: number;
};

export function canOpeningAswByStats(input: OpeningAswEligibilityInput) {
  if (input.shipType === 1) return input.hasSonar && input.displayedAsw >= 60;
  if (input.hasAutogyro) return input.displayedAsw >= 50;
  return input.hasSonar && input.level >= 75 && input.displayedAsw >= 100;
}

export function aswAttackPower(input: AswAttackPowerInput) {
  const base = Math.sqrt(Math.max(0, input.baseAsw)) * 2;
  const equipment = Math.max(0, input.equipmentAsw) * 1.5;
  const synergy = input.sonarCount > 0 && input.depthChargeCount > 0 ? 1.15 : 1;
  return (13 + base + equipment) * synergy;
}
```

- [x] **Step 4: Wire helpers into `src/kcsapi/battle.ts`**

Replace the local `aswAttackPower()` and `canOpeningAsw()` logic with imports from `battle-formulas.ts`. Keep the existing payload shape.

- [x] **Step 5: Add a battle-level test**

Use a practice rival with a submarine so the test does not depend on sortie data:

```ts
it("emits opening ASW against submarine practice enemies", () => {
  const sonar = store.createSlotItem(46);
  store.equipSlotItem(1, 0, sonar.id);
  store.db.prepare("UPDATE ships SET level = 99 WHERE id = 1").run();
  const rival = {
    id: 1,
    name: "Sub Practice",
    level: 99,
    rank: "元帥",
    comment: "submarine",
    flag: 1,
    medals: 4,
    ships: [{ id: 101, masterId: 126, level: 99, star: 5, slotMasterIds: [], onSlot: [0, 0, 0, 0, 0] }]
  };

  const battle = createPracticeBattle(store.getSave(), {
    practiceEnemyId: 1,
    practiceRivals: [rival],
    formation: 1
  });

  expect(battle.payload.api_opening_taisen).not.toBeNull();
  expect(battle.payload.api_opening_taisen.api_at_list).toContain(0);
});
```

- [x] **Step 6: Run focused tests**

```bash
npm test -- tests/battle-formulas.test.ts tests/battle.test.ts
```

Expected: pass.

- [x] **Step 7: Commit (skipped intentionally)**

```bash
git add src/kcsapi/battle-formulas.ts src/kcsapi/battle.ts tests/battle-formulas.test.ts tests/battle.test.ts
git commit -m "feat: refine opening ASW eligibility and power"
```

### Task 3: Replace Simplified AACI With A Table-Driven Implementation

Status: completed in the 2026-06-21 continuation. Added pure table tests in `tests/battle-aaci.test.ts` plus an integration test in `tests/battle.test.ts`; commit step skipped intentionally because related phase-one files were already uncommitted.

**Files:**

- Create: `src/kcsapi/battle/aaci.ts`
- Modify: `src/kcsapi/battle.ts`
- Modify: `tests/battle.test.ts`

- [x] **Step 1: Add a failing AACI table test**

Add to `tests/battle.test.ts`:

```ts
it("selects the highest-priority generic anti-air cut-in and reports its items", () => {
  const akizukiLike = store.createShip(1);
  const highAngleA = store.createSlotItem(3);
  const highAngleB = store.createSlotItem(10);
  const radar = store.createSlotItem(30);
  store.equipSlotItem(akizukiLike.id, 0, highAngleA.id);
  store.equipSlotItem(akizukiLike.id, 1, highAngleB.id);
  store.equipSlotItem(akizukiLike.id, 2, radar.id);
  store.changeDeckShip(1, 0, akizukiLike.id);

  const rival = {
    id: 1,
    name: "Carrier Practice",
    level: 120,
    rank: "元帥",
    comment: "carrier",
    flag: 1,
    medals: 4,
    ships: [{ id: 101, masterId: 277, level: 120, star: 5, slotMasterIds: [23], onSlot: [18, 0, 0, 0, 0] }]
  };

  const battle = createPracticeBattle(store.getSave(), {
    practiceEnemyId: 1,
    practiceRivals: [rival],
    formation: 1
  });

  expect(battle.payload.api_kouku?.api_air_fire).toMatchObject({
    api_idx: 0,
    api_kind: expect.any(Number),
    api_use_items: expect.arrayContaining([3, 10])
  });
});
```

- [x] **Step 2: Run the failing test**

```bash
npm test -- tests/battle.test.ts
```

Expected: fail if current AACI selection cannot detect the intended equipment pattern.

- [x] **Step 3: Create `src/kcsapi/battle/aaci.ts`**

Start with a small generic table, then expand it as more tests are added:

```ts
export type AaciCandidate = {
  unitIndex: number;
  kind: number;
  fixedBonus: number;
  modifier: number;
  useItems: number[];
};

export type AaciEquipmentSummary = {
  highAngleGuns: number[];
  aaGuns: number[];
  radars: number[];
};

export function selectGenericAaci(unitIndex: number, equipment: AaciEquipmentSummary): AaciCandidate | null {
  if (equipment.highAngleGuns.length >= 2 && equipment.radars.length >= 1) {
    return {
      unitIndex,
      kind: 5,
      fixedBonus: 4,
      modifier: 1.5,
      useItems: [...equipment.highAngleGuns.slice(0, 2), equipment.radars[0]]
    };
  }
  if (equipment.highAngleGuns.length >= 1 && equipment.aaGuns.length >= 1 && equipment.radars.length >= 1) {
    return {
      unitIndex,
      kind: 7,
      fixedBonus: 3,
      modifier: 1.35,
      useItems: [equipment.highAngleGuns[0], equipment.aaGuns[0], equipment.radars[0]]
    };
  }
  if (equipment.highAngleGuns.length >= 1 && equipment.radars.length >= 1) {
    return {
      unitIndex,
      kind: 8,
      fixedBonus: 2,
      modifier: 1.25,
      useItems: [equipment.highAngleGuns[0], equipment.radars[0]]
    };
  }
  return null;
}
```

- [x] **Step 4: Wire it into `antiAirCutIn()`**

Import `selectGenericAaci`, build an equipment summary from `BattleUnit.equippedSlots`, and return:

```ts
{
  api_idx: candidate.unitIndex,
  api_kind: candidate.kind,
  api_use_items: candidate.useItems
}
```

- [x] **Step 5: Run focused tests**

```bash
npm test -- tests/battle.test.ts
```

Expected: pass.

- [x] **Step 6: Commit (skipped intentionally)**

```bash
git add src/kcsapi/battle/aaci.ts src/kcsapi/battle.ts tests/battle.test.ts
git commit -m "feat: add table-driven generic AACI selection"
```

### Task 4: Expand Night Battle Special Attacks

Status: completed in the 2026-06-21 continuation for generic attacks only. Covered two-torpedo cut-in, main gun + torpedo mixed cut-in, and generic double attack; carrier night attack remains future work. Commit step skipped intentionally because related phase-one files were already uncommitted.

**Files:**

- Modify: `src/kcsapi/battle-formulas.ts`
- Modify: `src/kcsapi/battle.ts`
- Modify: `tests/battle.test.ts`

- [x] **Step 1: Add tests for mixed night cut-ins**

Add focused tests for:

- two torpedoes: `api_sp_list` type `5`
- two main guns: double attack type `1`
- main gun + torpedo: expected cut-in type after community confirmation
- carrier night attack only when night-capable equipment exists

Use existing tests around `uses daytime equipment snapshots for night torpedo cut-ins` as the template.

- [x] **Step 2: Run tests to capture current failures**

```bash
npm test -- tests/battle.test.ts
```

Expected: newly added mixed cut-in/carrier night tests fail.

- [x] **Step 3: Add a night attack classifier**

Add a pure helper in `src/kcsapi/battle-formulas.ts`:

```ts
export type NightAttackKind =
  | { spType: 0; hits: 1; modifier: 1 }
  | { spType: 1; hits: 2; modifier: 1.2 }
  | { spType: 5; hits: 1; modifier: 1.5 };

export function classifyNightAttack(input: {
  mainGuns: number;
  secondaryGuns: number;
  torpedoes: number;
  nightAircraft: number;
}): NightAttackKind {
  if (input.torpedoes >= 2) return { spType: 5, hits: 1, modifier: 1.5 };
  if (input.mainGuns >= 2 || (input.mainGuns >= 1 && input.secondaryGuns >= 1)) {
    return { spType: 1, hits: 2, modifier: 1.2 };
  }
  return { spType: 0, hits: 1, modifier: 1 };
}
```

- [x] **Step 4: Wire classifier into `shellingProfile()`**

Replace the current inline night branch with the classifier. Preserve existing passing tests.

- [x] **Step 5: Run focused tests**

```bash
npm test -- tests/battle.test.ts tests/battle-formulas.test.ts
```

Expected: pass.

- [x] **Step 6: Commit (skipped intentionally)**

```bash
git add src/kcsapi/battle-formulas.ts src/kcsapi/battle.ts tests/battle.test.ts tests/battle-formulas.test.ts
git commit -m "feat: classify generic night battle attacks"
```

### Task 5: Add Enemy Combined Fleet Data And Payload Support

**Files:**

- Modify: `scripts/generate-sortie-data.mjs`
- Modify: `src/master/sortie-data.ts`
- Modify: `src/kcsapi/battle.ts`
- Modify: `tests/battle.test.ts`
- Modify: `tests/api.test.ts`

- [ ] **Step 1: Inspect generated sortie data shape**

Run:

```bash
npx tsx -e "import { sortieNodes } from './src/master/sortie-data.ts'; console.log(JSON.stringify(sortieNodes()[0], null, 2).slice(0, 2000));"
```

Expected: node objects with encounters and enemy ship IDs.

- [ ] **Step 2: Add a unit test for enemy combined placeholders**

Add a test that manually mutates a selected encounter or constructs a `BattleRecord` with enemy combined snapshots. The test should assert:

```ts
expect(payload.api_ship_ke_combined).toHaveLength(6);
expect(payload.api_e_nowhps_combined).toHaveLength(6);
expect(payload.api_eParam_combined).toHaveLength(6);
expect(payload.api_eSlot_combined).toHaveLength(6);
```

- [ ] **Step 3: Extend sortie data types**

Add optional enemy escort fields:

```ts
enemyCombinedShipIds?: number[];
```

Keep existing data valid by defaulting to `[]`.

- [ ] **Step 4: Populate `enemyCombined` in `createCombinedBattle()`**

Replace:

```ts
const enemyCombined: BattleUnit[] = [];
```

with logic that reads `sortie?.enemyCombinedShipIds ?? []` and calls `enemyUnits(...)`.

- [ ] **Step 5: Run focused tests**

```bash
npm test -- tests/battle.test.ts tests/api.test.ts
```

Expected: pass.

- [ ] **Step 6: Commit**

```bash
git add scripts/generate-sortie-data.mjs src/master/sortie-data.ts src/kcsapi/battle.ts tests/battle.test.ts tests/api.test.ts
git commit -m "feat: support enemy combined fleet payloads"
```

### Task 6: Split Battle Engine Modules After Behavior Is Covered

**Files:**

- Create: `src/kcsapi/battle/types.ts`
- Create: `src/kcsapi/battle/phases.ts`
- Create: `src/kcsapi/battle/payload.ts`
- Modify: `src/kcsapi/battle.ts`
- Modify: tests only if imports change

- [ ] **Step 1: Run full baseline**

```bash
npm test
npm run typecheck
```

Expected: both pass before refactoring.

- [ ] **Step 2: Move only types first**

Move exported types from `src/kcsapi/battle.ts` into `src/kcsapi/battle/types.ts`:

```ts
export type Side = 0 | 1;
export type BattleEndpointKind = "sortieDay" | "sortieAir" | "sortieNight" | "practiceDay" | "practiceNight" | "combinedDay" | "combinedAir" | "combinedNight";
```

Keep `battle.ts` re-exporting them:

```ts
export type {
  BattleContext,
  BattleEndpointKind,
  BattleFleet,
  BattlePhaseResult,
  BattleUnit
} from "./battle/types.js";
```

- [ ] **Step 3: Run tests**

```bash
npm test -- tests/battle.test.ts
npm run typecheck
```

Expected: pass.

- [ ] **Step 4: Move payload helpers**

Move `battlePayload`, `combinedBattlePayload`, and related fixed-array helpers only if type dependencies stay small. If imports become tangled, stop and commit the type extraction first.

- [ ] **Step 5: Commit**

```bash
git add src/kcsapi/battle.ts src/kcsapi/battle/types.ts src/kcsapi/battle/payload.ts
git commit -m "refactor: split battle engine types and payload adapters"
```

### Task 7: Final Acceptance Scenarios

**Files:**

- Modify: `tests/battle.test.ts`
- Modify: `tests/api.test.ts`

- [ ] **Step 1: Add named acceptance tests**

Add one test per user acceptance scenario:

- 1-1 normal battle
- carrier normal battle
- practice enemy carrier
- combined fleet aerial battle
- night torpedo cut-in
- AACI shooting all aircraft down

Use deterministic seeds:

```ts
store.db.prepare("UPDATE sortie_sessions SET seed = 0 WHERE id = 1").run();
```

- [ ] **Step 2: Run all tests**

```bash
npm test
npm run typecheck
git diff --check
```

Expected:

- all tests pass
- typecheck exits 0
- diff check has no output

- [ ] **Step 3: Commit**

```bash
git add tests/battle.test.ts tests/api.test.ts
git commit -m "test: add battle core acceptance scenarios"
```

---

## Development Rules For Continuing This Work

- Do not introduce runtime network dependencies.
- Use local generated data from `src/master` and existing scripts.
- Keep KCSAPI envelopes stable.
- Add fields additively unless the client evidence proves a field must change.
- Use TDD for every behavior change:
  1. write a focused failing test
  2. run the focused test and confirm failure
  3. implement the smallest behavior change
  4. run focused tests
  5. run full `npm test` and `npm run typecheck` before claiming completion
- Keep unrelated generated data or lockfile churn out of commits.
- Prefer small commits per task so later agents can bisect behavior changes.

## Verification Checklist Before Handing Off

Run from the worktree root:

```bash
npm test
npm run typecheck
git diff --check
git status --short
```

Expected current status after only this branch's implementation work:

```text
 M src/kcsapi/battle-formulas.ts
 M src/kcsapi/battle.ts
 M tests/battle-formulas.test.ts
 M tests/battle.test.ts
?? docs/superpowers/plans/2026-06-21-kancolle-battle-core-roadmap.md
```

If additional files are modified, inspect them before continuing.
