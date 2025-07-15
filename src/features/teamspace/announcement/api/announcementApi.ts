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
        try {
            const response = await apiRequest<CustomApiResponse<any>>(url);
            
            // 백엔드가 페이징된 응답을 보내는 경우 처리
            if (response.data && response.data.announcements) {
                return Array.isArray(response.data.announcements) ? response.data.announcements : [];
            }
            
            // 백엔드가 직접 배열을 보내는 경우 처리
            if (Array.isArray(response.data)) {
                return response.data;
            }
            
            // 백엔드가 data 없이 직접 응답을 보내는 경우 처리
            if (Array.isArray(response)) {
                return response;
            }
            
            // 모든 경우에 실패하면 빈 배열 반환
            console.warn('예상하지 못한 API 응답 형식:', response);
            return [];
        } catch (error) {
            console.error('공지사항 조회 API 오류:', error);
            return [];
        }
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