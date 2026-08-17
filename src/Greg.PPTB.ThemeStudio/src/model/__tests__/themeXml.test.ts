import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseThemeXml, serializeThemeModel, ThemeXmlParseError } from '../themeXml';

const SAMPLES_DIR = join(__dirname, '../../../docs/samples');

function readSample(name: string): string {
    return readFileSync(join(SAMPLES_DIR, name), 'utf-8');
}

describe('parseThemeXml', () => {
    it('parses a basic CustomTheme document', () => {
        const model = parseThemeXml(readSample('custom-theme-basic.xml'));

        expect(model.kind).toBe('customTheme');
        expect(model.basePaletteColor).toBe('#00FF00');
        expect(model.vibrancy).toBe(0);
        expect(model.hueTorsion).toBe(-50);
        expect(model.font).toBe("'GreatVibes', cursive");
        expect(model.logoWebResource).toBe('contoso_company-logo');
        expect(model.logoTooltip).toBe('Contoso');
        expect(model.lockPrimary).toBe(false);
        expect(model.appHeaderColors).toBeUndefined();
        expect(model.unknownAttributes).toEqual({});
    });

    it('parses palette slot overrides', () => {
        const model = parseThemeXml(readSample('custom-theme-slot-override.xml'));

        expect(model.paletteOverrides).toEqual({ lighter70: '#FFFFFF' });
        expect(model.lockPrimary).toBe(false);
    });

    it('parses a CustomTheme with a nested AppHeaderColors element', () => {
        const model = parseThemeXml(readSample('custom-theme-with-header.xml'));

        expect(model.kind).toBe('customTheme');
        expect(model.appHeaderColors).toBeDefined();
        expect(model.appHeaderColors?.background).toBe('#000000');
        expect(model.appHeaderColors?.foregroundSelected).toBe('#FFFFFF');
    });

    it('parses a standalone AppHeaderColors document', () => {
        const model = parseThemeXml(readSample('app-header-colors-only.xml'));

        expect(model.kind).toBe('appHeaderColorsOnly');
        expect(model.appHeaderColors?.background).toBe('#12783F');
        expect(model.appHeaderColors?.backgroundSelected).toBe('#153D23');
    });

    it('parses attribute names case-insensitively', () => {
        const model = parseThemeXml('<CustomTheme BasePaletteColor="#123456" LockPrimary="true" />');

        expect(model.basePaletteColor).toBe('#123456');
        expect(model.lockPrimary).toBe(true);
    });

    it('preserves unknown attributes instead of dropping them', () => {
        const model = parseThemeXml('<CustomTheme basePaletteColor="#123456" futureAttribute="hello" />');

        expect(model.unknownAttributes).toEqual({ futureAttribute: 'hello' });
    });

    it('preserves unknown attributes on a nested AppHeaderColors element', () => {
        const model = parseThemeXml('<CustomTheme basePaletteColor="#123456"><AppHeaderColors background="#000000" futureAttr="x" /></CustomTheme>');

        expect(model.unknownAppHeaderColorsAttributes).toEqual({ futureAttr: 'x' });
    });

    it('throws a readable error for malformed XML', () => {
        expect(() => parseThemeXml('<CustomTheme')).toThrow(ThemeXmlParseError);
    });

    it('throws a readable error for an unrecognised root element', () => {
        expect(() => parseThemeXml('<SomethingElse />')).toThrow(ThemeXmlParseError);
    });

    it('throws when AppHeaderColors is missing the required background attribute', () => {
        expect(() => parseThemeXml('<AppHeaderColors foreground="#FFFFFF" />')).toThrow(ThemeXmlParseError);
    });
});

describe('round-trip parse -> serialize -> parse', () => {
    const samples = ['custom-theme-basic.xml', 'custom-theme-slot-override.xml', 'custom-theme-with-header.xml', 'app-header-colors-only.xml'];

    it.each(samples)('preserves all data for %s', (fileName) => {
        const original = parseThemeXml(readSample(fileName));
        const serialized = serializeThemeModel(original);
        const reparsed = parseThemeXml(serialized);

        expect(reparsed).toEqual(original);
    });

    it('keeps unknown attributes through a full round-trip', () => {
        const xml = '<CustomTheme basePaletteColor="#123456" futureAttribute="hello" />';
        const model = parseThemeXml(xml);
        const serialized = serializeThemeModel(model);
        const reparsed = parseThemeXml(serialized);

        expect(reparsed.unknownAttributes).toEqual({ futureAttribute: 'hello' });
    });
});
