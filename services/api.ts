// API 서비스 - 워크스페이스 관련 백엔드 통신을 담당하는 스크립트
import { User, Workspace } from "../types";
import { tokenManager } from "./tokenManager"; // 통합된 토큰 매니저 사용

const API_BASE_URL = "http://localhost:8081/api";

// API 에러 처리 함수
class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "ApiError";
  }
}

// HTTP 요청 래퍼 함수
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  const token = tokenManager.getAccessToken();

  const config: RequestInit = {
    headers: {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
    ...options,
  };

  try {
    const response = await fetch(url, config);

    // 401 오류 시 토큰 갱신 시도 (로그인 API 제외)
    if (
      response.status === 401 &&
      !endpoint.includes("/login") &&
      !endpoint.includes("/refresh")
    ) {
      const refreshToken = tokenManager.getRefreshToken();
      if (refreshToken) {
        try {
          // 토큰 갱신 로직은 user-controller에서 처리
          throw new ApiError(
            401,
            "인증이 만료되었습니다. 다시 로그인해주세요."
          );
        } catch (refreshError) {
          // 토큰 갱신 실패 시 로그인 페이지로 리다이렉트
          tokenManager.clearTokens();
          if (typeof window !== "undefined") {
            window.location.hash = "/login";
          }
          throw new ApiError(
            401,
            "인증이 만료되었습니다. 다시 로그인해주세요."
          );
        }
      } else {
        // 리프레시 토큰이 없으면 로그인 페이지로
        tokenManager.clearTokens();
        if (typeof window !== "undefined") {
          window.location.hash = "/login";
        }
        throw new ApiError(401, "인증이 필요합니다. 로그인해주세요.");
      }
    }

    if (!response.ok) {
      const errorData = await response.text();
      throw new ApiError(
        response.status,
        errorData || `HTTP ${response.status}`
      );
    }

    const contentType = response.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
      return await response.json();
    }

    return (await response.text()) as T;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(
      0,
      "네트워크 연결에 실패했습니다. 서버가 실행 중인지 확인해주세요."
    );
  }
}

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
  create: async (data: {
    name: string;
    iconUrl?: string;
    password?: string;
  }): Promise<Workspace> => {
    const response = await apiRequest<{
      success: boolean;
      message: string;
      data: any;
    }>("/workspaces", {
      method: "POST",
      body: JSON.stringify(data),
    });

    if (response.success && response.data) {
      return workspaceApi.transformWorkspaceResponse(response.data);
    }

    throw new ApiError(
      400,
      response.message || "워크스페이스 생성에 실패했습니다."
    );
  },

  // 워크스페이스 참여
  join: async (data: {
    inviteCode: string;
    password?: string;
  }): Promise<Workspace> => {
    const response = await apiRequest<{
      success: boolean;
      message: string;
      data: any;
    }>("/workspaces/join", {
      method: "POST",
      body: JSON.stringify(data),
    });

    if (response.success && response.data) {
      return workspaceApi.transformWorkspaceResponse(response.data);
    }

    throw new ApiError(
      400,
      response.message || "워크스페이스 참여에 실패했습니다."
    );
  },

  // 워크스페이스 ID로 직접 참여
  joinById: async (
    workspaceId: string,
    password?: string
  ): Promise<Workspace> => {
    const response = await apiRequest<{
      success: boolean;
      message: string;
      data: any;
    }>(`/workspaces/${workspaceId}/join`, {
      method: "POST",
      body: JSON.stringify(password ? { password } : {}),
    });

    if (response.success && response.data) {
      return workspaceApi.transformWorkspaceResponse(response.data);
    }

    throw new ApiError(
      400,
      response.message || "워크스페이스 참여에 실패했습니다."
    );
  },

  // 내 워크스페이스 목록 조회
  getMyWorkspaces: async (): Promise<Workspace[]> => {
    const response = await apiRequest<{
      success: boolean;
      message: string;
      data: any[];
    }>("/workspaces/my");

    if (response.success && response.data) {
      return response.data.map((workspace) =>
        workspaceApi.transformWorkspaceResponse(workspace)
      );
    }

    throw new ApiError(
      400,
      response.message || "워크스페이스 목록 조회에 실패했습니다."
    );
  },

  // 워크스페이스 상세 조회
  getById: async (id: string): Promise<Workspace> => {
    const response = await apiRequest<{
      success: boolean;
      message: string;
      data: any;
    }>(`/workspaces/${id}`);

    if (response.success && response.data) {
      return workspaceApi.transformWorkspaceResponse(response.data);
    }

    throw new ApiError(
      400,
      response.message || "워크스페이스 조회에 실패했습니다."
    );
  },

  // 워크스페이스 멤버 목록 조회
  getMembers: async (id: string): Promise<User[]> => {
    const response = await apiRequest<{
      success: boolean;
      message: string;
      data: any[];
    }>(`/workspaces/${id}/members`);

    if (response.success && response.data) {
      // 사용자 변환은 user-controller의 transformUserResponse 사용
      return response.data.map((member: any) => ({
        id: member.id.toString(),
        email: member.email,
        name: member.name,
        age: member.age,
        mbti: member.mbti,
        disposition: member.disposition,
        introduction: member.introduction,
        portfolio: member.portfolio,
        preferWorkstyle: member.preferWorkstyle,
        dislikeWorkstyle: member.dislikeWorkstyle,
        likes: member.likes,
        dislikes: member.dislikes,
        profileImage: member.profileImage,
        tags: member.tags || [],

        // 호환성을 위한 매핑
        bio: member.introduction,
        portfolioLink: member.portfolio,
        preferredStyle: member.preferWorkstyle,
        avoidedStyle: member.dislikeWorkstyle,
        profilePictureUrl: member.profileImage,
        profileImageUrl: member.profileImage,
      }));
    }

    throw new ApiError(
      400,
      response.message || "워크스페이스 멤버 조회에 실패했습니다."
    );
  },

  // 워크스페이스 업데이트
  update: async (
    id: string,
    data: { name?: string; iconUrl?: string; password?: string }
  ): Promise<Workspace> => {
    const response = await apiRequest<{
      success: boolean;
      message: string;
      data: any;
    }>(`/workspaces/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });

    if (response.success && response.data) {
      return workspaceApi.transformWorkspaceResponse(response.data);
    }

    throw new ApiError(
      400,
      response.message || "워크스페이스 업데이트에 실패했습니다."
    );
  },

  // 새 초대링크 생성
  generateInviteCode: async (id: string): Promise<string> => {
    const response = await apiRequest<{
      success: boolean;
      message: string;
      data: { inviteCode: string };
    }>(`/workspaces/${id}/invite-code`, {
      method: "POST",
    });

    if (response.success && response.data) {
      return response.data.inviteCode;
    }

    throw new ApiError(
      400,
      response.message || "초대링크 생성에 실패했습니다."
    );
  },

  // 멤버 내보내기
  kickMember: async (workspaceId: string, memberId: string): Promise<void> => {
    const response = await apiRequest<{
      success: boolean;
      message: string;
      data: null;
    }>(`/workspaces/${workspaceId}/members/${memberId}`, {
      method: "DELETE",
    });

    if (!response.success) {
      throw new ApiError(
        400,
        response.message || "멤버 내보내기에 실패했습니다."
      );
    }
  },

  // 멤버 밴
  banMember: async (workspaceId: string, memberId: string): Promise<void> => {
    const response = await apiRequest<{
      success: boolean;
      message: string;
      data: null;
    }>(`/workspaces/${workspaceId}/members/${memberId}/ban`, {
      method: "POST",
    });

    if (!response.success) {
      throw new ApiError(400, response.message || "멤버 차단에 실패했습니다.");
    }
  },

  // 블랙리스트 조회
  getBlacklistedMembers: async (workspaceId: string): Promise<User[]> => {
    const response = await apiRequest<{
      success: boolean;
      message: string;
      data: any[];
    }>(`/workspaces/${workspaceId}/blacklist`);

    if (response.success && response.data) {
      return response.data.map((member: any) => ({
        ...member,
        id: member.id.toString(),
      }));
    }

    throw new ApiError(
      400,
      response.message || "블랙리스트 조회에 실패했습니다."
    );
  },

  // 멤버 차단 해제
  unbanMember: async (workspaceId: string, memberId: string): Promise<void> => {
    const response = await apiRequest<{
      success: boolean;
      message: string;
      data: null;
    }>(`/workspaces/${workspaceId}/members/${memberId}/ban`, {
      method: "DELETE",
    });

    if (!response.success) {
      throw new ApiError(
        400,
        response.message || "멤버 차단 해제에 실패했습니다."
      );
    }
  },

  // 워크스페이스 삭제
  delete: async (id: string): Promise<void> => {
    const response = await apiRequest<{
      success: boolean;
      message: string;
      data: null;
    }>(`/workspaces/${id}`, {
      method: "DELETE",
    });

    if (!response.success) {
      throw new ApiError(
        400,
        response.message || "워크스페이스 삭제에 실패했습니다."
      );
    }
  },
};

export { ApiError };
