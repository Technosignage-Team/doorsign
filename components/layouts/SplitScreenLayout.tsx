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


  function parseToDate(timeStr: string) {
    const [time, modifier] = timeStr.split(' ');
    let [hours, minutes] = time.split(':').map(Number);
    if (modifier === 'PM' && hours < 12) hours += 12;
    if (modifier === 'AM' && hours === 12) hours = 0;
    const date = new Date(currentTime);
    date.setHours(hours, minutes, 0, 0);
    return date;
  }

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
    <div 
      className="flex h-screen w-full bg-[#050505] overflow-hidden text-white font-display relative"
    >
      {/* Left: Room Branding & Status */}
      <div className="relative w-[42%] h-full shrink-0 overflow-hidden border-r border-white/5">
        <div
          className="absolute inset-0 bg-cover bg-center transition-transform duration-[20s] hover:scale-105 bg-white/5"
          style={roomStatus.imageUrl ? { backgroundImage: `url("${roomStatus.imageUrl}")` } : undefined}
        />
        <div className={`absolute inset-0 transition-colors duration-1000 ${
          roomStatus.isAvailable ? 'bg-emerald-500/60' : 'bg-rose-500/60'
        }`} />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
        
        <div className="absolute bottom-16 left-12 right-12 text-left">
          <div className="flex items-center gap-6 mb-6">
            <h1 className="text-white text-[4vw] font-black tracking-tighter leading-[0.85] drop-shadow-2xl uppercase max-w-[350px]">
              {roomStatus.name || 'EXECUTIVE BOARDROOM'}
            </h1>
            <button 
              onClick={onShowDetails} 
              className="size-14 shrink-0 rounded-xl bg-[#0a192f] text-primary/70 shadow-[0_10px_30px_rgba(10,25,47,0.4)] flex items-center justify-center border border-white/5 hover:scale-105 active:scale-95 transition-all group"
            >
              <span className="material-symbols-outlined text-3xl font-variation-fill group-hover:scale-110 transition-transform">info</span>
            </button>
          </div>
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-slate-400 text-sm">location_on</span>
              <p className="text-xs lg:text-sm font-black uppercase tracking-[0.2em] text-slate-200">
                {roomStatus.location.toUpperCase()}
              </p>
            </div>
            <p className="text-[10px] lg:text-xs font-black uppercase tracking-[0.4em] text-slate-200/80 pl-6">
              {roomStatus.name.toUpperCase()} • {roomStatus.capacity} PERSONS
            </p>
          </div>
        </div>
      </div>

      {/* Right: Dashboard View */}
      <div className="relative flex-1 h-full flex flex-col bg-[#080808] p-8 lg:p-12 overflow-y-auto custom-scrollbar">
        <div className="flex flex-col gap-6 lg:gap-10">
          
          <div className="flex flex-col">
            <h2 className="text-[60px] lg:text-[80px] font-black leading-none tracking-tighter text-slate-600">
              {formattedTime}
            </h2>
            <p className="text-slate-600 text-lg lg:text-xl font-black uppercase tracking-[0.4em] mt-2">
              {formattedDate}
            </p>
          </div>

          <div className="flex flex-col gap-4">
            {roomStatus.isAvailable ? (
              <div className="flex flex-col gap-6 items-center text-center mx-auto">
                <h3 className="text-white text-[52px] lg:text-[72px] font-black leading-[1.05] tracking-tight">
                  Room Ready
                </h3>
                <p className="text-slate-100 text-lg lg:text-xl font-medium max-w-lg leading-relaxed">
                  The boardroom is currently unoccupied. Create a booking to start your session.
                </p>
                <button
                  onClick={handleBookNow}
                  className="bg-white/95 backdrop-blur-xl text-black px-10 py-5 rounded-xl text-xl font-black shadow-[0_25px_50px_rgba(255,255,255,0.1)] hover:bg-white active:scale-95 transition-all flex items-center gap-4 border border-white/40"
                >
                  <span className="material-symbols-outlined text-3xl font-bold">add_circle</span>
                  Book
                </button>
              </div>
            ) : (
              <>
                <h3
                  className="text-white text-[32px] lg:text-[48px] font-black leading-[1.1] tracking-tight w-full cursor-pointer hover:text-primary transition-colors"
                  onClick={() => onShowMeetingDetails(roomStatus.currentMeeting?.id || '')}
                >
                  {roomStatus.currentMeeting?.title}
                </h3>

                <div
                  onClick={() => onShowMeetingDetails(roomStatus.currentMeeting?.id || '')}
                  className="w-full max-w-lg bg-white/[0.03] border border-white/10 rounded-xl p-8 lg:p-10 flex flex-col gap-4 relative overflow-hidden group cursor-pointer hover:bg-white/[0.06] hover:border-white/20 transition-all shadow-2xl"
                >
                  <div className={`absolute left-0 top-0 bottom-0 w-2 ${roomStatus.isAvailable ? 'bg-status-available' : 'bg-status-busy'} shadow-[0_0_20px_rgba(239,68,68,0.4)]`}></div>
                  <p className="text-white text-3xl lg:text-4xl font-black tracking-tight leading-none group-hover:text-primary transition-colors">
                    {roomStatus.currentMeeting?.startTime} - {roomStatus.currentMeeting?.endTime}
                  </p>
                  <p className="text-white text-3xl lg:text-4xl font-black tracking-tight leading-none group-hover:text-primary transition-colors">
                    {roomStatus.currentMeeting?.organizer || 'System'}
                  </p>
                </div>

                <div className="flex items-center gap-3 w-full max-w-lg">
                  <button onClick={() => roomStatus.currentMeeting && onExtend(roomStatus.currentMeeting.id)} className="flex-1 bg-white/5 text-slate-600 py-5 rounded-xl text-sm lg:text-base font-black border border-white/10 hover:bg-white/10 transition-all flex items-center justify-center gap-3 active:scale-95">
                    <span className="material-symbols-outlined text-xl text-slate-600">more_time</span> Extend
                  </button>
                  <button onClick={() => roomStatus.currentMeeting && onEndNow(roomStatus.currentMeeting.id)} className="flex-1 bg-white/5 text-slate-600 py-5 rounded-xl text-sm lg:text-base font-black border border-white/10 hover:bg-white/10 transition-all flex items-center justify-center gap-3 active:scale-95">
                    <span className="material-symbols-outlined text-xl text-slate-600">logout</span> End Now
                  </button>
                  <button onClick={onCheckIn} className="flex-1 bg-white/5 text-slate-600 py-5 rounded-xl text-sm lg:text-base font-black border border-white/10 hover:bg-white/10 transition-all flex items-center justify-center gap-3 active:scale-95">
                    <span className="material-symbols-outlined text-xl text-slate-600">verified_user</span> Check In/Out
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="mt-auto pt-10">
          <div className="bg-[#0c0c0c] border border-white/10 rounded-xl p-8 lg:p-10 shadow-2xl hover:border-white/20 transition-all group overflow-hidden relative max-w-md">
            <div className="absolute top-0 right-0 size-48 bg-primary/5 blur-[50px] rounded-xl pointer-events-none translate-x-12 -translate-y-12" />
            
            {roomStatus.nextMeeting ? (
              <button
                onClick={() => onShowMeetingDetails(roomStatus.nextMeeting!.id)}
                className="w-full flex flex-col text-left"
              >
                <span className="text-slate-600 text-[10px] font-black uppercase tracking-[0.6em] mb-4 px-1">UP NEXT</span>
                <h4 className="text-2xl lg:text-3xl font-black tracking-tight leading-tight truncate text-white group-hover:text-primary transition-colors">
                  {roomStatus.nextMeeting.title}
                </h4>

                <div className="flex flex-wrap items-center justify-between w-full border-t border-white/5 mt-6 pt-6 gap-6">
                  <div className="flex flex-col gap-3 text-slate-400 font-black text-[10px] lg:text-[11px] uppercase tracking-[0.2em]">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-lg font-variation-fill">schedule</span>
                      <span>{roomStatus.nextMeeting.startTime} – {roomStatus.nextMeeting.endTime}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-lg font-variation-fill">person</span>
                      <span className="truncate max-w-[140px]">{roomStatus.nextMeeting.organizer}</span>
                    </div>
                  </div>

                  {minsUntilNext !== null && (
                    <div className="flex flex-col items-end shrink-0">
                      <span className="text-amber-400 text-[9px] font-black uppercase tracking-[0.2em] leading-none mb-1 text-right">
                        STARTING IN
                      </span>
                      <div className="flex items-baseline gap-1 text-amber-400">
                        <span className="text-5xl lg:text-7xl font-black leading-none">{minsUntilNext}</span>
                        <span className="text-[14px] font-black uppercase tracking-widest">MIN</span>
                      </div>
                    </div>
                  )}
                </div>
              </button>
            ) : (
              <div className="flex-1 flex items-center justify-center gap-4 text-slate-200 font-black uppercase tracking-[0.4em] text-[12px] py-10">
                <span className="material-symbols-outlined text-2xl">event_busy</span>
                No further events today
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SplitScreenLayout;