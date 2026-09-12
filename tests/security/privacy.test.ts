import { describe, expect, it } from "vitest";
import { privateHeaders } from "../../src/security/headers";

describe("privacy boundary", () => {
  it("requires both header and meta noindex safeguards in the application contract", () => {
    expect(privateHeaders("text/html").get("X-Robots-Tag")).toContain("noindex");
    expect('<meta name="robots" content="noindex,nofollow,noarchive,nosnippet">').toContain("noindex");
  });
});
