import React, { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../AuthContext';

// AppLayout import는 circular dependency를 피하기 위해 나중에 추가
export const ProtectedRoute: React.FC<{ children?: ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  
  // AppLayout을 여기서 직접 import하면 circular dependency가 발생할 수 있으므로
  // 임시로 주석처리하고 나중에 App.tsx에서 처리
  return children ? <>{children}</> : null; 
}; 