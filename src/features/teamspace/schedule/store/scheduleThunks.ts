import { createAsyncThunk } from "@reduxjs/toolkit";
import { scheduleApi } from "@/features/teamspace/schedule/api/scheduleApi";
import {
  CalendarEvent,
  ScheduleCreateRequest,
  ScheduleUpdateRequest,
} from "@/types";

// 팀 일정 목록 조회
export const fetchSchedules = createAsyncThunk(
  "schedules/fetchSchedules",
  async (
    {
      teamId,
      page = 0,
      size = 20,
    }: {
      teamId: number;
      page?: number;
      size?: number;
    },
    { rejectWithValue }
  ) => {
    try {
      // API 함수 이름 변경: getSchedules -> getTeamSchedules
      const response = await scheduleApi.getTeamSchedules(teamId, page, size);
      // 백엔드 응답을 프론트엔드 타입으로 변환
      const events: CalendarEvent[] = response.content.map((schedule) => ({
        id: schedule.id,
        title: schedule.title,
        startDate: schedule.startDate,
        endDate: schedule.endDate,
        scheduleDesc: schedule.scheduleDesc,
        type: schedule.type,
        teamId: schedule.teamId,
        creatorId: schedule.creatorId,
        creatorName: schedule.creatorName,
        teamName: schedule.teamName,
        createdAt: schedule.createdAt,
        updatedAt: schedule.updatedAt,
      }));
      return {
        events,
        totalPages: response.totalPages,
        totalElements: response.totalElements,
      };
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
      teamId: number;
      startDate: string;
      endDate: string;
    },
    { rejectWithValue }
  ) => {
    try {
      const events = await scheduleApi.getSchedulesByDateRange(
        teamId,
        startDate,
        endDate
      );
      // 백엔드 응답을 프론트엔드 타입으로 변환
      return events.map((schedule) => ({
        id: schedule.id,
        title: schedule.title,
        startDate: schedule.startDate,
        endDate: schedule.endDate,
        scheduleDesc: schedule.scheduleDesc,
        type: schedule.type,
        teamId: schedule.teamId,
        creatorId: schedule.creatorId,
        creatorName: schedule.creatorName,
        teamName: schedule.teamName,
        createdAt: schedule.createdAt,
        updatedAt: schedule.updatedAt,
      }));
    } catch (error: any) {
      return rejectWithValue(
        error.message || "기간별 일정을 불러오는데 실패했습니다."
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
      teamId: number;
      accountId: string;
      event: Partial<CalendarEvent>;
    },
    { rejectWithValue }
  ) => {
    try {
      const requestData: ScheduleCreateRequest = {
        title: event.title!,
        startDate: event.startDate!,
        endDate: event.endDate!,
        scheduleDesc: event.scheduleDesc,
        type: event.type!,
      };
      const newEvent = await scheduleApi.createSchedule(
        teamId,
        accountId,
        requestData
      );
      return {
        id: newEvent.id,
        title: newEvent.title,
        startDate: newEvent.startDate,
        endDate: newEvent.endDate,
        scheduleDesc: newEvent.scheduleDesc,
        type: newEvent.type,
        teamId: newEvent.teamId,
        creatorId: newEvent.creatorId,
        creatorName: newEvent.creatorName,
        teamName: newEvent.teamName,
        createdAt: newEvent.createdAt,
        updatedAt: newEvent.updatedAt,
      };
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
      teamId: number;
      scheduleId: number;
      accountId: string;
      event: Partial<CalendarEvent>;
    },
    { rejectWithValue }
  ) => {
    try {
      const requestData: ScheduleUpdateRequest = {
        title: event.title!,
        startDate: event.startDate!,
        endDate: event.endDate!,
        scheduleDesc: event.scheduleDesc,
        type: event.type!,
      };
      const updatedEvent = await scheduleApi.updateSchedule(
        teamId,
        scheduleId,
        accountId,
        requestData
      );
      return {
        id: updatedEvent.id,
        title: updatedEvent.title,
        startDate: updatedEvent.startDate,
        endDate: updatedEvent.endDate,
        scheduleDesc: updatedEvent.scheduleDesc,
        type: updatedEvent.type,
        teamId: updatedEvent.teamId,
        creatorId: updatedEvent.creatorId,
        creatorName: updatedEvent.creatorName,
        teamName: updatedEvent.teamName,
        createdAt: updatedEvent.createdAt,
        updatedAt: updatedEvent.updatedAt,
      };
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
      teamId: number;
      scheduleId: number;
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