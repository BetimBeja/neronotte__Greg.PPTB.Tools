import { DataverseOperationError } from './webResources';

/**
 * Solution lookup. The solution picker is **mandatory** — the tool never falls
 * back to the default solution (docs/IMPLEMENTATION_PLAN.md §2.5, owner
 * decision §7.4) — so this is on the critical path of every save.
 */

export interface SolutionSummary {
    id: string;
    uniqueName: string;
    friendlyName: string;
    version?: string;
    /** Publisher customization prefix, prepended to new web resource names. */
    publisherPrefix: string;
    publisherName?: string;
}

function asString(value: unknown): string {
    return typeof value === 'string' ? value : String(value ?? '');
}

/**
 * Lists the unmanaged, visible solutions the user can write to, together with
 * their publisher prefix (needed to build web resource unique names).
 */
export async function listWritableSolutions(): Promise<SolutionSummary[]> {
    let result: { value: Record<string, unknown>[] };
    try {
        result = await window.dataverseAPI.queryData(
            'solutions?$select=solutionid,uniquename,friendlyname,version&$expand=publisherid($select=customizationprefix,friendlyname)' +
                `&$filter=${encodeURIComponent('ismanaged eq false and isvisible eq true')}&$orderby=friendlyname&$top=250`,
        );
    } catch (error) {
        throw new DataverseOperationError(`Loading the solution list failed: ${error instanceof Error ? error.message : String(error)}`, error);
    }

    return result.value
        .map((record): SolutionSummary => {
            const publisher = (record.publisherid ?? {}) as Record<string, unknown>;
            return {
                id: asString(record.solutionid),
                uniqueName: asString(record.uniquename),
                friendlyName: asString(record.friendlyname) || asString(record.uniquename),
                version: typeof record.version === 'string' ? record.version : undefined,
                publisherPrefix: asString(publisher.customizationprefix),
                publisherName: typeof publisher.friendlyname === 'string' ? publisher.friendlyname : undefined,
            };
        })
        // "Active"/"Default" solutions are excluded on purpose: the owner
        // decision is that the target solution must always be explicit.
        .filter((solution) => solution.uniqueName !== 'Active' && solution.uniqueName !== 'Default');
}
