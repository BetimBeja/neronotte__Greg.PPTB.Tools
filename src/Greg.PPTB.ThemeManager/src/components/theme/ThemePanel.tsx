import { makeStyles, tokens, Text, Title3 } from '@fluentui/react-components';

const useStyles = makeStyles({
    root: {
        display: 'flex',
        flexDirection: 'column',
        gap: tokens.spacingVerticalM,
        padding: tokens.spacingHorizontalL,
        width: '340px',
        minWidth: '280px',
        borderLeft: `1px solid ${tokens.colorNeutralStroke1}`,
        overflowY: 'auto',
    },
});

/**
 * Right-side panel where the user configures the modern theme XML
 * characteristics (palette, typography, logo, app header colors).
 * Placeholder content only — implemented in Phase 2.
 */
export function ThemePanel() {
    const styles = useStyles();

    return (
        <div className={styles.root}>
            <Title3>Theme</Title3>
            <Text size={200}>Palette, typography, logo and app header color editors — coming in Phase 2</Text>
        </div>
    );
}
