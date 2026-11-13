import { CustomMapConfig } from '../types/game';

export const OFFICIAL_SECTOR_ZERO_ID = 'default_der_abandoned';
export const OFFICIAL_BLIGHTED_WOODS_ID = 'official_blighted_woods';

export function isOfficialMapId(id?: string): boolean {
  return id === OFFICIAL_SECTOR_ZERO_ID || id === OFFICIAL_BLIGHTED_WOODS_ID;
}

export function getBlightedWoodsConfig(): CustomMapConfig {
  return {
    id: OFFICIAL_BLIGHTED_WOODS_ID,
    name: 'Blighted Woods',
    floorSize: { width: 52, depth: 52 },
    ambientColor: '#1d2d3d',
    objects: [],
  };
}
