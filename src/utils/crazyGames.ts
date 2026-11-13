import { soundEngine } from './soundEngine';

export interface CrazyGamesUser {
  username: string;
  profilePictureUrl: string;
}

export interface CrazyGamesGameSettings {
  disableChat?: boolean;
  muteAudio?: boolean;
}

type CrazyGamesEnvironment = 'crazygames' | 'local' | 'disabled';

interface CrazyGamesSDKv3 {
  init: () => Promise<void>;
  environment: CrazyGamesEnvironment;
  game: {
    settings?: CrazyGamesGameSettings;
    isInstantMultiplayer?: boolean;
    inviteParams?: Record<string, string>;
    addSettingsChangeListener?: (listener: (settings: CrazyGamesGameSettings) => void) => void;
    removeSettingsChangeListener?: (listener: (settings: CrazyGamesGameSettings) => void) => void;
    loadingStart: () => void;
    loadingStop: () => void;
    gameplayStart: () => void;
    gameplayStop: () => void;
    happytime: () => void;
    reportGameCompletedPercentage?: (percentage: number) => void;
    setGameContext?: (context: Record<string, string | number | boolean>) => void;
    clearGameContext?: () => void;
    updateRoom?: (room: { roomId: string; isJoinable?: boolean }) => void;
    leftRoom?: () => void;
    addJoinRoomListener?: (listener: (roomId: string) => void) => void;
    removeJoinRoomListener?: (listener: (roomId: string) => void) => void;
    inviteLink?: (params: Record<string, string | number>) => string;
    getInviteParam?: (key: string) => string | null;
    showInviteButton?: (params: Record<string, string | number>) => string;
    hideInviteButton?: () => void;
  };
  ad: {
    requestAd: (
      type: 'midgame' | 'rewarded',
      callbacks: {
        adStarted?: () => void;
        adFinished?: () => void;
        adError?: (error: unknown) => void;
      }
    ) => void;
    hasAdblock: () => Promise<boolean>;
  };
  data: {
    clear: () => void;
    getItem: (key: string) => string | null;
    removeItem: (key: string) => void;
    setItem: (key: string, value: string) => void;
  };
  user: {
    isUserAccountAvailable: boolean;
    getUser: () => Promise<CrazyGamesUser | null>;
    addAuthListener: (listener: (user: CrazyGamesUser | null) => void) => void;
    removeAuthListener?: (listener: (user: CrazyGamesUser | null) => void) => void;
  };
}

declare global {
  interface Window {
    CrazyGames?: {
      SDK?: CrazyGamesSDKv3;
    };
  }
}

export const STORAGE_KEYS = {
  LOADOUT: 'polyops_player_loadout',
  SETTINGS: 'polyops_settings',
  RECORDS: 'polyops_records',
  SAVED_RUN: 'polyops_saved_run',
  CUSTOM_MAP_DRAFT: 'custom_zombies_map',
  CUSTOM_MAPS_LIST: 'custom_zombies_maps_list',
  MP_TOKEN: 'polyops_mp_token',
  MP_NAME: 'polyops_mp_name',
  MP_SERVER: 'polyops_mp_server',
  DEVICE_MODE: 'polyops_device_mode',
} as const;

const CRAZYGAMES_HOST_REGEX = /(^|\.)(crazygames\.[a-z.]+|1001juegos\.com|gioco\.it|spele\.nl)$/i;

function isCrazyGamesUrl(urlOrHost: string): boolean {
  if (!urlOrHost) return false;
  try {
    const hostname = urlOrHost.includes('://') ? new URL(urlOrHost).hostname : urlOrHost;
    return CRAZYGAMES_HOST_REGEX.test(hostname);
  } catch {
    return CRAZYGAMES_HOST_REGEX.test(urlOrHost);
  }
}

function getQueryFlags(): { isLocalQaParam: boolean; muteAudioParam: boolean; disableChatParam: boolean } {
  if (typeof window === 'undefined') {
    return { isLocalQaParam: false, muteAudioParam: false, disableChatParam: false };
  }
  try {
    const params = new URLSearchParams(window.location.search);
    return {
      isLocalQaParam: params.get('useLocalSdk') === 'true',
      muteAudioParam: params.get('muteAudio') === 'true',
      disableChatParam: params.get('disableChat') === 'true',
    };
  } catch {
    return { isLocalQaParam: false, muteAudioParam: false, disableChatParam: false };
  }
}

/**
 * Detects whether the game is running directly on CrazyGames OR inside an iframe
 * hosted on a CrazyGames website (via ancestorOrigins, document.referrer, or top origin).
 * Also respects CrazyGames' explicit `?useLocalSdk=true` QA parameter on localhost.
 */
export function detectCrazyGamesContext(): { isCrazyGamesSite: boolean; isLocalQaParam: boolean } {
  if (typeof window === 'undefined') {
    return { isCrazyGamesSite: false, isLocalQaParam: false };
  }

  const { isLocalQaParam } = getQueryFlags();

  // 1. Direct hostname check
  if (isCrazyGamesUrl(window.location.hostname)) {
    return { isCrazyGamesSite: true, isLocalQaParam };
  }

  // 2. Iframe ancestorOrigins check (Chromium / modern browsers)
  try {
    const ancestors = window.location.ancestorOrigins;
    if (ancestors && ancestors.length > 0) {
      for (let i = 0; i < ancestors.length; i++) {
        if (isCrazyGamesUrl(ancestors[i])) {
          return { isCrazyGamesSite: true, isLocalQaParam };
        }
      }
    }
  } catch {
    // Cross-origin restriction fallback handled below
  }

  // 3. document.referrer check (primary fallback when embedded inside CrazyGames iframe)
  try {
    if (typeof document !== 'undefined' && document.referrer && isCrazyGamesUrl(document.referrer)) {
      return { isCrazyGamesSite: true, isLocalQaParam };
    }
  } catch {
    // Ignore
  }

  // 4. Same-origin top window check
  try {
    if (window.top && window.top !== window && isCrazyGamesUrl(window.top.location.hostname)) {
      return { isCrazyGamesSite: true, isLocalQaParam };
    }
  } catch {
    // Cross-origin top frame (expected when our external host is embedded in CrazyGames iframe)
  }

  // 5. CrazyGames SDK explicit environment signal (never trusts 'disabled' or plain 'local' without param)
  const sdkEnv = window.CrazyGames?.SDK?.environment;
  if (sdkEnv === 'crazygames') {
    return { isCrazyGamesSite: true, isLocalQaParam };
  }

  return { isCrazyGamesSite: false, isLocalQaParam };
}

class CrazyGamesBridge {
  private initialized = false;
  private active = false;
  private environment: CrazyGamesEnvironment = 'disabled';
  private gameplayActive = false;
  private loadingStarted = false;
  private loadingStopped = false;
  private lastReportedCompletion = -1;
  private currentUser: CrazyGamesUser | null = null;
  private gameSettings: Required<CrazyGamesGameSettings> = {
    disableChat: false,
    muteAudio: false,
  };
  private settingsChangeHandler: ((settings: CrazyGamesGameSettings) => void) | null = null;
  private joinRoomHandler: ((roomId: string) => void) | null = null;
  private joinRoomListeners = new Set<(roomId: string) => void>();
  private lastAdTimestamp = 0;
  private stateListeners = new Set<() => void>();

  public get isActive(): boolean {
    return this.active;
  }

  public get isInitialized(): boolean {
    return this.initialized;
  }

  public get user(): CrazyGamesUser | null {
    return this.currentUser;
  }

  public get sdkEnvironment(): CrazyGamesEnvironment {
    return this.environment;
  }

  public get isMuteAudioEnforced(): boolean {
    return this.active && this.gameSettings.muteAudio;
  }

  public get isChatDisabled(): boolean {
    return this.active && this.gameSettings.disableChat;
  }

  public get isInstantMultiplayer(): boolean {
    if (!this.active) return false;
    const sdk = window.CrazyGames?.SDK;
    if (sdk?.game?.isInstantMultiplayer) return true;
    try {
      return new URLSearchParams(window.location.search).get('instantMultiplayer') === 'true';
    } catch {
      return false;
    }
  }

  public getInviteRoomId(): string | null {
    if (this.active) {
      const sdk = window.CrazyGames?.SDK;
      try {
        const param = sdk?.game?.getInviteParam?.('roomId') || sdk?.game?.inviteParams?.roomId;
        if (param) return String(param);
      } catch {
        // Ignore
      }
    }
    try {
      const urlParam = new URLSearchParams(window.location.search).get('roomId');
      return urlParam || null;
    } catch {
      return null;
    }
  }

  public getSdkDeviceType(): 'desktop' | 'tablet' | 'mobile' | null {
    if (!this.active || typeof window === 'undefined') return null;
    try {
      const sdk = window.CrazyGames?.SDK as
        | { user?: { systemInfo?: { device?: { type?: string } } } }
        | undefined;
      const t = sdk?.user?.systemInfo?.device?.type;
      if (t === 'desktop' || t === 'tablet' || t === 'mobile') return t;
    } catch {
      // Ignore
    }
    return null;
  }

  public subscribeJoinRoom(listener: (roomId: string) => void): () => void {
    this.joinRoomListeners.add(listener);
    return () => this.joinRoomListeners.delete(listener);
  }

  public subscribe(listener: () => void): () => void {
    this.stateListeners.add(listener);
    return () => this.stateListeners.delete(listener);
  }

  private notifyListeners() {
    this.stateListeners.forEach((fn) => {
      try {
        fn();
      } catch (e) {
        console.warn('CrazyGames listener error:', e);
      }
    });
  }

  private applyGameSettings(raw?: CrazyGamesGameSettings) {
    if (!this.active) {
      soundEngine.setPlatformMuted(false);
      return;
    }
    const { muteAudioParam, disableChatParam } = getQueryFlags();
    const nextMuteAudio = Boolean(raw?.muteAudio) || muteAudioParam;
    const nextDisableChat = Boolean(raw?.disableChat) || disableChatParam;

    this.gameSettings = {
      muteAudio: nextMuteAudio,
      disableChat: nextDisableChat,
    };
    soundEngine.setPlatformMuted(nextMuteAudio);
    this.notifyListeners();
  }

  public async init(): Promise<void> {
    if (this.initialized) return;

    const { isCrazyGamesSite, isLocalQaParam } = detectCrazyGamesContext();
    const sdk = typeof window !== 'undefined' ? window.CrazyGames?.SDK : undefined;

    // Only activate CrazyGames SDK when on CrazyGames (direct/iframe) or explicit ?useLocalSdk=true QA mode
    if (!sdk || (!isCrazyGamesSite && !isLocalQaParam)) {
      this.active = false;
      this.environment = 'disabled';
      this.initialized = true;
      soundEngine.setPlatformMuted(false);
      return;
    }

    try {
      await Promise.race([
        sdk.init(),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('CrazyGames SDK init timed out')), 6000)
        ),
      ]);
      this.environment = sdk.environment || 'disabled';

      // Enforce domain restriction: never run SDK calls if SDK itself reports 'disabled'
      // and never treat plain localhost/non-CG site as CrazyGames unless on CG site or ?useLocalSdk=true
      if (this.environment === 'crazygames' || (this.environment === 'local' && (isCrazyGamesSite || isLocalQaParam))) {
        this.active = true;
      } else {
        this.active = false;
        this.initialized = true;
        soundEngine.setPlatformMuted(false);
        return;
      }

      if (typeof sdk.game?.loadingStart === 'function') {
        try {
          sdk.game.loadingStart();
          this.loadingStarted = true;
        } catch {
          // Ignore if not supported in local QA mock
        }
      }

      // Apply initial CrazyGames game.settings (muteAudio, disableChat) & subscribe to changes
      this.applyGameSettings(sdk.game?.settings);
      if (typeof sdk.game?.addSettingsChangeListener === 'function') {
        this.settingsChangeHandler = (newSettings) => {
          this.applyGameSettings(newSettings);
        };
        try {
          sdk.game.addSettingsChangeListener(this.settingsChangeHandler);
        } catch (err) {
          console.warn('CrazyGames settings listener unavailable:', err);
        }
      }

      // Fetch user & listen for sign-ins (so cloud Data Module sync updates game state automatically)
      if (sdk.user) {
        try {
          if (sdk.user.isUserAccountAvailable && typeof sdk.user.getUser === 'function') {
            this.currentUser = await sdk.user.getUser();
          }
          if (typeof sdk.user.addAuthListener === 'function') {
            sdk.user.addAuthListener((user) => {
              this.currentUser = user;
              this.notifyListeners();
            });
          }
        } catch (err) {
          console.warn('CrazyGames user info unavailable:', err);
        }
      }

      // Listen for CrazyGames mid-session room invite joins
      if (typeof sdk.game?.addJoinRoomListener === 'function') {
        this.joinRoomHandler = (roomId: string) => {
          if (!roomId) return;
          this.joinRoomListeners.forEach((fn) => {
            try {
              fn(roomId);
            } catch (e) {
              console.warn('CrazyGames joinRoom listener error:', e);
            }
          });
        };
        try {
          sdk.game.addJoinRoomListener(this.joinRoomHandler);
        } catch (err) {
          console.warn('CrazyGames addJoinRoomListener unavailable:', err);
        }
      }
    } catch (err) {
      console.warn('CrazyGames SDK init bypassed:', err);
      this.active = false;
      this.environment = 'disabled';
      soundEngine.setPlatformMuted(false);
    } finally {
      this.initialized = true;
      this.notifyListeners();
    }
  }

  public finishLoading() {
    if (!this.active || this.loadingStopped) return;
    const sdk = window.CrazyGames?.SDK;
    if (!sdk || typeof sdk.game?.loadingStop !== 'function') {
      this.loadingStopped = true;
      return;
    }
    try {
      if (!this.loadingStarted && typeof sdk.game?.loadingStart === 'function') {
        sdk.game.loadingStart();
        this.loadingStarted = true;
      }
      sdk.game.loadingStop();
      this.loadingStopped = true;
    } catch (e) {
      console.warn('CrazyGames loadingStop skipped:', e);
      this.loadingStopped = true;
    }
  }

  public startGameplay() {
    if (!this.active || this.gameplayActive) return;
    if (!this.loadingStopped) {
      this.finishLoading();
    }
    const sdk = window.CrazyGames?.SDK;
    if (!sdk || typeof sdk.game?.gameplayStart !== 'function') return;
    try {
      sdk.game.gameplayStart();
      this.gameplayActive = true;
    } catch (e) {
      console.warn('CrazyGames gameplayStart skipped:', e);
    }
  }

  public stopGameplay() {
    if (!this.active || !this.gameplayActive) return;
    const sdk = window.CrazyGames?.SDK;
    if (!sdk || typeof sdk.game?.gameplayStop !== 'function') return;
    try {
      sdk.game.gameplayStop();
      this.gameplayActive = false;
    } catch (e) {
      console.warn('CrazyGames gameplayStop skipped:', e);
    }
  }

  public triggerHappyTime() {
    if (!this.active) return;
    const sdk = window.CrazyGames?.SDK;
    if (!sdk || typeof sdk.game?.happytime !== 'function') return;
    try {
      sdk.game.happytime();
    } catch (e) {
      console.warn('CrazyGames happytime skipped:', e);
    }
  }

  public reportCompletion(percentage: number) {
    if (!this.active) return;
    const clamped = Math.max(0, Math.min(100, Math.round(percentage)));
    if (clamped <= this.lastReportedCompletion) return;
    const sdk = window.CrazyGames?.SDK;
    if (!sdk || typeof sdk.game?.reportGameCompletedPercentage !== 'function') return;
    try {
      sdk.game.reportGameCompletedPercentage(clamped);
      this.lastReportedCompletion = clamped;
    } catch (e) {
      console.warn('CrazyGames reportGameCompletedPercentage skipped:', e);
    }
  }

  public setGameContext(context: Record<string, string | number | boolean>) {
    if (!this.active) return;
    const sdk = window.CrazyGames?.SDK;
    if (!sdk || typeof sdk.game?.setGameContext !== 'function') return;
    try {
      sdk.game.setGameContext(context);
    } catch (e) {
      console.warn('CrazyGames setGameContext skipped:', e);
    }
  }

  public clearGameContext() {
    if (!this.active) return;
    const sdk = window.CrazyGames?.SDK;
    if (!sdk || typeof sdk.game?.clearGameContext !== 'function') return;
    try {
      sdk.game.clearGameContext();
    } catch (e) {
      console.warn('CrazyGames clearGameContext skipped:', e);
    }
  }

  public updateRoom(roomId: string, isJoinable: boolean) {
    if (!this.active) return;
    const sdk = window.CrazyGames?.SDK;
    if (!sdk) return;
    try {
      if (typeof sdk.game?.updateRoom === 'function') {
        sdk.game.updateRoom({ roomId, isJoinable });
      }
      if (isJoinable && typeof sdk.game?.showInviteButton === 'function') {
        sdk.game.showInviteButton({ roomId });
      } else if (!isJoinable && typeof sdk.game?.hideInviteButton === 'function') {
        sdk.game.hideInviteButton();
      }
    } catch (e) {
      console.warn('CrazyGames updateRoom skipped:', e);
    }
  }

  public leftRoom() {
    if (!this.active) return;
    const sdk = window.CrazyGames?.SDK;
    if (!sdk) return;
    try {
      if (typeof sdk.game?.hideInviteButton === 'function') {
        sdk.game.hideInviteButton();
      }
      if (typeof sdk.game?.leftRoom === 'function') {
        sdk.game.leftRoom();
      }
    } catch (e) {
      console.warn('CrazyGames leftRoom skipped:', e);
    }
  }

  public getInviteLink(roomId: string): string {
    if (this.active) {
      const sdk = window.CrazyGames?.SDK;
      if (typeof sdk?.game?.inviteLink === 'function') {
        try {
          const link = sdk.game.inviteLink({ roomId });
          if (link) return link;
        } catch (e) {
          console.warn('CrazyGames inviteLink fallback:', e);
        }
      }
    }
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('roomId', roomId);
      return url.toString();
    }
    return `?roomId=${encodeURIComponent(roomId)}`;
  }

  public requestMidgameAd(): Promise<void> {
    if (!this.active) return Promise.resolve();
    const sdk = window.CrazyGames?.SDK;
    if (!sdk || typeof sdk.ad?.requestAd !== 'function') return Promise.resolve();

    // Respect reasonable cooldown (at least 90s between midgame ads)
    const now = Date.now();
    if (now - this.lastAdTimestamp < 90_000) {
      return Promise.resolve();
    }

    this.stopGameplay();
    if (document.pointerLockElement) {
      try {
        document.exitPointerLock();
      } catch {
        // Ignore
      }
    }

    return new Promise((resolve) => {
      const wasMuted = soundEngine.getMuted();
      let settled = false;
      const finish = () => {
        if (settled) return;
        settled = true;
        this.lastAdTimestamp = Date.now();
        // Restore user's mute flag; SoundEngine keeps platformMuted enforced if SDK muteAudio is true
        soundEngine.setMuted(wasMuted);
        resolve();
      };

      try {
        sdk.ad.requestAd('midgame', {
          adStarted: () => {
            soundEngine.setMuted(true);
          },
          adFinished: () => {
            finish();
          },
          adError: () => {
            finish();
          },
        });
      } catch {
        finish();
      }
    });
  }
}

export const crazyGames = new CrazyGamesBridge();

/**
 * Unified storage adapter:
 * - On CrazyGames: strictly relies on window.CrazyGames.SDK.data (Data Module) for both guest and logged-in users.
 * - Elsewhere: falls back to standard window.localStorage.
 */
export const gameStorage = {
  getItem(key: string): string | null {
    if (crazyGames.isActive && window.CrazyGames?.SDK?.data) {
      try {
        return window.CrazyGames.SDK.data.getItem(key);
      } catch (e) {
        console.warn(`CrazyGames data.getItem("${key}") failed:`, e);
        return null;
      }
    }
    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  },

  setItem(key: string, value: string): boolean {
    // Enforce CrazyGames 1MB safety guard (~950KB headroom)
    if (value.length > 950_000) {
      console.warn(`Skipping save for "${key}": payload exceeds safe storage size.`);
      return false;
    }

    if (crazyGames.isActive && window.CrazyGames?.SDK?.data) {
      try {
        window.CrazyGames.SDK.data.setItem(key, value);
        return true;
      } catch (e) {
        console.warn(`CrazyGames data.setItem("${key}") failed:`, e);
        return false;
      }
    }

    try {
      window.localStorage.setItem(key, value);
      return true;
    } catch {
      return false;
    }
  },

  removeItem(key: string): void {
    if (crazyGames.isActive && window.CrazyGames?.SDK?.data) {
      try {
        window.CrazyGames.SDK.data.removeItem(key);
        return;
      } catch (e) {
        console.warn(`CrazyGames data.removeItem("${key}") failed:`, e);
        return;
      }
    }
    try {
      window.localStorage.removeItem(key);
    } catch {
      // Ignore
    }
  },

  getJSON<T>(key: string): T | null {
    const raw = this.getItem(key);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  },

  setJSON(key: string, value: unknown): boolean {
    try {
      return this.setItem(key, JSON.stringify(value));
    } catch {
      return false;
    }
  },
};
