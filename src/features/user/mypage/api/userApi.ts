import { apiRequest } from '@/lib/apiClient';
import { User } from '@/features/user/types/user';
import { ApiResponse } from '@/types'; // 공용 ApiResponse 임포트

export const userApi = {
    getCurrentUser: async (): Promise<User> => {
        const response = await apiRequest<ApiResponse<User>>('/users/me');
        return response.data;
    },

    updateUserProfile: async (profileData: Partial<User>): Promise<User> => {
        const response = await apiRequest<ApiResponse<User>>('/users/me', {
            method: 'PATCH',
            body: JSON.stringify(profileData),
        });
        return response.data;
    }
}; 