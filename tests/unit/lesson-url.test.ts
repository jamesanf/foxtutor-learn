import { describe, expect, it } from "vitest";
import { lessonIdFromUrlKey, lessonUrlKey } from "../../src/domain/lesson-url";

describe("lesson route keys", () => {
  it("uses a compact opaque key for generated lesson URLs", () => {
    const id = "9c4a0309-86a4-4823-9b34-73dfd58bf947";
    const key = lessonUrlKey(id);
    expect(key).toBe("nEoDCYakSCObNHPf1Yv5Rw");
    expect(key).not.toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
    expect(lessonIdFromUrlKey(key)).toBe(id);
  });

  it("continues accepting existing UUID links", () => {
    const id = "9c4a0309-86a4-4823-9b34-73dfd58bf947";
    expect(lessonIdFromUrlKey(id)).toBe(id);
  });
});
