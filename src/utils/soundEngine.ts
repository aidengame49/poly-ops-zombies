/**
 * Procedural Audio Synthesizer for Poly-Ops Zombies
 * Uses standard Web Audio API - Zero external MP3/WAV dependencies!
 */

class SoundEngine {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private masterVolume: number = 0.8;

  constructor() {
    // AudioContext will be initialized on first user interaction
  }

  private initCtx() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
  }

  public setVolume(vol: number) {
    this.masterVolume = Math.max(0, Math.min(1, vol));
  }

  // Shoot sound based on weapon type, PaP state, and optional weapon ID
  public playShoot(type: string, isPap: boolean = false, weaponId?: string) {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;

    if (weaponId === 'railgun' || weaponId === 'cryo_cannon' || isPap || type === 'raygun') {
      // Plasma / Railgun / Cryo beam shoot sound
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = weaponId === 'railgun' ? 'square' : type === 'raygun' ? 'sawtooth' : 'sine';
      const startFreq = weaponId === 'railgun' ? 1600 : weaponId === 'cryo_cannon' ? 1050 : isPap ? 1200 : 800;
      const endFreq = weaponId === 'railgun' ? 90 : isPap ? 200 : 150;

      osc.frequency.setValueAtTime(startFreq, now);
      osc.frequency.exponentialRampToValueAtTime(endFreq, now + 0.16);

      gain.gain.setValueAtTime(0.28 * this.masterVolume, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.16);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.16);
      return;
    }

    if (type === 'launcher') {
      // Heavy launcher thump + whoosh
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(190, now);
      osc.frequency.exponentialRampToValueAtTime(45, now + 0.28);
      gain.gain.setValueAtTime(0.45 * this.masterVolume, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.28);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.28);
      return;
    }

    // Standard Bullet Guns
    const noiseBuffer = this.createNoiseBuffer(0.35);
    const noiseSource = this.ctx.createBufferSource();
    noiseSource.buffer = noiseBuffer;

    const noiseFilter = this.ctx.createBiquadFilter();
    noiseFilter.type = 'lowpass';

    let duration = 0.1;
    let freq = 1000;
    let volume = 0.3;

    if (weaponId === 'revolver' || weaponId === 'deagle') {
      duration = 0.22;
      freq = 1350;
      volume = 0.45;
    } else if (weaponId === 'minigun') {
      duration = 0.065;
      freq = 1200;
      volume = 0.26;
    } else if (type === 'shotgun') {
      duration = 0.25;
      freq = 600;
      volume = 0.5;
    } else if (type === 'sniper') {
      duration = 0.32;
      freq = 1600;
      volume = 0.55;
    } else if (type === 'lmg') {
      duration = 0.14;
      freq = 850;
      volume = 0.38;
    } else if (type === 'smg') {
      duration = 0.08;
      freq = 1400;
      volume = 0.25;
    } else if (type === 'ar') {
      duration = 0.12;
      freq = 1100;
      volume = 0.35;
    }

    noiseFilter.frequency.setValueAtTime(freq, now);
    noiseFilter.frequency.exponentialRampToValueAtTime(100, now + duration);

    const gainNode = this.ctx.createGain();
    gainNode.gain.setValueAtTime(volume * this.masterVolume, now);
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + duration);

    noiseSource.connect(noiseFilter);
    noiseFilter.connect(gainNode);
    gainNode.connect(this.ctx.destination);

    noiseSource.start(now);
    noiseSource.stop(now + duration);
  }

  // Reload sound
  public playReload() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    
    // Mechanical click 1
    const osc1 = this.ctx.createOscillator();
    const gain1 = this.ctx.createGain();
    osc1.type = 'triangle';
    osc1.frequency.setValueAtTime(800, now);
    osc1.frequency.exponentialRampToValueAtTime(300, now + 0.08);
    gain1.gain.setValueAtTime(0.2, now);
    gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.08);
    osc1.connect(gain1);
    gain1.connect(this.ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.08);

    // Mechanical click 2 (slide release)
    setTimeout(() => {
      if (!this.ctx) return;
      const t = this.ctx.currentTime;
      const osc2 = this.ctx.createOscillator();
      const gain2 = this.ctx.createGain();
      osc2.type = 'square';
      osc2.frequency.setValueAtTime(400, t);
      osc2.frequency.exponentialRampToValueAtTime(900, t + 0.1);
      gain2.gain.setValueAtTime(0.25, t);
      gain2.gain.exponentialRampToValueAtTime(0.01, t + 0.1);
      osc2.connect(gain2);
      gain2.connect(this.ctx.destination);
      osc2.start(t);
      osc2.stop(t + 0.1);
    }, 250);
  }

  // Hitmarker audio click/ding
  public playHitmarker(isKill: boolean = false, isHeadshot: boolean = false) {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    const baseFreq = isHeadshot ? 1600 : isKill ? 1200 : 800;
    osc.frequency.setValueAtTime(baseFreq, now);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.5, now + 0.06);

    const vol = isKill ? 0.35 : 0.15;
    gain.gain.setValueAtTime(vol, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.06);
  }

  // Zombie groan / attack sound
  public playZombieGrowl() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    const pitch = 80 + Math.random() * 40;
    osc.frequency.setValueAtTime(pitch, now);
    osc.frequency.linearRampToValueAtTime(pitch - 20, now + 0.4);

    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(350, now);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.4);
  }

  // Zombie attacks player (thud damage sound)
  public playPlayerHit() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(150, now);
    osc.frequency.exponentialRampToValueAtTime(40, now + 0.2);

    gain.gain.setValueAtTime(0.5, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.2);
  }

  // Board wooden plank repair / break sound
  public playPlankWood(isRepair: boolean = true) {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'square';
    const startFreq = isRepair ? 350 : 200;
    const endFreq = isRepair ? 550 : 90;

    osc.frequency.setValueAtTime(startFreq, now);
    osc.frequency.exponentialRampToValueAtTime(endFreq, now + 0.1);

    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(600, now);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.1);
  }

  // Perk Purchase Chime Jingle
  public playPerkJingle(perkType: string) {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const notes = perkType === 'juggernog'
      ? [261.63, 329.63, 392.00, 523.25] // Red C major triumph
      : perkType === 'speedCola'
      ? [392.00, 493.88, 587.33, 783.99] // Green G major speed
      : [329.63, 415.30, 493.88, 659.25]; // Yellow E major power

    notes.forEach((freq, idx) => {
      if (!this.ctx) return;
      const now = this.ctx.currentTime + idx * 0.1;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);

      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.25);
    });
  }

  // Hyper-Forge upgrade sound effect
  public playPackAPunch() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(100, now);
    osc.frequency.exponentialRampToValueAtTime(1200, now + 0.8);

    gain.gain.setValueAtTime(0.35, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.8);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.8);
  }

  // Round Change / Round Start Horror Bell Stinger
  public playRoundChange(isStart: boolean = true) {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    const startFreq = isStart ? 130.81 : 440; // Low C or A4 bell
    const endFreq = isStart ? 65.41 : 220;

    osc.frequency.setValueAtTime(startFreq, now);
    osc.frequency.exponentialRampToValueAtTime(endFreq, now + 1.2);

    gain.gain.setValueAtTime(0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 1.2);
  }

  public playExplosion() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const noiseBuffer = this.createNoiseBuffer(0.75);
    const noiseSource = this.ctx.createBufferSource();
    noiseSource.buffer = noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(700, now);
    filter.frequency.exponentialRampToValueAtTime(60, now + 0.7);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.65, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.75);

    noiseSource.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    noiseSource.start(now);
    noiseSource.stop(now + 0.75);
  }

  public playTeleport() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(280, now);
    osc.frequency.exponentialRampToValueAtTime(1400, now + 0.35);

    gain.gain.setValueAtTime(0.35, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.38);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.38);
  }

  public playFlashlightClick(isOn: boolean) {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(isOn ? 1400 : 950, now);
    osc.frequency.exponentialRampToValueAtTime(isOn ? 2100 : 520, now + 0.035);

    gain.gain.setValueAtTime(0.22 * this.masterVolume, now);
    gain.gain.exponentialRampToValueAtTime(0.005, now + 0.04);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.04);
  }

  private createNoiseBuffer(duration: number): AudioBuffer {
    if (!this.ctx) throw new Error('AudioContext not ready');
    const bufferSize = this.ctx.sampleRate * duration;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    return buffer;
  }
}

export const soundEngine = new SoundEngine();
