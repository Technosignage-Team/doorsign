
import React from 'react';
import { HomeLayout } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentLayout: HomeLayout;
  onSelectLayout: (layout: HomeLayout) => void;
  currentSlotPrecision: 15 | 30;
  onSelectSlotPrecision: (precision: 15 | 30) => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ 
  isOpen, 
  onClose, 
  currentLayout, 
  onSelectLayout,
  currentSlotPrecision,
  onSelectSlotPrecision
}) => {
  if (!isOpen) return null;

  const layouts = [
    { id: HomeLayout.DEFAULT, name: 'Standard Layout', desc: 'Classic multi-column status dashboard', icon: 'dashboard' },
    { id: HomeLayout.MODERN_PILL, name: 'Modern Pill', desc: 'Centered typography with pill status header', icon: 'lens' },
    { id: HomeLayout.SPLIT_SCREEN, name: 'Split Screen', desc: 'High-impact split view with vertical imagery', icon: 'view_agenda' },
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 sm:p-12">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-3xl" onClick={onClose} />
      
      <div className="relative w-full max-w-3xl bg-card-dark rounded-xl border border-white/10 shadow-2xl overflow-hidden flex flex-col">
        <header className="p-10 border-b border-white/5 flex justify-between items-center">
          <div className="flex flex-col">
            <h2 className="text-3xl font-black text-white">System Settings</h2>
            <p className="text-slate-300 font-bold uppercase tracking-widest text-xs mt-1">Appearance & Layout</p>
          </div>
          <button onClick={onClose} className="size-12 rounded-xl bg-white/5 text-slate-300 flex items-center justify-center hover:text-white hover:bg-white/10 transition-all">
            <span className="material-symbols-outlined">close</span>
          </button>
        </header>

        <main className="p-10 flex flex-col gap-10 overflow-y-auto custom-scrollbar">
          <div>
            <h3 className="text-white text-xl font-black mb-6 flex items-center gap-3">
              <span className="material-symbols-outlined text-primary">grid_view</span>
              Home Dashboard Layout
            </h3>
            
            <div className="grid grid-cols-1 gap-4">
              {layouts.map((layout) => (
                <button
                  key={layout.id}
                  onClick={() => {
                    onSelectLayout(layout.id);
                  }}
                  className={`flex items-center gap-6 p-8 rounded-xl border-2 transition-all text-left group ${
                    currentLayout === layout.id 
                      ? 'bg-primary/10 border-primary shadow-lg shadow-primary/10' 
                      : 'bg-white/5 border-transparent hover:border-white/20'
                  }`}
                >
                  <div className={`size-16 rounded-xl flex items-center justify-center transition-all ${
                    currentLayout === layout.id ? 'bg-primary text-white' : 'bg-slate-800 text-slate-300 group-hover:text-white'
                  }`}>
                    <span className="material-symbols-outlined text-3xl">{layout.icon}</span>
                  </div>
                  <div className="flex-1">
                    <p className={`text-xl font-black ${currentLayout === layout.id ? 'text-white' : 'text-slate-300 group-hover:text-white'}`}>
                      {layout.name}
                    </p>
                    <p className="text-slate-300 font-medium text-sm mt-1">{layout.desc}</p>
                  </div>
                  {currentLayout === layout.id && (
                    <span className="material-symbols-outlined text-primary text-3xl">check_circle</span>
                  )}
                </button>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-white text-xl font-black mb-6 flex items-center gap-3">
              <span className="material-symbols-outlined text-primary">linear_scale</span>
              Timeline Precision
            </h3>
            <div className="bg-white/5 p-2 rounded-xl border border-white/5 flex gap-2">
               <button 
                onClick={() => onSelectSlotPrecision(15)}
                className={`flex-1 py-6 rounded-xl font-black uppercase tracking-widest text-xs transition-all ${currentSlotPrecision === 15 ? 'bg-primary text-white shadow-xl' : 'text-slate-300 hover:text-slate-200'}`}
               >
                 15 Minutes
               </button>
               <button 
                onClick={() => onSelectSlotPrecision(30)}
                className={`flex-1 py-6 rounded-xl font-black uppercase tracking-widest text-xs transition-all ${currentSlotPrecision === 30 ? 'bg-primary text-white shadow-xl' : 'text-slate-300 hover:text-slate-200'}`}
               >
                 30 Minutes
               </button>
            </div>
            <p className="mt-4 px-4 text-slate-300 text-[10px] font-medium leading-relaxed uppercase tracking-wider">
              Adjusts the density of the grid in the Timeline Schedule view. Higher precision allows for more detailed booking views.
            </p>
          </div>

          <div className="pt-6 border-t border-white/5 opacity-50">
             <div className="flex items-center justify-between text-slate-300 text-xs font-black uppercase tracking-widest">
                <span>Display Version 2.6.0</span>
                <span>EVEREST ROOM CORE</span>
             </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default SettingsModal;
