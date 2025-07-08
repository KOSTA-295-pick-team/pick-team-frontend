/**
 * 해시태그 관련 유틸리티 함수들
 * 서버 규칙: 한글, 영문, 숫자, 언더스코어만 허용 (2-20자)
 */

// 해시태그 유효성 검증
export const validateHashtag = (tag: string): string[] => {
  const errors: string[] = [];

  if (!tag || typeof tag !== "string") {
    errors.push("해시태그는 문자열이어야 합니다.");
    return errors;
  }

  const trimmed = tag.trim();

  if (trimmed.length < 2) {
    errors.push("해시태그는 최소 2자 이상이어야 합니다.");
  }

  if (trimmed.length > 20) {
    errors.push("해시태그는 최대 20자 이하여야 합니다.");
  }

  if (!/^[가-힣a-zA-Z0-9_]+$/.test(trimmed)) {
    errors.push(
      "해시태그는 한글, 영문, 숫자, 언더스코어만 사용할 수 있습니다."
    );
  }

  return errors;
};

// 해시태그 목록 유효성 검증
export const validateHashtagList = (hashtags: string[]): string[] => {
  const errors: string[] = [];

  if (!Array.isArray(hashtags)) {
    errors.push("해시태그 목록은 배열이어야 합니다.");
    return errors;
  }

  if (hashtags.length > 20) {
    errors.push("해시태그는 최대 20개까지 등록할 수 있습니다.");
  }

  const uniqueHashtags = new Set<string>();
  hashtags.forEach((tag, index) => {
    const tagErrors = validateHashtag(tag);
    if (tagErrors.length > 0) {
      errors.push(`${index + 1}번째 해시태그: ${tagErrors.join(", ")}`);
    }

    const normalized = tag.trim().toLowerCase();
    if (uniqueHashtags.has(normalized)) {
      errors.push(`중복된 해시태그: ${tag}`);
    } else {
      uniqueHashtags.add(normalized);
    }
  });

  return errors;
};

// 검색 키워드 유효성 검증
export const validateSearchKeyword = (keyword: string): string[] => {
  const errors: string[] = [];

  if (!keyword || typeof keyword !== "string") {
    errors.push("검색 키워드는 필수입니다.");
    return errors;
  }

  const trimmed = keyword.trim();

  if (trimmed.length === 0) {
    errors.push("검색 키워드는 공백일 수 없습니다.");
  }

  if (trimmed.length > 50) {
    errors.push("검색 키워드는 50자 이하여야 합니다.");
  }

  return errors;
};

// 해시태그 정규화 (# 제거, 트림, 유효성 검증)
export const normalizeHashtag = (tag: string): string | null => {
  if (!tag || typeof tag !== "string") return null;

  // # 기호 제거하고 앞뒤 공백 제거
  const normalized = tag.replace(/^#/, "").trim();

  // 유효성 검증
  const errors = validateHashtag(normalized);
  if (errors.length > 0) {
    console.warn(`유효하지 않은 해시태그: ${tag}`, errors);
    return null;
  }

  return normalized;
};

// 해시태그 목록 정규화 (중복 제거, 정렬, 유효성 검증)
export const normalizeHashtagList = (hashtags: string[]): string[] => {
  if (!Array.isArray(hashtags)) return [];

  const normalizedTags = hashtags
    .map(normalizeHashtag)
    .filter((tag): tag is string => tag !== null);

  // 중복 제거 (대소문자 무시)
  const uniqueTags = Array.from(
    new Map(normalizedTags.map((tag) => [tag.toLowerCase(), tag])).values()
  );

  // 길이 제한 적용
  return uniqueTags.slice(0, 20);
};

// 해시태그가 유효한지 간단히 확인
export const isValidHashtag = (tag: string): boolean => {
  return validateHashtag(tag).length === 0;
};

// 해시태그 표시용 포맷팅 (# 접두사 추가)
export const formatHashtagForDisplay = (tag: string): string => {
  const normalized = normalizeHashtag(tag);
  return normalized ? `#${normalized}` : "";
};

// 디바운스 함수
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  delay: number
): ((...args: Parameters<T>) => void) => {
  let timeoutId: NodeJS.Timeout;

  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
};
