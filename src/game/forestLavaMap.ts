import * as THREE from 'three';
import {
  createBarkTexture,
  createForestGroundTexture,
  createLavaTexture,
  createMysteryBoxTexture,
  createPackAPunchTexture,
  createPerkMachineTexture,
  createRockTexture,
  createWallBuyChalkTexture,
} from '../utils/proceduralTextures';

export interface SolidBox {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  minY: number;
  maxY: number;
}

export interface ForestWallBuySpot {
  type: string;
  name: string;
  price: number;
  position: THREE.Vector3;
}

export interface ForestLavaMapState {
  solidBoxes: SolidBox[];
  zombieSpawners: THREE.Vector3[];
  forestTeleporterPos: THREE.Vector3;
  lavaArrivalTeleporterPos: THREE.Vector3;
  lavaAltarTeleporterPos: THREE.Vector3;
  lavaArrivalSpawnPos: THREE.Vector3;
  forestReturnSpawnPos: THREE.Vector3;
  hyperForgePos: THREE.Vector3;
  perkPositions: {
    juggernog: THREE.Vector3;
    speedCola: THREE.Vector3;
    doubleTap: THREE.Vector3;
  };
  armoryChestPos: THREE.Vector3;
  ammoCratePos: THREE.Vector3;
  wallBuys: ForestWallBuySpot[];
  campfireLight: THREE.PointLight;
  teleporterRings: THREE.Mesh[];
  lavaMaterial: THREE.MeshStandardMaterial;
  lavaTexture: THREE.CanvasTexture;
  lavaGlowLights: THREE.PointLight[];
  playerSpawnPos: THREE.Vector3;
  playerSpawnYaw: number;
}

function seededRandom(seed: number): () => number {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function createPineTreeGroup(
  barkMat: THREE.Material,
  foliageBaseColor: string,
  scale: number,
  rand: () => number
): THREE.Group {
  const grp = new THREE.Group();

  // Base root flare (grounded at y = 0)
  const rootGeo = new THREE.CylinderGeometry(0.32 * scale, 0.56 * scale, 0.65 * scale, 7);
  const root = new THREE.Mesh(rootGeo, barkMat);
  root.position.y = 0.32 * scale;
  root.castShadow = true;
  root.receiveShadow = true;
  grp.add(root);

  // Main trunk
  const trunkHeight = 3.6 * scale;
  const trunkGeo = new THREE.CylinderGeometry(0.18 * scale, 0.34 * scale, trunkHeight, 7);
  const trunk = new THREE.Mesh(trunkGeo, barkMat);
  trunk.position.y = trunkHeight / 2 + 0.25 * scale;
  trunk.castShadow = true;
  trunk.receiveShadow = true;
  grp.add(trunk);

  // Side gnarled dead branch accent
  const branchGeo = new THREE.CylinderGeometry(0.05 * scale, 0.1 * scale, 1.1 * scale, 5);
  const branch = new THREE.Mesh(branchGeo, barkMat);
  branch.position.set(0.34 * scale, 2.25 * scale, 0.08 * scale);
  branch.rotation.z = -Math.PI / 3;
  branch.rotation.y = rand() * Math.PI * 2;
  grp.add(branch);

  // Three staggered conifer foliage tiers with matte needle roughness
  const needleMat = new THREE.MeshStandardMaterial({
    color: foliageBaseColor,
    roughness: 0.9,
    metalness: 0.02,
    flatShading: true,
  });

  const tiers = [
    { r: 1.95 * scale, h: 2.6 * scale, y: 3.1 * scale, rot: rand() * 0.5 },
    { r: 1.52 * scale, h: 2.35 * scale, y: 4.55 * scale, rot: rand() * 0.7 },
    { r: 1.02 * scale, h: 2.1 * scale, y: 5.95 * scale, rot: rand() * 0.9 },
  ];

  tiers.forEach((t) => {
    const cone = new THREE.Mesh(new THREE.ConeGeometry(t.r, t.h, 7), needleMat);
    cone.position.y = t.y;
    cone.rotation.y = t.rot;
    cone.castShadow = true;
    cone.receiveShadow = true;
    grp.add(cone);
  });

  return grp;
}

function createBoulderClusterGroup(
  rockMat: THREE.Material,
  mossMat: THREE.Material | null,
  radius: number,
  rand: () => number,
  lavaTrimMat?: THREE.Material
): THREE.Group {
  const grp = new THREE.Group();

  // Primary boulder
  const mainGeo = new THREE.DodecahedronGeometry(radius, 0);
  const main = new THREE.Mesh(mainGeo, rockMat);
  main.scale.set(1.0 + rand() * 0.25, 0.72 + rand() * 0.3, 1.0 + rand() * 0.25);
  main.position.y = radius * 0.45;
  main.rotation.set(rand() * 0.6, rand() * Math.PI * 2, rand() * 0.6);
  main.castShadow = true;
  main.receiveShadow = true;
  grp.add(main);

  // Secondary shoulder boulders
  for (let i = 0; i < 3; i++) {
    const subR = radius * (0.45 + rand() * 0.25);
    const sub = new THREE.Mesh(new THREE.DodecahedronGeometry(subR, 0), rockMat);
    const ang = (i * Math.PI * 2) / 3 + rand() * 0.5;
    sub.position.set(
      Math.cos(ang) * radius * 0.72,
      subR * 0.4,
      Math.sin(ang) * radius * 0.72
    );
    sub.rotation.set(rand() * Math.PI, rand() * Math.PI, rand() * Math.PI);
    sub.castShadow = true;
    sub.receiveShadow = true;
    grp.add(sub);
  }

  // Moss cap on forest boulders or glowing magma vein on volcanic rocks
  if (mossMat) {
    const cap = new THREE.Mesh(new THREE.DodecahedronGeometry(radius * 0.58, 0), mossMat);
    cap.scale.set(1.1, 0.35, 1.1);
    cap.position.y = radius * 0.92;
    cap.rotation.y = rand() * Math.PI;
    grp.add(cap);
  } else if (lavaTrimMat) {
    const fissure = new THREE.Mesh(new THREE.BoxGeometry(radius * 1.4, radius * 0.14, radius * 0.25), lavaTrimMat);
    fissure.position.y = radius * 0.38;
    fissure.rotation.y = rand() * Math.PI;
    grp.add(fissure);
  }

  return grp;
}

function createTeleporterPadMesh(accentHex: string, coreHex: string): { group: THREE.Group; ring: THREE.Mesh } {
  const grp = new THREE.Group();
  const stoneMat = new THREE.MeshStandardMaterial({ color: '#1e2631', roughness: 0.5, metalness: 0.75 });
  const glowMat = new THREE.MeshBasicMaterial({ color: accentHex });
  const coreMat = new THREE.MeshBasicMaterial({ color: coreHex, transparent: true, opacity: 0.72 });

  const base = new THREE.Mesh(new THREE.CylinderGeometry(1.45, 1.7, 0.26, 8), stoneMat);
  base.position.y = 0.13;
  base.receiveShadow = true;
  grp.add(base);

  const ring = new THREE.Mesh(new THREE.TorusGeometry(1.18, 0.08, 10, 24), glowMat);
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.32;
  grp.add(ring);

  const disc = new THREE.Mesh(new THREE.CylinderGeometry(1.05, 1.05, 0.05, 24), coreMat);
  disc.position.y = 0.27;
  grp.add(disc);

  // 4 Ancient Runic Pylons
  for (let i = 0; i < 4; i++) {
    const ang = (i * Math.PI) / 2 + Math.PI / 4;
    const pylon = new THREE.Mesh(new THREE.BoxGeometry(0.2, 1.15, 0.2), stoneMat);
    pylon.position.set(Math.cos(ang) * 1.38, 0.58, Math.sin(ang) * 1.38);
    pylon.rotation.y = -ang;
    grp.add(pylon);

    const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(0.14, 0), glowMat);
    crystal.position.set(Math.cos(ang) * 1.38, 1.28, Math.sin(ang) * 1.38);
    grp.add(crystal);
  }

  const pLight = new THREE.PointLight(accentHex, 3.2, 11);
  pLight.position.set(0, 1.6, 0);
  grp.add(pLight);

  return { group: grp, ring };
}

export function buildForestLavaMap(
  scene: THREE.Scene,
  maxAnisotropy: number,
  createWeapon3DModel: (typeOrId: string, isPap?: boolean) => THREE.Group
): ForestLavaMapState {
  const rand = seededRandom(42197);
  const solidBoxes: SolidBox[] = [];
  const zombieSpawners: THREE.Vector3[] = [];
  const teleporterRings: THREE.Mesh[] = [];
  const lavaGlowLights: THREE.PointLight[] = [];

  // Shared Procedural Materials (zero external URLs, proper sRGB + anisotropy)
  const groundTex = createForestGroundTexture(maxAnisotropy);
  const barkTex = createBarkTexture(maxAnisotropy);
  const rockTex = createRockTexture(maxAnisotropy, false);
  const volcanicRockTex = createRockTexture(maxAnisotropy, true);
  const lavaTex = createLavaTexture(maxAnisotropy);

  const groundMat = new THREE.MeshStandardMaterial({
    map: groundTex,
    roughness: 0.95,
    metalness: 0.02,
  });

  const barkMat = new THREE.MeshStandardMaterial({
    map: barkTex,
    roughness: 0.92,
    metalness: 0.02,
  });

  const forestRockMat = new THREE.MeshStandardMaterial({
    map: rockTex,
    color: '#6b7578',
    roughness: 0.88,
    metalness: 0.05,
    flatShading: true,
  });

  const mossMat = new THREE.MeshStandardMaterial({
    color: '#254223',
    roughness: 0.95,
    metalness: 0.0,
    flatShading: true,
  });

  const volcanicRockMat = new THREE.MeshStandardMaterial({
    map: volcanicRockTex,
    color: '#342c30',
    roughness: 0.85,
    metalness: 0.12,
    flatShading: true,
  });

  const basaltCapMat = new THREE.MeshStandardMaterial({
    map: volcanicRockTex,
    color: '#4f464a',
    roughness: 0.72,
    metalness: 0.18,
  });

  const emberCrackMat = new THREE.MeshStandardMaterial({
    color: '#ff5500',
    emissive: '#ff4500',
    emissiveIntensity: 1.6,
    roughness: 0.35,
  });

  // =========================================================================
  // ZONE 1: BLIGHTED WOODS (FOREST ARENA centered around 0, 0, 0)
  // =========================================================================
  const hemiLight = new THREE.HemisphereLight('#78a0cc', '#182414', 0.85);
  scene.add(hemiLight);

  const moonLight = new THREE.DirectionalLight('#b5d0ff', 1.15);
  moonLight.position.set(22, 34, 18);
  moonLight.castShadow = true;
  moonLight.shadow.mapSize.width = 1024;
  moonLight.shadow.mapSize.height = 1024;
  moonLight.shadow.camera.near = 2;
  moonLight.shadow.camera.far = 90;
  moonLight.shadow.camera.left = -32;
  moonLight.shadow.camera.right = 32;
  moonLight.shadow.camera.top = 32;
  moonLight.shadow.camera.bottom = -32;
  moonLight.shadow.bias = -0.0005;
  scene.add(moonLight);

  // Expansive Forest Floor
  const forestGround = new THREE.Mesh(new THREE.CircleGeometry(68, 48), groundMat);
  forestGround.rotation.x = -Math.PI / 2;
  forestGround.position.y = 0;
  forestGround.receiveShadow = true;
  scene.add(forestGround);

  // Dirt clearing ring & stone firepit in center (0, 0, 0)
  const clearingRing = new THREE.Mesh(
    new THREE.RingGeometry(1.1, 8.2, 24),
    new THREE.MeshStandardMaterial({ color: '#29241c', roughness: 0.95 })
  );
  clearingRing.rotation.x = -Math.PI / 2;
  clearingRing.position.y = 0.015;
  clearingRing.receiveShadow = true;
  scene.add(clearingRing);

  // Campfire Pit at Center (0, 0, 0)
  const fireGroup = new THREE.Group();
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI * 2) / 8;
    const stone = new THREE.Mesh(new THREE.DodecahedronGeometry(0.24, 0), forestRockMat);
    stone.position.set(Math.cos(a) * 0.72, 0.14, Math.sin(a) * 0.72);
    stone.scale.set(1.1, 0.7, 1.1);
    fireGroup.add(stone);
  }
  const logMat = new THREE.MeshStandardMaterial({ color: '#2c180d', roughness: 0.9 });
  for (let i = 0; i < 3; i++) {
    const log = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 1.0, 6), logMat);
    log.position.set(0, 0.22, 0);
    log.rotation.z = Math.PI / 2 - 0.35;
    log.rotation.y = (i * Math.PI) / 3;
    fireGroup.add(log);
  }
  const flameMesh = new THREE.Mesh(
    new THREE.ConeGeometry(0.28, 0.65, 6),
    new THREE.MeshBasicMaterial({ color: '#ff7711' })
  );
  flameMesh.position.y = 0.42;
  fireGroup.add(flameMesh);

  const campfireLight = new THREE.PointLight('#ff8822', 3.4, 20);
  campfireLight.position.set(0, 1.2, 0);
  fireGroup.add(campfireLight);
  scene.add(fireGroup);
  solidBoxes.push({ minX: -0.82, maxX: 0.82, minZ: -0.82, maxZ: 0.82, minY: 0, maxY: 0.8 });

  // Stations & Perks in the Forest Clearing
  const perkPositions = {
    juggernog: new THREE.Vector3(-6.6, 0, -2.8),
    speedCola: new THREE.Vector3(6.6, 0, -2.8),
    doubleTap: new THREE.Vector3(9.4, 0, 7.6),
  };

  const addPerkMachine = (
    pos: THREE.Vector3,
    ry: number,
    type: 'juggernog' | 'speedCola' | 'doubleTap',
    colorHex: string
  ) => {
    const grp = new THREE.Group();
    grp.position.copy(pos);
    grp.rotation.y = ry;
    const tex = createPerkMachineTexture(type);
    const frontMat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.3 });
    const sideMat = new THREE.MeshStandardMaterial({ color: colorHex, roughness: 0.45 });
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.4, 2.6, 1.2), [
      sideMat, sideMat, sideMat, sideMat, frontMat, sideMat,
    ]);
    body.position.y = 1.3;
    body.castShadow = true;
    grp.add(body);

    const light = new THREE.PointLight(colorHex, 2.0, 9);
    light.position.set(0, 2.5, 0.7);
    grp.add(light);
    scene.add(grp);

    const extX = Math.abs(Math.cos(ry) * 0.7) + Math.abs(Math.sin(ry) * 0.6);
    const extZ = Math.abs(Math.sin(ry) * 0.7) + Math.abs(Math.cos(ry) * 0.6);
    solidBoxes.push({
      minX: pos.x - extX,
      maxX: pos.x + extX,
      minZ: pos.z - extZ,
      maxZ: pos.z + extZ,
      minY: 0,
      maxY: 2.6,
    });
  };

  addPerkMachine(perkPositions.juggernog, Math.PI / 3, 'juggernog', '#dd1111');
  addPerkMachine(perkPositions.speedCola, -Math.PI / 3, 'speedCola', '#11dd44');
  addPerkMachine(perkPositions.doubleTap, -Math.PI * 0.75, 'doubleTap', '#eedd11');

  // Armory Chest (South Clearing Edge)
  const armoryChestPos = new THREE.Vector3(0, 0, 11.4);
  {
    const grp = new THREE.Group();
    grp.position.copy(armoryChestPos);
    grp.rotation.y = Math.PI;
    const boxTex = createMysteryBoxTexture();
    const boxMat = new THREE.MeshStandardMaterial({ map: boxTex, roughness: 0.5 });
    const woodMat = new THREE.MeshStandardMaterial({ color: '#3b2210', roughness: 0.75 });
    const slab = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.16, 1.5), forestRockMat);
    slab.position.y = 0.08;
    grp.add(slab);

    const chest = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.9, 1.1), [
      boxMat, boxMat, woodMat, woodMat, boxMat, boxMat,
    ]);
    chest.position.y = 0.61;
    chest.castShadow = true;
    grp.add(chest);

    const boxLight = new THREE.PointLight('#ffaa22', 2.2, 9);
    boxLight.position.set(0, 1.6, 0);
    grp.add(boxLight);
    scene.add(grp);

    solidBoxes.push({
      minX: armoryChestPos.x - 1.15,
      maxX: armoryChestPos.x + 1.15,
      minZ: armoryChestPos.z - 0.65,
      maxZ: armoryChestPos.z + 0.65,
      minY: 0,
      maxY: 1.1,
    });
  }

  // Ammo Resupply Crate
  const ammoCratePos = new THREE.Vector3(-8.4, 0, 8.2);
  {
    const grp = new THREE.Group();
    grp.position.copy(ammoCratePos);
    grp.rotation.y = Math.PI * 0.75;
    const oliveMat = new THREE.MeshStandardMaterial({ color: '#3b4d2b', roughness: 0.65, metalness: 0.35 });
    const brassMat = new THREE.MeshStandardMaterial({ color: '#eab308', roughness: 0.3, metalness: 0.85 });
    const darkMat = new THREE.MeshStandardMaterial({ color: '#181c24', roughness: 0.6, metalness: 0.6 });
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.72, 0.8), oliveMat);
    body.position.y = 0.36;
    body.castShadow = true;
    const lid = new THREE.Mesh(new THREE.BoxGeometry(1.38, 0.14, 0.88), darkMat);
    lid.position.y = 0.76;
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(1.32, 0.12, 0.82), brassMat);
    stripe.position.y = 0.48;
    const light = new THREE.PointLight('#facc15', 1.6, 7);
    light.position.set(0, 1.3, 0);
    grp.add(body, lid, stripe, light);
    scene.add(grp);

    solidBoxes.push({
      minX: ammoCratePos.x - 0.75,
      maxX: ammoCratePos.x + 0.75,
      minZ: ammoCratePos.z - 0.75,
      maxZ: ammoCratePos.z + 0.75,
      minY: 0,
      maxY: 0.9,
    });
  }

  // Stone Ruin Wall-Buy Mounts (MP40, SG-26, VX-44)
  const wallBuys: ForestWallBuySpot[] = [
    { type: 'smg', name: 'MP40', price: 1000, position: new THREE.Vector3(-10.5, 1.8, 2.5) },
    { type: 'shotgun', name: 'SG-26', price: 1200, position: new THREE.Vector3(11.2, 1.8, -1.5) },
    { type: 'ar', name: 'VX-44', price: 1500, position: new THREE.Vector3(0.0, 1.8, -11.5) },
  ];
  const wallBuyRotations = [Math.PI / 2, -Math.PI / 2, 0];

  wallBuys.forEach((wb, idx) => {
    const ry = wallBuyRotations[idx];
    const grp = new THREE.Group();
    grp.position.set(wb.position.x, 0, wb.position.z);
    grp.rotation.y = ry;

    // Stone ruin backing wall
    const wall = new THREE.Mesh(new THREE.BoxGeometry(2.8, 2.7, 0.45), forestRockMat);
    wall.position.set(0, 1.35, -0.26);
    wall.castShadow = true;
    wall.receiveShadow = true;
    grp.add(wall);

    const plaqueTex = createWallBuyChalkTexture(wb.name, wb.price);
    const plaque = new THREE.Mesh(
      new THREE.BoxGeometry(2.2, 1.1, 0.08),
      new THREE.MeshStandardMaterial({ map: plaqueTex, roughness: 0.5 })
    );
    plaque.position.set(0, 1.8, 0.01);
    grp.add(plaque);

    const gunModel = createWeapon3DModel(wb.type, false);
    gunModel.scale.set(1.08, 1.08, 1.08);
    gunModel.position.set(0, 1.98, 0.11);
    gunModel.rotation.y = Math.PI / 2;
    grp.add(gunModel);

    const lamp = new THREE.PointLight('#ffaa33', 1.9, 8);
    lamp.position.set(0, 2.4, 0.65);
    grp.add(lamp);

    scene.add(grp);

    // Collider for backing stone slab
    const wX = Math.abs(Math.cos(ry) * 1.4) + Math.abs(Math.sin(ry) * 0.25);
    const wZ = Math.abs(Math.sin(ry) * 1.4) + Math.abs(Math.cos(ry) * 0.25);
    solidBoxes.push({
      minX: wb.position.x - wX,
      maxX: wb.position.x + wX,
      minZ: wb.position.z - wZ,
      maxZ: wb.position.z + wZ,
      minY: 0,
      maxY: 2.7,
    });
  });

  // Hidden Forest Teleporter Shrine tucked deep in Northwest Pine Grove
  const forestTeleporterPos = new THREE.Vector3(-15.5, 0, -15.5);
  {
    const { group, ring } = createTeleporterPadMesh('#38bdf8', '#7c3aed');
    group.position.copy(forestTeleporterPos);
    scene.add(group);
    teleporterRings.push(ring);

    // Standing monolith stones partially shrouding the shrine from the center clearing
    const monolithOffsets = [
      { dx: -2.4, dz: -0.5, h: 3.1 },
      { dx: -0.5, dz: -2.4, h: 3.4 },
      { dx: 2.3, dz: -1.4, h: 2.7 },
      { dx: -1.8, dz: 2.2, h: 2.5 },
    ];
    monolithOffsets.forEach((m, i) => {
      const mx = forestTeleporterPos.x + m.dx;
      const mz = forestTeleporterPos.z + m.dz;
      const stone = new THREE.Mesh(new THREE.BoxGeometry(1.1, m.h, 0.9), forestRockMat);
      stone.position.set(mx, m.h / 2, mz);
      stone.rotation.y = i * 0.7;
      stone.castShadow = true;
      stone.receiveShadow = true;
      scene.add(stone);

      solidBoxes.push({
        minX: mx - 0.65,
        maxX: mx + 0.65,
        minZ: mz - 0.65,
        maxZ: mz + 0.65,
        minY: 0,
        maxY: m.h,
      });
    });
  }

  // Protected zones where procedural trees/rocks MUST NOT spawn
  const keepClearSpots: { x: number; z: number; r: number }[] = [
    { x: 0, z: 0, r: 7.5 }, // Central campfire clearing & spawn
    { x: perkPositions.juggernog.x, z: perkPositions.juggernog.z, r: 3.2 },
    { x: perkPositions.speedCola.x, z: perkPositions.speedCola.z, r: 3.2 },
    { x: perkPositions.doubleTap.x, z: perkPositions.doubleTap.z, r: 3.2 },
    { x: armoryChestPos.x, z: armoryChestPos.z, r: 3.4 },
    { x: ammoCratePos.x, z: ammoCratePos.z, r: 3.0 },
    { x: forestTeleporterPos.x, z: forestTeleporterPos.z, r: 4.5 },
    { x: -13.2, z: -13.2, r: 2.5 }, // Forest return spawn landing
    ...wallBuys.map((w) => ({ x: w.position.x, z: w.position.z, r: 3.6 })),
  ];

  const isClearSpot = (x: number, z: number, extraR: number) =>
    keepClearSpots.every((c) => Math.hypot(x - c.x, z - c.z) >= c.r + extraR);

  // Curated Playable-Zone Trees (with colliders) + Dense Grove
  const treeColors = ['#18341c', '#1e3c20', '#142a18', '#224224'];
  const obstacleCenters: { x: number; z: number; r: number }[] = [];

  for (let i = 0; i < 95 && obstacleCenters.length < 26; i++) {
    const ang = rand() * Math.PI * 2;
    const dist = 9.0 + rand() * 15.8;
    const tx = Math.cos(ang) * dist;
    const tz = Math.sin(ang) * dist;

    if (!isClearSpot(tx, tz, 1.4)) continue;
    if (obstacleCenters.some((o) => Math.hypot(tx - o.x, tz - o.z) < o.r + 2.4)) continue;

    const scale = 0.88 + rand() * 0.45;
    const col = treeColors[Math.floor(rand() * treeColors.length)];
    const tree = createPineTreeGroup(barkMat, col, scale, rand);
    tree.position.set(tx, 0, tz);
    scene.add(tree);

    const trunkRad = 0.46 * scale;
    solidBoxes.push({
      minX: tx - trunkRad,
      maxX: tx + trunkRad,
      minZ: tz - trunkRad,
      maxZ: tz + trunkRad,
      minY: 0,
      maxY: 4.0 * scale,
    });
    obstacleCenters.push({ x: tx, z: tz, r: 1.1 * scale });
  }

  // Playable-Zone Rock Boulder Clusters (with colliders)
  const rockCenters: { x: number; z: number; r: number }[] = [];
  for (let i = 0; i < 90 && rockCenters.length < 18; i++) {
    const ang = rand() * Math.PI * 2;
    const dist = 9.5 + rand() * 14.5;
    const rx = Math.cos(ang) * dist;
    const rz = Math.sin(ang) * dist;

    if (!isClearSpot(rx, rz, 1.8)) continue;
    if (obstacleCenters.some((o) => Math.hypot(rx - o.x, rz - o.z) < o.r + 2.1)) continue;
    if (rockCenters.some((o) => Math.hypot(rx - o.x, rz - o.z) < o.r + 2.5)) continue;

    const radius = 1.05 + rand() * 0.75;
    const boulder = createBoulderClusterGroup(forestRockMat, mossMat, radius, rand);
    boulder.position.set(rx, 0, rz);
    scene.add(boulder);

    const colHalf = radius * 0.92;
    solidBoxes.push({
      minX: rx - colHalf,
      maxX: rx + colHalf,
      minZ: rz - colHalf,
      maxZ: rz + colHalf,
      minY: 0,
      maxY: radius * 1.15,
    });
    rockCenters.push({ x: rx, z: rz, r: radius });
    obstacleCenters.push({ x: rx, z: rz, r: radius });
  }

  // Dense Outer Perimeter Pine Wall & Cliff Boulders (Natural boundary from r = 26m..46m)
  for (let i = 0; i < 54; i++) {
    const ang = (i / 54) * Math.PI * 2 + (rand() - 0.5) * 0.08;
    const dist = 26.8 + rand() * 16.0;
    const tx = Math.cos(ang) * dist;
    const tz = Math.sin(ang) * dist;
    const scale = 1.05 + rand() * 0.65;
    const col = treeColors[Math.floor(rand() * treeColors.length)];
    const tree = createPineTreeGroup(barkMat, col, scale, rand);
    tree.position.set(tx, 0, tz);
    scene.add(tree);

    if (i % 3 === 0) {
      const bRad = 1.6 + rand() * 1.2;
      const cliffRock = createBoulderClusterGroup(forestRockMat, mossMat, bRad, rand);
      cliffRock.position.set(Math.cos(ang + 0.05) * 26.6, 0, Math.sin(ang + 0.05) * 26.6);
      scene.add(cliffRock);
    }
  }

  // Zombie Spawners anchored RIGHT NEAR Trees & Rocks (never out in open center!)
  const combinedAnchors = [...rockCenters, ...obstacleCenters];
  for (const anchor of combinedAnchors) {
    if (zombieSpawners.length >= 12) break;
    const distFromCenter = Math.hypot(anchor.x, anchor.z);
    if (distFromCenter < 13.5) continue; // Keep spawns away from open center clearing

    // Pick a spot tucked just beside the tree/rock toward the outer woods side
    const outDirX = anchor.x / distFromCenter;
    const outDirZ = anchor.z / distFromCenter;
    const sx = anchor.x + outDirX * (anchor.r + 1.45);
    const sz = anchor.z + outDirZ * (anchor.r + 1.45);

    if (Math.hypot(sx, sz) > 24.4) continue;

    // Verify spawner doesn't overlap any solid box
    const blocked = solidBoxes.some(
      (b) => sx >= b.minX - 0.6 && sx <= b.maxX + 0.6 && sz >= b.minZ - 0.6 && sz <= b.maxZ + 0.6
    );
    if (blocked) continue;
    if (zombieSpawners.some((z) => Math.hypot(z.x - sx, z.z - sz) < 5.5)) continue;

    zombieSpawners.push(new THREE.Vector3(sx, 0, sz));
  }

  // Fallback guaranteed tree-edge spawners if procedural layout yielded fewer than 8
  if (zombieSpawners.length < 8) {
    const fallbackAngles = [0.2, 0.95, 1.7, 2.4, 3.2, 4.1, 4.9, 5.6];
    for (const a of fallbackAngles) {
      if (zombieSpawners.length >= 10) break;
      const sx = Math.cos(a) * 21.5;
      const sz = Math.sin(a) * 21.5;
      const blocked = solidBoxes.some(
        (b) => sx >= b.minX - 0.6 && sx <= b.maxX + 0.6 && sz >= b.minZ - 0.6 && sz <= b.maxZ + 0.6
      );
      if (!blocked) {
        zombieSpawners.push(new THREE.Vector3(sx, 0, sz));
      }
    }
  }

  // =========================================================================
  // ZONE 2: VOLCANIC LAVA CAVERN & PARKOUR TO HYPER-FORGE (centered at z = -200)
  // =========================================================================
  const lavaMaterial = new THREE.MeshStandardMaterial({
    map: lavaTex,
    emissiveMap: lavaTex,
    emissive: new THREE.Color('#ff5500'),
    emissiveIntensity: 1.5,
    roughness: 0.35,
    metalness: 0.1,
  });

  const lavaPlane = new THREE.Mesh(new THREE.PlaneGeometry(96, 104), lavaMaterial);
  lavaPlane.rotation.x = -Math.PI / 2;
  lavaPlane.position.set(0, -1.2, -200);
  scene.add(lavaPlane);

  // Warm Volcanic Glow Lights across the cavern
  const lavaLightPositions: [number, number, number, string, number][] = [
    [0, 3.5, -176, '#ff6622', 3.0],
    [-8, 3.0, -190, '#ff4500', 3.4],
    [8, 3.0, -200, '#ff5500', 3.4],
    [0, 4.8, -216, '#00f0ff', 2.8],
    [0, 10.0, -198, '#ff7733', 2.5],
  ];
  lavaLightPositions.forEach(([x, y, z, col, intensity]) => {
    const l = new THREE.PointLight(col, intensity, 42);
    l.position.set(x, y, z);
    scene.add(l);
    if (col !== '#00f0ff') lavaGlowLights.push(l);
  });

  // Helper to build a parkour rock platform whose visual stone cap matches solidBoxes AABB 1:1
  const addParkourPlatform = (cx: number, topY: number, cz: number, width: number, depth: number, isLargeLedge = false) => {
    const grp = new THREE.Group();
    const capH = 0.5;
    const cap = new THREE.Mesh(new THREE.BoxGeometry(width, capH, depth), basaltCapMat);
    cap.position.set(cx, topY - capH / 2, cz);
    cap.castShadow = true;
    cap.receiveShadow = true;
    grp.add(cap);

    // Glowing magma rim ring beneath top cap so jump target silhouettes read clearly over lava
    const rim = new THREE.Mesh(
      new THREE.BoxGeometry(width + 0.08, 0.1, depth + 0.08),
      emberCrackMat
    );
    rim.position.set(cx, topY - capH + 0.04, cz);
    grp.add(rim);

    // Tapered rugged obsidian spire shaft descending into lava
    const spireH = topY - capH + 1.6;
    const spireRTop = Math.min(width, depth) * 0.44;
    const spireRBot = spireRTop * (isLargeLedge ? 1.15 : 1.35);
    const spire = new THREE.Mesh(
      new THREE.CylinderGeometry(spireRTop, spireRBot, spireH, isLargeLedge ? 8 : 6),
      volcanicRockMat
    );
    spire.position.set(cx, -1.5 + spireH / 2, cz);
    spire.rotation.y = rand() * Math.PI;
    grp.add(spire);

    scene.add(grp);

    solidBoxes.push({
      minX: cx - width / 2,
      maxX: cx + width / 2,
      minZ: cz - depth / 2,
      maxZ: cz + depth / 2,
      minY: -1.6,
      maxY: topY,
    });
  };

  // 1. Arrival Platform at Z = -175 (6x6, maxY = 0)
  addParkourPlatform(0, 0.0, -175.0, 6.0, 6.0, true);
  const lavaArrivalSpawnPos = new THREE.Vector3(0, 1.6, -175.0);

  // Return Teleporter #1 on Arrival Platform
  const lavaArrivalTeleporterPos = new THREE.Vector3(-1.8, 0.0, -173.3);
  {
    const { group, ring } = createTeleporterPadMesh('#38bdf8', '#22d3ee');
    group.position.copy(lavaArrivalTeleporterPos);
    scene.add(group);
    teleporterRings.push(ring);
  }

  // 2. Jagged Parkour Stepping Rocks across the Lava (tuned for reliable walk/sprint jumps!)
  const parkourSteps: [number, number, number, number, number][] = [
    [-1.2, 0.25, -181.1, 2.8, 2.8],
    [1.4, 0.5, -184.9, 2.8, 2.8],
    [-1.1, 0.75, -188.6, 2.7, 2.7],
    [0.0, 1.0, -193.0, 3.4, 3.2], // Wide midpoint breather rock
    [2.3, 1.3, -197.2, 2.6, 2.6],
    [0.0, 1.6, -201.4, 2.6, 2.6],
    [-2.2, 1.9, -205.6, 2.7, 2.7],
    [0.0, 2.1, -209.7, 2.8, 2.7],
  ];
  parkourSteps.forEach(([x, topY, z, w, d]) => addParkourPlatform(x, topY, z, w, d, false));

  // 3. Hyper-Forge Altar Platform at Z = -216 (7.2 x 6.4, maxY = 2.2)
  addParkourPlatform(0, 2.2, -216.0, 7.2, 6.4, true);

  // Hyper-Forge Machine on the Altar Platform
  const hyperForgePos = new THREE.Vector3(0, 2.2, -217.9);
  {
    const grp = new THREE.Group();
    grp.position.copy(hyperForgePos);
    const papTex = createPackAPunchTexture();
    const frontMat = new THREE.MeshStandardMaterial({ map: papTex, roughness: 0.3 });
    const metalMat = new THREE.MeshStandardMaterial({ color: '#1c2432', roughness: 0.4, metalness: 0.75 });
    const base = new THREE.Mesh(new THREE.BoxGeometry(2.4, 2.8, 1.2), [
      metalMat, metalMat, metalMat, metalMat, frontMat, metalMat,
    ]);
    base.position.y = 1.4;
    base.castShadow = true;
    grp.add(base);

    const papLight = new THREE.PointLight('#00ffff', 3.0, 10);
    papLight.position.set(0, 2.0, 1.0);
    grp.add(papLight);
    scene.add(grp);

    solidBoxes.push({
      minX: hyperForgePos.x - 1.2,
      maxX: hyperForgePos.x + 1.2,
      minZ: hyperForgePos.z - 0.6,
      maxZ: hyperForgePos.z + 0.6,
      minY: 2.2,
      maxY: 5.0,
    });
  }

  // Return Teleporter #2 directly on Hyper-Forge Altar so player can warp right back to the forest
  const lavaAltarTeleporterPos = new THREE.Vector3(-2.3, 2.2, -214.6);
  {
    const { group, ring } = createTeleporterPadMesh('#38bdf8', '#22d3ee');
    group.position.copy(lavaAltarTeleporterPos);
    scene.add(group);
    teleporterRings.push(ring);
  }

  // Towering Volcanic Rocks, Magma Boulders & Jagged Cavern Walls around the Lava Sea
  for (let i = 0; i < 42; i++) {
    const ang = (i / 42) * Math.PI * 2 + (rand() - 0.5) * 0.1;
    const rx = Math.cos(ang) * (16 + rand() * 22);
    const rz = -196 + Math.sin(ang) * (24 + rand() * 18);

    // Keep clear of the parkour corridor & platforms
    if (Math.abs(rx) < 6.8 && rz > -223 && rz < -170) continue;

    const rockRadius = 1.8 + rand() * 2.8;
    const magmaRock = createBoulderClusterGroup(volcanicRockMat, null, rockRadius, rand, emberCrackMat);
    magmaRock.position.set(rx, -1.2, rz);
    scene.add(magmaRock);

    // Tall obsidian spires rising from the lava
    if (i % 2 === 0) {
      const spireH = 6.0 + rand() * 11.0;
      const spire = new THREE.Mesh(
        new THREE.ConeGeometry(rockRadius * 0.85, spireH, 6),
        volcanicRockMat
      );
      spire.position.set(rx, -1.2 + spireH / 2, rz);
      spire.rotation.y = rand() * Math.PI;
      scene.add(spire);
    }
  }

  // Overhead Volcanic Cavern Rock Arches for subterranean atmosphere
  for (let i = 0; i < 6; i++) {
    const zArch = -174 - i * 9.5;
    const arch = new THREE.Mesh(
      new THREE.TorusGeometry(24, 2.2, 6, 14, Math.PI),
      volcanicRockMat
    );
    arch.position.set(0, 6.5, zArch);
    arch.rotation.z = (rand() - 0.5) * 0.15;
    scene.add(arch);
  }

  return {
    solidBoxes,
    zombieSpawners,
    forestTeleporterPos,
    lavaArrivalTeleporterPos,
    lavaAltarTeleporterPos,
    lavaArrivalSpawnPos,
    forestReturnSpawnPos: new THREE.Vector3(-13.2, 1.6, -13.2),
    hyperForgePos,
    perkPositions,
    armoryChestPos,
    ammoCratePos,
    wallBuys,
    campfireLight,
    teleporterRings,
    lavaMaterial,
    lavaTexture: lavaTex,
    lavaGlowLights,
    playerSpawnPos: new THREE.Vector3(0, 1.6, 3.8),
    playerSpawnYaw: 0,
  };
}
