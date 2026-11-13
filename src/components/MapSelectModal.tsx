import React, { useState, useEffect } from 'react';
import { CustomMapConfig, getDefaultMapConfig } from '../types/game';
import { OFFICIAL_SECTOR_ZERO_ID, OFFICIAL_BLIGHTED_WOODS_ID, getBlightedWoodsConfig } from '../data/officialMaps';
import { Crosshair, Map, Trash2, Check, Plus, Box, Shield, Flame, Play, X, Trees } from 'lucide-react';

interface MapSelectModalProps {
  currentMapId?: string;
  onSelectMap: (config: CustomMapConfig) => void;
  onOpenMapMaker: () => void;
  onClose: () => void;
}

export const MapSelectModal: React.FC<MapSelectModalProps> = ({
  currentMapId,
  onSelectMap,
  onOpenMapMaker,
  onClose,
}) => {
  const [customMaps, setCustomMaps] = useState<CustomMapConfig[]>([]);
  const [selectedId, setSelectedId] = useState<string>(currentMapId || OFFICIAL_SECTOR_ZERO_ID);

  const defaultMap = getDefaultMapConfig();
  const blightedWoodsMap = getBlightedWoodsConfig();

  useEffect(() => {
    // Load custom maps list from localStorage
    try {
      const savedList = localStorage.getItem('custom_zombies_maps_list');
      if (savedList) {
        setCustomMaps(JSON.parse(savedList));
      } else {
        // Migration: check single custom map
        const singleMap = localStorage.getItem('custom_zombies_map');
        if (singleMap) {
          const parsed = JSON.parse(singleMap);
          if (parsed && parsed.id !== defaultMap.id && parsed.id !== blightedWoodsMap.id) {
            setCustomMaps([parsed]);
            localStorage.setItem('custom_zombies_maps_list', JSON.stringify([parsed]));
          }
        }
      }
    } catch (e) {
      console.error('Failed to load custom maps list:', e);
    }
  }, []);

  const handleDeleteCustomMap = (e: React.MouseEvent, mapId: string) => {
    e.stopPropagation();
    const updated = customMaps.filter((m) => m.id !== mapId);
    setCustomMaps(updated);
    localStorage.setItem('custom_zombies_maps_list', JSON.stringify(updated));
    if (selectedId === mapId) {
      setSelectedId(OFFICIAL_SECTOR_ZERO_ID);
    }
  };

  const allMaps = [defaultMap, blightedWoodsMap, ...customMaps];
  const activeSelectedMap = allMaps.find((m) => m.id === selectedId) || defaultMap;

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      className="absolute inset-0 bg-slate-950/95 backdrop-blur-lg z-50 flex items-center justify-center p-6 pointer-events-auto font-['Rajdhani',sans-serif]"
    >
      <div className="max-w-4xl w-full bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="bg-slate-950 px-6 py-4 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-600/20 border border-red-500/40 rounded-xl text-red-500">
              <Crosshair className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-2xl font-extrabold text-white tracking-wider leading-none">MAP SELECTION</h2>
              <p className="text-xs text-slate-400 font-semibold tracking-widest mt-0.5">CHOOSE YOUR SURVIVAL BATTLEGROUND</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-xl transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body: Grid of Maps */}
        <div className="p-6 flex-1 overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Official Map 1: Sector Zero */}
          <div
            onClick={() => {
              setSelectedId(defaultMap.id);
              onSelectMap(defaultMap);
            }}
            className={`p-5 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between relative overflow-hidden ${
              selectedId === defaultMap.id
                ? 'bg-gradient-to-br from-red-950/80 to-slate-900 border-red-600 shadow-[0_0_20px_rgba(220,38,38,0.4)] scale-[1.01]'
                : 'bg-slate-950/60 hover:bg-slate-900 border-slate-800'
            }`}
          >
            {selectedId === defaultMap.id && (
              <div className="absolute top-3 right-3 bg-red-600 text-white text-xs font-black px-2.5 py-1 rounded-full flex items-center gap-1">
                <Check className="w-3.5 h-3.5" /> SELECTED
              </div>
            )}

            <div>
              <div className="inline-flex items-center gap-1.5 bg-red-950 border border-red-800 px-2.5 py-0.5 rounded-full text-[10px] font-bold text-red-400 uppercase tracking-wider mb-2">
                OFFICIAL SURVIVAL MAP
              </div>
              <h3 className="text-2xl font-extrabold text-white tracking-wider mb-1">SECTOR ZERO</h3>
              <p className="text-slate-300 text-xs leading-relaxed mb-4">
                Cold War weapons testing facility featuring 4 Window Spawn Barriers, Power Brews, Wall Buys, and Hyper-Forge.
              </p>

              <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
                <span className="bg-slate-900 border border-slate-800 px-2 py-1 rounded text-cyan-300">
                  4 Windows
                </span>
                <span className="bg-slate-900 border border-slate-800 px-2 py-1 rounded text-amber-300">
                  3 Power Brews
                </span>
                <span className="bg-slate-900 border border-slate-800 px-2 py-1 rounded text-emerald-300">
                  Hyper-Forge
                </span>
              </div>
            </div>

            <div className="mt-6 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
              <span className="font-bold text-red-500">MAIN LEVEL 01</span>
              <span className="text-slate-500">Built-in</span>
            </div>
          </div>

          {/* Official Map 2: Blighted Woods */}
          <div
            onClick={() => {
              setSelectedId(blightedWoodsMap.id);
              onSelectMap(blightedWoodsMap);
            }}
            className={`p-5 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between relative overflow-hidden ${
              selectedId === OFFICIAL_BLIGHTED_WOODS_ID
                ? 'bg-gradient-to-br from-emerald-950/80 via-slate-900 to-orange-950/50 border-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.4)] scale-[1.01]'
                : 'bg-slate-950/60 hover:bg-slate-900 border-slate-800'
            }`}
          >
            {selectedId === OFFICIAL_BLIGHTED_WOODS_ID && (
              <div className="absolute top-3 right-3 bg-emerald-500 text-slate-950 text-xs font-black px-2.5 py-1 rounded-full flex items-center gap-1">
                <Check className="w-3.5 h-3.5" /> SELECTED
              </div>
            )}

            <div>
              <div className="inline-flex items-center gap-1.5 bg-emerald-950 border border-emerald-700 px-2.5 py-0.5 rounded-full text-[10px] font-bold text-emerald-400 uppercase tracking-wider mb-2">
                <Trees className="w-3 h-3" /> OFFICIAL SURVIVAL MAP
              </div>
              <h3 className="text-2xl font-extrabold text-white tracking-wider mb-1">BLIGHTED WOODS</h3>
              <p className="text-slate-300 text-xs leading-relaxed mb-4">
                Moonlit forest with towering pines &amp; boulders where zombies emerge from the treeline. Find the hidden Teleporter to reach the Magma Cavern and parkour over lava to unlock the Hyper-Forge.
              </p>

              <div className="flex flex-wrap items-center gap-1.5 text-xs font-semibold text-slate-400">
                <span className="bg-slate-900 border border-slate-800 px-2 py-1 rounded text-emerald-300">
                  Forest &amp; Rocks
                </span>
                <span className="bg-slate-900 border border-slate-800 px-2 py-1 rounded text-cyan-300">
                  Hidden Teleporter
                </span>
                <span className="bg-slate-900 border border-slate-800 px-2 py-1 rounded text-orange-300">
                  Lava Parkour
                </span>
              </div>
            </div>

            <div className="mt-6 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
              <span className="font-bold text-emerald-400">MAIN LEVEL 02</span>
              <span className="text-slate-500">Built-in</span>
            </div>
          </div>

          {/* Custom Saved Maps */}
          {customMaps.map((map) => {
            const isSelected = selectedId === map.id;
            return (
              <div
                key={map.id}
                onClick={() => {
                  setSelectedId(map.id);
                  onSelectMap(map);
                }}
                className={`p-5 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between relative overflow-hidden ${
                  isSelected
                    ? 'bg-gradient-to-br from-amber-950/80 to-slate-900 border-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.4)] scale-[1.01]'
                    : 'bg-slate-950/60 hover:bg-slate-900 border-slate-800'
                }`}
              >
                {isSelected && (
                  <div className="absolute top-3 right-3 bg-amber-500 text-slate-950 text-xs font-black px-2.5 py-1 rounded-full flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" /> SELECTED
                  </div>
                )}

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="inline-flex items-center gap-1 bg-amber-950 border border-amber-800 px-2.5 py-0.5 rounded-full text-[10px] font-bold text-amber-400 uppercase tracking-wider">
                      <Box className="w-3 h-3" /> CUSTOM COMMUNITY MAP
                    </span>

                    <button
                      onClick={(e) => handleDeleteCustomMap(e, map.id)}
                      className="p-1.5 hover:bg-red-950 text-slate-500 hover:text-red-400 rounded-lg transition-all"
                      title="Delete Custom Map"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <h3 className="text-2xl font-extrabold text-white tracking-wider mb-1 uppercase">
                    {map.name || 'Untitled Custom Map'}
                  </h3>
                  <p className="text-slate-300 text-xs leading-relaxed mb-4">
                    Created in Map Maker Studio. Contains {map.objects.length} 3D objects and custom lighting configuration.
                  </p>

                  <div className="flex flex-wrap gap-1.5 text-xs font-semibold">
                    <span className="bg-slate-900 border border-slate-800 px-2 py-1 rounded text-cyan-300">
                      {map.objects.filter((o) => o.type === 'block').length} Walls/Blocks
                    </span>
                    <span className="bg-slate-900 border border-slate-800 px-2 py-1 rounded text-amber-300">
                      {map.objects.filter((o) => o.type === 'window_barrier').length} Spawns
                    </span>
                  </div>
                </div>

                <div className="mt-6 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                  <span className="font-bold text-amber-400">Custom Built</span>
                  <span className="text-slate-500 font-mono">ID: {map.id.substring(0, 10)}</span>
                </div>
              </div>
            );
          })}

          {/* Create New Custom Map Tile */}
          <div
            onClick={() => {
              onClose();
              onOpenMapMaker();
            }}
            className="p-6 rounded-2xl border-2 border-dashed border-slate-800 hover:border-amber-500/60 bg-slate-950/30 hover:bg-slate-900/60 transition-all cursor-pointer flex flex-col items-center justify-center text-center group min-h-[180px]"
          >
            <div className="w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center mb-3 group-hover:scale-110 transition-all">
              <Plus className="w-6 h-6" />
            </div>
            <h4 className="text-lg font-extrabold text-white tracking-wider">CREATE NEW CUSTOM MAP</h4>
            <p className="text-xs text-slate-400 mt-1 max-w-xs">
              Open the Map Maker Studio to build and design your own custom zombie arena.
            </p>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="bg-slate-950 px-6 py-4 border-t border-slate-800 flex items-center justify-between shrink-0">
          <div className="text-xs font-semibold text-slate-400">
            SELECTED MAP: <span className="text-white font-extrabold uppercase">{activeSelectedMap.name}</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl text-sm transition-all cursor-pointer"
            >
              CANCEL
            </button>
            <button
              onClick={() => {
                onSelectMap(activeSelectedMap);
                onClose();
              }}
              className="px-6 py-2.5 bg-red-600 hover:bg-red-500 text-white font-extrabold rounded-xl text-base shadow-[0_0_15px_rgba(220,38,38,0.5)] transition-all hover:scale-105 active:scale-95 cursor-pointer flex items-center gap-2"
            >
              <Play className="w-5 h-5 fill-white" /> CONFIRM & PLAY MAP
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
