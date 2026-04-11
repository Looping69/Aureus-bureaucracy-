/**
 * @module AnalogStick
 * On-screen virtual analog stick for mobile player movement.
 * Tracks pointer/touch input within a circular dead-zone and outer radius,
 * emitting normalised XY deflection values [-1, 1] to the parent scene.
 */
import React from 'react';

export interface AnalogStickVector {
  x: number;
  y: number;
  magnitude: number;
  active: boolean;
}

interface AnalogStickProps {
  onChange: (vector: AnalogStickVector) => void;
  isNight?: boolean;
}

const STICK_RADIUS = 44;
const STICK_DIAMETER = STICK_RADIUS * 2;
const THUMB_DIAMETER = 34;
const ANALOG_STICK_Z_INDEX = 95;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const IDLE_VECTOR: AnalogStickVector = {
  x: 0,
  y: 0,
  magnitude: 0,
  active: false
};

export const AnalogStick: React.FC<AnalogStickProps> = ({ onChange, isNight = false }) => {
  const stickRef = React.useRef<HTMLDivElement>(null);
  const activePointerIdRef = React.useRef<number | null>(null);
  const [thumbOffset, setThumbOffset] = React.useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = React.useState(false);

  const resetStick = React.useCallback(() => {
    activePointerIdRef.current = null;
    setIsDragging(false);
    setThumbOffset({ x: 0, y: 0 });
    onChange(IDLE_VECTOR);
  }, [onChange]);

  React.useEffect(() => resetStick, [resetStick]);

  const updateFromPointer = React.useCallback((clientX: number, clientY: number) => {
    const stick = stickRef.current;
    if (!stick) return;

    const rect = stick.getBoundingClientRect();
    const centerX = rect.left + (rect.width / 2);
    const centerY = rect.top + (rect.height / 2);
    const rawX = clientX - centerX;
    const rawY = clientY - centerY;
    const distance = Math.hypot(rawX, rawY);
    const limitedDistance = Math.min(distance, STICK_RADIUS);
    const angle = Math.atan2(rawY, rawX);
    const constrainedX = Math.cos(angle) * limitedDistance;
    const constrainedY = Math.sin(angle) * limitedDistance;

    setThumbOffset({ x: constrainedX, y: constrainedY });
    onChange({
      x: clamp(constrainedX / STICK_RADIUS, -1, 1),
      y: clamp(constrainedY / STICK_RADIUS, -1, 1),
      magnitude: clamp(limitedDistance / STICK_RADIUS, 0, 1),
      active: true
    });
  }, [onChange]);

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    activePointerIdRef.current = event.pointerId;
    setIsDragging(true);
    event.currentTarget.setPointerCapture(event.pointerId);
    updateFromPointer(event.clientX, event.clientY);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (activePointerIdRef.current !== event.pointerId) return;
    event.preventDefault();
    event.stopPropagation();
    updateFromPointer(event.clientX, event.clientY);
  };

  const handlePointerEnd = (event: React.PointerEvent<HTMLDivElement>) => {
    if (activePointerIdRef.current !== event.pointerId) return;
    event.preventDefault();
    event.stopPropagation();
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    resetStick();
  };

  return (
    <div
      className="absolute bottom-6 left-1/2 -translate-x-1/2 select-none touch-none"
      style={{ zIndex: ANALOG_STICK_Z_INDEX }}
    >
      <div
        ref={stickRef}
        aria-label="Movement stick"
        className={`relative flex items-center justify-center rounded-full border shadow-2xl backdrop-blur-md ${
          isNight
            ? 'border-white/15 bg-slate-950/55 text-slate-200'
            : 'border-black/10 bg-white/65 text-slate-700'
        }`}
        style={{ width: STICK_DIAMETER, height: STICK_DIAMETER }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerEnd}
        onPointerCancel={handlePointerEnd}
        onLostPointerCapture={resetStick}
      >
        <div
          className={`absolute inset-3 rounded-full border ${
            isNight ? 'border-white/10 bg-white/5' : 'border-black/10 bg-black/5'
          }`}
        />
        <div
          className={`absolute rounded-full border shadow-lg ${
            isNight ? 'border-white/15 bg-white/20' : 'border-black/10 bg-white/90'
          }`}
          style={{
            width: THUMB_DIAMETER,
            height: THUMB_DIAMETER,
            transform: `translate(${thumbOffset.x}px, ${thumbOffset.y}px)`,
            transition: isDragging ? 'none' : 'transform 160ms cubic-bezier(0.22, 1, 0.36, 1)',
          }}
        />
        <div className="pointer-events-none absolute -top-5 left-1/2 -translate-x-1/2 rounded-full bg-black/65 px-2 py-1 text-[9px] font-black uppercase tracking-[0.24em] text-white">
          Move
        </div>
      </div>
    </div>
  );
};
