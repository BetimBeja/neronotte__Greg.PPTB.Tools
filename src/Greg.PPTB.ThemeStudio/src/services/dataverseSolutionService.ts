import { DataverseOperationError, asString, describe } from './dataverseCore';

/**
 * Solution lookup: finding the unmanaged, writable solutions the current user
 * can target for a new or updated web resource
 * (docs/IMPLEMENTATION_PLAN.md §2.5, owner decision §7.4).
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

/**
 * Lists the unmanaged, visible solutions the user can write to, together with
 * their publisher prefix (needed to build web resource unique names). The
 * solution picker is **mandatory** — the tool never falls back to the default
 * solution (docs/IMPLEMENTATION_PLAN.md §2.5, owner decision §7.4).
 */
async function listWritableSolutions(): Promise<SolutionSummary[]> {
    let result: { value: Record<string, unknown>[] };
    try {
        result = await window.dataverseAPI.queryData(
            'solutions?$select=solutionid,uniquename,friendlyname,version&$expand=publisherid($select=customizationprefix,friendlyname)' +
                `&$filter=${encodeURIComponent('ismanaged eq false and isvisible eq true')}&$orderby=friendlyname&$top=250`
        );
    } catch (error) {
        throw new DataverseOperationError(
            `Loading the solution list failed: ${describe(error)}`,
            error
        );
    }

    return (
        result.value
            .map((record): SolutionSummary => {
                const publisher = (record.publisherid ?? {}) as Record<
                    string,
                    unknown
                >;
                return {
                    id: asString(record.solutionid),
                    uniqueName: asString(record.uniquename),
                    friendlyName:
                        asString(record.friendlyname) ||
                        asString(record.uniquename),
                    version:
                        typeof record.version === 'string'
                            ? record.version
                            : undefined,
                    publisherPrefix: asString(publisher.customizationprefix),
                    publisherName:
                        typeof publisher.friendlyname === 'string'
                            ? publisher.friendlyname
                            : undefined,
                };
            })
            // "Active"/"Default" solutions are excluded on purpose: the owner
            // decision is that the target solution must always be explicit.
            .filter(
                (solution) =>
                    solution.uniqueName !== 'Active' &&
                    solution.uniqueName !== 'Default'
            )
    );
}

/** Everything the tool needs from Dataverse about solutions. */
export interface DataverseSolutionService {
    /**
     * Lists the unmanaged, visible solutions the current user can write to.
     * Use this to populate the mandatory solution picker before creating or
     * updating a web resource — never assume the default solution.
     */
    listWritableSolutions(): Promise<SolutionSummary[]>;
}

/** Singleton implementation, backed by `window.dataverseAPI`. */
export const dataverseSolutionService: DataverseSolutionService = {
    listWritableSolutions,
};
