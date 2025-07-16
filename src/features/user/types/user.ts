export interface User {
  id: string; // 로그인 프로젝트와 통합하여 string으로 변경
  email: string;
  name: string;
  nickname?: string; // 새로 추가
  role?: string; // optional로 변경
  
  // 프로필 정보
  bio?: string; // 자기소개
  skills?: string[]; // 기술 스택
  interests?: string[]; // 관심사
  profileImageUrl?: string | null; // 프로필 이미지 URL
  
  // 소셜 링크
  githubUrl?: string; // GitHub 링크
  linkedinUrl?: string; // LinkedIn 링크
  portfolioUrl?: string; // 포트폴리오 링크
  
  // 기존 필드들 (호환성 유지)
  age?: number;
  mbti?: string;
  disposition?: string; // 사용자 성향/특성 설명
  introduction?: string; // 사용자 자기소개 (bio와 중복이지만 호환성)
  portfolio?: string; // 포트폴리오 링크 또는 설명 (portfolioUrl과 중복이지만 호환성)
  preferWorkstyle?: string; // 선호하는 작업 스타일
  dislikeWorkstyle?: string; // 기피하는 작업 스타일
  likes?: string; // 좋아하는 것들
  dislikes?: string; // 싫어하는 것들
  hashtags?: string[]; // 해시태그 목록
  
  // 호환성을 위해 남겨둠
  profileImage?: string; // → profileImageUrl로 매핑됨
  portfolioLink?: string; // → portfolioUrl로 매핑됨
  preferredStyle?: string; // → preferWorkstyle로 매핑됨
  avoidedStyle?: string; // → dislikeWorkstyle로 매핑됨
  profilePictureUrl?: string; // → profileImageUrl로 매핑됨
  
  // 날짜 정보
  createdAt?: string;
  updatedAt?: string;
  
  currentWorkspaceId?: string;
  currentTeamProjectId?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string; // accessToken
  refreshToken: string;
  user: User;
} 

export interface UserProfileUpdateRequest {
  name?: string;
  age?: number;
  mbti?: string;
  disposition?: string;
  introduction?: string;
  portfolio?: string;
  profileImageUrl?: string;
  preferWorkstyle?: string;
  dislikeWorkstyle?: string;
  hashtags?: string[];
} 