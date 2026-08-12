import { rgbToHex, rgbToHsl } from './brandRamp';

/**
 * Pure colour quantiser behind the "get colours from a website" flow
 * (docs/IMPLEMENTATION_PLAN.md §2.14, Phase 6.1).
 *
 * The whole pipeline is synchronous and works on an `ImageData`-shaped input,
 * so it can be unit tested on synthetic images without a DOM: decoding,
 * clipboard and drag & drop live in `services/imageImport.ts` instead.
 *
 * It is **deterministic** — the same pixels always produce the same ranked
 * candidates — which is what makes those tests meaningful.
 */

/** The subset of `ImageData` the extractor needs (so tests can build one by hand). */
export interface RgbaImage {
    width: number;
    height: number;
    data: Uint8ClampedArray | number[];
}

/** A rectangle of the source image, in pixels. */
export interface CropRect {
    x: number;
    y: number;
    width: number;
    height: number;
}

export interface ExtractionOptions {
    /** Restrict the analysis to this region of the image. */
    crop?: CropRect;
    /** How many candidates to return. Default 6. */
    maxColors?: number;
    /** Drop near-grey pixels (on by default, otherwise every site returns grey). */
    ignoreGreys?: boolean;
    /** Pixels lighter than this L (0-100) are treated as background. Default 95. */
    nearWhiteLightness?: number;
    /** Pixels darker than this L (0-100) are treated as background. Default 8. */
    nearBlackLightness?: number;
    /** Minimum saturation (0-100) a pixel needs when `ignoreGreys` is on. Default 12. */
    minSaturation?: number;
    /** Alpha (0-255) below which a pixel is ignored. Default 128. */
    minAlpha?: number;
    /** Longest edge of the downscaled working copy. Default 200. */
    sampleSize?: number;
}

export interface ColorCandidate {
    /** `#RRGGBB`, uppercase. */
    hex: string;
    /** Share of the analysed (non-filtered) pixels, 0..1. */
    coverage: number;
    /** HSL saturation of the candidate, 0..100. */
    saturation: number;
    /** HSL lightness of the candidate, 0..100. */
    lightness: number;
}

export interface ExtractionResult {
    candidates: ColorCandidate[];
    /** Pixels considered after cropping and sampling. */
    sampledPixels: number;
    /** Pixels that survived the transparency/white/black/grey filters. */
    keptPixels: number;
}

export const DEFAULT_EXTRACTION_OPTIONS: Required<Omit<ExtractionOptions, 'crop'>> = {
    maxColors: 6,
    ignoreGreys: true,
    nearWhiteLightness: 95,
    nearBlackLightness: 8,
    minSaturation: 12,
    minAlpha: 128,
    sampleSize: 200,
};

/** Fraction of the image height the "header only" shortcut pre-selects. */
export const HEADER_BAND_RATIO = 0.15;

interface Lab {
    l: number;
    a: number;
    b: number;
}

/**
 * sRGB → OKLab. Perceptually uniform, so clustering and ΔE merging behave on
 * gradients and photos, where raw RGB distance does not.
 */
export function rgbToOklab(r: number, g: number, b: number): Lab {
    const toLinear = (c: number) => {
        const n = c / 255;
        return n <= 0.04045 ? n / 12.92 : Math.pow((n + 0.055) / 1.055, 2.4);
    };
    const lr = toLinear(r);
    const lg = toLinear(g);
    const lb = toLinear(b);

    const l = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb);
    const m = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb);
    const s = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb);

    return {
        l: 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
        a: 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
        b: 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
    };
}

/** Euclidean distance in OKLab — the ΔE used to merge close clusters. */
export function oklabDistance(a: Lab, b: Lab): number {
    return Math.sqrt((a.l - b.l) ** 2 + (a.a - b.a) ** 2 + (a.b - b.b) ** 2);
}

/** Clusters closer than this in OKLab are considered the same brand colour. */
const MERGE_DISTANCE = 0.09;

/** Bits kept per channel when bucketing pixels (32³ = 32 768 buckets). */
const QUANTISATION_BITS = 3;

interface Bucket {
    count: number;
    r: number;
    g: number;
    b: number;
}

function clampInt(value: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, Math.round(value)));
}

function normalizeCrop(image: RgbaImage, crop: CropRect | undefined): CropRect {
    if (!crop) {
        return { x: 0, y: 0, width: image.width, height: image.height };
    }
    const x = clampInt(crop.x, 0, Math.max(0, image.width - 1));
    const y = clampInt(crop.y, 0, Math.max(0, image.height - 1));
    const width = clampInt(crop.width, 1, image.width - x);
    const height = clampInt(crop.height, 1, image.height - y);
    return { x, y, width, height };
}

/** The top band of an image — where brand colour usually lives (§2.14). */
export function headerBandCrop(image: { width: number; height: number }, ratio: number = HEADER_BAND_RATIO): CropRect {
    return {
        x: 0,
        y: 0,
        width: image.width,
        height: Math.max(1, Math.round(image.height * ratio)),
    };
}

/** Reads one pixel as a HEX colour — the eyedropper (returns `undefined` when transparent). */
export function pixelAt(image: RgbaImage, x: number, y: number): string | undefined {
    if (x < 0 || y < 0 || x >= image.width || y >= image.height) {
        return undefined;
    }
    const index = (Math.floor(y) * image.width + Math.floor(x)) * 4;
    const alpha = image.data[index + 3];
    if (alpha === undefined || alpha < 8) {
        return undefined;
    }
    return rgbToHex(image.data[index], image.data[index + 1], image.data[index + 2]);
}

/**
 * Extracts the ranked colour candidates of an image.
 *
 * The image is sampled on a bounded grid (so the cost does not depend on the
 * screenshot resolution), noise pixels are filtered out, the rest is bucketed
 * and then merged by OKLab distance, and the surviving clusters are ranked by
 * coverage weighted by saturation.
 */
export function extractPalette(image: RgbaImage, options: ExtractionOptions = {}): ExtractionResult {
    const settings = { ...DEFAULT_EXTRACTION_OPTIONS, ...stripUndefined(options) };
    const crop = normalizeCrop(image, options.crop);

    if (image.width <= 0 || image.height <= 0 || crop.width <= 0 || crop.height <= 0) {
        return { candidates: [], sampledPixels: 0, keptPixels: 0 };
    }

    // Bounded sampling grid: at most `sampleSize` steps on the longest edge.
    const longest = Math.max(crop.width, crop.height);
    const step = Math.max(1, Math.ceil(longest / Math.max(1, settings.sampleSize)));

    const buckets = new Map<number, Bucket>();
    let sampledPixels = 0;
    let keptPixels = 0;

    for (let y = crop.y; y < crop.y + crop.height; y += step) {
        for (let x = crop.x; x < crop.x + crop.width; x += step) {
            const index = (y * image.width + x) * 4;
            sampledPixels += 1;

            const alpha = image.data[index + 3];
            if (alpha < settings.minAlpha) {
                continue;
            }

            const r = image.data[index];
            const g = image.data[index + 1];
            const b = image.data[index + 2];
            const { s, l } = rgbToHsl(r, g, b);

            if (l >= settings.nearWhiteLightness || l <= settings.nearBlackLightness) {
                continue;
            }
            if (settings.ignoreGreys && s < settings.minSaturation) {
                continue;
            }

            keptPixels += 1;

            const shift = 8 - QUANTISATION_BITS;
            const key = ((r >> shift) << (QUANTISATION_BITS * 2)) | ((g >> shift) << QUANTISATION_BITS) | (b >> shift);
            const bucket = buckets.get(key);
            if (bucket) {
                bucket.count += 1;
                bucket.r += r;
                bucket.g += g;
                bucket.b += b;
            } else {
                buckets.set(key, { count: 1, r, g, b });
            }
        }
    }

    if (keptPixels === 0) {
        return { candidates: [], sampledPixels, keptPixels };
    }

    // Bucket key ordering makes the merge order — and therefore the result —
    // independent of the insertion order of the pixels.
    const clusters = [...buckets.entries()]
        .map(([key, bucket]) => ({
            key,
            count: bucket.count,
            r: bucket.r / bucket.count,
            g: bucket.g / bucket.count,
            b: bucket.b / bucket.count,
        }))
        .sort((a, b) => b.count - a.count || a.key - b.key);

    const merged: { count: number; r: number; g: number; b: number; lab: Lab }[] = [];
    for (const cluster of clusters) {
        const lab = rgbToOklab(cluster.r, cluster.g, cluster.b);
        const target = merged.find((candidate) => oklabDistance(candidate.lab, lab) <= MERGE_DISTANCE);
        if (target) {
            const total = target.count + cluster.count;
            target.r = (target.r * target.count + cluster.r * cluster.count) / total;
            target.g = (target.g * target.count + cluster.g * cluster.count) / total;
            target.b = (target.b * target.count + cluster.b * cluster.count) / total;
            target.count = total;
            // Keep the centroid in sync so later clusters merge against the
            // updated colour, not the first one that happened to arrive.
            target.lab = rgbToOklab(target.r, target.g, target.b);
        } else {
            merged.push({ count: cluster.count, r: cluster.r, g: cluster.g, b: cluster.b, lab });
        }
    }

    const candidates = merged
        .map((cluster) => {
            const { s, l } = rgbToHsl(cluster.r, cluster.g, cluster.b);
            return {
                hex: rgbToHex(cluster.r, cluster.g, cluster.b),
                coverage: cluster.count / keptPixels,
                saturation: s,
                lightness: l,
            };
        })
        // Rank by coverage with a saturation bonus: a small strongly coloured
        // logo is a better brand candidate than a large washed-out band.
        .sort((a, b) => rank(b) - rank(a) || (a.hex < b.hex ? -1 : 1))
        .slice(0, Math.max(1, settings.maxColors));

    return { candidates, sampledPixels, keptPixels };
}

/** Ranking score: coverage weighted by how saturated the colour is. */
function rank(candidate: ColorCandidate): number {
    return candidate.coverage * (0.5 + candidate.saturation / 100);
}

function stripUndefined<T extends object>(value: T): Partial<T> {
    return Object.fromEntries(Object.entries(value).filter(([, v]) => v !== undefined)) as Partial<T>;
}
