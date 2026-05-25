

import React from 'react';
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
  onOpenConfiguration
}) => {
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
