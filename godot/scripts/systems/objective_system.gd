extends RefCounted
class_name ObjectiveSystem

static func is_objective_complete(objectives: Array, objective_id: String) -> bool:
	for objective_variant in objectives:
		var objective: Dictionary = objective_variant
		if objective.get("id", "") == objective_id and bool(objective.get("is_completed", false)):
			return true
	return false

static func complete_objective(objectives: Array, objective_id: String) -> Array:
	var next_objectives: Array = []
	for objective_variant in objectives:
		var objective: Dictionary = objective_variant.duplicate(true)
		if objective.get("id", "") == objective_id:
			objective["is_completed"] = true
		next_objectives.append(objective)
	return next_objectives

static func upsert_objective(objectives: Array, objective: Dictionary) -> Array:
	for objective_variant in objectives:
		var existing: Dictionary = objective_variant
		if existing.get("id", "") == objective.get("id", ""):
			return objectives

	var next_objectives := objectives.duplicate(true)
	next_objectives.append(objective.duplicate(true))
	return next_objectives
