import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../lib/db';
import { doorSignFetch } from '../lib/doorSignFetch';
import { getBaseUrl } from '../lib/hostUrl';
import { Meeting, User } from '../types';

interface BookingViewProps {
  initialStartTime?: string;
  initialMeetingId?: string;
  initialDate?: string;
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
  initialDate,
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
  const [date, setDate] = useState(initialDate || new Date().toISOString().split('T')[0]);
  const [type, setType] = useState<'INTERNAL' | 'CLIENT'>('INTERNAL');
  
  const [isRecurring, setIsRecurring] = useState(false);
  const [updateSeries, setUpdateSeries] = useState(false);
  const [recurrence, setRecurrence] = useState<'DAILY' | 'WEEKLY' | 'MONTHLY'>('WEEKLY');
  const [recurrenceEndDate, setRecurrenceEndDate] = useState<string>(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 1);
    return d.toISOString().split('T')[0];
  });
  // Days of week for weekly recurrence: 1=Mon … 7=Sun
  const [selectedDays, setSelectedDays] = useState<number[]>(() => {
    const d = new Date().getDay(); // 0=Sun … 6=Sat
    return [d === 0 ? 7 : d]; // convert to 1-7
  });
  const toggleDay = (day: number) =>
    setSelectedDays(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day].sort((a, b) => a - b));

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuggestionsOpen, setIsSuggestionsOpen] = useState(false);
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);
  const [activeInput, setActiveInput] = useState<'title' | null>(null);
  const [isShift, setIsShift] = useState(true);

  // Service Modal State
  const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
  const [requestStatus, setRequestStatus] = useState<'IDLE' | 'PENDING' | 'SUCCESS'>('IDLE');
  const [activeService, setActiveService] = useState<ServiceType>(null);
  const [error, setError] = useState<string | null>(null);

  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [apiId, setApiId] = useState<string | undefined>(undefined);
  const attendees: AttendeeUser[] = [];

  // Ticks every minute so past-slot detection stays current while the form is open
  const [nowTick, setNowTick] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setNowTick(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);
  
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
        // Snap to first available, non-past, non-conflicting slot if the proposed time is invalid
        const now = new Date();
        const today = now.toISOString().split('T')[0];
        const targetDate = initialDate || today;
        const isToday = targetDate === today;
        const nowRef = new Date(REF_DATE);
        nowRef.setHours(now.getHours(), now.getMinutes(), 0, 0);
        const initialParsed = parseTimeString(initialStartTime);
        const isPastSlot = isToday && initialParsed <= nowRef;
        const isConflictSlot = loadedMeetings.some(m => {
          if (m.date !== targetDate) return false;
          const mS = parseTimeString(m.startTime);
          const mE = parseTimeString(m.endTime);
          return initialParsed >= mS && initialParsed < mE;
        });
        if (isPastSlot || isConflictSlot) {
          // Find first non-past, non-conflicting slot
          const intervals = slotPrecision === 15 ? ['00', '15', '30', '45'] : ['00', '30'];
          const allOpts: string[] = [];
          for (let h = 0; h < 24; h++) {
            const ampm = h >= 12 ? 'PM' : 'AM';
            let hour12 = h % 12; if (hour12 === 0) hour12 = 12;
            const hStr = hour12.toString().padStart(2, '0');
            intervals.forEach(m => allOpts.push(`${hStr}:${m} ${ampm}`));
          }
          const firstAvailable = allOpts.find(t => {
            const d = parseTimeString(t);
            if (isToday && d <= nowRef) return false;
            return !loadedMeetings.some(m => {
              if (m.date !== targetDate) return false;
              const mS = parseTimeString(m.startTime);
              const mE = parseTimeString(m.endTime);
              return d >= mS && d < mE;
            });
          });
          setStartTime(firstAvailable || initialStartTime);
        } else {
          setStartTime(initialStartTime);
        }
      }
      if (currentUser) {
        setOrganizer(currentUser.name);
        setOrganizerPhoto(currentUser.photo);
      }
    }
  }, [initialMeetingId, initialStartTime, initialDate, currentUser]);

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

  const startOptions = useMemo((): { time: string; disabled: boolean; reason?: 'past' | 'booked' }[] => {
    const isSelectedToday = date === nowTick.toISOString().split('T')[0];
    const nowRef = new Date(REF_DATE);
    nowRef.setHours(nowTick.getHours(), nowTick.getMinutes(), 0, 0);
    return allTimeOptions.map((t: string) => {
      const tDate = parseTimeString(t);
      const isPast = isSelectedToday && tDate <= nowRef;
      const conflict = meetings.find(m => {
        if (m.id === initialMeetingId || m.date !== date) return false;
        const mStart = parseTimeString(m.startTime);
        const mEnd = parseTimeString(m.endTime);
        return tDate >= mStart && tDate < mEnd;
      });
      const reason: 'past' | 'booked' | undefined = isPast ? 'past' : conflict ? 'booked' : undefined;
      return { time: t, disabled: isPast || !!conflict, reason };
    });
  }, [allTimeOptions, meetings, initialMeetingId, date, nowTick]);

  // Auto-snap startTime forward whenever the selected slot becomes past or conflicts with a booking
  useEffect(() => {
    if (initialMeetingId) return; // don't snap when editing existing booking
    const currentOption = startOptions.find(o => o.time === startTime);
    if (currentOption?.disabled) {
      const firstAvailable = startOptions.find(o => !o.disabled);
      if (firstAvailable) setStartTime(firstAvailable.time);
    }
  }, [startOptions, startTime, initialMeetingId]);

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
    if (!startTime || !endTime) { setError('Please select start and end times'); return; }
    if (isPastMeeting) { setError('Cannot book a meeting in the past'); return; }

    // Guard: prevent booking a past start time on today
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    if (!initialMeetingId && date === today) {
      const nowRef = new Date(REF_DATE);
      nowRef.setHours(now.getHours(), now.getMinutes(), 0, 0);
      const startParsed = parseTimeString(startTime);
      if (startParsed <= nowRef) {
        setError('Start time is in the past. Please select a future time slot.');
        return;
      }
    }

    // Guard: check for conflicts with existing bookings
    const conflictingMeeting = meetings.find(m => {
      if (m.id === initialMeetingId || m.date !== date) return false;
      const mStart = parseTimeString(m.startTime);
      const mEnd = parseTimeString(m.endTime);
      const sDate = parseTimeString(startTime);
      const eDate = parseTimeString(endTime);
      return sDate < mEnd && eDate > mStart;
    });
    if (conflictingMeeting) {
      setError(`This time conflicts with an existing booking: "${conflictingMeeting.title}"`);
      return;
    }

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
        const res = await doorSignFetch(`${getBaseUrl()}/api/Bookings/${apiId ?? initialMeetingId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            ...(currentUser?.token ? { Authorization: `Bearer ${currentUser.token}` } : {}),
          },
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          const raw = await res.text().catch(() => '');
          const msg = raw.replace(/[{}"\[\]]/g, '').trim();
          throw new Error(msg || 'Unable to update the booking. Please try again.');
        }
        db.updateMeeting(initialMeetingId, {
          title: title.trim(), organizer: organizer.trim(), startTime, endTime, type,
          recurrence: isRecurring ? recurrence : 'NONE',
          recurrenceEndDate: isRecurring ? recurrenceEndDate : undefined
        }, updateSeries);
        onSuccess();
      } else {
        // New booking — call the correct API based on recurrence
        if (isRecurring) {
          const to24hShort = (t: string) => {
            const [time, modifier] = t.split(' ');
            let [hours, minutes] = time.split(':').map(Number);
            if (modifier === 'PM' && hours < 12) hours += 12;
            if (modifier === 'AM' && hours === 12) hours = 0;
            return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
          };
          const recurringBody: Record<string, unknown> = {
            resourceId,
            userId: currentUser?.userId,
            startTime: to24hShort(startTime),
            endTime: to24hShort(endTime),
            subject: title.trim(),
            recurrencePattern: recurrence.toLowerCase(),
            interval: 1,
            daysOfWeek: recurrence === 'WEEKLY' ? selectedDays.join(',') : null,
            dayOfMonth: recurrence === 'MONTHLY' ? new Date(date).getDate() : null,
            startDate: date,
            endDate: recurrenceEndDate || null,
            occurrences: null,
          };
          const res = await doorSignFetch(`${getBaseUrl()}/api/recurringbookings`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(currentUser?.token ? { Authorization: `Bearer ${currentUser.token}` } : {}),
            },
            body: JSON.stringify(recurringBody),
          });
          if (!res.ok) {
            const raw = await res.text().catch(() => '');
            const msg = raw.replace(/[{}"\[\]]/g, '').trim();
            throw new Error(msg || 'Unable to save the recurring booking. Please try again.');
          }
          db.addMeeting({
            title: title.trim(), organizer: organizer.trim(), organizerPhoto, startTime, endTime, date,
            type, recurrence,
            recurrenceEndDate: recurrenceEndDate || undefined,
            attendees: [{ fullName: organizer.trim(), photo: organizerPhoto }],
          });
          onSuccess();
        } else {
          // One-time booking
          const body: Record<string, unknown> = {
            ResourceId: resourceId,
            OrganizerUserId: currentUser?.userId,
            BookingDate: date,
            StartTime: to24h(startTime),
            EndTime: to24h(endTime),
            Subject: title.trim(),
            attendee: attendees,
          };

        const res = await doorSignFetch(`${getBaseUrl()}/api/Bookings`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(currentUser?.token ? { Authorization: `Bearer ${currentUser.token}` } : {}),
          },
          body: JSON.stringify(body),
        });

        if (!res.ok) {
          const raw = await res.text().catch(() => '');
          const msg = raw.replace(/[{}"\[\]]/g, '').trim();
          throw new Error(msg || 'Unable to create the booking. Please try again.');
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
          type, recurrence: 'NONE',
          attendees: [{ fullName: organizer.trim(), photo: organizerPhoto }],
          apiId: newApiId,
        });

        // Seed the persistent photo cache so the sync can restore photos even
        // if SignalR fires before the cache is written by the sync itself.
        if (newApiId && organizerPhoto) {
          try {
            const PHOTO_CACHE_KEY = 'everest_photo_cache';
            const cache = JSON.parse(localStorage.getItem(PHOTO_CACHE_KEY) || '{}');
            cache[newApiId] = {
              organizerPhoto,
              attendees: [{ fullName: organizer.trim(), photo: organizerPhoto }],
            };
            localStorage.setItem(PHOTO_CACHE_KEY, JSON.stringify(cache));
          } catch { /* non-critical */ }
        }

        onSuccess();
        } // end else (one-time booking)
      }
    } catch (err: unknown) {
      const raw = err instanceof Error ? err.message : '';
      const clean = raw.replace(/[{}"\[\]]/g, '').trim();
      setError(clean || 'Something went wrong. Please try again.');
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
    }
  };

  const handleBackspace = () => {
    if (isPastMeeting) return;
    if (activeInput === 'title') { setTitle(prev => prev.slice(0, -1)); }
  };

  const handleSpace = () => {
    if (isPastMeeting) return;
    if (activeInput === 'title') { setTitle(prev => prev + ' '); }
  };

  const keyboardRows = [
    ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
    ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
    ['Z', 'X', 'C', 'V', 'B', 'N', 'M']
  ];

  const currentInputValue = title;

  const [isPortrait, setIsPortrait] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia('(orientation: portrait)').matches
  );
  useEffect(() => {
    const mq = window.matchMedia('(orientation: portrait)');
    const handler = (e: MediaQueryListEvent) => setIsPortrait(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const renderSchedulePanel = () => (
    <div className="bg-white/[0.02] border border-white/5 rounded-3xl p-4 lg:p-6 flex flex-col justify-between gap-3 lg:gap-4 h-full w-full overflow-hidden">
      <div className={`flex flex-col h-full ${isPortrait ? 'gap-3 lg:gap-6 justify-between' : 'gap-3 lg:gap-4 justify-start'}`}>
        <h2 className="text-primary text-xs font-black uppercase tracking-[0.45em] flex items-center gap-1.5 leading-none shrink-0">
          <span className="material-symbols-outlined text-xl">schedule</span> Schedule
        </h2>

        <div className="flex flex-col gap-1.5 mt-1 shrink-0">
          <label className="text-slate-400 text-xs font-black uppercase tracking-[0.25em] ml-1">Date</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            disabled={!!initialMeetingId}
            className="w-full bg-white/5 border-2 border-white/10 rounded-2xl px-6 py-5 text-xl lg:text-2xl font-black text-white outline-none focus:border-primary [color-scheme:dark] disabled:opacity-50 transition-all hover:bg-white/10 cursor-pointer"
          />
        </div>

        <div className="grid grid-cols-2 gap-3 lg:gap-4 shrink-0">
          <div className="flex flex-col gap-1.5">
            <label className="text-slate-400 text-xs font-black uppercase tracking-[0.25em] ml-1">Start Time</label>
            <div className="relative group">
              <select
                disabled={isPastMeeting}
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full bg-white/5 border-2 border-white/10 rounded-2xl px-6 py-5 pr-12 text-xl lg:text-2xl font-black text-white outline-none focus:border-primary appearance-none cursor-pointer transition-all hover:bg-white/10"
              >
                {startOptions.map((o) => <option key={o.time} value={o.time} disabled={o.disabled} className="bg-[#111]">{o.time}{o.reason === 'past' ? ' (past)' : o.reason === 'booked' ? ' (booked)' : ''}</option>)}
              </select>
              <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none group-hover:text-primary transition-colors text-2xl">expand_more</span>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-slate-400 text-xs font-black uppercase tracking-[0.25em] ml-1">End Time</label>
            <div className="relative group">
              <select
                disabled={availableEndOptions.length === 0 || isPastMeeting}
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full bg-white/5 border-2 border-white/10 rounded-2xl px-6 py-5 pr-12 text-xl lg:text-2xl font-black text-white outline-none focus:border-primary appearance-none cursor-pointer transition-all hover:bg-white/10"
              >
                {availableEndOptions.map((o: { time: string; disabled: boolean }) => <option key={o.time} value={o.time} disabled={o.disabled} className="bg-[#111]">{o.time}{o.disabled ? ' (booked)' : ''}</option>)}
              </select>
              <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none group-hover:text-primary transition-colors text-2xl">expand_more</span>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-1.5 mt-1 shrink-0">
          <label className="text-slate-400 text-xs font-black uppercase tracking-[0.25em] ml-1">Duration</label>
          <div className="grid grid-cols-4 gap-2 lg:gap-3">
            {QUICK_DURATIONS.map(dur => (
              <button
                key={dur}
                type="button"
                disabled={!availableDurations.includes(dur) || isPastMeeting}
                onClick={() => handleSetDuration(dur)}
                className={`py-5 rounded-2xl text-xs lg:text-sm font-black transition-all border-2 ${currentDuration === dur ? 'bg-primary border-primary text-white shadow-md scale-105 z-10' : 'bg-white/5 border-white/10 text-slate-400 disabled:opacity-20 hover:bg-white/10'}`}
              >
                {dur >= 60 ? `${dur / 60}h` : `${dur}m`}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const renderDetailsPanel = (showBookButton: boolean) => (
    <div className="bg-white/[0.02] border border-white/5 rounded-3xl p-4 lg:p-6 flex flex-col justify-between gap-3 lg:gap-4 h-full w-full overflow-hidden">
      <div className="flex flex-col gap-3 lg:gap-4 h-full justify-between">
        <div className="flex items-center justify-between shrink-0">
          <h2 className="text-primary text-xs font-black uppercase tracking-[0.45em] flex items-center gap-1.5 leading-none">
            Details
          </h2>
          <button
            type="button"
            disabled={isPastMeeting}
            onClick={() => setIsSuggestionsOpen(true)}
            className="px-4 py-2 bg-primary/10 border border-primary/20 hover:bg-primary/20 text-primary rounded-xl transition-all flex items-center gap-2 shadow-md active:scale-95 leading-none"
          >
            <span className="material-symbols-outlined text-sm">magic_button</span>
            <span className="text-[10px] font-black uppercase tracking-widest">Suggestions</span>
          </button>
        </div>

        <div className="flex flex-col gap-1.5 mt-1 flex-1 min-h-0 justify-center">
          <label className="text-slate-400 text-xs font-black uppercase tracking-[0.25em] ml-1 shrink-0">Event Title</label>
          <textarea
            required
            value={title}
            onFocus={() => { if (!isPastMeeting) { setIsKeyboardOpen(true); setActiveInput('title'); } }}
            readOnly
            placeholder="e.g., Weekly Project Sync & Stakeholder Review"
            rows={isPortrait ? 2 : 4}
            className={`w-full bg-white/5 border-2 rounded-2xl px-6 py-4 lg:py-6 text-2xl lg:text-3xl font-black text-white placeholder:text-slate-600 outline-none transition-all cursor-pointer resize-none flex-1 min-h-0 ${activeInput === 'title' ? 'border-primary ring-4 ring-primary/20 bg-white/10' : 'border-white/10 hover:border-white/20'}`}
          />
        </div>

      </div>

      {showBookButton && (
        <div className="flex flex-col gap-3 lg:gap-4 mt-auto">
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 flex items-center gap-3 text-red-500 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <span className="material-symbols-outlined text-2xl">error</span>
              <p className="text-sm font-black uppercase tracking-tight leading-none">{error}</p>
            </div>
          )}
          <button
            type="submit"
            disabled={isSubmitting || availableEndOptions.length === 0 || isPastMeeting}
            className="w-full py-8 bg-primary hover:bg-primary/95 text-white rounded-3xl text-2xl lg:text-3xl font-black shadow-lg hover:brightness-110 active:scale-95 transition-all flex flex-col items-center justify-center disabled:opacity-50 border border-white/10 uppercase tracking-[0.2em] min-h-[100px]"
          >
            {isSubmitting ? (
              <span className="size-8 border-4 border-white/30 border-t-white rounded-full animate-spin"></span>
            ) : (
              <>
                <span className="text-white tracking-widest leading-none">{initialMeetingId ? 'SAVE' : 'BOOK'}</span>
                <span className="text-[9px] font-black tracking-widest text-[#a8d3fc]/70 mt-2 normal-case leading-none">SECURE BOOKING</span>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );

  return (
    <div className="flex flex-col h-full bg-[#050505] overflow-hidden relative">
      <div className="absolute top-[-20%] right-[-10%] size-[80%] bg-primary/20 blur-[150px] rounded-full pointer-events-none" />

      <header className="flex items-center justify-between p-4 lg:p-6 border-b border-white/5 bg-black/20 backdrop-blur-xl relative z-10 shrink-0">
        <div className="flex items-center gap-6">
          <button type="button" onClick={onBack} className="size-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-200 hover:text-white transition-all">
            <span className="material-symbols-outlined text-2xl">arrow_back</span>
          </button>
          <div className="flex flex-col">
            <h1 className="text-xl lg:text-2xl font-black text-white tracking-tighter leading-none">
              {initialMeetingId ? (isPastMeeting ? 'Archived' : 'Edit Booking') : 'New Booking'}
            </h1>
            <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.4em] mt-1">{roomName}</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {initialMeetingId && !isPastMeeting && (
            <button
              type="button"
              onClick={() => setIsServiceModalOpen(true)}
              className="size-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500 hover:bg-amber-500 hover:text-white transition-all active:scale-95 group shadow-lg"
            >
              <span className="material-symbols-outlined text-2xl font-variation-fill group-hover:rotate-12 transition-transform">notifications_active</span>
            </button>
          )}
          {initialMeetingId && !isPastMeeting && (
            <button onClick={handleDelete} className="px-5 py-2.5 bg-red-500/10 text-red-500 border border-red-500/20 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all h-12 flex items-center justify-center">
              Cancel
            </button>
          )}
        </div>
      </header>

      <main className="flex-1 p-3 sm:p-4 lg:p-6 relative z-10 overflow-hidden">
        <form onSubmit={handleSubmit} className="w-full h-full flex flex-col justify-between gap-3 lg:gap-4">
          {isPortrait ? (
            <div className="flex flex-col gap-3 sm:gap-4 w-full h-full min-h-0 pb-1">
              <div className="flex-1 min-h-0 w-full">
                {renderDetailsPanel(false)}
              </div>
              <div className="flex-1 min-h-0 w-full">
                {renderSchedulePanel()}
              </div>
              <div className="flex flex-col gap-2 w-full shrink-0">
                {error && (
                  <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 flex items-center gap-3 text-red-500 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <span className="material-symbols-outlined text-2xl">error</span>
                    <p className="text-sm font-black uppercase tracking-tight leading-none">{error}</p>
                  </div>
                )}
                <button
                  type="submit"
                  disabled={isSubmitting || availableEndOptions.length === 0 || isPastMeeting}
                  className="mx-auto px-20 py-6 bg-primary hover:bg-primary/95 text-white rounded-full text-xl lg:text-2xl font-black shadow-lg hover:brightness-110 active:scale-95 transition-all flex flex-col items-center justify-center disabled:opacity-50 border border-white/10 uppercase tracking-[0.2em] min-h-[80px]"
                >
                  {isSubmitting ? (
                    <span className="size-6 border-4 border-white/30 border-t-white rounded-full animate-spin"></span>
                  ) : (
                    <>
                      <span className="text-white tracking-widest leading-none text-xl sm:text-2xl">{initialMeetingId ? 'SAVE' : 'BOOK'}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-3 flex-1 min-h-0">
              {/* Details card */}
              <div className="flex-1 min-h-0 bg-white/[0.02] border border-white/5 rounded-3xl p-5 flex flex-col gap-3 overflow-hidden">
                <div className="flex items-center justify-between shrink-0">
                  <h2 className="text-primary text-sm font-black uppercase tracking-[0.45em] flex items-center gap-2 leading-none">Details</h2>
                  <button type="button" disabled={isPastMeeting} onClick={() => setIsSuggestionsOpen(true)} className="px-5 py-2.5 bg-primary/10 border border-primary/20 hover:bg-primary/20 text-primary rounded-xl transition-all flex items-center gap-2 shadow-md active:scale-95 leading-none">
                    <span className="material-symbols-outlined text-base">magic_button</span>
                    <span className="text-xs font-black uppercase tracking-widest">Suggestions</span>
                  </button>
                </div>
                <div className="flex flex-col gap-2 flex-1 min-h-0">
                  <label className="text-slate-400 text-sm font-black uppercase tracking-[0.25em] ml-1 shrink-0">Event Title</label>
                  <textarea
                    required
                    value={title}
                    onFocus={() => { if (!isPastMeeting) { setIsKeyboardOpen(true); setActiveInput('title'); } }}
                    readOnly
                    placeholder="e.g., Weekly Project Sync & Stakeholder Review"
                    rows={1}
                    className={`w-full bg-white/5 border-2 rounded-2xl px-5 py-4 text-2xl font-black text-white placeholder:text-slate-600 outline-none transition-all cursor-pointer resize-none flex-1 min-h-0 ${activeInput === 'title' ? 'border-primary ring-4 ring-primary/20 bg-white/10' : 'border-white/10 hover:border-white/20'}`}
                  />
                </div>
              </div>

              {/* Schedule card */}
              <div className="flex-1 min-h-0 bg-white/[0.02] border border-white/5 rounded-3xl p-5 flex flex-col gap-3 overflow-hidden">
                <h2 className="text-primary text-sm font-black uppercase tracking-[0.45em] flex items-center gap-2 leading-none shrink-0">
                  <span className="material-symbols-outlined text-xl">schedule</span> Schedule
                </h2>
                <div className="grid grid-cols-3 gap-4 shrink-0">
                  <div className="flex flex-col gap-2">
                    <label className="text-slate-400 text-sm font-black uppercase tracking-[0.25em] ml-1">Date</label>
                    <input type="date" value={date} onChange={(e) => setDate(e.target.value)} disabled={!!initialMeetingId}
                      className="w-full bg-white/5 border-2 border-white/10 rounded-2xl px-5 py-4 text-xl font-black text-white outline-none focus:border-primary [color-scheme:dark] disabled:opacity-50 transition-all hover:bg-white/10 cursor-pointer" />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-slate-400 text-sm font-black uppercase tracking-[0.25em] ml-1">Start Time</label>
                    <div className="relative group">
                      <select disabled={isPastMeeting} value={startTime} onChange={(e) => setStartTime(e.target.value)}
                        className="w-full bg-white/5 border-2 border-white/10 rounded-2xl px-5 py-4 pr-12 text-xl font-black text-white outline-none focus:border-primary appearance-none cursor-pointer transition-all hover:bg-white/10">
                        {startOptions.map((o) => <option key={o.time} value={o.time} disabled={o.disabled} className="bg-[#111]">{o.time}{o.reason === 'past' ? ' (past)' : o.reason === 'booked' ? ' (booked)' : ''}</option>)}
                      </select>
                      <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none text-2xl">expand_more</span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-slate-400 text-sm font-black uppercase tracking-[0.25em] ml-1">End Time</label>
                    <div className="relative group">
                      <select disabled={availableEndOptions.length === 0 || isPastMeeting} value={endTime} onChange={(e) => setEndTime(e.target.value)}
                        className="w-full bg-white/5 border-2 border-white/10 rounded-2xl px-5 py-4 pr-12 text-xl font-black text-white outline-none focus:border-primary appearance-none cursor-pointer transition-all hover:bg-white/10">
                        {availableEndOptions.map((o) => <option key={o.time} value={o.time} disabled={o.disabled} className="bg-[#111]">{o.time}{o.disabled ? ' (booked)' : ''}</option>)}
                      </select>
                      <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none text-2xl">expand_more</span>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col gap-2 flex-1 min-h-0 justify-center">
                  <label className="text-slate-400 text-sm font-black uppercase tracking-[0.25em] ml-1 shrink-0">Duration</label>
                  <div className="grid grid-cols-4 gap-3">
                    {QUICK_DURATIONS.map(dur => (
                      <button key={dur} type="button" disabled={!availableDurations.includes(dur) || isPastMeeting} onClick={() => handleSetDuration(dur)}
                        className={`py-4 rounded-2xl text-lg font-black transition-all border-2 ${currentDuration === dur ? 'bg-primary border-primary text-white shadow-md scale-105 z-10' : 'bg-white/5 border-white/10 text-slate-400 disabled:opacity-20 hover:bg-white/10'}`}>
                        {dur >= 60 ? `${dur / 60}h` : `${dur}m`}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Book button at bottom */}
              <div className="flex flex-col gap-2 shrink-0">
                {error && (
                  <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-3 flex items-center gap-3 text-red-500">
                    <span className="material-symbols-outlined text-xl">error</span>
                    <p className="text-base font-black uppercase tracking-tight leading-none">{error}</p>
                  </div>
                )}
                <button type="submit" disabled={isSubmitting || availableEndOptions.length === 0 || isPastMeeting}
                  className="mx-auto px-20 py-5 bg-primary hover:bg-primary/95 text-white rounded-full text-xl font-black shadow-lg hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50 border border-white/10 uppercase tracking-[0.2em]">
                  {isSubmitting ? (
                    <span className="size-6 border-4 border-white/30 border-t-white rounded-full animate-spin"></span>
                  ) : (
                    <span className="tracking-widest leading-none">{initialMeetingId ? 'SAVE' : 'BOOK'}</span>
                  )}
                </button>
              </div>
            </div>
          )}
        </form>
      </main>

      {/* Virtual Keyboard */}
      <div className={`fixed bottom-0 left-0 right-0 z-[70] bg-[#0a1016]/98 backdrop-blur-[80px] border-t border-white/10 shadow-[0_-60px_150px_rgba(0,0,0,1)] transition-all duration-700 ease-out ${isKeyboardOpen ? 'translate-y-0' : 'translate-y-full'}`}>
        <div className="w-full max-w-6xl mx-auto p-10 flex flex-col gap-8">
          <div className="flex items-center justify-between">
            <span className="text-slate-200 font-black uppercase tracking-[0.5em] text-xs">Input Field: <span className="text-primary">{activeInput?.toUpperCase()}</span></span>
            <button onClick={() => { setIsKeyboardOpen(false); setActiveInput(null); }} className="px-6 py-2 bg-white/5 hover:bg-white/10 text-slate-200 rounded-2xl text-xs font-black uppercase tracking-widest transition-all">Dismiss Keyboard</button>
          </div>
          <div className="bg-white/5 border-2 border-primary/40 rounded-2xl p-6 min-h-[100px] flex items-center relative overflow-hidden">
            <p className={`text-4xl lg:text-5xl font-black tracking-tight leading-none break-all ${currentInputValue ? 'text-white' : 'text-slate-600'}`}>{currentInputValue || 'Start typing...'}</p>
            <span className="ml-2 w-1 h-12 bg-primary animate-pulse rounded-full"></span>
          </div>
          <div className="flex flex-col gap-3">
            {keyboardRows.map((row, rIdx) => (
              <div key={rIdx} className="flex justify-center gap-3">
                {rIdx === 2 && <button onClick={() => setIsShift(!isShift)} className={`flex-1 max-w-[120px] h-16 rounded-2xl flex items-center justify-center transition-all ${isShift ? 'bg-primary text-white shadow-[0_0_40px_rgba(19,127,236,0.3)]' : 'bg-white/5 text-slate-300'}`}><span className="material-symbols-outlined text-3xl">shift</span></button>}
                {row.map(key => <button key={key} onClick={() => handleKeyPress(key)} className="flex-1 min-w-[50px] max-w-[90px] h-16 bg-white/5 hover:bg-white/10 active:bg-primary active:text-white border-2 border-white/5 rounded-2xl text-white text-2xl font-black transition-all shadow-lg active:scale-95">{isShift ? key : key.toLowerCase()}</button>)}
                {rIdx === 2 && <button onClick={handleBackspace} className="flex-1 max-w-[120px] h-16 bg-white/5 hover:bg-white/10 rounded-2xl flex items-center justify-center text-slate-200 shadow-lg active:scale-95"><span className="material-symbols-outlined text-3xl">backspace</span></button>}
              </div>
            ))}
            <div className="flex justify-center gap-3 mt-4">
              <button onClick={handleSpace} className="flex-1 max-w-[500px] h-16 bg-white/5 border-2 border-white/5 rounded-2xl text-slate-300 text-sm font-black uppercase tracking-[0.5em] hover:bg-white/10 transition-all active:scale-95">Space</button>
              <button onClick={() => { setIsKeyboardOpen(false); setActiveInput(null); }} className="w-40 h-16 bg-emerald-500/10 border-2 border-emerald-500/30 rounded-2xl text-emerald-500 text-sm font-black uppercase tracking-widest hover:bg-emerald-500 hover:text-white transition-all shadow-xl active:scale-95">Confirm</button>
            </div>
          </div>
        </div>
      </div>

      {/* Service Modal Popup */}
      {isServiceModalOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-black/90 backdrop-blur-2xl" onClick={() => !requestStatus.includes('PENDING') && setIsServiceModalOpen(false)} />
          <div className="relative w-full max-w-2xl bg-[#1c2127] rounded-3xl border border-white/10 shadow-[0_0_100px_rgba(0,0,0,1)] p-10 lg:p-14 flex flex-col items-center gap-8 animate-in zoom-in-95 duration-300 overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-2 bg-amber-500/50" />
            <div className="flex flex-col items-center text-center gap-3">
              <div className="size-20 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 mb-2">
                <span className="material-symbols-outlined text-4xl font-variation-fill animate-bounce">notifications_active</span>
              </div>
              <h2 className="text-4xl font-black text-white tracking-tighter uppercase leading-none">Service Bell</h2>
              <p className="text-slate-300 font-bold uppercase tracking-widest text-xs">Request room assistance</p>
            </div>
            {requestStatus === 'SUCCESS' ? (
              <div className="flex flex-col items-center gap-6 py-10 animate-in fade-in zoom-in duration-500">
                <div className="size-32 rounded-3xl bg-emerald-500/10 border-4 border-emerald-500/30 flex items-center justify-center text-emerald-500 shadow-xl">
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
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-10 animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-black/95 backdrop-blur-[60px]" onClick={() => setIsSuggestionsOpen(false)} />
          <div className="relative w-full max-w-2xl bg-[#1c2127] rounded-3xl border-2 border-white/10 shadow-[0_0_120px_rgba(0,0,0,1)] p-8 lg:p-10 flex flex-col gap-6 animate-in zoom-in-95 duration-300 overflow-hidden max-h-[85vh]">
            <div className="absolute top-0 left-0 w-full h-2 bg-primary/50" />
            <div className="flex flex-col gap-2">
              <h2 className="text-3xl lg:text-4xl font-black text-white tracking-tighter uppercase leading-none">Suggested Titles</h2>
              <p className="text-slate-300 font-black uppercase tracking-[0.3em] text-[10px]">Quick select common meetings</p>
            </div>
            <div className="grid grid-cols-2 gap-3 overflow-y-auto pr-1 custom-scrollbar">
              {SUGGESTED_TITLES.map(t => (
                <button
                  key={t}
                  onClick={() => { setTitle(t); setIsSuggestionsOpen(false); }}
                  className="p-5 rounded-2xl bg-white/5 border border-white/10 text-left hover:bg-primary/10 hover:border-primary/40 transition-all active:scale-95 group shadow-lg"
                >
                  <p className="text-base font-black text-white group-hover:text-primary transition-colors tracking-tight leading-tight">{t}</p>
                </button>
              ))}
            </div>
            <button onClick={() => setIsSuggestionsOpen(false)} className="text-slate-400 font-black uppercase tracking-[0.4em] text-[10px] hover:text-white transition-colors text-center shrink-0">Dismiss Selection</button>
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
  <button onClick={onClick} disabled={isPending} className={`p-6 rounded-2xl border-2 transition-all flex flex-col items-center gap-4 group h-full relative ${isPending ? 'bg-amber-500/10 border-amber-500/40 shadow-xl' : 'bg-white/5 border-white/10 hover:border-amber-500/50 hover:bg-amber-500/5 active:scale-95'}`}>
    <div className={`size-16 rounded-2xl flex items-center justify-center transition-all ${isPending ? 'bg-amber-500 text-white' : 'bg-slate-800 text-slate-300 group-hover:text-amber-500'}`}>
      {isPending ? <span className="size-8 border-4 border-white/30 border-t-white rounded-full animate-spin"></span> : <span className="material-symbols-outlined text-3xl font-variation-fill">{icon}</span>}
    </div>
    <div className="text-center">
      <h4 className={`text-xl font-black uppercase tracking-tight leading-none mb-1 transition-colors ${isPending ? 'text-amber-500' : 'text-white group-hover:text-amber-500'}`}>{title}</h4>
      <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest">{isPending ? 'Working...' : 'Request now'}</p>
    </div>
  </button>
);

export default BookingView;