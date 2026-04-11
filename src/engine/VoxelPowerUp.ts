import * as THREE from 'three';

export class VoxelPowerUp {
  public group: THREE.Group;
  private halo: THREE.Mesh;
  private core: THREE.Mesh;
  private spark: THREE.PointLight;
  private bobOffset: number;
  private spinSpeed: number;
  private baseY = 0;

  constructor(color: string, glowColor: string, bobOffset: number, spinSpeed: number) {
    this.group = new THREE.Group();
    this.bobOffset = bobOffset;
    this.spinSpeed = spinSpeed;

    this.core = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.45, 0),
      new THREE.MeshStandardMaterial({
        color,
        emissive: glowColor,
        emissiveIntensity: 0.7,
        roughness: 0.28,
        metalness: 0.1,
      }),
    );
    this.core.castShadow = true;
    this.group.add(this.core);

    this.halo = new THREE.Mesh(
      new THREE.TorusGeometry(0.72, 0.07, 10, 24),
      new THREE.MeshBasicMaterial({
        color: glowColor,
        transparent: true,
        opacity: 0.55,
      }),
    );
    this.halo.rotation.x = Math.PI / 2;
    this.group.add(this.halo);

    this.spark = new THREE.PointLight(new THREE.Color(glowColor).getHex(), 1.2, 7, 2);
    this.spark.position.y = 0.35;
    this.group.add(this.spark);
  }

  public setPosition(x: number, y: number, z: number) {
    this.baseY = y;
    this.group.position.set(x, y, z);
  }

  public update(elapsedSeconds: number) {
    const bob = Math.sin(elapsedSeconds * 2.4 + this.bobOffset) * 0.18;
    this.core.rotation.y += this.spinSpeed * 0.02;
    this.halo.rotation.z += this.spinSpeed * 0.012;
    this.group.position.y = this.baseY + bob;
    this.spark.intensity = 0.9 + Math.abs(Math.cos(elapsedSeconds * 3.3 + this.bobOffset)) * 0.7;
  }
}
