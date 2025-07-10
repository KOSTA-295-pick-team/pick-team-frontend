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
  LogoutResponse,
} from "./types";
import { transformUserResponse, getClientInfo } from "./utils";
import { User } from "../../types";
import { tokenManager } from "../tokenManager"; // 통합된 토큰 매니저 사용

// API 에러 클래스
export class UserApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "UserApiError";
  }
}

// 기존 API 기본 설정 재사용을 위한 import
// TODO: 나중에 공통 모듈로 분리할 예정
const API_BASE_URL = "http://localhost:8081/api";

// HTTP 요청 래퍼 함수
// 토큰 갱신 중복 방지를 위한 플래그
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value: any) => void;
  reject: (error: any) => void;
}> = [];

// 토큰 갱신 함수
async function refreshToken(): Promise<void> {
  const refreshToken = tokenManager.getRefreshToken();
  if (!refreshToken) {
    throw new UserApiError(
      401,
      "리프레시 토큰이 없습니다. 다시 로그인해주세요."
    );
  }

  const response = await fetch(`${API_BASE_URL}/users/refresh`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ refreshToken }),
  });

  if (!response.ok) {
    tokenManager.clearTokens();
    throw new UserApiError(
      401,
      "토큰 갱신에 실패했습니다. 다시 로그인해주세요."
    );
  }

  const result = await response.json();
  if (result.success && result.data) {
    tokenManager.setAccessToken(result.data.accessToken);
    tokenManager.setRefreshToken(result.data.refreshToken);
  } else {
    tokenManager.clearTokens();
    throw new UserApiError(
      401,
      "토큰 갱신에 실패했습니다. 다시 로그인해주세요."
    );
  }
}

async function userApiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  const token = tokenManager.getAccessToken();

  // FormData인 경우 Content-Type 헤더를 설정하지 않음 (브라우저가 자동 설정)
  const isFormData = options.body instanceof FormData;

  // 헤더 객체 생성
  const headers: HeadersInit = {};

  // 기존 헤더가 있으면 복사
  if (options.headers) {
    if (options.headers instanceof Headers) {
      options.headers.forEach((value, key) => {
        (headers as Record<string, string>)[key] = value;
      });
    } else {
      Object.assign(headers, options.headers);
    }
  }

  // Content-Type은 FormData가 아닐 때만 설정
  if (!isFormData) {
    (headers as Record<string, string>)["Content-Type"] = "application/json";
  }

  // Authorization 헤더는 항상 토큰이 있으면 설정
  if (token) {
    (headers as Record<string, string>)["Authorization"] = `Bearer ${token}`;
  }

  const config: RequestInit = {
    ...options,
    headers,
  };

  try {
    const response = await fetch(url, config);

    // 401 에러 시 토큰 갱신 시도
    if (response.status === 401 && !isRefreshing) {
      // 토큰 갱신 중인 경우 대기
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then(() => {
          return userApiRequest(endpoint, options);
        });
      }

      isRefreshing = true;

      try {
        await refreshToken();

        // 대기 중인 요청들 처리
        failedQueue.forEach(({ resolve }) => {
          resolve(null);
        });
        failedQueue = [];

        // 새 토큰으로 원래 요청 재시도
        const newToken = tokenManager.getAccessToken();

        const retryConfig: RequestInit = {
          ...config,
          headers: {
            ...config.headers,
            ...(newToken && { Authorization: `Bearer ${newToken}` }),
          },
        };

        const retryResponse = await fetch(url, retryConfig);

        if (!retryResponse.ok) {
          const errorData = await retryResponse.text();
          throw new UserApiError(
            retryResponse.status,
            errorData || `HTTP ${retryResponse.status}`
          );
        }

        const contentType = retryResponse.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          return await retryResponse.json();
        }

        return (await retryResponse.text()) as T;
      } catch (refreshError) {
        // 대기 중인 요청들에게 에러 전파
        failedQueue.forEach(({ reject }) => {
          reject(refreshError);
        });
        failedQueue = [];

        throw refreshError;
      } finally {
        isRefreshing = false;
      }
    }

    if (!response.ok) {
      const errorData = await response.text();
      throw new UserApiError(
        response.status,
        errorData || `HTTP ${response.status}`
      );
    }

    const contentType = response.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
      const jsonData = await response.json();
      return jsonData;
    }

    const textData = await response.text();
    return textData as T;
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
  // 회원가입 (USER_API_DOCUMENTATION 기준으로 수정)
  registerUser: async (data: RegisterUserRequest): Promise<void> => {
    const response = await userApiRequest<ApiResponse<null>>(
      "/users/register",
      {
        method: "POST",
        body: JSON.stringify(data),
      }
    );

    if (response.success) {
      return; // 성공 시 void 반환
    }

    throw new UserApiError(400, response.message || "회원가입에 실패했습니다.");
  },

  // 이메일(ID) 중복 검사 (USER_API_DOCUMENTATION 기준으로 수정)
  checkDuplicateId: async (data: CheckDuplicateIdRequest): Promise<boolean> => {
    const response = await userApiRequest<ApiResponse<boolean>>(
      "/users/check-id",
      {
        method: "POST",
        body: JSON.stringify(data),
      }
    );

    if (response.success && response.data !== undefined) {
      return response.data; // API 문서에서 true면 사용 가능
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

    if (response.success) {
      return response.data || {}; // data가 null이어도 성공으로 처리
    }

    throw new UserApiError(
      400,
      response.message || "이메일 인증 요청에 실패했습니다."
    );
  },

  // 이메일 인증 코드 검증
  verifyEmail: async (data: VerifyEmailRequest): Promise<boolean> => {
    const response = await userApiRequest<ApiResponse<boolean>>(
      "/users/email/verify",
      {
        method: "POST",
        body: JSON.stringify(data),
      }
    );

    if (response.success && response.data !== undefined) {
      return response.data; // API 문서: data는 boolean (true)
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
      // 백엔드 응답 구조에 맞게 토큰 추출
      const accessToken =
        (response.data as any).token || response.data.accessToken;
      const refreshToken = response.data.refreshToken;

      // 토큰 저장
      if (accessToken) {
        tokenManager.setAccessToken(accessToken);
      }
      if (refreshToken) {
        tokenManager.setRefreshToken(refreshToken);
      }

      // LoginResponse 타입에 맞게 반환
      return {
        ...response.data,
        accessToken: accessToken,
      } as LoginResponse;
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

    console.log("[DEBUG] 로그인 원본 응답:", {
      success: response.success,
      message: response.message,
      data: response.data,
      dataKeys: response.data ? Object.keys(response.data) : [],
      fullResponse: JSON.stringify(response, null, 2),
    });

    if (response.success && response.data) {
      // 백엔드 응답 구조에 맞게 토큰 추출 (유연하게 처리)
      console.log("[DEBUG] 로그인 응답에서 토큰 저장 시작");

      // 백엔드가 data.token으로 보내므로 이에 맞게 수정
      const accessToken =
        (response.data as any).token || response.data.accessToken;
      const refreshToken = response.data.refreshToken;

      console.log("[DEBUG] token 필드 존재:", !!(response.data as any).token);
      console.log(
        "[DEBUG] accessToken 필드 존재:",
        !!response.data.accessToken
      );
      console.log("[DEBUG] refreshToken 존재:", !!response.data.refreshToken);
      console.log("[DEBUG] 추출된 accessToken:", accessToken);
      console.log("[DEBUG] 추출된 refreshToken:", refreshToken);

      // 토큰이 정의되어 있는지 확인
      if (accessToken) {
        tokenManager.setAccessToken(accessToken);
        console.log("[DEBUG] accessToken 저장 성공");
      } else {
        console.error("[DEBUG] accessToken을 찾을 수 없습니다!");
        console.log("[DEBUG] 사용 가능한 필드:", Object.keys(response.data));
      }

      if (refreshToken) {
        tokenManager.setRefreshToken(refreshToken);
        console.log("[DEBUG] refreshToken 저장 성공");
      } else {
        console.warn("[DEBUG] refreshToken을 찾을 수 없습니다!");
      }

      console.log("[DEBUG] 토큰 저장 완료");
      console.log(
        "[DEBUG] 저장된 accessToken:",
        !!tokenManager.getAccessToken()
      );
      console.log(
        "[DEBUG] 저장된 refreshToken:",
        !!tokenManager.getRefreshToken()
      );

      // LoginResponse 타입에 맞게 반환 (accessToken 필드로 변환)
      return {
        ...response.data,
        accessToken: accessToken, // token -> accessToken으로 변환
      } as LoginResponse;
    }

    // 삭제된 계정 에러 처리
    if (
      !response.success &&
      (response as any).errorCode === "DELETED_ACCOUNT"
    ) {
      const deletedAccountError = new UserApiError(
        400,
        response.message || "삭제된 계정입니다."
      );
      (deletedAccountError as any).errorCode = "DELETED_ACCOUNT";
      (deletedAccountError as any).deletedAccountData = (response as any).data;
      throw deletedAccountError;
    }

    throw new UserApiError(400, response.message || "로그인에 실패했습니다.");
  },

  // 기본 로그아웃
  logout: async (): Promise<LogoutResponse> => {
    try {
      const response = await userApiRequest<ApiResponse<LogoutResponse>>(
        "/users/logout",
        {
          method: "POST",
        }
      );

      if (response.success && response.data) {
        return response.data;
      }

      throw new UserApiError(
        400,
        response.message || "로그아웃에 실패했습니다."
      );
    } finally {
      // 로컬 토큰은 항상 삭제
      tokenManager.clearTokens();
    }
  },

  // 개선된 로그아웃 (클라이언트 정보 포함)
  logoutWithClientInfo: async (): Promise<LogoutResponse> => {
    const requestData: LogoutWithClientInfoRequest = {
      clientInfo: getClientInfo(),
    };

    try {
      const response = await userApiRequest<ApiResponse<LogoutResponse>>(
        "/users/logout/enhanced",
        {
          method: "POST",
          body: JSON.stringify(requestData),
        }
      );

      if (response.success && response.data) {
        return response.data;
      }

      throw new UserApiError(
        400,
        response.message || "로그아웃에 실패했습니다."
      );
    } finally {
      // 로컬 토큰은 항상 삭제
      tokenManager.clearTokens();
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
  updateMyProfile: async (data: UpdateMyProfileRequest): Promise<void> => {
    const response = await userApiRequest<ApiResponse<null>>("/users/me", {
      method: "PUT",
      body: JSON.stringify(data),
    });

    if (response.success) {
      return; // API 문서: data: null 반환
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
    tokenManager.clearTokens();
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
    console.log("[DEBUG API] uploadProfileImage 시작");
    console.log("[DEBUG API] 파일:", file.name, file.type, file.size);

    const token = tokenManager.getAccessToken();
    console.log("[DEBUG API] 토큰 상태:", token ? "존재" : "없음");
    console.log("[DEBUG API] 토큰 값:", token?.substring(0, 20) + "...");

    const formData = new FormData();
    formData.append("file", file); // API 문서 기준: "file" 필드명 사용

    console.log("[DEBUG API] FormData 생성 완료, API 호출 시작");

    const response = await userApiRequest<ApiResponse<string>>(
      "/users/me/profile-image",
      {
        method: "POST",
        body: formData,
        headers: {
          // FormData 사용 시 Content-Type 헤더를 제거해야 함 (브라우저가 자동 설정)
          // Authorization 헤더는 userApiRequest에서 자동 추가됨
        },
      }
    );

    console.log("[DEBUG API] API 응답:", response);

    if (response.success && response.data) {
      console.log("[DEBUG API] 업로드 성공:", response.data);
      return response.data; // API 문서: 직접 문자열 반환 ("/profile-images/uuid-filename.jpg")
    }

    console.error("[DEBUG API] 업로드 실패:", response);
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

  // OAuth 토큰 교환 (보안 강화된 OAuth 시스템용)
  exchangeOAuthToken: async (
    tempCode: string
  ): Promise<{
    success: boolean;
    message: string;
    token: string;
    refreshToken?: string;
    user?: {
      id: number;
      email: string;
      name: string;
      profilePictureUrl?: string;
      mbti?: string;
      tags?: string[];
      provider?: string;
    };
  }> => {
    console.log(
      "[DEBUG API] OAuth 토큰 교환 시작, tempCode:",
      tempCode ? "존재" : "없음"
    );

    const response = await fetch(`${API_BASE_URL}/auth/oauth/exchange-token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ tempCode }),
    });

    console.log("[DEBUG API] OAuth 토큰 교환 응답 상태:", response.status);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.log("[DEBUG API] OAuth 토큰 교환 에러 응답:", {
        status: response.status,
        errorData,
        errorDataKeys: Object.keys(errorData),
      });

      const errorMessage =
        errorData.message ||
        errorData.detail ||
        `HTTP ${response.status}: 토큰 교환에 실패했습니다`;
      console.error("[DEBUG API] OAuth 토큰 교환 실패:", errorMessage);
      throw new UserApiError(response.status, errorMessage);
    }

    const data = await response.json();
    console.log("[DEBUG API] OAuth 토큰 교환 원시 응답:", {
      fullResponse: data,
      responseKeys: Object.keys(data),
      dataKeys: data.data ? Object.keys(data.data) : "data 없음",
    });

    // 백엔드 응답 구조에 맞게 토큰과 사용자 정보 추출
    let token = data.token;
    let user = data.user;
    let refreshToken = data.refreshToken;

    // 만약 data.data 구조라면 그 안에서 추출
    if (!token && data.data) {
      token = data.data.token;
      user = data.data.user || user;
      refreshToken = data.data.refreshToken || refreshToken;
    }

    console.log("[DEBUG API] OAuth 토큰 교환 성공:", {
      hasToken: !!token,
      hasUser: !!user,
      hasRefreshToken: !!refreshToken,
      tokenLength: token ? token.length : 0,
    });

    return {
      success: data.success,
      message: data.message,
      token,
      refreshToken,
      user,
    };
  },

  // OAuth 삭제된 계정 상세 정보 조회 (RFC 9457 형식)
  getOAuthDeletedAccountInfo: async (
    accountId: string
  ): Promise<{
    type: string;
    title: string;
    status: number;
    detail: string;
    instance: string;
    extensions: {
      accountStatus: string;
      accountId: number;
      deletedAt: string;
      permanentDeletionDate: string;
      provider: string;
      remainingDays: number;
      canReactivate: boolean;
      supportContact: string;
    };
  }> => {
    console.log(
      "[DEBUG API] OAuth 삭제된 계정 정보 조회 시작, accountId:",
      accountId
    );

    const response = await fetch(
      `${API_BASE_URL}/auth/oauth/deleted-account/${accountId}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    console.log(
      "[DEBUG API] OAuth 삭제된 계정 정보 응답 상태:",
      response.status
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("[DEBUG API] OAuth 삭제된 계정 정보 조회 실패:", errorData);

      // 403 상태이면서 RFC 9457 형식의 삭제된 계정 정보인 경우 성공으로 처리
      if (
        response.status === 403 &&
        errorData.type === "OAUTH_DELETED_ACCOUNT"
      ) {
        console.log(
          "[DEBUG API] 403이지만 삭제된 계정 정보 반환, 성공으로 처리"
        );
        return errorData;
      }

      throw new UserApiError(
        response.status,
        errorData.detail ||
          errorData.message ||
          "삭제된 계정 정보 조회에 실패했습니다."
      );
    }

    const data = await response.json();
    console.log("[DEBUG API] OAuth 삭제된 계정 정보:", data);

    return data;
  },
};
