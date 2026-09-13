export async function hashFeedToken(token: string): Promise<string> {
  const bytes = new TextEncoder().encode(token);
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(hash), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function generateFeedToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function feedTokenLast4(token: string): string {
  return token.slice(-4);
}

export function isFeedToken(value: string): boolean {
  return /^[A-Za-z0-9_-]{43}$/.test(value);
}

function base64UrlEncode(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlDecode(value: string): Uint8Array {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  return Uint8Array.from(atob(padded), (character) => character.charCodeAt(0));
}

async function encryptionKey(secret: string, usage: KeyUsage): Promise<CryptoKey> {
  const bytes = base64UrlDecode(secret);
  if (bytes.byteLength !== 32) throw new Error("Calendar feed encryption key must contain 32 bytes.");
  const keyBytes = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(keyBytes).set(bytes);
  return crypto.subtle.importKey("raw", keyBytes, { name: "AES-GCM" }, false, [usage]);
}

export async function encryptFeedToken(token: string, secret: string): Promise<string> {
  if (!isFeedToken(token)) throw new Error("Cannot encrypt an invalid calendar feed token.");
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ivBuffer = new ArrayBuffer(iv.byteLength);
  new Uint8Array(ivBuffer).set(iv);
  const plaintext = new TextEncoder().encode(token);
  const plaintextBuffer = new ArrayBuffer(plaintext.byteLength);
  new Uint8Array(plaintextBuffer).set(plaintext);
  const encrypted = await crypto.subtle.encrypt({ name: "AES-GCM", iv: ivBuffer }, await encryptionKey(secret, "encrypt"), plaintextBuffer);
  return `v1.${base64UrlEncode(iv)}.${base64UrlEncode(new Uint8Array(encrypted))}`;
}

export async function decryptFeedToken(ciphertext: string, secret: string): Promise<string | null> {
  try {
    const [version, encodedIv, encodedPayload] = ciphertext.split(".");
    if (version !== "v1" || !encodedIv || !encodedPayload) return null;
    const iv = base64UrlDecode(encodedIv);
    const ivBuffer = new ArrayBuffer(iv.byteLength);
    new Uint8Array(ivBuffer).set(iv);
    const payload = base64UrlDecode(encodedPayload);
    const payloadBuffer = new ArrayBuffer(payload.byteLength);
    new Uint8Array(payloadBuffer).set(payload);
    const decrypted = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: ivBuffer },
      await encryptionKey(secret, "decrypt"),
      payloadBuffer
    );
    const token = new TextDecoder().decode(decrypted);
    return isFeedToken(token) ? token : null;
  } catch (error) {
    if (error instanceof DOMException || error instanceof TypeError || error instanceof Error) return null;
    throw error;
  }
}
