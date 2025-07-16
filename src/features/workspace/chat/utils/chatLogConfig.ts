// 채팅 로그 제어를 위한 설정 파일
// 브라우저 콘솔에서 chatLogger.setLevel('error') 등으로 실시간 제어 가능

export const CHAT_LOG_CONFIG = {
  // 전체 로그 활성화/비활성화
  ENABLED: process.env.NODE_ENV === 'development',
  
  // 기본 로그 레벨 (debug < info < warn < error)
  DEFAULT_LEVEL: 'error', // 기본적으로 에러만 표시
  
  // 모듈별 로그 활성화/비활성화
  MODULES: {
    API: false,      // API 호출 로그
    CONTEXT: false,  // Context 상태 변경 로그  
    SSE: false,      // SSE 연결 로그
    UI: false        // UI 이벤트 로그
  },
  
  // 특정 기능별 로그 제어
  FEATURES: {
    MESSAGE_SEND: false,    // 메시지 전송 로그
    MESSAGE_RECEIVE: false, // 메시지 수신 로그
    FILE_UPLOAD: true,      // 파일 업로드 로그 (디버깅 필요시)
    SSE_CONNECTION: false,  // SSE 연결 상태 로그
    ROOM_SWITCH: false      // 채팅방 전환 로그
  }
};

// 프로덕션에서는 모든 로그 비활성화 (에러 제외)
if (process.env.NODE_ENV === 'production') {
  CHAT_LOG_CONFIG.ENABLED = false;
  Object.keys(CHAT_LOG_CONFIG.MODULES).forEach(key => {
    (CHAT_LOG_CONFIG.MODULES as any)[key] = false;
  });
  Object.keys(CHAT_LOG_CONFIG.FEATURES).forEach(key => {
    (CHAT_LOG_CONFIG.FEATURES as any)[key] = false;
  });
}
