import type { AppHeaderColors, PaletteSlot, ThemeDocumentKind, ThemeModel } from '../model/theme';
import { createDefaultAppHeaderColorsModel, createDefaultThemeModel } from '../model/defaults';

/**
 * Pure state machine behind the Theme Panel: a current `ThemeModel` plus an
 * undo/redo history and dirty tracking against the last loaded/saved baseline
 * (docs/IMPLEMENTATION_PLAN.md §5, Phase 2). Kept free of React and of any
 * Dataverse dependency so it can be unit tested in isolation.
 */

/** Maximum number of undo steps retained. */
export const MAX_HISTORY = 50;

export interface ThemeState {
    /** The model currently being edited. */
    present: ThemeModel;
    past: ThemeModel[];
    future: ThemeModel[];
    /** The last loaded (or saved) model; `present` is dirty when it differs. */
    baseline: ThemeModel;
}

export type ThemeAction =
    | { type: 'setKind'; kind: ThemeDocumentKind }
    | { type: 'setBasePaletteColor'; value: string | undefined }
    | { type: 'setLockPrimary'; value: boolean }
    | { type: 'setFont'; value: string | undefined }
    | { type: 'setVibrancy'; value: number }
    | { type: 'setHueTorsion'; value: number }
    | { type: 'setLogoWebResource'; value: string | undefined }
    | { type: 'setLogoTooltip'; value: string | undefined }
    | { type: 'setPaletteOverride'; slot: PaletteSlot; value: string | undefined }
    | { type: 'resetPaletteOverrides' }
    | { type: 'setAppHeaderColor'; attribute: keyof AppHeaderColors; value: string | undefined }
    | { type: 'setAppHeaderColorsEnabled'; enabled: boolean }
    /** Replace the model and the baseline (load from file / Dataverse / reset). */
    | { type: 'load'; model: ThemeModel }
    /** Replace the model only, keeping the baseline (apply preset). */
    | { type: 'replace'; model: ThemeModel }
    | { type: 'markSaved' }
    | { type: 'undo' }
    | { type: 'redo' };

export function createInitialThemeState(model: ThemeModel = createDefaultThemeModel()): ThemeState {
    return { present: model, past: [], future: [], baseline: model };
}

/** Structural equality over the model, which is a plain JSON-serialisable object. */
export function isSameModel(a: ThemeModel, b: ThemeModel): boolean {
    return JSON.stringify(a) === JSON.stringify(b);
}

/** Whether the edited model differs from the last loaded/saved baseline. */
export function isDirty(state: ThemeState): boolean {
    return !isSameModel(state.present, state.baseline);
}

function withPresent(state: ThemeState, next: ThemeModel): ThemeState {
    if (isSameModel(state.present, next)) {
        return state;
    }
    return {
        ...state,
        present: next,
        past: [...state.past, state.present].slice(-MAX_HISTORY),
        future: [],
    };
}

/** Normalises an optional string field, dropping it entirely when blank. */
function optional(value: string | undefined): string | undefined {
    const trimmed = value?.trim();
    return trimmed ? trimmed : undefined;
}

function editHeaderColors(current: AppHeaderColors | undefined, attribute: keyof AppHeaderColors, value: string | undefined): AppHeaderColors {
    const next: AppHeaderColors = { ...(current ?? { background: '' }) };
    const normalized = optional(value);

    if (normalized === undefined) {
        if (attribute === 'background') {
            next.background = '';
        } else {
            delete next[attribute];
        }
    } else {
        next[attribute] = normalized;
    }

    return next;
}

export function themeReducer(state: ThemeState, action: ThemeAction): ThemeState {
    const model = state.present;

    switch (action.type) {
        case 'setKind': {
            if (action.kind === model.kind) {
                return state;
            }
            const next: ThemeModel =
                action.kind === 'appHeaderColorsOnly'
                    ? {
                          ...createDefaultAppHeaderColorsModel(),
                          appHeaderColors: model.appHeaderColors ?? { background: '' },
                          unknownAppHeaderColorsAttributes: model.unknownAppHeaderColorsAttributes,
                      }
                    : { ...model, kind: 'customTheme' };
            return withPresent(state, next);
        }
        case 'setBasePaletteColor':
            return withPresent(state, { ...model, basePaletteColor: optional(action.value) });
        case 'setLockPrimary':
            return withPresent(state, { ...model, lockPrimary: action.value });
        case 'setFont':
            return withPresent(state, { ...model, font: optional(action.value) });
        case 'setVibrancy':
            return withPresent(state, { ...model, vibrancy: action.value });
        case 'setHueTorsion':
            return withPresent(state, { ...model, hueTorsion: action.value });
        case 'setLogoWebResource':
            return withPresent(state, { ...model, logoWebResource: optional(action.value) });
        case 'setLogoTooltip':
            return withPresent(state, { ...model, logoTooltip: optional(action.value) });
        case 'setPaletteOverride': {
            const paletteOverrides = { ...model.paletteOverrides };
            const value = optional(action.value);
            if (value === undefined) {
                delete paletteOverrides[action.slot];
            } else {
                paletteOverrides[action.slot] = value;
            }
            return withPresent(state, { ...model, paletteOverrides });
        }
        case 'resetPaletteOverrides':
            return withPresent(state, { ...model, paletteOverrides: {} });
        case 'setAppHeaderColor':
            return withPresent(state, { ...model, appHeaderColors: editHeaderColors(model.appHeaderColors, action.attribute, action.value) });
        case 'setAppHeaderColorsEnabled': {
            if (!action.enabled) {
                // The header override *is* an `appHeaderColorsOnly` document, so it
                // can only be removed from a `customTheme` document.
                if (model.kind === 'appHeaderColorsOnly') {
                    return state;
                }
                return withPresent(state, { ...model, appHeaderColors: undefined });
            }
            if (model.appHeaderColors) {
                return state;
            }
            return withPresent(state, { ...model, appHeaderColors: { background: '#0F6CBD', foreground: '#FFFFFF' } });
        }
        case 'load':
            return createInitialThemeState(action.model);
        case 'replace':
            return withPresent(state, action.model);
        case 'markSaved':
            return { ...state, baseline: state.present };
        case 'undo': {
            if (state.past.length === 0) {
                return state;
            }
            const previous = state.past[state.past.length - 1];
            return {
                ...state,
                present: previous,
                past: state.past.slice(0, -1),
                future: [state.present, ...state.future],
            };
        }
        case 'redo': {
            if (state.future.length === 0) {
                return state;
            }
            const [next, ...rest] = state.future;
            return {
                ...state,
                present: next,
                past: [...state.past, state.present].slice(-MAX_HISTORY),
                future: rest,
            };
        }
        default:
            return state;
    }
}
