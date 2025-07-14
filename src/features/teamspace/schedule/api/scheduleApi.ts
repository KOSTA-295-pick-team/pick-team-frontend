import { apiRequest } from '@/lib/apiClient';
import { ScheduleResponse, ScheduleCreateRequest, ScheduleUpdateRequest, SchedulePageResponse } from '@/types';

export const scheduleApi = {
    // 팀의 모든 일정 조회 (페이징)
    getTeamSchedules: async (teamId: number, page: number, size: number): Promise<SchedulePageResponse> => {
        // 백엔드는 Page 객체를 직접 반환하므로 ApiResponse 래퍼를 사용하지 않음
        return apiRequest<SchedulePageResponse>(`/teams/${teamId}/schedules?page=${page}&size=${size}`);
    },
    
    // 기간별 일정 조회
    getSchedulesByDateRange: async (teamId: number, startDate: string, endDate: string): Promise<ScheduleResponse[]> => {
        // 백엔드는 List를 직접 반환
        return apiRequest<ScheduleResponse[]>(`/teams/${teamId}/schedules/range?startDate=${startDate}&endDate=${endDate}`);
    },

    // 새 일정 생성
    createSchedule: async (teamId: number, accountId: string, data: ScheduleCreateRequest): Promise<ScheduleResponse> => {
        // accountId를 쿼리 파라미터로 추가
        return apiRequest<ScheduleResponse>(`/teams/${teamId}/schedules?accountId=${accountId}`, {
            method: 'POST',
            body: JSON.stringify(data),
        });
    },

    // 일정 수정
    updateSchedule: async (teamId: number, scheduleId: number, accountId: string, data: ScheduleUpdateRequest): Promise<ScheduleResponse> => {
        // accountId를 쿼리 파라미터로 추가
        return apiRequest<ScheduleResponse>(`/teams/${teamId}/schedules/${scheduleId}?accountId=${accountId}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        });
    },
    
    // 일정 삭제
    deleteSchedule: async (teamId: number, scheduleId: number, accountId: string): Promise<void> => {
        // accountId를 쿼리 파라미터로 추가
        return apiRequest<void>(`/teams/${teamId}/schedules/${scheduleId}?accountId=${accountId}`, {
            method: 'DELETE',
        });
    },
}; 