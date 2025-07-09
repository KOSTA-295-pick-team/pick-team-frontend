import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../../AuthContext";
import { tokenManager } from "../../services/tokenManager";

/**
 * OAuth 성공 페이지
 * 백엔드에서 OAuth 인증 완료 후 토큰과 함께 리디렉션되는 페이지
 */
export const OAuthSuccessPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { login, refreshWorkspaces } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const handleOAuthSuccess = async () => {
      try {
        console.log("[DEBUG OAuthSuccessPage] 시작");

        // URL 파라미터에서 토큰 추출
        const accessToken = searchParams.get("accessToken");
        const refreshToken = searchParams.get("refreshToken");

        console.log("[DEBUG OAuthSuccessPage] 파라미터:", {
          accessToken: accessToken ? "존재" : "없음",
          refreshToken: refreshToken ? "존재" : "없음",
        });

        if (!accessToken) {
          console.error("[DEBUG OAuthSuccessPage] accessToken이 없습니다");
          setError("OAuth 인증에 실패했습니다. 토큰이 없습니다.");
          setLoading(false);
          return;
        }

        // 토큰 저장 (localStorage와 tokenManager 모두에 저장)
        localStorage.setItem("accessToken", accessToken);
        tokenManager.setAccessToken(accessToken);

        if (refreshToken) {
          localStorage.setItem("refreshToken", refreshToken);
          tokenManager.setRefreshToken(refreshToken);
        }

        console.log(
          "[DEBUG OAuthSuccessPage] 토큰 저장 완료 (localStorage & tokenManager)"
        );

        // JWT에서 사용자 정보 디코딩
        try {
          const payload = JSON.parse(atob(accessToken.split(".")[1]));
          console.log("[DEBUG OAuthSuccessPage] JWT 디코딩 성공:", payload);

          // AuthContext의 login 함수 호출
          await login({
            id: payload.sub || payload.userId,
            email: payload.email,
            name: payload.username || payload.name || payload.given_name,
            profilePictureUrl: payload.picture || payload.profilePictureUrl,
            mbti: payload.mbti,
            tags: payload.tags || [],
          });

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
        } catch (jwtError) {
          console.error("[DEBUG OAuthSuccessPage] JWT 디코딩 실패:", jwtError);
          setError("토큰 처리 중 오류가 발생했습니다.");
          setLoading(false);
        }
      } catch (error) {
        console.error("[DEBUG OAuthSuccessPage] 전체 처리 실패:", error);
        setError("OAuth 처리 중 오류가 발생했습니다.");
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
