import { OFFICIAL_BLIGHTED_WOODS_ID, OFFICIAL_SECTOR_ZERO_ID } from '../data/officialMaps';
import type { CustomMapConfig, GrenadeType, PlayerLoadout } from '../types/game';
import type {
  ClientToServerMessage,
  CoopMemberState,
  FriendEntry,
  FriendPresenceStatus,
  FriendRequestEntry,
  MultiplayerRoomState,
  NetBarrierDef,
  NetSolidBox,
  NetSpawnerPos,
  NetZombieState,
  PlayerProfile,
  PublicRoomSummary,
  ServerToClientMessage,
} from '../types/multiplayer';
import { gameStorage } from './crazyGames';
import { MqttWsClient } from './mqttTransport';

const RELAY_BROKERS = [
  'wss://broker.emqx.io:8084/mqtt',
  'wss://broker.hivemq.com:8884/mqtt',
];

const TOPIC_PREFIX = 'polyops-zombies/v1';
const SOCIAL_STORAGE_PREFIX = 'polyops_relay_social_v1_';

interface RelayPresencePayload {
  playerId: string;
  displayName: string;
  status: FriendPresenceStatus;
  roomId: string | null;
  roomJoinable: boolean;
  mapName: string | null;
  round?: number;
  ts: number;
}

interface RelayPublicRoomPayload extends PublicRoomSummary {
  hostPlayerId?: string;
  ts: number;
}

interface RelayRoomMeta extends MultiplayerRoomState {
  ts: number;
}

interface RelaySocialSave {
  playerId: string;
  displayName: string;
  friends: { playerId: string; displayName: string }[];
  outgoingRequests: string[];
}

interface HostSimState {
  room: MultiplayerRoomState;
  barriers: NetBarrierDef[];
  spawners: NetSpawnerPos[];
  solidBoxes: NetSolidBox[];
  explodedBarrelIds: Set<string>;
  zombies: NetZombieState[];
  spawnTimer: number;
  zombieAttackTimers: Map<string, number>;
  zombieBreakTimers: Map<string, number>;
}

const PROFANITY_REGEX = /\b(fuck|shit|bitch|asshole|bastard|cunt|dick|cock|pussy|whore|slut|fag|faggot|nigger|nigga|retard|kike|spic|chink|twat|wanker)\b/gi;
function censorProfanity(text: string): string {
  return text.replace(PROFANITY_REGEX, (m) => '*'.repeat(m.length));
}

function sanitizeDisplayName(name: string | undefined | null, fallbackId: string): string {
  const cleaned = censorProfanity((name || '').replace(/[^\w \-.]/g, '').trim()).slice(0, 20);
  if (cleaned.length >= 2) return cleaned;
  return `Operator #${fallbackId.slice(-4)}`;
}

function sanitizeMapName(name: string | undefined | null): string {
  const cleaned = censorProfanity((name || '').replace(/[<>]/g, '').trim()).slice(0, 40);
  return cleaned || 'Custom Arena';
}

function r2(n: number): number {
  return Math.round(n * 100) / 100;
}

function generateRoomCode(preferred?: string): string {
  const cleanPref = (preferred || '').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 24);
  if (cleanPref.length >= 3) return cleanPref;
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

function getSectorZeroDefaults(): { barriers: NetBarrierDef[]; spawners: NetSpawnerPos[]; solidBoxes: NetSolidBox[] } {
  return {
    barriers: [
      { id: 0, x: 0, y: 1.4, z: 11.7, dirX: 0, dirZ: -1, planks: 5, maxPlanks: 5 },
      { id: 1, x: 0, y: 1.4, z: -11.7, dirX: 0, dirZ: 1, planks: 5, maxPlanks: 5 },
      { id: 2, x: 11.7, y: 1.4, z: 0, dirX: -1, dirZ: 0, planks: 5, maxPlanks: 5 },
      { id: 3, x: -11.7, y: 1.4, z: 0, dirX: 1, dirZ: 0, planks: 5, maxPlanks: 5 },
    ],
    spawners: [],
    solidBoxes: [],
  };
}

function getBlightedWoodsDefaults(): { barriers: NetBarrierDef[]; spawners: NetSpawnerPos[]; solidBoxes: NetSolidBox[] } {
  return {
    barriers: [],
    spawners: [
      { x: -16, y: 0, z: -14 },
      { x: 15, y: 0, z: -15 },
      { x: -18, y: 0, z: 12 },
      { x: 17, y: 0, z: 14 },
      { x: 0, y: 0, z: -21 },
      { x: -20, y: 0, z: -2 },
      { x: 20, y: 0, z: 2 },
      { x: -10, y: 0, z: 19 },
      { x: 11, y: 0, z: 19 },
    ],
    solidBoxes: [],
  };
}

function extractCustomMapNav(config: CustomMapConfig): {
  barriers: NetBarrierDef[];
  spawners: NetSpawnerPos[];
  solidBoxes: NetSolidBox[];
} {
  const barriers: NetBarrierDef[] = [];
  const spawners: NetSpawnerPos[] = [];
  const solidBoxes: NetSolidBox[] = [];
  let barrierId = 0;

  for (const obj of config.objects) {
    if (obj.type === 'zombie_spawn') {
      spawners.push({ x: obj.position.x, y: obj.position.y, z: obj.position.z });
    } else if (obj.type === 'window_barrier') {
      const ry = obj.rotation?.y || 0;
      barriers.push({
        id: barrierId++,
        x: obj.position.x,
        y: obj.position.y,
        z: obj.position.z,
        dirX: -Math.sin(ry),
        dirZ: -Math.cos(ry),
        planks: 5,
        maxPlanks: 5,
      });
    } else if (obj.type === 'block') {
      const ry = obj.rotation?.y || 0;
      const maxExtX = Math.abs(Math.cos(ry) * (obj.scale.x / 2)) + Math.abs(Math.sin(ry) * (obj.scale.z / 2));
      const maxExtZ = Math.abs(Math.sin(ry) * (obj.scale.x / 2)) + Math.abs(Math.cos(ry) * (obj.scale.z / 2));
      solidBoxes.push({
        minX: obj.position.x - maxExtX,
        maxX: obj.position.x + maxExtX,
        minZ: obj.position.z - maxExtZ,
        maxZ: obj.position.z + maxExtZ,
        minY: obj.position.y - obj.scale.y / 2,
        maxY: obj.position.y + obj.scale.y / 2,
      });
    }
  }
  return { barriers, spawners, solidBoxes };
}

function createMemberEntry(
  playerId: string,
  displayName: string,
  isHost: boolean,
  loadout: PlayerLoadout,
  index: number
): CoopMemberState {
  const angle = index * 1.5;
  return {
    playerId,
    displayName,
    ready: isHost,
    isHost,
    isDowned: false,
    bleedoutTimer: 25,
    hp: 100,
    maxHp: 100,
    score: 500,
    kills: 0,
    headshots: 0,
    x: r2(Math.cos(angle) * 1.5),
    y: 1.6,
    z: r2(Math.sin(angle) * 1.5),
    yaw: 0,
    pitch: 0,
    weaponId: loadout.startingPistolId || 'pistol',
    isPap: false,
    isFlashlightOn: true,
    isMoving: false,
    loadout: { ...loadout },
  };
}

export class P2pMultiplayerRelay {
  private mqtt = new MqttWsClient();
  private brokerIndex = 0;
  private isConnecting = false;
  private isolatedSession = false;
  private unloadBound = false;
  private profile: PlayerProfile = { playerId: '00000000', displayName: 'Operator' };
  private savedFriends: { playerId: string; displayName: string }[] = [];
  private incomingRequests: FriendRequestEntry[] = [];
  private outgoingRequests: string[] = [];
  private loadout: PlayerLoadout = { startingPistolId: 'pistol', grenadeType: 'frag' };

  private presences = new Map<string, RelayPresencePayload>();
  private publicRooms = new Map<string, RelayPublicRoomPayload>();
  private joinedRoomId: string | null = null;
  private guestRoomState: MultiplayerRoomState | null = null;
  private hostSim: HostSimState | null = null;

  private pendingJoinRoomId: string | null = null;
  private pendingJoinTimer: ReturnType<typeof setTimeout> | null = null;
  private hostTickTimer: ReturnType<typeof setInterval> | null = null;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private roomListEmitTimer: ReturnType<typeof setTimeout> | null = null;
  private quickPlayPending = false;
  private quickPlayArgs: { mapId: string; mapName: string; customMapConfig?: CustomMapConfig } | null = null;

  public onServerMessage?: (msg: ServerToClientMessage) => void;
  public onDisconnect?: (reason: string) => void;

  public get active(): boolean {
    return this.mqtt.isConnected;
  }

  public get connecting(): boolean {
    return this.isConnecting;
  }

  public get brokerUrl(): string {
    return RELAY_BROKERS[this.brokerIndex % RELAY_BROKERS.length];
  }

  private emit(msg: ServerToClientMessage) {
    this.onServerMessage?.(msg);
  }

  private emitNotice(level: 'info' | 'success' | 'error', message: string) {
    this.emit({ type: 'social:notice', level, message });
  }

  private loadSocialState(preferredId?: string, requestedName?: string, cgName?: string | null, isolatedSession = false) {
    this.isolatedSession = isolatedSession;
    const fallbackId = preferredId && /^\d{8}$/.test(preferredId)
      ? preferredId
      : String(Math.floor(10000000 + Math.random() * 89999999));

    let saved: RelaySocialSave | null = null;
    try {
      if (isolatedSession && typeof window !== 'undefined') {
        const raw = window.sessionStorage.getItem(`${SOCIAL_STORAGE_PREFIX}tab`);
        if (raw) saved = JSON.parse(raw) as RelaySocialSave;
      } else {
        const raw = gameStorage.getItem(`${SOCIAL_STORAGE_PREFIX}${preferredId || 'primary'}`);
        if (raw) saved = JSON.parse(raw) as RelaySocialSave;
      }
    } catch {
      saved = null;
    }

    const playerId = saved?.playerId && /^\d{8}$/.test(saved.playerId) ? saved.playerId : fallbackId;
    const rawName = cgName || requestedName || saved?.displayName;
    const displayName = sanitizeDisplayName(rawName, playerId);

    this.profile = {
      playerId,
      displayName,
      crazyGamesUsername: cgName || null,
    };
    this.savedFriends = Array.isArray(saved?.friends) ? saved.friends : [];
    this.outgoingRequests = Array.isArray(saved?.outgoingRequests) ? saved.outgoingRequests : [];
    this.incomingRequests = [];
    this.saveSocialState();
  }

  private saveSocialState() {
    const payload: RelaySocialSave = {
      playerId: this.profile.playerId,
      displayName: this.profile.displayName,
      friends: this.savedFriends,
      outgoingRequests: this.outgoingRequests,
    };
    try {
      if (this.isolatedSession && typeof window !== 'undefined') {
        window.sessionStorage.setItem(`${SOCIAL_STORAGE_PREFIX}tab`, JSON.stringify(payload));
        return;
      }
      gameStorage.setItem(`${SOCIAL_STORAGE_PREFIX}${this.profile.playerId}`, JSON.stringify(payload));
      gameStorage.setItem(`${SOCIAL_STORAGE_PREFIX}primary`, JSON.stringify(payload));
    } catch {
      // Ignore
    }
  }

  public connect(options: {
    preferredPlayerId?: string;
    requestedName?: string;
    crazyGamesUsername?: string | null;
    loadout?: PlayerLoadout;
    isolatedSession?: boolean;
  }) {
    if (this.mqtt.isConnected || this.isConnecting) return;
    this.isConnecting = true;
    if (options.loadout) this.loadout = { ...options.loadout };
    this.loadSocialState(
      options.preferredPlayerId,
      options.requestedName,
      options.crazyGamesUsername,
      Boolean(options.isolatedSession)
    );

    if (typeof window !== 'undefined' && !this.unloadBound) {
      this.unloadBound = true;
      window.addEventListener('beforeunload', () => {
        if (this.mqtt.isConnected) {
          this.disconnect();
        }
      });
    }

    const broker = this.brokerUrl;
    const clientId = `polyops_${this.profile.playerId}_${Math.random().toString(36).slice(2, 7)}`;
    const willPayload: RelayPresencePayload = {
      playerId: this.profile.playerId,
      displayName: this.profile.displayName,
      status: 'offline',
      roomId: null,
      roomJoinable: false,
      mapName: null,
      ts: 0,
    };

    this.mqtt.onConnect = () => {
      this.isConnecting = false;
      this.mqtt.subscribe(`${TOPIC_PREFIX}/presence/+`);
      this.mqtt.subscribe(`${TOPIC_PREFIX}/inbox/${this.profile.playerId}`);
      this.mqtt.subscribe(`${TOPIC_PREFIX}/pending-req/${this.profile.playerId}/+`);
      this.mqtt.subscribe(`${TOPIC_PREFIX}/public-rooms/+`);

      this.publishPresence();
      this.startTimers();

      this.emit({
        type: 'auth:welcome',
        profile: { ...this.profile },
        friends: this.buildFriendsList(),
        incomingRequests: [...this.incomingRequests],
        outgoingRequests: [...this.outgoingRequests],
        onlineCount: Math.max(1, this.getOnlineCount()),
        publicRooms: this.getPublicRooms(),
      });
    };

    this.mqtt.onMessage = (topic, payload) => {
      this.handleMqttMessage(topic, payload);
    };

    this.mqtt.onClose = (reason) => {
      this.isConnecting = false;
      this.stopTimers();
      this.brokerIndex = (this.brokerIndex + 1) % RELAY_BROKERS.length;
      this.onDisconnect?.(reason);
    };

    this.mqtt.connect(
      broker,
      clientId,
      {
        topic: `${TOPIC_PREFIX}/presence/${this.profile.playerId}`,
        payload: JSON.stringify(willPayload),
        retain: true,
      },
      25
    );
  }

  public disconnect() {
    this.isConnecting = false;
    this.cleanupRoomOnLeave(true);
    if (this.mqtt.isConnected) {
      this.mqtt.publish(
        `${TOPIC_PREFIX}/presence/${this.profile.playerId}`,
        JSON.stringify({
          playerId: this.profile.playerId,
          displayName: this.profile.displayName,
          status: 'offline',
          roomId: null,
          roomJoinable: false,
          mapName: null,
          ts: 0,
        } satisfies RelayPresencePayload),
        true
      );
    }
    this.stopTimers();
    this.mqtt.disconnect(true);
  }

  private startTimers() {
    this.stopTimers();
    this.heartbeatTimer = setInterval(() => {
      if (!this.mqtt.isConnected) return;
      this.publishPresence();
      if (this.hostSim) {
        this.publishRoomMeta(this.hostSim.room);
      }
      this.scheduleEmitPublicRooms();
    }, 9000);
  }

  private stopTimers() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
    if (this.hostTickTimer) {
      clearInterval(this.hostTickTimer);
      this.hostTickTimer = null;
    }
    if (this.pendingJoinTimer) {
      clearTimeout(this.pendingJoinTimer);
      this.pendingJoinTimer = null;
    }
    if (this.roomListEmitTimer) {
      clearTimeout(this.roomListEmitTimer);
      this.roomListEmitTimer = null;
    }
  }

  private getOnlineCount(): number {
    const now = Date.now();
    let count = 0;
    for (const p of this.presences.values()) {
      if (p.status !== 'offline' && now - p.ts < 35000) count++;
    }
    return Math.max(1, count);
  }

  private getPublicRooms(): PublicRoomSummary[] {
    const now = Date.now();
    const list: PublicRoomSummary[] = [];
    for (const r of this.publicRooms.values()) {
      const hostPres = r.hostPlayerId ? this.presences.get(r.hostPlayerId) : undefined;
      const hostOffline = Boolean(hostPres && hostPres.status === 'offline');
      if (!hostOffline && now - r.ts < 28000 && r.memberCount > 0 && r.memberCount < r.maxMembers) {
        list.push({
          roomId: r.roomId,
          hostName: r.hostName,
          mapId: r.mapId,
          mapName: r.mapName,
          memberCount: r.memberCount,
          maxMembers: r.maxMembers,
        });
      }
    }
    return list.sort((a, b) => b.memberCount - a.memberCount);
  }

  private buildFriendsList(): FriendEntry[] {
    const now = Date.now();
    return this.savedFriends
      .map((f) => {
        const pres = this.presences.get(f.playerId);
        const isFresh = pres && pres.status !== 'offline' && now - pres.ts < 35000;
        const displayName = pres?.displayName || f.displayName || `Operator #${f.playerId.slice(-4)}`;
        return {
          playerId: f.playerId,
          displayName,
          status: (isFresh ? pres!.status : 'offline') as FriendPresenceStatus,
          roomId: isFresh ? pres!.roomId : null,
          roomJoinable: isFresh ? pres!.roomJoinable : false,
          mapName: isFresh ? pres!.mapName : null,
          round: isFresh ? pres!.round : undefined,
        };
      })
      .sort((a, b) => {
        const rank = (s: FriendPresenceStatus) => (s === 'lobby' ? 0 : s === 'playing' ? 1 : s === 'online' ? 2 : 3);
        return rank(a.status) - rank(b.status) || a.displayName.localeCompare(b.displayName);
      });
  }

  private pushSocialSync() {
    this.emit({
      type: 'social:sync',
      profile: { ...this.profile },
      friends: this.buildFriendsList(),
      incomingRequests: [...this.incomingRequests],
      outgoingRequests: [...this.outgoingRequests],
    });
  }

  private scheduleEmitPublicRooms() {
    if (this.roomListEmitTimer) return;
    this.roomListEmitTimer = setTimeout(() => {
      this.roomListEmitTimer = null;
      this.emit({
        type: 'rooms:publicList',
        rooms: this.getPublicRooms(),
        onlineCount: this.getOnlineCount(),
      });
    }, 180);
  }

  private publishPresence() {
    if (!this.mqtt.isConnected) return;
    const activeRoom = this.hostSim?.room || this.guestRoomState;
    const status: FriendPresenceStatus = !activeRoom
      ? 'online'
      : activeRoom.status === 'playing'
      ? 'playing'
      : 'lobby';

    const payload: RelayPresencePayload = {
      playerId: this.profile.playerId,
      displayName: this.profile.displayName,
      status,
      roomId: activeRoom?.roomId || null,
      roomJoinable: Boolean(activeRoom && activeRoom.isJoinable && activeRoom.members.length < 4),
      mapName: activeRoom?.mapName || null,
      round: activeRoom?.status === 'playing' ? activeRoom.round : undefined,
      ts: Date.now(),
    };
    this.presences.set(this.profile.playerId, payload);
    this.mqtt.publish(`${TOPIC_PREFIX}/presence/${this.profile.playerId}`, JSON.stringify(payload), true);
  }

  private publishRoomMeta(room: MultiplayerRoomState) {
    if (!this.mqtt.isConnected) return;
    const meta: RelayRoomMeta = { ...room, ts: Date.now() };
    this.mqtt.publish(`${TOPIC_PREFIX}/room/${room.roomId}/meta`, JSON.stringify(meta), true);

    if (room.isPublic && room.isJoinable && room.status === 'lobby' && room.members.length < 4) {
      const hostMember = room.members.find((m) => m.playerId === room.hostPlayerId);
      const summary: RelayPublicRoomPayload = {
        roomId: room.roomId,
        hostPlayerId: room.hostPlayerId,
        hostName: hostMember?.displayName || this.profile.displayName,
        mapId: room.mapId,
        mapName: room.mapName,
        memberCount: room.members.length,
        maxMembers: 4,
        ts: Date.now(),
      };
      this.mqtt.publish(`${TOPIC_PREFIX}/public-rooms/${room.roomId}`, JSON.stringify(summary), true);
    } else {
      this.mqtt.publish(`${TOPIC_PREFIX}/public-rooms/${room.roomId}`, '', true);
    }
  }

  private broadcastRoomMsg(roomId: string, msg: ServerToClientMessage, targetId?: string) {
    if (!targetId || targetId === this.profile.playerId) {
      this.emit(msg);
    }
    if (this.mqtt.isConnected) {
      this.mqtt.publish(`${TOPIC_PREFIX}/room/${roomId}/broadcast`, JSON.stringify({ targetId, msg }), false);
    }
  }

  private handleMqttMessage(topic: string, payload: string) {
    if (topic.startsWith(`${TOPIC_PREFIX}/presence/`)) {
      const pid = topic.slice(`${TOPIC_PREFIX}/presence/`.length);
      if (!payload) {
        this.presences.delete(pid);
      } else {
        try {
          const data = JSON.parse(payload) as RelayPresencePayload;
          this.presences.set(pid, data);
          const friendIdx = this.savedFriends.findIndex((f) => f.playerId === pid);
          if (friendIdx !== -1 && data.displayName) {
            this.savedFriends[friendIdx].displayName = data.displayName;
          }
        } catch {
          return;
        }
      }
      if (this.savedFriends.some((f) => f.playerId === pid)) {
        this.pushSocialSync();
      }
      this.scheduleEmitPublicRooms();
      return;
    }

    if (topic.startsWith(`${TOPIC_PREFIX}/public-rooms/`)) {
      const rid = topic.slice(`${TOPIC_PREFIX}/public-rooms/`.length);
      if (!payload) {
        this.publicRooms.delete(rid);
      } else {
        try {
          const summary = JSON.parse(payload) as RelayPublicRoomPayload;
          this.publicRooms.set(rid, summary);
        } catch {
          return;
        }
      }
      this.scheduleEmitPublicRooms();
      if (this.quickPlayPending) {
        this.tryFinishQuickPlay();
      }
      return;
    }

    if (topic.startsWith(`${TOPIC_PREFIX}/pending-req/${this.profile.playerId}/`)) {
      if (!payload) return;
      try {
        const req = JSON.parse(payload) as FriendRequestEntry;
        if (
          req.fromPlayerId &&
          req.fromPlayerId !== this.profile.playerId &&
          !this.savedFriends.some((f) => f.playerId === req.fromPlayerId) &&
          !this.incomingRequests.some((r) => r.fromPlayerId === req.fromPlayerId)
        ) {
          this.incomingRequests.push(req);
          this.pushSocialSync();
          this.emitNotice('info', `New friend request from ${req.fromName} (#${req.fromPlayerId})!`);
        }
      } catch {
        // Ignore
      }
      return;
    }

    if (topic === `${TOPIC_PREFIX}/inbox/${this.profile.playerId}`) {
      if (!payload) return;
      try {
        const pkt = JSON.parse(payload) as Record<string, unknown>;
        this.handleInboxMessage(pkt);
      } catch {
        // Ignore
      }
      return;
    }

    if (this.pendingJoinRoomId && topic === `${TOPIC_PREFIX}/room/${this.pendingJoinRoomId}/meta`) {
      const targetId = this.pendingJoinRoomId;
      this.pendingJoinRoomId = null;
      if (this.pendingJoinTimer) {
        clearTimeout(this.pendingJoinTimer);
        this.pendingJoinTimer = null;
      }
      this.mqtt.unsubscribe(`${TOPIC_PREFIX}/room/${targetId}/meta`);

      if (!payload) {
        const msgText = `Room "${targetId}" was not found or has already closed.`;
        this.emit({ type: 'room:unavailable', reason: 'not_found', message: msgText });
        this.emitNotice('error', msgText);
        return;
      }

      try {
        const meta = JSON.parse(payload) as RelayRoomMeta;
        if (Date.now() - meta.ts > 35000) {
          const msgText = `Room "${targetId}" has already closed.`;
          this.emit({ type: 'room:unavailable', reason: 'not_found', message: msgText });
          this.emitNotice('error', msgText);
          return;
        }
        if (meta.members.length >= 4) {
          const msgText = 'That squad room is already full (4/4 operators).';
          this.emit({ type: 'room:unavailable', reason: 'full', message: msgText });
          this.emitNotice('error', msgText);
          return;
        }
        if (meta.status === 'playing') {
          const msgText = 'That match is already in progress. Please join another room or start a new squad.';
          this.emit({ type: 'room:unavailable', reason: 'in_progress', message: msgText });
          this.emitNotice('error', msgText);
          return;
        }
        if (!meta.isJoinable || meta.status === 'gameover') {
          const msgText = 'That squad room is currently closed or has already ended.';
          this.emit({ type: 'room:unavailable', reason: 'ended', message: msgText });
          this.emitNotice('error', msgText);
          return;
        }

        // Complete join as guest
        this.joinedRoomId = meta.roomId;
        this.guestRoomState = meta;
        this.mqtt.subscribe(`${TOPIC_PREFIX}/room/${meta.roomId}/broadcast`);
        const member = createMemberEntry(
          this.profile.playerId,
          this.profile.displayName,
          false,
          this.loadout,
          meta.members.length
        );
        const joinRoomTarget = meta.roomId;
        setTimeout(() => {
          if (this.joinedRoomId === joinRoomTarget && this.mqtt.isConnected) {
            this.mqtt.publish(
              `${TOPIC_PREFIX}/room/${joinRoomTarget}/to-host`,
              JSON.stringify({ senderId: this.profile.playerId, kind: 'join', member }),
              false
            );
          }
        }, 80);
        this.publishPresence();
      } catch {
        this.emitNotice('error', `Could not join room "${targetId}".`);
      }
      return;
    }

    if (this.hostSim && topic === `${TOPIC_PREFIX}/room/${this.hostSim.room.roomId}/to-host`) {
      if (!payload) return;
      try {
        const pkt = JSON.parse(payload) as {
          senderId: string;
          kind?: string;
          member?: CoopMemberState;
          msg?: ClientToServerMessage;
        };
        this.handleHostInbound(pkt);
      } catch {
        // Ignore
      }
      return;
    }

    if (this.joinedRoomId && !this.hostSim && topic === `${TOPIC_PREFIX}/room/${this.joinedRoomId}/broadcast`) {
      if (!payload) return;
      try {
        const pkt = JSON.parse(payload) as { targetId?: string; msg: ServerToClientMessage };
        if (pkt.targetId && pkt.targetId !== this.profile.playerId) return;
        const msg = pkt.msg;
        if (msg.type === 'room:state') {
          this.guestRoomState = msg.room;
          if (!msg.room || !msg.room.members.some((m) => m.playerId === this.profile.playerId)) {
            this.cleanupRoomOnLeave(false);
          } else {
            this.publishPresence();
          }
        } else if (msg.type === 'room:matchStarted') {
          this.guestRoomState = msg.room;
          this.publishPresence();
        } else if (msg.type === 'room:gameOver' && this.guestRoomState) {
          this.guestRoomState = { ...this.guestRoomState, status: 'gameover', isJoinable: false };
          this.publishPresence();
        }
        this.emit(msg);
      } catch {
        // Ignore
      }
    }
  }

  private handleInboxMessage(pkt: Record<string, unknown>) {
    const kind = pkt.kind;
    if (kind === 'friend:req') {
      const fromPlayerId = String(pkt.fromPlayerId || '');
      const fromName = String(pkt.fromName || `Operator #${fromPlayerId.slice(-4)}`);
      if (!fromPlayerId || fromPlayerId === this.profile.playerId) return;

      // Auto mutual accept if we already sent them a request
      if (this.outgoingRequests.includes(fromPlayerId)) {
        this.outgoingRequests = this.outgoingRequests.filter((id) => id !== fromPlayerId);
        if (!this.savedFriends.some((f) => f.playerId === fromPlayerId)) {
          this.savedFriends.push({ playerId: fromPlayerId, displayName: fromName });
        }
        this.saveSocialState();
        this.pushSocialSync();
        this.mqtt.publish(
          `${TOPIC_PREFIX}/inbox/${fromPlayerId}`,
          JSON.stringify({
            kind: 'friend:accept',
            fromPlayerId: this.profile.playerId,
            fromName: this.profile.displayName,
          }),
          false
        );
        this.emitNotice('success', `You and ${fromName} (#${fromPlayerId}) are now friends!`);
        return;
      }

      if (
        !this.savedFriends.some((f) => f.playerId === fromPlayerId) &&
        !this.incomingRequests.some((r) => r.fromPlayerId === fromPlayerId)
      ) {
        this.incomingRequests.push({
          fromPlayerId,
          fromName,
          createdAt: Date.now(),
        });
        this.pushSocialSync();
        this.emitNotice('info', `New friend request from ${fromName} (#${fromPlayerId})!`);
      }
    } else if (kind === 'friend:accept') {
      const fid = String(pkt.fromPlayerId || '');
      const fname = String(pkt.fromName || `Operator #${fid.slice(-4)}`);
      this.outgoingRequests = this.outgoingRequests.filter((id) => id !== fid);
      if (fid && !this.savedFriends.some((f) => f.playerId === fid)) {
        this.savedFriends.push({ playerId: fid, displayName: fname });
      }
      this.saveSocialState();
      this.pushSocialSync();
      this.emitNotice('success', `${fname} (#${fid}) accepted your friend request!`);
    } else if (kind === 'friend:remove') {
      const fid = String(pkt.fromPlayerId || '');
      this.savedFriends = this.savedFriends.filter((f) => f.playerId !== fid);
      this.saveSocialState();
      this.pushSocialSync();
    } else if (kind === 'room:invite') {
      const roomId = String(pkt.roomId || '');
      const fromPlayerId = String(pkt.fromPlayerId || '');
      const fromName = String(pkt.fromName || 'Friend');
      const mapName = String(pkt.mapName || 'Sector Zero');
      if (!roomId) return;
      this.emit({
        type: 'room:inviteReceived',
        invite: {
          inviteId: `${roomId}_${Date.now()}`,
          fromPlayerId,
          fromName,
          roomId,
          mapName,
          createdAt: Date.now(),
        },
      });
    }
  }

  public sendClientMessage(msg: ClientToServerMessage) {
    if (!this.mqtt.isConnected) return;

    switch (msg.type) {
      case 'rooms:list':
        this.emit({
          type: 'rooms:publicList',
          rooms: this.getPublicRooms(),
          onlineCount: this.getOnlineCount(),
        });
        break;

      case 'profile:setName': {
        this.profile.displayName = sanitizeDisplayName(msg.displayName, this.profile.playerId);
        this.saveSocialState();
        this.publishPresence();
        if (this.hostSim) {
          const me = this.hostSim.room.members.find((m) => m.playerId === this.profile.playerId);
          if (me) {
            me.displayName = this.profile.displayName;
            this.publishRoomMeta(this.hostSim.room);
            this.broadcastRoomMsg(this.hostSim.room.roomId, { type: 'room:state', room: this.hostSim.room });
          }
        }
        this.pushSocialSync();
        this.emitNotice('success', `Callsign updated to ${this.profile.displayName}`);
        break;
      }

      case 'profile:syncCrazyGames': {
        if (msg.crazyGamesUsername) {
          this.profile.crazyGamesUsername = msg.crazyGamesUsername;
          this.profile.displayName = sanitizeDisplayName(msg.crazyGamesUsername, this.profile.playerId);
        } else {
          this.profile.crazyGamesUsername = null;
        }
        this.saveSocialState();
        this.publishPresence();
        this.pushSocialSync();
        break;
      }

      case 'friend:sendRequest': {
        const targetId = (msg.targetPlayerId || '').replace(/\D/g, '');
        if (!targetId || targetId.length < 4) {
          this.emitNotice('error', 'Enter a valid numeric Player ID.');
          return;
        }
        if (targetId === this.profile.playerId) {
          this.emitNotice('error', 'You cannot add your own Player ID.');
          return;
        }
        if (this.savedFriends.some((f) => f.playerId === targetId)) {
          this.emitNotice('info', `#${targetId} is already on your friends list.`);
          return;
        }
        if (this.outgoingRequests.includes(targetId)) {
          this.emitNotice('info', `Friend request already pending for #${targetId}.`);
          return;
        }

        const reqPayload: FriendRequestEntry = {
          fromPlayerId: this.profile.playerId,
          fromName: this.profile.displayName,
          createdAt: Date.now(),
        };
        this.outgoingRequests.push(targetId);
        this.saveSocialState();
        this.pushSocialSync();

        this.mqtt.publish(
          `${TOPIC_PREFIX}/inbox/${targetId}`,
          JSON.stringify({ kind: 'friend:req', ...reqPayload }),
          false
        );
        this.mqtt.publish(
          `${TOPIC_PREFIX}/pending-req/${targetId}/${this.profile.playerId}`,
          JSON.stringify(reqPayload),
          true
        );

        const pres = this.presences.get(targetId);
        const label = pres?.displayName ? `${pres.displayName} (#${targetId})` : `#${targetId}`;
        this.emitNotice('success', `Friend request sent to ${label}!`);
        break;
      }

      case 'friend:respond': {
        const fromId = (msg.fromPlayerId || '').replace(/\D/g, '');
        const existing = this.incomingRequests.find((r) => r.fromPlayerId === fromId);
        this.incomingRequests = this.incomingRequests.filter((r) => r.fromPlayerId !== fromId);
        this.mqtt.publish(`${TOPIC_PREFIX}/pending-req/${this.profile.playerId}/${fromId}`, '', true);

        if (msg.accept && fromId) {
          const fname = existing?.fromName || this.presences.get(fromId)?.displayName || `Operator #${fromId.slice(-4)}`;
          if (!this.savedFriends.some((f) => f.playerId === fromId)) {
            this.savedFriends.push({ playerId: fromId, displayName: fname });
          }
          this.mqtt.publish(
            `${TOPIC_PREFIX}/inbox/${fromId}`,
            JSON.stringify({
              kind: 'friend:accept',
              fromPlayerId: this.profile.playerId,
              fromName: this.profile.displayName,
            }),
            false
          );
          this.emitNotice('success', `Added ${fname} (#${fromId}) to Friends!`);
        }
        this.saveSocialState();
        this.pushSocialSync();
        break;
      }

      case 'friend:remove': {
        const fid = (msg.friendPlayerId || '').replace(/\D/g, '');
        this.savedFriends = this.savedFriends.filter((f) => f.playerId !== fid);
        this.saveSocialState();
        this.pushSocialSync();
        this.mqtt.publish(
          `${TOPIC_PREFIX}/inbox/${fid}`,
          JSON.stringify({ kind: 'friend:remove', fromPlayerId: this.profile.playerId }),
          false
        );
        break;
      }

      case 'friend:inviteToRoom': {
        const activeRoom = this.hostSim?.room || this.guestRoomState;
        if (!activeRoom) {
          this.emitNotice('error', 'Create or join a Co-Op room before inviting friends.');
          return;
        }
        this.mqtt.publish(
          `${TOPIC_PREFIX}/inbox/${msg.friendPlayerId}`,
          JSON.stringify({
            kind: 'room:invite',
            fromPlayerId: this.profile.playerId,
            fromName: this.profile.displayName,
            roomId: activeRoom.roomId,
            mapName: activeRoom.mapName,
          }),
          false
        );
        this.emitNotice('success', `Squad invite sent to #${msg.friendPlayerId}!`);
        break;
      }

      case 'room:create': {
        this.cleanupRoomOnLeave(true);
        if (msg.loadout) this.loadout = { ...msg.loadout };
        const roomId = generateRoomCode(msg.preferredRoomId);
        const me = createMemberEntry(this.profile.playerId, this.profile.displayName, true, this.loadout, 0);
        const room: MultiplayerRoomState = {
          roomId,
          hostPlayerId: this.profile.playerId,
          isPublic: msg.isPublic,
          isJoinable: true,
          status: 'lobby',
          mapId: msg.mapId || OFFICIAL_SECTOR_ZERO_ID,
          mapName: sanitizeMapName(msg.mapName || 'Sector Zero'),
          customMapConfig: msg.customMapConfig,
          round: 1,
          isRoundBreak: true,
          roundBreakTimer: 5,
          zombiesToSpawn: 6,
          barriers: [],
          explodedBarrelIds: [],
          members: [me],
        };
        this.startHostRoom(room);
        break;
      }

      case 'room:join': {
        const cleanCode = (msg.roomId || '').trim().toUpperCase();
        if (!cleanCode) return;
        if (msg.loadout) this.loadout = { ...msg.loadout };
        if (this.hostSim?.room.roomId === cleanCode || this.guestRoomState?.roomId === cleanCode) {
          return;
        }
        this.cleanupRoomOnLeave(true);
        this.pendingJoinRoomId = cleanCode;
        this.mqtt.subscribe(`${TOPIC_PREFIX}/room/${cleanCode}/meta`);
        if (this.pendingJoinTimer) clearTimeout(this.pendingJoinTimer);
        this.pendingJoinTimer = setTimeout(() => {
          if (this.pendingJoinRoomId === cleanCode) {
            this.pendingJoinRoomId = null;
            this.pendingJoinTimer = null;
            this.mqtt.unsubscribe(`${TOPIC_PREFIX}/room/${cleanCode}/meta`);
            const msgText = `Room "${cleanCode}" was not found or has already closed.`;
            this.emit({ type: 'room:unavailable', reason: 'not_found', message: msgText });
            this.emitNotice('error', msgText);
          }
        }, 2500);
        break;
      }

      case 'room:quickplay': {
        if (msg.loadout) this.loadout = { ...msg.loadout };
        this.quickPlayArgs = { mapId: msg.mapId, mapName: msg.mapName, customMapConfig: msg.customMapConfig };
        const open = this.getPublicRooms();
        if (open.length > 0) {
          this.quickPlayPending = false;
          this.sendClientMessage({ type: 'room:join', roomId: open[0].roomId, loadout: this.loadout });
        } else {
          // Give retained public rooms a short beat, otherwise create public room immediately
          this.quickPlayPending = true;
          setTimeout(() => {
            if (this.quickPlayPending) {
              this.tryFinishQuickPlay(true);
            }
          }, 450);
        }
        break;
      }

      case 'room:leave': {
        this.cleanupRoomOnLeave(true);
        this.emit({ type: 'room:state', room: null });
        break;
      }

      case 'room:setReady':
      case 'room:setLoadout':
      case 'room:setMap':
      case 'room:start':
      case 'room:restart':
      case 'room:returnToLobby':
      case 'player:transform':
      case 'combat:shootFx':
      case 'combat:hitZombie':
      case 'combat:grenadeThrow':
      case 'combat:grenadeDetonate':
      case 'combat:barrelExplode':
      case 'player:repairBarrier':
      case 'player:revive': {
        if (this.hostSim) {
          this.handleHostInbound({ senderId: this.profile.playerId, msg });
        } else if (this.joinedRoomId) {
          this.mqtt.publish(
            `${TOPIC_PREFIX}/room/${this.joinedRoomId}/to-host`,
            JSON.stringify({ senderId: this.profile.playerId, msg }),
            false
          );
        }
        break;
      }
    }
  }

  private tryFinishQuickPlay(forceCreate = false) {
    if (!this.quickPlayPending) return;
    const open = this.getPublicRooms();
    if (open.length > 0) {
      this.quickPlayPending = false;
      this.sendClientMessage({ type: 'room:join', roomId: open[0].roomId, loadout: this.loadout });
    } else if (forceCreate) {
      this.quickPlayPending = false;
      const args = this.quickPlayArgs || { mapId: OFFICIAL_SECTOR_ZERO_ID, mapName: 'Sector Zero' };
      this.sendClientMessage({
        type: 'room:create',
        mapId: args.mapId,
        mapName: args.mapName,
        customMapConfig: args.customMapConfig,
        isPublic: true,
        loadout: this.loadout,
      });
    }
  }

  private startHostRoom(room: MultiplayerRoomState) {
    this.joinedRoomId = room.roomId;
    this.hostSim = {
      room,
      barriers: [],
      spawners: [],
      solidBoxes: [],
      explodedBarrelIds: new Set<string>(),
      zombies: [],
      spawnTimer: 0,
      zombieAttackTimers: new Map(),
      zombieBreakTimers: new Map(),
    };
    this.mqtt.subscribe(`${TOPIC_PREFIX}/room/${room.roomId}/to-host`);
    this.publishRoomMeta(room);
    this.publishPresence();
    this.emit({ type: 'room:state', room });
  }

  private cleanupRoomOnLeave(notifyNetwork: boolean) {
    const rid = this.joinedRoomId;
    if (this.hostSim) {
      const hId = this.hostSim.room.roomId;
      if (this.hostTickTimer) {
        clearInterval(this.hostTickTimer);
        this.hostTickTimer = null;
      }
      if (notifyNetwork && this.mqtt.isConnected) {
        this.mqtt.publish(`${TOPIC_PREFIX}/public-rooms/${hId}`, '', true);
        this.mqtt.publish(`${TOPIC_PREFIX}/room/${hId}/meta`, '', true);
        this.mqtt.publish(
          `${TOPIC_PREFIX}/room/${hId}/broadcast`,
          JSON.stringify({ msg: { type: 'room:state', room: null } satisfies ServerToClientMessage }),
          false
        );
      }
      this.mqtt.unsubscribe(`${TOPIC_PREFIX}/room/${hId}/to-host`);
      this.hostSim = null;
    } else if (rid) {
      if (notifyNetwork && this.mqtt.isConnected) {
        this.mqtt.publish(
          `${TOPIC_PREFIX}/room/${rid}/to-host`,
          JSON.stringify({ senderId: this.profile.playerId, kind: 'leave' }),
          false
        );
      }
      this.mqtt.unsubscribe(`${TOPIC_PREFIX}/room/${rid}/broadcast`);
      this.guestRoomState = null;
    }
    this.joinedRoomId = null;
    this.publishPresence();
  }

  private handleHostInbound(pkt: {
    senderId: string;
    kind?: string;
    member?: CoopMemberState;
    msg?: ClientToServerMessage;
  }) {
    const sim = this.hostSim;
    if (!sim) return;
    const room = sim.room;
    const senderId = pkt.senderId;

    if (pkt.kind === 'join' && pkt.member) {
      if (room.members.some((m) => m.playerId === senderId)) {
        this.broadcastRoomMsg(room.roomId, { type: 'room:state', room }, senderId);
        return;
      }
      if (room.members.length >= 4) {
        this.broadcastRoomMsg(
          room.roomId,
          { type: 'room:unavailable', reason: 'full', message: 'That squad room is already full (4/4 operators).' },
          senderId
        );
        return;
      }
      if (room.status !== 'lobby') {
        this.broadcastRoomMsg(
          room.roomId,
          {
            type: 'room:unavailable',
            reason: room.status === 'playing' ? 'in_progress' : 'ended',
            message: 'That match has already started or ended.',
          },
          senderId
        );
        return;
      }
      room.members.push({ ...pkt.member, isHost: false, ready: false });
      room.isJoinable = room.members.length < 4;
      this.publishRoomMeta(room);
      this.broadcastRoomMsg(room.roomId, { type: 'room:state', room });
      return;
    }

    if (pkt.kind === 'leave') {
      const idx = room.members.findIndex((m) => m.playerId === senderId);
      if (idx !== -1) {
        room.members.splice(idx, 1);
        if (room.status === 'lobby') room.isJoinable = room.members.length < 4;
        this.publishRoomMeta(room);
        this.broadcastRoomMsg(room.roomId, { type: 'room:state', room });
      }
      return;
    }

    const msg = pkt.msg;
    if (!msg) return;

    switch (msg.type) {
      case 'room:setReady': {
        const m = room.members.find((mem) => mem.playerId === senderId);
        if (m) {
          m.ready = Boolean(msg.ready);
          this.publishRoomMeta(room);
          this.broadcastRoomMsg(room.roomId, { type: 'room:state', room });
        }
        break;
      }

      case 'room:setLoadout': {
        const m = room.members.find((mem) => mem.playerId === senderId);
        if (m) {
          m.loadout = { ...msg.loadout };
          if (room.status === 'lobby') m.weaponId = msg.loadout.startingPistolId || 'pistol';
          this.publishRoomMeta(room);
          this.broadcastRoomMsg(room.roomId, { type: 'room:state', room });
        }
        break;
      }

      case 'room:setMap': {
        if (senderId !== room.hostPlayerId || room.status === 'playing') return;
        room.mapId = msg.mapId;
        room.mapName = sanitizeMapName(msg.mapName);
        room.customMapConfig = msg.customMapConfig;
        this.publishRoomMeta(room);
        this.broadcastRoomMsg(room.roomId, { type: 'room:state', room });
        this.publishPresence();
        break;
      }

      case 'room:returnToLobby': {
        if (senderId !== room.hostPlayerId) return;
        if (this.hostTickTimer) {
          clearInterval(this.hostTickTimer);
          this.hostTickTimer = null;
        }
        room.status = 'lobby';
        room.isJoinable = room.members.length < 4;
        sim.zombies = [];
        for (const m of room.members) {
          m.isDowned = false;
          m.hp = 100;
          m.maxHp = 100;
          m.ready = m.playerId === room.hostPlayerId;
        }
        this.publishRoomMeta(room);
        this.broadcastRoomMsg(room.roomId, { type: 'room:state', room });
        this.publishPresence();
        break;
      }

      case 'room:start':
      case 'room:restart': {
        if (senderId !== room.hostPlayerId) return;
        let nav: { barriers: NetBarrierDef[]; spawners: NetSpawnerPos[]; solidBoxes: NetSolidBox[] };
        if (msg.type === 'room:start' && (msg.barriers || msg.spawners || msg.solidBoxes)) {
          nav = {
            barriers: msg.barriers || [],
            spawners: msg.spawners || [],
            solidBoxes: msg.solidBoxes || [],
          };
        } else if (room.customMapConfig) {
          nav = extractCustomMapNav(room.customMapConfig);
        } else if (room.mapId === OFFICIAL_BLIGHTED_WOODS_ID) {
          nav = getBlightedWoodsDefaults();
        } else {
          nav = getSectorZeroDefaults();
        }

        sim.barriers = nav.barriers.map((b) => ({ ...b, planks: 5, maxPlanks: 5 }));
        sim.spawners = nav.spawners;
        sim.solidBoxes = nav.solidBoxes;
        sim.zombies = [];
        sim.zombieAttackTimers.clear();
        sim.zombieBreakTimers.clear();
        sim.explodedBarrelIds.clear();
        room.barriers = sim.barriers.map((b) => ({ id: b.id, planks: b.planks }));
        room.explodedBarrelIds = [];
        room.status = 'playing';
        room.isJoinable = false;

        room.members.forEach((m, idx) => {
          const angle = idx * 1.5;
          m.x = r2(Math.cos(angle) * 1.5);
          m.y = 1.6;
          m.z = r2(Math.sin(angle) * 1.5);
          m.hp = 100;
          m.maxHp = 100;
          m.isDowned = false;
          m.bleedoutTimer = 25;
          m.score = 500;
          m.kills = 0;
          m.headshots = 0;
          m.weaponId = m.loadout.startingPistolId || 'pistol';
          m.isPap = false;
        });

        this.startHostRound(1);
        this.publishRoomMeta(room);
        this.broadcastRoomMsg(room.roomId, {
          type: 'room:matchStarted',
          room,
          zombies: sim.zombies,
        });
        this.publishPresence();

        if (this.hostTickTimer) clearInterval(this.hostTickTimer);
        this.hostTickTimer = setInterval(() => this.tickHostSimulation(), 67);
        break;
      }

      case 'player:transform': {
        const m = room.members.find((mem) => mem.playerId === senderId);
        if (!m) return;
        m.x = r2(msg.x);
        m.y = r2(msg.y);
        m.z = r2(msg.z);
        m.yaw = r2(msg.yaw);
        m.pitch = r2(msg.pitch);
        m.weaponId = msg.weaponId;
        m.isPap = msg.isPap;
        m.isFlashlightOn = msg.isFlashlightOn;
        m.isMoving = msg.isMoving;
        m.hp = msg.hp;
        m.maxHp = msg.maxHp;
        const becameDowned = !m.isDowned && msg.isDowned;
        m.isDowned = msg.isDowned;
        if (becameDowned) m.bleedoutTimer = 25;
        m.score = msg.score;
        m.kills = msg.kills;
        m.headshots = msg.headshots;
        if (becameDowned) this.checkHostGameOver();
        break;
      }

      case 'combat:shootFx': {
        if (room.status !== 'playing') return;
        this.broadcastRoomMsg(room.roomId, {
          type: 'fx:shoot',
          shooterPlayerId: senderId,
          origin: msg.origin,
          dir: msg.dir,
          weaponId: msg.weaponId,
          weaponType: msg.weaponType,
          isPap: msg.isPap,
          color: msg.color,
        });
        break;
      }

      case 'combat:hitZombie': {
        if (room.status !== 'playing') return;
        const zIdx = sim.zombies.findIndex((z) => z.id === msg.zombieId);
        if (zIdx === -1) return;
        const z = sim.zombies[zIdx];
        z.health -= Math.max(0, msg.damage);
        if (msg.statusEffect === 'stun') z.stunTimer = Math.max(z.stunTimer, msg.statusDuration || 5.0);
        else if (msg.statusEffect === 'slow') z.slowTimer = Math.max(z.slowTimer, msg.statusDuration || 6.0);
        else if (msg.statusEffect === 'burn') z.burnTimer = Math.max(z.burnTimer, msg.statusDuration || 3.5);

        if (z.health <= 0) {
          sim.zombies.splice(zIdx, 1);
          sim.zombieAttackTimers.delete(z.id);
          sim.zombieBreakTimers.delete(z.id);
          let pts = 60;
          let reason = msg.reason || 'ZOMBIE KILL';
          const isHeadshot = msg.hitType === 'head';
          if (!msg.reason) {
            if (msg.hitType === 'head') {
              pts = 100;
              reason = 'HEADSHOT KILL!';
            } else if (msg.hitType === 'chest') {
              pts = 75;
              reason = 'VITAL CHEST KILL!';
            } else if (msg.hitType === 'limb') {
              pts = 50;
              reason = 'LIMB KILL';
            }
          } else {
            pts = msg.hitType === 'head' ? 100 : 85;
          }
          this.broadcastRoomMsg(room.roomId, {
            type: 'zombie:killed',
            zombieId: z.id,
            killerPlayerId: senderId,
            points: pts,
            reason,
            isHeadshot,
            hitPoint: msg.hitPoint,
          });
        } else if (!msg.statusEffect) {
          let reason = 'BODY HIT';
          if (msg.hitType === 'head') reason = 'HEADSHOT HIT! [3.0x]';
          else if (msg.hitType === 'chest') reason = 'CHEST VITAL HIT [1.6x]';
          else if (msg.hitType === 'limb') reason = 'LIMB HIT [0.6x]';
          this.broadcastRoomMsg(
            room.roomId,
            { type: 'zombie:hitConfirm', zombieId: z.id, killerPlayerId: senderId, points: 10, reason },
            senderId
          );
        }
        break;
      }

      case 'combat:grenadeThrow': {
        if (room.status !== 'playing') return;
        this.broadcastRoomMsg(room.roomId, {
          type: 'fx:grenadeThrow',
          throwerPlayerId: senderId,
          grenadeType: msg.grenadeType,
          pos: msg.pos,
          vel: msg.vel,
          fuse: msg.fuse,
        });
        break;
      }

      case 'combat:grenadeDetonate': {
        if (room.status !== 'playing') return;
        this.broadcastRoomMsg(room.roomId, {
          type: 'fx:grenadeDetonate',
          throwerPlayerId: senderId,
          grenadeType: msg.grenadeType,
          center: msg.center,
          radius: msg.radius,
        });
        this.applyHostGrenadeDamage(msg.grenadeType, msg.center, msg.radius, msg.damage, senderId);
        break;
      }

      case 'combat:barrelExplode': {
        if (room.status !== 'playing') return;
        if (sim.explodedBarrelIds.has(msg.barrelId)) return;
        sim.explodedBarrelIds.add(msg.barrelId);
        this.broadcastRoomMsg(room.roomId, {
          type: 'fx:barrelExplode',
          barrelId: msg.barrelId,
          pos: msg.pos,
        });
        const blastRadius = 6.5;
        for (let i = sim.zombies.length - 1; i >= 0; i--) {
          const z = sim.zombies[i];
          const dist = Math.hypot(z.x - msg.pos.x, z.y - msg.pos.y, z.z - msg.pos.z);
          if (dist <= blastRadius) {
            z.health -= 320 * (1 - dist / (blastRadius * 1.2));
            if (z.health <= 0) {
              sim.zombies.splice(i, 1);
              sim.zombieAttackTimers.delete(z.id);
              sim.zombieBreakTimers.delete(z.id);
              this.broadcastRoomMsg(room.roomId, {
                type: 'zombie:killed',
                zombieId: z.id,
                killerPlayerId: senderId,
                points: 80,
                reason: 'BARREL BLAST KILL!',
                isHeadshot: false,
                hitPoint: { x: r2(z.x), y: r2(z.y + 1), z: r2(z.z) },
              });
            }
          }
        }
        break;
      }

      case 'player:repairBarrier': {
        if (room.status !== 'playing') return;
        const bar = sim.barriers.find((b) => b.id === msg.barrierId);
        if (!bar || bar.planks >= bar.maxPlanks) return;
        bar.planks++;
        this.broadcastRoomMsg(room.roomId, {
          type: 'barrier:updated',
          barrierId: bar.id,
          planks: bar.planks,
          repairedBy: senderId,
        });
        break;
      }

      case 'player:revive': {
        if (room.status !== 'playing') return;
        const target = room.members.find((m) => m.playerId === msg.targetPlayerId);
        if (!target || !target.isDowned) return;
        target.isDowned = false;
        target.hp = 100;
        target.bleedoutTimer = 25;
        const reviver = room.members.find((m) => m.playerId === senderId);
        this.broadcastRoomMsg(room.roomId, {
          type: 'player:revived',
          targetPlayerId: target.playerId,
          reviverPlayerId: senderId,
          reviverName: reviver?.displayName || 'Teammate',
        });
        break;
      }
    }
  }

  private applyHostGrenadeDamage(
    grenadeType: GrenadeType,
    center: { x: number; y: number; z: number },
    radius: number,
    damage: number,
    senderId: string
  ) {
    const sim = this.hostSim;
    if (!sim) return;
    for (let i = sim.zombies.length - 1; i >= 0; i--) {
      const z = sim.zombies[i];
      const dist = Math.hypot(z.x - center.x, z.y + 1.0 - center.y, z.z - center.z);
      if (dist <= radius) {
        if (grenadeType === 'flashbang') {
          z.stunTimer = Math.max(z.stunTimer, 5.0);
          z.health -= damage;
        } else if (grenadeType === 'cryo') {
          z.slowTimer = Math.max(z.slowTimer, 6.0);
          z.health -= damage * Math.max(0.4, 1 - dist / (radius * 1.15));
        } else if (grenadeType === 'thermite') {
          z.burnTimer = Math.max(z.burnTimer, 3.5);
          z.health -= damage * 0.65;
        } else {
          z.health -= damage * Math.max(0.35, 1 - dist / (radius * 1.15));
        }
        if (z.health <= 0) {
          sim.zombies.splice(i, 1);
          sim.zombieAttackTimers.delete(z.id);
          sim.zombieBreakTimers.delete(z.id);
          const reason =
            grenadeType === 'cryo'
              ? 'CRYO SHATTER KILL!'
              : grenadeType === 'thermite'
              ? 'THERMITE BLAST KILL!'
              : grenadeType === 'flashbang'
              ? 'FLASHBANG KILL!'
              : 'FRAG GRENADE KILL!';
          this.broadcastRoomMsg(sim.room.roomId, {
            type: 'zombie:killed',
            zombieId: z.id,
            killerPlayerId: senderId,
            points: 85,
            reason,
            isHeadshot: false,
            hitPoint: { x: r2(z.x), y: r2(z.y + 1), z: r2(z.z) },
          });
        }
      }
    }
  }

  private startHostRound(roundNum: number) {
    const sim = this.hostSim;
    if (!sim) return;
    const room = sim.room;
    room.round = roundNum;
    room.isRoundBreak = true;
    room.roundBreakTimer = 5;
    sim.explodedBarrelIds.clear();
    const squadBonus = Math.max(0, room.members.length - 1) * 3;
    room.zombiesToSpawn = 6 + (roundNum - 1) * 4 + squadBonus;
    sim.spawnTimer = 0;

    this.broadcastRoomMsg(room.roomId, {
      type: 'round:started',
      round: room.round,
      isRoundBreak: room.isRoundBreak,
      roundBreakTimer: room.roundBreakTimer,
      zombiesToSpawn: room.zombiesToSpawn,
    });
    this.publishPresence();
  }

  private spawnHostZombie() {
    const sim = this.hostSim;
    if (!sim || sim.room.zombiesToSpawn <= 0) return;

    let sx = 0;
    let sy = 0;
    let sz = 0;
    let windowId: number | null = null;
    let initialState: NetZombieState['state'] = 'chasing_player';

    if (sim.spawners.length > 0) {
      const sp = sim.spawners[Math.floor(Math.random() * sim.spawners.length)];
      sx = sp.x;
      sy = sp.y;
      sz = sp.z;
      let closestBarrier: NetBarrierDef | null = null;
      let minD = 10.0;
      for (const b of sim.barriers) {
        const d = Math.hypot(b.x - sx, b.z - sz);
        if (d < minD && b.planks > 0) {
          minD = d;
          closestBarrier = b;
        }
      }
      if (closestBarrier) {
        windowId = closestBarrier.id;
        initialState = 'approaching_window';
      }
    } else if (sim.barriers.length > 0) {
      const bar = sim.barriers[Math.floor(Math.random() * sim.barriers.length)];
      sx = bar.x + bar.dirX * -3.5;
      sy = 0;
      sz = bar.z + bar.dirZ * -3.5;
      windowId = bar.id;
      initialState = 'approaching_window';
    } else if (sim.solidBoxes.length === 0) {
      sx = (Math.random() - 0.5) * 16;
      sy = 0;
      sz = (Math.random() - 0.5) * 16;
    } else {
      return;
    }

    const hp = Math.round(100 * Math.pow(1.18, sim.room.round - 1));
    const speed = r2(0.65 + Math.min((sim.room.round - 1) * 0.28, 2.4));
    const id = `z_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;

    sim.zombies.push({
      id,
      x: r2(sx),
      y: r2(sy),
      z: r2(sz),
      yaw: 0,
      health: hp,
      maxHealth: hp,
      speed,
      damage: 30,
      windowId,
      state: initialState,
      stunTimer: 0,
      slowTimer: 0,
      burnTimer: 0,
    });
    sim.zombieAttackTimers.set(id, 0);
    sim.zombieBreakTimers.set(id, 0);
    sim.room.zombiesToSpawn--;
  }

  private resolveHostZombieCollisions(z: NetZombieState) {
    const sim = this.hostSim;
    if (!sim || sim.solidBoxes.length === 0) return;
    const radius = 0.45;
    for (const box of sim.solidBoxes) {
      if (z.y >= box.maxY - 0.05 || z.y + 1.8 <= box.minY + 0.05) continue;
      const cx = Math.max(box.minX, Math.min(z.x, box.maxX));
      const cz = Math.max(box.minZ, Math.min(z.z, box.maxZ));
      const dx = z.x - cx;
      const dz = z.z - cz;
      const distSq = dx * dx + dz * dz;
      if (distSq < radius * radius) {
        if (distSq > 0.0001) {
          const dist = Math.sqrt(distSq);
          const push = radius - dist;
          z.x += (dx / dist) * push;
          z.z += (dz / dist) * push;
        } else {
          const dLeft = Math.abs(z.x - box.minX);
          const dRight = Math.abs(box.maxX - z.x);
          const dTop = Math.abs(z.z - box.minZ);
          const dBot = Math.abs(box.maxZ - z.z);
          const m = Math.min(dLeft, dRight, dTop, dBot);
          if (m === dLeft) z.x = box.minX - radius;
          else if (m === dRight) z.x = box.maxX + radius;
          else if (m === dTop) z.z = box.minZ - radius;
          else z.z = box.maxZ + radius;
        }
      }
    }
  }

  private checkHostGameOver() {
    const sim = this.hostSim;
    if (!sim || sim.room.status !== 'playing' || sim.room.members.length === 0) return;
    const anyAlive = sim.room.members.some((m) => !m.isDowned);
    if (!anyAlive) {
      if (this.hostTickTimer) {
        clearInterval(this.hostTickTimer);
        this.hostTickTimer = null;
      }
      sim.room.status = 'gameover';
      sim.room.isJoinable = false;
      sim.zombies = [];
      sim.room.zombiesToSpawn = 0;
      this.publishRoomMeta(sim.room);
      this.broadcastRoomMsg(sim.room.roomId, { type: 'room:gameOver', round: sim.room.round });
      this.broadcastRoomMsg(sim.room.roomId, { type: 'room:state', room: sim.room });
      this.publishPresence();
    }
  }

  private tickHostSimulation() {
    const sim = this.hostSim;
    if (!sim || sim.room.status !== 'playing' || sim.room.members.length === 0) return;
    const dt = 0.067;
    const room = sim.room;

    for (const m of room.members) {
      if (m.isDowned) m.bleedoutTimer = Math.max(0, m.bleedoutTimer - dt);
    }

    if (room.isRoundBreak) {
      room.roundBreakTimer -= dt;
      if (room.roundBreakTimer <= 0) {
        room.isRoundBreak = false;
        room.roundBreakTimer = 0;
      }
    } else {
      sim.spawnTimer += dt;
      const alivePlayers = room.members.filter((m) => !m.isDowned);
      const allInLava =
        room.mapId === OFFICIAL_BLIGHTED_WOODS_ID &&
        alivePlayers.length > 0 &&
        alivePlayers.every((m) => m.z < -120);
      const maxConcurrent = Math.min(22, 14 + room.members.length * 2);
      if (!allInLava && sim.spawnTimer >= 2.2 && room.zombiesToSpawn > 0 && sim.zombies.length < maxConcurrent) {
        sim.spawnTimer = 0;
        this.spawnHostZombie();
      }
    }

    for (let i = 0; i < sim.zombies.length; i++) {
      for (let j = i + 1; j < sim.zombies.length; j++) {
        const z1 = sim.zombies[i];
        const z2 = sim.zombies[j];
        const dx = z1.x - z2.x;
        const dz = z1.z - z2.z;
        const distSq = dx * dx + dz * dz;
        if (distSq > 0.0001 && distSq < 0.7225) {
          const dist = Math.sqrt(distSq);
          const overlap = (0.85 - dist) * 0.5;
          const px = (dx / dist) * overlap * 2.0 * dt;
          const pz = (dz / dist) * overlap * 2.0 * dt;
          z1.x += px;
          z1.z += pz;
          z2.x -= px;
          z2.z -= pz;
        }
      }
    }

    const activeMembers = room.members.filter((m) => !m.isDowned);
    for (let i = sim.zombies.length - 1; i >= 0; i--) {
      const z = sim.zombies[i];
      if (z.slowTimer > 0) z.slowTimer = Math.max(0, z.slowTimer - dt);
      if (z.burnTimer > 0) {
        z.burnTimer = Math.max(0, z.burnTimer - dt);
        z.health -= 65 * dt;
        if (z.health <= 0) {
          sim.zombies.splice(i, 1);
          sim.zombieAttackTimers.delete(z.id);
          sim.zombieBreakTimers.delete(z.id);
          this.broadcastRoomMsg(room.roomId, {
            type: 'zombie:killed',
            zombieId: z.id,
            killerPlayerId: room.hostPlayerId,
            points: 75,
            reason: 'THERMITE KILL!',
            isHeadshot: false,
            hitPoint: { x: r2(z.x), y: r2(z.y + 1), z: r2(z.z) },
          });
          continue;
        }
      }

      if (z.stunTimer > 0) {
        z.stunTimer = Math.max(0, z.stunTimer - dt);
        continue;
      }

      const speedMult = z.slowTimer > 0 ? 0.25 : 1.0;
      const effSpeed = z.speed * speedMult;
      const barrier = z.windowId !== null ? sim.barriers.find((b) => b.id === z.windowId) || null : null;

      if (z.state === 'approaching_window' && barrier) {
        const tx = barrier.x + barrier.dirX * -1.4;
        const tz = barrier.z + barrier.dirZ * -1.4;
        const dx = tx - z.x;
        const dz = tz - z.z;
        const dist = Math.hypot(dx, dz);
        if (dist > 0.001) {
          z.x = r2(z.x + (dx / dist) * effSpeed * dt);
          z.z = r2(z.z + (dz / dist) * effSpeed * dt);
          z.yaw = r2(Math.atan2(dx, dz) + Math.PI);
        }
        if (dist < 0.4) z.state = 'breaking_planks';
      } else if (z.state === 'breaking_planks' && barrier) {
        z.x = r2(barrier.x + barrier.dirX * -1.4);
        z.z = r2(barrier.z + barrier.dirZ * -1.4);
        z.yaw = r2(Math.atan2(barrier.x - z.x, barrier.z - z.z) + Math.PI);
        const bt = (sim.zombieBreakTimers.get(z.id) || 0) + dt * speedMult;
        if (bt >= 1.5) {
          sim.zombieBreakTimers.set(z.id, 0);
          if (barrier.planks > 0) {
            barrier.planks--;
            this.broadcastRoomMsg(room.roomId, {
              type: 'barrier:updated',
              barrierId: barrier.id,
              planks: barrier.planks,
            });
          } else {
            z.state = 'entering_room';
          }
        } else {
          sim.zombieBreakTimers.set(z.id, bt);
        }
      } else if (z.state === 'entering_room' && barrier) {
        const ex = barrier.x + barrier.dirX * 2.0;
        const ez = barrier.z + barrier.dirZ * 2.0;
        const dx = ex - z.x;
        const dz = ez - z.z;
        const dist = Math.hypot(dx, dz);
        if (dist > 0.001) {
          z.x = r2(z.x + (dx / dist) * effSpeed * dt);
          z.z = r2(z.z + (dz / dist) * effSpeed * dt);
          z.yaw = r2(Math.atan2(dx, dz) + Math.PI);
        }
        if (dist < 0.8) {
          z.state = 'chasing_player';
          z.windowId = null;
        }
      } else {
        let target: CoopMemberState | null = null;
        let minTargetDist = Infinity;
        for (const m of activeMembers) {
          if (room.mapId === OFFICIAL_BLIGHTED_WOODS_ID && m.z < -120) continue;
          const d = Math.hypot(m.x - z.x, m.z - z.z);
          if (d < minTargetDist) {
            minTargetDist = d;
            target = m;
          }
        }

        if (!target && activeMembers.length > 0 && room.mapId === OFFICIAL_BLIGHTED_WOODS_ID) {
          const dx = -15 - z.x;
          const dz = -14 - z.z;
          const dist = Math.hypot(dx, dz);
          z.yaw = r2(Math.atan2(dx, dz) + Math.PI);
          if (dist > 3.2) {
            z.x = r2(z.x + (dx / dist) * effSpeed * dt);
            z.z = r2(z.z + (dz / dist) * effSpeed * dt);
            this.resolveHostZombieCollisions(z);
          }
          z.state = 'chasing_player';
        } else if (target) {
          const dx = target.x - z.x;
          const dz = target.z - z.z;
          const dist = Math.hypot(dx, dz);
          z.yaw = r2(Math.atan2(dx, dz) + Math.PI);
          if (dist > 1.35) {
            z.x = r2(z.x + (dx / dist) * effSpeed * dt);
            z.z = r2(z.z + (dz / dist) * effSpeed * dt);
            this.resolveHostZombieCollisions(z);
            z.state = 'chasing_player';
          } else {
            z.state = 'attacking';
            const at = (sim.zombieAttackTimers.get(z.id) || 0) + dt * speedMult;
            if (at >= 1.0) {
              sim.zombieAttackTimers.set(z.id, 0);
              this.broadcastRoomMsg(
                room.roomId,
                { type: 'zombie:attackPlayer', targetPlayerId: target.playerId, damage: z.damage },
                target.playerId
              );
            } else {
              sim.zombieAttackTimers.set(z.id, at);
            }
          }
        }
      }
    }

    if (room.zombiesToSpawn <= 0 && sim.zombies.length === 0 && !room.isRoundBreak) {
      this.startHostRound(room.round + 1);
    }

    this.broadcastRoomMsg(room.roomId, {
      type: 'world:snapshot',
      round: room.round,
      isRoundBreak: room.isRoundBreak,
      roundBreakTimer: r2(room.roundBreakTimer),
      zombiesToSpawn: room.zombiesToSpawn,
      zombies: sim.zombies,
      members: room.members,
    });
  }
}
