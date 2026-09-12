import { describe, expect, it } from "vitest";
import { normalizeEmail } from "../../src/auth/identity";

describe("identity normalization", () => {
  it("normalizes safe email identities", () => {
    expect(normalizeEmail("  Student@Example.COM ")).toBe("student@example.com");
  });
  it("rejects malformed identities", () => {
    expect(normalizeEmail("not-an-email")).toBeNull();
    expect(normalizeEmail("")).toBeNull();
  });
});
