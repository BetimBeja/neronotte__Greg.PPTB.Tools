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

/** A starter theme the user can apply as a starting point. */
export interface ThemePreset {
    id: string;
    label: string;
    description: string;
    /** Applied on top of a blank `customTheme` model. */
    create: () => ThemeModel;
}

function preset(basePaletteColor: string, appHeaderBackground: string, appHeaderForeground: string): () => ThemeModel {
    return () => ({
        ...createDefaultThemeModel(),
        basePaletteColor,
        appHeaderColors: {
            background: appHeaderBackground,
            foreground: appHeaderForeground,
        },
    });
}

/**
 * Documented starter presets (docs/IMPLEMENTATION_PLAN.md §5, Phase 2). They only
 * seed the palette and the header colours — everything stays editable afterwards.
 */
export const THEME_PRESETS: ThemePreset[] = [
    {
        id: 'default',
        label: 'Power Platform blue',
        description: 'The out-of-the-box modern look, as a starting point.',
        create: preset('#0F6CBD', '#0F6CBD', '#FFFFFF'),
    },
    {
        id: 'forest',
        label: 'Forest green',
        description: 'A deep green palette with a matching dark header.',
        create: preset('#12783F', '#12783F', '#FFFFFF'),
    },
    {
        id: 'plum',
        label: 'Plum',
        description: 'A purple palette with a high-contrast header.',
        create: preset('#7A3B96', '#4B1F5E', '#FFFFFF'),
    },
    {
        id: 'graphite',
        label: 'Graphite',
        description: 'A neutral palette with a near-black header.',
        create: preset('#5D5D5D', '#1F1F1F', '#FFFFFF'),
    },
];
