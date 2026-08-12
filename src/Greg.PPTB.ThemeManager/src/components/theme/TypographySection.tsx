import {
  Dropdown,
  Field,
  Input,
  Option,
  Text,
  makeStyles,
  tokens,
} from "@fluentui/react-components";
import { TextFontRegular } from "@fluentui/react-icons";
import { WEB_SAFE_FONTS } from "../../model/defaults";
import { useThemeModel } from "../../state/ThemeContext";
import { usePortalMount } from "../../state/PortalMountContext";

const useStyles = makeStyles({
  section: {
    display: "flex",
    flexDirection: "column",
    gap: tokens.spacingVerticalS,
  },
  fontRow: {
    display: "flex",
    gap: tokens.spacingHorizontalS,
  },
  fontDropdown: {
    minWidth: "auto",
  },
  hint: {
    color: tokens.colorNeutralForeground3,
  },
  warning: {
    color: tokens.colorPaletteDarkOrangeForeground1,
  },
});

/** Extracts the first family name of a CSS font-family list, unquoted. */
function firstFamily(font: string): string {
  return font
    .split(",")[0]
    .trim()
    .replace(/^['"]|['"]$/g, "");
}

/**
 * **Typography** group: the single documented `font` attribute, a CSS
 * font-family string (docs/THEME_XML_REFERENCE.md §2).
 */
export function TypographySection() {
  const styles = useStyles();
  const { model, dispatch } = useThemeModel();
  const mountNode = usePortalMount();

  const family = model.font ? firstFamily(model.font) : undefined;
  const isWebSafe =
    family !== undefined &&
    WEB_SAFE_FONTS.some((f) => f.toLowerCase() === family.toLowerCase());

  return (
    <div className={styles.section}>
      <Field
        label="Font"
        hint="Pick a web-safe font from the list, or type any custom font-family name. Rendering may differ depending on the fonts installed and the browser used on each person's machine."
      >
        <div className={styles.fontRow}>
          <Input
            style={{ flexGrow: 1 }}
            placeholder="Segoe UI"
            value={model.font ?? ""}
            onChange={(_, data) =>
              dispatch({ type: "setFont", value: data.value })
            }
          />
          <Dropdown
            mountNode={mountNode}
            className={styles.fontDropdown}
            button={{
              children: <TextFontRegular />,
              "aria-label": "Pick a web-safe font",
            }}
            selectedOptions={[]}
            value=""
            onOptionSelect={(_, data) =>
              dispatch({ type: "setFont", value: data.optionValue })
            }
          >
            {WEB_SAFE_FONTS.map((font) => (
              <Option key={font} value={font} text={font}>
                {font}
              </Option>
            ))}
          </Dropdown>
        </div>
      </Field>

      {model.font && !isWebSafe && (
        <Text size={100} className={styles.warning}>
          "{family}" isn't a web-safe family. The app renders it only on
          machines where the font is installed — the browser falls back
          otherwise.
        </Text>
      )}
    </div>
  );
}
