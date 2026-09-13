function uuidBytes(value: string): number[] | null {
  const normalized = value.replace(/-/g, "").toLowerCase();
  if (!/^[0-9a-f]{32}$/.test(normalized)) return null;
  const bytes: number[] = [];
  for (let index = 0; index < normalized.length; index += 2) {
    bytes.push(Number.parseInt(normalized.slice(index, index + 2), 16));
  }
  return bytes;
}

export function lessonUrlKey(id: string): string {
  const bytes = uuidBytes(id);
  if (!bytes) return id;
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function lessonIdFromUrlKey(value: string): string | null {
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) return value;
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
