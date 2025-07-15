import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { GlobalHeader } from './GlobalHeader';
import { WorkspaceSidebar } from '@/features/workspace/core/components/WorkspaceSidebar';

export const AppLayout: React.FC = () => {
  const location = useLocation();
  
  // 팀 스페이스 페이지, 워크스페이스 홈 페이지, 또는 채팅 페이지인지 확인
  const isTeamSpacePage = location.pathname.includes('/team/');
  const isWorkspaceHomePage = location.pathname.match(/^\/ws\/[^\/]+$/);
  const isChatPage = location.pathname.includes('/chat/');
  const hasTeamSidebar = isTeamSpacePage || isWorkspaceHomePage || isChatPage;
  
  return (
    <div className="flex flex-col min-h-screen bg-neutral-50">
      <GlobalHeader />
      <div className="flex flex-1 pt-16">
        <WorkspaceSidebar />
        <main className={`flex-1 ml-16 ${hasTeamSidebar ? 'p-0' : 'p-4 sm:p-6 lg:p-8'}`}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}; 