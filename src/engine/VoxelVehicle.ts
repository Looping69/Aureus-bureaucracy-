import * as THREE from 'three';

export class VoxelVehicle {
  public group: THREE.Group;
  private pulseLight: THREE.PointLight;

  constructor(primaryColor: number = 0xffffff, accentColor: number = 0xe11d48) {
    this.group = new THREE.Group();

    const chassis = new THREE.Mesh(
      new THREE.BoxGeometry(2.4, 0.75, 4.4),
      new THREE.MeshStandardMaterial({ color: primaryColor, roughness: 0.8, metalness: 0.15 }),
    );
    chassis.position.y = 0.8;
    chassis.castShadow = true;
    this.group.add(chassis);

    const cabin = new THREE.Mesh(
      new THREE.BoxGeometry(2.1, 0.8, 1.9),
      new THREE.MeshStandardMaterial({ color: 0xdbeafe, roughness: 0.35, metalness: 0.2 }),
    );
    cabin.position.set(0, 1.35, -0.2);
    cabin.castShadow = true;
    this.group.add(cabin);

    const stripe = new THREE.Mesh(
      new THREE.BoxGeometry(2.45, 0.24, 1.2),
      new THREE.MeshStandardMaterial({ color: accentColor, roughness: 0.5 }),
    );
    stripe.position.set(0, 0.95, 0.7);
    this.group.add(stripe);

    const lightBar = new THREE.Mesh(
      new THREE.BoxGeometry(1.6, 0.18, 0.4),
      new THREE.MeshStandardMaterial({ color: 0x93c5fd, emissive: 0x60a5fa, emissiveIntensity: 1.4 }),
    );
    lightBar.position.set(0, 1.88, -0.2);
    this.group.add(lightBar);

    const wheelGeometry = new THREE.CylinderGeometry(0.36, 0.36, 0.32, 12);
    const wheelMaterial = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.95 });
    const wheelOffsets = [
      [-1.05, 0.36, -1.45],
      [1.05, 0.36, -1.45],
      [-1.05, 0.36, 1.45],
      [1.05, 0.36, 1.45],
    ];

    wheelOffsets.forEach(([x, y, z]) => {
      const wheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(x, y, z);
      wheel.castShadow = true;
      this.group.add(wheel);
    });

    this.pulseLight = new THREE.PointLight(0x60a5fa, 0.8, 12, 2);
    this.pulseLight.position.set(0, 2.1, -0.2);
    this.group.add(this.pulseLight);
  }

  public setPosition(x: number, y: number, z: number) {
    this.group.position.set(x, y, z);
  }

  public setRotation(y: number) {
    this.group.rotation.y = y;
  }

  public update(deltaTime: number, active: boolean) {
    if (!active) {
      this.pulseLight.intensity = 0.35;
      return;
    }

    const pulse = 0.55 + Math.abs(Math.sin(Date.now() * 0.01 + deltaTime * 4)) * 0.7;
    this.pulseLight.intensity = pulse;
  }
}
