extends Node3D

@onready var environment_node: WorldEnvironment = $Environment

func _ready() -> void:
	GameState.set_active_scene("world")
	_configure_environment()
	_spawn_debug_city_block()

func _configure_environment() -> void:
	var environment := Environment.new()
	environment.background_mode = Environment.BG_COLOR
	environment.background_color = Color("b8d5e3")
	environment.ambient_light_source = Environment.AMBIENT_SOURCE_COLOR
	environment.ambient_light_color = Color("dfe8ef")
	environment.ambient_light_energy = 1.0
	environment.fog_enabled = true
	environment.fog_light_color = Color("c7dbe7")
	environment.fog_density = 0.01
	environment_node.environment = environment

func _spawn_debug_city_block() -> void:
	var box_mesh := BoxMesh.new()
	box_mesh.size = Vector3(2.0, 2.0, 2.0)

	for index in range(3):
		var block := MeshInstance3D.new()
		block.mesh = box_mesh
		block.position = Vector3(index * 3.0 - 3.0, 1.0, 0.0)
		add_child(block)
