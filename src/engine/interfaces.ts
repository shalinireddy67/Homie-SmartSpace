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
  scheduleRepeating?(callback: () => void, ms: number): () => void;
}

export type { StoreAccessor, CommandExecutor } from './commands';

export interface CommandResult {
  ok: boolean;
  reason?: string;
  commandId: string;
}

