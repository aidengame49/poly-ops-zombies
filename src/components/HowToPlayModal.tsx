import React from 'react';
import { HelpCircle, Shield, Zap, Target, Box, Flame, Crosshair, X } from 'lucide-react';

interface HowToPlayModalProps {
  onClose: () => void;
}

export const HowToPlayModal: React.FC<HowToPlayModalProps> = ({ onClose }) => {
  return (
    <div
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      className="fixed inset-0 bg-slate-950/90 backdrop-blur-md z-[100] flex items-center justify-center p-2 sm:p-4 pointer-events-auto select-none font-['Rajdhani',sans-serif]"
    >
      <div className="max-w-2xl w-full bg-slate-900/95 border border-red-900/70 rounded-2xl p-4 sm:p-7 shadow-[0_0_60px_rgba(220,38,38,0.3)] relative flex flex-col max-h-[94dvh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 sm:pb-4 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-red-600/20 border border-red-500/40 flex items-center justify-center text-red-500">
              <HelpCircle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-wider">FIELD MANUAL &amp; CONTROLS</h2>
              <p className="text-xs text-slate-400">Master computer, phone &amp; tablet controls, weapons &amp; perks</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="min-h-[40px] min-w-[40px] rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto my-3 sm:my-4 pr-1 sm:pr-2 space-y-6 flex-1 text-slate-300">
          {/* Controls Grid */}
          <div className="space-y-3">
            <div className="text-xs font-bold tracking-widest text-red-400 uppercase flex items-center gap-2">
              <Crosshair className="w-4 h-4" /> COMPUTER &amp; TOUCH CONTROLS
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 bg-slate-950 border border-slate-800 p-3.5 sm:p-4 rounded-xl text-sm">
              <div>
                <span className="text-red-400 font-bold">W A S D / LEFT STICK</span> - Move &amp; Sprint
              </div>
              <div>
                <span className="text-red-400 font-bold">MOUSE / RIGHT SWIPE</span> - Look &amp; Aim
              </div>
              <div>
                <span className="text-red-400 font-bold">LEFT CLICK / FIRE</span> - Fire Active Weapon
              </div>
              <div>
                <span className="text-red-400 font-bold">RIGHT CLICK / AIM</span> - Aim Down Sights (ADS)
              </div>
              <div>
                <span className="text-red-400 font-bold">SHIFT / FULL STICK</span> - Tactical Sprint
              </div>
              <div>
                <span className="text-red-400 font-bold">SPACE / JUMP</span> - Jump
              </div>
              <div>
                <span className="text-red-400 font-bold">R / RELOAD</span> - Reload Clip
              </div>
              <div>
                <span className="text-red-400 font-bold">1, 2, SCROLL / SWAP</span> - Switch Weapons
              </div>
              <div>
                <span className="text-red-400 font-bold">HOLD E / USE</span> - Repair Planks &amp; Revive Allies
              </div>
              <div>
                <span className="text-red-400 font-bold">PRESS E / USE</span> - Buy Weapons / Brews / Chest
              </div>
              <div>
                <span className="text-red-400 font-bold">T / LIGHT</span> - Toggle Tactical Flashlight
              </div>
              <div>
                <span className="text-red-400 font-bold">G / GRENADE</span> - Throw Loadout Grenade
              </div>
            </div>
          </div>

          {/* Power Brews Info */}
          <div className="space-y-3">
            <div className="text-xs font-bold tracking-widest text-emerald-400 uppercase flex items-center gap-2">
              <Zap className="w-4 h-4" /> POWER BREW VENDING MACHINES
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="bg-slate-950 border border-red-900/40 p-3 rounded-xl flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-red-600 flex items-center justify-center shrink-0">
                  <Shield className="w-5 h-5 text-white" />
                </div>
                <div>
                  <div className="text-xs font-bold text-red-400">TITAN TONIC</div>
                  <div className="text-[11px] text-slate-400">Boosts Max HP from 100 to 250 [2,500 Pts]</div>
                </div>
              </div>

              <div className="bg-slate-950 border border-emerald-900/40 p-3 rounded-xl flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-emerald-600 flex items-center justify-center shrink-0">
                  <Zap className="w-5 h-5 text-white" />
                </div>
                <div>
                  <div className="text-xs font-bold text-emerald-400">BLITZ BREW</div>
                  <div className="text-[11px] text-slate-400">Cuts reload time by 50% [3,000 Pts]</div>
                </div>
              </div>

              <div className="bg-slate-950 border border-amber-900/40 p-3 rounded-xl flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-amber-500 flex items-center justify-center shrink-0">
                  <Target className="w-5 h-5 text-white" />
                </div>
                <div>
                  <div className="text-xs font-bold text-amber-400">FURY FIZZ</div>
                  <div className="text-[11px] text-slate-400">+50% Fire Rate & Bonus Damage [2,000 Pts]</div>
                </div>
              </div>
            </div>
          </div>

          {/* Stations Info */}
          <div className="space-y-3">
            <div className="text-xs font-bold tracking-widest text-cyan-400 uppercase flex items-center gap-2">
              <Flame className="w-4 h-4" /> HYPER-FORGE & ARMORY CHEST
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="bg-slate-950 border border-cyan-900/40 p-3 rounded-xl flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-cyan-950 border border-cyan-500 flex items-center justify-center shrink-0 text-cyan-400 font-extrabold">
                  HF
                </div>
                <div>
                  <div className="font-bold text-cyan-300">HYPER-FORGE [5,000 PTS]</div>
                  <div className="text-slate-400">Doubles damage, clip capacity & reserve ammo with energy tracer rounds!</div>
                </div>
              </div>

              <div className="bg-slate-950 border border-amber-900/40 p-3 rounded-xl flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-amber-950 border border-amber-500 flex items-center justify-center shrink-0 text-amber-400">
                  <Box className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-bold text-amber-300">ARMORY CHEST [950 PTS]</div>
                  <div className="text-slate-400">Spin for powerful weaponry including the legendary Plasma Blaster!</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-slate-800 text-right">
          <button
            onClick={onClose}
            className="bg-red-600 hover:bg-red-500 text-white font-bold text-sm px-6 py-2.5 rounded-xl shadow-lg transition-all hover:scale-105 cursor-pointer"
          >
            GOT IT!
          </button>
        </div>
      </div>
    </div>
  );
};
