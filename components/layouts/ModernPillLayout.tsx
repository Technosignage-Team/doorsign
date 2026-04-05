import React from 'react';
import { RoomStatus } from '../../types';
import { db } from '../../lib/db';

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

  const meetings = db.getMeetings();
  const upcomingMeetings = meetings.filter(m => m.id !== roomStatus.currentMeeting?.id);

  return (
    <div className="flex flex-col h-full bg-[#050505] items-center justify-start overflow-y-auto custom-scrollbar px-6 py-10 gap-8">
      {/* Pill Header Branding */}
      <div className="flex flex-col items-center gap-5 shrink-0">
        <div className={`bg-black border-[2px] rounded-none px-8 py-3 flex items-center justify-center gap-3 transition-all duration-500 ${
          roomStatus.isAvailable ? 'border-emerald-500/80' : 'border-status-busy/100 shadow-[0_0_30px_rgba(239,68,68,0.6)]'
        }`}>
          <span className={`material-symbols-outlined text-2xl font-variation-fill ${
            roomStatus.isAvailable ? 'text-emerald-500' : 'text-status-busy animate-pulse'
          }`}>
            {roomStatus.isAvailable ? 'check_circle' : 'sensors'}
          </span>
          <span className="text-white text-2xl font-black tracking-[0.1em] uppercase">EVEREST</span>
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
              className="size-16 shrink-0 rounded-none bg-[#0a192f] text-primary/70 shadow-[0_10px_30px_rgba(10,25,47,0.4)] flex items-center justify-center border border-white/5 hover:scale-105 active:scale-95 transition-all group"
            >
              <span className="material-symbols-outlined text-4xl font-variation-fill group-hover:scale-110 transition-transform">info</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Card */}
      <div className="w-full max-w-xl bg-[#111] rounded-none border border-white/5 shadow-2xl overflow-hidden relative group shrink-0">
        <div 
          className="absolute inset-0 bg-cover bg-center opacity-30 transition-opacity duration-700"
          style={{ backgroundImage: 'url("https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&q=80&w=1200")' }}
        />
        <div className={`absolute inset-0 transition-colors duration-1000 ${
          roomStatus.isAvailable ? 'bg-emerald-500/30' : 'bg-rose-500/30'
        }`} />
        
        <div className="relative p-8 flex flex-col gap-8">
          <div className="flex justify-start">
             <div className={`${roomStatus.isAvailable ? 'bg-status-available shadow-emerald-500/40' : 'bg-status-busy shadow-status-busy/40'} px-4 py-1.5 rounded-none text-[10px] font-black uppercase tracking-widest shadow-xl flex items-center gap-2`}>
               {!roomStatus.isAvailable && <span className="size-1.5 rounded-none bg-white animate-pulse"></span>}
               {roomStatus.isAvailable ? 'AVAILABLE' : 'IN USE'}
             </div>
          </div>

          <div className="space-y-3 cursor-pointer" onClick={() => !roomStatus.isAvailable && onBook(undefined, roomStatus.currentMeeting?.id)}>
            <p className="text-primary text-xs font-black uppercase tracking-[0.3em] opacity-80">
              {roomStatus.isAvailable ? 'ROOM INFO' : 'ONGOING SESSION'}
            </p>
            <h2 className="text-white text-4xl lg:text-5xl font-black leading-tight tracking-tight hover:text-primary transition-colors">
              {roomStatus.currentMeeting?.title || 'Room Ready for Booking'}
            </h2>
          </div>

          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-5">
              <div className="size-12 rounded-none bg-white/5 border border-white/10 flex items-center justify-center text-primary">
                <span className={`material-symbols-outlined text-2xl font-variation-fill ${!roomStatus.isAvailable ? 'text-status-busy' : 'text-primary'}`}>schedule</span>
              </div>
              <div className="flex flex-col">
                <p className="text-slate-100 text-[8px] font-black uppercase tracking-widest">TIME SLOT</p>
                <p className="text-white text-2xl font-black">
                  {roomStatus.currentMeeting ? `${roomStatus.currentMeeting.startTime} - ${roomStatus.currentMeeting.endTime}` : 'No current booking'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-5">
              <div className="size-12 rounded-none bg-white/5 border border-white/10 flex items-center justify-center text-primary">
                <span className={`material-symbols-outlined text-2xl font-variation-fill ${!roomStatus.isAvailable ? 'text-status-busy' : 'text-primary'}`}>person</span>
              </div>
              <div className="flex flex-col">
                <p className="text-slate-100 text-[8px] font-black uppercase tracking-widest">ORGANIZER</p>
                <p className="text-white text-2xl font-black">
                  {roomStatus.currentMeeting?.organizer || 'System Available'}
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 mt-2">
            {!roomStatus.isAvailable && roomStatus.currentMeeting ? (
              <>
                <button 
                  onClick={() => onExtend(roomStatus.currentMeeting!.id)}
                  className="w-full bg-white/5 text-slate-600 py-4 rounded-none text-xl font-black border border-white/10 hover:bg-white/10 active:scale-95 transition-all flex items-center justify-center gap-3"
                >
                  <span className="material-symbols-outlined text-2xl font-variation-fill text-slate-600">more_time</span>
                  EXTEND
                </button>
                <button 
                  onClick={() => onEndNow(roomStatus.currentMeeting!.id)}
                  className="w-full bg-white/5 text-slate-600 py-4 rounded-none text-xl font-black border border-white/10 hover:bg-white/10 active:scale-95 transition-all flex items-center justify-center gap-3 group"
                >
                  <span className="material-symbols-outlined text-2xl text-slate-600 group-hover:scale-110 transition-transform">cancel</span>
                  END NOW
                </button>
                <button 
                  onClick={onCheckIn}
                  className="w-full bg-white/5 text-slate-600 py-4 rounded-none text-xl font-black border border-white/10 hover:bg-white/10 active:scale-95 transition-all flex items-center justify-center gap-3 group"
                >
                  <span className="material-symbols-outlined text-2xl text-slate-600 group-hover:scale-110 transition-transform">verified_user</span>
                  CHECK IN
                </button>
              </>
            ) : (
              <button 
                onClick={() => onBook()}
                className="w-full bg-white/95 backdrop-blur-xl text-black py-5 rounded-none text-2xl font-black shadow-[0_20px_40px_rgba(255,255,255,0.1)] hover:bg-white active:scale-95 transition-all flex items-center justify-center gap-4 border border-white/40"
              >
                <span className="material-symbols-outlined text-3xl">add_circle</span>
                BOOK
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Quick Booking trigger if available */}
      {roomStatus.isAvailable && (
        <button 
          onClick={() => onBook()}
          className="w-full max-w-xl bg-white/95 backdrop-blur-xl text-black border border-white/40 rounded-none p-6 lg:p-8 flex items-center justify-between hover:bg-white active:scale-[0.98] transition-all group shadow-2xl shrink-0"
        >
          <div className="flex flex-col items-start">
            <p className="text-[9px] font-black uppercase tracking-[0.3em] opacity-60">ROOM IS FREE</p>
            <p className="text-xl lg:text-2xl font-black tracking-tighter">QUICK RESERVE 30 MINS</p>
          </div>
          <div className="size-14 rounded-none bg-black/10 border border-black/20 text-black flex items-center justify-center shadow-xl group-hover:rotate-90 transition-transform duration-700">
            <span className="material-symbols-outlined text-3xl">add</span>
          </div>
        </button>
      )}

      {/* Upcoming Panel at the Bottom */}
      <div className="w-full max-w-xl flex flex-col gap-6 mb-10 shrink-0">
        <div className="space-y-3">
          <div className="flex flex-col gap-3">
            {upcomingMeetings.length > 0 ? (
              upcomingMeetings.slice(0, 1).map((meeting) => (
                <button 
                  key={meeting.id} 
                  onClick={() => onBook(undefined, meeting.id)}
                  className="w-full bg-[#111] border border-white/5 rounded-none p-6 flex items-center justify-between group transition-all hover:bg-white/[0.03] text-left shadow-xl"
                >
                  <div className="flex items-center gap-6">
                    <div className="size-16 rounded-none bg-slate-800/60 flex items-center justify-center text-slate-100 group-hover:scale-105 transition-transform border border-white/5">
                      <span className="material-symbols-outlined text-3xl font-variation-fill">calendar_today</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-slate-600 text-[9px] font-black uppercase tracking-[0.4em] mb-1">UP NEXT</span>
                      <p className="text-slate-600 text-sm lg:text-base font-black tracking-tight leading-tight group-hover:text-primary transition-colors">{meeting.title}</p>
                      <p className="text-slate-600 text-xs font-bold mt-1">
                        {meeting.startTime} • {meeting.organizer}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col items-center justify-center shrink-0 pr-1">
                    <span className="text-primary text-[10px] font-black uppercase leading-none mb-0.5">IN</span>
                    <span className="text-primary text-xl lg:text-2xl font-black leading-none">30M</span>
                  </div>
                </button>
              ))
            ) : (
              <div className="bg-[#111] border border-white/5 rounded-none p-6 text-center text-slate-100 font-bold uppercase tracking-widest text-xs">
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