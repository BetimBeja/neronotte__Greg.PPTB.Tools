# Theme Manager — Implementation Plan

Companion document to [`REQUIREMENTS.md`](./REQUIREMENTS.md).
It records (1) the open questions and risks found while analysing the requirements and
(2) a phased plan to build the tool.

Status: **draft for review**. Sections marked 🔴 need a decision from the tool owner before
the corresponding phase starts.

---

## 1. Context: where the project stands today

`src/Greg.PPTB.ThemeManager` is currently the unmodified `yo pptb` React scaffold:

| Item | State |
| --- | --- |
| Build | Vite + React 18 + TypeScript, IIFE single-bundle output (PPTB-compatible) — keep as is |
| UI kit | `@fluentui/react-components` v9 (Fluent 2) already a dependency — the right choice, see §4.2 |
| Source | Demo components only (`ConnectionStatus`, `DataverseAPIDemo`, `EventLog`, `ToolboxAPIDemo`) — all to be removed |
| Manifest | `package.json` has `configurations.repository` / `readmeUrl`; no `cspExceptions`, no `pptb.config.json` |
| Tests | None, no test runner configured |
| Docs | `README.md` is still the generator boilerplate |

So this is a greenfield implementation inside an already-correct build shell. Nothing in the
existing Vite/HTML/bundling setup should be re-engineered.

---

## 2. Requirements analysis — issues & topics to discuss

### 2.1 🔴 "EXACT REPLICA" of the model-driven app UI is not an achievable acceptance criterion

`REQUIREMENTS.md` §Main Panel asks for an *exact replica* of the MDA shell. Problems:

- The real shell is a closed, continuously-changing product surface. Any pixel-exact copy is
  stale within one Microsoft release wave and turns into permanent maintenance debt.
- Microsoft branding (the waffle, the "Dynamics 365" wordmark, product icons) is trademarked
  and must **not** be reproduced. The mock must use neutral placeholder branding
  (e.g. "Contoso" / a generic app name) and Fluent icons only.

**Proposal:** restate the requirement as *"a high-fidelity, recognisable approximation of the
MDA shell, built from Fluent 2 primitives, faithful enough that a theme change reads the same
way it will in the real app"*. Define acceptance as a visual comparison against
`sample01.png` reviewed by the tool owner, not pixel diffing.

### 2.2 🔴 The theme XML schema must be transcribed from a real artefact, not from memory

The whole tool hinges on the *Custom theme XML resource* format
([overview](https://learn.microsoft.com/en-us/power-apps/maker/model-driven-apps/modern-theme-overrides#overview-of-the-custom-theme-xml-resource),
[example](https://learn.microsoft.com/en-us/power-apps/maker/model-driven-apps/modern-theme-overrides#example-xml-for-a-modern-theme)).
Before writing any parser/serialiser we need, checked into the repo under `docs/samples/`:

- the verbatim example XML from the docs page;
- at least one real theme web resource exported from a live environment.

Open points to settle from those artefacts:

- exact root/element/attribute names and casing, and whether a namespace is required;
- the full list of overridable tokens, which are mandatory vs optional, and their defaults;
- how the Fluent 2 brand ramp is expressed (single brand colour vs. the full 16-shade ramp);
- accepted colour notations (`#rgb`, `#rrggbb`, `#rrggbbaa`, named colours?);
- whether unknown/extra elements are tolerated by the platform (drives round-trip strategy, §2.6).

Until this is verified, treat every token list in this plan as a placeholder.

### 2.3 🔴 Scope of the theme override vs. what the preview can honestly show

The modern theme override deliberately exposes only a subset of the app's appearance
(brand ramp + a handful of chrome tokens). The preview must not imply that everything on
screen is themeable. **Decision needed:** add a "highlight themed areas" toggle that outlines
the regions actually driven by the current theme, so users don't chase non-overridable pixels.

### 2.4 🔴 Environment-level vs. app-level configuration — mechanism unknown

The Config Panel must let the user choose "whole environment" or "a specific app". These are
two different platform mechanisms and both must be spiked before Phase 4:

- **App level:** which column on `appmodule` (or which app-designer setting) points at the
  theme web resource, and whether it is writable through the Web API.
- **Environment level:** which `organization` column / setting holds the default theme.
- Whether either requires publishing, an app republish, or a new app version.

If the app-level write turns out not to be supported through the Web API, the fallback is:
the tool creates/updates the web resource and tells the user to select it in the app designer
(with a deep link via `toolboxAPI.utils.openInConnectionBrowser`). This fallback must be
agreed up front because it changes the value proposition.

### 2.5 Web resource writes need solution context and publishing

Creating or updating a `webresource` record without a solution context lands it in the
default solution, which is a real problem for ALM-conscious customers. The plan therefore:

- adds a **solution picker** to the Config Panel (`dataverseAPI.getSolutions`, unmanaged only);
- writes the web resource into the chosen solution (via the `MSCRM.SolutionUniqueName` header
  if `dataverseAPI` can pass custom headers — **to be verified**; otherwise document the
  limitation and default-solution behaviour explicitly in the UI);
- always calls `dataverseAPI.publishCustomizations()` after a write, and warns the user that
  publishing affects everyone in the environment.

Also note: `webresource` content is base64, `webresourcetype` = XML for the theme and
PNG/JPG/SVG for the logo; managed web resources cannot be updated (detect `ismanaged` and
block with a clear message).

### 2.6 Round-trip fidelity of existing themes

If a user opens an existing theme web resource that contains tokens the tool doesn't yet
model, naive re-serialisation silently deletes them. **Plan:** keep the parsed DOM of the
loaded file and re-emit unknown nodes untouched ("preserve unknown tokens"), and show a
non-blocking banner listing what the UI can't edit. Always show a diff (old vs new XML)
before saving.

### 2.7 Logo web resource — under-specified

The requirement says "the name of the webresource that contains (or will contain) the logo
image". Open questions: is the tool expected to *upload* an image file (via
`toolboxAPI.fileSystem.selectPath` + `readBinary`) or only to reference an existing one?
Which formats/dimensions does the platform accept? Where does the logo actually surface
(header only)? **Proposal:** support both browse-existing and upload-new, restrict to
PNG/JPG/SVG, warn above a size threshold, and render it in the preview header.

### 2.8 "Classic vs modern look" toggle is listed twice

It appears both in §Main Panel and §Config Panel. Treat it as one single piece of state that
lives in the Config Panel and drives the Main Panel. Also decide 🔴 how deep the *classic*
rendering must go — a faithful classic shell is essentially a second full mock. Recommendation:
implement the modern shell first and ship the classic shell as a Phase 6 stretch item, since
modern theme overrides only apply to the modern look anyway.

### 2.9 Layout: theme panel + config panel + preview in a PPTB tool tab

PPTB tools run in a constrained `BrowserView` inside a tab, often narrower than a real
browser window. A fixed 3-region layout will be cramped. **Proposal:** collapsible right
panel, config panel as a compact top bar, preview area with a zoom/scale control
(50 %–100 %) and a horizontal scroll fallback; a minimum supported width of ~1100 px.

### 2.10 Style isolation between PPTB's own theme and the previewed theme

The tool's chrome follows the PPTB host theme (`toolboxAPI.utils.getCurrentTheme()`), while
the preview must render an arbitrary user-defined theme. Nesting a second `FluentProvider`
around the preview handles Fluent tokens, but not global CSS. **Decision point:** nested
`FluentProvider` (simpler, chosen default) vs. rendering the preview in an `<iframe>` for
hard isolation (heavier, needs an extra Fluent render root). Start with nesting; revisit only
if bleed-through appears.

### 2.11 Accessibility of the produced theme

A WYSIWYG colour tool will happily let users build unreadable themes. Cheap, high-value
addition: live WCAG contrast checks on the key foreground/background pairs, shown as
inline warnings in the Theme Panel. Recommended as in-scope.

### 2.12 Non-functional gaps in the requirements

Not mentioned in `REQUIREMENTS.md`, need a decision:

- **Unsaved-changes protection** when switching theme file / connection / closing the tool.
- **Undo/redo** for theme edits (users will experiment heavily) — recommended, at least
  a "reset to loaded values" action.
- **Presets** (a few starter palettes) and **import/export** of the XML to/from disk via
  `toolboxAPI.fileSystem` — cheap and very useful for offline work.
- **Working without a connection**: the preview and theme editing don't need Dataverse.
  The tool should degrade gracefully (edit + export XML) when no connection is active.
- **Persisted preferences** via `toolboxAPI.settings` with namespaced keys
  (`ui.previewTab`, `ui.lookMode`, `last.solutionId`, …) — never transient UI state.
- **Localisation**: single-language (en) for v1 unless stated otherwise.

### 2.13 Things explicitly out of scope (proposed)

Classic `theme` table records (the legacy MDA theme entity), Power Apps *canvas* theming,
Power Pages theming, per-user themes, and any real data being rendered in the mock
(the preview is 100 % static sample data, per requirement §29).

---

## 3. Target architecture

```
src/
  main.tsx                     # entry, /// <reference types="@pptb/types" />
  App.tsx                      # shell layout: config bar / preview / theme panel
  model/
    theme.ts                   # ThemeModel: normalised, UI-friendly theme state
    themeXml.ts                # parse(xml) -> ThemeModel, serialize(model, originalDom) -> xml
    tokenMap.ts                # ThemeModel -> Fluent v9 Theme (brand ramp + overrides)
    brandRamp.ts               # single brand colour -> 16-shade ramp
    defaults.ts                # platform defaults + starter presets
  state/
    ThemeContext.tsx           # theme state + undo/redo + dirty tracking
    ConfigContext.tsx          # connection, solution, web resource, scope, look mode
  services/
    webResources.ts            # list / read / create / update / publish (dataverseAPI)
    themeTarget.ts             # apply theme at environment or app scope
    logo.ts                    # logo web resource read/upload
  components/
    config/                    # ConfigPanel: file picker, logo, scope, look toggle
    theme/                     # ThemePanel: grouped token editors, color picker, contrast
    preview/
      PreviewFrame.tsx         # nested FluentProvider + zoom + tab switch
      shell/                   # Header, NavBar, CommandBar (shared by both tabs)
      GridPreview.tsx          # view tab: view selector, search, sample grid
      FormPreview.tsx          # form tab: tabs/sections + one control per column type
      classic/                 # (phase 6) classic-look variants
  hooks/                       # useToolboxTheme, useDirtyGuard, ...
```

Principles:

- **One source of truth** — `ThemeModel`. The XML and the Fluent theme are both *projections*
  of it; the preview never reads XML.
- **Pure, testable core** — `themeXml`, `tokenMap`, `brandRamp` are dependency-free pure
  modules and are where the unit tests go.
- **Dataverse only at the edges** — everything in `services/`, wrapped in try/catch, errors
  surfaced through `toolboxAPI.utils.showNotification`; no hand-rolled fetch/bearer tokens.
- **Live preview with no manual refresh** (requirement §43) is a natural consequence of
  React state + `useMemo` over `tokenMap`; debounce colour-picker drags (~50 ms) to keep it smooth.

---

## 4. Key technical decisions

### 4.1 Theme XML handling

`DOMParser`/`XMLSerializer` (built into the runtime — no new dependency). Keep the parsed
document for unknown-node preservation (§2.6). Validate on load and report malformed files
with a readable message rather than throwing.

### 4.2 Mapping the theme to the preview

Build the preview's Fluent theme with `createLightTheme(brandVariants)` /
`createDarkTheme(...)` from `@fluentui/react-components`, then spread explicit token
overrides on top for the chrome colours the theme XML controls. This reuses the same brand-ramp
concept the platform uses, so the preview is structurally right even where it isn't pixel-right.

If the theme XML only carries a single brand colour, a ramp generator is needed. Prefer
implementing a small local generator in `brandRamp.ts` over adding
`@fluentui/react-theme-designer` (extra dependency, heavier bundle) — decide after §2.2 is answered.

### 4.3 Colour picker

Fluent v9 ships `ColorPicker` (`@fluentui/react-components`, currently preview/unstable in
some releases — verify availability in the pinned `^9.72.7`). Use it if stable; otherwise use
a native `<input type="color">` plus a validated hex text field. **No new colour-picker
dependency unless both options fail.** Every colour must be editable by typing an HTML colour
value (requirement §42), with inline validation.

### 4.4 Manifest / CSP

No external network calls are needed: Dataverse goes through `dataverseAPI`, the logo is
rendered from a base64 `data:` URI (already allowed by the default `img-src`). **The tool
should ship with no `cspExceptions`.** If a future feature needs one, it must be least-privilege
with a filled-in `exceptionReason`. No `pptb.config.json` unless inter-tool invocation or
agent integration is added later (both out of scope for v1).

### 4.5 Testing

No test runner exists today. Add **Vitest** (dev dependency only) covering the pure core:
XML parse → model → serialise round-trip (including unknown-node preservation), colour
parsing/validation, brand-ramp generation, and contrast calculation. UI/preview correctness
stays manual (visual review against `sample01.png`). Keep `tsc` + `pptb-validate` in the loop.

---

## 5. Phased delivery

Each phase should end with `npm run build`, `npx pptb-validate --skip-url-checks`, and a
manual load in PPTB via `npm run dev-watch` + Load Local Tool.

### Phase 0 — Spikes & artefacts (blocking, do first)
- Capture the docs example XML and a real exported theme web resource into `docs/samples/`.
- Answer §2.2 (schema), §2.4 (environment vs app mechanism), §2.5 (solution header support),
  §4.3 (`ColorPicker` availability).
- Record the answers back into this document.

### Phase 1 — Shell & scaffolding cleanup
- Remove the demo components; fix `index.html` title; rewrite `README.md` for the real tool.
- Add `/// <reference types="@pptb/types" />`, a single `toolboxAPI.events.on` registration,
  host-theme awareness, and an error boundary.
- Build the three-region responsive layout (collapsible theme panel, top config bar,
  preview area) with placeholder content.

### Phase 2 — Theme model & Theme Panel (works fully offline)
- `theme.ts`, `themeXml.ts`, `brandRamp.ts`, `defaults.ts` + unit tests.
- Theme Panel: grouped, collapsible token sections; colour picker + hex input; reset-per-token;
  contrast warnings (§2.11); undo/redo; presets; import/export XML from/to disk via
  `toolboxAPI.fileSystem`.

### Phase 3 — Preview (modern look)
- Shared shell: header (logo, app name, search, command icons, avatar), nav bar
  (collapsible, sample areas/groups), command bar.
- **View tab**: view selector dropdown, keyword filter, sample `account` grid with sortable-looking
  headers, checkboxes, link-styled primary column, paging footer.
- **Form tab**: form header, 2–3 tabs, sections, and one control per Dataverse column type
  (single line text, multiline/memo, option set, multi-select option set, two options,
  whole number, decimal/currency, float, date only, date & time, lookup, customer/polymorphic,
  email/URL/phone, file/image, status/status reason) — all read-only/non-functional.
- Wire `tokenMap` so every Theme Panel change repaints instantly; add the zoom control and
  the optional "highlight themed areas" overlay (§2.3).

### Phase 4 — Dataverse integration (Config Panel)
- Solution picker + web resource picker (list XML web resources, filter/search, detect managed).
- Load an existing theme into the model; create a new one; save with a pre-save XML diff;
  publish customisations; unsaved-changes guard.
- Apply scope: environment-wide or a selected app (per the Phase 0 findings, with the
  documented fallback if the write isn't supported).
- Logo: browse/upload the image web resource and render it in the preview.
- Graceful no-connection mode.

### Phase 5 — Polish & release
- `toolboxAPI.settings` persistence, keyboard accessibility pass on the tool's own UI,
  notification/error-message review against the PPTB conventions, final `README.md` with
  screenshots, `pptb-validate` clean, version bump + publish checklist.

### Phase 6 — Stretch
- Classic look preview (§2.8), dark-mode preview of the authored theme, side-by-side
  before/after comparison, per-token "where is this used?" hints.

---

## 6. Risks

| Risk | Impact | Mitigation |
| --- | --- | --- |
| Theme XML schema differs from assumptions | Rework of model + serialiser | Phase 0 spike blocks all downstream work |
| App-level theme not settable via Web API | Core requirement unmet | Documented deep-link fallback, agreed in Phase 0 |
| Preview drifts from the real MDA UI | Users mistrust the WYSIWYG | Reframe as approximation (§2.1); revisit each MS release wave |
| Publishing customisations affects the whole environment | User impact | Explicit confirmation dialog + warning copy |
| Round-trip loses unknown tokens | Data loss in customer themes | Preserve unknown nodes + pre-save diff |
| Layout too cramped in a PPTB tab | Unusable | Collapsible panels + zoom, min-width target |

---

## 7. Open questions for the tool owner

1. Do you accept "high-fidelity approximation" instead of "exact replica" (§2.1)?
2. Is the classic look a v1 requirement or a stretch goal (§2.8)?
3. Should the tool upload logo images, or only reference existing web resources (§2.7)?
4. Is the solution picker in scope for v1, and what should happen if solution-scoped writes
   aren't supported by `dataverseAPI` (§2.5)?
5. Are contrast/accessibility warnings wanted (§2.11)?
6. Must the tool be usable with no active connection (§2.12)?
