import { apiRequest } from '@/lib/apiClient';
import { Announcement } from '@/types';

interface AnnouncementCreateRequest {
    teamId: number; // 팀 ID 추가
    title: string;
    content: string;
}

interface AnnouncementUpdateRequest {
    title?: string;
    content?: string;
}

// 백엔드 API 응답 형식에 맞춘 타입 (data 필드가 없을 수 있음)
interface CustomApiResponse<T> {
    message: string;
    data?: T;
    // 백엔드에서 보내주는 다른 필드들...
}


export const announcementApi = {
    // 공지사항 목록 조회 (팀 ID는 옵션)
    getAnnouncements: async (workspaceId: string, teamId?: number): Promise<Announcement[]> => {
        let url = `/workspaces/${workspaceId}/announcement`;
        if (teamId) {
            url += `?teamId=${teamId}`;
        }
        // 백엔드 응답이 data 객체로 감싸져 있지 않을 수 있음을 가정
        const response = await apiRequest<CustomApiResponse<Announcement[]>>(url);
        return response.data || [];
    },

    // 공지사항 생성
    createAnnouncement: async (workspaceId: string, data: AnnouncementCreateRequest): Promise<Announcement> => {
        const response = await apiRequest<CustomApiResponse<Announcement>>(`/workspaces/${workspaceId}/announcement`, {
            method: 'POST',
            body: JSON.stringify(data),
        });
        if (!response.data) throw new Error("공지사항 생성에 실패했습니다.");
        return response.data;
    },

    // 공지사항 수정
    updateAnnouncement: async (workspaceId: string, announcementId: string, data: AnnouncementUpdateRequest): Promise<Announcement> => {
        const response = await apiRequest<CustomApiResponse<Announcement>>(`/workspaces/${workspaceId}/announcement/${announcementId}`, {
            method: 'PATCH',
            body: JSON.stringify(data),
        });
        if (!response.data) throw new Error("공지사항 수정에 실패했습니다.");
        return response.data;
    },

    // 공지사항 삭제
    deleteAnnouncement: async (workspaceId: string, announcementId: string): Promise<void> => {
        await apiRequest<void>(`/workspaces/${workspaceId}/announcement/${announcementId}`, {
            method: 'DELETE',
        });
    }
}; 