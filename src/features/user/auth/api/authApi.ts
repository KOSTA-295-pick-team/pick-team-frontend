import { apiRequest, tokenManager } from '@/lib/apiClient';
import { userApi, UserApiError } from '@/lib/userApi';
import { LoginRequest, LoginResponse } from '@/features/user/types/user';

export const authApi = {
  // 로그인 - userApi를 사용하여 통합된 로그인 로직 사용
  login: async (credentials: LoginRequest): Promise<LoginResponse> => {
    try {
      const response = await userApi.login(credentials);
      
      if (response && response.success && response.data) {
        return response.data;
      }
      throw new Error('로그인에 실패했습니다.');
    } catch (error) {
      if (error instanceof UserApiError) {
        throw new Error(error.message);
      }
      throw error;
    }
  },

  // 로그아웃 - userApi를 사용하여 통합된 로그아웃 로직 사용
  logout: async (): Promise<void> => {
    try {
      await userApi.logout();
    } catch (error) {
      // 로그아웃 에러는 로그만 남기고 진행 (토큰은 이미 정리됨)
      console.warn('Backend logout failed, but local tokens cleared:', error);
    }
  },

  // 토큰 갱신
  refreshToken: async (): Promise<void> => {
    const refreshToken = tokenManager.getRefreshToken();
    if (!refreshToken) throw new Error('No refresh token available.');

    const response = await apiRequest<{ token: string; refreshToken: string }>('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    });

    tokenManager.setAccessToken(response.token);
    tokenManager.setRefreshToken(response.refreshToken);
  },

  // 세션 상태 확인
  getSessionStatus: async () => {
    try {
      const response = await userApi.getSessionStatus();
      return response.data;
    } catch (error) {
      if (error instanceof UserApiError) {
        throw new Error(error.message);
      }
      throw error;
    }
  },

  // 내 프로필 조회
  getMyProfile: async () => {
    try {
      const response = await userApi.getMyProfile();
      return response.data;
    } catch (error) {
      if (error instanceof UserApiError) {
        throw new Error(error.message);
      }
      throw error;
    }
  },
}; 