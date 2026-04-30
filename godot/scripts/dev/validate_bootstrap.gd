extends SceneTree

const PermitSystemScript = preload("res://scripts/systems/permit_system.gd")
const SaveSystemScript = preload("res://scripts/systems/save_system.gd")

func _init() -> void:
	var game_state_script = load("res://scripts/autoload/game_state.gd")
	var game_state = game_state_script.new()
	game_state.load_catalogs()
	game_state.reset_new_game()

	var state: Dictionary = game_state.get_state()
	_assert(state.get("permits", {}).has("extraction-intent"), "Missing extraction-intent permit")
	_assert(state.get("npcs", {}).has("licensing"), "Missing licensing NPC")
	_assert(state.get("npcs", {}).has("chief"), "Missing chief NPC")
	_assert(state.get("buildings", {}).has("licensing_office"), "Missing licensing office building")
	_assert(state.get("mines", []).size() == 3, "Expected 3 seeded mines")

	game_state.discover_building("licensing_office")
	var discovered_state: Dictionary = game_state.get_state()
	_assert(discovered_state.get("ftue_phase", "") == "enter_bureau", "Discovering the Bureau should push FTUE to enter_bureau")
	_assert(int(discovered_state.get("tutorial_step", -1)) == 1, "Discovering the Bureau should set tutorial step 1")
	_assert(discovered_state.get("buildings", {}).get("licensing_office", {}).get("is_discovered", false), "Licensing office should be marked discovered")

	game_state.enter_building("licensing_office")
	var entered_state: Dictionary = game_state.get_state()
	_assert(entered_state.get("active_scene", "") == "office", "Entering the Bureau should move to office scene")
	_assert(entered_state.get("ftue_phase", "") == "talk_vane", "Entering the Bureau should push FTUE to talk_vane")
	_assert(int(entered_state.get("tutorial_step", -1)) == 2, "Entering the Bureau should set tutorial step 2")

	game_state.talk_to_npc("licensing")
	var talked_state: Dictionary = game_state.get_state()
	_assert(talked_state.get("ftue_phase", "") == "open_form_17b", "Talking to Vane should push FTUE to open_form_17b")
	var root_dialogue: Dictionary = game_state.get_active_dialogue_node()
	_assert(root_dialogue.get("id", "") == "root", "Licensing dialogue should start at root")
	_assert(root_dialogue.get("options", []).size() > 0, "Licensing root dialogue should expose at least one option")

	for npc_id in ["union", "inspector", "fixer", "journalist", "chief"]:
		game_state.talk_to_npc(npc_id)
		var npc_dialogue: Dictionary = game_state.get_active_dialogue_node()
		_assert(npc_dialogue.get("id", "") == "root", "%s dialogue should start at root" % npc_id)
		_assert(npc_dialogue.get("options", []).size() > 0, "%s root dialogue should expose at least one option" % npc_id)

	game_state.talk_to_npc("licensing")

	game_state.choose_dialogue_option("need_permit")
	var intro_dialogue: Dictionary = game_state.get_active_dialogue_node()
	_assert(intro_dialogue.get("id", "") == "tutorial_intro", "Need permit option should route to tutorial intro")
	_assert(game_state.get_state().get("permits", {}).get("extraction-intent", {}).get("status", "") == "AVAILABLE", "Need permit dialogue should unlock extraction-intent")

	game_state.choose_dialogue_option("ack_intro")
	var returned_dialogue: Dictionary = game_state.get_active_dialogue_node()
	_assert(returned_dialogue.get("id", "") == "root", "Acknowledging intro should return to root")

	game_state.open_permit("extraction-intent")
	var opened_state: Dictionary = game_state.get_state()
	_assert(opened_state.get("ftue_phase", "") == "submit_form_17b", "Opening Form 17-B should push FTUE to submit_form_17b")

	game_state.submit_permit("extraction-intent")
	var submitted_state: Dictionary = game_state.get_state()
	_assert(submitted_state.get("ftue_phase", "") == "ftue_complete", "Submitting Form 17-B should complete FTUE")
	_assert(int(submitted_state.get("tutorial_step", -1)) == 5, "Submitting Form 17-B should set tutorial step 5")

	game_state.reset_new_game()
	game_state.discover_building("licensing_office")
	game_state.enter_building("licensing_office")
	game_state.talk_to_npc("licensing")
	game_state.set_permit_status("extraction-intent", "REJECTED")
	game_state.choose_dialogue_option("discuss_rejected")
	game_state.choose_dialogue_option("expedite")
	game_state.choose_dialogue_option("insight")
	var negotiation_dialogue: Dictionary = game_state.get_active_dialogue_node()
	_assert(negotiation_dialogue.get("id", "") == "negotiation_phase", "Insight branch should reach negotiation phase")
	game_state.choose_dialogue_option("use_vulnerability")
	var post_vane_state: Dictionary = game_state.get_state()
	_assert(post_vane_state.get("permits", {}).get("extraction-intent", {}).get("status", "") == "APPROVED", "Using Vane vulnerability should approve extraction-intent")
	_assert(post_vane_state.get("world_effects", {}).has("bureauPull"), "Using Vane vulnerability should apply Bureau Pull timing")

	game_state.reset_new_game()
	game_state.get_state()["ore"] = 5
	var export_notification: Dictionary = game_state.export_ore(5, "STANDARD")
	var exported_state: Dictionary = game_state.get_state()
	_assert(int(exported_state.get("ore", -1)) == 0, "Export should remove ore from inventory")
	_assert(int(exported_state.get("money", 0)) > 1000, "Export should increase money")
	_assert(export_notification.get("title", "") != "", "Export should return a notification")

	game_state.reset_new_game("world-3")
	var pre_tick_money := int(game_state.get_state().get("money", 0))
	var tick_notification: Dictionary = game_state.apply_daily_tick(0.95)
	var post_tick_state: Dictionary = game_state.get_state()
	_assert(int(post_tick_state.get("money", 0)) != pre_tick_money, "Daily tick should change money")
	_assert(tick_notification.get("title", "") != "", "Daily tick should emit a notification")

	game_state.reset_new_game()
	game_state.set_permit_status("extraction-intent", "PENDING")
	game_state.set_permit_accuracy("extraction-intent", 1.0)
	var permit_notifications: Array[String] = game_state.process_pending_permits({
		"extraction-intent_gate": 0.99,
		"extraction-intent_approve": 0.0
	})
	var processed_state: Dictionary = game_state.get_state()
	_assert(processed_state.get("permits", {}).get("extraction-intent", {}).get("status", "") == "APPROVED", "Pending permit processing should approve extraction-intent on a forced success")
	_assert(processed_state.get("permits", {}).get("prospecting-license", {}).get("status", "") == "AVAILABLE", "Permit progression should unlock prospecting-license after approval")

	game_state.reset_new_game()
	game_state.set_permit_status("extraction-intent", "PENDING")
	game_state.set_permit_accuracy("extraction-intent", 0.0)
	game_state.process_pending_permits({
		"extraction-intent_gate": 0.99,
		"extraction-intent_approve": 0.99,
		"extraction-intent_reason": 0.0
	})
	var rejected_state: Dictionary = game_state.get_state()
	_assert(rejected_state.get("permits", {}).get("extraction-intent", {}).get("status", "") == "REJECTED", "Pending permit processing should reject on a forced failure")
	_assert(String(rejected_state.get("permits", {}).get("extraction-intent", {}).get("rejection_reason", "")) != "", "Rejected permits should record a rejection reason")

	var result: Dictionary = PermitSystemScript.approve_permit(state, "extraction-intent")
	var approved_state: Dictionary = result.get("state", {})
	_assert(
		approved_state.get("permits", {}).get("prospecting-license", {}).get("status", "") == "AVAILABLE",
		"Prospecting license should unlock after extraction intent approval"
	)

	var deeper_result: Dictionary = PermitSystemScript.approve_permit(approved_state, "mining-permit-iron")
	var deeper_state: Dictionary = deeper_result.get("state", {})
	var deep_hollow := _find_mine(deeper_state.get("mines", []), "deep-hollow")
	_assert(deep_hollow.get("discovered", false), "Deep Hollow should unlock after iron permit approval")
	_assert(deep_hollow.get("status", "") == "PROSPECTING", "Deep Hollow should enter prospecting state")

	game_state.reset_new_game("world-3")
	var world_three_state: Dictionary = game_state.get_state()
	_assert(world_three_state.get("ftue_phase", "") == "ftue_complete", "World 3 should skip FTUE")
	_assert(int(world_three_state.get("tutorial_step", -1)) == 99, "World 3 tutorial step should be 99")
	_assert(world_three_state.get("permits", {}).get("mining-permit-iron", {}).get("status", "") == "APPROVED", "World 3 should start with iron permit approved")

	SaveSystemScript.clear_slot()
	game_state.reset_new_game("world-2")
	game_state.save_state("slot-1")
	var loaded: bool = game_state.load_saved_state("slot-1")
	_assert(loaded, "Expected saved state to reload from slot-1")
	var reloaded_state: Dictionary = game_state.get_state()
	_assert(reloaded_state.get("profile_id", "") == "world-2", "Saved profile id should round-trip")
	_assert(float(reloaded_state.get("time", 0.0)) == 6.5, "Saved world time should round-trip")
	_assert(reloaded_state.get("weather", {}).get("current", "") == "RAIN", "Saved weather should round-trip")
	_assert(reloaded_state.get("permits", {}).get("wash-plant-permit", {}).get("status", "") == "AVAILABLE", "Static permit status should survive save/load")
	_assert(reloaded_state.get("buildings", {}).has("mine_entrance"), "Building catalog should survive save/load")
	SaveSystemScript.clear_slot()

	game_state.free()
	print("Bootstrap validation passed.")
	quit(0)

func _find_mine(mines: Array, mine_id: String) -> Dictionary:
	for mine_variant in mines:
		var mine: Dictionary = mine_variant
		if mine.get("id", "") == mine_id:
			return mine
	return {}

func _assert(condition: bool, message: String) -> void:
	if condition:
		return
	push_error(message)
	quit(1)
