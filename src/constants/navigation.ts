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
  { name: 'Overview', to: '/app', icon: LayoutDashboard },
  { name: 'Rooms & Devices', to: '/app/rooms', icon: Home },
  { name: 'Automations', to: '/app/automations', icon: Cpu },
  { name: 'Energy Analytics', to: '/app/energy', icon: Zap },
  { name: 'Event History', to: '/app/events', icon: ScrollText },
  { name: 'Notifications', to: '/app/notifications', icon: Bell },
  { name: 'Settings', to: '/app/settings', icon: Settings },
];

export const BOTTOM_NAV_ITEMS = [
  { name: 'Overview', to: '/app', icon: LayoutDashboard },
  { name: 'Rooms', to: '/app/rooms', icon: Home },
  { name: 'Rules', to: '/app/automations', icon: Cpu },
  { name: 'Energy', to: '/app/energy', icon: Zap },
  { name: 'History', to: '/app/events', icon: ScrollText },
  { name: 'Alerts', to: '/app/notifications', icon: Bell },
  { name: 'Settings', to: '/app/settings', icon: Settings },
];

