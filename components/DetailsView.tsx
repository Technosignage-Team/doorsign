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
  onBack,
  onBook,
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
      <div className="flex items-center bg-background-dark/95 backdrop-blur-xl px-6 py-4 border-b border-white/5 shrink-0">
        <button
          onClick={onBack}
          className="text-white flex size-12 items-center justify-center hover:bg-white/5 rounded-xl transition-all shrink-0"
        >
          <span className="material-symbols-outlined text-3xl">arrow_back</span>
        </button>
        <div className="flex flex-col flex-1 text-center">
          <h2 className="text-2xl lg:text-3xl font-black tracking-tighter uppercase text-white">{roomName}</h2>
          <p className="text-xs font-black text-primary tracking-[0.4em] uppercase mt-1">{roomLocation}</p>
        </div>
        <button className="size-12 flex items-center justify-center text-white hover:bg-white/5 rounded-xl transition-all shrink-0">
          <span className="material-symbols-outlined text-2xl">share</span>
        </button>
      </div>

      {/* Main — fills remaining height, no browser scroll */}
      <main className="flex-1 overflow-hidden p-4 lg:p-6">
        <div className="h-full grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-6">

          {/* ── Left Column: Image + Description ── */}
          <div className="flex flex-col gap-4 h-full overflow-y-auto custom-scrollbar pr-1">

            {/* Room image */}
            <div
              className="rounded-xl border border-white/10 bg-cover bg-center shadow-2xl overflow-hidden relative bg-white/5 shrink-0"
              style={{
                backgroundImage: imageUrl ? `url("${imageUrl}")` : undefined,
                height: 'clamp(160px, 28vh, 300px)',
              }}
            >
              {!imageUrl && (
                <div className="absolute inset-0 flex items-center justify-center text-white/10">
                  <span className="material-symbols-outlined" style={{ fontSize: '80px' }}>meeting_room</span>
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

              <div className="absolute bottom-4 left-4 flex items-center gap-2 bg-black/60 backdrop-blur-md px-4 py-2 rounded-xl border border-white/10">
                <span className="material-symbols-outlined text-primary text-xl">groups</span>
                <span className="text-white font-black text-sm uppercase tracking-widest">{capacity} Persons</span>
              </div>

              <div className="absolute top-4 left-4 flex items-center gap-2 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10">
                <span className="flex h-2 w-2 rounded-full bg-status-available animate-pulse"></span>
                <span className="text-white text-xs font-black uppercase tracking-widest">Live View</span>
              </div>
            </div>

            {/* Description — flex-1 so it fills remaining left-column space */}
            <div className="flex-1 flex flex-col gap-4 bg-white/[0.03] border border-white/5 rounded-xl p-5 lg:p-7">
              <div className="flex items-center gap-3">
                <span className="text-status-available text-xs font-black uppercase tracking-widest">Room Ready</span>
                <span className="flex h-2 w-2 rounded-full bg-status-available animate-pulse"></span>
                <div className="h-px flex-1 bg-white/10" />
              </div>

              <p className="text-white text-base lg:text-lg leading-relaxed font-medium flex-1">
                {description ||
                  'Premier meeting space designed for high-stakes decision making and global collaboration. Featuring state-of-the-art acoustic treatment, ergonomic seating, and integrated smart technology to ensure seamless communication.'}
              </p>

              <button
                onClick={onBook}
                className="w-full py-4 bg-white text-black text-base font-black rounded-xl shadow-xl shadow-white/10 hover:bg-slate-100 active:scale-95 transition-all border-t border-white/20 uppercase tracking-[0.2em]"
              >
                Reserve Now
              </button>
            </div>
          </div>

          {/* ── Right Column: Amenities ── */}
          <div className="flex flex-col gap-4 h-full overflow-y-auto custom-scrollbar pr-1">
            <div className="flex items-center justify-between shrink-0">
              <h3 className="text-xl lg:text-2xl font-black tracking-tight text-white uppercase">Room Amenities</h3>
              <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">Tap for details</p>
            </div>

            {amenities.length > 0 ? (
              /* grid fills the remaining column height */
              <div className="grid grid-cols-2 gap-3 flex-1 content-start">
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
                <span className="material-symbols-outlined text-5xl">category</span>
                <p className="text-xs font-black uppercase tracking-widest">Loading amenities…</p>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Amenity Detail Modal */}
      {selectedAmenity && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 sm:p-12 animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-black/90 backdrop-blur-2xl" onClick={() => setSelectedAmenity(null)} />
          <div className="relative w-full max-w-xl bg-card-dark rounded-xl border border-white/10 shadow-[0_0_100px_rgba(0,0,0,0.8)] overflow-hidden animate-in zoom-in-95 duration-300">

            <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
              <h2 className="text-xs font-black text-slate-300 uppercase tracking-[0.5em]">Amenity Details</h2>
              <button
                onClick={() => setSelectedAmenity(null)}
                className="size-9 rounded-xl bg-white/5 border border-white/10 text-white flex items-center justify-center hover:bg-white/10 transition-all"
              >
                <span className="material-symbols-outlined text-xl">close</span>
              </button>
            </div>

            <div className="p-6 lg:p-8 flex flex-col gap-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="size-14 rounded-xl bg-primary/20 flex items-center justify-center text-primary border border-primary/20 shadow-lg shrink-0">
                    <span className="material-symbols-outlined text-3xl font-variation-fill">{selectedAmenity.icon}</span>
                  </div>
                  <h3 className="text-2xl lg:text-3xl font-black text-white tracking-tighter uppercase leading-none">{selectedAmenity.title}</h3>
                </div>
                {selectedAmenity.quantity && (
                  <div className="px-4 py-2 bg-white/5 rounded-xl border border-white/10">
                    <span className="text-white font-black text-sm uppercase tracking-widest">{selectedAmenity.quantity}</span>
                  </div>
                )}
              </div>

              <div className="h-px bg-white/10 w-full" />

              <p className="text-white text-base lg:text-lg font-medium leading-relaxed">
                {selectedAmenity.description}
              </p>

              <div className="flex items-center justify-between pt-1">
                <div className="flex flex-col gap-1">
                  <p className="text-slate-400 text-xs font-black uppercase tracking-widest">Health Status</p>
                  <div className="flex items-center gap-2">
                    <span className="size-2 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.5)]"></span>
                    <span className="text-white font-black uppercase text-sm tracking-widest">{selectedAmenity.status}</span>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedAmenity(null)}
                  className="px-8 py-3.5 bg-white text-black font-black rounded-xl shadow-lg shadow-white/10 hover:bg-slate-100 active:scale-95 transition-all uppercase tracking-widest text-sm"
                >
                  Got it
                </button>
              </div>
            </div>

            {selectedAmenity.img && (
              <div className="w-full h-48 lg:h-56 overflow-hidden border-t border-white/10 relative bg-black/60">
                <img
                  src={selectedAmenity.img}
                  alt={selectedAmenity.title}
                  className="w-full h-full object-contain object-center"
                />
                <div className="absolute inset-0 bg-gradient-to-b from-card-dark/40 to-transparent pointer-events-none" />
                <div className="absolute bottom-3 right-6 text-[8px] font-black text-white/20 uppercase tracking-[0.3em]">Hardware Visualization</div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const AmenityCard: React.FC<{ amenity: Amenity; onClick: () => void }> = ({ amenity, onClick }) => (
  <button
    onClick={onClick}
    className="group relative flex flex-col bg-white/[0.03] border border-white/5 rounded-xl text-left transition-all duration-300 hover:bg-white/[0.07] hover:border-white/20 hover:-translate-y-1 active:scale-95 overflow-hidden h-full min-h-[160px]"
  >
    <div className="flex flex-col h-full w-full">
      {/* Card header */}
      <div className="flex flex-col gap-2 p-4 lg:p-5">
        <div className="flex items-center gap-3">
          <div className="size-11 rounded-xl bg-primary/20 border border-primary/20 flex items-center justify-center text-primary group-hover:scale-110 transition-transform shrink-0">
            <span className="material-symbols-outlined text-2xl font-variation-fill">{amenity.icon}</span>
          </div>
          <div className="flex flex-col min-w-0">
            <h4 className="text-white text-sm lg:text-base font-black tracking-tight truncate uppercase leading-tight">{amenity.title}</h4>
            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-0.5 truncate">{amenity.subtitle}</p>
          </div>
        </div>
      </div>

      {/* Card image */}
      {amenity.img && (
        <div className="flex-1 overflow-hidden border-t border-white/10 relative bg-black/60 min-h-[100px]">
          <img
            src={amenity.img}
            alt={amenity.title}
            className="w-full h-full object-contain object-center transition-transform duration-700 group-hover:scale-110"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent pointer-events-none" />
        </div>
      )}
    </div>
  </button>
);

export default DetailsView;
