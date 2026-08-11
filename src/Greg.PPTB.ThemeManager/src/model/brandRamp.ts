import { PALETTE_SLOTS, type PaletteOverrides, type PaletteSlot } from './theme';

/**
 * Approximates the platform's palette ramp generator (`basePaletteColor` +
 * `vibrancy` + `hueTorsion` → 16 slots). Microsoft does not publish the exact
 * algorithm; it points makers at the Fluent theme designer as the reference
 * implementation (docs/THEME_XML_REFERENCE.md §4). This is therefore an
 * approximation — exact colour-for-colour parity with the platform is not
 * guaranteed, and slot overrides remain the way to get exact colours
 * (docs/IMPLEMENTATION_PLAN.md §4.2).
 */

interface Hsl {
    h: number; // 0-360
    s: number; // 0-100
    l: number; // 0-100
}

function clamp(value: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, value));
}

export function hexToRgb(hex: string): { r: number; g: number; b: number } {
    const normalized = hex.replace('#', '');
    const full = normalized.length === 3 ? normalized.split('').map((c) => c + c).join('') : normalized;
    const num = parseInt(full, 16);
    if (full.length !== 6 || Number.isNaN(num)) {
        throw new Error(`Invalid HEX colour: "${hex}"`);
    }
    return {
        r: (num >> 16) & 255,
        g: (num >> 8) & 255,
        b: num & 255,
    };
}

export function rgbToHex(r: number, g: number, b: number): string {
    const toHex = (n: number) => clamp(Math.round(n), 0, 255).toString(16).padStart(2, '0');
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
}

export function rgbToHsl(r: number, g: number, b: number): Hsl {
    const rn = r / 255;
    const gn = g / 255;
    const bn = b / 255;
    const max = Math.max(rn, gn, bn);
    const min = Math.min(rn, gn, bn);
    const l = (max + min) / 2;

    if (max === min) {
        return { h: 0, s: 0, l: l * 100 };
    }

    const d = max - min;
    const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    let h: number;
    switch (max) {
        case rn:
            h = (gn - bn) / d + (gn < bn ? 6 : 0);
            break;
        case gn:
            h = (bn - rn) / d + 2;
            break;
        default:
            h = (rn - gn) / d + 4;
    }
    h *= 60;

    return { h, s: s * 100, l: l * 100 };
}

export function hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number } {
    const hn = ((h % 360) + 360) % 360 / 360;
    const sn = clamp(s, 0, 100) / 100;
    const ln = clamp(l, 0, 100) / 100;

    if (sn === 0) {
        const v = ln * 255;
        return { r: v, g: v, b: v };
    }

    const q = ln < 0.5 ? ln * (1 + sn) : ln + sn - ln * sn;
    const p = 2 * ln - q;
    const hueToRgb = (t: number) => {
        let tt = t;
        if (tt < 0) tt += 1;
        if (tt > 1) tt -= 1;
        if (tt < 1 / 6) return p + (q - p) * 6 * tt;
        if (tt < 1 / 2) return q;
        if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6;
        return p;
    };

    return {
        r: hueToRgb(hn + 1 / 3) * 255,
        g: hueToRgb(hn) * 255,
        b: hueToRgb(hn - 1 / 3) * 255,
    };
}

/** HSV colour, the shape the Fluent v9 `ColorPicker` works with. */
export interface Hsv {
    h: number; // 0-360
    s: number; // 0-1
    v: number; // 0-1
}

const HEX_PATTERN = /^#?([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

/** Whether a string is a valid 3- or 6-digit HTML hex colour (with or without `#`). */
export function isValidHex(value: string): boolean {
    return HEX_PATTERN.test(value.trim());
}

/** Normalises any accepted hex spelling to the canonical `#RRGGBB` uppercase form. */
export function normalizeHex(value: string): string {
    const { r, g, b } = hexToRgb(value.trim());
    return rgbToHex(r, g, b);
}

export function hexToHsv(hex: string): Hsv {
    const { r, g, b } = hexToRgb(hex);
    const rn = r / 255;
    const gn = g / 255;
    const bn = b / 255;
    const max = Math.max(rn, gn, bn);
    const min = Math.min(rn, gn, bn);
    const d = max - min;

    let h = 0;
    if (d !== 0) {
        switch (max) {
            case rn:
                h = ((gn - bn) / d + (gn < bn ? 6 : 0)) * 60;
                break;
            case gn:
                h = ((bn - rn) / d + 2) * 60;
                break;
            default:
                h = ((rn - gn) / d + 4) * 60;
        }
    }

    return { h, s: max === 0 ? 0 : d / max, v: max };
}

export function hsvToHex(hsv: Hsv): string {
    const h = ((hsv.h % 360) + 360) % 360;
    const s = clamp(hsv.s, 0, 1);
    const v = clamp(hsv.v, 0, 1);

    const c = v * s;
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = v - c;

    const sector = Math.floor(h / 60) % 6;
    const [r1, g1, b1] = [
        [c, x, 0],
        [x, c, 0],
        [0, c, x],
        [0, x, c],
        [x, 0, c],
        [c, 0, x],
    ][sector];

    return rgbToHex((r1 + m) * 255, (g1 + m) * 255, (b1 + m) * 255);
}

function hexToHsl(hex: string): Hsl {
    const { r, g, b } = hexToRgb(hex);
    return rgbToHsl(r, g, b);
}

function hslToHex(hsl: Hsl): string {
    const { r, g, b } = hslToRgb(hsl.h, hsl.s, hsl.l);
    return rgbToHex(r, g, b);
}

/**
 * How far each slot sits along its half of the ramp, dark → light, with
 * `primary` (index 7) as the anchor: the darker slots are spread between the
 * darkest end and the primary's own lightness, the lighter slots between the
 * primary and the lightest end. Anchoring on the seed keeps the ramp
 * monotonic for any seed — a fixed lightness table makes `darker10` end up
 * *lighter* than a dark `primary`, which then paints links and hover states
 * wrong in the preview.
 */
const DARKER_STOPS = [0.12, 0.25, 0.38, 0.5, 0.63, 0.76, 0.88] as const;
const LIGHTER_STOPS = [0.14, 0.34, 0.52, 0.66, 0.76, 0.86, 0.93, 1] as const;

/** Lightness (0-100) of the extreme ends of the ramp. */
const DARKEST_LIGHTNESS = 6;
const LIGHTEST_LIGHTNESS = 99;

export interface BrandRampOptions {
    basePaletteColor: string;
    lockPrimary: boolean;
    /** -100..100 */
    vibrancy: number;
    /** -100..100 */
    hueTorsion: number;
}

/**
 * Generates the 16-slot palette ramp from a seed colour.
 *
 * - `lockPrimary=true`: the seed is placed verbatim in `primary`, remaining
 *   slots are generated lighter/darker from it (contrast not guaranteed).
 * - `lockPrimary=false` (default): an accessibility-oriented ramp is
 *   generated where the seed's hue anchors the ramp but the seed colour
 *   itself may not appear in any slot.
 */
export function generateBrandRamp(options: BrandRampOptions): Record<PaletteSlot, string> {
    const { basePaletteColor, lockPrimary, vibrancy, hueTorsion } = options;
    const seedHsl = hexToHsl(basePaletteColor);

    const vibrancyFactor = clamp(vibrancy, -100, 100) / 100;
    const hueShiftMax = (clamp(hueTorsion, -100, 100) / 100) * 30; // up to +/-30 degrees at the lightest slot

    // The ramp is anchored on the seed's own lightness; the two ends move with
    // it so both halves keep some room even for a near-black or near-white seed.
    const primaryLightness = clamp(seedHsl.l, 0, 100);
    const darkestLightness = Math.min(DARKEST_LIGHTNESS, primaryLightness * 0.5);
    const lightestLightness = Math.max(LIGHTEST_LIGHTNESS, primaryLightness + (100 - primaryLightness) * 0.5);

    const result = {} as Record<PaletteSlot, string>;

    PALETTE_SLOTS.forEach((slot, index) => {
        if (slot === 'primary') {
            result[slot] = lockPrimary ? basePaletteColor.toUpperCase() : hslToHex(seedHsl);
            return;
        }

        // How far this slot sits from the primary slot, 0 (adjacent) .. 1 (extreme).
        const distanceFromPrimary = Math.abs(index - 7) / 8;

        const isLighterSlot = index > 7;
        const targetLightness = isLighterSlot
            ? primaryLightness + (lightestLightness - primaryLightness) * LIGHTER_STOPS[index - 8]
            : darkestLightness + (primaryLightness - darkestLightness) * DARKER_STOPS[index];

        // Vibrancy mutes/boosts saturation, mostly on the lighter slots.
        const saturationAdjust = isLighterSlot ? vibrancyFactor * 40 * distanceFromPrimary : 0;
        const saturation = clamp(seedHsl.s + saturationAdjust, 0, 100);

        // Hue torsion tints/shades, mostly the lighter slots.
        const hueShift = isLighterSlot ? hueShiftMax * distanceFromPrimary : 0;

        result[slot] = hslToHex({ h: seedHsl.h + hueShift, s: saturation, l: targetLightness });
    });

    return result;
}

/** Applies explicit slot overrides on top of a generated ramp. */
export function applyPaletteOverrides(ramp: Record<PaletteSlot, string>, overrides: PaletteOverrides): Record<PaletteSlot, string> {
    return { ...ramp, ...overrides };
}
