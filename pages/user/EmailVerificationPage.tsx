import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { Button, Input, Card } from "../../components";
import {
  userControllerApi,
  UserApiError,
} from "../../services/user-controller";

export const EmailVerificationPage: React.FC = () => {
  const [verificationCode, setVerificationCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const email = searchParams.get("email");

  // 이메일이 없으면 회원가입 페이지로 리다이렉트
  useEffect(() => {
    if (!email) {
      navigate("/signup");
    }
  }, [email, navigate]);

  // 인증 코드 검증
  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!verificationCode.trim()) {
      setError("인증 코드를 입력해주세요.");
      return;
    }

    if (!email) {
      setError("이메일 정보를 찾을 수 없습니다.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const isVerified = await userControllerApi.verifyEmail({
        email,
        verificationCode: verificationCode.trim(),
      });

      if (isVerified) {
        setSuccess(true);
        // 2초 후 로그인 페이지로 이동
        setTimeout(() => {
          navigate("/login", { state: { email } });
        }, 2000);
      } else {
        setError("인증 코드가 올바르지 않습니다. 다시 확인해주세요.");
      }
    } catch (err) {
      if (err instanceof UserApiError) {
        if (err.status === 400) {
          setError("잘못된 인증 코드입니다. 다시 입력해주세요.");
        } else if (err.status === 410) {
          setError(
            "인증 코드가 만료되었습니다. 새로운 인증 코드를 요청해주세요."
          );
        } else {
          setError(err.message || "인증 중 오류가 발생했습니다.");
        }
      } else {
        setError("인증 중 예상치 못한 오류가 발생했습니다.");
      }
    } finally {
      setLoading(false);
    }
  };

  // 인증 메일 재전송
  const handleResendEmail = async () => {
    if (!email) return;

    setResendLoading(true);
    setError("");

    try {
      await userControllerApi.requestEmailVerification({ email });
      alert(`인증 메일이 ${email}로 재전송되었습니다.`);
    } catch (err) {
      if (err instanceof UserApiError) {
        setError(err.message || "인증 메일 재전송 중 오류가 발생했습니다.");
      } else {
        setError("인증 메일 재전송 중 예상치 못한 오류가 발생했습니다.");
      }
    } finally {
      setResendLoading(false);
    }
  };

  // 성공 화면
  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50 py-12 px-4 sm:px-6 lg:px-8">
        <Card title="이메일 인증 완료">
          <div className="text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-8 h-8 text-green-600"
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
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              이메일 인증이 완료되었습니다!
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              환영합니다! <strong>{email?.split("@")[0]}</strong>님
            </p>
            <p className="text-sm text-gray-600 mb-6">
              이제 PickTeam의 모든 기능을 사용하실 수 있습니다.
            </p>
            <div className="space-y-3">
              <Button
                onClick={() => navigate("/login", { state: { email } })}
                variant="primary"
                className="w-full"
              >
                로그인하러 가기
              </Button>
              <p className="text-xs text-gray-500">
                잠시 후 로그인 페이지로 자동 이동됩니다...
              </p>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-primary">PickTeam</h1>
          <p className="mt-2 text-neutral-600">이메일 인증을 완료해주세요</p>
        </div>

        <Card title="이메일 인증">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-8 h-8 text-blue-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              인증 코드를 입력해주세요
            </h3>
            <p className="text-sm text-gray-600 mb-2">
              <strong>{email}</strong>로 전송된 인증 코드를 입력해주세요.
            </p>
            <p className="text-xs text-gray-500">
              메일이 오지 않았다면 스팸 메일함을 확인해보세요.
            </p>
          </div>

          <form onSubmit={handleVerifyCode} className="space-y-4">
            <Input
              label="인증 코드"
              name="verificationCode"
              type="text"
              required
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value)}
              placeholder="6자리 인증 코드를 입력하세요"
              className="text-center text-lg tracking-widest"
              maxLength={6}
            />

            {error && (
              <p className="text-sm text-red-500 text-center">{error}</p>
            )}

            <Button
              type="submit"
              variant="primary"
              className="w-full"
              disabled={loading || !verificationCode.trim()}
            >
              {loading ? "인증 중..." : "인증 완료"}
            </Button>
          </form>

          <div className="mt-6 space-y-3">
            <div className="text-center">
              <Button
                onClick={handleResendEmail}
                variant="ghost"
                className="text-sm"
                disabled={resendLoading}
              >
                {resendLoading ? "전송 중..." : "인증 코드 재전송"}
              </Button>
            </div>

            <div className="text-center">
              <p className="text-sm text-gray-500">
                이메일 주소가 잘못되었나요?{" "}
                <Link
                  to="/signup"
                  className="font-medium text-primary hover:text-primary-dark"
                >
                  다시 회원가입하기
                </Link>
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};
