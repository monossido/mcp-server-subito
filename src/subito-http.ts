import { isUrlAllowed } from "./robots.js";
import { rateLimit } from "./rate-limit.js";

export const BASE_URL = "https://www.subito.it";
export const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";
export const REQUEST_TIMEOUT_MS = 30_000;
export const ALLOWED_HOSTS = new Set(["www.subito.it", "subito.it"]);

export function ensureSubitoUrl(input: string): URL {
  const url = input.startsWith("http")
    ? new URL(input)
    : new URL(input, BASE_URL);

  if (url.protocol !== "https:") {
    throw new Error("Only https:// URLs from subito.it are supported.");
  }

  if (!ALLOWED_HOSTS.has(url.hostname)) {
    throw new Error(
      `Unsupported host "${url.hostname}". Only subito.it listing URLs are allowed.`
    );
  }

  return url;
}

export async function fetchSubitoPage(url: string): Promise<string> {
  const allowed = await isUrlAllowed(url);
  if (!allowed) {
    throw new Error(
      `URL blocked by robots.txt: ${url}. Use --ignore-robots-txt to override.`
    );
  }

  await rateLimit();

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "it-IT,it;q=0.9,en;q=0.8",
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.text();
  } finally {
    clearTimeout(timeout);
  }
}
