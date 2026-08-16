import { describe, expect, it } from "vitest";
import {
  base64ToBytes,
  base64ToText,
  bytesToBase64,
  textToBase64,
} from "../base64";
import {
  buildWebResourceName,
  imageMimeType,
  imageTypeFromFileName,
  validateWebResourceName,
  WEB_RESOURCE_TYPE,
} from "../webResources";
import { logoSizeWarning, suggestLogoName, toDataUri } from "../logo";

describe("base64", () => {
  it("round-trips UTF-8 theme XML, accents included", () => {
    const xml = "<CustomTheme font=\"'Grüße', cursive\" />";
    expect(base64ToText(textToBase64(xml))).toBe(xml);
  });

  it("round-trips binary content", () => {
    const bytes = new Uint8Array([0, 1, 2, 253, 254, 255]);
    expect(Array.from(base64ToBytes(bytesToBase64(bytes)))).toEqual(
      Array.from(bytes),
    );
  });
});

describe("web resource naming", () => {
  it("rejects empty and invalid names", () => {
    expect(validateWebResourceName("")).toBeDefined();
    expect(validateWebResourceName("my theme")).toBeDefined();
    expect(validateWebResourceName("/theme")).toBeDefined();
    expect(validateWebResourceName("a".repeat(101))).toBeDefined();
  });

  it("accepts documented characters", () => {
    expect(validateWebResourceName("themes/custom-theme.xml")).toBeUndefined();
  });

  it("prepends the publisher prefix exactly once", () => {
    expect(buildWebResourceName("contoso", "custom-theme")).toBe(
      "contoso_custom-theme",
    );
    expect(buildWebResourceName("contoso_", "_custom-theme")).toBe(
      "contoso_custom-theme",
    );
    expect(buildWebResourceName("", "custom-theme")).toBe("custom-theme");
  });
});

describe("image web resources", () => {
  it("maps file extensions to the documented type values", () => {
    expect(imageTypeFromFileName("logo.PNG")).toBe(WEB_RESOURCE_TYPE.png);
    expect(imageTypeFromFileName("logo.jpeg")).toBe(WEB_RESOURCE_TYPE.jpg);
    expect(imageTypeFromFileName("logo.svg")).toBe(WEB_RESOURCE_TYPE.svg);
    expect(imageTypeFromFileName("theme.xml")).toBeUndefined();
  });

  it("builds a renderable data URI", () => {
    expect(toDataUri(WEB_RESOURCE_TYPE.png, "AAA")).toBe(
      "data:image/png;base64,AAA",
    );
    expect(imageMimeType(WEB_RESOURCE_TYPE.svg)).toBe("image/svg+xml");
  });

  it("warns only when the size differs from 156 × 48", () => {
    expect(logoSizeWarning({ width: 156, height: 48 })).toBeUndefined();
    expect(logoSizeWarning(undefined)).toBeUndefined();
    expect(logoSizeWarning({ width: 512, height: 512 })).toContain("156 × 48");
  });

  it("suggests a folder-scoped web resource name from a file name", () => {
    expect(suggestLogoName("Company Logo (final).png")).toBe(
      "/images/Company-Logo-final.png",
    );
    expect(suggestLogoName(".png")).toBe("/images/app-logo.png");
  });
});
