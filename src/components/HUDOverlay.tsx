import React, { useState, useEffect, useRef } from 'react';
import { GameEngine } from '../game/GameEngine';
import { SettingsModal } from './SettingsModal';
import { HowToPlayModal } from './HowToPlayModal';
import { MapMakerView } from './MapMakerView';
import { MapSelectModal } from './MapSelectModal';
import { WeaponsLoadoutModal } from './WeaponsLoadoutModal';
import { MultiplayerModal } from './MultiplayerModal';
import { TouchControlsOverlay } from './TouchControlsOverlay';
import { CustomMapConfig, PlayerLoadout, SavedMatchState, getDefaultMapConfig } from '../types/game';
import { OFFICIAL_SECTOR_ZERO_ID, OFFICIAL_BLIGHTED_WOODS_ID, isOfficialMapId } from '../data/officialMaps';
import { DEFAULT_LOADOUT, GRENADES_MAP, WEAPONS_MAP, sanitizeLoadout } from '../data/weapons';
import {
  Volume2,
  VolumeX,
  Play,
  RotateCcw,
  Shield,
  Zap,
  Target,
  Sliders,
  HelpCircle,
  Flame,
  Home,
  Crosshair,
  Box,
  Flashlight,
  Bomb,
  Save,
  Cloud,
  Users,
  Monitor,
  Smartphone,
  Tablet,
  RotateCw,
  Copy,
  Check,
  HeartPulse,
} from 'lucide-react';
import { soundEngine } from '../utils/soundEngine';
import { crazyGames, gameStorage, STORAGE_KEYS } from '../utils/crazyGames';
import { multiplayerClient } from '../utils/multiplayerClient';
import { deviceManager, type DeviceModePreference, type DeviceState } from '../utils/deviceMode';
import type { CoopMemberState } from '../types/multiplayer';

function loadSavedLoadout(): PlayerLoadout {
  try {
    const raw = gameStorage.getItem(STORAGE_KEYS.LOADOUT);
    if (raw) {
      return sanitizeLoadout(JSON.parse(raw));
    }
  } catch (e) {
    console.warn('Failed to load saved loadout:', e);
  }
  return { ...DEFAULT_LOADOUT };
}

interface HUDOverlayProps {
  engine: GameEngine | null;
}

export const HUDOverlay: React.FC<HUDOverlayProps> = ({ engine }) => {
  const [gameState, setGameState] = useState<any>(null);
  const [isHitmarkerActive, setIsHitmarkerActive] = useState(false);
  const [hitmarkerType, setHitmarkerType] = useState<'normal' | 'kill' | 'headshot'>('normal');
  const [isMuted, setIsMuted] = useState(false);
  const [activeModal, setActiveModal] = useState<
    'none' | 'main_menu' | 'settings' | 'how_to_play' | 'map_maker' | 'map_select' | 'loadout' | 'multiplayer'
  >('main_menu');
  const [selectedMapConfig, setSelectedMapConfig] = useState<CustomMapConfig>(() => getDefaultMapConfig());
  const [playerLoadout, setPlayerLoadout] = useState<PlayerLoadout>(() => loadSavedLoadout());
  const [isTestingCustomMap, setIsTestingCustomMap] = useState<boolean>(false);
  const [savedRun, setSavedRun] = useState<SavedMatchState | null>(() => gameStorage.getJSON<SavedMatchState>(STORAGE_KEYS.SAVED_RUN));
  const [saveToast, setSaveToast] = useState<boolean>(false);
  const [copiedInvite, setCopiedInvite] = useState<boolean>(false);
  const [, setMpTick] = useState(0);
  const [deviceState, setDeviceState] = useState<DeviceState>(() => deviceManager.getState());
  const startupMpHandled = useRef(false);

  const [cgInfo, setCgInfo] = useState<{ active: boolean; username: string | null; platformMuted: boolean }>({
    active: crazyGames.isActive,
    username: crazyGames.user?.username || null,
    platformMuted: crazyGames.isMuteAudioEnforced,
  });

  useEffect(() => {
    const unsubDev = deviceManager.subscribe((s) => {
      setDeviceState(s);
    });
    return () => unsubDev();
  }, []);

  // Auto-pause active solo gameplay if player rotates a Phone back to portrait
  useEffect(() => {
    if (!engine) return;
    if (deviceState.needsLandscapeRotation && engine.isMapLoaded && !engine.stats.isPaused && !engine.stats.isGameOver) {
      if (!engine.isMultiplayer) {
        engine.pauseGame();
      }
    }
  }, [deviceState.needsLandscapeRotation, engine]);

  useEffect(() => {
    if (!engine) return;

    engine.setLoadout(playerLoadout);
    multiplayerClient.setLoadout(playerLoadout);
    multiplayerClient.connect();

    const updateUI = () => {
      const curWep = engine.playerWeapons[engine.currentWeaponIndex];
      const gType = engine.playerLoadout.grenadeType;
      const gDef = GRENADES_MAP[gType];
      setGameState({
        score: engine.stats.score,
        round: engine.stats.round,
        kills: engine.stats.kills,
        headshots: engine.stats.headshots,
        boardsRepaired: engine.stats.boardsRepaired,
        isGameOver: engine.stats.isGameOver,
        isPaused: engine.stats.isPaused,
        isRoundBreak: engine.stats.isRoundBreak,
        roundBreakTimer: Math.ceil(engine.stats.roundBreakTimer),
        isPointerLocked: engine.isPointerLocked,
        isAiming: engine.isAiming,
        isFlashlightOn: engine.isFlashlightOn,
        flashAlpha: engine.flashScreenAlpha,
        playerHp: Math.round(engine.playerHp),
        maxHp: engine.maxHp,
        prompt: engine.currentPrompt,
        perks: { ...engine.perks },
        records: { ...engine.records },
        scoreNotifications: [...engine.scoreNotifications],
        isMultiplayer: engine.isMultiplayer,
        isDowned: engine.isDowned,
        bleedoutTimer: Math.ceil(engine.bleedoutTimer),
        remoteTeammates: [...engine.remoteTeammates] as CoopMemberState[],
        weaponCount: engine.playerWeapons.length,
        grenade: {
          type: gType,
          name: gDef?.shortName || 'GRENADE',
          count: engine.grenadeCount,
          max: engine.maxGrenades,
          badgeColor: gDef?.badgeColor || '#f97316',
        },
        weapon: curWep
          ? {
              name: curWep.stats.name,
              isPap: curWep.stats.isPap,
              clip: curWep.currentClip,
              reserve: curWep.currentReserve,
              isReloading: curWep.isReloading,
              reloadProgress: curWep.reloadProgress,
            }
          : null,
      });
      setSavedRun(engine.getSavedMatch());
    };

    const unsubscribeCg = crazyGames.subscribe(() => {
      setCgInfo({
        active: crazyGames.isActive,
        username: crazyGames.user?.username || null,
        platformMuted: crazyGames.isMuteAudioEnforced,
      });
      setPlayerLoadout(loadSavedLoadout());
      setSavedRun(engine.getSavedMatch());
      updateUI();
    });

    const unsubMp = multiplayerClient.subscribe(() => {
      setMpTick((t) => t + 1);
    });

    const unsubMatchStarted = multiplayerClient.subscribeMatchStarted((msg) => {
      setActiveModal('none');
      setIsTestingCustomMap(false);
      engine.startMultiplayerMatch(msg.room, msg.zombies);
      engine.requestLock();
      deviceManager.tryLockLandscape();
    });

    const unsubJoinRoom = crazyGames.subscribeJoinRoom((roomId) => {
      if (engine.isMapLoaded) {
        engine.resetToMainMenu();
      }
      setActiveModal('multiplayer');
      multiplayerClient.joinRoom(roomId);
    });

    if (!startupMpHandled.current) {
      startupMpHandled.current = true;
      const inviteRoom = crazyGames.getInviteRoomId();
      if (inviteRoom) {
        setActiveModal('multiplayer');
        multiplayerClient.joinRoom(inviteRoom);
      } else if (crazyGames.isInstantMultiplayer) {
        setActiveModal('multiplayer');
        multiplayerClient.quickPlay({
          mapId: selectedMapConfig.id,
          mapName: selectedMapConfig.name,
        });
      }
    }

    engine.onStateUpdate = updateUI;
    engine.onHitmarker = (isKill, isHeadshot) => {
      setHitmarkerType(isHeadshot ? 'headshot' : isKill ? 'kill' : 'normal');
      setIsHitmarkerActive(true);
      setTimeout(() => setIsHitmarkerActive(false), 120);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (engine.isMapLoaded && !engine.stats.isGameOver) {
          if (engine.stats.isPaused) {
            engine.resumeGame();
          } else if (engine.isTouchMode) {
            engine.pauseGame();
          }
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    updateUI();

    return () => {
      unsubscribeCg();
      unsubMp();
      unsubMatchStarted();
      unsubJoinRoom();
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [engine]);

  const toggleMute = () => {
    if (cgInfo.platformMuted) {
      soundEngine.setPlatformMuted(true);
      return;
    }
    const next = !isMuted;
    setIsMuted(next);
    soundEngine.setMuted(next);
  };

  const handleSaveLoadout = (next: PlayerLoadout) => {
    const clean = sanitizeLoadout(next);
    setPlayerLoadout(clean);
    try {
      gameStorage.setItem(STORAGE_KEYS.LOADOUT, JSON.stringify(clean));
    } catch (e) {
      console.warn('Failed to persist loadout:', e);
    }
    engine?.setLoadout(clean);
    multiplayerClient.setLoadout(clean);
  };

  const handleStartGame = (mapConfigOverride?: CustomMapConfig | React.MouseEvent) => {
    if (deviceState.needsLandscapeRotation) return;
    setActiveModal('none');
    const targetMap = mapConfigOverride && 'id' in mapConfigOverride ? mapConfigOverride : selectedMapConfig;
    const isCustom = !isOfficialMapId(targetMap.id);
    setIsTestingCustomMap(isCustom);
    engine?.setLoadout(playerLoadout);
    engine?.unloadMap();
    if (targetMap.id === OFFICIAL_SECTOR_ZERO_ID) {
      engine?.loadMap();
    } else {
      engine?.loadMap(targetMap);
    }
    engine?.requestLock();
    deviceManager.tryLockLandscape();
  };

  const handleResumeSavedRun = () => {
    if (!engine || !savedRun || deviceState.needsLandscapeRotation) return;
    setActiveModal('none');
    const isCustom = !isOfficialMapId(savedRun.mapId);
    setIsTestingCustomMap(isCustom);
    const ok = engine.loadSavedMatch(savedRun);
    if (ok) {
      engine.requestLock();
      deviceManager.tryLockLandscape();
    } else {
      handleStartGame();
    }
  };

  const handleManualSaveProgress = () => {
    if (!engine) return;
    const ok = engine.saveCurrentMatch();
    if (ok) {
      setSaveToast(true);
      setTimeout(() => setSaveToast(false), 2000);
    }
  };

  const handleGameOverRetry = async () => {
    if (gameState?.round >= 2) {
      await crazyGames.requestMidgameAd();
    }
    if (gameState?.isMultiplayer) {
      if (isRoomHost) {
        multiplayerClient.restartCoopMatch();
      } else {
        handleReturnToSquadLobby();
      }
      return;
    }
    handleStartGame();
  };

  const handleGameOverMainMenu = async () => {
    if (gameState?.round >= 2) {
      await crazyGames.requestMidgameAd();
    }
    handleReturnToMainMenu();
  };

  const handleStartCustomMap = (config: CustomMapConfig) => {
    setActiveModal('none');
    setSelectedMapConfig(config);
    setIsTestingCustomMap(true);
    engine?.unloadMap();
    engine?.loadMap(config);
    engine?.requestLock();
    deviceManager.tryLockLandscape();
  };

  const handleReturnToMapEditor = () => {
    engine?.resetToMainMenu();
    setIsTestingCustomMap(false);
    setActiveModal('map_maker');
  };

  const handleReturnToMainMenu = () => {
    engine?.resetToMainMenu();
    setIsTestingCustomMap(false);
    setActiveModal('main_menu');
  };

  const handleReturnToSquadLobby = () => {
    engine?.exitMultiplayerToLobby();
    setIsTestingCustomMap(false);
    setActiveModal('multiplayer');
  };

  const copyRoomInviteLink = async (roomId: string) => {
    const link = crazyGames.getInviteLink(roomId);
    try {
      await navigator.clipboard.writeText(link);
      setCopiedInvite(true);
      setTimeout(() => setCopiedInvite(false), 2000);
    } catch {
      // Ignore
    }
  };

  if (!gameState) return null;

  const effectiveMode = deviceState.effectiveMode;
  const isTouchMode = effectiveMode === 'phone' || effectiveMode === 'tablet';
  const isPhone = effectiveMode === 'phone';
  const isTabletPortrait = effectiveMode === 'tablet' && deviceState.isPortrait;
  const isDamageVignetteVisible = gameState.playerHp < gameState.maxHp * 0.4;
  const hpPercent = Math.max(0, Math.min(100, (gameState.playerHp / gameState.maxHp) * 100));

  const pendingAlertCount = multiplayerClient.incomingRequests.length + multiplayerClient.roomInvites.length;
  const currentRoom = multiplayerClient.currentRoom;
  const isRoomHost = Boolean(currentRoom && currentRoom.hostPlayerId === multiplayerClient.myPlayerId);
  const canShowCombatCrosshair =
    (gameState.isPointerLocked || isTouchMode) && !gameState.isGameOver && !gameState.isPaused && activeModal === 'none';

  const renderDeviceIcon = (mode: string) => {
    if (mode === 'phone') return <Smartphone className="w-3.5 h-3.5 text-cyan-400" />;
    if (mode === 'tablet') return <Tablet className="w-3.5 h-3.5 text-cyan-400" />;
    return <Monitor className="w-3.5 h-3.5 text-cyan-400" />;
  };

  const DEVICE_SWITCH_PILLS: { id: DeviceModePreference; label: string }[] = [
    { id: 'auto', label: 'AUTO' },
    { id: 'computer', label: 'PC' },
    { id: 'phone', label: 'PHONE' },
    { id: 'tablet', label: 'TABLET' },
  ];

  return (
    <div className="absolute inset-0 pointer-events-none select-none overflow-hidden font-['Rajdhani',sans-serif]">
      {/* PHONE-ONLY LANDSCAPE ROTATION GATE */}
      {deviceState.needsLandscapeRotation && (
        <div
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          className="fixed inset-0 z-[200] bg-slate-950/98 backdrop-blur-xl flex flex-col items-center justify-center p-6 text-center pointer-events-auto"
        >
          <div className="max-w-sm w-full bg-slate-900/90 border border-cyan-500/50 rounded-3xl p-7 shadow-[0_0_50px_rgba(6,182,212,0.25)] flex flex-col items-center">
            <div className="relative mb-5">
              <div className="w-20 h-12 rounded-xl border-4 border-cyan-400 flex items-center justify-center bg-slate-950 shadow-[0_0_25px_rgba(34,211,238,0.4)] animate-pulse">
                <Smartphone className="w-7 h-7 text-cyan-300 rotate-90" />
              </div>
              <RotateCw className="w-6 h-6 text-amber-400 absolute -top-3 -right-3" />
            </div>

            <h2 className="text-2xl font-extrabold text-white tracking-wider uppercase leading-tight">
              Please turn your phone to the side to start
            </h2>
            <p className="text-sm text-slate-300 mt-3 leading-relaxed">
              Phone Mode requires landscape orientation so the 3D battlefield and dual touch controls fit your screen comfortably.
            </p>

            <div className="mt-6 pt-4 border-t border-slate-800 w-full flex flex-col gap-2">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Not on a phone? Switch device mode:
              </span>
              <div className="flex items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => deviceManager.setPreference('tablet')}
                  className="min-h-[40px] px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 rounded-lg text-xs font-extrabold cursor-pointer flex items-center gap-1.5"
                >
                  <Tablet className="w-3.5 h-3.5 text-cyan-400" /> TABLET MODE
                </button>
                <button
                  type="button"
                  onClick={() => deviceManager.setPreference('computer')}
                  className="min-h-[40px] px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 rounded-lg text-xs font-extrabold cursor-pointer flex items-center gap-1.5"
                >
                  <Monitor className="w-3.5 h-3.5 text-cyan-400" /> COMPUTER MODE
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Global Incoming Room Invite Toast (visible outside MultiplayerModal too) */}
      {!deviceState.needsLandscapeRotation &&
        multiplayerClient.roomInvites.length > 0 &&
        activeModal !== 'multiplayer' && (
          <div className="fixed top-4 right-4 z-[95] max-w-sm w-[calc(100vw-2rem)] bg-slate-950/95 border border-amber-500/80 rounded-2xl p-3.5 shadow-[0_0_30px_rgba(245,158,11,0.35)] pointer-events-auto">
            {(() => {
              const inv = multiplayerClient.roomInvites[0];
              return (
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between text-xs font-extrabold text-amber-400 uppercase tracking-wider">
                    <span>SQUAD INVITE FROM {inv.fromName}</span>
                    <span className="font-mono text-cyan-400">#{inv.fromPlayerId}</span>
                  </div>
                  <div className="text-xs text-slate-300 font-semibold">
                    Map: <strong className="text-white uppercase">{inv.mapName}</strong> · Room{' '}
                    <span className="font-mono text-cyan-300">{inv.roomId}</span>
                  </div>
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={() => {
                        if (engine?.isMapLoaded) engine.resetToMainMenu();
                        setActiveModal('multiplayer');
                        multiplayerClient.joinRoom(inv.roomId);
                      }}
                      className="flex-1 min-h-[38px] bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold rounded-lg cursor-pointer"
                    >
                      ACCEPT &amp; JOIN
                    </button>
                    <button
                      onClick={() => multiplayerClient.dismissInvite(inv.inviteId)}
                      className="min-h-[38px] px-3 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-lg cursor-pointer"
                    >
                      DISMISS
                    </button>
                  </div>
                </div>
              );
            })()}
          </div>
        )}

      {/* Settings Modal Component */}
      {activeModal === 'settings' && (
        <SettingsModal engine={engine} onClose={() => setActiveModal(gameState.isPaused ? 'none' : 'main_menu')} />
      )}

      {/* How to Play Modal Component */}
      {activeModal === 'how_to_play' && (
        <HowToPlayModal onClose={() => setActiveModal(gameState.isPaused ? 'none' : 'main_menu')} />
      )}

      {/* Map Maker View Component */}
      {activeModal === 'map_maker' && (
        <MapMakerView
          onPlayMap={(config) => handleStartCustomMap(config)}
          onClose={() => setActiveModal('main_menu')}
        />
      )}

      {/* Map Select Modal Component */}
      {activeModal === 'map_select' && (
        <MapSelectModal
          currentMapId={selectedMapConfig.id}
          onSelectMap={(config) => {
            setSelectedMapConfig(config);
            handleStartGame(config);
          }}
          onOpenMapMaker={() => setActiveModal('map_maker')}
          onClose={() => setActiveModal('main_menu')}
        />
      )}

      {/* Weapons & Loadout Modal Component */}
      {activeModal === 'loadout' && (
        <WeaponsLoadoutModal
          currentLoadout={playerLoadout}
          onSaveLoadout={handleSaveLoadout}
          onClose={() => setActiveModal('main_menu')}
        />
      )}

      {/* Co-Op Multiplayer & Friends Modal */}
      {activeModal === 'multiplayer' && (
        <MultiplayerModal
          selectedMapConfig={selectedMapConfig}
          playerLoadout={playerLoadout}
          onUpdateMapSelection={(config) => setSelectedMapConfig(config)}
          onOpenLoadout={() => setActiveModal('loadout')}
          onClose={() => setActiveModal('main_menu')}
        />
      )}

      {/* Flashbang Concussive Whiteout Glare Overlay */}
      {activeModal === 'none' && gameState.flashAlpha > 0.01 && (
        <div
          className="absolute inset-0 pointer-events-none z-10"
          style={{
            backgroundColor: `rgba(255, 255, 255, ${gameState.flashAlpha})`,
          }}
        />
      )}

      {/* Damage Vignette Screen Flash */}
      {isDamageVignetteVisible && (
        <div
          className="absolute inset-0 pointer-events-none transition-opacity duration-300 z-10"
          style={{
            background: 'radial-gradient(circle, transparent 40%, rgba(220, 20, 20, 0.75) 100%)',
          }}
        />
      )}

      {/* Crosshair & Dynamic Hitmarker */}
      {canShowCombatCrosshair && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 pointer-events-none">
          {gameState.isAiming ? (
            <div className="w-3 h-3 bg-red-500/90 rounded-full shadow-[0_0_8px_rgba(239,68,68,0.8)] border border-amber-300 scale-75" />
          ) : (
            <div className="w-2.5 h-2.5 relative">
              <div className="absolute top-1 -left-3 w-8 h-[2px] bg-white/70" />
              <div className="absolute -top-3 left-1 w-[2px] h-8 bg-white/70" />
            </div>
          )}

          {isHitmarkerActive && (
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
              <div
                className={`w-7 h-7 relative rotate-45 border-2 ${
                  hitmarkerType === 'headshot'
                    ? 'border-amber-400 scale-125'
                    : hitmarkerType === 'kill'
                    ? 'border-red-500 scale-110'
                    : 'border-white'
                }`}
              />
            </div>
          )}
        </div>
      )}

      {/* Touch Controls Overlay for Phone & Tablet Modes */}
      {engine &&
        isTouchMode &&
        !gameState.isGameOver &&
        !gameState.isPaused &&
        activeModal === 'none' &&
        !deviceState.needsLandscapeRotation && (
          <TouchControlsOverlay
            engine={engine}
            deviceMode={effectiveMode}
            isAiming={gameState.isAiming}
            isFlashlightOn={gameState.isFlashlightOn}
            grenadeCount={gameState.grenade?.count || 0}
            prompt={gameState.prompt || ''}
            isDowned={Boolean(gameState.isDowned)}
            canSwapWeapon={(gameState.weaponCount || 1) > 1}
          />
        )}

      {/* In-Game Active HUD */}
      {!gameState.isGameOver && activeModal === 'none' && (
        <>
          {/* Top Left - Health Bar (+ Co-Op Squad Strip) */}
          <div
            className={`absolute z-20 flex flex-col gap-1.5 ${
              isPhone ? 'top-2 left-2' : isTouchMode ? 'top-4 left-4' : 'top-6 left-6'
            }`}
          >
            <div
              className={`bg-slate-950/80 backdrop-blur-md border border-slate-800 rounded-xl shadow-lg ${
                isPhone ? 'p-2 min-w-[148px]' : 'p-3 min-w-[200px]'
              }`}
            >
              <div className="flex items-center justify-between text-xs font-semibold tracking-wider text-slate-300">
                <span className="flex items-center gap-1 text-red-500 font-bold">
                  <Shield className="w-3.5 h-3.5" /> HEALTH
                </span>
                <span>
                  {gameState.playerHp} / {gameState.maxHp}
                </span>
              </div>
              <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800 mt-1">
                <div
                  className={`h-full transition-all duration-200 ${
                    hpPercent < 30 ? 'bg-red-600' : hpPercent < 60 ? 'bg-amber-500' : 'bg-emerald-500'
                  }`}
                  style={{ width: `${hpPercent}%` }}
                />
              </div>

              {!isTouchMode && (
                <div className="mt-1.5 pt-1.5 border-t border-slate-800/80 flex items-center justify-between text-[11px] font-bold tracking-wider">
                  <span className={`flex items-center gap-1.5 ${gameState.isFlashlightOn ? 'text-cyan-300' : 'text-slate-500'}`}>
                    <Flashlight className="w-3.5 h-3.5" />
                    FLASHLIGHT: {gameState.isFlashlightOn ? 'ON' : 'OFF'}
                  </span>
                  <span className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-300 font-mono text-[10px]">
                    [T]
                  </span>
                </div>
              )}
            </div>

            {/* Co-Op Squad Teammates Compact Panel */}
            {gameState.isMultiplayer && Array.isArray(gameState.remoteTeammates) && gameState.remoteTeammates.length > 0 && (
              <div className="flex flex-col gap-1">
                {gameState.remoteTeammates.map((mate: CoopMemberState) => {
                  const mateHpPct = Math.max(0, Math.min(100, (mate.hp / Math.max(1, mate.maxHp)) * 100));
                  return (
                    <div
                      key={mate.playerId}
                      className={`bg-slate-950/75 backdrop-blur-md border rounded-lg px-2.5 py-1.5 ${
                        isPhone ? 'min-w-[148px]' : 'min-w-[200px]'
                      } ${mate.isDowned ? 'border-red-500/80 animate-pulse' : 'border-slate-800'}`}
                    >
                      <div className="flex items-center justify-between text-[11px] font-extrabold">
                        <span className="text-white truncate max-w-[110px]">{mate.displayName}</span>
                        <span className={mate.isDowned ? 'text-red-400' : 'text-emerald-400'}>
                          {mate.isDowned ? 'DOWNED' : `${Math.round(mate.hp)} HP`}
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden mt-1">
                        <div
                          className={`h-full ${mate.isDowned ? 'bg-red-500' : 'bg-cyan-400'}`}
                          style={{ width: `${mate.isDowned ? 100 : mateHpPct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Top Right - Score / Points (+ Compact Round & Weapon on Touch Modes so bottom corners stay open for thumbs) */}
          <div
            className={`absolute z-20 text-right flex flex-col items-end ${
              isPhone ? 'top-2 right-2' : isTouchMode ? 'top-4 right-4' : 'top-6 right-6'
            }`}
          >
            <div className="flex items-baseline gap-3">
              {isTouchMode && (
                <div className="bg-slate-950/80 border border-red-800/70 rounded-lg px-2.5 py-1 text-center backdrop-blur-md">
                  <div className="text-[9px] font-bold tracking-widest text-red-400 uppercase leading-none">RND</div>
                  <div className="text-xl font-black text-red-500 leading-tight">{gameState.round}</div>
                </div>
              )}
              <div>
                <div
                  className={`font-extrabold tracking-wider text-emerald-400 drop-shadow-[0_0_12px_rgba(52,211,153,0.5)] leading-none ${
                    isPhone ? 'text-2xl' : 'text-4xl'
                  }`}
                >
                  {gameState.score.toLocaleString()}
                </div>
                <div className="text-[10px] tracking-widest text-slate-400 font-semibold uppercase">Points</div>
              </div>
            </div>

            {isTouchMode && gameState.isRoundBreak && (
              <div className="mt-1 text-[11px] font-bold tracking-wider text-amber-400 animate-pulse">
                NEXT WAVE IN {gameState.roundBreakTimer}S...
              </div>
            )}

            {/* Touch Mode Compact Weapon Readout (Top-Right under points) */}
            {isTouchMode && gameState.weapon && (
              <div className="mt-1.5 bg-slate-950/80 backdrop-blur-md border border-slate-800 rounded-xl px-2.5 py-1.5 min-w-[140px]">
                <div
                  className={`text-xs font-extrabold uppercase truncate ${
                    gameState.weapon.isPap ? 'text-cyan-400' : 'text-white'
                  }`}
                >
                  {gameState.weapon.name}
                </div>
                <div className="text-lg font-black text-amber-400 leading-tight">
                  {gameState.weapon.clip}{' '}
                  <span className="text-xs text-slate-400 font-normal">/ {gameState.weapon.reserve}</span>
                </div>
                {gameState.weapon.isReloading && (
                  <div className="w-full h-1 bg-slate-900 rounded-full overflow-hidden mt-1">
                    <div
                      className="h-full bg-amber-400"
                      style={{ width: `${gameState.weapon.reloadProgress * 100}%` }}
                    />
                  </div>
                )}
              </div>
            )}

            {/* Floating Score Notifications */}
            <div className="mt-1.5 flex flex-col items-end gap-0.5">
              {gameState.scoreNotifications.map((n: any) => (
                <div
                  key={n.id}
                  className={`font-bold tracking-wide animate-fade-in ${isPhone ? 'text-xs' : 'text-sm'} ${
                    n.type === 'headshot'
                      ? 'text-amber-400'
                      : n.type === 'kill'
                      ? 'text-emerald-400'
                      : n.type === 'repair'
                      ? 'text-cyan-400'
                      : 'text-slate-200'
                  }`}
                >
                  {n.text}
                </div>
              ))}
            </div>
          </div>

          {/* Computer Mode Bottom Left - Round Counter */}
          {!isTouchMode && (
            <div className="absolute bottom-8 left-8 z-20 flex flex-col">
              <div className="text-xs font-bold tracking-widest text-red-400 uppercase">ROUND</div>
              <div className="text-7xl font-extrabold tracking-tighter text-red-600 drop-shadow-[0_0_16px_rgba(220,38,38,0.8)] leading-none">
                {gameState.round}
              </div>

              {gameState.isRoundBreak && (
                <div className="mt-2 text-sm font-bold tracking-wider text-amber-400 animate-pulse">
                  NEXT WAVE IN {gameState.roundBreakTimer}S...
                </div>
              )}
            </div>
          )}

          {/* Perks Badges Bar (Bottom-Center on Computer, Top-Center below utility strip on Touch Modes) */}
          <div
            className={`absolute left-1/2 -translate-x-1/2 z-20 flex items-center gap-2.5 ${
              isTouchMode ? (isPhone ? 'top-14' : 'top-16') : 'bottom-8'
            }`}
          >
            {gameState.perks.juggernog && (
              <div
                className={`${
                  isPhone ? 'w-8 h-8' : 'w-11 h-11'
                } rounded-full bg-red-600 border-2 border-white flex items-center justify-center shadow-[0_0_12px_rgba(220,38,38,0.8)]`}
                title="Titan Tonic (250 HP)"
              >
                <Shield className={isPhone ? 'w-4 h-4 text-white' : 'w-5 h-5 text-white'} />
              </div>
            )}
            {gameState.perks.speedCola && (
              <div
                className={`${
                  isPhone ? 'w-8 h-8' : 'w-11 h-11'
                } rounded-full bg-emerald-600 border-2 border-white flex items-center justify-center shadow-[0_0_12px_rgba(16,185,129,0.8)]`}
                title="Blitz Brew (50% Reload Time)"
              >
                <Zap className={isPhone ? 'w-4 h-4 text-white' : 'w-5 h-5 text-white'} />
              </div>
            )}
            {gameState.perks.doubleTap && (
              <div
                className={`${
                  isPhone ? 'w-8 h-8' : 'w-11 h-11'
                } rounded-full bg-amber-500 border-2 border-white flex items-center justify-center shadow-[0_0_12px_rgba(245,158,11,0.8)]`}
                title="Fury Fizz (+50% Fire Rate & Damage)"
              >
                <Target className={isPhone ? 'w-4 h-4 text-white' : 'w-5 h-5 text-white'} />
              </div>
            )}
          </div>

          {/* Computer Mode Bottom Right - Grenade + Weapon & Ammo */}
          {!isTouchMode && gameState.weapon && (
            <div className="absolute bottom-8 right-8 z-20 flex flex-col items-end gap-2">
              {gameState.grenade && (
                <div className="bg-slate-950/80 backdrop-blur-md border border-slate-800 px-3.5 py-2 rounded-xl flex items-center gap-3 shadow-lg">
                  <Bomb className="w-4 h-4 text-orange-400 shrink-0" />
                  <div className="text-right">
                    <div className="text-[10px] font-bold tracking-widest text-slate-400 uppercase leading-none">
                      {gameState.grenade.name} <span className="text-cyan-300 font-mono">[G]</span>
                    </div>
                    <div className="text-lg font-extrabold text-white leading-tight">
                      {gameState.grenade.count}{' '}
                      <span className="text-xs text-slate-400 font-semibold">/ {gameState.grenade.max}</span>
                    </div>
                  </div>
                </div>
              )}

              <div className="text-right bg-slate-950/80 backdrop-blur-md border border-slate-800 p-4 rounded-xl min-w-[220px] shadow-lg">
                <div className="flex items-center justify-end gap-2">
                  <div
                    className={`text-xl font-bold tracking-wider uppercase ${
                      gameState.weapon.isPap ? 'text-cyan-400 drop-shadow-[0_0_10px_rgba(6,182,212,0.7)]' : 'text-white'
                    }`}
                  >
                    {gameState.weapon.name}
                  </div>
                  {gameState.weapon.isPap && (
                    <span className="text-[10px] bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 px-1.5 py-0.5 rounded font-bold uppercase">
                      Hyper-Forged
                    </span>
                  )}
                </div>

                <div className="text-4xl font-extrabold tracking-wider text-amber-400 mt-1">
                  {gameState.weapon.clip} <span className="text-xl text-slate-400 font-normal">/ {gameState.weapon.reserve}</span>
                </div>

                {gameState.weapon.isReloading && (
                  <div className="mt-2">
                    <div className="text-xs font-semibold text-amber-400 mb-1 tracking-wider uppercase">RELOADING...</div>
                    <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden border border-amber-500/30">
                      <div
                        className="h-full bg-amber-400 transition-all duration-75"
                        style={{ width: `${gameState.weapon.reloadProgress * 100}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Downed Overlay Banner (Co-Op) */}
          {gameState.isMultiplayer && gameState.isDowned && (
            <div className="absolute top-[28%] left-1/2 -translate-x-1/2 z-20 bg-red-950/90 border border-red-500 text-red-100 px-5 py-2.5 rounded-xl shadow-[0_0_25px_rgba(220,38,38,0.6)] flex items-center gap-2.5 text-sm sm:text-base font-extrabold tracking-wider">
              <HeartPulse className="w-5 h-5 text-red-400 animate-pulse" />
              <span>YOU ARE DOWNED — WAIT FOR TEAMMATE REVIVE ({gameState.bleedoutTimer}S)</span>
            </div>
          )}

          {/* Center Interaction Prompt Box */}
          {gameState.prompt && (
            <div
              className={`absolute left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 bg-slate-950/90 border border-cyan-500/60 text-cyan-300 rounded-lg shadow-[0_0_20px_rgba(6,182,212,0.3)] text-center font-bold tracking-wider animate-pulse max-w-[85vw] ${
                isPhone ? 'top-[62%] px-3.5 py-1.5 text-xs' : 'top-[62%] px-6 py-3 text-base sm:text-lg'
              }`}
            >
              {gameState.prompt}
            </div>
          )}

          {/* Custom Map No-Spawners Notice */}
          {engine?.activeMapConfig && !engine.barriers.length && (
            <div className="absolute top-20 left-1/2 -translate-x-1/2 z-20 bg-amber-950/90 border border-amber-500/80 text-amber-300 px-4 py-2 rounded-xl shadow-[0_0_20px_rgba(245,158,11,0.4)] text-center text-xs sm:text-sm font-bold tracking-wider max-w-[90vw]">
              NO ZOMBIE SPAWNERS OR WINDOWS IN MAP — ADD SPAWNERS IN MAP MAKER TO SPAWN ZOMBIES!
            </div>
          )}
        </>
      )}

      {/* HOME SCREEN / MAIN MENU (Adaptively fits Computer, Phone Landscape, and Tablet Portrait/Landscape) */}
      {activeModal === 'main_menu' && !gameState.isPointerLocked && !gameState.isPaused && !gameState.isGameOver && (
        <div className="fixed inset-0 bg-slate-950/95 backdrop-blur-md z-50 overflow-y-auto pointer-events-auto">
          <div className="min-h-full w-full flex flex-col items-center justify-center p-3 sm:p-6">
            {/* Device Mode & Resolution Bar */}
            <div className="max-w-5xl w-full mb-3 flex flex-wrap items-center justify-between gap-2 bg-slate-900/75 border border-slate-800 rounded-xl px-3.5 py-2">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
                {renderDeviceIcon(effectiveMode)}
                <span className="uppercase tracking-wider">
                  {effectiveMode} MODE
                  {deviceState.preference === 'auto' ? ' (AUTO-DETECTED)' : ' (MANUAL)'}
                </span>
              </div>
              <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
                {DEVICE_SWITCH_PILLS.map((p) => {
                  const selected = deviceState.preference === p.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => deviceManager.setPreference(p.id)}
                      className={`px-2.5 py-1 rounded text-[11px] font-extrabold tracking-wider cursor-pointer transition-colors ${
                        selected
                          ? 'bg-cyan-500 text-slate-950'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {p.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div
              className={`max-w-5xl w-full flex items-stretch ${
                isPhone
                  ? 'flex-row gap-3.5'
                  : isTabletPortrait
                  ? 'flex-col gap-4'
                  : 'flex-col md:flex-row gap-6'
              }`}
            >
              {/* Left Column - Navigation */}
              <div
                className={`flex flex-col shrink-0 justify-center ${
                  isPhone
                    ? 'w-[45%] gap-2'
                    : isTabletPortrait
                    ? 'w-full gap-2.5'
                    : 'w-full md:w-80 gap-3'
                }`}
              >
                <div className={isPhone ? 'mb-0.5' : 'mb-1.5'}>
                  <h1
                    className={`font-extrabold text-red-600 tracking-wider drop-shadow-[0_0_20px_rgba(220,38,38,0.8)] leading-none ${
                      isPhone ? 'text-2xl' : 'text-4xl sm:text-5xl'
                    }`}
                  >
                    POLY-OPS ZOMBIES
                  </h1>
                  <p className="text-slate-400 text-xs sm:text-sm font-semibold tracking-widest mt-0.5">
                    3D UNDEAD SURVIVAL
                  </p>
                </div>

                {savedRun && (
                  <button
                    onClick={handleResumeSavedRun}
                    className={`w-full flex flex-col items-center justify-center bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white font-extrabold rounded-xl shadow-[0_0_20px_rgba(16,185,129,0.4)] transition-all active:scale-95 cursor-pointer ${
                      isPhone ? 'py-2 px-3 min-h-[44px]' : 'py-3 px-4'
                    }`}
                  >
                    <span className="flex items-center gap-2 text-sm sm:text-lg tracking-wider">
                      <Play className="w-4 h-4 sm:w-5 sm:h-5 fill-white" /> RESUME SAVED RUN
                    </span>
                    <span className="text-[10px] sm:text-[11px] font-bold text-emerald-100 uppercase tracking-wide truncate max-w-full">
                      Round {savedRun.stats.round} · {savedRun.mapName} · {savedRun.stats.score.toLocaleString()} PTS
                    </span>
                  </button>
                )}

                <button
                  onClick={handleStartGame}
                  className={`w-full flex items-center justify-center gap-2.5 bg-red-600 hover:bg-red-500 text-white font-extrabold rounded-xl shadow-[0_0_25px_rgba(220,38,38,0.5)] transition-all active:scale-95 cursor-pointer tracking-wider ${
                    isPhone ? 'min-h-[44px] py-2.5 text-base' : 'py-3.5 sm:py-4 text-xl'
                  }`}
                >
                  <Play className={isPhone ? 'w-4 h-4 fill-white' : 'w-6 h-6 fill-white'} />
                  {savedRun ? 'NEW SURVIVAL MATCH' : 'PLAY SURVIVAL'}
                </button>

                {/* Multiplayer & Friends Button */}
                <button
                  onClick={() => setActiveModal('multiplayer')}
                  className={`w-full flex items-center justify-between bg-gradient-to-r from-cyan-700/80 to-slate-900 hover:from-cyan-600/85 hover:to-slate-800 text-white font-extrabold px-3.5 rounded-xl border border-cyan-500/50 transition-all active:scale-95 cursor-pointer ${
                    isPhone ? 'min-h-[44px] py-2 text-sm' : 'py-3 text-base'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <Users className="w-4 h-4 sm:w-5 sm:h-5 text-cyan-300" /> MULTIPLAYER &amp; FRIENDS
                  </span>
                  <span className="text-[11px] font-mono text-cyan-200 flex items-center gap-1.5">
                    {multiplayerClient.myPlayerId ? `#${multiplayerClient.myPlayerId}` : 'ONLINE'}
                    {pendingAlertCount > 0 && (
                      <span className="bg-amber-400 text-slate-950 font-black px-1.5 py-0.5 rounded text-[10px]">
                        {pendingAlertCount}
                      </span>
                    )}
                  </span>
                </button>

                {/* Secondary Action Grid (2 columns on tablet portrait or phone for clean compactness) */}
                <div className={isTabletPortrait || isPhone ? 'grid grid-cols-2 gap-2' : 'flex flex-col gap-3'}>
                  <button
                    onClick={() => setActiveModal('map_maker')}
                    className={`w-full flex items-center justify-center gap-1.5 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white font-bold rounded-xl shadow-[0_0_15px_rgba(217,119,6,0.4)] transition-all active:scale-95 cursor-pointer ${
                      isPhone ? 'min-h-[44px] py-2 px-2 text-xs' : 'py-3 px-3 text-sm sm:text-base'
                    }`}
                  >
                    <Box className="w-4 h-4 text-amber-200 shrink-0" /> <span className="truncate">MAP MAKER</span>
                  </button>

                  <button
                    onClick={() => setActiveModal('map_select')}
                    className={`w-full flex items-center justify-between bg-slate-900 hover:bg-slate-800 text-slate-200 font-bold px-3 rounded-xl border border-slate-800 hover:border-slate-700 transition-all cursor-pointer ${
                      isPhone ? 'min-h-[44px] py-2 text-xs' : 'py-3 text-sm sm:text-base'
                    }`}
                  >
                    <span className="flex items-center gap-1.5 truncate">
                      <Crosshair className="w-4 h-4 text-cyan-400 shrink-0" /> MAPS
                    </span>
                    {!isPhone && (
                      <span className="text-[10px] text-red-400 font-extrabold uppercase truncate max-w-[110px]">
                        {selectedMapConfig.name}
                      </span>
                    )}
                  </button>

                  <button
                    onClick={() => setActiveModal('loadout')}
                    className={`w-full flex items-center justify-between bg-slate-900 hover:bg-slate-800 text-slate-200 font-bold px-3 rounded-xl border border-slate-800 hover:border-slate-700 transition-all cursor-pointer ${
                      isPhone ? 'min-h-[44px] py-2 text-xs' : 'py-3 text-sm sm:text-base'
                    }`}
                  >
                    <span className="flex items-center gap-1.5 truncate">
                      <Flame className="w-4 h-4 text-red-400 shrink-0" /> LOADOUT
                    </span>
                    {!isPhone && (
                      <span className="text-[10px] text-amber-300 font-extrabold uppercase truncate max-w-[110px]">
                        {WEAPONS_MAP[playerLoadout.startingPistolId]?.name || 'M1911'}
                      </span>
                    )}
                  </button>

                  <button
                    onClick={() => setActiveModal('settings')}
                    className={`w-full flex items-center justify-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-slate-200 font-bold px-3 rounded-xl border border-slate-800 hover:border-slate-700 transition-all cursor-pointer ${
                      isPhone ? 'min-h-[44px] py-2 text-xs' : 'py-3 text-sm sm:text-base'
                    }`}
                  >
                    <Sliders className="w-4 h-4 text-amber-400 shrink-0" /> SETTINGS
                  </button>
                </div>

                <button
                  onClick={() => setActiveModal('how_to_play')}
                  className={`w-full flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-slate-200 font-bold rounded-xl border border-slate-800 hover:border-slate-700 transition-all cursor-pointer ${
                    isPhone ? 'min-h-[40px] py-1.5 text-xs' : 'py-3 text-base'
                  }`}
                >
                  <HelpCircle className="w-4 h-4 text-cyan-400" /> HOW TO PLAY
                </button>
              </div>

              {/* Right Column - Map Showcase & Records */}
              <div
                className={`flex-1 bg-slate-900/80 border border-slate-800 rounded-2xl flex flex-col justify-between shadow-2xl relative overflow-hidden ${
                  isPhone ? 'p-3.5' : 'p-5 sm:p-7'
                }`}
              >
                <div className={isPhone ? 'space-y-2' : 'space-y-3.5'}>
                  <div className="text-[11px] font-bold text-red-400 uppercase tracking-widest flex items-center gap-1.5">
                    <Crosshair className="w-3.5 h-3.5" />
                    {isOfficialMapId(selectedMapConfig.id) ? 'FEATURED OFFICIAL MAP' : 'SELECTED COMMUNITY MAP'}
                  </div>
                  <h3 className={`font-extrabold text-white tracking-wider uppercase ${isPhone ? 'text-xl' : 'text-3xl'}`}>
                    {selectedMapConfig.name}
                  </h3>
                  <p className={`text-slate-300 leading-relaxed ${isPhone ? 'text-xs line-clamp-2' : 'text-sm'}`}>
                    {selectedMapConfig.id === OFFICIAL_SECTOR_ZERO_ID
                      ? 'Deep inside a forgotten Cold War weapons testing facility, waves of zombie shamblers breach wooden window barriers. Purchase wall guns, drink Power Brews, and unlock the Hyper-Forge.'
                      : selectedMapConfig.id === OFFICIAL_BLIGHTED_WOODS_ID
                      ? 'A moonlit pine forest filled with trees and mossy boulders. Track down the hidden Teleporter, warp into the molten Magma Cavern, and parkour across volcanic stepping stones to reach the Hyper-Forge.'
                      : `Custom arena built in Map Maker Studio with ${selectedMapConfig.objects.length} 3D objects, ${
                          selectedMapConfig.objects.filter((o) => o.type === 'window_barrier').length
                        } Window Barriers, and ${
                          selectedMapConfig.objects.filter((o) => o.type === 'zombie_spawn').length
                        } Zombie Spawners.`}
                  </p>

                  <div className={`grid grid-cols-2 ${isPhone ? 'gap-2 pt-1' : 'gap-3 pt-2'}`}>
                    <div className={`bg-slate-950 border border-slate-800 rounded-xl ${isPhone ? 'p-2' : 'p-3'}`}>
                      <div className="text-[10px] font-bold text-slate-400 uppercase">STARTING SIDEARM</div>
                      <div className={`font-black text-red-400 uppercase truncate ${isPhone ? 'text-sm' : 'text-lg'}`}>
                        {WEAPONS_MAP[playerLoadout.startingPistolId]?.name || 'M1911'}
                      </div>
                      {!isPhone && (
                        <div className="text-[10px] text-slate-500 font-bold uppercase">Pistols Only Policy</div>
                      )}
                    </div>
                    <div className={`bg-slate-950 border border-slate-800 rounded-xl ${isPhone ? 'p-2' : 'p-3'}`}>
                      <div className="text-[10px] font-bold text-slate-400 uppercase">EQUIPPED GRENADE</div>
                      <div className={`font-black text-cyan-400 uppercase truncate ${isPhone ? 'text-sm' : 'text-lg'}`}>
                        {GRENADES_MAP[playerLoadout.grenadeType]?.shortName || 'FRAG GRENADE'}
                      </div>
                      {!isPhone && (
                        <div className="text-[10px] text-slate-500 font-bold uppercase">
                          {GRENADES_MAP[playerLoadout.grenadeType]?.startCount || 3} Charges
                        </div>
                      )}
                    </div>
                    <div className={`bg-slate-950 border border-slate-800 rounded-xl ${isPhone ? 'p-2' : 'p-3'}`}>
                      <div className="text-[10px] font-bold text-slate-400 uppercase">BEST SURVIVAL</div>
                      <div className={`font-black text-red-500 ${isPhone ? 'text-base' : 'text-2xl'}`}>
                        ROUND {gameState.records?.bestRound || gameState.round}
                      </div>
                      {!isPhone && (
                        <div className="text-[10px] text-slate-500 font-bold uppercase">
                          High Score: {(gameState.records?.bestScore || 500).toLocaleString()}
                        </div>
                      )}
                    </div>
                    <div className={`bg-slate-950 border border-slate-800 rounded-xl ${isPhone ? 'p-2' : 'p-3'}`}>
                      <div className="text-[10px] font-bold text-slate-400 uppercase">ELIMINATIONS</div>
                      <div className={`font-black text-amber-400 ${isPhone ? 'text-base' : 'text-2xl'}`}>
                        {(gameState.records?.totalKills || gameState.kills).toLocaleString()} KILLS
                      </div>
                      {!isPhone && (
                        <div className="text-[10px] text-slate-500 font-bold uppercase">
                          Headshots: {(gameState.records?.totalHeadshots || 0).toLocaleString()}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div
                  className={`border-t border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400 ${
                    isPhone ? 'pt-2 mt-2' : 'pt-4 mt-4'
                  }`}
                >
                  <span>
                    {multiplayerClient.myPlayerId
                      ? `Operator ID #${multiplayerClient.myPlayerId}`
                      : 'Poly-Ops Survival'}
                  </span>
                  {cgInfo.active ? (
                    <span className="inline-flex items-center gap-1.5 text-cyan-400 font-bold">
                      <Cloud className="w-3.5 h-3.5" />
                      {cgInfo.username ? `CrazyGames: ${cgInfo.username}` : 'CrazyGames Sync Active'}
                    </span>
                  ) : (
                    <span className="text-emerald-400 font-semibold">Ready for Combat</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PAUSE SCREEN MODAL */}
      {gameState.isPaused && !gameState.isGameOver && activeModal === 'none' && !deviceState.needsLandscapeRotation && (
        <div
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          className="fixed inset-0 bg-slate-950/90 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-6 pointer-events-auto overflow-y-auto"
        >
          <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-8 text-center shadow-2xl max-h-[94dvh] overflow-y-auto">
            <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-wider mb-4 sm:mb-6">GAME PAUSED</h2>

            {gameState.isMultiplayer && currentRoom && (
              <div className="mb-4 bg-slate-950 border border-cyan-500/40 rounded-xl p-3 flex items-center justify-between gap-2">
                <div className="text-left">
                  <div className="text-[10px] font-bold text-cyan-400 uppercase">CO-OP ROOM CODE</div>
                  <div className="text-base font-black font-mono text-white">{currentRoom.roomId}</div>
                </div>
                <button
                  onClick={() => copyRoomInviteLink(currentRoom.roomId)}
                  className="px-3 py-1.5 bg-cyan-600/20 hover:bg-cyan-600/35 border border-cyan-500/50 text-cyan-300 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  {copiedInvite ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedInvite ? 'COPIED!' : 'INVITE LINK'}
                </button>
              </div>
            )}

            <div className="flex flex-col gap-2.5 sm:gap-3">
              <button
                onClick={() => engine?.resumeGame()}
                className="w-full min-h-[44px] bg-red-600 hover:bg-red-500 text-white font-bold py-3 rounded-xl transition-all cursor-pointer text-base sm:text-lg"
              >
                RESUME GAME
              </button>

              <button
                onClick={() => setActiveModal('settings')}
                className="w-full min-h-[44px] flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold py-2.5 rounded-xl border border-slate-700 transition-all cursor-pointer"
              >
                <Sliders className="w-5 h-5 text-amber-400" /> SETTINGS
              </button>

              <button
                onClick={() => setActiveModal('how_to_play')}
                className="w-full min-h-[44px] flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold py-2.5 rounded-xl border border-slate-700 transition-all cursor-pointer"
              >
                <HelpCircle className="w-5 h-5 text-cyan-400" /> HOW TO PLAY
              </button>

              {!gameState.isMultiplayer && (
                <button
                  onClick={handleManualSaveProgress}
                  className="w-full min-h-[44px] flex items-center justify-center gap-2 bg-emerald-900/60 hover:bg-emerald-800/80 text-emerald-200 font-bold py-2.5 rounded-xl border border-emerald-600/60 transition-all cursor-pointer"
                >
                  <Save className="w-5 h-5 text-emerald-400" />
                  {saveToast
                    ? cgInfo.active
                      ? 'SAVED TO CRAZYGAMES CLOUD!'
                      : 'PROGRESS SAVED!'
                    : 'SAVE GAME PROGRESS'}
                </button>
              )}

              <button
                onClick={toggleMute}
                disabled={cgInfo.platformMuted}
                className={`w-full min-h-[44px] flex items-center justify-center gap-2 font-semibold py-2.5 rounded-xl border transition-all ${
                  cgInfo.platformMuted
                    ? 'bg-slate-900/70 text-slate-400 border-slate-800 cursor-not-allowed'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700 cursor-pointer'
                }`}
              >
                {isMuted || cgInfo.platformMuted ? (
                  <VolumeX className="w-5 h-5 text-red-400" />
                ) : (
                  <Volume2 className="w-5 h-5 text-emerald-400" />
                )}
                {cgInfo.platformMuted
                  ? 'AUDIO MUTED BY CRAZYGAMES'
                  : isMuted
                  ? 'UNMUTE AUDIO'
                  : 'MUTE AUDIO'}
              </button>

              {isTestingCustomMap && !gameState.isMultiplayer && (
                <button
                  onClick={handleReturnToMapEditor}
                  className="w-full min-h-[44px] flex items-center justify-center gap-2 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white font-bold py-2.5 rounded-xl shadow-[0_0_15px_rgba(217,119,6,0.4)] transition-all cursor-pointer"
                >
                  <Box className="w-5 h-5 text-amber-200" /> RETURN TO MAP EDITOR
                </button>
              )}

              {gameState.isMultiplayer && (
                <button
                  onClick={handleReturnToSquadLobby}
                  className="w-full min-h-[44px] flex items-center justify-center gap-2 bg-cyan-900/60 hover:bg-cyan-800/70 text-cyan-200 font-bold py-2.5 rounded-xl border border-cyan-600/50 transition-all cursor-pointer"
                >
                  <Users className="w-5 h-5 text-cyan-300" /> RETURN TO SQUAD LOBBY
                </button>
              )}

              <button
                onClick={handleReturnToMainMenu}
                className="w-full min-h-[44px] flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold py-2.5 rounded-xl border border-slate-700 transition-all cursor-pointer"
              >
                <Home className="w-5 h-5 text-red-400" /> {gameState.isMultiplayer ? 'LEAVE & MAIN MENU' : 'MAIN MENU'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* GAME OVER SCREEN MODAL */}
      {gameState.isGameOver && activeModal === 'none' && (
        <div
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          className="fixed inset-0 bg-slate-950/95 backdrop-blur-lg z-50 flex items-center justify-center p-3 sm:p-6 pointer-events-auto overflow-y-auto"
        >
          <div className="max-w-lg w-full bg-slate-900/90 border border-red-900 rounded-2xl p-5 sm:p-8 text-center shadow-[0_0_60px_rgba(220,38,38,0.5)] max-h-[94dvh] overflow-y-auto">
            <h1 className="text-4xl sm:text-6xl font-extrabold text-red-600 tracking-wider mb-1 sm:mb-2 drop-shadow-[0_0_20px_rgba(220,38,38,0.9)]">
              {gameState.isMultiplayer ? 'SQUAD WIPED' : 'YOU DIED'}
            </h1>
            <p className="text-slate-400 text-sm sm:text-lg mb-5 sm:mb-8">The horde overwhelmed your position.</p>

            {/* Score & Stats Grid */}
            <div className="grid grid-cols-2 gap-3 sm:gap-4 bg-slate-950 border border-slate-800 p-4 sm:p-5 rounded-xl mb-5 sm:mb-8">
              <div className="text-left">
                <div className="text-[11px] text-slate-400 font-bold uppercase">ROUNDS SURVIVED</div>
                <div className="text-2xl sm:text-3xl font-extrabold text-red-500">{gameState.round}</div>
              </div>
              <div className="text-left">
                <div className="text-[11px] text-slate-400 font-bold uppercase">TOTAL KILLS</div>
                <div className="text-2xl sm:text-3xl font-extrabold text-amber-400">{gameState.kills}</div>
              </div>
              <div className="text-left">
                <div className="text-[11px] text-slate-400 font-bold uppercase">HEADSHOTS</div>
                <div className="text-2xl sm:text-3xl font-extrabold text-emerald-400">{gameState.headshots}</div>
              </div>
              <div className="text-left">
                <div className="text-[11px] text-slate-400 font-bold uppercase">FINAL SCORE</div>
                <div className="text-2xl sm:text-3xl font-extrabold text-cyan-400">{gameState.score.toLocaleString()}</div>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              {(!gameState.isMultiplayer || isRoomHost) && (
                <button
                  onClick={handleGameOverRetry}
                  className="w-full min-h-[46px] flex items-center justify-center gap-2 bg-red-600 hover:bg-red-500 text-white font-bold text-lg sm:text-xl py-3 sm:py-4 rounded-xl shadow-lg transition-all active:scale-95 cursor-pointer"
                >
                  <RotateCcw className="w-5 h-5 sm:w-6 sm:h-6" />{' '}
                  {gameState.isMultiplayer ? 'PLAY AGAIN (SQUAD)' : 'TRY AGAIN'}
                </button>
              )}

              {gameState.isMultiplayer && (
                <button
                  onClick={handleReturnToSquadLobby}
                  className="w-full min-h-[44px] flex items-center justify-center gap-2 bg-cyan-800 hover:bg-cyan-700 text-white font-bold py-3 rounded-xl border border-cyan-500/50 transition-all cursor-pointer"
                >
                  <Users className="w-5 h-5 text-cyan-200" /> RETURN TO SQUAD LOBBY
                </button>
              )}

              <button
                onClick={handleGameOverMainMenu}
                className="w-full min-h-[44px] flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold py-3 rounded-xl border border-slate-700 transition-all cursor-pointer"
              >
                <Home className="w-5 h-5 text-red-400" /> MAIN MENU
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
