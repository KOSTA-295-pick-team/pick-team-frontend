import React, {
  createContext,
  useState,
  useContext,
  ReactNode,
  useCallback,
  useEffect,
} from "react";
import { User } from "@/features/user/types/user";
import { tokenManager } from "@/lib/apiClient";
import { userApi } from "@/lib/userApi";

export interface AuthContextType {
  currentUser: User | null;
  login: (user: User) => Promise<void>;
  loginWithCredentials: (email: string, password: string) => Promise<void>;
  logout: () => void;
  updateUserProfile: (updatedProfileData: Partial<User>) => void;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
  setError: (error: string | null) => void;
  
  // 회원가입 관련 기능
  register: (userData: {
    email: string;
    password: string;
    confirmPassword: string;
    name: string;
    nickname?: string;
  }) => Promise<void>;
  
  // 비밀번호 재설정 관련 기능
  sendPasswordResetEmail: (email: string) => Promise<void>;
  verifyResetCode: (email: string, resetCode: string) => Promise<boolean>;
  resetPassword: (email: string, resetCode: string, newPassword: string) => Promise<void>;
  
  // 이메일 인증 관련 기능
  requestEmailVerification: (email: string) => Promise<void>;
  verifyEmail: (email: string, verificationCode: string) => Promise<void>;
  
  // 세션 확인
  checkSession: () => Promise<boolean>;
  
  // OAuth 토큰 저장
  setTokensAndUser: (token: string, refreshToken: string, user: User) => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(
  undefined
);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({
  children
}) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setErrorState] = useState<string | null>(null);
  const [hasInitialized, setHasInitialized] = useState(false);

  // 앱 시작 시 저장된 토큰으로 자동 로그인 시도
  useEffect(() => {
    if (hasInitialized) {
      console.log("이미 인증 초기화됨, 중복 호출 방지");
      return;
    }

    const initializeAuth = async () => {
      const token = tokenManager.getAccessToken();
      const refreshToken = tokenManager.getRefreshToken();

      if (token && refreshToken) {
        try {
          console.log("토큰 발견, 자동 로그인 시도 중...");
          
          // 세션 상태 확인
          const sessionResponse = await userApi.getSessionStatus();
          
          if (sessionResponse.success && sessionResponse.data.authenticated && sessionResponse.data.user) {
            console.log("자동 로그인 성공:", sessionResponse.data.user);
            setCurrentUser(sessionResponse.data.user);
          } else {
            console.log("세션이 유효하지 않음, 토큰 삭제");
            tokenManager.clearTokens();
          }
        } catch (err) {
          console.log("자동 로그인 실패:", err);
          tokenManager.clearTokens();
        }
      } else {
        console.log("저장된 토큰 없음");
      }
      
      setLoading(false);
      setHasInitialized(true);
    };

    initializeAuth();
  }, [hasInitialized]);

  const login = useCallback(async (user: User) => {
    setCurrentUser(user);
    setErrorState(null);
  }, []);

  const loginWithCredentials = useCallback(async (email: string, password: string) => {
    setLoading(true);
    setErrorState(null);
    
    try {
      console.log("로그인 시도:", email);
      
      const response = await userApi.login({ email, password });
      
      if (response.success && response.data) {
        console.log("로그인 성공:", response.data.user);
        setCurrentUser(response.data.user);
      } else {
        throw new Error(response.message || "로그인에 실패했습니다.");
      }
    } catch (err: any) {
      const errorMessage = err.message || "로그인에 실패했습니다.";
      console.error("로그인 에러:", errorMessage);
      setErrorState(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    setLoading(true);
    try {
      await userApi.logout();
    } catch (err) {
      console.error('로그아웃 중 에러 발생:', err);
    } finally {
      setCurrentUser(null);
      setErrorState(null);
      setLoading(false);
    }
  }, []);

  const updateUserProfile = useCallback((updatedProfileData: Partial<User>) => {
    if (!currentUser) return;
    
    setCurrentUser(prevUser => ({
      ...prevUser!,
      ...updatedProfileData,
    }));
  }, [currentUser]);

  const register = useCallback(async (userData: {
    email: string;
    password: string;
    confirmPassword: string;
    name: string;
    nickname?: string;
  }) => {
    setLoading(true);
    setErrorState(null);
    
    try {
      const response = await userApi.register(userData);
      
      if (!response.success) {
        throw new Error(response.message || "회원가입에 실패했습니다.");
      }
    } catch (err: any) {
      const errorMessage = err.message || "회원가입에 실패했습니다.";
      setErrorState(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const sendPasswordResetEmail = useCallback(async (email: string) => {
    setLoading(true);
    setErrorState(null);
    
    try {
      const response = await userApi.sendPasswordResetEmail({ email });
      
      if (!response.success) {
        throw new Error(response.message || "비밀번호 재설정 이메일 전송에 실패했습니다.");
      }
    } catch (err: any) {
      const errorMessage = err.message || "비밀번호 재설정 이메일 전송에 실패했습니다.";
      setErrorState(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const verifyResetCode = useCallback(async (email: string, resetCode: string): Promise<boolean> => {
    setLoading(true);
    setErrorState(null);
    
    try {
      const response = await userApi.verifyResetCode({ email, resetCode });
      
      if (response.success) {
        return response.data.valid;
      } else {
        throw new Error(response.message || "재설정 코드 검증에 실패했습니다.");
      }
    } catch (err: any) {
      const errorMessage = err.message || "재설정 코드 검증에 실패했습니다.";
      setErrorState(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const resetPassword = useCallback(async (email: string, resetCode: string, newPassword: string) => {
    setLoading(true);
    setErrorState(null);
    
    try {
      const response = await userApi.resetPassword({ email, resetCode, newPassword });
      
      if (!response.success) {
        throw new Error(response.message || "비밀번호 재설정에 실패했습니다.");
      }
    } catch (err: any) {
      const errorMessage = err.message || "비밀번호 재설정에 실패했습니다.";
      setErrorState(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const requestEmailVerification = useCallback(async (email: string) => {
    setLoading(true);
    setErrorState(null);
    
    try {
      const response = await userApi.requestEmailVerification(email);
      
      if (!response.success) {
        throw new Error(response.message || "이메일 인증 요청에 실패했습니다.");
      }
    } catch (err: any) {
      const errorMessage = err.message || "이메일 인증 요청에 실패했습니다.";
      setErrorState(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const verifyEmail = useCallback(async (email: string, verificationCode: string) => {
    setLoading(true);
    setErrorState(null);
    
    try {
      const response = await userApi.verifyEmail(email, verificationCode);
      
      if (!response.success) {
        throw new Error(response.message || "이메일 인증에 실패했습니다.");
      }
    } catch (err: any) {
      const errorMessage = err.message || "이메일 인증에 실패했습니다.";
      setErrorState(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const checkSession = useCallback(async (): Promise<boolean> => {
    try {
      const response = await userApi.getSessionStatus();
      return response.success && response.data.authenticated;
    } catch (err) {
      return false;
    }
  }, []);

  const setTokensAndUser = useCallback(async (token: string, refreshToken: string, user: User) => {
    setLoading(true);
    try {
      // 토큰 저장
      tokenManager.setAccessToken(token);
      tokenManager.setRefreshToken(refreshToken);
      
      // 사용자 정보 설정
      setCurrentUser(user);
      setErrorState(null);
    } catch (err: any) {
      const errorMessage = err.message || "토큰 저장에 실패했습니다.";
      setErrorState(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const setError = useCallback((newError: string | null) => {
    setErrorState(newError);
  }, []);

  const value: AuthContextType = {
    currentUser,
    login,
    loginWithCredentials,
    logout,
    updateUserProfile,
    isAuthenticated: !!currentUser,
    loading,
    error,
    setError,
    register,
    sendPasswordResetEmail,
    verifyResetCode,
    resetPassword,
    requestEmailVerification,
    verifyEmail,
    checkSession,
    setTokensAndUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
