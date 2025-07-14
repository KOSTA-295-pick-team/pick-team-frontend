import React, { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/features/user/auth/hooks/useAuth";
import { AppLayout } from "./AppLayout";

export const ProtectedRoute: React.FC<{ children?: ReactNode }> = ({
  children,
}) => {
  const { currentUser, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <div>Loading...</div>; // 또는 스피너 컴포넌트
  }

  if (!currentUser) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // children가 있으면 그것을 렌더링하고, 없으면 AppLayout을 사용
  return children ? <>{children}</> : <AppLayout />;
}; 