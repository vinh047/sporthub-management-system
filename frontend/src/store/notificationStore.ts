
import { create } from 'zustand';
import {
    notificationApi,
    type Notification,
} from '../api/notificationApi';

interface NotificationState {
    notifications: Notification[];
    isLoading: boolean;
    error: string | null;
    unreadCount: number;

    fetchNotifications: () => Promise<void>;
    markAsRead: (id: number) => Promise<void>;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
    notifications: [],
    isLoading: false,
    error: null,
    unreadCount: 0,

    fetchNotifications: async () => {
        set({ isLoading: true, error: null });

        try {
            const notifications = await notificationApi.getMyNotifications();

            set({
                notifications,
                unreadCount: notifications.filter(item => !item.isRead).length,
                isLoading: false,
            });
        } catch (error) {
            set({
                error: error instanceof Error
                    ? error.message
                    : 'Không thể tải thông báo.',
                isLoading: false,
            });
        }
    },

    markAsRead: async (id: number) => {
        try {
            await notificationApi.markAsRead(id);

            const notifications = get().notifications.map(item =>
                item.id === id
                    ? { ...item, isRead: true }
                    : item
            );

            set({
                notifications,
                unreadCount: notifications.filter(item => !item.isRead).length,
            });
        } catch (error) {
            set({
                error: error instanceof Error
                    ? error.message
                    : 'Không thể đánh dấu đã đọc.',
            });
        }
    },
}));
