import { DataverseOperationError } from './webResources';

/**
 * Theme **scope assignment**: pointing either the whole environment or a single
 * app at the theme web resource.
 *
 * Microsoft documents this only as a maker-UI flow through solution settings,
 * and publishes no entity reference for the tables involved, so **nothing here
 * is hardcoded from documentation**: the setting definitions are resolved at
 * runtime by display name and every call degrades gracefully to the approved
 * maker-portal deep link when the API path isn't available
 * (docs/IMPLEMENTATION_PLAN.md §2.4, owner decision §7.5).
 */

export type ThemeSettingKind = 'customTheme' | 'appHeaderColorsOnly';

/** Display names of the two theme settings, as shown in the maker portal. */
export const THEME_SETTING_DISPLAY_NAMES: Record<ThemeSettingKind, string> = {
    customTheme: 'Custom theme definition',
    appHeaderColorsOnly: 'Override app header color',
};

export interface SettingDefinitionRef {
    id: string;
    uniqueName: string;
    displayName: string;
}

/** What runtime discovery found in the connected environment. */
export interface ScopeCapabilities {
    /** True when the setting definition table could be read at all. */
    settingsReadable: boolean;
    /** The resolved definition per theme kind, when present in the environment. */
    definitions: Partial<Record<ThemeSettingKind, SettingDefinitionRef>>;
    /** Why the API path is unavailable, for display next to the fallback. */
    unavailableReason?: string;
}

export interface AppSummary {
    id: string;
    name: string;
    uniqueName: string;
}

/** Current value of a theme setting, as read back from the environment. */
export interface ScopeAssignment {
    kind: ThemeSettingKind;
    /** Environment-wide value, or `undefined` when unset. */
    environmentValue?: string;
    /** Per-app values, keyed by app id. */
    appValues: Record<string, string>;
}

function asString(value: unknown): string {
    return typeof value === 'string' ? value : String(value ?? '');
}

function describe(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
}

function matchesDisplayName(record: Record<string, unknown>, displayName: string): boolean {
    return asString(record.displayname).trim().toLowerCase() === displayName.toLowerCase();
}

/**
 * Probes the environment for the two theme setting definitions. Never throws:
 * a failure simply means the deep-link fallback has to be used.
 */
export async function discoverScopeCapabilities(): Promise<ScopeCapabilities> {
    try {
        const result = await window.dataverseAPI.queryData('settingdefinitions?$select=settingdefinitionid,uniquename,displayname&$top=500');
        const definitions: Partial<Record<ThemeSettingKind, SettingDefinitionRef>> = {};

        for (const kind of Object.keys(THEME_SETTING_DISPLAY_NAMES) as ThemeSettingKind[]) {
            const record = result.value.find((candidate) => matchesDisplayName(candidate, THEME_SETTING_DISPLAY_NAMES[kind]));
            if (record) {
                definitions[kind] = {
                    id: asString(record.settingdefinitionid),
                    uniqueName: asString(record.uniquename),
                    displayName: asString(record.displayname),
                };
            }
        }

        const missing = (Object.keys(THEME_SETTING_DISPLAY_NAMES) as ThemeSettingKind[]).filter((kind) => !definitions[kind]);

        return {
            settingsReadable: true,
            definitions,
            unavailableReason: missing.length
                ? `The environment has no setting definition named ${missing.map((kind) => `"${THEME_SETTING_DISPLAY_NAMES[kind]}"`).join(' or ')}.`
                : undefined,
        };
    } catch (error) {
        return {
            settingsReadable: false,
            definitions: {},
            unavailableReason: `The setting definitions could not be read from this environment (${describe(error)}).`,
        };
    }
}

/** Lists the model-driven apps a per-app scope can be assigned to. */
export async function listApps(): Promise<AppSummary[]> {
    try {
        const result = await window.dataverseAPI.queryData('appmodules?$select=appmoduleid,name,uniquename&$orderby=name&$top=250');
        return result.value.map((record) => ({
            id: asString(record.appmoduleid),
            name: asString(record.name) || asString(record.uniquename),
            uniqueName: asString(record.uniquename),
        }));
    } catch (error) {
        throw new DataverseOperationError(`Loading the app list failed: ${describe(error)}`, error);
    }
}

/** Reads the current environment-wide and per-app values of a theme setting. */
export async function readScopeAssignment(definition: SettingDefinitionRef, kind: ThemeSettingKind): Promise<ScopeAssignment> {
    const assignment: ScopeAssignment = { kind, appValues: {} };
    const filter = encodeURIComponent(`_settingdefinitionid_value eq ${definition.id}`);

    try {
        const organization = await window.dataverseAPI.queryData(`organizationsettings?$select=organizationsettingid,value&$filter=${filter}&$top=1`);
        const record = organization.value[0];
        if (record) {
            assignment.environmentValue = asString(record.value);
        }
    } catch {
        // Unreadable settings are indistinguishable from unset ones here; the
        // caller already knows whether the API path is available at all.
    }

    try {
        const apps = await window.dataverseAPI.queryData(`appsettings?$select=appsettingid,value,_appmoduleid_value&$filter=${filter}&$top=250`);
        for (const record of apps.value) {
            const appId = asString(record._appmoduleid_value);
            if (appId) {
                assignment.appValues[appId] = asString(record.value);
            }
        }
    } catch {
        // Same as above.
    }

    return assignment;
}

async function findExisting(entitySet: string, filter: string, idColumn: string): Promise<string | undefined> {
    const result = await window.dataverseAPI.queryData(`${entitySet}?$select=${idColumn}&$filter=${encodeURIComponent(filter)}&$top=1`);
    const record = result.value[0];
    return record ? asString(record[idColumn]) : undefined;
}

const navigationPropertyCache = new Map<string, string>();

/**
 * OData `@odata.bind` requires the exact, case-sensitive single-valued
 * navigation property name — which for these undocumented settings tables
 * doesn't necessarily match the lookup attribute's logical name. Resolving it
 * from relationship metadata avoids the "undeclared property" OData error
 * that a hardcoded guess (e.g. `SettingDefinitionId`) can trigger.
 */
async function resolveNavigationProperty(entityLogicalName: string, referencingAttribute: string): Promise<string> {
    const cacheKey = `${entityLogicalName}.${referencingAttribute}`;
    const cached = navigationPropertyCache.get(cacheKey);
    if (cached) {
        return cached;
    }

    const result = await window.dataverseAPI.getEntityRelatedMetadata(entityLogicalName, 'ManyToOneRelationships', [
        'ReferencingAttribute',
        'ReferencingEntityNavigationPropertyName',
    ]);
    const relationship = result.value.find(
        (candidate) => asString(candidate.ReferencingAttribute).toLowerCase() === referencingAttribute.toLowerCase(),
    );
    if (!relationship) {
        throw new Error(`No lookup relationship for "${referencingAttribute}" was found on "${entityLogicalName}".`);
    }

    const navigationProperty = asString(relationship.ReferencingEntityNavigationPropertyName);
    navigationPropertyCache.set(cacheKey, navigationProperty);
    return navigationProperty;
}

/**
 * Writes the environment-wide value of a theme setting (the web resource unique
 * name). Throws `DataverseOperationError` when the API path is unavailable so
 * the caller can offer the maker-portal fallback.
 */
export async function setEnvironmentScope(definition: SettingDefinitionRef, webResourceName: string): Promise<void> {
    try {
        const existingId = await findExisting('organizationsettings', `_settingdefinitionid_value eq ${definition.id}`, 'organizationsettingid');
        if (existingId) {
            await window.dataverseAPI.update('organizationsetting', existingId, { value: webResourceName });
            return;
        }
        const settingDefinitionNav = await resolveNavigationProperty('organizationsetting', 'settingdefinitionid');
        await window.dataverseAPI.create('organizationsetting', {
            value: webResourceName,
            [`${settingDefinitionNav}@odata.bind`]: `/settingdefinitions(${definition.id})`,
        });
    } catch (error) {
        throw new DataverseOperationError(`Assigning the theme to the environment failed: ${describe(error)}`, error);
    }
}

/** Writes the per-app value of a theme setting. */
export async function setAppScope(definition: SettingDefinitionRef, appId: string, webResourceName: string): Promise<void> {
    try {
        const filter = `_settingdefinitionid_value eq ${definition.id} and _appmoduleid_value eq ${appId}`;
        const existingId = await findExisting('appsettings', filter, 'appsettingid');
        if (existingId) {
            await window.dataverseAPI.update('appsetting', existingId, { value: webResourceName });
            return;
        }
        const [settingDefinitionNav, appModuleNav] = await Promise.all([
            resolveNavigationProperty('appsetting', 'settingdefinitionid'),
            resolveNavigationProperty('appsetting', 'appmoduleid'),
        ]);
        await window.dataverseAPI.create('appsetting', {
            value: webResourceName,
            [`${settingDefinitionNav}@odata.bind`]: `/settingdefinitions(${definition.id})`,
            [`${appModuleNav}@odata.bind`]: `/appmodules(${appId})`,
        });
    } catch (error) {
        throw new DataverseOperationError(`Assigning the theme to the app failed: ${describe(error)}`, error);
    }
}

/**
 * Approved fallback: open the solution in the maker portal so the user can add
 * the setting by hand, with the unique name to paste already on screen (§2.4).
 */
export async function openSolutionInMaker(connectionUrl: string, solutionId: string): Promise<void> {
    try {
        // `openInConnectionBrowser` only accepts absolute http(s) URLs; the
        // environment's own solution URL redirects to the maker portal page for
        // the solution, so no environment id has to be guessed here.
        const url = new URL(`/tools/solution/edit.aspx?id=${encodeURIComponent(solutionId)}`, connectionUrl);
        if (url.protocol !== 'https:' && url.protocol !== 'http:') {
            throw new Error('The connection URL is not an http(s) address.');
        }
        await window.toolboxAPI.utils.openInConnectionBrowser(url.toString());
    } catch (error) {
        throw new DataverseOperationError(`Opening the solution in the maker portal failed: ${describe(error)}`, error);
    }
}
