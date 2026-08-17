import { bytesToBase64 } from './base64';
import { imageMimeType, imageTypeFromFileName, WEB_RESOURCE_TYPE } from './webResources';

/**
 * The three ways a screenshot gets into the colour-extraction wizard — local
 * file, clipboard paste, drag & drop — all funnelling into one decoded
 * `LoadedImage` (docs/IMPLEMENTATION_PLAN.md §2.14, Phase 6.3).
 *
 * Everything async and DOM-bound lives here; the analysis itself is pure and
 * sits in `model/colorExtraction.ts`.
 */

/** Largest file accepted, in bytes — a bigger screenshot would freeze the renderer. */
export const MAX_IMAGE_BYTES = 20 * 1024 * 1024;

/** Largest accepted edge, in pixels. */
export const MAX_IMAGE_EDGE = 8000;

/**
 * Longest edge of the decoded working copy. The image is downscaled on import
 * so the pixel buffer that reaches the analysis (and the preview) is bounded
 * regardless of the screenshot's resolution.
 */
export const WORKING_EDGE = 1200;

export interface LoadedImage {
    /** `data:` URI of the original image — keeps the canvas untainted (§2.14). */
    dataUri: string;
    /** Decoded pixels of the (possibly downscaled) working copy. */
    imageData: ImageData;
    /** Size of the working copy. */
    width: number;
    height: number;
    /** Size of the original image, before downscaling. */
    naturalWidth: number;
    naturalHeight: number;
    /** File name, when the source had one. */
    fileName?: string;
}

/** An import that failed for a reason worth showing to the user. */
export class ImageImportError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'ImageImportError';
    }
}

const IMAGE_FILTERS = [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp'] }];

/** Bitmap types the extractor can read — SVG/ICO are excluded (no reliable raster size). */
const SUPPORTED_MIME_TYPES = ['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/bmp'];

function fileNameOf(path: string): string {
    return path.split(/[\\/]/).pop() ?? path;
}

/** Decodes a `data:` URI into a bounded `ImageData`, enforcing the size guards. */
export async function decodeImage(dataUri: string, fileName?: string): Promise<LoadedImage> {
    const image = await loadImageElement(dataUri);
    const naturalWidth = image.naturalWidth;
    const naturalHeight = image.naturalHeight;

    if (!naturalWidth || !naturalHeight) {
        throw new ImageImportError("That image couldn't be decoded. Use a PNG, JPG, GIF, WEBP or BMP screenshot.");
    }
    if (naturalWidth > MAX_IMAGE_EDGE || naturalHeight > MAX_IMAGE_EDGE) {
        throw new ImageImportError(`That image is ${naturalWidth} × ${naturalHeight} px. Images larger than ${MAX_IMAGE_EDGE} px on a side are not supported.`);
    }

    const scale = Math.min(1, WORKING_EDGE / Math.max(naturalWidth, naturalHeight));
    const width = Math.max(1, Math.round(naturalWidth * scale));
    const height = Math.max(1, Math.round(naturalHeight * scale));

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) {
        throw new ImageImportError('This environment cannot read image pixels, so colours cannot be extracted.');
    }
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = 'high';
    context.drawImage(image, 0, 0, width, height);

    let imageData: ImageData;
    try {
        imageData = context.getImageData(0, 0, width, height);
    } catch {
        throw new ImageImportError("That image's pixels couldn't be read. Import it as a local file instead.");
    }

    return { dataUri, imageData, width, height, naturalWidth, naturalHeight, fileName };
}

function loadImageElement(dataUri: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = () => reject(new ImageImportError("That file couldn't be read as an image."));
        image.src = dataUri;
    });
}

/**
 * Prompts for a local image file and decodes it.
 * Resolves to `undefined` when the user cancels the dialog.
 */
export async function importImageFromFile(): Promise<LoadedImage | undefined> {
    const path = await window.toolboxAPI.fileSystem.selectPath({
        type: 'file',
        title: 'Select a screenshot',
        filters: IMAGE_FILTERS,
    });

    if (!path) {
        return undefined;
    }

    const fileName = fileNameOf(path);
    const webResourceType = imageTypeFromFileName(fileName);
    const extension = fileName.toLowerCase().split('.').pop();
    const mimeType =
        webResourceType !== undefined && webResourceType !== WEB_RESOURCE_TYPE.svg && webResourceType !== WEB_RESOURCE_TYPE.ico
            ? imageMimeType(webResourceType)
            : extension === 'webp'
              ? 'image/webp'
              : extension === 'bmp'
                ? 'image/bmp'
                : undefined;

    if (!mimeType) {
        throw new ImageImportError(`"${fileName}" is not a supported screenshot format. Use PNG, JPG, GIF, WEBP or BMP.`);
    }

    const buffer = await window.toolboxAPI.fileSystem.readBinary(path);
    const bytes = new Uint8Array(buffer);
    if (bytes.byteLength > MAX_IMAGE_BYTES) {
        throw new ImageImportError(`"${fileName}" is ${Math.round(bytes.byteLength / (1024 * 1024))} MB. The limit is ${MAX_IMAGE_BYTES / (1024 * 1024)} MB.`);
    }

    return decodeImage(`data:${mimeType};base64,${bytesToBase64(bytes)}`, fileName);
}

/** Decodes a `File`/`Blob` coming from a paste or a drop. */
export async function importImageFromBlob(blob: Blob, fileName?: string): Promise<LoadedImage> {
    if (!SUPPORTED_MIME_TYPES.includes(blob.type)) {
        throw new ImageImportError('That item is not a supported image. Use a PNG, JPG, GIF, WEBP or BMP screenshot.');
    }
    if (blob.size > MAX_IMAGE_BYTES) {
        throw new ImageImportError(`That image is ${Math.round(blob.size / (1024 * 1024))} MB. The limit is ${MAX_IMAGE_BYTES / (1024 * 1024)} MB.`);
    }

    const bytes = new Uint8Array(await blob.arrayBuffer());
    return decodeImage(`data:${blob.type};base64,${bytesToBase64(bytes)}`, fileName);
}

/** The first supported image in a clipboard/drop payload, if any. */
export function findImageInDataTransfer(items: DataTransfer | null): File | undefined {
    if (!items) {
        return undefined;
    }
    for (const file of Array.from(items.files)) {
        if (SUPPORTED_MIME_TYPES.includes(file.type)) {
            return file;
        }
    }
    for (const item of Array.from(items.items)) {
        if (item.kind === 'file' && SUPPORTED_MIME_TYPES.includes(item.type)) {
            const file = item.getAsFile();
            if (file) {
                return file;
            }
        }
    }
    return undefined;
}

/**
 * Reads an image from the system clipboard, for the explicit "Paste" button.
 * Resolves to `undefined` when the clipboard holds no supported image.
 */
export async function importImageFromClipboard(): Promise<LoadedImage | undefined> {
    const clipboard = navigator.clipboard as Clipboard & { read?: () => Promise<ClipboardItem[]> };
    if (typeof clipboard?.read !== 'function') {
        throw new ImageImportError('This environment cannot read the clipboard. Press Ctrl+V over the drop zone, or browse for the image file.');
    }

    let items: ClipboardItem[];
    try {
        items = await clipboard.read();
    } catch {
        throw new ImageImportError('The clipboard could not be read. Press Ctrl+V over the drop zone instead.');
    }

    for (const item of items) {
        const type = item.types.find((candidate) => SUPPORTED_MIME_TYPES.includes(candidate));
        if (type) {
            return importImageFromBlob(await item.getType(type));
        }
    }

    return undefined;
}
