import React, { useEffect, useRef, useState } from 'react';
import { GameEngine } from './game/GameEngine';
import { HUDOverlay } from './components/HUDOverlay';

export default function App() {
  const mountRef = useRef<HTMLDivElement>(null);
  const [engine, setEngine] = useState<GameEngine | null>(null);

  useEffect(() => {
    if (!mountRef.current) return;

    const gameEngine = new GameEngine(mountRef.current);
    setEngine(gameEngine);

    return () => {
      gameEngine.dispose();
    };
  }, []);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-black select-none">
      {/* 3D Canvas Mount Container */}
      <div ref={mountRef} className="absolute inset-0 w-full h-full cursor-crosshair" />

      {/* React HUD Overlay */}
      <HUDOverlay engine={engine} />
    </div>
  );
}
