import React, { useState, useEffect } from "react";
import {
  Link,
  useNavigate,
  useLocation,
  useSearchParams,
} from "react-router-dom";
import { useAuth } from "../AuthContext";
import { Button, Input, Card } from "../components";
import { userControllerApi, UserApiError } from "../services/user-controller";

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [localError, setLocalError] = useState(""); // 로컬 에러 (워크스페이스 참여 실패 등)
  const [loading, setLoading] = useState(false);
  const auth = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const inviteCode = searchParams.get("inviteCode");
  const from = location.state?.from?.pathname || "/"; // Default to root, App.tsx will handle initial redirect

  // AuthContext의 에러와 로컬 에러 중 하나라도 있으면 표시
  const displayError = auth.error || localError;

  // 회원가입에서 넘어온 이메일 자동 입력
  useEffect(() => {
    if (location.state?.email) {
      setEmail(location.state.email);
    }
  }, [location.state]);

  useEffect(() => {
    if (inviteCode) {
      // 초대 코드가 있으면 사용자에게 알림
      console.log("초대 코드로 접속:", inviteCode);
    }
  }, [inviteCode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    auth.setError(null); // AuthContext 에러 초기화
    setLocalError(""); // 로컬 에러 초기화
    setLoading(true);

    try {
      // UserController API의 향상된 로그인 사용
      await auth.loginWithCredentials(email, password);

      // 초대 코드가 있으면 워크스페이스 참여 진행
      if (inviteCode) {
        try {
          const workspace = await auth.joinWorkspace({
            inviteCode: inviteCode,
            password: undefined,
          });

          if (workspace) {
            auth.setCurrentWorkspace(workspace);
            navigate(`/ws/${workspace.id}`, { replace: true });
            return;
          }
        } catch (err) {
          console.error("Auto join after login error:", err);
          // 실패해도 일단 홈으로 이동하고, 수동으로 참여하도록 안내
          setLocalError(
            "로그인은 성공했지만 워크스페이스 참여에 실패했습니다. 수동으로 참여해주세요."
          );
        }
      }

      navigate(from, { replace: true });
    } catch (err) {
      // 에러 처리는 AuthContext에서 이미 처리됨
      // 여기서는 추가 처리만 수행
      console.error("로그인 페이지에서 오류:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-primary">PickTeam</h1>
          <p className="mt-2 text-neutral-600">
            팀 프로젝트 협업을 위한 최고의 선택
          </p>
          {inviteCode && (
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>워크스페이스 초대</strong>
              </p>
              <p className="text-xs text-blue-600 mt-1">
                로그인 후 자동으로 워크스페이스에 참여됩니다.
              </p>
              <p className="text-xs text-blue-500 mt-1">
                초대 코드: {inviteCode}
              </p>
            </div>
          )}
        </div>
        <Card title="로그인">
          <form className="space-y-6" onSubmit={handleSubmit}>
            <Input
              label="이메일 주소"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="test1@example.com"
            />
            <Input
              label="비밀번호"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="password"
            />
            {displayError && (
              <p className="text-sm text-red-500">{displayError}</p>
            )}
            <Button
              type="submit"
              className="w-full"
              variant="primary"
              disabled={loading}
            >
              {loading ? "로그인 중..." : "로그인"}
            </Button>
          </form>
          <div className="mt-6">
            <div className="text-sm text-center text-neutral-500 mb-4"></div>
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-neutral-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-neutral-500">또는</span>
              </div>
            </div>
            <div className="mt-6 grid grid-cols-2 gap-3">
              <Button variant="outline" className="w-full">
                <img
                  src="https://upload.wikimedia.org/wikipedia/commons/c/c1/Google_%22G%22_logo.svg"
                  alt="Google"
                  className="w-5 h-5 mr-2"
                />{" "}
                Google 로그인
              </Button>
              <Button
                variant="outline"
                className="w-full bg-[#FEE500] hover:bg-[#FEE500]/90 border-[#FEE500]"
              >
                <img
                  src="https://developers.kakao.com/tool/resource/static/img/button/symbol/kakaotalk_symbol.png"
                  alt="Kakao"
                  className="w-5 h-5 mr-2"
                />{" "}
                Kakao 로그인
              </Button>
            </div>
          </div>
          <p className="mt-8 text-center text-sm text-neutral-600">
            계정이 없으신가요?{" "}
            <Link
              to="/signup"
              className="font-medium text-primary hover:text-primary-dark"
            >
              회원가입
            </Link>
          </p>
        </Card>
      </div>
    </div>
  );
};

export const SignupPage: React.FC = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1); // 1: Form, 2: Email Sent
  const [isEmailDuplicate, setIsEmailDuplicate] = useState(false);
  const [passwordValidation, setPasswordValidation] = useState<{
    isValid: boolean;
    message?: string;
  } | null>(null);

  const navigate = useNavigate();

  // 이메일 중복 검사 (실시간)
  const checkEmailDuplicate = async (emailToCheck: string) => {
    if (!emailToCheck || !emailToCheck.includes("@")) return;

    try {
      const isDuplicate = await userControllerApi.checkDuplicateId({
        email: emailToCheck,
      });
      setIsEmailDuplicate(isDuplicate);
      if (isDuplicate) {
        setError("이미 사용 중인 이메일 주소입니다.");
      } else {
        setError("");
      }
    } catch (err) {
      console.warn("이메일 중복 검사 실패:", err);
    }
  };

  // 비밀번호 유효성 검사 (실시간)
  const validatePassword = async (passwordToCheck: string) => {
    if (!passwordToCheck) {
      setPasswordValidation(null);
      return;
    }

    try {
      const validation = await userControllerApi.validatePassword({
        password: passwordToCheck,
      });
      setPasswordValidation(validation);
      if (!validation.isValid && validation.message) {
        setError(validation.message);
      } else if (validation.isValid) {
        setError("");
      }
    } catch (err) {
      console.warn("비밀번호 유효성 검사 실패:", err);
    }
  };

  // 이메일 변경 시 중복 검사
  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newEmail = e.target.value;
    setEmail(newEmail);
    setError(""); // 기존 에러 초기화

    // 이메일이 있고 @가 포함되어 있을 때만 검사
    if (newEmail && newEmail.includes("@")) {
      // 디바운싱을 위한 타이머
      setTimeout(() => {
        checkEmailDuplicate(newEmail);
      }, 500);
    } else {
      setIsEmailDuplicate(false);
    }
  };

  // 비밀번호 변경 시 유효성 검사
  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newPassword = e.target.value;
    setPassword(newPassword);
    setError(""); // 기존 에러 초기화

    // 비밀번호가 있을 때만 검사
    if (newPassword) {
      // 디바운싱을 위한 타이머
      setTimeout(() => {
        validatePassword(newPassword);
      }, 500);
    } else {
      setPasswordValidation(null);
    }
  };

  // 회원가입 폼 제출
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    // 기본 유효성 검사
    if (password !== confirmPassword) {
      setError("비밀번호가 일치하지 않습니다.");
      setLoading(false);
      return;
    }

    if (isEmailDuplicate) {
      setError("이미 사용 중인 이메일 주소입니다.");
      setLoading(false);
      return;
    }

    if (passwordValidation && !passwordValidation.isValid) {
      setError(passwordValidation.message || "비밀번호가 유효하지 않습니다.");
      setLoading(false);
      return;
    }

    try {
      // 1. 회원가입 (백엔드 요구사항에 맞춰 confirmPassword 포함)
      await userControllerApi.registerUser({
        email,
        password,
        confirmPassword,
      });

      // 2. 이메일 인증 요청
      await userControllerApi.requestEmailVerification({ email });

      // 성공하면 이메일 발송 안내 단계로 이동
      setStep(2);
      console.log("회원가입 및 이메일 인증 요청 성공:", email);
    } catch (err) {
      console.error("회원가입 오류:", err);
      if (err instanceof UserApiError) {
        setError(err.message || "회원가입 중 오류가 발생했습니다.");
      } else {
        setError("회원가입 중 예상치 못한 오류가 발생했습니다.");
      }
    } finally {
      setLoading(false);
    }
  };

  // 이메일 발송 안내 화면 (step 2)
  if (step === 2) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50 py-12 px-4 sm:px-6 lg:px-8">
        <Card title="이메일 인증 메일 발송">
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
                  d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              인증 메일을 발송했습니다!
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              <strong>{email}</strong> 주소로 인증 메일을 발송했습니다.
            </p>
            <p className="text-sm text-gray-500 mb-6">
              메일함을 확인하고 인증을 완료해주세요.
              <br />
              메일이 오지 않았다면 스팸 메일함도 확인해보세요.
            </p>

            <div className="space-y-3">
              <Button
                onClick={() =>
                  navigate(
                    `/email-verification?email=${encodeURIComponent(email)}`
                  )
                }
                variant="primary"
                className="w-full"
              >
                인증 코드 입력하러 가기
              </Button>

              <Button
                onClick={() => setStep(1)}
                variant="ghost"
                className="w-full"
              >
                이메일 주소 변경
              </Button>

              <p className="text-xs text-gray-500">
                다른 탭에서 이메일을 확인한 후<br />위 버튼을 클릭하여 인증을
                완료하세요.
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
          <p className="mt-2 text-neutral-600">새로운 팀 경험을 시작하세요.</p>
        </div>
        <Card title="회원가입">
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <Input
                label="이메일 주소"
                name="email"
                type="email"
                required
                value={email}
                onChange={handleEmailChange}
                placeholder="you@example.com"
              />
              {isEmailDuplicate && (
                <p className="text-xs text-red-500 mt-1">
                  이미 사용 중인 이메일입니다.
                </p>
              )}
              {email && !isEmailDuplicate && email.includes("@") && (
                <p className="text-xs text-green-500 mt-1">
                  사용 가능한 이메일입니다.
                </p>
              )}
            </div>

            <div>
              <Input
                label="비밀번호"
                name="password"
                type="password"
                required
                value={password}
                onChange={handlePasswordChange}
                placeholder="8자 이상, 대소문자, 숫자 포함"
              />
              {passwordValidation && (
                <p
                  className={`text-xs mt-1 ${
                    passwordValidation.isValid
                      ? "text-green-500"
                      : "text-red-500"
                  }`}
                >
                  {passwordValidation.isValid
                    ? "유효한 비밀번호입니다."
                    : passwordValidation.message}
                </p>
              )}
            </div>

            <Input
              label="비밀번호 확인"
              name="confirmPassword"
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="비밀번호를 다시 입력해주세요"
            />

            {error && (
              <p className="text-sm text-red-500 text-center">{error}</p>
            )}

            <Button
              type="submit"
              className="w-full"
              variant="primary"
              disabled={
                loading ||
                isEmailDuplicate ||
                (passwordValidation !== null && !passwordValidation.isValid)
              }
            >
              {loading ? "가입 중..." : "이메일 인증하고 가입하기"}
            </Button>
          </form>
          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-neutral-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-neutral-500">또는</span>
              </div>
            </div>
            <div className="mt-6 grid grid-cols-2 gap-3">
              <Button variant="outline" className="w-full">
                <img
                  src="https://upload.wikimedia.org/wikipedia/commons/c/c1/Google_%22G%22_logo.svg"
                  alt="Google"
                  className="w-5 h-5 mr-2"
                />{" "}
                Google로 가입
              </Button>
              <Button
                variant="outline"
                className="w-full bg-[#FEE500] hover:bg-[#FEE500]/90 border-[#FEE500]"
              >
                <img
                  src="https://developers.kakao.com/tool/resource/static/img/button/symbol/kakaotalk_symbol.png"
                  alt="Kakao"
                  className="w-5 h-5 mr-2"
                />{" "}
                Kakao로 가입
              </Button>
            </div>
          </div>
          <p className="mt-8 text-center text-sm text-neutral-600">
            이미 계정이 있으신가요?{" "}
            <Link
              to="/login"
              className="font-medium text-primary hover:text-primary-dark"
            >
              로그인
            </Link>
          </p>
        </Card>
      </div>
    </div>
  );
};
