import React, { useState } from 'react';
import { GrenadeType, PlayerLoadout, WeaponStats } from '../types/game';
import {
  WEAPON_LIST,
  PISTOL_WEAPONS,
  PISTOL_IDS,
  GRENADE_LIST,
  WEAPONS_MAP,
  GRENADES_MAP,
  sanitizeLoadout,
} from '../data/weapons';
import {
  Crosshair,
  Flame,
  ShieldAlert,
  Check,
  X,
  Lock,
  Bomb,
  Zap,
  Snowflake,
  Sparkles,
} from 'lucide-react';

interface WeaponsLoadoutModalProps {
  currentLoadout: PlayerLoadout;
  onSaveLoadout: (loadout: PlayerLoadout) => void;
  onClose: () => void;
}

type CategoryFilter = 'all' | NonNullable<WeaponStats['category']>;

const CATEGORY_LABELS: { id: CategoryFilter; label: string }[] = [
  { id: 'all', label: 'ALL (30)' },
  { id: 'pistol', label: 'PISTOLS' },
  { id: 'smg', label: 'SMGs' },
  { id: 'shotgun', label: 'SHOTGUNS' },
  { id: 'ar', label: 'RIFLES' },
  { id: 'lmg', label: 'LMGs' },
  { id: 'sniper', label: 'SNIPERS' },
  { id: 'special', label: 'SPECIAL' },
];

export const WeaponsLoadoutModal: React.FC<WeaponsLoadoutModalProps> = ({
  currentLoadout,
  onSaveLoadout,
  onClose,
}) => {
  const [draft, setDraft] = useState<PlayerLoadout>(() => sanitizeLoadout(currentLoadout));
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');

  const selectedPistol = WEAPONS_MAP[draft.startingPistolId] || PISTOL_WEAPONS[0];
  const selectedGrenade = GRENADES_MAP[draft.grenadeType] || GRENADE_LIST[0];

  const filteredWeapons =
    categoryFilter === 'all'
      ? WEAPON_LIST
      : WEAPON_LIST.filter((w) => (w.category || 'ar') === categoryFilter);

  const getPistolTraits = (w: WeaponStats): string[] => {
    const traits: string[] = [];
    if (w.isAuto) traits.push('Full-Auto');
    else traits.push('Semi-Auto');
    if (w.pierce && w.pierce > 0) traits.push(`Pierce x${w.pierce + 1}`);
    if (w.damage >= 120) traits.push('High Caliber');
    if (w.id === 'pistol') traits.push('Standard Issue');
    return traits;
  };

  const getGrenadeIcon = (id: GrenadeType) => {
    switch (id) {
      case 'frag':
        return <Bomb className="w-5 h-5 text-red-400" />;
      case 'flashbang':
        return <Zap className="w-5 h-5 text-sky-300" />;
      case 'cryo':
        return <Snowflake className="w-5 h-5 text-cyan-300" />;
      case 'thermite':
        return <Flame className="w-5 h-5 text-orange-400" />;
    }
  };

  const handleConfirm = () => {
    onSaveLoadout(sanitizeLoadout(draft));
    onClose();
  };

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      className="fixed inset-0 bg-slate-950/95 backdrop-blur-lg z-[100] flex items-center justify-center p-2 sm:p-6 pointer-events-auto select-none font-['Rajdhani',sans-serif]"
    >
      <div className="max-w-5xl w-full bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[94dvh]">
        {/* Header */}
        <div className="bg-slate-950 px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-600/20 border border-red-500/40 rounded-xl text-red-500">
              <Flame className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-wider leading-none">
                WEAPONS &amp; LOADOUT
              </h2>
              <p className="text-xs text-slate-400 font-semibold tracking-widest mt-0.5">
                CUSTOMIZE STARTING PISTOL SIDEARM &amp; TACTICAL GRENADE
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="min-h-[40px] min-w-[40px] p-2 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-xl transition-all flex items-center justify-center cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-4 sm:p-6 flex-1 overflow-y-auto space-y-6 sm:space-y-8">
          {/* SECTION 1: STARTING SIDEARM (PISTOLS ONLY) */}
          <section className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div className="text-xs font-extrabold tracking-widest text-red-400 uppercase flex items-center gap-2">
                <Crosshair className="w-4 h-4" /> 1. STARTING SIDEARM (PISTOLS ONLY)
              </div>
              <div className="inline-flex items-center gap-1.5 bg-amber-950/60 border border-amber-700/50 text-amber-300 px-3 py-1 rounded-lg text-[11px] font-bold">
                <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
                Only pistols may be carried at spawn — earn primaries via Wall Buys or the Armory Chest.
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {PISTOL_WEAPONS.map((wep) => {
                const isSelected = draft.startingPistolId === wep.id;
                const rpm = Math.round(60 / wep.fireRate);
                const traits = getPistolTraits(wep);
                return (
                  <button
                    key={wep.id}
                    type="button"
                    onClick={() => setDraft((prev) => ({ ...prev, startingPistolId: wep.id }))}
                    className={`text-left p-4 rounded-2xl border-2 transition-all cursor-pointer relative overflow-hidden ${
                      isSelected
                        ? 'bg-gradient-to-br from-red-950/75 via-slate-900 to-slate-950 border-red-500 shadow-[0_0_20px_rgba(220,38,38,0.3)]'
                        : 'bg-slate-950/70 hover:bg-slate-900 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    {isSelected && (
                      <div className="absolute top-3 right-3 bg-red-600 text-white text-[10px] font-black px-2.5 py-0.5 rounded-md flex items-center gap-1 tracking-wider">
                        <Check className="w-3 h-3" /> EQUIPPED
                      </div>
                    )}

                    <div className="flex items-center gap-2.5 mb-1">
                      <span
                        className="w-3 h-3 rounded-sm shrink-0 border border-white/20"
                        style={{ backgroundColor: wep.color }}
                      />
                      <span className="text-lg font-extrabold text-white tracking-wider uppercase">
                        {wep.name}
                      </span>
                    </div>

                    <div className="text-[11px] text-cyan-400 font-bold mb-3 flex items-center gap-1">
                      <Sparkles className="w-3 h-3" /> Hyper-Forge: {wep.papName}
                    </div>

                    <div className="grid grid-cols-3 gap-2 mb-3 text-xs">
                      <div className="bg-slate-900/90 border border-slate-800 rounded-lg px-2.5 py-1.5">
                        <div className="text-[10px] text-slate-400 font-bold uppercase">DAMAGE</div>
                        <div className="text-sm font-extrabold text-amber-400">{wep.damage}</div>
                      </div>
                      <div className="bg-slate-900/90 border border-slate-800 rounded-lg px-2.5 py-1.5">
                        <div className="text-[10px] text-slate-400 font-bold uppercase">AMMO</div>
                        <div className="text-sm font-extrabold text-slate-100">
                          {wep.clipSize} / {wep.maxReserve}
                        </div>
                      </div>
                      <div className="bg-slate-900/90 border border-slate-800 rounded-lg px-2.5 py-1.5">
                        <div className="text-[10px] text-slate-400 font-bold uppercase">FIRE RATE</div>
                        <div className="text-sm font-extrabold text-emerald-400">{rpm} RPM</div>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      {traits.map((t) => (
                        <span
                          key={t}
                          className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-300"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          {/* SECTION 2: STARTING GRENADE */}
          <section className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div className="text-xs font-extrabold tracking-widest text-cyan-400 uppercase flex items-center gap-2">
                <Bomb className="w-4 h-4" /> 2. STARTING GRENADE ORDNANCE [KEY: G]
              </div>
              <span className="text-[11px] font-bold text-slate-400">
                Press <span className="text-white bg-slate-800 px-1.5 py-0.5 rounded font-mono">G</span> to throw • +2 grenades each wave • Refills at Ammo Crates
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {GRENADE_LIST.map((gren) => {
                const isSelected = draft.grenadeType === gren.id;
                return (
                  <button
                    key={gren.id}
                    type="button"
                    onClick={() => setDraft((prev) => ({ ...prev, grenadeType: gren.id }))}
                    className={`text-left p-4 rounded-2xl border-2 transition-all cursor-pointer relative overflow-hidden ${
                      isSelected
                        ? 'bg-gradient-to-br from-cyan-950/75 via-slate-900 to-slate-950 border-cyan-400 shadow-[0_0_20px_rgba(34,211,238,0.28)]'
                        : 'bg-slate-950/70 hover:bg-slate-900 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    {isSelected && (
                      <div className="absolute top-3 right-3 bg-cyan-500 text-slate-950 text-[10px] font-black px-2.5 py-0.5 rounded-md flex items-center gap-1 tracking-wider">
                        <Check className="w-3 h-3" /> EQUIPPED
                      </div>
                    )}

                    <div className="flex items-center gap-2.5 mb-2">
                      <div className="w-9 h-9 rounded-lg bg-slate-900 border border-slate-700 flex items-center justify-center shrink-0">
                        {getGrenadeIcon(gren.id)}
                      </div>
                      <div>
                        <div className="text-lg font-extrabold text-white tracking-wider uppercase leading-tight">
                          {gren.name}
                        </div>
                        <div className="text-[11px] font-bold text-slate-400 uppercase">
                          Spawn: {gren.startCount} / Max: {gren.maxCount}
                        </div>
                      </div>
                    </div>

                    <p className="text-xs text-slate-300 leading-relaxed mb-3">{gren.description}</p>

                    <div className="flex items-center gap-2 text-[11px] font-bold">
                      <span className="bg-slate-900 border border-slate-800 px-2 py-1 rounded text-amber-300">
                        DMG: {gren.damage}
                      </span>
                      <span className="bg-slate-900 border border-slate-800 px-2 py-1 rounded text-cyan-300">
                        RADIUS: {gren.radius}m
                      </span>
                      <span className="bg-slate-900 border border-slate-800 px-2 py-1 rounded text-slate-300">
                        FUSE: {gren.fuseTime}s
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          {/* SECTION 3: FULL 30-WEAPON ARSENAL PREVIEW */}
          <section className="space-y-3 pt-2 border-t border-slate-800">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div>
                <div className="text-xs font-extrabold tracking-widest text-amber-400 uppercase">
                  3. FULL SURVIVAL ARSENAL REFERENCE (30 WEAPONS)
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Inspect all weapons available via Wall Buys &amp; the Armory Chest. Only Pistols unlock at deployment.
                </p>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {CATEGORY_LABELS.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setCategoryFilter(cat.id)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                      categoryFilter === cat.id
                        ? 'bg-amber-500 text-slate-950'
                        : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredWeapons.map((wep) => {
                const isPistol = PISTOL_IDS.has(wep.id);
                const isEquipped = draft.startingPistolId === wep.id;
                return (
                  <div
                    key={wep.id}
                    onClick={() => {
                      if (isPistol) {
                        setDraft((prev) => ({ ...prev, startingPistolId: wep.id }));
                      }
                    }}
                    className={`p-3.5 rounded-xl border transition-all ${
                      isPistol
                        ? isEquipped
                          ? 'bg-red-950/35 border-red-500 cursor-pointer'
                          : 'bg-slate-950/80 border-slate-700 hover:border-red-400 cursor-pointer'
                        : 'bg-slate-950/45 border-slate-800/80 opacity-85'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div className="font-extrabold text-sm text-white uppercase tracking-wide flex items-center gap-1.5">
                        <span
                          className="w-2.5 h-2.5 rounded-sm shrink-0"
                          style={{ backgroundColor: wep.color }}
                        />
                        {wep.name}
                      </div>
                      {isPistol ? (
                        <span
                          className={`text-[9px] font-black px-1.5 py-0.5 rounded uppercase shrink-0 ${
                            isEquipped
                              ? 'bg-red-600 text-white'
                              : 'bg-emerald-950 text-emerald-300 border border-emerald-700/60'
                          }`}
                        >
                          {isEquipped ? 'EQUIPPED' : 'SPAWNABLE'}
                        </span>
                      ) : (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded uppercase shrink-0 bg-slate-900 text-slate-400 border border-slate-700 flex items-center gap-1">
                          <Lock className="w-2.5 h-2.5" /> IN-MATCH
                        </span>
                      )}
                    </div>

                    <div className="text-[11px] text-cyan-400 font-semibold mb-2">
                      Forge: {wep.papName}
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-300 font-bold border-t border-slate-800/80 pt-2">
                      <span>
                        DMG: <span className="text-amber-400">{wep.pellets ? `${wep.damage}x${wep.pellets}` : wep.damage}</span>
                      </span>
                      <span>
                        MAG: <span className="text-white">{wep.clipSize}</span>
                      </span>
                      <span className="text-emerald-400">{wep.price.toLocaleString()} PTS</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="bg-slate-950 px-6 py-4 border-t border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
          <div className="text-xs font-bold text-slate-300 flex flex-wrap items-center gap-3">
            <span>
              SIDEARM: <span className="text-red-400 uppercase">{selectedPistol.name}</span>
            </span>
            <span className="text-slate-600">|</span>
            <span>
              GRENADE:{' '}
              <span className="text-cyan-400 uppercase">
                {selectedGrenade.name} ({selectedGrenade.startCount})
              </span>
            </span>
          </div>

          <div className="flex items-center gap-3 justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl text-sm transition-all cursor-pointer"
            >
              CANCEL
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              className="px-6 py-2.5 bg-red-600 hover:bg-red-500 text-white font-extrabold rounded-xl text-base shadow-[0_0_15px_rgba(220,38,38,0.5)] transition-all hover:scale-105 active:scale-95 cursor-pointer flex items-center gap-2"
            >
              <Check className="w-5 h-5" /> EQUIP LOADOUT
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
