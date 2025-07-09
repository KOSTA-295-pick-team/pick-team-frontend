import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import { bulletinApi } from "../../services/bulletinApi";
import { BulletinPost, BulletinComment, BulletinAttachment } from "../../types";

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

// 게시글 목록 조회
export const fetchPosts = createAsyncThunk(
  "bulletin/fetchPosts",
  async (
    {
      teamId,
      boardId,
      page = 0,
      size = 5,
    }: {
      teamId: string;
      boardId: string;
      page?: number;
      size?: number;
    },
    { rejectWithValue }
  ) => {
    try {
      const response = await bulletinApi.getPosts(teamId, boardId, page, size);
      return response;
    } catch (error: any) {
      return rejectWithValue(
        error.message || "게시글을 불러오는데 실패했습니다."
      );
    }
  }
);

// 게시글 상세 조회
export const fetchPost = createAsyncThunk(
  "bulletin/fetchPost",
  async (postId: string, { rejectWithValue }) => {
    try {
      const post = await bulletinApi.getPost(postId);
      return post;
    } catch (error: any) {
      return rejectWithValue(
        error.message || "게시글을 불러오는데 실패했습니다."
      );
    }
  }
);

// 게시글 생성
export const createPost = createAsyncThunk(
  "bulletin/createPost",
  async (
    {
      teamId,
      accountId,
      post,
    }: {
      teamId: string;
      accountId: string;
      post: { title: string; content: string; boardId: string };
    },
    { rejectWithValue }
  ) => {
    try {
      const newPost = await bulletinApi.createPost(teamId, accountId, post);
      return newPost;
    } catch (error: any) {
      return rejectWithValue(error.message || "게시글 생성에 실패했습니다.");
    }
  }
);

// 게시글 수정
export const updatePost = createAsyncThunk(
  "bulletin/updatePost",
  async (
    {
      postId,
      accountId,
      post,
    }: {
      postId: string;
      accountId: string;
      post: { title: string; content: string };
    },
    { rejectWithValue }
  ) => {
    try {
      const updatedPost = await bulletinApi.updatePost(postId, accountId, post);
      return updatedPost;
    } catch (error: any) {
      return rejectWithValue(error.message || "게시글 수정에 실패했습니다.");
    }
  }
);

// 게시글 삭제
export const deletePost = createAsyncThunk(
  "bulletin/deletePost",
  async (
    {
      postId,
      accountId,
    }: {
      postId: string;
      accountId: string;
    },
    { rejectWithValue }
  ) => {
    try {
      await bulletinApi.deletePost(postId, accountId);
      return postId;
    } catch (error: any) {
      return rejectWithValue(error.message || "게시글 삭제에 실패했습니다.");
    }
  }
);

// 댓글 목록 조회
export const fetchComments = createAsyncThunk(
  "bulletin/fetchComments",
  async (
    {
      postId,
      page = 0,
      size = 5,
    }: {
      postId: string;
      page?: number;
      size?: number;
    },
    { rejectWithValue }
  ) => {
    try {
      const response = await bulletinApi.getComments(postId, page, size);
      return response;
    } catch (error: any) {
      return rejectWithValue(
        error.message || "댓글을 불러오는데 실패했습니다."
      );
    }
  }
);

// 댓글 생성
export const createComment = createAsyncThunk(
  "bulletin/createComment",
  async (
    {
      postId,
      accountId,
      content,
    }: {
      postId: string;
      accountId: string;
      content: string;
    },
    { rejectWithValue }
  ) => {
    try {
      const newComment = await bulletinApi.createComment(
        postId,
        accountId,
        content
      );
      return newComment;
    } catch (error: any) {
      return rejectWithValue(error.message || "댓글 생성에 실패했습니다.");
    }
  }
);

// 댓글 수정
export const updateComment = createAsyncThunk(
  "bulletin/updateComment",
  async (
    {
      commentId,
      accountId,
      content,
    }: {
      commentId: string;
      accountId: string;
      content: string;
    },
    { rejectWithValue }
  ) => {
    try {
      const updatedComment = await bulletinApi.updateComment(
        commentId,
        accountId,
        content
      );
      return updatedComment;
    } catch (error: any) {
      return rejectWithValue(error.message || "댓글 수정에 실패했습니다.");
    }
  }
);

// 댓글 삭제
export const deleteComment = createAsyncThunk(
  "bulletin/deleteComment",
  async (
    {
      commentId,
      accountId,
    }: {
      commentId: string;
      accountId: string;
    },
    { rejectWithValue }
  ) => {
    try {
      await bulletinApi.deleteComment(commentId, accountId);
      return commentId;
    } catch (error: any) {
      return rejectWithValue(error.message || "댓글 삭제에 실패했습니다.");
    }
  }
);

// 첨부파일 삭제
export const deleteAttachment = createAsyncThunk(
  "bulletin/deleteAttachment",
  async (
    {
      postId,
      attachId,
      accountId,
    }: {
      postId: string;
      attachId: string;
      accountId: string;
    },
    { rejectWithValue }
  ) => {
    try {
      console.log("[deleteAttachment Redux] API 호출 시작:", {
        postId,
        attachId,
        accountId,
      });

      const result = await bulletinApi.deleteAttachment(
        postId,
        attachId,
        accountId
      );

      console.log("[deleteAttachment Redux] API 호출 성공:", {
        postId,
        attachId,
        result,
      });

      return { postId, attachId, result };
    } catch (error: any) {
      console.log("[deleteAttachment Redux] API 호출 실패:", {
        postId,
        attachId,
        error: error.message,
        status: error.status || "unknown",
        responseText: error.responseText,
      });

      // 에러 정보를 더 상세하게 전달
      return rejectWithValue({
        message: error.message || "첨부파일 삭제에 실패했습니다.",
        status: error.status,
        responseText: error.responseText,
      });
    }
  }
);

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
      const postIndex = state.posts.findIndex((p) => p.id === postId);
      if (postIndex !== -1) {
        const currentAttachments = state.posts[postIndex].attachments || [];
        state.posts[postIndex] = {
          ...state.posts[postIndex],
          attachments: [...currentAttachments, ...attachments],
        };
      }

      // currentPost에도 첨부파일 추가
      if (state.currentPost && state.currentPost.id === postId) {
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
      .addCase(fetchPosts.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchPosts.fulfilled, (state, action) => {
        state.loading = false;

        // 게시글 목록에서 삭제된 첨부파일을 필터링
        const filteredPosts = action.payload.posts.map((post) =>
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
      .addCase(fetchPosts.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      // 게시글 상세 조회
      .addCase(fetchPost.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchPost.fulfilled, (state, action) => {
        state.loading = false;

        const fetchTime = Date.now();

        // 서버 데이터에서 삭제된 첨부파일을 필터링
        const serverPost = {
          ...action.payload,
          attachments: filterAttachments(
            action.payload.attachments || [],
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
            serverAttachmentIds: serverPost.attachments.map((a) => a.id),
            currentPostExists: !!state.currentPost,
            currentPostAttachments: state.currentPost?.attachments?.length || 0,
            currentPostAttachmentIds:
              state.currentPost?.attachments?.map((a) => a.id) || [],
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
          const clientIds = existingCurrentPost!
            .attachments!.map((a) => a.id)
            .sort();
          const serverIds = serverAttachments.map((a) => a.id).sort();
          attachmentsDiffer =
            JSON.stringify(clientIds) !== JSON.stringify(serverIds);
        } else if (postsArrayHasAttachments && isPostsFromCurrentSession) {
          const clientIds = existingPostInArray!
            .attachments!.map((a) => a.id)
            .sort();
          const serverIds = serverAttachments.map((a) => a.id).sort();
          attachmentsDiffer =
            JSON.stringify(clientIds) !== JSON.stringify(serverIds);
        }

        // 상태 보존 조건: 현재 세션에서 가져온 데이터이고, 첨부파일이 있으며, 서버와 다른 경우
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
            existingCurrentPost?.attachments?.map((a) => a.id) || [],
          clientPostsArrayIds:
            existingPostInArray?.attachments?.map((a) => a.id) || [],
          serverIds: serverAttachments.map((a) => a.id),
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
      .addCase(fetchPost.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      // 게시글 생성
      .addCase(createPost.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createPost.fulfilled, (state, action) => {
        state.loading = false;
        state.posts.unshift(action.payload);
      })
      .addCase(createPost.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      // 게시글 수정
      .addCase(updatePost.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updatePost.fulfilled, (state, action) => {
        state.loading = false;
        console.log(
          "[updatePost.fulfilled] 게시글 업데이트, payload:",
          action.payload
        );

        const updatedData = action.payload;

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
      .addCase(updatePost.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      // 게시글 삭제
      .addCase(deletePost.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deletePost.fulfilled, (state, action) => {
        state.loading = false;
        state.posts = state.posts.filter((post) => post.id !== action.payload);
        if (state.currentPost?.id === action.payload) {
          state.currentPost = null;
        }
      })
      .addCase(deletePost.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      // 댓글 목록 조회
      .addCase(fetchComments.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchComments.fulfilled, (state, action) => {
        state.loading = false;
        state.comments = action.payload.comments;
        state.commentTotalPages = action.payload.totalPages;
        state.commentTotalElements = action.payload.totalElements;
      })
      .addCase(fetchComments.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      // 댓글 생성
      .addCase(createComment.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createComment.fulfilled, (state, action) => {
        state.loading = false;
        state.comments.push(action.payload);
      })
      .addCase(createComment.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      // 댓글 수정
      .addCase(updateComment.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateComment.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.comments.findIndex(
          (comment) => comment.id === action.payload.id
        );
        if (index !== -1) {
          state.comments[index] = action.payload;
        }
      })
      .addCase(updateComment.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      // 댓글 삭제
      .addCase(deleteComment.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteComment.fulfilled, (state, action) => {
        state.loading = false;
        state.comments = state.comments.filter(
          (comment) => comment.id !== action.payload
        );
      })
      .addCase(deleteComment.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      // 첨부파일 삭제
      .addCase(deleteAttachment.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteAttachment.fulfilled, (state, action) => {
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
      .addCase(deleteAttachment.rejected, (state, action) => {
        state.loading = false;

        // action.meta.arg에서 postId와 attachId 추출
        const { postId, attachId } = action.meta.arg as {
          postId: string;
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
