# Aureus Below 90-Point Improvement Audit

Date: 2026-04-30

This is a code-grounded improvement inventory for the current workspace. The shipped game is still the React/Vite/Three runtime under `src/`; the Godot workspace under `godot/` is a real migration track but not yet the replacement runtime. The right move is to stop treating both as equal production surfaces. Keep React stable, migrate gameplay intentionally, and only deepen the React runtime where it protects current playability.

## Priority Legend

- P0: blocks reliability, production credibility, or migration truth.
- P1: high-leverage cleanup or feature-flow hardening.
- P2: useful polish, maintainability, or test-depth improvement.

## Executive Findings

1. P0 - Runtime ownership is still too centralized in `src/App.tsx`. It coordinates session boot, scene routing, action dispatch, pointer state, debug metrics, overlays, notifications, and world-entry transitions. This will keep biting every major feature.
2. P0 - Simulation is not deterministic. `Math.random()` appears across permit processing, economy, dialogue, mine actions, form gameplay, voxel effects, NPC idle behavior, city events, and content generation.
3. P0 - The React runtime and Godot runtime now duplicate game logic. Without parity contracts, they will become two different games.
4. P0 - Save validation is shallow. `src/game/save.ts` accepts "likely" saves by checking a few top-level fields, then hydration patches the rest.
5. P0 - The test strategy is useful but incomplete. There are focused `.test.ts` files and a Playwright smoke, but no named test runner script for the unit tests and no Godot validation command in `package.json`.
6. P1 - `src/VoxelEngine.ts` is still a 2,000+ line mixed engine/editor/export/runtime class. It should be split along real ownership boundaries.
7. P1 - `src/data.ts` is a content megafile plus procedural mine grid plus city layout compiler. It should be split into catalogs and generated layout modules.
8. P1 - `src/components/MineWorldScene.tsx` owns a separate local mine economy that only partially feeds global state.
9. P1 - `docs/godot-migration-plan.md` says to freeze React feature work, but the repo is still actively adding React features. That mismatch needs an explicit policy.
10. P1 - Verification is too dependent on one long smoke script. It proves important flows, but it is brittle and hard to extend safely.

## Architecture And Ownership

11. P0 - Extract `App` action dispatch into a game controller hook.
    Evidence: `src/App.tsx` lines around the `handleMove`, `handleMine`, `handleDialogueAction`, permit, incident, scene, and exploration handlers.
    Move: create `src/hooks/app/useGameActions.ts` that receives `setState`, notification APIs, and state selectors, then returns stable handlers.
    Verification: smoke still reaches world, mine, Bureau, incident, and archive restore.

12. P0 - Stop passing huge prop bundles through `GameSceneRouter`.
    Evidence: `src/App.tsx` builds a router with more than 50 props.
    Move: replace prop sprawl with grouped contracts: `movementActions`, `sceneActions`, `permitActions`, `debugActions`, `plannerActions`.
    Verification: TypeScript should reject missing groups; smoke should prove scene routes.

13. P1 - Create a scene transition state machine.
    Evidence: `pendingWorldEntryBuildingId`, `previousSceneRef`, loading overlays, and entry callbacks are coordinated across `App`, `VoxelWorldContainer`, and `VoxelEngine`.
    Move: model transitions as `idle | bootingWorld | enteringBuilding | sceneFade`, with explicit event reducers.
    Verification: unit-test transition sequences and smoke world entry.

14. P1 - Separate domain actions from UI-triggered effects.
    Evidence: handlers call pure-ish reducers then push notifications inline.
    Move: standardize action results as `{ nextState, notifications, telemetry? }`.
    Verification: no reducer calls notification setters directly.

15. P1 - Make notification dispatch batched and ordered.
    Evidence: multiple loops call `setNotification` repeatedly; only the last message may win.
    Move: all systems emit arrays and route through `pushNotifications`.
    Verification: regression test two same-tick notifications.

16. P1 - Remove duplicated React imports.
    Evidence: several hooks import both `useEffect` and default `React`.
    Move: use one import style per file.
    Verification: lint passes.

17. P1 - Turn `GameState` into versioned sub-state modules.
    Evidence: `src/types.ts` composes resource, office, meter, progression, interaction, world, narrative, and FTUE state.
    Move: keep composition, but move each sub-state type beside its owning module.
    Verification: exported `GameState` remains serializable.

18. P1 - Define an action/event log shape for important mutations.
    Evidence: debug metrics track last action name only.
    Move: emit structured events for permit, dialogue, mine, economy, incident, save.
    Verification: debug panel can render recent event names without parsing text.

19. P2 - Normalize naming between React and Godot.
    Evidence: React uses `currentScene`, Godot uses `active_scene`; React uses `worldProfileId`, Godot uses `profile_id`.
    Move: publish a schema map under `docs/schema-map.md`.
    Verification: migration validator checks schema keys.

20. P2 - Decide whether editor/export code still belongs in the shipped runtime.
    Evidence: `VoxelEngine` still contains OBJ/PLY export and toy-box voxel editing methods.
    Move: isolate editor/export engine APIs behind the City Planner only.
    Verification: production gameplay bundle no longer imports editor-only paths unless planner opens.

## Determinism And Simulation

21. P0 - Introduce a seeded RNG service for gameplay.
    Evidence: `Math.random()` appears in permit processing, mine hazards, dialogue, economy, city incidents, pickups, and form gameplay.
    Move: add `src/game/random.ts` with seedable streams per save slot and per subsystem.
    Verification: same seed plus same action sequence produces same state.

22. P0 - Convert permit processing from wall-clock polling to simulation events.
    Evidence: `src/hooks/game/usePermitProcessingLoop.ts` runs every 3000 ms with random rolls.
    Move: permit state should carry submitted world-hour and next review world-hour.
    Verification: unit-test approval/rejection at deterministic world-hour thresholds.

23. P0 - Convert city incident spawning from timer chance to world-hour scheduler.
    Evidence: `src/hooks/game/useCityEventLoop.ts` polls every 2500 ms and writes `lastCityEventHour`.
    Move: calculate incident eligibility on world-hour advance, not a separate interval.
    Verification: incident cannot spawn twice for the same hour.

24. P1 - Consolidate continuous loops into one world tick orchestrator.
    Evidence: movement, time/curfew, permit processing, city events, and feedback cleanup all run independent intervals.
    Move: add `useWorldTick` that runs ordered subsystem reducers.
    Verification: test ordering: time advance, weather, permits, incidents, movement cleanup.

25. P1 - Make economy daily ticks idempotent.
    Evidence: day rollover in `useTimeAndCurfewLoop` applies daily economy when crossing 6:00.
    Move: store `lastDailyEconomyDay`.
    Verification: reload or lag spike cannot apply daily overhead twice.

26. P1 - Add deterministic form mini-game generation.
    Evidence: `src/components/FormMiniGame.tsx` shuffles fields and options with `Math.random()`.
    Move: seed by permit id plus submitted timestamp.
    Verification: smoke can solve a known fixture without brittle DOM guessing.

27. P1 - Separate visual randomness from gameplay randomness.
    Evidence: `VoxelEngine` particle/drop randomness is visual; permit and mine randomness is gameplay.
    Move: visual RNG can remain ephemeral; gameplay RNG must be save-derived.
    Verification: visual variance does not change saved state.

28. P1 - Add replayable reducer tests for mine hazards.
    Evidence: `src/game/actions/mineActions.ts` rolls hazard, gas leak, rich vein, new tile type, and stability.
    Move: inject RNG into mine actions.
    Verification: tests cover hazard, reward, and expansion branches.

29. P2 - Seed NPC idle and roaming behavior.
    Evidence: `src/EntityManager.ts` uses random idle durations while `npcNavigation.ts` supports injected randomness.
    Move: route world NPC behavior through the same injectable path.
    Verification: fixed seed yields stable NPC path snapshots.

30. P2 - Remove random IDs where stable IDs are enough.
    Evidence: street pickups, notifications, feedbacks, authoring objects use random suffixes.
    Move: use deterministic IDs derived from position, timestamp bucket, or event sequence where possible.
    Verification: no duplicate IDs in the same action sequence.

## Save, Hydration, And Migration

31. P0 - Replace shallow save validation with schema validation.
    Evidence: `isLikelyGameState` in `src/game/save.ts` only checks a small field set.
    Move: add `validateGameStateEnvelope` with required sub-state checks and default migrations.
    Verification: corrupted slot reports exactly why it failed.

32. P0 - Add explicit save migrations per version.
    Evidence: `SAVE_VERSION` exists, but migration mostly wraps legacy saves and hydrates defaults.
    Move: `migrations/v1-to-v2`, `v2-to-v3` style functions.
    Verification: fixture tests for each historical save shape.

33. P1 - Persist unresolved async-style UI states intentionally.
    Evidence: active overlays, active incident, mini-game, pending permit action, and current scene are persisted as raw state.
    Move: decide which UI states resume and which collapse to safe defaults.
    Verification: archive restore tests for active incident, form mini-game, office dialogue, and mine world.

34. P1 - Add save-slot conflict and overwrite confirmation logic.
    Evidence: `getNextSaveSlotId` overwrites oldest slot automatically when all slots are full.
    Move: surface overwrite intent in the archive UI.
    Verification: unit-test full slot behavior and browser-test the prompt.

35. P1 - Handle localStorage quota failure visibly.
    Evidence: `saveGameState` catches and ignores failures.
    Move: return a save result and notify the user once per session.
    Verification: mock quota exception and assert notification.

36. P1 - Add save integrity metadata.
    Evidence: save envelopes contain version and timestamp only.
    Move: add profile id, scene, schema version, and optional checksum/hash for corruption detection.
    Verification: damaged JSON or wrong shape cannot silently load.

37. P2 - Move `saveMetadata.json` parity into Godot.
    Evidence: React has `src/game/saveMetadata.json`; Godot has `godot/data/bootstrap/save_metadata.json`.
    Move: generate both from a single canonical JSON or validate equality.
    Verification: CI script compares keys and version.

38. P2 - Track migration source for hydrated saves.
    Evidence: hydration repairs old layouts, missing fields, and world spawn position but does not report that.
    Move: return `{ state, migrationsApplied }`.
    Verification: debug panel can display migration events.

39. P2 - Add backup export/import for saves.
    Evidence: browser localStorage is the only React persistence layer.
    Move: expose JSON export/import with validation.
    Verification: export current slot, clear saves, import, restore.

40. P2 - Document save compatibility policy.
    Evidence: docs mention LocalStorage but not compatibility guarantees.
    Move: add a section to `docs/game-engine-architecture.md`.
    Verification: docs state which save versions are supported.

## Renderer, Performance, And Engine

41. P0 - Split `src/VoxelEngine.ts`.
    Evidence: it owns renderer setup, controls, terrain mesh, pickups, editor ghost voxels, physics, export, edge decorations, weather environment, entry cameras, and debug.
    Move: extract `WorldRenderer`, `TerrainMeshSystem`, `PickupRenderSystem`, `CameraController`, `EditorVoxelTools`, `VoxelExportService`.
    Verification: no extracted module mutates React state directly.

42. P1 - Cache terrain chunks by content hash.
    Evidence: `createVoxels` chunks data and remeshes every incoming terrain dataset.
    Move: hash chunk voxel data and reuse unchanged `BufferGeometry`.
    Verification: city pickup changes do not remesh terrain.

43. P1 - Move greedy meshing off the main interaction path.
    Evidence: `GreedyMesher.mesh(voxels)` is synchronous inside `createVoxels`.
    Move: worker-based mesh generation or prebuilt terrain snapshots.
    Verification: large world boot stays responsive under performance tracing.

44. P1 - Add renderer budget metrics.
    Evidence: debug state tracks state updates and last action ms, not mesh counts, draw calls, or frame time.
    Move: expose renderer stats from `VoxelEngine` to `WorldSceneDebugOverlay`.
    Verification: debug panel shows draw calls, terrain chunks, pickup count, entity count.

45. P1 - Remove stale `optimizedMesh` member.
    Evidence: `optimizedMesh` is nulled but not meaningfully used.
    Move: delete it or wire it into a real mesh cache.
    Verification: TypeScript build catches any stale references.

46. P1 - Decide whether Cannon physics is still needed in runtime.
    Evidence: `physicsWorld` exists, but the current world is mostly grid/path driven.
    Move: keep Cannon only for editor toy-box/destruction if needed.
    Verification: gameplay build can run without physics methods loaded.

47. P1 - Isolate export code from `VoxelEngine`.
    Evidence: OBJ/PLY export logic sits in the runtime class.
    Move: pure export service receives voxel data.
    Verification: planner export test can call service without mounting Three renderer.

48. P1 - Stabilize render material reuse.
    Evidence: `createVoxels` creates new `MeshStandardMaterial` per chunk.
    Move: share materials by wireframe and vertex-color config where feasible.
    Verification: boot allocation profile shows fewer material instances.

49. P2 - Make edge skyline generation data-driven and bounded.
    Evidence: `buildEdgeDecorations` has many inline layer constants.
    Move: move layer configs into `background.json` or a typed config module.
    Verification: config validation catches invalid ring ranges.

50. P2 - Add a render fallback mode.
    Evidence: renderer creation assumes WebGL succeeds.
    Move: detect WebGL failure and show playable 2D/map fallback or clear error surface.
    Verification: browser launch with disabled WebGL reports graceful state.

## World, Navigation, And Content Data

51. P0 - Split `src/data.ts`.
    Evidence: it contains mine generation, NPC/content catalogs, dialogue-like copy, city layout generation, and overlap assertions.
    Move: `content/permits.ts`, `content/npcs.ts`, `content/mines.ts`, `world/cityLayout.ts`, `world/mineGrid.ts`.
    Verification: imports become domain-specific; tests still pass.

52. P1 - Promote city layout validation into the normal build gate.
    Evidence: `scripts/validate-city-layout.ts` exists but `npm run build` does not run it.
    Move: add `validate:city` and optionally `check`.
    Verification: broken layout fails `npm run check`.

53. P1 - Expand layout validation beyond overlap/access.
    Evidence: current validator checks overlaps, access, and NPC routes.
    Move: add camera readability, district density, player spawn clearance, mine entrance reachability, pickup spawn legality.
    Verification: validator reports each category separately.

54. P1 - Build a route coverage matrix.
    Evidence: routes exist for home, office, mine, planner, mine world, archive, incidents, and overlays.
    Move: document which state unlocks each route and what test covers it.
    Verification: route map can be generated or reviewed from code.

55. P1 - Normalize mine world resources.
    Evidence: `MineWorldScene` tracks rawOre, coal, gems, refinedMetal locally and then calls `onCollectResource(amount)` as generic ore.
    Move: global resource state should represent resource types or mine world should stay a pure visual mini-loop.
    Verification: mining coal does not become ore unless intentionally converted.

56. P1 - Persist or reset mine-world local progress deliberately.
    Evidence: mine-world inventory and node cooldowns live only in component state.
    Move: either persist in `GameState` or reset with explicit copy.
    Verification: leaving/re-entering mine world behaves as designed.

57. P1 - Add mine-world pathing tests.
    Evidence: `MineWorldScene` calls `findPath` against `MINE_WORLD_BUILDINGS`, but route tests focus city NPCs.
    Move: test entrance to ore, coal, gems, delivery, smelter.
    Verification: inaccessible mine nodes fail fast.

58. P1 - Make pickups spawned by a policy, not direct random shuffle.
    Evidence: `streetPickups.ts` creates pickups from world surface with random shuffle.
    Move: define spawn bands, density, cooldown, and seed.
    Verification: no pickup spawns inside blocked or invisible cells.

59. P2 - Extract world profile fixtures.
    Evidence: `worldProfiles.ts` contains profile definitions and application logic.
    Move: data JSON plus typed applicator.
    Verification: invalid profile ids or building ids fail validation.

60. P2 - Add content lint for referenced ids.
    Evidence: dialogue commands, permits, mines, NPCs, building ids, story flags, and effects are stringly connected.
    Move: script validates all referenced ids exist.
    Verification: typo in `permitId` fails content validation.

## UI, UX, And Flow

61. P0 - Resolve the React-vs-Godot product direction in UI work policy.
    Evidence: Godot docs say freeze React features; latest memory shows React incidents were added.
    Move: define: React gets bug fixes and parity source-of-truth only; Godot gets new shipped gameplay, or explicitly reverse that.
    Verification: roadmap doc has one owner per feature.

62. P1 - Audit all overlays for mobile handset constraints.
    Evidence: app is mobile-first, but modal surfaces like form, market, archive, city incidents, planner, and debug have different shells.
    Move: screenshot sweep at 390x844, 430x932, 768x1024, desktop.
    Verification: no clipped buttons, overlapping rails, or unreadable labels.

63. P1 - Add accessibility labels to icon-only controls.
    Evidence: HUD and rail controls rely heavily on icons.
    Move: ensure `aria-label`/title exists for every icon button.
    Verification: Playwright accessibility snapshot or DOM query.

64. P1 - Remove remaining explanatory UI copy where the design should teach through controls.
    Evidence: some surfaces still include guidance text blocks from older flows.
    Move: tighten to action labels and status copy.
    Verification: visual review on mobile.

65. P1 - Make FTUE state a single source of truth.
    Evidence: `ftuePhase` and legacy `tutorialStep` still coexist throughout components and tests.
    Move: keep `tutorialStep` as migration-only or derive it from phase at render boundaries.
    Verification: no gameplay branch uses raw numeric tutorial steps except migration.

66. P1 - Add exact-copy tests for critical workflow surfaces.
    Evidence: prior regressions involved vague/lying UI copy in other repo work; this repo has many dynamic status cards too.
    Move: lock Bureau, permit, market, incident, save, and mine status strings.
    Verification: component tests or smoke DOM assertions.

67. P1 - Improve archive restore transparency.
    Evidence: archive slot summary shows profile, day, funds, ore, exposure, saved time.
    Move: add scene/resume status and corrupted-slot diagnostics.
    Verification: seeded corrupted slot is shown as recoverable/unusable instead of silently empty.

68. P2 - Consolidate HUD primitives.
    Evidence: `HudFrame.tsx` exists, but older surfaces still have local card styles.
    Move: inventory all panels and migrate outliers.
    Verification: CSS scan for duplicate ad hoc HUD classes.

69. P2 - Add UI state names to debug panel.
    Evidence: debug panel shows scene and metrics, but not overlay/incident/mini-game state as a coherent snapshot.
    Move: display active overlay stack.
    Verification: smoke can assert expected overlay stack after actions.

70. P2 - Give city incidents a history ledger.
    Evidence: active incidents resolve into state and notifications, but long-term audit trail depends on action log behavior.
    Move: incident outcomes should append a structured story ledger entry.
    Verification: resolving choice decreases active card and records outcome.

## Tests, Tooling, And CI

71. P0 - Add a real unit test script.
    Evidence: `.test.ts` files exist, but `package.json` only exposes `lint`, `build`, and `smoke:regression`.
    Move: add `test:unit` using Node's test runner with `tsx` or another existing dependency.
    Verification: all `src/**/*.test.ts` run from npm.

72. P0 - Add a single `check` script.
    Evidence: validation is spread across lint, build, smoke, city validator, and Godot bootstrap.
    Move: `npm run check` should run typecheck, unit tests, city validation, build, and optionally smoke.
    Verification: one command gives release confidence.

73. P1 - Split the Playwright smoke into scenarios.
    Evidence: `scripts/smoke-regression.mjs` is about 600 lines and does many flows.
    Move: extract helpers and scenario files.
    Verification: can run `smoke:world`, `smoke:archive`, `smoke:bureau`, `smoke:incident`.

74. P1 - Capture screenshots on smoke failure.
    Evidence: current smoke throws detailed errors but no automatic visual artifact is guaranteed.
    Move: on failure save screenshot and localStorage dump to `output/smoke-failures/`.
    Verification: intentional failure produces artifacts.

75. P1 - Add browser performance smoke.
    Evidence: renderer risk is high after large city/world changes.
    Move: measure boot time, first world ready, frame budget, draw calls.
    Verification: threshold failure when boot exceeds budget.

76. P1 - Add Godot validation to root tooling.
    Evidence: Godot bootstrap validator exists under `godot/scripts/dev/validate_bootstrap.gd`, but root npm scripts do not invoke it.
    Move: add a script that runs it when a Godot binary path is configured.
    Verification: command skips clearly if Godot is unavailable and runs when configured.

77. P1 - Validate imported assets are not accidentally committed.
    Evidence: `godot/.godot/imported` and generated zips exist in the workspace.
    Move: ensure `.gitignore` excludes generated import cache and raw unsorted zips unless intentionally tracked.
    Verification: `git status --ignored` confirms policy.

78. P2 - Add dependency audit policy.
    Evidence: dependencies include large frontend/game libs and plugins.
    Move: add `npm audit --omit=dev` or documented security check cadence.
    Verification: CI or local check reports vulnerability status.

79. P2 - Add dead-code detection.
    Evidence: old editor/runtime methods likely remain after the game pivot.
    Move: use TypeScript references plus static import scan for unused modules.
    Verification: identify candidate deletions before manual removal.

80. P2 - Generate architecture diagrams from actual imports.
    Evidence: docs include flow maps, but they can drift.
    Move: add script to output module graph for `src/game`, `src/components`, `src/hooks`.
    Verification: generated diagram updates when imports change.

## Godot Migration

81. P0 - Establish React-to-Godot parity tests.
    Evidence: React and Godot both implement permits, economy, profiles, dialogue, and progression.
    Move: create shared JSON fixtures and expected outcomes for permit chain, World 3 sandbox, economy export, dialogue flags.
    Verification: React unit test and Godot validator pass the same fixture contract.

82. P0 - Stop duplicating constants by hand.
    Evidence: React and Godot have independent permit, mine, NPC, world profile, save metadata, and economy values.
    Move: choose a canonical data source and generate target formats.
    Verification: script diff fails on drift.

83. P1 - Split Godot MVP UI from game systems.
    Evidence: `godot/scripts/mvp/mobile_mvp_scene.gd` builds screens, assets, HUD, hub, dialogue, permits, and mine interactions in one large file.
    Move: create screen controllers and reusable UI factories.
    Verification: each screen can refresh from `GameState` without cross-screen mutation.

84. P1 - Add Godot save/load browser parity.
    Evidence: `GameState` exposes save slot functions; MVP scene needs full user-facing flow.
    Move: build save slot UI and corrupted-slot handling.
    Verification: Godot validator covers save slot round-trip and scene boot.

85. P1 - Port movement/navigation intentionally, not as UI button shortcuts.
    Evidence: current Godot MVP is screen/hotspot driven, while React has world pathing and voxel navigation.
    Move: define the target Godot movement model before porting more world code.
    Verification: design doc plus prototype route from home to Bureau to mine.

86. P1 - Port city incidents as a system, not a React overlay clone.
    Evidence: React incidents now exist in `src/game/cityIncidents.ts` and `CityIncidentOverlay.tsx`.
    Move: migrate the incident domain reducer and add Godot presentation later.
    Verification: shared fixture proves choices mutate state the same way.

87. P2 - Clean Godot addon footprint.
    Evidence: multiple addons and generated/imported files exist under `godot/addons` and `godot/.godot`.
    Move: inventory which addons are required for runtime, editor tooling, or disposable experiments.
    Verification: fresh clone can open the project without missing essential plugins.

88. P2 - Add asset manifest validation.
    Evidence: `godot/assets/ui/asset_manifest.md` exists, while MVP hardcodes many asset paths.
    Move: script checks every path in `mobile_mvp_scene.gd` exists and is listed.
    Verification: deleted asset fails validation.

89. P2 - Define Godot version and binary discovery.
    Evidence: migration docs mention Godot 4.4+, project now appears to use newer local runs.
    Move: pin supported Godot version in `godot/README.md` and root docs.
    Verification: validation script prints version and warns on mismatch.

90. P2 - Decide how long React remains maintained after Godot reaches parity.
    Evidence: both surfaces will demand work unless a retirement line exists.
    Move: set a deprecation criterion: Godot passes parity suite, has save/load, core loop, mobile shell, and one playable vertical slice.
    Verification: roadmap has a hard exit condition for React feature work.

## Recommended Execution Order

1. Add `test:unit`, `validate:city`, and `check`.
2. Add save schema validation and versioned migration fixtures.
3. Introduce seeded gameplay RNG and inject it into permit, incident, mine, and form flows.
4. Split the smoke script into scenario modules with failure artifacts.
5. Extract `App` action dispatch and notification batching.
6. Create React/Godot parity fixtures for permit, economy, world profile, dialogue, and incident outcomes.
7. Split `VoxelEngine` only after the above checks are in place.

## Verification Baseline

The minimum check set after addressing any P0/P1 item should be:

```powershell
npm run lint
npm run build
npm run smoke:regression
```

After tooling is improved, replace that with:

```powershell
npm run check
```
