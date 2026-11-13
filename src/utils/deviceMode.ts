import { crazyGames, gameStorage, STORAGE_KEYS } from './crazyGames';

export type DeviceMode = 'computer' | 'phone' | 'tablet';
export type DeviceModePreference = 'auto' | DeviceMode;

export interface DeviceState {
  detectedMode: DeviceMode;
  preference: DeviceModePreference;
  effectiveMode: DeviceMode;
  isPortrait: boolean;
  needsLandscapeRotation: boolean;
  viewportWidth: number;
  viewportHeight: number;
  isTouchDevice: boolean;
}

function getQueryDeviceOverride(): DeviceModePreference | null {
  if (typeof window === 'undefined') return null;
  try {
    const val = new URLSearchParams(window.location.search).get('device');
    if (val === 'computer' || val === 'phone' || val === 'tablet' || val === 'auto') {
      return val;
    }
  } catch {
    // Ignore
  }
  return null;
}

function readSavedPreference(): DeviceModePreference {
  const queryOverride = getQueryDeviceOverride();
  if (queryOverride) return queryOverride;

  const saved = gameStorage.getItem(STORAGE_KEYS.DEVICE_MODE);
  if (saved === 'computer' || saved === 'phone' || saved === 'tablet' || saved === 'auto') {
    return saved;
  }
  return 'auto';
}

export function detectHardwareDeviceMode(): { mode: DeviceMode; isTouchDevice: boolean } {
  if (typeof window === 'undefined') {
    return { mode: 'computer', isTouchDevice: false };
  }

  const ua = navigator.userAgent || '';
  const platform = (navigator as { userAgentData?: { platform?: string } }).userAgentData?.platform || navigator.platform || '';
  const maxTouchPoints = navigator.maxTouchPoints || 0;
  const isCoarsePointer = Boolean(window.matchMedia?.('(pointer: coarse)').matches);
  const isFinePointer = Boolean(window.matchMedia?.('(pointer: fine)').matches);
  const hasTouch = 'ontouchstart' in window || maxTouchPoints > 0 || isCoarsePointer;

  const vw = window.innerWidth || document.documentElement.clientWidth || 1024;
  const vh = window.innerHeight || document.documentElement.clientHeight || 768;
  const minDim = Math.min(vw, vh);

  // 1. Respect CrazyGames SDK device info if active on CrazyGames
  const cgType = crazyGames.getSdkDeviceType();
  if (cgType === 'mobile') return { mode: 'phone', isTouchDevice: true };
  if (cgType === 'tablet') return { mode: 'tablet', isTouchDevice: true };
  if (cgType === 'desktop') return { mode: 'computer', isTouchDevice: hasTouch && isCoarsePointer };

  // 2. Explicit Phone User Agents (keep phone mode regardless of portrait/landscape)
  const isPhoneUA = /iPhone|iPod|Windows Phone|BlackBerry|Opera Mini|IEMobile|Android.*Mobile|Mobile.*Firefox/i.test(ua);
  if (isPhoneUA) {
    return { mode: 'phone', isTouchDevice: true };
  }

  // 3. Explicit Tablet User Agents (iPad, iPadOS 13+ reporting MacIntel with touch, Android tablets)
  const isIpadOS = /Macintosh/i.test(ua) && maxTouchPoints > 1 && /Mac/i.test(platform);
  const isTabletUA =
    isIpadOS ||
    /iPad|PlayBook|Silk|Kindle|Tablet|Nexus 7|Nexus 9|Nexus 10|SM-T|Tab/i.test(ua) ||
    (/Android/i.test(ua) && !/Mobile/i.test(ua));
  if (isTabletUA) {
    return { mode: 'tablet', isTouchDevice: true };
  }

  // 4. Touch-first / Coarse-pointer screen size heuristic (DevTools emulation, foldables, small touchscreens)
  if (isCoarsePointer || (hasTouch && !isFinePointer)) {
    return {
      mode: minDim < 580 ? 'phone' : 'tablet',
      isTouchDevice: true,
    };
  }

  return { mode: 'computer', isTouchDevice: false };
}

class DeviceManager {
  private preference: DeviceModePreference = 'auto';
  private listeners = new Set<(state: DeviceState) => void>();
  private state: DeviceState;
  private initialized = false;

  constructor() {
    this.preference = readSavedPreference();
    this.state = this.computeState();
  }

  private computeState(): DeviceState {
    const vw = typeof window !== 'undefined' ? window.innerWidth : 1280;
    const vh = typeof window !== 'undefined' ? window.innerHeight : 720;
    const { mode: detectedMode, isTouchDevice } = detectHardwareDeviceMode();
    const effectiveMode: DeviceMode = this.preference === 'auto' ? detectedMode : this.preference;
    const isPortrait = vh > vw;
    // Rotation gate applies STRICTLY to Phone mode — never Tablet or Computer
    const needsLandscapeRotation = effectiveMode === 'phone' && isPortrait;

    return {
      detectedMode,
      preference: this.preference,
      effectiveMode,
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
        next.preference !== prev.preference ||
        next.effectiveMode !== prev.effectiveMode ||
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
    gameStorage.setItem(STORAGE_KEYS.DEVICE_MODE, pref);
    this.state = this.computeState();
    this.emit();
  }

  public refreshFromStorage() {
    this.preference = readSavedPreference();
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
