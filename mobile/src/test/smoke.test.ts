import { describe, it, expect } from '@jest/globals';

describe('setup jest-expo', () => {
  it('corre con el preset de expo', () => {
    expect(typeof describe).toBe('function');
    expect(typeof global).toBe('object');
  });
});
