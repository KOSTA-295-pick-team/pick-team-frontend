import { createAsyncThunk } from "@reduxjs/toolkit";
import { announcementApi } from "@/features/teamspace/announcement/api/announcementApi";

// 공지사항 목록 조회 (기존 메서드 - 하위 호환성을 위해 유지)
export const fetchAnnouncements = createAsyncThunk(
  "announcements/fetchAnnouncements",
  async (
    { teamId, workspaceId }: { teamId: number; workspaceId: string },
    { rejectWithValue }
  ) => {
    try {
      const response = await announcementApi.getAnnouncements(
        workspaceId,
        teamId
      );
      return response;
    } catch (error: any) {
      return rejectWithValue(
        error.message || "공지사항을 불러오는데 실패했습니다."
      );
    }
  }
);

// 공지사항 생성
export const createAnnouncement = createAsyncThunk(
  "announcements/createAnnouncement",
  async (
    {
      teamId,
      title,
      content,
      workspaceId,
    }: {
      teamId: number;
      title: string;
      content: string;
      workspaceId: string;
    },
    { rejectWithValue }
  ) => {
    try {
      const response = await announcementApi.createAnnouncement(workspaceId, {
        teamId,
        title,
        content,
      });
      return response;
    } catch (error: any) {
      return rejectWithValue(error.message || "공지사항 생성에 실패했습니다.");
    }
  }
);

// 공지사항 수정
export const updateAnnouncement = createAsyncThunk(
  "announcements/updateAnnouncement",
  async (
    {
      announcementId,
      title,
      content,
      workspaceId,
    }: {
      announcementId: string;
      title: string;
      content: string;
      workspaceId: string;
    },
    { rejectWithValue }
  ) => {
    try {
      const response = await announcementApi.updateAnnouncement(
        workspaceId,
        announcementId,
        {
        title,
        content,
        }
      );
      return response;
    } catch (error: any) {
      return rejectWithValue(error.message || "공지사항 수정에 실패했습니다.");
    }
  }
);

// 공지사항 삭제
export const deleteAnnouncement = createAsyncThunk(
  "announcements/deleteAnnouncement",
  async (
    {
      announcementId,
      workspaceId,
    }: {
      announcementId: string;
      workspaceId: string;
    },
    { rejectWithValue }
  ) => {
    try {
      await announcementApi.deleteAnnouncement(workspaceId, announcementId);
      return announcementId;
    } catch (error: any) {
      return rejectWithValue(error.message || "공지사항 삭제에 실패했습니다.");
    }
  }
); 