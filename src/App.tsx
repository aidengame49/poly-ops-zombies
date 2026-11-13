import React, { useEffect, useRef, useState } from 'react';
import { GameEngine } from './game/GameEngine';
import { HUDOverlay } from './components/HUDOverlay';
import { crazyGames } from './utils/crazyGames';
import { deviceManager } from './utils/deviceMode';

export default function App() {
  const mountRef = useRef<HTMLDivElement>(null);
  const [engine, setEngine] = useState<GameEngine | null>(null);
  const [sdkReady, setSdkReady] = useState<boolean>(false);

  useEffect(() => {
    deviceManager.init();
    let cancelled = false;
    crazyGames.init().finally(() => {
      if (!cancelled) {
        deviceManager.refreshFromStorage();
        setSdkReady(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!sdkReady || !mountRef.current) return;

    const gameEngine = new GameEngine(mountRef.current);
    const initialDevState = deviceManager.getState();
    gameEngine.setDeviceMode(initialDevState.effectiveMode);
    gameEngine.setOptimizationProfile(initialDevState.effectiveOptimization);
    setEngine(gameEngine);
    crazyGames.finishLoading();

    const unsubscribeCg = crazyGames.subscribe(() => {
      gameEngine.reloadPersistedState();
      deviceManager.refreshFromStorage();
    });

    const unsubscribeDevice = deviceManager.subscribe((devState) => {
      gameEngine.setDeviceMode(devState.effectiveMode);
      gameEngine.setOptimizationProfile(devState.effectiveOptimization);
    });

    return () => {
      unsubscribeCg();
      unsubscribeDevice();
      gameEngine.dispose();
    };
  }, [sdkReady]);

  if (!sdkReady) {
    return (
      <div className="fixed inset-0 w-full h-dvh overflow-hidden bg-slate-950 flex flex-col items-center justify-center text-white font-['Rajdhani',sans-serif] select-none px-4 text-center">
        <div className="text-3xl sm:text-4xl font-extrabold tracking-widest text-red-600 drop-shadow-[0_0_20px_rgba(220,38,38,0.8)]">
          POLY-OPS ZOMBIES
        </div>
        <div className="mt-3 text-xs font-bold tracking-[0.25em] text-slate-400 uppercase animate-pulse">
          INITIALIZING ENGINE &amp; CLOUD DATA...
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 w-full h-dvh overflow-hidden bg-black select-none touch-surface">
      {/* 3D Canvas Mount Container */}
      <div ref={mountRef} className="absolute inset-0 w-full h-full cursor-crosshair" />

      {/* React HUD Overlay */}
      <HUDOverlay engine={engine} />
    </div>
  );
}
