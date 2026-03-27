import { useEffect, useState } from 'react';

export const useFps = (sampleWindowMs: number = 1000) => {
  const [fps, setFps] = useState(0);

  useEffect(() => {
    let frameCount = 0;
    let start = performance.now();
    let rafId = 0;

    const loop = (now: number) => {
      frameCount += 1;
      const elapsed = now - start;
      if (elapsed >= sampleWindowMs) {
        const nextFps = Math.round((frameCount * 1000) / elapsed);
        setFps(nextFps);
        frameCount = 0;
        start = now;
      }
      rafId = requestAnimationFrame(loop);
    };

    rafId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafId);
  }, [sampleWindowMs]);

  return fps;
};

