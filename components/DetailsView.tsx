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
      <div className="flex items-center bg-background-dark/95 backdrop-blur-xl px-4 py-3 lg:px-6 lg:py-4 border-b border-white/5 shrink-0">
        <button onClick={onBack} className="text-white flex size-11 items-center justify-center hover:bg-white/5 rounded-xl transition-all shrink-0">
          <span className="material-symbols-outlined" style={{ fontSize: 'clamp(1.5rem, 2.5vw, 2rem)' }}>arrow_back</span>
        </button>
        <div className="flex flex-col flex-1 text-center px-2 min-w-0">
          <h2 className="font-black tracking-tighter uppercase text-white truncate" style={{ fontSize: 'clamp(1rem, 2vw, 1.75rem)' }}>{roomName}</h2>
          <p className="text-primary font-black uppercase mt-0.5 truncate" style={{ fontSize: 'clamp(0.55rem, 0.85vw, 0.75rem)', letterSpacing: '0.3em' }}>{roomLocation}</p>
        </div>
        <button
          onClick={onBook}
          className="shrink-0 bg-primary text-white font-black rounded-xl border border-primary/50 uppercase tracking-widest hover:brightness-110 active:scale-95 transition-all"
          style={{ fontSize: 'clamp(0.625rem, 0.9vw, 0.75rem)', padding: 'clamp(0.4rem, 1vh, 0.6rem) clamp(0.75rem, 1.5vw, 1.25rem)' }}
        >
          Reserve
        </button>
      </div>

      <main className="flex-1 overflow-y-auto custom-scrollbar" style={{ padding: 'clamp(0.75rem, 2vw, 2rem)' }}>
        <div className="max-w-7xl mx-auto grid grid-cols-1 tablet:grid-cols-2 gap-4 lg:gap-6 min-h-full">

          {/* ── Left Column: Room Info ── */}
          <div className="flex flex-col gap-4 h-full">

            {/* Room photo */}
            <div
              className="rounded-xl border border-white/10 bg-cover bg-center shadow-2xl overflow-hidden relative shrink-0 bg-white/5"
              style={{ height: 'clamp(140px, 26vh, 300px)' }}
            >
              {!imageUrl && (
                <div className="absolute inset-0 flex items-center justify-center text-white/10">
                  <span className="material-symbols-outlined" style={{ fontSize: 'clamp(4rem, 10vw, 7rem)' }}>meeting_room</span>
                </div>
              )}
              {imageUrl && <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url("${imageUrl}")` }} />}
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
              <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-lg border border-white/10">
                <span className="flex h-1.5 w-1.5 rounded-full bg-status-available animate-pulse"></span>
                <span className="text-white font-black uppercase tracking-widest" style={{ fontSize: 'clamp(0.5rem, 0.7vw, 0.65rem)' }}>Live</span>
              </div>
            </div>

            {/* Quick stats strip */}
            <div className="grid grid-cols-3 gap-2 shrink-0">
              <div className="bg-white/[0.03] border border-white/5 rounded-xl flex flex-col items-center justify-center gap-1 py-3">
                <span className="material-symbols-outlined text-primary" style={{ fontSize: 'clamp(1.1rem, 1.8vw, 1.5rem)' }}>groups</span>
                <span className="text-white font-black" style={{ fontSize: 'clamp(0.8rem, 1.4vw, 1.125rem)' }}>{capacity}</span>
                <span className="text-slate-400 font-black uppercase" style={{ fontSize: 'clamp(0.5rem, 0.65vw, 0.6rem)', letterSpacing: '0.2em' }}>Persons</span>
              </div>
              <div className="bg-white/[0.03] border border-status-available/20 rounded-xl flex flex-col items-center justify-center gap-1 py-3">
                <span className="material-symbols-outlined text-status-available font-variation-fill" style={{ fontSize: 'clamp(1.1rem, 1.8vw, 1.5rem)' }}>check_circle</span>
                <span className="text-status-available font-black" style={{ fontSize: 'clamp(0.7rem, 1.1vw, 0.875rem)' }}>Available</span>
                <span className="text-slate-400 font-black uppercase" style={{ fontSize: 'clamp(0.5rem, 0.65vw, 0.6rem)', letterSpacing: '0.2em' }}>Status</span>
              </div>
              <div className="bg-white/[0.03] border border-white/5 rounded-xl flex flex-col items-center justify-center gap-1 py-3 px-2">
                <span className="material-symbols-outlined text-primary" style={{ fontSize: 'clamp(1.1rem, 1.8vw, 1.5rem)' }}>location_on</span>
                <span className="text-white font-black text-center leading-tight truncate w-full text-center" style={{ fontSize: 'clamp(0.55rem, 0.8vw, 0.7rem)' }}>{roomLocation.split('•')[0].trim()}</span>
                <span className="text-slate-400 font-black uppercase" style={{ fontSize: 'clamp(0.5rem, 0.65vw, 0.6rem)', letterSpacing: '0.2em' }}>Floor</span>
              </div>
            </div>

            {/* Description */}
            <div className="flex flex-col gap-3 flex-1 bg-white/[0.02] border border-white/5 rounded-xl p-4">
              <div className="flex items-center gap-2 pb-2 border-b border-white/5">
                <span className="material-symbols-outlined text-primary" style={{ fontSize: 'clamp(1rem, 1.5vw, 1.25rem)' }}>info</span>
                <span className="text-primary font-black uppercase tracking-[0.3em]" style={{ fontSize: 'clamp(0.55rem, 0.8vw, 0.7rem)' }}>About This Room</span>
              </div>
              <p className="text-slate-200 font-medium leading-relaxed" style={{ fontSize: 'clamp(0.8rem, 1.2vw, 1rem)' }}>
                {description || 'Premier meeting space designed for high-stakes decision making and global collaboration. Featuring state-of-the-art acoustic treatment, ergonomic seating, and integrated smart technology to ensure seamless communication.'}
              </p>
              <div className="mt-auto pt-3">
                <button
                  onClick={onBook}
                  className="w-full bg-white text-black font-black rounded-xl shadow-xl shadow-white/10 hover:bg-slate-100 active:scale-95 transition-all border-t border-white/20 uppercase tracking-[0.2em] flex items-center justify-center gap-2"
                  style={{ padding: 'clamp(0.65rem, 1.5vh, 1.1rem)', fontSize: 'clamp(0.75rem, 1.1vw, 0.9rem)' }}
                >
                  <span className="material-symbols-outlined font-variation-fill" style={{ fontSize: 'clamp(1rem, 1.5vw, 1.25rem)' }}>event_available</span>
                  Reserve Now
                </button>
              </div>
            </div>
          </div>

          {/* ── Right Column: Amenities ── */}
          <div className="flex flex-col gap-4 h-full">
            <div className="flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary" style={{ fontSize: 'clamp(1.1rem, 1.8vw, 1.5rem)' }}>inventory_2</span>
                <h3 className="font-black tracking-tight text-white uppercase" style={{ fontSize: 'clamp(0.9rem, 1.5vw, 1.25rem)' }}>Room Amenities</h3>
                {amenities.length > 0 && (
                  <span className="px-2 py-0.5 bg-primary/10 border border-primary/20 rounded-full text-primary font-black" style={{ fontSize: 'clamp(0.55rem, 0.8vw, 0.7rem)' }}>{amenities.length}</span>
                )}
              </div>
              {amenities.length > 0 && (
                <p className="text-slate-400 font-black uppercase" style={{ fontSize: 'clamp(0.5rem, 0.7vw, 0.625rem)', letterSpacing: '0.2em' }}>Tap for details</p>
              )}
            </div>

            {amenities.length > 0 ? (
              <div className="grid grid-cols-2 gap-3 flex-1" style={{ gridAutoRows: 'minmax(clamp(140px, 20vh, 240px), 1fr)' }}>
                {amenities.map((amenity) => (
                  <AmenityCard
                    key={amenity.id}
                    amenity={amenity}
                    onClick={() => setSelectedAmenity(amenity)}
                  />
                ))}
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center gap-4 text-white/20 border border-white/5 rounded-xl bg-white/[0.02]">
                <span className="material-symbols-outlined" style={{ fontSize: 'clamp(2.5rem, 5vw, 4rem)' }}>category</span>
                <p className="font-black uppercase tracking-widest" style={{ fontSize: 'clamp(0.625rem, 0.9vw, 0.75rem)' }}>No amenities configured</p>
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
            {/* Modal Header */}
            <div className="px-6 py-3 border-b border-white/5 flex items-center justify-between bg-white/[0.02] shrink-0">
              <span className="text-slate-400 font-black uppercase tracking-[0.4em]" style={{ fontSize: 'clamp(0.55rem, 0.8vw, 0.7rem)' }}>Amenity Details</span>
              <button
                onClick={() => setSelectedAmenity(null)}
                className="size-8 rounded-xl bg-white/5 border border-white/10 text-white flex items-center justify-center hover:bg-white/10 transition-all"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            {/* Scrollable body */}
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              {/* Optional image */}
              {selectedAmenity.img && (
                <div
                  className="w-full overflow-hidden relative bg-black/60 shrink-0"
                  style={{ height: 'clamp(140px, 28vh, 280px)' }}
                >
                  <img
                    src={selectedAmenity.img}
                    alt={selectedAmenity.title}
                    className="w-full h-full object-contain object-center"
                  />
                  <div className="absolute inset-0 bg-gradient-to-b from-card-dark/30 to-transparent pointer-events-none" />
                  <span className="absolute bottom-3 right-4 font-black text-white/20 uppercase tracking-[0.3em]" style={{ fontSize: 'clamp(0.45rem, 0.6vw, 0.55rem)' }}>Hardware Visualization</span>
                </div>
              )}

              {/* Info section */}
              <div className="flex flex-col gap-5" style={{ padding: 'clamp(1rem, 2.5vw, 1.75rem)' }}>
                {/* Title row */}
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4 min-w-0">
                    <div
                      className="rounded-xl bg-primary/20 flex items-center justify-center text-primary border border-primary/20 shadow-lg shrink-0"
                      style={{ width: 'clamp(2.5rem, 4vw, 3.5rem)', height: 'clamp(2.5rem, 4vw, 3.5rem)' }}
                    >
                      <span className="material-symbols-outlined font-variation-fill" style={{ fontSize: 'clamp(1.25rem, 2vw, 1.75rem)' }}>{selectedAmenity.icon}</span>
                    </div>
                    <h3 className="font-black text-white tracking-tighter uppercase leading-tight" style={{ fontSize: 'clamp(1.25rem, 2.5vw, 2rem)' }}>{selectedAmenity.title}</h3>
                  </div>
                  {selectedAmenity.quantity && (
                    <div className="shrink-0 px-3 py-1.5 bg-white/5 rounded-xl border border-white/10">
                      <span className="text-white font-black uppercase tracking-widest" style={{ fontSize: 'clamp(0.625rem, 0.9vw, 0.75rem)' }}>{selectedAmenity.quantity}</span>
                    </div>
                  )}
                </div>

                <div className="h-px bg-white/10 w-full" />

                {/* Description */}
                <p className="text-slate-200 font-medium leading-relaxed" style={{ fontSize: 'clamp(0.8rem, 1.3vw, 1rem)' }}>
                  {selectedAmenity.description}
                </p>

                {/* Status + action */}
                <div className="flex items-center justify-between pt-1">
                  <div className="flex flex-col gap-1">
                    <p className="text-slate-400 font-black uppercase tracking-widest" style={{ fontSize: 'clamp(0.55rem, 0.75vw, 0.65rem)' }}>Health Status</p>
                    <div className="flex items-center gap-2">
                      <span className="size-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]"></span>
                      <span className="text-emerald-400 font-black uppercase tracking-widest" style={{ fontSize: 'clamp(0.7rem, 1vw, 0.875rem)' }}>{selectedAmenity.status}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedAmenity(null)}
                    className="bg-white text-black font-black rounded-xl shadow-lg shadow-white/10 hover:bg-slate-100 active:scale-95 transition-all uppercase tracking-widest"
                    style={{ padding: 'clamp(0.6rem, 1.2vh, 0.875rem) clamp(1.5rem, 3vw, 2.5rem)', fontSize: 'clamp(0.625rem, 0.9vw, 0.75rem)' }}
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
    className="group relative flex flex-col bg-white/[0.03] border border-white/5 rounded-xl text-left transition-all duration-300 hover:bg-white/[0.07] hover:border-primary/30 hover:-translate-y-0.5 active:scale-[0.98] overflow-hidden h-full"
  >
    {/* Image or icon backdrop */}
    {amenity.img ? (
      <div
        className="w-full overflow-hidden relative shrink-0 bg-black/60"
        style={{ height: 'clamp(80px, 14vh, 150px)' }}
      >
        <img
          src={amenity.img}
          alt={amenity.title}
          className="w-full h-full object-contain object-center transition-transform duration-700 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent pointer-events-none" />
      </div>
    ) : (
      <div
        className="w-full flex items-center justify-center bg-primary/5 border-b border-white/5 shrink-0"
        style={{ height: 'clamp(60px, 10vh, 100px)' }}
      >
        <span className="material-symbols-outlined text-primary/30 font-variation-fill" style={{ fontSize: 'clamp(2rem, 4vw, 3.5rem)' }}>{amenity.icon}</span>
      </div>
    )}

    {/* Info */}
    <div className="flex-1 flex flex-col p-3 gap-1.5 min-h-0">
      <div className="flex items-center gap-2">
        <div className="size-6 rounded-lg bg-primary/20 border border-primary/20 flex items-center justify-center text-primary shrink-0">
          <span className="material-symbols-outlined font-variation-fill" style={{ fontSize: '13px' }}>{amenity.icon}</span>
        </div>
        <h4 className="text-white font-black tracking-tight uppercase leading-none truncate" style={{ fontSize: 'clamp(0.65rem, 1vw, 0.825rem)' }}>{amenity.title}</h4>
      </div>
      <p className="text-slate-400 font-medium leading-snug line-clamp-2" style={{ fontSize: 'clamp(0.6rem, 0.85vw, 0.725rem)' }}>
        {amenity.subtitle || amenity.description}
      </p>
    </div>

    {/* Hover indicator */}
    <div className="shrink-0 px-3 py-1.5 border-t border-white/5 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity bg-primary/5">
      <span className="text-primary font-black uppercase tracking-widest" style={{ fontSize: 'clamp(0.5rem, 0.65vw, 0.6rem)' }}>View Details</span>
      <span className="material-symbols-outlined text-primary" style={{ fontSize: '14px' }}>arrow_forward</span>
    </div>
  </button>
);

export default DetailsView;
