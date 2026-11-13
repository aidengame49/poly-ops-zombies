import { crazyGames, gameStorage, STORAGE_KEYS } from './crazyGames';
import { P2pMultiplayerRelay } from './p2pMultiplayerRelay';
import type { CustomMapConfig, PlayerLoadout } from '../types/game';
import type {
  ClientToServerMessage,
  FriendEntry,
  FriendRequestEntry,
  MultiplayerRoomState,
  NetBarrierDef,
  NetSolidBox,
  NetSpawnerPos,
  PlayerProfile,
  PublicRoomSummary,
  RoomInviteEntry,
  ServerToClientMessage,
} from '../types/multiplayer';

type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';
export type MultiplayerTransportMode = 'server' | 'relay';

export interface SocialNotice {
  id: string;
  level: 'info' | 'success' | 'error';
  message: string;
}

export interface UnavailableRoomModalState {
  reason: 'not_found' | 'full' | 'in_progress' | 'ended';
  title: string;
  message: string;
}

const CLIENT_PROFANITY_REGEX = /\b(fuck|shit|bitch|asshole|bastard|cunt|dick|cock|pussy|whore|slut|fag|faggot|nigger|nigga|retard|kike|spic|chink|twat|wanker)\b/gi;
export function filterProfanityText(input: string): string {
  return input.replace(CLIENT_PROFANITY_REGEX, (m) => '*'.repeat(m.length));
}

type WorldSnapshotMsg = Extract<ServerToClientMessage, { type: 'world:snapshot' }>;
type MatchStartedMsg = Extract<ServerToClientMessage, { type: 'room:matchStarted' }>;
type BarrierUpdatedMsg = Extract<ServerToClientMessage, { type: 'barrier:updated' }>;
type ZombieKilledMsg = Extract<ServerToClientMessage, { type: 'zombie:killed' }>;
type ZombieHitConfirmMsg = Extract<ServerToClientMessage, { type: 'zombie:hitConfirm' }>;
type ZombieAttackMsg = Extract<ServerToClientMessage, { type: 'zombie:attackPlayer' }>;
type ShootFxMsg = Extract<ServerToClientMessage, { type: 'fx:shoot' }>;
type GrenadeThrowFxMsg = Extract<ServerToClientMessage, { type: 'fx:grenadeThrow' }>;
type GrenadeDetonateFxMsg = Extract<ServerToClientMessage, { type: 'fx:grenadeDetonate' }>;
type BarrelExplodeFxMsg = Extract<ServerToClientMessage, { type: 'fx:barrelExplode' }>;
type PlayerRevivedMsg = Extract<ServerToClientMessage, { type: 'player:revived' }>;
type RoundStartedMsg = Extract<ServerToClientMessage, { type: 'round:started' }>;
type GameOverMsg = Extract<ServerToClientMessage, { type: 'room:gameOver' }>;

export interface MultiplayerGameHooks {
  onMatchStarted?: (msg: MatchStartedMsg) => void;
  onWorldSnapshot?: (msg: WorldSnapshotMsg) => void;
  onBarrierUpdated?: (msg: BarrierUpdatedMsg) => void;
  onZombieKilled?: (msg: ZombieKilledMsg) => void;
  onZombieHitConfirm?: (msg: ZombieHitConfirmMsg) => void;
  onAttackedByZombie?: (msg: ZombieAttackMsg) => void;
  onShootFx?: (msg: ShootFxMsg) => void;
  onGrenadeThrowFx?: (msg: GrenadeThrowFxMsg) => void;
  onGrenadeDetonateFx?: (msg: GrenadeDetonateFxMsg) => void;
  onBarrelExplodeFx?: (msg: BarrelExplodeFxMsg) => void;
  onPlayerRevived?: (msg: PlayerRevivedMsg) => void;
  onRoundStarted?: (msg: RoundStartedMsg) => void;
  onGameOver?: (msg: GameOverMsg) => void;
}

const TAB_ID_KEY = 'polyops_tab_id';
const SESSION_TOKEN_KEY = 'polyops_mp_session_token';
const SESSION_PLAYER_ID_KEY = 'polyops_mp_session_player_id';
const TAB_LEASE_KEY = 'polyops_mp_tab_lease';
const TAB_LEASE_TTL_MS = 9000;

function generateRandomToken(): string {
  return typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `op_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 12)}`;
}

let cachedTabId: string | null = null;
function getTabId(): string {
  if (cachedTabId) return cachedTabId;
  if (typeof window === 'undefined') return 'ssr';
  try {
    const existing = window.sessionStorage.getItem(TAB_ID_KEY);
    if (existing) {
      cachedTabId = existing;
      return existing;
    }
    const created = `tab_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
    window.sessionStorage.setItem(TAB_ID_KEY, created);
    cachedTabId = created;
    return created;
  } catch {
    cachedTabId = `tab_${Math.random().toString(36).slice(2, 8)}`;
    return cachedTabId;
  }
}

let isHoldingPrimaryLease = false;
let leaseHeartbeatStarted = false;

function refreshPrimaryTabLease() {
  if (typeof window === 'undefined' || !isHoldingPrimaryLease) return;
  try {
    window.localStorage.setItem(
      TAB_LEASE_KEY,
      JSON.stringify({ tabId: getTabId(), ts: Date.now() })
    );
  } catch {
    // Ignore storage errors
  }
}

function ensureLeaseLifecycleHooks() {
  if (typeof window === 'undefined' || leaseHeartbeatStarted) return;
  leaseHeartbeatStarted = true;
  setInterval(() => {
    if (isHoldingPrimaryLease && !crazyGames.isActive) {
      refreshPrimaryTabLease();
    }
  }, 3000);
  window.addEventListener('beforeunload', () => {
    if (!isHoldingPrimaryLease) return;
    try {
      const raw = window.localStorage.getItem(TAB_LEASE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as { tabId?: string };
        if (parsed.tabId === getTabId()) {
          window.localStorage.removeItem(TAB_LEASE_KEY);
        }
      }
    } catch {
      // Ignore
    }
  });
}

function getOrCreateAuthToken(): string {
  if (crazyGames.isActive || typeof window === 'undefined') {
    const existing = gameStorage.getItem(STORAGE_KEYS.MP_TOKEN);
    if (existing && existing.length >= 8) return existing;
    const generated = generateRandomToken();
    gameStorage.setItem(STORAGE_KEYS.MP_TOKEN, generated);
    return generated;
  }

  ensureLeaseLifecycleHooks();

  try {
    const sessionTok = window.sessionStorage.getItem(SESSION_TOKEN_KEY);
    if (sessionTok && sessionTok.length >= 8) {
      isHoldingPrimaryLease = false;
      return sessionTok;
    }
  } catch {
    // Ignore
  }

  const myTabId = getTabId();
  let otherTabActive = false;
  try {
    const rawLease = window.localStorage.getItem(TAB_LEASE_KEY);
    if (rawLease) {
      const parsed = JSON.parse(rawLease) as { tabId?: string; ts?: number };
      if (
        parsed.tabId &&
        parsed.tabId !== myTabId &&
        typeof parsed.ts === 'number' &&
        Date.now() - parsed.ts < TAB_LEASE_TTL_MS
      ) {
        otherTabActive = true;
      }
    }
  } catch {
    // Ignore
  }

  if (otherTabActive) {
    const isoToken = generateRandomToken();
    try {
      window.sessionStorage.setItem(SESSION_TOKEN_KEY, isoToken);
    } catch {
      // Ignore
    }
    isHoldingPrimaryLease = false;
    return isoToken;
  }

  isHoldingPrimaryLease = true;
  refreshPrimaryTabLease();

  const existing = gameStorage.getItem(STORAGE_KEYS.MP_TOKEN);
  if (existing && existing.length >= 8) return existing;
  const generated = generateRandomToken();
  gameStorage.setItem(STORAGE_KEYS.MP_TOKEN, generated);
  return generated;
}

function isTabIsolatedSession(): boolean {
  if (crazyGames.isActive || typeof window === 'undefined') return false;
  try {
    return Boolean(window.sessionStorage.getItem(SESSION_TOKEN_KEY));
  } catch {
    return false;
  }
}

function getStoredPreferredPlayerId(): string | undefined {
  if (crazyGames.isActive || typeof window === 'undefined') return undefined;
  try {
    const sessionTok = window.sessionStorage.getItem(SESSION_TOKEN_KEY);
    if (sessionTok) {
      const spid = window.sessionStorage.getItem(SESSION_PLAYER_ID_KEY);
      return spid && /^\d{8}$/.test(spid) ? spid : undefined;
    }
  } catch {
    // Ignore
  }
  const pid = gameStorage.getItem(STORAGE_KEYS.MP_PLAYER_ID);
  return pid && /^\d{8}$/.test(pid) ? pid : undefined;
}

function savePreferredPlayerId(playerId: string) {
  if (crazyGames.isActive || typeof window === 'undefined') return;
  if (!/^\d{8}$/.test(playerId)) return;
  try {
    const sessionTok = window.sessionStorage.getItem(SESSION_TOKEN_KEY);
    if (sessionTok) {
      window.sessionStorage.setItem(SESSION_PLAYER_ID_KEY, playerId);
      return;
    }
  } catch {
    // Ignore
  }
  gameStorage.setItem(STORAGE_KEYS.MP_PLAYER_ID, playerId);
}

function hasExplicitServerConfig(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const param = new URLSearchParams(window.location.search).get('mpServer');
    if (param && param.trim()) return true;
  } catch {
    // Ignore
  }
  const saved = gameStorage.getItem(STORAGE_KEYS.MP_SERVER);
  if (saved && saved.trim()) return true;
  const envUrl = (import.meta as { env?: Record<string, string | undefined> }).env?.VITE_MULTIPLAYER_SERVER_URL;
  return Boolean(envUrl && envUrl.trim());
}

function resolveDefaultWsUrl(): string {
  if (typeof window === 'undefined') return 'ws://localhost:3000/ws';

  try {
    const param = new URLSearchParams(window.location.search).get('mpServer');
    if (param && param.trim()) {
      return normalizeWsUrl(param.trim());
    }
  } catch {
    // Ignore
  }

  const saved = gameStorage.getItem(STORAGE_KEYS.MP_SERVER);
  if (saved && saved.trim()) {
    return normalizeWsUrl(saved.trim());
  }

  const envUrl = (import.meta as { env?: Record<string, string | undefined> }).env?.VITE_MULTIPLAYER_SERVER_URL;
  if (envUrl && envUrl.trim()) {
    return normalizeWsUrl(envUrl.trim());
  }

  const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${proto}//${window.location.host}/ws`;
}

export function normalizeWsUrl(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return resolveDefaultWsUrl();

  const wasHttp = trimmed.startsWith('http://') || trimmed.startsWith('https://');
  const hadProtocol = trimmed.startsWith('ws://') || trimmed.startsWith('wss://') || wasHttp;

  let url = trimmed;
  if (url.startsWith('https://')) url = 'wss://' + url.slice('https://'.length);
  else if (url.startsWith('http://')) url = 'ws://' + url.slice('http://'.length);
  else if (!hadProtocol) url = `wss://${url}`;

  try {
    const parsed = new URL(url);
    if (wasHttp || !hadProtocol) {
      parsed.pathname = parsed.pathname.endsWith('/ws') ? parsed.pathname : '/ws';
      parsed.search = '';
      parsed.hash = '';
    } else if (!parsed.pathname || parsed.pathname === '/') {
      parsed.pathname = '/ws';
    }
    return parsed.toString();
  } catch {
    return url;
  }
}

function toHealthCheckUrl(wsUrl: string): string | null {
  try {
    const parsed = new URL(wsUrl);
    parsed.protocol = parsed.protocol === 'wss:' ? 'https:' : 'http:';
    parsed.pathname = '/api/health';
    parsed.search = '';
    parsed.hash = '';
    return parsed.toString();
  } catch {
    return null;
  }
}

class MultiplayerClient {
  private ws: WebSocket | null = null;
  private relay = new P2pMultiplayerRelay();
  private status: ConnectionStatus = 'disconnected';
  private serverUrl: string = '';
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private connectTimeoutTimer: ReturnType<typeof setTimeout> | null = null;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private pongTimeoutTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectAttempts = 0;
  private replacedByOtherTab = false;
  private manualDisconnect = false;
  private probingHealth = false;
  private lastTransformSentAt = 0;
  private pendingQueue: ClientToServerMessage[] = [];
  private listeners = new Set<() => void>();
  private matchStartedListeners = new Set<(msg: MatchStartedMsg) => void>();
  private gameHooks: MultiplayerGameHooks = {};
  private lastRoomSyncId: string | null = null;
  private lastRoomJoinable: boolean | null = null;

  public transportMode: MultiplayerTransportMode = 'server';
  public profile: PlayerProfile | null = null;
  public friends: FriendEntry[] = [];
  public incomingRequests: FriendRequestEntry[] = [];
  public outgoingRequests: string[] = [];
  public roomInvites: RoomInviteEntry[] = [];
  public publicRooms: PublicRoomSummary[] = [];
  public onlinePlayerCount = 0;
  public currentRoom: MultiplayerRoomState | null = null;
  public lastNotice: SocialNotice | null = null;
  public lastError: string | null = null;
  public isStaticHostDetected = false;
  public unavailableModal: UnavailableRoomModalState | null = null;
  public customServerUrl: string = gameStorage.getItem(STORAGE_KEYS.MP_SERVER) || '';
  public currentLoadout: PlayerLoadout = { startingPistolId: 'pistol', grenadeType: 'frag' };

  constructor() {
    this.relay.onServerMessage = (msg) => {
      if (this.transportMode === 'relay') {
        this.handleServerMessage(msg);
      }
    };
    this.relay.onDisconnect = (reason) => {
      if (this.transportMode !== 'relay') return;
      this.profile = null;
      this.status = this.manualDisconnect ? 'disconnected' : 'error';
      if (!this.manualDisconnect) {
        this.lastError = `Cloud relay reconnecting (${reason})...`;
        this.scheduleReconnect();
      }
      this.emitStateChange();
    };

    crazyGames.subscribeAuthChange((cgUser) => {
      if (this.isConnected) {
        this.send({
          type: 'profile:syncCrazyGames',
          crazyGamesUsername: cgUser?.username || null,
        });
      }
    });

    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        if (!this.replacedByOtherTab && !this.manualDisconnect) {
          this.reconnectAttempts = 0;
          this.connect();
        }
      });
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible' && !this.replacedByOtherTab && !this.manualDisconnect) {
          if (!this.isConnected) {
            this.connect();
          } else if (this.transportMode === 'server') {
            this.sendPingNow();
          }
        }
      });
    }
  }

  public get connectionStatus(): ConnectionStatus {
    return this.status;
  }

  public get resolvedServerUrl(): string {
    if (this.transportMode === 'relay') return this.relay.brokerUrl;
    return this.serverUrl || resolveDefaultWsUrl();
  }

  public get isConnected(): boolean {
    if (this.transportMode === 'relay') {
      return this.status === 'connected' && this.relay.active && Boolean(this.profile);
    }
    return this.status === 'connected' && Boolean(this.profile);
  }

  public get myPlayerId(): string | null {
    return this.profile?.playerId || null;
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  public subscribeMatchStarted(listener: (msg: MatchStartedMsg) => void): () => void {
    this.matchStartedListeners.add(listener);
    return () => this.matchStartedListeners.delete(listener);
  }

  private emitStateChange() {
    this.listeners.forEach((fn) => {
      try {
        fn();
      } catch (e) {
        console.warn('Multiplayer listener error:', e);
      }
    });
  }

  public setGameHooks(hooks: MultiplayerGameHooks) {
    this.gameHooks = hooks;
  }

  public clearGameHooks() {
    this.gameHooks = {};
  }

  public setLoadout(loadout: PlayerLoadout) {
    this.currentLoadout = { ...loadout };
    if (this.currentRoom) {
      this.send({ type: 'room:setLoadout', loadout: this.currentLoadout });
    }
  }

  public setCustomServerUrl(url: string) {
    const clean = url.trim();
    this.customServerUrl = clean;
    this.lastError = null;
    this.isStaticHostDetected = false;
    if (clean) {
      gameStorage.setItem(STORAGE_KEYS.MP_SERVER, clean);
      this.transportMode = 'server';
    } else {
      gameStorage.removeItem(STORAGE_KEYS.MP_SERVER);
      this.transportMode = 'server';
    }
    this.disconnect();
    this.connect(true);
  }

  private clearHeartbeatTimers() {
    if (this.connectTimeoutTimer) {
      clearTimeout(this.connectTimeoutTimer);
      this.connectTimeoutTimer = null;
    }
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
    if (this.pongTimeoutTimer) {
      clearTimeout(this.pongTimeoutTimer);
      this.pongTimeoutTimer = null;
    }
  }

  private sendPingNow() {
    if (this.transportMode !== 'server') return;
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN || !this.profile) return;
    try {
      this.ws.send(JSON.stringify({ type: 'ping' } satisfies ClientToServerMessage));
      if (!this.pongTimeoutTimer) {
        this.pongTimeoutTimer = setTimeout(() => {
          this.pongTimeoutTimer = null;
          if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.lastError = 'Connection timed out waiting for server heartbeat.';
            try {
              this.ws.close(4001, 'Heartbeat timeout');
            } catch {
              // Ignore
            }
          }
        }, 8000);
      }
    } catch {
      // Ignore
    }
  }

  private startHeartbeat() {
    this.clearHeartbeatTimers();
    this.heartbeatTimer = setInterval(() => {
      this.sendPingNow();
    }, 20000);
  }

  private switchToCloudRelay() {
    if (this.manualDisconnect) return;
    this.clearHeartbeatTimers();
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      const s = this.ws;
      this.ws = null;
      try {
        s.close(1000, 'Switching to Cloud Relay');
      } catch {
        // Ignore
      }
    }

    this.transportMode = 'relay';
    this.isStaticHostDetected = false;
    this.lastError = null;
    this.status = 'connecting';
    this.emitStateChange();

    // Ensure tab-lease allocation runs so multi-tab sessions on static hosts stay isolated
    getOrCreateAuthToken();
    const savedName = gameStorage.getItem(STORAGE_KEYS.MP_NAME) || undefined;
    const cgName = crazyGames.user?.username || null;

    this.relay.connect({
      preferredPlayerId: getStoredPreferredPlayerId(),
      requestedName: crazyGames.isActive ? undefined : savedName,
      crazyGamesUsername: cgName,
      loadout: this.currentLoadout,
      isolatedSession: isTabIsolatedSession(),
    });
  }

  private async probeBackendHealth(wsUrl: string) {
    if (this.probingHealth || typeof fetch === 'undefined') return;
    const healthUrl = toHealthCheckUrl(wsUrl);
    if (!healthUrl) return;
    this.probingHealth = true;
    const controller = new AbortController();
    const abortTimer = setTimeout(() => controller.abort(), 3000);
    try {
      const resp = await fetch(healthUrl, { signal: controller.signal, mode: 'cors' });
      const contentType = resp.headers.get('content-type') || '';
      if (resp.ok && contentType.includes('application/json')) {
        const data = (await resp.json()) as { ok?: boolean };
        if (data?.ok) {
          this.isStaticHostDetected = false;
          this.lastError = `Server is online at ${healthUrl}, but WebSocket upgrade failed (proxy/firewall may be blocking /ws).`;
          this.emitStateChange();
          return;
        }
      }
      // Static host detected (e.g. GitHub Pages, Itch.io, Cloudflare Pages returning 404 or HTML)!
      if (!hasExplicitServerConfig()) {
        this.switchToCloudRelay();
        return;
      }
      this.isStaticHostDetected = true;
      this.lastError = `No multiplayer server found at ${new URL(healthUrl).origin} (HTTP ${resp.status}). Check Server URL or click USE DEFAULT for Cloud Co-Op Relay.`;
    } catch {
      if (!hasExplicitServerConfig()) {
        this.switchToCloudRelay();
        return;
      }
      this.isStaticHostDetected = false;
      this.lastError = `Unable to reach custom server (${wsUrl}). Check URL or click USE DEFAULT.`;
    } finally {
      clearTimeout(abortTimer);
      this.probingHealth = false;
      this.emitStateChange();
    }
  }

  public connect(manual = false) {
    if (typeof window === 'undefined') return;
    this.manualDisconnect = false;
    if (manual) {
      this.replacedByOtherTab = false;
      this.reconnectAttempts = 0;
      this.lastError = null;
    }
    if (this.replacedByOtherTab) return;

    if (this.transportMode === 'relay') {
      if (this.relay.active || this.relay.connecting) return;
      this.switchToCloudRelay();
      return;
    }

    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.clearHeartbeatTimers();

    // Fast path for known static hosts (e.g. GitHub Pages) when no custom Node server override is set
    if (!hasExplicitServerConfig() && window.location.hostname.endsWith('.github.io')) {
      this.switchToCloudRelay();
      return;
    }

    this.serverUrl = resolveDefaultWsUrl();
    this.status = 'connecting';
    this.emitStateChange();

    try {
      const socket = new WebSocket(this.serverUrl);
      this.ws = socket;

      // Parallel static-host check when using default same-origin URL
      if (!hasExplicitServerConfig()) {
        void this.probeStaticOriginEarly(this.serverUrl, socket);
      }

      this.connectTimeoutTimer = setTimeout(() => {
        if (this.ws === socket && (!this.profile || socket.readyState === WebSocket.CONNECTING)) {
          this.lastError = `Connection timed out (${this.serverUrl}).`;
          this.status = 'error';
          try {
            socket.close(4002, 'Handshake timeout');
          } catch {
            // Ignore
          }
          this.ws = null;
          void this.probeBackendHealth(this.serverUrl);
          this.emitStateChange();
          this.scheduleReconnect();
        }
      }, 6000);

      socket.onopen = () => {
        if (this.ws !== socket) return;
        this.reconnectAttempts = 0;
        this.replacedByOtherTab = false;
        this.isStaticHostDetected = false;

        const savedName = gameStorage.getItem(STORAGE_KEYS.MP_NAME) || undefined;
        const cgName = crazyGames.user?.username || null;

        socket.send(
          JSON.stringify({
            type: 'auth:hello',
            authToken: getOrCreateAuthToken(),
            preferredPlayerId: getStoredPreferredPlayerId(),
            requestedName: crazyGames.isActive ? undefined : savedName,
            crazyGamesUsername: cgName,
            loadout: this.currentLoadout,
          } satisfies ClientToServerMessage)
        );
      };

      socket.onmessage = (ev) => {
        if (this.ws !== socket) return;
        if (this.pongTimeoutTimer) {
          clearTimeout(this.pongTimeoutTimer);
          this.pongTimeoutTimer = null;
        }
        let msg: ServerToClientMessage;
        try {
          msg = JSON.parse(String(ev.data)) as ServerToClientMessage;
        } catch {
          return;
        }
        this.handleServerMessage(msg);
      };

      socket.onerror = () => {
        if (this.ws !== socket) return;
        this.status = 'error';
        if (!this.lastError) {
          this.lastError = `WebSocket connection failed (${this.serverUrl}).`;
        }
        this.emitStateChange();
      };

      socket.onclose = (ev) => {
        if (this.ws !== socket) return;
        const hadProfile = Boolean(this.profile);
        this.clearHeartbeatTimers();
        this.ws = null;
        this.profile = null;
        this.status = ev.code === 1000 && this.manualDisconnect ? 'disconnected' : 'error';
        if (ev.code === 4000) {
          this.replacedByOtherTab = true;
          this.lastNotice = {
            id: `${Date.now()}_tab`,
            level: 'error',
            message: 'Multiplayer session active in another tab. Click RECONNECT to switch to this tab.',
          };
          this.emitStateChange();
          return;
        }
        if (!hadProfile && !this.manualDisconnect) {
          void this.probeBackendHealth(this.serverUrl);
        }
        this.emitStateChange();
        if (!this.manualDisconnect && this.transportMode === 'server') {
          this.scheduleReconnect();
        }
      };
    } catch {
      this.clearHeartbeatTimers();
      if (!hasExplicitServerConfig()) {
        this.switchToCloudRelay();
        return;
      }
      this.status = 'error';
      this.lastError = `Invalid WebSocket URL (${this.serverUrl}).`;
      this.emitStateChange();
      this.scheduleReconnect();
    }
  }

  private async probeStaticOriginEarly(wsUrl: string, socket: WebSocket) {
    const healthUrl = toHealthCheckUrl(wsUrl);
    if (!healthUrl || typeof fetch === 'undefined') return;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 2000);
    try {
      const resp = await fetch(healthUrl, { signal: controller.signal });
      const contentType = resp.headers.get('content-type') || '';
      if ((!resp.ok || !contentType.includes('application/json')) && !this.profile && this.ws === socket) {
        this.switchToCloudRelay();
      }
    } catch {
      // Let normal WS timeout / close path handle fallback
    } finally {
      clearTimeout(timer);
    }
  }

  public disconnect() {
    this.manualDisconnect = true;
    this.clearHeartbeatTimers();
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.profile = null;
    this.relay.disconnect();
    if (this.ws) {
      const s = this.ws;
      this.ws = null;
      try {
        s.close(1000, 'Client disconnect');
      } catch {
        // Ignore
      }
    }
    this.status = 'disconnected';
    this.emitStateChange();
  }

  private scheduleReconnect() {
    if (this.reconnectTimer || this.replacedByOtherTab || this.manualDisconnect) return;
    const delay = Math.min(10000, 1200 * Math.pow(1.4, this.reconnectAttempts));
    this.reconnectAttempts++;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, delay);
  }

  public send(msg: ClientToServerMessage) {
    if (this.transportMode === 'relay') {
      if (!this.relay.active || !this.profile) {
        if (msg.type !== 'player:transform' && msg.type !== 'ping') {
          if (msg.type === 'room:create' || msg.type === 'room:join' || msg.type === 'room:quickplay') {
            this.pendingQueue = this.pendingQueue.filter(
              (q) => q.type !== 'room:create' && q.type !== 'room:join' && q.type !== 'room:quickplay'
            );
          }
          this.pendingQueue.push(msg);
          this.connect(true);
        }
        return;
      }
      if (msg.type === 'player:transform') {
        const now = performance.now();
        if (now - this.lastTransformSentAt < 65) return;
        this.lastTransformSentAt = now;
      }
      this.relay.sendClientMessage(msg);
      return;
    }

    // Dedicated Node WS mode: wait for this.profile (auth:welcome) so server never drops pre-auth messages
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN || !this.profile) {
      if (msg.type !== 'player:transform' && msg.type !== 'ping') {
        if (msg.type === 'room:create' || msg.type === 'room:join' || msg.type === 'room:quickplay') {
          this.pendingQueue = this.pendingQueue.filter(
            (q) => q.type !== 'room:create' && q.type !== 'room:join' && q.type !== 'room:quickplay'
          );
        }
        this.pendingQueue.push(msg);
        this.connect(true);
      }
      return;
    }
    this.ws.send(JSON.stringify(msg));
  }

  private flushPendingQueue() {
    if (!this.profile) return;
    if (this.transportMode === 'relay') {
      if (!this.relay.active) return;
      const queued = this.pendingQueue.splice(0, this.pendingQueue.length);
      for (const msg of queued) {
        this.relay.sendClientMessage(msg);
      }
      return;
    }
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    const queued = this.pendingQueue.splice(0, this.pendingQueue.length);
    for (const msg of queued) {
      this.ws.send(JSON.stringify(msg));
    }
  }

  private syncCrazyGamesRoom(room: MultiplayerRoomState | null) {
    if (!room) {
      if (this.lastRoomSyncId !== null) {
        this.lastRoomSyncId = null;
        this.lastRoomJoinable = null;
        crazyGames.leftRoom();
      }
      return;
    }
    if (this.lastRoomSyncId !== room.roomId || this.lastRoomJoinable !== room.isJoinable) {
      this.lastRoomSyncId = room.roomId;
      this.lastRoomJoinable = room.isJoinable;
      crazyGames.updateRoom(room.roomId, room.isJoinable);
    }
  }

  private handleServerMessage(msg: ServerToClientMessage) {
    switch (msg.type) {
      case 'pong':
        if (typeof msg.onlineCount === 'number') {
          this.onlinePlayerCount = msg.onlineCount;
          this.emitStateChange();
        }
        break;

      case 'auth:welcome':
        if (this.connectTimeoutTimer) {
          clearTimeout(this.connectTimeoutTimer);
          this.connectTimeoutTimer = null;
        }
        this.status = 'connected';
        this.lastError = null;
        this.isStaticHostDetected = false;
        this.profile = msg.profile;
        savePreferredPlayerId(msg.profile.playerId);
        this.friends = msg.friends;
        this.incomingRequests = msg.incomingRequests;
        this.outgoingRequests = msg.outgoingRequests;
        if (typeof msg.onlineCount === 'number') this.onlinePlayerCount = msg.onlineCount;
        if (Array.isArray(msg.publicRooms)) this.publicRooms = msg.publicRooms;
        if (this.transportMode === 'server') {
          this.startHeartbeat();
        }
        this.flushPendingQueue();
        this.emitStateChange();
        break;

      case 'social:sync':
        this.profile = msg.profile;
        savePreferredPlayerId(msg.profile.playerId);
        this.friends = msg.friends;
        this.incomingRequests = msg.incomingRequests;
        this.outgoingRequests = msg.outgoingRequests;
        this.emitStateChange();
        break;

      case 'rooms:publicList':
        this.publicRooms = msg.rooms;
        this.onlinePlayerCount = msg.onlineCount;
        this.emitStateChange();
        break;

      case 'social:notice':
        this.lastNotice = {
          id: `${Date.now()}_${Math.random()}`,
          level: msg.level,
          message: msg.message,
        };
        this.emitStateChange();
        break;

      case 'room:inviteReceived':
        this.roomInvites = [
          msg.invite,
          ...this.roomInvites.filter((inv) => inv.roomId !== msg.invite.roomId),
        ].slice(0, 5);
        this.emitStateChange();
        break;

      case 'room:state':
        this.currentRoom = msg.room;
        this.syncCrazyGamesRoom(msg.room);
        this.emitStateChange();
        break;

      case 'room:unavailable': {
        const titles: Record<string, string> = {
          full: 'Squad Room Is Full',
          in_progress: 'Match Already In Progress',
          not_found: 'Room Unavailable',
          ended: 'Match Already Ended',
        };
        this.unavailableModal = {
          reason: msg.reason,
          title: titles[msg.reason] || 'Room Unavailable',
          message: msg.message,
        };
        this.emitStateChange();
        break;
      }

      case 'room:matchStarted':
        this.currentRoom = msg.room;
        this.syncCrazyGamesRoom(msg.room);
        this.gameHooks.onMatchStarted?.(msg);
        this.matchStartedListeners.forEach((fn) => {
          try {
            fn(msg);
          } catch (e) {
            console.warn('matchStarted listener error:', e);
          }
        });
        this.emitStateChange();
        break;

      case 'world:snapshot':
        if (this.currentRoom) {
          this.currentRoom = {
            ...this.currentRoom,
            round: msg.round,
            isRoundBreak: msg.isRoundBreak,
            roundBreakTimer: msg.roundBreakTimer,
            zombiesToSpawn: msg.zombiesToSpawn,
            members: msg.members,
          };
        }
        this.gameHooks.onWorldSnapshot?.(msg);
        this.emitStateChange();
        break;

      case 'barrier:updated':
        this.gameHooks.onBarrierUpdated?.(msg);
        break;

      case 'zombie:killed':
        this.gameHooks.onZombieKilled?.(msg);
        break;

      case 'zombie:hitConfirm':
        this.gameHooks.onZombieHitConfirm?.(msg);
        break;

      case 'zombie:attackPlayer':
        this.gameHooks.onAttackedByZombie?.(msg);
        break;

      case 'fx:shoot':
        this.gameHooks.onShootFx?.(msg);
        break;

      case 'fx:grenadeThrow':
        this.gameHooks.onGrenadeThrowFx?.(msg);
        break;

      case 'fx:grenadeDetonate':
        this.gameHooks.onGrenadeDetonateFx?.(msg);
        break;

      case 'fx:barrelExplode':
        this.gameHooks.onBarrelExplodeFx?.(msg);
        break;

      case 'player:revived':
        this.gameHooks.onPlayerRevived?.(msg);
        break;

      case 'round:started':
        if (this.currentRoom) {
          this.currentRoom = {
            ...this.currentRoom,
            round: msg.round,
            isRoundBreak: msg.isRoundBreak,
            roundBreakTimer: msg.roundBreakTimer,
            zombiesToSpawn: msg.zombiesToSpawn,
          };
        }
        this.gameHooks.onRoundStarted?.(msg);
        this.emitStateChange();
        break;

      case 'room:gameOver':
        if (this.currentRoom) {
          this.currentRoom = {
            ...this.currentRoom,
            status: 'gameover',
            isJoinable: false,
          };
          this.syncCrazyGamesRoom(this.currentRoom);
        }
        this.gameHooks.onGameOver?.(msg);
        this.emitStateChange();
        break;
    }
  }

  // -------------------------------------------------------------------------
  // High-Level Social & Room Commands
  // -------------------------------------------------------------------------
  public requestPublicRooms() {
    this.send({ type: 'rooms:list' });
  }

  public setDisplayName(displayName: string) {
    const clean = filterProfanityText(displayName.trim()).slice(0, 20);
    if (clean.length < 2) return;
    gameStorage.setItem(STORAGE_KEYS.MP_NAME, clean);
    this.send({ type: 'profile:setName', displayName: clean });
  }

  public sendFriendRequest(targetNumericId: string) {
    const clean = targetNumericId.replace(/\D/g, '');
    this.send({ type: 'friend:sendRequest', targetPlayerId: clean });
  }

  public respondToFriendRequest(fromPlayerId: string, accept: boolean) {
    this.send({ type: 'friend:respond', fromPlayerId, accept });
  }

  public removeFriend(friendPlayerId: string) {
    this.send({ type: 'friend:remove', friendPlayerId });
  }

  public inviteFriendToRoom(friendPlayerId: string) {
    this.send({ type: 'friend:inviteToRoom', friendPlayerId });
  }

  public dismissInvite(inviteId: string) {
    this.roomInvites = this.roomInvites.filter((i) => i.inviteId !== inviteId);
    this.emitStateChange();
  }

  public createRoom(options: {
    mapId: string;
    mapName: string;
    customMapConfig?: CustomMapConfig;
    isPublic: boolean;
    preferredRoomId?: string;
  }) {
    this.connect();
    this.send({
      type: 'room:create',
      ...options,
      loadout: this.currentLoadout,
    });
  }

  public joinRoom(roomId: string) {
    this.connect();
    this.roomInvites = this.roomInvites.filter((i) => i.roomId !== roomId);
    this.send({
      type: 'room:join',
      roomId: roomId.trim(),
      loadout: this.currentLoadout,
    });
  }

  public quickPlay(options: { mapId: string; mapName: string; customMapConfig?: CustomMapConfig }) {
    this.connect();
    this.send({
      type: 'room:quickplay',
      ...options,
      loadout: this.currentLoadout,
    });
  }

  public leaveRoom() {
    this.send({ type: 'room:leave' });
    this.currentRoom = null;
    this.syncCrazyGamesRoom(null);
    this.emitStateChange();
  }

  public setReady(ready: boolean) {
    this.send({ type: 'room:setReady', ready });
  }

  public setRoomMap(mapId: string, mapName: string, customMapConfig?: CustomMapConfig) {
    this.send({ type: 'room:setMap', mapId, mapName, customMapConfig });
  }

  public startCoopMatch(barriers?: NetBarrierDef[], spawners?: NetSpawnerPos[], solidBoxes?: NetSolidBox[]) {
    this.send({
      type: 'room:start',
      barriers,
      spawners,
      solidBoxes,
    });
  }

  public restartCoopMatch() {
    this.send({ type: 'room:restart' });
  }

  public returnRoomToLobby() {
    this.send({ type: 'room:returnToLobby' });
  }

  public clearNotice() {
    this.lastNotice = null;
    this.emitStateChange();
  }

  public dismissUnavailableModal() {
    this.unavailableModal = null;
    this.emitStateChange();
  }
}

export const multiplayerClient = new MultiplayerClient();
