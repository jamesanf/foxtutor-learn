import { describe, expect, it } from "vitest";
import { reportDocumentTitleFromIsoDate, reportPdfFilenameFromIsoDate } from "../../src/domain/report-title";

describe("lesson report document titles", () => {
  it("formats the report date-first title and filename", () => {
    expect(reportDocumentTitleFromIsoDate("2026-09-13")).toBe("26/09/13 - FoxTutor Lesson Report");
    expect(reportPdfFilenameFromIsoDate("2026-09-13")).toBe("26-09-13 - FoxTutor Lesson Report.pdf");
  });

  it("uses safe fallbacks for incomplete dates", () => {
    expect(reportDocumentTitleFromIsoDate("")).toBe("FoxTutor Lesson Report");
    expect(reportPdfFilenameFromIsoDate("")).toBe("FoxTutor Lesson Report.pdf");
  });
});
