/**
 * Web resource content travels through the Dataverse Web API as **base64
 * encoded bytes** (docs/IMPLEMENTATION_PLAN.md §2.5), so every read and write
 * of a theme XML or a logo image goes through these helpers. They are pure and
 * dependency-free, which keeps them unit testable outside the PPTB host.
 */

/** Encodes a UTF-8 string (theme XML) as base64. */
export function textToBase64(text: string): string {
    const bytes = new TextEncoder().encode(text);
    return bytesToBase64(bytes);
}

/** Decodes base64 web resource content back into a UTF-8 string. */
export function base64ToText(base64: string): string {
    return new TextDecoder().decode(base64ToBytes(base64));
}

/** Encodes raw bytes (a logo image) as base64. */
export function bytesToBase64(bytes: Uint8Array): string {
    let binary = '';
    // Chunked to stay well below the argument-count limit of `String.fromCharCode`.
    const chunkSize = 0x8000;
    for (let i = 0; i < bytes.length; i += chunkSize) {
        binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
    }
    return btoa(binary);
}

/** Decodes base64 content into raw bytes. */
export function base64ToBytes(base64: string): Uint8Array {
    const binary = atob(base64.trim());
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
}
