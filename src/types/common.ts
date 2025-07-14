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

export interface Channel {
  id: string;
  teamProjectId: string;
  name: string;
  type: "kanban" | "bulletin" | "video" | "general"; // Type of content/feature
  description?: string;
}

export interface PageResponse<T> {
  content: T[];
  totalPages: number;
  totalElements: number;
  last: boolean;
  size: number;
  number: number;
} 

export interface UserProfile {
    // ...
}

// 공용 API 응답 인터페이스
export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
} 