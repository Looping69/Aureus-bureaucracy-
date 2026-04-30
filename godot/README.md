# Aureus Below Godot Runtime

This folder is the migration target for the game runtime.

The React app remains in the repo as the reference implementation while systems are ported. New feature work should move here unless a React-side fix is required to protect existing work during migration.

## Immediate goals

1. Establish the Godot runtime spine.
2. Port canonical game state and content definitions.
3. Rebuild core rules before rebuilding presentation.
4. Reach parity on the first playable loop:
   - new game boot
   - first permit flow
   - first mine unlock
   - ore extraction and export

## Folder layout

- `data/` canonical content and migration seed files
- `scenes/` Godot scenes
- `scripts/` runtime code and systems

## Current status

- project scaffolded
- `GameState` autoload created
- `SceneCoordinator` autoload created
- main scene created
- world profile and world effect seed data copied into Godot-friendly JSON
- permit, mine, and NPC seed data copied into Godot-friendly JSON
- deterministic mine-grid generation added to the Godot bootstrap path
- first permit progression system ported into GDScript
- save/load system added with slot metadata and user:// persistence
- saved-state hydration now restores FTUE/profile/session defaults instead of blindly trusting raw payloads
- core building/layout seed content added for the town hub
- objective and FTUE progression hooks now react to Bureau discovery, entry, dialogue, and Form 17-B flow
- daily economy tick, ore export, and pending permit processing now run in Godot-side systems

The runtime is intentionally thin right now. It exists to stop hand-waving and give the migration a real home.
