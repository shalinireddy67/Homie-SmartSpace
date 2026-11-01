/**
 * Core engine interfaces for dependency injection.
 * Zero React dependencies.
 */

export interface Clock {
  now(): number;
}

export interface Scheduler {
  delay(ms: number): Promise<void>;
  setInterval(callback: () => void, ms: number): unknown;
  clearInterval(handle: unknown): void;
}

export interface CommandResult {
  ok: boolean;
  reason?: string;
  commandId: string;
}
