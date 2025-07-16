# ChatLogger 시스템 문서

## 개요

ChatLogger는 Pick Team 프론트엔드의 채팅 관련 컴포넌트들을 위한 통합 로깅 시스템입니다. 개발 환경에서는 상세한 디버깅 정보를 제공하고, 프로덕션 환경에서는 필요한 오류 로그만 표시하여 성능과 사용자 경험을 최적화합니다.

## 특징

- **모듈별 로그 레벨 제어**: API, Context, SSE, UI 영역을 독립적으로 관리
- **환경별 자동 설정**: 개발/프로덕션 환경에 따른 자동 로그 레벨 조정
- **런타임 제어**: 브라우저 콘솔에서 실시간 로그 레벨 변경 가능
- **성능 최적화**: 프로덕션에서 불필요한 로그 연산 완전 제거

## 파일 위치

```
src/features/workspace/chat/utils/chatLogger.ts
```

## 모듈 구조

### 1. 로그 레벨

```typescript
type LogLevel = 'debug' | 'info' | 'warn' | 'error';
```

로그 레벨은 다음과 같은 우선순위를 가집니다:
- `debug` < `info` < `warn` < `error`

### 2. 모듈 타입

```typescript
type LogModule = 'api' | 'context' | 'sse' | 'ui';
```

- **api**: chatApi.ts의 HTTP 요청/응답 로그
- **context**: ChatContext.tsx의 상태 관리 로그
- **sse**: sseService.ts의 Server-Sent Events 로그
- **ui**: 사용자 인터페이스 관련 로그 (ChatPage, NewChatModal 등)

## 기본 설정

### 개발 환경 (NODE_ENV !== 'production')
```typescript
api: 'error',      // API 오류만 표시
context: 'error',  // 컨텍스트 오류만 표시  
sse: 'error',      // SSE 오류만 표시
ui: 'error'        // UI 오류만 표시
```

### 프로덕션 환경
```typescript
api: 'error',      // 오류만 표시
context: 'error',  // 오류만 표시
sse: 'error',      // 오류만 표시
ui: 'error'        // 오류만 표시
```

## 사용법

### 1. 기본 사용

```typescript
import { chatLogger } from '@/features/workspace/chat/utils/chatLogger';

// API 관련 로그
chatLogger.api.debug('API 요청 시작', requestData);
chatLogger.api.error('API 오류 발생', error);

// Context 관련 로그
chatLogger.context.debug('메시지 상태 업데이트', newMessages);
chatLogger.context.warn('중복 메시지 감지', messageId);

// SSE 관련 로그
chatLogger.sse.debug('SSE 연결 시작');
chatLogger.sse.error('SSE 연결 실패', error);

// UI 관련 로그
chatLogger.ui.debug('DM 채팅방 이름 계산', roomData);
chatLogger.ui.info('사용자 액션 완료', actionType);
```

### 2. 런타임 로그 레벨 변경

브라우저 개발자 도구 콘솔에서 실시간으로 로그 레벨을 변경할 수 있습니다:

```javascript
// 특정 모듈의 로그 레벨 변경
chatLogger.setLevel('sse', 'debug');     // SSE 디버그 로그 활성화
chatLogger.setLevel('api', 'info');      // API 정보 로그 활성화
chatLogger.setLevel('ui', 'warn');       // UI 경고 로그만 표시

// 현재 설정 확인
chatLogger.getLevel('sse');              // 현재 SSE 로그 레벨 반환
chatLogger.getLevels();                  // 모든 모듈의 로그 레벨 반환

// 모든 모듈을 한번에 설정
chatLogger.setAllLevels('debug');        // 모든 모듈을 debug 레벨로 설정
```

## 적용된 컴포넌트

### 완료된 컴포넌트들

1. **ChatPage.tsx** - UI 모듈
   - DM 채팅방 이름 생성 로그
   - 타임스탬프 경고 로그
   - 메시지 처리 로그

2. **chatApi.ts** - API 모듈
   - HTTP 요청/응답 로그
   - API 오류 로그

3. **sseService.ts** - SSE 모듈
   - SSE 연결/해제 로그
   - 하트비트 로그
   - 메시지 큐 로그
   - 연결 오류 로그

4. **ChatContext.tsx** - Context 및 SSE 모듈
   - 메시지 상태 관리 로그
   - SSE 이벤트 처리 로그
   - 연결 관리 로그

5. **TeamProjectSidebar.tsx** - UI 모듈
   - 채팅방 목록 로그
   - DM 이름 계산 로그

6. **NewChatModal.tsx** - UI 모듈
   - 채팅방 생성 로그
   - 사용자 선택 로그

## 디버깅 시나리오

### 1. SSE 연결 문제 디버깅

```javascript
// SSE 관련 상세 로그 활성화
chatLogger.setLevel('sse', 'debug');

// 이제 SSE 연결, 재연결, 메시지 수신 등의 상세 로그가 표시됩니다
// - SSE 연결 시작/완료
// - 메시지 수신 및 처리
// - 연결 실패 및 재시도
// - 하트비트 상태
```

### 2. API 통신 문제 디버깅

```javascript
// API 관련 상세 로그 활성화
chatLogger.setLevel('api', 'debug');

// 이제 HTTP 요청/응답의 상세 정보가 표시됩니다
// - 요청 URL, 메서드, 데이터
// - 응답 상태, 데이터
// - 오류 세부사항
```

### 3. UI 동작 문제 디버깅

```javascript
// UI 관련 상세 로그 활성화
chatLogger.setLevel('ui', 'debug');

// 이제 UI 컴포넌트의 상세 동작이 표시됩니다
// - DM 채팅방 이름 계산 과정
// - 사용자 액션 처리
// - 모달 상태 변경
```

### 4. 전체 채팅 시스템 디버깅

```javascript
// 모든 채팅 관련 로그 활성화
chatLogger.setAllLevels('debug');

// 채팅 시스템의 모든 동작이 상세히 표시됩니다
```

## 성능 영향

### 프로덕션 환경
- 기본적으로 `error` 레벨만 활성화되어 성능 영향 최소화
- 불필요한 로그 연산이 완전히 제거됨
- 사용자 경험에 영향 없음

### 개발 환경
- 오류 로그만 기본 표시하여 콘솔 노이즈 최소화
- 필요시 런타임에 상세 로그 활성화 가능
- 디버깅 효율성 극대화

## 확장 방법

### 새로운 모듈 추가

```typescript
// chatLogger.ts에서 LogModule 타입 확장
type LogModule = 'api' | 'context' | 'sse' | 'ui' | 'newModule';

// 기본 설정에 새 모듈 추가
const defaultLevels: Record<LogModule, LogLevel> = {
  // ...existing modules
  newModule: isDevelopment ? 'error' : 'error'
};
```

### 새로운 로그 레벨 추가

```typescript
// 필요시 로그 레벨 확장 가능
type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal';
```

## 모범 사례

### 1. 적절한 로그 레벨 선택

```typescript
// ✅ 좋은 예
chatLogger.api.error('API 호출 실패', error);        // 반드시 알아야 할 오류
chatLogger.api.warn('API 응답 지연', responseTime);   // 주의가 필요한 상황
chatLogger.api.info('API 호출 완료', result);         // 일반적인 정보
chatLogger.api.debug('API 요청 데이터', requestData); // 상세한 디버깅 정보

// ❌ 나쁜 예
chatLogger.api.error('API 호출 시작');                // 오류가 아닌데 error 레벨 사용
chatLogger.api.debug('치명적인 오류 발생', error);    // 중요한 오류인데 debug 레벨 사용
```

### 2. 적절한 모듈 선택

```typescript
// ✅ 좋은 예
chatLogger.api.debug('HTTP 요청', request);           // API 관련은 api 모듈
chatLogger.sse.debug('SSE 메시지 수신', message);     // SSE 관련은 sse 모듈
chatLogger.ui.debug('버튼 클릭 처리', buttonId);      // UI 동작은 ui 모듈
chatLogger.context.debug('상태 업데이트', newState);  // 상태 관리는 context 모듈

// ❌ 나쁜 예
chatLogger.api.debug('SSE 연결 상태', isConnected);   // SSE 관련인데 api 모듈 사용
chatLogger.ui.debug('API 응답 처리', response);       // API 관련인데 ui 모듈 사용
```

### 3. 민감한 정보 처리

```typescript
// ✅ 좋은 예 - 민감한 정보 제거
const safeUserData = { 
  id: user.id, 
  name: user.name 
  // password, token 등은 제외
};
chatLogger.api.debug('사용자 데이터', safeUserData);

// ❌ 나쁜 예 - 민감한 정보 포함
chatLogger.api.debug('사용자 데이터', user); // password, token 등이 포함될 수 있음
```

## 마이그레이션 가이드

기존 `console.log` 코드를 chatLogger로 마이그레이션할 때:

### Before (기존)
```typescript
console.log('🔌 SSE 연결 시작...');
console.error('❌ API 오류:', error);
console.warn('⚠️ 경고 메시지');
```

### After (chatLogger 적용)
```typescript
chatLogger.sse.debug('SSE 연결 시작...');
chatLogger.api.error('API 오류:', error);
chatLogger.ui.warn('경고 메시지');
```

## 문제 해결

### 로그가 표시되지 않는 경우

1. 현재 로그 레벨 확인:
   ```javascript
   chatLogger.getLevels();
   ```

2. 로그 레벨 조정:
   ```javascript
   chatLogger.setLevel('moduleName', 'debug');
   ```

3. 브라우저 콘솔 필터 확인:
   - 브라우저 개발자 도구에서 로그 레벨 필터가 올바르게 설정되었는지 확인

### 성능 문제가 발생하는 경우

1. 프로덕션에서 불필요한 로그 레벨이 활성화되었는지 확인
2. 로그 레벨을 `error`로 조정:
   ```javascript
   chatLogger.setAllLevels('error');
   ```

이 문서는 chatLogger 시스템의 포괄적인 가이드입니다. 추가 질문이나 개선 사항이 있으면 언제든 문의해 주세요.
