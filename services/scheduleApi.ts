import { tokenManager } from "./api";
import {
  CalendarEvent,
  ScheduleResponse,
  SchedulePageResponse,
  ScheduleCreateRequest,
  ScheduleUpdateRequest,
} from "../types";

const API_BASE_URL = "http://localhost:8081/api";

// 백엔드 응답을 프론트엔드 타입으로 변환하는 함수
const mapScheduleResponse = (response: ScheduleResponse): CalendarEvent => ({
  id: response.id.toString(),
  title: response.title,
  start: new Date(response.startDate),
  end: new Date(response.endDate),
  description: response.scheduleDesc,
  type: response.type,
  teamProjectId: response.teamId.toString(),
  creatorId: response.creatorId.toString(),
  creatorName: response.creatorName,
  teamId: response.teamId.toString(),
  teamName: response.teamName,
  createdAt: new Date(response.createdAt),
  updatedAt: new Date(response.updatedAt),
});

// 프론트엔드 타입을 백엔드 요청 타입으로 변환하는 함수
const mapToScheduleRequest = (
  event: Partial<CalendarEvent>
): ScheduleCreateRequest | ScheduleUpdateRequest => ({
  title: event.title!,
  startDate: event.start!.toISOString(),
  endDate: event.end!.toISOString(),
  scheduleDesc: event.description,
  type: event.type!,
});

export const scheduleApi = {
  // 팀 일정 목록 조회 (페이징)
  getSchedules: async (
    teamId: string,
    page: number = 0,
    size: number = 20,
    type?: "MEETING" | "DEADLINE" | "WORKSHOP" | "VACATION" | "OTHER"
  ): Promise<{
    events: CalendarEvent[];
    totalPages: number;
    totalElements: number;
  }> => {
    try {
      const token = tokenManager.getAccessToken();
      if (!token) {
        throw new Error("인증 토큰이 필요합니다.");
      }

      const params = new URLSearchParams({
        page: page.toString(),
        size: size.toString(),
      });

      if (type) {
        params.append("type", type);
      }

      const response = await fetch(
        `${API_BASE_URL}/teams/${teamId}/schedules?${params}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: SchedulePageResponse = await response.json();

      return {
        events: data.content.map(mapScheduleResponse),
        totalPages: data.totalPages,
        totalElements: data.totalElements,
      };
    } catch (error) {
      console.error("일정 목록 조회 실패:", error);
      throw error;
    }
  },

  // 기간별 일정 조회
  getSchedulesByDateRange: async (
    teamId: string,
    startDate: Date,
    endDate: Date
  ): Promise<CalendarEvent[]> => {
    try {
      const token = tokenManager.getAccessToken();
      if (!token) {
        throw new Error("인증 토큰이 필요합니다.");
      }

      const params = new URLSearchParams({
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      });

      const response = await fetch(
        `${API_BASE_URL}/teams/${teamId}/schedules/range?${params}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: ScheduleResponse[] = await response.json();
      return data.map(mapScheduleResponse);
    } catch (error) {
      console.error("기간별 일정 조회 실패:", error);
      throw error;
    }
  },

  // 내 일정 조회
  getMySchedules: async (
    teamId: string,
    accountId: string,
    page: number = 0,
    size: number = 20
  ): Promise<{
    events: CalendarEvent[];
    totalPages: number;
    totalElements: number;
  }> => {
    try {
      const token = tokenManager.getAccessToken();
      if (!token) {
        throw new Error("인증 토큰이 필요합니다.");
      }

      const params = new URLSearchParams({
        accountId: accountId,
        page: page.toString(),
        size: size.toString(),
      });

      const response = await fetch(
        `${API_BASE_URL}/teams/${teamId}/schedules/my?${params}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: SchedulePageResponse = await response.json();

      return {
        events: data.content.map(mapScheduleResponse),
        totalPages: data.totalPages,
        totalElements: data.totalElements,
      };
    } catch (error) {
      console.error("내 일정 조회 실패:", error);
      throw error;
    }
  },

  // 일정 생성
  createSchedule: async (
    teamId: string,
    accountId: string,
    event: Partial<CalendarEvent>
  ): Promise<CalendarEvent> => {
    try {
      const token = tokenManager.getAccessToken();
      if (!token) {
        throw new Error("인증 토큰이 필요합니다.");
      }

      const requestData = mapToScheduleRequest(event);

      const response = await fetch(
        `${API_BASE_URL}/teams/${teamId}/schedules?accountId=${accountId}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(requestData),
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: ScheduleResponse = await response.json();
      return mapScheduleResponse(data);
    } catch (error) {
      console.error("일정 생성 실패:", error);
      throw error;
    }
  },

  // 일정 수정
  updateSchedule: async (
    teamId: string,
    scheduleId: string,
    accountId: string,
    event: Partial<CalendarEvent>
  ): Promise<CalendarEvent> => {
    try {
      const token = tokenManager.getAccessToken();
      if (!token) {
        throw new Error("인증 토큰이 필요합니다.");
      }

      const requestData = mapToScheduleRequest(event);

      const response = await fetch(
        `${API_BASE_URL}/teams/${teamId}/schedules/${scheduleId}?accountId=${accountId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(requestData),
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: ScheduleResponse = await response.json();
      return mapScheduleResponse(data);
    } catch (error) {
      console.error("일정 수정 실패:", error);
      throw error;
    }
  },

  // 일정 삭제
  deleteSchedule: async (
    teamId: string,
    scheduleId: string,
    accountId: string
  ): Promise<void> => {
    try {
      const token = tokenManager.getAccessToken();
      if (!token) {
        throw new Error("인증 토큰이 필요합니다.");
      }

      const response = await fetch(
        `${API_BASE_URL}/teams/${teamId}/schedules/${scheduleId}?accountId=${accountId}`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
    } catch (error) {
      console.error("일정 삭제 실패:", error);
      throw error;
    }
  },
};
