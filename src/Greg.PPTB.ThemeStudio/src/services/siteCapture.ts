/**
 * The "from a URL" half of the colour-extraction wizard.
 *
 * PPTB exposes **no** screenshot or page-capture API (verified against
 * `@pptb/types`: `fileSystem`, `settings`, `events`, `terminal`, `invocation`
 * and `utils` only), so v1 resolves a URL through an **assisted capture**: the
 * site is opened in the connection browser, the user takes the screenshot and
 * pastes or drops it back into the tool. Nothing leaves the machine and no CSP
 * exception is needed (docs/IMPLEMENTATION_PLAN.md §2.14, Phase 6.4).
 *
 * The shape below is deliberately provider-oriented so an automatic capture
 * (headless browser, or an opt-in third-party service) can be slotted in later
 * behind an off-by-default switch without touching the wizard.
 */

/** A URL that can't be captured, with a message meant for the user. */
export class SiteCaptureError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'SiteCaptureError';
    }
}

/** How a site capture was — or wasn't — obtained. */
export type CaptureMode = 'assisted';

export interface AssistedCaptureResult {
    mode: CaptureMode;
    /** The normalised URL that was opened. */
    url: string;
    /** What the user has to do next, shown in the wizard. */
    instructions: string;
}

/**
 * Validates and normalises a site address.
 *
 * Only `http:`/`https:` are accepted — the same restriction
 * `openInConnectionBrowser` enforces — and credentials embedded in the URL are
 * rejected so they can never be echoed back in the UI or opened in a browser.
 */
export function normalizeSiteUrl(input: string): string {
    const trimmed = input.trim();
    if (!trimmed) {
        throw new SiteCaptureError('Enter the address of the website.');
    }

    // A bare "contoso.com" is what people type; anything with an explicit
    // scheme is left alone so a wrong one is reported rather than hidden.
    const candidate = /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed) ? trimmed : `https://${trimmed}`;

    let url: URL;
    try {
        url = new URL(candidate);
    } catch {
        throw new SiteCaptureError(`"${input}" is not a valid website address.`);
    }

    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
        throw new SiteCaptureError('Only http:// and https:// addresses can be opened.');
    }
    if (url.username || url.password) {
        throw new SiteCaptureError('Remove the user name and password from the address before opening it.');
    }
    if (!url.hostname) {
        throw new SiteCaptureError(`"${input}" is not a valid website address.`);
    }

    return url.toString();
}

/** Whether a string is an address this tool is willing to open. */
export function isValidSiteUrl(input: string): boolean {
    try {
        normalizeSiteUrl(input);
        return true;
    } catch {
        return false;
    }
}

export const ASSISTED_CAPTURE_INSTRUCTIONS =
    'The site is opening in your browser. Take a screenshot of the page (Windows: ⊞ Win + Shift + S), then come back and paste it here with Ctrl+V, or drop the image file onto the drop zone.';

/**
 * Opens the site in the connection browser and returns the instructions for
 * pasting the screenshot back. The URL never leaves the machine.
 */
export async function captureSite(input: string): Promise<AssistedCaptureResult> {
    const url = normalizeSiteUrl(input);

    try {
        await window.toolboxAPI.utils.openInConnectionBrowser(url);
    } catch (error) {
        throw new SiteCaptureError(`The site couldn't be opened: ${error instanceof Error ? error.message : String(error)}`);
    }

    return { mode: 'assisted', url, instructions: ASSISTED_CAPTURE_INSTRUCTIONS };
}
