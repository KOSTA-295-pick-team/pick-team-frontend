import { apiRequest } from "@/lib/apiClient";
import { tokenManager } from "@/lib/apiClient";
import {
  PostResponse,
  PostCreateRequest,
  PostUpdateRequest,
  CommentResponse,
  CommentCreateRequest,
  CommentUpdateRequest,
  PostPageResponse,
  CommentPageResponse,
} from "@/features/teamspace/bulletin/types/board";
export type { PostCreateRequest };

// accountId는 API를 호출하는 컴포넌트 레벨에서 주입해야 함

export const bulletinApi = {
  // 게시글 목록 조회
  getPosts: async (
    teamId: string,
    boardId: number,
    page: number,
    size: number
  ): Promise<PostPageResponse> => {
    return apiRequest<PostPageResponse>(
      `/teams/${teamId}/posts?boardId=${boardId}&page=${page}&size=${size}`
    );
  },

  // 게시글 상세 조회
  getPost: async (postId: number): Promise<PostResponse> => {
    return apiRequest<PostResponse>(`/posts/${postId}`);
  },

  // 게시글 생성
  createPost: async (
    teamId: string,
    accountId: string,
    data: PostCreateRequest
  ): Promise<PostResponse> => {
    return apiRequest<PostResponse>(
      `/teams/${teamId}/posts?accountId=${accountId}`,
      {
        method: "POST",
        body: JSON.stringify(data),
      }
    );
  },

  // 파일과 함께 게시글 생성 (먼저 게시글 생성 후 파일 업로드)
  createPostWithFiles: async (
    teamId: string,
    accountId: string,
    data: PostCreateRequest,
    files?: File[]
  ): Promise<PostResponse> => {
    // 먼저 게시글을 생성
    const post = await bulletinApi.createPost(teamId, accountId, data);

    // 파일이 있으면 각각 업로드
    if (files && files.length > 0) {
      for (const file of files) {
        await bulletinApi.uploadAttachment(post.id, file, accountId);
      }
      // 파일 업로드 후 게시글 정보 다시 조회
      return bulletinApi.getPost(post.id);
    }

    return post;
  },

  // 게시글 수정
  updatePost: async (
    postId: number,
    accountId: string,
    data: PostUpdateRequest
  ): Promise<PostResponse> => {
    return apiRequest<PostResponse>(`/posts/${postId}?accountId=${accountId}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  },

  // 파일과 함께 게시글 수정 (먼저 게시글 수정 후 파일 업로드)
  updatePostWithFiles: async (
    postId: number,
    accountId: string,
    data: PostUpdateRequest,
    files?: File[]
  ): Promise<PostResponse> => {
    // 먼저 게시글을 수정
    const post = await bulletinApi.updatePost(postId, accountId, data);

    // 파일이 있으면 각각 업로드
    if (files && files.length > 0) {
      for (const file of files) {
        await bulletinApi.uploadAttachment(postId, file, accountId);
      }
      // 파일 업로드 후 게시글 정보 다시 조회
      return bulletinApi.getPost(postId);
    }

    return post;
  },

  // 게시글 삭제
  deletePost: async (postId: number, accountId: string): Promise<void> => {
    return apiRequest<void>(`/posts/${postId}?accountId=${accountId}`, {
      method: "DELETE",
    });
  },

  // 댓글 목록 조회
  getComments: async (
    postId: number,
    page: number,
    size: number
  ): Promise<CommentPageResponse> => {
    return apiRequest<CommentPageResponse>(
      `/posts/${postId}/comments?page=${page}&size=${size}`
    );
  },

  // 댓글 생성
  createComment: async (
    postId: number,
    accountId: string,
    data: CommentCreateRequest
  ): Promise<CommentResponse> => {
    return apiRequest<CommentResponse>(
      `/posts/${postId}/comments?accountId=${accountId}`,
      {
        method: "POST",
        body: JSON.stringify(data),
      }
    );
  },

  // 댓글 수정
  updateComment: async (
    commentId: number,
    accountId: string,
    data: CommentUpdateRequest
  ): Promise<CommentResponse> => {
    return apiRequest<CommentResponse>(
      `/comments/${commentId}?accountId=${accountId}`,
      {
        method: "PATCH",
        body: JSON.stringify(data),
      }
    );
  },

  // 댓글 삭제
  deleteComment: async (
    commentId: number,
    accountId: string
  ): Promise<void> => {
    return apiRequest<void>(`/comments/${commentId}?accountId=${accountId}`, {
      method: "DELETE",
    });
  },

  // 첨부파일 목록 조회
  getAttachments: async (postId: number): Promise<any[]> => {
    return apiRequest<any[]>(`/posts/${postId}/attachments`);
  },

  // 첨부파일 업로드
  uploadAttachment: async (
    postId: number,
    file: File,
    accountId: string
  ): Promise<any> => {
    const formData = new FormData();
    formData.append("file", file);

    return apiRequest<any>(
      `/posts/${postId}/attachments?accountId=${accountId}`,
      {
        method: "POST",
        body: formData,
      }
    );
  },

  // 첨부파일 삭제
  deleteAttachment: async (
    postId: number,
    attachmentId: number, // string에서 number로 변경
    accountId: string
  ): Promise<void> => {
    return apiRequest<void>(
      `/posts/${postId}/attachments/${attachmentId}?accountId=${accountId}`,
      {
        method: "DELETE",
      }
    );
  },

  // 첨부파일 다운로드 (인증 헤더 포함)
  downloadAttachment: async (fileId: number): Promise<void> => {
    try {
      const token = tokenManager.getAccessToken();
      const userId = tokenManager.getUserId();

      const response = await fetch(`/api/files/${fileId}/download`, {
        method: "GET",
        headers: {
          ...(token && { Authorization: `Bearer ${token}` }),
          ...(userId && { "Account-Id": userId }),
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // Content-Disposition 헤더에서 파일명 추출
      const contentDisposition = response.headers.get("Content-Disposition");
      let fileName = "download";
      if (contentDisposition) {
        const fileNameMatch = contentDisposition.match(
          /filename\*?=['"]?([^'";]+)['"]?/
        );
        if (fileNameMatch) {
          fileName = decodeURIComponent(fileNameMatch[1]);
        }
      }

      // Blob으로 변환하여 다운로드
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error("파일 다운로드 실패:", error);
      alert("파일 다운로드에 실패했습니다.");
    }
  },

  // 이미지 파일을 위한 Blob URL 생성 (인증 헤더 포함)
  getImageBlobUrl: async (fileId: number): Promise<string> => {
    try {
      const token = tokenManager.getAccessToken();
      const userId = tokenManager.getUserId();

      const response = await fetch(`/api/files/${fileId}/download`, {
        method: "GET",
        headers: {
          ...(token && { Authorization: `Bearer ${token}` }),
          ...(userId && { "Account-Id": userId }),
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const blob = await response.blob();
      return window.URL.createObjectURL(blob);
    } catch (error) {
      console.error("이미지 로드 실패:", error);
      throw error;
    }
  },

  // 파일 확장자로 이미지 파일 여부 판별
  isImageFile: (fileName: string): boolean => {
    const imageExtensions = ["jpg", "jpeg", "png", "gif", "webp", "bmp", "svg"];
    const extension = fileName.split(".").pop()?.toLowerCase();
    return extension ? imageExtensions.includes(extension) : false;
  },
};
