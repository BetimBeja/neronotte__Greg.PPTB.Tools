import type { ComponentProps } from 'react';
import { Button, Spinner } from '@fluentui/react-components';

export type BusyButtonProps = ComponentProps<typeof Button> & {
    /** True while the action this button triggers is still running. */
    busy?: boolean;
    /** Label shown instead of the children while busy. */
    busyLabel?: string;
};

/**
 * Action button for calls that reach Dataverse: while one is in flight it
 * swaps its icon for a spinner, disables itself and can show a progress
 * label, so a multi-second round trip never looks like a frozen UI.
 */
export function BusyButton({
    busy,
    busyLabel,
    children,
    icon,
    disabled,
    ...rest
}: BusyButtonProps) {
    return (
        <Button
            {...rest}
            icon={busy ? <Spinner size="tiny" /> : icon}
            disabled={disabled || busy}
        >
            {busy && busyLabel ? busyLabel : children}
        </Button>
    );
}
