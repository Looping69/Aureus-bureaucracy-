import * as THREE from 'three';

export enum CharacterState {
  IDLE,
  WALKING,
  JUMPING,
  WORKING,
}

type CharacterPalette = {
  shirt: number;
  pants: number;
  hair: number;
  skin: number;
  shoes: number;
  belt: number;
};

export class VoxelCharacter {
  public group: THREE.Group;
  private innerGroup: THREE.Group;
  private body: THREE.Group;
  private head: THREE.Group;
  private leftArm: THREE.Group;
  private rightArm: THREE.Group;
  private leftLeg: THREE.Group;
  private rightLeg: THREE.Group;
  private pickaxe: THREE.Group;

  private subVoxelSize = 0.1;
  private animationTime = 0;
  private currentState: CharacterState = CharacterState.IDLE;

  private carryStack: THREE.Group;
  private carriedBlocks: THREE.Mesh[] = [];
  private _carriedCount = 0;

  public static readonly MAX_CARRY = 20;
  private static readonly CARRY_BLOCK_SPACING = 0.3;

  constructor(palette?: CharacterPalette) {
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

    this.leftLeg = this.createLeg(colors);
    this.rightLeg = this.createLeg(colors);
    this.body = this.createBody(colors);
    this.head = this.createHead(colors);
    this.leftArm = this.createArm(colors);
    this.rightArm = this.createArm(colors);
    this.pickaxe = this.createPickaxe();

    this.leftLeg.position.set(-0.16, 0.92, 0);
    this.rightLeg.position.set(0.16, 0.92, 0);
    this.body.position.set(0, 1.18, 0);
    this.head.position.set(0, 1.72, -0.02);
    this.leftArm.position.set(-0.42, 1.42, 0);
    this.rightArm.position.set(0.42, 1.42, 0);

    this.pickaxe.position.set(0.03, -0.58, -0.1);
    this.pickaxe.rotation.z = -0.45;
    this.pickaxe.visible = false;
    this.rightArm.add(this.pickaxe);

    this.carryStack = new THREE.Group();
    this.carryStack.position.set(0, 0.82, 0.34);
    this.innerGroup.add(this.carryStack);

    this.innerGroup.add(this.leftLeg, this.rightLeg, this.body, this.head, this.leftArm, this.rightArm);
  }

  private box(width: number, height: number, depth: number, color: number, options: Partial<THREE.MeshStandardMaterialParameters> = {}) {
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(width, height, depth),
      new THREE.MeshStandardMaterial({ color, roughness: 0.75, metalness: 0.05, ...options })
    );
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
  }

  private createBody(c: CharacterPalette): THREE.Group {
    const group = new THREE.Group();
    group.add(this.box(0.6, 0.7, 0.4, c.shirt));

    const belt = this.box(0.62, 0.1, 0.42, c.belt);
    belt.position.y = -0.26;
    group.add(belt);

    const tie = this.box(0.1, 0.42, 0.04, 0x8b1a1a);
    tie.position.set(0, 0.02, -0.22);
    group.add(tie);

    const buckle = this.box(0.14, 0.12, 0.04, 0xcda44a, { metalness: 0.55, roughness: 0.3 });
    buckle.position.set(0, -0.26, -0.24);
    group.add(buckle);

    return group;
  }

  private createHead(c: CharacterPalette): THREE.Group {
    const group = new THREE.Group();
    group.add(this.box(0.44, 0.46, 0.42, c.skin));

    const hairTop = this.box(0.48, 0.1, 0.44, c.hair);
    hairTop.position.y = 0.25;
    group.add(hairTop);

    const hairBack = this.box(0.48, 0.25, 0.1, c.hair);
    hairBack.position.set(0, 0.1, 0.22);
    group.add(hairBack);

    const brow = this.box(0.34, 0.04, 0.03, c.hair);
    brow.position.set(0, 0.08, -0.23);
    group.add(brow);

    const glasses = this.box(0.38, 0.12, 0.025, 0x333333);
    glasses.position.set(0, 0, -0.24);
    group.add(glasses);

    const mouth = this.box(0.12, 0.03, 0.025, 0xcc8866);
    mouth.position.set(0, -0.12, -0.24);
    group.add(mouth);

    return group;
  }

  private createArm(c: CharacterPalette): THREE.Group {
    const group = new THREE.Group();

    const sleeve = this.box(0.22, 0.42, 0.22, c.shirt);
    sleeve.position.y = -0.22;
    group.add(sleeve);

    const hand = this.box(0.18, 0.18, 0.18, c.skin);
    hand.position.y = -0.52;
    group.add(hand);

    return group;
  }

  private createLeg(c: CharacterPalette): THREE.Group {
    const group = new THREE.Group();

    const leg = this.box(0.24, 0.48, 0.24, c.pants);
    leg.position.y = -0.24;
    group.add(leg);

    const shoe = this.box(0.25, 0.12, 0.32, c.shoes, { metalness: 0.12, roughness: 0.48 });
    shoe.position.set(0, -0.54, -0.04);
    group.add(shoe);

    return group;
  }

  private createPickaxe(): THREE.Group {
    const group = new THREE.Group();

    const handle = this.box(0.055, 0.72, 0.055, 0x6b4226, { roughness: 0.9 });
    handle.position.y = -0.08;
    group.add(handle);

    const head = this.box(0.56, 0.09, 0.1, 0x9ca3af, { metalness: 0.55, roughness: 0.36 });
    head.position.y = 0.28;
    group.add(head);

    const leftTip = this.box(0.16, 0.08, 0.08, 0xd1d5db, { metalness: 0.65, roughness: 0.28 });
    leftTip.position.set(-0.33, 0.28, 0);
    leftTip.rotation.z = 0.35;
    group.add(leftTip);

    const rightTip = this.box(0.16, 0.08, 0.08, 0xd1d5db, { metalness: 0.65, roughness: 0.28 });
    rightTip.position.set(0.33, 0.28, 0);
    rightTip.rotation.z = -0.35;
    group.add(rightTip);

    return group;
  }

  public setMoving(moving: boolean) {
    if (this.currentState === CharacterState.WORKING) return;

    if (moving && this.currentState !== CharacterState.WALKING) {
      this.setState(CharacterState.WALKING);
    } else if (!moving && this.currentState !== CharacterState.IDLE && this.currentState !== CharacterState.JUMPING) {
      this.setState(CharacterState.IDLE);
    }
  }

  public setWorking(working: boolean) {
    if (working && this.currentState !== CharacterState.WORKING) {
      this.setState(CharacterState.WORKING);
    } else if (!working && this.currentState === CharacterState.WORKING) {
      this.setState(CharacterState.IDLE);
    }
  }

  public setCarriedAmount(count: number) {
    const n = Math.max(0, Math.min(VoxelCharacter.MAX_CARRY, Math.floor(count)));
    if (n === this._carriedCount) return;

    while (this.carriedBlocks.length > n) {
      const block = this.carriedBlocks.pop()!;
      this.carryStack.remove(block);
      block.geometry.dispose();
      (block.material as THREE.MeshStandardMaterial).dispose();
    }

    const oreColors = [0xc87941, 0xe0a840, 0xb07030, 0x6f4e37];
    while (this.carriedBlocks.length < n) {
      const i = this.carriedBlocks.length;
      const block = this.box(0.42, 0.25, 0.36, oreColors[i % oreColors.length], {
        metalness: 0.32,
        roughness: 0.62,
      });
      block.position.set(i % 2 === 0 ? -0.03 : 0.03, i * VoxelCharacter.CARRY_BLOCK_SPACING, 0);
      block.rotation.y = i * 0.36;
      block.rotation.z = (i % 3 - 1) * 0.035;
      this.carryStack.add(block);
      this.carriedBlocks.push(block);
    }

    this._carriedCount = n;
  }

  public getCarriedCount(): number {
    return this._carriedCount;
  }

  public removeOneCarried(): boolean {
    if (this._carriedCount <= 0) return false;
    this.setCarriedAmount(this._carriedCount - 1);
    return true;
  }

  public setState(newState: CharacterState) {
    if (this.currentState === newState) return;
    this.currentState = newState;
    this.animationTime = 0;
    this.pickaxe.visible = newState === CharacterState.WORKING;

    if (newState === CharacterState.IDLE) {
      this.leftLeg.rotation.x = 0;
      this.rightLeg.rotation.x = 0;
      this.leftArm.rotation.x = 0;
      this.rightArm.rotation.x = 0;
      this.innerGroup.position.y = 0;
      this.innerGroup.rotation.x = 0;
    }
  }

  public update(deltaTime: number) {
    this.animationTime += deltaTime;

    switch (this.currentState) {
      case CharacterState.IDLE:
        this.innerGroup.position.y = Math.sin(this.animationTime * 2) * 0.02;
        this.innerGroup.rotation.x = 0;
        this.leftArm.rotation.x = Math.sin(this.animationTime * 2) * 0.05;
        this.rightArm.rotation.x = -Math.sin(this.animationTime * 2) * 0.05;
        break;

      case CharacterState.WALKING: {
        const walkSpeed = 10;
        const angle = Math.sin(this.animationTime * walkSpeed) * 0.5;
        this.innerGroup.rotation.x = 0;
        this.leftLeg.rotation.x = angle;
        this.rightLeg.rotation.x = -angle;
        this.leftArm.rotation.x = -angle;
        this.rightArm.rotation.x = angle;
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

      case CharacterState.WORKING: {
        const swingSpeed = 8.5;
        const phase = this.animationTime * swingSpeed;
        const windUp = Math.abs(Math.sin(phase));
        const strike = Math.max(0, Math.sin(phase + Math.PI * 0.35));

        this.rightArm.rotation.x = -1.95 + windUp * 1.25;
        this.rightArm.rotation.z = -0.28 + strike * 0.18;
        this.leftArm.rotation.x = -0.55 + Math.sin(phase * 0.5) * 0.18;
        this.leftArm.rotation.z = 0.18;
        this.leftLeg.rotation.x = 0.08;
        this.rightLeg.rotation.x = -0.08;
        this.innerGroup.rotation.x = -0.08 - strike * 0.04;
        this.innerGroup.position.y = -strike * 0.06;
        break;
      }
    }
  }
}
