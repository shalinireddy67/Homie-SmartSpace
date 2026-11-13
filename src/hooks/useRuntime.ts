/**
 * React Hook to manage Central Runtime lifecycle.
 * Thin coordination hook. Zero visual UI.
 *
 * Guarantees:
 * - Starts runtime on mount and stops on unmount.
 * - Idempotent and safe under React 18 Strict Mode double-mounting.
 * - Synchronizes with Zustand store `running` state.
 */

import { useEffect, useRef } from 'react';
import { useStore } from '@/store';
import { createRuntime, type Runtime } from '@/engine/runtime';
import type { Clock, Scheduler } from '@/engine/interfaces';

const browserClock: Clock = {
  now: () => Date.now(),
};

const browserScheduler: Scheduler = {
  delay: (ms: number) => new Promise((resolve) => setTimeout(resolve, ms)),
  setInterval: (callback: () => void, ms: number) => setInterval(callback, ms),
  clearInterval: (handle: unknown) => clearInterval(handle as number),
};

let runtimeSingleton: Runtime | null = null;

export function getRuntimeInstance(): Runtime {
  if (!runtimeSingleton) {
    runtimeSingleton = createRuntime({
      store: useStore,
      clock: browserClock,
      scheduler: browserScheduler,
    });
  }
  return runtimeSingleton;
}

/**
 * Hook to be mounted once in the root AppShell.
 */
export function useRuntime(): void {
  const isRunning = useStore((s) => s.running);
  const runtimeRef = useRef<Runtime | null>(null);
  const wasRunningBeforeHiddenRef = useRef<boolean>(false);

  useEffect(() => {
    const runtime = getRuntimeInstance();
    runtimeRef.current = runtime;

    // Initialize demo data
    runtime.initDemoEnergy();

    if (isRunning) {
      runtime.start();
    } else {
      runtime.stop();
    }

    return () => {
      runtime.stop();
    };
  }, [isRunning]);

  // Tab visibility listener: pause simulation when tab is hidden, resume smoothly when active
  useEffect(() => {
    const handleVisibilityChange = () => {
      const runtime = runtimeRef.current;
      if (!runtime) return;

      if (typeof document !== 'undefined' && document.hidden) {
        if (useStore.getState().running) {
          wasRunningBeforeHiddenRef.current = true;
          runtime.stop();
        }
      } else {
        if (wasRunningBeforeHiddenRef.current) {
          wasRunningBeforeHiddenRef.current = false;
          runtime.start();
        }
      }
    };

    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', handleVisibilityChange);
    }

    return () => {
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      }
    };
  }, []);
}
