import { apiRequest } from '@/lib/apiClient';
import { 
    PostResponse, 
    PostCreateRequest, 
    PostUpdateRequest, 
    CommentResponse, 
    CommentCreateRequest, 
    CommentUpdateRequest, 
    PostPageResponse,
    CommentPageResponse
} from '@/features/teamspace/bulletin/types/board';
export type { PostCreateRequest };

// accountId는 API를 호출하는 컴포넌트 레벨에서 주입해야 함

export const bulletinApi = {
    // 게시글 목록 조회
    getPosts: async (teamId: string, boardId: number, page: number, size: number): Promise<PostPageResponse> => {
        return apiRequest<PostPageResponse>(`/teams/${teamId}/posts?boardId=${boardId}&page=${page}&size=${size}`);
    },

    // 게시글 상세 조회
    getPost: async (postId: number): Promise<PostResponse> => {
        return apiRequest<PostResponse>(`/posts/${postId}`);
    },

    // 게시글 생성
    createPost: async (teamId: string, accountId: string, data: PostCreateRequest): Promise<PostResponse> => {
        return apiRequest<PostResponse>(`/teams/${teamId}/posts?accountId=${accountId}`, {
            method: 'POST',
            body: JSON.stringify(data),
        });
    },

    // 게시글 수정
    updatePost: async (postId: number, accountId: string, data: PostUpdateRequest): Promise<PostResponse> => {
        return apiRequest<PostResponse>(`/posts/${postId}?accountId=${accountId}`, {
            method: 'PATCH',
            body: JSON.stringify(data),
        });
    },

    // 게시글 삭제
    deletePost: async (postId: number, accountId: string): Promise<void> => {
        return apiRequest<void>(`/posts/${postId}?accountId=${accountId}`, {
            method: 'DELETE',
        });
    },

    // 댓글 목록 조회
    getComments: async (postId: number, page: number, size: number): Promise<CommentPageResponse> => {
        return apiRequest<CommentPageResponse>(`/posts/${postId}/comments?page=${page}&size=${size}`);
    },

    // 댓글 생성
    createComment: async (postId: number, accountId: string, data: CommentCreateRequest): Promise<CommentResponse> => {
        return apiRequest<CommentResponse>(`/posts/${postId}/comments?accountId=${accountId}`, {
            method: 'POST',
            body: JSON.stringify(data),
        });
    },

    // 댓글 수정
    updateComment: async (commentId: number, accountId: string, data: CommentUpdateRequest): Promise<CommentResponse> => {
        return apiRequest<CommentResponse>(`/comments/${commentId}?accountId=${accountId}`, {
            method: 'PATCH',
            body: JSON.stringify(data),
        });
    },

    // 댓글 삭제
    deleteComment: async (commentId: number, accountId: string): Promise<void> => {
        return apiRequest<void>(`/comments/${commentId}?accountId=${accountId}`, {
            method: 'DELETE',
        });
    },

    // 첨부파일 삭제
    deleteAttachment: async (postId: number, attachmentId: string, accountId: string): Promise<void> => {
        return apiRequest<void>(`/posts/${postId}/attachments/${attachmentId}?accountId=${accountId}`, {
            method: 'DELETE',
        });
    }
}; 