import {
  LayoutDashboard,
  Home,
  Cpu,
  Zap,
  ScrollText,
  Bell,
  Settings,
} from 'lucide-react';

export const NAV_ITEMS = [
  { name: 'Overview', to: '/', icon: LayoutDashboard },
  { name: 'Rooms & Devices', to: '/rooms', icon: Home },
  { name: 'Automations', to: '/automations', icon: Cpu },
  { name: 'Energy Analytics', to: '/energy', icon: Zap },
  { name: 'Event History', to: '/history', icon: ScrollText },
  { name: 'Notifications', to: '/notifications', icon: Bell },
  { name: 'Settings', to: '/settings', icon: Settings },
];

export const BOTTOM_NAV_ITEMS = [
  { name: 'Overview', to: '/', icon: LayoutDashboard },
  { name: 'Rooms', to: '/rooms', icon: Home },
  { name: 'Rules', to: '/automations', icon: Cpu },
  { name: 'Energy', to: '/energy', icon: Zap },
  { name: 'History', to: '/history', icon: ScrollText },
  { name: 'Alerts', to: '/notifications', icon: Bell },
  { name: 'Settings', to: '/settings', icon: Settings },
];

