const CONTROL_CHARACTERS = /[\u0000-\u001f\u007f]/;

/**
 * Keep post-auth and billing redirects on this application.
 *
 * A value such as `//example.com` is a protocol-relative external URL even
 * though it starts with `/`, so a startsWith check alone is not sufficient.
 */
export function safeLocalPath(value, fallback = "/radar") {
  if (typeof value !== "string") return fallback;

  const candidate = value.trim();
  if (
    !candidate.startsWith("/") ||
    candidate.startsWith("//") ||
    candidate.includes("\\") ||
    CONTROL_CHARACTERS.test(candidate)
  ) {
    return fallback;
  }

  try {
    const base = "https://totonoucare.invalid";
    const parsed = new URL(candidate, base);
    if (parsed.origin !== base) return fallback;
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return fallback;
  }
}
