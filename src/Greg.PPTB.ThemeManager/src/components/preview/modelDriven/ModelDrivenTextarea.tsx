import {
  FluentProvider,
  Textarea,
  makeStyles,
  type TextareaProps,
} from "@fluentui/react-components";
import { useThemeModel } from "../../../state/ThemeContext";
import { toModelDrivenReadOnlyTheme } from "./modelDrivenTheme";

const useStyles = makeStyles({
  // Keeps the extra FluentProvider out of the surrounding flex/grid layout.
  host: {
    display: "contents",
  },
});

export interface ModelDrivenTextareaProps extends Omit<
  TextareaProps,
  "appearance" | "readOnly"
> {
  /** Model Driven "disabled" look: read-only with a neutral stroke, not Fluent's dimmed disabled state. */
  isDisabled?: boolean;
}

/** `Textarea` styled the way Model Driven App forms render it (docs: model-driven-ui-theme skill). */
export function ModelDrivenTextarea({
  isDisabled,
  ...rest
}: ModelDrivenTextareaProps) {
  const styles = useStyles();
  const { previewTheme } = useThemeModel();
  const theme = isDisabled
    ? toModelDrivenReadOnlyTheme(previewTheme.fluentTheme)
    : previewTheme.fluentTheme;

  return (
    <FluentProvider theme={theme} className={styles.host}>
      <Textarea appearance="filled-darker" readOnly={isDisabled} {...rest} />
    </FluentProvider>
  );
}
