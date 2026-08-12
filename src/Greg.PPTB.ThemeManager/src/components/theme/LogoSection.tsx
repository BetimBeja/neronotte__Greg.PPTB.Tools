import { useState } from "react";
import {
  Button,
  Field,
  Input,
  MessageBar,
  MessageBarBody,
  Spinner,
  Text,
  makeStyles,
  tokens,
} from "@fluentui/react-components";
import { ArrowUploadRegular } from "@fluentui/react-icons";
import { DEFAULT_LOGO_TOOLTIP } from "../../model/defaults";
import { useThemeModel } from "../../state/ThemeContext";
import { useConfig } from "../../state/ConfigContext";
import { usePortalMount } from "../../state/PortalMountContext";
import {
  logoSizeWarning,
  pickLocalLogo,
  type LocalLogoFile,
} from "../../services/logo";
import {
  IMAGE_WEB_RESOURCE_TYPES,
  type WebResourceSummary,
} from "../../services/webResources";
import { WebResourcePickerDialog } from "../config/WebResourcePickerDialog";
import { UploadLogoDialog } from "./UploadLogoDialog";
import { DATAVERSE_ICON_DATA_URI } from "./dataverseIcon";

const useStyles = makeStyles({
  section: {
    display: "flex",
    flexDirection: "column",
    gap: tokens.spacingVerticalS,
  },
  hint: {
    color: tokens.colorNeutralForeground3,
  },
  buttons: {
    display: "flex",
    gap: tokens.spacingHorizontalS,
  },
  dataverseIcon: {
    width: "16px",
    height: "16px",
    display: "block",
  },
});

const LOGICAL_NAME_PATTERN = /^[a-zA-Z][a-zA-Z0-9]*_[a-zA-Z0-9_./-]+$/;

function message(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * **Logo** group: `logoWebResource` (a web resource **logical name**, not a
 * GUID) and `logoTooltip` (docs/THEME_XML_REFERENCE.md §7). The name can be
 * typed by hand, picked from the environment, or created by uploading a local
 * image — all three are required (docs/IMPLEMENTATION_PLAN.md §2.7).
 */
export function LogoSection() {
  const styles = useStyles();
  const mountNode = usePortalMount();
  const { model, dispatch } = useThemeModel();
  const {
    connection,
    selectedSolution,
    logoWarning,
    logoLoading,
    setPendingLogo,
  } = useConfig();

  const [pickerOpen, setPickerOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState<LocalLogoFile | undefined>();
  const [error, setError] = useState<string | undefined>();

  const logoWebResource = model.logoWebResource ?? "";
  const invalidName =
    logoWebResource !== "" && !LOGICAL_NAME_PATTERN.test(logoWebResource);
  const connected = Boolean(connection);

  const handlePick = (resource: WebResourceSummary) => {
    setPickerOpen(false);
    setPendingLogo(undefined);
    dispatch({ type: "setLogoWebResource", value: resource.name });
  };

  const handlePickFile = async () => {
    setError(undefined);
    let picked: LocalLogoFile | undefined;
    try {
      picked = await pickLocalLogo();
    } catch (pickError) {
      setError(message(pickError));
      return;
    }
    if (!picked) {
      return;
    }

    // Show the picked image in the preview straight away, whatever happens
    // to the upload afterwards.
    setPendingLogo(picked.dataUri, logoSizeWarning(picked.dimensions));

    if (!selectedSolution) {
      setError(
        "Pick a target solution in the config bar before uploading a logo.",
      );
      setPendingLogo(undefined);
      return;
    }

    setUploadFile(picked);
  };

  const handleUploaded = (resource: WebResourceSummary) => {
    setPendingLogo(undefined);
    setUploadFile(undefined);
    dispatch({ type: "setLogoWebResource", value: resource.name });
  };

  const handleUploadDismiss = () => {
    setPendingLogo(undefined);
    setUploadFile(undefined);
  };

  return (
    <div className={styles.section}>
      <Field
        label="Logo web resource"
        hint="Logical name (with publisher prefix) of an image web resource. Recommended size 156 × 48 px."
        validationState={invalidName ? "warning" : "none"}
        validationMessage={
          invalidName
            ? "This does not look like a logical name, e.g. contoso_company-logo."
            : undefined
        }
      >
        <Input
          value={logoWebResource}
          placeholder="contoso_company-logo"
          onChange={(_, data) => {
            setPendingLogo(undefined);
            dispatch({ type: "setLogoWebResource", value: data.value });
          }}
        />
      </Field>

      <div className={styles.buttons}>
        <Button
          size="small"
          icon={
            <img
              className={styles.dataverseIcon}
              src={DATAVERSE_ICON_DATA_URI}
              alt=""
            />
          }
          disabled={!connected}
          onClick={() => setPickerOpen(true)}
        >
          Select from Dataverse
        </Button>
        <Button
          size="small"
          icon={<ArrowUploadRegular />}
          disabled={!connected}
          onClick={() => void handlePickFile()}
        >
          Upload
        </Button>
        {logoLoading && <Spinner size="tiny" />}
      </div>

      <Field
        label="Logo tooltip"
        hint={`Tooltip shown on the app-header logo. The platform default is "${DEFAULT_LOGO_TOOLTIP}".`}
      >
        <Input
          value={model.logoTooltip ?? ""}
          placeholder={DEFAULT_LOGO_TOOLTIP}
          onChange={(_, data) =>
            dispatch({ type: "setLogoTooltip", value: data.value })
          }
        />
      </Field>

      {logoWarning && (
        <MessageBar intent="warning">
          <MessageBarBody>{logoWarning}</MessageBarBody>
        </MessageBar>
      )}

      {error && (
        <MessageBar intent="error">
          <MessageBarBody>{error}</MessageBarBody>
        </MessageBar>
      )}

      {!connected && (
        <Text size={100} className={styles.hint}>
          Browsing and uploading image web resources needs an active Dataverse
          connection.
        </Text>
      )}

      <WebResourcePickerDialog
        open={pickerOpen}
        title="Pick a logo web resource"
        types={IMAGE_WEB_RESOURCE_TYPES}
        onDismiss={() => setPickerOpen(false)}
        onPick={handlePick}
        mountNode={mountNode}
      />

      <UploadLogoDialog
        open={Boolean(uploadFile)}
        file={uploadFile}
        solution={selectedSolution}
        onDismiss={handleUploadDismiss}
        onUploaded={handleUploaded}
        mountNode={mountNode}
      />
    </div>
  );
}
