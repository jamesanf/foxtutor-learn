import type { ResourceCategory } from "../db/resources";

export const MAX_RESOURCE_SIZE_BYTES = 25 * 1024 * 1024;
export const RESOURCE_PAGE_SIZES = [12, 24, 48] as const;

export const RESOURCE_CATEGORIES: readonly ResourceCategory[] = ["worksheet", "notes", "reading", "homework", "reference", "other"];

const FILE_POLICY: Record<string, { contentType: string; label: string }> = {
  pdf: { contentType: "application/pdf", label: "PDF" },
  docx: { contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", label: "Word document" },
  txt: { contentType: "text/plain", label: "Text" },
  png: { contentType: "image/png", label: "PNG image" },
  jpg: { contentType: "image/jpeg", label: "JPEG image" },
  jpeg: { contentType: "image/jpeg", label: "JPEG image" },
  webp: { contentType: "image/webp", label: "WebP image" }
};

export function categoryLabel(category: ResourceCategory): string {
  return category.charAt(0).toUpperCase() + category.slice(1);
}

export function fileTypeLabel(contentType: string): string {
  return Object.values(FILE_POLICY).find((policy) => policy.contentType === contentType)?.label ?? "Document";
}

export function safeDisplayFilename(value: string): string | null {
  const name = value.trim();
  if (!name || name.length > 255 || /[\u0000-\u001f\u007f]/.test(name) || /[\\/]/.test(name)) return null;
  return name;
}

export function sanitizeHeaderFilename(value: string): string {
  return value.replace(/[\u0000-\u001f\u007f"\\;]/g, "_").replace(/[^\x20-\x7e]/g, "_").slice(0, 180) || "download";
}

export function allowedFile(filename: string): { extension: string; contentType: string } | null {
  const extension = filename.toLowerCase().split(".").pop() ?? "";
  const policy = FILE_POLICY[extension];
  return policy ? { extension, contentType: policy.contentType } : null;
}

export function validateResourceFile(file: File): { filename: string; extension: string; contentType: string; bytes: Uint8Array } | { error: string } {
  const filename = safeDisplayFilename(file.name);
  if (!filename) return { error: "Use a valid filename without path characters." };
  if (file.size <= 0) return { error: "The selected file is empty." };
  if (file.size > MAX_RESOURCE_SIZE_BYTES) return { error: "This file is too large. The maximum is 25 MB." };
  const allowed = allowedFile(filename);
  if (!allowed) return { error: "This file type is not supported." };
  if (file.type && file.type !== allowed.contentType && file.type !== "application/octet-stream") return { error: "The file type does not match its filename." };
  return { filename, extension: allowed.extension, contentType: allowed.contentType, bytes: new Uint8Array() };
}

export function hasExpectedSignature(extension: string, bytes: Uint8Array): boolean {
  const startsWith = (values: number[]) => values.every((value, index) => bytes[index] === value);
  if (extension === "pdf") return new TextDecoder().decode(bytes.slice(0, 5)) === "%PDF-";
  if (extension === "png") return startsWith([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  if (extension === "jpg" || extension === "jpeg") return startsWith([0xff, 0xd8, 0xff]);
  if (extension === "webp") return new TextDecoder().decode(bytes.slice(0, 4)) === "RIFF" && new TextDecoder().decode(bytes.slice(8, 12)) === "WEBP";
  if (extension === "docx") return startsWith([0x50, 0x4b, 0x03, 0x04]);
  if (extension === "txt") {
    try {
      new TextDecoder("utf-8", { fatal: true }).decode(bytes);
      return !bytes.includes(0);
    } catch {
      return false;
    }
  }
  return false;
}

export function pdfPageCount(bytes: Uint8Array): number | null {
  const header = new TextDecoder().decode(bytes.slice(0, Math.min(bytes.length, 2_000_000)));
  const pages = header.match(/\/Type\s*\/Page\b/g)?.length ?? 0;
  return pages > 0 ? pages : null;
}

