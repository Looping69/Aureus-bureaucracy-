import * as THREE from 'three';

export function configureWorldRenderer(renderer: THREE.WebGLRenderer) {
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
}
