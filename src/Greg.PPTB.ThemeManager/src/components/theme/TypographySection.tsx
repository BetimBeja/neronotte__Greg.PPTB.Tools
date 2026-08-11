import { Combobox, Field, Option, Text, makeStyles, tokens } from '@fluentui/react-components';
import { WEB_SAFE_FONTS } from '../../model/defaults';
import { useThemeModel } from '../../state/ThemeContext';
import { usePortalMount } from '../../state/PortalMountContext';

const useStyles = makeStyles({
    section: {
        display: 'flex',
        flexDirection: 'column',
        gap: tokens.spacingVerticalS,
    },
    hint: {
        color: tokens.colorNeutralForeground3,
    },
    warning: {
        color: tokens.colorPaletteDarkOrangeForeground1,
    },
    sample: {
        padding: tokens.spacingVerticalS,
        border: `1px solid ${tokens.colorNeutralStroke2}`,
        borderRadius: tokens.borderRadiusMedium,
    },
});

/** Extracts the first family name of a CSS font-family list, unquoted. */
function firstFamily(font: string): string {
    return font.split(',')[0].trim().replace(/^['"]|['"]$/g, '');
}

/**
 * **Typography** group: the single documented `font` attribute, a CSS
 * font-family string (docs/THEME_XML_REFERENCE.md §2).
 */
export function TypographySection() {
    const styles = useStyles();
    const { model, dispatch } = useThemeModel();
    const mountNode = usePortalMount();

    const family = model.font ? firstFamily(model.font) : undefined;
    const isWebSafe = family !== undefined && WEB_SAFE_FONTS.some((f) => f.toLowerCase() === family.toLowerCase());

    return (
        <div className={styles.section}>
            <Field label="Font" hint="A CSS font-family string, e.g. 'GreatVibes', cursive.">
                <Combobox
                    mountNode={mountNode}
                    freeform
                    placeholder="Segoe UI"
                    value={model.font ?? ''}
                    selectedOptions={model.font ? [model.font] : []}
                    onOptionSelect={(_, data) => dispatch({ type: 'setFont', value: data.optionValue })}
                    onInput={(event) => dispatch({ type: 'setFont', value: (event.target as HTMLInputElement).value })}
                >
                    {WEB_SAFE_FONTS.map((font) => (
                        <Option key={font} value={font} text={font}>
                            {font}
                        </Option>
                    ))}
                </Combobox>
            </Field>

            {model.font && !isWebSafe && (
                <Text size={100} className={styles.warning}>
                    "{family}" isn't a web-safe family. The app renders it only on machines where the font is installed — the browser falls back otherwise.
                </Text>
            )}

            <div className={styles.sample} style={{ fontFamily: model.font || undefined }}>
                <Text>The quick brown fox jumps over the lazy dog — 0123456789</Text>
            </div>
        </div>
    );
}
