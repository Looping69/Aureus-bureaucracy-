extends Node

@export var initial_scene: PackedScene

func _ready() -> void:
	if initial_scene == null:
		push_error("Main scene is missing its initial_scene reference.")
		return

	SceneCoordinator.change_scene(initial_scene)
