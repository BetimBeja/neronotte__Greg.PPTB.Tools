import { PALETTE_SLOTS, type AppHeaderColors, type PaletteOverrides, type ThemeModel } from './theme';

/** Thrown when a theme XML document cannot be parsed into a `ThemeModel`. */
export class ThemeXmlParseError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'ThemeXmlParseError';
    }
}

const CUSTOM_THEME_ATTRS = ['basePaletteColor', 'lockPrimary', 'font', 'vibrancy', 'hueTorsion', 'logoWebResource', 'logoTooltip', ...PALETTE_SLOTS] as const;

const APP_HEADER_COLORS_ATTRS = ['background', 'foreground', 'backgroundHover', 'foregroundHover', 'backgroundPressed', 'foregroundPressed', 'backgroundSelected', 'foregroundSelected'] as const;

/**
 * Case-insensitive attribute lookup: the Microsoft prose uses PascalCase while
 * every published example uses camelCase (docs/THEME_XML_REFERENCE.md §6.1).
 * Returns the matching known (camelCase) name for a raw attribute name, or
 * `undefined` if the attribute isn't one of the documented ones.
 */
function matchKnownAttribute(rawName: string, knownNames: readonly string[]): string | undefined {
    const lower = rawName.toLowerCase();
    return knownNames.find((known) => known.toLowerCase() === lower);
}

function readAttributes(element: Element): Array<{ name: string; value: string }> {
    const result: Array<{ name: string; value: string }> = [];
    for (const attr of Array.from(element.attributes)) {
        result.push({ name: attr.name, value: attr.value });
    }
    return result;
}

function parseAppHeaderColorsElement(element: Element): { known: Partial<AppHeaderColors>; unknown: Record<string, string> } {
    const known: Partial<AppHeaderColors> = {};
    const unknown: Record<string, string> = {};

    for (const { name, value } of readAttributes(element)) {
        const knownName = matchKnownAttribute(name, APP_HEADER_COLORS_ATTRS);
        if (knownName) {
            (known as Record<string, string>)[knownName] = value;
        } else {
            unknown[name] = value;
        }
    }

    return { known, unknown };
}

/**
 * Parse a theme XML document (either root shape) into a `ThemeModel`.
 * Malformed documents throw a `ThemeXmlParseError` with a readable message
 * instead of propagating a raw `DOMParser` error.
 */
export function parseThemeXml(xml: string): ThemeModel {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xml, 'application/xml');

    const parserError = doc.getElementsByTagName('parsererror')[0];
    if (parserError) {
        throw new ThemeXmlParseError(`The theme file isn't valid XML: ${parserError.textContent?.trim() ?? 'unknown parse error'}`);
    }

    const root = doc.documentElement;
    if (!root) {
        throw new ThemeXmlParseError('The theme file is empty.');
    }

    const rootName = root.tagName.toLowerCase();

    if (rootName === 'appheadercolors') {
        const { known, unknown } = parseAppHeaderColorsElement(root);
        if (!known.background) {
            throw new ThemeXmlParseError('The <AppHeaderColors> element is missing its required "background" attribute.');
        }

        return {
            kind: 'appHeaderColorsOnly',
            lockPrimary: false,
            vibrancy: 0,
            hueTorsion: 0,
            paletteOverrides: {},
            appHeaderColors: known as AppHeaderColors,
            unknownAttributes: {},
            unknownAppHeaderColorsAttributes: unknown,
        };
    }

    if (rootName !== 'customtheme') {
        throw new ThemeXmlParseError(`Unrecognised root element "<${root.tagName}>". Expected <CustomTheme> or <AppHeaderColors>.`);
    }

    const known: Record<string, string> = {};
    const unknownAttributes: Record<string, string> = {};

    for (const { name, value } of readAttributes(root)) {
        const knownName = matchKnownAttribute(name, CUSTOM_THEME_ATTRS);
        if (knownName) {
            known[knownName] = value;
        } else {
            unknownAttributes[name] = value;
        }
    }

    const paletteOverrides: PaletteOverrides = {};
    for (const slot of PALETTE_SLOTS) {
        if (known[slot] !== undefined) {
            paletteOverrides[slot] = known[slot];
        }
    }

    let appHeaderColors: AppHeaderColors | undefined;
    let unknownAppHeaderColorsAttributes: Record<string, string> = {};
    const headerElements = Array.from(root.children).filter((child) => child.tagName.toLowerCase() === 'appheadercolors');
    if (headerElements.length > 1) {
        throw new ThemeXmlParseError('<CustomTheme> may contain at most one <AppHeaderColors> child element.');
    }
    if (headerElements.length === 1) {
        const parsed = parseAppHeaderColorsElement(headerElements[0]);
        if (!parsed.known.background) {
            throw new ThemeXmlParseError('The nested <AppHeaderColors> element is missing its required "background" attribute.');
        }
        appHeaderColors = parsed.known as AppHeaderColors;
        unknownAppHeaderColorsAttributes = parsed.unknown;
    }

    return {
        kind: 'customTheme',
        basePaletteColor: known.basePaletteColor,
        lockPrimary: known.lockPrimary?.toLowerCase() === 'true',
        font: known.font,
        vibrancy: known.vibrancy !== undefined ? Number(known.vibrancy) : 0,
        hueTorsion: known.hueTorsion !== undefined ? Number(known.hueTorsion) : 0,
        logoWebResource: known.logoWebResource,
        logoTooltip: known.logoTooltip,
        paletteOverrides,
        appHeaderColors,
        unknownAttributes,
        unknownAppHeaderColorsAttributes,
    };
}

function setAttributes(element: Element, attrs: Record<string, string | undefined>) {
    for (const [name, value] of Object.entries(attrs)) {
        if (value !== undefined && value !== '') {
            element.setAttribute(name, value);
        }
    }
}

function serializeAppHeaderColorsAttrs(colors: AppHeaderColors, unknown: Record<string, string>): Record<string, string | undefined> {
    return {
        background: colors.background,
        foreground: colors.foreground,
        backgroundHover: colors.backgroundHover,
        foregroundHover: colors.foregroundHover,
        backgroundPressed: colors.backgroundPressed,
        foregroundPressed: colors.foregroundPressed,
        backgroundSelected: colors.backgroundSelected,
        foregroundSelected: colors.foregroundSelected,
        ...unknown,
    };
}

/**
 * Serialise a `ThemeModel` back to theme XML. Known attributes are always
 * emitted in camelCase (docs/THEME_XML_REFERENCE.md §6.1); attributes the UI
 * doesn't model are re-emitted verbatim so round-tripping a loaded file never
 * silently drops data (docs/IMPLEMENTATION_PLAN.md §2.6).
 */
export function serializeThemeModel(model: ThemeModel): string {
    const doc = document.implementation.createDocument(null, null, null);

    if (model.kind === 'appHeaderColorsOnly') {
        if (!model.appHeaderColors?.background) {
            throw new ThemeXmlParseError('Cannot serialise: "background" is required on <AppHeaderColors>.');
        }
        const root = doc.createElement('AppHeaderColors');
        setAttributes(root, serializeAppHeaderColorsAttrs(model.appHeaderColors, model.unknownAppHeaderColorsAttributes));
        doc.appendChild(root);
        return new XMLSerializer().serializeToString(doc);
    }

    const root = doc.createElement('CustomTheme');
    setAttributes(root, {
        basePaletteColor: model.basePaletteColor,
        lockPrimary: model.lockPrimary ? 'true' : undefined,
        font: model.font,
        vibrancy: model.vibrancy !== 0 ? String(model.vibrancy) : undefined,
        hueTorsion: model.hueTorsion !== 0 ? String(model.hueTorsion) : undefined,
        logoWebResource: model.logoWebResource,
        logoTooltip: model.logoTooltip,
        ...model.paletteOverrides,
        ...model.unknownAttributes,
    });

    if (model.appHeaderColors?.background) {
        const header = doc.createElement('AppHeaderColors');
        setAttributes(header, serializeAppHeaderColorsAttrs(model.appHeaderColors, model.unknownAppHeaderColorsAttributes));
        root.appendChild(header);
    }

    doc.appendChild(root);
    return new XMLSerializer().serializeToString(doc);
}
