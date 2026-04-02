declare module "robots-parser" {
  interface Robot {
    isAllowed(url: string, ua?: string): boolean | undefined;
    isDisallowed(url: string, ua?: string): boolean | undefined;
    getCrawlDelay(ua?: string): number | undefined;
    getSitemaps(): string[];
    getPreferredHost(): string | null;
  }

  function robotsParser(url: string, robotstxt: string): Robot;
  export default robotsParser;
}
