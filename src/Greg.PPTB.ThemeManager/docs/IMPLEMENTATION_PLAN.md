# Theme Manager — Implementation Plan

Companion document to [`REQUIREMENTS.md`](./REQUIREMENTS.md).
It records (1) the open questions and risks found while analysing the requirements and
(2) a phased plan to build the tool.

**Revision 4** — a new requirement was added by the tool owner: derive the theme colours
automatically from a website screenshot or URL. It is analysed in §2.14, reflected in §3, §4.5,
§4.6 and delivered as **Phase 6** (§5). Revision 3 answered the 6 open product questions from §7
(Revision 2); the plan and `REQUIREMENTS.md` were updated accordingly. See
[`THEME_XML_REFERENCE.md`](./THEME_XML_REFERENCE.md) for the transcribed schema and
[`samples/`](./samples/) for the verbatim example files.

Status: **owner decisions received**. Remaining 🟡 items need runtime verification (Phase 0
spikes), not further product decisions. §2.14 is now built (Phase 6).

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

### 2.1 ✅ RESOLVED — "high-fidelity approximation", Wave 1 target

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

**Owner decision (received):** accepted. The preview targets the **Wave 1 shell** (as in
`sample01.png`) for v1; the Wave 2 header/navigation refresh remains a stretch item (§5, Phase 7).

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

### 2.4 🟡 Environment vs. app scope — mechanism identified, API path still to be verified at runtime; deep-link fallback APPROVED

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

**Owner decision (received): the maker-portal deep-link fallback is acceptable.** If the setting
value can't be written through the API, the tool still creates/updates the theme web resource and
the logo, shows the exact unique name to paste, and deep-links to the solution in the maker portal
via `toolboxAPI.utils.openInConnectionBrowser` so the user completes the setting assignment there.

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
(value confirmed in the SolutionComponent table reference).

**Owner decision (received): the solution picker is in scope and mandatory — there is no
default-solution fallback.** The user must always explicitly pick the target solution before any
web resource is created or updated; if neither `MSCRM.SolutionUniqueName` nor
`AddSolutionComponent` can be made to work, saving must be **blocked** with a clear error rather
than silently letting the web resource land in the default solution.

Also: block updates to **managed** web resources (check `ismanaged`) with a clear message, and
always warn before publishing that it affects the whole environment.

### 2.6 Round-trip fidelity of existing themes

Loading a theme that contains attributes the tool doesn't model, then re-serialising naively,
silently deletes them. **Plan:** keep the parsed DOM of the loaded file and re-emit unknown
attributes/nodes untouched, show a non-blocking banner listing what the UI can't edit, and always
show an old-vs-new XML diff before saving. This matters more than usual because the docs give no
guarantee that the attribute list is closed or final.

### 2.7 ✅ RESOLVED — logo web resource

Documented: referenced by **logical name** (prefixed), recommended size **156 × 48 px**, and
*"logos that are too large don't display"* (no hard limit stated). The "only SVG icons are
supported" limitation in the modern-look article applies to **sitemap/navigation icons**, not the
header logo — don't over-apply it.

**Owner decision (received): support both** — upload a new image (via
`toolboxAPI.fileSystem.selectPath` + `readBinary` → base64 → `webresourceset` with type 5/6/11) or
pick/peek an existing web resource. Validate dimensions against 156 × 48 and warn on mismatch, and
render the logo plus its `logoTooltip` in the preview header.

### 2.8 ✅ RESOLVED — the classic-look toggle is dropped

Requirement §31 and §52 ask for a classic-vs-modern toggle. Microsoft now states:

> "With the **2026 Wave 1** release, all users must use the **New Look**… Makers can't switch a
> model-driven app back to the classic look."

and the app-designer setting **"New look for model-driven apps"** is *"hidden and ignored with the
2026 Wave 1 release."* Furthermore, under the modern look **classic theming is not honoured at
all**, so a classic preview couldn't even reflect the theme being authored.

**Owner decision (received): the classic-look toggle is dropped from v1**, both in the main panel
and the Config Panel. Building a second full shell mock for a look users can no longer select, and
which ignores the theme anyway, is pure cost. `REQUIREMENTS.md` §Main Panel/§Config Panel has been
updated to remove it. An unthemed-vs-themed comparison remains an optional stretch idea (§5, Phase 7)
but is not required.

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

### 2.12 ✅ RESOLVED — Non-functional gaps in the requirements

- **Unsaved-changes protection** when switching theme file / connection / closing the tool.
- **Undo/redo** for theme edits — recommended, at minimum "reset to loaded values".
- **Presets** and **import/export** of the XML to/from disk via `toolboxAPI.fileSystem`.
- **Owner decision (received): no offline mode.** The tool requires an active Dataverse connection
  at all times — it does **not** need to work, or degrade to edit-and-export, with no connection.
  `REQUIREMENTS.md` §Config Panel states this explicitly.
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

### 2.14 ✅ Color extraction from a website (screenshot or URL)

`REQUIREMENTS.md` §Color Extraction From a Website asks for a "brand-from-the-web" flow: give the
tool a screenshot (or a site address) and get a proposed theme back. Analysis:

**The image route is fully feasible today, with no new dependency and no network access.**
`toolboxAPI.fileSystem.selectPath` + `readBinary` already power the logo upload (§2.7); the same
bytes can be decoded into a `<canvas>` / `OffscreenCanvas` and read back with `getImageData`.
Clipboard paste (`paste` event / `navigator.clipboard.read`) and drag & drop give two more free
entry points inside the renderer. A `data:` URI source keeps the canvas untainted, so
`getImageData` is allowed and no CSP exception is needed (§4.4 stays true).

**The URL route is the hard part: PPTB exposes no screenshot capability.** Confirmed by reading
`@pptb/types`: `toolboxAPI` has `fileSystem`, `settings`, `events`, `terminal`, `invocation` and
`utils` (`showNotification`, `copyToClipboard`, `getCurrentTheme`, `openInConnectionBrowser`) —
there is **no** headless-browser, page-capture or generic HTTP API. The options are:

| Option | Verdict |
| --- | --- |
| Render the site in an `<iframe>` and capture it | ❌ Impossible — `X-Frame-Options` / `frame-ancestors` block most sites, and cross-origin frames cannot be read back into a canvas anyway. |
| `fetch()` the HTML/CSS and mine the declared colours | ❌ Blocked by CORS and by PPTB's `connect-src` CSP; would also need a full CSS cascade evaluation to know which colours are actually *visible*. |
| Third-party screenshot API (e.g. a render service) | 🟡 Works, but needs `cspExceptions`, sends the user's URL (possibly an internal one) to a third party, and adds an API key/quota. **Only acceptable as an explicit, opt-in, off-by-default provider** (`REQUIREMENTS.md`: no third-party call without explicit opt-in). |
| `toolboxAPI.terminal` driving a locally installed browser in headless screenshot mode | 🟡 Possible (Edge/Chrome `--headless --screenshot`), but depends on a browser binary being present at a guessable path and on shell quoting. Phase 0-style spike, never the primary path. |
| **Assisted capture**: `utils.openInConnectionBrowser(url)` → user screenshots the page → pastes/drops it back into the tool | ✅ Zero dependencies, zero data leaving the machine, works everywhere. |

**Decision for v1: the URL field is always accepted, but it is resolved through the assisted
capture flow** (open + paste back), with the automatic providers (headless-browser spike, opt-in
screenshot service) kept behind a feature switch as Phase 7 stretch items. The UI must never
present the URL box as if a screenshot were guaranteed — it explains the two steps up front.

**Extraction algorithm (pure, testable, no dependency):**

1. Decode → downscale to a bounded working size (~200 px on the longest edge, `imageSmoothing`
   on) so extraction is O(constant) regardless of the screenshot size.
2. Optional crop: only the pixels inside the user-selected region are considered. A "header only"
   shortcut pre-selects the top ~15 % of the image, which is where brand colour usually lives.
3. Filter noise: drop fully/partially transparent pixels, near-white and near-black pixels, and
   very low-saturation pixels (configurable "ignore greys" toggle, on by default) — otherwise
   every site returns white + grey.
4. Quantise the remaining pixels in a **perceptually uniform space** (convert to OKLab/CIELAB;
   `brandRamp.ts` already has the RGB/HSL conversions to build on) with median-cut or a small
   fixed-iteration k-means. Deterministic seeding — the same image must always give the same
   palette, because the unit tests depend on it.
5. Rank clusters by weight (pixel share) × saturation bonus, merge clusters closer than a ΔE
   threshold, return the top N (default 6) candidates as HEX + coverage %.

**Role mapping (the part that makes it a *theme*, not a palette):**

- `basePaletteColor` ← the most saturated high-coverage candidate; the 16 slots then come from the
  existing `brandRamp.ts` generator, so nothing new is invented downstream.
- `AppHeaderColors.background` ← the dominant colour of the top band of the screenshot.
- `AppHeaderColors.foreground` ← chosen between the candidates (and, failing that, black/white) by
  running the existing `contrast.ts` against the picked background; hover/pressed/selected states
  are derived as they already are in `tokenMap.ts`.
- Palette slot overrides are **not** auto-filled by default — the ramp is the documented mechanism,
  and force-fitting screenshot colours into 16 slots produces incoherent ramps. Offer it as an
  explicit "also override the closest slots" checkbox.
- Every suggestion is editable before it is applied, and each proposed pair shows its live contrast
  ratio with the §2.11 warnings.

**Integration constraints:**

- Applying the result must be **one** reducer action (a `replace`-style patch), so the existing
  undo/redo (§2.12) reverts the whole extraction in a single step.
- The dialog is a Fluent v9 portal surface → it must be re-wrapped in the provider per §2.10 if it
  shows any themed preview.
- The imported screenshot is working data only: it is never uploaded to Dataverse and never stored
  in `toolboxAPI.settings` (it can be several MB); only the extracted colours may be remembered.
- Large images must be guarded (reject > ~20 MB / > 8000 px, downscale before analysis) so a 4K
  screenshot cannot freeze the renderer; run the analysis off the paint path (async chunks or a
  worker) and show progress.


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
    colorExtraction.ts         # ImageData -> ranked colour candidates (quantiser, §2.14)
    colorRoles.ts              # candidates -> proposed ThemeModel patch (contrast-checked, §2.14)
  state/
    ThemeContext.tsx           # theme state + undo/redo + dirty tracking
    ConfigContext.tsx          # connection, solution, web resource, scope
  services/
    webResources.ts            # list / read / create / update / publish (dataverseAPI)
    themeScope.ts              # environment vs app assignment (+ deep-link fallback)
    logo.ts                    # logo web resource read/upload
    imageImport.ts             # file / paste / drag&drop -> decoded ImageData (§2.14)
    siteCapture.ts             # URL validation + assisted-capture flow (§2.14)
  components/
    config/                    # ConfigPanel: solution, theme file, logo, scope
    theme/                     # ThemePanel: grouped editors, color picker, contrast
      ColorFromWebDialog.tsx # extraction wizard: source -> image -> palette -> roles (§2.14)
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

Colour extraction (§2.14) is tested the same way: `colorExtraction.ts` and `colorRoles.ts` take a
plain `{ width, height, data: Uint8ClampedArray }`, so tests build synthetic images in memory (flat
blocks, a "header band + white body" layout, an anti-aliased edge, a fully transparent image) and
assert the ranked candidates and the proposed patch. The quantiser must be **deterministic** for
this to hold. Decoding, clipboard and drag & drop stay in `services/` and are exercised manually.

### 4.6 Extracting colours from an image (§2.14)

No new dependency: decoding is `Image`/`createImageBitmap` from a `data:` URI (the same base64 the
logo path already produces), sampling is `canvas.getImageData`, and the quantiser is our own code
sitting next to `brandRamp.ts`, whose colour-space helpers it reuses. Rejected alternatives:
`color-thief`/`vibrant.js` (extra bundle weight and a non-Microsoft runtime dependency for ~150
lines of maths), and any server-side extraction.

Design points that matter:

- Work on a **bounded downscaled copy** (~200 px longest edge) — analysis cost must not depend on
  the screenshot's resolution.
- Quantise in a perceptually uniform space, not raw RGB, or the candidates cluster badly on
  gradients and photos.
- Keep the *whole* pipeline pure and synchronous over an `ImageData`-shaped input; anything async
  (decoding, file/clipboard access) belongs to `services/imageImport.ts`.
- The URL box lives in the same wizard step as the file/paste inputs, but it is wired to
  `services/siteCapture.ts`, which validates the URL (`http:`/`https:` only — the same restriction
  `openInConnectionBrowser` enforces — no `file:`/`javascript:`, no credentials in the URL) and then
  runs the assisted-capture flow (§2.14). Automatic providers stay behind an off-by-default switch.

---

## 5. Phased delivery

Each phase ends with `npm run build`, `npx pptb-validate --skip-url-checks`, and a manual load in
PPTB via `npm run dev-watch` + Load Local Tool.

### Phase 0 — Spikes (blocking, do first)
- Resolve §2.4: discover at runtime whether the settings tables are readable/writable through
  `dataverseAPI`, and resolve the two setting definitions by display name. Record findings here.
- Resolve §2.5: can `dataverseAPI` send `MSCRM.SolutionUniqueName`? If not, validate the
  `AddSolutionComponent` (ComponentType 61) route — this must work, since there is no
  default-solution fallback (§2.5, owner decision).
- Verify Fluent `ColorPicker` stability in the pinned version (§4.3) and decide the ramp-generator
  approach (§4.2).
- Add one **real exported theme web resource** to `docs/samples/` to close the residual §2.2 gap.
- ~~Get owner decisions on §2.1, §2.7 and §2.8~~ — **done**, see §2.1/§2.4/§2.5/§2.7/§2.8/§2.12
  and the record in §7.

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

**Implemented.** Notes worth recording:

- The preview nests its own `FluentProvider` (plus an `IdPrefixProvider`) as decided in §2.10; the
  tool's chrome keeps following the PPTB host theme.
- `tokenMap` now also resolves the **app-header colours** (the platform only requires `background`;
  the other seven are calculated from it) and the **app font**. The font is written into the
  nested theme's `fontFamilyBase`, not only onto the wrapper element, so the Fluent controls inside
  the preview pick it up too.
- The brand ramp is now anchored on the **seed's own lightness**. The fixed lightness table used in
  Phase 2 made `darker10` come out *lighter* than a dark `primary`, which painted links, hover
  states and the primary button visibly wrong in the preview.
- Elements the theme actually repaints carry a `data-themed` attribute, which is what the
  "highlight themed areas" overlay outlines — it keeps the overlay honest about §2.3.

### Phase 4 — Dataverse integration (Config Panel)
- **Solution picker (`getSolutions`) is mandatory** — the user must always choose a target solution
  before saving; there is no default-solution fallback (§2.5). Web resource picker (XML web
  resources, `webresourcetype` 4, managed detection).
- Load an existing theme; create a new one; save with a pre-save XML diff; publish (`PublishXml`
  targeted, or `publishCustomizations()`), with an explicit confirmation that publishing affects
  the whole environment.
- Scope assignment (environment vs app) per the Phase 0 findings, with the documented deep-link
  fallback (§2.4, approved); warn when both **Custom theme definition** and **Override app header
  color** are set.
- Logo: browse an existing image web resource **or** upload a new one (types 5/6/11), validate
  against 156 × 48, render it in the preview.
- Unsaved-changes guard. No offline mode: the tool requires an active connection (§2.12).

**Implemented.** Notes worth recording:

- `services/webResources.ts` owns every `webresourceset` call. As anticipated in §2.5, PPTB's
  `dataverseAPI.create` takes no request headers, so `MSCRM.SolutionUniqueName` is **not** used:
  the web resource is created (or updated) and then attached to the chosen solution with
  `AddSolutionComponent` (ComponentType 61). A failure there surfaces as an error — the tool never
  silently leaves the web resource in the default solution.
- Managed web resources are detected through `ismanaged` and blocked from being overwritten, with
  "save as a new web resource" as the way out.
- Saving always goes through a dialog showing an LCS **line diff** of the stored XML against the
  XML about to be written (`model/xmlDiff.ts`), so anything the UI can't edit but the round trip
  preserves is visible before the write. The Theme Panel additionally lists those preserved
  attributes in a banner (§2.6).
- Publishing is offered on every save (required after an update) with the environment-wide impact
  spelled out; the targeted `PublishXml` payload is used, not `PublishAllXml`.
- Scope assignment (`services/themeScope.ts`) resolves the two setting definitions **at runtime by
  display name** and never hardcodes ids. When they can't be resolved or written, the dialog falls
  back to the approved maker-portal route: it shows the unique name to paste, a copy button, the
  exact "Add existing → More → Setting" steps and an "Open the solution" deep link through
  `toolboxAPI.utils.openInConnectionBrowser` (§2.4). It also reads the *other* theme setting and
  warns when both are configured.
- The logo is resolved from the theme's `logoWebResource` name and rendered in the preview header;
  a locally picked image is shown immediately, before the upload completes, and its size is
  checked against 156 × 48.
- The solution choice is remembered between sessions through `toolboxAPI.settings`
  (`last.solutionUniqueName`), as are the preview tab and zoom (§2.12).

### Phase 5 — Polish & release
- `toolboxAPI.settings` persistence, keyboard accessibility pass on the tool's own UI,
  notification/error-message review against PPTB conventions, README with screenshots,
  `pptb-validate` clean, version bump + publish checklist.

### Phase 6 — Colour extraction from a website (§2.14)

Self-contained feature, additive to everything above. Build it in this order:

1. **`model/colorExtraction.ts` + tests (no UI).** `extractPalette(imageData, options)` →
   downscale-aware sampling, transparency/near-white/near-black/low-saturation filtering,
   perceptual quantisation, ΔE merge, ranking → `{ hex, coverage, saturation }[]`. Options cover
   the crop rectangle, candidate count, "ignore greys" and the filter thresholds. Deterministic.
2. **`model/colorRoles.ts` + tests.** `proposeTheme(candidates, headerCandidates, currentModel)` →
   a partial `ThemeModel` (seed, `AppHeaderColors.background`/`foreground`, optional slot
   overrides) plus, per suggestion, the contrast ratio from `contrast.ts` and a
   pass/fail/needs-attention flag. Never mutates the current model.
3. **`services/imageImport.ts`.** Three sources into one `LoadedImage { dataUri, imageData,
   width, height }`: `fileSystem.selectPath` + `readBinary` (reuse the base64 helper and the image
   MIME/type table from `services/webResources.ts`), clipboard paste, drag & drop. Enforce the
   size/dimension guards, reject non-images with a readable message.
4. **`services/siteCapture.ts`.** URL normalisation/validation, then
   `utils.openInConnectionBrowser(url)` and the instructions for pasting the screenshot back.
   Structured so an automatic provider can be slotted in later behind the feature switch without
   touching the wizard.
5. **`components/theme/ColorFromWebDialog.tsx`.** A Fluent v9 `Dialog` wizard, launched from a
   "Get colors from a website" button in the Palette section of the Theme Panel:
   - *Step 1 — Source*: URL box (with the two-step explanation) or image drop zone / browse /
     paste.
   - *Step 2 — Image*: the screenshot with a draggable crop rectangle, a "header only" shortcut,
     an eyedropper that reads a single pixel, and the "ignore greys"/candidate-count controls.
   - *Step 3 — Colors & roles*: the ranked swatches with coverage %, each assignable to a role;
     the proposed values are editable with the existing `ColorField`, each pair showing its
     contrast readout and §2.11 warnings; a live thumbnail of the preview header.
   - *Apply* dispatches **one** action so undo reverts the whole extraction; *Cancel* changes
     nothing. The dialog nests the provider per §2.10.
6. **Wiring**: a single `applyExtractedColors` reducer action (patch semantics over the current
   model, no full replace of unrelated fields), remembering only the last used options in
   `toolboxAPI.settings` (`colorExtraction.*`) — never the image.
7. Docs: README section + a note in `REQUIREMENTS.md` if the flow deviates.

**Implemented.** Notes worth recording:

- `model/colorExtraction.ts` samples the image on a bounded grid (~200 steps on the longest edge),
  filters transparent / near-white / near-black / near-grey pixels, buckets the rest at 3 bits per
  channel and merges the buckets by **OKLab** distance. The merge walks the buckets in a
  count-then-key order, so the ranked candidates are deterministic — which is what the synthetic
  image tests assert.
- Ranking is `coverage × (0.5 + saturation)`: coverage still dominates (a brand band should win
  over a logo pixel), the saturation bonus only breaks the tie between comparable areas. The
  *seed* choice in `colorRoles.ts` is the opposite trade-off — it prefers saturation, because a
  large muted band makes a poor palette seed.
- `colorRoles.ts` picks the header foreground from black/white **and** the extracted candidates,
  keeping the best contrast, so the proposed pair is never worse than the platform default.
- `services/imageImport.ts` downscales to a 1200 px working copy on import (on top of the
  extractor's own sampling) and enforces the 20 MB / 8000 px guards. SVG and ICO are excluded:
  neither has a dependable raster size to analyse.
- The URL route is the assisted capture decided above; `services/siteCapture.ts` normalises the
  address, accepts only `http:`/`https:` and rejects embedded credentials.
- Applying is the single `applyExtractedColors` reducer action. It patches only the fields the
  wizard proposed, and it ignores `basePaletteColor`/slot overrides on an `appHeaderColorsOnly`
  document, where they have no meaning.

### Phase 7 — Stretch
- Optional unthemed-vs-themed side-by-side comparison, Wave 2
  header/navigation preview variant, per-token "where is this used?" hints.
- Automatic website capture for §2.14, behind an off-by-default switch: the local-headless-browser
  spike (`toolboxAPI.terminal` + an installed Edge/Chrome) and/or an opt-in third-party screenshot
  provider (needs `cspExceptions`, an explicit consent step and a stored API key).
- Extract a logo candidate from the same screenshot, and derive `font` suggestions from the
  captured page.

---

## 6. Risks

| Risk | Impact | Mitigation |
| --- | --- | --- |
| Settings tables/columns are undocumented by Microsoft and may change | Scope assignment breaks | Runtime discovery, never hardcode ids; documented maker-portal fallback (approved) |
| `dataverseAPI` can't send `MSCRM.SolutionUniqueName` | `AddSolutionComponent` route must work, since there is no default-solution fallback | Phase 0 spike; if neither route works, block save with a clear error (§2.5) |
| Ramp generation doesn't match the platform exactly | Preview colours drift from reality | Label the ramp as an approximation; expose the 16 slot overrides for exact control |
| MDA shell keeps changing (Wave 2, future waves) | Preview goes stale | Reframe as approximation (§2.1); revisit each release wave |
| Publishing affects the whole environment | User impact | Explicit confirmation dialog + warning copy |
| Round-trip loses unknown attributes | Data loss in customer themes | Preserve unknown nodes + pre-save diff |
| Custom `font` not installed locally | WYSIWYG silently lies | Detect and warn; curated web-safe list |
| Layout too cramped in a PPTB tab | Unusable | Collapsible panels + zoom, min-width target |
| No offline mode | Tool unusable without a connection | Accepted trade-off (§2.12, owner decision) |
| No screenshot capability in PPTB (§2.14) | The "from URL" promise can't be fully automated | Assisted capture (open in browser → paste back) as the v1 path, honest UI copy, automatic providers only as opt-in stretch |
| Extracted palette doesn't match the site's perceived brand | Users distrust the feature | Crop/header-only selection, eyedropper override, every suggestion editable before it is applied |
| Extraction produces low-contrast header pairs | Inaccessible themes (§2.11) | Contrast readouts and warnings on each proposal; auto-pick the foreground by contrast |
| Large screenshots block the renderer | Tool freezes | Size/dimension guards + bounded downscale before analysis, work off the paint path |
| A third-party screenshot service would receive internal URLs | Data leak | Off by default, explicit opt-in only, never the v1 path |

---

## 7. Decisions received from the tool owner

The six open questions below have been answered by the tool owner; the plan and
`REQUIREMENTS.md` have been updated accordingly (see the "Owner decision (received)" notes in
§2.1–§2.12).

1. **Accept** "high-fidelity approximation" instead of "exact replica", with **Wave 1** as the
   preview target (§2.1).
2. **Drop the classic-look toggle** entirely — no themed/unthemed replacement is required for v1
   (§2.8).
3. The tool **must support both**: uploading a new logo web resource, or picking/peeking an
   existing one (§2.7).
4. The **solution picker is in scope and mandatory**; there is **no** default-solution fallback —
   saving must be blocked, not silently redirected to the default solution, if the target solution
   can't be honoured (§2.5).
5. **Yes** — the maker-portal deep-link fallback is acceptable for scope assignment when the API
   path is unavailable (§2.4).
6. **No** — the tool must **not** be usable with no active connection; an active Dataverse
   connection is required at all times (§2.12).
