<div align="center">

# Aureus Bureaucracy

**A satirical bureaucracy and negotiation simulator set in a corporate mining dystopia.**

Navigate permits, corruption, and strange NPCs to expand your underground empire.

[![React](https://img.shields.io/badge/React-19-61dafb?logo=react)](https://react.dev)
[![Three.js](https://img.shields.io/badge/Three.js-0.183-black?logo=threedotjs)](https://threejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178c6?logo=typescript)](https://www.typescriptlang.org)
[![Vite](https://img.shields.io/badge/Vite-6.2-646cff?logo=vite)](https://vite.dev)
[![License](https://img.shields.io/badge/License-Apache_2.0-blue)](./LICENSE)

</div>

---

## Table of Contents

- [About the Game](#about-the-game)
- [Features](#features)
- [Getting Started](#getting-started)
- [Project Structure](#project-structure)
- [Tech Stack](#tech-stack)
- [Game Mechanics](#game-mechanics)
  - [Daily Cycle](#daily-cycle)
  - [Permit System](#permit-system)
  - [Mining](#mining)
  - [Economy](#economy)
  - [NPC Relationships](#npc-relationships)
  - [Story Routes & Endings](#story-routes--endings)
- [Architecture](#architecture)
- [Scripts](#scripts)
- [Documentation](#documentation)
- [License](#license)

---

## About the Game

Aureus Bureaucracy is a browser-based strategy game that blends dialogue-driven negotiation, resource management, and voxel-world exploration. You play as a prospector navigating a labyrinthine corporate mining town — filing permits, bribing officials, forging alliances, and digging for ore — all while three competing metrics (Trust, Influence, and Exposure) shape your story toward one of **three distinct endings**.

The game is rendered in an isometric 3D voxel style using Three.js, with a full React UI for dialogue, menus, and HUD overlays.

---

## Features

- **Isometric 3D Voxel World** — Explore a procedurally generated town with 30+ buildings, day/night lighting, and physics
- **6 Unique NPCs** — Each with their own personality, schedule, dialogue trees, vulnerabilities, and leverage mechanics
- **Branching Dialogue System** — Conversations change based on trust, influence, story flags, time of day, and discovered items
- **Permit Progression Chain** — 10+ permits with a form-filling mini-game, NPC negotiation bonuses, and unlock dependencies
- **3 Mining Sites** — Progressive difficulty (Iron Vein → Deep Hollow → Abyssal Reach) with tile stability, hazards, and equipment upgrades
- **Dynamic Economy** — Daily overhead, ore export with exposure risk, audit/aid checks, and world effect modifiers
- **3 Ending Routes** — Bureau Tycoon, People's Champion, or Shadow Broker — determined by your choices and meter levels
- **Story Flags** — 11 flags gate exclusive content and lock/unlock ending paths
- **Tutorial & Progression Guide** — Step-by-step onboarding with real-time hints
- **Save System** — Auto-persist progress to browser LocalStorage

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or later recommended)

### Installation

```bash
# Clone the repository
git clone https://github.com/Looping69/Aureus-bureaucracy-.git
cd Aureus-bureaucracy-

# Install dependencies
npm install
```

### Run the Development Server

```bash
npm run dev
```

The app will be served at **http://localhost:3000**.

### Build for Production

```bash
npm run build     # Outputs to dist/
npm run preview   # Preview the production build locally
```

---

## Project Structure

```
├── src/
│   ├── components/            # 24 React UI components
│   │   ├── GameSceneRouter    # Scene routing (World, Mine, Office, City Planner)
│   │   ├── WorldScene         # Main isometric world with building interaction
│   │   ├── MineScene          # Mining tile-grid interface
│   │   ├── OfficeScene        # Office exploration mini-scene
│   │   ├── DialogueOverlay    # NPC conversation UI
│   │   ├── PermitOverlay      # Permit management
│   │   ├── FormMiniGame       # Permit form-filling mini-game
│   │   ├── Header / BottomNav # HUD: money, ore, energy, time, meters
│   │   └── ...                # Overlays, panels, modals, start screen
│   ├── game/
│   │   ├── actions/           # State mutation handlers
│   │   │   ├── permitActions  # Permit submission & approval logic
│   │   │   ├── mineActions    # Mining tile interactions & equipment
│   │   │   ├── dialogueActions# Relationship consequence handlers
│   │   │   └── evidenceActions# Item discovery & photo evidence
│   │   ├── dialogue/          # Dialogue engine
│   │   │   ├── specialOptions # NPC-specific branching options
│   │   │   ├── storyFlags     # Story flag management & route locks
│   │   │   ├── status         # NPC availability & mood by time
│   │   │   └── worldEffects   # Temporary world state modifiers
│   │   ├── economy            # Daily costs, exports, audits, aid
│   │   ├── exhaustion         # Energy collapse mechanic
│   │   ├── endings            # 3 ending routes with condition checks
│   │   ├── objectives         # Objective completion helpers
│   │   ├── permitProgression  # Permit unlock chains
│   │   ├── progressionGuide   # Real-time hint engine
│   │   └── save               # LocalStorage persistence
│   ├── hooks/
│   │   └── game/              # Game loop hooks (movement, time, events, etc.)
│   ├── utils/                 # Greedy mesher, pathfinding, world generation
│   ├── VoxelEngine            # Three.js scene, camera, lighting, physics
│   ├── EntityManager          # Building/NPC entity lifecycle
│   ├── VoxelBuilding / VoxelCharacter / VoxelObject
│   ├── App.tsx                # Root component & game state orchestration
│   ├── data.ts                # All game data (NPCs, permits, mines, dialogue)
│   ├── types.ts               # TypeScript interfaces
│   └── main.tsx               # React entry point
├── docs/
│   └── game-architecture.md   # Technical architecture reference
├── scripts/
│   └── smoke-regression.mjs   # Playwright smoke tests
├── index.html                 # HTML entry point
├── vite.config.ts             # Vite build configuration
├── tsconfig.json              # TypeScript configuration
└── package.json
```

---

## Tech Stack

| Technology | Version | Purpose |
|---|---|---|
| [React](https://react.dev) | 19 | UI framework |
| [TypeScript](https://www.typescriptlang.org) | 5.8 | Type safety |
| [Three.js](https://threejs.org) | 0.183 | 3D voxel rendering |
| [React Three Fiber](https://docs.pmnd.rs/react-three-fiber) | 9.5 | React renderer for Three.js |
| [React Three Drei](https://github.com/pmndrs/drei) | 10.7 | Three.js helpers & utilities |
| [Cannon-es](https://pmndrs.github.io/cannon-es/) | 0.20 | Physics simulation |
| [Motion](https://motion.dev) | 12.23 | UI animations |
| [Tailwind CSS](https://tailwindcss.com) | 4.1 | Utility-first styling |
| [Lucide React](https://lucide.dev) | 0.546 | Icon library |
| [Vite](https://vite.dev) | 6.2 | Build tool & dev server |
| [Playwright](https://playwright.dev) | 1.56 | Smoke regression testing |

---

## Game Mechanics

### Daily Cycle

Time progresses continuously from 0:00 to 24:00 each in-game day. NPCs follow work schedules and become unavailable outside their hours. A day/night lighting cycle affects the world (day: 6:00–20:00, night: 20:00–6:00). Daily overhead costs are deducted at the start of each day, and audit/aid checks run based on your Exposure and Trust meters.

If your energy reaches zero you collapse, are teleported home, fined **$200**, and wake up the next morning.

### Permit System

Permits unlock in a dependency chain — each requiring the previous one to be approved:

```
Extraction Intent ($50) → Prospecting License ($150) → Mining Permit: Iron Vein ($500)
  → Prospecting: Deep ($300) → Mining: Deep ($1,200)
    → Prospecting: Abyss ($1,000) → Mining: Abyss + additional permits
```

Filing a permit involves a **form-filling mini-game** (accuracy slider 0–100%). NPC negotiations can unlock bonuses: cost discounts, faster processing, or intel on future permits.

### Mining

Three mines with progressive difficulty:

| Mine | Grid | Ore Yield | Danger |
|---|---|---|---|
| Iron Vein Outpost | 5 × 10 | 30% | Low |
| Deep Hollow | 8 × 15 | 50% | Medium |
| Abyssal Reach | 10 × 20 | 80% | Extreme |

Each mine starts in **Prospecting** mode (survey tiles, limited samples) and transitions to **Operational** once the corresponding mining permit is approved. Tiles have stability values — weak tiles trigger hazard collapses that cost energy and money. Equipment upgrades (Safety Kit, Ore Scanner) mitigate risks and reveal hidden veins.

### Economy

| Income | Amount |
|---|---|
| Ore export (unlicensed) | $120/unit |
| Ore export (licensed) | $160/unit |
| Market Insight bonus | +$30/unit |

| Expense | Amount |
|---|---|
| Daily overhead | $35 + $12/upgrade + $25/active mine |
| Compliance audit fine | $80 + (exposure × ~2.5) |
| Community backing | −$20 overhead |

### NPC Relationships

Six NPCs populate the world, each with unique personalities and agendas:

| NPC | Role | Key Trait |
|---|---|---|
| **Officer Vane** | Licensing Bureau | Insecure — seeks recognition |
| **Big Sal** | Union Boss | Enrichment-driven deal maker |
| **Inspector Krell** | Safety Inspector | Robotic compliance enforcer |
| **Slink** | Fixer | Chaotic black-market agent |
| **Elena Vox** | Journalist | Truth/clicks seeker |
| **Chief Okon** | Community Leader | Dignified protector of locals |

Three meters track your standing:

- **Trust (0–100)** — Built through honest dealings and community investment
- **Influence (0–100)** — Gained via negotiations and leveraging vulnerabilities
- **Exposure (0–100)** — Rises with illicit exports, audit evasion, and media attention

Discover NPC vulnerabilities through dialogue and office exploration. Use leverage to force favors — but beware of consequences.

### Story Routes & Endings

Your choices and meter levels determine which of three endings you reach:

| Ending | Key Requirements |
|---|---|
| **Bureau Tycoon** | $12,000+ savings, Vane backchannels, press controlled, no reform alliance |
| **People's Champion** | Trust ≥ 85, Influence ≥ 70, Exposure < 35, community pact + reform alliance |
| **Shadow Broker** | Influence ≥ 75, Exposure ≥ 85, total leverage ≥ 120, fixer ties, no reform |

Eleven story flags gate exclusive content and lock/unlock these paths — choices are permanent and shape the narrative.

---

## Architecture

The game follows a **three-layer architecture**:

1. **Presentation** — 24 React components handle the UI, HUD overlays, and Three.js canvas integration. Scenes are lazy-loaded for performance.
2. **Logic** — Game modules under `src/game/` manage permits, mining, dialogue, economy, story flags, and progression. State mutations flow through action handlers.
3. **Data** — A single `GameState` object is persisted to LocalStorage (`aureus-save-v1`). All game data (NPCs, permits, mines, buildings, dialogue trees) is defined in `src/data.ts`.

The voxel engine (`src/VoxelEngine.ts`) manages the Three.js scene with a greedy mesher for terrain optimization, instanced rendering for buildings, A* pathfinding for player movement, and a day/night lighting system.

For a deeper technical reference, see [`docs/game-architecture.md`](docs/game-architecture.md).

---

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start the Vite dev server on port 3000 |
| `npm run build` | Production build (outputs to `dist/`) |
| `npm run preview` | Preview the production build locally |
| `npm run clean` | Delete the `dist/` directory |
| `npm run lint` | TypeScript type-check (`tsc --noEmit`) |
| `npm run smoke:regression` | Run Playwright smoke regression tests |

---

## Documentation

- [`docs/game-architecture.md`](docs/game-architecture.md) — Technical architecture, core game loop, world generation, isometric rendering
- [`progress.md`](progress.md) — Development log with refactoring milestones and gameplay audits

---

## License

This project is licensed under the [Apache License 2.0](https://www.apache.org/licenses/LICENSE-2.0).
