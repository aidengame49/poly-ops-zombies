import express from 'express';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { WebSocketServer, WebSocket } from 'ws';
import type {
  ClientToServerMessage,
  CoopMemberState,
  FriendEntry,
  FriendPresenceStatus,
  FriendRequestEntry,
  NetBarrierDef,
  NetSolidBox,
  NetSpawnerPos,
  NetZombieState,
  MultiplayerRoomState,
  PublicRoomSummary,
  ServerToClientMessage,
} from './src/types/multiplayer.ts';
import type { CustomMapConfig, PlayerLoadout } from './src/types/game.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const DB_FILE = '/tmp/polyops-social-db.json';
const OFFICIAL_SECTOR_ZERO_ID = 'default_der_abandoned';
const OFFICIAL_BLIGHTED_WOODS_ID = 'official_blighted_woods';

const DEFAULT_LOADOUT: PlayerLoadout = {
  startingPistolId: 'pistol',
  grenadeType: 'frag',
};

// ---------------------------------------------------------------------------
// Persistent Social Database (Assigned Numeric Player IDs + Friends Graph)
// ---------------------------------------------------------------------------
interface StoredProfile {
  playerId: string; // Unique 8-digit numeric string
  authToken: string;
  displayName: string;
  crazyGamesUsername: string | null;
  friends: string[];
  incomingRequests: FriendRequestEntry[];
  outgoingRequests: string[];
  createdAt: number;
}

interface SocialDB {
  profilesById: Record<string, StoredProfile>;
  tokenToId: Record<string, string>;
  cgNameToId: Record<string, string>;
}

let socialDb: SocialDB = {
  profilesById: {},
  tokenToId: {},
  cgNameToId: {},
};

function loadSocialDb() {
  try {
    if (fs.existsSync(DB_FILE)) {
      const raw = fs.readFileSync(DB_FILE, 'utf-8');
      const parsed = JSON.parse(raw) as Partial<SocialDB>;
      if (parsed && typeof parsed === 'object' && parsed.profilesById && parsed.tokenToId) {
        socialDb = {
          profilesById: parsed.profilesById,
          tokenToId: parsed.tokenToId,
          cgNameToId: parsed.cgNameToId || {},
        };
      }
    }
  } catch (err) {
    console.warn('Could not load social DB, starting fresh:', err);
  }
}

let saveDbTimer: ReturnType<typeof setTimeout> | null = null;
function scheduleSaveDb() {
  if (saveDbTimer) return;
  saveDbTimer = setTimeout(() => {
    saveDbTimer = null;
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(socialDb, null, 2), 'utf-8');
    } catch (err) {
      console.warn('Failed to persist social DB:', err);
    }
  }, 250);
}

function generateUniqueNumericPlayerId(): string {
  for (let i = 0; i < 1000; i++) {
    const num = Math.floor(10000000 + Math.random() * 89999999);
    const id = String(num);
    if (!socialDb.profilesById[id]) {
      return id;
    }
  }
  return String(Date.now()).slice(-8);
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

function getOrCreateProfile(
  authToken: string,
  requestedName?: string,
  crazyGamesUsername?: string | null,
  preferredPlayerId?: string
): StoredProfile {
  const cleanToken = (authToken || '').trim().slice(0, 128) || `anon_${Math.random().toString(36).slice(2)}`;
  const cgClean = crazyGamesUsername ? crazyGamesUsername.trim() : null;
  const cgKey = cgClean ? cgClean.toLowerCase() : null;

  let existingId = socialDb.tokenToId[cleanToken];
  if (!existingId && cgKey && socialDb.cgNameToId[cgKey]) {
    existingId = socialDb.cgNameToId[cgKey];
    socialDb.tokenToId[cleanToken] = existingId;
  }

  if (existingId && socialDb.profilesById[existingId]) {
    const profile = socialDb.profilesById[existingId];
    if (cgClean) {
      profile.crazyGamesUsername = cgClean;
      if (cgKey) socialDb.cgNameToId[cgKey] = existingId;
      profile.displayName = sanitizeDisplayName(cgClean, profile.playerId);
    } else if (requestedName && requestedName.trim().length >= 2 && profile.displayName.startsWith('Operator #')) {
      profile.displayName = sanitizeDisplayName(requestedName, profile.playerId);
    }
    scheduleSaveDb();
    return profile;
  }

  const cleanPrefId = (preferredPlayerId || '').replace(/\D/g, '');
  const playerId =
    cleanPrefId.length === 8 && !socialDb.profilesById[cleanPrefId]
      ? cleanPrefId
      : generateUniqueNumericPlayerId();
  const displayName = sanitizeDisplayName(crazyGamesUsername || requestedName, playerId);
  const created: StoredProfile = {
    playerId,
    authToken: cleanToken,
    displayName,
    crazyGamesUsername: crazyGamesUsername || null,
    friends: [],
    incomingRequests: [],
    outgoingRequests: [],
    createdAt: Date.now(),
  };

  socialDb.profilesById[playerId] = created;
  socialDb.tokenToId[cleanToken] = playerId;
  if (cgKey) {
    socialDb.cgNameToId[cgKey] = playerId;
  }
  scheduleSaveDb();
  return created;
}

loadSocialDb();

// ---------------------------------------------------------------------------
// Active Connections & Server-Authoritative Co-Op Rooms
// ---------------------------------------------------------------------------
interface ClientSession {
  ws: WebSocket;
  playerId: string | null;
  roomId: string | null;
  loadout: PlayerLoadout;
  isAlive: boolean;
}

interface RoomInternal {
  roomId: string;
  hostPlayerId: string;
  isPublic: boolean;
  isJoinable: boolean;
  status: 'lobby' | 'playing' | 'gameover';
  mapId: string;
  mapName: string;
  customMapConfig?: CustomMapConfig;
  round: number;
  isRoundBreak: boolean;
  roundBreakTimer: number;
  zombiesToSpawn: number;
  spawnTimer: number;
  barriers: NetBarrierDef[];
  spawners: NetSpawnerPos[];
  solidBoxes: NetSolidBox[];
  explodedBarrelIds: Set<string>;
  zombies: NetZombieState[];
  members: Map<string, CoopMemberState>;
  zombieAttackTimers: Map<string, number>;
  zombieBreakTimers: Map<string, number>;
  zombieWalkCycles: Map<string, number>;
}

const sessions = new Set<ClientSession>();
const onlineByPlayerId = new Map<string, ClientSession>();
const rooms = new Map<string, RoomInternal>();

function sendMsg(ws: WebSocket, msg: ServerToClientMessage) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(msg));
  }
}

function sendNotice(ws: WebSocket, level: 'info' | 'success' | 'error', message: string) {
  sendMsg(ws, { type: 'social:notice', level, message });
}

function getPlayerPresence(playerId: string): {
  status: FriendPresenceStatus;
  roomId: string | null;
  roomJoinable: boolean;
  mapName: string | null;
  round?: number;
} {
  const sess = onlineByPlayerId.get(playerId);
  if (!sess) {
    return { status: 'offline', roomId: null, roomJoinable: false, mapName: null };
  }
  if (!sess.roomId) {
    return { status: 'online', roomId: null, roomJoinable: false, mapName: null };
  }
  const room = rooms.get(sess.roomId);
  if (!room) {
    return { status: 'online', roomId: null, roomJoinable: false, mapName: null };
  }
  return {
    status: room.status === 'playing' ? 'playing' : 'lobby',
    roomId: room.roomId,
    roomJoinable: room.isJoinable && room.members.size < 4,
    mapName: room.mapName,
    round: room.status === 'playing' ? room.round : undefined,
  };
}

function buildFriendsList(profile: StoredProfile): FriendEntry[] {
  return profile.friends
    .map((fid) => {
      const fProf = socialDb.profilesById[fid];
      if (!fProf) return null;
      const pres = getPlayerPresence(fid);
      return {
        playerId: fProf.playerId,
        displayName: fProf.displayName,
        status: pres.status,
        roomId: pres.roomId,
        roomJoinable: pres.roomJoinable,
        mapName: pres.mapName,
        round: pres.round,
      };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null)
    .sort((a, b) => {
      const rank = (s: FriendPresenceStatus) => (s === 'lobby' ? 0 : s === 'playing' ? 1 : s === 'online' ? 2 : 3);
      return rank(a.status) - rank(b.status) || a.displayName.localeCompare(b.displayName);
    });
}

function pushSocialSync(playerId: string) {
  const sess = onlineByPlayerId.get(playerId);
  const profile = socialDb.profilesById[playerId];
  if (!sess || !profile) return;

  sendMsg(sess.ws, {
    type: 'social:sync',
    profile: {
      playerId: profile.playerId,
      displayName: profile.displayName,
      crazyGamesUsername: profile.crazyGamesUsername,
    },
    friends: buildFriendsList(profile),
    incomingRequests: profile.incomingRequests,
    outgoingRequests: profile.outgoingRequests,
  });
}

function notifyFriendsPresenceChanged(playerId: string) {
  const profile = socialDb.profilesById[playerId];
  if (!profile) return;
  for (const fid of profile.friends) {
    pushSocialSync(fid);
  }
}

function serializeRoom(room: RoomInternal): MultiplayerRoomState {
  return {
    roomId: room.roomId,
    hostPlayerId: room.hostPlayerId,
    isPublic: room.isPublic,
    isJoinable: room.status === 'lobby' && room.isJoinable && room.members.size < 4,
    status: room.status,
    mapId: room.mapId,
    mapName: room.mapName,
    customMapConfig: room.customMapConfig,
    round: room.round,
    isRoundBreak: room.isRoundBreak,
    roundBreakTimer: room.roundBreakTimer,
    zombiesToSpawn: room.zombiesToSpawn,
    barriers: room.barriers.map((b) => ({ id: b.id, planks: b.planks })),
    explodedBarrelIds: Array.from(room.explodedBarrelIds),
    members: Array.from(room.members.values()),
  };
}

function broadcastToRoom(room: RoomInternal, msg: ServerToClientMessage, excludePlayerId?: string) {
  for (const memberId of room.members.keys()) {
    if (excludePlayerId && memberId === excludePlayerId) continue;
    const sess = onlineByPlayerId.get(memberId);
    if (sess) {
      sendMsg(sess.ws, msg);
    }
  }
}

function getPublicRoomsList(): PublicRoomSummary[] {
  const list: PublicRoomSummary[] = [];
  for (const room of rooms.values()) {
    if (room.isPublic && room.isJoinable && room.status === 'lobby' && room.members.size < 4) {
      const hostMember = room.members.get(room.hostPlayerId);
      list.push({
        roomId: room.roomId,
        hostName: hostMember?.displayName || `Operator #${room.hostPlayerId.slice(-4)}`,
        mapId: room.mapId,
        mapName: room.mapName,
        memberCount: room.members.size,
        maxMembers: 4,
      });
    }
  }
  return list.sort((a, b) => b.memberCount - a.memberCount);
}

let broadcastRoomsTimer: ReturnType<typeof setTimeout> | null = null;
function scheduleBroadcastPublicRooms() {
  if (broadcastRoomsTimer) return;
  broadcastRoomsTimer = setTimeout(() => {
    broadcastRoomsTimer = null;
    const payload: ServerToClientMessage = {
      type: 'rooms:publicList',
      rooms: getPublicRoomsList(),
      onlineCount: onlineByPlayerId.size,
    };
    for (const sess of onlineByPlayerId.values()) {
      sendMsg(sess.ws, payload);
    }
  }, 150);
}

function generateRoomCode(preferred?: string): string {
  const cleanPref = (preferred || '').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 24);
  if (cleanPref.length >= 3 && !rooms.has(cleanPref)) {
    return cleanPref;
  }
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  for (let attempt = 0; attempt < 100; attempt++) {
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
    if (!rooms.has(code)) return code;
  }
  return `OP${Date.now().toString().slice(-4)}`;
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
  // Perimeter woodland spawn points matching forestLavaMap tree/rock cover
  const spawners: NetSpawnerPos[] = [
    { x: -16, y: 0, z: -14 },
    { x: 15, y: 0, z: -15 },
    { x: -18, y: 0, z: 12 },
    { x: 17, y: 0, z: 14 },
    { x: 0, y: 0, z: -21 },
    { x: -20, y: 0, z: -2 },
    { x: 20, y: 0, z: 2 },
    { x: -10, y: 0, z: 19 },
    { x: 11, y: 0, z: 19 },
  ];
  return { barriers: [], spawners, solidBoxes: [] };
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
      const dirX = -Math.sin(ry);
      const dirZ = -Math.cos(ry);
      barriers.push({
        id: barrierId++,
        x: obj.position.x,
        y: obj.position.y,
        z: obj.position.z,
        dirX,
        dirZ,
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

function createMemberEntry(profile: StoredProfile, isHost: boolean, loadout: PlayerLoadout, index: number): CoopMemberState {
  const angle = index * 1.5;
  return {
    playerId: profile.playerId,
    displayName: profile.displayName,
    ready: isHost,
    isHost,
    isDowned: false,
    bleedoutTimer: 25,
    hp: 100,
    maxHp: 100,
    score: 500,
    kills: 0,
    headshots: 0,
    x: Math.cos(angle) * 1.5,
    y: 1.6,
    z: Math.sin(angle) * 1.5,
    yaw: 0,
    pitch: 0,
    weaponId: loadout.startingPistolId || 'pistol',
    isPap: false,
    isFlashlightOn: true,
    isMoving: false,
    loadout: { ...loadout },
  };
}

function leaveCurrentRoom(sess: ClientSession) {
  if (!sess.roomId || !sess.playerId) return;
  const room = rooms.get(sess.roomId);
  const leavingId = sess.playerId;
  sess.roomId = null;

  if (!room) return;
  room.members.delete(leavingId);

  if (room.members.size === 0) {
    rooms.delete(room.roomId);
  } else {
    if (room.status === 'lobby') {
      room.isJoinable = room.members.size < 4;
    }
    if (room.hostPlayerId === leavingId) {
      const nextHost = room.members.values().next().value;
      if (nextHost) {
        room.hostPlayerId = nextHost.playerId;
        nextHost.isHost = true;
        nextHost.ready = true;
      }
    }
    broadcastToRoom(room, { type: 'room:state', room: serializeRoom(room) });
  }

  sendMsg(sess.ws, { type: 'room:state', room: null });
  notifyFriendsPresenceChanged(leavingId);
  pushSocialSync(leavingId);
  scheduleBroadcastPublicRooms();
}

function startRoomRound(room: RoomInternal, roundNum: number) {
  room.round = roundNum;
  room.isRoundBreak = true;
  room.roundBreakTimer = 5;
  room.explodedBarrelIds.clear();
  const squadBonus = Math.max(0, room.members.size - 1) * 3;
  room.zombiesToSpawn = 6 + (roundNum - 1) * 4 + squadBonus;
  room.spawnTimer = 0;

  broadcastToRoom(room, {
    type: 'round:started',
    round: room.round,
    isRoundBreak: room.isRoundBreak,
    roundBreakTimer: room.roundBreakTimer,
    zombiesToSpawn: room.zombiesToSpawn,
  });
  notifyRoomMembersPresence(room);
}

function notifyRoomMembersPresence(room: RoomInternal) {
  for (const mid of room.members.keys()) {
    notifyFriendsPresenceChanged(mid);
    pushSocialSync(mid);
  }
}

function spawnServerZombie(room: RoomInternal) {
  if (room.zombiesToSpawn <= 0) return;

  let sx = 0;
  let sy = 0;
  let sz = 0;
  let windowId: number | null = null;
  let initialState: NetZombieState['state'] = 'chasing_player';

  if (room.spawners.length > 0) {
    const sp = room.spawners[Math.floor(Math.random() * room.spawners.length)];
    sx = sp.x;
    sy = sp.y;
    sz = sp.z;

    let closestBarrier: NetBarrierDef | null = null;
    let minD = 10.0;
    for (const b of room.barriers) {
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
  } else if (room.barriers.length > 0) {
    const bar = room.barriers[Math.floor(Math.random() * room.barriers.length)];
    sx = bar.x + bar.dirX * -3.5;
    sy = 0;
    sz = bar.z + bar.dirZ * -3.5;
    windowId = bar.id;
    initialState = 'approaching_window';
  } else if (room.solidBoxes.length === 0) {
    sx = (Math.random() - 0.5) * 16;
    sy = 0;
    sz = (Math.random() - 0.5) * 16;
  } else {
    return;
  }

  const hp = 100 * Math.pow(1.18, room.round - 1);
  const speed = 0.65 + Math.min((room.round - 1) * 0.28, 2.4);
  const id = `z_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;

  room.zombies.push({
    id,
    x: sx,
    y: sy,
    z: sz,
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
  room.zombieAttackTimers.set(id, 0);
  room.zombieBreakTimers.set(id, 0);
  room.zombieWalkCycles.set(id, Math.random() * Math.PI * 2);
  room.zombiesToSpawn--;
}

function resolveZombieSolidCollisions(room: RoomInternal, z: NetZombieState) {
  if (room.solidBoxes.length === 0) return;
  const radius = 0.45;
  for (const box of room.solidBoxes) {
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

function checkRoomGameOver(room: RoomInternal) {
  if (room.status !== 'playing' || room.members.size === 0) return;
  const anyAlive = Array.from(room.members.values()).some((m) => !m.isDowned);
  if (!anyAlive) {
    room.status = 'gameover';
    room.isJoinable = false;
    room.zombies = [];
    room.zombiesToSpawn = 0;
    broadcastToRoom(room, { type: 'room:gameOver', round: room.round });
    broadcastToRoom(room, { type: 'room:state', room: serializeRoom(room) });
    notifyRoomMembersPresence(room);
  }
}

// ---------------------------------------------------------------------------
// 20 Hz Authoritative Simulation Tick Across All Active Co-Op Rooms
// ---------------------------------------------------------------------------
const TICK_DELTA = 0.05; // 50ms
setInterval(() => {
  for (const room of rooms.values()) {
    if (room.status !== 'playing' || room.members.size === 0) continue;

    // 1. Handle Bleedout Timers for Downed Players
    for (const m of room.members.values()) {
      if (m.isDowned) {
        m.bleedoutTimer = Math.max(0, m.bleedoutTimer - TICK_DELTA);
      }
    }

    // 2. Round Break & Zombie Spawning
    if (room.isRoundBreak) {
      room.roundBreakTimer -= TICK_DELTA;
      if (room.roundBreakTimer <= 0) {
        room.isRoundBreak = false;
        room.roundBreakTimer = 0;
      }
    } else {
      room.spawnTimer += TICK_DELTA;
      const alivePlayers = Array.from(room.members.values()).filter((m) => !m.isDowned);
      const allInLavaCavern =
        room.mapId === OFFICIAL_BLIGHTED_WOODS_ID &&
        alivePlayers.length > 0 &&
        alivePlayers.every((m) => m.z < -120);

      const maxConcurrent = Math.min(22, 14 + room.members.size * 2);
      if (!allInLavaCavern && room.spawnTimer >= 2.2 && room.zombiesToSpawn > 0 && room.zombies.length < maxConcurrent) {
        room.spawnTimer = 0;
        spawnServerZombie(room);
      }
    }

    // 3. Soft Zombie-to-Zombie Separation
    for (let i = 0; i < room.zombies.length; i++) {
      for (let j = i + 1; j < room.zombies.length; j++) {
        const z1 = room.zombies[i];
        const z2 = room.zombies[j];
        const dx = z1.x - z2.x;
        const dz = z1.z - z2.z;
        const distSq = dx * dx + dz * dz;
        const minDist = 0.85;
        if (distSq > 0.0001 && distSq < minDist * minDist) {
          const dist = Math.sqrt(distSq);
          const overlap = (minDist - dist) * 0.5;
          const px = (dx / dist) * overlap * 2.0 * TICK_DELTA;
          const pz = (dz / dist) * overlap * 2.0 * TICK_DELTA;
          z1.x += px;
          z1.z += pz;
          z2.x -= px;
          z2.z -= pz;
        }
      }
    }

    // 4. Zombie AI, Status Effects & Attacks
    const activeMembers = Array.from(room.members.values()).filter((m) => !m.isDowned);

    for (let i = room.zombies.length - 1; i >= 0; i--) {
      const z = room.zombies[i];
      if (z.slowTimer > 0) z.slowTimer = Math.max(0, z.slowTimer - TICK_DELTA);
      if (z.burnTimer > 0) {
        z.burnTimer = Math.max(0, z.burnTimer - TICK_DELTA);
        z.health -= 65 * TICK_DELTA;
        if (z.health <= 0) {
          room.zombies.splice(i, 1);
          room.zombieAttackTimers.delete(z.id);
          room.zombieBreakTimers.delete(z.id);
          room.zombieWalkCycles.delete(z.id);
          broadcastToRoom(room, {
            type: 'zombie:killed',
            zombieId: z.id,
            killerPlayerId: room.hostPlayerId,
            points: 75,
            reason: 'THERMITE KILL!',
            isHeadshot: false,
            hitPoint: { x: z.x, y: z.y + 1, z: z.z },
          });
          continue;
        }
      }

      if (z.stunTimer > 0) {
        z.stunTimer = Math.max(0, z.stunTimer - TICK_DELTA);
        continue;
      }

      const speedMult = z.slowTimer > 0 ? 0.25 : 1.0;
      const effSpeed = z.speed * speedMult;
      const barrier = z.windowId !== null ? room.barriers.find((b) => b.id === z.windowId) || null : null;

      if (z.state === 'approaching_window' && barrier) {
        const tx = barrier.x + barrier.dirX * -1.4;
        const tz = barrier.z + barrier.dirZ * -1.4;
        const dx = tx - z.x;
        const dz = tz - z.z;
        const dist = Math.hypot(dx, dz);
        if (dist > 0.001) {
          z.x += (dx / dist) * effSpeed * TICK_DELTA;
          z.z += (dz / dist) * effSpeed * TICK_DELTA;
          z.yaw = Math.atan2(dx, dz) + Math.PI;
        }
        if (dist < 0.4) {
          z.state = 'breaking_planks';
        }
      } else if (z.state === 'breaking_planks' && barrier) {
        z.x = barrier.x + barrier.dirX * -1.4;
        z.z = barrier.z + barrier.dirZ * -1.4;
        z.yaw = Math.atan2(barrier.x - z.x, barrier.z - z.z) + Math.PI;

        const bt = (room.zombieBreakTimers.get(z.id) || 0) + TICK_DELTA * speedMult;
        if (bt >= 1.5) {
          room.zombieBreakTimers.set(z.id, 0);
          if (barrier.planks > 0) {
            barrier.planks--;
            broadcastToRoom(room, {
              type: 'barrier:updated',
              barrierId: barrier.id,
              planks: barrier.planks,
            });
          } else {
            z.state = 'entering_room';
          }
        } else {
          room.zombieBreakTimers.set(z.id, bt);
        }
      } else if (z.state === 'entering_room' && barrier) {
        const ex = barrier.x + barrier.dirX * 2.0;
        const ez = barrier.z + barrier.dirZ * 2.0;
        const dx = ex - z.x;
        const dz = ez - z.z;
        const dist = Math.hypot(dx, dz);
        if (dist > 0.001) {
          z.x += (dx / dist) * effSpeed * TICK_DELTA;
          z.z += (dz / dist) * effSpeed * TICK_DELTA;
          z.yaw = Math.atan2(dx, dz) + Math.PI;
        }
        if (dist < 0.8) {
          z.state = 'chasing_player';
          z.windowId = null;
        }
      } else {
        // Target nearest alive player (prefer players in forest on Blighted Woods if any are out of lava)
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
          // Wait near the hidden woods teleporter at (-15, 0, -14)
          const tx = -15;
          const tz = -14;
          const dx = tx - z.x;
          const dz = tz - z.z;
          const dist = Math.hypot(dx, dz);
          z.yaw = Math.atan2(dx, dz) + Math.PI;
          if (dist > 3.2) {
            z.x += (dx / dist) * effSpeed * TICK_DELTA;
            z.z += (dz / dist) * effSpeed * TICK_DELTA;
            resolveZombieSolidCollisions(room, z);
          }
          z.state = 'chasing_player';
        } else if (target) {
          const dx = target.x - z.x;
          const dz = target.z - z.z;
          const dist = Math.hypot(dx, dz);
          z.yaw = Math.atan2(dx, dz) + Math.PI;

          if (dist > 1.35) {
            z.x += (dx / dist) * effSpeed * TICK_DELTA;
            z.z += (dz / dist) * effSpeed * TICK_DELTA;
            resolveZombieSolidCollisions(room, z);
            z.state = 'chasing_player';
          } else {
            z.state = 'attacking';
            const at = (room.zombieAttackTimers.get(z.id) || 0) + TICK_DELTA * speedMult;
            if (at >= 1.0) {
              room.zombieAttackTimers.set(z.id, 0);
              const targetSess = onlineByPlayerId.get(target.playerId);
              if (targetSess) {
                sendMsg(targetSess.ws, {
                  type: 'zombie:attackPlayer',
                  targetPlayerId: target.playerId,
                  damage: z.damage,
                });
              }
            } else {
              room.zombieAttackTimers.set(z.id, at);
            }
          }
        }
      }
    }

    // 5. Check Wave Completion
    if (room.zombiesToSpawn <= 0 && room.zombies.length === 0 && !room.isRoundBreak) {
      startRoomRound(room, room.round + 1);
    }

    // 6. Broadcast 20 Hz Authoritative Snapshot
    broadcastToRoom(room, {
      type: 'world:snapshot',
      round: room.round,
      isRoundBreak: room.isRoundBreak,
      roundBreakTimer: room.roundBreakTimer,
      zombiesToSpawn: room.zombiesToSpawn,
      zombies: room.zombies,
      members: Array.from(room.members.values()),
    });
  }
}, 50);

// ---------------------------------------------------------------------------
// Express + WebSocket Server Bootstrap
// ---------------------------------------------------------------------------
async function bootstrap() {
  const app = express();
  app.use(express.json({ limit: '2mb' }));

  app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') {
      res.status(204).end();
      return;
    }
    next();
  });

  app.get('/api/health', (_req, res) => {
    res.json({
      ok: true,
      onlinePlayers: onlineByPlayerId.size,
      activeRooms: rooms.size,
    });
  });

  const server = http.createServer(app);
  const wss = new WebSocketServer({ server, path: '/ws' });

  // Protocol-level keepalive interval so cloud proxies / idle mobile connections stay clean
  setInterval(() => {
    for (const sess of sessions) {
      if (!sess.isAlive) {
        try {
          sess.ws.terminate();
        } catch {
          // Ignore
        }
        continue;
      }
      sess.isAlive = false;
      try {
        sess.ws.ping();
      } catch {
        // Ignore
      }
    }
  }, 25000);

  wss.on('connection', (ws) => {
    const sess: ClientSession = {
      ws,
      playerId: null,
      roomId: null,
      loadout: { ...DEFAULT_LOADOUT },
      isAlive: true,
    };
    sessions.add(sess);

    ws.on('pong', () => {
      sess.isAlive = true;
    });

    ws.on('message', (raw) => {
      sess.isAlive = true;
      let msg: ClientToServerMessage;
      try {
        msg = JSON.parse(raw.toString()) as ClientToServerMessage;
      } catch {
        return;
      }

      if (msg.type === 'ping') {
        sendMsg(ws, { type: 'pong', onlineCount: onlineByPlayerId.size });
        return;
      }

      if (msg.type === 'auth:hello') {
        const profile = getOrCreateProfile(
          msg.authToken,
          msg.requestedName,
          msg.crazyGamesUsername,
          msg.preferredPlayerId
        );
        const previousSess = onlineByPlayerId.get(profile.playerId);
        if (previousSess && previousSess !== sess) {
          leaveCurrentRoom(previousSess);
          try {
            previousSess.ws.close(4000, 'Replaced by newer connection');
          } catch {
            // Ignore
          }
        }
        sess.playerId = profile.playerId;
        if (msg.loadout) {
          sess.loadout = msg.loadout;
        }
        onlineByPlayerId.set(profile.playerId, sess);

        sendMsg(ws, {
          type: 'auth:welcome',
          profile: {
            playerId: profile.playerId,
            displayName: profile.displayName,
            crazyGamesUsername: profile.crazyGamesUsername,
          },
          friends: buildFriendsList(profile),
          incomingRequests: profile.incomingRequests,
          outgoingRequests: profile.outgoingRequests,
          onlineCount: onlineByPlayerId.size,
          publicRooms: getPublicRoomsList(),
        });
        notifyFriendsPresenceChanged(profile.playerId);
        scheduleBroadcastPublicRooms();
        return;
      }

      if (!sess.playerId) return;
      const myProfile = socialDb.profilesById[sess.playerId];
      if (!myProfile) return;

      switch (msg.type) {
        case 'rooms:list': {
          sendMsg(ws, {
            type: 'rooms:publicList',
            rooms: getPublicRoomsList(),
            onlineCount: onlineByPlayerId.size,
          });
          break;
        }
        case 'profile:setName': {
          myProfile.displayName = sanitizeDisplayName(msg.displayName, myProfile.playerId);
          scheduleSaveDb();
          if (sess.roomId) {
            const room = rooms.get(sess.roomId);
            const member = room?.members.get(myProfile.playerId);
            if (room && member) {
              member.displayName = myProfile.displayName;
              broadcastToRoom(room, { type: 'room:state', room: serializeRoom(room) });
            }
          }
          pushSocialSync(myProfile.playerId);
          notifyFriendsPresenceChanged(myProfile.playerId);
          sendNotice(ws, 'success', `Callsign updated to ${myProfile.displayName}`);
          break;
        }

        case 'profile:syncCrazyGames': {
          const cgName = msg.crazyGamesUsername ? msg.crazyGamesUsername.trim() : null;
          if (cgName) {
            myProfile.crazyGamesUsername = cgName;
            socialDb.cgNameToId[cgName.toLowerCase()] = myProfile.playerId;
            myProfile.displayName = sanitizeDisplayName(cgName, myProfile.playerId);
          } else {
            myProfile.crazyGamesUsername = null;
          }
          scheduleSaveDb();
          if (sess.roomId) {
            const room = rooms.get(sess.roomId);
            const member = room?.members.get(myProfile.playerId);
            if (room && member) {
              member.displayName = myProfile.displayName;
              broadcastToRoom(room, { type: 'room:state', room: serializeRoom(room) });
            }
          }
          pushSocialSync(myProfile.playerId);
          notifyFriendsPresenceChanged(myProfile.playerId);
          break;
        }

        case 'friend:sendRequest': {
          const targetId = (msg.targetPlayerId || '').replace(/\D/g, '');
          if (!targetId) {
            sendNotice(ws, 'error', 'Enter a valid numeric Player ID.');
            return;
          }
          if (targetId === myProfile.playerId) {
            sendNotice(ws, 'error', 'You cannot add your own Player ID.');
            return;
          }
          const targetProfile = socialDb.profilesById[targetId];
          if (!targetProfile) {
            sendNotice(ws, 'error', `No player found with ID #${targetId}.`);
            return;
          }
          if (myProfile.friends.includes(targetId)) {
            sendNotice(ws, 'info', `${targetProfile.displayName} is already on your friends list.`);
            return;
          }

          // Check if target already sent us a request -> instant mutual accept!
          const reverseReqIdx = myProfile.incomingRequests.findIndex((r) => r.fromPlayerId === targetId);
          if (reverseReqIdx !== -1) {
            myProfile.incomingRequests.splice(reverseReqIdx, 1);
            targetProfile.outgoingRequests = targetProfile.outgoingRequests.filter((id) => id !== myProfile.playerId);
            if (!myProfile.friends.includes(targetId)) myProfile.friends.push(targetId);
            if (!targetProfile.friends.includes(myProfile.playerId)) targetProfile.friends.push(myProfile.playerId);
            scheduleSaveDb();
            pushSocialSync(myProfile.playerId);
            pushSocialSync(targetProfile.playerId);
            sendNotice(ws, 'success', `You and ${targetProfile.displayName} (#${targetId}) are now friends!`);
            const tSess = onlineByPlayerId.get(targetId);
            if (tSess) {
              sendNotice(tSess.ws, 'success', `${myProfile.displayName} (#${myProfile.playerId}) accepted your friend request!`);
            }
            return;
          }

          if (myProfile.outgoingRequests.includes(targetId)) {
            sendNotice(ws, 'info', `Friend request already pending for #${targetId}.`);
            return;
          }

          myProfile.outgoingRequests.push(targetId);
          targetProfile.incomingRequests.push({
            fromPlayerId: myProfile.playerId,
            fromName: myProfile.displayName,
            createdAt: Date.now(),
          });
          scheduleSaveDb();
          pushSocialSync(myProfile.playerId);
          pushSocialSync(targetProfile.playerId);
          sendNotice(ws, 'success', `Friend request sent to ${targetProfile.displayName} (#${targetId})!`);
          const tSess = onlineByPlayerId.get(targetId);
          if (tSess) {
            sendNotice(tSess.ws, 'info', `New friend request from ${myProfile.displayName} (#${myProfile.playerId})!`);
          }
          break;
        }

        case 'friend:respond': {
          const fromId = (msg.fromPlayerId || '').replace(/\D/g, '');
          myProfile.incomingRequests = myProfile.incomingRequests.filter((r) => r.fromPlayerId !== fromId);
          const fromProfile = socialDb.profilesById[fromId];
          if (fromProfile) {
            fromProfile.outgoingRequests = fromProfile.outgoingRequests.filter((id) => id !== myProfile.playerId);
            if (msg.accept) {
              if (!myProfile.friends.includes(fromId)) myProfile.friends.push(fromId);
              if (!fromProfile.friends.includes(myProfile.playerId)) fromProfile.friends.push(myProfile.playerId);
              sendNotice(ws, 'success', `Added ${fromProfile.displayName} (#${fromId}) to Friends!`);
              const fSess = onlineByPlayerId.get(fromId);
              if (fSess) {
                sendNotice(fSess.ws, 'success', `${myProfile.displayName} (#${myProfile.playerId}) accepted your friend request!`);
              }
            }
            pushSocialSync(fromId);
          }
          scheduleSaveDb();
          pushSocialSync(myProfile.playerId);
          break;
        }

        case 'friend:remove': {
          const fid = (msg.friendPlayerId || '').replace(/\D/g, '');
          myProfile.friends = myProfile.friends.filter((id) => id !== fid);
          const other = socialDb.profilesById[fid];
          if (other) {
            other.friends = other.friends.filter((id) => id !== myProfile.playerId);
            pushSocialSync(fid);
          }
          scheduleSaveDb();
          pushSocialSync(myProfile.playerId);
          break;
        }

        case 'friend:inviteToRoom': {
          if (!sess.roomId) {
            sendNotice(ws, 'error', 'Create or join a Co-Op room before inviting friends.');
            return;
          }
          const room = rooms.get(sess.roomId);
          if (!room) return;
          const targetSess = onlineByPlayerId.get(msg.friendPlayerId);
          if (!targetSess) {
            sendNotice(ws, 'error', 'That friend is currently offline.');
            return;
          }
          sendMsg(targetSess.ws, {
            type: 'room:inviteReceived',
            invite: {
              inviteId: `${room.roomId}_${Date.now()}`,
              fromPlayerId: myProfile.playerId,
              fromName: myProfile.displayName,
              roomId: room.roomId,
              mapName: room.mapName,
              createdAt: Date.now(),
            },
          });
          sendNotice(ws, 'success', `Squad invite sent to #${msg.friendPlayerId}!`);
          break;
        }

        case 'room:create': {
          leaveCurrentRoom(sess);
          if (msg.loadout) sess.loadout = msg.loadout;
          const roomId = generateRoomCode(msg.preferredRoomId);
          const member = createMemberEntry(myProfile, true, sess.loadout, 0);
          const newRoom: RoomInternal = {
            roomId,
            hostPlayerId: myProfile.playerId,
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
            spawnTimer: 0,
            barriers: [],
            spawners: [],
            solidBoxes: [],
            explodedBarrelIds: new Set<string>(),
            zombies: [],
            members: new Map([[myProfile.playerId, member]]),
            zombieAttackTimers: new Map(),
            zombieBreakTimers: new Map(),
            zombieWalkCycles: new Map(),
          };
          rooms.set(roomId, newRoom);
          sess.roomId = roomId;
          sendMsg(ws, { type: 'room:state', room: serializeRoom(newRoom) });
          notifyRoomMembersPresence(newRoom);
          scheduleBroadcastPublicRooms();
          break;
        }

        case 'room:join': {
          const cleanCode = (msg.roomId || '').trim();
          const targetRoom =
            rooms.get(cleanCode) ||
            rooms.get(cleanCode.toUpperCase());
          if (!targetRoom) {
            const msgText = `Room "${cleanCode}" was not found or has already closed.`;
            sendMsg(ws, { type: 'room:unavailable', reason: 'not_found', message: msgText });
            sendNotice(ws, 'error', msgText);
            return;
          }
          if (targetRoom.members.has(myProfile.playerId)) {
            sendMsg(ws, { type: 'room:state', room: serializeRoom(targetRoom) });
            return;
          }
          if (targetRoom.members.size >= 4) {
            const msgText = 'That squad room is already full (4/4 operators).';
            sendMsg(ws, { type: 'room:unavailable', reason: 'full', message: msgText });
            sendNotice(ws, 'error', msgText);
            return;
          }
          if (targetRoom.status === 'playing') {
            const msgText = 'That match is already in progress. Please join another room or start a new squad.';
            sendMsg(ws, { type: 'room:unavailable', reason: 'in_progress', message: msgText });
            sendNotice(ws, 'error', msgText);
            return;
          }
          if (!targetRoom.isJoinable || targetRoom.status === 'gameover') {
            const msgText = 'That squad room is currently closed or has already ended.';
            sendMsg(ws, { type: 'room:unavailable', reason: 'ended', message: msgText });
            sendNotice(ws, 'error', msgText);
            return;
          }
          leaveCurrentRoom(sess);
          if (msg.loadout) sess.loadout = msg.loadout;
          const member = createMemberEntry(myProfile, false, sess.loadout, targetRoom.members.size);
          targetRoom.members.set(myProfile.playerId, member);
          targetRoom.isJoinable = targetRoom.members.size < 4;
          sess.roomId = targetRoom.roomId;

          const serialized = serializeRoom(targetRoom);
          broadcastToRoom(targetRoom, { type: 'room:state', room: serialized });
          notifyRoomMembersPresence(targetRoom);
          scheduleBroadcastPublicRooms();
          break;
        }

        case 'room:quickplay': {
          leaveCurrentRoom(sess);
          if (msg.loadout) sess.loadout = msg.loadout;
          let openRoom: RoomInternal | null = null;
          for (const candidate of rooms.values()) {
            if (candidate.isPublic && candidate.isJoinable && candidate.status === 'lobby' && candidate.members.size < 4) {
              openRoom = candidate;
              break;
            }
          }
          if (openRoom) {
            const member = createMemberEntry(myProfile, false, sess.loadout, openRoom.members.size);
            openRoom.members.set(myProfile.playerId, member);
            openRoom.isJoinable = openRoom.members.size < 4;
            sess.roomId = openRoom.roomId;
            const serialized = serializeRoom(openRoom);
            broadcastToRoom(openRoom, { type: 'room:state', room: serialized });
            notifyRoomMembersPresence(openRoom);
            scheduleBroadcastPublicRooms();
          } else {
            const roomId = generateRoomCode();
            const member = createMemberEntry(myProfile, true, sess.loadout, 0);
            const created: RoomInternal = {
              roomId,
              hostPlayerId: myProfile.playerId,
              isPublic: true,
              isJoinable: true,
              status: 'lobby',
              mapId: msg.mapId || OFFICIAL_SECTOR_ZERO_ID,
              mapName: sanitizeMapName(msg.mapName || 'Sector Zero'),
              customMapConfig: msg.customMapConfig,
              round: 1,
              isRoundBreak: true,
              roundBreakTimer: 5,
              zombiesToSpawn: 6,
              spawnTimer: 0,
              barriers: [],
              spawners: [],
              solidBoxes: [],
              explodedBarrelIds: new Set<string>(),
              zombies: [],
              members: new Map([[myProfile.playerId, member]]),
              zombieAttackTimers: new Map(),
              zombieBreakTimers: new Map(),
              zombieWalkCycles: new Map(),
            };
            rooms.set(roomId, created);
            sess.roomId = roomId;
            sendMsg(ws, { type: 'room:state', room: serializeRoom(created) });
            notifyRoomMembersPresence(created);
            scheduleBroadcastPublicRooms();
          }
          break;
        }

        case 'room:leave': {
          leaveCurrentRoom(sess);
          break;
        }

        case 'room:setReady': {
          const room = sess.roomId ? rooms.get(sess.roomId) : undefined;
          const m = room?.members.get(myProfile.playerId);
          if (room && m) {
            m.ready = Boolean(msg.ready);
            broadcastToRoom(room, { type: 'room:state', room: serializeRoom(room) });
          }
          break;
        }

        case 'room:setLoadout': {
          sess.loadout = msg.loadout;
          const room = sess.roomId ? rooms.get(sess.roomId) : undefined;
          const m = room?.members.get(myProfile.playerId);
          if (room && m) {
            m.loadout = { ...msg.loadout };
            if (room.status === 'lobby') {
              m.weaponId = msg.loadout.startingPistolId || 'pistol';
            }
            broadcastToRoom(room, { type: 'room:state', room: serializeRoom(room) });
          }
          break;
        }

        case 'room:setMap': {
          const room = sess.roomId ? rooms.get(sess.roomId) : undefined;
          if (!room || room.hostPlayerId !== myProfile.playerId || room.status === 'playing') return;
          room.mapId = msg.mapId;
          room.mapName = sanitizeMapName(msg.mapName);
          room.customMapConfig = msg.customMapConfig;
          broadcastToRoom(room, { type: 'room:state', room: serializeRoom(room) });
          notifyRoomMembersPresence(room);
          scheduleBroadcastPublicRooms();
          break;
        }

        case 'room:returnToLobby': {
          const room = sess.roomId ? rooms.get(sess.roomId) : undefined;
          if (!room || room.hostPlayerId !== myProfile.playerId) return;
          room.status = 'lobby';
          room.isJoinable = room.members.size < 4;
          room.zombies = [];
          for (const m of room.members.values()) {
            m.isDowned = false;
            m.hp = 100;
            m.maxHp = 100;
            m.ready = m.playerId === room.hostPlayerId;
          }
          broadcastToRoom(room, { type: 'room:state', room: serializeRoom(room) });
          notifyRoomMembersPresence(room);
          scheduleBroadcastPublicRooms();
          break;
        }

        case 'room:start':
        case 'room:restart': {
          const room = sess.roomId ? rooms.get(sess.roomId) : undefined;
          if (!room || room.hostPlayerId !== myProfile.playerId) return;

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

          room.barriers = nav.barriers.map((b) => ({ ...b, planks: 5, maxPlanks: 5 }));
          room.spawners = nav.spawners;
          room.solidBoxes = nav.solidBoxes;
          room.zombies = [];
          room.zombieAttackTimers.clear();
          room.zombieBreakTimers.clear();
          room.zombieWalkCycles.clear();
          room.explodedBarrelIds.clear();
          room.status = 'playing';
          room.isJoinable = false;

          let idx = 0;
          for (const m of room.members.values()) {
            const angle = idx * 1.5;
            m.x = Math.cos(angle) * 1.5;
            m.y = 1.6;
            m.z = Math.sin(angle) * 1.5;
            m.hp = 100;
            m.maxHp = 100;
            m.isDowned = false;
            m.bleedoutTimer = 25;
            m.score = 500;
            m.kills = 0;
            m.headshots = 0;
            m.weaponId = m.loadout.startingPistolId || 'pistol';
            m.isPap = false;
            idx++;
          }

          startRoomRound(room, 1);
          const serialized = serializeRoom(room);
          broadcastToRoom(room, {
            type: 'room:matchStarted',
            room: serialized,
            zombies: room.zombies,
          });
          notifyRoomMembersPresence(room);
          scheduleBroadcastPublicRooms();
          break;
        }

        case 'player:transform': {
          const room = sess.roomId ? rooms.get(sess.roomId) : undefined;
          const m = room?.members.get(myProfile.playerId);
          if (!room || !m) return;
          m.x = msg.x;
          m.y = msg.y;
          m.z = msg.z;
          m.yaw = msg.yaw;
          m.pitch = msg.pitch;
          m.weaponId = msg.weaponId;
          m.isPap = msg.isPap;
          m.isFlashlightOn = msg.isFlashlightOn;
          m.isMoving = msg.isMoving;
          m.hp = msg.hp;
          m.maxHp = msg.maxHp;
          const becameDowned = !m.isDowned && msg.isDowned;
          m.isDowned = msg.isDowned;
          if (becameDowned) {
            m.bleedoutTimer = 25;
          }
          m.score = msg.score;
          m.kills = msg.kills;
          m.headshots = msg.headshots;
          if (becameDowned) {
            checkRoomGameOver(room);
          }
          break;
        }

        case 'combat:shootFx': {
          const room = sess.roomId ? rooms.get(sess.roomId) : undefined;
          if (!room || room.status !== 'playing') return;
          broadcastToRoom(
            room,
            {
              type: 'fx:shoot',
              shooterPlayerId: myProfile.playerId,
              origin: msg.origin,
              dir: msg.dir,
              weaponId: msg.weaponId,
              weaponType: msg.weaponType,
              isPap: msg.isPap,
              color: msg.color,
            },
            myProfile.playerId
          );
          break;
        }

        case 'combat:hitZombie': {
          const room = sess.roomId ? rooms.get(sess.roomId) : undefined;
          if (!room || room.status !== 'playing') return;
          const zIdx = room.zombies.findIndex((z) => z.id === msg.zombieId);
          if (zIdx === -1) return; // Idempotent guard against duplicate kills
          const z = room.zombies[zIdx];
          z.health -= Math.max(0, msg.damage);
          if (msg.statusEffect === 'stun') {
            z.stunTimer = Math.max(z.stunTimer, msg.statusDuration || 5.0);
          } else if (msg.statusEffect === 'slow') {
            z.slowTimer = Math.max(z.slowTimer, msg.statusDuration || 6.0);
          } else if (msg.statusEffect === 'burn') {
            z.burnTimer = Math.max(z.burnTimer, msg.statusDuration || 3.5);
          }

          if (z.health <= 0) {
            room.zombies.splice(zIdx, 1);
            room.zombieAttackTimers.delete(z.id);
            room.zombieBreakTimers.delete(z.id);
            room.zombieWalkCycles.delete(z.id);

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

            broadcastToRoom(room, {
              type: 'zombie:killed',
              zombieId: z.id,
              killerPlayerId: myProfile.playerId,
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
            sendMsg(ws, {
              type: 'zombie:hitConfirm',
              zombieId: z.id,
              killerPlayerId: myProfile.playerId,
              points: 10,
              reason,
            });
          }
          break;
        }

        case 'combat:grenadeThrow': {
          const room = sess.roomId ? rooms.get(sess.roomId) : undefined;
          if (!room || room.status !== 'playing') return;
          broadcastToRoom(
            room,
            {
              type: 'fx:grenadeThrow',
              throwerPlayerId: myProfile.playerId,
              grenadeType: msg.grenadeType,
              pos: msg.pos,
              vel: msg.vel,
              fuse: msg.fuse,
            },
            myProfile.playerId
          );
          break;
        }

        case 'combat:grenadeDetonate': {
          const room = sess.roomId ? rooms.get(sess.roomId) : undefined;
          if (!room || room.status !== 'playing') return;
          broadcastToRoom(
            room,
            {
              type: 'fx:grenadeDetonate',
              throwerPlayerId: myProfile.playerId,
              grenadeType: msg.grenadeType,
              center: msg.center,
              radius: msg.radius,
            },
            myProfile.playerId
          );

          // Authoritatively apply area damage / status to server zombies
          for (let i = room.zombies.length - 1; i >= 0; i--) {
            const z = room.zombies[i];
            const dist = Math.hypot(z.x - msg.center.x, z.y + 1.0 - msg.center.y, z.z - msg.center.z);
            if (dist <= msg.radius) {
              if (msg.grenadeType === 'flashbang') {
                z.stunTimer = Math.max(z.stunTimer, 5.0);
                z.health -= msg.damage;
              } else if (msg.grenadeType === 'cryo') {
                z.slowTimer = Math.max(z.slowTimer, 6.0);
                const falloff = Math.max(0.4, 1 - dist / (msg.radius * 1.15));
                z.health -= msg.damage * falloff;
              } else if (msg.grenadeType === 'thermite') {
                z.burnTimer = Math.max(z.burnTimer, 3.5);
                z.health -= msg.damage * 0.65;
              } else {
                const falloff = Math.max(0.35, 1 - dist / (msg.radius * 1.15));
                z.health -= msg.damage * falloff;
              }

              if (z.health <= 0) {
                room.zombies.splice(i, 1);
                room.zombieAttackTimers.delete(z.id);
                room.zombieBreakTimers.delete(z.id);
                room.zombieWalkCycles.delete(z.id);
                const reason =
                  msg.grenadeType === 'cryo'
                    ? 'CRYO SHATTER KILL!'
                    : msg.grenadeType === 'thermite'
                    ? 'THERMITE BLAST KILL!'
                    : msg.grenadeType === 'flashbang'
                    ? 'FLASHBANG KILL!'
                    : 'FRAG GRENADE KILL!';
                broadcastToRoom(room, {
                  type: 'zombie:killed',
                  zombieId: z.id,
                  killerPlayerId: myProfile.playerId,
                  points: 85,
                  reason,
                  isHeadshot: false,
                  hitPoint: { x: z.x, y: z.y + 1, z: z.z },
                });
              }
            }
          }
          break;
        }

        case 'combat:barrelExplode': {
          const room = sess.roomId ? rooms.get(sess.roomId) : undefined;
          if (!room || room.status !== 'playing') return;
          if (room.explodedBarrelIds.has(msg.barrelId)) return; // Idempotent
          room.explodedBarrelIds.add(msg.barrelId);

          broadcastToRoom(room, {
            type: 'fx:barrelExplode',
            barrelId: msg.barrelId,
            pos: msg.pos,
          });

          const blastRadius = 6.5;
          for (let i = room.zombies.length - 1; i >= 0; i--) {
            const z = room.zombies[i];
            const dist = Math.hypot(z.x - msg.pos.x, z.y - msg.pos.y, z.z - msg.pos.z);
            if (dist <= blastRadius) {
              const dmg = 320 * (1 - dist / (blastRadius * 1.2));
              z.health -= dmg;
              if (z.health <= 0) {
                room.zombies.splice(i, 1);
                room.zombieAttackTimers.delete(z.id);
                room.zombieBreakTimers.delete(z.id);
                room.zombieWalkCycles.delete(z.id);
                broadcastToRoom(room, {
                  type: 'zombie:killed',
                  zombieId: z.id,
                  killerPlayerId: myProfile.playerId,
                  points: 80,
                  reason: 'BARREL BLAST KILL!',
                  isHeadshot: false,
                  hitPoint: { x: z.x, y: z.y + 1, z: z.z },
                });
              }
            }
          }
          break;
        }

        case 'player:repairBarrier': {
          const room = sess.roomId ? rooms.get(sess.roomId) : undefined;
          if (!room || room.status !== 'playing') return;
          const bar = room.barriers.find((b) => b.id === msg.barrierId);
          if (!bar || bar.planks >= bar.maxPlanks) return;
          bar.planks++;
          broadcastToRoom(room, {
            type: 'barrier:updated',
            barrierId: bar.id,
            planks: bar.planks,
            repairedBy: myProfile.playerId,
          });
          break;
        }

        case 'player:revive': {
          const room = sess.roomId ? rooms.get(sess.roomId) : undefined;
          if (!room || room.status !== 'playing') return;
          const target = room.members.get(msg.targetPlayerId);
          if (!target || !target.isDowned) return;
          target.isDowned = false;
          target.hp = 100;
          target.bleedoutTimer = 25;
          broadcastToRoom(room, {
            type: 'player:revived',
            targetPlayerId: target.playerId,
            reviverPlayerId: myProfile.playerId,
            reviverName: myProfile.displayName,
          });
          break;
        }
      }
    });

    ws.on('close', () => {
      sessions.delete(sess);
      const pid = sess.playerId;
      if (pid && onlineByPlayerId.get(pid) === sess) {
        onlineByPlayerId.delete(pid);
        leaveCurrentRoom(sess);
        notifyFriendsPresenceChanged(pid);
        scheduleBroadcastPublicRooms();
      }
    });
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: false },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Poly-Ops Zombies HTTP & Co-Op WebSocket server listening on port ${PORT}`);
  });
}

bootstrap().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
