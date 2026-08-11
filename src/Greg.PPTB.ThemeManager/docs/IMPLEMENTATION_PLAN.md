# Theme Manager — Implementation Plan

Companion document to [`REQUIREMENTS.md`](./REQUIREMENTS.md).
It records (1) the open questions and risks found while analysing the requirements and
(2) a phased plan to build the tool.

**Revision 2** — the requirements' Microsoft Learn links have now been read in full and the
findings folded in. See [`THEME_XML_REFERENCE.md`](./THEME_XML_REFERENCE.md) for the transcribed
schema and [`samples/`](./samples/) for the verbatim example files.

Status: **draft for review**. Sections marked 🔴 need a decision from the tool owner before
the corresponding phase starts.

## Source policy

Every technical claim below is traceable to a **Microsoft-published** source (the
`MicrosoftDocs` / `microsoft` GitHub organisations, learn.microsoft.com) or to this repository.
Where no Microsoft source exists, the point is explicitly labelled **UNVERIFIED** and a runtime
discovery step is planned instead of an assumption. Community tools, blogs and forum posts were
deliberately **not** used as sources.

Documents consulted:

| Doc | Repo path | Date |
| --- | --- | --- |
| Use modern themes in model-driven apps | `powerapps-docs/maker/model-driven-apps/modern-theme-overrides.md` | 07/07/2026 |
| Modern, refreshed look for model-driven apps | `powerapps-docs/user/modern-fluent-design.md` | 07/31/2026 |
| Style components with modern theming | `powerapps-docs/developer/component-framework/fluent-modern-theming.md` | 12/04/2024 |
| Manage model-driven app settings in the app designer | `powerapps-docs/maker/model-driven-apps/app-properties.md` | 04/02/2026 |
| Web resources for model-driven apps | `powerapps-docs/developer/model-driven-apps/web-resources.md` | – |
| Optional parameters (`SolutionUniqueName`) | `powerapps-docs/developer/data-platform/optional-parameters.md` | – |
| Import files as web resources (sample) | `powerapps-docs/developer/model-driven-apps/sample-import-files-web-resources.md` | – |
| Publish request schema | `powerapps-docs/developer/model-driven-apps/publish-request-schema.md` | – |
| SolutionComponent table reference | `powerapps-docs/developer/data-platform/reference/entities/solutioncomponent.md` | – |
| WebResource table reference | `powerapps-docs/developer/data-platform/reference/entities/webresource.md` | – |

---

## 1. Context: where the project stands today

`src/Greg.PPTB.ThemeManager` is currently the unmodified `yo pptb` React scaffold:

| Item | State |
| --- | --- |
| Build | Vite + React 18 + TypeScript, IIFE single-bundle output (PPTB-compatible) — keep as is |
| UI kit | `@fluentui/react-components` v9 (Fluent 2) already a dependency — exactly the right choice, see §4.2 |
| Source | Demo components only (`ConnectionStatus`, `DataverseAPIDemo`, `EventLog`, `ToolboxAPIDemo`) — all to be removed |
| Manifest | `package.json` has `configurations.repository` / `readmeUrl`; no `cspExceptions`, no `pptb.config.json` |
| Tests | None, no test runner configured |
| Docs | `README.md` is still the generator boilerplate |

Greenfield implementation inside an already-correct build shell. Nothing in the existing
Vite/HTML/bundling setup should be re-engineered.

---

## 2. Requirements analysis — issues & topics to discuss

### 2.1 🔴 "EXACT REPLICA" of the model-driven app UI is not an achievable acceptance criterion

`REQUIREMENTS.md` §Main Panel asks for an *exact replica* of the MDA shell. Problems:

- The shell is a closed, continuously-changing product surface. Microsoft describes the
  modernisation as arriving *"in waves"*, with **Wave 2 (header and navigation refresh)** already
  in public preview and *"future waves"* promised. A pixel-exact copy is stale within one release
  wave and becomes permanent maintenance debt.
- Microsoft branding (the waffle, the "Dynamics 365" wordmark, product icons) is trademarked and
  must **not** be reproduced. Use neutral placeholder branding (e.g. "Contoso") and Fluent icons only.
  Note the docs confirm `logoTooltip` *defaults to "Dynamics 365"* — that default is worth
  displaying as placeholder text, not as a reproduced logo.

**Proposal:** restate as *"a high-fidelity, recognisable approximation of the MDA shell, built from
Fluent 2 primitives, faithful enough that a theme change reads the same way it will in the real
app"*. Acceptance = visual comparison against `sample01.png`, reviewed by the tool owner.

**Also 🔴 decide:** does the preview target the Wave 1 shell (as in `sample01.png`) or the Wave 2
preview header/navigation refresh? Recommendation: Wave 1 for v1, since Wave 2 is opt-in preview.

### 2.2 ✅ RESOLVED — the theme XML schema is now documented

Previously the top blocker. The full attribute set, both root-element shapes, the 16 palette slot
names and the defaulting rules are transcribed in
[`THEME_XML_REFERENCE.md`](./THEME_XML_REFERENCE.md), with the four verbatim examples in
[`samples/`](./samples/). Headlines:

- Two root elements: `<CustomTheme>` (optionally wrapping `<AppHeaderColors />`) and a standalone
  `<AppHeaderColors>` — they map to two *different* platform settings.
- `CustomTheme`: `basePaletteColor`, `lockPrimary`, `font`, `vibrancy`, `hueTorsion`,
  `logoWebResource`, `logoTooltip`, plus optional overrides for any of the 16 palette slots
  (`darker70` … `primary` … `lighter80`).
- `AppHeaderColors`: `background` (required) plus 7 optional foreground/background state colours.
- Prose uses PascalCase attribute names, all examples use camelCase → **emit camelCase, parse
  case-insensitively**.
- The docs contradict themselves on whether `vibrancy`/`hueTorsion` apply when `lockPrimary="false"`
  → keep both always editable (§6 of the reference).

**Residual gap:** no Microsoft statement on whether *unknown* attributes are tolerated, and no
sample of a real exported web resource (XML declaration? namespace?). The "preserve unknown nodes"
strategy (§2.6) stays, and one real export should still be added to `samples/`.

### 2.3 ✅ RESOLVED — exactly what the theme affects is now documented

Microsoft states a custom theme changes: **the app header, hyperlinks, lookups, primary buttons,
active tab indicators, row selection, hover effects**, the **app font**, and the **app logo**.
Explicitly *not* themed: legacy grids, row summaries, focus view, the sales pipeline, business
process flow control customisation, and custom pages.

This is a small, well-defined surface — which makes the "highlight themed areas" overlay proposed
earlier both cheap and genuinely useful. **Recommended in scope**, and it directly mitigates the
risk that users expect the whole preview to react to their edits.

It also means the **form preview's value is limited**: of all the field controls the requirements
ask for, only lookups, hyperlinks, active tab indicators and the font actually change with the
theme. The form tab is still worth building (font + tab indicators + lookup styling are visible),
but the effort should be weighted towards the header and the view/grid tab.

### 2.4 🔴 Environment vs. app scope — mechanism identified, API path UNVERIFIED

Microsoft documents this only as a **maker UI flow** through solutions:

1. Create the theme XML web resource in a solution.
2. **Add existing → More → Setting** and pick either **Custom theme definition** (full theme) or
   **Override app header color** (header only).
3. Set a **Setting environment value** = the web resource's unique name (with publisher prefix,
   no quotes) for environment-wide scope; or add the app to the solution and set a value on the app
   for per-app scope.
4. **Publish all customizations.**

Critically: **Override app header color is ignored whenever Custom theme definition is set.** The
tool must detect and warn about this combination.

> **UNVERIFIED — no Microsoft source found.** There is **no** Microsoft entity-reference page for
> `settingdefinition`, `organizationsetting` or `appsetting` (confirmed by listing
> `powerapps-docs/developer/data-platform/reference/entities/` — those three files do not exist),
> and no Microsoft-published Web API example for reading or writing setting values. Table names,
> entity set names, column names, `uniquename` values for the two theme settings, and the
> `@odata.bind` navigation property names are therefore **all unconfirmed**.

**Plan (Phase 0 spike, runtime discovery — never hardcode):**

- Probe the candidate entity sets against a real environment via `dataverseAPI.queryData`, and
  resolve the setting definition by its **display name** ("Custom theme definition" /
  "Override app header color"), reading its unique name and id at runtime.
- Confirm with `dataverseAPI.getEntityMetadata` / `getAllEntitiesMetadata` which of these tables
  actually exist and are writable in the target environment before building any UI on top.
- Record the verified findings in this document, with the caveat that they are environment-observed
  and not contractual.

**Fallback if the write path is unsupported (must be agreed up front, it changes the value
proposition):** the tool still creates/updates the theme web resource and the logo, shows the exact
unique name to paste, and deep-links to the solution in the maker portal via
`toolboxAPI.utils.openInConnectionBrowser` so the user completes the setting assignment there.

### 2.5 Web resource writes — fully documented, with one PPTB-specific constraint

Confirmed from Microsoft docs:

- Create: `POST /api/data/v9.2/webresourceset` with `name`, `displayname`, `webresourcetype`,
  `content` (**base64-encoded bytes**), optional `description`.
- `webresourcetype` values: **4 = Data (XML)**, **5 = PNG**, **6 = JPG**, **7 = GIF**, **10 = ICO**,
  **11 = SVG**.
- The publisher prefix is prepended to the name; the theme setting must reference the
  **prefixed unique name**.
- Solution association uses the `MSCRM.SolutionUniqueName` **request header** (Web API) /
  `SolutionUniqueName` optional parameter (SDK).
- **Publishing is not required on create, but is required on update.**
- Targeted publish: `PublishXml` with
  `<importexportxml><webresources><webresource>{id}</webresource></webresources></importexportxml>`
  (element names confirmed in the publish request schema). Broad publish: `PublishAllXml`.
- Upload size is bounded by `Organization.MaxUploadFileSize` (default 5 MB).

**PPTB constraint:** `dataverseAPI.create(entity, record, target?)` exposes no per-request header
argument, so `MSCRM.SolutionUniqueName` probably **cannot** be sent. Phase 0 must verify this and,
if confirmed, use the documented alternative: create the web resource, then call the
`AddSolutionComponent` action via `dataverseAPI.execute` with **ComponentType 61 (Web Resource)**
(value confirmed in the SolutionComponent table reference). If neither works, the web resource
lands in the default solution — which must be stated plainly in the UI, not silently accepted.

Also: block updates to **managed** web resources (check `ismanaged`) with a clear message, and
always warn before publishing that it affects the whole environment.

### 2.6 Round-trip fidelity of existing themes

Loading a theme that contains attributes the tool doesn't model, then re-serialising naively,
silently deletes them. **Plan:** keep the parsed DOM of the loaded file and re-emit unknown
attributes/nodes untouched, show a non-blocking banner listing what the UI can't edit, and always
show an old-vs-new XML diff before saving. This matters more than usual because the docs give no
guarantee that the attribute list is closed or final.

### 2.7 ✅ MOSTLY RESOLVED — logo web resource

Documented: referenced by **logical name** (prefixed), recommended size **156 × 48 px**, and
*"logos that are too large don't display"* (no hard limit stated). The "only SVG icons are
supported" limitation in the modern-look article applies to **sitemap/navigation icons**, not the
header logo — don't over-apply it.

Still 🔴 **a product decision**: does the tool *upload* an image (via
`toolboxAPI.fileSystem.selectPath` + `readBinary` → base64 → `webresourceset` with type 5/6/11) or
only *reference* an existing one? Recommendation: support both, validate dimensions against
156 × 48 and warn on mismatch, and render the logo plus its `logoTooltip` in the preview header.

### 2.8 🔴 The classic-look toggle is very likely obsolete

Requirement §31 and §52 ask for a classic-vs-modern toggle. Microsoft now states:

> "With the **2026 Wave 1** release, all users must use the **New Look**… Makers can't switch a
> model-driven app back to the classic look."

and the app-designer setting **"New look for model-driven apps"** is *"hidden and ignored with the
2026 Wave 1 release."* Furthermore, under the modern look **classic theming is not honoured at
all**, so a classic preview couldn't even reflect the theme being authored.

**Strong recommendation: drop the classic-look toggle from v1.** Building a second full shell mock
for a look users can no longer select, and which ignores the theme anyway, is pure cost. If a
"before/after" comparison is the underlying need, satisfy it with an *unthemed modern shell*
toggle instead — same value, a fraction of the work, and it stays correct.

If a look toggle survives at all, the more useful axis is **Wave 1 vs Wave 2 (header & navigation
refresh, preview)**, since that is a choice makers can actually still make per app.

### 2.9 Layout: theme panel + config panel + preview in a PPTB tool tab

PPTB tools run in a constrained `BrowserView`, often narrower than a browser window. A fixed
3-region layout will be cramped. **Proposal:** collapsible right panel, config panel as a compact
top bar, preview area with a zoom/scale control (50 %–100 %) and horizontal scroll fallback;
minimum supported width ~1100 px.

### 2.10 Style isolation between PPTB's own theme and the previewed theme

The tool's chrome follows the PPTB host theme (`toolboxAPI.utils.getCurrentTheme()`); the preview
must render an arbitrary user-defined theme. Microsoft's own guidance for this exact problem
("when your component requires styling that is different from the current theme of the app") is to
**nest a `FluentProvider` with your own token set** — so nesting is the documented, supported
pattern and becomes the default choice. Two Microsoft-documented caveats to honour:

- Fluent v9 controls rendered through a **React portal** (menus, dialogs, tooltips) must be
  re-wrapped in the provider or they lose the styling.
- `IdPrefixProvider` can be used to isolate token inheritance where nesting alone isn't enough.

An `<iframe>` preview stays as the escape hatch only if CSS bleed-through proves unmanageable.

### 2.11 Accessibility of the produced theme — now a documented requirement, not a nice-to-have

Microsoft explicitly instructs makers to verify *"a minimum of a 4.5:1 contrast ratio between
foreground and background colors for the rest state and each button interaction state"*, and warns
that `lockPrimary="true"` generates palettes that *"might not meet contrast ratio accessibility
requirements"*.

**Therefore: live WCAG contrast checking is in scope**, not optional. Concretely: contrast readouts
and inline warnings for all four `AppHeaderColors` state pairs, and a warning banner whenever
`lockPrimary="true"` is selected.

### 2.12 Non-functional gaps in the requirements

Not mentioned in `REQUIREMENTS.md`, need a decision:

- **Unsaved-changes protection** when switching theme file / connection / closing the tool.
- **Undo/redo** for theme edits — recommended, at minimum "reset to loaded values".
- **Presets** and **import/export** of the XML to/from disk via `toolboxAPI.fileSystem`.
- **Working without a connection**: preview and theme editing need no Dataverse; the tool should
  degrade to edit-and-export.
- **Persisted preferences** via `toolboxAPI.settings` with namespaced keys (`ui.previewTab`,
  `last.solutionId`, …) — never transient UI state.
- **Font handling**: `font` is a raw CSS font-family string and *"the font that the custom theme
  renders depends on the browser and target machine's ability to show that font"*. The preview must
  therefore warn when the chosen family isn't resolvable locally, or the WYSIWYG will lie. Offer a
  small curated list of web-safe families plus free-text entry.
- **Localisation**: single-language (en) for v1 unless stated otherwise.

### 2.13 Things explicitly out of scope (proposed)

Classic `theme` table records (not honoured under the modern look), canvas-app and Power Pages
theming, per-user themes, dark mode (*"switching themes or enabling dark mode isn't supported at
this time"*), chart colour customisation (`CustomColorOverride`), and any real data in the mock —
the preview is 100 % static sample data, per requirement §29.

---

## 3. Target architecture

```
src/
  main.tsx                     # entry, /// <reference types="@pptb/types" />
  App.tsx                      # shell layout: config bar / preview / theme panel
  model/
    theme.ts                   # ThemeModel: normalised, UI-friendly theme state
    themeXml.ts                # parse(xml) -> ThemeModel, serialize(model, originalDom) -> xml
    tokenMap.ts                # ThemeModel -> Fluent v9 Theme (BrandVariants + overrides)
    brandRamp.ts               # basePaletteColor + vibrancy + hueTorsion -> 16 slots
    contrast.ts                # WCAG ratio helpers for the header state pairs
    defaults.ts                # documented defaults + starter presets
  state/
    ThemeContext.tsx           # theme state + undo/redo + dirty tracking
    ConfigContext.tsx          # connection, solution, web resource, scope
  services/
    webResources.ts            # list / read / create / update / publish (dataverseAPI)
    themeScope.ts              # environment vs app assignment (+ deep-link fallback)
    logo.ts                    # logo web resource read/upload
  components/
    config/                    # ConfigPanel: solution, theme file, logo, scope
    theme/                     # ThemePanel: grouped editors, color picker, contrast
    preview/
      PreviewFrame.tsx         # nested FluentProvider + zoom + tab switch
      shell/                   # Header, NavBar, CommandBar (shared by both tabs)
      GridPreview.tsx          # view tab
      FormPreview.tsx          # form tab
  hooks/
```

Principles:

- **One source of truth** — `ThemeModel`. The XML and the Fluent theme are both *projections* of
  it; the preview never reads XML.
- **Pure, testable core** — `themeXml`, `tokenMap`, `brandRamp`, `contrast` are dependency-free and
  are where the unit tests go, fixtured from `docs/samples/`.
- **Dataverse only at the edges** — everything in `services/`, wrapped in try/catch, errors surfaced
  via `toolboxAPI.utils.showNotification`; no hand-rolled fetch/bearer tokens.
- **Live preview with no manual refresh** (requirement §43) falls out of React state +
  `useMemo` over `tokenMap`; debounce colour-picker drags (~50 ms).

---

## 4. Key technical decisions

### 4.1 Theme XML handling

`DOMParser` / `XMLSerializer` (built in — no new dependency). Keep the parsed document for
unknown-node preservation. Two root elements must both be supported, and the tool must know which
platform setting the open document belongs to. Parse attribute names case-insensitively, emit
camelCase. Report malformed files with a readable message instead of throwing.

### 4.2 Mapping the theme to the preview

The 16 documented slots map **1:1 onto Fluent v9 `BrandVariants` keys `10`…`160`**, with
`primary` = `80` (see `THEME_XML_REFERENCE.md` §4). So:

`ThemeModel` → `BrandVariants` → `createLightTheme(brand)` from `@fluentui/react-components` →
spread the `AppHeaderColors` overrides on top for the header region.

This is structurally the same construct the platform uses, which is why the preview will track
reality even where it isn't pixel-perfect. Microsoft points makers at the
[Fluent theme designer](https://react.fluentui.dev/?path=/docs/theme-theme-designer--docs) to
preview ramp generation from `basePaletteColor` + `vibrancy` + `hueTorsion` — that is the reference
behaviour `brandRamp.ts` must approximate, including the two `lockPrimary` modes:

- `lockPrimary="true"` → seed colour placed in the `primary` slot, remaining slots generated
  incrementally lighter/darker (contrast not guaranteed).
- `lockPrimary="false"` (default) → accessibility-optimised ramp; the seed may not appear in any slot.

🔴 **Decide in Phase 0/2:** implement a local ramp generator, or take a dependency on Microsoft's
own `@fluentui/react-theme-designer` package if it exposes the generator (bundle-size cost, and it
must be verified as an official Microsoft package before adoption). Exact colour-for-colour parity
with the platform is unlikely either way — the UI should say the ramp is an approximation and that
slot overrides are the way to get exact colours.

### 4.3 Colour picker

Fluent v9 ships a `ColorPicker` in `@fluentui/react-components` (verify it is stable, not preview,
in the pinned `^9.72.7`). Use it if stable; otherwise native `<input type="color">` plus a
validated hex text field. **No third-party colour-picker dependency.** Every colour must also be
enterable as an HTML colour value (requirement §42) with inline validation, and every colour input
must show its live contrast ratio where a documented pairing exists.

### 4.4 Manifest / CSP

No external network calls are needed: Dataverse goes through `dataverseAPI`, and the logo renders
from a base64 `data:` URI (already allowed by PPTB's default `img-src`). **Ship with no
`cspExceptions`.** No `pptb.config.json` unless inter-tool invocation or agent integration is added
later — both out of scope for v1.

One caveat: a custom `font` may name a family that isn't installed locally. Do **not** solve this by
adding a CDN font CSP exception; warn instead (§2.12).

### 4.5 Testing

Add **Vitest** (dev dependency only) covering the pure core: XML parse → model → serialise
round-trip against every file in `docs/samples/` (including unknown-attribute preservation), both
root-element shapes, colour parsing/validation, brand-ramp generation, and contrast calculation.
UI/preview correctness stays manual (visual review against `sample01.png`). Keep `tsc` and
`pptb-validate` in the loop.

---

## 5. Phased delivery

Each phase ends with `npm run build`, `npx pptb-validate --skip-url-checks`, and a manual load in
PPTB via `npm run dev-watch` + Load Local Tool.

### Phase 0 — Spikes (blocking, do first)
- Resolve §2.4: discover at runtime whether the settings tables are readable/writable through
  `dataverseAPI`, and resolve the two setting definitions by display name. Record findings here.
- Resolve §2.5: can `dataverseAPI` send `MSCRM.SolutionUniqueName`? If not, validate the
  `AddSolutionComponent` (ComponentType 61) route.
- Verify Fluent `ColorPicker` stability in the pinned version (§4.3) and decide the ramp-generator
  approach (§4.2).
- Add one **real exported theme web resource** to `docs/samples/` to close the residual §2.2 gap.
- Get owner decisions on §2.1 (fidelity + Wave 1 vs 2), §2.7 (logo upload) and §2.8 (drop classic).

### Phase 1 — Shell & scaffolding cleanup
- Remove the demo components; fix the `index.html` title; rewrite `README.md` for the real tool.
- Add `/// <reference types="@pptb/types" />`, a single `toolboxAPI.events.on` registration,
  host-theme awareness, and an error boundary.
- Build the three-region responsive layout with placeholder content.

### Phase 2 — Theme model & Theme Panel (fully offline)
- `theme.ts`, `themeXml.ts`, `brandRamp.ts`, `contrast.ts`, `defaults.ts` + unit tests against
  `docs/samples/`.
- Theme Panel grouped as the docs group them: **Palette** (seed, `lockPrimary`, `vibrancy`,
  `hueTorsion`, 16 slot overrides), **Typography** (`font`), **Logo** (`logoWebResource`,
  `logoTooltip`), **App header** (the 8 `AppHeaderColors` attributes with per-state contrast
  readouts).
- Undo/redo, per-token reset, presets, import/export XML via `toolboxAPI.fileSystem`.

### Phase 3 — Preview (modern / Wave 1 look)
- Shared shell: header (logo + tooltip, app name, search, command icons, avatar), nav bar,
  floating command bar with the documented rounded-corner/elevation styling.
- **View tab**: view selector, keyword filter, sample `account` grid with elevation/drop-shadow
  styling, link-styled primary column, row selection and hover states (all themed surfaces).
- **Form tab**: form header, tabs with active-tab indicator, sections, and one control per
  Dataverse column type — read-only, non-functional.
- Wire `tokenMap` for instant repaint; add the zoom control and the "highlight themed areas"
  overlay (§2.3).

### Phase 4 — Dataverse integration (Config Panel)
- Solution picker (`getSolutions`) and web resource picker (XML web resources, `webresourcetype` 4,
  managed detection).
- Load an existing theme; create a new one; save with a pre-save XML diff; publish (`PublishXml`
  targeted, or `publishCustomizations()`), with an explicit confirmation that publishing affects
  the whole environment.
- Scope assignment (environment vs app) per the Phase 0 findings, with the documented deep-link
  fallback; warn when both **Custom theme definition** and **Override app header color** are set.
- Logo: browse/upload the image web resource (types 5/6/11), validate against 156 × 48, render it
  in the preview.
- Unsaved-changes guard; graceful no-connection mode.

### Phase 5 — Polish & release
- `toolboxAPI.settings` persistence, keyboard accessibility pass on the tool's own UI,
  notification/error-message review against PPTB conventions, README with screenshots,
  `pptb-validate` clean, version bump + publish checklist.

### Phase 6 — Stretch
- Unthemed-vs-themed side-by-side comparison (replaces the classic toggle, §2.8), Wave 2
  header/navigation preview variant, per-token "where is this used?" hints.

---

## 6. Risks

| Risk | Impact | Mitigation |
| --- | --- | --- |
| Settings tables/columns are undocumented by Microsoft and may change | Scope assignment breaks | Runtime discovery, never hardcode ids; documented maker-portal fallback |
| `dataverseAPI` can't send `MSCRM.SolutionUniqueName` | Web resources land in the default solution | Phase 0 spike; `AddSolutionComponent` (type 61) alternative; state the behaviour in the UI |
| Ramp generation doesn't match the platform exactly | Preview colours drift from reality | Label the ramp as an approximation; expose the 16 slot overrides for exact control |
| MDA shell keeps changing (Wave 2, future waves) | Preview goes stale | Reframe as approximation (§2.1); revisit each release wave |
| Publishing affects the whole environment | User impact | Explicit confirmation dialog + warning copy |
| Round-trip loses unknown attributes | Data loss in customer themes | Preserve unknown nodes + pre-save diff |
| Custom `font` not installed locally | WYSIWYG silently lies | Detect and warn; curated web-safe list |
| Layout too cramped in a PPTB tab | Unusable | Collapsible panels + zoom, min-width target |

---

## 7. Open questions for the tool owner

1. Do you accept "high-fidelity approximation" instead of "exact replica", and Wave 1 as the
   preview target (§2.1)?
2. Can the classic-look toggle be dropped, given the New Look is mandatory from 2026 Wave 1 and
   classic ignores the theme entirely — replaced by a themed/unthemed comparison (§2.8)?
3. Should the tool upload logo images, or only reference existing web resources (§2.7)?
4. Is the solution picker in scope for v1, and is "falls back to the default solution" acceptable
   if PPTB can't send the solution header (§2.5)?
5. Is the maker-portal deep-link fallback acceptable if the setting value can't be written through
   the API (§2.4)?
6. Must the tool be usable with no active connection (§2.12)?
