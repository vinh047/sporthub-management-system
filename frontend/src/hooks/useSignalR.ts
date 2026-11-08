import { useEffect, useRef } from 'react';
import * as signalR from '@microsoft/signalr';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

/**
 * Hook kết nối SignalR cho notifications.
 * Tự động connect khi user đăng nhập, disconnect khi logout.
 */
export function useSignalR() {
  const { token, isAuthenticated } = useAuthStore();
  const connectionRef = useRef<signalR.HubConnection | null>(null);

  useEffect(() => {
    if (!isAuthenticated || !token) return;

    const connection = new signalR.HubConnectionBuilder()
      .withUrl(`${API_URL}/hubs/notifications`, {
        accessTokenFactory: () => token,
      })
      .withAutomaticReconnect()
      .configureLogging(signalR.LogLevel.Warning)
      .build();

    // Nhận thông báo từ server
    connection.on('ReceiveNotification', (data: { title: string; content: string }) => {
      toast(data.content, { icon: '🔔' });
    });

    connection.start().catch(console.error);
    connectionRef.current = connection;

    return () => {
      connection.stop();
    };
  }, [isAuthenticated, token]);

  return connectionRef.current;
}

/**
 * Hook theo dõi trạng thái sân real-time cho 1 cơ sở.
 */
export function useCourtStatus(facilityId: number | null) {
  const connectionRef = useRef<signalR.HubConnection | null>(null);

  useEffect(() => {
    if (!facilityId) return;

    const connection = new signalR.HubConnectionBuilder()
      .withUrl(`${API_URL}/hubs/courts`)
      .withAutomaticReconnect()
      .build();

    connection.on('CourtSlotUpdated', (data: { courtId: number; slotInfo: string }) => {
      // TODO: Dispatch to local state hoặc React Query invalidate
      console.log('Court slot updated:', data);
    });

    connection.start().then(() => {
      connection.invoke('JoinFacilityGroup', facilityId);
    }).catch(console.error);

    connectionRef.current = connection;

    return () => {
      connection.invoke('LeaveFacilityGroup', facilityId).finally(() => connection.stop());
    };
  }, [facilityId]);
}
