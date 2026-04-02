import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getRegions, initializeCatalogs } from "../catalog.js";
import type { Region } from "../types.js";

const provinceSchema = z.object({
  id: z.number(),
  name: z.string(),
  shortCode: z.string(),
});

const regionSchema: z.ZodType<Region> = z.object({
  id: z.number(),
  name: z.string(),
  provinces: z.array(provinceSchema).optional(),
});

function formatRegion(region: Region): string {
  let result = `[${region.id}] ${region.name}`;
  if (region.provinces) {
    const provList = region.provinces
      .map((p) => `  [${p.id}] ${p.name} (${p.shortCode})`)
      .join("\n");
    result += "\n" + provList;
  }
  return result;
}

function findRegionByName(regions: Region[], name: string): Region[] {
  const lower = name.toLowerCase();
  return regions.filter((r) => r.name.toLowerCase().includes(lower));
}

export function registerRegionsTools(server: McpServer): void {
  server.registerTool("list_regions", {
    description:
      "List all Italian regions and provinces available on subito.it. Returns region/province names and their numeric IDs which can be used as location filters in search_listings.",
    inputSchema: {
      filter: z
        .string()
        .optional()
        .describe(
          "Optional text to filter regions by name (case-insensitive partial match)"
        ),
    },
    outputSchema: {
      regions: z.array(regionSchema),
      source: z.enum(["static", "dynamic"]),
      lastRefreshAt: z.string().nullable(),
    },
  },
    async ({ filter }) => {
      await initializeCatalogs();
      const catalog = getRegions();
      let regions: Region[];

      if (filter) {
        regions = findRegionByName(catalog.regions, filter);
        if (regions.length === 0) {
          return {
            content: [
              {
                type: "text" as const,
                text: `No regions found matching "${filter}". Use list_regions without a filter to see all available regions.`,
              },
            ],
          };
        }
      } else {
        regions = catalog.regions;
      }

      const formatted = regions.map(formatRegion).join("\n\n");
      const sourceNote =
        catalog.source === "dynamic"
          ? "Source: live site snapshot."
          : "Source: bundled static fallback.";

      return {
        content: [
          {
            type: "text" as const,
            text: `Available regions and provinces on subito.it:\n\n${formatted}\n\n${sourceNote}\nUse region ID in the "region" parameter and province ID in the "province" parameter of search_listings.`,
          },
        ],
        structuredContent: {
          regions,
          source: catalog.source,
          lastRefreshAt: catalog.lastRefreshAt,
        },
      };
    }
  );
}
