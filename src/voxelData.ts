export const PLAYER_HOUSE_VOXELS = [
  // --- FLOOR 1 (Base 6x6) ---
  // Foundation & Floor
  ...Array.from({ length: 36 }).map((_, i) => ({
    id: i,
    x: (i % 6) - 3,
    y: Math.floor(i / 6) - 3,
    z: 0,
    c: "#2c3e50"
  })),
  // Walls (Height 1-3)
  ...[1, 2, 3].flatMap(z => 
    Array.from({ length: 20 }).map((_, i) => {
      let x, y;
      if (i < 6) { x = i - 3; y = -3; }
      else if (i < 11) { x = 2; y = i - 8; }
      else if (i < 16) { x = 7 - i; y = 2; }
      else { x = -3; y = 17 - i; }
      return { id: 100 + z * 100 + i, x, y, z, c: "#2c3e50" };
    })
  ),
  // Door (Hole - removed voxels)
  // { id: 500, x: 0, y: -3, z: 1, c: "#e67e22" },
  // { id: 501, x: 0, y: -3, z: 2, c: "#e67e22" },
  // { id: 502, x: 0, y: -3, z: 3, c: "#e67e22" },
  
  // Windows (Yellow Glow)
  { id: 502, x: -2, y: -3, z: 2, c: "#f1c40f" },
  { id: 503, x: 2, y: -3, z: 2, c: "#f1c40f" },
  { id: 504, x: 0, y: 2, z: 2, c: "#f1c40f" },

  // --- FLOOR 2 (Balcony & Tower) ---
  // Balcony Floor (Grey)
  ...Array.from({ length: 36 }).map((_, i) => ({
    id: 600 + i,
    x: (i % 6) - 3,
    y: Math.floor(i / 6) - 3,
    z: 4,
    c: "#95a5a6"
  })),
  // Tower Walls (4x4, Height 5-7)
  ...[5, 6, 7].flatMap(z => 
    Array.from({ length: 12 }).map((_, i) => {
      let x, y;
      if (i < 4) { x = i - 2; y = -2; }
      else if (i < 7) { x = 1; y = i - 5; }
      else if (i < 10) { x = 5 - i; y = 1; }
      else { x = -2; y = 11 - i; }
      return { id: 700 + z * 100 + i, x, y, z, c: "#34495e" };
    })
  ),
  // Tower Windows
  { id: 1100, x: 0, y: -2, z: 6, c: "#f1c40f" },
  { id: 1101, x: 0, y: 1, z: 6, c: "#f1c40f" },

  // --- ROOF & ACCENTS ---
  // Main Roof (Red)
  ...Array.from({ length: 16 }).map((_, i) => ({
    id: 1200 + i,
    x: (i % 4) - 2,
    y: Math.floor(i / 4) - 2,
    z: 8,
    c: "#c0392b"
  })),
  // Neon Strips (Turquoise)
  { id: 1300, x: -3, y: -3, z: 1, c: "#1abc9c" },
  { id: 1301, x: -3, y: -3, z: 2, c: "#1abc9c" },
  { id: 1302, x: -3, y: -3, z: 3, c: "#1abc9c" },
  { id: 1303, x: 2, y: -3, z: 1, c: "#1abc9c" },
  { id: 1304, x: 2, y: -3, z: 2, c: "#1abc9c" },
  { id: 1305, x: 2, y: -3, z: 3, c: "#1abc9c" },
  // Antenna on top
  { id: 1400, x: 0, y: 0, z: 9, c: "#7f8c8d" },
  { id: 1401, x: 0, y: 0, z: 10, c: "#7f8c8d" },
  { id: 1402, x: 0, y: 0, z: 11, c: "#e74c3c" } // Red light on top
];

export const OFFICE_VOXELS = [
  // Walls
  { "id": 0, "x": -2, "y": -2, "z": 0, "c": "#808080" },
  { "id": 1, "x": -2, "y": 2, "z": 0, "c": "#808080" },
  { "id": 2, "x": 2, "y": -2, "z": 0, "c": "#808080" },
  { "id": 3, "x": 2, "y": 2, "z": 0, "c": "#808080" },
  // Door
  { "id": 4, "x": 0, "y": -2, "z": 0, "c": "#4b2c20" },
  { "id": 5, "x": 0, "y": -2, "z": 1, "c": "#4b2c20" },
  // Roof
  { "id": 6, "x": 0, "y": 0, "z": 2, "c": "#3b2f2f" }
];

export const PUB_VOXELS = [
  // Walls
  { "id": 0, "x": -3, "y": -3, "z": 0, "c": "#a52a2a" },
  { "id": 1, "x": -3, "y": 3, "z": 0, "c": "#a52a2a" },
  { "id": 2, "x": 3, "y": -3, "z": 0, "c": "#a52a2a" },
  { "id": 3, "x": 3, "y": 3, "z": 0, "c": "#a52a2a" },
  // Windows
  { "id": 4, "x": -3, "y": 0, "z": 1, "c": "#add8e6" },
  { "id": 5, "x": 3, "y": 0, "z": 1, "c": "#add8e6" },
  // Roof
  { "id": 6, "x": 0, "y": 0, "z": 3, "c": "#8b4513" }
];
