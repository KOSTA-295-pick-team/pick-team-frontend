import { apiRequest, tokenManager } from '@/lib/apiClient';
import { LoginRequest, LoginResponse } from '@/features/user/types/user';

// 백엔드의 ApiResponse 래퍼 타입
interface ApiResponse<T> {
  success: boolean;
  message: string;
  errorCode: string | null;
  data: T;
}

export const authApi = {
  // 로그인
  login: async (credentials: LoginRequest): Promise<LoginResponse> => {
    const response = await apiRequest<ApiResponse<LoginResponse>>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });

    // response.data 에서 실제 LoginResponse 객체를 추출
    if (response && response.success && response.data && response.data.token) {
      const loginData = response.data;
      tokenManager.setAccessToken(loginData.token); // token 필드 사용
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
      await apiRequest('/auth/logout', { method: 'POST' });
    } catch (error) {
      // 백엔드 로그아웃 실패해도 로컬 정리는 진행
      console.warn('Backend logout failed, but clearing local tokens:', error);
    } finally {
      // 백엔드 성공/실패 관계없이 로컬 토큰은 항상 정리
      tokenManager.clearTokens();
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

    if (response && response.token) {
        tokenManager.setAccessToken(response.token);
        if (response.refreshToken) {
            tokenManager.setRefreshToken(response.refreshToken);
        }
    } else {
        throw new Error('토큰 갱신에 실패했습니다.');
    }
  }
}; 