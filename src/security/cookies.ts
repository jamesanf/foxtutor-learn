export function cookie(name: string, value: string, maxAge: number, httpOnly: boolean, secure = true): string {
  const securePart = secure ? "Secure; " : "";
  const httpOnlyPart = httpOnly ? "HttpOnly; " : "";
  return `${name}=${encodeURIComponent(value)}; Max-Age=${maxAge}; Path=/learn; ${securePart}${httpOnlyPart}SameSite=Strict`;
}

export function parseCookies(request: Request): Record<string, string> {
  return Object.fromEntries(
    (request.headers.get("cookie") ?? "")
      .split(";")
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const separator = part.indexOf("=");
        return [part.slice(0, separator), decodeURIComponent(part.slice(separator + 1))];
      })
  );
}
