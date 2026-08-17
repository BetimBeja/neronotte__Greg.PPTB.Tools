import {
  FluentProvider,
  Input,
  makeStyles,
  type InputProps,
} from "@fluentui/react-components";
import { useThemeModel } from "../../../state/ThemeContext";
import { toModelDrivenReadOnlyTheme } from "./modelDrivenTheme";

const useStyles = makeStyles({
  // Keeps the extra FluentProvider out of the surrounding flex/grid layout.
  host: {
    display: "contents",
  },
});

export interface ModelDrivenInputProps extends Omit<
  InputProps,
  "appearance" | "readOnly"
> {
  /** Model Driven "disabled" look: read-only with a neutral stroke, not Fluent's dimmed disabled state. */
  isDisabled?: boolean;
}

/** `Input` styled the way Model Driven App forms render it (docs: model-driven-ui-theme skill). */
export function ModelDrivenInput({
  isDisabled,
  ...rest
}: ModelDrivenInputProps) {
  const styles = useStyles();
  const { previewTheme } = useThemeModel();
  const theme = isDisabled
    ? toModelDrivenReadOnlyTheme(previewTheme.fluentTheme)
    : previewTheme.fluentTheme;

  return (
    <FluentProvider theme={theme} className={styles.host}>
      <Input appearance="filled-darker" readOnly={isDisabled} {...rest} />
    </FluentProvider>
  );
}
