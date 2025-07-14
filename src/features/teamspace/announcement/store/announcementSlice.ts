import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { Announcement } from "@/types";
import * as thunks from "@/features/teamspace/announcement/store/announcementThunks";

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
      // 공지사항 목록 조회 (기존 메서드)
      .addCase(thunks.fetchAnnouncements.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(thunks.fetchAnnouncements.fulfilled, (state, action) => {
        state.loading = false;
        state.announcements = action.payload;
        // 기존 메서드 사용 시 페이징 정보 초기화
        state.currentPage = 0;
        state.totalPages = 1;
        state.totalElements = action.payload.length;
        state.hasNext = false;
        state.hasPrevious = false;
      })
      .addCase(thunks.fetchAnnouncements.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // 공지사항 생성
      .addCase(thunks.createAnnouncement.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(thunks.createAnnouncement.fulfilled, (state, action) => {
        state.loading = false;
        state.announcements.unshift(action.payload);
      })
      .addCase(thunks.createAnnouncement.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // 공지사항 수정
      .addCase(thunks.updateAnnouncement.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(thunks.updateAnnouncement.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.announcements.findIndex(
          (announcement) => announcement.id === action.payload.id
        );
        if (index !== -1) {
          state.announcements[index] = action.payload;
        }
      })
      .addCase(thunks.updateAnnouncement.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // 공지사항 삭제
      .addCase(thunks.deleteAnnouncement.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(thunks.deleteAnnouncement.fulfilled, (state, action) => {
        state.loading = false;
        state.announcements = state.announcements.filter(
          (announcement) => announcement.id !== action.payload
        );
      })
      .addCase(thunks.deleteAnnouncement.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearError, setAnnouncements } = announcementSlice.actions;
export default announcementSlice.reducer; 