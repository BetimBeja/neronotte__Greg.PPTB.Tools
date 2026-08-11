import { createLightTheme, type BrandVariants, type Theme } from '@fluentui/react-components';
import { PALETTE_SLOTS, type PaletteSlot, type ThemeModel } from './theme';
import { applyPaletteOverrides, generateBrandRamp } from './brandRamp';

/**
 * Maps the 16 documented palette slots 1:1 onto Fluent v9's `BrandVariants`
 * ramp keys (docs/THEME_XML_REFERENCE.md §4): `darker70`..`darker10` → `10`..`70`,
 * `primary` → `80`, `lighter10`..`lighter80` → `90`..`160`.
 */
const SLOT_TO_BRAND_KEY: Record<PaletteSlot, keyof BrandVariants> = {
    darker70: 10,
    darker60: 20,
    darker50: 30,
    darker40: 40,
    darker30: 50,
    darker20: 60,
    darker10: 70,
    primary: 80,
    lighter10: 90,
    lighter20: 100,
    lighter30: 110,
    lighter40: 120,
    lighter50: 130,
    lighter60: 140,
    lighter70: 150,
    lighter80: 160,
};

/** Builds a Fluent v9 `BrandVariants` ramp from a resolved 16-slot palette. */
export function paletteToBrandVariants(palette: Record<PaletteSlot, string>): BrandVariants {
    const brand = {} as BrandVariants;
    for (const slot of PALETTE_SLOTS) {
        brand[SLOT_TO_BRAND_KEY[slot]] = palette[slot];
    }
    return brand;
}

/** A resolved preview theme: the Fluent v9 `Theme` plus the header colour overrides. */
export interface PreviewTheme {
    fluentTheme: Theme;
    brand: BrandVariants;
}

const FALLBACK_SEED = '#0F6CBD';

/**
 * Projects a `ThemeModel` into a previewable Fluent v9 theme. The preview
 * never reads the theme XML directly — this is the only place the model is
 * translated into rendering primitives (docs/IMPLEMENTATION_PLAN.md §3).
 */
export function themeModelToPreviewTheme(model: ThemeModel): PreviewTheme {
    const seed = model.basePaletteColor ?? FALLBACK_SEED;
    const ramp = generateBrandRamp({
        basePaletteColor: seed,
        lockPrimary: model.lockPrimary,
        vibrancy: model.vibrancy,
        hueTorsion: model.hueTorsion,
    });
    const palette = applyPaletteOverrides(ramp, model.paletteOverrides);
    const brand = paletteToBrandVariants(palette);

    return {
        fluentTheme: createLightTheme(brand),
        brand,
    };
}
