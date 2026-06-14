import { createMachine } from 'xstate';
import { GameScene, GameState } from '../../types';

export type SceneMachineEvent =
  | { type: 'GO_WORLD' }
  | { type: 'GO_OFFICE' }
  | { type: 'GO_MINE'; mineId?: string | null }
  | { type: 'GO_CITY_PLANNER'; plannerEnabled: boolean };

export const sceneMachine = createMachine({
  id: 'scene',
  initial: 'WORLD',
  states: {
    WORLD: {
      on: {
        GO_OFFICE: 'OFFICE',
        GO_MINE: 'MINE',
        GO_CITY_PLANNER: 'CITY_PLANNER',
      },
    },
    OFFICE: {
      on: {
        GO_WORLD: 'WORLD',
        GO_MINE: 'MINE',
        GO_CITY_PLANNER: 'CITY_PLANNER',
      },
    },
    MINE: {
      on: {
        GO_WORLD: 'WORLD',
        GO_OFFICE: 'OFFICE',
      },
    },
    CITY_PLANNER: {
      on: {
        GO_WORLD: 'WORLD',
      },
    },
  },
});

const allScenes = new Set<GameScene>(['MINE', 'OFFICE', 'WORLD', 'CITY_PLANNER']);

export const isKnownScene = (scene: string): scene is GameScene => allScenes.has(scene as GameScene);

export const hasValidActiveMine = (state: GameState): boolean =>
  state.activeMineId !== null && state.mines.some((mine) => mine.id === state.activeMineId && mine.discovered);

export const normalizeSceneState = (
  state: GameState,
  plannerEnabled: boolean,
): GameState => {
  if (!plannerEnabled && state.currentScene === 'CITY_PLANNER') {
    return { ...state, currentScene: 'WORLD' };
  }

  if (state.currentScene === 'MINE_WORLD') {
    return {
      ...state,
      currentScene: 'WORLD',
      activeBuildingId: null,
    };
  }

  if (state.currentScene === 'MINE' && !hasValidActiveMine(state)) {
    return {
      ...state,
      currentScene: 'WORLD',
      activeMineId: null,
    };
  }

  if (!isKnownScene(state.currentScene)) {
    return { ...state, currentScene: 'WORLD' };
  }

  return state;
};

export const canEnterMineScene = (state: GameState, mineId: string | null | undefined): boolean =>
  !!mineId && state.mines.some((mine) => mine.id === mineId && mine.discovered);
