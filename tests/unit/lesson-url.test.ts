import { describe, expect, it } from "vitest";
import { compactUuidKey, entityIdFromUrlKey, entityUrlKey, lessonIdFromUrlKey, lessonUrlKey, uuidFromCompactKey } from "../../src/domain/lesson-url";

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

  it("accepts materialised recurring lesson identifiers", () => {
    const id = "lesson:9c4a0309-86a4-4823-9b34-73dfd58bf947:2026-09-17";
    const key = lessonUrlKey(id);
    expect(key).toBe("lesson:nEoDCYakSCObNHPf1Yv5Rw:2026-09-17");
    expect(lessonIdFromUrlKey(key)).toBe(id);
  });

  it("compacts nested lesson UUIDs in billing event route keys", () => {
    const id = "billing:lesson:9c4a0309-86a4-4823-9b34-73dfd58bf947:2026-09-17";
    const key = entityUrlKey(id);
    expect(key).toBe("billing:lesson:nEoDCYakSCObNHPf1Yv5Rw:2026-09-17");
    expect(entityIdFromUrlKey(key)).toBe(id);
  });

  it("compacts billing invoice UUIDs in invoice detail route keys", () => {
    const id = "invoice:billing:eb80ea14-9f0a-45cc-a068-82d030099bb1";
    const key = entityUrlKey(id);
    expect(key).toBe("invoice:billing:64DqFJ8KRcygaILQMAmbsQ");
    expect(entityIdFromUrlKey(key)).toBe(id);
  });

  it("compacts materialised lesson UUIDs inside billing event keys", () => {
    const id = "billing:lesson:lesson:9c4a0309-86a4-4823-9b34-73dfd58bf947:2026-09-17";
    const key = entityUrlKey(id);
    expect(key).toBe("billing:lesson:lesson:nEoDCYakSCObNHPf1Yv5Rw:2026-09-17");
    expect(entityIdFromUrlKey(key)).toBe(id);
  });

  it("provides compact keys for recurring series routes", () => {
    const id = "ba96d1a1-2ab5-4f7e-ba46-2f881c3311d1";
    const key = compactUuidKey(id);
    expect(key).toBe("upbRoSq1T366Ri-IHDMR0Q");
    expect(uuidFromCompactKey(key)).toBe(id);
  });

  it("uses the same compact key convention for every UUID-backed route entity", () => {
    const id = "23200281-0000-4000-8000-000000000001";
    const key = entityUrlKey(id);
    expect(key).toHaveLength(22);
    expect(entityIdFromUrlKey(key)).toBe(id);
    expect(entityIdFromUrlKey(id)).toBe(id);
  });
});
