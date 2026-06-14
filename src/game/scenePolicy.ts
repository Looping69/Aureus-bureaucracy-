import { GameScene } from '../types';

export type SceneNavTarget = 'MINE' | 'UNDERGROUND' | 'WORLD' | 'OFFICE';

export interface SceneNavItem {
  key: string;
  label: string;
  scene: SceneNavTarget;
  title?: string;
  visibleWhen?: (currentScene: GameScene) => boolean;
}

export const SCENE_NAV_ITEMS: readonly SceneNavItem[] = [
  {
    key: 'mine',
    label: 'Mine',
    scene: 'MINE',
  },
  {
    key: 'underground',
    label: 'Underground',
    scene: 'UNDERGROUND',
    title: 'Enter the underground resource field.',
  },
  {
    key: 'world',
    label: 'World',
    scene: 'WORLD',
  },
  {
    key: 'office',
    label: 'Office',
    scene: 'OFFICE',
    visibleWhen: (currentScene) => currentScene === 'OFFICE',
  },
] as const;

export const isSceneActive = (currentScene: GameScene, targetScene: SceneNavTarget) =>
  currentScene === targetScene;

export const getVisibleSceneNavItems = (currentScene: GameScene) =>
  SCENE_NAV_ITEMS.filter((item) => item.visibleWhen?.(currentScene) ?? true);

export const getRenderableScene = (
  currentScene: GameScene,
  plannerEnabled: boolean,
): Exclude<GameScene, 'CITY_PLANNER' | 'MINE_WORLD'> | 'CITY_PLANNER' => {
  if (currentScene === 'CITY_PLANNER' && plannerEnabled) {
    return 'CITY_PLANNER';
  }

  if (currentScene === 'MINE') {
    return 'MINE';
  }

  if (currentScene === 'UNDERGROUND') {
    return 'UNDERGROUND';
  }

  if (currentScene === 'WORLD' || currentScene === 'MINE_WORLD') {
    return 'WORLD';
  }

  return 'OFFICE';
};
