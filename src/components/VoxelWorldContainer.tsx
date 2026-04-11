import React, { useEffect, useRef, useState } from 'react';
import { VoxelEngine } from '../VoxelEngine';
import { AppState, Building, EmergencyVehicle, MedicalNpc, NPC, StaminaPowerUp, VoxelData, WorldHoverInfo } from '../types';
import { useCameraControls } from '../hooks/useCameraControls';
import { WORLD_HALF_SIZE } from '../utils/voxelConstants';
import { buildWorldSurfaceMap, getWorldSurfaceHeight } from '../utils/worldSurface';
import { LoadingScreen } from './LoadingScreen';

interface VoxelWorldProps {
  voxels: VoxelData[];
  buildings: Building[];
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
  /** Visual type for stacked carried blocks – 'ore' (default amber) or 'wood' (brown logs) */
  playerCarriedType?: 'ore' | 'wood';
  /** Building ID to highlight with a subtle emissive glow (tutorial magnet) */
  highlightBuildingId?: string | null;
  /** Glow intensity for the highlighted building (0-1, default 0.15) */
  highlightIntensity?: number;
  playerDowned?: boolean;
  playerRescued?: boolean;
  staminaPowerUps?: StaminaPowerUp[];
  medicalNpcs?: Record<string, MedicalNpc>;
  emergencyVehicles?: Record<string, EmergencyVehicle>;
}

export const VoxelWorldContainer: React.FC<VoxelWorldProps> = ({ 
  voxels, 
  buildings,
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
  playerCarried,
  playerCarriedType,
  highlightBuildingId,
  highlightIntensity,
  playerDowned = false,
  playerRescued = false,
  staminaPowerUps = [],
  medicalNpcs = {},
  emergencyVehicles = {},
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
  const surfaceMap = React.useMemo(() => buildWorldSurfaceMap(buildings), [buildings]);
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
    let cancelled = false;
    let resizeObserver: ResizeObserver | null = null;

    const reportProgress = (progress: number, phase: string) => {
      const nextProgress = Math.max(0, Math.min(100, progress));
      setLoadingProgress((prev) => Math.max(prev, nextProgress));
      setLoadingPhase(phase);
      onProgressRef.current?.(nextProgress, phase);
    };

    // Yield to the browser between heavy steps so the loading screen can
    // re-render and the GPU can process newly-added scene objects.
    const yieldFrame = () =>
      new Promise<void>((resolve) => {
        requestAnimationFrame(() => resolve());
      });

    async function boot() {
      if (!containerRef.current) return;

      // ── Stage 1: Create the Three.js engine ──────────────────────────
      reportProgress(8, 'Booting render pipeline...');
      await yieldFrame();
      if (cancelled) return;

      engineRef.current = new VoxelEngine(
        containerRef.current!,
        onStateChange,
        onCountChange,
        undefined, // onVoxelEdit
        onHoverPosition,
        onSelect
      );

      // Start observing resizes now that the renderer exists
      resizeObserver = new ResizeObserver(() => {
        engineRef.current?.handleResize();
      });
      resizeObserver.observe(containerRef.current!);

      reportProgress(18, 'Allocating render systems...');
      await yieldFrame();
      if (cancelled) return;

      // ── Stage 2: Load terrain voxels (heaviest step) ─────────────────
      engineRef.current.loadInitialModel(voxels);
      reportProgress(58, 'Meshing terrain volume...');
      // Yield so the GPU can compile terrain shaders on the next render
      await yieldFrame();
      if (cancelled) return;

      // ── Stage 3: Add buildings and NPCs ──────────────────────────────
      buildings.forEach(b => {
        engineRef.current?.entities.addBuilding(b);
        if (b.npcId !== 'none' && npcs[b.npcId]) {
          engineRef.current?.entities.addNPC(npcs[b.npcId], b.pos);
        }
      });
      engineRef.current.entities.syncMedicalNpcs(medicalNpcs);
      engineRef.current.entities.syncEmergencyVehicles(emergencyVehicles);
      engineRef.current.entities.syncStaminaPowerUps(staminaPowerUps);
      reportProgress(74, 'Registering city structures...');
      await yieldFrame();
      if (cancelled) return;

      // ── Stage 4: Initialise NPC commuting routes ─────────────────────
      const buildingsMap: Record<string, Building> = {};
      buildings.forEach(b => { buildingsMap[b.id] = b; });
      engineRef.current.entities.initNpcMovement(npcs, buildingsMap);
      reportProgress(86, 'Deploying field personnel...');
      await yieldFrame();
      if (cancelled) return;

      // ── Stage 5: Final scene setup ───────────────────────────────────
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

      // ── Stage 6: Warm-up frames ──────────────────────────────────────
      // Render a few full frames while the loading screen is still visible
      // so the GPU finishes compiling all remaining shaders.  This prevents
      // the first visible frame from stuttering.
      await yieldFrame();
      if (cancelled) return;
      await yieldFrame();
      if (cancelled) return;

      // ── Stage 7: Reveal the world ────────────────────────────────────
      engineReadyRef.current = true;
      reportProgress(100, 'Access Granted');
      setLoading(false);
      // Kick off the intro camera pull-back (close-up → normal isometric view)
      engineRef.current?.playIntroAnimation();
      if (!readyReportedRef.current) {
        readyReportedRef.current = true;
        onReadyRef.current?.();
      }
    }

    boot();

    return () => {
      cancelled = true;
      resizeObserver?.disconnect();
      engineRef.current?.cleanup();
    };
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
    entities.syncMedicalNpcs(medicalNpcs);
    entities.syncEmergencyVehicles(emergencyVehicles);
    entities.syncStaminaPowerUps(staminaPowerUps);

    // Re-initialise NPC commuting routes
    const buildingsMap: Record<string, Building> = {};
    buildings.forEach(b => { buildingsMap[b.id] = b; });
    entities.initNpcMovement(npcs, buildingsMap);
  }, [buildings, emergencyVehicles, medicalNpcs, staminaPowerUps]);

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

  useEffect(() => {
    if (!engineRef.current) return;
    engineRef.current.entities.player.setDowned(playerDowned);
    engineRef.current.entities.player.setEscorted(playerRescued);
  }, [playerDowned, playerRescued]);

  useEffect(() => {
    if (!engineRef.current) return;
    engineRef.current.entities.syncMedicalNpcs(medicalNpcs);
  }, [medicalNpcs]);

  useEffect(() => {
    if (!engineRef.current) return;
    engineRef.current.entities.syncEmergencyVehicles(emergencyVehicles);
  }, [emergencyVehicles]);

  useEffect(() => {
    if (!engineRef.current) return;
    engineRef.current.entities.syncStaminaPowerUps(staminaPowerUps);
  }, [staminaPowerUps]);

  // ── Drive visual carry-stack from prop ──────────────────────────────────
  useEffect(() => {
    if (!engineRef.current) return;
    const player = engineRef.current.entities.player;
    player.setCarriedType(playerCarriedType ?? 'ore');
    player.setCarriedAmount(playerCarried ?? 0);
  }, [playerCarried, playerCarriedType]);

  // ── Drive building highlight glow from prop ────────────────────────────
  useEffect(() => {
    if (!engineRef.current) return;
    engineRef.current.entities.setHighlightedBuilding(
      highlightBuildingId ?? null,
      highlightIntensity ?? 0.15
    );
  }, [highlightBuildingId, highlightIntensity]);

  return (
    <div ref={containerRef} className="w-full h-full relative">
      <LoadingScreen visible={loading} progress={loadingProgress} phase={loadingPhase} />
    </div>
  );
};
