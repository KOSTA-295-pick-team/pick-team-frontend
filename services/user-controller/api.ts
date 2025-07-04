// UserController API 구현
import {
  RegisterUserRequest,
  CheckDuplicateIdRequest,
  ValidatePasswordRequest,
  RequestEmailVerificationRequest,
  VerifyEmailRequest,
  LoginRequest,
  LoginWithClientInfoRequest,
  LogoutWithClientInfoRequest,
  UpdateMyProfileRequest,
  ChangePasswordRequest,
  SearchHashtagsQuery,
  LoginResponse,
  UserResponse,
  SessionStatusResponse,
  HashtagResponse,
  ApiResponse,
  ValidationResponse,
  EmailVerificationResponse,
} from "./types";
import { transformUserResponse, getClientInfo } from "./utils";
import { User } from "../../types";

// 기존 API 기본 설정 재사용을 위한 import
// TODO: 나중에 공통 모듈로 분리할 예정
const API_BASE_URL = "http://localhost:8081/api";

// API 에러 클래스
export class UserApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "UserApiError";
  }
}

// 토큰 관리 (기존 것 재사용)
const TOKEN_KEY = "auth_token";
const REFRESH_TOKEN_KEY = "refresh_token";

export const userTokenManager = {
  getAccessToken: () => localStorage.getItem(TOKEN_KEY),
  setAccessToken: (token: string) => localStorage.setItem(TOKEN_KEY, token),
  getRefreshToken: () => localStorage.getItem(REFRESH_TOKEN_KEY),
  setRefreshToken: (token: string) =>
    localStorage.setItem(REFRESH_TOKEN_KEY, token),
  clearTokens: () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  },
};

// HTTP 요청 래퍼 함수
async function userApiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  const token = userTokenManager.getAccessToken();

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

    if (!response.ok) {
      const errorData = await response.text();
      throw new UserApiError(
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
    if (error instanceof UserApiError) {
      throw error;
    }
    throw new UserApiError(
      0,
      "네트워크 연결에 실패했습니다. 서버가 실행 중인지 확인해주세요."
    );
  }
}

// UserController API 서비스
export const userControllerApi = {
  // 회원가입
  registerUser: async (data: RegisterUserRequest): Promise<User> => {
    const response = await userApiRequest<ApiResponse<UserResponse>>(
      "/users/register",
      {
        method: "POST",
        body: JSON.stringify(data),
      }
    );

    if (response.success && response.data) {
      return transformUserResponse(response.data);
    }

    throw new UserApiError(400, response.message || "회원가입에 실패했습니다.");
  },

  // 이메일(ID) 중복 검사
  checkDuplicateId: async (data: CheckDuplicateIdRequest): Promise<boolean> => {
    const response = await userApiRequest<ApiResponse<boolean>>(
      "/users/check-id",
      {
        method: "POST",
        body: JSON.stringify(data),
      }
    );

    if (response.success && response.data !== undefined) {
      return !response.data; // 반대로 반환
    }

    throw new UserApiError(
      400,
      response.message || "ID 중복 검사에 실패했습니다."
    );
  },

  // 비밀번호 유효성 검사
  validatePassword: async (
    data: ValidatePasswordRequest
  ): Promise<ValidationResponse> => {
    const response = await userApiRequest<ApiResponse<boolean>>(
      "/users/validate-password",
      {
        method: "POST",
        body: JSON.stringify(data),
      }
    );

    if (response.success && response.data !== undefined) {
      return {
        isValid: response.data,
        message: response.data
          ? "유효한 비밀번호입니다."
          : "비밀번호가 유효하지 않습니다.",
      };
    }

    throw new UserApiError(
      400,
      response.message || "비밀번호 유효성 검사에 실패했습니다."
    );
  },

  // 이메일 인증 요청
  requestEmailVerification: async (
    data: RequestEmailVerificationRequest
  ): Promise<EmailVerificationResponse> => {
    const response = await userApiRequest<
      ApiResponse<EmailVerificationResponse>
    >("/users/email/request", {
      method: "POST",
      body: JSON.stringify(data),
    });

    if (response.success && response.data) {
      return response.data;
    }

    throw new UserApiError(
      400,
      response.message || "이메일 인증 요청에 실패했습니다."
    );
  },

  // 이메일 인증 코드 검증
  verifyEmail: async (data: VerifyEmailRequest): Promise<boolean> => {
    const response = await userApiRequest<ApiResponse<{ isVerified: boolean }>>(
      "/users/email/verify",
      {
        method: "POST",
        body: JSON.stringify(data),
      }
    );

    if (response.success && response.data) {
      return response.data.isVerified;
    }

    throw new UserApiError(
      400,
      response.message || "이메일 인증에 실패했습니다."
    );
  },

  // 기본 로그인
  login: async (data: LoginRequest): Promise<LoginResponse> => {
    const response = await userApiRequest<ApiResponse<LoginResponse>>(
      "/users/login",
      {
        method: "POST",
        body: JSON.stringify(data),
      }
    );

    if (response.success && response.data) {
      // 토큰 저장
      userTokenManager.setAccessToken(response.data.accessToken);
      userTokenManager.setRefreshToken(response.data.refreshToken);
      return response.data;
    }

    throw new UserApiError(400, response.message || "로그인에 실패했습니다.");
  },

  // 개선된 로그인 (클라이언트 정보 포함)
  loginWithClientInfo: async (data: LoginRequest): Promise<LoginResponse> => {
    const requestData: LoginWithClientInfoRequest = {
      ...data,
      clientInfo: getClientInfo(),
    };

    const response = await userApiRequest<ApiResponse<LoginResponse>>(
      "/users/login/enhanced",
      {
        method: "POST",
        body: JSON.stringify(requestData),
      }
    );

    if (response.success && response.data) {
      // 토큰 저장
      userTokenManager.setAccessToken(response.data.accessToken);
      userTokenManager.setRefreshToken(response.data.refreshToken);
      return response.data;
    }

    throw new UserApiError(400, response.message || "로그인에 실패했습니다.");
  },

  // 기본 로그아웃
  logout: async (): Promise<void> => {
    try {
      await userApiRequest<ApiResponse<null>>("/users/logout", {
        method: "POST",
      });
    } finally {
      // 로컬 토큰은 항상 삭제
      userTokenManager.clearTokens();
    }
  },

  // 개선된 로그아웃 (클라이언트 정보 포함)
  logoutWithClientInfo: async (): Promise<void> => {
    const requestData: LogoutWithClientInfoRequest = {
      clientInfo: getClientInfo(),
    };

    try {
      await userApiRequest<ApiResponse<null>>("/users/logout/enhanced", {
        method: "POST",
        body: JSON.stringify(requestData),
      });
    } finally {
      // 로컬 토큰은 항상 삭제
      userTokenManager.clearTokens();
    }
  },

  // 세션 상태 확인
  getSessionStatus: async (): Promise<SessionStatusResponse> => {
    const response = await userApiRequest<ApiResponse<SessionStatusResponse>>(
      "/users/session/status"
    );

    if (response.success && response.data) {
      return response.data;
    }

    throw new UserApiError(
      400,
      response.message || "세션 상태 확인에 실패했습니다."
    );
  },

  // 내 프로필 조회
  getMyProfile: async (): Promise<User> => {
    const response = await userApiRequest<ApiResponse<UserResponse>>(
      "/users/me"
    );

    if (response.success && response.data) {
      return transformUserResponse(response.data);
    }

    throw new UserApiError(
      400,
      response.message || "프로필 조회에 실패했습니다."
    );
  },

  // 내 프로필 수정
  updateMyProfile: async (data: UpdateMyProfileRequest): Promise<User> => {
    const response = await userApiRequest<ApiResponse<UserResponse>>(
      "/users/me",
      {
        method: "PUT",
        body: JSON.stringify(data),
      }
    );

    if (response.success && response.data) {
      return transformUserResponse(response.data);
    }

    throw new UserApiError(
      400,
      response.message || "프로필 수정에 실패했습니다."
    );
  },

  // 다른 사용자 프로필 조회
  getUserProfile: async (userId: string): Promise<User> => {
    const response = await userApiRequest<ApiResponse<UserResponse>>(
      `/users/${userId}`
    );

    if (response.success && response.data) {
      return transformUserResponse(response.data);
    }

    throw new UserApiError(
      400,
      response.message || "사용자 프로필 조회에 실패했습니다."
    );
  },

  // 전체 사용자 프로필 조회
  getAllUserProfile: async (): Promise<User[]> => {
    const response = await userApiRequest<ApiResponse<UserResponse[]>>(
      "/users"
    );

    if (response.success && response.data) {
      return response.data.map(transformUserResponse);
    }

    throw new UserApiError(
      400,
      response.message || "사용자 목록 조회에 실패했습니다."
    );
  },

  // 추천 팀원 리스트 조회
  getRecommendedTeamMembers: async (): Promise<User[]> => {
    const response = await userApiRequest<ApiResponse<UserResponse[]>>(
      "/users/recommend"
    );

    if (response.success && response.data) {
      return response.data.map(transformUserResponse);
    }

    throw new UserApiError(
      400,
      response.message || "추천 팀원 조회에 실패했습니다."
    );
  },

  // 비밀번호 변경
  changePassword: async (data: ChangePasswordRequest): Promise<void> => {
    const response = await userApiRequest<ApiResponse<null>>(
      "/users/password",
      {
        method: "PUT",
        body: JSON.stringify(data),
      }
    );

    if (!response.success) {
      throw new UserApiError(
        400,
        response.message || "비밀번호 변경에 실패했습니다."
      );
    }
  },

  // 계정 삭제
  deleteAccount: async (): Promise<void> => {
    const response = await userApiRequest<ApiResponse<null>>("/users", {
      method: "DELETE",
    });

    if (!response.success) {
      throw new UserApiError(
        400,
        response.message || "계정 삭제에 실패했습니다."
      );
    }

    // 계정 삭제 성공 시 토큰 삭제
    userTokenManager.clearTokens();
  },

  // 해시태그 검색 (자동완성용)
  searchHashtags: async (
    query: SearchHashtagsQuery
  ): Promise<HashtagResponse[]> => {
    const searchParams = new URLSearchParams({
      keyword: query.keyword,
      ...(query.limit && { limit: query.limit.toString() }),
    });

    const response = await userApiRequest<ApiResponse<HashtagResponse[]>>(
      `/users/hashtags/search?${searchParams}`
    );

    if (response.success && response.data) {
      return response.data;
    }

    throw new UserApiError(
      400,
      response.message || "해시태그 검색에 실패했습니다."
    );
  },

  // 프로필 이미지 업로드
  uploadProfileImage: async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append("profileImage", file);

    const response = await userApiRequest<ApiResponse<{ imageUrl: string }>>(
      "/users/me/profile-image",
      {
        method: "POST",
        body: formData,
        headers: {
          // FormData 사용 시 Content-Type 헤더를 제거해야 함
        },
      }
    );

    if (response.success && response.data) {
      return response.data.imageUrl;
    }

    throw new UserApiError(
      400,
      response.message || "프로필 이미지 업로드에 실패했습니다."
    );
  },

  // 프로필 이미지 삭제
  deleteProfileImage: async (): Promise<void> => {
    const response = await userApiRequest<ApiResponse<null>>(
      "/users/me/profile-image",
      {
        method: "DELETE",
      }
    );

    if (!response.success) {
      throw new UserApiError(
        400,
        response.message || "프로필 이미지 삭제에 실패했습니다."
      );
    }
  },
};
