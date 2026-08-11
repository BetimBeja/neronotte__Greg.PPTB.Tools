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

function hexToHsl(hex: string): Hsl {
    const { r, g, b } = hexToRgb(hex);
    return rgbToHsl(r, g, b);
}

function hslToHex(hsl: Hsl): string {
    const { r, g, b } = hslToRgb(hsl.h, hsl.s, hsl.l);
    return rgbToHex(r, g, b);
}

/** Target lightness (0-100) for each slot, dark → light, with `primary` at index 7. */
const TARGET_LIGHTNESS = [10, 20, 28, 36, 44, 52, 60, undefined, 74, 80, 85, 89, 92, 95, 97, 99] as const;

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
    const hueShiftMax = clamp(hueTorsion, -100, 100) / 100 * 30; // up to +/-30 degrees at the lightest slot

    const result = {} as Record<PaletteSlot, string>;

    PALETTE_SLOTS.forEach((slot, index) => {
        if (slot === 'primary') {
            result[slot] = lockPrimary ? basePaletteColor.toUpperCase() : hslToHex(seedHsl);
            return;
        }

        const targetLightness = TARGET_LIGHTNESS[index] as number;
        // How far this slot sits from the primary slot, 0 (adjacent) .. 1 (extreme).
        const distanceFromPrimary = Math.abs(index - 7) / 7;

        // Vibrancy mutes/boosts saturation, mostly on the lighter slots.
        const isLighterSlot = index > 7;
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
