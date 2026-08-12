import { bytesToBase64 } from "./base64";
import {
  DataverseOperationError,
  IMAGE_WEB_RESOURCE_TYPES,
  WEB_RESOURCE_TYPE,
  imageMimeType,
  imageTypeFromFileName,
  readWebResource,
} from "./webResources";

/**
 * Header logo handling: read an existing image web resource for the preview,
 * or pick a local image to upload as a new one. Both routes are required
 * (docs/IMPLEMENTATION_PLAN.md §2.7, owner decision §7.3).
 */

/** Size Microsoft recommends for the app header logo. */
export const RECOMMENDED_LOGO_SIZE = { width: 156, height: 48 };

export interface LocalLogoFile {
  path: string;
  fileName: string;
  /** `webresourcetype` inferred from the extension (5 / 6 / 7 / 10 / 11). */
  webResourceType: number;
  contentBase64: string;
  dataUri: string;
  /** Pixel size, when it could be measured (never for SVG/ICO). */
  dimensions?: { width: number; height: number };
}

const IMAGE_FILTERS = [
  { name: "Images", extensions: ["png", "jpg", "jpeg", "gif", "svg", "ico"] },
];

function fileNameOf(path: string): string {
  return path.split(/[\\/]/).pop() ?? path;
}

/** Builds the `data:` URI the preview renders the logo from. */
export function toDataUri(
  webResourceType: number,
  contentBase64: string,
): string {
  return `data:${imageMimeType(webResourceType)};base64,${contentBase64}`;
}

/**
 * Measures an image `data:` URI. Resolves to `undefined` when the browser
 * can't determine a size (ICO, or a malformed image).
 */
export function measureImage(
  dataUri: string,
): Promise<{ width: number; height: number } | undefined> {
  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () =>
      resolve(
        image.naturalWidth && image.naturalHeight
          ? { width: image.naturalWidth, height: image.naturalHeight }
          : undefined,
      );
    image.onerror = () => resolve(undefined);
    image.src = dataUri;
  });
}

/** Human-readable warning when the logo doesn't match the recommended size. */
export function logoSizeWarning(
  dimensions: { width: number; height: number } | undefined,
): string | undefined {
  if (!dimensions) {
    return undefined;
  }
  if (
    dimensions.width === RECOMMENDED_LOGO_SIZE.width &&
    dimensions.height === RECOMMENDED_LOGO_SIZE.height
  ) {
    return undefined;
  }
  return `This image is ${dimensions.width} × ${dimensions.height} px. The recommended size is ${RECOMMENDED_LOGO_SIZE.width} × ${RECOMMENDED_LOGO_SIZE.height} px — logos that are too large don't display in the app header.`;
}

/**
 * Prompts for a local image and reads it as base64.
 * Resolves to `undefined` when the user cancels the dialog.
 */
export async function pickLocalLogo(): Promise<LocalLogoFile | undefined> {
  const path = await window.toolboxAPI.fileSystem.selectPath({
    type: "file",
    title: "Select a logo image",
    filters: IMAGE_FILTERS,
  });

  if (!path) {
    return undefined;
  }

  const fileName = fileNameOf(path);
  const webResourceType = imageTypeFromFileName(fileName);
  if (webResourceType === undefined) {
    throw new DataverseOperationError(
      `"${fileName}" is not a supported image type. Use PNG, JPG, GIF, SVG or ICO.`,
    );
  }

  const buffer = await window.toolboxAPI.fileSystem.readBinary(path);
  const contentBase64 = bytesToBase64(new Uint8Array(buffer));
  const dataUri = toDataUri(webResourceType, contentBase64);
  // SVGs are measured too — the browser reports their intrinsic size when
  // the document declares one.
  const dimensions =
    webResourceType === WEB_RESOURCE_TYPE.ico
      ? undefined
      : await measureImage(dataUri);

  return {
    path,
    fileName,
    webResourceType,
    contentBase64,
    dataUri,
    dimensions,
  };
}

/** Reads an image web resource and returns the `data:` URI for the preview. */
export async function readLogoDataUri(
  webResourceId: string,
): Promise<string | undefined> {
  const resource = await readWebResource(webResourceId);
  if (!IMAGE_WEB_RESOURCE_TYPES.includes(resource.webResourceType)) {
    throw new DataverseOperationError(
      `"${resource.name}" is not an image web resource.`,
    );
  }
  return resource.contentBase64
    ? toDataUri(resource.webResourceType, resource.contentBase64)
    : undefined;
}

/**
 * Suggests a web resource local name (the part after the publisher prefix)
 * from a file name, following the `/images/<file>` folder convention used for
 * theme logos — preserving the original file name and extension.
 */
export function suggestLogoName(fileName: string): string {
  const trimmed = fileName.trim();
  const extensionMatch = trimmed.match(/\.[^./]+$/);
  const extension = (extensionMatch?.[0] ?? "").toLowerCase();
  const baseName = extension ? trimmed.slice(0, -extension.length) : trimmed;
  const safeBase =
    baseName.replace(/[^A-Za-z0-9_.-]+/g, "-").replace(/^-+|-+$/g, "") ||
    "app-logo";
  return `/images/${safeBase}${extension}`;
}
