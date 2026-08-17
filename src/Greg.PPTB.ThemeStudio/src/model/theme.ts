/**
 * Normalised, UI-friendly representation of a model-driven app modern theme.
 *
 * This is the single source of truth for the tool: the theme XML and the
 * Fluent v9 preview theme are both projections of a `ThemeModel`, never of
 * each other. See docs/THEME_XML_REFERENCE.md for the authoritative schema
 * this type is derived from.
 */

/** The 16 documented palette slot names, in dark → light order. */
export const PALETTE_SLOTS = [
    'darker70',
    'darker60',
    'darker50',
    'darker40',
    'darker30',
    'darker20',
    'darker10',
    'primary',
    'lighter10',
    'lighter20',
    'lighter30',
    'lighter40',
    'lighter50',
    'lighter60',
    'lighter70',
    'lighter80',
] as const;

export type PaletteSlot = (typeof PALETTE_SLOTS)[number];

/** Palette slot overrides — a HEX colour per slot, all optional. */
export type PaletteOverrides = Partial<Record<PaletteSlot, string>>;

/** The 8 `AppHeaderColors` attributes. Only `background` is required by the platform. */
export interface AppHeaderColors {
    background: string;
    foreground?: string;
    backgroundHover?: string;
    foregroundHover?: string;
    backgroundPressed?: string;
    foregroundPressed?: string;
    backgroundSelected?: string;
    foregroundSelected?: string;
}

/**
 * The two valid theme XML document shapes. `kind` records which platform
 * setting the document belongs to (see docs/THEME_XML_REFERENCE.md §1):
 * - `customTheme` → consumed by the **Custom theme definition** setting.
 * - `appHeaderColorsOnly` → consumed by the **Override app header color** setting.
 */
export type ThemeDocumentKind = 'customTheme' | 'appHeaderColorsOnly';

export interface ThemeModel {
    kind: ThemeDocumentKind;

    /** Seed colour used to generate the 16-slot palette. Required for `customTheme`. */
    basePaletteColor?: string;

    /**
     * `false` (default) = accessibility-optimised ramp, seed may not appear in
     * any slot. `true` = seed placed in the `primary` slot, contrast not guaranteed.
     */
    lockPrimary: boolean;

    /** CSS font-family string, e.g. `'GreatVibes', cursive`. */
    font?: string;

    /** Muteness/brightness of the palette, mostly the lighter colours. -100..100. */
    vibrancy: number;

    /** Tint/shade/tone of the palette, mostly the lighter colours. -100..100. */
    hueTorsion: number;

    /** Logical name of the image web resource used as the app-header logo. */
    logoWebResource?: string;

    /** Tooltip on the logo. Platform default is `"Dynamics 365"`. */
    logoTooltip?: string;

    /** Explicit overrides for any of the 16 palette slots. */
    paletteOverrides: PaletteOverrides;

    /**
     * `AppHeaderColors`, present when `kind === 'appHeaderColorsOnly'`, and
     * optionally present as the nested element of a `customTheme` document.
     */
    appHeaderColors?: AppHeaderColors;

    /**
     * Attributes found on the root element that this model doesn't know how
     * to edit, preserved verbatim so a load→save round-trip never silently
     * drops data (see docs/IMPLEMENTATION_PLAN.md §2.6).
     */
    unknownAttributes: Record<string, string>;

    /**
     * Same preservation strategy for unknown attributes found on the nested
     * `AppHeaderColors` element of a `customTheme` document.
     */
    unknownAppHeaderColorsAttributes: Record<string, string>;
}
