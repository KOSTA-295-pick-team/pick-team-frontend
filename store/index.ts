import { configureStore } from "@reduxjs/toolkit";
import announcementReducer from "./slices/announcementSlice";
import scheduleReducer from "./slices/scheduleSlice";
import bulletinReducer from "./slices/bulletinSlice";
import chatReducer from "./slices/chatSlice";

export const store = configureStore({
  reducer: {
    announcements: announcementReducer,
    schedules: scheduleReducer,
    bulletin: bulletinReducer,
    chat: chatReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [
          "announcements/setAnnouncements",
          "schedules/fetchSchedulesByDateRange/fulfilled",
          "schedules/createSchedule/fulfilled",
          "schedules/updateSchedule/fulfilled",
          "bulletin/fetchPosts/fulfilled",
          "bulletin/fetchPost/fulfilled",
          "bulletin/createPost/fulfilled",
          "bulletin/updatePost/fulfilled",
          "bulletin/fetchComments/fulfilled",
          "bulletin/createComment/fulfilled",
          "bulletin/updateComment/fulfilled",
          "chat/fetchRooms/fulfilled",
          "chat/fetchMessages/fulfilled",
          "chat/sendMessage/fulfilled",
          "chat/addMessage",
        ],
        ignoredPaths: [
          "announcements.announcements",
          "schedules.events",
          "bulletin.posts",
          "bulletin.currentPost",
          "bulletin.comments",
          "chat.messages",
          "chat.currentRoom",
        ],
      },
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
