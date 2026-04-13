# Aureus Engine Guide

This document is the practical "how it actually runs" guide for the client. It is meant to help a new engineer understand the file structure, execution flow, and the split between gameplay rules, scene rendering, and shell orchestration.

Use this alongside [`game-architecture.md`](./game-architecture.md) when you need lower-level architectural notes.

## 1. Mental Model

The game is one React/Vite client with one canonical serialized `GameState`.

Everything else hangs off that:

- the shell decides which scene to show
- scenes render views of the current state
- action modules produce the next state
- runtime hooks advance continuous systems over time
- the save layer persists the same state model to LocalStorage

This is not a separate native "engine" with a separate gameplay runtime. The "engine" here is the combination of:

- the app shell in `src/App.tsx`
- the scene router in `src/components/GameSceneRouter.tsx`
- the rules layer in `src/game/`
- the voxel renderer stack in `src/components/VoxelWorldContainer.tsx` and `src/VoxelEngine.ts`
- the continuous update hooks in `src/hooks/game/`

## 2. File Structure

### Core runtime

- `src/App.tsx`
  The orchestration root. Owns live `GameState`, wires handlers, mounts overlays, and connects runtime hooks.
- `src/types.ts`
  Canonical state and domain types. If you want to know what the game can remember, start here.
- `src/data.ts`
  Authored game content and world layout: buildings, NPCs, permits, mines, dialogue content, and initial world data.

### Shell and scene policy

- `src/game/scenePolicy.ts`
  Shared scene-nav policy and renderable-scene fallback rules.
- `src/game/shellView.ts`
  Shared shell visibility rules such as compact FTUE HUD and meta-panel visibility.
- `src/hooks/app/useGameSession.ts`
  Boot flow, title screen actions, continue/new-game behavior, autosave wiring, and startup loading overlay lifecycle.
- `src/hooks/app/useAppChrome.ts`
  Local shell UI state: market, mine picker, utility drawer, nav panel, debug panel, action log.
- `src/hooks/app/useNotificationCenter.ts`
  Notification queue plus action-log fanout.

### Scenes

- `src/components/GameSceneRouter.tsx`
  Lazy-loads and mounts the active scene.
- `src/components/WorldScene.tsx`
  Main explorable town view, world interactions, bureau FTUE funnel, building prompts, analog movement overlay.
- `src/components/OfficeScene.tsx`
  Directory view, building interiors, permit access, operations desk, political-position panel, exploration entry.
- `src/components/MineScene.tsx`
  2D mining board, equipment, extraction/prospecting loop, mine-facing run-cycle panel.
- `src/components/MineWorldScene.tsx`
  3D shaft scene.
- `src/components/StartScreen.tsx`
  New Game / Continue / dev planner entry point.

### Gameplay rules

- `src/game/actions/`
  Focused mutation modules for permits, mining, dialogue consequences, and evidence discovery.
- `src/game/dialogue/`
  Dialogue command interpreter, route/story-flag logic, world effects, NPC status, and special options.
- `src/game/navigationActions.ts`
  Movement, travel, rest, and mine-entry state transitions.
- `src/game/sceneTransitions.ts`
  Legal scene transitions and building-entry helpers.
- `src/game/economy.ts`
  Export pricing, audit/subsidy behavior, daily economy tick.
- `src/game/runCycle.ts`
  High-level operation loop summary and office operation actions.
- `src/game/endings.ts`
  Ending forecasts and unlock checks.
- `src/game/session.ts`
  Initial state construction and save hydration.
- `src/game/save.ts`
  Versioned save envelope load/save utilities.
- `src/game/saveMetadata.json`
  Shared save key/version metadata for both runtime and smoke tests.

### Runtime loops

- `src/hooks/game/useMovementLoop.ts`
  Consumes path movement over time, drains energy, and resolves street pickups.
- `src/hooks/game/useTimeAndCurfewLoop.ts`
  Advances time and day-cycle behavior.
- `src/hooks/game/usePermitProcessingLoop.ts`
  Advances pending permit work over time.
- `src/hooks/game/useCityEventLoop.ts`
  Injects periodic city events.
- `src/hooks/game/useBuildingDiscovery.ts`
  Unlocks discoveries/objectives from state changes.
- `src/hooks/game/useTutorialProgression.ts`
  FTUE progression logic.
- `src/hooks/game/useFeedbackCleanup.ts`
  Cleans transient relationship feedbacks.

### World rendering stack

- `src/components/VoxelWorldContainer.tsx`
  React wrapper around the voxel renderer. Creates the engine, feeds it world state, and handles loading progress.
- `src/VoxelEngine.ts`
  Three.js-based renderer/input/runtime bridge for voxel scenes.
- `src/EntityManager.ts`
  Creates and manages building/NPC/player entities inside the engine.
- `src/utils/worldSurface.ts`
  Builds surface maps and terrain data used by movement and rendering.
- `src/utils/pathfinding.ts`
  Shared pathfinding.
- `src/utils/worldNavigation.ts`
  Building footprints, access points, blocking logic, and layout helpers.

### Dev planner / authoring pipeline

- `src/components/CityPlanner.tsx`
  Planner shell.
- `src/hooks/editor/useCityPlannerEditor.ts`
  Planner state orchestration: selection, drag, history, overlays, apply/reset/load flows.
- `src/editor/`
  Authoring derive -> mutate -> validate -> compile pipeline.

## 3. Boot Flow

This is the real entry path for a normal session:

1. `src/main.tsx` mounts `App`.
2. `App` creates a live `GameState` with `buildInitialGameState()`.
3. `useGameSession()` checks LocalStorage for a saved envelope.
4. If no run has started yet, `StartScreen` is shown.
5. New Game:
   - clears save data
   - builds a fresh initial state
   - enters session mode `"game"`
   - waits for the first heavy scene to finish booting
6. Continue:
   - loads saved data via `loadSavedGameState()`
   - hydrates it through `hydrateSavedState()`
   - starts session mode `"game"`
7. Dev planner from home:
   - builds a fresh state
   - sets `currentScene` to `CITY_PLANNER`
   - enters session mode `"planner-home"`

Key point: the title screen is not cosmetic. It is part of the session model.

## 4. Main Runtime Loop

There is no single giant game loop. The client uses multiple focused React hooks that each own one subsystem.

`App.tsx` mounts these hooks against the shared `setState`:

- `useMovementLoop`
- `useTimeAndCurfewLoop`
- `usePermitProcessingLoop`
- `useTutorialProgression`
- `useCityEventLoop`
- `useBuildingDiscovery`
- `useFeedbackCleanup`

That means the runtime works more like "small domain schedulers updating one shared state tree" than like a classical monolithic engine tick.

## 5. Scene Routing

Scene routing happens in `GameSceneRouter.tsx`.

The active scene comes from `state.currentScene`, but the router now uses `src/game/scenePolicy.ts` to decide the final renderable scene. That matters because:

- planner rendering is dev-gated
- the office surface acts as the default/fallback shell scene
- scene-nav metadata should not live in multiple UI components

Current scenes:

- `WORLD`
- `OFFICE`
- `MINE`
- `MINE_WORLD`
- `CITY_PLANNER` (dev only)

## 6. How Input Becomes State Changes

There are three major categories of state mutation.

### Immediate UI actions

Examples:

- select NPC
- open permit
- close overlay
- open utility drawer

These are small shell or interaction transitions, usually routed through handlers in `App.tsx` and helpers in `src/game/uiTransitions.ts`.

### Domain actions

Examples:

- mine a tile
- submit or fast-track a permit
- apply dialogue commands
- export ore
- rest

These should go through focused gameplay modules in `src/game/` or `src/game/actions/`.

This is the rule: if the change is game logic, it should not be invented inline in JSX.

### Continuous loop updates

Examples:

- movement along a path
- daily economy tick
- permit queue progress
- city events
- tutorial progression

These are produced by the runtime hooks under `src/hooks/game/`.

## 7. World / Voxel Engine Flow

The world scene is the heaviest render path.

### React side

`WorldScene.tsx` does the scene-specific orchestration:

- computes terrain voxels
- builds pickup voxels
- handles hover/selection state
- handles FTUE world funnel behavior
- drives analog-stick movement
- opens building prompts

It passes the heavy rendering work to `VoxelWorldContainer.tsx`.

### Container side

`VoxelWorldContainer.tsx`:

- creates the `VoxelEngine`
- loads initial voxels
- registers buildings and NPCs into the engine
- syncs time-of-day
- syncs player position/path/target state
- reports loading progress back to the shell

### Engine side

`VoxelEngine.ts` and `EntityManager.ts` own the Three.js runtime details:

- rendering
- camera
- world picking / hover / selection callbacks
- entity creation
- NPC movement initialization
- player positioning

Important boundary: React owns state truth. The voxel engine is a render/input adapter, not the source of gameplay truth.

## 8. Save / Load Model

Save data is stored in LocalStorage as an envelope:

```json
{
  "version": 2,
  "savedAt": "ISO timestamp",
  "state": { "...GameState..." }
}
```

Owned by:

- `src/game/save.ts`
- `src/game/saveMetadata.json`
- `src/game/session.ts`

Flow:

1. `saveGameState()` serializes the current state.
2. `useGameSession()` autosaves when session mode is `"game"`.
3. `loadSavedGameState()` reads the envelope.
4. `hydrateSavedState()` restores missing/default fields and handles layout/session edge cases.

Important detail: save hydration is where older saves are normalized, not in random UI components.

## 9. Mine Loop

The mine has two forms:

- `MINE`: the 2D tile-grid mine gameplay scene
- `MINE_WORLD`: the 3D shaft scene

Mine travel state is decided in `App.tsx` and `src/game/navigationActions.ts`.

The 2D mine loop works like this:

1. `MineScene.tsx` renders the active mine grid from `state.mines`.
2. Tile clicks call `onMine(tileId)`.
3. `App.tsx` routes that into `applyMineTileInteraction()`.
4. The result returns `{ nextState, notifications }`.
5. The app pushes notifications and commits the returned state.

The same pattern is used for mine actions like equipment purchase and export/wash/claim actions.

## 10. Office / Route Layer

The office scene is not just a menu.

It is where the player can:

- browse discovered buildings
- access permits
- enter offices/interiors
- start exploration
- use the operations desk
- inspect political alignment and locked routes

Important supporting modules:

- `src/game/officeViewModel.ts`
- `src/game/runCycle.ts`
- `src/game/dialogue/storyFlags.ts`
- `src/components/RunCyclePanel.tsx`
- `src/components/PoliticalPositionPanel.tsx`

This is where the higher-level campaign structure lives.

## 11. Planner Pipeline

The city planner is a dev-only authored-world tool.

Pipeline:

1. `derive.ts` creates an authoring scene from runtime state.
2. `sceneMutations.ts` performs edits.
3. `validation.ts` checks overlaps, bounds, bindings, and path validity.
4. `compiler.ts` compiles authored content back into runtime-friendly buildings, NPC bindings, and navigation zones.
5. `applyPlannerWorld()` commits the compiled result back into the live game state.

This is intentionally separate from core gameplay so authoring tools do not contaminate runtime rules.

## 12. Where To Change Things

If you need to change:

- a game rule: start in `src/game/` or `src/game/actions/`
- a scene layout or overlay: start in `src/components/`
- scene/nav visibility policy: start in `src/game/scenePolicy.ts` or `src/game/shellView.ts`
- world rendering or voxel behavior: start in `VoxelWorldContainer.tsx`, `VoxelEngine.ts`, or supporting world utils
- save behavior: start in `src/game/save.ts`, `src/game/saveMetadata.json`, and `src/game/session.ts`
- planner behavior: start in `src/hooks/editor/` and `src/editor/`

If you find yourself writing large chunks of business logic directly inside a scene component, you are probably putting the code in the wrong place.

## 13. Current Weak Spots

These are the structural seams to watch:

- `App.tsx` still carries too much orchestration knowledge
- scene policy is better now, but not every interaction flow is fully centralized
- the voxel stack remains the highest complexity concentration
- the build still warns about large chunks, especially the main bundle and `vendor-three`

That means the game is not structurally broken, but future drift will still start in shell orchestration and rendering-heavy world code if left unchecked.

## 14. Recommended Reading Order

For onboarding, read in this order:

1. `src/types.ts`
2. `src/App.tsx`
3. `src/components/GameSceneRouter.tsx`
4. `src/hooks/app/useGameSession.ts`
5. `src/game/session.ts`
6. `src/game/save.ts`
7. `src/game/navigationActions.ts`
8. `src/game/actions/`
9. `src/hooks/game/`
10. `src/components/WorldScene.tsx`
11. `src/components/VoxelWorldContainer.tsx`
12. `src/VoxelEngine.ts`

That path gets you from shell truth to gameplay truth to renderer truth without bouncing around blindly.
