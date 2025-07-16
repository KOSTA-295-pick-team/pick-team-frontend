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
  content: string;
  authorId: string;
  authorName: string;
  createdAt: string;
  author: {
    id: string;
    name: string;
    profileImageUrl: string;
  };
}

export interface KanbanCard {
  id: string;
  title: string;
  content?: string;
  description?: string;
  deadline?: string;
  isApproved?: boolean;
  completionRequested?: boolean;
  completionRequestMessage?: string;
  assignees: {
    id: string;
    userId: string;
    name: string;
    profileImageUrl: string;
  }[];
  comments: KanbanComment[];
}

export interface KanbanColumn {
  id: string;
  title: string;
  cards: KanbanCard[];
}

export interface KanbanBoard {
  id: string;
  teamId: string;
  columns: KanbanColumn[];
}

export interface KanbanTaskUpdateRequest {
  subject?: string;
  content?: string;
  dueDate?: string;
  deadline?: string;
  kanbanListId?: string;
  order?: number;
  isApproved?: boolean;
  assigneeIds?: string[];
}
