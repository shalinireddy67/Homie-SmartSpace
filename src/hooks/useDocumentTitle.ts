import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { APP_SHORT_NAME } from '@/constants/branding';

const ROUTE_PAGE_TITLES: Record<string, string> = {
  '/app': 'Overview',
  '/app/': 'Overview',
  '/app/rooms': 'Rooms & Devices',
  '/app/automations': 'Automations',
  '/app/energy': 'Energy Analytics',
  '/app/events': 'Event History',
  '/app/history': 'Event History',
  '/app/notifications': 'Notifications',
  '/app/settings': 'Settings',
  '/': 'Smart Home Dashboard',
  '/login': 'Sign In',
  '/signup': 'Sign Up',
};

export function useDocumentTitle(): void {
  const location = useLocation();

  useEffect(() => {
    const pageName = ROUTE_PAGE_TITLES[location.pathname] || 'Page Not Found';
    document.title = `${pageName} | ${APP_SHORT_NAME}`;
  }, [location.pathname]);
}
