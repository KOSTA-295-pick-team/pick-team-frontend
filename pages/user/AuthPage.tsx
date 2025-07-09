import React, { useState, useEffect, useRef } from "react";
import {
  Link,
  useNavigate,
  useLocation,
  useSearchParams,
} from "react-router-dom";
import { useAuth } from "../../AuthContext";
import { Button, Input, Card } from "../../components";
import {
  userControllerApi,
  UserApiError,
} from "../../services/user-controller";
import {
  startOAuthLogin,
  handleOAuthError,
} from "../../services/user-controller/oauth";

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [localError, setLocalError] = useState(""); // 로컬 에러 (워크스페이스 참여 실패 등)
  const [loading, setLoading] = useState(false);

  // Caps Lock 상태 관리
  const [isCapsLockOn, setIsCapsLockOn] = useState(false);
  const [showCapsLockWarning, setShowCapsLockWarning] = useState(false);

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
    } finally {
      setLoading(false);
    }
  };

  // Caps Lock 감지 함수
  const detectCapsLock = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const capsLockOn = e.getModifierState("CapsLock");
    setIsCapsLockOn(capsLockOn);
  };

  // 비밀번호 필드 포커스 시 Caps Lock 경고 표시
  const handlePasswordFocus = () => {
    setShowCapsLockWarning(true);
  };

  // 비밀번호 필드 블러 시 Caps Lock 경고 숨김
  const handlePasswordBlur = () => {
    setShowCapsLockWarning(false);
  };

  // OAuth 로그인 핸들러
  const handleOAuthLogin = (provider: "google" | "kakao") => {
    try {
      // 초대 코드가 있으면 임시 저장 (OAuth 완료 후 사용)
      if (inviteCode) {
        sessionStorage.setItem("pendingInviteCode", inviteCode);
      }

      // OAuth 로그인 시작
      startOAuthLogin(provider);
    } catch (error) {
      const errorMessage = handleOAuthError(error as Error, provider);
      setLocalError(errorMessage);
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
            <div className="relative">
              <Input
                label="비밀번호"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={detectCapsLock}
                onFocus={handlePasswordFocus}
                onBlur={handlePasswordBlur}
                placeholder="password"
              />

              {/* Caps Lock 경고 물방울 */}
              {showCapsLockWarning && isCapsLockOn && (
                <div className="absolute top-12 right-3 z-10">
                  <div className="relative">
                    <div className="bg-amber-100 border border-amber-300 rounded-lg px-3 py-2 shadow-lg">
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-amber-400 rounded-full animate-pulse"></div>
                        <span className="text-sm text-amber-800 font-medium">
                          Caps Lock이 켜져 있습니다
                        </span>
                      </div>
                    </div>
                    {/* 말풍선 꼬리 */}
                    <div className="absolute top-0 right-4 transform -translate-y-1">
                      <div className="w-3 h-3 bg-amber-100 border-l border-t border-amber-300 rotate-45"></div>
                    </div>
                  </div>
                </div>
              )}
            </div>
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
              <Button
                variant="outline"
                className="w-full"
                onClick={() => handleOAuthLogin("google")}
                type="button"
              >
                <img
                  src="https://upload.wikimedia.org/wikipedia/commons/c/c1/Google_%22G%22_logo.svg"
                  alt="Google"
                  className="w-5 h-5 mr-2"
                />{" "}
                Google 로그인
              </Button>
              <Button
                variant="outline"
                className="w-full bg-[#FEE500] hover:bg-[#FEE500]/90 border-[#FEE500] text-black"
                onClick={() => handleOAuthLogin("kakao")}
                type="button"
              >
                <img
                  src="https://developers.kakao.com/assets/img/about/logos/kakaotalksharing/kakaotalk_sharing_btn_medium.png"
                  alt="Kakao"
                  className="w-5 h-5 mr-2"
                />
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
          <p className="mt-4 text-center text-sm text-neutral-600">
            비밀번호를 잊으셨나요?{" "}
            <Link
              to="/forgot-password"
              className="font-medium text-primary hover:text-primary-dark"
            >
              비밀번호 찾기
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
  const [verificationCode, setVerificationCode] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isCodeSent, setIsCodeSent] = useState(false); // 인증코드 발송 여부
  const [isEmailVerified, setIsEmailVerified] = useState(false); // 이메일 인증 완료 여부

  // Caps Lock 상태 관리
  const [isCapsLockOn, setIsCapsLockOn] = useState(false);
  const [showCapsLockWarning, setShowCapsLockWarning] = useState(false);

  // 로딩 상태들
  const [loading, setLoading] = useState({
    passwordValidation: false,
    sendCode: false,
    verifyCode: false,
    register: false,
  });

  // 비밀번호 유효성 검증 결과
  const [passwordValidation, setPasswordValidation] = useState<{
    isValid: boolean;
    message?: string;
  } | null>(null);

  const navigate = useNavigate();

  // 실시간 비밀번호 유효성 검사 (서버)
  const validatePassword = async (passwordToCheck: string) => {
    if (!passwordToCheck) {
      setPasswordValidation(null);
      return;
    }

    setLoading((prev) => ({ ...prev, passwordValidation: true }));

    try {
      const result = await userControllerApi.validatePassword({
        password: passwordToCheck,
      });
      setPasswordValidation(result);
    } catch (err) {
      setPasswordValidation({ isValid: false, message: "비밀번호 검증 실패" });
    } finally {
      setLoading((prev) => ({ ...prev, passwordValidation: false }));
    }
  };

  // 디바운싱을 위한 타이머 ref
  const passwordValidationTimer = useRef<NodeJS.Timeout | null>(null);

  // Caps Lock 감지 함수
  const detectCapsLock = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const capsLockOn = e.getModifierState("CapsLock");
    setIsCapsLockOn(capsLockOn);
  };

  // 비밀번호 필드 포커스 시 Caps Lock 경고 표시
  const handlePasswordFocus = () => {
    setShowCapsLockWarning(true);
  };

  // 비밀번호 필드 블러 시 Caps Lock 경고 숨김
  const handlePasswordBlur = () => {
    setShowCapsLockWarning(false);
  };

  // 비밀번호 변경 핸들러 (디바운싱 적용)
  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newPassword = e.target.value;
    setPassword(newPassword);

    // 이전 타이머 취소
    if (passwordValidationTimer.current) {
      clearTimeout(passwordValidationTimer.current);
    }

    // 새 타이머 설정
    passwordValidationTimer.current = setTimeout(() => {
      validatePassword(newPassword);
    }, 500);
  };

  // 비밀번호 확인 변경 핸들러
  const handleConfirmPasswordChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const newConfirmPassword = e.target.value;
    setConfirmPassword(newConfirmPassword);
  };

  // 1단계: 이메일 인증 코드 발송 (이메일 검증 포함)
  const sendVerificationCode = async () => {
    setError("");
    setSuccess("");
    setLoading((prev) => ({ ...prev, sendCode: true }));

    try {
      // 서버에서 이메일 형식, 중복 여부 모두 검증하고 인증 코드 발송
      await userControllerApi.requestEmailVerification({ email });
      setIsCodeSent(true);
      setSuccess("인증 메일이 발송되었습니다.");
    } catch (err) {
      if (err instanceof UserApiError) {
        setError(err.message || "이메일 인증 코드 발송에 실패했습니다.");
      } else {
        setError("이메일 검증에 실패했습니다. 이메일 주소를 확인해주세요.");
      }
    } finally {
      setLoading((prev) => ({ ...prev, sendCode: false }));
    }
  };

  // 2단계: 인증 코드 확인
  const verifyEmailCode = async () => {
    setError("");
    setSuccess("");
    setLoading((prev) => ({ ...prev, verifyCode: true }));

    try {
      const isVerified = await userControllerApi.verifyEmail({
        email,
        verificationCode,
      });

      if (isVerified) {
        setIsEmailVerified(true);
        setSuccess("이메일 인증이 완료되었습니다.");
      } else {
        setError("인증 코드가 올바르지 않습니다.");
      }
    } catch (err) {
      if (err instanceof UserApiError) {
        setError(err.message || "인증 코드 확인에 실패했습니다.");
      } else {
        setError("인증 코드를 다시 확인해주세요.");
      }
    } finally {
      setLoading((prev) => ({ ...prev, verifyCode: false }));
    }
  };

  // 3단계: 회원가입 완료
  const registerUser = async () => {
    setLoading((prev) => ({ ...prev, register: true }));

    try {
      await userControllerApi.registerUser({
        email,
        password,
        confirmPassword,
      });

      // 성공 시 로그인 페이지로 이동
      navigate("/login", {
        state: { email },
        replace: true,
      });
    } catch (err) {
      if (err instanceof UserApiError) {
        setError(err.message || "회원가입에 실패했습니다.");
      } else {
        setError("회원가입 중 오류가 발생했습니다.");
      }
    } finally {
      setLoading((prev) => ({ ...prev, register: false }));
    }
  };

  // 폼 제출 핸들러
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // 이메일 인증이 완료되지 않았다면 먼저 인증코드 발송
    if (!isCodeSent) {
      // 기본 유효성 검사
      if (!email.includes("@")) {
        setError("올바른 이메일 주소를 입력해주세요.");
        return;
      }

      if (!password) {
        setError("비밀번호를 입력해주세요.");
        return;
      }

      if (password !== confirmPassword) {
        setError("비밀번호가 일치하지 않습니다.");
        return;
      }

      const isPasswordValid = passwordValidation?.isValid ?? false;
      if (!isPasswordValid) {
        setError("올바른 비밀번호를 입력해주세요.");
        return;
      }

      await sendVerificationCode();
      return;
    }

    // 이메일 인증이 완료되지 않았다면 인증 확인
    if (!isEmailVerified) {
      if (!verificationCode || verificationCode.length !== 6) {
        setError("6자리 인증 코드를 입력해주세요.");
        return;
      }

      await verifyEmailCode();
      return;
    }

    // 이메일 인증이 완료되었다면 회원가입 진행
    await registerUser();
  };

  // OAuth 로그인 핸들러 (회원가입용)
  const handleOAuthSignup = (provider: "google" | "kakao") => {
    try {
      // OAuth 회원가입 시작
      startOAuthLogin(provider);
    } catch (error) {
      const errorMessage = handleOAuthError(error as Error, provider);
      setError(errorMessage);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-primary">PickTeam</h1>
          <p className="mt-2 text-neutral-600">새로운 팀 경험을 시작하세요.</p>
        </div>
        <Card title="회원가입">
          <form className="space-y-6" onSubmit={handleSubmit}>
            <Input
              label="이메일 주소"
              name="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              disabled={isCodeSent} // 인증코드 발송 후에는 이메일 변경 불가
            />

            <div className="relative">
              <Input
                label="비밀번호"
                name="password"
                type="password"
                required
                value={password}
                onChange={handlePasswordChange}
                onKeyDown={detectCapsLock}
                onFocus={handlePasswordFocus}
                onBlur={handlePasswordBlur}
                placeholder="8자 이상, 대소문자, 숫자 포함"
                disabled={isCodeSent} // 인증코드 발송 후에는 비밀번호 변경 불가
              />

              {/* Caps Lock 경고 물방울 */}
              {showCapsLockWarning && isCapsLockOn && (
                <div className="absolute top-12 right-3 z-10">
                  <div className="relative">
                    <div className="bg-amber-100 border border-amber-300 rounded-lg px-3 py-2 shadow-lg">
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-amber-400 rounded-full animate-pulse"></div>
                        <span className="text-sm text-amber-800 font-medium">
                          Caps Lock이 켜져 있습니다
                        </span>
                      </div>
                    </div>
                    {/* 말풍선 꼬리 */}
                    <div className="absolute top-0 right-4 transform -translate-y-1">
                      <div className="w-3 h-3 bg-amber-100 border-l border-t border-amber-300 rotate-45"></div>
                    </div>
                  </div>
                </div>
              )}

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

            <div className="relative">
              <Input
                label="비밀번호 확인"
                name="confirmPassword"
                type="password"
                required
                value={confirmPassword}
                onChange={handleConfirmPasswordChange}
                onKeyDown={detectCapsLock}
                onFocus={handlePasswordFocus}
                onBlur={handlePasswordBlur}
                placeholder="비밀번호를 다시 입력해주세요"
                disabled={isCodeSent} // 인증코드 발송 후에는 비밀번호 확인 변경 불가
              />

              {/* Caps Lock 경고 물방울 (비밀번호 확인용) */}
              {showCapsLockWarning && isCapsLockOn && (
                <div className="absolute top-12 right-3 z-10">
                  <div className="relative">
                    <div className="bg-amber-100 border border-amber-300 rounded-lg px-3 py-2 shadow-lg">
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-amber-400 rounded-full animate-pulse"></div>
                        <span className="text-sm text-amber-800 font-medium">
                          Caps Lock이 켜져 있습니다
                        </span>
                      </div>
                    </div>
                    {/* 말풍선 꼬리 */}
                    <div className="absolute top-0 right-4 transform -translate-y-1">
                      <div className="w-3 h-3 bg-amber-100 border-l border-t border-amber-300 rotate-45"></div>
                    </div>
                  </div>
                </div>
              )}
              {confirmPassword && (
                <p
                  className={`text-xs mt-1 ${
                    password === confirmPassword
                      ? "text-green-500"
                      : "text-red-500"
                  }`}
                >
                  {password === confirmPassword
                    ? "비밀번호가 일치합니다."
                    : "비밀번호가 일치하지 않습니다."}
                </p>
              )}
            </div>

            {/* 성공 메시지 - 독립적으로 표시 */}
            {success && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm text-green-700 text-center">{success}</p>
              </div>
            )}

            {/* 에러 메시지 - 독립적으로 표시 */}
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-700 text-center">{error}</p>
              </div>
            )}

            {/* 인증코드 입력칸 - 완전히 독립적으로 작동 */}
            {isCodeSent && (
              <div className="space-y-3">
                <Input
                  label="인증 코드"
                  name="verificationCode"
                  type="text"
                  maxLength={6}
                  required
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value)}
                  placeholder="123456"
                  className="text-center text-lg tracking-widest"
                />
                <div className="text-sm text-gray-600 text-center">
                  <p className="mb-2">
                    <strong>{email}</strong>로 발송된 6자리 인증 코드를
                    입력해주세요.
                  </p>
                  <Button
                    type="button"
                    onClick={sendVerificationCode}
                    variant="ghost"
                    className="text-sm p-0 h-auto text-blue-600 hover:text-blue-800"
                    disabled={loading.sendCode}
                  >
                    {loading.sendCode ? "재발송 중..." : "인증 코드 재발송"}
                  </Button>
                </div>
              </div>
            )}

            <Button
              type="submit"
              className="w-full"
              variant="primary"
              disabled={
                loading.sendCode ||
                loading.verifyCode ||
                loading.register ||
                loading.passwordValidation ||
                (!isCodeSent &&
                  (!email ||
                    !password ||
                    !confirmPassword ||
                    password !== confirmPassword ||
                    !(passwordValidation?.isValid ?? false))) ||
                (isCodeSent &&
                  !isEmailVerified &&
                  verificationCode.length !== 6)
              }
            >
              {loading.sendCode && "인증 메일 발송 중..."}
              {loading.verifyCode && "인증 코드 확인 중..."}
              {loading.register && "회원가입 중..."}
              {!loading.sendCode &&
                !loading.verifyCode &&
                !loading.register &&
                (!isCodeSent
                  ? "이메일 인증하고 가입하기"
                  : !isEmailVerified
                  ? "인증 코드 확인"
                  : "회원가입 완료")}
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
              <Button
                variant="outline"
                className="w-full"
                onClick={() => handleOAuthSignup("google")}
                type="button"
              >
                <img
                  src="https://upload.wikimedia.org/wikipedia/commons/c/c1/Google_%22G%22_logo.svg"
                  alt="Google"
                  className="w-5 h-5 mr-2"
                />{" "}
                Google로 가입
              </Button>
              <Button
                variant="outline"
                className="w-full bg-[#FEE500] hover:bg-[#FEE500]/90 border-[#FEE500] text-black"
                onClick={() => handleOAuthSignup("kakao")}
                type="button"
              >
                <img
                  src="https://developers.kakao.com/assets/img/about/logos/kakaotalksharing/kakaotalk_sharing_btn_medium.png"
                  alt="Kakao"
                  className="w-5 h-5 mr-2"
                />
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
