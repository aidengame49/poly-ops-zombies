import * as THREE from 'three';

export interface RemotePlayerRig {
  playerId: string;
  displayName: string;
  root: THREE.Group;
  bodyGroup: THREE.Group;
  headGroup: THREE.Group;
  armR: THREE.Group;
  armL: THREE.Group;
  legL: THREE.Group;
  legR: THREE.Group;
  weaponMount: THREE.Group;
  flashlightCone: THREE.Mesh;
  muzzleFlash: THREE.PointLight;
  nameSprite: THREE.Sprite;
  nameCanvas: HTMLCanvasElement;
  nameCtx: CanvasRenderingContext2D;
  nameTexture: THREE.CanvasTexture;
  currentWeaponId: string;
  currentIsPap: boolean;
  lastHpDrawn: number;
  lastMaxHpDrawn: number;
  lastDownedDrawn: boolean;
  lastNameDrawn: string;
  targetPos: THREE.Vector3;
  targetYaw: number;
  targetPitch: number;
  isDowned: boolean;
  isMoving: boolean;
  isFlashlightOn: boolean;
  hp: number;
  maxHp: number;
  score: number;
  kills: number;
  walkCycle: number;
}

const SQUAD_COLORS = ['#38bdf8', '#34d399', '#f59e0b', '#c084fc'];

export function createRemotePlayerRig(
  playerId: string,
  displayName: string,
  weaponId: string,
  isPap: boolean,
  colorIndex: number,
  buildWeaponFn: (id: string, pap: boolean) => THREE.Group
): RemotePlayerRig {
  const accentColor = SQUAD_COLORS[colorIndex % SQUAD_COLORS.length];
  const root = new THREE.Group();
  const bodyGroup = new THREE.Group();
  root.add(bodyGroup);

  const vestMat = new THREE.MeshStandardMaterial({ color: '#26303d', roughness: 0.75, metalness: 0.25 });
  const armorMat = new THREE.MeshStandardMaterial({ color: '#171d26', roughness: 0.55, metalness: 0.5 });
  const skinMat = new THREE.MeshStandardMaterial({ color: '#c69b7b', roughness: 0.75 });
  const visorMat = new THREE.MeshBasicMaterial({ color: accentColor });

  // Torso / Tactical Vest
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.64, 0.72, 0.36), vestMat);
  torso.position.y = 1.08;
  torso.castShadow = true;
  bodyGroup.add(torso);

  const shoulderAccentL = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.14, 0.38), new THREE.MeshStandardMaterial({ color: accentColor, roughness: 0.4 }));
  shoulderAccentL.position.set(-0.34, 1.34, 0);
  const shoulderAccentR = shoulderAccentL.clone();
  shoulderAccentR.position.set(0.34, 1.34, 0);
  bodyGroup.add(shoulderAccentL, shoulderAccentR);

  // Head + Helmet + Glowing Tactical Visor (facing -Z forward like player camera)
  const headGroup = new THREE.Group();
  headGroup.position.set(0, 1.62, 0);
  bodyGroup.add(headGroup);

  const skull = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.34, 0.34), skinMat);
  skull.castShadow = true;
  headGroup.add(skull);

  const helmet = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.22, 0.42), armorMat);
  helmet.position.y = 0.12;
  helmet.castShadow = true;
  headGroup.add(helmet);

  const visor = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.1, 0.05), visorMat);
  visor.position.set(0, 0.03, -0.19);
  headGroup.add(visor);

  // Flashlight Cone Mesh (lightweight volumetric beam visible to teammates)
  const coneGeo = new THREE.ConeGeometry(0.85, 6.5, 12, 1, true);
  coneGeo.rotateX(-Math.PI / 2);
  coneGeo.translate(0, 0, -3.45);
  const coneMat = new THREE.MeshBasicMaterial({
    color: '#dff4ff',
    transparent: true,
    opacity: 0.09,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const flashlightCone = new THREE.Mesh(coneGeo, coneMat);
  flashlightCone.position.set(0.18, -0.05, -0.1);
  headGroup.add(flashlightCone);

  // Arms & Weapon Mount
  const armL = new THREE.Group();
  armL.position.set(-0.4, 1.32, -0.04);
  const armLMesh = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.5, 0.18), vestMat);
  armLMesh.position.set(0, -0.18, -0.14);
  armLMesh.rotation.x = Math.PI / 3;
  armL.add(armLMesh);
  bodyGroup.add(armL);

  const armR = new THREE.Group();
  armR.position.set(0.36, 1.3, -0.08);
  const armRMesh = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.48, 0.18), vestMat);
  armRMesh.position.set(0, -0.14, -0.14);
  armRMesh.rotation.x = Math.PI / 2.4;
  armR.add(armRMesh);
  bodyGroup.add(armR);

  const weaponMount = new THREE.Group();
  weaponMount.position.set(-0.04, -0.08, -0.35);
  armR.add(weaponMount);
  const wepMesh = buildWeaponFn(weaponId, isPap);
  wepMesh.scale.set(0.85, 0.85, 0.85);
  weaponMount.add(wepMesh);

  const muzzleFlash = new THREE.PointLight('#ffaa33', 0, 7);
  muzzleFlash.position.set(0, 0.05, -0.7);
  weaponMount.add(muzzleFlash);

  // Legs
  const legL = new THREE.Group();
  legL.position.set(-0.16, 0.7, 0);
  const legLMesh = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.7, 0.24), armorMat);
  legLMesh.position.y = -0.35;
  legLMesh.castShadow = true;
  legL.add(legLMesh);
  bodyGroup.add(legL);

  const legR = new THREE.Group();
  legR.position.set(0.16, 0.7, 0);
  const legRMesh = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.7, 0.24), armorMat);
  legRMesh.position.y = -0.35;
  legRMesh.castShadow = true;
  legR.add(legRMesh);
  bodyGroup.add(legR);

  // Floating Nameplate + Health Bar Sprite
  const nameCanvas = document.createElement('canvas');
  nameCanvas.width = 320;
  nameCanvas.height = 84;
  const nameCtx = nameCanvas.getContext('2d')!;
  const nameTexture = new THREE.CanvasTexture(nameCanvas);
  const spriteMat = new THREE.SpriteMaterial({ map: nameTexture, transparent: true, depthTest: false });
  const nameSprite = new THREE.Sprite(spriteMat);
  nameSprite.position.set(0, 2.25, 0);
  nameSprite.scale.set(1.9, 0.5, 1);
  root.add(nameSprite);

  const rig: RemotePlayerRig = {
    playerId,
    displayName,
    root,
    bodyGroup,
    headGroup,
    armR,
    armL,
    legL,
    legR,
    weaponMount,
    flashlightCone,
    muzzleFlash,
    nameSprite,
    nameCanvas,
    nameCtx,
    nameTexture,
    currentWeaponId: weaponId,
    currentIsPap: isPap,
    lastHpDrawn: -1,
    lastMaxHpDrawn: -1,
    lastDownedDrawn: false,
    lastNameDrawn: '',
    targetPos: new THREE.Vector3(0, 0, 0),
    targetYaw: 0,
    targetPitch: 0,
    isDowned: false,
    isMoving: false,
    isFlashlightOn: true,
    hp: 100,
    maxHp: 100,
    score: 500,
    kills: 0,
    walkCycle: 0,
  };

  redrawNameplate(rig, accentColor);
  return rig;
}

export function redrawNameplate(rig: RemotePlayerRig, accentColor: string = '#38bdf8') {
  if (
    rig.lastHpDrawn === rig.hp &&
    rig.lastMaxHpDrawn === rig.maxHp &&
    rig.lastDownedDrawn === rig.isDowned &&
    rig.lastNameDrawn === rig.displayName
  ) {
    return;
  }
  rig.lastHpDrawn = rig.hp;
  rig.lastMaxHpDrawn = rig.maxHp;
  rig.lastDownedDrawn = rig.isDowned;
  rig.lastNameDrawn = rig.displayName;

  const { nameCtx: ctx, nameCanvas: canvas } = rig;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Pill background
  ctx.fillStyle = rig.isDowned ? 'rgba(127, 29, 29, 0.88)' : 'rgba(15, 23, 42, 0.82)';
  ctx.strokeStyle = rig.isDowned ? '#ef4444' : accentColor;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.roundRect(12, 8, canvas.width - 24, canvas.height - 16, 14);
  ctx.fill();
  ctx.stroke();

  // Name + Numeric ID tag
  ctx.font = 'bold 22px Rajdhani, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillStyle = rig.isDowned ? '#fecaca' : '#f8fafc';
  const label = rig.isDowned ? `DOWNED • ${rig.displayName}` : `${rig.displayName}`;
  ctx.fillText(label.slice(0, 22), canvas.width / 2, 38);

  // Health Bar
  const barW = 220;
  const barH = 12;
  const barX = (canvas.width - barW) / 2;
  const barY = 50;
  ctx.fillStyle = '#020617';
  ctx.fillRect(barX, barY, barW, barH);

  const pct = rig.isDowned ? 0 : Math.max(0, Math.min(1, rig.hp / Math.max(1, rig.maxHp)));
  ctx.fillStyle = rig.isDowned ? '#ef4444' : pct > 0.5 ? '#10b981' : pct > 0.25 ? '#f59e0b' : '#ef4444';
  ctx.fillRect(barX + 2, barY + 2, (barW - 4) * pct, barH - 4);

  rig.nameTexture.needsUpdate = true;
}

export function disposeRemotePlayerRig(rig: RemotePlayerRig) {
  rig.nameTexture.dispose();
  (rig.nameSprite.material as THREE.Material).dispose();
}
