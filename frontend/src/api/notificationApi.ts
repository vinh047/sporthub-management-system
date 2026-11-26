
import { axiosInstance } from './axiosInstance';
import { requestAction, requestData } from './apiResponse';

export interface Notification {
    id: number;
    title: string;
    content: string;
    isRead: boolean;
    createdAt: string;
}

export const notificationApi = {
    getMyNotifications: async (): Promise<Notification[]> => {
        return requestData<Notification[]>(
            axiosInstance.get('/Notifications')
        );
    },

    markAsRead: async (id: number): Promise<void> => {
        return requestAction(
            axiosInstance.put(`/Notifications/${id}/read`)
        );
    },
};
