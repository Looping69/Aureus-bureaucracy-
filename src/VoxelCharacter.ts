import * as THREE from 'three';

export enum CharacterState {
  IDLE,
  WALKING,
  JUMPING
}

export class VoxelCharacter {
  public group: THREE.Group;
  private innerGroup: THREE.Group;
  private body: THREE.Group;
  private head: THREE.Group;
  private leftArm: THREE.Group;
  private rightArm: THREE.Group;
  private leftLeg: THREE.Group;
  private rightLeg: THREE.Group;

  private subVoxelSize = 0.1;
  private animationTime = 0;
  private currentState: CharacterState = CharacterState.IDLE;

  constructor() {
    this.group = new THREE.Group();
    this.innerGroup = new THREE.Group();
    this.group.add(this.innerGroup);

    // Create parts
    this.body = this.createPart(6, 8, 4, 0x3b82f6); // Blue shirt
    this.head = this.createPart(4, 4, 4, 0xffdbac); // Skin tone
    this.leftArm = this.createPart(2, 6, 2, 0x3b82f6);
    this.rightArm = this.createPart(2, 6, 2, 0x3b82f6);
    this.leftLeg = this.createPart(2, 6, 2, 0x1e3a8a); // Dark blue pants
    this.rightLeg = this.createPart(2, 6, 2, 0x1e3a8a);

    // Position parts
    // Legs
    this.leftLeg.position.set(-0.15, 0.3, 0);
    this.rightLeg.position.set(0.15, 0.3, 0);
    
    // Body
    this.body.position.set(0, 1.0, 0);
    
    // Head
    this.head.position.set(0, 1.6, 0);
    
    // Arms
    this.leftArm.position.set(-0.4, 1.3, 0);
    this.rightArm.position.set(0.4, 1.3, 0);

    // Pivot points for animation
    this.setupPivot(this.leftArm, 0, 0.3, 0);
    this.setupPivot(this.rightArm, 0, 0.3, 0);
    this.setupPivot(this.leftLeg, 0, 0.3, 0);
    this.setupPivot(this.rightLeg, 0, 0.3, 0);

    this.innerGroup.add(this.body, this.head, this.leftArm, this.rightArm, this.leftLeg, this.rightLeg);
  }

  private createPart(w: number, h: number, d: number, color: number): THREE.Group {
    const group = new THREE.Group();
    
    // Since parts are solid blocks of a single color, we can just use a single BoxGeometry
    // instead of creating hundreds of individual voxel meshes.
    const geometry = new THREE.BoxGeometry(w * this.subVoxelSize, h * this.subVoxelSize, d * this.subVoxelSize);
    const material = new THREE.MeshStandardMaterial({ color });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);

    return group;
  }

  private setupPivot(group: THREE.Group, x: number, y: number, z: number) {
    // Adjust children so they rotate around the top/pivot point
    group.children.forEach(child => {
      child.position.y -= y;
    });
    group.position.y += y;
  }

  public setMoving(moving: boolean) {
    if (moving && this.currentState !== CharacterState.WALKING) {
      this.setState(CharacterState.WALKING);
    } else if (!moving && this.currentState !== CharacterState.IDLE) {
      this.setState(CharacterState.IDLE);
    }
  }

  public setState(newState: CharacterState) {
    if (this.currentState === newState) return;
    this.currentState = newState;
    this.animationTime = 0; // Reset animation time on state change

    // Reset poses when entering idle
    if (newState === CharacterState.IDLE) {
      this.leftLeg.rotation.x = 0;
      this.rightLeg.rotation.x = 0;
      this.leftArm.rotation.x = 0;
      this.rightArm.rotation.x = 0;
      this.innerGroup.position.y = 0;
    }
  }

  public update(deltaTime: number) {
    this.animationTime += deltaTime;

    switch (this.currentState) {
      case CharacterState.IDLE:
        // Subtle breathing animation
        this.innerGroup.position.y = Math.sin(this.animationTime * 2) * 0.02;
        this.leftArm.rotation.x = Math.sin(this.animationTime * 2) * 0.05;
        this.rightArm.rotation.x = -Math.sin(this.animationTime * 2) * 0.05;
        break;

      case CharacterState.WALKING:
        const walkSpeed = 10;
        const angle = Math.sin(this.animationTime * walkSpeed) * 0.5;

        this.leftLeg.rotation.x = angle;
        this.rightLeg.rotation.x = -angle;
        
        this.leftArm.rotation.x = -angle;
        this.rightArm.rotation.x = angle;
        
        // Slight bobbing
        this.innerGroup.position.y = Math.abs(Math.cos(this.animationTime * walkSpeed * 2)) * 0.05;
        break;

      case CharacterState.JUMPING:
        // Simple jump arc
        const jumpDuration = 0.5;
        if (this.animationTime < jumpDuration) {
          const progress = this.animationTime / jumpDuration;
          // Parabola: 4 * h * p * (1 - p)
          this.innerGroup.position.y = 4 * 0.5 * progress * (1 - progress);
          
          // Arms up
          this.leftArm.rotation.x = Math.PI / 4;
          this.rightArm.rotation.x = Math.PI / 4;
        } else {
          this.setState(CharacterState.IDLE);
        }
        break;
    }
  }
}
