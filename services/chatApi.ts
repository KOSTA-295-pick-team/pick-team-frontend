// chatApi.ts
// 채팅 관련 API 요청 함수 모음
// 최신 보안 모범 사례와 예외 처리를 포함합니다.
// 작성자: Copilot

import { apiRequest } from './api';
import type { ChatRoom, ChatMessage } from '../types';

// DTO 타입 정의
interface ChatRoomCreateRequest {
  workspaceId: string;  // 워크스페이스 ID
  name?: string;        // 채팅방 이름 (PERSONAL의 경우 생략 가능)
  chatMemberIdList: string[];  // 초대할 멤버 ID 목록
  type: 'PERSONAL' | 'GROUP'; // 채팅방 유형 (백엔드 ChatRoomType ENUM과 일치)
}

// API 응답 타입
interface ChatRoomResponse {
  id: string;
  name: string;
  type: 'PERSONAL' | 'GROUP';
  memberCount: number;
  createdAt: string;
  updatedAt: string;
  lastMessage?: {
    content: string;
    senderId: string;
    senderName: string;
    sentAt: string;
  };
}

/**
 * 워크스페이스 내 채팅방 목록 조회 (페이징)
 */
export async function fetchChatRooms(workspaceId: string, page = 0, size = 20): Promise<{
  content: ChatRoomResponse[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}> {
  const params = new URLSearchParams({ page: String(page), size: String(size) });
  const response = await apiRequest<{
    success: boolean;
    message: string;
    data: {
      content: ChatRoomResponse[];
      totalElements: number;
      totalPages: number;
      size: number;
      number: number;
    };
  }>(`/workspaces/${workspaceId}/chat-rooms?${params.toString()}`);
  
  if (response.success && response.data) return response.data;
  throw new Error(response.message || '채팅방 목록 조회 실패');
}

/**
 * 채팅방 생성 (그룹)
 */
export async function createChatRoom(workspaceId: string, name: string, memberIds: string[]): Promise<ChatRoomResponse> {
  const request: ChatRoomCreateRequest = {
    workspaceId,
    name,
    chatMemberIdList: memberIds,
    type: 'GROUP'
  };
  
  const response = await apiRequest<{success: boolean; message: string; data: ChatRoomResponse}>(
    `/workspaces/${workspaceId}/chat-rooms/create`,
    {
      method: 'POST',
      body: JSON.stringify(request),
    }
  );
  if (!response.success || !response.data) {
    throw new Error(response.message || '채팅방 생성 실패');
  }
  
  return response.data;
}

/**
 * DM 채팅방 생성
 * @param workspaceId 워크스페이스 ID
 * @param memberId DM을 보낼 상대방의 ID (배열로 변환하여 전송)
 */
export async function createDmChatRoom(workspaceId: string, memberId: string): Promise<ChatRoomResponse> {
  const request: ChatRoomCreateRequest = {
    workspaceId,
    chatMemberIdList: [memberId],  // 단일 멤버 ID를 배열로 변환
    type: 'PERSONAL',
    name: ''  // PERSONAL(DM) 방은 빈 문자열로 name 전송
  };
  
  const response = await apiRequest<{success: boolean; message: string; data: ChatRoomResponse}>(
    `/workspaces/${workspaceId}/chat-rooms/create-dm`,
    {
      method: 'POST',
      body: JSON.stringify(request),
    }
  );
  if (!response.success || !response.data) {
    throw new Error(response.message || 'DM 채팅방 생성 실패');
  }
  
  return response.data;  // 생성된 채팅방 정보 반환
}

/**
 * 채팅방 제목 변경
 */
export async function updateChatRoomTitle(workspaceId: string, chatRoomId: string, title: string): Promise<any> {
  const response = await apiRequest<{success: boolean; message: string; data: any}>(
    `/workspaces/${workspaceId}/chat-rooms/${chatRoomId}/updateTitle`,
    {
      method: 'PATCH',
      body: JSON.stringify({ title }),
    }
  );
  if (response.success && response.data) return response.data;
  throw new Error(response.message || '채팅방 제목 변경 실패');
}

/**
 * 채팅방 메시지 목록 조회 (페이징)
 */
export async function fetchChatMessages(workspaceId: string, chatRoomId: string, page = 0, size = 20): Promise<any> {
  const params = new URLSearchParams({ page: String(page), size: String(size) });
  const response = await apiRequest<any>(
    `/workspaces/${workspaceId}/chat-rooms/${chatRoomId}/messages?${params.toString()}`
  );
  return response;
}

/**
 * 채팅 메시지 전송
 */
export async function sendChatMessage(workspaceId: string, chatRoomId: string, message: string): Promise<any> {
  const response = await apiRequest<any>(
    `/workspaces/${workspaceId}/chat-rooms/${chatRoomId}/messages`,
    {
      method: 'POST',
      body: JSON.stringify({ message }),
    }
  );
  return response;
}

/**
 * 채팅방 참여
 */
export async function joinChatRoom(workspaceId: string, chatRoomId: string): Promise<any> {
  const response = await apiRequest<{success: boolean; message: string; data: any}>(
    `/workspaces/${workspaceId}/chat-rooms/${chatRoomId}/join`,
    { method: 'POST' }
  );
  if (response.success && response.data) return response.data;
  throw new Error(response.message || '채팅방 참여 실패');
}

/**
 * 채팅방 퇴장
 */
export async function leaveChatRoom(workspaceId: string, chatRoomId: string): Promise<any> {
  const response = await apiRequest<{success: boolean; message: string; data: any}>(
    `/workspaces/${workspaceId}/chat-rooms/${chatRoomId}/leave`,
    { method: 'PATCH' }
  );
  if (response.success) return true;
  throw new Error(response.message || '채팅방 퇴장 실패');
}

/**
 * 마지막 읽은 메시지 갱신
 */
export async function updateLastReadMessage(workspaceId: string, chatRoomId: string, messageId: string): Promise<any> {
  const response = await apiRequest<{success: boolean; message: string; data: any}>(
    `/workspaces/${workspaceId}/chat-rooms/${chatRoomId}/last-read-refresh?messageId=${messageId}`,
    { method: 'PATCH' }
  );
  if (response.success) return true;
  throw new Error(response.message || '마지막 읽은 메시지 갱신 실패');
}

/**
 * 채팅방 멤버 목록 조회
 */
export async function fetchChatRoomMembers(workspaceId: string, chatRoomId: string): Promise<any> {
  const response = await apiRequest<{success: boolean; message: string; data: any}>(
    `/workspaces/${workspaceId}/chat-rooms/${chatRoomId}/members`
  );
  if (response.success && response.data) return response.data;
  throw new Error(response.message || '채팅방 멤버 조회 실패');
}

/**
 * 내가 참여한 채팅방 목록 조회
 */
export async function fetchMyChatRooms(accountId: string): Promise<any> {
  const response = await apiRequest<{success: boolean; message: string; data: any}>(
    `/workspaces/chat-rooms/accounts/${accountId}`
  );
  if (response.success && response.data) return response.data;
  throw new Error(response.message || '내 채팅방 목록 조회 실패');
}

// TODO: WebSocket 연동 함수는 별도 구현 필요 (실시간 채팅)
