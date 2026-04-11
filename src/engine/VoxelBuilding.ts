import * as THREE from 'three';
import { VoxelData } from '../types';
import { VoxelObject } from './VoxelObject';

export class VoxelBuilding extends VoxelObject {
  public id: string;
  public name: string;

  constructor(
    id: string,
    name: string,
    voxels: { id: number, x: number, y: number, z: number, c: string }[],
    variation?: number | string,
    applyVariation: boolean = true
  ) {
    // Convert building voxels to VoxelData format
    // Generator uses Z for height, but engine uses Y
    let convertedVoxels: VoxelData[] = voxels.map(v => ({
      x: v.x,
      y: v.z, // Height
      z: v.y, // Depth
      color: parseInt(v.c.replace('#', '0x'), 16)
    }));

    if (applyVariation && variation !== undefined && name !== 'Your House') {
        convertedVoxels = VoxelBuilding.applyVariation(convertedVoxels, variation);
    }

    // Buildings use standard 1x1x1 voxels, not sub-voxels
    super(convertedVoxels, 1.0);
    this.id = id;
    this.name = name;
  }

  private static applyVariation(voxels: VoxelData[], variation: number | string): VoxelData[] {
    let seed = 0;
    const str = String(variation);
    for (let i = 0; i < str.length; i++) {
        seed = (seed << 5) - seed + str.charCodeAt(i);
        seed |= 0;
    }

    const random = () => {
        const x = Math.sin(seed++) * 10000;
        return x - Math.floor(x);
    };

    let maxY = -Infinity;
    const colorCounts = new Map<number, number>();

    voxels.forEach(v => {
        if (v.y > maxY) maxY = v.y;
        colorCounts.set(v.color, (colorCounts.get(v.color) || 0) + 1);
    });

    let wallColor = -1;
    let maxCount = 0;
    colorCounts.forEach((count, color) => {
        if (count > maxCount) {
            maxCount = count;
            wallColor = color;
        }
    });

    // Generate new colors
    const wallColorObj = new THREE.Color(wallColor);
    const hsl = { h: 0, s: 0, l: 0 };
    wallColorObj.getHSL(hsl);
    
    // Shift hue by up to 30 degrees, adjust lightness
    const newHue = (hsl.h + (random() * 0.2 - 0.1) + 1.0) % 1.0;
    const newLightness = Math.max(0.2, Math.min(0.8, hsl.l + (random() * 0.2 - 0.1)));
    const newWallColor = new THREE.Color().setHSL(newHue, hsl.s, newLightness).getHex();

    // Roof color variation
    const roofColorObj = new THREE.Color().setHSL(random(), 0.5 + random() * 0.5, 0.3 + random() * 0.4);
    const newRoofColor = roofColorObj.getHex();

    return voxels.map(v => {
        let newColor = v.color;
        
        if (v.color === wallColor) {
           newColor = newWallColor;
        }

        if (v.y === maxY) {
            newColor = newRoofColor;
        }

        return {
            ...v,
            color: newColor
        };
    }).filter(v => {
        // Randomly remove some wall voxels to create different window patterns
        if (v.color === newWallColor && v.y > 0 && v.y < maxY && random() > 0.95) {
            return false;
        }
        return true;
    });
  }
}
