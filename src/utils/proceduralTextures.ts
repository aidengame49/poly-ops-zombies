import * as THREE from 'three';

/**
 * Creates procedural 2D Canvas textures for Three.js materials
 * Zero external 404 images!
 */

export function createFloorTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  // Base dark industrial concrete
  ctx.fillStyle = '#1a1f26';
  ctx.fillRect(0, 0, 512, 512);

  // Concrete grid tiles
  ctx.strokeStyle = '#0d1015';
  ctx.lineWidth = 4;
  const tileSize = 64;
  for (let x = 0; x <= 512; x += tileSize) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, 512);
    ctx.stroke();
  }
  for (let y = 0; y <= 512; y += tileSize) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(512, y);
    ctx.stroke();
  }

  // Fine speckle noise for concrete grain
  ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
  for (let i = 0; i < 3000; i++) {
    const rx = Math.random() * 512;
    const ry = Math.random() * 512;
    ctx.fillRect(rx, ry, 2, 2);
  }

  // Dark grime patches along tile edges
  ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
  for (let i = 0; i < 40; i++) {
    const cx = Math.random() * 512;
    const cy = Math.random() * 512;
    const rad = 10 + Math.random() * 25;
    ctx.beginPath();
    ctx.arc(cx, cy, rad, 0, Math.PI * 2);
    ctx.fill();
  }

  // Subtle seamless weathered wear
  const gradient = ctx.createRadialGradient(256, 256, 50, 256, 256, 256);
  gradient.addColorStop(0, 'rgba(255, 255, 255, 0.02)');
  gradient.addColorStop(1, 'rgba(0, 0, 0, 0.2)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 512, 512);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(6, 6);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export function createWallTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  // Base brick concrete (Lighter stone/brick)
  ctx.fillStyle = '#4a505b';
  ctx.fillRect(0, 0, 512, 512);

  // Brick pattern with distinct mortar
  const brickH = 32;
  const brickW = 64;

  for (let y = 0; y < 512; y += brickH) {
    const offset = (y / brickH) % 2 === 0 ? 0 : brickW / 2;

    for (let x = offset - brickW; x < 512 + brickW; x += brickW) {
      // Slight color variation per brick
      const shade = Math.floor(Math.random() * 25);
      ctx.fillStyle = `rgb(${65 + shade}, ${70 + shade}, ${80 + shade})`;
      ctx.fillRect(x + 2, y + 2, brickW - 4, brickH - 4);

      // Brick top highlight
      ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
      ctx.fillRect(x + 2, y + 2, brickW - 4, 3);
    }
  }

  // Mortar lines
  ctx.strokeStyle = '#22262d';
  ctx.lineWidth = 4;
  for (let y = 0; y <= 512; y += brickH) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(512, y);
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(4, 2);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export function createWoodPlankTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;

  // Base wood brown
  ctx.fillStyle = '#8b5a2b';
  ctx.fillRect(0, 0, 256, 64);

  // Wood grain lines
  ctx.strokeStyle = '#5c3a1b';
  ctx.lineWidth = 2;
  for (let i = 0; i < 15; i++) {
    const y = Math.random() * 64;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.bezierCurveTo(80, y + (Math.random() * 8 - 4), 160, y + (Math.random() * 8 - 4), 256, y);
    ctx.stroke();
  }

  // Metallic nail heads at edges
  ctx.fillStyle = '#333333';
  ctx.beginPath();
  ctx.arc(15, 32, 4, 0, Math.PI * 2);
  ctx.arc(241, 32, 4, 0, Math.PI * 2);
  ctx.fill();

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export function createPerkMachineTexture(type: 'juggernog' | 'speedCola' | 'doubleTap'): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  const mainColor = type === 'juggernog' ? '#cc1111' : type === 'speedCola' ? '#11cc44' : '#eeaa11';
  const logoText = type === 'juggernog' ? 'TITAN TONIC' : type === 'speedCola' ? 'BLITZ BREW' : 'FURY FIZZ';

  ctx.fillStyle = mainColor;
  ctx.fillRect(0, 0, 256, 256);

  // Outer border & metallic frame
  ctx.strokeStyle = '#111111';
  ctx.lineWidth = 12;
  ctx.strokeRect(6, 6, 244, 244);

  // Glowing center circle
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(128, 110, 60, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#111';
  ctx.lineWidth = 6;
  ctx.stroke();

  // Draw Icon
  ctx.fillStyle = mainColor;
  if (type === 'juggernog') {
    // Red Cross + Armor Shield
    ctx.fillRect(118, 70, 20, 80);
    ctx.fillRect(88, 100, 80, 20);
  } else if (type === 'speedCola') {
    // Lightning bolt
    ctx.beginPath();
    ctx.moveTo(135, 65);
    ctx.lineTo(105, 115);
    ctx.lineTo(130, 115);
    ctx.lineTo(120, 155);
    ctx.lineTo(150, 105);
    ctx.lineTo(125, 105);
    ctx.closePath();
    ctx.fill();
  } else {
    // Double Bullets
    ctx.fillRect(105, 75, 16, 60);
    ctx.fillRect(135, 75, 16, 60);
  }

  // Text label banner
  ctx.fillStyle = '#111111';
  ctx.fillRect(16, 190, 224, 45);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 22px "Rajdhani", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(logoText, 128, 220);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export function createPackAPunchTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  // Dark industrial blued steel base
  ctx.fillStyle = '#1c232e';
  ctx.fillRect(0, 0, 512, 512);

  // Outer dark iron frame
  ctx.strokeStyle = '#0f141d';
  ctx.lineWidth = 16;
  ctx.strokeRect(16, 16, 480, 480);

  // Steel panels with bevel lines
  ctx.fillStyle = '#26303f';
  ctx.fillRect(32, 32, 448, 448);
  ctx.strokeStyle = '#121822';
  ctx.lineWidth = 4;
  ctx.strokeRect(40, 40, 432, 432);

  // Brass bolts at corners
  ctx.fillStyle = '#b8860b';
  [
    [50, 50], [462, 50], [50, 462], [462, 462],
    [256, 50], [256, 462], [50, 256], [462, 256]
  ].forEach(([x, y]) => {
    ctx.beginPath();
    ctx.arc(x, y, 8, 0, Math.PI * 2);
    ctx.fill();
  });

  // Top header plaque "HYPER-FORGE"
  ctx.fillStyle = '#0d131c';
  ctx.fillRect(60, 50, 392, 60);
  ctx.strokeStyle = '#b8860b';
  ctx.lineWidth = 4;
  ctx.strokeRect(60, 50, 392, 60);

  ctx.fillStyle = '#00f0ff';
  ctx.font = 'bold 32px "Rajdhani", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('HYPER-FORGE', 256, 92);

  // Center mechanical upgrading slot frame
  ctx.fillStyle = '#090d14';
  ctx.fillRect(100, 160, 312, 280);
  ctx.strokeStyle = '#3a4a60';
  ctx.lineWidth = 6;
  ctx.strokeRect(100, 160, 312, 280);

  // Mechanical gears texture inside slot
  ctx.strokeStyle = '#b8860b';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(256, 300, 70, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = '#00f0ff';
  ctx.font = 'bold 24px "Rajdhani", sans-serif';
  ctx.fillText('5000 PTS', 256, 308);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export function createMysteryBoxTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  // Deep rich dark oak wood base
  ctx.fillStyle = '#3b2210';
  ctx.fillRect(0, 0, 512, 256);

  // Horizontal wood plank lines
  ctx.strokeStyle = '#221308';
  ctx.lineWidth = 4;
  for (let y = 0; y <= 256; y += 64) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(512, y);
    ctx.stroke();
  }

  // Wrought iron / brass metal straps & corners
  ctx.fillStyle = '#222830';
  ctx.fillRect(25, 0, 35, 256);
  ctx.fillRect(452, 0, 35, 256);

  ctx.fillStyle = '#b8860b'; // Brass rivets
  [
    [42, 30], [42, 96], [42, 160], [42, 224],
    [470, 30], [470, 96], [470, 160], [470, 224]
  ].forEach(([x, y]) => {
    ctx.beginPath();
    ctx.arc(x, y, 6, 0, Math.PI * 2);
    ctx.fill();
  });

  // Center Brass Question Mark Emblem Disc
  ctx.fillStyle = '#222830';
  ctx.beginPath();
  ctx.arc(256, 128, 48, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#b8860b';
  ctx.lineWidth = 4;
  ctx.stroke();

  ctx.fillStyle = '#ffcc00';
  ctx.font = 'bold 54px "Rajdhani", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('?', 256, 146);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export function createWallBuyChalkTexture(name: string, price: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  // Dark iron wall plaque base
  ctx.fillStyle = '#121620';
  ctx.fillRect(0, 0, 512, 256);

  // Border frame
  ctx.strokeStyle = '#384456';
  ctx.lineWidth = 8;
  ctx.strokeRect(8, 8, 496, 240);

  // White chalk outline box for mounting the 3D gun in upper half (y: 20 to 135)
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
  ctx.lineWidth = 3;
  ctx.setLineDash([8, 6]);
  ctx.strokeRect(30, 20, 452, 115);
  ctx.setLineDash([]);

  // Solid dark background banner for weapon name & price below chalk box (y: 145 to 235)
  ctx.fillStyle = '#0a0d14';
  ctx.fillRect(30, 145, 452, 90);
  ctx.strokeStyle = '#eab308';
  ctx.lineWidth = 2;
  ctx.strokeRect(30, 145, 452, 90);

  // Weapon text & price
  ctx.fillStyle = '#38bdf8';
  ctx.font = 'bold 30px "Rajdhani", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(name.toUpperCase(), 256, 180);

  ctx.fillStyle = '#eab308';
  ctx.font = 'bold 22px "Rajdhani", sans-serif';
  ctx.fillText(`BUY FOR ${price.toLocaleString()} PTS`, 256, 218);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

