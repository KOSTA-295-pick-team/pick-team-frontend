import { apiRequest } from '../../../../lib/apiClient';
import { Workspace } from '../../types/workspace';
import { User } from '../../../user/types/user';
import { ApiResponse } from '../../../../types/common'; // 공용 ApiResponse 임포트

// 워크스페이스 API 서비스
export const workspaceApi = {
    // 워크스페이스 생성
    create: async (data: { name: string; iconUrl?: string; password?: string }): Promise<Workspace> => {
        const response = await apiRequest<ApiResponse<Workspace>>('/workspaces', {
            method: 'POST',
            body: JSON.stringify(data),
        });
        return response.data;
    },

    // 워크스페이스 참여
    join: async (data: { inviteCode: string; password?: string }): Promise<Workspace> => {
        const response = await apiRequest<ApiResponse<Workspace>>('/workspaces/join', {
            method: 'POST',
            body: JSON.stringify(data),
        });
        return response.data;
    },

    // 워크스페이스 ID로 직접 참여
    joinById: async (workspaceId: string, password?: string): Promise<Workspace> => {
        const response = await apiRequest<ApiResponse<Workspace>>(`/workspaces/${workspaceId}/join`, {
            method: 'POST',
            body: JSON.stringify(password ? { password } : {}),
        });
        return response.data;
    },

    // 내 워크스페이스 목록 조회
    getMyWorkspaces: async (): Promise<Workspace[]> => {
        const response = await apiRequest<ApiResponse<Workspace[]>>('/workspaces/my');
        return response.data;
    },

    // 워크스페이스 상세 정보 조회
    getWorkspaceDetails: async (workspaceId: string): Promise<Workspace> => {
        const response = await apiRequest<ApiResponse<Workspace>>(`/workspaces/${workspaceId}`);
        return response.data;
    },

    // 워크스페이스 정보 수정
    update: async (workspaceId: string, data: { name: string; iconUrl?: string; password?: string; }): Promise<Workspace> => {
        const response = await apiRequest<ApiResponse<Workspace>>(`/workspaces/${workspaceId}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        });
        return response.data;
    },

    // 워크스페이스 삭제
    delete: async (workspaceId: string): Promise<void> => {
        await apiRequest<ApiResponse<null>>(`/workspaces/${workspaceId}`, {
            method: 'DELETE',
        });
    },

    // 워크스페이스 멤버 목록 조회
    getMembers: async (workspaceId: string): Promise<User[]> => {
        const response = await apiRequest<ApiResponse<User[]>>(`/workspaces/${workspaceId}/members`);
            return response.data;
    },

    // 멤버 추방
    kickMember: async (workspaceId: string, targetUserId: string): Promise<void> => {
        await apiRequest<ApiResponse<null>>(`/workspaces/${workspaceId}/members/${targetUserId}`, {
            method: 'DELETE',
        });
    },

    // 멤버 차단
    banMember: async (workspaceId: string, targetUserId: string): Promise<void> => {
        await apiRequest<ApiResponse<null>>(`/workspaces/${workspaceId}/members/${targetUserId}/ban`, {
            method: 'POST',
        });
    },

    // 멤버 차단 해제
    unbanMember: async (workspaceId: string, targetUserId: string): Promise<void> => {
        await apiRequest<ApiResponse<null>>(`/workspaces/${workspaceId}/members/${targetUserId}/ban`, {
            method: 'DELETE',
        });
    },

    // 블랙리스트 조회
    getBlacklistedMembers: async (workspaceId: string): Promise<User[]> => {
        const response = await apiRequest<ApiResponse<User[]>>(`/workspaces/${workspaceId}/blacklist`);
            return response.data;
    },

    // 워크스페이스 아이콘 업로드
    uploadIcon: async (workspaceId: string, formData: FormData): Promise<{ iconUrl: string }> => {
        const response = await apiRequest<ApiResponse<{ iconUrl: string }>>(`/workspaces/${workspaceId}/icon`, {
            method: 'POST',
            body: formData,
            // FormData를 사용할 때는 headers를 설정하지 않음 (브라우저가 자동으로 설정)
        });
        return response.data;
    },

    // 워크스페이스 정보 업데이트 (이름, 아이콘 URL)
    updateWorkspace: async (workspaceId: string, data: { name: string; iconUrl?: string }): Promise<Workspace> => {
        const response = await apiRequest<ApiResponse<Workspace>>(`/workspaces/${workspaceId}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        });
        return response.data;
    },
};