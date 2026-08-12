import { useEffect, useState } from 'react';
import {
    Button,
    Dialog,
    DialogActions,
    DialogBody,
    DialogContent,
    DialogSurface,
    DialogTitle,
    Dropdown,
    Field,
    MessageBar,
    MessageBarBody,
    MessageBarTitle,
    Option,
    Radio,
    RadioGroup,
    Spinner,
    Text,
    makeStyles,
    tokens,
} from '@fluentui/react-components';
import { CopyRegular, OpenRegular } from '@fluentui/react-icons';
import { useConfig } from '../../state/ConfigContext';
import {
    listApps,
    openSolutionInMaker,
    readScopeAssignment,
    setAppScope,
    setEnvironmentScope,
    THEME_SETTING_DISPLAY_NAMES,
    type AppSummary,
    type ThemeSettingKind,
} from '../../services/themeScope';

const useStyles = makeStyles({
    body: {
        display: 'flex',
        flexDirection: 'column',
        gap: tokens.spacingVerticalM,
    },
    hint: {
        color: tokens.colorNeutralForeground3,
    },
    row: {
        display: 'flex',
        alignItems: 'center',
        gap: tokens.spacingHorizontalS,
    },
});

export interface ScopeDialogProps {
    open: boolean;
    onDismiss: () => void;
    /** Unique name of the saved theme web resource — the value of the setting. */
    webResourceName?: string;
    /** Which setting the open document belongs to. */
    kind: ThemeSettingKind;
    mountNode?: HTMLElement;
}

function message(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
}

/**
 * Assigns the theme to the whole environment or to a single app.
 *
 * Microsoft documents this only as a maker-portal flow, so the tool discovers
 * the setting definitions at runtime and falls back to a deep link into the
 * solution when they can't be written (docs/IMPLEMENTATION_PLAN.md §2.4).
 */
export function ScopeDialog({ open, onDismiss, webResourceName, kind, mountNode }: ScopeDialogProps) {
    const styles = useStyles();
    const { connection, scope, scopeLoading, selectedSolution } = useConfig();

    const [target, setTarget] = useState<'environment' | 'app'>('environment');
    const [apps, setApps] = useState<AppSummary[]>([]);
    const [appId, setAppId] = useState<string | undefined>();
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | undefined>();
    const [status, setStatus] = useState<string | undefined>();
    const [conflict, setConflict] = useState(false);

    const definition = scope?.definitions[kind];
    const otherKind: ThemeSettingKind = kind === 'customTheme' ? 'appHeaderColorsOnly' : 'customTheme';
    const otherDefinition = scope?.definitions[otherKind];

    useEffect(() => {
        if (!open || !connection) {
            return;
        }
        setError(undefined);
        setStatus(undefined);
        let cancelled = false;

        (async () => {
            try {
                const loaded = await listApps();
                if (!cancelled) {
                    setApps(loaded);
                }
            } catch (loadError) {
                if (!cancelled) {
                    setError(message(loadError));
                }
            }

            // "Override app header color" is ignored whenever a custom theme
            // definition is set — the tool must say so (§2.4).
            if (otherDefinition) {
                const assignment = await readScopeAssignment(otherDefinition, otherKind);
                const inUse = Boolean(assignment.environmentValue) || Object.keys(assignment.appValues).length > 0;
                if (!cancelled) {
                    setConflict(inUse);
                }
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [open, connection, otherDefinition, otherKind]);

    const handleApply = async () => {
        if (!definition || !webResourceName) {
            return;
        }
        setBusy(true);
        setError(undefined);
        setStatus(undefined);
        try {
            if (target === 'environment') {
                await setEnvironmentScope(definition, webResourceName);
                setStatus(`"${THEME_SETTING_DISPLAY_NAMES[kind]}" is now set to ${webResourceName} for the whole environment. Publish all customizations to apply it.`);
            } else if (appId) {
                await setAppScope(definition, appId, webResourceName);
                setStatus(`"${THEME_SETTING_DISPLAY_NAMES[kind]}" is now set to ${webResourceName} for the selected app. Publish all customizations to apply it.`);
            } else {
                setError('Select the app the theme should apply to.');
            }
        } catch (applyError) {
            setError(message(applyError));
        } finally {
            setBusy(false);
        }
    };

    const handleOpenMaker = async () => {
        if (!connection || !selectedSolution) {
            return;
        }
        try {
            await openSolutionInMaker(connection.url, selectedSolution.id);
        } catch (openError) {
            setError(message(openError));
        }
    };

    const handleCopyName = async () => {
        if (webResourceName) {
            await window.toolboxAPI.utils.copyToClipboard(webResourceName).catch(() => undefined);
        }
    };

    const apiAvailable = Boolean(definition);

    return (
        <Dialog open={open} onOpenChange={(_, data) => (data.open || busy ? undefined : onDismiss())}>
            <DialogSurface mountNode={mountNode}>
                <DialogBody>
                    <DialogTitle>Apply the theme</DialogTitle>
                    <DialogContent className={styles.body}>
                        {!webResourceName && (
                            <MessageBar intent="warning">
                                <MessageBarBody>Save the theme to a web resource first — the setting stores its unique name.</MessageBarBody>
                            </MessageBar>
                        )}

                        {webResourceName && (
                            <div className={styles.row}>
                                <Text size={200}>
                                    Setting <strong>{THEME_SETTING_DISPLAY_NAMES[kind]}</strong> = <strong>{webResourceName}</strong>
                                </Text>
                                <Button size="small" appearance="subtle" icon={<CopyRegular />} onClick={handleCopyName}>
                                    Copy name
                                </Button>
                            </div>
                        )}

                        {conflict && (
                            <MessageBar intent="warning">
                                <MessageBarBody>
                                    <MessageBarTitle>Both theme settings are configured</MessageBarTitle>
                                    "Override app header color" is ignored by the platform whenever "Custom theme definition" is set.
                                </MessageBarBody>
                            </MessageBar>
                        )}

                        {scopeLoading && <Spinner size="tiny" label="Checking what this environment supports…" />}

                        {!scopeLoading && !apiAvailable && (
                            <MessageBar intent="warning">
                                <MessageBarBody>
                                    <MessageBarTitle>Assign the setting in the maker portal</MessageBarTitle>
                                    {scope?.unavailableReason ?? 'The theme settings are not available through the API in this environment.'} Open the solution, use
                                    <strong> Add existing → More → Setting</strong>, pick <strong>{THEME_SETTING_DISPLAY_NAMES[kind]}</strong>, paste the unique name
                                    above as the setting value, and publish all customizations.
                                </MessageBarBody>
                            </MessageBar>
                        )}

                        {apiAvailable && (
                            <>
                                <Field label="Scope">
                                    <RadioGroup value={target} onChange={(_, data) => setTarget(data.value as 'environment' | 'app')}>
                                        <Radio value="environment" label="The whole environment" />
                                        <Radio value="app" label="A single model-driven app" />
                                    </RadioGroup>
                                </Field>

                                {target === 'app' && (
                                    <Field label="App" required>
                                        <Dropdown
                                            mountNode={mountNode}
                                            placeholder="Select an app"
                                            value={apps.find((app) => app.id === appId)?.name ?? ''}
                                            selectedOptions={appId ? [appId] : []}
                                            onOptionSelect={(_, data) => setAppId(data.optionValue)}
                                        >
                                            {apps.map((app) => (
                                                <Option key={app.id} value={app.id} text={app.name}>
                                                    {app.name}
                                                </Option>
                                            ))}
                                        </Dropdown>
                                    </Field>
                                )}
                            </>
                        )}

                        {status && (
                            <MessageBar intent="success">
                                <MessageBarBody>{status}</MessageBarBody>
                            </MessageBar>
                        )}

                        {error && (
                            <MessageBar intent="error">
                                <MessageBarBody>{error}</MessageBarBody>
                            </MessageBar>
                        )}

                        <Text size={100} className={styles.hint}>
                            The theme settings are not covered by Microsoft's documented entity reference; the tool resolves them at runtime and never hardcodes ids.
                        </Text>
                    </DialogContent>
                    <DialogActions>
                        <Button appearance="secondary" icon={<OpenRegular />} disabled={!selectedSolution || !connection} onClick={handleOpenMaker}>
                            Open the solution
                        </Button>
                        <Button appearance="secondary" disabled={busy} onClick={onDismiss}>
                            Close
                        </Button>
                        <Button
                            appearance="primary"
                            disabled={busy || !apiAvailable || !webResourceName || (target === 'app' && !appId)}
                            onClick={handleApply}
                        >
                            {busy ? 'Applying…' : 'Apply'}
                        </Button>
                    </DialogActions>
                </DialogBody>
            </DialogSurface>
        </Dialog>
    );
}
