import { base64ToText, textToBase64 } from './base64';

/**
 * Web resource CRUD through `dataverseAPI` — the only place the tool talks to
 * the `webresourceset` table (docs/IMPLEMENTATION_PLAN.md §2.5, §3).
 *
 * Everything here is `async` and throws `DataverseOperationError` with a
 * readable message; the UI is responsible for surfacing it through
 * `toolboxAPI.utils.showNotification`.
 */

/** Documented `webresourcetype` option-set values (docs/IMPLEMENTATION_PLAN.md §2.5). */
export const WEB_RESOURCE_TYPE = {
    xml: 4,
    png: 5,
    jpg: 6,
    gif: 7,
    ico: 10,
    svg: 11,
} as const;

/** The image types the platform accepts for a header logo. */
export const IMAGE_WEB_RESOURCE_TYPES: number[] = [WEB_RESOURCE_TYPE.png, WEB_RESOURCE_TYPE.jpg, WEB_RESOURCE_TYPE.gif, WEB_RESOURCE_TYPE.ico, WEB_RESOURCE_TYPE.svg];

/** ComponentType of a web resource in the `solutioncomponent` table. */
const SOLUTION_COMPONENT_TYPE_WEB_RESOURCE = 61;

export interface WebResourceSummary {
    id: string;
    /** Unique (prefixed) name, which is what a theme setting/logo reference uses. */
    name: string;
    displayName?: string;
    webResourceType: number;
    isManaged: boolean;
}

export interface WebResourceContent extends WebResourceSummary {
    /** Raw base64 content as stored in Dataverse. */
    contentBase64: string;
}

/** An error raised by any Dataverse call, already carrying a user-readable message. */
export class DataverseOperationError extends Error {
    constructor(message: string, readonly cause?: unknown) {
        super(message);
        this.name = 'DataverseOperationError';
    }
}

function describe(error: unknown): string {
    if (error instanceof Error) {
        return error.message;
    }
    return String(error);
}

async function run<T>(what: string, operation: () => Promise<T>): Promise<T> {
    try {
        return await operation();
    } catch (error) {
        throw new DataverseOperationError(`${what} failed: ${describe(error)}`, error);
    }
}

function asString(value: unknown): string {
    return typeof value === 'string' ? value : String(value ?? '');
}

function toSummary(record: Record<string, unknown>): WebResourceSummary {
    return {
        id: asString(record.webresourceid),
        name: asString(record.name),
        displayName: typeof record.displayname === 'string' ? record.displayname : undefined,
        webResourceType: Number(record.webresourcetype ?? 0),
        isManaged: record.ismanaged === true,
    };
}

/** MIME type used to render an image web resource in the preview. */
export function imageMimeType(webResourceType: number): string {
    switch (webResourceType) {
        case WEB_RESOURCE_TYPE.png:
            return 'image/png';
        case WEB_RESOURCE_TYPE.jpg:
            return 'image/jpeg';
        case WEB_RESOURCE_TYPE.gif:
            return 'image/gif';
        case WEB_RESOURCE_TYPE.ico:
            return 'image/x-icon';
        case WEB_RESOURCE_TYPE.svg:
            return 'image/svg+xml';
        default:
            return 'application/octet-stream';
    }
}

/** Maps a file extension to the matching image `webresourcetype`, if supported. */
export function imageTypeFromFileName(fileName: string): number | undefined {
    const extension = fileName.toLowerCase().split('.').pop();
    switch (extension) {
        case 'png':
            return WEB_RESOURCE_TYPE.png;
        case 'jpg':
        case 'jpeg':
            return WEB_RESOURCE_TYPE.jpg;
        case 'gif':
            return WEB_RESOURCE_TYPE.gif;
        case 'ico':
            return WEB_RESOURCE_TYPE.ico;
        case 'svg':
            return WEB_RESOURCE_TYPE.svg;
        default:
            return undefined;
    }
}

/**
 * Validates the *unprefixed* part of a web resource name. Dataverse prepends
 * the solution publisher's customization prefix, and rejects names with
 * characters outside this set.
 */
export function validateWebResourceName(name: string): string | undefined {
    const trimmed = name.trim();
    if (!trimmed) {
        return 'Enter a name for the web resource.';
    }
    if (trimmed.length > 100) {
        return 'The name must be 100 characters or fewer.';
    }
    if (!/^[A-Za-z0-9_./-]+$/.test(trimmed)) {
        return 'Only letters, digits, underscore, dot, slash and hyphen are allowed.';
    }
    if (trimmed.startsWith('/') || trimmed.endsWith('/')) {
        return 'The name cannot start or end with a slash.';
    }
    return undefined;
}

/** Builds the full unique name from a publisher prefix and a local name. */
export function buildWebResourceName(publisherPrefix: string, localName: string): string {
    const prefix = publisherPrefix.trim().replace(/_+$/, '');
    const local = localName.trim().replace(/^_+/, '');
    return prefix ? `${prefix}_${local}` : local;
}

/** Escapes a value for use inside an OData string literal. */
function odataLiteral(value: string): string {
    return value.replace(/'/g, "''");
}

/** Lists web resources of the given types, optionally filtered by name. */
export async function listWebResources(types: number[], search?: string): Promise<WebResourceSummary[]> {
    const typeFilter = types.map((type) => `webresourcetype eq ${type}`).join(' or ');
    const filters = [`(${typeFilter})`];
    const term = search?.trim();
    if (term) {
        filters.push(`contains(name,'${odataLiteral(term)}')`);
    }
    const query = `webresourceset?$select=webresourceid,name,displayname,webresourcetype,ismanaged&$filter=${encodeURIComponent(filters.join(' and '))}&$orderby=name&$top=250`;

    const result = await run('Listing web resources', () => window.dataverseAPI.queryData(query));
    return result.value.map(toSummary);
}

/** Reads a single web resource, including its base64 content. */
export async function readWebResource(id: string): Promise<WebResourceContent> {
    const record = await run('Reading the web resource', () =>
        window.dataverseAPI.retrieve('webresource', id, ['webresourceid', 'name', 'displayname', 'webresourcetype', 'ismanaged', 'content']),
    );
    return { ...toSummary(record), contentBase64: asString(record.content) };
}

/** Reads a web resource by its unique name; resolves to `undefined` when not found. */
export async function findWebResourceByName(name: string): Promise<WebResourceSummary | undefined> {
    const query = `webresourceset?$select=webresourceid,name,displayname,webresourcetype,ismanaged&$filter=${encodeURIComponent(`name eq '${odataLiteral(name.trim())}'`)}&$top=1`;
    const result = await run('Looking up the web resource', () => window.dataverseAPI.queryData(query));
    const record = result.value[0];
    return record ? toSummary(record) : undefined;
}

/** Decodes the XML content of a theme web resource. */
export function webResourceXml(resource: WebResourceContent): string {
    return base64ToText(resource.contentBase64);
}

/**
 * Adds a component to a solution.
 *
 * `dataverseAPI.create` exposes no per-request header argument, so the
 * `MSCRM.SolutionUniqueName` header can't be sent; this is the documented
 * alternative, and the only way the mandatory solution picker can be honoured
 * (docs/IMPLEMENTATION_PLAN.md §2.5).
 */
export async function addWebResourceToSolution(webResourceId: string, solutionUniqueName: string): Promise<void> {
    await run(`Adding the web resource to solution "${solutionUniqueName}"`, () =>
        window.dataverseAPI.execute({
            operationName: 'AddSolutionComponent',
            operationType: 'action',
            parameters: {
                ComponentId: webResourceId,
                ComponentType: SOLUTION_COMPONENT_TYPE_WEB_RESOURCE,
                SolutionUniqueName: solutionUniqueName,
                AddRequiredComponents: false,
            },
        }),
    );
}

export interface CreateWebResourceInput {
    /** Full unique name, publisher prefix included. */
    name: string;
    displayName: string;
    webResourceType: number;
    contentBase64: string;
    description?: string;
    /** Mandatory: the tool never falls back to the default solution (§2.5). */
    solutionUniqueName: string;
}

/** Creates a web resource and adds it to the chosen solution. */
export async function createWebResource(input: CreateWebResourceInput): Promise<WebResourceSummary> {
    const created = await run('Creating the web resource', () =>
        window.dataverseAPI.create('webresource', {
            name: input.name,
            displayname: input.displayName,
            webresourcetype: input.webResourceType,
            content: input.contentBase64,
            ...(input.description ? { description: input.description } : {}),
        }),
    );

    const id = asString(created.id);
    await addWebResourceToSolution(id, input.solutionUniqueName);

    return {
        id,
        name: input.name,
        displayName: input.displayName,
        webResourceType: input.webResourceType,
        isManaged: false,
    };
}

/** Updates the content of an existing (unmanaged) web resource. */
export async function updateWebResourceContent(resource: WebResourceSummary, contentBase64: string, solutionUniqueName: string): Promise<void> {
    if (resource.isManaged) {
        throw new DataverseOperationError(`"${resource.name}" is a managed web resource and can't be updated. Pick or create an unmanaged one instead.`);
    }

    await run('Updating the web resource', () => window.dataverseAPI.update('webresource', resource.id, { content: contentBase64 }));
    await addWebResourceToSolution(resource.id, solutionUniqueName);
}

/** Convenience wrapper: serialised theme XML → base64 content. */
export function themeXmlToContent(xml: string): string {
    return textToBase64(xml);
}

/**
 * Targeted publish of a single web resource. Publishing is not required when
 * creating a web resource, but it *is* required after an update (§2.5).
 */
export async function publishWebResource(id: string): Promise<void> {
    await run('Publishing the web resource', () =>
        window.dataverseAPI.execute({
            operationName: 'PublishXml',
            operationType: 'action',
            parameters: {
                ParameterXml: `<importexportxml><webresources><webresource>${id}</webresource></webresources></importexportxml>`,
            },
        }),
    );
}

/** Publishes every pending customization in the environment. */
export async function publishAllCustomizations(): Promise<void> {
    await run('Publishing all customizations', () => window.dataverseAPI.publishCustomizations());
}
