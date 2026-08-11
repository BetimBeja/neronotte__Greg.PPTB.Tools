import { FluentProvider, webLightTheme, webDarkTheme, Title3, Text, makeStyles, tokens } from '@fluentui/react-components';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ConfigPanel } from './components/config/ConfigPanel';
import { ThemePanel } from './components/theme/ThemePanel';
import { PreviewFrame } from './components/preview/PreviewFrame';
import { useHostTheme } from './hooks/useToolboxAPI';
import { ThemeProvider } from './state/ThemeContext';

const useStyles = makeStyles({
    root: {
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        backgroundColor: tokens.colorNeutralBackground1,
        overflow: 'hidden',
    },
    header: {
        padding: `${tokens.spacingVerticalM} ${tokens.spacingHorizontalL}`,
        borderBottom: `1px solid ${tokens.colorNeutralStroke1}`,
    },
    subtitle: {
        color: tokens.colorNeutralForeground3,
        fontSize: tokens.fontSizeBase200,
        display: 'block',
    },
    body: {
        display: 'flex',
        flex: 1,
        minHeight: 0,
    },
    main: {
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        minWidth: 0,
    },
});

/**
 * Application shell: config bar on top, preview + theme panel below.
 * The tool's own chrome follows the PPTB host theme; the preview area will
 * nest its own FluentProvider with the user-authored theme (Phase 3, see
 * docs/IMPLEMENTATION_PLAN.md §2.10).
 */
function App() {
    const hostTheme = useHostTheme();
    const styles = useStyles();

    return (
        <ErrorBoundary>
            <FluentProvider theme={hostTheme === 'dark' ? webDarkTheme : webLightTheme} className={styles.root}>
                <div className={styles.header}>
                    <Title3>Theme Manager</Title3>
                    <Text className={styles.subtitle}>Configure model-driven app themes with a WYSIWYG preview</Text>
                </div>
                <ThemeProvider>
                    <ConfigPanel />
                    <div className={styles.body}>
                        <div className={styles.main}>
                            <PreviewFrame />
                        </div>
                        <ThemePanel />
                    </div>
                </ThemeProvider>
            </FluentProvider>
        </ErrorBoundary>
    );
}

export default App;
