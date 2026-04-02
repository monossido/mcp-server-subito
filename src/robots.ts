import robotsParser from "robots-parser";
import { config } from "./config.js";

const BASE_URL = "https://www.subito.it";
const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";
const ROBOTS_CACHE_TTL_MS = 60 * 60 * 1000;

type Robot = ReturnType<typeof robotsParser>;

let cachedRobots: Robot | null = null;
let cachedAt = 0;
let pendingRobotsFetch: Promise<Robot> | null = null;

async function fetchRobotsTxt(): Promise<Robot> {
  const now = Date.now();
  if (cachedRobots && now - cachedAt < ROBOTS_CACHE_TTL_MS) {
    return cachedRobots;
  }

  if (pendingRobotsFetch) {
    return pendingRobotsFetch;
  }

  pendingRobotsFetch = (async () => {
    try {
      const response = await fetch(`${BASE_URL}/robots.txt`, {
        headers: {
          "User-Agent": USER_AGENT,
          Accept: "text/plain,text/html,*/*",
          "Accept-Language": "it-IT,it;q=0.9",
        },
      });

      if (!response.ok) {
        throw new Error(
          `robots.txt responded with HTTP ${response.status}: ${response.statusText}`
        );
      }

      const body = await response.text();
      cachedRobots = robotsParser(`${BASE_URL}/robots.txt`, body);
      cachedAt = now;
      return cachedRobots;
    } catch (error) {
      if (!config.failOnRobotsTxtUnavailable) {
        cachedRobots = robotsParser(`${BASE_URL}/robots.txt`, "");
        cachedAt = now;
        return cachedRobots;
      }

      const message =
        error instanceof Error ? error.message : "Unknown robots.txt error";
      throw new Error(`Unable to verify robots.txt for subito.it: ${message}`);
    } finally {
      pendingRobotsFetch = null;
    }
  })();

  return pendingRobotsFetch;
}

export async function isUrlAllowed(url: string): Promise<boolean> {
  if (config.ignoreRobotsTxt) return true;

  const robots = await fetchRobotsTxt();
  return robots.isAllowed(url, USER_AGENT) ?? true;
}

export function __resetRobotsCacheForTests(): void {
  cachedRobots = null;
  cachedAt = 0;
  pendingRobotsFetch = null;
}
