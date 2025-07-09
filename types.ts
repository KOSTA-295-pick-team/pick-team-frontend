export interface User {
  id: string;
  email: string;
  name?: string;
  age?: number;
  mbti?: string;
  disposition?: string; // 사용자 성향/특성 설명
  introduction?: string; // 사용자 자기소개
  portfolio?: string; // 포트폴리오 링크 또는 설명
  preferWorkstyle?: string; // 선호하는 작업 스타일
  dislikeWorkstyle?: string; // 기피하는 작업 스타일
  likes?: string; // 좋아하는 것들
  dislikes?: string; // 싫어하는 것들
  profileImage?: string; // 프로필 이미지
  tags?: string[]; // 해시태그 목록 (UserHashtagList에서 가져온 것)

  // 호환성을 위해 남겨둠 (기존 코드에서 사용 중)
  bio?: string; // → introduction으로 매핑됨
  portfolioLink?: string; // → portfolio로 매핑됨
  preferredStyle?: string; // → preferWorkstyle로 매핑됨
  avoidedStyle?: string; // → dislikeWorkstyle로 매핑됨
  profilePictureUrl?: string; // → profileImage로 매핑됨

  currentWorkspaceId?: string;
  currentTeamProjectId?: string;
}

export interface Workspace {
  id: string;
  name: string;
  iconUrl?: string;
  owner: {
    id: string;
    name: string;
    profileImage?: string;
    role: string;
  };
  passwordProtected: boolean;
  inviteCode?: string;
  url?: string; // 초대 링크용 URL
  memberCount: number;
  members: {
    id: string;
    name: string;
    profileImage?: string;
    role: string;
  }[];
  createdAt: string;
  updatedAt: string;
}

export interface TeamProject {
  id: string;
  workspaceId: string;
  name: string;
  members: User[];
  memberCount?: number;
  announcements: Announcement[];
  passwordProtected?: boolean;
  progress?: number;
}

// Channel is now less about chat, more a generic concept if needed elsewhere.
// Chat functionality is now primarily driven by ChatRoom.
export interface Channel {
  id: string;
  teamProjectId: string;
  name: string;
  type: "kanban" | "bulletin" | "video" | "general"; // Type of content/feature
  description?: string;
}

export interface Announcement {
  id: string;
  title: string; // 백엔드 요구사항에 맞춰 필수 필드로 변경
  content: string;
  author: string;
  timestamp: string; // Date -> string으로 변경 (Redux 직렬화를 위해)
  // 백엔드 호환성을 위한 추가 필드들 (선택적)
  authorName?: string;
  createdAt?: string;
  updatedAt?: string;
  teamProjectId?: string;
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

// Chat Types
export interface ChatRoomMember
  extends Pick<User, "id" | "name" | "profilePictureUrl"> {
  isBanned?: boolean; // For member management example
}

export interface ChatRoom {
  id: string;
  workspaceId: string;
  name?: string; // Optional, used for group chats
  type: "dm" | "group";
  members: ChatRoomMember[]; // Array of member IDs and basic info
  lastMessage?: ChatMessage; // For preview in sidebar
  unreadCount?: number;
  createdAt: Date;
  updatedAt: Date;
  creatorId?: string; // User ID of the creator
}

export interface ChatMessage {
  id: string;
  roomId: string; // Links to ChatRoom
  userId: string;
  userName: string;
  text: string;
  timestamp: Date;
  attachment?: {
    fileName: string;
    fileUrl: string;
    type: "image" | "file";
  };
}

export interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  description?: string;
  type: "MEETING" | "DEADLINE" | "WORKSHOP" | "VACATION" | "OTHER";
  teamProjectId: string;
  creatorId?: string;
  creatorName?: string;
  teamId?: string;
  teamName?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

// 백엔드 API 응답 타입
export interface ScheduleResponse {
  id: number;
  title: string;
  startDate: string;
  endDate: string;
  scheduleDesc?: string;
  type: "MEETING" | "DEADLINE" | "WORKSHOP" | "VACATION" | "OTHER";
  typeName: string;
  creatorName: string;
  creatorId: number;
  teamName: string;
  teamId: number;
  createdAt: string;
  updatedAt: string;
}

// 백엔드 페이징 응답 타입
export interface SchedulePageResponse {
  content: ScheduleResponse[];
  pageable: {
    pageNumber: number;
    pageSize: number;
  };
  totalPages: number;
  totalElements: number;
  first: boolean;
  last: boolean;
  hasNext: boolean;
  hasPrevious: boolean;
}

// 백엔드 일정 생성/수정 요청 타입
export interface ScheduleCreateRequest {
  title: string;
  startDate: string;
  endDate: string;
  scheduleDesc?: string;
  type: "MEETING" | "DEADLINE" | "WORKSHOP" | "VACATION" | "OTHER";
}

export interface ScheduleUpdateRequest {
  title: string;
  startDate: string;
  endDate: string;
  scheduleDesc?: string;
  type: "MEETING" | "DEADLINE" | "WORKSHOP" | "VACATION" | "OTHER";
}

export interface Notification {
  id: string;
  message: string;
  timestamp: Date;
  read: boolean;
  link?: string;
}

export enum TeamFormationMethod {
  AUTO_DICE = "auto_dice",
  AUTO_LADDER = "auto_ladder",
  VOTE_BASED = "vote_based",
  ADMIN_MANUAL = "admin_manual",
}

export interface TendencyTag {
  id: string;
  label: string;
}

export interface VoteOption {
  id: string;
  text: string;
  votes: number;
}

export interface Poll {
  id: string;
  question: string;
  options: VoteOption[];
  allowMultipleVotes?: boolean;
  teamProjectId?: string;
}

// Kanban Types
export interface KanbanCard {
  id: string;
  columnId: string;
  title: string;
  description?: string;
  assigneeIds?: string[];
  dueDate?: Date;
  attachments?: KanbanAttachment[];
  comments?: KanbanComment[];
  order: number;
  isApproved?: boolean;
}

export interface KanbanColumn {
  id: string;
  boardId: string;
  title: string;
  cards: KanbanCard[];
  order: number;
}

export interface KanbanBoard {
  id: string;
  teamProjectId: string;
  columns: KanbanColumn[];
}

export interface KanbanAttachment {
  id: string;
  cardId: string;
  fileName: string;
  fileUrl: string;
  uploadedAt: Date;
  uploaderId: string;
}

export interface KanbanComment {
  id: string;
  cardId: string;
  userId: string;
  userName: string;
  text: string;
  createdAt: Date;
}

// Bulletin Board Types
export interface BulletinPost {
  id: string;
  teamProjectId: string;
  title: string;
  content: string;
  authorId: string;
  authorName: string;
  createdAt: Date;
  updatedAt?: Date;
  attachments?: BulletinAttachment[];
  comments?: BulletinComment[];
  viewCount?: number;
}

export interface BulletinComment {
  id: string;
  postId: string;
  userId: string;
  userName: string;
  text: string;
  createdAt: Date;
}

export interface BulletinAttachment {
  id: string;
  postId: string;
  fileName: string;
  fileUrl: string;
}

// 백엔드 게시판 API 타입들
export interface PostResponse {
  id: number;
  postNo: number;
  title: string;
  content: string;
  authorName: string;
  authorId: number;
  boardId: number;
  createdAt: string;
  updatedAt: string;
  attachments: PostAttachResponseDto[];
  commentCount: number;
}

export interface PostCreateRequest {
  title: string;
  content: string;
  boardId: number;
}

export interface PostUpdateRequest {
  title: string;
  content: string;
}

export interface CommentResponse {
  id: number;
  content: string;
  authorName: string;
  authorId: number;
  postId: number;
  createdAt: string;
  updatedAt: string;
}

export interface CommentCreateRequest {
  content: string;
}

export interface CommentUpdateRequest {
  content: string;
}

export interface PostAttachResponseDto {
  id: number;
  originalFileName: string;
  hashedFileName: string;
  fileSize: number;
  createdAt: string;
  downloadUrl: string;
}

// 백엔드 페이징 응답 타입
export interface PostPageResponse {
  content: PostResponse[];
  pageable: {
    pageNumber: number;
    pageSize: number;
  };
  totalPages: number;
  totalElements: number;
  first: boolean;
  last: boolean;
  hasNext: boolean;
  hasPrevious: boolean;
}

export interface CommentPageResponse {
  content: CommentResponse[];
  pageable: {
    pageNumber: number;
    pageSize: number;
  };
  totalPages: number;
  totalElements: number;
  first: boolean;
  last: boolean;
  hasNext: boolean;
  hasPrevious: boolean;
}

export interface Team extends TeamProject {}
