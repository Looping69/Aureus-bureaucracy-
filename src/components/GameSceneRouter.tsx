import React from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { GameState, WorldPosition } from '../types';
import { MinePickerModal } from './MinePickerModal';
import { MineSceneFallback } from './MineSceneFallback';
import { LightLoadingOverlay } from './LightLoadingOverlay';
import { OperationActionId } from '../game/runCycle';

const WorldScene = React.lazy(() =>
  import('./WorldScene').then((module) => ({ default: module.WorldScene }))
);
const MineScene = React.lazy(() =>
  import('./MineScene').then((module) => ({ default: module.MineScene }))
);
const MineWorldScene = React.lazy(() =>
  import('./MineWorldScene').then((module) => ({ default: module.MineWorldScene }))
);
const OfficeScene = React.lazy(() =>
  import('./OfficeScene').then((module) => ({ default: module.OfficeScene }))
);
const CityPlanner = React.lazy(() =>
  import('./CityPlanner').then((module) => ({ default: module.CityPlanner }))
);

interface GameSceneRouterProps {
  state: GameState;
  showMinePicker: boolean;
  showDebug?: boolean;
  onPointerDown: (e: React.PointerEvent) => void;
  onPointerMove: (e: React.PointerEvent) => void;
  onPointerUp: (e: React.PointerEvent) => void;
  onWheel: (e: React.WheelEvent) => void;
  onMove: (pos: WorldPosition, options?: { ignoreDrag?: boolean }) => void;
  onDirectMove: (pos: WorldPosition) => void;
  onMine: (tileId: string) => void;
  onMineAction: (action: string) => void;
  onOpenMine: () => void;
  onRecenter: () => void;
  onSelectMine: (mineId: string) => void;
  onCloseMinePicker: () => void;
  onWorldInteract: (npcId: string, buildingId: string) => void;
  onOpenPlanner: () => void;
  onUpdateBuildings: (newBuildings: GameState['buildings']) => void;
  onClosePlanner: () => void;
  onReturnMineToWorld: () => void;
  onCollectMineResource: (amount: number) => void;
  onSelectNPC: (id: string) => void;
  onSelectPermit: (id: string) => void;
  onFoundItem: (itemId: string) => void;
  onTakePhoto: (itemId: string) => void;
  onExplorationComplete: () => void;
  onStartExploration: () => void;
  onTravelTo: (buildingId: string) => void;
  onBackToDirectory: () => void;
  onOperationAction: (actionId: OperationActionId) => void;
  suppressInitialWorldFallback?: boolean;
  showInitialWorldLoadingOverlay?: boolean;
  onInitialWorldReady?: () => void;
  onInitialWorldLoadingProgress?: (progress: number, phase: string) => void;
  onInitialSceneMounted?: (scene: GameState['currentScene']) => void;
}

const SceneMountSignal = ({
  scene,
  onMounted
}: {
  scene: GameState['currentScene'];
  onMounted?: (scene: GameState['currentScene']) => void;
}) => {
  React.useEffect(() => {
    onMounted?.(scene);
    // This signal is intentionally mount-only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
};

export const GameSceneRouter: React.FC<GameSceneRouterProps> = ({
  state,
  showMinePicker,
  showDebug,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onWheel,
  onMove,
  onDirectMove,
  onMine,
  onMineAction,
  onOpenMine,
  onRecenter,
  onSelectMine,
  onCloseMinePicker,
  onWorldInteract,
  onOpenPlanner,
  onUpdateBuildings,
  onClosePlanner,
  onReturnMineToWorld,
  onCollectMineResource,
  onSelectNPC,
  onSelectPermit,
  onFoundItem,
  onTakePhoto,
  onExplorationComplete,
  onStartExploration,
  onTravelTo,
  onBackToDirectory,
  onOperationAction,
  suppressInitialWorldFallback = false,
  showInitialWorldLoadingOverlay = true,
  onInitialWorldReady,
  onInitialWorldLoadingProgress,
  onInitialSceneMounted
}) => {
  const sceneLoading = <LightLoadingOverlay />;

  return (
    <>
      <AnimatePresence mode="wait">
        {state.currentScene === 'MINE_WORLD' ? (
          <motion.div
            key="mine-world"
            initial={{ opacity: 0, scale: 1.05 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="flex-1 flex flex-col overflow-hidden touch-none"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onWheel={onWheel}
          >
            <React.Suspense fallback={sceneLoading}>
              <SceneMountSignal scene="MINE_WORLD" onMounted={onInitialSceneMounted} />
              <MineWorldScene
                state={state}
                onCollectResource={onCollectMineResource}
                onExit={onReturnMineToWorld}
              />
            </React.Suspense>
          </motion.div>
        ) : state.currentScene === 'MINE' ? (
          <motion.div
            key="mine"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="flex-1 flex flex-col overflow-hidden"
          >
            {state.activeMineId ? (
              <React.Suspense fallback={sceneLoading}>
                <SceneMountSignal scene="MINE" onMounted={onInitialSceneMounted} />
                <MineScene
                  state={state}
                  onMine={onMine}
                  onInteract={onSelectNPC}
                  onReturn={onReturnMineToWorld}
                  onAction={onMineAction}
                />
              </React.Suspense>
            ) : (
              <MineSceneFallback
                onChooseMine={onOpenMine}
                onBackToWorld={onReturnMineToWorld}
              />
            )}
          </motion.div>
        ) : state.currentScene === 'WORLD' ? (
          <motion.div
            key="world"
            initial={{ opacity: 0, scale: 1.1 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="flex-1 flex flex-col overflow-hidden touch-none"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onWheel={onWheel}
          >
            <React.Suspense fallback={suppressInitialWorldFallback ? null : sceneLoading}>
              <SceneMountSignal scene="WORLD" onMounted={onInitialSceneMounted} />
              <WorldScene
                state={state}
                onMove={onMove}
                onDirectMove={onDirectMove}
                onInteract={onWorldInteract}
                onRecenter={onRecenter}
                showDebug={showDebug}
                showInitialLoadingOverlay={showInitialWorldLoadingOverlay}
                onInitialSceneReady={onInitialWorldReady}
                onInitialLoadingProgress={onInitialWorldLoadingProgress}
              />
            </React.Suspense>
          </motion.div>
        ) : state.currentScene === 'CITY_PLANNER' ? (
          <motion.div
            key="planner"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex-1 flex flex-col overflow-hidden z-50"
          >
            <React.Suspense fallback={sceneLoading}>
              <SceneMountSignal scene="CITY_PLANNER" onMounted={onInitialSceneMounted} />
              <CityPlanner
                state={state}
                onUpdateBuildings={onUpdateBuildings}
                onClose={onClosePlanner}
              />
            </React.Suspense>
          </motion.div>
        ) : (
          <motion.div
            key="office"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="flex-1 flex flex-col overflow-hidden"
          >
            <React.Suspense fallback={sceneLoading}>
              <SceneMountSignal scene="OFFICE" onMounted={onInitialSceneMounted} />
              <OfficeScene
                state={state}
                onSelectNPC={onSelectNPC}
                onSelectPermit={onSelectPermit}
                onFoundItem={onFoundItem}
                onTakePhoto={onTakePhoto}
                onExplorationComplete={onExplorationComplete}
                onStartExploration={onStartExploration}
                onTravelTo={onTravelTo}
                onBackToDirectory={onBackToDirectory}
                onOperationAction={onOperationAction}
              />
            </React.Suspense>
          </motion.div>
        )}
      </AnimatePresence>

      <MinePickerModal
        show={showMinePicker}
        mines={state.mines}
        onClose={onCloseMinePicker}
        onSelectMine={onSelectMine}
      />
    </>
  );
};
