// API 서비스 - 백엔드와의 통신을 담당하는 스크립트
import { User, Workspace } from '../types';

const API_BASE_URL = 'http://localhost:8081/api';

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
  const config: RequestInit = {
    headers: {
      'Content-Type': 'application/json',
      'User-Id': '1', // 테스트용 하드코딩 - ID 1이 존재하지 않을 수 있음
      ...options.headers,
    },
    ...options,
  };

  try {
    const response = await fetch(url, config);
    
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

// 워크스페이스 API 서비스
export const workspaceApi = {
  // 워크스페이스 생성
  create: async (data: { name: string; iconUrl?: string; password?: string }): Promise<Workspace> => {
    return apiRequest<Workspace>('/workspaces', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // 워크스페이스 참여
  join: async (data: { inviteCode: string; password?: string }): Promise<Workspace> => {
    return apiRequest<Workspace>('/workspaces/join', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // 내 워크스페이스 목록 조회
  getMyWorkspaces: async (): Promise<Workspace[]> => {
    return apiRequest<Workspace[]>('/workspaces/my');
  },

  // 워크스페이스 상세 조회
  getById: async (id: string): Promise<Workspace> => {
    return apiRequest<Workspace>(`/workspaces/${id}`);
  },

  // 워크스페이스 멤버 목록 조회
  getMembers: async (id: string): Promise<User[]> => {
    return apiRequest<User[]>(`/workspaces/${id}/members`);
  },

  // 워크스페이스 업데이트
  update: async (id: string, data: { name?: string; iconUrl?: string; password?: string }): Promise<Workspace> => {
    return apiRequest<Workspace>(`/workspaces/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  // 새 초대링크 생성
  generateInviteCode: async (id: string): Promise<string> => {
    return apiRequest<string>(`/workspaces/${id}/invite-code`, {
      method: 'POST',
    });
  },

  // 멤버 내보내기
  kickMember: async (workspaceId: string, memberId: string): Promise<void> => {
    return apiRequest<void>(`/workspaces/${workspaceId}/members/${memberId}/kick`, {
      method: 'DELETE',
    });
  },

  // 멤버 밴
  banMember: async (workspaceId: string, memberId: string): Promise<void> => {
    return apiRequest<void>(`/workspaces/${workspaceId}/members/${memberId}/ban`, {
      method: 'DELETE',
    });
  },

  // 워크스페이스 삭제
  delete: async (id: string): Promise<void> => {
    return apiRequest<void>(`/workspaces/${id}`, {
      method: 'DELETE',
    });
  },
};

// 사용자 API (추후 확장용)
export const userApi = {
  // 현재 사용자 정보 조회 (목업)
  getCurrentUser: async (): Promise<User> => {
    // 임시로 목업 데이터 반환 - 실제로는 JWT 토큰 기반 인증 필요
    return {
      id: '1',
      email: 'user@example.com',
      name: '테스트 사용자',
      profilePictureUrl: 'https://picsum.photos/seed/user1/100/100',
      mbti: 'INFP',
      tags: ['#독서광', '#조용한활동선호'],
    };
  },
};

export { ApiError }; 