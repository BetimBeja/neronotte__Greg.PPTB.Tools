import type { ThemeModel } from './theme';

/** Platform-documented default for the header logo tooltip. */
export const DEFAULT_LOGO_TOOLTIP = 'Dynamics 365';

/** A blank `customTheme` model with all documented defaults applied. */
export function createDefaultThemeModel(): ThemeModel {
    return {
        kind: 'customTheme',
        basePaletteColor: undefined,
        lockPrimary: false,
        font: undefined,
        vibrancy: 0,
        hueTorsion: 0,
        logoWebResource: undefined,
        logoTooltip: undefined,
        paletteOverrides: {},
        appHeaderColors: undefined,
        unknownAttributes: {},
        unknownAppHeaderColorsAttributes: {},
    };
}

/** A blank `appHeaderColorsOnly` model. `background` must be set before it's valid. */
export function createDefaultAppHeaderColorsModel(): ThemeModel {
    return {
        kind: 'appHeaderColorsOnly',
        lockPrimary: false,
        vibrancy: 0,
        hueTorsion: 0,
        paletteOverrides: {},
        appHeaderColors: { background: '' },
        unknownAttributes: {},
        unknownAppHeaderColorsAttributes: {},
    };
}

/** A curated list of web-safe font families, offered alongside free-text entry (§2.12). */
export const WEB_SAFE_FONTS = ['Segoe UI', 'Arial', 'Helvetica', 'Georgia', 'Times New Roman', 'Verdana', 'Tahoma', 'Trebuchet MS', 'Courier New'] as const;
