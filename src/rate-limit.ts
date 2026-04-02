let minDelayMs = 1000;
let lastRequestTime = 0;
let queue: Promise<void> = Promise.resolve();

async function wait(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

export async function rateLimit(): Promise<void> {
  const current = queue.then(async () => {
    const now = Date.now();
    const elapsed = now - lastRequestTime;

    if (elapsed < minDelayMs) {
      await wait(minDelayMs - elapsed);
    }

    lastRequestTime = Date.now();
  });

  queue = current.catch(() => undefined);
  await current;
}

export function __resetRateLimitForTests(delayMs = 1000): void {
  minDelayMs = delayMs;
  lastRequestTime = 0;
  queue = Promise.resolve();
}
