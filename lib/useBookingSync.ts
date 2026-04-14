import * as signalR from '@microsoft/signalr';
import { useEffect, useRef } from 'react';

const connection = new signalR.HubConnectionBuilder()
  .withUrl('https://sb.asasconnect.com/hubs/bookings', {
    withCredentials: true,
  })
  .withAutomaticReconnect()
  .configureLogging(signalR.LogLevel.Warning)
  .build();

export function useBookingSync(
  resourceId: string | null,
  onSync: () => void,
) {
  // Keep a stable ref so the effect doesn't re-run when onSync identity changes
  const onSyncRef = useRef(onSync);
  useEffect(() => { onSyncRef.current = onSync; }, [onSync]);

  useEffect(() => {
    if (!resourceId) return;

    const handleCreated = (booking: any) => {
      if (booking?.resourceId === resourceId || booking?.ResourceId === resourceId) {
        onSyncRef.current();
      }
    };
    const handleUpdated = (booking: any) => {
      if (booking?.resourceId === resourceId || booking?.ResourceId === resourceId) {
        onSyncRef.current();
      }
    };
    const handleDeleted = (booking: any) => {
      if (booking?.resourceId === resourceId || booking?.ResourceId === resourceId) {
        onSyncRef.current();
      }
    };

    connection.on('BookingCreated', handleCreated);
    connection.on('BookingUpdated', handleUpdated);
    connection.on('BookingDeleted', handleDeleted);

    if (
      connection.state === signalR.HubConnectionState.Disconnected
    ) {
      connection.start().catch(err =>
        console.error('SignalR connection error:', err),
      );
    }

    return () => {
      connection.off('BookingCreated', handleCreated);
      connection.off('BookingUpdated', handleUpdated);
      connection.off('BookingDeleted', handleDeleted);
    };
  }, [resourceId]);
}
