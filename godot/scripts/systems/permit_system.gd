extends RefCounted
class_name PermitSystem

static func approve_permit(state: Dictionary, permit_id: String) -> Dictionary:
	var permits: Dictionary = state.get("permits", {})
	if not permits.has(permit_id):
		return {
			"state": state,
			"notifications": [],
		}

	var permit: Dictionary = permits[permit_id]
	if permit.get("status", "LOCKED") == "APPROVED":
		return {
			"state": state,
			"notifications": [],
		}

	var next_state: Dictionary = state.duplicate(true)
	next_state["permits"][permit_id]["status"] = "APPROVED"
	next_state["permits"][permit_id].erase("rejection_reason")
	return _apply_permit_approval(next_state, permit_id)

static func _apply_permit_approval(state: Dictionary, permit_id: String) -> Dictionary:
	var notifications: Array[String] = []

	match permit_id:
		"extraction-intent":
			_make_permit_available(state, "prospecting-license")
		"prospecting-license":
			_make_permit_available(state, "mining-permit-iron")
		"mining-permit-iron":
			_make_permit_available(state, "prospecting-permit-deep")
			_patch_mine(state, "iron-vein", {
				"status": "OPERATIONAL",
			})
			if _patch_mine(state, "deep-hollow", {
				"discovered": true,
				"status": "PROSPECTING",
			}, true):
				notifications.append("Deep Hollow is now accessible.")
		"prospecting-permit-deep":
			_make_permit_available(state, "mining-permit-deep")
		"mining-permit-deep":
			_make_permit_available(state, "prospecting-permit-abyss")
			_patch_mine(state, "deep-hollow", {
				"status": "OPERATIONAL",
			})
			if _patch_mine(state, "abyssal-reach", {
				"discovered": true,
				"status": "PROSPECTING",
			}, true):
				notifications.append("Abyssal Reach is now accessible.")
		"prospecting-permit-abyss":
			_make_permit_available(state, "mining-permit-abyss")

	return {
		"state": state,
		"notifications": notifications,
	}

static func _make_permit_available(state: Dictionary, permit_id: String) -> void:
	var permits: Dictionary = state.get("permits", {})
	if not permits.has(permit_id):
		return

	if permits[permit_id].get("status", "LOCKED") == "LOCKED":
		permits[permit_id]["status"] = "AVAILABLE"

static func _patch_mine(state: Dictionary, mine_id: String, patch: Dictionary, only_if_newly_discovered := false) -> bool:
	var mines: Array = state.get("mines", [])
	for index in mines.size():
		var mine: Dictionary = mines[index]
		if mine.get("id", "") != mine_id:
			continue

		var was_discovered := bool(mine.get("discovered", false))
		var next_mine: Dictionary = mine.duplicate(true)
		for key in patch.keys():
			next_mine[key] = patch[key]
		mines[index] = next_mine
		if only_if_newly_discovered:
			return not was_discovered and bool(next_mine.get("discovered", false))
		return false

	return false
