import { Field, Input, Text, makeStyles, tokens } from '@fluentui/react-components';
import { DEFAULT_LOGO_TOOLTIP } from '../../model/defaults';
import { useThemeModel } from '../../state/ThemeContext';

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

const LOGICAL_NAME_PATTERN = /^[a-zA-Z][a-zA-Z0-9]*_[a-zA-Z0-9_./-]+$/;

/**
 * **Logo** group: `logoWebResource` (a web resource **logical name**, not a
 * GUID) and `logoTooltip` (docs/THEME_XML_REFERENCE.md §7). Browsing and
 * uploading the web resource itself needs a connection and lands in Phase 4;
 * the name can already be typed here offline.
 */
export function LogoSection() {
    const styles = useStyles();
    const { model, dispatch } = useThemeModel();

    const logoWebResource = model.logoWebResource ?? '';
    const invalidName = logoWebResource !== '' && !LOGICAL_NAME_PATTERN.test(logoWebResource);

    return (
        <div className={styles.section}>
            <Field
                label="Logo web resource"
                hint="Logical name (with publisher prefix) of an image web resource. Recommended size 156 × 48 px."
                validationState={invalidName ? 'warning' : 'none'}
                validationMessage={invalidName ? 'This does not look like a logical name, e.g. contoso_company-logo.' : undefined}
            >
                <Input value={logoWebResource} placeholder="contoso_company-logo" onChange={(_, data) => dispatch({ type: 'setLogoWebResource', value: data.value })} />
            </Field>

            <Field label="Logo tooltip" hint={`Tooltip shown on the app-header logo. The platform default is "${DEFAULT_LOGO_TOOLTIP}".`}>
                <Input value={model.logoTooltip ?? ''} placeholder={DEFAULT_LOGO_TOOLTIP} onChange={(_, data) => dispatch({ type: 'setLogoTooltip', value: data.value })} />
            </Field>

            <Text size={100} className={styles.hint}>
                Browsing existing image web resources and uploading a new one requires a connection and arrives with the Dataverse integration.
            </Text>
        </div>
    );
}
