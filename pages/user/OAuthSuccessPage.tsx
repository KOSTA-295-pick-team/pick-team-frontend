import React, { useEffect, useState, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../../AuthContext";
import { tokenManager } from "../../services/tokenManager";
import {
  userControllerApi,
  UserApiError,
} from "../../services/user-controller";

/**
 * OAuth 성공 페이지
 * 백엔드에서 OAuth 인증 완료 후 임시 코드와 함께 리디렉션되는 페이지
 * 새로운 보안 강화된 OAuth 시스템: tempCode -> JWT 토큰 교환 방식
 */
export const OAuthSuccessPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { login, refreshWorkspaces } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const hasRunRef = useRef(false); // React Strict Mode 중복 실행 방지

  useEffect(() => {
    // React Strict Mode에서 중복 실행 방지
    if (hasRunRef.current) {
      console.log("[DEBUG OAuthSuccessPage] 중복 실행 감지, 건너뛰기");
      return;
    }
    hasRunRef.current = true;

    const handleOAuthSuccess = async () => {
      try {
        console.log("[DEBUG OAuthSuccessPage] 시작");

        // URL 파라미터에서 임시 코드와 에러 추출
        const tempCode = searchParams.get("tempCode");
        const error = searchParams.get("error");

        console.log("[DEBUG OAuthSuccessPage] 파라미터:", {
          tempCode: tempCode ? "존재" : "없음",
          error: error || "없음",
        });

        // 에러 체크
        if (error) {
          console.error("[DEBUG OAuthSuccessPage] OAuth 인증 실패:", error);
          setError(`OAuth 인증에 실패했습니다: ${error}`);
          setLoading(false);
          return;
        }

        // 임시 코드 체크
        if (!tempCode) {
          console.error("[DEBUG OAuthSuccessPage] tempCode가 없습니다");
          setError("OAuth 인증에 실패했습니다. 임시 코드가 없습니다.");
          setLoading(false);
          return;
        }

        console.log("[DEBUG OAuthSuccessPage] 토큰 교환 API 호출 중...");

        // 임시 코드로 JWT 토큰 교환 (새로운 API 사용)
        const response: any = await userControllerApi.exchangeOAuthToken(
          tempCode
        );
        console.log("[DEBUG OAuthSuccessPage] 토큰 교환 원본 응답:", {
          type: typeof response,
          keys: Object.keys(response || {}),
          response: JSON.stringify(response, null, 2),
        });

        // 응답 구조 분석 및 토큰 추출 (유연하게 처리)
        let accessToken: string | null = null;
        let refreshToken: string | null = null;
        let userInfo: any = null;

        // 다양한 응답 구조에 대응
        if (response) {
          // 1차: 직접 접근
          accessToken = response.token || response.accessToken;
          refreshToken = response.refreshToken || null;
          userInfo = response.user;

          // 2차: data 객체 안에 있는 경우
          if (!accessToken && response.data) {
            accessToken = response.data.token || response.data.accessToken;
            refreshToken = refreshToken || response.data.refreshToken || null;
            userInfo = userInfo || response.data.user;
          }

          // 3차: result 객체 안에 있는 경우
          if (!accessToken && response.result) {
            accessToken = response.result.token || response.result.accessToken;
            refreshToken = refreshToken || response.result.refreshToken || null;
            userInfo = userInfo || response.result.user;
          }
        }

        console.log("[DEBUG OAuthSuccessPage] 토큰 추출 결과:", {
          hasAccessToken: !!accessToken,
          accessTokenLength: accessToken ? accessToken.length : 0,
          hasRefreshToken: !!refreshToken,
          hasUserInfo: !!userInfo,
          userInfo: userInfo
            ? {
                id: userInfo.id,
                email: userInfo.email,
                name: userInfo.name,
              }
            : null,
        });

        // accessToken 검증
        if (!accessToken) {
          console.error(
            "[DEBUG OAuthSuccessPage] accessToken을 찾을 수 없습니다."
          );

          // refreshToken만 있는 경우 특별 처리
          if (refreshToken) {
            console.warn(
              "[DEBUG OAuthSuccessPage] refreshToken만 존재, accessToken 새로고침 시도"
            );
            // 여기서 refreshToken으로 accessToken을 가져오는 로직을 추가할 수 있음
            setError("액세스 토큰이 없습니다. 다시 로그인해주세요.");
          } else {
            setError(
              "토큰 교환에 실패했습니다. 백엔드 응답에 토큰이 없습니다."
            );
          }
          setLoading(false);
          return;
        }

        // JWT 토큰 저장 (localStorage와 tokenManager 모두에 저장)
        localStorage.setItem("accessToken", accessToken);
        tokenManager.setAccessToken(accessToken);

        // refreshToken이 있으면 저장
        if (refreshToken) {
          localStorage.setItem("refreshToken", refreshToken);
          tokenManager.setRefreshToken(refreshToken);
        }

        console.log(
          "[DEBUG OAuthSuccessPage] 토큰 저장 완료 (localStorage & tokenManager)"
        );

        // JWT에서 사용자 정보 디코딩 또는 API 응답에서 사용자 정보 사용
        let finalUserInfo;
        if (userInfo) {
          // API 응답에 사용자 정보가 포함된 경우
          finalUserInfo = {
            id: userInfo.id,
            email: userInfo.email,
            name: userInfo.name,
            profilePictureUrl: userInfo.profilePictureUrl,
            mbti: userInfo.mbti,
            tags: userInfo.tags || [],
          };
          console.log(
            "[DEBUG OAuthSuccessPage] API에서 사용자 정보 획득:",
            finalUserInfo
          );
        } else {
          // JWT에서 사용자 정보 디코딩 (fallback)
          try {
            const payload = JSON.parse(atob(accessToken.split(".")[1]));
            finalUserInfo = {
              id: payload.sub || payload.userId,
              email: payload.email,
              name: payload.username || payload.name || payload.given_name,
              profilePictureUrl: payload.picture || payload.profilePictureUrl,
              mbti: payload.mbti,
              tags: payload.tags || [],
            };
            console.log(
              "[DEBUG OAuthSuccessPage] JWT에서 사용자 정보 디코딩:",
              finalUserInfo
            );
          } catch (jwtError) {
            console.error(
              "[DEBUG OAuthSuccessPage] JWT 디코딩 실패:",
              jwtError
            );
            setError("사용자 정보 처리 중 오류가 발생했습니다.");
            setLoading(false);
            return;
          }
        }

        // AuthContext의 login 함수 호출
        await login(finalUserInfo);

        console.log("[DEBUG OAuthSuccessPage] AuthContext login 완료");

        // 워크스페이스 목록 새로고침
        await refreshWorkspaces();
        console.log("[DEBUG OAuthSuccessPage] 워크스페이스 새로고침 완료");

        // 초대 코드가 있으면 처리
        const pendingInviteCode = sessionStorage.getItem("pendingInviteCode");
        if (pendingInviteCode) {
          console.log(
            "[DEBUG OAuthSuccessPage] 초대 코드 발견:",
            pendingInviteCode
          );
          sessionStorage.removeItem("pendingInviteCode");
          // 초대 코드 처리 로직을 여기에 추가하거나, 메인 페이지에서 처리하도록 함
          navigate(`/?inviteCode=${pendingInviteCode}`, { replace: true });
          return;
        }

        // 메인 페이지로 이동
        console.log("[DEBUG OAuthSuccessPage] 메인 페이지로 이동");
        navigate("/", { replace: true });
      } catch (error) {
        console.error("[DEBUG OAuthSuccessPage] 전체 처리 실패:", error);

        let errorMessage = "OAuth 처리 중 오류가 발생했습니다.";

        if (error instanceof UserApiError) {
          errorMessage = `OAuth 인증 실패 (${error.status}): ${error.message}`;

          // 특정 에러 코드에 대한 추가 정보
          if (error.status === 400) {
            errorMessage += " (잘못된 임시 코드)";
          } else if (error.status === 401) {
            errorMessage += " (인증 실패)";
          } else if (error.status === 404) {
            errorMessage += " (사용자를 찾을 수 없음)";
          } else if (error.status >= 500) {
            errorMessage += " (서버 오류)";
          }
        } else if (error instanceof Error) {
          errorMessage = `OAuth 처리 오류: ${error.message}`;
        }

        console.error(
          "[DEBUG OAuthSuccessPage] 최종 에러 메시지:",
          errorMessage
        );
        setError(errorMessage);
        setLoading(false);
      }
    };

    handleOAuthSuccess();
  }, [searchParams, navigate, login, refreshWorkspaces]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-lg font-medium text-neutral-700">
            로그인을 완료하는 중...
          </p>
          <p className="text-sm text-neutral-500 mt-2">잠시만 기다려주세요.</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50">
        <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-md text-center">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-neutral-900 mb-4">
            로그인 실패
          </h2>
          <p className="text-sm text-neutral-600 mb-6">{error}</p>
          <button
            onClick={() => navigate("/login")}
            className="w-full bg-primary text-white py-2 px-4 rounded-md hover:bg-primary-dark transition-colors"
          >
            로그인 페이지로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  return null;
};
