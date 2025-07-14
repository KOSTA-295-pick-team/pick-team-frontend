import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { CalendarEvent } from "@/types";
import * as thunks from "@/features/teamspace/schedule/store/scheduleThunks";

interface ScheduleState {
  events: CalendarEvent[];
  loading: boolean;
  error: string | null;
  // 페이징 관련 상태
  currentPage: number;
  totalPages: number;
  totalElements: number;
  pageSize: number;
}

const initialState: ScheduleState = {
  events: [],
  loading: false,
  error: null,
  currentPage: 0,
  totalPages: 0,
  totalElements: 0,
  pageSize: 20,
};

const scheduleSlice = createSlice({
  name: "schedules",
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setCurrentPage: (state, action: PayloadAction<number>) => {
      state.currentPage = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      // 팀 일정 목록 조회
      .addCase(thunks.fetchSchedules.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(thunks.fetchSchedules.fulfilled, (state, action) => {
        state.loading = false;
        state.events = action.payload.events;
        state.totalPages = action.payload.totalPages;
        state.totalElements = action.payload.totalElements;
      })
      .addCase(thunks.fetchSchedules.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      // 기간별 일정 조회
      .addCase(thunks.fetchSchedulesByDateRange.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(thunks.fetchSchedulesByDateRange.fulfilled, (state, action) => {
        state.loading = false;
        state.events = action.payload;
      })
      .addCase(thunks.fetchSchedulesByDateRange.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      // 일정 생성
      .addCase(thunks.createSchedule.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(thunks.createSchedule.fulfilled, (state, action) => {
        state.loading = false;
        state.events.push(action.payload);
      })
      .addCase(thunks.createSchedule.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      // 일정 수정
      .addCase(thunks.updateSchedule.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(thunks.updateSchedule.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.events.findIndex(
          (event) => event.id === action.payload.id
        );
        if (index !== -1) {
          state.events[index] = action.payload;
        }
      })
      .addCase(thunks.updateSchedule.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      // 일정 삭제
      .addCase(thunks.deleteSchedule.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(thunks.deleteSchedule.fulfilled, (state, action) => {
        state.loading = false;
        state.events = state.events.filter(
          (event) => event.id !== action.payload
        );
      })
      .addCase(thunks.deleteSchedule.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearError, setCurrentPage } = scheduleSlice.actions;
export default scheduleSlice.reducer; 