import { describe, expect, it } from 'vitest';
import { extractPalette, headerBandCrop, pixelAt, type RgbaImage } from '../colorExtraction';

/**
 * Synthetic images only — the extractor takes a plain `{ width, height, data }`,
 * so the whole pipeline is testable without a DOM (docs/IMPLEMENTATION_PLAN.md §4.5).
 */

interface Band {
    /** Number of rows painted with this colour. */
    rows: number;
    rgba: [number, number, number, number];
}

function buildImage(width: number, bands: Band[]): RgbaImage {
    const height = bands.reduce((total, band) => total + band.rows, 0);
    const data = new Uint8ClampedArray(width * height * 4);
    let y = 0;
    for (const band of bands) {
        for (let row = 0; row < band.rows; row += 1, y += 1) {
            for (let x = 0; x < width; x += 1) {
                const index = (y * width + x) * 4;
                data[index] = band.rgba[0];
                data[index + 1] = band.rgba[1];
                data[index + 2] = band.rgba[2];
                data[index + 3] = band.rgba[3];
            }
        }
    }
    return { width, height, data };
}

const BLUE: [number, number, number, number] = [15, 108, 189, 255];
const ORANGE: [number, number, number, number] = [214, 106, 21, 255];
const WHITE: [number, number, number, number] = [255, 255, 255, 255];
const GREY: [number, number, number, number] = [128, 128, 128, 255];
const BLACK: [number, number, number, number] = [0, 0, 0, 255];

describe('extractPalette', () => {
    it('returns the flat colour of a solid image', () => {
        const image = buildImage(40, [{ rows: 40, rgba: BLUE }]);
        const { candidates } = extractPalette(image);

        expect(candidates).toHaveLength(1);
        expect(candidates[0].hex).toBe('#0F6CBD');
        expect(candidates[0].coverage).toBeCloseTo(1, 5);
    });

    it('ignores white, black and grey noise', () => {
        const image = buildImage(40, [
            { rows: 10, rgba: WHITE },
            { rows: 10, rgba: GREY },
            { rows: 10, rgba: BLACK },
            { rows: 10, rgba: ORANGE },
        ]);

        const { candidates } = extractPalette(image);

        expect(candidates.map((candidate) => candidate.hex)).toEqual(['#D66A15']);
    });

    it('keeps greys when "ignore greys" is off', () => {
        const image = buildImage(40, [
            { rows: 20, rgba: GREY },
            { rows: 20, rgba: ORANGE },
        ]);

        const withGreys = extractPalette(image, { ignoreGreys: false });
        expect(withGreys.candidates.map((candidate) => candidate.hex).sort()).toEqual(['#808080', '#D66A15']);
    });

    it('returns no candidate for a fully transparent image', () => {
        const image = buildImage(20, [{ rows: 20, rgba: [15, 108, 189, 0] }]);
        const result = extractPalette(image);

        expect(result.candidates).toEqual([]);
        expect(result.keptPixels).toBe(0);
    });

    it('returns no candidate for an all-white page', () => {
        const image = buildImage(20, [{ rows: 20, rgba: WHITE }]);
        expect(extractPalette(image).candidates).toEqual([]);
    });

    it('ranks a strongly coloured area above a slightly larger muted one', () => {
        const image = buildImage(40, [
            { rows: 24, rgba: [120, 140, 170, 255] }, // larger, muted
            { rows: 16, rgba: ORANGE }, // smaller, strongly coloured
        ]);

        const { candidates } = extractPalette(image);
        expect(candidates[0].hex).toBe('#D66A15');
    });

    it('restricts the analysis to the crop rectangle', () => {
        const image = buildImage(40, [
            { rows: 8, rgba: ORANGE },
            { rows: 32, rgba: BLUE },
        ]);

        const header = extractPalette(image, { crop: headerBandCrop(image, 0.2) });
        expect(header.candidates.map((candidate) => candidate.hex)).toEqual(['#D66A15']);

        const whole = extractPalette(image);
        expect(whole.candidates[0].hex).toBe('#0F6CBD');
    });

    it('clamps an out-of-bounds crop instead of reading outside the buffer', () => {
        const image = buildImage(20, [{ rows: 20, rgba: BLUE }]);
        const result = extractPalette(image, { crop: { x: -10, y: -10, width: 500, height: 500 } });

        expect(result.candidates.map((candidate) => candidate.hex)).toEqual(['#0F6CBD']);
    });

    it('merges anti-aliased shades of the same colour into one candidate', () => {
        const image = buildImage(40, [
            { rows: 19, rgba: BLUE },
            { rows: 1, rgba: [17, 110, 191, 255] },
            { rows: 20, rgba: [16, 109, 190, 255] },
        ]);

        expect(extractPalette(image).candidates).toHaveLength(1);
    });

    it('is deterministic and honours the candidate count', () => {
        const image = buildImage(40, [
            { rows: 10, rgba: BLUE },
            { rows: 10, rgba: ORANGE },
            { rows: 10, rgba: [30, 160, 60, 255] },
            { rows: 10, rgba: [160, 40, 140, 255] },
        ]);

        const first = extractPalette(image, { maxColors: 2 });
        const second = extractPalette(image, { maxColors: 2 });

        expect(first.candidates).toHaveLength(2);
        expect(first.candidates).toEqual(second.candidates);
    });

    it('bounds the cost of a large image by sampling', () => {
        const image = buildImage(1000, [{ rows: 1000, rgba: BLUE }]);
        const result = extractPalette(image, { sampleSize: 100 });

        expect(result.sampledPixels).toBeLessThanOrEqual(100 * 100);
        expect(result.candidates[0].hex).toBe('#0F6CBD');
    });
});

describe('pixelAt', () => {
    it('reads a single pixel as HEX', () => {
        const image = buildImage(4, [
            { rows: 2, rgba: ORANGE },
            { rows: 2, rgba: BLUE },
        ]);

        expect(pixelAt(image, 1, 0)).toBe('#D66A15');
        expect(pixelAt(image, 1, 3)).toBe('#0F6CBD');
    });

    it('returns undefined outside the image and on transparent pixels', () => {
        const image = buildImage(4, [{ rows: 4, rgba: [15, 108, 189, 0] }]);

        expect(pixelAt(image, 10, 0)).toBeUndefined();
        expect(pixelAt(image, -1, 0)).toBeUndefined();
        expect(pixelAt(image, 1, 1)).toBeUndefined();
    });
});

describe('headerBandCrop', () => {
    it('selects the top band of the image', () => {
        expect(headerBandCrop({ width: 100, height: 200 })).toEqual({ x: 0, y: 0, width: 100, height: 30 });
    });

    it('never returns an empty band', () => {
        expect(headerBandCrop({ width: 10, height: 1 }).height).toBe(1);
    });
});
