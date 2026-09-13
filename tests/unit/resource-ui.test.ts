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

  it("submits report attachments through the report action without a second upload page", () => {
    expect(workerSource).toContain('enctype="multipart/form-data" data-report-attachment-form');
    expect(workerSource).toContain('name="attachments"');
    expect(workerSource).toContain('form.getAll("attachments")');
    expect(workerSource).toContain("attachments.length > 5");
    expect(workerSource).toContain("if (wantsSend)");
    expect(workerSource).toContain('multiple accept=".pdf,.docx,.txt,.png,.jpg,.jpeg,.webp"');
    expect(workerSource).toContain("resourceUpload(request, env, active, [studentRecord], [lesson], uploadForm, true)");
    expect(workerSource).toContain("if (uploadResponse.status !== 204)");
    expect(workerSource).not.toContain('data-upload-submit hidden>Upload attachment');
    expect(clientSource).toContain('".resource-upload-form, [data-report-attachment-form]"');
    expect(clientSource).toContain("Add another file");
    expect(clientSource).toContain("if (reportAttachmentForm) return;");
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
    expect(workerSource).toContain("Search resources…");
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
    expect(workerSource).not.toContain("resource-active-filters");
    expect(workerSource).not.toContain("resource-filter-chip");
    expect(workerSource).toContain(">Filters</button>");
    expect(workerSource.match(/resource-clear-all/g)?.length).toBe(1);
  });

  it("keeps the student resource surface read-only and own-resource scoped", () => {
    expect(workerSource).toContain('placeholder="Search your resources…"');
    expect(workerSource).toContain('listResourcesForStudent(db, active.user.id, search)');
    expect(workerSource).toContain("findResourceForStudent");
    expect(workerSource).not.toContain('action="/learn/student/resources/bulk-delete"');
    expect(workerSource).not.toContain('data-resource-selection-toolbar"');
  });

  it("uses a minimal, non-duplicated product header", () => {
    expect(workerSource).toContain('<strong>FoxTutor Learn</strong>');
    expect(workerSource).toContain('class="header-control identity-role">ADMIN</span>');
    expect(workerSource).toContain('class="header-control link-button">Log out</button>');
    expect(workerSource).toContain('<div class="identity">${identity}<form');
    expect(workerSource).not.toContain('<strong>James Fox</strong>');
    expect(workerSource).not.toContain("FoxTutor Learn Admin");
    expect(cssSource).toContain(".identity { display: flex; min-height: 38px; align-items: center");
    expect(cssSource).toContain(".header-control { display: inline-flex; min-height: 38px; align-items: center; font-family: inherit; font-size: .78rem; font-weight: 700; line-height: 1");
    expect(cssSource).toContain(".identity-role { display: inline-flex; min-height: 38px; align-items: center");
    expect(cssSource).toContain(".link-button { display: inline-flex; min-height: 38px; align-items: center; border: 0; padding: 0 0 2px");
    expect(cssSource).toContain(".topbar { min-height: 76px; display: flex; align-items: center; justify-content: space-between; gap: 24px; padding: 12px clamp(20px, 5vw, 64px) 12px 16px");
    expect(cssSource).toContain(".topbar { gap: 12px; padding-inline: 14px 14px; padding-inline-start: 12px");
    expect(cssSource).not.toMatch(/\.identity(?:-role)?[^{}]*\b(?:top|transform|position)\s*:/);
  });

  it("defines an in-place resource application boundary", () => {
    expect(workerSource).toContain('data-resource-finder-ui');
    expect(workerSource).toContain('data-resource-results');
    expect(workerSource).toContain('X-Resource-Fragment');
    expect(clientSource).toContain("history.pushState");
    expect(clientSource).toContain('window.addEventListener("popstate"');
    expect(clientSource).toContain("AbortController");
    expect(clientSource).not.toContain("form.submit()");
    expect(cssSource).toContain("grid-template-columns: repeat(4, minmax(0, 1fr))");
    expect(cssSource).toContain(".resource-sort-icon");
    expect(cssSource).toContain("[data-resource-results].is-loading");
  });

  it("keeps filter state in the panel without duplicate controls", () => {
    expect(workerSource).toContain('data-resource-filter-toggle aria-expanded="false"');
    expect(workerSource).not.toContain("Filters${filterCount");
    expect(workerSource).not.toContain("resource-active-filters");
    expect(workerSource).not.toContain("resource-filter-chip");
    expect(workerSource.match(/resource-clear-all/g)?.length).toBe(1);
  });

  it("keeps closed filters compact and geometrically consistent", () => {
    expect(workerSource).toContain('{ value: "", label: "All" }');
    expect(workerSource).toContain('{ value: "", label: "Choose student" }');
    expect(workerSource).toContain('{ value: "", label: "Any" }');
    expect(workerSource).toContain('{ value: "7", label: "7 days" }');
    expect(workerSource).not.toContain("All students");
    expect(workerSource).not.toContain("Select a student first");
    expect(workerSource).not.toContain("Any type");
    expect(workerSource).not.toContain("Any time");
    expect(workerSource).not.toContain("Last ${filters.added} days");
    expect(clientSource).not.toContain("All students");
    expect(clientSource).not.toContain("All lessons");
    expect(cssSource).toContain("height: 42px; min-height: 42px");
    expect(cssSource).toContain("height: 38px; min-height: 38px");
    expect(cssSource).toContain("white-space: nowrap");
    expect(cssSource).toContain(".resource-choice-chevron-icon");
    expect(cssSource).toContain(".identity form { display: flex; align-items: center");
  });

  it("uses one compact pagination control family", () => {
    expect(workerSource).toContain("pagination-nav-link");
    expect(workerSource).toContain("pagination-page-link");
    expect(workerSource).toContain("function paginationControls(");
    expect(workerSource.match(/<nav class="pagination"/g)?.length).toBe(1);
    expect(cssSource).toContain(".pagination-link { display: inline-flex; min-height: 30px; align-items: center");
    expect(cssSource).toContain(".pagination-nav-link { min-height: 32px; padding: 4px 7px; font-size: .74rem; }");
    expect(cssSource).toContain(".pagination-page-link { min-width: 30px; padding: 5px 7px; }");
    expect(cssSource).toContain(".pagination { display: flex; align-items: center; justify-content: center; gap: 4px");
    expect(cssSource).toContain(".pagination-link:focus-visible");
    expect(cssSource).toContain(".pagination-link.is-disabled");
    expect(cssSource).toContain(".pagination-pages { display: inline-flex");
    expect(cssSource).toContain(".pagination { flex-wrap: wrap; }");
  });
});
