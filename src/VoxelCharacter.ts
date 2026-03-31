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

  constructor(palette?: { shirt: number; pants: number; hair: number; skin: number; shoes: number; belt: number }) {
    const colors = palette ?? {
      shirt: 0x3b82f6,
      pants: 0x1e3a8a,
      hair: 0x3d2b1f,
      skin: 0xffdbac,
      shoes: 0x2c2c2c,
      belt: 0x5c3a1e,
    };

    this.group = new THREE.Group();
    this.innerGroup = new THREE.Group();
    this.group.add(this.innerGroup);

    // --- Torso with belt detail ---
    this.body = this.createCompositeBody(colors);

    // --- Head with hair and face ---
    this.head = this.createDetailedHead(colors);

    // --- Arms: shirt-colored upper, skin forearms ---
    this.leftArm = this.createArm(colors);
    this.rightArm = this.createArm(colors);

    // --- Legs: pants upper, dark shoes at bottom ---
    this.leftLeg = this.createLeg(colors);
    this.rightLeg = this.createLeg(colors);

    // Position parts
    this.leftLeg.position.set(-0.15, 0.3, 0);
    this.rightLeg.position.set(0.15, 0.3, 0);
    this.body.position.set(0, 1.0, 0);
    this.head.position.set(0, 1.6, 0);
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
    const geometry = new THREE.BoxGeometry(w * this.subVoxelSize, h * this.subVoxelSize, d * this.subVoxelSize);
    const material = new THREE.MeshStandardMaterial({ color });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
    return group;
  }

  private createCompositeBody(c: { shirt: number; belt: number }): THREE.Group {
    const group = new THREE.Group();
    const s = this.subVoxelSize;
    // Main torso (shirt)
    const torso = new THREE.Mesh(
      new THREE.BoxGeometry(6 * s, 7 * s, 4 * s),
      new THREE.MeshStandardMaterial({ color: c.shirt })
    );
    torso.position.y = 0.5 * s;
    torso.castShadow = true;
    torso.receiveShadow = true;
    group.add(torso);

    // Belt strip at waist
    const belt = new THREE.Mesh(
      new THREE.BoxGeometry(6.1 * s, 1.2 * s, 4.1 * s),
      new THREE.MeshStandardMaterial({ color: c.belt })
    );
    belt.position.y = -3 * s;
    belt.castShadow = true;
    group.add(belt);

    // Belt buckle
    const buckle = new THREE.Mesh(
      new THREE.BoxGeometry(1.4 * s, 1.4 * s, 0.4 * s),
      new THREE.MeshStandardMaterial({ color: 0xb18b57 })
    );
    buckle.position.set(0, -3 * s, -2.2 * s);
    group.add(buckle);

    return group;
  }

  private createDetailedHead(c: { skin: number; hair: number }): THREE.Group {
    const group = new THREE.Group();
    const s = this.subVoxelSize;

    // Skin head
    const head = new THREE.Mesh(
      new THREE.BoxGeometry(4 * s, 4 * s, 4 * s),
      new THREE.MeshStandardMaterial({ color: c.skin })
    );
    head.castShadow = true;
    head.receiveShadow = true;
    group.add(head);

    // Hair on top and sides
    const hairTop = new THREE.Mesh(
      new THREE.BoxGeometry(4.2 * s, 1.2 * s, 4.2 * s),
      new THREE.MeshStandardMaterial({ color: c.hair })
    );
    hairTop.position.y = 2 * s;
    hairTop.castShadow = true;
    group.add(hairTop);

    const hairBack = new THREE.Mesh(
      new THREE.BoxGeometry(4.2 * s, 3 * s, 1 * s),
      new THREE.MeshStandardMaterial({ color: c.hair })
    );
    hairBack.position.set(0, 0.5 * s, 2 * s);
    group.add(hairBack);

    // Eyes
    const eyeMat = new THREE.MeshStandardMaterial({ color: 0x222222 });
    const eyeGeo = new THREE.BoxGeometry(0.8 * s, 0.8 * s, 0.3 * s);
    const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
    leftEye.position.set(-0.7 * s, 0.3 * s, -2.1 * s);
    group.add(leftEye);
    const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
    rightEye.position.set(0.7 * s, 0.3 * s, -2.1 * s);
    group.add(rightEye);

    return group;
  }

  private createArm(c: { shirt: number; skin: number }): THREE.Group {
    const group = new THREE.Group();
    const s = this.subVoxelSize;

    // Upper arm (shirt color)
    const upper = new THREE.Mesh(
      new THREE.BoxGeometry(2 * s, 4 * s, 2 * s),
      new THREE.MeshStandardMaterial({ color: c.shirt })
    );
    upper.position.y = 0;
    upper.castShadow = true;
    upper.receiveShadow = true;
    group.add(upper);

    // Forearm / hand (skin color)
    const hand = new THREE.Mesh(
      new THREE.BoxGeometry(2 * s, 2 * s, 2 * s),
      new THREE.MeshStandardMaterial({ color: c.skin })
    );
    hand.position.y = -3 * s;
    hand.castShadow = true;
    group.add(hand);

    return group;
  }

  private createLeg(c: { pants: number; shoes: number }): THREE.Group {
    const group = new THREE.Group();
    const s = this.subVoxelSize;

    // Upper leg (pants)
    const upper = new THREE.Mesh(
      new THREE.BoxGeometry(2 * s, 4.5 * s, 2 * s),
      new THREE.MeshStandardMaterial({ color: c.pants })
    );
    upper.position.y = 0;
    upper.castShadow = true;
    upper.receiveShadow = true;
    group.add(upper);

    // Shoe
    const shoe = new THREE.Mesh(
      new THREE.BoxGeometry(2.2 * s, 1.5 * s, 2.6 * s),
      new THREE.MeshStandardMaterial({ color: c.shoes })
    );
    shoe.position.set(0, -3 * s, -0.2 * s);
    shoe.castShadow = true;
    group.add(shoe);

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
