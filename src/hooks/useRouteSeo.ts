import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export interface RouteSeoMeta {
  title: string;
  description: string;
  canonical: string;
  noindex?: boolean;
}

export const SITE_CANONICAL_HOST = 'https://homie-smartspace.vercel.app';

export const ROUTE_SEO_CONFIG: Record<string, RouteSeoMeta> = {
  '/': {
    title: 'Homie SmartSpace | Smart Home Dashboard & Telemetry Simulation',
    description:
      'A responsive smart home and IoT control dashboard with room-based device control, real-time energy analytics, simulated automations, and live audit telemetry.',
    canonical: `${SITE_CANONICAL_HOST}/`,
    noindex: false,
  },
  '/app': {
    title: 'Overview | Homie SmartSpace',
    description:
      'A simulated smart home dashboard with room device control, real-time energy analytics, custom automation rules, and a 10,000-event virtualized activity log.',
    canonical: `${SITE_CANONICAL_HOST}/app`,
    noindex: true,
  },
  '/app/rooms': {
    title: 'Rooms & Devices | Homie SmartSpace',
    description:
      'Manage and control smart home devices across living room, bedroom, kitchen, and exterior zones with live power and status indicators.',
    canonical: `${SITE_CANONICAL_HOST}/app/rooms`,
    noindex: true,
  },
  '/app/automations': {
    title: 'Automations | Homie SmartSpace',
    description:
      'Configure custom automation rules, execute simulated dry-runs, view scheduled timers, and inspect automation execution history.',
    canonical: `${SITE_CANONICAL_HOST}/app/automations`,
    noindex: true,
  },
  '/app/energy': {
    title: 'Energy Analytics | Homie SmartSpace',
    description:
      'Real-time and historical energy analytics, power consumption charts, room-by-room breakdowns, and statistical anomaly detection.',
    canonical: `${SITE_CANONICAL_HOST}/app/energy`,
    noindex: true,
  },
  '/app/events': {
    title: 'Event History | Homie SmartSpace',
    description:
      'Audit and filter through 10,000 virtualized smart home events, device commands, state transitions, and environmental alerts.',
    canonical: `${SITE_CANONICAL_HOST}/app/events`,
    noindex: true,
  },
  '/app/history': {
    title: 'Event History | Homie SmartSpace',
    description:
      'Audit and filter through 10,000 virtualized smart home events, device commands, state transitions, and environmental alerts.',
    canonical: `${SITE_CANONICAL_HOST}/app/events`,
    noindex: true,
  },
  '/app/notifications': {
    title: 'Notifications | Homie SmartSpace',
    description:
      'View prioritized system alerts, security notices, device warnings, and automation failure notifications.',
    canonical: `${SITE_CANONICAL_HOST}/app/notifications`,
    noindex: true,
  },
  '/app/settings': {
    title: 'Settings | Homie SmartSpace',
    description:
      'Customize dashboard appearance, notification preferences, simulation engine speed, seed data, and configuration backups.',
    canonical: `${SITE_CANONICAL_HOST}/app/settings`,
    noindex: true,
  },
  // Legacy paths fallback mapping
  '/rooms': {
    title: 'Rooms & Devices | Homie SmartSpace',
    description: 'Manage and control smart home devices.',
    canonical: `${SITE_CANONICAL_HOST}/app/rooms`,
    noindex: true,
  },
  '/automations': {
    title: 'Automations | Homie SmartSpace',
    description: 'Configure custom automation rules and view scheduled timers.',
    canonical: `${SITE_CANONICAL_HOST}/app/automations`,
    noindex: true,
  },
  '/energy': {
    title: 'Energy Analytics | Homie SmartSpace',
    description: 'Real-time and historical energy analytics and power charts.',
    canonical: `${SITE_CANONICAL_HOST}/app/energy`,
    noindex: true,
  },
  '/history': {
    title: 'Event History | Homie SmartSpace',
    description: 'Audit and filter smart home telemetry events.',
    canonical: `${SITE_CANONICAL_HOST}/app/events`,
    noindex: true,
  },
  '/events': {
    title: 'Event History | Homie SmartSpace',
    description: 'Audit and filter smart home telemetry events.',
    canonical: `${SITE_CANONICAL_HOST}/app/events`,
    noindex: true,
  },
  '/notifications': {
    title: 'Notifications | Homie SmartSpace',
    description: 'View prioritized system alerts and security notices.',
    canonical: `${SITE_CANONICAL_HOST}/app/notifications`,
    noindex: true,
  },
  '/settings': {
    title: 'Settings | Homie SmartSpace',
    description: 'Customize dashboard appearance and engine settings.',
    canonical: `${SITE_CANONICAL_HOST}/app/settings`,
    noindex: true,
  },
};

export const NOT_FOUND_SEO_META: RouteSeoMeta = {
  title: 'Page Not Found | Homie SmartSpace',
  description: 'The requested page could not be found.',
  canonical: `${SITE_CANONICAL_HOST}/404`,
  noindex: true,
};

export function getRouteSeo(pathname: string): RouteSeoMeta {
  const normalized = pathname.replace(/\/+$/, '') || '/';
  if (ROUTE_SEO_CONFIG[normalized]) {
    return ROUTE_SEO_CONFIG[normalized];
  }
  return NOT_FOUND_SEO_META;
}

export function useRouteSeo(): RouteSeoMeta {
  const location = useLocation();
  const meta = getRouteSeo(location.pathname);

  useEffect(() => {
    // 1. Update document title
    document.title = meta.title;

    // 2. Update canonical link tag
    let canonicalTag = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!canonicalTag) {
      canonicalTag = document.createElement('link');
      canonicalTag.setAttribute('rel', 'canonical');
      document.head.appendChild(canonicalTag);
    }
    canonicalTag.setAttribute('href', meta.canonical);

    // 3. Update description meta tag
    let descTag = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    if (!descTag) {
      descTag = document.createElement('meta');
      descTag.setAttribute('name', 'description');
      document.head.appendChild(descTag);
    }
    descTag.setAttribute('content', meta.description);

    // 4. Update robots meta tag
    let robotsTag = document.querySelector<HTMLMetaElement>('meta[name="robots"]');
    if (!robotsTag) {
      robotsTag = document.createElement('meta');
      robotsTag.setAttribute('name', 'robots');
      document.head.appendChild(robotsTag);
    }
    robotsTag.setAttribute(
      'content',
      meta.noindex ? 'noindex, nofollow' : 'index, follow'
    );
  }, [meta]);

  return meta;
}
