import { describe, expect, it } from "vitest";
import { privateHeaders } from "../../src/security/headers";
import { cookie, parseCookies } from "../../src/security/cookies";

describe("private security defaults", () => {
  it("sets defense-in-depth noindex and browser security headers", () => {
    const headers = privateHeaders("text/html");
    expect(headers.get("X-Robots-Tag")).toBe("noindex, nofollow, noarchive, nosnippet");
    expect(headers.get("Content-Security-Policy")).toContain("frame-ancestors 'none'");
  });
  it("marks session cookies secure and HttpOnly", () => {
    expect(cookie("learn_session", "token", 60, true)).toContain("Secure; HttpOnly; SameSite=Strict");
    const request = { headers: { get: (name: string) => name.toLowerCase() === "cookie" ? "a=1; b=two" : null } } as Request;
    expect(parseCookies(request)).toEqual({ a: "1", b: "two" });
  });
});
