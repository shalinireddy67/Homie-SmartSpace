import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { hasActiveSession } from '@/services/session';

export interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const location = useLocation();

  if (!hasActiveSession()) {
    const fullTarget = `${location.pathname}${location.search}${location.hash}`;
    const returnTo = encodeURIComponent(fullTarget);
    return <Navigate to={`/login?returnTo=${returnTo}`} replace />;
  }

  return <>{children}</>;
};
