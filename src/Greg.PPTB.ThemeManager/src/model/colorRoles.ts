import type { ColorCandidate } from './colorExtraction';
import { contrastRatio, WCAG_AA_MINIMUM_CONTRAST } from './contrast';
import { generateBrandRamp, hexToRgb, normalizeHex, rgbToHsl } from './brandRamp';
import { PALETTE_SLOTS, type PaletteOverrides, type PaletteSlot, type ThemeModel } from './theme';
import { rgbToOklab, oklabDistance } from './colorExtraction';

/**
 * Turns the ranked candidates of `colorExtraction.ts` into a *proposal* for the
 * theme: the seed colour, the app header background/foreground pair and, only
 * when explicitly asked for, the closest palette slot overrides
 * (docs/IMPLEMENTATION_PLAN.md §2.14, Phase 6.2).
 *
 * Pure and non-mutating: the current model is read, never changed. Applying the
 * proposal is a single reducer action so undo reverts it in one step.
 */

export interface ProposalOptions {
    /** Also pin the extracted colours onto their closest palette slots. Default `false`. */
    overrideSlots?: boolean;
}

export interface ContrastCheck {
    foreground: string;
    background: string;
    ratio: number;
    /** Whether the pair reaches the documented 4.5:1 minimum. */
    passes: boolean;
}

export interface ThemeProposal {
    /** `basePaletteColor` suggestion, when a candidate was usable. */
    basePaletteColor?: string;
    /** `AppHeaderColors.background` suggestion. */
    headerBackground?: string;
    /** `AppHeaderColors.foreground` picked for contrast against the background. */
    headerForeground?: string;
    /** Slot overrides, only filled when `overrideSlots` is on. */
    paletteOverrides: PaletteOverrides;
    /** Live contrast readout for the proposed header pair. */
    headerContrast?: ContrastCheck;
}

/** The foregrounds tried first when no extracted candidate reads well on the header. */
const FALLBACK_FOREGROUNDS = ['#FFFFFF', '#000000'];

/** How saturated a candidate must be to be preferred as the brand seed. */
const SEED_MIN_SATURATION = 15;

/** Contrast readout for an arbitrary pair, or `undefined` when either side is unusable. */
export function checkContrast(foreground: string | undefined, background: string | undefined): ContrastCheck | undefined {
    if (!foreground || !background) {
        return undefined;
    }
    try {
        const ratio = contrastRatio(foreground, background);
        return { foreground: normalizeHex(foreground), background: normalizeHex(background), ratio, passes: ratio >= WCAG_AA_MINIMUM_CONTRAST };
    } catch {
        return undefined;
    }
}

/**
 * Picks the seed: the most saturated candidate among those with meaningful
 * coverage, falling back to the highest ranked one when the page is all greys.
 */
export function pickSeed(candidates: ColorCandidate[]): string | undefined {
    if (candidates.length === 0) {
        return undefined;
    }
    const colourful = candidates.filter((candidate) => candidate.saturation >= SEED_MIN_SATURATION);
    const pool = colourful.length > 0 ? colourful : candidates;
    // Coverage decides between two equally saturated candidates; the hex keeps
    // the choice deterministic when both are identical.
    const best = [...pool].sort(
        (a, b) => b.saturation * (0.5 + b.coverage) - a.saturation * (0.5 + a.coverage) || b.coverage - a.coverage || (a.hex < b.hex ? -1 : 1),
    )[0];
    return best?.hex;
}

/**
 * Picks the header foreground with the best contrast against `background`,
 * preferring plain white/black (what the platform itself defaults to) and only
 * then an extracted candidate.
 */
export function pickForeground(background: string, candidates: ColorCandidate[] = []): string {
    const options = [...FALLBACK_FOREGROUNDS, ...candidates.map((candidate) => candidate.hex)];
    let best = FALLBACK_FOREGROUNDS[0];
    let bestRatio = 0;

    for (const option of options) {
        const check = checkContrast(option, background);
        if (!check) {
            continue;
        }
        if (check.ratio > bestRatio) {
            best = check.foreground;
            bestRatio = check.ratio;
        }
    }

    return best;
}

/** Maps each extracted colour onto the ramp slot it is perceptually closest to. */
export function closestSlotOverrides(candidates: ColorCandidate[], ramp: Record<PaletteSlot, string>): PaletteOverrides {
    const overrides: PaletteOverrides = {};
    const taken = new Set<PaletteSlot>();

    for (const candidate of candidates) {
        const candidateLab = rgbToOklab(...rgbTuple(candidate.hex));
        let bestSlot: PaletteSlot | undefined;
        let bestDistance = Number.POSITIVE_INFINITY;

        for (const slot of PALETTE_SLOTS) {
            if (taken.has(slot)) {
                continue;
            }
            const distance = oklabDistance(candidateLab, rgbToOklab(...rgbTuple(ramp[slot])));
            if (distance < bestDistance) {
                bestDistance = distance;
                bestSlot = slot;
            }
        }

        if (bestSlot) {
            taken.add(bestSlot);
            overrides[bestSlot] = candidate.hex;
        }
    }

    return overrides;
}

function rgbTuple(hex: string): [number, number, number] {
    const { r, g, b } = hexToRgb(hex);
    return [r, g, b];
}

/**
 * Builds the proposal.
 *
 * @param candidates       ranked candidates of the whole (or cropped) image.
 * @param headerCandidates ranked candidates of the header band; the dominant
 *                         one becomes the header background.
 * @param currentModel     the model the proposal will be applied to — read only,
 *                         so slots can be compared against the current ramp.
 */
export function proposeTheme(
    candidates: ColorCandidate[],
    headerCandidates: ColorCandidate[],
    currentModel: ThemeModel,
    options: ProposalOptions = {},
): ThemeProposal {
    const basePaletteColor = pickSeed(candidates);
    // The header band is the better source for the header background; the full
    // image is the fallback when the band was all noise.
    const headerBackground = headerCandidates[0]?.hex ?? basePaletteColor;
    const headerForeground = headerBackground ? pickForeground(headerBackground, candidates) : undefined;

    let paletteOverrides: PaletteOverrides = {};
    if (options.overrideSlots && basePaletteColor) {
        const ramp = generateBrandRamp({
            basePaletteColor,
            lockPrimary: currentModel.lockPrimary,
            vibrancy: currentModel.vibrancy,
            hueTorsion: currentModel.hueTorsion,
        });
        paletteOverrides = closestSlotOverrides(candidates, ramp);
    }

    return {
        basePaletteColor,
        headerBackground,
        headerForeground,
        paletteOverrides,
        headerContrast: checkContrast(headerForeground, headerBackground),
    };
}

/** Convenience: is this colour light enough that dark text reads on it? */
export function isLight(hex: string): boolean {
    const { r, g, b } = hexToRgb(hex);
    return rgbToHsl(r, g, b).l >= 50;
}
