import { apiRequest } from '@/lib/apiClient';
import { chatLogger } from '../utils/chatLogger';

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
  
  // 메시지 큐 관리
  private messageQueue: Array<{ eventType: string; data: any; timestamp: number }> = [];
  private isProcessingQueue = false;
  private maxQueueSize = 1000; // 최대 큐 크기
  private batchSize = 5; // 한 번에 처리할 메시지 수 (더 작게)
  private processingDelay = 5; // 배치 처리 간격 (ms) - 더 빠르게

  // SSE 연결 등록 (Step 1)
  async register(): Promise<void> {
    try {
      chatLogger.sse.info('SSE 등록 시작');
      
      const response = await apiRequest('/sse/register', { method: 'POST' });
      
      chatLogger.sse.info('SSE 등록 완료', { response });
      
      // 백엔드 등록 처리 대기 (Redis 저장 완료 대기)
      await new Promise(resolve => setTimeout(resolve, 200));
    } catch (error) {
      chatLogger.sse.error('SSE 등록 실패', { error });
      throw error;
    }
  }

  // SSE 연결 시작 (Step 2)
  async connect(): Promise<void> {
    // 기존 연결이 있고 실제로 연결된 상태인 경우에만 반환
    if (this.isConnected && this.eventSource?.readyState === EventSource.OPEN) {
      chatLogger.sse.warn('이미 SSE에 연결되어 있습니다', {
        isConnected: this.isConnected,
        readyState: this.eventSource?.readyState,
        readyStateText: this.getReadyStateText()
      });
      return;
    }

    // 기존 연결 정리 (상태가 불일치하거나 끊어진 경우)
    if (this.eventSource) {
      chatLogger.sse.debug('기존 SSE 연결 정리', {
        readyState: this.eventSource.readyState,
        readyStateText: this.getReadyStateText()
      });
      this.eventSource.close();
      this.eventSource = null;
      this.isConnected = false;
    }

    try {
      // 매 연결 시도마다 새로 등록 (동시성 문제 해결)
      chatLogger.sse.info('SSE 재등록 수행 중...');
      await this.register();

      // SSE 연결 with timeout 옵션
      // 504 에러 대응을 위해 더 짧은 타임아웃으로 빠른 재연결
      const API_BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:8081/api';
      const sseUrl = `${API_BASE_URL}/sse/subscribe`;
      chatLogger.sse.info('SSE 연결 시도', { url: sseUrl });

      this.eventSource = new EventSource(sseUrl);
      chatLogger.sse.debug('EventSource 생성됨', {
        readyState: this.eventSource.readyState,
        readyStateText: this.getReadyStateText(),
        url: this.eventSource.url,
        withCredentials: this.eventSource.withCredentials
      });

      // 백엔드 30분, nginx 10분에 맞춰 연결 타임아웃 설정 (5분으로 조정)
      const connectionTimeout = setTimeout(() => {
        if (this.eventSource && this.eventSource.readyState === EventSource.CONNECTING) {
          chatLogger.sse.warn('SSE 연결 타임아웃 (5분), 재시도', {
            readyState: this.eventSource.readyState,
            readyStateText: this.getReadyStateText(),
            url: this.eventSource.url,
            withCredentials: this.eventSource.withCredentials,
            timestamp: new Date().toISOString()
          });
          this.eventSource.close();
          this.scheduleReconnect();
        }
      }, 300000); // 5분 = 300,000ms

      this.eventSource.onopen = () => {
        chatLogger.sse.info('SSE 연결 성공!', {
          readyState: this.eventSource?.readyState,
          readyStateText: this.getReadyStateText(),
          url: this.eventSource?.url
        });
        clearTimeout(connectionTimeout); // 타임아웃 해제
        this.isConnected = true;
        this.reconnectAttempts = 0; // 성공시 재연결 시도 횟수 리셋
        this.lastMessageTime = Date.now(); // 마지막 메시지 시간 업데이트
        this.startHeartbeat();
        this.startConnectionHealthCheck();
      };

      this.eventSource.onerror = (error) => {
        chatLogger.sse.error('SSE 연결 오류', {
          error: error,
          readyState: this.eventSource?.readyState,
          readyStateText: this.getReadyStateText(),
          url: this.eventSource?.url,
          isConnected: this.isConnected,
          message: (error as any).message || 'No error message'
        });
        
        clearTimeout(connectionTimeout); // 타임아웃 해제
        this.isConnected = false;
        this.stopHeartbeat();
        this.stopConnectionHealthCheck();
        
        // EventSource 상태별 처리
        if (this.eventSource?.readyState === EventSource.CLOSED) {
          chatLogger.sse.info('SSE 연결이 완전히 닫힘, 재연결 시도');
          this.scheduleReconnect();
        } else if (this.eventSource?.readyState === EventSource.CONNECTING) {
          chatLogger.sse.info('SSE 연결 시도 중 오류, 잠시 대기 후 재연결');
          // CONNECTING 상태에서 오류가 발생하면 재등록 후 재연결
          setTimeout(() => {
            if (this.eventSource?.readyState !== EventSource.OPEN) {
              chatLogger.sse.info('연결 실패 확인, 재등록 후 재연결 시도');
              this.scheduleReconnect();
            }
          }, 2000);
        } else {
          chatLogger.sse.info('SSE 기타 오류, 즉시 재연결');
          this.scheduleReconnect();
        }
      };

      this.eventSource.onmessage = (event) => {
        try {
          this.lastMessageTime = Date.now(); // 메시지 수신 시간 업데이트
          const data = JSON.parse(event.data);
          chatLogger.sse.debug('SSE 메시지 수신', { 
            data: data,
            origin: event.origin,
            lastEventId: event.lastEventId
          });
          this.handleSseEvent(data);
        } catch (error) {
          chatLogger.sse.error('SSE 메시지 파싱 오류', {
            error: error,
            rawData: event.data
          });
        }
      };

      // 특정 이벤트 타입별 리스너 등록
      this.setupEventListeners();

    } catch (error) {
      chatLogger.sse.error('SSE 연결 실패', error);
      this.scheduleReconnect();
      throw error;
    }
  }

  // ReadyState 텍스트 변환 헬퍼
  private getReadyStateText(): string {
    if (!this.eventSource) return 'NO_EVENT_SOURCE';
    
    switch (this.eventSource.readyState) {
      case EventSource.CONNECTING: return 'CONNECTING (0)';
      case EventSource.OPEN: return 'OPEN (1)';
      case EventSource.CLOSED: return 'CLOSED (2)';
      default: return `UNKNOWN (${this.eventSource.readyState})`;
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
        chatLogger.sse.error('NEW_CHAT_MESSAGE 파싱 오류', error);
      }
    });

    // 채팅방 멤버 입장
    this.eventSource.addEventListener('CHAT_MEMBER_JOINED', (event) => {
      try {
        const data = JSON.parse(event.data);
        this.enqueueMessage('CHAT_MEMBER_JOINED', data);
      } catch (error) {
        chatLogger.sse.error('CHAT_MEMBER_JOINED 파싱 오류', error);
      }
    });

    // 채팅방 멤버 퇴장
    this.eventSource.addEventListener('CHAT_MEMBER_LEFT', (event) => {
      try {
        const data = JSON.parse(event.data);
        this.enqueueMessage('CHAT_MEMBER_LEFT', data);
      } catch (error) {
        chatLogger.sse.error('CHAT_MEMBER_LEFT 파싱 오류', error);
      }
    });

    // 채팅 메시지 삭제
    this.eventSource.addEventListener('CHAT_MESSAGE_DELETED', (event) => {
      try {
        const data = JSON.parse(event.data);
        this.enqueueMessage('CHAT_MESSAGE_DELETED', data);
      } catch (error) {
        chatLogger.sse.error('CHAT_MESSAGE_DELETED 파싱 오류', error);
      }
    });
  }

  // SSE 이벤트 처리 (큐 기반)
  private handleSseEvent(data: any): void {
    chatLogger.sse.debug('SSE 이벤트 수신', data);
    
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
      chatLogger.sse.warn(`메시지 큐가 가득참 (${this.maxQueueSize}), 오래된 메시지 제거`);
      this.messageQueue.shift(); // 가장 오래된 메시지 제거
    }

    this.messageQueue.push(message);
    chatLogger.sse.debug(`메시지 큐에 추가: ${eventType}, 큐 크기: ${this.messageQueue.length}`);

    // 큐 처리 시작
    this.processMessageQueue();
  }

  // 메시지 큐 배치 처리
  private async processMessageQueue(): Promise<void> {
    if (this.isProcessingQueue) {
      return; // 이미 처리 중
    }

    this.isProcessingQueue = true;

    try {
      while (this.messageQueue.length > 0) {
        const batch = this.messageQueue.splice(0, this.batchSize);
        chatLogger.sse.debug(`배치 처리 시작: ${batch.length}개 메시지`);

        // 배치 내 메시지들을 순차 처리로 변경 (안정성 향상)
        for (const message of batch) {
          try {
            await this.notifyListeners(message.eventType, message.data);
          } catch (error) {
            chatLogger.sse.error(`메시지 처리 오류 (${message.eventType})`, error);
          }
        }

        // 다음 배치 처리 전 잠시 대기 (UI 블로킹 방지)
        if (this.messageQueue.length > 0) {
          await new Promise(resolve => setTimeout(resolve, this.processingDelay));
        }
      }
    } catch (error) {
      chatLogger.sse.error('메시지 큐 처리 중 오류', error);
    } finally {
      this.isProcessingQueue = false;
      chatLogger.sse.debug('메시지 큐 처리 완료');
    }
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

  // 연결 상태 확인 (더 관대한 다중 연결 환경 고려)
  isEventSourceConnected(): boolean {
    const connected = this.isConnected && this.eventSource?.readyState === EventSource.OPEN;
    
    // 연결 상태 불일치 감지 (다중 연결 환경에서 더 신중하게)
    if (this.isConnected && this.eventSource?.readyState !== EventSource.OPEN) {
      chatLogger.sse.warn('연결 상태 불일치 감지 (다중 연결 환경)', {
        isConnected: this.isConnected,
        readyState: this.eventSource?.readyState,
        readyStateText: this.getReadyStateText(),
        shouldReconnect: true,
        info: '백엔드 다중 세션 지원으로 더 안정적'
      });
      
      // 상태 동기화 (다중 연결에서는 덜 공격적으로)
      this.isConnected = false;
      return false;
    }
    
    return connected;
  }

  // 연결 상태 진단
  getConnectionStatus(): any {
    return {
      isConnected: this.isConnected,
      hasEventSource: !!this.eventSource,
      readyState: this.eventSource?.readyState,
      readyStateText: this.getReadyStateText(),
      url: this.eventSource?.url,
      lastMessageTime: new Date(this.lastMessageTime).toISOString(),
      timeSinceLastMessage: Date.now() - this.lastMessageTime,
      reconnectAttempts: this.reconnectAttempts,
      isReconnectScheduled: !!this.reconnectTimeout
    };
  }

  // 하트비트 시작 (다중 연결 환경 최적화)
  private startHeartbeat(): void {
    this.stopHeartbeat(); // 기존 하트비트 중지
    
    this.heartbeatInterval = setInterval(() => {
      const status = this.getConnectionStatus();
      chatLogger.sse.debug('하트비트 체크 (다중세션 지원)', status);
      
      if (!this.isEventSourceConnected()) {
        chatLogger.sse.info('SSE 연결 끊어짐 감지, 재연결 시도');
        this.scheduleReconnect();
      }
    }, 8000); // 다중 연결에서는 더 여유롭게 8초마다 체크
  }

  // 하트비트 중지
  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
      chatLogger.sse.debug('하트비트 중지됨');
    }
  }

  // 연결 건강성 체크 시작 (다중 연결 환경 최적화)
  private startConnectionHealthCheck(): void {
    this.stopConnectionHealthCheck(); // 기존 체크 중지
    
    this.connectionHealthCheck = setInterval(() => {
      const timeSinceLastMessage = Date.now() - this.lastMessageTime;
      const status = this.getConnectionStatus();
      
      console.log('🔍 연결 건강성 체크 (다중세션):', {
        ...status,
        timeSinceLastMessage: Math.round(timeSinceLastMessage / 1000) + 's',
        multiSessionSupport: true
      });
      
      // 다중 연결 환경에서는 더 관대한 타임아웃 (30초)
      if (timeSinceLastMessage > 30000) {
        console.log(`⚠️ ${Math.round(timeSinceLastMessage/1000)}초간 메시지 없음, 연결 품질 체크 (백엔드 다중세션 지원)`);
        
        // EventSource 상태를 다시 확인
        if (this.eventSource?.readyState !== EventSource.OPEN) {
          console.log('💔 EventSource 상태 이상 감지, 재연결 시도');
          this.scheduleReconnect();
        } else {
          // 45초가 넘으면 예방적 재연결 (다중 연결에서는 더 여유롭게)
          if (timeSinceLastMessage > 45000) {
            console.log('🔄 45초 이상 무응답, 예방적 재연결 (다중세션 환경)');
            this.scheduleReconnect();
          }
        }
      }
    }, 6000); // 6초마다 건강성 체크 (다중 연결에서도 적당한 주기)
  }

  // 연결 건강성 체크 중지
  private stopConnectionHealthCheck(): void {
    if (this.connectionHealthCheck) {
      clearInterval(this.connectionHealthCheck);
      this.connectionHealthCheck = null;
      console.log('🔍 연결 건강성 체크 중지됨');
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
    
    // 더 보수적인 재연결 전략으로 변경
    let delay;
    if (this.reconnectAttempts <= 3) {
      // 처음 3번은 빠르게 재시도 (1초, 2초, 3초)
      delay = 1000 * this.reconnectAttempts;
    } else if (this.reconnectAttempts <= 6) {
      // 4-6번째는 중간 간격 (5초, 7초, 9초)
      delay = 3000 + (this.reconnectAttempts - 3) * 2000;
    } else {
      // 그 이후는 긴 간격 (최대 15초)
      delay = Math.min(10000 + (this.reconnectAttempts - 6) * 2500, 15000);
    }
    
    console.log(`🔄 SSE 재연결 스케줄 (${this.reconnectAttempts}/${this.maxReconnectAttempts}) - ${delay}ms 후`);
    
    this.reconnectTimeout = setTimeout(() => {
      this.reconnectTimeout = null;
      this.reconnect().catch(error => {
        console.error('SSE 재연결 실패:', error);
        // 재연결 실패 시 다시 스케줄
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
          setTimeout(() => this.scheduleReconnect(), 2000); // 2초 후 다시 시도
        }
      });
    }, delay);
  }

  // 재연결
  private async reconnect(): Promise<void> {
    console.log('🔄 SSE 재연결 시도 시작...');
    
    // 기존 연결 완전 정리
    if (this.eventSource) {
      console.log('🧹 기존 EventSource 정리');
      this.eventSource.close();
      this.eventSource = null;
    }
    
    this.isConnected = false;
    this.stopHeartbeat();
    this.stopConnectionHealthCheck();

    // 잠시 대기 후 재연결 (네트워크 안정화)
    await new Promise(resolve => setTimeout(resolve, 500));

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

  // SSE 연결 상태 강제 체크 및 복구
  forceConnectionCheck(): void {
    console.log('🔍 SSE 연결 상태 강제 체크 시작...');
    
    const status = this.getConnectionStatus();
    console.log('📊 현재 SSE 상태:', status);
    
    if (!this.isEventSourceConnected()) {
      console.log('⚠️ SSE 연결 문제 감지, 강제 재연결 실행');
      this.scheduleReconnect();
    } else {
      console.log('✅ SSE 연결 상태 정상');
    }
  }

  // SSE 연결 품질 진단
  diagnoseConnection(): any {
    const diagnosis = {
      timestamp: new Date().toISOString(),
      connectionStatus: this.getConnectionStatus(),
      // 브라우저 네트워크 상태
      networkOnline: navigator.onLine,
      // 마지막 메시지로부터 경과 시간
      timeSinceLastMessage: Date.now() - this.lastMessageTime,
      // 재연결 정보
      reconnectInfo: {
        attempts: this.reconnectAttempts,
        maxAttempts: this.maxReconnectAttempts,
        isReconnectScheduled: !!this.reconnectTimeout
      },
      // 큐 상태
      queueInfo: {
        messageQueueSize: this.messageQueue.length,
        isProcessingQueue: this.isProcessingQueue
      }
    };
    
    console.log('🏥 SSE 연결 진단 결과:', diagnosis);
    return diagnosis;
  }

  // 다중 연결 환경 디버깅 기능 추가
  getMultiConnectionDiagnosis(): any {
    const diagnosis = this.diagnoseConnection();
    
    // 백엔드 다중 세션 상태 확인 API 호출
    fetch('/api/sse/debug')
      .then(response => response.json())
      .then(backendStatus => {
        chatLogger.sse.debug('백엔드 다중 세션 상태', backendStatus);
        diagnosis.backendMultiSession = backendStatus;
      })
      .catch(error => {
        chatLogger.sse.warn('백엔드 상태 확인 실패', error);
        diagnosis.backendMultiSession = { error: error.message };
      });
    
    return {
      ...diagnosis,
      multiConnectionSupport: true,
      optimizations: {
        heartbeatInterval: '8초 (다중 연결 최적화)',
        healthCheckInterval: '6초',
        connectionTimeout: '5분 (300초)',
        messageTimeout: '45초 (관대한 설정)'
      }
    };
  }
}

// 싱글톤 인스턴스
export const sseService = new SseService();

// 전역에서 SSE 상태 확인 가능 (다중 연결 지원)
(window as any).debugSSE = () => {
  const diagnosis = sseService.getMultiConnectionDiagnosis();
  
  // 네트워크 요청 모니터링 활성화
  console.log('🌐 네트워크 모니터링 활성화 중... (다중 세션 지원)');
  
  // Performance API로 네트워크 요청 추적
  const entries = performance.getEntriesByType('navigation').concat(
    performance.getEntriesByType('resource')
  );
  
  const sseEntries = entries.filter(entry => 
    entry.name.includes('/sse/') || 
    entry.name.includes('/api/sse/')
  );
  
  console.log('📊 SSE 관련 네트워크 요청:', sseEntries);
  
  return {
    diagnosis,
    networkEntries: sseEntries,
    multiConnection: true,
    actions: {
      forceCheck: () => sseService.forceConnectionCheck(),
      reconnect: () => sseService.forceConnectionCheck(),
      disconnect: () => sseService.disconnect(),
      getBackendStatus: () => fetch('/api/sse/debug').then(r => r.json()),
      cleanupBackend: () => fetch('/api/sse/cleanup', {method: 'POST'}).then(r => r.json())
    }
  };
};

// 네트워크 요청 실시간 모니터링
(window as any).monitorSSENetwork = () => {
  const observer = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      if (entry.name.includes('/sse/') || entry.name.includes('/api/sse/')) {
        console.log('🌐 SSE 네트워크 요청 감지:', {
          name: entry.name,
          startTime: entry.startTime,
          duration: entry.duration,
          transferSize: (entry as any).transferSize,
          responseStatus: (entry as any).responseStatus,
          timestamp: new Date().toISOString()
        });
      }
    }
  });
  
  observer.observe({ entryTypes: ['resource'] });
  console.log('🔍 SSE 네트워크 모니터링 시작됨');
  
  return observer;
};
