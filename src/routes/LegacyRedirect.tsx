import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';

export interface LegacyRedirectProps {
  to: string;
}

export const LegacyRedirect: React.FC<LegacyRedirectProps> = ({ to }) => {
  const location = useLocation();
  const target = `${to}${location.search}${location.hash}`;
  return <Navigate to={target} replace />;
};
