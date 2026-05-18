import React from 'react';
import { RoomStatus } from '../../types';

interface LayoutProps {
  currentTime: Date;
  roomStatus: RoomStatus;
  onBook: (startTime?: string, meetingId?: string) => void;
  onShowMeetingDetails: (meetingId: string) => void;
  onCheckIn: () => void;
  onExtend: (id: string) => void;
  onEndNow: (id: string) => void;
  onShowDetails: () => void;
  slotPrecision: 15 | 30;
}

const SplitScreenLayout: React.FC<LayoutProps> = ({ currentTime, roomStatus, onBook, onShowMeetingDetails, onCheckIn, onExtend, onEndNow, onShowDetails, slotPrecision }) => {
  const formattedTime = currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  const formattedDate = currentTime.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' });

  const minsUntilNext = (() => {
    if (!roomStatus.nextMeeting) return null;
    const [time, mod] = roomStatus.nextMeeting.startTime.split(' ');
    let [h, m] = time.split(':').map(Number);
    if (mod === 'PM' && h < 12) h += 12;
    if (mod === 'AM' && h === 12) h = 0;
    const start = new Date(currentTime);
    start.setHours(h, m, 0, 0);
    return Math.max(0, Math.ceil((start.getTime() - currentTime.getTime()) / 60000));
  })();

  const handleBookNow = () => {
    const now = new Date();
    const minutes = now.getMinutes();
    const roundedMinutes = Math.floor(minutes / slotPrecision) * slotPrecision;
    now.setMinutes(roundedMinutes);

    let hours = now.getHours();
    const mins = now.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    const timeToSuggest = `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')} ${ampm}`;

    onBook(timeToSuggest);
  };

  return (
    <div className="flex h-full w-full bg-[#050505] overflow-hidden text-white font-display relative">

      {/* Left: Room Branding & Status — 42% */}
      <div className="relative w-[42%] h-full shrink-0 overflow-hidden border-r border-white/5">
        <div
          className="absolute inset-0 bg-cover bg-center transition-transform duration-[20s] hover:scale-105 bg-white/5"
          style={roomStatus.imageUrl ? { backgroundImage: `url("${roomStatus.imageUrl}")` } : undefined}
        />
        <div className={`absolute inset-0 transition-colors duration-1000 ${
          roomStatus.isAvailable ? 'bg-emerald-500/60' : 'bg-rose-500/60'
        }`} />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />

        <div className="absolute bottom-[8%] left-[8%] right-[8%] text-left">
          <div className="flex items-center gap-4 mb-4">
            <h1
              className="text-white font-black tracking-tighter leading-[0.85] drop-shadow-2xl uppercase"
              style={{ fontSize: 'clamp(2rem, 4vw, 5rem)' }}
            >
              {roomStatus.name || 'EXECUTIVE BOARDROOM'}
            </h1>
            <button
              onClick={onShowDetails}
              className="size-12 shrink-0 rounded-xl bg-[#0a192f] text-primary/70 shadow-[0_10px_30px_rgba(10,25,47,0.4)] flex items-center justify-center border border-white/5 hover:scale-105 active:scale-95 transition-all group"
            >
              <span className="material-symbols-outlined text-2xl font-variation-fill group-hover:scale-110 transition-transform">info</span>
            </button>
          </div>
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-slate-400" style={{ fontSize: 'clamp(0.875rem, 1.2vw, 1.25rem)' }}>location_on</span>
              <p className="font-black uppercase tracking-[0.2em] text-slate-200" style={{ fontSize: 'clamp(0.7rem, 1vw, 1rem)' }}>
                {roomStatus.location.toUpperCase()}
              </p>
            </div>
            <p className="font-black uppercase tracking-[0.3em] text-slate-200/80 pl-6" style={{ fontSize: 'clamp(0.625rem, 0.9vw, 0.875rem)' }}>
              {roomStatus.name.toUpperCase()} • {roomStatus.capacity} PERSONS
            </p>
          </div>
        </div>
      </div>

      {/* Right: Dashboard View — 58%, no overflow scroll */}
      <div className="relative flex-1 h-full flex flex-col bg-[#080808] overflow-hidden">
        {/* Scrollable inner area — internal scroll only */}
        <div className="flex flex-col flex-1 overflow-y-auto custom-scrollbar px-[5%] pt-[5%] pb-[3%] gap-[3vh]">

          {/* Time & Date */}
          <div className="flex flex-col shrink-0">
            <h2
              className="font-black leading-none tracking-tighter text-slate-600"
              style={{ fontSize: 'clamp(3.5rem, 7vw, 8rem)' }}
            >
              {formattedTime}
            </h2>
            <p className="text-slate-600 font-black uppercase tracking-[0.4em] mt-1" style={{ fontSize: 'clamp(0.8rem, 1.4vw, 1.25rem)' }}>
              {formattedDate}
            </p>
          </div>

          {/* Main status content */}
          <div className="flex flex-col gap-[2vh] flex-1">
            {roomStatus.isAvailable ? (
              <div className="flex flex-col gap-[2vh] items-center text-center mx-auto w-full">
                <h3
                  className="text-white font-black leading-[1.05] tracking-tight"
                  style={{ fontSize: 'clamp(2.5rem, 5.5vw, 6.5rem)' }}
                >
                  Room Ready
                </h3>
                <p
                  className="text-slate-100 font-medium max-w-lg leading-relaxed"
                  style={{ fontSize: 'clamp(0.875rem, 1.5vw, 1.25rem)' }}
                >
                  The boardroom is currently unoccupied. Create a booking to start your session.
                </p>
                <button
                  onClick={handleBookNow}
                  className="bg-white/95 backdrop-blur-xl text-black rounded-xl font-black shadow-[0_25px_50px_rgba(255,255,255,0.1)] hover:bg-white active:scale-95 transition-all flex items-center gap-3 border border-white/40"
                  style={{ fontSize: 'clamp(1rem, 1.6vw, 1.5rem)', padding: 'clamp(0.75rem, 1.5vh, 1.25rem) clamp(1.5rem, 3vw, 2.5rem)' }}
                >
                  <span className="material-symbols-outlined font-bold" style={{ fontSize: 'clamp(1.25rem, 2vw, 2rem)' }}>add_circle</span>
                  Book
                </button>
              </div>
            ) : (
              <>
                <h3
                  className="text-white font-black leading-[1.1] tracking-tight w-full cursor-pointer hover:text-primary transition-colors"
                  style={{ fontSize: 'clamp(1.75rem, 3.5vw, 4rem)' }}
                  onClick={() => onShowMeetingDetails(roomStatus.currentMeeting?.id || '')}
                >
                  {roomStatus.currentMeeting?.title}
                </h3>

                <div
                  onClick={() => onShowMeetingDetails(roomStatus.currentMeeting?.id || '')}
                  className="w-full max-w-lg bg-white/[0.03] border border-white/10 rounded-xl flex flex-col gap-[1.5vh] relative overflow-hidden group cursor-pointer hover:bg-white/[0.06] hover:border-white/20 transition-all shadow-2xl"
                  style={{ padding: 'clamp(1rem, 2.5vh, 2rem) clamp(1rem, 2vw, 1.75rem)' }}
                >
                  <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${roomStatus.isAvailable ? 'bg-status-available' : 'bg-status-busy'} shadow-[0_0_20px_rgba(239,68,68,0.4)]`}></div>
                  <p
                    className="text-white font-black tracking-tight leading-none group-hover:text-primary transition-colors"
                    style={{ fontSize: 'clamp(1.5rem, 2.8vw, 3rem)' }}
                  >
                    {roomStatus.currentMeeting?.startTime} - {roomStatus.currentMeeting?.endTime}
                  </p>
                  <p
                    className="text-white font-black tracking-tight leading-none group-hover:text-primary transition-colors"
                    style={{ fontSize: 'clamp(1.5rem, 2.8vw, 3rem)' }}
                  >
                    {roomStatus.currentMeeting?.organizer || 'System'}
                  </p>
                </div>

                <div className="flex items-center gap-3 w-full max-w-lg">
                  <button
                    onClick={() => roomStatus.currentMeeting && onExtend(roomStatus.currentMeeting.id)}
                    className="flex-1 bg-white/5 text-slate-400 rounded-xl font-black border border-white/10 hover:bg-white/10 transition-all flex items-center justify-center gap-2 active:scale-95"
                    style={{ fontSize: 'clamp(0.8rem, 1.2vw, 1.1rem)', padding: 'clamp(0.6rem, 1.5vh, 1.25rem) 0.5rem' }}
                  >
                    <span className="material-symbols-outlined text-slate-400" style={{ fontSize: 'clamp(1rem, 1.5vw, 1.5rem)' }}>more_time</span>
                    Extend
                  </button>
                  <button
                    onClick={() => roomStatus.currentMeeting && onEndNow(roomStatus.currentMeeting.id)}
                    className="flex-1 bg-white/5 text-slate-400 rounded-xl font-black border border-white/10 hover:bg-white/10 transition-all flex items-center justify-center gap-2 active:scale-95"
                    style={{ fontSize: 'clamp(0.8rem, 1.2vw, 1.1rem)', padding: 'clamp(0.6rem, 1.5vh, 1.25rem) 0.5rem' }}
                  >
                    <span className="material-symbols-outlined text-slate-400" style={{ fontSize: 'clamp(1rem, 1.5vw, 1.5rem)' }}>logout</span>
                    End Now
                  </button>
                  <button
                    onClick={onCheckIn}
                    className="flex-1 bg-white/5 text-slate-400 rounded-xl font-black border border-white/10 hover:bg-white/10 transition-all flex items-center justify-center gap-2 active:scale-95"
                    style={{ fontSize: 'clamp(0.8rem, 1.2vw, 1.1rem)', padding: 'clamp(0.6rem, 1.5vh, 1.25rem) 0.5rem' }}
                  >
                    <span className="material-symbols-outlined text-slate-400" style={{ fontSize: 'clamp(1rem, 1.5vw, 1.5rem)' }}>verified_user</span>
                    Check In/Out
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Up Next — pinned at the bottom of the scroll area */}
          <div className="mt-auto shrink-0">
            <div className="bg-[#0c0c0c] border border-white/10 rounded-xl shadow-2xl hover:border-white/20 transition-all group overflow-hidden relative max-w-md"
              style={{ padding: 'clamp(1rem, 2vh, 1.75rem) clamp(1rem, 2vw, 1.75rem)' }}
            >
              <div className="absolute top-0 right-0 size-48 bg-primary/5 blur-[50px] rounded-xl pointer-events-none translate-x-12 -translate-y-12" />

              {roomStatus.nextMeeting ? (
                <button
                  onClick={() => onShowMeetingDetails(roomStatus.nextMeeting!.id)}
                  className="w-full flex flex-col text-left"
                >
                  <span className="text-slate-600 font-black uppercase tracking-[0.6em] mb-3" style={{ fontSize: 'clamp(0.6rem, 0.9vw, 0.8rem)' }}>UP NEXT</span>
                  <h4
                    className="font-black tracking-tight leading-tight truncate text-white group-hover:text-primary transition-colors"
                    style={{ fontSize: 'clamp(1.1rem, 2vw, 2rem)' }}
                  >
                    {roomStatus.nextMeeting.title}
                  </h4>

                  <div className="flex flex-wrap items-center justify-between w-full border-t border-white/5 mt-4 pt-4 gap-4">
                    <div className="flex flex-col gap-2 text-slate-400 font-black uppercase tracking-[0.2em]" style={{ fontSize: 'clamp(0.65rem, 0.9vw, 0.85rem)' }}>
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined font-variation-fill" style={{ fontSize: 'clamp(0.875rem, 1.2vw, 1.25rem)' }}>schedule</span>
                        <span>{roomStatus.nextMeeting.startTime} – {roomStatus.nextMeeting.endTime}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined font-variation-fill" style={{ fontSize: 'clamp(0.875rem, 1.2vw, 1.25rem)' }}>person</span>
                        <span className="truncate max-w-[160px]">{roomStatus.nextMeeting.organizer}</span>
                      </div>
                    </div>

                    {minsUntilNext !== null && (
                      <div className="flex flex-col items-end shrink-0">
                        <span className="text-amber-400 font-black uppercase tracking-[0.2em] leading-none mb-1 text-right" style={{ fontSize: 'clamp(0.6rem, 0.9vw, 0.8rem)' }}>
                          STARTING IN
                        </span>
                        <div className="flex items-baseline gap-1 text-amber-400">
                          <span className="font-black leading-none" style={{ fontSize: 'clamp(2rem, 4.5vw, 5rem)' }}>{minsUntilNext}</span>
                          <span className="font-black uppercase tracking-widest" style={{ fontSize: 'clamp(0.65rem, 1vw, 0.9rem)' }}>MIN</span>
                        </div>
                      </div>
                    )}
                  </div>
                </button>
              ) : (
                <div className="flex-1 flex items-center justify-center gap-3 text-slate-200 font-black uppercase tracking-[0.4em] py-6" style={{ fontSize: 'clamp(0.7rem, 1vw, 0.875rem)' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 'clamp(1.25rem, 1.8vw, 1.75rem)' }}>event_busy</span>
                  No further events today
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SplitScreenLayout;
