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
    createdAt?: string;  // 기존 호환성
    sentAt?: string;     // 백엔드에서 실제 사용
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
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10; // 재연결 시도 횟수 증가
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private connectionHealthCheck: NodeJS.Timeout | null = null;
  private lastMessageTime = Date.now();
  private maxIdleTime = 60000; // 60초 무응답 시 재연결
  
  // 메시지 큐 관리
  private messageQueue: Array<{ eventType: string; data: any; timestamp: number }> = [];
  private isProcessingQueue = false;
  private maxQueueSize = 1000; // 최대 큐 크기
  private batchSize = 10; // 한 번에 처리할 메시지 수
  private processingDelay = 10; // 배치 처리 간격 (ms)

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
        console.log('✅ SSE 연결 성공');
        this.isConnected = true;
        this.reconnectAttempts = 0; // 성공시 재연결 시도 횟수 리셋
        this.lastMessageTime = Date.now(); // 마지막 메시지 시간 업데이트
        this.startHeartbeat();
        this.startConnectionHealthCheck();
      };

      this.eventSource.onerror = (error) => {
        console.error('❌ SSE 연결 오류:', error);
        console.log('SSE 연결 상태:', this.eventSource?.readyState);
        this.isConnected = false;
        this.stopHeartbeat();
        this.stopConnectionHealthCheck();
        
        // 연결이 끊어진 경우에만 재연결 시도
        if (this.eventSource?.readyState === EventSource.CLOSED) {
          console.log('🔄 연결이 완전히 끊어짐, 재연결 스케줄');
          this.scheduleReconnect();
        } else if (this.eventSource?.readyState === EventSource.CONNECTING) {
          console.log('⚠️ 연결 시도 중...');
        }
      };

      this.eventSource.onmessage = (event) => {
        try {
          this.lastMessageTime = Date.now(); // 메시지 수신 시간 업데이트
          const data = JSON.parse(event.data);
          console.log('📨 SSE 메시지 수신:', data);
          this.handleSseEvent(data);
        } catch (error) {
          console.error('SSE 메시지 파싱 오류:', error);
        }
      };

      // 특정 이벤트 타입별 리스너 등록
      this.setupEventListeners();

    } catch (error) {
      console.error('SSE 연결 실패:', error);
      this.scheduleReconnect();
      throw error;
    }
  }

  // 특정 이벤트 타입별 리스너 설정
  private setupEventListeners(): void {
    if (!this.eventSource) return;

    // 새 채팅 메시지
    this.eventSource.addEventListener('NEW_CHAT_MESSAGE', (event) => {
      try {
        const data = JSON.parse(event.data);
        this.enqueueMessage('NEW_CHAT_MESSAGE', data);
      } catch (error) {
        console.error('NEW_CHAT_MESSAGE 파싱 오류:', error);
      }
    });

    // 채팅방 멤버 입장
    this.eventSource.addEventListener('CHAT_MEMBER_JOINED', (event) => {
      try {
        const data = JSON.parse(event.data);
        this.enqueueMessage('CHAT_MEMBER_JOINED', data);
      } catch (error) {
        console.error('CHAT_MEMBER_JOINED 파싱 오류:', error);
      }
    });

    // 채팅방 멤버 퇴장
    this.eventSource.addEventListener('CHAT_MEMBER_LEFT', (event) => {
      try {
        const data = JSON.parse(event.data);
        this.enqueueMessage('CHAT_MEMBER_LEFT', data);
      } catch (error) {
        console.error('CHAT_MEMBER_LEFT 파싱 오류:', error);
      }
    });

    // 채팅 메시지 삭제
    this.eventSource.addEventListener('CHAT_MESSAGE_DELETED', (event) => {
      try {
        const data = JSON.parse(event.data);
        this.enqueueMessage('CHAT_MESSAGE_DELETED', data);
      } catch (error) {
        console.error('CHAT_MESSAGE_DELETED 파싱 오류:', error);
      }
    });
  }

  // SSE 이벤트 처리 (큐 기반)
  private handleSseEvent(data: any): void {
    console.log('📨 SSE 이벤트 수신:', data);
    
    if (data.type) {
      // 메시지를 큐에 추가
      this.enqueueMessage(data.type, data.data || data);
    }
  }

  // 메시지를 큐에 추가
  private enqueueMessage(eventType: string, data: any): void {
    const message = {
      eventType,
      data,
      timestamp: Date.now()
    };

    // 큐 크기 제한
    if (this.messageQueue.length >= this.maxQueueSize) {
      console.warn(`⚠️ 메시지 큐가 가득참 (${this.maxQueueSize}), 오래된 메시지 제거`);
      this.messageQueue.shift(); // 가장 오래된 메시지 제거
    }

    this.messageQueue.push(message);
    console.log(`📥 메시지 큐에 추가: ${eventType}, 큐 크기: ${this.messageQueue.length}`);

    // 큐 처리 시작
    this.processMessageQueue();
  }

  // 메시지 큐 배치 처리
  private async processMessageQueue(): Promise<void> {
    if (this.isProcessingQueue) {
      return; // 이미 처리 중
    }

    this.isProcessingQueue = true;

    while (this.messageQueue.length > 0) {
      const batch = this.messageQueue.splice(0, this.batchSize);
      console.log(`🔄 배치 처리 시작: ${batch.length}개 메시지`);

      // 배치 내 메시지들을 병렬 처리
      const promises = batch.map(async (message) => {
        try {
          await this.notifyListeners(message.eventType, message.data);
        } catch (error) {
          console.error(`❌ 메시지 처리 오류 (${message.eventType}):`, error);
        }
      });

      await Promise.all(promises);

      // 다음 배치 처리 전 잠시 대기 (UI 블로킹 방지)
      if (this.messageQueue.length > 0) {
        await new Promise(resolve => setTimeout(resolve, this.processingDelay));
      }
    }

    this.isProcessingQueue = false;
    console.log('✅ 메시지 큐 처리 완료');
  }

  // 리스너들에게 이벤트 알림 (비동기 처리)
  private async notifyListeners(eventType: string, data: any): Promise<void> {
    const listeners = this.listeners.get(eventType);
    if (!listeners || listeners.size === 0) {
      return;
    }

    // 모든 리스너를 비동기로 병렬 실행
    const promises = Array.from(listeners).map(async (listener) => {
      try {
        // requestAnimationFrame을 사용해 메인 스레드 블로킹 방지
        return new Promise<void>((resolve) => {
          requestAnimationFrame(() => {
            try {
              listener(data);
              resolve();
            } catch (error) {
              console.error(`이벤트 리스너 실행 오류 (${eventType}):`, error);
              resolve();
            }
          });
        });
      } catch (error) {
        console.error(`이벤트 리스너 실행 오류 (${eventType}):`, error);
      }
    });

    await Promise.all(promises);
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

  // 하트비트 시작 (연결 상태 모니터링)
  private startHeartbeat(): void {
    this.stopHeartbeat(); // 기존 하트비트 중지
    
    this.heartbeatInterval = setInterval(() => {
      if (!this.isEventSourceConnected()) {
        console.log('💔 SSE 연결 끊어짐 감지, 재연결 시도');
        this.scheduleReconnect();
      }
    }, 15000); // 15초마다 연결 상태 체크 (더 빈번하게)
  }

  // 하트비트 중지
  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  // 연결 건강성 체크 시작
  private startConnectionHealthCheck(): void {
    this.stopConnectionHealthCheck(); // 기존 체크 중지
    
    this.connectionHealthCheck = setInterval(() => {
      const timeSinceLastMessage = Date.now() - this.lastMessageTime;
      
      // 60초 이상 메시지가 없으면 연결 상태 의심
      if (timeSinceLastMessage > this.maxIdleTime) {
        console.log(`⚠️ ${Math.round(timeSinceLastMessage/1000)}초간 메시지 없음, 연결 품질 체크`);
        
        // EventSource 상태를 다시 확인
        if (this.eventSource?.readyState !== EventSource.OPEN) {
          console.log('💔 EventSource 상태 이상 감지, 재연결 시도');
          this.scheduleReconnect();
        } else {
          // 연결은 살아있지만 메시지가 오지 않는 경우
          console.log('🔄 연결은 살아있지만 비정상적으로 조용함, 예방적 재연결');
          this.scheduleReconnect();
        }
      }
    }, 30000); // 30초마다 건강성 체크
  }

  // 연결 건강성 체크 중지
  private stopConnectionHealthCheck(): void {
    if (this.connectionHealthCheck) {
      clearInterval(this.connectionHealthCheck);
      this.connectionHealthCheck = null;
    }
  }

  // 재연결 스케줄링
  private scheduleReconnect(): void {
    if (this.reconnectTimeout) {
      console.log('⚠️ 재연결이 이미 스케줄되어 있음');
      return; // 이미 재연결이 스케줄되어 있음
    }

    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error(`🚫 최대 재연결 시도 횟수 초과 (${this.maxReconnectAttempts}회), 재연결 포기`);
      return;
    }

    this.reconnectAttempts++;
    // 더 빠른 재연결을 위해 지연 시간 단축
    const delay = Math.min(500 * Math.pow(1.5, this.reconnectAttempts), 10000); // 최대 10초
    
    console.log(`🔄 SSE 재연결 스케줄 (${this.reconnectAttempts}/${this.maxReconnectAttempts}) - ${delay}ms 후`);
    
    this.reconnectTimeout = setTimeout(() => {
      this.reconnectTimeout = null;
      this.reconnect().catch(error => {
        console.error('SSE 재연결 실패:', error);
        // 재연결 실패 시 다시 스케줄
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
          setTimeout(() => this.scheduleReconnect(), 1000);
        }
      });
    }, delay);
  }

  // 재연결
  private async reconnect(): Promise<void> {
    console.log('🔄 SSE 재연결 시도 시작...');
    
    // 기존 연결 정리
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
      this.isConnected = false;
    }
    
    this.stopHeartbeat();

    try {
      await this.connect();
      console.log('✅ SSE 재연결 성공');
    } catch (error) {
      console.error('❌ SSE 재연결 실패:', error);
      this.scheduleReconnect();
    }
  }

  // 연결 종료
  disconnect(): void {
    console.log('🔌 SSE 연결 종료 시작');
    
    // 재연결 타임아웃 취소
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    
    // 하트비트 중지
    this.stopHeartbeat();
    
    // 연결 건강성 체크 중지
    this.stopConnectionHealthCheck();
    
    // EventSource 연결 종료
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
    
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.lastMessageTime = Date.now();
    this.listeners.clear();
    
    // 메시지 큐 정리
    this.messageQueue = [];
    this.isProcessingQueue = false;
    
    console.log('✅ SSE 연결 종료 완료');
  }
}

// 싱글톤 인스턴스
export const sseService = new SseService();
