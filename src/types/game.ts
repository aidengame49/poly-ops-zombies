import * as THREE from 'three';

export interface WeaponStats {
  id: string;
  name: string;
  papName: string;
  isPap: boolean;
  type: 'pistol' | 'smg' | 'ar' | 'shotgun' | 'raygun';
  damage: number;
  fireRate: number; // Seconds between shots
  clipSize: number;
  maxReserve: number;
  reloadTime: number; // Seconds
  price: number;
  pellets?: number;
  spread?: number;
  color: string;
  papColor: string;
}

export interface PlayerWeapon {
  stats: WeaponStats;
  currentClip: number;
  currentReserve: number;
  isReloading: boolean;
  reloadProgress: number;
}

export interface PerkState {
  juggernog: boolean; // Max HP 250
  speedCola: boolean; // 50% reload time
  doubleTap: boolean; // +50% fire rate & +50% damage
}

export interface WindowBarrier {
  id: number;
  wallName: 'North' | 'South' | 'East' | 'West' | string;
  position: THREE.Vector3;
  direction: THREE.Vector3;
  planks: number; // Max 5, Min 0
  maxPlanks: number;
  isTargetedByZombie: boolean;
}

export interface Zombie {
  id: string;
  meshGroup: any; // THREE.Group
  position: { x: number; y: number; z: number };
  health: number;
  maxHealth: number;
  speed: number;
  damage: number;
  windowId: number | null; // Targeted window or inside
  state: 'approaching_window' | 'breaking_planks' | 'entering_room' | 'chasing_player' | 'attacking';
  attackTimer: number;
  breakPlankTimer: number;
  walkCycle: number;
  isHeadshot?: boolean;
}

export interface Particle {
  mesh: any;
  velocity: { x: number; y: number; z: number };
  life: number;
  maxLife: number;
  color: string;
}

export interface FloatingText {
  id: string;
  text: string;
  color: string;
  screenX: number;
  screenY: number;
  opacity: number;
  scale: number;
}

export interface ScoreNotification {
  id: string;
  text: string;
  points: number;
  type: 'hit' | 'kill' | 'headshot' | 'repair';
}

export interface GameStats {
  score: number;
  totalScoreEarned: number;
  round: number;
  kills: number;
  headshots: number;
  boardsRepaired: number;
  isGameOver: boolean;
  isPaused: boolean;
  isRoundBreak: boolean;
  roundBreakTimer: number;
}

// -------------------------------------------------------------
// Map Maker & Level Editor Data Definitions
// -------------------------------------------------------------
export type MapObjectType = 
  | 'block'            // Custom stretchable wall / floor block
  | 'light'            // Light block source
  | 'perk_juggernog'   // Juggernog machine
  | 'perk_speedcola'   // Speed Cola machine
  | 'perk_doubletap'   // Double Tap machine
  | 'pack_a_punch'     // Pack-a-Punch station
  | 'mystery_box'      // Mystery Box chest
  | 'window_barrier'   // Window barrier
  | 'wall_buy_smg'     // MP40 Wall Buy
  | 'wall_buy_ar'      // KN-44 Wall Buy
  | 'wall_buy_shotgun' // KRM-262 Wall Buy
  | 'player_spawn'     // Player start position
  | 'zombie_spawn';    // Zombie spawn point marker

export type TexturePattern = 'concrete' | 'brick' | 'wood' | 'metal' | 'grid' | 'plain';

export interface MapObject {
  id: string;
  name: string;
  type: MapObjectType;
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number };
  scale: { x: number; y: number; z: number }; // Stretch width (X), height (Y), depth (Z)
  color: string;       // Color HEX or RGB
  texturePattern: TexturePattern; // Texture style for blocks
  intensity: number;   // For light blocks (0.5 to 10.0)
  distance: number;    // For light blocks (5 to 40)
}

export interface CustomMapConfig {
  id: string;
  name: string;
  objects: MapObject[];
  floorSize: { width: number; depth: number };
  ambientColor: string;
}

export function getDefaultMapConfig(): CustomMapConfig {
  return {
    id: 'default_der_abandoned',
    name: 'Der Abandoned (Default Facility)',
    floorSize: { width: 24, depth: 24 },
    ambientColor: '#3d4b64',
    objects: [
      // Floor
      { id: 'floor_1', name: 'Main Concrete Floor', type: 'block', position: { x: 0, y: -0.25, z: 0 }, rotation: { x: 0, y: 0, z: 0 }, scale: { x: 24, y: 0.5, z: 24 }, color: '#1c222e', texturePattern: 'concrete', intensity: 1, distance: 10 },
      // Walls
      { id: 'wall_south_l', name: 'South Wall Left', type: 'block', position: { x: -6.8, y: 2.5, z: 12 }, rotation: { x: 0, y: 0, z: 0 }, scale: { x: 10.4, y: 5, z: 0.6 }, color: '#222a36', texturePattern: 'brick', intensity: 1, distance: 10 },
      { id: 'wall_south_r', name: 'South Wall Right', type: 'block', position: { x: 6.8, y: 2.5, z: 12 }, rotation: { x: 0, y: 0, z: 0 }, scale: { x: 10.4, y: 5, z: 0.6 }, color: '#222a36', texturePattern: 'brick', intensity: 1, distance: 10 },
      { id: 'wall_north_l', name: 'North Wall Left', type: 'block', position: { x: -6.8, y: 2.5, z: -12 }, rotation: { x: 0, y: 0, z: 0 }, scale: { x: 10.4, y: 5, z: 0.6 }, color: '#222a36', texturePattern: 'brick', intensity: 1, distance: 10 },
      { id: 'wall_north_r', name: 'North Wall Right', type: 'block', position: { x: 6.8, y: 2.5, z: -12 }, rotation: { x: 0, y: 0, z: 0 }, scale: { x: 10.4, y: 5, z: 0.6 }, color: '#222a36', texturePattern: 'brick', intensity: 1, distance: 10 },
      { id: 'wall_east_l', name: 'East Wall Left', type: 'block', position: { x: 12, y: 2.5, z: -6.8 }, rotation: { x: 0, y: 0, z: 0 }, scale: { x: 0.6, y: 5, z: 10.4 }, color: '#222a36', texturePattern: 'brick', intensity: 1, distance: 10 },
      { id: 'wall_east_r', name: 'East Wall Right', type: 'block', position: { x: 12, y: 2.5, z: 6.8 }, rotation: { x: 0, y: 0, z: 0 }, scale: { x: 0.6, y: 5, z: 10.4 }, color: '#222a36', texturePattern: 'brick', intensity: 1, distance: 10 },
      { id: 'wall_west_l', name: 'West Wall Left', type: 'block', position: { x: -12, y: 2.5, z: -6.8 }, rotation: { x: 0, y: 0, z: 0 }, scale: { x: 0.6, y: 5, z: 10.4 }, color: '#222a36', texturePattern: 'brick', intensity: 1, distance: 10 },
      { id: 'wall_west_r', name: 'West Wall Right', type: 'block', position: { x: -12, y: 2.5, z: 6.8 }, rotation: { x: 0, y: 0, z: 0 }, scale: { x: 0.6, y: 5, z: 10.4 }, color: '#222a36', texturePattern: 'brick', intensity: 1, distance: 10 },
      
      // Overhead Light
      { id: 'light_center', name: 'Center Ceiling Light', type: 'light', position: { x: 0, y: 4.3, z: 0 }, rotation: { x: 0, y: 0, z: 0 }, scale: { x: 1, y: 1, z: 1 }, color: '#ffb044', texturePattern: 'plain', intensity: 3.5, distance: 38 },
      { id: 'light_sconce_s', name: 'South Wall Light', type: 'light', position: { x: 0, y: 3.4, z: 11.2 }, rotation: { x: 0, y: 0, z: 0 }, scale: { x: 1, y: 1, z: 1 }, color: '#ff9922', texturePattern: 'plain', intensity: 2.8, distance: 16 },

      // Entities
      { id: 'jugg_1', name: 'Juggernog Machine', type: 'perk_juggernog', position: { x: 6, y: 0, z: 11.1 }, rotation: { x: 0, y: Math.PI, z: 0 }, scale: { x: 1, y: 1, z: 1 }, color: '#dd1111', texturePattern: 'plain', intensity: 1, distance: 10 },
      { id: 'speed_1', name: 'Speed Cola Machine', type: 'perk_speedcola', position: { x: 6, y: 0, z: -11.1 }, rotation: { x: 0, y: 0, z: 0 }, scale: { x: 1, y: 1, z: 1 }, color: '#11dd44', texturePattern: 'plain', intensity: 1, distance: 10 },
      { id: 'dtap_1', name: 'Double Tap Machine', type: 'perk_doubletap', position: { x: -6, y: 0, z: -11.1 }, rotation: { x: 0, y: 0, z: 0 }, scale: { x: 1, y: 1, z: 1 }, color: '#eedd11', texturePattern: 'plain', intensity: 1, distance: 10 },
      { id: 'pap_1', name: 'Pack-a-Punch Station', type: 'pack_a_punch', position: { x: -6, y: 0, z: 11.2 }, rotation: { x: 0, y: Math.PI, z: 0 }, scale: { x: 1, y: 1, z: 1 }, color: '#00ffff', texturePattern: 'plain', intensity: 1, distance: 10 },
      { id: 'box_1', name: 'Mystery Box Chest', type: 'mystery_box', position: { x: 11.2, y: 0, z: -5 }, rotation: { x: 0, y: -Math.PI / 2, z: 0 }, scale: { x: 1, y: 1, z: 1 }, color: '#ffaa22', texturePattern: 'plain', intensity: 1, distance: 10 },
      
      // Barriers
      { id: 'barrier_south', name: 'Window Barrier 1', type: 'window_barrier', position: { x: 0, y: 1.4, z: 11.7 }, rotation: { x: 0, y: 0, z: 0 }, scale: { x: 1, y: 1, z: 1 }, color: '#5c3a1e', texturePattern: 'wood', intensity: 1, distance: 10 },
      { id: 'barrier_north', name: 'Window Barrier 2', type: 'window_barrier', position: { x: 0, y: 1.4, z: -11.7 }, rotation: { x: 0, y: 0, z: 0 }, scale: { x: 1, y: 1, z: 1 }, color: '#5c3a1e', texturePattern: 'wood', intensity: 1, distance: 10 },
      { id: 'barrier_east', name: 'Window Barrier 3', type: 'window_barrier', position: { x: 11.7, y: 1.4, z: 0 }, rotation: { x: 0, y: Math.PI / 2, z: 0 }, scale: { x: 1, y: 1, z: 1 }, color: '#5c3a1e', texturePattern: 'wood', intensity: 1, distance: 10 },
      { id: 'barrier_west', name: 'Window Barrier 4', type: 'window_barrier', position: { x: -11.7, y: 1.4, z: 0 }, rotation: { x: 0, y: Math.PI / 2, z: 0 }, scale: { x: 1, y: 1, z: 1 }, color: '#5c3a1e', texturePattern: 'wood', intensity: 1, distance: 10 },

      // Wall buys
      { id: 'wallbuy_smg', name: 'MP40 Wall Buy', type: 'wall_buy_smg', position: { x: -11.6, y: 2.0, z: -5.0 }, rotation: { x: 0, y: Math.PI / 2, z: 0 }, scale: { x: 1, y: 1, z: 1 }, color: '#38bdf8', texturePattern: 'plain', intensity: 1, distance: 10 },
      { id: 'wallbuy_ar', name: 'KN-44 Wall Buy', type: 'wall_buy_ar', position: { x: 11.6, y: 2.0, z: 5.0 }, rotation: { x: 0, y: -Math.PI / 2, z: 0 }, scale: { x: 1, y: 1, z: 1 }, color: '#38bdf8', texturePattern: 'plain', intensity: 1, distance: 10 },
      { id: 'wallbuy_shotgun', name: 'KRM-262 Wall Buy', type: 'wall_buy_shotgun', position: { x: -11.6, y: 2.0, z: 5.0 }, rotation: { x: 0, y: Math.PI / 2, z: 0 }, scale: { x: 1, y: 1, z: 1 }, color: '#38bdf8', texturePattern: 'plain', intensity: 1, distance: 10 },

      // Player Spawn
      { id: 'spawn_player', name: 'Player Spawn Marker', type: 'player_spawn', position: { x: 0, y: 1.6, z: 0 }, rotation: { x: 0, y: 0, z: 0 }, scale: { x: 1, y: 1, z: 1 }, color: '#10b981', texturePattern: 'plain', intensity: 1, distance: 10 },

      // Zombie Spawners (Independent Zombie Spawn Markers)
      { id: 'zspawn_south', name: 'South Zombie Spawner', type: 'zombie_spawn', position: { x: 0, y: 0, z: 14.5 }, rotation: { x: 0, y: 0, z: 0 }, scale: { x: 1, y: 1, z: 1 }, color: '#ef4444', texturePattern: 'plain', intensity: 1, distance: 10 },
      { id: 'zspawn_north', name: 'North Zombie Spawner', type: 'zombie_spawn', position: { x: 0, y: 0, z: -14.5 }, rotation: { x: 0, y: 0, z: 0 }, scale: { x: 1, y: 1, z: 1 }, color: '#ef4444', texturePattern: 'plain', intensity: 1, distance: 10 },
      { id: 'zspawn_east', name: 'East Zombie Spawner', type: 'zombie_spawn', position: { x: 14.5, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 }, scale: { x: 1, y: 1, z: 1 }, color: '#ef4444', texturePattern: 'plain', intensity: 1, distance: 10 },
      { id: 'zspawn_west', name: 'West Zombie Spawner', type: 'zombie_spawn', position: { x: -14.5, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 }, scale: { x: 1, y: 1, z: 1 }, color: '#ef4444', texturePattern: 'plain', intensity: 1, distance: 10 },
    ],
  };
}
