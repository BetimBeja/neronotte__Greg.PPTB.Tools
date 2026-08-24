import { useEffect, useRef, useState } from 'react';
import {
    Avatar,
    Button,
    Field,
    Menu,
    MenuItem,
    MenuList,
    MenuPopover,
    MenuTrigger,
    Radio,
    RadioGroup,
    Switch,
    makeStyles,
    mergeClasses,
    shorthands,
    tokens,
} from '@fluentui/react-components';
import type { ReactElement } from 'react';
import { ModelDrivenInput } from './modelDriven/ModelDrivenInput';
import { ModelDrivenTextarea } from './modelDriven/ModelDrivenTextarea';
import {
    AddRegular,
    ArrowClockwiseRegular,
    ArrowLeftRegular,
    BuildingRegular,
    ChevronDownRegular,
    DeleteRegular,
    LinkRegular,
    MailRegular,
    MoneyRegular,
    MoreVerticalRegular,
    PersonRegular,
    SaveEditRegular,
    SaveRegular,
    ShareRegular,
    AttachRegular,
} from '@fluentui/react-icons';
import { SAMPLE_ACCOUNTS } from './sampleData';
import { usePortalMount } from '../../state/PortalMountContext';

const useStyles = makeStyles({
    root: {
        display: 'flex',
        flexDirection: 'column',
        gap: tokens.spacingVerticalM,
        padding: tokens.spacingHorizontalL,
        minWidth: 0,
        flexGrow: 1,
    },
    surface: {
        display: 'flex',
        flexDirection: 'column',
        ...shorthands.borderRadius(tokens.borderRadiusLarge),
        backgroundColor: tokens.colorNeutralBackground1,
        boxShadow: tokens.shadow4,
    },
    formHeader: {
        display: 'flex',
        alignItems: 'center',
        flexWrap: 'nowrap',
        columnGap: tokens.spacingHorizontalL,
        padding: `${tokens.spacingVerticalS} ${tokens.spacingHorizontalM}`,
    },
    titleGroup: {
        display: 'flex',
        alignItems: 'center',
        gap: tokens.spacingHorizontalM,
        flexShrink: 0,
        minWidth: 0,
    },
    headerFields: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-end',
        gap: tokens.spacingHorizontalM,
        flexShrink: 0,
        marginLeft: 'auto',
    },
    recordIcon: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '36px',
        height: '36px',
        flexShrink: 0,
        ...shorthands.borderRadius(tokens.borderRadiusCircular),
        backgroundColor: tokens.colorNeutralBackground4,
        color: tokens.colorNeutralForeground2,
    },
    titleBlock: {
        display: 'flex',
        flexDirection: 'column',
        minWidth: 0,
    },
    recordName: {
        fontSize: tokens.fontSizeBase600,
        lineHeight: tokens.lineHeightBase600,
        fontWeight: tokens.fontWeightSemibold,
        textWrap: 'nowrap',
    },
    recordSubtitle: {
        display: 'flex',
        alignItems: 'center',
        gap: tokens.spacingHorizontalXXS,
        fontSize: tokens.fontSizeBase200,
        color: tokens.colorNeutralForeground3,
    },
    headerField: {
        display: 'flex',
        flexDirection: 'column',
        gap: tokens.spacingVerticalXXS,
    },
    headerFieldLabel: {
        fontSize: tokens.fontSizeBase200,
        color: tokens.colorNeutralForeground1,
    },
    ownerField: {
        display: 'flex',
        alignItems: 'center',
        gap: tokens.spacingHorizontalS,
    },
    commands: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-end',
        gap: tokens.spacingHorizontalXXS,
        flexShrink: 0,
    },
    commandsPushed: {
        marginLeft: 'auto',
    },
    commandButton: {
        // Commands are sized by their label, not by the default button width.
        minWidth: 'auto',
        flexShrink: 0,
        whiteSpace: 'nowrap',
    },
    divider: {
        width: '1px',
        alignSelf: 'stretch',
        marginTop: tokens.spacingVerticalXS,
        marginBottom: tokens.spacingVerticalXS,
        backgroundColor: tokens.colorNeutralStroke2,
    },
    tabs: {
        display: 'flex',
        alignItems: 'flex-end',
        gap: tokens.spacingHorizontalXS,
        paddingLeft: tokens.spacingHorizontalL,
        paddingRight: tokens.spacingHorizontalM,
    },
    tab: {
        position: 'relative',
        border: 'none',
        backgroundColor: 'transparent',
        color: tokens.colorNeutralForeground2,
        fontFamily: 'inherit',
        fontSize: tokens.fontSizeBase300,
        padding: `${tokens.spacingVerticalS} ${tokens.spacingHorizontalM}`,
        cursor: 'default',
        ':hover': {
            color: tokens.colorNeutralForeground1,
        },
    },
    activeTab: {
        color: tokens.colorNeutralForeground1,
        fontWeight: tokens.fontWeightSemibold,
        '::after': {
            content: '""',
            position: 'absolute',
            left: tokens.spacingHorizontalM,
            right: tokens.spacingHorizontalM,
            bottom: 0,
            height: '2px',
            borderRadius: tokens.borderRadiusCircular,
            // The active tab indicator is one of the documented themed surfaces.
            backgroundColor: tokens.colorCompoundBrandStroke,
        },
    },
    columns: {
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'flex-start',
        gap: tokens.spacingHorizontalM,
    },
    section: {
        display: 'flex',
        flexDirection: 'column',
        gap: tokens.spacingVerticalM,
        minWidth: '280px',
        flexGrow: 1,
        flexBasis: '320px',
        padding: tokens.spacingHorizontalL,
        ...shorthands.borderRadius(tokens.borderRadiusLarge),
        backgroundColor: tokens.colorNeutralBackground1,
        boxShadow: tokens.shadow4,
    },
    sectionTitle: {
        fontSize: tokens.fontSizeBase200,
        fontWeight: tokens.fontWeightSemibold,
        textTransform: 'uppercase',
        letterSpacing: '0.4px',
        color: tokens.colorNeutralForeground2,
    },
    lookup: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: tokens.spacingHorizontalXS,
        color: tokens.colorBrandForegroundLink,
        paddingLeft: tokens.spacingHorizontalS,
        cursor: 'default',
        ':hover': {
            color: tokens.colorBrandForegroundLinkHover,
            textDecorationLine: 'underline',
        },
    },
    ownerLink: {
        paddingLeft: 0,
        whiteSpace: 'nowrap',
    },
});

const FORM_TABS = ['Summary', 'Details', 'Related'] as const;

interface FormCommand {
    key: string;
    label: string;
    icon: ReactElement;
}

const FORM_COMMANDS: FormCommand[] = [
    { key: 'save', label: 'Save', icon: <SaveRegular /> },
    { key: 'saveClose', label: 'Save & Close', icon: <SaveEditRegular /> },
    { key: 'new', label: 'New', icon: <AddRegular /> },
];

// A short record name keeps the header on one row at narrow preview widths.
const account = { ...SAMPLE_ACCOUNTS[0], name: 'Contoso Inc.' };

/** Header width below which the header columns are dropped altogether. */
const FIELDS_INLINE_MIN_WIDTH = 1120;

/** Header width each command needs to stay in the bar, in FORM_COMMANDS order. */
const COMMAND_MIN_WIDTHS = [560, 700, 840];

/** Tracks the rendered width of an element so the header can re-arrange itself. */
function useElementWidth<T extends HTMLElement>() {
    const ref = useRef<T>(null);
    const [width, setWidth] = useState(0);

    useEffect(() => {
        const node = ref.current;
        if (!node) {
            return;
        }
        const observer = new ResizeObserver(([entry]) =>
            setWidth(entry.contentRect.width)
        );
        observer.observe(node);
        return () => observer.disconnect();
    }, []);

    return [ref, width] as const;
}

/** The "..." button: always present, and it collects the commands that do not fit. */
function CommandMenu({ hidden }: { hidden: FormCommand[] }) {
    const styles = useStyles();
    const mountNode = usePortalMount();

    return (
        <Menu mountNode={mountNode}>
            <MenuTrigger disableButtonEnhancement>
                <Button
                    className={styles.commandButton}
                    appearance="subtle"
                    icon={<MoreVerticalRegular />}
                    aria-label="More commands"
                />
            </MenuTrigger>
            <MenuPopover>
                <MenuList>
                    {hidden.map((command) => (
                        <MenuItem key={command.key} icon={command.icon}>
                            {command.label}
                        </MenuItem>
                    ))}
                    <MenuItem icon={<DeleteRegular />}>Delete</MenuItem>
                    <MenuItem icon={<ArrowClockwiseRegular />}>
                        Refresh
                    </MenuItem>
                </MenuList>
            </MenuPopover>
        </Menu>
    );
}

/** A read-only lookup value, rendered the way the platform styles lookups. */
function LookupValue({ label, value }: { label: string; value: string }) {
    const styles = useStyles();
    return (
        <Field label={label}>
            <span className={styles.lookup} data-themed="Lookup">
                <PersonRegular />
                {value}
            </span>
        </Field>
    );
}

/**
 * The **form** tab: form header, tabs with the themed active-tab indicator,
 * sections and one read-only control per Dataverse column type
 * (docs/REQUIREMENTS.md, Main Panel). Only the font, the lookups, the
 * hyperlinks and the tab indicator actually change with the theme
 * (docs/THEME_XML_REFERENCE.md §5).
 */
export function FormPreview() {
    const styles = useStyles();
    const [activeTab, setActiveTab] =
        useState<(typeof FORM_TABS)[number]>('Summary');
    const [headerRef, headerWidth] = useElementWidth<HTMLDivElement>();

    // Before the first measurement, assume there is room for everything.
    const fieldsInline =
        headerWidth === 0 || headerWidth >= FIELDS_INLINE_MIN_WIDTH;
    const visibleCommandCount =
        headerWidth === 0
            ? FORM_COMMANDS.length
            : COMMAND_MIN_WIDTHS.filter((min) => headerWidth >= min).length;

    return (
        <div className={styles.root}>
            <div className={styles.surface} ref={headerRef}>
                <div className={styles.formHeader}>
                    <div className={styles.titleGroup}>
                        <Button
                            appearance="subtle"
                            icon={<ArrowLeftRegular />}
                            aria-label="Back"
                        />
                        <span className={styles.recordIcon}>
                            <BuildingRegular />
                        </span>
                        <div className={styles.titleBlock}>
                            <span className={styles.recordName}>
                                {account.name}
                            </span>
                            <span className={styles.recordSubtitle}>
                                Account · Account
                                <ChevronDownRegular />
                            </span>
                        </div>
                    </div>

                    {fieldsInline && (
                        <div className={styles.headerFields}>
                            <div className={styles.headerField}>
                                <span>{account.mainPhone}</span>
                                <span className={styles.headerFieldLabel}>
                                    Main Phone
                                </span>
                            </div>
                            <div className={styles.divider} />
                            <div className={styles.ownerField}>
                                <Avatar
                                    name="Alan Steiner"
                                    color="colorful"
                                    size={32}
                                />
                                <div className={styles.headerField}>
                                    <span
                                        className={mergeClasses(
                                            styles.lookup,
                                            styles.ownerLink
                                        )}
                                        data-themed="Lookup"
                                    >
                                        Alan Steiner
                                    </span>
                                    <span className={styles.headerFieldLabel}>
                                        Owner
                                    </span>
                                </div>
                            </div>
                            <Button
                                appearance="subtle"
                                icon={<ChevronDownRegular />}
                                aria-label="More header fields"
                            />
                            <div className={styles.divider} />
                        </div>
                    )}

                    {/* The modern look embeds the command bar in the form header. */}
                    <div
                        className={mergeClasses(
                            styles.commands,
                            !fieldsInline && styles.commandsPushed
                        )}
                        role="toolbar"
                        aria-label="Commands"
                    >
                        {FORM_COMMANDS.slice(0, visibleCommandCount).map(
                            (command) => (
                                <Button
                                    key={command.key}
                                    className={styles.commandButton}
                                    appearance="subtle"
                                    icon={command.icon}
                                >
                                    {command.label}
                                </Button>
                            )
                        )}
                        <CommandMenu
                            hidden={FORM_COMMANDS.slice(visibleCommandCount)}
                        />
                        <div className={styles.divider} />
                        <Button
                            className={styles.commandButton}
                            appearance="subtle"
                            icon={<ShareRegular />}
                            iconPosition="before"
                            aria-label="Share"
                        >
                            <ChevronDownRegular />
                        </Button>
                    </div>
                </div>

                <div
                    className={styles.tabs}
                    role="tablist"
                    aria-label="Sample form tabs"
                    data-themed="Active tab indicator"
                >
                    {FORM_TABS.map((tab) => (
                        <button
                            key={tab}
                            type="button"
                            role="tab"
                            aria-selected={activeTab === tab}
                            className={mergeClasses(
                                styles.tab,
                                activeTab === tab && styles.activeTab
                            )}
                            onClick={() => setActiveTab(tab)}
                        >
                            {tab}
                        </button>
                    ))}
                </div>
            </div>

            {activeTab === 'Summary' && (
                <div className={styles.columns}>
                    <div className={styles.section}>
                        <div className={styles.sectionTitle}>
                            Account information
                        </div>
                        <Field label="Account Name (single line of text)">
                            <ModelDrivenInput value={account.name} />
                        </Field>
                        <Field label="Description (multiple lines of text)">
                            <ModelDrivenTextarea
                                resize="vertical"
                                value="Preferred customer since 2019. Head office in Redmond, three regional branches."
                            />
                        </Field>
                        <Field label="Website (URL)">
                            <ModelDrivenInput
                                value="https://www.adatum.com"
                                contentBefore={<LinkRegular />}
                            />
                        </Field>
                        <Field label="Email (email)">
                            <ModelDrivenInput
                                value={account.email}
                                contentBefore={<MailRegular />}
                            />
                        </Field>
                        <Field label="Main Phone (phone)">
                            <ModelDrivenInput value={account.mainPhone} />
                        </Field>
                        <LookupValue
                            label="Primary Contact (lookup)"
                            value={account.primaryContact}
                        />
                        <LookupValue
                            label="Bill To Customer (customer)"
                            value="Adventure Works (sample)"
                        />
                    </div>

                    <div className={styles.section}>
                        <div className={styles.sectionTitle}>
                            Classification
                        </div>
                        <Field label="Industry (choice)">
                            <ModelDrivenInput value="Consulting" />
                        </Field>
                        <Field label="Contact Methods (choices)">
                            <ModelDrivenInput value="Email, Phone" />
                        </Field>
                        {/* Kept disabled as a sample of the Model Driven read-only look. */}
                        <Field label="Status Reason (status)">
                            <ModelDrivenInput isDisabled value="Active" />
                        </Field>
                        <Field label="Do not allow bulk email (yes/no)">
                            <Switch checked={true} label="No" />
                        </Field>
                        <Field label="Preferred contact time (option set as radio)">
                            <RadioGroup value="morning" layout="horizontal">
                                <Radio value="morning" label="Morning" />
                                <Radio value="afternoon" label="Afternoon" />
                            </RadioGroup>
                        </Field>
                    </div>

                    <div className={styles.section}>
                        <div className={styles.sectionTitle}>
                            Financials and dates
                        </div>
                        <Field label="Number of Employees (whole number)">
                            <ModelDrivenInput value="1 250" />
                        </Field>
                        <Field label="Credit Score (decimal)">
                            <ModelDrivenInput value="7.45" />
                        </Field>
                        <Field label="Exchange Rate (floating point)">
                            <ModelDrivenInput value="1.0865" />
                        </Field>
                        <Field label="Annual Revenue (currency)">
                            <ModelDrivenInput
                                value="$ 12,500,000.00"
                                contentBefore={<MoneyRegular />}
                            />
                        </Field>
                        <Field label="Anniversary (date only)">
                            <ModelDrivenInput type="text" value="14/03/2019" />
                        </Field>
                        <Field label="Last Interaction (date and time)">
                            <ModelDrivenInput value="02/06/2026 09:30" />
                        </Field>
                        <Field label="Duration (whole number, duration format)">
                            <ModelDrivenInput value="1 hour 30 minutes" />
                        </Field>
                        <Field label="Brochure (file)">
                            <ModelDrivenInput
                                value="company-profile.pdf"
                                contentBefore={<AttachRegular />}
                            />
                        </Field>
                    </div>
                </div>
            )}

            {activeTab !== 'Summary' && (
                <div className={styles.columns}>
                    <div className={styles.section}>
                        <div className={styles.sectionTitle}>{activeTab}</div>
                        <Field label="Sample column (single line of text)">
                            <ModelDrivenInput
                                value={`${activeTab} tab content`}
                            />
                        </Field>
                    </div>
                </div>
            )}
        </div>
    );
}
