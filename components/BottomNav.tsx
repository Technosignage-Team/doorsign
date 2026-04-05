
import React from 'react';
import { View } from '../types';

interface BottomNavProps {
  activeView: View;
  setView: (view: View) => void;
  isLoggedIn: boolean;
  isExpanded: boolean;
  setIsExpanded: (expanded: boolean) => void;
  onOpenSettings: () => void;
  onBookClick: () => void;
}

const BottomNav: React.FC<BottomNavProps> = ({ 
  activeView, 
  setView, 
  isExpanded, 
  setIsExpanded, 
  onOpenSettings, 
  onBookClick 
}) => {
  return (
    <>
      {/* Fixed Toggle Button (Dashboard) */}
      <div className="fixed right-6 top-6 flex justify-center z-50">
        <div className="relative">
          <button 
            onClick={() => setIsExpanded(!isExpanded)}
            className={`size-14 rounded-none flex items-center justify-center transition-all duration-300 shadow-2xl active:scale-90 ${
              isExpanded 
                ? 'bg-white text-black' 
                : 'bg-[#0a192f] text-primary border border-white/5'
            }`}
          >
            <span className="material-symbols-outlined text-3xl font-variation-fill">
              {isExpanded ? 'close' : 'blur_on'}
            </span>
          </button>
        </div>
      </div>

      {/* Popup Sidebar Panel */}
      <nav 
        className={`fixed right-0 top-0 bottom-0 h-full bg-[#0a192f]/95 backdrop-blur-3xl z-40 shadow-[-20px_0_60px_rgba(0,0,0,0.6)] flex flex-col items-end pt-8 pb-8 transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)] overflow-hidden ${
          isExpanded ? 'w-64 opacity-100 translate-x-0' : 'w-0 opacity-0 translate-x-10 pointer-events-none'
        }`}
      >
        {/* Top Header inside Panel */}
        <div className="flex flex-row-reverse items-center justify-between w-full px-6 mb-12">
          {/* Dashboard Button (Mirror of the external toggle) */}
          <div className="size-14 shrink-0 rounded-none bg-[#0a192f] text-primary shadow-[0_10px_30px_rgba(10,25,47,0.4)] flex items-center justify-center border border-white/5">
            <span className="material-symbols-outlined text-3xl font-variation-fill">blur_on</span>
          </div>
        </div>

        <div className="flex flex-col items-end flex-1 gap-6 px-6 w-full">
          {/* Highlighted Book Button - FIRST */}
          <button 
            onClick={() => {
              onBookClick();
              setIsExpanded(false);
            }}
            className="w-full flex flex-row-reverse items-center gap-4 group transition-all duration-300"
          >
            <div className={`size-14 shrink-0 rounded-none bg-white text-black shadow-[0_10px_30px_rgba(255,255,255,0.1)] flex items-center justify-center border border-white/20 group-hover:scale-105 active:scale-95 transition-all duration-300 ${
              activeView === View.BOOKING ? 'ring-2 ring-white ring-offset-4 ring-offset-background-dark' : ''
            }`}>
              <span className="material-symbols-outlined text-3xl group-hover:scale-110 transition-transform font-variation-fill">add_box</span>
            </div>
            <span className={`text-sm font-black uppercase tracking-widest text-white transition-all duration-500 whitespace-nowrap ${isExpanded ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-4'}`}>
              Book Room
            </span>
          </button>

          {/* Schedule */}
          <NavButton 
            icon="calendar_month" 
            label="Schedule"
            active={activeView === View.SCHEDULE} 
            isExpanded={isExpanded}
            onClick={() => {
              setView(View.SCHEDULE);
              setIsExpanded(false);
            }} 
          />

          {/* Details / Info */}
          <NavButton 
            icon="info" 
            label="Room Info"
            active={activeView === View.DETAILS} 
            isExpanded={isExpanded}
            onClick={() => {
              setView(View.DETAILS);
              setIsExpanded(false);
            }} 
          />
        </div>

        {/* Bottom Actions */}
        <div className="mt-auto px-6 w-full flex flex-col gap-6">
          <NavButton 
            icon="settings" 
            label="Settings"
            active={false} 
            isExpanded={isExpanded}
            onClick={() => {
              onOpenSettings();
              setIsExpanded(false);
            }} 
          />
        </div>
      </nav>

      {/* Backdrop for closing when expanded */}
      {isExpanded && (
        <div 
          className="fixed inset-0 bg-black/40 z-30 transition-opacity duration-500 backdrop-blur-sm"
          onClick={() => setIsExpanded(false)}
        />
      )}
    </>
  );
};

const NavButton: React.FC<{
  icon: string;
  label: string;
  active: boolean;
  isExpanded: boolean;
  onClick: () => void;
  variant?: 'default' | 'white' | 'primary' | 'navy';
  noBorder?: boolean;
}> = ({ icon, label, active, isExpanded, onClick, variant = 'default', noBorder = false }) => {
  const isWhite = variant === 'white';
  const isPrimary = variant === 'primary';
  const isNavy = variant === 'navy';
  const isActiveWhite = isWhite && active;
  
  return (
    <button 
      onClick={onClick}
      className="w-full flex flex-row-reverse items-center gap-4 group transition-all duration-300"
    >
      <div 
        className={`size-14 shrink-0 flex items-center justify-center transition-all duration-300 rounded-none ${!noBorder ? 'border border-white/10' : ''} ${
          isActiveWhite
            ? 'bg-white text-black shadow-[0_0_30px_rgba(255,255,255,0.3)]'
            : isNavy
              ? 'bg-[#0a192f] text-primary shadow-[0_10px_30px_rgba(10,25,47,0.4)]'
              : isPrimary
                ? 'bg-primary text-white shadow-[0_10px_30px_rgba(19,127,236,0.4)] border-white/20'
                : active 
                  ? 'bg-[#0b1a2d] text-white border-primary/40 ring-1 ring-primary/20 shadow-[0_0_20px_rgba(11,26,45,0.6)]' 
                  : 'bg-[#0b1a2d]/60 text-slate-500 hover:bg-[#0b1a2d] hover:text-slate-400 shadow-md'
        }`}
      >
        <span className={`material-symbols-outlined text-3xl ${active && !isWhite && !isPrimary && !isNavy ? 'font-variation-fill text-primary' : ''} ${(isActiveWhite || isPrimary || isNavy) ? 'font-variation-fill' : ''}`}>{icon}</span>
      </div>
      <span className={`text-sm font-black uppercase tracking-widest transition-all duration-500 whitespace-nowrap ${
        active ? 'text-white' : 'text-slate-500 group-hover:text-slate-400'
      } ${isExpanded ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-4 pointer-events-none'}`}>
        {label}
      </span>
    </button>
  );
};

export default BottomNav;
