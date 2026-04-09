/**
 * @module BuildingMesh
 * React-Three-Fiber component that renders a single building's voxel mesh
 * using GreedyMesher geometry within a Three.js scene graph.
 */
import React, { useMemo, useRef, useEffect } from 'react';
import * as THREE from 'three';

interface BuildingVoxel {
  id: number;
  x: number;
  y: number;
  z: number;
  c: string;
}

export const BuildingMesh = ({ voxels, position, opacity = 1 }: { voxels: BuildingVoxel[], position: [number, number, number], opacity?: number }) => {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const color = new THREE.Color();
  const matrix = new THREE.Matrix4();

  useEffect(() => {
    if (meshRef.current) {
      voxels.forEach((v, i) => {
        // Generator uses Z for height, but Three.js uses Y
        matrix.setPosition(v.x, v.z, v.y);
        meshRef.current!.setMatrixAt(i, matrix);
        color.set(v.c);
        meshRef.current!.setColorAt(i, color);
      });
      meshRef.current.instanceMatrix.needsUpdate = true;
      if (meshRef.current.instanceColor) {
        meshRef.current.instanceColor.needsUpdate = true;
      }
      meshRef.current.computeBoundingSphere();
    }
  }, [voxels]);

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, voxels.length]} position={position} frustumCulled={true} raycast={() => null}>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial roughness={0.8} metalness={0.2} transparent={opacity < 1} opacity={opacity} />
    </instancedMesh>
  );
};

