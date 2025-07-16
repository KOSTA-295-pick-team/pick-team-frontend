export interface BulletinAttachment {
  id: number; // string에서 number로 변경
  postId: number;
  fileName: string;
  fileUrl: string;
}

export interface BulletinComment {
  id: number;
  postId: number;
  authorId: number;
  authorName: string;
  content: string;
  createdAt: string;
}

export interface BulletinPost {
  id: number;
  boardId: string;
  teamId?: string;
  title: string;
  content: string;
  authorId: number;
  authorName: string;
  createdAt: string;
  updatedAt?: string;
  attachments?: BulletinAttachment[];
  comments?: BulletinComment[];
}

export interface PostAttachResponseDto {
  id: number;
  originalFileName: string;
  hashedFileName: string;
  fileSize: number;
  createdAt: string;
  downloadUrl: string;
}

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
