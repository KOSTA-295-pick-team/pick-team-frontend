// chatApi.ts
// 채팅 관련 API 요청 함수 모음
// 최신 보안 모범 사례와 예외 처리를 포함합니다.
// 작성자: Copilot

import axios from 'axios';
import type { ChatRoom, ChatMessage, User } from '../types';

// 백엔드 ChatRoomController 엔드포인트 기준
// API 기본 URL은 /api/workspaces/{workspaceId}/chat-rooms

/**
 * 워크스페이스 내 채팅방 목록 조회 (페이징)
 */
export async function fetchChatRooms(workspaceId: string, page = 0, size = 20): Promise<any> {
  try {
    const res = await axios.get(`/api/workspaces/${workspaceId}/chat-rooms`, {
      params: { page, size },
      withCredentials: true,
    });
    return res.data;
  } catch (error) {
    console.error('채팅방 목록 조회 실패:', error);
    throw error;
  }
}

/**
 * 채팅방 생성 (그룹)
 */
export async function createChatRoom(workspaceId: string, name: string, memberIds: string[]): Promise<any> {
  try {
    const res = await axios.post(
      `/api/workspaces/${workspaceId}/chat-rooms/create`,
      { name, memberIds },
      { withCredentials: true }
    );
    return res.data;
  } catch (error) {
    console.error('채팅방 생성 실패:', error);
    throw error;
  }
}

/**
 * DM 채팅방 생성
 */
export async function createDmChatRoom(workspaceId: string, memberIds: string[]): Promise<any> {
  try {
    const res = await axios.post(
      `/api/workspaces/${workspaceId}/chat-rooms/create-dm`,
      { memberIds },
      { withCredentials: true }
    );
    return res.data;
  } catch (error) {
    console.error('DM 채팅방 생성 실패:', error);
    throw error;
  }
}

/**
 * 채팅방 제목 변경
 */
export async function updateChatRoomTitle(workspaceId: string, chatRoomId: string, title: string): Promise<any> {
  try {
    const res = await axios.patch(
      `/api/workspaces/${workspaceId}/chat-rooms/${chatRoomId}/updateTitle`,
      { title },
      { withCredentials: true }
    );
    return res.data;
  } catch (error) {
    console.error('채팅방 제목 변경 실패:', error);
    throw error;
  }
}

/**
 * 채팅방 메시지 목록 조회 (페이징)
 */
export async function fetchChatMessages(workspaceId: string, chatRoomId: string, page = 0, size = 20): Promise<any> {
  try {
    const res = await axios.get(
      `/api/workspaces/${workspaceId}/chat-rooms/${chatRoomId}/messages`,
      { params: { page, size }, withCredentials: true }
    );
    return res.data;
  } catch (error) {
    console.error('채팅 메시지 조회 실패:', error);
    throw error;
  }
}

/**
 * 채팅 메시지 전송
 */
export async function sendChatMessage(workspaceId: string, chatRoomId: string, text: string, file?: File): Promise<any> {
  try {
    const data = file ? (() => { const f = new FormData(); f.append('text', text); f.append('file', file); return f; })() : { text };
    const config = file ? { headers: { 'Content-Type': 'multipart/form-data' }, withCredentials: true } : { withCredentials: true };
    const res = await axios.post(
      `/api/workspaces/${workspaceId}/chat-rooms/${chatRoomId}/messages`,
      data,
      config
    );
    return res.data;
  } catch (error) {
    console.error('채팅 메시지 전송 실패:', error);
    throw error;
  }
}

/**
 * 채팅 메시지 삭제 (soft delete)
 */
export async function deleteChatMessage(workspaceId: string, chatRoomId: string, messageId: string): Promise<void> {
  try {
    await axios.patch(
      `/api/workspaces/${workspaceId}/chat-rooms/${chatRoomId}/messages/${messageId}/delete`,
      {},
      { withCredentials: true }
    );
  } catch (error) {
    console.error('채팅 메시지 삭제 실패:', error);
    throw error;
  }
}

/**
 * 채팅방 입장
 */
export async function joinChatRoom(workspaceId: string, chatRoomId: string): Promise<any> {
  try {
    const res = await axios.post(
      `/api/workspaces/${workspaceId}/chat-rooms/${chatRoomId}/join`,
      {},
      { withCredentials: true }
    );
    return res.data;
  } catch (error) {
    console.error('채팅방 입장 실패:', error);
    throw error;
  }
}

/**
 * 채팅방 퇴장
 */
export async function leaveChatRoom(workspaceId: string, chatRoomId: string): Promise<any> {
  try {
    const res = await axios.patch(
      `/api/workspaces/${workspaceId}/chat-rooms/${chatRoomId}/leave`,
      {},
      { withCredentials: true }
    );
    return res.data;
  } catch (error) {
    console.error('채팅방 퇴장 실패:', error);
    throw error;
  }
}

/**
 * 마지막 읽은 메시지 갱신
 */
export async function updateLastReadMessage(workspaceId: string, chatRoomId: string, messageId: string): Promise<any> {
  try {
    const res = await axios.patch(
      `/api/workspaces/${workspaceId}/chat-rooms/${chatRoomId}/last-read-refresh`,
      {},
      { params: { messageId }, withCredentials: true }
    );
    return res.data;
  } catch (error) {
    console.error('마지막 읽은 메시지 갱신 실패:', error);
    throw error;
  }
}

/**
 * 채팅방 멤버 목록 조회
 */
export async function fetchChatRoomMembers(workspaceId: string, chatRoomId: string): Promise<any> {
  try {
    const res = await axios.get(
      `/api/workspaces/${workspaceId}/chat-rooms/${chatRoomId}/members`,
      { withCredentials: true }
    );
    return res.data;
  } catch (error) {
    console.error('채팅방 멤버 조회 실패:', error);
    throw error;
  }
}

/**
 * 내가 참여한 채팅방 목록 조회
 */
export async function fetchMyChatRooms(accountId: string): Promise<any> {
  try {
    const res = await axios.get(`/api/workspaces/-/chat-rooms/accounts/${accountId}`, {
      withCredentials: true,
    });
    return res.data;
  } catch (error) {
    console.error('내 채팅방 목록 조회 실패:', error);
    throw error;
  }
}

// TODO: WebSocket 연동 함수는 별도 구현 필요 (실시간 채팅)
