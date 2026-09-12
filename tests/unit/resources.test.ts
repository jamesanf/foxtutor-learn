import { describe, expect, it } from "vitest";
import { MAX_RESOURCE_SIZE_BYTES, hasExpectedSignature, safeDisplayFilename, validateResourceFile } from "../../src/resources/policy";

describe("resource file policy", () => {
  it("accepts supported files only when the type and filename agree", () => {
    const file = new File([new TextEncoder().encode("%PDF-1.7")], "Algebra Worksheet.pdf", { type: "application/pdf" });
    const result = validateResourceFile(file);
    expect(result).toMatchObject({ filename: "Algebra Worksheet.pdf", extension: "pdf", contentType: "application/pdf" });
  });

  it("rejects dangerous extensions, path-like filenames and oversized files", () => {
    expect(safeDisplayFilename("../notes.pdf")).toBeNull();
    expect(validateResourceFile(new File(["alert(1)"], "script.js", { type: "application/javascript" }))).toEqual({ error: "This file type is not supported." });
    const oversized = new File([new Uint8Array(MAX_RESOURCE_SIZE_BYTES + 1)], "large.pdf", { type: "application/pdf" });
    expect(validateResourceFile(oversized)).toEqual({ error: "This file is too large. The maximum is 25 MB." });
  });

  it("checks binary signatures before storage", () => {
    expect(hasExpectedSignature("pdf", new TextEncoder().encode("%PDF-1.7"))).toBe(true);
    expect(hasExpectedSignature("pdf", new TextEncoder().encode("not a pdf"))).toBe(false);
    expect(hasExpectedSignature("png", new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))).toBe(true);
  });
});
