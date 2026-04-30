extends RefCounted
class_name FtueSystem

static func derive_ftue_phase_from_tutorial_step(tutorial_step: Variant) -> String:
	match int(tutorial_step if tutorial_step != null else 5):
		0:
			return "intro"
		1:
			return "enter_bureau"
		2:
			return "talk_vane"
		3:
			return "open_form_17b"
		4:
			return "submit_form_17b"
		_:
			return "ftue_complete"

static func get_legacy_tutorial_step_for_ftue_phase(phase: String) -> int:
	match phase:
		"intro":
			return 0
		"reach_bureau", "enter_bureau":
			return 1
		"talk_vane":
			return 2
		"open_form_17b":
			return 3
		"submit_form_17b":
			return 4
		_:
			return 5
