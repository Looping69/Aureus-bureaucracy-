import React, { useEffect, useRef, useState } from 'react';
import { VoxelEngine } from '../VoxelEngine';
import { Building, NPC, AppState, NavigationZone, VoxelData, WorldHoverInfo } from '../types';
import { useCameraControls } from '../hooks/useCameraControls';
import { WORLD_HALF_SIZE } from '../utils/voxelConstants';
import { buildWorldSurfaceMap, getWorldSurfaceHeight } from '../utils/worldSurface';
import { LoadingScreen } from './LoadingScreen';

interface VoxelWorldProps {
  voxels: VoxelData[];
  buildings: Building[];
  navigationZones: NavigationZone[];
  npcs: Record<string, NPC>;
  time: number;
  playerPos: { x: number, y: number };
  isMoving: boolean;
  targetPos: { x: number, y: number } | null;
  path: { x: number, y: number }[];
  recenterTrigger?: number;
  onStateChange: (state: AppState) => void;
  onCountChange: (count: number) => void;
  onHoverPosition?: (pos: WorldHoverInfo | null) => void;
  onSelect?: (target: WorldHoverInfo, tapCount: number) => void;
  objectiveTarget?: WorldHoverInfo | null;
  showLoadingOverlay?: boolean;
  onReady?: () => void;
  onProgress?: (progress: number, phase: string) => void;
  /** When true the player character plays the WORKING (pickaxe-swing) animation */
  playerWorking?: boolean;
  /** Number of ore blocks visually stacked on the player's back (0..MAX_CARRY) */
  playerCarried?: number;
}

export const VoxelWorldContainer: React.FC<VoxelWorldProps> = ({ 
  voxels, 
  buildings,
  navigationZones,
  npcs,
  time, 
  playerPos, 
  isMoving, 
  targetPos,
  path,
  recenterTrigger,
  onStateChange, 
  onCountChange,
  onHoverPosition,
  onSelect,
  objectiveTarget,
  showLoadingOverlay = true,
  onReady,
  onProgress,
  playerWorking,
  playerCarried
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<VoxelEngine | null>(null);
  const [loading, setLoading] = useState(showLoadingOverlay);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingPhase, setLoadingPhase] = useState('Booting render pipeline...');
  const engineReadyRef = useRef(false);
  const readyReportedRef = useRef(false);
  const onReadyRef = useRef(onReady);
  const onProgressRef = useRef(onProgress);
  const surfaceMap = React.useMemo(
    () => buildWorldSurfaceMap(buildings, undefined, navigationZones),
    [buildings, navigationZones]
  );
  const playerSurfaceY = React.useMemo(
    () => getWorldSurfaceHeight(playerPos, surfaceMap),
    [playerPos, surfaceMap]
  );

  useCameraControls(engineRef);

  useEffect(() => {
    onReadyRef.current = onReady;
  }, [onReady]);

  useEffect(() => {
    onProgressRef.current = onProgress;
  }, [onProgress]);

  useEffect(() => {
    setLoading(showLoadingOverlay && !engineReadyRef.current);
  }, [showLoadingOverlay]);

  useEffect(() => {
    if (engineRef.current && recenterTrigger !== undefined) {
      engineRef.current.recenterOnPlayer();
    }
  }, [recenterTrigger]);

  useEffect(() => {
    const reportProgress = (progress: number, phase: string) => {
      const nextProgress = Math.max(0, Math.min(100, progress));
      setLoadingProgress((prev) => Math.max(prev, nextProgress));
      setLoadingPhase(phase);
      onProgressRef.current?.(nextProgress, phase);
    };

    if (containerRef.current) {
      reportProgress(8, 'Booting render pipeline...');
      engineRef.current = new VoxelEngine(
        containerRef.current,
        onStateChange,
        onCountChange,
        undefined, // onVoxelEdit
        onHoverPosition,
        onSelect
      );
      reportProgress(18, 'Allocating render systems...');

      engineRef.current.loadInitialModel(voxels);
      reportProgress(58, 'Meshing terrain volume...');
      
      // Add buildings
      buildings.forEach(b => {
        engineRef.current?.entities.addBuilding(b);
        
        // If building has an NPC, add them at the building's position
        if (b.npcId !== 'none' && npcs[b.npcId]) {
          engineRef.current?.entities.addNPC(npcs[b.npcId], b.pos);
        }
      });
      reportProgress(74, 'Registering city structures...');

      // Initialise NPC commuting routes
      const buildingsMap: Record<string, Building> = {};
      buildings.forEach(b => { buildingsMap[b.id] = b; });
      engineRef.current.entities.initNpcMovement(npcs, buildingsMap, navigationZones);
      reportProgress(86, 'Deploying field personnel...');

      engineRef.current.updateTime(time);
      reportProgress(92, 'Syncing daylight cycle...');
      engineRef.current.setPlayerPosition(
        playerPos.x - WORLD_HALF_SIZE, 
        playerPos.y - WORLD_HALF_SIZE, 
        playerSurfaceY,
        isMoving, 
        targetPos ? targetPos.x - WORLD_HALF_SIZE : undefined, 
        targetPos ? targetPos.y - WORLD_HALF_SIZE : undefined,
        path
      );
      reportProgress(97, 'Authorizing sector access...');

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          engineReadyRef.current = true;
          reportProgress(100, 'Access Granted');
          setLoading(false);
          if (!readyReportedRef.current) {
            readyReportedRef.current = true;
            onReadyRef.current?.();
          }
        });
      });

      const resizeObserver = new ResizeObserver(() => {
        engineRef.current?.handleResize();
      });
      resizeObserver.observe(containerRef.current);

      return () => {
        resizeObserver.disconnect();
        engineRef.current?.cleanup();
      };
    }
  // The engine owns its lifetime; we initialize it once and drive later updates
  // through the dedicated effects below.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (engineRef.current) {
      engineRef.current.loadInitialModel(voxels);
    }
  }, [voxels]);

  useEffect(() => {
    if (!engineRef.current) return;

    const entities = engineRef.current.entities;

    entities.buildings.forEach((building) => {
      entities.entityGroup.remove(building.group);
    });
    entities.buildings.clear();

    entities.npcs.forEach((npc) => {
      entities.entityGroup.remove(npc.group);
    });
    entities.npcs.clear();

    buildings.forEach((b) => {
      entities.addBuilding(b);
      if (b.npcId !== 'none' && npcs[b.npcId]) {
        entities.addNPC(npcs[b.npcId], b.pos);
      }
    });

    // Re-initialise NPC commuting routes
    const buildingsMap: Record<string, Building> = {};
    buildings.forEach(b => { buildingsMap[b.id] = b; });
    entities.initNpcMovement(npcs, buildingsMap, navigationZones);
  }, [buildings, navigationZones, npcs]);

  useEffect(() => {
    if (engineRef.current) {
      engineRef.current.updateTime(time);
    }
  }, [time]);

  useEffect(() => {
    if (engineRef.current) {
      engineRef.current.setPlayerPosition(
        playerPos.x - WORLD_HALF_SIZE, 
        playerPos.y - WORLD_HALF_SIZE, 
        playerSurfaceY,
        isMoving, 
        targetPos ? targetPos.x - WORLD_HALF_SIZE : undefined, 
        targetPos ? targetPos.y - WORLD_HALF_SIZE : undefined,
        path
      );
    }
  }, [playerPos, playerSurfaceY, isMoving, targetPos, path]);

  useEffect(() => {
    if (engineRef.current) {
      engineRef.current.setObjectiveTarget(objectiveTarget ?? null);
    }
  }, [objectiveTarget]);

  useEffect(() => {
    if (engineRef.current) {
      engineRef.current.setCallbacks(
        onStateChange,
        onCountChange,
        onHoverPosition,
        onSelect
      );
    }
  }, [onStateChange, onCountChange, onHoverPosition, onSelect]);

  // ── Drive player WORKING animation from prop ────────────────────────────
  useEffect(() => {
    if (!engineRef.current) return;
    const player = engineRef.current.entities.player;
    if (playerWorking) {
      player.setWorking(true);
    } else {
      player.setWorking(false);
    }
  }, [playerWorking]);

  // ── Drive visual carry-stack from prop ──────────────────────────────────
  useEffect(() => {
    if (!engineRef.current) return;
    engineRef.current.entities.player.setCarriedAmount(playerCarried ?? 0);
  }, [playerCarried]);

  return (
    <div ref={containerRef} className="w-full h-full relative">
      <LoadingScreen visible={loading} progress={loadingProgress} phase={loadingPhase} />
    </div>
  );
};
