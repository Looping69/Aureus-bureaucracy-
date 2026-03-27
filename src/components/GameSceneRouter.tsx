import React from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Pickaxe } from 'lucide-react';
import { GameState, WorldPosition } from '../types';
import { MinePickerModal } from './MinePickerModal';
import { MineSceneFallback } from './MineSceneFallback';

const WorldScene = React.lazy(() =>
  import('./WorldScene').then((module) => ({ default: module.WorldScene }))
);
const MineScene = React.lazy(() =>
  import('./MineScene').then((module) => ({ default: module.MineScene }))
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
  onPointerDown: (e: React.PointerEvent) => void;
  onPointerMove: (e: React.PointerEvent) => void;
  onPointerUp: (e: React.PointerEvent) => void;
  onWheel: (e: React.WheelEvent) => void;
  onMove: (pos: WorldPosition) => void;
  onMine: (tileId: string) => void;
  onMineAction: (action: string) => void;
  onOpenMine: () => void;
  onRest: () => void;
  onRecenter: () => void;
  onTravel: (mineId: string) => void;
  onSelectMine: (mineId: string) => void;
  onCloseMinePicker: () => void;
  onWorldInteract: (npcId: string, buildingId: string) => void;
  onOpenPlanner: () => void;
  onUpdateBuildings: (newBuildings: GameState['buildings']) => void;
  onClosePlanner: () => void;
  onReturnMineToWorld: () => void;
  onSelectNPC: (id: string) => void;
  onSelectPermit: (id: string) => void;
  onFoundItem: (itemId: string) => void;
  onTakePhoto: (itemId: string) => void;
  onExplorationComplete: () => void;
  onStartExploration: () => void;
  onTravelTo: (buildingId: string) => void;
  onBackToDirectory: () => void;
}

export const GameSceneRouter: React.FC<GameSceneRouterProps> = ({
  state,
  showMinePicker,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onWheel,
  onMove,
  onMine,
  onMineAction,
  onOpenMine,
  onRest,
  onRecenter,
  onTravel,
  onSelectMine,
  onCloseMinePicker,
  onWorldInteract,
  onOpenPlanner,
  onUpdateBuildings,
  onClosePlanner,
  onReturnMineToWorld,
  onSelectNPC,
  onSelectPermit,
  onFoundItem,
  onTakePhoto,
  onExplorationComplete,
  onStartExploration,
  onTravelTo,
  onBackToDirectory
}) => {
  const sceneLoading = (
    <div className="flex-1 flex items-center justify-center text-xs uppercase tracking-widest text-slate-500 bg-slate-100">
      Loading Scene...
    </div>
  );

  return (
    <>
      <AnimatePresence mode="wait">
        {state.currentScene === 'MINE' ? (
          <motion.div
            key="mine"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="flex-1 flex flex-col overflow-hidden"
          >
            {state.activeMineId ? (
              <React.Suspense fallback={sceneLoading}>
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
            <React.Suspense fallback={sceneLoading}>
              <WorldScene
                state={state}
                onMove={onMove}
                onInteract={onWorldInteract}
                onEnterHome={onRest}
                onEnterMine={onOpenMine}
                onRecenter={onRecenter}
                onTravel={onTravel}
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
              />
            </React.Suspense>
          </motion.div>
        )}
      </AnimatePresence>

      {state.currentScene === 'WORLD' && (
        <button
          onClick={onOpenPlanner}
          className="fixed bottom-24 right-4 bg-slate-800 text-white p-3 rounded-full shadow-lg z-50 hover:bg-slate-700 border border-slate-600"
          title="Open City Planner"
        >
          <Pickaxe size={24} />
        </button>
      )}

      <MinePickerModal
        show={showMinePicker}
        mines={state.mines}
        onClose={onCloseMinePicker}
        onSelectMine={onSelectMine}
      />
    </>
  );
};
