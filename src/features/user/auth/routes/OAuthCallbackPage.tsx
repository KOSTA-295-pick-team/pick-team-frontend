import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/features/user/auth/context/AuthContext';
import { userApi } from '@/lib/userApi';

export const OAuthCallbackPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const auth = useAuth();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('인증 중입니다...');
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    // URL에서 tempCode 또는 token을 가져와서 이미 처리된 것인지 확인
    const tempCode = searchParams.get('tempCode');
    const token = searchParams.get('token');
    const processingKey = `oauth_processing_${tempCode || token}`;
    
    // 이미 처리 중이거나 처리된 요청인지 확인
    if (isProcessing || sessionStorage.getItem(processingKey)) {
      console.log('OAuth 콜백 이미 처리 중 또는 처리 완료, 중복 실행 방지');
      return;
    }

    const handleOAuthCallback = async () => {
      setIsProcessing(true);
      
      // 처리 중임을 표시
      if (tempCode || token) {
        sessionStorage.setItem(processingKey, 'true');
      }
      
      // 회원가입인지 로그인인지 확인
      const isSignup = sessionStorage.getItem('isOAuthSignup') === 'true';
      sessionStorage.removeItem('isOAuthSignup');
      
      try {
        setMessage(isSignup ? '회원가입을 완료하는 중입니다...' : '로그인 중입니다...');

        // URL 파라미터에서 토큰이나 에러 확인
        const token = searchParams.get('token');
        const refreshToken = searchParams.get('refreshToken');
        const error = searchParams.get('error');
        const tempCode = searchParams.get('tempCode'); // 백엔드에서 임시 코드 발급하는 경우

        if (error) {
          setStatus('error');
          const errorMessage = decodeURIComponent(error);
          setMessage(isSignup ? `회원가입 실패: ${errorMessage}` : `로그인 실패: ${errorMessage}`);
          setTimeout(() => {
            navigate(isSignup ? '/signup' : '/login', { replace: true });
          }, 3000);
          return;
        }

        if (token && refreshToken) {
          // 직접 토큰을 받은 경우
          // 사용자 정보도 함께 받았는지 확인
          const userDataParam = searchParams.get('user');
          let userData = null;
          
          if (userDataParam) {
            try {
              userData = JSON.parse(decodeURIComponent(userDataParam));
            } catch (e) {
              console.warn('사용자 데이터 파싱 실패:', e);
            }
          }
          
          if (userData) {
            await auth.setTokensAndUser(token, refreshToken, userData);
          } else {
            // 사용자 정보가 없으면 세션 정보로 가져오기
            const apiUrl = (import.meta as any).env?.VITE_API_URL || 'http://localhost:8081';
            const response = await fetch(`${apiUrl}/api/auth/session`, {
              headers: {
                'Authorization': `Bearer ${token}`
              }
            });
            
            if (response.ok) {
              const sessionData = await response.json();
              if (sessionData.success && sessionData.data.user) {
                await auth.setTokensAndUser(token, refreshToken, sessionData.data.user);
              } else {
                throw new Error('사용자 정보를 가져올 수 없습니다.');
              }
            } else {
              throw new Error('세션 정보 조회에 실패했습니다.');
            }
          }
          
          // 임시 저장된 초대 코드 확인
          const pendingInviteCode = sessionStorage.getItem('pendingInviteCode');
          if (pendingInviteCode) {
            sessionStorage.removeItem('pendingInviteCode');
            // TODO: 워크스페이스 참여 로직
          }            setStatus('success');
            setMessage(isSignup ? '회원가입이 완료되었습니다. 메인 페이지로 이동합니다...' : '로그인되었습니다. 메인 페이지로 이동합니다...');
            setTimeout(() => {
              // OAuth 로그인 완료 후 리다이렉트 플래그 초기화
              sessionStorage.removeItem('hasRedirectedFromRoot');
              navigate('/', { replace: true });
            }, 1500);
        } else if (tempCode) {
          // 임시 코드를 받은 경우 (백엔드에서 임시 코드 방식 사용하는 경우)
          setMessage('인증을 완료하는 중입니다...');
          
          // 임시 코드를 JWT 토큰으로 교환
          const response = await userApi.exchangeTempCode(tempCode);
          
          if (response.success && response.data) {
            await auth.setTokensAndUser(
              response.data.token,
              response.data.refreshToken,
              response.data.user
            );
            
            // 임시 저장된 초대 코드 확인
            const pendingInviteCode = sessionStorage.getItem('pendingInviteCode');
            if (pendingInviteCode) {
              sessionStorage.removeItem('pendingInviteCode');
              // TODO: 워크스페이스 참여 로직
            }

            setStatus('success');
            setMessage(isSignup ? '회원가입이 완료되었습니다. 잠시 후 이동합니다...' : '로그인되었습니다. 잠시 후 이동합니다...');
            
            // 워크스페이스 컨텍스트가 로드될 시간을 기다린 후 이동
            setTimeout(() => {
              console.log('OAuth 로그인 완료, 메인 페이지로 이동');
              // 처리 완료 후 플래그 정리
              if (tempCode || searchParams.get('token')) {
                const cleanupKey = `oauth_processing_${tempCode || searchParams.get('token')}`;
                sessionStorage.removeItem(cleanupKey);
              }
              // OAuth 로그인 완료 후 리다이렉트 플래그 초기화 (새로운 로그인이므로)
              sessionStorage.removeItem('hasRedirectedFromRoot');
              navigate('/', { replace: true });
            }, 2000);
          } else {
            throw new Error(response.message || '토큰 교환에 실패했습니다.');
          }
        } else {
          setStatus('error');
          setMessage('인증 정보를 받지 못했습니다.');
          setTimeout(() => {
            navigate(isSignup ? '/signup' : '/login', { replace: true });
          }, 3000);
        }
      } catch (error: any) {
        console.error('OAuth 콜백 처리 중 오류:', error);
        setStatus('error');
        setMessage(error.message || '인증 처리 중 오류가 발생했습니다.');
        setTimeout(() => {
          navigate(isSignup ? '/signup' : '/login', { replace: true });
        }, 3000);
      } finally {
        setIsProcessing(false);
        // 에러 발생시에도 처리 플래그 정리
        const tempCode = searchParams.get('tempCode');
        const token = searchParams.get('token');
        if (tempCode || token) {
          const cleanupKey = `oauth_processing_${tempCode || token}`;
          setTimeout(() => {
            sessionStorage.removeItem(cleanupKey);
          }, 5000); // 5초 후 정리 (에러 상황 고려)
        }
      }
    };

    handleOAuthCallback();
  }, [searchParams, navigate, auth]); // isProcessing 의존성 제거

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-primary">PickTeam</h1>
          
          {status === 'loading' && (
            <div className="mt-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
              <p className="mt-4 text-neutral-600">{message}</p>
            </div>
          )}
          
          {status === 'success' && (
            <div className="mt-8">
              <div className="w-12 h-12 mx-auto bg-green-100 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                </svg>
              </div>
              <p className="mt-4 text-green-600 font-medium">{message}</p>
            </div>
          )}
          
          {status === 'error' && (
            <div className="mt-8">
              <div className="w-12 h-12 mx-auto bg-red-100 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </div>
              <p className="mt-4 text-red-600">{message}</p>
              <p className="mt-2 text-sm text-neutral-500">잠시 후 로그인 페이지로 이동합니다.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default OAuthCallbackPage;
