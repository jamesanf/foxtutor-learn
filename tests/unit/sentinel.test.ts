import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("billing sentinel contract", () => {
  it("uses bounded, read-only checks and the existing scheduler", () => {
    const source = readFileSync("src/billing/sentinel.ts", "utf8");
    expect(source).toContain("LIMIT 1");
    expect(source).toContain("billing_sentinel_alerts");
    expect(source).not.toMatch(/INSERT INTO (billing_events|billing_invoices|billing_payments)/);
    expect(source).not.toContain("direct_debit");
  });
});
