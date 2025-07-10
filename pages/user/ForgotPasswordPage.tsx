import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button, Input, Card } from "../../components";
import {
  userControllerApi,
  UserApiError,
} from "../../services/user-controller/api";

export const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState("");
  const [resetCode, setResetCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [currentStep, setCurrentStep] = useState<"email" | "code" | "password">(
    "email"
  );
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  const navigate = useNavigate();

  // 재전송 쿨다운 타이머
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (resendCooldown > 0) {
      timer = setTimeout(() => {
        setResendCooldown(resendCooldown - 1);
      }, 1000);
    }
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  // 이메일 유효성 검사
  const isValidEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // 1단계: 비밀번호 재설정 이메일 발송
  const handleSendResetEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    // 이메일 유효성 검사
    if (!isValidEmail(email)) {
      setError("올바른 이메일 주소를 입력해주세요.");
      return;
    }

    setLoading(true);

    try {
      await userControllerApi.sendPasswordResetEmail({ email });
      setSuccess(
        "비밀번호 재설정 이메일이 발송되었습니다. 이메일을 확인해주세요."
      );
      setCurrentStep("code");
      setResendCooldown(60); // 60초 쿨다운
    } catch (err) {
      if (err instanceof UserApiError) {
        setError(err.message);
      } else {
        setError("이메일 발송에 실패했습니다. 이메일 주소를 확인해주세요.");
      }
    } finally {
      setLoading(false);
    }
  };

  // 이메일 재전송
  const handleResendEmail = async () => {
    if (resendCooldown > 0) return;

    setError("");
    setLoading(true);

    try {
      await userControllerApi.sendPasswordResetEmail({ email });
      setSuccess("인증 코드가 다시 발송되었습니다.");
      setResendCooldown(60);
    } catch (err) {
      if (err instanceof UserApiError) {
        setError(err.message);
      } else {
        setError("이메일 재전송에 실패했습니다.");
      }
    } finally {
      setLoading(false);
    }
  };

  // 2단계: 재설정 코드 확인
  const handleVerifyResetCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const response = await userControllerApi.verifyResetCode({
        email,
        resetCode,
      });

      if (response.valid) {
        setSuccess(
          "인증 코드가 확인되었습니다. 새로운 비밀번호를 설정해주세요."
        );
        setCurrentStep("password");
      } else {
        setError(response.message || "인증 코드가 올바르지 않습니다.");
      }
    } catch (err) {
      if (err instanceof UserApiError) {
        setError(err.message);
      } else {
        setError("인증 코드 확인에 실패했습니다. 다시 시도해주세요.");
      }
    } finally {
      setLoading(false);
    }
  };

  // 3단계: 새 비밀번호 설정
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    // 비밀번호 확인
    if (newPassword !== confirmPassword) {
      setError("비밀번호가 일치하지 않습니다.");
      return;
    }

    if (newPassword.length < 8) {
      setError("비밀번호는 8자 이상이어야 합니다.");
      return;
    }

    // 비밀번호 강도 검사
    const hasUpperCase = /[A-Z]/.test(newPassword);
    const hasLowerCase = /[a-z]/.test(newPassword);
    const hasNumbers = /\d/.test(newPassword);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(newPassword);

    if (!hasUpperCase || !hasLowerCase || !hasNumbers || !hasSpecialChar) {
      setError(
        "비밀번호는 대문자, 소문자, 숫자, 특수문자를 모두 포함해야 합니다."
      );
      return;
    }

    setLoading(true);

    try {
      await userControllerApi.resetPassword({
        email,
        resetCode,
        newPassword,
      });

      setSuccess(
        "비밀번호가 성공적으로 재설정되었습니다. 로그인 페이지로 이동합니다."
      );

      // 2초 후 로그인 페이지로 이동
      setTimeout(() => {
        navigate("/login", { state: { email } });
      }, 2000);
    } catch (err) {
      if (err instanceof UserApiError) {
        setError(err.message);
      } else {
        setError("비밀번호 재설정에 실패했습니다. 다시 시도해주세요.");
      }
    } finally {
      setLoading(false);
    }
  };

  const renderEmailStep = () => (
    <Card title="비밀번호 찾기">
      {/* 진행률 표시 */}
      <div className="mb-6">
        <div className="flex items-center justify-between text-xs text-neutral-500 mb-2">
          <span>단계 1/3</span>
          <span>이메일 인증</span>
        </div>
        <div className="w-full bg-neutral-200 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full"
            style={{ width: "33%" }}
          ></div>
        </div>
      </div>

      <div className="mb-4">
        <p className="text-sm text-neutral-600">
          가입하신 이메일 주소를 입력해주세요. 비밀번호 재설정 링크를
          보내드립니다.
        </p>
      </div>
      <form onSubmit={handleSendResetEmail} className="space-y-6">
        <Input
          label="이메일 주소"
          name="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
        />

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-700 text-center">{error}</p>
          </div>
        )}

        {success && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm text-green-700 text-center">{success}</p>
          </div>
        )}

        <Button
          type="submit"
          className="w-full"
          variant="primary"
          disabled={loading || !email || !isValidEmail(email)}
        >
          {loading ? "이메일 발송 중..." : "재설정 이메일 발송"}
        </Button>

        <div className="text-center">
          <Link
            to="/login"
            className="text-sm text-neutral-600 hover:text-neutral-800"
          >
            로그인으로 돌아가기
          </Link>
        </div>
      </form>
    </Card>
  );

  const renderCodeStep = () => (
    <Card title="인증 코드 입력">
      {/* 진행률 표시 */}
      <div className="mb-6">
        <div className="flex items-center justify-between text-xs text-neutral-500 mb-2">
          <span>단계 2/3</span>
          <span>코드 확인</span>
        </div>
        <div className="w-full bg-neutral-200 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full"
            style={{ width: "66%" }}
          ></div>
        </div>
      </div>

      <div className="mb-4">
        <p className="text-sm text-neutral-600">
          <strong>{email}</strong>로 발송된 6자리 인증 코드를 입력해주세요.
        </p>
        <p className="text-xs text-neutral-500 mt-2">
          이메일이 오지 않았나요? 스팸함을 확인해보세요.
        </p>
      </div>
      <form onSubmit={handleVerifyResetCode} className="space-y-6">
        <Input
          label="인증 코드"
          name="resetCode"
          type="text"
          maxLength={6}
          required
          value={resetCode}
          onChange={(e) => setResetCode(e.target.value.replace(/\D/g, ""))} // 숫자만 입력
          placeholder="123456"
          className="text-center text-lg tracking-widest font-mono"
        />

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-700 text-center">{error}</p>
          </div>
        )}

        {success && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm text-green-700 text-center">{success}</p>
          </div>
        )}

        <div className="flex space-x-3">
          <Button
            type="button"
            className="flex-1"
            variant="outline"
            onClick={() => {
              setCurrentStep("email");
              setError("");
              setSuccess("");
            }}
          >
            이전
          </Button>
          <Button
            type="submit"
            className="flex-1"
            variant="primary"
            disabled={loading || resetCode.length !== 6}
          >
            {loading ? "확인 중..." : "코드 확인"}
          </Button>
        </div>

        <div className="text-center">
          <button
            type="button"
            onClick={handleResendEmail}
            disabled={resendCooldown > 0 || loading}
            className="text-sm text-blue-600 hover:text-blue-800 disabled:text-neutral-400 disabled:cursor-not-allowed"
          >
            {resendCooldown > 0
              ? `${resendCooldown}초 후 재전송 가능`
              : "인증 코드 재전송"}
          </button>
        </div>
      </form>
    </Card>
  );

  const renderPasswordStep = () => (
    <Card title="새 비밀번호 설정">
      {/* 진행률 표시 */}
      <div className="mb-6">
        <div className="flex items-center justify-between text-xs text-neutral-500 mb-2">
          <span>단계 3/3</span>
          <span>비밀번호 설정</span>
        </div>
        <div className="w-full bg-neutral-200 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full"
            style={{ width: "100%" }}
          ></div>
        </div>
      </div>

      <div className="mb-4">
        <p className="text-sm text-neutral-600">
          새로운 비밀번호를 입력해주세요.
        </p>
        <div className="mt-2 text-xs text-neutral-500">
          <p>비밀번호 요구사항:</p>
          <ul className="list-disc list-inside mt-1 space-y-1">
            <li>8자 이상</li>
            <li>대문자, 소문자, 숫자, 특수문자 포함</li>
          </ul>
        </div>
      </div>
      <form onSubmit={handleResetPassword} className="space-y-6">
        <Input
          label="새 비밀번호"
          name="newPassword"
          type="password"
          autoComplete="new-password"
          required
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          placeholder="새 비밀번호를 입력하세요"
        />

        <Input
          label="비밀번호 확인"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          required
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder="비밀번호를 다시 입력하세요"
        />

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-700 text-center">{error}</p>
          </div>
        )}

        {success && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm text-green-700 text-center">{success}</p>
          </div>
        )}

        <div className="flex space-x-3">
          <Button
            type="button"
            className="flex-1"
            variant="outline"
            onClick={() => {
              setCurrentStep("code");
              setError("");
              setSuccess("");
            }}
          >
            이전
          </Button>
          <Button
            type="submit"
            className="flex-1"
            variant="primary"
            disabled={loading || !newPassword || !confirmPassword}
          >
            {loading ? "설정 중..." : "비밀번호 재설정"}
          </Button>
        </div>
      </form>
    </Card>
  );

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {currentStep === "email" && renderEmailStep()}
        {currentStep === "code" && renderCodeStep()}
        {currentStep === "password" && renderPasswordStep()}
      </div>
    </div>
  );
};
