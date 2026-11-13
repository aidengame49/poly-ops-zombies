import { crazyGames, gameStorage, STORAGE_KEYS } from './crazyGames';

export type DeviceMode = 'computer' | 'phone' | 'tablet';
export type DeviceModePreference = 'auto' | DeviceMode;
export type DeviceDetectionConfidence = 'high' | 'uncertain';

export type OptimizationProfile = 'phone_performance' | 'tablet_balanced' | 'desktop_quality';
export type OptimizationPreference = 'auto' | OptimizationProfile;

export interface OptimizationSpec {
  id: OptimizationProfile;
  label: string;
  shortLabel: string;
  description: string;
  maxPixelRatio: number;
  shadowsEnabled: boolean;
  softShadows: boolean;
  pointLightShadows: boolean;
  environmentLighting: boolean;
  lightBudget: 'essential' | 'balanced' | 'full';
  maxParticles: number;
  cameraFar: number;
  maxAnisotropy: number;
  hudSyncIntervalMs: number;
}

export const OPTIMIZATION_SPECS: Record<OptimizationProfile, OptimizationSpec> = {
  phone_performance: {
    id: 'phone_performance',
    label: 'Phone Performance (Ultra Smooth)',
    shortLabel: 'MOBILE FAST',
    description: '0.9x render scale, shadows off, high-visibility mobile lighting & capped particles for 60 FPS.',
    maxPixelRatio: 0.9,
    shadowsEnabled: false,
    softShadows: false,
    pointLightShadows: false,
    environmentLighting: false,
    lightBudget: 'essential',
    maxParticles: 35,
    cameraFar: 240,
    maxAnisotropy: 1,
    hudSyncIntervalMs: 80,
  },
  tablet_balanced: {
    id: 'tablet_balanced',
    label: 'Tablet Balanced',
    shortLabel: 'BALANCED',
    description: '1.25x render scale, fast directional shadows, boosted tablet lighting & medium particles.',
    maxPixelRatio: 1.25,
    shadowsEnabled: true,
    softShadows: false,
    pointLightShadows: false,
    environmentLighting: true,
    lightBudget: 'balanced',
    maxParticles: 85,
    cameraFar: 360,
    maxAnisotropy: 2,
    hudSyncIntervalMs: 50,
  },
  desktop_quality: {
    id: 'desktop_quality',
    label: 'Desktop High Fidelity',
    shortLabel: 'HIGH QUALITY',
    description: 'Up to 2.0x render scale, soft PCF shadows, full studio reflections & all dynamic lights.',
    maxPixelRatio: 2.0,
    shadowsEnabled: true,
    softShadows: true,
    pointLightShadows: true,
    environmentLighting: true,
    lightBudget: 'full',
    maxParticles: 200,
    cameraFar: 1000,
    maxAnisotropy: 4,
    hudSyncIntervalMs: 0,
  },
};

export function getDefaultOptimizationForDevice(mode: DeviceMode): OptimizationProfile {
  if (mode === 'phone') return 'phone_performance';
  if (mode === 'tablet') return 'tablet_balanced';
  return 'desktop_quality';
}

export interface DeviceState {
  detectedMode: DeviceMode;
  detectionConfidence: DeviceDetectionConfidence;
  preference: DeviceModePreference;
  effectiveMode: DeviceMode;
  optimizationPreference: OptimizationPreference;
  effectiveOptimization: OptimizationProfile;
  optimizationSpec: OptimizationSpec;
  needsDevicePrompt: boolean;
  isPortrait: boolean;
  needsLandscapeRotation: boolean;
  viewportWidth: number;
  viewportHeight: number;
  isTouchDevice: boolean;
}

function getQueryOverrides(): {
  device: DeviceModePreference | null;
  forcePrompt: boolean;
} {
  if (typeof window === 'undefined') return { device: null, forcePrompt: false };
  try {
    const params = new URLSearchParams(window.location.search);
    const val = params.get('device');
    const forcePrompt = params.get('devicePrompt') === 'true';
    const device =
      val === 'computer' || val === 'phone' || val === 'tablet' || val === 'auto' ? val : null;
    return { device, forcePrompt };
  } catch {
    return { device: null, forcePrompt: false };
  }
}

function readSavedPreference(): DeviceModePreference {
  const { device } = getQueryOverrides();
  if (device) return device;

  const saved = gameStorage.getItem(STORAGE_KEYS.DEVICE_MODE);
  if (saved === 'computer' || saved === 'phone' || saved === 'tablet' || saved === 'auto') {
    return saved;
  }
  return 'auto';
}

function readSavedOptimizationPreference(): OptimizationPreference {
  const saved = gameStorage.getItem(STORAGE_KEYS.OPTIMIZATION_MODE);
  if (
    saved === 'auto' ||
    saved === 'phone_performance' ||
    saved === 'tablet_balanced' ||
    saved === 'desktop_quality'
  ) {
    return saved;
  }
  return 'auto';
}

function hasConfirmedDeviceChoice(): boolean {
  const { device } = getQueryOverrides();
  if (device && device !== 'auto') return true;
  return gameStorage.getItem(STORAGE_KEYS.DEVICE_CONFIRMED) === '1';
}

export function detectHardwareDeviceMode(): {
  mode: DeviceMode;
  isTouchDevice: boolean;
  confidence: DeviceDetectionConfidence;
} {
  if (typeof window === 'undefined') {
    return { mode: 'computer', isTouchDevice: false, confidence: 'high' };
  }

  const ua = navigator.userAgent || '';
  const platform =
    (navigator as { userAgentData?: { platform?: string } }).userAgentData?.platform ||
    navigator.platform ||
    '';
  const maxTouchPoints = navigator.maxTouchPoints || 0;
  const isCoarsePointer = Boolean(window.matchMedia?.('(pointer: coarse)').matches);
  const isFinePointer = Boolean(window.matchMedia?.('(pointer: fine)').matches);
  const hasTouch = 'ontouchstart' in window || maxTouchPoints > 0 || isCoarsePointer;

  const vw = window.innerWidth || document.documentElement.clientWidth || 1024;
  const vh = window.innerHeight || document.documentElement.clientHeight || 768;
  const minDim = Math.min(vw, vh);

  // 1. Respect CrazyGames SDK device info if active on CrazyGames
  const cgType = crazyGames.getSdkDeviceType();
  if (cgType === 'mobile') return { mode: 'phone', isTouchDevice: true, confidence: 'high' };
  if (cgType === 'tablet') return { mode: 'tablet', isTouchDevice: true, confidence: 'high' };
  if (cgType === 'desktop') {
    return { mode: 'computer', isTouchDevice: hasTouch && isCoarsePointer, confidence: 'high' };
  }

  // 2. Explicit Phone User Agents
  const isPhoneUA =
    /iPhone|iPod|Windows Phone|BlackBerry|Opera Mini|IEMobile|Android.*Mobile|Mobile.*Firefox/i.test(ua);
  if (isPhoneUA) {
    return { mode: 'phone', isTouchDevice: true, confidence: 'high' };
  }

  // 3. Explicit Tablet User Agents (iPad, iPadOS MacIntel+Touch, Android Tablets)
  const isIpadOS = /Macintosh/i.test(ua) && maxTouchPoints > 1 && /Mac/i.test(platform);
  const isTabletUA =
    isIpadOS ||
    /iPad|PlayBook|Silk|Kindle|Tablet|Nexus 7|Nexus 9|Nexus 10|SM-T|Tab/i.test(ua) ||
    (/Android/i.test(ua) && !/Mobile/i.test(ua));
  if (isTabletUA) {
    return { mode: 'tablet', isTouchDevice: true, confidence: 'high' };
  }

  // 4. Hybrid / Ambiguous devices (2-in-1 touch laptops, Surface/Chromebook, unusual embedded WebViews,
  // or unknown desktop/mobile UAs where pointer/touch signals conflict) -> mark UNCERTAIN so startup prompt asks!
  const isExplicitDesktopUA = /Windows NT|Macintosh|X11|CrOS/i.test(ua);
  if (!ua.trim() || (!isExplicitDesktopUA && !isPhoneUA && !isTabletUA)) {
    return {
      mode: isCoarsePointer ? (minDim < 580 ? 'phone' : 'tablet') : 'computer',
      isTouchDevice: hasTouch,
      confidence: 'uncertain',
    };
  }

  // Hybrid touch-screen laptops or coarse-pointer desktop UAs -> uncertain until player confirms!
  if ((isExplicitDesktopUA && (isCoarsePointer || maxTouchPoints > 0)) || (hasTouch && isFinePointer)) {
    return {
      mode: isCoarsePointer && !isFinePointer ? (minDim < 580 ? 'phone' : 'tablet') : 'computer',
      isTouchDevice: true,
      confidence: 'uncertain',
    };
  }

  // 5. Coarse-pointer screen-size fallback
  if (isCoarsePointer || (hasTouch && !isFinePointer)) {
    return {
      mode: minDim < 580 ? 'phone' : 'tablet',
      isTouchDevice: true,
      confidence: 'uncertain',
    };
  }

  return { mode: 'computer', isTouchDevice: false, confidence: 'high' };
}

class DeviceManager {
  private preference: DeviceModePreference = 'auto';
  private optimizationPreference: OptimizationPreference = 'auto';
  private confirmed = false;
  private listeners = new Set<(state: DeviceState) => void>();
  private state: DeviceState;
  private initialized = false;

  constructor() {
    this.preference = readSavedPreference();
    this.optimizationPreference = readSavedOptimizationPreference();
    this.confirmed = hasConfirmedDeviceChoice();
    this.state = this.computeState();
  }

  private computeState(): DeviceState {
    const vw = typeof window !== 'undefined' ? window.innerWidth : 1280;
    const vh = typeof window !== 'undefined' ? window.innerHeight : 720;
    const { mode: detectedMode, isTouchDevice, confidence } = detectHardwareDeviceMode();
    const effectiveMode: DeviceMode = this.preference === 'auto' ? detectedMode : this.preference;
    const effectiveOptimization: OptimizationProfile =
      this.optimizationPreference === 'auto'
        ? getDefaultOptimizationForDevice(effectiveMode)
        : this.optimizationPreference;

    const { forcePrompt } = getQueryOverrides();
    const needsDevicePrompt =
      forcePrompt || (!this.confirmed && this.preference === 'auto' && confidence === 'uncertain');

    const isPortrait = vh > vw;
    // Rotation gate applies STRICTLY to Phone mode — never Tablet or Computer
    const needsLandscapeRotation = !needsDevicePrompt && effectiveMode === 'phone' && isPortrait;

    return {
      detectedMode,
      detectionConfidence: confidence,
      preference: this.preference,
      effectiveMode,
      optimizationPreference: this.optimizationPreference,
      effectiveOptimization,
      optimizationSpec: OPTIMIZATION_SPECS[effectiveOptimization],
      needsDevicePrompt,
      isPortrait,
      needsLandscapeRotation,
      viewportWidth: vw,
      viewportHeight: vh,
      isTouchDevice: effectiveMode !== 'computer' || isTouchDevice,
    };
  }

  public init() {
    if (this.initialized || typeof window === 'undefined') return;
    this.initialized = true;

    const refresh = () => {
      const next = this.computeState();
      const prev = this.state;
      if (
        next.detectedMode !== prev.detectedMode ||
        next.detectionConfidence !== prev.detectionConfidence ||
        next.preference !== prev.preference ||
        next.effectiveMode !== prev.effectiveMode ||
        next.optimizationPreference !== prev.optimizationPreference ||
        next.effectiveOptimization !== prev.effectiveOptimization ||
        next.needsDevicePrompt !== prev.needsDevicePrompt ||
        next.isPortrait !== prev.isPortrait ||
        next.needsLandscapeRotation !== prev.needsLandscapeRotation ||
        next.viewportWidth !== prev.viewportWidth ||
        next.viewportHeight !== prev.viewportHeight
      ) {
        this.state = next;
        this.emit();
      }
    };

    window.addEventListener('resize', refresh);
    window.addEventListener('orientationchange', () => {
      setTimeout(refresh, 60);
    });
    try {
      window.screen?.orientation?.addEventListener?.('change', refresh);
    } catch {
      // Ignore
    }
    refresh();
  }

  public getState(): DeviceState {
    return this.state;
  }

  public setPreference(pref: DeviceModePreference) {
    this.preference = pref;
    this.confirmed = true;
    gameStorage.setItem(STORAGE_KEYS.DEVICE_MODE, pref);
    gameStorage.setItem(STORAGE_KEYS.DEVICE_CONFIRMED, '1');
    this.state = this.computeState();
    this.emit();
  }

  public confirmStartupDevice(mode: DeviceMode) {
    this.preference = mode;
    this.optimizationPreference = 'auto'; // Auto-pairs optimal graphics profile with chosen device
    this.confirmed = true;
    gameStorage.setItem(STORAGE_KEYS.DEVICE_MODE, mode);
    gameStorage.setItem(STORAGE_KEYS.OPTIMIZATION_MODE, 'auto');
    gameStorage.setItem(STORAGE_KEYS.DEVICE_CONFIRMED, '1');
    this.state = this.computeState();
    this.emit();
  }

  public setOptimizationPreference(opt: OptimizationPreference) {
    this.optimizationPreference = opt;
    gameStorage.setItem(STORAGE_KEYS.OPTIMIZATION_MODE, opt);
    this.state = this.computeState();
    this.emit();
  }

  public refreshFromStorage() {
    this.preference = readSavedPreference();
    this.optimizationPreference = readSavedOptimizationPreference();
    this.confirmed = hasConfirmedDeviceChoice();
    this.state = this.computeState();
    this.emit();
  }

  public subscribe(listener: (state: DeviceState) => void): () => void {
    this.init();
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit() {
    this.listeners.forEach((fn) => {
      try {
        fn(this.state);
      } catch (e) {
        console.warn('DeviceMode listener error:', e);
      }
    });
  }

  public async tryLockLandscape(): Promise<void> {
    if (this.state.effectiveMode !== 'phone') return;
    try {
      const orientation = window.screen?.orientation as { lock?: (o: string) => Promise<void> } | undefined;
      if (orientation?.lock) {
        await orientation.lock('landscape');
      }
    } catch {
      // Browser may deny without fullscreen; phone rotation gate handles it cleanly
    }
  }
}

export const deviceManager = new DeviceManager();
