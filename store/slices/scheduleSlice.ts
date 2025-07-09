import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import { scheduleApi } from "../../services/scheduleApi";
import { CalendarEvent } from "../../types";

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

// 팀 일정 목록 조회
export const fetchSchedules = createAsyncThunk(
  "schedules/fetchSchedules",
  async (
    {
      teamId,
      page = 0,
      size = 20,
      type,
    }: {
      teamId: string;
      page?: number;
      size?: number;
      type?: "MEETING" | "DEADLINE" | "WORKSHOP" | "VACATION" | "OTHER";
    },
    { rejectWithValue }
  ) => {
    try {
      const response = await scheduleApi.getSchedules(teamId, page, size, type);
      return response;
    } catch (error: any) {
      return rejectWithValue(
        error.message || "일정을 불러오는데 실패했습니다."
      );
    }
  }
);

// 기간별 일정 조회
export const fetchSchedulesByDateRange = createAsyncThunk(
  "schedules/fetchSchedulesByDateRange",
  async (
    {
      teamId,
      startDate,
      endDate,
    }: {
      teamId: string;
      startDate: Date;
      endDate: Date;
    },
    { rejectWithValue }
  ) => {
    try {
      const events = await scheduleApi.getSchedulesByDateRange(
        teamId,
        startDate,
        endDate
      );
      return events;
    } catch (error: any) {
      return rejectWithValue(
        error.message || "기간별 일정을 불러오는데 실패했습니다."
      );
    }
  }
);

// 내 일정 조회
export const fetchMySchedules = createAsyncThunk(
  "schedules/fetchMySchedules",
  async (
    {
      teamId,
      accountId,
      page = 0,
      size = 20,
    }: {
      teamId: string;
      accountId: string;
      page?: number;
      size?: number;
    },
    { rejectWithValue }
  ) => {
    try {
      const response = await scheduleApi.getMySchedules(
        teamId,
        accountId,
        page,
        size
      );
      return response;
    } catch (error: any) {
      return rejectWithValue(
        error.message || "내 일정을 불러오는데 실패했습니다."
      );
    }
  }
);

// 일정 생성
export const createSchedule = createAsyncThunk(
  "schedules/createSchedule",
  async (
    {
      teamId,
      accountId,
      event,
    }: {
      teamId: string;
      accountId: string;
      event: Partial<CalendarEvent>;
    },
    { rejectWithValue }
  ) => {
    try {
      const newEvent = await scheduleApi.createSchedule(
        teamId,
        accountId,
        event
      );
      return newEvent;
    } catch (error: any) {
      return rejectWithValue(error.message || "일정 생성에 실패했습니다.");
    }
  }
);

// 일정 수정
export const updateSchedule = createAsyncThunk(
  "schedules/updateSchedule",
  async (
    {
      teamId,
      scheduleId,
      accountId,
      event,
    }: {
      teamId: string;
      scheduleId: string;
      accountId: string;
      event: Partial<CalendarEvent>;
    },
    { rejectWithValue }
  ) => {
    try {
      const updatedEvent = await scheduleApi.updateSchedule(
        teamId,
        scheduleId,
        accountId,
        event
      );
      return updatedEvent;
    } catch (error: any) {
      return rejectWithValue(error.message || "일정 수정에 실패했습니다.");
    }
  }
);

// 일정 삭제
export const deleteSchedule = createAsyncThunk(
  "schedules/deleteSchedule",
  async (
    {
      teamId,
      scheduleId,
      accountId,
    }: {
      teamId: string;
      scheduleId: string;
      accountId: string;
    },
    { rejectWithValue }
  ) => {
    try {
      await scheduleApi.deleteSchedule(teamId, scheduleId, accountId);
      return scheduleId;
    } catch (error: any) {
      return rejectWithValue(error.message || "일정 삭제에 실패했습니다.");
    }
  }
);

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
      .addCase(fetchSchedules.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchSchedules.fulfilled, (state, action) => {
        state.loading = false;
        state.events = action.payload.events;
        state.totalPages = action.payload.totalPages;
        state.totalElements = action.payload.totalElements;
      })
      .addCase(fetchSchedules.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      // 기간별 일정 조회
      .addCase(fetchSchedulesByDateRange.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchSchedulesByDateRange.fulfilled, (state, action) => {
        state.loading = false;
        state.events = action.payload;
      })
      .addCase(fetchSchedulesByDateRange.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      // 내 일정 조회
      .addCase(fetchMySchedules.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchMySchedules.fulfilled, (state, action) => {
        state.loading = false;
        state.events = action.payload.events;
        state.totalPages = action.payload.totalPages;
        state.totalElements = action.payload.totalElements;
      })
      .addCase(fetchMySchedules.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      // 일정 생성
      .addCase(createSchedule.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createSchedule.fulfilled, (state, action) => {
        state.loading = false;
        state.events.push(action.payload);
      })
      .addCase(createSchedule.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      // 일정 수정
      .addCase(updateSchedule.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateSchedule.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.events.findIndex(
          (event) => event.id === action.payload.id
        );
        if (index !== -1) {
          state.events[index] = action.payload;
        }
      })
      .addCase(updateSchedule.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      // 일정 삭제
      .addCase(deleteSchedule.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteSchedule.fulfilled, (state, action) => {
        state.loading = false;
        state.events = state.events.filter(
          (event) => event.id !== action.payload
        );
      })
      .addCase(deleteSchedule.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearError, setCurrentPage } = scheduleSlice.actions;
export default scheduleSlice.reducer;
