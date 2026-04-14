
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, RoomStatus, HomeLayout, User, Meeting, Amenity } from './types';
import DashboardView from './components/DashboardView';
import ScheduleView from './components/ScheduleView';
import DetailsView from './components/DetailsView';
import CheckInOutView from './components/CheckInOutView';
import BookingView from './components/BookingView';
import LoginView from './components/LoginView';
import MeetingDetailsView from './components/MeetingDetailsView';
import BottomNav from './components/BottomNav';
import SettingsModal from './components/SettingsModal';
import { ROOM_INFO } from './constants';
import { db } from './lib/db';
import { useBookingSync } from './lib/useBookingSync';

interface PendingAction {
  startTime?: string;
  meetingId?: string;
}

interface ExtensionSlot {
  minutes: number;
  endTime: string;
}

const DIGITAL_SIGN_ID = '8799e27e-cc85-4d98-a974-04d84e9f6e25';

// Maps Lucide React icon names → Material Symbols names
const LUCIDE_TO_MATERIAL: Record<string, string> = {
  // Transport
  car: 'directions_car',
  truck: 'local_shipping',
  bus: 'directions_bus',
  train: 'train',
  bike: 'directions_bike',
  plane: 'flight',
  ship: 'directions_boat',
  parkingcircle: 'local_parking',
  parkingsquare: 'local_parking',
  parking: 'local_parking',
  // Food & Drink
  coffee: 'coffee',
  utensils: 'restaurant',
  utensilscrossed: 'no_food',
  pizza: 'local_pizza',
  apple: 'nutrition',
  // Tech & Devices
  monitor: 'monitor',
  tv: 'tv',
  laptop: 'laptop',
  tablet: 'tablet',
  smartphone: 'smartphone',
  phone: 'phone',
  phoneoff: 'phone_disabled',
  printer: 'print',
  camera: 'camera_alt',
  video: 'videocam',
  videooff: 'videocam_off',
  mic: 'mic',
  micoff: 'mic_off',
  headphones: 'headphones',
  speaker: 'speaker',
  cpu: 'memory',
  harddrive: 'storage',
  usb: 'usb',
  bluetooth: 'bluetooth',
  wifi: 'wifi',
  wifioff: 'wifi_off',
  battery: 'battery_full',
  batterycharging: 'battery_charging_full',
  plug: 'power',
  power: 'power_settings_new',
  // People & Places
  user: 'person',
  users: 'group',
  building: 'business',
  building2: 'corporate_fare',
  home: 'home',
  warehouse: 'warehouse',
  // Nature & Climate
  thermometer: 'thermostat',
  wind: 'air',
  snowflake: 'ac_unit',
  sun: 'light_mode',
  moon: 'dark_mode',
  cloud: 'cloud',
  droplets: 'water_drop',
  flame: 'local_fire_department',
  zap: 'bolt',
  airvent: 'hvac',
  // Office
  briefcase: 'work',
  clipboard: 'assignment',
  book: 'book',
  bookopen: 'menu_book',
  calendar: 'calendar_today',
  clock: 'schedule',
  key: 'key',
  lock: 'lock',
  unlock: 'lock_open',
  mail: 'mail',
  inbox: 'inbox',
  archive: 'archive',
  package: 'package_2',
  box: 'inventory_2',
  shoppingbag: 'shopping_bag',
  tag: 'label',
  bookmark: 'bookmark',
  flag: 'flag',
  // Media & Content
  image: 'image',
  film: 'movie',
  music: 'music_note',
  volume: 'volume_up',
  volumex: 'volume_off',
  // UI & Actions
  search: 'search',
  bell: 'notifications',
  settings: 'settings',
  shield: 'shield',
  security: 'security',
  eye: 'visibility',
  eyeoff: 'visibility_off',
  edit: 'edit',
  trash: 'delete',
  plus: 'add',
  minus: 'remove',
  x: 'close',
  check: 'check',
  link: 'link',
  externallink: 'open_in_new',
  download: 'download',
  upload: 'upload',
  copy: 'content_copy',
  share: 'share',
  share2: 'share',
  refresh: 'refresh',
  refreshcw: 'refresh',
  globe: 'language',
  compass: 'explore',
  map: 'map',
  mappin: 'location_on',
  navigation: 'navigation',
  grid: 'grid_view',
  list: 'list',
  layout: 'dashboard',
  menu: 'menu',
  filter: 'filter_list',
  star: 'star',
  heart: 'favorite',
  alertcircle: 'error',
  alerttriangle: 'warning',
  info: 'info',
  helpcircle: 'help',
  checkcircle: 'check_circle',
  xcircle: 'cancel',
  maximize: 'fullscreen',
  minimize: 'fullscreen_exit',
  chair: 'chair',
  accessibility: 'accessibility',
};

function mapIcon(apiIcon: string): string {
  const key = apiIcon.toLowerCase().replace(/[^a-z0-9]/g, '');
  return LUCIDE_TO_MATERIAL[key] ?? apiIcon.toLowerCase();
}

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<View>(View.DASHBOARD);
  const [selectedStartTime, setSelectedStartTime] = useState<string | undefined>(undefined);
  const [selectedMeetingId, setSelectedMeetingId] = useState<string | undefined>(undefined);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  
  const [homeLayout, setHomeLayout] = useState<HomeLayout>(() => {
    const saved = localStorage.getItem('homeLayout');
    return (saved as HomeLayout) || HomeLayout.SPLIT_SCREEN;
  });

  const [slotPrecision, setSlotPrecision] = useState<15 | 30>(() => {
    const saved = localStorage.getItem('slotPrecision');
    return saved ? (parseInt(saved) as 15 | 30) : 30;
  });
  
  const [isNavExpanded, setIsNavExpanded] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [roomStatus, setRoomStatus] = useState<RoomStatus>(ROOM_INFO);
  const [isSyncing, setIsSyncing] = useState(false);
  const [scheduleSync, setScheduleSync] = useState(0);

  // Interaction Modals State
  const [confirmEndId, setConfirmEndId] = useState<string | null>(null);
  const [extendMeetingId, setExtendMeetingId] = useState<string | null>(null);
  const [availableExtensions, setAvailableExtensions] = useState<ExtensionSlot[]>([]);
  const [amenities, setAmenities] = useState<Amenity[]>([]);
  const [resourceId, setResourceId] = useState<string | null>(null);

  useEffect(() => {
    db.init();
  }, []);

  useEffect(() => {
    fetch(`https://sb.asasconnect.com/api/DigitalSigns/${DIGITAL_SIGN_ID}`)
      .then(res => {
        if (!res.ok) throw new Error(`Failed to load digital sign: ${res.status}`);
        return res.json();
      })
      .then((data: {
        signName: string;
        resourceId?: string;
        resource?: {
          id?: string;
          label?: string;
          floorName?: string;
          buildingName?: string;
          capacity?: number;
          description?: string;
          imageUrl?: string;
          amenities?: Array<{ id: string; name: string; description: string | null; icon: string; imageUrl: string | null }>;
        };
      }) => {
        const resource = data.resource ?? {};
        const resolvedResourceId = data.resourceId ?? resource.id ?? null;
        if (resolvedResourceId) setResourceId(resolvedResourceId);
        const locationParts = [resource.buildingName, resource.floorName].filter(Boolean);
        setRoomStatus(prev => ({
          ...prev,
          name: resource.label ?? prev.name,
          location: locationParts.length > 0 ? locationParts.join(' • ') : prev.location,
          ...(resource.capacity != null && { capacity: resource.capacity }),
          ...(resource.description && { description: resource.description }),
          ...(resource.imageUrl && { imageUrl: resource.imageUrl }),
        }));
        if (resource.amenities?.length) {
          setAmenities(resource.amenities.map(a => ({
            id: a.id,
            title: a.name,
            subtitle: a.description ?? '',
            description: a.description ?? '',
            icon: mapIcon(a.icon),
            img: a.imageUrl ?? '',
            status: 'Operational',
          })));
        }
      })
      .catch(err => console.error('DigitalSigns API error:', err));
  }, []);

  useEffect(() => {
    localStorage.setItem('homeLayout', homeLayout);
  }, [homeLayout]);

  useEffect(() => {
    localStorage.setItem('slotPrecision', slotPrecision.toString());
  }, [slotPrecision]);

  const parseTimeString = useCallback((timeStr: string) => {
    const [time, modifier] = timeStr.split(' ');
    let [hours, minutes] = time.split(':').map(Number);
    if (modifier === 'PM' && hours < 12) hours += 12;
    if (modifier === 'AM' && hours === 12) hours = 0;
    const date = new Date();
    date.setHours(hours, minutes, 0, 0);
    return date;
  }, []);

  const formatToTimeString = (date: Date) => {
    let hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12; 
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')} ${ampm}`;
  };

  // Extract time portion from either "HH:MM:SS", "HH:MM", or "YYYY-MM-DDTHH:MM:SS"
  const extractTime = (val: string): string => {
    if (!val) return '00:00';
    const t = val.includes('T') ? val.split('T')[1] : val;
    return t.substring(0, 5); // "HH:MM"
  };

  // Extract date portion from "YYYY-MM-DD" or "YYYY-MM-DDTHH:MM:SS".
  // Returns fallback for time-only strings like "14:30:00".
  const extractDate = (val: string, fallback: string): string => {
    if (!val) return fallback;
    if (val.includes('T')) return val.split('T')[0];
    if (/^\d{4}-\d{2}-\d{2}/.test(val)) return val.substring(0, 10);
    return fallback; // time-only string — use fallback
  };

  // Convert "HH:MM" (24h) to "HH:MM AM/PM"
  const to12h = (t: string): string => {
    const [hStr, mStr] = t.split(':');
    let h = parseInt(hStr, 10);
    const m = parseInt(mStr, 10);
    if (isNaN(h) || isNaN(m)) return '12:00 AM';
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')} ${ampm}`;
  };

  const updateRoomStatus = useCallback(() => {
    setIsSyncing(true);
    const today = new Date().toISOString().split('T')[0];
    const todayMeetings = db.getMeetings(today);
    const allMeetings = db.getMeetings();

    setTimeout(() => {
      const now = new Date();

      const currentMeeting = todayMeetings.find(m => {
        const start = parseTimeString(m.startTime);
        const end = parseTimeString(m.endTime);
        return now >= start && now < end;
      });

      // Look across all dates for the next upcoming meeting
      const nextMeeting = allMeetings
        .filter(m => m.id !== currentMeeting?.id)
        .filter(m => {
          if (m.date > today) return true;
          if (m.date === today) return parseTimeString(m.startTime) > now;
          return false;
        })
        .sort((a, b) => {
          if (a.date !== b.date) return a.date.localeCompare(b.date);
          return parseTimeString(a.startTime).getTime() - parseTimeString(b.startTime).getTime();
        })[0];

      setRoomStatus(prev => ({
        ...prev,
        isAvailable: !currentMeeting,
        currentMeeting: currentMeeting || undefined,
        nextMeeting: nextMeeting || undefined
      }));
      setIsSyncing(false);
    }, 300);
  }, [parseTimeString]);

  const syncBookingsFromApi = useCallback((resId: string) => {
    const today = new Date().toISOString().split('T')[0];
    fetch(`https://sb.asasconnect.com/api/bookings/by-date?date=${today}&resourceId=${resId}`)
      .then(r => { if (!r.ok) throw new Error(`Bookings API ${r.status}`); return r.json(); })
      .then((data: unknown) => {
        const list: any[] = Array.isArray(data) ? data : (data as any)?.items ?? (data as any)?.data ?? (data as any)?.bookings ?? [];
        const existing = db.getMeetings();
        // Keep only locally-created meetings (no apiId); API is the source of truth for all API meetings
        const localOnly = existing.filter(m => !m.apiId);
        const apiMeetings: Meeting[] = list.map((b: any) => {
          const apiId = String(b.id ?? b.bookingId ?? b.BookingId ?? b.Id ?? '');
          const local = existing.find(m => m.apiId === apiId);
          return {
            id: apiId,
            apiId,
            title: b.title ?? b.subject ?? b.Subject ?? 'Meeting',
            organizer: b.organizer ?? b.organizerName ?? b.OrganizerName ?? '',
            organizerPhoto: b.organizerPhoto ?? b.OrganizerPhoto ?? local?.organizerPhoto,
            startTime: b.startTime,
            endTime: b.endTime,
            date: b.date ?? today,
            type: (b.type ?? local?.type ?? 'INTERNAL') as 'INTERNAL' | 'CLIENT',
            attendees: b.attendees ?? [],
            recurrence: 'NONE' as const,
          };
        });
        localStorage.setItem('everest_meetings_db', JSON.stringify([...localOnly, ...apiMeetings]));
        updateRoomStatus();
      })
      .catch(err => console.error('Bookings sync error:', err));
  }, [updateRoomStatus]);

  // Sync bookings from API whenever resourceId becomes available
  useEffect(() => {
    if (resourceId) syncBookingsFromApi(resourceId);
  }, [resourceId, syncBookingsFromApi]);

  // Real-time sync via SignalR — re-fetch bookings on any create/update/delete
  useBookingSync(
    resourceId,
    useCallback(() => {
      if (resourceId) syncBookingsFromApi(resourceId);
      setScheduleSync(k => k + 1);
    }, [resourceId, syncBookingsFromApi]),
  );

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    updateRoomStatus();
  }, [currentTime.getMinutes(), updateRoomStatus]);

  const handleShowMeetingDetails = (meetingId: string) => {
    setSelectedMeetingId(meetingId);
    setCurrentView(View.MEETING_DETAILS);
  };

  const handleBookAtTime = (time?: string, meetingId?: string) => {
    let finalTime = time;
    if (!finalTime && !meetingId) {
      // Calculate current slot start
      const now = new Date();
      const minutes = now.getMinutes();
      const roundedMinutes = Math.floor(minutes / slotPrecision) * slotPrecision;
      now.setMinutes(roundedMinutes);
      finalTime = formatToTimeString(now);
    }

    // Always require fresh authentication before booking or editing
    setCurrentUser(null);
    setPendingAction({ startTime: finalTime, meetingId });
    setCurrentView(View.LOGIN);
  };

  const onEndNowRequested = (id: string) => {
    setConfirmEndId(id);
  };

  const confirmEndMeeting = () => {
    if (!confirmEndId) return;
    const now = new Date();
    const formattedEnd = formatToTimeString(now);
    db.updateMeeting(confirmEndId, { endTime: formattedEnd });
    setConfirmEndId(null);
    updateRoomStatus();
    handleLogout();
  };

  const onExtendRequested = (id: string) => {
    const meetings = db.getMeetings();
    const meeting = meetings.find(m => m.id === id);
    if (!meeting) return;

    const currentEnd = parseTimeString(meeting.endTime);
    const today = new Date().toISOString().split('T')[0];
    
    const nextMeeting = meetings
      .filter(m => m.id !== id && m.date === today && parseTimeString(m.startTime) >= currentEnd)
      .sort((a, b) => parseTimeString(a.startTime).getTime() - parseTimeString(b.startTime).getTime())[0];

    const endOfDay = new Date(currentTime);
    endOfDay.setHours(23, 59, 0, 0);

    const maxExtensionTime = nextMeeting 
      ? parseTimeString(nextMeeting.startTime) 
      : endOfDay;

    const diffMs = maxExtensionTime.getTime() - currentEnd.getTime();
    const maxMins = Math.floor(diffMs / 60000);
    
    // Generate extension slots in increments of global slotPrecision
    const increment = slotPrecision;
    const slots: ExtensionSlot[] = [];
    
    // We offer up to 4 potential slot extensions based on precision
    for (let i = 1; i <= 4; i++) {
      const mins = increment * i;
      if (mins <= maxMins) {
        const slotEnd = new Date(currentEnd.getTime() + mins * 60000);
        slots.push({
          minutes: mins,
          endTime: formatToTimeString(slotEnd)
        });
      }
    }
    
    setAvailableExtensions(slots);
    setExtendMeetingId(id);
  };

  const confirmExtendMeeting = (minutes: number) => {
    if (!extendMeetingId) return;
    const meetings = db.getMeetings();
    const meeting = meetings.find(m => m.id === extendMeetingId);
    if (!meeting) return;

    const currentEnd = parseTimeString(meeting.endTime);
    const newEnd = new Date(currentEnd.getTime() + minutes * 60000);
    
    db.updateMeeting(extendMeetingId, { endTime: formatToTimeString(newEnd) });
    setExtendMeetingId(null);
    updateRoomStatus();
    handleLogout();
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setCurrentView(View.DASHBOARD);
  };

  const renderView = () => {
    switch (currentView) {
      case View.DASHBOARD:
        return (
          <DashboardView 
            currentTime={currentTime} 
            roomStatus={roomStatus} 
            isSyncing={isSyncing} 
            layout={homeLayout}
            onBook={handleBookAtTime}
            onShowMeetingDetails={handleShowMeetingDetails}
            onCheckIn={() => setCurrentView(View.CHECKIN)}
            onExtend={onExtendRequested}
            onEndNow={onEndNowRequested}
            onShowDetails={() => setCurrentView(View.DETAILS)}
            slotPrecision={slotPrecision}
          />
        );
      case View.SCHEDULE:
        return (
          <ScheduleView
            key="schedule"
            onUpdate={updateRoomStatus}
            onBook={handleBookAtTime}
            onShowMeetingDetails={handleShowMeetingDetails}
            slotPrecision={slotPrecision}
            resourceId={resourceId ?? undefined}
            syncKey={scheduleSync}
          />
        );
      case View.DETAILS:
        return <DetailsView onBack={() => setCurrentView(View.DASHBOARD)} onBook={() => handleBookAtTime()} roomName={roomStatus.name} roomLocation={roomStatus.location} capacity={roomStatus.capacity} description={roomStatus.description} imageUrl={roomStatus.imageUrl} amenities={amenities} />;
      case View.CHECKIN:
        return <CheckInOutView onBack={() => setCurrentView(View.DASHBOARD)} currentTime={currentTime} roomStatus={roomStatus} />;
      case View.MEETING_DETAILS:
        return (
          <MeetingDetailsView 
            meetingId={selectedMeetingId || ''} 
            onBack={() => setCurrentView(View.DASHBOARD)} 
            onEdit={(id) => handleBookAtTime(undefined, id)}
            onExtend={onExtendRequested}
            onEndNow={onEndNowRequested}
            roomName={roomStatus.name}
            amenities={amenities}
          />
        );
      case View.LOGIN:
        return <LoginView onBack={() => setCurrentView(View.DASHBOARD)} onLogin={(user) => {
          setCurrentUser(user);
          if (pendingAction) {
            setSelectedStartTime(pendingAction.startTime);
            setSelectedMeetingId(pendingAction.meetingId);
            setPendingAction(null);
            setCurrentView(View.BOOKING);
          } else {
            setCurrentView(View.DASHBOARD);
          }
        }} />;
      case View.BOOKING:
        return (
          <BookingView
            initialStartTime={selectedStartTime}
            initialMeetingId={selectedMeetingId}
            currentUser={currentUser}
            slotPrecision={slotPrecision}
            roomName={roomStatus.name}
            resourceId={resourceId ?? undefined}
            onBack={() => {
              setCurrentView(View.DASHBOARD);
              setSelectedStartTime(undefined);
              setSelectedMeetingId(undefined);
            }} 
            onSuccess={() => {
              if (resourceId) syncBookingsFromApi(resourceId);
              else updateRoomStatus();
              setSelectedStartTime(undefined);
              setSelectedMeetingId(undefined);
              handleLogout();
            }} 
            onTriggerLogin={() => setCurrentView(View.LOGIN)}
          />
        );
      default:
        return <DashboardView currentTime={currentTime} roomStatus={roomStatus} isSyncing={isSyncing} layout={homeLayout} onBook={handleBookAtTime} onShowMeetingDetails={handleShowMeetingDetails} onCheckIn={() => setCurrentView(View.CHECKIN)} onExtend={onExtendRequested} onEndNow={onEndNowRequested} onShowDetails={() => setCurrentView(View.DETAILS)} slotPrecision={slotPrecision} />;
    }
  };

  const showNav = currentView !== View.CHECKIN && currentView !== View.BOOKING && currentView !== View.LOGIN && currentView !== View.MEETING_DETAILS;

  return (
    <div className="flex h-screen w-full bg-[#050505] relative overflow-hidden font-display selection:bg-primary/30 text-white">
      <div className="fixed top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/15 blur-[120px] rounded-full pointer-events-none" />
      <div className="fixed bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-primary/15 blur-[120px] rounded-full pointer-events-none" />

      <div className="flex flex-row flex-1 w-full h-full relative z-10 transition-all duration-500">
        <div className="flex-1 h-full overflow-hidden">
          {renderView()}
        </div>
      </div>

      <BottomNav 
        activeView={currentView} 
        setView={setCurrentView} 
        isLoggedIn={!!currentUser}
        isExpanded={isNavExpanded}
        setIsExpanded={setIsNavExpanded}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onBookClick={() => handleBookAtTime()}
      />
      
      {/* End Meeting Confirmation Modal */}
      {confirmEndId && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-xl" onClick={() => setConfirmEndId(null)} />
          <div className="relative w-full max-w-md bg-card-dark rounded-xl border border-white/10 shadow-2xl p-10 flex flex-col items-center text-center gap-6 animate-in zoom-in-95 duration-300">
             <div className="size-20 rounded-xl bg-status-busy/25 border-4 border-status-busy/40 flex items-center justify-center text-status-busy mb-2 shadow-[0_0_40px_rgba(239,68,68,0.4)]">
                <span className="material-symbols-outlined text-4xl font-bold">logout</span>
             </div>
             <div className="flex flex-col gap-2">
               <h3 className="text-3xl font-black text-white tracking-tight uppercase">End Session?</h3>
               <p className="text-slate-300 font-medium leading-relaxed">This will immediately conclude the current meeting and release the room for others.</p>
             </div>
             <div className="flex flex-col gap-3 w-full mt-4">
               <button 
                onClick={confirmEndMeeting}
                className="w-full bg-status-busy text-white py-5 rounded-xl text-xl font-black shadow-xl shadow-status-busy/20 hover:brightness-110 active:scale-95 transition-all uppercase tracking-widest border-t border-white/20"
               >
                 End Now
               </button>
               <button 
                onClick={() => setConfirmEndId(null)}
                className="w-full bg-white/5 text-slate-300 py-5 rounded-xl text-lg font-black border border-white/10 hover:bg-white/10 active:scale-95 transition-all"
               >
                 Cancel
               </button>
             </div>
          </div>
        </div>
      )}

      {/* Extend Meeting Selection Modal - Respects Global slotPrecision */}
      {extendMeetingId && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-xl" onClick={() => setExtendMeetingId(null)} />
          <div className="relative w-full max-w-lg bg-card-dark rounded-xl border border-white/10 shadow-2xl p-10 lg:p-14 flex flex-col items-center gap-8 animate-in zoom-in-95 duration-300">
             <div className="size-20 rounded-xl bg-primary/10 border-4 border-primary/20 flex items-center justify-center text-primary mb-2 shadow-[0_0_40px_rgba(19,127,236,0.2)]">
                <span className="material-symbols-outlined text-4xl font-bold">more_time</span>
             </div>
             <div className="flex flex-col gap-2 text-center">
               <h3 className="text-3xl font-black text-white tracking-tight uppercase">Extend Session</h3>
               <p className="text-slate-300 font-black uppercase tracking-[0.3em] text-[10px]">Select available end time ({slotPrecision}m grid)</p>
             </div>

             <div className="grid grid-cols-2 gap-4 w-full">
                {availableExtensions.length > 0 ? (
                 availableExtensions.map(slot => (
                   <button 
                    key={slot.minutes}
                    onClick={() => confirmExtendMeeting(slot.minutes)}
                    className="bg-white/5 border border-white/10 rounded-xl py-6 flex flex-col items-center gap-2 hover:bg-primary/10 hover:border-primary transition-all active:scale-95 group shadow-lg"
                   >
                     <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest leading-none">Until</span>
                     <span className="text-2xl lg:text-3xl font-black text-white group-hover:text-primary transition-colors">{slot.endTime}</span>
                     <span className="text-[10px] font-black text-primary/60 uppercase tracking-widest mt-1">+{slot.minutes}m</span>
                   </button>
                 ))
               ) : (
                 <div className="col-span-2 py-8 bg-red-500/15 border border-red-500/25 rounded-xl text-center flex flex-col items-center gap-4">
                    <span className="material-symbols-outlined text-red-500 text-3xl">event_busy</span>
                    <p className="text-red-500 font-black uppercase tracking-widest text-xs">No extensions available.<br/>Next meeting starts soon.</p>
                 </div>
               )}
             </div>

             <button 
              onClick={() => setExtendMeetingId(null)}
              className="mt-4 text-slate-400 hover:text-white font-black uppercase tracking-[0.3em] text-[10px] transition-colors"
             >
               Dismiss Selection
             </button>
          </div>
        </div>
      )}

      <SettingsModal 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)} 
        currentLayout={homeLayout} 
        onSelectLayout={setHomeLayout}
        currentSlotPrecision={slotPrecision}
        onSelectSlotPrecision={setSlotPrecision}
      />
    </div>
  );
};

export default App;
