---
name: model-driven-ui-theme
description: Design and style FluentUI controls as they are styled in a Dataverse Model Driven App
---

Model Driven App user controls are Fluent UI controls with little tweaks:

- 'appearance': 'filled-darker'

Model Driven App "disabled" state is different from the standard Fluent UI one.

To achieve that, rewrap the control in a lightly changed theme where you overwrite the `colorCompoundBrandStoke` with a neutral stroke and apply "readOnly" instead of "disabled". Sample

```typescript

export const ModelDrivenInput: React.FC<IModelDrivenInputProps> = ({ name, isDisabled, theme }) => {
  const styles = useStyles();

  const myTheme = isDisabled
    ? {...theme,
      colorCompoundBrandStroke: theme?.colorNeutralStroke1,
      colorCompoundBrandStrokeHover: theme?.colorNeutralStroke1Hover,
      colorCompoundBrandStrokePressed: theme?.colorNeutralStroke1Pressed,
      colorCompoundBrandStrokeSelected: theme?.colorNeutralStroke1Selected,
    }
    : theme;
  return (
    <FluentProvider theme={myTheme} className={styles.root} >
        <Input
          value={name}
          appearance='filled-darker'
          className={styles.root}
          readOnly={isDisabled}
        />
    </FluentProvider>
    );

};
```

To apply this, each standard fluent ui control used must be "wrapped" in a corrisponding custom typescript control with that behavior.

Combobox and dropdown require a special behavior: It’s not rendered as a disabled Combobox, but it’s rendered as an Input, readonly and again with the neutral stroke.

```typescript
export const ModelDrivenCombobox: React.FC<IModelDrivenComboboxProps> = ({ name, isDisabled, theme }) => {
  const styles = useStyles();

  const myTheme = isDisabled
    ? {...theme,
      colorCompoundBrandStroke: theme?.colorNeutralStroke1,
      colorCompoundBrandStrokeHover: theme?.colorNeutralStroke1Hover,
      colorCompoundBrandStrokePressed: theme?.colorNeutralStroke1Pressed,
      colorCompoundBrandStrokeSelected: theme?.colorNeutralStroke1Selected,
    }
    : theme
  return (
    <FluentProvider theme={myTheme} className={styles.root} >
      {!isDisabled || isCanvasApp === true
        ? <Combobox
            //value={name}
            appearance='filled-darker'
            className={styles.root}
            readOnly={isDisabled}
            disabled={isDisabled && isCanvasApp===true}
          >
            <Option >Test</Option>
          </Combobox>
      : <Input
          value={name}
          appearance='filled-darker'
          className={styles.root}
          readOnly={isDisabled}
        />
      }

    </FluentProvider>
    );

};
```
