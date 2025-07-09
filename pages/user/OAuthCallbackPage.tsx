import React, { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../../AuthContext";

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
        // 실제로는 백엔드에서 이미 처리되어 여기로 리다이렉트됨
        setStatus("success");
        setMessage("OAuth 로그인이 완료되었습니다.");

        // 성공 메시지를 잠깐 보여준 후 메인 페이지로 이동
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
