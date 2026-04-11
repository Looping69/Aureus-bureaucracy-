/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

/**
 * @module VoxelEngine
 * Core Three.js rendering engine for Aureus.  Owns the WebGL renderer, scene
 * graph, physics world (cannon-es), RAF animation loop, entity manager, and all
 * player/camera control logic.
 *
 * Key subsystems:
 * - **World scene** – terrain voxels, buildings, sky dome, sun/moon, fog
 * - **Player movement** – path-based click-to-move and analog-stick direct movement
 * - **Camera** – locked isometric follow-cam (azimuth π/4, polar fixed)
 * - **Voxel editing** – brush/eraser/road tools with optional symmetry
 * - **Day/Night cycle** – light intensities and fog colour shift over a 0-24 float clock
 */

import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { AppState, SimulationVoxel, RebuildTarget, VoxelData, SymmetryMode, EditTool, WorldHoverInfo } from '../types';
import { CONFIG, COLORS, WORLD_HALF_SIZE, WORLD_SIZE } from '../utils/voxelConstants';
import { EntityManager } from './EntityManager';
import { GreedyMesher } from '../utils/GreedyMesher';
import { BuildingFootprint } from '../utils/worldNavigation';
import { resolveSubCell } from '../utils/subVoxel';
import {
  DAY_NIGHT,
  hoursToTicks,
  isDaytime as isDaytimeTick,
  getDaylightFactor,
  getCelestialPosition,
} from '../utils/dayNightCycle';
import backgroundData from '../../background.json';

// Locked isometric camera azimuth (45°) — kept constant to give a consistent city view
export const WORLD_CAMERA_AZIMUTH = Math.PI / 4;
// Camera offset from target: x=20, y=30, z=20 gives the isometric angle
const WORLD_CAMERA_OFFSET = new THREE.Vector3(20, 30, 20);
// Pre-computed distance for the OrbitControls polar/distance constraints
const WORLD_CAMERA_DISTANCE = WORLD_CAMERA_OFFSET.length();
// Pre-computed polar angle derived from WORLD_CAMERA_OFFSET.y
const WORLD_CAMERA_POLAR = Math.acos(WORLD_CAMERA_OFFSET.y / WORLD_CAMERA_DISTANCE);

/**
 * Singleton-style Three.js engine that owns the entire rendering pipeline for
 * one game scene.  Instantiate with a DOM container and callback functions;
 * call {@link VoxelEngine.buildWorldScene} to populate terrain and entities;
 * the RAF loop starts automatically in the constructor.
 *
 * Dispose by calling {@link VoxelEngine.cleanup} before unmounting the container.
 */
export class VoxelEngine {
  private static readonly FOG_NEAR_DAY = 120;    // Fog start distance during daytime (world units)
  private static readonly FOG_FAR_DAY = 280;     // Fog end distance during daytime
  private static readonly FOG_NEAR_NIGHT = 80;   // Fog compresses at night for atmosphere
  private static readonly FOG_FAR_NIGHT = 220;
  private static readonly ANALOG_MOVE_CONVERGE_THRESHOLD = 0.05; // Stop walking when XZ delta < 0.05 units
  private static readonly PLAYER_MOVE_SPEED = 12; // world units per second (XZ only)
  private static readonly CAMERA_FOLLOW_DAMPING_XZ = 22; // THREE.MathUtils.damp coefficient for XZ follow
  private static readonly CAMERA_FOLLOW_DAMPING_Y = 14;  // Slower Y damping prevents jarring vertical jumps
  // --- Scene & Renderer ---
  private container: HTMLElement;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private physicsWorld: CANNON.World;
  private instanceMesh: THREE.InstancedMesh | null = null;
  private terrainGroup: THREE.Group;
  private sun: THREE.Mesh;
  private moon: THREE.Mesh;
  private ambientLight: THREE.AmbientLight;
  private dirLight: THREE.DirectionalLight;
  private hemiLight: THREE.HemisphereLight;
  private targetIndicator: THREE.Mesh;
  private pathLine: THREE.Line;
  private skyDome: THREE.Mesh;
  private floor: THREE.Mesh;
  private edgeGroup: THREE.Group;
  private worldGrid: THREE.GridHelper;
  public entities: EntityManager;
  private dummy = new THREE.Object3D();
  
  // Interaction
  private raycaster = new THREE.Raycaster();
  private pointer = new THREE.Vector2();
  private ghostVoxel: THREE.Mesh;
  private ghostSymmetryVoxel: THREE.Mesh;
  private hoverSelector: THREE.Mesh;
  
  private voxels: SimulationVoxel[] = [];
  private currentVoxelData: VoxelData[] = [];
  private rebuildTargets: RebuildTarget[] = [];
  private rebuildStartTime: number = 0;
  
  // --- App State & Callbacks ---
  private state: AppState = AppState.STABLE;
  private onStateChange: (state: AppState) => void;
  private onCountChange: (count: number) => void;
  private onVoxelEdit?: (newData: VoxelData[]) => void;
  private onHoverPosition?: (pos: WorldHoverInfo | null) => void;
  private onSelect?: (target: WorldHoverInfo, tapCount: number) => void;
  
  private animationId: number = 0;
  private lastTime: number = 0;
  private boundPointerMove!: (e: PointerEvent) => void;
  private boundPointerDown!: (e: PointerEvent) => void;
  private boundPointerLeave!: () => void;
  
  // Edit State
  private isEditMode: boolean = false;
  private activeTool: EditTool = EditTool.BRUSH;
  private activeColor: number = COLORS.WHITE;
  private symmetryMode: SymmetryMode = SymmetryMode.NONE;
  private isWireframe: boolean = false;
  private time: number = 12;
  private targetPlayerPos = new THREE.Vector3(0, CONFIG.FLOOR_Y + 0.5, 0);
  private currentPlayerPos = new THREE.Vector3(0, CONFIG.FLOOR_Y + 0.5, 0);
  private targetCameraFocus = new THREE.Vector3(0, CONFIG.FLOOR_Y + 0.5, 0);
  private currentCameraFocus = new THREE.Vector3(0, CONFIG.FLOOR_Y + 0.5, 0);
  private targetRotationY: number = 0;
  private firstPositionSet: boolean = false;
  private requestedPlayerMoving: boolean = false;
  private sunOrbitOffset = new THREE.Vector3();
  private moonOrbitOffset = new THREE.Vector3();

  // --- Intro camera animation state ---
  private static readonly INTRO_CLOSE_DISTANCE = 8;            // Start zoomed in very close
  private static readonly INTRO_DURATION_MS = 3000;            // Total pull-back duration (slower & smoother)
  private introAnimationActive: boolean = false;
  private introStartTime: number = 0;

  // --- Constructor ---
  constructor(
    container: HTMLElement, 
    onStateChange: (state: AppState) => void,
    onCountChange: (count: number) => void,
    onVoxelEdit?: (newData: VoxelData[]) => void,
    onHoverPosition?: (pos: WorldHoverInfo | null) => void,
    onSelect?: (target: WorldHoverInfo, tapCount: number) => void
  ) {
    this.container = container;
    this.onStateChange = onStateChange;
    this.onCountChange = onCountChange;
    this.onVoxelEdit = onVoxelEdit;
    this.onHoverPosition = onHoverPosition;
    this.onSelect = onSelect;

    // Init Three.js
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.Fog(CONFIG.BG_COLOR, 120, 280);
    
    this.physicsWorld = new CANNON.World({
      gravity: new CANNON.Vec3(0, -9.82, 0),
    });

    this.terrainGroup = new THREE.Group();
    this.scene.add(this.terrainGroup);

    const width = this.container.clientWidth || window.innerWidth;
    const height = this.container.clientHeight || window.innerHeight;

    this.camera = new THREE.PerspectiveCamera(50, width / height, 0.5, 2000);
    this.camera.position.copy(WORLD_CAMERA_OFFSET);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setClearColor(0x000000, 0); // Transparent background
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(width, height);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.enablePan = false;
    this.controls.enableRotate = false;
    this.controls.autoRotate = false;
    this.controls.target.set(0, 0, 0);
    this.controls.minPolarAngle = WORLD_CAMERA_POLAR;
    this.controls.maxPolarAngle = WORLD_CAMERA_POLAR;
    this.controls.minAzimuthAngle = WORLD_CAMERA_AZIMUTH;
    this.controls.maxAzimuthAngle = WORLD_CAMERA_AZIMUTH;
    this.controls.minDistance = 10;
    this.controls.maxDistance = 100;
    this.controls.zoomSpeed = 1.2;
    this.controls.rotateSpeed = 0.6;
    this.controls.update();
    this.enforceCameraBounds();

    // Lights
    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.15);
    this.scene.add(this.ambientLight);

    this.hemiLight = new THREE.HemisphereLight(0x87CEEB, 0x3b82f6, 0.25);
    this.scene.add(this.hemiLight);
    
    this.dirLight = new THREE.DirectionalLight(0xffffff, 0);
    this.dirLight.position.set(50, 80, 30);
    this.dirLight.castShadow = true;
    this.dirLight.shadow.mapSize.width = 4096;
    this.dirLight.shadow.mapSize.height = 4096;
    this.dirLight.shadow.camera.left = -60;
    this.dirLight.shadow.camera.right = 60;
    this.dirLight.shadow.camera.top = 60;
    this.dirLight.shadow.camera.bottom = -60;
    this.dirLight.shadow.camera.near = 0.5;
    this.dirLight.shadow.camera.far = 300;
    this.dirLight.shadow.bias = -0.0003;
    this.dirLight.shadow.normalBias = 0.04;
    this.scene.add(this.dirLight);
    // Add target to scene so it can be repositioned to follow the player
    this.scene.add(this.dirLight.target);

    // Target Indicator
    const targetGeom = new THREE.RingGeometry(0.4, 0.5, 32);
    const targetMat = new THREE.MeshBasicMaterial({ color: 0x00ff00, transparent: true, opacity: 0.8, side: THREE.DoubleSide });
    this.targetIndicator = new THREE.Mesh(targetGeom, targetMat);
    this.targetIndicator.rotation.x = -Math.PI / 2;
    this.targetIndicator.visible = false;
    this.scene.add(this.targetIndicator);

    // Path Line
    const pathGeom = new THREE.BufferGeometry();
    const pathMat = new THREE.LineBasicMaterial({ color: 0x00ff00, transparent: true, opacity: 0.4 });
    this.pathLine = new THREE.Line(pathGeom, pathMat);
    this.pathLine.visible = false;
    this.scene.add(this.pathLine);

    // Sun & Moon
    const sunGeom = new THREE.SphereGeometry(4, 32, 32);
    const sunMat = new THREE.MeshBasicMaterial({ color: 0xffcc00 });
    this.sun = new THREE.Mesh(sunGeom, sunMat);
    this.scene.add(this.sun);

    const moonGeom = new THREE.SphereGeometry(3, 32, 32);
    const moonMat = new THREE.MeshBasicMaterial({ color: 0xdddddd });
    this.moon = new THREE.Mesh(moonGeom, moonMat);
    this.scene.add(this.moon);

    // Sky Dome
    const skyGeom = new THREE.SphereGeometry(900, 32, 32);
    const skyMat = new THREE.MeshBasicMaterial({ color: 0x87CEEB, side: THREE.BackSide });
    this.skyDome = new THREE.Mesh(skyGeom, skyMat);
    this.scene.add(this.skyDome);

    // Floor – use an unlit material that matches the fog colour so the plane
    // blends seamlessly with the background at every camera angle.
    const planeMat = new THREE.MeshBasicMaterial({ color: 0xe2e8f0 });
    this.floor = new THREE.Mesh(new THREE.PlaneGeometry(WORLD_SIZE * 4, WORLD_SIZE * 4), planeMat);
    this.floor.rotation.x = -Math.PI / 2;
    this.floor.position.y = CONFIG.FLOOR_Y - 3.01; // Just below terrain + edge buildings
    this.scene.add(this.floor);

    // Ground ring – covers the gap between the terrain edge and the edge
    // building ring so background buildings no longer appear to float.
    this.buildGroundRing();

    this.worldGrid = new THREE.GridHelper(
      WORLD_SIZE,
      WORLD_SIZE,
      0x94a3b8,
      0x64748b
    );
    this.worldGrid.position.set(-0.5, CONFIG.FLOOR_Y + 0.02, -0.5);
    this.worldGrid.visible = false;
    this.scene.add(this.worldGrid);

    // Edge decorations – place motifs from background.json around the world
    // boundary so that the edges of the playable area look like a distant
    // cityscape / industrial horizon fading into fog.
    this.edgeGroup = new THREE.Group();
    this.buildEdgeDecorations();
    this.scene.add(this.edgeGroup);

    const floorBody = new CANNON.Body({
      type: CANNON.Body.STATIC,
      shape: new CANNON.Plane(),
    });
    floorBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
    floorBody.position.set(0, CONFIG.FLOOR_Y - 3.51, 0);
    this.physicsWorld.addBody(floorBody);

    // Ghost Voxels
    const ghostGeom = new THREE.BoxGeometry(CONFIG.VOXEL_SIZE, CONFIG.VOXEL_SIZE, CONFIG.VOXEL_SIZE);
    const ghostMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.3 });
    this.ghostVoxel = new THREE.Mesh(ghostGeom, ghostMat);
    this.ghostVoxel.visible = false;
    this.scene.add(this.ghostVoxel);

    this.ghostSymmetryVoxel = new THREE.Mesh(ghostGeom, ghostMat.clone());
    this.ghostSymmetryVoxel.visible = false;
    this.scene.add(this.ghostSymmetryVoxel);

    const hoverSelectorGeometry = new THREE.PlaneGeometry(0.9, 0.9);
    const hoverSelectorMaterial = new THREE.MeshBasicMaterial({
      color: 0x60a5fa,
      transparent: true,
      opacity: 0.35,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    this.hoverSelector = new THREE.Mesh(hoverSelectorGeometry, hoverSelectorMaterial);
    this.hoverSelector.rotation.x = -Math.PI / 2;
    this.hoverSelector.visible = false;
    this.scene.add(this.hoverSelector);

    // Entities (Player, Buildings, etc)
    this.entities = new EntityManager(this.scene);

    // Events - store bound references for cleanup
    this.boundPointerMove = this.onPointerMove.bind(this);
    this.boundPointerDown = this.onPointerDown.bind(this);
    this.boundPointerLeave = () => {
      this.updateHoverSelector(null);
      this.onHoverPosition?.(null);
    };
    this.container.addEventListener('pointermove', this.boundPointerMove);
    this.container.addEventListener('pointerdown', this.boundPointerDown);
    this.container.addEventListener('pointerleave', this.boundPointerLeave);

    this.animate = this.animate.bind(this);
    this.updateTime(this.time);
    this.animate();
  }

  // --- Public API: Callbacks ---
  /**
   * Replace the callback functions registered at construction time.
   * Useful when the parent React component re-renders and produces new closures.
   */
  public setCallbacks(
    onStateChange: (state: AppState) => void,
    onCountChange: (count: number) => void,
    onHoverPosition?: (pos: WorldHoverInfo | null) => void,
    onSelect?: (target: WorldHoverInfo, tapCount: number) => void
  ) {
    this.onStateChange = onStateChange;
    this.onCountChange = onCountChange;
    this.onHoverPosition = onHoverPosition;
    this.onSelect = onSelect;
  }

  public setObjectiveTarget(_target: WorldHoverInfo | null) {
    // Objective selection visuals only exist in the world-scene UI layer on this branch.
  }

  // --- Public API: Camera ---
  /**
   * Translate both the camera position and its orbit target by the given XZ delta.
   * The delta is applied in camera-relative space so WASD controls feel intuitive.
   * @param dx - Strafing offset (camera-right axis).
   * @param dz - Forward/backward offset (camera-forward axis).
   */
  public moveCamera(dx: number, dz: number) {
    // Move camera relative to its current orientation for intuitive WASD controls
    const forward = new THREE.Vector3();
    this.camera.getWorldDirection(forward);
    forward.y = 0;
    forward.normalize();
    const right = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();

    const moveX = right.x * dx + forward.x * dz;
    const moveZ = right.z * dx + forward.z * dz;

    this.controls.target.x += moveX;
    this.controls.target.z += moveZ;
    this.camera.position.x += moveX;
    this.camera.position.z += moveZ;
    this.clampCameraTargetToWorldBounds();
    this.enforceCameraBounds();
    this.controls.update();
  }

  /**
   * Zoom the camera along its view direction, clamped to [minDistance, maxDistance].
   * @param delta - Positive zooms in, negative zooms out.
   */
  public zoomCamera(delta: number) {
    const zoomSpeed = 3;
    const direction = new THREE.Vector3();
    this.camera.getWorldDirection(direction);
    
    // Move camera along its viewing direction
    this.camera.position.addScaledVector(direction, delta * zoomSpeed);
    
    // Clamp distance to target
    const distance = this.camera.position.distanceTo(this.controls.target);
    if (distance < this.controls.minDistance) {
        this.camera.position.copy(this.controls.target).addScaledVector(direction, -this.controls.minDistance);
    } else if (distance > this.controls.maxDistance) {
        this.camera.position.copy(this.controls.target).addScaledVector(direction, -this.controls.maxDistance);
    }
    
    this.enforceCameraBounds();
    this.controls.update();
  }

  /** Return the normalized light direction (sun during day, moon at night). */
  private getLightDirection(): THREE.Vector3 {
    const activeOrbit = this.sun.visible ? this.sunOrbitOffset : this.moonOrbitOffset;
    return activeOrbit.clone().normalize();
  }

  private updateCelestialAnchors() {
    this.sun.position.copy(this.currentCameraFocus).add(this.sunOrbitOffset);
    this.moon.position.copy(this.currentCameraFocus).add(this.moonOrbitOffset);

    const activeOrbit = this.sun.visible ? this.sunOrbitOffset : this.moonOrbitOffset;
    this.dirLight.position.copy(this.currentCameraFocus).add(activeOrbit);
    this.dirLight.target.position.copy(this.currentCameraFocus);
    this.dirLight.target.updateMatrixWorld();
  }

  /**
   * Drive the day/night cycle to the given hour.
   * Uses the tick-based {@link DAY_NIGHT} system to compute sun/moon positions
   * via {@link getCelestialPosition}, light intensities via
   * {@link getDaylightFactor}, and shadow directions that follow the sun arc
   * so building and terrain shadows sweep across the world throughout the day.
   * @param time - Fractional hour in [0, 24).
   */
  public updateTime(time: number) {
    this.time = time;

    // Convert the fractional hour to the tick-based system
    const ticks = hoursToTicks(time);

    // --- Celestial positions via the day/night cycle module ---
    const celestial = getCelestialPosition(ticks, 120);

    // Moon is always positioned when it's night; during the day, park it below
    // the horizon so it isn't visible.
    if (celestial.isNight) {
      this.moonOrbitOffset.set(celestial.x, celestial.y, celestial.z);
      this.sunOrbitOffset.set(-celestial.x, -40, -celestial.z);
      this.moon.visible = true;
      this.sun.visible = false;
    } else {
      this.sunOrbitOffset.set(celestial.x, celestial.y, celestial.z);
      this.moonOrbitOffset.set(-celestial.x, -40, -celestial.z);
      this.moon.visible = false;
      this.sun.visible = true;
    }

    // --- Daylight factor (0 at night, sine curve 0→1→0 during daytime) ---
    const dayFactor = getDaylightFactor(ticks);
    const isDay = isDaytimeTick(ticks);

    this.ambientLight.intensity = 0.1 + dayFactor * 0.2;
    this.hemiLight.intensity = 0.2 + dayFactor * 0.3;

    // --- Directional light follows the visible celestial body ---
    if (dayFactor > 0) {
      this.dirLight.intensity = dayFactor * 1.0;
      this.dirLight.color.setHex(0xffffff);
    } else {
      this.dirLight.intensity = 0.3;
      this.dirLight.color.setHex(0xaaaaff);
    }
    this.updateCelestialAnchors();

    const fogColor = isDay ? 0xe2e8f0 : 0x020617;
    if (this.scene.fog) {
      this.scene.fog.color.setHex(fogColor);
      // Push fog far enough so world never vanishes during navigation
      (this.scene.fog as THREE.Fog).near = isDay ? VoxelEngine.FOG_NEAR_DAY : VoxelEngine.FOG_NEAR_NIGHT;
      (this.scene.fog as THREE.Fog).far = isDay ? VoxelEngine.FOG_FAR_DAY : VoxelEngine.FOG_FAR_NIGHT;
    }

    // Keep the floor colour in sync with the fog so it stays invisible
    (this.floor.material as THREE.MeshBasicMaterial).color.setHex(fogColor);

    // Update street lights
    const isNight = !isDay;
    // Street lights are now handled by EntityManager light pool
    
    // Update Sky Dome Color
    const skyMat = this.skyDome.material as THREE.MeshBasicMaterial;
    if (dayFactor > 0.5) {
      skyMat.color.setHex(0x87CEEB); // Day sky blue
    } else if (dayFactor > 0) {
      skyMat.color.setHex(0xFF7F50); // Sunset/Sunrise orange
    } else {
      skyMat.color.setHex(0x020617); // Night sky dark
    }
  }

  // --- Public API: Player ---
  /**
   * Set the player's target world position and movement state.
   *
   * For path-based movement (`isMoving=true`), a target indicator ring and path
   * polyline are shown.  For analog-stick movement, the target is set directly and
   * the character faces the movement direction.  The first call also snaps
   * camera and character to avoid an interpolation glide from the origin.
   *
   * @param x        - Target X in Three.js world space.
   * @param z        - Target Z in Three.js world space.
   * @param surfaceY - Surface height (Y) at the target tile.
   * @param isMoving - Whether the player is actively moving toward a path target.
   * @param targetX  - End-of-path X (path-based movement only).
   * @param targetZ  - End-of-path Z (path-based movement only).
   * @param path     - World-grid waypoints for the path polyline.
   */
  public setPlayerPosition(
    x: number,
    z: number,
    surfaceY: number,
    isMoving: boolean,
    targetX?: number,
    targetZ?: number,
    path?: {x: number, y: number}[]
  ) {
    // Save old target to detect analog stick position changes
    const prevX = this.targetPlayerPos.x;
    const prevZ = this.targetPlayerPos.z;
    this.requestedPlayerMoving = isMoving;

    this.targetPlayerPos.set(x, surfaceY, z);
    
    if (!this.firstPositionSet) {
      this.currentPlayerPos.copy(this.targetPlayerPos);
      this.entities.player.group.position.copy(this.currentPlayerPos);
      this.targetCameraFocus.copy(this.currentPlayerPos);
      this.currentCameraFocus.copy(this.currentPlayerPos);
      this.controls.target.copy(this.currentCameraFocus);
      this.firstPositionSet = true;
    }
    
    if (isMoving && targetX !== undefined && targetZ !== undefined) {
      // Path-based movement (click-to-move): use target direction
      this.entities.player.setMoving(true);
      const dx = targetX - x;
      const dz = targetZ - z;
      if (Math.abs(dx) > 0.01 || Math.abs(dz) > 0.01) {
        this.targetRotationY = Math.atan2(-dx, -dz);
      }
      this.targetIndicator.position.set(targetX, CONFIG.FLOOR_Y + 0.05, targetZ);
      this.targetIndicator.visible = true;

      if (path && path.length > 0) {
        const points = [new THREE.Vector3(x, CONFIG.FLOOR_Y + 0.1, z)];
        path.forEach(p => points.push(new THREE.Vector3(p.x - WORLD_HALF_SIZE, CONFIG.FLOOR_Y + 0.1, p.y - WORLD_HALF_SIZE)));
        
        // Dispose old geometry and create new one to avoid "Buffer size too small" warning
        this.pathLine.geometry.dispose();
        this.pathLine.geometry = new THREE.BufferGeometry().setFromPoints(points);
        
        this.pathLine.visible = true;
      } else {
        this.pathLine.visible = false;
      }
    } else {
      // Check if position changed (analog stick movement)
      const dx = x - prevX;
      const dz = z - prevZ;
      const posChanged = Math.abs(dx) > 0.01 || Math.abs(dz) > 0.01;

      if (posChanged) {
        // Analog stick movement: face the movement direction and start walking
        this.targetRotationY = Math.atan2(-dx, -dz);
      }

      this.entities.player.setMoving(isMoving || posChanged);

      this.targetIndicator.visible = false;
      this.pathLine.visible = false;
    }
  }

  /** Snapshot the current voxel simulation state as plain {@link VoxelData} objects. */
  public getCurrentVoxelData(): VoxelData[] {
    return this.voxels.map(v => ({
      x: v.x,
      y: v.y,
      z: v.z,
      color: v.color.getHex()
    }));
  }

  /** Snap the camera follow target to the player's current position immediately. */
  public recenterOnPlayer() {
    this.targetCameraFocus.copy(this.currentPlayerPos);
    this.currentCameraFocus.copy(this.currentPlayerPos);
    this.controls.target.copy(this.currentCameraFocus);
    this.camera.position.copy(this.currentCameraFocus).add(WORLD_CAMERA_OFFSET);
    this.enforceCameraBounds();
    this.controls.update();
  }

  /**
   * Kick off a smooth intro camera pull-back.  Starts with the camera
   * zoomed tight on the player character and eases out to the normal
   * isometric distance over {@link INTRO_DURATION_MS} milliseconds.
   * Safe to call multiple times — subsequent calls are no-ops while
   * an intro is already running.
   */
  public playIntroAnimation() {
    if (this.introAnimationActive) return;
    this.introAnimationActive = true;
    this.introStartTime = performance.now();

    // Snap focus on the player and position the camera at the close-up distance
    this.targetCameraFocus.copy(this.currentPlayerPos);
    this.currentCameraFocus.copy(this.currentPlayerPos);
    this.controls.target.copy(this.currentCameraFocus);

    const closeOffset = WORLD_CAMERA_OFFSET.clone()
      .normalize()
      .multiplyScalar(VoxelEngine.INTRO_CLOSE_DISTANCE);
    this.camera.position.copy(this.currentCameraFocus).add(closeOffset);
    this.enforceCameraBounds();
    this.controls.update();
  }

  /** Advance the intro pull-back each frame.  Called from animate(). */
  private updateIntroAnimation() {
    if (!this.introAnimationActive) return;

    const elapsed = performance.now() - this.introStartTime;
    const t = Math.min(elapsed / VoxelEngine.INTRO_DURATION_MS, 1);

    // Smooth ease-out (quartic) for a gradual, graceful deceleration
    const ease = 1 - Math.pow(1 - t, 4);

    const distance = THREE.MathUtils.lerp(
      VoxelEngine.INTRO_CLOSE_DISTANCE,
      WORLD_CAMERA_DISTANCE,
      ease,
    );

    const direction = WORLD_CAMERA_OFFSET.clone().normalize();
    this.camera.position
      .copy(this.controls.target)
      .addScaledVector(direction, distance);

    this.enforceCameraBounds();
    this.controls.update();

    if (t >= 1) {
      this.introAnimationActive = false;
    }
  }

  private updateCameraFollow(deltaTime: number) {
    this.targetCameraFocus.copy(this.currentPlayerPos);

    this.currentCameraFocus.x = THREE.MathUtils.damp(
      this.currentCameraFocus.x,
      this.targetCameraFocus.x,
      VoxelEngine.CAMERA_FOLLOW_DAMPING_XZ,
      deltaTime
    );
    this.currentCameraFocus.z = THREE.MathUtils.damp(
      this.currentCameraFocus.z,
      this.targetCameraFocus.z,
      VoxelEngine.CAMERA_FOLLOW_DAMPING_XZ,
      deltaTime
    );
    this.currentCameraFocus.y = THREE.MathUtils.damp(
      this.currentCameraFocus.y,
      this.targetCameraFocus.y,
      VoxelEngine.CAMERA_FOLLOW_DAMPING_Y,
      deltaTime
    );

    this.controls.target.copy(this.currentCameraFocus);
  }

  private enforceCameraBounds() {
    const offset = this.camera.position.clone().sub(this.controls.target);
    const spherical = new THREE.Spherical().setFromVector3(offset);

    spherical.radius = THREE.MathUtils.clamp(
      spherical.radius,
      this.controls.minDistance,
      this.controls.maxDistance
    );
    spherical.phi = WORLD_CAMERA_POLAR;
    spherical.theta = WORLD_CAMERA_AZIMUTH;

    offset.setFromSpherical(spherical);
    this.camera.position.copy(this.controls.target).add(offset);

    const minimumHeight = this.controls.target.y + 4;
    if (this.camera.position.y < minimumHeight) {
      this.camera.position.y = minimumHeight;
    }
  }

  private clampCameraTargetToWorldBounds() {
    const worldLimit = WORLD_HALF_SIZE - 6;
    this.controls.target.x = THREE.MathUtils.clamp(this.controls.target.x, -worldLimit, worldLimit);
    this.controls.target.z = THREE.MathUtils.clamp(this.controls.target.z, -worldLimit, worldLimit);
    this.camera.position.x = THREE.MathUtils.clamp(this.camera.position.x, -worldLimit, worldLimit);
    this.camera.position.z = THREE.MathUtils.clamp(this.camera.position.z, -worldLimit, worldLimit);
  }

  /**
   * Build a ground ring that fills the gap between the playable terrain
   * (radius WORLD_HALF_SIZE) and the edge‑building ring so the skyline
   * no longer appears to float in mid‑air.
   */
  private buildGroundRing() {
    const innerRadius = WORLD_HALF_SIZE;
    const outerRadius = backgroundData.edgeConfig.ringEnd + 10;
    const GROUND_Y = CONFIG.FLOOR_Y - 2; // sits at terrain base level

    // Dark ground colour that reads as distant wasteland / outskirts
    const ringMat = new THREE.MeshStandardMaterial({
      color: 0x3b4a3a,   // dark olive ground
      roughness: 1,
      metalness: 0,
    });

    // Build a flat ring with a shape path
    const shape = new THREE.Shape();
    const segments = 64;
    // Outer path (CW)
    for (let i = 0; i <= segments; i++) {
      const angle = (i / segments) * Math.PI * 2;
      const x = Math.cos(angle) * outerRadius;
      const z = Math.sin(angle) * outerRadius;
      if (i === 0) shape.moveTo(x, z);
      else shape.lineTo(x, z);
    }
    // Inner hole (CCW)
    const hole = new THREE.Path();
    for (let i = 0; i <= segments; i++) {
      const angle = (i / segments) * Math.PI * 2;
      const x = Math.cos(angle) * innerRadius;
      const z = Math.sin(angle) * innerRadius;
      if (i === 0) hole.moveTo(x, z);
      else hole.lineTo(x, z);
    }
    shape.holes.push(hole);

    const geom = new THREE.ShapeGeometry(shape, 1);
    // ShapeGeometry lies in XY – rotate to XZ
    geom.rotateX(-Math.PI / 2);
    const mesh = new THREE.Mesh(geom, ringMat);
    mesh.position.y = GROUND_Y;
    mesh.receiveShadow = true;
    this.scene.add(mesh);
  }

  /**
   * Build edge decorations from background.json motifs.
   * Keep them cheap, but layered enough that the horizon reads like an
   * intentional distant city instead of a test scene.
   */
  private buildEdgeDecorations() {
    const cfg = backgroundData.edgeConfig;
    const motifs = backgroundData.motifs as Array<{
      name: string; width: number; depth: number; floors: number; style: string;
    }>;
    if (!motifs || motifs.length === 0) return;

    // Deterministic pseudo-random from two seed values
    const seededRandom = (a: number, b: number) => {
      const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453;
      return s - Math.floor(s);
    };
    const seededRandom2 = (a: number, b: number) => {
      const s = Math.sin(a * 269.3 + b * 183.1) * 31415.9265;
      return s - Math.floor(s);
    };

    type Placement = {
      x: number;
      y: number;
      z: number;
      sx: number;
      sy: number;
      sz: number;
      lightnessShift: number;
    };

    type LayerConfig = {
      id: number;
      ringStart: number;
      ringEnd: number;
      step: number;
      spawnChance: number;
      clusterChance: number;
      widthScale: number;
      depthScale: number;
      minHeightScale: number;
      maxHeightScale: number;
      opacity: number;
      color: number;
      yOffset: number;
      jitter: number;
    };

    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const layerConfigs: LayerConfig[] = [
      {
        id: 1,
        ringStart: cfg.ringStart,
        ringEnd: cfg.ringStart + 18,
        step: Math.max(cfg.spacing * 1.7, 10),
        spawnChance: 0.78,
        clusterChance: 0.58,
        widthScale: 2.1,
        depthScale: 1.85,
        minHeightScale: 0.18,
        maxHeightScale: 0.32,
        opacity: 0.36,
        color: 0x49545f,
        yOffset: -2.5,
        jitter: 0.42
      },
      {
        id: 2,
        ringStart: cfg.ringStart + 10,
        ringEnd: cfg.ringEnd - 10,
        step: Math.max(cfg.spacing * 2.1, 13),
        spawnChance: 0.64,
        clusterChance: 0.46,
        widthScale: 1.45,
        depthScale: 1.35,
        minHeightScale: 0.28,
        maxHeightScale: 0.48,
        opacity: 0.28,
        color: 0x5a6673,
        yOffset: -1.5,
        jitter: 0.34
      },
      {
        id: 3,
        ringStart: cfg.ringStart + 26,
        ringEnd: cfg.ringEnd,
        step: Math.max(cfg.spacing * 2.6, 16),
        spawnChance: 0.42,
        clusterChance: 0.22,
        widthScale: 0.92,
        depthScale: 0.96,
        minHeightScale: 0.42,
        maxHeightScale: 0.72,
        opacity: 0.18,
        color: 0x88919b,
        yOffset: 1.25,
        jitter: 0.22
      }
    ];

    const buildLayer = (layer: LayerConfig) => {
      const placements: Placement[] = [];
      const tangentSpread = layer.step * 0.42;

      for (let wx = -layer.ringEnd; wx <= layer.ringEnd; wx += layer.step) {
        for (let wz = -layer.ringEnd; wz <= layer.ringEnd; wz += layer.step) {
          const dist = Math.max(Math.abs(wx), Math.abs(wz));
          if (dist < layer.ringStart || dist > layer.ringEnd) continue;

          const edgeT = (dist - layer.ringStart) / Math.max(1, layer.ringEnd - layer.ringStart);
          const r = seededRandom(wx + layer.id * 17.3, wz - layer.id * 11.9);
          if (r > THREE.MathUtils.lerp(layer.spawnChance, layer.spawnChance * 0.72, edgeT)) continue;

          const motifSeed = seededRandom2(wx + layer.id * 7.1, wz + layer.id * 13.7);
          const motif = motifs[Math.floor(motifSeed * motifs.length) % motifs.length];
          const clusterRoll = seededRandom(wx - layer.id * 5.3, wz + layer.id * 3.1);
          const clusterCount =
            clusterRoll < layer.clusterChance * 0.45 ? 3 :
            clusterRoll < layer.clusterChance ? 2 :
            1;

          const tangentX = Math.abs(wz) > Math.abs(wx) ? 1 : 0;
          const tangentZ = Math.abs(wx) >= Math.abs(wz) ? 1 : 0;

          for (let clusterIndex = 0; clusterIndex < clusterCount; clusterIndex += 1) {
            const offsetSeed = seededRandom2(
              wx + clusterIndex * 13.1 + layer.id * 2.9,
              wz - clusterIndex * 9.7 - layer.id * 4.3
            );
            const lateralOffset = ((clusterIndex - (clusterCount - 1) / 2) * tangentSpread)
              + ((offsetSeed - 0.5) * layer.step * layer.jitter);
            const depthOffset = (seededRandom(wx + clusterIndex * 4.1, wz - clusterIndex * 6.7) - 0.5)
              * layer.step * 0.16;
            const baseX = wx + tangentX * lateralOffset + (1 - tangentX) * depthOffset;
            const baseZ = wz + tangentZ * lateralOffset + (1 - tangentZ) * depthOffset;

            const widthSeed = seededRandom(baseX + layer.id, baseZ - layer.id);
            const depthSeed = seededRandom2(baseX - layer.id, baseZ + layer.id);
            const heightSeed = seededRandom(baseX + 3.7, baseZ - 5.1);
            const width = Math.max(6, Math.round(motif.width * layer.widthScale * (0.92 + widthSeed * 0.95)));
            const depth = Math.max(6, Math.round(motif.depth * layer.depthScale * (0.92 + depthSeed * 0.95)));
            const heightScale = THREE.MathUtils.lerp(layer.minHeightScale, layer.maxHeightScale, heightSeed);
            const height = Math.max(9, Math.round(motif.floors * heightScale));

            placements.push({
              x: baseX,
              y: cfg.baseY + (height / 2) - 2 + layer.yOffset,
              z: baseZ,
              sx: width,
              sy: height,
              sz: depth,
              lightnessShift: THREE.MathUtils.lerp(-0.08, 0.06, seededRandom2(baseX + 1.9, baseZ + 2.7))
            });
          }
        }
      }

      if (placements.length === 0) return;

      const material = new THREE.MeshStandardMaterial({
        color: layer.color,
        roughness: 1,
        metalness: 0,
        transparent: true,
        opacity: layer.opacity,
        fog: true,
        vertexColors: true
      });

      const instanced = new THREE.InstancedMesh(geometry, material, placements.length);
      instanced.castShadow = false;
      instanced.receiveShadow = false;
      instanced.frustumCulled = true;

      const instanceColor = new THREE.Color(layer.color);
      placements.forEach((placement, index) => {
        this.dummy.position.set(placement.x, placement.y, placement.z);
        this.dummy.scale.set(placement.sx, placement.sy, placement.sz);
        this.dummy.updateMatrix();
        instanced.setMatrixAt(index, this.dummy.matrix);

        const color = instanceColor.clone().offsetHSL(0, 0, placement.lightnessShift);
        instanced.setColorAt(index, color);
      });

      instanced.instanceMatrix.needsUpdate = true;
      if (instanced.instanceColor) instanced.instanceColor.needsUpdate = true;
      this.edgeGroup.add(instanced);
    };

    layerConfigs.forEach(buildLayer);
  }

  private collectTerrainObjects() {
    const objectsToCheck: THREE.Object3D[] = [];
    if (this.instanceMesh) objectsToCheck.push(this.instanceMesh);
    this.terrainGroup.children.forEach((child) => {
      if (child instanceof THREE.Mesh) {
        objectsToCheck.push(child);
      }
    });
    return objectsToCheck;
  }

  private getSnappedWorldPoint(intersect: THREE.Intersection) {
    const pos = new THREE.Vector3();
    const normal = intersect.face?.normal?.clone() ?? new THREE.Vector3(0, 1, 0);
    pos.copy(intersect.point).add(normal.multiplyScalar(0.5));

    const worldX = pos.x + WORLD_HALF_SIZE;
    const worldY = pos.z + WORLD_HALF_SIZE;

    const snappedX = Math.round(worldX);
    const snappedY = Math.round(worldY);

    // Fractional position within the parent voxel cell (0..1)
    const fracX = worldX - Math.floor(worldX);
    const fracY = worldY - Math.floor(worldY);
    const sub = resolveSubCell(fracX, fracY);

    return {
      x: snappedX,
      y: snappedY,
      z: Math.round(pos.y),
      renderX: Math.round(pos.x),
      renderZ: Math.round(pos.z),
      renderY: Math.round(pos.y),
      subX: sub.subX,
      subY: sub.subY,
    };
  }

  private resolveEntityTarget(
    intersect: THREE.Intersection,
    kind: 'NPC' | 'BUILDING'
  ): WorldHoverInfo | null {
    let obj: THREE.Object3D | null = intersect.object;

    if (kind === 'NPC') {
      const entries = Array.from(this.entities.npcs.entries());

      while (obj && !(obj instanceof THREE.Scene)) {
        for (const [id, entity] of entries) {
          if (entity.group === obj) {
            const snapped = this.getSnappedWorldPoint(intersect);
            return {
              x: snapped.x,
              y: snapped.y,
              z: snapped.z,
              kind: 'NPC',
              id,
              label: id,
              subX: snapped.subX,
              subY: snapped.subY,
            };
          }
        }
        obj = obj.parent;
      }

      return null;
    }

    const entries = Array.from(this.entities.buildings.entries());

    while (obj && !(obj instanceof THREE.Scene)) {
      for (const [id, entity] of entries) {
        if (entity.group === obj) {
          const buildingType = entity.group.userData.buildingType as string | undefined;
          if (buildingType && ['ROAD', 'SIDEWALK', 'PARK'].includes(buildingType)) {
            return null;
          }

          const snapped = this.getSnappedWorldPoint(intersect);
          return {
            x: snapped.x,
            y: snapped.y,
            z: snapped.z,
            kind: 'BUILDING',
            id,
            label: entity.name,
            subX: snapped.subX,
            subY: snapped.subY,
          };
        }
      }
      obj = obj.parent;
    }

    return null;
  }

  private resolveWorldTarget() {
    this.raycaster.setFromCamera(this.pointer, this.camera);

    const npcGroups = Array.from(this.entities.npcs.values()).map((n) => n.group);
    const buildingGroups = Array.from(this.entities.buildings.values()).map((b) => b.group);
    const npcIntersects = this.raycaster.intersectObjects(npcGroups, true);
    if (npcIntersects.length > 0) {
      const npcTarget = this.resolveEntityTarget(npcIntersects[0], 'NPC');
      if (npcTarget) {
        return npcTarget;
      }
    }

    const buildingIntersects = this.raycaster.intersectObjects(buildingGroups, true);
    if (buildingIntersects.length > 0) {
      const buildingIntersect = buildingIntersects[0];
      const buildingTarget = this.resolveEntityTarget(buildingIntersect, 'BUILDING');
      if (buildingTarget) {
        return buildingTarget;
      }
    }

    const terrainObjects = this.collectTerrainObjects();
    const terrainIntersects = this.raycaster.intersectObjects(terrainObjects, true);
    if (terrainIntersects.length > 0) {
      const snapped = this.getSnappedWorldPoint(terrainIntersects[0]);
      return {
        x: snapped.x,
        y: snapped.y,
        z: snapped.z,
        kind: 'GROUND' as const,
        label: 'Ground',
        subX: snapped.subX,
        subY: snapped.subY,
      };
    }

    return null;
  }

  private updateHoverSelector(target: WorldHoverInfo | null) {
    if (!target) {
      this.hoverSelector.visible = false;
      return;
    }

    this.hoverSelector.position.set(target.x - WORLD_HALF_SIZE, target.z + 0.03, target.y - WORLD_HALF_SIZE);
    this.hoverSelector.visible = true;
  }

  private findBuildingFootprint(object: THREE.Object3D): BuildingFootprint | null {
    let obj: THREE.Object3D | null = object;

    while (obj && !(obj instanceof THREE.Scene)) {
      if (obj.userData.worldFootprint) {
        return obj.userData.worldFootprint as BuildingFootprint;
      }
      obj = obj.parent;
    }

    return null;
  }

  private distanceToFootprint(x: number, y: number, footprint: BuildingFootprint) {
    const dx =
      x < footprint.minX ? footprint.minX - x :
      x > footprint.maxX ? x - footprint.maxX :
      0;
    const dy =
      y < footprint.minY ? footprint.minY - y :
      y > footprint.maxY ? y - footprint.maxY :
      0;

    return Math.hypot(dx, dy);
  }

  public setEditParams(isEdit: boolean, tool: EditTool, color: number, symmetry: SymmetryMode) {
    this.isEditMode = isEdit;
    this.activeTool = tool;
    this.activeColor = color;
    this.symmetryMode = symmetry;
    if (!isEdit) {
      this.ghostVoxel.visible = false;
      this.ghostSymmetryVoxel.visible = false;
    }
  }

  public setWireframe(enabled: boolean) {
    this.isWireframe = enabled;
    if (this.instanceMesh && !Array.isArray(this.instanceMesh.material)) {
        (this.instanceMesh.material as THREE.MeshStandardMaterial).wireframe = enabled;
        this.instanceMesh.material.needsUpdate = true;
    }
  }

  private onPointerMove(event: PointerEvent) {
    const rect = this.container.getBoundingClientRect();
    this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    const hoverTarget = this.resolveWorldTarget();
    this.updateHoverSelector(hoverTarget);
    this.onHoverPosition?.(hoverTarget);

    if (this.isEditMode && this.state === AppState.STABLE) {
      this.updateGhost();
    }
  }

  private onPointerDown(event: PointerEvent) {
    // Shift + Click Explosion (Removes voxels)
    if (event.shiftKey) {
      this.raycaster.setFromCamera(this.pointer, this.camera);
      const objectsToCheck = this.collectTerrainObjects();

      const intersects = this.raycaster.intersectObjects(objectsToCheck);
      
      if (intersects.length > 0) {
        const point = intersects[0].point;
        const radius = 3;
        
        if (this.state === AppState.STABLE) {
          const newData = this.currentVoxelData.filter(v => {
            const dx = v.x - point.x;
            const dy = v.y - point.y;
            const dz = v.z - point.z;
            return (dx*dx + dy*dy + dz*dz) > (radius * radius);
          });

          if (newData.length !== this.currentVoxelData.length) {
            this.currentVoxelData = newData;
            this.loadInitialModel(newData);
            this.onVoxelEdit?.(newData);
          }
        } else if (this.state === AppState.DISMANTLING) {
          // In dismantling mode, we apply a strong force
          const force = 1.5;
          this.voxels.forEach(v => {
            const dx = v.x - point.x;
            const dy = v.y - point.y;
            const dz = v.z - point.z;
            const distSq = dx*dx + dy*dy + dz*dz;
            if (distSq < radius * radius * 4) { // Larger force radius
              const dist = Math.sqrt(distSq) || 0.1;
              const f = (1 - dist / (radius * 2)) * force;
              v.vx += (dx / dist) * f;
              v.vy += (dy / dist) * f + 0.5;
              v.vz += (dz / dist) * f;
            }
          });
        }
      }
      return;
    }

    // If physics is active, applying force
    if (this.state === AppState.DISMANTLING) {
        this.raycaster.setFromCamera(this.pointer, this.camera);
        const objectsToCheck = this.collectTerrainObjects();

        const intersects = this.raycaster.intersectObjects(objectsToCheck);
        if (intersects.length > 0) {
            const point = intersects[0].point;
            // Apply explosion force at point
            const radius = 8;
            const force = 0.8;
            this.voxels.forEach(v => {
                const dx = v.x - point.x;
                const dy = v.y - point.y;
                const dz = v.z - point.z;
                const distSq = dx*dx + dy*dy + dz*dz;
                if (distSq < radius * radius) {
                    const dist = Math.sqrt(distSq);
                    const f = (1 - dist / radius) * force;
                    v.vx += (dx / dist) * f;
                    v.vy += (dy / dist) * f + 0.2; // Add some Up force
                    v.vz += (dz / dist) * f;
                }
            });
        }
        return;
    }

    // World Interaction (Click to Move / Interact)
    if (!this.isEditMode && this.state === AppState.STABLE) {
      if (event.button !== 0) {
        return;
      }

      const selectedTarget = this.resolveWorldTarget();
      if (selectedTarget) {
        this.onSelect?.(selectedTarget, event.detail);
      }
      return;
    }

    if (!this.isEditMode || this.state !== AppState.STABLE) return;
    
    // Perform Raycast
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const objectsToCheck = this.collectTerrainObjects();

    const intersects = this.raycaster.intersectObjects(objectsToCheck);

    if (intersects.length > 0) {
      const intersect = intersects[0];
      const pos = new THREE.Vector3();

      if (this.activeTool === EditTool.BRUSH) {
        const normal = intersect.face?.normal?.clone() ?? new THREE.Vector3(0, 1, 0);
        pos.copy(intersect.point).add(normal.multiplyScalar(0.5));
        
        const gridPos = { x: Math.round(pos.x), y: Math.round(pos.y), z: Math.round(pos.z) };
        this.addVoxelAt(gridPos.x, gridPos.y, gridPos.z, true);
      } else {
        // Eraser
        // With chunked meshes, we need to calculate which voxel is at the intersection point - normal * 0.5
        
        let targetX, targetY, targetZ;
        
        // Check if intersect.object is one of our terrain meshes
        const isTerrainMesh = this.terrainGroup.children.some(child => {
            return child === intersect.object;
        });

        if (isTerrainMesh) {
             const normal = intersect.face?.normal?.clone() ?? new THREE.Vector3(0, 1, 0);
             pos.copy(intersect.point).sub(normal.multiplyScalar(0.5));
             targetX = Math.round(pos.x);
             targetY = Math.round(pos.y);
             targetZ = Math.round(pos.z);
             
             // Find index in currentVoxelData
             const index = this.currentVoxelData.findIndex(v => v.x === targetX && v.y === targetY && v.z === targetZ);
             if (index !== -1) {
                 this.removeVoxelAt(index, true);
             }
        } else if (intersect.instanceId !== undefined) {
          this.removeVoxelAt(intersect.instanceId, true);
        }
      }
    }
  }

  private addVoxelAt(x: number, y: number, z: number, withSymmetry: boolean) {
    // Prevent duplicates
    const exists = this.currentVoxelData.some(v => v.x === x && v.y === y && v.z === z);
    if (!exists) {
        const newData = [...this.currentVoxelData, { x, y, z, color: this.activeColor }];
        this.currentVoxelData = newData;
        this.loadInitialModel(newData);
        this.onVoxelEdit?.(newData);
    }

    if (withSymmetry && this.symmetryMode !== SymmetryMode.NONE) {
      const symPos = this.getSymmetryPos(x, y, z);
      if (symPos) this.addVoxelAt(symPos.x, symPos.y, symPos.z, false);
    }
  }

  private removeVoxelAt(index: number, withSymmetry: boolean) {
    const targetVoxel = this.currentVoxelData[index];
    if (!targetVoxel) return;

    const newData = this.currentVoxelData.filter((_, i) => i !== index);
    
    if (withSymmetry && this.symmetryMode !== SymmetryMode.NONE) {
      const symPos = this.getSymmetryPos(targetVoxel.x, targetVoxel.y, targetVoxel.z);
      if (symPos) {
        const symIdx = newData.findIndex(v => v.x === symPos.x && v.y === symPos.y && v.z === symPos.z);
        if (symIdx !== -1) newData.splice(symIdx, 1);
      }
    }

    this.currentVoxelData = newData;
    this.loadInitialModel(newData);
    this.onVoxelEdit?.(newData);
  }

  private getSymmetryPos(x: number, y: number, z: number) {
    if (this.symmetryMode === SymmetryMode.X) return { x: -x, y, z };
    if (this.symmetryMode === SymmetryMode.Z) return { x, y, z: -z };
    return null;
  }

  private updateGhost() {
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const objectsToCheck = this.collectTerrainObjects();

    const intersects = this.raycaster.intersectObjects(objectsToCheck);

    if (intersects.length > 0) {
      const intersect = intersects[0];
      const pos = new THREE.Vector3();
      
      if (this.activeTool === EditTool.BRUSH) {
        const normal = intersect.face?.normal?.clone() ?? new THREE.Vector3(0, 1, 0);
        pos.copy(intersect.point).add(normal.multiplyScalar(0.5));
        
        const gridX = Math.round(pos.x);
        const gridY = Math.round(pos.y);
        const gridZ = Math.round(pos.z);
        
        this.ghostVoxel.position.set(gridX, gridY, gridZ);
        this.ghostVoxel.visible = true;
        const material = this.ghostVoxel.material as THREE.MeshStandardMaterial;
        material.color.set(this.activeColor);

        if (this.symmetryMode !== SymmetryMode.NONE) {
          const sym = this.getSymmetryPos(gridX, gridY, gridZ);
          if (sym) {
            this.ghostSymmetryVoxel.position.set(sym.x, sym.y, sym.z);
            this.ghostSymmetryVoxel.visible = true;
            const material = this.ghostSymmetryVoxel.material as THREE.MeshStandardMaterial;
            material.color.set(this.activeColor);
          }
        } else {
          this.ghostSymmetryVoxel.visible = false;
        }
      } else {
        // Eraser Ghost
        let targetX, targetY, targetZ;
        let found = false;

        // Check if intersect.object is one of our terrain meshes
        const isTerrainMesh = this.terrainGroup.children.some(child => {
            return child === intersect.object;
        });

        if (isTerrainMesh) {
             const normal = intersect.face?.normal?.clone() ?? new THREE.Vector3(0, 1, 0);
             pos.copy(intersect.point).sub(normal.multiplyScalar(0.5));
             targetX = Math.round(pos.x);
             targetY = Math.round(pos.y);
             targetZ = Math.round(pos.z);
             found = true;
        } else if (intersect.instanceId !== undefined) {
          const vox = this.voxels[intersect.instanceId];
          targetX = vox.x;
          targetY = vox.y;
          targetZ = vox.z;
          found = true;
        }

        if (found) {
          this.ghostVoxel.position.set(targetX!, targetY!, targetZ!);
          this.ghostVoxel.visible = true;
          const material = this.ghostVoxel.material as THREE.MeshStandardMaterial;
          material.color.set(0xff0000);

          if (this.symmetryMode !== SymmetryMode.NONE) {
            const sym = this.getSymmetryPos(targetX!, targetY!, targetZ!);
            if (sym) {
              this.ghostSymmetryVoxel.position.set(sym.x, sym.y, sym.z);
              this.ghostSymmetryVoxel.visible = true;
              const material = this.ghostSymmetryVoxel.material as THREE.MeshStandardMaterial;
              material.color.set(0xff0000);
            }
          } else {
            this.ghostSymmetryVoxel.visible = false;
          }
        } else {
          this.ghostVoxel.visible = false;
          this.ghostSymmetryVoxel.visible = false;
        }
      }
    } else {
      this.ghostVoxel.visible = false;
      this.ghostSymmetryVoxel.visible = false;
    }
  }

  public loadInitialModel(data: VoxelData[]) {
    this.currentVoxelData = data;
    this.createVoxels(data);
    this.onCountChange(this.voxels.length);
    this.state = AppState.STABLE;
    this.onStateChange(this.state);
  }
  
  public mergeVoxels(newVoxels: VoxelData[]) {
      // Create a map of existing voxels for easy lookup
      const map = new Map<string, number>();
      this.currentVoxelData.forEach((v, i) => map.set(`${v.x},${v.y},${v.z}`, i));
      
      const updatedData = [...this.currentVoxelData];
      
      newVoxels.forEach(nv => {
          const key = `${nv.x},${nv.y},${nv.z}`;
          if (map.has(key)) {
              // Update existing
              updatedData[map.get(key)!].color = nv.color;
          } else {
              // Add new
              updatedData.push(nv);
          }
      });
      
      this.loadInitialModel(updatedData);
  }

  private createVoxels(data: VoxelData[]) {
    if (this.instanceMesh) {
      this.terrainGroup.remove(this.instanceMesh);
      this.instanceMesh.geometry.dispose();
      if (Array.isArray(this.instanceMesh.material)) {
          this.instanceMesh.material.forEach(m => m.dispose());
      } else {
          this.instanceMesh.material.dispose();
      }
      this.instanceMesh = null;
    }
    
    // Clear existing meshes
    while (this.terrainGroup.children.length > 0) {
        const child = this.terrainGroup.children[0];
        this.terrainGroup.remove(child);
        if (child instanceof THREE.Mesh) {
            child.geometry.dispose();
            if (Array.isArray(child.material)) child.material.forEach(m => m.dispose());
            else child.material.dispose();
        }
    }
    this.optimizedMesh = null;

    this.voxels = data.map((v, i) => {
        const c = new THREE.Color(v.color);
        return {
            id: i,
            x: v.x, y: v.y, z: v.z, color: c,
            vx: 0, vy: 0, vz: 0, rx: 0, ry: 0, rz: 0,
            rvx: 0, rvy: 0, rvz: 0
        };
    });

    if (this.state === AppState.STABLE) {
        // Chunking
        const CHUNK_SIZE = 32;
        const chunks = new Map<string, VoxelData[]>();
        data.forEach(v => {
            const cx = Math.floor(v.x / CHUNK_SIZE);
            const cy = Math.floor(v.y / CHUNK_SIZE);
            const cz = Math.floor(v.z / CHUNK_SIZE);
            const key = `${cx},${cy},${cz}`;
            if (!chunks.has(key)) chunks.set(key, []);
            chunks.get(key)!.push(v);
        });

        chunks.forEach((voxels) => {
            const meshData = GreedyMesher.mesh(voxels);
            const geometry = new THREE.BufferGeometry();
            geometry.setAttribute('position', new THREE.Float32BufferAttribute(meshData.positions, 3));
            geometry.setAttribute('normal', new THREE.Float32BufferAttribute(meshData.normals, 3));
            geometry.setAttribute('color', new THREE.Float32BufferAttribute(meshData.colors, 3));
            geometry.setIndex(meshData.indices);
            geometry.computeBoundingSphere();
            geometry.computeBoundingBox();
            
            const material = new THREE.MeshStandardMaterial({ 
                vertexColors: true,
                roughness: 0.8, 
                metalness: 0.1,
                wireframe: this.isWireframe 
            });
            
            const mesh = new THREE.Mesh(geometry, material);
            mesh.castShadow = true;
            mesh.receiveShadow = true;
            mesh.frustumCulled = true;
            
            this.terrainGroup.add(mesh);
        });
    } else {
        // Fallback to InstancedMesh for physics
        const geometry = new THREE.BoxGeometry(CONFIG.VOXEL_SIZE - 0.1, CONFIG.VOXEL_SIZE - 0.1, CONFIG.VOXEL_SIZE - 0.1);
        const material = new THREE.MeshStandardMaterial({ 
            roughness: 0.8, 
            metalness: 0.1,
            wireframe: this.isWireframe 
        });
        this.instanceMesh = new THREE.InstancedMesh(geometry, material, this.voxels.length);
        this.instanceMesh.castShadow = true;
        this.instanceMesh.receiveShadow = true;
        this.terrainGroup.add(this.instanceMesh);
        this.draw();
    }
  }

  private optimizedMesh: THREE.Mesh | null = null;

  private draw() {
    if (this.state === AppState.STABLE) {
        // No need to update matrix for static mesh
        return;
    }
    
    if (!this.instanceMesh) return;
    this.voxels.forEach((v, i) => {
        this.dummy.position.set(v.x, v.y, v.z);
        this.dummy.rotation.set(v.rx, v.ry, v.rz);
        this.dummy.updateMatrix();
        this.instanceMesh!.setMatrixAt(i, this.dummy.matrix);
        this.instanceMesh!.setColorAt(i, v.color);
    });
    this.instanceMesh.instanceMatrix.needsUpdate = true;
    if (this.instanceMesh.instanceColor) this.instanceMesh.instanceColor.needsUpdate = true;
  }
  
  public drop() {
    if (this.state !== AppState.STABLE) return;
    this.state = AppState.DISMANTLING;
    this.onStateChange(this.state);
    this.ghostVoxel.visible = false;
    this.ghostSymmetryVoxel.visible = false;
    // Tiny jitter to wake them up
    this.voxels.forEach(v => {
        v.vx = (Math.random() - 0.5) * 0.01;
        v.vz = (Math.random() - 0.5) * 0.01;
    });
  }

  public dismantle() {
    if (this.state !== AppState.STABLE) return;
    this.state = AppState.DISMANTLING;
    this.onStateChange(this.state);
    this.ghostVoxel.visible = false;
    this.ghostSymmetryVoxel.visible = false;

    // Explosion forces
    this.voxels.forEach(v => {
        v.vx = (Math.random() - 0.5) * 0.8;
        v.vy = Math.random() * 0.8;
        v.vz = (Math.random() - 0.5) * 0.8;
        v.rvx = (Math.random() - 0.5) * 0.3;
        v.rvy = (Math.random() - 0.5) * 0.3;
        v.rvz = (Math.random() - 0.5) * 0.3;
    });
  }

  private getColorDist(c1: THREE.Color, hex2: number): number {
    const c2 = new THREE.Color(hex2);
    const r = (c1.r - c2.r) * 0.3;
    const g = (c1.g - c2.g) * 0.59;
    const b = (c1.b - c2.b) * 0.11;
    return Math.sqrt(r * r + g * g + b * b);
  }

  public rebuild(targetModel: VoxelData[]) {
    // If we're already rebuilding, this will reset the targets
    this.currentVoxelData = targetModel;

    const available = this.voxels.map((v, i) => ({ index: i, color: v.color, taken: false }));
    const mappings: RebuildTarget[] = new Array(this.voxels.length).fill(null);

    targetModel.forEach(target => {
        let bestDist = 9999;
        let bestIdx = -1;

        for (let i = 0; i < available.length; i++) {
            if (available[i].taken) continue;
            const d = this.getColorDist(available[i].color, target.color);
            if (d < bestDist) {
                bestDist = d;
                bestIdx = i;
                if (d < 0.01) break;
            }
        }

        if (bestIdx !== -1) {
            available[bestIdx].taken = true;
            const h = Math.max(0, target.y / 15);
            mappings[available[bestIdx].index] = {
                x: target.x, y: target.y, z: target.z,
                delay: h * 800
            };
        }
    });

    for (let i = 0; i < this.voxels.length; i++) {
        if (!mappings[i]) {
            mappings[i] = {
                x: this.voxels[i].x, y: this.voxels[i].y, z: this.voxels[i].z,
                isRubble: true, delay: 0
            };
        }
    }

    this.rebuildTargets = mappings;
    this.rebuildStartTime = Date.now();
    this.state = AppState.REBUILDING;
    this.onStateChange(this.state);
  }

  private updatePhysics(deltaTime: number) {
    if (this.state === AppState.DISMANTLING) {
        // 1. Integration & Boundaries
        this.voxels.forEach(v => {
            // Gravity
            v.vy -= 1.2 * deltaTime;
            
            // Drag
            const drag = Math.pow(0.5, deltaTime);
            v.vx *= drag; v.vy *= drag; v.vz *= drag;
            v.rvx *= drag; v.rvy *= drag; v.rvz *= drag;

            v.x += v.vx; v.y += v.vy; v.z += v.vz;
            v.rx += v.rvx; v.ry += v.rvy; v.rz += v.rvz;

            // Floor collision
            const floorLevel = CONFIG.FLOOR_Y - 5.0; // Center of voxel on the floor
            if (v.y < floorLevel) {
                v.y = floorLevel;
                v.vy *= -0.4; // Bounce damping
                v.vx *= 0.8; // Floor friction
                v.vz *= 0.8;
                
                // Stop small jitters
                if (Math.abs(v.vy) < 0.05) v.vy = 0;
            }
        });

        // 2. Voxel-Voxel Collisions (Spatial Grid)
        // Optimization: Create a simplified grid for O(N) neighbor lookup
        const gridSize = 1.5; // Roughly voxel size + buffer
        const grid = new Map<string, number[]>();

        this.voxels.forEach((v, i) => {
            const gx = Math.floor(v.x / gridSize);
            const gy = Math.floor(v.y / gridSize);
            const gz = Math.floor(v.z / gridSize);
            const key = `${gx},${gy},${gz}`;
            if (!grid.has(key)) grid.set(key, []);
            grid.get(key)!.push(i);
        });

        this.voxels.forEach((v, i) => {
             // Only process moving or slightly moving voxels to save cycles? 
             // For quality, we check all, but could optimize.
             const gx = Math.floor(v.x / gridSize);
             const gy = Math.floor(v.y / gridSize);
             const gz = Math.floor(v.z / gridSize);

             for (let x = gx - 1; x <= gx + 1; x++) {
                 for (let y = gy - 1; y <= gy + 1; y++) {
                     for (let z = gz - 1; z <= gz + 1; z++) {
                         const neighbors = grid.get(`${x},${y},${z}`);
                         if (!neighbors) continue;

                         for (const j of neighbors) {
                             if (i === j) continue;
                             const other = this.voxels[j];
                             
                             const dx = v.x - other.x;
                             const dy = v.y - other.y;
                             const dz = v.z - other.z;
                             const distSq = dx*dx + dy*dy + dz*dz;
                             const minDist = 0.95; // 1.0 is touching, 0.95 allows slight overlap for stability

                             if (distSq < minDist * minDist && distSq > 0.0001) {
                                 const dist = Math.sqrt(distSq);
                                 const pen = (minDist - dist) * 0.5; // Half penetration correction
                                 const nx = dx / dist;
                                 const ny = dy / dist;
                                 const nz = dz / dist;

                                 // Position Correction (Projection)
                                 v.x += nx * pen; v.y += ny * pen; v.z += nz * pen;
                                 other.x -= nx * pen; other.y -= ny * pen; other.z -= nz * pen;

                                 // Velocity Exchange (Impulse)
                                 const relVel = (v.vx - other.vx)*nx + (v.vy - other.vy)*ny + (v.vz - other.vz)*nz;
                                 if (relVel < 0) {
                                     const restitution = 0.2; // Not too bouncy
                                     const jVal = -(1 + restitution) * relVel;
                                     // Equal mass
                                     const impulse = jVal * 0.5;
                                     v.vx += impulse * nx; v.vy += impulse * ny; v.vz += impulse * nz;
                                     other.vx -= impulse * nx; other.vy -= impulse * ny; other.vz -= impulse * nz;
                                     
                                     // Friction (tangential)
                                     v.vx *= 0.95; other.vx *= 0.95;
                                     v.vz *= 0.95; other.vz *= 0.95;
                                 }
                             }
                         }
                     }
                 }
             }
        });

    } else if (this.state === AppState.REBUILDING) {
        const now = Date.now();
        const elapsed = now - this.rebuildStartTime;
        let allDone = true;

        this.voxels.forEach((v, i) => {
            const t = this.rebuildTargets[i];
            if (t.isRubble) return;
            if (elapsed < t.delay) {
                allDone = false;
                return;
            }
            const speed = 1 - Math.pow(0.001, deltaTime);
            v.x += (t.x - v.x) * speed;
            v.y += (t.y - v.y) * speed;
            v.z += (t.z - v.z) * speed;
            v.rx += (0 - v.rx) * speed;
            v.ry += (0 - v.ry) * speed;
            v.rz += (0 - v.rz) * speed;
            if ((t.x - v.x) ** 2 + (t.y - v.y) ** 2 + (t.z - v.z) ** 2 > 0.001) {
                allDone = false;
            } else {
                v.x = t.x; v.y = t.y; v.z = t.z;
                v.rx = 0; v.ry = 0; v.rz = 0;
            }
        });

        if (allDone) {
            this.state = AppState.STABLE;
            this.onStateChange(this.state);
            this.loadInitialModel(this.getCurrentVoxelData());
        }
    }
  }

  // --- Render Loop ---
  private animate() {
    this.animationId = requestAnimationFrame(this.animate);
    
    const now = performance.now();
    const deltaTime = this.lastTime ? (now - this.lastTime) / 1000 : 0.016;
    this.lastTime = now;

    // Interpolate X/Z and Y at constant speed so movement is smooth in all axes
    const dx = this.targetPlayerPos.x - this.currentPlayerPos.x;
    const dz = this.targetPlayerPos.z - this.currentPlayerPos.z;
    const distXZ = Math.sqrt(dx * dx + dz * dz);

    // Smoothly interpolate Y (surface height) to avoid snapping on terrain steps
    const dy = this.targetPlayerPos.y - this.currentPlayerPos.y;
    const absdy = Math.abs(dy);
    if (absdy > VoxelEngine.ANALOG_MOVE_CONVERGE_THRESHOLD) {
      const stepY = VoxelEngine.PLAYER_MOVE_SPEED * deltaTime;
      this.currentPlayerPos.y = stepY >= absdy
        ? this.targetPlayerPos.y
        : this.currentPlayerPos.y + Math.sign(dy) * stepY;
    } else {
      this.currentPlayerPos.y = this.targetPlayerPos.y;
    }
    if (distXZ > VoxelEngine.ANALOG_MOVE_CONVERGE_THRESHOLD) {
      const step = VoxelEngine.PLAYER_MOVE_SPEED * deltaTime;
      if (step >= distXZ) {
        this.currentPlayerPos.x = this.targetPlayerPos.x;
        this.currentPlayerPos.z = this.targetPlayerPos.z;
      } else {
        this.currentPlayerPos.x += (dx / distXZ) * step;
        this.currentPlayerPos.z += (dz / distXZ) * step;
      }
    } else {
      this.currentPlayerPos.x = this.targetPlayerPos.x;
      this.currentPlayerPos.z = this.targetPlayerPos.z;
    }
    this.entities.player.group.position.copy(this.currentPlayerPos);
    this.entities.player.setMoving(
      this.requestedPlayerMoving || distXZ > VoxelEngine.ANALOG_MOVE_CONVERGE_THRESHOLD
    );

    // Smoothly interpolate rotation
    const rotationLerpFactor = 1 - Math.pow(0.000001, deltaTime);
    let diff = this.targetRotationY - this.entities.player.group.rotation.y;
    while (diff < -Math.PI) diff += Math.PI * 2;
    while (diff > Math.PI) diff -= Math.PI * 2;
    this.entities.player.group.rotation.y += diff * Math.min(rotationLerpFactor, 0.5);

    this.updateCameraFollow(deltaTime);
    this.updateCelestialAnchors();
    this.updateIntroAnimation();
    this.enforceCameraBounds();
    this.controls.update();
    this.physicsWorld.step(1 / 60, deltaTime, 3);
    this.updatePhysics(deltaTime);
    this.entities.update(deltaTime, this.time);
    
    if (this.targetIndicator.visible) {
      this.targetIndicator.scale.setScalar(1 + Math.sin(Date.now() * 0.01) * 0.1);
      this.targetIndicator.rotation.z += deltaTime;
    }

    this.draw();
    this.renderer.render(this.scene, this.camera);
  }

  public handleResize() {
    if (this.camera && this.renderer && this.container) {
      const width = this.container.clientWidth;
      const height = this.container.clientHeight;
      this.camera.aspect = width / height;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(width, height);
    }
  }
  
  public setAutoRotate(enabled: boolean) {
    if (this.controls) {
        this.controls.autoRotate = enabled;
    }
  }

  public getJsonData(): string {
      const voxels = this.voxels.map((v, i) => ({
          id: i,
          x: +v.x.toFixed(2),
          y: +v.y.toFixed(2),
          z: +v.z.toFixed(2),
          c: '#' + v.color.getHexString()
      }));
      return JSON.stringify({ voxels }, null, 2);
  }
  
  public async exportGLTF(): Promise<Blob> {
      return new Promise(async (resolve, reject) => {
          try {
              const { GLTFExporter } = await import('three/examples/jsm/exporters/GLTFExporter.js');
              const { mergeGeometries } = await import('three/examples/jsm/utils/BufferGeometryUtils.js');

              const geometries: THREE.BufferGeometry[] = [];
              const baseGeom = new THREE.BoxGeometry(CONFIG.VOXEL_SIZE, CONFIG.VOXEL_SIZE, CONFIG.VOXEL_SIZE);
              
              this.voxels.forEach(v => {
                  const geom = baseGeom.clone();
                  
                  const matrix = new THREE.Matrix4();
                  matrix.makeRotationFromEuler(new THREE.Euler(v.rx, v.ry, v.rz));
                  matrix.setPosition(v.x, v.y, v.z);
                  geom.applyMatrix4(matrix);
                  
                  const colors = [];
                  for (let i = 0; i < geom.attributes.position.count; i++) {
                      colors.push(v.color.r, v.color.g, v.color.b);
                  }
                  geom.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
                  
                  geometries.push(geom);
              });

              const mergedGeometry = mergeGeometries(geometries, false);
              const material = new THREE.MeshStandardMaterial({ 
                  roughness: 0.8, 
                  metalness: 0.1,
                  vertexColors: true 
              });
              const mesh = new THREE.Mesh(mergedGeometry, material);

              const exporter = new GLTFExporter();
              exporter.parse(
                  mesh,
                  (gltf) => {
                      if (gltf instanceof ArrayBuffer) {
                          resolve(new Blob([gltf], { type: 'model/gltf-binary' }));
                      } else {
                          const str = JSON.stringify(gltf);
                          resolve(new Blob([str], { type: 'text/plain' }));
                      }
                  },
                  (error) => reject(error),
                  { binary: true }
              );
          } catch (err) {
              reject(err);
          }
      });
  }

  public async exportPLY(): Promise<Blob> {
      return new Promise(async (resolve, reject) => {
          try {
              const { PLYExporter } = await import('three/examples/jsm/exporters/PLYExporter.js');
              const { mergeGeometries } = await import('three/examples/jsm/utils/BufferGeometryUtils.js');

              const geometries: THREE.BufferGeometry[] = [];
              const baseGeom = new THREE.BoxGeometry(CONFIG.VOXEL_SIZE, CONFIG.VOXEL_SIZE, CONFIG.VOXEL_SIZE);
              
              this.voxels.forEach(v => {
                  const geom = baseGeom.clone();
                  const matrix = new THREE.Matrix4();
                  matrix.makeRotationFromEuler(new THREE.Euler(v.rx, v.ry, v.rz));
                  matrix.setPosition(v.x, v.y, v.z);
                  geom.applyMatrix4(matrix);
                  
                  const colors = [];
                  for (let i = 0; i < geom.attributes.position.count; i++) {
                      colors.push(v.color.r, v.color.g, v.color.b);
                  }
                  geom.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
                  
                  geometries.push(geom);
              });

              const mergedGeometry = mergeGeometries(geometries, false);
              const material = new THREE.MeshStandardMaterial({ vertexColors: true });
              const mesh = new THREE.Mesh(mergedGeometry, material);

              const exporter = new PLYExporter();
              exporter.parse(
                  mesh,
                  (ply) => {
                      if (ply instanceof ArrayBuffer) {
                          resolve(new Blob([ply], { type: 'application/octet-stream' }));
                      } else {
                          resolve(new Blob([ply], { type: 'text/plain' }));
                      }
                  },
                  { binary: true }
              );
          } catch (err) {
              reject(err);
          }
      });
  }

  public getObjData(): string {
      let output = "# Voxel Architect Export\n";
      output += "o VoxelModel\n";
      
      let vertOffset = 1;
      const s = 0.5; // Half size for 1x1x1 cube
      
      // Vertices for a unit cube centered at 0,0,0
      const baseVerts = [
          {x:-s, y:-s, z: s}, {x: s, y:-s, z: s}, {x:-s, y: s, z: s}, {x: s, y: s, z: s}, // Front
          {x:-s, y:-s, z:-s}, {x: s, y:-s, z:-s}, {x:-s, y: s, z:-s}, {x: s, y: s, z:-s}  // Back
      ];
      
      // Faces (indices into baseVerts, 0-based)
      // Front, Back, Top, Bottom, Left, Right
      const faces = [
          [0, 1, 3, 2], // Front
          [5, 4, 6, 7], // Back
          [2, 3, 7, 6], // Top
          [4, 5, 1, 0], // Bottom
          [4, 0, 2, 6], // Left
          [1, 5, 7, 3]  // Right
      ];
  
      this.voxels.forEach(v => {
          // Write vertices with colors
          const { r, g, b } = v.color;
          
          for(let i=0; i<8; i++) {
              const vx = v.x + baseVerts[i].x;
              const vy = v.y + baseVerts[i].y;
              const vz = v.z + baseVerts[i].z;
              // OBJ with vertex colors: v x y z r g b
              output += `v ${vx.toFixed(4)} ${vy.toFixed(4)} ${vz.toFixed(4)} ${r.toFixed(3)} ${g.toFixed(3)} ${b.toFixed(3)}\n`;
          }
          
          // Write faces
          for(let i=0; i<6; i++) {
              const f = faces[i];
              output += `f ${f[0]+vertOffset} ${f[1]+vertOffset} ${f[2]+vertOffset} ${f[3]+vertOffset}\n`;
          }
          
          vertOffset += 8;
      });
      
      return output;
  }
  
  public setTotalVoxelCount(targetCount: number) {
    if (targetCount < 0) return;
    
    const currentCount = this.voxels.length;
    const diff = targetCount - currentCount;
    
    if (diff === 0) return;
    
    if (diff > 0) {
        // Add new voxels
        const newVoxels: SimulationVoxel[] = [];
        const palette = Object.values(COLORS);
        
        for (let i = 0; i < diff; i++) {
            // Spawn in a grid/cloud above the scene
            const x = (Math.random() - 0.5) * 20;
            const z = (Math.random() - 0.5) * 20;
            const y = 20 + Math.random() * 10;
            
            const color = palette[Math.floor(Math.random() * palette.length)];
            const { r, g, b } = new THREE.Color(color);
            
            newVoxels.push({
                id: Math.floor(Math.random() * 1000000),
                x, y, z,
                vx: 0, vy: 0, vz: 0,
                color: new THREE.Color(r, g, b),
                rx: 0, ry: 0, rz: 0,
                rvx: 0, rvy: 0, rvz: 0,
            } as SimulationVoxel);
        }
        
        this.voxels = [...this.voxels, ...newVoxels];
    } else {
        // Remove voxels (remove from end)
        this.voxels = this.voxels.slice(0, targetCount);
    }
    
    // Update mesh
    this.createVoxels(this.voxels as unknown as VoxelData[]);
    this.onCountChange(this.voxels.length);
    
    // If we are in STABLE mode, we should probably let them fall or just stay there?
    // If we add them high up, they will just float until physics runs.
    // Let's wake up physics if we added blocks.
    if (diff > 0 && this.state === AppState.STABLE) {
        // Optional: Switch to DISMANTLING to let them fall?
        // Or just let them float. Floating is fine for "Toy Box".
        // But maybe users expect them to fall.
        // Let's leave state as is. If user clicks "Gravity", they fall.
    }
  }

  public getUniqueColors(): string[] {
    const colors = new Set<string>();
    this.voxels.forEach(v => {
        colors.add('#' + v.color.getHexString());
    });
    return Array.from(colors);
  }

  public cleanup() {
    cancelAnimationFrame(this.animationId);
    this.container.removeEventListener('pointermove', this.boundPointerMove);
    this.container.removeEventListener('pointerdown', this.boundPointerDown);
    this.container.removeEventListener('pointerleave', this.boundPointerLeave);
    if (this.container && this.renderer.domElement.parentElement === this.container) {
      this.container.removeChild(this.renderer.domElement);
    }
    this.renderer.dispose();
    this.scene.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        object.geometry.dispose();
        if (Array.isArray(object.material)) {
          object.material.forEach((m) => m.dispose());
        } else {
          object.material.dispose();
        }
      }
    });
  }
}
