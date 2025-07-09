/**
 * OAuth 소셜 로그인 API 서비스
 * OAUTH_API_GUIDE.md 기반으로 구현
 */

// 기존 user-controller 구조를 따라 API_BASE_URL 설정
const API_BASE_URL = "http://localhost:8081";

export type OAuthProvider = "google" | "kakao";

/**
 * OAuth 로그인 시작
 * OAuth 제공자 로그인 페이지로 리다이렉트
 */
export const startOAuthLogin = (provider: OAuthProvider): void => {
  const loginUrl = `${API_BASE_URL}/api/auth/oauth/${provider}/login`;
  window.location.href = loginUrl;
};

/**
 * OAuth 계정 연동
 * 기존 사용자가 소셜 계정을 연동할 때 사용
 */
export const linkOAuthAccount = async (
  provider: OAuthProvider,
  code: string,
  accessToken: string
): Promise<{ success: boolean; message: string; data: null }> => {
  const response = await fetch(
    `${API_BASE_URL}/api/auth/oauth/${provider}/link`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ code }),
    }
  );

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return await response.json();
};

/**
 * OAuth 계정 연동 해제
 * 연동된 소셜 계정을 해제할 때 사용
 */
export const unlinkOAuthAccount = async (
  provider: OAuthProvider,
  accessToken: string
): Promise<{ success: boolean; message: string; data: null }> => {
  const response = await fetch(
    `${API_BASE_URL}/api/auth/oauth/${provider}/unlink`,
    {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return await response.json();
};

/**
 * OAuth 계정 연동 상태 확인
 * 특정 제공자의 계정 연동 여부를 확인
 */
export const checkOAuthLinkStatus = async (
  provider: OAuthProvider,
  accessToken: string
): Promise<{ success: boolean; message: string; data: boolean }> => {
  const response = await fetch(
    `${API_BASE_URL}/api/auth/oauth/${provider}/status`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return await response.json();
};

/**
 * OAuth 에러 처리 헬퍼 함수
 * 다양한 OAuth 에러 상황에 대한 사용자 친화적 메시지 반환
 */
export const handleOAuthError = (
  error: Error,
  provider: OAuthProvider
): string => {
  const errorMessage = error.message.toLowerCase();

  if (errorMessage.includes("지원하지 않는")) {
    return `${provider}는 지원하지 않는 로그인 방식입니다.`;
  } else if (
    errorMessage.includes("취소") ||
    errorMessage.includes("access_denied")
  ) {
    return "로그인이 취소되었습니다.";
  } else if (errorMessage.includes("인증 코드")) {
    return "로그인 처리 중 오류가 발생했습니다. 다시 시도해주세요.";
  } else if (
    errorMessage.includes("네트워크") ||
    errorMessage.includes("network")
  ) {
    return "네트워크 오류가 발생했습니다. 인터넷 연결을 확인해주세요.";
  } else {
    return `${provider} 로그인 중 오류가 발생했습니다.`;
  }
};
