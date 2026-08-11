import { describe, expect, it } from 'vitest';
import { createDefaultThemeModel } from '../../model/defaults';
import { parseThemeXml } from '../../model/themeXml';
import { createInitialThemeState, isDirty, MAX_HISTORY, themeReducer, type ThemeState } from '../themeReducer';

function initial(): ThemeState {
    return createInitialThemeState(createDefaultThemeModel());
}

describe('themeReducer edits', () => {
    it('sets and clears optional string attributes', () => {
        let state = themeReducer(initial(), { type: 'setFont', value: "'GreatVibes', cursive" });
        expect(state.present.font).toBe("'GreatVibes', cursive");

        state = themeReducer(state, { type: 'setFont', value: '   ' });
        expect(state.present.font).toBeUndefined();
    });

    it('sets and removes a palette slot override', () => {
        let state = themeReducer(initial(), { type: 'setPaletteOverride', slot: 'lighter70', value: '#FFFFFF' });
        expect(state.present.paletteOverrides).toEqual({ lighter70: '#FFFFFF' });

        state = themeReducer(state, { type: 'setPaletteOverride', slot: 'lighter70', value: undefined });
        expect(state.present.paletteOverrides).toEqual({});
    });

    it('clears every palette override at once', () => {
        let state = themeReducer(initial(), { type: 'setPaletteOverride', slot: 'primary', value: '#123456' });
        state = themeReducer(state, { type: 'setPaletteOverride', slot: 'darker10', value: '#654321' });
        state = themeReducer(state, { type: 'resetPaletteOverrides' });

        expect(state.present.paletteOverrides).toEqual({});
    });

    it('enables and disables the app header override on a customTheme document', () => {
        let state = themeReducer(initial(), { type: 'setAppHeaderColorsEnabled', enabled: true });
        expect(state.present.appHeaderColors?.background).toBeTruthy();

        state = themeReducer(state, { type: 'setAppHeaderColorsEnabled', enabled: false });
        expect(state.present.appHeaderColors).toBeUndefined();
    });

    it('never removes the header colours from an appHeaderColorsOnly document', () => {
        const state = themeReducer(initial(), { type: 'setKind', kind: 'appHeaderColorsOnly' });
        const next = themeReducer(state, { type: 'setAppHeaderColorsEnabled', enabled: false });

        expect(next.present.appHeaderColors).toBeDefined();
    });

    it('keeps the header colours when switching document kind', () => {
        let state = themeReducer(initial(), { type: 'setAppHeaderColor', attribute: 'background', value: '#12783F' });
        state = themeReducer(state, { type: 'setKind', kind: 'appHeaderColorsOnly' });

        expect(state.present.kind).toBe('appHeaderColorsOnly');
        expect(state.present.appHeaderColors?.background).toBe('#12783F');
    });

    it('clears an optional header colour but keeps background required', () => {
        let state = themeReducer(initial(), { type: 'setAppHeaderColor', attribute: 'background', value: '#000000' });
        state = themeReducer(state, { type: 'setAppHeaderColor', attribute: 'foregroundHover', value: '#FFFFFF' });
        state = themeReducer(state, { type: 'setAppHeaderColor', attribute: 'foregroundHover', value: undefined });

        expect(state.present.appHeaderColors?.foregroundHover).toBeUndefined();
        expect(state.present.appHeaderColors?.background).toBe('#000000');
    });

    it('ignores a no-op edit', () => {
        const state = initial();
        expect(themeReducer(state, { type: 'setVibrancy', value: 0 })).toBe(state);
    });
});

describe('undo / redo', () => {
    it('undoes and redoes an edit', () => {
        let state = themeReducer(initial(), { type: 'setVibrancy', value: 50 });
        expect(state.present.vibrancy).toBe(50);

        state = themeReducer(state, { type: 'undo' });
        expect(state.present.vibrancy).toBe(0);

        state = themeReducer(state, { type: 'redo' });
        expect(state.present.vibrancy).toBe(50);
    });

    it('drops the redo stack once a new edit is made', () => {
        let state = themeReducer(initial(), { type: 'setVibrancy', value: 50 });
        state = themeReducer(state, { type: 'undo' });
        state = themeReducer(state, { type: 'setHueTorsion', value: -20 });

        expect(state.future).toHaveLength(0);
        expect(themeReducer(state, { type: 'redo' })).toBe(state);
    });

    it('is a no-op when there is nothing to undo or redo', () => {
        const state = initial();
        expect(themeReducer(state, { type: 'undo' })).toBe(state);
        expect(themeReducer(state, { type: 'redo' })).toBe(state);
    });

    it('caps the history length', () => {
        let state = initial();
        for (let i = 1; i <= MAX_HISTORY + 10; i++) {
            state = themeReducer(state, { type: 'setVibrancy', value: i });
        }

        expect(state.past).toHaveLength(MAX_HISTORY);
    });
});

describe('dirty tracking', () => {
    it('starts clean and becomes dirty on edit', () => {
        const state = initial();
        expect(isDirty(state)).toBe(false);
        expect(isDirty(themeReducer(state, { type: 'setVibrancy', value: 10 }))).toBe(true);
    });

    it('is clean again after undoing back to the baseline', () => {
        let state = themeReducer(initial(), { type: 'setVibrancy', value: 10 });
        state = themeReducer(state, { type: 'undo' });

        expect(isDirty(state)).toBe(false);
    });

    it('is clean after markSaved', () => {
        let state = themeReducer(initial(), { type: 'setVibrancy', value: 10 });
        state = themeReducer(state, { type: 'markSaved' });

        expect(isDirty(state)).toBe(false);
    });

    it('load resets the history and the baseline', () => {
        let state = themeReducer(initial(), { type: 'setVibrancy', value: 10 });
        state = themeReducer(state, { type: 'load', model: parseThemeXml('<CustomTheme basePaletteColor="#00FF00" />') });

        expect(state.past).toHaveLength(0);
        expect(state.future).toHaveLength(0);
        expect(isDirty(state)).toBe(false);
        expect(state.present.basePaletteColor).toBe('#00FF00');
    });

    it('replace keeps the baseline so the model stays dirty', () => {
        const state = themeReducer(initial(), { type: 'replace', model: { ...createDefaultThemeModel(), basePaletteColor: '#12783F' } });

        expect(isDirty(state)).toBe(true);
        expect(state.past).toHaveLength(1);
    });
});
