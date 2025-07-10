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
  },
  isTokenExpired: (token: string): boolean => {
    if (!token) return true;
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => 
        '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
      ).join(''));
      const payload = JSON.parse(jsonPayload);
      // 만료 10초 전에 갱신 시도
      return (payload.exp * 1000) - 10000 < Date.now();
    } catch {
      return true;
    }
  }
};

// API 에러 처리 함수
class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

let isRefreshing = false;
let refreshPromise: Promise<LoginResponse> | null = null;

// HTTP 요청 래퍼 함수
export async function apiRequest<T>(
  endpoint: string, 
  options: RequestInit = {},
  retryCount = 0
): Promise<T> {
  if (retryCount > 1) {
    throw new ApiError(401, '인증 처리 중 오류가 발생했습니다.');
  }

  const url = `${API_BASE_URL}${endpoint}`;
  let token = tokenManager.getAccessToken();

  // 토큰이 만료되었고 현재 갱신 중이 아니면서 로그인/갱신 요청이 아닌 경우
  if (
    token && 
    tokenManager.isTokenExpired(token) && 
    !endpoint.includes('/refresh') && 
    !endpoint.includes('/login')
  ) {
    try {
      if (!isRefreshing) {
        isRefreshing = true;
        refreshPromise = authApi.refreshToken();
      }

      if (refreshPromise) {
        await refreshPromise;
        token = tokenManager.getAccessToken();
      }
    } catch (error) {
      tokenManager.clearTokens();
      window.location.href = '/login';
      throw new ApiError(401, '세션이 만료되었습니다. 다시 로그인해주세요.');
    } finally {
      isRefreshing = false;
      refreshPromise = null;
    }
  }
  
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
    
    // 401 오류 처리
    if (response.status === 401 && !endpoint.includes('/login') && !endpoint.includes('/refresh')) {
      try {
        const refreshToken = tokenManager.getRefreshToken();
        if (refreshToken && !tokenManager.isTokenExpired(refreshToken) && retryCount < 1) {
          await authApi.refreshToken();
          // 토큰 갱신 후 한 번만 재시도
          return apiRequest<T>(endpoint, options, retryCount + 1);
        }
        // 리프레시 토큰이 없거나 만료된 경우 또는 재시도 횟수 초과
        tokenManager.clearTokens();
        window.location.href = '/login';
        throw new ApiError(401, '인증이 필요합니다. 다시 로그인해주세요.');
      } catch (error) {
        tokenManager.clearTokens();
        window.location.href = '/login';
        throw error instanceof ApiError ? error : new ApiError(401, '세션이 만료되었습니다. 다시 로그인해주세요.');
      }
    }
    
    if (!response.ok) {
      let errorMessage = `HTTP Error ${response.status}`;
      try {
        const errorData = await response.text();
        if (errorData) {
          try {
            const parsedError = JSON.parse(errorData);
            errorMessage = parsedError.message || errorData;
          } catch {
            errorMessage = errorData;
          }
        }
      } catch {
        // 에러 메시지 파싱 실패 시 기본 메시지 사용
      }
      throw new ApiError(response.status, errorMessage);
    }

    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      const data = await response.json();
      return data;
    }
    
    return await response.text() as T;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    // 네트워크 에러 처리
    if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
      throw new ApiError(0, '서버에 연결할 수 없습니다. 네트워크 연결을 확인해주세요.');
    }
    throw new ApiError(500, error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.');
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
    const response = await apiRequest<{success: boolean; message: string; data: LoginResponse}>('/users/login', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    
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

  // 워크스페이스 ID로 직접 참여
  joinById: async (workspaceId: string, password?: string): Promise<Workspace> => {
    const response = await apiRequest<{success: boolean; message: string; data: any}>(`/workspaces/${workspaceId}/join`, {
      method: 'POST',
      body: JSON.stringify(password ? { password } : {}),
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
      return response.data.map((member: any) => userApi.transformUserResponse(member));
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

  // 블랙리스트 조회
  getBlacklistedMembers: async (workspaceId: string): Promise<User[]> => {
    const response = await apiRequest<{success: boolean; message: string; data: any[]}>(`/workspaces/${workspaceId}/blacklist`);
    
    if (response.success && response.data) {
      return response.data.map((member: any) => ({
        ...member,
        id: member.id.toString(),
      }));
    }
    
    throw new ApiError(400, response.message || '블랙리스트 조회에 실패했습니다.');
  },

  // 멤버 차단 해제
  unbanMember: async (workspaceId: string, memberId: string): Promise<void> => {
    const response = await apiRequest<{success: boolean; message: string; data: null}>(`/workspaces/${workspaceId}/members/${memberId}/ban`, {
      method: 'DELETE',
    });
    
    if (!response.success) {
      throw new ApiError(400, response.message || '멤버 차단 해제에 실패했습니다.');
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
  // 사용자 응답 데이터 변환 헬퍼 함수
  transformUserResponse: (user: any): User => {
    return {
      id: user.id.toString(),
      email: user.email,
      name: user.name,
      age: user.age,
      mbti: user.mbti,
      disposition: user.disposition,
      introduction: user.introduction,
      portfolio: user.portfolio,
      preferWorkstyle: user.preferWorkstyle,
      dislikeWorkstyle: user.dislikeWorkstyle,
      likes: user.likes,
      dislikes: user.dislikes,
      profileImage: user.profileImage,
      tags: user.tags || [], // UserHashtagList에서 변환된 태그들
      
      // 호환성을 위한 매핑
      bio: user.introduction,
      portfolioLink: user.portfolio,
      preferredStyle: user.preferWorkstyle,
      avoidedStyle: user.dislikeWorkstyle,
      profilePictureUrl: user.profileImage || `https://picsum.photos/seed/${user.email}/100/100`,
    };
  },

  // 현재 사용자 정보 조회
  getCurrentUser: async (): Promise<User> => {
    const response = await apiRequest<{success: boolean; message: string; data: any}>('/users/me');
    
    if (response.success && response.data) {
      return userApi.transformUserResponse(response.data);
    }
    
    throw new ApiError(400, response.message || '사용자 정보를 불러올 수 없습니다.');
  },
};

export { ApiError };

// 다른 API 서비스들도 함께 export
export { teamApi } from './teamApi';