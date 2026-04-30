extends RefCounted
class_name PermitProcessingSystem

const EconomySystemScript = preload("res://scripts/systems/economy_system.gd")

const REJECTION_REASONS := [
	"Ink color was excessively hopeful.",
	"Margins failed to meet the Bureaucratic Anxiety standard.",
	"Signature looks suspiciously like a cry for help.",
	"Form was submitted during a mandatory Silence Appreciation hour.",
	"The inspector had a bad dream about a mole.",
	"Your ethical compliance score is questionably sincere.",
	"Missing Appendix G: Proof of Existence.",
	"The paper weight was too light and lacked gravitas."
]

static func process_pending_permits(state: Dictionary, rolls := {}) -> Dictionary:
	var next_state: Dictionary = state.duplicate(true)
	var notifications: Array[String] = []
	var rng := RandomNumberGenerator.new()

	for permit_id_variant in next_state.get("permits", {}).keys():
		var permit_id := String(permit_id_variant)
		var permit: Dictionary = next_state["permits"][permit_id]
		if String(permit.get("status", "")) != "PENDING":
			continue

		var quiet_route_bonus := 0.12 if _has_story_flag(next_state, "vane_backchannel") or _has_story_flag(next_state, "vox_embargo") else 0.0
		var reform_route_bonus := 0.14 if _has_story_flag(next_state, "reform_alliance") or _has_story_flag(next_state, "inspector_deputized") else 0.0
		var blacklist_penalty := 0.2 if _has_story_flag(next_state, "inspector_blacklist") else 0.0
		var public_penalty := 0.1 if _has_story_flag(next_state, "vox_exclusive") else 0.0
		var permit_tempo_gate := 0.9 - (0.18 if EconomySystemScript.is_world_effect_active(next_state, "bureauPull") else 0.0) - quiet_route_bonus - reform_route_bonus + blacklist_penalty + public_penalty
		var gate_roll := float(rolls.get("%s_gate" % permit_id, rng.randf()))
		if gate_roll <= min(0.97, max(0.45, permit_tempo_gate)):
			continue

		var base_chance := 0.6 \
			+ (0.18 if EconomySystemScript.is_world_effect_active(next_state, "bureauPull") else 0.0) \
			- (0.12 if EconomySystemScript.is_world_effect_active(next_state, "mediaHeat") else 0.0) \
			+ (0.05 if EconomySystemScript.is_world_effect_active(next_state, "communityBacking") else 0.0) \
			+ quiet_route_bonus + reform_route_bonus - blacklist_penalty - public_penalty
		var accuracy_bonus := float(permit.get("accuracy", 0.5)) * 0.4
		var approval_roll := float(rolls.get("%s_approve" % permit_id, rng.randf()))
		var approved := approval_roll < (base_chance + accuracy_bonus)

		if approved:
			var permit_result := PermitSystem.approve_permit(next_state, permit_id)
			next_state = permit_result.get("state", next_state)
			notifications.append_array(permit_result.get("notifications", []))
		else:
			next_state["permits"][permit_id]["status"] = "REJECTED"
			next_state["permits"][permit_id]["rejection_reason"] = REJECTION_REASONS[int(floor(float(rolls.get("%s_reason" % permit_id, rng.randf())) * REJECTION_REASONS.size())) % REJECTION_REASONS.size()]

	return {
		"state": next_state,
		"notifications": notifications
	}

static func _has_story_flag(state: Dictionary, flag: String) -> bool:
	return state.get("story_flags", []).has(flag)
