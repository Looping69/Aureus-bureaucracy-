import React from 'react';
import * as THREE from 'three';
import { Canvas, ThreeEvent, useThree } from '@react-three/fiber';
import { Html, OrbitControls } from '@react-three/drei';
import { NavigationZone, WorldPosition } from '../../types';
import { getBuildingAccessPosition } from '../../utils/buildingAccess';
import { getBuildingFootprint, getBuildingHeight, getStructureBaseHeight } from '../../utils/worldNavigation';
import { CONFIG, WORLD_HALF_SIZE, WORLD_SIZE } from '../../utils/voxelConstants';
import { SurfaceKind, SurfaceTile, WorldSurfaceMap, getWorldSurfaceTile } from '../../utils/worldSurface';
import { AuthoredBuilding, EditorOverlayState, EditorSelection, EditorTool } from '../../editor/types';
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

type SurfaceMapTile = SurfaceTile;

type DragState =
  | { kind: 'zone'; start: WorldPosition; end: WorldPosition }
  | { kind: 'move'; origin: WorldPosition }
  | null;

type PlannerCanvasProps = {
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

const useStableZoomCamera = (zoom: number) => {
  const { camera } = useThree();

  React.useEffect(() => {
    const perspectiveCamera = camera as THREE.PerspectiveCamera;
    const orbitState = (perspectiveCamera.userData.editorOrbitState ??=
      {
        target: new THREE.Vector3(0, -0.5, 0),
        position: perspectiveCamera.position.clone(),
      }) as { target: THREE.Vector3; position: THREE.Vector3 };

    const direction = perspectiveCamera.position.clone().sub(orbitState.target).normalize();
    const zoomT = (zoom - 2) / 6;
    const distance = THREE.MathUtils.lerp(190, 58, THREE.MathUtils.clamp(zoomT, 0, 1));

    perspectiveCamera.position.copy(orbitState.target).addScaledVector(direction, distance);
    perspectiveCamera.lookAt(orbitState.target);
  }, [camera, zoom]);
};

const TerrainColumns = ({
  surfaceMap,
  overlays,
}: {
  surfaceMap: WorldSurfaceMap;
  overlays: EditorOverlayState;
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
      matrix.compose(
        new THREE.Vector3(tileToWorld(tile.x), metrics.centerY, tileToWorld(tile.y)),
        new THREE.Quaternion(),
        new THREE.Vector3(1, metrics.columnHeight, 1)
      );
      mesh.setMatrixAt(index, matrix);

      const tint = overlays.showSurface ? SURFACE_OVERLAY_COLORS[tile.kind] : SURFACE_BASE_COLORS[tile.kind];
      color.set(tint);
      if (!tile.walkable) {
        color.lerp(new THREE.Color('#260f1a'), 0.25);
      }
      mesh.setColorAt(index, color);
    });

    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) {
      mesh.instanceColor.needsUpdate = true;
    }
    mesh.computeBoundingSphere();
  }, [overlays.showSurface, tiles]);

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, tiles.length]} receiveShadow castShadow={false}>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial roughness={0.96} metalness={0.02} vertexColors />
    </instancedMesh>
  );
};

const TileOverlayLayer = ({
  surfaceMap,
  getColorForTile,
}: {
  surfaceMap: WorldSurfaceMap;
  getColorForTile: (tile: SurfaceMapTile) => string | null;
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
  onPointerDown,
  onPointerMove,
  onPointerUp,
}: {
  zone: NavigationZone;
  isSelected: boolean;
  showOverlay: boolean;
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
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
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
  onPointerDown,
  onPointerMove,
  onPointerUp,
}: {
  building: AuthoredBuilding;
  overlays: EditorOverlayState;
  surfaceMap: WorldSurfaceMap;
  isSelected: boolean;
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
  const height = Math.max(getBuildingHeight({
    id: building.id,
    name: building.name,
    type: building.type,
    pos: building.pos,
    voxels: building.voxels,
    npcId: building.npcId,
    isDiscovered: building.isDiscovered,
  }), 1.2);
  const tint = tintForType(building.type);
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
          <meshStandardMaterial color={tint} roughness={0.78} metalness={0.1} transparent opacity={0.9} />
        </mesh>
      )}

      <mesh
        position={[centerX, baseY + height / 2, centerZ]}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      >
        <boxGeometry args={[width, Math.max(height, 2), depth]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>

      {overlays.showBounds && (
        <SelectionBounds
          size={[width + (isSelected ? 0.3 : 0.12), height + 0.2, depth + (isSelected ? 0.3 : 0.12)]}
          position={[centerX, baseY + height / 2, centerZ]}
          color={isSelected ? '#fde68a' : '#1e293b'}
        />
      )}

      {isSelected && (
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

      {overlays.showAccessPoints && (
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

const EditorScene = ({
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
}: Omit<PlannerCanvasProps, 'onCanvasPointerLeave'>) => {
  useStableZoomCamera(zoom);
  const orbitRef = React.useRef<{
    target: THREE.Vector3;
    object: THREE.Camera;
    addEventListener: (type: string, listener: () => void) => void;
    removeEventListener: (type: string, listener: () => void) => void;
  } | null>(null);

  const handleScenePointerMove = React.useCallback((event: ThreeEvent<PointerEvent>) => {
    onCanvasPointerMove(pointToTile(event.point), { shiftKey: event.shiftKey });
  }, [onCanvasPointerMove]);

  const handleScenePointerDown = React.useCallback((event: ThreeEvent<PointerEvent>) => {
    onCanvasPointerDown(pointToTile(event.point));
  }, [onCanvasPointerDown]);

  const walkabilityColor = React.useCallback(
    (tile: SurfaceMapTile) =>
      overlays.showWalkability ? (tile.walkable ? '#16a34a' : '#dc2626') : null,
    [overlays.showWalkability]
  );

  React.useEffect(() => {
    const controls = orbitRef.current;
    if (!controls) {
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
  }, []);

  return (
    <>
      <color attach="background" args={['#040815']} />
      <fog attach="fog" args={['#040815', 110, 260]} />

      <ambientLight intensity={0.72} color="#dbeafe" />
      <hemisphereLight intensity={0.58} color="#93c5fd" groundColor="#0f172a" />
      <directionalLight
        position={[55, 82, 36]}
        intensity={1.25}
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
        <meshStandardMaterial color="#060c17" roughness={1} metalness={0} />
      </mesh>

      {overlays.showWorldGrid && (
        <gridHelper
          args={[WORLD_SIZE, WORLD_SIZE / 10, '#3b82f6', '#1e293b']}
          position={[0, 0.04, 0]}
        />
      )}
      {overlays.showPathGrid && (
        <gridHelper
          args={[WORLD_SIZE, WORLD_SIZE, '#334155', '#172033']}
          position={[0, 0.08, 0]}
        />
      )}

      <TerrainColumns surfaceMap={surfaceMap} overlays={overlays} />
      {overlays.showWalkability && (
        <TileOverlayLayer surfaceMap={surfaceMap} getColorForTile={walkabilityColor} />
      )}

      {zones.map((zone) => (
        <ZoneVolume
          key={zone.id}
          zone={zone}
          isSelected={selection.zoneIds.includes(zone.id)}
          showOverlay={overlays.showZoneOverlay}
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

      {dragState?.kind === 'zone' && (
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

      {hoverTile && (
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
        onPointerDown={handleScenePointerDown}
        onPointerMove={handleScenePointerMove}
        onPointerUp={onCanvasPointerUp}
      >
        <planeGeometry args={[WORLD_SIZE, WORLD_SIZE]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>

      <OrbitControls
        ref={orbitRef as never}
        makeDefault
        enablePan
        enableRotate
        enableZoom
        target={[0, -0.5, 0]}
        minDistance={48}
        maxDistance={210}
        minPolarAngle={Math.PI / 5}
        maxPolarAngle={Math.PI / 2.15}
        zoomSpeed={0.8}
        panSpeed={0.9}
        rotateSpeed={0.65}
        dampingFactor={0.08}
      />
    </>
  );
};

export const PlannerCanvas: React.FC<PlannerCanvasProps> = ({
  onCanvasPointerLeave,
  ...props
}) => (
  <div
    className="h-full min-h-[680px] overflow-hidden rounded-[28px] border border-white/10 bg-[radial-gradient(circle_at_top,#102145_0%,#040815_58%,#02040c_100%)] shadow-[0_30px_90px_rgba(2,6,23,0.55)]"
    onPointerLeave={onCanvasPointerLeave}
  >
    <Canvas
      shadows
      gl={{ antialias: true }}
      camera={{ position: [112, 118, 112], fov: 42, near: 0.1, far: 500 }}
    >
      <EditorScene {...props} />
    </Canvas>
  </div>
);
