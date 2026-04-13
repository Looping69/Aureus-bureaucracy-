import React from 'react';
import * as THREE from 'three';
import { Canvas, ThreeEvent, useThree } from '@react-three/fiber';
import { Html, OrbitControls } from '@react-three/drei';
import { NavigationZone, WorldPosition } from '../../types';
import { getBuildingAccessPosition } from '../../utils/buildingAccess';
import { getBuildingFootprint, getBuildingHeight, getStructureBaseHeight } from '../../utils/worldNavigation';
import { CONFIG, WORLD_HALF_SIZE, WORLD_SIZE } from '../../utils/voxelConstants';
import { SurfaceKind, SurfaceTile, WorldSurfaceMap, getWorldSurfaceTile } from '../../utils/worldSurface';
import { AuthoredBuilding, EditorOverlayState, EditorSelection, EditorTool, EditorViewportMode } from '../../editor/types';
import { BuildingMesh } from '../BuildingMesh';

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

const tintForType = (type: AuthoredBuilding['type']) => {
  switch (type) {
    case 'ROAD':
      return '#64748b';
    case 'SIDEWALK':
      return '#cbd5e1';
    case 'PARK':
      return '#4d7c0f';
    case 'INDUSTRIAL':
      return '#b45309';
    case 'LANDMARK':
      return '#1d4ed8';
    case 'OFFICE':
      return '#2563eb';
    case 'HOME':
      return '#0f766e';
    case 'PUB':
      return '#c2410c';
    case 'HOTLINE':
      return '#9333ea';
    case 'MINE_ENTRANCE':
      return '#475569';
    default:
      return '#334155';
  }
};

const SURFACE_BASE_COLORS: Record<SurfaceKind, string> = {
  GROUND: '#243424',
  ROAD: '#374151',
  SIDEWALK: '#5b6578',
  PARK: '#335c2b',
  PLAZA: '#6b7280',
  FOUNDATION: '#3b1f2c',
  CLIFF: '#2e3444',
};

const SURFACE_OVERLAY_COLORS: Record<SurfaceKind, string> = {
  GROUND: '#14532d',
  ROAD: '#475569',
  SIDEWALK: '#94a3b8',
  PARK: '#65a30d',
  PLAZA: '#f59e0b',
  FOUNDATION: '#dc2626',
  CLIFF: '#78350f',
};

const TILE_COLUMN_BASE_Y = CONFIG.FLOOR_Y - 3.2;
const ZONE_HEIGHT = 4.5;

const tileToWorld = (value: number) => value - WORLD_HALF_SIZE;

const pointToTile = (point: THREE.Vector3): WorldPosition => ({
  x: clamp(Math.round(point.x + WORLD_HALF_SIZE), 0, WORLD_SIZE - 1),
  y: clamp(Math.round(point.z + WORLD_HALF_SIZE), 0, WORLD_SIZE - 1),
});

const getFootprint = (building: AuthoredBuilding) =>
  getBuildingFootprint({
    id: building.id,
    name: building.name,
    type: building.type,
    pos: building.pos,
    voxels: building.voxels,
    npcId: building.npcId,
    isDiscovered: building.isDiscovered,
  }) ?? {
    minX: building.pos.x,
    maxX: building.pos.x,
    minY: building.pos.y,
    maxY: building.pos.y,
  };

const getTerrainColumnMetrics = (height: number) => {
  const columnHeight = Math.max(1, height - TILE_COLUMN_BASE_Y + 0.35);
  return {
    columnHeight,
    centerY: TILE_COLUMN_BASE_Y + columnHeight / 2,
    topY: TILE_COLUMN_BASE_Y + columnHeight,
  };
};

type DragState =
  | { kind: 'zone'; start: WorldPosition; end: WorldPosition }
  | { kind: 'move'; origin: WorldPosition }
  | null;

export type PlannerCanvasHandle = {
  exportViewportPng: () => Promise<boolean>;
};

type PlannerCanvasProps = {
  mode: EditorViewportMode;
  buildings: AuthoredBuilding[];
  zones: NavigationZone[];
  selection: EditorSelection;
  overlays: EditorOverlayState;
  tool: EditorTool;
  zoom: number;
  hoverTile: WorldPosition | null;
  dragState: DragState;
  surfaceMap: WorldSurfaceMap;
  onCanvasPointerDown: (tile: WorldPosition) => void;
  onCanvasPointerMove: (tile: WorldPosition, modifiers?: { shiftKey?: boolean }) => void;
  onCanvasPointerUp: () => void;
  onCanvasPointerLeave: () => void;
  onBuildingPointerDown: (
    buildingId: string,
    tile: WorldPosition,
    modifiers: { shiftKey: boolean; metaKey: boolean; ctrlKey: boolean }
  ) => void;
  onZonePointerDown: (
    zoneId: string,
    modifiers: { shiftKey: boolean; metaKey: boolean; ctrlKey: boolean }
  ) => void;
};

const serializeSvgToPngBlob = async (svg: SVGSVGElement) => {
  const xml = new XMLSerializer().serializeToString(svg);
  const blob = new Blob([xml], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  try {
    const image = new Image();
    image.decoding = 'async';
    const loaded = new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error('SVG image decode failed.'));
    });
    image.src = url;
    await loaded;

    const canvas = document.createElement('canvas');
    canvas.width = Math.max(svg.clientWidth, 1);
    canvas.height = Math.max(svg.clientHeight, 1);
    const context = canvas.getContext('2d');
    if (!context) {
      return null;
    }

    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    return await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
  } finally {
    URL.revokeObjectURL(url);
  }
};

const downloadBlob = (blob: Blob, fileName: string) => {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
};

const TerrainColumns = ({
  surfaceMap,
  overlays,
  mode,
}: {
  surfaceMap: WorldSurfaceMap;
  overlays: EditorOverlayState;
  mode: EditorViewportMode;
}) => {
  const meshRef = React.useRef<THREE.InstancedMesh>(null);
  const tiles = React.useMemo(() => Array.from(surfaceMap.tiles.values()), [surfaceMap]);

  React.useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) {
      return;
    }

    const matrix = new THREE.Matrix4();
    const color = new THREE.Color();

    tiles.forEach((tile, index) => {
      const metrics = getTerrainColumnMetrics(tile.height);
      const surfaceModeTint = overlays.showSurface ? SURFACE_OVERLAY_COLORS[tile.kind] : SURFACE_BASE_COLORS[tile.kind];
      const tint = mode === 'screen'
        ? new THREE.Color(surfaceModeTint).lerp(new THREE.Color('#0f172a'), tile.walkable ? 0.18 : 0.28).getStyle()
        : surfaceModeTint;

      matrix.compose(
        new THREE.Vector3(tileToWorld(tile.x), metrics.centerY, tileToWorld(tile.y)),
        new THREE.Quaternion(),
        new THREE.Vector3(1, metrics.columnHeight, 1)
      );
      mesh.setMatrixAt(index, matrix);
      color.set(tint);
      mesh.setColorAt(index, color);
    });

    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) {
      mesh.instanceColor.needsUpdate = true;
    }
    mesh.computeBoundingSphere();
  }, [mode, overlays.showSurface, tiles]);

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, tiles.length]} receiveShadow castShadow={false}>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial roughness={mode === 'screen' ? 0.88 : 0.96} metalness={mode === 'screen' ? 0.08 : 0.02} vertexColors />
    </instancedMesh>
  );
};

const TileOverlayLayer = ({
  surfaceMap,
  getColorForTile,
}: {
  surfaceMap: WorldSurfaceMap;
  getColorForTile: (tile: SurfaceTile) => string | null;
}) => {
  const meshRef = React.useRef<THREE.InstancedMesh>(null);
  const tiles = React.useMemo(() => Array.from(surfaceMap.tiles.values()), [surfaceMap]);

  React.useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) {
      return;
    }

    const matrix = new THREE.Matrix4();
    const color = new THREE.Color();
    let visibleCount = 0;

    tiles.forEach((tile) => {
      const tint = getColorForTile(tile);
      if (!tint) {
        return;
      }

      const metrics = getTerrainColumnMetrics(tile.height);
      matrix.compose(
        new THREE.Vector3(tileToWorld(tile.x), metrics.topY + 0.06, tileToWorld(tile.y)),
        new THREE.Quaternion(),
        new THREE.Vector3(0.92, 0.08, 0.92)
      );
      mesh.setMatrixAt(visibleCount, matrix);
      color.set(tint);
      mesh.setColorAt(visibleCount, color);
      visibleCount += 1;
    });

    mesh.count = visibleCount;
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) {
      mesh.instanceColor.needsUpdate = true;
    }
  }, [getColorForTile, tiles]);

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, tiles.length]}>
      <boxGeometry args={[1, 1, 1]} />
      <meshBasicMaterial vertexColors transparent opacity={0.55} depthWrite={false} />
    </instancedMesh>
  );
};

const SelectionBounds = ({
  size,
  position,
  color,
}: {
  size: [number, number, number];
  position: [number, number, number];
  color: string;
}) => {
  const geometry = React.useMemo(() => {
    const box = new THREE.BoxGeometry(size[0], size[1], size[2]);
    return new THREE.EdgesGeometry(box);
  }, [size]);

  React.useEffect(() => () => geometry.dispose(), [geometry]);

  return (
    <lineSegments geometry={geometry} position={position}>
      <lineBasicMaterial color={color} transparent opacity={0.9} />
    </lineSegments>
  );
};

const ZoneVolume = ({
  zone,
  isSelected,
  showOverlay,
  interactive,
  onPointerDown,
  onPointerMove,
  onPointerUp,
}: {
  zone: NavigationZone;
  isSelected: boolean;
  showOverlay: boolean;
  interactive: boolean;
  onPointerDown: (event: ThreeEvent<PointerEvent>) => void;
  onPointerMove: (event: ThreeEvent<PointerEvent>) => void;
  onPointerUp: () => void;
}) => {
  const width = zone.maxX - zone.minX + 1;
  const depth = zone.maxY - zone.minY + 1;
  const centerX = tileToWorld(zone.minX + width / 2 - 0.5);
  const centerZ = tileToWorld(zone.minY + depth / 2 - 0.5);

  if (!showOverlay && !isSelected) {
    return null;
  }

  return (
    <group position={[centerX, 1.9, centerZ]}>
      <mesh
        onPointerDown={interactive ? onPointerDown : undefined}
        onPointerMove={interactive ? onPointerMove : undefined}
        onPointerUp={interactive ? onPointerUp : undefined}
      >
        <boxGeometry args={[width, ZONE_HEIGHT, depth]} />
        <meshStandardMaterial
          color={isSelected ? '#f87171' : '#991b1b'}
          transparent
          opacity={isSelected ? 0.28 : 0.18}
          depthWrite={false}
        />
      </mesh>
      <SelectionBounds
        size={[width, ZONE_HEIGHT, depth]}
        position={[0, 0, 0]}
        color={isSelected ? '#fecaca' : '#fca5a5'}
      />
      {isSelected && (
        <Html position={[0, ZONE_HEIGHT / 2 + 0.5, 0]} center distanceFactor={25}>
          <div className="rounded-full border border-red-300/40 bg-red-950/85 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-red-100 shadow-lg">
            {zone.name}
          </div>
        </Html>
      )}
    </group>
  );
};

const BuildingVolume = ({
  building,
  overlays,
  surfaceMap,
  isSelected,
  interactive,
  screenMode,
  onPointerDown,
  onPointerMove,
  onPointerUp,
}: {
  building: AuthoredBuilding;
  overlays: EditorOverlayState;
  surfaceMap: WorldSurfaceMap;
  isSelected: boolean;
  interactive: boolean;
  screenMode: boolean;
  onPointerDown: (event: ThreeEvent<PointerEvent>) => void;
  onPointerMove: (event: ThreeEvent<PointerEvent>) => void;
  onPointerUp: () => void;
}) => {
  const footprint = React.useMemo(() => getFootprint(building), [building]);
  const access = React.useMemo(
    () =>
      getBuildingAccessPosition({
        id: building.id,
        name: building.name,
        type: building.type,
        pos: building.pos,
        voxels: building.voxels,
        npcId: building.npcId,
        isDiscovered: building.isDiscovered,
      }),
    [building]
  );

  const width = footprint.maxX - footprint.minX + 1;
  const depth = footprint.maxY - footprint.minY + 1;
  const centerX = tileToWorld(footprint.minX + width / 2 - 0.5);
  const centerZ = tileToWorld(footprint.minY + depth / 2 - 0.5);
  const baseY = Math.floor(getStructureBaseHeight(building.type));
  const height = Math.max(
    getBuildingHeight({
      id: building.id,
      name: building.name,
      type: building.type,
      pos: building.pos,
      voxels: building.voxels,
      npcId: building.npcId,
      isDiscovered: building.isDiscovered,
    }),
    1.2
  );
  const accessTile = getWorldSurfaceTile(surfaceMap, access.x, access.y);
  const accessHeight = accessTile ? getTerrainColumnMetrics(accessTile.height).topY : CONFIG.FLOOR_Y + 0.8;

  return (
    <group>
      {building.voxels && building.voxels.length > 0 ? (
        <BuildingMesh
          voxels={building.voxels}
          position={[tileToWorld(building.pos.x), baseY, tileToWorld(building.pos.y)]}
          opacity={building.isDiscovered ? 1 : 0.62}
        />
      ) : (
        <mesh position={[centerX, baseY + height / 2, centerZ]} castShadow receiveShadow>
          <boxGeometry args={[width, height, depth]} />
          <meshStandardMaterial color={tintForType(building.type)} roughness={0.78} metalness={0.1} transparent opacity={0.9} />
        </mesh>
      )}

      <mesh
        position={[centerX, baseY + height / 2, centerZ]}
        onPointerDown={interactive ? onPointerDown : undefined}
        onPointerMove={interactive ? onPointerMove : undefined}
        onPointerUp={interactive ? onPointerUp : undefined}
      >
        <boxGeometry args={[width, Math.max(height, 2), depth]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>

      {(overlays.showBounds || isSelected) && (
        <SelectionBounds
          size={[width + (isSelected ? 0.3 : 0.12), height + 0.2, depth + (isSelected ? 0.3 : 0.12)]}
          position={[centerX, baseY + height / 2, centerZ]}
          color={isSelected ? '#fde68a' : screenMode ? '#334155' : '#1e293b'}
        />
      )}

      {!screenMode && isSelected && (
        <>
          <Html position={[centerX, baseY + height + 1.3, centerZ]} center distanceFactor={28}>
            <div className="rounded-full border border-amber-300/40 bg-slate-950/90 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-100 shadow-lg">
              {building.name} / {building.type}
            </div>
          </Html>
          <mesh position={[centerX, baseY + 0.12, centerZ]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[Math.max(width, depth) * 0.52, Math.max(width, depth) * 0.64, 36]} />
            <meshBasicMaterial color="#facc15" transparent opacity={0.7} side={THREE.DoubleSide} />
          </mesh>
        </>
      )}

      {overlays.showAccessPoints && !screenMode && (
        <group position={[tileToWorld(access.x), accessHeight + 0.38, tileToWorld(access.y)]}>
          <mesh>
            <sphereGeometry args={[isSelected ? 0.38 : 0.28, 16, 16]} />
            <meshBasicMaterial color={isSelected ? '#fde68a' : '#38bdf8'} />
          </mesh>
          <SelectionBounds
            size={[0.65, 0.65, 0.65]}
            position={[0, 0, 0]}
            color={isSelected ? '#fde68a' : '#7dd3fc'}
          />
        </group>
      )}
    </group>
  );
};

const useEditorCamera = (mode: Exclude<EditorViewportMode, '2d'>, zoom: number) => {
  const { camera } = useThree();

  React.useEffect(() => {
    const perspectiveCamera = camera as THREE.PerspectiveCamera;
    const target = mode === 'screen' ? new THREE.Vector3(0, 6, 8) : new THREE.Vector3(0, -0.5, 0);
    const desiredPosition =
      mode === 'screen'
        ? new THREE.Vector3(84, 74, 84)
        : new THREE.Vector3(
            THREE.MathUtils.lerp(112, 40, THREE.MathUtils.clamp((zoom - 2) / 6, 0, 1)),
            THREE.MathUtils.lerp(118, 46, THREE.MathUtils.clamp((zoom - 2) / 6, 0, 1)),
            THREE.MathUtils.lerp(112, 40, THREE.MathUtils.clamp((zoom - 2) / 6, 0, 1))
          );

    perspectiveCamera.position.copy(desiredPosition);
    perspectiveCamera.lookAt(target);
    perspectiveCamera.userData.editorOrbitState = {
      target: target.clone(),
      position: perspectiveCamera.position.clone(),
    };
  }, [camera, mode, zoom]);
};

const EditorScene = ({
  mode,
  buildings,
  zones,
  selection,
  overlays,
  tool,
  zoom,
  hoverTile,
  dragState,
  surfaceMap,
  onCanvasPointerDown,
  onCanvasPointerMove,
  onCanvasPointerUp,
  onBuildingPointerDown,
  onZonePointerDown,
}: Omit<PlannerCanvasProps, 'onCanvasPointerLeave' | 'mode'> & { mode: Exclude<EditorViewportMode, '2d'> }) => {
  useEditorCamera(mode, zoom);
  const interactive = mode !== 'screen';
  const orbitRef = React.useRef<{
    target: THREE.Vector3;
    object: THREE.Camera;
    addEventListener: (type: string, listener: () => void) => void;
    removeEventListener: (type: string, listener: () => void) => void;
  } | null>(null);

  const handleScenePointerMove = React.useCallback((event: ThreeEvent<PointerEvent>) => {
    if (!interactive) {
      return;
    }
    onCanvasPointerMove(pointToTile(event.point), { shiftKey: event.shiftKey });
  }, [interactive, onCanvasPointerMove]);

  const handleScenePointerDown = React.useCallback((event: ThreeEvent<PointerEvent>) => {
    if (!interactive) {
      return;
    }
    onCanvasPointerDown(pointToTile(event.point));
  }, [interactive, onCanvasPointerDown]);

  const walkabilityColor = React.useCallback(
    (tile: SurfaceTile) =>
      overlays.showWalkability ? (tile.walkable ? '#16a34a' : '#dc2626') : null,
    [overlays.showWalkability]
  );

  React.useEffect(() => {
    const controls = orbitRef.current;
    if (!controls || !interactive) {
      return;
    }

    const syncOrbitState = () => {
      const camera = controls.object as THREE.PerspectiveCamera;
      camera.userData.editorOrbitState = {
        target: controls.target.clone(),
        position: camera.position.clone(),
      };
    };

    syncOrbitState();
    controls.addEventListener('change', syncOrbitState);
    return () => controls.removeEventListener('change', syncOrbitState);
  }, [interactive]);

  return (
    <>
      <color attach="background" args={[mode === 'screen' ? '#02040d' : '#040815']} />
      <fog attach="fog" args={[mode === 'screen' ? '#02040d' : '#040815', mode === 'screen' ? 95 : 110, mode === 'screen' ? 220 : 260]} />

      <ambientLight intensity={mode === 'screen' ? 0.58 : 0.72} color={mode === 'screen' ? '#cbd5e1' : '#dbeafe'} />
      <hemisphereLight intensity={mode === 'screen' ? 0.44 : 0.58} color="#93c5fd" groundColor="#0f172a" />
      <directionalLight
        position={mode === 'screen' ? [42, 64, 12] : [55, 82, 36]}
        intensity={mode === 'screen' ? 1.1 : 1.25}
        color="#fef3c7"
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-near={10}
        shadow-camera-far={220}
        shadow-camera-left={-90}
        shadow-camera-right={90}
        shadow-camera-top={90}
        shadow-camera-bottom={-90}
      />

      <mesh position={[0, TILE_COLUMN_BASE_Y - 0.22, 0]} receiveShadow>
        <cylinderGeometry args={[215, 235, 2.4, 64]} />
        <meshStandardMaterial color={mode === 'screen' ? '#020617' : '#060c17'} roughness={1} metalness={0} />
      </mesh>

      {mode !== 'screen' && overlays.showWorldGrid && (
        <gridHelper args={[WORLD_SIZE, WORLD_SIZE / 10, '#3b82f6', '#1e293b']} position={[0, 0.04, 0]} />
      )}
      {mode !== 'screen' && overlays.showPathGrid && (
        <gridHelper args={[WORLD_SIZE, WORLD_SIZE, '#334155', '#172033']} position={[0, 0.08, 0]} />
      )}

      <TerrainColumns surfaceMap={surfaceMap} overlays={overlays} mode={mode} />
      {mode !== 'screen' && overlays.showWalkability && (
        <TileOverlayLayer surfaceMap={surfaceMap} getColorForTile={walkabilityColor} />
      )}

      {zones.map((zone) => (
        <ZoneVolume
          key={zone.id}
          zone={zone}
          isSelected={selection.zoneIds.includes(zone.id)}
          showOverlay={mode === 'screen' ? false : overlays.showZoneOverlay}
          interactive={interactive}
          onPointerDown={(event) => {
            event.stopPropagation();
            onZonePointerDown(zone.id, {
              shiftKey: event.shiftKey,
              metaKey: event.metaKey,
              ctrlKey: event.ctrlKey,
            });
          }}
          onPointerMove={(event) => {
            event.stopPropagation();
            handleScenePointerMove(event);
          }}
          onPointerUp={onCanvasPointerUp}
        />
      ))}

      {buildings.map((building) => (
        <BuildingVolume
          key={building.id}
          building={building}
          overlays={overlays}
          surfaceMap={surfaceMap}
          isSelected={selection.buildingIds.includes(building.id)}
          interactive={interactive}
          screenMode={mode === 'screen'}
          onPointerDown={(event) => {
            event.stopPropagation();
            onBuildingPointerDown(building.id, pointToTile(event.point), {
              shiftKey: event.shiftKey,
              metaKey: event.metaKey,
              ctrlKey: event.ctrlKey,
            });
          }}
          onPointerMove={(event) => {
            event.stopPropagation();
            handleScenePointerMove(event);
          }}
          onPointerUp={onCanvasPointerUp}
        />
      ))}

      {mode !== 'screen' && dragState?.kind === 'zone' && (
        <group
          position={[
            tileToWorld((Math.min(dragState.start.x, dragState.end.x) + Math.max(dragState.start.x, dragState.end.x)) / 2),
            1.8,
            tileToWorld((Math.min(dragState.start.y, dragState.end.y) + Math.max(dragState.start.y, dragState.end.y)) / 2),
          ]}
        >
          <mesh>
            <boxGeometry
              args={[
                Math.abs(dragState.end.x - dragState.start.x) + 1,
                ZONE_HEIGHT,
                Math.abs(dragState.end.y - dragState.start.y) + 1,
              ]}
            />
            <meshBasicMaterial color="#fb7185" transparent opacity={0.16} depthWrite={false} />
          </mesh>
          <SelectionBounds
            size={[
              Math.abs(dragState.end.x - dragState.start.x) + 1.08,
              ZONE_HEIGHT,
              Math.abs(dragState.end.y - dragState.start.y) + 1.08,
            ]}
            position={[0, 0, 0]}
            color="#fecdd3"
          />
        </group>
      )}

      {mode !== 'screen' && hoverTile && (
        <mesh
          position={[
            tileToWorld(hoverTile.x),
            getTerrainColumnMetrics(getWorldSurfaceTile(surfaceMap, hoverTile.x, hoverTile.y)?.height ?? 0).topY + 0.11,
            tileToWorld(hoverTile.y),
          ]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <planeGeometry args={[0.95, 0.95]} />
          <meshBasicMaterial
            color={tool === 'erase' ? '#f87171' : '#38bdf8'}
            transparent
            opacity={0.42}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}

      <mesh
        position={[0, 0, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        onPointerDown={interactive ? handleScenePointerDown : undefined}
        onPointerMove={interactive ? handleScenePointerMove : undefined}
        onPointerUp={interactive ? onCanvasPointerUp : undefined}
      >
        <planeGeometry args={[WORLD_SIZE, WORLD_SIZE]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>

      {mode === 'screen' && (
        <>
          <mesh position={[0, 44, -76]}>
            <planeGeometry args={[76, 28]} />
            <meshBasicMaterial color="#020617" transparent opacity={0.22} />
          </mesh>
          <Html position={[0, 44, -75.7]} center transform distanceFactor={100}>
            <div className="w-[420px] rounded-[26px] border border-white/10 bg-slate-950/65 px-6 py-5 text-white shadow-[0_20px_80px_rgba(2,6,23,0.45)] backdrop-blur-md">
              <div className="text-[10px] uppercase tracking-[0.28em] text-slate-400">Runtime Preview</div>
              <div className="mt-2 text-2xl font-semibold tracking-tight">Authoring screen layout</div>
              <div className="mt-2 text-sm text-slate-300">Locked presentation camera for export shots and layout checks.</div>
            </div>
          </Html>
        </>
      )}

      <OrbitControls
        ref={orbitRef as never}
        makeDefault
        enablePan={mode === '3d'}
        enableRotate={mode === '3d'}
        enableZoom={mode !== 'screen'}
        target={mode === 'screen' ? [0, 6, 8] : [0, -0.5, 0]}
        minDistance={48}
        maxDistance={210}
        minPolarAngle={mode === 'screen' ? Math.PI / 3.4 : Math.PI / 5}
        maxPolarAngle={mode === 'screen' ? Math.PI / 3.4 : Math.PI / 2.15}
        zoomSpeed={0.8}
        panSpeed={0.9}
        rotateSpeed={0.65}
        dampingFactor={0.08}
      />
    </>
  );
};

const PlannerCanvas2D = ({
  buildings,
  zones,
  selection,
  overlays,
  tool,
  zoom,
  hoverTile,
  dragState,
  surfaceMap,
  onCanvasPointerDown,
  onCanvasPointerMove,
  onCanvasPointerUp,
  onBuildingPointerDown,
  onZonePointerDown,
}: Omit<PlannerCanvasProps, 'mode' | 'onCanvasPointerLeave'>) => {
  const getTileFromPointer = React.useCallback((event: React.PointerEvent<SVGElement>) => {
    const svg = event.currentTarget instanceof SVGSVGElement
      ? event.currentTarget
      : event.currentTarget.ownerSVGElement;
    const rect = svg?.getBoundingClientRect();
    if (!rect) {
      return { x: 0, y: 0 };
    }
    return {
      x: clamp(Math.floor((event.clientX - rect.left) / zoom), 0, WORLD_SIZE - 1),
      y: clamp(Math.floor((event.clientY - rect.top) / zoom), 0, WORLD_SIZE - 1),
    };
  }, [zoom]);

  const overlayPaths = React.useMemo(() => {
    const appendTile = (buffer: string[], x: number, y: number) => {
      buffer.push(`M${x} ${y}h1v1h-1Z`);
    };

    const byKind: Record<SurfaceKind, string[]> = {
      GROUND: [],
      ROAD: [],
      SIDEWALK: [],
      PARK: [],
      PLAZA: [],
      FOUNDATION: [],
      CLIFF: [],
    };
    const walkable: string[] = [];
    const blocked: string[] = [];

    for (const tile of surfaceMap.tiles.values()) {
      appendTile(byKind[tile.kind], tile.x, tile.y);
      appendTile(tile.walkable ? walkable : blocked, tile.x, tile.y);
    }

    return {
      byKind: Object.fromEntries(Object.entries(byKind).map(([kind, commands]) => [kind, commands.join(' ')])) as Record<SurfaceKind, string>,
      walkable: walkable.join(' '),
      blocked: blocked.join(' '),
    };
  }, [surfaceMap]);

  return (
    <svg
      width={WORLD_SIZE * zoom}
      height={WORLD_SIZE * zoom}
      viewBox={`0 0 ${WORLD_SIZE} ${WORLD_SIZE}`}
      className="block rounded-[28px] border border-white/10 bg-slate-950 shadow-[0_24px_70px_rgba(2,6,23,0.45)]"
      onPointerDown={(event) => onCanvasPointerDown(getTileFromPointer(event))}
      onPointerMove={(event) => onCanvasPointerMove(getTileFromPointer(event), { shiftKey: event.shiftKey })}
      onPointerUp={onCanvasPointerUp}
    >
      <defs>
        <pattern id="editor-grid-10" width="10" height="10" patternUnits="userSpaceOnUse">
          <path d="M 10 0 L 0 0 0 10" fill="none" stroke="#182235" strokeWidth="0.35" />
        </pattern>
        <pattern id="editor-grid-1" width="1" height="1" patternUnits="userSpaceOnUse">
          <path d="M 1 0 L 0 0 0 1" fill="none" stroke="#243041" strokeWidth="0.08" />
        </pattern>
      </defs>

      <rect width={WORLD_SIZE} height={WORLD_SIZE} fill="#020617" />

      {overlays.showSurface &&
        (Object.keys(SURFACE_OVERLAY_COLORS) as SurfaceKind[]).map((kind) =>
          overlayPaths.byKind[kind] ? (
            <path key={kind} d={overlayPaths.byKind[kind]} fill={SURFACE_OVERLAY_COLORS[kind]} fillOpacity={0.16} stroke="none" />
          ) : null
        )}

      {overlays.showWalkability && overlayPaths.walkable && <path d={overlayPaths.walkable} fill="#22c55e" fillOpacity={0.08} stroke="none" />}
      {overlays.showWalkability && overlayPaths.blocked && <path d={overlayPaths.blocked} fill="#ef4444" fillOpacity={0.16} stroke="none" />}
      {overlays.showWorldGrid && <rect width={WORLD_SIZE} height={WORLD_SIZE} fill="url(#editor-grid-10)" />}
      {overlays.showPathGrid && <rect width={WORLD_SIZE} height={WORLD_SIZE} fill="url(#editor-grid-1)" />}

      {zones.map((zone) => {
        const isSelected = selection.zoneIds.includes(zone.id);
        return (
          <g key={zone.id}>
            <rect
              x={zone.minX}
              y={zone.minY}
              width={zone.maxX - zone.minX + 1}
              height={zone.maxY - zone.minY + 1}
              fill={isSelected ? '#f87171aa' : overlays.showZoneOverlay ? '#dc262680' : '#dc262630'}
              stroke={isSelected ? '#fecaca' : '#fca5a5'}
              strokeWidth={isSelected ? 1.1 : 0.8}
              onPointerDown={(event) => {
                event.stopPropagation();
                onZonePointerDown(zone.id, {
                  shiftKey: event.shiftKey,
                  metaKey: event.metaKey,
                  ctrlKey: event.ctrlKey,
                });
              }}
            />
            {(isSelected || overlays.showZoneOverlay) && (
              <text x={zone.minX + 0.5} y={Math.max(zone.minY - 0.8, 1)} fill="#fca5a5" fontSize={2.4} className="pointer-events-none select-none">
                {zone.name}
              </text>
            )}
          </g>
        );
      })}

      {buildings.map((building) => {
        const footprint = getFootprint(building);
        const access = getBuildingAccessPosition({
          id: building.id,
          name: building.name,
          type: building.type,
          pos: building.pos,
          voxels: building.voxels,
          npcId: building.npcId,
          isDiscovered: building.isDiscovered,
        });
        const isSelected = selection.buildingIds.includes(building.id);
        const fill = overlays.showTypeOverlay ? tintForType(building.type) : '#475569';

        return (
          <g key={building.id}>
            <rect
              x={footprint.minX}
              y={footprint.minY}
              width={footprint.maxX - footprint.minX + 1}
              height={footprint.maxY - footprint.minY + 1}
              rx={1}
              fill={isSelected ? '#fde68aaa' : `${fill}cc`}
              stroke={isSelected ? '#fef3c7' : '#0f172a'}
              strokeWidth={isSelected ? 1.2 : 0.8}
              onPointerDown={(event) => {
                event.stopPropagation();
                onBuildingPointerDown(building.id, getTileFromPointer(event), {
                  shiftKey: event.shiftKey,
                  metaKey: event.metaKey,
                  ctrlKey: event.ctrlKey,
                });
              }}
            />
            {overlays.showBounds && isSelected && (
              <>
                <rect
                  x={footprint.minX - 0.2}
                  y={footprint.minY - 0.2}
                  width={footprint.maxX - footprint.minX + 1.4}
                  height={footprint.maxY - footprint.minY + 1.4}
                  fill="none"
                  stroke="#facc15"
                  strokeWidth={0.55}
                  strokeDasharray="1.2 0.8"
                />
                <text x={footprint.minX} y={Math.max(footprint.minY - 0.8, 1)} fill="#fde68a" fontSize={2.5} className="pointer-events-none select-none">
                  {`${building.id} [${building.pos.x},${building.pos.y}]`}
                </text>
              </>
            )}
            {(isSelected || (overlays.showTypeOverlay && zoom >= 3.5)) && (
              <text x={footprint.minX + 0.5} y={footprint.minY + 2} fill="#e2e8f0" fontSize={2.2} className="pointer-events-none select-none">
                {isSelected ? `${building.name} (${building.type})` : building.type}
              </text>
            )}
            {overlays.showAccessPoints && (
              <>
                <line
                  x1={building.pos.x}
                  y1={building.pos.y}
                  x2={access.x}
                  y2={access.y}
                  stroke={isSelected ? '#fde68a' : '#93c5fd'}
                  strokeWidth={0.35}
                  strokeDasharray="1 0.6"
                />
                <circle
                  cx={access.x + 0.5}
                  cy={access.y + 0.5}
                  r={isSelected ? 0.75 : 0.55}
                  fill={isSelected ? '#fde68a' : '#38bdf8'}
                  stroke="#020617"
                  strokeWidth={0.2}
                />
              </>
            )}
          </g>
        );
      })}

      {dragState?.kind === 'zone' && (
        <rect
          x={Math.min(dragState.start.x, dragState.end.x)}
          y={Math.min(dragState.start.y, dragState.end.y)}
          width={Math.abs(dragState.end.x - dragState.start.x) + 1}
          height={Math.abs(dragState.end.y - dragState.start.y) + 1}
          fill="#fb718580"
          stroke="#fecdd3"
          strokeWidth={0.8}
          strokeDasharray="2 1"
        />
      )}

      {hoverTile && (
        <rect
          x={hoverTile.x}
          y={hoverTile.y}
          width={1}
          height={1}
          fill="none"
          stroke={tool === 'erase' ? '#f87171' : '#38bdf8'}
          strokeWidth={0.35}
          className="pointer-events-none"
        />
      )}
    </svg>
  );
};

export const PlannerCanvas = React.forwardRef<PlannerCanvasHandle, PlannerCanvasProps>(({
  mode,
  onCanvasPointerLeave,
  ...props
}, ref) => {
  const rootRef = React.useRef<HTMLDivElement | null>(null);

  React.useImperativeHandle(ref, () => ({
    exportViewportPng: async () => {
      const root = rootRef.current;
      if (!root) {
        return false;
      }

      if (mode === '2d') {
        const svg = root.querySelector('svg');
        if (!(svg instanceof SVGSVGElement)) {
          return false;
        }

        const blob = await serializeSvgToPngBlob(svg);
        if (!blob) {
          return false;
        }

        downloadBlob(blob, `aureus-editor-${mode}.png`);
        return true;
      }

      const canvas = root.querySelector('canvas');
      if (!(canvas instanceof HTMLCanvasElement)) {
        return false;
      }

      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
      if (!blob) {
        return false;
      }

      downloadBlob(blob, `aureus-editor-${mode}.png`);
      return true;
    },
  }), [mode]);

  return (
    <div
      ref={rootRef}
      className="h-full min-h-[680px] overflow-auto rounded-[28px] border border-white/10 bg-[radial-gradient(circle_at_top,#102145_0%,#040815_58%,#02040c_100%)] shadow-[0_30px_90px_rgba(2,6,23,0.55)]"
      onPointerLeave={onCanvasPointerLeave}
    >
      {mode === '2d' ? (
        <div className="w-max">
          <PlannerCanvas2D {...props} />
        </div>
      ) : (
        <Canvas
          shadows
          gl={{ antialias: true, preserveDrawingBuffer: true }}
          camera={{ position: [112, 118, 112], fov: 42, near: 0.1, far: 500 }}
          className="h-full min-h-[680px] w-full"
        >
          <EditorScene mode={mode} {...props} />
        </Canvas>
      )}
    </div>
  );
});

PlannerCanvas.displayName = 'PlannerCanvas';
