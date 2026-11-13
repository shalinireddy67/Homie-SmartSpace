import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useRuntime, getRuntimeInstance } from '@/hooks/useRuntime';
import { useStore } from '@/store';

describe('Tab Visibility Simulation Throttling', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    useStore.setState({ running: true });
    Object.defineProperty(document, 'hidden', {
      value: false,
      configurable: true,
      writable: true,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    const runtime = getRuntimeInstance();
    runtime.stop();
  });

  it('pauses simulation when tab becomes hidden and resumes when active', () => {
    const runtime = getRuntimeInstance();
    renderHook(() => useRuntime());

    // Initially started
    expect(useStore.getState().running).toBe(true);

    // Simulate tab hidden (visibilitychange)
    act(() => {
      Object.defineProperty(document, 'hidden', {
        value: true,
        configurable: true,
      });
      document.dispatchEvent(new Event('visibilitychange'));
    });

    // Should be paused
    expect(runtime.isRunning()).toBe(false);

    // Advance timers while hidden - should not accumulate ticks
    act(() => {
      vi.advanceTimersByTime(5000);
    });

    // Simulate tab returning to active
    act(() => {
      Object.defineProperty(document, 'hidden', {
        value: false,
        configurable: true,
      });
      document.dispatchEvent(new Event('visibilitychange'));
    });

    // Should resume running smoothly
    expect(runtime.isRunning()).toBe(true);
    expect(useStore.getState().running).toBe(true);
  });
});
