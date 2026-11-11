
import { axiosInstance } from './axiosInstance';

export const avatarApi = {
    upload: async (file: File) => {
        const formData = new FormData();
        formData.append('file', file);

        const response = await axiosInstance.post(
            '/PlayerProfiles/me/avatar',
            formData
        );

        return response.data;
    },

    delete: async () => {
        const response = await axiosInstance.delete(
            '/PlayerProfiles/me/avatar'
        );

        return response.data;
    },
};
