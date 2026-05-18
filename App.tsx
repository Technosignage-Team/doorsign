
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { getActivationKey } from './lib/activationKey';
import { getLicense, isLicenseExpired, LicenseInfo } from './lib/license';
import LicenseExpiredScreen from './components/LicenseExpiredScreen';
import NetworkBanner from './components/NetworkBanner';
import { View, RoomStatus, HomeLayout, User, Meeting, Amenity } from './types';
import DashboardView from './components/DashboardView';
import ScheduleView from './components/ScheduleView';
import DetailsView from './components/DetailsView';
import CheckInOutView from './components/CheckInOutView';
import BookingView from './components/BookingView';
import LoginView from './components/LoginView';
import MeetingDetailsView from './components/MeetingDetailsView';
import ConfigurationView from './components/ConfigurationView';
import BottomNav from './components/BottomNav';
import SettingsModal from './components/SettingsModal';
import { ROOM_INFO } from './constants';
import { db } from './lib/db';
import { useBookingSync } from './lib/useBookingSync';
import { setLedAvailable, setLedBusy, refreshLed } from './lib/led';
import { doorSignFetch } from './lib/doorSignFetch';
import { getBaseUrl, loadHostUrl } from './lib/hostUrl';
import SetupWizard from './components/SetupWizard';

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

interface AppProps {
  initialResourceData?: any;
  onUnlinked?: () => void;
}

const App: React.FC<AppProps> = ({ initialResourceData, onUnlinked }) => {
  const [resourceBootData, setResourceBootData] = useState<any>(initialResourceData ?? null);
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
  const [pendingEndId, setPendingEndId] = useState<string | null>(null);
  const [extendMeetingId, setExtendMeetingId] = useState<string | null>(null);
  const [pendingExtendId, setPendingExtendId] = useState<string | null>(null);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [availableExtensions, setAvailableExtensions] = useState<ExtensionSlot[]>([]);
  const [amenities, setAmenities] = useState<Amenity[]>([]);
  const [resourceId, setResourceId] = useState<string | null>(null);
  const [resourceConfigured, setResourceConfigured] = useState<boolean | null>(null);

  useEffect(() => {
    db.init();
    // Set LED to green on startup — will be corrected by first updateRoomStatus if a meeting is active
    setLedAvailable();

    // Re-assert the LED whenever the app comes back to the foreground or the
    // tab becomes visible. Covers the case where the vendor LED test app or
    // some other process changed the color while we were in the background.
    const reassert = () => {
      // Use the latest roomStatus from a ref-like read via setRoomStatus(prev=>...)
      setRoomStatus(prev => {
        refreshLed(prev.isAvailable);
        return prev;
      });
    };
    const onVisibility = () => { if (document.visibilityState === 'visible') reassert(); };
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('focus', reassert);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('focus', reassert);
    };
  }, []);

  const applyDigitalSignData = useCallback((data: {
    signName?: string;
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
    if (resolvedResourceId) {
      setResourceId(resolvedResourceId);
      setResourceConfigured(true);
    } else {
      setResourceConfigured(false);
    }
    const locationParts = [resource.buildingName, resource.floorName].filter(Boolean);
    setRoomStatus(prev => ({
      ...prev,
      name: resource.label ?? prev.name,
      location: locationParts.length > 0 ? locationParts.join(' • ') : prev.location,
      ...(resource.capacity != null && { capacity: resource.capacity }),
      ...(resource.description && { description: resource.description }),
      ...(resource.imageUrl && { imageUrl: resource.imageUrl }),
    }));
    if (Array.isArray(resource.amenities)) {
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
  }, []);

  const fetchDigitalSign = useCallback(() => {
    doorSignFetch(`${getBaseUrl()}/api/DigitalSigns/${DIGITAL_SIGN_ID}`, { cache: 'no-store' })
      .then(res => {
        if (!res.ok) throw new Error(`Failed to load digital sign: ${res.status}`);
        return res.json();
      })
      .then(applyDigitalSignData)
      .catch(err => console.error('DigitalSigns API error:', err));
  }, [applyDigitalSignData]);

  const fetchActivationResource = useCallback(async () => {
    const key = await getActivationKey();
    if (!key) return;
    doorSignFetch(`${getBaseUrl()}/api/digitalsigns/activate/${key}`, { cache: 'no-store' })
      .then(res => {
        if (!res.ok) throw new Error(`Activation refresh failed: ${res.status}`);
        return res.json();
      })
      .then(applyDigitalSignData)
      .catch(err => console.error('Activation refresh error:', err));
  }, [applyDigitalSignData]);

  const fetchAmenities = useCallback((resId: string) => {
    // Cache-bust to defeat any intermediary cache that might serve stale data
    // immediately after a SignalR amenity-change event.
    const url = `${getBaseUrl()}/api/Resources/${resId}/amenities?_=${Date.now()}`;
    doorSignFetch(url, { cache: 'no-store' })
      .then(res => { if (!res.ok) throw new Error(`Amenities API ${res.status}`); return res.json(); })
      .then((list: Array<{ id: string; name: string; description: string | null; icon: string; imageUrl: string | null }>) => {
        if (Array.isArray(list)) {
          console.log('[Amenities] refreshed', list.length, 'items for resource', resId);
          setAmenities(list.map(a => ({
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
      .catch(err => {
        // Fallback: reload via the activation key (the right resource for this sign).
        console.warn('[Amenities] direct fetch failed, falling back to activation refresh:', err);
        fetchActivationResource();
      });
  }, [fetchActivationResource]);

  useEffect(() => {
    if (resourceBootData) {
      // Use the activation response passed from the activation prompt
      applyDigitalSignData(resourceBootData);
    } else {
      // On reload: re-fetch resource via the activation endpoint using stored key
      fetchActivationResource();
    }
    // Intentionally run only once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

    setTimeout(() => {
      const now = new Date();

      const currentMeeting = todayMeetings.find(m => {
        const start = parseTimeString(m.startTime);
        const end = parseTimeString(m.endTime);
        return now >= start && now < end;
      });

      // Look only at today's meetings for the next upcoming one
      const nextMeeting = todayMeetings
        .filter(m => m.id !== currentMeeting?.id)
        .filter(m => parseTimeString(m.startTime) > now)
        .sort((a, b) => parseTimeString(a.startTime).getTime() - parseTimeString(b.startTime).getTime())[0];

      const available = !currentMeeting;
      setRoomStatus(prev => ({
        ...prev,
        isAvailable: available,
        currentMeeting: currentMeeting || undefined,
        nextMeeting: nextMeeting || undefined
      }));
      // Always force-refresh the LED on each tick — never trust the dedupe
      // cache. Cheap (single sysfs/shell write) and guarantees the bar matches
      // the current room state at all times.
      refreshLed(available);
      setIsSyncing(false);
    }, 300);
  }, [parseTimeString]);

  const syncBookingsFromApi = useCallback((resId: string) => {
    const today = new Date().toISOString().split('T')[0];

    // Immediately wipe stale API meetings so old data never shows on reload
    const stale = db.getMeetings();
    const localOnly = stale.filter(m => !m.apiId);
    localStorage.setItem('everest_meetings_db', JSON.stringify(localOnly));
    updateRoomStatus();

    doorSignFetch(`${getBaseUrl()}/api/bookings/by-date?date=${today}&resourceId=${resId}`, { cache: 'no-store' })
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

  // Always pull the canonical amenity list once we know the resource id
  useEffect(() => {
    if (resourceId) fetchAmenities(resourceId);
  }, [resourceId, fetchAmenities]);

  // Real-time sync via SignalR — re-fetch bookings on any create/update/delete
  useBookingSync(
    resourceId,
    useCallback(() => {
      if (resourceId) syncBookingsFromApi(resourceId);
      setScheduleSync(k => k + 1);
    }, [resourceId, syncBookingsFromApi]),
    useCallback((_event: { id: string; label: string; capacity: number; [key: string]: unknown }) => {
      // Resource updated — re-fetch via the activation endpoint to get latest data
      fetchActivationResource();
    }, [fetchActivationResource]),
    useCallback((_event: { resourceId: string }) => {
      // Amenities updated — re-fetch them
      if (resourceId) fetchAmenities(resourceId);
    }, [resourceId, fetchAmenities]),
    useCallback(() => {
      // Global amenity catalog changed (created/updated/deleted) — reload
      // the per-resource amenity list (canonical source) and also refresh the
      // resource via the activation key so all room info fields stay in sync.
      console.log('[Amenities] global amenity change received — refreshing');
      if (resourceId) fetchAmenities(resourceId);
      fetchActivationResource();
    }, [resourceId, fetchActivationResource, fetchAmenities]),
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
    // Require login so token is available for the edit API call
    setCurrentUser(null);
    setPendingEndId(id);
    setCurrentView(View.LOGIN);
  };

  const confirmEndMeeting = () => {
    if (!confirmEndId) return;
    const now = new Date();
    const formattedEnd = formatToTimeString(now);
    const h = now.getHours().toString().padStart(2, '0');
    const m = now.getMinutes().toString().padStart(2, '0');
    const endTime24 = `${h}:${m}`;

    const meeting = db.getMeetings().find(mt => mt.id === confirmEndId);
    if (meeting?.apiId) {
      const to24h = (t: string) => {
        const [time, mod] = t.split(' ');
        let [hh, mm] = time.split(':').map(Number);
        if (mod === 'PM' && hh < 12) hh += 12;
        if (mod === 'AM' && hh === 12) hh = 0;
        return `${hh.toString().padStart(2, '0')}:${mm.toString().padStart(2, '0')}`;
      };
      const body = {
        ResourceId: resourceId,
        OrganizerUserId: currentUser?.userId,
        BookingDate: meeting.date,
        StartTime: to24h(meeting.startTime),
        EndTime: endTime24,
        Subject: meeting.title,
        attendee: meeting.attendees ?? [],
      };
      doorSignFetch(`${getBaseUrl()}/api/Bookings/${meeting.apiId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(currentUser?.token ? { Authorization: `Bearer ${currentUser.token}` } : {}),
        },
        body: JSON.stringify(body),
      }).catch(err => console.error('End meeting API error:', err));
    }

    db.updateMeeting(confirmEndId, { endTime: formattedEnd });
    setConfirmEndId(null);
    updateRoomStatus();
    // Force the LED to refresh — bypass dedupe so the bar definitely flips
    // green the moment the meeting ends (even if state flapped).
    refreshLed(true);
    handleLogout();
  };

  const computeExtendSlots = (id: string) => {
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

    const increment = slotPrecision;
    const slots: ExtensionSlot[] = [];
    for (let i = 1; i <= 4; i++) {
      const mins = increment * i;
      if (mins <= maxMins) {
        const slotEnd = new Date(currentEnd.getTime() + mins * 60000);
        slots.push({ minutes: mins, endTime: formatToTimeString(slotEnd) });
      }
    }
    setAvailableExtensions(slots);
    setExtendMeetingId(id);
  };

  const onExtendRequested = (id: string) => {
    setCurrentUser(null);
    setPendingExtendId(id);
    setCurrentView(View.LOGIN);
  };

  const confirmExtendMeeting = (minutes: number) => {
    if (!extendMeetingId) return;
    const meetings = db.getMeetings();
    const meeting = meetings.find(m => m.id === extendMeetingId);
    if (!meeting) return;

    const currentEnd = parseTimeString(meeting.endTime);
    const newEnd = new Date(currentEnd.getTime() + minutes * 60000);
    const newEndFormatted = formatToTimeString(newEnd);
    const h = newEnd.getHours().toString().padStart(2, '0');
    const m = newEnd.getMinutes().toString().padStart(2, '0');
    const endTime24 = `${h}:${m}`;

    if (meeting.apiId) {
      const to24h = (t: string) => {
        const [time, mod] = t.split(' ');
        let [hh, mm] = time.split(':').map(Number);
        if (mod === 'PM' && hh < 12) hh += 12;
        if (mod === 'AM' && hh === 12) hh = 0;
        return `${hh.toString().padStart(2, '0')}:${mm.toString().padStart(2, '0')}`;
      };
      doorSignFetch(`${getBaseUrl()}/api/Bookings/${meeting.apiId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(currentUser?.token ? { Authorization: `Bearer ${currentUser.token}` } : {}),
        },
        body: JSON.stringify({
          ResourceId: resourceId,
          OrganizerUserId: currentUser?.userId,
          BookingDate: meeting.date,
          StartTime: to24h(meeting.startTime),
          EndTime: endTime24,
          Subject: meeting.title,
          attendee: meeting.attendees ?? [],
        }),
      }).catch(err => console.error('Extend meeting API error:', err));
    }

    db.updateMeeting(extendMeetingId, { endTime: newEndFormatted });
    setExtendMeetingId(null);
    updateRoomStatus();
    handleLogout();
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setCurrentView(View.DASHBOARD);
  };

  // Idle redirect — return to dashboard after 1 minute of no interaction
  useEffect(() => {
    if (currentView === View.DASHBOARD) return;
    const IDLE_MS = 60_000;
    // Use an object ref so reset() and cleanup always share the same timer id
    const t = { id: undefined as ReturnType<typeof setTimeout> | undefined };

    const goHome = () => {
      setCurrentUser(null);
      setPendingAction(null);
      setCurrentView(View.DASHBOARD);
    };

    const reset = () => {
      clearTimeout(t.id);
      t.id = setTimeout(goHome, IDLE_MS);
    };

    reset(); // start the initial timer

    const events = ['pointerdown', 'keydown', 'wheel', 'touchstart', 'click'] as const;
    events.forEach(e => window.addEventListener(e, reset, { passive: true }));

    return () => {
      clearTimeout(t.id);
      events.forEach(e => window.removeEventListener(e, reset));
    };
  }, [currentView]);

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
            onBack={() => setCurrentView(View.DASHBOARD)}
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
            capacity={roomStatus.capacity}
            amenities={amenities}
          />
        );
      case View.LOGIN:
        return <LoginView onBack={() => setCurrentView(View.DASHBOARD)} onLogin={(user) => {
          setCurrentUser(user);
          const isAdmin = user.role?.toLowerCase() === 'admin';
          if (pendingEndId) {
            const meeting = db.getMeetings().find(m => m.id === pendingEndId);
            const isOrganizer = !!(meeting && user.name.toLowerCase() === meeting.organizer.toLowerCase());
            if (!isOrganizer && !isAdmin) {
              setPendingEndId(null);
              setPermissionError('You cannot end this meeting because you are not the organizer and do not have admin permissions.');
            } else {
              setConfirmEndId(pendingEndId);
              setPendingEndId(null);
            }
            setCurrentView(View.DASHBOARD);
          } else if (pendingExtendId) {
            const meeting = db.getMeetings().find(m => m.id === pendingExtendId);
            const isOrganizer = !!(meeting && user.name.toLowerCase() === meeting.organizer.toLowerCase());
            if (!isOrganizer && !isAdmin) {
              setPendingExtendId(null);
              setPermissionError('You cannot extend this meeting because you are not the organizer and do not have admin permissions.');
              setCurrentView(View.DASHBOARD);
            } else {
              const id = pendingExtendId;
              setPendingExtendId(null);
              computeExtendSlots(id);
              setCurrentView(View.DASHBOARD);
            }
          } else if (pendingAction) {
            if (pendingAction.meetingId) {
              // Edit mode — check organizer or admin
              const meeting = db.getMeetings().find(m => m.id === pendingAction.meetingId);
              const isOrganizer = !!(meeting && user.name.toLowerCase() === meeting.organizer.toLowerCase());
              if (!isOrganizer && !isAdmin) {
                setPendingAction(null);
                setPermissionError('You cannot edit this meeting because you are not the organizer and do not have admin permissions.');
                setCurrentView(View.DASHBOARD);
              } else {
                setSelectedStartTime(pendingAction.startTime);
                setSelectedMeetingId(pendingAction.meetingId);
                setPendingAction(null);
                setCurrentView(View.BOOKING);
              }
            } else {
              setSelectedStartTime(pendingAction.startTime);
              setSelectedMeetingId(pendingAction.meetingId);
              setPendingAction(null);
              setCurrentView(View.BOOKING);
            }
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
      case View.CONFIGURATION:
        return (
          <ConfigurationView
            onBack={() => setCurrentView(View.DASHBOARD)}
            onConnectionChanged={(resourceData) => {
              applyDigitalSignData(resourceData);
              setCurrentView(View.DASHBOARD);
            }}
            onUnlinked={onUnlinked}
          />
        );
      default:
        return <DashboardView currentTime={currentTime} roomStatus={roomStatus} isSyncing={isSyncing} layout={homeLayout} onBook={handleBookAtTime} onShowMeetingDetails={handleShowMeetingDetails} onCheckIn={() => setCurrentView(View.CHECKIN)} onExtend={onExtendRequested} onEndNow={onEndNowRequested} onShowDetails={() => setCurrentView(View.DETAILS)} slotPrecision={slotPrecision} />;
    }
  };

  if (resourceConfigured === false) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-[#050505] text-white px-8">
        <div className="fixed top-[-15%] left-[-10%] w-[50%] h-[50%] bg-primary/6 blur-[140px] rounded-full pointer-events-none" />
        <div className="fixed bottom-[-15%] right-[-10%] w-[45%] h-[45%] bg-primary/6 blur-[140px] rounded-full pointer-events-none" />
        <div className="relative w-full max-w-sm flex flex-col items-center gap-6">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
            <span className="material-symbols-outlined text-amber-400" style={{ fontSize: '32px' }}>meeting_room</span>
          </div>
          <div className="text-center flex flex-col gap-2">
            <h2 className="text-2xl font-black text-white tracking-tight">No Room Configured</h2>
            <p className="text-slate-400 text-sm leading-relaxed">
              This door sign does not have a room linked to it.<br />
              Please configure it from the web portal and reload.
            </p>
          </div>
          <div className="w-full flex items-start gap-3 px-5 py-4 rounded-2xl bg-amber-500/6 border border-amber-500/12">
            <span className="material-symbols-outlined text-amber-400 flex-shrink-0 mt-0.5" style={{ fontSize: '16px' }}>info</span>
            <p className="text-amber-300/70 text-xs leading-relaxed">
              Go to the Sharewinds web portal → Door Signs → select this sign → assign a room resource to it.
            </p>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="w-full py-4 rounded-2xl font-black text-sm bg-primary text-white shadow-lg shadow-primary/20 hover:brightness-110 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>refresh</span>
            Reload
          </button>
        </div>
      </div>
    );
  }

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

      {/* Permission Error Modal */}
      {permissionError && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-xl" onClick={() => setPermissionError(null)} />
          <div className="relative w-full max-w-md bg-card-dark rounded-xl border border-white/10 shadow-2xl p-10 flex flex-col items-center text-center gap-6 animate-in zoom-in-95 duration-300">
            <div className="size-20 rounded-xl bg-yellow-500/20 border-4 border-yellow-500/30 flex items-center justify-center text-yellow-400 mb-2">
              <span className="material-symbols-outlined text-4xl font-bold">lock</span>
            </div>
            <div className="flex flex-col gap-2">
              <h3 className="text-3xl font-black text-white tracking-tight uppercase">Not Authorized</h3>
              <p className="text-slate-300 font-medium leading-relaxed">{permissionError}</p>
            </div>
            <button
              onClick={() => setPermissionError(null)}
              className="w-full bg-white/5 text-slate-300 py-5 rounded-xl text-lg font-black border border-white/10 hover:bg-white/10 active:scale-95 transition-all"
            >
              Dismiss
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
        onOpenConfiguration={() => { setIsSettingsOpen(false); setCurrentView(View.CONFIGURATION); }}
      />
    </div>
  );
};

const STATIC_MODE = !!(import.meta as any).env?.VITE_STATIC_HOST_URL && !!(import.meta as any).env?.VITE_STATIC_ACTIVATION_KEY;

const AppGate: React.FC = () => {
  const [checked, setChecked] = useState(false);
  const [isSetup, setIsSetup] = useState(false);
  const [licence, setLicence] = useState<LicenseInfo | null>(null);
  const [resourceBootData, setResourceBootData] = useState<any>(null);

  const loadState = async () => {
    if (STATIC_MODE) {
      setIsSetup(true);
      setChecked(true);
      return;
    }
    const [hostUrl, key, lic] = await Promise.all([loadHostUrl(), getActivationKey(), getLicense()]);
    setLicence(lic);
    setIsSetup(!!hostUrl && !!key && !!lic);
    setChecked(true);
  };

  useEffect(() => {
    loadState();
    if (!STATIC_MODE) {
      const interval = setInterval(loadState, 60 * 60 * 1000);
      return () => clearInterval(interval);
    }
  }, []);

  if (!checked) return null;

  if (!isSetup) {
    return (
      <>
        <SetupWizard
          onComplete={(resourceData) => {
            setResourceBootData(resourceData);
            loadState();
          }}
        />
        <NetworkBanner />
      </>
    );
  }

  if (!STATIC_MODE && licence && isLicenseExpired(licence)) {
    return (
      <>
        <LicenseExpiredScreen
          license={licence}
          onRenew={() => {
            setIsSetup(false);
            setLicence(null);
            setChecked(false);
          }}
        />
        <NetworkBanner />
      </>
    );
  }

  return (
    <>
      <App
        initialResourceData={resourceBootData}
        onUnlinked={() => {
          setIsSetup(false);
          setLicence(null);
          setResourceBootData(null);
        }}
      />
      <NetworkBanner />
    </>
  );
};

export default AppGate;
