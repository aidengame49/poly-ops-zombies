import React, { useEffect, useMemo, useState } from 'react';
import {
  Check,
  Copy,
  Crown,
  Globe,
  Link2,
  Lock,
  LogOut,
  Play,
  RefreshCw,
  Send,
  Server,
  Shield,
  UserCheck,
  UserPlus,
  Users,
  X,
  Zap,
  Trash2,
  Flame,
} from 'lucide-react';
import { CustomMapConfig, PlayerLoadout, getDefaultMapConfig } from '../types/game';
import { OFFICIAL_SECTOR_ZERO_ID, getBlightedWoodsConfig } from '../data/officialMaps';
import { GRENADES_MAP, WEAPONS_MAP } from '../data/weapons';
import { crazyGames, gameStorage, STORAGE_KEYS } from '../utils/crazyGames';
import { multiplayerClient } from '../utils/multiplayerClient';

interface MultiplayerModalProps {
  selectedMapConfig: CustomMapConfig;
  playerLoadout: PlayerLoadout;
  onUpdateMapSelection?: (config: CustomMapConfig) => void;
  onOpenLoadout?: () => void;
  onClose: () => void;
}

export const MultiplayerModal: React.FC<MultiplayerModalProps> = ({
  selectedMapConfig,
  playerLoadout,
  onUpdateMapSelection,
  onOpenLoadout,
  onClose,
}) => {
  const [, setTick] = useState(0);
  const [nameInput, setNameInput] = useState('');
  const [editingName, setEditingName] = useState(false);
  const [friendIdInput, setFriendIdInput] = useState('');
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [isPublicRoom, setIsPublicRoom] = useState(true);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [showServerConfig, setShowServerConfig] = useState(false);
  const [serverUrlInput, setServerUrlInput] = useState(multiplayerClient.customServerUrl);
  const [customMaps, setCustomMaps] = useState<CustomMapConfig[]>([]);
  const [lobbyMapId, setLobbyMapId] = useState<string>(selectedMapConfig.id || OFFICIAL_SECTOR_ZERO_ID);

  useEffect(() => {
    multiplayerClient.connect();
    multiplayerClient.setLoadout(playerLoadout);

    const unsub = multiplayerClient.subscribe(() => {
      setTick((t) => t + 1);
    });

    try {
      const savedList = gameStorage.getItem(STORAGE_KEYS.CUSTOM_MAPS_LIST);
      if (savedList) {
        const parsed = JSON.parse(savedList);
        if (Array.isArray(parsed)) setCustomMaps(parsed);
      }
    } catch {
      // Ignore malformed list
    }

    return () => {
      unsub();
    };
  }, [playerLoadout]);

  const profile = multiplayerClient.profile;
  const currentRoom = multiplayerClient.currentRoom;
  const friends = multiplayerClient.friends;
  const incomingRequests = multiplayerClient.incomingRequests;
  const outgoingRequests = multiplayerClient.outgoingRequests;
  const roomInvites = multiplayerClient.roomInvites;
  const lastNotice = multiplayerClient.lastNotice;
  const connStatus = multiplayerClient.connectionStatus;

  const availableMaps = useMemo(() => {
    const sectorZero = getDefaultMapConfig();
    const blightedWoods = getBlightedWoodsConfig();
    const unique = new Map<string, CustomMapConfig>();
    unique.set(sectorZero.id, sectorZero);
    unique.set(blightedWoods.id, blightedWoods);
    for (const m of customMaps) {
      if (m && m.id && !unique.has(m.id)) {
        unique.set(m.id, m);
      }
    }
    return Array.from(unique.values());
  }, [customMaps]);

  const chosenMap = useMemo(() => {
    return availableMaps.find((m) => m.id === lobbyMapId) || selectedMapConfig || getDefaultMapConfig();
  }, [availableMaps, lobbyMapId, selectedMapConfig]);

  useEffect(() => {
    if (profile && !editingName) {
      setNameInput(profile.displayName);
    }
  }, [profile, editingName]);

  useEffect(() => {
    if (currentRoom?.mapId) {
      setLobbyMapId(currentRoom.mapId);
    }
  }, [currentRoom?.mapId]);

  const copyText = async (key: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey((prev) => (prev === key ? null : prev)), 2000);
    } catch {
      // Fallback for restricted iframes
      try {
        const area = document.createElement('textarea');
        area.value = value;
        area.style.position = 'fixed';
        area.style.opacity = '0';
        document.body.appendChild(area);
        area.select();
        document.execCommand('copy');
        document.body.removeChild(area);
        setCopiedKey(key);
        setTimeout(() => setCopiedKey((prev) => (prev === key ? null : prev)), 2000);
      } catch {
        // Ignore
      }
    }
  };

  const handleSaveName = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = nameInput.trim();
    if (clean.length >= 2) {
      multiplayerClient.setDisplayName(clean);
      setEditingName(false);
    }
  };

  const handleSendFriendRequest = (e: React.FormEvent) => {
    e.preventDefault();
    const digits = friendIdInput.replace(/\D/g, '');
    if (digits.length < 4) return;
    multiplayerClient.sendFriendRequest(digits);
    setFriendIdInput('');
  };

  const handleCreateRoom = () => {
    const isCustom = chosenMap.id !== OFFICIAL_SECTOR_ZERO_ID && chosenMap.id !== 'official_blighted_woods';
    multiplayerClient.createRoom({
      mapId: chosenMap.id,
      mapName: chosenMap.name,
      customMapConfig: isCustom ? chosenMap : undefined,
      isPublic: isPublicRoom,
    });
    onUpdateMapSelection?.(chosenMap);
  };

  const handleQuickPlay = () => {
    const isCustom = chosenMap.id !== OFFICIAL_SECTOR_ZERO_ID && chosenMap.id !== 'official_blighted_woods';
    multiplayerClient.quickPlay({
      mapId: chosenMap.id,
      mapName: chosenMap.name,
      customMapConfig: isCustom ? chosenMap : undefined,
    });
  };

  const handleJoinCode = (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCodeInput.trim()) return;
    multiplayerClient.joinRoom(joinCodeInput.trim());
    setJoinCodeInput('');
  };

  const handleRoomMapChange = (newMapId: string) => {
    setLobbyMapId(newMapId);
    const nextMap = availableMaps.find((m) => m.id === newMapId);
    if (!nextMap) return;
    onUpdateMapSelection?.(nextMap);
    if (currentRoom && profile && currentRoom.hostPlayerId === profile.playerId) {
      const isCustom = nextMap.id !== OFFICIAL_SECTOR_ZERO_ID && nextMap.id !== 'official_blighted_woods';
      multiplayerClient.setRoomMap(nextMap.id, nextMap.name, isCustom ? nextMap : undefined);
    }
  };

  const myMember = currentRoom?.members.find((m) => m.playerId === profile?.playerId) || null;
  const isHost = Boolean(currentRoom && profile && currentRoom.hostPlayerId === profile.playerId);
  const inviteUrl = currentRoom ? crazyGames.getInviteLink(currentRoom.roomId) : '';

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      className="absolute inset-0 bg-slate-950/95 backdrop-blur-lg z-50 flex items-center justify-center p-4 sm:p-6 pointer-events-auto font-['Rajdhani',sans-serif]"
    >
      <div className="max-w-6xl w-full bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header Bar */}
        <div className="bg-slate-950 px-5 sm:px-6 py-4 border-b border-slate-800 flex flex-wrap items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-cyan-500/15 border border-cyan-500/40 rounded-xl text-cyan-400">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-2xl font-extrabold text-white tracking-wider leading-none">
                CO-OP MULTIPLAYER &amp; FRIENDS
              </h2>
              <p className="text-xs text-slate-400 font-semibold tracking-widest mt-1 flex items-center gap-2">
                <span
                  className={`inline-block w-2 h-2 rounded-full ${
                    connStatus === 'connected'
                      ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.9)]'
                      : connStatus === 'connecting'
                      ? 'bg-amber-400 animate-pulse'
                      : 'bg-red-500'
                  }`}
                />
                {connStatus === 'connected'
                  ? crazyGames.isActive
                    ? 'CRAZYGAMES MULTIPLAYER NETWORK READY'
                    : 'POLY-OPS CO-OP NETWORK ONLINE'
                  : connStatus === 'connecting'
                  ? 'CONNECTING TO MULTIPLAYER SERVER...'
                  : 'SERVER DISCONNECTED — CHECK CONNECTION'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowServerConfig((v) => !v)}
              className="px-3 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 rounded-xl text-xs font-bold tracking-wider flex items-center gap-1.5 cursor-pointer"
              title="Configure External Multiplayer Server URL"
            >
              <Server className="w-3.5 h-3.5 text-cyan-400" /> SERVER
            </button>
            <button
              onClick={onClose}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-xl transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Optional Server Override Bar */}
        {showServerConfig && (
          <div className="bg-slate-950/90 border-b border-slate-800 px-6 py-3 flex flex-wrap items-center gap-3">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Dedicated Server URL (optional for static CrazyGames CDN builds):
            </span>
            <input
              type="text"
              value={serverUrlInput}
              onChange={(e) => setServerUrlInput(e.target.value)}
              placeholder="Same-origin (/ws) or https://your-server.run.app"
              className="flex-1 min-w-[240px] bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-cyan-500"
            />
            <button
              onClick={() => multiplayerClient.setCustomServerUrl(serverUrlInput)}
              className="px-3.5 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-extrabold text-xs rounded-lg cursor-pointer"
            >
              CONNECT
            </button>
            {multiplayerClient.customServerUrl && (
              <button
                onClick={() => {
                  setServerUrlInput('');
                  multiplayerClient.setCustomServerUrl('');
                }}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-lg cursor-pointer"
              >
                USE DEFAULT
              </button>
            )}
          </div>
        )}

        {/* Player Identity Card + Notice */}
        <div className="bg-slate-900/90 border-b border-slate-800 px-5 sm:px-6 py-3.5 flex flex-wrap items-center justify-between gap-4 shrink-0">
          <div className="flex flex-wrap items-center gap-4">
            {/* Assigned Numeric Player ID */}
            <div className="bg-slate-950 border border-cyan-500/40 rounded-xl px-4 py-2 flex items-center gap-3">
              <div>
                <div className="text-[10px] font-bold tracking-widest text-cyan-400 uppercase">YOUR PLAYER ID</div>
                <div className="text-2xl font-black tracking-widest text-white font-mono">
                  {profile ? `#${profile.playerId}` : '--------'}
                </div>
              </div>
              {profile && (
                <button
                  onClick={() => copyText('playerId', profile.playerId)}
                  className="px-2.5 py-1.5 bg-cyan-500/15 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-300 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer"
                >
                  {copiedKey === 'playerId' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedKey === 'playerId' ? 'COPIED' : 'COPY ID'}
                </button>
              )}
            </div>

            {/* Editable Display Name */}
            <div>
              <div className="text-[10px] font-bold tracking-widest text-slate-400 uppercase mb-0.5">CALLSIGN</div>
              {editingName ? (
                <form onSubmit={handleSaveName} className="flex items-center gap-2">
                  <input
                    type="text"
                    maxLength={20}
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-sm font-bold text-white focus:outline-none focus:border-cyan-500"
                    autoFocus
                  />
                  <button
                    type="submit"
                    className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold rounded-lg cursor-pointer"
                  >
                    SAVE
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingName(false)}
                    className="px-2 py-1 bg-slate-800 text-slate-300 text-xs font-bold rounded-lg cursor-pointer"
                  >
                    CANCEL
                  </button>
                </form>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-lg font-extrabold text-white tracking-wide">
                    {profile?.displayName || 'Connecting...'}
                  </span>
                  {profile && (
                    <button
                      onClick={() => setEditingName(true)}
                      className="text-xs font-bold text-cyan-400 hover:text-cyan-300 underline cursor-pointer"
                    >
                      Rename
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Live Notice */}
          {lastNotice && (
            <div
              className={`px-3.5 py-2 rounded-xl border text-xs font-bold flex items-center gap-2 ${
                lastNotice.level === 'error'
                  ? 'bg-red-950/70 border-red-700 text-red-300'
                  : lastNotice.level === 'success'
                  ? 'bg-emerald-950/70 border-emerald-700 text-emerald-300'
                  : 'bg-cyan-950/70 border-cyan-700 text-cyan-300'
              }`}
            >
              <span>{lastNotice.message}</span>
              <button
                onClick={() => multiplayerClient.clearNotice()}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Main Split Content */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* LEFT COLUMN (7 cols): Co-Op Squad Lobby / Matchmaking */}
          <div className="lg:col-span-7 flex flex-col gap-4">
            {/* Incoming Room Invites */}
            {roomInvites.length > 0 && (
              <div className="bg-amber-950/40 border border-amber-500/60 rounded-xl p-4 space-y-2.5">
                <div className="text-xs font-extrabold tracking-widest text-amber-400 uppercase flex items-center gap-2">
                  <Zap className="w-4 h-4" /> SQUAD INVITES RECEIVED
                </div>
                {roomInvites.map((inv) => (
                  <div
                    key={inv.inviteId}
                    className="bg-slate-950/80 border border-slate-800 rounded-lg p-3 flex flex-wrap items-center justify-between gap-2"
                  >
                    <div>
                      <div className="text-sm font-extrabold text-white">
                        {inv.fromDisplayName}{' '}
                        <span className="text-xs font-mono text-cyan-400">#{inv.fromPlayerId}</span>
                      </div>
                      <div className="text-xs text-slate-400 font-semibold">
                        Invited you to <span className="text-amber-300 uppercase">{inv.mapName}</span> • Room{' '}
                        <span className="font-mono text-white">{inv.roomId}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => multiplayerClient.joinRoom(inv.roomId)}
                        className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold rounded-lg cursor-pointer"
                      >
                        ACCEPT &amp; JOIN
                      </button>
                      <button
                        onClick={() => multiplayerClient.dismissInvite(inv.inviteId)}
                        className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-lg cursor-pointer"
                      >
                        DISMISS
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!currentRoom ? (
              /* Matchmaking & Room Creation */
              <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-5 flex flex-col gap-5">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-extrabold text-white tracking-wider">CO-OP SURVIVAL LOBBY</h3>
                    <p className="text-xs text-slate-400 font-semibold">
                      Play up to 4-player online co-op with shared zombie waves &amp; teammate revives.
                    </p>
                  </div>
                  {onOpenLoadout && (
                    <button
                      onClick={onOpenLoadout}
                      className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-amber-300 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                    >
                      <Flame className="w-3.5 h-3.5 text-red-400" /> LOADOUT:{' '}
                      {WEAPONS_MAP[playerLoadout.startingPistolId]?.name || 'M1911'}
                    </button>
                  )}
                </div>

                {/* Map Selector */}
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    SELECT BATTLEGROUND MAP
                  </label>
                  <select
                    value={lobbyMapId}
                    onChange={(e) => handleRoomMapChange(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm font-bold text-white focus:outline-none focus:border-cyan-500"
                  >
                    {availableMaps.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name.toUpperCase()} {m.id === OFFICIAL_SECTOR_ZERO_ID || m.id === 'official_blighted_woods' ? '(OFFICIAL)' : '(CUSTOM MAP)'}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Quick Play + Create Room Actions */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    onClick={handleQuickPlay}
                    disabled={!multiplayerClient.isConnected}
                    className="py-3.5 px-4 bg-red-600 hover:bg-red-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-extrabold rounded-xl shadow-[0_0_20px_rgba(220,38,38,0.4)] transition-all flex items-center justify-center gap-2 cursor-pointer text-base tracking-wider"
                  >
                    <Play className="w-5 h-5 fill-current" /> QUICK PLAY (MATCHMAKE)
                  </button>

                  <button
                    onClick={handleCreateRoom}
                    disabled={!multiplayerClient.isConnected}
                    className="py-3.5 px-4 bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-800 disabled:text-slate-500 text-slate-950 font-extrabold rounded-xl shadow-[0_0_20px_rgba(6,182,212,0.3)] transition-all flex items-center justify-center gap-2 cursor-pointer text-base tracking-wider"
                  >
                    <Users className="w-5 h-5" /> CREATE SQUAD ROOM
                  </button>
                </div>

                {/* Room Privacy Toggle for Creating */}
                <div className="flex items-center justify-between bg-slate-900/80 border border-slate-800 rounded-xl px-4 py-2.5">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
                    {isPublicRoom ? (
                      <>
                        <Globe className="w-4 h-4 text-emerald-400" /> PUBLIC ROOM (Open to Quick-Play &amp; Invites)
                      </>
                    ) : (
                      <>
                        <Lock className="w-4 h-4 text-amber-400" /> PRIVATE ROOM (Friends / Invite Code Only)
                      </>
                    )}
                  </div>
                  <button
                    onClick={() => setIsPublicRoom((v) => !v)}
                    className="px-3 py-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-extrabold text-white rounded-lg cursor-pointer"
                  >
                    SWITCH TO {isPublicRoom ? 'PRIVATE' : 'PUBLIC'}
                  </button>
                </div>

                {/* Join by Room Code */}
                <form onSubmit={handleJoinCode} className="pt-2 border-t border-slate-800 flex flex-wrap gap-2">
                  <input
                    type="text"
                    maxLength={12}
                    value={joinCodeInput}
                    onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())}
                    placeholder="ENTER ROOM CODE (E.G. K4M9QP)"
                    className="flex-1 min-w-[200px] bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm font-mono font-bold text-white uppercase tracking-wider focus:outline-none focus:border-cyan-500"
                  />
                  <button
                    type="submit"
                    disabled={!multiplayerClient.isConnected || !joinCodeInput.trim()}
                    className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 border border-slate-700 text-white font-extrabold rounded-xl text-sm cursor-pointer"
                  >
                    JOIN ROOM
                  </button>
                </form>
              </div>
            ) : (
              /* Active Room Squad Roster */
              <div className="bg-slate-950/75 border border-cyan-500/40 rounded-2xl p-5 flex flex-col gap-4">
                <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-extrabold tracking-widest text-cyan-400 uppercase">
                        ROOM CODE: <span className="text-white font-mono text-base">{currentRoom.roomId}</span>
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300 font-bold uppercase">
                        {currentRoom.isPublic ? 'PUBLIC' : 'PRIVATE'}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950 border border-emerald-700 text-emerald-300 font-bold uppercase">
                        {currentRoom.members.length} / {currentRoom.maxPlayers} OPERATORS
                      </span>
                    </div>
                    <div className="text-xs text-slate-400 font-semibold mt-1">
                      Map: <span className="text-white font-bold uppercase">{currentRoom.mapName}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => copyText('roomCode', currentRoom.roomId)}
                      className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer"
                    >
                      {copiedKey === 'roomCode' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      {copiedKey === 'roomCode' ? 'CODE COPIED' : 'COPY CODE'}
                    </button>
                    <button
                      onClick={() => copyText('inviteLink', inviteUrl)}
                      className="px-2.5 py-1.5 bg-cyan-600/20 hover:bg-cyan-600/35 border border-cyan-500/50 text-cyan-300 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer"
                    >
                      {copiedKey === 'inviteLink' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Link2 className="w-3.5 h-3.5" />}
                      {copiedKey === 'inviteLink' ? 'LINK COPIED' : 'INVITE LINK'}
                    </button>
                  </div>
                </div>

                {/* Host Map Switcher in Lobby */}
                {isHost && currentRoom.status !== 'playing' && (
                  <div className="flex flex-wrap items-center gap-3 bg-slate-900/70 border border-slate-800 rounded-xl p-3">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">MAP:</span>
                    <select
                      value={currentRoom.mapId}
                      onChange={(e) => handleRoomMapChange(e.target.value)}
                      className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs font-bold text-white focus:outline-none focus:border-cyan-500"
                    >
                      {availableMaps.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name.toUpperCase()}
                        </option>
                      ))}
                    </select>
                    {onOpenLoadout && (
                      <button
                        onClick={onOpenLoadout}
                        className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-amber-300 rounded-lg text-xs font-bold cursor-pointer"
                      >
                        CHANGE LOADOUT
                      </button>
                    )}
                  </div>
                )}

                {/* Squad Slots (1..4) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {Array.from({ length: currentRoom.maxPlayers }).map((_, idx) => {
                    const member = currentRoom.members[idx];
                    if (!member) {
                      return (
                        <div
                          key={`empty_${idx}`}
                          className="border border-dashed border-slate-800 bg-slate-900/30 rounded-xl p-3.5 flex items-center justify-center text-xs font-bold text-slate-500 tracking-wider"
                        >
                          OPEN SQUAD SLOT — INVITE FRIEND BY ID
                        </div>
                      );
                    }
                    const isMemberHost = member.playerId === currentRoom.hostPlayerId;
                    const isMe = member.playerId === profile?.playerId;
                    const pistolName = WEAPONS_MAP[member.loadout?.startingPistolId]?.name || 'M1911';
                    const grenadeName = GRENADES_MAP[member.loadout?.grenadeType]?.shortName || 'FRAG';
                    return (
                      <div
                        key={member.playerId}
                        className={`rounded-xl p-3.5 border flex items-center justify-between gap-2 ${
                          isMe
                            ? 'bg-cyan-950/30 border-cyan-500/50'
                            : 'bg-slate-900/80 border-slate-800'
                        }`}
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            {isMemberHost && <Crown className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
                            <span className="text-sm font-extrabold text-white truncate">
                              {member.displayName} {isMe ? '(YOU)' : ''}
                            </span>
                          </div>
                          <div className="text-[11px] font-mono text-cyan-400">ID #{member.playerId}</div>
                          <div className="text-[11px] text-slate-400 font-semibold mt-0.5 truncate">
                            {pistolName} • {grenadeName}
                          </div>
                        </div>

                        <div
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-extrabold uppercase shrink-0 ${
                            member.ready || isMemberHost
                              ? 'bg-emerald-950 border border-emerald-600 text-emerald-300'
                              : 'bg-slate-800 border border-slate-700 text-slate-400'
                          }`}
                        >
                          {isMemberHost ? 'HOST' : member.ready ? 'READY' : 'STANDBY'}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Room Action Buttons */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-800">
                  <button
                    onClick={() => multiplayerClient.leaveRoom()}
                    className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-red-300 font-bold rounded-xl text-sm flex items-center gap-2 cursor-pointer"
                  >
                    <LogOut className="w-4 h-4" /> LEAVE ROOM
                  </button>

                  <div className="flex items-center gap-2.5">
                    {!isHost && myMember && (
                      <button
                        onClick={() => multiplayerClient.setReady(!myMember.ready)}
                        className={`px-5 py-2.5 font-extrabold rounded-xl text-sm flex items-center gap-2 cursor-pointer ${
                          myMember.ready
                            ? 'bg-amber-600 hover:bg-amber-500 text-slate-950'
                            : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                        }`}
                      >
                        <UserCheck className="w-4 h-4" /> {myMember.ready ? 'UNREADY' : 'READY UP'}
                      </button>
                    )}

                    {isHost && (
                      <button
                        onClick={() =>
                          currentRoom.status === 'gameover'
                            ? multiplayerClient.restartCoopMatch()
                            : multiplayerClient.startCoopMatch()
                        }
                        className="px-6 py-2.5 bg-red-600 hover:bg-red-500 text-white font-extrabold rounded-xl text-sm shadow-[0_0_20px_rgba(220,38,38,0.4)] flex items-center gap-2 cursor-pointer tracking-wider"
                      >
                        {currentRoom.status === 'gameover' ? (
                          <>
                            <RefreshCw className="w-4 h-4" /> PLAY AGAIN (SQUAD)
                          </>
                        ) : (
                          <>
                            <Play className="w-4 h-4 fill-white" /> LAUNCH CO-OP MATCH
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* RIGHT COLUMN (5 cols): Numeric Player ID Friends System */}
          <div className="lg:col-span-5 bg-slate-950/70 border border-slate-800 rounded-2xl p-5 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-extrabold text-white tracking-wider flex items-center gap-2">
                  <Shield className="w-4 h-4 text-cyan-400" /> FRIENDS &amp; SQUAD ROSTER
                </h3>
                <p className="text-xs text-slate-400 font-semibold">
                  Add friends using their 8-digit Player ID number.
                </p>
              </div>
              <span className="text-xs font-extrabold text-cyan-400 bg-cyan-950/60 border border-cyan-800/60 px-2.5 py-1 rounded-lg">
                {friends.length} FRIENDS
              </span>
            </div>

            {/* Add Friend Form */}
            <form onSubmit={handleSendFriendRequest} className="flex gap-2">
              <input
                type="text"
                inputMode="numeric"
                maxLength={12}
                value={friendIdInput}
                onChange={(e) => setFriendIdInput(e.target.value.replace(/\D/g, ''))}
                placeholder="Enter numeric Player ID..."
                className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-sm font-mono font-bold text-white focus:outline-none focus:border-cyan-500"
              />
              <button
                type="submit"
                disabled={!multiplayerClient.isConnected || friendIdInput.length < 4}
                className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-800 disabled:text-slate-500 text-slate-950 font-extrabold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer"
              >
                <UserPlus className="w-4 h-4" /> ADD
              </button>
            </form>

            {/* Incoming Friend Requests */}
            {incomingRequests.length > 0 && (
              <div className="bg-cyan-950/25 border border-cyan-700/50 rounded-xl p-3 space-y-2">
                <div className="text-[11px] font-extrabold text-cyan-400 uppercase tracking-wider">
                  FRIEND REQUESTS ({incomingRequests.length})
                </div>
                {incomingRequests.map((req) => (
                  <div
                    key={req.fromPlayerId}
                    className="flex items-center justify-between gap-2 bg-slate-900/90 border border-slate-800 rounded-lg px-3 py-2"
                  >
                    <div className="min-w-0">
                      <div className="text-xs font-extrabold text-white truncate">{req.fromDisplayName}</div>
                      <div className="text-[10px] font-mono text-cyan-400">#{req.fromPlayerId}</div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => multiplayerClient.respondToFriendRequest(req.fromPlayerId, true)}
                        className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-extrabold rounded cursor-pointer"
                      >
                        ACCEPT
                      </button>
                      <button
                        onClick={() => multiplayerClient.respondToFriendRequest(req.fromPlayerId, false)}
                        className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-bold rounded cursor-pointer"
                      >
                        DECLINE
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Outgoing Pending */}
            {outgoingRequests.length > 0 && (
              <div className="text-[11px] text-slate-400 font-semibold">
                Pending sent requests:{' '}
                <span className="font-mono text-slate-300">
                  {outgoingRequests.map((id) => `#${id}`).join(', ')}
                </span>
              </div>
            )}

            {/* Friends List */}
            <div className="flex-1 overflow-y-auto space-y-2 min-h-[180px] pr-1">
              {friends.length === 0 ? (
                <div className="h-full min-h-[160px] border border-dashed border-slate-800 rounded-xl flex flex-col items-center justify-center text-center p-4">
                  <Users className="w-7 h-7 text-slate-600 mb-2" />
                  <div className="text-sm font-bold text-slate-400">NO FRIENDS ADDED YET</div>
                  <div className="text-xs text-slate-500 mt-1">
                    Share your Player ID{' '}
                    <span className="font-mono text-cyan-400">{profile ? `#${profile.playerId}` : ''}</span> or enter a
                    friend&apos;s numeric ID above.
                  </div>
                </div>
              ) : (
                friends.map((friend) => {
                  const canInvite =
                    Boolean(currentRoom && currentRoom.isJoinable && friend.status !== 'offline') &&
                    friend.roomId !== currentRoom?.roomId;
                  const canJoin =
                    Boolean(friend.roomId && friend.roomJoinable) && friend.roomId !== currentRoom?.roomId;

                  const statusLabel =
                    friend.status === 'playing'
                      ? `In Match${friend.roomMapName ? ` • ${friend.roomMapName}` : ''}`
                      : friend.status === 'lobby'
                      ? `In Lobby${friend.roomMapName ? ` • ${friend.roomMapName}` : ''}`
                      : friend.status === 'online'
                      ? 'Online'
                      : 'Offline';

                  return (
                    <div
                      key={friend.playerId}
                      className="bg-slate-900/80 border border-slate-800 rounded-xl px-3.5 py-2.5 flex items-center justify-between gap-2"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span
                          className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                            friend.status === 'playing'
                              ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]'
                              : friend.status === 'lobby'
                              ? 'bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]'
                              : friend.status === 'online'
                              ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]'
                              : 'bg-slate-600'
                          }`}
                        />
                        <div className="min-w-0">
                          <div className="text-sm font-extrabold text-white truncate">{friend.displayName}</div>
                          <div className="text-[11px] font-semibold text-slate-400 flex items-center gap-1.5">
                            <span className="font-mono text-cyan-400">#{friend.playerId}</span>
                            <span>•</span>
                            <span className="truncate">{statusLabel}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {canInvite && (
                          <button
                            onClick={() => multiplayerClient.inviteFriendToRoom(friend.playerId)}
                            className="px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 text-[11px] font-extrabold rounded-lg flex items-center gap-1 cursor-pointer"
                            title="Invite Friend to Your Room"
                          >
                            <Send className="w-3 h-3" /> INVITE
                          </button>
                        )}
                        {canJoin && friend.roomId && (
                          <button
                            onClick={() => multiplayerClient.joinRoom(friend.roomId!)}
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-extrabold rounded-lg cursor-pointer"
                          >
                            JOIN
                          </button>
                        )}
                        <button
                          onClick={() => multiplayerClient.removeFriend(friend.playerId)}
                          className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-950/50 rounded-lg cursor-pointer"
                          title="Remove Friend"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
