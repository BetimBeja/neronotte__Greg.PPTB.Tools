import { describe, expect, it } from 'vitest';
import { paletteToBrandVariants, resolveAppHeaderColors, themeModelToPreviewTheme } from '../tokenMap';
import { createDefaultThemeModel } from '../defaults';
import { PALETTE_SLOTS } from '../theme';
import { contrastRatio } from '../contrast';

describe('paletteToBrandVariants', () => {
    it('maps the 16 slots onto the brand ramp keys 10..160', () => {
        const palette = Object.fromEntries(PALETTE_SLOTS.map((slot, index) => [slot, `#0000${(index + 16).toString(16).padStart(2, '0')}`])) as Record<
            (typeof PALETTE_SLOTS)[number],
            string
        >;

        const brand = paletteToBrandVariants(palette);

        expect(brand[10]).toBe(palette.darker70);
        expect(brand[80]).toBe(palette.primary);
        expect(brand[160]).toBe(palette.lighter80);
    });
});

describe('resolveAppHeaderColors', () => {
    it('falls back to the brand primary when no header override is set', () => {
        const colors = resolveAppHeaderColors(undefined, '#0F6CBD');
        expect(colors.background).toBe('#0F6CBD');
    });

    it('keeps every explicitly authored colour', () => {
        const authored = {
            background: '#123456',
            foreground: '#FEDCBA',
            backgroundHover: '#111111',
            foregroundHover: '#222222',
            backgroundPressed: '#333333',
            foregroundPressed: '#444444',
            backgroundSelected: '#555555',
            foregroundSelected: '#666666',
        };

        expect(resolveAppHeaderColors(authored, '#0F6CBD')).toEqual(authored);
    });

    it('derives the interaction states from the rest background', () => {
        const colors = resolveAppHeaderColors({ background: '#0F6CBD' }, '#FF0000');

        expect(colors.backgroundHover).not.toBe(colors.background);
        expect(colors.backgroundPressed).not.toBe(colors.backgroundHover);
        expect(colors.backgroundSelected).not.toBe(colors.backgroundPressed);
    });

    it('derives readable foregrounds for both a dark and a light header', () => {
        const dark = resolveAppHeaderColors({ background: '#102030' }, '#0F6CBD');
        const light = resolveAppHeaderColors({ background: '#F5F5F5' }, '#0F6CBD');

        expect(contrastRatio(dark.foreground, dark.background)).toBeGreaterThanOrEqual(4.5);
        expect(contrastRatio(light.foreground, light.background)).toBeGreaterThanOrEqual(4.5);
    });

    it('ignores a blank background, as the platform does', () => {
        expect(resolveAppHeaderColors({ background: '   ' }, '#0F6CBD').background).toBe('#0F6CBD');
    });
});

describe('themeModelToPreviewTheme', () => {
    it('uses the authored font and falls back to the Fluent default', () => {
        const model = createDefaultThemeModel();

        expect(themeModelToPreviewTheme(model).fontFamily).toBe(themeModelToPreviewTheme(model).fluentTheme.fontFamilyBase);
        expect(themeModelToPreviewTheme({ ...model, font: "'GreatVibes', cursive" }).fontFamily).toBe("'GreatVibes', cursive");
    });

    it('projects the palette overrides into the preview brand ramp', () => {
        const model = { ...createDefaultThemeModel(), basePaletteColor: '#0F6CBD', paletteOverrides: { primary: '#AB1234' } };

        const preview = themeModelToPreviewTheme(model);

        expect(preview.brand[80]).toBe('#AB1234');
        expect(preview.headerColors.background).toBe('#AB1234');
    });
});
