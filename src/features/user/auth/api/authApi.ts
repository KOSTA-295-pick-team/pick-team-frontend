import { apiRequest, tokenManager } from '@/lib/apiClient';
import { LoginRequest, LoginResponse } from '@/features/user/types/user';

// 백엔드의 ApiResponse<T> 에 대응하는 타입
interface ApiResponse<T> {
  message: string;
  data: T;
}

export const authApi = {
  // 로그인
  login: async (credentials: LoginRequest): Promise<LoginResponse> => {
    // ApiResponse<LoginResponse> 형태로 응답을 기대하도록 수정
    const response = await apiRequest<ApiResponse<LoginResponse>>('/users/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });

    // response.data 에서 실제 LoginResponse 객체를 추출
    if (response && response.data && response.data.accessToken) {
      const loginData = response.data;
      tokenManager.setAccessToken(loginData.accessToken);
      if (loginData.refreshToken) {
        tokenManager.setRefreshToken(loginData.refreshToken);
      }
      return loginData;
    }
    throw new Error('로그인에 실패했습니다.');
  },

  // 로그아웃
  logout: async (): Promise<void> => {
    try {
      await apiRequest('/users/logout', { method: 'POST' });
    } catch (error) {
      console.error('Logout API call failed, proceeding with local cleanup.', error);
    } finally {
      tokenManager.clearTokens();
    }
  },

  // 토큰 갱신
  refreshToken: async (): Promise<void> => {
    const refreshToken = tokenManager.getRefreshToken();
    if (!refreshToken) throw new Error('No refresh token available.');

    const response = await apiRequest<{ accessToken: string }>('/users/refresh', {
        method: 'POST',
        body: JSON.stringify({ refreshToken }),
    });

    if (response && response.accessToken) {
        tokenManager.setAccessToken(response.accessToken);
    } else {
        throw new Error('토큰 갱신에 실패했습니다.');
    }
  }
}; 