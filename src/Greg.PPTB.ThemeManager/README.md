# Greg.PPTB.ThemeManager

A Power Platform Toolbox tool that lets makers customize Model-Driven App
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
greg-pptb-thememanager/
├── docs/                         # requirements, implementation plan, theme XML reference, samples
├── src/
│   ├── App.tsx                   # shell layout: config bar / preview / theme panel
│   ├── main.tsx                  # entry point
│   ├── index.css                 # global styling
│   ├── components/
│   │   ├── ErrorBoundary.tsx     # top-level error boundary
│   │   ├── config/                # ConfigPanel: solution, theme file, logo, scope
│   │   ├── theme/                 # ThemePanel: palette/typography/logo/header editors
│   │   └── preview/               # PreviewFrame: app shell replica, view/form preview tabs
│   │       └── shell/             # header, navigation and command bar shared by both tabs
│   ├── model/                     # ThemeModel, XML parse/serialize, brand ramp, contrast, XML diff
│   ├── services/
│   │   ├── themeFile.ts          # theme XML import/export via the PPTB filesystem API
│   │   ├── webResources.ts       # web resource list/read/create/update/publish + solution association
│   │   ├── solutions.ts          # solution picker source (unmanaged, visible solutions)
│   │   ├── themeScope.ts         # environment/app scope assignment + maker-portal fallback
│   │   └── logo.ts               # logo image pick/upload, size validation, data URI
│   ├── state/
│   │   ├── ThemeContext.tsx      # theme state provider + derived palette/preview theme
│   │   ├── ConfigContext.tsx     # connection, solution, theme web resource, logo
│   │   └── themeReducer.ts       # pure reducer: edits, undo/redo, dirty tracking
│   └── hooks/
│       └── useToolboxAPI.ts      # connection, host-theme and event helpers
├── dist/                         # build output
├── index.html
├── package.json
├── tsconfig.json
└── vite.config.ts
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
   resource, and optionally publishes it (publishing is required for updates to take effect and
   affects the whole environment).
5. **Apply theme**: assign the saved web resource to the whole environment or to a single app. Where
   the setting can't be written through the API, the dialog shows the unique name to paste and deep
   links into the solution in the maker portal.

## Installation

**Build the tool:**

```bash
npm run build
```

**Dev build with sourcemaps (watch mode):**

```bash
npm run dev-watch
```

**Run the unit tests:**

```bash
npm test
```

**Validate tool package:**

```bash
npm run validate
```

**Shrinkwrap package:**

```bash
npm run finalize-package
```

or;

```bash
npm shrinkwrap
```

**Publish new version:**

```bash
npm run publish-package
```

_Further tool development documentation is available @ https://docs.powerplatformtoolbox.com/tool-development_

## Usage in ToolBox

1. Build the tool using `npm run build`
2. Install the tool in ToolBox
3. Load and use the tool from the ToolBox interface

## License

MIT
