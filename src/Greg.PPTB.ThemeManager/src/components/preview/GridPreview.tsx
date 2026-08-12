import { useMemo, useState } from "react";
import {
  Checkbox,
  makeStyles,
  mergeClasses,
  shorthands,
  tokens,
} from "@fluentui/react-components";
import {
  ArrowClockwiseRegular,
  AddRegular,
  ChartMultipleRegular,
  ChevronDownRegular,
  DeleteRegular,
  FilterRegular,
  SearchRegular,
  TableSimpleRegular,
  TaskListSquareLtrRegular,
} from "@fluentui/react-icons";
import { CommandBar, type CommandBarCommand } from "./shell/CommandBar";
import { ModelDrivenInput } from "./modelDriven/ModelDrivenInput";
import { SAMPLE_ACCOUNTS, SAMPLE_VIEWS } from "./sampleData";

const useStyles = makeStyles({
  root: {
    display: "flex",
    flexDirection: "column",
    gap: tokens.spacingVerticalM,
    padding: tokens.spacingHorizontalL,
    minWidth: 0,
    flexGrow: 1,
  },
  surface: {
    display: "flex",
    flexDirection: "column",
    ...shorthands.borderRadius(tokens.borderRadiusLarge),
    backgroundColor: tokens.colorNeutralBackground1,
    boxShadow: tokens.shadow4,
    overflow: "hidden",
  },
  gridHeader: {
    display: "flex",
    alignItems: "center",
    gap: tokens.spacingHorizontalM,
    padding: `${tokens.spacingVerticalM} ${tokens.spacingHorizontalL}`,
  },
  viewSelector: {
    display: "inline-flex",
    alignItems: "center",
    gap: tokens.spacingHorizontalXS,
    border: "none",
    backgroundColor: "transparent",
    color: tokens.colorNeutralForeground1,
    fontFamily: "inherit",
    fontSize: tokens.fontSizeHero700,
    fontWeight: tokens.fontWeightSemibold,
    cursor: "default",
    padding: 0,
  },
  spacer: {
    flexGrow: 1,
  },
  iconButton: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: "32px",
    height: "32px",
    border: "none",
    borderRadius: tokens.borderRadiusMedium,
    backgroundColor: "transparent",
    color: tokens.colorNeutralForeground2,
    cursor: "default",
    ":hover": {
      backgroundColor: tokens.colorNeutralBackground1Hover,
    },
  },
  search: {
    width: "240px",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: tokens.fontSizeBase300,
  },
  th: {
    textAlign: "left",
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorNeutralForeground1,
    padding: `${tokens.spacingVerticalS} ${tokens.spacingHorizontalM}`,
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
    whiteSpace: "nowrap",
  },
  td: {
    padding: `${tokens.spacingVerticalS} ${tokens.spacingHorizontalM}`,
    borderBottom: `1px solid ${tokens.colorNeutralStroke3}`,
    color: tokens.colorNeutralForeground1,
    whiteSpace: "nowrap",
  },
  checkboxCell: {
    width: "44px",
    paddingLeft: tokens.spacingHorizontalM,
  },
  row: {
    ":hover": {
      backgroundColor: tokens.colorNeutralBackground1Hover,
    },
  },
  selectedRow: {
    backgroundColor: tokens.colorBrandBackground2,
    ":hover": {
      backgroundColor: tokens.colorBrandBackground2Hover,
    },
  },
  link: {
    color: tokens.colorBrandForegroundLink,
    textDecorationLine: "none",
    cursor: "default",
    ":hover": {
      color: tokens.colorBrandForegroundLinkHover,
      textDecorationLine: "underline",
    },
  },
  empty: {
    padding: tokens.spacingHorizontalL,
    color: tokens.colorNeutralForeground3,
  },
});

const VIEW_COMMANDS: CommandBarCommand[] = [
  { key: "chart", label: "Show Chart", icon: <ChartMultipleRegular /> },
  { key: "focused", label: "Focused view", icon: <TaskListSquareLtrRegular /> },
  { key: "new", label: "New", icon: <AddRegular /> },
  { key: "delete", label: "Delete", icon: <DeleteRegular /> },
  { key: "refresh", label: "Refresh", icon: <ArrowClockwiseRegular /> },
  {
    key: "visualize",
    label: "Visualize this view",
    icon: <ChartMultipleRegular />,
  },
];

const COLUMNS = [
  { key: "name", label: "Account Name" },
  { key: "mainPhone", label: "Main Phone" },
  { key: "city", label: "Address 1: City" },
  { key: "primaryContact", label: "Primary Contact" },
  { key: "email", label: "Email (Primary Contact)" },
] as const;

/**
 * The **view** tab: view selector, keyword filter and a sample `account` grid
 * on an elevated surface, with a link-styled primary column plus row selection
 * and hover — all of them surfaces the modern theme repaints.
 */
export function GridPreview() {
  const styles = useStyles();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [keyword, setKeyword] = useState("");

  const rows = useMemo(() => {
    const needle = keyword.trim().toLowerCase();
    if (!needle) {
      return SAMPLE_ACCOUNTS;
    }
    return SAMPLE_ACCOUNTS.filter((account) =>
      Object.values(account).some((value) =>
        value.toLowerCase().includes(needle),
      ),
    );
  }, [keyword]);

  const allSelected =
    rows.length > 0 && rows.every((row) => selectedIds.includes(row.id));

  const toggleRow = (id: string) => {
    setSelectedIds((current) =>
      current.includes(id)
        ? current.filter((value) => value !== id)
        : [...current, id],
    );
  };

  return (
    <div className={styles.root}>
      <CommandBar commands={VIEW_COMMANDS} />

      <div className={styles.surface}>
        <div className={styles.gridHeader}>
          <button
            type="button"
            className={styles.viewSelector}
            aria-label="View selector"
          >
            {SAMPLE_VIEWS[0]}
            <ChevronDownRegular fontSize={20} />
          </button>
          <div className={styles.spacer} />
          <button
            type="button"
            className={styles.iconButton}
            aria-label="Edit columns"
          >
            <TableSimpleRegular fontSize={20} />
          </button>
          <button
            type="button"
            className={styles.iconButton}
            aria-label="Edit filters"
          >
            <FilterRegular fontSize={20} />
          </button>
          <ModelDrivenInput
            className={styles.search}
            size="medium"
            placeholder="Filter by keyword"
            contentBefore={<SearchRegular />}
            value={keyword}
            onChange={(_, data) => setKeyword(data.value)}
            aria-label="Filter by keyword"
          />
        </div>

        <table
          className={styles.table}
          data-themed="Row selection, hover and hyperlinks"
        >
          <thead>
            <tr>
              <th className={mergeClasses(styles.th, styles.checkboxCell)}>
                <Checkbox
                  checked={allSelected}
                  aria-label="Select all rows"
                  onChange={(_, data) =>
                    setSelectedIds(
                      data.checked ? rows.map((row) => row.id) : [],
                    )
                  }
                />
              </th>
              {COLUMNS.map((column) => (
                <th key={column.key} className={styles.th}>
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const selected = selectedIds.includes(row.id);
              return (
                <tr
                  key={row.id}
                  className={mergeClasses(
                    styles.row,
                    selected && styles.selectedRow,
                  )}
                  aria-selected={selected}
                >
                  <td className={mergeClasses(styles.td, styles.checkboxCell)}>
                    <Checkbox
                      checked={selected}
                      aria-label={`Select ${row.name}`}
                      onChange={() => toggleRow(row.id)}
                    />
                  </td>
                  <td className={styles.td}>
                    <span className={styles.link}>{row.name}</span>
                  </td>
                  <td className={styles.td}>
                    <span className={styles.link}>{row.mainPhone}</span>
                  </td>
                  <td className={styles.td}>{row.city}</td>
                  <td className={styles.td}>
                    <span className={styles.link}>{row.primaryContact}</span>
                  </td>
                  <td className={styles.td}>
                    <span className={styles.link}>{row.email}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {rows.length === 0 && (
          <div className={styles.empty}>No records match the keyword.</div>
        )}
      </div>
    </div>
  );
}
