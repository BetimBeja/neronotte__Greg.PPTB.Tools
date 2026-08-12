import { useEffect, useState } from "react";
import {
  Button,
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
  Spinner,
  makeStyles,
  tokens,
} from "@fluentui/react-components";
import type { SolutionSummary } from "../../services/solutions";
import { suggestLogoName, type LocalLogoFile } from "../../services/logo";
import {
  createWebResource,
  publishWebResource,
  type WebResourceSummary,
} from "../../services/webResources";

const useStyles = makeStyles({
  body: {
    display: "flex",
    flexDirection: "column",
    gap: tokens.spacingVerticalM,
  },
  preview: {
    display: "flex",
    alignItems: "center",
    gap: tokens.spacingHorizontalM,
  },
  thumb: {
    maxWidth: "96px",
    maxHeight: "48px",
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    borderRadius: tokens.borderRadiusMedium,
    backgroundColor: tokens.colorNeutralBackground2,
  },
  hint: {
    color: tokens.colorNeutralForeground3,
  },
});

/** Same shape as the full-name pattern validated on the main "Logo web resource" field. */
const NAME_PATTERN = /^[a-zA-Z][a-zA-Z0-9]*_[a-zA-Z0-9_./-]+$/;

export interface UploadLogoDialogProps {
  open: boolean;
  file?: LocalLogoFile;
  solution?: SolutionSummary;
  onDismiss: () => void;
  onUploaded: (resource: WebResourceSummary) => void;
  mountNode?: HTMLElement;
}

function message(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function prefixOf(solution: SolutionSummary | undefined): string {
  return solution
    ? `${solution.publisherPrefix.trim().replace(/_+$/, "")}_`
    : "";
}

/**
 * Names and creates the logo web resource (docs/IMPLEMENTATION_PLAN.md §2.7):
 * suggests the `<prefix>_/images/<file>` folder convention, but always
 * enforces the publisher prefix of the solution selected in the config panel.
 */
export function UploadLogoDialog({
  open,
  file,
  solution,
  onDismiss,
  onUploaded,
  mountNode,
}: UploadLogoDialogProps) {
  const styles = useStyles();
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | undefined>();

  useEffect(() => {
    if (open && file) {
      setName(`${prefixOf(solution)}${suggestLogoName(file.fileName)}`);
      setError(undefined);
    }
  }, [open, file, solution]);

  const prefix = prefixOf(solution);
  const trimmedName = name.trim();
  const nameError = !trimmedName
    ? "Enter a name for the web resource."
    : !prefix
      ? "Pick a target solution in the config bar first."
      : !trimmedName.startsWith(prefix)
        ? `The name must start with "${prefix}", the publisher prefix of the selected solution.`
        : !NAME_PATTERN.test(trimmedName)
          ? "Only letters, digits, underscore, dot, slash and hyphen are allowed."
          : undefined;

  const handleCreate = async () => {
    if (!file || !solution || nameError) {
      return;
    }
    setBusy(true);
    setError(undefined);
    try {
      const created = await createWebResource({
        name: trimmedName,
        displayName: file.fileName,
        webResourceType: file.webResourceType,
        contentBase64: file.contentBase64,
        solutionUniqueName: solution.uniqueName,
        description: "App header logo, uploaded by Theme Manager.",
      });
      await publishWebResource(created.id);
      onUploaded(created);
    } catch (uploadError) {
      setError(message(uploadError));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(_, data) => (data.open || busy ? undefined : onDismiss())}
    >
      <DialogSurface mountNode={mountNode}>
        <DialogBody>
          <DialogTitle>Upload the logo</DialogTitle>
          <DialogContent className={styles.body}>
            {file && (
              <div className={styles.preview}>
                <img className={styles.thumb} src={file.dataUri} alt="" />
                <span className={styles.hint}>{file.fileName}</span>
              </div>
            )}

            <Field
              label="Web resource name"
              required
              validationState={nameError ? "error" : "none"}
              validationMessage={nameError}
            >
              <Input value={name} onChange={(_, data) => setName(data.value)} />
            </Field>

            {error && (
              <MessageBar intent="error">
                <MessageBarBody>{error}</MessageBarBody>
              </MessageBar>
            )}

            {busy && <Spinner size="tiny" label="Uploading…" />}
          </DialogContent>
          <DialogActions>
            <Button appearance="secondary" disabled={busy} onClick={onDismiss}>
              Cancel
            </Button>
            <Button
              appearance="primary"
              disabled={busy || Boolean(nameError)}
              onClick={() => void handleCreate()}
            >
              Upload
            </Button>
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
}
