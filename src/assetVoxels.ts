import playerHouseAsset from '../assets/Playerhouse.json';
import licensingOfficeAsset from '../assets/licensing office.json';
import unionHallAsset from '../assets/union hall.json';
import inspectorHqAsset from '../assets/inspectors hq.json';
import fixerDenAsset from '../assets/fixers den.json';
import chiefHutAsset from "../assets/chief's hut.json";
import hotlineBoothAsset from '../assets/hotline booth.json';
import genericHouseAAsset from '../assets/generic house a.json';
import genericHouseBAsset from '../assets/generic house b.json';
import genericHouseCAsset from '../assets/generic house c.json';
import genericHouseDAsset from '../assets/generic house d.json';
import parkAsset from '../assets/park.json';
import cityHallAsset from '../assets/cityhall.json';
import libraryAsset from '../assets/liberary.json';
import fireStationAsset from '../assets/firestation.json';
import policeStationAsset from '../assets/police station.json';
import houseTypeAAsset from '../assets/housetype A.json';

type AssetVoxel = {
  id: number;
  x: number;
  y: number;
  z: number;
  c: string;
};

type AssetFile = {
  voxels: AssetVoxel[];
};

const normalizeAssetVoxels = (asset: AssetFile) => {
  const voxels = asset.voxels ?? [];
  if (voxels.length === 0) {
    return [];
  }

  const bounds = voxels.reduce(
    (result, voxel) => ({
      minX: Math.min(result.minX, voxel.x),
      maxX: Math.max(result.maxX, voxel.x),
      minZ: Math.min(result.minZ, voxel.z),
      maxZ: Math.max(result.maxZ, voxel.z),
      minHeight: Math.min(result.minHeight, voxel.y),
    }),
    {
      minX: Number.POSITIVE_INFINITY,
      maxX: Number.NEGATIVE_INFINITY,
      minZ: Number.POSITIVE_INFINITY,
      maxZ: Number.NEGATIVE_INFINITY,
      minHeight: Number.POSITIVE_INFINITY,
    }
  );

  const centerX = Math.round((bounds.minX + bounds.maxX) / 2);
  const centerZ = Math.round((bounds.minZ + bounds.maxZ) / 2);

  return voxels.map((voxel, index) => ({
    id: index,
    x: voxel.x - centerX,
    y: voxel.z - centerZ,
    z: voxel.y - bounds.minHeight,
    c: voxel.c,
  }));
};

const scaleNormalizedAssetVoxels = (
  voxels: ReturnType<typeof normalizeAssetVoxels>,
  footprintScale: number,
  heightScale: number = footprintScale
) => {
  const scaled = new Map<string, { id: number; x: number; y: number; z: number; c: string }>();

  voxels.forEach((voxel) => {
    const nextVoxel = {
      ...voxel,
      x: Math.round(voxel.x * footprintScale),
      y: Math.round(voxel.y * footprintScale),
      z: Math.max(0, Math.round(voxel.z * heightScale)),
    };
    scaled.set(`${nextVoxel.x}:${nextVoxel.y}:${nextVoxel.z}`, nextVoxel);
  });

  return Array.from(scaled.values()).map((voxel, index) => ({
    ...voxel,
    id: index,
  }));
};

export const PLAYER_HOUSE_ASSET_VOXELS = scaleNormalizedAssetVoxels(
  normalizeAssetVoxels(playerHouseAsset),
  0.8,
  0.84
);
export const LICENSING_OFFICE_ASSET_VOXELS = normalizeAssetVoxels(licensingOfficeAsset);
export const UNION_HALL_ASSET_VOXELS = normalizeAssetVoxels(unionHallAsset);
export const INSPECTOR_HQ_ASSET_VOXELS = normalizeAssetVoxels(inspectorHqAsset);
export const FIXER_DEN_ASSET_VOXELS = normalizeAssetVoxels(fixerDenAsset);
export const CHIEF_HUT_ASSET_VOXELS = normalizeAssetVoxels(chiefHutAsset);
export const HOTLINE_BOOTH_ASSET_VOXELS = normalizeAssetVoxels(hotlineBoothAsset);
export const GENERIC_HOUSE_A_ASSET_VOXELS = scaleNormalizedAssetVoxels(normalizeAssetVoxels(genericHouseAAsset), 0.84, 0.88);
export const GENERIC_HOUSE_B_ASSET_VOXELS = scaleNormalizedAssetVoxels(normalizeAssetVoxels(genericHouseBAsset), 0.84, 0.88);
export const GENERIC_HOUSE_C_ASSET_VOXELS = scaleNormalizedAssetVoxels(normalizeAssetVoxels(genericHouseCAsset), 0.84, 0.88);
export const GENERIC_HOUSE_D_ASSET_VOXELS = scaleNormalizedAssetVoxels(normalizeAssetVoxels(genericHouseDAsset), 0.84, 0.88);
export const PARK_ASSET_VOXELS = normalizeAssetVoxels(parkAsset);
export const CITY_HALL_ASSET_VOXELS = normalizeAssetVoxels(cityHallAsset);
export const LIBRARY_ASSET_VOXELS = normalizeAssetVoxels(libraryAsset);
export const FIRE_STATION_ASSET_VOXELS = normalizeAssetVoxels(fireStationAsset);
export const POLICE_STATION_ASSET_VOXELS = normalizeAssetVoxels(policeStationAsset);
export const HOUSE_TYPE_A_ASSET_VOXELS = normalizeAssetVoxels(houseTypeAAsset);
