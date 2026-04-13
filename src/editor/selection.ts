import { EditorSelection } from './types';

export const EMPTY_SELECTION: EditorSelection = {
  buildingIds: [],
  zoneIds: [],
};

export const primaryBuildingId = (selection: EditorSelection) =>
  selection.buildingIds[selection.buildingIds.length - 1] ?? null;

export const primaryZoneId = (selection: EditorSelection) =>
  selection.zoneIds[selection.zoneIds.length - 1] ?? null;

export const isSelectionEmpty = (selection: EditorSelection) =>
  selection.buildingIds.length === 0 && selection.zoneIds.length === 0;

export const selectSingleBuilding = (buildingId: string): EditorSelection => ({
  buildingIds: [buildingId],
  zoneIds: [],
});

export const selectSingleZone = (zoneId: string): EditorSelection => ({
  buildingIds: [],
  zoneIds: [zoneId],
});

export const toggleBuildingSelection = (
  selection: EditorSelection,
  buildingId: string
): EditorSelection => ({
  buildingIds: selection.buildingIds.includes(buildingId)
    ? selection.buildingIds.filter((id) => id !== buildingId)
    : [...selection.buildingIds, buildingId],
  zoneIds: [],
});

export const toggleZoneSelection = (
  selection: EditorSelection,
  zoneId: string
): EditorSelection => ({
  buildingIds: [],
  zoneIds: selection.zoneIds.includes(zoneId)
    ? selection.zoneIds.filter((id) => id !== zoneId)
    : [...selection.zoneIds, zoneId],
});
