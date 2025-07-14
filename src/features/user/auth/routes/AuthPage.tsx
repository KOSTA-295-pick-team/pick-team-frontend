import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/features/user/auth/hooks/useAuth';
import { useWorkspace } from '@/features/workspace/core/hooks/useWorkspace';
import { Button, Input, Card } from '@/components/ui';
import { ApiError } from '@/lib/apiClient';

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const auth = useAuth();
  const workspace = useWorkspace();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const inviteCode = searchParams.get('inviteCode');
  const from = location.state?.from?.pathname || "/"; // Default to root, App.tsx will handle initial redirect

  useEffect(() => {
    if (inviteCode) {
      // 초대 코드가 있으면 사용자에게 알림
      console.log('초대 코드로 접속:', inviteCode);
    }
  }, [inviteCode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // AuthContext의 login 함수 사용
      await auth.login({ email, password });
      
      // 초대 코드가 있으면 워크스페이스 참여 진행
      if (inviteCode) {
        try {
          const joined = await workspace.joinWorkspace({ inviteCode });
          
          if (joined) {
            workspace.setCurrentWorkspaceById(String(joined.id));
            navigate(`/ws/${joined.id}`, { replace: true });
            return;
          }
        } catch (err) {
          console.error('Auto join after login error:', err);
          // 실패해도 일단 홈으로 이동하고, 수동으로 참여하도록 안내
          setError('로그인은 성공했지만 워크스페이스 참여에 실패했습니다. 수동으로 참여해주세요.');
        }
      }
      
      navigate(from, { replace: true });
    } catch (err) {
      console.error('로그인 오류:', err);
      if (err instanceof ApiError) {
        if (err.status === 401) {
          setError('이메일 또는 비밀번호가 올바르지 않습니다.');
        } else if (err.status === 0) {
          setError('서버에 연결할 수 없습니다. 네트워크 연결을 확인해주세요.');
        } else {
          setError(err.message || '로그인 중 오류가 발생했습니다.');
        }
      } else {
        setError('로그인 중 예상치 못한 오류가 발생했습니다.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
         <div className="text-center">
            <h1 className="text-4xl font-bold text-primary">PickTeam</h1>
            <p className="mt-2 text-neutral-600">팀 프로젝트 협업을 위한 최고의 선택</p>
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
            {error && <p className="text-sm text-red-500">{error}</p>}
            <Button 
              type="submit" 
              className="w-full" 
              variant="primary"
              disabled={loading}
            >
              {loading ? '로그인 중...' : '로그인'}
            </Button>
          </form>
          <div className="mt-6">
            <div className="text-sm text-center text-neutral-500 mb-4">
              테스트 계정: test1@example.com / password<br/>
              또는 test2@example.com / password
            </div>
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
                <img src="https://upload.wikimedia.org/wikipedia/commons/c/c1/Google_%22G%22_logo.svg" alt="Google" className="w-5 h-5 mr-2"/> Google 로그인
              </Button>
              <Button variant="outline" className="w-full bg-[#FEE500] hover:bg-[#FEE500]/90 border-[#FEE500]">
                 <img src="https://developers.kakao.com/tool/resource/static/img/button/symbol/kakaotalk_symbol.png" alt="Kakao" className="w-5 h-5 mr-2"/> Kakao 로그인
              </Button>
            </div>
          </div>
          <p className="mt-8 text-center text-sm text-neutral-600">
            계정이 없으신가요?{' '}
            <Link to="/signup" className="font-medium text-primary hover:text-primary-dark">
              회원가입
            </Link>
          </p>
        </Card>
      </div>
    </div>
  );
};

export const SignupPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [step, setStep] = useState(1); // 1: Form, 2: Verification Pending, 3: Verified (demo)
  // const auth = useAuth(); // Not used directly for signup logic, but for login after verify
  // const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password !== confirmPassword) {
      setError('비밀번호가 일치하지 않습니다.');
      return;
    }
    if (password.length < 6) {
        setError('비밀번호는 6자 이상이어야 합니다.');
        return;
    }
    // Demo signup: proceed to email verification step
    console.log('Signup attempt:', { email, password });
    setStep(2); 
  };
  
  const handleResendEmail = () => {
    alert(`인증 메일이 ${email}로 재전송되었습니다. (목업)`);
  };

  const handleConfirmVerification = () => {
    // In a real app, this would be after user clicks link in email and backend confirms
    alert('이메일 인증이 완료되었습니다! 로그인 페이지로 이동합니다. (목업)');
    // const demoUser: User = { id: `user_${Date.now()}`, email, name: email.split('@')[0] };
    // auth.login(demoUser); // Auto-login after verification not typical, redirect to login
    setStep(1); // Reset form for next signup or redirect
    setEmail(''); setPassword(''); setConfirmPassword(''); // Clear form
    // Ideally navigate('/login');
  };


  if (step === 2) {
    return (
        <div className="min-h-screen flex items-center justify-center bg-neutral-50 py-12 px-4 sm:px-6 lg:px-8">
            <Card title="이메일 인증 대기">
                <p className="text-neutral-600 mb-4">
                    <strong>{email}</strong> 주소로 인증 메일을 발송했습니다. <br/>
                    메일함 확인 후 인증 링크를 클릭해주세요.
                </p>
                <p className="text-sm text-neutral-500 mb-4">
                    메일이 오지 않았나요? 스팸 메일함을 확인하거나 잠시 후 다시 시도해주세요.
                </p>
                <div className="space-y-3">
                    <Button onClick={handleResendEmail} variant="outline" className="w-full">인증 메일 재전송</Button>
                    {/* This button is a DEMO for user clicking link in email */}
                    <Button onClick={handleConfirmVerification} variant="primary" className="w-full">이메일 인증 완료 (목업 확인)</Button> 
                    <Button onClick={() => setStep(1)} variant="ghost" className="w-full">이메일 주소 변경</Button>
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
            <Input
              label="이메일 주소"
              name="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
            <Input
              label="비밀번호"
              name="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="6자 이상 입력"
            />
            <Input
              label="비밀번호 확인"
              name="confirmPassword"
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="********"
            />
            {error && <p className="text-sm text-red-500">{error}</p>}
            <Button type="submit" className="w-full" variant="primary">
              이메일로 계속하기
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
                <img src="https://upload.wikimedia.org/wikipedia/commons/c/c1/Google_%22G%22_logo.svg" alt="Google" className="w-5 h-5 mr-2"/> Google로 가입
              </Button>
              <Button variant="outline" className="w-full bg-[#FEE500] hover:bg-[#FEE500]/90 border-[#FEE500]">
                 <img src="https://developers.kakao.com/tool/resource/static/img/button/symbol/kakaotalk_symbol.png" alt="Kakao" className="w-5 h-5 mr-2"/> Kakao로 가입
              </Button>
            </div>
          </div>
          <p className="mt-8 text-center text-sm text-neutral-600">
            이미 계정이 있으신가요?{' '}
            <Link to="/login" className="font-medium text-primary hover:text-primary-dark">
              로그인
            </Link>
          </p>
        </Card>
      </div>
    </div>
  );
};
