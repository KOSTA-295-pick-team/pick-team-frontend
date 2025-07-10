import { io, Socket } from 'socket.io-client';
import type { ChatMessage } from '../types';
import { store } from '../store';
import { addMessage } from '../store/slices/chatSlice';

class ChatSocketService {
  private socket: Socket | null = null;
  private workspaceId: string | null = null;

  // 소켓 연결
  connect(workspaceId: string, token: string) {
    if (this.socket?.connected && this.workspaceId === workspaceId) {
      return;
    }

    this.workspaceId = workspaceId;
    this.socket = io(process.env.REACT_APP_WS_URL || 'ws://localhost:8080', {
      path: '/ws/chat',
      auth: { token },
      query: { workspaceId },
    });

    this.setupEventListeners();
  }

  // 이벤트 리스너 설정
  private setupEventListeners() {
    if (!this.socket) return;

    // 채팅 메시지 수신
    this.socket.on('chat.message', (message: ChatMessage) => {
      store.dispatch(addMessage({
        roomId: message.roomId,
        message,
      }));
    });

    // 에러 처리
    this.socket.on('error', (error: any) => {
      console.error('WebSocket 에러:', error);
    });

    // 연결 해제 처리
    this.socket.on('disconnect', () => {
      console.log('WebSocket 연결이 끊어졌습니다.');
    });

    // 재연결 시도
    this.socket.on('reconnect_attempt', (attempt: number) => {
      console.log(`WebSocket 재연결 시도 ${attempt}번째...`);
    });
  }

  // 채팅방 구독
  joinRoom(roomId: string) {
    this.socket?.emit('chat.join', { roomId });
  }

  // 채팅방 구독 해제
  leaveRoom(roomId: string) {
    this.socket?.emit('chat.leave', { roomId });
  }

  // 메시지 전송
  sendMessage(roomId: string, text: string, file?: File) {
    const data = { roomId, text };
    if (file) {
      // TODO: 파일 전송 구현 (Socket.IO에서는 일반적으로 REST API로 먼저 업로드 후 URL을 전송)
      console.warn('파일 전송은 아직 구현되지 않았습니다.');
    }
    this.socket?.emit('chat.message', data);
  }

  // 연결 해제
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.workspaceId = null;
    }
  }
}

// 싱글톤 인스턴스 생성 및 export
export const chatSocket = new ChatSocketService();
