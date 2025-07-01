// API 서비스 - 백엔드와의 통신을 담당하는 스크립트
import { User, Workspace } from '../types';

const API_BASE_URL = 'http://localhost:8081/api';

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
class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

// HTTP 요청 래퍼 함수
async function apiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
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
      const refreshToken = tokenManager.getRefreshToken();
      if (refreshToken) {
        try {
          await authApi.refreshToken();
          // 새 토큰으로 다시 요청
          const newToken = tokenManager.getAccessToken();
          const retryConfig = {
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
            window.location.href = '/login';
          }
          throw new ApiError(401, '인증이 만료되었습니다. 다시 로그인해주세요.');
        }
      } else {
        // 리프레시 토큰이 없으면 로그인 페이지로
        tokenManager.clearTokens();
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
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
    throw new ApiError(0, '네트워크 연결에 실패했습니다. 서버가 실행 중인지 확인해주세요.');
  }
}

// 인증 관련 API
export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: {
    id: number;
    email: string;
    name: string;
    profilePictureUrl?: string;
    mbti?: string;
    role: string;
    age?: number;
    introduction?: string;
    disposition?: string;
  };
}

export const authApi = {
  // 로그인
  login: async (data: LoginRequest): Promise<LoginResponse> => {
    console.log('🔐 authApi.login 시작! data:', data);
    const response = await apiRequest<{success: boolean; message: string; data: LoginResponse}>('/users/login', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    console.log('🔐 authApi.login apiRequest 응답:', response);
    
    if (response.success && response.data) {
      // 토큰 저장
      tokenManager.setAccessToken(response.data.accessToken);
      tokenManager.setRefreshToken(response.data.refreshToken);
      return response.data;
    }
    
    throw new ApiError(400, response.message || '로그인에 실패했습니다.');
  },

  // 로그아웃
  logout: async (): Promise<void> => {
    try {
      await apiRequest<void>('/users/logout', {
        method: 'POST',
      });
    } finally {
      // 로컬 토큰은 항상 삭제
      tokenManager.clearTokens();
    }
  },

  // 토큰 갱신
  refreshToken: async (): Promise<LoginResponse> => {
    const refreshToken = tokenManager.getRefreshToken();
    if (!refreshToken) {
      throw new ApiError(401, '리프레시 토큰이 없습니다.');
    }

    const response = await apiRequest<{success: boolean; message: string; data: LoginResponse}>('/users/refresh', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    });

    if (response.success && response.data) {
      // 새 토큰 저장
      tokenManager.setAccessToken(response.data.accessToken);
      tokenManager.setRefreshToken(response.data.refreshToken);
      return response.data;
    }

    throw new ApiError(401, response.message || '토큰 갱신에 실패했습니다.');
  }
};

// 워크스페이스 API 서비스
export const workspaceApi = {
  // 워크스페이스 응답 데이터 변환 헬퍼 함수
  transformWorkspaceResponse: (workspace: any): Workspace => ({
    ...workspace,
    id: workspace.id.toString(),
    owner: {
      ...workspace.owner,
      id: workspace.owner.id.toString(),
    },
    members: workspace.members.map((member: any) => ({
      ...member,
      id: member.id.toString(),
    })),
  }),

  // 워크스페이스 생성
  create: async (data: { name: string; iconUrl?: string; password?: string }): Promise<Workspace> => {
    const response = await apiRequest<{success: boolean; message: string; data: any}>('/workspaces', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    
    if (response.success && response.data) {
      return workspaceApi.transformWorkspaceResponse(response.data);
    }
    
    throw new ApiError(400, response.message || '워크스페이스 생성에 실패했습니다.');
  },

  // 워크스페이스 참여
  join: async (data: { inviteCode: string; password?: string }): Promise<Workspace> => {
    const response = await apiRequest<{success: boolean; message: string; data: any}>('/workspaces/join', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    
    if (response.success && response.data) {
      return workspaceApi.transformWorkspaceResponse(response.data);
    }
    
    throw new ApiError(400, response.message || '워크스페이스 참여에 실패했습니다.');
  },

  // 내 워크스페이스 목록 조회
  getMyWorkspaces: async (): Promise<Workspace[]> => {
    const response = await apiRequest<{success: boolean; message: string; data: any[]}>('/workspaces/my');
    
    if (response.success && response.data) {
      return response.data.map(workspace => workspaceApi.transformWorkspaceResponse(workspace));
    }
    
    throw new ApiError(400, response.message || '워크스페이스 목록 조회에 실패했습니다.');
  },

  // 워크스페이스 상세 조회
  getById: async (id: string): Promise<Workspace> => {
    const response = await apiRequest<{success: boolean; message: string; data: any}>(`/workspaces/${id}`);
    
    if (response.success && response.data) {
      return workspaceApi.transformWorkspaceResponse(response.data);
    }
    
    throw new ApiError(400, response.message || '워크스페이스 조회에 실패했습니다.');
  },

  // 워크스페이스 멤버 목록 조회
  getMembers: async (id: string): Promise<User[]> => {
    const response = await apiRequest<{success: boolean; message: string; data: any[]}>(`/workspaces/${id}/members`);
    
    if (response.success && response.data) {
      return response.data.map((member: any) => ({
        ...member,
        id: member.id.toString(),
      }));
    }
    
    throw new ApiError(400, response.message || '워크스페이스 멤버 조회에 실패했습니다.');
  },

  // 워크스페이스 업데이트
  update: async (id: string, data: { name?: string; iconUrl?: string; password?: string }): Promise<Workspace> => {
    const response = await apiRequest<{success: boolean; message: string; data: any}>(`/workspaces/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    
    if (response.success && response.data) {
      return workspaceApi.transformWorkspaceResponse(response.data);
    }
    
    throw new ApiError(400, response.message || '워크스페이스 업데이트에 실패했습니다.');
  },

  // 새 초대링크 생성
  generateInviteCode: async (id: string): Promise<string> => {
    const response = await apiRequest<{success: boolean; message: string; data: {inviteCode: string}}>(`/workspaces/${id}/invite-code`, {
      method: 'POST',
    });
    
    if (response.success && response.data) {
      return response.data.inviteCode;
    }
    
    throw new ApiError(400, response.message || '초대링크 생성에 실패했습니다.');
  },

  // 멤버 내보내기
  kickMember: async (workspaceId: string, memberId: string): Promise<void> => {
    const response = await apiRequest<{success: boolean; message: string; data: null}>(`/workspaces/${workspaceId}/members/${memberId}`, {
      method: 'DELETE',
    });
    
    if (!response.success) {
      throw new ApiError(400, response.message || '멤버 내보내기에 실패했습니다.');
    }
  },

  // 멤버 밴
  banMember: async (workspaceId: string, memberId: string): Promise<void> => {
    const response = await apiRequest<{success: boolean; message: string; data: null}>(`/workspaces/${workspaceId}/members/${memberId}/ban`, {
      method: 'POST',
    });
    
    if (!response.success) {
      throw new ApiError(400, response.message || '멤버 차단에 실패했습니다.');
    }
  },

  // 워크스페이스 삭제
  delete: async (id: string): Promise<void> => {
    const response = await apiRequest<{success: boolean; message: string; data: null}>(`/workspaces/${id}`, {
      method: 'DELETE',
    });
    
    if (!response.success) {
      throw new ApiError(400, response.message || '워크스페이스 삭제에 실패했습니다.');
    }
  },
};

// 사용자 API
export const userApi = {
  // 현재 사용자 정보 조회
  getCurrentUser: async (): Promise<User> => {
    const response = await apiRequest<{success: boolean; message: string; data: any}>('/users/me');
    
    if (response.success && response.data) {
      return {
        id: response.data.id.toString(),
        email: response.data.email,
        name: response.data.name,
        profilePictureUrl: response.data.profilePictureUrl || `https://picsum.photos/seed/${response.data.email}/100/100`,
        mbti: response.data.mbti || 'ISTP',
        tags: response.data.tags || ['#팀워크', '#협업'],
      };
    }
    
    throw new ApiError(400, response.message || '사용자 정보를 불러올 수 없습니다.');
  },
};

export { ApiError }; 