import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const workerSource = readFileSync("src/worker/index.ts", "utf8");
const clientSource = readFileSync("src/client/learn.ts", "utf8");
const cssSource = readFileSync("public/learn.css", "utf8");

describe("resource UX contract", () => {
  it("removes category from application code and resource surfaces", () => {
    expect(workerSource).not.toMatch(/\bcategory\b/i);
    expect(readFileSync("src/db/resources.ts", "utf8")).not.toMatch(/\bcategory\b/i);
    expect(readFileSync("src/resources/policy.ts", "utf8")).not.toMatch(/\bcategory\b/i);
    expect(workerSource).toContain("<h1>Add resource</h1>");
    expect(workerSource).toContain("<th>File</th><th>Student</th><th>Lesson</th><th>Uploaded</th><th>Actions</th>");
    expect(workerSource).not.toContain("PRIVATE RESOURCE");
  });

  it("uses contextual lesson/student entry points and a generic fallback", () => {
    expect(workerSource).toContain("/learn/admin/resources/new?student=");
    expect(workerSource).toContain("&lesson=");
    expect(workerSource).toContain('returnContext: "lesson"');
    expect(workerSource).toContain('returnContext: "student"');
    expect(workerSource).toContain('returnContext: "resources"');
    expect(workerSource).toContain("resolveResourceUploadContext");
    expect(workerSource).toContain("This lesson does not belong to the selected student.");
  });

  it("provides an accessible dropzone and explicit upload states", () => {
    expect(workerSource).toContain("data-file-dropzone");
    expect(workerSource).toContain('role="button"');
    expect(workerSource).toContain('aria-label="Choose resource file"');
    expect(workerSource).toContain("data-upload-status");
    expect(clientSource).toContain("dragover");
    expect(clientSource).toContain("Change file");
    expect(clientSource).toContain("Uploading…");
    expect(clientSource).toContain("submit.disabled = true");
    expect(cssSource).toContain(".resource-file-dropzone");
    expect(cssSource).toContain(".resource-fields { display: grid; grid-template-columns: repeat(2");
    expect(cssSource).toContain(".resource-fields { grid-template-columns: 1fr; gap: 0; }");
    expect(cssSource).toContain("overflow: hidden");
  });
});
