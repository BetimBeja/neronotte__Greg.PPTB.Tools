import { MessageBar, MessageBarBody, Switch, Text, makeStyles, tokens } from '@fluentui/react-components';
import type { AppHeaderColors } from '../../model/theme';
import { useThemeModel } from '../../state/ThemeContext';
import { ColorField } from './ColorField';

const useStyles = makeStyles({
    section: {
        display: 'flex',
        flexDirection: 'column',
        gap: tokens.spacingVerticalS,
    },
    hint: {
        color: tokens.colorNeutralForeground3,
    },
});

/**
 * The documented foreground/background pairs, each of which Microsoft
 * recommends verifying at a minimum 4.5:1 contrast ratio
 * (docs/THEME_XML_REFERENCE.md §3).
 */
const HEADER_STATES: Array<{ label: string; background: keyof AppHeaderColors; foreground: keyof AppHeaderColors; required?: boolean }> = [
    { label: 'Rest', background: 'background', foreground: 'foreground', required: true },
    { label: 'Hover', background: 'backgroundHover', foreground: 'foregroundHover' },
    { label: 'Pressed', background: 'backgroundPressed', foreground: 'foregroundPressed' },
    { label: 'Selected', background: 'backgroundSelected', foreground: 'foregroundSelected' },
];

/**
 * **App header** group: the 8 `AppHeaderColors` attributes with a per-state
 * contrast readout (docs/IMPLEMENTATION_PLAN.md §5 Phase 2, §2.11).
 */
export function AppHeaderSection() {
    const styles = useStyles();
    const { model, dispatch } = useThemeModel();

    const colors = model.appHeaderColors;
    const enabled = colors !== undefined;
    const headerOnly = model.kind === 'appHeaderColorsOnly';
    const missingBackground = enabled && !colors.background;

    return (
        <div className={styles.section}>
            {!headerOnly && (
                <Switch
                    label="Override app header colors"
                    checked={enabled}
                    onChange={(_, data) => dispatch({ type: 'setAppHeaderColorsEnabled', enabled: data.checked })}
                />
            )}

            {!enabled && (
                <Text size={100} className={styles.hint}>
                    Without an override, the platform derives the header colours from the palette.
                </Text>
            )}

            {missingBackground && (
                <MessageBar intent="warning">
                    <MessageBarBody>"background" is required — no header colour change takes effect until it is set.</MessageBarBody>
                </MessageBar>
            )}

            {enabled &&
                HEADER_STATES.map((state) => {
                    const background = colors[state.background];
                    const foreground = colors[state.foreground];
                    // Unset states are computed by the platform from the rest state.
                    const effectiveBackground = background || colors.background || undefined;

                    return (
                        <div key={state.label} className={styles.section}>
                            <Text weight="semibold" size={200}>
                                {state.label}
                            </Text>
                            <ColorField
                                label={state.background}
                                value={background || undefined}
                                placeholder={state.required ? undefined : colors.background || undefined}
                                hint={state.required ? 'Required — the header only changes when this is set.' : 'Calculated from "background" when left empty.'}
                                onChange={(value) => dispatch({ type: 'setAppHeaderColor', attribute: state.background, value })}
                                onReset={state.required ? undefined : () => dispatch({ type: 'setAppHeaderColor', attribute: state.background, value: undefined })}
                            />
                            <ColorField
                                label={state.foreground}
                                value={foreground}
                                hint="Calculated for sufficient contrast when left empty."
                                contrastAgainst={effectiveBackground}
                                onChange={(value) => dispatch({ type: 'setAppHeaderColor', attribute: state.foreground, value })}
                                onReset={() => dispatch({ type: 'setAppHeaderColor', attribute: state.foreground, value: undefined })}
                            />
                        </div>
                    );
                })}
        </div>
    );
}
