
import { Meeting, User } from '../types';

const DB_KEY = 'everest_meetings_db';

export const db = {
  init: () => {
    const data = localStorage.getItem(DB_KEY);
    if (!data) {
      localStorage.setItem(DB_KEY, JSON.stringify([]));
      return;
    }
    // Wipe old seeded mock data (IDs '1', '2', '3' with fake organizers)
    try {
      const meetings: Meeting[] = JSON.parse(data);
      const hasMock = meetings.some(m => ['1', '2', '3'].includes(m.id) && ['Sarah Chen', 'Marcus Aurelius', 'Alex Rivera'].includes(m.organizer));
      if (hasMock) localStorage.setItem(DB_KEY, JSON.stringify([]));
    } catch {
      localStorage.setItem(DB_KEY, JSON.stringify([]));
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

  addMeeting: (meeting: Omit<Meeting, 'id'>) => {
    const meetings = db.getMeetings();
    const occurrences: Meeting[] = [];
    const groupId = meeting.recurrence && meeting.recurrence !== 'NONE'
      ? Math.random().toString(36).substr(2, 9)
      : undefined;

    const createOccurrence = (dateStr: string) => {
      return { ...meeting, id: Math.random().toString(36).substr(2, 9), date: dateStr, groupId } as Meeting;
    };

    if (!meeting.recurrence || meeting.recurrence === 'NONE' || !meeting.recurrenceEndDate) {
      occurrences.push(createOccurrence(meeting.date));
    } else {
      let currentDate = new Date(meeting.date);
      const endDate = new Date(meeting.recurrenceEndDate);
      let count = 0;
      while (currentDate <= endDate && count < 365) {
        occurrences.push(createOccurrence(currentDate.toISOString().split('T')[0]));
        if (meeting.recurrence === 'DAILY') currentDate.setDate(currentDate.getDate() + 1);
        else if (meeting.recurrence === 'WEEKLY') currentDate.setDate(currentDate.getDate() + 7);
        else if (meeting.recurrence === 'MONTHLY') currentDate.setMonth(currentDate.getMonth() + 1);
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
        const updatedMeetings = meetings.map(m => {
          if (m.groupId === meeting.groupId && m.date >= meeting.date) {
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
      filtered = meetings.filter(m => !(m.groupId === meetingToDelete.groupId && m.date >= meetingToDelete.date));
    } else {
      filtered = meetings.filter(m => m.id !== id);
    }
    localStorage.setItem(DB_KEY, JSON.stringify(filtered));
  },

  getEmployee: (_code: string): { name: string } | null => {
    // Employee lookup via badge/code is not implemented; always returns null
    return null;
  },

  clear: () => {
    localStorage.removeItem(DB_KEY);
    localStorage.setItem(DB_KEY, JSON.stringify([]));
  }
};
