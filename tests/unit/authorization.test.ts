import { describe, expect, it } from "vitest";
import { canAccess, classifyLearnRoute, requiredRole, type AppUser } from "../../src/auth/authorization";

const admin: AppUser = { id: "a", email: "admin@example.com", display_name: "Admin", role: "ADMIN", status: "ACTIVE" };
const student: AppUser = { id: "s", email: "student@example.com", display_name: "Student", role: "STUDENT", status: "ACTIVE" };

describe("Learn route authorization", () => {
  it("classifies direct routes", () => {
    expect(classifyLearnRoute("/learn")).toBe("entry");
    expect(classifyLearnRoute("/learn/admin")).toBe("admin");
    expect(classifyLearnRoute("/learn/admin/calendar")).toBe("admin-calendar");
    expect(classifyLearnRoute("/learn/student/lessons")).toBe("student");
    expect(classifyLearnRoute("/learn/student/calendar")).toBe("student-calendar");
    expect(classifyLearnRoute("/learn/admin/students/new")).toBe("admin-student-form");
    expect(classifyLearnRoute("/learn/admin/lessons/lesson-1/status")).toBe("admin-lesson-status");
    expect(classifyLearnRoute("/learn/student/lessons/lesson-1")).toBe("student-lesson");
    expect(classifyLearnRoute("/learn/assets/learn.css")).toBe("asset");
    expect(classifyLearnRoute("/learn/assets/foxlearninglogo-240.webp")).toBe("asset");
    expect(classifyLearnRoute("/learn/assets/fonts/geist-latin-wght-normal.woff2")).toBe("asset");
    expect(classifyLearnRoute("/learn/assets/my-favicon/site.webmanifest")).toBe("asset");
    expect(classifyLearnRoute("/learn/nope")).toBe("not-found");
    expect(classifyLearnRoute("/learn.css")).toBe("not-found");
  });
  it("enforces role boundaries", () => {
    expect(canAccess(admin, "admin")).toBe(true);
    expect(canAccess(admin, "student")).toBe(false);
    expect(canAccess(student, "student")).toBe(true);
    expect(canAccess(student, "admin")).toBe(false);
    expect(requiredRole("admin")).toBe("ADMIN");
  });
});
