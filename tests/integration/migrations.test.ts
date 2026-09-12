import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("D1 foundation", () => {
  it("contains the foundational users and sessions schema", () => {
    const migration = readFileSync("migrations/0001_foundation.sql", "utf8");
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS users");
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS sessions");
    expect(migration).toContain("CHECK (role IN ('ADMIN', 'STUDENT'))");
  });
});
