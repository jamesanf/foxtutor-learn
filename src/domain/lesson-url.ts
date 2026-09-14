function uuidBytes(value: string): number[] | null {
  const normalized = value.replace(/-/g, "").toLowerCase();
  if (!/^[0-9a-f]{32}$/.test(normalized)) return null;
  const bytes: number[] = [];
  for (let index = 0; index < normalized.length; index += 2) {
    bytes.push(Number.parseInt(normalized.slice(index, index + 2), 16));
  }
  return bytes;
}

export function compactUuidKey(id: string): string {
  const bytes = uuidBytes(id);
  if (!bytes) return id;
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function uuidFromCompactKey(value: string): string | null {
  if (!/^[A-Za-z0-9_-]{22}$/.test(value)) return null;
  try {
    const padded = value.replace(/-/g, "+").replace(/_/g, "/") + "==";
    const binary = atob(padded);
    if (binary.length !== 16) return null;
    const hex = Array.from(binary, (character) => character.charCodeAt(0).toString(16).padStart(2, "0")).join("");
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  } catch (error) {
    if (error instanceof DOMException) return null;
    throw error;
  }
}

export function entityUrlKey(id: string): string {
  const billingMaterialisedLesson = /^billing:lesson:lesson:([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}):(\d{4}-\d{2}-\d{2})$/i.exec(id);
  if (billingMaterialisedLesson) {
    return `billing:lesson:lesson:${compactUuidKey(billingMaterialisedLesson[1])}:${billingMaterialisedLesson[2]}`;
  }
  const billingLesson = /^billing:lesson:([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}):(\d{4}-\d{2}-\d{2})$/i.exec(id);
  if (billingLesson) return `billing:lesson:${compactUuidKey(billingLesson[1])}:${billingLesson[2]}`;
  const lesson = /^lesson:([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}):(\d{4}-\d{2}-\d{2})$/i.exec(id);
  if (lesson) return `lesson:${compactUuidKey(lesson[1])}:${lesson[2]}`;
  return compactUuidKey(id);
}

export function entityIdFromUrlKey(value: string): string | null {
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) return value;
  const billingMaterialisedLesson = /^billing:lesson:lesson:([^:]+):(\d{4}-\d{2}-\d{2})$/i.exec(value);
  if (billingMaterialisedLesson) {
    const lessonId = entityIdFromUrlKey(`lesson:${billingMaterialisedLesson[1]}:${billingMaterialisedLesson[2]}`);
    return lessonId ? `billing:lesson:${lessonId}` : null;
  }
  const billingLesson = /^billing:lesson:([^:]+):(\d{4}-\d{2}-\d{2})$/i.exec(value);
  if (billingLesson) {
    const seriesId = entityIdFromUrlKey(billingLesson[1]);
    return seriesId ? `billing:lesson:${seriesId}:${billingLesson[2]}` : null;
  }
  const lesson = /^lesson:([^:]+):(\d{4}-\d{2}-\d{2})$/i.exec(value);
  if (lesson) {
    const seriesId = entityIdFromUrlKey(lesson[1]);
    return seriesId ? `lesson:${seriesId}:${lesson[2]}` : null;
  }
  return uuidFromCompactKey(value);
}

export function lessonUrlKey(id: string): string {
  return entityUrlKey(id);
}

export function lessonIdFromUrlKey(value: string): string | null {
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) return value;
  if (/^lesson:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}:\d{4}-\d{2}-\d{2}$/i.test(value)) return value;
  return entityIdFromUrlKey(value);
}
