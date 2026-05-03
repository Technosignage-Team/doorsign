
import React, { useEffect, useState, useMemo } from 'react';
import { db } from '../lib/db';
import { Meeting } from '../types';
import { doorSignFetch } from '../lib/doorSignFetch';
import { getBaseUrl } from '../lib/hostUrl';

interface ScheduleViewProps {
  onUpdate?: () => void;
  onBack?: () => void;
  onBook: (startTime?: string, meetingId?: string) => void;
  onShowMeetingDetails: (meetingId: string) => void;
  slotPrecision?: 15 | 30;
  resourceId?: string;
  syncKey?: number;
}

interface AvailableWindow {
  start: Date;
  end: Date;
}

// Parse whatever time string the API returns into a Date on a given date
function parseApiTime(value: string, dateStr: string): Date {
  // Full ISO: "2024-01-01T09:00:00"
  if (value.includes('T')) return new Date(value);
  // Time only: "09:00:00" or "09:00"
  const [h, m] = value.split(':').map(Number);
  const d = new Date(dateStr + 'T00:00:00');
  d.setHours(h, m, 0, 0);
  return d;
}

const ScheduleView: React.FC<ScheduleViewProps> = ({ onUpdate, onBack, onBook, onShowMeetingDetails, slotPrecision = 30, resourceId, syncKey }) => {
  const [now, setNow] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [availableWindows, setAvailableWindows] = useState<AvailableWindow[] | null>(null);
  const [loadingAvailability, setLoadingAvailability] = useState(false);

  const today = new Date().toISOString().split('T')[0];
  const [meetings, setMeetings] = useState<Meeting[]>(() => db.getMeetings(selectedDate));

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 10000);
    return () => clearInterval(timer);
  }, []);

  // Sync bookings from API for the selected date (also re-runs when syncKey bumps)
  useEffect(() => {
    if (!resourceId) {
      setMeetings(db.getMeetings(selectedDate));
      return;
    }
    doorSignFetch(`${getBaseUrl()}/api/bookings/by-date?date=${selectedDate}&resourceId=${resourceId}`)
      .then(r => { if (!r.ok) throw new Error(`Bookings API ${r.status}`); return r.json(); })
      .then((data: unknown) => {
        const list: any[] = Array.isArray(data) ? data : (data as any)?.items ?? (data as any)?.data ?? (data as any)?.bookings ?? [];
        const existing = db.getMeetings();
        const apiMeetings: Meeting[] = list.map((b: any) => {
          const apiId = String(b.id ?? b.bookingId ?? b.BookingId ?? b.Id ?? '');
          const local = existing.find(m => m.apiId === apiId);
          return {
            id: apiId,
            apiId,
            title: b.title ?? b.subject ?? b.Subject ?? 'Meeting',
            organizer: b.organizer ?? b.organizerName ?? b.OrganizerName ?? '',
            organizerPhoto: b.organizerPhoto ?? b.OrganizerPhoto ?? local?.organizerPhoto,
            startTime: b.startTime,
            endTime: b.endTime,
            date: b.date ?? selectedDate,
            type: (b.type ?? local?.type ?? 'INTERNAL') as 'INTERNAL' | 'CLIENT',
            attendees: b.attendees ?? [],
            recurrence: 'NONE' as const,
          } as Meeting;
        });
        const otherDates = existing.filter(m => m.date !== selectedDate);
        const thisDateLocal = existing.filter(m => m.date === selectedDate && !m.apiId);
        localStorage.setItem('everest_meetings_db', JSON.stringify([...otherDates, ...thisDateLocal, ...apiMeetings]));
        setMeetings([...thisDateLocal, ...apiMeetings]);
      })
      .catch(err => {
        console.error('Bookings sync error (schedule):', err);
        setMeetings(db.getMeetings(selectedDate));
      });
  }, [resourceId, selectedDate, syncKey]);
  useEffect(() => {
    if (!resourceId) return;
    setLoadingAvailability(true);
    setAvailableWindows(null);
    doorSignFetch(`${getBaseUrl()}/api/resources/${resourceId}/availability?date=${selectedDate}`)
      .then(r => {
        if (!r.ok) throw new Error(`Availability API ${r.status}`);
        return r.json();
      })
      .then((data: unknown) => {
        const items: Array<Record<string, string>> = (data as any)?.freeSlots ?? [];

        setAvailableWindows(
          items.map(item => ({
            start: parseApiTime(item.start ?? item.startTime ?? item.from, selectedDate),
            end:   parseApiTime(item.end   ?? item.endTime   ?? item.to,   selectedDate),
          }))
        );
      })
      .catch(err => {
        console.error('Availability API error:', err);
        setAvailableWindows([]); // empty = fall back to local meetings only
      })
      .finally(() => setLoadingAvailability(false));
  }, [resourceId, selectedDate]);

  const isToday = selectedDate === today;

  const handlePrevDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() - 1);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  const handleNextDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + 1);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  const parseTimeString = (timeStr: string) => {
    const [time, modifier] = timeStr.split(' ');
    let [hours, minutes] = time.split(':').map(Number);
    if (modifier === 'PM' && hours < 12) hours += 12;
    if (modifier === 'AM' && hours === 12) hours = 0;
    const date = new Date(selectedDate + 'T00:00:00');
    date.setHours(hours, minutes, 0, 0);
    return date;
  };

  // freeSlots = available windows. Slot is available only if it falls within one.
  // Anything outside freeSlots = booked.
  const isSlotFree = (slotStart: Date, slotEnd: Date): boolean => {
    if (!availableWindows || availableWindows.length === 0) return false;
    return availableWindows.some(w => slotStart >= w.start && slotEnd <= w.end);
  };

  const currentMeetingNow = useMemo(() => {
    return meetings.find(m => {
      const mStart = parseTimeString(m.startTime);
      const mEnd = parseTimeString(m.endTime);
      return now >= mStart && now < mEnd;
    });
  }, [now, meetings]);

  const getRemainingTimeText = () => {
    if (!currentMeetingNow) return 'NOW';
    const mEnd = parseTimeString(currentMeetingNow.endTime);
    const diffMs = mEnd.getTime() - now.getTime();
    const diffMins = Math.max(0, Math.ceil(diffMs / 60000));
    return `NOW • ${diffMins}M LEFT`;
  };

  const generateTimeSlots = (precision: number) => {
    const slots: string[] = [];
    const intervals = precision === 15 ? ['00', '15', '30', '45'] : ['00', '30'];
    for (let h = 0; h < 24; h++) {
      const ampm = h >= 12 ? 'PM' : 'AM';
      let hour12 = h % 12;
      if (hour12 === 0) hour12 = 12;
      const hourStr = hour12.toString().padStart(2, '0');
      intervals.forEach(m => slots.push(`${hourStr}:${m} ${ampm}`));
    }
    return slots;
  };

  const timeSlots = useMemo(() => {
    const all = generateTimeSlots(slotPrecision);
    if (!isToday) return all;
    return all.filter(slot => {
      const slotStart = parseTimeString(slot);
      const slotEnd = new Date(slotStart.getTime() + slotPrecision * 60000);
      return slotEnd > now;
    });
  }, [slotPrecision, now, isToday]);

  return (
    <div className="flex flex-col h-full overflow-y-auto pb-24 custom-scrollbar bg-background-dark text-white">
      <header className="sticky top-0 z-50 bg-background-dark/95 backdrop-blur-xl border-b border-white/5">
        <div className="flex items-center p-8 justify-between w-full">
          <div className="flex items-center gap-4">
            {onBack && (
              <button onClick={onBack} className="flex size-12 items-center justify-center hover:bg-white/5 text-white rounded-xl transition-all">
                <span className="material-symbols-outlined text-3xl">arrow_back</span>
              </button>
            )}
            <div className="flex items-center gap-6">
            <div className="size-14 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-lg shadow-primary/5">
              <span className="material-symbols-outlined text-4xl font-variation-fill">calendar_view_day</span>
            </div>
            <div className="flex flex-col">
              <h1 className="text-3xl font-black leading-tight tracking-tight text-white">Timeline Schedule</h1>
              <div className="flex items-center gap-2 mt-1">
                <span className={`flex size-1.5 rounded-xl ${isToday ? 'bg-emerald-500 animate-pulse' : 'bg-slate-200'}`}></span>
                <p className="text-[10px] font-black text-slate-100 uppercase tracking-[0.4em]">
                  {isToday ? 'Live View' : 'Future View'} • {slotPrecision}m Grid • {selectedDate}
                </p>
                {loadingAvailability && (
                  <span className="material-symbols-outlined text-primary text-sm animate-spin ml-2">progress_activity</span>
                )}
              </div>
            </div>
            </div>
            <div className="flex items-center bg-white/5 border border-white/10 rounded-xl p-1">
              <button onClick={handlePrevDay} className="p-3 hover:bg-white/5 rounded-xl text-slate-100 hover:text-white transition-all">
                <span className="material-symbols-outlined">chevron_left</span>
              </button>
              <div className="px-2">
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => e.target.value && setSelectedDate(e.target.value)}
                  className="bg-transparent text-[10px] font-black uppercase tracking-widest text-slate-50 outline-none cursor-pointer color-scheme-dark"
                />
              </div>
              <button onClick={handleNextDay} className="p-3 hover:bg-white/5 rounded-xl text-slate-100 hover:text-white transition-all">
                <span className="material-symbols-outlined">chevron_right</span>
              </button>
            </div>

            {!isToday && (
              <button
                onClick={() => setSelectedDate(today)}
                className="px-4 py-3 bg-primary/10 border border-primary/20 rounded-xl text-[10px] font-black uppercase tracking-widest text-primary hover:bg-primary hover:text-white transition-all"
              >
                Today
              </button>
            )}

          </div>
        </div>

        {/* Availability legend — only shown when API data is loaded */}
        {availableWindows !== null && (
          <div className="flex items-center gap-6 px-8 pb-4 text-[9px] font-black uppercase tracking-widest">
            <div className="flex items-center gap-2">
              <span className="size-2.5 rounded-full bg-emerald-500"></span>
              <span className="text-emerald-400">Available</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="size-2.5 rounded-full bg-status-busy"></span>
              <span className="text-slate-400">Booked</span>
            </div>
          </div>
        )}
      </header>

      <main className="flex-1 p-8 lg:p-12">
        <div
          className="max-w-5xl mx-auto grid grid-cols-[140px_1fr] relative"
          style={{ gridAutoRows: 'minmax(110px, auto)' }}
        >
          {timeSlots.map((slot, idx) => {
            const slotStart = parseTimeString(slot);
            const slotEnd = new Date(slotStart.getTime() + slotPrecision * 60000);

            const meetingAtSlot = meetings.find(m => {
              const mStart = parseTimeString(m.startTime);
              const mEnd = parseTimeString(m.endTime);
              return mStart < slotEnd && mEnd > slotStart;
            });

            const isFirstSlotForMeeting = meetingAtSlot && (() => {
              const mStart = parseTimeString(meetingAtSlot.startTime);
              if (mStart >= slotStart && mStart < slotEnd) return true;
              if (idx === 0) return true;
              const prevSlotStart = parseTimeString(timeSlots[idx - 1]);
              const prevSlotEnd = new Date(prevSlotStart.getTime() + slotPrecision * 60000);
              return !(mStart < prevSlotEnd && parseTimeString(meetingAtSlot.endTime) > prevSlotStart);
            })();

            const isCurrent = isToday && now >= slotStart && now < slotEnd;
            const isPast = isToday ? slotEnd <= now : selectedDate < today;

            // true = slot is inside a freeSlot window (available), false = booked
            const slotIsFree = isSlotFree(slotStart, slotEnd);
            // when API has loaded, anything not free is booked
            const apiSaysBooked = availableWindows !== null && !slotIsFree;

            const minutesPassed = (now.getTime() - slotStart.getTime()) / 60000;
            const topOffsetPercent = isCurrent ? Math.min(Math.max((minutesPassed / slotPrecision) * 100, 0), 100) : 0;

            let rowSpan = 1;
            if (isFirstSlotForMeeting && meetingAtSlot) {
              const mEnd = parseTimeString(meetingAtSlot.endTime);
              const durationMs = mEnd.getTime() - slotStart.getTime();
              rowSpan = Math.ceil(durationMs / (slotPrecision * 60000));
              const remainingSlots = timeSlots.length - idx;
              if (rowSpan > remainingSlots) rowSpan = remainingSlots;
            }

            return (
              <React.Fragment key={slot}>
                {/* Time label */}
                <div
                  className="flex flex-col items-end justify-start pt-6 border-r border-white/5 pr-8 relative"
                  style={{ gridRow: `${idx + 1} / span 1`, gridColumn: '1 / span 1' }}
                >
                  <span className={`text-xs font-black uppercase tracking-[0.1em] transition-colors duration-300 ${
                    isCurrent ? 'text-status-busy' : meetingAtSlot ? 'text-slate-100' : isPast ? 'text-slate-300' : 'text-slate-200'
                  }`}>
                    {slot}
                  </span>

                  {isCurrent && (
                    <div className="absolute right-[-6px] z-[60] flex items-center" style={{ top: `${topOffsetPercent}%` }}>
                      <div className="relative">
                        <div className="absolute inset-0 size-3 rounded-xl bg-status-busy animate-ping opacity-75" />
                        <div className="relative size-3 rounded-xl bg-status-busy shadow-[0_0_15px_rgba(239,68,68,1)] border-2 border-background-dark" />
                      </div>
                      <div className="bg-status-busy text-white text-[9px] font-black px-3 py-1 rounded-xl ml-3 tracking-[0.1em] uppercase transform -translate-y-1/2 whitespace-nowrap flex items-center gap-2 border border-white/20 backdrop-blur-md">
                        <span className="material-symbols-outlined text-sm font-black">timer</span>
                        {getRemainingTimeText()}
                      </div>
                    </div>
                  )}
                </div>

                {/* Slot content */}
                {isFirstSlotForMeeting && meetingAtSlot ? (
                  <div
                    className="relative p-1.5 group z-10"
                    style={{ gridRow: `${idx + 1} / span ${rowSpan}`, gridColumn: '2 / span 1' }}
                  >
                    <button
                      onClick={() => onShowMeetingDetails(meetingAtSlot.id)}
                      className={`h-full w-full p-8 rounded-xl border transition-all duration-500 relative overflow-hidden flex flex-col justify-center text-left ${
                        isCurrent
                          ? 'bg-status-busy/15 border-status-busy/50 shadow-2xl ring-1 ring-status-busy/25'
                          : 'bg-white/[0.03] border-white/5'
                      } hover:bg-white/[0.07] hover:border-white/10`}
                    >
                      <div className={`absolute top-0 bottom-0 left-0 w-2 transition-all duration-500 ${
                        isCurrent ? 'bg-status-busy shadow-[0_0_20px_rgba(239,68,68,0.6)]' : meetingAtSlot.type === 'CLIENT' ? 'bg-purple-500' : 'bg-primary'
                      }`} />

                      <div className="flex flex-col gap-2 pl-4">
                        <div className="flex items-center justify-between mb-1">
                          <span className={`text-[10px] px-4 py-1.5 rounded-xl font-black tracking-widest uppercase transition-all duration-500 ${
                            isCurrent ? 'bg-status-busy text-white shadow-lg' : meetingAtSlot.type === 'CLIENT' ? 'bg-purple-500/40 text-purple-400 border border-purple-500/40' : 'bg-primary/40 text-primary border border-primary/40'
                          }`}>
                            {meetingAtSlot.type} {isCurrent && '(NOW)'}
                          </span>
                        </div>
                        <h3 className="text-3xl lg:text-4xl font-black text-white tracking-tight leading-tight group-hover:text-primary transition-colors truncate">
                          {meetingAtSlot.title}
                        </h3>
                        <div className="flex flex-wrap items-center gap-x-8 gap-y-2 mt-5 text-slate-100 font-bold">
                          <div className="flex items-center gap-3">
                            {meetingAtSlot.organizerPhoto && (
                              <img
                                src={meetingAtSlot.organizerPhoto}
                                alt={meetingAtSlot.organizer}
                                className="size-8 rounded-xl border border-white/20 shadow-md"
                                referrerPolicy="no-referrer"
                              />
                            )}
                            <span className="text-[12px] uppercase tracking-widest truncate max-w-[180px]">{meetingAtSlot.organizer}</span>
                          </div>
                          <div className="flex items-center gap-2 px-3 py-1 bg-white/5 rounded-xl border border-white/5">
                            <span className="material-symbols-outlined text-xl text-primary">schedule</span>
                            <span className="text-[12px] uppercase tracking-widest">{meetingAtSlot.startTime} - {meetingAtSlot.endTime}</span>
                          </div>
                        </div>
                      </div>
                    </button>
                  </div>
                ) : meetingAtSlot ? null : (
                  <div
                    className="relative p-1.5 group"
                    style={{ gridRow: `${idx + 1} / span 1`, gridColumn: '2 / span 1' }}
                  >
                    {/* Not in any freeSlot window → booked externally */}
                    {apiSaysBooked && !isPast ? (
                      <div className="w-full h-full min-h-[110px] bg-status-busy/5 border border-status-busy/20 rounded-xl flex items-center gap-6 px-8 opacity-70">
                        <div className="size-10 rounded-xl bg-status-busy/15 flex items-center justify-center text-status-busy shrink-0">
                          <span className="material-symbols-outlined text-xl">event_busy</span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-status-busy font-black uppercase tracking-widest text-[11px]">Booked</span>
                          <span className="text-slate-500 text-[9px] font-black uppercase tracking-widest mt-0.5">{slot}</span>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => !isPast && onBook(slot)}
                        disabled={isPast}
                        className={`w-full h-full min-h-[110px] border-2 border-dashed rounded-xl flex flex-col items-center justify-center gap-3 px-10 transition-all group/btn ${
                          isPast
                            ? 'border-white/5 opacity-40 cursor-not-allowed'
                            : 'border-emerald-500/50 hover:border-emerald-500 hover:bg-emerald-500/10'
                        }`}
                      >
                        {isPast ? (
                          <div className="flex items-center gap-3 text-slate-600">
                            <span className="material-symbols-outlined text-xl">lock</span>
                            <span className="font-black uppercase tracking-[0.3em] text-[11px]">Slot Past</span>
                          </div>
                        ) : (
                          <>
                            <div className="flex items-center gap-3">
                              <span className="material-symbols-outlined text-2xl text-emerald-400">event_available</span>
                              <span className="font-black uppercase tracking-[0.3em] text-[11px] text-emerald-400">Available</span>
                            </div>
                            <div className="px-8 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest shadow-lg transition-all group-hover/btn:scale-105 group-active/btn:scale-95 border bg-emerald-500 text-white border-emerald-400/30 group-hover/btn:bg-emerald-400">
                              Quick Reserve
                            </div>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </main>
    </div>
  );
};

export default ScheduleView;
