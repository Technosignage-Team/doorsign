import React from 'react';
import { RoomStatus } from '../../types';
import { db } from '../../lib/db';

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

const DefaultLayout: React.FC<LayoutProps> = ({ currentTime, roomStatus, isSyncing, onBook, onExtend, onEndNow, onShowDetails, onCheckIn, slotPrecision }) => {
  const formattedTime = currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const formattedDate = currentTime.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' });

  return (
    <div className="flex flex-col h-full overflow-hidden pb-24 md:pb-8">
      <div className="flex items-center p-6 lg:p-10 pb-4 justify-between border-b border-white/5 shrink-0">
        <div className="flex items-center gap-4">
          <div className="bg-primary/10 p-2.5 rounded-none border border-primary/20 relative">
            <span className="material-symbols-outlined text-primary text-4xl font-variation-fill">meeting_room</span>
            <div className={`absolute -top-1 -right-1 size-3 rounded-none border-2 border-background-dark transition-colors duration-500 ${isSyncing ? 'bg-primary animate-ping' : 'bg-emerald-500'}`}></div>
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-4">
              <h1 className="text-2xl lg:text-3xl font-black tracking-tight text-white">Everest</h1>
              <button 
                onClick={onShowDetails} 
                className="size-12 shrink-0 rounded-none bg-[#0a192f] text-primary/70 shadow-[0_10px_30px_rgba(10,25,47,0.4)] flex items-center justify-center border border-white/5 hover:scale-105 active:scale-95 transition-all group"
              >
                <span className="material-symbols-outlined text-2xl font-variation-fill group-hover:scale-110 transition-transform">info</span>
              </button>
              <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-none border ${isSyncing ? 'text-primary border-primary/30' : 'text-slate-300 border-white/10'} uppercase tracking-widest`}>
                {isSyncing ? 'Syncing...' : 'Live'}
              </span>
            </div>
            <p className="text-[10px] font-black text-primary uppercase tracking-[0.4em] opacity-80">Room Management</p>
          </div>
        </div>
        <div className="flex flex-col items-end">
          <p className="text-xl lg:text-2xl font-black tracking-tighter text-slate-500">{formattedTime}</p>
          <p className="text-sm lg:text-base text-slate-500 font-bold uppercase tracking-widest">{formattedDate}</p>
        </div>
      </div>

      <div className="flex flex-col md:flex-row flex-1 p-4 lg:p-8 gap-6 overflow-hidden">
        <div className="flex-1 flex flex-col gap-6 overflow-y-auto custom-scrollbar pr-2">
          <div className={`flex w-full overflow-hidden rounded-none border-2 p-4 lg:p-6 items-center justify-between transition-all duration-500 shrink-0 ${
            roomStatus.isAvailable ? 'bg-status-available/50 border-status-available' : 'bg-status-busy/50 border-status-busy'
          }`}>
            <div className="flex items-center gap-6">
              <div className="flex flex-col">
                <span className={`${roomStatus.isAvailable ? 'text-status-available' : 'text-status-busy'} text-[9px] font-black tracking-[0.3em] uppercase mb-0.5 opacity-80`}>Room Status</span>
                <h2 className={`text-3xl lg:text-4xl font-black tracking-tighter ${roomStatus.isAvailable ? 'text-status-available' : 'text-status-busy'}`}>
                  {roomStatus.isAvailable ? 'AVAILABLE' : 'IN USE'}
                </h2>
              </div>
              <div className="hidden lg:block w-px h-10 bg-white/10 mx-2" />
              <div className="flex items-center gap-4">
                <p className="text-slate-200 font-bold text-sm lg:text-lg truncate max-w-[300px]">{roomStatus.location}</p>
              </div>
            </div>
            <div className={`${roomStatus.isAvailable ? 'bg-status-available' : 'bg-status-busy shadow-[0_0_20px_rgba(239,68,68,0.4)]'} p-3.5 lg:p-4 rounded-none`}>
              <span className="material-symbols-outlined text-white text-2xl lg:text-3xl font-variation-fill">
                {roomStatus.isAvailable ? 'check_circle' : 'sensors'}
              </span>
            </div>
          </div>

          <div className="flex flex-col rounded-none shadow-2xl bg-card-dark border border-white/5 overflow-hidden flex-1 min-h-[500px]">
            <div className="w-full bg-center bg-no-repeat aspect-video md:aspect-auto md:flex-[1.1] bg-cover relative group" style={{ backgroundImage: 'url("https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&q=80&w=1200")' }}>
              <div className="absolute inset-0 bg-gradient-to-t from-background-dark via-transparent to-transparent opacity-90" />
              {!roomStatus.isAvailable && (
                <div className="absolute top-8 left-8">
                  <div className="bg-status-busy px-6 py-2.5 rounded-none text-xs font-black uppercase tracking-[0.2em] text-white shadow-[0_0_25px_rgba(239,68,68,0.6)] flex items-center gap-2 border border-white/20">
                    <span className="w-2 h-2 rounded-none bg-white animate-pulse"></span>
                    Running Now
                  </div>
                </div>
              )}
            </div>
            
            <div className="p-8 lg:p-12 flex flex-col justify-between flex-1 gap-8">
              <div className="space-y-6">
                <div>
                  <p className="text-slate-300 text-[10px] font-black tracking-[0.4em] uppercase mb-4 opacity-50">Current Meeting</p>
                  <h3 className="text-4xl lg:text-5xl font-black leading-[1.1] tracking-tight text-white max-w-3xl cursor-pointer hover:text-primary transition-colors" onClick={() => !roomStatus.isAvailable && roomStatus.currentMeeting && onBook(undefined, roomStatus.currentMeeting.id)}>
                    {roomStatus.currentMeeting?.title || 'No Ongoing Meeting'}
                  </h3>
                </div>
                <div className="flex flex-wrap items-center gap-x-12 gap-y-6">
                  <div className="flex items-center gap-4 text-slate-200">
                    <span className={`material-symbols-outlined text-3xl ${roomStatus.isAvailable ? 'text-slate-300' : 'text-status-busy'}`}>schedule</span>
                    <p className="text-2xl lg:text-3xl font-black">{roomStatus.currentMeeting ? `${roomStatus.currentMeeting.startTime} - ${roomStatus.currentMeeting.endTime}` : '-- : --'}</p>
                  </div>
                  <div className="flex items-center gap-4 text-slate-200">
                    <span className="material-symbols-outlined text-slate-400 text-3xl">person</span>
                    <p className="text-xl lg:text-2xl font-medium">By <span className="text-white font-bold">{roomStatus.currentMeeting?.organizer || 'System'}</span></p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-6 pt-8 border-t border-white/5">
                <div className="flex flex-row gap-5">
                  {!roomStatus.isAvailable && roomStatus.currentMeeting ? (
                    <>
                      <button 
                        onClick={() => onExtend(roomStatus.currentMeeting!.id)} 
                        className="flex-1 flex items-center justify-center rounded-none h-20 bg-white/5 text-slate-500 text-lg font-black border border-white/10 hover:bg-white/10 active:scale-95 transition-all"
                      >
                        <span className="material-symbols-outlined mr-4 text-3xl text-slate-500">more_time</span>
                        Extend
                      </button>
                      <button 
                        onClick={() => onEndNow(roomStatus.currentMeeting!.id)} 
                        className="flex-1 flex items-center justify-center rounded-none h-20 bg-white/5 text-slate-500 text-lg font-black border border-white/10 hover:bg-white/10 active:scale-95 transition-all"
                      >
                        <span className="material-symbols-outlined mr-4 text-3xl text-slate-500">logout</span>
                        End Now
                      </button>
                      <button 
                        onClick={onCheckIn} 
                        className="flex-1 flex items-center justify-center rounded-none h-20 bg-white/5 text-slate-500 text-lg font-black border border-white/10 hover:bg-white/10 active:scale-95 transition-all"
                      >
                        <span className="material-symbols-outlined mr-4 text-3xl text-slate-500">verified_user</span>
                        Check In
                      </button>
                    </>
                  ) : (
                    <button 
                      onClick={() => onBook()} 
                      className="w-full flex items-center justify-center rounded-none h-20 bg-green-600 text-slate-200 text-lg font-black shadow-[0_15px_40px_rgba(22,163,74,0.5)] hover:brightness-110 active:scale-95 transition-all border-t border-white/20"
                    >
                      <span className="material-symbols-outlined mr-4 text-3xl text-status-available">add_box</span>
                      Book Now
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Up Next Section at the Bottom */}
      {roomStatus.nextMeeting && (
        <div className="px-4 lg:px-8 pb-4 shrink-0">
          <button 
            onClick={() => onBook(undefined, roomStatus.nextMeeting?.id)} 
            className="w-full flex items-center justify-between p-4 lg:p-6 rounded-none bg-white/[0.03] border border-white/10 group hover:bg-white/[0.05] transition-all text-left shadow-xl"
          >
            <div className="flex items-center gap-6">
              <div className="size-14 lg:size-16 rounded-none bg-slate-800 flex items-center justify-center text-slate-300 group-hover:scale-105 transition-transform border border-white/5">
                <span className="material-symbols-outlined text-3xl font-variation-fill">calendar_today</span>
              </div>
              <div className="flex flex-col">
                <span className="text-slate-500 text-[9px] font-black uppercase tracking-[0.4em] mb-1">UP NEXT</span>
                <p className="text-slate-500 font-black text-sm lg:text-base tracking-tight leading-none">{roomStatus.nextMeeting.title}</p>
                <p className="text-slate-500 font-bold text-[10px] mt-1">{roomStatus.nextMeeting.startTime} • {roomStatus.nextMeeting.organizer}</p>
              </div>
            </div>
            <div className="flex items-center gap-4 pr-4">
              <span className="text-primary text-[10px] font-black uppercase tracking-widest">View Details</span>
              <span className="material-symbols-outlined text-primary group-hover:translate-x-1 transition-transform">chevron_right</span>
            </div>
          </button>
        </div>
      )}
    </div>
  );
};

const ScheduleCardItem: React.FC<{ title: string; time: string; organizer: string; isNext?: boolean; isOngoing?: boolean }> = ({ title, time, organizer, isNext, isOngoing }) => (
  <div className={`flex items-center gap-4 p-5 rounded-none border text-left transition-all ${
    isOngoing ? 'bg-status-busy/10 border-status-busy/40' : 
    isNext ? 'bg-card-dark border-primary/40' : 
    'bg-transparent border-white/5 hover:bg-white/5'
  }`}>
    <div className={`size-12 rounded-none flex items-center justify-center shrink-0 ${
      isOngoing ? 'bg-status-busy text-white' : isNext ? 'bg-primary text-white' : 'bg-slate-800 text-slate-300'
    }`}>
      <span className="material-symbols-outlined text-2xl font-variation-fill">
        {isOngoing ? 'sensors' : isNext ? 'event_upcoming' : 'event'}
      </span>
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-white font-black text-base truncate mb-0.5 tracking-tight">{title}</p>
      <div className="flex items-center gap-2">
         <p className={`${isOngoing ? 'text-status-busy' : 'text-primary'} text-[9px] font-black uppercase tracking-wider truncate`}>{time}</p>
         <p className="text-slate-300 text-[9px] font-bold uppercase tracking-widest truncate">{organizer}</p>
      </div>
    </div>
  </div>
);

export default DefaultLayout;