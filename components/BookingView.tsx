import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../lib/db';
import { Meeting, User } from '../types';

interface BookingViewProps {
  initialStartTime?: string;
  initialMeetingId?: string;
  currentUser: User | null;
  slotPrecision?: 15 | 30;
  roomName?: string;
  resourceId?: string;
  onBack: () => void;
  onSuccess: () => void;
  onTriggerLogin: () => void;
}

interface AttendeeUser {
  UserId: string;
  FullName: string;
  Email: string;
}

const SUGGESTED_TITLES = [
  "Strategic Planning",
  "Weekly Sync",
  "Client Presentation",
  "Product Roadmap",
  "Design Review",
  "Quick Standup",
  "Brainstorming Session",
  "Sprint Retro",
  "Stakeholder Update",
  "Budget Review"
];

const QUICK_DURATIONS = [30, 60, 90, 120];
const REF_DATE = '2000-01-01';

type ServiceType = 'CATERING' | 'SUPPORT' | 'CLEANING' | null;

const BookingView: React.FC<BookingViewProps> = ({
  initialStartTime,
  initialMeetingId,
  currentUser,
  slotPrecision = 30,
  roomName = 'Conference Room A',
  resourceId,
  onBack,
  onSuccess,
  onTriggerLogin
}) => {
  if (!currentUser && !initialMeetingId) {
    onBack();
    return null;
  }
  
  const [title, setTitle] = useState('');
  const [organizer, setOrganizer] = useState('');
  const [organizerPhoto, setOrganizerPhoto] = useState<string | undefined>(undefined);
  const [startTime, setStartTime] = useState(initialStartTime || '09:00 AM');
  const [endTime, setEndTime] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [type, setType] = useState<'INTERNAL' | 'CLIENT'>('INTERNAL');
  
  const [isRecurring, setIsRecurring] = useState(false);
  const [updateSeries, setUpdateSeries] = useState(false);
  const [recurrence, setRecurrence] = useState<'DAILY' | 'WEEKLY' | 'MONTHLY'>('WEEKLY');
  const [recurrenceEndDate, setRecurrenceEndDate] = useState<string>(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 1);
    return d.toISOString().split('T')[0];
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuggestionsOpen, setIsSuggestionsOpen] = useState(false);
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);
  const [activeInput, setActiveInput] = useState<'title' | 'organizer' | null>(null);
  const [isShift, setIsShift] = useState(true);

  // Service Modal State
  const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
  const [requestStatus, setRequestStatus] = useState<'IDLE' | 'PENDING' | 'SUCCESS'>('IDLE');
  const [activeService, setActiveService] = useState<ServiceType>(null);
  const [error, setError] = useState<string | null>(null);

  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [apiId, setApiId] = useState<string | undefined>(undefined);
  const attendees: AttendeeUser[] = [];
  
  const parseTimeString = (timeStr: string) => {
    const [time, modifier] = timeStr.split(' ');
    let [hours, minutes] = time.split(':').map(Number);
    if (modifier === 'PM' && hours < 12) hours += 12;
    if (modifier === 'AM' && hours === 12) hours = 0;
    
    const date = new Date(REF_DATE);
    date.setHours(hours, minutes, 0, 0);
    return date;
  };

  const isPastMeeting = useMemo(() => {
    if (!initialMeetingId) return false;
    const meeting = db.getMeetings().find(m => m.id === initialMeetingId);
    if (!meeting) return false;
    
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    if (meeting.date < today) return true;
    if (meeting.date > today) return false;
    
    const endTimeDate = parseTimeString(meeting.endTime);
    const nowTimeDate = new Date(REF_DATE);
    nowTimeDate.setHours(now.getHours(), now.getMinutes(), 0, 0);
    
    return nowTimeDate > endTimeDate;
  }, [initialMeetingId]);

  useEffect(() => {
    const loadedMeetings = db.getMeetings();
    setMeetings(loadedMeetings);

    if (initialMeetingId) {
      const existing = loadedMeetings.find(m => m.id === initialMeetingId);
      if (existing) {
        setTitle(existing.title);
        setOrganizer(existing.organizer);
        setOrganizerPhoto(existing.organizerPhoto);
        setStartTime(existing.startTime);
        setEndTime(existing.endTime);
        setDate(existing.date);
        setType(existing.type);
        setApiId(existing.apiId);
        if (existing.recurrence && existing.recurrence !== 'NONE') {
          setIsRecurring(true);
          setUpdateSeries(true);
          setRecurrence(existing.recurrence as any);
          setRecurrenceEndDate(existing.recurrenceEndDate || '');
        }
      }
    } else {
      if (initialStartTime) {
        setStartTime(initialStartTime);
      }
      if (currentUser) {
        setOrganizer(currentUser.name);
        setOrganizerPhoto(currentUser.photo);
      }
    }
  }, [initialMeetingId, initialStartTime, currentUser]);

  const formatToTimeString = (date: Date) => {
    let hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12; 
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')} ${ampm}`;
  };

  const allTimeOptions = useMemo(() => {
    const options: string[] = [];
    const intervals = slotPrecision === 15 ? ['00', '15', '30', '45'] : ['00', '30'];
    for (let h = 0; h < 24; h++) {
      const ampm = h >= 12 ? 'PM' : 'AM';
      let hour12 = h % 12;
      if (hour12 === 0) hour12 = 12;
      const hStr = hour12.toString().padStart(2, '0');
      intervals.forEach(m => options.push(`${hStr}:${m} ${ampm}`));
    }
    return options;
  }, [slotPrecision]);

  const startOptions = useMemo((): { time: string; disabled: boolean }[] => {
    const now = new Date();
    const isSelectedToday = date === new Date().toISOString().split('T')[0];
    // Build a REF_DATE-based "now" for fair comparison with parseTimeString results
    const nowRef = new Date(REF_DATE);
    nowRef.setHours(now.getHours(), now.getMinutes(), 0, 0);
    return allTimeOptions.map((t: string) => {
      const tDate = parseTimeString(t);
      const isPast = isSelectedToday && tDate < nowRef;
      const conflict = meetings.find(m => {
        if (m.id === initialMeetingId || m.date !== date) return false;
        const mStart = parseTimeString(m.startTime);
        const mEnd = parseTimeString(m.endTime);
        return tDate >= mStart && tDate < mEnd;
      });
      return { time: t, disabled: isPast || !!conflict };
    });
  }, [allTimeOptions, meetings, initialMeetingId, date]);

  const availableEndOptions = useMemo((): { time: string; disabled: boolean }[] => {
    const sDate = parseTimeString(startTime);

    const nextMeeting = meetings
      .filter(m => m.id !== initialMeetingId && m.date === date)
      .filter(m => parseTimeString(m.startTime).getTime() > sDate.getTime())
      .sort((a, b) => parseTimeString(a.startTime).getTime() - parseTimeString(b.startTime).getTime())[0];

    const cap = nextMeeting ? parseTimeString(nextMeeting.startTime) : null;

    return allTimeOptions
      .filter((t: string) => parseTimeString(t).getTime() > sDate.getTime())
      .map((t: string) => ({
        time: t,
        disabled: cap ? parseTimeString(t).getTime() > cap.getTime() : false,
      }));
  }, [startTime, date, meetings, allTimeOptions, initialMeetingId]);

  const availableDurations = useMemo(() => {
    const sDate = parseTimeString(startTime);
    return QUICK_DURATIONS.filter(duration => {
      const targetDate = new Date(sDate.getTime() + duration * 60000);
      return availableEndOptions.some(opt => !opt.disabled && parseTimeString(opt.time).getTime() === targetDate.getTime());
    });
  }, [startTime, availableEndOptions]);

  const currentDuration = useMemo(() => {
    if (!endTime) return null;
    const sDate = parseTimeString(startTime);
    const eDate = parseTimeString(endTime);
    return Math.round((eDate.getTime() - sDate.getTime()) / 60000);
  }, [startTime, endTime]);

  useEffect(() => {
    const enabledOptions = availableEndOptions.filter((o: { time: string; disabled: boolean }) => !o.disabled);
    if (enabledOptions.length > 0) {
      const sDate = parseTimeString(startTime);
      const eDate = endTime ? parseTimeString(endTime) : null;
      const endStillValid = endTime && enabledOptions.some((o: { time: string; disabled: boolean }) => o.time === endTime);
      if (!endStillValid || (eDate && eDate.getTime() <= sDate.getTime())) {
        const preferredEndDate = new Date(sDate.getTime() + slotPrecision * 60000);
        const preferred = enabledOptions.find((o: { time: string; disabled: boolean }) => parseTimeString(o.time).getTime() === preferredEndDate.getTime());
        setEndTime(preferred ? preferred.time : enabledOptions[0].time);
      }
    } else {
      setEndTime('');
    }
  }, [startTime, availableEndOptions, endTime, slotPrecision]);

  const handleSetDuration = (duration: number) => {
    const sDate = parseTimeString(startTime);
    const targetDate = new Date(sDate.getTime() + duration * 60000);
    const matchedOpt = availableEndOptions.find(opt => parseTimeString(opt.time).getTime() === targetDate.getTime());
    if (matchedOpt) setEndTime(matchedOpt.time);
  };

  const to24h = (timeStr: string) => {
    const [time, modifier] = timeStr.split(' ');
    let [hours, minutes] = time.split(':').map(Number);
    if (modifier === 'PM' && hours < 12) hours += 12;
    if (modifier === 'AM' && hours === 12) hours = 0;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:00`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!title.trim()) { setError('Please enter a meeting title'); return; }
    if (!organizer.trim()) { setError('Please enter an organizer name'); return; }
    if (!startTime || !endTime) { setError('Please select start and end times'); return; }
    if (isPastMeeting) { setError('Cannot book a meeting in the past'); return; }

    setIsSubmitting(true);

    try {
      if (initialMeetingId) {
        const body = {
          ResourceId: resourceId,
          OrganizerUserId: currentUser?.userId,
          BookingDate: date,
          StartTime: to24h(startTime),
          EndTime: to24h(endTime),
          Subject: title.trim(),
          attendee: attendees,
        };
        const res = await fetch(`https://sb.asasconnect.com/api/Bookings/${apiId ?? initialMeetingId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            ...(currentUser?.token ? { Authorization: `Bearer ${currentUser.token}` } : {}),
          },
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          const msg = await res.text().catch(() => '');
          throw new Error(msg || `API error ${res.status}`);
        }
        db.updateMeeting(initialMeetingId, {
          title: title.trim(), organizer: organizer.trim(), startTime, endTime, type,
          recurrence: isRecurring ? recurrence : 'NONE',
          recurrenceEndDate: isRecurring ? recurrenceEndDate : undefined
        }, updateSeries);
        onSuccess();
      } else {
        // New booking — call the API
        const body: Record<string, unknown> = {
          ResourceId: resourceId,
          OrganizerUserId: currentUser?.userId,
          BookingDate: date,
          StartTime: to24h(startTime),
          EndTime: to24h(endTime),
          Subject: title.trim(),
          attendee: attendees,
        };

        const res = await fetch('https://sb.asasconnect.com/api/Bookings', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(currentUser?.token ? { Authorization: `Bearer ${currentUser.token}` } : {}),
          },
          body: JSON.stringify(body),
        });

        if (!res.ok) {
          const msg = await res.text().catch(() => '');
          throw new Error(msg || `API error ${res.status}`);
        }

        // Capture the API-assigned booking ID from the response and store it locally
        const responseData = await res.json().catch(() => null);
        const newApiId: string | undefined = responseData
          ? String(responseData?.bookingId ?? responseData?.BookingId ?? responseData?.id ?? responseData?.Id ?? '')
              .replace(/^undefined$/, '') || undefined
          : undefined;

        // Also persist locally so the UI reflects it immediately
        db.addMeeting({
          title: title.trim(), organizer: organizer.trim(), organizerPhoto, startTime, endTime, date,
          type, recurrence: isRecurring ? recurrence : 'NONE',
          recurrenceEndDate: isRecurring ? recurrenceEndDate : undefined,
          attendees: [{ name: organizer.trim(), photo: organizerPhoto }],
          apiId: newApiId,
        });

        onSuccess();
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save booking. Please try again.');
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = () => {
    if (isPastMeeting) return;
    const existing = db.getMeetings().find(m => m.id === initialMeetingId);
    if (initialMeetingId && existing) {
      if (existing.groupId) {
        const choice = window.confirm('This is a recurring meeting. Do you want to cancel the entire future series? Click OK for series, Cancel for just this instance.');
        db.deleteMeeting(initialMeetingId, choice);
      } else if (window.confirm('Are you sure you want to cancel this booking?')) {
        db.deleteMeeting(initialMeetingId);
      }
      onSuccess();
    }
  };

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

  const handleKeyPress = (char: string) => {
    if (isPastMeeting) return;
    if (activeInput === 'title') {
      setTitle(prev => prev + (isShift ? char.toUpperCase() : char.toLowerCase()));
    } else if (activeInput === 'organizer') {
      setOrganizer(prev => prev + (isShift ? char.toUpperCase() : char.toLowerCase()));
    }
  };

  const handleBackspace = () => {
    if (isPastMeeting) return;
    if (activeInput === 'title') { setTitle(prev => prev.slice(0, -1)); } 
    else if (activeInput === 'organizer') { setOrganizer(prev => prev.slice(0, -1)); }
  };

  const handleSpace = () => {
    if (isPastMeeting) return;
    if (activeInput === 'title') { setTitle(prev => prev + ' '); } 
    else if (activeInput === 'organizer') { setOrganizer(prev => prev + ' '); }
  };

  const keyboardRows = [
    ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
    ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
    ['Z', 'X', 'C', 'V', 'B', 'N', 'M']
  ];

  const currentInputValue = activeInput === 'title' ? title : organizer;

  return (
    <div className="flex flex-col h-full bg-[#050505] overflow-hidden relative">
      <div className="absolute top-[-20%] right-[-10%] size-[80%] bg-primary/20 blur-[150px] rounded-xl pointer-events-none" />

      {/* Header — matching MeetingDetailsView */}
      <header className="flex items-center justify-between p-3 lg:p-4 border-b border-white/5 bg-black/20 backdrop-blur-xl relative z-10 shrink-0">
        <div className="flex items-center gap-3">
          <button type="button" onClick={onBack} className="size-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-all">
            <span className="material-symbols-outlined text-xl">arrow_back</span>
          </button>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black text-white tracking-tight leading-none uppercase">
                {initialMeetingId ? (isPastMeeting ? 'Archived Booking' : 'Edit Booking') : 'New Booking'}
              </h1>
              {initialMeetingId && !isPastMeeting && (
                <button
                  type="button"
                  onClick={() => setIsServiceModalOpen(true)}
                  className="size-8 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500 hover:bg-amber-500 hover:text-white transition-all active:scale-95 group shadow-lg"
                  title="Request Service"
                >
                  <span className="material-symbols-outlined text-base font-variation-fill group-hover:rotate-12 transition-transform">notifications_active</span>
                </button>
              )}
            </div>
            <p className="text-white text-[8px] font-black uppercase tracking-[0.4em] mt-1">{roomName} • Booking Details</p>
          </div>
        </div>
        {initialMeetingId && !isPastMeeting && (
          <button onClick={handleDelete} className="px-4 py-2 bg-red-500/10 text-red-500 border border-red-500/20 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all">
            Cancel Booking
          </button>
        )}
      </header>

      <main className="flex-1 overflow-y-auto p-3 lg:p-4 relative z-10 custom-scrollbar">
        <form onSubmit={handleSubmit} className="max-w-4xl mx-auto flex flex-col gap-3">

          {/* Organizer card */}
          {(initialMeetingId || currentUser) && organizerPhoto && (
            <div className="bg-white/[0.03] border border-white/10 rounded-xl p-4 lg:p-5 shadow-2xl flex items-center gap-4">
              <div className="size-14 rounded-xl bg-white/5 border border-white/10 p-0.5 shrink-0 relative overflow-hidden">
                <img src={organizerPhoto} alt={organizer} className="size-full object-cover rounded-xl" />
                <div className="absolute -bottom-1 -right-1 size-4 bg-emerald-500 border-2 border-[#050505] rounded-xl flex items-center justify-center shadow-lg">
                  <span className="material-symbols-outlined text-white text-[6px] font-bold">verified</span>
                </div>
              </div>
              <div className="flex flex-col">
                <span className="text-slate-400 text-[8px] font-black uppercase tracking-widest mb-1">Lead Organizer</span>
                <h3 className="text-lg font-black text-white tracking-tight leading-none">{organizer}</h3>
                <span className="text-primary text-[8px] font-black uppercase tracking-widest mt-1">Authenticated</span>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {/* Left column: Details + Recurring */}
            <div className="flex flex-col gap-3">

              {/* Event Details card */}
              <div className="bg-white/[0.03] border border-white/10 rounded-xl p-4 lg:p-5 shadow-2xl flex flex-col gap-4">
                <div className="flex items-center gap-2 pb-3 border-b border-white/5">
                  <div className="size-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
                    <span className="material-symbols-outlined text-base">title</span>
                  </div>
                  <span className="text-[9px] font-black uppercase tracking-[0.4em] text-primary">Event Details</span>
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-slate-400 text-[8px] font-black uppercase tracking-widest">Event Title</label>
                  <div className="flex gap-2">
                    <input
                      required type="text" value={title}
                      onFocus={() => { if (!isPastMeeting) { setIsKeyboardOpen(true); setActiveInput('title'); } }}
                      readOnly placeholder="e.g., Weekly Sync"
                      className={`flex-1 bg-white/5 border rounded-xl p-2.5 text-sm font-bold text-white placeholder:text-slate-500 outline-none transition-all cursor-pointer ${activeInput === 'title' ? 'border-primary ring-2 ring-primary/20 bg-white/10' : 'border-white/10 hover:border-white/20'}`}
                    />
                    <button type="button" disabled={isPastMeeting} onClick={() => setIsSuggestionsOpen(true)} className="size-10 rounded-xl bg-[#0b1a2d] border border-primary/20 text-primary flex items-center justify-center hover:bg-primary hover:text-white transition-all shadow-xl active:scale-95 group shrink-0">
                      <span className="material-symbols-outlined text-base group-hover:rotate-12 transition-transform">magic_button</span>
                    </button>
                  </div>
                </div>

                {!currentUser && (
                  <div className="flex flex-col gap-2">
                    <label className="text-slate-400 text-[8px] font-black uppercase tracking-widest">Organizer Name</label>
                    <input
                      required type="text" value={organizer}
                      onFocus={() => { if (!isPastMeeting) { setIsKeyboardOpen(true); setActiveInput('organizer'); } }}
                      readOnly placeholder="Your Full Name"
                      className={`bg-white/5 border rounded-xl p-2.5 text-sm font-bold text-white placeholder:text-slate-500 outline-none transition-all cursor-pointer ${activeInput === 'organizer' ? 'border-primary ring-2 ring-primary/20 bg-white/10' : 'border-white/10 hover:border-white/20'}`}
                    />
                  </div>
                )}

                <div className="flex flex-col gap-2">
                  <label className="text-slate-400 text-[8px] font-black uppercase tracking-widest">Session Type</label>
                  <div className="grid grid-cols-2 gap-2">
                    {(['INTERNAL', 'CLIENT'] as const).map(t => (
                      <button key={t} type="button" disabled={isPastMeeting} onClick={() => setType(t)}
                        className={`py-2.5 rounded-xl text-[10px] font-black transition-all border uppercase tracking-widest ${type === t ? 'bg-primary border-primary text-white shadow-lg' : 'bg-white/5 border-white/10 text-slate-300 hover:text-white hover:border-white/20'}`}>
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-slate-400 text-[8px] font-black uppercase tracking-widest">Date</label>
                  <input
                    type="date" value={date} onChange={(e) => setDate(e.target.value)}
                    disabled={!!initialMeetingId}
                    className="w-full bg-white/5 border border-white/10 rounded-xl p-2.5 text-sm font-bold text-white outline-none focus:border-primary color-scheme-dark disabled:opacity-50 transition-all"
                  />
                </div>
              </div>

              {/* Recurring card */}
              <div className="bg-white/[0.03] border border-white/10 rounded-xl p-4 lg:p-5 shadow-2xl flex flex-col gap-4">
                <div className="flex items-center justify-between pb-3 border-b border-white/5">
                  <div className="flex items-center gap-2">
                    <div className="size-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
                      <span className="material-symbols-outlined text-base">repeat</span>
                    </div>
                    <span className="text-[9px] font-black uppercase tracking-[0.4em] text-primary">Recurring</span>
                  </div>
                  <button type="button" disabled={isPastMeeting} onClick={() => setIsRecurring(!isRecurring)}
                    className={`size-8 rounded-xl flex items-center justify-center transition-all ${isRecurring ? 'bg-primary text-white' : 'bg-white/5 text-slate-400 border border-white/10'}`}>
                    <span className="material-symbols-outlined text-base">{isRecurring ? 'toggle_on' : 'toggle_off'}</span>
                  </button>
                </div>
                {isRecurring ? (
                  <div className="flex flex-col gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="grid grid-cols-3 gap-2">
                      {['DAILY', 'WEEKLY', 'MONTHLY'].map(f => (
                        <button key={f} type="button" onClick={() => setRecurrence(f as any)}
                          className={`py-2 rounded-xl text-[9px] font-black transition-all border uppercase tracking-widest ${recurrence === f ? 'bg-primary border-primary text-white shadow-lg' : 'bg-white/5 border-white/10 text-slate-300 hover:text-white hover:border-white/20'}`}>{f}</button>
                      ))}
                    </div>
                    <div className="flex flex-col gap-2">
                      <label className="text-slate-400 text-[8px] font-black uppercase tracking-widest">End Date</label>
                      <input type="date" value={recurrenceEndDate} onChange={(e) => setRecurrenceEndDate(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl p-2.5 text-sm font-bold text-white outline-none focus:border-primary color-scheme-dark transition-all" />
                    </div>
                    {initialMeetingId && (
                      <button type="button" onClick={() => setUpdateSeries(!updateSeries)}
                        className={`flex items-center gap-2 p-2.5 rounded-xl border transition-all ${updateSeries ? 'bg-primary/10 border-primary/30 text-primary' : 'bg-white/5 border-white/10 text-slate-300'}`}>
                        <span className="material-symbols-outlined text-base">{updateSeries ? 'check_box' : 'check_box_outline_blank'}</span>
                        <span className="text-[9px] font-black uppercase tracking-widest">Update Entire Series</span>
                      </button>
                    )}
                  </div>
                ) : (
                  <p className="text-slate-500 text-[9px] font-black uppercase tracking-widest">One-time meeting</p>
                )}
              </div>

            </div>

            {/* Right column: Schedule & Submit */}
            <div className="bg-white/[0.03] border border-white/10 rounded-xl p-4 lg:p-5 shadow-2xl flex flex-col gap-4">
              <div className="flex items-center gap-2 pb-3 border-b border-white/5">
                <div className="size-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
                  <span className="material-symbols-outlined text-base font-variation-fill">schedule</span>
                </div>
                <span className="text-[9px] font-black uppercase tracking-[0.4em] text-primary">Schedule</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-2">
                  <label className="text-slate-400 text-[8px] font-black uppercase tracking-widest">Start Time</label>
                  <select disabled={isPastMeeting} value={startTime} onChange={(e) => setStartTime(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl p-2.5 text-sm font-bold text-white outline-none focus:border-primary appearance-none transition-all hover:border-white/20">
                    {startOptions.map((o: { time: string; disabled: boolean; past?: boolean }) => <option key={o.time} value={o.time} disabled={o.disabled} className="bg-[#111]">{o.time}{o.disabled ? (o.past ? ' (past)' : ' (booked)') : ''}</option>)}
                  </select>
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-slate-400 text-[8px] font-black uppercase tracking-widest">End Time</label>
                  <select disabled={availableEndOptions.length === 0 || isPastMeeting} value={endTime} onChange={(e) => setEndTime(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl p-2.5 text-sm font-bold text-white outline-none focus:border-primary appearance-none transition-all hover:border-white/20">
                    {availableEndOptions.map((o: { time: string; disabled: boolean }) => <option key={o.time} value={o.time} disabled={o.disabled} className="bg-[#111]">{o.time}{o.disabled ? ' (booked)' : ''}</option>)}
                  </select>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-slate-400 text-[8px] font-black uppercase tracking-widest">Quick Duration</label>
                <div className="grid grid-cols-4 gap-2">
                  {QUICK_DURATIONS.map(dur => (
                    <button key={dur} type="button" disabled={!availableDurations.includes(dur) || isPastMeeting} onClick={() => handleSetDuration(dur)}
                      className={`py-2.5 rounded-xl text-[10px] font-black transition-all border ${currentDuration === dur ? 'bg-primary border-primary text-white shadow-lg' : 'bg-white/5 border-white/10 text-slate-300 disabled:opacity-30 hover:border-white/20 hover:text-white'}`}>
                      {dur >= 60 ? `${dur / 60}h` : `${dur}m`}
                    </button>
                  ))}
                </div>
              </div>

              {/* Duration summary */}
              {currentDuration && (
                <div className="bg-primary/5 border border-primary/20 rounded-xl p-3 flex items-center gap-3 animate-in fade-in duration-300">
                  <div className="size-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20 shrink-0">
                    <span className="material-symbols-outlined text-base font-variation-fill">hourglass_empty</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-slate-400 text-[8px] font-black uppercase tracking-widest">Duration</span>
                    <span className="text-white text-sm font-black">
                      {startTime} — {endTime} &nbsp;·&nbsp; {currentDuration >= 60 ? `${currentDuration / 60}h` : `${currentDuration}m`}
                    </span>
                  </div>
                </div>
              )}

              {error && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 flex items-center gap-2 text-red-400 animate-in fade-in slide-in-from-top-2 duration-300">
                  <span className="material-symbols-outlined text-base">error</span>
                  <p className="text-[10px] font-bold">{error}</p>
                </div>
              )}

              <div className="mt-auto pt-1">
                <button type="submit" disabled={isSubmitting || availableEndOptions.length === 0 || isPastMeeting}
                  className="w-full bg-white text-black py-4 rounded-xl text-sm font-black shadow-2xl shadow-white/10 hover:bg-slate-100 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50 border-t border-white/20 uppercase tracking-widest">
                  {isSubmitting
                    ? <span className="size-4 border-2 border-black/30 border-t-black rounded-xl animate-spin"></span>
                    : <><span className="material-symbols-outlined text-lg font-bold">{initialMeetingId ? 'save' : 'event_available'}</span>{initialMeetingId ? 'Update Booking' : 'Confirm Booking'}</>
                  }
                </button>
              </div>
            </div>
          </div>
        </form>
      </main>

      {/* Virtual Keyboard */}
      <div className={`fixed bottom-0 left-0 right-0 z-[70] bg-[#0a1016]/95 backdrop-blur-3xl border-t border-white/10 shadow-[0_-40px_120px_rgba(0,0,0,0.9)] transition-all duration-500 ${isKeyboardOpen ? 'translate-y-0' : 'translate-y-full'}`}>
        <div className="max-w-4xl mx-auto p-4 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <span className="text-slate-200 font-black uppercase tracking-widest text-[8px]">Input Field: <span className="text-primary">{activeInput?.toUpperCase()}</span></span>
            <button onClick={() => { setIsKeyboardOpen(false); setActiveInput(null); }} className="px-4 py-1.5 bg-white/5 hover:bg-white/10 text-slate-200 rounded-xl text-[8px] font-black uppercase tracking-widest transition-all">Dismiss</button>
          </div>
          <div className="bg-white/5 border-2 border-primary/30 rounded-xl p-4 min-h-[60px] flex items-center relative overflow-hidden">
            <p className={`text-2xl font-black tracking-tight leading-none break-all ${currentInputValue ? 'text-white' : 'text-slate-500'}`}>{currentInputValue || 'Start typing...'}</p>
            <span className="ml-1 w-0.5 h-8 bg-primary animate-pulse rounded-xl"></span>
          </div>
          <div className="flex flex-col gap-1.5">
            {keyboardRows.map((row, rIdx) => (
              <div key={rIdx} className="flex justify-center gap-1.5">
                {rIdx === 2 && <button onClick={() => setIsShift(!isShift)} className={`flex-1 max-w-[80px] h-11 rounded-xl flex items-center justify-center transition-all ${isShift ? 'bg-primary text-white shadow-lg' : 'bg-white/5 text-slate-300'}`}><span className="material-symbols-outlined text-xl">shift</span></button>}
                {row.map(key => <button key={key} onClick={() => handleKeyPress(key)} className="flex-1 min-w-[35px] max-w-[70px] h-11 bg-white/5 hover:bg-white/10 active:bg-primary active:text-white border border-white/5 rounded-xl text-white text-lg font-black transition-all">{isShift ? key : key.toLowerCase()}</button>)}
                {rIdx === 2 && <button onClick={handleBackspace} className="flex-1 max-w-[80px] h-11 bg-white/5 hover:bg-white/10 rounded-xl flex items-center justify-center text-slate-200"><span className="material-symbols-outlined text-xl">backspace</span></button>}
              </div>
            ))}
            <div className="flex justify-center gap-1.5 mt-1">
              <button onClick={handleSpace} className="flex-1 max-w-[400px] h-11 bg-white/5 border border-white/5 rounded-xl text-slate-300 text-[10px] font-black uppercase tracking-widest">Space</button>
              <button onClick={() => { setIsKeyboardOpen(false); setActiveInput(null); }} className="w-20 h-11 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-500 text-[10px] font-black uppercase tracking-widest">Confirm</button>
            </div>
          </div>
        </div>
      </div>

      {/* Service Modal Popup */}
      {isServiceModalOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 animate-in fade-in duration-300">
           <div className="absolute inset-0 bg-black/90 backdrop-blur-2xl" onClick={() => !requestStatus.includes('PENDING') && setIsServiceModalOpen(false)} />
           <div className="relative w-full max-w-2xl bg-[#1c2127] rounded-xl border border-white/10 shadow-[0_0_100px_rgba(0,0,0,1)] p-10 lg:p-14 flex flex-col items-center gap-8 animate-in zoom-in-95 duration-300 overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-2 bg-amber-500/50" />
              <div className="flex flex-col items-center text-center gap-3">
                 <div className="size-20 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 mb-2">
                    <span className="material-symbols-outlined text-4xl font-variation-fill animate-bounce">notifications_active</span>
                 </div>
                 <h2 className="text-4xl font-black text-white tracking-tighter uppercase leading-none">Service Bell</h2>
                 <p className="text-slate-300 font-bold uppercase tracking-widest text-xs">Request room assistance</p>
              </div>
              {requestStatus === 'SUCCESS' ? (
                <div className="flex flex-col items-center gap-6 py-10 animate-in fade-in zoom-in duration-500">
                   <div className="size-32 rounded-xl bg-emerald-500/10 border-4 border-emerald-500/30 flex items-center justify-center text-emerald-500 shadow-xl">
                      <span className="material-symbols-outlined text-6xl font-black">check_circle</span>
                   </div>
                   <div className="text-center">
                     <p className="text-2xl font-black text-white uppercase tracking-tight">Request Sent</p>
                     <p className="text-slate-300 font-medium mt-1">Our staff has been notified.</p>
                   </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
                  <ServiceCard icon="restaurant" title="Catering" isPending={requestStatus === 'PENDING' && activeService === 'CATERING'} onClick={() => handleServiceRequest('CATERING')} />
                  <ServiceCard icon="support_agent" title="Support" isPending={requestStatus === 'PENDING' && activeService === 'SUPPORT'} onClick={() => handleServiceRequest('SUPPORT')} />
                  <ServiceCard icon="cleaning_services" title="Cleaning" isPending={requestStatus === 'PENDING' && activeService === 'CLEANING'} onClick={() => handleServiceRequest('CLEANING')} />
                </div>
              )}
              <button onClick={() => setIsServiceModalOpen(false)} className="text-slate-400 font-black uppercase tracking-widest text-[10px] hover:text-white transition-colors">Dismiss</button>
           </div>
        </div>
      )}

      {/* Suggested Titles Modal */}
      {isSuggestionsOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-black/90 backdrop-blur-2xl" onClick={() => setIsSuggestionsOpen(false)} />
          <div className="relative w-full max-w-2xl bg-[#1c2127] rounded-xl border border-white/10 shadow-[0_0_100px_rgba(0,0,0,1)] p-10 flex flex-col gap-8 animate-in zoom-in-95 duration-300">
            <div className="flex flex-col gap-2">
              <h2 className="text-3xl font-black text-white tracking-tight uppercase">Suggested Titles</h2>
              <p className="text-slate-300 font-black uppercase tracking-widest text-[10px]">Quick select for common meeting types</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {SUGGESTED_TITLES.map(t => (
                <button 
                  key={t} 
                  onClick={() => { setTitle(t); setIsSuggestionsOpen(false); }}
                  className="p-5 rounded-xl bg-white/5 border border-white/10 text-left hover:bg-primary/10 hover:border-primary transition-all active:scale-95 group"
                >
                  <p className="text-white font-bold group-hover:text-primary transition-colors">{t}</p>
                </button>
              ))}
            </div>
            <button onClick={() => setIsSuggestionsOpen(false)} className="text-slate-400 font-black uppercase tracking-widest text-[10px] hover:text-white transition-colors text-center">Dismiss</button>
          </div>
        </div>
      )}

      {(isSuggestionsOpen || isKeyboardOpen || isServiceModalOpen) && (
        <div className="fixed inset-0 z-[55] bg-black/60 backdrop-blur-[40px] transition-all animate-in fade-in" onClick={() => { setIsSuggestionsOpen(false); setIsKeyboardOpen(false); setIsServiceModalOpen(false); }} />
      )}
    </div>
  );
};

const ServiceCard: React.FC<{ icon: string; title: string; isPending: boolean; onClick: () => void }> = ({ icon, title, isPending, onClick }) => (
  <button onClick={onClick} disabled={isPending} className={`p-6 rounded-xl border-2 transition-all flex flex-col items-center gap-4 group h-full relative ${isPending ? 'bg-amber-500/10 border-amber-500/40 shadow-xl' : 'bg-white/5 border-white/10 hover:border-amber-500/50 hover:bg-amber-500/5 active:scale-95'}`}>
    <div className={`size-16 rounded-xl flex items-center justify-center transition-all ${isPending ? 'bg-amber-500 text-white' : 'bg-slate-800 text-slate-300 group-hover:text-amber-500'}`}>
       {isPending ? <span className="size-8 border-4 border-white/30 border-t-white rounded-xl animate-spin"></span> : <span className="material-symbols-outlined text-3xl font-variation-fill">{icon}</span>}
    </div>
    <div className="text-center">
       <h4 className={`text-xl font-black uppercase tracking-tight leading-none mb-1 transition-colors ${isPending ? 'text-amber-500' : 'text-white group-hover:text-amber-500'}`}>{title}</h4>
       <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest">{isPending ? 'Working...' : 'Request now'}</p>
    </div>
  </button>
);

export default BookingView;