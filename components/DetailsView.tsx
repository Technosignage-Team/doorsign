import React, { useState } from 'react';
import { Amenity } from '../types';

interface DetailsViewProps {
  onBack: () => void;
  onBook: () => void;
  roomName?: string;
  roomLocation?: string;
  capacity?: number;
  description?: string;
  imageUrl?: string;
  amenities?: Amenity[];
}

const DetailsView: React.FC<DetailsViewProps> = ({
  onBack, onBook,
  roomName = 'Conference Room A',
  roomLocation = 'Nile Business Center – Tower A • Level 1',
  capacity = 12,
  description,
  imageUrl,
  amenities = [],
}) => {
  const [selectedAmenity, setSelectedAmenity] = useState<Amenity | null>(null);

  return (
    <div className="flex flex-col h-full overflow-hidden bg-background-dark text-white">

      {/* Header */}
      <div className="flex items-center bg-background-dark/95 backdrop-blur-xl px-4 py-3 lg:px-6 lg:py-4 border-b border-white/5 shrink-0 gap-3">
        <button onClick={onBack} className="text-white flex size-11 items-center justify-center hover:bg-white/5 rounded-xl transition-all shrink-0">
          <span className="material-symbols-outlined" style={{ fontSize: 'clamp(1.5rem, 2.5vw, 2rem)' }}>arrow_back</span>
        </button>
        <div className="flex flex-col flex-1 min-w-0">
          <h2 className="font-black tracking-tighter uppercase text-white truncate" style={{ fontSize: 'clamp(1rem, 2vw, 1.75rem)' }}>{roomName}</h2>
          <p className="text-primary font-black uppercase mt-0.5 truncate" style={{ fontSize: 'clamp(0.55rem, 0.85vw, 0.7rem)', letterSpacing: '0.3em' }}>{roomLocation}</p>
        </div>
        <button
          onClick={onBook}
          className="shrink-0 bg-primary text-white font-black rounded-xl uppercase tracking-widest hover:brightness-110 active:scale-95 transition-all"
          style={{ fontSize: 'clamp(0.6rem, 0.9vw, 0.75rem)', padding: 'clamp(0.45rem, 1vh, 0.65rem) clamp(0.75rem, 1.5vw, 1.25rem)' }}
        >
          Reserve
        </button>
      </div>

      {/* Scrollable main */}
      <main className="flex-1 overflow-y-auto custom-scrollbar" style={{ padding: 'clamp(0.75rem, 1.5vw, 1.5rem)' }}>
        <div className="max-w-7xl mx-auto grid grid-cols-1 tablet:grid-cols-2 gap-4 lg:gap-6">

          {/* ── Left: Room Info ── */}
          <div className="flex flex-col gap-4">

            {/* Photo */}
            <div
              className="w-full rounded-xl border border-white/10 overflow-hidden relative shrink-0 bg-white/5"
              style={{ height: 'clamp(140px, 25vh, 280px)' }}
            >
              {imageUrl
                ? <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url("${imageUrl}")` }} />
                : <div className="absolute inset-0 flex items-center justify-center text-white/10">
                    <span className="material-symbols-outlined" style={{ fontSize: 'clamp(4rem, 8vw, 6rem)' }}>meeting_room</span>
                  </div>
              }
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
              <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-lg border border-white/10">
                <span className="flex h-1.5 w-1.5 rounded-full bg-status-available animate-pulse" />
                <span className="text-white font-black uppercase tracking-widest" style={{ fontSize: 'clamp(0.5rem, 0.7vw, 0.6rem)' }}>Live</span>
              </div>
              <div className="absolute bottom-3 left-3 flex items-center gap-2 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/10">
                <span className="material-symbols-outlined text-primary" style={{ fontSize: 'clamp(0.875rem, 1.4vw, 1.25rem)' }}>groups</span>
                <span className="text-white font-black uppercase tracking-widest" style={{ fontSize: 'clamp(0.6rem, 0.9vw, 0.75rem)' }}>{capacity} Persons</span>
              </div>
            </div>

            {/* Quick stats */}
            <div className="grid grid-cols-3 gap-2">
              {[
                { icon: 'groups', value: String(capacity), label: 'Persons', color: 'text-primary' },
                { icon: 'check_circle', value: 'Available', label: 'Status', color: 'text-status-available' },
                { icon: 'location_on', value: roomLocation.split('•')[0].trim(), label: 'Floor', color: 'text-primary' },
              ].map(s => (
                <div key={s.label} className="bg-white/[0.03] border border-white/5 rounded-xl flex flex-col items-center justify-center gap-1 py-3 px-2">
                  <span className={`material-symbols-outlined font-variation-fill ${s.color}`} style={{ fontSize: 'clamp(1rem, 1.6vw, 1.4rem)' }}>{s.icon}</span>
                  <span className="text-white font-black text-center truncate w-full text-center" style={{ fontSize: 'clamp(0.6rem, 0.95vw, 0.8rem)' }}>{s.value}</span>
                  <span className="text-slate-500 font-black uppercase text-center" style={{ fontSize: 'clamp(0.45rem, 0.6vw, 0.55rem)', letterSpacing: '0.2em' }}>{s.label}</span>
                </div>
              ))}
            </div>

            {/* Description */}
            <div className="bg-white/[0.02] border border-white/5 rounded-xl p-4 flex flex-col gap-3">
              <div className="flex items-center gap-2 pb-2 border-b border-white/5">
                <span className="material-symbols-outlined text-primary" style={{ fontSize: 'clamp(0.875rem, 1.3vw, 1.1rem)' }}>info</span>
                <span className="text-primary font-black uppercase tracking-[0.3em]" style={{ fontSize: 'clamp(0.5rem, 0.7vw, 0.625rem)' }}>About This Room</span>
              </div>
              <p className="text-slate-200 font-medium leading-relaxed" style={{ fontSize: 'clamp(0.75rem, 1.1vw, 0.9rem)' }}>
                {description || 'Premier meeting space designed for high-stakes decision making and global collaboration. Featuring state-of-the-art acoustic treatment, ergonomic seating, and integrated smart technology to ensure seamless communication.'}
              </p>
              <button
                onClick={onBook}
                className="w-full mt-1 bg-white text-black font-black rounded-xl shadow-xl shadow-white/10 hover:bg-slate-100 active:scale-95 transition-all uppercase tracking-[0.2em] flex items-center justify-center gap-2"
                style={{ padding: 'clamp(0.6rem, 1.4vh, 1rem)', fontSize: 'clamp(0.7rem, 1vw, 0.85rem)' }}
              >
                <span className="material-symbols-outlined font-variation-fill" style={{ fontSize: 'clamp(0.875rem, 1.4vw, 1.1rem)' }}>event_available</span>
                Reserve Now
              </button>
            </div>
          </div>

          {/* ── Right: Amenities ── */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary" style={{ fontSize: 'clamp(1rem, 1.6vw, 1.3rem)' }}>inventory_2</span>
                <h3 className="font-black tracking-tight text-white uppercase" style={{ fontSize: 'clamp(0.85rem, 1.3vw, 1.1rem)' }}>Room Amenities</h3>
                {amenities.length > 0 && (
                  <span className="px-2 py-0.5 bg-primary/10 border border-primary/20 rounded-full text-primary font-black" style={{ fontSize: 'clamp(0.5rem, 0.7vw, 0.6rem)' }}>{amenities.length}</span>
                )}
              </div>
              {amenities.length > 0 && (
                <span className="text-slate-500 font-black uppercase" style={{ fontSize: 'clamp(0.45rem, 0.6vw, 0.55rem)', letterSpacing: '0.2em' }}>Tap for details</span>
              )}
            </div>

            {amenities.length > 0 ? (
              <div className="grid grid-cols-2 gap-3">
                {amenities.map(a => (
                  <AmenityCard key={a.id} amenity={a} onClick={() => setSelectedAmenity(a)} />
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center gap-4 text-white/20 border border-white/5 rounded-xl bg-white/[0.02]" style={{ minHeight: 'clamp(120px, 20vh, 200px)' }}>
                <span className="material-symbols-outlined" style={{ fontSize: 'clamp(2rem, 4vw, 3.5rem)' }}>category</span>
                <p className="font-black uppercase tracking-widest" style={{ fontSize: 'clamp(0.6rem, 0.85vw, 0.75rem)' }}>No amenities configured</p>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* ── Amenity Detail Overlay ── */}
      {selectedAmenity && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-8 animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-black/90 backdrop-blur-2xl" onClick={() => setSelectedAmenity(null)} />
          <div
            className="relative w-full max-w-xl tablet:max-w-2xl bg-card-dark rounded-2xl border border-white/10 shadow-[0_0_100px_rgba(0,0,0,0.9)] overflow-hidden flex flex-col animate-in zoom-in-95 duration-300"
            style={{ maxHeight: '88vh' }}
          >
            {/* Modal top bar */}
            <div className="px-5 py-3 border-b border-white/5 flex items-center justify-between bg-white/[0.02] shrink-0">
              <span className="text-slate-400 font-black uppercase tracking-[0.4em]" style={{ fontSize: 'clamp(0.5rem, 0.7vw, 0.625rem)' }}>Amenity Details</span>
              <button onClick={() => setSelectedAmenity(null)} className="size-8 rounded-xl bg-white/5 border border-white/10 text-white flex items-center justify-center hover:bg-white/10 transition-all">
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            {/* Scrollable body */}
            <div className="overflow-y-auto custom-scrollbar flex-1">
              {selectedAmenity.img && (
                <div className="w-full overflow-hidden relative bg-black/60" style={{ height: 'clamp(120px, 25vh, 260px)' }}>
                  <img src={selectedAmenity.img} alt={selectedAmenity.title} className="w-full h-full object-contain object-center" />
                  <div className="absolute inset-0 bg-gradient-to-b from-card-dark/30 to-transparent pointer-events-none" />
                  <span className="absolute bottom-3 right-4 font-black text-white/20 uppercase tracking-[0.3em]" style={{ fontSize: 'clamp(0.45rem, 0.6vw, 0.55rem)' }}>Hardware Visualization</span>
                </div>
              )}

              <div className="flex flex-col gap-4" style={{ padding: 'clamp(1rem, 2vw, 1.5rem)' }}>
                {/* Title row */}
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="rounded-xl bg-primary/20 flex items-center justify-center text-primary border border-primary/20 shrink-0" style={{ width: 'clamp(2.25rem, 3.5vw, 3rem)', height: 'clamp(2.25rem, 3.5vw, 3rem)' }}>
                      <span className="material-symbols-outlined font-variation-fill" style={{ fontSize: 'clamp(1.1rem, 1.8vw, 1.5rem)' }}>{selectedAmenity.icon}</span>
                    </div>
                    <h3 className="font-black text-white tracking-tighter uppercase leading-tight" style={{ fontSize: 'clamp(1.1rem, 2.2vw, 1.75rem)' }}>{selectedAmenity.title}</h3>
                  </div>
                  {selectedAmenity.quantity && (
                    <div className="shrink-0 px-3 py-1.5 bg-white/5 rounded-xl border border-white/10">
                      <span className="text-white font-black uppercase tracking-widest" style={{ fontSize: 'clamp(0.6rem, 0.85vw, 0.7rem)' }}>{selectedAmenity.quantity}</span>
                    </div>
                  )}
                </div>

                <div className="h-px bg-white/10" />

                <p className="text-slate-200 font-medium leading-relaxed" style={{ fontSize: 'clamp(0.78rem, 1.2vw, 0.95rem)' }}>
                  {selectedAmenity.description}
                </p>

                <div className="flex items-center justify-between pt-1">
                  <div className="flex flex-col gap-1">
                    <p className="text-slate-500 font-black uppercase tracking-widest" style={{ fontSize: 'clamp(0.5rem, 0.65vw, 0.6rem)' }}>Health Status</p>
                    <div className="flex items-center gap-2">
                      <span className="size-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]" />
                      <span className="text-emerald-400 font-black uppercase tracking-widest" style={{ fontSize: 'clamp(0.65rem, 0.95vw, 0.8rem)' }}>{selectedAmenity.status}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedAmenity(null)}
                    className="bg-white text-black font-black rounded-xl hover:bg-slate-100 active:scale-95 transition-all uppercase tracking-widest"
                    style={{ padding: 'clamp(0.55rem, 1.1vh, 0.8rem) clamp(1.25rem, 2.5vw, 2rem)', fontSize: 'clamp(0.6rem, 0.85vw, 0.7rem)' }}
                  >
                    Got it
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const AmenityCard: React.FC<{ amenity: Amenity; onClick: () => void }> = ({ amenity, onClick }) => (
  <button
    onClick={onClick}
    className="group flex flex-col bg-white/[0.03] border border-white/5 rounded-xl text-left transition-all duration-300 hover:bg-white/[0.07] hover:border-primary/30 hover:-translate-y-0.5 active:scale-[0.98] overflow-hidden"
  >
    {/* Image / icon backdrop */}
    {amenity.img ? (
      <div className="w-full overflow-hidden relative bg-black/60 shrink-0" style={{ height: 'clamp(70px, 12vh, 130px)' }}>
        <img src={amenity.img} alt={amenity.title} className="w-full h-full object-contain object-center transition-transform duration-700 group-hover:scale-105" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent pointer-events-none" />
      </div>
    ) : (
      <div className="w-full flex items-center justify-center bg-primary/5 border-b border-white/5 shrink-0" style={{ height: 'clamp(50px, 8vh, 90px)' }}>
        <span className="material-symbols-outlined text-primary/25 font-variation-fill" style={{ fontSize: 'clamp(1.75rem, 3.5vw, 3rem)' }}>{amenity.icon}</span>
      </div>
    )}

    {/* Info */}
    <div className="flex flex-col p-3 gap-1.5">
      <div className="flex items-center gap-2">
        <div className="size-6 rounded-lg bg-primary/20 border border-primary/20 flex items-center justify-center text-primary shrink-0">
          <span className="material-symbols-outlined font-variation-fill" style={{ fontSize: '13px' }}>{amenity.icon}</span>
        </div>
        <h4 className="text-white font-black tracking-tight uppercase leading-none truncate" style={{ fontSize: 'clamp(0.625rem, 0.95vw, 0.8rem)' }}>{amenity.title}</h4>
      </div>
      <p className="text-slate-400 font-medium leading-snug line-clamp-2" style={{ fontSize: 'clamp(0.575rem, 0.8vw, 0.7rem)' }}>
        {amenity.subtitle || amenity.description}
      </p>
    </div>

    {/* Hover footer */}
    <div className="px-3 py-1.5 border-t border-white/5 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity bg-primary/5">
      <span className="text-primary font-black uppercase tracking-widest" style={{ fontSize: 'clamp(0.45rem, 0.6vw, 0.55rem)' }}>Details</span>
      <span className="material-symbols-outlined text-primary" style={{ fontSize: '13px' }}>arrow_forward</span>
    </div>
  </button>
);

export default DetailsView;
