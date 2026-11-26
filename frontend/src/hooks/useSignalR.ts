import { useEffect, useRef } from 'react';
import * as signalR from '@microsoft/signalr';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export interface CourtSlotUpdate {
  courtId: number;
  date: string;
  timeSlotId: number;
  status: string;
}

/**
 * Hook kết nối SignalR cho notifications.
 * Tự động connect khi user đăng nhập, disconnect khi logout.
 */
export function useSignalR() {
  const { token, isAuthenticated } = useAuthStore();

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

    return () => {
      connection.stop();
    };
  }, [isAuthenticated, token]);
}

/**
 * Hook theo dõi trạng thái sân real-time cho 1 cơ sở.
 */
export function useCourtStatus(
  facilityId: number | null,
  date: string | null,
  onSlotUpdated: (update: CourtSlotUpdate) => void,
) {
  const onSlotUpdatedRef = useRef(onSlotUpdated);

  useEffect(() => {
    onSlotUpdatedRef.current = onSlotUpdated;
  }, [onSlotUpdated]);

  useEffect(() => {
    if (!facilityId || !date) return;

    let disposed = false;
    const connection = new signalR.HubConnectionBuilder()
      .withUrl(`${API_URL}/hubs/court-status`)
      .withAutomaticReconnect()
      .build();

    const joinFacilityGroup = () => connection.invoke('JoinFacilityGroup', facilityId, date);

    connection.on('CourtSlotUpdated', (data: CourtSlotUpdate) => {
      if (data.date === date) onSlotUpdatedRef.current(data);
    });

    connection.onreconnected(() => {
      if (!disposed) {
        void joinFacilityGroup().catch(() => {
          toast.error('Đã kết nối lại nhưng không thể đăng ký nhận cập nhật lịch sân.');
        });
      }
    });

    connection.start()
      .then(() => {
        if (!disposed) return joinFacilityGroup();
      })
      .catch(() => {
        if (!disposed) toast.error('Không thể kết nối cập nhật lịch sân theo thời gian thực.');
      });

    return () => {
      disposed = true;
      if (connection.state === signalR.HubConnectionState.Connected) {
        void connection.invoke('LeaveFacilityGroup', facilityId, date)
          .catch((error: unknown) => console.error('Unable to leave the court status group.', error))
          .finally(() => connection.stop().catch((error: unknown) => console.error('Unable to stop the court status connection.', error)));
      } else {
        void connection.stop().catch((error: unknown) => console.error('Unable to stop the court status connection.', error));
      }
    };
  }, [facilityId, date]);
}
