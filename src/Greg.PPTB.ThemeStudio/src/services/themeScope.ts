import { DataverseOperationError } from './dataverseCore';

/**
 * Maker-portal fallback for theme scope assignment. All actual reads/writes
 * of the scope settings live in `dataverseThemeScopeService.ts` — this is the
 * one part of the flow (opening a browser tab) that never touches Dataverse
 * itself (docs/IMPLEMENTATION_PLAN.md §2.4, owner decision §7.5).
 */

function describe(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
}

/**
 * Approved fallback: open the solution in the maker portal so the user can add
 * the setting by hand, with the unique name to paste already on screen (§2.4).
 */
export async function openSolutionInMaker(
    connectionUrl: string,
    solutionId: string
): Promise<void> {
    try {
        // `openInConnectionBrowser` only accepts absolute http(s) URLs; the
        // environment's own solution URL redirects to the maker portal page for
        // the solution, so no environment id has to be guessed here.
        const url = new URL(
            `/tools/solution/edit.aspx?id=${encodeURIComponent(solutionId)}`,
            connectionUrl
        );
        if (url.protocol !== 'https:' && url.protocol !== 'http:') {
            throw new Error('The connection URL is not an http(s) address.');
        }
        await window.toolboxAPI.utils.openInConnectionBrowser(url.toString());
    } catch (error) {
        throw new DataverseOperationError(
            `Opening the solution in the maker portal failed: ${describe(error)}`,
            error
        );
    }
}
