import { CURRENT_SCHEMA_VERSION } from './types';

export type MigrationFunction = (
  data: Record<string, unknown>
) => Record<string, unknown>;

/**
 * Migration registry mapping version N to migration taking schema from N to N+1.
 */
export const migrations: Record<number, MigrationFunction> = {
  // Migration 0 -> 1: Upgrade legacy v0 state to schema v1
  0: (legacyData: Record<string, unknown>): Record<string, unknown> => {
    const upgraded = { ...legacyData };

    // Upgrade version tag
    upgraded['version'] = 1;

    // In legacy v0, simulation speed might have been called 'speedMultiplier'
    if (
      typeof upgraded['simulation'] === 'object' &&
      upgraded['simulation'] !== null
    ) {
      const sim = { ...(upgraded['simulation'] as Record<string, unknown>) };
      if ('speedMultiplier' in sim && !('speed' in sim)) {
        sim['speed'] = sim['speedMultiplier'];
        delete sim['speedMultiplier'];
      }
      upgraded['simulation'] = sim;
    }

    // In legacy v0, devices might be missing powerWatts
    if (Array.isArray(upgraded['devices'])) {
      upgraded['devices'] = upgraded['devices'].map((d) => {
        if (typeof d === 'object' && d !== null) {
          const dev = { ...(d as Record<string, unknown>) };
          if (typeof dev['powerWatts'] !== 'number') {
            // Assign sensible fallback power draw based on device type and on state
            if (dev['type'] === 'light') {
              dev['powerWatts'] = dev['on'] ? 40 : 0;
            } else if (dev['type'] === 'thermostat') {
              dev['powerWatts'] = 250;
            } else if (dev['type'] === 'lock') {
              dev['powerWatts'] = 2;
            } else if (dev['type'] === 'camera') {
              dev['powerWatts'] = 10;
            } else {
              dev['powerWatts'] = 0;
            }
          }
          return dev;
        }
        return d;
      });
    }

    return upgraded;
  },
};

/**
 * Runs migration pipeline on raw object from whatever version it holds up to CURRENT_SCHEMA_VERSION.
 */
export function migrateState(
  rawState: Record<string, unknown>
): Record<string, unknown> {
  let currentVersion =
    typeof rawState['version'] === 'number' ? rawState['version'] : 0;

  let state = { ...rawState };

  while (currentVersion < CURRENT_SCHEMA_VERSION) {
    const migration = migrations[currentVersion];
    if (!migration) {
      // No migration found for this version step, break to prevent infinite loop
      break;
    }
    state = migration(state);
    currentVersion =
      typeof state['version'] === 'number'
        ? state['version']
        : currentVersion + 1;
  }

  state['version'] = CURRENT_SCHEMA_VERSION;
  return state;
}
