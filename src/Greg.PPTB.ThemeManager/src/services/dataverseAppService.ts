import { DataverseOperationError, asString, describe } from './dataverseCore';

/**
 * Model-driven app lookup, used only to populate the "per-app" scope target
 * in the scope-assignment flow (docs/IMPLEMENTATION_PLAN.md §2.4).
 */

export interface AppSummary {
    id: string;
    name: string;
    uniqueName: string;
}

/** Lists the model-driven apps a per-app scope can be assigned to. */
async function listApps(): Promise<AppSummary[]> {
    try {
        const result = await window.dataverseAPI.queryData(
            'appmodules?$select=appmoduleid,name,uniquename&$orderby=name&$top=250'
        );
        return result.value.map((record) => ({
            id: asString(record.appmoduleid),
            name: asString(record.name) || asString(record.uniquename),
            uniqueName: asString(record.uniquename),
        }));
    } catch (error) {
        throw new DataverseOperationError(
            `Loading the app list failed: ${describe(error)}`,
            error
        );
    }
}

/** Everything the tool needs from Dataverse about model-driven apps. */
export interface DataverseAppService {
    /**
     * Lists the model-driven apps in the environment. Use this to populate
     * the app picker when the user chooses to scope a theme to a single app
     * rather than the whole environment.
     */
    listApps(): Promise<AppSummary[]>;
}

/** Singleton implementation, backed by `window.dataverseAPI`. */
export const dataverseAppService: DataverseAppService = {
    listApps,
};
