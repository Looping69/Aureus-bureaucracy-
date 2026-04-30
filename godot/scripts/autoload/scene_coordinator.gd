extends Node

var current_scene: Node = null

func change_scene(scene_resource: PackedScene):
	if current_scene != null:
		current_scene.queue_free()
		current_scene = null

	if scene_resource == null:
		push_error("SceneCoordinator.change_scene called with null scene_resource")
		return null

	current_scene = scene_resource.instantiate()
	get_tree().current_scene.add_child(current_scene)
	return current_scene
