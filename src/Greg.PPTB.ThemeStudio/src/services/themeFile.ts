import { parseThemeXml, serializeThemeModel, ThemeXmlParseError } from '../model/themeXml';
import type { ThemeModel } from '../model/theme';

/**
 * Import/export of theme XML through the PPTB filesystem API, so Phase 2 is
 * usable fully offline, before any Dataverse integration lands in Phase 4
 * (docs/IMPLEMENTATION_PLAN.md §5).
 */

const XML_FILTERS = [
    { name: 'Theme XML', extensions: ['xml'] },
    { name: 'All files', extensions: ['*'] },
];

/** Suggested file name for an exported theme, based on the document shape. */
export function defaultThemeFileName(model: ThemeModel): string {
    return model.kind === 'appHeaderColorsOnly' ? 'app-header-colors.xml' : 'custom-theme.xml';
}

/**
 * Prompts the user for a theme XML file and parses it.
 * Resolves to `undefined` when the user cancels the dialog.
 */
export async function importThemeFromFile(): Promise<ThemeModel | undefined> {
    const path = await window.toolboxAPI.fileSystem.selectPath({
        type: 'file',
        filters: XML_FILTERS,
        title: 'Select a theme XML file',
    });

    if (!path) {
        return undefined;
    }

    const xml = await window.toolboxAPI.fileSystem.readText(path);
    try {
        return parseThemeXml(xml);
    } catch (error) {
        if (error instanceof ThemeXmlParseError) {
            throw error;
        }
        throw new ThemeXmlParseError(`The file "${path}" couldn't be read as a theme: ${error instanceof Error ? error.message : String(error)}`);
    }
}

/**
 * Serialises the model and prompts the user for a save location.
 * Resolves to the saved path, or `undefined` when the user cancels.
 */
export async function exportThemeToFile(model: ThemeModel): Promise<string | undefined> {
    const xml = serializeThemeModel(model);
    const path = await window.toolboxAPI.fileSystem.saveFile(defaultThemeFileName(model), xml, XML_FILTERS);
    return path ?? undefined;
}
