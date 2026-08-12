import { describe, expect, it } from 'vitest';
import { isValidSiteUrl, normalizeSiteUrl, SiteCaptureError } from '../siteCapture';

describe('normalizeSiteUrl', () => {
    it('defaults a bare host to https', () => {
        expect(normalizeSiteUrl('contoso.com')).toBe('https://contoso.com/');
    });

    it('keeps an explicit http address', () => {
        expect(normalizeSiteUrl('http://intranet/home')).toBe('http://intranet/home');
    });

    it('rejects non-http(s) schemes', () => {
        expect(() => normalizeSiteUrl('file:///etc/passwd')).toThrow(SiteCaptureError);
        expect(() => normalizeSiteUrl('javascript:alert(1)')).toThrow(SiteCaptureError);
    });

    it('rejects credentials embedded in the address', () => {
        const withCredentials = `https://user:${'secret'}@contoso.com`;
        expect(() => normalizeSiteUrl(withCredentials)).toThrow(SiteCaptureError);
    });

    it('rejects an empty or malformed address', () => {
        expect(() => normalizeSiteUrl('   ')).toThrow(SiteCaptureError);
        expect(() => normalizeSiteUrl('https://')).toThrow(SiteCaptureError);
    });
});

describe('isValidSiteUrl', () => {
    it('reports validity without throwing', () => {
        expect(isValidSiteUrl('contoso.com')).toBe(true);
        expect(isValidSiteUrl('ftp://contoso.com')).toBe(false);
    });
});
