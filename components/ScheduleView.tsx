
import React, { useEffect, useState, useMemo } from 'react';
import { db } from '../lib/db';
import { AMENITIES_DATA } from '../constants';

interface ScheduleViewProps {
  onUpdate?: () => void;
  onBook: (startTime?: string, meetingId?: string) => void;
  onShowMeetingDetails: (meetingId: string) => void;
  slotPrecision?: 15 | 30;
}

const ScheduleView: React.FC<ScheduleViewProps> = ({ onUpdate, onBook, onShowMeetingDetails, slotPrecision = 30 }) => {
  const [now, setNow] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const today = new Date().toISOString().split('T')[0];
  const meetings = db.getMeetings(selectedDate);

  useEffect(() => {
    // Refresh every 10 seconds for precise countdown and timeline shifting
    const timer = setInterval(() => setNow(new Date()), 10000);
    return () => clearInterval(timer);
  }, []);

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
    const date = new Date();
    date.setHours(hours, minutes, 0, 0);
    return date;
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
      
      intervals.forEach(m => {
        slots.push(`${hourStr}:${m} ${ampm}`);
      });
    }
    return slots;
  };

  // Filter time slots to start from current time onward only if it's today
  const timeSlots = useMemo(() => {
    const all = generateTimeSlots(slotPrecision);
    if (!isToday) return all;
    
    return all.filter(slot => {
      const slotStart = parseTimeString(slot);
      const slotEnd = new Date(slotStart.getTime() + slotPrecision * 60000);
      // Keep slot if it ends in the future (includes the current ongoing slot)
      return slotEnd > now;
    });
  }, [slotPrecision, now, isToday]);

  return (
    <div className="flex flex-col h-full overflow-y-auto pb-24 custom-scrollbar bg-background-dark text-white">
      <header className="sticky top-0 z-50 bg-background-dark/95 backdrop-blur-xl border-b border-white/5">
        <div className="flex items-center p-8 justify-between w-full">
          <div className="flex items-center gap-6">
            <div className="size-14 rounded-none bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-lg shadow-primary/5">
              <span className="material-symbols-outlined text-4xl font-variation-fill">calendar_view_day</span>
            </div>
            <div className="flex flex-col">
              <h1 className="text-3xl font-black leading-tight tracking-tight text-white">Timeline Schedule</h1>
              <div className="flex items-center gap-2 mt-1">
                <span className={`flex size-1.5 rounded-none ${isToday ? 'bg-emerald-500 animate-pulse' : 'bg-slate-200'}`}></span>
                <p className="text-[10px] font-black text-slate-100 uppercase tracking-[0.4em]">{isToday ? 'Live View' : 'Historical/Future View'} • {slotPrecision}m Grid • {selectedDate}</p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <button 
              onClick={() => {}} // This view is already the schedule, but we can add an info trigger if needed
              className="size-14 shrink-0 rounded-none bg-[#0a192f] text-primary shadow-[0_10px_30px_rgba(10,25,47,0.4)] flex items-center justify-center border border-white/5 hover:scale-105 active:scale-95 transition-all group"
            >
              <span className="material-symbols-outlined text-3xl font-variation-fill group-hover:scale-110 transition-transform">info</span>
            </button>
            
            <div className="flex items-center bg-white/5 border border-white/10 rounded-none p-1">
              <button onClick={handlePrevDay} className="p-3 hover:bg-white/5 rounded-none text-slate-100 hover:text-white transition-all">
                <span className="material-symbols-outlined">chevron_left</span>
              </button>
              <div className="px-4 text-[10px] font-black uppercase tracking-widest text-slate-50">
                {isToday ? 'Today' : selectedDate}
              </div>
              <button onClick={handleNextDay} className="p-3 hover:bg-white/5 rounded-none text-slate-100 hover:text-white transition-all">
                <span className="material-symbols-outlined">chevron_right</span>
              </button>
            </div>
            
            <button 
              onClick={() => { db.clear(); if(onUpdate) onUpdate(); }} 
              className="px-6 py-3 bg-white/5 border border-white/10 rounded-none text-[10px] font-black uppercase tracking-[0.2em] hover:bg-white/10 transition-all text-slate-100 hover:text-white"
            >
              Reset Room Data
            </button>
          </div>
        </div>
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
               // If the actual start is in this slot, it's the first
               if (mStart >= slotStart && mStart < slotEnd) return true;
               // If this is the FIRST VISIBLE slot and the meeting is ongoing, treat it as the first visible slot
               if (idx === 0) return true;
               // Otherwise check if the previous VISIBLE slot also belonged to this meeting
               const prevSlotStart = parseTimeString(timeSlots[idx-1]);
               const prevSlotEnd = new Date(prevSlotStart.getTime() + slotPrecision * 60000);
               return !(mStart < prevSlotEnd && parseTimeString(meetingAtSlot.endTime) > prevSlotStart);
            })();

            const isCurrent = isToday && now >= slotStart && now < slotEnd;
            const isPast = isToday ? slotEnd <= now : selectedDate < today;
            
            const minutesPassed = (now.getTime() - slotStart.getTime()) / 60000;
            const topOffsetPercent = isCurrent ? Math.min(Math.max((minutesPassed / slotPrecision) * 100, 0), 100) : 0;

            let rowSpan = 1;
            if (isFirstSlotForMeeting && meetingAtSlot) {
              const mEnd = parseTimeString(meetingAtSlot.endTime);
              // Calculate span based on remaining visible slots
              const durationMs = mEnd.getTime() - slotStart.getTime();
              rowSpan = Math.ceil(durationMs / (slotPrecision * 60000));
              
              // Cap rowSpan to remaining slots in the visible list
              const remainingSlots = timeSlots.length - idx;
              if (rowSpan > remainingSlots) rowSpan = remainingSlots;
            }

            return (
              <React.Fragment key={slot}>
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
                        <div className="absolute inset-0 size-3 rounded-none bg-status-busy animate-ping opacity-75" />
                        <div className="relative size-3 rounded-none bg-status-busy shadow-[0_0_15px_rgba(239,68,68,1)] border-2 border-background-dark" />
                      </div>
                      <div className="bg-status-busy text-white text-[9px] font-black px-3 py-1 rounded-none ml-3 shadow-[0_10px_25_rgba(239,68,68,0.4)] tracking-[0.1em] uppercase transform -translate-y-1/2 whitespace-nowrap flex items-center gap-2 border border-white/20 backdrop-blur-md">
                        <span className="material-symbols-outlined text-sm font-black">timer</span>
                        {getRemainingTimeText()}
                      </div>
                    </div>
                  )}
                </div>

                {isFirstSlotForMeeting && meetingAtSlot ? (
                  <div 
                    className="relative p-1.5 group z-10"
                    style={{ gridRow: `${idx + 1} / span ${rowSpan}`, gridColumn: '2 / span 1' }}
                  >
                    <button 
                      onClick={() => onShowMeetingDetails(meetingAtSlot.id)}
                      className={`h-full w-full p-8 rounded-none border transition-all duration-500 relative overflow-hidden flex flex-col justify-center text-left ${
                        isCurrent ? 'bg-status-busy/15 border-status-busy/50 shadow-2xl ring-1 ring-status-busy/25' : 'bg-white/[0.03] border-white/5'
                      } hover:bg-white/[0.07] hover:border-white/10`}
                    >
                      <div className={`absolute top-0 bottom-0 left-0 w-2 transition-all duration-500 ${
                        isCurrent ? 'bg-status-busy shadow-[0_0_20px_rgba(239,68,68,0.6)]' : (meetingAtSlot.type === 'CLIENT' ? 'bg-purple-500' : 'bg-primary')
                      }`} />
                      
                      <div className="flex flex-col gap-2 pl-4">
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-3">
                             <span className={`text-[10px] px-4 py-1.5 rounded-none font-black tracking-widest uppercase transition-all duration-500 ${
                              isCurrent ? 'bg-status-busy text-white shadow-lg' : meetingAtSlot.type === 'CLIENT' ? 'bg-purple-500/40 text-purple-400 border border-purple-500/40' : 'bg-primary/40 text-primary border border-primary/40'
                            }`}>
                              {meetingAtSlot.type} {isCurrent && '(NOW)'}
                            </span>
                            {meetingAtSlot.recurrence && meetingAtSlot.recurrence !== 'NONE' && (
                               <span className="material-symbols-outlined text-slate-100 text-base" title="Recurring Meeting">repeat</span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 opacity-30 group-hover:opacity-100 transition-opacity">
                             {AMENITIES_DATA.map(a => (
                               <span key={a.id} className="material-symbols-outlined text-base font-variation-fill text-slate-100" title={a.title}>{a.icon}</span>
                             ))}
                          </div>
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
                                 className="size-8 rounded-none border border-white/20 shadow-md"
                                 referrerPolicy="no-referrer"
                               />
                             )}
                             <span className="text-[12px] uppercase tracking-widest truncate max-w-[180px]">{meetingAtSlot.organizer}</span>
                           </div>
                           <div className="flex items-center gap-2 px-3 py-1 bg-white/5 rounded-none border border-white/5">
                             <span className="material-symbols-outlined text-xl text-primary">schedule</span>
                             <span className="text-[12px] uppercase tracking-widest">{meetingAtSlot.startTime} - {meetingAtSlot.endTime}</span>
                           </div>
                        </div>
                      </div>
                    </button>
                  </div>
                ) : meetingAtSlot ? (
                  null
                ) : (
                  <div 
                    className="relative p-1.5 group" 
                    style={{ gridRow: `${idx + 1} / span 1`, gridColumn: '2 / span 1' }}
                  >
                    <button 
                      onClick={() => !isPast && onBook(slot)}
                      disabled={isPast}
                      className={`w-full h-full min-h-[110px] border-2 border-dashed rounded-none flex flex-col items-center justify-center gap-4 px-10 transition-all group/btn ${
                        isPast ? 'border-white/5 opacity-40 cursor-not-allowed' : 'border-primary/40 text-primary hover:border-primary/70 hover:bg-primary/15'
                      }`}
                    >
                      <div className="flex flex-col items-center gap-2">
                        <div className="flex items-center gap-5">
                          <div className={`size-10 rounded-none border-2 flex items-center justify-center transition-transform ${
                            isPast ? 'border-slate-400 text-slate-400' : 'border-primary group-hover/btn:rotate-90'
                          }`}>
                            <span className="material-symbols-outlined text-2xl font-bold">{isPast ? 'lock' : 'add'}</span>
                          </div>
                          <span className={`font-black uppercase tracking-[0.4em] text-[12px] ${isPast ? 'text-slate-300' : 'text-primary'}`}>
                            {isPast ? 'Slot Past' : 'Slot Available'}
                          </span>
                        </div>
                        {!isPast && (
                          <div className="flex items-center gap-3 opacity-30 group-hover/btn:opacity-60 transition-opacity">
                             <span className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-100">Suite Ready</span>
                             <div className="flex gap-2">
                               {AMENITIES_DATA.slice(0, 3).map(a => (
                                 <span key={a.id} className="material-symbols-outlined text-base text-slate-100">{a.icon}</span>
                               ))}
                             </div>
                          </div>
                        )}
                      </div>
                      {!isPast && (
                        <div className="bg-white text-black px-8 py-3 rounded-none text-[11px] font-black uppercase tracking-widest shadow-lg transition-all group-hover/btn:scale-105 group-active/btn:scale-95 group-hover/btn:bg-slate-100 border border-white/20">
                          Quick Reserve
                        </div>
                      )}
                    </button>
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
