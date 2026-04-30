extends RefCounted
class_name DialogueSystem

static func get_node(dialogue_catalog: Dictionary, npc_id: String, node_id: String) -> Dictionary:
	var npc_dialogue: Dictionary = dialogue_catalog.get(npc_id, {})
	var nodes: Dictionary = npc_dialogue.get("nodes", {})
	return nodes.get(node_id, {})

static func get_available_options(state: Dictionary, dialogue_catalog: Dictionary, npc_id: String, node_id: String) -> Array:
	var node := get_node(dialogue_catalog, npc_id, node_id)
	var available: Array = []
	for option_variant in node.get("options", []):
		var option: Dictionary = option_variant
		if _conditions_pass(state, option.get("conditions", [])):
			available.append(option.duplicate(true))
	return available

static func apply_option(state: Dictionary, dialogue_catalog: Dictionary, npc_id: String, node_id: String, option_id: String) -> Dictionary:
	var node := get_node(dialogue_catalog, npc_id, node_id)
	for option_variant in node.get("options", []):
		var option: Dictionary = option_variant
		if option.get("id", "") != option_id:
			continue
		if not _conditions_pass(state, option.get("conditions", [])):
			return {
				"state": state,
				"next_node_id": node_id,
				"notifications": [],
			}
		return _apply_commands(state, option.get("commands", []), String(option.get("next_node_id", node_id)))
	return {
		"state": state,
		"next_node_id": node_id,
		"notifications": [],
	}

static func _conditions_pass(state: Dictionary, conditions: Array) -> bool:
	for condition_variant in conditions:
		var condition: Dictionary = condition_variant
		var condition_type := String(condition.get("type", ""))
		match condition_type:
			"permit_status_in":
				var statuses: Array = condition.get("statuses", [])
				var permit_id := String(condition.get("permit_id", ""))
				var status := String(state.get("permits", {}).get(permit_id, {}).get("status", ""))
				if not statuses.has(status):
					return false
			"permit_status_is":
				var permit_id_exact := String(condition.get("permit_id", ""))
				var expected_status := String(condition.get("status", ""))
				if String(state.get("permits", {}).get(permit_id_exact, {}).get("status", "")) != expected_status:
					return false
			"npc_vulnerability_discovered":
				var npc_id := String(condition.get("npc_id", ""))
				if not bool(state.get("npcs", {}).get(npc_id, {}).get("vulnerability", {}).get("discovered", false)):
					return false
			"money_at_least":
				if int(state.get("money", 0)) < int(condition.get("amount", 0)):
					return false
			_:
				return false
	return true

static func _apply_commands(state: Dictionary, commands: Array, next_node_id: String) -> Dictionary:
	var next_state: Dictionary = state.duplicate(true)
	var notifications: Array[String] = []

	for command_variant in commands:
		var command: Dictionary = command_variant
		var command_type := String(command.get("type", ""))
		match command_type:
			"set_permit_status":
				var permit_id := String(command.get("permit_id", ""))
				if next_state.get("permits", {}).has(permit_id):
					next_state["permits"][permit_id]["status"] = String(command.get("status", "LOCKED"))
			"set_tutorial_step":
				next_state["tutorial_step"] = int(command.get("step", 0))
			"set_npc_vulnerability_discovered":
				var npc_id := String(command.get("npc_id", ""))
				if next_state.get("npcs", {}).has(npc_id):
					next_state["npcs"][npc_id]["vulnerability"]["discovered"] = bool(command.get("discovered", false))
			"approve_permit":
				var permit_result := PermitSystem.approve_permit(next_state, String(command.get("permit_id", "")))
				next_state = permit_result.get("state", next_state)
				notifications.append_array(permit_result.get("notifications", []))
			"extend_world_effect":
				var effect_id := String(command.get("effect_id", ""))
				var hours := float(command.get("hours", 0.0))
				var current_world_hour := int(next_state.get("day", 1)) * 24.0 + float(next_state.get("time", 0.0))
				next_state["world_effects"][effect_id] = max(float(next_state.get("world_effects", {}).get(effect_id, 0.0)), current_world_hour + hours)
			"adjust_npc_trust":
				var trust_npc_id := String(command.get("npc_id", ""))
				if next_state.get("npcs", {}).has(trust_npc_id):
					var current_trust := int(next_state["npcs"][trust_npc_id].get("trust_level", 0))
					next_state["npcs"][trust_npc_id]["trust_level"] = clamp(current_trust + int(command.get("delta", 0)), 0, 100)
			"adjust_meters":
				for meter_key in ["trust", "influence", "exposure"]:
					if not command.has(meter_key):
						continue
					var current_value := int(next_state.get("meters", {}).get(meter_key, 0))
					next_state["meters"][meter_key] = clamp(current_value + int(command.get(meter_key, 0)), 0, 100)
			"add_money":
				next_state["money"] = max(0, int(next_state.get("money", 0)) + int(command.get("amount", 0)))

	var ftue_phase := String(next_state.get("ftue_phase", ""))
	var tutorial_step := int(next_state.get("tutorial_step", 0))
	if ftue_phase == "submit_form_17b" and tutorial_step >= 7:
		next_state["ftue_phase"] = "ftue_complete"

	return {
		"state": next_state,
		"next_node_id": next_node_id,
		"notifications": notifications,
	}
