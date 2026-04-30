# Canonical Game State Schema

This schema is the Godot-side source of truth for the migration runtime.

## State slices

### Resources

- `money: int`
- `ore: int`
- `evidence: int`
- `energy: int`
- `max_energy: int`
- `movement_speed: float`
- `upgrades: Array[String]`
- `dirt_items: Array[Dictionary]`
- `leverage_tokens: Array[String]`

### Meters

- `meters.trust: int`
- `meters.influence: int`
- `meters.exposure: int`

### Progression

- `permits: Dictionary[String, Dictionary]`
- `npcs: Dictionary[String, Dictionary]`
- `known_npc_ids: Array[String]`
- `objectives: Array[Dictionary]`
- `mines: Array[Dictionary]`
- `active_mine_id: String`
- `unlocked_endings: Array[String]`

### Interaction

- `active_scene: String`
- `active_npc_id: String`
- `active_permit_id: String`
- `active_building_id: String`
- `active_mini_game: String`
- `pending_permit_action: String`
- `active_ending_id: String`

### World

- `profile_id: String`
- `profile_title: String`
- `day: int`
- `time: float`
- `weather: Dictionary`
- `discovered_building_ids: Array[String]`
- `navigation_zones: Array[Dictionary]`
- `player_pos: Dictionary`
- `target_pos: Variant`
- `path: Array[Dictionary]`

### Narrative

- `feedbacks: Array[Dictionary]`
- `player_feedbacks: Array[Dictionary]`
- `dialogue_cooldowns: Dictionary[String, float]`
- `world_effects: Dictionary[String, float]`
- `story_flags: Array[String]`
- `last_city_event_hour: int`

### FTUE

- `ftue_phase: String`
- `tutorial_step: int`
- `tutorial_minimized: bool`

## Notes

- Dictionaries are temporary migration carriers while systems are still being ported.
- Once parity is stable, high-churn entities can become Resources or typed wrapper classes.
- The rule is simple: UI reads this state, systems mutate it, content seeds it.
