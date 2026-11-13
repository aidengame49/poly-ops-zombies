import type { CustomMapConfig, GrenadeType, PlayerLoadout, Zombie } from './game';

export interface PlayerProfile {
  playerId: string; // Assigned unique 8-digit numeric ID (e.g. "48291043")
  displayName: string;
  crazyGamesUsername?: string | null;
}

export type FriendPresenceStatus = 'offline' | 'online' | 'lobby' | 'playing';

export interface FriendEntry {
  playerId: string;
  displayName: string;
  status: FriendPresenceStatus;
  roomId?: string | null;
  roomJoinable?: boolean;
  mapName?: string | null;
  round?: number;
}

export interface FriendRequestEntry {
  fromPlayerId: string;
  fromName: string;
  createdAt: number;
}

export interface RoomInviteEntry {
  inviteId: string;
  fromPlayerId: string;
  fromName: string;
  roomId: string;
  mapName: string;
  createdAt: number;
}

export interface CoopMemberState {
  playerId: string;
  displayName: string;
  ready: boolean;
  isHost: boolean;
  isDowned: boolean;
  bleedoutTimer: number;
  hp: number;
  maxHp: number;
  score: number;
  kills: number;
  headshots: number;
  x: number;
  y: number;
  z: number;
  yaw: number;
  pitch: number;
  weaponId: string;
  isPap: boolean;
  isFlashlightOn: boolean;
  isMoving: boolean;
  loadout: PlayerLoadout;
}

export interface NetZombieState {
  id: string;
  x: number;
  y: number;
  z: number;
  yaw: number;
  health: number;
  maxHealth: number;
  speed: number;
  damage: number;
  windowId: number | null;
  state: Zombie['state'];
  stunTimer: number;
  slowTimer: number;
  burnTimer: number;
}

export interface NetSolidBox {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  minY: number;
  maxY: number;
}

export interface NetBarrierDef {
  id: number;
  x: number;
  y: number;
  z: number;
  dirX: number;
  dirZ: number;
  planks: number;
  maxPlanks: number;
}

export interface NetSpawnerPos {
  x: number;
  y: number;
  z: number;
}

export interface MultiplayerRoomState {
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
  barriers: { id: number; planks: number }[];
  explodedBarrelIds: string[];
  members: CoopMemberState[];
}

export type ClientToServerMessage =
  | {
      type: 'auth:hello';
      authToken: string;
      requestedName?: string;
      crazyGamesUsername?: string | null;
      loadout?: PlayerLoadout;
    }
  | {
      type: 'profile:setName';
      displayName: string;
    }
  | {
      type: 'profile:syncCrazyGames';
      crazyGamesUsername: string | null;
    }
  | {
      type: 'friend:sendRequest';
      targetPlayerId: string;
    }
  | {
      type: 'friend:respond';
      fromPlayerId: string;
      accept: boolean;
    }
  | {
      type: 'friend:remove';
      friendPlayerId: string;
    }
  | {
      type: 'friend:inviteToRoom';
      friendPlayerId: string;
    }
  | {
      type: 'room:create';
      mapId: string;
      mapName: string;
      customMapConfig?: CustomMapConfig;
      isPublic: boolean;
      preferredRoomId?: string;
      loadout?: PlayerLoadout;
    }
  | {
      type: 'room:join';
      roomId: string;
      loadout?: PlayerLoadout;
    }
  | {
      type: 'room:quickplay';
      mapId: string;
      mapName: string;
      customMapConfig?: CustomMapConfig;
      loadout?: PlayerLoadout;
    }
  | {
      type: 'room:leave';
    }
  | {
      type: 'room:setReady';
      ready: boolean;
    }
  | {
      type: 'room:setLoadout';
      loadout: PlayerLoadout;
    }
  | {
      type: 'room:setMap';
      mapId: string;
      mapName: string;
      customMapConfig?: CustomMapConfig;
    }
  | {
      type: 'room:start';
      barriers?: NetBarrierDef[];
      spawners?: NetSpawnerPos[];
      solidBoxes?: NetSolidBox[];
    }
  | {
      type: 'room:restart';
    }
  | {
      type: 'room:returnToLobby';
    }
  | {
      type: 'player:transform';
      x: number;
      y: number;
      z: number;
      yaw: number;
      pitch: number;
      weaponId: string;
      isPap: boolean;
      isFlashlightOn: boolean;
      isMoving: boolean;
      hp: number;
      maxHp: number;
      isDowned: boolean;
      score: number;
      kills: number;
      headshots: number;
    }
  | {
      type: 'combat:shootFx';
      origin: { x: number; y: number; z: number };
      dir: { x: number; y: number; z: number };
      weaponId: string;
      weaponType: string;
      isPap: boolean;
      color: string;
    }
  | {
      type: 'combat:hitZombie';
      zombieId: string;
      damage: number;
      hitType: 'head' | 'chest' | 'torso' | 'limb';
      hitPoint: { x: number; y: number; z: number };
      statusEffect?: 'stun' | 'slow' | 'burn';
      statusDuration?: number;
      reason?: string;
    }
  | {
      type: 'combat:grenadeThrow';
      grenadeType: GrenadeType;
      pos: { x: number; y: number; z: number };
      vel: { x: number; y: number; z: number };
      fuse: number;
    }
  | {
      type: 'combat:grenadeDetonate';
      grenadeType: GrenadeType;
      center: { x: number; y: number; z: number };
      radius: number;
      damage: number;
    }
  | {
      type: 'combat:barrelExplode';
      barrelId: string;
      pos: { x: number; y: number; z: number };
    }
  | {
      type: 'player:repairBarrier';
      barrierId: number;
    }
  | {
      type: 'player:revive';
      targetPlayerId: string;
    };

export type ServerToClientMessage =
  | {
      type: 'auth:welcome';
      profile: PlayerProfile;
      friends: FriendEntry[];
      incomingRequests: FriendRequestEntry[];
      outgoingRequests: string[];
    }
  | {
      type: 'social:sync';
      profile: PlayerProfile;
      friends: FriendEntry[];
      incomingRequests: FriendRequestEntry[];
      outgoingRequests: string[];
    }
  | {
      type: 'social:notice';
      level: 'info' | 'success' | 'error';
      message: string;
    }
  | {
      type: 'room:inviteReceived';
      invite: RoomInviteEntry;
    }
  | {
      type: 'room:state';
      room: MultiplayerRoomState | null;
    }
  | {
      type: 'room:unavailable';
      reason: 'not_found' | 'full' | 'in_progress' | 'ended';
      message: string;
    }
  | {
      type: 'room:matchStarted';
      room: MultiplayerRoomState;
      zombies: NetZombieState[];
    }
  | {
      type: 'world:snapshot';
      round: number;
      isRoundBreak: boolean;
      roundBreakTimer: number;
      zombiesToSpawn: number;
      zombies: NetZombieState[];
      members: CoopMemberState[];
    }
  | {
      type: 'barrier:updated';
      barrierId: number;
      planks: number;
      repairedBy?: string;
    }
  | {
      type: 'zombie:killed';
      zombieId: string;
      killerPlayerId: string;
      points: number;
      reason: string;
      isHeadshot: boolean;
      hitPoint?: { x: number; y: number; z: number };
    }
  | {
      type: 'zombie:hitConfirm';
      zombieId: string;
      killerPlayerId: string;
      points: number;
      reason: string;
    }
  | {
      type: 'zombie:attackPlayer';
      targetPlayerId: string;
      damage: number;
    }
  | {
      type: 'fx:shoot';
      shooterPlayerId: string;
      origin: { x: number; y: number; z: number };
      dir: { x: number; y: number; z: number };
      weaponId: string;
      weaponType: string;
      isPap: boolean;
      color: string;
    }
  | {
      type: 'fx:grenadeThrow';
      throwerPlayerId: string;
      grenadeType: GrenadeType;
      pos: { x: number; y: number; z: number };
      vel: { x: number; y: number; z: number };
      fuse: number;
    }
  | {
      type: 'fx:grenadeDetonate';
      throwerPlayerId: string;
      grenadeType: GrenadeType;
      center: { x: number; y: number; z: number };
      radius: number;
    }
  | {
      type: 'fx:barrelExplode';
      barrelId: string;
      pos: { x: number; y: number; z: number };
    }
  | {
      type: 'player:revived';
      targetPlayerId: string;
      reviverPlayerId: string;
      reviverName: string;
    }
  | {
      type: 'round:started';
      round: number;
      isRoundBreak: boolean;
      roundBreakTimer: number;
      zombiesToSpawn: number;
    }
  | {
      type: 'room:gameOver';
      round: number;
    };
