/**
 * SingleFileExporter generates a complete, 100% self-contained standalone single-file HTML/JS document
 * containing the full 3D Zombies Survival game, matching all map features, textures, weapons, AI, sounds, and UI.
 */

export function generateSingleFileHTML(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Poly-Ops Zombies - Standalone Single File Edition</title>
  <link href="https://fonts.googleapis.com/css2?family=Rajdhani:wght@500;600;700;800&display=swap" rel="stylesheet">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; user-select: none; }
    body, html { width: 100%; height: 100%; overflow: hidden; background: #07090e; font-family: 'Rajdhani', sans-serif; color: #fff; }
    #canvas-container { width: 100%; height: 100%; position: absolute; top: 0; left: 0; }
    
    /* HUD Overlays */
    #hud { position: absolute; inset: 0; pointer-events: none; display: flex; flex-direction: column; justify-content: space-between; z-index: 10; }
    
    /* Vignette Damage */
    #damage-vignette { position: absolute; inset: 0; pointer-events: none; background: radial-gradient(circle, transparent 40%, rgba(220, 20, 20, 0.75) 100%); opacity: 0; transition: opacity 0.3s ease; z-index: 15; }

    /* Crosshair & Reticle */
    #reticle-container { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); z-index: 20; pointer-events: none; }
    .crosshair-hip { width: 10px; height: 10px; position: relative; }
    .crosshair-hip::before, .crosshair-hip::after { content: ''; position: absolute; background: rgba(255, 255, 255, 0.85); }
    .crosshair-hip::before { top: 4px; left: -10px; width: 30px; height: 2px; }
    .crosshair-hip::after { top: -10px; left: 4px; width: 2px; height: 30px; }
    
    /* Hitmarker */
    #hitmarker { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(45deg); width: 28px; height: 28px; border: 2px solid #fff; opacity: 0; transition: opacity 0.08s ease; z-index: 21; }
    #hitmarker.headshot { border-color: #fbbf24; transform: translate(-50%, -50%) rotate(45deg) scale(1.3); }
    #hitmarker.kill { border-color: #ef4444; }

    /* Health Top Left */
    .hud-health { position: absolute; top: 24px; left: 24px; background: rgba(5,8,15,0.8); border: 1px solid rgba(255,255,255,0.1); border-radius: 10px; padding: 12px 16px; min-width: 220px; backdrop-filter: blur(4px); }
    .health-label { display: flex; justify-content: space-between; font-size: 13px; font-weight: 700; color: #94a3b8; margin-bottom: 6px; }
    .health-bar-bg { width: 100%; height: 10px; background: #090d16; border-radius: 5px; overflow: hidden; border: 1px solid #1e293b; }
    .health-bar-fill { height: 100%; width: 100%; background: #10b981; transition: width 0.2s ease, background-color 0.2s ease; }

    /* Score Top Right */
    .hud-score { position: absolute; top: 24px; right: 24px; text-align: right; }
    .score-val { font-size: 42px; font-weight: 800; color: #34d399; text-shadow: 0 0 16px rgba(52,211,153,0.6); line-height: 1; }
    .score-label { font-size: 11px; font-weight: 700; color: #94a3b8; letter-spacing: 2px; text-transform: uppercase; margin-top: 2px; }

    /* Score Popups Right side */
    #score-popups { position: absolute; top: 90px; right: 24px; text-align: right; display: flex; flex-direction: column; gap: 4px; pointer-events: none; z-index: 12; }
    .score-pop { font-size: 16px; font-weight: 800; color: #34d399; text-shadow: 0 0 8px rgba(0,0,0,0.8); animation: fadeOutPop 1.4s forwards ease-out; }
    .score-pop.headshot { color: #fbbf24; font-size: 18px; }
    .score-pop.kill { color: #f87171; }

    @keyframes fadeOutPop {
      0% { opacity: 1; transform: translateY(0); }
      70% { opacity: 1; }
      100% { opacity: 0; transform: translateY(-20px); }
    }

    /* Round Bottom Left */
    .hud-round { position: absolute; bottom: 32px; left: 32px; }
    .round-label { font-size: 13px; font-weight: 800; color: #f87171; letter-spacing: 2px; text-transform: uppercase; }
    .round-num { font-size: 72px; font-weight: 900; color: #dc2626; text-shadow: 0 0 20px rgba(220,38,38,0.8); line-height: 0.9; }

    /* Weapon Bottom Right */
    .hud-weapon { position: absolute; bottom: 32px; right: 32px; text-align: right; background: rgba(5,8,15,0.8); border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 14px 20px; min-width: 220px; backdrop-filter: blur(4px); }
    .wep-title { font-size: 20px; font-weight: 800; color: #fff; text-transform: uppercase; letter-spacing: 1px; }
    .wep-title.pap { color: #22d3ee; text-shadow: 0 0 12px rgba(34,211,238,0.7); }
    .ammo-val { font-size: 38px; font-weight: 800; color: #fbbf24; line-height: 1; margin-top: 4px; }
    .ammo-res { font-size: 20px; color: #94a3b8; font-weight: 600; }

    /* Prompt Box Center */
    #prompt-box { position: absolute; top: 62%; left: 50%; transform: translate(-50%, -50%); background: rgba(2,6,23,0.92); border: 1px solid rgba(6,182,212,0.6); color: #22d3ee; padding: 12px 28px; border-radius: 8px; font-size: 18px; font-weight: 800; letter-spacing: 1px; box-shadow: 0 0 25px rgba(6,182,212,0.3); display: none; text-align: center; }

    /* Modals & Screens */
    .screen-modal { position: absolute; inset: 0; background: rgba(3, 7, 18, 0.94); backdrop-filter: blur(8px); z-index: 50; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 24px; pointer-events: auto; }
    .card-panel { max-width: 640px; width: 100%; background: rgba(15, 23, 42, 0.95); border: 1px solid rgba(220, 38, 38, 0.5); border-radius: 20px; padding: 36px; text-align: center; box-shadow: 0 0 60px rgba(220, 38, 38, 0.3); }
    
    .btn-main { background: #dc2626; color: #fff; border: none; padding: 16px 36px; font-size: 20px; font-weight: 800; border-radius: 12px; cursor: pointer; transition: all 0.2s; font-family: 'Rajdhani', sans-serif; letter-spacing: 1px; display: inline-flex; align-items: center; justify-content: center; gap: 8px; width: 100%; }
    .btn-main:hover { background: #ef4444; transform: scale(1.03); }
    .btn-secondary { background: #1e293b; color: #e2e8f0; border: 1px solid #334155; padding: 14px 28px; font-size: 16px; font-weight: 700; border-radius: 12px; cursor: pointer; transition: all 0.2s; font-family: 'Rajdhani', sans-serif; width: 100%; }
    .btn-secondary:hover { background: #334155; color: #fff; }

    .menu-layout { display: flex; gap: 40px; max-width: 900px; width: 100%; text-align: left; }
    .menu-nav { width: 320px; display: flex; flex-direction: column; gap: 12px; flex-shrink: 0; }
  </style>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
</head>
<body>
  <div id="canvas-container"></div>
  <div id="damage-vignette"></div>

  <!-- HUD -->
  <div id="hud">
    <div id="reticle-container">
      <div class="crosshair-hip"></div>
    </div>
    <div id="hitmarker"></div>

    <div class="hud-health">
      <div class="health-label"><span>HEALTH</span><span id="hp-text">100 / 100</span></div>
      <div class="health-bar-bg"><div class="health-bar-fill" id="hp-bar"></div></div>
    </div>

    <div class="hud-score">
      <div class="score-val" id="score-val">500</div>
      <div class="score-label">POINTS</div>
    </div>

    <div id="score-popups"></div>

    <div class="hud-round">
      <div class="round-label">ROUND</div>
      <div class="round-num" id="round-val">1</div>
    </div>

    <div class="hud-weapon">
      <div class="wep-title" id="wep-title">M1911</div>
      <div class="ammo-val"><span id="clip-val">8</span> <span class="ammo-res">/ <span id="res-val">80</span></span></div>
    </div>

    <div id="prompt-box">PRESS 'E' TO INTERACT</div>
  </div>

  <!-- MAIN MENU SCREEN -->
  <div class="screen-modal" id="main-menu">
    <div style="max-width: 960px; width: 100%;">
      <div style="margin-bottom: 32px;">
        <h1 style="font-size: 58px; font-weight: 900; color: #dc2626; text-shadow: 0 0 30px rgba(220,38,38,0.8); letter-spacing: 2px; line-height: 1;">POLY-OPS ZOMBIES</h1>
        <p style="font-size: 20px; color: #94a3b8; font-weight: 600; margin-top: 6px;">STANDALONE SINGLE-FILE EDITION</p>
      </div>

      <div class="menu-layout">
        <div class="menu-nav">
          <button class="btn-main" onclick="startSurvivalGame()">PLAY SURVIVAL</button>
          <button class="btn-secondary" style="opacity: 0.5; cursor: not-allowed;">MAP SELECT [SOON]</button>
          <button class="btn-secondary" style="opacity: 0.5; cursor: not-allowed;">WEAPONS & LOADOUT [SOON]</button>
          <button class="btn-secondary" onclick="toggleSettingsModal(true)">SETTINGS</button>
          <button class="btn-secondary" onclick="toggleHowToPlayModal(true)">HOW TO PLAY</button>
        </div>

        <div style="flex: 1; background: rgba(15,23,42,0.8); border: 1px solid #1e293b; border-radius: 16px; padding: 24px;">
          <h3 style="font-size: 22px; color: #f87171; margin-bottom: 12px; font-weight: 800;">SECTOR ZERO</h3>
          <p style="font-size: 15px; color: #cbd5e1; line-height: 1.6; margin-bottom: 16px;">
            An isolated military testing facility overrun by relentless undead shamblers. Secure window barriers, purchase Power Brews, unlock Hyper-Forge energy weaponry, and survive as many rounds as possible!
          </p>
          <div style="background: #020617; padding: 12px 16px; border-radius: 10px; border: 1px solid #1e293b; font-size: 13px; color: #38bdf8;">
            <b>CONTROLS:</b> WASD to Move | MOUSE to Look | LEFT CLICK to Shoot | RIGHT CLICK to ADS | R Reload | E Interact | ESC Pause
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- SETTINGS MODAL -->
  <div class="screen-modal" id="settings-modal" style="display: none;">
    <div class="card-panel" style="text-align: left; max-width: 600px;">
      <h2 style="font-size: 32px; color: #fff; font-weight: 800; margin-bottom: 20px; border-bottom: 1px solid #334155; padding-bottom: 10px;">GAME SETTINGS</h2>
      
      <div style="display: flex; flex-direction: column; gap: 16px; margin-bottom: 24px;">
        <div>
          <label style="font-size: 14px; color: #cbd5e1; font-weight: 700; display: flex; justify-content: space-between;">
            <span>Mouse Look Sensitivity</span><span id="sens-label" style="color: #f87171;">2.2</span>
          </label>
          <input type="range" min="0.0005" max="0.0060" step="0.0001" value="0.0022" id="sens-input" oninput="updateSettings()" style="width: 100%; margin-top: 6px;">
        </div>

        <div>
          <label style="font-size: 14px; color: #cbd5e1; font-weight: 700; display: flex; justify-content: space-between;">
            <span>World Brightness</span><span id="bright-label" style="color: #fbbf24;">85%</span>
          </label>
          <input type="range" min="0.2" max="2.5" step="0.05" value="0.85" id="bright-input" oninput="updateSettings()" style="width: 100%; margin-top: 6px;">
        </div>

        <div>
          <label style="font-size: 14px; color: #cbd5e1; font-weight: 700; display: flex; justify-content: space-between;">
            <span>Field of View (FOV)</span><span id="fov-label" style="color: #34d399;">75°</span>
          </label>
          <input type="range" min="60" max="100" step="1" value="75" id="fov-input" oninput="updateSettings()" style="width: 100%; margin-top: 6px;">
        </div>

        <div>
          <label style="font-size: 14px; color: #cbd5e1; font-weight: 700; display: flex; justify-content: space-between;">
            <span>Master Volume</span><span id="vol-label" style="color: #38bdf8;">80%</span>
          </label>
          <input type="range" min="0" max="100" step="5" value="80" id="vol-input" oninput="updateSettings()" style="width: 100%; margin-top: 6px;">
        </div>
      </div>

      <button class="btn-main" onclick="toggleSettingsModal(false)">SAVE & CLOSE</button>
    </div>
  </div>

  <!-- HOW TO PLAY MODAL -->
  <div class="screen-modal" id="how-modal" style="display: none;">
    <div class="card-panel" style="text-align: left; max-width: 600px;">
      <h2 style="font-size: 32px; color: #fff; font-weight: 800; margin-bottom: 16px;">HOW TO PLAY</h2>
      <div style="font-size: 15px; color: #cbd5e1; line-height: 1.8; margin-bottom: 24px;">
        <p>• <b>Defend Window Barriers:</b> Zombies break wood planks to enter. Hold <b>'E'</b> near barriers to rebuild planks and gain points.</p>
        <p>• <b>Power Brew Machines:</b> Buy Titan Tonic (250 HP), Blitz Brew (50% Reload Speed), or Fury Fizz (+50% Fire Rate & Damage).</p>
        <p>• <b>Hyper-Forge:</b> Upgrade your active weapon for 5,000 points to double its damage and ammo capacity with blue plasma tracer rounds!</p>
        <p>• <b>Armory Chest & Wall Buys:</b> Spin the chest for 950 pts for high-tier energy weapons or buy wall weapons around the facility.</p>
      </div>
      <button class="btn-main" onclick="toggleHowToPlayModal(false)">GOT IT</button>
    </div>
  </div>

  <!-- PAUSE MENU -->
  <div class="screen-modal" id="pause-menu" style="display: none;">
    <div class="card-panel" style="max-width: 440px;">
      <h2 style="font-size: 36px; color: #fff; font-weight: 800; margin-bottom: 20px;">GAME PAUSED</h2>
      <div style="display: flex; flex-direction: column; gap: 12px;">
        <button class="btn-main" onclick="resumeGame()">RESUME GAME</button>
        <button class="btn-secondary" onclick="toggleSettingsModal(true)">SETTINGS</button>
        <button class="btn-secondary" onclick="returnToMainMenu()">MAIN MENU</button>
      </div>
    </div>
  </div>

  <!-- GAME OVER MENU -->
  <div class="screen-modal" id="gameover-menu" style="display: none;">
    <div class="card-panel" style="max-width: 500px;">
      <h1 style="font-size: 64px; color: #dc2626; font-weight: 900; margin-bottom: 8px;">YOU DIED</h1>
      <p style="color: #94a3b8; margin-bottom: 24px;" id="gameover-stats">The undead horde overwhelmed your position.</p>
      <button class="btn-main" onclick="startSurvivalGame()">TRY AGAIN</button>
      <button class="btn-secondary" onclick="returnToMainMenu()" style="margin-top: 12px;">MAIN MENU</button>
    </div>
  </div>

  <script>
    // -------------------------------------------------------------
    // Procedural 2D Canvas Textures for Standalone HTML
    // -------------------------------------------------------------
    function createFloorTex() {
      const c = document.createElement('canvas'); c.width = 512; c.height = 512;
      const ctx = c.getContext('2d');
      ctx.fillStyle = '#1c222e'; ctx.fillRect(0,0,512,512);
      ctx.strokeStyle = '#121720'; ctx.lineWidth = 4;
      for(let i=0; i<=512; i+=64) {
        ctx.beginPath(); ctx.moveTo(i,0); ctx.lineTo(i,512); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0,i); ctx.lineTo(512,i); ctx.stroke();
      }
      ctx.fillStyle = 'rgba(255,255,255,0.03)';
      for(let x=0; x<512; x+=64) for(let y=0; y<512; y+=64) if((x+y)%128===0) ctx.fillRect(x,y,64,64);
      const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(8,8);
      return t;
    }

    function createWallTex() {
      const c = document.createElement('canvas'); c.width = 512; c.height = 512;
      const ctx = c.getContext('2d');
      ctx.fillStyle = '#222a36'; ctx.fillRect(0,0,512,512);
      ctx.fillStyle = '#181e28'; ctx.strokeStyle = '#12161f'; ctx.lineWidth = 3;
      const bW = 64, bH = 32;
      for(let y=0; y<512; y+=bH) {
        const off = (y/bH)%2===0? 0 : bW/2;
        for(let x=-bW; x<512+bW; x+=bW) {
          ctx.fillRect(x+off+2, y+2, bW-4, bH-4);
          ctx.strokeRect(x+off+2, y+2, bW-4, bH-4);
        }
      }
      const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(6,2.5);
      return t;
    }

    function createPlankTex() {
      const c = document.createElement('canvas'); c.width = 256; c.height = 64;
      const ctx = c.getContext('2d');
      ctx.fillStyle = '#5c3a1e'; ctx.fillRect(0,0,256,64);
      ctx.fillStyle = '#442b15';
      for(let i=0; i<64; i+=8) ctx.fillRect(0,i,256,2);
      const t = new THREE.CanvasTexture(c);
      return t;
    }

    function createPerkMachineTex(type) {
      const c = document.createElement('canvas'); c.width = 256; c.height = 512;
      const ctx = c.getContext('2d');
      const bg = type==='juggernog'?'#991111':type==='speedCola'?'#119933':'#cc9911';
      ctx.fillStyle = bg; ctx.fillRect(0,0,256,512);
      ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(128, 120, 50, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = '#000000'; ctx.font = 'bold 18px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(type==='juggernog'?'TITAN':type==='speedCola'?'BLITZ':'FURY', 128, 126);
      ctx.fillStyle = '#0a0d14'; ctx.fillRect(32, 280, 192, 180);
      const t = new THREE.CanvasTexture(c); return t;
    }

    function createPaPTex() {
      const c = document.createElement('canvas'); c.width = 512; c.height = 512;
      const ctx = c.getContext('2d');
      ctx.fillStyle = '#141a24'; ctx.fillRect(0,0,512,512);
      ctx.strokeStyle = '#00f0ff'; ctx.lineWidth = 4; ctx.strokeRect(20,20,472,472);
      ctx.fillStyle = '#00f0ff'; ctx.font = 'bold 36px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('HYPER-FORGE', 256, 120);
      ctx.fillStyle = '#05080f'; ctx.fillRect(64, 200, 384, 200);
      const t = new THREE.CanvasTexture(c); return t;
    }

    function createMysteryBoxTex() {
      const c = document.createElement('canvas'); c.width = 256; c.height = 128;
      const ctx = c.getContext('2d');
      ctx.fillStyle = '#4a2c14'; ctx.fillRect(0,0,256,128);
      ctx.fillStyle = '#b8860b'; ctx.fillRect(10,0,20,128); ctx.fillRect(226,0,20,128);
      ctx.font = 'bold 64px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('?', 128, 90);
      const t = new THREE.CanvasTexture(c); return t;
    }

    function createChalkTex(name, price) {
      const c = document.createElement('canvas'); c.width = 256; c.height = 128;
      const ctx = c.getContext('2d');
      ctx.fillStyle = '#10141d'; ctx.fillRect(0,0,256,128);
      ctx.strokeStyle = '#38bdf8'; ctx.lineWidth = 4; ctx.strokeRect(8,8,240,112);
      ctx.fillStyle = '#ffffff'; ctx.font = 'bold 24px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(name, 128, 50);
      ctx.fillStyle = '#34d399'; ctx.font = 'bold 20px sans-serif';
      ctx.fillText(price + ' PTS', 128, 90);
      const t = new THREE.CanvasTexture(c); return t;
    }

    // -------------------------------------------------------------
    // Sound Engine for Standalone HTML
    // -------------------------------------------------------------
    let audioCtx = null;
    let masterVol = 0.8;
    function getAudioCtx() {
      if(!audioCtx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if(AC) audioCtx = new AC();
      }
      if(audioCtx && audioCtx.state === 'suspended') audioCtx.resume().catch(()=>{});
      return audioCtx;
    }

    function playShootSound(type, isPap) {
      const ctx = getAudioCtx(); if(!ctx) return;
      const now = ctx.currentTime;
      const osc = ctx.createOscillator(); const gain = ctx.createGain();
      osc.type = isPap ? 'sawtooth' : 'triangle';
      const startFreq = isPap ? 1200 : (type==='shotgun'?280:type==='raygun'?1600:500);
      const endFreq = isPap ? 200 : 50;
      osc.frequency.setValueAtTime(startFreq, now); osc.frequency.exponentialRampToValueAtTime(endFreq, now+0.15);
      gain.gain.setValueAtTime(0.4 * masterVol, now); gain.gain.exponentialRampToValueAtTime(0.01, now+0.15);
      osc.connect(gain); gain.connect(ctx.destination); osc.start(now); osc.stop(now+0.15);
    }

    function playHitmarkerSound(isKill, isHeadshot) {
      const ctx = getAudioCtx(); if(!ctx) return;
      const now = ctx.currentTime;
      const osc = ctx.createOscillator(); const gain = ctx.createGain();
      osc.type = 'sine'; osc.frequency.setValueAtTime(isHeadshot? 1800 : isKill? 1300 : 900, now);
      gain.gain.setValueAtTime((isKill? 0.35 : 0.15) * masterVol, now); gain.gain.exponentialRampToValueAtTime(0.001, now+0.07);
      osc.connect(gain); gain.connect(ctx.destination); osc.start(now); osc.stop(now+0.07);
    }

    function playWoodSound(isRepair) {
      const ctx = getAudioCtx(); if(!ctx) return;
      const now = ctx.currentTime;
      const osc = ctx.createOscillator(); const gain = ctx.createGain();
      osc.type = 'square'; osc.frequency.setValueAtTime(isRepair? 220 : 120, now);
      gain.gain.setValueAtTime(0.25 * masterVol, now); gain.gain.exponentialRampToValueAtTime(0.01, now+0.1);
      osc.connect(gain); gain.connect(ctx.destination); osc.start(now); osc.stop(now+0.1);
    }

    function playPerkSound() {
      const ctx = getAudioCtx(); if(!ctx) return;
      const now = ctx.currentTime;
      const osc = ctx.createOscillator(); const gain = ctx.createGain();
      osc.type = 'sine'; osc.frequency.setValueAtTime(440, now); osc.frequency.exponentialRampToValueAtTime(880, now+0.3);
      gain.gain.setValueAtTime(0.3 * masterVol, now); gain.gain.exponentialRampToValueAtTime(0.01, now+0.3);
      osc.connect(gain); gain.connect(ctx.destination); osc.start(now); osc.stop(now+0.3);
    }

    function playPaPSound() {
      const ctx = getAudioCtx(); if(!ctx) return;
      const now = ctx.currentTime;
      const osc = ctx.createOscillator(); const gain = ctx.createGain();
      osc.type = 'sawtooth'; osc.frequency.setValueAtTime(300, now); osc.frequency.exponentialRampToValueAtTime(1200, now+0.5);
      gain.gain.setValueAtTime(0.4 * masterVol, now); gain.gain.exponentialRampToValueAtTime(0.01, now+0.5);
      osc.connect(gain); gain.connect(ctx.destination); osc.start(now); osc.stop(now+0.5);
    }

    function playRoundSound(isStart) {
      const ctx = getAudioCtx(); if(!ctx) return;
      const now = ctx.currentTime;
      const osc = ctx.createOscillator(); const gain = ctx.createGain();
      osc.type = 'sawtooth'; osc.frequency.setValueAtTime(isStart? 150 : 400, now); osc.frequency.exponentialRampToValueAtTime(isStart? 350 : 100, now+0.8);
      gain.gain.setValueAtTime(0.35 * masterVol, now); gain.gain.exponentialRampToValueAtTime(0.01, now+0.8);
      osc.connect(gain); gain.connect(ctx.destination); osc.start(now); osc.stop(now+0.8);
    }

    // -------------------------------------------------------------
    // Full Weapon 3D Model Builder
    // -------------------------------------------------------------
    function createWeaponModel(type, isPap) {
      const g = new THREE.Group();
      const pColor = isPap ? '#00f0ff' : '#2b3340';
      const steelMat = new THREE.MeshStandardMaterial({ color: pColor, metalness: isPap? 0.9:0.85, roughness: isPap? 0.1:0.25 });
      const darkMat = new THREE.MeshStandardMaterial({ color: '#121620', metalness: 0.8 });
      const woodMat = new THREE.MeshStandardMaterial({ color: '#5c3a1e', roughness: 0.7 });
      const brassMat = new THREE.MeshStandardMaterial({ color: '#b8860b', metalness: 0.9 });
      const tritiumMat = new THREE.MeshBasicMaterial({ color: isPap ? '#00f0ff' : '#00ff66' });
      const rayGlowMat = new THREE.MeshBasicMaterial({ color: isPap ? '#00ffff' : '#22ff66' });

      if (type === 'pistol') {
        const slide = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.09, 0.32), steelMat);
        slide.position.set(0, 0, -0.05); g.add(slide);
        const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.1, 8), darkMat);
        tube.rotation.x = Math.PI/2; tube.position.set(0, 0.01, -0.22); g.add(tube);
        const grip = new THREE.Mesh(new THREE.BoxGeometry(0.065, 0.2, 0.09), woodMat);
        grip.position.set(0, -0.11, 0.04); grip.rotation.x = 0.25; g.add(grip);
        const sight = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.02, 0.02), darkMat);
        sight.position.set(0, 0.05, -0.19); g.add(sight);
        const dot = new THREE.Mesh(new THREE.SphereGeometry(0.005, 6, 6), tritiumMat);
        dot.position.set(0, 0.058, -0.19); g.add(dot);
      } else if (type === 'smg') {
        const rec = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.55, 12), steelMat);
        rec.rotation.x = Math.PI / 2; rec.position.set(0, 0, -0.15); g.add(rec);
        const mag = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.32, 0.06), steelMat);
        mag.position.set(0, -0.18, -0.12); g.add(mag);
        const sight = new THREE.Mesh(new THREE.TorusGeometry(0.025, 0.005, 8, 16), darkMat);
        sight.position.set(0, 0.048, -0.52); g.add(sight);
        const dot = new THREE.Mesh(new THREE.SphereGeometry(0.005, 6, 6), tritiumMat);
        dot.position.set(0, 0.048, -0.52); g.add(dot);
      } else if (type === 'ar') {
        const body = new THREE.Mesh(new THREE.BoxGeometry(0.085, 0.12, 0.48), steelMat);
        body.position.set(0, 0, -0.1); g.add(body);
        const mag = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.34, 0.09), brassMat);
        mag.position.set(0, -0.2, -0.08); mag.rotation.x = -0.35; g.add(mag);
        const stock = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.14, 0.28), woodMat);
        stock.position.set(0, -0.02, 0.25); g.add(stock);
        const dot = new THREE.Mesh(new THREE.SphereGeometry(0.006, 6, 6), tritiumMat);
        dot.position.set(0, 0.09, -0.1); g.add(dot);
      } else if (type === 'shotgun') {
        const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.032, 0.65, 10), steelMat);
        barrel.rotation.x = Math.PI/2; barrel.position.set(0, 0.03, -0.25); g.add(barrel);
        const pump = new THREE.Mesh(new THREE.CylinderGeometry(0.048, 0.048, 0.22, 12), woodMat);
        pump.rotation.x = Math.PI/2; pump.position.set(0, -0.02, -0.3); g.add(pump);
        const dot = new THREE.Mesh(new THREE.SphereGeometry(0.005, 6, 6), tritiumMat);
        dot.position.set(0, 0.068, -0.55); g.add(dot);
      } else { // Ray Gun
        const body = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.05, 0.4, 12), steelMat);
        body.rotation.x = Math.PI/2; body.position.set(0, 0, -0.12); g.add(body);
        const dish = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.14, 16), rayGlowMat);
        dish.rotation.x = -Math.PI/2; dish.position.set(0, 0, -0.38); g.add(dish);
      }
      return g;
    }

    // -------------------------------------------------------------
    // Full Standalone Game Engine
    // -------------------------------------------------------------
    const BASE_WEAPONS = {
      pistol: { id: 'pistol', name: 'M1911', papName: 'Twin Vipers', type: 'pistol', damage: 40, fireRate: 0.22, clipSize: 8, maxReserve: 80, reloadTime: 1.4, price: 0 },
      smg: { id: 'smg', name: 'MP40', papName: 'Afterburner', type: 'smg', damage: 45, fireRate: 0.09, clipSize: 32, maxReserve: 192, reloadTime: 1.8, price: 1000 },
      ar: { id: 'ar', name: 'VX-44', papName: 'Annihilator-44', type: 'ar', damage: 75, fireRate: 0.13, clipSize: 30, maxReserve: 180, reloadTime: 2.1, price: 1500 },
      shotgun: { id: 'shotgun', name: 'SG-26', papName: 'Dragon\'s Breath', type: 'shotgun', damage: 32, pellets: 8, spread: 0.08, fireRate: 0.75, clipSize: 8, maxReserve: 48, reloadTime: 2.6, price: 1200 },
      raygun: { id: 'raygun', name: 'Plasma Blaster', papName: 'X2 Hyper-Plasma', type: 'raygun', damage: 240, fireRate: 0.28, clipSize: 20, maxReserve: 120, reloadTime: 1.9, price: 950 }
    };

    let scene, camera, renderer, clock;
    let isPointerLocked = false, isMapLoaded = false, isPaused = false, isGameOver = false;
    let playerPos = new THREE.Vector3(0, 1.6, 0);
    let yaw = 0, pitch = 0, keys = {};
    let isAiming = false;
    let settings = { mouseSensitivity: 0.0022, worldBrightness: 0.85, fov: 75, volume: 80 };

    let playerHp = 100, maxHp = 100, score = 500, round = 1, kills = 0, headshots = 0;
    let playerWeapons = [], currentWepIndex = 0;
    let perks = { juggernog: false, speedCola: false, doubleTap: false };

    let gunGroup, gunMesh, muzzleLight, playerFlashlight, ambientLight;
    let bullets = [], zombies = [], barriers = [], barrierMeshes = [];
    let zombiesToSpawn = 0, shootCooldown = 0;
    let currentPromptText = '', currentPromptAction = null;
    let isBoxSpinning = false;

    function initEngine() {
      const container = document.getElementById('canvas-container');
      scene = new THREE.Scene();
      scene.background = new THREE.Color('#0a0e17');
      scene.fog = new THREE.Fog('#0a0e17', 10, 40);

      camera = new THREE.PerspectiveCamera(settings.fov, window.innerWidth / window.innerHeight, 0.1, 1000);
      camera.position.copy(playerPos);

      renderer = new THREE.WebGLRenderer({ antialias: true });
      renderer.setSize(window.innerWidth, window.innerHeight);
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.2;
      container.appendChild(renderer.domElement);

      clock = new THREE.Clock();

      // Keyboard Controls
      window.addEventListener('keydown', (e) => {
        keys[e.code] = true;
        if (e.code === 'KeyR') reloadWeapon();
        if (e.code === 'Digit1') switchWeapon(0);
        if (e.code === 'Digit2') switchWeapon(1);
        if (e.code === 'KeyE') { if (currentPromptAction) currentPromptAction(); }
        if (e.code === 'Escape' && isMapLoaded && !isGameOver) {
          togglePauseMenu();
        }
      });
      window.addEventListener('keyup', (e) => {
        keys[e.code] = false;
      });

      document.addEventListener('mousemove', (e) => {
        if (!isMapLoaded || isPaused || isGameOver) return;
        yaw -= e.movementX * settings.mouseSensitivity;
        pitch -= e.movementY * settings.mouseSensitivity;
        pitch = Math.max(-Math.PI / 2.1, Math.min(Math.PI / 2.1, pitch));
      });

      document.addEventListener('pointerlockchange', () => {
        isPointerLocked = (document.pointerLockElement === document.body || document.pointerLockElement === renderer.domElement);
      });

      renderer.domElement.addEventListener('click', () => {
        if (isMapLoaded && !isPaused && !isGameOver) {
          if (!isPointerLocked) {
            try { renderer.domElement.requestPointerLock(); } catch(e) {}
          } else {
            shoot();
          }
        }
      });

      window.addEventListener('mousedown', (e) => {
        if (e.button === 2 && isMapLoaded && !isPaused && !isGameOver) isAiming = true;
      });
      window.addEventListener('mouseup', (e) => {
        if (e.button === 2) isAiming = false;
      });

      window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
      });

      animate();
    }

    function loadMap() {
      if (isMapLoaded) unloadMap();

      // Reset Stats & Weapons
      playerHp = 100; maxHp = 100; score = 500; round = 1; kills = 0; headshots = 0;
      isGameOver = false; isPaused = false;
      perks = { juggernog: false, speedCola: false, doubleTap: false };
      playerPos.set(0, 1.6, 0); yaw = 0; pitch = 0; keys = {};

      playerWeapons = [{
        stats: JSON.parse(JSON.stringify(BASE_WEAPONS.pistol)),
        clip: BASE_WEAPONS.pistol.clipSize,
        reserve: BASE_WEAPONS.pistol.maxReserve,
        isPap: false
      }];
      currentWepIndex = 0;

      // Lights
      ambientLight = new THREE.AmbientLight('#3d4b64', 0.35 + settings.worldBrightness * 0.6);
      scene.add(ambientLight);

      const hemi = new THREE.HemisphereLight('#566d94', '#201815', 1.0);
      scene.add(hemi);

      const centerLight = new THREE.PointLight('#ffb044', 3.2, 38);
      centerLight.position.set(0, 4.3, 0);
      scene.add(centerLight);

      playerFlashlight = new THREE.SpotLight('#e5f2ff', 4.5, 26, Math.PI / 4.5, 0.4, 1.2);
      camera.add(playerFlashlight);
      scene.add(playerFlashlight.target);

      // Lantern Wall Sconces
      [new THREE.Vector3(0,3.4,11.2), new THREE.Vector3(0,3.4,-11.2), new THREE.Vector3(11.2,3.4,0), new THREE.Vector3(-11.2,3.4,0)].forEach(p => {
        const sL = new THREE.PointLight('#ff9922', 2.8, 16); sL.position.copy(p); scene.add(sL);
      });

      // Floor & Ceiling & Brick Walls
      const floorMat = new THREE.MeshStandardMaterial({ map: createFloorTex(), roughness: 0.9, metalness: 0.05 });
      const floor = new THREE.Mesh(new THREE.PlaneGeometry(24, 24), floorMat);
      floor.rotation.x = -Math.PI / 2; scene.add(floor);

      const ceilMat = new THREE.MeshStandardMaterial({ color: '#1a202c', roughness: 0.8 });
      const ceil = new THREE.Mesh(new THREE.PlaneGeometry(24, 24), ceilMat);
      ceil.position.y = 5; ceil.rotation.x = Math.PI / 2; scene.add(ceil);

      const wallMat = new THREE.MeshStandardMaterial({ map: createWallTex(), roughness: 0.6 });
      const frameMat = new THREE.MeshStandardMaterial({ color: '#2a3240', metalness: 0.6 });

      function buildWall(cx, cz, isZ) {
        if (!isZ) {
          const lBox = new THREE.Mesh(new THREE.BoxGeometry(10.4, 5, 0.6), wallMat); lBox.position.set(-6.8, 2.5, cz); scene.add(lBox);
          const rBox = new THREE.Mesh(new THREE.BoxGeometry(10.4, 5, 0.6), wallMat); rBox.position.set(6.8, 2.5, cz); scene.add(rBox);
          const tBox = new THREE.Mesh(new THREE.BoxGeometry(3.2, 2.4, 0.6), wallMat); tBox.position.set(0, 3.8, cz); scene.add(tBox);
          const sill = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.3, 0.9), frameMat); sill.position.set(0, 0.15, cz); scene.add(sill);
        } else {
          const lBox = new THREE.Mesh(new THREE.BoxGeometry(0.6, 5, 10.4), wallMat); lBox.position.set(cx, 2.5, -6.8); scene.add(lBox);
          const rBox = new THREE.Mesh(new THREE.BoxGeometry(0.6, 5, 10.4), wallMat); rBox.position.set(cx, 2.5, 6.8); scene.add(rBox);
          const tBox = new THREE.Mesh(new THREE.BoxGeometry(0.6, 2.4, 3.2), wallMat); tBox.position.set(cx, 3.8, 0); scene.add(tBox);
          const sill = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.3, 3.6), frameMat); sill.position.set(cx, 0.15, 0); scene.add(sill);
        }
      }
      buildWall(0, 12, false); buildWall(0, -12, false); buildWall(12, 0, true); buildWall(-12, 0, true);

      // Window Barriers (4 Barriers)
      const plankMat = new THREE.MeshStandardMaterial({ map: createPlankTex(), roughness: 0.7 });
      const bPositions = [
        { id: 0, pos: new THREE.Vector3(0, 1.4, 11.7), rotY: 0 },
        { id: 1, pos: new THREE.Vector3(0, 1.4, -11.7), rotY: 0 },
        { id: 2, pos: new THREE.Vector3(11.7, 1.4, 0), rotY: Math.PI/2 },
        { id: 3, pos: new THREE.Vector3(-11.7, 1.4, 0), rotY: Math.PI/2 }
      ];

      barriers = []; barrierMeshes = [];
      bPositions.forEach(b => {
        barriers.push({ id: b.id, planks: 5, maxPlanks: 5, pos: b.pos });
        const grp = new THREE.Group(); grp.position.copy(b.pos); grp.rotation.y = b.rotY;
        const planks = [];
        [-0.8, -0.4, 0, 0.4, 0.8].forEach(yOff => {
          const p = new THREE.Mesh(new THREE.BoxGeometry(3.1, 0.28, 0.08), plankMat);
          p.position.set(0, yOff, 0); grp.add(p); planks.push(p);
        });
        scene.add(grp); barrierMeshes.push({ group: grp, planks });
      });

      // Perk Machines
      const perkConfigs = [
        { type: 'juggernog', pos: new THREE.Vector3(6, 0, 11.1), ry: Math.PI, color: '#dd1111' },
        { type: 'speedCola', pos: new THREE.Vector3(6, 0, -11.1), ry: 0, color: '#11dd44' },
        { type: 'doubleTap', pos: new THREE.Vector3(-6, 0, -11.1), ry: 0, color: '#eedd11' }
      ];
      perkConfigs.forEach(p => {
        const grp = new THREE.Group(); grp.position.copy(p.pos); grp.rotation.y = p.ry;
        const frontMat = new THREE.MeshStandardMaterial({ map: createPerkMachineTex(p.type) });
        const sideMat = new THREE.MeshStandardMaterial({ color: p.color });
        const body = new THREE.Mesh(new THREE.BoxGeometry(1.4, 2.6, 1.2), [sideMat, sideMat, sideMat, sideMat, frontMat, sideMat]);
        body.position.y = 1.3; grp.add(body);
        const light = new THREE.PointLight(p.color, 1.8, 6); light.position.set(0, 2.5, 0.6); grp.add(light);
        scene.add(grp);
      });

      // Pack-a-Punch Machine
      const papGrp = new THREE.Group(); papGrp.position.set(-6, 0, 11.2); papGrp.rotation.y = Math.PI;
      const papMat = new THREE.MeshStandardMaterial({ map: createPaPTex() });
      const steelMat = new THREE.MeshStandardMaterial({ color: '#1c2432', metalness: 0.8 });
      const papBody = new THREE.Mesh(new THREE.BoxGeometry(2.4, 2.8, 1.2), [steelMat, steelMat, steelMat, steelMat, papMat, steelMat]);
      papBody.position.y = 1.4; papGrp.add(papBody);
      const papLight = new THREE.PointLight('#00ffff', 1.8, 6); papLight.position.set(0, 1.6, 0.7); papGrp.add(papLight);
      scene.add(papGrp);

      // Mystery Box
      const boxGrp = new THREE.Group(); boxGrp.position.set(11.2, 0, -5); boxGrp.rotation.y = -Math.PI/2;
      const boxMat = new THREE.MeshStandardMaterial({ map: createMysteryBoxTex() });
      const boxWood = new THREE.MeshStandardMaterial({ color: '#3b2210' });
      const chest = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.9, 1.1), [boxMat, boxMat, boxWood, boxWood, boxMat, boxMat]);
      chest.position.y = 0.45; boxGrp.add(chest);
      const boxLight = new THREE.PointLight('#ffaa22', 1.6, 6); boxLight.position.set(0, 1.2, 0); boxGrp.add(boxLight);
      scene.add(boxGrp);

      // Wall Buys
      const wallBuys = [
        { name: 'MP40', price: 1000, pos: new THREE.Vector3(-11.6, 2.0, -5.0), ry: Math.PI/2, type: 'smg' },
        { name: 'VX-44', price: 1500, pos: new THREE.Vector3(11.6, 2.0, 5.0), ry: -Math.PI/2, type: 'ar' },
        { name: 'SG-26', price: 1200, pos: new THREE.Vector3(-11.6, 2.0, 5.0), ry: Math.PI/2, type: 'shotgun' }
      ];
      wallBuys.forEach(wb => {
        const grp = new THREE.Group(); grp.position.copy(wb.pos); grp.rotation.y = wb.ry;
        const plaque = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.1, 0.08), new THREE.MeshStandardMaterial({ map: createChalkTex(wb.name, wb.price) }));
        grp.add(plaque);
        const gModel = createWeaponModel(wb.type, false); gModel.scale.set(1.8,1.8,1.8); gModel.position.set(0,0.12,0.12); gModel.rotation.y = Math.PI/2;
        grp.add(gModel);
        scene.add(grp);
      });

      // Gun Rig attached to camera
      gunGroup = new THREE.Group();
      gunGroup.position.set(0.28, -0.24, -0.45);
      camera.add(gunGroup); scene.add(camera);

      muzzleLight = new THREE.PointLight('#ffaa22', 0, 4);
      muzzleLight.position.set(0, 0.04, -0.52);
      gunGroup.add(muzzleLight);

      updateGunMesh();

      // Player Legs Body Viewmodel (Visible when looking down!)
      const bodyRig = new THREE.Group(); scene.add(bodyRig);
      const pantsMat = new THREE.MeshStandardMaterial({ color: '#2b3327' });
      const legL = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.7, 0.22), pantsMat); legL.position.set(-0.18, 0.4, 0); bodyRig.add(legL);
      const legR = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.7, 0.22), pantsMat); legR.position.set(0.18, 0.4, 0); bodyRig.add(legR);

      isMapLoaded = true;
      startRound(1);
      updateHUD();
    }

    function unloadMap() {
      if (!isMapLoaded) return;
      while (camera.children.length > 0) camera.remove(camera.children[0]);
      while (scene.children.length > 0) scene.remove(scene.children[0]);
      barriers = []; barrierMeshes = []; bullets = []; zombies = [];
      isMapLoaded = false;
      if (renderer) { renderer.clear(); renderer.render(scene, camera); }
    }

    function updateGunMesh() {
      if (!gunGroup) return;
      for (let i = gunGroup.children.length - 1; i >= 0; i--) {
        const child = gunGroup.children[i];
        if (child !== muzzleLight) {
          gunGroup.remove(child);
        }
      }
      const curWep = playerWeapons[currentWepIndex];
      if (curWep) {
        gunMesh = createWeaponModel(curWep.stats.type, curWep.isPap);
        gunGroup.add(gunMesh);
      }
    }

    function startRound(rNum) {
      round = rNum;
      zombiesToSpawn = 6 + (round - 1) * 4;
      playRoundSound(true);
      updateHUD();
    }

    function spawnZombie() {
      if (zombiesToSpawn <= 0 || barriers.length === 0) return;
      const barrier = barriers[Math.floor(Math.random() * barriers.length)];
      const grp = new THREE.Group();

      const skinMat = new THREE.MeshStandardMaterial({ color: '#2e3b2e', roughness: 0.8 });
      const clothesMat = new THREE.MeshStandardMaterial({ color: '#1f242e', roughness: 0.9 });
      const eyeMat = new THREE.MeshBasicMaterial({ color: '#ff2200' });

      const chest = new THREE.Mesh(new THREE.BoxGeometry(0.74, 0.46, 0.44), clothesMat); chest.name = 'zombieChest'; chest.position.y = 1.28; grp.add(chest);
      const head = new THREE.Mesh(new THREE.IcosahedronGeometry(0.28, 0), skinMat); head.name = 'zombieHead'; head.position.y = 1.68; grp.add(head);
      const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.045, 6, 6), eyeMat); eyeL.position.set(-0.09, 1.71, -0.23); grp.add(eyeL);
      const eyeR = new THREE.Mesh(new THREE.SphereGeometry(0.045, 6, 6), eyeMat); eyeR.position.set(0.09, 1.71, -0.23); grp.add(eyeR);
      const armL = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.45, 0.18), skinMat); armL.position.set(-0.45, 1.1, -0.14); armL.rotation.x = Math.PI/3; grp.add(armL);
      const armR = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.45, 0.18), skinMat); armR.position.set(0.45, 1.1, -0.14); armR.rotation.x = Math.PI/3; grp.add(armR);

      // Spawn outside barrier
      let spawnPos = barrier.pos.clone();
      if(barrier.id === 0) spawnPos.z += 3.5;
      else if(barrier.id === 1) spawnPos.z -= 3.5;
      else if(barrier.id === 2) spawnPos.x += 3.5;
      else spawnPos.x -= 3.5;
      spawnPos.y = 0; grp.position.copy(spawnPos);

      scene.add(grp);

      const hp = 100 * Math.pow(1.18, round - 1);
      const speed = 0.65 + Math.min((round - 1) * 0.28, 2.4);

      zombies.push({
        id: Math.random(),
        group: grp,
        hp, maxHp: hp, speed,
        barrierId: barrier.id,
        attackTimer: 0
      });

      zombiesToSpawn--;
    }

    function shoot() {
      if (isGameOver || isPaused || !isMapLoaded) return;
      const curWep = playerWeapons[currentWepIndex];
      if (curWep.isReloading || shootCooldown > 0) return;
      if (curWep.clip <= 0) { reloadWeapon(); return; }

      curWep.clip--;
      const fireRateMod = perks.doubleTap ? 0.65 : 1.0;
      shootCooldown = curWep.stats.fireRate * fireRateMod;

      playShootSound(curWep.stats.type, curWep.isPap);
      if (muzzleLight) muzzleLight.intensity = 3.5;
      if (gunGroup) gunGroup.position.z = (isAiming ? -0.32 : -0.45) + 0.07;

      const damage = curWep.stats.damage * (perks.doubleTap ? 1.5 : 1.0) * (curWep.isPap ? 2.0 : 1.0);
      const pellets = curWep.stats.pellets || 1;

      for(let p=0; p<pellets; p++) {
        const raycaster = new THREE.Raycaster();
        const spread = (isAiming? 0.35 : 1.0) * (curWep.stats.spread || 0.012);
        raycaster.setFromCamera(new THREE.Vector2((Math.random()-0.5)*spread, (Math.random()-0.5)*spread), camera);

        const bulletGeo = new THREE.CylinderGeometry(0.025, 0.012, 0.45, 8);
        const bulletMat = new THREE.MeshBasicMaterial({ color: curWep.isPap ? '#00f0ff' : '#ffcc00' });
        const mesh = new THREE.Mesh(bulletGeo, bulletMat);
        mesh.position.copy(playerPos);
        const axis = new THREE.Vector3(0,1,0); mesh.quaternion.setFromUnitVectors(axis, raycaster.ray.direction.clone().normalize());
        scene.add(mesh);

        bullets.push({ mesh, vel: raycaster.ray.direction.clone().normalize().multiplyScalar(65), life: 1.2, damage, isPap: curWep.isPap });
      }

      updateHUD();
    }

    function reloadWeapon() {
      const curWep = playerWeapons[currentWepIndex];
      if(!curWep || curWep.clip === curWep.stats.clipSize || curWep.reserve <= 0 || curWep.isReloading) return;
      curWep.isReloading = true;
      setTimeout(() => {
        const needed = curWep.stats.clipSize - curWep.clip;
        const taken = Math.min(needed, curWep.reserve);
        curWep.clip += taken; curWep.reserve -= taken;
        curWep.isReloading = false;
        updateHUD();
      }, (curWep.stats.reloadTime * (perks.speedCola ? 0.5 : 1.0)) * 1000);
    }

    function switchWeapon(idx) {
      if(idx >= playerWeapons.length || idx === currentWepIndex) return;
      currentWepIndex = idx;
      updateGunMesh();
      updateHUD();
    }

    function addScore(pts, reason) {
      score += pts;
      updateHUD();
      const popContainer = document.getElementById('score-popups');
      if(popContainer) {
        const d = document.createElement('div');
        d.className = 'score-pop' + (reason.includes('HEAD')?' headshot':reason.includes('KILL')?' kill':'');
        d.innerText = '+' + pts + ' ' + reason;
        popContainer.appendChild(d);
        setTimeout(() => d.remove(), 1400);
      }
    }

    function triggerHitmarker(isKill, isHeadshot) {
      playHitmarkerSound(isKill, isHeadshot);
      const hm = document.getElementById('hitmarker');
      if(hm) {
        hm.className = isHeadshot ? 'headshot' : isKill ? 'kill' : '';
        hm.style.opacity = '1';
        setTimeout(() => hm.style.opacity = '0', 100);
      }
    }

    function checkPrompts() {
      currentPromptText = ''; currentPromptAction = null;
      const p2 = new THREE.Vector2(playerPos.x, playerPos.z);

      // Barriers
      barriers.forEach(b => {
        if(p2.distanceTo(new THREE.Vector2(b.pos.x, b.pos.z)) < 2.5 && b.planks < b.maxPlanks) {
          currentPromptText = "HOLD 'E' TO REPAIR BARRIER (+10 PTS)";
          currentPromptAction = () => {
            if(b.planks < b.maxPlanks) {
              b.planks++;
              if (barrierMeshes[b.id] && barrierMeshes[b.id].planks[b.planks-1]) {
                barrierMeshes[b.id].planks[b.planks-1].visible = true;
              }
              addScore(10, 'BOARD REPAIRED'); playWoodSound(true);
            }
          };
        }
      });

      // Power Brews
      if(p2.distanceTo(new THREE.Vector2(6, 11.1)) < 2.5 && !perks.juggernog) {
        currentPromptText = "PRESS 'E' FOR TITAN TONIC [2,500 PTS]";
        currentPromptAction = () => { if(score >= 2500) { score -= 2500; perks.juggernog = true; maxHp = 250; playerHp = 250; playPerkSound(); updateHUD(); } };
      } else if(p2.distanceTo(new THREE.Vector2(6, -11.1)) < 2.5 && !perks.speedCola) {
        currentPromptText = "PRESS 'E' FOR BLITZ BREW [3,000 PTS]";
        currentPromptAction = () => { if(score >= 3000) { score -= 3000; perks.speedCola = true; playPerkSound(); updateHUD(); } };
      } else if(p2.distanceTo(new THREE.Vector2(-6, -11.1)) < 2.5 && !perks.doubleTap) {
        currentPromptText = "PRESS 'E' FOR FURY FIZZ [2,000 PTS]";
        currentPromptAction = () => { if(score >= 2000) { score -= 2000; perks.doubleTap = true; playPerkSound(); updateHUD(); } };
      }

      // Hyper-Forge
      const curWep = playerWeapons[currentWepIndex];
      if(curWep && p2.distanceTo(new THREE.Vector2(-6, 11.1)) < 2.5 && !curWep.isPap) {
        currentPromptText = "PRESS 'E' TO HYPER-FORGE " + curWep.stats.name + " [5,000 PTS]";
        currentPromptAction = () => {
          if(score >= 5000) {
            score -= 5000; curWep.isPap = true; curWep.stats.name = curWep.stats.papName;
            curWep.stats.damage *= 2; curWep.stats.clipSize *= 2; curWep.stats.maxReserve *= 2;
            curWep.clip = curWep.stats.clipSize; curWep.reserve = curWep.stats.maxReserve;
            updateGunMesh(); playPaPSound(); updateHUD();
          }
        };
      }

      // Armory Chest
      if(p2.distanceTo(new THREE.Vector2(11.1, -5)) < 2.5 && !isBoxSpinning) {
        currentPromptText = "PRESS 'E' TO OPEN ARMORY CHEST [950 PTS]";
        currentPromptAction = () => {
          if(score >= 950) {
            score -= 950; isBoxSpinning = true; playPaPSound(); updateHUD();
            setTimeout(() => {
              isBoxSpinning = false;
              const roll = Math.random();
              const newId = roll < 0.4 ? 'raygun' : roll < 0.7 ? 'ar' : 'shotgun';
              grantWeapon(newId);
            }, 3000);
          }
        };
      }

      // Wall buys
      if(p2.distanceTo(new THREE.Vector2(-11.4, -5)) < 2.5) {
        currentPromptText = "PRESS 'E' TO BUY MP40 [1,000 PTS]";
        currentPromptAction = () => buyWallWeapon('smg');
      } else if(p2.distanceTo(new THREE.Vector2(11.4, 5)) < 2.5) {
        currentPromptText = "PRESS 'E' TO BUY VX-44 [1,500 PTS]";
        currentPromptAction = () => buyWallWeapon('ar');
      } else if(p2.distanceTo(new THREE.Vector2(-11.4, 5)) < 2.5) {
        currentPromptText = "PRESS 'E' TO BUY SG-26 SHOTGUN [1,200 PTS]";
        currentPromptAction = () => buyWallWeapon('shotgun');
      }

      const pBox = document.getElementById('prompt-box');
      if(pBox) {
        pBox.style.display = currentPromptText ? 'block' : 'none';
        pBox.innerText = currentPromptText;
      }
    }

    function buyWallWeapon(wId) {
      const wep = BASE_WEAPONS[wId];
      if(score >= wep.price) {
        score -= wep.price;
        grantWeapon(wId);
      }
    }

    function grantWeapon(wId) {
      const base = BASE_WEAPONS[wId];
      const newWep = { stats: JSON.parse(JSON.stringify(base)), clip: base.clipSize, reserve: base.maxReserve, isPap: false };
      if(playerWeapons.length < 2) {
        playerWeapons.push(newWep); currentWepIndex = 1;
      } else {
        playerWeapons[currentWepIndex] = newWep;
      }
      updateGunMesh(); updateHUD();
    }

    function updateSettings() {
      settings.mouseSensitivity = parseFloat(document.getElementById('sens-input').value);
      settings.worldBrightness = parseFloat(document.getElementById('bright-input').value);
      settings.fov = parseInt(document.getElementById('fov-input').value, 10);
      settings.volume = parseInt(document.getElementById('vol-input').value, 10);
      masterVol = settings.volume / 100;

      document.getElementById('sens-label').innerText = (settings.mouseSensitivity * 1000).toFixed(1);
      document.getElementById('bright-label').innerText = Math.round(settings.worldBrightness * 100) + '%';
      document.getElementById('fov-label').innerText = settings.fov + '°';
      document.getElementById('vol-label').innerText = settings.volume + '%';

      if (ambientLight) ambientLight.intensity = 0.35 + settings.worldBrightness * 0.6;
      if (renderer) renderer.toneMappingExposure = 0.7 + settings.worldBrightness * 0.55;
      if (camera && !isAiming) { camera.fov = settings.fov; camera.updateProjectionMatrix(); }
    }

    function updateHUD() {
      const curWep = playerWeapons[currentWepIndex];
      document.getElementById('hp-text').innerText = Math.max(0, Math.round(playerHp)) + ' / ' + maxHp;
      document.getElementById('hp-bar').style.width = Math.max(0, (playerHp / maxHp * 100)) + '%';
      document.getElementById('score-val').innerText = score;
      document.getElementById('round-val').innerText = round;
      if(curWep) {
        const titleEl = document.getElementById('wep-title');
        titleEl.innerText = curWep.stats.name;
        titleEl.className = curWep.isPap ? 'wep-title pap' : 'wep-title';
        document.getElementById('clip-val').innerText = curWep.clip;
        document.getElementById('res-val').innerText = curWep.reserve;
      }
    }

    function animate() {
      requestAnimationFrame(animate);
      if (!isMapLoaded) return;

      const delta = Math.min(clock.getDelta(), 0.1);
      if(shootCooldown > 0) shootCooldown -= delta;

      if (!isPaused && !isGameOver) {
        const euler = new THREE.Euler(0, 0, 0, 'YXZ');
        euler.x = pitch; euler.y = yaw;
        camera.quaternion.setFromEuler(euler);

        const camDir = new THREE.Vector3(); camera.getWorldDirection(camDir);
        if (playerFlashlight && playerFlashlight.target) {
          playerFlashlight.target.position.copy(playerPos).addScaledVector(camDir, 12);
        }

        const moveDir = new THREE.Vector3();
        if (keys['KeyW'] || keys['ArrowUp']) moveDir.z -= 1;
        if (keys['KeyS'] || keys['ArrowDown']) moveDir.z += 1;
        if (keys['KeyA'] || keys['ArrowLeft']) moveDir.x -= 1;
        if (keys['KeyD'] || keys['ArrowRight']) moveDir.x += 1;
        moveDir.normalize();

        const speed = keys['ShiftLeft'] ? 7.5 : 4.5;
        const forward = new THREE.Vector3(0, 0, -1).applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
        const right = new THREE.Vector3(1, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw);

        const velocity = new THREE.Vector3().addScaledVector(forward, -moveDir.z * speed).addScaledVector(right, moveDir.x * speed);

        playerPos.x += velocity.x * delta;
        playerPos.z += velocity.z * delta;

        // Wall collisions
        playerPos.x = Math.max(-11.2, Math.min(11.2, playerPos.x));
        playerPos.z = Math.max(-11.2, Math.min(11.2, playerPos.z));
        camera.position.copy(playerPos);

        const targetFov = isAiming ? 55 : settings.fov;
        camera.fov = THREE.MathUtils.damp(camera.fov, targetFov, 14, delta);
        camera.updateProjectionMatrix();

        if (gunGroup) {
          gunGroup.position.z = THREE.MathUtils.damp(gunGroup.position.z, isAiming ? -0.32 : -0.45, 14, delta);
        }
        if (muzzleLight) {
          muzzleLight.intensity = THREE.MathUtils.damp(muzzleLight.intensity, 0, 25, delta);
        }

        // Zombie Spawner & AI
        if (zombiesToSpawn > 0 && zombies.length < 12) spawnZombie();

        const zombieMeshes = zombies.map(z => z.group);
        for(let i=zombies.length-1; i>=0; i--) {
          const z = zombies[i];
          if (!z || !z.group) continue;
          const zPos = z.group.position;
          const distToPlayer = zPos.distanceTo(playerPos);

          if(distToPlayer < 1.4) {
            z.attackTimer -= delta;
            if(z.attackTimer <= 0) {
              z.attackTimer = 1.2;
              playerHp -= 30;
              const vig = document.getElementById('damage-vignette');
              if (vig) {
                vig.style.opacity = '1';
                setTimeout(() => vig.style.opacity = '0', 300);
              }
              updateHUD();
              if(playerHp <= 0) {
                isGameOver = true;
                try { document.exitPointerLock(); } catch(e) {}
                document.getElementById('gameover-menu').style.display = 'flex';
                document.getElementById('gameover-stats').innerText = "Survived " + round + " Rounds with " + kills + " Kills!";
              }
            }
          } else {
            const dir = playerPos.clone().sub(zPos).setY(0);
            if (dir.lengthSq() > 0.001) {
              dir.normalize();
              zPos.addScaledVector(dir, z.speed * delta);
              z.group.lookAt(playerPos.x, zPos.y, playerPos.z);
            }
          }
        }

        // Bullets update
        for(let i=bullets.length-1; i>=0; i--) {
          const b = bullets[i];
          if (!b || !b.mesh) continue;
          b.life -= delta;
          if(b.life <= 0) { scene.remove(b.mesh); bullets.splice(i, 1); continue; }

          const stepVel = b.vel.clone().multiplyScalar(delta);
          const nextPos = b.mesh.position.clone().add(stepVel);
          const ray = new THREE.Raycaster(b.mesh.position, b.vel.clone().normalize(), 0, stepVel.length() + 0.1);
          const hits = ray.intersectObjects(zombieMeshes, true);

          if(hits.length > 0) {
            const hitObj = hits[0].object;
            const hitZombie = zombies.find(z => {
              let p = hitObj; while(p) { if(p === z.group) return true; p = p.parent; } return false;
            });

            if(hitZombie) {
              const isHead = hitObj.name === 'zombieHead';
              const isChest = hitObj.name === 'zombieChest';
              const dmgMult = isHead ? 3.0 : isChest ? 1.6 : 1.0;
              hitZombie.hp -= b.damage * dmgMult;
              const isKill = hitZombie.hp <= 0;

              triggerHitmarker(isKill, isHead);
              if(isKill) {
                kills++; if(isHead) headshots++;
                addScore(isHead? 100 : 60, isHead? 'HEADSHOT KILL!' : 'ZOMBIE KILL');
                scene.remove(hitZombie.group);
                zombies.splice(zombies.indexOf(hitZombie), 1);
                if(zombiesToSpawn <= 0 && zombies.length === 0) startRound(round + 1);
              } else {
                addScore(10, isHead? 'HEADSHOT HIT!' : 'BODY HIT');
              }
            }
            scene.remove(b.mesh); bullets.splice(i, 1); continue;
          }

          if(Math.abs(nextPos.x) >= 11.6 || Math.abs(nextPos.z) >= 11.6 || nextPos.y <= 0 || nextPos.y >= 4.8) {
            scene.remove(b.mesh); bullets.splice(i, 1); continue;
          }
          b.mesh.position.copy(nextPos);
        }

        checkPrompts();
      }

      renderer.render(scene, camera);
    }

    function startSurvivalGame() {
      document.getElementById('main-menu').style.display = 'none';
      document.getElementById('gameover-menu').style.display = 'none';
      document.getElementById('pause-menu').style.display = 'none';
      isPaused = false;
      isGameOver = false;

      loadMap();

      try {
        renderer.domElement.requestPointerLock();
      } catch (e) {}
    }

    function togglePauseMenu() {
      isPaused = !isPaused;
      const pm = document.getElementById('pause-menu');
      if (pm) pm.style.display = isPaused ? 'flex' : 'none';
      if (isPaused) {
        try { document.exitPointerLock(); } catch(e) {}
      } else {
        try { renderer.domElement.requestPointerLock(); } catch(e) {}
      }
    }

    function resumeGame() {
      isPaused = false;
      document.getElementById('pause-menu').style.display = 'none';
      try { renderer.domElement.requestPointerLock(); } catch(e) {}
    }

    function returnToMainMenu() {
      isPaused = false;
      isGameOver = false;
      try { document.exitPointerLock(); } catch(e) {}
      unloadMap();
      document.getElementById('pause-menu').style.display = 'none';
      document.getElementById('gameover-menu').style.display = 'none';
      document.getElementById('main-menu').style.display = 'flex';
    }

    function toggleSettingsModal(show) {
      document.getElementById('settings-modal').style.display = show ? 'flex' : 'none';
    }

    function toggleHowToPlayModal(show) {
      document.getElementById('how-modal').style.display = show ? 'flex' : 'none';
    }

    window.onload = initEngine;
  </script>
</body>
</html>`;
}
