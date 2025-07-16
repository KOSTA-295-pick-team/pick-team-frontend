import React, { useState, useEffect, useRef } from "react";
import {
  Link,
  useNavigate,
  useLocation,
  useSearchParams,
} from "react-router-dom";
import { useAuth } from "@/features/user/auth/context/AuthContext";
import { Button, Input, Card } from "@/components/ui";
import { userApi } from "@/lib/userApi";

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [localError, setLocalError] = useState("");
  const [loading, setLoading] = useState(false);

  // Caps Lock 상태 관리
  const [isCapsLockOn, setIsCapsLockOn] = useState(false);
  const [showCapsLockWarning, setShowCapsLockWarning] = useState(false);

  const auth = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const inviteCode = searchParams.get("inviteCode");
  const from = location.state?.from?.pathname || "/";

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
      setLocalError(`초대 코드 ${inviteCode}로 로그인 후 워크스페이스에 참여하세요.`);
    }
  }, [inviteCode]);

  // Caps Lock 감지
  const detectCapsLock = (e: React.KeyboardEvent) => {
    const isCaps = e.getModifierState && e.getModifierState("CapsLock");
    setIsCapsLockOn(isCaps);
  };

  // 비밀번호 필드 포커스 시 Caps Lock 체크 활성화
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

      // OAuth 로그인 시작 (백엔드 엔드포인트로 리다이렉트)
      userApi.startOAuthLogin(provider);
    } catch (error: any) {
      setLocalError(error.message || `${provider} 로그인에 실패했습니다.`);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setLocalError("");

    try {
      await auth.loginWithCredentials(email, password);
      
      // 초대 코드가 있는 경우 워크스페이스 참여 로직 추가 가능
      if (inviteCode) {
        // TODO: 워크스페이스 참여 API 호출
        console.log("초대 코드로 워크스페이스 참여:", inviteCode);
      }

      // 새로운 로그인이므로 리다이렉트 플래그 초기화
      sessionStorage.removeItem('hasRedirectedFromRoot');
      navigate(from, { replace: true });
    } catch (error: any) {
      setLocalError(error.message || "로그인에 실패했습니다.");
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
            <div className="text-sm text-center text-neutral-500 mb-4">또는</div>
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-neutral-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-neutral-500">소셜 로그인</span>
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
                구글 로그인
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
                카카오 로그인
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
  const [resendCooldown, setResendCooldown] = useState(0); // 재전송 쿨다운

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

  const auth = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const inviteCode = searchParams.get("inviteCode");

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

  // 실시간 비밀번호 유효성 검사 (간단한 클라이언트 검증)
  const validatePassword = (passwordToCheck: string) => {
    if (!passwordToCheck) {
      setPasswordValidation(null);
      return;
    }

    const hasUpperCase = /[A-Z]/.test(passwordToCheck);
    const hasLowerCase = /[a-z]/.test(passwordToCheck);
    const hasNumbers = /\d/.test(passwordToCheck);
    const hasMinLength = passwordToCheck.length >= 8;

    if (hasMinLength && hasUpperCase && hasLowerCase && hasNumbers) {
      setPasswordValidation({ isValid: true, message: "유효한 비밀번호입니다." });
    } else {
      setPasswordValidation({ 
        isValid: false, 
        message: "8자 이상, 대소문자, 숫자를 포함해야 합니다." 
      });
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

  // 1단계: 이메일 인증 코드 발송
  const sendVerificationCode = async () => {
    setError("");
    setSuccess("");
    setLoading((prev) => ({ ...prev, sendCode: true }));

    try {
      // 간단한 이메일 검증
      if (!email.includes("@")) {
        throw new Error("올바른 이메일 주소를 입력해주세요.");
      }

      // 백엔드 API 호출
      await userApi.requestEmailVerification(email);
      
      setIsCodeSent(true);
      setResendCooldown(60); // 60초 쿨다운
      setSuccess("인증 메일이 발송되었습니다. 이메일을 확인해주세요.");
    } catch (err: any) {
      if (err.status === 409) {
        setError("이미 가입된 이메일 주소입니다.");
      } else {
        setError(err.message || "이메일 인증 코드 발송에 실패했습니다.");
      }
    } finally {
      setLoading((prev) => ({ ...prev, sendCode: false }));
    }
  };

  // 이메일 인증 코드 재전송
  const resendVerificationCode = async () => {
    if (resendCooldown > 0) return;

    setError("");
    setLoading((prev) => ({ ...prev, sendCode: true }));

    try {
      await userApi.requestEmailVerification(email);
      setSuccess("인증 코드가 다시 발송되었습니다.");
      setResendCooldown(60); // 60초 쿨다운
    } catch (err: any) {
      setError(err.message || "이메일 재전송에 실패했습니다.");
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
      // 백엔드 API 호출
      const response = await userApi.verifyEmail(email, verificationCode);
      
      if (response.data === true) {
        setIsEmailVerified(true);
        setSuccess("이메일 인증이 완료되었습니다.");
      } else {
        setError("인증 코드가 올바르지 않습니다.");
      }
    } catch (err: any) {
      if (err.status === 400) {
        setError("잘못된 인증 코드입니다.");
      } else if (err.status === 410) {
        setError("인증 코드가 만료되었습니다. 새로운 인증 코드를 요청해주세요.");
      } else {
        setError(err.message || "인증 코드 확인에 실패했습니다.");
      }
    } finally {
      setLoading((prev) => ({ ...prev, verifyCode: false }));
    }
  };

  // 3단계: 회원가입 완료
  const registerUser = async () => {
    setLoading((prev) => ({ ...prev, register: true }));

    try {
      await auth.register({
        email,
        password,
        confirmPassword,
        name: email.split("@")[0], // 임시로 이메일의 앞부분을 이름으로 사용
      });

      // 성공 시 로그인 페이지로 이동
      navigate("/login", {
        state: { 
          email,
          message: "회원가입이 완료되었습니다. 로그인해주세요."
        },
        replace: true,
      });
    } catch (err: any) {
      setError(err.message || "회원가입에 실패했습니다.");
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

  // OAuth 회원가입 핸들러
  const handleOAuthSignup = (provider: "google" | "kakao") => {
    try {
      // 초대 코드가 있으면 임시 저장 (OAuth 완료 후 사용)
      if (inviteCode) {
        sessionStorage.setItem("pendingInviteCode", inviteCode);
      }
      
      // 회원가입 플래그 저장 (OAuth 콜백에서 회원가입인지 로그인인지 구분)
      sessionStorage.setItem("isOAuthSignup", "true");
      
      // OAuth 로그인과 동일한 플로우 사용 (백엔드에서 자동 회원가입 처리)
      userApi.startOAuthLogin(provider);
    } catch (error: any) {
      setError(error.message || `${provider} 회원가입에 실패했습니다.`);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-primary">PickTeam</h1>
          <p className="mt-2 text-neutral-600">새로운 팀 경험을 시작하세요.</p>
          {inviteCode && (
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>워크스페이스 초대</strong>
              </p>
              <p className="text-xs text-blue-600 mt-1">
                회원가입 후 자동으로 워크스페이스에 참여됩니다.
              </p>
              <p className="text-xs text-blue-500 mt-1">
                초대 코드: {inviteCode}
              </p>
            </div>
          )}
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
                autoComplete="new-password"
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
                autoComplete="new-password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                onKeyDown={detectCapsLock}
                onFocus={handlePasswordFocus}
                onBlur={handlePasswordBlur}
                placeholder="비밀번호를 다시 입력해주세요"
                disabled={isCodeSent} // 인증코드 발송 후에는 비밀번호 확인 변경 불가
              />

              {/* 비밀번호 일치 여부 표시 */}
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

            {/* 이메일 인증 단계 */}
            {isCodeSent && !isEmailVerified && (
              <div className="space-y-3">
                <Input
                  label="인증 코드"
                  name="verificationCode"
                  type="text"
                  required
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value)}
                  placeholder="6자리 인증 코드를 입력하세요"
                  maxLength={6}
                />
                <div className="text-center">
                  <button
                    type="button"
                    onClick={resendVerificationCode}
                    disabled={resendCooldown > 0 || loading.sendCode}
                    className="text-sm text-primary hover:text-primary-dark disabled:text-gray-400 disabled:cursor-not-allowed underline"
                  >
                    {resendCooldown > 0
                      ? `${resendCooldown}초 후 재전송 가능`
                      : "인증 코드 재전송"}
                  </button>
                </div>
              </div>
            )}

            {error && (
              <p className="text-sm text-red-500 bg-red-50 p-3 rounded-md">{error}</p>
            )}

            {success && (
              <p className="text-sm text-green-500 bg-green-50 p-3 rounded-md">{success}</p>
            )}

            <Button
              type="submit"
              className="w-full"
              variant="primary"
              disabled={
                loading.sendCode ||
                loading.verifyCode ||
                loading.register ||
                loading.passwordValidation
              }
            >
              {loading.sendCode && "인증 메일 발송 중..."}
              {loading.verifyCode && "인증 확인 중..."}
              {loading.register && "회원가입 중..."}
              {!loading.sendCode &&
                !loading.verifyCode &&
                !loading.register &&
                (isEmailVerified
                  ? "회원가입 완료"
                  : isCodeSent
                  ? "인증 코드 확인"
                  : "회원가입하기")}
            </Button>
          </form>

          {!isCodeSent && (
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
                  />
                  구글로 가입
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
                  카카오로 가입
                </Button>
              </div>
            </div>
          )}

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
      await userApi.sendPasswordResetEmail({ email });
      setSuccess(
        "비밀번호 재설정 이메일이 발송되었습니다. 이메일을 확인해주세요."
      );
      setCurrentStep("code");
      setResendCooldown(60); // 60초 쿨다운
    } catch (err: any) {
      setError(err.message || "이메일 발송에 실패했습니다. 이메일 주소를 확인해주세요.");
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
      await userApi.sendPasswordResetEmail({ email });
      setSuccess("인증 코드가 다시 발송되었습니다.");
      setResendCooldown(60);
    } catch (err: any) {
      setError(err.message || "이메일 재전송에 실패했습니다.");
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
      const response = await userApi.verifyResetCode({
        email,
        resetCode,
      });

      if (response.data.valid) {
        setSuccess(
          "인증 코드가 확인되었습니다. 새로운 비밀번호를 설정해주세요."
        );
        setCurrentStep("password");
      } else {
        setError(response.data.message || "인증 코드가 올바르지 않습니다.");
      }
    } catch (err: any) {
      setError(err.message || "인증 코드 확인에 실패했습니다. 다시 시도해주세요.");
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
      await userApi.resetPassword({
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
    } catch (err: any) {
      setError(err.message || "비밀번호 재설정에 실패했습니다. 다시 시도해주세요.");
    } finally {
      setLoading(false);
    }
  };

  const renderEmailStep = () => (
    <Card title="비밀번호 찾기">
      {/* 진행률 표시 */}
      <div className="mb-6">
        <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
          <span>단계 1/3</span>
          <span>이메일 인증</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full"
            style={{ width: "33%" }}
          ></div>
        </div>
      </div>

      <div className="mb-4">
        <p className="text-sm text-gray-600">
          가입하신 이메일 주소를 입력해주세요. 비밀번호 재설정 코드를
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
          disabled={loading}
        >
          {loading ? "발송 중..." : "재설정 코드 발송"}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-gray-600">
        로그인 페이지로 돌아가기{" "}
        <Link
          to="/login"
          className="font-medium text-blue-600 hover:text-blue-800"
        >
          로그인
        </Link>
      </p>
    </Card>
  );

  const renderCodeStep = () => (
    <Card title="인증 코드 확인">
      {/* 진행률 표시 */}
      <div className="mb-6">
        <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
          <span>단계 2/3</span>
          <span>코드 확인</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full"
            style={{ width: "66%" }}
          ></div>
        </div>
      </div>

      <div className="mb-4">
        <p className="text-sm text-gray-600">
          <strong>{email}</strong>로 발송된 6자리 인증 코드를 입력해주세요.
        </p>
        <p className="text-xs text-gray-500 mt-2">
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
            className="text-sm text-blue-600 hover:text-blue-800 disabled:text-gray-400 disabled:cursor-not-allowed"
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
        <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
          <span>단계 3/3</span>
          <span>비밀번호 설정</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full"
            style={{ width: "100%" }}
          ></div>
        </div>
      </div>

      <div className="mb-4">
        <p className="text-sm text-gray-600">
          새로운 비밀번호를 입력해주세요.
        </p>
        <div className="mt-2 text-xs text-gray-500">
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
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-blue-600">PickTeam</h1>
          <p className="mt-2 text-gray-600">
            안전하게 비밀번호를 재설정하세요
          </p>
        </div>
        {currentStep === "email" && renderEmailStep()}
        {currentStep === "code" && renderCodeStep()}
        {currentStep === "password" && renderPasswordStep()}
      </div>
    </div>
  );
};

// 기본 내보내기
export default LoginPage;
