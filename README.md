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

- **Layered scene flow** — Move between the world map, office directory/interiors, the 2D mine board, and the 3D mine shaft from one shared game state
- **Developer world editor** — A dev-only City Planner can author buildings and blocked zones, validate them, and apply the compiled layout back into the runtime
- **6 unique NPCs** — Each with schedule windows, dialogue branches, leverage hooks, and route-closing political choices
- **Permit progression chain** — Multi-step permits, a form-processing minigame, and approval pressure from dialogue and run-cycle actions
- **Three mining sites** — Iron Vein, Deep Hollow, and Abyssal Reach with prospecting, operational mining, stability hazards, and equipment upgrades
- **Run-cycle operations layer** — Secure, prepare, execute, resolve, and route phases surfaced through office-side operation actions and route tracking panels
- **Dynamic economy and world effects** — Export pricing, daily upkeep, audits/subsidies, and temporary effects such as Bureau Pull, Market Insight, Community Backing, and Media Heat
- **Three route-gated endings** — Bureau Tycoon, People's Champion, and Shadow Broker depend on both meters and irreversible political alignments
- **Title screen and autosave** — New Game / Continue boot flow with versioned LocalStorage save envelopes and legacy save fallback

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
│   ├── components/
│   │   ├── GameSceneRouter.tsx      # Lazy scene routing for world, office, mine, shaft, planner
│   │   ├── WorldScene.tsx           # Main explorable voxel town
│   │   ├── OfficeScene.tsx          # Directory, building interiors, operation panels
│   │   ├── MineScene.tsx            # 2D mining board and equipment controls
│   │   ├── MineWorldScene.tsx       # 3D shaft scene
│   │   ├── StartScreen.tsx          # New Game / Continue boot flow
│   │   ├── RunCyclePanel.tsx        # Secure/prepare/execute/resolve/route guidance
│   │   ├── PoliticalPositionPanel.tsx
│   │   ├── cityPlanner/             # Planner canvas, sidebar, inspector
│   │   └── ...                      # HUD, overlays, debug, utility, notifications
│   ├── editor/                      # Authoring compiler, validation, mutations, history
│   ├── game/
│   │   ├── actions/                 # Permit, mine, dialogue, evidence mutations
│   │   ├── dialogue/                # Dialogue commands, flags, status, effects
│   │   ├── economy.ts               # Export, audits, upkeep
│   │   ├── runCycle.ts              # Operation desk phase logic and actions
│   │   ├── save.ts                  # Versioned LocalStorage envelopes
│   │   └── session.ts               # Initial state and save hydration
│   ├── hooks/
│   │   ├── app/                     # Startup/session/chrome hooks
│   │   ├── editor/                  # City planner state orchestration
│   │   └── game/                    # Runtime loop hooks
│   ├── utils/                       # Pathfinding, surface maps, access helpers, voxel constants
│   ├── App.tsx                      # Root orchestration shell
│   ├── data.ts                      # Authored game content and world layout
│   ├── types.ts                     # Canonical game and world types
│   └── main.tsx                     # React entry point
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

The current client is organized around one serialized `GameState` and a few explicit boundaries:

1. **Shell orchestration** — `src/App.tsx` wires scenes, overlays, notifications, startup flow, and tracked actions without owning the low-level rules.
2. **Game rules** — `src/game/` holds permit, mining, dialogue, economy, run-cycle, ending, and save/session logic.
3. **Scene surfaces** — `src/components/` contains the world, office, mine, shaft, and overlay UIs, routed through `GameSceneRouter.tsx`.
4. **Authoring pipeline** — `src/editor/` plus `src/hooks/editor/useCityPlannerEditor.ts` lets the dev-only planner derive, mutate, validate, and compile world layouts back into runtime data.

Save data is currently stored as a versioned LocalStorage envelope under `aureus-save-v2`, with fallback loading from `aureus-save-v1`.

For the implementation-level breakdown, see [`docs/game-architecture.md`](docs/game-architecture.md).

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

- [`docs/engine-guide.md`](docs/engine-guide.md) — Engineer-facing guide to file structure, boot flow, state flow, scenes, loops, voxel rendering, save/load, and planner pipeline
- [`docs/game-architecture.md`](docs/game-architecture.md) — Runtime architecture, state boundaries, scene routing, editor pipeline, save model, and verification notes
- [`progress.md`](progress.md) — Chronological development log, refactor history, and validation notes

---

## License

This workspace snapshot does not currently include a checked-in `LICENSE` file, so the effective license should be confirmed before redistribution.
