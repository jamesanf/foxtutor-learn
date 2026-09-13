import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const workerSource = readFileSync("src/worker/index.ts", "utf8");
const clientSource = readFileSync("src/client/learn.ts", "utf8");
const cssSource = readFileSync("public/learn.css", "utf8");
const resourceDbSource = readFileSync("src/db/resources.ts", "utf8");

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

  it("provides server-side filtering, page-scoped selection and deliberate actions", () => {
    expect(workerSource).toContain('name="student"');
    expect(workerSource).toContain('name="lesson"');
    expect(workerSource).toContain('name="type"');
    expect(workerSource).toContain('name="added"');
    expect(workerSource).toContain("resourceFilterHiddenInputs");
    expect(workerSource).toContain("/learn/admin/resources/bulk-delete");
    expect(workerSource).toContain("Select all visible resources");
    expect(workerSource).toContain('aria-label="Open ${filename}"');
    expect(workerSource).toContain('aria-label="Download ${filename}"');
    expect(workerSource).toContain('aria-label="View details for ${filename}"');
    expect(workerSource).toContain('aria-label="Delete ${filename}"');
    expect(workerSource).toContain('target="_blank" rel="noopener noreferrer"');
    expect(clientSource).toContain("data-resource-selection-toolbar");
    expect(clientSource).toContain("Delete ${selected.length} resource");
    expect(resourceDbSource).toContain("r.content_type IN");
    expect(resourceDbSource).toContain("r.created_at >= ?");
    expect(resourceDbSource).toContain("LOWER(r.original_filename)");
  });

  it("makes search primary and keeps admin refinement controls collapsed and custom", () => {
    expect(workerSource).toContain("Search files, students or lessons…");
    expect(workerSource).toContain('data-resource-filter-toggle');
    expect(workerSource).toContain('aria-expanded="false"');
    expect(workerSource).toContain('role="listbox"');
    expect(workerSource).toContain('data-suggestion-url="/learn/admin/resources/search"');
    expect(workerSource).toContain("listResourceSuggestions");
    expect(workerSource).not.toContain('<select id="resource-student-filter"');
    expect(workerSource).not.toContain('<select id="resource-lesson-filter"');
    expect(workerSource).not.toContain('<select id="resource-type-filter"');
    expect(workerSource).not.toContain('<select id="resource-added-filter"');
    expect(clientSource).toContain("ArrowDown");
    expect(clientSource).toContain("ArrowUp");
    expect(clientSource).toContain('event.key === "Escape"');
    expect(clientSource).toContain("AbortController");
    expect(cssSource).toContain(".resource-filter-panel");
    expect(cssSource).toContain(".resource-suggestions");
  });

  it("keeps the student resource surface read-only and own-resource scoped", () => {
    expect(workerSource).toContain('placeholder="Search your resources…"');
    expect(workerSource).toContain('listResourcesForStudent(db, active.user.id, search)');
    expect(workerSource).toContain("findResourceForStudent");
    expect(workerSource).not.toContain('action="/learn/student/resources/bulk-delete"');
    expect(workerSource).not.toContain('data-resource-selection-toolbar"');
  });
});
