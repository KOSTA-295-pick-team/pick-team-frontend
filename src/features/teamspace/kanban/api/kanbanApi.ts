import { apiRequest } from '@/lib/apiClient';
import { KanbanBoard, KanbanColumn, KanbanCard } from '@/types';
import { ApiResponse } from '@/types';

// DTO에 대응하는 타입들
interface KanbanListCreateRequest {
    title: string;
}

interface KanbanCardCreateRequest {
    title: string;
    content: string;
    dueDate?: string;
    assigneeId?: string;
}

interface KanbanCardUpdateRequest {
    title?: string;
    content?: string;
    dueDate?: string;
    assigneeId?: string;
    status?: string;
    columnId?: string;
}

export const kanbanApi = {
    // 팀의 칸반 보드 조회
    getBoard: async (teamId: string): Promise<KanbanBoard> => {
        return apiRequest<KanbanBoard>(`/kanban/team/${teamId}`);
    },

    // 칸반 열(컬럼) 생성
    createColumn: async (teamId: string, data: KanbanListCreateRequest): Promise<KanbanColumn> => {
        const response = await apiRequest<ApiResponse<KanbanColumn>>(`/kanban/team/${teamId}/columns`, {
            method: 'POST',
            body: JSON.stringify(data),
        });
        return response.data;
    },

    // 칸반 열(컬럼) 삭제
    deleteColumn: async (columnId: string): Promise<void> => {
        await apiRequest<ApiResponse<void>>(`/kanban/columns/${columnId}`, {
            method: 'DELETE'
        });
    },

    // 칸반 카드 생성
    createCard: async (columnId: string, data: KanbanCardCreateRequest): Promise<KanbanCard> => {
        const response = await apiRequest<ApiResponse<KanbanCard>>(`/kanban/columns/${columnId}/cards`, {
            method: 'POST',
            body: JSON.stringify(data),
        });
        return response.data;
    },

    // 칸반 카드 수정
    updateCard: async (cardId: string, data: KanbanCardUpdateRequest): Promise<KanbanCard> => {
        const response = await apiRequest<ApiResponse<KanbanCard>>(`/kanban/cards/${cardId}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        });
        return response.data;
    },

    // 칸반 태스크(카드) 삭제
    deleteCard: async (taskId: string): Promise<void> => {
        await apiRequest<ApiResponse<void>>(`/kanban/tasks/${taskId}`, {
            method: 'DELETE'
        });
    }
};