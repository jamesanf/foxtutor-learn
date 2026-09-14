import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const workerSource = readFileSync("src/worker/index.ts", "utf8");
const cssSource = readFileSync("public/learn.css", "utf8");

describe("student profile form UI", () => {
  it("requires only pupil name and pupil email in the form", () => {
    expect(workerSource).toContain("Pupil name<input type=\"text\" name=\"name\"");
    expect(workerSource).toContain("name=\"email\" value=");
    expect(workerSource).toContain("required autocomplete=\"email\"");
    expect(workerSource).toContain("name=\"parentName\"");
    expect(workerSource).toContain("name=\"parentEmail\"");
  });

  it("uses the internal tooltip treatment and hides irrelevant academic years", () => {
    expect(workerSource).toContain("data-tooltip=\"${safeText}\"");
    expect(workerSource).not.toContain('title="${safeText}"');
    expect(workerSource).toContain("data-academic-year-field");
    expect(workerSource).toContain("dynamicAcademicSystem");
    expect(cssSource).toContain("content: attr(data-tooltip)");
    expect(cssSource).toContain(".student-form-grid");
  });

  it("provides a privacy-safe Direct Debit status and setup journey", () => {
    const billingSource = workerSource.slice(
      workerSource.indexOf("async function studentBillingPage"),
      workerSource.indexOf("async function handleStudent")
    );
    expect(billingSource).toContain("<h2 id=\"direct-debit-heading\">Direct Debit</h2>");
    expect(billingSource).toContain("secure provider flow");
    expect(billingSource).toContain("in FoxTutor Learn");
    expect(billingSource).toContain("Contact billing");
    expect(billingSource).toContain("mailto:billing@foxtutor.org");
    expect(billingSource).toContain(">billing@foxtutor.org</a>");
    expect(billingSource).not.toContain("provider reference</th>");
    expect(billingSource).not.toContain("source_event_id");
    expect(billingSource).not.toMatch(/PAYG|pay as you go|choose how to pay|payment method/i);
  });
});
