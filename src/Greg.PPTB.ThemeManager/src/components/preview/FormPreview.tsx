import { useState } from 'react';
import { Field, Input, Radio, RadioGroup, Switch, Textarea, makeStyles, mergeClasses, shorthands, tokens } from '@fluentui/react-components';
import {
    AddRegular,
    ArrowClockwiseRegular,
    DeleteRegular,
    LinkRegular,
    MailRegular,
    MoneyRegular,
    PersonRegular,
    SaveRegular,
    AttachRegular,
} from '@fluentui/react-icons';
import { CommandBar, type CommandBarCommand } from './shell/CommandBar';
import { SAMPLE_ACCOUNTS } from './sampleData';

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
        overflow: 'hidden',
    },
    formHeader: {
        display: 'flex',
        alignItems: 'center',
        gap: tokens.spacingHorizontalXXL,
        padding: `${tokens.spacingVerticalM} ${tokens.spacingHorizontalL}`,
    },
    recordName: {
        fontSize: tokens.fontSizeHero700,
        fontWeight: tokens.fontWeightSemibold,
    },
    headerField: {
        display: 'flex',
        flexDirection: 'column',
        gap: tokens.spacingVerticalXXS,
    },
    headerFieldLabel: {
        fontSize: tokens.fontSizeBase200,
        color: tokens.colorNeutralForeground3,
    },
    tabs: {
        display: 'flex',
        gap: tokens.spacingHorizontalXS,
        paddingLeft: tokens.spacingHorizontalL,
        paddingRight: tokens.spacingHorizontalL,
        borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
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
        gap: tokens.spacingHorizontalXXL,
        padding: tokens.spacingHorizontalL,
    },
    section: {
        display: 'flex',
        flexDirection: 'column',
        gap: tokens.spacingVerticalM,
        minWidth: '280px',
        flexGrow: 1,
        flexBasis: '320px',
    },
    sectionTitle: {
        fontSize: tokens.fontSizeBase400,
        fontWeight: tokens.fontWeightSemibold,
        paddingBottom: tokens.spacingVerticalXS,
        borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
    },
    lookup: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: tokens.spacingHorizontalXS,
        color: tokens.colorBrandForegroundLink,
        height: '32px',
        paddingLeft: tokens.spacingHorizontalS,
        cursor: 'default',
        ':hover': {
            color: tokens.colorBrandForegroundLinkHover,
            textDecorationLine: 'underline',
        },
    },
});

const FORM_COMMANDS: CommandBarCommand[] = [
    { key: 'new', label: 'New', icon: <AddRegular /> },
    { key: 'save', label: 'Save', icon: <SaveRegular /> },
    { key: 'saveClose', label: 'Save & Close', icon: <SaveRegular /> },
    { key: 'delete', label: 'Delete', icon: <DeleteRegular /> },
    { key: 'refresh', label: 'Refresh', icon: <ArrowClockwiseRegular /> },
];

const FORM_TABS = ['Summary', 'Details', 'Related'] as const;

const account = SAMPLE_ACCOUNTS[0];

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
    const [activeTab, setActiveTab] = useState<(typeof FORM_TABS)[number]>('Summary');

    return (
        <div className={styles.root}>
            <CommandBar commands={FORM_COMMANDS} primaryLabel="Share" />

            <div className={styles.surface}>
                <div className={styles.formHeader}>
                    <span className={styles.recordName}>{account.name}</span>
                    <div className={styles.headerField}>
                        <span className={styles.headerFieldLabel}>Main Phone</span>
                        <span>{account.mainPhone}</span>
                    </div>
                    <div className={styles.headerField}>
                        <span className={styles.headerFieldLabel}>Owner</span>
                        <span className={styles.lookup} data-themed="Lookup">
                            <PersonRegular />
                            Alan Steiner
                        </span>
                    </div>
                </div>

                <div className={styles.tabs} role="tablist" aria-label="Sample form tabs" data-themed="Active tab indicator">
                    {FORM_TABS.map((tab) => (
                        <button
                            key={tab}
                            type="button"
                            role="tab"
                            aria-selected={activeTab === tab}
                            className={mergeClasses(styles.tab, activeTab === tab && styles.activeTab)}
                            onClick={() => setActiveTab(tab)}
                        >
                            {tab}
                        </button>
                    ))}
                </div>

                {activeTab === 'Summary' && (
                    <div className={styles.columns}>
                        <div className={styles.section}>
                            <div className={styles.sectionTitle}>Account information</div>
                            <Field label="Account Name (single line of text)">
                                <Input readOnly value={account.name} />
                            </Field>
                            <Field label="Description (multiple lines of text)">
                                <Textarea readOnly resize="vertical" value="Preferred customer since 2019. Head office in Redmond, three regional branches." />
                            </Field>
                            <Field label="Website (URL)">
                                <Input readOnly value="https://www.adatum.com" contentBefore={<LinkRegular />} />
                            </Field>
                            <Field label="Email (email)">
                                <Input readOnly value={account.email} contentBefore={<MailRegular />} />
                            </Field>
                            <Field label="Main Phone (phone)">
                                <Input readOnly value={account.mainPhone} />
                            </Field>
                            <LookupValue label="Primary Contact (lookup)" value={account.primaryContact} />
                            <LookupValue label="Bill To Customer (customer)" value="Adventure Works (sample)" />
                        </div>

                        <div className={styles.section}>
                            <div className={styles.sectionTitle}>Classification</div>
                            <Field label="Industry (choice)">
                                <Input readOnly value="Consulting" />
                            </Field>
                            <Field label="Contact Methods (choices)">
                                <Input readOnly value="Email, Phone" />
                            </Field>
                            <Field label="Status Reason (status)">
                                <Input readOnly value="Active" />
                            </Field>
                            <Field label="Do not allow bulk email (yes/no)">
                                <Switch checked={false} disabled label="No" />
                            </Field>
                            <Field label="Preferred contact time (option set as radio)">
                                <RadioGroup value="morning" disabled layout="horizontal">
                                    <Radio value="morning" label="Morning" />
                                    <Radio value="afternoon" label="Afternoon" />
                                </RadioGroup>
                            </Field>
                        </div>

                        <div className={styles.section}>
                            <div className={styles.sectionTitle}>Financials and dates</div>
                            <Field label="Number of Employees (whole number)">
                                <Input readOnly value="1 250" />
                            </Field>
                            <Field label="Credit Score (decimal)">
                                <Input readOnly value="7.45" />
                            </Field>
                            <Field label="Exchange Rate (floating point)">
                                <Input readOnly value="1.0865" />
                            </Field>
                            <Field label="Annual Revenue (currency)">
                                <Input readOnly value="$ 12,500,000.00" contentBefore={<MoneyRegular />} />
                            </Field>
                            <Field label="Anniversary (date only)">
                                <Input readOnly type="text" value="14/03/2019" />
                            </Field>
                            <Field label="Last Interaction (date and time)">
                                <Input readOnly value="02/06/2026 09:30" />
                            </Field>
                            <Field label="Duration (whole number, duration format)">
                                <Input readOnly value="1 hour 30 minutes" />
                            </Field>
                            <Field label="Brochure (file)">
                                <Input readOnly value="company-profile.pdf" contentBefore={<AttachRegular />} />
                            </Field>
                        </div>
                    </div>
                )}

                {activeTab !== 'Summary' && (
                    <div className={styles.columns}>
                        <div className={styles.section}>
                            <div className={styles.sectionTitle}>{activeTab}</div>
                            <Field label="Sample column (single line of text)">
                                <Input readOnly value={`${activeTab} tab content`} />
                            </Field>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
