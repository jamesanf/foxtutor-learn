export function normalizeEmail(value: string): string | null {
  const email = value.trim().toLowerCase();
  if (!email || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null;
  return email;
}

export function identityEmail(request: Request, environment: string | undefined): string | null {
  const accessEmail = request.headers.get("CF-Access-Authenticated-User-Email");
  if (accessEmail) return normalizeEmail(accessEmail);
  if (environment !== "production") {
    return normalizeEmail(request.headers.get("X-Learn-Test-Identity") ?? "");
  }
  return null;
}
