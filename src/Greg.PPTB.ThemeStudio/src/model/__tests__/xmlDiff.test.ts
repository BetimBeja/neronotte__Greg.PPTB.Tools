import { describe, expect, it } from 'vitest';
import { diffLines, hasChanges } from '../xmlDiff';

describe('diffLines', () => {
    it('reports no changes for identical documents', () => {
        const xml = '<CustomTheme basePaletteColor="#0F6CBD" />';
        expect(hasChanges(diffLines(xml, xml))).toBe(false);
    });

    it('ignores line-ending differences', () => {
        expect(hasChanges(diffLines('<a>\r\n<b/>\r\n</a>', '<a>\n<b/>\n</a>'))).toBe(false);
    });

    it('marks added and removed lines', () => {
        const diff = diffLines('<a>\n<b/>\n</a>', '<a>\n<c/>\n</a>');
        expect(diff.filter((line) => line.kind === 'removed').map((line) => line.text)).toEqual(['<b/>']);
        expect(diff.filter((line) => line.kind === 'added').map((line) => line.text)).toEqual(['<c/>']);
        expect(diff.filter((line) => line.kind === 'context')).toHaveLength(2);
    });

    it('treats an empty original as a pure addition', () => {
        const diff = diffLines('', '<CustomTheme />');
        expect(diff.every((line) => line.kind === 'added')).toBe(true);
    });
});
