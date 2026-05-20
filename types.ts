
export enum View {
  DASHBOARD = 'DASHBOARD',
  SCHEDULE = 'SCHEDULE',
  DETAILS = 'DETAILS',
  CHECKIN = 'CHECKIN',
  BOOKING = 'BOOKING',
  LOGIN = 'LOGIN',
  MEETING_DETAILS = 'MEETING_DETAILS',
  CONFIGURATION = 'CONFIGURATION'
}

export enum HomeLayout {
  DEFAULT = 'DEFAULT',
  MODERN_PILL = 'MODERN_PILL',
  SPLIT_SCREEN = 'SPLIT_SCREEN'
}

export interface User {
  employeeId: string;
  userId: string;
  name: string;
  role: string;
  photo: string;
  token: string;
}

export interface Attendee {
  fullName: string;
  photo?: string;
}

export interface Amenity {
  id: string;
  img: string;
  icon: string;
  title: string;
  subtitle: string;
  description: string;
  quantity?: string;
  status: string;
}

export interface Meeting {
  id: string;
  apiId?: string;
  title: string;
  startTime: string; // HH:MM AM/PM
  endTime: string;   // HH:MM AM/PM
  date: string;      // YYYY-MM-DD
  organizer: string;
  organizerPhoto?: string;
  attendees?: Attendee[];
  type: 'INTERNAL' | 'CLIENT';
  isOngoing?: boolean;
  isCancelled?: boolean;
  recurrence?: 'NONE' | 'DAILY' | 'WEEKLY' | 'MONTHLY';
  recurrenceEndDate?: string;
  groupId?: string;
}

export interface RoomStatus {
  isAvailable: boolean;
  isUpNextSoon?: boolean;
  currentMeeting?: Meeting;
  nextMeeting?: Meeting;
  name: string;
  location: string;
  capacity: number;
  description?: string;
  imageUrl?: string;
}
