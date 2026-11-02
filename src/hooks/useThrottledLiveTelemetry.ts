import { useState, useEffect, useRef } from 'react';
import { useStore } from '@/store';
import type { LivePowerReading } from '@/types';

/**
 * Throttles live power telemetry updates to at most once per second (throttleMs).
 * Uses useStore.subscribe to prevent store ticks from triggering unthrottled React renders.
 */
export function useThrottledLiveTelemetry(throttleMs = 1000): LivePowerReading[] {
  const [throttledTelemetry, setThrottledTelemetry] = useState<LivePowerReading[]>(
    () => useStore.getState().liveTelemetry
  );
  const lastUpdateRef = useRef<number>(Date.now());
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const unsubscribe = useStore.subscribe((state) => {
      const now = Date.now();
      const elapsed = now - lastUpdateRef.current;

      if (elapsed >= throttleMs) {
        lastUpdateRef.current = now;
        setThrottledTelemetry(state.liveTelemetry);
      } else if (!timerRef.current) {
        timerRef.current = setTimeout(() => {
          lastUpdateRef.current = Date.now();
          setThrottledTelemetry(useStore.getState().liveTelemetry);
          timerRef.current = null;
        }, throttleMs - elapsed);
      }
    });

    return () => {
      unsubscribe();
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [throttleMs]);

  return throttledTelemetry;
}

/**
 * Throttles virtual simulation time to at most once per second (throttleMs).
 */
export function useThrottledVirtualTime(throttleMs = 1000): number {
  const [throttledTime, setThrottledTime] = useState<number>(
    () => useStore.getState().virtualTime ?? Date.now()
  );
  const lastUpdateRef = useRef<number>(Date.now());
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const unsubscribe = useStore.subscribe((state) => {
      const now = Date.now();
      const elapsed = now - lastUpdateRef.current;

      if (elapsed >= throttleMs) {
        lastUpdateRef.current = now;
        setThrottledTime(state.virtualTime ?? Date.now());
      } else if (!timerRef.current) {
        timerRef.current = setTimeout(() => {
          lastUpdateRef.current = Date.now();
          setThrottledTime(useStore.getState().virtualTime ?? Date.now());
          timerRef.current = null;
        }, throttleMs - elapsed);
      }
    });

    return () => {
      unsubscribe();
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [throttleMs]);

  return throttledTime;
}


