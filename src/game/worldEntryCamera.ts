export interface WorldEntryCameraVector {
  x: number;
  y: number;
  z: number;
}

export interface WorldEntryCameraPlan {
  duration: number;
  startPosition: WorldEntryCameraVector;
  startLookTarget: WorldEntryCameraVector;
  endPosition: WorldEntryCameraVector;
  lookTarget: WorldEntryCameraVector;
}

const ENTRY_CAMERA_DURATION = 0.9;
const ENTRY_CAMERA_HEAD_HEIGHT = 1.65;

const lerp = (from: number, to: number, progress: number) => from + ((to - from) * progress);

const easeInOutCubic = (progress: number) =>
  progress < 0.5
    ? 4 * progress * progress * progress
    : 1 - Math.pow(-2 * progress + 2, 3) / 2;

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

const interpolateVector = (
  from: WorldEntryCameraVector,
  to: WorldEntryCameraVector,
  progress: number,
): WorldEntryCameraVector => ({
  x: lerp(from.x, to.x, progress),
  y: lerp(from.y, to.y, progress),
  z: lerp(from.z, to.z, progress),
});

export const createWorldEntryCameraPlan = ({
  orbitCameraPosition,
  orbitCameraTarget,
  playerPosition,
  buildingLookTarget,
}: {
  orbitCameraPosition: WorldEntryCameraVector;
  orbitCameraTarget: WorldEntryCameraVector;
  playerPosition: WorldEntryCameraVector;
  buildingLookTarget: WorldEntryCameraVector;
}): WorldEntryCameraPlan => ({
  duration: ENTRY_CAMERA_DURATION,
  startPosition: orbitCameraPosition,
  startLookTarget: orbitCameraTarget,
  endPosition: {
    x: playerPosition.x,
    y: playerPosition.y + ENTRY_CAMERA_HEAD_HEIGHT,
    z: playerPosition.z,
  },
  lookTarget: buildingLookTarget,
});

export const sampleWorldEntryCameraPlan = (
  plan: WorldEntryCameraPlan,
  elapsedSeconds: number,
): {
  progress: number;
  position: WorldEntryCameraVector;
  lookTarget: WorldEntryCameraVector;
} => {
  const normalized = clamp01(plan.duration <= 0 ? 1 : elapsedSeconds / plan.duration);
  const eased = easeInOutCubic(normalized);

  return {
    progress: normalized,
    position: interpolateVector(plan.startPosition, plan.endPosition, eased),
    lookTarget: interpolateVector(plan.startLookTarget, plan.lookTarget, eased),
  };
};
