import React, { useState, useEffect } from 'react';
import { GameEngine } from '../game/GameEngine';
import { generateSingleFileHTML } from './SingleFileExporter';
import { SettingsModal } from './SettingsModal';
import { HowToPlayModal } from './HowToPlayModal';
import { MapMakerView } from './MapMakerView';
import { MapSelectModal } from './MapSelectModal';
import { CustomMapConfig, getDefaultMapConfig } from '../types/game';
import { Volume2, VolumeX, Download, Play, RotateCcw, Shield, Zap, Target, Sliders, HelpCircle, Flame, Home, Crosshair, Box, Flashlight } from 'lucide-react';
import { soundEngine } from '../utils/soundEngine';

interface HUDOverlayProps {
  engine: GameEngine | null;
}

export const HUDOverlay: React.FC<HUDOverlayProps> = ({ engine }) => {
  const [gameState, setGameState] = useState<any>(null);
  const [isHitmarkerActive, setIsHitmarkerActive] = useState(false);
  const [hitmarkerType, setHitmarkerType] = useState<'normal' | 'kill' | 'headshot'>('normal');
  const [isMuted, setIsMuted] = useState(false);
  const [activeModal, setActiveModal] = useState<'none' | 'main_menu' | 'settings' | 'how_to_play' | 'map_maker' | 'map_select'>('main_menu');
  const [selectedMapConfig, setSelectedMapConfig] = useState<CustomMapConfig>(() => getDefaultMapConfig());
  const [isTestingCustomMap, setIsTestingCustomMap] = useState<boolean>(false);

  useEffect(() => {
    if (!engine) return;

    const updateUI = () => {
      const curWep = engine.playerWeapons[engine.currentWeaponIndex];
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
        playerHp: Math.round(engine.playerHp),
        maxHp: engine.maxHp,
        prompt: engine.currentPrompt,
        perks: { ...engine.perks },
        scoreNotifications: [...engine.scoreNotifications],
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
    };

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
            engine.requestLock();
          }
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    updateUI();

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [engine]);

  const toggleMute = () => {
    const next = !isMuted;
    setIsMuted(next);
    soundEngine.setMuted(next);
  };

  const handleStartGame = (mapConfigOverride?: CustomMapConfig | React.MouseEvent) => {
    setActiveModal('none');
    const targetMap = (mapConfigOverride && 'id' in mapConfigOverride) ? mapConfigOverride : selectedMapConfig;
    const isCustom = targetMap.id !== 'default_der_abandoned';
    setIsTestingCustomMap(isCustom);
    engine?.unloadMap();
    if (isCustom) {
      engine?.loadMap(targetMap);
    } else {
      engine?.loadMap();
    }
    engine?.requestLock();
  };

  const handleStartCustomMap = (config: CustomMapConfig) => {
    setActiveModal('none');
    setSelectedMapConfig(config);
    setIsTestingCustomMap(true);
    engine?.unloadMap();
    engine?.loadMap(config);
    engine?.requestLock();
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

  const handleDownloadHTML = () => {
    const htmlContent = generateSingleFileHTML();
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'poly_ops_zombies.html';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (!gameState) return null;

  const isDamageVignetteVisible = gameState.playerHp < gameState.maxHp * 0.4;
  const hpPercent = (gameState.playerHp / gameState.maxHp) * 100;

  return (
    <div className="absolute inset-0 pointer-events-none select-none overflow-hidden font-['Rajdhani',sans-serif]">
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
          onSelectMap={(config) => {
            setSelectedMapConfig(config);
            handleStartGame(config);
          }}
          onOpenMapMaker={() => setActiveModal('map_maker')}
          onClose={() => setActiveModal('main_menu')}
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
      {gameState.isPointerLocked && !gameState.isGameOver && !gameState.isPaused && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 pointer-events-none">
          {/* ADS Precision Reticle vs Hipfire Crosshair */}
          {gameState.isAiming ? (
            <div className="w-3 h-3 bg-red-500/90 rounded-full shadow-[0_0_8px_rgba(239,68,68,0.8)] border border-amber-300 scale-75" />
          ) : (
            <div className="w-2.5 h-2.5 relative">
              <div className="absolute top-1 -left-3 w-8 h-[2px] bg-white/70" />
              <div className="absolute -top-3 left-1 w-[2px] h-8 bg-white/70" />
            </div>
          )}

          {/* Hitmarker X indicator */}
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

      {/* In-Game Active HUD */}
      {!gameState.isGameOver && activeModal === 'none' && (
        <>
          {/* Top Left - Health Bar */}
          <div className="absolute top-6 left-6 z-20 flex flex-col gap-1 bg-slate-950/80 backdrop-blur-md border border-slate-800 p-3 rounded-xl min-w-[200px] shadow-lg">
            <div className="flex items-center justify-between text-xs font-semibold tracking-wider text-slate-300">
              <span className="flex items-center gap-1 text-red-500 font-bold">
                <Shield className="w-3.5 h-3.5" /> HEALTH
              </span>
              <span>
                {gameState.playerHp} / {gameState.maxHp}
              </span>
            </div>
            <div className="w-full h-2.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
              <div
                className={`h-full transition-all duration-200 ${
                  hpPercent < 30 ? 'bg-red-600' : hpPercent < 60 ? 'bg-amber-500' : 'bg-emerald-500'
                }`}
                style={{ width: `${hpPercent}%` }}
              />
            </div>

            <div className="mt-1 pt-1.5 border-t border-slate-800/80 flex items-center justify-between text-[11px] font-bold tracking-wider">
              <span className={`flex items-center gap-1.5 ${gameState.isFlashlightOn ? 'text-cyan-300' : 'text-slate-500'}`}>
                <Flashlight className="w-3.5 h-3.5" />
                FLASHLIGHT: {gameState.isFlashlightOn ? 'ON' : 'OFF'}
              </span>
              <span className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-300 font-mono text-[10px]">
                [T]
              </span>
            </div>
          </div>

          {/* Top Right - Score / Points */}
          <div className="absolute top-6 right-6 z-20 text-right">
            <div className="text-4xl font-extrabold tracking-wider text-emerald-400 drop-shadow-[0_0_12px_rgba(52,211,153,0.5)]">
              {gameState.score.toLocaleString()}
            </div>
            <div className="text-xs tracking-widest text-slate-400 font-semibold uppercase">Points</div>

            {/* Floating Score Notifications */}
            <div className="mt-2 flex flex-col items-end gap-1">
              {gameState.scoreNotifications.map((n: any) => (
                <div
                  key={n.id}
                  className={`text-sm font-bold tracking-wide animate-fade-in ${
                    n.type === 'headshot'
                      ? 'text-amber-400 text-base'
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

          {/* Bottom Left - Round Counter */}
          <div className="absolute bottom-8 left-8 z-20 flex flex-col">
            <div className="text-xs font-bold tracking-widest text-red-400 uppercase">ROUND</div>
            <div className="text-7xl font-extrabold tracking-tighter text-red-600 drop-shadow-[0_0_16px_rgba(220,38,38,0.8)] leading-none">
              {gameState.round}
            </div>

            {/* Round Break Toast */}
            {gameState.isRoundBreak && (
              <div className="mt-2 text-sm font-bold tracking-wider text-amber-400 animate-pulse">
                NEXT WAVE IN {gameState.roundBreakTimer}S...
              </div>
            )}
          </div>

          {/* Bottom Center - Perks Badges Bar */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 flex items-center gap-3">
            {gameState.perks.juggernog && (
              <div
                className="w-12 h-12 rounded-full bg-red-600 border-2 border-white flex items-center justify-center shadow-[0_0_12px_rgba(220,38,38,0.8)]"
                title="Titan Tonic (250 HP)"
              >
                <Shield className="w-6 h-6 text-white" />
              </div>
            )}
            {gameState.perks.speedCola && (
              <div
                className="w-12 h-12 rounded-full bg-emerald-600 border-2 border-white flex items-center justify-center shadow-[0_0_12px_rgba(16,185,129,0.8)]"
                title="Blitz Brew (50% Reload Time)"
              >
                <Zap className="w-6 h-6 text-white" />
              </div>
            )}
            {gameState.perks.doubleTap && (
              <div
                className="w-12 h-12 rounded-full bg-amber-500 border-2 border-white flex items-center justify-center shadow-[0_0_12px_rgba(245,158,11,0.8)]"
                title="Fury Fizz (+50% Fire Rate & Damage)"
              >
                <Target className="w-6 h-6 text-white" />
              </div>
            )}
          </div>

          {/* Bottom Right - Weapon & Ammo */}
          {gameState.weapon && (
            <div className="absolute bottom-8 right-8 z-20 text-right bg-slate-950/80 backdrop-blur-md border border-slate-800 p-4 rounded-xl min-w-[220px] shadow-lg">
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

              {/* Reload Progress Bar */}
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
          )}

          {/* Center Interaction Prompt Box */}
          {gameState.prompt && (
            <div className="absolute top-[62%] left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 bg-slate-950/90 border border-cyan-500/60 text-cyan-300 px-6 py-3 rounded-lg shadow-[0_0_20px_rgba(6,182,212,0.3)] text-center text-lg font-bold tracking-wider animate-pulse">
              {gameState.prompt}
            </div>
          )}

          {/* Custom Map No-Spawners Notice */}
          {engine?.activeMapConfig &&
            !engine.barriers.length && (
              <div className="absolute top-20 left-1/2 -translate-x-1/2 z-20 bg-amber-950/90 border border-amber-500/80 text-amber-300 px-5 py-2.5 rounded-xl shadow-[0_0_20px_rgba(245,158,11,0.4)] text-center text-sm font-bold tracking-wider">
                ⚠️ NO ZOMBIE SPAWNERS OR WINDOWS IN MAP — ADD ZOMBIE SPAWNERS IN MAP MAKER TO SPAWN ZOMBIES!
              </div>
            )}
        </>
      )}

      {/* HOME SCREEN / MAIN MENU */}
      {activeModal === 'main_menu' && !gameState.isPointerLocked && !gameState.isPaused && !gameState.isGameOver && (
        <div className="absolute inset-0 bg-slate-950/95 backdrop-blur-md z-50 flex flex-col items-center justify-center p-6 pointer-events-auto">
          <div className="max-w-4xl w-full flex flex-col md:flex-row gap-8 items-stretch">
            {/* Left Column - Vertical Navigation */}
            <div className="w-full md:w-80 flex flex-col gap-3.5 shrink-0 justify-center">
              <div className="mb-2">
                <h1 className="text-4xl sm:text-5xl font-extrabold text-red-600 tracking-wider drop-shadow-[0_0_20px_rgba(220,38,38,0.8)] leading-none">
                  POLY-OPS ZOMBIES
                </h1>
                <p className="text-slate-400 text-sm font-semibold tracking-widest mt-1">3D UNDEAD SURVIVAL</p>
              </div>

              <button
                onClick={handleStartGame}
                className="w-full flex items-center justify-center gap-3 bg-red-600 hover:bg-red-500 text-white font-extrabold text-xl py-4 rounded-xl shadow-[0_0_25px_rgba(220,38,38,0.5)] transition-all hover:scale-105 active:scale-95 cursor-pointer tracking-wider"
              >
                <Play className="w-6 h-6 fill-white" /> PLAY SURVIVAL
              </button>

              <button
                onClick={() => setActiveModal('map_maker')}
                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white font-bold py-3.5 rounded-xl shadow-[0_0_15px_rgba(217,119,6,0.4)] transition-all hover:scale-[1.02] active:scale-95 cursor-pointer text-base"
              >
                <Box className="w-5 h-5 text-amber-200" /> MAP MAKER / EDITOR
              </button>

              <button
                onClick={() => setActiveModal('map_select')}
                className="w-full flex items-center justify-between bg-slate-900 hover:bg-slate-800 text-slate-200 font-bold py-3.5 px-4 rounded-xl border border-slate-800 hover:border-slate-700 transition-all cursor-pointer text-base"
              >
                <span className="flex items-center gap-2">
                  <Crosshair className="w-5 h-5 text-cyan-400" /> MAP SELECT
                </span>
                <span className="text-[11px] bg-red-950 text-red-400 border border-red-800/60 px-2.5 py-0.5 rounded-md font-extrabold uppercase truncate max-w-[130px]">
                  {selectedMapConfig.name}
                </span>
              </button>

              <button
                disabled
                className="w-full flex items-center justify-between bg-slate-950/60 text-slate-500 font-semibold py-3.5 px-4 rounded-xl border border-slate-900 opacity-60 cursor-not-allowed text-sm"
              >
                <span className="flex items-center gap-2">
                  <Flame className="w-4 h-4 text-slate-600" /> WEAPONS & LOADOUT
                </span>
                <span className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded font-bold uppercase">
                  SOON
                </span>
              </button>

              <button
                onClick={() => setActiveModal('settings')}
                className="w-full flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-slate-200 font-bold py-3.5 rounded-xl border border-slate-800 hover:border-slate-700 transition-all cursor-pointer text-base"
              >
                <Sliders className="w-5 h-5 text-amber-400" /> SETTINGS
              </button>

              <button
                onClick={() => setActiveModal('how_to_play')}
                className="w-full flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-slate-200 font-bold py-3.5 rounded-xl border border-slate-800 hover:border-slate-700 transition-all cursor-pointer text-base"
              >
                <HelpCircle className="w-5 h-5 text-cyan-400" /> HOW TO PLAY
              </button>

              <button
                onClick={handleDownloadHTML}
                className="w-full flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-cyan-400 font-semibold py-3 rounded-xl border border-cyan-900/40 hover:border-cyan-500/50 transition-all cursor-pointer text-sm mt-2"
              >
                <Download className="w-4 h-4" /> EXPORT SINGLE-FILE HTML
              </button>
            </div>

            {/* Right Column - Map Showcase & Records */}
            <div className="flex-1 bg-slate-900/80 border border-slate-800 rounded-2xl p-6 sm:p-8 flex flex-col justify-between shadow-2xl relative overflow-hidden">
              <div className="space-y-4">
                <div className="inline-flex items-center gap-2 bg-red-950/60 border border-red-800/40 px-3 py-1 rounded-full text-xs font-bold text-red-400 uppercase">
                  <Crosshair className="w-3.5 h-3.5" /> {selectedMapConfig.id === 'default_der_abandoned' ? 'FEATURED OFFICIAL MAP' : 'SELECTED COMMUNITY MAP'}
                </div>
                <h3 className="text-3xl font-extrabold text-white tracking-wider uppercase">
                  {selectedMapConfig.name}
                </h3>
                <p className="text-slate-300 text-sm leading-relaxed">
                  {selectedMapConfig.id === 'default_der_abandoned'
                    ? 'Deep inside a forgotten Cold War weapons testing facility, waves of terrifying zombie shamblers breach wooden window barriers. Purchase wall guns, drink Power Brews, and unlock the Hyper-Forge to survive the night.'
                    : `Custom arena built in Map Maker Studio. Features ${selectedMapConfig.objects.length} 3D objects, ${
                        selectedMapConfig.objects.filter((o) => o.type === 'window_barrier').length
                      } Window Barriers, and ${
                        selectedMapConfig.objects.filter((o) => o.type === 'zombie_spawn').length
                      } Zombie Spawners.`}
                </p>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div className="bg-slate-950 border border-slate-800 p-3.5 rounded-xl">
                    <div className="text-[11px] font-bold text-slate-400 uppercase">MAX SURVIVAL RECORD</div>
                    <div className="text-2xl font-black text-red-500">ROUND {gameState.round}</div>
                  </div>
                  <div className="bg-slate-950 border border-slate-800 p-3.5 rounded-xl">
                    <div className="text-[11px] font-bold text-slate-400 uppercase">ZOMBIES ELIMINATED</div>
                    <div className="text-2xl font-black text-amber-400">{gameState.kills.toLocaleString()} KILLS</div>
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
                <span>V1.4 Procedural PBR Engine</span>
                <span className="text-emerald-400 font-semibold">Ready for Combat</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PAUSE SCREEN MODAL */}
      {gameState.isPaused && !gameState.isGameOver && activeModal === 'none' && (
        <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md z-50 flex flex-col items-center justify-center p-6 pointer-events-auto">
          <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center shadow-2xl">
            <h2 className="text-3xl font-bold text-white tracking-wider mb-6">GAME PAUSED</h2>

            <div className="flex flex-col gap-3">
              <button
                onClick={() => {
                  engine?.requestLock();
                }}
                className="w-full bg-red-600 hover:bg-red-500 text-white font-bold py-3.5 rounded-xl transition-all cursor-pointer text-lg"
              >
                RESUME GAME
              </button>

              <button
                onClick={() => setActiveModal('settings')}
                className="w-full flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold py-3.5 rounded-xl border border-slate-700 transition-all cursor-pointer"
              >
                <Sliders className="w-5 h-5 text-amber-400" /> SETTINGS
              </button>

              <button
                onClick={() => setActiveModal('how_to_play')}
                className="w-full flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold py-3.5 rounded-xl border border-slate-700 transition-all cursor-pointer"
              >
                <HelpCircle className="w-5 h-5 text-cyan-400" /> HOW TO PLAY
              </button>

              <button
                onClick={toggleMute}
                className="w-full flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold py-3 rounded-xl border border-slate-700 transition-all cursor-pointer"
              >
                {isMuted ? <VolumeX className="w-5 h-5 text-red-400" /> : <Volume2 className="w-5 h-5 text-emerald-400" />}
                {isMuted ? 'UNMUTE AUDIO' : 'MUTE AUDIO'}
              </button>

              {isTestingCustomMap && (
                <button
                  onClick={handleReturnToMapEditor}
                  className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white font-bold py-3.5 rounded-xl shadow-[0_0_15px_rgba(217,119,6,0.4)] transition-all cursor-pointer text-base"
                >
                  <Box className="w-5 h-5 text-amber-200" /> RETURN TO MAP EDITOR
                </button>
              )}

              <button
                onClick={handleReturnToMainMenu}
                className="w-full flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold py-3 rounded-xl border border-slate-700 transition-all cursor-pointer"
              >
                <Home className="w-5 h-5 text-red-400" /> MAIN MENU
              </button>

              <button
                onClick={handleDownloadHTML}
                className="w-full flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-cyan-300 font-semibold py-3 rounded-xl border border-cyan-500/30 transition-all cursor-pointer text-sm"
              >
                <Download className="w-4 h-4" /> EXPORT SINGLE-FILE HTML
              </button>
            </div>
          </div>
        </div>
      )}

      {/* GAME OVER SCREEN MODAL */}
      {gameState.isGameOver && activeModal === 'none' && (
        <div className="absolute inset-0 bg-slate-950/95 backdrop-blur-lg z-50 flex flex-col items-center justify-center p-6 pointer-events-auto">
          <div className="max-w-lg w-full bg-slate-900/90 border border-red-900 rounded-2xl p-8 text-center shadow-[0_0_60px_rgba(220,38,38,0.5)]">
            <h1 className="text-6xl font-extrabold text-red-600 tracking-wider mb-2 drop-shadow-[0_0_20px_rgba(220,38,38,0.9)]">
              YOU DIED
            </h1>
            <p className="text-slate-400 text-lg mb-8">The horde overwhelmed your position.</p>

            {/* Score & Stats Grid */}
            <div className="grid grid-cols-2 gap-4 bg-slate-950 border border-slate-800 p-5 rounded-xl mb-8">
              <div className="text-left">
                <div className="text-xs text-slate-400 font-bold uppercase">ROUNDS SURVIVED</div>
                <div className="text-3xl font-extrabold text-red-500">{gameState.round}</div>
              </div>
              <div className="text-left">
                <div className="text-xs text-slate-400 font-bold uppercase">TOTAL KILLS</div>
                <div className="text-3xl font-extrabold text-amber-400">{gameState.kills}</div>
              </div>
              <div className="text-left">
                <div className="text-xs text-slate-400 font-bold uppercase">HEADSHOTS</div>
                <div className="text-3xl font-extrabold text-emerald-400">{gameState.headshots}</div>
              </div>
              <div className="text-left">
                <div className="text-xs text-slate-400 font-bold uppercase">FINAL SCORE</div>
                <div className="text-3xl font-extrabold text-cyan-400">{gameState.score.toLocaleString()}</div>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <button
                onClick={handleStartGame}
                className="w-full flex items-center justify-center gap-2 bg-red-600 hover:bg-red-500 text-white font-bold text-xl py-4 rounded-xl shadow-lg transition-all hover:scale-105 active:scale-95 cursor-pointer"
              >
                <RotateCcw className="w-6 h-6" /> TRY AGAIN
              </button>

              <button
                onClick={handleReturnToMainMenu}
                className="w-full flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold py-3 rounded-xl border border-slate-700 transition-all cursor-pointer"
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
