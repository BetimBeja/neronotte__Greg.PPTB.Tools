import { useCallback, useEffect, useState } from 'react';
import {
    Button,
    Dialog,
    DialogActions,
    DialogBody,
    DialogContent,
    DialogSurface,
    DialogTitle,
    Input,
    MessageBar,
    MessageBarBody,
    Spinner,
    Text,
    makeStyles,
    tokens,
} from '@fluentui/react-components';
import { SearchRegular } from '@fluentui/react-icons';
import { listWebResources, type WebResourceSummary } from '../../services/webResources';

const useStyles = makeStyles({
    body: {
        display: 'flex',
        flexDirection: 'column',
        gap: tokens.spacingVerticalS,
        minHeight: '320px',
    },
    list: {
        display: 'flex',
        flexDirection: 'column',
        maxHeight: '320px',
        overflowY: 'auto',
        border: `1px solid ${tokens.colorNeutralStroke2}`,
        borderRadius: tokens.borderRadiusMedium,
    },
    item: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        gap: '2px',
        padding: `${tokens.spacingVerticalXS} ${tokens.spacingHorizontalS}`,
        border: 'none',
        borderBottom: `1px solid ${tokens.colorNeutralStroke3}`,
        backgroundColor: 'transparent',
        cursor: 'pointer',
        textAlign: 'left',
        fontFamily: 'inherit',
        ':hover': {
            backgroundColor: tokens.colorNeutralBackground1Hover,
        },
    },
    selected: {
        backgroundColor: tokens.colorNeutralBackground1Selected,
    },
    hint: {
        color: tokens.colorNeutralForeground3,
    },
});

export interface WebResourcePickerDialogProps {
    open: boolean;
    title: string;
    /** `webresourcetype` values to list. */
    types: number[];
    onDismiss: () => void;
    onPick: (resource: WebResourceSummary) => void;
    mountNode?: HTMLElement;
}

/**
 * Browses the `webresourceset` table so the user can open an existing theme
 * XML, or point the logo at an image that already lives in the environment
 * (docs/IMPLEMENTATION_PLAN.md §5, Phase 4).
 */
export function WebResourcePickerDialog({ open, title, types, onDismiss, onPick, mountNode }: WebResourcePickerDialogProps) {
    const styles = useStyles();
    const [search, setSearch] = useState('');
    const [items, setItems] = useState<WebResourceSummary[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | undefined>();
    const [selected, setSelected] = useState<WebResourceSummary | undefined>();

    const typesKey = types.join(',');

    const load = useCallback(
        async (term: string) => {
            setLoading(true);
            setError(undefined);
            try {
                setItems(await listWebResources(typesKey.split(',').map(Number), term));
            } catch (loadError) {
                setError(loadError instanceof Error ? loadError.message : String(loadError));
            } finally {
                setLoading(false);
            }
        },
        [typesKey],
    );

    useEffect(() => {
        if (!open) {
            return;
        }
        setSelected(undefined);
        void load(search);
        // Only reload on open / explicit search, not on every keystroke.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, load]);

    return (
        <Dialog open={open} onOpenChange={(_, data) => (data.open ? undefined : onDismiss())}>
            <DialogSurface mountNode={mountNode}>
                <DialogBody>
                    <DialogTitle>{title}</DialogTitle>
                    <DialogContent className={styles.body}>
                        <Input
                            value={search}
                            placeholder="Filter by name"
                            contentBefore={<SearchRegular />}
                            onChange={(_, data) => setSearch(data.value)}
                            onKeyDown={(event) => {
                                if (event.key === 'Enter') {
                                    void load(search);
                                }
                            }}
                        />

                        {error && (
                            <MessageBar intent="error">
                                <MessageBarBody>{error}</MessageBarBody>
                            </MessageBar>
                        )}

                        {loading ? (
                            <Spinner size="small" label="Loading web resources…" />
                        ) : (
                            <div className={styles.list}>
                                {items.length === 0 && (
                                    <Text className={styles.hint} size={200}>
                                        No matching web resource was found.
                                    </Text>
                                )}
                                {items.map((item) => (
                                    <button
                                        key={item.id}
                                        type="button"
                                        className={`${styles.item} ${selected?.id === item.id ? styles.selected : ''}`}
                                        onClick={() => setSelected(item)}
                                        onDoubleClick={() => onPick(item)}
                                    >
                                        <Text weight="semibold" size={200}>
                                            {item.name}
                                        </Text>
                                        <Text size={100} className={styles.hint}>
                                            {item.displayName || 'No display name'}
                                            {item.isManaged ? ' • managed (read-only)' : ''}
                                        </Text>
                                    </button>
                                ))}
                            </div>
                        )}
                    </DialogContent>
                    <DialogActions>
                        <Button appearance="secondary" onClick={onDismiss}>
                            Cancel
                        </Button>
                        <Button appearance="primary" disabled={!selected} onClick={() => selected && onPick(selected)}>
                            Select
                        </Button>
                    </DialogActions>
                </DialogBody>
            </DialogSurface>
        </Dialog>
    );
}
