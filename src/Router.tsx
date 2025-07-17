import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from '@/layout/ProtectedRoute';
import { LoginPage, SignupPage } from '@/features/user/auth/routes/AuthPage';
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

const Router: React.FC = () => {
    return (
        <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />

            <Route path="/" element={<ProtectedRoute />}>
                <Route index element={<NavigateToInitialView />} />
                <Route path="ws/:workspaceId" element={<HomePage />} />
                <Route path="ws/:workspaceId/team/:teamId" element={<TeamSpacePage />} />
                <Route path="ws/:workspaceId/chat/:chatId" element={<ChatPage />} />
                <Route path="ws/:workspaceId/video/live" element={<VideoConferencePage />} />
                <Route path="ws/:workspaceId/team-formation" element={<TeamFormationHubPage />} />

                <Route path="my-page" element={<MyPage />} />
                <Route path="my-page/edit" element={<ProfileEditPage />} />
                <Route path="my-page/settings" element={<AccountSettingsPage />} />
                
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

  if (loading) {
    return <div>Loading workspaces...</div>;
  }

  if (workspaces.length > 0) {
    // 마지막으로 접근한 워크스페이스 ID를 localStorage에서 가져오거나 첫 번째 워크스페이스로 이동
    const lastWorkspaceId = localStorage.getItem('lastAccessedWorkspaceId') || workspaces[0].id;
    const targetWorkspace = workspaces.find(ws => String(ws.id) === lastWorkspaceId) || workspaces[0];
    return <Navigate to={`/ws/${targetWorkspace.id}`} replace />;
  }

  return <Navigate to="/empty-workspace" replace />;
};

export default Router; 