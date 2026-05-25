
import React from 'react';
import { RoomStatus, HomeLayout } from '../types';
import DefaultLayout from './layouts/DefaultLayout';
import ModernPillLayout from './layouts/ModernPillLayout';
import SplitScreenLayout from './layouts/SplitScreenLayout';
import ClockSlotsLayout from './layouts/ClockSlotsLayout';

interface DashboardViewProps {
  currentTime: Date;
  roomStatus: RoomStatus;
  isSyncing: boolean;
  layout: HomeLayout;
  onBook: (startTime?: string, meetingId?: string) => void;
  onShowMeetingDetails: (meetingId: string) => void;
  onCheckIn: () => void;
  onExtend: (id: string) => void;
  onEndNow: (id: string) => void;
  onShowDetails: () => void;
  slotPrecision: 15 | 30;
  enableAtmosphericBg: boolean;
}

const DashboardView: React.FC<DashboardViewProps> = ({ currentTime, roomStatus, isSyncing, layout, onBook, onShowMeetingDetails, onCheckIn, onExtend, onEndNow, onShowDetails, slotPrecision, enableAtmosphericBg }) => {
  const layoutProps = { currentTime, roomStatus, isSyncing, onBook, onShowMeetingDetails, onCheckIn, onExtend, onEndNow, onShowDetails, slotPrecision, enableAtmosphericBg };

  switch (layout) {
    case HomeLayout.MODERN_PILL:
      return <ModernPillLayout {...layoutProps} />;
    case HomeLayout.SPLIT_SCREEN:
      return <SplitScreenLayout {...layoutProps} />;
    case HomeLayout.CLOCK_SLOTS:
      return <ClockSlotsLayout {...layoutProps} />;
    case HomeLayout.DEFAULT:
    default:
      return <DefaultLayout {...layoutProps} />;
  }
};

export default DashboardView;
