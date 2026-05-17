import React from 'react';
import { RoomStatus } from '../../types';

interface LayoutProps {
  currentTime: Date;
  roomStatus: RoomStatus;
  isSyncing: boolean;
  onBook: (startTime?: string, meetingId?: string) => void;
  onExtend: (id: string) => void;
  onEndNow: (id: string) => void;
  onShowDetails: () => void;
  onCheckIn: () => void;
  slotPrecision: 15 | 30;
}

const DefaultLayout: React.FC<LayoutProps> = ({ currentTime, roomStatus, isSyncing, onBook, onExtend, onEndNow, onShowDetails, onCheckIn }) => {
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
    /* h-full + overflow-hidden keeps the layout within the viewport — no browser scroll */
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center px-6 py-4 lg:px-10 lg:py-5 justify-between border-b border-white/5 shrink-0">
        <div className="flex items-center gap-4">
          <div className="bg-primary/10 p-2.5 rounded-xl border border-primary/20 relative shrink-0">
            <span className="material-symbols-outlined text-primary font-variation-fill" style={{ fontSize: 'clamp(1.75rem, 2.5vw, 2.5rem)' }}>meeting_room</span>
            <div className={`absolute -top-1 -right-1 size-3 rounded-xl border-2 border-background-dark transition-colors duration-500 ${isSyncing ? 'bg-primary animate-ping' : 'bg-emerald-500'}`}></div>
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-3">
              <h1 className="font-black tracking-tight text-white" style={{ fontSize: 'clamp(1.25rem, 2.2vw, 2rem)' }}>{roomStatus.name}</h1>
              <button
                onClick={onShowDetails}
                className="size-11 shrink-0 rounded-xl bg-[#0a192f] text-primary/70 shadow-[0_10px_30px_rgba(10,25,47,0.4)] flex items-center justify-center border border-white/5 hover:scale-105 active:scale-95 transition-all group"
              >
                <span className="material-symbols-outlined font-variation-fill group-hover:scale-110 transition-transform" style={{ fontSize: 'clamp(1.1rem, 1.6vw, 1.5rem)' }}>info</span>
              </button>
              <span className={`font-black px-1.5 py-0.5 rounded-xl border ${isSyncing ? 'text-primary border-primary/30' : 'text-slate-300 border-white/10'} uppercase tracking-widest`} style={{ fontSize: 'clamp(0.5rem, 0.7vw, 0.625rem)' }}>
                {isSyncing ? 'Syncing...' : 'Live'}
              </span>
            </div>
            <p className="font-black text-primary uppercase tracking-[0.4em] opacity-80" style={{ fontSize: 'clamp(0.6rem, 0.85vw, 0.75rem)' }}>Room Management</p>
          </div>
        </div>
        <div className="flex flex-col items-end">
          <p className="font-black tracking-tighter text-slate-600" style={{ fontSize: 'clamp(1.1rem, 1.8vw, 1.75rem)' }}>{formattedTime}</p>
          <p className="text-slate-600 font-bold uppercase tracking-widest" style={{ fontSize: 'clamp(0.7rem, 1vw, 0.875rem)' }}>{formattedDate}</p>
        </div>
      </div>

      {/* Main content area */}
      <div className="flex flex-col md:flex-row flex-1 px-4 py-3 lg:px-8 lg:py-5 gap-4 lg:gap-6 overflow-hidden">
        {/* Scrollable column — internal scroll only, not browser scroll */}
        <div className="flex-1 flex flex-col gap-4 lg:gap-5 overflow-y-auto custom-scrollbar pr-1">

          {/* Status bar */}
          <div className={`flex w-full overflow-hidden rounded-xl border-2 items-center justify-between transition-all duration-500 shrink-0 ${
            roomStatus.isAvailable ? 'bg-status-available/50 border-status-available' : 'bg-status-busy/50 border-status-busy'
          }`} style={{ padding: 'clamp(0.75rem, 1.5vh, 1.25rem) clamp(0.75rem, 1.5vw, 1.25rem)' }}>
            <div className="flex items-center gap-4 lg:gap-6">
              <div className="flex flex-col">
                <span className={`${roomStatus.isAvailable ? 'text-status-available' : 'text-status-busy'} font-black tracking-[0.3em] uppercase mb-0.5 opacity-80`} style={{ fontSize: 'clamp(0.55rem, 0.8vw, 0.7rem)' }}>Room Status</span>
                <h2 className={`font-black tracking-tighter ${roomStatus.isAvailable ? 'text-status-available' : 'text-status-busy'}`} style={{ fontSize: 'clamp(1.75rem, 3vw, 3rem)' }}>
                  {roomStatus.isAvailable ? 'AVAILABLE' : 'IN USE'}
                </h2>
              </div>
              <div className="hidden lg:block w-px h-10 bg-white/10 mx-1" />
              <div className="flex items-center gap-3">
                <p className="text-slate-200 font-bold truncate max-w-[240px] lg:max-w-[320px]" style={{ fontSize: 'clamp(0.8rem, 1.3vw, 1.125rem)' }}>{roomStatus.location}</p>
              </div>
            </div>
            <div className={`${roomStatus.isAvailable ? 'bg-status-available' : 'bg-status-busy shadow-[0_0_20px_rgba(239,68,68,0.4)]'} p-3 rounded-xl shrink-0`}>
              <span className="material-symbols-outlined text-white font-variation-fill" style={{ fontSize: 'clamp(1.25rem, 2vw, 1.75rem)' }}>
                {roomStatus.isAvailable ? 'check_circle' : 'sensors'}
              </span>
            </div>
          </div>

          {/* Main card: image + meeting info */}
          <div className="flex flex-col rounded-xl shadow-2xl bg-card-dark border border-white/5 overflow-hidden flex-1 min-h-0">
            {/* Room image */}
            <div
              className="w-full bg-center bg-no-repeat bg-cover relative group bg-white/5 shrink-0"
              style={{
                backgroundImage: roomStatus.imageUrl ? `url("${roomStatus.imageUrl}")` : undefined,
                height: 'clamp(120px, 20vh, 260px)',
              }}
            >
              <div className="absolute inset-0 bg-gradient-to-t from-background-dark via-transparent to-transparent opacity-90" />
              {!roomStatus.isAvailable && (
                <div className="absolute top-4 left-4 lg:top-6 lg:left-6">
                  <div className="bg-status-busy px-4 py-2 rounded-xl font-black uppercase tracking-[0.2em] text-white shadow-[0_0_25px_rgba(239,68,68,0.6)] flex items-center gap-2 border border-white/20" style={{ fontSize: 'clamp(0.6rem, 0.9vw, 0.8rem)' }}>
                    <span className="w-1.5 h-1.5 rounded-xl bg-white animate-pulse"></span>
                    Running Now
                  </div>
                </div>
              )}
            </div>

            {/* Meeting details */}
            <div className="flex flex-col justify-between flex-1 gap-4 min-h-0" style={{ padding: 'clamp(1rem, 2.5vh, 2rem) clamp(1rem, 2vw, 2rem)' }}>
              <div className="space-y-3 lg:space-y-4">
                <div>
                  <p className="text-slate-300 font-black tracking-[0.4em] uppercase mb-2 opacity-50" style={{ fontSize: 'clamp(0.55rem, 0.8vw, 0.7rem)' }}>Current Meeting</p>
                  <h3
                    className="font-black leading-[1.1] tracking-tight text-white max-w-3xl cursor-pointer hover:text-primary transition-colors"
                    style={{ fontSize: 'clamp(1.75rem, 3.5vw, 4rem)' }}
                    onClick={() => !roomStatus.isAvailable && roomStatus.currentMeeting && onBook(undefined, roomStatus.currentMeeting.id)}
                  >
                    {roomStatus.currentMeeting?.title || 'No Ongoing Meeting'}
                  </h3>
                </div>
                <div className="flex flex-wrap items-center gap-x-8 gap-y-3">
                  <div className="flex items-center gap-3 text-slate-200">
                    <span className={`material-symbols-outlined ${roomStatus.isAvailable ? 'text-slate-300' : 'text-status-busy'}`} style={{ fontSize: 'clamp(1.25rem, 2vw, 1.75rem)' }}>schedule</span>
                    <p className="font-black" style={{ fontSize: 'clamp(1.1rem, 2vw, 1.75rem)' }}>{roomStatus.currentMeeting ? `${roomStatus.currentMeeting.startTime} - ${roomStatus.currentMeeting.endTime}` : '-- : --'}</p>
                  </div>
                  <div className="flex items-center gap-3 text-slate-200">
                    <span className="material-symbols-outlined text-slate-400" style={{ fontSize: 'clamp(1.25rem, 2vw, 1.75rem)' }}>person</span>
                    <p className="font-medium" style={{ fontSize: 'clamp(1rem, 1.6vw, 1.5rem)' }}>By <span className="text-white font-bold">{roomStatus.currentMeeting?.organizer || 'System'}</span></p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-3 pt-4 border-t border-white/5">
                <div className="flex flex-row gap-3">
                  {!roomStatus.isAvailable && roomStatus.currentMeeting ? (
                    <>
                      <button
                        onClick={() => onExtend(roomStatus.currentMeeting!.id)}
                        className="flex-1 flex items-center justify-center rounded-xl bg-white/5 text-slate-400 font-black border border-white/10 hover:bg-white/10 active:scale-95 transition-all"
                        style={{ fontSize: 'clamp(0.8rem, 1.3vw, 1.125rem)', height: 'clamp(3rem, 7vh, 5rem)' }}
                      >
                        <span className="material-symbols-outlined mr-3 text-slate-400" style={{ fontSize: 'clamp(1.25rem, 2vw, 1.75rem)' }}>more_time</span>
                        Extend
                      </button>
                      <button
                        onClick={() => onEndNow(roomStatus.currentMeeting!.id)}
                        className="flex-1 flex items-center justify-center rounded-xl bg-white/5 text-slate-400 font-black border border-white/10 hover:bg-white/10 active:scale-95 transition-all"
                        style={{ fontSize: 'clamp(0.8rem, 1.3vw, 1.125rem)', height: 'clamp(3rem, 7vh, 5rem)' }}
                      >
                        <span className="material-symbols-outlined mr-3 text-slate-400" style={{ fontSize: 'clamp(1.25rem, 2vw, 1.75rem)' }}>logout</span>
                        End Now
                      </button>
                      <button
                        onClick={onCheckIn}
                        className="flex-1 flex items-center justify-center rounded-xl bg-white/5 text-slate-400 font-black border border-white/10 hover:bg-white/10 active:scale-95 transition-all"
                        style={{ fontSize: 'clamp(0.8rem, 1.3vw, 1.125rem)', height: 'clamp(3rem, 7vh, 5rem)' }}
                      >
                        <span className="material-symbols-outlined mr-3 text-slate-400" style={{ fontSize: 'clamp(1.25rem, 2vw, 1.75rem)' }}>verified_user</span>
                        Check In
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => onBook()}
                      className="w-full flex items-center justify-center rounded-xl bg-white/95 backdrop-blur-xl text-black font-black shadow-[0_15px_40px_rgba(255,255,255,0.1)] hover:bg-white active:scale-95 transition-all border border-white/40"
                      style={{ fontSize: 'clamp(0.875rem, 1.4vw, 1.25rem)', height: 'clamp(3rem, 7vh, 5rem)' }}
                    >
                      <span className="material-symbols-outlined mr-3 text-status-available" style={{ fontSize: 'clamp(1.25rem, 2vw, 1.75rem)' }}>add_box</span>
                      Book
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Up Next section — pinned at the bottom */}
      {roomStatus.nextMeeting && (
        <div className="px-4 pb-3 lg:px-8 lg:pb-4 shrink-0">
          <button
            onClick={() => onBook(undefined, roomStatus.nextMeeting?.id)}
            className="w-full flex items-center justify-between rounded-xl bg-white/[0.03] border border-white/10 group hover:bg-white/[0.05] transition-all text-left shadow-xl"
            style={{ padding: 'clamp(0.6rem, 1.5vh, 1.25rem) clamp(0.75rem, 1.5vw, 1.25rem)' }}
          >
            <div className="flex items-center gap-4">
              <div className="size-12 lg:size-14 rounded-xl bg-slate-800 flex items-center justify-center text-slate-300 group-hover:scale-105 transition-transform border border-white/5 shrink-0">
                <span className="material-symbols-outlined font-variation-fill" style={{ fontSize: 'clamp(1.25rem, 2vw, 1.75rem)' }}>event_upcoming</span>
              </div>
              <div className="flex flex-col gap-0.5 min-w-0">
                <span className="text-slate-600 font-black uppercase tracking-[0.4em]" style={{ fontSize: 'clamp(0.55rem, 0.8vw, 0.7rem)' }}>UP NEXT</span>
                <p className="text-white font-black tracking-tight leading-none truncate" style={{ fontSize: 'clamp(0.8rem, 1.2vw, 1rem)' }}>{roomStatus.nextMeeting.title}</p>
                <p className="text-slate-400 font-bold mt-0.5 truncate" style={{ fontSize: 'clamp(0.6rem, 0.9vw, 0.8rem)' }}>
                  {roomStatus.nextMeeting.startTime} – {roomStatus.nextMeeting.endTime} • {roomStatus.nextMeeting.organizer}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4 pr-2 shrink-0">
              {minsUntilNext !== null && (
                <div className="flex flex-col items-end">
                  <span className="text-amber-400 font-black uppercase tracking-widest" style={{ fontSize: 'clamp(0.55rem, 0.8vw, 0.7rem)' }}>Starts in</span>
                  <span className="text-amber-400 font-black leading-none" style={{ fontSize: 'clamp(1.25rem, 2.2vw, 2rem)' }}>{minsUntilNext}m</span>
                </div>
              )}
              <span className="material-symbols-outlined text-primary group-hover:translate-x-1 transition-transform">chevron_right</span>
            </div>
          </button>
        </div>
      )}
    </div>
  );
};

const ScheduleCardItem: React.FC<{ title: string; time: string; organizer: string; isNext?: boolean; isOngoing?: boolean }> = ({ title, time, organizer, isNext, isOngoing }) => (
  <div className={`flex items-center gap-4 p-4 rounded-xl border text-left transition-all ${
    isOngoing ? 'bg-status-busy/10 border-status-busy/40' :
    isNext ? 'bg-card-dark border-primary/40' :
    'bg-transparent border-white/5 hover:bg-white/5'
  }`}>
    <div className={`size-11 rounded-xl flex items-center justify-center shrink-0 ${
      isOngoing ? 'bg-status-busy text-white' : isNext ? 'bg-primary text-white' : 'bg-slate-800 text-slate-300'
    }`}>
      <span className="material-symbols-outlined font-variation-fill" style={{ fontSize: 'clamp(1rem, 1.5vw, 1.5rem)' }}>
        {isOngoing ? 'sensors' : isNext ? 'event_upcoming' : 'event'}
      </span>
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-white font-black truncate mb-0.5 tracking-tight" style={{ fontSize: 'clamp(0.875rem, 1.3vw, 1.1rem)' }}>{title}</p>
      <div className="flex items-center gap-2">
        <p className={`${isOngoing ? 'text-status-busy' : 'text-primary'} font-black uppercase tracking-wider truncate`} style={{ fontSize: 'clamp(0.6rem, 0.85vw, 0.75rem)' }}>{time}</p>
        <p className="text-slate-300 font-bold uppercase tracking-widest truncate" style={{ fontSize: 'clamp(0.6rem, 0.85vw, 0.75rem)' }}>{organizer}</p>
      </div>
    </div>
  </div>
);

export default DefaultLayout;
