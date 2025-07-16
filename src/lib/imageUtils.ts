// 파일 및 이미지 URL 처리 유틸리티

/**
 * 현재 환경에 맞는 Base URL을 반환하는 함수
 */
const getBaseUrl = (): string => {
  // 개발 환경에서는 localhost:8081 사용
  if (window.location.hostname === 'localhost' || 
      window.location.hostname === '127.0.0.1' ||
      window.location.port === '3000' ||
      window.location.port === '5173') {
    return 'http://localhost:8081';
  }
  // 프로덕션 환경에서는 배포된 도메인 사용
  return 'https://www.pickteam.site';
};

/**
 * 백엔드에서 받은 파일 URL을 완전한 URL로 변환하는 유틸리티 함수
 * @param fileUrl 백엔드에서 받은 파일 URL (상대 경로일 수 있음)
 * @returns 완전한 파일 URL
 */
export const getFileUrl = (fileUrl?: string | null): string | null => {
  if (!fileUrl) return null;
  
  // 이미 완전한 URL인 경우 그대로 반환
  if (fileUrl.startsWith('http://') || fileUrl.startsWith('https://')) {
    return fileUrl;
  }
  
  // 상대 경로인 경우 현재 환경에 맞는 전체 URL로 변환
  if (fileUrl.startsWith('/')) {
    return `${getBaseUrl()}${fileUrl}`;
  }
  
  return fileUrl;
};

/**
 * 프로필 이미지 URL을 생성하는 유틸리티 함수
 * @param profileImageUrl 백엔드에서 받은 프로필 이미지 URL (상대 경로일 수 있음)
 * @param userId 사용자 ID (기본 이미지용)
 * @param size 이미지 크기 (기본 이미지용)
 * @returns 완전한 이미지 URL
 */
export const getProfileImageSrc = (
  profileImageUrl?: string | null, 
  userId?: string, 
  size = 128
): string => {
  if (profileImageUrl) {
    const fullUrl = getFileUrl(profileImageUrl);
    if (fullUrl) return fullUrl;
  }
  // 기본 이미지 (Picsum Photos를 사용한 결정적 이미지 생성)
  return `https://picsum.photos/seed/${userId || 'default'}/${size}/${size}`;
};

/**
 * 워크스페이스 아이콘 URL을 생성하는 유틸리티 함수
 * @param iconUrl 백엔드에서 받은 아이콘 URL (상대 경로일 수 있음)
 * @returns 완전한 아이콘 URL 또는 null (기본 텍스트 아이콘 사용)
 */
export const getWorkspaceIconSrc = (iconUrl?: string | null): string | null => {
  if (iconUrl) {
    return getFileUrl(iconUrl);
  }
  // 기본 아이콘은 없음 (텍스트로 표시)
  return null;
};

/**
 * 이미지 로드 에러 핸들링 함수
 * @param e 이미지 에러 이벤트
 * @param userId 사용자 ID
 * @param size 이미지 크기
 */
export const handleImageError = (
  e: React.SyntheticEvent<HTMLImageElement>, 
  userId?: string, 
  size = 128
): void => {
  const target = e.target as HTMLImageElement;
  target.src = `https://picsum.photos/seed/${userId || 'default'}/${size}/${size}`;
};
