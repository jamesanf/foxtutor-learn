import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { privateHeaders } from "../../src/security/headers";

describe("privacy boundary", () => {
  it("requires both header and meta noindex safeguards in the application contract", () => {
    expect(privateHeaders("text/html").get("X-Robots-Tag")).toContain("noindex");
    expect('<meta name="robots" content="noindex,nofollow,noarchive,nosnippet">').toContain("noindex");
  });

  it("keeps the production route limited to Learn paths", () => {
    const config = JSON.parse(readFileSync("wrangler.jsonc", "utf8")) as { routes: Array<{ pattern: string }> };
    expect(config.routes.map((route) => route.pattern)).toEqual(["foxtutor.org/learn", "foxtutor.org/learn/*"]);
  });
});
