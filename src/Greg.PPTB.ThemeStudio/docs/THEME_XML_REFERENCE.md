# Modern theme XML — schema reference

Transcribed and consolidated from the Microsoft Learn documentation linked in
[`REQUIREMENTS.md`](./REQUIREMENTS.md):

- [Use modern themes in model-driven apps](https://learn.microsoft.com/en-us/power-apps/maker/model-driven-apps/modern-theme-overrides)
  (`powerapps-docs/maker/model-driven-apps/modern-theme-overrides.md`, `ms.date: 07/07/2026`)
- [Modern, refreshed look for model-driven apps](https://learn.microsoft.com/en-us/power-apps/user/modern-fluent-design)
  (`powerapps-docs/user/modern-fluent-design.md`, `ms.date: 07/31/2026`)
- [Style components with modern theming](https://learn.microsoft.com/en-us/power-apps/developer/component-framework/fluent-modern-theming)

This is the authoritative input for `model/themeXml.ts`, `model/tokenMap.ts` and
`model/brandRamp.ts`. Verbatim example files live in [`samples/`](./samples/).

---

## 1. Document shapes

There are **two valid root elements**, each tied to a different environment/app setting:

| Root | Setting that consumes it | Notes |
| --- | --- | --- |
| `<CustomTheme>` | **Custom theme definition** | May contain a single `<AppHeaderColors />` child element |
| `<AppHeaderColors>` | **Override app header color** | Header-only override, no palette/font |

> The **Override app header color** setting is **ignored** when **Custom theme definition** is set.
> The tool must warn about this when both are configured.

The documentation shows no XML declaration and no namespace on any example.

## 2. `CustomTheme` attributes

| Attribute | Type | Default | Notes |
| --- | --- | --- | --- |
| `basePaletteColor` | HEX colour | – | Seed colour used to generate the 16-slot palette |
| `lockPrimary` | boolean | `false` | `false` = palette optimised for accessibility, seed colour may not appear in any slot. `true` = seed colour is placed in the `primary` (middle) slot and the rest are generated lighter/darker; **may fail contrast requirements** |
| `font` | CSS font-family string | – | e.g. `'GreatVibes', cursive`. Rendering depends on browser/machine font availability |
| `vibrancy` | number, -100…100 | `0` | Muteness/brightness of the palette, mostly the lighter colours |
| `hueTorsion` | number, -100…100 | `0` | Tint/shade/tone of the palette, mostly the lighter colours |
| `logoWebResource` | string | – | **Logical name** of an image web resource used as the app-header logo |
| `logoTooltip` | string | `Dynamics 365` | Tooltip on the logo |

**Palette slot overrides** — any of the 16 slot names may also appear as an attribute on
`CustomTheme` with a HEX value, overriding that slot of the generated palette. Setting all 16
completely replaces palette generation:

```
darker70, darker60, darker50, darker40, darker30, darker20, darker10,
primary,
lighter10, lighter20, lighter30, lighter40, lighter50, lighter60, lighter70, lighter80
```

## 3. `AppHeaderColors` attributes

| Attribute | Required | Defaulting behaviour |
| --- | --- | --- |
| `background` | **Yes** | "This element must be defined for any changes to take effect" |
| `foreground` | No | Calculated for sufficient contrast against `background` |
| `backgroundHover` | No | Calculated from `background` |
| `foregroundHover` | No | Calculated for contrast against `backgroundHover` |
| `backgroundPressed` | No | Same defaulting as `backgroundHover` |
| `foregroundPressed` | No | Same defaulting as `foregroundHover` |
| `backgroundSelected` | No | Same defaulting as `backgroundHover` |
| `foregroundSelected` | No | Same defaulting as `backgroundHover` |

Microsoft explicitly recommends specifying distinct values for every interaction state and
verifying a **minimum 4.5:1 contrast ratio** between foreground and background in each state.

## 4. Slot → Fluent v9 brand ramp mapping

Fluent UI v9's `BrandVariants` is a 16-key ramp `10, 20, … 160` (dark → light) with `80` as the
primary. The doc's slot names map 1:1 onto it in order:

| Theme XML slot | Fluent `BrandVariants` key |
| --- | --- |
| `darker70` … `darker10` | `10` … `70` |
| `primary` | `80` |
| `lighter10` … `lighter80` | `90` … `160` |

This gives `model/tokenMap.ts` a direct route: build `BrandVariants` from the palette, then
`createLightTheme(brand)` from `@fluentui/react-components`. The same
[Fluent theme designer](https://react.fluentui.dev/?path=/docs/theme-theme-designer--docs)
that Microsoft points makers at is the reference implementation for generating a ramp from
`basePaletteColor` + `vibrancy` + `hueTorsion`.

## 5. What the theme actually affects

Per the docs, a custom theme changes: **the app header, hyperlinks, lookups, primary buttons,
active tab indicators, row selection, hover effects, and the app font** — plus the app logo.

Explicitly **not** themed / not yet supported:

- legacy grids, row summaries, focus view, the sales pipeline;
- business process flow control customisation;
- classic theming (`theme` table) is **not honoured at all** under the modern look;
- theme switching and dark mode are not supported;
- custom pages don't use the modern theme;
- custom chart colours are overridden unless the chart XML sets `CustomColorOverride="true"`.

## 6. Documentation inconsistencies to handle defensively

1. **Attribute casing.** The prose lists attributes in PascalCase (`BasePaletteColor`, `Font`,
   `LogoWebResource`), every code example uses camelCase (`basePaletteColor`, `font`,
   `logoWebResource`). Element names are PascalCase in both. → **Emit camelCase**, parse
   case-insensitively.
2. **`vibrancy`/`hueTorsion` applicability.** The `lockPrimary` bullet says they are used to
   preview the palette when `lockPrimary` is `false`, while the `vibrancy`/`hueTorsion` bullets say
   they are "only applicable when `lockPrimary="true"`" — and the first example uses both with
   `lockPrimary` unset (i.e. `false`). Contradictory. → Keep both editable, don't hard-disable them.
3. **The `AppHeaderColors` "element must be defined"** wording refers to the `background`
   *attribute*, not the element.
4. Nothing in the docs states whether unknown attributes are tolerated → the "preserve unknown
   nodes" strategy in the plan stays, and a real exported web resource is still needed to confirm.

## 7. Logo web resource constraints

- Referenced by **logical name** (schema name with publisher prefix), not by GUID.
- Recommended size **156 × 48 px**; "logos that are too large don't display" (no hard limit given).
- Must be an **image web resource**.
- Note: the "only SVG icons are supported" limitation in the modern-look article refers to
  **sitemap/navigation icons**, not the header logo — don't over-apply it.
