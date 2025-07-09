import { tokenManager } from "./api";
import { Announcement, AnnouncementPageResponse } from "../types";

const API_BASE_URL = "http://localhost:8081/api";

// 백엔드 API 응답 타입 정의 (실제 백엔드 응답에 맞춰 수정)
interface AnnouncementResponse {
  id: number;
  title: string;
  content: string;
  accountId: number;
  accountName: string;
  teamId: number;
  teamName: string;
  createdAt: string;
  updatedAt: string;
  authorWithdrawn: boolean;
}

// 백엔드 페이징 응답 타입
interface BackendAnnouncementPageResponse {
  announcements: AnnouncementResponse[];
  currentPage: number;
  totalPages: number;
  totalElements: number;
  size: number;
  first: boolean;
  last: boolean;
  hasNext: boolean;
  hasPrevious: boolean;
}

// 백엔드 응답을 프론트엔드 타입으로 변환하는 함수
const mapAnnouncementResponse = (
  response: AnnouncementResponse
): Announcement => ({
  id: response.id.toString(),
  title: response.title,
  content: response.content,
  author: response.accountName,
  timestamp: response.createdAt,
  authorName: response.accountName,
  createdAt: response.createdAt,
  updatedAt: response.updatedAt,
  teamProjectId: response.teamId.toString(),
  accountId: response.accountId.toString(),
  teamId: response.teamId.toString(),
  teamName: response.teamName,
  authorWithdrawn: response.authorWithdrawn,
});

export const announcementApi = {
  // 팀 공지사항 목록 조회 (페이징 지원)
  // GET /workspaces/{workspaceId}/announcement?teamId={teamId}&page={page}&size={size}
  async getAnnouncementsWithPaging(
    teamId: string,
    workspaceId: string,
    page: number = 0,
    size: number = 5
  ): Promise<AnnouncementPageResponse> {
    try {
      const token = tokenManager.getAccessToken();
      if (!token) {
        console.warn("토큰이 없습니다. 빈 페이지 응답을 반환합니다.");
        return {
          announcements: [],
          currentPage: 0,
          totalPages: 0,
          totalElements: 0,
          size: size,
          first: true,
          last: true,
          hasNext: false,
          hasPrevious: false,
        };
      }

      const response = await fetch(
        `${API_BASE_URL}/workspaces/${workspaceId}/announcement?teamId=${teamId}&page=${page}&size=${size}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        console.warn(
          "공지사항 조회 실패:",
          response.status,
          response.statusText
        );
        return {
          announcements: [],
          currentPage: 0,
          totalPages: 0,
          totalElements: 0,
          size: size,
          first: true,
          last: true,
          hasNext: false,
          hasPrevious: false,
        };
      }

      const result = await response.json();
      if (result.success && result.data) {
        const backendData = result.data as BackendAnnouncementPageResponse;
        return {
          announcements: backendData.announcements.map(mapAnnouncementResponse),
          currentPage: backendData.currentPage,
          totalPages: backendData.totalPages,
          totalElements: backendData.totalElements,
          size: backendData.size,
          first: backendData.first,
          last: backendData.last,
          hasNext: backendData.hasNext,
          hasPrevious: backendData.hasPrevious,
        };
      } else {
        console.warn("공지사항 조회 응답이 성공하지 않음:", result.message);
        return {
          announcements: [],
          currentPage: 0,
          totalPages: 0,
          totalElements: 0,
          size: size,
          first: true,
          last: true,
          hasNext: false,
          hasPrevious: false,
        };
      }
    } catch (error) {
      console.error("공지사항 조회 실패:", error);
      return {
        announcements: [],
        currentPage: 0,
        totalPages: 0,
        totalElements: 0,
        size: size,
        first: true,
        last: true,
        hasNext: false,
        hasPrevious: false,
      };
    }
  },

  // 팀 공지사항 목록 조회 (기존 메서드 - 하위 호환성을 위해 유지)
  // GET /workspaces/{workspaceId}/announcement?teamId={teamId}
  async getAnnouncements(
    teamId: string,
    workspaceId: string
  ): Promise<Announcement[]> {
    const pageResponse = await this.getAnnouncementsWithPaging(
      teamId,
      workspaceId,
      0,
      100
    );
    return pageResponse.announcements;
  },

  // 공지사항 생성
  // POST /workspaces/{workspaceId}/announcement
  async createAnnouncement(
    teamId: string,
    title: string,
    content: string,
    workspaceId: string,
    accountId: string
  ): Promise<Announcement> {
    try {
      const requestBody = {
        title,
        content,
        teamId: parseInt(teamId),
      };

      const token = tokenManager.getAccessToken();
      if (!token) {
        throw new Error("로그인이 필요합니다.");
      }

      const response = await fetch(
        `${API_BASE_URL}/workspaces/${workspaceId}/announcement`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
            "Account-Id": accountId,
          },
          body: JSON.stringify(requestBody),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "공지사항 생성에 실패했습니다.");
      }

      const result = await response.json();
      if (result.success && result.data) {
        return mapAnnouncementResponse(result.data);
      } else {
        throw new Error(result.message || "공지사항 생성에 실패했습니다.");
      }
    } catch (error) {
      console.error("공지사항 생성 실패:", error);
      throw error;
    }
  },

  // 공지사항 수정
  // PATCH /workspaces/{workspaceId}/announcement/{announcementId}
  async updateAnnouncement(
    _teamId: string, // API 일관성을 위해 유지하지만 사용하지 않음
    announcementId: string,
    title: string,
    content: string,
    workspaceId: string,
    accountId: string
  ): Promise<Announcement> {
    try {
      const requestBody = {
        title,
        content,
      };

      const token = tokenManager.getAccessToken();
      if (!token) {
        throw new Error("로그인이 필요합니다.");
      }

      const response = await fetch(
        `${API_BASE_URL}/workspaces/${workspaceId}/announcement/${announcementId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
            "Account-Id": accountId,
          },
          body: JSON.stringify(requestBody),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "공지사항 수정에 실패했습니다.");
      }

      const result = await response.json();
      if (result.success && result.data) {
        return mapAnnouncementResponse(result.data);
      } else {
        throw new Error(result.message || "공지사항 수정에 실패했습니다.");
      }
    } catch (error) {
      console.error("공지사항 수정 실패:", error);
      throw error;
    }
  },

  // 공지사항 삭제
  // DELETE /workspaces/{workspaceId}/announcement/{announcementId}
  // Headers: Account-Id
  async deleteAnnouncement(
    _teamId: string, // 현재는 사용하지 않지만 API 일관성을 위해 유지
    announcementId: string,
    workspaceId: string,
    accountId: string
  ): Promise<void> {
    try {
      const token = tokenManager.getAccessToken();
      if (!token) {
        throw new Error("로그인이 필요합니다.");
      }

      const response = await fetch(
        `${API_BASE_URL}/workspaces/${workspaceId}/announcement/${announcementId}`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
            "Account-Id": accountId,
          },
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "공지사항 삭제에 실패했습니다.");
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.message || "공지사항 삭제에 실패했습니다.");
      }
    } catch (error) {
      console.error("공지사항 삭제 실패:", error);
      throw error;
    }
  },
};
