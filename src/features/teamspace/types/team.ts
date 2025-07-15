import { Announcement, User } from "@/types";

export interface Team {
    id: string;
    name: string;
    description?: string;
    workspaceId: string;
    ownerId?: number;
    passwordProtected?: boolean;
    createdAt?: string;
    members: User[];
    announcements: Announcement[];
    memberCount?: number;
    progress?: number;
    kanbanId?: number;
    bulletinBoardId?: number;
    boardId?: number; // 게시판 ID 추가
    leader?: User; // 팀장 정보 추가
}

/**
 * @deprecated Team 인터페이스를 대신 사용하세요.
 */
export interface TeamProject {
  id: string;
    name: string;
    description?: string;
  workspaceId: string;
    ownerId: number;
    passwordProtected: boolean;
    createdAt: string;
  members: User[];
    announcements: Announcement[];
    kanbanBoardId: string;
    bulletinBoardId: string;
  memberCount?: number;
  progress?: number;
}

export interface TeamMember {
    id: number;
    userId: number;
    teamId: number;
    role: string;
    createdAt: string;
}