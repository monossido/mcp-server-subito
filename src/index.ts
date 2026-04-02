#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerSearchTools } from "./tools/search.js";
import { registerDetailsTools } from "./tools/details.js";
import { registerCategoriesTools } from "./tools/categories.js";
import { registerRegionsTools } from "./tools/regions.js";
import { registerCompareTools } from "./tools/compare.js";
import { registerComparableTools } from "./tools/comparables.js";
import { config } from "./config.js";
import { initializeCatalogs } from "./catalog.js";

const server = new McpServer({
  name: "mcp-server-subito",
  version: "0.1.0",
});

registerSearchTools(server);
registerDetailsTools(server);
registerCategoriesTools(server);
registerRegionsTools(server);
registerCompareTools(server);
registerComparableTools(server);

async function main(): Promise<void> {
  void initializeCatalogs()
    .then(() => {
      console.error("Catalog bootstrap completed");
    })
    .catch((error) => {
      const message =
        error instanceof Error ? error.message : "Unknown catalog error";
      console.error(`Catalog bootstrap failed, using static fallback: ${message}`);
    });

  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("mcp-server-subito running on stdio");
  if (config.ignoreRobotsTxt) {
    console.error("WARNING: robots.txt checking is disabled");
  }
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
