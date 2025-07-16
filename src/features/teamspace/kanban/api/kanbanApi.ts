import { apiRequest } from "@/lib/apiClient";
import { ApiResponse } from "@/types/common";

// 백엔드 DTO 타입 정의
export interface KanbanTaskMemberDto {
  id: number;
  kanbanTaskId: number;
  accountId: number;
  memberName: string;
  profileImage: string;
  assignedAt: string;
}

export interface KanbanTaskCommentDto {
  id: number;
  comment: string;
  kanbanTaskId: number;
  accountId: number;
  authorName: string;
  createdAt: string;
  updatedAt: string;
}

export interface KanbanTaskDto {
  id: number;
  subject: string;
  content: string;
  deadline: string;
  kanbanListId: number;
  order: number;
  isApproved: boolean;
  completionRequested: boolean;
  completionRequestMessage: string;
  attachments: any[];
  comments: KanbanTaskCommentDto[];
  members: KanbanTaskMemberDto[];
  createdAt: string;
  updatedAt: string;
}

export interface KanbanListDto {
  id: number;
  kanbanListName: string;
  kanbanId: number;
  tasks: KanbanTaskDto[];
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface KanbanDto {
  id: number;
  teamId: number;
  workspaceId: number;
  kanbanLists: KanbanListDto[];
  createdAt: string;
  updatedAt: string;
}

// 요청 타입들
export interface KanbanCreateRequest {
  teamId: number;
  workspaceId: number;
}

export interface KanbanTaskCreateRequest {
  subject: string;
  content?: string;
  deadline?: string;
  kanbanListId: number;
  order?: number;
  assigneeIds?: number[];
}

export interface KanbanTaskUpdateRequest {
  subject?: string;
  content?: string;
  deadline?: string;
  kanbanListId?: number;
  order?: number;
  isApproved?: boolean;
  assigneeIds?: number[];
}

export interface KanbanTaskCommentCreateRequest {
  comment: string;
  kanbanTaskId: number;
}

export interface KanbanListCreateRequest {
  kanbanListName: string;
  kanbanId: number;
  order?: number;
}

export interface KanbanListUpdateRequest {
  kanbanListName: string;
  order?: number;
}

export interface KanbanTaskCommentUpdateRequest {
  comment: string;
}

export interface KanbanTaskCompletionRequest {
  message?: string;
}

export interface KanbanTaskCompletionApprovalRequest {
  approvalMessage?: string;
  approved: boolean;
}

export const kanbanApi = {
  // 칸반 보드 생성
  createKanban: async (data: KanbanCreateRequest): Promise<KanbanDto> => {
    const response = await apiRequest<ApiResponse<KanbanDto>>("/kanban", {
      method: "POST",
      body: JSON.stringify(data),
    });
    return response.data;
  },

  // 팀의 칸반 보드 조회
  getKanbanByTeamId: async (teamId: string): Promise<KanbanDto> => {
    const response = await apiRequest<ApiResponse<KanbanDto>>(
      `/kanban/team/${teamId}`
    );
    return response.data;
  },

  // 칸반 리스트 생성
  createKanbanList: async (
    data: KanbanListCreateRequest
  ): Promise<KanbanListDto> => {
    const response = await apiRequest<ApiResponse<KanbanListDto>>(
      "/kanban/lists",
      {
        method: "POST",
        body: JSON.stringify(data),
      }
    );
    return response.data;
  },

  // 칸반 리스트 수정
  updateKanbanList: async (
    listId: string,
    data: KanbanListUpdateRequest
  ): Promise<KanbanListDto> => {
    const response = await apiRequest<ApiResponse<KanbanListDto>>(
      `/kanban/lists/${listId}`,
      {
        method: "PUT",
        body: JSON.stringify(data),
      }
    );
    return response.data;
  },

  // 칸반 리스트 삭제
  deleteKanbanList: async (listId: string): Promise<void> => {
    await apiRequest<ApiResponse<void>>(`/kanban/lists/${listId}`, {
      method: "DELETE",
    });
  },

  // 칸반 태스크 생성
  createTask: async (data: KanbanTaskCreateRequest): Promise<KanbanTaskDto> => {
    const response = await apiRequest<ApiResponse<KanbanTaskDto>>(
      "/kanban/tasks",
      {
        method: "POST",
        body: JSON.stringify(data),
      }
    );
    return response.data;
  },

  // 칸반 태스크 수정
  updateTask: async (
    taskId: string,
    data: KanbanTaskUpdateRequest
  ): Promise<KanbanTaskDto> => {
    const response = await apiRequest<ApiResponse<KanbanTaskDto>>(
      `/kanban/tasks/${taskId}`,
      {
        method: "PUT",
        body: JSON.stringify(data),
      }
    );
    return response.data;
  },

  // 칸반 태스크 삭제
  deleteTask: async (taskId: string): Promise<void> => {
    await apiRequest<ApiResponse<void>>(`/kanban/tasks/${taskId}`, {
      method: "DELETE",
    });
  },

  // 댓글 추가
  createComment: async (
    taskId: string,
    data: { comment: string }
  ): Promise<KanbanTaskCommentDto> => {
    const response = await apiRequest<ApiResponse<KanbanTaskCommentDto>>(
      `/kanban/tasks/${taskId}/comments`,
      {
        method: "POST",
        body: JSON.stringify({
          comment: data.comment,
          kanbanTaskId: parseInt(taskId),
        }),
      }
    );
    return response.data;
  },

  // 댓글 수정
  updateComment: async (
    taskId: string,
    commentId: string,
    data: KanbanTaskCommentUpdateRequest
  ): Promise<KanbanTaskCommentDto> => {
    const response = await apiRequest<ApiResponse<KanbanTaskCommentDto>>(
      `/kanban/tasks/${taskId}/comments/${commentId}`,
      {
        method: "PUT",
        body: JSON.stringify(data),
      }
    );
    return response.data;
  },

  // 댓글 삭제
  deleteComment: async (taskId: string, commentId: string): Promise<void> => {
    await apiRequest<ApiResponse<void>>(
      `/kanban/tasks/${taskId}/comments/${commentId}`,
      {
        method: "DELETE",
      }
    );
  },

  // 댓글 페이징 조회
  getComments: async (
    taskId: string,
    page: number = 0,
    size: number = 4
  ): Promise<{
    content: KanbanTaskCommentDto[];
    totalPages: number;
    totalElements: number;
  }> => {
    const response = await apiRequest<ApiResponse<any>>(
      `/kanban/tasks/${taskId}/comments?page=${page}&size=${size}`
    );
    return response.data;
  },

  // 작업 완료 요청
  requestTaskCompletion: async (
    taskId: string,
    data: KanbanTaskCompletionRequest
  ): Promise<KanbanTaskDto> => {
    const response = await apiRequest<ApiResponse<KanbanTaskDto>>(
      `/kanban/cards/${taskId}/completion-request`,
      {
        method: "POST",
        body: JSON.stringify(data),
      }
    );
    return response.data;
  },

  // 작업 완료 승인/거부
  approveTaskCompletion: async (
    taskId: string,
    data: KanbanTaskCompletionApprovalRequest
  ): Promise<KanbanTaskDto> => {
    const response = await apiRequest<ApiResponse<KanbanTaskDto>>(
      `/kanban/cards/${taskId}/completion-approval`,
      {
        method: "POST",
        body: JSON.stringify(data),
      }
    );
    return response.data;
  },
};
