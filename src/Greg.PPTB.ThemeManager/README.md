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
│   │   └── preview/               # PreviewFrame: view/form preview tabs
│   ├── model/                     # ThemeModel, XML parse/serialize, brand ramp, contrast
│   ├── services/
│   │   └── themeFile.ts          # theme XML import/export via the PPTB filesystem API
│   ├── state/
│   │   ├── ThemeContext.tsx      # theme state provider + derived palette/preview theme
│   │   └── themeReducer.ts       # pure reducer: edits, undo/redo, dirty tracking
│   └── hooks/
│       └── useToolboxAPI.ts      # connection, host-theme and event helpers
├── dist/                         # build output
├── index.html
├── package.json
├── tsconfig.json
└── vite.config.ts
```

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
