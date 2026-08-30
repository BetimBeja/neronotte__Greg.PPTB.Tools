import { useState } from 'react';
import {
    Badge,
    Button,
    Dialog,
    DialogActions,
    DialogBody,
    DialogContent,
    DialogSurface,
    DialogTitle,
    Dropdown,
    MessageBar,
    MessageBarBody,
    Option,
    Spinner,
    Text,
    Tooltip,
    makeStyles,
    tokens,
} from '@fluentui/react-components';
import {
    ArrowSyncRegular,
    DocumentAddRegular,
    FolderOpenRegular,
    PaintBrushRegular,
    SaveRegular,
} from '@fluentui/react-icons';
import { useConfig } from '../../state/ConfigContext';
import { useThemeModel } from '../../state/ThemeContext';
import { usePortalMount } from '../../state/PortalMountContext';
import { parseThemeXml } from '../../model/themeXml';
import { createDefaultThemeModel } from '../../model/defaults';
import { WEB_RESOURCE_TYPE, webResourceXml } from '../../services/webResources';
import {
    dataverseWebResourceService,
    type WebResourceSummary,
} from '../../services/dataverseWebResourceService';
import { WebResourcePickerDialog } from './WebResourcePickerDialog';
import { SaveThemeDialog } from './SaveThemeDialog';
import { ScopeDialog } from './ScopeDialog';

const useStyles = makeStyles({
    root: {
        display: 'flex',
        flexDirection: 'column',
        borderBottom: `1px solid ${tokens.colorNeutralStroke1}`,
    },
    bar: {
        display: 'flex',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: tokens.spacingHorizontalM,
        padding: `${tokens.spacingVerticalS} ${tokens.spacingHorizontalM}`,
        minHeight: '48px',
    },
    group: {
        display: 'flex',
        alignItems: 'center',
        gap: tokens.spacingHorizontalXS,
    },
    label: {
        color: tokens.colorNeutralForeground3,
    },
    solution: {
        minWidth: '220px',
    },
    fileName: {
        maxWidth: '260px',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
    },
    spacer: {
        flexGrow: 1,
    },
});

async function notify(
    title: string,
    body: string,
    type: 'info' | 'success' | 'warning' | 'error'
) {
    try {
        await window.toolboxAPI.utils.showNotification({ title, body, type });
    } catch (error) {
        console.error('Unable to show a notification:', error);
    }
}

function message(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
}

/**
 * Compact top bar carrying everything that needs a connection: the mandatory
 * solution picker, the theme web resource being edited, saving/publishing and
 * the scope assignment (docs/IMPLEMENTATION_PLAN.md §5, Phase 4).
 */
export function ConfigPanel() {
    const styles = useStyles();
    const mountNode = usePortalMount();
    const { model, dispatch, dirty } = useThemeModel();
    const {
        connection,
        connectionLoading,
        refreshConnection,
        solutions,
        solutionsLoading,
        solutionsError,
        reloadSolutions,
        selectedSolution,
        selectSolution,
        openTheme,
        setOpenTheme,
    } = useConfig();

    const [pickerOpen, setPickerOpen] = useState(false);
    const [saveOpen, setSaveOpen] = useState(false);
    const [scopeOpen, setScopeOpen] = useState(false);
    const [noSolutionOpen, setNoSolutionOpen] = useState(false);
    const [loadingTheme, setLoadingTheme] = useState(false);
    // Pending action held back by the unsaved-changes guard (§2.12).
    const [pendingAction, setPendingAction] = useState<
        { run: () => void } | undefined
    >();

    const connected = Boolean(connection);

    const guard = (action: () => void) => {
        if (dirty) {
            setPendingAction({ run: action });
            return;
        }
        action();
    };

    const handlePick = async (resource: WebResourceSummary) => {
        setPickerOpen(false);
        setLoadingTheme(true);
        try {
            const content = await dataverseWebResourceService.readWebResource(
                resource.id
            );
            const xml = webResourceXml(content);
            dispatch({ type: 'load', model: parseThemeXml(xml) });
            // Keep the summary only: the base64 payload is already decoded into
            // `originalXml` and there is no reason to hold it in state twice.
            const { contentBase64: _content, ...summary } = content;
            setOpenTheme({ resource: summary, originalXml: xml });
            if (summary.isManaged) {
                await notify(
                    'Managed web resource',
                    `"${summary.name}" is managed: it can be inspected but not overwritten.`,
                    'warning'
                );
            }
        } catch (error) {
            await notify('Load failed', message(error), 'error');
        } finally {
            setLoadingTheme(false);
        }
    };

    const handleNew = () =>
        guard(() => {
            dispatch({ type: 'load', model: createDefaultThemeModel() });
            setOpenTheme(undefined);
        });

    const handleSaveClick = () => {
        if (!selectedSolution) {
            setNoSolutionOpen(true);
            return;
        }
        setSaveOpen(true);
    };

    const handleSaved = async (resource: WebResourceSummary, xml: string) => {
        setOpenTheme({ resource, originalXml: xml });
        dispatch({ type: 'markSaved' });
        setSaveOpen(false);
        await notify(
            'Theme saved',
            `"${resource.name}" was saved to Dataverse.`,
            'success'
        );
    };

    return (
        <div className={styles.root}>
            {!connectionLoading && !connected && (
                <MessageBar intent="error">
                    <MessageBarBody>
                        This tool needs an active Dataverse connection. Connect
                        to an environment in Power Platform ToolBox, then retry.{' '}
                        <Button
                            size="small"
                            appearance="transparent"
                            icon={<ArrowSyncRegular />}
                            onClick={() => void refreshConnection()}
                        >
                            Retry
                        </Button>
                    </MessageBarBody>
                </MessageBar>
            )}

            {solutionsError && (
                <MessageBar intent="error">
                    <MessageBarBody>{solutionsError}</MessageBarBody>
                </MessageBar>
            )}

            <div className={styles.bar}>
                <div className={styles.group}>
                    <Text size={200} className={styles.label}>
                        Environment
                    </Text>
                    {connectionLoading ? (
                        <Spinner size="tiny" />
                    ) : (
                        <Badge
                            appearance="tint"
                            color={connected ? 'success' : 'danger'}
                        >
                            {connection?.name ?? 'Not connected'}
                        </Badge>
                    )}
                </div>

                <div className={styles.group}>
                    <Text size={200} className={styles.label}>
                        Solution
                    </Text>
                    <Dropdown
                        className={styles.solution}
                        mountNode={mountNode}
                        disabled={!connected || solutionsLoading}
                        placeholder={
                            solutionsLoading
                                ? 'Loading solutions…'
                                : 'Select a solution'
                        }
                        value={selectedSolution?.friendlyName ?? ''}
                        selectedOptions={
                            selectedSolution ? [selectedSolution.id] : []
                        }
                        onOptionSelect={(_, data) =>
                            selectSolution(
                                solutions.find(
                                    (solution) =>
                                        solution.id === data.optionValue
                                )
                            )
                        }
                    >
                        {solutions.map((solution) => (
                            <Option
                                key={solution.id}
                                value={solution.id}
                                text={solution.friendlyName}
                            >
                                {`${solution.friendlyName} (${solution.publisherPrefix || 'no prefix'})`}
                            </Option>
                        ))}
                    </Dropdown>
                    <Tooltip
                        content="Reload solutions"
                        relationship="label"
                        mountNode={mountNode}
                    >
                        <Button
                            appearance="subtle"
                            icon={
                                solutionsLoading ? (
                                    <Spinner size="tiny" />
                                ) : (
                                    <ArrowSyncRegular />
                                )
                            }
                            disabled={!connected || solutionsLoading}
                            onClick={() => void reloadSolutions()}
                            aria-label="Reload solutions"
                        />
                    </Tooltip>
                </div>

                <div className={styles.group}>
                    <Text size={200} className={styles.label}>
                        Theme file
                    </Text>
                    {loadingTheme ? (
                        <Spinner
                            size="tiny"
                            labelPosition="after"
                            label="Loading theme…"
                        />
                    ) : (
                        <Text
                            size={200}
                            weight="semibold"
                            className={styles.fileName}
                            title={openTheme?.resource.name}
                        >
                            {openTheme?.resource.name ??
                                'New theme (not saved)'}
                        </Text>
                    )}
                    <Button
                        appearance="subtle"
                        icon={<FolderOpenRegular />}
                        disabled={!connected || loadingTheme}
                        onClick={() => guard(() => setPickerOpen(true))}
                    >
                        Open
                    </Button>
                    <Button
                        appearance="subtle"
                        icon={<DocumentAddRegular />}
                        disabled={loadingTheme}
                        onClick={handleNew}
                    >
                        New
                    </Button>
                </div>

                <div className={styles.spacer} />

                <div className={styles.group}>
                    <Button
                        appearance="primary"
                        icon={<SaveRegular />}
                        disabled={!connected || loadingTheme}
                        onClick={handleSaveClick}
                    >
                        Save to Dataverse
                    </Button>
                    <Button
                        appearance="secondary"
                        icon={<PaintBrushRegular />}
                        disabled={!connected || loadingTheme}
                        onClick={() => setScopeOpen(true)}
                    >
                        Apply theme
                    </Button>
                </div>
            </div>

            <WebResourcePickerDialog
                open={pickerOpen}
                title="Open a theme web resource"
                types={[WEB_RESOURCE_TYPE.xml]}
                onDismiss={() => setPickerOpen(false)}
                onPick={(resource) => void handlePick(resource)}
                mountNode={mountNode}
            />

            <SaveThemeDialog
                open={saveOpen}
                onDismiss={() => setSaveOpen(false)}
                onSaved={(resource, xml) => void handleSaved(resource, xml)}
                mountNode={mountNode}
            />

            <ScopeDialog
                open={scopeOpen}
                onDismiss={() => setScopeOpen(false)}
                webResourceName={openTheme?.resource.name}
                kind={model.kind}
                mountNode={mountNode}
            />

            <Dialog
                open={noSolutionOpen}
                onOpenChange={(_, data) => setNoSolutionOpen(data.open)}
            >
                <DialogSurface mountNode={mountNode}>
                    <DialogBody>
                        <DialogTitle>No solution selected</DialogTitle>
                        <DialogContent>
                            Select a solution first, using the dropdown combo on
                            the left, then try saving again.
                        </DialogContent>
                        <DialogActions>
                            <Button
                                appearance="primary"
                                onClick={() => setNoSolutionOpen(false)}
                            >
                                OK
                            </Button>
                        </DialogActions>
                    </DialogBody>
                </DialogSurface>
            </Dialog>

            <Dialog
                open={Boolean(pendingAction)}
                onOpenChange={(_, data) =>
                    data.open ? undefined : setPendingAction(undefined)
                }
            >
                <DialogSurface mountNode={mountNode}>
                    <DialogBody>
                        <DialogTitle>Discard unsaved changes?</DialogTitle>
                        <DialogContent>
                            The theme has changes that were never saved to
                            Dataverse or exported to a file. Continuing discards
                            them.
                        </DialogContent>
                        <DialogActions>
                            <Button
                                appearance="secondary"
                                onClick={() => setPendingAction(undefined)}
                            >
                                Keep editing
                            </Button>
                            <Button
                                appearance="primary"
                                onClick={() => {
                                    pendingAction?.run();
                                    setPendingAction(undefined);
                                }}
                            >
                                Discard and continue
                            </Button>
                        </DialogActions>
                    </DialogBody>
                </DialogSurface>
            </Dialog>
        </div>
    );
}
