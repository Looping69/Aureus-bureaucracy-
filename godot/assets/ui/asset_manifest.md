# Aureus UI Asset Manifest

This folder now separates MVP UI assets by runtime surface instead of leaving generated sprite names in the root.

## Root Screens

- `title_screen.png`
- `hub_screen.png`
- `dialogue_screen.png`
- `permit_screen.png`
- `mine_screen.png`

These filenames are referenced directly by `godot/scripts/mvp/mobile_mvp_scene.gd` and should stay stable unless that script is updated in the same change.

## Promoted Asset Groups

- `chrome/` - buttons, panels, frames, tabs, meters, toggles, labels, speech bubbles, and reusable HUD chrome.
- `icons/` - resource, action, navigation, status, route, economy, dialogue, and system icons needed by the MVP loop.
- `mine/` - mine board tile art, ore tiles, hazards, supports, scan pings, crates, and extraction-risk tiles.
- `permits/` - permit forms, stamps, fee tickets, filing tabs, notes, seals, clips, and office paper props.
- `dialogue/` - bureaucrat and office-character portrait assets for dialogue surfaces.
- `reference/` - renamed generated concept sheets kept as visual reference only; do not wire these directly into runtime UI.

## Naming Rules

- Use lowercase snake_case.
- Name assets by UI purpose, not generator output order.
- Keep reusable chrome generic.
- Keep content assets scoped by domain prefix: `permit_`, `mine_`, `portrait_`, `icon_`, or `action_`.
- Do not add raw `sprite_*.png` or `ChatGPT Image*.png` files to this directory.
