import { describe, expect, it } from "vitest";
import { decryptFeedToken, encryptFeedToken, feedTokenLast4, generateFeedToken, hashFeedToken, isFeedToken } from "../../src/security/feed-token";

describe("private calendar feed tokens", () => {
  it("uses opaque high-entropy URL-safe tokens and never hashes to the raw value", async () => {
    const first = generateFeedToken();
    const second = generateFeedToken();
    expect(first).not.toBe(second);
    expect(first).toHaveLength(43);
    expect(isFeedToken(first)).toBe(true);
    expect(feedTokenLast4(first)).toBe(first.slice(-4));
    expect(await hashFeedToken(first)).not.toBe(first);
  });

  it("rejects malformed or predictable-looking feed paths", () => {
    expect(isFeedToken("student-a")).toBe(false);
    expect(isFeedToken("123")).toBe(false);
    expect(isFeedToken("a".repeat(42))).toBe(false);
  });

  it("round-trips the private token through encrypted persistence", async () => {
    const token = generateFeedToken();
    const key = "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";
    const ciphertext = await encryptFeedToken(token, key);
    expect(ciphertext).not.toContain(token);
    await expect(decryptFeedToken(ciphertext, key)).resolves.toBe(token);
    await expect(decryptFeedToken(ciphertext, "BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB")).resolves.toBeNull();
  });
});
