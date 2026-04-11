# Game Architecture & Mechanics

This document outlines the technical architecture and core mechanics of the isometric voxel-based game.

## 1. The Core Game Loop

The game combines React's reconciliation cycle with a `requestAnimationFrame`-based render loop in the `VoxelEngine`.

### React State Layer
1.  **State Updates:** User interactions trigger dispatches through a centralised game reducer (`GameProvider` / `useGameDispatch`).
2.  **Reconciliation:** React calculates the difference between the old and new state.
3.  **Rendering:** React updates DOM overlay elements (HUD, dialogue, permits) while the `VoxelEngine` handles the 3-D canvas independently.

### Three.js Render Loop
The `VoxelEngine` runs its own RAF loop (`animate()`) that handles:
- Player position interpolation (constant-speed XZ, instant Y snap)
- Smooth camera follow with separate XZ / Y damping coefficients
- Intro camera pull-back animation on startup
- Entity updates (NPC movement, walk cycles, day/night transitions)
- Physics stepping (cannon-es)

### Time-Based Updates
For continuous mechanics (like the Day/Night cycle), game hooks advance a fractional hour clock:
```typescript
// useTimeAndCurfewLoop advances state.time each interval tick
setGameState(prev => ({ ...prev, time: (prev.time + 0.01) % 24 }));
```

## 2. World Generation Engine

The world is generated using a 3D voxel grid, rendered with Three.js instanced meshes and a greedy mesher for terrain optimisation.

### Coordinate System
The world uses a 3D coordinate system: `(x, y, z)`.
*   **x, z:** Horizontal plane (ground) — mapped to the 240 × 240 world grid.
*   **y:** Height (elevation).

### Generation Process
1.  **Grid Initialisation:** A 240 × 240 tile grid is created (`WORLD_SIZE` in `voxelConstants.ts`).
2.  **City Layout:** A coarse cell-based planner places buildings, roads, sidewalks, and parks on non-overlapping cells with occupancy validation (`data.ts`, `cityLayout.ts`).
3.  **Surface Height:** Each tile stores a surface height value used for terrain rendering and player Y positioning (`worldSurface.ts`).
4.  **Terrain Meshing:** The `GreedyMesher` combines adjacent same-colour voxels into larger quads to reduce draw-call count.

## 3. Core Mechanics

### Mining
Mining uses a carry-and-unload mechanic:
1.  **Interaction:** Player stands at an extraction node; the WORKING animation plays.
2.  **Gathering:** Ore blocks visually stack on the character's back (up to `MAX_CARRY = 6`).
3.  **Depositing:** Walk to the warehouse for a one-by-one visual unload sequence.
4.  **Resource Update:** The player's ore count increments on deposit.
Equipment upgrades (Safety Kit, Ore Scanner) reduce hazard costs and reveal hidden veins.

### Day/Night Cycle
The cycle is a continuous float value from `0.0` to `24.0`.
*   **Time 5.0 – 7.0:** Dawn transition.
*   **Time 7.0 – 17.0:** Full day (bright lighting, long fog distance).
*   **Time 17.0 – 19.0:** Dusk transition.
*   **Time 19.0 – 5.0:** Night (reduced lighting, compressed fog, street-lights active).

### Resource Management
Resources are tracked in the centralised `GameState`. Any action that consumes or produces resources triggers a state update, which propagates through the UI to update the HUD.

## 4. 3D Rendering Pipeline

The game uses Three.js WebGL rendering for real-time 3D isometric visualisation.

### Camera Setup
- **Type:** `THREE.PerspectiveCamera` with `OrbitControls`.
- **FOV:** 50° · **Near:** 0.5 · **Far:** 2000.
- **Follow Camera:** Locks onto the player position with smooth damping (XZ coefficient 22, Y coefficient 14).
- **Isometric Lock:** Azimuth fixed at π/4 (45°), polar angle fixed at ~55.77°. Rotation and pan are disabled.
- **Zoom Range:** 10 – 100 world units from target.
- **Intro Animation:** On scene load the camera starts at a close-up distance (8 units) focused on the player character and smoothly pulls back to the normal isometric offset over ~3 seconds using a quartic ease-out curve.  The world scene initialises in async stages with `requestAnimationFrame` yields between heavy steps so the loading screen stays responsive and the GPU can compile shaders before the scene is revealed.

### Rendering Architecture
- **Renderer:** `THREE.WebGLRenderer` with PCF shadow maps (4096 × 4096).
- **Terrain:** Greedy-meshed `InstancedMesh` for efficient voxel rendering.
- **Buildings:** Per-building voxel meshes managed by `EntityManager`.
- **Entities:** `VoxelCharacter` (player & NPCs) with IDLE / WALKING / WORKING animation states.
- **Lighting:** Ambient + Directional + Hemisphere lights driven by the day/night cycle.
- **Fog:** Dynamic near/far distances (day 120–280, night 80–220) with colour blending.
- **Sky:** Procedural sky dome with sun/moon orbit.
- **Edge Decorations:** Background motifs from `background.json` create a distant cityscape horizon.
