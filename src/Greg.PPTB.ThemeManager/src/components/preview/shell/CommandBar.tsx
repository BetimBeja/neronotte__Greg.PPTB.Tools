import { Button, makeStyles, shorthands, tokens } from '@fluentui/react-components';
import { ArrowLeftRegular, ChevronDownRegular, MoreHorizontalRegular, ShareRegular } from '@fluentui/react-icons';
import type { ReactElement } from 'react';

const useStyles = makeStyles({
    root: {
        display: 'flex',
        alignItems: 'center',
        gap: tokens.spacingHorizontalXXS,
        // The modern look floats the command bar on a rounded, elevated surface.
        ...shorthands.borderRadius(tokens.borderRadiusLarge),
        backgroundColor: tokens.colorNeutralBackground1,
        boxShadow: tokens.shadow4,
        paddingLeft: tokens.spacingHorizontalS,
        paddingRight: tokens.spacingHorizontalS,
        paddingTop: tokens.spacingVerticalXS,
        paddingBottom: tokens.spacingVerticalXS,
        flexShrink: 0,
    },
    spacer: {
        flexGrow: 1,
    },
    divider: {
        width: '1px',
        height: '20px',
        backgroundColor: tokens.colorNeutralStroke2,
        marginLeft: tokens.spacingHorizontalXS,
        marginRight: tokens.spacingHorizontalXS,
    },
});

export interface CommandBarCommand {
    key: string;
    label: string;
    icon: ReactElement;
}

export interface CommandBarProps {
    commands: CommandBarCommand[];
    /** Label of the brand-coloured primary button on the right (themed surface). */
    primaryLabel?: string;
    showBack?: boolean;
}

/**
 * The floating command bar shared by the view and form tabs. The primary
 * button uses the brand ramp, so it repaints with the palette.
 */
export function CommandBar({ commands, primaryLabel = 'Share', showBack = true }: CommandBarProps) {
    const styles = useStyles();

    return (
        <div className={styles.root} role="toolbar" aria-label="Sample command bar">
            {showBack && <Button appearance="subtle" icon={<ArrowLeftRegular />} aria-label="Back" />}
            {commands.map((command) => (
                <Button key={command.key} appearance="subtle" icon={command.icon}>
                    {command.label}
                </Button>
            ))}
            <Button appearance="subtle" icon={<ChevronDownRegular />} aria-label="More commands" />
            <div className={styles.divider} />
            <Button appearance="subtle" icon={<MoreHorizontalRegular />} aria-label="More" />
            <div className={styles.spacer} />
            <Button appearance="primary" icon={<ShareRegular />} data-themed="Primary button">
                {primaryLabel}
            </Button>
        </div>
    );
}
