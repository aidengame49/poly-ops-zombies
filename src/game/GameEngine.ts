import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import {
  WeaponStats,
  PlayerWeapon,
  PerkState,
  WindowBarrier,
  Zombie,
  Particle,
  ScoreNotification,
  GameStats,
  CustomMapConfig,
  MapObject,
  MapObjectType,
  GrenadeType,
  PlayerLoadout,
  PlayerRecords,
  PlayerSettings,
  SavedMatchState,
} from '../types/game';
import { soundEngine } from '../utils/soundEngine';
import { crazyGames, gameStorage, STORAGE_KEYS } from '../utils/crazyGames';
import { multiplayerClient } from '../utils/multiplayerClient';
import { deviceManager, type DeviceMode } from '../utils/deviceMode';
import type { CoopMemberState, MultiplayerRoomState, NetZombieState } from '../types/multiplayer';
import {
  createRemotePlayerRig,
  disposeRemotePlayerRig,
  redrawNameplate,
  type RemotePlayerRig,
} from './remotePlayerMesh';
import {
  WEAPONS_MAP,
  ARMORY_CHEST_POOL,
  WALL_BUY_CONFIG,
  DEFAULT_LOADOUT,
  GRENADES_MAP,
  sanitizeLoadout,
} from '../data/weapons';
import {
  createFloorTexture,
  createWallTexture,
  createWoodPlankTexture,
  createPerkMachineTexture,
  createPackAPunchTexture,
  createMysteryBoxTexture,
  createWallBuyChalkTexture,
} from '../utils/proceduralTextures';
import { OFFICIAL_SECTOR_ZERO_ID, OFFICIAL_BLIGHTED_WOODS_ID } from '../data/officialMaps';
import { buildForestLavaMap, ForestLavaMapState } from './forestLavaMap';

export { WALL_BUY_CONFIG };

export function createWeapon3DModel(typeOrId: string, isPap: boolean = false): THREE.Group {
  const group = new THREE.Group();

  const primaryColor = isPap ? '#00f0ff' : '#2b3340';
  const steelMat = new THREE.MeshStandardMaterial({
    color: primaryColor,
    metalness: isPap ? 0.9 : 0.85,
    roughness: isPap ? 0.1 : 0.25,
    emissive: isPap ? new THREE.Color('#00f0ff') : new THREE.Color('#000000'),
    emissiveIntensity: isPap ? 0.4 : 0,
  });
  const silverMat = new THREE.MeshStandardMaterial({
    color: isPap ? '#00f0ff' : '#cbd5e1',
    metalness: 0.92,
    roughness: 0.18,
    emissive: isPap ? new THREE.Color('#00f0ff') : new THREE.Color('#000000'),
    emissiveIntensity: isPap ? 0.35 : 0,
  });
  const tanMat = new THREE.MeshStandardMaterial({
    color: isPap ? '#00e5ff' : '#b59461',
    metalness: 0.35,
    roughness: 0.55,
    emissive: isPap ? new THREE.Color('#00f0ff') : new THREE.Color('#000000'),
    emissiveIntensity: isPap ? 0.3 : 0,
  });
  const oliveMat = new THREE.MeshStandardMaterial({
    color: isPap ? '#00e5ff' : '#3f5236',
    metalness: 0.3,
    roughness: 0.65,
  });
  const darkMat = new THREE.MeshStandardMaterial({ color: '#121620', metalness: 0.8, roughness: 0.4 });
  const woodMat = new THREE.MeshStandardMaterial({ color: '#5c3a1e', roughness: 0.7 });
  const brassMat = new THREE.MeshStandardMaterial({ color: '#b8860b', metalness: 0.9, roughness: 0.2 });
  const tritiumMat = new THREE.MeshBasicMaterial({ color: isPap ? '#00f0ff' : '#00ff66' });
  const rayGlowMat = new THREE.MeshBasicMaterial({ color: isPap ? '#00ffff' : '#22ff66' });
  const cryoGlowMat = new THREE.MeshBasicMaterial({ color: isPap ? '#ffffff' : '#67e8f9' });
  const rocketGlowMat = new THREE.MeshStandardMaterial({ color: isPap ? '#ff00ff' : '#dc2626', roughness: 0.4, metalness: 0.5 });

  if (typeOrId === 'revolver') {
    // Magnum .44 Revolver
    const frame = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.075, 0.18), silverMat);
    frame.position.set(0, 0, -0.02);
    group.add(frame);

    const cyl = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.042, 0.09, 10), silverMat);
    cyl.rotation.x = Math.PI / 2;
    cyl.position.set(0, 0.015, -0.04);
    group.add(cyl);

    const barrel = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.06, 0.28), silverMat);
    barrel.position.set(0, 0.025, -0.22);
    group.add(barrel);

    const grip = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.19, 0.075), woodMat);
    grip.position.set(0, -0.1, 0.07);
    grip.rotation.x = 0.38;
    group.add(grip);

    const dot = new THREE.Mesh(new THREE.SphereGeometry(0.005, 6, 6), tritiumMat);
    dot.position.set(0, 0.062, -0.34);
    group.add(dot);
  } else if (typeOrId === 'deagle') {
    // Desert Hawk .50 Hand Cannon
    const slide = new THREE.Mesh(new THREE.BoxGeometry(0.082, 0.1, 0.38), silverMat);
    slide.position.set(0, 0.01, -0.08);
    group.add(slide);

    const lower = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.045, 0.3), darkMat);
    lower.position.set(0, -0.045, -0.04);
    group.add(lower);

    const grip = new THREE.Mesh(new THREE.BoxGeometry(0.068, 0.2, 0.095), darkMat);
    grip.position.set(0, -0.13, 0.05);
    grip.rotation.x = 0.25;
    group.add(grip);

    const dot = new THREE.Mesh(new THREE.SphereGeometry(0.006, 6, 6), tritiumMat);
    dot.position.set(0, 0.068, -0.25);
    group.add(dot);
  } else if (typeOrId === 'machine_pistol') {
    // Viper-9 Auto Pistol
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.065, 0.09, 0.32), darkMat);
    body.position.set(0, 0, -0.06);
    group.add(body);

    const suppressor = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.024, 0.16, 10), steelMat);
    suppressor.rotation.x = Math.PI / 2;
    suppressor.position.set(0, 0.01, -0.29);
    group.add(suppressor);

    const extMag = new THREE.Mesh(new THREE.BoxGeometry(0.036, 0.26, 0.055), steelMat);
    extMag.position.set(0, -0.18, 0.04);
    extMag.rotation.x = 0.2;
    group.add(extMag);

    const foregrip = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.12, 0.045), darkMat);
    foregrip.position.set(0, -0.09, -0.16);
    group.add(foregrip);

    const dot = new THREE.Mesh(new THREE.SphereGeometry(0.005, 6, 6), tritiumMat);
    dot.position.set(0, 0.055, -0.2);
    group.add(dot);
  } else if (typeOrId === 'pistol') {
    // M1911 Pistol
    const slide = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.09, 0.32), steelMat);
    slide.position.set(0, 0, -0.05);
    group.add(slide);

    const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.1, 8), darkMat);
    tube.rotation.x = Math.PI / 2;
    tube.position.set(0, 0.01, -0.22);
    group.add(tube);

    const grip = new THREE.Mesh(new THREE.BoxGeometry(0.065, 0.2, 0.09), woodMat);
    grip.position.set(0, -0.11, 0.04);
    grip.rotation.x = 0.25;
    group.add(grip);

    const guard = new THREE.Mesh(new THREE.TorusGeometry(0.045, 0.01, 8, 16), darkMat);
    guard.position.set(0, -0.06, -0.04);
    group.add(guard);

    const frontSightBase = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.02, 0.02), darkMat);
    frontSightBase.position.set(0, 0.05, -0.19);
    group.add(frontSightBase);

    const dot = new THREE.Mesh(new THREE.SphereGeometry(0.005, 6, 6), tritiumMat);
    dot.position.set(0, 0.058, -0.19);
    group.add(dot);
  } else if (typeOrId === 'ump') {
    // UMP-45 Tactical SMG
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.11, 0.44), darkMat);
    body.position.set(0, 0, -0.1);
    group.add(body);

    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.2, 10), steelMat);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0.01, -0.4);
    group.add(barrel);

    const mag = new THREE.Mesh(new THREE.BoxGeometry(0.042, 0.28, 0.065), darkMat);
    mag.position.set(0, -0.18, -0.16);
    group.add(mag);

    const grip = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.16, 0.075), darkMat);
    grip.position.set(0, -0.11, 0.05);
    grip.rotation.x = 0.28;
    group.add(grip);

    const stock = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.09, 0.26), steelMat);
    stock.position.set(0, -0.01, 0.22);
    group.add(stock);

    const holo = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.08), steelMat);
    holo.position.set(0, 0.08, -0.08);
    group.add(holo);

    const dot = new THREE.Mesh(new THREE.SphereGeometry(0.006, 6, 6), tritiumMat);
    dot.position.set(0, 0.09, -0.08);
    group.add(dot);
  } else if (typeOrId === 'p90') {
    // P90-XPDW Bullpup SMG
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.085, 0.13, 0.54), darkMat);
    body.position.set(0, -0.01, -0.06);
    group.add(body);

    const topMag = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.04, 0.34), tanMat);
    topMag.position.set(0, 0.075, -0.08);
    group.add(topMag);

    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.14, 10), steelMat);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0.01, -0.38);
    group.add(barrel);

    const sight = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.05, 0.07), steelMat);
    sight.position.set(0, 0.11, -0.22);
    group.add(sight);

    const dot = new THREE.Mesh(new THREE.SphereGeometry(0.006, 6, 6), tritiumMat);
    dot.position.set(0, 0.12, -0.22);
    group.add(dot);
  } else if (typeOrId === 'vector') {
    // KRISS-V9 Compact SMG
    const upper = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.09, 0.38), tanMat);
    upper.position.set(0, 0.01, -0.1);
    group.add(upper);

    const lower = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.13, 0.16), darkMat);
    lower.position.set(0, -0.07, -0.18);
    group.add(lower);

    const mag = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.28, 0.06), darkMat);
    mag.position.set(0, -0.2, -0.22);
    mag.rotation.x = 0.22;
    group.add(mag);

    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.024, 0.18, 10), steelMat);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0.01, -0.36);
    group.add(barrel);

    const stock = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.07, 0.24), darkMat);
    stock.position.set(0, 0, 0.18);
    group.add(stock);

    const dot = new THREE.Mesh(new THREE.SphereGeometry(0.005, 6, 6), tritiumMat);
    dot.position.set(0, 0.068, -0.24);
    group.add(dot);
  } else if (typeOrId === 'thompson') {
    // M1928 Drum SMG
    const receiver = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.095, 0.44), steelMat);
    receiver.position.set(0, 0, -0.08);
    group.add(receiver);

    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.28, 10), darkMat);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0.015, -0.42);
    group.add(barrel);

    const drum = new THREE.Mesh(new THREE.CylinderGeometry(0.115, 0.115, 0.075, 16), darkMat);
    drum.rotation.x = Math.PI / 2;
    drum.position.set(0, -0.12, -0.16);
    group.add(drum);

    const foregrip = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.15, 0.065), woodMat);
    foregrip.position.set(0, -0.09, -0.34);
    group.add(foregrip);

    const stock = new THREE.Mesh(new THREE.BoxGeometry(0.065, 0.13, 0.3), woodMat);
    stock.position.set(0, -0.03, 0.26);
    group.add(stock);

    const dot = new THREE.Mesh(new THREE.SphereGeometry(0.005, 6, 6), tritiumMat);
    dot.position.set(0, 0.05, -0.54);
    group.add(dot);
  } else if (typeOrId === 'smg') {
    // MP40 SMG
    const receiver = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.55, 12), steelMat);
    receiver.rotation.x = Math.PI / 2;
    receiver.position.set(0, 0, -0.15);
    group.add(receiver);

    const shroud = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.2, 10), darkMat);
    shroud.rotation.x = Math.PI / 2;
    shroud.position.set(0, 0, -0.48);
    group.add(shroud);

    const mag = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.32, 0.06), steelMat);
    mag.position.set(0, -0.18, -0.12);
    mag.rotation.x = -0.1;
    group.add(mag);

    const grip = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.18, 0.08), darkMat);
    grip.position.set(0, -0.12, 0.06);
    grip.rotation.x = 0.3;
    group.add(grip);

    const stock = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.03, 0.32), steelMat);
    stock.position.set(0, -0.04, 0.2);
    group.add(stock);

    const sightBase = new THREE.Mesh(new THREE.TorusGeometry(0.025, 0.005, 8, 16), darkMat);
    sightBase.position.set(0, 0.048, -0.52);
    group.add(sightBase);

    const dot = new THREE.Mesh(new THREE.SphereGeometry(0.005, 6, 6), tritiumMat);
    dot.position.set(0, 0.048, -0.52);
    group.add(dot);
  } else if (typeOrId === 'double_barrel') {
    // Twin-Coach 12G Double Barrel Shotgun
    const bLeft = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.024, 0.66, 10), steelMat);
    bLeft.rotation.x = Math.PI / 2;
    bLeft.position.set(-0.026, 0.02, -0.28);
    const bRight = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.024, 0.66, 10), steelMat);
    bRight.rotation.x = Math.PI / 2;
    bRight.position.set(0.026, 0.02, -0.28);
    group.add(bLeft, bRight);

    const forend = new THREE.Mesh(new THREE.BoxGeometry(0.095, 0.065, 0.26), woodMat);
    forend.position.set(0, -0.015, -0.24);
    group.add(forend);

    const receiver = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.095, 0.2), silverMat);
    receiver.position.set(0, 0, 0.08);
    group.add(receiver);

    const stock = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.13, 0.34), woodMat);
    stock.position.set(0, -0.04, 0.32);
    stock.rotation.x = 0.12;
    group.add(stock);

    const dot = new THREE.Mesh(new THREE.SphereGeometry(0.005, 6, 6), tritiumMat);
    dot.position.set(0, 0.048, -0.58);
    group.add(dot);
  } else if (typeOrId === 'auto_shotgun') {
    // Striker-12 Revolving Drum Shotgun
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.085, 0.11, 0.36), darkMat);
    body.position.set(0, 0.01, -0.08);
    group.add(body);

    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.38, 10), steelMat);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0.025, -0.42);
    group.add(barrel);

    const drum = new THREE.Mesh(new THREE.CylinderGeometry(0.115, 0.115, 0.13, 14), steelMat);
    drum.rotation.x = Math.PI / 2;
    drum.position.set(0, -0.06, -0.08);
    group.add(drum);

    const grip = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.16, 0.07), darkMat);
    grip.position.set(0, -0.11, 0.08);
    grip.rotation.x = 0.25;
    group.add(grip);

    const stock = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.04, 0.28), steelMat);
    stock.position.set(0, 0.01, 0.22);
    group.add(stock);

    const dot = new THREE.Mesh(new THREE.SphereGeometry(0.005, 6, 6), tritiumMat);
    dot.position.set(0, 0.06, -0.56);
    group.add(dot);
  } else if (typeOrId === 'spas') {
    // Tactical-12 Combat Shotgun
    const shroud = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.11, 0.56), darkMat);
    shroud.position.set(0, 0.01, -0.2);
    group.add(shroud);

    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 0.25, 10), steelMat);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0.03, -0.56);
    group.add(barrel);

    const topStock = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.028, 0.36), steelMat);
    topStock.position.set(0, 0.082, -0.02);
    group.add(topStock);

    const grip = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.16, 0.08), darkMat);
    grip.position.set(0, -0.11, 0.1);
    grip.rotation.x = 0.28;
    group.add(grip);

    const dot = new THREE.Mesh(new THREE.SphereGeometry(0.005, 6, 6), tritiumMat);
    dot.position.set(0, 0.065, -0.64);
    group.add(dot);
  } else if (typeOrId === 'shotgun') {
    // SG-26 Shotgun
    const barrelTop = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.032, 0.65, 10), steelMat);
    barrelTop.rotation.x = Math.PI / 2;
    barrelTop.position.set(0, 0.03, -0.25);
    group.add(barrelTop);

    const barrelBottom = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 0.55, 10), darkMat);
    barrelBottom.rotation.x = Math.PI / 2;
    barrelBottom.position.set(0, -0.02, -0.22);
    group.add(barrelBottom);

    const pump = new THREE.Mesh(new THREE.CylinderGeometry(0.048, 0.048, 0.22, 12), woodMat);
    pump.rotation.x = Math.PI / 2;
    pump.position.set(0, -0.02, -0.3);
    group.add(pump);

    const receiver = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.13, 0.3), steelMat);
    receiver.position.set(0, 0, 0.05);
    group.add(receiver);

    const stock = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.14, 0.32), woodMat);
    stock.position.set(0, -0.03, 0.32);
    group.add(stock);

    const frontSight = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.02, 0.02), darkMat);
    frontSight.position.set(0, 0.06, -0.55);
    group.add(frontSight);

    const dot = new THREE.Mesh(new THREE.SphereGeometry(0.005, 6, 6), tritiumMat);
    dot.position.set(0, 0.068, -0.55);
    group.add(dot);
  } else if (typeOrId === 'carbine') {
    // M4A1 Tactical Carbine
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.11, 0.44), darkMat);
    body.position.set(0, 0, -0.06);
    group.add(body);

    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.085, 0.26), steelMat);
    rail.position.set(0, 0.01, -0.36);
    group.add(rail);

    const suppressor = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 0.24, 12), darkMat);
    suppressor.rotation.x = Math.PI / 2;
    suppressor.position.set(0, 0.015, -0.58);
    group.add(suppressor);

    const mag = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.28, 0.08), steelMat);
    mag.position.set(0, -0.17, -0.12);
    mag.rotation.x = -0.15;
    group.add(mag);

    const stock = new THREE.Mesh(new THREE.BoxGeometry(0.065, 0.13, 0.26), darkMat);
    stock.position.set(0, -0.02, 0.26);
    group.add(stock);

    const redDot = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.055, 0.09), steelMat);
    redDot.position.set(0, 0.08, -0.08);
    group.add(redDot);

    const dot = new THREE.Mesh(new THREE.SphereGeometry(0.006, 6, 6), tritiumMat);
    dot.position.set(0, 0.09, -0.08);
    group.add(dot);
  } else if (typeOrId === 'famas') {
    // FR-556 Bullpup Rifle
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.12, 0.56), darkMat);
    body.position.set(0, 0, 0.04);
    group.add(body);

    const carryHandle = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.075, 0.36), steelMat);
    carryHandle.position.set(0, 0.095, -0.02);
    group.add(carryHandle);

    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.26, 10), steelMat);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0.015, -0.35);
    group.add(barrel);

    const rearMag = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.24, 0.075), steelMat);
    rearMag.position.set(0, -0.15, 0.18);
    group.add(rearMag);

    const dot = new THREE.Mesh(new THREE.SphereGeometry(0.006, 6, 6), tritiumMat);
    dot.position.set(0, 0.115, -0.16);
    group.add(dot);
  } else if (typeOrId === 'scar') {
    // SCAR-H Heavy Battle Rifle
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.085, 0.125, 0.54), tanMat);
    body.position.set(0, 0.01, -0.12);
    group.add(body);

    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.026, 0.32, 10), darkMat);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0.02, -0.52);
    group.add(barrel);

    const mag = new THREE.Mesh(new THREE.BoxGeometry(0.052, 0.26, 0.095), tanMat);
    mag.position.set(0, -0.17, -0.12);
    group.add(mag);

    const stock = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.14, 0.28), tanMat);
    stock.position.set(0, -0.01, 0.26);
    group.add(stock);

    const scope = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.2, 10), darkMat);
    scope.rotation.x = Math.PI / 2;
    scope.position.set(0, 0.095, -0.1);
    group.add(scope);

    const dot = new THREE.Mesh(new THREE.SphereGeometry(0.006, 6, 6), tritiumMat);
    dot.position.set(0, 0.1, -0.2);
    group.add(dot);
  } else if (typeOrId === 'ak74u') {
    // AK-74u Alpha
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.11, 0.42), steelMat);
    body.position.set(0, 0, -0.06);
    group.add(body);

    const handguard = new THREE.Mesh(new THREE.BoxGeometry(0.082, 0.09, 0.18), woodMat);
    handguard.position.set(0, -0.01, -0.28);
    group.add(handguard);

    const booster = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.024, 0.14, 10), darkMat);
    booster.rotation.x = Math.PI / 2;
    booster.position.set(0, 0.015, -0.43);
    group.add(booster);

    const curvedMag = new THREE.Mesh(new THREE.BoxGeometry(0.048, 0.34, 0.085), brassMat);
    curvedMag.position.set(0, -0.2, -0.08);
    curvedMag.rotation.x = -0.38;
    group.add(curvedMag);

    const wireStock = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.03, 0.26), steelMat);
    wireStock.position.set(0, 0, 0.24);
    group.add(wireStock);

    const dot = new THREE.Mesh(new THREE.SphereGeometry(0.005, 6, 6), tritiumMat);
    dot.position.set(0, 0.055, -0.35);
    group.add(dot);
  } else if (typeOrId === 'm14') {
    // M14 Marksman Battle Rifle
    const woodChassis = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.1, 0.72), woodMat);
    woodChassis.position.set(0, -0.02, -0.02);
    group.add(woodChassis);

    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.42, 10), steelMat);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0.03, -0.5);
    group.add(barrel);

    const receiver = new THREE.Mesh(new THREE.BoxGeometry(0.072, 0.07, 0.28), darkMat);
    receiver.position.set(0, 0.035, -0.08);
    group.add(receiver);

    const mag = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.18, 0.08), steelMat);
    mag.position.set(0, -0.14, -0.1);
    group.add(mag);

    const dot = new THREE.Mesh(new THREE.SphereGeometry(0.005, 6, 6), tritiumMat);
    dot.position.set(0, 0.065, -0.68);
    group.add(dot);
  } else if (typeOrId === 'ar') {
    // VX-44 Assault Rifle
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.085, 0.12, 0.48), steelMat);
    body.position.set(0, 0, -0.1);
    group.add(body);

    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.025, 0.38, 10), darkMat);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0.02, -0.45);
    group.add(barrel);

    const handguard = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.1, 0.24), woodMat);
    handguard.position.set(0, -0.01, -0.32);
    group.add(handguard);

    const mag = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.34, 0.09), brassMat);
    mag.position.set(0, -0.2, -0.08);
    mag.rotation.x = -0.35;
    group.add(mag);

    const stock = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.14, 0.28), woodMat);
    stock.position.set(0, -0.02, 0.25);
    group.add(stock);

    const optic = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.06, 0.12), darkMat);
    optic.position.set(0, 0.09, -0.1);
    group.add(optic);

    const dot = new THREE.Mesh(new THREE.SphereGeometry(0.006, 6, 6), tritiumMat);
    dot.position.set(0, 0.1, -0.1);
    group.add(dot);
  } else if (typeOrId === 'rpk') {
    // RPK-76 Drum LMG
    const receiver = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.12, 0.48), steelMat);
    receiver.position.set(0, 0, -0.08);
    group.add(receiver);

    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.026, 0.56, 10), darkMat);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0.015, -0.56);
    group.add(barrel);

    const handguard = new THREE.Mesh(new THREE.BoxGeometry(0.085, 0.095, 0.24), woodMat);
    handguard.position.set(0, -0.01, -0.36);
    group.add(handguard);

    const drum = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.09, 16), darkMat);
    drum.rotation.x = Math.PI / 2;
    drum.position.set(0, -0.16, -0.14);
    group.add(drum);

    const stock = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.15, 0.3), woodMat);
    stock.position.set(0, -0.02, 0.28);
    group.add(stock);

    const dot = new THREE.Mesh(new THREE.SphereGeometry(0.006, 6, 6), tritiumMat);
    dot.position.set(0, 0.055, -0.8);
    group.add(dot);
  } else if (typeOrId === 'minigun') {
    // Vulcan M134 Rotary Gatling Cannon
    const motor = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.42, 14), darkMat);
    motor.rotation.x = Math.PI / 2;
    motor.position.set(0, -0.02, 0.02);
    group.add(motor);

    const topHandle = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.018, 8, 16, Math.PI), steelMat);
    topHandle.position.set(0, 0.1, -0.04);
    group.add(topHandle);

    // 6 Rotary Barrels
    for (let i = 0; i < 6; i++) {
      const ang = (i * Math.PI * 2) / 6;
      const b = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.62, 8), steelMat);
      b.rotation.x = Math.PI / 2;
      b.position.set(Math.cos(ang) * 0.055, -0.02 + Math.sin(ang) * 0.055, -0.46);
      group.add(b);
    }

    const clamp = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.085, 0.05, 14), brassMat);
    clamp.rotation.x = Math.PI / 2;
    clamp.position.set(0, -0.02, -0.66);
    group.add(clamp);

    const ammoBox = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.18, 0.22), oliveMat);
    ammoBox.position.set(-0.1, -0.16, 0.02);
    group.add(ammoBox);

    const dot = new THREE.Mesh(new THREE.SphereGeometry(0.006, 6, 6), tritiumMat);
    dot.position.set(0, 0.09, -0.66);
    group.add(dot);
  } else if (typeOrId === 'lmg') {
    // MG42 Heavy Light Machine Gun
    const receiver = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.13, 0.5), steelMat);
    receiver.position.set(0, 0, -0.05);
    group.add(receiver);

    const shroud = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.09, 0.56), darkMat);
    shroud.position.set(0, 0.01, -0.52);
    group.add(shroud);

    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.16, 10), steelMat);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0.01, -0.85);
    group.add(barrel);

    const drum = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.14, 14), brassMat);
    drum.rotation.z = Math.PI / 2;
    drum.position.set(0, -0.13, -0.14);
    group.add(drum);

    const stock = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.14, 0.28), woodMat);
    stock.position.set(0, -0.02, 0.3);
    group.add(stock);

    const grip = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.16, 0.07), darkMat);
    grip.position.set(0, -0.13, 0.08);
    grip.rotation.x = 0.25;
    group.add(grip);

    const sight = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.04, 0.02), tritiumMat);
    sight.position.set(0, 0.08, -0.74);
    group.add(sight);
  } else if (typeOrId === 'barrett') {
    // AMR-82 .50 Cal Anti-Materiel Rifle
    const receiver = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.14, 0.54), steelMat);
    receiver.position.set(0, 0, 0.02);
    group.add(receiver);

    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.032, 0.78, 10), darkMat);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0.025, -0.6);
    group.add(barrel);

    const brake = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.06, 0.12), steelMat);
    brake.position.set(0, 0.025, -1.0);
    group.add(brake);

    const scope = new THREE.Mesh(new THREE.CylinderGeometry(0.034, 0.034, 0.4, 12), darkMat);
    scope.rotation.x = Math.PI / 2;
    scope.position.set(0, 0.115, -0.08);
    group.add(scope);

    const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.042, 0.06, 12), tritiumMat);
    lens.rotation.x = Math.PI / 2;
    lens.position.set(0, 0.115, -0.29);
    group.add(lens);

    const mag = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.18, 0.13), darkMat);
    mag.position.set(0, -0.15, -0.1);
    group.add(mag);
  } else if (typeOrId === 'bolt_sniper') {
    // M24 Recon Sniper Rifle
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.11, 0.58), oliveMat);
    body.position.set(0, -0.01, 0.04);
    group.add(body);

    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.025, 0.58, 10), darkMat);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0.025, -0.45);
    group.add(barrel);

    const suppressor = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.032, 0.24, 12), steelMat);
    suppressor.rotation.x = Math.PI / 2;
    suppressor.position.set(0, 0.025, -0.82);
    group.add(suppressor);

    const scope = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.026, 0.34, 12), darkMat);
    scope.rotation.x = Math.PI / 2;
    scope.position.set(0, 0.095, -0.04);
    group.add(scope);

    const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.034, 0.034, 0.05, 12), tritiumMat);
    lens.rotation.x = Math.PI / 2;
    lens.position.set(0, 0.095, -0.22);
    group.add(lens);
  } else if (typeOrId === 'sniper') {
    // SR-50 Heavy Sniper Rifle
    const receiver = new THREE.Mesh(new THREE.BoxGeometry(0.085, 0.12, 0.44), steelMat);
    receiver.position.set(0, 0, 0.02);
    group.add(receiver);

    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.028, 0.68, 10), darkMat);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0.02, -0.52);
    group.add(barrel);

    const muzzleBrake = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.045, 0.09), steelMat);
    muzzleBrake.position.set(0, 0.02, -0.88);
    group.add(muzzleBrake);

    const scopeTube = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 0.34, 12), darkMat);
    scopeTube.rotation.x = Math.PI / 2;
    scopeTube.position.set(0, 0.1, -0.04);
    group.add(scopeTube);

    const scopeLens = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.036, 0.06, 12), tritiumMat);
    scopeLens.rotation.x = Math.PI / 2;
    scopeLens.position.set(0, 0.1, -0.22);
    group.add(scopeLens);

    const stock = new THREE.Mesh(new THREE.BoxGeometry(0.065, 0.14, 0.3), darkMat);
    stock.position.set(0, -0.02, 0.34);
    group.add(stock);

    const mag = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.16, 0.08), steelMat);
    mag.position.set(0, -0.13, -0.05);
    group.add(mag);
  } else if (typeOrId === 'rpg' || typeOrId === 'launcher') {
    // RPG-7 Rocket Launcher
    const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.06, 0.95, 14), oliveMat);
    tube.rotation.x = Math.PI / 2;
    tube.position.set(0, 0.02, -0.05);
    group.add(tube);

    const heatguard = new THREE.Mesh(new THREE.CylinderGeometry(0.064, 0.064, 0.34, 14), woodMat);
    heatguard.rotation.x = Math.PI / 2;
    heatguard.position.set(0, 0.02, -0.12);
    group.add(heatguard);

    const warhead = new THREE.Mesh(new THREE.ConeGeometry(0.085, 0.28, 12), rocketGlowMat);
    warhead.rotation.x = -Math.PI / 2;
    warhead.position.set(0, 0.02, -0.66);
    group.add(warhead);

    const grip = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.16, 0.07), darkMat);
    grip.position.set(0, -0.11, -0.2);
    group.add(grip);

    const sight = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.06, 0.02), tritiumMat);
    sight.position.set(-0.04, 0.09, -0.42);
    group.add(sight);
  } else if (typeOrId === 'grenade_launcher') {
    // MGL-6 Rotary Grenade Launcher
    const drum = new THREE.Mesh(new THREE.CylinderGeometry(0.115, 0.115, 0.19, 12), darkMat);
    drum.rotation.x = Math.PI / 2;
    drum.position.set(0, 0, -0.08);
    group.add(drum);

    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.34, 12), steelMat);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0.03, -0.34);
    group.add(barrel);

    const stock = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.12, 0.26), darkMat);
    stock.position.set(0, -0.02, 0.18);
    group.add(stock);

    const grip = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.16, 0.065), darkMat);
    grip.position.set(0, -0.13, -0.28);
    group.add(grip);

    const dot = new THREE.Mesh(new THREE.SphereGeometry(0.006, 6, 6), tritiumMat);
    dot.position.set(0, 0.09, -0.45);
    group.add(dot);
  } else if (typeOrId === 'railgun') {
    // ARC-9 Electromagnetic Railgun
    const chassis = new THREE.Mesh(new THREE.BoxGeometry(0.095, 0.13, 0.44), steelMat);
    chassis.position.set(0, 0, -0.02);
    group.add(chassis);

    const topRail = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.03, 0.62), darkMat);
    topRail.position.set(0, 0.045, -0.48);
    const botRail = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.03, 0.62), darkMat);
    botRail.position.set(0, -0.025, -0.48);
    group.add(topRail, botRail);

    const coreBeam = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.035, 0.58), rayGlowMat);
    coreBeam.position.set(0, 0.01, -0.46);
    group.add(coreBeam);

    const optic = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.055, 0.14), darkMat);
    optic.position.set(0, 0.095, -0.1);
    group.add(optic);

    const dot = new THREE.Mesh(new THREE.SphereGeometry(0.007, 6, 6), rayGlowMat);
    dot.position.set(0, 0.1, -0.18);
    group.add(dot);
  } else if (typeOrId === 'cryo_cannon') {
    // Cryo Emitter
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.095, 0.12, 0.46), silverMat);
    body.position.set(0, 0, -0.1);
    group.add(body);

    const tank = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.24, 12), cryoGlowMat);
    tank.rotation.x = Math.PI / 2;
    tank.position.set(0, 0.09, -0.12);
    group.add(tank);

    const nozzle = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.18, 12), cryoGlowMat);
    nozzle.rotation.x = -Math.PI / 2;
    nozzle.position.set(0, 0, -0.42);
    group.add(nozzle);

    const grip = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.16, 0.075), darkMat);
    grip.position.set(0, -0.11, 0.04);
    grip.rotation.x = 0.25;
    group.add(grip);
  } else if (typeOrId === 'raygun') {
    // Plasma Blaster
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.05, 0.4, 12), steelMat);
    body.rotation.x = Math.PI / 2;
    body.position.set(0, 0, -0.12);
    group.add(body);

    const dish = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.14, 16), rayGlowMat);
    dish.rotation.x = -Math.PI / 2;
    dish.position.set(0, 0, -0.38);
    group.add(dish);

    const battery = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.22, 8), rayGlowMat);
    battery.rotation.z = Math.PI / 2;
    battery.position.set(0, 0.08, -0.15);
    group.add(battery);

    const grip = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.18, 0.07), darkMat);
    grip.position.set(0, -0.12, 0.02);
    grip.rotation.x = 0.3;
    group.add(grip);
  }

  return group;
}

export function createCustomPropMesh(type: MapObjectType, color?: string): THREE.Group | null {
  if (type in WALL_BUY_CONFIG) {
    const cfg = WALL_BUY_CONFIG[type];
    const grp = new THREE.Group();
    const tex = createWallBuyChalkTexture(cfg.name, cfg.price);
    const plaque = new THREE.Mesh(
      new THREE.BoxGeometry(2.2, 1.1, 0.08),
      new THREE.MeshStandardMaterial({ map: tex, roughness: 0.5 })
    );
    grp.add(plaque);

    const gunModel = createWeapon3DModel(cfg.wepType, false);
    const largeWeapons = ['sniper', 'barrett', 'bolt_sniper', 'lmg', 'rpk', 'minigun', 'rpg', 'railgun', 'm14'];
    const modelScale = largeWeapons.includes(cfg.wepType) ? 0.86 : 1.08;
    gunModel.scale.set(modelScale, modelScale, modelScale);
    gunModel.position.set(0, 0.18, 0.1);
    gunModel.rotation.y = Math.PI / 2;
    grp.add(gunModel);
    return grp;
  }

  if (type === 'ammo_crate') {
    const grp = new THREE.Group();
    const oliveMat = new THREE.MeshStandardMaterial({ color: '#3b4d2b', roughness: 0.65, metalness: 0.35 });
    const brassMat = new THREE.MeshStandardMaterial({ color: '#eab308', roughness: 0.3, metalness: 0.85 });
    const darkMat = new THREE.MeshStandardMaterial({ color: '#181c24', roughness: 0.6, metalness: 0.6 });

    const body = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.72, 0.8), oliveMat);
    body.position.y = 0.36;
    body.castShadow = true;
    grp.add(body);

    const lid = new THREE.Mesh(new THREE.BoxGeometry(1.38, 0.14, 0.88), darkMat);
    lid.position.y = 0.76;
    grp.add(lid);

    const stripe = new THREE.Mesh(new THREE.BoxGeometry(1.32, 0.12, 0.82), brassMat);
    stripe.position.y = 0.48;
    grp.add(stripe);

    const latchL = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.22, 0.06), brassMat);
    latchL.position.set(-0.35, 0.65, 0.43);
    const latchR = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.22, 0.06), brassMat);
    latchR.position.set(0.35, 0.65, 0.43);
    grp.add(latchL, latchR);

    const glow = new THREE.PointLight('#facc15', 1.2, 5);
    glow.position.set(0, 1.1, 0);
    grp.add(glow);
    return grp;
  }

  if (type === 'explosive_barrel') {
    const grp = new THREE.Group();
    const redMat = new THREE.MeshStandardMaterial({ color: color || '#dc2626', roughness: 0.45, metalness: 0.5 });
    const stripeMat = new THREE.MeshStandardMaterial({ color: '#facc15', roughness: 0.4, metalness: 0.3 });
    const darkMat = new THREE.MeshStandardMaterial({ color: '#1e293b', roughness: 0.5, metalness: 0.8 });

    const drum = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 1.25, 16), redMat);
    drum.position.y = 0.625;
    drum.castShadow = true;
    grp.add(drum);

    const band = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.46, 0.2, 16), stripeMat);
    band.position.y = 0.625;
    grp.add(band);

    const ribTop = new THREE.Mesh(new THREE.TorusGeometry(0.455, 0.025, 8, 18), darkMat);
    ribTop.rotation.x = Math.PI / 2;
    ribTop.position.y = 1.22;
    const ribMid = new THREE.Mesh(new THREE.TorusGeometry(0.455, 0.02, 8, 18), darkMat);
    ribMid.rotation.x = Math.PI / 2;
    ribMid.position.y = 0.85;
    const ribBot = new THREE.Mesh(new THREE.TorusGeometry(0.455, 0.025, 8, 18), darkMat);
    ribBot.rotation.x = Math.PI / 2;
    ribBot.position.y = 0.04;
    grp.add(ribTop, ribMid, ribBot);
    return grp;
  }

  if (type === 'teleporter') {
    const grp = new THREE.Group();
    const steelMat = new THREE.MeshStandardMaterial({ color: '#1e293b', roughness: 0.35, metalness: 0.85 });
    const glowMat = new THREE.MeshBasicMaterial({ color: '#00f0ff' });
    const coreMat = new THREE.MeshBasicMaterial({ color: '#38bdf8', transparent: true, opacity: 0.7 });

    const base = new THREE.Mesh(new THREE.CylinderGeometry(1.3, 1.5, 0.22, 8), steelMat);
    base.position.y = 0.11;
    grp.add(base);

    const ring = new THREE.Mesh(new THREE.TorusGeometry(1.1, 0.07, 10, 24), glowMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.24;
    grp.add(ring);

    const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.98, 0.98, 0.04, 24), coreMat);
    disc.position.y = 0.22;
    grp.add(disc);

    // 3 corner pylons
    for (let i = 0; i < 3; i++) {
      const ang = (i * Math.PI * 2) / 3;
      const pylon = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.75, 0.18), steelMat);
      pylon.position.set(Math.cos(ang) * 1.25, 0.45, Math.sin(ang) * 1.25);
      pylon.rotation.y = -ang;
      grp.add(pylon);

      const tip = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 8), glowMat);
      tip.position.set(Math.cos(ang) * 1.25, 0.88, Math.sin(ang) * 1.25);
      grp.add(tip);
    }

    const pLight = new THREE.PointLight('#00f0ff', 2.2, 8);
    pLight.position.set(0, 1.2, 0);
    grp.add(pLight);
    return grp;
  }

  if (type === 'crate_cover') {
    const grp = new THREE.Group();
    const woodMat = new THREE.MeshStandardMaterial({ map: createWoodPlankTexture(), color: color || '#8b5a2b', roughness: 0.75 });
    const metalMat = new THREE.MeshStandardMaterial({ color: '#1f2937', roughness: 0.5, metalness: 0.7 });

    const box = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.2, 1.4), woodMat);
    box.position.y = 0.6;
    box.castShadow = true;
    box.receiveShadow = true;
    grp.add(box);

    // Outer frame trim
    const topRim = new THREE.Mesh(new THREE.BoxGeometry(1.46, 0.1, 1.46), metalMat);
    topRim.position.y = 1.15;
    const botRim = new THREE.Mesh(new THREE.BoxGeometry(1.46, 0.1, 1.46), metalMat);
    botRim.position.y = 0.05;
    grp.add(topRim, botRim);
    return grp;
  }

  if (type === 'sandbag_wall') {
    const grp = new THREE.Group();
    const bagMat = new THREE.MeshStandardMaterial({ color: color || '#a89060', roughness: 0.95 });
    const darkBagMat = new THREE.MeshStandardMaterial({ color: '#8a744a', roughness: 0.95 });

    // 3 stacked rows of sandbags
    for (let row = 0; row < 3; row++) {
      const count = 4;
      for (let col = 0; col < count; col++) {
        const bag = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.3, 0.68), (row + col) % 2 === 0 ? bagMat : darkBagMat);
        const offsetX = (row % 2 === 0 ? 0 : 0.15) - 1.12 + col * 0.72;
        bag.position.set(offsetX, 0.16 + row * 0.28, (row % 2 === 0 ? 0.02 : -0.02));
        bag.castShadow = true;
        bag.receiveShadow = true;
        grp.add(bag);
      }
    }
    return grp;
  }

  if (type === 'pillar') {
    const grp = new THREE.Group();
    const concreteMat = new THREE.MeshStandardMaterial({ map: createFloorTexture(), color: color || '#475569', roughness: 0.8 });
    const trimMat = new THREE.MeshStandardMaterial({ color: '#1e293b', roughness: 0.6, metalness: 0.4 });

    const base = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.35, 1.25), trimMat);
    base.position.y = 0.175;
    grp.add(base);

    const shaft = new THREE.Mesh(new THREE.BoxGeometry(0.92, 3.8, 0.92), concreteMat);
    shaft.position.y = 2.25;
    shaft.castShadow = true;
    shaft.receiveShadow = true;
    grp.add(shaft);

    const cap = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.35, 1.25), trimMat);
    cap.position.y = 4.325;
    grp.add(cap);
    return grp;
  }

  return null;
}

export class GameEngine {
  public container: HTMLDivElement;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private clock: THREE.Clock;

  public deviceMode: DeviceMode = deviceManager.getState().effectiveMode;
  public isTouchMode: boolean = deviceManager.getState().effectiveMode !== 'computer';
  private touchMoveVec = { x: 0, y: 0 };
  private touchSprint: boolean = false;
  private resizeObserver: ResizeObserver | null = null;

  public setDeviceMode(mode: DeviceMode) {
    this.deviceMode = mode;
    this.isTouchMode = mode === 'phone' || mode === 'tablet';
    if (this.isTouchMode && document.pointerLockElement === this.container) {
      document.exitPointerLock();
    }
    this.touchMoveVec.x = 0;
    this.touchMoveVec.y = 0;
    this.touchSprint = false;
    this.onWindowResize();
    this.onStateUpdate?.();
  }

  public setTouchMove(x: number, y: number, sprint: boolean) {
    this.touchMoveVec.x = Math.max(-1, Math.min(1, x));
    this.touchMoveVec.y = Math.max(-1, Math.min(1, y));
    this.touchSprint = sprint;
  }

  public addTouchLookDelta(dx: number, dy: number) {
    if (!this.isMapLoaded || this.stats.isPaused || this.stats.isGameOver) return;
    const sens = this.settings.mouseSensitivity * 1.65;
    this.yaw -= dx * sens;
    const pitchDelta = dy * sens * (this.settings.invertY ? -1 : 1);
    this.pitch = Math.max(-Math.PI / 2.1, Math.min(Math.PI / 2.1, this.pitch - pitchDelta));
  }

  public setTouchFiring(active: boolean) {
    if (!this.isMapLoaded || this.stats.isPaused || this.stats.isGameOver) {
      this.isFiring = false;
      return;
    }
    this.isFiring = active;
    if (active) {
      this.shoot();
    }
  }

  public setTouchAiming(active: boolean) {
    if (!this.isMapLoaded || this.stats.isPaused || this.stats.isGameOver) {
      this.isAiming = false;
      return;
    }
    this.isAiming = active;
    this.onStateUpdate?.();
  }

  public triggerTouchJump() {
    if (!this.isMapLoaded || this.stats.isPaused || this.stats.isGameOver || this.isDowned) return;
    if (this.isGrounded) {
      this.playerVel.y = 5.5;
      this.isGrounded = false;
    }
  }

  public setTouchInteract(active: boolean) {
    if (!this.isMapLoaded || this.stats.isPaused || this.stats.isGameOver) {
      this.isHoldingInteract = false;
      return;
    }
    this.isHoldingInteract = active;
    if (active) {
      this.triggerInteraction();
    } else {
      this.repairTimer = 0;
      this.mpReviveHoldTimer = 0;
    }
  }

  public pauseGame() {
    if (!this.isMapLoaded || this.stats.isGameOver) return;
    this.keys = {};
    this.touchMoveVec = { x: 0, y: 0 };
    this.touchSprint = false;
    this.isFiring = false;
    this.isAiming = false;
    this.isHoldingInteract = false;
    this.playerVel.set(0, 0, 0);
    this.stats.isPaused = true;
    if (document.pointerLockElement === this.container) {
      document.exitPointerLock();
    }
    if (!this.isMultiplayer) {
      crazyGames.stopGameplay();
      this.saveCurrentMatch();
    }
    this.onStateUpdate?.();
  }

  public resumeGame() {
    if (!this.isMapLoaded || this.stats.isGameOver) return;
    if (this.isTouchMode) {
      this.stats.isPaused = false;
      crazyGames.startGameplay();
      this.onStateUpdate?.();
    } else {
      this.requestLock();
    }
  }

  public requestLock() {
    if (!this.container || !this.isMapLoaded || this.stats.isGameOver) return;
    if (this.isTouchMode) {
      this.stats.isPaused = false;
      crazyGames.startGameplay();
      this.onStateUpdate?.();
      return;
    }
    this.container.requestPointerLock();
  }

  // Game State
  public stats: GameStats = {
    score: 500, // Starting points
    totalScoreEarned: 500,
    round: 1,
    kills: 0,
    headshots: 0,
    boardsRepaired: 0,
    isGameOver: false,
    isPaused: false,
    isRoundBreak: false,
    roundBreakTimer: 0,
  };

  // Weapons Pool (populated from unified 30-weapon arsenal)
  private baseWeapons: Record<string, WeaponStats> = { ...WEAPONS_MAP };

  // Player State
  public playerLoadout: PlayerLoadout = { ...DEFAULT_LOADOUT };
  public playerWeapons: PlayerWeapon[] = [];
  public currentWeaponIndex: number = 0;
  public grenadeCount: number = GRENADES_MAP[DEFAULT_LOADOUT.grenadeType].startCount;
  public maxGrenades: number = GRENADES_MAP[DEFAULT_LOADOUT.grenadeType].maxCount;
  public flashScreenAlpha: number = 0;
  private throwCooldown: number = 0;
  public playerHp: number = 100;
  public maxHp: number = 100;
  private lastDamageTime: number = 0;
  private shootCooldown: number = 0;
  public perks: PerkState = {
    juggernog: false,
    speedCola: false,
    doubleTap: false,
  };

  // Player Physics & Movement
  private playerPos = new THREE.Vector3(0, 1.6, 0);
  private playerVel = new THREE.Vector3();
  private yaw: number = 0;
  private pitch: number = 0;
  private isGrounded: boolean = true;
  private keys: Record<string, boolean> = {};

  // Controls & Pointer Lock
  public isPointerLocked: boolean = false;
  public isAiming: boolean = false;

  // Environment & Barriers
  public barriers: WindowBarrier[] = [];
  private barrierMeshes: { group: THREE.Group; planks: THREE.Mesh[] }[] = [];

  // Entities
  public zombies: Zombie[] = [];
  private particles: Particle[] = [];
  public bullets: {
    mesh: THREE.Mesh;
    vel: THREE.Vector3;
    life: number;
    isPap: boolean;
    damage: number;
    splashRadius?: number;
    pierceLeft?: number;
    hitZombieIds?: Set<string>;
    color?: string;
    isVisualOnly?: boolean;
  }[] = [];
  private thrownGrenades: {
    type: GrenadeType;
    mesh: THREE.Group;
    vel: THREE.Vector3;
    fuse: number;
    isVisualOnly?: boolean;
  }[] = [];
  private burnZones: {
    mesh: THREE.Mesh;
    position: THREE.Vector3;
    radius: number;
    life: number;
    tickTimer: number;
  }[] = [];
  private isFiring: boolean = false;

  // Co-Op Multiplayer State
  public isMultiplayer: boolean = false;
  public isDowned: boolean = false;
  public bleedoutTimer: number = 25;
  public remoteTeammates: CoopMemberState[] = [];
  private remotePlayerRigs = new Map<string, RemotePlayerRig>();
  private zombieTargets = new Map<string, { x: number; y: number; z: number; yaw: number }>();
  private mpTransformTimer: number = 0;
  private mpLocalMoving: boolean = false;
  private mpReviveTargetId: string | null = null;
  private mpReviveHoldTimer: number = 0;

  // 3D Gun Rig & Player Body Viewmodel
  private gunGroup: THREE.Group = new THREE.Group();
  private gunMesh: THREE.Group = new THREE.Group();
  private muzzleFlashLight!: THREE.PointLight;
  private playerBodyRig: THREE.Group = new THREE.Group();
  private playerLegL: THREE.Group = new THREE.Group();
  private playerLegR: THREE.Group = new THREE.Group();
  private legWalkTime: number = 0;
  private playerFlashlight!: THREE.SpotLight;
  public isFlashlightOn: boolean = true;
  private flashlightLensMat: THREE.MeshStandardMaterial | null = null;
  private sconceLights: THREE.PointLight[] = [];

  // Wave / Round Manager
  private zombiesToSpawn: number = 0;
  private spawnTimer: number = 0;

  // Interactive Prompt
  public currentPrompt: string = '';
  private interactTargetAction: (() => void) | null = null;
  private isHoldingInteract: boolean = false;
  private repairTimer: number = 0;

  // Settings & Career Records Configuration
  public settings: PlayerSettings = {
    mouseSensitivity: 0.0022,
    worldBrightness: 0.85,
    exposure: 1.25,
    fov: 75,
    flashlightIntensity: 4.5,
    invertY: false,
    masterVolume: 80,
  };

  public records: PlayerRecords = {
    bestRound: 1,
    bestScore: 500,
    totalKills: 0,
    totalHeadshots: 0,
    totalBoardsRepaired: 0,
    gamesPlayed: 0,
  };

  private syncedRunKills: number = 0;
  private syncedRunHeadshots: number = 0;
  private syncedRunBoards: number = 0;
  private autoSaveTimer: number = 0;
  private lastHappyTimeRound: number = 1;

  private ambientLight!: THREE.AmbientLight;
  private defaultRoomEnv: THREE.Texture | null = null;

  public reloadPersistedState() {
    const savedSettings = gameStorage.getJSON<Partial<PlayerSettings>>(STORAGE_KEYS.SETTINGS);
    if (savedSettings) {
      this.settings = {
        mouseSensitivity: typeof savedSettings.mouseSensitivity === 'number' ? savedSettings.mouseSensitivity : 0.0022,
        worldBrightness: typeof savedSettings.worldBrightness === 'number' ? savedSettings.worldBrightness : 0.85,
        exposure: typeof savedSettings.exposure === 'number' ? savedSettings.exposure : 1.25,
        fov: typeof savedSettings.fov === 'number' ? savedSettings.fov : 75,
        flashlightIntensity: typeof savedSettings.flashlightIntensity === 'number' ? savedSettings.flashlightIntensity : 4.5,
        invertY: Boolean(savedSettings.invertY),
        masterVolume: typeof savedSettings.masterVolume === 'number' ? savedSettings.masterVolume : 80,
      };
      soundEngine.setVolume(this.settings.masterVolume / 100);
      if (this.renderer) {
        this.renderer.toneMappingExposure = this.settings.exposure;
      }
      if (this.camera && !this.isAiming) {
        this.camera.fov = this.settings.fov;
        this.camera.updateProjectionMatrix();
      }
    }

    const savedRecords = gameStorage.getJSON<Partial<PlayerRecords>>(STORAGE_KEYS.RECORDS);
    if (savedRecords) {
      this.records = {
        bestRound: Math.max(1, savedRecords.bestRound || 1),
        bestScore: Math.max(500, savedRecords.bestScore || 500),
        totalKills: Math.max(0, savedRecords.totalKills || 0),
        totalHeadshots: Math.max(0, savedRecords.totalHeadshots || 0),
        totalBoardsRepaired: Math.max(0, savedRecords.totalBoardsRepaired || 0),
        gamesPlayed: Math.max(0, savedRecords.gamesPlayed || 0),
      };
    }

    const savedLoadout = gameStorage.getJSON<Partial<PlayerLoadout>>(STORAGE_KEYS.LOADOUT);
    if (savedLoadout) {
      this.setLoadout(savedLoadout);
    }
    this.reportCrazyGamesProgression();
    this.onStateUpdate?.();
  }

  private persistSettings() {
    gameStorage.setJSON(STORAGE_KEYS.SETTINGS, this.settings);
  }

  private reportCrazyGamesProgression() {
    const completionPct = Math.min(100, Math.round(((Math.max(1, this.records.bestRound) - 1) / 19) * 100));
    crazyGames.reportCompletion(completionPct);
  }

  private updateCrazyGamesContext() {
    if (!this.isMapLoaded) return;
    const mapName = this.activeMapConfig
      ? this.activeMapConfig.name
      : this.activeOfficialMapId === OFFICIAL_BLIGHTED_WOODS_ID
      ? 'Blighted Woods'
      : 'Sector Zero';
    const activeWeapon = this.playerWeapons[this.currentWeaponIndex]?.stats.name || 'Sidearm';
    crazyGames.setGameContext({
      map: mapName,
      mode: this.activeMapConfig ? 'custom_map' : 'official_survival',
      round: this.stats.round,
      weapon: activeWeapon,
    });
  }

  public syncRecords(forceSave: boolean = true) {
    const dKills = Math.max(0, this.stats.kills - this.syncedRunKills);
    const dHeadshots = Math.max(0, this.stats.headshots - this.syncedRunHeadshots);
    const dBoards = Math.max(0, this.stats.boardsRepaired - this.syncedRunBoards);

    this.records.totalKills += dKills;
    this.records.totalHeadshots += dHeadshots;
    this.records.totalBoardsRepaired += dBoards;
    this.records.bestRound = Math.max(this.records.bestRound, this.stats.round);
    this.records.bestScore = Math.max(this.records.bestScore, this.stats.score);

    this.syncedRunKills = this.stats.kills;
    this.syncedRunHeadshots = this.stats.headshots;
    this.syncedRunBoards = this.stats.boardsRepaired;

    if (forceSave) {
      gameStorage.setJSON(STORAGE_KEYS.RECORDS, this.records);
    }
    this.reportCrazyGamesProgression();
  }

  public getSavedMatch(): SavedMatchState | null {
    const raw = gameStorage.getJSON<SavedMatchState>(STORAGE_KEYS.SAVED_RUN);
    if (!raw || raw.version !== 1 || !raw.stats || !Array.isArray(raw.weapons)) {
      return null;
    }
    return raw;
  }

  public clearSavedMatch() {
    gameStorage.removeItem(STORAGE_KEYS.SAVED_RUN);
  }

  public saveCurrentMatch(): boolean {
    if (!this.isMapLoaded || this.stats.isGameOver || this.isMultiplayer) return false;
    this.syncRecords(true);

    const mapId = this.activeMapConfig
      ? this.activeMapConfig.id
      : this.activeOfficialMapId;
    const mapName = this.activeMapConfig
      ? this.activeMapConfig.name
      : this.activeOfficialMapId === OFFICIAL_BLIGHTED_WOODS_ID
      ? 'BLIGHTED WOODS'
      : 'SECTOR ZERO';

    const state: SavedMatchState = {
      version: 1,
      savedAt: Date.now(),
      mapId,
      mapName,
      customMapConfig: this.activeMapConfig,
      stats: { ...this.stats, isPaused: false },
      player: {
        x: Number(this.playerPos.x.toFixed(3)),
        y: Number(this.playerPos.y.toFixed(3)),
        z: Number(this.playerPos.z.toFixed(3)),
        yaw: Number(this.yaw.toFixed(4)),
        pitch: Number(this.pitch.toFixed(4)),
        playerHp: Math.round(this.playerHp),
        maxHp: this.maxHp,
        isFlashlightOn: this.isFlashlightOn,
      },
      perks: { ...this.perks },
      loadout: sanitizeLoadout(this.playerLoadout),
      grenadeCount: this.grenadeCount,
      maxGrenades: this.maxGrenades,
      weapons: this.playerWeapons.map((w) => ({
        stats: { ...w.stats },
        currentClip: w.currentClip,
        currentReserve: w.currentReserve,
      })),
      currentWeaponIndex: this.currentWeaponIndex,
      barriers: this.barriers.map((b) => ({ id: b.id, planks: b.planks })),
      explodedBarrelIds: this.explosiveBarrels.filter((eb) => eb.exploded).map((eb) => eb.id),
      zombies: this.zombies.map((z) => ({
        x: Number(z.meshGroup.position.x.toFixed(2)),
        y: Number(z.meshGroup.position.y.toFixed(2)),
        z: Number(z.meshGroup.position.z.toFixed(2)),
        health: Number(z.health.toFixed(1)),
        maxHealth: Number(z.maxHealth.toFixed(1)),
        speed: Number(z.speed.toFixed(3)),
        damage: z.damage,
        windowId: z.windowId,
        state: z.state,
        stunTimer: z.stunTimer,
        slowTimer: z.slowTimer,
        burnTimer: z.burnTimer,
      })),
      zombiesToSpawn: this.zombiesToSpawn,
    };

    const ok = gameStorage.setJSON(STORAGE_KEYS.SAVED_RUN, state);
    this.onStateUpdate?.();
    return ok;
  }

  public setSensitivity(val: number) {
    this.settings.mouseSensitivity = val;
    this.persistSettings();
    this.onStateUpdate?.();
  }

  public setWorldBrightness(val: number) {
    this.settings.worldBrightness = val;
    if (this.ambientLight) {
      this.ambientLight.intensity = this.activeMapConfig
        ? 0.04 * val
        : this.activeOfficialMapId === OFFICIAL_BLIGHTED_WOODS_ID
        ? 0.2 + val * 0.45
        : 0.35 + val * 0.6;
    }
    if (this.renderer && !this.activeMapConfig) {
      this.renderer.toneMappingExposure = 0.7 + val * 0.55;
    }
    this.persistSettings();
    this.onStateUpdate?.();
  }

  public setExposure(val: number) {
    this.settings.exposure = val;
    this.renderer.toneMappingExposure = val;
    this.persistSettings();
    this.onStateUpdate?.();
  }

  public setFOV(val: number) {
    this.settings.fov = val;
    if (!this.isAiming) {
      this.camera.fov = val;
      this.camera.updateProjectionMatrix();
    }
    this.persistSettings();
    this.onStateUpdate?.();
  }

  public setFlashlightIntensity(val: number) {
    this.settings.flashlightIntensity = val;
    this.applyFlashlightState();
    this.persistSettings();
    this.onStateUpdate?.();
  }

  public toggleFlashlight() {
    this.isFlashlightOn = !this.isFlashlightOn;
    this.applyFlashlightState();
    soundEngine.playFlashlightClick(this.isFlashlightOn);
    this.onStateUpdate?.();
  }

  private applyFlashlightState() {
    if (this.playerFlashlight) {
      this.playerFlashlight.intensity = this.isFlashlightOn
        ? this.settings.flashlightIntensity * 14
        : 0;
    }
    if (this.flashlightLensMat) {
      this.flashlightLensMat.emissiveIntensity = this.isFlashlightOn ? 2.5 : 0;
      this.flashlightLensMat.color.set(this.isFlashlightOn ? '#e5f4ff' : '#1e293b');
    }
  }

  public setInvertY(val: boolean) {
    this.settings.invertY = val;
    this.persistSettings();
    this.onStateUpdate?.();
  }

  public setMasterVolume(val: number) {
    this.settings.masterVolume = val;
    soundEngine.setVolume(val / 100);
    this.persistSettings();
    this.onStateUpdate?.();
  }

  public resetToMainMenu() {
    crazyGames.stopGameplay();
    if (this.isMultiplayer) {
      multiplayerClient.leaveRoom();
    } else if (this.isMapLoaded && !this.stats.isGameOver) {
      this.saveCurrentMatch();
    }
    this.stats.isPaused = false;
    this.stats.isGameOver = false;
    if (document.pointerLockElement === this.container) {
      document.exitPointerLock();
    }
    this.unloadMap();
  }

  public exitMultiplayerToLobby() {
    crazyGames.stopGameplay();
    crazyGames.clearGameContext();
    this.stats.isPaused = false;
    this.stats.isGameOver = false;
    if (document.pointerLockElement === this.container) {
      document.exitPointerLock();
    }
    this.unloadMap();
  }

  private handleGameOver() {
    if (this.stats.isGameOver) return;
    this.stats.isGameOver = true;
    crazyGames.stopGameplay();
    crazyGames.clearGameContext();
    this.syncRecords(true);
    this.clearSavedMatch();
    if (document.pointerLockElement === this.container) {
      document.exitPointerLock();
    }
    this.onStateUpdate?.();
  }

  // Armory Chest State
  private isBoxSpinning: boolean = false;
  private boxSpinTimer: number = 0;
  private boxSpinTimeout: ReturnType<typeof setTimeout> | null = null;
  private boxFloatingGun: THREE.Group | null = null;

  // UI Callback hooks
  public onStateUpdate?: () => void;
  public onHitmarker?: (isKill: boolean, isHeadshot: boolean) => void;
  public scoreNotifications: ScoreNotification[] = [];

  constructor(container: HTMLDivElement) {
    this.container = container;
    this.clock = new THREE.Clock();

    // Scene & Camera
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#101522');
    this.scene.fog = new THREE.Fog('#101522', 12, 42);

    this.camera = new THREE.PerspectiveCamera(
      this.settings.fov,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.camera.position.copy(this.playerPos);

    // Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = this.settings.exposure;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.container.appendChild(this.renderer.domElement);

    // Load saved settings, career records & loadout
    this.reloadPersistedState();

    // Procedural Studio Environment Reflection Map with safe fallback
    try {
      const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
      this.defaultRoomEnv = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
      this.scene.environment = this.defaultRoomEnv;
      pmremGenerator.dispose();
    } catch (e) {
      console.warn('RoomEnvironment generator safely bypassed:', e);
    }

    // Controls listeners
    this.setupEventListeners();

    // Window & Container Resize Handler (keeps Three.js fitted to Phone/Tablet/Computer screens)
    window.addEventListener('resize', this.onWindowResize);
    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => this.onWindowResize());
      this.resizeObserver.observe(this.container);
    }

    // Start Game Loop
    this.animate();
  }

  public isMapLoaded: boolean = false;
  public activeMapConfig?: CustomMapConfig;
  public activeOfficialMapId: string = OFFICIAL_SECTOR_ZERO_ID;
  private forestLavaState: ForestLavaMapState | null = null;
  private customSolidBoxes: { minX: number; maxX: number; minZ: number; maxZ: number; minY: number; maxY: number }[] = [];
  private customZombieSpawners: THREE.Vector3[] = [];
  private customSpawnPos: THREE.Vector3 = new THREE.Vector3(0, 1.6, 0);
  private customSpawnYaw: number = 0;
  private explosiveBarrels: { id: string; mesh: THREE.Group; position: THREE.Vector3; exploded: boolean; radius: number }[] = [];
  private customTeleporters: THREE.Vector3[] = [];
  private lastTeleportTime: number = 0;

  private get usesSolidBoxes(): boolean {
    return Boolean(this.activeMapConfig) || this.activeOfficialMapId === OFFICIAL_BLIGHTED_WOODS_ID;
  }

  public setLoadout(loadout: Partial<PlayerLoadout>) {
    this.playerLoadout = sanitizeLoadout(loadout);
    const gDef = GRENADES_MAP[this.playerLoadout.grenadeType];
    if (!this.isMapLoaded) {
      this.grenadeCount = gDef.startCount;
      this.maxGrenades = gDef.maxCount;
    }
    this.onStateUpdate?.();
  }

  private initPlayerStartingInventory() {
    this.playerLoadout = sanitizeLoadout(this.playerLoadout);
    const starterId = this.playerLoadout.startingPistolId;
    const starterStats = this.baseWeapons[starterId] || this.baseWeapons.pistol;
    this.playerWeapons = [
      {
        stats: { ...starterStats },
        currentClip: starterStats.clipSize,
        currentReserve: starterStats.maxReserve,
        isReloading: false,
        reloadProgress: 0,
      },
    ];
    this.currentWeaponIndex = 0;

    const gDef = GRENADES_MAP[this.playerLoadout.grenadeType];
    this.grenadeCount = gDef.startCount;
    this.maxGrenades = gDef.maxCount;
    this.flashScreenAlpha = 0;
    this.throwCooldown = 0;
  }

  private clearGrenadesAndZones() {
    this.thrownGrenades.forEach((g) => this.scene.remove(g.mesh));
    this.thrownGrenades = [];
    this.burnZones.forEach((bz) => {
      this.scene.remove(bz.mesh);
      bz.mesh.geometry.dispose();
      (bz.mesh.material as THREE.Material).dispose();
    });
    this.burnZones = [];
    this.flashScreenAlpha = 0;
    this.throwCooldown = 0;
  }

  public loadMap(customConfig?: CustomMapConfig) {
    if (this.isMapLoaded) return;

    if (customConfig && customConfig.id === OFFICIAL_BLIGHTED_WOODS_ID) {
      this.activeMapConfig = undefined;
      this.activeOfficialMapId = OFFICIAL_BLIGHTED_WOODS_ID;
    } else if (customConfig && customConfig.id !== OFFICIAL_SECTOR_ZERO_ID) {
      this.activeMapConfig = customConfig;
      this.activeOfficialMapId = OFFICIAL_SECTOR_ZERO_ID;
    } else {
      this.activeMapConfig = undefined;
      this.activeOfficialMapId = OFFICIAL_SECTOR_ZERO_ID;
    }

    // Initialize Loadout Inventory (Pistols Only + Chosen Starting Grenade)
    this.initPlayerStartingInventory();

    // Build 3D World & Map Objects
    if (this.activeMapConfig) {
      this.setupCustomMap(this.activeMapConfig);
    } else if (this.activeOfficialMapId === OFFICIAL_BLIGHTED_WOODS_ID) {
      this.setupForestLavaMap();
    } else {
      this.scene.environment = this.defaultRoomEnv;
      this.scene.background = new THREE.Color('#101522');
      this.scene.fog = new THREE.Fog('#101522', 12, 42);
      this.setupLighting();
      this.setupRoom();
      this.setupWindowBarriers();
      this.setupPerkMachines();
      this.setupPackAPunch();
      this.setupMysteryBox();
      this.setupWallBuys();
    }

    this.setupGunRig();
    this.setupPlayerBodyRig();

    // Start Wave 1
    this.syncedRunKills = 0;
    this.syncedRunHeadshots = 0;
    this.syncedRunBoards = 0;
    this.autoSaveTimer = 0;
    this.lastHappyTimeRound = 1;
    this.records.gamesPlayed++;
    this.syncRecords(true);
    this.startRound(1);
    this.isMapLoaded = true;
    crazyGames.startGameplay();
    this.updateCrazyGamesContext();
    this.saveCurrentMatch();
    this.onStateUpdate?.();
  }

  public startMultiplayerMatch(room: MultiplayerRoomState, initialZombies: NetZombieState[]) {
    if (this.isMapLoaded) {
      this.unloadMap();
    }

    this.isMultiplayer = true;
    this.isDowned = false;
    this.bleedoutTimer = 25;
    this.mpReviveTargetId = null;
    this.mpReviveHoldTimer = 0;

    if (room.mapId === OFFICIAL_BLIGHTED_WOODS_ID) {
      this.activeMapConfig = undefined;
      this.activeOfficialMapId = OFFICIAL_BLIGHTED_WOODS_ID;
    } else if (room.customMapConfig && room.mapId !== OFFICIAL_SECTOR_ZERO_ID) {
      this.activeMapConfig = room.customMapConfig;
      this.activeOfficialMapId = OFFICIAL_SECTOR_ZERO_ID;
    } else {
      this.activeMapConfig = undefined;
      this.activeOfficialMapId = OFFICIAL_SECTOR_ZERO_ID;
    }

    this.initPlayerStartingInventory();

    if (this.activeMapConfig) {
      this.setupCustomMap(this.activeMapConfig);
    } else if (this.activeOfficialMapId === OFFICIAL_BLIGHTED_WOODS_ID) {
      this.setupForestLavaMap();
    } else {
      this.scene.environment = this.defaultRoomEnv;
      this.scene.background = new THREE.Color('#101522');
      this.scene.fog = new THREE.Fog('#101522', 12, 42);
      this.setupLighting();
      this.setupRoom();
      this.setupWindowBarriers();
      this.setupPerkMachines();
      this.setupPackAPunch();
      this.setupMysteryBox();
      this.setupWallBuys();
    }

    // Offset squad spawn positions slightly so players never overlap at spawn
    const myIdx = Math.max(
      0,
      room.members.findIndex((m) => m.playerId === multiplayerClient.myPlayerId)
    );
    const angle = myIdx * 1.5;
    this.playerPos.x += Math.cos(angle) * 1.3;
    this.playerPos.z += Math.sin(angle) * 1.3;
    this.camera.position.copy(this.playerPos);

    this.setupGunRig();
    this.setupPlayerBodyRig();

    // Sync initial barriers & exploded barrels
    if (Array.isArray(room.barriers)) {
      room.barriers.forEach((rb) => {
        const b = this.barriers[rb.id];
        const mg = this.barrierMeshes[rb.id];
        if (b && mg) {
          b.planks = rb.planks;
          mg.planks.forEach((p, idx) => (p.visible = idx < rb.planks));
        }
      });
    }
    const explodedSet = new Set(room.explodedBarrelIds || []);
    this.explosiveBarrels.forEach((eb) => {
      if (explodedSet.has(eb.id)) {
        eb.exploded = true;
        eb.mesh.visible = false;
      }
    });

    this.stats = {
      score: 500,
      totalScoreEarned: 500,
      round: room.round || 1,
      kills: 0,
      headshots: 0,
      boardsRepaired: 0,
      isGameOver: false,
      isPaused: false,
      isRoundBreak: room.isRoundBreak,
      roundBreakTimer: room.roundBreakTimer,
    };
    this.zombiesToSpawn = room.zombiesToSpawn || 0;
    this.syncedRunKills = 0;
    this.syncedRunHeadshots = 0;
    this.syncedRunBoards = 0;
    this.autoSaveTimer = 0;
    this.lastHappyTimeRound = this.stats.round;
    this.records.gamesPlayed++;
    this.syncRecords(true);

    this.syncMultiplayerZombies(initialZombies || []);
    this.syncRemotePlayers(room.members || []);
    this.registerMultiplayerHooks();

    this.isMapLoaded = true;
    crazyGames.startGameplay();
    this.updateCrazyGamesContext();
    this.onStateUpdate?.();
  }

  private registerMultiplayerHooks() {
    multiplayerClient.setGameHooks({
      onWorldSnapshot: (msg) => {
        if (!this.isMapLoaded || !this.isMultiplayer) return;
        this.stats.round = msg.round;
        this.stats.isRoundBreak = msg.isRoundBreak;
        this.stats.roundBreakTimer = msg.roundBreakTimer;
        this.zombiesToSpawn = msg.zombiesToSpawn;
        this.syncMultiplayerZombies(msg.zombies);
        this.syncRemotePlayers(msg.members);
        this.onStateUpdate?.();
      },
      onBarrierUpdated: (msg) => {
        const b = this.barriers[msg.barrierId];
        const mg = this.barrierMeshes[msg.barrierId];
        if (b && mg) {
          const isRepair = msg.planks > b.planks;
          b.planks = msg.planks;
          mg.planks.forEach((p, idx) => (p.visible = idx < msg.planks));
          soundEngine.playPlankWood(isRepair);
          if (isRepair && msg.repairedBy === multiplayerClient.myPlayerId) {
            this.stats.boardsRepaired++;
            this.addScore(10, 'BOARD REPAIRED');
          }
        }
      },
      onZombieKilled: (msg) => {
        const idx = this.zombies.findIndex((z) => z.id === msg.zombieId);
        if (idx !== -1) {
          const z = this.zombies[idx];
          if (msg.hitPoint) {
            this.spawnBloodParticles(new THREE.Vector3(msg.hitPoint.x, msg.hitPoint.y, msg.hitPoint.z));
          } else {
            this.spawnBloodParticles(z.meshGroup.position.clone().add(new THREE.Vector3(0, 1, 0)));
          }
          this.scene.remove(z.meshGroup);
          this.zombies.splice(idx, 1);
          this.zombieTargets.delete(msg.zombieId);
        }
        if (msg.killerPlayerId === multiplayerClient.myPlayerId) {
          this.stats.kills++;
          if (msg.isHeadshot) this.stats.headshots++;
          this.addScore(msg.points, msg.reason);
          soundEngine.playHitmarker(true, msg.isHeadshot);
          this.onHitmarker?.(true, msg.isHeadshot);
        }
      },
      onZombieHitConfirm: (msg) => {
        if (msg.killerPlayerId === multiplayerClient.myPlayerId) {
          this.addScore(msg.points, msg.reason);
        }
      },
      onAttackedByZombie: (msg) => {
        if (msg.targetPlayerId !== multiplayerClient.myPlayerId || this.stats.isGameOver || this.isDowned) return;
        this.playerHp -= msg.damage;
        this.lastDamageTime = Date.now();
        soundEngine.playPlayerHit();
        if (this.playerHp <= 0) {
          this.enterDownedOrDie();
        }
        this.onStateUpdate?.();
      },
      onShootFx: (msg) => {
        const rig = this.remotePlayerRigs.get(msg.shooterPlayerId);
        if (rig) {
          rig.muzzleFlash.intensity = 3.5;
        }
        const dist = this.playerPos.distanceTo(new THREE.Vector3(msg.origin.x, msg.origin.y, msg.origin.z));
        if (dist < 28) {
          soundEngine.playShoot(msg.weaponType, msg.isPap, msg.weaponId);
        }
        this.spawnVisualTracer(
          new THREE.Vector3(msg.origin.x, msg.origin.y, msg.origin.z),
          new THREE.Vector3(msg.dir.x, msg.dir.y, msg.dir.z),
          msg.color,
          msg.isPap
        );
      },
      onGrenadeThrowFx: (msg) => {
        const mesh = this.createGrenadeMesh(msg.grenadeType);
        mesh.position.set(msg.pos.x, msg.pos.y, msg.pos.z);
        this.scene.add(mesh);
        this.thrownGrenades.push({
          type: msg.grenadeType,
          mesh,
          vel: new THREE.Vector3(msg.vel.x, msg.vel.y, msg.vel.z),
          fuse: msg.fuse,
          isVisualOnly: true,
        });
        soundEngine.playGrenadeThrow();
      },
      onGrenadeDetonateFx: (msg) => {
        this.playGrenadeFxOnly(msg.grenadeType, new THREE.Vector3(msg.center.x, msg.center.y, msg.center.z), msg.radius);
      },
      onBarrelExplodeFx: (msg) => {
        const barrel = this.explosiveBarrels.find((eb) => eb.id === msg.barrelId);
        if (barrel && !barrel.exploded) {
          barrel.exploded = true;
          barrel.mesh.visible = false;
        }
        this.playBarrelExplosionFxOnly(new THREE.Vector3(msg.pos.x, msg.pos.y, msg.pos.z));
      },
      onPlayerRevived: (msg) => {
        if (msg.targetPlayerId === multiplayerClient.myPlayerId) {
          this.isDowned = false;
          this.playerHp = 100;
          this.bleedoutTimer = 25;
          this.lastDamageTime = Date.now();
          soundEngine.playPerkJingle('juggernog');
          this.scoreNotifications.unshift({
            id: Math.random().toString(),
            text: `REVIVED BY ${msg.reviverName.toUpperCase()}!`,
            points: 0,
            type: 'repair',
          });
          if (this.scoreNotifications.length > 5) this.scoreNotifications.pop();
          this.sendMpTransformImmediate();
        } else if (msg.reviverPlayerId === multiplayerClient.myPlayerId) {
          this.addScore(150, 'TEAMMATE REVIVED!');
          soundEngine.playPerkJingle('speedCola');
        }
        this.onStateUpdate?.();
      },
      onRoundStarted: (msg) => {
        this.stats.round = msg.round;
        this.stats.isRoundBreak = msg.isRoundBreak;
        this.stats.roundBreakTimer = msg.roundBreakTimer;
        this.zombiesToSpawn = msg.zombiesToSpawn;
        if (msg.round > 1) {
          this.grenadeCount = Math.min(this.maxGrenades, this.grenadeCount + 2);
          if (this.isDowned) {
            this.isDowned = false;
            this.playerHp = this.maxHp;
            this.bleedoutTimer = 25;
          }
          const beatMilestone = msg.round % 5 === 0;
          const beatPersonalBest = this.records.bestRound >= 3 && msg.round > this.records.bestRound;
          if ((beatMilestone || beatPersonalBest) && msg.round > this.lastHappyTimeRound) {
            this.lastHappyTimeRound = msg.round;
            crazyGames.triggerHappyTime();
          }
        }
        this.explosiveBarrels.forEach((eb) => {
          eb.exploded = false;
          eb.mesh.visible = true;
        });
        soundEngine.playRoundChange(true);
        this.syncRecords(true);
        this.updateCrazyGamesContext();
        this.onStateUpdate?.();
      },
      onGameOver: () => {
        this.isDowned = false;
        this.handleGameOver();
      },
    });
  }

  private enterDownedOrDie() {
    const anyTeammateAlive = this.remoteTeammates.some((m) => !m.isDowned);
    if (this.isMultiplayer && anyTeammateAlive) {
      this.isDowned = true;
      this.playerHp = 0;
      this.bleedoutTimer = 25;
      this.isAiming = false;
      this.isFiring = false;
      this.sendMpTransformImmediate();
      this.scoreNotifications.unshift({
        id: Math.random().toString(),
        text: 'DOWNED! TEAMMATES CAN REVIVE YOU!',
        points: 0,
        type: 'kill',
      });
      if (this.scoreNotifications.length > 5) this.scoreNotifications.pop();
    } else if (this.isMultiplayer) {
      this.isDowned = true;
      this.playerHp = 0;
      this.isAiming = false;
      this.isFiring = false;
      this.sendMpTransformImmediate();
    } else {
      this.playerHp = 0;
      this.handleGameOver();
    }
  }

  private sendMpTransformImmediate() {
    if (!this.isMultiplayer) return;
    const curWep = this.playerWeapons[this.currentWeaponIndex];
    multiplayerClient.send({
      type: 'player:transform',
      x: Number(this.playerPos.x.toFixed(3)),
      y: Number(this.playerPos.y.toFixed(3)),
      z: Number(this.playerPos.z.toFixed(3)),
      yaw: Number(this.yaw.toFixed(4)),
      pitch: Number(this.pitch.toFixed(4)),
      weaponId: curWep?.stats.id || 'pistol',
      isPap: Boolean(curWep?.stats.isPap),
      isFlashlightOn: this.isFlashlightOn,
      isMoving: this.mpLocalMoving,
      hp: Math.round(this.playerHp),
      maxHp: this.maxHp,
      isDowned: this.isDowned,
      score: this.stats.score,
      kills: this.stats.kills,
      headshots: this.stats.headshots,
    });
  }

  private syncRemotePlayers(members: CoopMemberState[]) {
    const myId = multiplayerClient.myPlayerId;
    const peers = members.filter((m) => m.playerId !== myId);
    this.remoteTeammates = peers;

    const peerIds = new Set(peers.map((p) => p.playerId));
    for (const [pid, rig] of this.remotePlayerRigs.entries()) {
      if (!peerIds.has(pid)) {
        this.scene.remove(rig.root);
        disposeRemotePlayerRig(rig);
        this.remotePlayerRigs.delete(pid);
      }
    }

    peers.forEach((m, idx) => {
      let rig = this.remotePlayerRigs.get(m.playerId);
      if (!rig) {
        rig = createRemotePlayerRig(
          m.playerId,
          m.displayName,
          m.weaponId || 'pistol',
          m.isPap,
          idx + 1,
          createWeapon3DModel
        );
        rig.root.position.set(m.x, Math.max(0, m.y - 1.6), m.z);
        this.scene.add(rig.root);
        this.remotePlayerRigs.set(m.playerId, rig);
      }

      rig.displayName = m.displayName;
      rig.targetPos.set(m.x, Math.max(-1.5, m.y - 1.6), m.z);
      rig.targetYaw = m.yaw;
      rig.targetPitch = m.pitch;
      rig.isDowned = m.isDowned;
      rig.isMoving = m.isMoving;
      rig.isFlashlightOn = m.isFlashlightOn;
      rig.hp = m.hp;
      rig.maxHp = m.maxHp;
      rig.score = m.score;
      rig.kills = m.kills;

      if (rig.currentWeaponId !== m.weaponId || rig.currentIsPap !== m.isPap) {
        rig.currentWeaponId = m.weaponId;
        rig.currentIsPap = m.isPap;
        while (rig.weaponMount.children.length > 0) {
          rig.weaponMount.remove(rig.weaponMount.children[0]);
        }
        const newWep = createWeapon3DModel(m.weaponId || 'pistol', m.isPap);
        newWep.scale.set(0.85, 0.85, 0.85);
        rig.weaponMount.add(newWep);
        rig.weaponMount.add(rig.muzzleFlash);
      }

      rig.flashlightCone.visible = m.isFlashlightOn && !m.isDowned;
      redrawNameplate(rig);
    });
  }

  private syncMultiplayerZombies(serverZombies: NetZombieState[]) {
    const serverIds = new Set(serverZombies.map((sz) => sz.id));

    for (let i = this.zombies.length - 1; i >= 0; i--) {
      const localZ = this.zombies[i];
      if (!serverIds.has(localZ.id)) {
        this.scene.remove(localZ.meshGroup);
        this.zombies.splice(i, 1);
        this.zombieTargets.delete(localZ.id);
      }
    }

    for (const sz of serverZombies) {
      let localZ = this.zombies.find((z) => z.id === sz.id);
      if (!localZ) {
        const group = this.buildZombieMesh(new THREE.Vector3(sz.x, sz.y, sz.z));
        this.scene.add(group);
        localZ = {
          id: sz.id,
          meshGroup: group,
          position: { x: sz.x, y: sz.y, z: sz.z },
          health: sz.health,
          maxHealth: sz.maxHealth,
          speed: sz.speed,
          damage: sz.damage,
          windowId: sz.windowId,
          state: sz.state,
          attackTimer: 0,
          breakPlankTimer: 0,
          walkCycle: Math.random() * Math.PI * 2,
          stunTimer: sz.stunTimer,
          slowTimer: sz.slowTimer,
          burnTimer: sz.burnTimer,
        };
        this.zombies.push(localZ);
      } else {
        localZ.health = sz.health;
        localZ.maxHealth = sz.maxHealth;
        localZ.state = sz.state;
        localZ.windowId = sz.windowId;
        localZ.stunTimer = sz.stunTimer;
        localZ.slowTimer = sz.slowTimer;
        localZ.burnTimer = sz.burnTimer;
      }
      this.zombieTargets.set(sz.id, { x: sz.x, y: sz.y, z: sz.z, yaw: sz.yaw });
    }
  }

  public loadSavedMatch(saved: SavedMatchState): boolean {
    if (this.isMapLoaded) {
      this.unloadMap();
    }

    try {
      if (saved.mapId === OFFICIAL_BLIGHTED_WOODS_ID) {
        this.activeMapConfig = undefined;
        this.activeOfficialMapId = OFFICIAL_BLIGHTED_WOODS_ID;
      } else if (saved.customMapConfig) {
        this.activeMapConfig = saved.customMapConfig;
        this.activeOfficialMapId = OFFICIAL_SECTOR_ZERO_ID;
      } else {
        this.activeMapConfig = undefined;
        this.activeOfficialMapId = OFFICIAL_SECTOR_ZERO_ID;
      }

      this.playerLoadout = sanitizeLoadout(saved.loadout);

      if (this.activeMapConfig) {
        this.setupCustomMap(this.activeMapConfig);
      } else if (this.activeOfficialMapId === OFFICIAL_BLIGHTED_WOODS_ID) {
        this.setupForestLavaMap();
      } else {
        this.scene.environment = this.defaultRoomEnv;
        this.scene.background = new THREE.Color('#101522');
        this.scene.fog = new THREE.Fog('#101522', 12, 42);
        this.setupLighting();
        this.setupRoom();
        this.setupWindowBarriers();
        this.setupPerkMachines();
        this.setupPackAPunch();
        this.setupMysteryBox();
        this.setupWallBuys();
      }

      // Restore stats & sync counters
      this.stats = {
        score: saved.stats.score ?? 500,
        totalScoreEarned: saved.stats.totalScoreEarned ?? 500,
        round: Math.max(1, saved.stats.round ?? 1),
        kills: Math.max(0, saved.stats.kills ?? 0),
        headshots: Math.max(0, saved.stats.headshots ?? 0),
        boardsRepaired: Math.max(0, saved.stats.boardsRepaired ?? 0),
        isGameOver: false,
        isPaused: false,
        isRoundBreak: Boolean(saved.stats.isRoundBreak),
        roundBreakTimer: saved.stats.roundBreakTimer ?? 0,
      };
      this.syncedRunKills = this.stats.kills;
      this.syncedRunHeadshots = this.stats.headshots;
      this.syncedRunBoards = this.stats.boardsRepaired;

      // Restore perks & HP
      this.perks = {
        juggernog: Boolean(saved.perks?.juggernog),
        speedCola: Boolean(saved.perks?.speedCola),
        doubleTap: Boolean(saved.perks?.doubleTap),
      };
      this.maxHp = this.perks.juggernog ? 250 : 100;
      this.playerHp = Math.min(this.maxHp, Math.max(10, saved.player.playerHp || this.maxHp));

      // Restore player transform & flashlight
      this.playerPos.set(saved.player.x, saved.player.y, saved.player.z);
      this.yaw = saved.player.yaw || 0;
      this.pitch = saved.player.pitch || 0;
      this.isFlashlightOn = saved.player.isFlashlightOn ?? true;
      this.applyFlashlightState();
      this.playerVel.set(0, 0, 0);
      this.isGrounded = true;
      this.camera.position.copy(this.playerPos);

      if (this.activeOfficialMapId === OFFICIAL_BLIGHTED_WOODS_ID) {
        if (this.playerPos.z < -120) {
          this.scene.background = new THREE.Color('#1f0704');
          this.scene.fog = new THREE.FogExp2('#1f0704', 0.017);
        } else {
          this.scene.background = new THREE.Color('#081018');
          this.scene.fog = new THREE.FogExp2('#081018', 0.022);
        }
      }

      // Restore weapons & grenades
      this.playerWeapons = saved.weapons.map((w) => ({
        stats: { ...w.stats },
        currentClip: w.currentClip,
        currentReserve: w.currentReserve,
        isReloading: false,
        reloadProgress: 0,
      }));
      if (this.playerWeapons.length === 0) {
        this.initPlayerStartingInventory();
      } else {
        this.currentWeaponIndex = Math.max(0, Math.min(this.playerWeapons.length - 1, saved.currentWeaponIndex || 0));
        const gDef = GRENADES_MAP[this.playerLoadout.grenadeType];
        this.maxGrenades = saved.maxGrenades || gDef.maxCount;
        this.grenadeCount = Math.min(this.maxGrenades, Math.max(0, saved.grenadeCount ?? gDef.startCount));
      }

      this.setupGunRig();
      this.setupPlayerBodyRig();

      // Restore window barrier plank counts
      if (Array.isArray(saved.barriers)) {
        saved.barriers.forEach((sb) => {
          const barrier = this.barriers[sb.id];
          const meshGroup = this.barrierMeshes[sb.id];
          if (barrier && meshGroup) {
            barrier.planks = Math.max(0, Math.min(barrier.maxPlanks, sb.planks));
            meshGroup.planks.forEach((p, idx) => {
              p.visible = idx < barrier.planks;
            });
          }
        });
      }

      // Restore explosive barrels
      const explodedSet = new Set(saved.explodedBarrelIds || []);
      this.explosiveBarrels.forEach((eb) => {
        if (explodedSet.has(eb.id)) {
          eb.exploded = true;
          eb.mesh.visible = false;
        }
      });

      // Restore zombies
      this.zombiesToSpawn = Math.max(0, saved.zombiesToSpawn || 0);
      this.zombies = [];
      if (Array.isArray(saved.zombies)) {
        saved.zombies.forEach((sz) => {
          const zPos = new THREE.Vector3(sz.x, sz.y, sz.z);
          const group = this.buildZombieMesh(zPos);
          this.scene.add(group);
          this.zombies.push({
            id: Math.random().toString(),
            meshGroup: group,
            position: { x: sz.x, y: sz.y, z: sz.z },
            health: sz.health,
            maxHealth: sz.maxHealth,
            speed: sz.speed,
            damage: sz.damage,
            windowId: sz.windowId,
            state: sz.state,
            attackTimer: 0,
            breakPlankTimer: 0,
            walkCycle: Math.random() * Math.PI * 2,
            stunTimer: sz.stunTimer,
            slowTimer: sz.slowTimer,
            burnTimer: sz.burnTimer,
          });
        });
      }

      this.isMapLoaded = true;
      this.autoSaveTimer = 0;
      this.lastHappyTimeRound = this.stats.round;
      crazyGames.startGameplay();
      this.updateCrazyGamesContext();
      this.reportCrazyGamesProgression();
      this.onStateUpdate?.();
      return true;
    } catch (e) {
      console.error('Failed to restore saved match:', e);
      this.unloadMap();
      return false;
    }
  }

  private setupForestLavaMap() {
    this.scene.environment = this.defaultRoomEnv;
    this.scene.background = new THREE.Color('#081018');
    this.scene.fog = new THREE.FogExp2('#081018', 0.022);

    this.ambientLight = new THREE.AmbientLight('#273b4f', 0.2 + this.settings.worldBrightness * 0.45);
    this.scene.add(this.ambientLight);

    this.playerFlashlight = new THREE.SpotLight('#e5f2ff', 0, 46, Math.PI / 5.5, 0.5, 0.65);
    this.playerFlashlight.position.set(0.12, -0.1, -0.2);
    this.camera.add(this.playerFlashlight);
    this.scene.add(this.playerFlashlight.target);
    this.applyFlashlightState();

    this.barriers = [];
    this.barrierMeshes = [];
    this.explosiveBarrels = [];
    this.customTeleporters = [];
    this.sconceLights = [];

    const maxAnisotropy = this.renderer?.capabilities?.getMaxAnisotropy?.() || 4;
    const state = buildForestLavaMap(this.scene, maxAnisotropy, createWeapon3DModel);
    this.forestLavaState = state;
    this.customSolidBoxes = state.solidBoxes;
    this.customZombieSpawners = state.zombieSpawners;

    this.customSpawnPos.copy(state.playerSpawnPos);
    this.customSpawnYaw = state.playerSpawnYaw;
    this.playerPos.copy(state.playerSpawnPos);
    this.playerVel.set(0, 0, 0);
    this.isGrounded = true;
    this.yaw = state.playerSpawnYaw;
    this.pitch = 0;
    this.camera.position.copy(this.playerPos);
  }

  private setupCustomMap(config: CustomMapConfig) {
    // Custom maps rely on placed Light Blocks & Player Flashlight so dark rooms stay genuinely dark
    this.scene.environment = null;
    this.scene.background = new THREE.Color('#030508');
    this.scene.fog = new THREE.Fog('#030508', 18, 65);

    this.ambientLight = new THREE.AmbientLight(config.ambientColor || '#0b0f18', 0.04 * this.settings.worldBrightness);
    this.scene.add(this.ambientLight);

    this.playerFlashlight = new THREE.SpotLight('#e5f2ff', 0, 42, Math.PI / 5.5, 0.5, 0.65);
    this.playerFlashlight.position.set(0.12, -0.1, -0.2);
    this.camera.add(this.playerFlashlight);
    this.scene.add(this.playerFlashlight.target);
    this.applyFlashlightState();

    this.barriers = [];
    this.barrierMeshes = [];
    this.customSolidBoxes = [];
    this.customZombieSpawners = [];
    this.explosiveBarrels = [];
    this.customTeleporters = [];
    this.sconceLights = [];
    this.customSpawnPos.set(0, 1.6, 0);
    this.customSpawnYaw = 0;
    this.playerPos.set(0, 1.6, 0);

    let barrierCount = 0;
    let playerSpawnObj: CustomMapConfig['objects'][number] | null = null;

    config.objects.forEach((obj) => {
      if (obj.type === 'zombie_spawn') {
        this.customZombieSpawners.push(new THREE.Vector3(obj.position.x, obj.position.y, obj.position.z));
      } else if (obj.type === 'block') {
        const geo = new THREE.BoxGeometry(obj.scale.x, obj.scale.y, obj.scale.z);
        let mat: THREE.Material;
        if (obj.texturePattern === 'concrete') {
          mat = new THREE.MeshStandardMaterial({ map: createFloorTexture(), color: obj.color, roughness: 0.8 });
        } else if (obj.texturePattern === 'brick') {
          mat = new THREE.MeshStandardMaterial({ map: createWallTexture(), color: obj.color, roughness: 0.6 });
        } else if (obj.texturePattern === 'wood') {
          mat = new THREE.MeshStandardMaterial({ map: createWoodPlankTexture(), color: obj.color, roughness: 0.7 });
        } else {
          mat = new THREE.MeshStandardMaterial({ color: obj.color, roughness: 0.5 });
        }

        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(obj.position.x, obj.position.y, obj.position.z);
        mesh.rotation.set(obj.rotation.x, obj.rotation.y, obj.rotation.z);
        mesh.receiveShadow = true;
        mesh.castShadow = true;
        this.scene.add(mesh);

        const ry = obj.rotation?.y || 0;
        const maxExtX = Math.abs(Math.cos(ry) * (obj.scale.x / 2)) + Math.abs(Math.sin(ry) * (obj.scale.z / 2));
        const maxExtZ = Math.abs(Math.sin(ry) * (obj.scale.x / 2)) + Math.abs(Math.cos(ry) * (obj.scale.z / 2));
        this.customSolidBoxes.push({
          minX: obj.position.x - maxExtX,
          maxX: obj.position.x + maxExtX,
          minZ: obj.position.z - maxExtZ,
          maxZ: obj.position.z + maxExtZ,
          minY: obj.position.y - obj.scale.y / 2,
          maxY: obj.position.y + obj.scale.y / 2,
        });
      } else if (obj.type === 'light') {
        const lightLevel = Math.max(0, obj.intensity ?? 0);
        const effIntensity = lightLevel * 6;
        const pLight = new THREE.PointLight(obj.color, effIntensity, obj.distance || 20, 1.0);
        pLight.position.set(obj.position.x, obj.position.y, obj.position.z);

        // Allow up to 2 shadow-casting custom lights to keep walls blocking light without overflowing WebGL texture units
        const shadowLightCount = this.scene.children.filter(
          (c) => (c as THREE.PointLight).isPointLight && c.castShadow
        ).length;
        if (lightLevel > 0 && shadowLightCount < 2) {
          pLight.castShadow = true;
          pLight.shadow.mapSize.width = 512;
          pLight.shadow.mapSize.height = 512;
          pLight.shadow.camera.far = obj.distance || 20;
          pLight.shadow.bias = -0.001;
        }
        this.scene.add(pLight);

        // Physical Light Block Fixture (emits visual glow matching its light level)
        const fixtureGrp = new THREE.Group();
        fixtureGrp.position.set(obj.position.x, obj.position.y, obj.position.z);
        fixtureGrp.rotation.set(obj.rotation.x, obj.rotation.y, obj.rotation.z);
        fixtureGrp.scale.set(obj.scale?.x || 1, obj.scale?.y || 1, obj.scale?.z || 1);

        const housing = new THREE.Mesh(
          new THREE.BoxGeometry(0.56, 0.22, 0.56),
          new THREE.MeshStandardMaterial({ color: '#181e29', roughness: 0.5, metalness: 0.7 })
        );
        housing.position.y = 0.14;
        fixtureGrp.add(housing);

        const coreMat = new THREE.MeshStandardMaterial({
          color: lightLevel > 0 ? obj.color : '#1f2937',
          emissive: obj.color,
          emissiveIntensity: lightLevel > 0 ? Math.min(4.0, 0.35 + lightLevel * 0.4) : 0,
          roughness: 0.2,
        });
        const core = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.28, 0.44), coreMat);
        core.position.y = -0.04;
        fixtureGrp.add(core);

        this.scene.add(fixtureGrp);
      } else if (obj.type === 'perk_juggernog' || obj.type === 'perk_speedcola' || obj.type === 'perk_doubletap') {
        const perkType = obj.type === 'perk_juggernog' ? 'juggernog' : obj.type === 'perk_speedcola' ? 'speedCola' : 'doubleTap';
        const grp = new THREE.Group();
        grp.position.set(obj.position.x, obj.position.y, obj.position.z);
        grp.rotation.set(obj.rotation.x, obj.rotation.y, obj.rotation.z);

        const bodyGeo = new THREE.BoxGeometry(1.4, 2.6, 1.2);
        const tex = createPerkMachineTexture(perkType);
        const frontMat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.3 });
        const sideMat = new THREE.MeshStandardMaterial({ color: obj.color, roughness: 0.4 });
        const body = new THREE.Mesh(bodyGeo, [sideMat, sideMat, sideMat, sideMat, frontMat, sideMat]);
        body.position.y = 1.3;
        grp.add(body);

        const pLight = new THREE.PointLight(obj.color, 1.8, 6);
        pLight.position.set(0, 2.5, 0.6);
        grp.add(pLight);

        this.scene.add(grp);

        this.customSolidBoxes.push({
          minX: obj.position.x - 0.7, maxX: obj.position.x + 0.7,
          minZ: obj.position.z - 0.6, maxZ: obj.position.z + 0.6,
          minY: obj.position.y, maxY: obj.position.y + 2.6,
        });
      } else if (obj.type === 'pack_a_punch') {
        const grp = new THREE.Group();
        grp.position.set(obj.position.x, obj.position.y, obj.position.z);
        grp.rotation.set(obj.rotation.x, obj.rotation.y, obj.rotation.z);

        const baseGeo = new THREE.BoxGeometry(2.4, 2.8, 1.2);
        const papTex = createPackAPunchTexture();
        const frontMat = new THREE.MeshStandardMaterial({ map: papTex, roughness: 0.3 });
        const metalMat = new THREE.MeshStandardMaterial({ color: '#1c2432', roughness: 0.4 });
        const base = new THREE.Mesh(baseGeo, [metalMat, metalMat, metalMat, metalMat, frontMat, metalMat]);
        base.position.y = 1.4;
        grp.add(base);

        const papLight = new THREE.PointLight('#00ffff', 1.8, 6);
        papLight.position.set(0, 1.6, 0.7);
        grp.add(papLight);

        this.scene.add(grp);

        this.customSolidBoxes.push({
          minX: obj.position.x - 1.2, maxX: obj.position.x + 1.2,
          minZ: obj.position.z - 0.6, maxZ: obj.position.z + 0.6,
          minY: obj.position.y, maxY: obj.position.y + 2.8,
        });
      } else if (obj.type === 'mystery_box') {
        const grp = new THREE.Group();
        grp.position.set(obj.position.x, obj.position.y, obj.position.z);
        grp.rotation.set(obj.rotation.x, obj.rotation.y, obj.rotation.z);

        const boxTex = createMysteryBoxTexture();
        const boxMat = new THREE.MeshStandardMaterial({ map: boxTex, roughness: 0.5 });
        const woodMat = new THREE.MeshStandardMaterial({ color: '#3b2210', roughness: 0.7 });
        const chest = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.9, 1.1), [boxMat, boxMat, woodMat, woodMat, boxMat, boxMat]);
        chest.position.y = 0.45;
        grp.add(chest);

        const boxLight = new THREE.PointLight('#ffaa22', 1.6, 6);
        boxLight.position.set(0, 1.2, 0);
        grp.add(boxLight);

        this.scene.add(grp);
      } else if (obj.type === 'window_barrier') {
        const id = barrierCount++;
        const posVec = new THREE.Vector3(obj.position.x, obj.position.y, obj.position.z);
        const dirVec = new THREE.Vector3(0, 0, -1).applyAxisAngle(new THREE.Vector3(0, 1, 0), obj.rotation.y);

        this.barriers.push({
          id,
          wallName: obj.name,
          position: posVec,
          direction: dirVec,
          planks: 5,
          maxPlanks: 5,
          isTargetedByZombie: false,
        });

        const grp = new THREE.Group();
        grp.position.copy(posVec);
        grp.rotation.set(obj.rotation.x, obj.rotation.y, obj.rotation.z);

        const plankTex = createWoodPlankTexture();
        const plankMat = new THREE.MeshStandardMaterial({ map: plankTex, roughness: 0.7 });
        const planks: THREE.Mesh[] = [];

        [-0.8, -0.4, 0, 0.4, 0.8].forEach((yOff) => {
          const p = new THREE.Mesh(new THREE.BoxGeometry(3.1, 0.28, 0.08), plankMat);
          p.position.set(0, yOff, 0);
          grp.add(p);
          planks.push(p);
        });

        this.scene.add(grp);
        this.barrierMeshes.push({ group: grp, planks });
      } else if (obj.type in WALL_BUY_CONFIG) {
        const grp = createCustomPropMesh(obj.type, obj.color);
        if (grp) {
          grp.position.set(obj.position.x, obj.position.y, obj.position.z);
          grp.rotation.set(obj.rotation.x, obj.rotation.y, obj.rotation.z);
          grp.scale.set(obj.scale?.x || 1, obj.scale?.y || 1, obj.scale?.z || 1);
          this.scene.add(grp);
        }
      } else if (
        obj.type === 'ammo_crate' ||
        obj.type === 'explosive_barrel' ||
        obj.type === 'teleporter' ||
        obj.type === 'crate_cover' ||
        obj.type === 'sandbag_wall' ||
        obj.type === 'pillar'
      ) {
        const grp = createCustomPropMesh(obj.type, obj.color);
        if (grp) {
          const sx = obj.scale?.x || 1;
          const sy = obj.scale?.y || 1;
          const sz = obj.scale?.z || 1;
          grp.position.set(obj.position.x, obj.position.y, obj.position.z);
          grp.rotation.set(obj.rotation.x, obj.rotation.y, obj.rotation.z);
          grp.scale.set(sx, sy, sz);
          this.scene.add(grp);

          if (obj.type === 'explosive_barrel') {
            this.explosiveBarrels.push({
              id: obj.id,
              mesh: grp,
              position: new THREE.Vector3(obj.position.x, obj.position.y + 0.6 * sy, obj.position.z),
              exploded: false,
              radius: 0.55 * Math.max(sx, sz),
            });
          } else if (obj.type === 'teleporter') {
            this.customTeleporters.push(new THREE.Vector3(obj.position.x, obj.position.y, obj.position.z));
          } else {
            // Solid collider bounds for cover props & ammo crate
            const baseW = obj.type === 'ammo_crate' ? 1.3 : obj.type === 'crate_cover' ? 1.4 : obj.type === 'sandbag_wall' ? 3.0 : 1.0;
            const baseH = obj.type === 'ammo_crate' ? 0.85 : obj.type === 'crate_cover' ? 1.2 : obj.type === 'sandbag_wall' ? 0.95 : 4.5;
            const baseD = obj.type === 'ammo_crate' ? 0.8 : obj.type === 'crate_cover' ? 1.4 : obj.type === 'sandbag_wall' ? 0.75 : 1.0;
            const ry = obj.rotation?.y || 0;
            const maxExtX = Math.abs(Math.cos(ry) * ((baseW * sx) / 2)) + Math.abs(Math.sin(ry) * ((baseD * sz) / 2));
            const maxExtZ = Math.abs(Math.sin(ry) * ((baseW * sx) / 2)) + Math.abs(Math.cos(ry) * ((baseD * sz) / 2));
            this.customSolidBoxes.push({
              minX: obj.position.x - maxExtX,
              maxX: obj.position.x + maxExtX,
              minZ: obj.position.z - maxExtZ,
              maxZ: obj.position.z + maxExtZ,
              minY: obj.position.y,
              maxY: obj.position.y + baseH * sy,
            });
          }
        }
      } else if (obj.type === 'player_spawn') {
        playerSpawnObj = obj;
      }
    });

    // Resolve exact player spawn position after all custom blocks/floors are registered
    let spawnX = 0;
    let spawnZ = 0;
    let spawnFeetY = 0;
    let spawnYaw = 0;

    if (playerSpawnObj) {
      const sp: CustomMapConfig['objects'][number] = playerSpawnObj;
      spawnX = sp.position.x;
      spawnZ = sp.position.z;
      spawnYaw = sp.rotation?.y || 0;

      let supportY = -Infinity;
      for (const b of this.customSolidBoxes) {
        if (spawnX >= b.minX && spawnX <= b.maxX && spawnZ >= b.minZ && spawnZ <= b.maxZ) {
          if (b.maxY <= sp.position.y + 0.5 && b.maxY > supportY) {
            supportY = b.maxY;
          }
        }
      }
      if (supportY === -Infinity) {
        supportY = 0;
      }

      if (sp.position.y <= supportY + 0.5) {
        spawnFeetY = Math.max(supportY, sp.position.y);
      } else if (Math.abs(sp.position.y - (supportY + 1.6)) <= 0.35) {
        spawnFeetY = supportY;
      } else {
        spawnFeetY = sp.position.y;
      }
    }

    this.customSpawnPos.set(spawnX, spawnFeetY + 1.6, spawnZ);
    this.customSpawnYaw = spawnYaw;
    this.playerPos.copy(this.customSpawnPos);
    this.playerVel.set(0, 0, 0);
    this.isGrounded = true;
    this.yaw = spawnYaw;
    this.pitch = 0;
    this.camera.position.copy(this.playerPos);
  }

  public unloadMap() {
    if (!this.isMapLoaded) return;

    // Remove all remote Co-Op teammate rigs
    for (const rig of this.remotePlayerRigs.values()) {
      this.scene.remove(rig.root);
      disposeRemotePlayerRig(rig);
    }
    this.remotePlayerRigs.clear();
    this.remoteTeammates = [];
    this.zombieTargets.clear();
    multiplayerClient.clearGameHooks();
    this.isMultiplayer = false;
    this.isDowned = false;
    this.bleedoutTimer = 25;
    this.mpReviveTargetId = null;
    this.mpReviveHoldTimer = 0;

    // Remove all zombies
    this.zombies.forEach((z) => this.scene.remove(z.meshGroup));
    this.zombies = [];

    // Remove all bullets, grenades, burn zones & particles
    this.bullets.forEach((b) => this.scene.remove(b.mesh));
    this.bullets = [];
    this.clearGrenadesAndZones();
    this.particles.forEach((p) => this.scene.remove(p.mesh));
    this.particles = [];

    // Clear camera attached children (gun rig, flashlight)
    while (this.camera.children.length > 0) {
      this.camera.remove(this.camera.children[0]);
    }

    // Clear all scene children (walls, floor, lights, perk machines, barriers)
    while (this.scene.children.length > 0) {
      const child = this.scene.children[0];
      this.scene.remove(child);
    }

    this.barriers = [];
    this.barrierMeshes = [];
    this.sconceLights = [];
    this.playerWeapons = [];

    // Reset stats
    this.stats = {
      score: 500,
      totalScoreEarned: 500,
      round: 1,
      kills: 0,
      headshots: 0,
      boardsRepaired: 0,
      isGameOver: false,
      isPaused: false,
      isRoundBreak: false,
      roundBreakTimer: 0,
    };

    this.playerHp = 100;
    this.maxHp = 100;
    this.playerPos.set(0, 1.6, 0);
    this.customSpawnPos.set(0, 1.6, 0);
    this.customSpawnYaw = 0;
    this.customSolidBoxes = [];
    this.customZombieSpawners = [];
    this.explosiveBarrels = [];
    this.customTeleporters = [];
    this.yaw = 0;
    this.pitch = 0;
    this.isGrounded = true;
    this.perks = { juggernog: false, speedCola: false, doubleTap: false };
    this.keys = {};
    this.playerVel.set(0, 0, 0);
    this.flashlightLensMat = null;
    this.isFlashlightOn = true;

    this.isMapLoaded = false;
    crazyGames.stopGameplay();
    crazyGames.clearGameContext();
    this.isFiring = false;
    this.isBoxSpinning = false;
    if (this.boxSpinTimeout) {
      clearTimeout(this.boxSpinTimeout);
      this.boxSpinTimeout = null;
    }
    this.activeMapConfig = undefined;
    this.activeOfficialMapId = OFFICIAL_SECTOR_ZERO_ID;
    this.forestLavaState = null;
    this.scene.environment = this.defaultRoomEnv;
    this.scene.background = new THREE.Color('#101522');
    this.scene.fog = new THREE.Fog('#101522', 12, 42);

    // Clear WebGL drawing buffer and render clean dark background once
    if (this.renderer) {
      this.renderer.clear();
      this.renderer.render(this.scene, this.camera);
    }

    this.onStateUpdate?.();
  }

  private setupLighting() {
    // Ambient Light - Atmospheric Shadowed Base
    this.ambientLight = new THREE.AmbientLight('#3d4b64', this.settings.worldBrightness);
    this.scene.add(this.ambientLight);

    // Warm Sky / Cool Ground Fill
    const hemi = new THREE.HemisphereLight('#566d94', '#201815', 1.0);
    this.scene.add(hemi);

    // Centered Warm Overhead Point Light
    const centerLight = new THREE.PointLight('#ffb044', 3.2, 38);
    centerLight.position.set(0, 4.3, 0);
    centerLight.castShadow = true;
    centerLight.shadow.bias = -0.0005;
    centerLight.shadow.mapSize.width = 1024;
    centerLight.shadow.mapSize.height = 1024;
    this.scene.add(centerLight);

    // Player Tactical Flashlight attached to camera
    this.playerFlashlight = new THREE.SpotLight('#e5f2ff', 0, 42, Math.PI / 5.5, 0.5, 0.65);
    this.playerFlashlight.position.set(0.12, -0.1, -0.2);
    this.camera.add(this.playerFlashlight);
    this.scene.add(this.playerFlashlight.target);
    this.applyFlashlightState();

    // 4 Wrought-Iron Lantern Wall Sconces (One above each window!)
    const sconcePositions = [
      new THREE.Vector3(0, 3.4, 11.2),  // South
      new THREE.Vector3(0, 3.4, -11.2), // North
      new THREE.Vector3(11.2, 3.4, 0),  // East
      new THREE.Vector3(-11.2, 3.4, 0), // West
    ];

    const cageMat = new THREE.MeshStandardMaterial({ color: '#161920', metalness: 0.85, roughness: 0.3 });
    const flameMat = new THREE.MeshBasicMaterial({ color: '#ff9922' });

    this.sconceLights = [];
    sconcePositions.forEach((pos) => {
      const sLight = new THREE.PointLight('#ff9922', 2.8, 16);
      sLight.position.copy(pos);
      this.scene.add(sLight);
      this.sconceLights.push(sLight);

      // Wrought-iron lantern housing & glowing flame core
      const lanternGroup = new THREE.Group();
      lanternGroup.position.copy(pos);

      const frame = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.48, 0.36), cageMat);
      const flameCore = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 8), flameMat);
      lanternGroup.add(frame);
      lanternGroup.add(flameCore);
      this.scene.add(lanternGroup);
    });
  }

  private setupRoom() {
    // Room Size: 24m x 24m, 5m High
    const roomSize = 24;

    // Matte dark concrete tile floor (non-shiny)
    const floorGeo = new THREE.PlaneGeometry(roomSize, roomSize);
    const floorMat = new THREE.MeshStandardMaterial({
      map: createFloorTexture(),
      roughness: 0.9,
      metalness: 0.05,
      side: THREE.DoubleSide,
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.scene.add(floor);

    // Ceiling
    const ceilGeo = new THREE.PlaneGeometry(roomSize, roomSize);
    const ceilMat = new THREE.MeshStandardMaterial({ color: '#1a202c', roughness: 0.8, side: THREE.DoubleSide });
    const ceiling = new THREE.Mesh(ceilGeo, ceilMat);
    ceiling.position.y = 5;
    ceiling.rotation.x = Math.PI / 2;
    this.scene.add(ceiling);

    // Wall Material
    const wallMat = new THREE.MeshStandardMaterial({
      map: createWallTexture(),
      roughness: 0.6,
      side: THREE.DoubleSide,
    });

    const frameMat = new THREE.MeshStandardMaterial({ color: '#2a3240', roughness: 0.4, metalness: 0.6 });

    // Helper to add a 3D wall with a center window opening (Width 3.2m, Height 2.6m)
    const buildSolidWall = (cx: number, cz: number, isAlongZ: boolean) => {
      const wallThickness = 0.6;
      const wallH = 5;
      const windowW = 3.2;
      const windowH = 2.6;
      const sideLength = (roomSize - windowW) / 2; // 10.4m

      if (!isAlongZ) {
        // Wall extends along X axis (South at Z=12, North at Z=-12)
        const leftBox = new THREE.Mesh(new THREE.BoxGeometry(sideLength, wallH, wallThickness), wallMat);
        leftBox.position.set(-sideLength / 2 - windowW / 2, wallH / 2, cz);
        leftBox.castShadow = true;
        leftBox.receiveShadow = true;
        this.scene.add(leftBox);

        const rightBox = new THREE.Mesh(new THREE.BoxGeometry(sideLength, wallH, wallThickness), wallMat);
        rightBox.position.set(sideLength / 2 + windowW / 2, wallH / 2, cz);
        rightBox.castShadow = true;
        rightBox.receiveShadow = true;
        this.scene.add(rightBox);

        const topBox = new THREE.Mesh(new THREE.BoxGeometry(windowW, wallH - windowH, wallThickness), wallMat);
        topBox.position.set(0, windowH + (wallH - windowH) / 2, cz);
        topBox.castShadow = true;
        topBox.receiveShadow = true;
        this.scene.add(topBox);

        const sill = new THREE.Mesh(new THREE.BoxGeometry(windowW + 0.4, 0.3, wallThickness + 0.3), frameMat);
        sill.position.set(0, 0.15, cz);
        this.scene.add(sill);

        const frameL = new THREE.Mesh(new THREE.BoxGeometry(0.15, windowH, wallThickness + 0.1), frameMat);
        frameL.position.set(-windowW / 2, windowH / 2, cz);
        const frameR = new THREE.Mesh(new THREE.BoxGeometry(0.15, windowH, wallThickness + 0.1), frameMat);
        frameR.position.set(windowW / 2, windowH / 2, cz);
        this.scene.add(frameL);
        this.scene.add(frameR);

        // Outer Alley Box & Cool Cyan Volumetric Moonlight Beam
        const alleyOffset = cz > 0 ? 3.5 : -3.5;
        const alleyGeo = new THREE.BoxGeometry(5, 4.5, 6);
        const alleyMat = new THREE.MeshStandardMaterial({ color: '#070b14', roughness: 0.9, side: THREE.BackSide });
        const alley = new THREE.Mesh(alleyGeo, alleyMat);
        alley.position.set(0, 2.25, cz + alleyOffset);
        this.scene.add(alley);

        const moonLight = new THREE.SpotLight('#33aaff', 8.5, 20, Math.PI / 3.5, 0.6);
        moonLight.position.set(0, 3.2, cz + alleyOffset);
        moonLight.target.position.set(0, 0, cz > 0 ? 6 : -6);
        this.scene.add(moonLight);
        this.scene.add(moonLight.target);
      } else {
        // Wall extends along Z axis (East at X=12, West at X=-12)
        const side1Box = new THREE.Mesh(new THREE.BoxGeometry(wallThickness, wallH, sideLength), wallMat);
        side1Box.position.set(cx, wallH / 2, -sideLength / 2 - windowW / 2);
        side1Box.castShadow = true;
        side1Box.receiveShadow = true;
        this.scene.add(side1Box);

        const side2Box = new THREE.Mesh(new THREE.BoxGeometry(wallThickness, wallH, sideLength), wallMat);
        side2Box.position.set(cx, wallH / 2, sideLength / 2 + windowW / 2);
        side2Box.castShadow = true;
        side2Box.receiveShadow = true;
        this.scene.add(side2Box);

        const topBox = new THREE.Mesh(new THREE.BoxGeometry(wallThickness, wallH - windowH, windowW), wallMat);
        topBox.position.set(cx, windowH + (wallH - windowH) / 2, 0);
        topBox.castShadow = true;
        topBox.receiveShadow = true;
        this.scene.add(topBox);

        const sill = new THREE.Mesh(new THREE.BoxGeometry(wallThickness + 0.3, 0.3, windowW + 0.4), frameMat);
        sill.position.set(cx, 0.15, 0);
        this.scene.add(sill);

        const frame1 = new THREE.Mesh(new THREE.BoxGeometry(wallThickness + 0.1, windowH, 0.15), frameMat);
        frame1.position.set(cx, windowH / 2, -windowW / 2);
        const frame2 = new THREE.Mesh(new THREE.BoxGeometry(wallThickness + 0.1, windowH, 0.15), frameMat);
        frame2.position.set(cx, windowH / 2, windowW / 2);
        this.scene.add(frame1);
        this.scene.add(frame2);

        // Outer Alley Box & Cool Cyan Volumetric Moonlight Beam
        const alleyOffset = cx > 0 ? 3.5 : -3.5;
        const alleyGeo = new THREE.BoxGeometry(6, 4.5, 5);
        const alleyMat = new THREE.MeshStandardMaterial({ color: '#070b14', roughness: 0.9, side: THREE.BackSide });
        const alley = new THREE.Mesh(alleyGeo, alleyMat);
        alley.position.set(cx + alleyOffset, 2.25, 0);
        this.scene.add(alley);

        const moonLight = new THREE.SpotLight('#33aaff', 8.5, 20, Math.PI / 3.5, 0.6);
        moonLight.position.set(cx + alleyOffset, 3.2, 0);
        moonLight.target.position.set(cx > 0 ? 6 : -6, 0, 0);
        this.scene.add(moonLight);
        this.scene.add(moonLight.target);
      }
    };

    buildSolidWall(0, 12, false);   // South Wall
    buildSolidWall(0, -12, false);  // North Wall
    buildSolidWall(12, 0, true);    // East Wall
    buildSolidWall(-12, 0, true);   // West Wall
  }

  private setupWindowBarriers() {
    // 4 Barriers: South, North, East, West (Room interior directions: South -Z, North +Z, East -X, West +X)
    const barrierConfigs = [
      { id: 0, wallName: 'South' as const, pos: new THREE.Vector3(0, 1.4, 11.7), dir: new THREE.Vector3(0, 0, -1) },
      { id: 1, wallName: 'North' as const, pos: new THREE.Vector3(0, 1.4, -11.7), dir: new THREE.Vector3(0, 0, 1) },
      { id: 2, wallName: 'East' as const, pos: new THREE.Vector3(11.7, 1.4, 0), dir: new THREE.Vector3(-1, 0, 0) },
      { id: 3, wallName: 'West' as const, pos: new THREE.Vector3(-11.7, 1.4, 0), dir: new THREE.Vector3(1, 0, 0) },
    ];

    const plankTex = createWoodPlankTexture();
    const plankMat = new THREE.MeshStandardMaterial({ map: plankTex, roughness: 0.7 });

    barrierConfigs.forEach((cfg) => {
      this.barriers.push({
        id: cfg.id,
        wallName: cfg.wallName,
        position: cfg.pos,
        direction: cfg.dir,
        planks: 5,
        maxPlanks: 5,
        isTargetedByZombie: false,
      });

      const group = new THREE.Group();
      group.position.copy(cfg.pos);

      if (cfg.wallName === 'East' || cfg.wallName === 'West') {
        group.rotation.y = Math.PI / 2;
      }

      const planks: THREE.Mesh[] = [];
      const plankHeights = [-0.8, -0.4, 0, 0.4, 0.8];

      plankHeights.forEach((yOff) => {
        const pGeo = new THREE.BoxGeometry(3.1, 0.28, 0.08);
        const plank = new THREE.Mesh(pGeo, plankMat);
        plank.position.set(0, yOff, 0);
        plank.castShadow = true;
        group.add(plank);
        planks.push(plank);
      });

      this.scene.add(group);
      this.barrierMeshes.push({ group, planks });
    });
  }

  private setupPerkMachines() {
    const perksData = [
      { type: 'juggernog' as const, color: '#dd1111', pos: new THREE.Vector3(6, 0, 11.1), ry: Math.PI, price: 2500, label: 'Titan Tonic' },
      { type: 'speedCola' as const, color: '#11dd44', pos: new THREE.Vector3(6, 0, -11.1), ry: 0, price: 3000, label: 'Blitz Brew' },
      { type: 'doubleTap' as const, color: '#eedd11', pos: new THREE.Vector3(-6, 0, -11.1), ry: 0, price: 2000, label: 'Fury Fizz' },
    ];

    perksData.forEach((p) => {
      const machineGroup = new THREE.Group();
      machineGroup.position.copy(p.pos);
      machineGroup.rotation.y = p.ry;

      // Vending Machine Body
      const bodyGeo = new THREE.BoxGeometry(1.4, 2.6, 1.2);
      const tex = createPerkMachineTexture(p.type);
      const frontMat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.3, metalness: 0.5 });
      const sideMat = new THREE.MeshStandardMaterial({ color: p.color, roughness: 0.4, metalness: 0.3 });

      const materials = [sideMat, sideMat, sideMat, sideMat, frontMat, sideMat];
      const body = new THREE.Mesh(bodyGeo, materials);
      body.position.y = 1.3;
      body.castShadow = true;
      machineGroup.add(body);

      // Top glowing header light
      const light = new THREE.PointLight(p.color, 1.8, 6);
      light.position.set(0, 2.5, 0.6);
      machineGroup.add(light);

      this.scene.add(machineGroup);
    });
  }

  private setupPackAPunch() {
    const papGroup = new THREE.Group();
    papGroup.position.set(-6, 0, 11.2); // South-West Wall section (Clear of South Window!)
    papGroup.rotation.y = Math.PI;

    const papTex = createPackAPunchTexture();
    const frontMat = new THREE.MeshStandardMaterial({
      map: papTex,
      roughness: 0.3,
      metalness: 0.6,
    });
    const metalMat = new THREE.MeshStandardMaterial({ color: '#1c2432', roughness: 0.4, metalness: 0.8 });
    const topMat = new THREE.MeshStandardMaterial({ color: '#0d131c', roughness: 0.5 });

    // Main station frame
    const baseGeo = new THREE.BoxGeometry(2.4, 2.8, 1.2);
    // Face index 4 (+Z front) uses frontMat with PaP texture
    const materials = [metalMat, metalMat, topMat, metalMat, frontMat, metalMat];
    const base = new THREE.Mesh(baseGeo, materials);
    base.position.y = 1.4;
    base.castShadow = true;
    papGroup.add(base);

    // Subtle warm/cyan interior slot light
    const papLight = new THREE.PointLight('#00ffff', 1.8, 6);
    papLight.position.set(0, 1.6, 0.7);
    papGroup.add(papLight);

    this.scene.add(papGroup);
  }

  private setupMysteryBox() {
    const boxGroup = new THREE.Group();
    boxGroup.position.set(11.2, 0, -5); // East Wall section (Clear of East Window!)
    boxGroup.rotation.y = -Math.PI / 2;

    const boxTex = createMysteryBoxTexture();
    const boxMat = new THREE.MeshStandardMaterial({
      map: boxTex,
      roughness: 0.5,
      metalness: 0.4,
    });
    const woodMat = new THREE.MeshStandardMaterial({ color: '#3b2210', roughness: 0.7 });

    // Wooden chest with brass straps & ? emblem
    const chestGeo = new THREE.BoxGeometry(2.2, 0.9, 1.1);
    const materials = [boxMat, boxMat, woodMat, woodMat, boxMat, boxMat];
    const chest = new THREE.Mesh(chestGeo, materials);
    chest.position.y = 0.45;
    chest.castShadow = true;
    boxGroup.add(chest);

    // Lid
    const lidGeo = new THREE.BoxGeometry(2.25, 0.2, 1.15);
    const lid = new THREE.Mesh(lidGeo, boxMat);
    lid.position.set(0, 0.95, 0);
    boxGroup.add(lid);

    // Warm golden interior light emanating from mystery box
    const boxLight = new THREE.PointLight('#ffaa22', 1.6, 6);
    boxLight.position.set(0, 1.2, 0);
    boxGroup.add(boxLight);

    this.scene.add(boxGroup);
  }

  private setupWallBuys() {
    const wallBuys = [
      { type: 'smg', name: 'MP40', price: 1000, pos: new THREE.Vector3(-11.6, 2.0, -5.0), ry: Math.PI / 2 },
      { type: 'ar', name: 'VX-44', price: 1500, pos: new THREE.Vector3(11.6, 2.0, 5.0), ry: -Math.PI / 2 },
      { type: 'shotgun', name: 'SG-26', price: 1200, pos: new THREE.Vector3(-11.6, 2.0, 5.0), ry: Math.PI / 2 },
    ];

    wallBuys.forEach((wb) => {
      const group = new THREE.Group();
      group.position.copy(wb.pos);
      group.rotation.y = wb.ry;

      // Solid steel wall plaque with weapon chalk drawing & price tag
      const tex = createWallBuyChalkTexture(wb.name, wb.price);
      const plaqueGeo = new THREE.BoxGeometry(2.2, 1.1, 0.08);
      const plaqueMat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.5, metalness: 0.5 });
      const plaque = new THREE.Mesh(plaqueGeo, plaqueMat);
      group.add(plaque);

      // 3D Gun Model mounted on wall plaque!
      const gunModel = createWeapon3DModel(wb.type, false);
      gunModel.scale.set(1.1, 1.1, 1.1);
      gunModel.position.set(0, 0.18, 0.1);
      gunModel.rotation.y = Math.PI / 2;
      group.add(gunModel);

      const light = new THREE.PointLight('#ffaa22', 1.5, 5);
      light.position.set(0, 0, 0.4);
      group.add(light);

      this.scene.add(group);
    });
  }

  private setupGunRig() {
    this.gunGroup = new THREE.Group();
    this.camera.add(this.gunGroup);
    this.scene.add(this.camera);

    // Position gun in bottom right of view
    this.gunGroup.position.set(0.28, -0.24, -0.45);

    // Build 3D Gun Model
    this.updateGunMesh();

    // Muzzle Flash Light attached directly to gunGroup at barrel tip
    this.muzzleFlashLight = new THREE.PointLight('#ffaa22', 0, 4);
    this.muzzleFlashLight.position.set(0.0, 0.04, -0.52);
    this.gunGroup.add(this.muzzleFlashLight);

    // Weapon-mounted Tactical Flashlight module (visible on side/underbarrel rail)
    const flashlightBody = new THREE.Mesh(
      new THREE.CylinderGeometry(0.018, 0.018, 0.14, 10),
      new THREE.MeshStandardMaterial({ color: '#1a202c', metalness: 0.75, roughness: 0.35 })
    );
    flashlightBody.rotation.x = Math.PI / 2;
    flashlightBody.position.set(-0.042, -0.025, -0.22);
    this.gunGroup.add(flashlightBody);

    const bezel = new THREE.Mesh(
      new THREE.CylinderGeometry(0.022, 0.019, 0.025, 10),
      new THREE.MeshStandardMaterial({ color: '#475569', metalness: 0.85, roughness: 0.25 })
    );
    bezel.rotation.x = Math.PI / 2;
    bezel.position.set(-0.042, -0.025, -0.295);
    this.gunGroup.add(bezel);

    this.flashlightLensMat = new THREE.MeshStandardMaterial({
      color: this.isFlashlightOn ? '#e5f4ff' : '#1e293b',
      emissive: '#bde3ff',
      emissiveIntensity: this.isFlashlightOn ? 2.5 : 0,
      roughness: 0.15,
    });
    const lens = new THREE.Mesh(new THREE.CircleGeometry(0.017, 10), this.flashlightLensMat);
    lens.rotation.y = Math.PI;
    lens.position.set(-0.042, -0.025, -0.309);
    this.gunGroup.add(lens);
  }

  private setupPlayerBodyRig() {
    this.playerBodyRig = new THREE.Group();
    this.scene.add(this.playerBodyRig);

    const vestMat = new THREE.MeshStandardMaterial({ color: '#1a222e', roughness: 0.8, metalness: 0.2 });
    const pantsMat = new THREE.MeshStandardMaterial({ color: '#2b3327', roughness: 0.9 });
    const bootMat = new THREE.MeshStandardMaterial({ color: '#11141a', roughness: 0.9 });

    // Tactical Operative Chest Vest (tucked behind neck pivot)
    const vest = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.36, 0.28), vestMat);
    vest.position.set(0, 0.9, 0.18);
    vest.castShadow = true;
    this.playerBodyRig.add(vest);

    // Left Leg Assembly & Boot
    this.playerLegL = new THREE.Group();
    this.playerLegL.position.set(-0.18, 0.75, 0);

    const thighL = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.65, 0.22), pantsMat);
    thighL.position.set(0, -0.35, 0);
    thighL.castShadow = true;
    this.playerLegL.add(thighL);

    const bootL = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.16, 0.36), bootMat);
    bootL.position.set(0, -0.65, -0.08); // Boots pointing forward (-Z)
    bootL.castShadow = true;
    this.playerLegL.add(bootL);
    this.playerBodyRig.add(this.playerLegL);

    // Right Leg Assembly & Boot
    this.playerLegR = new THREE.Group();
    this.playerLegR.position.set(0.18, 0.75, 0);

    const thighR = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.65, 0.22), pantsMat);
    thighR.position.set(0, -0.35, 0);
    thighR.castShadow = true;
    this.playerLegR.add(thighR);

    const bootR = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.16, 0.36), bootMat);
    bootR.position.set(0, -0.65, -0.08); // Boots pointing forward (-Z)
    bootR.castShadow = true;
    this.playerLegR.add(bootR);
    this.playerBodyRig.add(this.playerLegR);
  }

  private resolveMapCollisions(
    pos: THREE.Vector3,
    radius: number = 0.35,
    entityFeetY?: number,
    entityHeight: number = 1.75
  ) {
    const isCustom = this.usesSolidBoxes;
    const boxes: { minX: number; maxX: number; minZ: number; maxZ: number; minY?: number; maxY?: number }[] = isCustom
      ? this.customSolidBoxes
      : [
          // Pack-a-Punch Machine
          { minX: -7.2, maxX: -4.8, minZ: 10.6, maxZ: 11.8 },
          // Juggernog Machine
          { minX: 5.3, maxX: 6.7, minZ: 10.5, maxZ: 11.7 },
          // Speed Cola Machine
          { minX: 5.3, maxX: 6.7, minZ: -11.7, maxZ: -10.5 },
          // Double Tap Machine
          { minX: -6.7, maxX: -5.3, minZ: -11.7, maxZ: -10.5 },
          // Mystery Box
          { minX: 10.65, maxX: 11.75, minZ: -6.1, maxZ: -3.9 },
        ];

    boxes.forEach((b) => {
      // In custom maps, ignore floors/platforms below or at entity feet and ceilings above entity head
      if (entityFeetY !== undefined && b.minY !== undefined && b.maxY !== undefined) {
        if (b.maxY <= entityFeetY + 0.25 || b.minY >= entityFeetY + entityHeight) {
          return;
        }
      }

      const closestX = Math.max(b.minX, Math.min(b.maxX, pos.x));
      const closestZ = Math.max(b.minZ, Math.min(b.maxZ, pos.z));

      const distX = pos.x - closestX;
      const distZ = pos.z - closestZ;
      const distSq = distX * distX + distZ * distZ;

      if (distSq < radius * radius) {
        const dist = Math.sqrt(distSq);
        if (dist === 0) {
          const overlapL = pos.x - b.minX;
          const overlapR = b.maxX - pos.x;
          const overlapB = pos.z - b.minZ;
          const overlapT = b.maxZ - pos.z;
          const minOverlap = Math.min(overlapL, overlapR, overlapB, overlapT);

          if (minOverlap === overlapL) pos.x = b.minX - radius;
          else if (minOverlap === overlapR) pos.x = b.maxX + radius;
          else if (minOverlap === overlapB) pos.z = b.minZ - radius;
          else pos.z = b.maxZ + radius;
        } else {
          const overlap = radius - dist;
          pos.x += (distX / dist) * overlap;
          pos.z += (distZ / dist) * overlap;
        }
      }
    });
  }

  private updateGunMesh() {
    // Remove old gun mesh
    while (this.gunMesh.children.length > 0) {
      this.gunMesh.remove(this.gunMesh.children[0]);
    }
    this.gunGroup.remove(this.gunMesh);

    const curWep = this.playerWeapons[this.currentWeaponIndex];
    this.gunMesh = createWeapon3DModel(curWep.stats.id || curWep.stats.type, curWep.stats.isPap);
    this.gunGroup.add(this.gunMesh);
  }

  // Pointer Lock & Key Event Handlers
  private setupEventListeners() {
    // Prevent context menu on container for smooth right-click ADS
    this.container.addEventListener('contextmenu', (e) => e.preventDefault());

    // Mouse Click to Request Pointer Lock (Desktop/Computer only)
    this.container.addEventListener('click', (e) => {
      if (e.button === 0 && !this.isTouchMode) {
        if (this.isMapLoaded && !this.isPointerLocked && !this.stats.isGameOver && !this.stats.isPaused) {
          this.container.requestPointerLock();
        }
      }
    });

    // Left-Click Fire (supports both semi-auto tap and full-auto hold) & Right-Click ADS
    window.addEventListener('mousedown', (e) => {
      if (this.isTouchMode) return;
      if (e.button === 0 && this.isPointerLocked) {
        this.isFiring = true;
        this.shoot();
      } else if (e.button === 2 && this.isPointerLocked) {
        this.isAiming = true;
        this.onStateUpdate?.();
      }
    });

    window.addEventListener('mouseup', (e) => {
      if (this.isTouchMode) return;
      if (e.button === 0) {
        this.isFiring = false;
      } else if (e.button === 2) {
        this.isAiming = false;
        this.onStateUpdate?.();
      }
    });

    document.addEventListener('pointerlockchange', () => {
      this.isPointerLocked = document.pointerLockElement === this.container;
      if (this.isTouchMode) return;
      
      // Reset held key states & player velocity so player doesn't get stuck moving on pause/unlock
      this.keys = {};
      this.isFiring = false;
      this.playerVel.set(0, 0, 0);

      if (!this.isPointerLocked) {
        this.isAiming = false;
        if (this.isMapLoaded && !this.stats.isGameOver) {
          this.stats.isPaused = true;
          if (!this.isMultiplayer) {
            crazyGames.stopGameplay();
            this.saveCurrentMatch();
          }
        }
      } else {
        if (this.isMapLoaded) {
          this.stats.isPaused = false;
          if (!this.stats.isGameOver) {
            crazyGames.startGameplay();
          }
        }
      }
      this.onStateUpdate?.();
    });

    window.addEventListener('blur', () => {
      this.keys = {};
      this.touchMoveVec = { x: 0, y: 0 };
      this.touchSprint = false;
      this.isFiring = false;
      this.playerVel.set(0, 0, 0);
    });

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.keys = {};
        this.touchMoveVec = { x: 0, y: 0 };
        this.touchSprint = false;
        this.isFiring = false;
        this.playerVel.set(0, 0, 0);
        if (this.isMapLoaded && !this.stats.isGameOver) {
          this.saveCurrentMatch();
        }
      }
    });

    window.addEventListener('pagehide', () => {
      if (this.isMapLoaded && !this.stats.isGameOver) {
        this.saveCurrentMatch();
      }
    });

    // Mouse Movement
    document.addEventListener('mousemove', (e) => {
      if (!this.isPointerLocked) return;

      const sensitivity = this.settings.mouseSensitivity;
      this.yaw -= e.movementX * sensitivity;
      const pitchDelta = e.movementY * sensitivity * (this.settings.invertY ? -1 : 1);
      this.pitch -= pitchDelta;

      // Clamp pitch (-85 to +85 degrees)
      this.pitch = Math.max(-Math.PI / 2.1, Math.min(Math.PI / 2.1, this.pitch));
    });

    // Keyboard press
    window.addEventListener('keydown', (e) => {
      const canInput =
        this.isMapLoaded &&
        !this.stats.isPaused &&
        !this.stats.isGameOver &&
        (this.isPointerLocked || this.isTouchMode);
      if (!canInput) return;

      this.keys[e.code] = true;

      if (e.code === 'KeyR') {
        this.reloadCurrentWeapon();
      }
      if (e.code === 'Digit1') {
        this.switchWeapon(0);
      }
      if (e.code === 'Digit2') {
        this.switchWeapon(1);
      }
      if (e.code === 'KeyE') {
        this.isHoldingInteract = true;
        this.triggerInteraction();
      }
      if (e.code === 'KeyT' && !e.repeat) {
        this.toggleFlashlight();
      }
      if (e.code === 'KeyG' && !e.repeat) {
        this.throwGrenade();
      }
    });

    window.addEventListener('keyup', (e) => {
      if (!this.isMapLoaded) return;

      this.keys[e.code] = false;
      if (e.code === 'KeyE') {
        this.isHoldingInteract = false;
        this.repairTimer = 0;
      }
    });

    // Mouse Wheel Scroll Weapon Swap
    window.addEventListener('wheel', (e) => {
      if (!this.isPointerLocked) return;
      if (e.deltaY > 0) {
        this.switchWeapon((this.currentWeaponIndex + 1) % this.playerWeapons.length);
      } else {
        this.switchWeapon((this.currentWeaponIndex - 1 + this.playerWeapons.length) % this.playerWeapons.length);
      }
    });
  }

  private onWindowResize = () => {
    const w = this.container?.clientWidth || window.innerWidth;
    const h = this.container?.clientHeight || window.innerHeight;
    if (w <= 0 || h <= 0) return;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  };

  // Switch Active Weapon
  public switchWeapon(index: number) {
    if (index < 0 || index >= this.playerWeapons.length || index === this.currentWeaponIndex) return;
    this.isAiming = false;
    this.currentWeaponIndex = index;
    this.updateGunMesh();
    this.updateCrazyGamesContext();
    soundEngine.playReload();
    this.onStateUpdate?.();
  }

  // Reload Active Weapon
  public reloadCurrentWeapon() {
    const curWep = this.playerWeapons[this.currentWeaponIndex];
    if (curWep.isReloading || curWep.currentClip === curWep.stats.clipSize || curWep.currentReserve <= 0) return;

    curWep.isReloading = true;
    curWep.reloadProgress = 0;
    soundEngine.playReload();
    this.onStateUpdate?.();
  }

  // Player Shoot Action
  public shoot() {
    if (this.stats.isGameOver || this.stats.isPaused || this.isDowned) return;
    const curWep = this.playerWeapons[this.currentWeaponIndex];

    if (curWep.isReloading || this.shootCooldown > 0) return;

    if (curWep.currentClip <= 0) {
      this.reloadCurrentWeapon();
      return;
    }

    // Deduct ammo
    curWep.currentClip--;

    // Apply Double Tap speed boost if owned
    const fireRateMod = this.perks.doubleTap ? 0.65 : 1.0;
    this.shootCooldown = curWep.stats.fireRate * fireRateMod;

    // Play Sound
    soundEngine.playShoot(curWep.stats.type, curWep.stats.isPap, curWep.stats.id);

    // Muzzle Flash Light Trigger
    this.muzzleFlashLight.intensity = 3.5;

    // Recoil Kick Animation (relative to current ADS / hipfire Z position)
    const currentBaseZ = this.isAiming ? -0.32 : -0.45;
    this.gunGroup.position.z = currentBaseZ + 0.07;
    this.gunGroup.rotation.x = 0.18;

    // Damage calculation
    const damageMod = (this.perks.doubleTap ? 1.5 : 1.0) * (curWep.stats.isPap ? 2.0 : 1.0);
    const baseDamage = curWep.stats.damage * damageMod;

    const pelletsCount = curWep.stats.pellets || 1;
    // Aiming down sights narrows bullet spread by 65% for precision accuracy!
    const rawSpread = curWep.stats.spread || 0.012;
    const spread = this.isAiming ? rawSpread * 0.35 : rawSpread;

    const muzzlePos = new THREE.Vector3();
    this.muzzleFlashLight.getWorldPosition(muzzlePos);
    const camDir = new THREE.Vector3();
    this.camera.getWorldDirection(camDir);

    if (this.isMultiplayer) {
      const bulletColor = curWep.stats.isPap
        ? curWep.stats.papColor || '#00f0ff'
        : curWep.stats.bulletColor || '#ffcc00';
      multiplayerClient.send({
        type: 'combat:shootFx',
        origin: { x: muzzlePos.x, y: muzzlePos.y, z: muzzlePos.z },
        dir: { x: camDir.x, y: camDir.y, z: camDir.z },
        weaponId: curWep.stats.id,
        weaponType: curWep.stats.type,
        isPap: curWep.stats.isPap,
        color: bulletColor,
      });
    }

    for (let p = 0; p < pelletsCount; p++) {
      const raycaster = new THREE.Raycaster();
      const spreadX = (Math.random() - 0.5) * spread;
      const spreadY = (Math.random() - 0.5) * spread;

      const screenCenter = new THREE.Vector2(spreadX, spreadY);
      raycaster.setFromCamera(screenCenter, this.camera);

      // Spawn physical 3D flying bullet coming out of gun muzzle!
      this.spawnBulletProjectile(raycaster.ray.direction, curWep.stats, baseDamage);
    }

    this.onStateUpdate?.();
  }

  private spawnVisualTracer(origin: THREE.Vector3, dir: THREE.Vector3, color: string, isPap: boolean) {
    const bulletGeo = new THREE.CylinderGeometry(0.022, 0.012, 0.5, 6);
    const bulletMat = new THREE.MeshBasicMaterial({ color });
    const mesh = new THREE.Mesh(bulletGeo, bulletMat);
    mesh.position.copy(origin);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
    this.scene.add(mesh);

    this.bullets.push({
      mesh,
      vel: dir.clone().normalize().multiplyScalar(68),
      life: 0.9,
      isPap,
      damage: 0,
      color,
      isVisualOnly: true,
    });
  }

  private spawnBulletProjectile(dir: THREE.Vector3, wepStats: WeaponStats, damage: number) {
    // Exact 3D Muzzle position in world space
    const muzzlePos = new THREE.Vector3();
    this.muzzleFlashLight.getWorldPosition(muzzlePos);

    const isPap = wepStats.isPap;
    const bulletColor = isPap ? wepStats.papColor || '#00f0ff' : wepStats.bulletColor || '#ffcc00';
    const radiusTop = wepStats.type === 'launcher' ? 0.065 : wepStats.id === 'railgun' ? 0.035 : 0.025;
    const radiusBot = wepStats.type === 'launcher' ? 0.045 : 0.012;
    const length = wepStats.type === 'launcher' ? 0.65 : wepStats.id === 'railgun' ? 0.9 : 0.45;

    const bulletGeo = new THREE.CylinderGeometry(radiusTop, radiusBot, length, 8);
    const bulletMat = new THREE.MeshBasicMaterial({ color: bulletColor });
    const mesh = new THREE.Mesh(bulletGeo, bulletMat);

    mesh.position.copy(muzzlePos);

    // Align cylinder orientation along bullet flight trajectory
    const axis = new THREE.Vector3(0, 1, 0);
    mesh.quaternion.setFromUnitVectors(axis, dir.clone().normalize());

    this.scene.add(mesh);

    const speed = wepStats.bulletSpeed || 65.0; // Units per second
    const velocity = dir.clone().normalize().multiplyScalar(speed);

    this.bullets.push({
      mesh,
      vel: velocity,
      life: wepStats.type === 'launcher' ? 2.4 : 1.2,
      isPap,
      damage,
      splashRadius: wepStats.splashRadius,
      pierceLeft: wepStats.pierce || 0,
      hitZombieIds: new Set<string>(),
      color: bulletColor,
    });

    // Muzzle spark burst at gun barrel tip
    for (let i = 0; i < 4; i++) {
      const pGeo = new THREE.BoxGeometry(0.03, 0.03, 0.03);
      const pMat = new THREE.MeshBasicMaterial({ color: bulletColor });
      const pMesh = new THREE.Mesh(pGeo, pMat);
      pMesh.position.copy(muzzlePos);
      this.scene.add(pMesh);

      const pVel = dir.clone().multiplyScalar(12).add(
        new THREE.Vector3((Math.random() - 0.5) * 4, (Math.random() - 0.5) * 4, (Math.random() - 0.5) * 4)
      );
      this.particles.push({ mesh: pMesh, velocity: pVel, life: 0.15, maxLife: 0.15, color: bulletColor });
    }
  }

  private detonateProjectileSplash(center: THREE.Vector3, radius: number, maxDamage: number, splashColor: string) {
    if (radius >= 3.5) {
      soundEngine.playExplosion();
    }

    const burstCount = radius >= 3.5 ? 24 : 14;
    for (let i = 0; i < burstCount; i++) {
      const col = i % 2 === 0 ? splashColor : '#ffffff';
      const pMesh = new THREE.Mesh(
        new THREE.BoxGeometry(0.14, 0.14, 0.14),
        new THREE.MeshBasicMaterial({ color: col })
      );
      pMesh.position.copy(center);
      this.scene.add(pMesh);
      const vel = new THREE.Vector3(
        (Math.random() - 0.5) * 9,
        Math.random() * 6 + 1.5,
        (Math.random() - 0.5) * 9
      );
      this.particles.push({ mesh: pMesh, velocity: vel, life: 0.5, maxLife: 0.5, color: col });
    }

    let splashKills = 0;
    for (let i = this.zombies.length - 1; i >= 0; i--) {
      const z = this.zombies[i];
      const zCenter = z.meshGroup.position.clone().add(new THREE.Vector3(0, 1.0, 0));
      const dist = zCenter.distanceTo(center);
      if (dist <= radius) {
        const falloff = Math.max(0.35, 1 - dist / (radius * 1.15));
        const dmg = maxDamage * falloff;
        this.spawnBloodParticles(zCenter);
        if (this.isMultiplayer) {
          if (z.health - dmg <= 0) splashKills++;
          multiplayerClient.send({
            type: 'combat:hitZombie',
            zombieId: z.id,
            damage: dmg,
            hitType: 'torso',
            hitPoint: { x: zCenter.x, y: zCenter.y, z: zCenter.z },
            reason: 'BLAST KILL!',
          });
        } else {
          z.health -= dmg;
          if (z.health <= 0) {
            this.scene.remove(z.meshGroup);
            this.zombies.splice(i, 1);
            splashKills++;
            this.stats.kills++;
            this.addScore(80, 'BLAST KILL!');
          }
        }
      }
    }

    if (splashKills > 0) {
      soundEngine.playHitmarker(true, false);
      this.onHitmarker?.(true, false);
      if (!this.isMultiplayer) {
        this.checkRoundCompletion();
      }
    }
  }

  private updateBullets(delta: number) {
    const zombieMeshes: THREE.Object3D[] = [];
    this.zombies.forEach((z) => zombieMeshes.push(z.meshGroup));

    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const b = this.bullets[i];
      b.life -= delta;

      if (b.life <= 0) {
        this.scene.remove(b.mesh);
        b.mesh.geometry.dispose();
        (b.mesh.material as THREE.Material).dispose();
        this.bullets.splice(i, 1);
        continue;
      }

      // Step velocity movement
      const prevPos = b.mesh.position.clone();
      const stepVel = b.vel.clone().multiplyScalar(delta);
      const nextPos = prevPos.clone().add(stepVel);

      // Raycast along step vector for precise hit detection
      const raycaster = new THREE.Raycaster(prevPos, stepVel.clone().normalize(), 0, stepVel.length() + 0.1);
      const intersects = b.isVisualOnly ? [] : raycaster.intersectObjects(zombieMeshes, true);

      let consumed = false;

      if (intersects.length > 0) {
        for (const hit of intersects) {
          const hitObj = hit.object;
          const hitPoint = hit.point;

          // Find parent zombie
          const zombie = this.zombies.find((z) => {
            let p: THREE.Object3D | null = hitObj;
            while (p) {
              if (p === z.meshGroup) return true;
              p = p.parent;
            }
            return false;
          });

          if (!zombie || b.hitZombieIds?.has(zombie.id)) {
            continue;
          }

          b.hitZombieIds?.add(zombie.id);

          if (b.splashRadius && b.splashRadius > 0) {
            this.detonateProjectileSplash(hitPoint, b.splashRadius, b.damage, b.color || '#ff6600');
            consumed = true;
            break;
          }

          let hitMult = 1.0;
          let hitType: 'head' | 'chest' | 'torso' | 'limb' = 'torso';

          if (hitObj.name === 'zombieHead') {
            hitMult = 3.0;
            hitType = 'head';
          } else if (hitObj.name === 'zombieChest') {
            hitMult = 1.6;
            hitType = 'chest';
          } else if (hitObj.name === 'zombieTorso') {
            hitMult = 1.0;
            hitType = 'torso';
          } else if (hitObj.name.startsWith('zombieArm') || hitObj.name.startsWith('zombieLeg')) {
            hitMult = 0.6;
            hitType = 'limb';
          }

          const hitDamage = b.damage * hitMult;
          this.spawnBloodParticles(hitPoint);

          if (this.isMultiplayer) {
            const predictedKill = zombie.health - hitDamage <= 0;
            soundEngine.playHitmarker(predictedKill, hitType === 'head');
            this.onHitmarker?.(predictedKill, hitType === 'head');
            multiplayerClient.send({
              type: 'combat:hitZombie',
              zombieId: zombie.id,
              damage: hitDamage,
              hitType,
              hitPoint: { x: hitPoint.x, y: hitPoint.y, z: hitPoint.z },
            });
          } else {
            zombie.health -= hitDamage;

            const isKill = zombie.health <= 0;
            const isHeadshot = hitType === 'head';
            soundEngine.playHitmarker(isKill, isHeadshot);
            this.onHitmarker?.(isKill, isHeadshot);

            if (isKill) {
              let pts = 60;
              let reason = 'ZOMBIE KILL';
              if (hitType === 'head') {
                pts = 100;
                reason = 'HEADSHOT KILL!';
                this.stats.headshots++;
              } else if (hitType === 'chest') {
                pts = 75;
                reason = 'VITAL CHEST KILL!';
              } else if (hitType === 'limb') {
                pts = 50;
                reason = 'LIMB KILL';
              }
              this.addScore(pts, reason);
              this.stats.kills++;

              this.scene.remove(zombie.meshGroup);
              this.zombies = this.zombies.filter((z) => z.id !== zombie.id);
              this.checkRoundCompletion();
            } else {
              let reason = 'BODY HIT';
              if (hitType === 'head') reason = 'HEADSHOT HIT! [3.0x]';
              else if (hitType === 'chest') reason = 'CHEST VITAL HIT [1.6x]';
              else if (hitType === 'limb') reason = 'LIMB HIT [0.6x]';
              this.addScore(10, reason);
            }
          }

          if (b.pierceLeft && b.pierceLeft > 0) {
            b.pierceLeft--;
          } else {
            consumed = true;
            break;
          }
        }
      }

      if (consumed) {
        this.scene.remove(b.mesh);
        b.mesh.geometry.dispose();
        (b.mesh.material as THREE.Material).dispose();
        this.bullets.splice(i, 1);
        continue;
      }

      // Check Explosive Barrels raycast / proximity hit
      const activeBarrels = b.isVisualOnly ? [] : this.explosiveBarrels.filter((eb) => !eb.exploded);
      if (activeBarrels.length > 0) {
        const barrelMeshes = activeBarrels.map((eb) => eb.mesh);
        const barrelHits = raycaster.intersectObjects(barrelMeshes, true);
        if (barrelHits.length > 0) {
          const hitObj = barrelHits[0].object;
          const barrel = activeBarrels.find((eb) => {
            let p: THREE.Object3D | null = hitObj;
            while (p) {
              if (p === eb.mesh) return true;
              p = p.parent;
            }
            return false;
          });
          if (barrel) {
            this.detonateExplosiveBarrel(barrel);
            this.scene.remove(b.mesh);
            b.mesh.geometry.dispose();
            (b.mesh.material as THREE.Material).dispose();
            this.bullets.splice(i, 1);
            continue;
          }
        }
      }

      // Check if bullet is passing through a window barrier opening
      const isPassingThroughWindow = this.barriers.some((bar) => {
        const dx = nextPos.x - bar.position.x;
        const dz = nextPos.z - bar.position.z;
        const dist2D = Math.sqrt(dx * dx + dz * dz);
        return dist2D <= 2.2 && nextPos.y >= 0 && nextPos.y <= 3.5;
      });

      // Check wall bounds collision
      const maxRange = this.usesSolidBoxes ? 300.0 : 28.0;
      const isOutOfBounds =
        nextPos.y <= (this.usesSolidBoxes ? -2.0 : 0) ||
        nextPos.y >= (this.usesSolidBoxes ? 40.0 : 5.5) ||
        Math.abs(nextPos.x) >= maxRange ||
        Math.abs(nextPos.z) >= maxRange;

      const isHittingCustomBlock =
        this.usesSolidBoxes &&
        !isPassingThroughWindow &&
        this.customSolidBoxes.some(
          (box) =>
            nextPos.x >= box.minX &&
            nextPos.x <= box.maxX &&
            nextPos.y >= box.minY &&
            nextPos.y <= box.maxY &&
            nextPos.z >= box.minZ &&
            nextPos.z <= box.maxZ
        );

      const isHittingSolidWall =
        isHittingCustomBlock ||
        (!this.usesSolidBoxes &&
          !isPassingThroughWindow &&
          (Math.abs(nextPos.x) >= 11.6 || Math.abs(nextPos.z) >= 11.6));

      if (isOutOfBounds || isHittingSolidWall) {
        if (b.splashRadius && b.splashRadius > 0) {
          this.detonateProjectileSplash(nextPos, b.splashRadius, b.damage, b.color || '#ff6600');
        } else if (isHittingSolidWall) {
          this.spawnWallSparks(nextPos, b.isPap);
        }

        this.scene.remove(b.mesh);
        b.mesh.geometry.dispose();
        (b.mesh.material as THREE.Material).dispose();
        this.bullets.splice(i, 1);
        continue;
      }

      // Move bullet forward
      b.mesh.position.copy(nextPos);
    }
  }

  private spawnWallSparks(pos: THREE.Vector3, isPap: boolean) {
    const color = isPap ? '#00f0ff' : '#ffaa22';
    for (let i = 0; i < 5; i++) {
      const pGeo = new THREE.BoxGeometry(0.04, 0.04, 0.04);
      const pMat = new THREE.MeshBasicMaterial({ color });
      const mesh = new THREE.Mesh(pGeo, pMat);
      mesh.position.copy(pos);
      this.scene.add(mesh);

      const vel = new THREE.Vector3(
        (Math.random() - 0.5) * 4,
        Math.random() * 4,
        (Math.random() - 0.5) * 4
      );
      this.particles.push({ mesh, velocity: vel, life: 0.2, maxLife: 0.2, color });
    }
  }

  private spawnBloodParticles(pos: THREE.Vector3) {
    for (let i = 0; i < 6; i++) {
      const pGeo = new THREE.BoxGeometry(0.06, 0.06, 0.06);
      const pMat = new THREE.MeshBasicMaterial({ color: '#880000' });
      const mesh = new THREE.Mesh(pGeo, pMat);
      mesh.position.copy(pos);
      this.scene.add(mesh);

      const vel = new THREE.Vector3(
        (Math.random() - 0.5) * 3,
        Math.random() * 3,
        (Math.random() - 0.5) * 3
      );
      this.particles.push({ mesh, velocity: vel, life: 0.35, maxLife: 0.35, color: '#880000' });
    }
  }

  // Points Add Helper
  public addScore(amount: number, reason: string) {
    this.stats.score += amount;
    this.stats.totalScoreEarned += amount;
    this.scoreNotifications.unshift({
      id: Math.random().toString(),
      text: `+${amount} ${reason}`,
      points: amount,
      type: reason.includes('HEADSHOT') ? 'headshot' : reason.includes('KILL') ? 'kill' : reason.includes('REPAIRED') ? 'repair' : 'hit',
    });
    if (this.scoreNotifications.length > 5) this.scoreNotifications.pop();
    this.onStateUpdate?.();
  }

  // Wave Manager
  private startRound(roundNum: number) {
    this.stats.round = roundNum;
    this.stats.isRoundBreak = true;
    this.stats.roundBreakTimer = 5;

    // Resupply +2 grenades at the start of each new survival wave (up to max)
    if (roundNum > 1) {
      this.grenadeCount = Math.min(this.maxGrenades, this.grenadeCount + 2);
    }

    // Respawn explosive barrels at start of new wave
    this.explosiveBarrels.forEach((eb) => {
      eb.exploded = false;
      eb.mesh.visible = true;
    });

    soundEngine.playRoundChange(true);
    this.onStateUpdate?.();

    // Spawn count formula
    this.zombiesToSpawn = 6 + (roundNum - 1) * 4;

    // Trigger CrazyGames HappyTime (milestones or beating round 3+ personal best) & Auto-Save
    if (roundNum > 1) {
      const beatMilestone = roundNum % 5 === 0;
      const beatPersonalBest = this.records.bestRound >= 3 && roundNum > this.records.bestRound;
      if ((beatMilestone || beatPersonalBest) && roundNum > this.lastHappyTimeRound) {
        this.lastHappyTimeRound = roundNum;
        crazyGames.triggerHappyTime();
      }
      this.saveCurrentMatch();
      this.updateCrazyGamesContext();
    }
  }

  private playBarrelExplosionFxOnly(pos: THREE.Vector3) {
    soundEngine.playExplosion();
    for (let i = 0; i < 28; i++) {
      const col = i % 3 === 0 ? '#ff3300' : i % 3 === 1 ? '#ffaa00' : '#444444';
      const pMesh = new THREE.Mesh(
        new THREE.BoxGeometry(0.18, 0.18, 0.18),
        new THREE.MeshBasicMaterial({ color: col })
      );
      pMesh.position.copy(pos);
      this.scene.add(pMesh);
      const vel = new THREE.Vector3(
        (Math.random() - 0.5) * 10,
        Math.random() * 8 + 2,
        (Math.random() - 0.5) * 10
      );
      this.particles.push({ mesh: pMesh, velocity: vel, life: 0.65, maxLife: 0.65, color: col });
    }
  }

  private detonateExplosiveBarrel(barrel: { id: string; mesh: THREE.Group; position: THREE.Vector3; exploded: boolean; radius: number }) {
    if (barrel.exploded) return;
    barrel.exploded = true;
    barrel.mesh.visible = false;
    this.playBarrelExplosionFxOnly(barrel.position);

    if (this.isMultiplayer) {
      multiplayerClient.send({
        type: 'combat:barrelExplode',
        barrelId: barrel.id,
        pos: { x: barrel.position.x, y: barrel.position.y, z: barrel.position.z },
      });
      return;
    }

    // Blast damage to nearby zombies
    const blastRadius = 6.5;
    let kills = 0;
    for (let i = this.zombies.length - 1; i >= 0; i--) {
      const z = this.zombies[i];
      const zPos = z.meshGroup.position;
      const dist = zPos.distanceTo(barrel.position);
      if (dist <= blastRadius) {
        const dmg = 320 * (1 - dist / (blastRadius * 1.2));
        z.health -= dmg;
        this.spawnBloodParticles(zPos.clone().add(new THREE.Vector3(0, 1, 0)));
        if (z.health <= 0) {
          this.scene.remove(z.meshGroup);
          this.zombies.splice(i, 1);
          kills++;
          this.stats.kills++;
          this.addScore(80, 'BARREL BLAST KILL!');
        }
      }
    }
    if (kills > 0) {
      soundEngine.playHitmarker(true, false);
      this.onHitmarker?.(true, false);
      this.checkRoundCompletion();
    }
  }

  private spawnZombie() {
    if (this.zombiesToSpawn <= 0) return;

    // Determine Spawn location
    let spawnPos = new THREE.Vector3();
    let barrier: WindowBarrier | null = null;
    let initialState: Zombie['state'] = 'chasing_player';

    if (this.customZombieSpawners.length > 0) {
      const sp = this.customZombieSpawners[Math.floor(Math.random() * this.customZombieSpawners.length)];
      spawnPos.copy(sp);

      // Check if there is a window barrier near this spawner (within 10m) with intact planks
      let closestBarrier: WindowBarrier | null = null;
      let minBarrierDist = 10.0;
      this.barriers.forEach((b) => {
        const dist = b.position.distanceTo(spawnPos);
        if (dist < minBarrierDist && b.planks > 0) {
          minBarrierDist = dist;
          closestBarrier = b;
        }
      });

      if (closestBarrier) {
        barrier = closestBarrier;
        initialState = 'approaching_window';
      } else {
        initialState = 'chasing_player';
      }
    } else if (this.barriers.length > 0) {
      barrier = this.barriers[Math.floor(Math.random() * this.barriers.length)];
      const spawnOffset = barrier.direction.clone().multiplyScalar(-3.5);
      spawnPos.copy(barrier.position.clone().add(spawnOffset));
      spawnPos.y = 0;
      initialState = 'approaching_window';
    } else if (!this.usesSolidBoxes) {
      spawnPos.set((Math.random() - 0.5) * 16, 0, (Math.random() - 0.5) * 16);
      initialState = 'chasing_player';
    } else {
      return;
    }

    // Zombie Mesh Group
    const group = this.buildZombieMesh(spawnPos);
    this.scene.add(group);

    // Zombie HP & Speed scaling per round
    const hp = 100 * Math.pow(1.18, this.stats.round - 1);
    const speed = 0.65 + Math.min((this.stats.round - 1) * 0.28, 2.4);

    this.zombies.push({
      id: Math.random().toString(),
      meshGroup: group,
      position: { x: spawnPos.x, y: spawnPos.y, z: spawnPos.z },
      health: hp,
      maxHealth: hp,
      speed,
      damage: 30,
      windowId: barrier ? barrier.id : null,
      state: initialState,
      attackTimer: 0,
      breakPlankTimer: 0,
      walkCycle: Math.random() * Math.PI * 2,
    });

    this.zombiesToSpawn--;
  }

  private buildZombieMesh(spawnPos: THREE.Vector3): THREE.Group {
    const group = new THREE.Group();

    const skinMat = new THREE.MeshStandardMaterial({ color: '#2e3b2e', roughness: 0.8 });
    const clothesMat = new THREE.MeshStandardMaterial({ color: '#1f242e', roughness: 0.9 });
    const coatMat = new THREE.MeshStandardMaterial({ color: '#2d3542', roughness: 0.85 });
    const buckleMat = new THREE.MeshStandardMaterial({ color: '#b8860b', metalness: 0.8, roughness: 0.3 });
    const bootMat = new THREE.MeshStandardMaterial({ color: '#12151c', roughness: 0.9 });
    const eyeMat = new THREE.MeshBasicMaterial({ color: '#ff2200' });

    // Upper Chest (Vital Spot) - Ripped military coat with brass buttons
    const chest = new THREE.Mesh(new THREE.BoxGeometry(0.74, 0.46, 0.44), coatMat);
    chest.name = 'zombieChest';
    chest.position.y = 1.28;
    chest.castShadow = true;
    group.add(chest);

    // Collar trim
    const collar = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.1, 0.46), clothesMat);
    collar.position.y = 1.5;
    group.add(collar);

    // Lower Torso (Stomach) - Belt & Buckle
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.44, 0.38), clothesMat);
    torso.name = 'zombieTorso';
    torso.position.y = 0.83;
    torso.castShadow = true;
    group.add(torso);

    const belt = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.08, 0.4), bootMat);
    belt.position.y = 0.85;
    group.add(belt);

    const buckle = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.12, 0.42), buckleMat);
    buckle.position.y = 0.85;
    group.add(buckle);

    // Head - Low-Poly Polygonal Skull (Icosahedron detail 0)
    const head = new THREE.Mesh(new THREE.IcosahedronGeometry(0.28, 0), skinMat);
    head.name = 'zombieHead'; // Identified for headshots!
    head.position.y = 1.68;
    head.castShadow = true;
    group.add(head);

    // Sunken Undead Jaw (Facing -Z forward)
    const jaw = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.1, 0.16), skinMat);
    jaw.position.set(0, 1.48, -0.12);
    group.add(jaw);

    // Glowing Red Eyes (Facing -Z forward)
    const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.045, 6, 6), eyeMat);
    eyeL.position.set(-0.09, 1.71, -0.23);
    const eyeR = new THREE.Mesh(new THREE.SphereGeometry(0.045, 6, 6), eyeMat);
    eyeR.position.set(0.09, 1.71, -0.23);
    group.add(eyeL);
    group.add(eyeR);

    // Left Arm Assembly (Limbs - Reaching forward along -Z)
    const armL = new THREE.Group();
    armL.name = 'zombieArmL';
    armL.position.set(-0.45, 1.25, -0.05);

    const shoulderL = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.22, 0.22), coatMat);
    shoulderL.position.set(0, 0, 0);
    armL.add(shoulderL);

    const bicepL = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.45, 0.18), skinMat);
    bicepL.position.set(0, -0.22, -0.14);
    bicepL.rotation.x = Math.PI / 3;
    armL.add(bicepL);
    group.add(armL);

    // Right Arm Assembly (Limbs - Reaching forward along -Z)
    const armR = new THREE.Group();
    armR.name = 'zombieArmR';
    armR.position.set(0.45, 1.25, -0.05);

    const shoulderR = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.22, 0.22), coatMat);
    shoulderR.position.set(0, 0, 0);
    armR.add(shoulderR);

    const bicepR = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.45, 0.18), skinMat);
    bicepR.position.set(0, -0.22, -0.14);
    bicepR.rotation.x = Math.PI / 3;
    armR.add(bicepR);
    group.add(armR);

    // Left Leg & Combat Boot
    const legL = new THREE.Group();
    legL.name = 'zombieLegL';
    legL.position.set(-0.2, 0.6, 0);

    const thighL = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.6, 0.24), clothesMat);
    thighL.position.set(0, -0.3, 0);
    legL.add(thighL);

    const bootL = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.16, 0.36), bootMat);
    bootL.position.set(0, -0.55, -0.06);
    legL.add(bootL);
    group.add(legL);

    // Right Leg & Combat Boot
    const legR = new THREE.Group();
    legR.name = 'zombieLegR';
    legR.position.set(0.2, 0.6, 0);

    const thighR = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.6, 0.24), clothesMat);
    thighR.position.set(0, -0.3, 0);
    legR.add(thighR);

    const bootR = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.16, 0.36), bootMat);
    bootR.position.set(0, -0.55, -0.06);
    legR.add(bootR);
    group.add(legR);

    group.position.copy(spawnPos);
    return group;
  }

  private checkRoundCompletion() {
    if (this.zombiesToSpawn <= 0 && this.zombies.length === 0 && !this.stats.isRoundBreak) {
      this.startRound(this.stats.round + 1);
    }
  }

  // Main Interactive Prompts Check
  private updateInteractivePrompts() {
    this.currentPrompt = '';
    this.interactTargetAction = null;
    this.mpReviveTargetId = null;

    if (this.isDowned) {
      this.currentPrompt = `DOWNED — WAIT FOR TEAMMATE REVIVE (${Math.ceil(this.bleedoutTimer)}S)`;
      this.onStateUpdate?.();
      return;
    }

    // Check Distance to Player Camera
    const playerPos2D = new THREE.Vector2(this.playerPos.x, this.playerPos.z);

    // 0. Check Downed Co-Op Teammates (Highest Priority)
    if (this.isMultiplayer) {
      for (const m of this.remoteTeammates) {
        if (!m.isDowned) continue;
        const d = playerPos2D.distanceTo(new THREE.Vector2(m.x, m.z));
        if (d < 2.6) {
          this.mpReviveTargetId = m.playerId;
          this.currentPrompt = `HOLD 'E' TO REVIVE ${m.displayName.toUpperCase()} (+150 PTS)`;
          this.interactTargetAction = () => {
            multiplayerClient.send({ type: 'player:revive', targetPlayerId: m.playerId });
          };
          this.onStateUpdate?.();
          return;
        }
      }
    }

    // 1. Check Window Barriers (Repair Planks)
    this.barriers.forEach((b) => {
      const bPos2D = new THREE.Vector2(b.position.x, b.position.z);
      if (playerPos2D.distanceTo(bPos2D) < 2.5 && b.planks < b.maxPlanks) {
        this.currentPrompt = `HOLD 'E' TO REPAIR BARRIER (+10 PTS)`;
        this.interactTargetAction = () => this.repairPlank(b);
      }
    });

    if (this.activeMapConfig) {
      this.activeMapConfig.objects.forEach((obj) => {
        const obj2D = new THREE.Vector2(obj.position.x, obj.position.z);
        const dist = playerPos2D.distanceTo(obj2D);

        if (dist < 2.5) {
          if (obj.type === 'perk_juggernog' && !this.perks.juggernog) {
            this.currentPrompt = `PRESS 'E' FOR TITAN TONIC [2,500 PTS]`;
            this.interactTargetAction = () => this.buyPerk('juggernog', 2500);
          } else if (obj.type === 'perk_speedcola' && !this.perks.speedCola) {
            this.currentPrompt = `PRESS 'E' FOR BLITZ BREW [3,000 PTS]`;
            this.interactTargetAction = () => this.buyPerk('speedCola', 3000);
          } else if (obj.type === 'perk_doubletap' && !this.perks.doubleTap) {
            this.currentPrompt = `PRESS 'E' FOR FURY FIZZ [2,000 PTS]`;
            this.interactTargetAction = () => this.buyPerk('doubleTap', 2000);
          } else if (obj.type === 'pack_a_punch') {
            const curWep = this.playerWeapons[this.currentWeaponIndex];
            if (curWep && !curWep.stats.isPap) {
              this.currentPrompt = `PRESS 'E' TO HYPER-FORGE ${curWep.stats.name} [5,000 PTS]`;
              this.interactTargetAction = () => this.packAPunchWeapon();
            }
          } else if (obj.type === 'mystery_box') {
            if (this.isBoxSpinning) {
              this.currentPrompt = `ARMORY CHEST SPINNING...`;
            } else {
              this.currentPrompt = `PRESS 'E' TO OPEN ARMORY CHEST [950 PTS]`;
              this.interactTargetAction = () => this.spinMysteryBox();
            }
          } else if (obj.type in WALL_BUY_CONFIG) {
            const cfg = WALL_BUY_CONFIG[obj.type];
            const owned = this.playerWeapons.some((w) => w.stats.id === cfg.wepType);
            this.currentPrompt = owned
              ? `PRESS 'E' TO REFILL ${cfg.name} AMMO [${cfg.price.toLocaleString()} PTS]`
              : `PRESS 'E' TO BUY ${cfg.name} [${cfg.price.toLocaleString()} PTS]`;
            this.interactTargetAction = () => this.buyWallWeapon(cfg.wepType);
          } else if (obj.type === 'ammo_crate') {
            this.currentPrompt = `PRESS 'E' TO REFILL ALL WEAPON AMMO [750 PTS]`;
            this.interactTargetAction = () => this.buyAmmoCrate();
          } else if (obj.type === 'teleporter') {
            if (this.customTeleporters.length >= 2) {
              const now = Date.now();
              if (now - this.lastTeleportTime >= 2500) {
                this.currentPrompt = `PRESS 'E' TO TELEPORT ACROSS MAP`;
                this.interactTargetAction = () => this.triggerTeleporter(obj.position);
              } else {
                this.currentPrompt = `TELEPORTER RECHARGING...`;
              }
            } else {
              this.currentPrompt = `PLACE 2+ TELEPORTERS IN MAP MAKER TO LINK`;
            }
          }
        }
      });
      } else if (this.activeOfficialMapId === OFFICIAL_BLIGHTED_WOODS_ID && this.forestLavaState) {
      const fl = this.forestLavaState;
      const feetY = this.playerPos.y - 1.6;

      // Power Brews in Forest
      if (playerPos2D.distanceTo(new THREE.Vector2(fl.perkPositions.juggernog.x, fl.perkPositions.juggernog.z)) < 2.6 && !this.perks.juggernog) {
        this.currentPrompt = `PRESS 'E' FOR TITAN TONIC [2,500 PTS]`;
        this.interactTargetAction = () => this.buyPerk('juggernog', 2500);
      } else if (playerPos2D.distanceTo(new THREE.Vector2(fl.perkPositions.speedCola.x, fl.perkPositions.speedCola.z)) < 2.6 && !this.perks.speedCola) {
        this.currentPrompt = `PRESS 'E' FOR BLITZ BREW [3,000 PTS]`;
        this.interactTargetAction = () => this.buyPerk('speedCola', 3000);
      } else if (playerPos2D.distanceTo(new THREE.Vector2(fl.perkPositions.doubleTap.x, fl.perkPositions.doubleTap.z)) < 2.6 && !this.perks.doubleTap) {
        this.currentPrompt = `PRESS 'E' FOR FURY FIZZ [2,000 PTS]`;
        this.interactTargetAction = () => this.buyPerk('doubleTap', 2000);
      }

      // Armory Chest
      if (playerPos2D.distanceTo(new THREE.Vector2(fl.armoryChestPos.x, fl.armoryChestPos.z)) < 2.6) {
        if (this.isBoxSpinning) {
          this.currentPrompt = `ARMORY CHEST SPINNING...`;
        } else {
          this.currentPrompt = `PRESS 'E' TO OPEN ARMORY CHEST [950 PTS]`;
          this.interactTargetAction = () => this.spinMysteryBox();
        }
      }

      // Ammo Resupply Crate
      if (playerPos2D.distanceTo(new THREE.Vector2(fl.ammoCratePos.x, fl.ammoCratePos.z)) < 2.5) {
        this.currentPrompt = `PRESS 'E' TO REFILL ALL WEAPON AMMO [750 PTS]`;
        this.interactTargetAction = () => this.buyAmmoCrate();
      }

      // Stone Ruin Wall Buys
      fl.wallBuys.forEach((wb) => {
        if (playerPos2D.distanceTo(new THREE.Vector2(wb.position.x, wb.position.z)) < 2.6) {
          const owned = this.playerWeapons.some((w) => w.stats.id === wb.type);
          this.currentPrompt = owned
            ? `PRESS 'E' TO REFILL ${wb.name} AMMO [${wb.price.toLocaleString()} PTS]`
            : `PRESS 'E' TO BUY ${wb.name} [${wb.price.toLocaleString()} PTS]`;
          this.interactTargetAction = () => this.buyWallWeapon(wb.type);
        }
      });

      // Hidden Forest Teleporter -> Magma Cavern
      if (
        playerPos2D.distanceTo(new THREE.Vector2(fl.forestTeleporterPos.x, fl.forestTeleporterPos.z)) < 2.6 &&
        Math.abs(feetY - fl.forestTeleporterPos.y) < 1.6
      ) {
        if (Date.now() - this.lastTeleportTime >= 2000) {
          this.currentPrompt = `PRESS 'E' TO ENTER THE MAGMA CAVERN`;
          this.interactTargetAction = () => this.teleportForestLava('to_lava');
        } else {
          this.currentPrompt = `TELEPORTER RECHARGING...`;
        }
      }

      // Return Teleporters (Lava Arrival Ledge or Hyper-Forge Altar) -> Blighted Woods
      const nearArrivalTp =
        playerPos2D.distanceTo(new THREE.Vector2(fl.lavaArrivalTeleporterPos.x, fl.lavaArrivalTeleporterPos.z)) < 2.4 &&
        Math.abs(feetY - fl.lavaArrivalTeleporterPos.y) < 1.6;
      const nearAltarTp =
        playerPos2D.distanceTo(new THREE.Vector2(fl.lavaAltarTeleporterPos.x, fl.lavaAltarTeleporterPos.z)) < 2.4 &&
        Math.abs(feetY - fl.lavaAltarTeleporterPos.y) < 1.6;

      if (nearArrivalTp || nearAltarTp) {
        if (Date.now() - this.lastTeleportTime >= 2000) {
          this.currentPrompt = `PRESS 'E' TO RETURN TO BLIGHTED WOODS`;
          this.interactTargetAction = () => this.teleportForestLava('to_forest');
        } else {
          this.currentPrompt = `TELEPORTER RECHARGING...`;
        }
      }

      // Hyper-Forge Station on the Lava Altar Platform
      const curWep = this.playerWeapons[this.currentWeaponIndex];
      if (
        curWep &&
        !curWep.stats.isPap &&
        playerPos2D.distanceTo(new THREE.Vector2(fl.hyperForgePos.x, fl.hyperForgePos.z)) < 2.9 &&
        Math.abs(feetY - fl.hyperForgePos.y) < 1.8
      ) {
        this.currentPrompt = `PRESS 'E' TO HYPER-FORGE ${curWep.stats.name} [5,000 PTS]`;
        this.interactTargetAction = () => this.packAPunchWeapon();
      }
    } else {
      // 2. Check Power Brew Machines
      if (playerPos2D.distanceTo(new THREE.Vector2(6, 11.1)) < 2.5 && !this.perks.juggernog) {
        this.currentPrompt = `PRESS 'E' FOR TITAN TONIC [2,500 PTS]`;
        this.interactTargetAction = () => this.buyPerk('juggernog', 2500);
      } else if (playerPos2D.distanceTo(new THREE.Vector2(6, -11.1)) < 2.5 && !this.perks.speedCola) {
        this.currentPrompt = `PRESS 'E' FOR BLITZ BREW [3,000 PTS]`;
        this.interactTargetAction = () => this.buyPerk('speedCola', 3000);
      } else if (playerPos2D.distanceTo(new THREE.Vector2(-6, -11.1)) < 2.5 && !this.perks.doubleTap) {
        this.currentPrompt = `PRESS 'E' FOR FURY FIZZ [2,000 PTS]`;
        this.interactTargetAction = () => this.buyPerk('doubleTap', 2000);
      }

      // 3. Check Hyper-Forge (South-West wall: -6, 11.1)
      const curWep = this.playerWeapons[this.currentWeaponIndex];
      if (playerPos2D.distanceTo(new THREE.Vector2(-6, 11.1)) < 2.5 && !curWep.stats.isPap) {
        this.currentPrompt = `PRESS 'E' TO HYPER-FORGE ${curWep.stats.name} [5,000 PTS]`;
        this.interactTargetAction = () => this.packAPunchWeapon();
      }

      // 4. Check Armory Chest (East wall: 11.1, -5)
      if (playerPos2D.distanceTo(new THREE.Vector2(11.1, -5)) < 2.5) {
        if (this.isBoxSpinning) {
          this.currentPrompt = `ARMORY CHEST SPINNING...`;
        } else {
          this.currentPrompt = `PRESS 'E' TO OPEN ARMORY CHEST [950 PTS]`;
          this.interactTargetAction = () => this.spinMysteryBox();
        }
      }

      // 5. Check Wall Buys
      if (playerPos2D.distanceTo(new THREE.Vector2(-11.4, -5)) < 2.5) {
        this.currentPrompt = `PRESS 'E' TO BUY MP40 [1,000 PTS]`;
        this.interactTargetAction = () => this.buyWallWeapon('smg');
      } else if (playerPos2D.distanceTo(new THREE.Vector2(11.4, 5)) < 2.5) {
        this.currentPrompt = `PRESS 'E' TO BUY VX-44 [1,500 PTS]`;
        this.interactTargetAction = () => this.buyWallWeapon('ar');
      } else if (playerPos2D.distanceTo(new THREE.Vector2(-11.4, 5)) < 2.5) {
        this.currentPrompt = `PRESS 'E' TO BUY SG-26 SHOTGUN [1,200 PTS]`;
        this.interactTargetAction = () => this.buyWallWeapon('shotgun');
      }
    }

    this.onStateUpdate?.();
  }

  // Trigger Interaction Key Press
  private triggerInteraction() {
    if (this.interactTargetAction) {
      this.interactTargetAction();
    }
  }

  // Repair Wooden Barrier Plank
  private repairPlank(barrier: WindowBarrier) {
    if (barrier.planks >= barrier.maxPlanks) return;

    if (this.isMultiplayer) {
      multiplayerClient.send({ type: 'player:repairBarrier', barrierId: barrier.id });
      return;
    }

    barrier.planks++;
    this.stats.boardsRepaired++;
    this.addScore(10, 'BOARD REPAIRED');
    soundEngine.playPlankWood(true);

    // Update Mesh visibility
    const meshGroup = this.barrierMeshes[barrier.id];
    meshGroup.planks[barrier.planks - 1].visible = true;
  }

  // Buy Perk
  private buyPerk(perk: 'juggernog' | 'speedCola' | 'doubleTap', price: number) {
    if (this.stats.score < price) return;

    this.stats.score -= price;
    this.perks[perk] = true;

    if (perk === 'juggernog') {
      this.maxHp = 250;
      this.playerHp = 250;
    }

    soundEngine.playPerkJingle(perk);
    this.onStateUpdate?.();
  }

  // Pack-a-Punch Weapon
  private packAPunchWeapon() {
    if (this.stats.score < 5000) return;
    const curWep = this.playerWeapons[this.currentWeaponIndex];
    if (curWep.stats.isPap) return;

    this.stats.score -= 5000;
    curWep.stats.isPap = true;
    curWep.stats.name = curWep.stats.papName;
    curWep.stats.damage *= 2;
    curWep.stats.clipSize *= 2;
    curWep.stats.maxReserve *= 2;
    curWep.currentClip = curWep.stats.clipSize;
    curWep.currentReserve = curWep.stats.maxReserve;

    this.updateGunMesh();
    this.updateCrazyGamesContext();
    soundEngine.playPackAPunch();
    this.onStateUpdate?.();
  }

  // Spin Armory Chest (Mystery Box) — pulls from all 29 non-starter guns in arsenal
  private spinMysteryBox() {
    if (this.stats.score < 950 || this.isBoxSpinning) return;

    this.stats.score -= 950;
    this.isBoxSpinning = true;
    this.boxSpinTimer = 3.0; // 3 seconds cycle
    soundEngine.playPackAPunch();

    if (this.boxSpinTimeout) {
      clearTimeout(this.boxSpinTimeout);
    }

    this.boxSpinTimeout = setTimeout(() => {
      this.boxSpinTimeout = null;
      this.isBoxSpinning = false;
      if (!this.isMapLoaded || this.stats.isGameOver) return;

      const heldIds = new Set(this.playerWeapons.map((w) => w.stats.id));
      const freshPool = ARMORY_CHEST_POOL.filter((id) => !heldIds.has(id));
      const pool = freshPool.length > 0 ? freshPool : ARMORY_CHEST_POOL;
      const newWepId = pool[Math.floor(Math.random() * pool.length)];
      this.grantWeapon(newWepId);

      const granted = this.baseWeapons[newWepId];
      if (granted) {
        this.scoreNotifications.unshift({
          id: Math.random().toString(),
          text: `ARMORY CHEST: ${granted.name.toUpperCase()}!`,
          points: 0,
          type: 'repair',
        });
        if (this.scoreNotifications.length > 5) this.scoreNotifications.pop();
        this.onStateUpdate?.();
      }
    }, 3000);

    this.onStateUpdate?.();
  }

  private buyAmmoCrate() {
    const price = 750;
    if (this.stats.score < price) return;
    this.stats.score -= price;
    this.playerWeapons.forEach((w) => {
      w.currentClip = w.stats.clipSize;
      w.currentReserve = w.stats.maxReserve;
      w.isReloading = false;
    });
    this.grenadeCount = this.maxGrenades;
    soundEngine.playReload();
    this.onStateUpdate?.();
  }

  private triggerTeleporter(fromPos: { x: number; y: number; z: number }) {
    if (this.customTeleporters.length < 2) return;
    const now = Date.now();
    if (now - this.lastTeleportTime < 2500) return;

    let currentIdx = 0;
    let minD = Infinity;
    this.customTeleporters.forEach((tp, idx) => {
      const d = Math.hypot(tp.x - fromPos.x, tp.z - fromPos.z);
      if (d < minD) {
        minD = d;
        currentIdx = idx;
      }
    });

    const nextTp = this.customTeleporters[(currentIdx + 1) % this.customTeleporters.length];
    this.lastTeleportTime = now;
    this.playerPos.set(nextTp.x, nextTp.y + 1.6, nextTp.z);
    this.playerVel.set(0, 0, 0);
    this.camera.position.copy(this.playerPos);
    soundEngine.playTeleport();
    this.onStateUpdate?.();
  }

  private teleportForestLava(dest: 'to_lava' | 'to_forest') {
    if (!this.forestLavaState) return;
    this.lastTeleportTime = Date.now();
    this.playerVel.set(0, 0, 0);
    this.isGrounded = true;

    if (dest === 'to_lava') {
      this.playerPos.copy(this.forestLavaState.lavaArrivalSpawnPos);
      this.yaw = 0;
      this.pitch = -0.05;
      this.scene.background = new THREE.Color('#1f0704');
      this.scene.fog = new THREE.FogExp2('#1f0704', 0.017);
      this.scoreNotifications.unshift({
        id: Math.random().toString(),
        text: 'MAGMA CAVERN — PARKOUR TO HYPER-FORGE!',
        points: 0,
        type: 'repair',
      });
    } else {
      this.playerPos.copy(this.forestLavaState.forestReturnSpawnPos);
      this.yaw = -Math.PI * 0.75;
      this.pitch = 0;
      this.scene.background = new THREE.Color('#081018');
      this.scene.fog = new THREE.FogExp2('#081018', 0.022);
      this.scoreNotifications.unshift({
        id: Math.random().toString(),
        text: 'RETURNED TO BLIGHTED WOODS',
        points: 0,
        type: 'repair',
      });
    }

    if (this.scoreNotifications.length > 5) this.scoreNotifications.pop();
    this.camera.position.copy(this.playerPos);
    soundEngine.playTeleport();
    this.onStateUpdate?.();
  }

  // Buy Wall Weapon
  private buyWallWeapon(id: string) {
    const wep = this.baseWeapons[id];
    if (!wep || this.stats.score < wep.price) return;

    this.stats.score -= wep.price;
    this.grantWeapon(id);
  }

  // Add Weapon to Inventory
  private grantWeapon(id: string) {
    const base = this.baseWeapons[id];
    if (!base) return;

    const existingIdx = this.playerWeapons.findIndex((w) => w.stats.id === id);
    if (existingIdx !== -1) {
      // Refill ammo
      this.playerWeapons[existingIdx].currentReserve = this.playerWeapons[existingIdx].stats.maxReserve;
      this.currentWeaponIndex = existingIdx;
    } else {
      const newWep: PlayerWeapon = {
        stats: { ...base },
        currentClip: base.clipSize,
        currentReserve: base.maxReserve,
        isReloading: false,
        reloadProgress: 0,
      };

      if (this.playerWeapons.length < 2) {
        this.playerWeapons.push(newWep);
        this.currentWeaponIndex = this.playerWeapons.length - 1;
      } else {
        // Swap currently held weapon
        this.playerWeapons[this.currentWeaponIndex] = newWep;
      }
    }

    this.updateGunMesh();
    this.updateCrazyGamesContext();
    soundEngine.playReload();
    this.onStateUpdate?.();
  }

  // Main Per-Frame Game Tick
  private animate = () => {
    requestAnimationFrame(this.animate);

    if (!this.isMapLoaded) return; // Completely pause 3D scene rendering on Main Menu for 0% GPU load!

    const delta = Math.min(this.clock.getDelta(), 0.1);

    const worldActive = this.isMultiplayer
      ? !this.stats.isGameOver
      : !this.stats.isPaused && !this.stats.isGameOver;

    if (worldActive) {
      if (!this.stats.isPaused) {
        this.updatePlayerMovement(delta);
        this.updateWeapons(delta);
      }
      this.updateBullets(delta);
      this.updateGrenades(delta);
      this.updateBurnZones(delta);
      if (this.isMultiplayer) {
        this.updateMultiplayerZombies(delta);
        this.updateRemotePlayers(delta);
        this.mpTransformTimer += delta;
        if (this.mpTransformTimer >= 0.05) {
          this.mpTransformTimer = 0;
          this.sendMpTransformImmediate();
        }
      } else {
        this.updateZombies(delta);
      }
      this.updateParticles(delta);
      this.updateWaveManager(delta);
      if (!this.stats.isPaused) {
        this.updateInteractivePrompts();
      }

      // Periodic 15-second auto-save while alive in a solo match
      if (!this.isMultiplayer) {
        this.autoSaveTimer += delta;
        if (this.autoSaveTimer >= 15) {
          this.autoSaveTimer = 0;
          this.saveCurrentMatch();
        }
      }

      if (this.flashScreenAlpha > 0) {
        this.flashScreenAlpha = Math.max(0, this.flashScreenAlpha - delta * 1.45);
        this.onStateUpdate?.();
      }

      // Subtle flickering animation for sconce lantern lights
      const time = this.clock.getElapsedTime();
      this.sconceLights.forEach((light, i) => {
        const flicker = (Math.sin(time * 12 + i * 1.5) * 0.15 + Math.cos(time * 23 + i * 2.1) * 0.1);
        light.intensity = 2.8 + flicker;
      });

      // Animate Blighted Woods campfire, teleporter rings & molten lava cavern
      if (this.forestLavaState) {
        const fl = this.forestLavaState;
        fl.campfireLight.intensity = 3.2 + Math.sin(time * 13) * 0.45 + Math.cos(time * 21) * 0.25;
        fl.teleporterRings.forEach((r) => {
          r.rotation.z += delta * 1.8;
        });
        fl.lavaMaterial.emissiveIntensity = 1.38 + Math.sin(time * 2.4) * 0.22;
        fl.lavaTexture.offset.x = (fl.lavaTexture.offset.x + delta * 0.012) % 1;
        fl.lavaTexture.offset.y = (fl.lavaTexture.offset.y + delta * 0.008) % 1;
      }
    }

    this.renderer.render(this.scene, this.camera);
  };

  private updateRemotePlayers(delta: number) {
    for (const rig of this.remotePlayerRigs.values()) {
      rig.root.position.x = THREE.MathUtils.damp(rig.root.position.x, rig.targetPos.x, 14, delta);
      rig.root.position.y = THREE.MathUtils.damp(rig.root.position.y, rig.targetPos.y, 14, delta);
      rig.root.position.z = THREE.MathUtils.damp(rig.root.position.z, rig.targetPos.z, 14, delta);

      const dYaw = Math.atan2(Math.sin(rig.targetYaw - rig.root.rotation.y), Math.cos(rig.targetYaw - rig.root.rotation.y));
      rig.root.rotation.y += dYaw * Math.min(1, delta * 14);
      rig.headGroup.rotation.x = THREE.MathUtils.damp(rig.headGroup.rotation.x, rig.targetPitch, 14, delta);
      rig.muzzleFlash.intensity = THREE.MathUtils.damp(rig.muzzleFlash.intensity, 0, 22, delta);

      if (rig.isDowned) {
        rig.bodyGroup.position.y = THREE.MathUtils.damp(rig.bodyGroup.position.y, -0.75, 10, delta);
        rig.bodyGroup.rotation.x = THREE.MathUtils.damp(rig.bodyGroup.rotation.x, -0.35, 10, delta);
        rig.legL.rotation.x = 0.6;
        rig.legR.rotation.x = -0.3;
      } else {
        rig.bodyGroup.position.y = THREE.MathUtils.damp(rig.bodyGroup.position.y, 0, 10, delta);
        rig.bodyGroup.rotation.x = THREE.MathUtils.damp(rig.bodyGroup.rotation.x, 0, 10, delta);
        if (rig.isMoving) {
          rig.walkCycle += delta * 11;
          rig.legL.rotation.x = Math.sin(rig.walkCycle) * 0.5;
          rig.legR.rotation.x = -Math.sin(rig.walkCycle) * 0.5;
        } else {
          rig.legL.rotation.x = THREE.MathUtils.damp(rig.legL.rotation.x, 0, 10, delta);
          rig.legR.rotation.x = THREE.MathUtils.damp(rig.legR.rotation.x, 0, 10, delta);
        }
      }
    }
  }

  private updateMultiplayerZombies(delta: number) {
    for (const z of this.zombies) {
      const target = this.zombieTargets.get(z.id);
      if (target) {
        z.meshGroup.position.x = THREE.MathUtils.damp(z.meshGroup.position.x, target.x, 12, delta);
        z.meshGroup.position.y = THREE.MathUtils.damp(z.meshGroup.position.y, target.y, 12, delta);
        z.meshGroup.position.z = THREE.MathUtils.damp(z.meshGroup.position.z, target.z, 12, delta);
        const dYaw = Math.atan2(Math.sin(target.yaw - z.meshGroup.rotation.y), Math.cos(target.yaw - z.meshGroup.rotation.y));
        z.meshGroup.rotation.y += dYaw * Math.min(1, delta * 12);
      }

      const armL = z.meshGroup.getObjectByName('zombieArmL');
      const armR = z.meshGroup.getObjectByName('zombieArmR');
      const legL = z.meshGroup.getObjectByName('zombieLegL');
      const legR = z.meshGroup.getObjectByName('zombieLegR');

      if (z.burnTimer && z.burnTimer > 0 && Math.random() < delta * 5) {
        const zPos = z.meshGroup.position;
        const flameMesh = new THREE.Mesh(
          new THREE.BoxGeometry(0.08, 0.08, 0.08),
          new THREE.MeshBasicMaterial({ color: Math.random() > 0.5 ? '#ff5500' : '#ffbb00' })
        );
        flameMesh.position.set(zPos.x + (Math.random() - 0.5) * 0.4, 0.9 + Math.random() * 0.6, zPos.z + (Math.random() - 0.5) * 0.4);
        this.scene.add(flameMesh);
        this.particles.push({
          mesh: flameMesh,
          velocity: new THREE.Vector3((Math.random() - 0.5) * 1.5, 2.2 + Math.random() * 1.5, (Math.random() - 0.5) * 1.5),
          life: 0.28,
          maxLife: 0.28,
          color: '#ff6600',
        });
      }

      if (z.stunTimer && z.stunTimer > 0) {
        const wobble = Math.sin(Date.now() * 0.018 + z.walkCycle) * 0.14;
        if (legL && legR) {
          legL.rotation.x = 0;
          legR.rotation.x = 0;
        }
        if (armL && armR) {
          armL.rotation.x = -Math.PI * 0.78 + wobble;
          armR.rotation.x = -Math.PI * 0.78 - wobble;
        }
        z.meshGroup.rotation.z = wobble * 0.4;
      } else {
        if (z.meshGroup.rotation.z !== 0) z.meshGroup.rotation.z = 0;
        const speedMult = z.slowTimer && z.slowTimer > 0 ? 0.25 : 1.0;
        if (z.state === 'breaking_planks' || z.state === 'attacking') {
          z.attackTimer += delta * speedMult;
          if (legL && legR) {
            legL.rotation.x = 0;
            legR.rotation.x = 0;
          }
          if (armL && armR) {
            armL.rotation.x = -Math.PI / 2 + Math.sin(z.attackTimer * 12) * 0.4;
            armR.rotation.x = -Math.PI / 2 - Math.sin(z.attackTimer * 12) * 0.4;
          }
        } else {
          z.walkCycle += delta * z.speed * speedMult * 5;
          if (legL && legR) {
            legL.rotation.x = Math.sin(z.walkCycle) * 0.45;
            legR.rotation.x = -Math.sin(z.walkCycle) * 0.45;
          }
          if (armL && armR) {
            armL.rotation.x = -Math.PI / 3 + Math.sin(z.walkCycle) * 0.3;
            armR.rotation.x = -Math.PI / 3 - Math.sin(z.walkCycle) * 0.3;
          }
        }
      }
    }
  }

  private updatePlayerMovement(delta: number) {
    // Camera rotation from mouse yaw & pitch
    const euler = new THREE.Euler(0, 0, 0, 'YXZ');
    euler.x = this.pitch;
    euler.y = this.yaw;
    this.camera.quaternion.setFromEuler(euler);

    // WASD + Virtual Thumbstick Movement
    const moveDir = new THREE.Vector3();
    if (this.keys['KeyW']) moveDir.z -= 1;
    if (this.keys['KeyS']) moveDir.z += 1;
    if (this.keys['KeyA']) moveDir.x -= 1;
    if (this.keys['KeyD']) moveDir.x += 1;
    moveDir.x += this.touchMoveVec.x;
    moveDir.z -= this.touchMoveVec.y;

    if (moveDir.length() > 1) {
      moveDir.normalize();
    }

    // Speed calculation
    const isSprint = !this.isDowned && (this.keys['ShiftLeft'] || this.keys['ShiftRight'] || this.touchSprint);
    const speed = this.isDowned ? 1.8 : isSprint ? 7.5 : 4.5;
    this.mpLocalMoving = moveDir.length() > 0.05;

    // Transform move vector relative to camera yaw
    const forward = new THREE.Vector3(0, 0, -1).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.yaw);
    const right = new THREE.Vector3(1, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.yaw);

    const velocity = new THREE.Vector3()
      .addScaledVector(forward, -moveDir.z * speed)
      .addScaledVector(right, moveDir.x * speed);

    // Apply movement
    this.playerPos.x += velocity.x * delta;
    this.playerPos.z += velocity.z * delta;

    // Resolve Player-to-Zombie Solid Collision (Player CANNOT walk through zombies!)
    const playerRadius = 0.35;
    const zombieRadius = 0.35;
    const combinedRadius = playerRadius + zombieRadius;

    this.zombies.forEach((z) => {
      const zPos = z.meshGroup.position;
      const dx = this.playerPos.x - zPos.x;
      const dz = this.playerPos.z - zPos.z;
      const distSq = dx * dx + dz * dz;

      if (distSq < combinedRadius * combinedRadius && distSq > 0.0001) {
        const dist = Math.sqrt(distSq);
        const overlap = combinedRadius - dist;
        this.playerPos.x += (dx / dist) * overlap;
        this.playerPos.z += (dz / dist) * overlap;
      }
    });

    // Resolve Map Objects Solid Collision (Walls, Platforms, Pack-a-Punch, Perk Machines, Mystery Box)
    this.resolveMapCollisions(this.playerPos, 0.35, this.playerPos.y - 1.6, 1.75);

    // Room Wall Bounds Collision (-11.2 to +11.2) for Sector Zero OR natural forest woods perimeter
    if (!this.usesSolidBoxes) {
      const maxB = 11.2;
      this.playerPos.x = Math.max(-maxB, Math.min(maxB, this.playerPos.x));
      this.playerPos.z = Math.max(-maxB, Math.min(maxB, this.playerPos.z));
    } else if (this.activeOfficialMapId === OFFICIAL_BLIGHTED_WOODS_ID) {
      if (this.playerPos.z > -120) {
        // Forest perimeter dense pine treeline clamp (radius 25.4m)
        const r = Math.hypot(this.playerPos.x, this.playerPos.z);
        if (r > 25.4) {
          const scale = 25.4 / r;
          this.playerPos.x *= scale;
          this.playerPos.z *= scale;
        }
      } else {
        // Magma Cavern horizontal safety boundary
        this.playerPos.x = Math.max(-24, Math.min(24, this.playerPos.x));
        this.playerPos.z = Math.max(-232, Math.min(-166, this.playerPos.z));
      }
    }

    // Animate First-Person Player Body Leg Swinging when walking
    if (moveDir.length() > 0) {
      this.legWalkTime += delta * (isSprint ? 14 : 9);
      this.playerLegL.rotation.x = Math.sin(this.legWalkTime) * 0.45;
      this.playerLegR.rotation.x = -Math.sin(this.legWalkTime) * 0.45;
    } else {
      this.playerLegL.rotation.x = THREE.MathUtils.damp(this.playerLegL.rotation.x, 0, 10, delta);
      this.playerLegR.rotation.x = THREE.MathUtils.damp(this.playerLegR.rotation.x, 0, 10, delta);
    }

    const eyeOffset = this.isDowned ? 0.78 : 1.6;
    // Compute supporting floor height (handles elevated floors, parkour stepping stones, and lava abyss)
    let groundY =
      this.activeOfficialMapId === OFFICIAL_BLIGHTED_WOODS_ID && this.playerPos.z < -120 ? -1.5 : 0;
    if (this.usesSolidBoxes) {
      const feetY = this.playerPos.y - eyeOffset;
      for (const b of this.customSolidBoxes) {
        if (
          this.playerPos.x >= b.minX - 0.2 &&
          this.playerPos.x <= b.maxX + 0.2 &&
          this.playerPos.z >= b.minZ - 0.2 &&
          this.playerPos.z <= b.maxZ + 0.2 &&
          b.maxY <= feetY + 0.55 &&
          b.maxY > groundY
        ) {
          groundY = b.maxY;
        }
      }
      if (this.isGrounded && this.playerPos.y < groundY + eyeOffset) {
        this.playerPos.y = groundY + eyeOffset;
      } else if (this.isGrounded && this.playerPos.y > groundY + eyeOffset + 0.05) {
        this.isGrounded = false;
      }
    }
    const minEyeY = groundY + eyeOffset;

    // Jump Physics
    if (!this.isDowned && this.keys['Space'] && this.isGrounded) {
      this.playerVel.y = 5.5;
      this.isGrounded = false;
    }

    // Gravity
    if (!this.isGrounded) {
      this.playerVel.y -= 18 * delta;
      this.playerPos.y += this.playerVel.y * delta;

      if (this.playerPos.y <= minEyeY) {
        this.playerPos.y = minEyeY;
        this.playerVel.y = 0;
        this.isGrounded = true;
      }
    }

    // Molten Lava Hazard Reset inside Magma Cavern
    if (
      this.forestLavaState &&
      this.activeOfficialMapId === OFFICIAL_BLIGHTED_WOODS_ID &&
      this.playerPos.z < -120 &&
      this.playerPos.y - eyeOffset <= -0.75
    ) {
      this.playerHp -= 40;
      this.lastDamageTime = Date.now();
      soundEngine.playPlayerHit();
      if (this.playerHp <= 0) {
        this.enterDownedOrDie();
      } else {
        this.playerPos.copy(this.forestLavaState.lavaArrivalSpawnPos);
        this.playerVel.set(0, 0, 0);
        this.isGrounded = true;
        this.scoreNotifications.unshift({
          id: Math.random().toString(),
          text: 'LAVA BURN! -40 HP',
          points: 0,
          type: 'kill',
        });
        if (this.scoreNotifications.length > 5) this.scoreNotifications.pop();
      }
      this.onStateUpdate?.();
    }

    this.camera.position.copy(this.playerPos);

    // Update Tactical Flashlight target position forward along final camera direction
    if (this.playerFlashlight) {
      const camDir = new THREE.Vector3();
      this.camera.getWorldDirection(camDir);
      this.playerFlashlight.target.position.copy(this.playerPos).addScaledVector(camDir, 14);
      this.playerFlashlight.target.updateMatrixWorld();
    }

    // Sync 3D Player Body Viewmodel position & yaw heading directly on floor under camera
    // When looking down (pitch < 0), offset body slightly back along look direction so chest vest never clips camera
    const pitchOffset = Math.max(0, -this.pitch * 0.22);
    const bodyX = this.playerPos.x + Math.sin(this.yaw) * pitchOffset;
    const bodyZ = this.playerPos.z + Math.cos(this.yaw) * pitchOffset;

    this.playerBodyRig.position.set(bodyX, this.playerPos.y - eyeOffset, bodyZ);
    this.playerBodyRig.rotation.set(0, this.yaw, 0);

    // Smooth FOV Damping for Aim Down Sights (settings.fov hipfire -> 55 FOV ADS scope zoom)
    const targetFov = this.isAiming ? 55 : this.settings.fov;
    this.camera.fov = THREE.MathUtils.damp(this.camera.fov, targetFov, 14, delta);
    this.camera.updateProjectionMatrix();

    // Base Gun Viewmodel offsets (Center sights alignment in ADS)
    const baseX = this.isAiming ? 0.0 : 0.28;
    const baseY = this.isAiming ? -0.15 : -0.24;

    // Movement Sway (reduced by 80% when aiming down sights for steady aiming)
    const swayScale = this.isAiming ? 0.2 : 1.0;
    if (moveDir.length() > 0) {
      const time = this.clock.getElapsedTime() * (isSprint ? 12 : 8);
      const targetX = baseX + Math.sin(time) * 0.015 * swayScale;
      const targetY = baseY + Math.cos(time * 2) * 0.01 * swayScale;
      this.gunGroup.position.x = THREE.MathUtils.damp(this.gunGroup.position.x, targetX, 16, delta);
      this.gunGroup.position.y = THREE.MathUtils.damp(this.gunGroup.position.y, targetY, 16, delta);
    } else {
      this.gunGroup.position.x = THREE.MathUtils.damp(this.gunGroup.position.x, baseX, 16, delta);
      this.gunGroup.position.y = THREE.MathUtils.damp(this.gunGroup.position.y, baseY, 16, delta);
    }

    // Bleedout Timer while Downed OR Health Auto-Regeneration (After 4s without damage)
    if (this.isDowned) {
      this.bleedoutTimer = Math.max(0, this.bleedoutTimer - delta);
    } else if (Date.now() - this.lastDamageTime > 4000 && this.playerHp < this.maxHp) {
      this.playerHp = Math.min(this.maxHp, this.playerHp + 40 * delta);
      this.onStateUpdate?.();
    }

    // Holding 'E' Repair or Teammate Revive Progress
    if (this.isHoldingInteract && this.mpReviveTargetId) {
      this.mpReviveHoldTimer += delta;
      if (this.mpReviveHoldTimer >= 1.4) {
        this.mpReviveHoldTimer = 0;
        this.triggerInteraction();
      }
    } else {
      this.mpReviveHoldTimer = 0;
    }

    if (this.isHoldingInteract && !this.mpReviveTargetId && this.currentPrompt.includes('REPAIR')) {
      this.repairTimer += delta;
      if (this.repairTimer >= 0.6) {
        this.repairTimer = 0;
        this.triggerInteraction();
      }
    }
  }

  private updateWeapons(delta: number) {
    if (this.shootCooldown > 0) {
      this.shootCooldown -= delta;
    }

    // Continuous trigger for automatic weapons when holding Fire
    const activeWep = this.playerWeapons[this.currentWeaponIndex];
    const canAutoFire = this.isPointerLocked || (this.isTouchMode && !this.stats.isPaused && !this.stats.isGameOver);
    if (this.isFiring && canAutoFire && activeWep?.stats.isAuto && !activeWep.isReloading && this.shootCooldown <= 0) {
      this.shoot();
    }

    // Smooth Recoil & ADS Z-Axis Position Damping
    const targetZ = this.isAiming ? -0.32 : -0.45;
    this.gunGroup.position.z = THREE.MathUtils.damp(this.gunGroup.position.z, targetZ, 14, delta);
    this.gunGroup.rotation.x = THREE.MathUtils.damp(this.gunGroup.rotation.x, 0, 14, delta);
    this.muzzleFlashLight.intensity = THREE.MathUtils.damp(this.muzzleFlashLight.intensity, 0, 25, delta);

    // Reload Progress
    const curWep = this.playerWeapons[this.currentWeaponIndex];
    if (curWep.isReloading) {
      const reloadSpeed = this.perks.speedCola ? curWep.stats.reloadTime * 0.5 : curWep.stats.reloadTime;
      curWep.reloadProgress += delta / reloadSpeed;

      if (curWep.reloadProgress >= 1.0) {
        curWep.isReloading = false;
        curWep.reloadProgress = 0;
        const needed = curWep.stats.clipSize - curWep.currentClip;
        const taken = Math.min(needed, curWep.currentReserve);
        curWep.currentClip += taken;
        curWep.currentReserve -= taken;
        this.onStateUpdate?.();
      }
    }
  }

  private updateZombies(delta: number) {
    const playerInLava =
      this.activeOfficialMapId === OFFICIAL_BLIGHTED_WOODS_ID &&
      this.forestLavaState !== null &&
      this.playerPos.z < -120;
    const playerPosVec = playerInLava && this.forestLavaState
      ? new THREE.Vector3(this.forestLavaState.forestTeleporterPos.x, 0, this.forestLavaState.forestTeleporterPos.z)
      : new THREE.Vector3(this.playerPos.x, 0, this.playerPos.z);

    // Zombie-to-Zombie soft collision separation force (prevents stacking/clipping inside each other)
    for (let i = 0; i < this.zombies.length; i++) {
      for (let j = i + 1; j < this.zombies.length; j++) {
        const p1 = this.zombies[i].meshGroup.position;
        const p2 = this.zombies[j].meshGroup.position;
        const dx = p1.x - p2.x;
        const dz = p1.z - p2.z;
        const distSq = dx * dx + dz * dz;
        const minDist = 0.85;
        if (distSq > 0.0001 && distSq < minDist * minDist) {
          const dist = Math.sqrt(distSq);
          const overlap = (minDist - dist) * 0.5;
          const pushX = (dx / dist) * overlap * 2.0 * delta;
          const pushZ = (dz / dist) * overlap * 2.0 * delta;
          p1.x += pushX;
          p1.z += pushZ;
          p2.x -= pushX;
          p2.z -= pushZ;
        }
      }
    }

    let burnKills = 0;
    for (let i = this.zombies.length - 1; i >= 0; i--) {
      const z = this.zombies[i];
      const zPos = z.meshGroup.position;

      // Active status timers
      if (z.slowTimer && z.slowTimer > 0) {
        z.slowTimer = Math.max(0, z.slowTimer - delta);
      }
      if (z.burnTimer && z.burnTimer > 0) {
        z.burnTimer = Math.max(0, z.burnTimer - delta);
        z.health -= 65 * delta;
        if (Math.random() < delta * 5) {
          const flameMesh = new THREE.Mesh(
            new THREE.BoxGeometry(0.08, 0.08, 0.08),
            new THREE.MeshBasicMaterial({ color: Math.random() > 0.5 ? '#ff5500' : '#ffbb00' })
          );
          flameMesh.position.set(zPos.x + (Math.random() - 0.5) * 0.4, 0.9 + Math.random() * 0.6, zPos.z + (Math.random() - 0.5) * 0.4);
          this.scene.add(flameMesh);
          this.particles.push({
            mesh: flameMesh,
            velocity: new THREE.Vector3((Math.random() - 0.5) * 1.5, 2.2 + Math.random() * 1.5, (Math.random() - 0.5) * 1.5),
            life: 0.28,
            maxLife: 0.28,
            color: '#ff6600',
          });
        }
        if (z.health <= 0) {
          this.scene.remove(z.meshGroup);
          this.zombies.splice(i, 1);
          this.stats.kills++;
          burnKills++;
          this.addScore(75, 'THERMITE KILL!');
          continue;
        }
      }

      const barrier = z.windowId !== null ? this.barriers[z.windowId] : null;
      const armL = z.meshGroup.getObjectByName('zombieArmL');
      const armR = z.meshGroup.getObjectByName('zombieArmR');
      const legL = z.meshGroup.getObjectByName('zombieLegL');
      const legR = z.meshGroup.getObjectByName('zombieLegR');

      // Flashbang Stunned State: freeze zombie & play dazed cover-eyes animation
      if (z.stunTimer && z.stunTimer > 0) {
        z.stunTimer = Math.max(0, z.stunTimer - delta);
        const wobble = Math.sin(Date.now() * 0.018 + z.walkCycle) * 0.14;
        if (legL && legR) {
          legL.rotation.x = 0;
          legR.rotation.x = 0;
        }
        if (armL && armR) {
          armL.rotation.x = -Math.PI * 0.78 + wobble;
          armR.rotation.x = -Math.PI * 0.78 - wobble;
        }
        z.meshGroup.rotation.z = wobble * 0.4;
        continue;
      } else if (z.meshGroup.rotation.z !== 0) {
        z.meshGroup.rotation.z = 0;
      }

      const speedMult = z.slowTimer && z.slowTimer > 0 ? 0.25 : 1.0;
      const effectiveSpeed = z.speed * speedMult;

      if (z.state === 'approaching_window' && barrier) {
        // Move towards window barrier but stop OUTSIDE the frame to prevent plank clipping
        const outsideOffset = barrier.direction.clone().multiplyScalar(-1.4);
        const targetPos = barrier.position.clone().add(outsideOffset);
        targetPos.y = 0;

        const dir = targetPos.clone().sub(zPos);
        if (dir.lengthSq() > 0.0001) dir.normalize();
        zPos.addScaledVector(dir, effectiveSpeed * delta);

        // Keep zombie facing barrier with front (-Z eyes/face) toward targetPos
        const angle = Math.atan2(targetPos.x - zPos.x, targetPos.z - zPos.z) + Math.PI;
        z.meshGroup.rotation.set(0, angle, 0);

        // Walking animation
        z.walkCycle += delta * effectiveSpeed * 5;
        if (legL && legR) {
          legL.rotation.x = Math.sin(z.walkCycle) * 0.4;
          legR.rotation.x = -Math.sin(z.walkCycle) * 0.4;
        }
        if (armL && armR) {
          armL.rotation.x = -Math.PI / 3 + Math.sin(z.walkCycle) * 0.3;
          armR.rotation.x = -Math.PI / 3 - Math.sin(z.walkCycle) * 0.3;
        }

        if (zPos.distanceTo(targetPos) < 0.4) {
          z.state = 'breaking_planks';
        }
      } else if (z.state === 'breaking_planks' && barrier) {
        // Freeze zombie position OUTSIDE the window frame facing intact planks
        const outsideOffset = barrier.direction.clone().multiplyScalar(-1.4);
        const targetPos = barrier.position.clone().add(outsideOffset);
        targetPos.y = 0;
        zPos.copy(targetPos);

        const angle = Math.atan2(barrier.position.x - zPos.x, barrier.position.z - zPos.z) + Math.PI;
        z.meshGroup.rotation.set(0, angle, 0);

        // Freeze legs upright, play steady wood tearing arm attack motion
        if (legL && legR) {
          legL.rotation.x = 0;
          legR.rotation.x = 0;
        }

        z.breakPlankTimer += delta * speedMult;
        if (armL && armR) {
          armL.rotation.x = -Math.PI / 2.5 + Math.sin(z.breakPlankTimer * 10) * 0.35;
          armR.rotation.x = -Math.PI / 2.5 - Math.sin(z.breakPlankTimer * 10) * 0.35;
        }

        if (z.breakPlankTimer >= 1.5) {
          z.breakPlankTimer = 0;

          if (barrier.planks > 0) {
            barrier.planks--;
            soundEngine.playPlankWood(false);

            // Update plank visibility
            const meshGroup = this.barrierMeshes[barrier.id];
            meshGroup.planks[barrier.planks].visible = false;
          } else {
            z.state = 'entering_room';
          }
        }
      } else if (z.state === 'entering_room' && barrier) {
        // Step into room past window sill once planks are destroyed
        const enterPos = barrier.position.clone().add(barrier.direction.clone().multiplyScalar(2.0));
        enterPos.y = 0;
        const dir = enterPos.clone().sub(zPos);
        if (dir.lengthSq() > 0.0001) dir.normalize();
        zPos.addScaledVector(dir, effectiveSpeed * delta);

        const angle = Math.atan2(enterPos.x - zPos.x, enterPos.z - zPos.z) + Math.PI;
        z.meshGroup.rotation.set(0, angle, 0);

        z.walkCycle += delta * effectiveSpeed * 5;
        if (legL && legR) {
          legL.rotation.x = Math.sin(z.walkCycle) * 0.4;
          legR.rotation.x = -Math.sin(z.walkCycle) * 0.4;
        }

        if (zPos.distanceTo(enterPos) < 0.8) {
          z.state = 'chasing_player';
          z.windowId = null; // Unlink from window so zombie stays in room permanently and never backtracks
        }
      } else if (z.state === 'chasing_player' || z.state === 'attacking') {
        // Pathfind to player position with separation steering from nearby zombies
        const targetDir = playerPosVec.clone().sub(zPos);
        if (targetDir.lengthSq() > 0.0001) targetDir.normalize();
        const distToPlayer = zPos.distanceTo(playerPosVec);

        // Calculate separation steering away from neighboring zombies
        let sepX = 0;
        let sepZ = 0;
        this.zombies.forEach((otherZ) => {
          if (otherZ.id !== z.id) {
            const odx = zPos.x - otherZ.meshGroup.position.x;
            const odz = zPos.z - otherZ.meshGroup.position.z;
            const odistSq = odx * odx + odz * odz;
            if (odistSq < 1.44 && odistSq > 0.0001) { // 1.2m radius
              const odist = Math.sqrt(odistSq);
              const force = (1.2 - odist) / 1.2;
              sepX += (odx / odist) * force;
              sepZ += (odz / odist) * force;
            }
          }
        });

        const dir = targetDir.clone();
        if (sepX !== 0 || sepZ !== 0) {
          dir.x = dir.x * 0.7 + sepX * 0.3;
          dir.z = dir.z * 0.7 + sepZ * 0.3;
          if (dir.lengthSq() > 0.0001) dir.normalize();
        }

        const angle = Math.atan2(playerPosVec.x - zPos.x, playerPosVec.z - zPos.z) + Math.PI;
        z.meshGroup.rotation.set(0, angle, 0);

        if (playerInLava && distToPlayer <= 3.2) {
          z.state = 'chasing_player';
          if (legL && legR) {
            legL.rotation.x = 0;
            legR.rotation.x = 0;
          }
          if (armL && armR) {
            armL.rotation.x = -Math.PI / 3;
            armR.rotation.x = -Math.PI / 3;
          }
        } else if (distToPlayer > 1.3) {
          zPos.addScaledVector(dir, effectiveSpeed * delta);
          this.resolveMapCollisions(zPos, 0.45, zPos.y, 1.8);
          z.state = 'chasing_player';

          z.walkCycle += delta * effectiveSpeed * 5;
          if (legL && legR) {
            legL.rotation.x = Math.sin(z.walkCycle) * 0.5;
            legR.rotation.x = -Math.sin(z.walkCycle) * 0.5;
          }
          if (armL && armR) {
            armL.rotation.x = -Math.PI / 3 + Math.sin(z.walkCycle) * 0.3;
            armR.rotation.x = -Math.PI / 3 - Math.sin(z.walkCycle) * 0.3;
          }
        } else if (!playerInLava) {
          z.state = 'attacking';
          z.attackTimer += delta * speedMult;

          // Attack claw animation
          if (armL && armR) {
            armL.rotation.x = -Math.PI / 2 + Math.sin(z.attackTimer * 12) * 0.4;
            armR.rotation.x = -Math.PI / 2 - Math.sin(z.attackTimer * 12) * 0.4;
          }

          if (z.attackTimer >= 1.0) {
            z.attackTimer = 0;

            // Deal Damage to Player
            this.playerHp -= z.damage;
            this.lastDamageTime = Date.now();

            soundEngine.playPlayerHit();

            if (this.playerHp <= 0) {
              this.playerHp = 0;
              this.handleGameOver();
            }

            this.onStateUpdate?.();
          }
        }
      }
    }

    if (burnKills > 0) {
      soundEngine.playHitmarker(true, false);
      this.onHitmarker?.(true, false);
      this.checkRoundCompletion();
    }
  }

  public throwGrenade() {
    if (!this.isMapLoaded || this.stats.isGameOver || this.stats.isPaused || this.isDowned) return;
    if (this.grenadeCount <= 0 || this.throwCooldown > 0) return;

    const gType = this.playerLoadout.grenadeType;
    const gDef = GRENADES_MAP[gType];
    this.grenadeCount--;
    this.throwCooldown = 0.45;

    const dir = new THREE.Vector3();
    this.camera.getWorldDirection(dir);
    const startPos = this.playerPos.clone().addScaledVector(dir, 0.55);
    startPos.y -= 0.14;

    const vel = dir.clone().multiplyScalar(17.5);
    vel.y += 3.8;

    const mesh = this.createGrenadeMesh(gType);
    mesh.position.copy(startPos);
    this.scene.add(mesh);

    this.thrownGrenades.push({
      type: gType,
      mesh,
      vel,
      fuse: gDef.fuseTime,
    });

    if (this.isMultiplayer) {
      multiplayerClient.send({
        type: 'combat:grenadeThrow',
        grenadeType: gType,
        pos: { x: startPos.x, y: startPos.y, z: startPos.z },
        vel: { x: vel.x, y: vel.y, z: vel.z },
        fuse: gDef.fuseTime,
      });
    }

    soundEngine.playGrenadeThrow();
    this.onStateUpdate?.();
  }

  private createGrenadeMesh(type: GrenadeType): THREE.Group {
    const g = new THREE.Group();
    const def = GRENADES_MAP[type];

    const bodyColor =
      type === 'frag'
        ? '#3f4d36'
        : type === 'flashbang'
        ? '#cbd5e1'
        : type === 'cryo'
        ? '#0e7490'
        : '#7c2d12';

    const bodyMat = new THREE.MeshStandardMaterial({
      color: bodyColor,
      roughness: 0.45,
      metalness: 0.6,
    });
    const bandMat = new THREE.MeshStandardMaterial({
      color: def.color,
      emissive: new THREE.Color(def.badgeColor),
      emissiveIntensity: 1.4,
      roughness: 0.25,
    });
    const capMat = new THREE.MeshStandardMaterial({
      color: '#1e293b',
      metalness: 0.85,
      roughness: 0.3,
    });

    const body =
      type === 'frag'
        ? new THREE.Mesh(new THREE.IcosahedronGeometry(0.12, 0), bodyMat)
        : new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.085, 0.24, 10), bodyMat);
    g.add(body);

    const band = new THREE.Mesh(
      new THREE.CylinderGeometry(0.095, 0.095, 0.04, 10),
      bandMat
    );
    g.add(band);

    const cap = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.08), capMat);
    cap.position.y = 0.13;
    g.add(cap);

    return g;
  }

  private updateGrenades(delta: number) {
    if (this.throwCooldown > 0) {
      this.throwCooldown = Math.max(0, this.throwCooldown - delta);
    }

    for (let i = this.thrownGrenades.length - 1; i >= 0; i--) {
      const g = this.thrownGrenades[i];
      g.fuse -= delta;
      g.vel.y -= 20 * delta;

      g.mesh.rotation.x += delta * 6.5;
      g.mesh.rotation.z += delta * 4.5;

      const prevPos = g.mesh.position.clone();
      const nextPos = prevPos.clone().addScaledVector(g.vel, delta);

      let groundY =
        this.usesSolidBoxes && this.activeOfficialMapId === OFFICIAL_BLIGHTED_WOODS_ID && nextPos.z < -120
          ? -1.35
          : 0;

      if (!this.usesSolidBoxes) {
        if (Math.abs(nextPos.x) >= 11.45) {
          nextPos.x = Math.sign(nextPos.x) * 11.45;
          g.vel.x *= -0.45;
        }
        if (Math.abs(nextPos.z) >= 11.45) {
          nextPos.z = Math.sign(nextPos.z) * 11.45;
          g.vel.z *= -0.45;
        }
      } else {
        for (const box of this.customSolidBoxes) {
          const inX = nextPos.x >= box.minX - 0.12 && nextPos.x <= box.maxX + 0.12;
          const inZ = nextPos.z >= box.minZ - 0.12 && nextPos.z <= box.maxZ + 0.12;
          if (inX && inZ && box.maxY <= prevPos.y + 0.18 && box.maxY > groundY) {
            groundY = box.maxY;
          }
          if (nextPos.y > box.minY + 0.05 && nextPos.y < box.maxY - 0.05 && inX && inZ) {
            const wasInX = prevPos.x >= box.minX - 0.12 && prevPos.x <= box.maxX + 0.12;
            const wasInZ = prevPos.z >= box.minZ - 0.12 && prevPos.z <= box.maxZ + 0.12;
            if (!wasInX) {
              nextPos.x = prevPos.x;
              g.vel.x *= -0.45;
            }
            if (!wasInZ) {
              nextPos.z = prevPos.z;
              g.vel.z *= -0.45;
            }
          }
        }

        if (this.activeOfficialMapId === OFFICIAL_BLIGHTED_WOODS_ID && nextPos.z > -120) {
          const r = Math.hypot(nextPos.x, nextPos.z);
          if (r > 25.2) {
            const scale = 25.2 / r;
            nextPos.x *= scale;
            nextPos.z *= scale;
            g.vel.x *= -0.45;
            g.vel.z *= -0.45;
          }
        }
      }

      if (nextPos.y <= groundY + 0.14) {
        nextPos.y = groundY + 0.14;
        if (Math.abs(g.vel.y) > 1.2) {
          g.vel.y = -g.vel.y * 0.42;
        } else {
          g.vel.y = 0;
        }
        g.vel.x *= 0.7;
        g.vel.z *= 0.7;
      }

      g.mesh.position.copy(nextPos);

      if (g.fuse <= 0) {
        const blastCenter = g.mesh.position.clone();
        this.scene.remove(g.mesh);
        this.thrownGrenades.splice(i, 1);
        if (!g.isVisualOnly) {
          this.detonateGrenade(g.type, blastCenter);
        }
      }
    }
  }

  private playGrenadeFxOnly(type: GrenadeType, center: THREE.Vector3, radius: number) {
    if (type === 'frag') {
      soundEngine.playExplosion();
      for (let i = 0; i < 32; i++) {
        const col = i % 3 === 0 ? '#ff3300' : i % 3 === 1 ? '#ffaa00' : '#334155';
        const pMesh = new THREE.Mesh(
          new THREE.BoxGeometry(0.16, 0.16, 0.16),
          new THREE.MeshBasicMaterial({ color: col })
        );
        pMesh.position.copy(center);
        this.scene.add(pMesh);
        this.particles.push({
          mesh: pMesh,
          velocity: new THREE.Vector3((Math.random() - 0.5) * 11, Math.random() * 8 + 2, (Math.random() - 0.5) * 11),
          life: 0.65,
          maxLife: 0.65,
          color: col,
        });
      }
    } else if (type === 'flashbang') {
      soundEngine.playFlashbang();
      for (let i = 0; i < 28; i++) {
        const col = i % 2 === 0 ? '#ffffff' : '#bae6fd';
        const pMesh = new THREE.Mesh(
          new THREE.BoxGeometry(0.14, 0.14, 0.14),
          new THREE.MeshBasicMaterial({ color: col })
        );
        pMesh.position.copy(center);
        this.scene.add(pMesh);
        this.particles.push({
          mesh: pMesh,
          velocity: new THREE.Vector3((Math.random() - 0.5) * 12, Math.random() * 6 + 1, (Math.random() - 0.5) * 12),
          life: 0.42,
          maxLife: 0.42,
          color: col,
        });
      }
    } else if (type === 'cryo') {
      soundEngine.playCryoExplosion();
      for (let i = 0; i < 30; i++) {
        const col = i % 2 === 0 ? '#67e8f9' : '#e0f2fe';
        const pMesh = new THREE.Mesh(
          new THREE.BoxGeometry(0.14, 0.14, 0.14),
          new THREE.MeshBasicMaterial({ color: col })
        );
        pMesh.position.copy(center);
        this.scene.add(pMesh);
        this.particles.push({
          mesh: pMesh,
          velocity: new THREE.Vector3((Math.random() - 0.5) * 9, Math.random() * 5 + 1, (Math.random() - 0.5) * 9),
          life: 0.6,
          maxLife: 0.6,
          color: col,
        });
      }
    } else if (type === 'thermite') {
      soundEngine.playExplosion();
      for (let i = 0; i < 26; i++) {
        const col = i % 2 === 0 ? '#f97316' : '#facc15';
        const pMesh = new THREE.Mesh(
          new THREE.BoxGeometry(0.14, 0.14, 0.14),
          new THREE.MeshBasicMaterial({ color: col })
        );
        pMesh.position.copy(center);
        this.scene.add(pMesh);
        this.particles.push({
          mesh: pMesh,
          velocity: new THREE.Vector3((Math.random() - 0.5) * 8, Math.random() * 6 + 2, (Math.random() - 0.5) * 8),
          life: 0.55,
          maxLife: 0.55,
          color: col,
        });
      }
      const discGeo = new THREE.CircleGeometry(radius, 24);
      const discMat = new THREE.MeshBasicMaterial({
        color: '#f97316',
        transparent: true,
        opacity: 0.55,
        side: THREE.DoubleSide,
      });
      const disc = new THREE.Mesh(discGeo, discMat);
      disc.rotation.x = -Math.PI / 2;
      disc.position.set(center.x, center.y - 0.08, center.z);
      this.scene.add(disc);
      this.burnZones.push({
        mesh: disc,
        position: center.clone(),
        radius,
        life: 5.0,
        tickTimer: 0,
      });
    }
  }

  private detonateGrenade(type: GrenadeType, center: THREE.Vector3) {
    const def = GRENADES_MAP[type];

    // Trigger nearby explosive barrels on Frag / Thermite
    if (type === 'frag' || type === 'thermite') {
      this.explosiveBarrels.forEach((eb) => {
        if (!eb.exploded && eb.position.distanceTo(center) <= def.radius * 0.9) {
          this.detonateExplosiveBarrel(eb);
        }
      });
    }

    if (this.isMultiplayer) {
      this.playGrenadeFxOnly(type, center, def.radius);
      multiplayerClient.send({
        type: 'combat:grenadeDetonate',
        grenadeType: type,
        center: { x: center.x, y: center.y, z: center.z },
        radius: def.radius,
        damage: def.damage,
      });
      if (type === 'flashbang') {
        const playerDist = this.playerPos.distanceTo(center);
        if (playerDist < 14) {
          const camDir = new THREE.Vector3();
          this.camera.getWorldDirection(camDir);
          const toFlash = center.clone().sub(this.playerPos).normalize();
          const facing = camDir.dot(toFlash);
          const falloff = Math.max(0.2, 1 - playerDist / 14);
          const intensity = facing > 0.15 ? 0.85 * falloff : 0.25 * falloff;
          this.flashScreenAlpha = Math.max(this.flashScreenAlpha, intensity);
          this.onStateUpdate?.();
        }
      }
      return;
    }

    if (type === 'frag') {
      soundEngine.playExplosion();
      for (let i = 0; i < 32; i++) {
        const col = i % 3 === 0 ? '#ff3300' : i % 3 === 1 ? '#ffaa00' : '#334155';
        const pMesh = new THREE.Mesh(
          new THREE.BoxGeometry(0.16, 0.16, 0.16),
          new THREE.MeshBasicMaterial({ color: col })
        );
        pMesh.position.copy(center);
        this.scene.add(pMesh);
        this.particles.push({
          mesh: pMesh,
          velocity: new THREE.Vector3(
            (Math.random() - 0.5) * 11,
            Math.random() * 8 + 2,
            (Math.random() - 0.5) * 11
          ),
          life: 0.65,
          maxLife: 0.65,
          color: col,
        });
      }

      let kills = 0;
      let hits = 0;
      for (let i = this.zombies.length - 1; i >= 0; i--) {
        const z = this.zombies[i];
        const zCenter = z.meshGroup.position.clone().add(new THREE.Vector3(0, 1.0, 0));
        const dist = zCenter.distanceTo(center);
        if (dist <= def.radius) {
          const falloff = Math.max(0.35, 1 - dist / (def.radius * 1.15));
          z.health -= def.damage * falloff;
          this.spawnBloodParticles(zCenter);
          hits++;
          if (z.health <= 0) {
            this.scene.remove(z.meshGroup);
            this.zombies.splice(i, 1);
            kills++;
            this.stats.kills++;
            this.addScore(90, 'FRAG GRENADE KILL!');
          }
        }
      }
      if (kills > 0 || hits > 0) {
        soundEngine.playHitmarker(kills > 0, false);
        this.onHitmarker?.(kills > 0, false);
        if (kills > 0) this.checkRoundCompletion();
      }
    } else if (type === 'flashbang') {
      soundEngine.playFlashbang();
      for (let i = 0; i < 28; i++) {
        const col = i % 2 === 0 ? '#ffffff' : '#bae6fd';
        const pMesh = new THREE.Mesh(
          new THREE.BoxGeometry(0.14, 0.14, 0.14),
          new THREE.MeshBasicMaterial({ color: col })
        );
        pMesh.position.copy(center);
        this.scene.add(pMesh);
        this.particles.push({
          mesh: pMesh,
          velocity: new THREE.Vector3(
            (Math.random() - 0.5) * 12,
            Math.random() * 6 + 1,
            (Math.random() - 0.5) * 12
          ),
          life: 0.42,
          maxLife: 0.42,
          color: col,
        });
      }

      let stunned = 0;
      let kills = 0;
      for (let i = this.zombies.length - 1; i >= 0; i--) {
        const z = this.zombies[i];
        const zCenter = z.meshGroup.position.clone().add(new THREE.Vector3(0, 1.0, 0));
        const dist = zCenter.distanceTo(center);
        if (dist <= def.radius) {
          z.stunTimer = Math.max(z.stunTimer || 0, 5.0);
          z.health -= def.damage;
          stunned++;
          if (z.health <= 0) {
            this.scene.remove(z.meshGroup);
            this.zombies.splice(i, 1);
            kills++;
            this.stats.kills++;
            this.addScore(60, 'FLASHBANG KILL!');
          }
        }
      }
      if (stunned > 0) {
        this.addScore(stunned * 15, `STUNNED ${stunned}x!`);
        soundEngine.playHitmarker(kills > 0, false);
        this.onHitmarker?.(kills > 0, false);
      }
      if (kills > 0) {
        this.checkRoundCompletion();
      }

      // Mild tactical glare on HUD if player is near the flash detonation
      const playerDist = this.playerPos.distanceTo(center);
      if (playerDist < 14) {
        const camDir = new THREE.Vector3();
        this.camera.getWorldDirection(camDir);
        const toFlash = center.clone().sub(this.playerPos).normalize();
        const facing = camDir.dot(toFlash);
        const falloff = Math.max(0.2, 1 - playerDist / 14);
        const intensity = facing > 0.15 ? 0.85 * falloff : 0.25 * falloff;
        this.flashScreenAlpha = Math.max(this.flashScreenAlpha, intensity);
        this.onStateUpdate?.();
      }
    } else if (type === 'cryo') {
      soundEngine.playCryoExplosion();
      for (let i = 0; i < 30; i++) {
        const col = i % 2 === 0 ? '#67e8f9' : '#e0f2fe';
        const pMesh = new THREE.Mesh(
          new THREE.BoxGeometry(0.14, 0.14, 0.14),
          new THREE.MeshBasicMaterial({ color: col })
        );
        pMesh.position.copy(center);
        this.scene.add(pMesh);
        this.particles.push({
          mesh: pMesh,
          velocity: new THREE.Vector3(
            (Math.random() - 0.5) * 9,
            Math.random() * 5 + 1,
            (Math.random() - 0.5) * 9
          ),
          life: 0.6,
          maxLife: 0.6,
          color: col,
        });
      }

      let kills = 0;
      let chilled = 0;
      for (let i = this.zombies.length - 1; i >= 0; i--) {
        const z = this.zombies[i];
        const zCenter = z.meshGroup.position.clone().add(new THREE.Vector3(0, 1.0, 0));
        const dist = zCenter.distanceTo(center);
        if (dist <= def.radius) {
          const falloff = Math.max(0.4, 1 - dist / (def.radius * 1.15));
          z.slowTimer = Math.max(z.slowTimer || 0, 6.0);
          z.health -= def.damage * falloff;
          chilled++;
          if (z.health <= 0) {
            this.scene.remove(z.meshGroup);
            this.zombies.splice(i, 1);
            kills++;
            this.stats.kills++;
            this.addScore(85, 'CRYO SHATTER KILL!');
          }
        }
      }
      if (chilled > 0) {
        if (kills === 0) this.addScore(chilled * 15, `CHILLED ${chilled}x!`);
        soundEngine.playHitmarker(kills > 0, false);
        this.onHitmarker?.(kills > 0, false);
        if (kills > 0) this.checkRoundCompletion();
      }
    } else if (type === 'thermite') {
      soundEngine.playExplosion();
      for (let i = 0; i < 26; i++) {
        const col = i % 2 === 0 ? '#f97316' : '#facc15';
        const pMesh = new THREE.Mesh(
          new THREE.BoxGeometry(0.14, 0.14, 0.14),
          new THREE.MeshBasicMaterial({ color: col })
        );
        pMesh.position.copy(center);
        this.scene.add(pMesh);
        this.particles.push({
          mesh: pMesh,
          velocity: new THREE.Vector3(
            (Math.random() - 0.5) * 8,
            Math.random() * 6 + 2,
            (Math.random() - 0.5) * 8
          ),
          life: 0.55,
          maxLife: 0.55,
          color: col,
        });
      }

      const discGeo = new THREE.CircleGeometry(def.radius, 24);
      const discMat = new THREE.MeshBasicMaterial({
        color: '#f97316',
        transparent: true,
        opacity: 0.55,
        side: THREE.DoubleSide,
      });
      const disc = new THREE.Mesh(discGeo, discMat);
      disc.rotation.x = -Math.PI / 2;
      disc.position.set(center.x, center.y - 0.08, center.z);
      this.scene.add(disc);
      this.burnZones.push({
        mesh: disc,
        position: center.clone(),
        radius: def.radius,
        life: 5.0,
        tickTimer: 0,
      });

      let kills = 0;
      for (let i = this.zombies.length - 1; i >= 0; i--) {
        const z = this.zombies[i];
        const dist = z.meshGroup.position.distanceTo(new THREE.Vector3(center.x, z.meshGroup.position.y, center.z));
        if (dist <= def.radius) {
          z.burnTimer = Math.max(z.burnTimer || 0, 3.5);
          z.health -= def.damage * 0.65;
          if (z.health <= 0) {
            this.scene.remove(z.meshGroup);
            this.zombies.splice(i, 1);
            kills++;
            this.stats.kills++;
            this.addScore(85, 'THERMITE BLAST KILL!');
          }
        }
      }
      if (kills > 0) {
        soundEngine.playHitmarker(true, false);
        this.onHitmarker?.(true, false);
        this.checkRoundCompletion();
      }
    }
  }

  private updateBurnZones(delta: number) {
    for (let i = this.burnZones.length - 1; i >= 0; i--) {
      const bz = this.burnZones[i];
      bz.life -= delta;
      bz.tickTimer += delta;

      const mat = bz.mesh.material as THREE.MeshBasicMaterial;
      mat.opacity = Math.min(0.55, Math.max(0.1, (bz.life / 5.0) * 0.6));

      if (bz.tickTimer >= 0.35) {
        bz.tickTimer = 0;
        this.zombies.forEach((z) => {
          const dist = Math.hypot(
            z.meshGroup.position.x - bz.position.x,
            z.meshGroup.position.z - bz.position.z
          );
          if (dist <= bz.radius) {
            z.burnTimer = Math.max(z.burnTimer || 0, 2.0);
          }
        });
      }

      if (bz.life <= 0) {
        this.scene.remove(bz.mesh);
        bz.mesh.geometry.dispose();
        mat.dispose();
        this.burnZones.splice(i, 1);
      }
    }
  }

  private updateParticles(delta: number) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= delta;

      if (p.life <= 0) {
        this.scene.remove(p.mesh);
        p.mesh.geometry.dispose();
        p.mesh.material.dispose();
        this.particles.splice(i, 1);
      } else {
        p.mesh.position.addScaledVector(new THREE.Vector3(p.velocity.x, p.velocity.y, p.velocity.z), delta);
        p.velocity.y -= 9.8 * delta; // gravity
      }
    }
  }

  private updateWaveManager(delta: number) {
    if (this.isMultiplayer) {
      if (this.stats.isRoundBreak && this.stats.roundBreakTimer > 0) {
        this.stats.roundBreakTimer = Math.max(0, this.stats.roundBreakTimer - delta);
      }
      return;
    }

    if (this.stats.isRoundBreak) {
      this.stats.roundBreakTimer -= delta;
      if (this.stats.roundBreakTimer <= 0) {
        this.stats.isRoundBreak = false;
        soundEngine.playRoundChange(true);
        this.onStateUpdate?.();
      }
      return;
    }

    // Spawn zombie timer (pause new forest spawns while player is inside the Magma Cavern)
    const inLavaCavern = this.activeOfficialMapId === OFFICIAL_BLIGHTED_WOODS_ID && this.playerPos.z < -120;
    this.spawnTimer += delta;
    if (!inLavaCavern && this.spawnTimer >= 2.5 && this.zombiesToSpawn > 0 && this.zombies.length < 16) {
      this.spawnTimer = 0;
      this.spawnZombie();
    }
  }

  // Reset / Restart Game
  public restartGame() {
    this.isFiring = false;
    this.isBoxSpinning = false;
    if (this.boxSpinTimeout) {
      clearTimeout(this.boxSpinTimeout);
      this.boxSpinTimeout = null;
    }

    // Remove all zombies
    this.zombies.forEach((z) => this.scene.remove(z.meshGroup));
    this.zombies = [];

    // Reset stats
    this.stats = {
      score: 500,
      totalScoreEarned: 500,
      round: 1,
      kills: 0,
      headshots: 0,
      boardsRepaired: 0,
      isGameOver: false,
      isPaused: false,
      isRoundBreak: false,
      roundBreakTimer: 0,
    };

    // Reset player
    this.playerHp = 100;
    this.maxHp = 100;
    if (this.activeMapConfig || this.activeOfficialMapId === OFFICIAL_BLIGHTED_WOODS_ID) {
      this.playerPos.copy(this.customSpawnPos);
      this.yaw = this.customSpawnYaw;
      this.pitch = 0;
      if (this.activeOfficialMapId === OFFICIAL_BLIGHTED_WOODS_ID) {
        this.scene.background = new THREE.Color('#081018');
        this.scene.fog = new THREE.FogExp2('#081018', 0.022);
      }
    } else {
      this.playerPos.set(0, 1.6, 0);
      this.yaw = 0;
      this.pitch = 0;
    }
    this.playerVel.set(0, 0, 0);
    this.isGrounded = true;
    this.camera.position.copy(this.playerPos);
    this.perks = { juggernog: false, speedCola: false, doubleTap: false };

    // Reset thrown grenades & burn zones
    this.clearGrenadesAndZones();

    // Reset Inventory to Loadout Starting Pistol & Grenades
    this.initPlayerStartingInventory();
    this.updateGunMesh();

    // Reset Barriers
    this.barriers.forEach((b) => {
      b.planks = 5;
      const meshGroup = this.barrierMeshes[b.id];
      meshGroup.planks.forEach((p) => (p.visible = true));
    });

    this.syncedRunKills = 0;
    this.syncedRunHeadshots = 0;
    this.syncedRunBoards = 0;
    this.autoSaveTimer = 0;
    this.lastHappyTimeRound = 1;
    this.records.gamesPlayed++;
    this.syncRecords(true);
    this.startRound(1);
    crazyGames.startGameplay();
    this.updateCrazyGamesContext();
    this.saveCurrentMatch();
    this.requestLock();
  }

  public dispose() {
    window.removeEventListener('resize', this.onWindowResize);
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
    this.renderer.dispose();
    this.container.innerHTML = '';
  }
}
