// API 서비스 - 백엔드와의 통신을 담당하는 스크립트
// 순환 참조 방지를 위해 authApi를 분리

const API_BASE_URL = '/api';

// JWT 토큰 관리
const TOKEN_KEY = 'auth_token';
const REFRESH_TOKEN_KEY = 'refresh_token';

export const tokenManager = {
  getAccessToken: () => localStorage.getItem(TOKEN_KEY),
  setAccessToken: (token: string) => localStorage.setItem(TOKEN_KEY, token),
  getRefreshToken: () => localStorage.getItem(REFRESH_TOKEN_KEY),
  setRefreshToken: (token: string) => localStorage.setItem(REFRESH_TOKEN_KEY, token),
  clearTokens: () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  }
};

// API 에러 처리 함수
export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

// HTTP 요청 래퍼 함수
export async function apiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  const token = tokenManager.getAccessToken();
  
  const config: RequestInit = {
    headers: {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` }),
      ...options.headers,
    },
    ...options,
  };

  try {
    const response = await fetch(url, config);
    
    // 401 오류 시 토큰 갱신 시도 (로그인 API 제외)
    if (response.status === 401 && !endpoint.includes('/login') && !endpoint.includes('/refresh')) {
      const refreshTokenValue = tokenManager.getRefreshToken();
      if (refreshTokenValue) {
        try {
          const { authApi } = await import('@/features/user/auth/api/authApi');
          await authApi.refreshToken(); // 분리된 authApi 사용
          // 새 토큰으로 다시 요청
          const newToken = tokenManager.getAccessToken();
          const retryConfig: RequestInit = {
            ...config,
            headers: {
              ...config.headers,
              'Authorization': `Bearer ${newToken}`,
            }
          };
          const retryResponse = await fetch(url, retryConfig);
          
          if (!retryResponse.ok) {
            const errorData = await retryResponse.text();
            throw new ApiError(retryResponse.status, errorData || `HTTP ${retryResponse.status}`);
          }

          const contentType = retryResponse.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            return await retryResponse.json();
          }
          
          return await retryResponse.text() as T;
        } catch (refreshError) {
          // 토큰 갱신 실패 시 로그인 페이지로 리다이렉트
          tokenManager.clearTokens();
          if (typeof window !== 'undefined') {
            window.location.hash = '/login';
          }
          throw new ApiError(401, '인증이 만료되었습니다. 다시 로그인해주세요.');
        }
      } else {
        // 리프레시 토큰이 없으면 로그인 페이지로
        tokenManager.clearTokens();
        if (typeof window !== 'undefined') {
          window.location.hash = '/login';
        }
        throw new ApiError(401, '인증이 필요합니다. 로그인해주세요.');
      }
    }
    
    if (!response.ok) {
      const errorData = await response.text();
      throw new ApiError(response.status, errorData || `HTTP ${response.status}`);
    }

    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return await response.json();
    }
    
    return await response.text() as T;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    console.error('API request failed:', error); 
    throw new ApiError(0, '네트워크 연결에 실패했습니다. 서버가 실행 중인지 확인해주세요.');
  }
} 