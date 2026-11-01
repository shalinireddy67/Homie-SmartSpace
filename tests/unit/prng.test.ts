import { describe, it, expect } from 'vitest';
import { PRNG, createMulberry32 } from '@/utils/prng';

describe('PRNG (Mulberry32)', () => {
  it('generates identical sequence from the same seed', () => {
    const prng1 = new PRNG(12345);
    const prng2 = new PRNG(12345);

    for (let i = 0; i < 50; i++) {
      expect(prng1.next()).toBe(prng2.next());
    }
  });

  it('generates divergent sequence from different seeds', () => {
    const prng1 = new PRNG(12345);
    const prng2 = new PRNG(54321);

    const values1 = Array.from({ length: 10 }, () => prng1.next());
    const values2 = Array.from({ length: 10 }, () => prng2.next());

    expect(values1).not.toEqual(values2);
  });

  it('generates floats within [min, max) bounds', () => {
    const prng = new PRNG(999);
    for (let i = 0; i < 100; i++) {
      const val = prng.float(10.5, 20.5);
      expect(val).toBeGreaterThanOrEqual(10.5);
      expect(val).toBeLessThan(20.5);
    }
  });

  it('generates integers within [min, max] inclusive bounds', () => {
    const prng = new PRNG(888);
    const seen = new Set<number>();
    for (let i = 0; i < 200; i++) {
      const val = prng.int(1, 6);
      expect(val).toBeGreaterThanOrEqual(1);
      expect(val).toBeLessThanOrEqual(6);
      expect(Number.isInteger(val)).toBe(true);
      seen.add(val);
    }
    // With 200 rolls of a 6-sided die, all 6 faces should appear
    expect(seen.size).toBe(6);
  });

  it('picks random elements from an array deterministically', () => {
    const items = ['apple', 'banana', 'cherry', 'date'];
    const prng1 = new PRNG(777);
    const prng2 = new PRNG(777);

    const picks1 = Array.from({ length: 10 }, () => prng1.pick(items));
    const picks2 = Array.from({ length: 10 }, () => prng2.pick(items));

    expect(picks1).toEqual(picks2);
    expect(items).toContain(picks1[0]);
  });

  it('functional factory createMulberry32 produces matching values', () => {
    const gen = createMulberry32(42);
    const prng = new PRNG(42);

    for (let i = 0; i < 20; i++) {
      expect(gen()).toBe(prng.next());
    }
  });
});
