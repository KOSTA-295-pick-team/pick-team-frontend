import { apiRequest } from '../../../../lib/apiClient';
import { Team } from '../../types/team';
import { User } from '../../../user/types/user';
import { ApiResponse } from '../../../../types/common';

interface TeamCreateRequest {
    workspaceId: string; // 워크스페이스 ID 추가
    name: string;
    description?: string;
}

interface TeamUpdateRequest {
    name?: string;
    description?: string;
}

export const teamApi = {
    // 팀 목록 조회
    getTeams: async (workspaceId: string): Promise<Team[]> => {
        const response = await apiRequest<ApiResponse<Team[]>>(`/teams/workspace/${workspaceId}`);
        return response.data;
    },

    // 팀 상세 정보 조회
    getTeam: async (teamId: string): Promise<Team> => {
        const response = await apiRequest<ApiResponse<Team>>(`/teams/${teamId}`);
        return response.data;
    },

    // 팀 생성
    createTeam: async (data: TeamCreateRequest): Promise<Team> => {
        const response = await apiRequest<ApiResponse<Team>>('/teams', {
            method: 'POST',
            body: JSON.stringify(data),
        });
        return response.data;
    },

    // 팀 정보 수정
    updateTeam: async (teamId: string, data: TeamUpdateRequest): Promise<Team> => {
        const response = await apiRequest<ApiResponse<Team>>(`/teams/${teamId}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        });
        return response.data;
    },

    // 팀 삭제
    deleteTeam: async (teamId: string): Promise<void> => {
        await apiRequest<ApiResponse<void>>(`/teams/${teamId}`, {
            method: 'DELETE',
        });
    },

    // 팀 참여 (비밀번호)
    joinTeam: async (teamId: string, password?: string): Promise<void> => {
        await apiRequest<ApiResponse<void>>(`/teams/${teamId}/join`, {
            method: 'POST',
            body: JSON.stringify({ password }),
        });
    },
    
    // 팀 탈퇴
    leaveTeam: async (teamId: string): Promise<void> => {
        await apiRequest<ApiResponse<void>>(`/teams/${teamId}/leave`, {
            method: 'POST',
        });
    },

    // 팀 멤버 추가 (관리자용)
    addMember: async (teamId: string, userId: string): Promise<void> => {
        await apiRequest<ApiResponse<void>>(`/teams/${teamId}/members`, {
            method: 'POST',
            body: JSON.stringify({ userId }),
        });
    },

    // 팀 멤버 제거
    removeMember: async (teamId: string, userId: string): Promise<void> => {
        await apiRequest<ApiResponse<void>>(`/teams/${teamId}/members/${userId}`, {
            method: 'DELETE',
        });
    },

    // 팀 멤버 목록 조회
    getMembers: async (teamId: string): Promise<User[]> => {
        const response = await apiRequest<ApiResponse<User[]>>(`/teams/${teamId}/members`);
        return response.data;
    }
}; 