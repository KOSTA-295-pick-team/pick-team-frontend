import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import {
  BulletinPost,
  BulletinComment,
  BulletinAttachment,
  PostResponse,
  CommentResponse,
} from "@/types";
import * as thunks from "@/features/teamspace/bulletin/store/bulletinThunks";
import * as postThunks from "@/features/teamspace/bulletin/store/postThunks";

// PostResponse -> BulletinPost 변환 함수
const mapPostResponseToBulletinPost = (post: PostResponse): BulletinPost => ({
  id: post.id,
  boardId: String(post.boardId),
  title: post.title,
  content: post.content,
  authorId: post.authorId,
  authorName: post.authorName,
  createdAt: post.createdAt,
  updatedAt: post.updatedAt,
  attachments: post.attachments.map((att) => ({
    id: att.id, // String 변환 제거 - number 타입 유지
    postId: post.id,
    fileName: att.originalFileName,
    fileUrl: att.downloadUrl,
  })),
  comments: [], // 상세 조회 시에만 가져옴
});

// CommentResponse -> BulletinComment 변환 함수
const mapCommentResponseToBulletinComment = (
  comment: CommentResponse
): BulletinComment => ({
  id: comment.id,
  postId: comment.postId,
  authorId: comment.authorId,
  authorName: comment.authorName,
  content: comment.content,
  createdAt: comment.createdAt,
});

interface BulletinState {
  posts: BulletinPost[];
  currentPost: BulletinPost | null;
  comments: BulletinComment[];
  loading: boolean;
  error: string | null;
  // 페이징 관련 상태
  currentPage: number;
  totalPages: number;
  totalElements: number;
  pageSize: number;
  hasNext: boolean;
  hasPrevious: boolean;
  // 댓글 페이징
  commentCurrentPage: number;
  commentTotalPages: number;
  commentTotalElements: number;
  commentPageSize: number;
  // 세션 추적을 위한 타임스탬프
  lastFetchPostsTime: number;
  lastResetTime: number;
  // 삭제된 첨부파일 ID 추적 (세션 간 유지)
  deletedAttachmentIds: number[];
}

const initialState: BulletinState = {
  posts: [],
  currentPost: null,
  comments: [],
  loading: false,
  error: null,
  currentPage: 0,
  totalPages: 0,
  totalElements: 0,
  pageSize: 5,
  hasNext: false,
  hasPrevious: false,
  commentCurrentPage: 0,
  commentTotalPages: 0,
  commentTotalElements: 0,
  commentPageSize: 5,
  lastFetchPostsTime: 0,
  lastResetTime: 0,
  deletedAttachmentIds: [],
};

// 첨부파일 필터링 헬퍼 함수 - 삭제된 첨부파일을 제외한 첨부파일만 반환
const filterAttachments = (
  attachments: BulletinAttachment[],
  deletedIds: number[]
): BulletinAttachment[] => {
  return attachments.filter(
    (attachment) => !deletedIds.includes(attachment.id)
  );
};

// 게시글에서 삭제된 첨부파일을 제거하는 헬퍼 함수
const removeDeletedAttachmentsFromPost = (
  post: BulletinPost,
  deletedIds: number[]
): BulletinPost => {
  return {
    ...post,
    attachments: filterAttachments(post.attachments || [], deletedIds),
  };
};

const bulletinSlice = createSlice({
  name: "bulletin",
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setCurrentPage: (state, action: PayloadAction<number>) => {
      state.currentPage = action.payload;
    },
    setCommentCurrentPage: (state, action: PayloadAction<number>) => {
      state.commentCurrentPage = action.payload;
    },
    clearCurrentPost: (state) => {
      state.currentPost = null;
      state.comments = [];
    },
    setCurrentPost: (state, action: PayloadAction<BulletinPost>) => {
      state.currentPost = action.payload;
    },
    // 팀 변경 시 전체 상태 초기화 (삭제된 첨부파일 ID는 유지)
    resetBulletinState: (state) => {
      console.log(
        "[Redux] resetBulletinState 호출 - 모든 상태 초기화 (deletedAttachmentIds 유지)"
      );

      const resetTime = Date.now();

      // 모든 상태를 초기값으로 리셋 (deletedAttachmentIds는 유지)
      state.posts = [];
      state.currentPost = null;
      state.comments = [];
      state.currentPage = 0;
      state.totalPages = 0;
      state.totalElements = 0;
      state.hasNext = false;
      state.hasPrevious = false;
      state.commentCurrentPage = 0;
      state.commentTotalPages = 0;
      state.commentTotalElements = 0;
      state.loading = false;
      state.error = null;
      state.lastFetchPostsTime = 0;
      state.lastResetTime = resetTime;
      // deletedAttachmentIds는 의도적으로 초기화하지 않음 (세션 간 유지)

      console.log("[Redux] resetBulletinState 완료 - 새로운 상태:", {
        posts: state.posts.length,
        currentPost: state.currentPost,
        comments: state.comments.length,
        deletedAttachmentIds: state.deletedAttachmentIds.length,
        resetTime,
      });
    },

    // 새 첨부파일을 Redux 상태에 추가하는 액션
    addAttachments: (
      state,
      action: PayloadAction<{
        postId: string;
        attachments: BulletinAttachment[];
      }>
    ) => {
      const { postId, attachments } = action.payload;

      console.log("[Redux] addAttachments 호출:", {
        postId,
        attachmentsCount: attachments.length,
        attachments: attachments.map((a) => ({
          id: a.id,
          fileName: a.fileName,
        })),
      });

      // posts 배열의 해당 게시글에 첨부파일 추가
      const postIndex = state.posts.findIndex((p) => p.id === Number(postId));
      if (postIndex !== -1) {
        const currentAttachments = state.posts[postIndex].attachments || [];
        state.posts[postIndex] = {
          ...state.posts[postIndex],
          attachments: [...currentAttachments, ...attachments],
        };
      }

      // currentPost에도 첨부파일 추가
      if (state.currentPost && state.currentPost.id === Number(postId)) {
        const currentAttachments = state.currentPost.attachments || [];
        state.currentPost = {
          ...state.currentPost,
          attachments: [...currentAttachments, ...attachments],
        };
      }

      console.log("[Redux] addAttachments 완료 - 업데이트된 상태:", {
        postsCount: state.posts.length,
        currentPostAttachmentsCount:
          state.currentPost?.attachments?.length || 0,
      });
    },

    // 삭제된 첨부파일 ID를 추가하는 액션 (세션 간 유지)
    addDeletedAttachmentId: (state, action: PayloadAction<number>) => {
      const attachId = action.payload;
      if (!state.deletedAttachmentIds.includes(attachId)) {
        state.deletedAttachmentIds.push(attachId);
        console.log("[Redux] addDeletedAttachmentId:", {
          attachId,
          totalDeletedIds: state.deletedAttachmentIds.length,
        });
      }
    },
  },
  extraReducers: (builder) => {
    builder
      // 게시글 목록 조회
      .addCase(thunks.fetchPosts.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(thunks.fetchPosts.fulfilled, (state, action) => {
        state.loading = false;

        const mappedPosts = action.payload.content.map(
          mapPostResponseToBulletinPost
        );

        // 게시글 목록에서 삭제된 첨부파일을 필터링
        const filteredPosts = mappedPosts.map((post: BulletinPost) =>
          removeDeletedAttachmentsFromPost(post, state.deletedAttachmentIds)
        );

        state.posts = filteredPosts;
        state.currentPage = action.payload.pageable.pageNumber;
        state.totalPages = action.payload.totalPages;
        state.totalElements = action.payload.totalElements;
        state.hasNext = !action.payload.last;
        state.hasPrevious = !action.payload.first;
        state.lastFetchPostsTime = Date.now();

        console.log("[Redux] fetchPosts.fulfilled - 상태 업데이트:", {
          postsCount: state.posts.length,
          currentPage: state.currentPage,
          totalPages: state.totalPages,
          filteredPostsCount: filteredPosts.length,
          lastFetchPostsTime: state.lastFetchPostsTime,
        });
      })
      .addCase(thunks.fetchPosts.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      // 게시글 생성
      .addCase(thunks.createPost.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(thunks.createPost.fulfilled, (state, action) => {
        state.loading = false;
        const newPost = mapPostResponseToBulletinPost(action.payload);
        state.posts.unshift(newPost);
      })
      .addCase(thunks.createPost.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      // 게시글 수정
      .addCase(thunks.updatePost.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(thunks.updatePost.fulfilled, (state, action) => {
        state.loading = false;
        const updatedPost = mapPostResponseToBulletinPost(action.payload);

        // posts 배열에서 업데이트
        const postIndex = state.posts.findIndex((p) => p.id === updatedPost.id);
        if (postIndex !== -1) {
          state.posts[postIndex] = updatedPost;
        }

        // currentPost 업데이트
        if (state.currentPost && state.currentPost.id === updatedPost.id) {
          state.currentPost = updatedPost;
        }
      })
      .addCase(thunks.updatePost.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      // 게시글 삭제
      .addCase(thunks.deletePost.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(thunks.deletePost.fulfilled, (state, action) => {
        state.loading = false;
        const deletedPostId = action.payload;
        state.posts = state.posts.filter((post) => post.id !== deletedPostId);
        if (state.currentPost && state.currentPost.id === deletedPostId) {
          state.currentPost = null;
          state.comments = [];
        }
      })
      .addCase(thunks.deletePost.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      // 댓글 목록 조회
      .addCase(thunks.fetchComments.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(thunks.fetchComments.fulfilled, (state, action) => {
        state.loading = false;
        state.comments = action.payload.content.map(
          mapCommentResponseToBulletinComment
        );
        state.commentCurrentPage = action.payload.pageable.pageNumber;
        state.commentTotalPages = action.payload.totalPages;
        state.commentTotalElements = action.payload.totalElements;
      })
      .addCase(thunks.fetchComments.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      // 댓글 생성
      .addCase(thunks.createComment.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(thunks.createComment.fulfilled, (state, action) => {
        state.loading = false;
        const newComment = mapCommentResponseToBulletinComment(action.payload);
        state.comments.push(newComment);
      })
      .addCase(thunks.createComment.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      // 댓글 수정
      .addCase(thunks.updateComment.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(thunks.updateComment.fulfilled, (state, action) => {
        state.loading = false;
        const updatedComment = mapCommentResponseToBulletinComment(
          action.payload
        );
        const commentIndex = state.comments.findIndex(
          (c) => c.id === updatedComment.id
        );
        if (commentIndex !== -1) {
          state.comments[commentIndex] = updatedComment;
        }
      })
      .addCase(thunks.updateComment.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      // 댓글 삭제
      .addCase(thunks.deleteComment.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(thunks.deleteComment.fulfilled, (state, action) => {
        state.loading = false;
        const deletedCommentId = action.payload;
        state.comments = state.comments.filter(
          (c) => c.id !== deletedCommentId
        );
      })
      .addCase(thunks.deleteComment.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      // === PostThunks 관련 (파일 업로드 포함) ===

      // 파일 업로드 포함 게시글 생성
      .addCase(postThunks.createPostWithFiles.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(postThunks.createPostWithFiles.fulfilled, (state, action) => {
        state.loading = false;
        const newPost = mapPostResponseToBulletinPost(action.payload);
        state.posts.unshift(newPost);
      })
      .addCase(postThunks.createPostWithFiles.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      // 파일 업로드 포함 게시글 수정
      .addCase(postThunks.updatePostWithFiles.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(postThunks.updatePostWithFiles.fulfilled, (state, action) => {
        state.loading = false;
        const updatedPost = mapPostResponseToBulletinPost(action.payload);

        // posts 배열 업데이트
        const postIndex = state.posts.findIndex((p) => p.id === updatedPost.id);
        if (postIndex !== -1) {
          state.posts[postIndex] = updatedPost;
        }

        // currentPost 업데이트
        if (state.currentPost && state.currentPost.id === updatedPost.id) {
          state.currentPost = updatedPost;
        }
      })
      .addCase(postThunks.updatePostWithFiles.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const {
  clearError,
  setCurrentPage,
  setCommentCurrentPage,
  clearCurrentPost,
  setCurrentPost,
  resetBulletinState,
  addAttachments,
  addDeletedAttachmentId,
} = bulletinSlice.actions;

export default bulletinSlice.reducer;
