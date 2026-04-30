extends RefCounted
class_name ProgressionSystem

const ObjectiveSystemScript = preload("res://scripts/systems/objective_system.gd")

static func on_building_discovered(state: Dictionary, building_id: String) -> Dictionary:
	var next_state: Dictionary = state.duplicate(true)

	if building_id == "licensing_office":
		next_state["objectives"] = ObjectiveSystemScript.complete_objective(next_state.get("objectives", []), "start")
		if String(next_state.get("ftue_phase", "intro")) in ["intro", "reach_bureau"]:
			next_state["ftue_phase"] = "enter_bureau"
			next_state["tutorial_step"] = 1

	return next_state

static func on_enter_building(state: Dictionary, building_id: String) -> Dictionary:
	var next_state: Dictionary = state.duplicate(true)
	next_state["active_building_id"] = building_id
	next_state["active_scene"] = "office"
	next_state["exploration_active"] = false

	if building_id == "licensing_office" and String(next_state.get("ftue_phase", "intro")) in ["reach_bureau", "enter_bureau"]:
		next_state["ftue_phase"] = "talk_vane"
		next_state["tutorial_step"] = 2

	return next_state

static func on_talk_to_npc(state: Dictionary, npc_id: String) -> Dictionary:
	var next_state: Dictionary = state.duplicate(true)
	next_state["active_npc_id"] = npc_id
	next_state["active_scene"] = "office"

	if npc_id == "licensing" and String(next_state.get("ftue_phase", "intro")) == "talk_vane":
		next_state["ftue_phase"] = "open_form_17b"
		next_state["tutorial_step"] = 3

	return next_state

static func on_open_permit(state: Dictionary, permit_id: String) -> Dictionary:
	var next_state: Dictionary = state.duplicate(true)
	next_state["active_permit_id"] = permit_id

	if permit_id == "extraction-intent" and String(next_state.get("ftue_phase", "intro")) == "open_form_17b":
		next_state["ftue_phase"] = "submit_form_17b"
		next_state["tutorial_step"] = 4

	return next_state

static func on_submit_permit(state: Dictionary, permit_id: String) -> Dictionary:
	var next_state: Dictionary = state.duplicate(true)
	next_state["active_permit_id"] = permit_id
	next_state["pending_permit_action"] = "SUBMIT"

	if permit_id == "extraction-intent" and String(next_state.get("ftue_phase", "intro")) == "submit_form_17b":
		next_state["ftue_phase"] = "ftue_complete"
		next_state["tutorial_step"] = 5

	return next_state
