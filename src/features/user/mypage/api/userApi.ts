import { userApi as userServiceApi } from '@/lib/userApi';
import { User } from '@/features/user/types/user';

export const userApi = {
    getCurrentUser: async (): Promise<User> => {
        const response = await userServiceApi.getMyProfile();
        return response.data;
    },

    updateUserProfile: async (profileData: Partial<User>): Promise<User> => {
        const response = await userServiceApi.updateMyProfile(profileData);
        return response.data;
    },

    uploadProfileImage: async (file: File): Promise<string> => {
        const response = await userServiceApi.uploadProfileImage(file);
        return response.data.profileImageUrl;
    },

    changePassword: async (currentPassword: string, newPassword: string): Promise<void> => {
        await userServiceApi.changePassword({ currentPassword, newPassword });
    },

    searchHashtags: async (query: string): Promise<string[]> => {
        const response = await userServiceApi.searchHashtags(query);
        return response.data.hashtags;
    }
}; 