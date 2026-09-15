import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const workerSource = readFileSync("src/worker/index.ts", "utf8");

describe("billing alert action contract", () => {
  it("accepts encoded billing alert identifiers instead of treating them as UUID entity keys", () => {
    expect(workerSource).toContain("function billingAlertIdFromPathSegment(value: string): string | null");
    expect(workerSource).toContain("return decoded && /^billing-alert:[A-Za-z0-9._:-]+$/.test(decoded) ? decoded : null;");
    expect(workerSource).toContain("const alertId = billingAlertIdFromPathSegment(alertMatch[1] ?? \"\");");
    expect(workerSource).toContain("action !== \"ACKNOWLEDGE\" && action !== \"RESOLVE\"");
  });

  it("explains the distinction between acknowledging and resolving an alert", () => {
    expect(workerSource).toContain("Acknowledge records that you have seen an alert and keeps it open");
    expect(workerSource).toContain("Resolve closes it after the provider state has been reconciled");
  });
});
