import React, {
  createContext,
  useState,
  useContext,
  ReactNode,
  useCallback,
  useEffect,
} from "react";
import { User, LoginRequest } from "@/features/user/types/user";
import { authApi } from "@/features/user/auth/api/authApi";
import { tokenManager } from "@/lib/apiClient";
import { userApi } from "@/features/user/mypage/api/userApi";

export interface AuthContextType {
  currentUser: User | null;
  login: (credentials: LoginRequest) => Promise<void>;
  logout: () => void;
  updateUserProfile: (profileData: Partial<User>) => Promise<void>; // 추가
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
}

export const AuthContext = createContext<AuthContextType | undefined>(
  undefined
);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({
  children
}) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 앱 시작 시 토큰으로 사용자 정보 가져오기
  useEffect(() => {
    const initializeAuth = async () => {
      const token = tokenManager.getAccessToken();
      if (token) {
        try {
          // 백엔드 API는 User 객체를 직접 반환한다고 가정
          const userData = await userApi.getCurrentUser();
          setCurrentUser(userData);
        } catch (err) {
          console.warn('자동 로그인 실패:', err);
          tokenManager.clearTokens(); // 유효하지 않은 토큰 제거
          setCurrentUser(null);
        }
      }
      setLoading(false);
    };

    initializeAuth();
  }, []);

  const login = useCallback(async (credentials: LoginRequest) => {
    setLoading(true);
    setError(null);
    try {
      // 1. 로그인 API 호출 (토큰은 내부에 저장됨)
      await authApi.login(credentials);
      
      // 2. 로그인 성공 후, 토큰을 사용하여 사용자 정보 가져오기
      const userData = await userApi.getCurrentUser();
      setCurrentUser(userData);

    } catch (err) {
      setError(err instanceof Error ? err.message : '로그인에 실패했습니다.');
      throw err; // 에러를 다시 던져서 로그인 페이지에서 처리할 수 있도록 함
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    setLoading(true);
    try {
      await authApi.logout();
    } catch (err) {
      console.error('로그아웃 중 에러 발생:', err);
    } finally {
      setCurrentUser(null);
      tokenManager.clearTokens();
      setLoading(false);
    }
  }, []);

  const updateUserProfile = useCallback(async (profileData: Partial<User>) => {
    if (!currentUser) throw new Error("User not authenticated");
    setLoading(true);
    try {
      // UserUpdateProfileRequest에 맞게 데이터 전송 (API 명세에 따라 수정 필요)
      const updatedUserData = await userApi.updateUserProfile(profileData);
      setCurrentUser(prevUser => ({
        ...(prevUser as User),
        ...updatedUserData,
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : '프로필 업데이트에 실패했습니다.');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  const value = {
    currentUser,
    login,
    logout,
    updateUserProfile, // 추가
    isAuthenticated: !!currentUser,
    loading,
    error,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
