import { describe, expect, it } from 'vitest';
import { checkContrast, closestSlotOverrides, pickForeground, pickSeed, proposeTheme } from '../colorRoles';
import type { ColorCandidate } from '../colorExtraction';
import { generateBrandRamp } from '../brandRamp';
import { createDefaultThemeModel } from '../defaults';

function candidate(hex: string, coverage: number, saturation: number, lightness = 50): ColorCandidate {
    return { hex, coverage, saturation, lightness };
}

describe('pickSeed', () => {
    it('prefers a saturated candidate over a washed-out but larger one', () => {
        const seed = pickSeed([candidate('#C8CDD7', 0.7, 8), candidate('#0F6CBD', 0.3, 85)]);
        expect(seed).toBe('#0F6CBD');
    });

    it('falls back to the ranked list when everything is desaturated', () => {
        const seed = pickSeed([candidate('#C8CDD7', 0.7, 8), candidate('#B0B4BA', 0.3, 5)]);
        expect(seed).toBe('#C8CDD7');
    });

    it('returns undefined when there is nothing to pick', () => {
        expect(pickSeed([])).toBeUndefined();
    });
});

describe('pickForeground', () => {
    it('picks white on a dark header', () => {
        expect(pickForeground('#0F6CBD')).toBe('#FFFFFF');
    });

    it('picks black on a light header', () => {
        expect(pickForeground('#FFE066')).toBe('#000000');
    });

    it('never proposes a pair worse than plain black/white', () => {
        const foreground = pickForeground('#0F6CBD', [candidate('#1A73C0', 0.5, 80)]);
        const check = checkContrast(foreground, '#0F6CBD');
        expect(check?.ratio).toBeGreaterThanOrEqual(checkContrast('#FFFFFF', '#0F6CBD')!.ratio);
    });
});

describe('checkContrast', () => {
    it('flags a pair below the 4.5:1 minimum', () => {
        const check = checkContrast('#8A8A8A', '#FFFFFF');
        expect(check?.passes).toBe(false);
    });

    it('returns undefined for an unusable colour', () => {
        expect(checkContrast('not-a-colour', '#FFFFFF')).toBeUndefined();
        expect(checkContrast(undefined, '#FFFFFF')).toBeUndefined();
    });
});

describe('closestSlotOverrides', () => {
    it('assigns each candidate to a distinct slot', () => {
        const ramp = generateBrandRamp({ basePaletteColor: '#0F6CBD', lockPrimary: true, vibrancy: 0, hueTorsion: 0 });
        const overrides = closestSlotOverrides([candidate('#0F6CBD', 0.6, 85), candidate('#D66A15', 0.4, 82)], ramp);

        const slots = Object.keys(overrides);
        expect(slots).toHaveLength(2);
        expect(new Set(slots).size).toBe(2);
        expect(Object.values(overrides)).toContain('#0F6CBD');
    });
});

describe('proposeTheme', () => {
    const model = createDefaultThemeModel();

    it('maps the header band onto the header background and the palette onto the seed', () => {
        const proposal = proposeTheme(
            [candidate('#0F6CBD', 0.6, 85), candidate('#D66A15', 0.4, 82)],
            [candidate('#D66A15', 0.9, 82)],
            model,
        );

        expect(proposal.basePaletteColor).toBe('#0F6CBD');
        expect(proposal.headerBackground).toBe('#D66A15');
        expect(proposal.headerForeground).toBeDefined();
        expect(proposal.headerContrast?.ratio).toBeGreaterThan(1);
        expect(proposal.paletteOverrides).toEqual({});
    });

    it('falls back to the seed when the header band produced nothing', () => {
        const proposal = proposeTheme([candidate('#0F6CBD', 1, 85)], [], model);
        expect(proposal.headerBackground).toBe('#0F6CBD');
    });

    it('only fills slot overrides when asked to', () => {
        const candidates = [candidate('#0F6CBD', 0.6, 85), candidate('#D66A15', 0.4, 82)];
        const proposal = proposeTheme(candidates, candidates, model, { overrideSlots: true });

        expect(Object.keys(proposal.paletteOverrides).length).toBe(2);
    });

    it('returns an empty proposal for an image with no usable colour', () => {
        const proposal = proposeTheme([], [], model);

        expect(proposal.basePaletteColor).toBeUndefined();
        expect(proposal.headerBackground).toBeUndefined();
        expect(proposal.headerContrast).toBeUndefined();
    });

    it('never mutates the model it is given', () => {
        const snapshot = JSON.stringify(model);
        proposeTheme([candidate('#0F6CBD', 1, 85)], [candidate('#0F6CBD', 1, 85)], model, { overrideSlots: true });
        expect(JSON.stringify(model)).toBe(snapshot);
    });
});
