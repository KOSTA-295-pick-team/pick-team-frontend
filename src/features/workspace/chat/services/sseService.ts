import { apiRequest } from '@/lib/apiClient';

export interface SseEvent {
  type: string;
  data: any;
  timestamp: string;
}

export interface ChatSseEvents {
  NEW_CHAT_MESSAGE: {
    chatRoomId: number;
    messageId: number;
    senderId: number;
    senderName: string;
    content: string;
    createdAt: string;
  };
  CHAT_MEMBER_JOINED: {
    chatRoomId: number;
    joinedMemberId: number;
    joinedMemberName: string;
    timestamp: string;
  };
  CHAT_MEMBER_LEFT: {
    chatRoomId: number;
    leftMemberId: number;
    leftMemberName: string;
    timestamp: string;
  };
  CHAT_MESSAGE_DELETED: {
    chatRoomId: number;
    messageId: number;
  };
}

export type ChatSseEventType = keyof ChatSseEvents;

class SseService {
  private eventSource: EventSource | null = null;
  private listeners: Map<string, Set<(data: any) => void>> = new Map();
  private isConnected = false;

  // SSE 연결 등록 (Step 1)
  async register(): Promise<void> {
    try {
      await apiRequest('/sse/register', { method: 'POST' });
      console.log('SSE 등록 완료');
    } catch (error) {
      console.error('SSE 등록 실패:', error);
      throw error;
    }
  }

  // SSE 연결 시작 (Step 2)
  async connect(): Promise<void> {
    if (this.isConnected || this.eventSource) {
      console.log('이미 SSE에 연결되어 있습니다.');
      return;
    }

    try {
      // 먼저 등록
      await this.register();

      // SSE 연결
      this.eventSource = new EventSource('/api/sse/subscribe');

      this.eventSource.onopen = () => {
        console.log('SSE 연결 성공');
        this.isConnected = true;
      };

      this.eventSource.onerror = (error) => {
        console.error('SSE 연결 오류:', error);
        this.isConnected = false;
        this.reconnect();
      };

      this.eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleSseEvent(data);
        } catch (error) {
          console.error('SSE 메시지 파싱 오류:', error);
        }
      };

      // 특정 이벤트 타입별 리스너 등록
      this.setupEventListeners();

    } catch (error) {
      console.error('SSE 연결 실패:', error);
      throw error;
    }
  }

  // 특정 이벤트 타입별 리스너 설정
  private setupEventListeners(): void {
    if (!this.eventSource) return;

    // 새 채팅 메시지
    this.eventSource.addEventListener('NEW_CHAT_MESSAGE', (event) => {
      const data = JSON.parse(event.data);
      this.notifyListeners('NEW_CHAT_MESSAGE', data);
    });

    // 채팅방 멤버 입장
    this.eventSource.addEventListener('CHAT_MEMBER_JOINED', (event) => {
      const data = JSON.parse(event.data);
      this.notifyListeners('CHAT_MEMBER_JOINED', data);
    });

    // 채팅방 멤버 퇴장
    this.eventSource.addEventListener('CHAT_MEMBER_LEFT', (event) => {
      const data = JSON.parse(event.data);
      this.notifyListeners('CHAT_MEMBER_LEFT', data);
    });

    // 채팅 메시지 삭제
    this.eventSource.addEventListener('CHAT_MESSAGE_DELETED', (event) => {
      const data = JSON.parse(event.data);
      this.notifyListeners('CHAT_MESSAGE_DELETED', data);
    });
  }

  // SSE 이벤트 처리
  private handleSseEvent(data: any): void {
    console.log('SSE 이벤트 수신:', data);
    
    if (data.type) {
      this.notifyListeners(data.type, data.data || data);
    }
  }

  // 리스너들에게 이벤트 알림
  private notifyListeners(eventType: string, data: any): void {
    const listeners = this.listeners.get(eventType);
    if (listeners) {
      listeners.forEach(listener => {
        try {
          listener(data);
        } catch (error) {
          console.error(`이벤트 리스너 실행 오류 (${eventType}):`, error);
        }
      });
    }
  }

  // 이벤트 리스너 등록
  addEventListener<T extends ChatSseEventType>(
    eventType: T,
    listener: (data: ChatSseEvents[T]) => void
  ): void {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }
    this.listeners.get(eventType)!.add(listener);
  }

  // 이벤트 리스너 제거
  removeEventListener<T extends ChatSseEventType>(
    eventType: T,
    listener: (data: ChatSseEvents[T]) => void
  ): void {
    const listeners = this.listeners.get(eventType);
    if (listeners) {
      listeners.delete(listener);
      if (listeners.size === 0) {
        this.listeners.delete(eventType);
      }
    }
  }

  // 연결 상태 확인
  isEventSourceConnected(): boolean {
    return this.isConnected && this.eventSource?.readyState === EventSource.OPEN;
  }

  // 재연결
  private async reconnect(): Promise<void> {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
      this.isConnected = false;
    }

    // 3초 후 재연결 시도
    setTimeout(() => {
      console.log('SSE 재연결 시도...');
      this.connect().catch(error => {
        console.error('SSE 재연결 실패:', error);
      });
    }, 3000);
  }

  // 연결 종료
  disconnect(): void {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
      this.isConnected = false;
    }
    this.listeners.clear();
    console.log('SSE 연결 종료');
  }
}

// 싱글톤 인스턴스
export const sseService = new SseService();
