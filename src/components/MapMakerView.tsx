import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { CustomMapConfig, MapObject, MapObjectType, TexturePattern, getDefaultMapConfig } from '../types/game';
import { MapEditorEngine } from '../game/MapEditorEngine';
import {
  Play,
  RotateCcw,
  Plus,
  Trash2,
  Copy,
  Sun,
  Box,
  Shield,
  Zap,
  Target,
  Flame,
  HelpCircle,
  X,
  Layers,
  Sliders,
  Eye,
  Move,
  Maximize2,
  Save,
  Check,
  Share2,
  Download,
  Crosshair,
  Package,
  Sparkles,
  ShieldAlert,
  CircleDot
} from 'lucide-react';

interface MapMakerViewProps {
  onPlayMap: (config: CustomMapConfig) => void;
  onClose: () => void;
}

export const MapMakerView: React.FC<MapMakerViewProps> = ({ onPlayMap, onClose }) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const editorEngineRef = useRef<MapEditorEngine | null>(null);

  const [mapConfig, setMapConfig] = useState<CustomMapConfig>(() => {
    const saved = localStorage.getItem('custom_zombies_map');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.objects) return parsed;
      } catch (e) {}
    }
    const def = getDefaultMapConfig();
    def.id = `custom_map_${Date.now()}`;
    def.name = 'Custom Survival Outpost';
    return def;
  });

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [saveToast, setSaveToast] = useState(false);
  const [transformMode, setTransformMode] = useState<'translate' | 'rotate' | 'scale'>('translate');
  const [isDarknessPreview, setIsDarknessPreview] = useState(false);

  // Track Export & Import (PolyTrack-style single copyable Base64 string)
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportedCode, setExportedCode] = useState('');
  const [exportCopied, setExportCopied] = useState(false);

  const [showImportModal, setShowImportModal] = useState(false);
  const [importCodeInput, setImportCodeInput] = useState('');

  /**
   * Data Compression (Export):
   * Takes current map editor's placed objects/blocks array, converts into clean minified JSON
   * (essential properties like block type, x, y, z coordinates, and rotation), and encodes
   * into a Base64 text string using btoa().
   */
  const exportTrackCode = (): string => {
    if (editorEngineRef.current) {
      return editorEngineRef.current.exportTrackCode();
    }
    const minified = mapConfig.objects.map((obj) => ({
      t: obj.type,
      p: [Number(obj.position.x.toFixed(2)), Number(obj.position.y.toFixed(2)), Number(obj.position.z.toFixed(2))],
      r: [Number(obj.rotation.x.toFixed(2)), Number(obj.rotation.y.toFixed(2)), Number(obj.rotation.z.toFixed(2))],
      s: [Number(obj.scale.x.toFixed(2)), Number(obj.scale.y.toFixed(2)), Number(obj.scale.z.toFixed(2))],
      c: obj.color,
      tp: obj.texturePattern,
      n: obj.name,
      i: obj.intensity,
      d: obj.distance,
    }));
    const data = {
      name: mapConfig.name || 'Custom Track',
      ambientColor: mapConfig.ambientColor,
      floorSize: mapConfig.floorSize,
      blocks: minified,
    };
    return btoa(unescape(encodeURIComponent(JSON.stringify(data))));
  };

  /**
   * Data Loading (Import):
   * Decodes Base64 string using atob(), parses JSON safely inside a try/catch block
   * (alerting user if invalid or corrupted), clears the current track, and spawns
   * all blocks into the game world.
   */
  const importTrackCode = (codeString: string): boolean => {
    try {
      const trimmed = (codeString || '').trim();
      if (!trimmed) {
        alert('Please paste a track code to import.');
        return false;
      }
      let decodedJson = '';
      try {
        decodedJson = decodeURIComponent(escape(atob(trimmed)));
      } catch {
        decodedJson = atob(trimmed);
      }
      const parsed = JSON.parse(decodedJson);
      const rawBlocks = Array.isArray(parsed) ? parsed : (parsed.blocks || parsed.objects || []);
      if (!Array.isArray(rawBlocks)) {
        throw new Error('Invalid track format: no blocks found in code.');
      }

      if (editorEngineRef.current) {
        const ok = editorEngineRef.current.importTrackCode(trimmed);
        if (ok) {
          setMapConfig({ ...editorEngineRef.current.mapConfig });
          localStorage.setItem('custom_zombies_map', JSON.stringify(editorEngineRef.current.mapConfig));
          return true;
        }
        return false;
      }

      const importedObjects: MapObject[] = rawBlocks.map((item: any, idx: number) => {
        const type: MapObjectType = item.t || item.type || 'block';
        const pos = Array.isArray(item.p)
          ? { x: Number(item.p[0]) || 0, y: Number(item.p[1]) || 0, z: Number(item.p[2]) || 0 }
          : { x: Number(item.position?.x) || 0, y: Number(item.position?.y) || 0, z: Number(item.position?.z) || 0 };
        const rot = Array.isArray(item.r)
          ? { x: Number(item.r[0]) || 0, y: Number(item.r[1]) || 0, z: Number(item.r[2]) || 0 }
          : { x: Number(item.rotation?.x) || 0, y: Number(item.rotation?.y) || 0, z: Number(item.rotation?.z) || 0 };
        const scale = Array.isArray(item.s)
          ? { x: Number(item.s[0]) || 1, y: Number(item.s[1]) || 1, z: Number(item.s[2]) || 1 }
          : { x: Number(item.scale?.x) || 1, y: Number(item.scale?.y) || 1, z: Number(item.scale?.z) || 1 };

        return {
          id: `obj_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 7)}`,
          name: item.n || item.name || `${type.replace('_', ' ')} ${idx + 1}`,
          type,
          position: pos,
          rotation: rot,
          scale,
          color: item.c || item.color || '#222a36',
          texturePattern: item.tp || item.texturePattern || 'plain',
          intensity: item.i ?? item.intensity ?? 3.0,
          distance: item.d ?? item.distance ?? 20,
        };
      });

      const updatedCfg: CustomMapConfig = {
        ...mapConfig,
        name: parsed.name || mapConfig.name || 'Imported Custom Track',
        ambientColor: parsed.ambientColor || mapConfig.ambientColor,
        floorSize: parsed.floorSize || mapConfig.floorSize,
        objects: importedObjects,
      };

      setMapConfig(updatedCfg);
      localStorage.setItem('custom_zombies_map', JSON.stringify(updatedCfg));
      return true;
    } catch (err: any) {
      alert('Invalid or corrupted track code: ' + (err?.message || 'Could not parse data'));
      return false;
    }
  };

  const handleOpenExport = () => {
    const code = exportTrackCode();
    setExportedCode(code);
    setShowExportModal(true);
    setExportCopied(false);
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(code).then(() => {
        setExportCopied(true);
        setTimeout(() => setExportCopied(false), 2500);
      }).catch(() => {});
    }
  };

  const handleOpenImport = () => {
    setImportCodeInput('');
    setShowImportModal(true);
  };

  const handleExecuteImport = (andPlay: boolean = false) => {
    const success = importTrackCode(importCodeInput);
    if (success) {
      setShowImportModal(false);
      setSaveToast(true);
      setTimeout(() => setSaveToast(false), 2000);
      if (andPlay && editorEngineRef.current) {
        onPlayMap(editorEngineRef.current.mapConfig);
      }
    }
  };

  useEffect(() => {
    if (!mountRef.current) return;

    const engine = new MapEditorEngine(mountRef.current, mapConfig);
    editorEngineRef.current = engine;

    engine.onSelectObject = (id) => setSelectedId(id);
    engine.onConfigChange = (newConfig) => {
      setMapConfig({ ...newConfig });
      localStorage.setItem('custom_zombies_map', JSON.stringify(newConfig));
    };

    return () => {
      engine.destroy();
      editorEngineRef.current = null;
    };
  }, []);

  const handleSetTransformMode = (mode: 'translate' | 'rotate' | 'scale') => {
    setTransformMode(mode);
    if (editorEngineRef.current) {
      editorEngineRef.current.setTransformMode(mode);
    }
  };

  const handleToggleDarknessPreview = () => {
    const next = !isDarknessPreview;
    setIsDarknessPreview(next);
    editorEngineRef.current?.setDarknessPreview(next);
  };

  const selectedObject = mapConfig.objects.find((o) => o.id === selectedId) || null;

  const handleUpdateSelected = (updatedFields: Partial<MapObject>) => {
    if (!selectedObject || !editorEngineRef.current) return;
    const updated: MapObject = { ...selectedObject, ...updatedFields };
    editorEngineRef.current.updateObject(updated);
  };

  const handleStretchFace = (axis: 'x' | 'y' | 'z', direction: -1 | 1, delta: number) => {
    if (!selectedObject || !editorEngineRef.current) return;

    const currentScale = selectedObject.scale[axis];
    const newScale = Math.max(0.1, currentScale + delta);
    const actualDelta = newScale - currentScale;

    // Shift in local space along rotation quaternion
    const localVec = new THREE.Vector3(
      axis === 'x' ? (direction * actualDelta) / 2 : 0,
      axis === 'y' ? (direction * actualDelta) / 2 : 0,
      axis === 'z' ? (direction * actualDelta) / 2 : 0
    );

    const rot = new THREE.Euler(
      selectedObject.rotation.x,
      selectedObject.rotation.y,
      selectedObject.rotation.z
    );
    localVec.applyEuler(rot);

    const newPos = {
      x: Number((selectedObject.position.x + localVec.x).toFixed(2)),
      y: Number((selectedObject.position.y + localVec.y).toFixed(2)),
      z: Number((selectedObject.position.z + localVec.z).toFixed(2)),
    };

    const newScaleObj = {
      ...selectedObject.scale,
      [axis]: Number(newScale.toFixed(2)),
    };

    handleUpdateSelected({
      position: newPos,
      scale: newScaleObj,
    });
  };

  const handleDuplicateSelected = () => {
    if (selectedId && editorEngineRef.current) {
      editorEngineRef.current.duplicateObject(selectedId);
    }
  };

  const handleDeleteSelected = () => {
    if (selectedId && editorEngineRef.current) {
      editorEngineRef.current.removeObject(selectedId);
    }
  };

  const handleSaveMap = (): CustomMapConfig => {
    const latestConfig = editorEngineRef.current ? JSON.parse(JSON.stringify(editorEngineRef.current.mapConfig)) : mapConfig;
    try {
      localStorage.setItem('custom_zombies_map', JSON.stringify(latestConfig));

      const existingList = localStorage.getItem('custom_zombies_maps_list');
      let mapsList: CustomMapConfig[] = existingList ? JSON.parse(existingList) : [];

      const idx = mapsList.findIndex((m) => m.id === latestConfig.id);
      if (idx !== -1) {
        mapsList[idx] = latestConfig;
      } else {
        mapsList.push(latestConfig);
      }

      localStorage.setItem('custom_zombies_maps_list', JSON.stringify(mapsList));
      setSaveToast(true);
      setTimeout(() => setSaveToast(false), 2000);
    } catch (e) {
      console.error('Failed to save custom map:', e);
    }
    return latestConfig;
  };

  const handleCreateNewMap = () => {
    const newId = `custom_map_${Date.now()}`;
    const newCfg: CustomMapConfig = {
      id: newId,
      name: `Custom Map ${Math.floor(Math.random() * 90 + 10)}`,
      floorSize: { width: 24, depth: 24 },
      ambientColor: '#3d4b64',
      objects: [
        { id: 'floor_base', name: 'Ground Floor', type: 'block', position: { x: 0, y: -0.25, z: 0 }, rotation: { x: 0, y: 0, z: 0 }, scale: { x: 24, y: 0.5, z: 24 }, color: '#1c222e', texturePattern: 'concrete', intensity: 1, distance: 10 },
        { id: 'spawn_main', name: 'Player Spawn', type: 'player_spawn', position: { x: 0, y: 1.6, z: 0 }, rotation: { x: 0, y: 0, z: 0 }, scale: { x: 1, y: 1, z: 1 }, color: '#10b981', texturePattern: 'plain', intensity: 1, distance: 10 },
        { id: 'zspawn_1', name: 'Zombie Spawn 1', type: 'zombie_spawn', position: { x: -8, y: 0.2, z: -8 }, rotation: { x: 0, y: 0, z: 0 }, scale: { x: 1, y: 1, z: 1 }, color: '#ef4444', texturePattern: 'plain', intensity: 1, distance: 10 },
        { id: 'b_south', name: 'South Barrier', type: 'window_barrier', position: { x: 0, y: 1.4, z: 11.7 }, rotation: { x: 0, y: 0, z: 0 }, scale: { x: 1, y: 1, z: 1 }, color: '#5c3a1e', texturePattern: 'wood', intensity: 1, distance: 10 },
      ],
    };

    setMapConfig(newCfg);
    localStorage.setItem('custom_zombies_map', JSON.stringify(newCfg));
    if (editorEngineRef.current) {
      editorEngineRef.current.mapConfig = newCfg;
      editorEngineRef.current.rebuildScene();
    }
  };

  const handleAddObject = (type: MapObjectType) => {
    if (!editorEngineRef.current) return;

    const count = mapConfig.objects.filter((o) => o.type === type).length + 1;
    let name = `New ${type.replace('_', ' ')}`;
    let color = '#38bdf8';
    let scale = { x: 2, y: 2, z: 2 };
    let texturePattern: TexturePattern = 'plain';

    if (type === 'block') {
      name = `Custom Block ${count}`;
      color = '#222a36';
      scale = { x: 4, y: 4, z: 0.6 }; // Default wall shape
      texturePattern = 'brick';
    } else if (type === 'light') {
      name = `Light Source ${count}`;
      color = '#ffaa22';
      scale = { x: 1, y: 1, z: 1 };
    } else if (type === 'perk_juggernog') {
      name = 'Titan Tonic Machine';
      color = '#dd1111';
      scale = { x: 1, y: 1, z: 1 };
    } else if (type === 'perk_speedcola') {
      name = 'Blitz Brew Machine';
      color = '#11dd44';
      scale = { x: 1, y: 1, z: 1 };
    } else if (type === 'perk_doubletap') {
      name = 'Fury Fizz Machine';
      color = '#eedd11';
      scale = { x: 1, y: 1, z: 1 };
    } else if (type === 'pack_a_punch') {
      name = 'Hyper-Forge Station';
      color = '#00ffff';
      scale = { x: 1, y: 1, z: 1 };
    } else if (type === 'mystery_box') {
      name = 'Armory Chest';
      color = '#ffaa22';
      scale = { x: 1, y: 1, z: 1 };
    } else if (type === 'window_barrier') {
      name = `Window Barrier ${count}`;
      color = '#5c3a1e';
      scale = { x: 1, y: 1, z: 1 };
    } else if (type === 'wall_buy_smg') {
      name = `MP40 Wall Buy ${count}`;
      color = '#38bdf8';
      scale = { x: 1, y: 1, z: 1 };
    } else if (type === 'wall_buy_ar') {
      name = `VX-44 Wall Buy ${count}`;
      color = '#ffaa22';
      scale = { x: 1, y: 1, z: 1 };
    } else if (type === 'wall_buy_shotgun') {
      name = `SG-26 Wall Buy ${count}`;
      color = '#ef4444';
      scale = { x: 1, y: 1, z: 1 };
    } else if (type === 'wall_buy_sniper') {
      name = `SR-50 Sniper Wall Buy ${count}`;
      color = '#38bdf8';
      scale = { x: 1, y: 1, z: 1 };
    } else if (type === 'wall_buy_lmg') {
      name = `MG42 LMG Wall Buy ${count}`;
      color = '#f59e0b';
      scale = { x: 1, y: 1, z: 1 };
    } else if (type === 'wall_buy_raygun') {
      name = `Plasma Blaster Wall Buy ${count}`;
      color = '#22ff66';
      scale = { x: 1, y: 1, z: 1 };
    } else if (type === 'ammo_crate') {
      name = `Ammo Resupply Crate ${count}`;
      color = '#eab308';
      scale = { x: 1, y: 1, z: 1 };
    } else if (type === 'explosive_barrel') {
      name = `Explosive Barrel ${count}`;
      color = '#dc2626';
      scale = { x: 1, y: 1, z: 1 };
    } else if (type === 'teleporter') {
      name = `Warp Teleporter ${count}`;
      color = '#00f0ff';
      scale = { x: 1, y: 1, z: 1 };
    } else if (type === 'crate_cover') {
      name = `Supply Crate ${count}`;
      color = '#8b5a2b';
      scale = { x: 1, y: 1, z: 1 };
    } else if (type === 'sandbag_wall') {
      name = `Sandbag Barricade ${count}`;
      color = '#a89060';
      scale = { x: 1, y: 1, z: 1 };
    } else if (type === 'pillar') {
      name = `Concrete Pillar ${count}`;
      color = '#475569';
      scale = { x: 1, y: 1, z: 1 };
    } else if (type === 'zombie_spawn') {
      name = `Zombie Spawn Marker ${count}`;
      color = '#ef4444';
      scale = { x: 1, y: 1, z: 1 };
    } else if (type === 'player_spawn') {
      name = `Player Spawn Location`;
      color = '#10b981';
      scale = { x: 1, y: 1, z: 1 };
    }

    const defaultY = type === 'block' ? 2 : type === 'light' ? 3.0 : type.startsWith('wall_buy_') ? 1.8 : 0;

    const newObj: MapObject = {
      id: 'obj_' + Math.random().toString(36).substring(2, 9),
      name,
      type,
      position: { x: 0, y: defaultY, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      scale,
      color,
      texturePattern,
      intensity: 3.0,
      distance: 20,
    };

    editorEngineRef.current.addObject(newObj);
  };

  const handleResetDefault = () => {
    const defaultCfg = getDefaultMapConfig();
    defaultCfg.id = `custom_map_${Date.now()}`;
    defaultCfg.name = 'Custom Facility Draft';
    setMapConfig(defaultCfg);
    localStorage.setItem('custom_zombies_map', JSON.stringify(defaultCfg));
    if (editorEngineRef.current) {
      editorEngineRef.current.mapConfig = defaultCfg;
      editorEngineRef.current.rebuildScene();
    }
  };

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      className="absolute inset-0 bg-slate-950 text-white font-['Rajdhani',sans-serif] flex flex-col z-50 select-none overflow-hidden pointer-events-auto"
    >
      {/* Unity-like Top Navigation Bar */}
      <header className="h-14 bg-slate-900 border-b border-slate-800 px-6 flex items-center justify-between shrink-0 z-10 gap-4">
        <div className="flex items-center gap-3 shrink-0">
          <div className="bg-red-600/20 border border-red-500/40 p-1.5 rounded-lg">
            <Layers className="w-5 h-5 text-red-500" />
          </div>
          <div>
            <h1 className="text-lg font-extrabold tracking-wider text-white leading-none">MAP MAKER STUDIO</h1>
            <p className="text-[11px] text-slate-400 font-semibold tracking-widest mt-0.5">3D LEVEL EDITOR</p>
          </div>
        </div>

        {/* 3D Transform Gizmo Mode Switcher */}
        <div className="flex items-center bg-slate-950 border border-slate-800 rounded-lg p-1 gap-1">
          <button
            onClick={() => handleSetTransformMode('translate')}
            className={`px-3 py-1 rounded text-xs font-bold transition-all flex items-center gap-1.5 ${
              transformMode === 'translate'
                ? 'bg-cyan-600 text-white shadow-[0_0_8px_rgba(6,182,212,0.4)]'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Move className="w-3.5 h-3.5" /> MOVE
          </button>
          <button
            onClick={() => handleSetTransformMode('rotate')}
            className={`px-3 py-1 rounded text-xs font-bold transition-all flex items-center gap-1.5 ${
              transformMode === 'rotate'
                ? 'bg-amber-600 text-white shadow-[0_0_8px_rgba(245,158,11,0.4)]'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <RotateCcw className="w-3.5 h-3.5" /> ROTATE
          </button>
          <button
            onClick={() => handleSetTransformMode('scale')}
            className={`px-3 py-1 rounded text-xs font-bold transition-all flex items-center gap-1.5 ${
              transformMode === 'scale'
                ? 'bg-emerald-600 text-white shadow-[0_0_8px_rgba(16,185,129,0.4)]'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Maximize2 className="w-3.5 h-3.5" /> RESIZE
          </button>
        </div>

        {/* Darkness / In-Game Lighting Preview Toggle */}
        <button
          onClick={handleToggleDarknessPreview}
          className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all flex items-center gap-1.5 border cursor-pointer shrink-0 ${
            isDarknessPreview
              ? 'bg-amber-500/20 text-amber-300 border-amber-500/60 shadow-[0_0_10px_rgba(245,158,11,0.3)]'
              : 'bg-slate-950 text-slate-300 border-slate-800 hover:bg-slate-800'
          }`}
          title="Preview exact in-game custom map darkness and Light Block pools"
        >
          <Sun className="w-3.5 h-3.5" />
          {isDarknessPreview ? 'DARKNESS PREVIEW: ON' : 'DARKNESS PREVIEW'}
        </button>

        {/* Map Name Input in Top Header */}
        <div className="flex-1 max-w-xs flex items-center bg-slate-950 border border-slate-800 rounded-lg px-3 py-1">
          <span className="text-[10px] font-extrabold text-amber-400 mr-2 uppercase tracking-wider shrink-0">MAP NAME:</span>
          <input
            type="text"
            value={mapConfig.name}
            onChange={(e) => {
              const name = e.target.value;
              const updated = { ...mapConfig, name };
              setMapConfig(updated);
              if (editorEngineRef.current) {
                editorEngineRef.current.mapConfig = updated;
              }
            }}
            className="w-full bg-transparent text-sm font-bold text-white outline-none border-none"
            placeholder="Enter Map Title..."
          />
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Toast Notification */}
          {saveToast && (
            <div className="flex items-center gap-1 text-xs font-extrabold text-emerald-400 bg-emerald-950 border border-emerald-800 px-3 py-1.5 rounded-lg animate-fade-in">
              <Check className="w-4 h-4" /> SAVED TO MAP LIST!
            </div>
          )}

          {/* Export Track Code Button */}
          <button
            onClick={handleOpenExport}
            className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold px-3 py-2 rounded-lg transition-all shadow-[0_0_12px_rgba(99,102,241,0.4)] cursor-pointer text-xs tracking-wider"
            title="Export track into a single copyable Base64 string"
          >
            <Share2 className="w-3.5 h-3.5" /> EXPORT CODE
          </button>

          {/* Import Track Code Button */}
          <button
            onClick={handleOpenImport}
            className="flex items-center gap-1.5 bg-violet-700 hover:bg-violet-600 text-white font-extrabold px-3 py-2 rounded-lg transition-all shadow-[0_0_12px_rgba(139,92,246,0.4)] cursor-pointer text-xs tracking-wider"
            title="Import track from a copyable Base64 string"
          >
            <Download className="w-3.5 h-3.5" /> IMPORT CODE
          </button>

          <button
            onClick={handleSaveMap}
            className="flex items-center gap-1.5 bg-amber-600 hover:bg-amber-500 text-white font-extrabold px-3 py-2 rounded-lg transition-all shadow-[0_0_12px_rgba(217,119,6,0.4)] cursor-pointer text-xs tracking-wider"
            title="Save Map to Custom Maps Collection"
          >
            <Save className="w-3.5 h-3.5" /> SAVE MAP
          </button>

          <button
            onClick={handleCreateNewMap}
            className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-cyan-300 font-bold px-3 py-2 rounded-lg border border-cyan-500/30 text-xs transition-all cursor-pointer"
            title="Create a New Blank Map Draft"
          >
            <Plus className="w-3.5 h-3.5" /> NEW MAP
          </button>

          <button
            onClick={() => {
              const latestConfig = handleSaveMap();
              onPlayMap(latestConfig);
            }}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold px-3.5 py-2 rounded-lg transition-all shadow-[0_0_15px_rgba(16,185,129,0.4)] cursor-pointer text-xs tracking-wider"
          >
            <Play className="w-4 h-4 fill-white" /> TEST & PLAY LEVEL
          </button>

          <button
            onClick={handleResetDefault}
            className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold px-2.5 py-2 rounded-lg border border-slate-700 text-xs transition-all cursor-pointer"
            title="Reset Map to Sector Zero Default Facility"
          >
            <RotateCcw className="w-3.5 h-3.5" /> RESET
          </button>

          <button
            onClick={onClose}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-lg border border-slate-700 transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Main Unity-Style 3-Pane Body Layout */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* LEFT PANEL: Scene Hierarchy & Add Objects */}
        <aside className="w-72 bg-slate-900/95 border-r border-slate-800 flex flex-col shrink-0 z-10 backdrop-blur-md">
          {/* Add Bar */}
          <div className="p-3.5 border-b border-slate-800 space-y-2.5 max-h-[54%] overflow-y-auto shrink-0">
            <div className="text-xs font-bold tracking-widest text-slate-400 uppercase flex items-center justify-between">
              <span>ADD TO WORLD</span>
              <Plus className="w-4 h-4 text-emerald-400" />
            </div>

            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">ARCHITECTURE & PROPS</div>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                onClick={() => handleAddObject('block')}
                className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 p-2 rounded-lg text-[11px] font-bold text-cyan-300 transition-all cursor-pointer"
                title="Add a stretchable 3D wall or floor block"
              >
                <Box className="w-3.5 h-3.5 text-cyan-400 shrink-0" /> + BLOCK
              </button>

              <button
                onClick={() => handleAddObject('light')}
                className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 p-2 rounded-lg text-[11px] font-bold text-amber-300 transition-all cursor-pointer"
                title="Add custom light block"
              >
                <Sun className="w-3.5 h-3.5 text-amber-400 shrink-0" /> + LIGHT
              </button>

              <button
                onClick={() => handleAddObject('crate_cover')}
                className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 p-2 rounded-lg text-[11px] font-bold text-amber-200 transition-all cursor-pointer"
                title="Add solid wooden military crate cover"
              >
                <Package className="w-3.5 h-3.5 text-amber-400 shrink-0" /> + CRATE
              </button>

              <button
                onClick={() => handleAddObject('sandbag_wall')}
                className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 p-2 rounded-lg text-[11px] font-bold text-stone-300 transition-all cursor-pointer"
                title="Add low sandbag barricade cover"
              >
                <ShieldAlert className="w-3.5 h-3.5 text-amber-300 shrink-0" /> + SANDBAGS
              </button>

              <button
                onClick={() => handleAddObject('pillar')}
                className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 p-2 rounded-lg text-[11px] font-bold text-slate-300 transition-all cursor-pointer"
                title="Add concrete structural pillar"
              >
                <Layers className="w-3.5 h-3.5 text-slate-400 shrink-0" /> + PILLAR
              </button>

              <button
                onClick={() => handleAddObject('explosive_barrel')}
                className="flex items-center gap-1.5 bg-red-950/70 hover:bg-red-900 border border-red-700/60 p-2 rounded-lg text-[11px] font-bold text-red-300 transition-all cursor-pointer"
                title="Shootable red barrel that explodes and damages nearby zombies"
              >
                <Flame className="w-3.5 h-3.5 text-orange-400 shrink-0" /> + BARREL
              </button>
            </div>

            <div className="text-[10px] font-bold text-sky-400 pt-1 uppercase tracking-wider">WALL GUNS (BUYABLE)</div>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                onClick={() => handleAddObject('wall_buy_smg')}
                className="flex items-center gap-1.5 bg-sky-950/60 hover:bg-sky-900/80 border border-sky-700/50 p-2 rounded-lg text-[11px] font-bold text-sky-300 transition-all cursor-pointer"
                title="MP40 SMG Wall Buy (1,000 PTS)"
              >
                <Crosshair className="w-3.5 h-3.5 shrink-0" /> MP40 SMG
              </button>
              <button
                onClick={() => handleAddObject('wall_buy_ar')}
                className="flex items-center gap-1.5 bg-sky-950/60 hover:bg-sky-900/80 border border-sky-700/50 p-2 rounded-lg text-[11px] font-bold text-amber-300 transition-all cursor-pointer"
                title="VX-44 Assault Rifle Wall Buy (1,500 PTS)"
              >
                <Crosshair className="w-3.5 h-3.5 shrink-0" /> VX-44 AR
              </button>
              <button
                onClick={() => handleAddObject('wall_buy_shotgun')}
                className="flex items-center gap-1.5 bg-sky-950/60 hover:bg-sky-900/80 border border-sky-700/50 p-2 rounded-lg text-[11px] font-bold text-orange-300 transition-all cursor-pointer"
                title="SG-26 Shotgun Wall Buy (1,200 PTS)"
              >
                <Crosshair className="w-3.5 h-3.5 shrink-0" /> SG-26 SHOTGUN
              </button>
              <button
                onClick={() => handleAddObject('wall_buy_sniper')}
                className="flex items-center gap-1.5 bg-sky-950/60 hover:bg-sky-900/80 border border-sky-700/50 p-2 rounded-lg text-[11px] font-bold text-cyan-300 transition-all cursor-pointer"
                title="SR-50 Sniper Wall Buy (2,000 PTS)"
              >
                <Crosshair className="w-3.5 h-3.5 shrink-0" /> SR-50 SNIPER
              </button>
              <button
                onClick={() => handleAddObject('wall_buy_lmg')}
                className="flex items-center gap-1.5 bg-sky-950/60 hover:bg-sky-900/80 border border-sky-700/50 p-2 rounded-lg text-[11px] font-bold text-yellow-300 transition-all cursor-pointer"
                title="MG42 Heavy LMG Wall Buy (2,500 PTS)"
              >
                <Crosshair className="w-3.5 h-3.5 shrink-0" /> MG42 LMG
              </button>
              <button
                onClick={() => handleAddObject('wall_buy_raygun')}
                className="flex items-center gap-1.5 bg-emerald-950/70 hover:bg-emerald-900/80 border border-emerald-600/60 p-2 rounded-lg text-[11px] font-bold text-emerald-300 transition-all cursor-pointer"
                title="Plasma Blaster Wall Buy (4,000 PTS)"
              >
                <Sparkles className="w-3.5 h-3.5 shrink-0" /> PLASMA BLASTER
              </button>
            </div>

            <div className="text-[10px] font-bold text-slate-400 pt-1 uppercase tracking-wider">POWER BREWS & STATIONS</div>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                onClick={() => handleAddObject('perk_juggernog')}
                className="flex items-center gap-1.5 bg-red-950/60 hover:bg-red-900/80 border border-red-800/50 p-2 rounded-lg text-[11px] font-bold text-red-300 transition-all cursor-pointer"
              >
                <Shield className="w-3.5 h-3.5 shrink-0" /> TITAN TONIC
              </button>
              <button
                onClick={() => handleAddObject('perk_speedcola')}
                className="flex items-center gap-1.5 bg-emerald-950/60 hover:bg-emerald-900/80 border border-emerald-800/50 p-2 rounded-lg text-[11px] font-bold text-emerald-300 transition-all cursor-pointer"
              >
                <Zap className="w-3.5 h-3.5 shrink-0" /> BLITZ BREW
              </button>
              <button
                onClick={() => handleAddObject('perk_doubletap')}
                className="flex items-center gap-1.5 bg-amber-950/60 hover:bg-amber-900/80 border border-amber-800/50 p-2 rounded-lg text-[11px] font-bold text-amber-300 transition-all cursor-pointer"
              >
                <Target className="w-3.5 h-3.5 shrink-0" /> FURY FIZZ
              </button>
              <button
                onClick={() => handleAddObject('pack_a_punch')}
                className="flex items-center gap-1.5 bg-cyan-950/60 hover:bg-cyan-900/80 border border-cyan-800/50 p-2 rounded-lg text-[11px] font-bold text-cyan-300 transition-all cursor-pointer"
              >
                <Flame className="w-3.5 h-3.5 shrink-0" /> HYPER-FORGE
              </button>
              <button
                onClick={() => handleAddObject('mystery_box')}
                className="bg-amber-950/40 hover:bg-amber-900/60 border border-amber-700/40 p-2 rounded-lg text-[11px] font-bold text-amber-200 transition-all cursor-pointer text-center"
              >
                + ARMORY CHEST
              </button>
              <button
                onClick={() => handleAddObject('ammo_crate')}
                className="flex items-center justify-center gap-1 bg-yellow-950/50 hover:bg-yellow-900/70 border border-yellow-700/50 p-2 rounded-lg text-[11px] font-bold text-yellow-300 transition-all cursor-pointer"
                title="Refill all weapons ammo for 750 PTS"
              >
                <Package className="w-3.5 h-3.5 shrink-0" /> AMMO CRATE
              </button>
              <button
                onClick={() => handleAddObject('teleporter')}
                className="flex items-center justify-center gap-1 bg-cyan-950/60 hover:bg-cyan-900/80 border border-cyan-600/50 p-2 rounded-lg text-[11px] font-bold text-cyan-300 transition-all cursor-pointer"
                title="Place 2+ pads to teleport between locations"
              >
                <CircleDot className="w-3.5 h-3.5 shrink-0" /> TELEPORTER
              </button>
              <button
                onClick={() => handleAddObject('window_barrier')}
                className="bg-slate-800 hover:bg-slate-700 border border-slate-700 p-2 rounded-lg text-[11px] font-bold text-slate-300 transition-all cursor-pointer text-center"
              >
                + BARRIER
              </button>
            </div>

            <div className="text-[10px] font-bold text-slate-400 pt-1 uppercase tracking-wider">SPAWNERS</div>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                onClick={() => handleAddObject('zombie_spawn')}
                className="bg-red-950/80 hover:bg-red-900 border border-red-700/60 p-2 rounded-lg text-[11px] font-bold text-red-300 transition-all cursor-pointer text-center"
              >
                + ZOMBIE SPAWN
              </button>
              <button
                onClick={() => handleAddObject('player_spawn')}
                className="bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-700/60 p-2 rounded-lg text-[11px] font-bold text-emerald-300 transition-all cursor-pointer text-center"
              >
                + PLAYER SPAWN
              </button>
            </div>
          </div>

          {/* Scene Hierarchy List */}
          <div className="flex-1 flex flex-col min-h-0">
            <div className="px-4 py-2 bg-slate-950 border-b border-slate-800 text-[11px] font-bold text-slate-400 uppercase tracking-widest flex justify-between items-center">
              <span>SCENE HIERARCHY</span>
              <span className="text-slate-500 font-mono">{mapConfig.objects.length} OBJECTS</span>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {mapConfig.objects.map((obj) => (
                <div
                  key={obj.id}
                  onClick={() => editorEngineRef.current?.selectObject(obj.id)}
                  className={`flex items-center justify-between p-2.5 rounded-lg cursor-pointer transition-all border ${
                    selectedId === obj.id
                      ? 'bg-cyan-950/80 border-cyan-500 text-cyan-200 shadow-[0_0_10px_rgba(6,182,212,0.3)]'
                      : 'bg-slate-950/40 hover:bg-slate-800/60 border-slate-800/60 text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2 overflow-hidden pr-2">
                    {obj.type === 'block' && <Box className="w-3.5 h-3.5 text-cyan-400 shrink-0" />}
                    {obj.type === 'light' && <Sun className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
                    {obj.type.startsWith('perk_') && <Shield className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
                    {obj.type === 'pack_a_punch' && <Flame className="w-3.5 h-3.5 text-cyan-400 shrink-0" />}
                    {obj.type === 'mystery_box' && <Box className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
                    {obj.type === 'window_barrier' && <Layers className="w-3.5 h-3.5 text-amber-600 shrink-0" />}
                    {obj.type.startsWith('wall_buy_') && <Crosshair className="w-3.5 h-3.5 text-sky-400 shrink-0" />}
                    {(obj.type === 'ammo_crate' || obj.type === 'crate_cover') && <Package className="w-3.5 h-3.5 text-amber-300 shrink-0" />}
                    {obj.type === 'explosive_barrel' && <Flame className="w-3.5 h-3.5 text-orange-500 shrink-0" />}
                    {obj.type === 'teleporter' && <CircleDot className="w-3.5 h-3.5 text-cyan-400 shrink-0" />}
                    {(obj.type === 'sandbag_wall' || obj.type === 'pillar') && <Layers className="w-3.5 h-3.5 text-slate-400 shrink-0" />}
                    {obj.type === 'player_spawn' && <Eye className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
                    {obj.type === 'zombie_spawn' && <Flame className="w-3.5 h-3.5 text-red-500 shrink-0" />}
                    
                    <span className="text-xs font-semibold truncate">{obj.name}</span>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        editorEngineRef.current?.duplicateObject(obj.id);
                      }}
                      className="p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-white transition-all"
                      title="Duplicate"
                    >
                      <Copy className="w-3 h-3" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        editorEngineRef.current?.removeObject(obj.id);
                      }}
                      className="p-1 hover:bg-red-950 rounded text-slate-400 hover:text-red-400 transition-all"
                      title="Delete"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </aside>

        {/* MIDDLE VIEWPORT: 3D Editor Scene Canvas */}
        <main className="flex-1 relative bg-slate-950 overflow-hidden">
          <div ref={mountRef} className="w-full h-full" />

          {/* Viewport Controls Overlay Guide */}
          <div className="absolute bottom-4 left-4 bg-slate-950/80 backdrop-blur-md border border-slate-800 px-4 py-2.5 rounded-xl text-xs text-slate-300 font-semibold pointer-events-none flex items-center gap-4">
            <span className="flex items-center gap-1.5"><Move className="w-3.5 h-3.5 text-cyan-400" /> Orbit: Left Click + Drag</span>
            <span className="flex items-center gap-1.5"><Maximize2 className="w-3.5 h-3.5 text-amber-400" /> Pan: Right Click + Drag</span>
            <span className="flex items-center gap-1.5"><Sliders className="w-3.5 h-3.5 text-emerald-400" /> Zoom: Scroll Wheel</span>
          </div>
        </main>

        {/* RIGHT PANEL: Unity-Style Inspector (Properties Panel) */}
        <aside className="w-80 bg-slate-900/95 border-l border-slate-800 flex flex-col shrink-0 z-10 backdrop-blur-md overflow-y-auto">
          <div className="p-4 border-b border-slate-800 bg-slate-950 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-cyan-400" />
              <h2 className="text-sm font-extrabold tracking-wider text-white uppercase">INSPECTOR PROPERTIES</h2>
            </div>
            {selectedObject && (
              <div className="flex items-center gap-1">
                <button
                  onClick={handleDuplicateSelected}
                  className="p-1.5 bg-slate-800 hover:bg-slate-700 rounded text-slate-300 transition-all cursor-pointer"
                  title="Duplicate Object"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={handleDeleteSelected}
                  className="p-1.5 bg-red-950 hover:bg-red-900 rounded text-red-400 transition-all cursor-pointer"
                  title="Delete Object"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          {selectedObject ? (
            <div className="p-4 space-y-5 text-xs">
              {/* Object Name */}
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">OBJECT NAME</label>
                <input
                  type="text"
                  value={selectedObject.name}
                  onChange={(e) => handleUpdateSelected({ name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white font-semibold focus:border-cyan-500 outline-none"
                />
              </div>

              {/* Direct Numeric Position (X, Y, Z) Inputs */}
              <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-3">
                <div className="text-[11px] font-bold text-cyan-400 uppercase tracking-wider">POSITION (X, Y, Z)</div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold block mb-1">POS X</span>
                    <input
                      type="number"
                      step="0.1"
                      value={selectedObject.position.x}
                      onChange={(e) =>
                        handleUpdateSelected({
                          position: { ...selectedObject.position, x: parseFloat(e.target.value) || 0 },
                        })
                      }
                      className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white font-mono focus:border-cyan-500 outline-none"
                    />
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-400 font-bold block mb-1">POS Y</span>
                    <input
                      type="number"
                      step="0.1"
                      value={selectedObject.position.y}
                      onChange={(e) =>
                        handleUpdateSelected({
                          position: { ...selectedObject.position, y: parseFloat(e.target.value) || 0 },
                        })
                      }
                      className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white font-mono focus:border-cyan-500 outline-none"
                    />
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-400 font-bold block mb-1">POS Z</span>
                    <input
                      type="number"
                      step="0.1"
                      value={selectedObject.position.z}
                      onChange={(e) =>
                        handleUpdateSelected({
                          position: { ...selectedObject.position, z: parseFloat(e.target.value) || 0 },
                        })
                      }
                      className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white font-mono focus:border-cyan-500 outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Direct Numeric Scale Controls (Width, Height, Depth) for ALL objects */}
              <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-3">
                <div className="text-[11px] font-bold text-amber-400 uppercase tracking-wider">
                  SCALE / SIZE (WIDTH, HEIGHT, DEPTH)
                </div>
                
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold block mb-1">SCALE X</span>
                    <input
                      type="number"
                      step="0.1"
                      min="0.1"
                      value={selectedObject.scale.x}
                      onChange={(e) =>
                        handleUpdateSelected({
                          scale: { ...selectedObject.scale, x: Math.max(0.1, parseFloat(e.target.value) || 0.1) },
                        })
                      }
                      className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-amber-300 font-mono focus:border-amber-500 outline-none"
                    />
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-400 font-bold block mb-1">SCALE Y</span>
                    <input
                      type="number"
                      step="0.1"
                      min="0.1"
                      value={selectedObject.scale.y}
                      onChange={(e) =>
                        handleUpdateSelected({
                          scale: { ...selectedObject.scale, y: Math.max(0.1, parseFloat(e.target.value) || 0.1) },
                        })
                      }
                      className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-amber-300 font-mono focus:border-amber-500 outline-none"
                    />
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-400 font-bold block mb-1">SCALE Z</span>
                    <input
                      type="number"
                      step="0.1"
                      min="0.1"
                      value={selectedObject.scale.z}
                      onChange={(e) =>
                        handleUpdateSelected({
                          scale: { ...selectedObject.scale, z: Math.max(0.1, parseFloat(e.target.value) || 0.1) },
                        })
                      }
                      className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-amber-300 font-mono focus:border-amber-500 outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Independent Face Stretch Controls (1-Side Only Expansion) */}
              <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between text-[11px] font-bold text-cyan-400 uppercase tracking-wider">
                  <span>INDEPENDENT FACE STRETCH</span>
                  <span className="text-[9px] bg-cyan-950 text-cyan-300 border border-cyan-800 px-1.5 py-0.5 rounded font-mono">1-SIDE STRETCH</span>
                </div>

                {/* X-Axis (Left / Right) */}
                <div className="space-y-1.5">
                  <div className="text-[10px] text-slate-400 font-bold uppercase">WIDTH FACES (X-AXIS)</div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex items-center justify-between bg-slate-900 border border-slate-700/80 p-1.5 rounded-lg">
                      <span className="text-[10px] text-slate-300 font-bold pr-1">LEFT (-X)</span>
                      <div className="flex gap-1">
                        <button onClick={() => handleStretchFace('x', -1, -0.5)} className="px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 text-red-400 font-bold rounded text-xs cursor-pointer" title="Shrink Left">-0.5</button>
                        <button onClick={() => handleStretchFace('x', -1, 0.5)} className="px-1.5 py-0.5 bg-cyan-900 hover:bg-cyan-800 text-cyan-200 font-bold rounded text-xs cursor-pointer" title="Extend Left">+0.5</button>
                      </div>
                    </div>
                    <div className="flex items-center justify-between bg-slate-900 border border-slate-700/80 p-1.5 rounded-lg">
                      <span className="text-[10px] text-slate-300 font-bold pr-1">RIGHT (+X)</span>
                      <div className="flex gap-1">
                        <button onClick={() => handleStretchFace('x', 1, -0.5)} className="px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 text-red-400 font-bold rounded text-xs cursor-pointer" title="Shrink Right">-0.5</button>
                        <button onClick={() => handleStretchFace('x', 1, 0.5)} className="px-1.5 py-0.5 bg-cyan-900 hover:bg-cyan-800 text-cyan-200 font-bold rounded text-xs cursor-pointer" title="Extend Right">+0.5</button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Y-Axis (Bottom / Top) */}
                <div className="space-y-1.5">
                  <div className="text-[10px] text-slate-400 font-bold uppercase">HEIGHT FACES (Y-AXIS)</div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex items-center justify-between bg-slate-900 border border-slate-700/80 p-1.5 rounded-lg">
                      <span className="text-[10px] text-slate-300 font-bold pr-1">BOTTOM (-Y)</span>
                      <div className="flex gap-1">
                        <button onClick={() => handleStretchFace('y', -1, -0.5)} className="px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 text-red-400 font-bold rounded text-xs cursor-pointer" title="Shrink Bottom">-0.5</button>
                        <button onClick={() => handleStretchFace('y', -1, 0.5)} className="px-1.5 py-0.5 bg-amber-900 hover:bg-amber-800 text-amber-200 font-bold rounded text-xs cursor-pointer" title="Extend Bottom">+0.5</button>
                      </div>
                    </div>
                    <div className="flex items-center justify-between bg-slate-900 border border-slate-700/80 p-1.5 rounded-lg">
                      <span className="text-[10px] text-slate-300 font-bold pr-1">TOP (+Y)</span>
                      <div className="flex gap-1">
                        <button onClick={() => handleStretchFace('y', 1, -0.5)} className="px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 text-red-400 font-bold rounded text-xs cursor-pointer" title="Shrink Top">-0.5</button>
                        <button onClick={() => handleStretchFace('y', 1, 0.5)} className="px-1.5 py-0.5 bg-amber-900 hover:bg-amber-800 text-amber-200 font-bold rounded text-xs cursor-pointer" title="Extend Top">+0.5</button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Z-Axis (Back / Front) */}
                <div className="space-y-1.5">
                  <div className="text-[10px] text-slate-400 font-bold uppercase">DEPTH FACES (Z-AXIS)</div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex items-center justify-between bg-slate-900 border border-slate-700/80 p-1.5 rounded-lg">
                      <span className="text-[10px] text-slate-300 font-bold pr-1">BACK (-Z)</span>
                      <div className="flex gap-1">
                        <button onClick={() => handleStretchFace('z', -1, -0.5)} className="px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 text-red-400 font-bold rounded text-xs cursor-pointer" title="Shrink Back">-0.5</button>
                        <button onClick={() => handleStretchFace('z', -1, 0.5)} className="px-1.5 py-0.5 bg-emerald-900 hover:bg-emerald-800 text-emerald-200 font-bold rounded text-xs cursor-pointer" title="Extend Back">+0.5</button>
                      </div>
                    </div>
                    <div className="flex items-center justify-between bg-slate-900 border border-slate-700/80 p-1.5 rounded-lg">
                      <span className="text-[10px] text-slate-300 font-bold pr-1">FRONT (+Z)</span>
                      <div className="flex gap-1">
                        <button onClick={() => handleStretchFace('z', 1, -0.5)} className="px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 text-red-400 font-bold rounded text-xs cursor-pointer" title="Shrink Front">-0.5</button>
                        <button onClick={() => handleStretchFace('z', 1, 0.5)} className="px-1.5 py-0.5 bg-emerald-900 hover:bg-emerald-800 text-emerald-200 font-bold rounded text-xs cursor-pointer" title="Extend Front">+0.5</button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Rotation Y Numeric & Slider */}
              <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-3">
                <label className="flex justify-between items-center text-[11px] font-bold text-slate-400 uppercase">
                  <span>ROTATION Y (DEGREES)</span>
                  <input
                    type="number"
                    step="1"
                    value={Math.round((selectedObject.rotation.y * 180) / Math.PI)}
                    onChange={(e) => {
                      const deg = parseFloat(e.target.value) || 0;
                      const rad = (deg * Math.PI) / 180;
                      handleUpdateSelected({ rotation: { ...selectedObject.rotation, y: rad } });
                    }}
                    className="w-16 bg-slate-900 border border-slate-700 rounded px-2 py-0.5 text-xs text-cyan-300 font-mono text-right focus:border-cyan-500 outline-none"
                  />
                </label>
              </div>

              {/* Color & Material Finish */}
              {(selectedObject.type === 'block' ||
                selectedObject.type === 'light' ||
                selectedObject.type === 'explosive_barrel' ||
                selectedObject.type === 'crate_cover' ||
                selectedObject.type === 'sandbag_wall' ||
                selectedObject.type === 'pillar') && (
                <div className="space-y-3">
                  <label className="block text-[11px] font-bold text-slate-400 uppercase">COLOR & FINISH</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={selectedObject.color}
                      onChange={(e) => handleUpdateSelected({ color: e.target.value })}
                      className="w-10 h-10 rounded-lg cursor-pointer bg-slate-950 border border-slate-800 p-1"
                    />
                    <span className="font-mono text-xs text-slate-300 uppercase">{selectedObject.color}</span>
                  </div>

                  {/* Preset Swatches */}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {['#1c222e', '#222a36', '#5c3a1e', '#10b981', '#38bdf8', '#dc2626', '#ffaa22', '#e2e8f0'].map((hex) => (
                      <button
                        key={hex}
                        onClick={() => handleUpdateSelected({ color: hex })}
                        className="w-6 h-6 rounded-md border border-slate-700 transition-all hover:scale-110 cursor-pointer"
                        style={{ backgroundColor: hex }}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Texture Pattern Selector (For Blocks) */}
              {selectedObject.type === 'block' && (
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1.5">TEXTURE PATTERN</label>
                  <select
                    value={selectedObject.texturePattern}
                    onChange={(e) => handleUpdateSelected({ texturePattern: e.target.value as TexturePattern })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white font-semibold outline-none"
                  >
                    <option value="plain">Plain Smooth Matte</option>
                    <option value="concrete">Concrete Tiles (Floor)</option>
                    <option value="brick">Stone Bricks (Wall)</option>
                    <option value="wood">Weathered Wood Planks</option>
                  </select>
                </div>
              )}

              {/* Light Specific Settings */}
              {selectedObject.type === 'light' && (
                <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-3.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider">LIGHT BLOCK LEVEL</span>
                    <span className="text-[10px] font-mono text-slate-400">
                      {selectedObject.intensity <= 0 ? 'OFF (DARK)' : selectedObject.intensity < 1.5 ? 'DIM' : selectedObject.intensity < 5 ? 'MEDIUM' : 'BRIGHT'}
                    </span>
                  </div>

                  {/* Light Level Slider + Input */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <label className="text-[11px] font-bold text-slate-300">LIGHT LEVEL (INTENSITY)</label>
                      <input
                        type="number"
                        step="0.2"
                        min="0"
                        max="15"
                        value={selectedObject.intensity}
                        onChange={(e) => {
                          const parsed = parseFloat(e.target.value);
                          handleUpdateSelected({ intensity: Number.isFinite(parsed) ? Math.max(0, parsed) : 0 });
                        }}
                        className="w-16 bg-slate-900 border border-slate-700 rounded px-2 py-0.5 text-xs text-amber-300 font-mono text-right outline-none focus:border-amber-500"
                      />
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="10"
                      step="0.1"
                      value={Math.min(10, Math.max(0, selectedObject.intensity))}
                      onChange={(e) => {
                        const parsed = parseFloat(e.target.value);
                        handleUpdateSelected({ intensity: Number.isFinite(parsed) ? parsed : 0 });
                      }}
                      className="w-full accent-amber-500 cursor-pointer h-2 bg-slate-800 rounded-lg"
                    />
                    <div className="grid grid-cols-4 gap-1 pt-0.5">
                      {[
                        { label: 'OFF', val: 0 },
                        { label: 'DIM', val: 0.8 },
                        { label: 'MED', val: 3.0 },
                        { label: 'MAX', val: 8.0 },
                      ].map((preset) => (
                        <button
                          key={preset.label}
                          onClick={() => handleUpdateSelected({ intensity: preset.val })}
                          className={`py-1 rounded text-[10px] font-bold border cursor-pointer transition-colors ${
                            Math.abs(selectedObject.intensity - preset.val) < 0.15
                              ? 'bg-amber-600/30 border-amber-500 text-amber-300'
                              : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-white'
                          }`}
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Light Distance Range Slider + Input */}
                  <div className="space-y-1.5 pt-1 border-t border-slate-800/80">
                    <div className="flex items-center justify-between gap-2">
                      <label className="text-[11px] font-bold text-slate-300">LIGHT RADIUS (METERS)</label>
                      <input
                        type="number"
                        step="1"
                        min="1"
                        max="60"
                        value={selectedObject.distance}
                        onChange={(e) => {
                          const parsed = parseInt(e.target.value, 10);
                          handleUpdateSelected({ distance: Number.isFinite(parsed) ? Math.max(1, parsed) : 10 });
                        }}
                        className="w-16 bg-slate-900 border border-slate-700 rounded px-2 py-0.5 text-xs text-amber-300 font-mono text-right outline-none focus:border-amber-500"
                      />
                    </div>
                    <input
                      type="range"
                      min="2"
                      max="50"
                      step="1"
                      value={Math.min(50, Math.max(2, selectedObject.distance))}
                      onChange={(e) => {
                        const parsed = parseInt(e.target.value, 10);
                        handleUpdateSelected({ distance: Number.isFinite(parsed) ? parsed : 20 });
                      }}
                      className="w-full accent-amber-500 cursor-pointer h-2 bg-slate-800 rounded-lg"
                    />
                  </div>

                  <p className="text-[10px] text-slate-400 leading-snug pt-1 border-t border-slate-800/80">
                    Custom maps are dark by default unless lit by Light Blocks or the player&apos;s [T] Tactical Flashlight.
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-slate-500">
              <Box className="w-10 h-10 mb-2 text-slate-700" />
              <p className="text-sm font-semibold text-slate-400">No Object Selected</p>
              <p className="text-xs text-slate-600 mt-1">Select an object from the Hierarchy list or click any 3D object in the scene to inspect and stretch properties.</p>
            </div>
          )}
        </aside>
      </div>

      {/* EXPORT TRACK CODE MODAL (PolyTrack-style single string) */}
      {showExportModal && (
        <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-indigo-500/50 rounded-2xl p-6 max-w-xl w-full shadow-[0_0_50px_rgba(99,102,241,0.3)] flex flex-col gap-4 animate-fade-in">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="bg-indigo-600/20 border border-indigo-500/40 p-2 rounded-lg text-indigo-400">
                  <Share2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold tracking-wider text-white uppercase">EXPORT TRACK CODE</h3>
                  <p className="text-xs text-indigo-300">PolyTrack-style compressed single text string</p>
                </div>
              </div>
              <button
                onClick={() => setShowExportModal(false)}
                className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              This Base64 string contains all {mapConfig.objects.length} blocks, coordinates, rotations, and attributes.
              {exportCopied ? (
                <span className="text-emerald-400 font-bold ml-1">Copied to your clipboard automatically!</span>
              ) : (
                <span className="text-slate-400 ml-1">Copy and share it with friends to load anywhere.</span>
              )}
            </p>

            <div className="relative">
              <textarea
                readOnly
                value={exportedCode}
                onClick={(e) => (e.target as HTMLTextAreaElement).select()}
                className="w-full h-36 bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs font-mono text-cyan-300 resize-none outline-none focus:border-indigo-500 select-all leading-normal"
                placeholder="Track code string..."
              />
              {exportCopied && (
                <div className="absolute top-2 right-2 bg-emerald-950/90 border border-emerald-600 text-emerald-400 text-[11px] font-bold px-2.5 py-1 rounded-md flex items-center gap-1 shadow-lg">
                  <Check className="w-3.5 h-3.5" /> COPIED!
                </div>
              )}
            </div>

            <div className="flex items-center justify-between gap-3 pt-2">
              <span className="text-[11px] text-slate-500 font-mono">
                {exportedCode.length} characters • Base64 Minified
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    if (navigator?.clipboard?.writeText) {
                      navigator.clipboard.writeText(exportedCode);
                      setExportCopied(true);
                      setTimeout(() => setExportCopied(false), 2500);
                    }
                  }}
                  className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold px-4 py-2 rounded-xl text-xs transition-all shadow-[0_0_15px_rgba(99,102,241,0.4)] cursor-pointer"
                >
                  {exportCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  {exportCopied ? 'COPIED TO CLIPBOARD' : 'COPY TO CLIPBOARD'}
                </button>
                <button
                  onClick={() => setShowExportModal(false)}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold px-4 py-2 rounded-xl text-xs transition-all cursor-pointer"
                >
                  DONE
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* IMPORT TRACK CODE MODAL (PolyTrack-style single string) */}
      {showImportModal && (
        <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-violet-500/50 rounded-2xl p-6 max-w-xl w-full shadow-[0_0_50px_rgba(139,92,246,0.3)] flex flex-col gap-4 animate-fade-in">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="bg-violet-600/20 border border-violet-500/40 p-2 rounded-lg text-violet-400">
                  <Download className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold tracking-wider text-white uppercase">IMPORT TRACK CODE</h3>
                  <p className="text-xs text-violet-300">Load or play any shared PolyTrack-style code</p>
                </div>
              </div>
              <button
                onClick={() => setShowImportModal(false)}
                className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Paste a custom track code below. Loading will clear the current track and spawn all the blocks into the editor.
            </p>

            <textarea
              value={importCodeInput}
              onChange={(e) => setImportCodeInput(e.target.value)}
              className="w-full h-36 bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs font-mono text-cyan-200 resize-none outline-none focus:border-violet-500 placeholder-slate-600 leading-normal"
              placeholder="Paste Base64 track code here (e.g., eyJuYW1lIjoiQ3VzdG9tIFRyYWNrIi...)"
            />

            <div className="flex items-center justify-between gap-3 pt-2">
              <button
                type="button"
                onClick={async () => {
                  try {
                    const text = await navigator.clipboard.readText();
                    if (text) setImportCodeInput(text);
                  } catch (e) {}
                }}
                className="text-xs text-slate-400 hover:text-cyan-300 flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5" /> Paste from Clipboard
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleExecuteImport(false)}
                  disabled={!importCodeInput.trim()}
                  className="flex items-center gap-1.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-extrabold px-4 py-2 rounded-xl text-xs transition-all shadow-[0_0_15px_rgba(139,92,246,0.4)] cursor-pointer"
                >
                  <Download className="w-4 h-4" /> LOAD INTO EDITOR
                </button>
                <button
                  onClick={() => handleExecuteImport(true)}
                  disabled={!importCodeInput.trim()}
                  className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-extrabold px-4 py-2 rounded-xl text-xs transition-all shadow-[0_0_15px_rgba(16,185,129,0.4)] cursor-pointer"
                >
                  <Play className="w-4 h-4 fill-white" /> LOAD & PLAY
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

