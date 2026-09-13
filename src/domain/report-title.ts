const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})/;

export function reportDocumentTitleFromIsoDate(value: string): string {
  const match = DATE_PATTERN.exec(value);
  return match
    ? `${match[1].slice(-2)}/${match[2]}/${match[3]} - FoxTutor Lesson Report`
    : "FoxTutor Lesson Report";
}

export function reportPdfFilenameFromIsoDate(value: string): string {
  const match = DATE_PATTERN.exec(value);
  return match
    ? `${match[1].slice(-2)}-${match[2]}-${match[3]} - FoxTutor Lesson Report.pdf`
    : "FoxTutor Lesson Report.pdf";
}
