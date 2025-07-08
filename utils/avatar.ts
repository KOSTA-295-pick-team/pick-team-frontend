// 기본 아바타 이미지 유틸리티 함수들

/**
 * 사용자 ID 기반으로 기본 아바타 이미지 URL을 생성합니다.
 * API 문서: "클라이언트에서 기본 아바타 이미지 표시 권장"
 */
export const getDefaultAvatar = (
  userId: string,
  size: number = 128
): string => {
  // DiceBear - 깔끔하고 다양한 스타일의 아바타 생성
  // 사용자 ID를 시드로 사용하여 일관된 아바타 생성
  return `https://api.dicebear.com/7.x/pixel-art/svg?seed=${userId}&size=${size}&backgroundColor=ffb74d,ff8a65,a1887f,90a4ae,81c784`;
};

/**
 * 프로필 이미지 URL을 반환합니다.
 * null이면 기본 아바타를 반환합니다.
 */
export const getProfileImageSrc = (
  profileImageUrl: string | null | undefined,
  userId: string,
  size: number = 128
): string => {
  // API 문서: profileImageUrl이 null인 경우 기본 아바타 표시
  // 빈 문자열("")도 falsy 값으로 처리하여 기본 아바타 사용
  if (!profileImageUrl || profileImageUrl.trim() === "") {
    return getDefaultAvatar(userId, size);
  }

  // 이미 완전한 URL인 경우 (http로 시작) 그대로 반환
  if (profileImageUrl.startsWith("http")) {
    return profileImageUrl;
  }

  // 상대 경로인 경우 서버 URL 앞에 붙여서 절대 경로로 변환
  const baseUrl = "http://localhost:8081";
  return `${baseUrl}${profileImageUrl}`;
};

/**
 * 이미지 로드 에러 시 기본 아바타로 대체하는 핸들러
 */
export const handleImageError = (
  event: React.SyntheticEvent<HTMLImageElement>,
  userId: string,
  size: number = 128
) => {
  const target = event.currentTarget;
  target.src = getDefaultAvatar(userId, size);
};
