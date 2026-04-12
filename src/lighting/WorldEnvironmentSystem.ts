import * as THREE from 'three';
import { getCelestialPosition, getDaylightFactor, isDaytime } from './dayNightCycle';

const FOG_NEAR_DAY = 120;
const FOG_FAR_DAY = 280;
const FOG_NEAR_NIGHT = 80;
const FOG_FAR_NIGHT = 220;
const SUN_DISTANCE = 150;
const SHADOW_CAMERA_HALF_EXTENT = 90;

export class WorldEnvironmentSystem {
  private scene: THREE.Scene;
  private floor: THREE.Mesh;
  private renderer: THREE.WebGLRenderer;
  private ambientLight: THREE.AmbientLight;
  private hemiLight: THREE.HemisphereLight;
  private dirLight: THREE.DirectionalLight;
  private skyDome: THREE.Mesh;
  private sunMesh: THREE.Mesh;
  private moonMesh: THREE.Mesh;

  private targetBgColor = new THREE.Color(0xe2e8f0);
  private currentBgColor = new THREE.Color(0xe2e8f0);
  private targetFogColor = new THREE.Color(0xe2e8f0);
  private currentFogColor = new THREE.Color(0xe2e8f0);
  private targetLightColor = new THREE.Color(0xfff5e0);
  private currentLightColor = new THREE.Color(0xfff5e0);
  private targetAmbientIntensity = 0.8;
  private currentAmbientIntensity = 0.8;
  private targetHemiIntensity = 0.35;
  private currentHemiIntensity = 0.35;
  private targetDirIntensity = 1.2;
  private currentDirIntensity = 1.2;
  private targetFogNear = FOG_NEAR_DAY;
  private currentFogNear = FOG_NEAR_DAY;
  private targetFogFar = FOG_FAR_DAY;
  private currentFogFar = FOG_FAR_DAY;
  private timeOfDay = 12;
  private focus = new THREE.Vector3();

  constructor(scene: THREE.Scene, floor: THREE.Mesh, renderer: THREE.WebGLRenderer) {
    this.scene = scene;
    this.floor = floor;
    this.renderer = renderer;

    this.ambientLight = new THREE.AmbientLight(0xffffff, this.currentAmbientIntensity);
    this.scene.add(this.ambientLight);

    this.hemiLight = new THREE.HemisphereLight(0x87ceeb, 0x3d2817, this.currentHemiIntensity);
    this.scene.add(this.hemiLight);

    this.dirLight = new THREE.DirectionalLight(0xfff5e0, this.currentDirIntensity);
    this.dirLight.castShadow = true;
    this.dirLight.shadow.mapSize.width = 4096;
    this.dirLight.shadow.mapSize.height = 4096;
    this.dirLight.shadow.camera.near = 0.5;
    this.dirLight.shadow.camera.far = 400;
    this.dirLight.shadow.bias = -0.0001;
    this.dirLight.shadow.normalBias = 0.04;
    this.dirLight.shadow.radius = 2.2;
    this.scene.add(this.dirLight);
    this.scene.add(this.dirLight.target);

    this.sunMesh = this.createCelestialBody(4, 0xffdd44, 0.95);
    this.moonMesh = this.createCelestialBody(2.8, 0xccccff, 0.7);
    this.scene.add(this.sunMesh);
    this.scene.add(this.moonMesh);

    const skyGeom = new THREE.SphereGeometry(900, 32, 32);
    const skyMat = new THREE.MeshBasicMaterial({ color: this.currentBgColor, side: THREE.BackSide, fog: false });
    this.skyDome = new THREE.Mesh(skyGeom, skyMat);
    this.scene.add(this.skyDome);

    this.scene.fog = new THREE.Fog(this.currentFogColor, this.currentFogNear, this.currentFogFar);
  }

  getDirectionalLight() {
    return this.dirLight;
  }

  update(timeOfDay: number, focus: THREE.Vector3, dt: number) {
    this.timeOfDay = timeOfDay;
    this.focus.copy(focus);

    this.calculateTargets(timeOfDay);
    this.interpolate(dt);
    this.updateCelestials();
    this.updateDirectionalLightRig();
  }

  private createCelestialBody(radius: number, color: number, opacity: number) {
    const geometry = new THREE.SphereGeometry(radius, 24, 24);
    const material = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity,
      fog: false,
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.renderOrder = 999;
    return mesh;
  }

  private calculateTargets(timeOfDay: number) {
    const daylightFactor = getDaylightFactor(timeOfDay);
    const isNight = daylightFactor <= 0;

    if (isNight) {
      this.targetBgColor.setHex(0x050510);
      this.targetFogColor.setHex(0x050510);
      this.targetLightColor.setHex(0x6688ff);
      this.targetFogNear = FOG_NEAR_NIGHT;
      this.targetFogFar = FOG_FAR_NIGHT;
      this.targetAmbientIntensity = 0.42;
      this.targetHemiIntensity = 0.18;
      this.targetDirIntensity = 0.32;
    } else {
      const daylightBlend = 0.35 + daylightFactor * 0.65;
      const dawnBlend = Math.max(0, 1 - daylightFactor * 2.2);

      this.targetBgColor.setHex(dawnBlend > 0.05 ? 0xffc58f : 0xe2e8f0);
      if (!dawnBlend) {
        this.targetBgColor.setHex(0xe2e8f0);
      }
      this.targetFogColor.copy(this.targetBgColor);
      this.targetLightColor.setHex(dawnBlend > 0.05 ? 0xffcd75 : 0xfff5e0);
      this.targetFogNear = FOG_NEAR_DAY;
      this.targetFogFar = FOG_FAR_DAY;
      this.targetAmbientIntensity = 0.45 + daylightBlend * 0.45;
      this.targetHemiIntensity = 0.2 + daylightBlend * 0.35;
      this.targetDirIntensity = 0.55 + daylightFactor * 0.95;
    }
  }

  private interpolate(dt: number) {
    const colorLerp = Math.min(1, dt * 2.4);
    const fogLerp = Math.min(1, dt * 2.8);
    const intensityLerp = Math.min(1, dt * 2.2);

    this.currentBgColor.lerp(this.targetBgColor, colorLerp);
    this.currentFogColor.lerp(this.targetFogColor, fogLerp);
    this.currentLightColor.lerp(this.targetLightColor, colorLerp);
    this.currentFogNear = THREE.MathUtils.lerp(this.currentFogNear, this.targetFogNear, fogLerp);
    this.currentFogFar = THREE.MathUtils.lerp(this.currentFogFar, this.targetFogFar, fogLerp);
    this.currentAmbientIntensity = THREE.MathUtils.lerp(this.currentAmbientIntensity, this.targetAmbientIntensity, intensityLerp);
    this.currentHemiIntensity = THREE.MathUtils.lerp(this.currentHemiIntensity, this.targetHemiIntensity, intensityLerp);
    this.currentDirIntensity = THREE.MathUtils.lerp(this.currentDirIntensity, this.targetDirIntensity, intensityLerp);

    const skyMaterial = this.skyDome.material as THREE.MeshBasicMaterial;
    skyMaterial.color.copy(this.currentBgColor);

    if (this.scene.fog instanceof THREE.Fog) {
      this.scene.fog.color.copy(this.currentFogColor);
      this.scene.fog.near = this.currentFogNear;
      this.scene.fog.far = this.currentFogFar;
    } else {
      this.scene.fog = new THREE.Fog(this.currentFogColor, this.currentFogNear, this.currentFogFar);
    }

    this.ambientLight.color.copy(this.currentLightColor);
    this.ambientLight.intensity = this.currentAmbientIntensity;
    this.hemiLight.intensity = this.currentHemiIntensity;
    this.dirLight.color.copy(this.currentLightColor);
    this.dirLight.intensity = this.currentDirIntensity;
    (this.floor.material as THREE.MeshBasicMaterial).color.copy(this.currentFogColor);
  }

  private updateCelestials() {
    const sunPos = getCelestialPosition(this.timeOfDay, SUN_DISTANCE);
    const moonPos = getCelestialPosition(this.timeOfDay + 12, SUN_DISTANCE);
    const day = isDaytime(this.timeOfDay);

    this.sunMesh.position.set(this.focus.x + sunPos.x, sunPos.y, this.focus.z + sunPos.z);
    this.moonMesh.position.set(this.focus.x + moonPos.x, moonPos.y, this.focus.z + moonPos.z);
    this.sunMesh.visible = day;
    this.moonMesh.visible = !day;
  }

  private updateDirectionalLightRig() {
    const activeBody = isDaytime(this.timeOfDay) ? this.sunMesh.position : this.moonMesh.position;
    this.dirLight.position.copy(activeBody);
    this.dirLight.target.position.set(this.focus.x, 0, this.focus.z);
    this.dirLight.target.updateMatrixWorld();

    const shadowCamera = this.dirLight.shadow.camera as THREE.OrthographicCamera;
    shadowCamera.left = -SHADOW_CAMERA_HALF_EXTENT;
    shadowCamera.right = SHADOW_CAMERA_HALF_EXTENT;
    shadowCamera.top = SHADOW_CAMERA_HALF_EXTENT;
    shadowCamera.bottom = -SHADOW_CAMERA_HALF_EXTENT;
    shadowCamera.updateProjectionMatrix();

    this.dirLight.castShadow = isDaytime(this.timeOfDay);
    this.dirLight.updateMatrixWorld();
  }
}
