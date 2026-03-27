# Game Architecture & Mechanics

This document outlines the technical architecture and core mechanics of the isometric voxel-based game.

## 1. The Core Game Loop

Unlike traditional game engines (like Unity or Godot) that run a dedicated `Update()` loop at a fixed framerate, this game leverages React's reconciliation and rendering cycle, supplemented by `requestAnimationFrame` for smooth animations and time-based updates.

### The React-Driven Loop
1.  **State Updates:** User interactions (mining, moving) trigger state updates (e.g., `setGameState`).
2.  **Reconciliation:** React calculates the difference between the old and new state.
3.  **Rendering:** React updates the DOM/Canvas elements to reflect the new state.

### Time-Based Updates
For continuous mechanics (like the Day/Night cycle), a `useEffect` hook acts as a ticker:
```typescript
useEffect(() => {
  const interval = setInterval(() => {
    setGameState(prev => ({ ...prev, time: (prev.time + 0.01) % 24 }));
  }, 1000); // Updates game time every second
  return () => clearInterval(interval);
}, []);
```

## 2. World Generation Engine

The world is generated using a 3D voxel grid, projected into 2D isometric space.

### Coordinate System
The world uses a 3D coordinate system: `(x, y, z)`.
*   **x, y:** Horizontal plane (ground).
*   **z:** Height (elevation/depth).

### Generation Process
1.  **Grid Initialization:** A 2D array of tiles is created based on the map size.
2.  **Elevation Mapping:** A noise function (e.g., Perlin noise) is used to assign a `z` value (height) to each `(x, y)` coordinate.
3.  **Tile Assignment:**
    *   `z > threshold`: Assigned as `ROCK` or `ORE`.
    *   `z == 0`: Assigned as `GRASS` or `DIRT`.
    *   `z < 0`: Assigned as `EMPTY` (water or void).

## 3. Core Mechanics

### Mining
Mining is an interaction between the player and a tile.
1.  **Interaction:** User clicks a tile.
2.  **Validation:** The system checks if the tile is reachable and mineable.
3.  **State Change:** The tile's `mined` property is set to `true`.
4.  **Resource Update:** The player's resource count (e.g., `state.ore`) is incremented.

### Day/Night Cycle
The cycle is a continuous float value from `0.0` to `24.0`.
*   **Time 6.0 - 20.0:** Day mode (bright lighting).
*   **Time 20.0 - 6.0:** Night mode (dark overlay, reduced visibility).

### Resource Management
Resources are tracked in the global `GameState`. Any action that consumes or produces resources triggers a state update, which propagates through the UI components to update the HUD.

## 4. Isometric Rendering

The game uses a CSS-based isometric projection to transform 3D coordinates into 2D screen space.

### Projection Formula
To map `(x, y, z)` to screen `(screenX, screenY)`:
*   `screenX = (x - y) * tileWidth / 2`
*   `screenY = (x + y) * tileHeight / 2 - z * tileHeight`

This projection is applied via CSS `transform` properties (e.g., `rotateX`, `rotateZ`, `skew`) to create the isometric perspective.
