import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { APP_SHORT_NAME } from '@/constants/branding';

const ROUTE_PAGE_TITLES: Record<string, string> = {
  '/': 'Overview',
  '/rooms': 'Rooms & Devices',
  '/automations': 'Automations',
  '/energy': 'Energy Analytics',
  '/history': 'Event History',
  '/notifications': 'Notifications',
  '/settings': 'Settings',
};

export function useDocumentTitle(): void {
  const location = useLocation();

  useEffect(() => {
    const pageName = ROUTE_PAGE_TITLES[location.pathname] || 'Page Not Found';
    document.title = `${pageName} | ${APP_SHORT_NAME}`;
  }, [location.pathname]);
}
