import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import { announcementApi } from "../../services/announcement";
import { Announcement, AnnouncementPageResponse } from "../../types";

interface AnnouncementState {
  announcements: Announcement[];
  loading: boolean;
  error: string | null;
  // 페이징 관련 상태
  currentPage: number;
  totalPages: number;
  totalElements: number;
  pageSize: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

const initialState: AnnouncementState = {
  announcements: [],
  loading: false,
  error: null,
  currentPage: 0,
  totalPages: 0,
  totalElements: 0,
  pageSize: 5,
  hasNext: false,
  hasPrevious: false,
};

// 공지사항 목록 조회 (페이징 지원)
export const fetchAnnouncementsWithPaging = createAsyncThunk(
  "announcements/fetchAnnouncementsWithPaging",
  async (
    {
      teamId,
      workspaceId,
      page = 0,
      size = 5,
    }: {
      teamId: string;
      workspaceId: string;
      page?: number;
      size?: number;
    },
    { rejectWithValue }
  ) => {
    try {
      const response = await announcementApi.getAnnouncementsWithPaging(
        teamId,
        workspaceId,
        page,
        size
      );
      return response;
    } catch (error: any) {
      return rejectWithValue(
        error.message || "공지사항을 불러오는데 실패했습니다."
      );
    }
  }
);

// 공지사항 목록 조회 (기존 메서드 - 하위 호환성을 위해 유지)
export const fetchAnnouncements = createAsyncThunk(
  "announcements/fetchAnnouncements",
  async (
    { teamId, workspaceId }: { teamId: string; workspaceId: string },
    { rejectWithValue }
  ) => {
    try {
      const response = await announcementApi.getAnnouncements(
        teamId,
        workspaceId
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
      accountId,
    }: {
      teamId: string;
      title: string;
      content: string;
      workspaceId: string;
      accountId: string;
    },
    { rejectWithValue }
  ) => {
    try {
      const response = await announcementApi.createAnnouncement(
        teamId,
        title,
        content,
        workspaceId,
        accountId
      );
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
      teamId,
      announcementId,
      title,
      content,
      workspaceId,
      accountId,
    }: {
      teamId: string;
      announcementId: string;
      title: string;
      content: string;
      workspaceId: string;
      accountId: string;
    },
    { rejectWithValue }
  ) => {
    try {
      const response = await announcementApi.updateAnnouncement(
        teamId,
        announcementId,
        title,
        content,
        workspaceId,
        accountId
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
      teamId,
      announcementId,
      workspaceId,
      accountId,
    }: {
      teamId: string;
      announcementId: string;
      workspaceId: string;
      accountId: string;
    },
    { rejectWithValue }
  ) => {
    try {
      await announcementApi.deleteAnnouncement(
        teamId,
        announcementId,
        workspaceId,
        accountId
      );
      return announcementId;
    } catch (error: any) {
      return rejectWithValue(error.message || "공지사항 삭제에 실패했습니다.");
    }
  }
);

const announcementSlice = createSlice({
  name: "announcements",
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setAnnouncements: (state, action: PayloadAction<Announcement[]>) => {
      state.announcements = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      // 공지사항 목록 조회 (페이징 지원)
      .addCase(fetchAnnouncementsWithPaging.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAnnouncementsWithPaging.fulfilled, (state, action) => {
        state.loading = false;
        state.announcements = action.payload.announcements;
        state.currentPage = action.payload.currentPage;
        state.totalPages = action.payload.totalPages;
        state.totalElements = action.payload.totalElements;
        state.pageSize = action.payload.size;
        state.hasNext = action.payload.hasNext;
        state.hasPrevious = action.payload.hasPrevious;
      })
      .addCase(fetchAnnouncementsWithPaging.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // 공지사항 목록 조회 (기존 메서드)
      .addCase(fetchAnnouncements.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAnnouncements.fulfilled, (state, action) => {
        state.loading = false;
        state.announcements = action.payload;
        // 기존 메서드 사용 시 페이징 정보 초기화
        state.currentPage = 0;
        state.totalPages = 1;
        state.totalElements = action.payload.length;
        state.hasNext = false;
        state.hasPrevious = false;
      })
      .addCase(fetchAnnouncements.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // 공지사항 생성
      .addCase(createAnnouncement.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createAnnouncement.fulfilled, (state, action) => {
        state.loading = false;
        state.announcements.unshift(action.payload);
      })
      .addCase(createAnnouncement.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // 공지사항 수정
      .addCase(updateAnnouncement.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateAnnouncement.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.announcements.findIndex(
          (announcement) => announcement.id === action.payload.id
        );
        if (index !== -1) {
          state.announcements[index] = action.payload;
        }
      })
      .addCase(updateAnnouncement.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // 공지사항 삭제
      .addCase(deleteAnnouncement.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteAnnouncement.fulfilled, (state, action) => {
        state.loading = false;
        state.announcements = state.announcements.filter(
          (announcement) => announcement.id !== action.payload
        );
      })
      .addCase(deleteAnnouncement.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearError, setAnnouncements } = announcementSlice.actions;
export default announcementSlice.reducer;
