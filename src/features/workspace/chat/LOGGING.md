# 채팅 로그 관리 가이드

## 📋 현재 상태
채팅 관련 로그가 정리되었습니다. 기본적으로 **에러 로그만** 표시되도록 설정되어 있습니다.

## 🎛️ 로그 제어 방법

### 1. 브라우저 콘솔에서 실시간 제어
```javascript
// 전체 로그 활성화/비활성화
chatLogger.enable();   // 활성화
chatLogger.disable();  // 비활성화

// 로그 레벨 변경
chatLogger.setLevel('debug');  // 모든 로그 표시
chatLogger.setLevel('info');   // info, warn, error 표시
chatLogger.setLevel('warn');   // warn, error만 표시
chatLogger.setLevel('error');  // error만 표시 (기본값)

// 특정 모듈 로그 제어
chatLogger.setModuleEnabled('api', true);      // API 로그 활성화
chatLogger.setModuleEnabled('context', true);  // Context 로그 활성화
chatLogger.setModuleEnabled('sse', true);      // SSE 로그 활성화
chatLogger.setModuleEnabled('ui', true);       // UI 로그 활성화

// 현재 설정 확인
chatLogger.getConfig();
```

### 2. 개발 중 일시적으로 로그 활성화
```javascript
// 파일 업로드 디버깅 시
chatLogger.setLevel('info');
chatLogger.setModuleEnabled('api', true);

// SSE 연결 문제 디버깅 시
chatLogger.setLevel('debug');
chatLogger.setModuleEnabled('sse', true);

// 전체 채팅 디버깅 시
chatLogger.setLevel('debug');
chatLogger.setModuleEnabled('api', true);
chatLogger.setModuleEnabled('context', true);
chatLogger.setModuleEnabled('sse', true);
chatLogger.setModuleEnabled('ui', true);
```

## 🔧 설정 파일 수정

`src/features/workspace/chat/utils/chatLogConfig.ts` 파일에서 기본 설정을 변경할 수 있습니다:

```typescript
export const CHAT_LOG_CONFIG = {
  ENABLED: true,           // 전체 로그 활성화
  DEFAULT_LEVEL: 'info',   // 기본 레벨 변경
  
  MODULES: {
    API: true,     // API 로그 기본 활성화
    CONTEXT: false,
    SSE: false,
    UI: false
  },
  
  FEATURES: {
    FILE_UPLOAD: true,     // 파일 업로드 로그만 활성화
    // ... 기타 기능별 설정
  }
};
```

## 📊 로그 레벨 설명

- **debug**: 상세한 디버깅 정보 (가장 많은 로그)
- **info**: 일반적인 정보성 로그
- **warn**: 경고 메시지
- **error**: 에러 메시지만 (기본값, 가장 적은 로그)

## 🎯 추천 설정

### 일반 개발 시
```javascript
chatLogger.setLevel('error');  // 에러만 표시
```

### 채팅 기능 디버깅 시
```javascript
chatLogger.setLevel('info');
chatLogger.setModuleEnabled('context', true);
```

### 파일 업로드 디버깅 시
```javascript
chatLogger.setLevel('info');
chatLogger.setModuleEnabled('api', true);
```

### SSE 연결 문제 해결 시
```javascript
chatLogger.setLevel('debug');
chatLogger.setModuleEnabled('sse', true);
```

## 🚀 프로덕션 환경
프로덕션 환경에서는 자동으로 모든 로그가 비활성화되며, 에러 로그만 표시됩니다.
