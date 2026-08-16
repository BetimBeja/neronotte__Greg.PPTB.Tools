import { base64ToText, textToBase64 } from './base64';
import type { WebResourceContent } from './dataverseWebResourceService';

/**
 * Pure `webresourceset` naming/type helpers with no Dataverse calls of their
 * own — every actual call now lives in `dataverseWebResourceService.ts`
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

/** The image types the platform accepts for a header logo. */
export const IMAGE_WEB_RESOURCE_TYPES: number[] = [
    WEB_RESOURCE_TYPE.png,
    WEB_RESOURCE_TYPE.jpg,
    WEB_RESOURCE_TYPE.gif,
    WEB_RESOURCE_TYPE.ico,
    WEB_RESOURCE_TYPE.svg,
];

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
export function buildWebResourceName(
    publisherPrefix: string,
    localName: string
): string {
    const prefix = publisherPrefix.trim().replace(/_+$/, '');
    const local = localName.trim().replace(/^_+/, '');
    return prefix ? `${prefix}_${local}` : local;
}

/** Decodes the XML content of a theme web resource. */
export function webResourceXml(resource: WebResourceContent): string {
    return base64ToText(resource.contentBase64);
}

/** Convenience wrapper: serialised theme XML → base64 content. */
export function themeXmlToContent(xml: string): string {
    return textToBase64(xml);
}
