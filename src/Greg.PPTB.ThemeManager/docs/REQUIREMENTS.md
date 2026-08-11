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

With a toggle in the **Config Panel**, allow also the user to select if he wants the classical look, or the modern refreshed look, as described here:

- https://learn.microsoft.com/en-us/power-apps/user/modern-fluent-design

## Theme Panel

In this panel the user must be able to configure all the characteristics of a custom theme, as described here:

- https://learn.microsoft.com/en-us/power-apps/maker/model-driven-apps/modern-theme-overrides#overview-of-the-custom-theme-xml-resource
- https://learn.microsoft.com/en-us/power-apps/maker/model-driven-apps/modern-theme-overrides#example-xml-for-a-modern-theme

Colors must be selectable via color picker or by inserting an HTML color value.
Any change on the theme defined in the theme panel must reflect in the main panel immediately (no manual refresh).

## Config Panel

In this panel the user can see/pick:

- a theme web resource file
- the name of the webresource that contains (or will contain) the logo image
- whether to configure the theme for the whole environment or for a specific app
- a toggle that allows the user to peek if he wants, in the main panel, to show the classical look, or the modern refreshed look, as described here:
  - https://learn.microsoft.com/en-us/power-apps/user/modern-fluent-design
