import type { Theme } from "@fluentui/react-components";

/**
 * Model Driven Apps don't dim a "disabled" control the way plain Fluent UI
 * does — they keep it read-only and just neutralise the brand-coloured
 * stroke (.github/skills/model-driven-ui-theme/SKILL.md).
 */
export function toModelDrivenReadOnlyTheme(theme: Theme): Theme {
  return {
    ...theme,
    colorCompoundBrandStroke: theme.colorNeutralStroke1,
    colorCompoundBrandStrokeHover: theme.colorNeutralStroke1Hover,
    colorCompoundBrandStrokePressed: theme.colorNeutralStroke1Pressed,
  };
}
