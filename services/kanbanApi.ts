import { KanbanBoard, KanbanCard, KanbanColumn, KanbanComment } from '../types';

const API_BASE_URL = '/api/kanban';

// 칸반 보드 조회
export const fetchKanbanBoard = async (teamId: string): Promise<KanbanBoard> => {
  const response = await fetch(`${API_BASE_URL}/team/${teamId}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error('Failed to fetch kanban board');
  }

  const result = await response.json();
  
  // 백엔드 응답을 프론트엔드 타입에 맞게 변환
  const kanbanData = result.data;
  return {
    id: kanbanData.id.toString(),
    teamProjectId: teamId,
    columns: kanbanData.kanbanLists.map((list: any, index: number) => ({
      id: list.id.toString(),
      boardId: kanbanData.id.toString(),
      title: list.kanbanListName,
      order: index,
      cards: list.tasks.map((task: any) => ({
        id: task.id.toString(),
        columnId: list.id.toString(),
        title: task.subject,
        description: task.content,
        order: task.order || 0,
        isApproved: task.isApproved,
        dueDate: task.deadline ? new Date(task.deadline) : undefined,
        assigneeIds: task.members?.map((member: any) => member.accountId.toString()) || [],
        comments: task.comments?.map((comment: any) => ({
          id: comment.id.toString(),
          cardId: task.id.toString(),
          userId: comment.accountId.toString(),
          userName: comment.authorName,
          text: comment.comment,
          createdAt: new Date(comment.createdAt),
        })) || [],
        attachments: task.attachments?.map((attach: any) => ({
          id: attach.id.toString(),
          cardId: task.id.toString(),
          fileName: attach.fileName,
          fileUrl: attach.fileUrl,
          uploadedAt: new Date(attach.uploadedAt),
          uploaderId: 'unknown',
        })) || [],
      })),
    })),
  };
};

// 새 태스크 생성
export const createKanbanTask = async (taskData: {
  subject: string;
  content?: string;
  kanbanListId: string;
  deadline?: Date;
  assigneeIds?: string[];
}): Promise<KanbanCard> => {
  const response = await fetch(`${API_BASE_URL}/tasks`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify({
      subject: taskData.subject,
      content: taskData.content,
      kanbanListId: parseInt(taskData.kanbanListId),
      deadline: taskData.deadline?.toISOString(),
      assigneeIds: taskData.assigneeIds?.map(id => parseInt(id)),
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to create kanban task');
  }

  const result = await response.json();
  const task = result.data;
  
  return {
    id: task.id.toString(),
    columnId: task.kanbanListId.toString(),
    title: task.subject,
    description: task.content,
    order: task.order || 0,
    isApproved: task.isApproved,
    dueDate: task.deadline ? new Date(task.deadline) : undefined,
    assigneeIds: task.members?.map((member: any) => member.accountId.toString()) || [],
    comments: task.comments || [],
    attachments: task.attachments || [],
  };
};

// 태스크 업데이트
export const updateKanbanTask = async (taskId: string, taskData: {
  subject?: string;
  content?: string;
  kanbanListId?: string;
  deadline?: Date;
  isApproved?: boolean;
  assigneeIds?: string[];
}): Promise<KanbanCard> => {
  const response = await fetch(`${API_BASE_URL}/tasks/${taskId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify({
      subject: taskData.subject,
      content: taskData.content,
      kanbanListId: taskData.kanbanListId ? parseInt(taskData.kanbanListId) : undefined,
      deadline: taskData.deadline?.toISOString(),
      isApproved: taskData.isApproved,
      assigneeIds: taskData.assigneeIds?.map(id => parseInt(id)),
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to update kanban task');
  }

  const result = await response.json();
  const task = result.data;
  
  return {
    id: task.id.toString(),
    columnId: task.kanbanListId.toString(),
    title: task.subject,
    description: task.content,
    order: task.order || 0,
    isApproved: task.isApproved,
    dueDate: task.deadline ? new Date(task.deadline) : undefined,
    assigneeIds: task.members?.map((member: any) => member.accountId.toString()) || [],
    comments: task.comments?.map((comment: any) => ({
      id: comment.id.toString(),
      cardId: task.id.toString(),
      userId: comment.accountId.toString(),
      userName: comment.authorName,
      text: comment.comment,
      createdAt: new Date(comment.createdAt),
    })) || [],
    attachments: task.attachments || [],
  };
};

// 댓글 추가
export const addKanbanTaskComment = async (taskId: string, comment: string): Promise<KanbanComment> => {
  const response = await fetch(`${API_BASE_URL}/tasks/${taskId}/comments`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify({
      comment: comment,
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to add comment');
  }

  const result = await response.json();
  const commentData = result.data;
  
  return {
    id: commentData.id.toString(),
    cardId: commentData.kanbanTaskId.toString(),
    userId: commentData.accountId.toString(),
    userName: commentData.authorName,
    text: commentData.comment,
    createdAt: new Date(commentData.createdAt),
  };
};

// 태스크 삭제
export const deleteKanbanTask = async (taskId: string): Promise<void> => {
  const response = await fetch(`${API_BASE_URL}/tasks/${taskId}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error('Failed to delete kanban task');
  }
}; 