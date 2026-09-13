import type { StudentLessonReportViewModel } from "./view";

const PAGE_WIDTH = 595;
const PAGE_HEIGHT = 842;
const MARGIN = 40;
const BLUE = "0.055 0.455 0.565";
const INK = "0.09 0.13 0.2";
const LINE = "0.72 0.78 0.83";

function pdfSafe(value: string): string {
  return value
    .replace(/[^\x20-\xFF]/g, (character) => character === "–" ? "-" : "?")
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
}

function pdfBytes(value: string): Uint8Array {
  return Uint8Array.from(value, (character) => character.charCodeAt(0) & 0xff);
}

function wrap(value: string, width: number): string[] {
  const lines: string[] = [];
  for (const paragraph of value.split(/\r?\n/)) {
    const words = paragraph.split(/\s+/).filter(Boolean);
    if (!words.length) {
      lines.push("");
      continue;
    }
    let line = "";
    for (const word of words) {
      if (!line) {
        line = word;
      } else if ((line.length + word.length + 1) <= width) {
        line += ` ${word}`;
      } else {
        lines.push(line);
        line = word;
      }
    }
    if (line) lines.push(line);
  }
  return lines.length ? lines : [""];
}

function text(commands: string[], x: number, y: number, value: string, size = 10, color = INK, bold = false): void {
  commands.push(`${color} rg /${bold ? "F2" : "F1"} ${size} Tf ${x} ${y} Td (${pdfSafe(value)}) Tj`);
}

function rect(commands: string[], x: number, y: number, width: number, height: number, fill = false): void {
  commands.push(`${fill ? "0.97 0.985 0.99 rg " : ""}${LINE} RG 0.7 w ${x} ${y} ${width} ${height} re ${fill ? "B" : "S"}`);
}

function footer(commands: string[], page: number, total: number): void {
  commands.push(`${LINE} RG 0.6 w ${MARGIN} 30 m ${PAGE_WIDTH - MARGIN} 30 l S`);
  text(commands, MARGIN, 18, "© 2026 Fox Learning Ltd. All rights reserved.", 7, "0.35 0.4 0.45");
  text(commands, PAGE_WIDTH - 78, 18, `Page ${page} of ${total}`, 7, "0.35 0.4 0.45");
}

function headerPage(report: StudentLessonReportViewModel, total: number): string[] {
  const commands: string[] = ["q"];
  text(commands, MARGIN, PAGE_HEIGHT - 48, "FoxTutor Learn", 20, BLUE, true);
  text(commands, MARGIN, PAGE_HEIGHT - 68, "Lesson Report", 10, "0.35 0.4 0.45");
  const top = PAGE_HEIGHT - 100;
  const height = 92;
  const brandingWidth = 190;
  const cellWidth = (PAGE_WIDTH - 2 * MARGIN - brandingWidth) / 3;
  rect(commands, MARGIN, top - height, PAGE_WIDTH - 2 * MARGIN, height);
  commands.push(`${LINE} RG 0.7 w ${MARGIN + brandingWidth} ${top - height} m ${MARGIN + brandingWidth} ${top} l S`);
  for (let index = 1; index < 3; index++) {
    const x = MARGIN + brandingWidth + cellWidth * index;
    commands.push(`${LINE} RG 0.7 w ${x} ${top - height} m ${x} ${top} l S`);
  }
  text(commands, MARGIN + 18, top - 32, "FoxTutor", 17, BLUE, true);
  text(commands, MARGIN + 18, top - 50, "Learn", 11, INK);
  text(commands, MARGIN + brandingWidth + 12, top - 23, "Lesson Date", 8, "0.35 0.4 0.45", true);
  text(commands, MARGIN + brandingWidth + 12, top - 48, report.lessonDate, 12, INK);
  text(commands, MARGIN + brandingWidth + cellWidth + 12, top - 23, "Pupil", 8, "0.35 0.4 0.45", true);
  text(commands, MARGIN + brandingWidth + cellWidth + 12, top - 48, report.pupilName, 12, INK);
  text(commands, MARGIN + brandingWidth + cellWidth * 2 + 12, top - 23, "Level", 8, "0.35 0.4 0.45", true);
  text(commands, MARGIN + brandingWidth + cellWidth * 2 + 12, top - 48, report.level, 12, INK);
  text(commands, MARGIN, top - height - 35, report.lessonTime ? `${report.lessonTime} (${report.lessonTimezone})` : report.lessonTimezone, 9, "0.35 0.4 0.45");
  footer(commands, 1, total);
  commands.push("Q");
  return commands;
}

const feedbackFields: Array<[string, keyof StudentLessonReportViewModel]> = [
  ["This Lesson's Focus", "thisLessonsFocus"],
  ["Next Lesson's Focus", "nextLessonsFocus"],
  ["Writing Practice", "writingPractice"],
  ["Home Learning Task", "homeLearningTask"],
  ["Notes", "notes"],
  ["Even Better If", "evenBetterIf"]
];

function feedbackPage(report: StudentLessonReportViewModel, page: number, total: number, chunks: string[][]): string[] {
  const commands: string[] = ["q"];
  text(commands, MARGIN, PAGE_HEIGHT - 52, "Tutorial Feedback", 17, BLUE, true);
  text(commands, MARGIN, PAGE_HEIGHT - 72, `${report.lessonDate} · ${report.pupilName}`, 9, "0.35 0.4 0.45");
  const gap = 12;
  const width = (PAGE_WIDTH - 2 * MARGIN - gap) / 2;
  const height = 208;
  const startY = PAGE_HEIGHT - 102;
  for (let index = 0; index < feedbackFields.length; index++) {
    const row = Math.floor(index / 2);
    const column = index % 2;
    const x = MARGIN + column * (width + gap);
    const y = startY - row * (height + gap) - height;
    rect(commands, x, y, width, height, true);
    text(commands, x + 12, y + height - 24, feedbackFields[index][0], 9, BLUE, true);
    const lines = chunks[index] ?? [""];
    lines.slice(0, 15).forEach((line, lineIndex) => text(commands, x + 12, y + height - 45 - lineIndex * 11, line, 8.5));
  }
  footer(commands, page, total);
  commands.push("Q");
  return commands;
}

function buildDocument(pages: string[]): ArrayBuffer {
  const objects: string[] = [];
  const pageObjectNumbers: number[] = [];
  objects.push("<< /Type /Catalog /Pages 2 0 R >>");
  objects.push("<< /Type /Pages /Kids [] /Count 0 >>");
  objects.push("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
  objects.push("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>");
  for (const page of pages) {
    const stream = `${page}\n`;
    const contentObject = objects.length + 1;
    objects.push(`<< /Length ${pdfBytes(stream).byteLength} >>\nstream\n${stream}endstream`);
    const pageObject = objects.length + 1;
    objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${contentObject} 0 R >>`);
    pageObjectNumbers.push(pageObject);
  }
  objects[1] = `<< /Type /Pages /Kids [${pageObjectNumbers.map((number) => `${number} 0 R`).join(" ")}] /Count ${pageObjectNumbers.length} >>`;
  let output = "%PDF-1.4\n%\xE2\xE3\xCF\xD3\n";
  const offsets: number[] = [0];
  for (let index = 0; index < objects.length; index++) {
    offsets.push(pdfBytes(output).byteLength);
    output += `${index + 1} 0 obj\n${objects[index]}\nendobj\n`;
  }
  const xref = pdfBytes(output).byteLength;
  output += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let index = 1; index <= objects.length; index++) output += `${String(offsets[index]).padStart(10, "0")} 00000 n \n`;
  output += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  const bytes = pdfBytes(output);
  const result = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(result).set(bytes);
  return result;
}

export function generateLessonReportPdf(report: StudentLessonReportViewModel): ArrayBuffer {
  const fieldChunks = feedbackFields.map(([, key]) => {
    const lines = wrap(String(report[key] ?? ""), 42);
    const chunks: string[][] = [];
    for (let index = 0; index < lines.length; index += 15) chunks.push(lines.slice(index, index + 15));
    return chunks.length ? chunks : [[""]];
  });
  const feedbackPageCount = Math.max(...fieldChunks.map((chunks) => chunks.length), 1);
  const total = feedbackPageCount + 1;
  const pages = [headerPage(report, total).join("\n")];
  for (let pageIndex = 0; pageIndex < feedbackPageCount; pageIndex++) {
    pages.push(feedbackPage(report, pageIndex + 2, total, fieldChunks.map((chunks) => chunks[pageIndex] ?? [""])).join("\n"));
  }
  return buildDocument(pages);
}
