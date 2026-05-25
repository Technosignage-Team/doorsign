import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'motion/react';
import { RoomStatus, Meeting } from '../../types';
import { db } from '../../lib/db';

interface ClockSlotsLayoutProps {
  currentTime: Date;
  roomStatus: RoomStatus;
  isSyncing: boolean;
  onBook: (startTime?: string, meetingId?: string) => void;
  onShowMeetingDetails: (meetingId: string) => void;
  onCheckIn: () => void;
  onExtend: (id: string) => void;
  onEndNow: (id: string) => void;
  onShowDetails: () => void;
  slotPrecision: 15 | 30;
  enableAtmosphericBg?: boolean;
}

interface ClockSlot {
  index: number;
  startAngle: number;
  endAngle: number;
  startTimeStr: string;
  endTimeStr: string;
  isOperating: boolean;
  meeting?: Meeting;
}

const ClockSlotsLayout: React.FC<ClockSlotsLayoutProps> = ({
  currentTime,
  roomStatus,
  isSyncing,
  onBook,
  onShowMeetingDetails,
  onCheckIn,
  onExtend,
  onEndNow,
  onShowDetails,
  slotPrecision,
  enableAtmosphericBg = true
}) => {
  const [selectedSlot, setSelectedSlot] = useState<ClockSlot | null>(null);
  const [hoveredSlot, setHoveredSlot] = useState<ClockSlot | null>(null);

  useEffect(() => {
    setSelectedSlot(null);
  }, [slotPrecision]);

  useEffect(() => {
    if (selectedSlot) {
      const timer = setTimeout(() => setSelectedSlot(null), 10000);
      return () => clearTimeout(timer);
    }
  }, [selectedSlot]);

  const todayStr = currentTime.toISOString().split('T')[0];
  const meetings = useMemo(() => db.getMeetings(todayStr), [todayStr, isSyncing]);

  const parseTimeToMins = (timeStr: string) => {
    const [time, modifier] = timeStr.split(' ');
    let [hours, minutes] = time.split(':').map(Number);
    if (modifier === 'PM' && hours < 12) hours += 12;
    if (modifier === 'AM' && hours === 12) hours = 0;
    return hours * 60 + minutes;
  };

  const nextMeeting = useMemo(() => {
    const currentMins = currentTime.getHours() * 60 + currentTime.getMinutes();
    const upcoming = meetings
      .filter(m => !m.isCancelled && parseTimeToMins(m.startTime) > currentMins)
      .sort((a, b) => parseTimeToMins(a.startTime) - parseTimeToMins(b.startTime));
    return upcoming[0] ?? null;
  }, [meetings, currentTime]);

  const clockSlots = useMemo((): ClockSlot[] => {
    const slots: ClockSlot[] = [];
    const numSlotsPerHour = 60 / slotPrecision;
    const totalSlots = 12 * numSlotsPerHour;
    const degreesPerSlot = 360 / totalSlots;
    const hoursMap = [12, 13, 14, 15, 16, 17, 18, 19, 8, 9, 10, 11];

    const parseToMins = (timeStr: string) => {
      const [time, modifier] = timeStr.split(' ');
      let [hours, minutes] = time.split(':').map(Number);
      if (modifier === 'PM' && hours < 12) hours += 12;
      if (modifier === 'AM' && hours === 12) hours = 0;
      return hours * 60 + minutes;
    };

    for (let hIndex = 0; hIndex < hoursMap.length; hIndex++) {
      const hour24 = hoursMap[hIndex];
      for (let sIndex = 0; sIndex < numSlotsPerHour; sIndex++) {
        const startMin = sIndex * slotPrecision;
        const endMin = startMin + slotPrecision;
        let endHour = hour24;
        let endMinNum = endMin;
        if (endMinNum === 60) { endHour = (hour24 + 1) % 24; endMinNum = 0; }

        const fmt = (h: number, m: number) => {
          const ampm = h >= 12 ? 'PM' : 'AM';
          const hr = h % 12 === 0 ? 12 : h % 12;
          return `${hr.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')} ${ampm}`;
        };

        const isOperating = hour24 >= 9 && hour24 < 18;
        const slotStartMins = hour24 * 60 + startMin;
        const matchingMeeting = meetings.find(m => {
          if (m.isCancelled) return false;
          const mStart = parseToMins(m.startTime);
          const mEnd = parseToMins(m.endTime);
          return slotStartMins >= mStart && slotStartMins < mEnd;
        });

        const globalIdx = hIndex * numSlotsPerHour + sIndex;
        slots.push({
          index: globalIdx,
          startAngle: globalIdx * degreesPerSlot,
          endAngle: (globalIdx + 1) * degreesPerSlot,
          startTimeStr: fmt(hour24, startMin),
          endTimeStr: fmt(endHour, endMinNum),
          isOperating,
          meeting: matchingMeeting,
        });
      }
    }
    return slots;
  }, [meetings, slotPrecision]);

  const renderSegments = useMemo(() => {
    const segments: Array<{
      type: 'meeting' | 'slot';
      slots: ClockSlot[];
      meeting?: Meeting;
      startAngle: number;
      endAngle: number;
      isOperating: boolean;
    }> = [];

    let currentMeetingId: string | undefined;
    let currentMeetingSlots: ClockSlot[] = [];

    for (const slot of clockSlots) {
      if (slot.isOperating && slot.meeting) {
        if (currentMeetingId === slot.meeting.id) {
          currentMeetingSlots.push(slot);
        } else {
          if (currentMeetingSlots.length > 0) {
            segments.push({
              type: 'meeting',
              slots: [...currentMeetingSlots],
              meeting: currentMeetingSlots[0].meeting,
              startAngle: currentMeetingSlots[0].startAngle,
              endAngle: currentMeetingSlots[currentMeetingSlots.length - 1].endAngle,
              isOperating: true,
            });
          }
          currentMeetingId = slot.meeting.id;
          currentMeetingSlots = [slot];
        }
      } else {
        if (currentMeetingSlots.length > 0) {
          segments.push({
            type: 'meeting',
            slots: [...currentMeetingSlots],
            meeting: currentMeetingSlots[0].meeting,
            startAngle: currentMeetingSlots[0].startAngle,
            endAngle: currentMeetingSlots[currentMeetingSlots.length - 1].endAngle,
            isOperating: true,
          });
          currentMeetingId = undefined;
          currentMeetingSlots = [];
        }
        segments.push({
          type: 'slot',
          slots: [slot],
          startAngle: slot.startAngle,
          endAngle: slot.endAngle,
          isOperating: slot.isOperating,
        });
      }
    }
    if (currentMeetingSlots.length > 0) {
      segments.push({
        type: 'meeting',
        slots: [...currentMeetingSlots],
        meeting: currentMeetingSlots[0].meeting,
        startAngle: currentMeetingSlots[0].startAngle,
        endAngle: currentMeetingSlots[currentMeetingSlots.length - 1].endAngle,
        isOperating: true,
      });
    }
    return segments;
  }, [clockSlots]);

  const polarToCartesian = (cx: number, cy: number, r: number, deg: number) => {
    const rad = (deg - 90) * Math.PI / 180;
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
  };

  const describeArcPath = (x: number, y: number, r: number, startAngle: number, endAngle: number) => {
    const start = polarToCartesian(x, y, r, endAngle);
    const end = polarToCartesian(x, y, r, startAngle);
    const large = endAngle - startAngle <= 180 ? '0' : '1';
    return `M ${start.x} ${start.y} A ${r} ${r} 0 ${large} 0 ${end.x} ${end.y}`;
  };

  const sAngle = currentTime.getSeconds() * 6;
  const mAngle = currentTime.getMinutes() * 6 + currentTime.getSeconds() * 0.1;
  const hAngle = (currentTime.getHours() % 12) * 30 + currentTime.getMinutes() * 0.5;

  const activeMeeting = roomStatus.currentMeeting;

  return (
    <div className="flex flex-col h-screen w-full bg-black text-white overflow-hidden relative font-sans select-none">
      <div className="absolute inset-0 bg-black z-0" />

      {enableAtmosphericBg && (
        <>
          <motion.div
            initial={false}
            animate={{ opacity: roomStatus.isAvailable ? 1 : 0 }}
            transition={{ duration: 1.2, ease: 'easeInOut' }}
            className="absolute inset-0 z-0 pointer-events-none"
            style={{ background: 'radial-gradient(circle at 50% 50%, rgba(16, 185, 129, 0.28) 0%, rgba(0, 0, 0, 0) 75%)' }}
          />
          <motion.div
            initial={false}
            animate={{ opacity: !roomStatus.isAvailable ? 1 : 0 }}
            transition={{ duration: 1.2, ease: 'easeInOut' }}
            className="absolute inset-0 z-0 pointer-events-none"
            style={{ background: 'radial-gradient(circle at 50% 50%, rgba(239, 68, 68, 0.28) 0%, rgba(0, 0, 0, 0) 75%)' }}
          />
          <motion.div
            animate={{ scale: [0.95, 1.05, 0.95], opacity: [0.4, 0.6, 0.4] }}
            transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute inset-0 z-0 pointer-events-none"
            style={{
              background: roomStatus.isAvailable
                ? 'radial-gradient(circle at 50% 50%, rgba(16, 185, 129, 0.12) 0%, rgba(0, 0, 0, 0) 65%)'
                : 'radial-gradient(circle at 50% 50%, rgba(239, 68, 68, 0.12) 0%, rgba(0, 0, 0, 0) 65%)',
            }}
          />
        </>
      )}

      {/* Header */}
      <header className="w-full flex justify-between items-center px-10 py-6 relative z-10">
        <div className="flex flex-col text-left">
          <p className="text-primary text-[10px] font-black uppercase tracking-[0.4em]">ROOM</p>
          <h1 className="text-3xl font-black tracking-tight text-white uppercase mt-1 leading-none">
            {roomStatus.name.split(' ').map((word, i) => (
              <span key={i} className="block">{word}</span>
            ))}
          </h1>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex flex-col items-end text-right select-none">
            <span className="text-slate-300 text-3xl sm:text-4xl font-black tracking-wide tabular-nums leading-none mb-1">
              {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}
            </span>
            <span className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] leading-none mt-1">
              {currentTime.toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' })}
            </span>
          </div>
          <button
            onClick={onShowDetails}
            className="size-14 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white hover:bg-white/10 active:scale-95 transition-all"
          >
            <span className="material-symbols-outlined text-2xl">menu</span>
          </button>
        </div>
      </header>

      {/* Main */}
      <div className="flex-1 w-full max-w-7xl mx-auto px-6 lg:px-12 flex flex-col lg:flex-row items-center justify-center gap-8 relative z-10 py-4 h-full overflow-hidden">
        <div className="flex-1 flex flex-col items-center justify-center relative min-h-0 -translate-y-10 lg:translate-y-0">

          {/* Clock dial */}
          <div className="relative flex items-center justify-center w-[96vw] h-[96vw] max-w-[528px] max-h-[528px] sm:size-[528px] lg:size-[475px] shrink-0">
            <div className="absolute rounded-full bg-black border border-white/5 shadow-[0_30px_90px_rgba(0,0,0,0.95)]" style={{ inset: '-10%' }} />

            {enableAtmosphericBg && (
              <motion.div
                animate={{ scale: [0.92, 1.18, 0.92], opacity: [0.8, 1.0, 0.8] }}
                transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
                className="absolute inset-[-65%] rounded-full blur-3xl pointer-events-none -z-10"
                style={{
                  background: roomStatus.isAvailable
                    ? 'radial-gradient(circle, rgba(0,0,0,0) 32%, rgba(16,185,129,0.8) 46%, rgba(16,185,129,0.2) 68%, rgba(0,0,0,0) 90%)'
                    : 'radial-gradient(circle, rgba(0,0,0,0) 32%, rgba(239,68,68,0.8) 46%, rgba(239,68,68,0.2) 68%, rgba(0,0,0,0) 90%)',
                }}
              />
            )}

            <svg className="absolute inset-0 size-full overflow-visible" viewBox="0 0 400 400">
              <g transform="translate(200, 200)">
                <circle cx="0" cy="0" r="220" fill="#000000" />
                <circle cx="0" cy="0" r="162" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="32" />
                <circle cx="0" cy="0" r="144" fill="none" stroke="rgba(0,0,0,0.3)" strokeWidth="2" />
                <circle cx="0" cy="0" r="180" fill="none" stroke="rgba(0,0,0,0.3)" strokeWidth="2" />

                {renderSegments.map((segment, sIdx) => {
                  let strokeColor = '#334155';
                  let hoverColor = '#475569';
                  let opacity = 0.5;
                  if (segment.isOperating) {
                    if (segment.type === 'meeting') { strokeColor = '#f43f5e'; hoverColor = '#ff4b72'; opacity = 0.95; }
                    else { strokeColor = '#10b981'; hoverColor = '#34d399'; opacity = 0.95; }
                  }
                  const first = segment.slots[0];
                  const isSel = selectedSlot?.index === first.index;
                  const isHov = hoveredSlot?.index === first.index;
                  return (
                    <path
                      key={sIdx}
                      d={describeArcPath(0, 0, 162,
                        segment.startAngle + (segment.type === 'meeting' ? 0.2 : 0.6),
                        segment.endAngle - (segment.type === 'meeting' ? 0.2 : 0.6)
                      )}
                      fill="none"
                      stroke={isSel ? '#3b82f6' : isHov ? hoverColor : strokeColor}
                      strokeWidth={isSel || isHov ? '32' : '26'}
                      strokeOpacity={opacity}
                      className="cursor-pointer transition-all duration-300"
                      onClick={() => setSelectedSlot(isSel ? null : first)}
                      onMouseEnter={() => setHoveredSlot(first)}
                      onMouseLeave={() => setHoveredSlot(null)}
                    />
                  );
                })}

                <g fill="#94a3b8" fontSize="20" fontWeight="900" textAnchor="middle" dominantBaseline="middle" className="pointer-events-none select-none">
                  <text x="0" y="-124">12</text>
                  <text x="124" y="0">3</text>
                  <text x="0" y="124">6</text>
                  <text x="-124" y="0">9</text>
                  {[30, 60, 120, 150, 210, 240, 300, 330].map(angle => {
                    const pos = polarToCartesian(0, 0, 124, angle);
                    return <circle key={angle} cx={pos.x} cy={pos.y} r="2.5" fill="rgba(255,255,255,0.25)" />;
                  })}
                </g>

                <g className="pointer-events-none drop-shadow-2xl">
                  <line x1="0" y1="0"
                    x2={65 * Math.sin(hAngle * Math.PI / 180)}
                    y2={-65 * Math.cos(hAngle * Math.PI / 180)}
                    stroke="#94a3b8" strokeWidth="7" strokeLinecap="round"
                    style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))' }}
                  />
                  <line x1="0" y1="0"
                    x2={98 * Math.sin(mAngle * Math.PI / 180)}
                    y2={-98 * Math.cos(mAngle * Math.PI / 180)}
                    stroke="#94a3b8" strokeWidth="5" strokeLinecap="round"
                    style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))' }}
                  />
                  <line x1="0" y1="0"
                    x2={118 * Math.sin(sAngle * Math.PI / 180)}
                    y2={-118 * Math.cos(sAngle * Math.PI / 180)}
                    stroke="#ef4444" strokeWidth="1.5" strokeLinecap="round"
                    style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))' }}
                  />
                  <circle cx="0" cy="0" r="6" fill="#000000" stroke="#94a3b8" strokeWidth="2" />
                  <circle cx="0" cy="0" r="2" fill="#ef4444" />
                </g>
              </g>
            </svg>
          </div>

          {/* Status + Actions below clock */}
          <div className="flex flex-col items-center text-center mt-12 sm:mt-16 lg:mt-6 select-none w-full max-w-4xl px-4 relative z-10">
            {roomStatus.isAvailable ? (
              nextMeeting ? (
                <div className="flex flex-col items-center w-full">
                  <span className="text-emerald-500 text-xs font-black uppercase tracking-[0.25em] flex items-center gap-1.5 justify-center mb-1">
                    <span className="size-2 rounded-full bg-emerald-500 animate-ping" />
                    Vacant — Up Next
                  </span>
                  <div className="flex flex-col landscape:flex-row items-center justify-center gap-y-1 landscape:gap-x-4 text-white w-full max-w-3xl">
                    <span className="text-slate-100 text-lg sm:text-2xl font-black tracking-wide leading-snug">{nextMeeting.title}</span>
                    <span className="portrait:hidden landscape:inline text-slate-600 text-base font-medium">|</span>
                    <span className="text-slate-300 text-sm sm:text-lg font-black tracking-wide">{nextMeeting.startTime} – {nextMeeting.endTime}</span>
                    <span className="portrait:hidden landscape:inline text-slate-600 text-base font-medium">|</span>
                    <span className="text-slate-400 text-xs sm:text-sm font-bold uppercase tracking-wider">Host: {nextMeeting.organizer}</span>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-1">
                  <span className="text-emerald-500 text-xs font-black uppercase tracking-[0.25em] flex items-center gap-1.5 justify-center">
                    <span className="size-2 rounded-full bg-emerald-500 animate-ping" />
                    Vacant &amp; Ready
                  </span>
                  <p className="text-slate-400 text-[11px] font-medium tracking-wide mt-1 max-w-[280px]">
                    No upcoming meetings today. Free for booking.
                  </p>
                </div>
              )
            ) : (
              activeMeeting && (
                <div className="flex flex-col items-center w-full">
                  <span className="text-rose-500 text-xs font-black uppercase tracking-[0.2em] mb-1">In Progress Now</span>
                  <div className="flex flex-col landscape:flex-row items-center justify-center gap-y-1 landscape:gap-x-4 text-white w-full max-w-3xl">
                    <span className="text-slate-100 text-lg sm:text-2xl font-black tracking-wide leading-snug">{activeMeeting.title}</span>
                    <span className="portrait:hidden landscape:inline text-slate-600 text-base font-medium">|</span>
                    <span className="text-slate-300 text-sm sm:text-lg font-black tracking-wide">{activeMeeting.startTime} – {activeMeeting.endTime}</span>
                    <span className="portrait:hidden landscape:inline text-slate-600 text-base font-medium">|</span>
                    <span className="text-slate-400 text-xs sm:text-sm font-bold uppercase tracking-wider">Host: {activeMeeting.organizer}</span>
                  </div>
                </div>
              )
            )}

            {/* Action buttons */}
            <div className="flex flex-wrap items-center justify-center gap-3 mt-4">
              {roomStatus.isAvailable ? (
                <button
                  type="button"
                  onClick={e => { e.stopPropagation(); onBook(); }}
                  className="flex items-center gap-2 px-8 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-full transition-all active:scale-95 shadow-lg shadow-emerald-500/20 text-xs font-black uppercase tracking-widest"
                >
                  <span className="material-symbols-outlined text-[18px]">add</span>
                  Book Room
                </button>
              ) : (
                <>
                  <button
                    disabled={!activeMeeting}
                    onClick={() => activeMeeting && onExtend(activeMeeting.id)}
                    className={`px-6 py-2.5 rounded-full text-xs font-black uppercase tracking-widest transition-all active:scale-95 ${
                      activeMeeting
                        ? 'bg-[#061429]/90 hover:bg-[#0c2447] text-slate-400 hover:text-slate-200'
                        : 'bg-slate-900/10 text-slate-600 cursor-not-allowed opacity-40 pointer-events-none'
                    }`}
                  >
                    Extend
                  </button>
                  <button
                    disabled={!activeMeeting}
                    onClick={() => activeMeeting && onEndNow(activeMeeting.id)}
                    className={`px-6 py-2.5 rounded-full text-xs font-black uppercase tracking-widest transition-all active:scale-95 ${
                      activeMeeting
                        ? 'bg-[#061429]/90 hover:bg-[#0c2447] text-slate-400 hover:text-slate-200'
                        : 'bg-slate-900/10 text-slate-600 cursor-not-allowed opacity-40 pointer-events-none'
                    }`}
                  >
                    End
                  </button>
                  <button
                    onClick={onCheckIn}
                    className="px-6 py-2.5 rounded-full text-xs font-black uppercase tracking-widest transition-all active:scale-95 bg-[#061429]/90 hover:bg-[#0c2447] text-slate-400 hover:text-slate-200"
                  >
                    Check In/Out
                  </button>
                  {activeMeeting && (
                    <button
                      onClick={() => onShowMeetingDetails(activeMeeting.id)}
                      className="px-6 py-2.5 rounded-full text-xs font-black uppercase tracking-widest transition-all active:scale-95 bg-[#061429]/90 hover:bg-[#0c2447] text-slate-400 hover:text-slate-200"
                    >
                      Details
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Slot detail HUD */}
      {(selectedSlot || hoveredSlot) && (() => {
        const active = selectedSlot || hoveredSlot;
        if (!active) return null;
        return (
          <div className="absolute bottom-6 left-6 right-6 lg:left-12 lg:right-12 max-w-5xl lg:mx-auto bg-[#071d3d]/95 border-2 border-blue-500/30 backdrop-blur-2xl p-4 sm:p-5 rounded-3xl z-30 animate-slide-up shadow-2xl shadow-blue-900/20">
            <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">

              {/* Left: title */}
              <div className="flex items-center text-left w-full md:w-auto">
                {active.meeting ? (
                  <div className="flex flex-col leading-tight">
                    <p className="text-[10px] sm:text-xs text-blue-400 font-black uppercase tracking-widest leading-none">Meeting Name</p>
                    <h3 className="text-white text-base sm:text-lg font-black tracking-wide mt-1.5 truncate max-w-[200px] sm:max-w-[340px]">
                      {active.meeting.title}
                    </h3>
                  </div>
                ) : (
                  <div className="flex flex-col leading-tight">
                    <p className="text-[10px] sm:text-xs text-emerald-400 font-black uppercase tracking-widest leading-none">Status</p>
                    <h3 className="text-white text-base sm:text-lg font-black tracking-wide mt-1.5">Vacant Space Available</h3>
                  </div>
                )}
              </div>

              {/* Right: time, host, action, close */}
              <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end shrink-0 ml-auto flex-wrap">
                <div className="flex flex-col text-right leading-tight pr-4 border-r border-white/10 shrink-0">
                  <span className="text-white text-sm sm:text-base font-black tracking-wide">
                    {active.startTimeStr} – {active.endTimeStr}
                  </span>
                  {active.meeting ? (
                    <span className="text-[10px] text-slate-400 font-extrabold uppercase leading-none mt-1">
                      Host: {active.meeting.organizer}
                    </span>
                  ) : !active.isOperating ? (
                    <span className="text-[10px] text-rose-400 font-bold uppercase leading-none mt-1">Out of Service</span>
                  ) : (
                    <span className="text-[10px] text-emerald-400 font-bold uppercase leading-none mt-1">Free for booking</span>
                  )}
                </div>

                {active.meeting ? (
                  <button
                    onClick={() => onShowMeetingDetails(active.meeting!.id)}
                    className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-black text-[10px] sm:text-xs uppercase tracking-widest rounded-xl transition-all active:scale-95 shadow-lg shadow-blue-500/10"
                  >
                    View Details
                  </button>
                ) : active.isOperating ? (
                  <button
                    onClick={() => onBook(active.startTimeStr)}
                    className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-[10px] sm:text-xs uppercase tracking-[0.2em] rounded-xl transition-all active:scale-95 shadow-lg shadow-emerald-500/15"
                  >
                    Book Slot
                  </button>
                ) : (
                  <div className="px-3 py-1.5 bg-slate-800/40 text-slate-500 rounded-lg text-[9px] font-black uppercase tracking-widest">
                    Closed
                  </div>
                )}

                {selectedSlot && (
                  <button
                    onClick={() => setSelectedSlot(null)}
                    className="size-10 rounded-full flex items-center justify-center bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 transition-all active:scale-90 shrink-0"
                  >
                    <span className="material-symbols-outlined text-xl">close</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};

export default ClockSlotsLayout;
