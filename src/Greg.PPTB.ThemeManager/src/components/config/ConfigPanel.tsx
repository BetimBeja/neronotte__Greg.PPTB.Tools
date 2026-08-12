import { makeStyles, tokens, Text } from '@fluentui/react-components';

const useStyles = makeStyles({
    root: {
        display: 'flex',
        alignItems: 'center',
        gap: tokens.spacingHorizontalM,
        padding: `${tokens.spacingVerticalS} ${tokens.spacingHorizontalM}`,
        borderBottom: `1px solid ${tokens.colorNeutralStroke1}`,
        minHeight: '48px',
    },
});

/**
 * Compact top bar: theme web resource, logo web resource name, environment/app
 * scope selection. Placeholder content only — wired up in Phase 4 (Dataverse
 * integration), pending the owner decisions tracked in
 * docs/IMPLEMENTATION_PLAN.md §7.
 */
export function ConfigPanel() {
    const styles = useStyles();

    return (
        <div className={styles.root}>
            <Text weight="semibold">Config panel</Text>
            <Text size={200}>Theme file, logo web resource and scope selection — coming in Phase 4</Text>
        </div>
    );
}
