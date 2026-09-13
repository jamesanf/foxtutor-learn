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

function binaryString(bytes: Uint8Array): string {
  let value = "";
  for (const byte of bytes) value += String.fromCharCode(byte);
  return value;
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
  commands.push(`BT ${color} rg /${bold ? "F2" : "F1"} ${size} Tf ${x} ${y} Td (${pdfSafe(value)}) Tj ET`);
}

function rect(commands: string[], x: number, y: number, width: number, height: number, fill = false): void {
  commands.push(`${fill ? "0.97 0.985 0.99 rg " : ""}${LINE} RG 0.7 w ${x} ${y} ${width} ${height} re ${fill ? "B" : "S"}`);
}

function footer(commands: string[]): void {
  commands.push(`${LINE} RG 0.6 w ${MARGIN} 30 m ${PAGE_WIDTH - MARGIN} 30 l S`);
  text(commands, MARGIN, 18, `© ${new Date().getFullYear()} Fox Learning Ltd. All rights reserved.`, 7, "0.35 0.4 0.45");
  text(commands, PAGE_WIDTH - 78, 18, "Page 1 of 1", 7, "0.35 0.4 0.45");
}

function reportHeader(commands: string[], report: StudentLessonReportViewModel, hasLogo: boolean): number {
  const top = PAGE_HEIGHT - MARGIN;
  const height = 112;
  const width = PAGE_WIDTH - 2 * MARGIN;
  const columnWidth = width / 4;
  commands.push(`${BLUE} rg ${MARGIN} ${top - 42} ${width} 42 re f`);
  if (hasLogo) commands.push(`q 31 0 0 30 ${MARGIN + 12} ${top - 36} cm /Im1 Do Q`);
  text(commands, MARGIN + 50, top - 27, "FoxTutor Learn", 17, "1 1 1", true);
  text(commands, MARGIN + width - 112, top - 27, "Lesson Report", 9, "1 1 1");
  rect(commands, MARGIN, top - height, width, height - 42, true);
  for (let index = 1; index < 4; index++) {
    const x = MARGIN + columnWidth * index;
    commands.push(`${LINE} RG 0.7 w ${x} ${top - height} m ${x} ${top - 42} l S`);
  }
  const metadata: Array<[string, string]> = [
    ["Date", report.lessonDate],
    ["Pupil", report.pupilName],
    ["Time", report.lessonTime],
    ["Level", report.level]
  ];
  metadata.forEach(([label, value], index) => {
    const x = MARGIN + columnWidth * index + 12;
    text(commands, x, top - 68, label, 8, BLUE, true);
    text(commands, x, top - 92, value, 10.5, INK);
  });
  return top - height - 24;
}

const feedbackFields: Array<[string, keyof StudentLessonReportViewModel]> = [
  ["This Lesson's Focus", "thisLessonsFocus"],
  ["Next Lesson's Focus", "nextLessonsFocus"],
  ["Even Better If", "evenBetterIf"],
  ["Home Learning Task", "homeLearningTask"],
  ["Notes", "notes"]
];

function feedbackField(
  commands: string[],
  report: StudentLessonReportViewModel,
  label: string,
  key: keyof StudentLessonReportViewModel,
  x: number,
  y: number,
  width: number,
  height: number,
  lineHeight: number
): void {
  rect(commands, x, y, width, height, true);
  text(commands, x + 11, y + height - 21, label, 8.5, BLUE, true);
  const lines = wrap(String(report[key] ?? ""), Math.max(28, Math.floor(width / 5.1)));
  lines.forEach((line, index) => text(commands, x + 11, y + height - 39 - index * lineHeight, line, Math.max(5.5, lineHeight - 1.5)));
}

function singlePage(report: StudentLessonReportViewModel, hasLogo: boolean): string[] {
  const commands: string[] = ["q"];
  const feedbackTop = reportHeader(commands, report, hasLogo);
  text(commands, MARGIN, feedbackTop, "Tutorial Feedback", 13, BLUE, true);
  const gap = 9;
  const halfWidth = (PAGE_WIDTH - 2 * MARGIN - gap) / 2;
  const fullWidth = PAGE_WIDTH - 2 * MARGIN;
  const widths = [halfWidth, halfWidth, halfWidth, halfWidth, fullWidth];
  const lineSets = feedbackFields.map(([, key], index) => wrap(String(report[key] ?? ""), Math.max(28, Math.floor(widths[index] / 5.1))));
  const availableHeight = feedbackTop - 22 - 58;
  let lineHeight = 9;
  const calculateHeights = (lineSize: number): [number, number, number] => {
    const height = (lines: string[]) => Math.max(60, lines.length * lineSize + 39);
    return [Math.max(height(lineSets[0]), height(lineSets[1])), Math.max(height(lineSets[2]), height(lineSets[3])), height(lineSets[4])];
  };
  while (lineHeight > 3.5) {
    const heights = calculateHeights(lineHeight);
    if (heights[0] + heights[1] + heights[2] + gap * 2 <= availableHeight) break;
    lineHeight -= 0.5;
  }
  const [rowHeight, secondRowHeight, fullRowHeight] = calculateHeights(lineHeight);
  const firstRowY = feedbackTop - 22 - rowHeight;
  const secondRowY = firstRowY - gap - secondRowHeight;
  feedbackField(commands, report, feedbackFields[0][0], feedbackFields[0][1], MARGIN, firstRowY, halfWidth, rowHeight, lineHeight);
  feedbackField(commands, report, feedbackFields[1][0], feedbackFields[1][1], MARGIN + halfWidth + gap, firstRowY, halfWidth, rowHeight, lineHeight);
  feedbackField(commands, report, feedbackFields[2][0], feedbackFields[2][1], MARGIN, secondRowY, halfWidth, secondRowHeight, lineHeight);
  feedbackField(commands, report, feedbackFields[3][0], feedbackFields[3][1], MARGIN + halfWidth + gap, secondRowY, halfWidth, secondRowHeight, lineHeight);
  feedbackField(commands, report, feedbackFields[4][0], feedbackFields[4][1], MARGIN, secondRowY - gap - fullRowHeight, fullWidth, fullRowHeight, lineHeight);
  footer(commands);
  commands.push("Q");
  return commands;
}

function buildDocument(pages: string[], logoJpeg?: Uint8Array): ArrayBuffer {
  const objects: string[] = [];
  const pageObjectNumbers: number[] = [];
  objects.push("<< /Type /Catalog /Pages 2 0 R >>");
  objects.push("<< /Type /Pages /Kids [] /Count 0 >>");
  objects.push("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>");
  objects.push("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>");
  const logoObjectNumber = logoJpeg ? objects.length + 1 : undefined;
  if (logoJpeg) {
    objects.push(`<< /Type /XObject /Subtype /Image /Width 240 /Height 230 /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${logoJpeg.byteLength} >>\nstream\n${binaryString(logoJpeg)}\nendstream`);
  }
  for (const page of pages) {
    const stream = `${page}\n`;
    const contentObject = objects.length + 1;
    objects.push(`<< /Length ${pdfBytes(stream).byteLength} >>\nstream\n${stream}endstream`);
    const pageObject = objects.length + 1;
    const imageResources = logoObjectNumber ? ` /XObject << /Im1 ${logoObjectNumber} 0 R >>` : "";
    objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >>${imageResources} >> /Contents ${contentObject} 0 R >>`);
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

export function generateLessonReportPdf(report: StudentLessonReportViewModel, logoJpeg?: Uint8Array): ArrayBuffer {
  return buildDocument([singlePage(report, Boolean(logoJpeg)).join("\n")], logoJpeg);
}
