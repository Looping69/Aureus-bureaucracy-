extends RefCounted
class_name EconomySystem

const BASE_EXPORT_PRICE := 120
const LICENSED_EXPORT_BONUS := 40
const INFLUENCE_PRICE_FACTOR := 0.002
const QUIET_SALE_PAYOUT_MULTIPLIER := 0.82
const REINVEST_SALE_PAYOUT_MULTIPLIER := 0.9
const EXPOSE_SALE_PAYOUT_MULTIPLIER := 1.02

static func has_export_license(state: Dictionary) -> bool:
	return String(state.get("permits", {}).get("export-license", {}).get("status", "")) == "APPROVED"

static func is_world_effect_active(state: Dictionary, effect_id: String) -> bool:
	var expiry := float(state.get("world_effects", {}).get(effect_id, 0.0))
	var world_hour := int(state.get("day", 1)) * 24.0 + float(state.get("time", 0.0))
	return expiry > world_hour

static func get_ore_unit_price(state: Dictionary) -> int:
	var licensed_bonus := LICENSED_EXPORT_BONUS if has_export_license(state) else 0
	var market_window_bonus := 30 if is_world_effect_active(state, "marketInsight") else 0
	var influence_multiplier := 1.0 + (float(state.get("meters", {}).get("influence", 0)) * INFLUENCE_PRICE_FACTOR)
	return max(50, int(round((BASE_EXPORT_PRICE + licensed_bonus + market_window_bonus) * influence_multiplier)))

static func get_export_exposure_increase(state: Dictionary) -> int:
	return max(1, (4 if has_export_license(state) else 10) - (2 if is_world_effect_active(state, "marketInsight") else 0))

static func apply_ore_export(state: Dictionary, ore_amount: int, strategy := "STANDARD") -> Dictionary:
	if ore_amount <= 0:
		return {
			"state": state,
			"notification": {
				"title": "No Ore",
				"msg": "You don't have any ore to sell."
			}
		}

	var unit_price := get_ore_unit_price(state)
	var base_exposure := get_export_exposure_increase(state)
	var payout := ore_amount * unit_price
	var exposure_change := base_exposure
	var influence_change := 0
	var next_state: Dictionary = state.duplicate(true)

	match strategy:
		"QUIET":
			payout = int(round(ore_amount * unit_price * QUIET_SALE_PAYOUT_MULTIPLIER))
			exposure_change = max(0, base_exposure - (3 if has_export_license(state) else 6))
		"REINVEST":
			payout = int(round(ore_amount * unit_price * REINVEST_SALE_PAYOUT_MULTIPLIER))
			exposure_change = max(1, base_exposure - 2)
			influence_change = 1
			_extend_world_effect(next_state, "bureauPull", 8)
			next_state["energy"] = min(int(next_state.get("max_energy", 100)), int(next_state.get("energy", 0)) + 12)
		"EXPOSE":
			payout = int(round(ore_amount * unit_price * EXPOSE_SALE_PAYOUT_MULTIPLIER))
			exposure_change = base_exposure + 6
			influence_change = 5
			_extend_world_effect(next_state, "mediaHeat", 12)

	next_state["money"] = int(next_state.get("money", 0)) + payout
	next_state["ore"] = max(0, int(next_state.get("ore", 0)) - ore_amount)
	next_state["meters"]["exposure"] = min(100, int(next_state.get("meters", {}).get("exposure", 0)) + exposure_change)
	next_state["meters"]["influence"] = min(100, int(next_state.get("meters", {}).get("influence", 0)) + influence_change)

	return {
		"state": next_state,
		"notification": {
			"title": "Export Successful" if has_export_license(state) else "Black-Market Export",
			"msg": "Sold %d ore for $%d." % [ore_amount, payout]
		}
	}

static func apply_daily_tick(state: Dictionary, roll := -1.0) -> Dictionary:
	var operational_mine_count := 0
	for mine_variant in state.get("mines", []):
		var mine: Dictionary = mine_variant
		if String(mine.get("status", "")) == "OPERATIONAL":
			operational_mine_count += 1

	var community_upkeep_relief: int = 20 if is_world_effect_active(state, "communityBacking") else 0
	var base_upkeep: int = max(0, 35 + (state.get("upgrades", []).size() * 12) + (operational_mine_count * 25) - community_upkeep_relief)
	var next_state: Dictionary = state.duplicate(true)
	next_state["money"] = max(0, int(next_state.get("money", 0)) - base_upkeep)
	var notification: Dictionary = {
		"title": "Daily Overhead",
		"msg": "Operational costs deducted: $%d." % base_upkeep
	}

	var audit_chance: float = min(
		0.85,
		0.05 + (float(state.get("meters", {}).get("exposure", 0)) / 140.0) + (0.18 if is_world_effect_active(state, "mediaHeat") else 0.0)
	)
	var aid_chance: float = min(
		0.5,
		0.04 + (float(state.get("meters", {}).get("trust", 0)) / 220.0) + (0.12 if is_world_effect_active(state, "communityBacking") else 0.0)
	)
	var resolved_roll: float = roll if roll >= 0.0 else RandomNumberGenerator.new().randf()

	if resolved_roll < audit_chance:
		var fine := 80 + int(round(float(state.get("meters", {}).get("exposure", 0)) * (2.8 if is_world_effect_active(state, "mediaHeat") else 2.2)))
		next_state["money"] = max(0, int(next_state.get("money", 0)) - fine)
		next_state["meters"]["trust"] = max(0, int(next_state.get("meters", {}).get("trust", 0)) - 3)
		notification = {
			"title": "Compliance Audit",
			"msg": "Inspectors issued a $%d fine." % fine
		}
	elif resolved_roll > 1.0 - aid_chance:
		var subsidy := 40 + int(round(float(state.get("meters", {}).get("trust", 0)) * (1.45 if is_world_effect_active(state, "communityBacking") else 1.2)))
		next_state["money"] = int(next_state.get("money", 0)) + subsidy
		next_state["meters"]["influence"] = min(100, int(next_state.get("meters", {}).get("influence", 0)) + 2)
		notification = {
			"title": "Community Subsidy",
			"msg": "Trusted contacts covered $%d in costs." % subsidy
		}

	return {
		"state": next_state,
		"notification": notification
	}

static func _extend_world_effect(state: Dictionary, effect_id: String, hours: float) -> void:
	var world_hour := int(state.get("day", 1)) * 24.0 + float(state.get("time", 0.0))
	var current_expiry := float(state.get("world_effects", {}).get(effect_id, 0.0))
	state["world_effects"][effect_id] = max(current_expiry, world_hour + hours)
