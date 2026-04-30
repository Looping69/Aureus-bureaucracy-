extends RefCounted
class_name WorldSystem

static func discover_building(state: Dictionary, building_id: String) -> Dictionary:
	var next_state: Dictionary = state.duplicate(true)
	var discovered_ids: Array = next_state.get("discovered_building_ids", []).duplicate()
	if not discovered_ids.has(building_id):
		discovered_ids.append(building_id)
	next_state["discovered_building_ids"] = discovered_ids

	var buildings: Dictionary = next_state.get("buildings", {})
	if buildings.has(building_id):
		buildings[building_id]["is_discovered"] = true

	return next_state

static func get_building_access_position(state: Dictionary, building_id: String) -> Dictionary:
	var buildings: Dictionary = state.get("buildings", {})
	if not buildings.has(building_id):
		return state.get("player_pos", {"x": 0, "y": 0})

	var building: Dictionary = buildings[building_id]
	return building.get("access_position", building.get("position", {"x": 0, "y": 0}))
