extends Control

const TILE_HIDDEN := "?"
const TILE_DIRT := "DIRT"
const TILE_ROCK := "ROCK"
const TILE_ORE := "ORE"
const TILE_HAZARD := "RISK"
const TITLE_SCREEN_TEXTURE := "res://assets/ui/title_screen.png"
const HUB_SCREEN_TEXTURE := "res://assets/ui/hub_screen.png"
const DIALOGUE_SCREEN_TEXTURE := "res://assets/ui/dialogue_screen.png"
const PERMIT_SCREEN_TEXTURE := "res://assets/ui/permit_screen.png"
const MINE_SCREEN_TEXTURE := "res://assets/ui/mine_screen.png"

const RESOURCE_ICON_PATHS := {
	"money": "res://assets/ui/icons/icon_coin_one_credit.png",
	"ore": "res://assets/ui/icons/icon_raw_gold_cluster.png",
	"energy": "res://assets/ui/icons/icon_energy_bolt_teal.png",
	"trust": "res://assets/ui/icons/icon_trust_handshake.png",
	"influence": "res://assets/ui/icons/icon_influence_growth_chart.png",
	"exposure": "res://assets/ui/icons/icon_exposure_eye.png",
}
const BUILDING_ICON_PATHS := {
	"licensing_office": "res://assets/ui/icons/icon_permit_clipboard.png",
	"mine_entrance": "res://assets/ui/icons/action_dig_shovel.png",
	"union_hall": "res://assets/ui/icons/icon_union_flag_fist.png",
	"fixer_den": "res://assets/ui/icons/icon_fixers_network.png",
	"hotline_booth": "res://assets/ui/icons/icon_media_megaphone.png",
	"chief_hut": "res://assets/ui/icons/icon_trust_handshake.png",
	"inspector_hq": "res://assets/ui/icons/icon_status_shield_check.png",
}
const BUILDING_NPC_IDS := {
	"licensing_office": "licensing",
	"union_hall": "union",
	"fixer_den": "fixer",
	"hotline_booth": "journalist",
	"chief_hut": "chief",
	"inspector_hq": "inspector",
}
const NPC_PORTRAIT_PATHS := {
	"licensing": "res://assets/ui/dialogue/portrait_licensing_officer_full.png",
	"union": "res://assets/ui/dialogue/portrait_union_liaison_label.png",
	"inspector": "res://assets/ui/dialogue/portrait_district_inspector_full.png",
	"fixer": "res://assets/ui/dialogue/portrait_claims_surveyor_full.png",
	"journalist": "res://assets/ui/dialogue/portrait_records_clerk_bust.png",
	"chief": "res://assets/ui/dialogue/portrait_safety_marshal_full.png",
}
const PERMIT_ICON_PATHS := {
	"extraction-intent": "res://assets/ui/permits/permit_form_extraction_intent_approved.png",
	"prospecting-license": "res://assets/ui/permits/permit_form_prospecting_approved.png",
	"mining-permit-iron": "res://assets/ui/permits/permit_form_iron_extraction_rejected.png",
	"prospecting-permit-deep": "res://assets/ui/permits/permit_form_operation_maybe_approved.png",
	"mining-permit-deep": "res://assets/ui/permits/permit_form_safety_inspection_approved.png",
	"export-license": "res://assets/ui/icons/icon_sealed_approval_document.png",
	"wash-plant-permit": "res://assets/ui/icons/icon_tools_wrench_screwdriver.png",
	"claim-expansion": "res://assets/ui/icons/icon_map_pin_hex.png",
}
const PERMIT_STATUS_ICON_PATHS := {
	"APPROVED": "res://assets/ui/permits/permit_stamp_approved.png",
	"REJECTED": "res://assets/ui/permits/permit_stamp_rejected.png",
	"PENDING": "res://assets/ui/permits/permit_stamp_pending.png",
	"AVAILABLE": "res://assets/ui/permits/permit_stamp_filed.png",
	"LOCKED": "res://assets/ui/icons/icon_locked_route_grey.png",
}
const MINE_TILE_TEXTURES := {
	"HIDDEN": "res://assets/ui/mine/mine_tile_shaft_hole.png",
	"DIRT": "res://assets/ui/mine/mine_tile_wood_support.png",
	"ROCK": "res://assets/ui/mine/mine_tile_scrap_gears.png",
	"ORE": "res://assets/ui/mine/mine_tile_gold_ore.png",
	"RISK": "res://assets/ui/mine/mine_tile_collapse_warning.png",
	"MINED": "res://assets/ui/mine/mine_tile_hazard_barrier.png",
}
const ACTION_ICON_PATHS := {
	"dig": "res://assets/ui/icons/action_dig_shovel.png",
	"scan": "res://assets/ui/icons/icon_scanner_radar.png",
	"extract": "res://assets/ui/icons/action_export_ore_cart.png",
	"retreat": "res://assets/ui/icons/action_exit_sign.png",
	"hub": "res://assets/ui/icons/icon_map_pin_target.png",
	"permits": "res://assets/ui/icons/icon_permit_clipboard.png",
	"mine": "res://assets/ui/icons/action_dig_shovel.png",
	"shift": "res://assets/ui/icons/icon_cooldown_clock.png",
	"submit": "res://assets/ui/permits/permit_stamp_filed.png",
	"approve": "res://assets/ui/permits/permit_stamp_approved.png",
	"back": "res://assets/ui/icons/icon_map_pin_down.png",
}

var current_screen := "title"
var selected_tile_id := ""
var current_mine_id := "iron-vein"
var active_permit_id := "extraction-intent"
var shift_hours := 4.0
var quarterly_quota_target := 20
var quarterly_quota_progress := 0
var current_directive_title := "Increase Ore Output"
var current_directive_body := "Meet your quarterly extraction quota before the inspectors arrive."
var mine_session_report := ""

var root_margin: MarginContainer
var screen_stack: VBoxContainer
var hud_bar: HBoxContainer
var title_panel: Control
var hub_panel: Control
var dialogue_panel: Control
var permit_panel: Control
var mine_panel: Control
var footer_bar: HBoxContainer
var toast_label: Label

var resource_labels := {}
var hub_status_label: Label
var directive_title_label: Label
var directive_body_label: Label
var building_button_map := {}
var dialogue_name_label: Label
var dialogue_text_label: RichTextLabel
var dialogue_options_box: VBoxContainer
var permit_path_box: VBoxContainer
var permit_detail_box: VBoxContainer
var permit_action_label: Label
var permit_buttons := {}
var dialogue_portrait: TextureRect
var mine_grid: GridContainer
var mine_select_box: VBoxContainer
var mine_info_label: Label
var mine_report_label: Label
var mine_action_label: Label

func _ready() -> void:
	_build_shell()
	_show_screen("title")
	_refresh_all()

func _build_shell() -> void:
	mouse_filter = Control.MOUSE_FILTER_STOP
	var background := ColorRect.new()
	background.color = Color("17130f")
	background.layout_mode = 1
	background.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	add_child(background)

	root_margin = MarginContainer.new()
	root_margin.layout_mode = 1
	root_margin.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	root_margin.add_theme_constant_override("margin_left", 24)
	root_margin.add_theme_constant_override("margin_right", 24)
	root_margin.add_theme_constant_override("margin_top", 24)
	root_margin.add_theme_constant_override("margin_bottom", 24)
	add_child(root_margin)

	screen_stack = VBoxContainer.new()
	screen_stack.size_flags_vertical = Control.SIZE_EXPAND_FILL
	screen_stack.add_theme_constant_override("separation", 18)
	root_margin.add_child(screen_stack)

	hud_bar = HBoxContainer.new()
	hud_bar.alignment = BoxContainer.ALIGNMENT_CENTER
	hud_bar.add_theme_constant_override("separation", 10)
	screen_stack.add_child(hud_bar)
	_build_hud()

	title_panel = _build_title_panel()
	hub_panel = _build_hub_panel()
	dialogue_panel = _build_dialogue_panel()
	permit_panel = _build_permit_panel()
	mine_panel = _build_mine_panel()

	screen_stack.add_child(title_panel)
	screen_stack.add_child(hub_panel)
	screen_stack.add_child(dialogue_panel)
	screen_stack.add_child(permit_panel)
	screen_stack.add_child(mine_panel)

	toast_label = Label.new()
	toast_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	toast_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	toast_label.add_theme_font_size_override("font_size", 24)
	toast_label.modulate = Color("f4d7a1")
	screen_stack.add_child(toast_label)

	footer_bar = HBoxContainer.new()
	footer_bar.alignment = BoxContainer.ALIGNMENT_CENTER
	footer_bar.add_theme_constant_override("separation", 12)
	screen_stack.add_child(footer_bar)
	_build_footer()

func _build_hud() -> void:
	for resource_id in ["money", "ore", "energy", "trust", "influence", "exposure"]:
		var card := _create_card("", 132)
		var body := HBoxContainer.new()
		body.alignment = BoxContainer.ALIGNMENT_CENTER
		body.add_theme_constant_override("separation", 6)
		card.add_child(body)
		body.add_child(_create_icon_rect(String(RESOURCE_ICON_PATHS.get(resource_id, "")), Vector2(34, 34)))
		var value := Label.new()
		value.horizontal_alignment = HORIZONTAL_ALIGNMENT_LEFT
		value.add_theme_font_size_override("font_size", 20)
		value.add_theme_color_override("font_color", Color("2d2217"))
		body.add_child(value)
		resource_labels[resource_id] = value
		hud_bar.add_child(card)

func _build_title_panel() -> Control:
	var panel := _create_screen_panel(TITLE_SCREEN_TEXTURE)
	var overlay := panel.get_meta("overlay") as Control
	var new_game := _create_action_button("New Game", "_on_new_game_pressed", Color("cc9b35"), "res://assets/ui/icons/icon_objective_star.png")
	_place_overlay_control(overlay, new_game, 214, 1186, 438, 116)
	var continue_button := _create_action_button("Continue", "_on_continue_pressed", Color("4875a8"), "res://assets/ui/icons/action_continue_arrow_green.png")
	_place_overlay_control(overlay, continue_button, 214, 1328, 438, 116)
	var settings_button := _create_action_button("Quick Start", "_on_new_game_pressed", Color("c9b186"), "res://assets/ui/icons/icon_fast_forward_purple.png")
	_place_overlay_control(overlay, settings_button, 214, 1470, 438, 100)
	return panel

func _build_hub_panel() -> Control:
	var panel := _create_screen_panel(HUB_SCREEN_TEXTURE)
	var overlay := panel.get_meta("overlay") as Control

	directive_title_label = Label.new()
	directive_title_label.add_theme_font_size_override("font_size", 30)
	directive_title_label.add_theme_color_override("font_color", Color("2d2217"))
	directive_title_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	_place_overlay_control(overlay, directive_title_label, 218, 205, 330, 80)
	directive_body_label = Label.new()
	directive_body_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	directive_body_label.add_theme_font_size_override("font_size", 22)
	directive_body_label.add_theme_color_override("font_color", Color("2d2217"))
	_place_overlay_control(overlay, directive_body_label, 202, 310, 390, 110)

	hub_status_label = Label.new()
	hub_status_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	hub_status_label.add_theme_font_size_override("font_size", 20)
	hub_status_label.add_theme_color_override("font_color", Color("2d2217"))
	place_overlay_panel(overlay, hub_status_label, 610, 334, 170, 135, false)
	var advance_shift := _create_action_button("Shift", "_on_advance_shift_pressed", Color("7d9d49"), ACTION_ICON_PATHS["shift"])
	_place_overlay_control(overlay, advance_shift, 616, 402, 150, 60)

	for building_id in ["licensing_office", "mine_entrance", "union_hall", "fixer_den", "hotline_booth", "chief_hut", "inspector_hq"]:
		var button := _create_asset_button("", String(BUILDING_ICON_PATHS.get(building_id, "")), Color("d3af62"))
		button.tooltip_text = building_id
		button.pressed.connect(_on_building_pressed.bind(building_id))
		building_button_map[building_id] = button
		match building_id:
			"licensing_office":
				_place_overlay_control(overlay, button, 309, 566, 240, 260)
			"mine_entrance":
				_place_overlay_control(overlay, button, 73, 486, 220, 242)
			"union_hall":
				_place_overlay_control(overlay, button, 600, 850, 205, 240)
			"fixer_den":
				_place_overlay_control(overlay, button, 556, 561, 245, 240)
			"hotline_booth":
				_place_overlay_control(overlay, button, 18, 453, 160, 120)
			"chief_hut":
				_place_overlay_control(overlay, button, 28, 250, 185, 146)
			"inspector_hq":
				_place_overlay_control(overlay, button, 598, 290, 190, 112)
	return panel

func _build_dialogue_panel() -> Control:
	var panel := _create_screen_panel(DIALOGUE_SCREEN_TEXTURE)
	var overlay := panel.get_meta("overlay") as Control
	dialogue_name_label = Label.new()
	dialogue_name_label.add_theme_font_size_override("font_size", 28)
	dialogue_name_label.add_theme_color_override("font_color", Color("3a2917"))
	_place_overlay_control(overlay, dialogue_name_label, 256, 566, 360, 42)
	dialogue_portrait = TextureRect.new()
	dialogue_portrait.expand_mode = TextureRect.EXPAND_FIT_WIDTH_PROPORTIONAL
	dialogue_portrait.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
	_place_overlay_control(overlay, dialogue_portrait, 56, 536, 168, 210)
	dialogue_text_label = RichTextLabel.new()
	dialogue_text_label.fit_content = true
	dialogue_text_label.scroll_active = false
	dialogue_text_label.bbcode_enabled = false
	dialogue_text_label.add_theme_font_size_override("normal_font_size", 24)
	dialogue_text_label.add_theme_color_override("default_color", Color("2d2217"))
	place_overlay_panel(overlay, dialogue_text_label, 128, 680, 610, 170, false)

	dialogue_options_box = VBoxContainer.new()
	dialogue_options_box.add_theme_constant_override("separation", 10)
	_place_overlay_control(overlay, dialogue_options_box, 73, 924, 718, 470)

	var back_button := _create_action_button("Back", "_on_dialogue_back_pressed", Color("6c6356"), ACTION_ICON_PATHS["back"])
	_place_overlay_control(overlay, back_button, 28, 82, 118, 84)
	return panel

func _build_permit_panel() -> Control:
	var panel := _create_screen_panel(PERMIT_SCREEN_TEXTURE)
	var overlay := panel.get_meta("overlay") as Control
	permit_path_box = VBoxContainer.new()
	permit_path_box.add_theme_constant_override("separation", 8)
	place_overlay_panel(overlay, permit_path_box, 34, 155, 180, 570, false)

	permit_detail_box = VBoxContainer.new()
	permit_detail_box.add_theme_constant_override("separation", 10)
	place_overlay_panel(overlay, permit_detail_box, 265, 178, 476, 560, false)
	permit_action_label = Label.new()
	permit_action_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	permit_action_label.add_theme_font_size_override("font_size", 22)
	permit_action_label.add_theme_color_override("font_color", Color("6d3d22"))
	_place_overlay_control(overlay, permit_action_label, 266, 756, 470, 120)
	var submit_button := _create_action_button("Submit & Pay", "_on_submit_permit_pressed", Color("7d9d49"), ACTION_ICON_PATHS["submit"])
	var approve_button := _create_action_button("Process", "_on_force_process_permits_pressed", Color("c58c2d"), ACTION_ICON_PATHS["approve"])
	_place_overlay_control(overlay, submit_button, 356, 1451, 414, 92)
	_place_overlay_control(overlay, approve_button, 590, 1168, 188, 95)

	var back_button := _create_action_button("Back", "_on_hub_pressed", Color("6c6356"), ACTION_ICON_PATHS["back"])
	_place_overlay_control(overlay, back_button, 20, 90, 118, 82)
	return panel

func _build_mine_panel() -> Control:
	var panel := _create_screen_panel(MINE_SCREEN_TEXTURE)
	var overlay := panel.get_meta("overlay") as Control
	mine_info_label = Label.new()
	mine_info_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	mine_info_label.add_theme_font_size_override("font_size", 22)
	mine_info_label.add_theme_color_override("font_color", Color("f5ead2"))
	place_overlay_panel(overlay, mine_info_label, 38, 109, 230, 220, false)
	mine_select_box = VBoxContainer.new()
	mine_select_box.add_theme_constant_override("separation", 6)
	_place_overlay_control(overlay, mine_select_box, 38, 326, 180, 260)

	mine_report_label = Label.new()
	mine_report_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	mine_report_label.add_theme_font_size_override("font_size", 22)
	mine_report_label.add_theme_color_override("font_color", Color("f5ead2"))
	place_overlay_panel(overlay, mine_report_label, 629, 404, 185, 120, false)

	mine_grid = GridContainer.new()
	mine_grid.columns = 5
	mine_grid.add_theme_constant_override("h_separation", 6)
	mine_grid.add_theme_constant_override("v_separation", 6)
	_place_overlay_control(overlay, mine_grid, 232, 353, 399, 742)
	mine_action_label = Label.new()
	mine_action_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	mine_action_label.add_theme_font_size_override("font_size", 22)
	mine_action_label.add_theme_color_override("font_color", Color("f5ead2"))
	_place_overlay_control(overlay, mine_action_label, 308, 1097, 250, 44)

	_place_overlay_control(overlay, _create_action_button("Dig", "_on_dig_pressed", Color("7d9d49"), ACTION_ICON_PATHS["dig"]), 16, 1148, 200, 212)
	_place_overlay_control(overlay, _create_action_button("Scan", "_on_scan_pressed", Color("4c7b9d"), ACTION_ICON_PATHS["scan"]), 227, 1148, 200, 212)
	_place_overlay_control(overlay, _create_action_button("Extract", "_on_extract_pressed", Color("c58c2d"), ACTION_ICON_PATHS["extract"]), 438, 1148, 200, 212)
	_place_overlay_control(overlay, _create_action_button("Retreat", "_on_retreat_pressed", Color("9d5a3a"), ACTION_ICON_PATHS["retreat"]), 648, 1148, 200, 212)
	return panel

func _create_screen_panel(texture_path: String) -> PanelContainer:
	var panel := PanelContainer.new()
	panel.size_flags_vertical = Control.SIZE_EXPAND_FILL
	panel.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	panel.add_theme_stylebox_override("panel", _make_texture_panel_style(texture_path))

	var overlay := Control.new()
	overlay.layout_mode = 1
	overlay.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	panel.add_child(overlay)
	panel.set_meta("overlay", overlay)
	return panel

func _build_footer() -> void:
	footer_bar.add_child(_create_action_button("Hub", "_on_hub_pressed", Color("53483d"), ACTION_ICON_PATHS["hub"]))
	footer_bar.add_child(_create_action_button("Permits", "_on_permits_pressed", Color("53483d"), ACTION_ICON_PATHS["permits"]))
	footer_bar.add_child(_create_action_button("Mine", "_on_mine_pressed", Color("53483d"), ACTION_ICON_PATHS["mine"]))

func _create_card(title: String, min_width: int, emphasize := false) -> PanelContainer:
	var card := PanelContainer.new()
	card.custom_minimum_size = Vector2(min_width, 0)
	card.size_flags_horizontal = Control.SIZE_EXPAND_FILL if min_width == 0 else 0
	card.add_theme_stylebox_override("panel", _make_panel_style(emphasize))
	var body := VBoxContainer.new()
	body.add_theme_constant_override("separation", 8)
	card.add_child(body)
	if not title.is_empty():
		var title_label := Label.new()
		title_label.text = title
		title_label.add_theme_font_size_override("font_size", 28 if emphasize else 24)
		title_label.add_theme_color_override("font_color", Color("2d2217"))
		body.add_child(title_label)
	return card

func _create_action_button(label: String, method_name: String, color: Color, icon_path := "") -> Button:
	var button := _create_asset_button(label, icon_path, color)
	button.pressed.connect(Callable(self, method_name))
	return button

func _create_asset_button(label: String, icon_path: String, color: Color) -> Button:
	var button := Button.new()
	button.text = label
	button.custom_minimum_size = Vector2(0, 68)
	button.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	button.focus_mode = Control.FOCUS_NONE
	button.add_theme_font_size_override("font_size", 22)
	button.add_theme_color_override("font_color", Color("24180f"))
	button.add_theme_color_override("font_hover_color", Color("24180f"))
	button.add_theme_color_override("font_pressed_color", Color("24180f"))
	button.icon_alignment = HORIZONTAL_ALIGNMENT_CENTER
	button.vertical_icon_alignment = VERTICAL_ALIGNMENT_TOP
	button.expand_icon = true
	if not icon_path.is_empty():
		button.icon = _load_runtime_texture(icon_path)
	button.add_theme_stylebox_override("normal", _make_button_style(color, 0.95))
	button.add_theme_stylebox_override("hover", _make_button_style(color.lightened(0.08), 1.0))
	button.add_theme_stylebox_override("pressed", _make_button_style(color.darkened(0.08), 1.0))
	return button

func _create_icon_rect(icon_path: String, minimum_size: Vector2) -> TextureRect:
	var icon := TextureRect.new()
	icon.custom_minimum_size = minimum_size
	icon.expand_mode = TextureRect.EXPAND_FIT_WIDTH_PROPORTIONAL
	icon.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
	if not icon_path.is_empty():
		icon.texture = _load_runtime_texture(icon_path)
	return icon

func _make_panel_style(emphasize := false) -> StyleBoxFlat:
	var style := StyleBoxFlat.new()
	style.bg_color = Color("e8d7b4") if emphasize else Color("d8c09a")
	style.border_width_left = 4
	style.border_width_top = 4
	style.border_width_right = 4
	style.border_width_bottom = 4
	style.border_color = Color("60452d")
	style.corner_radius_top_left = 18
	style.corner_radius_top_right = 18
	style.corner_radius_bottom_right = 18
	style.corner_radius_bottom_left = 18
	style.content_margin_left = 16
	style.content_margin_top = 16
	style.content_margin_right = 16
	style.content_margin_bottom = 16
	return style

func _make_texture_panel_style(texture_path: String) -> StyleBoxTexture:
	var style := StyleBoxTexture.new()
	style.texture = _load_runtime_texture(texture_path)
	style.texture_margin_left = 24
	style.texture_margin_top = 24
	style.texture_margin_right = 24
	style.texture_margin_bottom = 24
	return style

func _load_runtime_texture(texture_path: String) -> Texture2D:
	var image := Image.new()
	var error := image.load(ProjectSettings.globalize_path(texture_path))
	if error != OK:
		return null
	return ImageTexture.create_from_image(image)

func _place_overlay_control(parent: Control, control: Control, x: float, y: float, width: float, height: float) -> void:
	control.layout_mode = 1
	control.anchor_left = x / 864.0
	control.anchor_top = y / 1536.0
	control.anchor_right = (x + width) / 864.0
	control.anchor_bottom = (y + height) / 1536.0
	control.offset_left = 0
	control.offset_top = 0
	control.offset_right = 0
	control.offset_bottom = 0
	parent.add_child(control)

func place_overlay_panel(parent: Control, child: Control, x: float, y: float, width: float, height: float, with_background := true) -> void:
	var wrapper := PanelContainer.new()
	wrapper.add_theme_stylebox_override("panel", _make_panel_style(false) if with_background else _make_clear_panel_style())
	_place_overlay_control(parent, wrapper, x, y, width, height)
	child.layout_mode = 1
	child.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	wrapper.add_child(child)

func _make_clear_panel_style() -> StyleBoxFlat:
	var style := StyleBoxFlat.new()
	style.bg_color = Color(0, 0, 0, 0.0)
	style.border_width_left = 0
	style.border_width_top = 0
	style.border_width_right = 0
	style.border_width_bottom = 0
	return style

func _make_hotspot_style(alpha := 0.1) -> StyleBoxFlat:
	var style := StyleBoxFlat.new()
	style.bg_color = Color(1, 0.84, 0.5, alpha)
	style.border_width_left = 2
	style.border_width_top = 2
	style.border_width_right = 2
	style.border_width_bottom = 2
	style.border_color = Color(0.95, 0.82, 0.55, min(0.55, alpha + 0.2))
	style.corner_radius_top_left = 12
	style.corner_radius_top_right = 12
	style.corner_radius_bottom_right = 12
	style.corner_radius_bottom_left = 12
	return style

func _make_button_style(color: Color, alpha: float) -> StyleBoxFlat:
	var style := StyleBoxFlat.new()
	style.bg_color = Color(color, alpha)
	style.corner_radius_top_left = 16
	style.corner_radius_top_right = 16
	style.corner_radius_bottom_right = 16
	style.corner_radius_bottom_left = 16
	style.border_width_left = 3
	style.border_width_top = 3
	style.border_width_right = 3
	style.border_width_bottom = 3
	style.border_color = Color("3f2d1c")
	style.content_margin_top = 10
	style.content_margin_bottom = 10
	style.content_margin_left = 16
	style.content_margin_right = 16
	return style

func _show_screen(screen_id: String) -> void:
	current_screen = screen_id
	title_panel.visible = screen_id == "title"
	hub_panel.visible = screen_id == "hub"
	dialogue_panel.visible = screen_id == "dialogue"
	permit_panel.visible = screen_id == "permit"
	mine_panel.visible = screen_id == "mine"
	footer_bar.visible = false
	hud_bar.visible = false

func _refresh_all() -> void:
	_refresh_hud()
	_refresh_hub()
	_refresh_dialogue()
	_refresh_permits()
	_refresh_mine()

func _refresh_hud() -> void:
	var state := GameState.get_state()
	resource_labels["money"].text = "$%d" % int(state.get("money", 0))
	resource_labels["ore"].text = "%d ore" % int(state.get("ore", 0))
	resource_labels["energy"].text = "%d/%d" % [int(state.get("energy", 0)), int(state.get("max_energy", 100))]
	resource_labels["trust"].text = "%d%%" % int(state.get("meters", {}).get("trust", 0))
	resource_labels["influence"].text = "%d%%" % int(state.get("meters", {}).get("influence", 0))
	resource_labels["exposure"].text = "%d%%" % int(state.get("meters", {}).get("exposure", 0))

func _refresh_hub() -> void:
	var state := GameState.get_state()
	hub_status_label.text = "Day %d, %02d:00\nQuota %d / %d\n%s" % [
		int(state.get("day", 1)),
		int(state.get("time", 8.0)),
		quarterly_quota_progress,
		quarterly_quota_target,
		mine_session_report if not mine_session_report.is_empty() else "Inspector still not impressed."
	]
	directive_title_label.text = current_directive_title
	directive_body_label.text = current_directive_body
	for building_id in building_button_map.keys():
		var building: Dictionary = state.get("buildings", {}).get(building_id, {})
		var discovered := bool(building.get("is_discovered", false))
		var label := "%s\n%s" % [String(building.get("name", building_id)), "Open" if discovered else "Scout"]
		building_button_map[building_id].text = label

func _refresh_dialogue() -> void:
	if current_screen != "dialogue":
		return
	var state := GameState.get_state()
	var npc_id := String(state.get("active_npc_id", ""))
	var npc: Dictionary = state.get("npcs", {}).get(npc_id, {})
	dialogue_name_label.text = String(npc.get("name", "No Clerk"))
	dialogue_portrait.texture = _load_runtime_texture(String(NPC_PORTRAIT_PATHS.get(npc_id, "res://assets/ui/dialogue/portrait_licensing_officer_full.png")))
	var node: Dictionary = GameState.get_active_dialogue_node()
	if node.is_empty():
		dialogue_text_label.text = "Nobody is assigned to this desk yet."
	else:
		dialogue_text_label.text = String(node.get("text", "No active dialogue."))
	for child in dialogue_options_box.get_children():
		child.queue_free()
	for option_variant in node.get("options", []):
		var option: Dictionary = option_variant
		var button := _create_action_button(String(option.get("text", "Option")), "_noop", Color("c9b186"), "res://assets/ui/icons/icon_dialogue_argument.png")
		button.pressed.disconnect(Callable(self, "_noop"))
		button.pressed.connect(_on_dialogue_option_pressed.bind(String(option.get("id", ""))))
		dialogue_options_box.add_child(button)

func _refresh_permits() -> void:
	for child in permit_path_box.get_children():
		child.queue_free()
	for child in permit_detail_box.get_children():
		child.queue_free()
	var state := GameState.get_state()
	permit_buttons = {}
	var permit_ids := _get_ordered_permit_ids(state)
	if not state.get("permits", {}).has(active_permit_id):
		active_permit_id = "extraction-intent"
	for permit_id in permit_ids:
		var permit: Dictionary = state.get("permits", {}).get(permit_id, {})
		var status := String(permit.get("status", "LOCKED"))
		var entry := _create_asset_button(
			"%s\n%s" % [String(permit.get("form_number", permit_id)), status],
			String(PERMIT_STATUS_ICON_PATHS.get(status, "")),
			_get_permit_status_color(status)
		)
		entry.disabled = status == "LOCKED"
		entry.pressed.connect(_on_permit_selected.bind(permit_id))
		permit_buttons[permit_id] = entry
		permit_path_box.add_child(entry)
	var active_permit: Dictionary = state.get("permits", {}).get(active_permit_id, {})
	var permit_art := _create_icon_rect(String(PERMIT_ICON_PATHS.get(active_permit_id, "res://assets/ui/icons/icon_permit_clipboard.png")), Vector2(130, 120))
	permit_detail_box.add_child(permit_art)
	for line in [
		String(active_permit.get("name", active_permit_id)),
		"Form %s | Cost %d credits | %s" % [
			String(active_permit.get("form_number", "")),
			int(active_permit.get("cost", 0)),
			String(active_permit.get("status", "LOCKED"))
		],
		String(active_permit.get("description", ""))
	]:
		var label := Label.new()
		label.text = line
		label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
		label.add_theme_font_size_override("font_size", 22)
		label.add_theme_color_override("font_color", Color("2d2217"))
		permit_detail_box.add_child(label)
	var rejection_reason := String(active_permit.get("rejection_reason", ""))
	permit_action_label.text = rejection_reason if not rejection_reason.is_empty() else _get_permit_prompt(active_permit)

func _refresh_mine() -> void:
	for child in mine_grid.get_children():
		child.queue_free()
	for child in mine_select_box.get_children():
		child.queue_free()
	var state := GameState.get_state()
	for mine_variant in state.get("mines", []):
		var candidate: Dictionary = mine_variant
		if not bool(candidate.get("discovered", false)):
			continue
		var mine_button := _create_asset_button(
			String(candidate.get("name", candidate.get("id", ""))),
			"res://assets/ui/icons/icon_map_pin_target.png",
			Color("6c6356") if String(candidate.get("id", "")) != current_mine_id else Color("c58c2d")
		)
		mine_button.pressed.connect(_on_mine_selected.bind(String(candidate.get("id", ""))))
		mine_select_box.add_child(mine_button)
	var mine := _get_current_mine()
	if mine.is_empty():
		mine_info_label.text = "No mine selected."
		mine_report_label.text = ""
		return
	mine_info_label.text = "Quota %d / %d\nMine status: %s\nEnergy cost matters." % [
		quarterly_quota_progress,
		quarterly_quota_target,
		String(mine.get("status", "PROSPECTING"))
	]
	mine_report_label.text = mine_session_report if not mine_session_report.is_empty() else "Select a tile, then scan or dig."
	for tile_variant in mine.get("grid", []):
		var tile: Dictionary = tile_variant
		var tile_key := _get_tile_visual_key(tile)
		var button := _create_asset_button(_get_tile_label(tile), String(MINE_TILE_TEXTURES.get(tile_key, MINE_TILE_TEXTURES["DIRT"])), _get_tile_color(tile))
		button.custom_minimum_size = Vector2(0, 82)
		button.add_theme_font_size_override("font_size", 14)
		if String(tile.get("id", "")) == selected_tile_id:
			button.add_theme_stylebox_override("normal", _make_button_style(Color("f1c35b"), 1.0))
		button.pressed.connect(_on_tile_selected.bind(String(tile.get("id", ""))))
		mine_grid.add_child(button)
	mine_action_label.text = "Selected tile: %s" % (selected_tile_id if not selected_tile_id.is_empty() else "none")

func _get_tile_label(tile: Dictionary) -> String:
	if bool(tile.get("mined", false)):
		return "DONE"
	if not bool(tile.get("revealed", false)):
		return TILE_HIDDEN
	if int(tile.get("stability", 100)) < 55:
		return TILE_HAZARD
	return String(tile.get("type", TILE_DIRT))

func _get_tile_visual_key(tile: Dictionary) -> String:
	if bool(tile.get("mined", false)):
		return "MINED"
	if not bool(tile.get("revealed", false)):
		return "HIDDEN"
	if int(tile.get("stability", 100)) < 55:
		return "RISK"
	return String(tile.get("type", TILE_DIRT))

func _get_tile_color(tile: Dictionary) -> Color:
	if bool(tile.get("mined", false)):
		return Color("6d6258")
	if not bool(tile.get("revealed", false)):
		return Color("5b5043")
	if int(tile.get("stability", 100)) < 55:
		return Color("a24b35")
	match String(tile.get("type", TILE_DIRT)):
		TILE_ORE:
			return Color("c9a32c")
		TILE_ROCK:
			return Color("7f7b78")
		_:
			return Color("7d5d3a")

func _get_ordered_permit_ids(state: Dictionary) -> Array[String]:
	var preferred := [
		"extraction-intent",
		"prospecting-license",
		"mining-permit-iron",
		"export-license",
		"wash-plant-permit",
		"claim-expansion",
		"prospecting-permit-deep",
		"mining-permit-deep",
		"prospecting-permit-abyss",
		"mining-permit-abyss",
	]
	var result: Array[String] = []
	var permits: Dictionary = state.get("permits", {})
	for permit_id in preferred:
		if permits.has(permit_id):
			result.append(permit_id)
	for permit_id_variant in permits.keys():
		var permit_id := String(permit_id_variant)
		if not result.has(permit_id):
			result.append(permit_id)
	return result

func _get_permit_status_color(status: String) -> Color:
	match status:
		"APPROVED":
			return Color("7d9d49")
		"REJECTED":
			return Color("a24b35")
		"PENDING":
			return Color("c58c2d")
		"AVAILABLE":
			return Color("c9b186")
		_:
			return Color("6c6356")

func _get_permit_prompt(permit: Dictionary) -> String:
	match String(permit.get("status", "LOCKED")):
		"AVAILABLE":
			return "Ready to file. Pay the fee and submit."
		"REJECTED":
			return "Rejected. Refile cleanly or talk to the right clerk."
		"PENDING":
			return "Pending. Advance a shift or push the desk."
		"APPROVED":
			return "Approved. This unlock is live in your file."
		_:
			return "Locked behind prior paperwork. Bureau says no."

func _get_current_mine() -> Dictionary:
	var state := GameState.get_state()
	for mine_variant in state.get("mines", []):
		var mine: Dictionary = mine_variant
		if String(mine.get("id", "")) == current_mine_id:
			return mine
	return {}

func _update_current_mine(updated_mine: Dictionary) -> void:
	var state := GameState.state
	for index in range(state.get("mines", []).size()):
		if String(state["mines"][index].get("id", "")) == String(updated_mine.get("id", "")):
			state["mines"][index] = updated_mine
			return

func _find_tile(tile_id: String) -> Dictionary:
	var mine := _get_current_mine()
	for tile_variant in mine.get("grid", []):
		var tile: Dictionary = tile_variant
		if String(tile.get("id", "")) == tile_id:
			return tile
	return {}

func _replace_tile(updated_tile: Dictionary) -> void:
	var mine := _get_current_mine()
	var grid: Array = mine.get("grid", [])
	for index in range(grid.size()):
		var tile: Dictionary = grid[index]
		if String(tile.get("id", "")) == String(updated_tile.get("id", "")):
			grid[index] = updated_tile
			mine["grid"] = grid
			_update_current_mine(mine)
			return

func _show_toast(message: String) -> void:
	toast_label.text = message

func _on_new_game_pressed() -> void:
	GameState.reset_new_game()
	quarterly_quota_progress = 0
	mine_session_report = ""
	_show_screen("hub")
	_show_toast("Fresh file opened. Time to make bureaucracy funny.")
	_refresh_all()

func _on_continue_pressed() -> void:
	if not GameState.load_saved_state():
		_show_toast("No save file yet. Start a new run.")
		return
	_show_screen("hub")
	_show_toast("Back to the desk.")
	_refresh_all()

func _on_building_pressed(building_id: String) -> void:
	if building_id == "mine_entrance":
		_on_mine_pressed()
		return
	if BUILDING_NPC_IDS.has(building_id):
		var npc_id := String(BUILDING_NPC_IDS[building_id])
		GameState.enter_building(building_id)
		GameState.talk_to_npc(npc_id)
		_show_screen("dialogue")
		_show_toast("%s is ready to talk." % String(GameState.get_state().get("npcs", {}).get(npc_id, {}).get("name", npc_id)))
	else:
		GameState.discover_building(building_id)
		_show_toast("%s is noted for future content." % String(GameState.get_state().get("buildings", {}).get(building_id, {}).get("name", building_id)))
	_refresh_all()

func _on_dialogue_option_pressed(option_id: String) -> void:
	var notifications := GameState.choose_dialogue_option(option_id)
	if not notifications.is_empty():
		_show_toast(", ".join(notifications))
	else:
		_show_toast("Clerk updated.")
	_refresh_all()

func _on_dialogue_back_pressed() -> void:
	GameState.return_office_to_directory()
	_show_screen("hub")
	_refresh_all()

func _on_permit_selected(permit_id: String) -> void:
	active_permit_id = permit_id
	GameState.open_permit(permit_id)
	_refresh_all()

func _on_mine_selected(mine_id: String) -> void:
	current_mine_id = mine_id
	selected_tile_id = ""
	_show_toast("Mine selected: %s" % String(_get_current_mine().get("name", mine_id)))
	_refresh_all()

func _on_submit_permit_pressed() -> void:
	var state := GameState.get_state()
	var permit: Dictionary = state.get("permits", {}).get(active_permit_id, {})
	if String(permit.get("status", "")) not in ["AVAILABLE", "REJECTED"]:
		_show_toast("Nothing to file right now.")
		return
	if int(state.get("money", 0)) < int(permit.get("cost", 0)):
		_show_toast("Not enough credits. Try mining first.")
		return
	GameState.state["money"] = int(GameState.state.get("money", 0)) - int(permit.get("cost", 0))
	GameState.set_permit_status(active_permit_id, "PENDING")
	GameState.set_permit_accuracy(active_permit_id, 0.75)
	GameState.submit_permit(active_permit_id)
	_show_toast("%s filed. The desk gods will decide." % String(permit.get("form_number", active_permit_id)))
	_refresh_all()

func _on_force_process_permits_pressed() -> void:
	var notifications := GameState.process_pending_permits({
		"extraction-intent_gate": 0.99,
		"extraction-intent_approve": 0.25
	})
	if notifications.is_empty():
		_show_toast("Permits processed.")
	else:
		_show_toast(", ".join(notifications))
	_refresh_all()

func _on_hub_pressed() -> void:
	_show_screen("hub")
	_refresh_all()

func _on_permits_pressed() -> void:
	_show_screen("permit")
	_refresh_all()

func _on_mine_pressed() -> void:
	_show_screen("mine")
	_refresh_all()

func _on_advance_shift_pressed() -> void:
	GameState.state["time"] = fmod(float(GameState.state.get("time", 8.0)) + shift_hours, 24.0)
	if float(GameState.state.get("time", 8.0)) < shift_hours:
		GameState.state["day"] = int(GameState.state.get("day", 1)) + 1
	var permit_notifications := GameState.process_pending_permits()
	var economy_note := GameState.apply_daily_tick()
	GameState.save_state("slot-1")
	var messages: Array[String] = []
	for item in permit_notifications:
		messages.append(String(item))
	if not economy_note.is_empty():
		messages.append(String(economy_note.get("title", "")))
	_show_toast(" | ".join(messages) if not messages.is_empty() else "Shift advanced.")
	_refresh_all()

func _on_tile_selected(tile_id: String) -> void:
	selected_tile_id = tile_id
	_refresh_mine()

func _on_scan_pressed() -> void:
	if selected_tile_id.is_empty():
		_show_toast("Pick a tile first.")
		return
	var tile := _find_tile(selected_tile_id)
	if tile.is_empty():
		return
	if bool(tile.get("revealed", false)):
		_show_toast("Already scanned.")
		return
	GameState.state["energy"] = max(0, int(GameState.state.get("energy", 0)) - 5)
	tile["revealed"] = true
	_replace_tile(tile)
	mine_session_report = "Scan complete: %s" % _get_tile_label(tile)
	_refresh_all()

func _on_dig_pressed() -> void:
	if selected_tile_id.is_empty():
		_show_toast("Pick a tile first.")
		return
	var tile := _find_tile(selected_tile_id)
	if tile.is_empty():
		return
	if bool(tile.get("mined", false)):
		_show_toast("Tile already cleared.")
		return
	GameState.state["energy"] = max(0, int(GameState.state.get("energy", 0)) - 10)
	tile["revealed"] = true
	tile["mined"] = true
	var report := "Just rock dust."
	if String(tile.get("type", "")) == TILE_ORE:
		var ore_gain := 2 if int(tile.get("stability", 100)) >= 55 else 1
		GameState.state["ore"] = int(GameState.state.get("ore", 0)) + ore_gain
		quarterly_quota_progress += ore_gain
		report = "Ore secured: +%d" % ore_gain
	elif int(tile.get("stability", 100)) < 55:
		GameState.state["meters"]["exposure"] = min(100, int(GameState.state.get("meters", {}).get("exposure", 0)) + 4)
		report = "Messy dig. Exposure up."
	_replace_tile(tile)
	mine_session_report = report
	_refresh_all()

func _on_extract_pressed() -> void:
	var ore_amount := int(GameState.get_state().get("ore", 0))
	if ore_amount <= 0:
		_show_toast("No ore to move.")
		return
	var note := GameState.export_ore(ore_amount, "STANDARD")
	mine_session_report = String(note.get("msg", "Haul moved."))
	_refresh_all()

func _on_retreat_pressed() -> void:
	_show_screen("hub")
	mine_session_report = "Shift wrapped. Ore, forms, and plausible deniability secured."
	GameState.save_state("slot-1")
	_refresh_all()

func _noop() -> void:
	pass
