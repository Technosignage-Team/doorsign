import React from 'react';
import { RoomStatus } from '../../types';

interface LayoutProps {
  currentTime: Date;
  roomStatus: RoomStatus;
  onBook: (startTime?: string, meetingId?: string) => void;
  onExtend: (id: string) => void;
  onEndNow: (id: string) => void;
  onShowDetails: () => void;
  onCheckIn: () => void;
  slotPrecision: 15 | 30;
}

const ModernPillLayout: React.FC<LayoutProps> = ({ currentTime, roomStatus, onBook, onExtend, onEndNow, onShowDetails, onCheckIn, slotPrecision }) => {
  const formattedTime = currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
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

  return (
    /* h-full + overflow-hidden: fills the viewport, no browser scroll */
    <div className="flex flex-col h-full bg-[#050505] items-center overflow-hidden px-6 py-[3vh] gap-0">

      {/* ── TOP: Pill header + clock ── */}
      <div className="flex flex-col items-center gap-[1.5vh] shrink-0 w-full max-w-xl">
        {/* Status pill */}
        <div className={`bg-black border-[2px] rounded-xl flex items-center justify-center gap-3 transition-all duration-500 ${
          roomStatus.isAvailable ? 'border-emerald-500/80' : 'border-status-busy/100 shadow-[0_0_30px_rgba(239,68,68,0.6)]'
        }`} style={{ padding: 'clamp(0.4rem, 1vh, 0.75rem) clamp(1rem, 2.5vw, 2rem)' }}>
          <span className={`material-symbols-outlined font-variation-fill ${
            roomStatus.isAvailable ? 'text-emerald-500' : 'text-status-busy animate-pulse'
          }`} style={{ fontSize: 'clamp(1.1rem, 1.8vw, 1.75rem)' }}>
            {roomStatus.isAvailable ? 'check_circle' : 'sensors'}
          </span>
          <span className="text-white font-black tracking-[0.1em] uppercase" style={{ fontSize: 'clamp(1rem, 1.8vw, 1.75rem)' }}>
            {roomStatus.name.toUpperCase()}
          </span>
        </div>

        {/* Clock */}
        <div className="flex flex-col items-center">
          <h1 className="font-black leading-none tracking-tighter drop-shadow-2xl text-slate-600" style={{ fontSize: 'clamp(3rem, 7vw, 8rem)' }}>
            {formattedTime}
          </h1>
          <p className="text-slate-600 font-black uppercase tracking-[0.3em] mt-1" style={{ fontSize: 'clamp(0.75rem, 1.2vw, 1.1rem)' }}>
            {formattedDate}
          </p>
          {/* Location + info */}
          <div className="flex items-center gap-4 mt-[1vh] opacity-80">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-slate-200" style={{ fontSize: 'clamp(0.875rem, 1.2vw, 1.1rem)' }}>location_on</span>
              <p className="font-black uppercase tracking-[0.2em] text-slate-100" style={{ fontSize: 'clamp(0.7rem, 1vw, 0.875rem)' }}>{roomStatus.location}</p>
            </div>
            <button
              onClick={onShowDetails}
              className="size-12 shrink-0 rounded-xl bg-[#0a192f] text-primary/70 shadow-[0_10px_30px_rgba(10,25,47,0.4)] flex items-center justify-center border border-white/5 hover:scale-105 active:scale-95 transition-all group"
            >
              <span className="material-symbols-outlined font-variation-fill group-hover:scale-110 transition-transform" style={{ fontSize: 'clamp(1.25rem, 2vw, 2rem)' }}>info</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── MIDDLE: Main content — flex-1 to fill remaining space ── */}
      <div className="flex-1 flex flex-col w-full max-w-xl items-center justify-center gap-[2vh] min-h-0 py-[2vh]">

        {/* Busy: meeting card */}
        {!roomStatus.isAvailable && roomStatus.currentMeeting && (
          <div className="w-full bg-[#111] rounded-xl border border-white/5 shadow-2xl overflow-hidden relative group">
            <div
              className="absolute inset-0 bg-cover bg-center opacity-30 transition-opacity duration-700 bg-white/5"
              style={roomStatus.imageUrl ? { backgroundImage: `url("${roomStatus.imageUrl}")` } : undefined}
            />
            <div className="absolute inset-0 bg-rose-500/30 transition-colors duration-1000" />

            <div className="relative flex flex-col gap-[1.5vh]" style={{ padding: 'clamp(1rem, 2.5vh, 2rem) clamp(1rem, 2vw, 1.75rem)' }}>
              <div className="flex justify-start">
                <div className="bg-status-busy px-4 py-1.5 rounded-xl font-black uppercase tracking-widest shadow-xl flex items-center gap-2" style={{ fontSize: 'clamp(0.6rem, 0.9vw, 0.8rem)' }}>
                  <span className="size-1.5 rounded-xl bg-white animate-pulse"></span>
                  IN USE
                </div>
              </div>

              <div className="space-y-2 cursor-pointer" onClick={() => onBook(undefined, roomStatus.currentMeeting?.id)}>
                <p className="text-primary font-black uppercase tracking-[0.3em] opacity-80" style={{ fontSize: 'clamp(0.65rem, 0.9vw, 0.8rem)' }}>ONGOING SESSION</p>
                <h2
                  className="text-white font-black leading-tight tracking-tight hover:text-primary transition-colors"
                  style={{ fontSize: 'clamp(1.5rem, 3.5vw, 4rem)' }}
                >
                  {roomStatus.currentMeeting.title}
                </h2>
              </div>

              <div className="flex flex-col gap-[1vh]">
                <div className="flex items-center gap-4">
                  <div className="size-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined font-variation-fill text-status-busy" style={{ fontSize: 'clamp(1rem, 1.5vw, 1.5rem)' }}>schedule</span>
                  </div>
                  <div className="flex flex-col">
                    <p className="text-slate-100 font-black uppercase tracking-widest" style={{ fontSize: 'clamp(0.6rem, 0.8vw, 0.75rem)' }}>TIME SLOT</p>
                    <p className="text-white font-black" style={{ fontSize: 'clamp(1rem, 1.8vw, 1.75rem)' }}>
                      {roomStatus.currentMeeting.startTime} - {roomStatus.currentMeeting.endTime}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="size-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined font-variation-fill text-status-busy" style={{ fontSize: 'clamp(1rem, 1.5vw, 1.5rem)' }}>person</span>
                  </div>
                  <div className="flex flex-col">
                    <p className="text-slate-100 font-black uppercase tracking-widest" style={{ fontSize: 'clamp(0.6rem, 0.8vw, 0.75rem)' }}>ORGANIZER</p>
                    <p className="text-white font-black" style={{ fontSize: 'clamp(1rem, 1.8vw, 1.75rem)' }}>
                      {roomStatus.currentMeeting.organizer}
                    </p>
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex flex-col gap-[1vh] mt-[1vh]">
                <button
                  onClick={() => onExtend(roomStatus.currentMeeting!.id)}
                  className="w-full bg-white/5 text-slate-400 rounded-xl font-black border border-white/10 hover:bg-white/10 active:scale-95 transition-all flex items-center justify-center gap-3"
                  style={{ fontSize: 'clamp(0.875rem, 1.4vw, 1.25rem)', padding: 'clamp(0.5rem, 1.2vh, 1rem) 0.5rem' }}
                >
                  <span className="material-symbols-outlined font-variation-fill text-slate-400" style={{ fontSize: 'clamp(1rem, 1.5vw, 1.5rem)' }}>more_time</span>
                  EXTEND
                </button>
                <button
                  onClick={() => onEndNow(roomStatus.currentMeeting!.id)}
                  className="w-full bg-white/5 text-slate-400 rounded-xl font-black border border-white/10 hover:bg-white/10 active:scale-95 transition-all flex items-center justify-center gap-3 group"
                  style={{ fontSize: 'clamp(0.875rem, 1.4vw, 1.25rem)', padding: 'clamp(0.5rem, 1.2vh, 1rem) 0.5rem' }}
                >
                  <span className="material-symbols-outlined text-slate-400 group-hover:scale-110 transition-transform" style={{ fontSize: 'clamp(1rem, 1.5vw, 1.5rem)' }}>cancel</span>
                  END NOW
                </button>
                <button
                  onClick={onCheckIn}
                  className="w-full bg-white/5 text-slate-400 rounded-xl font-black border border-white/10 hover:bg-white/10 active:scale-95 transition-all flex items-center justify-center gap-3 group"
                  style={{ fontSize: 'clamp(0.875rem, 1.4vw, 1.25rem)', padding: 'clamp(0.5rem, 1.2vh, 1rem) 0.5rem' }}
                >
                  <span className="material-symbols-outlined text-slate-400 group-hover:scale-110 transition-transform" style={{ fontSize: 'clamp(1rem, 1.5vw, 1.5rem)' }}>verified_user</span>
                  CHECK IN
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Available: quick-reserve button */}
        {roomStatus.isAvailable && (
          <button
            onClick={() => onBook()}
            className="w-full bg-white/95 backdrop-blur-xl text-black border border-white/40 rounded-xl flex items-center justify-between hover:bg-white active:scale-[0.98] transition-all group shadow-2xl"
            style={{ padding: 'clamp(1rem, 2.5vh, 2rem) clamp(1rem, 2.5vw, 2rem)' }}
          >
            <div className="flex flex-col items-start">
              <p className="font-black uppercase tracking-[0.3em] opacity-60" style={{ fontSize: 'clamp(0.65rem, 0.9vw, 0.8rem)' }}>ROOM IS FREE</p>
              <p className="font-black tracking-tighter" style={{ fontSize: 'clamp(1.1rem, 2vw, 2rem)' }}>QUICK RESERVE 30 MINS</p>
            </div>
            <div className="size-14 rounded-xl bg-black/10 border border-black/20 text-black flex items-center justify-center shadow-xl group-hover:rotate-90 transition-transform duration-700">
              <span className="material-symbols-outlined" style={{ fontSize: 'clamp(1.25rem, 2vw, 2rem)' }}>add</span>
            </div>
          </button>
        )}
      </div>

      {/* ── BOTTOM: Upcoming meeting ── */}
      <div className="w-full max-w-xl shrink-0">
        <div className="space-y-2">
          {roomStatus.nextMeeting ? (
            <button
              onClick={() => onBook(undefined, roomStatus.nextMeeting!.id)}
              className="w-full bg-[#111] border border-white/5 rounded-xl flex items-center justify-between group transition-all hover:bg-white/[0.03] text-left shadow-xl"
              style={{ padding: 'clamp(0.75rem, 1.8vh, 1.5rem) clamp(0.75rem, 1.5vw, 1.25rem)' }}
            >
              <div className="flex items-center gap-4">
                <div className="size-14 rounded-xl bg-slate-800/60 flex items-center justify-center text-slate-100 group-hover:scale-105 transition-transform border border-white/5 shrink-0">
                  <span className="material-symbols-outlined font-variation-fill" style={{ fontSize: 'clamp(1.25rem, 2vw, 1.75rem)' }}>event_upcoming</span>
                </div>
                <div className="flex flex-col gap-0.5 min-w-0">
                  <span className="text-slate-600 font-black uppercase tracking-[0.4em]" style={{ fontSize: 'clamp(0.6rem, 0.85vw, 0.75rem)' }}>UP NEXT</span>
                  <p className="text-white font-black tracking-tight leading-tight group-hover:text-primary transition-colors truncate" style={{ fontSize: 'clamp(0.875rem, 1.4vw, 1.25rem)' }}>
                    {roomStatus.nextMeeting.title}
                  </p>
                  <p className="text-slate-400 font-bold truncate" style={{ fontSize: 'clamp(0.7rem, 1vw, 0.875rem)' }}>
                    {roomStatus.nextMeeting.startTime} – {roomStatus.nextMeeting.endTime} • {roomStatus.nextMeeting.organizer}
                  </p>
                </div>
              </div>
              {minsUntilNext !== null && (
                <div className="flex flex-col items-end shrink-0 pr-1">
                  <span className="text-amber-400 font-black uppercase leading-none mb-0.5" style={{ fontSize: 'clamp(0.6rem, 0.85vw, 0.75rem)' }}>In</span>
                  <span className="text-amber-400 font-black leading-none" style={{ fontSize: 'clamp(1.25rem, 2.5vw, 2.5rem)' }}>{minsUntilNext}m</span>
                </div>
              )}
            </button>
          ) : (
            <div className="bg-[#111] border border-white/5 rounded-xl text-center text-slate-100 font-bold uppercase tracking-widest" style={{ fontSize: 'clamp(0.7rem, 1vw, 0.875rem)', padding: 'clamp(0.75rem, 1.5vh, 1.25rem)' }}>
              No further meetings scheduled today
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ModernPillLayout;
