

import React, { useState, useEffect } from 'react';
import { HomeLayout } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentLayout: HomeLayout;
  onSelectLayout: (layout: HomeLayout) => void;
  currentSlotPrecision: 15 | 30;
  onSelectSlotPrecision: (precision: 15 | 30) => void;
  enableAtmosphericBg: boolean;
  onToggleAtmosphericBg: (enabled: boolean) => void;
  onOpenConfiguration: () => void;
  isKioskMode: boolean;
  kioskPin: string;
  onEnableKiosk: (pin: string) => void;
  onDisableKiosk: (pin: string) => boolean;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ 
  isOpen, 
  onClose, 
  currentLayout, 
  onSelectLayout,
  currentSlotPrecision,
  onSelectSlotPrecision,
  enableAtmosphericBg,
  onToggleAtmosphericBg,
  onOpenConfiguration,
  isKioskMode,
  kioskPin,
  onEnableKiosk,
  onDisableKiosk,
}) => {
  const [kioskStep, setKioskStep] = useState<'idle' | 'set1' | 'set2' | 'disable'>('idle');
  const [kioskPin1, setKioskPin1] = useState('');
  const [kioskPin2, setKioskPin2] = useState('');
  const [kioskError, setKioskError] = useState('');

  useEffect(() => {
    if (!isOpen) {
      setKioskStep('idle');
      setKioskPin1('');
      setKioskPin2('');
      setKioskError('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const layouts = [
    { id: HomeLayout.SPLIT_SCREEN, name: 'Split Screen', desc: 'Split view with vertical status imagery', icon: 'view_agenda' },
    { id: HomeLayout.CLOCK_SLOTS, name: 'Clock Slots', desc: 'Analog style timeline with interactive slots', icon: 'schedule' },
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 md:p-12">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-3xl" onClick={onClose} />
      <div className="relative w-full max-w-2xl bg-card-dark rounded-2xl border border-white/10 shadow-2xl overflow-hidden flex flex-col max-h-[90vh] md:max-h-[85vh]">
          <header className="p-4 sm:p-5 border-b border-white/5 flex justify-between items-center px-6 sm:px-8 shrink-0">
            <div className="flex flex-col text-left">
              <h2 className="text-xl sm:text-2xl font-black text-white leading-none">System Settings</h2>
              <p className="text-slate-400 font-bold uppercase tracking-widest text-[9px] mt-1 leading-none">Appearance & Layout</p>
            </div>
            <button onClick={onClose} className="size-10 rounded-xl bg-white/5 text-slate-300 flex items-center justify-center hover:text-white hover:bg-white/10 transition-all">
              <span className="material-symbols-outlined text-xl">close</span>
            </button>
          </header>

          <main className="p-5 sm:p-6 md:p-8 flex flex-col gap-5 sm:gap-6 overflow-y-auto custom-scrollbar">
            <div className="text-left">
              <h3 className="text-white text-sm sm:text-base font-black mb-3 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-lg sm:text-xl">grid_view</span>
                Home Dashboard Layout
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {layouts.map((layout) => (
                  <button
                    key={layout.id}
                    onClick={() => {
                      onSelectLayout(layout.id);
                    }}
                    className={`flex items-center gap-3.5 p-3 sm:p-4 rounded-xl border-2 transition-all text-left group ${
                      currentLayout === layout.id 
                        ? 'bg-primary/5 border-primary shadow-md shadow-primary/5' 
                        : 'bg-white/5 border-transparent hover:border-white/15'
                    }`}
                  >
                    <div className={`size-10 sm:size-11 rounded-lg flex items-center justify-center transition-all shrink-0 ${
                      currentLayout === layout.id ? 'bg-primary text-white' : 'bg-slate-800 text-slate-300 group-hover:text-white'
                    }`}>
                      <span className="material-symbols-outlined text-lg sm:text-xl">{layout.icon}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm sm:text-base font-black truncate ${currentLayout === layout.id ? 'text-white' : 'text-slate-300 group-hover:text-white'}`}>{layout.name}</p>
                      <p className="text-slate-400 font-medium text-[10px] sm:text-xs mt-0.5 line-clamp-1">{layout.desc}</p>
                    </div>
                    {currentLayout === layout.id && (
                      <span className="material-symbols-outlined text-primary text-xl sm:text-2xl shrink-0">check_circle</span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div className="text-left">
              <h3 className="text-white text-sm sm:text-base font-black mb-3 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-lg sm:text-xl">linear_scale</span>
                Timeline Precision
              </h3>
              <div className="bg-white/5 p-1.5 rounded-xl border border-white/5 flex gap-1.5">
                 <button 
                  onClick={() => onSelectSlotPrecision(15)}
                  className={`flex-1 py-2 rounded-lg font-black uppercase tracking-widest text-[10px] sm:text-xs transition-all ${currentSlotPrecision === 15 ? 'bg-primary text-white shadow-md' : 'text-slate-300 hover:text-slate-200'}`}
                 >
                   15 Minutes
                 </button>
                 <button 
                  onClick={() => onSelectSlotPrecision(30)}
                  className={`flex-1 py-2 rounded-lg font-black uppercase tracking-widest text-[10px] sm:text-xs transition-all ${currentSlotPrecision === 30 ? 'bg-primary text-white shadow-md' : 'text-slate-300 hover:text-slate-200'}`}
                 >
                   30 Minutes
                 </button>
              </div>
              <p className="mt-2 px-2 text-slate-400 text-[9px] sm:text-[10px] font-medium leading-relaxed uppercase tracking-wider">
                Adjusts the density of the grid in the Timeline Schedule view. Higher precision allows for more detailed booking views.
              </p>
            </div>

            <div className="text-left">
              <h3 className="text-white text-sm sm:text-base font-black mb-3 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-lg sm:text-xl">blur_on</span>
                Atmospheric Status Background
              </h3>
              <div className="bg-white/5 p-1.5 rounded-xl border border-white/5 flex gap-1.5">
                 <button 
                  onClick={() => onToggleAtmosphericBg(true)}
                  className={`flex-1 py-2 rounded-lg font-black uppercase tracking-widest text-[10px] sm:text-xs transition-all ${enableAtmosphericBg ? 'bg-primary text-white shadow-md' : 'text-slate-300 hover:text-slate-200'}`}
                 >
                   Enabled
                 </button>
                 <button 
                  onClick={() => onToggleAtmosphericBg(false)}
                  className={`flex-1 py-2 rounded-lg font-black uppercase tracking-widest text-[10px] sm:text-xs transition-all ${!enableAtmosphericBg ? 'bg-primary text-white shadow-md' : 'text-slate-300 hover:text-slate-200'}`}
                 >
                   Disabled
                 </button>
              </div>
              <p className="mt-2 px-2 text-slate-400 text-[9px] sm:text-[10px] font-medium leading-relaxed uppercase tracking-wider">
                Enables or disables the dynamically pulsing green (available) or red (busy) ambient glow around elements. Disabling it provides pure black layouts.
              </p>
            </div>

            {/* Configuration entry - LEAVE UNCHANGED */}
            <div className="pt-2 border-t border-white/5">
              <button
                onClick={onOpenConfiguration}
                className="w-full flex items-center gap-5 p-6 rounded-xl bg-white/5 border border-white/8 hover:border-primary/40 hover:bg-primary/5 transition-all group text-left"
              >
                <div className="size-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center group-hover:bg-primary/20 transition-all">
                  <span className="material-symbols-outlined text-primary text-2xl">tune</span>
                </div>
                <div className="flex-1">
                  <p className="text-white font-black text-base">Configuration</p>
                  <p className="text-slate-400 text-xs mt-0.5">Connection URL & activation key</p>
                </div>
                <span className="material-symbols-outlined text-slate-500 group-hover:text-primary transition-colors">chevron_right</span>
              </button>
            </div>

            {/* Kiosk / Lock Mode Section */}
            <div className="pt-2 border-t border-white/5">
              <h3 className="text-white text-sm sm:text-base font-black mb-3 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-lg sm:text-xl">shield_lock</span>
                Kiosk / Lock Mode
              </h3>

              {isKioskMode ? (
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                    <span className="material-symbols-outlined text-emerald-400 text-xl">lock</span>
                    <div>
                      <p className="text-emerald-400 font-black text-sm">Kiosk Mode Active</p>
                      <p className="text-slate-400 text-xs mt-0.5">System bars hidden. Admin PIN required to exit.</p>
                    </div>
                  </div>
                  {kioskStep === 'idle' && (
                    <button
                      onClick={() => { setKioskStep('disable'); setKioskPin1(''); setKioskError(''); }}
                      className="w-full py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 font-black text-sm hover:bg-red-500/20 transition-all"
                    >
                      Disable Kiosk Mode
                    </button>
                  )}
                  {kioskStep === 'disable' && (
                    <div className="flex flex-col gap-2">
                      <p className="text-slate-300 text-xs font-medium px-1">Enter admin PIN to disable kiosk mode:</p>
                      <input
                        type="password"
                        maxLength={4}
                        inputMode="numeric"
                        value={kioskPin1}
                        onChange={e => { setKioskPin1(e.target.value.replace(/\D/g, '').slice(0, 4)); setKioskError(''); }}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white font-mono text-2xl text-center tracking-[0.5em] placeholder:text-slate-600 focus:outline-none focus:border-primary"
                        placeholder="••••"
                        autoFocus
                      />
                      {kioskError && <p className="text-red-400 text-xs font-black px-1">{kioskError}</p>}
                      <div className="flex gap-2 mt-1">
                        <button
                          onClick={() => { setKioskStep('idle'); setKioskPin1(''); setKioskError(''); }}
                          className="flex-1 py-2.5 rounded-xl bg-white/5 border border-white/10 text-slate-300 font-black text-sm hover:bg-white/10 transition-all"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => {
                            if (onDisableKiosk(kioskPin1)) {
                              setKioskStep('idle'); setKioskPin1(''); setKioskError('');
                            } else {
                              setKioskError('Incorrect PIN. Try again.');
                              setKioskPin1('');
                            }
                          }}
                          className="flex-1 py-2.5 rounded-xl bg-red-500 text-white font-black text-sm hover:brightness-110 transition-all"
                        >
                          Confirm Disable
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  <p className="text-slate-400 text-xs font-medium px-1">Lock the device into this app. System bars will be hidden. Admin PIN required to exit.</p>
                  {kioskStep === 'idle' && (
                    <button
                      onClick={() => { setKioskStep('set1'); setKioskPin1(''); setKioskPin2(''); setKioskError(''); }}
                      className="w-full py-3 rounded-xl bg-white/5 border border-white/10 text-slate-200 font-black text-sm hover:border-primary/40 hover:bg-primary/5 transition-all flex items-center justify-center gap-2"
                    >
                      <span className="material-symbols-outlined text-lg">lock</span>
                      Enable Kiosk Mode
                    </button>
                  )}
                  {kioskStep === 'set1' && (
                    <div className="flex flex-col gap-2">
                      <p className="text-slate-300 text-xs font-medium px-1">Set a 4-digit admin PIN:</p>
                      <input
                        type="password"
                        maxLength={4}
                        inputMode="numeric"
                        value={kioskPin1}
                        onChange={e => { setKioskPin1(e.target.value.replace(/\D/g, '').slice(0, 4)); setKioskError(''); }}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white font-mono text-2xl text-center tracking-[0.5em] placeholder:text-slate-600 focus:outline-none focus:border-primary"
                        placeholder="••••"
                        autoFocus
                      />
                      {kioskError && <p className="text-red-400 text-xs font-black px-1">{kioskError}</p>}
                      <div className="flex gap-2 mt-1">
                        <button
                          onClick={() => { setKioskStep('idle'); setKioskPin1(''); setKioskError(''); }}
                          className="flex-1 py-2.5 rounded-xl bg-white/5 border border-white/10 text-slate-300 font-black text-sm hover:bg-white/10 transition-all"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => {
                            if (kioskPin1.length < 4) { setKioskError('PIN must be exactly 4 digits.'); return; }
                            setKioskStep('set2'); setKioskPin2(''); setKioskError('');
                          }}
                          className="flex-1 py-2.5 rounded-xl bg-primary text-white font-black text-sm hover:brightness-110 transition-all"
                        >
                          Continue
                        </button>
                      </div>
                    </div>
                  )}
                  {kioskStep === 'set2' && (
                    <div className="flex flex-col gap-2">
                      <p className="text-slate-300 text-xs font-medium px-1">Confirm your admin PIN:</p>
                      <input
                        type="password"
                        maxLength={4}
                        inputMode="numeric"
                        value={kioskPin2}
                        onChange={e => { setKioskPin2(e.target.value.replace(/\D/g, '').slice(0, 4)); setKioskError(''); }}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white font-mono text-2xl text-center tracking-[0.5em] placeholder:text-slate-600 focus:outline-none focus:border-primary"
                        placeholder="••••"
                        autoFocus
                      />
                      {kioskError && <p className="text-red-400 text-xs font-black px-1">{kioskError}</p>}
                      <div className="flex gap-2 mt-1">
                        <button
                          onClick={() => { setKioskStep('set1'); setKioskPin2(''); setKioskError(''); }}
                          className="flex-1 py-2.5 rounded-xl bg-white/5 border border-white/10 text-slate-300 font-black text-sm hover:bg-white/10 transition-all"
                        >
                          Back
                        </button>
                        <button
                          onClick={() => {
                            if (kioskPin1 !== kioskPin2) { setKioskError('PINs do not match. Try again.'); setKioskPin2(''); return; }
                            onEnableKiosk(kioskPin1);
                            setKioskStep('idle'); setKioskPin1(''); setKioskPin2(''); setKioskError('');
                          }}
                          className="flex-1 py-2.5 rounded-xl bg-emerald-500 text-white font-black text-sm hover:brightness-110 transition-all"
                        >
                          Enable Kiosk
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-white/5 opacity-40 shrink-0">
               <div className="flex items-center justify-between text-slate-400 text-[9px] font-black uppercase tracking-widest">
                  <span>Display Version 2.6.0</span>
                  <span>SHAREWINDS ROOM CORE</span>
               </div>
            </div>
          </main>
        </div>
      </div>
    );
};

export default SettingsModal;
