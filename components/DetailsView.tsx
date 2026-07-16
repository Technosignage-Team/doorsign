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
  isAvailable?: boolean;
}

const DetailsView: React.FC<DetailsViewProps> = ({
  onBack,
  onBook,
  roomName = 'Conference Room A',
  capacity = 12,
  imageUrl,
  amenities = [],
  isAvailable = true,
}) => {
  const [selectedAmenity, setSelectedAmenity] = useState<Amenity | null>(null);
  const [showLayoutModal, setShowLayoutModal] = useState(false);
  const [supportRequested] = useState(false);
  const [supportSubject] = useState('General');

  return (
    <div className="flex flex-col h-full overflow-hidden bg-background-dark text-white">

      {/* Sticky Header */}
      <header className="flex items-center justify-between p-4 lg:p-6 border-b border-white/5 bg-black/20 backdrop-blur-xl relative z-10 shrink-0">
        <div className="flex items-center gap-6">
          <button
            onClick={onBack}
            className="size-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-200 hover:text-white hover:bg-white/10 transition-all active:scale-95 shrink-0"
          >
            <span className="material-symbols-outlined text-2xl font-black">arrow_back</span>
          </button>
          <div className="flex flex-col">
            <h1 className="text-xl lg:text-2xl xl:text-3xl font-black text-white tracking-tighter leading-none">
              Resource Details
            </h1>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto xl:overflow-hidden custom-scrollbar xl:flex xl:flex-col">

        {/* Main Photo — height bounded via CSS landscape classes, no JS orientation check */}
        <div
          className="w-full h-[260px] sm:h-[320px] md:h-[400px] lg:h-[440px] xl:h-[240px] xl:shrink-0 bg-cover bg-center bg-no-repeat relative overflow-hidden shrink-0 border-b border-white/10 animate-in fade-in duration-500 bg-white/5"
          style={imageUrl ? { backgroundImage: `url("${imageUrl}")` } : {}}
        >
          {!imageUrl && (
            <div className="absolute inset-0 flex items-center justify-center text-white/10">
              <span className="material-symbols-outlined text-[80px]">meeting_room</span>
            </div>
          )}
          <div className="absolute top-6 left-6 sm:top-8 sm:left-8 flex flex-col">
            <h2 className="text-2xl sm:text-3xl lg:text-5xl xl:text-4xl font-black uppercase tracking-tight text-white leading-[0.95] drop-shadow-[0_4px_12px_rgba(0,0,0,0.8)]">
              {roomName}
            </h2>
          </div>
        </div>

        {/* Inner Padding Container */}
        <div className="max-w-4xl xl:max-w-7xl xl:flex-1 mx-auto px-6 md:px-8 xl:px-14 py-8 xl:pt-5 xl:pb-3 flex flex-col gap-8 xl:gap-4 xl:overflow-hidden">

          {/* Status / Capacity / Size / Layout badges */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 xl:gap-6 xl:shrink-0">
            <div className={`px-6 py-2 xl:px-14 xl:py-4 rounded-full border text-xs xl:text-xl font-black uppercase tracking-widest flex items-center gap-2 xl:gap-5 ${
              isAvailable
                ? 'bg-status-available/10 border-status-available/20 text-status-available'
                : 'bg-status-busy/10 border-status-busy/20 text-status-busy'
            }`}>
              <span className={`size-2 xl:size-3 rounded-full ${isAvailable ? 'bg-status-available' : 'bg-status-busy'} animate-pulse`} />
              {isAvailable ? 'Available' : 'Busy'}
            </div>

            <div className="px-6 py-2 xl:px-14 xl:py-4 rounded-full border border-white/10 bg-white/5 text-xs xl:text-xl font-black uppercase tracking-widest flex items-center gap-2 xl:gap-5 text-slate-200">
              <span className="material-symbols-outlined text-base xl:text-4xl">groups</span>
              {capacity} Seats
            </div>

            <div className="px-6 py-2 xl:px-14 xl:py-4 rounded-full border border-white/10 bg-white/5 text-xs xl:text-xl font-black uppercase tracking-widest flex items-center gap-2 xl:gap-5 text-slate-200">
              <span className="material-symbols-outlined text-base xl:text-4xl">square_foot</span>
              45 m²
            </div>

            <button
              onClick={() => setShowLayoutModal(true)}
              className="px-6 py-2 xl:px-14 xl:py-4 rounded-full border border-white/10 bg-primary/20 hover:bg-primary/30 text-white text-xs xl:text-xl font-black uppercase tracking-widest flex items-center gap-2 xl:gap-5 transition-all active:scale-95"
            >
              <span className="material-symbols-outlined text-base xl:text-4xl text-primary">map</span>
              Layout
            </button>
          </div>

          {/* Room Amenities Section — grid in portrait, horizontal scroll in landscape via CSS only */}
          <div className="flex flex-col gap-4 mt-2 max-w-full overflow-hidden xl:flex-1 xl:min-h-0">
            <div className="flex items-center justify-between xl:shrink-0">
              <h3 className="text-xl lg:text-2xl xl:text-3xl font-black tracking-tight text-white uppercase">Amenities</h3>
            </div>

            {amenities.length > 0 ? (
              <div className="grid grid-cols-3 gap-3 sm:gap-4 md:grid-cols-4 xl:grid-cols-6 xl:gap-4 w-full">
                {amenities.map((amenity) => (
                  <AmenityCard
                    key={amenity.id}
                    amenity={amenity}
                    onClick={() => setSelectedAmenity(amenity)}
                  />
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-14 gap-3 text-white/20 rounded-2xl border border-white/5">
                <span className="material-symbols-outlined text-5xl">category</span>
                <p className="text-[10px] font-black uppercase tracking-widest">No amenities listed</p>
              </div>
            )}
          </div>

        </div>
      </main>

      {/* Sticky Footer */}
      <div className="w-full border-t border-white/5 bg-background-dark p-4 sm:p-6 pb-28 md:pb-6 xl:pb-8 shrink-0 relative z-10">
        <div className="max-w-4xl mx-auto flex items-center justify-center">
          <button
            onClick={onBook}
            className="px-12 xl:px-20 py-4 xl:py-5 bg-primary hover:brightness-110 text-white font-black rounded-full flex items-center justify-center gap-2.5 text-xs sm:text-sm xl:text-base uppercase tracking-widest transition-all active:scale-95 shadow-lg shadow-primary/20 cursor-pointer"
          >
            <span className="material-symbols-outlined text-xl font-variation-fill">add_circle</span>
            Book
          </button>
        </div>
      </div>

      {/* Support Requested Toast */}
      {supportRequested && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[110] bg-primary border border-primary/20 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <span className="material-symbols-outlined text-2xl font-variation-fill">support_agent</span>
          <div className="flex flex-col">
            <p className="text-xs font-black uppercase tracking-widest">Assistance Requested</p>
            <p className="text-[10px] text-white/95 font-bold">
              {supportSubject === 'General'
                ? 'Tech-support is dispatched to this room'
                : `Tech-support dispatched for ${supportSubject}`}
            </p>
          </div>
        </div>
      )}

      {/* Room Layout Modal */}
      {showLayoutModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 sm:p-12 animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-black/90 backdrop-blur-2xl" onClick={() => setShowLayoutModal(false)} />
          <div className="relative w-full max-w-2xl bg-card-dark rounded-3xl border border-white/10 shadow-[0_0_100px_rgba(0,0,0,0.8)] overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col">
            <div className="px-8 py-4 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-xl">map</span>
                <h2 className="text-[9px] font-black text-slate-300 uppercase tracking-[0.4em]">Room Layout & Map</h2>
              </div>
              <button
                onClick={() => setShowLayoutModal(false)}
                className="size-10 rounded-xl bg-white/5 border border-white/10 text-white flex items-center justify-center hover:bg-white/10 transition-all active:scale-95"
              >
                <span className="material-symbols-outlined text-xl">close</span>
              </button>
            </div>

            <div className="p-6 md:p-8 flex flex-col gap-6 items-center justify-center">
              <div className="w-full aspect-[4/3] max-h-[350px] relative rounded-2xl overflow-hidden bg-black/40 border border-white/10 flex items-center justify-center">
                <img
                  src="https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&q=80&w=1000"
                  alt="Boardroom Floor Plan Blueprint Layout"
                  className="w-full h-full object-cover opacity-80"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30 flex flex-col justify-between p-6">
                  <div className="flex justify-between items-start">
                    <span className="text-[9px] font-mono text-primary bg-primary/10 border border-primary/20 px-2 py-1 rounded">ZONE-A // MAIN_BOARD</span>
                    <span className="text-[9px] font-mono text-slate-400">1:50 SCALE</span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <p className="text-white font-black text-lg uppercase tracking-wider">Presentation Layout</p>
                    <p className="text-slate-400 text-xs font-medium">U-Shaped Ergonomic Arrangement • Dual Smart Screen Setup</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 w-full">
                <div className="bg-white/[0.02] border border-white/5 rounded-xl p-4 flex flex-col items-center justify-center text-center">
                  <span className="material-symbols-outlined text-primary text-xl mb-1">chair</span>
                  <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Main Seats</p>
                  <p className="text-white font-black text-sm mt-0.5">{capacity} Ergonomic</p>
                </div>
                <div className="bg-white/[0.02] border border-white/5 rounded-xl p-4 flex flex-col items-center justify-center text-center">
                  <span className="material-symbols-outlined text-primary text-xl mb-1">aspect_ratio</span>
                  <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Perimeter</p>
                  <p className="text-white font-black text-sm mt-0.5">4 Guest Chairs</p>
                </div>
                <div className="bg-white/[0.02] border border-white/5 rounded-xl p-4 flex flex-col items-center justify-center text-center">
                  <span className="material-symbols-outlined text-primary text-xl mb-1">space_dashboard</span>
                  <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Area Size</p>
                  <p className="text-white font-black text-sm mt-0.5">45 m² (484 sq ft)</p>
                </div>
              </div>
            </div>

            <div className="px-8 py-4 border-t border-white/5 bg-white/[0.01] flex justify-end">
              <button
                onClick={() => setShowLayoutModal(false)}
                className="px-6 py-2.5 bg-primary text-white font-black rounded-full hover:brightness-110 active:scale-95 transition-all text-xs uppercase tracking-widest"
              >
                Close Layout
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Amenity Detail Modal */}
      {selectedAmenity && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 sm:p-12 animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-black/90 backdrop-blur-2xl" onClick={() => setSelectedAmenity(null)} />
          <div className="relative w-full max-w-3xl max-h-[90vh] bg-card-dark rounded-3xl border border-white/10 shadow-[0_0_100px_rgba(0,0,0,0.8)] overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col">
            <div className="px-10 py-5 border-b border-white/5 flex items-center justify-between bg-white/[0.02] shrink-0">
              <h2 className="text-sm font-black text-slate-300 uppercase tracking-[0.5em]">Amenity Details</h2>
              <button
                onClick={() => setSelectedAmenity(null)}
                className="size-11 rounded-xl bg-white/5 border border-white/10 text-white flex items-center justify-center hover:bg-white/10 transition-all"
              >
                <span className="material-symbols-outlined text-2xl">close</span>
              </button>
            </div>

            <div className="p-10 lg:p-12 flex flex-col gap-7 overflow-y-auto custom-scrollbar">
              <div className="flex items-center gap-5">
                <div className="size-20 rounded-2xl bg-primary/20 flex items-center justify-center text-primary border border-primary/20 shadow-lg shrink-0">
                  <span className="material-symbols-outlined text-4xl font-variation-fill">{selectedAmenity.icon}</span>
                </div>
                <div className="flex flex-col">
                  <h3 className="text-3xl lg:text-4xl font-black text-white tracking-tighter uppercase leading-none">{selectedAmenity.title}</h3>
                </div>
              </div>

              {selectedAmenity.img && (
                <div className="w-full aspect-[21/9] rounded-2xl overflow-hidden bg-black/40 border border-white/10 shrink-0">
                  <img
                    src={selectedAmenity.img}
                    alt={selectedAmenity.title}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                </div>
              )}

              <div className="h-px bg-white/10 w-full" />

              <p className="text-white text-xl font-normal leading-relaxed">
                {selectedAmenity.description}
              </p>

              <div className="grid grid-cols-2 gap-5 bg-white/[0.02] border border-white/5 rounded-2xl p-6">
                <div className="flex flex-col gap-2">
                  <p className="text-slate-500 text-sm font-black uppercase tracking-widest">Quantity</p>
                  <p className="text-white font-black text-lg">{selectedAmenity.quantity || 'Standard Facility'}</p>
                </div>
                <div className="flex flex-col gap-2">
                  <p className="text-slate-500 text-sm font-black uppercase tracking-widest">Current Status</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="size-2 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.5)]" />
                    <span className="text-white font-black uppercase text-base tracking-widest">{selectedAmenity.status}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  onClick={() => setSelectedAmenity(null)}
                  className="w-full py-5 bg-white text-black font-black rounded-full shadow-lg shadow-white/5 hover:bg-slate-100 active:scale-95 transition-all text-base uppercase tracking-widest text-center"
                >
                  Got it
                </button>
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
    className="group relative flex flex-col items-center justify-center text-center bg-white/[0.03] border border-white/5 rounded-2xl transition-all duration-300 hover:bg-white/[0.07] hover:border-white/20 hover:scale-[1.03] active:scale-95 p-4 sm:p-5 xl:p-6 w-full aspect-[4/5] xl:aspect-auto xl:h-[210px] shrink-0 overflow-hidden"
  >
    <div className="size-14 sm:size-20 md:size-24 xl:size-28 rounded-xl bg-primary/20 border border-primary/20 flex items-center justify-center text-primary group-hover:scale-110 transition-transform mb-3 shrink-0">
      <span className="material-symbols-outlined text-3xl sm:text-4xl md:text-5xl xl:text-5xl font-variation-fill">{amenity.icon}</span>
    </div>
    <div className="flex flex-col items-center w-full min-w-0">
      <h4 className="text-white text-xs sm:text-sm md:text-base xl:text-lg font-black tracking-tight leading-tight text-center uppercase line-clamp-2 w-full">{amenity.title}</h4>
    </div>
  </button>
);

export default DetailsView;
