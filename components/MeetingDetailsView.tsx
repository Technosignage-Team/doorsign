import React, { useMemo, useState, useEffect } from 'react';
import { db } from '../lib/db';
import { Amenity } from '../types';

interface MeetingDetailsViewProps {
  meetingId: string;
  onBack: () => void;
  onEdit: (id: string) => void;
  onExtend: (id: string) => void;
  onEndNow: (id: string) => void;
  onShowRoomDetails?: () => void;
  onCheckInOut?: () => void;
  roomName?: string;
  capacity?: number;
  amenities?: Amenity[];
}

type ServiceType = 'CATERING' | 'SUPPORT' | 'CLEANING' | null;

interface AttendeeDetails {
  name: string;
  photo?: string;
  email: string;
  phone: string;
  company: string;
  checkedIn: boolean;
}

const MeetingDetailsView: React.FC<MeetingDetailsViewProps> = ({
  meetingId, onBack, onEdit, onExtend, onEndNow,
  onShowRoomDetails = () => {}, onCheckInOut = () => {},
  roomName = 'Conference Room A', capacity, amenities = []
}) => {
  const [isAmenitiesOpen, setIsAmenitiesOpen] = useState(false);
  const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
  const [requestStatus, setRequestStatus] = useState<'IDLE' | 'PENDING' | 'SUCCESS'>('IDLE');
  const [activeService, setActiveService] = useState<ServiceType>(null);
  const [imgErrors, setImgErrors] = useState<Record<string, boolean>>({});
  const [selectedAttendee, setSelectedAttendee] = useState<{ fullName: string; photo?: string } | null>(null);
  const [isPortrait, setIsPortrait] = useState(window.innerHeight > window.innerWidth);

  useEffect(() => {
    const handleResize = () => setIsPortrait(window.innerHeight > window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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
      return { label: 'Cancelled', color: 'text-red-500', bg: 'bg-red-500/25', border: 'border-red-500/40', icon: 'cancel' };
    }
    const now = new Date();
    const start = parseTimeString(meeting.startTime);
    const end = parseTimeString(meeting.endTime);
    const diffMins = Math.floor((start.getTime() - now.getTime()) / 60000);
    if (now >= start && now < end) {
      return { label: 'On Going', color: 'text-emerald-500', bg: 'bg-emerald-500/25', border: 'border-emerald-500/40', icon: 'sensors', pulse: true, isCurrent: true };
    } else if (diffMins > 0 && diffMins <= 15) {
      return { label: `Starting in ${diffMins}m`, color: 'text-amber-500', bg: 'bg-amber-500/25', border: 'border-amber-500/40', icon: 'notification_important', pulse: true, isNear: true };
    } else if (now < start) {
      return { label: 'Scheduled', color: 'text-primary', bg: 'bg-primary/10', border: 'border-primary/20', icon: 'calendar_today' };
    } else {
      return { label: 'Completed', color: 'text-slate-300', bg: 'bg-white/5', border: 'border-white/10', icon: 'check_circle', isPast: true };
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

  const getAttendeeDetails = (attendee: { fullName: string; photo?: string }): AttendeeDetails => {
    const parts = attendee.fullName.toLowerCase().split(' ');
    const first = parts[0] || 'user';
    const last = parts[parts.length - 1] || 'name';
    const seed = attendee.fullName.charCodeAt(0) % 2 === 0;
    return {
      name: attendee.fullName,
      photo: attendee.photo,
      email: `${first}.${last}@company.com`,
      phone: '+1 (555) 000-0000',
      company: 'Techno Signage',
      checkedIn: seed,
    };
  };

  if (!meeting) {
    return (
      <div className="flex items-center justify-center h-full text-slate-100">
        Meeting not found.
      </div>
    );
  }

  const isOngoing = status?.isCurrent;

  const roomHasCurrentMeeting = useMemo(() => {
    const now = new Date();
    return db.getMeetings().some(m => {
      if (m.id === meetingId || m.isCancelled) return false;
      const start = parseTimeString(m.startTime);
      const end = parseTimeString(m.endTime);
      return now >= start && now < end;
    });
  }, [meetingId]);

  const canCheckIn = !!(status?.isCurrent || (status?.isNear && !roomHasCurrentMeeting));

  return (
    <div className="flex flex-col h-full bg-[#050505] overflow-hidden relative">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(19,127,236,0.05)_0%,transparent_100%)] pointer-events-none" />

      <header className="flex items-center justify-between p-4 lg:p-6 border-b border-white/5 bg-black/20 backdrop-blur-xl relative z-20 shrink-0">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="size-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-100 hover:text-white transition-all">
            <span className="material-symbols-outlined text-xl">arrow_back</span>
          </button>
          <div className="flex flex-col translate-y-[2px]">
            <h1 className="text-2xl font-black text-white tracking-tight leading-tight">Meeting Details</h1>
          </div>
        </div>
        <div className="flex items-center gap-4 translate-y-[2px]">
          {status && (
            <div className={`flex items-center gap-2 px-5 py-1.5 rounded-full bg-white/5 border border-white/5 ${status.color} shadow-lg text-xs font-black uppercase tracking-wider`}>
              <span className="material-symbols-outlined text-base font-variation-fill">radio_button_checked</span>
              <span>{status.label}</span>
            </div>
          )}
          <button className="size-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary hover:bg-primary hover:text-white transition-all shadow-[0_0_20px_rgba(19,127,236,0.2)]">
            <span className="material-symbols-outlined text-2xl font-variation-fill">grid_view</span>
          </button>
        </div>
      </header>

      <main className={`flex-1 ${isPortrait ? 'overflow-y-auto px-6 sm:px-8 pt-2 pb-6 justify-start' : 'overflow-hidden p-6 lg:p-10 justify-center'} relative z-10 flex flex-col items-center`}>
        <div className={`w-full ${isPortrait ? 'max-w-xl flex flex-col gap-6 px-4 flex-grow justify-start pb-4' : 'max-w-4xl flex flex-col gap-6'}`}>

          {/* Main Meeting Card - Fully transparent */}
          <div className="bg-transparent border-none p-0 shadow-none relative overflow-hidden flex flex-col">
            <div className="absolute top-0 right-0 size-96 bg-primary/5 blur-[100px] rounded-full pointer-events-none -translate-y-1/2 translate-x-1/2" />

            <div className="flex flex-col gap-2">
              {/* Title */}
              <h2 className={`${isPortrait ? 'text-[2.2rem] leading-tight mb-8 mt-10 min-h-[5.5rem] flex items-center' : 'text-3xl lg:text-4xl mb-10'} font-black tracking-tight ${meeting.isCancelled ? 'text-slate-400 line-through' : 'text-white'}`}>
                {meeting.title}
              </h2>

              {/* Info Bar */}
              <div className={`grid ${isPortrait ? 'grid-cols-1 gap-6 py-6 mb-6' : 'grid-cols-2 gap-6 py-4 mb-6'} border-y border-white/10`}>
                <div className="flex items-center gap-5">
                  <div className="flex flex-col">
                    <span className="text-[#137fec] text-[10px] font-black uppercase tracking-[0.3em] mb-1">Duration</span>
                    <span className="text-3xl font-black text-white tracking-tight">
                      {meeting.startTime} - {meeting.endTime}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-5">
                  <div className="size-14 rounded-2xl bg-white/5 border border-white/10 overflow-hidden shadow-2xl relative shrink-0">
                    {meeting.organizerPhoto ? (
                      <img src={meeting.organizerPhoto} className="size-full object-cover" alt={meeting.organizer} referrerPolicy="no-referrer" />
                    ) : (
                      <span className="material-symbols-outlined text-3xl text-primary font-variation-fill absolute inset-0 flex items-center justify-center">person</span>
                    )}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[#137fec] text-[10px] font-black uppercase tracking-[0.3em] mb-1">Lead Organizer</span>
                    <span className="text-3xl font-black text-white tracking-tight">
                      {meeting.organizer}
                    </span>
                  </div>
                </div>
              </div>

              {/* Attendees */}
              <div className={`flex flex-col ${isPortrait ? 'gap-4 mb-4' : 'gap-6 mb-12'}`}>
                <div className={`flex items-center justify-between border-b border-white/5 ${isPortrait ? 'pb-3' : 'pb-4'}`}>
                  <h4 className="text-[#137fec] text-xs font-black uppercase tracking-[0.5em]">Attendees List</h4>
                  <span className="text-[10px] font-black bg-white/5 px-3 py-1 rounded-full border border-white/10 text-white shadow-inner">
                    {meeting.attendees?.length || 1} Total
                  </span>
                </div>
                <div className={isPortrait ? 'grid grid-cols-4 gap-y-8 gap-x-6 py-4 w-full justify-items-center' : 'flex flex-row overflow-x-auto gap-8 pb-3 custom-scrollbar max-w-full'}>
                  {meeting.attendees?.map((person, i) => (
                    <div
                      key={i}
                      onClick={() => setSelectedAttendee(person)}
                      className={`flex flex-col items-center gap-2 group cursor-pointer hover:scale-105 active:scale-95 transition-all ${isPortrait ? 'w-full' : 'shrink-0'}`}
                    >
                      <div className="relative">
                        <div className="absolute inset-0 bg-primary/20 blur-sm rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
                        <div className={`${isPortrait ? 'size-24' : 'size-16'} rounded-2xl border-2 border-white/10 bg-white/5 p-1 relative z-10 overflow-hidden group-hover:border-primary transition-all shadow-lg`}>
                          {person.photo && (
                            <img src={person.photo} alt={person.fullName} className="size-full rounded-xl object-cover shadow-2xl" referrerPolicy="no-referrer" />
                          )}
                        </div>
                      </div>
                      <span className="text-xs font-black text-slate-300 uppercase tracking-widest group-hover:text-white transition-colors text-center line-clamp-2 max-w-[110px] leading-tight break-words">{person.fullName}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Landscape Action Buttons */}
            {!isPortrait && (
              <div className="flex flex-row gap-4 w-full">
                <button
                  onClick={onShowRoomDetails}
                  className="flex-1 h-14 bg-[#1e293b] hover:bg-[#334155] text-white rounded-full text-base font-black active:scale-[0.98] transition-all flex items-center justify-center gap-2 uppercase tracking-wider border border-white/10"
                >
                  <span className="material-symbols-outlined text-xl">info</span>
                  Room Info
                </button>
                {canCheckIn && (
                  <button
                    onClick={onCheckInOut}
                    className="flex-1 h-14 bg-[#1e293b] hover:bg-[#334155] text-white rounded-full text-base font-black active:scale-[0.98] transition-all flex items-center justify-center gap-2 uppercase tracking-wider border border-white/10"
                  >
                    <span className="material-symbols-outlined text-xl">verified_user</span>
                    Check In / Out
                  </button>
                )}
                <button
                  onClick={() => onEdit(meeting.id)}
                  className="flex-1 h-14 bg-primary text-white rounded-full text-base font-black hover:bg-primary/95 active:scale-[0.98] transition-all flex items-center justify-center gap-2 uppercase tracking-wider shadow-lg shadow-primary/20"
                >
                  <span className="material-symbols-outlined text-xl">edit</span>
                  Edit
                </button>
                {isOngoing && (
                  <button
                    onClick={() => onExtend(meeting.id)}
                    className="flex-1 h-14 bg-emerald-600 hover:bg-emerald-500 text-white rounded-full text-base font-black active:scale-[0.98] transition-all flex items-center justify-center gap-2 uppercase tracking-wider shadow-lg shadow-emerald-500/20 border border-emerald-500/25"
                  >
                    <span className="material-symbols-outlined text-xl">more_time</span>
                    Extend
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Portrait Action Buttons Panel */}
      {isPortrait && (
        <div className="bg-black/35 border-t border-white/5 px-6 sm:px-8 py-5 z-20 shrink-0 backdrop-blur-xl w-full flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3 w-full max-w-xl mx-auto">
            <button
              onClick={onShowRoomDetails}
              className="h-14 bg-[#1e293b] hover:bg-[#334155] text-white rounded-full text-[13px] font-black active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 uppercase tracking-wider border border-white/10"
            >
              <span className="material-symbols-outlined text-lg">info</span>
              Room Info
            </button>
            {canCheckIn && (
              <button
                onClick={onCheckInOut}
                className="h-14 bg-[#1e293b] hover:bg-[#334155] text-white rounded-full text-[13px] font-black active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 uppercase tracking-wider border border-white/10"
              >
                <span className="material-symbols-outlined text-lg">verified_user</span>
                Check In/Out
              </button>
            )}
            <button
              onClick={() => onEdit(meeting.id)}
              className={`h-14 bg-primary text-white rounded-full text-[13px] font-black hover:bg-primary/95 active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 uppercase tracking-wider shadow-lg shadow-primary/20 ${isOngoing ? 'col-span-1' : 'col-span-2'}`}
            >
              <span className="material-symbols-outlined text-lg">edit</span>
              Edit
            </button>
            {isOngoing && (
              <button
                onClick={() => onExtend(meeting.id)}
                className="h-14 bg-emerald-600 hover:bg-emerald-500 text-white rounded-full text-[13px] font-black active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 uppercase tracking-wider shadow-lg shadow-emerald-500/20 border border-emerald-500/25"
              >
                <span className="material-symbols-outlined text-lg">more_time</span>
                Extend
              </button>
            )}
          </div>
        </div>
      )}

      {/* Services Modal */}
      {isServiceModalOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-black/90 backdrop-blur-2xl" onClick={() => !requestStatus.includes('PENDING') && setIsServiceModalOpen(false)} />
          <div className="relative w-full max-w-2xl bg-card-dark rounded-3xl border border-white/10 shadow-[0_0_100px_rgba(0,0,0,1)] p-10 lg:p-14 flex flex-col items-center gap-8 animate-in zoom-in-95 duration-300 overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-2 bg-amber-500/50" />
            <div className="flex flex-col items-center text-center gap-3">
              <div className="size-20 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 mb-2">
                <span className="material-symbols-outlined text-4xl font-variation-fill animate-bounce">notifications_active</span>
              </div>
              <h2 className="text-4xl font-black text-white tracking-tighter uppercase">Room Services</h2>
            </div>
            {requestStatus === 'SUCCESS' ? (
              <div className="flex flex-col items-center gap-6 py-10 animate-in fade-in zoom-in duration-500">
                <div className="size-32 rounded-3xl bg-emerald-500/10 border-4 border-emerald-500/30 flex items-center justify-center text-emerald-500 shadow-[0_0_50px_rgba(16,185,129,0.2)]">
                  <span className="material-symbols-outlined text-6xl font-black">check_circle</span>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-black text-white uppercase tracking-tight">Request Transmitted</p>
                  <p className="text-slate-100 font-medium mt-1">Our team has been notified of your request.</p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full mt-4">
                <ServiceCard icon="restaurant" title="Catering" desc="Food & Beverage" isPending={requestStatus === 'PENDING' && activeService === 'CATERING'} onClick={() => handleServiceRequest('CATERING')} />
                <ServiceCard icon="support_agent" title="Support" desc="AV / IT Technical" isPending={requestStatus === 'PENDING' && activeService === 'SUPPORT'} onClick={() => handleServiceRequest('SUPPORT')} />
                <ServiceCard icon="cleaning_services" title="Cleaning" desc="Room Sanitization" isPending={requestStatus === 'PENDING' && activeService === 'CLEANING'} onClick={() => handleServiceRequest('CLEANING')} />
              </div>
            )}
            <button onClick={() => setIsServiceModalOpen(false)} className="text-white font-black uppercase tracking-[0.4em] text-[10px] hover:text-white transition-colors mt-4">
              Dismiss Request
            </button>
          </div>
        </div>
      )}

      {/* Amenities Slide-over */}
      <div className={`fixed inset-y-0 right-0 z-[60] w-full md:w-[480px] bg-[#080c10]/98 backdrop-blur-[80px] border-l border-white/10 shadow-[20px_0_120px_rgba(0,0,0,0.9)] transition-transform duration-700 ease-[cubic-bezier(0.23,1,0.32,1)] ${isAmenitiesOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="absolute top-[-10%] right-[-10%] size-[120%] bg-primary/10 blur-[150px] rounded-full pointer-events-none opacity-50" />
        <div className="h-full flex flex-col relative z-10 overflow-hidden">
          <header className="flex items-center justify-between p-4 lg:p-6 border-b border-white/5 bg-black/20 shrink-0">
            <div className="flex flex-col justify-center">
              <div className="flex items-center gap-2">
                <div className="size-8 rounded-lg bg-primary/20 flex items-center justify-center text-primary border border-primary/20 shadow-lg">
                  <span className="material-symbols-outlined text-xl font-variation-fill">inventory_2</span>
                </div>
                <h2 className="text-xl font-black text-white tracking-tighter uppercase">Room Amenities</h2>
              </div>
            </div>
            <button onClick={() => setIsAmenitiesOpen(false)} className="size-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-all group">
              <span className="material-symbols-outlined text-lg text-slate-100 group-hover:text-white">close</span>
            </button>
          </header>
          <div className="flex-1 overflow-y-auto custom-scrollbar p-4 lg:p-6 flex flex-col gap-3">
            {amenities.map((amenity) => (
              <div key={amenity.id} className="w-full bg-white/[0.03] border border-white/10 rounded-2xl overflow-hidden group transition-all hover:bg-white/[0.06] hover:border-white/20 shadow-xl">
                <div className="flex flex-row">
                  <div className="w-20 aspect-square shrink-0 relative overflow-hidden bg-black/40 border-r border-white/5">
                    {!imgErrors[amenity.id] && amenity.img ? (
                      <img src={amenity.img} alt={amenity.title} onError={() => setImgErrors(prev => ({ ...prev, [amenity.id]: true }))} className="size-full object-cover transition-transform duration-700 group-hover:scale-110" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="size-full bg-gradient-to-br from-[#0c1622] to-[#050505] flex items-center justify-center relative">
                        <div className="absolute inset-0 opacity-[0.05] grid grid-cols-4 gap-1 p-2 overflow-hidden select-none pointer-events-none">
                          {Array.from({ length: 16 }).map((_, i) => (
                            <span key={i} className="material-symbols-outlined text-[8px]">{amenity.icon}</span>
                          ))}
                        </div>
                        <div className="relative z-10">
                          <span className="material-symbols-outlined text-2xl text-primary/40 group-hover:scale-110 transition-transform font-variation-fill">{amenity.icon}</span>
                        </div>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  </div>
                  <div className="flex-1 p-3 flex flex-col justify-between gap-1">
                    <div className="flex items-start justify-between">
                      <div className="flex flex-col justify-center">
                        <h4 className="text-white font-black text-base tracking-tight uppercase leading-none">{amenity.title}</h4>
                      </div>
                      <div className="flex items-center gap-1 px-1.5 py-0.5 bg-emerald-500/10 border border-emerald-500/20 rounded-md shrink-0 shadow-[0_0_10px_rgba(16,185,129,0.1)]">
                        <span className="size-1 rounded-full bg-emerald-500 shadow-[0_0_5px_rgba(16,185,129,0.5)]" />
                        <span className="text-[6px] font-black text-emerald-500 uppercase tracking-widest">Active</span>
                      </div>
                    </div>
                    <p className="text-slate-100 text-[9px] font-medium leading-relaxed line-clamp-2 opacity-80 group-hover:opacity-100 transition-opacity">{amenity.description}</p>
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
        <div className="fixed inset-0 z-[55] bg-black/60 backdrop-blur-[10px] transition-all duration-700 animate-in fade-in" onClick={() => { setIsAmenitiesOpen(false); setIsServiceModalOpen(false); }} />
      )}

      {/* Attendee Details Modal */}
      {selectedAttendee && (() => {
        const details = getAttendeeDetails(selectedAttendee);
        return (
          <div className="fixed inset-0 z-[250] flex items-center justify-center p-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="fixed inset-0 bg-black/80 backdrop-blur-md" onClick={() => setSelectedAttendee(null)} />
            <div className="relative z-10 max-w-md w-full bg-[#0d0d0d] border border-white/10 rounded-3xl p-6 shadow-2xl overflow-hidden text-left animate-in duration-200 fade-in slide-in-from-bottom-4">
              <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-primary via-[#137fec] to-emerald-500" />
              <button onClick={() => setSelectedAttendee(null)} className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors size-8 rounded-full bg-white/5 border border-white/5 flex items-center justify-center cursor-pointer">
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
              <div className="flex flex-col items-center text-center mt-3 pb-4 border-b border-white/5">
                <div className="size-24 rounded-2xl border-2 border-white/10 bg-white/5 p-1 mb-4 shadow-xl overflow-hidden">
                  <img src={details.photo || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=150'} alt={details.name} className="size-full rounded-xl object-cover" referrerPolicy="no-referrer" />
                </div>
                <h3 className="text-xl font-black text-white tracking-tight leading-none mb-1">{details.name}</h3>
                <span className="text-[10px] font-black uppercase tracking-[0.25em] text-[#137fec]">{details.company}</span>
              </div>
              <div className="py-5 flex flex-col gap-4">
                <div className="flex items-center gap-4 bg-white/[0.02] border border-white/5 rounded-2xl p-3.5">
                  <div className="size-10 rounded-xl bg-white/5 flex items-center justify-center text-[#137fec] shrink-0 border border-white/5">
                    <span className="material-symbols-outlined text-lg">mail</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-slate-400 text-[8px] font-black uppercase tracking-widest leading-none mb-1.5">Email Address</span>
                    <span className="text-white font-bold text-sm tracking-wide break-all">{details.email}</span>
                  </div>
                </div>
                <div className="flex items-center gap-4 bg-white/[0.02] border border-white/5 rounded-2xl p-3.5">
                  <div className="size-10 rounded-xl bg-white/5 flex items-center justify-center text-[#137fec] shrink-0 border border-white/5">
                    <span className="material-symbols-outlined text-lg">call</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-slate-400 text-[8px] font-black uppercase tracking-widest leading-none mb-1.5">Phone Number</span>
                    <span className="text-white font-bold text-sm tracking-wide">{details.phone}</span>
                  </div>
                </div>
                <div className="flex items-center gap-4 bg-white/[0.02] border border-white/5 rounded-2xl p-3.5">
                  <div className="size-10 rounded-xl bg-white/5 flex items-center justify-center text-[#137fec] shrink-0 border border-white/5">
                    <span className="material-symbols-outlined text-lg">domain</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-slate-400 text-[8px] font-black uppercase tracking-widest leading-none mb-1.5">Organization</span>
                    <span className="text-white font-bold text-sm tracking-wide">{details.company}</span>
                  </div>
                </div>
                <div className="flex items-center gap-4 bg-white/[0.02] border border-white/5 rounded-2xl p-3.5">
                  <div className={`size-10 rounded-xl bg-white/5 flex items-center justify-center shrink-0 border border-white/5 ${details.checkedIn ? 'text-emerald-500' : 'text-amber-500'}`}>
                    <span className="material-symbols-outlined text-lg">{details.checkedIn ? 'check_circle' : 'pending'}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-slate-400 text-[8px] font-black uppercase tracking-widest leading-none mb-1.5">Attendance Status</span>
                    <div className="flex items-center gap-1.5">
                      <span className={`size-1.5 rounded-full ${details.checkedIn ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                      <span className={`text-xs font-black uppercase tracking-wider ${details.checkedIn ? 'text-emerald-500' : 'text-amber-500'}`}>
                        {details.checkedIn ? 'Checked In' : 'Checked Out'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              <button onClick={() => setSelectedAttendee(null)} className="w-full h-12 bg-[#1e293b] hover:bg-[#334155] border border-white/10 text-white rounded-full text-xs font-black uppercase tracking-wider active:scale-95 transition-all flex items-center justify-center gap-2 mt-2 cursor-pointer">
                Close Profile
              </button>
            </div>
          </div>
        );
      })()}
    </div>
  );
};

const ServiceCard: React.FC<{ icon: string; title: string; desc: string; isPending: boolean; onClick: () => void }> = ({ icon, title, desc: _desc, isPending, onClick }) => (
  <button
    onClick={onClick}
    disabled={isPending}
    className={`p-6 rounded-3xl border-2 transition-all flex flex-col items-center gap-4 group h-full relative ${isPending ? 'bg-amber-500/10 border-amber-500/40 shadow-xl' : 'bg-white/5 border-white/10 hover:border-amber-500/50 hover:bg-amber-500/5 active:scale-95'}`}
  >
    <div className={`size-16 rounded-2xl flex items-center justify-center transition-all ${isPending ? 'bg-amber-500 text-white' : 'bg-slate-700 text-slate-100 group-hover:text-amber-500'}`}>
      {isPending ? (
        <span className="size-8 border-4 border-white/30 border-t-white rounded-full animate-spin" />
      ) : (
        <span className="material-symbols-outlined text-3xl font-variation-fill">{icon}</span>
      )}
    </div>
    <div className="text-center">
      <h4 className={`text-xl font-black uppercase tracking-tight leading-none transition-colors ${isPending ? 'text-amber-500' : 'text-white group-hover:text-amber-500'}`}>{title}</h4>
    </div>
  </button>
);

export default MeetingDetailsView;
