export function canonicalLearnOrigin(publicOrigin?: string, requestOrigin = "https://foxtutor.org"): string {
  const configured = publicOrigin?.trim();
  if (configured) return configured.replace(/\/+$/, "");
  return `${requestOrigin.replace(/\/+$/, "")}/learn`;
}

export function learnLink(origin: string, path = ""): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  const base = origin.replace(/\/+$/, "");
  if (base.endsWith("/learn") && normalized === "/learn") return base;
  if (base.endsWith("/learn") && normalized.startsWith("/learn/")) return `${base}${normalized.slice("/learn".length)}`;
  return `${base}${normalized}`;
}
