// UserController API 관련 타입 정의
export interface RegisterUserRequest {
  email: string;
  password: string;
  confirmPassword: string; // USER_API_DOCUMENTATION.md 기준
}

export interface CheckDuplicateIdRequest {
  email: string;
}

export interface ValidatePasswordRequest {
  password: string;
}

export interface RequestEmailVerificationRequest {
  email: string;
}

export interface VerifyEmailRequest {
  email: string;
  verificationCode: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginWithClientInfoRequest extends LoginRequest {
  clientInfo: {
    userAgent?: string;
    ipAddress?: string;
    deviceType?: string;
    deviceId?: string;
  };
}

export interface LogoutWithClientInfoRequest {
  clientInfo: {
    userAgent?: string;
    ipAddress?: string;
    deviceType?: string;
    deviceId?: string;
  };
}

export interface UpdateMyProfileRequest {
  // API 문서 기준 필드들
  name?: string;
  age?: number;
  mbti?: string;
  disposition?: string;
  introduction?: string;
  portfolio?: string;
  profileImageUrl?: string | null;
  preferWorkstyle?: string;
  dislikeWorkstyle?: string;
  hashtags?: string[];
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface SearchHashtagsQuery {
  keyword: string;
  limit?: number;
}

// 응답 타입들
export interface UserResponse {
  id: number;
  email: string;
  name: string;
  age?: number;
  role: string;
  mbti?: string;
  disposition?: string; // 성향 설명
  introduction?: string; // 자기소개
  portfolio?: string; // 포트폴리오 링크
  profileImageUrl?: string | null; // USER_API_DOCUMENTATION 기준 (정확한 필드명)
  preferWorkstyle?: string; // 선호 작업 스타일
  dislikeWorkstyle?: string; // 기피 작업 스타일
  hashtags?: string[]; // 해시태그 배열

  // 호환성을 위해 남겨둠 (현재 UI에서 사용 중)
  bio?: string; // User 타입의 bio 필드와 매핑됨
  tags?: string[]; // User 타입의 tags 필드와 매핑됨 (hashtags와 동일)
  createdAt?: string;
  updatedAt?: string;

  // 추천 팀원에서만 사용되는 필드
  matchScore?: number; // AI 추천 매칭 점수
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: string; // 새로 추가 (USER_API_DOCUMENTATION 기준)
  expiresIn: number;
  user: UserResponse;
}

export interface SessionStatusResponse {
  isAuthenticated: boolean;
  user?: UserResponse;
  expiresAt?: string;
}

export interface HashtagResponse {
  id: number;
  name: string;
  usageCount: number;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export interface ValidationResponse {
  isValid: boolean;
  message?: string;
}

export interface EmailVerificationResponse {
  // API 문서에 따르면 data: null 이므로 빈 객체나 undefined 허용
}

// API 문서에 맞는 추가 응답 타입들
export interface RegisterResponse {
  // API 문서: data: null
}

export interface LogoutResponse {
  logoutTime: string;
  invalidatedSessions: number;
}

export interface CheckDuplicateResponse {
  // API 문서: data: true/false (boolean)
}

export interface PasswordValidationResponse {
  // API 문서: data: true/false (boolean)
}

export interface EmailVerifyResponse {
  isVerified: boolean;
}
