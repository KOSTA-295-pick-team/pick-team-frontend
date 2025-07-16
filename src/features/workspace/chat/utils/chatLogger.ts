// 채팅 로그 유틸리티
// 개발 환경에서만 로그를 출력하고, 프로덕션에서는 조건부로 출력

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface ChatLogConfig {
  enabled: boolean;
  level: LogLevel;
  modules: {
    api: boolean;
    context: boolean;
    sse: boolean;
    ui: boolean;
  };
}

// 로그 설정 (환경 변수로 제어 가능)
const logConfig: ChatLogConfig = {
  enabled: process.env.NODE_ENV === 'development', // 개발 환경에서만 기본적으로 활성화
  level: 'warn', // 기본적으로 warn 레벨로 설정하여 로그 줄이기
  modules: {
    api: false, // API 로그 기본 비활성화
    context: false, // Context 로그 기본 비활성화
    sse: false, // SSE 로그 기본 비활성화
    ui: false, // UI 로그 기본 비활성화
  }
};

// 로그 레벨 우선순위
const logLevels: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3
};

class ChatLogger {
  private shouldLog(level: LogLevel, module: keyof ChatLogConfig['modules']): boolean {
    if (!logConfig.enabled) return level === 'error'; // 프로덕션에서는 에러만
    if (!logConfig.modules[module]) return false;
    return logLevels[level] >= logLevels[logConfig.level];
  }

  private formatMessage(module: string, message: string, data?: any): [string, ...any[]] {
    const timestamp = new Date().toISOString().slice(11, 23); // HH:mm:ss.SSS
    const prefix = `[${timestamp}] [Chat${module}]`;
    return data !== undefined ? [prefix + ' ' + message, data] : [prefix + ' ' + message];
  }

  // API 관련 로그
  api = {
    debug: (message: string, data?: any) => {
      if (this.shouldLog('debug', 'api')) {
        console.log(...this.formatMessage('API', '🔍 ' + message, data));
      }
    },
    info: (message: string, data?: any) => {
      if (this.shouldLog('info', 'api')) {
        console.log(...this.formatMessage('API', '📡 ' + message, data));
      }
    },
    warn: (message: string, data?: any) => {
      if (this.shouldLog('warn', 'api')) {
        console.warn(...this.formatMessage('API', '⚠️ ' + message, data));
      }
    },
    error: (message: string, data?: any) => {
      if (this.shouldLog('error', 'api')) {
        console.error(...this.formatMessage('API', '❌ ' + message, data));
      }
    }
  };

  // Context 관련 로그
  context = {
    debug: (message: string, data?: any) => {
      if (this.shouldLog('debug', 'context')) {
        console.log(...this.formatMessage('Context', '🔍 ' + message, data));
      }
    },
    info: (message: string, data?: any) => {
      if (this.shouldLog('info', 'context')) {
        console.log(...this.formatMessage('Context', '🔄 ' + message, data));
      }
    },
    warn: (message: string, data?: any) => {
      if (this.shouldLog('warn', 'context')) {
        console.warn(...this.formatMessage('Context', '⚠️ ' + message, data));
      }
    },
    error: (message: string, data?: any) => {
      if (this.shouldLog('error', 'context')) {
        console.error(...this.formatMessage('Context', '❌ ' + message, data));
      }
    }
  };

  // SSE 관련 로그
  sse = {
    debug: (message: string, data?: any) => {
      if (this.shouldLog('debug', 'sse')) {
        console.log(...this.formatMessage('SSE', '🔍 ' + message, data));
      }
    },
    info: (message: string, data?: any) => {
      if (this.shouldLog('info', 'sse')) {
        console.log(...this.formatMessage('SSE', '⚡ ' + message, data));
      }
    },
    warn: (message: string, data?: any) => {
      if (this.shouldLog('warn', 'sse')) {
        console.warn(...this.formatMessage('SSE', '⚠️ ' + message, data));
      }
    },
    error: (message: string, data?: any) => {
      if (this.shouldLog('error', 'sse')) {
        console.error(...this.formatMessage('SSE', '❌ ' + message, data));
      }
    }
  };

  // UI 관련 로그
  ui = {
    debug: (message: string, data?: any) => {
      if (this.shouldLog('debug', 'ui')) {
        console.log(...this.formatMessage('UI', '🔍 ' + message, data));
      }
    },
    info: (message: string, data?: any) => {
      if (this.shouldLog('info', 'ui')) {
        console.log(...this.formatMessage('UI', '🎨 ' + message, data));
      }
    },
    warn: (message: string, data?: any) => {
      if (this.shouldLog('warn', 'ui')) {
        console.warn(...this.formatMessage('UI', '⚠️ ' + message, data));
      }
    },
    error: (message: string, data?: any) => {
      if (this.shouldLog('error', 'ui')) {
        console.error(...this.formatMessage('UI', '❌ ' + message, data));
      }
    }
  };

  // 전체 로그 활성화/비활성화
  enable() {
    logConfig.enabled = true;
  }

  disable() {
    logConfig.enabled = false;
  }

  // 특정 모듈 로그 제어
  setModuleEnabled(module: keyof ChatLogConfig['modules'], enabled: boolean) {
    logConfig.modules[module] = enabled;
  }

  // 로그 레벨 변경
  setLevel(level: LogLevel) {
    logConfig.level = level;
  }

  // 현재 설정 확인
  getConfig() {
    return { ...logConfig };
  }
}

export const chatLogger = new ChatLogger();

// 브라우저 콘솔에서 사용할 수 있도록 전역 객체에 추가 (개발 환경에서만)
if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
  (window as any).chatLogger = chatLogger;
}
