
import { Meeting, User, Attendee } from '../types';

const DB_KEY = 'everest_meetings_db';

const MOCK_EMPLOYEES: User[] = [
  {
    employeeId: '1234',
    name: 'Sarah Chen',
    role: 'Lead Strategist',
    photo: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=150'
  },
  {
    employeeId: '5678',
    name: 'Marcus Aurelius',
    role: 'Executive Director',
    photo: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=150'
  },
  {
    employeeId: '9999',
    name: 'Alex Rivera',
    role: 'Senior Architect',
    photo: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=150'
  }
];

const getTodayISO = () => new Date().toISOString().split('T')[0];

const getInitialData = (): Meeting[] => {
  const now = new Date();
  const today = getTodayISO();
  
  const formatTime = (d: Date) => {
    let hours = d.getHours();
    const minutes = d.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')} ${ampm}`;
  };

  const urgentStart = new Date(now.getTime() + 4 * 60000);
  const urgentEnd = new Date(urgentStart.getTime() + 60 * 60000);

  const currentStart = new Date(now.getTime() - 20 * 60000);
  const currentEnd = new Date(now.getTime() + 2 * 60000); 
  
  return [
    {
      id: '1',
      title: 'Current Team Sync',
      startTime: formatTime(currentStart),
      endTime: formatTime(currentEnd),
      date: today,
      organizer: 'Sarah Chen',
      organizerPhoto: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=150',
      attendees: [
        { name: 'Sarah Chen', photo: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=150' },
        { name: 'James Miller', photo: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=150' },
        { name: 'Elena Rodriguez', photo: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=150' }
      ],
      type: 'INTERNAL'
    },
    {
      id: '2',
      title: 'Executive Review',
      startTime: formatTime(urgentStart),
      endTime: formatTime(urgentEnd),
      date: today,
      organizer: 'Marcus Aurelius',
      organizerPhoto: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=150',
      attendees: [
        { name: 'Marcus Aurelius', photo: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=150' },
        { name: 'Seneca', photo: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=150' },
        { name: 'Cicero', photo: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&q=80&w=150' }
      ],
      type: 'CLIENT'
    },
    {
      id: '3',
      title: 'Global Architecture Sync',
      startTime: '08:00 PM',
      endTime: '09:00 PM',
      date: today,
      organizer: 'Alex Rivera',
      organizerPhoto: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=150',
      attendees: [
        { name: 'Alex Rivera', photo: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=150' },
        { name: 'Jordan V.', photo: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&q=80&w=150' }
      ],
      type: 'INTERNAL'
    }
  ];
};

export const db = {
  init: () => {
    if (!localStorage.getItem(DB_KEY)) {
      localStorage.setItem(DB_KEY, JSON.stringify(getInitialData()));
    }
  },
  
  getMeetings: (date?: string): Meeting[] => {
    const data = localStorage.getItem(DB_KEY);
    const meetings: Meeting[] = data ? JSON.parse(data) : [];
    if (date) {
      return meetings.filter(m => m.date === date);
    }
    return meetings;
  },

  getEmployee: (id: string): User | undefined => {
    const found = MOCK_EMPLOYEES.find(e => e.employeeId === id);
    if (!found) return undefined;
    return { ...found, token: '' };
  },
  
  addMeeting: (meeting: Omit<Meeting, 'id'>) => {
    const meetings = db.getMeetings();
    const occurrences: Meeting[] = [];
    const groupId = meeting.recurrence && meeting.recurrence !== 'NONE' 
      ? Math.random().toString(36).substr(2, 9) 
      : undefined;

    const createOccurrence = (dateStr: string) => {
      const newMeeting = { 
        ...meeting, 
        id: Math.random().toString(36).substr(2, 9),
        date: dateStr,
        groupId
      };
      if (!newMeeting.organizerPhoto) {
        newMeeting.organizerPhoto = `https://i.pravatar.cc/150?u=${newMeeting.organizer}`;
      }
      return newMeeting as Meeting;
    };

    if (!meeting.recurrence || meeting.recurrence === 'NONE' || !meeting.recurrenceEndDate) {
      occurrences.push(createOccurrence(meeting.date));
    } else {
      let currentDate = new Date(meeting.date);
      const endDate = new Date(meeting.recurrenceEndDate);
      // Safety cap to prevent browser hanging
      let count = 0;
      while (currentDate <= endDate && count < 365) {
        occurrences.push(createOccurrence(currentDate.toISOString().split('T')[0]));
        
        if (meeting.recurrence === 'DAILY') {
          currentDate.setDate(currentDate.getDate() + 1);
        } else if (meeting.recurrence === 'WEEKLY') {
          currentDate.setDate(currentDate.getDate() + 7);
        } else if (meeting.recurrence === 'MONTHLY') {
          currentDate.setMonth(currentDate.getMonth() + 1);
        }
        count++;
      }
    }

    meetings.push(...occurrences);
    localStorage.setItem(DB_KEY, JSON.stringify(meetings));
    return occurrences[0];
  },

  updateMeeting: (id: string, updates: Partial<Meeting>, updateSeries: boolean = false) => {
    const meetings = db.getMeetings();
    const index = meetings.findIndex(m => m.id === id);
    if (index !== -1) {
      const meeting = meetings[index];
      if (updateSeries && meeting.groupId) {
        // Update all meetings in the group that are on or after this meeting's date
        const updatedMeetings = meetings.map(m => {
          if (m.groupId === meeting.groupId && m.date >= meeting.date) {
            // Don't update the date or ID, but update other fields
            const { id: _, date: __, ...restUpdates } = updates;
            return { ...m, ...restUpdates };
          }
          return m;
        });
        localStorage.setItem(DB_KEY, JSON.stringify(updatedMeetings));
      } else {
        meetings[index] = { ...meetings[index], ...updates };
        localStorage.setItem(DB_KEY, JSON.stringify(meetings));
      }
    }
  },

  deleteMeeting: (id: string, deleteSeries: boolean = false) => {
    const meetings = db.getMeetings();
    const meetingToDelete = meetings.find(m => m.id === id);
    if (!meetingToDelete) return;

    let filtered: Meeting[];
    if (deleteSeries && meetingToDelete.groupId) {
      // Delete all meetings in the group that are on or after this meeting's date
      filtered = meetings.filter(m => !(m.groupId === meetingToDelete.groupId && m.date >= meetingToDelete.date));
    } else {
      filtered = meetings.filter(m => m.id !== id);
    }
    localStorage.setItem(DB_KEY, JSON.stringify(filtered));
  },
  
  clear: () => {
    localStorage.removeItem(DB_KEY);
    db.init();
  }
};
