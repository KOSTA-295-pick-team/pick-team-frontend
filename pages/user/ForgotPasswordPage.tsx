import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button, Input, Card } from "../../components";

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

  const navigate = useNavigate();

  // 1단계: 비밀번호 재설정 이메일 발송
  const handleSendResetEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      // TODO: 백엔드 API 연결
      // await authApi.sendPasswordResetEmail({ email });

      // 임시로 성공 처리
      setSuccess("비밀번호 재설정 이메일이 발송되었습니다.");
      setCurrentStep("code");
    } catch (err) {
      setError("이메일 발송에 실패했습니다. 이메일 주소를 확인해주세요.");
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
      // TODO: 백엔드 API 연결
      // await authApi.verifyResetCode({ email, resetCode });

      // 임시로 성공 처리
      setSuccess("인증 코드가 확인되었습니다.");
      setCurrentStep("password");
    } catch (err) {
      setError("인증 코드가 올바르지 않습니다.");
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

    setLoading(true);

    try {
      // TODO: 백엔드 API 연결
      // await authApi.resetPassword({ email, resetCode, newPassword });

      // 임시로 성공 처리
      setSuccess("비밀번호가 성공적으로 재설정되었습니다.");

      // 2초 후 로그인 페이지로 이동
      setTimeout(() => {
        navigate("/login", { state: { email } });
      }, 2000);
    } catch (err) {
      setError("비밀번호 재설정에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const renderEmailStep = () => (
    <Card title="비밀번호 찾기">
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
          disabled={loading || !email}
        >
          {loading ? "이메일 발송 중..." : "재설정 이메일 발송"}
        </Button>
      </form>
    </Card>
  );

  const renderCodeStep = () => (
    <Card title="인증 코드 입력">
      <div className="mb-4">
        <p className="text-sm text-neutral-600">
          <strong>{email}</strong>로 발송된 6자리 인증 코드를 입력해주세요.
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
          onChange={(e) => setResetCode(e.target.value)}
          placeholder="123456"
          className="text-center text-lg tracking-widest"
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
            onClick={() => setCurrentStep("email")}
          >
            이전
          </Button>
          <Button
            type="submit"
            className="flex-1"
            variant="primary"
            disabled={loading || resetCode.length !== 6}
          >
            {loading ? "확인 중..." : "인증 코드 확인"}
          </Button>
        </div>

        <div className="text-center">
          <Button
            type="button"
            variant="ghost"
            className="text-sm text-neutral-600 hover:text-neutral-800"
            onClick={() => setCurrentStep("email")}
          >
            인증 코드를 받지 못하셨나요? 다시 발송
          </Button>
        </div>
      </form>
    </Card>
  );

  const renderPasswordStep = () => (
    <Card title="새 비밀번호 설정">
      <div className="mb-4">
        <p className="text-sm text-neutral-600">
          새로운 비밀번호를 설정해주세요.
        </p>
      </div>
      <form onSubmit={handleResetPassword} className="space-y-6">
        <Input
          label="새 비밀번호"
          name="newPassword"
          type="password"
          required
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          placeholder="8자 이상, 대소문자, 숫자 포함"
        />

        <Input
          label="새 비밀번호 확인"
          name="confirmPassword"
          type="password"
          required
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder="새 비밀번호를 다시 입력해주세요"
        />

        {confirmPassword && (
          <p
            className={`text-xs ${
              newPassword === confirmPassword
                ? "text-green-500"
                : "text-red-500"
            }`}
          >
            {newPassword === confirmPassword
              ? "비밀번호가 일치합니다."
              : "비밀번호가 일치하지 않습니다."}
          </p>
        )}

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-700 text-center">{error}</p>
          </div>
        )}

        {success && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm text-green-700 text-center">{success}</p>
            <p className="text-xs text-green-600 mt-1 text-center">
              잠시 후 로그인 페이지로 이동합니다...
            </p>
          </div>
        )}

        <Button
          type="submit"
          className="w-full"
          variant="primary"
          disabled={
            loading ||
            !newPassword ||
            !confirmPassword ||
            newPassword !== confirmPassword ||
            newPassword.length < 8
          }
        >
          {loading ? "비밀번호 재설정 중..." : "비밀번호 재설정 완료"}
        </Button>
      </form>
    </Card>
  );

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-primary">PickTeam</h1>
          <p className="mt-2 text-neutral-600">비밀번호를 재설정하세요</p>
        </div>

        {currentStep === "email" && renderEmailStep()}
        {currentStep === "code" && renderCodeStep()}
        {currentStep === "password" && renderPasswordStep()}

        <div className="text-center">
          <Link
            to="/login"
            className="text-sm text-neutral-600 hover:text-neutral-800"
          >
            ← 로그인으로 돌아가기
          </Link>
        </div>
      </div>
    </div>
  );
};
