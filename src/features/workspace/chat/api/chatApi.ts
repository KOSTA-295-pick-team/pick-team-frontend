import { apiRequest } from '@/lib/apiClient';
import { chatLogger } from '../utils/chatLogger';

export interface ChatRoomCreateRequest {
  name?: string;
  type: 'GROUP' | 'PERSONAL';
  chatMemberIdList: number[];
  workspaceId: number;
}

export interface ChatMessageRequest {
  content: string;
  senderId: number;
  senderName: string;
}

export interface ChatRoomResponse {
  id: number;
  name?: string;
  type: 'GROUP' | 'PERSONAL';
  workspaceId: number;
  workspaceName?: string;
  createdAt: string;
  memberCount: number;
  notificationEnabled?: boolean;
}

export interface ChatMessageResponse {
  id: number;
  content: string;
  senderName: string;
  senderId: number;
  senderProfileImageUrl?: string;
  chatRoomId: number;
  createdAt?: string;  // 기존 호환성 유지
  sentAt?: string;     // 백엔드에서 실제 사용하는 필드
}

export interface ChatMessageListResponse {
  messages: ChatMessageResponse[];
  totalElements: number;
  totalPages: number;
  currentPage: number;
  pageSize: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

export interface ChatMemberResponse {
  id: number;
  account: number;  // 백엔드에서는 account 필드로 반환
  name: string;     // 백엔드에서는 name 필드로 반환
  profileImageUrl?: string;
  joinedAt: string;
  lastReadMessageId?: number;
}

export const chatApi = {
  // 채팅방 목록 조회
  getChatRooms: async (workspaceId: number, page = 0, size = 20): Promise<{ content: ChatRoomResponse[] }> => {
    const params = new URLSearchParams({
      page: page.toString(),
      size: size.toString(),
      sort: 'createdAt,desc'
    });
    const response = await apiRequest<{ data: { content: ChatRoomResponse[] } }>(`/workspaces/${workspaceId}/chat-rooms?${params}`);
    return response.data;
  },

  // 내가 참여한 채팅방 목록 조회  
  getMyChatRooms: async (accountId: number): Promise<ChatRoomResponse[]> => {
    const response = await apiRequest<{ data: ChatRoomResponse[] }>(`/workspaces/*/chat-rooms/accounts/${accountId}`);
    return response.data;
  },

  // 채팅방 생성
  createChatRoom: async (workspaceId: number, request: ChatRoomCreateRequest): Promise<ChatRoomResponse> => {
    const response = await apiRequest<{ data: ChatRoomResponse }>(`/workspaces/${workspaceId}/chat-rooms/create`, {
      method: 'POST',
      body: JSON.stringify(request)
    });
    return response.data;
  },

  // DM 채팅방 생성
  createDmChatRoom: async (workspaceId: number, request: ChatRoomCreateRequest): Promise<ChatRoomResponse> => {
    const response = await apiRequest<{ data: ChatRoomResponse }>(`/workspaces/${workspaceId}/chat-rooms/create-dm`, {
      method: 'POST',
      body: JSON.stringify(request)
    });
    return response.data;
  },

  // 채팅방 제목 수정
  updateChatRoomTitle: async (workspaceId: number, chatRoomId: number, name: string): Promise<ChatRoomResponse> => {
    const response = await apiRequest<{ data: ChatRoomResponse }>(`/workspaces/${workspaceId}/chat-rooms/${chatRoomId}/updateTitle`, {
      method: 'PATCH',
      body: JSON.stringify({ name })
    });
    return response.data;
  },

  // 채팅방 메시지 조회
  getChatMessages: async (workspaceId: number, chatRoomId: number, page = 0, size = 20): Promise<ChatMessageListResponse> => {
    const params = new URLSearchParams({
      page: page.toString(),
      size: size.toString(),
      sort: 'createdAt,asc'
    });
    const url = `/workspaces/${workspaceId}/chat-rooms/${chatRoomId}/messages?${params}`;
    
    try {
      const response = await apiRequest<ChatMessageListResponse>(url);
      return response;
    } catch (error) {
      chatLogger.api.error('getChatMessages 실패', { workspaceId, chatRoomId, page, size, error });
      throw error;
    }
  },

  // 메시지 전송
  sendMessage: async (workspaceId: number, chatRoomId: number, request: ChatMessageRequest): Promise<ChatMessageResponse> => {
    const response = await apiRequest<ChatMessageResponse>(`/workspaces/${workspaceId}/chat-rooms/${chatRoomId}/messages`, {
      method: 'POST',
      body: JSON.stringify(request)
    });
    return response;
  },

  // 메시지 삭제
  deleteMessage: async (workspaceId: number, chatRoomId: number, messageId: number): Promise<void> => {
    await apiRequest<void>(`/workspaces/${workspaceId}/chat-rooms/${chatRoomId}/messages/${messageId}/delete`, {
      method: 'PATCH'
    });
  },

  // 채팅방 참여
  joinChatRoom: async (workspaceId: number, chatRoomId: number): Promise<ChatMemberResponse> => {
    const response = await apiRequest<{ data: ChatMemberResponse }>(`/workspaces/${workspaceId}/chat-rooms/${chatRoomId}/join`, {
      method: 'POST'
    });
    return response.data;
  },

  // 채팅방 퇴장
  leaveChatRoom: async (workspaceId: number, chatRoomId: number): Promise<void> => {
    await apiRequest<void>(`/workspaces/${workspaceId}/chat-rooms/${chatRoomId}/leave`, {
      method: 'PATCH'
    });
  },

  // 채팅방 멤버 목록 조회
  getChatMembers: async (chatRoomId: number): Promise<ChatMemberResponse[]> => {
    const response = await apiRequest<{ data: ChatMemberResponse[] }>(`/workspaces/*/chat-rooms/${chatRoomId}/members`);
    return response.data;
  },

  // 마지막 읽은 메시지 갱신
  updateLastReadMessage: async (workspaceId: number, chatRoomId: number, messageId: number): Promise<void> => {
    const params = new URLSearchParams({ messageId: messageId.toString() });
    await apiRequest<void>(`/workspaces/${workspaceId}/chat-rooms/${chatRoomId}/last-read-refresh?${params}`, {
      method: 'PATCH'
    });
  }
};
