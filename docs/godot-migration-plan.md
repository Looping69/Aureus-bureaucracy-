# Godot Migration Plan

## Decision

This project should move to Godot.

The current codebase already contains real game-engine responsibilities:

- world rendering and camera runtime
- simulation loops and time progression
- world navigation and pathfinding
- scene transitions
- gameplay state mutation systems
- authored content and progression logic

React has been useful for proving the design, but it is now the wrong long-term host for the game runtime. We should preserve game rules, content, world layout, and authored flow while replacing the rendering/runtime shell.

## What Must Be Preserved

These are the assets of real value and should survive the migration:

1. Core game premise and scene structure
   - world exploration
   - office/bureau interactions
   - permit flow
   - mine gameplay
   - route/endings structure

2. Authored game content
   - NPCs
   - buildings
   - permits
   - mines
   - dialogue trees and special actions
   - world profiles
   - story flags
   - endings

3. Game rules and progression
   - session boot and world-profile initialization
   - permit progression
   - economy rules
   - mine interaction rules
   - dialogue/world-effect consequences
   - FTUE and objective progression
   - time/weather/event loops

4. Tooling worth keeping conceptually
   - layout validation
   - smoke/regression thinking
   - planner/editor ideas

## What Should Not Be Ported Directly

These should be reimplemented, not translated line-by-line:

- React component tree
- hook-based runtime orchestration
- React scene routing
- React HUD/overlay wiring
- react-three-fiber container code
- browser-specific save/bootstrap assumptions

If we try to preserve the React architecture inside Godot, we will recreate the same mess in a new tool.

## Current Code Buckets

### Bucket A: Direct design references

Use these as source material, not as code to port literally:

- `src/App.tsx`
- `src/components/`
- `src/hooks/`
- `src/VoxelEngine.ts`

### Bucket B: Highest-value gameplay logic

These should be treated as migration anchors:

- `src/types.ts`
- `src/data.ts`
- `src/game/session.ts`
- `src/game/worldProfiles.ts`
- `src/game/economy.ts`
- `src/game/runCycle.ts`
- `src/game/permitProgression.ts`
- `src/game/objectives.ts`
- `src/game/navigationActions.ts`
- `src/game/sceneTransitions.ts`
- `src/game/endings.ts`
- `src/game/dialogue/`
- `src/game/actions/`

### Bucket C: Useful algorithms and supporting rules

- `src/utils/pathfinding.ts`
- `src/utils/worldNavigation.ts`
- `src/utils/worldSurface.ts`
- `src/utils/buildingAccess.ts`
- `src/game/npcNavigation.ts`
- `src/editor/`

## Recommended Godot Target Architecture

### 1. Autoload single source of truth

Create a `GameState` autoload that owns:

- player resources
- world time/day/weather
- permits
- NPC relationship state
- mines
- objectives
- story flags
- world effects
- route/endings state
- save/load serialization

This replaces the current React top-level orchestration.

### 2. Content-first data layer

Move authored content into Godot-friendly data files:

- `res://data/npcs/*.json`
- `res://data/permits/*.json`
- `res://data/mines/*.json`
- `res://data/dialogue/*.json`
- `res://data/world/buildings.json`
- `res://data/world/profiles.json`

Rules live in GDScript. Content lives in data.

That separation matters because the current project mixes authored content and execution too tightly.

### 3. Scene split

Use Godot scenes for runtime boundaries:

- `Main.tscn`
- `WorldScene.tscn`
- `OfficeScene.tscn`
- `MineBoardScene.tscn`
- `MineWorldScene.tscn`
- `UIShell.tscn`

Use a scene coordinator for transitions. Do not let UI directly mutate game rules everywhere.

### 4. Runtime systems

Implement focused Godot systems:

- `time_system.gd`
- `economy_system.gd`
- `permit_system.gd`
- `dialogue_system.gd`
- `mine_system.gd`
- `navigation_system.gd`
- `ending_system.gd`
- `save_system.gd`

### 5. UI as consumer, not owner

UI should read from state and dispatch explicit actions.

No effect soup. No scattered implicit mutations. No hidden ownership.

## Migration Strategy

### Phase 1: Freeze and inventory

Goal: stop digging the React hole deeper.

Actions:

1. Freeze new feature work in the React version except critical fixes.
2. Extract a migration checklist from the current game systems.
3. Define the canonical content inventory:
   - NPC roster
   - permits
   - mines
   - buildings
   - dialogue branches
   - world effects
   - endings
4. Decide Godot 4.4+ and GDScript unless a C# reason appears.

### Phase 2: Build the Godot foundation

Goal: create the replacement runtime skeleton before porting content.

Actions:

1. Create project structure.
2. Build `GameState` autoload.
3. Implement save/load.
4. Implement scene coordinator.
5. Build debug HUD and developer console hooks early.

### Phase 3: Port rules before visuals

Goal: preserve behavior with minimal art/runtime distraction.

Port in this order:

1. session boot
2. permits
3. economy
4. objectives and FTUE
5. dialogue actions and world effects
6. mine rules
7. ending conditions
8. world time/weather/event loops

At this stage, ugly but correct beats pretty but fake.

### Phase 4: Port the world

Goal: restore the explorable city and mine presentation in Godot.

Actions:

1. Recreate voxel/tile world rendering with Godot-native nodes/meshes.
2. Port movement and pathfinding.
3. Port NPC schedules and route behavior.
4. Recreate camera behavior in a Godot-native camera controller.
5. Rebuild interactive buildings, office entry, and mine entry points.

### Phase 5: Rebuild UI and flow

Goal: restore the play loop cleanly on top of the Godot runtime.

Actions:

1. title screen
2. save archive flow
3. HUD
4. dialogue overlays
5. permit UI
6. mine board UI
7. notifications and action log
8. endings presentation

### Phase 6: Regression parity

Goal: confirm the Godot build contains the game, not a vague cousin of it.

We need parity checks for:

- new game boot
- first permit flow
- first mine unlock
- ore extraction and export
- dialogue world effects
- at least one full ending route

## What "Everything We Have Done So Far" Actually Means

It does not mean every line of TypeScript survives.

It means the following survive:

- mechanics
- authored content
- progression structure
- world layout intent
- player flow
- route logic
- game feel targets

Some systems will improve during the move because Godot is a better home for them.

## Risks

1. Trying to port UI structure 1:1
   - This will slow everything down and preserve bad boundaries.

2. Porting rendering before game rules
   - This creates a pretty shell with missing behavior.

3. Keeping content trapped in code
   - Dialogue and authored content should become data-driven.

4. No parity checklist
   - Without this, the rewrite will drift and silently lose the game.

## Immediate Next Move

The right next move is:

1. scaffold the Godot project
2. define the canonical game-state schema
3. export/normalize authored content out of TypeScript-heavy structures
4. port session boot, permits, and economy first

That gives us a stable spine. Everything else attaches to that.
