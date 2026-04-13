# Aureus: Below Architecture

This document describes the current runtime shape of the game as implemented in the React/Vite client. It replaces the older simplified notes that only covered a generic React loop and voxel projection.

## System Goals

The codebase is built around a few hard constraints:

- Keep the full game state serializable so autosave, resume, seeded regression tests, and future migration logic stay straightforward.
- Separate pure game rules from React rendering so balancing and content expansion do not require UI rewrites.
- Treat the world, office, mine, and overlays as scene-level surfaces driven by one source of truth.
- Keep expensive rendering concerns isolated from the shell so the rest of the app can stay boring and testable.

## Top-Level Structure

### App shell

[`src/App.tsx`](/C:/Users/willi/Downloads/remix_-aureus_-below%20(3)/src/App.tsx) is now the orchestration root, not the owner of every rule. It is responsible for:

- Holding the live `GameState`
- Wiring scene handlers to pure action modules
- Connecting shell UI panels and overlays
- Tracking lightweight telemetry for debug output

Boot/session and shell concerns are intentionally pushed outward:

- [`src/game/session.ts`](/C:/Users/willi/Downloads/remix_-aureus_-below%20(3)/src/game/session.ts): initial-state construction and save hydration
- [`src/hooks/app/useGameSession.ts`](/C:/Users/willi/Downloads/remix_-aureus_-below%20(3)/src/hooks/app/useGameSession.ts): new game, continue flow, startup loading, autosave
- [`src/hooks/app/useNotificationCenter.ts`](/C:/Users/willi/Downloads/remix_-aureus_-below%20(3)/src/hooks/app/useNotificationCenter.ts): notification queue plus action log fan-out
- [`src/hooks/app/useAppChrome.ts`](/C:/Users/willi/Downloads/remix_-aureus_-below%20(3)/src/hooks/app/useAppChrome.ts): panel and overlay visibility state

### Scene routing

[`src/components/GameSceneRouter.tsx`](/C:/Users/willi/Downloads/remix_-aureus_-below%20(3)/src/components/GameSceneRouter.tsx) lazily mounts the active scene:

- `WORLD`
- `MINE`
- `MINE_WORLD`
- `OFFICE`
- `CITY_PLANNER` in dev only

This router is the boundary between shell orchestration and heavy scene rendering. It also carries initial-scene readiness signals back to the startup loader.

### Boot flow and shell surfaces

The runtime no longer boots directly into the world by default. The shell starts at [`src/components/StartScreen.tsx`](/C:/Users/willi/Downloads/remix_-aureus_-below%20(3)/src/components/StartScreen.tsx), and [`src/hooks/app/useGameSession.ts`](/C:/Users/willi/Downloads/remix_-aureus_-below%20(3)/src/hooks/app/useGameSession.ts) decides whether the player is:

- starting a fresh run
- continuing a saved run
- entering the dev planner from the title screen

That matters for documentation because autosave, onboarding, and first-scene loading are now part of the application shell, not incidental glue around the world scene.

### Shared shell policy

The shell now has two explicit policy helpers so scene/UI rules do not get reimplemented across `App`, the router, and individual scene components:

- [`src/game/scenePolicy.ts`](/C:/Users/willi/Downloads/remix_-aureus_-below%20(3)/src/game/scenePolicy.ts): canonical scene navigation items, active-scene checks, and the renderable-scene fallback policy
- [`src/game/shellView.ts`](/C:/Users/willi/Downloads/remix_-aureus_-below%20(3)/src/game/shellView.ts): compact FTUE HUD logic plus shared meta-panel/progression-guide visibility

This is a small but important architectural boundary. It moves shell behavior out of scattered JSX conditionals and into named policy modules.

## State Model

The canonical state shape lives in [`src/types.ts`](/C:/Users/willi/Downloads/remix_-aureus_-below%20(3)/src/types.ts) as `GameState`, which is composed from smaller slices:

- Resource state: money, ore, evidence, energy, upgrades
- Office/exploration state: found items, active exploration
- Meter state: trust, influence, exposure
- Progression state: permits, NPCs, objectives, mines, endings
- Interaction state: active scene, focused NPC/permit/building, minigame state
- World state: buildings, clock, player position, movement target, computed path
- Narrative state: feedbacks, cooldowns, persistent world effects, story flags
- FTUE state: tutorial phase, tutorial step, minimization state

Important consequence: `GameState` remains plain-data only. That keeps save/load simple and makes the regression harness able to seed scenarios by editing localStorage directly.

## Game Logic Boundaries

### Pure action modules

Most game mutations are handled by focused rule modules under [`src/game`](/C:/Users/willi/Downloads/remix_-aureus_-below%20(3)/src/game) and [`src/game/actions`](/C:/Users/willi/Downloads/remix_-aureus_-below%20(3)/src/game/actions):

- [`mineActions.ts`](/C:/Users/willi/Downloads/remix_-aureus_-below%20(3)/src/game/actions/mineActions.ts): tile mining, mine equipment, hazards, extraction rules
- [`permitActions.ts`](/C:/Users/willi/Downloads/remix_-aureus_-below%20(3)/src/game/actions/permitActions.ts): permit submission/payment/minigame outcomes
- [`evidenceActions.ts`](/C:/Users/willi/Downloads/remix_-aureus_-below%20(3)/src/game/actions/evidenceActions.ts): office evidence and photo collection
- [`dialogueActions.ts`](/C:/Users/willi/Downloads/remix_-aureus_-below%20(3)/src/game/actions/dialogueActions.ts): relationship and social fallout processing
- [`dialogueCommands.ts`](/C:/Users/willi/Downloads/remix_-aureus_-below%20(3)/src/game/dialogue/dialogueCommands.ts): command interpreter for dialogue outcomes
- [`economy.ts`](/C:/Users/willi/Downloads/remix_-aureus_-below%20(3)/src/game/economy.ts): ore pricing, export strategies, daily economy tick
- [`navigationActions.ts`](/C:/Users/willi/Downloads/remix_-aureus_-below%20(3)/src/game/navigationActions.ts): direct movement, planned movement, travel, rest
- [`sceneTransitions.ts`](/C:/Users/willi/Downloads/remix_-aureus_-below%20(3)/src/game/sceneTransitions.ts): legal scene changes and building-entry transitions
- [`uiTransitions.ts`](/C:/Users/willi/Downloads/remix_-aureus_-below%20(3)/src/game/uiTransitions.ts): UI-only state transitions

These modules are intentionally mostly pure. The app shell passes in current state and receives next state plus notifications where needed.

### Derived view models

Some surfaces use derivation layers instead of burying display logic inside components:

- [`officeViewModel.ts`](/C:/Users/willi/Downloads/remix_-aureus_-below%20(3)/src/game/officeViewModel.ts)
- [`progressionGuide.ts`](/C:/Users/willi/Downloads/remix_-aureus_-below%20(3)/src/game/progressionGuide.ts)
- [`storyFlags.ts`](/C:/Users/willi/Downloads/remix_-aureus_-below%20(3)/src/game/dialogue/storyFlags.ts)
- [`endings.ts`](/C:/Users/willi/Downloads/remix_-aureus_-below%20(3)/src/game/endings.ts)

That keeps presentation decisions explainable and reusable across overlays and panels.

### Operation desk and route tracking

Office-side strategic planning is now its own rules surface instead of an ad hoc UI extra:

- [`runCycle.ts`](/C:/Users/willi/Downloads/remix_-aureus_-below%20(3)/src/game/runCycle.ts): cycle summary, phase state, and office operation actions
- [`RunCyclePanel.tsx`](/C:/Users/willi/Downloads/remix_-aureus_-below%20(3)/src/components/RunCyclePanel.tsx): secure/prepare/execute/resolve/route guidance
- [`PoliticalPositionPanel.tsx`](/C:/Users/willi/Downloads/remix_-aureus_-below%20(3)/src/components/PoliticalPositionPanel.tsx): current deals, locked routes, and run ledger

This is important because the game is no longer only "world -> permit -> mine". Route identity and political commitments are now explicit first-class progression surfaces.

## Runtime Loops

The game does not run a monolithic engine update loop. Instead, continuous systems are split into targeted hooks that mutate state on their own cadence:

- [`useMovementLoop.ts`](/C:/Users/willi/Downloads/remix_-aureus_-below%20(3)/src/hooks/game/useMovementLoop.ts): consumes movement path budget over time
- [`useTimeAndCurfewLoop.ts`](/C:/Users/willi/Downloads/remix_-aureus_-below%20(3)/src/hooks/game/useTimeAndCurfewLoop.ts): advances time, dawn processing, curfew behavior
- [`usePermitProcessingLoop.ts`](/C:/Users/willi/Downloads/remix_-aureus_-below%20(3)/src/hooks/game/usePermitProcessingLoop.ts): permit queue progression
- [`useCityEventLoop.ts`](/C:/Users/willi/Downloads/remix_-aureus_-below%20(3)/src/hooks/game/useCityEventLoop.ts): periodic city events
- [`useBuildingDiscovery.ts`](/C:/Users/willi/Downloads/remix_-aureus_-below%20(3)/src/hooks/game/useBuildingDiscovery.ts): discovery/objective unlocks
- [`useTutorialProgression.ts`](/C:/Users/willi/Downloads/remix_-aureus_-below%20(3)/src/hooks/game/useTutorialProgression.ts): FTUE progression
- [`useFeedbackCleanup.ts`](/C:/Users/willi/Downloads/remix_-aureus_-below%20(3)/src/hooks/game/useFeedbackCleanup.ts): short-lived feedback expiry

This is deliberate. Each loop owns one subsystem instead of forcing every tick through one god-function.

## World and Navigation Stack

### World rendering

The explorable world is rendered through the voxel stack:

- [`src/components/WorldScene.tsx`](/C:/Users/willi/Downloads/remix_-aureus_-below%20(3)/src/components/WorldScene.tsx)
- [`src/components/VoxelWorldContainer.tsx`](/C:/Users/willi/Downloads/remix_-aureus_-below%20(3)/src/components/VoxelWorldContainer.tsx)
- [`src/VoxelEngine.ts`](/C:/Users/willi/Downloads/remix_-aureus_-below%20(3)/src/VoxelEngine.ts)

The shell only passes movement and interaction handlers. Camera/input/render complexity stays down in the world layer.

### Layout and pathfinding

Navigation depends on actual placed voxel footprints rather than fake blockers:

- [`src/data.ts`](/C:/Users/willi/Downloads/remix_-aureus_-below%20(3)/src/data.ts): world layout and authored buildings
- [`src/utils/worldNavigation.ts`](/C:/Users/willi/Downloads/remix_-aureus_-below%20(3)/src/utils/worldNavigation.ts): footprint math, blocking logic, access calculations
- [`src/utils/buildingAccess.ts`](/C:/Users/willi/Downloads/remix_-aureus_-below%20(3)/src/utils/buildingAccess.ts): safe entry/exit tiles
- [`src/utils/pathfinding.ts`](/C:/Users/willi/Downloads/remix_-aureus_-below%20(3)/src/utils/pathfinding.ts): 8-direction pathfinding with real obstacle handling
- [`src/utils/worldSurface.ts`](/C:/Users/willi/Downloads/remix_-aureus_-below%20(3)/src/utils/worldSurface.ts): cached surface lookup for direct world movement
- [`src/utils/voxelConstants.ts`](/C:/Users/willi/Downloads/remix_-aureus_-below%20(3)/src/utils/voxelConstants.ts): shared world dimensions

The current world is a 240x240 grid with layout normalization to keep authored content inside bounds.

## Authoring and Planner Pipeline

The dev-only city planner is now a real subsystem, not a temporary debug toy.

### Planner state

[`src/hooks/editor/useCityPlannerEditor.ts`](/C:/Users/willi/Downloads/remix_-aureus_-below%20(3)/src/hooks/editor/useCityPlannerEditor.ts) owns editor-only concerns:

- authoring history with undo/redo
- selection state for buildings and blocked zones
- transient drag/move previews
- overlay toggles for world, path, type, access, and bounds views
- blueprint load/save and apply/reset flows

### Planner data pipeline

The planner runs through explicit authoring stages under [`src/editor`](/C:/Users/willi/Downloads/remix_-aureus_-below%20(3)/src/editor):

- [`derive.ts`](/C:/Users/willi/Downloads/remix_-aureus_-below%20(3)/src/editor/derive.ts): derive an editable authoring scene from runtime state
- [`sceneMutations.ts`](/C:/Users/willi/Downloads/remix_-aureus_-below%20(3)/src/editor/sceneMutations.ts): pure building/zone edit operations
- [`validation.ts`](/C:/Users/willi/Downloads/remix_-aureus_-below%20(3)/src/editor/validation.ts): footprint, overlap, and binding validation
- [`compiler.ts`](/C:/Users/willi/Downloads/remix_-aureus_-below%20(3)/src/editor/compiler.ts): compile authored data back into runtime buildings, NPC bindings, and navigation zones
- [`storage.ts`](/C:/Users/willi/Downloads/remix_-aureus_-below%20(3)/src/editor/storage.ts): browser persistence for saved blueprints

That split is deliberate: the planner can mutate authoring state aggressively without contaminating the runtime game model until the user explicitly applies the result.

## Save and Session Model

[`src/game/save.ts`](/C:/Users/willi/Downloads/remix_-aureus_-below%20(3)/src/game/save.ts) stores a versioned save envelope in localStorage:

- current key: `aureus-save-v2`
- legacy fallback: `aureus-save-v1`
- payload: `{ version, savedAt, state }`

The save metadata itself is now shared via [`src/game/saveMetadata.json`](/C:/Users/willi/Downloads/remix_-aureus_-below%20(3)/src/game/saveMetadata.json) so the app layer and regression harness do not drift on key/version constants.

Why this matters:

- startup can show a save preview on the title screen
- autosave can remain best-effort and schema migration-friendly
- browser-based smoke tests can seed or mutate exact states without going through UI setup every time

## UI Shell Layers

The shell wraps scene content with persistent meta-surfaces:

- [`Header.tsx`](/C:/Users/willi/Downloads/remix_-aureus_-below%20(3)/src/components/Header.tsx): resources, meters, world-effect chips, utility entry
- [`SideNavPanel.tsx`](/C:/Users/willi/Downloads/remix_-aureus_-below%20(3)/src/components/SideNavPanel.tsx): fast scene navigation and market entry
- [`TutorialOverlay.tsx`](/C:/Users/willi/Downloads/remix_-aureus_-below%20(3)/src/components/TutorialOverlay.tsx): FTUE directives
- [`ActionLogPanel.tsx`](/C:/Users/willi/Downloads/remix_-aureus_-below%20(3)/src/components/ActionLogPanel.tsx): recent notifications as history
- [`DebugPanel.tsx`](/C:/Users/willi/Downloads/remix_-aureus_-below%20(3)/src/components/DebugPanel.tsx): FPS/state-update/last-action telemetry
- [`UtilityDrawer.tsx`](/C:/Users/willi/Downloads/remix_-aureus_-below%20(3)/src/components/UtilityDrawer.tsx): meta tools
- [`NotificationOverlay.tsx`](/C:/Users/willi/Downloads/remix_-aureus_-below%20(3)/src/components/NotificationOverlay.tsx): blocking high-visibility notifications

The important rule here is that shell state should not own game rules. It only opens, closes, and routes.

## Testing and Verification

### Static verification

- `npm run lint` runs `tsc --noEmit`
- `npm run build` validates the Vite production bundle

### Browser regression

[`scripts/smoke-regression.mjs`](/C:/Users/willi/Downloads/remix_-aureus_-below%20(3)/scripts/smoke-regression.mjs) is the current end-to-end sanity check. It boots a local Vite server and verifies:

- title screen boot with no-save messaging
- new-game flow into FTUE and the world scene
- analog-stick movement persisting into the versioned save
- mine scene entry from side navigation
- save continuity after scene transitions

The script mutates versioned save envelopes directly between scenarios. That is intentional, because forcing every regression path through long narrative setup would make the suite too slow and too brittle.

## Current Debt That Still Matters

The architecture is cleaner than before, but not finished:

- [`src/App.tsx`](/C:/Users/willi/Downloads/remix_-aureus_-below%20(3)/src/App.tsx) is still the central conductor and can be split further if scene wiring keeps growing.
- Notification overlay behavior is currently modal and timer-driven only. That is fine for now, but it can slow automation and player input if overused.
- World rendering and interaction still carry the heaviest complexity concentration; that stack should be treated as a performance-sensitive subsystem, not casual feature turf.
- There is still no dedicated reducer/state-machine layer; rule modules are the current control mechanism. That is acceptable while the domain remains understandable, but it should be watched.

## Decision Rule For Future Work

When adding features, prefer this sequence:

1. Extend `GameState` only if the data truly belongs in the saveable game model.
2. Put rule changes in pure game modules first.
3. Add or adjust hooks only for continuous runtime behavior.
4. Let scene/view-model components consume derived results instead of inventing their own copies of domain logic.
5. Extend the smoke regression if the feature changes a critical path or route gate.

That keeps the game shippable instead of slowly turning it back into one giant accidental script.
