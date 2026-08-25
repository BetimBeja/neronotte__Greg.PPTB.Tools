# Theme Studio (by \_neronotte)

A **Power Platform Toolbox tool** that lets makers customize Model-Driven App
[modern themes](https://learn.microsoft.com/en-us/power-apps/maker/model-driven-apps/modern-theme-overrides)
with a WYSIWYG editor: a live preview of the app shell (grid and form views)
next to a panel for editing the theme XML (palette, typography, logo, app
header colors).

See [`docs/REQUIREMENTS.md`](./docs/REQUIREMENTS.md) and
[`docs/IMPLEMENTATION_PLAN.md`](./docs/IMPLEMENTATION_PLAN.md) for the full
requirements, design decisions and phased delivery plan. This tool is under
active development; see the plan for current status.

## Structure

```
greg-pptb-themestudio/
├── docs/                         # requirements, implementation plan, theme XML reference, samples
├── public/
│   └── icons/
├── src/
│   ├── App.tsx                   # shell layout: config bar / preview / theme panel
│   ├── main.tsx                  # entry point
│   ├── index.css                 # global styling
│   ├── components/
│   │   ├── ErrorBoundary.tsx      # top-level error boundary
│   │   ├── common/                # reusable UI primitives (e.g. BusyButton)
│   │   ├── config/                # solution/theme/scope dialogs and save flow
│   │   ├── theme/                 # palette/typography/logo/header editors
│   │   └── preview/               # app shell replica, form/grid previews
│   │       ├── modelDriven/       # Fluent-like input controls used in previews
│   │       └── shell/             # header, navigation and command bar
│   ├── model/                     # ThemeModel, XML parse/serialize, brand ramp, contrast, XML diff,
│   │                              # color extraction and role mapping
│   ├── services/
│   │   ├── dataverseCore.ts             # Dataverse HTTP/auth helpers
│   │   ├── dataverseSolutionService.ts  # visible unmanaged solutions
│   │   ├── dataverseWebResourceService.ts
│   │   ├── dataverseThemeScopeService.ts
│   │   ├── dataverseAppService.ts       # model-driven app retrieval for scope assignment
│   │   ├── themeFile.ts                 # local theme XML import/export
│   │   ├── webResources.ts              # web resource workflows + publish
│   │   ├── themeScope.ts                # environment/app scope assignment
│   │   ├── logo.ts                      # logo image pick/upload and validation
│   │   ├── imageImport.ts               # screenshot import (file/clipboard/drag & drop)
│   │   └── siteCapture.ts               # URL validation + assisted screenshot capture
│   ├── state/
│   │   ├── ThemeContext.tsx      # theme state provider + derived palette/preview theme
│   │   ├── ConfigContext.tsx     # connection, solution, theme web resource, logo
│   │   ├── PortalMountContext.tsx # dialog portal mount coordination
│   │   └── themeReducer.ts       # pure reducer: edits, undo/redo, dirty tracking
│   └── hooks/
│       └── useToolboxAPI.ts      # connection, host-theme and event helpers
├── dist/                         # build output
├── index.html
├── package.json
├── tsconfig.node.json
├── tsconfig.vitest.json
├── tsconfig.json
├── vite.config.ts
└── vitest.config.ts
```

## Using the tool

The tool requires an active Dataverse connection in Power Platform ToolBox.

1. **Pick a solution** in the config bar. This is mandatory: the theme web resource (and any logo
   uploaded with it) is always added to the solution you choose — there is no default-solution
   fallback.
2. **Open** an existing theme XML web resource, or start a **New** one. Managed web resources can
   be inspected but not overwritten.
3. Edit the theme in the right-hand panel — palette, typography, logo and app header colours — and
   watch the preview repaint live. Themes can also be imported from / exported to a local file.
4. **Save to Dataverse**: the pre-save dialog shows an old-vs-new XML diff, lets you name a new web
   resource, and optionally publishes it (enabled by default). Publishing affects the whole
   environment, and updates are only picked up after publish.
5. **Get colors from a website** (Palette section): derive the theme from an existing site instead
   of picking every colour by hand — see below.
6. **Apply theme**: assign the saved web resource to the whole environment or to a single app. Where
   the setting can't be written through the API, the dialog shows the unique name to paste and deep
   links into the solution in the maker portal.
7. When opening another theme or starting a new one while there are unsaved edits, the tool asks
   for confirmation before discarding changes.

### Getting the colors from a website

The **Get colors from a website** button in the Palette section opens a three-step wizard:

1. **Source** — type a site address and press _Open the site_, or browse for / paste (Ctrl+V) /
   drag & drop a screenshot. Power Platform ToolBox exposes no screenshot API, so a URL is
   resolved by _assisted capture_: the site opens in your browser, you take the screenshot and
   paste it back into the wizard. Nothing is uploaded and no third-party service is called.
2. **Image** — drag on the screenshot to analyse only a region (or use _Header only_), or click a
   single pixel to use its exact colour. Near-white, near-black and — unless you turn _Ignore
   greys_ off — near-grey pixels are treated as noise.
3. **Colors & roles** — the ranked colours are shown with their coverage and mapped onto the base
   palette colour and the app header background/foreground, with the live WCAG contrast readout.
   Everything is editable, and _Apply_ is a single undoable step. Palette slot overrides are only
   filled in when you explicitly ask for them.

The screenshot is working data only: it is never saved to Dataverse and never stored in the
ToolBox settings — only the extraction options (ignore greys and slot overrides) are remembered.

Current extraction rank shows up to 5 dominant colours.

## License

MIT
