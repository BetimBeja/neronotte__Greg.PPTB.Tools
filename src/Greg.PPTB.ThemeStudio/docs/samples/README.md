# Theme XML samples

Verbatim examples transcribed from the Microsoft Learn article
[Use modern themes in model-driven apps](https://learn.microsoft.com/en-us/power-apps/maker/model-driven-apps/modern-theme-overrides)
(docs source: `MicrosoftDocs/powerapps-docs` → `powerapps-docs/maker/model-driven-apps/modern-theme-overrides.md`,
`ms.date: 07/07/2026`).

These files are the reference fixtures for the XML parser/serialiser and its round-trip
unit tests. They must be kept byte-faithful to the documentation — do not "tidy" them.

| File | Shape | Used by which setting |
| --- | --- | --- |
| `custom-theme-basic.xml` | `<CustomTheme />`, generated palette | **Custom theme definition** |
| `custom-theme-slot-override.xml` | `<CustomTheme />` with one palette slot overridden | **Custom theme definition** |
| `custom-theme-with-header.xml` | `<CustomTheme>` wrapping `<AppHeaderColors />` | **Custom theme definition** |
| `app-header-colors-only.xml` | `<AppHeaderColors />` as the document root | **Override app header color** |

Still missing (see `../IMPLEMENTATION_PLAN.md` §2.2): a **real theme web resource exported from a
live environment**, to confirm XML declaration/namespace handling, attribute casing tolerance and
whether unknown attributes are rejected.
