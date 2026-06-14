import React from 'react';
import { WorldPosition } from '../../types';
import { WorldSurfaceMap, getWorldSurfaceTile } from '../../utils/worldSurface';
import { AnalogStickVector } from '../../components/AnalogStick';

const DEADZONE = 0.18;
const RESPONSE_EXPONENT = 1.15;
const BASE_MAX_SPEED = 5.5;
const ACCELERATION = 28;
const DECELERATION = 26;
const STOP_THRESHOLD = 0.02;
const MAX_FRAME_DELTA = 0.05;
// Skip React state updates when position changed by less than this many world-units;
// VoxelEngine's own 60 fps interpolation smooths the visual gap.
const POSITION_UPDATE_TOLERANCE = 0.015;

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

const roundPosition = (position: WorldPosition): WorldPosition => ({
  x: Math.round(position.x),
  y: Math.round(position.y),
});

const positionsEqual = (a: WorldPosition, b: WorldPosition) => a.x === b.x && a.y === b.y;

const positionsNear = (a: WorldPosition, b: WorldPosition, tol: number) =>
  Math.abs(a.x - b.x) < tol && Math.abs(a.y - b.y) < tol;

const moveToward = (current: number, target: number, maxDelta: number) => {
  if (Math.abs(target - current) <= maxDelta) return target;
  return current + Math.sign(target - current) * maxDelta;
};

interface UseContinuousAnalogMovementArgs {
  input: AnalogStickVector;
  authoritativePosition: WorldPosition;
  movementSpeed: number;
  surfaceMap: WorldSurfaceMap;
  cameraAzimuth: number;
  bounds: { min: number; max: number };
  onInputStart?: (roundedPos: WorldPosition) => void;
  onRoundedPositionChange?: (roundedPos: WorldPosition) => void;
  onMotionEnd?: (roundedPos: WorldPosition, precisePos?: WorldPosition) => void;
}

export interface ContinuousAnalogMovementState {
  position: WorldPosition;
  roundedPosition: WorldPosition;
  isMoving: boolean;
  hasDirectionalInput: boolean;
  heading: WorldPosition;
}

export const useContinuousAnalogMovement = ({
  input,
  authoritativePosition,
  movementSpeed,
  surfaceMap,
  cameraAzimuth,
  bounds,
  onInputStart,
  onRoundedPositionChange,
  onMotionEnd,
}: UseContinuousAnalogMovementArgs): ContinuousAnalogMovementState => {
  const [position, setPosition] = React.useState<WorldPosition>(authoritativePosition);
  const [roundedPosition, setRoundedPosition] = React.useState<WorldPosition>(() => roundPosition(authoritativePosition));
  const [isMoving, setIsMoving] = React.useState(false);
  const [hasDirectionalInput, setHasDirectionalInput] = React.useState(false);
  const [heading, setHeading] = React.useState<WorldPosition>({ x: 0, y: 1 });

  const positionRef = React.useRef(authoritativePosition);
  const velocityRef = React.useRef<WorldPosition>({ x: 0, y: 0 });
  const lastHeadingRef = React.useRef<WorldPosition>({ x: 0, y: 1 });
  const lastFrameRef = React.useRef<number | null>(null);
  const hadControlRef = React.useRef(false);
  const roundedPositionRef = React.useRef(roundPosition(authoritativePosition));
  const callbacksRef = React.useRef({ onInputStart, onRoundedPositionChange, onMotionEnd });
  const inputRef = React.useRef(input);
  const movementSpeedRef = React.useRef(movementSpeed);
  const surfaceMapRef = React.useRef(surfaceMap);
  const cameraAzimuthRef = React.useRef(cameraAzimuth);
  const boundsRef = React.useRef(bounds);

  callbacksRef.current = { onInputStart, onRoundedPositionChange, onMotionEnd };
  inputRef.current = input;
  movementSpeedRef.current = movementSpeed;
  surfaceMapRef.current = surfaceMap;
  cameraAzimuthRef.current = cameraAzimuth;
  boundsRef.current = bounds;

  React.useEffect(() => {
    if (hadControlRef.current || isMoving) return;

    positionRef.current = authoritativePosition;
    roundedPositionRef.current = roundPosition(authoritativePosition);
    velocityRef.current = { x: 0, y: 0 };
    setPosition(authoritativePosition);
    setRoundedPosition(roundedPositionRef.current);
  }, [authoritativePosition, isMoving]);

  React.useEffect(() => {
    let frameId = 0;

    const step = (timestamp: number) => {
      const previousFrame = lastFrameRef.current;
      lastFrameRef.current = timestamp;
      const deltaSeconds = previousFrame === null
        ? 1 / 60
        : Math.min((timestamp - previousFrame) / 1000, MAX_FRAME_DELTA);

      const liveInput = inputRef.current;
      const liveMovementSpeed = movementSpeedRef.current;
      const liveSurfaceMap = surfaceMapRef.current;
      const liveCameraAzimuth = cameraAzimuthRef.current;
      const liveBounds = boundsRef.current;
      const rawMagnitude = liveInput.active ? Math.min(1, Math.hypot(liveInput.x, liveInput.y)) : 0;
      const hasInput = rawMagnitude > DEADZONE;

      let desiredVelocity = { x: 0, y: 0 };

      if (hasInput) {
        const inputMagnitude = (rawMagnitude - DEADZONE) / (1 - DEADZONE);
        const curvedMagnitude = Math.pow(clamp(inputMagnitude, 0, 1), RESPONSE_EXPONENT);
        const screenVertical = -liveInput.y;
        const worldX = (Math.cos(liveCameraAzimuth) * liveInput.x) + (-Math.sin(liveCameraAzimuth) * screenVertical);
        const worldY = (-Math.sin(liveCameraAzimuth) * liveInput.x) + (-Math.cos(liveCameraAzimuth) * screenVertical);
        const worldMagnitude = Math.hypot(worldX, worldY);

        if (worldMagnitude > 0) {
          const directionX = worldX / worldMagnitude;
          const directionY = worldY / worldMagnitude;
          const targetSpeed = BASE_MAX_SPEED * liveMovementSpeed * curvedMagnitude;
          desiredVelocity = {
            x: directionX * targetSpeed,
            y: directionY * targetSpeed,
          };
          lastHeadingRef.current = { x: directionX, y: directionY };
        }
      }

      const currentVelocity = velocityRef.current;
      const targetMagnitude = Math.hypot(desiredVelocity.x, desiredVelocity.y);
      const currentMagnitude = Math.hypot(currentVelocity.x, currentVelocity.y);
      const maxVelocityDelta = (targetMagnitude > currentMagnitude ? ACCELERATION : DECELERATION) * deltaSeconds;
      const nextVelocity = {
        x: moveToward(currentVelocity.x, desiredVelocity.x, maxVelocityDelta),
        y: moveToward(currentVelocity.y, desiredVelocity.y, maxVelocityDelta),
      };

      if (!hasInput && Math.hypot(nextVelocity.x, nextVelocity.y) < STOP_THRESHOLD) {
        nextVelocity.x = 0;
        nextVelocity.y = 0;
      }

      let nextPosition = positionRef.current;
      const moveX = nextVelocity.x * deltaSeconds;
      const moveY = nextVelocity.y * deltaSeconds;

      const canOccupy = (from: WorldPosition, to: WorldPosition) => {
        const fromTile = getWorldSurfaceTile(liveSurfaceMap, Math.round(from.x), Math.round(from.y));
        const toTile = getWorldSurfaceTile(liveSurfaceMap, Math.round(to.x), Math.round(to.y));

        if (!fromTile || !toTile || !toTile.walkable) {
          return false;
        }

        return Math.abs(toTile.height - fromTile.height) <= 1;
      };

      if (moveX !== 0) {
        const candidateX = {
          x: clamp(nextPosition.x + moveX, liveBounds.min, liveBounds.max),
          y: nextPosition.y,
        };

        if (canOccupy(nextPosition, candidateX)) {
          nextPosition = candidateX;
        } else {
          nextVelocity.x = 0;
        }
      }

      if (moveY !== 0) {
        const candidateY = {
          x: nextPosition.x,
          y: clamp(nextPosition.y + moveY, liveBounds.min, liveBounds.max),
        };

        if (canOccupy(nextPosition, candidateY)) {
          nextPosition = candidateY;
        } else {
          nextVelocity.y = 0;
        }
      }

      positionRef.current = nextPosition;
      velocityRef.current = nextVelocity;

      const nextRounded = roundPosition(nextPosition);
      const movingNow = Math.hypot(nextVelocity.x, nextVelocity.y) >= STOP_THRESHOLD;
      const hasControl = hasInput || movingNow;
      const callbacks = callbacksRef.current;

      if (hasInput && !hadControlRef.current) {
        callbacks.onInputStart?.(nextRounded);
      }

      if (!positionsEqual(nextRounded, roundedPositionRef.current)) {
        roundedPositionRef.current = nextRounded;
        callbacks.onRoundedPositionChange?.(nextRounded);
      }

      if (hadControlRef.current && !hasControl) {
        callbacks.onMotionEnd?.(roundedPositionRef.current, positionRef.current);
      }

      hadControlRef.current = hasControl;

      setPosition((prev) => (positionsNear(prev, nextPosition, POSITION_UPDATE_TOLERANCE) ? prev : nextPosition));
      setRoundedPosition((prev) => (positionsEqual(prev, roundedPositionRef.current) ? prev : roundedPositionRef.current));
      setHasDirectionalInput((prev) => (prev === hasInput ? prev : hasInput));
      setIsMoving((prev) => (prev === movingNow ? prev : movingNow));
      setHeading((prev) => (
        prev.x === lastHeadingRef.current.x && prev.y === lastHeadingRef.current.y
          ? prev
          : lastHeadingRef.current
      ));

      frameId = requestAnimationFrame(step);
    };

    frameId = requestAnimationFrame(step);

    return () => {
      cancelAnimationFrame(frameId);
      lastFrameRef.current = null;
      hadControlRef.current = false;
    };
  }, []);

  return {
    position,
    roundedPosition,
    isMoving,
    hasDirectionalInput,
    heading,
  };
};
