import React, { useEffect, useRef, useState } from 'react';
import { GameEngine } from './game/GameEngine';
import { HUDOverlay } from './components/HUDOverlay';
import { crazyGames } from './utils/crazyGames';

export default function App() {
  const mountRef = useRef<HTMLDivElement>(null);
  const [engine, setEngine] = useState<GameEngine | null>(null);
  const [sdkReady, setSdkReady] = useState<boolean>(false);

  useEffect(() => {
    let cancelled = false;
    crazyGames.init().finally(() => {
      if (!cancelled) {
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
    setEngine(gameEngine);
    crazyGames.finishLoading();

    const unsubscribe = crazyGames.subscribe(() => {
      gameEngine.reloadPersistedState();
    });

    return () => {
      unsubscribe();
      gameEngine.dispose();
    };
  }, [sdkReady]);

  if (!sdkReady) {
    return (
      <div className="relative w-screen h-screen overflow-hidden bg-slate-950 flex flex-col items-center justify-center text-white font-['Rajdhani',sans-serif] select-none">
        <div className="text-4xl font-extrabold tracking-widest text-red-600 drop-shadow-[0_0_20px_rgba(220,38,38,0.8)]">
          POLY-OPS ZOMBIES
        </div>
        <div className="mt-3 text-xs font-bold tracking-[0.3em] text-slate-400 uppercase animate-pulse">
          INITIALIZING ENGINE &amp; CLOUD DATA...
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-black select-none">
      {/* 3D Canvas Mount Container */}
      <div ref={mountRef} className="absolute inset-0 w-full h-full cursor-crosshair" />

      {/* React HUD Overlay */}
      <HUDOverlay engine={engine} />
    </div>
  );
}
