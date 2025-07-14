import { createAsyncThunk } from "@reduxjs/toolkit";
import { bulletinApi } from "@/features/teamspace/bulletin/api/bulletinApi";
import { CommentCreateRequest, CommentUpdateRequest } from "@/features/teamspace/bulletin/types/board";

// 댓글 목록 조회
export const fetchComments = createAsyncThunk(
  "bulletin/fetchComments",
  async (
    {
      postId,
      page = 0,
      size = 5,
    }: {
      postId: number;
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
      content,
      accountId,
    }: {
      postId: number;
      content: string;
      accountId: string;
    },
    { rejectWithValue }
  ) => {
    try {
      const data: CommentCreateRequest = { content };
      const newComment = await bulletinApi.createComment(postId, accountId, data);
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
      content,
      accountId,
    }: {
      commentId: number;
      content: string;
      accountId: string;
    },
    { rejectWithValue }
  ) => {
    try {
      const data: CommentUpdateRequest = { content };
      const updatedComment = await bulletinApi.updateComment(commentId, accountId, data);
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
      commentId: number;
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