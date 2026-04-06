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
  amenities?: Amenity[];
}

type ServiceType = 'CATERING' | 'SUPPORT' | 'CLEANING' | null;

const MeetingDetailsView: React.FC<MeetingDetailsViewProps> = ({ meetingId, onBack, onEdit, onExtend, onEndNow, roomName = 'Conference Room A', amenities = [] }) => {
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
      <div className="absolute top-[-20%] left-[-10%] size-[80%] bg-primary/10 blur-[150px] rounded-xl pointer-events-none" />
      
      <header className="flex items-center p-3 lg:p-4 border-b border-white/5 bg-black/20 backdrop-blur-xl relative z-10 shrink-0">
        <button onClick={onBack} className="size-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-100 hover:text-white transition-all">
          <span className="material-symbols-outlined text-xl">arrow_back</span>
        </button>
        <div className="flex flex-col ml-3">
          <h1 className="text-xl font-black text-white tracking-tight leading-none uppercase">Meeting Details</h1>
          <p className="text-white text-[8px] font-black uppercase tracking-[0.4em] mt-1">{roomName} • Core Information</p>
        </div>
      </header>

      <main className="flex-1 overflow-hidden p-3 lg:p-4 relative z-10 flex flex-col justify-center">
        <div className="max-w-4xl mx-auto w-full flex flex-col gap-3">
          
          <div className="bg-white/[0.03] border border-white/10 rounded-xl p-4 lg:p-6 shadow-2xl relative overflow-hidden">
             <div className="absolute top-0 right-0 size-48 bg-primary/5 blur-[60px] rounded-xl pointer-events-none -translate-y-16 translate-x-16" />
             
             {/* Bell Button - Only for current/future meetings */}
             {!isPast && (
               <button 
                 onClick={() => setIsServiceModalOpen(true)}
                 className="absolute top-4 right-32 size-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500 hover:bg-amber-500 hover:text-white transition-all active:scale-95 group z-20 shadow-xl"
                 title="Request Service"
               >
                 <span className="material-symbols-outlined text-xl font-variation-fill group-hover:rotate-12 transition-transform">notifications_active</span>
               </button>
             )}

             {/* Dynamic Status Indicator - Top Right */}
             <div className="absolute top-4 right-4 flex items-center gap-2">
                <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-xl border backdrop-blur-md transition-all duration-500 ${status?.bg} ${status?.border} ${status?.color} ${status?.pulse ? 'shadow-[0_0_15px_rgba(251,191,36,0.1)]' : ''}`}>
                  <span className={`material-symbols-outlined text-xs ${status?.pulse ? 'animate-pulse' : ''}`}>
                    {status?.icon}
                  </span>
                  <span className="text-[8px] font-black uppercase tracking-widest">{status?.label}</span>
                </div>
             </div>

             <div className="flex flex-col gap-4 relative z-10">
                <div className="flex flex-col gap-2">
                   <div className="flex items-center gap-2">
                      <div className="inline-flex items-center px-2 py-0.5 rounded-xl bg-primary/10 text-primary border border-primary/20 text-[8px] font-black uppercase tracking-widest self-start">
                         {meeting.type} Session
                      </div>
                      {meeting.recurrence && meeting.recurrence !== 'NONE' && (
                        <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20 text-[8px] font-black uppercase tracking-widest self-start">
                           <span className="material-symbols-outlined text-[10px]">repeat</span>
                           {meeting.recurrence}
                        </div>
                      )}
                   </div>
                   <h2 className={`text-2xl lg:text-3xl font-black tracking-tighter leading-tight pr-32 ${meeting.isCancelled ? 'text-slate-200 line-through decoration-red-500/40' : 'text-white'}`}>
                     {meeting.title}
                   </h2>
                </div>                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4 border-y border-white/5">
                   <div className="flex items-center gap-3">
                      <div className="size-10 rounded-xl bg-white/5 flex items-center justify-center text-primary border border-white/10">
                        <span className="material-symbols-outlined text-xl font-variation-fill">schedule</span>
                      </div>
                      <div className="flex flex-col">
                         <span className="text-slate-100 text-[8px] font-black uppercase tracking-widest mb-0">Duration</span>
                         <span className={`text-lg lg:text-xl font-black ${meeting.isCancelled ? 'text-slate-200' : 'text-white'}`}>
                           {meeting.startTime} - {meeting.endTime}
                         </span>
                      </div>
                   </div>
                   <div className="flex items-center gap-3">
                      <div className="size-10 rounded-xl bg-white/5 flex items-center justify-center text-primary border border-white/10 overflow-hidden shadow-lg">
                        {meeting.organizerPhoto ? (
                          <img src={meeting.organizerPhoto} className={`size-full object-cover ${meeting.isCancelled ? 'grayscale opacity-50' : ''}`} alt={meeting.organizer} referrerPolicy="no-referrer" />
                        ) : (
                          <span className="material-symbols-outlined text-xl font-variation-fill">person</span>
                        )}
                      </div>
                      <div className="flex flex-col">
                         <span className="text-slate-100 text-[8px] font-black uppercase tracking-widest mb-0">Lead Organizer</span>
                         <span className={`text-lg lg:text-xl font-black ${meeting.isCancelled ? 'text-slate-200' : 'text-white'}`}>
                           {meeting.organizer}
                         </span>
                      </div>
                   </div>
                </div>

                {/* Attendees Section with Photos */}
                <div className="flex flex-col gap-3">
                   <div className="flex items-center justify-between">
                      <h4 className="text-slate-100 text-[9px] font-black uppercase tracking-[0.4em]">Attendees List</h4>
                      <span className="text-[8px] font-black bg-white/5 px-1.5 py-0.5 rounded-xl border border-white/10">{meeting.attendees?.length || 1} Total</span>
                   </div>
                   <div className="flex flex-wrap gap-3">
                      {meeting.attendees && meeting.attendees.length > 0 ? (
                        meeting.attendees.map((person, i) => (
                          <div key={i} className="flex flex-col items-center gap-1.5 group">
                             <div className="relative">
                                <div className={`absolute inset-0 bg-primary/20 blur-md rounded-xl opacity-0 group-hover:opacity-100 transition-opacity`}></div>
                                <div className={`size-10 rounded-xl border border-white/10 bg-white/5 p-0.5 relative z-10 overflow-hidden group-hover:border-primary transition-all ${meeting.isCancelled ? 'grayscale opacity-40' : ''}`}>
                                   {person.photo ? (
                                     <img 
                                        src={person.photo} 
                                        alt={person.name} 
                                        className="size-full rounded-xl object-cover" 
                                        referrerPolicy="no-referrer"
                                      />
                                   ) : (
                                     <div className="size-full rounded-xl bg-primary/10 flex items-center justify-center text-primary font-black text-sm">
                                        {person.name.charAt(0)}
                                     </div>
                                   )}
                                </div>
                             </div>
                             <span className="text-[8px] font-black text-slate-100 uppercase tracking-widest group-hover:text-white transition-colors">{person.name}</span>
                          </div>
                        ))
                      ) : (
                        <div className="text-slate-200 text-[10px] font-medium italic">No other attendees listed</div>
                      )}
                   </div>
                </div>

                {/* Primary Action Buttons - Gray font color applied */}
                <div className="flex flex-col gap-2 mt-1">
                  {isOngoing && (
                    <div className="grid grid-cols-2 gap-2 animate-in slide-in-from-bottom-4 duration-500">
                      <button 
                        onClick={() => onExtend(meeting.id)}
                        className="flex-1 bg-white/5 text-slate-100 py-2.5 rounded-xl text-sm font-black shadow-2xl border border-white/10 hover:bg-white/10 active:scale-95 transition-all flex items-center justify-center gap-2"
                      >
                        <span className="material-symbols-outlined text-xl text-slate-100">more_time</span>
                        Extend
                      </button>
                      <button 
                        onClick={() => { onEndNow(meeting.id); }}
                        className="flex-1 bg-white/5 text-slate-100 py-2.5 rounded-xl text-sm font-black border border-white/10 hover:bg-white/10 active:scale-95 transition-all flex items-center justify-center gap-2"
                      >
                        <span className="material-symbols-outlined text-xl text-slate-100">logout</span>
                        Finish Early
                      </button>
                    </div>
                  )}
                  
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => !isPast && onEdit(meeting.id)}
                      disabled={isPast}
                      className={`flex-1 ${isPast ? 'bg-white/5 text-slate-100 cursor-not-allowed border-white/5' : isOngoing ? 'bg-white/5 text-slate-100 border-white/10 hover:bg-white/10' : 'bg-white text-black border-white/20 hover:bg-slate-100'} py-3 rounded-xl text-sm font-black shadow-2xl transition-all flex items-center justify-center gap-2 border-t`}
                    >
                      <span className="material-symbols-outlined text-xl">
                        {isPast ? 'lock' : 'edit'}
                      </span>
                      {isPast ? 'History Locked' : 'Edit Details'}
                    </button>
                    <button 
                      onClick={onBack}
                      className="flex-1 bg-white/5 text-slate-100 py-3 rounded-xl text-sm font-black border border-white/10 hover:bg-white/10 active:scale-95 transition-all uppercase tracking-widest"
                    >
                      {isOngoing ? 'Go Back' : 'Close'}
                    </button>
                  </div>
                </div>
             </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
             <InfoCard icon="groups" label="Room Capacity" value="12 Persons" />
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