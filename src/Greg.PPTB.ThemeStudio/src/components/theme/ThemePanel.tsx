import { useState } from "react";
import {
  Accordion,
  AccordionHeader,
  AccordionItem,
  AccordionPanel,
  Button,
  MessageBar,
  MessageBarBody,
  MessageBarTitle,
  Radio,
  RadioGroup,
  Text,
  Title3,
  Toolbar,
  ToolbarButton,
  ToolbarDivider,
  Tooltip,
  makeStyles,
  tokens,
} from "@fluentui/react-components";
import {
  ArrowRedoRegular,
  ArrowUndoRegular,
  ArrowUploadRegular,
  ArrowDownloadRegular,
  DeleteRegular,
} from "@fluentui/react-icons";
import { useThemeModel } from "../../state/ThemeContext";
import { usePortalMount } from "../../state/PortalMountContext";
import {
  createDefaultAppHeaderColorsModel,
  createDefaultThemeModel,
} from "../../model/defaults";
import {
  exportThemeToFile,
  importThemeFromFile,
} from "../../services/themeFile";
import type { ThemeDocumentKind } from "../../model/theme";
import { PaletteSection } from "./PaletteSection";
import { TypographySection } from "./TypographySection";
import { LogoSection } from "./LogoSection";
import { AppHeaderSection } from "./AppHeaderSection";

const useStyles = makeStyles({
  root: {
    display: "flex",
    flexDirection: "column",
    gap: tokens.spacingVerticalS,
    padding: tokens.spacingHorizontalL,
    width: "360px",
    minWidth: "300px",
    backgroundColor: tokens.colorNeutralBackground2,
    borderLeft: `1px solid ${tokens.colorNeutralStroke1}`,
    overflowY: "auto",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: tokens.spacingHorizontalS,
  },
  hint: {
    color: tokens.colorNeutralForeground3,
  },
  kind: {
    display: "flex",
    flexDirection: "column",
    gap: tokens.spacingVerticalXXS,
  },
  startNewButtonWrapper: {
    flexShrink: 0,
    marginTop: tokens.spacingVerticalM,
    height: "40px",
  },
  startNewButton: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
  },
  accordion: {
    display: "flex",
    flexDirection: "column",
    gap: tokens.spacingVerticalM,
  },
  accordionItem: {
    backgroundColor: tokens.colorNeutralBackground1,
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    borderRadius: tokens.borderRadiusXLarge,
    boxShadow: tokens.shadow2,
    overflow: "hidden",
  },
  accordionHeader: {
    fontWeight: tokens.fontWeightSemibold,
    fontSize: tokens.fontSizeBase400,
    letterSpacing: "0.2px",
  },
  emoji: {
    marginRight: tokens.spacingHorizontalS,
  },
  accordionPanel: {
    paddingBottom: tokens.spacingVerticalM,
  },
});

async function notify(
  title: string,
  body: string,
  type: "info" | "success" | "warning" | "error",
) {
  try {
    await window.toolboxAPI.utils.showNotification({ title, body, type });
  } catch (error) {
    console.error("Unable to show a notification:", error);
  }
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * Right-side panel where the user configures the modern theme: document shape,
 * palette, typography, logo and app header colours, plus undo/redo and offline
 * import/export of the theme XML (docs/IMPLEMENTATION_PLAN.md §5, Phase 2).
 */
export function ThemePanel() {
  const styles = useStyles();
  const mountNode = usePortalMount();
  const { model, dispatch, dirty, canUndo, canRedo } = useThemeModel();
  const [busy, setBusy] = useState(false);

  // Attributes the loaded file carries but this UI can't edit. They survive
  // a load → save round trip untouched (docs/IMPLEMENTATION_PLAN.md §2.6),
  // but the user has to know they are there.
  const preserved = [
    ...Object.keys(model.unknownAttributes),
    ...Object.keys(model.unknownAppHeaderColorsAttributes),
  ];

  const handleImport = async () => {
    setBusy(true);
    try {
      const imported = await importThemeFromFile();
      if (imported) {
        dispatch({ type: "load", model: imported });
        await notify(
          "Theme imported",
          "The theme XML file was loaded successfully.",
          "success",
        );
      }
    } catch (error) {
      await notify("Import failed", errorMessage(error), "error");
    } finally {
      setBusy(false);
    }
  };

  const handleExport = async () => {
    setBusy(true);
    try {
      const path = await exportThemeToFile(model);
      if (path) {
        dispatch({ type: "markSaved" });
        await notify("Theme exported", `Saved to ${path}.`, "success");
      }
    } catch (error) {
      await notify("Export failed", errorMessage(error), "error");
    } finally {
      setBusy(false);
    }
  };

  const handleClear = () => {
    dispatch({
      type: "load",
      model:
        model.kind === "appHeaderColorsOnly"
          ? createDefaultAppHeaderColorsModel()
          : createDefaultThemeModel(),
    });
  };

  return (
    <div className={styles.root}>
      <div className={styles.header}>
        <Title3>Theme</Title3>
        {dirty && (
          <Text size={100} className={styles.hint}>
            Unsaved changes
          </Text>
        )}
      </div>

      {preserved.length > 0 && (
        <MessageBar intent="info">
          <MessageBarBody>
            <MessageBarTitle>Preserved as-is</MessageBarTitle>
            This theme also sets {preserved.join(", ")}, which this tool can't
            edit. The values are kept unchanged when the theme is saved.
          </MessageBarBody>
        </MessageBar>
      )}

      <Toolbar size="small">
        <Tooltip content="Undo" relationship="label" mountNode={mountNode}>
          <ToolbarButton
            icon={<ArrowUndoRegular />}
            disabled={!canUndo}
            onClick={() => dispatch({ type: "undo" })}
            aria-label="Undo"
          />
        </Tooltip>
        <Tooltip content="Redo" relationship="label" mountNode={mountNode}>
          <ToolbarButton
            icon={<ArrowRedoRegular />}
            disabled={!canRedo}
            onClick={() => dispatch({ type: "redo" })}
            aria-label="Redo"
          />
        </Tooltip>
        <ToolbarDivider />
        <ToolbarButton
          icon={<ArrowUploadRegular />}
          disabled={busy}
          onClick={handleImport}
        >
          Import
        </ToolbarButton>
        <ToolbarButton
          icon={<ArrowDownloadRegular />}
          disabled={busy}
          onClick={handleExport}
        >
          Export
        </ToolbarButton>
      </Toolbar>

      <div className={styles.kind}>
        <Text weight="semibold" size={200}>
          Theme document
        </Text>
        <RadioGroup
          value={model.kind}
          onChange={(_, data) =>
            dispatch({ type: "setKind", kind: data.value as ThemeDocumentKind })
          }
        >
          <Radio
            value="customTheme"
            label="Create full custom theme (CustomTheme)"
          />
          <Radio
            value="appHeaderColorsOnly"
            label="Override only app header color (AppHeaderColors)"
          />
        </RadioGroup>
        <Text size={100} className={styles.hint}>
          The header-only override is ignored by the platform when a custom
          theme definition is also set.
        </Text>
      </div>

      <Accordion
        multiple
        collapsible
        defaultOpenItems={["palette", "appHeader"]}
        className={styles.accordion}
      >
        {model.kind === "customTheme" && (
          <AccordionItem value="palette" className={styles.accordionItem}>
            <AccordionHeader className={styles.accordionHeader} size="large">
              <span aria-hidden="true" className={styles.emoji}>
                🎨
              </span>
              Palette
            </AccordionHeader>
            <AccordionPanel className={styles.accordionPanel}>
              <PaletteSection />
            </AccordionPanel>
          </AccordionItem>
        )}
        {model.kind === "customTheme" && (
          <AccordionItem value="typography" className={styles.accordionItem}>
            <AccordionHeader className={styles.accordionHeader} size="large">
              <span aria-hidden="true" className={styles.emoji}>
                🔤
              </span>
              Typography
            </AccordionHeader>
            <AccordionPanel className={styles.accordionPanel}>
              <TypographySection />
            </AccordionPanel>
          </AccordionItem>
        )}
        {model.kind === "customTheme" && (
          <AccordionItem value="logo" className={styles.accordionItem}>
            <AccordionHeader className={styles.accordionHeader} size="large">
              <span aria-hidden="true" className={styles.emoji}>
                🖼️
              </span>
              Logo
            </AccordionHeader>
            <AccordionPanel className={styles.accordionPanel}>
              <LogoSection />
            </AccordionPanel>
          </AccordionItem>
        )}
        <AccordionItem value="appHeader" className={styles.accordionItem}>
          <AccordionHeader className={styles.accordionHeader} size="large">
            <span aria-hidden="true" className={styles.emoji}>
              🧭
            </span>
            App header
          </AccordionHeader>
          <AccordionPanel className={styles.accordionPanel}>
            <AppHeaderSection />
          </AccordionPanel>
        </AccordionItem>
      </Accordion>

      <div className={styles.startNewButtonWrapper}>
        <Button
          appearance="secondary"
          icon={<DeleteRegular />}
          onClick={handleClear}
          className={styles.startNewButton}
        >
          Start from an empty theme
        </Button>
      </div>
    </div>
  );
}
