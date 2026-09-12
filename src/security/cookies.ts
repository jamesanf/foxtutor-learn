export function cookie(name: string, value: string, maxAge: number, httpOnly: boolean, secure = true): string {
  const securePart = secure ? "Secure; " : "";
  const httpOnlyPart = httpOnly ? "HttpOnly; " : "";
  return `${name}=${encodeURIComponent(value)}; Max-Age=${maxAge}; Path=/learn; ${securePart}${httpOnlyPart}SameSite=Strict`;
}

export function parseCookies(request: Request): Record<string, string> {
  const entries = (request.headers.get("cookie") ?? "")
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part): [string, string] | null => {
      const separator = part.indexOf("=");
      if (separator <= 0) return null;
      try {
        return [part.slice(0, separator), decodeURIComponent(part.slice(separator + 1))];
      } catch (error) {
        if (error instanceof URIError) return null;
        throw error;
      }
    })
    .filter((entry): entry is [string, string] => entry !== null);
  return Object.fromEntries(entries);
}
