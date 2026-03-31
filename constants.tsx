
import { Meeting, RoomStatus, Amenity } from './types';

export const MOCK_MEETINGS: Meeting[] = [
  {
    id: '1',
    title: 'Quarterly Strategic Planning',
    startTime: '10:00 AM',
    endTime: '11:30 AM',
    // Added missing date property (Line 5 fix)
    date: '2024-01-01',
    organizer: 'Sarah Chen',
    type: 'INTERNAL',
    isOngoing: true
  },
  {
    id: '2',
    title: 'Weekly Client Sync',
    startTime: '12:00 PM',
    endTime: '01:00 PM',
    // Added missing date property (Line 14 fix)
    date: '2024-01-01',
    organizer: 'Alex Rivera',
    type: 'CLIENT'
  },
  {
    id: '3',
    title: 'Design Review',
    startTime: '02:00 PM',
    endTime: '03:30 PM',
    // Added missing date property (Line 22 fix)
    date: '2024-01-01',
    organizer: 'Mike D.',
    type: 'INTERNAL'
  }
];

export const AMENITIES_DATA: Amenity[] = [
  {
    id: 'wifi',
    img: '',
    icon: 'wifi',
    title: 'WiFi',
    subtitle: 'Enterprise 1Gbps',
    description: 'High-speed dedicated fiber optic connection with 99.9% uptime. Supports up to 50 concurrent devices with low latency for video conferencing.',
    status: 'Operational'
  },
  {
    id: 'video',
    img: 'https://images.unsplash.com/photo-1633519154842-19dca2f25608?auto=format&fit=crop&q=80&w=600',
    icon: 'videocam',
    title: 'Video Conf.',
    subtitle: '4K Camera Setup',
    description: 'Logitech Rally Plus system with dual 4K cameras, beamforming microphones, and crystal-clear speakers. Compatible with Zoom, Teams, and Google Meet.',
    quantity: '1 System',
    status: 'Operational'
  },
  {
    id: 'display',
    img: 'https://images.unsplash.com/photo-1531403009284-440f080d1e12?auto=format&fit=crop&q=80&w=600',
    icon: 'tv',
    title: 'Smart Display',
    subtitle: '85" 4K UHD',
    description: 'Large format touch-enabled display with built-in digital whiteboarding capabilities. Wireless screen sharing via AirPlay and Chromecast.',
    quantity: '2 Screens',
    status: 'Operational'
  },
  {
    id: 'climate',
    img: 'https://images.unsplash.com/photo-1585338663442-974a6797a387?auto=format&fit=crop&q=80&w=600',
    icon: 'ac_unit',
    title: 'Climate',
    subtitle: 'Smart Control',
    description: 'Individual HVAC control with HEPA filtration system. Automated CO2 monitoring and adjustment for optimal comfort during long meetings.',
    status: 'Optimal'
  }
];

export const ROOM_INFO: RoomStatus = {
  name: 'Executive Boardroom',
  location: 'Building A • Floor 3 • Room 302',
  isAvailable: false,
  capacity: 12,
  currentMeeting: MOCK_MEETINGS[0],
  nextMeeting: MOCK_MEETINGS[1]
};
