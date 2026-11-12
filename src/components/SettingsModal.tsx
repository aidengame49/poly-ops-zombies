import React from 'react';
import { GameEngine } from '../game/GameEngine';
import { Sliders, Sun, Eye, Volume2, MousePointer, RotateCcw, X } from 'lucide-react';

interface SettingsModalProps {
  engine: GameEngine | null;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ engine, onClose }) => {
  if (!engine) return null;

  const { settings } = engine;

  const handleSensitivityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    engine.setSensitivity(parseFloat(e.target.value));
  };

  const handleBrightnessChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    engine.setWorldBrightness(parseFloat(e.target.value));
  };

  const handleExposureChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    engine.setExposure(parseFloat(e.target.value));
  };

  const handleFOVChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    engine.setFOV(parseInt(e.target.value, 10));
  };

  const handleFlashlightChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    engine.setFlashlightIntensity(parseFloat(e.target.value));
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    engine.setMasterVolume(parseInt(e.target.value, 10));
  };

  const handleInvertYToggle = () => {
    engine.setInvertY(!settings.invertY);
  };

  const handleResetDefaults = () => {
    engine.setSensitivity(0.0022);
    engine.setWorldBrightness(0.85);
    engine.setExposure(1.25);
    engine.setFOV(75);
    engine.setFlashlightIntensity(4.5);
    engine.setInvertY(false);
    engine.setMasterVolume(80);
  };

  return (
    <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md z-[100] flex items-center justify-center p-4 pointer-events-auto select-none font-['Rajdhani',sans-serif]">
      <div className="max-w-2xl w-full bg-slate-900/95 border border-red-900/70 rounded-2xl p-6 sm:p-8 shadow-[0_0_60px_rgba(220,38,38,0.3)] relative flex flex-col max-h-[90vh]">
        {/* Close Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-600/20 border border-red-500/40 flex items-center justify-center text-red-500">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-2xl font-extrabold text-white tracking-wider">GAME SETTINGS</h2>
              <p className="text-xs text-slate-400">Configure mouse, visual brightness, gamma & audio</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Settings Body */}
        <div className="overflow-y-auto my-4 pr-2 space-y-6 flex-1">
          {/* Section 1: Controls & Input */}
          <div className="space-y-4">
            <div className="text-xs font-bold tracking-widest text-red-400 uppercase flex items-center gap-2">
              <MousePointer className="w-4 h-4" /> CONTROLS & SENSITIVITY
            </div>

            {/* Mouse Sensitivity */}
            <div className="bg-slate-950/80 border border-slate-800 p-4 rounded-xl space-y-2">
              <div className="flex items-center justify-between text-sm font-semibold text-slate-200">
                <span>Mouse Look Sensitivity</span>
                <span className="text-red-400 font-bold font-mono">
                  {(settings.mouseSensitivity * 1000).toFixed(1)}
                </span>
              </div>
              <input
                type="range"
                min="0.0005"
                max="0.0060"
                step="0.0001"
                value={settings.mouseSensitivity}
                onChange={handleSensitivityChange}
                className="w-full accent-red-600 cursor-pointer h-2 bg-slate-800 rounded-lg"
              />
              <div className="flex justify-between text-[10px] text-slate-500">
                <span>Slow / Precise</span>
                <span>Default (2.2)</span>
                <span>Fast / Ultra</span>
              </div>
            </div>

            {/* Invert Y-Axis */}
            <div className="bg-slate-950/80 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold text-slate-200">Invert Vertical Y-Axis</div>
                <div className="text-xs text-slate-500">Invert vertical mouse look directions</div>
              </div>
              <button
                onClick={handleInvertYToggle}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer border ${
                  settings.invertY
                    ? 'bg-red-600/30 text-red-300 border-red-500/60'
                    : 'bg-slate-800 text-slate-400 border-slate-700'
                }`}
              >
                {settings.invertY ? 'INVERTED [ON]' : 'NORMAL [OFF]'}
              </button>
            </div>
          </div>

          {/* Section 2: Display & Lighting */}
          <div className="space-y-4">
            <div className="text-xs font-bold tracking-widest text-amber-400 uppercase flex items-center gap-2">
              <Sun className="w-4 h-4" /> ENVIRONMENT & LIGHTING
            </div>

            {/* World Brightness */}
            <div className="bg-slate-950/80 border border-slate-800 p-4 rounded-xl space-y-2">
              <div className="flex items-center justify-between text-sm font-semibold text-slate-200">
                <span>World Ambient Brightness</span>
                <span className="text-amber-400 font-bold font-mono">
                  {Math.round(settings.worldBrightness * 100)}%
                </span>
              </div>
              <input
                type="range"
                min="0.2"
                max="2.5"
                step="0.05"
                value={settings.worldBrightness}
                onChange={handleBrightnessChange}
                className="w-full accent-amber-500 cursor-pointer h-2 bg-slate-800 rounded-lg"
              />
              <div className="flex justify-between text-[10px] text-slate-500">
                <span>Dark / Horror</span>
                <span>Standard (85%)</span>
                <span>Bright / High Visible</span>
              </div>
            </div>

            {/* Gamma / Exposure */}
            <div className="bg-slate-950/80 border border-slate-800 p-4 rounded-xl space-y-2">
              <div className="flex items-center justify-between text-sm font-semibold text-slate-200">
                <span>Exposure & Gamma Correction</span>
                <span className="text-amber-400 font-bold font-mono">
                  {settings.exposure.toFixed(2)}x
                </span>
              </div>
              <input
                type="range"
                min="0.5"
                max="2.5"
                step="0.05"
                value={settings.exposure}
                onChange={handleExposureChange}
                className="w-full accent-amber-500 cursor-pointer h-2 bg-slate-800 rounded-lg"
              />
              <div className="flex justify-between text-[10px] text-slate-500">
                <span>Low Gamma (0.5x)</span>
                <span>Default Tone (1.25x)</span>
                <span>High Gamma (2.5x)</span>
              </div>
            </div>

            {/* Tactical Flashlight Intensity */}
            <div className="bg-slate-950/80 border border-slate-800 p-4 rounded-xl space-y-2">
              <div className="flex items-center justify-between text-sm font-semibold text-slate-200">
                <span>Player Tactical Flashlight Power</span>
                <span className="text-cyan-400 font-bold font-mono">
                  {settings.flashlightIntensity.toFixed(1)} Lumens
                </span>
              </div>
              <input
                type="range"
                min="1.0"
                max="10.0"
                step="0.5"
                value={settings.flashlightIntensity}
                onChange={handleFlashlightChange}
                className="w-full accent-cyan-500 cursor-pointer h-2 bg-slate-800 rounded-lg"
              />
            </div>

            {/* Field of View (FOV) */}
            <div className="bg-slate-950/80 border border-slate-800 p-4 rounded-xl space-y-2">
              <div className="flex items-center justify-between text-sm font-semibold text-slate-200">
                <span className="flex items-center gap-1.5">
                  <Eye className="w-4 h-4 text-emerald-400" /> Field of View (FOV)
                </span>
                <span className="text-emerald-400 font-bold font-mono">{settings.fov}°</span>
              </div>
              <input
                type="range"
                min="60"
                max="100"
                step="1"
                value={settings.fov}
                onChange={handleFOVChange}
                className="w-full accent-emerald-500 cursor-pointer h-2 bg-slate-800 rounded-lg"
              />
              <div className="flex justify-between text-[10px] text-slate-500">
                <span>Tight (60°)</span>
                <span>Default (75°)</span>
                <span>Ultra-Wide (100°)</span>
              </div>
            </div>
          </div>

          {/* Section 3: Audio */}
          <div className="space-y-4">
            <div className="text-xs font-bold tracking-widest text-emerald-400 uppercase flex items-center gap-2">
              <Volume2 className="w-4 h-4" /> AUDIO & SOUND EFFECTS
            </div>

            {/* Master Volume */}
            <div className="bg-slate-950/80 border border-slate-800 p-4 rounded-xl space-y-2">
              <div className="flex items-center justify-between text-sm font-semibold text-slate-200">
                <span>Master Game & SFX Volume</span>
                <span className="text-emerald-400 font-bold font-mono">
                  {settings.masterVolume}%
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={settings.masterVolume}
                onChange={handleVolumeChange}
                className="w-full accent-emerald-500 cursor-pointer h-2 bg-slate-800 rounded-lg"
              />
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="pt-4 border-t border-slate-800 flex items-center justify-between gap-4">
          <button
            onClick={handleResetDefaults}
            className="flex items-center gap-2 text-slate-400 hover:text-white text-xs font-semibold px-3 py-2 rounded-lg bg-slate-800/60 hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Restore Defaults
          </button>

          <button
            onClick={onClose}
            className="bg-red-600 hover:bg-red-500 text-white font-bold text-sm px-6 py-2.5 rounded-xl shadow-lg transition-all hover:scale-105 cursor-pointer"
          >
            APPLY & CLOSE
          </button>
        </div>
      </div>
    </div>
  );
};
