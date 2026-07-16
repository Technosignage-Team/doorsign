import React, { useState, useEffect } from 'react';
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
  enableAtmosphericBg?: boolean;
}

const SplitScreenLayout: React.FC<LayoutProps> = ({ currentTime, roomStatus, onBook, onShowMeetingDetails, onCheckIn, onExtend, onEndNow, onShowDetails, slotPrecision, enableAtmosphericBg = true }) => {
  const formattedTime = currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  const formattedDate = currentTime.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' });

  const [isPortrait, setIsPortrait] = useState(window.innerHeight > window.innerWidth);

  useEffect(() => {
    const handleResize = () => setIsPortrait(window.innerHeight > window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isUpNextSoon = roomStatus.isUpNextSoon ?? false;
  const upcomingMeetings = roomStatus.nextMeeting ? [roomStatus.nextMeeting] : [];

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
      className="flex flex-col h-screen w-full bg-[#050505] overflow-hidden text-white font-display relative"
    >
      {isPortrait && (
        <div className="w-full h-28 bg-black flex items-center justify-between px-6 shrink-0 border-b border-white/5 z-30">
          <div className="flex flex-col text-left">
            <span className="text-slate-600 text-[34px] sm:text-[42px] font-black tracking-tight leading-none mb-1.5">
              {formattedTime}
            </span>
            <span className="text-slate-600 text-xs sm:text-sm font-black uppercase tracking-[0.2em] leading-none">
              {formattedDate}
            </span>
          </div>
          <button 
            onClick={onShowDetails}
            className="size-14 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white hover:bg-white/10 active:scale-95 transition-all"
          >
            <span className="material-symbols-outlined text-2xl">menu</span>
          </button>
        </div>
      )}

      <div className={`flex flex-1 ${isPortrait ? 'flex-col' : 'flex-row'} w-full overflow-hidden relative`}>
        {/* Left/Top: Room Branding & Status */}
        <div className={`relative ${isPortrait ? 'w-full h-[30vh] border-b' : 'w-[42%] h-full border-r'} shrink-0 overflow-hidden border-white/5`}>
          <div 
            className="absolute inset-0 bg-cover bg-center transition-transform duration-[20s] hover:scale-105"
            style={{ backgroundImage: roomStatus.imageUrl ? `url("${roomStatus.imageUrl}")` : 'url("https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&q=80&w=1200")' }}
          />
          {enableAtmosphericBg !== false && (
            <div className={`absolute inset-0 transition-colors duration-1000 ${
              roomStatus.isAvailable 
                ? 'bg-emerald-500/60' 
                : 'bg-rose-500/60'
            }`} />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
          
          <button
            onClick={onShowDetails}
            className={`absolute ${isPortrait ? 'top-6 left-6 text-left' : 'bottom-16 left-12 right-12 text-left'} group cursor-pointer focus:outline-none flex flex-col items-start`}
          >
            <h1 className={`text-white font-black tracking-tight drop-shadow-2xl uppercase text-left group-hover:text-primary transition-colors ${
              isPortrait 
                ? 'text-3xl sm:text-4xl max-w-[285px] leading-[1.1] pb-1' 
                : 'text-3xl lg:text-4xl xl:text-5xl max-w-[280px] lg:max-w-[320px] xl:max-w-[360px] leading-[1.25] pb-4 pt-1'
            }`}>
              {roomStatus.name}
            </h1>
            <span className="text-slate-400 text-[10px] font-black uppercase tracking-widest mt-2 opacity-75 group-hover:opacity-100 group-hover:text-primary transition-all">
              (Click for Details)
            </span>
          </button>
        </div>

        {/* Right/Bottom: Dashboard View */}
        <div className={`relative flex-1 ${isPortrait ? 'p-6 pb-12 flex flex-col h-full' : 'p-6 lg:p-6 xl:p-10 flex flex-col h-full'} bg-[#080808] overflow-y-auto custom-scrollbar`}>
          {isPortrait ? (
            <div className="flex flex-col justify-between w-full h-full flex-1 text-left items-start">
              {/* Top/Middle Area - Title */}
              <div className="flex flex-col gap-5 lg:gap-6 w-full">
                {/* Status or Meeting Title */}
                {roomStatus.isAvailable ? (
                  <div className="flex flex-col gap-6 items-center text-center py-4 w-full animate-fade-in">
                    {!isUpNextSoon && (
                      <>
                        <h3 className="text-emerald-500 font-black leading-[1.05] tracking-tight text-[52px] sm:text-[72px]">
                          Available
                        </h3>
                        <div className="flex flex-col sm:flex-row items-center gap-4 w-full justify-center px-4">
                          <button 
                            onClick={handleBookNow}
                            className="w-full sm:w-auto bg-emerald-500 text-white px-10 py-5 rounded-full text-xl font-black shadow-[0_20px_40px_rgba(16,185,129,0.3)] hover:bg-emerald-600 active:scale-95 transition-all flex items-center justify-center gap-4 border border-emerald-500/30 cursor-pointer"
                          >
                            <span className="material-symbols-outlined text-3xl font-bold">add_circle</span>
                            Book
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col gap-2 py-1 w-full text-center">
                    <h3 
                      className="text-white font-black leading-tight tracking-tight w-full cursor-pointer hover:text-primary transition-colors text-3xl sm:text-4xl lg:text-[44px] xl:text-[50px] text-center line-clamp-2"
                      onClick={() => onShowMeetingDetails(roomStatus.currentMeeting?.id || '')}
                    >
                      {roomStatus.currentMeeting?.title}
                    </h3>
                  </div>
                )}
              </div>

              {/* Bottom Area - Current Meeting Card & Action Buttons placed directly above Up Next */}
              <div className="mt-auto pt-6 flex flex-col gap-5 w-full">
                {!roomStatus.isAvailable && (
                  <div className="flex flex-col gap-4 w-full">
                    {/* Time & Organizer Card */}
                    <div 
                      onClick={() => onShowMeetingDetails(roomStatus.currentMeeting?.id || '')}
                      className="w-full bg-white/[0.03] border border-white/10 rounded-2xl p-4 sm:p-5 relative overflow-hidden group cursor-pointer hover:bg-white/[0.06] hover:border-white/20 transition-all shadow-2xl flex flex-col items-center justify-center animate-fade-in"
                    >
                      <div className="absolute left-0 right-0 bottom-0 h-2 bg-status-busy shadow-[0_0_20px_rgba(239,68,68,0.4)]"></div>
                      <div className="flex flex-col items-center justify-center text-center gap-1.5 w-full">
                        <p className="text-white text-xl sm:text-2xl lg:text-3xl font-black tracking-tight leading-none group-hover:text-primary transition-colors">
                          {roomStatus.currentMeeting?.startTime} - {roomStatus.currentMeeting?.endTime}
                        </p>
                        <div className="flex items-center gap-1.5">
                          <span className="text-slate-500 text-[10px] sm:text-xs font-black uppercase tracking-[0.25em] leading-none select-none">
                            Host:
                          </span>
                          <p className="text-slate-400 text-sm sm:text-base font-black tracking-tight leading-none group-hover:text-primary transition-colors">
                            {roomStatus.currentMeeting?.organizer || 'System'}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-3 w-full">
                      <button onClick={() => roomStatus.currentMeeting && onExtend(roomStatus.currentMeeting.id)} className="flex-1 bg-white/5 text-slate-600 py-4 rounded-xl text-sm lg:text-base font-black border border-white/10 hover:bg-white/10 transition-all flex items-center justify-center gap-3 active:scale-95">
                        <span className="material-symbols-outlined text-xl text-slate-600">more_time</span> Extend
                      </button>
                      <button onClick={() => roomStatus.currentMeeting && onEndNow(roomStatus.currentMeeting.id)} className="flex-1 bg-white/5 text-slate-600 py-4 rounded-xl text-sm lg:text-base font-black border border-white/10 hover:bg-white/10 transition-all flex items-center justify-center gap-3 active:scale-95">
                        <span className="material-symbols-outlined text-xl text-slate-600">logout</span> End Now
                      </button>
                      <button onClick={onCheckIn} className="flex-1 bg-white/5 text-slate-600 py-4 rounded-xl text-sm lg:text-base font-black border border-white/10 hover:bg-white/10 transition-all flex items-center justify-center gap-3 active:scale-95">
                        <span className="material-symbols-outlined text-xl text-slate-600">verified_user</span> Check In/Out
                      </button>
                    </div>
                  </div>
                )}

                {/* Up Next Card */}
                <div className="w-full">
                  <div className="bg-[#0c0c0c] border border-white/10 rounded-2xl p-6 sm:p-8 lg:p-10 shadow-2xl hover:border-white/20 transition-all group overflow-hidden relative w-full">
                    <div className="absolute top-0 right-0 size-48 bg-primary/5 blur-[50px] rounded-2xl pointer-events-none translate-x-12 -translate-y-12" />
                    
                    {upcomingMeetings.length > 0 ? (
                      upcomingMeetings.slice(0, 1).map((meeting) => {
                        const mStart = parseToDate(meeting.startTime);
                        const diffMs = mStart.getTime() - currentTime.getTime();
                        const diffMins = Math.max(0, Math.floor(diffMs / 60000));
                        const isStartingSoon = diffMins < 15;

                        return (
                          <button 
                            key={meeting.id} 
                            onClick={() => onShowMeetingDetails(meeting.id)}
                            className="w-full flex flex-col text-left gap-4"
                          >
                            <div className="w-full">
                              <span className={`${isStartingSoon ? 'text-yellow-500' : 'text-slate-500'} text-[11px] font-black uppercase tracking-[0.5em] leading-none block mb-2`}>
                                UP NEXT
                              </span>
                              <h4 className={`text-xl sm:text-2xl lg:text-3xl font-black tracking-tight leading-tight line-clamp-2 break-words transition-colors ${
                                isStartingSoon 
                                  ? 'text-yellow-500 group-hover:text-yellow-400' 
                                  : 'text-slate-400 group-hover:text-slate-300'
                              }`}>
                                {meeting.title}
                              </h4>
                            </div>

                            <div className="w-full h-px bg-white/10" />

                            <div className="flex items-center justify-between w-full">
                              <div className="flex flex-col gap-1.5 min-w-0 pr-4">
                                <div className="flex items-center gap-2 text-slate-500 font-bold text-[11px] lg:text-xs uppercase tracking-[0.15em] opacity-95 whitespace-nowrap">
                                  <span className="material-symbols-outlined text-base font-variation-fill text-slate-500">schedule</span>
                                  <span className="text-slate-400">{meeting.startTime}</span>
                                </div>
                                <div className="flex items-center gap-2 text-slate-500 font-bold text-[11px] lg:text-xs uppercase tracking-[0.15em] opacity-95">
                                  <span className="material-symbols-outlined text-base font-variation-fill text-slate-500">person</span>
                                  <span className="truncate max-w-[150px] sm:max-w-[200px] text-slate-400">{meeting.organizer}</span>
                                </div>
                              </div>

                              {isStartingSoon && (
                                <div className="flex flex-col items-end shrink-0 animate-pulse text-yellow-500 select-none">
                                  <span className="text-[10px] font-black uppercase tracking-[0.2em] leading-none mb-1 text-right opacity-90">
                                    STARTING IN
                                  </span>
                                  <div className="flex items-baseline gap-1">
                                    <span className="text-3xl sm:text-4xl font-black leading-none">{diffMins}</span>
                                    <span className="text-[12px] font-black uppercase tracking-widest font-display">MIN</span>
                                  </div>
                                </div>
                              )}
                            </div>
                          </button>
                        );
                      })
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
          ) : (
            <div className="flex flex-col w-full h-full justify-start gap-5 lg:gap-6 xl:gap-8 flex-1">
              {/* Top Section: Clock and Date */}
              <div className="flex flex-col gap-1 select-none shrink-0">
                <h2 className="text-5xl lg:text-6xl xl:text-7xl font-black leading-none tracking-tight text-slate-400">
                  {formattedTime}
                </h2>
                <p className="text-slate-500 text-xs lg:text-sm xl:text-base font-black uppercase tracking-[0.3em] mt-1">
                  {formattedDate}
                </p>
              </div>

                {/* Middle Section: Status or Meeting Title (Vertically Centered) */}
                {roomStatus.isAvailable ? (
                  <div className="flex-1 flex flex-col items-center justify-center gap-6 py-4 w-full animate-fade-in">
                    {!isUpNextSoon && (
                      <>
                        <h3 className="text-emerald-500 font-black leading-[1.125] tracking-tight text-[48px] lg:text-[72px] xl:text-[84px]">
                          Available
                        </h3>
                        <button 
                          onClick={handleBookNow}
                          className="bg-emerald-500 text-white px-10 py-5 rounded-full text-xl font-black shadow-[0_20px_40px_rgba(16,185,129,0.3)] hover:bg-emerald-600 active:scale-95 transition-all flex items-center gap-4 border border-emerald-500/30 cursor-pointer shrink-0"
                        >
                          <span className="material-symbols-outlined text-3xl font-bold">add_circle</span>
                          Book
                        </button>
                      </>
                    )}
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col justify-center py-2 w-full animate-fade-in overflow-hidden">
                    {/* Meeting Title (Wraps beautifully to a second line, vertically centered) */}
                    <h3 
                      className="text-white font-[900] leading-[1.35] tracking-tight w-full cursor-pointer hover:text-primary transition-colors text-3xl sm:text-4xl lg:text-[42px] xl:text-[44px] text-left pb-2"
                      onClick={() => onShowMeetingDetails(roomStatus.currentMeeting?.id || '')}
                    >
                      {roomStatus.currentMeeting?.title}
                    </h3>
                  </div>
                )}

              {/* Bottom Area - Time panel, Buttons, and Up Next nested directly under the flow container */}
              <div className="mt-0 flex flex-col gap-4 w-full shrink-0">
                {!roomStatus.isAvailable && (
                  <div className="flex flex-col gap-4 w-full">
                    {/* Time & Organizer Card - Made bigger as requested */}
                    <div 
                      onClick={() => onShowMeetingDetails(roomStatus.currentMeeting?.id || '')}
                      className="w-full bg-white/[0.03] border border-white/10 rounded-2xl p-5 lg:p-6 lg:pl-10 xl:p-8 xl:pl-12 relative overflow-hidden group cursor-pointer hover:bg-white/[0.06] hover:border-white/20 transition-all shadow-2xl flex flex-col items-start justify-center"
                    >
                      <div className="absolute left-0 top-0 bottom-0 w-3 bg-status-busy shadow-[0_0_20px_rgba(239,68,68,0.4)]"></div>
                      <div className="flex flex-col items-start justify-center text-left gap-1.5 w-full">
                        <p className="text-white text-2xl lg:text-3xl xl:text-4xl font-black tracking-tight leading-none group-hover:text-primary transition-colors pb-1">
                          {roomStatus.currentMeeting?.startTime} - {roomStatus.currentMeeting?.endTime}
                        </p>
                        <div className="flex items-center gap-2 text-left">
                          <span className="text-slate-500 text-xs lg:text-sm font-black uppercase tracking-[0.25em] leading-none select-none">
                            Host:
                          </span>
                          <p className="text-slate-300 text-base lg:text-lg xl:text-xl font-black tracking-tight leading-none group-hover:text-primary transition-colors">
                            {roomStatus.currentMeeting?.organizer || 'System'}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Action buttons (Full width with stylish gray text and gray borders) */}
                    <div className="flex items-center gap-3 w-full">
                      <button 
                        onClick={() => roomStatus.currentMeeting && onExtend(roomStatus.currentMeeting.id)} 
                        className="flex-1 bg-transparent text-slate-400 py-4 lg:py-5 rounded-2xl text-base lg:text-lg font-black border border-slate-600 hover:text-white hover:bg-white/5 hover:border-slate-400 transition-all flex items-center justify-center gap-3 active:scale-95 cursor-pointer animate-fade-in"
                      >
                        <span className="material-symbols-outlined text-2xl text-slate-400">more_time</span> Extend
                      </button>
                      <button 
                        onClick={() => roomStatus.currentMeeting && onEndNow(roomStatus.currentMeeting.id)} 
                        className="flex-1 bg-transparent text-slate-400 py-4 lg:py-5 rounded-2xl text-base lg:text-lg font-black border border-slate-600 hover:text-white hover:bg-white/5 hover:border-slate-400 transition-all flex items-center justify-center gap-3 active:scale-95 cursor-pointer animate-fade-in"
                      >
                        <span className="material-symbols-outlined text-2xl text-slate-400">logout</span> End Now
                      </button>
                      <button 
                        onClick={onCheckIn} 
                        className="flex-1 bg-transparent text-slate-400 py-4 lg:py-5 rounded-2xl text-base lg:text-lg font-black border border-slate-600 hover:text-white hover:bg-white/5 hover:border-slate-400 transition-all flex items-center justify-center gap-3 active:scale-95 cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-2xl text-slate-400">verified_user</span> Check In/Out
                      </button>
                    </div>
                  </div>
                )}

                {/* Up Next Card (Full width under landscape layout container, styled as requested with reduced font sizes & height) */}
                <div className="w-full">
                  <div className="bg-[#0c0c0c] border border-white/10 rounded-2xl p-4 lg:p-5 xl:p-6 shadow-2xl hover:border-white/20 transition-all group overflow-hidden relative w-full">
                    <div className="absolute top-0 right-0 size-32 bg-primary/5 blur-[40px] rounded-2xl pointer-events-none translate-x-8 -translate-y-8" />
                    
                    {upcomingMeetings.length > 0 ? (
                      upcomingMeetings.slice(0, 1).map((meeting) => {
                        const mStart = parseToDate(meeting.startTime);
                        const diffMs = mStart.getTime() - currentTime.getTime();
                        const diffMins = Math.max(0, Math.floor(diffMs / 60000));
                        const isStartingSoon = diffMins < 15;

                        return (
                          <button 
                            key={meeting.id} 
                            onClick={() => onShowMeetingDetails(meeting.id)}
                            className="w-full flex flex-col text-left gap-3.5"
                          >
                            <div className="w-full">
                              <span className={`${isStartingSoon ? 'text-yellow-500' : 'text-slate-500'} text-[10px] lg:text-xs xl:text-sm font-black uppercase tracking-[0.5em] leading-none block mb-1.5`}>
                                UP NEXT
                              </span>
                              <h4 className={`text-lg lg:text-xl xl:text-2xl font-[900] tracking-tight leading-[1.2] line-clamp-2 break-words transition-colors pb-0.5 ${
                                isStartingSoon 
                                  ? 'text-yellow-500 group-hover:text-yellow-400' 
                                  : 'text-slate-400 group-hover:text-slate-300'
                              }`}>
                                {meeting.title}
                              </h4>
                            </div>

                            <div className="w-full h-px bg-white/10 my-0.5" />

                            <div className="flex items-center justify-between w-full">
                              <div className="flex flex-col gap-1.5 min-w-0 pr-4">
                                <div className="flex items-center gap-2.5 text-slate-500 font-extrabold text-xs lg:text-sm xl:text-base uppercase tracking-[0.15em] opacity-95 whitespace-nowrap">
                                  <span className="material-symbols-outlined text-base lg:text-lg font-variation-fill text-slate-500">schedule</span>
                                  <span className="text-slate-400">{meeting.startTime}</span>
                                </div>
                                <div className="flex items-center gap-2.5 text-slate-500 font-extrabold text-xs lg:text-sm xl:text-base uppercase tracking-[0.15em] opacity-95">
                                  <span className="material-symbols-outlined text-base lg:text-lg font-variation-fill text-slate-500">person</span>
                                  <span className="truncate max-w-[200px] sm:max-w-[300px] text-slate-400">{meeting.organizer}</span>
                                </div>
                              </div>

                              {isStartingSoon && (
                                <div className="flex flex-col items-end shrink-0 animate-pulse text-yellow-500 select-none">
                                  <span className="text-[10px] lg:text-xs font-black uppercase tracking-[0.2em] leading-none mb-0.5 text-right opacity-90">
                                    STARTING IN
                                  </span>
                                  <div className="flex items-baseline gap-1">
                                    <span className="text-2xl lg:text-3xl xl:text-4xl font-black leading-none">{diffMins}</span>
                                    <span className="text-[10px] lg:text-xs font-black uppercase tracking-widest font-display">MIN</span>
                                  </div>
                                </div>
                              )}
                            </div>
                          </button>
                        );
                      })
                    ) : (
                      <div className="flex-1 flex items-center justify-center gap-4 text-slate-400 font-black uppercase tracking-[0.4em] text-xs lg:text-sm xl:text-base py-6">
                        <span className="material-symbols-outlined text-2xl text-slate-400">event_busy</span>
                        No further events today
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SplitScreenLayout;
