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