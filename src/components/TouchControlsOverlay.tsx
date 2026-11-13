import React, { useRef, useState } from 'react';
import { GameEngine } from '../game/GameEngine';
import type { DeviceMode } from '../utils/deviceMode';
import {
  ArrowUp,
  Bomb,
  Crosshair,
  Flashlight,
  Hand,
  Pause,
  Repeat,
  RotateCw,
} from 'lucide-react';

interface TouchControlsOverlayProps {
  engine: GameEngine;
  deviceMode: DeviceMode;
  isAiming: boolean;
  isFlashlightOn: boolean;
  grenadeCount: number;
  prompt: string;
  isDowned: boolean;
  canSwapWeapon: boolean;
}

export const TouchControlsOverlay: React.FC<TouchControlsOverlayProps> = ({
  engine,
  deviceMode,
  isAiming,
  isFlashlightOn,
  grenadeCount,
  prompt,
  isDowned,
  canSwapWeapon,
}) => {
  const isPhone = deviceMode === 'phone';

  // Left Thumbstick state
  const stickPointerId = useRef<number | null>(null);
  const stickCenter = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const [stickOffset, setStickOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isSprinting, setIsSprinting] = useState(false);

  // Right Look Zone state
  const lookPointerId = useRef<number | null>(null);
  const lookLastPos = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Fire button (tap/hold + drag-to-aim) state
  const firePointerId = useRef<number | null>(null);
  const fireLastPos = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const [fireActive, setFireActive] = useState(false);

  // Interact hold state
  const [interactActive, setInteractActive] = useState(false);

  const stickMaxRadius = isPhone ? 42 : 54;

  const updateStickFromEvent = (clientX: number, clientY: number) => {
    const dx = clientX - stickCenter.current.x;
    const dy = clientY - stickCenter.current.y;
    const dist = Math.hypot(dx, dy);
    const clampedDist = Math.min(dist, stickMaxRadius);
    const angle = Math.atan2(dy, dx);

    const ox = Math.cos(angle) * clampedDist;
    const oy = Math.sin(angle) * clampedDist;
    setStickOffset({ x: ox, y: oy });

    const normX = ox / stickMaxRadius;
    const normY = -oy / stickMaxRadius; // Up is positive forward
    const ratio = clampedDist / stickMaxRadius;
    const sprint = ratio > 0.82 && normY > 0.35;
    setIsSprinting(sprint);
    engine.setTouchMove(normX, normY, sprint);
  };

  const resetStick = () => {
    stickPointerId.current = null;
    setStickOffset({ x: 0, y: 0 });
    setIsSprinting(false);
    engine.setTouchMove(0, 0, false);
  };

  const handleStickDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    if (stickPointerId.current !== null) return;
    stickPointerId.current = e.pointerId;
    e.currentTarget.setPointerCapture(e.pointerId);
    const rect = e.currentTarget.getBoundingClientRect();
    stickCenter.current = {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
    };
    updateStickFromEvent(e.clientX, e.clientY);
  };

  const handleStickMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerId !== stickPointerId.current) return;
    e.stopPropagation();
    updateStickFromEvent(e.clientX, e.clientY);
  };

  const handleStickUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerId !== stickPointerId.current) return;
    e.stopPropagation();
    resetStick();
  };

  // Right-side swipe look area
  const handleLookDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (lookPointerId.current !== null) return;
    lookPointerId.current = e.pointerId;
    e.currentTarget.setPointerCapture(e.pointerId);
    lookLastPos.current = { x: e.clientX, y: e.clientY };
  };

  const handleLookMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerId !== lookPointerId.current) return;
    const dx = e.clientX - lookLastPos.current.x;
    const dy = e.clientY - lookLastPos.current.y;
    lookLastPos.current = { x: e.clientX, y: e.clientY };
    engine.addTouchLookDelta(dx, dy);
  };

  const handleLookUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerId !== lookPointerId.current) return;
    lookPointerId.current = null;
  };

  // Fire trigger (supports drag-while-firing for smooth target tracking)
  const handleFireDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    if (firePointerId.current !== null) return;
    firePointerId.current = e.pointerId;
    e.currentTarget.setPointerCapture(e.pointerId);
    fireLastPos.current = { x: e.clientX, y: e.clientY };
    setFireActive(true);
    engine.setTouchFiring(true);
  };

  const handleFireMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (e.pointerId !== firePointerId.current) return;
    e.stopPropagation();
    const dx = e.clientX - fireLastPos.current.x;
    const dy = e.clientY - fireLastPos.current.y;
    fireLastPos.current = { x: e.clientX, y: e.clientY };
    engine.addTouchLookDelta(dx * 0.85, dy * 0.85);
  };

  const handleFireUp = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (e.pointerId !== firePointerId.current) return;
    e.stopPropagation();
    firePointerId.current = null;
    setFireActive(false);
    engine.setTouchFiring(false);
  };

  const handleInteractDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    setInteractActive(true);
    engine.setTouchInteract(true);
  };

  const handleInteractUp = (e: React.PointerEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    setInteractActive(false);
    engine.setTouchInteract(false);
  };

  return (
    <div className="absolute inset-0 pointer-events-none select-none z-20 overflow-hidden">
      {/* Right-Half Camera Look Swipe Surface */}
      <div
        onPointerDown={handleLookDown}
        onPointerMove={handleLookMove}
        onPointerUp={handleLookUp}
        onPointerCancel={handleLookUp}
        className="absolute top-0 right-0 bottom-0 left-[38%] pointer-events-auto touch-surface z-10"
      />

      {/* Top-Center Utility Action Strip (Pause, Flashlight, Weapon Swap) */}
      <div
        className={`absolute left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 pointer-events-auto touch-surface ${
          isPhone ? 'top-2' : 'top-4'
        }`}
      >
        <button
          type="button"
          onPointerDown={(e) => {
            e.stopPropagation();
            engine.pauseGame();
          }}
          className="min-h-[44px] min-w-[44px] px-3 bg-slate-950/80 border border-slate-700/80 active:bg-slate-800 text-white rounded-xl flex items-center justify-center gap-1.5 text-xs font-extrabold backdrop-blur-md shadow-lg cursor-pointer"
          aria-label="Pause Game"
        >
          <Pause className="w-4 h-4 text-red-400" />
          {!isPhone && <span>PAUSE</span>}
        </button>

        <button
          type="button"
          onPointerDown={(e) => {
            e.stopPropagation();
            engine.toggleFlashlight();
          }}
          className={`min-h-[44px] min-w-[44px] px-3 border rounded-xl flex items-center justify-center gap-1.5 text-xs font-extrabold backdrop-blur-md shadow-lg cursor-pointer ${
            isFlashlightOn
              ? 'bg-cyan-950/85 border-cyan-400/70 text-cyan-300'
              : 'bg-slate-950/80 border-slate-700/80 text-slate-400'
          }`}
          aria-label="Toggle Flashlight"
        >
          <Flashlight className="w-4 h-4" />
          {!isPhone && <span>LIGHT</span>}
        </button>

        {canSwapWeapon && (
          <button
            type="button"
            onPointerDown={(e) => {
              e.stopPropagation();
              const nextIdx = (engine.currentWeaponIndex + 1) % Math.max(1, engine.playerWeapons.length);
              engine.switchWeapon(nextIdx);
            }}
            className="min-h-[44px] min-w-[44px] px-3 bg-slate-950/80 border border-amber-500/60 active:bg-amber-900/60 text-amber-300 rounded-xl flex items-center justify-center gap-1.5 text-xs font-extrabold backdrop-blur-md shadow-lg cursor-pointer"
            aria-label="Swap Weapon"
          >
            <Repeat className="w-4 h-4" />
            <span>SWAP</span>
          </button>
        )}
      </div>

      {/* Left Virtual Movement Thumbstick */}
      <div
        onPointerDown={handleStickDown}
        onPointerMove={handleStickMove}
        onPointerUp={handleStickUp}
        onPointerCancel={handleStickUp}
        className={`absolute pointer-events-auto touch-surface z-30 flex items-center justify-center rounded-full border-2 backdrop-blur-sm transition-colors ${
          isPhone ? 'left-4 bottom-4 w-28 h-28' : 'left-7 bottom-7 w-36 h-36'
        } ${
          isSprinting
            ? 'bg-amber-950/40 border-amber-400/80 shadow-[0_0_24px_rgba(245,158,11,0.35)]'
            : 'bg-slate-950/45 border-white/25'
        }`}
      >
        {/* Crosshair guide lines */}
        <div className="absolute inset-4 rounded-full border border-white/10 pointer-events-none" />
        {/* Movable Thumb Puck */}
        <div
          style={{
            transform: `translate3d(${stickOffset.x}px, ${stickOffset.y}px, 0)`,
          }}
          className={`rounded-full border-2 shadow-lg pointer-events-none ${
            isPhone ? 'w-12 h-12' : 'w-14 h-14'
          } ${
            isSprinting
              ? 'bg-amber-400/85 border-white'
              : 'bg-white/30 border-white/80'
          }`}
        />
        <div className="absolute -top-5 left-1/2 -translate-x-1/2 text-[10px] font-extrabold tracking-widest text-slate-300/80 pointer-events-none">
          {isSprinting ? 'SPRINT' : 'MOVE'}
        </div>
      </div>

      {/* Right-Side Combat Thumb Cluster */}
      <div
        className={`absolute z-30 pointer-events-auto touch-surface flex items-end gap-2.5 ${
          isPhone ? 'right-4 bottom-4' : 'right-7 bottom-7 gap-3.5'
        }`}
      >
        {/* Left column of combat buttons: Interact + Grenade + Reload */}
        <div className="flex flex-col items-end gap-2">
          {/* Contextual Interact / Repair / Buy / Revive Button */}
          <button
            type="button"
            onPointerDown={handleInteractDown}
            onPointerUp={handleInteractUp}
            onPointerCancel={handleInteractUp}
            className={`min-h-[46px] px-4 rounded-xl border-2 font-extrabold text-xs tracking-wider flex items-center gap-1.5 backdrop-blur-md shadow-lg transition-transform active:scale-95 cursor-pointer ${
              prompt
                ? interactActive
                  ? 'bg-cyan-400 text-slate-950 border-white scale-95'
                  : 'bg-cyan-600/90 text-white border-cyan-300 shadow-[0_0_20px_rgba(6,182,212,0.55)] animate-pulse'
                : 'bg-slate-950/60 text-slate-400 border-slate-700/70'
            }`}
          >
            <Hand className="w-4 h-4 shrink-0" />
            <span>{prompt ? 'USE / HOLD' : 'INTERACT'}</span>
          </button>

          <div className="flex items-center gap-2">
            {/* Grenade Button */}
            <button
              type="button"
              onPointerDown={(e) => {
                e.stopPropagation();
                engine.throwGrenade();
              }}
              disabled={isDowned || grenadeCount <= 0}
              className={`relative rounded-full border-2 flex flex-col items-center justify-center backdrop-blur-md shadow-lg active:scale-90 transition-transform cursor-pointer ${
                isPhone ? 'w-12 h-12' : 'w-14 h-14'
              } ${
                grenadeCount > 0 && !isDowned
                  ? 'bg-orange-950/80 border-orange-400/80 text-orange-300'
                  : 'bg-slate-950/55 border-slate-800 text-slate-600'
              }`}
              aria-label="Throw Grenade"
            >
              <Bomb className={isPhone ? 'w-4 h-4' : 'w-5 h-5'} />
              <span className="text-[10px] font-black leading-none mt-0.5">{grenadeCount}</span>
            </button>

            {/* Reload Button */}
            <button
              type="button"
              onPointerDown={(e) => {
                e.stopPropagation();
                engine.reloadCurrentWeapon();
              }}
              disabled={isDowned}
              className={`rounded-full border-2 bg-slate-950/80 border-amber-400/75 text-amber-300 active:bg-amber-500 active:text-slate-950 flex flex-col items-center justify-center backdrop-blur-md shadow-lg active:scale-90 transition-transform cursor-pointer ${
                isPhone ? 'w-12 h-12' : 'w-14 h-14'
              }`}
              aria-label="Reload Weapon"
            >
              <RotateCw className={isPhone ? 'w-4 h-4' : 'w-5 h-5'} />
              <span className="text-[9px] font-black leading-none mt-0.5">RELOAD</span>
            </button>
          </div>
        </div>

        {/* Right column: Jump + ADS + Primary FIRE Trigger */}
        <div className="flex flex-col items-center gap-2">
          <div className="flex items-center gap-2">
            {/* ADS Toggle */}
            <button
              type="button"
              onPointerDown={(e) => {
                e.stopPropagation();
                engine.setTouchAiming(!isAiming);
              }}
              disabled={isDowned}
              className={`rounded-full border-2 flex flex-col items-center justify-center backdrop-blur-md shadow-lg active:scale-90 transition-transform cursor-pointer ${
                isPhone ? 'w-12 h-12' : 'w-14 h-14'
              } ${
                isAiming
                  ? 'bg-amber-500 border-white text-slate-950 shadow-[0_0_18px_rgba(245,158,11,0.65)]'
                  : 'bg-slate-950/80 border-slate-600 text-slate-200'
              }`}
              aria-label="Aim Down Sights"
            >
              <Crosshair className={isPhone ? 'w-4 h-4' : 'w-5 h-5'} />
              <span className="text-[9px] font-black leading-none mt-0.5">AIM</span>
            </button>

            {/* Jump Button */}
            <button
              type="button"
              onPointerDown={(e) => {
                e.stopPropagation();
                engine.triggerTouchJump();
              }}
              disabled={isDowned}
              className={`rounded-full border-2 bg-slate-950/80 border-emerald-400/75 text-emerald-300 active:bg-emerald-500 active:text-slate-950 flex flex-col items-center justify-center backdrop-blur-md shadow-lg active:scale-90 transition-transform cursor-pointer ${
                isPhone ? 'w-12 h-12' : 'w-14 h-14'
              }`}
              aria-label="Jump"
            >
              <ArrowUp className={isPhone ? 'w-4 h-4' : 'w-5 h-5'} />
              <span className="text-[9px] font-black leading-none mt-0.5">JUMP</span>
            </button>
          </div>

          {/* Primary FIRE Button (hold + drag to aim) */}
          <button
            type="button"
            onPointerDown={handleFireDown}
            onPointerMove={handleFireMove}
            onPointerUp={handleFireUp}
            onPointerCancel={handleFireUp}
            disabled={isDowned}
            className={`rounded-full border-4 flex flex-col items-center justify-center font-black tracking-wider shadow-2xl transition-transform cursor-pointer touch-surface ${
              isPhone ? 'w-20 h-20 text-xs' : 'w-24 h-24 text-sm'
            } ${
              isDowned
                ? 'bg-slate-900/70 border-slate-700 text-slate-500'
                : fireActive
                ? 'bg-red-500 border-white text-white scale-95 shadow-[0_0_30px_rgba(239,68,68,0.9)]'
                : 'bg-red-600/85 border-red-300/90 text-white shadow-[0_0_22px_rgba(220,38,38,0.65)]'
            }`}
            aria-label="Fire Weapon"
          >
            <Crosshair className={isPhone ? 'w-6 h-6' : 'w-7 h-7'} />
            <span className="mt-0.5">FIRE</span>
          </button>
        </div>
      </div>
    </div>
  );
};
