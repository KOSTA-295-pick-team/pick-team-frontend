// UserController API 관련 유틸리티 함수들
import { UserResponse } from "./types";
import { User } from "../../types";

/**
 * 백엔드 UserResponse를 프론트엔드 User 타입으로 변환
 */
export const transformUserResponse = (user: UserResponse): User => {
  return {
    id: user.id.toString(),
    email: user.email,
    name: user.name,
    age: user.age,
    mbti: user.mbti,
    disposition: user.disposition,
    introduction: user.introduction,
    portfolio: user.portfolio,
    preferWorkstyle: user.preferWorkstyle,
    dislikeWorkstyle: user.dislikeWorkstyle,
    likes: user.likes,
    dislikes: user.dislikes,
    profileImage: user.profileImage,
    tags: user.tags || [],

    // 호환성을 위한 매핑
    bio: user.introduction,
    portfolioLink: user.portfolio,
    preferredStyle: user.preferWorkstyle,
    avoidedStyle: user.dislikeWorkstyle,
    profilePictureUrl:
      user.profileImage || `https://picsum.photos/seed/${user.email}/100/100`,
  };
};

/**
 * 클라이언트 정보 수집 함수
 */
export const getClientInfo = () => {
  if (typeof window === "undefined") {
    return {};
  }

  return {
    userAgent: navigator.userAgent,
    deviceType: /Mobile|Android|iPhone|iPad/.test(navigator.userAgent)
      ? "mobile"
      : "desktop",
    // ipAddress는 백엔드에서 처리하므로 제외
  };
};

/**
 * 이메일 유효성 검사
 */
export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * 비밀번호 강도 검사
 */
export const validatePassword = (
  password: string
): { isValid: boolean; message?: string } => {
  if (password.length < 8) {
    return {
      isValid: false,
      message: "비밀번호는 최소 8자 이상이어야 합니다.",
    };
  }

  if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
    return {
      isValid: false,
      message: "비밀번호는 대문자, 소문자, 숫자를 포함해야 합니다.",
    };
  }

  return { isValid: true };
};

/**
 * 해시태그 검색 키워드 유효성 검사
 */
export const validateHashtagKeyword = (keyword: string): boolean => {
  return keyword.length >= 2 && keyword.length <= 50;
};
