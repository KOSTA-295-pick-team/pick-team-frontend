import { createAsyncThunk } from "@reduxjs/toolkit";
import { bulletinApi } from "@/features/teamspace/bulletin/api/bulletinApi";

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
      boardId: number;
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
  async (postId: number, { rejectWithValue }) => {
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
      post: { title: string; content: string; boardId: number };
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
      postId: number;
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
      postId: number;
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