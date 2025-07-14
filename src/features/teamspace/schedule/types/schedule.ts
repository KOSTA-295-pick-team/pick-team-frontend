export interface CalendarEvent {
  id: number;
  title: string;
  startDate: string;
  endDate: string;
  scheduleDesc?: string;
  type: "MEETING" | "DEADLINE" | "WORKSHOP" | "VACATION" | "OTHER";
  teamId: number;
  creatorId?: number;
  creatorName?: string;
  teamName?: string;
  typeName?: string;
  createdAt?: string;
  updatedAt?: string;
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