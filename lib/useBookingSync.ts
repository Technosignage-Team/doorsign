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
  onResourceUpdated?: (event: { id: string; label: string; capacity: number; [key: string]: unknown }) => void,
  onAmenitiesUpdated?: (event: { resourceId: string }) => void,
) {
  // Keep a stable ref so the effect doesn't re-run when onSync identity changes
  const onSyncRef = useRef(onSync);
  useEffect(() => { onSyncRef.current = onSync; }, [onSync]);

  const onResourceUpdatedRef = useRef(onResourceUpdated);
  useEffect(() => { onResourceUpdatedRef.current = onResourceUpdated; }, [onResourceUpdated]);

  const onAmenitiesUpdatedRef = useRef(onAmenitiesUpdated);
  useEffect(() => { onAmenitiesUpdatedRef.current = onAmenitiesUpdated; }, [onAmenitiesUpdated]);

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

    const handleResourceUpdated = (event: any) => {
      console.log('[SignalR] ResourceUpdated', event);
      onResourceUpdatedRef.current?.(event);
    };
    const handleAmenitiesUpdated = (event: any) => {
      console.log('[SignalR] ResourceAmenitiesUpdated', event);
      onAmenitiesUpdatedRef.current?.(event);
    };
    connection.on('ResourceUpdated', handleResourceUpdated);
    connection.on('ResourceAmenitiesUpdated', handleAmenitiesUpdated);

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
      connection.off('ResourceUpdated', handleResourceUpdated);
      connection.off('ResourceAmenitiesUpdated', handleAmenitiesUpdated);
    };
  }, [resourceId]);
}
