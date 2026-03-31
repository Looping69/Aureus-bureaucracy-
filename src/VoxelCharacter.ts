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
      shirt: 0xf5f5f0,
      pants: 0x2c3e50,
      hair: 0x3d2b1f,
      skin: 0xffdbac,
      shoes: 0x1a1110,
      belt: 0x5c3a1e,
    };

    this.group = new THREE.Group();
    this.innerGroup = new THREE.Group();
    this.group.add(this.innerGroup);

    this.body = this.createBody(colors);
    this.head = this.createHead(colors);
    this.leftArm = this.createArm(colors);
    this.rightArm = this.createArm(colors);
    this.leftLeg = this.createLeg(colors);
    this.rightLeg = this.createLeg(colors);

    // Position body parts
    this.leftLeg.position.set(-0.15, 0.3, 0);
    this.rightLeg.position.set(0.15, 0.3, 0);
    this.body.position.set(0, 1.0, 0);
    this.head.position.set(0, 1.65, 0);
    this.leftArm.position.set(-0.42, 1.3, 0);
    this.rightArm.position.set(0.42, 1.3, 0);

    // Pivot points for limb animation
    this.setupPivot(this.leftArm, 0, 0.3, 0);
    this.setupPivot(this.rightArm, 0, 0.3, 0);
    this.setupPivot(this.leftLeg, 0, 0.3, 0);
    this.setupPivot(this.rightLeg, 0, 0.3, 0);

    this.innerGroup.add(this.body, this.head, this.leftArm, this.rightArm, this.leftLeg, this.rightLeg);
  }

  private createBody(c: { shirt: number; belt: number }): THREE.Group {
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

    // Collar — two small angled flaps at the neckline
    const collarMat = new THREE.MeshStandardMaterial({ color: c.shirt });
    const collarL = new THREE.Mesh(new THREE.BoxGeometry(2 * s, 1.2 * s, 0.6 * s), collarMat);
    collarL.position.set(-1.2 * s, 4 * s, -1.8 * s);
    collarL.rotation.z = 0.25;
    group.add(collarL);
    const collarR = new THREE.Mesh(new THREE.BoxGeometry(2 * s, 1.2 * s, 0.6 * s), collarMat);
    collarR.position.set(1.2 * s, 4 * s, -1.8 * s);
    collarR.rotation.z = -0.25;
    group.add(collarR);

    // Tie running down the front
    const tieMat = new THREE.MeshStandardMaterial({ color: 0x8b1a1a });
    const tieKnot = new THREE.Mesh(new THREE.BoxGeometry(1.2 * s, 1 * s, 0.5 * s), tieMat);
    tieKnot.position.set(0, 3.5 * s, -2.1 * s);
    group.add(tieKnot);
    const tieBody = new THREE.Mesh(new THREE.BoxGeometry(1 * s, 4 * s, 0.4 * s), tieMat);
    tieBody.position.set(0, 1 * s, -2.1 * s);
    group.add(tieBody);
    const tieTip = new THREE.Mesh(new THREE.BoxGeometry(1.4 * s, 1.2 * s, 0.4 * s), tieMat);
    tieTip.position.set(0, -1.2 * s, -2.1 * s);
    group.add(tieTip);

    // Belt strip at waist
    const belt = new THREE.Mesh(
      new THREE.BoxGeometry(6.1 * s, 1.2 * s, 4.1 * s),
      new THREE.MeshStandardMaterial({ color: c.belt })
    );
    belt.position.y = -3 * s;
    belt.castShadow = true;
    group.add(belt);

    // Belt buckle (small metallic square)
    const buckle = new THREE.Mesh(
      new THREE.BoxGeometry(1.4 * s, 1.4 * s, 0.4 * s),
      new THREE.MeshStandardMaterial({ color: 0xcda44a, metalness: 0.6, roughness: 0.3 })
    );
    buckle.position.set(0, -3 * s, -2.2 * s);
    group.add(buckle);

    // Breast pocket on right side
    const pocketMat = new THREE.MeshStandardMaterial({ color: c.shirt });
    const pocket = new THREE.Mesh(new THREE.BoxGeometry(1.4 * s, 1.4 * s, 0.2 * s), pocketMat);
    pocket.position.set(1.8 * s, 2 * s, -2.05 * s);
    group.add(pocket);
    // Pocket pen accent
    const pen = new THREE.Mesh(
      new THREE.BoxGeometry(0.3 * s, 0.8 * s, 0.3 * s),
      new THREE.MeshStandardMaterial({ color: 0x222288 })
    );
    pen.position.set(2.2 * s, 2.8 * s, -2.1 * s);
    group.add(pen);

    return group;
  }

  private createHead(c: { skin: number; hair: number }): THREE.Group {
    const group = new THREE.Group();
    const s = this.subVoxelSize;

    // Skin head — slightly wider and taller for better proportions
    const head = new THREE.Mesh(
      new THREE.BoxGeometry(4.4 * s, 4.6 * s, 4.2 * s),
      new THREE.MeshStandardMaterial({ color: c.skin })
    );
    head.castShadow = true;
    head.receiveShadow = true;
    group.add(head);

    // Ears
    const earMat = new THREE.MeshStandardMaterial({ color: c.skin });
    const earGeo = new THREE.BoxGeometry(0.5 * s, 1.2 * s, 1 * s);
    const leftEar = new THREE.Mesh(earGeo, earMat);
    leftEar.position.set(-2.4 * s, 0, 0);
    group.add(leftEar);
    const rightEar = new THREE.Mesh(earGeo, earMat);
    rightEar.position.set(2.4 * s, 0, 0);
    group.add(rightEar);

    // Hair — neat side-parted professional style
    const hairMat = new THREE.MeshStandardMaterial({ color: c.hair });
    // Top of hair
    const hairTop = new THREE.Mesh(
      new THREE.BoxGeometry(4.6 * s, 1 * s, 4.4 * s),
      hairMat
    );
    hairTop.position.y = 2.4 * s;
    hairTop.castShadow = true;
    group.add(hairTop);
    // Side-part fringe on front-left
    const fringe = new THREE.Mesh(
      new THREE.BoxGeometry(2 * s, 0.8 * s, 0.8 * s),
      hairMat
    );
    fringe.position.set(-1 * s, 2 * s, -2 * s);
    group.add(fringe);
    // Back of hair
    const hairBack = new THREE.Mesh(
      new THREE.BoxGeometry(4.6 * s, 2.5 * s, 1 * s),
      hairMat
    );
    hairBack.position.set(0, 1 * s, 2 * s);
    group.add(hairBack);
    // Hair sides
    const hairSideL = new THREE.Mesh(
      new THREE.BoxGeometry(0.6 * s, 2 * s, 3 * s),
      hairMat
    );
    hairSideL.position.set(-2.2 * s, 1.4 * s, 0.5 * s);
    group.add(hairSideL);
    const hairSideR = new THREE.Mesh(
      new THREE.BoxGeometry(0.6 * s, 2 * s, 3 * s),
      hairMat
    );
    hairSideR.position.set(2.2 * s, 1.4 * s, 0.5 * s);
    group.add(hairSideR);

    // Eyebrows
    const browMat = new THREE.MeshStandardMaterial({ color: c.hair });
    const browGeo = new THREE.BoxGeometry(1.2 * s, 0.4 * s, 0.3 * s);
    const leftBrow = new THREE.Mesh(browGeo, browMat);
    leftBrow.position.set(-0.8 * s, 1.2 * s, -2.15 * s);
    group.add(leftBrow);
    const rightBrow = new THREE.Mesh(browGeo, browMat);
    rightBrow.position.set(0.8 * s, 1.2 * s, -2.15 * s);
    group.add(rightBrow);

    // Eyes — white sclera with dark pupils
    const scleraMat = new THREE.MeshStandardMaterial({ color: 0xffffff });
    const scleraGeo = new THREE.BoxGeometry(1.2 * s, 0.9 * s, 0.2 * s);
    const leftSclera = new THREE.Mesh(scleraGeo, scleraMat);
    leftSclera.position.set(-0.8 * s, 0.5 * s, -2.15 * s);
    group.add(leftSclera);
    const rightSclera = new THREE.Mesh(scleraGeo, scleraMat);
    rightSclera.position.set(0.8 * s, 0.5 * s, -2.15 * s);
    group.add(rightSclera);
    const pupilMat = new THREE.MeshStandardMaterial({ color: 0x1a1a2e });
    const pupilGeo = new THREE.BoxGeometry(0.6 * s, 0.6 * s, 0.25 * s);
    const leftPupil = new THREE.Mesh(pupilGeo, pupilMat);
    leftPupil.position.set(-0.8 * s, 0.5 * s, -2.25 * s);
    group.add(leftPupil);
    const rightPupil = new THREE.Mesh(pupilGeo, pupilMat);
    rightPupil.position.set(0.8 * s, 0.5 * s, -2.25 * s);
    group.add(rightPupil);

    // Glasses — thin rectangular frames
    const glassMat = new THREE.MeshStandardMaterial({ color: 0x333333 });
    // Left lens frame
    const frameLGeo = new THREE.BoxGeometry(1.6 * s, 1.2 * s, 0.15 * s);
    const frameL = new THREE.Mesh(frameLGeo, glassMat);
    frameL.position.set(-0.8 * s, 0.5 * s, -2.3 * s);
    group.add(frameL);
    // Right lens frame
    const frameR = new THREE.Mesh(frameLGeo, glassMat);
    frameR.position.set(0.8 * s, 0.5 * s, -2.3 * s);
    group.add(frameR);
    // Bridge between lenses
    const bridge = new THREE.Mesh(
      new THREE.BoxGeometry(0.6 * s, 0.2 * s, 0.15 * s),
      glassMat
    );
    bridge.position.set(0, 0.7 * s, -2.3 * s);
    group.add(bridge);
    // Lens tint (semi-transparent)
    const lensMat = new THREE.MeshStandardMaterial({ color: 0xccddee, transparent: true, opacity: 0.3 });
    const lensGeo = new THREE.BoxGeometry(1.2 * s, 0.8 * s, 0.08 * s);
    const lensL = new THREE.Mesh(lensGeo, lensMat);
    lensL.position.set(-0.8 * s, 0.5 * s, -2.32 * s);
    group.add(lensL);
    const lensR = new THREE.Mesh(lensGeo, lensMat);
    lensR.position.set(0.8 * s, 0.5 * s, -2.32 * s);
    group.add(lensR);

    // Nose — small bump
    const nose = new THREE.Mesh(
      new THREE.BoxGeometry(0.6 * s, 0.6 * s, 0.5 * s),
      new THREE.MeshStandardMaterial({ color: c.skin })
    );
    nose.position.set(0, -0.2 * s, -2.3 * s);
    group.add(nose);

    // Mouth — thin line
    const mouth = new THREE.Mesh(
      new THREE.BoxGeometry(1 * s, 0.3 * s, 0.2 * s),
      new THREE.MeshStandardMaterial({ color: 0xcc8866 })
    );
    mouth.position.set(0, -1 * s, -2.15 * s);
    group.add(mouth);

    return group;
  }

  private createArm(c: { shirt: number; skin: number }): THREE.Group {
    const group = new THREE.Group();
    const s = this.subVoxelSize;

    // Upper arm (shirt sleeve)
    const upper = new THREE.Mesh(
      new THREE.BoxGeometry(2.2 * s, 4 * s, 2.2 * s),
      new THREE.MeshStandardMaterial({ color: c.shirt })
    );
    upper.position.y = 0;
    upper.castShadow = true;
    upper.receiveShadow = true;
    group.add(upper);

    // Cuff at the wrist
    const cuff = new THREE.Mesh(
      new THREE.BoxGeometry(2.3 * s, 0.6 * s, 2.3 * s),
      new THREE.MeshStandardMaterial({ color: c.shirt })
    );
    cuff.position.y = -2.2 * s;
    group.add(cuff);

    // Hand (skin color)
    const hand = new THREE.Mesh(
      new THREE.BoxGeometry(1.8 * s, 1.8 * s, 1.8 * s),
      new THREE.MeshStandardMaterial({ color: c.skin })
    );
    hand.position.y = -3.2 * s;
    hand.castShadow = true;
    group.add(hand);

    return group;
  }

  private createLeg(c: { pants: number; shoes: number }): THREE.Group {
    const group = new THREE.Group();
    const s = this.subVoxelSize;

    // Upper leg (pants)
    const upper = new THREE.Mesh(
      new THREE.BoxGeometry(2.4 * s, 4.5 * s, 2.4 * s),
      new THREE.MeshStandardMaterial({ color: c.pants })
    );
    upper.position.y = 0;
    upper.castShadow = true;
    upper.receiveShadow = true;
    group.add(upper);

    // Shoe — polished dress shoe with slight front extension
    const shoe = new THREE.Mesh(
      new THREE.BoxGeometry(2.4 * s, 1.4 * s, 3 * s),
      new THREE.MeshStandardMaterial({ color: c.shoes, metalness: 0.15, roughness: 0.5 })
    );
    shoe.position.set(0, -3 * s, -0.3 * s);
    shoe.castShadow = true;
    group.add(shoe);

    // Shoe sole accent
    const sole = new THREE.Mesh(
      new THREE.BoxGeometry(2.5 * s, 0.3 * s, 3.1 * s),
      new THREE.MeshStandardMaterial({ color: 0x111111 })
    );
    sole.position.set(0, -3.7 * s, -0.3 * s);
    group.add(sole);

    return group;
  }

  private setupPivot(group: THREE.Group, x: number, y: number, z: number) {
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
    this.animationTime = 0;

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

      case CharacterState.WALKING: {
        const walkSpeed = 10;
        const angle = Math.sin(this.animationTime * walkSpeed) * 0.5;

        this.leftLeg.rotation.x = angle;
        this.rightLeg.rotation.x = -angle;

        this.leftArm.rotation.x = -angle;
        this.rightArm.rotation.x = angle;

        // Slight bobbing
        this.innerGroup.position.y = Math.abs(Math.cos(this.animationTime * walkSpeed * 2)) * 0.05;
        break;
      }

      case CharacterState.JUMPING: {
        const jumpDuration = 0.5;
        if (this.animationTime < jumpDuration) {
          const progress = this.animationTime / jumpDuration;
          this.innerGroup.position.y = 4 * 0.5 * progress * (1 - progress);

          this.leftArm.rotation.x = Math.PI / 4;
          this.rightArm.rotation.x = Math.PI / 4;
        } else {
          this.setState(CharacterState.IDLE);
        }
        break;
      }
    }
  }
}
