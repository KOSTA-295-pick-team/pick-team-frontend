import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { ChatRoom, ChatMessage, ChatRoomMember } from '../../types';
import * as chatApi from '../../services/chatApi';

// 채팅 상태 타입 정의
interface ChatState {
  rooms: ChatRoom[];
  currentRoom: ChatRoom | null;
  messages: Record<string, ChatMessage[]>; // roomId를 키로 사용
  members: Record<string, ChatRoomMember[]>; // roomId를 키로 사용
  loading: boolean;
  error: string | null;
  unreadCounts: Record<string, number>; // roomId를 키로 사용
}

// 초기 상태
const initialState: ChatState = {
  rooms: [],
  currentRoom: null,
  messages: {},
  members: {},
  loading: false,
  error: null,
  unreadCounts: {},
};

// Async Thunks
export const fetchChatRoomsThunk = createAsyncThunk(
  'chat/fetchRooms',
  async (workspaceId: string) => {
    const response = await chatApi.fetchChatRooms(workspaceId);
    return response.data;
  }
);

export const fetchMessagesThunk = createAsyncThunk(
  'chat/fetchMessages',
  async ({ workspaceId, roomId }: { workspaceId: string; roomId: string }) => {
    const response = await chatApi.fetchChatMessages(workspaceId, roomId);
    return { roomId, messages: response.data };
  }
);

export const sendMessageThunk = createAsyncThunk(
  'chat/sendMessage',
  async ({ workspaceId, roomId, text, file }: { workspaceId: string; roomId: string; text: string; file?: File }) => {
    const response = await chatApi.sendChatMessage(workspaceId, roomId, text, file);
    return { roomId, message: response.data };
  }
);

export const createGroupChatRoomThunk = createAsyncThunk(
  'chat/createGroupRoom',
  async ({ workspaceId, name, memberIds }: { workspaceId: string; name: string; memberIds: string[] }) => {
    const response = await chatApi.createChatRoom(workspaceId, name, memberIds);
    return response.data;
  }
);

export const createDmChatRoomThunk = createAsyncThunk(
  'chat/createDmRoom',
  async ({ workspaceId, otherUserId, otherUserName }: { 
    workspaceId: string; 
    otherUserId: string;
    otherUserName: string;
  }) => {
    const response = await chatApi.createDmChatRoom(workspaceId, otherUserId, otherUserName);
    return response.data;
  }
);

// Chat Slice
const chatSlice = createSlice({
  name: 'chat',
  initialState,
  reducers: {
    setCurrentRoom: (state, action: PayloadAction<ChatRoom | null>) => {
      state.currentRoom = action.payload;
    },
    addMessage: (state, action: PayloadAction<{ roomId: string; message: ChatMessage }>) => {
      const { roomId, message } = action.payload;
      if (!state.messages[roomId]) {
        state.messages[roomId] = [];
      }
      state.messages[roomId].push(message);
      
      // 현재 방이 아닌 경우 읽지 않은 메시지 수 증가
      if (state.currentRoom?.id !== roomId) {
        state.unreadCounts[roomId] = (state.unreadCounts[roomId] || 0) + 1;
      }
    },
    deleteMessage: (state, action: PayloadAction<{ roomId: string; messageId: string }>) => {
      const { roomId, messageId } = action.payload;
      if (state.messages[roomId]) {
        state.messages[roomId] = state.messages[roomId].filter(msg => msg.id !== messageId);
      }
    },
    updateMembers: (state, action: PayloadAction<{ roomId: string; members: ChatRoomMember[] }>) => {
      const { roomId, members } = action.payload;
      state.members[roomId] = members;
    },
    clearUnreadCount: (state, action: PayloadAction<string>) => {
      const roomId = action.payload;
      state.unreadCounts[roomId] = 0;
    },
    leaveRoom: (state, action: PayloadAction<string>) => {
      const roomId = action.payload;
      state.rooms = state.rooms.filter(room => room.id !== roomId);
      if (state.currentRoom?.id === roomId) {
        state.currentRoom = null;
      }
      delete state.messages[roomId];
      delete state.members[roomId];
      delete state.unreadCounts[roomId];
    },
  },
  extraReducers: (builder) => {
    builder
      // fetchChatRooms
      .addCase(fetchChatRoomsThunk.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchChatRoomsThunk.fulfilled, (state, action) => {
        state.loading = false;
        state.rooms = action.payload;
      })
      .addCase(fetchChatRoomsThunk.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || '채팅방 목록 로딩 실패';
      })
      // fetchMessages
      .addCase(fetchMessagesThunk.fulfilled, (state, action) => {
        const { roomId, messages } = action.payload;
        state.messages[roomId] = messages;
      })
      // sendMessage
      .addCase(sendMessageThunk.fulfilled, (state, action) => {
        const { roomId, message } = action.payload;
        if (!state.messages[roomId]) {
          state.messages[roomId] = [];
        }
        state.messages[roomId].push(message);
      })
      // 채팅방 생성 (그룹)
      .addCase(createGroupChatRoomThunk.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createGroupChatRoomThunk.fulfilled, (state, action) => {
        state.loading = false;
        state.rooms = [...state.rooms, action.payload];
        state.currentRoom = action.payload;
      })
      .addCase(createGroupChatRoomThunk.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || '채팅방 생성 실패';
      })
      // 채팅방 생성 (DM)
      .addCase(createDmChatRoomThunk.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createDmChatRoomThunk.fulfilled, (state, action) => {
        state.loading = false;
        state.rooms = [...state.rooms, action.payload];
        state.currentRoom = action.payload;
      })
      .addCase(createDmChatRoomThunk.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'DM 채팅방 생성 실패';
      });
  },
});

export const {
  setCurrentRoom,
  addMessage,
  deleteMessage,
  updateMembers,
  clearUnreadCount,
  leaveRoom,
} = chatSlice.actions;

export default chatSlice.reducer;
