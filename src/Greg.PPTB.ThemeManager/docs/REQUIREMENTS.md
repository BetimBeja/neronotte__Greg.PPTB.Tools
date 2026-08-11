# REQUIREMENTS

This is a PowerPlatform Toolbox tool that allows users to customize Model Driven App themes with a WYSIWYG user experience.

The tool must present:

- A **main panel** showing the look & feel of a typical model driven app, in two tabs, one displaying a sample table grid, one displaying a sample form with the user controls for all column types (text, memo, lookup, optionset, date, ...)
- A **theme panel** on the right-side of the window where the user can configure the power app modern theme characteristics (https://learn.microsoft.com/en-us/power-apps/maker/model-driven-apps/modern-theme-overrides), and also the logo image to use.
- A **config panel** (on top of the main, or on the left of the main).

## Main Panel

The main panel must contain an EXACT REPLICA of a model driven app UI (see ./sample01.png for instance).

We need to simulate both views and forms, so we need 2 distinct "tabs" in this panel, one to show:

- header
- navbar
- commandbar
- a sample view (e.g. for the "account" table) with view selector and search capabilities.

The other must show:

- header
- navbar
- commandbar
- a sample form (e.g. for the "account" table) with a couple of tabs / sections, and a control for each type of field available in dataverse.

The view and form must not be functioning, the goal is just to show the look&feel of the app with the theme applied.

The main panel only ever shows the modern (Wave 1) look. The classic-look toggle has been dropped:
Microsoft mandates the modern look from the 2026 Wave 1 release, classic mode ignores custom themes
entirely, and simulating it would not reflect the theme being authored (see
[`IMPLEMENTATION_PLAN.md` §2.8](./IMPLEMENTATION_PLAN.md)).

## Theme Panel

In this panel the user must be able to configure all the characteristics of a custom theme, as described here:

- https://learn.microsoft.com/en-us/power-apps/maker/model-driven-apps/modern-theme-overrides#overview-of-the-custom-theme-xml-resource
- https://learn.microsoft.com/en-us/power-apps/maker/model-driven-apps/modern-theme-overrides#example-xml-for-a-modern-theme

Colors must be selectable via color picker or by inserting an HTML color value.
Any change on the theme defined in the theme panel must reflect in the main panel immediately (no manual refresh).

For the logo, the user must be able to either **upload a new webresource** (from a local image
file) or **peek an existing webresource** already present in the environment.

## Config Panel

In this panel the user can see/pick:

- a theme web resource file
- the name of the webresource that contains (or will contain) the logo image, either by uploading
  a new image or by picking an existing webresource
- the **solution** the theme (and, when created, the logo) belongs to — the solution picker is
  **mandatory**: there is no default-solution fallback, the user must always choose a solution
  explicitly before saving
- whether to configure the theme for the whole environment or for a specific app

An active Dataverse connection is **required** to use the tool: it does not support an
offline/no-connection mode.
