import { crazyGames, gameStorage, STORAGE_KEYS } from './crazyGames';
import type { CustomMapConfig, PlayerLoadout } from '../types/game';
import type {
  ClientToServerMessage,
  FriendEntry,
  FriendRequestEntry,
  MultiplayerRoomState,
  NetBarrierDef,
  NetSolidBox,
  NetSpawnerPos,
  NetZombieState,
  PlayerProfile,
  RoomInviteEntry,
  ServerToClientMessage,
} from '../types/multiplayer';

type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

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

function getOrCreateAuthToken(): string {
  const existing = gameStorage.getItem(STORAGE_KEYS.MP_TOKEN);
  if (existing && existing.length >= 8) return existing;
  const generated =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `op_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 12)}`;
  gameStorage.setItem(STORAGE_KEYS.MP_TOKEN, generated);
  return generated;
}

function resolveDefaultWsUrl(): string {
  if (typeof window === 'undefined') return 'ws://localhost:3000/ws';

  // 1. Explicit URL parameter override (?mpServer=https://... or wss://...)
  try {
    const param = new URLSearchParams(window.location.search).get('mpServer');
    if (param) {
      return normalizeWsUrl(param);
    }
  } catch {
    // Ignore
  }

  // 2. Saved server override (useful when hosting static files on CrazyGames CDN pointing to a dedicated backend)
  const saved = gameStorage.getItem(STORAGE_KEYS.MP_SERVER);
  if (saved && saved.trim()) {
    return normalizeWsUrl(saved.trim());
  }

  // 3. Build-time env var if provided
  const envUrl = (import.meta as { env?: Record<string, string | undefined> }).env?.VITE_MULTIPLAYER_SERVER_URL;
  if (envUrl && envUrl.trim()) {
    return normalizeWsUrl(envUrl.trim());
  }

  // 4. Same-origin Express+WebSocket server (/ws)
  const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${proto}//${window.location.host}/ws`;
}

export function normalizeWsUrl(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return resolveDefaultWsUrl();
  let url = trimmed;
  if (url.startsWith('https://')) url = 'wss://' + url.slice('https://'.length);
  else if (url.startsWith('http://')) url = 'ws://' + url.slice('http://'.length);
  else if (!url.startsWith('ws://') && !url.startsWith('wss://')) url = `wss://${url}`;

  try {
    const parsed = new URL(url);
    if (!parsed.pathname || parsed.pathname === '/') {
      parsed.pathname = '/ws';
    }
    return parsed.toString();
  } catch {
    return url;
  }
}

class MultiplayerClient {
  private ws: WebSocket | null = null;
  private status: ConnectionStatus = 'disconnected';
  private serverUrl: string = '';
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectAttempts = 0;
  private replacedByOtherTab = false;
  private pendingQueue: ClientToServerMessage[] = [];
  private listeners = new Set<() => void>();
  private matchStartedListeners = new Set<(msg: MatchStartedMsg) => void>();
  private gameHooks: MultiplayerGameHooks = {};
  private lastRoomSyncId: string | null = null;
  private lastRoomJoinable: boolean | null = null;

  public profile: PlayerProfile | null = null;
  public friends: FriendEntry[] = [];
  public incomingRequests: FriendRequestEntry[] = [];
  public outgoingRequests: string[] = [];
  public roomInvites: RoomInviteEntry[] = [];
  public currentRoom: MultiplayerRoomState | null = null;
  public lastNotice: SocialNotice | null = null;
  public unavailableModal: UnavailableRoomModalState | null = null;
  public customServerUrl: string = gameStorage.getItem(STORAGE_KEYS.MP_SERVER) || '';
  public currentLoadout: PlayerLoadout = { startingPistolId: 'pistol', grenadeType: 'frag' };

  constructor() {
    crazyGames.subscribeAuthChange((cgUser) => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN && this.profile) {
        this.send({
          type: 'profile:syncCrazyGames',
          crazyGamesUsername: cgUser?.username || null,
        });
      }
    });
  }

  public get connectionStatus(): ConnectionStatus {
    return this.status;
  }

  public get isConnected(): boolean {
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
    if (clean) {
      gameStorage.setItem(STORAGE_KEYS.MP_SERVER, clean);
    } else {
      gameStorage.removeItem(STORAGE_KEYS.MP_SERVER);
    }
    this.disconnect();
    this.connect();
  }

  public connect(manual = false) {
    if (typeof window === 'undefined') return;
    if (manual) {
      this.replacedByOtherTab = false;
      this.reconnectAttempts = 0;
    }
    if (this.replacedByOtherTab) return;
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    this.serverUrl = resolveDefaultWsUrl();
    this.status = 'connecting';
    this.emitStateChange();

    try {
      const socket = new WebSocket(this.serverUrl);
      this.ws = socket;

      socket.onopen = () => {
        if (this.ws !== socket) return;
        this.status = 'connected';
        this.reconnectAttempts = 0;
        this.replacedByOtherTab = false;

        const savedName = gameStorage.getItem(STORAGE_KEYS.MP_NAME) || undefined;
        const cgName = crazyGames.user?.username || null;

        socket.send(
          JSON.stringify({
            type: 'auth:hello',
            authToken: getOrCreateAuthToken(),
            requestedName: crazyGames.isActive ? undefined : savedName,
            crazyGamesUsername: cgName,
            loadout: this.currentLoadout,
          } satisfies ClientToServerMessage)
        );
        this.emitStateChange();
      };

      socket.onmessage = (ev) => {
        if (this.ws !== socket) return;
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
        this.emitStateChange();
      };

      socket.onclose = (ev) => {
        if (this.ws !== socket) return;
        this.ws = null;
        this.profile = null;
        this.status = 'disconnected';
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
        this.emitStateChange();
        this.scheduleReconnect();
      };
    } catch {
      this.status = 'error';
      this.emitStateChange();
      this.scheduleReconnect();
    }
  }

  public disconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.profile = null;
    if (this.ws) {
      const s = this.ws;
      this.ws = null;
      try {
        s.close();
      } catch {
        // Ignore
      }
    }
    this.status = 'disconnected';
    this.emitStateChange();
  }

  private scheduleReconnect() {
    if (this.reconnectTimer || this.replacedByOtherTab) return;
    const delay = Math.min(10000, 1200 * Math.pow(1.4, this.reconnectAttempts));
    this.reconnectAttempts++;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, delay);
  }

  public send(msg: ClientToServerMessage) {
    // CRITICAL: Must also wait for this.profile (auth:welcome) so server never drops pre-auth messages!
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN || !this.profile) {
      if (msg.type !== 'player:transform') {
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
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN || !this.profile) return;
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
      case 'auth:welcome':
      case 'social:sync':
        this.profile = msg.profile;
        this.friends = msg.friends;
        this.incomingRequests = msg.incomingRequests;
        this.outgoingRequests = msg.outgoingRequests;
        this.flushPendingQueue();
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
