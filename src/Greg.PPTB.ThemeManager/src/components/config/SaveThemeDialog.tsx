import { useMemo, useState } from 'react';
import {
    Button,
    Checkbox,
    Dialog,
    DialogActions,
    DialogBody,
    DialogContent,
    DialogSurface,
    DialogTitle,
    Field,
    Input,
    MessageBar,
    MessageBarBody,
    MessageBarTitle,
    Spinner,
    Switch,
    Text,
    makeStyles,
    tokens,
} from '@fluentui/react-components';
import { diffLines, hasChanges } from '../../model/xmlDiff';
import { serializeThemeModel } from '../../model/themeXml';
import { useThemeModel } from '../../state/ThemeContext';
import { useConfig } from '../../state/ConfigContext';
import {
    buildWebResourceName,
    themeXmlToContent,
    validateWebResourceName,
    WEB_RESOURCE_TYPE,
} from '../../services/webResources';
import {
    dataverseWebResourceService,
    type WebResourceSummary,
} from '../../services/dataverseWebResourceService';
import { BusyButton } from '../common/BusyButton';

const useStyles = makeStyles({
    body: {
        display: 'flex',
        flexDirection: 'column',
        gap: tokens.spacingVerticalM,
    },
    diff: {
        maxHeight: '260px',
        overflow: 'auto',
        border: `1px solid ${tokens.colorNeutralStroke2}`,
        borderRadius: tokens.borderRadiusMedium,
        padding: tokens.spacingVerticalXS,
        fontFamily: tokens.fontFamilyMonospace,
        fontSize: tokens.fontSizeBase200,
        whiteSpace: 'pre',
    },
    added: {
        backgroundColor: tokens.colorPaletteGreenBackground1,
        color: tokens.colorPaletteGreenForeground1,
    },
    removed: {
        backgroundColor: tokens.colorPaletteRedBackground1,
        color: tokens.colorPaletteRedForeground1,
    },
    context: {
        color: tokens.colorNeutralForeground3,
    },
    hint: {
        color: tokens.colorNeutralForeground3,
    },
});

export interface SaveThemeDialogProps {
    open: boolean;
    onDismiss: () => void;
    onSaved: (resource: WebResourceSummary, xml: string) => void;
    mountNode?: HTMLElement;
}

function message(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
}

/** Folder convention proposed for every new theme web resource. */
const DEFAULT_LOCAL_NAME = '/theme/theme.xml';

/** Platform naming rules, plus the .xml extension a theme web resource needs. */
function validateThemeName(fullName: string): string | undefined {
    const platformError = validateWebResourceName(fullName);
    if (platformError) {
        return platformError;
    }
    return /\.xml$/i.test(fullName.trim())
        ? undefined
        : 'The name must end with the .xml extension.';
}

/**
 * Saves the theme to Dataverse: updates the open web resource or creates a new
 * one in the mandatory target solution, always after showing the old-vs-new XML
 * diff, and optionally publishes it (docs/IMPLEMENTATION_PLAN.md §2.5, §2.6).
 */
export function SaveThemeDialog({
    open,
    onDismiss,
    onSaved,
    mountNode,
}: SaveThemeDialogProps) {
    const styles = useStyles();
    const { model } = useThemeModel();
    const { openTheme, selectedSolution } = useConfig();

    const [localName, setLocalName] = useState(DEFAULT_LOCAL_NAME);
    const [overrideDisplayName, setOverrideDisplayName] = useState(false);
    const [displayName, setDisplayName] = useState('');
    const [publish, setPublish] = useState(true);
    const [busy, setBusy] = useState(false);
    const [progress, setProgress] = useState<string | undefined>();
    const [error, setError] = useState<string | undefined>();

    const xml = useMemo(() => {
        try {
            return serializeThemeModel(model);
        } catch (serializeError) {
            return `<!-- ${message(serializeError)} -->`;
        }
    }, [model]);

    const diff = useMemo(
        () => diffLines(openTheme?.originalXml ?? '', xml),
        [openTheme, xml]
    );
    const isUpdate = Boolean(openTheme);
    const fullName = selectedSolution
        ? buildWebResourceName(selectedSolution.publisherPrefix, localName)
        : localName;
    // Validated on the full name: the local part legitimately starts with a
    // slash, and it's the prefixed name the platform rules actually apply to.
    const nameError = isUpdate ? undefined : validateThemeName(fullName);
    const effectiveDisplayName =
        overrideDisplayName && displayName.trim() ? displayName.trim() : fullName;
    const managed = openTheme?.resource.isManaged === true;
    const unchanged = isUpdate && !hasChanges(diff);

    const handleSave = async () => {
        if (!selectedSolution) {
            setError('Pick a target solution first.');
            return;
        }

        setBusy(true);
        setError(undefined);
        setProgress(undefined);
        try {
            let xmlToSave: string;
            try {
                xmlToSave = serializeThemeModel(model);
            } catch (serializeError) {
                setError(message(serializeError));
                return;
            }

            const content = themeXmlToContent(xmlToSave);
            let resource: WebResourceSummary;

            if (openTheme) {
                setProgress(
                    `Updating "${openTheme.resource.name}" in Dataverse…`
                );
                await dataverseWebResourceService.updateWebResourceContent(
                    openTheme.resource,
                    content,
                    selectedSolution.uniqueName
                );
                resource = openTheme.resource;
            } else {
                setProgress(`Creating "${fullName}" in Dataverse…`);
                resource = await dataverseWebResourceService.createWebResource({
                    name: fullName,
                    displayName: effectiveDisplayName,
                    webResourceType: WEB_RESOURCE_TYPE.xml,
                    contentBase64: content,
                    solutionUniqueName: selectedSolution.uniqueName,
                });
            }

            if (publish) {
                setProgress('Publishing the web resource…');
                await dataverseWebResourceService.publishWebResource(
                    resource.id
                );
            }

            onSaved(resource, xmlToSave);
        } catch (saveError) {
            setError(message(saveError));
        } finally {
            setBusy(false);
            setProgress(undefined);
        }
    };

    return (
        <Dialog
            open={open}
            onOpenChange={(_, data) =>
                data.open || busy ? undefined : onDismiss()
            }
        >
            <DialogSurface mountNode={mountNode}>
                <DialogBody>
                    <DialogTitle>
                        {isUpdate
                            ? `Save "${openTheme?.resource.name}"`
                            : 'Save as a new web resource'}
                    </DialogTitle>
                    <DialogContent className={styles.body}>
                        {!selectedSolution && (
                            <MessageBar intent="error">
                                <MessageBarBody>
                                    <MessageBarTitle>
                                        No solution selected
                                    </MessageBarTitle>
                                    The theme must be saved into a solution you
                                    choose explicitly — there is no
                                    default-solution fallback.
                                </MessageBarBody>
                            </MessageBar>
                        )}

                        {managed && (
                            <MessageBar intent="error">
                                <MessageBarBody>
                                    This web resource is managed and can't be
                                    updated. Save it as a new web resource
                                    instead.
                                </MessageBarBody>
                            </MessageBar>
                        )}

                        {!isUpdate && (
                            <>
                                <Field
                                    label="Name"
                                    required
                                    validationState={
                                        nameError ? 'error' : 'none'
                                    }
                                    validationMessage={nameError}
                                >
                                    <Input
                                        value={localName}
                                        onChange={(_, data) =>
                                            setLocalName(data.value)
                                        }
                                    />
                                </Field>
                                <Text size={200} className={styles.hint}>
                                    Full unique name:{' '}
                                    <strong>{fullName}</strong>
                                    {selectedSolution
                                        ? ''
                                        : ' (the publisher prefix is added once a solution is selected)'}
                                </Text>
                                <Switch
                                    checked={overrideDisplayName}
                                    onChange={(_, data) => {
                                        setOverrideDisplayName(data.checked);
                                        if (
                                            data.checked &&
                                            !displayName.trim()
                                        ) {
                                            setDisplayName(fullName);
                                        }
                                    }}
                                    label="Override display name"
                                />
                                {overrideDisplayName ? (
                                    <Field label="Display name">
                                        <Input
                                            value={displayName}
                                            onChange={(_, data) =>
                                                setDisplayName(data.value)
                                            }
                                        />
                                    </Field>
                                ) : (
                                    <Text size={200} className={styles.hint}>
                                        Display name:{' '}
                                        <strong>{fullName}</strong>
                                    </Text>
                                )}
                            </>
                        )}

                        <div>
                            <Text weight="semibold" size={200}>
                                {isUpdate
                                    ? 'Changes to be written'
                                    : 'XML to be created'}
                            </Text>
                            <div className={styles.diff}>
                                {diff.map((line, index) => (
                                    <div
                                        key={index}
                                        className={
                                            line.kind === 'added'
                                                ? styles.added
                                                : line.kind === 'removed'
                                                  ? styles.removed
                                                  : styles.context
                                        }
                                    >
                                        {line.kind === 'added'
                                            ? '+ '
                                            : line.kind === 'removed'
                                              ? '- '
                                              : '  '}
                                        {line.text}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {unchanged && (
                            <MessageBar intent="info">
                                <MessageBarBody>
                                    The theme is identical to the version stored
                                    in Dataverse.
                                </MessageBarBody>
                            </MessageBar>
                        )}

                        <Checkbox
                            checked={publish}
                            onChange={(_, data) =>
                                setPublish(data.checked === true)
                            }
                            label="Publish the web resource after saving"
                        />
                        <MessageBar intent="warning">
                            <MessageBarBody>
                                Publishing affects the whole environment: every
                                user of the apps that consume this theme sees
                                the change. Updates are only picked up once
                                published.
                            </MessageBarBody>
                        </MessageBar>

                        {busy && (
                            <Spinner
                                size="tiny"
                                labelPosition="after"
                                label={progress ?? 'Saving to Dataverse…'}
                            />
                        )}

                        {error && (
                            <MessageBar intent="error">
                                <MessageBarBody>{error}</MessageBarBody>
                            </MessageBar>
                        )}
                    </DialogContent>
                    <DialogActions>
                        <Button
                            appearance="secondary"
                            disabled={busy}
                            onClick={onDismiss}
                        >
                            Cancel
                        </Button>
                        <BusyButton
                            appearance="primary"
                            busy={busy}
                            busyLabel="Saving…"
                            disabled={
                                managed ||
                                !selectedSolution ||
                                Boolean(nameError)
                            }
                            onClick={handleSave}
                        >
                            Save
                        </BusyButton>
                    </DialogActions>
                </DialogBody>
            </DialogSurface>
        </Dialog>
    );
}
