// 통합 토큰 관리자 - 모든 API에서 공통 사용
const TOKEN_KEY = "auth_token";
const REFRESH_TOKEN_KEY = "refresh_token";

export const tokenManager = {
  getAccessToken: () => {
    const token = localStorage.getItem(TOKEN_KEY);
    console.log("[DEBUG tokenManager] getAccessToken:", {
      hasToken: !!token,
      tokenLength: token ? token.length : 0,
      tokenStart: token ? token.substring(0, 20) + "..." : "null",
    });
    return token;
  },
  setAccessToken: (token: string) => {
    console.log("[DEBUG tokenManager] setAccessToken:", {
      hasToken: !!token,
      tokenLength: token ? token.length : 0,
      tokenStart: token ? token.substring(0, 20) + "..." : "null",
      tokenType: typeof token,
    });
    if (!token || token === "undefined" || token === "null") {
      console.error("[DEBUG tokenManager] 잘못된 accessToken 저장 시도!");
      return;
    }
    localStorage.setItem(TOKEN_KEY, token);
  },
  getRefreshToken: () => {
    const token = localStorage.getItem(REFRESH_TOKEN_KEY);
    console.log("[DEBUG tokenManager] getRefreshToken:", {
      hasToken: !!token,
      tokenLength: token ? token.length : 0,
    });
    return token;
  },
  setRefreshToken: (token: string) => {
    console.log("[DEBUG tokenManager] setRefreshToken:", {
      hasToken: !!token,
      tokenLength: token ? token.length : 0,
      tokenType: typeof token,
    });
    if (!token || token === "undefined" || token === "null") {
      console.warn("[DEBUG tokenManager] 잘못된 refreshToken 저장 시도!");
      return;
    }
    localStorage.setItem(REFRESH_TOKEN_KEY, token);
  },
  clearTokens: () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  },

  // 디버깅용 헬퍼 함수들
  debug: {
    getAllTokens: () => ({
      accessToken: localStorage.getItem(TOKEN_KEY),
      refreshToken: localStorage.getItem(REFRESH_TOKEN_KEY),
    }),
    isTokenExpired: (token: string): boolean => {
      try {
        const tokenParts = token.split(".");
        if (tokenParts.length !== 3) return true;

        const payload = JSON.parse(atob(tokenParts[1]));
        const now = Math.floor(Date.now() / 1000);
        return payload.exp < now;
      } catch {
        return true;
      }
    },
    getTokenInfo: (token: string) => {
      try {
        const tokenParts = token.split(".");
        if (tokenParts.length !== 3) return null;

        const payload = JSON.parse(atob(tokenParts[1]));
        return {
          userId: payload.sub,
          email: payload.email,
          exp: new Date(payload.exp * 1000),
          iat: new Date(payload.iat * 1000),
          isExpired: payload.exp < Math.floor(Date.now() / 1000),
        };
      } catch {
        return null;
      }
    },
  },
};

export default tokenManager;
