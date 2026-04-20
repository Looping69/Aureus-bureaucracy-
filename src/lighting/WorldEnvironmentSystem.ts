import * as THREE from 'three';
import { WeatherState } from '../types';
import { getCelestialPosition, getDaylightFactor, getMoonlightFactor, getTwilightFactor, isDaytime } from './dayNightCycle';

const SUN_DISTANCE = 150;
const SHADOW_CAMERA_HALF_EXTENT = 90;
const PRECIPITATION_COUNT = 900;
const PRECIPITATION_BASE_SPREAD = 22;
const PRECIPITATION_STORM_SPREAD = 28;
const PRECIPITATION_MIN_HEIGHT = 10;
const PRECIPITATION_MAX_HEIGHT = 34;

export class WorldEnvironmentSystem {
  private scene: THREE.Scene;
  private floor: THREE.Mesh;
  private ambientLight: THREE.AmbientLight;
  private hemiLight: THREE.HemisphereLight;
  private dirLight: THREE.DirectionalLight;
  private skyDome: THREE.Mesh;
  private sunMesh: THREE.Mesh;
  private moonMesh: THREE.Mesh;
  private precipitationSystem: THREE.InstancedMesh;
  private precipitationDummy = new THREE.Object3D();

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
  private targetFogNear = 130;
  private currentFogNear = 130;
  private targetFogFar = 320;
  private currentFogFar = 320;
  private timeOfDay = 12;
  private weather: WeatherState = {
    current: 'CLEAR',
    timeLeft: 4,
    intensity: 0.1,
  };
  private focus = new THREE.Vector3();
  private lightningFlash = 0;
  private precipitationActive = false;

  constructor(scene: THREE.Scene, floor: THREE.Mesh, _renderer: THREE.WebGLRenderer) {
    this.scene = scene;
    this.floor = floor;

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

    this.precipitationSystem = this.createPrecipitationSystem();
    this.scene.add(this.precipitationSystem);

    const skyGeom = new THREE.SphereGeometry(900, 32, 32);
    const skyMat = new THREE.MeshBasicMaterial({ color: this.currentBgColor, side: THREE.BackSide, fog: false });
    this.skyDome = new THREE.Mesh(skyGeom, skyMat);
    this.scene.add(this.skyDome);

    this.scene.fog = new THREE.Fog(this.currentFogColor, this.currentFogNear, this.currentFogFar);
  }

  getDirectionalLight() {
    return this.dirLight;
  }

  update(timeOfDay: number, weather: WeatherState, focus: THREE.Vector3, dt: number) {
    this.timeOfDay = timeOfDay;
    this.weather = weather;
    this.focus.copy(focus);
    this.lightningFlash = Math.max(0, this.lightningFlash - dt * 2.4);
    if (weather.current === 'STORM' && Math.random() < dt * (0.18 + weather.intensity * 0.22)) {
      this.lightningFlash = 1;
    }

    this.calculateTargets(timeOfDay, weather);
    this.interpolate(dt);
    this.updateCelestials();
    this.updateDirectionalLightRig();
    this.updatePrecipitation(dt);
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

  private createPrecipitationSystem() {
    const geometry = new THREE.BoxGeometry(0.12, 2.4, 0.12);
    const material = new THREE.MeshBasicMaterial({
      color: 0x8fcbff,
      transparent: true,
      opacity: 0.7,
      fog: false,
    });
    const mesh = new THREE.InstancedMesh(geometry, material, PRECIPITATION_COUNT);
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    mesh.visible = false;
    mesh.frustumCulled = false;

    for (let index = 0; index < PRECIPITATION_COUNT; index += 1) {
      this.resetPrecipitationParticle(mesh, index, true);
    }

    return mesh;
  }

  private resetPrecipitationParticle(mesh: THREE.InstancedMesh, index: number, randomizeHeight: boolean) {
    const spread = this.weather.current === 'STORM' ? PRECIPITATION_STORM_SPREAD : PRECIPITATION_BASE_SPREAD;
    this.precipitationDummy.position.set(
      this.focus.x + ((Math.random() - 0.5) * spread * 2),
      (randomizeHeight ? Math.random() : 1) * (PRECIPITATION_MAX_HEIGHT - PRECIPITATION_MIN_HEIGHT) + PRECIPITATION_MIN_HEIGHT,
      this.focus.z + ((Math.random() - 0.5) * spread * 2),
    );
    this.precipitationDummy.scale.setScalar(this.weather.current === 'STORM' ? 1.2 : 1);
    this.precipitationDummy.updateMatrix();
    mesh.setMatrixAt(index, this.precipitationDummy.matrix);
  }

  private calculateTargets(timeOfDay: number, weather: WeatherState) {
    const daylightFactor = getDaylightFactor(timeOfDay);
    const moonlightFactor = getMoonlightFactor(timeOfDay);
    const twilightFactor = getTwilightFactor(timeOfDay);

    const nightBg = new THREE.Color(0x050816);
    const dawnBg = new THREE.Color(0xffb36b);
    const dayBg = new THREE.Color(0xa7d8ff);
    const nightFog = new THREE.Color(0x070b18);
    const dawnFog = new THREE.Color(0xe6a368);
    const dayFog = new THREE.Color(0xd6edf8);
    const nightLight = new THREE.Color(0x7da6ff);
    const dawnLight = new THREE.Color(0xffd08a);
    const dayLight = new THREE.Color(0xfffbef);

    this.targetBgColor.copy(nightBg).lerp(dawnBg, twilightFactor).lerp(dayBg, daylightFactor);
    this.targetFogColor.copy(nightFog).lerp(dawnFog, twilightFactor).lerp(dayFog, daylightFactor);
    this.targetLightColor.copy(nightLight).lerp(dawnLight, twilightFactor).lerp(dayLight, daylightFactor);
    this.targetFogNear = THREE.MathUtils.lerp(85, 140, daylightFactor + twilightFactor * 0.4);
    this.targetFogFar = THREE.MathUtils.lerp(220, 320, daylightFactor + twilightFactor * 0.4);
    this.targetAmbientIntensity = 0.18 + (moonlightFactor * 0.2) + (daylightFactor * 0.62) + (twilightFactor * 0.14);
    this.targetHemiIntensity = 0.1 + (moonlightFactor * 0.16) + (daylightFactor * 0.36) + (twilightFactor * 0.14);
    this.targetDirIntensity = 0.16 + (moonlightFactor * 0.18) + (daylightFactor * 1.08) + (twilightFactor * 0.22);

    switch (weather.current) {
      case 'CLOUDY':
        this.targetBgColor.lerp(new THREE.Color(0x93a6bb), 0.35 * weather.intensity);
        this.targetFogColor.lerp(new THREE.Color(0xb6c2d0), 0.3 * weather.intensity);
        this.targetDirIntensity *= 0.82;
        this.targetHemiIntensity *= 0.9;
        break;
      case 'RAIN':
        this.targetBgColor.lerp(new THREE.Color(0x516478), 0.6 * weather.intensity);
        this.targetFogColor.lerp(new THREE.Color(0x73869c), 0.55 * weather.intensity);
        this.targetLightColor.lerp(new THREE.Color(0xd8e8ff), 0.35);
        this.targetFogNear *= 0.82;
        this.targetFogFar *= 0.84;
        this.targetDirIntensity *= 0.74;
        break;
      case 'STORM':
        this.targetBgColor.lerp(new THREE.Color(0x1d2536), 0.9);
        this.targetFogColor.lerp(new THREE.Color(0x2f3a4f), 0.85);
        this.targetLightColor.lerp(new THREE.Color(0xd8e1ff), 0.55);
        this.targetFogNear *= 0.68;
        this.targetFogFar *= 0.72;
        this.targetAmbientIntensity *= 0.92;
        this.targetDirIntensity *= 0.58;
        break;
      case 'DUST_STORM':
        this.targetBgColor.lerp(new THREE.Color(0xb06a2b), 0.82);
        this.targetFogColor.lerp(new THREE.Color(0xd28e4b), 0.9);
        this.targetLightColor.lerp(new THREE.Color(0xffc37a), 0.45);
        this.targetFogNear = 65;
        this.targetFogFar = 155;
        this.targetAmbientIntensity *= 1.08;
        this.targetDirIntensity *= 0.62;
        break;
      case 'ACID_RAIN':
        this.targetBgColor.lerp(new THREE.Color(0x183218), 0.86);
        this.targetFogColor.lerp(new THREE.Color(0x3f6b2f), 0.88);
        this.targetLightColor.lerp(new THREE.Color(0xcfff78), 0.46);
        this.targetFogNear *= 0.7;
        this.targetFogFar *= 0.74;
        this.targetAmbientIntensity *= 0.98;
        this.targetDirIntensity *= 0.66;
        break;
      case 'HEATWAVE':
        this.targetBgColor.lerp(new THREE.Color(0xffc27a), 0.55 * weather.intensity);
        this.targetFogColor.lerp(new THREE.Color(0xf4c488), 0.65 * weather.intensity);
        this.targetLightColor.lerp(new THREE.Color(0xffe0a6), 0.38);
        this.targetFogNear = Math.max(this.targetFogNear, 120);
        this.targetFogFar = Math.min(this.targetFogFar + 10, 250);
        this.targetAmbientIntensity *= 1.06;
        this.targetDirIntensity *= 1.04;
        break;
      default:
        break;
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

    if (this.lightningFlash > 0) {
      const flashStrength = this.lightningFlash;
      this.currentLightColor.lerp(new THREE.Color(0xfafcff), flashStrength * 0.65);
      this.currentDirIntensity += flashStrength * 1.25;
      this.currentAmbientIntensity += flashStrength * 0.18;
    }

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
    const daylightFactor = getDaylightFactor(this.timeOfDay);
    const moonlightFactor = getMoonlightFactor(this.timeOfDay);

    this.sunMesh.position.set(this.focus.x + sunPos.x, sunPos.y, this.focus.z + sunPos.z);
    this.moonMesh.position.set(this.focus.x + moonPos.x, moonPos.y, this.focus.z + moonPos.z);
    this.sunMesh.visible = daylightFactor > 0.02;
    this.moonMesh.visible = moonlightFactor > 0.12;
    (this.sunMesh.material as THREE.MeshBasicMaterial).opacity = Math.min(0.95, 0.28 + daylightFactor * 0.7);
    (this.moonMesh.material as THREE.MeshBasicMaterial).opacity = Math.min(0.82, 0.2 + moonlightFactor * 0.5);
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

    this.dirLight.castShadow = getDaylightFactor(this.timeOfDay) > 0.32 && this.weather.current !== 'STORM';
    this.dirLight.updateMatrixWorld();
  }

  private updatePrecipitation(dt: number) {
    const rainyWeather =
      this.weather.current === 'RAIN' ||
      this.weather.current === 'STORM' ||
      this.weather.current === 'ACID_RAIN';
    this.precipitationSystem.visible = rainyWeather;
    if (rainyWeather && !this.precipitationActive) {
      for (let index = 0; index < this.precipitationSystem.count; index += 1) {
        this.resetPrecipitationParticle(this.precipitationSystem, index, true);
      }
      this.precipitationSystem.instanceMatrix.needsUpdate = true;
    }
    this.precipitationActive = rainyWeather;
    if (!rainyWeather) return;

    const material = this.precipitationSystem.material as THREE.MeshBasicMaterial;
    material.color.setHex(this.weather.current === 'ACID_RAIN' ? 0xb4ff59 : 0x96d7ff);
    material.opacity = this.weather.current === 'STORM' ? 0.92 : (0.62 + this.weather.intensity * 0.24);

    const fallSpeed =
      this.weather.current === 'STORM'
        ? 52
        : this.weather.current === 'ACID_RAIN'
          ? 44
          : 34;
    const spread = this.weather.current === 'STORM' ? PRECIPITATION_STORM_SPREAD : PRECIPITATION_BASE_SPREAD;

    for (let index = 0; index < this.precipitationSystem.count; index += 1) {
      this.precipitationSystem.getMatrixAt(index, this.precipitationDummy.matrix);
      this.precipitationDummy.matrix.decompose(
        this.precipitationDummy.position,
        this.precipitationDummy.quaternion,
        this.precipitationDummy.scale,
      );

      this.precipitationDummy.position.y -= fallSpeed * dt;
      this.precipitationDummy.position.x -= dt * (this.weather.current === 'STORM' ? 6 : 3);

      if (this.precipitationDummy.position.y < -4) {
        this.precipitationDummy.position.y = PRECIPITATION_MIN_HEIGHT + Math.random() * (PRECIPITATION_MAX_HEIGHT - PRECIPITATION_MIN_HEIGHT);
        this.precipitationDummy.position.x = this.focus.x + ((Math.random() - 0.5) * spread * 2);
        this.precipitationDummy.position.z = this.focus.z + ((Math.random() - 0.5) * spread * 2);
      }

      this.precipitationDummy.updateMatrix();
      this.precipitationSystem.setMatrixAt(index, this.precipitationDummy.matrix);
    }

    this.precipitationSystem.instanceMatrix.needsUpdate = true;
  }
}
