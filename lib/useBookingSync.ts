import * as signalR from '@microsoft/signalr';
import { useEffect, useRef } from 'react';
import { getBaseUrl } from './hostUrl';

let _connection: signalR.HubConnection | null = null;

function getConnection(): signalR.HubConnection {
  if (!_connection) {
    _connection = new signalR.HubConnectionBuilder()
      .withUrl(`${getBaseUrl()}/hubs/bookings`, { withCredentials: true })
      .withAutomaticReconnect()
      .configureLogging(signalR.LogLevel.Warning)
      .build();
  }
  return _connection;
}

export function useBookingSync(
  resourceId: string | null,
  onSync: () => void,
  onResourceUpdated?: (event: { id: string; label: string; capacity: number; [key: string]: unknown }) => void,
  onAmenitiesUpdated?: (event: { resourceId: string }) => void,
  onAmenityChanged?: (event: unknown) => void,
) {
  // Keep a stable ref so the effect doesn't re-run when onSync identity changes
  const onSyncRef = useRef(onSync);
  useEffect(() => { onSyncRef.current = onSync; }, [onSync]);

  const onResourceUpdatedRef = useRef(onResourceUpdated);
  useEffect(() => { onResourceUpdatedRef.current = onResourceUpdated; }, [onResourceUpdated]);

  const onAmenitiesUpdatedRef = useRef(onAmenitiesUpdated);
  useEffect(() => { onAmenitiesUpdatedRef.current = onAmenitiesUpdated; }, [onAmenitiesUpdated]);

  const onAmenityChangedRef = useRef(onAmenityChanged);
  useEffect(() => { onAmenityChangedRef.current = onAmenityChanged; }, [onAmenityChanged]);

  useEffect(() => {
    if (!resourceId) return;

    const conn = getConnection();

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

    conn.on('BookingCreated', handleCreated);
    conn.on('BookingUpdated', handleUpdated);
    conn.on('BookingDeleted', handleDeleted);

    const handleResourceUpdated = (event: any) => {
      console.log('[SignalR] ResourceUpdated', event);
      onResourceUpdatedRef.current?.(event);
    };
    const handleAmenitiesUpdated = (event: any) => {
      console.log('[SignalR] ResourceAmenitiesUpdated', event);
      onAmenitiesUpdatedRef.current?.(event);
    };
    conn.on('ResourceUpdated', handleResourceUpdated);
    conn.on('ResourceAmenitiesUpdated', handleAmenitiesUpdated);

    // Global amenity catalog events (no resourceId payload) — reload current
    // resource so its amenity list reflects the change.
    const handleAmenityChanged = (event: any) => {
      console.log('[SignalR] AmenityChanged', event);
      onAmenityChangedRef.current?.(event);
    };
    conn.on('AmenityCreated', handleAmenityChanged);
    conn.on('AmenityUpdated', handleAmenityChanged);
    conn.on('AmenityDeleted', handleAmenityChanged);

    if (
      conn.state === signalR.HubConnectionState.Disconnected
    ) {
      conn.start().catch(err =>
        console.error('SignalR connection error:', err),
      );
    }

    return () => {
      conn.off('BookingCreated', handleCreated);
      conn.off('BookingUpdated', handleUpdated);
      conn.off('BookingDeleted', handleDeleted);
      conn.off('ResourceUpdated', handleResourceUpdated);
      conn.off('ResourceAmenitiesUpdated', handleAmenitiesUpdated);
      conn.off('AmenityCreated', handleAmenityChanged);
      conn.off('AmenityUpdated', handleAmenityChanged);
      conn.off('AmenityDeleted', handleAmenityChanged);
    };
  }, [resourceId]);
}
