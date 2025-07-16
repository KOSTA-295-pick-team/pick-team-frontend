# ChatLogger API 참조서

## 개요

이 문서는 Pick Team 프론트엔드의 chatLogger 시스템의 모든 메소드와 속성에 대한 상세한 API 참조를 제공합니다.

## 목차

1. [기본 구조](#기본-구조)
2. [로깅 메소드](#로깅-메소드)
3. [설정 메소드](#설정-메소드)
4. [유틸리티 메소드](#유틸리티-메소드)
5. [타입 정의](#타입-정의)
6. [사용 예시](#사용-예시)

## 기본 구조

```typescript
interface ChatLogger {
  // 모듈별 로거
  api: ModuleLogger;
  context: ModuleLogger;
  sse: ModuleLogger;
  ui: ModuleLogger;
  
  // 설정 메소드
  setLevel(module: LogModule, level: LogLevel): void;
  getLevel(module: LogModule): LogLevel;
  setAllLevels(level: LogLevel): void;
  getLevels(): Record<LogModule, LogLevel>;
}
```

## 로깅 메소드

### 모듈별 로거 (ModuleLogger)

각 모듈(`api`, `context`, `sse`, `ui`)은 동일한 로깅 메소드를 제공합니다.

#### `debug(message: string, ...args: any[]): void`

**목적**: 상세한 디버깅 정보 기록  
**언제 사용**: 개발 중 문제 해결을 위한 상세한 추적 정보  
**표시 조건**: 로그 레벨이 `debug` 이상일 때만 표시

```typescript
// 예시
chatLogger.api.debug('HTTP 요청 시작', {
  url: '/api/chat/messages',
  method: 'GET',
  headers: requestHeaders
});

chatLogger.sse.debug('새 메시지 수신', {
  messageId: 123,
  chatRoomId: 456,
  content: '안녕하세요'
});

chatLogger.ui.debug('DM 채팅방 이름 계산', {
  roomId: 789,
  members: memberList,
  currentUser: user.id
});
```

**사용 가이드라인**:
- 프로덕션에서는 기본적으로 비활성화
- 성능에 영향을 줄 수 있는 상세한 정보 포함 가능
- 개발자가 코드 흐름을 이해하는 데 도움되는 정보

#### `info(message: string, ...args: any[]): void`

**목적**: 일반적인 정보성 메시지 기록  
**언제 사용**: 애플리케이션의 정상적인 동작 상태 기록  
**표시 조건**: 로그 레벨이 `info` 이상일 때만 표시

```typescript
// 예시
chatLogger.api.info('채팅방 목록 로드 완료', {
  count: chatRooms.length,
  duration: loadTime
});

chatLogger.context.info('새 채팅방 추가됨', {
  roomId: newRoom.id,
  type: newRoom.type
});

chatLogger.ui.info('사용자 액션 완료', {
  action: 'sendMessage',
  timestamp: Date.now()
});
```

**사용 가이드라인**:
- 중요한 비즈니스 로직의 완료 상태
- 사용자 액션의 성공적인 처리
- 시스템 상태 변경

#### `warn(message: string, ...args: any[]): void`

**목적**: 주의가 필요한 상황이나 잠재적 문제 기록  
**언제 사용**: 오류는 아니지만 개발자가 알아야 할 상황  
**표시 조건**: 로그 레벨이 `warn` 이상일 때만 표시

```typescript
// 예시
chatLogger.api.warn('API 응답 지연', {
  url: '/api/chat/send',
  responseTime: 5000,
  threshold: 3000
});

chatLogger.sse.warn('SSE 연결 불안정', {
  reconnectCount: 3,
  lastError: error.message
});

chatLogger.ui.warn('사용자 데이터 불완전', {
  userId: user.id,
  missingFields: ['name', 'email']
});

chatLogger.context.warn('중복 메시지 감지', {
  messageId: 123,
  chatRoomId: 456,
  action: 'ignored'
});
```

**사용 가이드라인**:
- 예상치 못한 상황이지만 복구 가능
- 성능 문제나 비정상적인 동작
- 데이터 불일치나 검증 실패

#### `error(message: string, ...args: any[]): void`

**목적**: 오류 상황과 예외 기록  
**언제 사용**: 실패한 작업이나 시스템 오류  
**표시 조건**: 로그 레벨이 `error` 이상일 때 항상 표시

```typescript
// 예시
chatLogger.api.error('HTTP 요청 실패', {
  url: '/api/chat/send',
  status: 500,
  error: error.message
});

chatLogger.sse.error('SSE 연결 실패', {
  attempt: 3,
  maxRetries: 5,
  error: connectionError
});

chatLogger.ui.error('채팅방 생성 실패', {
  reason: 'validation_failed',
  details: validationErrors
});

chatLogger.context.error('메시지 처리 오류', {
  messageId: 123,
  error: processingError.stack
});
```

**사용 가이드라인**:
- 모든 환경에서 표시되어야 하는 중요한 오류
- 사용자 경험에 직접적인 영향을 주는 문제
- 디버깅을 위한 충분한 컨텍스트 포함

## 설정 메소드

### `setLevel(module: LogModule, level: LogLevel): void`

**목적**: 특정 모듈의 로그 레벨 설정  
**매개변수**:
- `module`: 설정할 모듈 (`'api'`, `'context'`, `'sse'`, `'ui'`)
- `level`: 설정할 로그 레벨 (`'debug'`, `'info'`, `'warn'`, `'error'`)

```typescript
// 사용 예시
chatLogger.setLevel('sse', 'debug');     // SSE 모듈의 모든 디버그 로그 활성화
chatLogger.setLevel('api', 'warn');      // API 모듈의 경고 이상만 표시
chatLogger.setLevel('ui', 'error');      // UI 모듈의 오류만 표시
chatLogger.setLevel('context', 'info');  // Context 모듈의 정보 이상 표시
```

**런타임 사용**:
```javascript
// 브라우저 콘솔에서 실시간 변경
chatLogger.setLevel('sse', 'debug');
```

### `getLevel(module: LogModule): LogLevel`

**목적**: 특정 모듈의 현재 로그 레벨 조회  
**반환값**: 현재 설정된 로그 레벨

```typescript
// 사용 예시
const currentLevel = chatLogger.getLevel('sse');
console.log(`SSE 모듈 현재 레벨: ${currentLevel}`); // "debug"

// 조건부 로그 처리
if (chatLogger.getLevel('api') === 'debug') {
  // 디버그 모드에서만 실행할 코드
  performDetailedAnalysis();
}
```

### `setAllLevels(level: LogLevel): void`

**목적**: 모든 모듈의 로그 레벨을 동시에 설정  
**매개변수**: `level` - 모든 모듈에 적용할 로그 레벨

```typescript
// 사용 예시
chatLogger.setAllLevels('debug');  // 모든 모듈을 디버그 모드로
chatLogger.setAllLevels('error');  // 모든 모듈을 오류만 표시로
chatLogger.setAllLevels('warn');   // 모든 모듈을 경고 이상 표시로
```

**런타임 사용**:
```javascript
// 전체 디버깅 활성화
chatLogger.setAllLevels('debug');

// 프로덕션 모드로 전환
chatLogger.setAllLevels('error');
```

### `getLevels(): Record<LogModule, LogLevel>`

**목적**: 모든 모듈의 현재 로그 레벨 조회  
**반환값**: 모든 모듈의 로그 레벨을 포함하는 객체

```typescript
// 사용 예시
const allLevels = chatLogger.getLevels();
console.log('현재 로그 설정:', allLevels);
// 출력: { api: 'error', context: 'error', sse: 'debug', ui: 'warn' }

// 설정 백업 및 복원
const backup = chatLogger.getLevels();
// ... 임시로 다른 설정 사용
chatLogger.setAllLevels('debug');
// ... 디버깅 완료 후 복원
Object.entries(backup).forEach(([module, level]) => {
  chatLogger.setLevel(module as LogModule, level);
});
```

## 유틸리티 메소드

### 브라우저 콘솔 전역 접근

chatLogger는 브라우저의 `window` 객체에 자동으로 등록되어 개발자 도구에서 직접 접근할 수 있습니다.

```javascript
// 브라우저 콘솔에서 사용 가능
window.chatLogger.setLevel('sse', 'debug');
window.chatLogger.getLevels();

// 또는 간단히
chatLogger.setLevel('sse', 'debug');
chatLogger.getLevels();
```

## 타입 정의

### `LogLevel`

```typescript
type LogLevel = 'debug' | 'info' | 'warn' | 'error';
```

**우선순위**: `debug` < `info` < `warn` < `error`

### `LogModule`

```typescript
type LogModule = 'api' | 'context' | 'sse' | 'ui';
```

**모듈 설명**:
- `api`: HTTP 요청/응답, REST API 통신
- `context`: React Context, 상태 관리
- `sse`: Server-Sent Events, 실시간 통신
- `ui`: 사용자 인터페이스, 컴포넌트 동작

### `ModuleLogger`

```typescript
interface ModuleLogger {
  debug(message: string, ...args: any[]): void;
  info(message: string, ...args: any[]): void;
  warn(message: string, ...args: any[]): void;
  error(message: string, ...args: any[]): void;
}
```

## 사용 예시

### 1. API 통신 로깅

```typescript
// chatApi.ts
import { chatLogger } from './chatLogger';

export const chatApi = {
  async sendMessage(workspaceId: number, chatRoomId: number, data: any) {
    const url = `/api/workspaces/${workspaceId}/chatrooms/${chatRoomId}/messages`;
    
    chatLogger.api.debug('메시지 전송 요청 시작', {
      url,
      chatRoomId,
      messageLength: data.content?.length
    });

    try {
      const response = await fetch(url, {
        method: 'POST',
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        chatLogger.api.warn('API 응답 상태 비정상', {
          status: response.status,
          statusText: response.statusText
        });
      }

      const result = await response.json();
      
      chatLogger.api.info('메시지 전송 완료', {
        messageId: result.id,
        responseTime: Date.now() - startTime
      });

      return result;
    } catch (error) {
      chatLogger.api.error('메시지 전송 실패', {
        url,
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }
};
```

### 2. SSE 연결 로깅

```typescript
// sseService.ts
import { chatLogger } from './chatLogger';

export const sseService = {
  async connect() {
    chatLogger.sse.debug('SSE 연결 시도 시작');

    try {
      this.eventSource = new EventSource('/api/sse/connect');
      
      this.eventSource.onopen = () => {
        chatLogger.sse.info('SSE 연결 성공');
      };

      this.eventSource.onerror = (error) => {
        chatLogger.sse.error('SSE 연결 오류', {
          readyState: this.eventSource?.readyState,
          error
        });
      };

      this.eventSource.onmessage = (event) => {
        chatLogger.sse.debug('SSE 메시지 수신', {
          type: event.type,
          data: event.data
        });
      };

    } catch (error) {
      chatLogger.sse.error('SSE 연결 초기화 실패', error);
      throw error;
    }
  }
};
```

### 3. UI 컴포넌트 로깅

```typescript
// ChatPage.tsx
import { chatLogger } from './chatLogger';

export const ChatPage: React.FC = () => {
  const handleSendMessage = useCallback(async (content: string) => {
    chatLogger.ui.debug('메시지 전송 UI 액션', {
      messageLength: content.length,
      currentRoom: currentRoom?.id
    });

    try {
      await sendMessage(currentRoom.id, content);
      
      chatLogger.ui.info('메시지 전송 UI 완료', {
        roomId: currentRoom.id
      });
    } catch (error) {
      chatLogger.ui.error('메시지 전송 UI 오류', {
        roomId: currentRoom.id,
        error: error.message
      });
      
      // 사용자에게 오류 알림
      showErrorNotification('메시지 전송에 실패했습니다.');
    }
  }, [currentRoom, sendMessage]);

  // ...
};
```

### 4. Context 상태 관리 로깅

```typescript
// ChatContext.tsx
import { chatLogger } from './chatLogger';

function chatReducer(state: ChatState, action: ChatAction): ChatState {
  switch (action.type) {
    case 'ADD_MESSAGE':
      const newMessage = action.payload.message;
      
      chatLogger.context.debug('새 메시지 추가', {
        messageId: newMessage.id,
        chatRoomId: action.payload.chatRoomId,
        isTemporary: newMessage.id < 0
      });

      // 중복 검사
      if (messageExists) {
        chatLogger.context.warn('중복 메시지 감지', {
          messageId: newMessage.id,
          action: 'ignored'
        });
        return state;
      }

      chatLogger.context.info('메시지 상태 업데이트 완료', {
        messageId: newMessage.id,
        totalMessages: updatedMessages.length
      });

      return updatedState;

    default:
      return state;
  }
}
```

### 5. 개발 워크플로우 예시

```javascript
// 1. 일반적인 개발 (오류만 표시)
// 기본 상태에서는 오류만 표시됨

// 2. SSE 연결 문제 디버깅
chatLogger.setLevel('sse', 'debug');
// 이제 SSE 연결, 메시지 수신, 재연결 등의 상세 로그 표시

// 3. API 통신 문제 확인
chatLogger.setLevel('api', 'info');
// API 요청/응답의 기본 정보 표시

// 4. 전체 시스템 분석
chatLogger.setAllLevels('debug');
// 모든 모듈의 상세 로그 표시

// 5. 특정 부분만 집중 분석
chatLogger.setAllLevels('error');        // 먼저 모든 로그 끄기
chatLogger.setLevel('context', 'debug');  // Context만 상세 분석

// 6. 현재 설정 확인
chatLogger.getLevels();
// { api: 'error', context: 'debug', sse: 'error', ui: 'error' }
```

## 모범 사례

### 1. 적절한 로그 레벨 선택

```typescript
// ✅ 좋은 예
chatLogger.api.error('인증 실패', error);           // 중요한 오류
chatLogger.api.warn('응답 지연', { time: 5000 });   // 주의 필요
chatLogger.api.info('요청 완료', { status: 200 });  // 정상 완료
chatLogger.api.debug('요청 데이터', requestBody);    // 상세 정보

// ❌ 나쁜 예
chatLogger.api.error('요청 시작');                  // 오류가 아님
chatLogger.api.debug('서버 다운');                  // 중요한 오류인데 debug 사용
```

### 2. 구조화된 로그 데이터

```typescript
// ✅ 좋은 예 - 구조화된 데이터
chatLogger.sse.debug('메시지 수신', {
  messageId: data.messageId,
  chatRoomId: data.chatRoomId,
  senderId: data.senderId,
  timestamp: new Date().toISOString()
});

// ❌ 나쁜 예 - 문자열 concatenation
chatLogger.sse.debug(`메시지 ${data.messageId} 수신 from ${data.senderId}`);
```

### 3. 민감한 정보 보호

```typescript
// ✅ 좋은 예 - 민감한 정보 제거
const safeUserData = {
  id: user.id,
  name: user.name,
  role: user.role
  // password, token 등은 제외
};
chatLogger.context.debug('사용자 정보', safeUserData);

// ❌ 나쁜 예 - 전체 객체 로깅
chatLogger.context.debug('사용자 정보', user); // password, token 포함될 수 있음
```

이 API 참조서를 통해 chatLogger 시스템의 모든 기능을 효과적으로 활용할 수 있습니다.
