/**
 * Shared building blocks for the `Dataverse*Service` family
 * (`dataverseSolutionService`, `dataverseWebResourceService`,
 * `dataverseAppService`, `dataverseThemeScopeService`). Nothing here talks to
 * `window.dataverseAPI` on its own — it only standardises how the services
 * report and wrap failures.
 */

/** An error raised by any Dataverse call, already carrying a user-readable message. */
export class DataverseOperationError extends Error {
    constructor(
        message: string,
        readonly cause?: unknown
    ) {
        super(message);
        this.name = 'DataverseOperationError';
    }
}

/** Coerces an OData response value (often `unknown`) into a plain string. */
export function asString(value: unknown): string {
    return typeof value === 'string' ? value : String(value ?? '');
}

/** Extracts a human-readable message from any thrown value. */
export function describe(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
}

/**
 * Runs a Dataverse call and rewraps any failure as a `DataverseOperationError`
 * prefixed with `what`, so every service reports errors the same way.
 */
export async function run<T>(
    what: string,
    operation: () => Promise<T>
): Promise<T> {
    try {
        return await operation();
    } catch (error) {
        throw new DataverseOperationError(
            `${what} failed: ${describe(error)}`,
            error
        );
    }
}

/** Escapes a value for use inside an OData string literal. */
export function odataLiteral(value: string): string {
    return value.replace(/'/g, "''");
}
