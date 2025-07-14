import React from 'react';
import { Outlet } from 'react-router-dom';
import { GlobalHeader } from './GlobalHeader';
import { WorkspaceSidebar } from '@/features/workspace/core/components/WorkspaceSidebar';

export const AppLayout: React.FC = () => {
  return (
    <div className="flex flex-col min-h-screen bg-neutral-50">
      <GlobalHeader />
      <div className="flex flex-1 pt-16">
        <WorkspaceSidebar />
        <main className="flex-1 ml-16 p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}; 