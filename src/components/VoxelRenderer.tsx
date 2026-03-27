/// <reference types="@react-three/fiber" />
import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';

interface Voxel {
  id: number;
  x: number;
  y: number;
  z: number;
  c: string;
}

export const VoxelRenderer = ({ voxels }: { voxels: Voxel[] }) => {
  const count = voxels.length;
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const tempObject = new THREE.Object3D();

  useEffect(() => {
    if (meshRef.current) {
      voxels.forEach((v, i) => {
        tempObject.position.set(v.x, v.z, v.y);
        tempObject.updateMatrix();
        meshRef.current!.setMatrixAt(i, tempObject.matrix);
        meshRef.current!.setColorAt(i, new THREE.Color(v.c));
      });
      meshRef.current.instanceMatrix.needsUpdate = true;
      if (meshRef.current.instanceColor) {
        meshRef.current.instanceColor.needsUpdate = true;
      }
    }
  }, [voxels, count]);

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count] as any}>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial />
    </instancedMesh>
  );
};
