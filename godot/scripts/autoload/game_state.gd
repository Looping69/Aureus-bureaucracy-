extends Node

const WORLD_PROFILES_PATH := "res://data/bootstrap/world_profiles.json"
const WORLD_EFFECTS_PATH := "res://data/bootstrap/world_effects.json"
const SAVE_METADATA_PATH := "res://data/bootstrap/save_metadata.json"
const PERMITS_PATH := "res://data/content/permits.json"
const MINES_PATH := "res://data/content/mines.json"
const NPCS_PATH := "res://data/content/npcs.json"
const BUILDINGS_PATH := "res://data/content/buildings.json"
const DIALOGUE_PATHS := {
	"licensing": "res://data/dialogue/licensing.json",
	"union": "res://data/dialogue/union.json",
	"inspector": "res://data/dialogue/inspector.json",
	"fixer": "res://data/dialogue/fixer.json",
	"journalist": "res://data/dialogue/journalist.json",
	"chief": "res://data/dialogue/chief.json",
}
const PermitSystemScript = preload("res://scripts/systems/permit_system.gd")
const FtueSystemScript = preload("res://scripts/systems/ftue_system.gd")
const SaveSystemScript = preload("res://scripts/systems/save_system.gd")
const WorldSystemScript = preload("res://scripts/systems/world_system.gd")
const ProgressionSystemScript = preload("res://scripts/systems/progression_system.gd")
const DialogueSystemScript = preload("res://scripts/systems/dialogue_system.gd")
const OfficeSystemScript = preload("res://scripts/systems/office_system.gd")
const EconomySystemScript = preload("res://scripts/systems/economy_system.gd")
const PermitProcessingSystemScript = preload("res://scripts/systems/permit_processing_system.gd")

var profile_catalog: Dictionary = {}
var world_effect_catalog: Dictionary = {}
var save_metadata: Dictionary = {}
var permit_catalog: Dictionary = {}
var mine_catalog: Dictionary = {}
var npc_catalog: Dictionary = {}
var building_catalog: Dictionary = {}
var dialogue_catalog: Dictionary = {}
var state: Dictionary = {}

func _ready() -> void:
	load_catalogs()
	reset_new_game()

func load_catalogs() -> void:
	profile_catalog = _load_json_file(WORLD_PROFILES_PATH)
	world_effect_catalog = _load_json_file(WORLD_EFFECTS_PATH)
	save_metadata = _load_json_file(SAVE_METADATA_PATH)
	permit_catalog = _load_json_file(PERMITS_PATH)
	mine_catalog = _load_json_file(MINES_PATH)
	npc_catalog = _load_json_file(NPCS_PATH)
	building_catalog = _load_json_file(BUILDINGS_PATH)
	dialogue_catalog = _load_dialogue_catalog()

func reset_new_game(profile_id: String = "world-1") -> void:
	var profiles: Array = profile_catalog.get("profiles", [])
	var selected_profile: Dictionary = {}

	for profile_variant in profiles:
		var profile: Dictionary = profile_variant
		if profile.get("id", "") == profile_id:
			selected_profile = profile
			break

	if selected_profile.is_empty() and not profiles.is_empty():
		selected_profile = profiles[0]

	var permits := _build_permit_map()
	var mines := _build_mine_list()
	var npcs := _build_npc_map()
	var buildings := _build_building_map()

	state = {
		"profile_id": selected_profile.get("id", profile_id),
		"profile_title": selected_profile.get("title", "Unknown Profile"),
		"day": int(selected_profile.get("day", 1)),
		"time": float(selected_profile.get("time", 8.0)),
		"weather": selected_profile.get("weather", {"current": "CLEAR", "time_left": 4, "intensity": 0.1}),
		"money": int(selected_profile.get("money", 1000)),
		"ore": int(selected_profile.get("ore", 0)),
		"evidence": int(selected_profile.get("evidence", 0)),
		"energy": int(selected_profile.get("energy", 100)),
		"max_energy": 100,
		"movement_speed": 1.0,
		"upgrades": [],
		"dirt_items": [],
		"leverage_tokens": [],
		"meters": {
			"trust": 50,
			"influence": 10,
			"exposure": 0,
		},
		"permits": permits,
		"npcs": npcs,
		"known_npc_ids": selected_profile.get("known_npc_ids", []),
		"objectives": [
			{
				"id": "start",
				"text": "Get to the Bureau of Extraction. No permit means no mine.",
				"is_completed": false,
				"type": "DISCOVER",
				"target_id": "licensing_office",
			}
		],
		"mines": _apply_profile_mine_discovery(mines, selected_profile.get("discovered_mine_ids", [])),
		"active_mine_id": "",
		"buildings": buildings,
		"discovered_building_ids": selected_profile.get("discovered_building_ids", []),
		"discovered_mine_ids": selected_profile.get("discovered_mine_ids", []),
		"found_office_item_ids": [],
		"exploration_active": false,
		"navigation_zones": [],
		"player_pos": {
			"x": 0,
			"y": 0,
		},
		"target_pos": null,
		"path": [],
		"feedbacks": [],
		"player_feedbacks": [],
		"dialogue_cooldowns": {},
		"world_effects": {},
		"story_flags": [],
		"last_city_event_hour": -1,
		"ftue_phase": "intro",
		"tutorial_step": 0,
		"tutorial_minimized": false,
		"unlocked_endings": [],
		"active_npc_id": "",
		"active_permit_id": "",
		"active_building_id": "",
		"active_mini_game": "",
		"active_dialogue_node_id": "",
		"pending_permit_action": "",
		"active_ending_id": "",
		"active_scene": "world",
	}

	_apply_profile_building_discovery()
	_apply_profile_adjustments(selected_profile)

func get_state() -> Dictionary:
	return state.duplicate(true)

func load_saved_state(slot_id: String = "") -> bool:
	var saved_state: Dictionary = SaveSystemScript.load_state(slot_id)
	if saved_state.is_empty():
		return false

	state = _hydrate_saved_state(saved_state)
	return true

func save_state(slot_id: String) -> void:
	SaveSystemScript.save_state(get_state(), slot_id)

func list_save_slots() -> Array:
	return SaveSystemScript.list_slots()

func set_active_scene(scene_id: String) -> void:
	state["active_scene"] = scene_id

func approve_permit(permit_id: String) -> Array[String]:
	var result: Dictionary = PermitSystemScript.approve_permit(state, permit_id)
	state = result.get("state", state)
	return result.get("notifications", [])

func discover_building(building_id: String) -> void:
	state = WorldSystemScript.discover_building(state, building_id)
	state = ProgressionSystemScript.on_building_discovered(state, building_id)

func enter_building(building_id: String) -> void:
	discover_building(building_id)
	state = ProgressionSystemScript.on_enter_building(state, building_id)
	state = OfficeSystemScript.enter_building(state, building_id, WorldSystemScript.get_building_access_position(state, building_id))

func talk_to_npc(npc_id: String) -> void:
	state = ProgressionSystemScript.on_talk_to_npc(state, npc_id)
	state = OfficeSystemScript.enter_npc_dialogue(state, npc_id)
	state["active_dialogue_node_id"] = "root"

func open_permit(permit_id: String) -> void:
	state = ProgressionSystemScript.on_open_permit(state, permit_id)

func submit_permit(permit_id: String) -> void:
	state = ProgressionSystemScript.on_submit_permit(state, permit_id)

func set_permit_status(permit_id: String, status: String) -> void:
	if not state.get("permits", {}).has(permit_id):
		return
	state["permits"][permit_id]["status"] = status

func set_permit_accuracy(permit_id: String, accuracy: float) -> void:
	if not state.get("permits", {}).has(permit_id):
		return
	state["permits"][permit_id]["accuracy"] = accuracy

func enter_office_directory() -> void:
	state = OfficeSystemScript.enter_directory(state)

func return_office_to_directory() -> void:
	state = OfficeSystemScript.return_to_directory(state)
	state["active_dialogue_node_id"] = ""

func get_active_dialogue_node() -> Dictionary:
	var npc_id := String(state.get("active_npc_id", ""))
	var node_id := String(state.get("active_dialogue_node_id", "root"))
	if npc_id.is_empty():
		return {}
	var node := DialogueSystemScript.get_node(dialogue_catalog, npc_id, node_id).duplicate(true)
	node["options"] = DialogueSystemScript.get_available_options(state, dialogue_catalog, npc_id, node_id)
	return node

func choose_dialogue_option(option_id: String) -> Array[String]:
	var npc_id := String(state.get("active_npc_id", ""))
	var node_id := String(state.get("active_dialogue_node_id", "root"))
	if npc_id.is_empty():
		return []
	var result := DialogueSystemScript.apply_option(state, dialogue_catalog, npc_id, node_id, option_id)
	state = result.get("state", state)
	state["active_dialogue_node_id"] = String(result.get("next_node_id", node_id))
	if npc_id == "licensing":
		if String(state.get("active_dialogue_node_id", "")) == "tutorial_intro":
			state["ftue_phase"] = "open_form_17b"
			state["tutorial_step"] = 3
	var notifications: Array[String] = []
	for notification_variant in result.get("notifications", []):
		notifications.append(String(notification_variant))
	return notifications

func apply_daily_tick(roll := -1.0) -> Dictionary:
	var result := EconomySystemScript.apply_daily_tick(state, roll)
	state = result.get("state", state)
	return result.get("notification", {})

func export_ore(ore_amount: int, strategy := "STANDARD") -> Dictionary:
	var result := EconomySystemScript.apply_ore_export(state, ore_amount, strategy)
	state = result.get("state", state)
	return result.get("notification", {})

func process_pending_permits(rolls := {}) -> Array[String]:
	var result := PermitProcessingSystemScript.process_pending_permits(state, rolls)
	state = result.get("state", state)
	var notifications: Array[String] = []
	for notification_variant in result.get("notifications", []):
		notifications.append(String(notification_variant))
	return notifications

func _build_permit_map() -> Dictionary:
	var permits: Dictionary = {}
	for permit_variant in permit_catalog.get("permits", []):
		var permit: Dictionary = permit_variant
		permits[permit.get("id", "")] = permit.duplicate(true)
	return permits

func _build_npc_map() -> Dictionary:
	var npcs: Dictionary = {}
	for npc_variant in npc_catalog.get("npcs", []):
		var npc: Dictionary = npc_variant
		npcs[npc.get("id", "")] = npc.duplicate(true)
	return npcs

func _build_building_map() -> Dictionary:
	var buildings: Dictionary = {}
	for building_variant in building_catalog.get("buildings", []):
		var building: Dictionary = building_variant
		buildings[building.get("id", "")] = building.duplicate(true)
	return buildings

func _load_dialogue_catalog() -> Dictionary:
	var catalog: Dictionary = {}
	for npc_id_variant in DIALOGUE_PATHS.keys():
		var npc_id := String(npc_id_variant)
		var raw_dialogue := _load_json_file(String(DIALOGUE_PATHS[npc_id]))
		var nodes: Dictionary = {}
		for node_variant in raw_dialogue.get("nodes", []):
			var node: Dictionary = node_variant
			nodes[node.get("id", "")] = node.duplicate(true)
		catalog[npc_id] = {
			"npc_id": npc_id,
			"nodes": nodes,
		}
	return catalog

func _build_mine_list() -> Array:
	var mines: Array = []
	for mine_variant in mine_catalog.get("mines", []):
		var mine: Dictionary = mine_variant.duplicate(true)
		mine["grid"] = _generate_mine_grid(
			mine.get("grid_width", 0),
			mine.get("grid_height", 0),
			mine.get("yield_rate", 0.2),
			mine.get("id", "")
		)
		mines.append(mine)
	return mines

func _apply_profile_mine_discovery(mines: Array, discovered_ids: Array) -> Array:
	var discovered_lookup := {}
	for mine_id in discovered_ids:
		discovered_lookup[String(mine_id)] = true

	for index in mines.size():
		var mine: Dictionary = mines[index]
		mine["discovered"] = discovered_lookup.has(mine.get("id", "")) or bool(mine.get("discovered", false))
		mines[index] = mine

	return mines

func _apply_profile_building_discovery() -> void:
	var buildings: Dictionary = state.get("buildings", {})
	var discovered_lookup := {}
	for building_id_variant in state.get("discovered_building_ids", []):
		discovered_lookup[String(building_id_variant)] = true

	for building_id_variant in buildings.keys():
		var building_id := String(building_id_variant)
		buildings[building_id]["is_discovered"] = discovered_lookup.has(building_id) or bool(buildings[building_id].get("is_discovered", false))

func _apply_profile_adjustments(profile: Dictionary) -> void:
	if profile.get("id", "") != "world-3":
		return

	var notifications := []
	notifications.append_array(approve_permit("extraction-intent"))
	notifications.append_array(approve_permit("prospecting-license"))
	notifications.append_array(approve_permit("mining-permit-iron"))

	state["ftue_phase"] = "ftue_complete"
	state["tutorial_step"] = 99
	state["objectives"] = [
		{
			"id": "sandbox-free-roam",
			"text": "Sandbox file: roam, test systems, and file deeper permits whenever you want.",
			"is_completed": false,
			"type": "DISCOVER",
		}
	]
	state["debug_notifications"] = notifications

func _hydrate_saved_state(saved_state: Dictionary) -> Dictionary:
	var world_profile_id := String(saved_state.get("profile_id", state.get("profile_id", "world-1")))
	var base_state := _build_base_state_for_profile(world_profile_id)
	var hydrated_state: Dictionary = base_state

	for key in saved_state.keys():
		hydrated_state[key] = saved_state[key]

	hydrated_state["profile_id"] = world_profile_id
	hydrated_state["profile_title"] = _get_profile_definition(world_profile_id).get("title", base_state.get("profile_title", "Unknown Profile"))
	hydrated_state["meters"] = _merge_dictionaries(base_state.get("meters", {}), saved_state.get("meters", {}))
	hydrated_state["weather"] = _merge_dictionaries(base_state.get("weather", {}), saved_state.get("weather", {}))
	hydrated_state["world_effects"] = _merge_world_effect_defaults(saved_state.get("world_effects", {}))
	hydrated_state["dialogue_cooldowns"] = saved_state.get("dialogue_cooldowns", {})
	hydrated_state["story_flags"] = saved_state.get("story_flags", [])
	hydrated_state["last_city_event_hour"] = int(saved_state.get("last_city_event_hour", -1))
	hydrated_state["unlocked_endings"] = saved_state.get("unlocked_endings", [])
	hydrated_state["active_ending_id"] = String(saved_state.get("active_ending_id", ""))
	hydrated_state["navigation_zones"] = saved_state.get("navigation_zones", [])
	hydrated_state["player_feedbacks"] = saved_state.get("player_feedbacks", [])
	hydrated_state["feedbacks"] = saved_state.get("feedbacks", [])
	hydrated_state["target_pos"] = saved_state.get("target_pos", null)
	hydrated_state["path"] = saved_state.get("path", [])
	hydrated_state["discovered_building_ids"] = saved_state.get("discovered_building_ids", base_state.get("discovered_building_ids", []))
	hydrated_state["discovered_mine_ids"] = saved_state.get("discovered_mine_ids", _derive_discovered_mine_ids(hydrated_state.get("mines", [])))
	hydrated_state["found_office_item_ids"] = saved_state.get("found_office_item_ids", [])
	hydrated_state["exploration_active"] = bool(saved_state.get("exploration_active", false))

	var saved_tutorial_step: Variant = saved_state.get("tutorial_step", null)
	var next_ftue_phase := String(saved_state.get("ftue_phase", FtueSystemScript.derive_ftue_phase_from_tutorial_step(saved_tutorial_step)))
	hydrated_state["ftue_phase"] = next_ftue_phase
	if int(saved_tutorial_step if saved_tutorial_step != null else -1) == 99:
		hydrated_state["tutorial_step"] = 99
	else:
		hydrated_state["tutorial_step"] = int(saved_tutorial_step if saved_tutorial_step != null else FtueSystemScript.get_legacy_tutorial_step_for_ftue_phase(next_ftue_phase))

	if String(hydrated_state.get("active_scene", "world")) == "city_planner":
		hydrated_state["active_scene"] = "world"

	return hydrated_state

func _build_base_state_for_profile(profile_id: String) -> Dictionary:
	var previous_state := state
	reset_new_game(profile_id)
	var base_state := get_state()
	state = previous_state
	return base_state

func _get_profile_definition(profile_id: String) -> Dictionary:
	for profile_variant in profile_catalog.get("profiles", []):
		var profile: Dictionary = profile_variant
		if profile.get("id", "") == profile_id:
			return profile
	return {}

func _merge_dictionaries(base: Dictionary, override: Dictionary) -> Dictionary:
	var result := base.duplicate(true)
	for key in override.keys():
		result[key] = override[key]
	return result

func _merge_world_effect_defaults(overrides: Dictionary) -> Dictionary:
	var merged := {}
	for effect_variant in world_effect_catalog.get("effects", []):
		var effect: Dictionary = effect_variant
		var effect_id := String(effect.get("id", ""))
		merged[effect_id] = float(overrides.get(effect_id, 0.0))
	for key in overrides.keys():
		if not merged.has(key):
			merged[key] = overrides[key]
	return merged

func _derive_discovered_mine_ids(mines: Array) -> Array:
	var discovered_ids: Array = []
	for mine_variant in mines:
		var mine: Dictionary = mine_variant
		if bool(mine.get("discovered", false)):
			discovered_ids.append(String(mine.get("id", "")))
	return discovered_ids

func _generate_mine_grid(width: int, height: int, yield_rate: float, seed_text: String) -> Array:
	var rng := RandomNumberGenerator.new()
	rng.seed = seed_text.hash()

	var grid: Array = []
	for y in range(height):
		for x in range(width):
			var roll := rng.randf()
			var is_ore := roll < yield_rate
			var is_rock := (not is_ore) and rng.randf() < 0.15
			var tile_type := "DIRT"
			if is_ore:
				tile_type = "ORE"
			elif is_rock:
				tile_type = "ROCK"

			var stability := 45 + rng.randi_range(0, 55)
			if is_rock:
				stability = 80 + rng.randi_range(0, 20)

			grid.append({
				"id": "%s-%s" % [x, y],
				"x": x,
				"y": y,
				"z": 0,
				"type": tile_type,
				"stability": stability,
				"mined": false,
				"revealed": false,
			})

	return grid

func _load_json_file(path: String) -> Dictionary:
	if not FileAccess.file_exists(path):
		push_error("Missing JSON file: %s" % path)
		return {}

	var file: FileAccess = FileAccess.open(path, FileAccess.READ)
	if file == null:
		push_error("Failed to open JSON file: %s" % path)
		return {}

	var parse_result: Variant = JSON.parse_string(file.get_as_text())
	if typeof(parse_result) != TYPE_DICTIONARY:
		push_error("Expected dictionary JSON payload in: %s" % path)
		return {}

	return parse_result
