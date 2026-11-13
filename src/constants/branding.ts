/**
 * Global Branding Constants
 * All UI labels, titles, and headers must consume these constants
 * to ensure consistency across the application.
 */
export const APP_NAME = 'Homie SmartSpace';
export const APP_SHORT_NAME = 'Homie';
export const APP_SLUG = 'homie-smartspace';
export const APP_TAGLINE = 'Smart home and IoT control dashboard';
export const APP_DESCRIPTION = 'Smart home and IoT control dashboard';
export const APP_VERSION = '0.1.0';
export const APP_COPYRIGHT = '© 2026 Homie SmartSpace. Simulated Data Environment.';

export const APP_STORAGE_PREFIX = 'HOMIE_SMARTSPACE';

/**
 * Storage keys derived directly from APP_STORAGE_PREFIX
 */
export const APP_STATE_STORAGE_KEY = `${APP_STORAGE_PREFIX}_V1_STATE`;
export const APP_THEME_STORAGE_KEY = `${APP_STORAGE_PREFIX.toLowerCase()}_theme`;
