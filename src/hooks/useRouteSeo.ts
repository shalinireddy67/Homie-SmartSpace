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
    title: 'Overview | Homie SmartSpace',
    description:
      'A simulated smart home dashboard with room device control, real-time energy analytics, custom automation rules, and a 10,000-event virtualized activity log.',
    canonical: `${SITE_CANONICAL_HOST}/`,
  },
  '/rooms': {
    title: 'Rooms & Devices | Homie SmartSpace',
    description:
      'Manage and control smart home devices across living room, bedroom, kitchen, and exterior zones with live power and status indicators.',
    canonical: `${SITE_CANONICAL_HOST}/rooms`,
  },
  '/automations': {
    title: 'Automations | Homie SmartSpace',
    description:
      'Configure custom automation rules, execute simulated dry-runs, view scheduled timers, and inspect automation execution history.',
    canonical: `${SITE_CANONICAL_HOST}/automations`,
  },
  '/energy': {
    title: 'Energy Analytics | Homie SmartSpace',
    description:
      'Real-time and historical energy analytics, power consumption charts, room-by-room breakdowns, and statistical anomaly detection.',
    canonical: `${SITE_CANONICAL_HOST}/energy`,
  },
  '/history': {
    title: 'Event History | Homie SmartSpace',
    description:
      'Audit and filter through 10,000 virtualized smart home events, device commands, state transitions, and environmental alerts.',
    canonical: `${SITE_CANONICAL_HOST}/history`,
  },
  '/notifications': {
    title: 'Notifications | Homie SmartSpace',
    description:
      'View prioritized system alerts, security notices, device warnings, and automation failure notifications.',
    canonical: `${SITE_CANONICAL_HOST}/notifications`,
  },
  '/settings': {
    title: 'Settings | Homie SmartSpace',
    description:
      'Customize dashboard appearance, notification preferences, simulation engine speed, seed data, and configuration backups.',
    canonical: `${SITE_CANONICAL_HOST}/settings`,
  },
};

export const NOT_FOUND_SEO_META: RouteSeoMeta = {
  title: 'Page Not Found | Homie SmartSpace',
  description: 'The requested view does not exist in Homie SmartSpace or may have moved.',
  canonical: `${SITE_CANONICAL_HOST}/404`,
  noindex: true,
};

function setOrUpdateMetaTag(name: string, content: string, attributeName: 'name' | 'property' = 'name'): void {
  if (typeof document === 'undefined') return;
  let element = document.querySelector(`meta[${attributeName}="${name}"]`) as HTMLMetaElement | null;
  if (!element) {
    element = document.createElement('meta');
    element.setAttribute(attributeName, name);
    document.head.appendChild(element);
  }
  element.setAttribute('content', content);
}

function setOrUpdateCanonical(canonicalUrl: string): void {
  if (typeof document === 'undefined') return;
  let element = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
  if (!element) {
    element = document.createElement('link');
    element.setAttribute('rel', 'canonical');
    document.head.appendChild(element);
  }
  element.setAttribute('href', canonicalUrl);
}

export function useRouteSeo(): RouteSeoMeta {
  const location = useLocation();
  const pathname = location.pathname;
  const meta = ROUTE_SEO_CONFIG[pathname] || NOT_FOUND_SEO_META;

  useEffect(() => {
    // 1. Document Title
    document.title = meta.title;

    // 2. Canonical Link
    setOrUpdateCanonical(meta.canonical);

    // 3. Meta Description
    setOrUpdateMetaTag('description', meta.description, 'name');

    // 4. Open Graph Tags
    setOrUpdateMetaTag('og:title', meta.title, 'property');
    setOrUpdateMetaTag('og:description', meta.description, 'property');
    setOrUpdateMetaTag('og:url', meta.canonical, 'property');

    // 5. Twitter Tags
    setOrUpdateMetaTag('twitter:title', meta.title, 'name');
    setOrUpdateMetaTag('twitter:description', meta.description, 'name');

    // 6. Robots Meta (noindex on 404, index, follow on valid routes)
    if (meta.noindex) {
      setOrUpdateMetaTag('robots', 'noindex, nofollow', 'name');
    } else {
      setOrUpdateMetaTag('robots', 'index, follow', 'name');
    }
  }, [meta]);

  return meta;
}
