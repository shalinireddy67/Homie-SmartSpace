/**
 * Mulberry32 Pseudo-Random Number Generator (PRNG).
 * Provides deterministic pseudo-random sequences for consistent simulation behavior.
 */

export class PRNG {
  private s: number;

  constructor(seed: number) {
    // Force seed into 32-bit unsigned integer
    this.s = (seed ^ 0xdeadbeef) >>> 0;
    if (this.s === 0) {
      this.s = 1;
    }
  }

  /**
   * Generates a 32-bit pseudo-random float in [0, 1).
   */
  next(): number {
    let t = (this.s += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /**
   * Returns a floating-point number in range [min, max).
   */
  float(min = 0, max = 1): number {
    return min + this.next() * (max - min);
  }

  /**
   * Returns an integer in range [min, max] (inclusive).
   */
  int(min: number, max: number): number {
    const lo = Math.ceil(min);
    const hi = Math.floor(max);
    return Math.floor(lo + this.next() * (hi - lo + 1));
  }

  /**
   * Returns a boolean with a specified true probability (default 0.5).
   */
  boolean(probability = 0.5): boolean {
    return this.next() < probability;
  }

  /**
   * Randomly picks one element from an array.
   */
  pick<T>(items: readonly T[]): T {
    if (items.length === 0) {
      throw new Error('Cannot pick from an empty array');
    }
    const index = Math.floor(this.next() * items.length);
    const item = items[index];
    if (item === undefined) {
      throw new Error('Invalid index picked');
    }
    return item;
  }
}

/**
 * Functional factory producing a simple generator function.
 */
export function createMulberry32(seed: number): () => number {
  const prng = new PRNG(seed);
  return () => prng.next();
}
