import { useState } from 'react';
import {
    FluentProvider,
    IdPrefixProvider,
    Slider,
    Switch,
    Tab,
    TabList,
    Text,
    makeStyles,
    mergeClasses,
    tokens,
} from '@fluentui/react-components';
import { useThemeModel } from '../../state/ThemeContext';
import { useConfig } from '../../state/ConfigContext';
import { usePersistedSetting } from '../../hooks/useToolboxAPI';
import { AppHeader } from './shell/AppHeader';
import { NavBar } from './shell/NavBar';
import { GridPreview } from './GridPreview';
import { FormPreview } from './FormPreview';

// Container-query breakpoints (panel width, narrowest first): the highlight
// toggle fades before the zoom control, purely via CSS - no ResizeObserver.
const HIDE_HIGHLIGHT_QUERY = '(max-width: 760px)';
const HIDE_ZOOM_QUERY = '(max-width: 560px)';

const useStyles = makeStyles({
    root: {
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        minWidth: 0,
        minHeight: 0,
        containerType: 'inline-size',
        containerName: 'previewPanel',
    },
    toolbar: {
        display: 'flex',
        alignItems: 'center',
        gap: tokens.spacingHorizontalL,
        padding: `${tokens.spacingVerticalXS} ${tokens.spacingHorizontalL} 0`,
        borderBottom: `1px solid ${tokens.colorNeutralStroke1}`,
        textWrap: 'nowrap',
    },
    toolbarEnd: {
        display: 'flex',
        alignItems: 'center',
        gap: tokens.spacingHorizontalM,
        marginLeft: 'auto',
        paddingBottom: tokens.spacingVerticalXS,
        minWidth: 0,
        overflow: 'hidden',
    },
    fadeItem: {
        display: 'flex',
        alignItems: 'center',
        opacity: 1,
        transition:
            `opacity ${tokens.durationNormal} ${tokens.curveEasyEase}, ` +
            `width ${tokens.durationNormal} ${tokens.curveEasyEase}, ` +
            `margin ${tokens.durationNormal} ${tokens.curveEasyEase}`,
    },
    fadeHighlight: {
        [`@container previewPanel ${HIDE_HIGHLIGHT_QUERY}`]: {
            opacity: 0,
            width: 0,
            marginLeft: `calc(-1 * ${tokens.spacingHorizontalM})`,
            overflow: 'hidden',
            pointerEvents: 'none',
        },
    },
    fadeZoom: {
        [`@container previewPanel ${HIDE_ZOOM_QUERY}`]: {
            opacity: 0,
            width: 0,
            marginLeft: `calc(-1 * ${tokens.spacingHorizontalM})`,
            overflow: 'hidden',
            pointerEvents: 'none',
        },
    },
    zoom: {
        display: 'flex',
        alignItems: 'center',
        gap: tokens.spacingHorizontalXS,
        flexShrink: 0,
    },
    zoomSlider: {
        width: '100px',
        minWidth: '80px',
    },
    zoomValue: {
        minWidth: '36px',
        textAlign: 'right',
        color: tokens.colorNeutralForeground3,
    },
    scroll: {
        flex: 1,
        minHeight: 0,
        overflow: 'auto',
        backgroundColor: tokens.colorNeutralBackground3,
        padding: tokens.spacingHorizontalM,
    },
    scaler: {
        transformOrigin: 'top left',
    },
    app: {
        display: 'flex',
        flexDirection: 'column',
        // Keep the mock at a realistic app width whatever the tool panel width is.
        minWidth: '1100px',
        minHeight: '760px',
        border: `1px solid ${tokens.colorNeutralStroke2}`,
        borderRadius: tokens.borderRadiusMedium,
        overflow: 'hidden',
    },
    body: {
        display: 'flex',
        flex: 1,
        minHeight: 0,
    },
    canvas: {
        display: 'flex',
        flex: 1,
        minWidth: 0,
        backgroundColor: tokens.colorNeutralBackground3,
    },
    highlight: {
        '& [data-themed]': {
            outline: `2px dashed ${tokens.colorPaletteRedBorder2}`,
            outlineOffset: '-2px',
        },
    },
});

type PreviewTab = 'view' | 'form';

const MIN_ZOOM = 50;
const MAX_ZOOM = 100;

/**
 * Main panel: a non-functional replica of the modern (Wave 1) model-driven app
 * shell, with a **view** tab (sample grid) and a **form** tab (sample form).
 *
 * The user-authored theme is applied by nesting a `FluentProvider` — the
 * pattern Microsoft documents for rendering a subtree with a token set that
 * differs from the surrounding app — so the tool's own chrome keeps following
 * the PPTB host theme (docs/IMPLEMENTATION_PLAN.md §2.10).
 */
export function PreviewFrame() {
    const styles = useStyles();
    const { previewTheme, model } = useThemeModel();
    const { logoDataUri } = useConfig();
    const [selectedTab, setSelectedTab] = usePersistedSetting<PreviewTab>(
        'ui.previewTab',
        'view'
    );
    const [zoom, setZoom] = usePersistedSetting('ui.previewZoom', MAX_ZOOM);
    const [highlight, setHighlight] = useState(false);

    return (
        <div className={styles.root}>
            <div className={styles.scroll}>
                <div
                    className={styles.scaler}
                    style={{
                        transform: `scale(${zoom / 100})`,
                        width: `${(100 / zoom) * 100}%`,
                    }}
                >
                    {/* An id prefix of its own keeps the previewed theme's generated
                        ids from colliding with the tool's own Fluent instance. */}
                    <IdPrefixProvider value="preview-">
                        <FluentProvider
                            theme={previewTheme.fluentTheme}
                            className={mergeClasses(
                                styles.app,
                                highlight && styles.highlight
                            )}
                            style={{ fontFamily: previewTheme.fontFamily }}
                        >
                            <AppHeader
                                colors={previewTheme.headerColors}
                                logoDataUri={logoDataUri}
                                logoTooltip={model.logoTooltip}
                                appName="Sales Hub"
                            />
                            <div className={styles.body}>
                                <NavBar />
                                <div className={styles.canvas}>
                                    {selectedTab === 'view' ? (
                                        <GridPreview />
                                    ) : (
                                        <FormPreview />
                                    )}
                                </div>
                            </div>
                        </FluentProvider>
                    </IdPrefixProvider>
                </div>
            </div>

            <div className={styles.toolbar}>
                <TabList
                    selectedValue={selectedTab}
                    onTabSelect={(_, data) =>
                        setSelectedTab(data.value as PreviewTab)
                    }
                >
                    <Tab value="view">View</Tab>
                    <Tab value="form">Form</Tab>
                </TabList>
                <div className={styles.toolbarEnd}>
                    <div
                        className={mergeClasses(
                            styles.fadeItem,
                            styles.fadeHighlight
                        )}
                    >
                        <Switch
                            size="small"
                            checked={highlight}
                            onChange={(_, data) => setHighlight(data.checked)}
                            label="Highlight themed areas"
                            aria-label="Highlight the areas of the app the theme changes"
                        />
                    </div>
                    <div
                        className={mergeClasses(
                            styles.fadeItem,
                            styles.zoom,
                            styles.fadeZoom
                        )}
                    >
                        <Text size={200}>Zoom</Text>
                        <Slider
                            className={styles.zoomSlider}
                            size="small"
                            min={MIN_ZOOM}
                            max={MAX_ZOOM}
                            step={10}
                            value={zoom}
                            aria-label="Preview zoom"
                            onChange={(_, data) => setZoom(data.value)}
                        />
                        <Text size={200} className={styles.zoomValue}>
                            {zoom}%
                        </Text>
                    </div>
                </div>
            </div>
        </div>
    );
}
