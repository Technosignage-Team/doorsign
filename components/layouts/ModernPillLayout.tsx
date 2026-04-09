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
    <div className="flex flex-col h-full bg-[#050505] items-center justify-start overflow-y-auto custom-scrollbar px-6 py-10 gap-8">
      {/* Pill Header Branding */}
      <div className="flex flex-col items-center gap-5 shrink-0">
        <div className={`bg-black border-[2px] rounded-xl px-8 py-3 flex items-center justify-center gap-3 transition-all duration-500 ${
          roomStatus.isAvailable ? 'border-emerald-500/80' : 'border-status-busy/100 shadow-[0_0_30px_rgba(239,68,68,0.6)]'
        }`}>
          <span className={`material-symbols-outlined text-2xl font-variation-fill ${
            roomStatus.isAvailable ? 'text-emerald-500' : 'text-status-busy animate-pulse'
          }`}>
            {roomStatus.isAvailable ? 'check_circle' : 'sensors'}
          </span>
          <span className="text-white text-2xl font-black tracking-[0.1em] uppercase">{roomStatus.name.toUpperCase()}</span>
        </div>

        <div className="flex flex-col items-center">
          <h1 className="text-[40px] lg:text-[50px] font-black leading-none tracking-tighter drop-shadow-2xl text-slate-600">
            {formattedTime}
          </h1>
          <p className="text-slate-600 text-lg font-black uppercase tracking-[0.3em] mt-1">
            {formattedDate}
          </p>
          <div className="flex items-center gap-4 mt-4 opacity-80">
            <div className="flex flex-col items-start">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-slate-200 text-sm">location_on</span>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-100">{roomStatus.location}</p>
              </div>
            </div>
            <button 
              onClick={onShowDetails} 
              className="size-16 shrink-0 rounded-xl bg-[#0a192f] text-primary/70 shadow-[0_10px_30px_rgba(10,25,47,0.4)] flex items-center justify-center border border-white/5 hover:scale-105 active:scale-95 transition-all group"
            >
              <span className="material-symbols-outlined text-4xl font-variation-fill group-hover:scale-110 transition-transform">info</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Card — only shown when room is busy */}
      {!roomStatus.isAvailable && roomStatus.currentMeeting && (
        <div className="w-full max-w-xl bg-[#111] rounded-xl border border-white/5 shadow-2xl overflow-hidden relative group shrink-0">
          <div
            className="absolute inset-0 bg-cover bg-center opacity-30 transition-opacity duration-700 bg-white/5"
            style={roomStatus.imageUrl ? { backgroundImage: `url("${roomStatus.imageUrl}")` } : undefined}
          />
          <div className="absolute inset-0 bg-rose-500/30 transition-colors duration-1000" />

          <div className="relative p-8 flex flex-col gap-8">
            <div className="flex justify-start">
              <div className="bg-status-busy shadow-status-busy/40 px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl flex items-center gap-2">
                <span className="size-1.5 rounded-xl bg-white animate-pulse"></span>
                IN USE
              </div>
            </div>

            <div className="space-y-3 cursor-pointer" onClick={() => onBook(undefined, roomStatus.currentMeeting?.id)}>
              <p className="text-primary text-xs font-black uppercase tracking-[0.3em] opacity-80">ONGOING SESSION</p>
              <h2 className="text-white text-4xl lg:text-5xl font-black leading-tight tracking-tight hover:text-primary transition-colors">
                {roomStatus.currentMeeting.title}
              </h2>
            </div>

            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-5">
                <div className="size-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
                  <span className="material-symbols-outlined text-2xl font-variation-fill text-status-busy">schedule</span>
                </div>
                <div className="flex flex-col">
                  <p className="text-slate-100 text-[8px] font-black uppercase tracking-widest">TIME SLOT</p>
                  <p className="text-white text-2xl font-black">
                    {roomStatus.currentMeeting.startTime} - {roomStatus.currentMeeting.endTime}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-5">
                <div className="size-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
                  <span className="material-symbols-outlined text-2xl font-variation-fill text-status-busy">person</span>
                </div>
                <div className="flex flex-col">
                  <p className="text-slate-100 text-[8px] font-black uppercase tracking-widest">ORGANIZER</p>
                  <p className="text-white text-2xl font-black">{roomStatus.currentMeeting.organizer}</p>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3 mt-2">
              <button
                onClick={() => onExtend(roomStatus.currentMeeting!.id)}
                className="w-full bg-white/5 text-slate-600 py-4 rounded-xl text-xl font-black border border-white/10 hover:bg-white/10 active:scale-95 transition-all flex items-center justify-center gap-3"
              >
                <span className="material-symbols-outlined text-2xl font-variation-fill text-slate-600">more_time</span>
                EXTEND
              </button>
              <button
                onClick={() => onEndNow(roomStatus.currentMeeting!.id)}
                className="w-full bg-white/5 text-slate-600 py-4 rounded-xl text-xl font-black border border-white/10 hover:bg-white/10 active:scale-95 transition-all flex items-center justify-center gap-3 group"
              >
                <span className="material-symbols-outlined text-2xl text-slate-600 group-hover:scale-110 transition-transform">cancel</span>
                END NOW
              </button>
              <button
                onClick={onCheckIn}
                className="w-full bg-white/5 text-slate-600 py-4 rounded-xl text-xl font-black border border-white/10 hover:bg-white/10 active:scale-95 transition-all flex items-center justify-center gap-3 group"
              >
                <span className="material-symbols-outlined text-2xl text-slate-600 group-hover:scale-110 transition-transform">verified_user</span>
                CHECK IN
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Booking trigger if available */}
      {roomStatus.isAvailable && (
        <button 
          onClick={() => onBook()}
          className="w-full max-w-xl bg-white/95 backdrop-blur-xl text-black border border-white/40 rounded-xl p-6 lg:p-8 flex items-center justify-between hover:bg-white active:scale-[0.98] transition-all group shadow-2xl shrink-0"
        >
          <div className="flex flex-col items-start">
            <p className="text-[9px] font-black uppercase tracking-[0.3em] opacity-60">ROOM IS FREE</p>
            <p className="text-xl lg:text-2xl font-black tracking-tighter">QUICK RESERVE 30 MINS</p>
          </div>
          <div className="size-14 rounded-xl bg-black/10 border border-black/20 text-black flex items-center justify-center shadow-xl group-hover:rotate-90 transition-transform duration-700">
            <span className="material-symbols-outlined text-3xl">add</span>
          </div>
        </button>
      )}

      {/* Upcoming Panel at the Bottom */}
      <div className="w-full max-w-xl flex flex-col gap-6 mb-10 shrink-0">
        <div className="space-y-3">
          <div className="flex flex-col gap-3">
            {roomStatus.nextMeeting ? (
              <button
                onClick={() => onBook(undefined, roomStatus.nextMeeting!.id)}
                className="w-full bg-[#111] border border-white/5 rounded-xl p-6 flex items-center justify-between group transition-all hover:bg-white/[0.03] text-left shadow-xl"
              >
                <div className="flex items-center gap-6">
                  <div className="size-16 rounded-xl bg-slate-800/60 flex items-center justify-center text-slate-100 group-hover:scale-105 transition-transform border border-white/5">
                    <span className="material-symbols-outlined text-3xl font-variation-fill">event_upcoming</span>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-slate-600 text-[9px] font-black uppercase tracking-[0.4em]">UP NEXT</span>
                    <p className="text-white text-sm lg:text-base font-black tracking-tight leading-tight group-hover:text-primary transition-colors">{roomStatus.nextMeeting.title}</p>
                    <p className="text-slate-400 text-xs font-bold mt-0.5">
                      {roomStatus.nextMeeting.startTime} – {roomStatus.nextMeeting.endTime} • {roomStatus.nextMeeting.organizer}
                    </p>
                  </div>
                </div>
                {minsUntilNext !== null && (
                  <div className="flex flex-col items-end shrink-0 pr-1">
                    <span className="text-amber-400 text-[9px] font-black uppercase leading-none mb-0.5">In</span>
                    <span className="text-amber-400 text-2xl lg:text-3xl font-black leading-none">{minsUntilNext}m</span>
                  </div>
                )}
              </button>
            ) : (
              <div className="bg-[#111] border border-white/5 rounded-xl p-6 text-center text-slate-100 font-bold uppercase tracking-widest text-xs">
                No further meetings scheduled today
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModernPillLayout;