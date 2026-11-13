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
} from '../types/game';
import { soundEngine } from '../utils/soundEngine';
import {
  createFloorTexture,
  createWallTexture,
  createWoodPlankTexture,
  createPerkMachineTexture,
  createPackAPunchTexture,
  createMysteryBoxTexture,
  createWallBuyChalkTexture,
} from '../utils/proceduralTextures';

export function createWeapon3DModel(type: string, isPap: boolean = false): THREE.Group {
  const group = new THREE.Group();

  const primaryColor = isPap ? '#00f0ff' : '#2b3340';
  const steelMat = new THREE.MeshStandardMaterial({
    color: primaryColor,
    metalness: isPap ? 0.9 : 0.85,
    roughness: isPap ? 0.1 : 0.25,
    emissive: isPap ? new THREE.Color('#00f0ff') : new THREE.Color('#000000'),
    emissiveIntensity: isPap ? 0.4 : 0,
  });
  const darkMat = new THREE.MeshStandardMaterial({ color: '#121620', metalness: 0.8, roughness: 0.4 });
  const woodMat = new THREE.MeshStandardMaterial({ color: '#5c3a1e', roughness: 0.7 });
  const brassMat = new THREE.MeshStandardMaterial({ color: '#b8860b', metalness: 0.9, roughness: 0.2 });
  const tritiumMat = new THREE.MeshBasicMaterial({ color: isPap ? '#00f0ff' : '#00ff66' });
  const rayGlowMat = new THREE.MeshBasicMaterial({ color: isPap ? '#00ffff' : '#22ff66' });

  if (type === 'pistol') {
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
  } else if (type === 'smg') {
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
  } else if (type === 'ar') {
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
  } else if (type === 'shotgun') {
    // KRM-262 Shotgun
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
  } else if (type === 'sniper') {
    // DSR-50 Heavy Sniper Rifle
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
  } else if (type === 'lmg') {
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

    // Drum / Belt Box Magazine
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
  } else if (type === 'raygun') {
    // Ray Gun
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

export const WALL_BUY_CONFIG: Record<string, { name: string; price: number; wepType: string }> = {
  wall_buy_smg: { name: 'MP40', price: 1000, wepType: 'smg' },
  wall_buy_ar: { name: 'VX-44', price: 1500, wepType: 'ar' },
  wall_buy_shotgun: { name: 'SG-26', price: 1200, wepType: 'shotgun' },
  wall_buy_sniper: { name: 'SR-50', price: 2000, wepType: 'sniper' },
  wall_buy_lmg: { name: 'MG42 LMG', price: 2500, wepType: 'lmg' },
  wall_buy_raygun: { name: 'Plasma Blaster', price: 4000, wepType: 'raygun' },
};

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
    const modelScale = cfg.wepType === 'sniper' || cfg.wepType === 'lmg' ? 0.92 : 1.1;
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

  public requestLock() {
    if (this.container && this.isMapLoaded && !this.stats.isGameOver) {
      this.container.requestPointerLock();
    }
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

  // Weapons Pool
  private baseWeapons: Record<string, WeaponStats> = {
    pistol: {
      id: 'pistol',
      name: 'M1911',
      papName: 'Twin Vipers',
      isPap: false,
      type: 'pistol',
      damage: 40,
      fireRate: 0.22,
      clipSize: 8,
      maxReserve: 80,
      reloadTime: 1.4,
      price: 0,
      color: '#aaaaaa',
      papColor: '#00f0ff',
    },
    smg: {
      id: 'smg',
      name: 'MP40',
      papName: 'Afterburner',
      isPap: false,
      type: 'smg',
      damage: 45,
      fireRate: 0.09,
      clipSize: 32,
      maxReserve: 192,
      reloadTime: 1.8,
      price: 1000,
      color: '#4488ff',
      papColor: '#00ffff',
    },
    ar: {
      id: 'ar',
      name: 'VX-44',
      papName: 'Annihilator-44',
      isPap: false,
      type: 'ar',
      damage: 75,
      fireRate: 0.13,
      clipSize: 30,
      maxReserve: 180,
      reloadTime: 2.1,
      price: 1500,
      color: '#ffaa22',
      papColor: '#00ffff',
    },
    shotgun: {
      id: 'shotgun',
      name: 'SG-26',
      papName: "Dragon's Breath",
      isPap: false,
      type: 'shotgun',
      damage: 32,
      pellets: 8,
      spread: 0.08,
      fireRate: 0.75,
      clipSize: 8,
      maxReserve: 48,
      reloadTime: 2.6,
      price: 1200,
      color: '#ff4422',
      papColor: '#ffaa00',
    },
    sniper: {
      id: 'sniper',
      name: 'SR-50',
      papName: 'Apex Executioner',
      isPap: false,
      type: 'sniper',
      damage: 210,
      fireRate: 0.85,
      clipSize: 5,
      maxReserve: 35,
      reloadTime: 2.5,
      price: 2000,
      color: '#38bdf8',
      papColor: '#00ffff',
    },
    lmg: {
      id: 'lmg',
      name: 'MG42',
      papName: 'Barrage Shredder',
      isPap: false,
      type: 'lmg',
      damage: 52,
      fireRate: 0.075,
      clipSize: 75,
      maxReserve: 300,
      reloadTime: 3.1,
      price: 2500,
      color: '#f59e0b',
      papColor: '#00ffff',
    },
    raygun: {
      id: 'raygun',
      name: 'Plasma Blaster',
      papName: 'X2 Hyper-Plasma',
      isPap: false,
      type: 'raygun',
      damage: 240,
      fireRate: 0.28,
      clipSize: 20,
      maxReserve: 120,
      reloadTime: 1.9,
      price: 4000,
      color: '#22ff66',
      papColor: '#00ffff',
    },
  };

  // Player State
  public playerWeapons: PlayerWeapon[] = [];
  public currentWeaponIndex: number = 0;
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
  private bullets: { mesh: THREE.Mesh; vel: THREE.Vector3; life: number; isPap: boolean; damage: number }[] = [];

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

  // Settings & Configuration
  public settings = {
    mouseSensitivity: 0.0022,
    worldBrightness: 0.85,
    exposure: 1.25,
    fov: 75,
    flashlightIntensity: 4.5,
    invertY: false,
    masterVolume: 80,
  };

  private ambientLight!: THREE.AmbientLight;
  private defaultRoomEnv: THREE.Texture | null = null;

  public setSensitivity(val: number) {
    this.settings.mouseSensitivity = val;
    this.onStateUpdate?.();
  }

  public setWorldBrightness(val: number) {
    this.settings.worldBrightness = val;
    if (this.ambientLight) {
      this.ambientLight.intensity = this.activeMapConfig ? 0.04 * val : 0.35 + val * 0.6;
    }
    if (this.renderer && !this.activeMapConfig) {
      this.renderer.toneMappingExposure = 0.7 + val * 0.55;
    }
    this.onStateUpdate?.();
  }

  public setExposure(val: number) {
    this.settings.exposure = val;
    this.renderer.toneMappingExposure = val;
    this.onStateUpdate?.();
  }

  public setFOV(val: number) {
    this.settings.fov = val;
    if (!this.isAiming) {
      this.camera.fov = val;
      this.camera.updateProjectionMatrix();
    }
    this.onStateUpdate?.();
  }

  public setFlashlightIntensity(val: number) {
    this.settings.flashlightIntensity = val;
    this.applyFlashlightState();
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
    this.onStateUpdate?.();
  }

  public setMasterVolume(val: number) {
    this.settings.masterVolume = val;
    soundEngine.setVolume(val / 100);
    this.onStateUpdate?.();
  }

  public resetToMainMenu() {
    this.stats.isPaused = false;
    this.stats.isGameOver = false;
    if (document.pointerLockElement === this.container) {
      document.exitPointerLock();
    }
    this.unloadMap();
  }

  // Mystery Box State
  private isBoxSpinning: boolean = false;
  private boxSpinTimer: number = 0;
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

    // Window Resize Handler
    window.addEventListener('resize', this.onWindowResize);

    // Start Game Loop
    this.animate();
  }

  public isMapLoaded: boolean = false;
  public activeMapConfig?: CustomMapConfig;
  private customSolidBoxes: { minX: number; maxX: number; minZ: number; maxZ: number; minY: number; maxY: number }[] = [];
  private customZombieSpawners: THREE.Vector3[] = [];
  private customSpawnPos: THREE.Vector3 = new THREE.Vector3(0, 1.6, 0);
  private customSpawnYaw: number = 0;
  private explosiveBarrels: { id: string; mesh: THREE.Group; position: THREE.Vector3; exploded: boolean; radius: number }[] = [];
  private customTeleporters: THREE.Vector3[] = [];
  private lastTeleportTime: number = 0;

  public loadMap(customConfig?: CustomMapConfig) {
    if (this.isMapLoaded) return;

    if (customConfig) {
      this.activeMapConfig = customConfig;
    } else {
      this.activeMapConfig = undefined;
    }

    // Reset Inventory to M1911
    this.playerWeapons = [
      {
        stats: { ...this.baseWeapons.pistol },
        currentClip: this.baseWeapons.pistol.clipSize,
        currentReserve: this.baseWeapons.pistol.maxReserve,
        isReloading: false,
        reloadProgress: 0,
      },
    ];
    this.currentWeaponIndex = 0;

    // Build 3D World & Map Objects
    if (this.activeMapConfig) {
      this.setupCustomMap(this.activeMapConfig);
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
    this.startRound(1);
    this.isMapLoaded = true;
    this.onStateUpdate?.();
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

    // Remove all zombies
    this.zombies.forEach((z) => this.scene.remove(z.meshGroup));
    this.zombies = [];

    // Remove all bullets & particles
    this.bullets.forEach((b) => this.scene.remove(b.mesh));
    this.bullets = [];
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
    this.activeMapConfig = undefined;
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
    const isCustom = Boolean(this.activeMapConfig);
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
    this.gunMesh = createWeapon3DModel(curWep.stats.type, curWep.stats.isPap);
    this.gunGroup.add(this.gunMesh);
  }

  // Pointer Lock & Key Event Handlers
  private setupEventListeners() {
    // Prevent context menu on container for smooth right-click ADS
    this.container.addEventListener('contextmenu', (e) => e.preventDefault());

    // Mouse Click Lock & Shoot
    this.container.addEventListener('click', (e) => {
      if (e.button === 0) {
        if (this.isMapLoaded && !this.isPointerLocked && !this.stats.isGameOver && !this.stats.isPaused) {
          this.container.requestPointerLock();
        } else if (this.isPointerLocked) {
          this.shoot();
        }
      }
    });

    // Right-Click Aim Down Sights (ADS)
    window.addEventListener('mousedown', (e) => {
      if (e.button === 2 && this.isPointerLocked) {
        this.isAiming = true;
        this.onStateUpdate?.();
      }
    });

    window.addEventListener('mouseup', (e) => {
      if (e.button === 2) {
        this.isAiming = false;
        this.onStateUpdate?.();
      }
    });

    document.addEventListener('pointerlockchange', () => {
      this.isPointerLocked = document.pointerLockElement === this.container;
      
      // Reset held key states & player velocity so player doesn't get stuck moving on pause/unlock
      this.keys = {};
      this.playerVel.set(0, 0, 0);

      if (!this.isPointerLocked) {
        this.isAiming = false;
        if (this.isMapLoaded && !this.stats.isGameOver) {
          this.stats.isPaused = true;
        }
      } else {
        if (this.isMapLoaded) {
          this.stats.isPaused = false;
        }
      }
      this.onStateUpdate?.();
    });

    window.addEventListener('blur', () => {
      this.keys = {};
      this.playerVel.set(0, 0, 0);
    });

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.keys = {};
        this.playerVel.set(0, 0, 0);
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
      if (!this.isMapLoaded || !this.isPointerLocked) return;

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
    });

    window.addEventListener('keyup', (e) => {
      if (!this.isMapLoaded || !this.isPointerLocked) return;

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
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  };

  // Switch Active Weapon
  public switchWeapon(index: number) {
    if (index < 0 || index >= this.playerWeapons.length || index === this.currentWeaponIndex) return;
    this.isAiming = false;
    this.currentWeaponIndex = index;
    this.updateGunMesh();
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
    if (this.stats.isGameOver || this.stats.isPaused) return;
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
    soundEngine.playShoot(curWep.stats.type, curWep.stats.isPap);

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

    for (let p = 0; p < pelletsCount; p++) {
      const raycaster = new THREE.Raycaster();
      const spreadX = (Math.random() - 0.5) * spread;
      const spreadY = (Math.random() - 0.5) * spread;

      const screenCenter = new THREE.Vector2(spreadX, spreadY);
      raycaster.setFromCamera(screenCenter, this.camera);

      // Spawn physical 3D flying bullet coming out of gun muzzle!
      this.spawnBulletProjectile(raycaster.ray.direction, curWep.stats.isPap, baseDamage);
    }

    this.onStateUpdate?.();
  }

  private spawnBulletProjectile(dir: THREE.Vector3, isPap: boolean, damage: number) {
    // Exact 3D Muzzle position in world space
    const muzzlePos = new THREE.Vector3();
    this.muzzleFlashLight.getWorldPosition(muzzlePos);

    const bulletColor = isPap ? '#00f0ff' : '#ffcc00';

    // Physical 3D Bullet Cylinder
    const bulletGeo = new THREE.CylinderGeometry(0.025, 0.012, 0.45, 8);
    const bulletMat = new THREE.MeshBasicMaterial({ color: bulletColor });
    const mesh = new THREE.Mesh(bulletGeo, bulletMat);

    mesh.position.copy(muzzlePos);

    // Align cylinder orientation along bullet flight trajectory
    const axis = new THREE.Vector3(0, 1, 0);
    mesh.quaternion.setFromUnitVectors(axis, dir.clone().normalize());

    this.scene.add(mesh);

    const speed = 65.0; // Units per second
    const velocity = dir.clone().normalize().multiplyScalar(speed);

    this.bullets.push({
      mesh,
      vel: velocity,
      life: 1.2,
      isPap,
      damage,
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
      const intersects = raycaster.intersectObjects(zombieMeshes, true);

      if (intersects.length > 0) {
        const hitObj = intersects[0].object;
        const hitPoint = intersects[0].point;

        // Find parent zombie
        const zombie = this.zombies.find((z) => {
          let p: THREE.Object3D | null = hitObj;
          while (p) {
            if (p === z.meshGroup) return true;
            p = p.parent;
          }
          return false;
        });

        if (zombie) {
          let hitMult = 1.0;
          let hitType: 'head' | 'chest' | 'torso' | 'limb' = 'torso';

          if (hitObj.name === 'zombieHead') {
            hitMult = 3.0; // Headshots deal maximum critical damage
            hitType = 'head';
          } else if (hitObj.name === 'zombieChest') {
            hitMult = 1.6; // Upper chest vital hit
            hitType = 'chest';
          } else if (hitObj.name === 'zombieTorso') {
            hitMult = 1.0; // Standard torso damage
            hitType = 'torso';
          } else if (hitObj.name.startsWith('zombieArm') || hitObj.name.startsWith('zombieLeg')) {
            hitMult = 0.6; // Arms and legs deal least amount of damage
            hitType = 'limb';
          }

          const hitDamage = b.damage * hitMult;
          zombie.health -= hitDamage;

          // Blood Splatter Particles at exact hit point
          this.spawnBloodParticles(hitPoint);

          // Hitmarker Audio & UI
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

        // Remove bullet on zombie hit
        this.scene.remove(b.mesh);
        b.mesh.geometry.dispose();
        (b.mesh.material as THREE.Material).dispose();
        this.bullets.splice(i, 1);
        continue;
      }

      // Check Explosive Barrels raycast / proximity hit
      const activeBarrels = this.explosiveBarrels.filter((eb) => !eb.exploded);
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
      const isPassingThroughWindow = this.barriers.some((b) => {
        const dx = nextPos.x - b.position.x;
        const dz = nextPos.z - b.position.z;
        const dist2D = Math.sqrt(dx * dx + dz * dz);
        return dist2D <= 2.2 && nextPos.y >= 0 && nextPos.y <= 3.5;
      });

      // Check wall bounds collision
      const maxRange = this.activeMapConfig ? 120.0 : 28.0;
      const isOutOfBounds =
        nextPos.y <= 0 ||
        nextPos.y >= (this.activeMapConfig ? 40.0 : 5.5) ||
        Math.abs(nextPos.x) >= maxRange ||
        Math.abs(nextPos.z) >= maxRange;

      const isHittingSolidWall =
        !this.activeMapConfig &&
        !isPassingThroughWindow &&
        (Math.abs(nextPos.x) >= 11.6 || Math.abs(nextPos.z) >= 11.6);

      if (isOutOfBounds || isHittingSolidWall) {
        if (isHittingSolidWall) {
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

    // Respawn explosive barrels at start of new wave
    this.explosiveBarrels.forEach((eb) => {
      eb.exploded = false;
      eb.mesh.visible = true;
    });

    soundEngine.playRoundChange(true);
    this.onStateUpdate?.();

    // Spawn count formula
    this.zombiesToSpawn = 6 + (roundNum - 1) * 4;
  }

  private detonateExplosiveBarrel(barrel: { id: string; mesh: THREE.Group; position: THREE.Vector3; exploded: boolean; radius: number }) {
    if (barrel.exploded) return;
    barrel.exploded = true;
    barrel.mesh.visible = false;
    soundEngine.playExplosion();

    // Explosion fiery particle burst
    for (let i = 0; i < 28; i++) {
      const col = i % 3 === 0 ? '#ff3300' : i % 3 === 1 ? '#ffaa00' : '#444444';
      const pMesh = new THREE.Mesh(
        new THREE.BoxGeometry(0.18, 0.18, 0.18),
        new THREE.MeshBasicMaterial({ color: col })
      );
      pMesh.position.copy(barrel.position);
      this.scene.add(pMesh);
      const vel = new THREE.Vector3(
        (Math.random() - 0.5) * 10,
        Math.random() * 8 + 2,
        (Math.random() - 0.5) * 10
      );
      this.particles.push({ mesh: pMesh, velocity: vel, life: 0.65, maxLife: 0.65, color: col });
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
    } else if (!this.activeMapConfig) {
      spawnPos.set((Math.random() - 0.5) * 16, 0, (Math.random() - 0.5) * 16);
      initialState = 'chasing_player';
    } else {
      return;
    }

    // Zombie Mesh Group
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

  private checkRoundCompletion() {
    if (this.zombiesToSpawn <= 0 && this.zombies.length === 0 && !this.stats.isRoundBreak) {
      this.startRound(this.stats.round + 1);
    }
  }

  // Main Interactive Prompts Check
  private updateInteractivePrompts() {
    this.currentPrompt = '';
    this.interactTargetAction = null;

    // Check Distance to Player Camera
    const playerPos2D = new THREE.Vector2(this.playerPos.x, this.playerPos.z);

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
          } else if (obj.type === 'mystery_box' && !this.isBoxSpinning) {
            this.currentPrompt = `PRESS 'E' TO OPEN ARMORY CHEST [950 PTS]`;
            this.interactTargetAction = () => this.spinMysteryBox();
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
      if (playerPos2D.distanceTo(new THREE.Vector2(11.1, -5)) < 2.5 && !this.isBoxSpinning) {
        this.currentPrompt = `PRESS 'E' TO OPEN ARMORY CHEST [950 PTS]`;
        this.interactTargetAction = () => this.spinMysteryBox();
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
    soundEngine.playPackAPunch();
    this.onStateUpdate?.();
  }

  // Spin Mystery Box
  private spinMysteryBox() {
    if (this.stats.score < 950 || this.isBoxSpinning) return;

    this.stats.score -= 950;
    this.isBoxSpinning = true;
    this.boxSpinTimer = 3.0; // 3 seconds cycle
    soundEngine.playPackAPunch();

    setTimeout(() => {
      this.isBoxSpinning = false;
      // Grant random high tier weapon or Ray Gun!
      const pool = ['raygun', 'sniper', 'lmg', 'ar', 'shotgun', 'smg'];
      const newWepId = pool[Math.floor(Math.random() * pool.length)];
      this.grantWeapon(newWepId);
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
    soundEngine.playReload();
    this.onStateUpdate?.();
  }

  // Main Per-Frame Game Tick
  private animate = () => {
    requestAnimationFrame(this.animate);

    if (!this.isMapLoaded) return; // Completely pause 3D scene rendering on Main Menu for 0% GPU load!

    const delta = Math.min(this.clock.getDelta(), 0.1);

    if (!this.stats.isPaused && !this.stats.isGameOver) {
      this.updatePlayerMovement(delta);
      this.updateWeapons(delta);
      this.updateBullets(delta);
      this.updateZombies(delta);
      this.updateParticles(delta);
      this.updateWaveManager(delta);
      this.updateInteractivePrompts();

      // Subtle flickering animation for sconce lantern lights
      const time = this.clock.getElapsedTime();
      this.sconceLights.forEach((light, i) => {
        const flicker = (Math.sin(time * 12 + i * 1.5) * 0.15 + Math.cos(time * 23 + i * 2.1) * 0.1);
        light.intensity = 2.8 + flicker;
      });
    }

    this.renderer.render(this.scene, this.camera);
  };

  private updatePlayerMovement(delta: number) {
    // Camera rotation from mouse yaw & pitch
    const euler = new THREE.Euler(0, 0, 0, 'YXZ');
    euler.x = this.pitch;
    euler.y = this.yaw;
    this.camera.quaternion.setFromEuler(euler);

    // WASD Movement
    const moveDir = new THREE.Vector3();
    if (this.keys['KeyW']) moveDir.z -= 1;
    if (this.keys['KeyS']) moveDir.z += 1;
    if (this.keys['KeyA']) moveDir.x -= 1;
    if (this.keys['KeyD']) moveDir.x += 1;

    moveDir.normalize();

    // Speed calculation
    const isSprint = this.keys['ShiftLeft'] || this.keys['ShiftRight'];
    const speed = isSprint ? 7.5 : 4.5;

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

    // Room Wall Bounds Collision (-11.2 to +11.2) only for default built-in room
    if (!this.activeMapConfig) {
      const maxB = 11.2;
      this.playerPos.x = Math.max(-maxB, Math.min(maxB, this.playerPos.x));
      this.playerPos.z = Math.max(-maxB, Math.min(maxB, this.playerPos.z));
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

    // Compute supporting floor height (handles elevated floors/platforms in custom maps)
    let groundY = 0;
    if (this.activeMapConfig) {
      const feetY = this.playerPos.y - 1.6;
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
      if (this.isGrounded && this.playerPos.y < groundY + 1.6) {
        this.playerPos.y = groundY + 1.6;
      } else if (this.isGrounded && this.playerPos.y > groundY + 1.6 + 0.05) {
        this.isGrounded = false;
      }
    }
    const minEyeY = groundY + 1.6;

    // Jump Physics
    if (this.keys['Space'] && this.isGrounded) {
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

    this.playerBodyRig.position.set(bodyX, this.playerPos.y - 1.6, bodyZ);
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

    // Health Auto-Regeneration (After 4s without damage)
    if (Date.now() - this.lastDamageTime > 4000 && this.playerHp < this.maxHp) {
      this.playerHp = Math.min(this.maxHp, this.playerHp + 40 * delta);
      this.onStateUpdate?.();
    }

    // Holding 'E' Repair Progress
    if (this.isHoldingInteract && this.currentPrompt.includes('REPAIR')) {
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
    const playerPosVec = new THREE.Vector3(this.playerPos.x, 0, this.playerPos.z);

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

    this.zombies.forEach((z) => {
      const zPos = z.meshGroup.position;
      const barrier = z.windowId !== null ? this.barriers[z.windowId] : null;

      const armL = z.meshGroup.getObjectByName('zombieArmL');
      const armR = z.meshGroup.getObjectByName('zombieArmR');
      const legL = z.meshGroup.getObjectByName('zombieLegL');
      const legR = z.meshGroup.getObjectByName('zombieLegR');

      if (z.state === 'approaching_window' && barrier) {
        // Move towards window barrier but stop OUTSIDE the frame to prevent plank clipping
        const outsideOffset = barrier.direction.clone().multiplyScalar(-1.4);
        const targetPos = barrier.position.clone().add(outsideOffset);
        targetPos.y = 0;

        const dir = targetPos.clone().sub(zPos).normalize();
        zPos.addScaledVector(dir, z.speed * delta);

        // Keep zombie facing barrier with front (-Z eyes/face) toward targetPos
        const angle = Math.atan2(targetPos.x - zPos.x, targetPos.z - zPos.z) + Math.PI;
        z.meshGroup.rotation.set(0, angle, 0);

        // Walking animation
        z.walkCycle += delta * z.speed * 5;
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

        z.breakPlankTimer += delta;
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
        const dir = enterPos.clone().sub(zPos).normalize();
        zPos.addScaledVector(dir, z.speed * delta);

        const angle = Math.atan2(enterPos.x - zPos.x, enterPos.z - zPos.z) + Math.PI;
        z.meshGroup.rotation.set(0, angle, 0);

        z.walkCycle += delta * z.speed * 5;
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
        const targetDir = playerPosVec.clone().sub(zPos).normalize();
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
          dir.normalize();
        }

        const angle = Math.atan2(playerPosVec.x - zPos.x, playerPosVec.z - zPos.z) + Math.PI;
        z.meshGroup.rotation.set(0, angle, 0);

        if (distToPlayer > 1.3) {
          zPos.addScaledVector(dir, z.speed * delta);
          this.resolveMapCollisions(zPos, 0.45, zPos.y, 1.8);
          z.state = 'chasing_player';

          z.walkCycle += delta * z.speed * 5;
          if (legL && legR) {
            legL.rotation.x = Math.sin(z.walkCycle) * 0.5;
            legR.rotation.x = -Math.sin(z.walkCycle) * 0.5;
          }
          if (armL && armR) {
            armL.rotation.x = -Math.PI / 3 + Math.sin(z.walkCycle) * 0.3;
            armR.rotation.x = -Math.PI / 3 - Math.sin(z.walkCycle) * 0.3;
          }
        } else {
          z.state = 'attacking';
          z.attackTimer += delta;

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
              this.stats.isGameOver = true;
              document.exitPointerLock();
            }

            this.onStateUpdate?.();
          }
        }
      }
    });
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
    if (this.stats.isRoundBreak) {
      this.stats.roundBreakTimer -= delta;
      if (this.stats.roundBreakTimer <= 0) {
        this.stats.isRoundBreak = false;
        soundEngine.playRoundChange(true);
        this.onStateUpdate?.();
      }
      return;
    }

    // Spawn zombie timer
    this.spawnTimer += delta;
    if (this.spawnTimer >= 2.5 && this.zombiesToSpawn > 0 && this.zombies.length < 16) {
      this.spawnTimer = 0;
      this.spawnZombie();
    }
  }

  // Reset / Restart Game
  public restartGame() {
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
    if (this.activeMapConfig) {
      this.playerPos.copy(this.customSpawnPos);
      this.yaw = this.customSpawnYaw;
      this.pitch = 0;
    } else {
      this.playerPos.set(0, 1.6, 0);
      this.yaw = 0;
      this.pitch = 0;
    }
    this.playerVel.set(0, 0, 0);
    this.isGrounded = true;
    this.camera.position.copy(this.playerPos);
    this.perks = { juggernog: false, speedCola: false, doubleTap: false };

    // Reset Inventory to Pistol
    this.playerWeapons = [
      {
        stats: { ...this.baseWeapons.pistol },
        currentClip: this.baseWeapons.pistol.clipSize,
        currentReserve: this.baseWeapons.pistol.maxReserve,
        isReloading: false,
        reloadProgress: 0,
      },
    ];
    this.currentWeaponIndex = 0;
    this.updateGunMesh();

    // Reset Barriers
    this.barriers.forEach((b) => {
      b.planks = 5;
      const meshGroup = this.barrierMeshes[b.id];
      meshGroup.planks.forEach((p) => (p.visible = true));
    });

    this.startRound(1);
    this.container.requestPointerLock();
  }

  public dispose() {
    window.removeEventListener('resize', this.onWindowResize);
    this.renderer.dispose();
    this.container.innerHTML = '';
  }
}
