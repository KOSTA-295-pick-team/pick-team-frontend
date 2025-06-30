import React from 'react';
import { Outlet } from 'react-router-dom';
import { useAuth } from '../../AuthContext';

// circular dependency를 피하기 위해 임시로 간단한 구조로 만들고
// 나중에 App.tsx에서 직접 조합하도록 함
export const AppLayout: React.FC = () => {
  return (
    <div className="flex flex-col min-h-screen">
      <div className="p-4 sm:p-6 lg:p-8">
        <Outlet />
      </div>
    </div>
  );
}; 