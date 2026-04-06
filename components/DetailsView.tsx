import React, { useState } from 'react';
import { Amenity } from '../types';

interface DetailsViewProps {
  onBack: () => void;
  onBook: () => void;
  roomName?: string;
  roomLocation?: string;
  amenities?: Amenity[];
}

const DetailsView: React.FC<DetailsViewProps> = ({ onBack, onBook, roomName = 'Conference Room A', roomLocation = 'Nile Business Center – Tower A • Level 1', amenities = [] }) => {
  const [selectedAmenity, setSelectedAmenity] = useState<Amenity | null>(null);

  return (
    <div className="flex flex-col h-full overflow-hidden bg-background-dark text-white">
      {/* Sticky Header */}
      <div className="flex items-center bg-background-dark/95 backdrop-blur-xl p-6 border-b border-white/5 shrink-0">
        <button onClick={onBack} className="text-white flex size-12 items-center justify-center hover:bg-white/5 hover:text-white rounded-none transition-all">
          <span className="material-symbols-outlined text-3xl">arrow_back</span>
        </button>
        <div className="flex flex-col flex-1 text-center">
          <h2 className="text-2xl font-black tracking-tighter uppercase text-white">{roomName}</h2>
          <p className="text-[9px] font-black text-primary tracking-[0.4em] uppercase mt-1">
            {roomLocation}
          </p>
        </div>
        <button className="size-12 flex items-center justify-center text-white hover:bg-white/5 hover:text-white rounded-none transition-all">
          <span className="material-symbols-outlined text-2xl">share</span>
        </button>
      </div>

      <main className="flex-1 p-8 lg:p-12 overflow-y-auto custom-scrollbar">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-12 lg:gap-20">
          {/* Left Column: Media & Info */}
          <div className="flex flex-col gap-8">
            {/* Main Photo - Shorter height, rounded corners */}
            <div 
              className="aspect-[21/10] rounded-none border border-white/10 bg-cover bg-center shadow-2xl overflow-hidden relative group shrink-0"
              style={{ backgroundImage: 'url("https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&q=80&w=800")' }}
            >
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
              
              {/* Capacity Overlay on Photo */}
              <div className="absolute bottom-6 left-6 flex items-center gap-3 bg-black/60 backdrop-blur-md px-4 py-2 rounded-none border border-white/10">
                <span className="material-symbols-outlined text-primary text-xl">groups</span>
                <span className="text-white font-black text-sm uppercase tracking-widest">12 Persons</span>
              </div>

              <div className="absolute top-4 left-4 flex items-center gap-2 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-none border border-white/10">
                <span className="flex h-1.5 w-1.5 rounded-none bg-status-available animate-pulse"></span>
                <span className="text-white text-[8px] font-black uppercase tracking-widest">Live View</span>
              </div>
            </div>

            {/* Description / Overview */}
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-3 mb-1">
                <span className="text-status-available text-[9px] font-black uppercase tracking-widest">Room Ready</span>
                <span className="flex h-1.5 w-1.5 rounded-none bg-status-available animate-pulse"></span>
                <div className="h-px flex-1 bg-white/10" />
              </div>
              <p className="text-white text-lg lg:text-xl leading-relaxed font-medium">
                The premier meeting space designed for high-stakes decision making and global collaboration. 
                Featuring state-of-the-art acoustic treatment, ergonomic seating, and integrated smart technology 
                to ensure seamless communication.
              </p>

              {/* Small Reserve Now Button - Moved here */}
              <div className="mt-4 flex justify-center">
                <button 
                  onClick={onBook}
                  className="px-10 py-3.5 bg-primary text-white text-sm font-black rounded-none shadow-xl shadow-primary/20 hover:brightness-110 active:scale-95 transition-all border-t border-white/20 uppercase tracking-[0.2em]"
                >
                  Reserve Now
                </button>
              </div>
            </div>
          </div>

          {/* Right Column: Amenities */}
          <div className="flex flex-col gap-8">
            <div className="flex items-center justify-between">
              <h3 className="text-2xl font-black tracking-tight text-white uppercase">Room Amenities</h3>
              <p className="text-slate-100 font-bold text-[10px] uppercase tracking-widest">Click for details</p>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {amenities.map((amenity) => (
                <AmenityCard 
                  key={amenity.id}
                  amenity={amenity}
                  onClick={() => setSelectedAmenity(amenity)}
                />
              ))}
            </div>

          </div>
        </div>
      </main>

      {/* Amenity Detail Overlay */}
      {selectedAmenity && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 sm:p-12 animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-black/90 backdrop-blur-2xl" onClick={() => setSelectedAmenity(null)} />
          <div className="relative w-full max-w-xl bg-card-dark rounded-none border border-white/10 shadow-[0_0_100px_rgba(0,0,0,0.8)] overflow-hidden animate-in zoom-in-95 duration-300">
            {/* Modal Header */}
            <div className="px-8 py-4 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
              <h2 className="text-[9px] font-black text-slate-300 uppercase tracking-[0.5em]">Amenity Details</h2>
              <button 
                onClick={() => setSelectedAmenity(null)}
                className="size-8 rounded-none bg-white/5 border border-white/10 text-white flex items-center justify-center hover:bg-white/10 transition-all"
              >
                <span className="material-symbols-outlined text-xl">close</span>
              </button>
            </div>

            <div className="p-8 lg:p-10 flex flex-col gap-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="size-12 rounded-none bg-primary/20 flex items-center justify-center text-primary border border-primary/20 shadow-lg shrink-0">
                    <span className="material-symbols-outlined text-2xl font-variation-fill">{selectedAmenity.icon}</span>
                  </div>
                  <div className="flex flex-col">
                    <h3 className="text-2xl lg:text-3xl font-black text-white tracking-tighter uppercase leading-none">{selectedAmenity.title}</h3>
                    <p className="text-primary text-[9px] font-black uppercase tracking-[0.4em] mt-1.5">{selectedAmenity.subtitle}</p>
                  </div>
                </div>
                {selectedAmenity.quantity && (
                  <div className="px-4 py-2 bg-white/5 rounded-none border border-white/10">
                    <span className="text-white font-black text-xs uppercase tracking-widest">{selectedAmenity.quantity}</span>
                  </div>
                )}
              </div>

              <div className="h-px bg-white/10 w-full" />

              <p className="text-white text-base lg:text-lg font-medium leading-relaxed">
                {selectedAmenity.description}
              </p>

              <div className="flex items-center justify-between pt-2">
                <div className="flex flex-col gap-0.5">
                  <p className="text-slate-100 text-[9px] font-black uppercase tracking-widest">Health Status</p>
                  <div className="flex items-center gap-2">
                    <span className="size-1.5 rounded-none bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.5)]"></span>
                    <span className="text-white font-black uppercase text-xs tracking-widest">{selectedAmenity.status}</span>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedAmenity(null)}
                  className="px-8 py-3.5 bg-primary text-white font-black rounded-none shadow-lg shadow-primary/20 hover:brightness-110 active:scale-95 transition-all uppercase tracking-widest text-[10px]"
                >
                  Got it
                </button>
              </div>
            </div>

            {selectedAmenity.img && (
              <div className="w-full h-56 overflow-hidden border-t border-white/10 relative bg-black/60">
                <img
                  src={selectedAmenity.img}
                  alt={selectedAmenity.title}
                  className="w-full h-full object-contain object-center"
                />
                <div className="absolute inset-0 bg-gradient-to-b from-card-dark/40 to-transparent pointer-events-none" />
                <div className="absolute bottom-4 right-8 text-[7px] font-black text-white/20 uppercase tracking-[0.3em]">Hardware Visualization</div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const GalleryItem: React.FC<{ img: string; label: string }> = ({ img, label }) => (
  <div className="flex flex-col gap-4 group cursor-pointer">
    <div className="w-full bg-center bg-no-repeat aspect-[4/3] bg-cover rounded-none border-2 border-white/5 transition-all duration-500 group-hover:scale-[1.03] group-hover:border-primary/40 shadow-xl overflow-hidden" style={{ backgroundImage: `url(${img})` }} />
    <div className="px-2">
      <p className="text-white font-black text-sm uppercase tracking-[0.2em] opacity-80 group-hover:text-primary transition-colors">{label}</p>
    </div>
  </div>
);

const AmenityCard: React.FC<{ amenity: Amenity; onClick: () => void }> = ({ amenity, onClick }) => (
  <button 
    onClick={onClick}
    className="group relative flex flex-col bg-white/[0.03] border border-white/5 rounded-none text-left transition-all duration-300 hover:bg-white/[0.07] hover:border-white/20 hover:translate-y-[-4px] active:scale-95 overflow-hidden min-h-[160px]"
  >
    <div className="flex flex-col h-full w-full">
      <div className="flex-1 flex flex-col min-w-0 p-4">
        <div className="flex items-center gap-3 mb-2">
          <div className="size-10 rounded-none bg-primary/20 border border-primary/20 flex items-center justify-center text-primary group-hover:scale-110 transition-transform shrink-0">
            <span className="material-symbols-outlined text-xl font-variation-fill">{amenity.icon}</span>
          </div>
          <h4 className="text-white text-sm font-black tracking-tight truncate uppercase leading-none">{amenity.title}</h4>
        </div>
        <p className="text-slate-100 text-[8px] font-black uppercase tracking-widest mt-1 truncate">{amenity.subtitle}</p>
      </div>
      
      {amenity.img && (
        <div className="w-full h-36 overflow-hidden border-t border-white/10 relative shrink-0 bg-black/60">
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