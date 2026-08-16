import {
    DataverseOperationError,
    asString,
    odataLiteral,
    run,
} from './dataverseCore';

/**
 * Everything the tool does to `webresourceset` records: listing, reading,
 * creating, updating and publishing the theme/logo web resources
 * (docs/IMPLEMENTATION_PLAN.md §2.5, §3).
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

function toSummary(record: Record<string, unknown>): WebResourceSummary {
    return {
        id: asString(record.webresourceid),
        name: asString(record.name),
        displayName:
            typeof record.displayname === 'string'
                ? record.displayname
                : undefined,
        webResourceType: Number(record.webresourcetype ?? 0),
        isManaged: record.ismanaged === true,
    };
}

/** Lists web resources of the given types, optionally filtered by name. */
async function listWebResources(
    types: number[],
    search?: string
): Promise<WebResourceSummary[]> {
    const typeFilter = types
        .map((type) => `webresourcetype eq ${type}`)
        .join(' or ');
    const filters = [`(${typeFilter})`];
    const term = search?.trim();
    if (term) {
        filters.push(`contains(name,'${odataLiteral(term)}')`);
    }
    const query = `webresourceset?$select=webresourceid,name,displayname,webresourcetype,ismanaged&$filter=${encodeURIComponent(filters.join(' and '))}&$orderby=name&$top=250`;

    const result = await run('Listing web resources', () =>
        window.dataverseAPI.queryData(query)
    );
    return result.value.map(toSummary);
}

/** Reads a single web resource, including its base64 content. */
async function readWebResource(id: string): Promise<WebResourceContent> {
    const record = await run('Reading the web resource', () =>
        window.dataverseAPI.retrieve('webresource', id, [
            'webresourceid',
            'name',
            'displayname',
            'webresourcetype',
            'ismanaged',
            'content',
        ])
    );
    return { ...toSummary(record), contentBase64: asString(record.content) };
}

/** Reads a web resource by its unique name; resolves to `undefined` when not found. */
async function findWebResourceByName(
    name: string
): Promise<WebResourceSummary | undefined> {
    const query = `webresourceset?$select=webresourceid,name,displayname,webresourcetype,ismanaged&$filter=${encodeURIComponent(`name eq '${odataLiteral(name.trim())}'`)}&$top=1`;
    const result = await run('Looking up the web resource', () =>
        window.dataverseAPI.queryData(query)
    );
    const record = result.value[0];
    return record ? toSummary(record) : undefined;
}

/**
 * Adds a component to a solution.
 *
 * `dataverseAPI.create` exposes no per-request header argument, so the
 * `MSCRM.SolutionUniqueName` header can't be sent; this is the documented
 * alternative, and the only way the mandatory solution picker can be honoured
 * (docs/IMPLEMENTATION_PLAN.md §2.5).
 */
async function addWebResourceToSolution(
    webResourceId: string,
    solutionUniqueName: string
): Promise<void> {
    await run(
        `Adding the web resource to solution "${solutionUniqueName}"`,
        () =>
            window.dataverseAPI.execute({
                operationName: 'AddSolutionComponent',
                operationType: 'action',
                parameters: {
                    ComponentId: webResourceId,
                    ComponentType: SOLUTION_COMPONENT_TYPE_WEB_RESOURCE,
                    SolutionUniqueName: solutionUniqueName,
                    AddRequiredComponents: false,
                },
            })
    );
}

/** Creates a web resource and adds it to the chosen solution. */
async function createWebResource(
    input: CreateWebResourceInput
): Promise<WebResourceSummary> {
    const created = await run('Creating the web resource', () =>
        window.dataverseAPI.create('webresource', {
            name: input.name,
            displayname: input.displayName,
            webresourcetype: input.webResourceType,
            content: input.contentBase64,
            ...(input.description ? { description: input.description } : {}),
        })
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
async function updateWebResourceContent(
    resource: WebResourceSummary,
    contentBase64: string,
    solutionUniqueName: string
): Promise<void> {
    if (resource.isManaged) {
        throw new DataverseOperationError(
            `"${resource.name}" is a managed web resource and can't be updated. Pick or create an unmanaged one instead.`
        );
    }

    await run('Updating the web resource', () =>
        window.dataverseAPI.update('webresource', resource.id, {
            content: contentBase64,
        })
    );
    await addWebResourceToSolution(resource.id, solutionUniqueName);
}

/**
 * Targeted publish of a single web resource. Publishing is not required when
 * creating a web resource, but it *is* required after an update (§2.5).
 */
async function publishWebResource(id: string): Promise<void> {
    await run('Publishing the web resource', () =>
        window.dataverseAPI.execute({
            operationName: 'PublishXml',
            operationType: 'action',
            parameters: {
                ParameterXml: `<importexportxml><webresources><webresource>${id}</webresource></webresources></importexportxml>`,
            },
        })
    );
}

/** Publishes every pending customization in the environment. */
async function publishAllCustomizations(): Promise<void> {
    await run('Publishing all customizations', () =>
        window.dataverseAPI.publishCustomizations()
    );
}

/** Everything the tool needs from Dataverse about web resources. */
export interface DataverseWebResourceService {
    /**
     * Lists web resources of the given `webresourcetype`s, optionally narrowed
     * by a name search. Use this to populate a web resource picker (e.g. the
     * "existing theme" or "existing logo" pickers).
     */
    listWebResources(
        types: number[],
        search?: string
    ): Promise<WebResourceSummary[]>;
    /**
     * Reads a single web resource by id, including its base64 content. Use
     * this when the actual file content is needed (e.g. loading a theme XML
     * or a logo image into the editor).
     */
    readWebResource(id: string): Promise<WebResourceContent>;
    /**
     * Looks up a web resource by its unique name. Use this to check whether a
     * previously-saved theme/logo web resource still exists before reusing it.
     */
    findWebResourceByName(
        name: string
    ): Promise<WebResourceSummary | undefined>;
    /**
     * Adds an existing web resource to a solution. Use this after creating or
     * updating a web resource outside of a solution-aware API, so it ends up
     * in the solution the user picked.
     */
    addWebResourceToSolution(
        webResourceId: string,
        solutionUniqueName: string
    ): Promise<void>;
    /**
     * Creates a brand-new web resource and adds it to the given solution. Use
     * this the first time a theme or logo is saved (no existing web resource
     * to update yet).
     */
    createWebResource(
        input: CreateWebResourceInput
    ): Promise<WebResourceSummary>;
    /**
     * Overwrites the content of an existing, unmanaged web resource and
     * re-adds it to the given solution. Use this for subsequent saves of a
     * theme/logo that already has a web resource. Throws when the resource is
     * managed.
     */
    updateWebResourceContent(
        resource: WebResourceSummary,
        contentBase64: string,
        solutionUniqueName: string
    ): Promise<void>;
    /**
     * Publishes a single web resource. Use this right after updating a web
     * resource's content, so the change is visible without a full publish.
     */
    publishWebResource(id: string): Promise<void>;
    /**
     * Publishes every pending customization in the environment. Use this
     * after assigning a theme scope (environment/app setting), since that
     * write needs a full publish to take effect.
     */
    publishAllCustomizations(): Promise<void>;
}

/** Singleton implementation, backed by `window.dataverseAPI`. */
export const dataverseWebResourceService: DataverseWebResourceService = {
    listWebResources,
    readWebResource,
    findWebResourceByName,
    addWebResourceToSolution,
    createWebResource,
    updateWebResourceContent,
    publishWebResource,
    publishAllCustomizations,
};
