import { tokenManager } from "./api";
import {
  BulletinPost,
  BulletinComment,
  PostResponse,
  PostPageResponse,
  PostCreateRequest,
  PostUpdateRequest,
  CommentResponse,
  CommentPageResponse,
  CommentCreateRequest,
  CommentUpdateRequest,
  PostAttachResponseDto,
} from "../types";

const API_BASE_URL = "http://localhost:8081/api";

// 백엔드 응답을 프론트엔드 타입으로 변환하는 함수
const mapPostResponse = (response: PostResponse): BulletinPost => {
  const mappedPost = {
    id: response.id?.toString() || "0",
    teamProjectId: "", // 팀 ID는 별도로 설정
    title: response.title || "",
    content: response.content || "",
    authorId: response.authorId?.toString() || "0",
    authorName: response.authorName || "Unknown",
    createdAt: new Date(response.createdAt || Date.now()),
    updatedAt: response.updatedAt ? new Date(response.updatedAt) : undefined,
    viewCount: 0, // 백엔드에서 제공하지 않음
    attachments:
      response.attachments?.map((att) => {
        return {
          id: att.id?.toString() || "0",
          postId: response.id?.toString() || "0",
          fileName: att.originalFileName || "",
          fileUrl: att.downloadUrl || "",
        };
      }) || [],
    comments: [], // 댓글은 별도 API로 조회
  };

  return mappedPost;
};

const mapCommentResponse = (response: CommentResponse): BulletinComment => ({
  id: response.id?.toString() || "0",
  postId: response.postId?.toString() || "0",
  userId: response.authorId?.toString() || "0",
  userName: response.authorName || "Unknown",
  text: response.content || "",
  createdAt: new Date(response.createdAt || Date.now()),
});

export const bulletinApi = {
  // 게시글 목록 조회
  getPosts: async (
    teamId: string,
    boardId: string,
    page: number = 0,
    size: number = 5
  ): Promise<{
    posts: BulletinPost[];
    totalPages: number;
    totalElements: number;
  }> => {
    try {
      const token = tokenManager.getAccessToken();
      if (!token) {
        throw new Error("인증 토큰이 필요합니다.");
      }

      const params = new URLSearchParams({
        boardId: boardId,
        page: page.toString(),
        size: size.toString(),
        _t: Date.now().toString(), // 캐시 방지
      });

      const response = await fetch(
        `${API_BASE_URL}/teams/${teamId}/posts?${params}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
            "Cache-Control": "no-cache",
            Pragma: "no-cache",
          },
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: PostPageResponse = await response.json();

      return {
        posts: data.content.map(mapPostResponse),
        totalPages: data.totalPages,
        totalElements: data.totalElements,
      };
    } catch (error) {
      console.error("게시글 목록 조회 실패:", error);
      throw error;
    }
  },

  // 게시글 상세 조회
  getPost: async (postId: string): Promise<BulletinPost> => {
    try {
      const token = tokenManager.getAccessToken();
      if (!token) {
        throw new Error("인증 토큰이 필요합니다.");
      }

      // 캐시 방지를 위한 타임스탬프 추가
      const cacheBuster = Date.now();
      const url = `${API_BASE_URL}/posts/${postId}?_t=${cacheBuster}`;

      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "Cache-Control": "no-cache",
          Pragma: "no-cache",
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: PostResponse = await response.json();
      return mapPostResponse(data);
    } catch (error) {
      console.error("게시글 조회 실패:", error);
      throw error;
    }
  },

  // 게시글 생성
  createPost: async (
    teamId: string,
    accountId: string,
    post: { title: string; content: string; boardId: string }
  ): Promise<BulletinPost> => {
    try {
      const token = tokenManager.getAccessToken();
      if (!token) {
        throw new Error("인증 토큰이 필요합니다.");
      }

      const requestData: PostCreateRequest = {
        title: post.title,
        content: post.content,
        boardId: parseInt(post.boardId),
      };

      const response = await fetch(
        `${API_BASE_URL}/teams/${teamId}/posts?accountId=${accountId}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(requestData),
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: PostResponse = await response.json();
      return mapPostResponse(data);
    } catch (error) {
      console.error("게시글 생성 실패:", error);
      throw error;
    }
  },

  // 게시글 수정
  updatePost: async (
    postId: string,
    accountId: string,
    post: { title: string; content: string }
  ): Promise<BulletinPost> => {
    try {
      const token = tokenManager.getAccessToken();
      if (!token) {
        throw new Error("인증 토큰이 필요합니다.");
      }

      const requestData: PostUpdateRequest = {
        title: post.title,
        content: post.content,
      };

      const response = await fetch(
        `${API_BASE_URL}/posts/${postId}?accountId=${accountId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(requestData),
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: PostResponse = await response.json();
      return mapPostResponse(data);
    } catch (error) {
      console.error("게시글 수정 실패:", error);
      throw error;
    }
  },

  // 게시글 삭제
  deletePost: async (postId: string, accountId: string): Promise<void> => {
    try {
      const token = tokenManager.getAccessToken();
      if (!token) {
        throw new Error("인증 토큰이 필요합니다.");
      }

      const response = await fetch(
        `${API_BASE_URL}/posts/${postId}?accountId=${accountId}`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
    } catch (error) {
      console.error("게시글 삭제 실패:", error);
      throw error;
    }
  },

  // 댓글 목록 조회
  getComments: async (
    postId: string,
    page: number = 0,
    size: number = 5
  ): Promise<{
    comments: BulletinComment[];
    totalPages: number;
    totalElements: number;
  }> => {
    try {
      const token = tokenManager.getAccessToken();
      if (!token) {
        throw new Error("인증 토큰이 필요합니다.");
      }

      const params = new URLSearchParams({
        page: page.toString(),
        size: size.toString(),
      });

      const response = await fetch(
        `${API_BASE_URL}/posts/${postId}/comments?${params}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: CommentPageResponse = await response.json();

      return {
        comments: data.content.map(mapCommentResponse),
        totalPages: data.totalPages,
        totalElements: data.totalElements,
      };
    } catch (error) {
      console.error("댓글 목록 조회 실패:", error);
      throw error;
    }
  },

  // 댓글 생성
  createComment: async (
    postId: string,
    accountId: string,
    content: string
  ): Promise<BulletinComment> => {
    try {
      const token = tokenManager.getAccessToken();
      if (!token) {
        throw new Error("인증 토큰이 필요합니다.");
      }

      const requestData: CommentCreateRequest = {
        content: content,
      };

      const response = await fetch(
        `${API_BASE_URL}/posts/${postId}/comments?accountId=${accountId}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(requestData),
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: CommentResponse = await response.json();
      return mapCommentResponse(data);
    } catch (error) {
      console.error("댓글 생성 실패:", error);
      throw error;
    }
  },

  // 댓글 수정
  updateComment: async (
    commentId: string,
    accountId: string,
    content: string
  ): Promise<BulletinComment> => {
    try {
      const token = tokenManager.getAccessToken();
      if (!token) {
        throw new Error("인증 토큰이 필요합니다.");
      }

      const requestData: CommentUpdateRequest = {
        content: content,
      };

      const response = await fetch(
        `${API_BASE_URL}/comments/${commentId}?accountId=${accountId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(requestData),
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: CommentResponse = await response.json();
      return mapCommentResponse(data);
    } catch (error) {
      console.error("댓글 수정 실패:", error);
      throw error;
    }
  },

  // 댓글 삭제
  deleteComment: async (
    commentId: string,
    accountId: string
  ): Promise<void> => {
    try {
      const token = tokenManager.getAccessToken();
      if (!token) {
        throw new Error("인증 토큰이 필요합니다.");
      }

      const response = await fetch(
        `${API_BASE_URL}/comments/${commentId}?accountId=${accountId}`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
    } catch (error) {
      console.error("댓글 삭제 실패:", error);
      throw error;
    }
  },

  // 첨부파일 목록 조회
  getAttachments: async (postId: string): Promise<PostAttachResponseDto[]> => {
    try {
      const token = tokenManager.getAccessToken();
      if (!token) {
        throw new Error("인증 토큰이 필요합니다.");
      }

      const response = await fetch(
        `${API_BASE_URL}/posts/${postId}/attachments`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: PostAttachResponseDto[] = await response.json();
      return data;
    } catch (error) {
      console.error("첨부파일 목록 조회 실패:", error);
      throw error;
    }
  },

  // 첨부파일 업로드
  uploadAttachment: async (
    postId: string,
    accountId: string,
    file: File
  ): Promise<PostAttachResponseDto> => {
    try {
      const token = tokenManager.getAccessToken();
      if (!token) {
        throw new Error("인증 토큰이 필요합니다.");
      }

      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(
        `${API_BASE_URL}/posts/${postId}/attachments?accountId=${accountId}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: PostAttachResponseDto = await response.json();
      return data;
    } catch (error) {
      console.error("첨부파일 업로드 실패:", error);
      throw error;
    }
  },

  // 첨부파일 다운로드
  downloadAttachment: async (
    fileUrl: string,
    fileName: string
  ): Promise<void> => {
    try {
      const token = tokenManager.getAccessToken();
      if (!token) {
        throw new Error("인증 토큰이 필요합니다.");
      }

      const response = await fetch(fileUrl, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Content-Type 헤더에서 MIME 타입 확인
      const contentType =
        response.headers.get("content-type") || "application/octet-stream";

      // Blob으로 파일 데이터 받기 (MIME 타입 지정)
      const blob = await response.blob();

      // 올바른 MIME 타입으로 새 Blob 생성
      const typedBlob = new Blob([blob], { type: contentType });

      // 다운로드 링크 생성
      const url = window.URL.createObjectURL(typedBlob);
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;

      // 브라우저 호환성을 위해 target 속성 추가
      link.target = "_blank";

      // 자동 다운로드 실행
      document.body.appendChild(link);
      link.click();

      // 정리
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("첨부파일 다운로드 실패:", error);
      throw error;
    }
  },

  // 첨부파일 삭제
  deleteAttachment: async (
    postId: string,
    attachId: string,
    accountId: string
  ): Promise<{ success: boolean; status: number; message?: string }> => {
    try {
      const token = tokenManager.getAccessToken();
      if (!token) {
        throw new Error("인증 토큰이 필요합니다.");
      }

      const url = `${API_BASE_URL}/posts/${postId}/attachments/${attachId}?accountId=${accountId}`;

      console.log(`[deleteAttachment API] 요청 시작:`, {
        url,
        postId,
        attachId,
        accountId,
      });

      const response = await fetch(url, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      console.log(`[deleteAttachment API] 응답 수신:`, {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
      });

      if (!response.ok) {
        // 에러 응답 본문을 읽어서 더 자세한 정보 제공
        let errorMessage = `HTTP error! status: ${response.status}`;
        let errorData = "";

        try {
          errorData = await response.text();
          console.log(`[deleteAttachment API] 에러 응답 본문:`, errorData);

          if (errorData) {
            errorMessage += ` - ${errorData}`;
            // JSON 파싱 시도하여 상세 에러 메시지 추출
            try {
              const errorJson = JSON.parse(errorData);
              if (errorJson.detail) {
                errorMessage = errorJson.detail;
              }
            } catch (jsonError) {
              // JSON 파싱 실패 시 원본 텍스트 사용
            }
          }
        } catch (parseError) {
          console.error(
            `[deleteAttachment API] 에러 응답 파싱 실패:`,
            parseError
          );
        }

        // 상세한 에러 정보를 포함한 객체를 throw
        const error = new Error(errorMessage) as any;
        error.status = response.status;
        error.responseText = errorData;
        throw error;
      }

      console.log(`[deleteAttachment API] 삭제 성공:`, { postId, attachId });
      return { success: true, status: response.status };
    } catch (error: any) {
      console.error("[deleteAttachment API] 삭제 실패:", {
        postId,
        attachId,
        error: error.message,
        status: error.status,
        responseText: error.responseText,
      });
      throw error;
    }
  },
};
