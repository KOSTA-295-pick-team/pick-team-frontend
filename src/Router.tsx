import React from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import { ProtectedRoute } from '@/layout/ProtectedRoute';
import { LoginPage, SignupPage, ForgotPasswordPage } from '@/features/user/auth/routes/AuthPage';
import { OAuthCallbackPage } from '@/features/user/auth/routes/OAuthCallbackPage';
import { MyPage, ProfileEditPage, AccountSettingsPage } from '@/features/user/mypage/routes/MyPageStack';
import { UserProfileViewPage } from '@/features/user/mypage/routes/UserProfilePage'; 
import { TeamFormationHubPage } from '@/features/teamspace/team/routes/TeamFormationStack'; 
import { TeamSpacePage } from '@/features/teamspace/core/routes/TeamSpacePage';
import { NotificationsPage } from '@/features/user/notification/routes/NotificationsPage'; 
import { HomePage } from '@/features/workspace/core/routes/HomePage';
import { ChatPage } from '@/features/workspace/chat/routes/ChatPage';
import { VideoConferencePage } from '@/features/workspace/video/routes/VideoConferencePage';
import EmptyWorkspacePage from '@/features/workspace/core/routes/EmptyWorkspacePage';
import { useWorkspace } from '@/features/workspace/core/hooks/useWorkspace';
import { useAuth } from '@/features/user/auth/hooks/useAuth';

const Router: React.FC = () => {
    return (
        <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/oauth/success" element={<OAuthCallbackPage />} />

            <Route path="/" element={<ProtectedRoute />}>
                <Route index element={<NavigateToInitialView />} />
                <Route path="ws/:workspaceId" element={<HomePage />} />
                <Route path="ws/:workspaceId/team/:teamId" element={<TeamSpacePage />} />
                <Route path="ws/:workspaceId/chat/:chatId" element={<ChatPage />} />
                <Route path="ws/:workspaceId/video/:roomId" element={<VideoConferencePage />} />
                <Route path="ws/:workspaceId/team-formation" element={<TeamFormationHubPage />} />

                <Route path="my-page" element={<MyPage />} />
                <Route path="my-page/profile-edit" element={<ProfileEditPage />} />
                <Route path="my-page/account-settings" element={<AccountSettingsPage />} />
                
                <Route path="users/:userId" element={<UserProfileViewPage />} />
                <Route path="notifications" element={<NotificationsPage />} />
                <Route path="empty-workspace" element={<EmptyWorkspacePage />} />

                {/* 초대 코드로 접근 시 핸들러 */}
                {/* <Route path="/invite/:inviteCode" element={<InviteCodeHandler />} /> */}
            </Route>
        </Routes>
    );
};

const NavigateToInitialView: React.FC = () => {
  const { workspaces, loading } = useWorkspace();
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  React.useEffect(() => {
    // 이미 리다이렉트했는지 확인
    const hasRedirected = sessionStorage.getItem('hasRedirectedFromRoot');
    
    console.log('NavigateToInitialView Effect - currentUser:', !!currentUser, 'loading:', loading, 'workspaces count:', workspaces.length, 'hasRedirected:', !!hasRedirected);
    
    if (hasRedirected) {
      console.log('이미 리다이렉트 완료, 무한 루프 방지');
      return;
    }
    
    if (!currentUser) {
      console.log('사용자 정보 없음');
      return;
    }

    if (loading) {
      console.log('워크스페이스 로딩 중...');
      return;
    }

    // 워크스페이스 로딩이 완료된 후에만 리다이렉트
    console.log('워크스페이스 로딩 완료, 리다이렉트 진행');
    
    // 리다이렉트 플래그 설정 (세션 동안 유지)
    sessionStorage.setItem('hasRedirectedFromRoot', 'true');

    // 워크스페이스가 있는 경우
    if (workspaces.length > 0) {
      const lastWorkspaceId = localStorage.getItem('lastAccessedWorkspaceId') || workspaces[0].id;
      const targetWorkspace = workspaces.find(ws => String(ws.id) === lastWorkspaceId) || workspaces[0];
      const path = `/ws/${targetWorkspace.id}`;
      console.log('워크스페이스로 이동:', path);
      navigate(path, { replace: true });
    } else {
      // 워크스페이스가 없는 경우
      console.log('empty-workspace로 리다이렉트');
      navigate('/empty-workspace', { replace: true });
    }
  }, [currentUser, loading, workspaces, navigate]);

  // 로딩 상태 표시
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
        <p>워크스페이스를 불러오는 중...</p>
      </div>
    </div>
  );
};

export default Router; 