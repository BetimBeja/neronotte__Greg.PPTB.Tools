# Greg.PPTB.Tools

My own tools for [Power Platform ToolBox](https://www.powerplatformtoolbox.com/) (PPTB), the
Electron desktop app that hosts productivity add-ins for makers and developers working on the
Microsoft Power Platform / Dataverse ecosystem. Each tool lives in its own folder under `src/` as
an independent Vite/React/TypeScript project, buildable and publishable on its own — see
[`CLAUDE.md`](./CLAUDE.md) for the repo layout.

## Tools

### Theme Studio

[`src/Greg.PPTB.ThemeStudio`](./src/Greg.PPTB.ThemeStudio) — lets makers customize Model-Driven
App [modern themes](https://learn.microsoft.com/en-us/power-apps/maker/model-driven-apps/modern-theme-overrides)
with a WYSIWYG editor, instead of hand-editing theme XML and re-checking it against a live app.

**Main features**

- Live preview of the model-driven app shell (header, navbar, command bar) in both a grid view and
  a form view, repainting instantly as the theme is edited — no manual refresh.
- Full editor for the modern theme XML: palette, typography, logo and app header colors, with a
  color picker or raw HTML value input and WCAG contrast checks on header color pairs.
- **Get colors from a website**: derive the theme from a screenshot (file, clipboard paste or
  drag & drop) or from a URL via assisted capture, with dominant-color extraction, an eyedropper,
  region selection, and a single undoable apply step.
- Mandatory solution picker — the theme (and logo) web resource is always saved into an explicit
  solution, never a default one.
- Open, create, save (with an old-vs-new XML diff), publish, import/export to a local file, and
  assign the theme to the whole environment or to a single app.

**PPTB features used**

- `dataverseAPI` — query, create, retrieve, update and execute against Dataverse (solutions, web
  resources, app modules, organization/app settings), plus `publishCustomizations`.
- `toolboxAPI.connections` — reads the active connection and reacts to `connection:created` /
  `connection:updated` / `connection:deleted` events to keep the tool in sync with the host.
- `toolboxAPI.events` — subscribes to ToolBox events (connection changes, host theme) with a
  single registered handler.
- `toolboxAPI.fileSystem` — pick/read local image files and theme XML, and save theme XML exports.
- `toolboxAPI.settings` — persists user preferences (last solution, extraction options) across
  sessions.
- `toolboxAPI.utils` — shows notifications, reads the current host theme (light/dark) to match the
  tool's own chrome, and opens URLs in the connection's browser for assisted screenshot capture.
