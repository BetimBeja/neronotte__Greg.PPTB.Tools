import { DataverseOperationError, asString, describe } from './dataverseCore';

/**
 * Theme **scope assignment**: pointing either the whole environment or a single
 * app at the theme web resource.
 *
 * Microsoft documents this only as a maker-UI flow through solution settings,
 * and publishes no entity reference for the tables involved, so **nothing here
 * is hardcoded from documentation**: the setting definitions are resolved at
 * runtime by display name (docs/IMPLEMENTATION_PLAN.md §2.4).
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

/** Current value of a theme setting, as read back from the environment. */
export interface ScopeAssignment {
    kind: ThemeSettingKind;
    /** Environment-wide value, or `undefined` when unset. */
    environmentValue?: string;
    /** Per-app values, keyed by app id. */
    appValues: Record<string, string>;
}

function matchesDisplayName(
    record: Record<string, unknown>,
    displayName: string
): boolean {
    return (
        asString(record.displayname).trim().toLowerCase() ===
        displayName.toLowerCase()
    );
}

/** Escapes a string for safe use as an XML attribute value. */
function xmlAttrEscape(value: string): string {
    return value
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

/**
 * Probes the environment for the two theme setting definitions. Never throws:
 * a failure simply means the deep-link fallback has to be used.
 *
 * Discovery runs in two passes to handle both small and large environments:
 * 1. An OData query with $top=500 (fast, covers most environments).
 * 2. A FetchXML query with server-side display-name filtering for any
 *    definitions still missing after pass 1 — this works even when there are
 *    more than 500 setting definitions in the environment, and avoids
 *    paging through the full set.
 */
async function discoverScopeCapabilities(): Promise<ScopeCapabilities> {
    try {
        const result = await window.dataverseAPI.queryData(
            'settingdefinitions?$select=settingdefinitionid,uniquename,displayname&$top=500'
        );
        const definitions: Partial<
            Record<ThemeSettingKind, SettingDefinitionRef>
        > = {};

        for (const kind of Object.keys(
            THEME_SETTING_DISPLAY_NAMES
        ) as ThemeSettingKind[]) {
            const record = result.value.find((candidate) =>
                matchesDisplayName(candidate, THEME_SETTING_DISPLAY_NAMES[kind])
            );
            if (record) {
                definitions[kind] = {
                    id: asString(record.settingdefinitionid),
                    uniqueName: asString(record.uniquename),
                    displayName: asString(record.displayname),
                };
            }
        }

        // Pass 2: for any definitions still missing, try a targeted FetchXML
        // query so the $top=500 limit on pass 1 can't hide them.
        const stillMissing = (
            Object.keys(THEME_SETTING_DISPLAY_NAMES) as ThemeSettingKind[]
        ).filter((kind) => !definitions[kind]);

        if (stillMissing.length > 0) {
            try {
                const conditions = stillMissing
                    .map(
                        (kind) =>
                            `<condition attribute="displayname" operator="eq" value="${xmlAttrEscape(THEME_SETTING_DISPLAY_NAMES[kind])}" />`
                    )
                    .join('');
                const fetchXml = `<fetch><entity name="settingdefinition"><attribute name="settingdefinitionid" /><attribute name="uniquename" /><attribute name="displayname" /><filter type="or">${conditions}</filter></entity></fetch>`;
                const fallback =
                    await window.dataverseAPI.fetchXmlQuery(fetchXml);
                for (const kind of stillMissing) {
                    const record = fallback.value.find((candidate) =>
                        matchesDisplayName(
                            candidate,
                            THEME_SETTING_DISPLAY_NAMES[kind]
                        )
                    );
                    if (record) {
                        definitions[kind] = {
                            id: asString(record.settingdefinitionid),
                            uniqueName: asString(record.uniquename),
                            displayName: asString(record.displayname),
                        };
                    }
                }
            } catch {
                // If the FetchXML fallback also fails, carry on with whatever
                // pass 1 found — the caller degrades gracefully to the
                // maker-portal deep link.
            }
        }

        const missing = (
            Object.keys(THEME_SETTING_DISPLAY_NAMES) as ThemeSettingKind[]
        ).filter((kind) => !definitions[kind]);

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

/** Reads the current environment-wide and per-app values of a theme setting. */
async function readScopeAssignment(
    definition: SettingDefinitionRef,
    kind: ThemeSettingKind
): Promise<ScopeAssignment> {
    const assignment: ScopeAssignment = { kind, appValues: {} };

    try {
        const orgLookup = await resolveLookup(
            'organizationsetting',
            'settingdefinition'
        );
        const filter = encodeURIComponent(
            `_${orgLookup.attribute}_value eq ${definition.id}`
        );
        const organization = await window.dataverseAPI.queryData(
            `organizationsettings?$select=organizationsettingid,value&$filter=${filter}&$top=1`
        );
        const record = organization.value[0];
        if (record) {
            assignment.environmentValue = asString(record.value);
        }
    } catch {
        // Unreadable settings are indistinguishable from unset ones here; the
        // caller already knows whether the API path is available at all.
    }

    try {
        const [settingLookup, appLookup] = await Promise.all([
            resolveLookup('appsetting', 'settingdefinition'),
            resolveLookup('appsetting', 'appmodule'),
        ]);
        const appValueColumn = `_${appLookup.attribute}_value`;
        const filter = encodeURIComponent(
            `_${settingLookup.attribute}_value eq ${definition.id}`
        );
        const apps = await window.dataverseAPI.queryData(
            `appsettings?$select=appsettingid,value,${appValueColumn}&$filter=${filter}&$top=250`
        );
        for (const record of apps.value) {
            const appId = asString(record[appValueColumn]);
            if (appId) {
                assignment.appValues[appId] = asString(record.value);
            }
        }
    } catch {
        // Same as above.
    }

    return assignment;
}

interface SettingCondition {
    attribute: string;
    value: string;
}

/** FetchXML returns lookups as `_attr_value`; plain columns keep their name. */
function readAttribute(
    record: Record<string, unknown>,
    attribute: string
): string {
    const raw = record[`_${attribute}_value`] ?? record[attribute];
    return asString(raw).toLowerCase();
}

async function fetchSettingRows(
    entityLogicalName: string,
    columns: string[],
    conditions: SettingCondition[]
): Promise<Record<string, unknown>[]> {
    const attributeXml = columns
        .map((name) => `<attribute name="${name}" />`)
        .join('');
    const filterXml = conditions
        .map(
            (condition) =>
                `<condition attribute="${condition.attribute}" operator="eq" value="${condition.value}" />`
        )
        .join('');
    const fetchXml = `<fetch top="250"><entity name="${entityLogicalName}">${attributeXml}<filter type="and">${filterXml}</filter></entity></fetch>`;
    const result = await window.dataverseAPI.fetchXmlQuery(fetchXml);
    return result.value;
}

/**
 * Finds an existing setting record, using FetchXML rather than an OData
 * `$filter` query — the lookup columns on these tables don't reliably support
 * the OData `_attr_value` filter shorthand, and they aren't a
 * Web-API-recognized alternate key either, so `entitySet(attr=value,...)`
 * addressing isn't valid. When the fully-filtered query finds nothing, the
 * search is retried on the setting definition alone and narrowed in memory,
 * in case the platform doesn't honour a server-side filter on the second
 * lookup column.
 */
async function findExistingSetting(
    entityLogicalName: string,
    idColumn: string,
    conditions: SettingCondition[]
): Promise<string | undefined> {
    const columns = [idColumn, ...conditions.map((c) => c.attribute)];

    const exact = await fetchSettingRows(
        entityLogicalName,
        columns,
        conditions
    );
    if (exact[0]) {
        return asString(exact[0][idColumn]);
    }

    if (conditions.length < 2) {
        return undefined;
    }
    const [primary, ...rest] = conditions;
    const broadened = await fetchSettingRows(entityLogicalName, columns, [
        primary,
    ]);
    const match = broadened.find((record) =>
        rest.every(
            (condition) =>
                readAttribute(record, condition.attribute) ===
                condition.value.toLowerCase()
        )
    );
    return match ? asString(match[idColumn]) : undefined;
}

/**
 * Creates a setting record, or updates it when one already exists.
 *
 * A failed create isn't reliably "nothing was written": these tables are
 * solution-aware, so a row that was deleted without publishing still holds
 * the unique key while being filtered out of retrieves. When the create is
 * rejected, customizations are published (which clears those pending
 * component rows) and the whole upsert is attempted once more.
 */
async function upsertSetting(
    entityLogicalName: string,
    idColumn: string,
    conditions: SettingCondition[],
    createPayload: Record<string, unknown>,
    updatePayload: Record<string, unknown>
): Promise<void> {
    const existingId = await findExistingSetting(
        entityLogicalName,
        idColumn,
        conditions
    );
    if (existingId) {
        await window.dataverseAPI.update(
            entityLogicalName,
            existingId,
            updatePayload
        );
        return;
    }

    try {
        await window.dataverseAPI.create(entityLogicalName, createPayload);
    } catch (error) {
        await window.dataverseAPI.publishCustomizations();

        const recoveredId = await findExistingSetting(
            entityLogicalName,
            idColumn,
            conditions
        );
        if (recoveredId) {
            await window.dataverseAPI.update(
                entityLogicalName,
                recoveredId,
                updatePayload
            );
            return;
        }

        try {
            await window.dataverseAPI.create(entityLogicalName, createPayload);
        } catch {
            throw error;
        }
    }
}

interface LookupInfo {
    /** Referencing attribute logical name, used as a FetchXML condition attribute. */
    attribute: string;
    /** Single-valued navigation property name, used for `@odata.bind`. */
    navigationProperty: string;
}

const lookupCache = new Map<string, LookupInfo>();

/**
 * Resolves the lookup attribute + navigation property that `entityLogicalName`
 * uses to reference `referencedEntityLogicalName`. Both are looked up by the
 * *referenced* entity rather than guessed from the referenced entity's own
 * logical name (e.g. `appsetting`'s app lookup attribute is not
 * `appmoduleid`, it's `parentappmoduleid`) — these settings tables are
 * undocumented, so a hardcoded guess for either the key attribute or the
 * `@odata.bind` navigation property can silently point at the wrong (or a
 * nonexistent) property.
 */
async function resolveLookup(
    entityLogicalName: string,
    referencedEntityLogicalName: string
): Promise<LookupInfo> {
    const cacheKey = `${entityLogicalName}.${referencedEntityLogicalName}`;
    const cached = lookupCache.get(cacheKey);
    if (cached) {
        return cached;
    }

    const result = await window.dataverseAPI.getEntityRelatedMetadata(
        entityLogicalName,
        'ManyToOneRelationships',
        [
            'ReferencingAttribute',
            'ReferencingEntityNavigationPropertyName',
            'ReferencedEntity',
        ]
    );
    const relationship = result.value.find(
        (candidate) =>
            asString(candidate.ReferencedEntity).toLowerCase() ===
            referencedEntityLogicalName.toLowerCase()
    );
    if (!relationship) {
        throw new Error(
            `No lookup to "${referencedEntityLogicalName}" was found on "${entityLogicalName}".`
        );
    }

    const info: LookupInfo = {
        attribute: asString(relationship.ReferencingAttribute),
        navigationProperty: asString(
            relationship.ReferencingEntityNavigationPropertyName
        ),
    };
    lookupCache.set(cacheKey, info);
    return info;
}

/** ComponentType of a setting definition in the `solutioncomponent` table. */
const SOLUTION_COMPONENT_TYPE_SETTING_DEFINITION = 9006;

/**
 * Adds a setting definition to a solution so that the platform recognises it
 * there — this is the API equivalent of "Add existing → More → Setting" in the
 * maker portal. Fails silently because the setting value write often succeeds
 * even when this step is rejected (e.g. the definition is already present, or
 * the platform doesn't gate value creation on solution membership).
 */
async function addDefinitionToSolution(
    definitionId: string,
    solutionUniqueName: string
): Promise<void> {
    try {
        await window.dataverseAPI.execute({
            operationName: 'AddSolutionComponent',
            operationType: 'action',
            parameters: {
                ComponentId: definitionId,
                ComponentType: SOLUTION_COMPONENT_TYPE_SETTING_DEFINITION,
                SolutionUniqueName: solutionUniqueName,
                AddRequiredComponents: false,
            },
        });
    } catch {
        // Non-fatal: AddSolutionComponent may reject if the definition is
        // already in the solution, or if the ComponentType constant differs
        // from what this (undocumented) environment uses.  Setting value
        // creation is attempted regardless.
    }
}

/**
 * Writes the environment-wide value of a theme setting (the web resource unique
 * name). Throws `DataverseOperationError` when the write fails.
 */
async function setEnvironmentScope(
    definition: SettingDefinitionRef,
    webResourceName: string
): Promise<void> {
    try {
        const settingLookup = await resolveLookup(
            'organizationsetting',
            'settingdefinition'
        );
        await upsertSetting(
            'organizationsetting',
            'organizationsettingid',
            [{ attribute: settingLookup.attribute, value: definition.id }],
            {
                value: webResourceName,
                [`${settingLookup.navigationProperty}@odata.bind`]: `/settingdefinitions(${definition.id})`,
            },
            { value: webResourceName }
        );
    } catch (error) {
        throw new DataverseOperationError(
            `Assigning the theme to the environment failed: ${describe(error)}`,
            error
        );
    }
}

/** Writes the per-app value of a theme setting. */
async function setAppScope(
    definition: SettingDefinitionRef,
    appId: string,
    webResourceName: string
): Promise<void> {
    try {
        const [settingLookup, appLookup] = await Promise.all([
            resolveLookup('appsetting', 'settingdefinition'),
            resolveLookup('appsetting', 'appmodule'),
        ]);
        await upsertSetting(
            'appsetting',
            'appsettingid',
            [
                { attribute: settingLookup.attribute, value: definition.id },
                { attribute: appLookup.attribute, value: appId },
            ],
            {
                value: webResourceName,
                [`${settingLookup.navigationProperty}@odata.bind`]: `/settingdefinitions(${definition.id})`,
                [`${appLookup.navigationProperty}@odata.bind`]: `/appmodules(${appId})`,
            },
            { value: webResourceName }
        );
    } catch (error) {
        throw new DataverseOperationError(
            `Assigning the theme to the app failed: ${describe(error)}`,
            error
        );
    }
}

/** Everything the tool needs from Dataverse about theme scope assignment. */
export interface DataverseThemeScopeService {
    /**
     * Probes the environment for the "Custom theme definition" and "Override
     * app header color" setting definitions. Use this once per connection,
     * before showing the scope dialog, to know whether the definitions are
     * already reachable. Never throws.
     */
    discoverScopeCapabilities(): Promise<ScopeCapabilities>;
    /**
     * Reads the current environment-wide and per-app values of a theme
     * setting. Use this to warn the user when the *other* theme setting
     * (e.g. "Override app header color") is already in use before they apply
     * a conflicting one.
     */
    readScopeAssignment(
        definition: SettingDefinitionRef,
        kind: ThemeSettingKind
    ): Promise<ScopeAssignment>;
    /**
     * Adds a setting definition to a solution (API equivalent of "Add
     * existing → More → Setting" in the maker portal). Call this before
     * `setEnvironmentScope` / `setAppScope` so the definition is solution-
     * scoped. Failure is non-fatal: the value write is attempted regardless.
     */
    addDefinitionToSolution(
        definitionId: string,
        solutionUniqueName: string
    ): Promise<void>;
    /**
     * Assigns a theme web resource to the whole environment. Use this when
     * the user chooses "apply to environment" in the scope dialog.
     */
    setEnvironmentScope(
        definition: SettingDefinitionRef,
        webResourceName: string
    ): Promise<void>;
    /**
     * Assigns a theme web resource to a single model-driven app. Use this
     * when the user chooses "apply to app" and picks a specific app in the
     * scope dialog.
     */
    setAppScope(
        definition: SettingDefinitionRef,
        appId: string,
        webResourceName: string
    ): Promise<void>;
}

/** Singleton implementation, backed by `window.dataverseAPI`. */
export const dataverseThemeScopeService: DataverseThemeScopeService = {
    discoverScopeCapabilities,
    readScopeAssignment,
    addDefinitionToSolution,
    setEnvironmentScope,
    setAppScope,
};
