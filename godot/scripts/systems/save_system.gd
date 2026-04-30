extends RefCounted
class_name SaveSystem

const SAVE_METADATA_PATH := "res://data/bootstrap/save_metadata.json"

static var _metadata_cache: Dictionary = {}

static func list_slots() -> Array:
	var metadata := _get_metadata()
	var collection := _read_collection()
	var summaries: Array = []
	for slot_id_variant in metadata.get("slot_ids", []):
		var slot_id := String(slot_id_variant)
		var slot: Dictionary = collection.get("slots", {}).get(slot_id, {})
		summaries.append({
			"slot_id": slot_id,
			"label": "File %d" % [summaries.size() + 1],
			"saved_at": slot.get("saved_at", ""),
			"has_state": slot.has("state"),
		})
	return summaries

static func save_state(state: Dictionary, slot_id: String) -> void:
	var metadata := _get_metadata()
	var collection := _read_collection()
	var slots: Dictionary = collection.get("slots", {}).duplicate(true)
	slots[slot_id] = {
		"version": int(metadata.get("save_version", 1)),
		"saved_at": Time.get_datetime_string_from_system(true, true),
		"state": state.duplicate(true),
	}
	_write_collection({
		"version": int(metadata.get("save_version", 1)),
		"slots": slots,
	})

static func load_state(slot_id: String = "") -> Dictionary:
	var collection := _read_collection()
	var slots: Dictionary = collection.get("slots", {})
	var resolved_slot_id := slot_id
	if resolved_slot_id.is_empty():
		resolved_slot_id = _get_most_recent_slot_id(slots)
	if resolved_slot_id.is_empty() or not slots.has(resolved_slot_id):
		return {}
	return slots[resolved_slot_id].get("state", {}).duplicate(true)

static func clear_slot(slot_id: String = "") -> void:
	var metadata := _get_metadata()
	if slot_id.is_empty():
		for filename in _get_candidate_filenames():
			var path := "user://%s.save.json" % filename
			if FileAccess.file_exists(path):
				DirAccess.remove_absolute(ProjectSettings.globalize_path(path))
		return

	var collection := _read_collection()
	var slots: Dictionary = collection.get("slots", {}).duplicate(true)
	slots.erase(slot_id)
	_write_collection({
		"version": int(metadata.get("save_version", 1)),
		"slots": slots,
	})

static func _get_metadata() -> Dictionary:
	if not _metadata_cache.is_empty():
		return _metadata_cache

	var file := FileAccess.open(SAVE_METADATA_PATH, FileAccess.READ)
	if file == null:
		push_error("Missing save metadata: %s" % SAVE_METADATA_PATH)
		_metadata_cache = {
			"save_key": "aureus-save-v3",
			"legacy_save_keys": [],
			"save_version": 3,
			"slot_ids": ["slot-1", "slot-2", "slot-3"],
		}
		return _metadata_cache

	var parsed: Variant = JSON.parse_string(file.get_as_text())
	_metadata_cache = parsed if typeof(parsed) == TYPE_DICTIONARY else {}
	return _metadata_cache

static func _get_candidate_filenames() -> Array:
	var metadata := _get_metadata()
	var filenames: Array = [String(metadata.get("save_key", "aureus-save-v3"))]
	for legacy_variant in metadata.get("legacy_save_keys", []):
		filenames.append(String(legacy_variant))
	return filenames

static func _read_collection() -> Dictionary:
	for filename_variant in _get_candidate_filenames():
		var filename := String(filename_variant)
		var path := "user://%s.save.json" % filename
		if not FileAccess.file_exists(path):
			continue
		var file := FileAccess.open(path, FileAccess.READ)
		if file == null:
			continue
		var parsed: Variant = JSON.parse_string(file.get_as_text())
		if typeof(parsed) == TYPE_DICTIONARY:
			return parsed
	return {
		"version": int(_get_metadata().get("save_version", 1)),
		"slots": {},
	}

static func _write_collection(collection: Dictionary) -> void:
	var path := "user://%s.save.json" % String(_get_metadata().get("save_key", "aureus-save-v3"))
	var file := FileAccess.open(path, FileAccess.WRITE)
	if file == null:
		push_error("Failed to open save file for write: %s" % path)
		return
	file.store_string(JSON.stringify(collection, "\t"))

static func _get_most_recent_slot_id(slots: Dictionary) -> String:
	var best_slot_id := ""
	var best_saved_at := ""
	for slot_id_variant in slots.keys():
		var slot_id := String(slot_id_variant)
		var slot: Dictionary = slots[slot_id]
		var saved_at := String(slot.get("saved_at", ""))
		if best_slot_id.is_empty() or saved_at > best_saved_at:
			best_slot_id = slot_id
			best_saved_at = saved_at
	return best_slot_id
