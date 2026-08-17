import { hexToRgb } from './brandRamp';

/**
 * WCAG 2.x contrast ratio helpers, used to surface the 4.5:1 minimum contrast
 * Microsoft recommends between `AppHeaderColors` foreground/background pairs
 * for the rest state and each interaction state (docs/THEME_XML_REFERENCE.md §3,
 * docs/IMPLEMENTATION_PLAN.md §2.11).
 */

const WCAG_AA_MINIMUM_CONTRAST = 4.5;

function srgbChannelToLinear(channel: number): number {
    const c = channel / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

/** Relative luminance per WCAG 2.x, from a HEX colour. */
export function relativeLuminance(hex: string): number {
    const { r, g, b } = hexToRgb(hex);
    const rl = srgbChannelToLinear(r);
    const gl = srgbChannelToLinear(g);
    const bl = srgbChannelToLinear(b);
    return 0.2126 * rl + 0.7152 * gl + 0.0722 * bl;
}

/** WCAG contrast ratio between two HEX colours, in the range 1..21. */
export function contrastRatio(hexA: string, hexB: string): number {
    const lumA = relativeLuminance(hexA);
    const lumB = relativeLuminance(hexB);
    const lighter = Math.max(lumA, lumB);
    const darker = Math.min(lumA, lumB);
    return (lighter + 0.05) / (darker + 0.05);
}

/** Whether a foreground/background pair meets the documented 4.5:1 minimum. */
export function meetsMinimumContrast(foreground: string, background: string): boolean {
    return contrastRatio(foreground, background) >= WCAG_AA_MINIMUM_CONTRAST;
}

export { WCAG_AA_MINIMUM_CONTRAST };
