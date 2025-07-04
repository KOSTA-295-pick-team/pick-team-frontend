// UserController API 관련 타입 정의
export interface RegisterUserRequest {
  email: string;
  password: string;
  confirmPassword: string; // 백엔드에서 필수로 요구
  name?: string; // 선택적으로 변경
  age?: number;
  mbti?: string;
  disposition?: string;
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
  };
}

export interface LogoutWithClientInfoRequest {
  clientInfo: {
    userAgent?: string;
    ipAddress?: string;
    deviceType?: string;
  };
}

export interface UpdateMyProfileRequest {
  name?: string;
  age?: number;
  mbti?: string;
  disposition?: string;
  introduction?: string;
  portfolio?: string;
  preferWorkstyle?: string;
  dislikeWorkstyle?: string;
  likes?: string;
  dislikes?: string;
  tags?: string[];
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
  mbti?: string;
  disposition?: string;
  introduction?: string;
  portfolio?: string;
  preferWorkstyle?: string;
  dislikeWorkstyle?: string;
  likes?: string;
  dislikes?: string;
  profileImage?: string;
  tags?: string[];
  role: string;
  createdAt: string;
  updatedAt: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
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
  sent: boolean;
  message: string;
  expiresAt?: string;
}
