export interface Announcement {
  id: string;
  title: string; // 백엔드 요구사항에 맞춰 필수 필드로 변경
  content: string;
  authorName:string;
  createdAt: string;
  updatedAt?: string;
  accountId?: string; // 작성자 ID 추가 (수정/삭제 권한 확인용)
  teamId?: string; // 팀 ID 추가
  teamName?: string; // 팀명 추가
  authorWithdrawn?: boolean; // 작성자 탈퇴 여부
}

// 페이징 응답 타입
export interface AnnouncementPageResponse {
  announcements: Announcement[];
  currentPage: number;
  totalPages: number;
  totalElements: number;
  size: number;
  first: boolean;
  last: boolean;
  hasNext: boolean;
  hasPrevious: boolean;
} 