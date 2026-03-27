import React, { useEffect, useRef } from 'react';
import { VoxelEngine } from '../VoxelEngine';
import { Building, NPC, AppState, VoxelData } from '../types';
import { useCameraControls } from '../hooks/useCameraControls';

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
  onHoverPosition?: (pos: { x: number, y: number, z: number } | null) => void;
  onClick?: (x: number, y: number, z: number) => void;
  onInteract?: (type: 'NPC' | 'BUILDING', id: string) => void;
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
  onClick,
  onInteract
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<VoxelEngine | null>(null);

  useCameraControls(engineRef);

  useEffect(() => {
    if (engineRef.current && recenterTrigger !== undefined) {
      engineRef.current.recenterOnPlayer();
    }
  }, [recenterTrigger]);

  useEffect(() => {
    if (containerRef.current) {
      engineRef.current = new VoxelEngine(
        containerRef.current,
        onStateChange,
        onCountChange,
        undefined, // onVoxelEdit
        onHoverPosition,
        onClick,
        onInteract
      );
      engineRef.current.loadInitialModel(voxels);
      
      // Add buildings
      buildings.forEach(b => {
        engineRef.current?.entities.addBuilding(b);
        
        // If building has an NPC, add them at the building's position
        if (b.npcId !== 'none' && npcs[b.npcId]) {
          engineRef.current?.entities.addNPC(npcs[b.npcId], b.pos);
        }
      });

      engineRef.current.updateTime(time);
      engineRef.current.setPlayerPosition(
        playerPos.x - 80, 
        playerPos.y - 80, 
        isMoving, 
        targetPos ? targetPos.x - 80 : undefined, 
        targetPos ? targetPos.y - 80 : undefined,
        path
      );

      const resizeObserver = new ResizeObserver(() => {
        engineRef.current?.handleResize();
      });
      resizeObserver.observe(containerRef.current);

      return () => {
        resizeObserver.disconnect();
        engineRef.current?.cleanup();
      };
    }
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
  }, [buildings]);

  useEffect(() => {
    if (engineRef.current) {
      engineRef.current.updateTime(time);
    }
  }, [time]);

  useEffect(() => {
    if (engineRef.current) {
      engineRef.current.setPlayerPosition(
        playerPos.x - 80, 
        playerPos.y - 80, 
        isMoving, 
        targetPos ? targetPos.x - 80 : undefined, 
        targetPos ? targetPos.y - 80 : undefined,
        path
      );
    }
  }, [playerPos, isMoving, targetPos, path]);

  useEffect(() => {
    if (engineRef.current) {
      engineRef.current.setCallbacks(
        onStateChange,
        onCountChange,
        onHoverPosition,
        onClick,
        onInteract
      );
    }
  }, [onStateChange, onCountChange, onHoverPosition, onClick, onInteract]);

  return <div ref={containerRef} className="w-full h-full" />;
};
