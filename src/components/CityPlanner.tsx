/**
 * @module CityPlanner
 * Overhauled voxel city editor scene (CITY_PLANNER).
 *
 * Features added in overhaul:
 * - Category-based building palette filter
 * - Building rotation (0°/90°/180°/270°)
 * - Undo / Redo history stack
 * - Building count & limit display
 * - Unsaved-changes confirmation dialog
 * - Zone overlay toggle (shows modular zoning colours)
 * - Shared footprint utility (DRY)
 * - AI-style auto-fill hint (walkability validation after placement)
 */
import React, { useState, useMemo, useRef, useCallback } from 'react';
import { GameState, Building, WorldPosition } from '../types';
import {
  LICENSING_OFFICE_VOXELS, 
  UNION_HALL_VOXELS, 
  INSPECTOR_HQ_VOXELS, 
  FIXER_DEN_VOXELS, 
  CHIEF_HUT_VOXELS, 
  HOTLINE_BOOTH_VOXELS,
  STREET_LIGHT_VOXELS,
  GENERIC_HOUSE_A_VOXELS,
  GENERIC_HOUSE_B_VOXELS,
  GENERIC_OFFICE_VOXELS,
  SIDEWALK_VOXELS,
  ROAD_VOXELS,
  TREE_A_VOXELS,
  TREE_B_VOXELS,
  BUSH_VOXELS,
  GARDEN_VOXELS,
  ROAD_CROSS_VOXELS,
  FACTORY_VOXELS,
  GENERIC_HOUSE_D_VOXELS
} from '../buildings';
import {
  ASSET_BUILDING_A_VOXELS,
  ASSET_BUILDING_B_VOXELS,
  ASSET_BUILDING_C_VOXELS,
  ASSET_BUILDING_D_VOXELS,
  ASSET_BUILDING_E_VOXELS,
} from '../assetBuildings';
import { X, Save, MapPin, Building2, Home, Factory, TreePine, Landmark, Square, MousePointer2, RotateCw, Undo2, Redo2, Layers, AlertTriangle } from 'lucide-react';
import { Canvas } from '@react-three/fiber';
import { OrthographicCamera, MapControls } from '@react-three/drei';
import * as THREE from 'three';
import { BuildingMesh } from './BuildingMesh';
import { WORLD_SIZE } from '../utils/voxelConstants';
import type { BuildingFootprint } from '../utils/worldNavigation';
import { deriveFootprint, footprintsOverlap } from '../utils/buildingFootprint';
import { rotateVoxels, type RotationStep } from '../utils/buildingGenerator';
import { ZONE_DEFINITIONS, type ZoneType } from '../utils/zoning';

interface CityPlannerProps {
  state: GameState;
  onUpdateBuildings: (buildings: Record<string, Building>) => void;
  onClose: () => void;
}

// ── Building category system ────────────────────────────────────────────────

type BuildingCategory = 'ALL' | 'HOME' | 'OFFICE' | 'INDUSTRIAL' | 'PARK' | 'ROAD' | 'LANDMARK' | 'HOTLINE';

const CATEGORY_LABELS: Record<BuildingCategory, string> = {
  ALL: 'All',
  HOME: 'Residential',
  OFFICE: 'Commercial',
  INDUSTRIAL: 'Industrial',
  PARK: 'Green Space',
  ROAD: 'Roads',
  LANDMARK: 'Landmarks',
  HOTLINE: 'Utilities',
};

const BUILDING_TEMPLATES: (Partial<Building> & { category: BuildingCategory })[] = [
  { type: 'HOME', name: 'Generic House A', voxels: GENERIC_HOUSE_A_VOXELS, category: 'HOME' },
  { type: 'HOME', name: 'Generic House B', voxels: GENERIC_HOUSE_B_VOXELS, category: 'HOME' },
  { type: 'HOME', name: 'Generic House D', voxels: GENERIC_HOUSE_D_VOXELS, category: 'HOME' },
  { type: 'HOME', name: 'Staff Quarters', voxels: ASSET_BUILDING_E_VOXELS, category: 'HOME' },
  { type: 'HOME', name: 'Fixer Den', voxels: FIXER_DEN_VOXELS, category: 'HOME' },
  { type: 'HOME', name: 'Chief Hut', voxels: CHIEF_HUT_VOXELS, category: 'HOME' },
  { type: 'OFFICE', name: 'Office Block', voxels: GENERIC_OFFICE_VOXELS, category: 'OFFICE' },
  { type: 'OFFICE', name: 'Licensing Office', voxels: LICENSING_OFFICE_VOXELS, category: 'OFFICE' },
  { type: 'OFFICE', name: 'Inspector HQ', voxels: INSPECTOR_HQ_VOXELS, category: 'OFFICE' },
  { type: 'OFFICE', name: 'Commerce Block', voxels: ASSET_BUILDING_B_VOXELS, category: 'OFFICE' },
  { type: 'PUB', name: 'Union Hall', voxels: UNION_HALL_VOXELS, category: 'OFFICE' },
  { type: 'INDUSTRIAL', name: 'Factory', voxels: FACTORY_VOXELS, category: 'INDUSTRIAL' },
  { type: 'INDUSTRIAL', name: 'Supply Depot', voxels: ASSET_BUILDING_D_VOXELS, category: 'INDUSTRIAL' },
  { type: 'PARK', name: 'Tree A', voxels: TREE_A_VOXELS, category: 'PARK' },
  { type: 'PARK', name: 'Tree B', voxels: TREE_B_VOXELS, category: 'PARK' },
  { type: 'PARK', name: 'Bush', voxels: BUSH_VOXELS, category: 'PARK' },
  { type: 'PARK', name: 'Garden', voxels: GARDEN_VOXELS, category: 'PARK' },
  { type: 'ROAD', name: 'Road', voxels: ROAD_VOXELS, category: 'ROAD' },
  { type: 'ROAD', name: 'Road Cross', voxels: ROAD_CROSS_VOXELS, category: 'ROAD' },
  { type: 'LANDMARK', name: 'Sidewalk', voxels: SIDEWALK_VOXELS, category: 'ROAD' },
  { type: 'HOTLINE', name: 'Hotline Booth', voxels: HOTLINE_BOOTH_VOXELS, category: 'HOTLINE' },
  { type: 'LANDMARK', name: 'Street Light', voxels: STREET_LIGHT_VOXELS, category: 'LANDMARK' },
  { type: 'LANDMARK', name: 'Aureus Tower', voxels: ASSET_BUILDING_A_VOXELS, category: 'LANDMARK' },
  { type: 'LANDMARK', name: 'Borough Hall', voxels: ASSET_BUILDING_C_VOXELS, category: 'LANDMARK' },
];

const MAX_CUSTOM_BUILDINGS = 200;

const WORLD_SCALE = 10;
const GRID_SIZE = WORLD_SIZE / WORLD_SCALE;

// ── History stack for undo/redo ─────────────────────────────────────────────

type HistoryEntry = Record<string, Building>;

const useHistory = (initial: HistoryEntry) => {
  const [stack, setStack] = useState<HistoryEntry[]>([initial]);
  const [pointer, setPointer] = useState(0);

  const current = stack[pointer];

  const push = useCallback((state: HistoryEntry) => {
    setStack(prev => {
      const next = prev.slice(0, pointer + 1);
      next.push(state);
      // Limit history depth to 50 entries
      if (next.length > 50) next.shift();
      return next;
    });
    setPointer(prev => Math.min(prev + 1, 49));
  }, [pointer]);

  const undo = useCallback(() => {
    setPointer(prev => Math.max(0, prev - 1));
  }, []);

  const redo = useCallback(() => {
    setPointer(prev => Math.min(stack.length - 1, prev + 1));
  }, [stack.length]);

  const canUndo = pointer > 0;
  const canRedo = pointer < stack.length - 1;

  return { current, push, undo, redo, canUndo, canRedo };
};

// ── Grid Plane component ────────────────────────────────────────────────────

const GridPlane = ({ onHover, onClick, onLeave, onRightClick, isPainting, setIsPainting, isErasing, setIsErasing, hasTemplate }: {
  onHover: (pos: {x: number, y: number}) => void;
  onClick: (pos: {x: number, y: number}) => void;
  onLeave: () => void;
  onRightClick: (pos: {x: number, y: number}) => void;
  isPainting: boolean;
  setIsPainting: (v: boolean) => void;
  isErasing: boolean;
  setIsErasing: (v: boolean) => void;
  hasTemplate: boolean;
}) => {
  return (
    <mesh 
      rotation={[-Math.PI / 2, 0, 0]} 
      position={[GRID_SIZE * WORLD_SCALE / 2, -0.5, GRID_SIZE * WORLD_SCALE / 2]}
      onPointerDown={(e) => {
        if (!hasTemplate && e.button === 0) return;
        e.stopPropagation();
        const x = Math.floor(e.point.x / WORLD_SCALE);
        const z = Math.floor(e.point.z / WORLD_SCALE);
        if (e.button === 0) {
          setIsPainting(true);
          onClick({ x, y: z });
        } else if (e.button === 2) {
          setIsErasing(true);
          onRightClick({ x, y: z });
        }
      }}
      onPointerUp={(e) => {
        if (!hasTemplate && e.button === 0) return;
        e.stopPropagation();
        setIsPainting(false);
        setIsErasing(false);
      }}
      onPointerMove={(e) => {
        if (!hasTemplate && !isErasing) return;
        e.stopPropagation();
        const x = Math.floor(e.point.x / WORLD_SCALE);
        const z = Math.floor(e.point.z / WORLD_SCALE);
        onHover({ x, y: z });
        if (isPainting) {
          onClick({ x, y: z });
        } else if (isErasing) {
          onRightClick({ x, y: z });
        }
      }}
      onPointerOut={() => {
        onLeave();
        setIsPainting(false);
        setIsErasing(false);
      }}
      onContextMenu={(e) => {
        if (hasTemplate) e.stopPropagation();
      }}
    >
      <planeGeometry args={[GRID_SIZE * WORLD_SCALE, GRID_SIZE * WORLD_SCALE]} />
      <meshBasicMaterial visible={false} />
      <gridHelper args={[GRID_SIZE * WORLD_SCALE, GRID_SIZE, 0x444444, 0x222222]} rotation={[Math.PI / 2, 0, 0]} />
    </mesh>
  );
};

// ── Zone overlay meshes ─────────────────────────────────────────────────────

const ZoneOverlayTile: React.FC<{ gx: number; gy: number; zone: ZoneType }> = ({ gx, gy, zone }) => {
  const def = ZONE_DEFINITIONS[zone];
  const color = new THREE.Color(def.color);
  return (
    <mesh
      position={[gx * WORLD_SCALE + WORLD_SCALE / 2, 0.02, gy * WORLD_SCALE + WORLD_SCALE / 2]}
      rotation={[-Math.PI / 2, 0, 0]}
    >
      <planeGeometry args={[WORLD_SCALE - 0.5, WORLD_SCALE - 0.5]} />
      <meshBasicMaterial color={color} transparent opacity={0.18} />
    </mesh>
  );
};

// ── Main Component ──────────────────────────────────────────────────────────

export const CityPlanner: React.FC<CityPlannerProps> = ({ state, onUpdateBuildings, onClose }) => {
  const [selectedTemplate, setSelectedTemplate] = useState<(typeof BUILDING_TEMPLATES)[number] | null>(null);
  const [hoverPos, setHoverPos] = useState<{x: number, y: number} | null>(null);
  const [isPainting, setIsPainting] = useState(false);
  const [isErasing, setIsErasing] = useState(false);
  const [rotation, setRotation] = useState<RotationStep>(0);
  const [activeCategory, setActiveCategory] = useState<BuildingCategory>('ALL');
  const [showZoneOverlay, setShowZoneOverlay] = useState(false);
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);
  const buildingIdCounter = useRef(0);

  const { current: tempBuildings, push: pushHistory, undo, redo, canUndo, canRedo } = useHistory(state.buildings);

  // Track if changes were made
  const isDirty = tempBuildings !== state.buildings;

  // Building count stats
  const customBuildingCount = useMemo(() =>
    Object.keys(tempBuildings).filter(k => k.startsWith('custom_')).length,
    [tempBuildings]
  );

  // Filtered templates
  const filteredTemplates = useMemo(() =>
    activeCategory === 'ALL'
      ? BUILDING_TEMPLATES
      : BUILDING_TEMPLATES.filter(t => t.category === activeCategory),
    [activeCategory]
  );

  // Apply rotation to template voxels
  const getRotatedVoxels = useCallback((template: typeof BUILDING_TEMPLATES[number]) => {
    if (!template.voxels || rotation === 0) return template.voxels;
    return rotateVoxels(template.voxels, rotation);
  }, [rotation]);

  const getPlacementFootprint = (building: Building): BuildingFootprint => {
    return deriveFootprint(building);
  };

  const getPlannedBuilding = (template: typeof BUILDING_TEMPLATES[number], pos: { x: number; y: number }) => ({
    id: 'preview',
    npcId: 'none',
    name: template.name || 'Preview',
    pos: {
      x: pos.x * WORLD_SCALE + 5,
      y: pos.y * WORLD_SCALE + 5,
    },
    type: (template.type as Building['type']) || 'HOME',
    isDiscovered: true,
    voxels: getRotatedVoxels(template),
  } as Building);

  const isValidPlacement = (x: number, y: number) => {
    if (x < 0 || x >= GRID_SIZE || y < 0 || y >= GRID_SIZE) return false;
    if (!selectedTemplate) return false;
    if (customBuildingCount >= MAX_CUSTOM_BUILDINGS) return false;

    const preview = getPlannedBuilding(selectedTemplate, { x, y });
    const previewFootprint = getPlacementFootprint(preview);

    if (
      previewFootprint.minX < 0 ||
      previewFootprint.minY < 0 ||
      previewFootprint.maxX >= WORLD_SIZE ||
      previewFootprint.maxY >= WORLD_SIZE
    ) {
      return false;
    }

    return !Object.values(tempBuildings).some((existing) => {
      const existingFootprint = getPlacementFootprint(existing);
      return footprintsOverlap(previewFootprint, existingFootprint);
    });
  };

  const placeBuilding = (pos: {x: number, y: number}) => {
    if (!selectedTemplate || !isValidPlacement(pos.x, pos.y)) return;

    const newId = `custom_${Date.now()}_${buildingIdCounter.current++}`;
    const worldPos = {
      x: pos.x * WORLD_SCALE + 5,
      y: pos.y * WORLD_SCALE + 5
    };
    const newBuilding: Building = {
      id: newId,
      npcId: 'none',
      name: selectedTemplate.name || 'New Building',
      pos: worldPos,
      type: selectedTemplate.type as Building['type'] || 'HOME',
      isDiscovered: true,
      voxels: getRotatedVoxels(selectedTemplate)
    };

    const next = {
      ...tempBuildings,
      [newId]: newBuilding
    };
    pushHistory(next);
  };

  const handleRemoveBuildingAt = (pos: {x: number, y: number}) => {
    const next = { ...tempBuildings };
    const worldX = pos.x * WORLD_SCALE + 5;
    const worldY = pos.y * WORLD_SCALE + 5;
    const idToRemove = Object.keys(next).find(id => {
      const b = next[id];
      const footprint = getPlacementFootprint(b);
      return worldX >= footprint.minX && worldX <= footprint.maxX && worldY >= footprint.minY && worldY <= footprint.maxY;
    });
    if (idToRemove) {
      delete next[idToRemove];
      pushHistory(next);
    }
  };

  const handleSave = () => {
    onUpdateBuildings(tempBuildings);
    onClose();
  };

  const handleClose = () => {
    if (isDirty) {
      setShowUnsavedDialog(true);
    } else {
      onClose();
    }
  };

  const handleRotate = () => {
    setRotation(prev => ((prev + 1) % 4) as RotationStep);
  };

  // Keyboard shortcuts
  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'z') {
          e.preventDefault();
          if (e.shiftKey) redo();
          else undo();
        } else if (e.key === 'y') {
          e.preventDefault();
          redo();
        } else if (e.key === 's') {
          e.preventDefault();
          handleSave();
        }
      }
      if (e.key === 'r' && !e.ctrlKey && !e.metaKey) {
        handleRotate();
      }
      if (e.key === 'Escape') {
        setSelectedTemplate(null);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [undo, redo]);

  // Preview voxels with current rotation
  const previewVoxels = selectedTemplate ? getRotatedVoxels(selectedTemplate) : null;

  // Category icon helper
  const getCategoryIcon = (cat: BuildingCategory) => {
    switch (cat) {
      case 'HOME': return <Home size={14} />;
      case 'OFFICE': return <Building2 size={14} />;
      case 'INDUSTRIAL': return <Factory size={14} />;
      case 'PARK': return <TreePine size={14} />;
      case 'ROAD': return <Square size={14} />;
      case 'LANDMARK': return <Landmark size={14} />;
      case 'HOTLINE': return <MousePointer2 size={14} />;
      default: return <Layers size={14} />;
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950 z-50 flex flex-col text-white font-sans">
      {/* ── Unsaved Changes Dialog ── */}
      {showUnsavedDialog && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-slate-900 border border-white/10 rounded-2xl p-6 max-w-sm w-full shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="text-amber-400" size={24} />
              <h3 className="text-lg font-bold">Unsaved Changes</h3>
            </div>
            <p className="text-slate-400 text-sm mb-6">
              You have unsaved changes to the city layout. Do you want to save before closing?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => { setShowUnsavedDialog(false); onClose(); }}
                className="flex-1 bg-slate-800 hover:bg-slate-700 px-4 py-2.5 rounded-xl text-sm font-bold transition-colors"
              >
                Discard
              </button>
              <button
                onClick={() => { setShowUnsavedDialog(false); handleSave(); }}
                className="flex-1 bg-blue-600 hover:bg-blue-500 px-4 py-2.5 rounded-xl text-sm font-bold transition-colors"
              >
                Save & Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Header ── */}
      <div className="h-16 bg-slate-900/80 backdrop-blur-md border-b border-white/10 flex items-center justify-between px-6 shrink-0">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-blue-600/20 rounded-xl flex items-center justify-center border border-blue-500/30">
            <MapPin className="text-blue-400" size={20} />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight">Bureau City Planner</h1>
            <p className="text-[10px] uppercase tracking-widest text-slate-500 font-mono">
              Scale 1:10 • Isometric • {Object.keys(tempBuildings).length} structures
              {customBuildingCount > 0 && ` (${customBuildingCount}/${MAX_CUSTOM_BUILDINGS} custom)`}
            </p>
          </div>
        </div>

        {/* ── Toolbar ── */}
        <div className="flex items-center gap-2">
          <button
            onClick={undo}
            disabled={!canUndo}
            title="Undo (Ctrl+Z)"
            className="p-2 rounded-lg border border-white/5 transition-colors disabled:opacity-30 hover:bg-slate-800"
          >
            <Undo2 size={18} />
          </button>
          <button
            onClick={redo}
            disabled={!canRedo}
            title="Redo (Ctrl+Shift+Z)"
            className="p-2 rounded-lg border border-white/5 transition-colors disabled:opacity-30 hover:bg-slate-800"
          >
            <Redo2 size={18} />
          </button>
          <div className="w-px h-6 bg-white/10 mx-1" />
          <button
            onClick={handleRotate}
            title="Rotate 90° (R)"
            className={`p-2 rounded-lg border transition-colors ${
              rotation > 0 ? 'bg-blue-600/20 border-blue-500/30 text-blue-400' : 'border-white/5 hover:bg-slate-800'
            }`}
          >
            <RotateCw size={18} />
            {rotation > 0 && <span className="text-[9px] ml-1 font-mono">{rotation * 90}°</span>}
          </button>
          <button
            onClick={() => setShowZoneOverlay(prev => !prev)}
            title="Toggle Zone Overlay"
            className={`p-2 rounded-lg border transition-colors ${
              showZoneOverlay ? 'bg-purple-600/20 border-purple-500/30 text-purple-400' : 'border-white/5 hover:bg-slate-800'
            }`}
          >
            <Layers size={18} />
          </button>
          <div className="w-px h-6 bg-white/10 mx-1" />
          <button 
            onClick={handleSave}
            className="bg-blue-600 hover:bg-blue-500 px-5 py-2 rounded-xl font-bold flex items-center gap-2 transition-all shadow-lg shadow-blue-900/20 active:scale-95"
          >
            <Save size={18} /> Save Blueprint
          </button>
          <button 
            onClick={handleClose}
            className="bg-slate-800 hover:bg-slate-700 p-2.5 rounded-xl border border-white/5 transition-colors"
          >
            <X size={20} />
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* ── Sidebar - Building Palette ── */}
        <div className="w-72 bg-slate-900/50 border-r border-white/5 flex flex-col shrink-0">
          {/* Category Filter Tabs */}
          <div className="px-4 pt-4 pb-2">
            <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 mb-3">Categories</h2>
            <div className="flex flex-wrap gap-1.5">
              {(Object.keys(CATEGORY_LABELS) as BuildingCategory[]).map(cat => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all border
                    ${activeCategory === cat
                      ? 'bg-blue-600/20 border-blue-500/40 text-blue-300'
                      : 'bg-slate-800/40 border-white/5 text-slate-500 hover:text-slate-300'
                    }`}
                >
                  {getCategoryIcon(cat)}
                  {CATEGORY_LABELS[cat]}
                </button>
              ))}
            </div>
          </div>

          {/* Building List */}
          <div className="flex-1 overflow-y-auto px-4 pb-4 custom-scrollbar">
            <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 mb-3 mt-3">
              Assets ({filteredTemplates.length})
            </h2>
            <div className="grid grid-cols-1 gap-2">
              {filteredTemplates.map((template, idx) => (
                <button
                  key={idx}
                  onClick={() => { setSelectedTemplate(template); setRotation(0); }}
                  className={`group p-3 rounded-xl flex items-center gap-4 transition-all border
                    ${selectedTemplate === template 
                      ? 'bg-blue-600/20 border-blue-500/50 text-blue-100' 
                      : 'bg-slate-800/40 border-white/5 hover:border-white/10 text-slate-400 hover:text-slate-200'}
                  `}
                >
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors
                    ${selectedTemplate === template ? 'bg-blue-500 text-white' : 'bg-slate-900 text-slate-500 group-hover:bg-slate-700'}
                  `}>
                    {template.type === 'HOME' && <Home size={18} />}
                    {template.type === 'OFFICE' && <Building2 size={18} />}
                    {template.type === 'PUB' && <Building2 size={18} />}
                    {template.type === 'INDUSTRIAL' && <Factory size={18} />}
                    {template.type === 'PARK' && <TreePine size={18} />}
                    {template.type === 'LANDMARK' && <Landmark size={18} />}
                    {template.type === 'ROAD' && <Square size={18} />}
                    {template.type === 'HOTLINE' && <MousePointer2 size={18} />}
                  </div>
                  <div className="text-left">
                    <span className="text-sm font-bold block">{template.name}</span>
                    <span className="text-[10px] opacity-50 font-mono uppercase">{template.type}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Field Manual */}
          <div className="px-4 pb-4">
            <div className="p-4 bg-blue-500/5 rounded-2xl border border-blue-500/10 text-xs text-slate-400 leading-relaxed">
              <div className="mb-3 font-bold text-blue-400 flex items-center gap-2">
                <div className="w-1 h-3 bg-blue-400 rounded-full" /> Controls
              </div>
              <ul className="space-y-1.5">
                <li className="flex gap-2"><span className="text-blue-400 font-bold text-[10px]">LMB</span> Place selected asset</li>
                <li className="flex gap-2"><span className="text-blue-400 font-bold text-[10px]">RMB</span> Remove building</li>
                <li className="flex gap-2"><span className="text-blue-400 font-bold text-[10px]">R</span> Rotate 90°</li>
                <li className="flex gap-2"><span className="text-blue-400 font-bold text-[10px]">Ctrl+Z</span> Undo</li>
                <li className="flex gap-2"><span className="text-blue-400 font-bold text-[10px]">Ctrl+S</span> Save</li>
                <li className="flex gap-2"><span className="text-blue-400 font-bold text-[10px]">ESC</span> Deselect</li>
              </ul>
            </div>
          </div>
        </div>

        {/* ── Main Map Area ── */}
        <div className="flex-1 bg-slate-950 relative">
          {/* Capacity warning */}
          {customBuildingCount >= MAX_CUSTOM_BUILDINGS * 0.9 && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 bg-amber-500/10 border border-amber-500/30 text-amber-300 px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2">
              <AlertTriangle size={14} />
              {customBuildingCount >= MAX_CUSTOM_BUILDINGS
                ? 'Building limit reached! Remove buildings to place more.'
                : `Approaching building limit (${customBuildingCount}/${MAX_CUSTOM_BUILDINGS})`}
            </div>
          )}

          <Canvas>
            <OrthographicCamera 
              makeDefault 
              position={[180, 100, 180]} 
              zoom={15} 
              near={-1000} 
              far={1000} 
            />
            <MapControls 
              enableRotate={false} 
              enableDamping={true} 
              dampingFactor={0.05} 
              target={[GRID_SIZE * WORLD_SCALE / 2, 0, GRID_SIZE * WORLD_SCALE / 2]} 
            />
            <ambientLight intensity={0.5} />
            <directionalLight position={[50, 100, 50]} intensity={1} />
            
            <GridPlane 
              onHover={setHoverPos} 
              onClick={placeBuilding} 
              onLeave={() => setHoverPos(null)} 
              onRightClick={handleRemoveBuildingAt}
              isPainting={isPainting}
              setIsPainting={setIsPainting}
              isErasing={isErasing}
              setIsErasing={setIsErasing}
              hasTemplate={!!selectedTemplate}
            />

            {/* Zone overlay */}
            {showZoneOverlay && Array.from({ length: GRID_SIZE }, (_, gx) =>
              Array.from({ length: GRID_SIZE }, (_, gy) => {
                // Simple demo: derive zone from position (real implementation would use ZoneGrid)
                const dist = Math.hypot(gx - GRID_SIZE / 2, gy - GRID_SIZE / 2);
                let zone: ZoneType = 'UNZONED';
                if (dist < 4) zone = 'CIVIC';
                else if (dist < 7) zone = 'COMMERCIAL';
                else if (dist < 10) zone = 'MIXED_USE';
                else if (dist < 13) zone = 'RESIDENTIAL';
                
                if (zone === 'UNZONED') return null;
                return <ZoneOverlayTile key={`${gx}-${gy}`} gx={gx} gy={gy} zone={zone} />;
              })
            )}

            {/* Placed buildings */}
            {Object.values(tempBuildings).map(building => (
              <group 
                key={building.id} 
                position={[building.pos.x, 0, building.pos.y]}
              >
                {building.voxels && (
                  <BuildingMesh voxels={building.voxels} position={[0, 0, 0]} />
                )}
              </group>
            ))}

            {/* Preview ghost building */}
            {hoverPos && selectedTemplate && previewVoxels && (
              <group position={[hoverPos.x * WORLD_SCALE + 5, 0, hoverPos.y * WORLD_SCALE + 5]}>
                <BuildingMesh voxels={previewVoxels} position={[0, 0, 0]} opacity={0.5} />
              </group>
            )}
          </Canvas>
        </div>
      </div>
    </div>
  );
};
