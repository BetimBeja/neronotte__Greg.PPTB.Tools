import { makeStyles, tokens, TabList, Tab, Text } from '@fluentui/react-components';
import { useState } from 'react';

const useStyles = makeStyles({
    root: {
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        minWidth: 0,
        overflow: 'auto',
    },
    tabs: {
        padding: `${tokens.spacingVerticalS} ${tokens.spacingHorizontalL} 0`,
        borderBottom: `1px solid ${tokens.colorNeutralStroke1}`,
    },
    content: {
        flex: 1,
        padding: tokens.spacingHorizontalL,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
    },
});

type PreviewTab = 'view' | 'form';

/**
 * Main panel: a non-functional replica of the model-driven app shell, with a
 * "view" tab (sample grid) and a "form" tab (sample form). Placeholder
 * content only — implemented in Phase 3.
 */
export function PreviewFrame() {
    const styles = useStyles();
    const [selectedTab, setSelectedTab] = useState<PreviewTab>('view');

    return (
        <div className={styles.root}>
            <div className={styles.tabs}>
                <TabList selectedValue={selectedTab} onTabSelect={(_, data) => setSelectedTab(data.value as PreviewTab)}>
                    <Tab value="view">View</Tab>
                    <Tab value="form">Form</Tab>
                </TabList>
            </div>
            <div className={styles.content}>
                <Text size={200}>{selectedTab === 'view' ? 'Sample grid preview' : 'Sample form preview'} — coming in Phase 3</Text>
            </div>
        </div>
    );
}
