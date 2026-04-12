import { AuthoringScene } from './types';

const AUTHORING_SCENE_KEY = 'aureus-authoring-scene-v1';

export const loadStoredAuthoringScene = (): AuthoringScene | null => {
  if (typeof window === 'undefined') return null;

  try {
    const raw = window.localStorage.getItem(AUTHORING_SCENE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as AuthoringScene;
  } catch {
    return null;
  }
};

export const saveStoredAuthoringScene = (scene: AuthoringScene) => {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.setItem(AUTHORING_SCENE_KEY, JSON.stringify(scene));
  } catch {
    // Best effort storage.
  }
};
