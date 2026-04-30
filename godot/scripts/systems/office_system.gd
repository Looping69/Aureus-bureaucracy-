extends RefCounted
class_name OfficeSystem

static func enter_directory(state: Dictionary) -> Dictionary:
	var next_state: Dictionary = state.duplicate(true)
	next_state["active_scene"] = "office"
	next_state["active_building_id"] = ""
	next_state["active_npc_id"] = ""
	next_state["exploration_active"] = false
	return next_state

static func enter_building(state: Dictionary, building_id: String, access_position: Dictionary) -> Dictionary:
	var next_state: Dictionary = state.duplicate(true)
	next_state["active_scene"] = "office"
	next_state["active_building_id"] = building_id
	next_state["active_npc_id"] = ""
	next_state["exploration_active"] = not next_state.get("buildings", {}).get(building_id, {}).get("exploration_items", []).is_empty()
	next_state["player_pos"] = access_position
	return next_state

static func enter_npc_dialogue(state: Dictionary, npc_id: String) -> Dictionary:
	var next_state: Dictionary = state.duplicate(true)
	next_state["active_scene"] = "office"
	next_state["active_npc_id"] = npc_id
	next_state["exploration_active"] = false
	return next_state

static func return_to_directory(state: Dictionary) -> Dictionary:
	var next_state: Dictionary = state.duplicate(true)
	next_state["active_building_id"] = ""
	next_state["active_npc_id"] = ""
	next_state["exploration_active"] = false
	next_state["active_scene"] = "office"
	return next_state
