# Context

The current repo contains a set of [Power Platform Toolbox](https://docs.powerplatformtoolbox.com/tool-development) tools.
As of now there is one single tool, **Theme Studio**.

## Repo struture

Folders:

- `src`: contains a subfolder for each tool
    - `Greg.PPTB.<ToolName>`: specific folder for a given tool
        - `dist`: output folder for the tool, where the compiled tool is saved
        - `docs`: functional requirements, architectural guidelines, specifications for the tool
        - `src`: source code of the tool, as a vite/react/typescript project
- `test`: contains test code that is not shipped with the tool

## The tools

### Theme Studio

Allows to manage Model Driven App themes with a WYSIWYG user interface.
Also called ThemeStudio (formerly Theme Manager).
