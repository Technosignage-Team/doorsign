import React, { useMemo, useState, useEffect } from 'react';
import { db } from '../lib/db';
import { Amenity } from '../types';

interface MeetingDetailsViewProps {
  meetingId: string;
  onBack: () => void;
  onEdit: (id: string) => void;
  onExtend: (id: string) => void;
  onEndNow: (id: string) => void;
  roomName?: string;
  capacity?: number;
  amenities?: Amenity[];
}

type ServiceType = 'CATERING' | 'SUPPORT' | 'CLEANING' | null;

const MeetingDetailsView: React.FC<MeetingDetailsViewProps> = ({ meetingId, onBack, onEdit, onExtend, onEndNow, roomName = 'Conference Room A', capacity, amenities = [] }) => {
  const [isAmenitiesOpen, setIsAmenitiesOpen] = useState(false);
  const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
  const [requestStatus, setRequestStatus] = useState<'IDLE' | 'PENDING' | 'SUCCESS'>('IDLE');
  const [activeService, setActiveService] = useState<ServiceType>(null);
  const [imgErrors, setImgErrors] = useState<Record<string, boolean>>({});
  
  const meeting = db.getMeetings().find(m => m.id === meetingId);

  const parseTimeString = (timeStr: string) => {
    const [time, modifier] = timeStr.split(' ');
    let [hours, minutes] = time.split(':').map(Number);
    if (modifier === 'PM' && hours < 12) hours += 12;
    if (modifier === 'AM' && hours === 12) hours = 0;
    const date = new Date();
    date.setHours(hours, minutes, 0, 0);
    return date;
  };

  const status = useMemo(() => {
    if (!meeting) return null;
    if (meeting.isCancelled) {
      return { 
        label: 'Cancelled', 
        color: 'text-red-500', 
        bg: 'bg-red-500/25', 
        border: 'border-red-500/40', 
        icon: 'cancel' 
      };
    }

    const now = new Date();
    const start = parseTimeString(meeting.startTime);
    const end = parseTimeString(meeting.endTime);
    const diffMins = Math.floor((start.getTime() - now.getTime()) / 60000);

    if (now >= start && now < end) {
      return { 
        label: 'On Going', 
        color: 'text-emerald-500', 
        bg: 'bg-emerald-500/25', 
        border: 'border-emerald-500/40', 
        icon: 'sensors',
        pulse: true,
        isCurrent: true
      };
    } else if (diffMins > 0 && diffMins <= 15) {
      return { 
        label: `Starting in ${diffMins}m`, 
        color: 'text-amber-500', 
        bg: 'bg-amber-500/25', 
        border: 'border-amber-500/40', 
        icon: 'notification_important',
        pulse: true
      };
    } else if (now < start) {
      return { 
        label: 'Scheduled', 
        color: 'text-primary', 
        bg: 'bg-primary/10', 
        border: 'border-primary/20', 
        icon: 'calendar_today' 
      };
    } else {
      return { 
        label: 'Completed', 
        color: 'text-slate-300', 
        bg: 'bg-white/5', 
        border: 'border-white/10', 
        icon: 'check_circle',
        isPast: true
      };
    }
  }, [meeting]);

  const handleServiceRequest = (type: ServiceType) => {
    setActiveService(type);
    setRequestStatus('PENDING');
    setTimeout(() => {
      setRequestStatus('SUCCESS');
      setTimeout(() => {
        setIsServiceModalOpen(false);
        setRequestStatus('IDLE');
        setActiveService(null);
      }, 1500);
    }, 1200);
  };

  if (!meeting) {
    return (
      <div className="flex items-center justify-center h-full text-slate-100">
        Meeting not found.
      </div>
    );
  }

  const isOngoing = status?.isCurrent;
  const isPast = status?.isPast;

  return (
    <div className="flex flex-col h-full bg-[#050505] overflow-hidden relative">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(19,127,236,0.05)_0%,transparent_100%)] pointer-events-none" />

      <header className="flex items-center justify-between p-4 lg:p-6 border-b border-white/5 bg-black/20 backdrop-blur-xl relative z-20 shrink-0">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="size-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-100 hover:text-white transition-all">
            <span className="material-symbols-outlined text-xl">arrow_back</span>
          </button>
          <div className="flex flex-col">
            <h1 className="text-2xl font-black text-white tracking-tighter leading-none uppercase">Meeting Details</h1>
            <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.4em] mt-1">Everest Boardroom • Core Information</p>
          </div>
        </div>
        <button className="size-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary hover:bg-primary hover:text-white transition-all shadow-[0_0_20px_rgba(19,127,236,0.2)]">
          <span className="material-symbols-outlined text-2xl font-variation-fill">grid_view</span>
        </button>
      </header>

      <main className="flex-1 overflow-hidden p-4 lg:p-10 relative z-10 flex flex-col items-center justify-center">
        <div className="w-full max-w-5xl flex flex-col gap-6">
          
          <div className="bg-white/[0.03] border border-white/10 rounded-[40px] p-8 lg:p-12 shadow-[0_40px_100px_rgba(0,0,0,0.8)] relative overflow-hidden backdrop-blur-md">
             <div className="absolute top-0 right-0 size-96 bg-primary/5 blur-[100px] rounded-full pointer-events-none -translate-y-1/2 translate-x-1/2" />
             {/* Card Top Row */}
             <div className="flex items-start justify-between mb-2">
                <div className="px-5 py-1.5 rounded-full bg-[#0a2342] text-[#137fec] border border-[#137fec]/30 text-[10px] font-black uppercase tracking-[0.2em] shadow-lg">
                   {meeting.type} Session
                </div>
                <div className="flex items-center gap-4">
                   <button 
                     onClick={() => setIsServiceModalOpen(true)}
                     className="size-12 rounded-2xl bg-[#ff9800]/5 border border-[#ff9800]/20 flex items-center justify-center text-[#ff9800] hover:bg-[#ff9800] hover:text-white transition-all active:scale-95 group shadow-xl"
                   >
                     <span className="material-symbols-outlined text-2xl font-variation-fill">notifications_active</span>
                   </button>
                   <div className="flex items-center gap-2 px-5 py-1.5 rounded-xl bg-[#0a2342] border border-[#137fec]/30 text-[#137fec] shadow-lg">
                      <span className="material-symbols-outlined text-lg">calendar_today</span>
                      <span className="text-[10px] font-black uppercase tracking-widest">{status?.label}</span>
                   </div>
                </div>
             </div>

             {/* Title Section */}
             <h2 className={`text-5xl lg:text-6xl font-black tracking-tighter leading-tight mb-12 ${meeting.isCancelled ? 'text-slate-400 line-through' : 'text-white'}`}>
               {meeting.title}
             </h2>

             {/* Info Bar Section */}
             <div className="grid grid-cols-2 gap-12 py-8 border-y border-white/10 mb-10">
                <div className="flex items-center gap-5">
                   <div className="size-14 rounded-2xl bg-[#0a2342] flex items-center justify-center text-[#137fec] border border-[#137fec]/20 shadow-inner">
                     <span className="material-symbols-outlined text-3xl font-variation-fill">schedule</span>
                   </div>
                   <div className="flex flex-col">
                      <span className="text-slate-400 text-[10px] font-black uppercase tracking-[0.3em] mb-1">Duration</span>
                      <span className="text-3xl font-black text-white tracking-tight">
                        {meeting.startTime} - {meeting.endTime}
                      </span>
                   </div>
                </div>
                <div className="flex items-center gap-5">
                   <div className="size-14 rounded-2xl bg-white/5 border border-white/10 overflow-hidden shadow-2xl relative">
                     {meeting.organizerPhoto ? (
                       <img src={meeting.organizerPhoto} className="size-full object-cover" alt={meeting.organizer} referrerPolicy="no-referrer" />
                     ) : (
                       <span className="material-symbols-outlined text-3xl text-primary font-variation-fill absolute inset-0 flex items-center justify-center">person</span>
                     )}
                   </div>
                   <div className="flex flex-col">
                      <span className="text-slate-400 text-[10px] font-black uppercase tracking-[0.3em] mb-1">Lead Organizer</span>
                      <span className="text-3xl font-black text-white tracking-tight">
                        {meeting.organizer}
                      </span>
                   </div>
                </div>
             </div>

             {/* Attendees List Section */}
             <div className="flex flex-col gap-6 mb-12">
                <div className="flex items-center justify-between border-b border-white/5 pb-4">
                   <h4 className="text-slate-400 text-[11px] font-black uppercase tracking-[0.5em]">Attendees List</h4>
                   <span className="text-[10px] font-black bg-white/5 px-3 py-1 rounded-full border border-white/10 text-white shadow-inner">
                     {meeting.attendees?.length || 1} Total
                   </span>
                </div>
                <div className="flex flex-wrap gap-8">
                   {meeting.attendees?.map((person, i) => (
                     <div key={i} className="flex flex-col items-center gap-3 group">
                        <div className="relative">
                           <div className="absolute inset-0 bg-primary/20 blur-xl rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
                           <div className="size-16 rounded-2xl border-2 border-white/10 bg-white/5 p-1 relative z-10 overflow-hidden group-hover:border-primary transition-all">
                              <img src={person.photo} alt={person.name} className="size-full rounded-xl object-cover shadow-2xl" referrerPolicy="no-referrer" />
                           </div>
                        </div>
                        <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest group-hover:text-white transition-colors">{person.name}</span>
                     </div>
                   ))}
                </div>
             </div>

             {/* Card Action Buttons */}
             <div className="flex gap-4">
                <button 
                  onClick={() => onEdit(meeting.id)}
                  className="flex-1 h-20 bg-white text-black rounded-3xl text-xl font-black shadow-[0_20px_50px_rgba(255,255,255,0.1)] hover:bg-slate-100 active:scale-[0.98] transition-all flex items-center justify-center gap-4 uppercase tracking-tighter"
                >
                  <span className="material-symbols-outlined text-3xl">edit_note</span>
                  Edit Details
                </button>
                <button 
                  onClick={onBack}
                  className="flex-1 h-20 bg-white/[0.05] text-white border border-white/10 rounded-3xl text-xl font-black hover:bg-white/[0.08] active:scale-[0.98] transition-all uppercase tracking-[0.2em]"
                >
                  Close
                </button>
             </div>
          </div>

          {/* Bottom Info Row */}
        

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
             <InfoCard icon="groups" label="Room Capacity" value={capacity != null ? `${capacity} Persons` : '—'} />
             <InfoCard icon="security" label="Privacy Level" value="Internal Only" />
             <button onClick={() => setIsAmenitiesOpen(true)} className="group text-left">
               <InfoCard icon="inventory_2" label="Equipment" value="Room Amenities" clickable />
             </button>
          </div>
        </div>
      </main>

      {/* Services Modal Popup */}
      {isServiceModalOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 animate-in fade-in duration-300">
           <div className="absolute inset-0 bg-black/90 backdrop-blur-2xl" onClick={() => !requestStatus.includes('PENDING') && setIsServiceModalOpen(false)} />
           <div className="relative w-full max-w-2xl bg-card-dark rounded-xl border border-white/10 shadow-[0_0_100px_rgba(0,0,0,1)] p-10 lg:p-14 flex flex-col items-center gap-8 animate-in zoom-in-95 duration-300 overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-2 bg-amber-500/50" />
              
              <div className="flex flex-col items-center text-center gap-3">
                 <div className="size-20 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 mb-2">
                    <span className="material-symbols-outlined text-4xl font-variation-fill animate-bounce">notifications_active</span>
                 </div>
                 <h2 className="text-4xl font-black text-white tracking-tighter uppercase">Room Services</h2>
                 <p className="text-slate-100 font-bold uppercase tracking-widest text-xs">Everest Concierge System</p>
              </div>

              {requestStatus === 'SUCCESS' ? (
                <div className="flex flex-col items-center gap-6 py-10 animate-in fade-in zoom-in duration-500">
                   <div className="size-32 rounded-xl bg-emerald-500/10 border-4 border-emerald-500/30 flex items-center justify-center text-emerald-500 shadow-[0_0_50px_rgba(16,185,129,0.2)]">
                      <span className="material-symbols-outlined text-6xl font-black">check_circle</span>
                   </div>
                   <div className="text-center">
                     <p className="text-2xl font-black text-white uppercase tracking-tight">Request Transmitted</p>
                     <p className="text-slate-100 font-medium mt-1">Our team has been notified of your request.</p>
                   </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full mt-4">
                  <ServiceCard 
                    icon="restaurant" 
                    title="Catering" 
                    desc="Food & Beverage"
                    isPending={requestStatus === 'PENDING' && activeService === 'CATERING'}
                    onClick={() => handleServiceRequest('CATERING')}
                  />
                  <ServiceCard 
                    icon="support_agent" 
                    title="Support" 
                    desc="AV / IT Technical"
                    isPending={requestStatus === 'PENDING' && activeService === 'SUPPORT'}
                    onClick={() => handleServiceRequest('SUPPORT')}
                  />
                  <ServiceCard 
                    icon="cleaning_services" 
                    title="Cleaning" 
                    desc="Room Sanitization"
                    isPending={requestStatus === 'PENDING' && activeService === 'CLEANING'}
                    onClick={() => handleServiceRequest('CLEANING')}
                  />
                </div>
              )}

              <button 
                onClick={() => setIsServiceModalOpen(false)}
                className="text-white font-black uppercase tracking-[0.4em] text-[10px] hover:text-white transition-colors mt-4"
              >
                Dismiss Request
              </button>
           </div>
        </div>
      )}

      {/* Amenities Slide-over Popup */}
      <div 
        className={`fixed inset-y-0 right-0 z-[60] w-full md:w-[480px] bg-[#080c10]/98 backdrop-blur-[80px] border-l border-white/10 shadow-[20px_0_120px_rgba(0,0,0,0.9)] transition-transform duration-700 ease-[cubic-bezier(0.23,1,0.32,1)] ${
          isAmenitiesOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="absolute top-[-10%] right-[-10%] size-[120%] bg-primary/10 blur-[150px] rounded-xl pointer-events-none opacity-50" />
        <div className="h-full flex flex-col relative z-10 overflow-hidden">
          <header className="flex items-center justify-between p-4 lg:p-6 border-b border-white/5 bg-black/20 shrink-0">
            <div className="flex flex-col">
              <div className="flex items-center gap-2 mb-0.5">
                <div className="size-8 rounded-xl bg-primary/20 flex items-center justify-center text-primary border border-primary/20 shadow-lg">
                  <span className="material-symbols-outlined text-xl font-variation-fill">inventory_2</span>
                </div>
                <h2 className="text-xl font-black text-white tracking-tighter uppercase">Room Amenities</h2>
              </div>
              <p className="text-slate-100 font-black uppercase tracking-[0.3em] text-[8px] ml-1">Equipped Assets Checklist</p>
            </div>
            <button 
              onClick={() => setIsAmenitiesOpen(false)}
              className="size-8 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-all group"
            >
              <span className="material-symbols-outlined text-lg text-slate-100 group-hover:text-white">close</span>
            </button>
          </header>

          <div className="flex-1 overflow-y-auto custom-scrollbar p-4 lg:p-6 flex flex-col gap-3">
            {amenities.map((amenity) => (
              <div
                key={amenity.id}
                className="w-full bg-white/[0.03] border border-white/10 rounded-xl overflow-hidden group transition-all hover:bg-white/[0.06] hover:border-white/20 shadow-xl"
              >
                <div className="flex flex-row">
                   <div className="w-20 aspect-square shrink-0 relative overflow-hidden bg-black/60 border-r border-white/5">
                      {!imgErrors[amenity.id] && amenity.img ? (
                        <img 
                          src={amenity.img} 
                          alt={amenity.title} 
                          onError={() => setImgErrors(prev => ({ ...prev, [amenity.id]: true }))}
                          className="size-full object-contain object-center transition-transform duration-700 group-hover:scale-110" 
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="size-full bg-gradient-to-br from-[#0c1622] to-[#050505] flex items-center justify-center relative group">
                           <div className="absolute inset-0 opacity-[0.05] grid grid-cols-4 gap-1 p-2 overflow-hidden select-none pointer-events-none">
                              {Array.from({ length: 16 }).map((_, i) => (
                                <span key={i} className="material-symbols-outlined text-[8px]">{amenity.icon}</span>
                              ))}
                           </div>
                           <div className="relative z-10">
                              <span className="material-symbols-outlined text-2xl text-primary/40 group-hover:scale-110 transition-transform font-variation-fill">
                                {amenity.icon}
                              </span>
                           </div>
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                   </div>
                   
                   <div className="flex-1 p-3 flex flex-col justify-between gap-1">
                      <div className="flex items-start justify-between">
                        <div className="flex flex-col">
                           <h4 className="text-white font-black text-base tracking-tight uppercase leading-none mb-0.5">{amenity.title}</h4>
                           <span className="text-primary font-black text-[7px] uppercase tracking-widest">{amenity.subtitle}</span>
                        </div>
                        <div className="flex items-center gap-1 px-1.5 py-0.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl shrink-0 shadow-[0_0_10px_rgba(16,185,129,0.1)]">
                           <span className="size-1 rounded-xl bg-emerald-500 shadow-[0_0_5px_rgba(16,185,129,0.5)]"></span>
                           <span className="text-[6px] font-black text-emerald-500 uppercase tracking-widest">Active</span>
                        </div>
                      </div>
                                            <p className="text-slate-100 text-[9px] font-medium leading-relaxed line-clamp-2 opacity-80 group-hover:opacity-100 transition-opacity">
                        {amenity.description}
                      </p>
                   </div>
                </div>
              </div>
            ))}
          </div>

          <footer className="p-4 border-t border-white/5 bg-black/20 shrink-0">
            <div className="flex flex-col items-center gap-2">
               <p className="text-slate-200 font-bold text-[8px] uppercase tracking-widest text-center italic">Report hardware malfunctions to core IT</p>
               <div className="flex items-center gap-2 w-full">
                  <div className="h-px bg-white/5 flex-1" />
                  <span className="text-slate-100 text-[6px] font-black uppercase tracking-[0.4em]">Everest Room V3</span>
                  <div className="h-px bg-white/5 flex-1" />
               </div>
            </div>
          </footer>
        </div>
      </div>

      {(isAmenitiesOpen || isServiceModalOpen) && (
        <div 
          className="fixed inset-0 z-[55] bg-black/60 backdrop-blur-[10px] transition-all duration-700 animate-in fade-in"
          onClick={() => { setIsAmenitiesOpen(false); setIsServiceModalOpen(false); }}
        />
      )}
    </div>
  );
};

const InfoCard: React.FC<{ icon: string; label: string; value: string; clickable?: boolean }> = ({ icon, label, value, clickable }) => (
  <div className={`bg-white/[0.03] border border-white/5 rounded-xl p-4 flex items-center gap-3 transition-all ${clickable ? 'hover:bg-primary/10 hover:border-primary/40 group-hover:translate-y-[-4px]' : ''}`}>
    <div className={`size-10 rounded-xl bg-white/5 flex items-center justify-center text-slate-100 border border-white/5 ${clickable ? 'group-hover:bg-primary/20 group-hover:text-primary transition-colors' : ''}`}>
       <span className="material-symbols-outlined text-xl">{icon}</span>
    </div>
    <div className="flex flex-col">
       <span className="text-slate-100 text-[8px] font-black uppercase tracking-widest leading-none mb-1">{label}</span>
       <span className="text-white font-black text-xs">{value}</span>
    </div>
  </div>
);

const ServiceCard: React.FC<{ icon: string; title: string; desc: string; isPending: boolean; onClick: () => void }> = ({ icon, title, desc, isPending, onClick }) => (
  <button 
    onClick={onClick}
    disabled={isPending}
    className={`p-6 rounded-xl border-2 transition-all flex flex-col items-center gap-4 group h-full relative ${
      isPending 
        ? 'bg-amber-500/10 border-amber-500/40 shadow-xl' 
        : 'bg-white/5 border-white/10 hover:border-amber-500/50 hover:bg-amber-500/5 active:scale-95'
    }`}
  >
    <div className={`size-16 rounded-xl flex items-center justify-center transition-all ${isPending ? 'bg-amber-500 text-white' : 'bg-slate-700 text-slate-100 group-hover:text-amber-500'}`}>
       {isPending ? (
         <span className="size-8 border-4 border-white/30 border-t-white rounded-xl animate-spin"></span>
       ) : (
         <span className="material-symbols-outlined text-3xl font-variation-fill">{icon}</span>
       )}
    </div>
    <div className="text-center">
       <h4 className={`text-xl font-black uppercase tracking-tight leading-none mb-1 transition-colors ${isPending ? 'text-amber-500' : 'text-white group-hover:text-amber-500'}`}>{title}</h4>
       <p className="text-[9px] font-black text-slate-100 uppercase tracking-widest">{isPending ? 'Requesting...' : desc}</p>
    </div>
  </button>
);

export default MeetingDetailsView;