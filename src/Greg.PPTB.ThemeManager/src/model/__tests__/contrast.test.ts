import { describe, expect, it } from 'vitest';
import { contrastRatio, meetsMinimumContrast } from '../contrast';

describe('contrastRatio', () => {
    it('returns 21 for black on white', () => {
        expect(contrastRatio('#000000', '#FFFFFF')).toBeCloseTo(21, 0);
    });

    it('returns 1 for identical colours', () => {
        expect(contrastRatio('#123456', '#123456')).toBeCloseTo(1, 5);
    });

    it('is symmetric regardless of argument order', () => {
        expect(contrastRatio('#12783F', '#FFFFFF')).toBeCloseTo(contrastRatio('#FFFFFF', '#12783F'), 5);
    });
});

describe('meetsMinimumContrast', () => {
    it('accepts a high-contrast pair', () => {
        expect(meetsMinimumContrast('#FFFFFF', '#000000')).toBe(true);
    });

    it('rejects a low-contrast pair', () => {
        expect(meetsMinimumContrast('#EEEEEE', '#FFFFFF')).toBe(false);
    });
});
