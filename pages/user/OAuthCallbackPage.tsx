import React, { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../../AuthContext";
import { tokenManager } from "../../services/tokenManager";

type CallbackStatus = "loading" | "success" | "error";

export const OAuthCallbackPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { provider } = useParams<{ provider: string }>();
  const auth = useAuth();

  console.log("[DEBUG OAuthCallbackPage] 페이지 로드됨!");
  console.log(
    "[DEBUG OAuthCallbackPage] 현재 URL:",
    location.pathname + location.search
  );
  console.log("[DEBUG OAuthCallbackPage] provider:", provider);
  console.log(
    "[DEBUG OAuthCallbackPage] URL params:",
    new URLSearchParams(location.search).toString()
  );

  const [status, setStatus] = useState<CallbackStatus>("loading");
  const [message, setMessage] = useState("OAuth 로그인 처리 중...");

  useEffect(() => {
    const processOAuthCallback = async () => {
      try {
        const urlParams = new URLSearchParams(location.search);
        const code = urlParams.get("code");
        const error = urlParams.get("error");
        // const state = urlParams.get("state"); // 향후 CSRF 방지용으로 사용 예정

        // 에러가 있는 경우 (사용자가 취소하거나 OAuth 제공자에서 에러 발생)
        if (error) {
          setStatus("error");
          if (error === "access_denied") {
            setMessage("로그인이 취소되었습니다.");
          } else {
            setMessage(`OAuth 로그인 실패: ${error}`);
          }
          return;
        }

        // Authorization Code가 없는 경우
        if (!code) {
          setStatus("error");
          setMessage("OAuth 인증 코드를 받지 못했습니다.");
          return;
        }

        // 지원하지 않는 OAuth 제공자인 경우
        if (!provider || !["google", "kakao"].includes(provider)) {
          setStatus("error");
          setMessage("지원하지 않는 OAuth 제공자입니다.");
          return;
        }

        // 백엔드에서 OAuth 콜백을 처리하고 JWT 토큰을 받음
        // 백엔드 API를 호출해서 토큰과 사용자 정보를 받아옴
        try {
          const response = await fetch(
            `http://localhost:8081/api/auth/oauth/${provider}/callback?code=${code}`,
            {
              method: "GET",
              credentials: "include",
            }
          );

          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }

          const result = await response.json();

          if (result.success && result.data) {
            // JWT 토큰을 tokenManager를 통해 저장
            tokenManager.setAccessToken(result.data.accessToken);
            tokenManager.setRefreshToken(result.data.refreshToken);

            // JWT 토큰에서 사용자 정보 추출 (간단한 디코딩)
            try {
              const base64Url = result.data.accessToken.split(".")[1];
              const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
              const jsonPayload = decodeURIComponent(
                atob(base64)
                  .split("")
                  .map(
                    (c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2)
                  )
                  .join("")
              );
              const payload = JSON.parse(jsonPayload);

              // 사용자 정보 객체 생성 (User 타입에 맞춤)
              const user = {
                id: payload.sub,
                email: payload.email,
                name: payload.name,
                role: "USER",
                profileImageUrl: null,
                githubUrl: undefined,
                linkedinUrl: undefined,
                portfolioUrl: undefined,
                age: undefined,
                bio: undefined,
                skills: [],
                interests: [],
              };

              // AuthContext의 login 메서드로 로그인 처리
              console.log("[DEBUG OAuth] auth.login 호출 시작:", user);
              console.log("[DEBUG OAuth] 현재 auth 상태:", {
                isAuthenticated: auth.isAuthenticated,
                currentUser: auth.currentUser,
                workspaces: auth.workspaces,
                loading: auth.loading,
              });

              await auth.login(user);

              console.log("[DEBUG OAuth] auth.login 완료");
              console.log("[DEBUG OAuth] 로그인 후 auth 상태:", {
                isAuthenticated: auth.isAuthenticated,
                currentUser: auth.currentUser,
                workspaces: auth.workspaces,
                loading: auth.loading,
              });

              setStatus("success");
              setMessage("OAuth 로그인이 완료되었습니다.");

              // 로그인 처리가 완료된 후 약간의 지연 후 이동
              setTimeout(() => {
                console.log("[DEBUG OAuth] 페이지 이동 시작");
                console.log("[DEBUG OAuth] 이동 전 최종 auth 상태:", {
                  isAuthenticated: auth.isAuthenticated,
                  currentUser: auth.currentUser,
                  workspaces: auth.workspaces,
                  loading: auth.loading,
                });

                // 임시로 페이지 이동을 막고 로그만 확인
                console.log("[DEBUG OAuth] 페이지 이동 실행 예정...");

                // 초대 코드가 있는지 확인 (로그인 전에 있었던 경우)
                const inviteCode = sessionStorage.getItem("pendingInviteCode");
                if (inviteCode) {
                  sessionStorage.removeItem("pendingInviteCode");
                  console.log("[DEBUG OAuth] 초대 코드로 이동:", inviteCode);
                  navigate(`/?inviteCode=${inviteCode}`, { replace: true });
                } else {
                  // 기본적으로 홈페이지로 이동 (App.tsx에서 적절히 라우팅 처리)
                  console.log("[DEBUG OAuth] 메인 페이지로 이동");
                  navigate("/", { replace: true });
                }
              }, 2000);
            } catch (decodeError) {
              console.error("JWT 토큰 디코딩 실패:", decodeError);
              setStatus("error");
              setMessage("로그인 정보 처리 중 오류가 발생했습니다.");
              return;
            }
          } else {
            setStatus("error");
            setMessage(result.message || "OAuth 로그인에 실패했습니다.");
            return;
          }
        } catch (error) {
          console.error("OAuth 콜백 API 호출 실패:", error);
          setStatus("error");
          setMessage("OAuth 로그인 처리 중 오류가 발생했습니다.");
          return;
        }

        // 이미 위에서 성공/실패 처리가 완료됨
      } catch (err) {
        console.error("OAuth 콜백 처리 오류:", err);
        setStatus("error");
        setMessage("OAuth 로그인 처리 중 오류가 발생했습니다.");
      }
    };

    processOAuthCallback();
  }, [location, navigate, provider, auth]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-primary">PickTeam</h1>
          <div className="mt-8">
            <div className={`oauth-callback-container ${status}`}>
              <div className={`status-message ${status}`}>
                {status === "loading" && (
                  <div className="flex flex-col items-center">
                    <div className="spinner mb-4">
                      <div className="border-4 border-neutral-200 border-t-primary rounded-full w-8 h-8 animate-spin"></div>
                    </div>
                    <p className="text-neutral-600">{message}</p>
                  </div>
                )}

                {status === "success" && (
                  <div className="flex flex-col items-center">
                    <div className="mb-4 w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                      <svg
                        className="w-5 h-5 text-green-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    </div>
                    <p className="text-green-700 font-medium">{message}</p>
                    <p className="text-sm text-neutral-600 mt-2">
                      잠시 후 자동으로 이동합니다...
                    </p>
                  </div>
                )}

                {status === "error" && (
                  <div className="flex flex-col items-center">
                    <div className="mb-4 w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                      <svg
                        className="w-5 h-5 text-red-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </div>
                    <p className="text-red-700 font-medium">{message}</p>
                    <button
                      onClick={() => navigate("/login", { replace: true })}
                      className="mt-4 px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark transition-colors"
                    >
                      로그인 페이지로 돌아가기
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
