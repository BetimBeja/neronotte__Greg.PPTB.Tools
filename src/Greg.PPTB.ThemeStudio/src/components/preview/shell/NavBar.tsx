import { useState } from 'react';
import { makeStyles, mergeClasses, tokens } from '@fluentui/react-components';
import { BoardRegular, ChevronDownRegular, ClockRegular, HomeRegular, LineHorizontal3Regular, PinRegular, RocketRegular, TaskListSquareLtrRegular } from '@fluentui/react-icons';
import type { ReactNode } from 'react';

const useStyles = makeStyles({
    root: {
        display: 'flex',
        flexDirection: 'column',
        gap: tokens.spacingVerticalXXS,
        width: '224px',
        flexShrink: 0,
        paddingTop: tokens.spacingVerticalS,
        paddingBottom: tokens.spacingVerticalS,
        paddingLeft: tokens.spacingHorizontalXS,
        paddingRight: tokens.spacingHorizontalXS,
        backgroundColor: tokens.colorNeutralBackground3,
        overflowY: 'auto',
    },
    item: {
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        gap: tokens.spacingHorizontalM,
        width: '100%',
        height: '36px',
        paddingLeft: tokens.spacingHorizontalM,
        paddingRight: tokens.spacingHorizontalM,
        border: 'none',
        borderRadius: tokens.borderRadiusMedium,
        backgroundColor: 'transparent',
        color: tokens.colorNeutralForeground1,
        fontFamily: 'inherit',
        fontSize: tokens.fontSizeBase300,
        textAlign: 'left',
        cursor: 'default',
        ':hover': {
            backgroundColor: tokens.colorNeutralBackground3Hover,
        },
    },
    selected: {
        backgroundColor: tokens.colorBrandBackground2,
        color: tokens.colorBrandForeground2,
        fontWeight: tokens.fontWeightSemibold,
        ':hover': {
            backgroundColor: tokens.colorBrandBackground2Hover,
        },
        '::before': {
            content: '""',
            position: 'absolute',
            left: 0,
            top: '6px',
            bottom: '6px',
            width: '3px',
            borderRadius: tokens.borderRadiusCircular,
            backgroundColor: tokens.colorBrandStroke1,
        },
    },
    label: {
        flexGrow: 1,
    },
    groupLabel: {
        paddingLeft: tokens.spacingHorizontalM,
        paddingTop: tokens.spacingVerticalM,
        paddingBottom: tokens.spacingVerticalXS,
        fontSize: tokens.fontSizeBase300,
        fontWeight: tokens.fontWeightSemibold,
        color: tokens.colorNeutralForeground2,
    },
});

interface NavItem {
    key: string;
    label: string;
    icon: ReactNode;
    expandable?: boolean;
}

const AREA_ITEMS: NavItem[] = [
    { key: 'home', label: 'Home', icon: <HomeRegular fontSize={20} /> },
    { key: 'recent', label: 'Recent', icon: <ClockRegular fontSize={20} />, expandable: true },
    { key: 'pinned', label: 'Pinned', icon: <PinRegular fontSize={20} />, expandable: true },
];

const WORK_ITEMS: NavItem[] = [
    { key: 'accelerator', label: 'Sales accelerator', icon: <RocketRegular fontSize={20} /> },
    { key: 'activities', label: 'Activities', icon: <TaskListSquareLtrRegular fontSize={20} /> },
    { key: 'dashboards', label: 'Dashboards', icon: <BoardRegular fontSize={20} /> },
    { key: 'accounts', label: 'Accounts', icon: <BoardRegular fontSize={20} /> },
];

/**
 * The left navigation. Selection and hover are themed surfaces (they use the
 * brand ramp), which is why the nav is interactive even though the preview is
 * otherwise non-functional (docs/THEME_XML_REFERENCE.md §5).
 */
export function NavBar() {
    const styles = useStyles();
    const [selected, setSelected] = useState('accounts');

    const renderItem = (item: NavItem) => (
        <button
            key={item.key}
            type="button"
            className={mergeClasses(styles.item, selected === item.key && styles.selected)}
            aria-current={selected === item.key ? 'page' : undefined}
            onClick={() => setSelected(item.key)}
        >
            {item.icon}
            <span className={styles.label}>{item.label}</span>
            {item.expandable && <ChevronDownRegular fontSize={16} />}
        </button>
    );

    return (
        <nav className={styles.root} aria-label="Sample app navigation" data-themed="Navigation selection and hover">
            <button type="button" className={styles.item} aria-label="Collapse navigation">
                <LineHorizontal3Regular fontSize={20} />
            </button>
            {AREA_ITEMS.map(renderItem)}
            <div className={styles.groupLabel}>My Work</div>
            {WORK_ITEMS.map(renderItem)}
        </nav>
    );
}
