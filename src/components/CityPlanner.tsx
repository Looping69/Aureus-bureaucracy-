import React, { useState, useMemo, useRef } from 'react';
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
  ROAD_VOXELS
} from '../buildings';
import { X, Save, MapPin, Building2, Home, Factory, TreePine, Landmark, Square, MousePointer2 } from 'lucide-react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrthographicCamera, MapControls } from '@react-three/drei';
import * as THREE from 'three';
import { BuildingMesh } from './BuildingMesh';
import { WORLD_SIZE } from '../utils/voxelConstants';
import type { BuildingFootprint } from '../utils/worldNavigation';

interface CityPlannerProps {
  state: GameState;
  onUpdateBuildings: (buildings: Record<string, Building>) => void;
  onClose: () => void;
}

const BUILDING_TEMPLATES: Partial<Building>[] = [
  { type: 'HOME', name: 'Generic House A', voxels: GENERIC_HOUSE_A_VOXELS },
  { type: 'HOME', name: 'Generic House B', voxels: GENERIC_HOUSE_B_VOXELS },
  { type: 'OFFICE', name: 'Office Block', voxels: GENERIC_OFFICE_VOXELS },
  { type: 'OFFICE', name: 'Licensing Office', voxels: LICENSING_OFFICE_VOXELS },
  { type: 'PUB', name: 'Union Hall', voxels: UNION_HALL_VOXELS },
  { type: 'OFFICE', name: 'Inspector HQ', voxels: INSPECTOR_HQ_VOXELS },
  { type: 'HOME', name: 'Fixer Den', voxels: FIXER_DEN_VOXELS },
  { type: 'HOME', name: 'Chief Hut', voxels: CHIEF_HUT_VOXELS },
  { type: 'HOTLINE', name: 'Hotline Booth', voxels: HOTLINE_BOOTH_VOXELS },
  { type: 'LANDMARK', name: 'Street Light', voxels: STREET_LIGHT_VOXELS },
  { type: 'LANDMARK', name: 'Sidewalk', voxels: SIDEWALK_VOXELS },
  { type: 'ROAD', name: 'Road', voxels: ROAD_VOXELS },
];

const WORLD_SCALE = 10;
const GRID_SIZE = WORLD_SIZE / WORLD_SCALE;

const GridPlane = ({ onHover, onClick, onLeave, onRightClick, isPainting, setIsPainting, isErasing, setIsErasing, hasTemplate }: any) => {
  return (
    <mesh 
      rotation={[-Math.PI / 2, 0, 0]} 
      position={[GRID_SIZE * WORLD_SCALE / 2, -0.5, GRID_SIZE * WORLD_SCALE / 2]}
      onPointerDown={(e) => {
        if (!hasTemplate && e.button === 0) return; // Allow panning if no template
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
        if (!hasTemplate && !isErasing) return; // Allow panning
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

export const CityPlanner: React.FC<CityPlannerProps> = ({ state, onUpdateBuildings, onClose }) => {
  const [selectedTemplate, setSelectedTemplate] = useState<Partial<Building> | null>(null);
  const [tempBuildings, setTempBuildings] = useState<Record<string, Building>>(state.buildings);
  const [hoverPos, setHoverPos] = useState<{x: number, y: number} | null>(null);
  const [isPainting, setIsPainting] = useState(false);
  const [isErasing, setIsErasing] = useState(false);

  const getPlacementFootprint = (building: Building): BuildingFootprint | null => {
    if (!building.voxels || building.voxels.length === 0) {
      return {
        minX: building.pos.x,
        maxX: building.pos.x,
        minY: building.pos.y,
        maxY: building.pos.y,
      };
    }

    return building.voxels.reduce(
      (bounds, voxel) => ({
        minX: Math.min(bounds.minX, building.pos.x + voxel.x),
        maxX: Math.max(bounds.maxX, building.pos.x + voxel.x),
        minY: Math.min(bounds.minY, building.pos.y + voxel.y),
        maxY: Math.max(bounds.maxY, building.pos.y + voxel.y),
      }),
      {
        minX: Number.POSITIVE_INFINITY,
        maxX: Number.NEGATIVE_INFINITY,
        minY: Number.POSITIVE_INFINITY,
        maxY: Number.NEGATIVE_INFINITY,
      }
    );
  };

  const getPlannedBuilding = (template: Partial<Building>, pos: { x: number; y: number }) => ({
    id: 'preview',
    npcId: 'none',
    name: template.name || 'Preview',
    pos: {
      x: pos.x * WORLD_SCALE + 5,
      y: pos.y * WORLD_SCALE + 5,
    },
    type: (template.type as Building['type']) || 'HOME',
    isDiscovered: true,
    voxels: template.voxels,
  } as Building);

  type Footprint = BuildingFootprint;

  const footprintsOverlap = (a: Footprint, b: Footprint) =>
    !(a.maxX < b.minX || a.minX > b.maxX || a.maxY < b.minY || a.minY > b.maxY);

  const isValidPlacement = (x: number, y: number) => {
    if (x < 0 || x >= GRID_SIZE || y < 0 || y >= GRID_SIZE) return false;
    if (!selectedTemplate) return false;

    const preview = getPlannedBuilding(selectedTemplate, { x, y });
    const previewFootprint = getPlacementFootprint(preview);
    if (!previewFootprint) return false;

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
      return existingFootprint ? footprintsOverlap(previewFootprint, existingFootprint) : false;
    });
  };

  const placeBuilding = (pos: {x: number, y: number}) => {
    if (!selectedTemplate || !isValidPlacement(pos.x, pos.y)) return;

    const newId = `custom_${Date.now()}_${Math.random()}`;
    const worldPos = {
      x: pos.x * WORLD_SCALE + 5,
      y: pos.y * WORLD_SCALE + 5
    };
    const newBuilding: Building = {
      id: newId,
      npcId: 'none',
      name: selectedTemplate.name || 'New Building',
      pos: worldPos,
      type: selectedTemplate.type as any || 'HOME',
      isDiscovered: true,
      voxels: selectedTemplate.voxels
    };

    setTempBuildings(prev => ({
      ...prev,
      [newId]: newBuilding
    }));
  };

  const handleRemoveBuildingAt = (pos: {x: number, y: number}) => {
    setTempBuildings(prev => {
      const next = { ...prev };
      const idToRemove = Object.keys(next).find(id => {
        const b = next[id];
      const footprint = getPlacementFootprint(b);
      if (!footprint) return false;
      const worldX = pos.x * WORLD_SCALE + 5;
      const worldY = pos.y * WORLD_SCALE + 5;
      return worldX >= footprint.minX && worldX <= footprint.maxX && worldY >= footprint.minY && worldY <= footprint.maxY;
      });
      if (idToRemove) {
        delete next[idToRemove];
      }
      return next;
    });
  };

  const handleSave = () => {
    onUpdateBuildings(tempBuildings);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-950 z-50 flex flex-col text-white font-sans">
      {/* Header */}
      <div className="h-16 bg-slate-900/80 backdrop-blur-md border-b border-white/10 flex items-center justify-between px-6 shrink-0">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-blue-600/20 rounded-xl flex items-center justify-center border border-blue-500/30">
            <MapPin className="text-blue-400" size={20} />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight">Bureau City Planner</h1>
            <p className="text-[10px] uppercase tracking-widest text-slate-500 font-mono">Scale 1:10 • Isometric Projection</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={handleSave}
            className="bg-blue-600 hover:bg-blue-500 px-5 py-2 rounded-xl font-bold flex items-center gap-2 transition-all shadow-lg shadow-blue-900/20 active:scale-95"
          >
            <Save size={18} /> Save Blueprint
          </button>
          <button 
            onClick={onClose}
            className="bg-slate-800 hover:bg-slate-700 p-2.5 rounded-xl border border-white/5 transition-colors"
          >
            <X size={20} />
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar - Building Palette */}
        <div className="w-72 bg-slate-900/50 border-r border-white/5 p-6 overflow-y-auto custom-scrollbar shrink-0">
          <div className="mb-6">
            <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 mb-4">Architectural Assets</h2>
            <div className="grid grid-cols-1 gap-2">
              {BUILDING_TEMPLATES.map((template, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedTemplate(template)}
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
          
          <div className="p-4 bg-blue-500/5 rounded-2xl border border-blue-500/10 text-xs text-slate-400 leading-relaxed">
            <div className="mb-3 font-bold text-blue-400 flex items-center gap-2">
              <div className="w-1 h-3 bg-blue-400 rounded-full" /> Field Manual
            </div>
            <ul className="space-y-2">
              <li className="flex gap-2"><span className="text-blue-400 font-bold">•</span> Select an asset from the catalog</li>
              <li className="flex gap-2"><span className="text-blue-400 font-bold">•</span> Deploy to the isometric grid</li>
              <li className="flex gap-2"><span className="text-blue-400 font-bold">•</span> Right-click to decommission</li>
              <li className="flex gap-2"><span className="text-blue-400 font-bold">•</span> All placements must be within Bureau bounds</li>
            </ul>
          </div>
        </div>

        {/* Main Map Area */}
        <div className="flex-1 bg-slate-950 relative">
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

            {hoverPos && selectedTemplate && selectedTemplate.voxels && (
              <group position={[hoverPos.x * WORLD_SCALE + 5, 0, hoverPos.y * WORLD_SCALE + 5]}>
                <BuildingMesh voxels={selectedTemplate.voxels} position={[0, 0, 0]} opacity={0.5} />
              </group>
            )}
          </Canvas>
        </div>
      </div>
    </div>
  );
};
