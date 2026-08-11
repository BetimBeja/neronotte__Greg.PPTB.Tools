import { useState } from 'react';
import { makeStyles, mergeClasses, tokens } from '@fluentui/react-components';
import {
    AddRegular,
    FilterRegular,
    GridDotsRegular,
    LightbulbFilamentRegular,
    PersonFeedbackRegular,
    QuestionCircleRegular,
    SearchRegular,
    SettingsRegular,
} from '@fluentui/react-icons';
import type { ReactNode } from 'react';
import { DEFAULT_LOGO_TOOLTIP } from '../../../model/defaults';
import type { ResolvedAppHeaderColors } from '../../../model/tokenMap';

const useStyles = makeStyles({
    root: {
        display: 'flex',
        alignItems: 'center',
        gap: tokens.spacingHorizontalS,
        height: '48px',
        paddingLeft: tokens.spacingHorizontalS,
        paddingRight: tokens.spacingHorizontalM,
        flexShrink: 0,
    },
    button: {
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: tokens.spacingHorizontalXS,
        minWidth: '36px',
        height: '36px',
        paddingLeft: tokens.spacingHorizontalXS,
        paddingRight: tokens.spacingHorizontalXS,
        border: 'none',
        borderRadius: tokens.borderRadiusMedium,
        backgroundColor: 'transparent',
        fontSize: tokens.fontSizeBase300,
        fontFamily: 'inherit',
        cursor: 'default',
    },
    logo: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: tokens.spacingHorizontalS,
        paddingLeft: tokens.spacingHorizontalS,
        paddingRight: tokens.spacingHorizontalS,
        height: '36px',
    },
    logoImage: {
        height: '24px',
        maxWidth: '156px',
        objectFit: 'contain',
    },
    productName: {
        fontSize: tokens.fontSizeBase400,
        fontWeight: tokens.fontWeightSemibold,
        whiteSpace: 'nowrap',
    },
    separator: {
        width: '1px',
        height: '20px',
        opacity: 0.5,
    },
    appName: {
        fontSize: tokens.fontSizeBase300,
        whiteSpace: 'nowrap',
    },
    spacer: {
        flexGrow: 1,
    },
    avatar: {
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '32px',
        height: '32px',
        borderRadius: tokens.borderRadiusCircular,
        border: '1px solid currentColor',
        fontSize: tokens.fontSizeBase200,
        flexShrink: 0,
    },
});

/** A header button that paints the rest / hover / pressed states of the theme. */
function HeaderButton({ colors, label, children, className }: { colors: ResolvedAppHeaderColors; label: string; children: ReactNode; className?: string }) {
    const styles = useStyles();
    const [hovered, setHovered] = useState(false);
    const [pressed, setPressed] = useState(false);

    const background = pressed ? colors.backgroundPressed : hovered ? colors.backgroundHover : 'transparent';
    const color = pressed ? colors.foregroundPressed : hovered ? colors.foregroundHover : colors.foreground;

    return (
        <button
            type="button"
            aria-label={label}
            title={label}
            className={mergeClasses(styles.button, className)}
            style={{ backgroundColor: background, color }}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => {
                setHovered(false);
                setPressed(false);
            }}
            onMouseDown={() => setPressed(true)}
            onMouseUp={() => setPressed(false)}
            onFocus={() => setHovered(true)}
            onBlur={() => setHovered(false)}
        >
            {children}
        </button>
    );
}

export interface AppHeaderProps {
    colors: ResolvedAppHeaderColors;
    /** Logo image as a `data:` URI, when one is available. */
    logoDataUri?: string;
    logoTooltip?: string;
    appName: string;
}

/**
 * The model-driven app header: waffle, logo + tooltip, product and app name,
 * search, command icons and the user avatar. Every colour comes from the
 * resolved `AppHeaderColors` — the part of the shell the theme changes most
 * visibly (docs/THEME_XML_REFERENCE.md §5).
 */
export function AppHeader({ colors, logoDataUri, logoTooltip, appName }: AppHeaderProps) {
    const styles = useStyles();
    const tooltip = logoTooltip?.trim() || DEFAULT_LOGO_TOOLTIP;

    return (
        <header className={styles.root} style={{ backgroundColor: colors.background, color: colors.foreground }} data-themed="App header" aria-label="Sample app header">
            <HeaderButton colors={colors} label="App launcher">
                <GridDotsRegular fontSize={20} />
            </HeaderButton>

            <div className={styles.logo} title={tooltip}>
                {logoDataUri ? <img className={styles.logoImage} src={logoDataUri} alt={tooltip} /> : <span className={styles.productName}>{tooltip}</span>}
            </div>

            <div className={styles.separator} style={{ backgroundColor: colors.foreground }} />
            <span className={styles.appName}>{appName}</span>

            <div className={styles.spacer} />

            <HeaderButton colors={colors} label="Search">
                <SearchRegular fontSize={20} />
            </HeaderButton>
            <HeaderButton colors={colors} label="Copilot">
                <LightbulbFilamentRegular fontSize={20} />
            </HeaderButton>
            <HeaderButton colors={colors} label="Quick create">
                <AddRegular fontSize={20} />
            </HeaderButton>
            <HeaderButton colors={colors} label="Filters">
                <FilterRegular fontSize={20} />
            </HeaderButton>
            <HeaderButton colors={colors} label="Settings">
                <SettingsRegular fontSize={20} />
            </HeaderButton>
            <HeaderButton colors={colors} label="Help">
                <QuestionCircleRegular fontSize={20} />
            </HeaderButton>
            <HeaderButton colors={colors} label="Feedback">
                <PersonFeedbackRegular fontSize={20} />
            </HeaderButton>
            <span className={styles.avatar} aria-hidden="true">
                AU
            </span>
        </header>
    );
}
