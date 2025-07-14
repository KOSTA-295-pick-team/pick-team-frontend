import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import {
  BulletinPost,
  BulletinComment,
  BulletinAttachment,
  PostResponse,
  CommentResponse,
} from "@/types";
import * as thunks from "@/features/teamspace/bulletin/store/bulletinThunks";

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
    id: String(att.id),
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
  deletedAttachmentIds: string[];
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
  deletedIds: string[]
): BulletinAttachment[] => {
  return attachments.filter(
    (attachment) => !deletedIds.includes(attachment.id)
  );
};

// 게시글에서 삭제된 첨부파일을 제거하는 헬퍼 함수
const removeDeletedAttachmentsFromPost = (
  post: BulletinPost,
  deletedIds: string[]
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
    addDeletedAttachmentId: (state, action: PayloadAction<string>) => {
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
        state.totalPages = action.payload.totalPages;
        state.totalElements = action.payload.totalElements;
        const currentPage = action.meta.arg.page || 0;
        state.currentPage = currentPage;
        state.hasNext = currentPage < action.payload.totalPages - 1;
        state.hasPrevious = currentPage > 0;
        state.lastFetchPostsTime = Date.now(); // posts를 가져온 시간 기록

        console.log(
          "[fetchPosts.fulfilled] posts 로드 완료 (첨부파일 필터링 후):",
          {
            postsCount: state.posts.length,
            deletedAttachmentIds: state.deletedAttachmentIds,
            fetchTime: state.lastFetchPostsTime,
            resetTime: state.lastResetTime,
          }
        );
      })
      .addCase(thunks.fetchPosts.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      // 게시글 상세 조회
      .addCase(thunks.fetchPost.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(thunks.fetchPost.fulfilled, (state, action) => {
        state.loading = false;

        const fetchTime = Date.now();

        const serverPostAsBulletinPost = mapPostResponseToBulletinPost(
          action.payload
        );

        // 서버 데이터에서 삭제된 첨부파일을 필터링
        const serverPost = {
          ...serverPostAsBulletinPost,
          attachments: filterAttachments(
            serverPostAsBulletinPost.attachments || [],
            state.deletedAttachmentIds
          ),
        };

        console.log(
          "[fetchPost.fulfilled] 서버에서 게시글 데이터 수신 (필터링 후):",
          {
            postId: serverPost.id,
            originalAttachments: action.payload.attachments?.length || 0,
            filteredAttachments: serverPost.attachments.length,
            deletedIds: state.deletedAttachmentIds,
            serverAttachmentIds: serverPost.attachments.map((a: BulletinAttachment) => a.id),
            currentPostExists: !!state.currentPost,
            currentPostAttachments: state.currentPost?.attachments?.length || 0,
            currentPostAttachmentIds:
              state.currentPost?.attachments?.map((a: BulletinAttachment) => a.id) || [],
            postsArrayLength: state.posts.length,
            fetchTime,
            lastFetchPostsTime: state.lastFetchPostsTime,
            lastResetTime: state.lastResetTime,
          }
        );

        // 현재 Redux에 해당 게시글이 있는지 확인
        const existingCurrentPost =
          state.currentPost?.id === serverPost.id ? state.currentPost : null;
        const existingPostInArray = state.posts.find(
          (p) => p.id === serverPost.id
        );

        // 세션 기반 상태 보존 조건 검사:
        // 1. posts 배열의 데이터가 최근 reset 이후에 fetch된 것인지 확인
        // 2. currentPost 또는 postsArray에 첨부파일이 있는지 확인
        // 3. 클라이언트와 서버의 첨부파일이 다른지 확인
        const isPostsFromCurrentSession =
          state.lastFetchPostsTime > state.lastResetTime;
        const currentPostHasAttachments =
          (existingCurrentPost?.attachments?.length || 0) > 0;
        const postsArrayHasAttachments =
          (existingPostInArray?.attachments?.length || 0) > 0;
        const serverAttachments = serverPost.attachments || [];

        // 클라이언트와 서버의 첨부파일이 다른지 확인
        let attachmentsDiffer = false;
        if (currentPostHasAttachments) {
          const clientIds = new Set(existingCurrentPost!.attachments!.map((a) => a.id));
          const serverIds = new Set(serverAttachments.map((a) => a.id));
          attachmentsDiffer = clientIds.size !== serverIds.size || [...clientIds].some(id => !serverIds.has(id));
        } else if (postsArrayHasAttachments && isPostsFromCurrentSession) {
          const clientIds = new Set(existingPostInArray!.attachments!.map((a) => a.id));
          const serverIds = new Set(serverAttachments.map((a) => a.id));
          attachmentsDiffer = clientIds.size !== serverIds.size || [...clientIds].some(id => !serverIds.has(id));
        }

        const shouldPreserveClientState =
          isPostsFromCurrentSession &&
          (currentPostHasAttachments || postsArrayHasAttachments) &&
          attachmentsDiffer;

        console.log("[fetchPost.fulfilled] 상태 보존 조건 검사:", {
          isPostsFromCurrentSession,
          currentPostHasAttachments,
          postsArrayHasAttachments,
          attachmentsDiffer,
          shouldPreserveClientState,
          clientCurrentPostIds:
            existingCurrentPost?.attachments?.map((a: BulletinAttachment) => a.id) || [],
          clientPostsArrayIds:
            existingPostInArray?.attachments?.map((a: BulletinAttachment) => a.id) || [],
          serverIds: serverAttachments.map((a: BulletinAttachment) => a.id),
          timeDiffs: {
            fetchPostsTime: state.lastFetchPostsTime,
            resetTime: state.lastResetTime,
            isFromCurrentSession:
              state.lastFetchPostsTime > state.lastResetTime,
          },
        });

        if (shouldPreserveClientState) {
          // 현재 세션에서 수정된 클라이언트 상태가 있는 경우에만 보존
          const attachmentsToUse =
            existingCurrentPost?.attachments ||
            existingPostInArray?.attachments ||
            [];

          console.log(
            "[fetchPost.fulfilled] 클라이언트 상태 보존 (현재 세션에서 수정됨):",
            {
              source: existingCurrentPost ? "currentPost" : "postsArray",
              preservedAttachments: attachmentsToUse.length,
              preservedIds: attachmentsToUse.map((a) => a.id),
              reason: "current_session_modifications",
            }
          );

          state.currentPost = {
            ...serverPost,
            attachments: attachmentsToUse, // 기존 Redux 상태의 첨부파일 보존
          };
        } else {
          // 새로운 세션이거나 첨부파일이 동일한 경우 서버 데이터 사용 (이미 필터링됨)
          console.log("[fetchPost.fulfilled] 서버 데이터 사용 (필터링됨):", {
            reason: !isPostsFromCurrentSession
              ? "new_session"
              : !currentPostHasAttachments && !postsArrayHasAttachments
              ? "no_client_attachments"
              : "attachments_same",
            serverAttachments: serverPost.attachments.length,
          });
          state.currentPost = serverPost;
        }

        // posts 배열에서도 해당 게시글을 업데이트 (동일한 로직 적용)
        const postIndex = state.posts.findIndex(
          (post) => post.id === serverPost.id
        );
        if (postIndex !== -1) {
          const existingAttachments = state.posts[postIndex].attachments;

          if (
            shouldPreserveClientState &&
            existingAttachments &&
            existingAttachments.length > 0
          ) {
            console.log(
              "[fetchPost.fulfilled] posts 배열에서도 첨부파일 보존:",
              {
                preservedCount: existingAttachments.length,
              }
            );
            state.posts[postIndex] = {
              ...serverPost,
              attachments: existingAttachments,
            };
          } else {
            console.log(
              "[fetchPost.fulfilled] posts 배열 - 서버 데이터 사용 (필터링됨)"
            );
            state.posts[postIndex] = serverPost;
          }
        } else {
          // 새로운 게시글인 경우 posts 배열에 추가하지 않음 (목록에서 가져올 때만 추가)
          console.log(
            "[fetchPost.fulfilled] posts 배열에 해당 게시글 없음 - 추가하지 않음"
          );
        }
      })
      .addCase(thunks.fetchPost.rejected, (state, action) => {
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
        state.posts.unshift(mapPostResponseToBulletinPost(action.payload));
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
        console.log(
          "[updatePost.fulfilled] 게시글 업데이트, payload:",
          action.payload
        );

        const updatedData = mapPostResponseToBulletinPost(action.payload);

        // posts 배열에서 해당 게시글 찾아서 제목과 내용만 업데이트 (첨부파일은 유지)
        const postIndex = state.posts.findIndex(
          (post) => post.id === updatedData.id
        );
        if (postIndex !== -1) {
          console.log(
            "[updatePost.fulfilled] posts 배열 업데이트, 기존 첨부파일 수:",
            state.posts[postIndex].attachments?.length || 0
          );
          state.posts[postIndex] = {
            ...state.posts[postIndex],
            title: updatedData.title,
            content: updatedData.content,
            updatedAt:
              updatedData.updatedAt || state.posts[postIndex].updatedAt,
            // attachments는 의도적으로 업데이트하지 않음 (기존 Redux 상태 유지)
          };
          console.log(
            "[updatePost.fulfilled] posts 배열 업데이트 완료, 유지된 첨부파일 수:",
            state.posts[postIndex].attachments?.length || 0
          );
        }

        // currentPost도 동일하게 제목과 내용만 업데이트
        if (state.currentPost?.id === updatedData.id) {
          console.log(
            "[updatePost.fulfilled] currentPost 업데이트, 기존 첨부파일 수:",
            state.currentPost.attachments?.length || 0
          );
          state.currentPost = {
            ...state.currentPost,
            title: updatedData.title,
            content: updatedData.content,
            updatedAt: updatedData.updatedAt || state.currentPost.updatedAt,
            // attachments는 의도적으로 업데이트하지 않음 (기존 Redux 상태 유지)
          };
          console.log(
            "[updatePost.fulfilled] currentPost 업데이트 완료, 유지된 첨부파일 수:",
            state.currentPost.attachments?.length || 0
          );
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
        state.posts = state.posts.filter((post) => post.id !== action.payload);
        if (state.currentPost?.id === action.payload) {
          state.currentPost = null;
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
        state.comments.push(mapCommentResponseToBulletinComment(action.payload));
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
        const updatedComment = mapCommentResponseToBulletinComment(action.payload);
        const index = state.comments.findIndex(
          (comment) => comment.id === updatedComment.id
        );
        if (index !== -1) {
          state.comments[index] = updatedComment;
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
        state.comments = state.comments.filter(
          (comment) => comment.id !== action.payload
        );
      })
      .addCase(thunks.deleteComment.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      // 첨부파일 삭제
      .addCase(thunks.deleteAttachment.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(thunks.deleteAttachment.fulfilled, (state, action) => {
        state.loading = false;
        const { postId, attachId } = action.payload;

        console.log("[bulletinSlice] deleteAttachment.fulfilled:", {
          postId,
          attachId,
        });

        // 삭제된 첨부파일 ID를 추가 (세션 간 유지)
        if (!state.deletedAttachmentIds.includes(attachId)) {
          state.deletedAttachmentIds.push(attachId);
        }

        // posts 배열에서 해당 게시글의 첨부파일 제거
        const postIndex = state.posts.findIndex((post) => post.id === postId);
        if (postIndex !== -1 && state.posts[postIndex].attachments) {
          const beforeCount = state.posts[postIndex].attachments!.length;
          state.posts[postIndex] = {
            ...state.posts[postIndex],
            attachments: state.posts[postIndex].attachments!.filter(
              (att) => att.id !== attachId
            ),
          };
          const afterCount = state.posts[postIndex].attachments?.length || 0;
          console.log("[bulletinSlice] posts 배열 업데이트:", {
            beforeCount,
            afterCount,
          });
        }

        // currentPost에서도 첨부파일 제거 (새 객체로 대체하여 변경 확실히 감지)
        if (state.currentPost && state.currentPost.id === postId) {
          const beforeCount = state.currentPost.attachments?.length || 0;
          const beforeIds =
            state.currentPost.attachments?.map((att) => att.id) || [];
          state.currentPost = {
            ...state.currentPost,
            attachments:
              state.currentPost.attachments?.filter(
                (att) => att.id !== attachId
              ) || [],
          };
          const afterCount = state.currentPost.attachments?.length || 0;
          const afterIds =
            state.currentPost.attachments?.map((att) => att.id) || [];
          console.log("[bulletinSlice] currentPost 업데이트:", {
            beforeCount,
            afterCount,
            beforeIds,
            afterIds,
            removedId: attachId,
            newCurrentPost: state.currentPost,
          });
        }
      })
      .addCase(thunks.deleteAttachment.rejected, (state, action) => {
        state.loading = false;

        // action.meta.arg에서 postId와 attachId 추출
        const { postId, attachId } = action.meta.arg as {
          postId: number;
          attachId: string;
          accountId: string;
        };

        // payload에서 상세 에러 정보 추출
        const errorInfo = action.payload as {
          message: string;
          status?: number;
          responseText?: string;
        };

        console.log("[bulletinSlice] deleteAttachment.rejected 상세 정보:", {
          postId,
          attachId,
          errorMessage: errorInfo.message,
          status: errorInfo.status,
          responseText: errorInfo.responseText,
        });

        // 에러 상태 설정
        state.error = errorInfo.message;

        // 404 (파일이 이미 삭제됨) 또는 400 (잘못된 요청이지만 파일이 존재하지 않음) 에러인 경우에만 UI에서 제거
        // 이는 서버에서 해당 첨부파일이 실제로 존재하지 않음을 의미하므로 UI에서도 제거하는 것이 맞음
        const shouldRemoveFromUI =
          errorInfo.status === 404 ||
          errorInfo.status === 400 ||
          errorInfo.message?.includes("첨부파일을 찾을 수 없습니다") ||
          errorInfo.message?.includes("존재하지 않") ||
          errorInfo.responseText?.includes("404") ||
          errorInfo.responseText?.includes("Not Found");

        console.log("[bulletinSlice] UI 제거 결정:", {
          shouldRemoveFromUI,
          status: errorInfo.status,
          isNotFoundError: errorInfo.status === 404,
          isBadRequestError: errorInfo.status === 400,
          messageContainsNotFound:
            errorInfo.message?.includes("첨부파일을 찾을 수 없습니다"),
        });

        if (shouldRemoveFromUI) {
          console.log(
            "[bulletinSlice] 서버에 파일이 존재하지 않음 - UI에서 제거"
          );

          // 삭제된 첨부파일 ID를 추가 (세션 간 유지)
          if (!state.deletedAttachmentIds.includes(attachId)) {
            state.deletedAttachmentIds.push(attachId);
          }

          // posts 배열에서 해당 게시글의 첨부파일 제거
          const postIndex = state.posts.findIndex((post) => post.id === postId);
          if (postIndex !== -1 && state.posts[postIndex].attachments) {
            const beforeCount = state.posts[postIndex].attachments!.length;
            state.posts[postIndex] = {
              ...state.posts[postIndex],
              attachments: state.posts[postIndex].attachments!.filter(
                (att) => att.id !== attachId
              ),
            };
            const afterCount = state.posts[postIndex].attachments?.length || 0;
            console.log(
              "[bulletinSlice] rejected(not found) - posts 배열 업데이트:",
              { beforeCount, afterCount }
            );
          }

          // currentPost에서도 첨부파일 제거
          if (state.currentPost && state.currentPost.id === postId) {
            const beforeCount = state.currentPost.attachments?.length || 0;
            state.currentPost = {
              ...state.currentPost,
              attachments:
                state.currentPost.attachments?.filter(
                  (att) => att.id !== attachId
                ) || [],
            };
            const afterCount = state.currentPost.attachments?.length || 0;
            console.log(
              "[bulletinSlice] rejected(not found) - currentPost 업데이트:",
              { beforeCount, afterCount }
            );
          }
        } else {
          console.log(
            "[bulletinSlice] 서버 오류이지만 파일이 존재할 수 있음 - UI 상태 유지"
          );
          // 네트워크 오류, 권한 오류 등의 경우 UI 상태를 유지하여 사용자가 다시 시도할 수 있도록 함
        }
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