
import { useEffect, useRef } from 'react';
import * as signalR from '@microsoft/signalr';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';
import { useNotificationStore } from '../store/notificationStore';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export interface CourtSlotUpdate {
    courtId: number;
    date: string;
    timeSlotId: number;
    status: string;
}

/**
 * Hook kết nối SignalR cho notifications.
 * Tự động kết nối khi đăng nhập và ngắt kết nối khi đăng xuất.
 */
export function useSignalR() {
    const token = useAuthStore((state) => state.token);
    const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

    useEffect(() => {
        if (!isAuthenticated || !token) {
            console.log('SignalR: Chưa đăng nhập hoặc chưa có token');
            return;
        }

        console.log('SignalR: Đang khởi tạo kết nối...');

        const connection = new signalR.HubConnectionBuilder()
            .withUrl(`${API_URL}/hubs/notifications`, {
                accessTokenFactory: () => token,
            })
            .withAutomaticReconnect()
            .configureLogging(signalR.LogLevel.Information)
            .build();

        connection.on(
            'ReceiveNotification',
            (data: { title: string; content: string }) => {
                console.log('🔔 Đã nhận thông báo từ Backend:', data);

                toast(data.content, {
                    icon: '🔔',
                    duration: 4000,
                });

                // Tải lại danh sách thông báo từ Database.
                void useNotificationStore.getState().fetchNotifications();
            }
        );

        connection.onreconnecting((error) => {
            console.warn('SignalR đang kết nối lại:', error);
        });

        connection.onreconnected((connectionId) => {
            console.log('SignalR đã kết nối lại:', connectionId);
        });

        connection.onclose((error) => {
            console.error('SignalR đã ngắt kết nối:', error);
        });

        let disposed = false;

        connection.start()
            .then(() => {
                if (disposed) {
                    return connection.stop();
                }

                console.log('✅ SignalR connected!');
                console.log('Connection ID:', connection.connectionId);
                console.log('Connection State:', connection.state);
            })
            .catch((error) => {
                console.error('❌ SignalR connection error:', error);
            });

        return () => {
            disposed = true;
            connection.off('ReceiveNotification');
            void connection.stop();
        };
    }, [isAuthenticated, token]);
}

/**
 * Hook theo dõi trạng thái sân real-time cho một cơ sở.
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

        const joinFacilityGroup = () =>
            connection.invoke('JoinFacilityGroup', facilityId, date);

        connection.on('CourtSlotUpdated', (data: CourtSlotUpdate) => {
            if (data.date === date) {
                onSlotUpdatedRef.current(data);
            }
        });

        connection.onreconnected(() => {
            if (!disposed) {
                void joinFacilityGroup().catch(() => {
                    toast.error(
                        'Đã kết nối lại nhưng không thể đăng ký nhận cập nhật lịch sân.'
                    );
                });
            }
        });

        connection.start()
            .then(() => {
                if (!disposed) {
                    return joinFacilityGroup();
                }

                return connection.stop();
            })
            .catch(() => {
                if (!disposed) {
                    toast.error(
                        'Không thể kết nối cập nhật lịch sân theo thời gian thực.'
                    );
                }
            });

        return () => {
            disposed = true;

            if (connection.state === signalR.HubConnectionState.Connected) {
                void connection.invoke('LeaveFacilityGroup', facilityId, date)
                    .catch((error: unknown) => {
                        console.error(
                            'Unable to leave the court status group.',
                            error
                        );
                    })
                    .finally(() => {
                        void connection.stop().catch((error: unknown) => {
                            console.error(
                                'Unable to stop the court status connection.',
                                error
                            );
                        });
                    });
            } else {
                void connection.stop().catch((error: unknown) => {
                    console.error(
                        'Unable to stop the court status connection.',
                        error
                    );
                });
            }
        };
    }, [facilityId, date]);
}
