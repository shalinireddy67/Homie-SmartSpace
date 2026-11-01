import {
  STORAGE_KEY,
  THEME_STORAGE_KEY,
  CURRENT_SCHEMA_VERSION,
  type PersistedStateV1,
} from './types';
import { validateAndSanitizeState } from './validation';
import { migrateState } from './migrations';

let pendingStateToSave: PersistedStateV1 | null = null;
let debounceTimeoutId: ReturnType<typeof setTimeout> | null = null;

/**
 * Loads and sanitizes persisted configuration from LocalStorage.
 * Never throws under any circumstances.
 */
export function loadPersistedState(): Partial<PersistedStateV1> | null {
  if (typeof window === 'undefined' || !window.localStorage) {
    return null;
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) {
      return null;
    }

    // Run migration if version is older
    const migrated = migrateState(parsed as Record<string, unknown>);

    // Validate and sanitize data
    const sanitized = validateAndSanitizeState(migrated);

    if (sanitized) {
      // Ensure theme is synced with the separate nestora_theme key if present
      const separateTheme = localStorage.getItem(THEME_STORAGE_KEY);
      if (separateTheme === 'dark' || separateTheme === 'light') {
        sanitized.theme = separateTheme;
      }
    }

    return sanitized;
  } catch (err) {
    console.warn(
      '[Persistence] Failed to parse stored state, falling back to clean defaults.',
      err
    );
    return null;
  }
}

/**
 * Synchronously writes state to LocalStorage and syncs nestora_theme key.
 */
export function savePersistedState(state: PersistedStateV1): void {
  if (typeof window === 'undefined' || !window.localStorage) {
    return;
  }

  try {
    const payload: PersistedStateV1 = {
      version: CURRENT_SCHEMA_VERSION,
      devices: state.devices,
      rules: state.rules,
      schedules: state.schedules,
      notifications: state.notifications,
      simulation: state.simulation,
      theme: state.theme,
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));

    // Keep theme key synced for zero-flash inline script in index.html
    if (state.theme) {
      localStorage.setItem(THEME_STORAGE_KEY, state.theme);
    }
  } catch (err) {
    console.warn('[Persistence] LocalStorage write failed or quota exceeded.', err);
  }
}

/**
 * Debounces state saving to minimize excessive LocalStorage I/O.
 */
export function debouncedSave(
  state: PersistedStateV1,
  delayMs = 500
): void {
  pendingStateToSave = state;

  if (debounceTimeoutId !== null) {
    clearTimeout(debounceTimeoutId);
  }

  debounceTimeoutId = setTimeout(() => {
    flushSave();
  }, delayMs);
}

/**
 * Synchronously flushes any pending debounced save.
 */
export function flushSave(): void {
  if (debounceTimeoutId !== null) {
    clearTimeout(debounceTimeoutId);
    debounceTimeoutId = null;
  }

  if (pendingStateToSave !== null) {
    savePersistedState(pendingStateToSave);
    pendingStateToSave = null;
  }
}

/**
 * Initializes window pagehide event listener to flush uncommitted writes.
 */
export function setupPersistenceListeners(): () => void {
  if (typeof window === 'undefined') {
    return () => {};
  }

  const handlePageHide = () => {
    flushSave();
  };

  window.addEventListener('pagehide', handlePageHide);
  return () => {
    window.removeEventListener('pagehide', handlePageHide);
  };
}

