import React, { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../../AuthContext";
import { tokenManager } from "../../services/tokenManager";
import { userControllerApi } from "../../services/user-controller";

type CallbackStatus = "loading" | "success" | "error";

export const OAuthCallbackPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { provider } = useParams<{ provider: string }>();
  const auth = useAuth();

  const [status, setStatus] = useState<CallbackStatus>("loading");
  const [message, setMessage] = useState("OAuth 로그인 처리 중...");

  useEffect(() => {
    const processOAuthCallback = async () => {
      try {
        const urlParams = new URLSearchParams(location.search);
        const code = urlParams.get("code");
        const error = urlParams.get("error");
        const tempCode = urlParams.get("tempCode"); // 백엔드에서 설정한 임시 코드

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

        // 지원하지 않는 OAuth 제공자인 경우
        if (!provider || !["google", "kakao"].includes(provider)) {
          setStatus("error");
          setMessage("지원하지 않는 OAuth 제공자입니다.");
          return;
        }

        // 2단계 토큰 교환: tempCode 또는 code를 사용하여 실제 JWT 토큰 받기
        const exchangeCode = tempCode || code;
        if (!exchangeCode) {
          setStatus("error");
          setMessage("OAuth 인증 코드를 받지 못했습니다.");
          return;
        }

        try {
          // userControllerApi의 exchangeOAuthToken 사용하여 2단계 토큰 교환
          const result = await userControllerApi.exchangeOAuthToken(
            exchangeCode
          );

          if (result.success && result.token) {
            // JWT 토큰을 tokenManager를 통해 저장
            tokenManager.setAccessToken(result.token);
            if (result.refreshToken) {
              tokenManager.setRefreshToken(result.refreshToken);
            }

            // 사용자 정보 객체 생성
            let user;
            if (result.user) {
              // 백엔드에서 사용자 정보를 직접 제공한 경우
              user = {
                id: result.user.id.toString(),
                email: result.user.email,
                name: result.user.name,
                role: "USER" as const,
                profileImageUrl: result.user.profilePictureUrl || null,
                githubUrl: undefined,
                linkedinUrl: undefined,
                portfolioUrl: undefined,
                age: undefined,
                bio: undefined,
                skills: [],
                interests: [],
              };
            } else {
              // JWT 토큰에서 사용자 정보 추출 (fallback)
              try {
                const base64Url = result.token.split(".")[1];
                const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
                const jsonPayload = decodeURIComponent(
                  atob(base64)
                    .split("")
                    .map(
                      (c) =>
                        "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2)
                    )
                    .join("")
                );
                const payload = JSON.parse(jsonPayload);

                user = {
                  id: payload.sub,
                  email: payload.email,
                  name: payload.name,
                  role: "USER" as const,
                  profileImageUrl: null,
                  githubUrl: undefined,
                  linkedinUrl: undefined,
                  portfolioUrl: undefined,
                  age: undefined,
                  bio: undefined,
                  skills: [],
                  interests: [],
                };
              } catch (decodeError) {
                console.error("JWT 토큰 디코딩 실패:", decodeError);
                setStatus("error");
                setMessage("로그인 정보 처리 중 오류가 발생했습니다.");
                return;
              }
            }

            // AuthContext의 login 메서드로 로그인 처리
            await auth.login(user);

            setStatus("success");
            setMessage("OAuth 로그인이 완료되었습니다.");

            // 로그인 처리가 완료된 후 약간의 지연 후 이동
            setTimeout(() => {
              // 초대 코드가 있는지 확인 (로그인 전에 있었던 경우)
              const inviteCode = sessionStorage.getItem("pendingInviteCode");
              if (inviteCode) {
                sessionStorage.removeItem("pendingInviteCode");
                navigate(`/?inviteCode=${inviteCode}`, { replace: true });
              } else {
                // 기본적으로 홈페이지로 이동 (App.tsx에서 적절히 라우팅 처리)
                navigate("/", { replace: true });
              }
            }, 2000);
          } else {
            setStatus("error");
            setMessage(result.message || "OAuth 로그인에 실패했습니다.");
            return;
          }
        } catch (error) {
          console.error("OAuth 토큰 교환 실패:", error);
          setStatus("error");
          setMessage("OAuth 로그인 처리 중 오류가 발생했습니다.");
          return;
        }
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
