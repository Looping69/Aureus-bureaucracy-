import { useEffect } from 'react';
import { VoxelEngine } from '../VoxelEngine';

export const useCameraControls = (engineRef: React.MutableRefObject<VoxelEngine | null>) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const moveSpeed = 2;
      if (engineRef.current) {
        if (e.key === 'w' || e.key === 'ArrowUp') engineRef.current.moveCamera(0, -moveSpeed);
        if (e.key === 's' || e.key === 'ArrowDown') engineRef.current.moveCamera(0, moveSpeed);
        if (e.key === 'a' || e.key === 'ArrowLeft') engineRef.current.moveCamera(-moveSpeed, 0);
        if (e.key === 'd' || e.key === 'ArrowRight') engineRef.current.moveCamera(moveSpeed, 0);
        
        // Zoom controls
        if (e.key === '+' || e.key === '=') engineRef.current.zoomCamera(1);
        if (e.key === '-' || e.key === '_') engineRef.current.zoomCamera(-1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [engineRef]);
};
